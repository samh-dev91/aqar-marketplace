import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listing/listing-card';
import { SearchFiltersPanel } from './search-filters-panel';
import { SearchModeToggle } from './search-mode-toggle';
import type { SearchResult, SearchFilters } from '@/types/listing';

interface SearchPageProps {
  searchParams: {
    q?: string;
    city?: string;
    district?: string;
    propertyType?: string;
    transactionType?: string;
    minPrice?: string;
    maxPrice?: string;
    minArea?: string;
    maxArea?: string;
    bedrooms?: string;
    monthlyBudget?: string;
    verificationTier?: string;
    sortBy?: string;
    page?: string;
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const parts: string[] = [];
  if (searchParams.q) parts.push(searchParams.q);
  if (searchParams.city) parts.push(searchParams.city);
  const typeLabels: Record<string, string> = {
    APARTMENT: 'شقق', VILLA: 'فيلات', OFFICE: 'مكاتب', SHOP: 'محلات', LAND: 'أراضي',
  };
  if (searchParams.propertyType) parts.push(typeLabels[searchParams.propertyType] ?? searchParams.propertyType);
  const txLabel = searchParams.transactionType === 'SALE' ? 'للبيع' : searchParams.transactionType === 'RENT' ? 'للإيجار' : undefined;
  if (txLabel) parts.push(txLabel);

  const title = parts.length > 0
    ? `${parts.join(' — ')} | عقار ثرست`
    : 'نتائج البحث | عقار ثرست';

  return {
    title,
    description: 'ابحث في آلاف العقارات الموثقة في مصر. فلاتر متقدمة، بيانات حقيقية، بدون إعلانات وهمية.',
    robots: { index: false, follow: true },
    alternates: {
      canonical: '/search', // strip query params from canonical
    },
  };
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر تصاعدي' },
  { value: 'price_desc', label: 'السعر تنازلي' },
  { value: 'area_desc', label: 'المساحة' },
  { value: 'score', label: 'أعلى تقييم' },
];

async function fetchResults(searchParams: SearchPageProps['searchParams']): Promise<SearchResult | null> {
  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (searchParams.city) params.set('city', searchParams.city);
  if (searchParams.district) params.set('district', searchParams.district);
  if (searchParams.propertyType) params.set('propertyType', searchParams.propertyType);
  if (searchParams.transactionType) params.set('transactionType', searchParams.transactionType);
  if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
  if (searchParams.minArea) params.set('minArea', searchParams.minArea);
  if (searchParams.maxArea) params.set('maxArea', searchParams.maxArea);
  if (searchParams.bedrooms) params.set('bedrooms', searchParams.bedrooms);
  if (searchParams.monthlyBudget) params.set('monthlyBudget', searchParams.monthlyBudget);
  if (searchParams.verificationTier) params.set('verificationTier', searchParams.verificationTier);
  if (searchParams.sortBy) params.set('sortBy', searchParams.sortBy);
  if (searchParams.page) params.set('page', searchParams.page);
  params.set('limit', '12');

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      success: boolean;
      data: SearchResult['listings'];
      pagination: SearchResult['pagination'];
      facets?: SearchResult['facets'];
    };
    if (!json.success) return null;
    return {
      listings: json.data ?? [],
      pagination: json.pagination,
      facets: json.facets ?? { cities: [], districts: [], propertyTypes: [], priceRange: { min: 0, max: 0 } },
    };
  } catch {
    return null;
  }
}

function buildPageUrl(searchParams: SearchPageProps['searchParams'], page: number): string {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== 'page') params.set(k, v); });
  params.set('page', String(page));
  return `/search?${params.toString()}`;
}

function buildSortUrl(searchParams: SearchPageProps['searchParams'], sortBy: string): string {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== 'sortBy' && k !== 'page') params.set(k, v); });
  params.set('sortBy', sortBy);
  return `/search?${params.toString()}`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const result = await fetchResults(searchParams);

  if (!result) {
    notFound();
  }

  const { listings, pagination } = result;
  const currentPage = pagination.page;
  const currentSort = searchParams.sortBy ?? 'newest';
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? 'الأحدث';

  // Active filter count for mobile button
  const activeFilterCount = [
    searchParams.city,
    searchParams.propertyType,
    searchParams.transactionType,
    searchParams.minPrice ?? searchParams.maxPrice ?? searchParams.monthlyBudget,
    searchParams.bedrooms,
    searchParams.verificationTier,
  ].filter(Boolean).length;

  const currentFilters: SearchFilters = {
    q: searchParams.q,
    city: searchParams.city,
    district: searchParams.district,
    propertyType: searchParams.propertyType,
    transactionType: searchParams.transactionType,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    minArea: searchParams.minArea ? Number(searchParams.minArea) : undefined,
    maxArea: searchParams.maxArea ? Number(searchParams.maxArea) : undefined,
    bedrooms: searchParams.bedrooms ? Number(searchParams.bedrooms) : undefined,
    monthlyBudget: searchParams.monthlyBudget ? Number(searchParams.monthlyBudget) : undefined,
    verificationTier: searchParams.verificationTier,
    sortBy: (searchParams.sortBy as SearchFilters['sortBy']) ?? 'newest',
    page: currentPage,
  };

  // Result count label
  const countLabel = (() => {
    const parts: string[] = [];
    if (searchParams.city) parts.push(`في ${searchParams.city}`);
    if (searchParams.district) parts.push(searchParams.district);
    return `${pagination.total.toLocaleString('ar-EG')} عقار${parts.length > 0 ? ` ${parts.join('، ')}` : ''}`;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── AI / Traditional search mode toggle ────────────── */}
      <SearchModeToggle />

      {/* Mobile filter button */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <p className="text-sm text-gray-500 font-medium">{countLabel}</p>
        <SearchFiltersPanel
          currentFilters={currentFilters}
          mobileOnly
          activeFilterCount={activeFilterCount}
        />
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar (desktop) ───────────────────────────── */}
        <aside className="hidden md:block w-72 flex-shrink-0">
          <SearchFiltersPanel
            currentFilters={currentFilters}
            activeFilterCount={activeFilterCount}
          />
        </aside>

        {/* ── Main content ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-600 font-medium hidden md:block">{countLabel}</p>
            <div className="flex items-center gap-2 ms-auto">
              <span className="text-sm text-gray-500 hidden sm:inline">ترتيب:</span>
              <div className="relative">
                <select
                  className="appearance-none border border-gray-200 rounded-lg ps-3 pe-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-primary-700 bg-white cursor-pointer"
                  defaultValue={currentSort}
                  onChange={() => {}}
                  aria-label="ترتيب النتائج"
                >
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {/* Sort links for each option (SSR-friendly approach) */}
              </div>
              {/* Sort links rendered as anchor tags for SSR navigation */}
              <div className="hidden">
                {SORT_OPTIONS.map(({ value }) => (
                  <a key={value} href={buildSortUrl(searchParams, value)} data-sort={value} />
                ))}
              </div>
            </div>
          </div>

          {/* Sort bar (visible links) */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SORT_OPTIONS.map(({ value, label }) => (
              <a
                key={value}
                href={buildSortUrl(searchParams, value)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  currentSort === value
                    ? 'bg-primary-700 text-white border-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-primary-700 hover:text-primary-700 bg-white'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Listing grid */}
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">🏠</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500 text-sm max-w-sm mb-6">
                لا توجد عقارات تطابق معايير بحثك. حاول تغيير الفلاتر أو توسيع نطاق البحث.
              </p>
              <a
                href="/search"
                className="bg-primary-700 hover:bg-primary-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                إعادة تعيين الفلاتر
              </a>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {currentPage > 1 && (
                <a
                  href={buildPageUrl(searchParams, currentPage - 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-primary-700 hover:text-primary-700 transition-colors"
                >
                  السابق
                </a>
              )}

              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                const page = (() => {
                  if (pagination.totalPages <= 7) return i + 1;
                  if (currentPage <= 4) return i + 1;
                  if (currentPage >= pagination.totalPages - 3) return pagination.totalPages - 6 + i;
                  return currentPage - 3 + i;
                })();
                return (
                  <a
                    key={page}
                    href={buildPageUrl(searchParams, page)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm border transition-colors ${
                      page === currentPage
                        ? 'bg-primary-700 text-white border-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-primary-700 hover:text-primary-700'
                    }`}
                  >
                    {page}
                  </a>
                );
              })}

              {currentPage < pagination.totalPages && (
                <a
                  href={buildPageUrl(searchParams, currentPage + 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-primary-700 hover:text-primary-700 transition-colors"
                >
                  التالي
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
