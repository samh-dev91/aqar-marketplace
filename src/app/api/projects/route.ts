import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city') ?? '';
  const developer = searchParams.get('developer') ?? '';
  const deliveryYear = searchParams.get('deliveryYear');
  const hasFinancing = searchParams.get('hasFinancing');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get('limit') ?? '12')));

  const where: Prisma.ProjectWhereInput = { isActive: true };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (developer) where.developerNameAr = { contains: developer, mode: 'insensitive' };
  if (deliveryYear) where.deliveryYear = parseInt(deliveryYear);
  if (hasFinancing === 'true') where.hasFinancing = true;

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        developerNameAr: true,
        coverImageUrl: true,
        district: true,
        city: true,
        deliveryYear: true,
        totalUnits: true,
        availableUnits: true,
        minPrice: true,
        maxPrice: true,
        hasFinancing: true,
        minDownPayment: true,
        maxYears: true,
        amenities: true,
        publishedAt: true,
      },
    }),
    db.project.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: projects.map(p => ({
      ...p,
      minPrice: p.minPrice.toString(),
      maxPrice: p.maxPrice?.toString() ?? null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
