'use client';

import React, { useState } from 'react';
import { Shield, ShieldCheck, X, Phone, User, Mail, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ViewingScheduler } from './viewing-scheduler';

interface InquiryModalProps {
  listingSlug: string;
  listingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'inquiry' | 'viewing';

interface FormState {
  consumerName: string;
  consumerPhone: string;
  consumerEmail: string;
  message: string;
  preferredViewingDate: string;
  preferredViewingTime: string;
}

export function InquiryModal({ listingSlug, listingTitle, isOpen, onClose }: InquiryModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('inquiry');
  const [form, setForm] = useState<FormState>({
    consumerName: '',
    consumerPhone: '',
    consumerEmail: '',
    message: '',
    preferredViewingDate: '',
    preferredViewingTime: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consumerName.trim() || !form.consumerPhone.trim()) {
      setError('الاسم ورقم الهاتف مطلوبان');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingSlug,
          consumerName: form.consumerName,
          consumerPhone: form.consumerPhone,
          consumerEmail: form.consumerEmail || undefined,
          message: form.message || undefined,
          preferredViewingDate: form.preferredViewingDate || undefined,
          preferredViewingTime: form.preferredViewingTime || undefined,
        }),
      });

      const data = await res.json() as { success: boolean; message?: string };

      if (data.success) {
        setSubmitted(true);
      } else if (res.status === 429) {
        setError('تجاوزت الحد المسموح به. يرجى المحاولة بعد ساعة.');
      } else {
        setError(data.message ?? 'حدث خطأ. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">
            {activeTab === 'inquiry' ? 'استفسار عن العقار' : 'حجز معاينة'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        {!submitted && (
          <div className="flex border-b border-gray-100 px-5 pt-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('inquiry')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                activeTab === 'inquiry'
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <MessageSquare size={14} />
              استفسار
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('viewing')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                activeTab === 'viewing'
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Calendar size={14} />
              حجز معاينة
            </button>
          </div>
        )}

        {/* Inquiry Shield banner */}
        <div className="mx-5 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <ShieldCheck size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">خصوصيتك محمية</p>
            <p className="text-xs text-blue-600 mt-0.5">
              لن يصل رقمك للوسيط إلا بعد موافقتك عبر واتساب. أنت تتحكم في من يتصل بك.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">تم إرسال استفسارك بنجاح</h3>
            <p className="text-gray-600 text-sm mb-6">
              ستصلك رسالة واتساب للتأكيد. يمكنك التحكم في مشاركة رقمك مع الوسيط.
            </p>
            {form.preferredViewingDate && (
              <p className="text-sm text-primary-700 font-medium mb-4">
                📅 الموعد المطلوب: {form.preferredViewingDate}
                {form.preferredViewingTime && ` — ${form.preferredViewingTime}`}
              </p>
            )}
            <Button onClick={onClose} variant="outline" className="w-full">إغلاق</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Contact fields — shown in both tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.consumerName}
                  onChange={(e) => setForm((f) => ({ ...f, consumerName: e.target.value }))}
                  placeholder="اسمك الكريم"
                  className="w-full border border-gray-200 rounded-lg ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={form.consumerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, consumerPhone: e.target.value }))}
                  placeholder="01xxxxxxxxx"
                  className="w-full border border-gray-200 rounded-lg ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Inquiry tab: email + message */}
            {activeTab === 'inquiry' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.consumerEmail}
                      onChange={(e) => setForm((f) => ({ ...f, consumerEmail: e.target.value }))}
                      placeholder="example@email.com"
                      className="w-full border border-gray-200 rounded-lg ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رسالة <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <MessageSquare size={16} className="absolute start-3 top-3 text-gray-400" />
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="أي تفاصيل أو أسئلة تريد إضافتها..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700 resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Viewing tab: date + time scheduler */}
            {activeTab === 'viewing' && (
              <div className="pt-1">
                <ViewingScheduler
                  selectedDate={form.preferredViewingDate || undefined}
                  selectedTime={form.preferredViewingTime || undefined}
                  onSelect={(date, time) =>
                    setForm((f) => ({ ...f, preferredViewingDate: date, preferredViewingTime: time }))
                  }
                />
                {form.preferredViewingDate && form.preferredViewingTime && (
                  <div className="mt-3 p-3 bg-primary-50 border border-primary-100 rounded-xl">
                    <p className="text-xs text-primary-700 font-medium">
                      ✓ الموعد المختار: {form.preferredViewingDate} — {form.preferredViewingTime}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || (activeTab === 'viewing' && (!form.preferredViewingDate || !form.preferredViewingTime))}
              className="w-full h-12 text-base font-semibold"
            >
              {submitting
                ? 'جاري الإرسال...'
                : activeTab === 'viewing'
                ? 'تأكيد الموعد وإرسال الاستفسار'
                : 'إرسال الاستفسار'}
            </Button>

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Shield size={12} />
              بإرسال استفسارك، أنت توافق على سياسة الخصوصية
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
