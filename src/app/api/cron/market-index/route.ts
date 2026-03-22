import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

// POST — protected by x-cron-secret header
// Runs on 1st of each month at 6am Cairo
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const period = `${year}-${String(month).padStart(2, '0')}`;

  try {
    // 1. Fetch all DistrictStats for aggregation
    const allStats = await db.districtStats.findMany({
      select: {
        district: true,
        city: true,
        propertyType: true,
        transactionType: true,
        avgPricePerSqm: true,
        medianPrice: true,
        listingCount: true,
        priceChange6m: true,
        priceChange12m: true,
        avgDaysOnMarket: true,
        soldCount30d: true,
        computedAt: true,
      },
    });

    // 2. Aggregate per district (across property types)
    const districtAgg = new Map<string, {
      avgPricePerSqm: Decimal;
      activeListings: number;
      priceChange6m: Decimal;
      avgDaysOnMarket: number;
      city: string;
      count: number;
    }>();

    let totalListings = 0;

    for (const s of allStats) {
      totalListings += s.listingCount;
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

    const districtsProcessed = districtAgg.size;

    // Compute platform-wide weighted averages
    let weightedPriceSum = new Decimal(0);
    let weightedChange6mSum = new Decimal(0);
    let totalWeight = 0;

    for (const d of districtAgg.values()) {
      const w = d.activeListings;
      weightedPriceSum = weightedPriceSum.add(d.avgPricePerSqm.mul(w));
      weightedChange6mSum = weightedChange6mSum.add(d.priceChange6m.mul(w));
      totalWeight += w;
    }

    const avgPricePerSqm =
      totalWeight > 0
        ? weightedPriceSum.div(totalWeight).toDecimalPlaces(2).toString()
        : '0';

    const priceChange6m =
      totalWeight > 0
        ? weightedChange6mSum.div(totalWeight).toDecimalPlaces(2).toString()
        : '0';

    // 3. Insert into MarketReport (upsert by period)
    const reportBodyAr = `تقرير سوق العقارات لشهر ${period} — إجمالي ${totalListings} وحدة نشطة، متوسط سعر المتر المربع ${avgPricePerSqm} جنيه، تغيير 6 أشهر ${priceChange6m}%.`;
    const reportBodyEn = `Real estate market report for ${period} — ${totalListings} active listings, avg price/sqm ${avgPricePerSqm} EGP, 6-month change ${priceChange6m}%.`;

    // MarketReport has no unique constraint on period — use findFirst + create/update
    const existingReport = await db.marketReport.findFirst({
      where: { period, periodType: 'MONTHLY' },
      select: { id: true },
    });

    if (existingReport) {
      await db.marketReport.update({
        where: { id: existingReport.id },
        data: {
          bodyAr: reportBodyAr,
          bodyEn: reportBodyEn,
          isPublished: true,
          publishedAt: now,
        },
      });
    } else {
      await db.marketReport.create({
        data: {
          titleAr: `تقرير السوق — ${period}`,
          titleEn: `Market Index — ${period}`,
          period,
          periodType: 'MONTHLY',
          bodyAr: reportBodyAr,
          bodyEn: reportBodyEn,
          isPublished: true,
          publishedAt: now,
        },
      });
    }

    // 4. Generate CSV and save to Redis
    const csvRows = [
      'district,city,avgPricePerSqm,activeListings,priceChange6m,avgDaysOnMarket',
    ];
    for (const [district, d] of districtAgg.entries()) {
      const row = [
        `"${district}"`,
        `"${d.city}"`,
        d.avgPricePerSqm.toDecimalPlaces(2).toString(),
        d.activeListings.toString(),
        d.priceChange6m.toDecimalPlaces(2).toString(),
        d.avgDaysOnMarket.toString(),
      ].join(',');
      csvRows.push(row);
    }
    const csvData = csvRows.join('\n');

    const csvCacheKey = `market:index:csv:${period}`;
    try {
      // Keep CSV for 35 days (covers until next month's run)
      await redis.setex(csvCacheKey, 35 * 24 * 3600, csvData);
    } catch { /* Redis unavailable */ }

    // 5. Bust the market index cache for this period
    const indexCacheKey = `market:index:${period}`;
    try {
      await redis.del(indexCacheKey);
    } catch { /* Redis unavailable */ }

    return NextResponse.json({
      success: true,
      period,
      districtsProcessed,
      totalListings,
    });
  } catch (error) {
    console.error('[cron/market-index] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
