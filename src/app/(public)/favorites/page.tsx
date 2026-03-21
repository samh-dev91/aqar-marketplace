'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ListingCard } from '@/components/listing/listing-card';
import { Button } from '@/components/ui/button';
import { getConsumerToken, fetchWithAuth } from '@/lib/consumer-auth';
import type { ListingCard as ListingCardType } from '@/types/listing';

interface FavoritesResponse {
  success: boolean;
  data: ListingCardType[];
  message?: string;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  // undefined = not yet read from localStorage, null = confirmed unauthenticated, string = token
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/favorites');
      if (!res.ok) {
        setError('تعذّر تحميل المفضلة. يرجى المحاولة مرة أخرى.');
        return;
      }
      const data = (await res.json()) as FavoritesResponse;
      if (data.success) {
        setListings(data.data);
      } else {
        setError(data.message ?? 'حدث خطأ غير متوقع.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Read token client-side (SSR-safe) — runs once on mount
  useEffect(() => {
    const t = getConsumerToken();
    setToken(t);
    if (t) {
      void fetchFavorites();
    }
  }, [fetchFavorites]);

  // Wait for client-side token read
  if (token === undefined) {
    return null;
  }

  // Unauthenticated state
  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <Heart size={36} className="text-gray-300" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">مفضلاتك تنتظرك</h1>
        <p className="text-gray-500 text-sm mb-6 max-w-xs">
          سجّل الدخول لحفظ مفضلاتك والوصول إليها من أي جهاز.
        </p>
        <Button asChild size="lg">
          <Link href="/auth/login?redirect=/favorites">سجّل الدخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">عقاراتي المفضلة</h1>

      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
          <button
            onClick={() => void fetchFavorites()}
            className="mr-3 font-medium underline"
          >
            أعد المحاولة
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <Heart size={36} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مفضلات بعد</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            لم تحفظ أي عقارات بعد. ابدأ البحث وأضف ما يعجبك!
          </p>
          <Button asChild variant="outline">
            <Link href="/listings">تصفح العقارات</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorited
              onFavoriteToggle={async (slug) => {
                try {
                  await fetchWithAuth(`/api/favorites/${slug}`, { method: 'DELETE' });
                  setListings((prev) => prev.filter((l) => l.slug !== slug));
                } catch {
                  // Silently fail — user can retry
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
