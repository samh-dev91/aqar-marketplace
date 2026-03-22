import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const project = await db.project.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      listings: {
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          titleAr: true,
          propertyType: true,
          bedrooms: true,
          bathrooms: true,
          area: true,
          floor: true,
          askingPrice: true,
          verificationTier: true,
          aqarScore: true,
          images: true,
          isActive: true,
        },
        orderBy: { askingPrice: 'asc' },
        take: 50,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...project,
      minPrice: project.minPrice.toString(),
      maxPrice: project.maxPrice?.toString() ?? null,
      latitude: project.latitude?.toString() ?? null,
      longitude: project.longitude?.toString() ?? null,
      listings: project.listings.map(l => ({
        ...l,
        askingPrice: l.askingPrice.toString(),
        area: l.area?.toString() ?? null,
      })),
    },
  });
}
