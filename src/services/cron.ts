import { db } from '@/lib/db';
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
