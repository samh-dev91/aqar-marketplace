import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { crmBridgeApi } from '@/lib/crm-api';
import Decimal from 'decimal.js';
import { sendWhatsApp } from '@/lib/whatsapp';

const inquirySchema = z.object({
  listingSlug: z.string().min(1),
  consumerName: z.string().min(2).max(100),
  consumerPhone: z.string().min(10).max(20),
  consumerEmail: z.string().email().optional(),
  message: z.string().max(1000).optional(),
  budgetStated: z.number().positive().optional(),
  viewingDate: z.string().datetime().optional(),
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+2' + digits;
  if (digits.startsWith('20')) return '+' + digits;
  return '+20' + digits;
}

function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(normalizePhone(phone)).digest('hex');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { listingSlug, consumerName, consumerPhone, consumerEmail, message, budgetStated, viewingDate } = parsed.data;

  // Rate limit: 5 inquiries per phone per hour
  const phoneHash = hashPhone(consumerPhone);
  const rateLimitKey = `inquiry_rate:${phoneHash}`;
  try {
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);
    if (count > 5) {
      return NextResponse.json(
        { success: false, message: 'Too many inquiries. Please try again later.' },
        { status: 429 }
      );
    }
  } catch {
    // Redis unavailable — allow the inquiry
  }

  // Find the listing
  const listing = await db.listing.findUnique({
    where: { slug: listingSlug },
    select: { id: true, crmFirmId: true, crmPropertyId: true, isActive: true, titleAr: true, slug: true },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json({ success: false, message: 'Listing not found' }, { status: 404 });
  }

  // Create inquiry record
  const inquiry = await db.inquiry.create({
    data: {
      listingId: listing.id,
      crmFirmId: listing.crmFirmId,
      crmPropertyId: listing.crmPropertyId,
      consumerName,
      consumerPhone: normalizePhone(consumerPhone),
      consumerPhoneHash: phoneHash,
      consumerEmail: consumerEmail ?? null,
      message: message ?? null,
      budgetStated: budgetStated != null ? new Decimal(budgetStated) : null,
      preferredViewing: viewingDate ? new Date(viewingDate) : null,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    },
  });

  // Send WhatsApp Inquiry Shield message to consumer
  const normalizedConsumerPhone = normalizePhone(consumerPhone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const listingUrl = `${appUrl}/listings/${listing.slug}`;
  sendWhatsApp(
    normalizedConsumerPhone,
    `مرحباً ${consumerName}،\n\nتم استلام استفساركم عن العقار: ${listing.titleAr}\n\nللموافقة على مشاركة رقم هاتفك مع الوسيط العقاري، رد على هذه الرسالة بـ: *نعم*\nللإلغاء: *لا*\n\nرابط العقار: ${listingUrl}\n\nينتهي هذا الطلب خلال 48 ساعة.`
  ).then(() => {
    // Update status to WHATSAPP_SENT and record timestamp
    db.inquiry.update({
      where: { id: inquiry.id },
      data: { status: 'WHATSAPP_SENT', whatsappSentAt: new Date() },
    }).catch(() => {});
  }).catch(() => {});

  // Increment inquiry count fire-and-forget
  db.listing.update({
    where: { id: listing.id },
    data: { inquiryCount: { increment: 1 } },
  }).catch(() => {});

  // Create CRM lead (fire-and-forget — don't fail inquiry if CRM is down)
  crmBridgeApi.createInquiry({
    crmFirmId: listing.crmFirmId,
    crmPropertyId: listing.crmPropertyId,
    consumerName,
    consumerPhone: normalizePhone(consumerPhone),
    consumerEmail,
    message,
    budgetStated,
    viewingDate,
    source: 'MARKETPLACE',
  }).then((result) => {
    // Update inquiry with CRM lead ID
    db.inquiry.update({
      where: { id: inquiry.id },
      data: { crmLeadId: result.crmLeadId, status: 'SENT_TO_CRM' },
    }).catch(() => {});
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    data: { inquiryId: inquiry.id },
    message: 'Your inquiry has been received. You will receive a WhatsApp confirmation.',
  });
}
