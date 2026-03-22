'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { ListingCard } from '@/components/listing/listing-card';
import { cn } from '@/lib/utils';
import type { ListingCard as ListingCardType } from '@/types/listing';

type GeoStatus = 'idle' | 'requesting' | 'denied' | 'loading' | 'done' | 'error';

interface NearbyListing extends ListingCardType {
  distance_km: number;
}

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];

export default function NearbyPage() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<Radius>(10);
  const [listings, setListings] = useState<NearbyListing[]>([]);

  const fetchNearby = useCallback(
    async (lat: number, lng: number, r: Radius) => {
      setStatus('loading');
      try {
        const res = await fetch(`/api/search/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as { success: boolean; data: NearbyListing[] };
        setListings(json.success ? json.data : []);
        setStatus('done');
      } catch {
        setStatus('error');
      }
    },
    []
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        void fetchNearby(lat, lng, radius);
      },
      () => setStatus('denied'),
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [fetchNearby, radius]);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRadiusChange = (r: Radius) => {
    setRadius(r);
    if (coords) void fetchNearby(coords.lat, coords.lng, r);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
          <Navigation size={20} className="text-primary-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عقارات قريبة منك</h1>
          <p className="text-sm text-gray-500">عقارات في نطاق موقعك الحالي</p>
        </div>
      </div>

      {/* Radius selector */}
      {(status === 'done' || status === 'loading') && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-600 ml-2">النطاق:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                radius === r
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-primary-700'
              )}
            >
              {r} كم
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {(status === 'idle' || status === 'requesting') && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
            <MapPin size={28} className="text-primary-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">جاري تحديد موقعك...</h2>
          <p className="text-sm text-gray-500">يرجى السماح بالوصول إلى موقعك</p>
          {status === 'requesting' && (
            <Loader2 size={24} className="text-primary-700 animate-spin mt-4" />
          )}
        </div>
      )}

      {status === 'denied' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <MapPin size={28} className="text-warning" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">تعذّر تحديد الموقع</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            يرجى السماح بالوصول إلى موقعك في إعدادات المتصفح للبحث عن العقارات القريبة
          </p>
          <button
            onClick={requestLocation}
            className="mt-4 bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-900 transition-colors"
          >
            حاول مرة أخرى
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      )}

      {status === 'done' && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MapPin size={40} className="text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">لا توجد عقارات في هذا النطاق</h2>
          <p className="text-sm text-gray-500">جرّب توسيع نطاق البحث</p>
        </div>
      )}

      {status === 'done' && listings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <div key={listing.id} className="relative">
              <ListingCard listing={listing} />
              <div className="absolute top-3 end-3 z-10 bg-white/90 backdrop-blur-sm text-primary-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-primary-100 pointer-events-none">
                {listing.distance_km} كم
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-20">
          <p className="text-gray-500">حدث خطأ في البحث. يرجى المحاولة مرة أخرى.</p>
          <button
            onClick={() => coords && void fetchNearby(coords.lat, coords.lng, radius)}
            className="mt-3 text-primary-700 text-sm underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}
