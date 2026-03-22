import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, MapPin, BarChart2, Clock, Home } from 'lucide-react';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/format';
import { ListingCard } from '@/components/listing/listing-card';
import type { ListingCard as ListingCardType } from '@/types/listing';
import Decimal from 'decimal.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const revalidate = 86400; // 24 hours ISR

interface PageProps {
  params: { city: string; district: string };
}

interface GuideApiResponse {
  success: boolean;
  district: string;
  city: string;
  stats: {
    avgPricePerSqm: string | null;
    activeListings: number;
    priceChange6m: number | null;
    avgDaysOnMarket: number | null;
  };
  topListings: {
    slug: string;
    titleAr: string;
    askingPrice: string | null;
    image: string | null;
    bedrooms: number | null;
    verificationTier: string;
    id?: string;
    titleEn?: string | null;
    propertyType?: string;
    transactionType?: string;
    address?: string;
    district?: string | null;
    city?: string;
    area?: string | null;
    bathrooms?: number | null;
    pricePerSqm?: string | null;
    priceIsHidden?: boolean;
    images?: string[];
    isStale?: boolean;
    lastSyncAt?: string;
    aqarScore?: number | null;
    brokerDisplayName?: string | null;
    firmNameAr?: string;
    firmNameEn?: string | null;
    firmLogoUrl?: string | null;
    hasFinancing?: boolean;
    monthlyFrom?: string | null;
    viewCount?: number;
    favoriteCount?: number;
    isActive?: boolean;
    publishedAt?: string;
  }[];
  lastUpdated: string;
}

export async function generateStaticParams() {
  try {
    const pairs = await db.districtStats.findMany({
      select: { city: true, district: true },
      distinct: ['city', 'district'],
    });
    return pairs.map((p) => ({
      city: encodeURIComponent(p.city),
      district: encodeURIComponent(p.district),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const currentYear = new Date().getFullYear();

  return {
    title: `دليل عقارات ${district} ${currentYear} | عقار ثرست`,
    description: `أسعار العقارات في ${district}، ${city}. متوسط الأسعار، أسرع وقت بيع، وأفضل الإعلانات المتاحة الآن.`,
    alternates: {
      canonical: `/guide/${encodeURIComponent(city)}/${encodeURIComponent(district)}`,
    },
    openGraph: {
      title: `دليل عقارات ${district} ${currentYear} | عقار ثرست`,
      description: `أسعار العقارات في ${district}، ${city}. متوسط الأسعار، أسرع وقت بيع، وأفضل الإعلانات المتاحة الآن.`,
      type: 'article',
      locale: 'ar_EG',
    },
  };
}

async function fetchGuideData(city: string, district: string): Promise<GuideApiResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/guides/${encodeURIComponent(city)}/${encodeURIComponent(district)}`,
      { next: { revalidate: 86400 } }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = (await res.json()) as GuideApiResponse;
    return json.success ? json : null;
  } catch {
    return null;
  }
}

// Minimal listing card type adapter for topListings from API
function toListingCard(l: GuideApiResponse['topListings'][number]): ListingCardType {
  return {
    id: l.id ?? l.slug,
    slug: l.slug,
    titleAr: l.titleAr,
    titleEn: l.titleEn ?? undefined,
    propertyType: l.propertyType ?? 'APARTMENT',
    transactionType: l.transactionType ?? 'SALE',
    address: l.address ?? '',
    district: l.district ?? undefined,
    city: l.city ?? '',
    area: l.area ? Number(l.area) : undefined,
    bedrooms: l.bedrooms ?? undefined,
    bathrooms: l.bathrooms ?? undefined,
    askingPrice: l.askingPrice ?? '0',
    pricePerSqm: l.pricePerSqm ?? undefined,
    priceIsHidden: l.priceIsHidden ?? (l.askingPrice === null),
    images: l.images ?? (l.image ? [l.image] : []),
    verificationTier: l.verificationTier as 'LISTED' | 'VERIFIED' | 'GOLD',
    isStale: l.isStale ?? false,
    lastSyncAt: l.lastSyncAt ?? new Date().toISOString(),
    aqarScore: l.aqarScore ?? undefined,
    brokerDisplayName: l.brokerDisplayName ?? undefined,
    firmNameAr: l.firmNameAr ?? '',
    firmNameEn: l.firmNameEn ?? undefined,
    firmLogoUrl: l.firmLogoUrl ?? undefined,
    hasFinancing: l.hasFinancing ?? false,
    monthlyFrom: l.monthlyFrom ?? undefined,
    viewCount: l.viewCount ?? 0,
    favoriteCount: l.favoriteCount ?? 0,
    isActive: l.isActive ?? true,
    publishedAt: l.publishedAt ?? new Date().toISOString(),
  };
}

export default async function GuideDistrictPage({ params }: PageProps) {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);

  const data = await fetchGuideData(city, district);

  if (!data) {
    notFound();
  }

  const { stats, topListings, lastUpdated } = data;
  const currentYear = new Date().getFullYear();

  const priceChangeNum = stats.priceChange6m;
  const priceChangePositive = priceChangeNum !== null && priceChangeNum > 0;
  const priceChangeNegative = priceChangeNum !== null && priceChangeNum < 0;

  // Chart data: simple bar showing avg price per sqm and 6m trend
  const chartData = [
    {
      name: `6 أشهر مضت`,
      السعر:
        stats.avgPricePerSqm && priceChangeNum !== null
          ? parseFloat(
              new Decimal(stats.avgPricePerSqm)
                .div(new Decimal(1).plus(new Decimal(priceChangeNum).div(100)))
                .toFixed(0)
            )
          : Number(stats.avgPricePerSqm ?? 0),
    },
    {
      name: `الآن`,
      السعر: Number(stats.avgPricePerSqm ?? 0),
    },
  ];

  // FAQ auto-answers from stats
  const avgPrice = stats.avgPricePerSqm
    ? `${formatPrice(stats.avgPricePerSqm)} جنيه للمتر المربع`
    : 'غير متاح حالياً';
  const daysAnswer =
    stats.avgDaysOnMarket != null
      ? `يستغرق بيع العقار في ${district} في المتوسط ${stats.avgDaysOnMarket} يوماً.`
      : `لا تتوفر بيانات كافية عن وقت البيع في ${district} حالياً.`;
  const investmentAnswer =
    priceChangeNum !== null
      ? priceChangeNum > 0
        ? `نعم، شهدت ${district} ارتفاعاً في الأسعار بنسبة ${priceChangeNum.toFixed(1)}% خلال الستة أشهر الأخيرة، مما يجعلها منطقة واعدة للاستثمار.`
        : `شهدت ${district} انخفاضاً في الأسعار بنسبة ${Math.abs(priceChangeNum).toFixed(1)}% خلال الستة أشهر الأخيرة. يُنصح بالدراسة المتأنية قبل الاستثمار.`
      : `لا تتوفر بيانات كافية لتقييم جدوى الاستثمار في ${district} حالياً.`;

  // JSON-LD structured data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `دليل عقارات ${district} ${currentYear}`,
    dateModified: lastUpdated,
    publisher: {
      '@type': 'Organization',
      name: 'عقار ثرست',
      url: appUrl,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: appUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'أدلة الأحياء',
        item: `${appUrl}/guide`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city,
        item: `${appUrl}/guide?city=${encodeURIComponent(city)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: district,
        item: `${appUrl}/guide/${encodeURIComponent(city)}/${encodeURIComponent(district)}`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `ما متوسط سعر العقار في ${district}؟`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `متوسط سعر المتر المربع في ${district} هو ${avgPrice}.`,
        },
      },
      {
        '@type': 'Question',
        name: `كم يستغرق بيع عقار في ${district}؟`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: daysAnswer,
        },
      },
      {
        '@type': 'Question',
        name: `هل ${district} مناسب للاستثمار؟`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: investmentAnswer,
        },
      },
    ],
  };

  const listingCards = topListings.map(toListingCard);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <nav className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap" aria-label="breadcrumb">
          <Link href="/" className="hover:text-primary-700 transition-colors">الرئيسية</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-primary-700 transition-colors">أدلة الأحياء</Link>
          <span>/</span>
          <Link
            href={`/guide?city=${encodeURIComponent(city)}`}
            className="hover:text-primary-700 transition-colors"
          >
            {city}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{district}</span>
        </nav>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-primary-900 to-primary-700 text-white rounded-2xl px-6 py-10 sm:px-10">
          <div className="flex items-start gap-2 mb-2">
            <MapPin size={22} className="mt-1 flex-shrink-0 text-white/70" />
            <div>
              <p className="text-white/70 text-sm">{city}</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                دليل عقارات {district}
              </h1>
            </div>
          </div>
          <p className="text-white/80 text-sm mt-3 max-w-xl">
            بيانات السوق العقاري في {district}، {city} — محدّثة تلقائياً من صفقات حقيقية.
          </p>
        </section>

        {/* ── Stats row (4 cards) ─────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Avg price per sqm */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart2 size={18} className="text-primary-700" />
              </div>
              <p className="text-xs text-gray-500 mb-1">متوسط السعر/م²</p>
              {stats.avgPricePerSqm ? (
                <p className="text-xl font-bold text-primary-700 leading-tight">
                  {formatPrice(stats.avgPricePerSqm)}
                  <span className="text-xs font-normal text-gray-400 block">جنيه</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>

            {/* Total listings */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <Home size={18} className="text-primary-700" />
              </div>
              <p className="text-xs text-gray-500 mb-1">إجمالي الإعلانات</p>
              <p className="text-2xl font-bold text-primary-700">
                {stats.activeListings.toLocaleString('ar-EG')}
              </p>
            </div>

            {/* Price change 6m */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                {priceChangePositive ? (
                  <TrendingUp size={18} className="text-emerald-600" />
                ) : priceChangeNegative ? (
                  <TrendingDown size={18} className="text-red-500" />
                ) : (
                  <Minus size={18} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mb-1">التغير خلال 6 أشهر</p>
              {priceChangeNum !== null ? (
                <p
                  className={`text-xl font-bold leading-tight ${
                    priceChangePositive
                      ? 'text-emerald-600'
                      : priceChangeNegative
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}
                >
                  {priceChangeNum > 0 ? '+' : ''}
                  {priceChangeNum.toFixed(1)}%
                </p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>

            {/* Avg days on market */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock size={18} className="text-primary-700" />
              </div>
              <p className="text-xs text-gray-500 mb-1">متوسط أيام البيع</p>
              {stats.avgDaysOnMarket != null ? (
                <p className="text-2xl font-bold text-primary-700">
                  {stats.avgDaysOnMarket.toLocaleString('ar-EG')}
                  <span className="text-xs font-normal text-gray-400 block">يوم</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Price trend chart ───────────────────────────────── */}
        {stats.avgPricePerSqm && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">اتجاه الأسعار في {district}</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString('ar-EG')} جنيه/م²`, 'متوسط السعر']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="السعر" fill="#1B4F72" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Top listings ────────────────────────────────────── */}
        {listingCards.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">أفضل العقارات المتاحة في {district}</h2>
              <Link
                href={`/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`}
                className="text-primary-700 hover:text-primary-900 text-sm font-medium"
              >
                عرض الكل ←
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listingCards.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        )}

        {/* ── FAQ section ─────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">أسئلة شائعة عن عقارات {district}</h2>
          <div className="space-y-4">
            <details className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                ما متوسط سعر العقار في {district}؟
                <span className="text-primary-700 text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                متوسط سعر المتر المربع في {district} هو {avgPrice}.
                {stats.activeListings > 0 && (
                  <> يوجد حالياً {stats.activeListings.toLocaleString('ar-EG')} إعلان متاح في المنطقة.</>
                )}
              </div>
            </details>

            <details className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                كم يستغرق بيع عقار في {district}؟
                <span className="text-primary-700 text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                {daysAnswer}
              </div>
            </details>

            <details className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                هل {district} مناسب للاستثمار؟
                <span className="text-primary-700 text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                {investmentAnswer}
              </div>
            </details>
          </div>
        </section>

        {/* ── Internal link back to search ────────────────────── */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            ← العودة لنتائج البحث في {district}
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:border-primary-700 hover:text-primary-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm"
          >
            تصفح أدلة الأحياء
          </Link>
        </div>
      </div>
    </>
  );
}
