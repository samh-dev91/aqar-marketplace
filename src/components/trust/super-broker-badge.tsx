import React from 'react';

interface SuperBrokerBadgeProps {
  tier?: string | null;
}

export function SuperBrokerBadge({ tier }: SuperBrokerBadgeProps) {
  if (!tier || tier === 'STANDARD') return null;

  if (tier === 'GOLD_BROKER') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold">
        <span aria-hidden="true">⭐</span>
        وسيط ذهبي
      </span>
    );
  }

  if (tier === 'TRUSTED') {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-semibold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3 h-3 flex-shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
            clipRule="evenodd"
          />
        </svg>
        وسيط موثوق
      </span>
    );
  }

  return null;
}
