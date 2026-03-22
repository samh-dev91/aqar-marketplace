import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calculator, CreditCard, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الحلول التمويلية | عقار ثرست',
  description: 'كل ما تحتاجه للتمويل العقاري — التأهل المسبق، حاسبة الأقساط، وعقارات بالتقسيط',
};

export const revalidate = 86400;

const PARTNER_BANKS = [
  { nameAr: 'البنك الأهلي المصري', nameEn: 'NBE' },
  { nameAr: 'سي آي بي', nameEn: 'CIB' },
  { nameAr: 'بنك مصر', nameEn: 'Banque Misr' },
  { nameAr: 'بنك التعمير والإسكان', nameEn: 'HDB' },
];

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero */}
      <section className="bg-primary-700 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">الحلول التمويلية</h1>
          <p className="text-primary-200 text-lg">
            ابدأ رحلتك نحو امتلاك عقارك — نساعدك في كل خطوة
          </p>
        </div>
      </section>

      {/* Three action cards */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Pre-qualify */}
          <Link
            href="/finance/pre-qualify"
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-4"
          >
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors">
              <CreditCard size={24} className="text-primary-700 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 mb-1">التأهل للتمويل</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                احسب الحد الأقصى للقرض العقاري المتاح لك بناءً على دخلك الشهري
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-primary-700 text-sm font-semibold">
              <span>احسب الآن</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </Link>

          {/* Installment calculator */}
          <Link
            href="/district/cairo/maadi"
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-500 transition-colors">
              <Calculator size={24} className="text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 mb-1">حاسبة الأقساط</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                احسب قيمة القسط الشهري لأي عقار حسب المقدم ومدة السداد
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-amber-600 text-sm font-semibold">
              <span>ابدأ الحساب</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </Link>

          {/* Properties with financing */}
          <Link
            href="/search?hasFinancing=true"
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-4"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
              <Search size={24} className="text-green-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 mb-1">عقارات بالتقسيط</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                تصفّح عقارات ومشاريع تتيح نظام التقسيط المريح
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-green-600 text-sm font-semibold">
              <span>اعرض العقارات</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </Link>
        </div>
      </section>

      {/* Partner banks */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          البنوك الشريكة
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PARTNER_BANKS.map((bank) => (
            <div
              key={bank.nameEn}
              className="bg-white rounded-xl border border-gray-200 px-4 py-5 flex flex-col items-center gap-1 shadow-sm"
            >
              <p className="font-bold text-primary-900 text-sm text-center">
                {bank.nameAr}
              </p>
              <p className="text-xs text-gray-400">{bank.nameEn}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          * الشراكات تمثيلية. التمويل خاضع للشروط والأحكام لكل بنك.
        </p>
      </section>
    </div>
  );
}
