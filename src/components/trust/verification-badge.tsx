'use client';

import React from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type VerificationTier = 'LISTED' | 'VERIFIED' | 'GOLD';

interface VerificationBadgeProps {
  tier: VerificationTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const tierConfig: Record<VerificationTier, {
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
}> = {
  LISTED: {
    icon: Shield,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    labelAr: 'مُدرج',
    labelEn: 'Listed',
    descAr: 'العقار مدرج في نظام الشركة مع صور وتفاصيل',
  },
  VERIFIED: {
    icon: ShieldCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    labelAr: 'موثق',
    labelEn: 'Verified',
    descAr: 'مستند ملكية أو اتفاقية وساطة معتمدة + شركة نشطة',
  },
  GOLD: {
    icon: ShieldCheck,
    color: 'text-gold',
    bg: 'bg-gold-50',
    border: 'border-gold-100',
    labelAr: 'موثق ذهبي',
    labelEn: 'Gold Verified',
    descAr: 'حصري + عقد موقع إلكترونياً + كل معايير الموثق',
  },
};

const sizeConfig = {
  sm: { icon: 14, text: 'text-xs', padding: 'px-1.5 py-0.5', gap: 'gap-1' },
  md: { icon: 16, text: 'text-sm', padding: 'px-2 py-1', gap: 'gap-1.5' },
  lg: { icon: 20, text: 'text-base', padding: 'px-3 py-1.5', gap: 'gap-2' },
};

export function VerificationBadge({
  tier,
  size = 'md',
  showLabel = true,
  className,
}: VerificationBadgeProps) {
  const config = tierConfig[tier];
  const s = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        config.bg,
        config.border,
        s.padding,
        s.gap,
        className
      )}
      title={config.descAr}
    >
      <Icon size={s.icon} className={config.color} />
      {showLabel && (
        <span className={cn('font-medium', s.text, config.color)}>
          {config.labelAr}
        </span>
      )}
    </div>
  );
}

export function VerificationBadgeEn({ tier, size = 'md', showLabel = true, className }: VerificationBadgeProps) {
  const config = tierConfig[tier];
  const s = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn('inline-flex items-center rounded-full border', config.bg, config.border, s.padding, s.gap, className)}
      title={config.descAr}
    >
      <Icon size={s.icon} className={config.color} />
      {showLabel && <span className={cn('font-medium', s.text, config.color)}>{config.labelEn}</span>}
    </div>
  );
}
