'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getTimeSince } from '@/lib/utils';

interface LiveBadgeProps {
  lastSyncAt: string;
  isStale?: boolean;
  className?: string;
}

export function LiveBadge({ lastSyncAt, isStale, className }: LiveBadgeProps) {
  if (isStale) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5', className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        قد يكون غير متاح
      </span>
    );
  }

  const { value, unit } = getTimeSince(lastSyncAt);
  const unitLabels: Record<'minutes' | 'hours' | 'days', string> = { minutes: 'دقيقة', hours: 'ساعة', days: 'يوم' };
  const label = unit === 'minutes' && value < 5 ? 'متاح الآن' : `تحقق منذ ${value} ${unitLabels[unit]}`;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      {label}
    </span>
  );
}
