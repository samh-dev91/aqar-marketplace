import Decimal from 'decimal.js';
import { db } from '@/lib/db';

export interface ComparableTransaction {
  district: string;
  propertyType: string;
  area: string;         // Decimal string
  price: string;        // Decimal string
  pricePerSqm: string;  // Decimal string
  daysSinceSync: number;
}

export interface EstimateResult {
  estimate: string;       // Decimal string e.g. "2300000"
  rangeLow: string;       // estimate × 0.92
  rangeHigh: string;      // estimate × 1.08
  confidence: 'high' | 'medium' | 'low';
  comparables: ComparableTransaction[];
  methodology: string;    // Arabic explanation
  yieldPct?: string;      // if rental estimates available
}

interface ComputeEstimateParams {
  city: string;
  district: string;
  propertyType: string;
  area: number;           // sqm
  bedrooms?: number;
  floor?: number;
  isFurnished?: boolean;
}

export async function computeEstimate(
  params: ComputeEstimateParams
): Promise<EstimateResult | null> {
  const { city, district, propertyType, area, floor, isFurnished } = params;

  const areaDecimal = new Decimal(area);
  const areaMin = areaDecimal.mul(0.7).toDecimalPlaces(2);
  const areaMax = areaDecimal.mul(1.3).toDecimalPlaces(2);

  // 1. Find comparable listings: same city + district + propertyType, area ±30%, isActive=true
  const rawComparables = await db.listing.findMany({
    where: {
      city,
      district,
      propertyType,
      isActive: true,
      area: {
        gte: areaMin.toNumber(),
        lte: areaMax.toNumber(),
      },
      pricePerSqm: { not: null },
    },
    select: {
      area: true,
      askingPrice: true,
      pricePerSqm: true,
      lastSyncAt: true,
      bedrooms: true,
      floor: true,
      isFurnished: true,
    },
    orderBy: { lastSyncAt: 'desc' },
    take: 20,
  });

  // Filter out records where area or pricePerSqm is null (TypeScript guard)
  const validComparables = rawComparables.filter(
    (c): c is typeof c & { area: NonNullable<typeof c.area>; pricePerSqm: NonNullable<typeof c.pricePerSqm> } =>
      c.area !== null && c.pricePerSqm !== null
  );

  // 2. Return null if fewer than 3 comparables
  if (validComparables.length < 3) {
    return null;
  }

  const now = Date.now();

  // 2. Compute weighted average price/sqm (weight = 1 / (daysSinceSync + 1))
  let weightedSum = new Decimal(0);
  let weightTotal = new Decimal(0);

  const comparableTransactions: ComparableTransaction[] = [];

  for (const comp of validComparables) {
    const daysSinceSync = Math.max(
      0,
      Math.floor((now - comp.lastSyncAt.getTime()) / 86_400_000)
    );
    const weight = new Decimal(1).div(new Decimal(daysSinceSync).plus(1));
    const ppsm = new Decimal(comp.pricePerSqm.toString());

    weightedSum = weightedSum.plus(ppsm.mul(weight));
    weightTotal = weightTotal.plus(weight);

    comparableTransactions.push({
      district,
      propertyType,
      area: comp.area.toString(),
      price: comp.askingPrice.toString(),
      pricePerSqm: comp.pricePerSqm.toString(),
      daysSinceSync,
    });
  }

  const weightedPricePerSqm = weightedSum.div(weightTotal);

  // 3. Adjustments (multiplicative)
  let adjustmentFactor = new Decimal(1);

  // Floor premium
  if (floor !== undefined && floor !== null) {
    if (floor >= 8) {
      adjustmentFactor = adjustmentFactor.mul(new Decimal('1.06'));
    } else if (floor >= 4) {
      adjustmentFactor = adjustmentFactor.mul(new Decimal('1.03'));
    }
    // floor 1-3: ×1.0 (no change)
  }

  // Furnished bonus
  if (isFurnished === true) {
    adjustmentFactor = adjustmentFactor.mul(new Decimal('1.08'));
  }

  // 4. Base estimate
  let estimate = weightedPricePerSqm.mul(new Decimal(area)).mul(adjustmentFactor);

  // 5. Price trend from DistrictStats
  const districtStats = await db.districtStats.findFirst({
    where: { city, district, propertyType },
    select: { priceChange6m: true, avgPricePerSqm: true },
  });

  if (districtStats) {
    const trendMultiplier = new Decimal(1).plus(
      new Decimal(districtStats.priceChange6m.toString()).div(100).div(2)
    );
    estimate = estimate.mul(trendMultiplier);
  }

  estimate = estimate.toDecimalPlaces(0);

  // 6. Confidence
  const count = validComparables.length;
  let confidence: 'high' | 'medium' | 'low';
  if (count >= 10) {
    confidence = 'high';
  } else if (count >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const rangeLow = estimate.mul(new Decimal('0.92')).toDecimalPlaces(0);
  const rangeHigh = estimate.mul(new Decimal('1.08')).toDecimalPlaces(0);

  // 7. Methodology string (Arabic)
  const avgPpsmDisplay = weightedPricePerSqm.toDecimalPlaces(0).toString();
  const methodology = `بناءً على ${count} عقار مشابه في ${district}، متوسط السعر ${avgPpsmDisplay} جنيه/م². تقدير معدَّل بعوامل الطابق والتشطيب.`;

  // 8. Rental yield (optional) — estimate from RENT comparables
  let yieldPct: string | undefined;
  try {
    const rentComparables = await db.listing.findMany({
      where: {
        city,
        district,
        propertyType,
        transactionType: 'RENT',
        isActive: true,
        area: {
          gte: areaMin.toNumber(),
          lte: areaMax.toNumber(),
        },
      },
      select: { askingPrice: true },
      take: 20,
    });

    if (rentComparables.length >= 3) {
      let rentSum = new Decimal(0);
      for (const r of rentComparables) {
        rentSum = rentSum.plus(new Decimal(r.askingPrice.toString()));
      }
      const avgMonthlyRent = rentSum.div(rentComparables.length);
      const annualRent = avgMonthlyRent.mul(12);
      yieldPct = annualRent.div(estimate).mul(100).toDecimalPlaces(1).toString();
    }
  } catch {
    // Rental yield is optional — silently skip on error
  }

  return {
    estimate: estimate.toString(),
    rangeLow: rangeLow.toString(),
    rangeHigh: rangeHigh.toString(),
    confidence,
    comparables: comparableTransactions,
    methodology,
    ...(yieldPct !== undefined ? { yieldPct } : {}),
  };
}
