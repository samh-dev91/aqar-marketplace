'use client';
import { useEffect, useState } from 'react';

interface Props {
  slug: string;
  transactionType: string;
}

interface YieldData {
  rentalYieldPercent: number;
}

type YieldTier = 'excellent' | 'good' | 'low';

function getTier(pct: number): YieldTier {
  if (pct >= 8) return 'excellent';
  if (pct >= 5) return 'good';
  return 'low';
}

const TIER_STYLES: Record<YieldTier, string> = {
  excellent: 'bg-green-50 border-green-200 text-green-800',
  good: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-gray-50 border-gray-200 text-gray-600',
};

const TIER_DOT: Record<YieldTier, string> = {
  excellent: 'bg-green-500',
  good: 'bg-amber-400',
  low: 'bg-gray-400',
};

const TIER_LABEL: Record<YieldTier, string> = {
  excellent: 'استثمار ممتاز',
  good: 'استثمار جيد',
  low: 'عائد منخفض',
};

export function RentalYieldBadge({ slug, transactionType }: Props) {
  const [data, setData] = useState<YieldData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch for sale listings
    if (transactionType !== 'SALE') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/listings/${slug}/rental-yield`)
      .then((res) => {
        if (!res.ok) throw new Error('no data');
        return res.json() as Promise<{ success: boolean; data: YieldData }>;
      })
      .then((json) => {
        if (!cancelled && json.success && json.data) {
          setData(json.data);
        }
      })
      .catch(() => {
        // Render nothing on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, transactionType]);

  // Only render for sale listings
  if (transactionType !== 'SALE') return null;

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="h-8 w-52 rounded-lg bg-gray-100 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  // No data — render nothing
  if (!data) return null;

  const tier = getTier(data.rentalYieldPercent);

  return (
    <div
      dir="rtl"
      className={`inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-cairo ${TIER_STYLES[tier]}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_DOT[tier]}`} />
      <span>
        <span className="text-gray-500 text-xs ml-1">عائد إيجار تقديري:</span>
        <strong className="mx-1">{data.rentalYieldPercent.toFixed(1)}%</strong>
        <span className="text-xs">— {TIER_LABEL[tier]}</span>
      </span>
    </div>
  );
}
