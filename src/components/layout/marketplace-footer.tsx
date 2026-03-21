import React from 'react';
import Link from 'next/link';

export function MarketplaceFooter() {
  return (
    <footer className="bg-primary-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ع</span>
              </div>
              <span className="font-bold text-xl">عقار ثرست</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              أوثق منصة عقارية في مصر. كل عقار موثق، كل سعر حقيقي، كل وسيط معتمد.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-200">البحث</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/search?transactionType=SALE" className="hover:text-white transition-colors">شقق للبيع</Link></li>
              <li><Link href="/search?transactionType=RENT" className="hover:text-white transition-colors">شقق للإيجار</Link></li>
              <li><Link href="/search?propertyType=VILLA" className="hover:text-white transition-colors">فيلات للبيع</Link></li>
              <li><Link href="/search?propertyType=OFFICE" className="hover:text-white transition-colors">مكاتب تجارية</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-200">عن المنصة</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">كيف يعمل عقار ثرست</Link></li>
              <li><Link href="/verification" className="hover:text-white transition-colors">نظام التحقق</Link></li>
              <li><Link href="/for-brokers" className="hover:text-white transition-colors">للوسطاء العقاريين</Link></li>
              <li><Link href="/market-reports" className="hover:text-white transition-colors">تقارير السوق</Link></li>
            </ul>
          </div>

          {/* Trust indicators */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-200">لماذا عقار ثرست؟</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ بيانات حقيقية من أنظمة الشركات</li>
              <li>✓ لا إعلانات وهمية</li>
              <li>✓ رقمك محمي حتى تقرر</li>
              <li>✓ درجة عقار لكل عقار</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} عقار ثرست. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">سياسة الخصوصية</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">الشروط والأحكام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
