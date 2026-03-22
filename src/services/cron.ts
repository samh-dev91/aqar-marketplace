import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { sendWhatsApp } from '@/lib/whatsapp';

/**
 * 24h Inquiry Shield opt-in reminder.
 * Call via POST /api/cron/inquiry-reminder (protected by CRON_SECRET header).
 * Finds WHATSAPP_SENT inquiries that are 24h old but not yet expired.
 * Sends a WhatsApp reminder to the consumer.
 *
 * NOTE: Inquiry.consumerPhone stores the normalized phone (e.g. "+20xxxxxxxxxx").
 */
export async function runInquiryReminders(): Promise<{ processed: number }> {
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const inquiries = await db.inquiry.findMany({
    where: {
      status: 'WHATSAPP_SENT',
      createdAt: { gte: cutoff48h, lte: cutoff24h },
      expiresAt: { gt: now },
    },
    include: {
      listing: { select: { titleAr: true, slug: true } },
    },
    take: 100,
  });

  let processed = 0;
  for (const inquiry of inquiries) {
    if (!inquiry.consumerPhone) continue;
    await sendWhatsApp(
      inquiry.consumerPhone,
      `تذكير: لا تزال استفسارك عن ${inquiry.listing?.titleAr ?? 'العقار'} في انتظار موافقتك.\n\nللموافقة على مشاركة رقمك مع الوسيط، رد بـ: *نعم*\nللإلغاء: *لا*\n\nينتهي هذا الطلب قريباً.`
    );
    processed++;
  }
  return { processed };
}

/**
 * Expire stale inquiries (status still WHATSAPP_SENT and expiresAt has passed).
 */
export async function expireStaleInquiries(): Promise<{ expired: number }> {
  const result = await db.inquiry.updateMany({
    where: {
      status: 'WHATSAPP_SENT',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
  return { expired: result.count };
}

/**
 * Mark listings as stale if not synced in 30 days.
 * Run nightly at 3am Cairo.
 * Uses Listing.lastSyncAt and Listing.isStale fields from schema.
 */
export async function markStaleListings(): Promise<{ marked: number }> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.listing.updateMany({
    where: { isActive: true, lastSyncAt: { lt: cutoff }, isStale: false },
    data: { isStale: true, staleSince: new Date() },
  });
  return { marked: result.count };
}

/**
 * Re-run each consumer's saved searches and send a WhatsApp alert
 * when new results appear since the last check.
 *
 * Schema note: SavedSearch has `resultCount` (Int?) and `lastRunAt` (DateTime?)
 * but no `lastCheckedAt`. We persist the "last known count" in Redis at
 * `search-alert:count:{searchId}` to avoid modifying the schema.
 *
 * Run daily — e.g. POST /api/cron/saved-search-alerts
 */
export async function runSavedSearchAlerts(): Promise<{ processed: number }> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar.example.com';

  // Fetch all saved searches with their consumer's phone
  const searches = await db.savedSearch.findMany({
    include: {
      consumer: { select: { id: true, phone: true } },
    },
  });

  let processed = 0;

  for (const search of searches) {
    const consumer = search.consumer;
    if (!consumer.phone) continue;

    // Reconstruct Prisma where clause from saved filters
    const filters = search.filters as Record<string, unknown>;

    const where: Record<string, unknown> = { isActive: true };
    if (typeof filters['city'] === 'string' && filters['city']) where['city'] = filters['city'];
    if (typeof filters['district'] === 'string' && filters['district']) {
      where['district'] = { contains: filters['district'], mode: 'insensitive' };
    }
    if (typeof filters['propertyType'] === 'string' && filters['propertyType']) {
      where['propertyType'] = filters['propertyType'];
    }
    if (typeof filters['transactionType'] === 'string' && filters['transactionType']) {
      where['transactionType'] = filters['transactionType'];
    }
    if (typeof filters['bedrooms'] === 'number') {
      where['bedrooms'] = { gte: filters['bedrooms'] };
    }
    if (typeof filters['minPrice'] === 'number' || typeof filters['maxPrice'] === 'number') {
      const priceFilter: Record<string, unknown> = {};
      if (typeof filters['minPrice'] === 'number') priceFilter['gte'] = filters['minPrice'];
      if (typeof filters['maxPrice'] === 'number') priceFilter['lte'] = filters['maxPrice'];
      where['askingPrice'] = priceFilter;
    }
    if (typeof filters['q'] === 'string' && filters['q']) {
      where['OR'] = [
        { titleAr: { contains: filters['q'], mode: 'insensitive' } },
        { titleEn: { contains: filters['q'], mode: 'insensitive' } },
        { address: { contains: filters['q'], mode: 'insensitive' } },
        { district: { contains: filters['q'], mode: 'insensitive' } },
      ];
    }

    const newCount = await db.listing.count({ where });

    // Retrieve last known count from Redis
    const redisKey = `search-alert:count:${search.id}`;
    let lastCount: number | null = null;
    try {
      const raw = await redis.get(redisKey);
      if (raw !== null) lastCount = parseInt(raw, 10);
    } catch { /* Redis unavailable — skip this search */ continue; }

    // On first run, set the baseline silently (no alert)
    if (lastCount === null) {
      try {
        await redis.setex(redisKey, 90 * 24 * 60 * 60, String(newCount));
      } catch { /* ignore */ }
      // Also update DB resultCount + lastRunAt for UI display
      await db.savedSearch.update({
        where: { id: search.id },
        data: { resultCount: newCount, lastRunAt: new Date() },
      });
      continue;
    }

    // Update DB regardless
    await db.savedSearch.update({
      where: { id: search.id },
      data: { resultCount: newCount, lastRunAt: new Date() },
    });

    // Send alert only when count has grown
    if (newCount > lastCount) {
      const added = newCount - lastCount;
      const label = search.nameAr ?? 'المحفوظ';

      // Build a shallow search URL from filters
      const qs = new URLSearchParams();
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null && val !== '') {
          qs.set(key, String(val));
        }
      }

      await sendWhatsApp(
        consumer.phone,
        `وجدنا ${added} عقار${added > 1 ? 'ات' : ''} جديد${added > 1 ? 'ة' : ''} تطابق بحثك "${label}". شاهدها الآن:\n${APP_URL}/search?${qs.toString()}`
      );
    }

    // Persist new count with 90-day TTL
    try {
      await redis.setex(redisKey, 90 * 24 * 60 * 60, String(newCount));
    } catch { /* ignore */ }

    processed++;
  }

  return { processed };
}

/**
 * Trigger the daily recommendation matrix build.
 * Imports lazily to avoid circular deps at module load time.
 * Run once daily — POST /api/cron/recommendations
 */
export async function buildDailyRecommendations(): Promise<void> {
  const { buildCoViewMatrix } = await import('./recommendation');
  await buildCoViewMatrix();
}
