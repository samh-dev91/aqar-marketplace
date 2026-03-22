import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { sendWhatsApp } from '@/lib/whatsapp';

const schema = z.object({
  listingSlug: z.string().min(1),
  amount: z.union([z.literal(5000), z.literal(10000)]),
  consumerPhone: z.string().min(10).max(20),
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+2' + digits;
  if (digits.startsWith('20')) return '+' + digits;
  return '+20' + digits;
}

async function simulateReservation(
  listingSlug: string,
  consumerId: string,
  ref: string,
): Promise<void> {
  const ttl = 48 * 60 * 60; // 48 hours
  await redis.set(
    `reservation:${listingSlug}`,
    JSON.stringify({ consumerId, ref, createdAt: new Date().toISOString() }),
    'EX',
    ttl,
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Require authenticated consumer
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'يجب تسجيل الدخول أولاً.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { listingSlug, amount, consumerPhone } = parsed.data;

  // Validate that the consumer session belongs to the consumerId in the header
  const consumer = await db.consumer.findUnique({
    where: { id: consumerId },
    select: { id: true, phone: true },
  });
  if (!consumer) {
    return NextResponse.json(
      { success: false, message: 'جلسة غير صالحة.' },
      { status: 401 }
    );
  }

  // Validate the listing
  const listing = await db.listing.findUnique({
    where: { slug: listingSlug },
    select: { id: true, isActive: true, titleAr: true, slug: true },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'الوحدة غير متاحة.' },
      { status: 404 }
    );
  }

  // Check Redis for an existing pending reservation
  try {
    const existing = await redis.get(`reservation:${listingSlug}`);
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'هذه الوحدة محجوزة بالفعل.' },
        { status: 409 }
      );
    }
  } catch {
    // Redis unavailable — proceed cautiously
  }

  // Payment integration
  let reservationRef: string;

  if (process.env.PAYMOB_API_KEY) {
    // Real Paymob integration placeholder
    // TODO: implement Paymob order creation, auth token, iframe key
    reservationRef = `PAYMOB-${Date.now()}-${listingSlug.slice(-6)}`;
  } else {
    // Simulated payment — no live keys configured
    reservationRef = `SIM-${Date.now()}-${listingSlug.slice(-6)}`;
  }

  // Store reservation in Redis with 48h TTL
  try {
    await simulateReservation(listingSlug, consumerId, reservationRef);
  } catch {
    return NextResponse.json(
      { success: false, message: 'خطأ في حفظ الحجز. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const normalizedPhone = normalizePhone(consumerPhone);

  // Notify consumer via WhatsApp (fire-and-forget)
  sendWhatsApp(
    normalizedPhone,
    `تم حجز وحدتك بنجاح.\n\nالوحدة: ${listing.titleAr}\nرقم الحجز: ${reservationRef}\nالمبلغ المدفوع: ${amount.toLocaleString('ar-EG')} ج.م\n\nسيتواصل معكم الوسيط خلال 24 ساعة.\nينتهي الحجز خلال 48 ساعة.`,
  ).catch(() => {});

  return NextResponse.json({
    success: true,
    reservationRef,
    message: 'تم الحجز بنجاح',
    expiresAt: expiresAt.toISOString(),
  });
}
