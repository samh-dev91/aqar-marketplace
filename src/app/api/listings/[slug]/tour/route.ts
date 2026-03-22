import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function detectTourType(url: string): '3d' | 'video' {
  if (/matterport|kuula/i.test(url)) return '3d';
  return 'video';
}

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
      virtualTourUrl: true,
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'العقار غير موجود' },
      { status: 404 }
    );
  }

  if (!listing.virtualTourUrl) {
    return NextResponse.json(
      { success: false, message: 'لا توجد جولة افتراضية لهذا العقار' },
      { status: 404 }
    );
  }

  const tourType = detectTourType(listing.virtualTourUrl);

  // Increment virtual tour view count — fire-and-forget, non-fatal
  db.listing
    .update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({
    success: true,
    data: {
      virtualTourUrl: listing.virtualTourUrl,
      type: tourType,
      listingSlug: listing.slug,
    },
  });
}
