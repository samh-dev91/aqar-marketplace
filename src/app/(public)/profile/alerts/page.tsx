'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getConsumerToken, clearConsumerToken, fetchWithAuth } from '@/lib/consumer-auth';
import { cn } from '@/lib/utils';

type AlertType = 'PRICE_DROP' | 'NEW_MATCH' | 'STATUS_CHANGE';

interface PriceAlert {
  id: string;
  type: AlertType;
  listingSlug?: string;
  listingTitle?: string;
  threshold?: number;
  isActive: boolean;
  createdAt: string;
}

interface AlertsResponse {
  success: boolean;
  data: PriceAlert[];
  message?: string;
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  PRICE_DROP: 'تنبيه انخفاض السعر',
  NEW_MATCH: 'عقارات جديدة مطابقة',
  STATUS_CHANGE: 'تغيير حالة العقار',
};

const ALERT_TYPE_VARIANT: Record<AlertType, 'default' | 'secondary' | 'outline'> = {
  PRICE_DROP: 'default',
  NEW_MATCH: 'secondary',
  STATUS_CHANGE: 'outline',
};

function AlertSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const router = useRouter();

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/alerts');
      if (!res.ok) {
        if (res.status === 401) {
          clearConsumerToken();
          router.replace('/auth/login?redirect=/profile/alerts');
          return;
        }
        setError('تعذّر تحميل التنبيهات. يرجى المحاولة مرة أخرى.');
        return;
      }
      const json = (await res.json()) as AlertsResponse;
      if (json.success) {
        setAlerts(json.data);
      } else {
        setError(json.message ?? 'حدث خطأ غير متوقع.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getConsumerToken();
    if (!token) {
      router.replace('/auth/login?redirect=/profile/alerts');
      return;
    }
    setIsReady(true);
    void fetchAlerts();
  }, [router, fetchAlerts]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(`/api/alerts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError('تعذّر حذف التنبيه. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (!isReady) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-700/10 flex items-center justify-center">
          <Bell size={20} className="text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">تنبيهاتي</h1>
          <p className="text-sm text-gray-500">تنبيهات الأسعار والعقارات المطابقة</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
          <button
            onClick={() => void fetchAlerts()}
            className="mr-3 font-medium underline"
          >
            أعد المحاولة
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <BellOff size={36} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تنبيهات نشطة</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            يمكنك إضافة تنبيهات من صفحة أي عقار أو من نتائج البحث.
          </p>
          <Button asChild variant="outline">
            <a href="/listings">تصفح العقارات</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'bg-white rounded-xl border px-4 py-4 flex items-start gap-4 transition-opacity',
                deletingId === alert.id && 'opacity-50 pointer-events-none',
                alert.isActive ? 'border-gray-100' : 'border-gray-100 bg-gray-50'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="mb-1.5">
                  <Badge variant={ALERT_TYPE_VARIANT[alert.type]}>
                    {ALERT_TYPE_LABELS[alert.type]}
                  </Badge>
                </div>

                {alert.listingTitle ? (
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alert.listingTitle}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">بحث عام</p>
                )}

                {alert.threshold != null && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    عند السعر:{' '}
                    <span className="font-medium text-gray-700">
                      {alert.threshold.toLocaleString('ar-EG')} جنيه
                    </span>
                  </p>
                )}

                <p className="text-xs text-gray-400 mt-1">{formatDate(alert.createdAt)}</p>
              </div>

              <button
                onClick={() => void handleDelete(alert.id)}
                disabled={deletingId === alert.id}
                aria-label="حذف التنبيه"
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
