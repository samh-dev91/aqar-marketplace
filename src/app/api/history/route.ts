import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const HISTORY_KEY = (consumerId: string) => `history:consumer:${consumerId}`;
const HISTORY_MAX = 50; // keep last 50 items in sorted set

/**
 * GET /api/history
 * Requires x-consumer-id header.
 * Returns the last 20 viewed listings (full card data) from the Redis sorted set.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  let listingIds: string[] = [];
  try {
    // zrevrange returns members ordered by score DESC (most recent first)
    listingIds = await redis.zrevrange(HISTORY_KEY(consumerId), 0, 19);
  } catch {
    // Redis unavailable — return empty
    return NextResponse.json({ success: true, data: [] });
  }

  if (listingIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const listings = await db.listing.findMany({
    where: { id: { in: listingIds }, isActive: true },
    select: {
      id: true,
      slug: true,
      titleAr: true,
      titleEn: true,
      askingPrice: true,
      images: true,
      verificationTier: true,
      bedrooms: true,
      bathrooms: true,
      area: true,
      district: true,
      city: true,
      propertyType: true,
      transactionType: true,
      hasFinancing: true,
      monthlyFrom: true,
      isStale: true,
    },
  });

  // Preserve Redis order (most-recent first)
  const byId = new Map(listings.map((l) => [l.id, l]));
  const ordered = listingIds
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined);

  const serialized = ordered.map((l) => ({
    ...l,
    askingPrice: l.askingPrice.toString(),
    area: l.area?.toString() ?? null,
    monthlyFrom: l.monthlyFrom?.toString() ?? null,
  }));

  return NextResponse.json({ success: true, data: serialized });
}

const postBodySchema = z.object({
  listingId: z.string().min(1),
});

/**
 * POST /api/history
 * Body: { listingId: string }
 * Requires x-consumer-id header.
 *
 * 1. Adds listingId to Redis sorted set with current timestamp as score.
 * 2. Trims sorted set to last 50 entries.
 * 3. Increments Listing.viewCount (fire-and-forget).
 *
 * Returns immediately — DB write is non-blocking.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { listingId } = parsed.data;
  const now = Date.now();
  const histKey = HISTORY_KEY(consumerId);

  // Redis: record view + trim — best-effort
  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(histKey, now, listingId);
    // Keep only the most recent HISTORY_MAX entries (rank 0 is oldest when using ZREMRANGEBYRANK with 0 -51)
    pipeline.zremrangebyrank(histKey, 0, -(HISTORY_MAX + 1));
    // Expire the sorted set after 90 days of inactivity
    pipeline.expire(histKey, 90 * 24 * 60 * 60);
    await pipeline.exec();
  } catch {
    // Redis unavailable — continue, still increment DB counter
  }

  // Fire-and-forget DB viewCount increment (do not await)
  void db.listing
    .update({
      where: { id: listingId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      // Swallow — invalid listingId or DB transient error should not surface to caller
    });

  return NextResponse.json({ success: true });
}
