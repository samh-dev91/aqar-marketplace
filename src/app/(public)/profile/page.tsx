'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Search, Bell, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getConsumerToken, clearConsumerToken, fetchWithAuth } from '@/lib/consumer-auth';

interface ConsumerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferredCity?: string;
  budgetMin?: number;
  budgetMax?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const EGYPTIAN_CITIES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الشيخ زايد',
  'التجمع الخامس',
  '6 أكتوبر',
  'مدينة نصر',
  'المعادي',
  'الزمالك',
  'هليوبوليس',
  'أسوان',
  'الأقصر',
  'المنصورة',
  'طنطا',
  'بورسعيد',
  'السويس',
  'الغردقة',
  'شرم الشيخ',
  'العين السخنة',
  'رأس الحكمة',
];

export default function ProfilePage() {
  const router = useRouter();

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredCity, setPreferredCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const token = getConsumerToken();
    if (!token) {
      router.replace('/auth/login?redirect=/profile');
      return;
    }
    setIsReady(true);

    fetchWithAuth('/api/me')
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            clearConsumerToken();
            router.replace('/auth/login?redirect=/profile');
            return;
          }
          setError('تعذّر تحميل بياناتك. يرجى المحاولة مرة أخرى.');
          return;
        }
        const json = (await res.json()) as ApiResponse<ConsumerProfile>;
        if (json.success) {
          const p = json.data;
          setName(p.name ?? '');
          setPhone(p.phone ?? '');
          setEmail(p.email ?? '');
          setPreferredCity(p.preferredCity ?? '');
          setBudgetMin(p.budgetMin != null ? String(p.budgetMin) : '');
          setBudgetMax(p.budgetMax != null ? String(p.budgetMax) : '');
        }
      })
      .catch(() => {
        setError('تعذّر الاتصال بالخادم.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const body: Record<string, string | number> = { name };
      if (email.trim()) body.email = email.trim();
      if (preferredCity) body.preferredCity = preferredCity;
      if (budgetMin.trim()) body.budgetMin = Number(budgetMin);
      if (budgetMax.trim()) body.budgetMax = Number(budgetMax);

      const res = await fetchWithAuth('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiResponse<ConsumerProfile>;

      if (!res.ok || !json.success) {
        setError(json.message ?? 'حدث خطأ أثناء الحفظ.');
        return;
      }

      setSaveMessage('تم الحفظ ✓');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    clearConsumerToken();
    router.push('/');
  }

  if (!isReady) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">حسابي</h1>

      {error && (
        <div className="mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n}>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-11 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave} noValidate className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              الاسم
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition"
            />
          </div>

          {/* Phone — read only */}
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              رقم الهاتف
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              readOnly
              dir="ltr"
              className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed text-left"
            />
            <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير رقم الهاتف</p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition text-left"
            />
          </div>

          {/* Preferred city */}
          <div>
            <label htmlFor="profile-city" className="block text-sm font-medium text-gray-700 mb-1.5">
              المدينة المفضلة
            </label>
            <select
              id="profile-city"
              value={preferredCity}
              onChange={(e) => setPreferredCity(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition appearance-none"
            >
              <option value="">اختر مدينة</option>
              {EGYPTIAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Budget range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget-min" className="block text-sm font-medium text-gray-700 mb-1.5">
                الميزانية من (جنيه)
              </label>
              <input
                id="budget-min"
                type="number"
                inputMode="numeric"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="0"
                dir="ltr"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition text-left"
              />
            </div>
            <div>
              <label htmlFor="budget-max" className="block text-sm font-medium text-gray-700 mb-1.5">
                إلى (جنيه)
              </label>
              <input
                id="budget-max"
                type="number"
                inputMode="numeric"
                min={0}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="0"
                dir="ltr"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition text-left"
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={isSaving || !name.trim()} className="flex-1">
              {isSaving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
            </Button>
            {saveMessage && (
              <span className="text-sm text-green-600 font-medium">{saveMessage}</span>
            )}
          </div>

          {/* Quick nav links */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              روابط سريعة
            </p>
            <Link
              href="/profile/inquiries"
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                <MessageCircle size={16} className="text-primary-700" />
                استفساراتي
              </span>
              <ChevronLeft size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            <Link
              href="/profile/searches"
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                <Search size={16} className="text-primary-700" />
                بحثاتي المحفوظة
              </span>
              <ChevronLeft size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            <Link
              href="/profile/alerts"
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                <Bell size={16} className="text-primary-700" />
                تنبيهاتي
              </span>
              <ChevronLeft size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </div>

          {/* Logout */}
          <div className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              تسجيل الخروج
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
