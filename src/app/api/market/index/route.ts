import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const now = new Date();
  const yearParam = req.nextUrl.searchParams.get('year');
  const monthParam = req.nextUrl.searchParams.get('month');

  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  if (
    isNaN(year) || isNaN(month) ||
    month < 1 || month > 12 ||
    year < 2020 || year > 2100
  ) {
    return NextResponse.json(
      { success: false, message: 'Invalid year or month' },
      { status: 400 }
    );
  }

  const period = `${year}-${String(month).padStart(2, '0')}`;
  const cacheKey = `market:index:${period}`;

  // Check Redis cache (1 hour TTL)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  } catch { /* Redis unavailable */ }

  // Fetch MarketReport for this period (editorial summary)
  const report = await db.marketReport.findFirst({
    where: {
      period,
      isPublished: true,
    },
    orderBy: { publishedAt: 'desc' },
  });

  // Fetch DistrictStats aggregates for this period's data
  const allStats = await db.districtStats.findMany({
    select: {
      district: true,
      city: true,
      avgPricePerSqm: true,
      listingCount: true,
      priceChange6m: true,
      avgDaysOnMarket: true,
    },
  });

  if (allStats.length === 0 && !report) {
    return NextResponse.json(
      { success: false, message: 'No data for requested period' },
      { status: 404 }
    );
  }

  // Aggregate across all districts
  let totalListings = 0;
  let weightedPriceSum = new Decimal(0);
  let weightedChange6mSum = new Decimal(0);
  let totalWeight = 0;

  // Per-district aggregated view (for top/most-active)
  const districtAgg = new Map<string, {
    avgPricePerSqm: Decimal;
    activeListings: number;
    priceChange6m: Decimal;
    count: number;
  }>();

  for (const s of allStats) {
    const price = new Decimal(s.avgPricePerSqm.toString());
    const change = new Decimal(s.priceChange6m.toString());
    const weight = s.listingCount;

    totalListings += s.listingCount;
    weightedPriceSum = weightedPriceSum.add(price.mul(weight));
    weightedChange6mSum = weightedChange6mSum.add(change.mul(weight));
    totalWeight += weight;

    const existing = districtAgg.get(s.district);
    if (!existing) {
      districtAgg.set(s.district, {
        avgPricePerSqm: price,
        activeListings: s.listingCount,
        priceChange6m: change,
        count: 1,
      });
    } else {
      const newCount = existing.count + 1;
      districtAgg.set(s.district, {
        avgPricePerSqm: existing.avgPricePerSqm
          .mul(existing.count)
          .add(price)
          .div(newCount),
        activeListings: existing.activeListings + s.listingCount,
        priceChange6m: existing.priceChange6m
          .mul(existing.count)
          .add(change)
          .div(newCount),
        count: newCount,
      });
    }
  }

  const avgPricePerSqm =
    totalWeight > 0
      ? weightedPriceSum.div(totalWeight).toDecimalPlaces(2)
      : new Decimal(0);

  const priceChange6m =
    totalWeight > 0
      ? weightedChange6mSum.div(totalWeight).toDecimalPlaces(2)
      : new Decimal(0);

  // Sort districts: top 5 by price change (most appreciation), most active by listing count
  const districtEntries = Array.from(districtAgg.entries()).map(([district, d]) => ({
    district,
    avgPricePerSqm: d.avgPricePerSqm.toString(),
    activeListings: d.activeListings,
    priceChange6m: d.priceChange6m.toString(),
  }));

  const topDistricts = [...districtEntries]
    .sort((a, b) =>
      new Decimal(b.priceChange6m).comparedTo(new Decimal(a.priceChange6m))
    )
    .slice(0, 5);

  const mostActive = [...districtEntries]
    .sort((a, b) => b.activeListings - a.activeListings)
    .slice(0, 5);

  const response = {
    success: true,
    data: {
      period,
      totalListings,
      avgPricePerSqm: avgPricePerSqm.toString(),
      priceChange1m: null as string | null, // Not available from DistrictStats
      priceChange3m: null as string | null, // Not available from DistrictStats
      priceChange6m: priceChange6m.toString(),
      topDistricts,
      mostActive,
      publishedAt: report?.publishedAt?.toISOString() ?? null,
      reportTitleAr: report?.titleAr ?? null,
      reportTitleEn: report?.titleEn ?? null,
      reportBodyAr: report?.bodyAr ?? null,
    },
  };

  // Cache for 1 hour
  try {
    await redis.setex(cacheKey, 3600, JSON.stringify(response));
  } catch { /* Redis unavailable */ }

  return NextResponse.json(response);
}
