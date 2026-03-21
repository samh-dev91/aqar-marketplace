import React from 'react';
import { cn } from '@/lib/utils';

export interface AqarScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Size config: outer px, SVG dimensions, stroke width, font size
const SIZE_CONFIG = {
  sm: { px: 48, stroke: 5, fontSize: 'text-xs', labelSize: 'text-[9px]' },
  md: { px: 64, stroke: 6, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  lg: { px: 80, stroke: 7, fontSize: 'text-base', labelSize: 'text-xs' },
} as const;

function getScoreColor(score: number): { ring: string; text: string } {
  if (score >= 80) return { ring: '#1E8449', text: 'text-emerald-700' };   // green
  if (score >= 60) return { ring: '#1B4F72', text: 'text-primary-700' };   // blue/primary
  if (score >= 40) return { ring: '#D35400', text: 'text-amber-700' };     // amber
  return { ring: '#922B21', text: 'text-red-700' };                        // red
}

export function AqarScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  className,
}: AqarScoreBadgeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const config = SIZE_CONFIG[size];
  const colors = getScoreColor(clampedScore);

  // SVG circle math
  const dim = config.px;
  const cx = dim / 2;
  const cy = dim / 2;
  const strokeWidth = config.stroke;
  // Radius shrunk so stroke fits inside viewBox
  const r = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clampedScore / 100);

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <div style={{ width: dim, height: dim }} className="relative">
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* Foreground progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>

        {/* Score number — centered over SVG */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-label={`درجة عقار: ${clampedScore}`}
        >
          <span className={cn('font-bold leading-none', config.fontSize, colors.text)}>
            {clampedScore}
          </span>
        </div>
      </div>

      {showLabel && (
        <span className={cn('font-medium text-gray-500', config.labelSize)}>
          درجة عقار
        </span>
      )}
    </div>
  );
}
