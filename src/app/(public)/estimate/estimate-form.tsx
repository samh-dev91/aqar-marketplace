'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EstimateParams {
  city: string;
  district: string;
  propertyType: string;
  area: string;
  bedrooms?: string;
  floor?: string;
  isFurnished: boolean;
}

interface Comparable {
  district: string;
  propertyType: string;
  area: number;
  price: number;
  daysAgo: number;
}

interface EstimateResult {
  rangeLow: number;
  rangeHigh: number;
  confidence: 'low' | 'medium' | 'high';
  methodologyAr: string;
  comparables: Comparable[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CITIES = [
  { value: 'القاهرة', label: 'القاهرة' },
  { value: 'الجيزة', label: 'الجيزة' },
  { value: 'الإسكندرية', label: 'الإسكندرية' },
  { value: 'العاشر من رمضان', label: 'العاشر من رمضان' },
  { value: 'الشيخ زايد', label: 'الشيخ زايد' },
  { value: '6 أكتوبر', label: '6 أكتوبر' },
];

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'شقة' },
  { value: 'VILLA', label: 'فيلا' },
  { value: 'DUPLEX', label: 'دوبلكس' },
  { value: 'PENTHOUSE', label: 'بنتهاوس' },
  { value: 'OFFICE', label: 'مكتب' },
  { value: 'SHOP', label: 'محل' },
  { value: 'TOWNHOUSE', label: 'تاون هاوس' },
  { value: 'LAND', label: 'أرض' },
];

const BEDROOM_OPTIONS = [
  { value: '1', label: '١ غرفة' },
  { value: '2', label: '٢ غرفة' },
  { value: '3', label: '٣ غرف' },
  { value: '4', label: '٤ غرف' },
  { value: '5', label: '٥+ غرف' },
];

const CONFIDENCE_CONFIG = {
  low: {
    dots: 1,
    color: 'bg-amber-400',
    emptyColor: 'bg-gray-200',
    label: 'ثقة منخفضة',
    labelColor: 'text-amber-700',
  },
  medium: {
    dots: 2,
    color: 'bg-blue-500',
    emptyColor: 'bg-gray-200',
    label: 'ثقة متوسطة',
    labelColor: 'text-blue-700',
  },
  high: {
    dots: 3,
    color: 'bg-green-500',
    emptyColor: 'bg-gray-200',
    label: 'ثقة عالية',
    labelColor: 'text-green-700',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatArabic(num: number): string {
  return new Intl.NumberFormat('ar-EG').format(Math.round(num));
}

function getPropTypeLabel(value: string): string {
  return PROPERTY_TYPES.find((p) => p.value === value)?.label ?? value;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const cfg = CONFIDENCE_CONFIG[confidence];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full ${i <= cfg.dots ? cfg.color : cfg.emptyColor}`}
          />
        ))}
      </div>
      <span className={`text-sm font-medium ${cfg.labelColor}`}>{cfg.label}</span>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-4" aria-busy="true" aria-label="جاري الحساب">
      <div className="h-10 bg-gray-200 rounded-lg w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ComparableCard({ comp }: { comp: Comparable }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-gray-900">{comp.district}</span>
        <span className="text-xs text-gray-400">{formatArabic(comp.daysAgo)} يوم مضى</span>
      </div>
      <div className="text-gray-600 text-xs mb-2">
        {getPropTypeLabel(comp.propertyType)} — {formatArabic(comp.area)} م²
      </div>
      <div className="font-bold text-primary-700">
        {formatArabic(comp.price)}
        <span className="text-xs font-normal text-gray-500 me-1"> جنيه</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EstimateForm() {
  const [params, setParams] = useState<EstimateParams>({
    city: '',
    district: '',
    propertyType: '',
    area: '',
    bedrooms: '',
    floor: '',
    isFurnished: false,
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setParams((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setParams((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const qs = new URLSearchParams();
      qs.set('city', params.city);
      qs.set('district', params.district);
      qs.set('propertyType', params.propertyType);
      qs.set('area', params.area);
      if (params.bedrooms) qs.set('bedrooms', params.bedrooms);
      if (params.floor) qs.set('floor', params.floor);
      qs.set('isFurnished', String(params.isFurnished));

      const res = await fetch(`/api/estimate?${qs.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        throw new Error(json.message ?? 'error');
      }

      const json = (await res.json()) as { success: boolean; data: EstimateResult; message?: string };

      if (!json.success || !json.data) {
        throw new Error(json.message ?? 'no_data');
      }

      setResult(json.data);
      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'error';
      setErrorMsg(msg === 'no_data' || msg.includes('insufficient')
        ? 'بيانات غير كافية لتقدير هذا النوع في هذه المنطقة. جرّب منطقة مجاورة.'
        : 'حدث خطأ أثناء الحساب. يرجى المحاولة مرة أخرى.');
      setStatus('error');
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-700/30 focus:border-primary-700 transition';

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div dir="rtl">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
        {/* Row: city + district */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className={labelClass}>
              المدينة <span className="text-red-500">*</span>
            </label>
            <select
              id="city"
              name="city"
              value={params.city}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="">اختر المدينة</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="district" className={labelClass}>
              الحي / المنطقة <span className="text-red-500">*</span>
            </label>
            <input
              id="district"
              name="district"
              type="text"
              value={params.district}
              onChange={handleChange}
              placeholder="مثال: المهندسين، مدينة نصر"
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Row: propertyType + area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="propertyType" className={labelClass}>
              نوع العقار <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={params.propertyType}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="">اختر النوع</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="area" className={labelClass}>
              المساحة (م²) <span className="text-red-500">*</span>
            </label>
            <input
              id="area"
              name="area"
              type="number"
              min={20}
              max={2000}
              value={params.area}
              onChange={handleChange}
              placeholder="مثال: 120"
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Row: bedrooms + floor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bedrooms" className={labelClass}>
              عدد الغرف
              <span className="text-gray-400 font-normal text-xs me-1"> (اختياري)</span>
            </label>
            <select
              id="bedrooms"
              name="bedrooms"
              value={params.bedrooms}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">غير محدد</option>
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="floor" className={labelClass}>
              الطابق
              <span className="text-gray-400 font-normal text-xs me-1"> (اختياري)</span>
            </label>
            <input
              id="floor"
              name="floor"
              type="number"
              min={0}
              max={80}
              value={params.floor}
              onChange={handleChange}
              placeholder="مثال: 3"
              className={inputClass}
            />
          </div>
        </div>

        {/* Furnished checkbox */}
        <div className="flex items-center gap-3">
          <input
            id="isFurnished"
            name="isFurnished"
            type="checkbox"
            checked={params.isFurnished}
            onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
          />
          <label htmlFor="isFurnished" className="text-sm text-gray-700 cursor-pointer select-none">
            مفروش
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !params.city || !params.district || !params.propertyType || !params.area}
          className="w-full bg-primary-700 hover:bg-primary-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
        >
          {status === 'loading' ? 'جاري الحساب...' : 'احسب التقدير'}
        </button>
      </form>

      {/* Loading skeleton */}
      {status === 'loading' && <ResultSkeleton />}

      {/* Error state */}
      {status === 'error' && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Result */}
      {status === 'success' && result && (
        <div className="mt-8 space-y-6">
          {/* Price range */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
            <p className="text-xs text-primary-600 font-medium mb-1">تقدير عقار ثرست</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary-800 leading-tight">
              {formatArabic(result.rangeLow)}
              <span className="text-xl font-normal mx-1">—</span>
              {formatArabic(result.rangeHigh)}
              <span className="text-base font-normal text-primary-600 me-2"> جنيه</span>
            </p>
            <div className="mt-3">
              <ConfidenceBar confidence={result.confidence} />
            </div>
          </div>

          {/* Methodology */}
          {result.methodologyAr && (
            <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
              <span className="font-medium text-gray-700">المنهجية: </span>
              {result.methodologyAr}
            </div>
          )}

          {/* Comparables */}
          {result.comparables && result.comparables.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm">عقارات مقارنة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.comparables.slice(0, 5).map((comp, i) => (
                  <ComparableCard key={i} comp={comp} />
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white text-center">
            <p className="font-semibold mb-1">هل تريد بيع عقارك؟</p>
            <p className="text-gray-300 text-sm mb-3">
              سجّل عقارك عبر شركتك العقارية على منصة عقار ثرست وصل لآلاف المشترين
            </p>
            <Link
              href="https://crm.aqar-trust.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary-700 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              سجّل عقارك عبر شركتك العقارية
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
