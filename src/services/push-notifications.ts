import webpush from 'web-push';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

// Configure VAPID on module load
if (
  process.env.VAPID_EMAIL &&
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  titleAr: string;
  bodyAr: string;
  url?: string;
  icon?: string;
}

async function getConsumerSubscription(consumerId: string): Promise<PushSubscription | null> {
  try {
    const raw = await redis.get(`push:consumer:${consumerId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PushSubscription;
  } catch {
    return null;
  }
}

export const pushService = {
  async sendToSubscription(
    subscription: PushSubscription,
    payload: PushPayload
  ): Promise<boolean> {
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.warn('[push] VAPID keys not configured — skipping push');
      return false;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: payload.titleAr,
          body: payload.bodyAr,
          icon: payload.icon ?? '/icons/pwa-192x192.png',
          badge: '/icons/badge-72.png',
          data: { url: payload.url ?? '/' },
        })
      );
      return true;
    } catch (err: unknown) {
      // 410 Gone or 404 = subscription expired, safe to ignore
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) return false;
      console.error('[push] sendToSubscription error:', err);
      return false;
    }
  },

  async sendPriceDropAlerts(
    listingId: string,
    oldPrice: string,
    newPrice: string,
    listingSlug: string,
    listingTitleAr: string
  ): Promise<void> {
    // Find all consumers who favorited this listing
    const favorites = await db.favorite.findMany({
      where: { listingId },
      select: { consumerId: true },
    });

    if (favorites.length === 0) return;

    const payload: PushPayload = {
      titleAr: `انخفض سعر عقار في مفضلتك`,
      bodyAr: `${listingTitleAr} — من ${oldPrice} إلى ${newPrice} جنيه`,
      url: `/listings/${listingSlug}`,
    };

    await Promise.allSettled(
      favorites.map(async ({ consumerId }) => {
        const sub = await getConsumerSubscription(consumerId);
        if (!sub) return;
        const ok = await this.sendToSubscription(sub, payload);
        // If subscription expired, clean up Redis
        if (!ok) await redis.del(`push:consumer:${consumerId}`);
      })
    );
  },

  async sendNewMatchAlerts(listing: {
    id: string;
    slug: string;
    titleAr: string;
    city: string;
    district?: string | null;
    propertyType: string;
  }): Promise<void> {
    // Find active NEW_MATCH alerts — consumer-level matching
    const alerts = await db.priceAlert.findMany({
      where: { alertType: 'NEW_MATCH', isActive: true },
      select: { consumerId: true, id: true },
    });

    if (alerts.length === 0) return;

    const location = listing.district
      ? `${listing.district}، ${listing.city}`
      : listing.city;

    const payload: PushPayload = {
      titleAr: 'عقار جديد يطابق تنبيهك',
      bodyAr: `${listing.titleAr} — ${location}`,
      url: `/listings/${listing.slug}`,
    };

    await Promise.allSettled(
      alerts.map(async ({ consumerId, id }) => {
        const sub = await getConsumerSubscription(consumerId);
        if (!sub) return;
        const ok = await this.sendToSubscription(sub, payload);
        if (!ok) await redis.del(`push:consumer:${consumerId}`);
        // Update lastTriggeredAt
        await db.priceAlert.update({
          where: { id },
          data: { lastTriggeredAt: new Date() },
        });
      })
    );
  },
};
