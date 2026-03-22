import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'map:districts:geojson';
const CACHE_TTL = 1800; // 30 minutes

// Hardcoded simplified GeoJSON boundaries for top Cairo districts
// (Real approximate coordinates for Egyptian districts)
const DISTRICT_BOUNDARIES: Record<string, number[][][]> = {
  'المعادي': [[[31.24, 29.95], [31.28, 29.95], [31.28, 30.00], [31.24, 30.00], [31.24, 29.95]]],
  'الزمالك': [[[31.21, 30.05], [31.24, 30.05], [31.24, 30.08], [31.21, 30.08], [31.21, 30.05]]],
  'مدينة نصر': [[[31.32, 30.05], [31.38, 30.05], [31.38, 30.10], [31.32, 30.10], [31.32, 30.05]]],
  'التجمع الخامس': [[[31.42, 29.97], [31.52, 29.97], [31.52, 30.03], [31.42, 30.03], [31.42, 29.97]]],
  'الشيخ زايد': [[[30.92, 30.00], [31.00, 30.00], [31.00, 30.06], [30.92, 30.06], [30.92, 30.00]]],
  'أكتوبر': [[[30.90, 29.92], [31.00, 29.92], [31.00, 30.00], [30.90, 30.00], [30.90, 29.92]]],
  'مصر الجديدة': [[[31.31, 30.07], [31.36, 30.07], [31.36, 30.12], [31.31, 30.12], [31.31, 30.07]]],
  'وسط البلد': [[[31.23, 30.04], [31.27, 30.04], [31.27, 30.07], [31.23, 30.07], [31.23, 30.04]]],
  'مدينة الرحاب': [[[31.47, 30.05], [31.53, 30.05], [31.53, 30.09], [31.47, 30.09], [31.47, 30.05]]],
  'القاهرة الجديدة': [[[31.38, 30.00], [31.46, 30.00], [31.46, 30.06], [31.38, 30.06], [31.38, 30.00]]],
  'المهندسين': [[[31.19, 30.05], [31.22, 30.05], [31.22, 30.07], [31.19, 30.07], [31.19, 30.05]]],
  'الدقي': [[[31.20, 30.04], [31.23, 30.04], [31.23, 30.06], [31.20, 30.06], [31.20, 30.04]]],
  'حدائق الأهرام': [[[31.10, 29.97], [31.16, 29.97], [31.16, 30.02], [31.10, 30.02], [31.10, 29.97]]],
  'بدر': [[[31.52, 30.05], [31.60, 30.05], [31.60, 30.10], [31.52, 30.10], [31.52, 30.05]]],
  'العبور': [[[31.42, 30.13], [31.50, 30.13], [31.50, 30.18], [31.42, 30.18], [31.42, 30.13]]],
  'شبرا': [[[31.26, 30.08], [31.30, 30.08], [31.30, 30.13], [31.26, 30.13], [31.26, 30.08]]],
  'عين شمس': [[[31.30, 30.10], [31.35, 30.10], [31.35, 30.15], [31.30, 30.15], [31.30, 30.10]]],
  'الهرم': [[[31.13, 29.97], [31.20, 29.97], [31.20, 30.02], [31.13, 30.02], [31.13, 29.97]]],
  'فيصل': [[[31.18, 29.99], [31.22, 29.99], [31.22, 30.03], [31.18, 30.03], [31.18, 29.99]]],
  'الأميرية': [[[31.28, 30.04], [31.33, 30.04], [31.33, 30.08], [31.28, 30.08], [31.28, 30.04]]],
};

interface AggregatedDistrict {
  avgPricePerSqm: Decimal;
  activeListings: number;
  priceChange6m: Decimal;
  avgDaysOnMarket: number;
  city: string;
  count: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Sliding window rate limit: 30 req/min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const rateLimitKey = `rl:map:districts:${ip}`;
    const now = Date.now();
    const windowStart = now - 60_000;
    const member = `${now}-${Math.random()}`;

    await redis.zadd(rateLimitKey, now, member);
    await redis.zremrangebyscore(rateLimitKey, '-inf', windowStart);
    const requestCount = await redis.zcard(rateLimitKey);
    await redis.expire(rateLimitKey, 60);

    if (requestCount > 30) {
      return NextResponse.json(
        { type: 'FeatureCollection', features: [] },
        { status: 429, headers: { 'X-Cache': 'MISS' } }
      );
    }
  } catch { /* Redis unavailable — allow request */ }

  // Check Redis cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }
  } catch { /* Redis unavailable */ }

  try {
    const stats = await db.districtStats.findMany({
      select: {
        district: true,
        city: true,
        avgPricePerSqm: true,
        listingCount: true,
        priceChange6m: true,
        avgDaysOnMarket: true,
      },
    });

    // Aggregate per district across all property types/transaction types
    const districtMap = new Map<string, AggregatedDistrict>();

    for (const s of stats) {
      const key = s.district;
      const pricePerSqm = new Decimal(s.avgPricePerSqm.toString());
      const change = new Decimal(s.priceChange6m.toString());
      const existing = districtMap.get(key);

      if (!existing) {
        districtMap.set(key, {
          avgPricePerSqm: pricePerSqm,
          activeListings: s.listingCount,
          priceChange6m: change,
          avgDaysOnMarket: s.avgDaysOnMarket,
          city: s.city,
          count: 1,
        });
      } else {
        // Running average using Decimal.js
        const newCount = existing.count + 1;
        districtMap.set(key, {
          avgPricePerSqm: existing.avgPricePerSqm
            .mul(existing.count)
            .add(pricePerSqm)
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

    // Compute normalized price scale (0–1)
    const prices = Array.from(districtMap.values())
      .filter((d) => d.avgPricePerSqm.gt(0))
      .map((d) => d.avgPricePerSqm);

    let minPrice = new Decimal(0);
    let maxPrice = new Decimal(1);
    if (prices.length > 0) {
      minPrice = Decimal.min(...prices);
      maxPrice = Decimal.max(...prices);
    }
    const priceRange = maxPrice.sub(minPrice);

    // Build GeoJSON FeatureCollection
    const features = [];
    for (const [district, boundary] of Object.entries(DISTRICT_BOUNDARIES)) {
      const data = districtMap.get(district);
      const avg = data?.avgPricePerSqm ?? new Decimal(0);
      const normalizedPrice = priceRange.gt(0) && data
        ? avg.sub(minPrice).div(priceRange).toDecimalPlaces(4).toNumber()
        : 0;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: boundary,
        },
        properties: {
          name: district,
          city: data?.city ?? 'القاهرة',
          avgPricePerSqm: data ? avg.toString() : '0',
          activeListings: data?.activeListings ?? 0,
          priceChange6m: data ? data.priceChange6m.toString() : '0',
          normalizedPrice,
          avgDaysOnMarket: data?.avgDaysOnMarket ?? 0,
        },
      });
    }

    const geojson = JSON.stringify({ type: 'FeatureCollection', features });

    // Cache in Redis for 30 minutes
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL, geojson);
    } catch { /* Redis unavailable */ }

    return new NextResponse(geojson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Map districts error:', error);
    return NextResponse.json(
      { type: 'FeatureCollection', features: [] },
      { headers: { 'X-Cache': 'MISS' } }
    );
  }
}
