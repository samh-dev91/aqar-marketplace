'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath, Maximize2, Heart, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, formatArea } from '@/lib/format';
import { VerificationBadge } from '@/components/trust/verification-badge';
import { LiveBadge } from '@/components/trust/live-badge';
import type { ListingCard as ListingCardType } from '@/types/listing';
import { useComparisonStore } from '@/store/comparison.store';

interface ListingCardProps {
  listing: ListingCardType;
  isFavorited?: boolean;
  onFavoriteToggle?: (slug: string) => void;
  className?: string;
  locale?: string;
}

export function ListingCard({
  listing,
  isFavorited = false,
  onFavoriteToggle,
  className,
  locale = 'ar',
}: ListingCardProps) {
  const { addItem, removeItem, isInComparison } = useComparisonStore();
  const inComparison = isInComparison(listing.slug);

  const title = locale === 'ar' ? listing.titleAr : (listing.titleEn ?? listing.titleAr);
  const transactionLabel = listing.transactionType === 'SALE'
    ? (locale === 'ar' ? 'للبيع' : 'For Sale')
    : (locale === 'ar' ? 'للإيجار' : 'For Rent');

  const transactionColor = listing.transactionType === 'SALE'
    ? 'bg-primary-700 text-white'
    : 'bg-success text-white';

  const firstImage = listing.images[0] ?? '/placeholder-property.jpg';

  return (
    <div className={cn('group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100', className)}>
      {/* Image */}
      <Link href={`/listings/${listing.slug}`} className="block relative aspect-[4/3] overflow-hidden">
        <Image
          src={firstImage}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Overlays */}
        <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', transactionColor)}>
            {transactionLabel}
          </span>
          <VerificationBadge tier={listing.verificationTier} size="sm" />
        </div>
        {/* Action buttons (favorite + compare) */}
        <div className="absolute top-3 end-3 flex flex-col gap-1.5">
          {onFavoriteToggle && (
            <button
              onClick={(e) => { e.preventDefault(); onFavoriteToggle(listing.slug); }}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
              aria-label={isFavorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart
                size={18}
                className={cn('transition-colors', isFavorited ? 'fill-danger text-danger' : 'text-gray-500')}
              />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              if (inComparison) {
                removeItem(listing.slug);
              } else {
                addItem({
                  slug: listing.slug,
                  titleAr: listing.titleAr,
                  askingPrice: String(listing.askingPrice),
                  imageUrl: listing.images[0],
                });
              }
            }}
            className={cn(
              'p-1.5 rounded-full transition-colors',
              inComparison
                ? 'bg-primary-700 text-white'
                : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:text-primary-700 hover:bg-white',
            )}
            aria-label={inComparison ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
            title={inComparison ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
          >
            <Scale size={14} />
          </button>
        </div>
        {/* Aqar Score */}
        {listing.aqarScore != null && (
          <div className="absolute bottom-3 end-3 bg-primary-700 text-white text-xs font-bold rounded-full w-9 h-9 flex items-center justify-center">
            {listing.aqarScore}
          </div>
        )}
      </Link>

      {/* Body */}
      <Link href={`/listings/${listing.slug}`} className="block p-4">
        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          {listing.priceIsHidden ? (
            <span className="text-gray-500 text-sm">السعر عند الطلب</span>
          ) : (
            <span className="text-xl font-bold text-primary-700">
              {formatPrice(listing.askingPrice)} <span className="text-sm font-normal text-gray-500">جنيه</span>
            </span>
          )}
          {listing.hasFinancing && listing.monthlyFrom && (
            <span className="text-xs text-success font-medium">
              من {formatPrice(listing.monthlyFrom)} / شهر
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
          <MapPin size={13} />
          <span className="line-clamp-1">{listing.district ? `${listing.district}، ${listing.city}` : listing.city}</span>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed size={14} /> {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={14} /> {listing.bathrooms}
            </span>
          )}
          {listing.area != null && (
            <span className="flex items-center gap-1">
              <Maximize2 size={14} /> {formatArea(listing.area)}
            </span>
          )}
          <div className="ms-auto">
            <LiveBadge lastSyncAt={listing.lastSyncAt} isStale={listing.isStale} />
          </div>
        </div>

        {/* Firm */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          {listing.firmLogoUrl && (
            <Image src={listing.firmLogoUrl} alt={listing.firmNameAr} width={20} height={20} className="rounded-sm object-contain" />
          )}
          <span className="text-xs text-gray-500 line-clamp-1">{listing.firmNameAr}</span>
        </div>
      </Link>
    </div>
  );
}
