import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const slug = params.slug as string;

  const listing = await db.listing.findUnique({
    where: { slug },
    include: {
      financing: true,
      priceHistory: {
        orderBy: { recordedAt: 'asc' },
        take: 24,
        select: { price: true, changeType: true, recordedAt: true },
      },
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  // Increment view count fire-and-forget
  db.listing.update({
    where: { id: listing.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Fetch similar listings (same type + city, different slug)
  const similar = await db.listing.findMany({
    where: {
      isActive: true,
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      city: listing.city,
      slug: { not: slug },
    },
    take: 4,
    orderBy: { aqarScore: 'desc' },
    select: {
      id: true, slug: true, titleAr: true, titleEn: true,
      propertyType: true, transactionType: true,
      address: true, district: true, city: true,
      area: true, bedrooms: true, bathrooms: true,
      askingPrice: true, priceIsHidden: true, images: true,
      verificationTier: true, isStale: true, lastSyncAt: true,
      aqarScore: true, firmNameAr: true, publishedAt: true,
    },
  });

  // Fetch district stats if available
  const districtStats = listing.district
    ? await db.districtStats.findFirst({
        where: {
          city: listing.city,
          district: listing.district,
          propertyType: listing.propertyType,
          transactionType: listing.transactionType,
        },
      })
    : null;

  const serialize = (l: typeof listing) => ({
    ...l,
    askingPrice: l.askingPrice.toString(),
    pricePerSqm: l.pricePerSqm?.toString() ?? null,
    area: l.area?.toString() ?? null,
    latitude: l.latitude?.toString() ?? null,
    longitude: l.longitude?.toString() ?? null,
    monthlyFrom: l.monthlyFrom?.toString() ?? null,
    downPaymentFrom: l.downPaymentFrom?.toString() ?? null,
    lastSyncAt: l.lastSyncAt.toISOString(),
    publishedAt: l.publishedAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    createdAt: l.createdAt.toISOString(),
    financing: l.financing ? {
      ...l.financing,
      downPaymentMin: l.financing.downPaymentMin.toString(),
      downPaymentMax: l.financing.downPaymentMax?.toString() ?? null,
      monthlyMin: l.financing.monthlyMin.toString(),
      monthlyMax: l.financing.monthlyMax?.toString() ?? null,
    } : null,
    priceHistory: l.priceHistory.map((p) => ({
      price: p.price.toString(),
      changeType: p.changeType,
      recordedAt: p.recordedAt.toISOString(),
    })),
  });

  return NextResponse.json({
    success: true,
    data: serialize(listing),
    similarListings: similar.map((s) => ({
      ...s,
      askingPrice: s.askingPrice.toString(),
      area: s.area?.toString() ?? null,
      lastSyncAt: s.lastSyncAt.toISOString(),
      publishedAt: s.publishedAt.toISOString(),
    })),
    districtStats: districtStats ? {
      ...districtStats,
      avgPricePerSqm: districtStats.avgPricePerSqm.toString(),
      medianPrice: districtStats.medianPrice.toString(),
      priceChange6m: districtStats.priceChange6m.toString(),
      priceChange12m: districtStats.priceChange12m.toString(),
    } : null,
  });
}
