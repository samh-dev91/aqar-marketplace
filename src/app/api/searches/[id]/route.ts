import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

/**
 * DELETE /api/searches/[id]
 * Delete a saved search for the authenticated consumer.
 * Requires x-consumer-id header.
 *
 * NOTE: The SavedSearch schema does not have an isActive / deletedAt field,
 * so this performs a hard delete. If soft-delete is needed in future,
 * add `isActive Boolean @default(true)` to the SavedSearch model in schema.prisma.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = params;

  // Verify the saved search belongs to this consumer before deleting
  const existing = await db.savedSearch.findUnique({
    where: { id },
    select: { consumerId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, message: 'Saved search not found' },
      { status: 404 }
    );
  }

  if (existing.consumerId !== consumerId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  await db.savedSearch.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'تم حذف البحث المحفوظ.' });
}
