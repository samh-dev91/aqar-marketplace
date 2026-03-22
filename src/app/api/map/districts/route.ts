import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour cache

// Hardcoded simplified GeoJSON boundaries for top Cairo districts
// (Real coordinates for Egyptian districts)
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

export async function GET(): Promise<NextResponse> {
  try {
    const stats = await db.districtStats.findMany({
      select: {
        district: true,
        city: true,
        avgPricePerSqm: true,
        medianPrice: true,
        listingCount: true,
        priceChange6m: true,
        propertyType: true,
      },
    });

    // Aggregate per district (across all property types)
    const districtMap = new Map<string, {
      avgPricePerSqm: number;
      listingCount: number;
      priceChange6m: number;
      city: string;
    }>();

    for (const s of stats) {
      const key = s.district;
      const existing = districtMap.get(key);
      const pricePerSqm = s.avgPricePerSqm ? Number(s.avgPricePerSqm) : 0;
      const change = s.priceChange6m ? Number(s.priceChange6m) : 0;

      if (!existing) {
        districtMap.set(key, {
          avgPricePerSqm: pricePerSqm,
          listingCount: s.listingCount ?? 0,
          priceChange6m: change,
          city: s.city,
        });
      } else {
        districtMap.set(key, {
          avgPricePerSqm: (existing.avgPricePerSqm + pricePerSqm) / 2,
          listingCount: existing.listingCount + (s.listingCount ?? 0),
          priceChange6m: (existing.priceChange6m + change) / 2,
          city: existing.city,
        });
      }
    }

    // Build GeoJSON FeatureCollection
    const features = [];
    for (const [district, boundary] of Object.entries(DISTRICT_BOUNDARIES)) {
      const data = districtMap.get(district);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: boundary,
        },
        properties: {
          district,
          city: data?.city ?? 'القاهرة',
          avgPricePerSqm: data?.avgPricePerSqm ?? 0,
          listingCount: data?.listingCount ?? 0,
          priceChange6m: data?.priceChange6m ?? 0,
          hasData: !!data,
        },
      });
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('Map districts error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
