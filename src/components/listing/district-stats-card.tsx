import React from 'react';
import Decimal from 'decimal.js';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface DistrictStats {
  city: string;
  district: string;
  listingCount: number;
  avgPricePerSqm: string;
  medianPrice: string;
  priceChangePercent: string | null;
  avgDaysOnMarket: number | null;
}

interface DistrictStatsCardProps {
  stats: DistrictStats;
  listingPrice: string;
  listingArea: string | null;
  className?: string;
}

export function DistrictStatsCard({
  stats,
  listingPrice,
  listingArea,
  className,
}: DistrictStatsCardProps) {
  // Compute price comparison if we have area and avgPricePerSqm
  let priceComparisonEl: React.ReactNode = null;

  if (listingArea !== null && listingArea !== '0' && stats.avgPricePerSqm !== '0') {
    const thisPrice = new Decimal(listingPrice);
    const area = new Decimal(listingArea);
    const thisPricePerSqm = thisPrice.div(area);
    const avgPricePerSqm = new Decimal(stats.avgPricePerSqm);

    // Difference as percent: (thisPricePerSqm - avg) / avg * 100
    const diffPct = thisPricePerSqm.minus(avgPricePerSqm).div(avgPricePerSqm).times(100);
    const diffNum = diffPct.toDecimalPlaces(1).toNumber();
    const absStr = Math.abs(diffNum).toFixed(1);

    let colorClass: string;
    let label: string;

    if (diffNum < 0) {
      // Below avg — good deal
      colorClass = 'text-success';
      label = `سعر هذا العقار ${absStr}% أقل من متوسط المنطقة`;
    } else if (diffNum <= 10) {
      // 0–10% above — amber
      colorClass = 'text-warning';
      label = `سعر هذا العقار ${absStr}% أعلى من متوسط المنطقة`;
    } else {
      // >10% above — red
      colorClass = 'text-danger';
      label = `سعر هذا العقار ${absStr}% أعلى من متوسط المنطقة`;
    }

    priceComparisonEl = (
      <div className={cn('text-sm font-semibold mt-1', colorClass)}>{label}</div>
    );
  }

  // Parse priceChangePercent for display
  let priceChangeEl: React.ReactNode = null;
  if (stats.priceChangePercent !== null) {
    const changeNum = parseFloat(stats.priceChangePercent);
    const isPositive = changeNum >= 0;
    const sign = isPositive ? '+' : '';
    const colorClass = isPositive ? 'text-danger' : 'text-success';
    priceChangeEl = (
      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-600">تغير الأسعار</span>
        <span className={cn('text-sm font-bold', colorClass)}>
          {sign}{parseFloat(stats.priceChangePercent).toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-blue-50 border border-blue-100 rounded-xl p-5',
        className
      )}
    >
      <h3 className="font-bold text-gray-900 mb-4">إحصاءات {stats.district}</h3>

      <div className="bg-white rounded-lg divide-y divide-gray-100 overflow-hidden shadow-sm">
        {/* Row 1: avg price per sqm */}
        <div className="flex justify-between items-center px-4 py-2.5">
          <span className="text-sm text-gray-600">متوسط سعر المتر</span>
          <span className="text-sm font-bold text-primary-700">
            {formatPrice(stats.avgPricePerSqm)} جنيه/م²
          </span>
        </div>

        {/* Row 2: median price */}
        <div className="flex justify-between items-center px-4 py-2.5">
          <span className="text-sm text-gray-600">متوسط سعر العقارات</span>
          <span className="text-sm font-bold text-primary-700">
            {formatPrice(stats.medianPrice)} جنيه
          </span>
        </div>

        {/* Row 3: listing count */}
        <div className="flex justify-between items-center px-4 py-2.5">
          <span className="text-sm text-gray-600">عدد العقارات المتاحة</span>
          <span className="text-sm font-bold text-gray-900">
            {stats.listingCount.toLocaleString('ar-EG')} عقار
          </span>
        </div>

        {/* Row 4: avg days on market (conditional) */}
        {stats.avgDaysOnMarket !== null && (
          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-sm text-gray-600">متوسط مدة البيع</span>
            <span className="text-sm font-bold text-gray-900">
              {stats.avgDaysOnMarket} يوم
            </span>
          </div>
        )}

        {/* Row 5: price change (conditional) */}
        {priceChangeEl && (
          <div className="px-4">{priceChangeEl}</div>
        )}
      </div>

      {/* Price comparison block */}
      {priceComparisonEl && (
        <div className="mt-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
          {priceComparisonEl}
          <p className="text-xs text-gray-400 mt-1">
            بناءً على سعر المتر مقارنةً بمتوسط {stats.district}
          </p>
        </div>
      )}
    </div>
  );
}
