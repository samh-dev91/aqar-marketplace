'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Trash2, Play } from 'lucide-react';
import { getConsumerToken, clearConsumerToken, fetchWithAuth } from '@/lib/consumer-auth';

interface SavedSearch {
  id: string;
  nameAr: string | null;
  filters: Record<string, string | number | boolean>;
  resultCount: number | null;
  newResultCount?: number | null;
  createdAt: string;
  lastCheckedAt?: string | null;
}

interface SearchesResponse {
  success: boolean;
  data?: SavedSearch[];
  message?: string;
}

function SearchSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

function buildSearchUrl(filters: Record<string, string | number | boolean>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

function buildSearchLabel(nameAr: string | null, filters: Record<string, string | number | boolean>): string {
  if (nameAr) return nameAr;

  const parts: string[] = [];
  if (filters.city) parts.push(String(filters.city));
  if (filters.district) parts.push(String(filters.district));
  if (filters.propertyType) parts.push(String(filters.propertyType));
  if (filters.transactionType) {
    parts.push(filters.transactionType === 'SALE' ? 'للبيع' : 'للإيجار');
  }
  return parts.length > 0 ? parts.join(' — ') : 'بحث محفوظ';
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSearches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/searches');
      if (!res.ok) {
        if (res.status === 401) {
          clearConsumerToken();
          router.replace('/auth/login?redirect=/profile/searches');
          return;
        }
        setError('تعذّر تحميل البحثات المحفوظة. يرجى المحاولة مرة أخرى.');
        return;
      }
      const data = (await res.json()) as SearchesResponse;
      if (data.success) {
        setSearches(data.data ?? []);
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
      router.replace('/auth/login?redirect=/profile/searches');
      return;
    }
    setIsReady(true);
    void fetchSearches();
  }, [router, fetchSearches]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(`/api/searches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSearches((prev) => prev.filter((s) => s.id !== id));
      } else {
        setError('تعذّر حذف البحث. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم.');
    } finally {
      setDeletingId(null);
    }
  }

  if (!isReady) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-700/10 flex items-center justify-center">
          <Search size={20} className="text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">بحثاتي المحفوظة</h1>
          <p className="text-sm text-gray-500">الوصول السريع إلى بحثاتك المفضلة</p>
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
            onClick={() => void fetchSearches()}
            className="mr-3 font-medium underline"
          >
            أعد المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SearchSkeleton />
          <SearchSkeleton />
          <SearchSkeleton />
        </div>
      ) : searches.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <Search size={36} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">لا توجد بحثات محفوظة</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            يمكنك حفظ بحثاتك من صفحة نتائج البحث لتجدها هنا بسرعة.
          </p>
          <Link
            href="/search"
            className="inline-block bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            ابدأ البحث
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => {
            const label = buildSearchLabel(s.nameAr, s.filters);
            const url = buildSearchUrl(s.filters);
            const isDeleting = deletingId === s.id;
            const hasNewResults = s.newResultCount != null && s.newResultCount > 0;
            return (
              <div
                key={s.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 transition-opacity ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={url}
                        className="font-semibold text-primary-800 hover:underline text-sm truncate"
                      >
                        {label}
                      </Link>
                      {hasNewResults && (
                        <span className="inline-flex items-center bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                          {s.newResultCount} نتيجة جديدة
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(s.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleDelete(s.id)}
                    disabled={isDeleting}
                    aria-label="حذف البحث"
                    className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={url}
                    className="flex-1 text-center bg-primary-700 text-white py-2 rounded-lg text-xs font-medium"
                  >
                    عرض النتائج
                    {s.resultCount != null && s.resultCount > 0 && ` (${s.resultCount})`}
                  </Link>
                  <Link
                    href={url}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-primary-700 text-primary-700 text-xs font-medium hover:bg-primary-50 transition-colors"
                    aria-label="تشغيل البحث"
                  >
                    <Play size={12} />
                    تشغيل البحث
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
