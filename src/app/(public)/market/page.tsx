import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Building2, BarChart3 } from 'lucide-react';
import type { MarketReportData } from '@/services/market-report';

export const metadata: Metadata = {
  title: 'تقرير سوق العقارات في القاهرة',
  description:
    'أحدث إحصاءات وتحليلات سوق العقارات في القاهرة ومصر. متوسط أسعار البيع والإيجار في جميع المناطق.',
};

export const revalidate = 3600;

async function getMarketReport(): Promise<MarketReportData | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/market/report`,
      {
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as MarketReportData;
  } catch {
    return null;
  }
}

export default async function MarketPage() {
  const report = await getMarketReport();

  const priceChangePositive = (report?.priceChangeCairo6m ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero */}
      <div className="bg-primary-900 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold font-tajawal mb-2">
            تقرير سوق العقارات في القاهرة
          </h1>
          <p className="text-primary-200 font-cairo text-sm">
            {report
              ? new Date().toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                })
              : 'جاري التحميل...'}
          </p>

          {report && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                {
                  label: 'إجمالي العقارات',
                  value: report.totalListings.toLocaleString('ar-EG'),
                  Icon: Building2,
                },
                {
                  label: 'عدد المناطق',
                  value: report.totalDistricts.toString(),
                  Icon: BarChart3,
                },
                {
                  label: 'متوسط سعر المتر — القاهرة',
                  value: `${report.avgPricePerSqmCairo.toLocaleString('ar-EG')} ج.م`,
                  Icon: BarChart3,
                },
                {
                  label: 'تغير الأسعار (6 أشهر)',
                  value: `${priceChangePositive ? '+' : ''}${report.priceChangeCairo6m}%`,
                  Icon: priceChangePositive ? TrendingUp : TrendingDown,
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-primary-800/50 rounded-xl p-4">
                  <p className="text-primary-300 text-xs font-cairo mb-1">{stat.label}</p>
                  <p className="text-xl font-bold font-tajawal">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {report ? (
          <>
            {/* Top gaining districts */}
            <section>
              <h2 className="text-lg font-bold font-tajawal text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-600" />
                أعلى المناطق نمواً
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {report.topGainingDistricts.map((d) => (
                  <Link
                    key={d.district}
                    href={`/district/${encodeURIComponent(d.city)}/${encodeURIComponent(d.district)}`}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition group"
                  >
                    <h3 className="font-semibold font-cairo text-gray-900 group-hover:text-primary-700">
                      {d.district}
                    </h3>
                    <p className="text-xs text-gray-400 font-cairo mt-0.5">{d.city}</p>
                    <div className="mt-3 flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-500 font-cairo">متوسط السعر/م²</p>
                        <p className="font-bold text-primary-800 font-cairo">
                          {d.avgPricePerSqm.toLocaleString('ar-EG')} ج.م
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold font-cairo ${d.priceChange6m >= 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {d.priceChange6m >= 0 ? '+' : ''}
                        {d.priceChange6m.toFixed(1)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Most active districts */}
            <section>
              <h2 className="text-lg font-bold font-tajawal text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary-600" />
                أكثر المناطق نشاطاً
              </h2>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {report.mostActiveDistricts.slice(0, 10).map((d, i) => (
                    <Link
                      key={d.district}
                      href={`/district/${encodeURIComponent(d.city)}/${encodeURIComponent(d.district)}`}
                      className="flex items-center px-5 py-3 hover:bg-gray-50 transition gap-4"
                    >
                      <span className="text-lg font-bold text-gray-300 font-cairo w-6 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold font-cairo text-gray-900 text-sm">
                          {d.district}
                        </p>
                        <p className="text-xs text-gray-400 font-cairo">
                          {d.listingCount} عقار
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary-800 font-cairo">
                          {d.avgPricePerSqm.toLocaleString('ar-EG')} ج.م/م²
                        </p>
                        <p
                          className={`text-xs font-cairo ${d.priceChange6m >= 0 ? 'text-green-600' : 'text-red-500'}`}
                        >
                          {d.priceChange6m >= 0 ? '+' : ''}
                          {d.priceChange6m.toFixed(1)}%
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA to map */}
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center">
              <p className="font-semibold font-tajawal text-primary-900 mb-2">
                استكشف خريطة الأسعار
              </p>
              <p className="text-sm text-primary-700 font-cairo mb-4">
                شاهد توزيع أسعار العقارات على خريطة تفاعلية لجميع مناطق القاهرة
              </p>
              <Link
                href="/map"
                className="inline-block bg-primary-700 text-white px-6 py-2 rounded-xl font-cairo text-sm hover:bg-primary-800 transition"
              >
                فتح خريطة الأسعار
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 font-cairo">لا توجد بيانات متاحة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
}
