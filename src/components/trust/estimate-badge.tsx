'use client';

import React, { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EstimateData {
  direction: 'below' | 'above' | 'at_market';
  percentDiff: number;
  confidence: 'low' | 'medium' | 'high';
  methodologyAr?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  below: {
    label: 'أقل من السوق بـ',
    badgeClass: 'bg-green-50 border-green-200 text-green-800',
    dotClass: 'bg-green-500',
  },
  above: {
    label: 'أعلى من السوق بـ',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
    dotClass: 'bg-amber-400',
  },
  at_market: {
    label: 'يوافق سعر السوق',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-800',
    dotClass: 'bg-blue-500',
  },
} as const;

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  high: 'ثقة عالية',
  medium: 'ثقة متوسطة',
  low: 'ثقة منخفضة',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
}

export function EstimateBadge({ slug }: Props) {
  const [data, setData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/listings/${slug}/estimate`)
      .then((res) => {
        if (!res.ok) throw new Error('no data');
        return res.json() as Promise<{ success: boolean; data: EstimateData }>;
      })
      .then((json) => {
        if (!cancelled && json.success && json.data) {
          setData(json.data);
        }
      })
      .catch(() => {
        // Render nothing on error — swallowed intentionally
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Loading skeleton — 12px height bar
  if (loading) {
    return (
      <div
        className="h-3 w-40 rounded bg-gray-100 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  // No data or error — render nothing
  if (!data) return null;

  const cfg = DIRECTION_CONFIG[data.direction];
  const confidenceText = CONFIDENCE_LABEL[data.confidence];

  const tooltipText = data.methodologyAr
    ? `${cfg.label}${data.direction !== 'at_market' ? ` ${data.percentDiff.toFixed(1)}%` : ''} — ${confidenceText}. ${data.methodologyAr}`
    : undefined;

  return (
    <div
      dir="rtl"
      className={`inline-flex flex-col gap-0.5 border rounded-lg px-3 py-1.5 text-xs font-cairo ${cfg.badgeClass}`}
      title={tooltipText}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
        <span className="font-semibold text-[11px]">تقدير عقار ثرست</span>
      </div>
      <p className="text-xs leading-tight">
        {data.direction === 'at_market' ? (
          cfg.label
        ) : (
          <>
            {cfg.label}{' '}
            <strong>
              {new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(
                data.percentDiff,
              )}
              %
            </strong>
          </>
        )}
      </p>
      <p className="text-[10px] opacity-70">{confidenceText}</p>
    </div>
  );
}
