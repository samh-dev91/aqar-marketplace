import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, Building2 } from 'lucide-react';
import { db } from '@/lib/db';
import { ListingCard } from '@/components/listing/listing-card';
import type { ListingCard as ListingCardType } from '@/types/listing';
import type Decimal from 'decimal.js';
import { StarRating } from '@/components/trust/star-rating';
import { SuperBrokerBadge } from '@/components/trust/super-broker-badge';
import { ReviewForm } from '@/components/trust/review-form';

export const revalidate = 60;

interface PageProps {
  params: { slug: string };
}

interface BrokerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ReviewsResponse {
  data: {
    reviews: BrokerReview[];
    avgRating: number;
    reviewCount: number;
  } | null;
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
  brokerTier: string | null;
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
    brokerTier: l.brokerTier ?? undefined,
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

const LISTING_SELECT = {
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
  brokerTier: true,
  firmNameAr: true,
  firmNameEn: true,
  firmLogoUrl: true,
  hasFinancing: true,
  monthlyFrom: true,
  viewCount: true,
  favoriteCount: true,
  isActive: true,
  publishedAt: true,
} as const;

async function fetchReviews(slug: string): Promise<ReviewsResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/firms/${slug}/reviews?limit=5`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { data: null };
    return res.json() as Promise<ReviewsResponse>;
  } catch {
    return { data: null };
  }
}

async function fetchFirmData(slug: string) {
  const listings = await db.listing.findMany({
    where: { crmFirmSlug: slug, isActive: true },
    orderBy: { publishedAt: 'desc' },
    take: 24,
    select: LISTING_SELECT,
  });

  if (listings.length === 0) return null;

  const first = listings[0]!;
  const firmInfo = {
    nameAr: first.firmNameAr,
    nameEn: first.firmNameEn,
    logoUrl: first.firmLogoUrl,
    brokerTier: first.brokerTier,
  };

  // Count by propertyType
  const typeCounts = new Map<string, number>();
  for (const l of listings) {
    typeCounts.set(l.propertyType, (typeCounts.get(l.propertyType) ?? 0) + 1);
  }

  // Total active count (may be more than the 24 we fetched)
  const totalCount = await db.listing.count({
    where: { crmFirmSlug: slug, isActive: true },
  });

  return { firmInfo, listings: listings as DbListing[], typeCounts, totalCount };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const data = await fetchFirmData(slug);
  if (!data) {
    return { title: 'شركة غير موجودة | عقار ثرست' };
  }
  const { firmInfo } = data;
  const title = `${firmInfo.nameAr} | عقار ثرست`;
  const description = `تصفح عقارات ${firmInfo.nameAr} الموثقة على عقار ثرست. ${data.totalCount} عقار متاح.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ar_EG',
      ...(firmInfo.logoUrl ? { images: [{ url: firmInfo.logoUrl, alt: firmInfo.nameAr }] } : {}),
    },
  };
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'شقق',
  VILLA: 'فيلات',
  OFFICE: 'مكاتب',
  SHOP: 'محلات',
  LAND: 'أراضي',
  TOWNHOUSE: 'تاون هاوس',
  DUPLEX: 'دوبلكس',
  PENTHOUSE: 'بنتهاوس',
  WAREHOUSE: 'مخازن',
  BUILDING: 'مبانٍ',
  OTHER: 'أخرى',
};

export default async function FirmProfilePage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug);
  const [data, reviewsRes] = await Promise.all([
    fetchFirmData(slug),
    fetchReviews(slug),
  ]);

  if (!data) {
    notFound();
  }

  const { firmInfo, listings, typeCounts, totalCount } = data;
  const listingCards = listings.map(toListingCard);
  const uniqueTypeCount = typeCounts.size;

  const reviewsData = reviewsRes.data;
  const reviews = reviewsData?.reviews ?? [];
  const avgRating = reviewsData?.avgRating ?? 0;
  const reviewCount = reviewsData?.reviewCount ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Firm header ─────────────────────────────────────── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="flex-shrink-0">
            {firmInfo.logoUrl ? (
              <Image
                src={firmInfo.logoUrl}
                alt={firmInfo.nameAr}
                width={80}
                height={80}
                className="rounded-xl object-contain border border-gray-100 bg-gray-50"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                <Building2 size={32} className="text-primary-700" />
              </div>
            )}
          </div>

          {/* Firm info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {firmInfo.nameAr}
            </h1>
            {firmInfo.nameEn && (
              <p className="text-gray-500 text-sm mt-0.5" dir="ltr">
                {firmInfo.nameEn}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* Verified badge */}
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-sm font-medium">
                <ShieldCheck size={14} />
                موثق على عقار ثرست
              </span>

              {/* Super broker badge */}
              <SuperBrokerBadge tier={firmInfo.brokerTier} />

              {/* Listing count badge */}
              <span className="inline-flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm font-medium">
                {totalCount.toLocaleString('ar-EG')} عقار
              </span>

              {/* Star rating */}
              {reviewCount > 0 && (
                <StarRating rating={avgRating} reviewCount={reviewCount} size="md" />
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">{totalCount.toLocaleString('ar-EG')}</p>
            <p className="text-xs text-gray-500 mt-0.5">عقار نشط</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{uniqueTypeCount.toLocaleString('ar-EG')}</p>
            <p className="text-xs text-gray-500 mt-0.5">نوع عقار</p>
          </div>
          {/* Property type breakdown */}
          {[...typeCounts.entries()].map(([type, count]) => (
            <div key={type} className="text-center">
              <p className="text-lg font-bold text-gray-700">{count.toLocaleString('ar-EG')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{PROPERTY_TYPE_LABELS[type] ?? type}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Listings grid ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          عقارات {firmInfo.nameAr}
        </h2>

        {listingCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listingCards.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">هذه الشركة لا تملك عقارات متاحة حالياً</p>
            <Link
              href="/search"
              className="mt-4 inline-block text-primary-700 hover:underline text-sm font-medium"
            >
              تصفح كل العقارات
            </Link>
          </div>
        )}
      </section>

      {/* ── Reviews section ──────────────────────────────────── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">التقييمات</h2>
          {reviewCount > 0 && (
            <StarRating rating={avgRating} reviewCount={reviewCount} size="md" />
          )}
        </div>

        {/* Review list */}
        {reviews.length > 0 ? (
          <ul className="space-y-4 mb-8" dir="rtl">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-8 text-center py-4">
            لا توجد تقييمات بعد. كن أول من يقيّم.
          </p>
        )}

        {/* Review form */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">اكتب تقييماً</h3>
          <ReviewForm firmSlug={slug} onSuccess={() => {}} />
        </div>
      </section>
    </div>
  );
}
