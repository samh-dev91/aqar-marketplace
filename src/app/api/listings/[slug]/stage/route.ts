import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

type StagingStyle = 'modern' | 'classic' | 'minimal';

const STYLE_PROMPTS: Record<StagingStyle, string> = {
  modern: 'modern minimalist furnished room, clean lines, white walls',
  classic: 'classic Egyptian furnished room, traditional Arabic decor',
  minimal: 'Scandinavian minimal furnished room, neutral colors',
};

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
}

async function pollReplicate(
  predictionId: string,
  token: string,
  maxWaitMs = 30000,
  intervalMs = 2000
): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;

    const prediction = (await res.json()) as ReplicatePrediction;

    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      if (Array.isArray(output) && output.length > 0) return output[0] ?? null;
      if (typeof output === 'string') return output;
      return null;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return null;
    }
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;

  // 1. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).imageIndex !== 'number' ||
    typeof (body as Record<string, unknown>).style !== 'string'
  ) {
    return NextResponse.json(
      { success: false, message: 'imageIndex (number) and style (string) are required' },
      { status: 400 }
    );
  }

  const { imageIndex, style } = body as { imageIndex: number; style: string };

  if (!['modern', 'classic', 'minimal'].includes(style)) {
    return NextResponse.json(
      { success: false, message: 'style must be one of: modern, classic, minimal' },
      { status: 400 }
    );
  }

  const stagingStyle = style as StagingStyle;

  // 2. Fetch listing
  const listing = await db.listing.findUnique({
    where: { slug },
    select: { id: true, images: true, isActive: true },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'العقار غير موجود' },
      { status: 404 }
    );
  }

  if (imageIndex < 0 || imageIndex >= listing.images.length) {
    return NextResponse.json(
      {
        success: false,
        message: `imageIndex خارج النطاق. العقار يحتوي على ${listing.images.length} صورة (0–${listing.images.length - 1})`,
      },
      { status: 400 }
    );
  }

  const sourceImageUrl = listing.images[imageIndex];
  if (!sourceImageUrl) {
    return NextResponse.json(
      { success: false, message: 'الصورة المطلوبة غير موجودة' },
      { status: 400 }
    );
  }

  // 3. Rate limit: 3 staging requests per slug per IP per day
  const ip = getClientIp(req);
  const today = new Date().toISOString().split('T')[0];
  const rateLimitKey = `ratelimit:staging:${slug}:${ip}:${today}`;

  try {
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      // First request today — set expiry for 24 hours
      await redis.expire(rateLimitKey, 86400);
    }
    if (count > 3) {
      return NextResponse.json(
        {
          success: false,
          message: 'لقد تجاوزت الحد المسموح به (3 طلبات يومياً لكل عقار). حاول مجداً غداً.',
        },
        { status: 429 }
      );
    }
  } catch {
    // Redis unavailable — allow the request through
  }

  // 4. Cache check
  const cacheKey = `staging:${slug}:${imageIndex}:${stagingStyle}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          stagedImageUrl: cached,
          cached: true,
          style: stagingStyle,
        },
      });
    }
  } catch {
    // Redis unavailable
  }

  // 5. Call Replicate or simulate
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    // Simulate with placeholder
    return NextResponse.json({
      success: true,
      data: {
        stagedImageUrl: '/images/staging-placeholder.jpg',
        cached: false,
        simulated: true,
        style: stagingStyle,
      },
    });
  }

  const stylePrompt = STYLE_PROMPTS[stagingStyle];
  const prompt = `furnished room, ${stylePrompt}, photorealistic, high quality`;

  let stagedImageUrl: string | null = null;

  try {
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/stable-diffusion-inpainting',
        input: {
          image: sourceImageUrl,
          prompt,
          negative_prompt: 'empty, unfurnished, blurry',
        },
      }),
    });

    if (createRes.ok) {
      const prediction = (await createRes.json()) as ReplicatePrediction;
      stagedImageUrl = await pollReplicate(prediction.id, replicateToken);
    }
  } catch {
    // Replicate call failed — fall through to simulation
  }

  if (!stagedImageUrl) {
    // Fall back to placeholder if Replicate failed or timed out
    return NextResponse.json({
      success: true,
      data: {
        stagedImageUrl: '/images/staging-placeholder.jpg',
        cached: false,
        simulated: true,
        style: stagingStyle,
      },
    });
  }

  // 6. Cache the result (7 days)
  try {
    await redis.setex(cacheKey, 604800, stagedImageUrl);
  } catch {
    // Redis unavailable
  }

  return NextResponse.json({
    success: true,
    data: {
      stagedImageUrl,
      cached: false,
      style: stagingStyle,
    },
  });
}
