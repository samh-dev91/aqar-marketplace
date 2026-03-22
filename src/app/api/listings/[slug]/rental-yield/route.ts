import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;

  const cacheKey = `yield:${slug}`;

  // Check Redis cache (2 hour TTL)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  } catch { /* Redis unavailable */ }

  // 1. Find listing by slug
  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      transactionType: true,
      askingPrice: true,
      city: true,
      district: true,
      propertyType: true,
      isActive: true,
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  // 2. Only valid for SALE listings
  if (listing.transactionType !== 'SALE') {
    return NextResponse.json(
      { success: false, message: 'Rental yield is only available for sale listings' },
      { status: 404 }
    );
  }

  // 3. Query comparable RENT listings in same city + district + propertyType
  const rentComparables = await db.listing.findMany({
    where: {
      isActive: true,
      transactionType: 'RENT',
      city: listing.city,
      ...(listing.district ? { district: listing.district } : {}),
      propertyType: listing.propertyType,
    },
    select: { askingPrice: true },
  });

  if (rentComparables.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No rental comparables found' },
      { status: 404 }
    );
  }

  // 4. Compute average monthly rent using Decimal.js
  let rentSum = new Decimal(0);
  for (const r of rentComparables) {
    rentSum = rentSum.add(new Decimal(r.askingPrice.toString()));
  }
  const avgMonthlyRent = rentSum.div(rentComparables.length).toDecimalPlaces(2);

  // 5. Compute yield
  const askingPrice = new Decimal(listing.askingPrice.toString());
  const estimatedAnnualRent = avgMonthlyRent.mul(12);
  const yieldPct = estimatedAnnualRent.div(askingPrice).mul(100).toDecimalPlaces(1);

  // 6. Determine confidence
  const comparableCount = rentComparables.length;
  let confidence: 'high' | 'medium' | 'low';
  if (comparableCount >= 10) {
    confidence = 'high';
  } else if (comparableCount >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const result = {
    success: true,
    data: {
      yieldPct: yieldPct.toNumber(),
      avgMonthlyRent: avgMonthlyRent.toString(),
      comparableCount,
      confidence,
    },
  };

  // Cache for 2 hours
  try {
    await redis.setex(cacheKey, 7200, JSON.stringify(result));
  } catch { /* Redis unavailable */ }

  return NextResponse.json(result);
}
