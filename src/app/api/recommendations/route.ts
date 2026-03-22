import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import {
  getRecommendationsForListing,
  getPersonalizedRecommendations,
} from '@/services/recommendation';

export const dynamic = 'force-dynamic';

/** Safe listing shape — never expose crmFirmId / crmPropertyId */
interface RecommendedListing {
  id: string;
  slug: string;
  titleAr: string;
  askingPrice: string;
  image: string | null;
  verificationTier: string;
  bedrooms: number | null;
  district: string | null;
  city: string;
}

async function fetchListingsByIds(ids: string[]): Promise<RecommendedListing[]> {
  if (ids.length === 0) return [];

  const listings = await db.listing.findMany({
    where: { id: { in: ids }, isActive: true },
    select: {
      id: true,
      slug: true,
      titleAr: true,
      askingPrice: true,
      images: true,
      verificationTier: true,
      bedrooms: true,
      district: true,
      city: true,
    },
  });

  // Preserve the order of the input ids
  const byId = new Map(listings.map((l) => [l.id, l]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);

  return ordered.map((l) => ({
    id: l.id,
    slug: l.slug,
    titleAr: l.titleAr,
    askingPrice: l.askingPrice.toString(),
    image: l.images[0] ?? null,
    verificationTier: l.verificationTier,
    bedrooms: l.bedrooms,
    district: l.district,
    city: l.city,
  }));
}

async function getPopularFallback(): Promise<RecommendedListing[]> {
  const listings = await db.listing.findMany({
    where: { isActive: true },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: {
      id: true,
      slug: true,
      titleAr: true,
      askingPrice: true,
      images: true,
      verificationTier: true,
      bedrooms: true,
      district: true,
      city: true,
    },
  });

  return listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    titleAr: l.titleAr,
    askingPrice: l.askingPrice.toString(),
    image: l.images[0] ?? null,
    verificationTier: l.verificationTier,
    bedrooms: l.bedrooms,
    district: l.district,
    city: l.city,
  }));
}

/**
 * GET /api/recommendations?slug=<listing-slug>
 *   Returns similar listings based on co-view matrix.
 *
 * GET /api/recommendations?personalized=1
 *   Requires x-consumer-id header. Returns personalised feed.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get('slug');
  const personalized = searchParams.get('personalized');

  // ── Personalised recommendations ─────────────────────────────────────────
  if (personalized) {
    const consumerId = req.headers.get('x-consumer-id');
    if (!consumerId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const cacheKey = `recs:personal:${consumerId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: JSON.parse(cached) as RecommendedListing[] });
      }
    } catch { /* Redis unavailable */ }

    const ids = await getPersonalizedRecommendations(consumerId);
    let listings = await fetchListingsByIds(ids);

    if (listings.length === 0) {
      listings = await getPopularFallback();
    }

    try {
      void redis.setex(cacheKey, 600, JSON.stringify(listings));
    } catch { /* Redis unavailable */ }

    return NextResponse.json({ success: true, data: listings });
  }

  // ── Listing-based recommendations ────────────────────────────────────────
  if (!slug) {
    return NextResponse.json(
      { success: false, message: 'slug or personalized param required' },
      { status: 400 }
    );
  }

  const cacheKey = `recs:slug:${slug}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: JSON.parse(cached) as RecommendedListing[] });
    }
  } catch { /* Redis unavailable */ }

  const listing = await db.listing.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!listing) {
    return NextResponse.json({ success: false, message: 'Listing not found' }, { status: 404 });
  }

  const ids = await getRecommendationsForListing(listing.id);
  let listings = await fetchListingsByIds(ids);

  if (listings.length === 0) {
    listings = await getPopularFallback();
  }

  try {
    void redis.setex(cacheKey, 600, JSON.stringify(listings));
  } catch { /* Redis unavailable */ }

  return NextResponse.json({ success: true, data: listings });
}
