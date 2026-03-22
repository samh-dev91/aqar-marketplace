import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string; district: string } }
): Promise<NextResponse> {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);

  const cacheKey = `guide:${city}:${district}`;

  // Try Redis cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  } catch {
    // Redis unavailable — proceed without cache
  }

  // Fetch district stats (aggregate across all property/transaction types)
  const [allStats, topListings, recentReport] = await Promise.all([
    db.districtStats.findMany({
      where: { city, district },
      select: {
        avgPricePerSqm: true,
        listingCount: true,
        priceChange6m: true,
        avgDaysOnMarket: true,
        computedAt: true,
      },
    }),
    db.listing.findMany({
      where: { city, district, isActive: true },
      orderBy: { aqarScore: 'desc' },
      take: 6,
      select: {
        slug: true,
        titleAr: true,
        askingPrice: true,
        images: true,
        bedrooms: true,
        verificationTier: true,
        priceIsHidden: true,
      },
    }),
    db.marketReport.findFirst({
      where: { city, isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        titleAr: true,
        period: true,
        publishedAt: true,
      },
    }),
  ]);

  // 404 if no listings exist for this district
  if (topListings.length === 0 && allStats.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No listings found for this district' },
      { status: 404 }
    );
  }

  // Aggregate stats across all property types — weighted average
  let totalListings = 0;
  let weightedPriceSum = 0;
  let weightedPriceChange6mSum = 0;
  let weightedDaysSum = 0;

  for (const s of allStats) {
    const count = s.listingCount;
    totalListings += count;
    weightedPriceSum += s.avgPricePerSqm.toNumber() * count;
    weightedPriceChange6mSum += s.priceChange6m.toNumber() * count;
    weightedDaysSum += s.avgDaysOnMarket * count;
  }

  const activeListings = totalListings > 0 ? totalListings : topListings.length;
  const avgPricePerSqm =
    totalListings > 0 ? (weightedPriceSum / totalListings).toFixed(2) : null;
  const priceChange6m =
    totalListings > 0
      ? parseFloat((weightedPriceChange6mSum / totalListings).toFixed(2))
      : null;
  const avgDaysOnMarket =
    totalListings > 0 ? Math.round(weightedDaysSum / totalListings) : null;

  // Determine lastUpdated from most recent computedAt or now
  const lastUpdated =
    allStats.length > 0
      ? allStats
          .map((s) => s.computedAt.toISOString())
          .sort()
          .reverse()[0]
      : new Date().toISOString();

  const responseData = {
    success: true,
    district,
    city,
    stats: {
      avgPricePerSqm,
      activeListings,
      priceChange6m,
      avgDaysOnMarket,
    },
    topListings: topListings.map((l) => ({
      slug: l.slug,
      titleAr: l.titleAr,
      askingPrice: l.priceIsHidden ? null : l.askingPrice.toString(),
      image: l.images[0] ?? null,
      bedrooms: l.bedrooms,
      verificationTier: l.verificationTier,
    })),
    recentReport: recentReport
      ? {
          titleAr: recentReport.titleAr,
          period: recentReport.period,
          publishedAt: recentReport.publishedAt?.toISOString() ?? null,
        }
      : null,
    lastUpdated,
  };

  // Store in Redis with 24h TTL (fire and forget)
  redis.set(cacheKey, JSON.stringify(responseData), 'EX', CACHE_TTL).catch(() => {});

  return NextResponse.json(responseData);
}
