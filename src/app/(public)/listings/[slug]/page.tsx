import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Bed, Bath, Maximize2, Car, Layers, Sofa, MapPin,
  Eye, MessageCircle, Share2, AlertCircle,
} from 'lucide-react';
import { RentalYieldBadge } from '@/components/listing/rental-yield-badge';
import { VerificationBadge } from '@/components/trust/verification-badge';
import { LiveBadge } from '@/components/trust/live-badge';
import { ListingCard } from '@/components/listing/listing-card';
import { AqarScoreBadge } from '@/components/trust/aqar-score-badge';
import { EstimateBadge } from '@/components/trust/estimate-badge';
import { DistrictStatsCard } from '@/components/listing/district-stats-card';
import { PriceHistoryChart } from '@/components/listing/price-history-chart';
import { InstallmentCalculator } from '@/components/listing/installment-calculator';
import { InquiryButton } from './inquiry-button';
import { ShareButton } from '@/components/listing/share-button';
import { ReservationButton } from '@/components/listing/reservation-button';
import { formatPrice, formatArea } from '@/lib/format';
import type { ListingDetail, ListingCard as ListingCardType } from '@/types/listing';

const ListingMap = dynamic(
  () => import('@/components/map/listing-map').then(m => m.ListingMap),
  { ssr: false }
);

const VirtualTour = dynamic(
  () => import('@/components/listing/virtual-tour').then(m => ({ default: m.VirtualTour })),
  { ssr: false }
);

const FloorPlanViewer = dynamic(
  () => import('@/components/listing/floor-plan-viewer').then(m => ({ default: m.FloorPlanViewer })),
  { ssr: false }
);

const StagingToggle = dynamic(
  () => import('@/components/listing/staging-toggle').then(m => ({ default: m.StagingToggle })),
  { ssr: false }
);

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: { slug: string };
}

interface ApiResponse {
  success: boolean;
  data: ListingDetail & {
    isActive: boolean;
    updatedAt: string;
    createdAt: string;
    latitude?: string | null;
    longitude?: string | null;
    googleMapsUrl?: string | null;
  };
  similarListings: ListingCardType[];
  districtStats: {
    avgPricePerSqm: string;
    medianPrice: string;
    listingCount: number;
    priceChange6m: string;
    priceChange12m: string;
  } | null;
}

async function fetchListing(slug: string): Promise<ApiResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/listings/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json() as ApiResponse;
    return json.success ? json : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchListing(params.slug);
  if (!data) {
    return { title: 'عقار غير موجود | عقار ثرست' };
  }

  const { data: listing } = data;
  const priceText = listing.priceIsHidden ? '' : ` — ${formatPrice(listing.askingPrice)} جنيه`;
  const title = `${listing.titleAr}${priceText} | عقار ثرست`;
  const description = `${listing.titleAr} في ${listing.district ? `${listing.district}، ` : ''}${listing.city}. ${listing.descriptionAr ?? ''}`.slice(0, 200);
  const image = listing.images[0];

  const canonicalSlug = listing.slug;

  return {
    title,
    description,
    alternates: {
      canonical: `/listings/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'ar_EG',
      images: image ? [{ url: image, width: 1200, height: 630, alt: listing.titleAr }] : [],
    },
  };
}

const SPEC_ICON_MAP = {
  bedrooms: Bed,
  bathrooms: Bath,
  area: Maximize2,
  floor: Layers,
  parking: Car,
  furnished: Sofa,
};

export default async function ListingDetailPage({ params }: PageProps) {
  const apiData = await fetchListing(params.slug);

  if (!apiData) {
    notFound();
  }

  const { data: listing, similarListings, districtStats } = apiData;

  const isInactive = !listing.isActive;

  const specs: { icon: keyof typeof SPEC_ICON_MAP; labelAr: string; value: string | null }[] = [
    { icon: 'bedrooms', labelAr: 'غرف النوم', value: listing.bedrooms != null ? String(listing.bedrooms) : null },
    { icon: 'bathrooms', labelAr: 'الحمامات', value: listing.bathrooms != null ? String(listing.bathrooms) : null },
    { icon: 'area', labelAr: 'المساحة', value: listing.area != null ? formatArea(listing.area) : null },
    { icon: 'floor', labelAr: 'الطابق', value: listing.floor != null ? `${listing.floor}${listing.totalFloors ? ` من ${listing.totalFloors}` : ''}` : null },
    { icon: 'parking', labelAr: 'مواقف', value: listing.parkingSpaces != null ? String(listing.parkingSpaces) : null },
    {
      icon: 'furnished',
      labelAr: 'التأثيث',
      value: listing.isFurnished != null ? (listing.isFurnished ? 'مفروش' : 'غير مفروش') : null,
    },
  ].filter((s) => s.value !== null) as { icon: keyof typeof SPEC_ICON_MAP; labelAr: string; value: string | null }[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.titleAr,
    description: listing.descriptionAr,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com'}/listings/${listing.slug}`,
    image: listing.images,
    datePosted: listing.publishedAt,
    dateModified: listing.updatedAt,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressCountry: 'EG',
    },
    ...(listing.latitude && listing.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: Number(listing.latitude),
            longitude: Number(listing.longitude),
          },
        }
      : {}),
    ...(listing.priceIsHidden
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price: listing.askingPrice,
            priceCurrency: 'EGP',
            ...(listing.hasFinancing && listing.monthlyFrom
              ? {
                  priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: listing.monthlyFrom,
                    priceCurrency: 'EGP',
                    referenceQuantity: {
                      '@type': 'QuantitativeValue',
                      value: 1,
                      unitCode: 'MON',
                    },
                  },
                }
              : {}),
          },
        }),
    ...(listing.area ? { floorSize: { '@type': 'QuantitativeValue', value: listing.area, unitCode: 'MTK' } } : {}),
    ...(listing.bedrooms ? { numberOfRooms: listing.bedrooms } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Inactive banner */}
      {isInactive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-amber-800">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="text-sm font-medium">هذا العقار غير متاح حالياً — قد يكون تم بيعه أو تأجيره.</p>
            <Link href="/search" className="ms-auto text-sm underline hover:no-underline whitespace-nowrap">
              عرض عقارات مشابهة
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* ── Left/Main column ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Image gallery */}
            <div className="space-y-2">
              {/* Primary image */}
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
                {listing.images[0] ? (
                  <StagingToggle
                    slug={listing.slug}
                    imageUrl={listing.images[0]}
                    imageIndex={0}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    لا توجد صورة
                  </div>
                )}
                {/* Overlay badges */}
                <div className="absolute top-4 start-4 flex flex-wrap gap-2 z-10">
                  <VerificationBadge tier={listing.verificationTier} size="md" />
                  {listing.isActive && (
                    <LiveBadge lastSyncAt={listing.lastSyncAt} isStale={listing.isStale} />
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth">
                  {listing.images.slice(1).map((img, i) => (
                    <div
                      key={i}
                      className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden snap-start bg-gray-100"
                    >
                      <Image
                        src={img}
                        alt={`${listing.titleAr} — صورة ${i + 2}`}
                        fill
                        sizes="96px"
                        className="object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Virtual Tour */}
            <VirtualTour
              virtualTourUrl={listing.virtualTourUrl ?? null}
              listingTitleAr={listing.titleAr}
            />

            {/* Floor Plan */}
            <FloorPlanViewer floorPlanUrl={listing.floorPlanUrl ?? null} />

            {/* Title + price section */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.titleAr}</h1>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                    <MapPin size={14} />
                    <span>
                      {listing.district ? `${listing.district}، ` : ''}{listing.city}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  {listing.priceIsHidden ? (
                    <p className="text-gray-500 text-sm font-medium">السعر عند الطلب</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-primary-700">
                        {formatPrice(listing.askingPrice)}
                        <span className="text-base font-normal text-gray-500 me-1"> جنيه</span>
                      </p>
                      {listing.pricePerSqm && (
                        <p className="text-sm text-gray-400">
                          {formatPrice(listing.pricePerSqm)} جنيه / م²
                        </p>
                      )}
                    </>
                  )}
                  {listing.hasFinancing && listing.monthlyFrom && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      من {formatPrice(listing.monthlyFrom)} جنيه / شهر
                    </p>
                  )}
                </div>
              </div>

              {/* Transaction + type tags */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${listing.transactionType === 'SALE' ? 'bg-primary-700 text-white' : 'bg-green-600 text-white'}`}>
                  {listing.transactionType === 'SALE' ? 'للبيع' : 'للإيجار'}
                </span>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                  {listing.propertyType === 'APARTMENT' ? 'شقة'
                    : listing.propertyType === 'VILLA' ? 'فيلا'
                    : listing.propertyType === 'OFFICE' ? 'مكتب'
                    : listing.propertyType === 'SHOP' ? 'محل'
                    : listing.propertyType === 'LAND' ? 'أرض'
                    : listing.propertyType}
                </span>
                {listing.aqarScore != null && (
                  <AqarScoreBadge score={listing.aqarScore} size="md" showLabel />
                )}
                <EstimateBadge slug={listing.slug} />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Eye size={12} /> {listing.viewCount.toLocaleString('ar-EG')} مشاهدة</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {listing.inquiryCount.toLocaleString('ar-EG')} استفسار</span>
                <span className="flex items-center gap-1"><Share2 size={12} /> {listing.shareCount.toLocaleString('ar-EG')} مشاركة</span>
                <div className="ms-auto">
                  <ShareButton
                    title={listing.titleAr}
                    url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/listings/${listing.slug}`}
                    price={formatPrice(listing.askingPrice)}
                  />
                </div>
              </div>
            </div>

            {/* Property specs grid */}
            {specs.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-bold text-gray-900 mb-4">تفاصيل العقار</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {specs.map(({ icon, labelAr, value }) => {
                    const Icon = SPEC_ICON_MAP[icon];
                    return (
                      <div key={icon} className="flex flex-col items-center bg-white rounded-lg p-3 shadow-sm border border-gray-100 text-center">
                        <Icon size={20} className="text-primary-700 mb-1.5" />
                        <p className="text-xs text-gray-500 mb-0.5">{labelAr}</p>
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rental yield badge */}
            <RentalYieldBadge
              slug={listing.slug}
              transactionType={listing.transactionType}
            />

            {/* Description */}
            {listing.descriptionAr && (
              <div>
                <h2 className="font-bold text-gray-900 mb-3">وصف العقار</h2>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                  {listing.descriptionAr}
                </p>
              </div>
            )}

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <ListingMap
                latitude={Number(listing.latitude)}
                longitude={Number(listing.longitude)}
                title={listing.titleAr}
                price={formatPrice(listing.askingPrice)}
                googleMapsUrl={listing.googleMapsUrl}
              />
            )}

            {/* District stats */}
            {districtStats && (
              <DistrictStatsCard
                stats={{
                  city: listing.city,
                  district: listing.district ?? listing.city,
                  listingCount: districtStats.listingCount,
                  avgPricePerSqm: districtStats.avgPricePerSqm,
                  medianPrice: districtStats.medianPrice,
                  priceChangePercent: districtStats.priceChange6m ?? null,
                  avgDaysOnMarket: null,
                }}
                listingPrice={listing.askingPrice}
                listingArea={listing.area != null ? String(listing.area) : null}
              />
            )}

            {/* Price history chart */}
            {listing.priceHistory && listing.priceHistory.length > 0 && (
              <PriceHistoryChart history={listing.priceHistory} />
            )}

            {/* Mobile CTA (sticky) */}
            <div className="lg:hidden">
              <InquiryButton
                listingSlug={listing.slug}
                listingTitle={listing.titleAr}
                mobile
              />
            </div>
          </div>

          {/* ── Right column (desktop inquiry card) ─────── */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Firm info */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
                {listing.firmLogoUrl && (
                  <Image
                    src={listing.firmLogoUrl}
                    alt={listing.firmNameAr}
                    width={40}
                    height={40}
                    className="rounded-lg object-contain"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{listing.firmNameAr}</p>
                  {listing.brokerDisplayName && (
                    <p className="text-xs text-gray-500">{listing.brokerDisplayName}</p>
                  )}
                  {listing.brokerResponseTime != null && (
                    <p className="text-xs text-green-600">يرد عادةً خلال {listing.brokerResponseTime} دقيقة</p>
                  )}
                </div>
              </div>

              {/* Price summary */}
              {!listing.priceIsHidden && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-2xl font-bold text-primary-700">
                    {formatPrice(listing.askingPrice)}
                    <span className="text-base font-normal text-gray-500 me-1"> جنيه</span>
                  </p>
                  {listing.hasFinancing && listing.monthlyFrom && (
                    <p className="text-sm text-green-600 mt-1">
                      أو من {formatPrice(listing.monthlyFrom)} جنيه / شهر
                    </p>
                  )}
                </div>
              )}

              <InquiryButton
                listingSlug={listing.slug}
                listingTitle={listing.titleAr}
              />

              {listing.hasFinancing && (
                <ReservationButton
                  listingSlug={listing.slug}
                  hasFinancing={listing.hasFinancing}
                />
              )}

              {/* Installment calculator */}
              {!listing.priceIsHidden && (
                <InstallmentCalculator
                  askingPrice={listing.askingPrice}
                  hasFinancing={listing.hasFinancing}
                  financing={listing.financing}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Similar listings ──────────────────────────── */}
        {similarListings.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-5">عقارات مشابهة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:hidden">
              {/* Mobile: all 4 in grid */}
              {similarListings.map((s) => (
                <ListingCard key={s.id} listing={s} />
              ))}
            </div>
            {/* Desktop: horizontal scroll for space */}
            <div className="hidden lg:flex gap-5 overflow-x-auto pb-2">
              {similarListings.map((s) => (
                <div key={s.id} className="w-64 flex-shrink-0">
                  <ListingCard listing={s} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
