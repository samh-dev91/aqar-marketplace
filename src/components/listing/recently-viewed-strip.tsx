'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Maximize2 } from 'lucide-react';
import { VerificationBadge } from '@/components/trust/verification-badge';
import { formatPrice, formatArea } from '@/lib/format';
import type { ListingCard } from '@/types/listing';

interface HistoryResponse {
  success: boolean;
  data?: ListingCard[];
}

function CompactCardSkeleton() {
  return (
    <div className="w-52 flex-shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

function CompactCard({ listing }: { listing: ListingCard }) {
  const firstImage = listing.images[0] ?? '/placeholder-property.jpg';
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="w-52 flex-shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow block"
    >
      <div className="relative h-32 overflow-hidden bg-gray-100">
        <Image
          src={firstImage}
          alt={listing.titleAr}
          fill
          sizes="208px"
          className="object-cover hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 start-2">
          <VerificationBadge tier={listing.verificationTier} size="sm" showLabel={false} />
        </div>
      </div>
      <div className="p-3">
        {listing.priceIsHidden ? (
          <p className="text-xs text-gray-500 mb-1">السعر عند الطلب</p>
        ) : (
          <p className="text-sm font-bold text-primary-700 mb-1 leading-tight">
            {formatPrice(listing.askingPrice)}
            <span className="text-xs font-normal text-gray-400 me-1"> جنيه</span>
          </p>
        )}
        <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1">{listing.titleAr}</p>
        <p className="flex items-center gap-1 text-xs text-gray-400 mb-2">
          <MapPin size={10} className="flex-shrink-0" />
          <span className="line-clamp-1">
            {listing.district ? `${listing.district}، ${listing.city}` : listing.city}
          </span>
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-0.5">
              <Bed size={11} /> {listing.bedrooms}
            </span>
          )}
          {listing.area != null && (
            <span className="flex items-center gap-0.5">
              <Maximize2 size={11} /> {formatArea(listing.area)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function RecentlyViewedStrip() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const consumerId =
      typeof window !== 'undefined'
        ? (localStorage.getItem('consumerId') ?? localStorage.getItem('consumer_id'))
        : null;

    if (!consumerId) {
      setLoading(false);
      return;
    }

    fetch('/api/history', {
      headers: { 'x-consumer-id': consumerId },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as HistoryResponse;
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setListings(json.data.slice(0, 4));
        }
      })
      .catch(() => {
        // Silently fail
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (!loading && listings.length === 0) return null;

  return (
    <section className="py-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">شاهدت مؤخراً</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth -mx-1 px-1">
          {loading ? (
            <>
              <CompactCardSkeleton />
              <CompactCardSkeleton />
              <CompactCardSkeleton />
              <CompactCardSkeleton />
            </>
          ) : (
            listings.map((listing) => (
              <div key={listing.id} className="snap-start">
                <CompactCard listing={listing} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
