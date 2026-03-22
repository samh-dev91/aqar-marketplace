import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const revalidate = 86400; // 24 hours

// ── Arabic month names ─────────────────────────────────────────────────────

const ARABIC_MONTHS: Record<string, string> = {
  '1': 'يناير',
  '2': 'فبراير',
  '3': 'مارس',
  '4': 'أبريل',
  '5': 'مايو',
  '6': 'يونيو',
  '7': 'يوليو',
  '8': 'أغسطس',
  '9': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

// ── Types ──────────────────────────────────────────────────────────────────

interface DistrictDataPoint {
  district: string;
  avgPricePerSqm: number;
  listingCount: number;
}

interface MarketIndexData {
  year: number;
  month: number;
  totalListings: number;
  avgPricePerSqm: number;
  monthlyChange: number;
  yearlyChange: number;
  topDistricts: DistrictDataPoint[];
  generatedAt: string;
}

interface PageProps {
  params: { year: string; month: string };
}

// ── Data fetch ─────────────────────────────────────────────────────────────

async function fetchMarketIndex(
  year: string,
  month: string,
): Promise<MarketIndexData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/market/index?year=${year}&month=${month}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: MarketIndexData };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const monthName = ARABIC_MONTHS[params.month] ?? params.month;
  const title = `مؤشر أسعار العقارات في القاهرة ${monthName} ${params.year} | عقار ثرست`;
  const description = `تقرير مؤشر عقار ثرست لشهر ${monthName} ${params.year} — إجمالي الإعلانات، متوسط أسعار المتر، والتغيرات الشهرية والسنوية في جميع أحياء القاهرة.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'ar_EG',
      publishedTime: `${params.year}-${params.month.padStart(2, '0')}-01`,
    },
    alternates: {
      canonical: `/market/index/${params.year}/${params.month}`,
    },
  };
}

// ── Recharts bar chart (client-safe server render) ─────────────────────────
// Recharts needs a client boundary for interactive features but can be rendered
// as a static SVG on the server via a wrapper — we keep it as a server component
// since ResponsiveContainer is fine in Next.js server with Recharts 2.x.

function DistrictBarChart({ data }: { data: DistrictDataPoint[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-64 sm:h-80" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.slice(0, 10)}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }}
          />
          <YAxis
            type="category"
            dataKey="district"
            width={90}
            tick={{ fontSize: 11, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
          />
          <Tooltip
            formatter={(value: number) =>
              [`${Math.round(value).toLocaleString('ar-EG')} ج.م`, 'متوسط السعر/م²']
            }
            contentStyle={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
          />
          <Bar dataKey="avgPricePerSqm" fill="#1B4F72" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Share button (client component inline) ────────────────────────────────
// Using a small inline client component so share logic works in Next.js App Router
// without a separate file (simpler for this use case).

import { ShareIndexButton } from './share-index-button';

// ── Page ───────────────────────────────────────────────────────────────────

export default async function MarketIndexPage({ params }: PageProps) {
  const { year, month } = params;
  const monthName = ARABIC_MONTHS[month] ?? month;
  const data = await fetchMarketIndex(year, month);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `مؤشر أسعار العقارات في القاهرة ${monthName} ${year}`,
    datePublished: `${year}-${month.padStart(2, '0')}-01`,
    dateModified: data?.generatedAt ?? new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'عقار ثرست',
      url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com',
    },
    description: `مؤشر أسعار العقارات في القاهرة لشهر ${monthName} ${year} — إصدار صحفي جاهز من منصة عقار ثرست`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* ── Hero header ─────────────────────────────────────────── */}
        <div className="bg-primary-900 text-white py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-primary-300 text-xs font-cairo mb-1 uppercase tracking-widest">
              مؤشر عقار ثرست
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold font-tajawal mb-1">
              مؤشر أسعار العقارات — {monthName} {year}
            </h1>
            <p className="text-primary-200 font-cairo text-sm">إصدار صحفي جاهز</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {data ? (
            <>
              {/* ── Stat cards ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'إجمالي الإعلانات',
                    value: data.totalListings.toLocaleString('ar-EG'),
                    Icon: Building2,
                    color: 'text-primary-700',
                  },
                  {
                    label: 'متوسط السعر/م²',
                    value: `${Math.round(data.avgPricePerSqm).toLocaleString('ar-EG')} ج.م`,
                    Icon: BarChart3,
                    color: 'text-primary-700',
                  },
                  {
                    label: 'التغير الشهري',
                    value: `${data.monthlyChange >= 0 ? '+' : ''}${data.monthlyChange.toFixed(1)}%`,
                    Icon: data.monthlyChange >= 0 ? TrendingUp : TrendingDown,
                    color: data.monthlyChange >= 0 ? 'text-green-600' : 'text-red-500',
                  },
                  {
                    label: 'التغير السنوي',
                    value: `${data.yearlyChange >= 0 ? '+' : ''}${data.yearlyChange.toFixed(1)}%`,
                    Icon: data.yearlyChange >= 0 ? TrendingUp : TrendingDown,
                    color: data.yearlyChange >= 0 ? 'text-green-600' : 'text-red-500',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                  >
                    <p className="text-gray-500 text-xs font-cairo mb-2">{stat.label}</p>
                    <div className="flex items-end gap-2">
                      <stat.Icon size={18} className={stat.color} />
                      <p className={`text-xl font-bold font-tajawal leading-none ${stat.color}`}>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── District bar chart ───────────────────────────────── */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold font-tajawal text-gray-900 mb-4">
                  أعلى 10 أحياء — متوسط السعر/م²
                </h2>
                <DistrictBarChart data={data.topDistricts} />
              </section>

              {/* ── Actions ─────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-3 items-center">
                <Link
                  href={`/api/market/csv?year=${year}&month=${month}`}
                  className="inline-flex items-center gap-2 bg-primary-700 text-white px-5 py-2.5 rounded-xl font-cairo text-sm hover:bg-primary-800 transition"
                >
                  <Download size={16} />
                  تحميل البيانات (CSV)
                </Link>
                <ShareIndexButton
                  title={`مؤشر أسعار العقارات — ${monthName} ${year}`}
                  text={`متوسط السعر/م² في القاهرة: ${Math.round(data.avgPricePerSqm).toLocaleString('ar-EG')} ج.م — مؤشر عقار ثرست`}
                />
              </div>

              {/* ── Back to market ───────────────────────────────────── */}
              <div className="pt-4 border-t border-gray-100">
                <Link
                  href="/market"
                  className="text-sm font-cairo text-primary-700 hover:underline"
                >
                  ← العودة إلى تقارير السوق
                </Link>
              </div>
            </>
          ) : (
            /* ── No data state ────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <BarChart3 size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="font-semibold font-tajawal text-gray-700 mb-2">
                البيانات غير متاحة لهذه الفترة
              </p>
              <p className="text-sm font-cairo text-gray-500 mb-6">
                لا توجد بيانات مؤشر لشهر {monthName} {year}. يمكنك الاطلاع على الأرشيف.
              </p>
              <Link
                href="/market"
                className="inline-block bg-primary-700 text-white px-5 py-2 rounded-xl font-cairo text-sm hover:bg-primary-800 transition"
              >
                عرض الأرشيف
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
