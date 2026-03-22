import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;

  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      isActive: true,
      floorPlanUrl: true,
      images: true,
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'العقار غير موجود' },
      { status: 404 }
    );
  }

  // 1. Check dedicated floorPlanUrl field first
  if (listing.floorPlanUrl) {
    return NextResponse.json({
      success: true,
      data: {
        floorPlanUrl: listing.floorPlanUrl,
        listingSlug: listing.slug,
      },
    });
  }

  // 2. Fallback: scan images array for any URL containing 'floor' or 'plan' (case insensitive)
  const floorPattern = /floor|plan/i;
  const floorPlanFromImages = listing.images.find((url) => floorPattern.test(url)) ?? null;

  if (floorPlanFromImages) {
    return NextResponse.json({
      success: true,
      data: {
        floorPlanUrl: floorPlanFromImages,
        listingSlug: listing.slug,
      },
    });
  }

  return NextResponse.json(
    { success: false, message: 'لا يوجد مسقط أرضي لهذا العقار' },
    { status: 404 }
  );
}
