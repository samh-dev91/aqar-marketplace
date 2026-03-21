import React from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'تسجيل الدخول — عقار ثرست',
  description: 'سجّل دخولك للوصول إلى مفضلاتك وتنبيهاتك على منصة عقار ثرست',
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-700 text-white text-2xl font-bold mb-4">
            ع
          </div>
          <h1 className="text-2xl font-bold text-gray-900">عقار ثرست</h1>
          <p className="text-gray-500 text-sm mt-1">سوق العقارات الموثوق في مصر</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <LoginForm />
        </div>

        {/* Trust message */}
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          🔒 رقمك آمن معنا. لا نشارك معلوماتك مع أي وسيط.
        </p>
      </div>
    </div>
  );
}
