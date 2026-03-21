'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, X } from 'lucide-react';
import type { SearchFilters } from '@/types/listing';

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onReset: () => void;
  className?: string;
}

const propertyTypes = [
  { value: 'APARTMENT', label: 'شقة' },
  { value: 'VILLA', label: 'فيلا' },
  { value: 'TOWNHOUSE', label: 'تاون هاوس' },
  { value: 'OFFICE', label: 'مكتب' },
  { value: 'SHOP', label: 'محل' },
  { value: 'LAND', label: 'أرض' },
];

const cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'القاهرة الجديدة', 'السادس من أكتوبر'];

const bedroomOptions = [1, 2, 3, 4, 5];

export function SearchFilters({ filters, onChange, onReset, className }: SearchFiltersProps) {
  const [monthlyMode, setMonthlyMode] = useState(!!filters.monthlyBudget);

  const activeFilterCount = [
    filters.city, filters.propertyType, filters.transactionType,
    filters.minPrice || filters.maxPrice || filters.monthlyBudget,
    filters.bedrooms, filters.verificationTier,
  ].filter(Boolean).length;

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-5 space-y-5', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary-700" />
          <span className="font-semibold text-gray-900">الفلاتر</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="text-xs">{activeFilterCount}</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button onClick={onReset} className="text-xs text-gray-500 hover:text-danger flex items-center gap-1">
            <X size={12} /> مسح الكل
          </button>
        )}
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">نوع المعاملة</label>
        <div className="flex gap-2">
          {[{ value: '', label: 'الكل' }, { value: 'SALE', label: 'للبيع' }, { value: 'RENT', label: 'للإيجار' }].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...filters, transactionType: value || undefined })}
              className={cn(
                'flex-1 py-2 text-sm rounded-lg border transition-colors',
                filters.transactionType === value || (!value && !filters.transactionType)
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-primary-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">نوع العقار</label>
        <div className="flex flex-wrap gap-2">
          {propertyTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...filters, propertyType: filters.propertyType === value ? undefined : value })}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-colors',
                filters.propertyType === value
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-primary-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">المدينة</label>
        <select
          value={filters.city ?? ''}
          onChange={(e) => onChange({ ...filters, city: e.target.value || undefined })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-700"
        >
          <option value="">كل المدن</option>
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>

      {/* Price Mode Toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            {monthlyMode ? 'الميزانية الشهرية' : 'نطاق السعر'}
          </label>
          <button
            onClick={() => {
              setMonthlyMode(!monthlyMode);
              if (monthlyMode) {
                onChange({ ...filters, monthlyBudget: undefined });
              } else {
                onChange({ ...filters, minPrice: undefined, maxPrice: undefined });
              }
            }}
            className="text-xs text-primary-700 hover:underline"
          >
            {monthlyMode ? 'التبديل للسعر الكلي' : 'بحث بالقسط الشهري'}
          </button>
        </div>

        {monthlyMode ? (
          <div>
            <input
              type="number"
              placeholder="أقصى قسط شهري (جنيه)"
              value={filters.monthlyBudget ?? ''}
              onChange={(e) => onChange({ ...filters, monthlyBudget: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-700"
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="الحد الأدنى"
              value={filters.minPrice ?? ''}
              onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-700"
            />
            <input
              type="number"
              placeholder="الحد الأقصى"
              value={filters.maxPrice ?? ''}
              onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-700"
            />
          </div>
        )}
      </div>

      {/* Bedrooms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">غرف النوم</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...filters, bedrooms: undefined })}
            className={cn('px-3 py-1.5 text-sm rounded-full border transition-colors',
              !filters.bedrooms ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-200 text-gray-600')}
          >الكل</button>
          {bedroomOptions.map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...filters, bedrooms: filters.bedrooms === n ? undefined : n })}
              className={cn('px-3 py-1.5 text-sm rounded-full border transition-colors',
                filters.bedrooms === n ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-200 text-gray-600')}
            >
              {n === 5 ? '5+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Tier */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">مستوى التحقق</label>
        <div className="flex flex-col gap-2">
          {[
            { value: '', label: 'الكل', desc: '' },
            { value: 'LISTED', label: 'مُدرج', desc: '' },
            { value: 'VERIFIED', label: 'موثق', desc: 'مستند ملكية معتمد' },
            { value: 'GOLD', label: 'موثق ذهبي', desc: 'حصري + موقع إلكترونياً' },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onChange({ ...filters, verificationTier: value || undefined })}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 rounded-lg border text-start transition-colors',
                filters.verificationTier === value || (!value && !filters.verificationTier)
                  ? 'bg-primary-50 border-primary-700 text-primary-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              )}
            >
              <span className="text-sm font-medium">{label}</span>
              {desc && <span className="text-xs text-gray-400">{desc}</span>}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onChange(filters)}
        className="w-full"
      >
        تطبيق الفلاتر
      </Button>
    </div>
  );
}
