import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { z } from 'zod';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

// 30 days TTL
const PUSH_TTL = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'بيانات الاشتراك غير صالحة' }, { status: 400 });
  }

  const { endpoint, p256dh, auth } = parsed.data;

  try {
    await redis.setex(
      `push:consumer:${consumerId}`,
      PUSH_TTL,
      JSON.stringify({ endpoint, p256dh, auth })
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push/subscribe] Redis error:', err);
    return NextResponse.json({ success: false, message: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
  }
  await redis.del(`push:consumer:${consumerId}`);
  return NextResponse.json({ success: true });
}
