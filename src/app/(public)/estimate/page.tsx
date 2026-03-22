import React from 'react';
import type { Metadata } from 'next';
import { EstimateForm } from './estimate-form';

export const metadata: Metadata = {
  title: 'ما قيمة عقارك؟ | عقار ثرست',
  description: 'اكتشف القيمة الحقيقية لعقارك — تقديرات مبنية على بيانات صفقات حقيقية من شبكة شركات الوساطة.',
};

export default function EstimatePage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero */}
      <section className="bg-primary-700 text-white py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold font-tajawal mb-3">
            اكتشف القيمة الحقيقية لعقارك
          </h1>
          <p className="text-primary-100 text-base sm:text-lg">
            تقديرات مبنية على بيانات صفقات حقيقية
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-tajawal">
            أدخل بيانات العقار
          </h2>
          <EstimateForm />
        </div>
      </div>

      {/* Trust signals */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary-700 font-tajawal">+5000</p>
            <p className="text-xs text-gray-500 mt-1">صفقة مرجعية</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary-700 font-tajawal">يومي</p>
            <p className="text-xs text-gray-500 mt-1">تحديث البيانات</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary-700 font-tajawal">CRM</p>
            <p className="text-xs text-gray-500 mt-1">بيانات من CRM حقيقي</p>
          </div>
        </div>
      </div>
    </div>
  );
}
