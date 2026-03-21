import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/favorites/[slug]
 * Add a listing to the consumer's favorites (idempotent).
 */
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const { slug } = await context.params;

  const listing = await db.listing.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json({ success: false, message: 'الإعلان غير موجود.' }, { status: 404 });
  }

  // Upsert to be idempotent — no error if already favorited
  await db.favorite.upsert({
    where: {
      consumerId_listingId: { consumerId, listingId: listing.id },
    },
    create: { consumerId, listingId: listing.id },
    update: {}, // nothing to update — just ensure it exists
  });

  // Increment favoriteCount fire-and-forget
  db.listing
    .update({
      where: { id: listing.id },
      data: { favoriteCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({ success: true, message: 'تمت الإضافة إلى المفضلة.' });
}

/**
 * DELETE /api/favorites/[slug]
 * Remove a listing from the consumer's favorites.
 */
export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const { slug } = await context.params;

  const listing = await db.listing.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!listing) {
    return NextResponse.json({ success: false, message: 'الإعلان غير موجود.' }, { status: 404 });
  }

  // Delete favorite if it exists (no error if not found)
  const deleted = await db.favorite
    .delete({
      where: {
        consumerId_listingId: { consumerId, listingId: listing.id },
      },
    })
    .catch(() => null);

  if (deleted) {
    // Decrement favoriteCount (floor at 0) fire-and-forget
    db.listing
      .update({
        where: { id: listing.id, favoriteCount: { gt: 0 } },
        data: { favoriteCount: { decrement: 1 } },
      })
      .catch(() => {});
  }

  return NextResponse.json({ success: true, message: 'تمت إزالة الإعلان من المفضلة.' });
}
