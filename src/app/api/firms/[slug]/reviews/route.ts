import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// GET /api/firms/[slug]/reviews?page=1&limit=10
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const slug = params.slug as string;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
  const skip = (page - 1) * limit;

  const cacheKey = `reviews:firm:${slug}:${page}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  } catch {
    // Non-fatal — proceed without cache
  }

  const [reviews, total, ratingAgg] = await Promise.all([
    db.brokerReview.findMany({
      where: { crmFirmSlug: slug },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        rating: true,
        commentAr: true,
        isVerified: true,
        createdAt: true,
      },
    }),
    db.brokerReview.count({ where: { crmFirmSlug: slug } }),
    db.brokerReview.aggregate({
      where: { crmFirmSlug: slug },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const avgRating = ratingAgg._avg.rating;

  const body = {
    success: true,
    data: reviews,
    pagination: { page, limit, total, totalPages },
    avgRating,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(body), 'EX', 300);
  } catch {
    // Non-fatal
  }

  return NextResponse.json(body);
}

// POST /api/firms/[slug]/reviews
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const slug = params.slug as string;

  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { rating, commentAr } = body as { rating?: unknown; commentAr?: unknown };

  if (
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { success: false, message: 'rating must be an integer between 1 and 5' },
      { status: 400 }
    );
  }

  const commentArValue =
    typeof commentAr === 'string' && commentAr.trim().length > 0
      ? commentAr.trim()
      : null;

  // Check for duplicate
  const existing = await db.brokerReview.findUnique({
    where: { consumerId_crmFirmSlug: { consumerId, crmFirmSlug: slug } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, message: 'You have already reviewed this broker' },
      { status: 409 }
    );
  }

  const review = await db.brokerReview.create({
    data: {
      consumerId,
      crmFirmSlug: slug,
      rating,
      commentAr: commentArValue,
      isVerified: false,
    },
    select: {
      id: true,
      rating: true,
      commentAr: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Bust cache: delete all pages for this firm
  try {
    const pattern = `reviews:firm:${slug}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ success: true, data: review }, { status: 201 });
}
