import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const firmSlug = searchParams.get('firmSlug');
  const compound = searchParams.get('compound') ?? undefined;
  const unitType = searchParams.get('unitType') ?? undefined;

  if (!firmSlug) {
    return NextResponse.json(
      { success: false, message: 'firmSlug is required' },
      { status: 400 }
    );
  }

  const cacheKey = `devplans:${firmSlug}:${compound ?? 'all'}:${unitType ?? 'all'}`;

  // Try Redis cache first (1h TTL)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached) as unknown[];
      return NextResponse.json({ success: true, data });
    }
  } catch {
    // Redis unavailable — continue to DB
  }

  const now = new Date();

  const plans = await db.developerPlan.findMany({
    where: {
      crmFirmSlug: firmSlug,
      ...(compound ? { compound } : {}),
      ...(unitType ? { unitType } : {}),
      OR: [
        { validUntil: null },
        { validUntil: { gte: now } },
      ],
    },
    select: {
      id: true,
      compound: true,
      unitType: true,
      downPaymentPct: true,
      years: true,
      monthlyFrom: true,
      bankPartner: true,
      validUntil: true,
    },
    orderBy: { downPaymentPct: 'asc' },
  });

  const data = plans.map((p) => ({
    id: p.id,
    compound: p.compound,
    unitType: p.unitType,
    downPaymentPct: p.downPaymentPct,
    years: p.years,
    monthlyFrom: p.monthlyFrom.toString(),
    bankPartner: p.bankPartner,
    validUntil: p.validUntil?.toISOString() ?? null,
  }));

  // Cache for 1 hour
  try {
    await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);
  } catch {
    // Redis unavailable — skip caching
  }

  return NextResponse.json({ success: true, data });
}
