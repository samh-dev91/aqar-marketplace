'use client';
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-cairo font-medium transition-all ${
        isOffline ? 'bg-amber-400 text-amber-900' : 'bg-green-500 text-white'
      }`}
      dir="rtl"
      role="alert"
    >
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>لا يوجد اتصال بالإنترنت — عرض البيانات المحفوظة</span>
        </>
      ) : (
        <>
          <span>✓</span>
          <span>تم استعادة الاتصال</span>
        </>
      )}
    </div>
  );
}
