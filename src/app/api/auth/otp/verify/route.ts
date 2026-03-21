import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/utils';

const verifySchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6),
  name: z.string().min(2).max(100).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { code, name } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);

  // Find the most recent unused OTP for this phone that hasn't expired and hasn't hit the attempt limit
  const otpRecord = await db.otpCode.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return NextResponse.json(
      { success: false, message: 'رمز غير صالح أو منتهي الصلاحية' },
      { status: 400 }
    );
  }

  // Increment attempts regardless of whether code matches
  await db.otpCode.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  });

  if (otpRecord.code !== code) {
    const remainingAttempts = 5 - (otpRecord.attempts + 1);
    return NextResponse.json(
      {
        success: false,
        message: 'رمز التحقق غير صحيح',
        remainingAttempts,
      },
      { status: 400 }
    );
  }

  // Mark OTP as used
  await db.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() },
  });

  // Build phoneHash
  const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');

  // Upsert consumer
  const consumer = await db.consumer.upsert({
    where: { phone },
    create: {
      phone,
      phoneHash,
      nameAr: name ?? null,
    },
    update: {
      // Update name only if provided and not already set
      ...(name ? { nameAr: name } : {}),
    },
  });

  // Create session: token = UUID, expires in 7 days
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.consumerSession.create({
    data: {
      consumerId: consumer.id,
      token,
      expiresAt,
      provider: 'OTP',
    },
  });

  return NextResponse.json({
    success: true,
    token,
    consumer: {
      id: consumer.id,
      name: consumer.nameAr,
      phone: consumer.phone,
    },
  });
}
