import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const slugsParam = req.nextUrl.searchParams.get('slugs');
  if (!slugsParam) {
    return NextResponse.json({ error: 'slugs param required' }, { status: 400 });
  }

  const slugs = slugsParam.split(',').slice(0, 3).map((s) => s.trim()).filter(Boolean);
  if (slugs.length === 0) {
    return NextResponse.json({ error: 'slugs param required' }, { status: 400 });
  }

  const listings = await db.listing.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: {
      slug: true,
      titleAr: true,
      propertyType: true,
      transactionType: true,
      city: true,
      district: true,
      area: true,
      bedrooms: true,
      bathrooms: true,
      floor: true,
      totalFloors: true,
      parkingSpaces: true,
      isFurnished: true,
      askingPrice: true,
      pricePerSqm: true,
      verificationTier: true,
      aqarScore: true,
      hasFinancing: true,
      monthlyFrom: true,
      downPaymentFrom: true,
      installmentMonths: true,
      images: true,
      firmNameAr: true,
    },
  });

  // Preserve caller-supplied slug ordering
  const ordered = slugs
    .map((slug) => listings.find((l) => l.slug === slug))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);

  return NextResponse.json({
    listings: ordered.map((l) => ({
      slug: l.slug,
      titleAr: l.titleAr,
      propertyType: l.propertyType,
      transactionType: l.transactionType,
      city: l.city,
      district: l.district,
      area: l.area?.toString() ?? null,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      floor: l.floor,
      totalFloors: l.totalFloors,
      parkingSpaces: l.parkingSpaces,
      isFurnished: l.isFurnished,
      askingPrice: l.askingPrice.toString(),
      pricePerSqm: l.pricePerSqm?.toString() ?? null,
      verificationTier: l.verificationTier,
      aqarScore: l.aqarScore,
      hasFinancing: l.hasFinancing,
      monthlyFrom: l.monthlyFrom?.toString() ?? null,
      downPaymentFrom: l.downPaymentFrom?.toString() ?? null,
      installmentMonths: l.installmentMonths,
      images: l.images,
      firmNameAr: l.firmNameAr,
    })),
  });
}
