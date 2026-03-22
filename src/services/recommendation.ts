import { redis } from '@/lib/redis';
import { db } from '@/lib/db';

const RECS_TTL = 86400; // 24h
const RECS_KEY = (listingId: string) => `recs:listing:${listingId}`;
const HISTORY_KEY = (consumerId: string) => `history:consumer:${consumerId}`;

/**
 * Item-based collaborative filtering from ViewHistory.
 * Builds co-view pairs from the last 30 days and stores the top 5
 * co-viewed listings for each listing in Redis.
 *
 * Called daily by the cron job via buildDailyRecommendations().
 */
export async function buildCoViewMatrix(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const views = await db.viewHistory.findMany({
    where: { viewedAt: { gte: thirtyDaysAgo } },
    select: { consumerId: true, listingId: true },
  });

  // Need at least 10 events for meaningful recommendations
  if (views.length < 10) {
    return;
  }

  // Group listing IDs by consumer
  const byConsumer = new Map<string, Set<string>>();
  for (const { consumerId, listingId } of views) {
    const existing = byConsumer.get(consumerId);
    if (existing) {
      existing.add(listingId);
    } else {
      byConsumer.set(consumerId, new Set([listingId]));
    }
  }

  // Build co-view frequency map
  // For each consumer who viewed ≥2 listings, emit all (A, B) pairs
  const coViewCounts = new Map<string, number>();
  for (const listingSet of byConsumer.values()) {
    const ids = Array.from(listingSet);
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        // Store both directions
        const keyAB = `${a}:${b}`;
        const keyBA = `${b}:${a}`;
        coViewCounts.set(keyAB, (coViewCounts.get(keyAB) ?? 0) + 1);
        coViewCounts.set(keyBA, (coViewCounts.get(keyBA) ?? 0) + 1);
      }
    }
  }

  // Aggregate by listing: Map<listingId, Array<{ id, score }>>
  const listingRecs = new Map<string, Array<{ id: string; score: number }>>();
  for (const [pair, score] of coViewCounts) {
    const colonIdx = pair.indexOf(':');
    const a = pair.slice(0, colonIdx);
    const b = pair.slice(colonIdx + 1);

    const existingA = listingRecs.get(a) ?? [];
    existingA.push({ id: b, score });
    listingRecs.set(a, existingA);
  }

  // Write top-5 for each listing to Redis (pipeline for efficiency)
  const pipeline = redis.pipeline();
  for (const [listingId, recs] of listingRecs) {
    const top5 = recs
      .sort((x, y) => y.score - x.score)
      .slice(0, 5)
      .map((r) => r.id);
    pipeline.setex(RECS_KEY(listingId), RECS_TTL, JSON.stringify(top5));
  }
  await pipeline.exec();
}

/**
 * Returns up to 5 recommended listing IDs for a given listing.
 * Uses cached co-view matrix from Redis; falls back to same-type popular listings.
 */
export async function getRecommendationsForListing(listingId: string): Promise<string[]> {
  try {
    const cached = await redis.get(RECS_KEY(listingId));
    if (cached) return JSON.parse(cached) as string[];
  } catch {
    // Redis unavailable — fall through to DB fallback
  }

  // Fallback: same propertyType + city, ordered by viewCount DESC
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { propertyType: true, city: true },
  });

  if (!listing) return [];

  const fallback = await db.listing.findMany({
    where: {
      propertyType: listing.propertyType,
      city: listing.city,
      isActive: true,
      id: { not: listingId },
    },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: { id: true },
  });

  return fallback.map((l) => l.id);
}

/**
 * Returns up to 8 personalised listing IDs for a consumer,
 * derived from their recent view history stored in Redis sorted sets.
 *
 * Redis key: `history:consumer:{consumerId}` — sorted set with score = timestamp
 */
export async function getPersonalizedRecommendations(consumerId: string): Promise<string[]> {
  let recent: string[] = [];
  try {
    recent = await redis.zrevrange(HISTORY_KEY(consumerId), 0, 9);
  } catch {
    // Redis unavailable
    return [];
  }

  if (recent.length === 0) return [];

  // Get recs for each of the 5 most recently viewed listings
  const allRecs: string[] = [];
  for (const listingId of recent.slice(0, 5)) {
    const recs = await getRecommendationsForListing(listingId);
    allRecs.push(...recs);
  }

  // Deduplicate and exclude already-viewed
  const viewed = new Set(recent);
  return [...new Set(allRecs)].filter((id) => !viewed.has(id)).slice(0, 8);
}
