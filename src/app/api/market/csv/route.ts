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
  const csvCacheKey = `market:index:csv:${period}`;
  const filename = `cairo-realestate-index-${period}.csv`;

  const csvHeaders = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'public, s-maxage=3600',
  };

  // Try Redis cache first
  try {
    const cached = await redis.get(csvCacheKey);
    if (cached) {
      return new NextResponse(cached, { status: 200, headers: csvHeaders });
    }
  } catch { /* Redis unavailable */ }

  // Generate from DistrictStats on cache miss
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

  if (allStats.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No data available' },
      { status: 404 }
    );
  }

  // Aggregate per district (across property types/transaction types)
  const districtAgg = new Map<string, {
    avgPricePerSqm: Decimal;
    activeListings: number;
    priceChange6m: Decimal;
    avgDaysOnMarket: number;
    city: string;
    count: number;
  }>();

  for (const s of allStats) {
    const price = new Decimal(s.avgPricePerSqm.toString());
    const change = new Decimal(s.priceChange6m.toString());
    const existing = districtAgg.get(s.district);

    if (!existing) {
      districtAgg.set(s.district, {
        avgPricePerSqm: price,
        activeListings: s.listingCount,
        priceChange6m: change,
        avgDaysOnMarket: s.avgDaysOnMarket,
        city: s.city,
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
        avgDaysOnMarket: Math.round(
          (existing.avgDaysOnMarket * existing.count + s.avgDaysOnMarket) / newCount
        ),
        city: existing.city,
        count: newCount,
      });
    }
  }

  // Build CSV
  const rows = [
    'district,city,avgPricePerSqm,activeListings,priceChange6m,avgDaysOnMarket',
  ];
  for (const [district, d] of districtAgg.entries()) {
    rows.push(
      [
        `"${district.replace(/"/g, '""')}"`,
        `"${d.city.replace(/"/g, '""')}"`,
        d.avgPricePerSqm.toDecimalPlaces(2).toString(),
        d.activeListings.toString(),
        d.priceChange6m.toDecimalPlaces(2).toString(),
        d.avgDaysOnMarket.toString(),
      ].join(',')
    );
  }
  const csv = rows.join('\n');

  // Cache for 1 hour (shorter than cron-generated — this is on-demand)
  try {
    await redis.setex(csvCacheKey, 3600, csv);
  } catch { /* Redis unavailable */ }

  return new NextResponse(csv, { status: 200, headers: csvHeaders });
}
