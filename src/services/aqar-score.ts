import Decimal from 'decimal.js';
import { db } from '@/lib/db';

// ─── Internal input types ───────────────────────────────────────────────────

interface ScoringListing {
  id: string;
  askingPrice: Decimal;
  area: Decimal | null;
  brokerDealCount: number | null;
  lastSyncAt: Date;
  city: string;
  district: string | null;
  propertyType: string;
}

interface ScoringDistrictStats {
  avgPricePerSqm: Decimal;
  avgDaysOnMarket: number;
  priceChange6m: Decimal;
}

// ─── Score factor helpers ───────────────────────────────────────────────────

/**
 * Factor 1 — Price competitiveness vs district avg (30 pts)
 * At/below district avg → 30 pts. Each 10% above avg = -3 pts, minimum 0.
 */
function scorePriceCompetitiveness(
  listing: ScoringListing,
  stats: ScoringDistrictStats
): number {
  if (!listing.area || listing.area.isZero()) return 15; // neutral fallback
  const listingPsm = listing.askingPrice.div(listing.area);
  const districtPsm = stats.avgPricePerSqm;
  if (districtPsm.isZero()) return 15;

  // ratio: how much above/below district avg (positive = above avg)
  const ratio = listingPsm.minus(districtPsm).div(districtPsm).toNumber();
  if (ratio <= 0) return 30;

  // Each 10% above = -3 pts
  const penalty = Math.floor(ratio / 0.1) * 3;
  return Math.max(0, 30 - penalty);
}

/**
 * Factor 2 — District demand velocity via avgDaysOnMarket (25 pts)
 */
function scoreDemandVelocity(stats: ScoringDistrictStats): number {
  const dom = stats.avgDaysOnMarket;
  if (dom < 30) return 25;
  if (dom < 60) return 18;
  if (dom < 90) return 12;
  return 5;
}

/**
 * Factor 3 — Price trend over 6 months (25 pts)
 * >5% up → 25, 0–5% up → 18, flat (0) → 12, declining → 5
 */
function scorePriceTrend(stats: ScoringDistrictStats): number {
  const changePercent = stats.priceChange6m.toNumber();
  if (changePercent > 5) return 25;
  if (changePercent > 0) return 18;
  if (changePercent === 0) return 12;
  return 5;
}

/**
 * Factor 4 — Broker track record (10 pts)
 */
function scoreBrokerTrackRecord(listing: ScoringListing): number {
  const dealCount = listing.brokerDealCount ?? 0;
  if (dealCount >= 20) return 10;
  if (dealCount >= 10) return 7;
  if (dealCount >= 5) return 4;
  return 1;
}

/**
 * Factor 5 — Listing freshness based on lastSyncAt (10 pts)
 */
function scoreListingFreshness(listing: ScoringListing): number {
  const now = Date.now();
  const syncAge = now - listing.lastSyncAt.getTime();
  const days = syncAge / (1000 * 60 * 60 * 24);
  if (days < 7) return 10;
  if (days < 14) return 7;
  if (days < 30) return 4;
  return 1;
}

// ─── Public service ─────────────────────────────────────────────────────────

export const aqarScoreService = {
  /**
   * Compute the Aqar Score (0–100) for a single listing given its district stats.
   * Returns 0 if stats are null (no data available).
   */
  computeScore(listing: ScoringListing, districtStats: ScoringDistrictStats | null): number {
    if (!districtStats) {
      // Partial score from broker + freshness only when no district data
      return scoreBrokerTrackRecord(listing) + scoreListingFreshness(listing);
    }

    const score =
      scorePriceCompetitiveness(listing, districtStats) +
      scoreDemandVelocity(districtStats) +
      scorePriceTrend(districtStats) +
      scoreBrokerTrackRecord(listing) +
      scoreListingFreshness(listing);

    return Math.min(100, Math.max(0, Math.round(score)));
  },

  /**
   * Batch recompute aqarScore for all active listings.
   * Called nightly by cron AFTER updateDistrictStats().
   */
  async recomputeAll(): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    // Fetch all active listings
    const listings = await db.listing.findMany({
      where: { isActive: true },
      select: {
        id: true,
        askingPrice: true,
        area: true,
        brokerDealCount: true,
        lastSyncAt: true,
        city: true,
        district: true,
        propertyType: true,
      },
    });

    // Fetch all district stats indexed by city+district+propertyType
    const allStats = await db.districtStats.findMany({
      select: {
        city: true,
        district: true,
        propertyType: true,
        avgPricePerSqm: true,
        avgDaysOnMarket: true,
        priceChange6m: true,
      },
    });

    // Build lookup map (avgDaysOnMarket and priceChange6m can be null in DB)
    const statsMap = new Map<string, ScoringDistrictStats>();
    for (const s of allStats) {
      const key = `${s.city}|${s.district}|${s.propertyType}`;
      statsMap.set(key, {
        avgPricePerSqm: s.avgPricePerSqm,
        avgDaysOnMarket: s.avgDaysOnMarket ?? 0,
        priceChange6m: s.priceChange6m ?? new Decimal(0),
      });
    }

    // Process in batches of 100 to avoid overwhelming the DB
    const BATCH_SIZE = 100;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      const updatePromises = batch.map(async (listing) => {
        try {
          const key = `${listing.city}|${listing.district ?? ''}|${listing.propertyType}`;
          const stats = statsMap.get(key) ?? null;
          const score = aqarScoreService.computeScore(listing, stats);

          await db.listing.update({
            where: { id: listing.id },
            data: { aqarScore: score, aqarScoreAt: new Date() },
          });
          updated++;
        } catch {
          errors++;
        }
      });

      await Promise.allSettled(updatePromises);
    }

    return { updated, errors };
  },

  /**
   * Recompute district stats from current active listing prices.
   * Called nightly by cron BEFORE recomputeAll().
   *
   * For each city+district+propertyType+transactionType combination:
   * - avgPricePerSqm: mean of (askingPrice / area) for listings that have area
   * - medianPrice: median of askingPrice
   * - listingCount: count of active listings
   * - priceChange6m: compare current avgPricePerSqm vs 30 days ago from PriceHistory
   * - avgDaysOnMarket: not computable from marketplace data alone → set to 0 as unknown marker
   */
  async updateDistrictStats(): Promise<void> {
    // Get all active listings with the fields we need
    const listings = await db.listing.findMany({
      where: { isActive: true },
      select: {
        city: true,
        district: true,
        propertyType: true,
        transactionType: true,
        askingPrice: true,
        area: true,
        id: true,
      },
    });

    // Group by city+district+propertyType+transactionType
    type GroupKey = string;
    interface GroupEntry {
      askingPrices: Decimal[];
      pricesPerSqm: Decimal[];
    }
    const groups = new Map<GroupKey, GroupEntry>();

    for (const listing of listings) {
      const key = `${listing.city}|${listing.district ?? ''}|${listing.propertyType}|${listing.transactionType}`;
      const existing = groups.get(key);
      const entry: GroupEntry = existing ?? { askingPrices: [], pricesPerSqm: [] };

      entry.askingPrices.push(listing.askingPrice);
      if (listing.area && !listing.area.isZero()) {
        entry.pricesPerSqm.push(listing.askingPrice.div(listing.area));
      }

      if (!existing) groups.set(key, entry);
    }

    // Get price history from 30 days ago for comparison
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldPriceHistory = await db.priceHistory.findMany({
      where: { recordedAt: { lte: thirtyDaysAgo } },
      select: {
        listingId: true,
        price: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Build map of listingId → oldest price within 30-day window
    const oldPriceByListing = new Map<string, Decimal>();
    for (const ph of oldPriceHistory) {
      if (!oldPriceByListing.has(ph.listingId)) {
        oldPriceByListing.set(ph.listingId, ph.price);
      }
    }

    // Build old avgPricePerSqm per group for comparison
    interface OldGroupData {
      pricesPerSqm: Decimal[];
    }
    const oldGroups = new Map<string, OldGroupData>();
    for (const listing of listings) {
      const oldPrice = oldPriceByListing.get(listing.id);
      if (!oldPrice || !listing.area || listing.area.isZero()) continue;

      const key = `${listing.city}|${listing.district ?? ''}|${listing.propertyType}|${listing.transactionType}`;
      const existing = oldGroups.get(key);
      const entry: OldGroupData = existing ?? { pricesPerSqm: [] };
      entry.pricesPerSqm.push(oldPrice.div(listing.area));
      if (!existing) oldGroups.set(key, entry);
    }

    // Upsert DistrictStats for each group
    const upsertPromises: Promise<unknown>[] = [];

    for (const [key, group] of groups) {
      const parts = key.split('|');
      const city = parts[0] ?? '';
      const district = parts[1] ?? '';
      const propertyType = parts[2] ?? '';
      const transactionType = parts[3] ?? '';

      const listingCount = group.askingPrices.length;

      // avgPricePerSqm
      const avgPricePerSqm: Decimal =
        group.pricesPerSqm.length > 0
          ? group.pricesPerSqm
              .reduce((sum, p) => sum.plus(p), new Decimal(0))
              .div(group.pricesPerSqm.length)
          : new Decimal(0);

      // medianPrice
      const sortedPrices = [...group.askingPrices].sort((a, b) =>
        a.comparedTo(b)
      );
      const mid = Math.floor(sortedPrices.length / 2);
      const medianPrice: Decimal =
        sortedPrices.length % 2 === 0
          ? ((sortedPrices[mid - 1] as Decimal).plus(sortedPrices[mid] as Decimal)).div(2)
          : (sortedPrices[mid] as Decimal);

      // priceChange6m — compare current avg vs old avg
      const oldGroup = oldGroups.get(key);
      let priceChange6m = new Decimal(0);
      if (oldGroup && oldGroup.pricesPerSqm.length > 0 && !avgPricePerSqm.isZero()) {
        const oldAvg = oldGroup.pricesPerSqm
          .reduce((sum, p) => sum.plus(p), new Decimal(0))
          .div(oldGroup.pricesPerSqm.length);
        if (!oldAvg.isZero()) {
          priceChange6m = avgPricePerSqm.minus(oldAvg).div(oldAvg).times(100);
        }
      }

      upsertPromises.push(
        db.districtStats.upsert({
          where: {
            city_district_propertyType_transactionType: {
              city,
              district,
              propertyType,
              transactionType,
            },
          },
          create: {
            city,
            district,
            propertyType,
            transactionType,
            listingCount,
            avgPricePerSqm: avgPricePerSqm.toDecimalPlaces(2),
            medianPrice: medianPrice.toDecimalPlaces(2),
            priceChange6m: priceChange6m.toDecimalPlaces(2),
            priceChange12m: new Decimal(0),
            avgDaysOnMarket: 0,
            dealVelocity: 0,
            soldCount30d: 0,
            computedAt: new Date(),
          },
          update: {
            listingCount,
            avgPricePerSqm: avgPricePerSqm.toDecimalPlaces(2),
            medianPrice: medianPrice.toDecimalPlaces(2),
            priceChange6m: priceChange6m.toDecimalPlaces(2),
            computedAt: new Date(),
          },
        })
      );
    }

    await Promise.allSettled(upsertPromises);
  },
};
