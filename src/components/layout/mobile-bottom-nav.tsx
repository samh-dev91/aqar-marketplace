'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Building2, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', icon: Home, labelAr: 'الرئيسية' },
  { href: '/search', icon: Search, labelAr: 'بحث' },
  { href: '/projects', icon: Building2, labelAr: 'المشاريع' },
  { href: '/favorites', icon: Heart, labelAr: 'المفضلة' },
  { href: '/profile', icon: User, labelAr: 'حسابي' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {tabs.map(({ href, icon: Icon, labelAr }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href.split('?')[0]);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-primary-700'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-xs font-medium truncate">{labelAr}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
