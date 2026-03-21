'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { SearchFilters } from '@/components/search/search-filters';
import type { SearchFilters as SearchFiltersType } from '@/types/listing';

interface SearchFiltersPanelProps {
  currentFilters: SearchFiltersType;
  activeFilterCount: number;
  mobileOnly?: boolean;
}

export function SearchFiltersPanel({ currentFilters, activeFilterCount, mobileOnly = false }: SearchFiltersPanelProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFiltersType>(currentFilters);
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyFilters = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.district) params.set('district', newFilters.district);
    if (newFilters.propertyType) params.set('propertyType', newFilters.propertyType);
    if (newFilters.transactionType) params.set('transactionType', newFilters.transactionType);
    if (newFilters.minPrice) params.set('minPrice', String(newFilters.minPrice));
    if (newFilters.maxPrice) params.set('maxPrice', String(newFilters.maxPrice));
    if (newFilters.minArea) params.set('minArea', String(newFilters.minArea));
    if (newFilters.maxArea) params.set('maxArea', String(newFilters.maxArea));
    if (newFilters.bedrooms) params.set('bedrooms', String(newFilters.bedrooms));
    if (newFilters.monthlyBudget) params.set('monthlyBudget', String(newFilters.monthlyBudget));
    if (newFilters.verificationTier) params.set('verificationTier', newFilters.verificationTier);
    router.push(`/search?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({});
    router.push('/search');
  };

  if (mobileOnly) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
        >
          <SlidersHorizontal size={16} className="text-primary-700" />
          الفلاتر
          {activeFilterCount > 0 && (
            <span className="bg-primary-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Mobile bottom sheet */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
                <h3 className="font-bold text-gray-900">الفلاتر</h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <SearchFilters
                  filters={filters}
                  onChange={(f) => { applyFilters(f); setMobileOpen(false); }}
                  onReset={() => { resetFilters(); setMobileOpen(false); }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <SearchFilters
      filters={filters}
      onChange={applyFilters}
      onReset={resetFilters}
    />
  );
}
