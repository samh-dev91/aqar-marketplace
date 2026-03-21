'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface PriceHistoryEntry {
  price: string;
  changeType: string;
  recordedAt: string;
}

interface PriceHistoryChartProps {
  history: PriceHistoryEntry[];
  className?: string;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  INCREASE: 'ارتفاع',
  DECREASE: 'انخفاض',
  INITIAL: 'سعر أولي',
};

function formatAxisDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    month: 'short',
    year: '2-digit',
  });
}

function formatAxisPrice(value: number): string {
  // Strip currency suffix for axis readability
  const formatted = formatPrice(String(value));
  // Remove trailing " EGP" or " جنيه"
  return formatted.replace(/ جنيه$/, '').replace(/ EGP$/, '');
}

interface TooltipPayloadEntry {
  value: number;
  payload: PriceHistoryEntry & { priceNum: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const { recordedAt, changeType } = entry.payload;
  const price = entry.value;

  const dateLabel = new Date(recordedAt).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const changeLabel = CHANGE_TYPE_LABELS[changeType] ?? changeType;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm" dir="rtl">
      <p className="font-bold text-primary-700">{formatPrice(String(price))} جنيه</p>
      <p className="text-gray-500 text-xs mt-0.5">{dateLabel}</p>
      <p className="text-xs mt-0.5">
        <span
          className={
            changeType === 'INCREASE'
              ? 'text-danger font-medium'
              : changeType === 'DECREASE'
              ? 'text-success font-medium'
              : 'text-gray-500'
          }
        >
          {changeLabel}
        </span>
      </p>
    </div>
  );
}

export function PriceHistoryChart({ history, className }: PriceHistoryChartProps) {
  if (history.length < 2) {
    return (
      <div
        className={cn(
          'bg-gray-50 border border-gray-200 rounded-xl p-5 text-center',
          className
        )}
      >
        <h3 className="font-bold text-gray-900 mb-2">تاريخ الأسعار</h3>
        <p className="text-sm text-gray-400">لا توجد بيانات تاريخية كافية</p>
      </div>
    );
  }

  const chartData = history.map((entry) => ({
    ...entry,
    priceNum: parseFloat(entry.price),
    dateLabel: formatAxisDate(entry.recordedAt),
  }));

  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-5', className)}>
      <h3 className="font-bold text-gray-900 mb-4">تاريخ الأسعار</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'Cairo, sans-serif' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tickFormatter={formatAxisPrice}
            tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'Cairo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="priceNum"
            stroke="#1B4F72"
            strokeWidth={2}
            dot={{ r: 4, fill: '#1B4F72', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#D4AC0D', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
