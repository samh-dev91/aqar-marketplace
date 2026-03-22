import { db } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DistrictReportEntry {
  district: string;
  city: string;
  avgPricePerSqm: number;
  medianPrice: number;
  listingCount: number;
  priceChange6m: number;
  topPropertyType: string;
}

export interface MarketReportData {
  period: string; // "2026-03"
  generatedAt: string;
  totalListings: number;
  totalDistricts: number;
  avgPricePerSqmCairo: number;
  priceChangeCairo6m: number;
  topGainingDistricts: DistrictReportEntry[];
  fastestSellingDistricts: DistrictReportEntry[];
  mostActiveDistricts: DistrictReportEntry[];
  districts: DistrictReportEntry[];
}

// Internal shape that carries per-type counts for aggregation
interface DistrictAccumulator extends DistrictReportEntry {
  types: Record<string, number>;
}

// ─── generateMarketReport ────────────────────────────────────────────────────

export async function generateMarketReport(period?: string): Promise<MarketReportData> {
  const now = new Date();
  const reportPeriod =
    period ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fetch all district stats rows
  const allStats = await db.districtStats.findMany({
    select: {
      district: true,
      city: true,
      propertyType: true,
      avgPricePerSqm: true,
      medianPrice: true,
      listingCount: true,
      priceChange6m: true,
    },
    orderBy: { listingCount: 'desc' },
  });

  // Aggregate across property types — group by (city, district)
  const districtMap = new Map<string, DistrictAccumulator>();

  for (const s of allStats) {
    const key = `${s.city}|${s.district}`;
    const price = Number(s.avgPricePerSqm ?? 0);
    const median = Number(s.medianPrice ?? 0);
    const change = Number(s.priceChange6m ?? 0);
    const count = s.listingCount ?? 0;

    const existing = districtMap.get(key);

    if (!existing) {
      districtMap.set(key, {
        district: s.district,
        city: s.city,
        avgPricePerSqm: price,
        medianPrice: median,
        listingCount: count,
        priceChange6m: change,
        topPropertyType: s.propertyType,
        types: { [s.propertyType]: count },
      });
    } else {
      existing.types[s.propertyType] = (existing.types[s.propertyType] ?? 0) + count;
      // Running average across property types
      existing.avgPricePerSqm = (existing.avgPricePerSqm + price) / 2;
      existing.medianPrice = (existing.medianPrice + median) / 2;
      existing.listingCount += count;
      existing.priceChange6m = (existing.priceChange6m + change) / 2;
      // Determine the most common property type
      const top = Object.entries(existing.types).sort((a, b) => b[1] - a[1])[0];
      if (top) existing.topPropertyType = top[0];
    }
  }

  // Strip internal `types` field before returning
  const districts: DistrictReportEntry[] = [...districtMap.values()].map(
    ({ types: _types, ...entry }) => entry,
  );

  const totalListings = districts.reduce((sum, d) => sum + d.listingCount, 0);

  // Cairo-wide summary
  const cairoDistricts = districts.filter(
    (d) => d.city === 'القاهرة' || d.city === 'Cairo',
  );

  const avgPricePerSqmCairo =
    cairoDistricts.length > 0
      ? cairoDistricts.reduce((sum, d) => sum + d.avgPricePerSqm, 0) /
        cairoDistricts.length
      : 0;

  const priceChangeCairo6m =
    cairoDistricts.length > 0
      ? cairoDistricts.reduce((sum, d) => sum + d.priceChange6m, 0) /
        cairoDistricts.length
      : 0;

  const sorted = [...districts].sort((a, b) => b.listingCount - a.listingCount);

  return {
    period: reportPeriod,
    generatedAt: now.toISOString(),
    totalListings,
    totalDistricts: districts.length,
    avgPricePerSqmCairo: Math.round(avgPricePerSqmCairo),
    priceChangeCairo6m: Math.round(priceChangeCairo6m * 10) / 10,
    topGainingDistricts: [...districts]
      .sort((a, b) => b.priceChange6m - a.priceChange6m)
      .slice(0, 5),
    fastestSellingDistricts: sorted.slice(0, 5),
    mostActiveDistricts: sorted.slice(0, 10),
    districts: sorted,
  };
}

// ─── saveMarketReport ────────────────────────────────────────────────────────

/**
 * Persists a human-readable summary record in the MarketReport table.
 *
 * The MarketReport model in this project is an editorial/CMS model
 * (titleAr, bodyAr, isPublished …) rather than a raw-data store, so we insert
 * a new record each time.  The full JSON payload lives in Redis; this record
 * exists for SEO / editorial pages that want to surface market reports.
 *
 * Errors are silently swallowed so callers are never blocked if the model
 * schema drifts.
 */
export async function saveMarketReport(data: MarketReportData): Promise<void> {
  const titleAr = `تقرير السوق العقاري — ${data.period}`;
  const titleEn = `Market Report — ${data.period}`;
  const bodyAr =
    `إجمالي القوائم: ${data.totalListings} | الأحياء: ${data.totalDistricts} | ` +
    `متوسط سعر المتر في القاهرة: ${data.avgPricePerSqmCairo.toLocaleString('ar-EG')} ج.م | ` +
    `تغير الأسعار 6 أشهر: ${data.priceChangeCairo6m}%`;

  try {
    await db.marketReport.create({
      data: {
        titleAr,
        titleEn,
        period: data.period,
        periodType: 'MONTHLY',
        bodyAr,
        isPublished: false,
      },
    });
  } catch {
    // MarketReport schema mismatch or duplicate — non-fatal
  }
}
