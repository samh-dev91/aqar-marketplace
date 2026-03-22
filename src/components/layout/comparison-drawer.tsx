'use client';

import Link from 'next/link';
import { X, ArrowLeft, Scale } from 'lucide-react';
import { useComparisonStore } from '@/store/comparison.store';

export function ComparisonDrawer() {
  const { items, removeItem, clearAll } = useComparisonStore();

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-primary-900 text-white shadow-2xl border-t border-primary-700"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-cairo font-semibold shrink-0">
          <Scale size={16} />
          <span>مقارنة ({items.length}/3)</span>
        </div>

        <div className="flex-1 flex gap-2 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-1.5 bg-primary-800 rounded-lg px-2 py-1 text-xs font-cairo shrink-0 max-w-[140px]"
            >
              <span className="truncate">{item.titleAr}</span>
              <button
                onClick={() => removeItem(item.slug)}
                className="text-primary-300 hover:text-white shrink-0"
                aria-label="حذف"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: 3 - items.length }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center bg-primary-800/50 border border-dashed border-primary-600 rounded-lg px-4 py-1 text-xs text-primary-400 font-cairo shrink-0 w-[120px]"
            >
              + إضافة عقار
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clearAll}
            className="text-xs text-primary-300 hover:text-white font-cairo"
          >
            مسح
          </button>
          {items.length >= 2 && (
            <Link
              href={`/compare?slugs=${items.map((i) => i.slug).join(',')}`}
              className="flex items-center gap-1 text-primary-900 px-3 py-1.5 rounded-lg text-xs font-cairo font-bold transition"
              style={{ backgroundColor: '#D4AC0D' }}
            >
              قارن
              <ArrowLeft size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
