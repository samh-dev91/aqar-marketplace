import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const VALID_ALERT_TYPES = ['PRICE_DROP', 'NEW_MATCH', 'STATUS_CHANGE'] as const;
type AlertType = (typeof VALID_ALERT_TYPES)[number];

const createAlertSchema = z.object({
  listingSlug: z.string().min(1).optional(),
  alertType: z.enum(VALID_ALERT_TYPES),
  threshold: z.number().positive().optional(),
});

/**
 * GET /api/alerts
 * Returns all active price alerts for the authenticated consumer.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const alerts = await db.priceAlert.findMany({
    where: { consumerId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        select: {
          slug: true,
          titleAr: true,
          askingPrice: true,
          city: true,
          district: true,
          images: true,
          isActive: true,
        },
      },
    },
  });

  const data = alerts.map((alert) => ({
    id: alert.id,
    alertType: alert.alertType,
    isActive: alert.isActive,
    priceThreshold: alert.priceThreshold?.toString() ?? null,
    dropPercent: alert.dropPercent?.toString() ?? null,
    lastTriggeredAt: alert.lastTriggeredAt,
    triggerCount: alert.triggerCount,
    createdAt: alert.createdAt,
    listing: alert.listing
      ? {
          slug: alert.listing.slug,
          titleAr: alert.listing.titleAr,
          askingPrice: alert.listing.askingPrice.toString(),
          city: alert.listing.city,
          district: alert.listing.district,
          images: alert.listing.images,
          isActive: alert.listing.isActive,
        }
      : null,
  }));

  return NextResponse.json({ success: true, data });
}

/**
 * POST /api/alerts
 * Create a new price alert for the authenticated consumer.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { listingSlug, alertType, threshold } = parsed.data;

  if (!listingSlug) {
    return NextResponse.json(
      {
        success: false,
        message: 'يجب تحديد إعلان للتنبيه.',
      },
      { status: 400 }
    );
  }

  const listing = await db.listing.findUnique({
    where: { slug: listingSlug },
    select: { id: true, isActive: true },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json(
      { success: false, message: 'الإعلان غير موجود أو غير نشط.' },
      { status: 404 }
    );
  }

  const listingId: string = listing.id;

  const alert = await db.priceAlert.create({
    data: {
      consumerId,
      listingId,
      alertType: alertType as AlertType,
      priceThreshold: threshold ?? null,
      isActive: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: alert.id,
      alertType: alert.alertType,
      isActive: alert.isActive,
      priceThreshold: alert.priceThreshold?.toString() ?? null,
      dropPercent: alert.dropPercent?.toString() ?? null,
      listingId: alert.listingId,
      createdAt: alert.createdAt,
    },
  });
}
