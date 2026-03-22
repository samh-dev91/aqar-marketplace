import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';
import { computeEstimate } from '@/services/aqar-estimate';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;

  const cacheKey = `listing-estimate:${slug}`;

  // Check Redis cache (2 hour TTL)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const response = NextResponse.json(JSON.parse(cached));
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
  } catch { /* Redis unavailable */ }

  // Fetch listing by slug — never expose crmFirmId or crmPropertyId
  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      slug: true,
      city: true,
      district: true,
      propertyType: true,
      transactionType: true,
      area: true,
      bedrooms: true,
      floor: true,
      isFurnished: true,
      askingPrice: true,
      isActive: true,
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'Listing not found' },
      { status: 404 }
    );
  }

  // area is required for estimate
  if (!listing.area) {
    return NextResponse.json(
      { success: false, message: 'Insufficient data to generate an estimate for this listing.' },
      { status: 404 }
    );
  }

  // district is required for comparable search
  if (!listing.district) {
    return NextResponse.json(
      { success: false, message: 'Insufficient data to generate an estimate for this listing.' },
      { status: 404 }
    );
  }

  const area = parseFloat(listing.area.toString());

  const result = await computeEstimate({
    city: listing.city,
    district: listing.district,
    propertyType: listing.propertyType,
    area,
    bedrooms: listing.bedrooms ?? undefined,
    floor: listing.floor ?? undefined,
    isFurnished: listing.isFurnished ?? undefined,
  });

  if (!result) {
    return NextResponse.json(
      { success: false, message: 'Insufficient comparables to generate an estimate.' },
      { status: 404 }
    );
  }

  // Compute gap between asking price and estimate
  const askingPrice = new Decimal(listing.askingPrice.toString());
  const estimate = new Decimal(result.estimate);

  const gapPct = askingPrice
    .minus(estimate)
    .div(estimate)
    .mul(100)
    .toDecimalPlaces(1);

  const gapPctNum = gapPct.toNumber();

  let direction: 'above' | 'below' | 'at_market';
  if (gapPctNum > 5) {
    direction = 'above';
  } else if (gapPctNum < -5) {
    direction = 'below';
  } else {
    direction = 'at_market';
  }

  const responseBody = {
    success: true,
    estimate: result.estimate,
    rangeLow: result.rangeLow,
    rangeHigh: result.rangeHigh,
    gap: askingPrice.minus(estimate).toDecimalPlaces(0).toString(),
    gapPct: gapPct.toString(),
    direction,
    confidence: result.confidence,
    methodology: result.methodology,
    ...(result.yieldPct !== undefined ? { yieldPct: result.yieldPct } : {}),
  };

  // Cache for 2 hours
  try {
    await redis.setex(cacheKey, 7200, JSON.stringify(responseBody));
  } catch { /* Redis unavailable */ }

  const response = NextResponse.json(responseBody);
  response.headers.set('X-Cache', 'MISS');
  return response;
}
