import React from 'react';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, reviewCount, size = 'md' }: StarRatingProps) {
  const starSize = size === 'sm' ? 12 : 16;
  const clampedRating = Math.max(0, Math.min(5, rating));

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className="flex items-center gap-0.5"
        aria-label={`تقييم ${clampedRating} من 5`}
        role="img"
      >
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < Math.round(clampedRating);
          return (
            <span
              key={i}
              style={{
                fontSize: starSize,
                lineHeight: 1,
                color: filled ? '#D4AC0D' : '#E5E7EB',
              }}
              aria-hidden="true"
            >
              {filled ? '★' : '☆'}
            </span>
          );
        })}
      </span>
      {reviewCount !== undefined && (
        <span
          className={size === 'sm' ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}
        >
          ({reviewCount.toLocaleString('ar-EG')} تقييم)
        </span>
      )}
    </div>
  );
}
