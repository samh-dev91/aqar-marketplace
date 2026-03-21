import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/favorites
 * Returns all favorited listings for the authenticated consumer.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const favorites = await db.favorite.findMany({
    where: { consumerId },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        select: {
          id: true,
          slug: true,
          titleAr: true,
          titleEn: true,
          propertyType: true,
          transactionType: true,
          address: true,
          district: true,
          city: true,
          area: true,
          bedrooms: true,
          bathrooms: true,
          floor: true,
          askingPrice: true,
          priceIsHidden: true,
          monthlyFrom: true,
          hasFinancing: true,
          images: true,
          verificationTier: true,
          aqarScore: true,
          brokerDisplayName: true,
          brokerResponseTime: true,
          firmNameAr: true,
          firmNameEn: true,
          firmLogoUrl: true,
          favoriteCount: true,
          inquiryCount: true,
          isActive: true,
          publishedAt: true,
        },
      },
    },
  });

  const listings = favorites.map((fav) => ({
    favoriteId: fav.id,
    favoritedAt: fav.createdAt,
    listing: {
      ...fav.listing,
      askingPrice: fav.listing.askingPrice.toString(),
      monthlyFrom: fav.listing.monthlyFrom?.toString() ?? null,
      area: fav.listing.area?.toString() ?? null,
    },
  }));

  return NextResponse.json({ success: true, data: listings });
}
