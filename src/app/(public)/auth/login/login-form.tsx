'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setConsumerToken } from '@/lib/consumer-auth';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp';

interface OtpSendResponse {
  success: boolean;
  message?: string;
  isNewUser?: boolean;
}

interface OtpVerifyResponse {
  success: boolean;
  token?: string;
  isNewUser?: boolean;
  message?: string;
}

const RESEND_DELAY_SECONDS = 60;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCountdown = useCallback(() => {
    setResendCountdown(RESEND_DELAY_SECONDS);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = (await res.json()) as OtpSendResponse;

      if (!res.ok || !data.success) {
        setError(data.message ?? 'حدث خطأ. يرجى المحاولة مرة أخرى.');
        return;
      }

      setStep('otp');
      startResendCountdown();
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const body: { phone: string; code: string; name?: string } = { phone, code: otp };
      if (isNewUser && name.trim()) body.name = name.trim();

      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as OtpVerifyResponse;

      if (!res.ok || !data.success) {
        setError(data.message ?? 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
        return;
      }

      if (data.isNewUser) {
        setIsNewUser(true);
        if (!name.trim()) {
          // Need name before finalizing — show name field and stay on step
          setIsLoading(false);
          return;
        }
      }

      if (data.token) {
        setConsumerToken(data.token);
        router.push(redirectTo);
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = (await res.json()) as OtpSendResponse;

      if (!res.ok || !data.success) {
        setError(data.message ?? 'حدث خطأ أثناء إعادة الإرسال.');
        return;
      }

      setOtp('');
      startResendCountdown();
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handleSendOtp} noValidate>
        <h2 className="text-xl font-bold text-gray-900 mb-1">مرحباً بك في عقار ثرست</h2>
        <p className="text-gray-500 text-sm mb-6">أدخل رقم هاتفك للمتابعة</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            رقم الهاتف
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01xxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            dir="ltr"
            className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition text-left"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || phone.trim().length < 10}
        >
          {isLoading ? 'جارٍ الإرسال…' : 'إرسال رمز التحقق'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} noValidate>
      <h2 className="text-xl font-bold text-gray-900 mb-1">أدخل رمز التحقق</h2>
      <p className="text-gray-500 text-sm mb-6">
        تم إرسال رمز التحقق إلى{' '}
        <span className="font-semibold text-gray-700 dir-ltr inline-block" dir="ltr">
          {phone}
        </span>
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* OTP input */}
      <div className="mb-5">
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">
          رمز التحقق (6 أرقام)
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="——————"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          dir="ltr"
          className="w-full h-14 px-4 rounded-lg border border-gray-300 text-gray-900 text-center text-2xl font-bold tracking-[0.5em] placeholder:text-gray-300 placeholder:tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition"
        />
      </div>

      {/* Name field — shown only for new users */}
      {isNewUser && (
        <div className="mb-5">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            اسمك الكامل
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="مثال: أحمد محمد"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent transition"
          />
          <p className="text-xs text-gray-400 mt-1">يبدو أن هذا أول تسجيل لك. أدخل اسمك للمتابعة.</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isLoading || otp.length < 6}
      >
        {isLoading ? 'جارٍ التحقق…' : 'تحقق والدخول'}
      </Button>

      {/* Resend link */}
      <div className="mt-4 text-center">
        {resendCountdown > 0 ? (
          <p className="text-sm text-gray-400">
            يمكنك إعادة الإرسال بعد{' '}
            <span className="font-semibold text-gray-600">{resendCountdown}</span> ثانية
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className={cn(
              'text-sm font-medium text-primary-700 hover:underline',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            إعادة إرسال الرمز
          </button>
        )}
      </div>

      {/* Back link */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => { setStep('phone'); setOtp(''); setError(null); setIsNewUser(false); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          تغيير رقم الهاتف
        </button>
      </div>
    </form>
  );
}
