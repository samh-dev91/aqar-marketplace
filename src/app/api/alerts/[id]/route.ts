import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/alerts/[id]
 * Deactivates an alert (soft delete — sets isActive: false).
 * Only the owning consumer may deactivate their own alert.
 */
export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const { id } = await context.params;

  // Find the alert and verify ownership
  const alert = await db.priceAlert.findUnique({
    where: { id },
    select: { id: true, consumerId: true, isActive: true },
  });

  if (!alert) {
    return NextResponse.json({ success: false, message: 'التنبيه غير موجود.' }, { status: 404 });
  }

  if (alert.consumerId !== consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 403 });
  }

  if (!alert.isActive) {
    // Already deactivated — idempotent response
    return NextResponse.json({ success: true, message: 'التنبيه غير نشط بالفعل.' });
  }

  await db.priceAlert.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: 'تم إلغاء تفعيل التنبيه.' });
}
