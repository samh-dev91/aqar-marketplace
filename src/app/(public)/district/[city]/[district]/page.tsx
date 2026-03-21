import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/format';
import { ListingCard } from '@/components/listing/listing-card';
import type { ListingCard as ListingCardType } from '@/types/listing';
import Decimal from 'decimal.js';

export const revalidate = 60;

interface PageProps {
  params: { city: string; district: string };
}

// Map DB Listing row to ListingCard interface
function toListingCard(l: DbListing): ListingCardType {
  return {
    id: l.id,
    slug: l.slug,
    titleAr: l.titleAr,
    titleEn: l.titleEn ?? undefined,
    propertyType: l.propertyType,
    transactionType: l.transactionType,
    address: l.address,
    district: l.district ?? undefined,
    city: l.city,
    area: l.area ? Number(l.area) : undefined,
    bedrooms: l.bedrooms ?? undefined,
    bathrooms: l.bathrooms ?? undefined,
    askingPrice: l.askingPrice.toString(),
    pricePerSqm: l.pricePerSqm ? l.pricePerSqm.toString() : undefined,
    priceIsHidden: l.priceIsHidden,
    images: l.images,
    verificationTier: l.verificationTier as 'LISTED' | 'VERIFIED' | 'GOLD',
    isStale: l.isStale,
    lastSyncAt: l.lastSyncAt.toISOString(),
    aqarScore: l.aqarScore ?? undefined,
    brokerDisplayName: l.brokerDisplayName ?? undefined,
    firmNameAr: l.firmNameAr,
    firmNameEn: l.firmNameEn ?? undefined,
    firmLogoUrl: l.firmLogoUrl ?? undefined,
    hasFinancing: l.hasFinancing,
    monthlyFrom: l.monthlyFrom ? l.monthlyFrom.toString() : undefined,
    viewCount: l.viewCount,
    favoriteCount: l.favoriteCount,
    isActive: l.isActive,
    publishedAt: l.publishedAt.toISOString(),
  };
}

interface DbListing {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  propertyType: string;
  transactionType: string;
  address: string;
  district: string | null;
  city: string;
  area: Decimal | null;
  bedrooms: number | null;
  bathrooms: number | null;
  askingPrice: Decimal;
  pricePerSqm: Decimal | null;
  priceIsHidden: boolean;
  images: string[];
  verificationTier: string;
  isStale: boolean;
  lastSyncAt: Date;
  aqarScore: number | null;
  brokerDisplayName: string | null;
  firmNameAr: string;
  firmNameEn: string | null;
  firmLogoUrl: string | null;
  hasFinancing: boolean;
  monthlyFrom: Decimal | null;
  viewCount: number;
  favoriteCount: number;
  isActive: boolean;
  publishedAt: Date;
}

interface NormalizedDistrictStat {
  city: string;
  district: string;
  propertyType: string;
  transactionType: string;
  listingCount: number;
  avgPricePerSqm: Decimal;
  medianPrice: Decimal;
  priceChange6m: Decimal;
  avgDaysOnMarket: number;
}

interface DistrictData {
  stats: NormalizedDistrictStat[];
  listings: DbListing[];
  minPrice: Decimal | null;
  maxPrice: Decimal | null;
}

async function fetchDistrictData(city: string, district: string): Promise<DistrictData | null> {
  const [stats, listings] = await Promise.all([
    db.districtStats.findMany({
      where: { city, district },
      select: {
        city: true,
        district: true,
        propertyType: true,
        transactionType: true,
        listingCount: true,
        avgPricePerSqm: true,
        medianPrice: true,
        priceChange6m: true,
        avgDaysOnMarket: true,
      },
    }),
    db.listing.findMany({
      where: { city, district, isActive: true },
      orderBy: [{ aqarScore: 'desc' }, { publishedAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        slug: true,
        titleAr: true,
        titleEn: true,
        propertyType: true,
        transactionType: true,
        address: true,
        district: true,
        city: true,
        area: true,
        bedrooms: true,
        bathrooms: true,
        askingPrice: true,
        pricePerSqm: true,
        priceIsHidden: true,
        images: true,
        verificationTier: true,
        isStale: true,
        lastSyncAt: true,
        aqarScore: true,
        brokerDisplayName: true,
        firmNameAr: true,
        firmNameEn: true,
        firmLogoUrl: true,
        hasFinancing: true,
        monthlyFrom: true,
        viewCount: true,
        favoriteCount: true,
        isActive: true,
        publishedAt: true,
      },
    }),
  ]);

  if (stats.length === 0 && listings.length === 0) return null;

  // Normalize nullable DB fields
  const normalizedStats: NormalizedDistrictStat[] = stats.map((s) => ({
    ...s,
    priceChange6m: s.priceChange6m ?? new Decimal(0),
    avgDaysOnMarket: s.avgDaysOnMarket ?? 0,
  }));

  // Derive min/max from live listings
  let minPrice: Decimal | null = null;
  let maxPrice: Decimal | null = null;
  for (const l of listings) {
    if (!l.priceIsHidden) {
      if (minPrice === null || l.askingPrice.lt(minPrice)) minPrice = l.askingPrice;
      if (maxPrice === null || l.askingPrice.gt(maxPrice)) maxPrice = l.askingPrice;
    }
  }

  return { stats: normalizedStats, listings, minPrice, maxPrice };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const title = `عقارات ${district}، ${city} | عقار ثرست`;
  const description = `تصفح العقارات المتاحة في ${district}، ${city}. إحصاءات السوق، متوسط الأسعار، وأفضل العقارات الموثقة.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ar_EG',
    },
  };
}

export default async function DistrictPage({ params }: PageProps) {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);

  const data = await fetchDistrictData(city, district);

  // Breadcrumb — always shown
  const breadcrumb = (
    <nav className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap" aria-label="breadcrumb">
      <Link href="/" className="hover:text-primary-700 transition-colors">الرئيسية</Link>
      <span>/</span>
      <Link href="/search" className="hover:text-primary-700 transition-colors">المناطق</Link>
      <span>/</span>
      <Link href={`/search?city=${encodeURIComponent(city)}`} className="hover:text-primary-700 transition-colors">{city}</Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">{district}</span>
    </nav>
  );

  // No data state
  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {breadcrumb}
        <div className="mt-10 text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{district}</h1>
          <p className="text-gray-500 mb-6">لا توجد إحصاءات كافية لهذه المنطقة حالياً.</p>
          <Link
            href={`/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            بحث في {district}
          </Link>
        </div>
      </div>
    );
  }

  const { stats, listings, minPrice, maxPrice } = data;

  // Use APARTMENT+SALE as the primary stat set; fallback to first available
  const primaryStats =
    stats.find((s) => s.propertyType === 'APARTMENT' && s.transactionType === 'SALE') ??
    stats[0] ??
    null;

  // Aggregate totals across all property types for the hero
  const totalListings = stats.reduce((sum, s) => sum + s.listingCount, 0) || listings.length;

  const priceChangePercent = primaryStats?.priceChange6m.toNumber() ?? null;
  const priceChangePositive = priceChangePercent !== null && priceChangePercent > 0;
  const priceChangeNegative = priceChangePercent !== null && priceChangePercent < 0;

  const listingCards = listings.map(toListingCard);

  const propertyTypeLabels: Record<string, string> = {
    APARTMENT: 'شقق',
    VILLA: 'فيلات',
    OFFICE: 'مكاتب',
    SHOP: 'محلات',
    LAND: 'أراضي',
  };

  const availableTypes = [...new Set(stats.map((s) => s.propertyType))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {breadcrumb}

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-700 text-white rounded-2xl px-6 py-10 sm:px-10">
        <div className="flex items-start gap-2 mb-2">
          <MapPin size={22} className="mt-1 flex-shrink-0 text-white/70" />
          <div>
            <p className="text-white/70 text-sm">{city}</p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{district}</h1>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
            {totalListings.toLocaleString('ar-EG')} عقار متاح
          </span>
          {primaryStats && !primaryStats.avgPricePerSqm.isZero() && (
            <span className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
              متوسط سعر المتر: {formatPrice(primaryStats.avgPricePerSqm)} جنيه
            </span>
          )}
          {priceChangePercent !== null && (
            <span className={`backdrop-blur-sm border rounded-full px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 ${
              priceChangePositive
                ? 'bg-emerald-500/20 border-emerald-400/30'
                : priceChangeNegative
                ? 'bg-red-500/20 border-red-400/30'
                : 'bg-white/15 border-white/20'
            }`}>
              {priceChangePositive && <TrendingUp size={14} />}
              {priceChangeNegative && <TrendingDown size={14} />}
              {!priceChangePositive && !priceChangeNegative && <Minus size={14} />}
              نسبة التغير: {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
            </span>
          )}
        </div>
      </section>

      {/* ── Stats cards ─────────────────────────────────────── */}
      {primaryStats && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">إحصاءات السوق</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">عدد العقارات</p>
              <p className="text-2xl font-bold text-primary-700">
                {primaryStats.listingCount.toLocaleString('ar-EG')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">متوسط السعر</p>
              <p className="text-xl font-bold text-primary-700 leading-tight">
                {formatPrice(primaryStats.medianPrice)}
                <span className="text-xs font-normal text-gray-400 block">جنيه</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">أدنى سعر</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">
                {minPrice ? (
                  <>
                    {formatPrice(minPrice)}
                    <span className="text-xs font-normal text-gray-400 block">جنيه</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">أعلى سعر</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">
                {maxPrice ? (
                  <>
                    {formatPrice(maxPrice)}
                    <span className="text-xs font-normal text-gray-400 block">جنيه</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Property type tabs (static display) ─────────────── */}
      {availableTypes.length > 1 && (
        <section>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => {
              const label = propertyTypeLabels[type] ?? type;
              const typeStats = stats.find(
                (s) => s.propertyType === type && s.transactionType === 'SALE'
              ) ?? stats.find((s) => s.propertyType === type);
              const isActive = type === (primaryStats?.propertyType ?? availableTypes[0]);
              return (
                <div
                  key={type}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-700 text-white border-primary-700'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {label}
                  {typeStats && (
                    <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                      ({typeStats.listingCount})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Price trend note ─────────────────────────────────── */}
      {priceChangePercent !== null && priceChangePercent !== 0 && (
        <section
          className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${
            priceChangePositive
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-red-50 border-red-100 text-red-800'
          }`}
        >
          {priceChangePositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <p className="text-sm font-medium">
            {priceChangePositive
              ? `ارتفعت أسعار ${district} ${priceChangePercent.toFixed(1)}% في آخر ٦ أشهر`
              : `انخفضت أسعار ${district} ${Math.abs(priceChangePercent).toFixed(1)}% في آخر ٦ أشهر`}
          </p>
        </section>
      )}

      {/* ── Listings grid ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">عقارات في {district}</h2>
          <Link
            href={`/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`}
            className="text-primary-700 hover:text-primary-900 text-sm font-medium"
          >
            عرض الكل ←
          </Link>
        </div>

        {listingCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listingCards.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500">لا توجد عقارات متاحة في {district} حالياً.</p>
            <Link
              href={`/search?city=${encodeURIComponent(city)}`}
              className="mt-4 inline-block text-primary-700 hover:underline text-sm font-medium"
            >
              تصفح كل عقارات {city}
            </Link>
          </div>
        )}
      </section>

      {/* ── View all CTA ─────────────────────────────────────── */}
      {listingCards.length > 0 && (
        <div className="text-center pt-4 pb-8">
          <Link
            href={`/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-md"
          >
            عرض جميع عقارات {district}
          </Link>
        </div>
      )}
    </div>
  );
}
