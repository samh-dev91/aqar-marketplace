import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Search, ShieldCheck, Zap, TrendingUp, Phone } from 'lucide-react';
import { ListingCard } from '@/components/listing/listing-card';
import type { ListingCard as ListingCardType, SearchResult } from '@/types/listing';

const RecentlyViewedStrip = dynamic(
  () => import('@/components/listing/recently-viewed-strip').then(m => ({ default: m.RecentlyViewedStrip })),
  { ssr: false }
);

const RecommendationsStrip = dynamic(
  () => import('@/components/listing/recommendations-strip').then(m => ({ default: m.RecommendationsStrip })),
  { ssr: false }
);

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'عقار ثرست — أوثق منصة عقارية في مصر',
  description: 'اعثر على عقارك المثالي بكل ثقة. عقارات موثقة، بيانات حقيقية من أنظمة الشركات، بدون إعلانات وهمية.',
  openGraph: {
    title: 'عقار ثرست — أوثق منصة عقارية في مصر',
    description: 'اعثر على عقارك المثالي بكل ثقة. عقارات موثقة، بيانات حقيقية، بدون إعلانات وهمية.',
    type: 'website',
    locale: 'ar_EG',
  },
};

const districts = [
  { nameAr: 'القاهرة الجديدة', count: '١٢٠٠+', gradient: 'from-blue-600 to-blue-800' },
  { nameAr: 'مدينة نصر', count: '٨٥٠+', gradient: 'from-primary-700 to-primary-900' },
  { nameAr: 'المعادي', count: '٦٧٠+', gradient: 'from-teal-600 to-teal-800' },
  { nameAr: 'الزمالك', count: '٣٢٠+', gradient: 'from-amber-600 to-amber-800' },
  { nameAr: 'أكتوبر', count: '٩٤٠+', gradient: 'from-violet-600 to-violet-800' },
  { nameAr: 'الشيخ زايد', count: '٧٨٠+', gradient: 'from-emerald-600 to-emerald-800' },
];

const howItWorksSteps = [
  {
    step: '١',
    titleAr: 'درع الثقة',
    descAr: 'كل عقار يمر بمراجعة وثائق رسمية. درع ذهبي يعني حصرية + توقيع إلكتروني على العقد.',
    icon: ShieldCheck,
    color: 'text-gold bg-amber-50',
  },
  {
    step: '٢',
    titleAr: 'مخزون حي',
    descAr: 'بيانات مباشرة من أنظمة الشركات. عندما يُباع عقار في النظام، يختفي من البحث خلال ثوان.',
    icon: Zap,
    color: 'text-green-600 bg-green-50',
  },
  {
    step: '٣',
    titleAr: 'درع الاستفسار',
    descAr: 'رقمك لا يصل للوسيط إلا بعد موافقتك عبر واتساب. أنت تتحكم في من يتصل بك.',
    icon: Phone,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    step: '٤',
    titleAr: 'درجة عقار',
    descAr: 'تقييم استثماري من ٠ إلى ١٠٠ مستند لبيانات صفقات حقيقية مجهولة المصدر عبر المنصة.',
    icon: TrendingUp,
    color: 'text-primary-700 bg-primary-50',
  },
];

const trustFeatures = [
  {
    titleAr: 'بيانات حقيقية',
    descAr: 'كل إعلان متصل مباشرة بنظام إدارة الشركة العقارية. لا أسعار وهمية، لا صور مكررة.',
    emoji: '🏛️',
  },
  {
    titleAr: 'خصوصيتك محمية',
    descAr: 'لا يرى الوسيط رقمك إلا بعد موافقتك الصريحة. آلية واتساب الأمنية تحميك من المكالمات غير المرغوب فيها.',
    emoji: '🔒',
  },
  {
    titleAr: 'لا توجد عقارات فارغة',
    descAr: 'عندما يُغلق صفقة في نظام الشركة، يختفي العقار من منصتنا تلقائياً خلال دقائق.',
    emoji: '✅',
  },
];

async function getFeaturedListings(): Promise<ListingCardType[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/search?limit=8&sortBy=score`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: ListingCardType[] };
    return json.success ? (json.data ?? []) : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredListings = await getFeaturedListings();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'عقار ثرست',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com',
    description: 'أوثق منصة عقارية في مصر — عقارات موثقة، بيانات حقيقية، بدون إعلانات وهمية.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com'}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'ar',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">
            <ShieldCheck size={16} className="text-amber-300" />
            كل عقار موثق — لا إعلانات وهمية
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4" style={{ fontFamily: 'var(--font-tajawal)' }}>
            اعثر على عقارك المثالي
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            أوثق منصة عقارية في مصر. بيانات حقيقية من أنظمة الشركات، رقمك محمي، ولا عقارات وهمية.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto">
            <form action="/search" method="GET" className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center bg-white rounded-xl overflow-hidden shadow-xl">
                <select
                  name="city"
                  className="border-e border-gray-200 bg-transparent text-gray-700 px-4 py-3.5 text-sm outline-none w-36 flex-shrink-0"
                  dir="rtl"
                  defaultValue=""
                >
                  <option value="">كل المدن</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="القاهرة الجديدة">القاهرة الجديدة</option>
                  <option value="السادس من أكتوبر">أكتوبر</option>
                </select>
                <select
                  name="propertyType"
                  className="border-e border-gray-200 bg-transparent text-gray-700 px-4 py-3.5 text-sm outline-none w-32 flex-shrink-0 hidden sm:block"
                  dir="rtl"
                  defaultValue=""
                >
                  <option value="">كل الأنواع</option>
                  <option value="APARTMENT">شقة</option>
                  <option value="VILLA">فيلا</option>
                  <option value="OFFICE">مكتب</option>
                  <option value="SHOP">محل</option>
                  <option value="LAND">أرض</option>
                </select>
                <input
                  type="text"
                  name="q"
                  placeholder="ابحث بالحي أو العنوان..."
                  className="flex-1 px-4 py-3.5 text-sm outline-none text-gray-700 placeholder:text-gray-400 min-w-0"
                  dir="rtl"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg flex-shrink-0"
              >
                <Search size={18} />
                بحث
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm">
              {['شقق للبيع', 'فيلات', 'للإيجار', 'مكاتب', 'تقسيط'].map((label) => (
                <Link
                  key={label}
                  href={`/search?q=${encodeURIComponent(label)}`}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full transition-colors border border-white/20"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Stats ───────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-100">
            {[
              { value: '٥٠٠٠+', label: 'عقار متاح' },
              { value: '٢٠٠+', label: 'شركة عقارية' },
              { value: '١٠٠٪', label: 'عقارات موثقة' },
            ].map(({ value, label }) => (
              <div key={label} className="py-5 text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-primary-700">{value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings ────────────────────────────────── */}
      {featuredListings.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">عقارات مميزة</h2>
                <p className="text-gray-500 mt-1 text-sm">أعلى تقييمات وأحدث إضافات</p>
              </div>
              <Link
                href="/search?sortBy=score"
                className="text-primary-700 hover:text-primary-900 text-sm font-medium flex items-center gap-1"
              >
                عرض الكل ←
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Personalized Recommendations (client-only) ───────── */}
      <RecentlyViewedStrip />
      <RecommendationsStrip mode="personalized" />

      {/* ── District Showcase ────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">تصفح حسب الحي</h2>
            <p className="text-gray-500 mt-1 text-sm">أشهر المناطق العقارية في مصر</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {districts.map(({ nameAr, count, gradient }) => (
              <Link
                key={nameAr}
                href={`/search?district=${encodeURIComponent(nameAr)}`}
                className={`bg-gradient-to-br ${gradient} text-white rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-sm`}
              >
                <p className="font-bold text-sm leading-snug mb-1">{nameAr}</p>
                <p className="text-white/80 text-xs">{count} عقار</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">كيف يعمل عقار ثرست؟</h2>
            <p className="text-gray-500 mt-1 text-sm max-w-xl mx-auto">
              أربع ميزات فريدة تجعلنا المنصة الأكثر ثقة في مصر
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map(({ step, titleAr, descAr, icon: Icon, color }) => (
              <div key={step} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={22} />
                </div>
                <div className="text-xs font-bold text-gray-400 mb-1">الخطوة {step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{titleAr}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{descAr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">لماذا عقار ثرست؟</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trustFeatures.map(({ titleAr, descAr, emoji }) => (
              <div key={titleAr} className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="font-bold text-gray-900 mb-2">{titleAr}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{descAr}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-md"
            >
              <Search size={18} />
              ابدأ البحث الآن
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
