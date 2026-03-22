import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function determineTier(
  brokerDealCount: number | null,
  brokerResponseTime: number | null,
  avgRating: number | null
): string {
  // brokerResponseTime is stored as Int (minutes) in the Listing schema.
  // Thresholds:  < 60  → "< 1 ساعة"  (fast)
  //              < 360 → "< 6 ساعات" (fast)
  //              < 1440→ "< 24 ساعة" (acceptable)
  const dealCount = brokerDealCount ?? 0;
  const rating = avgRating ?? 0;
  const responseMin = brokerResponseTime ?? 99999;

  const isFastResponse = responseMin < 360; // covers < 1h, 1-2h, < 6h
  const isAcceptableResponse = responseMin < 1440; // covers all ACCEPTABLE_RESPONSE_TIMES

  if (dealCount >= 50 && isFastResponse && rating >= 4.5) {
    return 'GOLD_BROKER';
  }

  if (dealCount >= 20 && isAcceptableResponse) {
    return 'TRUSTED';
  }

  return 'STANDARD';
}

// POST /api/cron/broker-tiers
// Protected by x-cron-secret header
// Nightly at 2am Cairo — computes broker tier for each firm and updates all listings
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all unique crmFirmSlugs in the Listing table
  const firmSlugsResult = await db.listing.findMany({
    where: { isActive: true },
    select: { crmFirmSlug: true },
    distinct: ['crmFirmSlug'],
  });

  const firmSlugs = firmSlugsResult.map((r) => r.crmFirmSlug);
  let firmsProcessed = 0;

  for (const slug of firmSlugs) {
    // 1. Get avg rating from BrokerReview
    const ratingAgg = await db.brokerReview.aggregate({
      where: { crmFirmSlug: slug },
      _avg: { rating: true },
    });
    const avgRating = ratingAgg._avg.rating;

    // 2. Get representative listing for broker stats
    const repListing = await db.listing.findFirst({
      where: { crmFirmSlug: slug },
      select: {
        brokerDealCount: true,
        brokerResponseTime: true,
      },
    });

    // 3. Determine tier
    const tier = determineTier(
      repListing?.brokerDealCount ?? null,
      repListing?.brokerResponseTime ?? null,
      avgRating
    );

    // 4. Update all listings for this firm
    await db.listing.updateMany({
      where: { crmFirmSlug: slug },
      data: { brokerTier: tier },
    });

    firmsProcessed++;
  }

  return NextResponse.json({ success: true, firmsProcessed });
}
