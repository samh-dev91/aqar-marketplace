import React from 'react';
import { MarketplaceHeader } from '@/components/layout/marketplace-header';
import { MarketplaceFooter } from '@/components/layout/marketplace-footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <MarketplaceHeader />
      <main className="flex-1">{children}</main>
      <MarketplaceFooter />
      <MobileBottomNav />
    </div>
  );
}
