import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const savedSearchSchema = z.object({
  nameAr: z.string().max(100).optional(),
  filters: z.object({
    q: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    propertyType: z.string().optional(),
    transactionType: z.string().optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    bedrooms: z.number().int().positive().optional(),
  }),
});

/**
 * GET /api/searches
 * List the authenticated consumer's saved searches.
 * Requires x-consumer-id header (set by auth middleware / session token validation upstream).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  const searches = await db.savedSearch.findMany({
    where: { consumerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nameAr: true,
      filters: true,
      lastRunAt: true,
      resultCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: searches });
}

/**
 * POST /api/searches
 * Create a saved search for the authenticated consumer.
 * Requires x-consumer-id header.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = savedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { nameAr, filters } = parsed.data;

  // Cap: max 10 saved searches per consumer
  const count = await db.savedSearch.count({ where: { consumerId } });
  if (count >= 10) {
    return NextResponse.json(
      {
        success: false,
        message: 'لقد وصلت إلى الحد الأقصى من عمليات البحث المحفوظة (10). يرجى حذف بعضها أولاً.',
      },
      { status: 422 }
    );
  }

  const search = await db.savedSearch.create({
    data: {
      consumerId,
      nameAr: nameAr ?? null,
      filters,
    },
    select: {
      id: true,
      nameAr: true,
      filters: true,
      lastRunAt: true,
      resultCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: search }, { status: 201 });
}
