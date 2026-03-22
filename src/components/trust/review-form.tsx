'use client';

import React, { useState } from 'react';

interface ReviewFormProps {
  firmSlug: string;
  onSuccess: () => void;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'duplicate' | 'unauthenticated' | 'error';

export function ReviewForm({ firmSlug, onSuccess }: ReviewFormProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected === 0) return;

    setSubmitState('loading');

    const consumerId =
      typeof window !== 'undefined' ? localStorage.getItem('consumerId') ?? '' : '';

    try {
      const res = await fetch(`/api/firms/${firmSlug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-consumer-id': consumerId,
        },
        body: JSON.stringify({ rating: selected, comment: comment.trim() || undefined }),
      });

      if (res.status === 401) {
        setSubmitState('unauthenticated');
        return;
      }
      if (res.status === 409) {
        setSubmitState('duplicate');
        return;
      }
      if (!res.ok) {
        setSubmitState('error');
        return;
      }

      setSubmitState('success');
      onSuccess();
    } catch {
      setSubmitState('error');
    }
  }

  if (submitState === 'success') {
    return (
      <p className="text-center text-green-700 font-medium py-4">شكراً لتقييمك</p>
    );
  }

  if (submitState === 'duplicate') {
    return (
      <p className="text-center text-amber-700 font-medium py-4">
        لقد قيّمت هذه الشركة من قبل
      </p>
    );
  }

  if (submitState === 'unauthenticated') {
    return (
      <p className="text-center text-red-600 font-medium py-4">
        يجب تسجيل الدخول أولاً
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      {/* Star picker */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">تقييمك</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => {
            const value = i + 1;
            const active = value <= (hovered || selected);
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(value)}
                className="text-2xl leading-none focus:outline-none transition-colors"
                style={{ color: active ? '#D4AC0D' : '#D1D5DB' }}
                aria-label={`${value} نجوم`}
              >
                ★
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شارك تجربتك مع هذا الوسيط..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-700 resize-none"
          dir="rtl"
        />
      </div>

      {submitState === 'error' && (
        <p className="text-sm text-red-600">حدث خطأ. يرجى المحاولة مرة أخرى.</p>
      )}

      <button
        type="submit"
        disabled={selected === 0 || submitState === 'loading'}
        className="w-full bg-primary-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitState === 'loading' ? 'جاري الإرسال...' : 'إرسال التقييم'}
      </button>
    </form>
  );
}
