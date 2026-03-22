'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { AiSearchFilters } from '@/components/search/ai-search-bar';

// Load AiSearchBar only on the client — it uses browser APIs (keydown, body.style)
const AiSearchBar = dynamic(
  () => import('@/components/search/ai-search-bar').then((m) => m.AiSearchBar),
  { ssr: false },
);

export function SearchModeToggle() {
  const [useAi, setUseAi] = useState(false);
  const router = useRouter();

  const handleFiltersApplied = (filters: AiSearchFilters) => {
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.district) params.set('district', filters.district);
    if (filters.propertyType) params.set('propertyType', filters.propertyType);
    if (filters.transactionType) params.set('transactionType', filters.transactionType);
    if (filters.bedrooms != null) params.set('bedrooms', String(filters.bedrooms));
    if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
    if (filters.monthlyBudget != null) params.set('monthlyBudget', String(filters.monthlyBudget));
    if (filters.hasFinancing) params.set('hasFinancing', 'true');
    if (filters.verificationTier) params.set('verificationTier', filters.verificationTier);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="mb-6">
      {/* Mode toggle button */}
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => setUseAi((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors shadow-sm ${
            useAi
              ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
          }`}
          dir="rtl"
        >
          {useAi ? (
            <>
              <span>🔍</span>
              <span>بحث تقليدي</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>بحث ذكي</span>
            </>
          )}
        </button>
      </div>

      {/* AI search bar — shown only when AI mode is active */}
      {useAi && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
          <AiSearchBar
            onFiltersApplied={handleFiltersApplied}
            onSwitchToBasic={() => setUseAi(false)}
          />
        </div>
      )}
    </div>
  );
}
