'use client';
import { useState } from 'react';

interface ProjectInquiryModalProps {
  projectSlug: string;
  projectName: string;
}

export function ProjectInquiryModal({
  projectSlug,
  projectName,
}: ProjectInquiryModalProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    message: '',
    unitType: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectSlug}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'حدث خطأ');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('حدث خطأ في الاتصال. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold font-tajawal text-gray-900">تم استلام طلبك!</p>
        <p className="text-xs text-gray-500 font-cairo mt-1">
          ستصلك رسالة WhatsApp قريباً
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-3"
      dir="rtl"
    >
      <input
        type="text"
        placeholder="الاسم الكريم"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        required
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <input
        type="tel"
        placeholder="رقم الهاتف"
        value={form.phone}
        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        required
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-primary-500"
        dir="ltr"
      />
      <select
        value={form.unitType}
        onChange={(e) => setForm((p) => ({ ...p, unitType: e.target.value }))}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
      >
        <option value="">نوع الوحدة (اختياري)</option>
        <option value="studio">استوديو</option>
        <option value="1br">1 غرفة</option>
        <option value="2br">2 غرفة</option>
        <option value="3br">3 غرف</option>
        <option value="4br">4 غرف+</option>
        <option value="villa">فيلا / تاون هاوس</option>
      </select>
      <textarea
        placeholder={`رسالتك عن مشروع ${projectName}`}
        value={form.message}
        onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
      />
      {error && <p className="text-red-500 text-xs font-cairo">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary-700 text-white py-3 rounded-xl font-cairo font-semibold text-sm disabled:opacity-50 hover:bg-primary-800 transition"
      >
        {submitting ? 'جاري الإرسال...' : 'استفسر الآن'}
      </button>
    </form>
  );
}
