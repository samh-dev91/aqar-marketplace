import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Decimal from 'decimal.js';
import type { Prisma } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get('limit') ?? '12')));
  const skip = (page - 1) * limit;

  const q = searchParams.get('q')?.trim() ?? '';
  const city = searchParams.get('city') ?? '';
  const district = searchParams.get('district') ?? '';
  const propertyType = searchParams.get('propertyType') ?? '';
  const transactionType = searchParams.get('transactionType') ?? '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minArea = searchParams.get('minArea');
  const maxArea = searchParams.get('maxArea');
  const bedrooms = searchParams.get('bedrooms');
  const verificationTier = searchParams.get('verificationTier') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'newest';
  const monthlyBudget = searchParams.get('monthlyBudget');

  const where: Prisma.ListingWhereInput = { isActive: true };

  if (city) where.city = city;
  if (district) where.district = { contains: district, mode: 'insensitive' };
  if (propertyType) where.propertyType = propertyType;
  if (transactionType) where.transactionType = transactionType;
  if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms) };
  if (verificationTier) where.verificationTier = verificationTier;

  if (minPrice || maxPrice) {
    where.askingPrice = {};
    if (minPrice) where.askingPrice.gte = new Decimal(minPrice);
    if (maxPrice) where.askingPrice.lte = new Decimal(maxPrice);
  }

  if (minArea || maxArea) {
    where.area = {};
    if (minArea) where.area.gte = new Decimal(minArea);
    if (maxArea) where.area.lte = new Decimal(maxArea);
  }

  // Monthly budget: filter by listings with financing where monthlyFrom <= budget
  if (monthlyBudget) {
    where.hasFinancing = true;
    where.monthlyFrom = { lte: new Decimal(monthlyBudget) };
  }

  // Bounding box filter for map view
  const bbox = searchParams.get('bbox'); // "lng1,lat1,lng2,lat2"
  if (bbox) {
    const [lng1, lat1, lng2, lat2] = bbox.split(',').map(Number);
    if (!isNaN(lng1) && !isNaN(lat1) && !isNaN(lng2) && !isNaN(lat2)) {
      where.latitude = { gte: new Decimal(Math.min(lat1, lat2)), lte: new Decimal(Math.max(lat1, lat2)) };
      where.longitude = { gte: new Decimal(Math.min(lng1, lng2)), lte: new Decimal(Math.max(lng1, lng2)) };
    }
  }

  // Full-text search across title, address, district, city
  if (q) {
    where.OR = [
      { titleAr: { contains: q, mode: 'insensitive' } },
      { titleEn: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { district: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sortBy === 'price_asc' ? { askingPrice: 'asc' }
    : sortBy === 'price_desc' ? { askingPrice: 'desc' }
    : sortBy === 'score' ? { aqarScore: 'desc' }
    : sortBy === 'area_desc' ? { area: 'desc' }
    : { publishedAt: 'desc' };

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true, slug: true, titleAr: true, titleEn: true,
        propertyType: true, transactionType: true,
        address: true, district: true, city: true,
        area: true, bedrooms: true, bathrooms: true,
        askingPrice: true, pricePerSqm: true, priceIsHidden: true,
        images: true, verificationTier: true, isStale: true,
        lastSyncAt: true, aqarScore: true,
        brokerDisplayName: true,
        firmNameAr: true, firmNameEn: true, firmLogoUrl: true,
        hasFinancing: true, monthlyFrom: true,
        latitude: true, longitude: true,
        viewCount: true, favoriteCount: true,
        isActive: true, publishedAt: true,
      },
    }),
    db.listing.count({ where }),
  ]);

  // Serialize Decimal fields
  const serialized = listings.map((l) => ({
    ...l,
    askingPrice: l.askingPrice.toString(),
    pricePerSqm: l.pricePerSqm?.toString() ?? null,
    area: l.area?.toString() ?? null,
    monthlyFrom: l.monthlyFrom?.toString() ?? null,
    latitude: l.latitude?.toString() ?? null,
    longitude: l.longitude?.toString() ?? null,
    lastSyncAt: l.lastSyncAt.toISOString(),
    publishedAt: l.publishedAt.toISOString(),
  }));

  return NextResponse.json({
    success: true,
    data: serialized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
