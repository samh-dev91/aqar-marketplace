import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/format';

export const revalidate = 86400; // 24 hours ISR

export const metadata: Metadata = {
  title: 'أدلة الأحياء العقارية | عقار ثرست',
  description: 'استكشف أسعار العقارات وإحصاءات السوق في كل حي. بيانات حقيقية من صفقات موثقة.',
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: 'أدلة الأحياء العقارية | عقار ثرست',
    description: 'استكشف أسعار العقارات وإحصاءات السوق في كل حي. بيانات حقيقية من صفقات موثقة.',
    type: 'website',
    locale: 'ar_EG',
  },
};

interface DistrictEntry {
  city: string;
  district: string;
  avgPricePerSqm: string | null;
  listingCount: number;
  priceChange6m: string | null;
}

async function fetchAllDistricts(): Promise<DistrictEntry[]> {
  try {
    const rows = await db.districtStats.findMany({
      select: {
        city: true,
        district: true,
        avgPricePerSqm: true,
        listingCount: true,
        priceChange6m: true,
        propertyType: true,
        transactionType: true,
      },
    });

    // De-duplicate by (city, district) keeping the APARTMENT+SALE row as primary,
    // falling back to any row. Aggregate listing counts.
    const map = new Map<
      string,
      {
        city: string;
        district: string;
        avgPricePerSqm: string | null;
        listingCount: number;
        priceChange6m: string | null;
        isPrimary: boolean;
      }
    >();

    for (const row of rows) {
      const key = `${row.city}|${row.district}`;
      const isPrimary = row.propertyType === 'APARTMENT' && row.transactionType === 'SALE';
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          city: row.city,
          district: row.district,
          avgPricePerSqm: row.avgPricePerSqm.toString(),
          listingCount: row.listingCount,
          priceChange6m: row.priceChange6m.toString(),
          isPrimary,
        });
      } else {
        // Accumulate listing count
        const updatedCount = existing.listingCount + row.listingCount;
        map.set(key, {
          ...existing,
          listingCount: updatedCount,
          // Prefer primary stats for avg price
          avgPricePerSqm:
            isPrimary && !existing.isPrimary
              ? row.avgPricePerSqm.toString()
              : existing.avgPricePerSqm,
          priceChange6m:
            isPrimary && !existing.isPrimary
              ? row.priceChange6m.toString()
              : existing.priceChange6m,
          isPrimary: existing.isPrimary || isPrimary,
        });
      }
    }

    return Array.from(map.values()).map((d) => ({
      city: d.city,
      district: d.district,
      avgPricePerSqm: d.avgPricePerSqm,
      listingCount: d.listingCount,
      priceChange6m: d.priceChange6m,
    }));
  } catch {
    return [];
  }
}

export default async function GuidesIndexPage() {
  const districts = await fetchAllDistricts();

  // Group by city
  const byCityMap = new Map<string, DistrictEntry[]>();
  for (const d of districts) {
    const list = byCityMap.get(d.city) ?? [];
    list.push(d);
    byCityMap.set(d.city, list);
  }

  // Sort districts within each city by listing count desc
  for (const [city, list] of byCityMap.entries()) {
    byCityMap.set(
      city,
      list.sort((a, b) => b.listingCount - a.listingCount)
    );
  }

  // Sort cities by total listing count desc
  const sortedCities = Array.from(byCityMap.entries()).sort(
    ([, a], [, b]) =>
      b.reduce((sum, d) => sum + d.listingCount, 0) -
      a.reduce((sum, d) => sum + d.listingCount, 0)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1.5" aria-label="breadcrumb">
        <Link href="/" className="hover:text-primary-700 transition-colors">الرئيسية</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">أدلة الأحياء</span>
      </nav>

      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          أدلة الأحياء العقارية
        </h1>
        <p className="text-gray-500 text-base max-w-xl mx-auto">
          اكتشف أسعار العقارات وتوجهات السوق في كل حي — بيانات مستخلصة من صفقات موثقة فعلية.
        </p>
      </section>

      {/* No data state */}
      {sortedCities.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">لا توجد بيانات كافية لهذه المنطقة</p>
        </div>
      )}

      {/* Cities + districts grid */}
      {sortedCities.map(([city, cityDistricts]) => (
        <section key={city}>
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={18} className="text-primary-700 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-900">{city}</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {cityDistricts.length} حي
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityDistricts.map((d) => {
              const priceChange = d.priceChange6m ? parseFloat(d.priceChange6m) : null;
              const isPositive = priceChange !== null && priceChange > 0;
              const isNegative = priceChange !== null && priceChange < 0;

              return (
                <Link
                  key={`${d.city}|${d.district}`}
                  href={`/guide/${encodeURIComponent(d.city)}/${encodeURIComponent(d.district)}`}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                      {d.district}
                    </h3>
                    {priceChange !== null && (
                      <span
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700'
                            : isNegative
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp size={11} />
                        ) : isNegative ? (
                          <TrendingDown size={11} />
                        ) : (
                          <Minus size={11} />
                        )}
                        {priceChange > 0 ? '+' : ''}
                        {priceChange.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {d.avgPricePerSqm && (
                    <p className="text-primary-700 font-bold text-lg leading-tight mb-1">
                      {formatPrice(d.avgPricePerSqm)}
                      <span className="text-xs font-normal text-gray-400"> جنيه/م²</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    {d.listingCount.toLocaleString('ar-EG')} إعلان متاح
                  </p>

                  <div className="mt-3 text-xs text-primary-700 font-medium group-hover:underline">
                    عرض الدليل ←
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="text-center py-6 border-t border-gray-100">
        <p className="text-gray-600 text-sm mb-4">لا تجد حيّك؟ ابحث في كل الإعلانات المتاحة</p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          ابحث عن عقار
        </Link>
      </section>
    </div>
  );
}
