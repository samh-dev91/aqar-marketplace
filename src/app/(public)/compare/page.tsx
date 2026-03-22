'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, X, ArrowRight } from 'lucide-react';
import { useComparisonStore } from '@/store/comparison.store';
import { VerificationBadge } from '@/components/trust/verification-badge';
import { formatPrice } from '@/lib/format';

interface ComparisonListing {
  slug: string;
  titleAr: string;
  propertyType: string;
  city: string;
  district: string | null;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  parkingSpaces: number | null;
  isFurnished: boolean | null;
  askingPrice: string;
  pricePerSqm: string | null;
  verificationTier: string;
  aqarScore: number | null;
  hasFinancing: boolean;
  monthlyFrom: string | null;
  images: string[];
  firmNameAr: string;
}

type CompareRowKey =
  | 'price'
  | 'pricePerSqm'
  | 'area'
  | 'bedrooms'
  | 'bathrooms'
  | 'floor'
  | 'parking'
  | 'furnished'
  | 'aqarScore'
  | 'financing'
  | 'firm';

const ROWS: { key: CompareRowKey; label: string }[] = [
  { key: 'price', label: 'السعر' },
  { key: 'pricePerSqm', label: 'سعر المتر' },
  { key: 'area', label: 'المساحة' },
  { key: 'bedrooms', label: 'غرف النوم' },
  { key: 'bathrooms', label: 'الحمامات' },
  { key: 'floor', label: 'الطابق' },
  { key: 'parking', label: 'مواقف' },
  { key: 'furnished', label: 'التأثيث' },
  { key: 'aqarScore', label: 'درجة عقار' },
  { key: 'financing', label: 'التمويل' },
  { key: 'firm', label: 'الوسيط' },
];

function getValue(l: ComparisonListing, key: CompareRowKey): string {
  switch (key) {
    case 'price':
      return formatPrice(Number(l.askingPrice));
    case 'pricePerSqm':
      return l.pricePerSqm
        ? `${Number(l.pricePerSqm).toLocaleString('ar-EG')} ج.م/م²`
        : '—';
    case 'area':
      return l.area ? `${Number(l.area).toLocaleString('ar-EG')} م²` : '—';
    case 'bedrooms':
      return l.bedrooms?.toString() ?? '—';
    case 'bathrooms':
      return l.bathrooms?.toString() ?? '—';
    case 'floor':
      return l.floor != null
        ? `${l.floor}${l.totalFloors ? ` من ${l.totalFloors}` : ''}`
        : '—';
    case 'parking':
      return l.parkingSpaces?.toString() ?? '—';
    case 'furnished':
      return l.isFurnished == null ? '—' : l.isFurnished ? 'مفروش' : 'غير مفروش';
    case 'aqarScore':
      return l.aqarScore ? `${l.aqarScore}/100` : '—';
    case 'financing':
      return l.hasFinancing && l.monthlyFrom
        ? `من ${Number(l.monthlyFrom).toLocaleString('ar-EG')} ج.م/شهر`
        : 'غير متاح';
    case 'firm':
      return l.firmNameAr;
    default:
      return '—';
  }
}

function isBestValue(
  listings: ComparisonListing[],
  key: CompareRowKey,
  index: number,
): boolean {
  if (key === 'price' || key === 'pricePerSqm') {
    const prices = listings.map((l) =>
      Number(key === 'price' ? l.askingPrice : (l.pricePerSqm ?? Infinity)),
    );
    return prices[index] === Math.min(...prices);
  }
  if (key === 'aqarScore') {
    const scores = listings.map((l) => l.aqarScore ?? 0);
    return scores[index] === Math.max(...scores);
  }
  return false;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const { removeItem } = useComparisonStore();
  const [listings, setListings] = useState<ComparisonListing[]>([]);
  const [loading, setLoading] = useState(true);

  const slugsParam = searchParams.get('slugs') ?? '';

  useEffect(() => {
    if (!slugsParam) {
      setLoading(false);
      return;
    }
    fetch(`/api/compare?slugs=${slugsParam}`)
      .then((r) => r.json())
      .then((d: { listings?: ComparisonListing[] }) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slugsParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 font-cairo">جاري التحميل...</p>
      </div>
    );
  }

  if (listings.length < 2) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4"
        dir="rtl"
      >
        <p className="text-gray-500 font-cairo">أضف عقارين على الأقل للمقارنة</p>
        <Link
          href="/search"
          className="bg-primary-700 text-white px-6 py-2 rounded-xl font-cairo text-sm"
        >
          تصفح العقارات
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/search"
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-cairo"
          >
            <ArrowRight size={14} />
            العودة للبحث
          </Link>
          <h1 className="text-xl font-bold font-tajawal text-gray-900">مقارنة العقارات</h1>
        </div>

        {/* Header row — images + titles */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <div
            className="grid divide-x divide-x-reverse divide-gray-100"
            style={{ gridTemplateColumns: `repeat(${listings.length}, 1fr)` }}
          >
            {listings.map((l, i) => (
              <div key={l.slug} className="relative p-4 text-center">
                <button
                  onClick={() => {
                    removeItem(l.slug);
                  }}
                  className="absolute top-2 left-2 text-gray-300 hover:text-red-500 transition"
                >
                  <X size={14} />
                </button>
                {l.images[0] && (
                  <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                    <Image
                      src={l.images[0]}
                      alt={l.titleAr}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                )}
                <Link
                  href={`/listings/${l.slug}`}
                  className="font-semibold text-sm font-cairo text-primary-800 hover:underline line-clamp-2"
                >
                  {l.titleAr}
                </Link>
                <div className="mt-2 flex justify-center">
                  <VerificationBadge
                    tier={l.verificationTier as 'LISTED' | 'VERIFIED' | 'GOLD'}
                    size="sm"
                  />
                </div>
                {isBestValue(listings, 'price', i) && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-cairo">
                    <CheckCircle size={10} />
                    أفضل سعر
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison rows */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {ROWS.map((row, rowIdx) => (
            <div
              key={row.key}
              className={`grid divide-x divide-x-reverse divide-gray-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              style={{
                gridTemplateColumns: `140px repeat(${listings.length}, 1fr)`,
              }}
            >
              <div className="px-4 py-3 text-xs font-semibold text-gray-500 font-cairo flex items-center border-l border-gray-100">
                {row.label}
              </div>
              {listings.map((l, i) => {
                const val = getValue(l, row.key);
                const best = isBestValue(listings, row.key, i);
                return (
                  <div
                    key={l.slug}
                    className={`px-4 py-3 text-sm font-cairo text-center ${best ? 'text-green-700 font-semibold bg-green-50/50' : 'text-gray-700'}`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bulk inquiry */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600 font-cairo mb-3">
            هل تريد الاستفسار عن جميع هذه العقارات؟
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {listings.map((l) => (
              <Link
                key={l.slug}
                href={`/listings/${l.slug}`}
                className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-cairo hover:bg-primary-800 transition"
              >
                استفسر — {l.titleAr.slice(0, 20)}...
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500 font-cairo">جاري التحميل...</p>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
