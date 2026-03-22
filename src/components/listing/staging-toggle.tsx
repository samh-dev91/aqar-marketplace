'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface StagingToggleProps {
  slug: string;
  imageUrl: string;
  imageIndex: number;
}

type StagingStyle = 'modern' | 'classic' | 'minimal';

interface StagingResult {
  stagedUrl: string;
  simulated: boolean;
}

const STYLE_LABELS: Record<StagingStyle, string> = {
  modern: 'عصري',
  classic: 'كلاسيكي',
  minimal: 'مينيمال',
};

export function StagingToggle({ slug, imageUrl, imageIndex }: StagingToggleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StagingResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStyleSelect = async (style: StagingStyle) => {
    setShowPicker(false);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${slug}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIndex, style }),
      });

      if (res.status === 429) {
        setError('لقد استخدمت الحد الأقصى اليوم');
        return;
      }

      if (!res.ok) {
        setError('حدث خطأ أثناء المعالجة');
        return;
      }

      const json = await res.json() as { stagedUrl: string; simulated?: boolean };
      setResult({ stagedUrl: json.stagedUrl, simulated: json.simulated ?? false });
      setShowOriginal(false);
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const activeImage = result && !showOriginal ? result.stagedUrl : imageUrl;

  return (
    <div className="relative w-full h-full">
      {/* Image display */}
      <Image
        src={activeImage}
        alt="صورة العقار"
        fill
        sizes="(max-width: 1024px) 100vw, 66vw"
        className="object-cover"
        priority
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">جاري التأثيث...</span>
          </div>
        </div>
      )}

      {/* Simulated label */}
      {result && !showOriginal && result.simulated && (
        <div className="absolute bottom-3 start-3 z-10">
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white/80">
            معاينة تجريبية
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-3 end-3 z-10 flex flex-col items-end gap-2">
        {/* Error message */}
        {error && (
          <div className="text-xs px-3 py-1.5 rounded-full bg-red-600/90 text-white max-w-[200px] text-center">
            {error}
          </div>
        )}

        {/* Toggle original / staged */}
        {result && !loading && (
          <button
            onClick={() => setShowOriginal(prev => !prev)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow transition-colors"
          >
            {showOriginal ? 'المؤثث' : 'الأصلي'} ↔ {showOriginal ? 'الأصلي' : 'المؤثث'}
          </button>
        )}

        {/* Style picker */}
        {showPicker && !loading && (
          <div className="flex flex-col gap-1 bg-white/95 rounded-xl shadow-lg p-2">
            {(Object.keys(STYLE_LABELS) as StagingStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => void handleStyleSelect(style)}
                className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-700 text-gray-800 transition-colors text-start"
              >
                {STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        )}

        {/* Main staging button */}
        {!loading && (
          <button
            onClick={() => { setShowPicker(prev => !prev); setError(null); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow transition-colors flex items-center gap-1.5"
          >
            <span>🪑</span>
            <span>اعرض مفروشاً</span>
          </button>
        )}
      </div>
    </div>
  );
}
