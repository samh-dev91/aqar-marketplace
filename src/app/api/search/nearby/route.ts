import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma';

interface NearbyRow {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  propertyType: string;
  transactionType: string;
  address: string;
  district: string | null;
  city: string;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  askingPrice: string;
  pricePerSqm: string | null;
  priceIsHidden: boolean;
  images: string[];
  verificationTier: string;
  isStale: boolean;
  lastSyncAt: Date;
  aqarScore: number | null;
  brokerDisplayName: string | null;
  firmNameAr: string;
  firmNameEn: string | null;
  firmLogoUrl: string | null;
  hasFinancing: boolean;
  monthlyFrom: string | null;
  viewCount: number;
  favoriteCount: number;
  isActive: boolean;
  publishedAt: Date;
  distance_km: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const radiusStr = searchParams.get('radius') ?? '10';
  const limitStr = searchParams.get('limit') ?? '12';

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { success: false, message: 'lat و lng مطلوبان' },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radius = Math.min(parseFloat(radiusStr) || 10, 50);
  const limit = Math.min(parseInt(limitStr) || 12, 24);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { success: false, message: 'إحداثيات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const rows = await db.$queryRaw<NearbyRow[]>`
      SELECT
        id, slug, "titleAr", "titleEn", "propertyType", "transactionType",
        address, district, city,
        area::text, bedrooms, bathrooms,
        "askingPrice"::text AS "askingPrice",
        "pricePerSqm"::text AS "pricePerSqm",
        "priceIsHidden", images, "verificationTier", "isStale", "lastSyncAt",
        "aqarScore", "brokerDisplayName", "firmNameAr", "firmNameEn", "firmLogoUrl",
        "hasFinancing", "monthlyFrom"::text AS "monthlyFrom",
        "viewCount", "favoriteCount", "isActive", "publishedAt",
        (
          6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(latitude::float))
              * cos(radians(longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(latitude::float))
            )
          )
        ) AS distance_km
      FROM "Listing"
      WHERE
        "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(latitude::float))
              * cos(radians(longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(latitude::float))
            )
          )
        ) <= ${radius}
      ORDER BY distance_km ASC
      LIMIT ${limit}
    `;

    const data = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      propertyType: row.propertyType,
      transactionType: row.transactionType,
      address: row.address,
      district: row.district,
      city: row.city,
      area: row.area ? parseFloat(row.area) : undefined,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      askingPrice: row.askingPrice,
      pricePerSqm: row.pricePerSqm ?? undefined,
      priceIsHidden: row.priceIsHidden,
      images: row.images,
      verificationTier: row.verificationTier as 'LISTED' | 'VERIFIED' | 'GOLD',
      isStale: row.isStale,
      lastSyncAt: row.lastSyncAt.toISOString(),
      aqarScore: row.aqarScore ?? undefined,
      brokerDisplayName: row.brokerDisplayName ?? undefined,
      firmNameAr: row.firmNameAr,
      firmNameEn: row.firmNameEn ?? undefined,
      firmLogoUrl: row.firmLogoUrl ?? undefined,
      hasFinancing: row.hasFinancing,
      monthlyFrom: row.monthlyFrom ?? undefined,
      viewCount: row.viewCount,
      favoriteCount: row.favoriteCount,
      isActive: row.isActive,
      publishedAt: row.publishedAt.toISOString(),
      distance_km: Math.round(row.distance_km * 10) / 10,
    }));

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error('Nearby search error:', err);
    return NextResponse.json(
      { success: false, message: 'خطأ في البحث' },
      { status: 500 }
    );
  }
}
