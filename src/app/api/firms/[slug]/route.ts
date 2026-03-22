import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/firms/[slug]
// Returns public broker/firm profile with aggregated rating
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const slug = params.slug as string;

  // Find a representative listing to get firm display info
  const listing = await db.listing.findFirst({
    where: { crmFirmSlug: slug, isActive: true },
    select: {
      crmFirmSlug: true,
      firmNameAr: true,
      firmNameEn: true,
      firmLogoUrl: true,
      brokerDisplayName: true,
      brokerResponseTime: true,
      brokerDealCount: true,
      brokerSuccessRate: true,
      brokerVerifiedSince: true,
      brokerTier: true,
    },
  });

  if (!listing) {
    return NextResponse.json(
      { success: false, message: 'Firm not found' },
      { status: 404 }
    );
  }

  const [activeListingCount, ratingAgg] = await Promise.all([
    db.listing.count({ where: { crmFirmSlug: slug, isActive: true } }),
    db.brokerReview.aggregate({
      where: { crmFirmSlug: slug },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const avgRating = ratingAgg._avg.rating;
  const reviewCount = ratingAgg._count.rating;

  return NextResponse.json({
    success: true,
    data: {
      slug,
      firmNameAr: listing.firmNameAr,
      firmNameEn: listing.firmNameEn,
      firmLogoUrl: listing.firmLogoUrl,
      brokerDisplayName: listing.brokerDisplayName,
      brokerResponseTime: listing.brokerResponseTime,
      brokerDealCount: listing.brokerDealCount,
      brokerSuccessRate: listing.brokerSuccessRate,
      brokerVerifiedSince: listing.brokerVerifiedSince,
      brokerTier: listing.brokerTier,
      activeListingCount,
      avgRating,
      reviewCount,
    },
  });
}
