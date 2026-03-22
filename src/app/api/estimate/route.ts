import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { computeEstimate } from '@/services/aqar-estimate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Sliding window rate limit: 20 req/hour per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const rateLimitKey = `rl:estimate:${ip}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);
    if (count > 20) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  } catch { /* Redis unavailable — allow request */ }

  const { searchParams } = req.nextUrl;

  const city = searchParams.get('city')?.trim();
  const district = searchParams.get('district')?.trim();
  const type = searchParams.get('type')?.trim();
  const areaStr = searchParams.get('area')?.trim();
  const bedsStr = searchParams.get('beds')?.trim();
  const floorStr = searchParams.get('floor')?.trim();
  const furnishedStr = searchParams.get('furnished')?.trim();

  // Validate required params
  if (!city || !district || !type) {
    return NextResponse.json(
      { success: false, message: 'city, district, and type are required' },
      { status: 400 }
    );
  }

  if (!areaStr) {
    return NextResponse.json(
      { success: false, message: 'area is required' },
      { status: 400 }
    );
  }

  const area = parseFloat(areaStr);
  if (isNaN(area) || area < 20 || area > 2000) {
    return NextResponse.json(
      { success: false, message: 'area must be a number between 20 and 2000 sqm' },
      { status: 400 }
    );
  }

  const bedrooms = bedsStr !== undefined && bedsStr !== '' ? parseInt(bedsStr, 10) : undefined;
  const floor = floorStr !== undefined && floorStr !== '' ? parseInt(floorStr, 10) : undefined;
  const isFurnished =
    furnishedStr === 'true' ? true : furnishedStr === 'false' ? false : undefined;

  // Build cache key
  const cacheKey = `estimate:${city}:${district}:${type}:${area}:${bedrooms ?? 0}:${floor ?? 0}:${isFurnished ? 1 : 0}`;

  // Check Redis cache
  let xCache = 'MISS';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const response = NextResponse.json(JSON.parse(cached));
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
  } catch { /* Redis unavailable */ }

  // Compute estimate
  const result = await computeEstimate({
    city,
    district,
    propertyType: type,
    area,
    bedrooms,
    floor,
    isFurnished,
  });

  if (!result) {
    return NextResponse.json(
      { success: false, message: 'Insufficient data to generate an estimate for this location and property type.' },
      { status: 404 }
    );
  }

  const responseBody = {
    success: true,
    estimate: result.estimate,
    rangeLow: result.rangeLow,
    rangeHigh: result.rangeHigh,
    confidence: result.confidence,
    methodology: result.methodology,
    comparables: result.comparables.slice(0, 5),
    ...(result.yieldPct !== undefined ? { yieldPct: result.yieldPct } : {}),
  };

  // Cache for 2 hours
  try {
    await redis.setex(cacheKey, 7200, JSON.stringify(responseBody));
  } catch { /* Redis unavailable */ }

  xCache = 'MISS';

  const response = NextResponse.json(responseBody);
  response.headers.set('X-Cache', xCache);
  return response;
}
