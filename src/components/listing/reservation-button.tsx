'use client';

import React, { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';

interface ReservationButtonProps {
  listingSlug: string;
  hasFinancing: boolean;
}

type Amount = 5000 | 10000;

interface ModalState {
  open: boolean;
  selectedAmount: Amount;
  phone: string;
  loading: boolean;
  successRef: string | null;
  error: string;
}

const INITIAL_MODAL: ModalState = {
  open: false,
  selectedAmount: 5000,
  phone: '',
  loading: false,
  successRef: null,
  error: '',
};

function formatEGP(amount: number): string {
  return new Intl.NumberFormat('ar-EG').format(amount);
}

export function ReservationButton({
  listingSlug,
  hasFinancing,
}: ReservationButtonProps) {
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Read consumer session from localStorage (set by auth store in Phase 3)
  useEffect(() => {
    try {
      const consumerId =
        localStorage.getItem('consumerId') ??
        localStorage.getItem('consumer_id');
      const phone =
        localStorage.getItem('consumerPhone') ??
        localStorage.getItem('consumer_phone') ??
        '';
      setIsLoggedIn(!!consumerId);
      if (phone) {
        setModal((prev) => ({ ...prev, phone }));
      }
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  // Don't render if no financing
  if (!hasFinancing) return null;

  const openModal = () => {
    setModal((prev) => ({
      ...INITIAL_MODAL,
      phone: prev.phone,
      open: true,
    }));
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  const handleConfirm = async () => {
    setModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch('/api/payments/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingSlug,
          amount: modal.selectedAmount,
          phone: modal.phone,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        setModal((prev) => ({
          ...prev,
          loading: false,
          error: json.message ?? 'حدث خطأ، يرجى المحاولة مرة أخرى',
        }));
        return;
      }

      const json = (await res.json()) as {
        success: boolean;
        data?: { reservationRef: string };
      };
      if (json.success && json.data?.reservationRef) {
        setModal((prev) => ({
          ...prev,
          loading: false,
          successRef: json.data!.reservationRef,
        }));
      } else {
        setModal((prev) => ({
          ...prev,
          loading: false,
          error: 'حدث خطأ، يرجى المحاولة مرة أخرى',
        }));
      }
    } catch {
      setModal((prev) => ({
        ...prev,
        loading: false,
        error: 'حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى',
      }));
    }
  };

  return (
    <Fragment>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl py-3 text-sm transition-colors shadow-sm"
      >
        احجز الآن
      </button>

      {/* Modal overlay */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">تأكيد الحجز</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Success state */}
            {modal.successRef ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-7 h-7 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-xl font-bold text-gray-900">تم الحجز بنجاح!</p>
                <p className="text-sm text-gray-600">
                  رقم الحجز:{' '}
                  <span className="font-bold text-primary-700">
                    {modal.successRef}
                  </span>
                </p>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                  سيتواصل معكم الوسيط خلال 24 ساعة
                </p>
                <button
                  onClick={closeModal}
                  className="mt-2 text-sm text-primary-700 underline hover:no-underline"
                >
                  إغلاق
                </button>
              </div>
            ) : !isLoggedIn ? (
              /* Not logged in */
              <div className="text-center py-4 space-y-3">
                <p className="text-gray-600 text-sm">
                  يجب تسجيل الدخول أولاً للحجز
                </p>
                <Link
                  href="/auth/login"
                  className="inline-block bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-900 transition-colors"
                >
                  سجّل الدخول أولاً للحجز
                </Link>
              </div>
            ) : (
              /* Booking form */
              <>
                {/* Amount selector */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    مبلغ الحجز
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {([5000, 10000] as Amount[]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            selectedAmount: amt,
                          }))
                        }
                        className={`border-2 rounded-xl py-3 text-sm font-bold transition-colors ${
                          modal.selectedAmount === amt
                            ? 'border-primary-700 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {formatEGP(amt)} جنيه
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone (readonly) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={modal.phone || '—'}
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    dir="ltr"
                  />
                </div>

                {/* Error */}
                {modal.error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {modal.error}
                  </p>
                )}

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  disabled={modal.loading}
                  className="w-full bg-primary-700 hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {modal.loading ? (
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
                      جاري المعالجة...
                    </>
                  ) : (
                    'تأكيد الحجز'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Fragment>
  );
}
