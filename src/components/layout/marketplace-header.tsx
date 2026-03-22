'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, Heart, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MarketplaceHeaderProps {
  locale?: string;
}

export function MarketplaceHeader({ locale = 'ar' }: MarketplaceHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ع</span>
            </div>
            <span className="font-bold text-primary-700 text-lg hidden sm:block">عقار ثرست</span>
          </Link>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-4">
            <div className="flex w-full items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden hover:border-primary-700 transition-colors focus-within:border-primary-700 focus-within:ring-1 focus-within:ring-primary-700">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالموقع أو الحي أو نوع العقار..."
                className="flex-1 bg-transparent px-5 py-2.5 text-sm outline-none text-gray-700 placeholder:text-gray-400"
                dir="rtl"
              />
              <button
                type="submit"
                className="bg-primary-700 hover:bg-primary-900 text-white px-5 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Search size={16} />
                <span className="text-sm font-medium">بحث</span>
              </button>
            </div>
          </form>

          {/* Nav actions */}
          <div className="flex items-center gap-2 ms-auto">
            {/* Quick links — desktop */}
            <nav className="hidden lg:flex items-center gap-1 text-sm">
              <Link href="/search?transactionType=SALE" className="px-3 py-2 text-gray-600 hover:text-primary-700 rounded-md hover:bg-gray-50 transition-colors">
                للبيع
              </Link>
              <Link href="/search?transactionType=RENT" className="px-3 py-2 text-gray-600 hover:text-primary-700 rounded-md hover:bg-gray-50 transition-colors">
                للإيجار
              </Link>
              <Link href="/projects" className="px-3 py-2 text-gray-600 hover:text-primary-700 rounded-md hover:bg-gray-50 transition-colors">
                المشاريع
              </Link>
              <Link href="/finance" className="px-3 py-2 text-gray-600 hover:text-primary-700 rounded-md hover:bg-gray-50 transition-colors">
                التمويل
              </Link>
              <Link href="/guide" className="px-3 py-2 text-gray-600 hover:text-primary-700 rounded-md hover:bg-gray-50 transition-colors">
                الأدلة
              </Link>
            </nav>

            {/* Language switch */}
            <button className="text-sm text-gray-500 hover:text-primary-700 px-2 py-1 rounded">
              {locale === 'ar' ? 'EN' : 'ع'}
            </button>

            {/* Favorites */}
            <Link href="/favorites" className="p-2 text-gray-500 hover:text-primary-700 relative">
              <Heart size={20} />
            </Link>

            {/* Login */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/login">
                <User size={16} />
                <span className="hidden sm:inline">دخول</span>
              </Link>
            </Button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-500"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="القائمة"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن عقار..."
              className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
              dir="rtl"
            />
            <button type="submit" className="bg-primary-700 text-white px-4 py-2">
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3">
          <nav className="flex flex-col gap-1">
            <Link href="/search?transactionType=SALE" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              شقق وعقارات للبيع
            </Link>
            <Link href="/search?transactionType=RENT" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              شقق وعقارات للإيجار
            </Link>
            <Link href="/projects" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              مشاريع التطوير العقاري
            </Link>
            <Link href="/finance" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              الحلول التمويلية
            </Link>
            <Link href="/guide" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              أدلة الأحياء
            </Link>
            <Link href="/search" className="px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md" onClick={() => setMenuOpen(false)}>
              البحث المتقدم
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
