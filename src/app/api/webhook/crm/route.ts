import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma';
import type { CrmWebhookPayload } from '@/types/crm-webhook';
import { processWebhook } from '@/services/listing-sync';

const MARKETPLACE_SECRET = process.env.MARKETPLACE_SECRET || '';

function verifySignature(body: string, signature: string): boolean {
  if (!MARKETPLACE_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', MARKETPLACE_SECRET)
    .update(body)
    .digest('hex');
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get('x-marketplace-signature') ?? '';
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
  }

  let payload: CrmWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CrmWebhookPayload;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  // Log the sync event
  await db.syncLog.create({
    data: {
      eventType: payload.event,
      crmFirmId: payload.firmId,
      crmPropertyId: payload.propertyId,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  // Process async — return 200 immediately
  processWebhook(payload).catch(async (err: Error) => {
    await db.syncLog.updateMany({
      where: {
        crmFirmId: payload.firmId,
        crmPropertyId: payload.propertyId,
        status: 'PENDING',
      },
      data: { status: 'FAILED', errorMessage: err.message },
    });
  });

  return NextResponse.json({ success: true });
}
