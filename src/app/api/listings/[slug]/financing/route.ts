import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  const slug = params.slug as string;

  // Fetch listing with financing and project (for hasFinancing flags)
  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      isActive: true,
      hasFinancing: true,
      monthlyFrom: true,
      downPaymentFrom: true,
      installmentMonths: true,
      crmFirmSlug: true,
      financing: {
        select: {
          id: true,
          downPaymentMin: true,
          downPaymentMax: true,
          installmentMonths: true,
          frequency: true,
          monthlyMin: true,
          monthlyMax: true,
          developerName: true,
          notes: true,
        },
      },
      project: {
        select: {
          hasFinancing: true,
          minDownPayment: true,
          maxYears: true,
        },
      },
    },
  });

  if (!listing || !listing.isActive) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  // Fetch developer plans for this firm slug (active only)
  const cacheKey = `devplans:${listing.crmFirmSlug}:all:all`;
  let developerPlans: Array<{
    id: string;
    compound: string | null;
    unitType: string | null;
    downPaymentPct: number;
    years: number;
    monthlyFrom: string;
    bankPartner: string | null;
    validUntil: string | null;
  }> = [];

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      developerPlans = JSON.parse(cached) as typeof developerPlans;
    }
  } catch {
    // Redis unavailable — fetch from DB
  }

  if (developerPlans.length === 0) {
    const now = new Date();
    const plans = await db.developerPlan.findMany({
      where: {
        crmFirmSlug: listing.crmFirmSlug,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
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

    developerPlans = plans.map((p) => ({
      id: p.id,
      compound: p.compound,
      unitType: p.unitType,
      downPaymentPct: p.downPaymentPct,
      years: p.years,
      monthlyFrom: p.monthlyFrom.toString(),
      bankPartner: p.bankPartner,
      validUntil: p.validUntil?.toISOString() ?? null,
    }));

    try {
      await redis.set(cacheKey, JSON.stringify(developerPlans), 'EX', 3600);
    } catch {
      // Redis unavailable — skip caching
    }
  }

  const serializedFinancing = listing.financing
    ? {
        id: listing.financing.id,
        downPaymentMin: listing.financing.downPaymentMin.toString(),
        downPaymentMax: listing.financing.downPaymentMax?.toString() ?? null,
        installmentMonths: listing.financing.installmentMonths,
        frequency: listing.financing.frequency,
        monthlyMin: listing.financing.monthlyMin.toString(),
        monthlyMax: listing.financing.monthlyMax?.toString() ?? null,
        developerName: listing.financing.developerName,
        notes: listing.financing.notes,
      }
    : null;

  const hasAnyFinancing =
    listing.hasFinancing ||
    !!listing.financing ||
    (listing.project?.hasFinancing ?? false) ||
    developerPlans.length > 0;

  return NextResponse.json({
    success: true,
    data: {
      financing: serializedFinancing,
      listingSummary: {
        monthlyFrom: listing.monthlyFrom?.toString() ?? null,
        downPaymentFrom: listing.downPaymentFrom?.toString() ?? null,
        installmentMonths: listing.installmentMonths,
      },
      project: listing.project
        ? {
            hasFinancing: listing.project.hasFinancing,
            minDownPayment: listing.project.minDownPayment,
            maxYears: listing.project.maxYears,
          }
        : null,
      developerPlans,
      hasAnyFinancing,
    },
  });
}
