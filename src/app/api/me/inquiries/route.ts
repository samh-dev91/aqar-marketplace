import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/inquiries
 * Returns the authenticated consumer's inquiries, ordered newest first.
 * x-consumer-id is injected by middleware.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const inquiries = await db.inquiry.findMany({
    where: { consumerId },
    include: {
      listing: {
        select: { titleAr: true, slug: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    inquiries: inquiries.map((i) => ({
      id: i.id,
      listingSlug: i.listing?.slug ?? '',
      listingTitle: i.listing?.titleAr ?? 'عقار',
      status: i.status ?? 'PENDING',
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt?.toISOString() ?? null,
      message: i.message ?? '',
    })),
  });
}
