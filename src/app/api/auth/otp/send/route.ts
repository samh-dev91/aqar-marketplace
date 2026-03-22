import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { normalizePhone } from '@/lib/utils';
import { sendWhatsApp } from '@/lib/whatsapp';

const sendSchema = z.object({
  phone: z.string().min(10).max(20),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const phone = normalizePhone(parsed.data.phone);

  // Rate limit: max 3 OTP sends per phone per 10 minutes
  const rateLimitKey = `otp_send_rate:${phone}`;
  try {
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 600); // 10 min
    if (count > 3) {
      return NextResponse.json(
        {
          success: false,
          message: 'لقد تجاوزت الحد الأقصى لإرسال رمز التحقق. حاول مرة أخرى بعد 10 دقائق.',
        },
        { status: 429 }
      );
    }
  } catch {
    // Redis unavailable — allow the send
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // +5 min

  await db.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
      attempts: 0,
    },
  });

  // Send OTP via WhatsApp
  await sendWhatsApp(phone, `رمز التحقق الخاص بك في عقار ثرست: *${code}*\n\nهذا الرمز صالح لمدة 10 دقائق.`);

  return NextResponse.json(
    { success: true, message: 'تم إرسال رمز التحقق' },
    { status: 200 }
  );
}
