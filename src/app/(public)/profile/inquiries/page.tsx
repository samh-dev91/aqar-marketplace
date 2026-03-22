'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getConsumerToken, clearConsumerToken, fetchWithAuth } from '@/lib/consumer-auth';

interface Inquiry {
  id: string;
  listingSlug: string;
  listingTitle: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  message: string;
}

interface InquiriesResponse {
  success: boolean;
  inquiries?: Inquiry[];
  message?: string;
}

const STATUS_CONFIG = {
  PENDING: { label: 'في الانتظار', color: 'text-amber-600 bg-amber-50', icon: Clock },
  WHATSAPP_SENT: { label: 'تم إرسال WhatsApp', color: 'text-blue-600 bg-blue-50', icon: MessageCircle },
  OPTED_IN: { label: 'تمت الموافقة', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  DECLINED: { label: 'تم الرفض', color: 'text-red-600 bg-red-50', icon: XCircle },
  EXPIRED: { label: 'انتهت الصلاحية', color: 'text-gray-500 bg-gray-100', icon: AlertCircle },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function InquirySkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="h-7 w-28 bg-gray-200 rounded-full shrink-0" />
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/me/inquiries');
      if (!res.ok) {
        if (res.status === 401) {
          clearConsumerToken();
          router.replace('/auth/login?redirect=/profile/inquiries');
          return;
        }
        setError('تعذّر تحميل الاستفسارات. يرجى المحاولة مرة أخرى.');
        return;
      }
      const data = (await res.json()) as InquiriesResponse;
      if (data.success) {
        setInquiries(data.inquiries ?? []);
      } else {
        setError(data.message ?? 'حدث خطأ غير متوقع.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getConsumerToken();
    if (!token) {
      router.replace('/auth/login?redirect=/profile/inquiries');
      return;
    }
    setIsReady(true);
    void fetchInquiries();
  }, [router, fetchInquiries]);

  if (!isReady) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-700/10 flex items-center justify-center">
          <MessageCircle size={20} className="text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">استفساراتي</h1>
          <p className="text-sm text-gray-500">متابعة حالة استفساراتك العقارية</p>
        </div>
      </div>

      <div className="mb-4">
        <Link href="/profile" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← الرجوع إلى حسابي
        </Link>
      </div>

      {error && (
        <div className="mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
          <button
            onClick={() => void fetchInquiries()}
            className="mr-3 font-medium underline"
          >
            أعد المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <InquirySkeleton />
          <InquirySkeleton />
          <InquirySkeleton />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <MessageCircle className="mx-auto mb-3 text-gray-300" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">لا توجد استفسارات بعد</h2>
          <p className="text-gray-500 text-sm mb-6">
            استفسر عن أي عقار لتظهر هنا ويمكنك متابعة حالتها.
          </p>
          <Link
            href="/search"
            className="inline-block bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            تصفح العقارات
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => {
            const statusKey = (inquiry.status as StatusKey) in STATUS_CONFIG
              ? (inquiry.status as StatusKey)
              : 'PENDING';
            const cfg = STATUS_CONFIG[statusKey];
            const Icon = cfg.icon;
            return (
              <div key={inquiry.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {inquiry.listingSlug ? (
                      <Link
                        href={`/listings/${inquiry.listingSlug}`}
                        className="font-semibold text-primary-800 hover:underline text-sm truncate block"
                      >
                        {inquiry.listingTitle || 'عقار'}
                      </Link>
                    ) : (
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {inquiry.listingTitle || 'عقار'}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(inquiry.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {inquiry.message && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{inquiry.message}</p>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${cfg.color}`}
                  >
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                </div>

                {inquiry.status === 'WHATSAPP_SENT' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-blue-600">
                      📱 تم إرسال رسالة WhatsApp. رد بـ <strong>نعم</strong> للموافقة على مشاركة رقمك مع الوسيط.
                    </p>
                  </div>
                )}

                {inquiry.expiresAt && inquiry.status !== 'OPTED_IN' && inquiry.status !== 'DECLINED' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">
                      تنتهي في:{' '}
                      {new Date(inquiry.expiresAt).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
