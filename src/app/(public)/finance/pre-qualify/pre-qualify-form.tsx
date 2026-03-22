'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface PreQualifyInput {
  monthlyIncome: string;
  employmentType: 'employed' | 'self_employed' | 'business' | '';
  nationality: 'egyptian' | 'other' | '';
}

interface PreQualifyResult {
  maxLoan: number;
  monthlyPayment: number;
}

const BANKS = [
  { nameAr: 'البنك الأهلي المصري', slug: 'nbe' },
  { nameAr: 'بنك القاهرة', slug: 'banque-misr' },
  { nameAr: 'سي آي بي', slug: 'cib' },
  { nameAr: 'بنك التعمير والإسكان', slug: 'hdb' },
];

const fmt = new Intl.NumberFormat('ar-EG');

function formatArabic(n: number): string {
  return fmt.format(Math.round(n));
}

export function PreQualifyForm() {
  const [form, setForm] = useState<PreQualifyInput>({
    monthlyIncome: '',
    employmentType: '',
    nationality: '',
  });
  const [result, setResult] = useState<PreQualifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const income = parseFloat(form.monthlyIncome);
    if (!income || income <= 0) {
      setError('يرجى إدخال دخل شهري صحيح');
      return;
    }
    if (!form.employmentType) {
      setError('يرجى اختيار نوع التوظيف');
      return;
    }
    if (!form.nationality) {
      setError('يرجى اختيار الجنسية');
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/finance/pre-qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: income,
          employmentType: form.employmentType,
          nationality: form.nationality,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        setError(json.message ?? 'حدث خطأ، يرجى المحاولة مرة أخرى');
        return;
      }

      const json = (await res.json()) as {
        success: boolean;
        data: PreQualifyResult;
      };
      if (json.success && json.data) {
        setResult(json.data);
      } else {
        setError('حدث خطأ، يرجى المحاولة مرة أخرى');
      }
    } catch {
      setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm"
      >
        {/* Monthly income */}
        <div>
          <label
            htmlFor="monthlyIncome"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            الدخل الشهري بالجنيه
          </label>
          <input
            id="monthlyIncome"
            name="monthlyIncome"
            type="number"
            min="0"
            step="100"
            value={form.monthlyIncome}
            onChange={handleChange}
            placeholder="مثال: ٢٠٠٠٠"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent placeholder:text-gray-400"
            dir="ltr"
          />
        </div>

        {/* Employment type */}
        <div>
          <label
            htmlFor="employmentType"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            نوع التوظيف
          </label>
          <select
            id="employmentType"
            name="employmentType"
            value={form.employmentType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent bg-white text-gray-700"
          >
            <option value="">اختر نوع التوظيف</option>
            <option value="employed">موظف</option>
            <option value="self_employed">عمل حر</option>
            <option value="business">صاحب عمل</option>
          </select>
        </div>

        {/* Nationality */}
        <div>
          <label
            htmlFor="nationality"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            الجنسية
          </label>
          <select
            id="nationality"
            name="nationality"
            value={form.nationality}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent bg-white text-gray-700"
          >
            <option value="">اختر الجنسية</option>
            <option value="egyptian">مصري</option>
            <option value="other">أجنبي</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-700 hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              جارٍ الحساب...
            </>
          ) : (
            'احسب التأهيل'
          )}
        </button>
      </form>

      {/* Result card */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl border border-primary-200 p-6 shadow-sm space-y-5">
          {/* Max loan display */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">يمكنك الحصول على تمويل حتى</p>
            <p className="text-4xl font-bold text-primary-700">
              {formatArabic(result.maxLoan)}
            </p>
            <p className="text-base text-gray-500 mt-0.5">جنيه</p>
          </div>

          {/* Monthly payment */}
          <div className="bg-gray-50 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">قسط شهري تقديري (٢٠ سنة)</span>
            <span className="font-bold text-gray-900">
              {formatArabic(result.monthlyPayment)} جنيه
            </span>
          </div>

          {/* Bank suggestions */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">البنوك المقترحة</p>
            <ul className="space-y-2">
              {BANKS.map((bank) => (
                <li
                  key={bank.slug}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{bank.nameAr}</span>
                  <a
                    href="#"
                    className="text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors"
                  >
                    تقدم للتمويل ›
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Search with budget CTA */}
          <Link
            href={`/search?maxPrice=${result.maxLoan}`}
            className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            ابحث عن عقارات ضمن ميزانيتك
          </Link>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            * هذا تقدير مبدئي. يخضع التمويل الفعلي لشروط كل بنك على حدة.
          </p>
        </div>
      )}
    </div>
  );
}
