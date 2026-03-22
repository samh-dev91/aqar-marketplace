'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface AiSearchFilters {
  city?: string;
  district?: string;
  propertyType?: string;
  transactionType?: string;
  bedrooms?: number;
  maxPrice?: number;
  minPrice?: number;
  monthlyBudget?: number;
  hasFinancing?: boolean;
  verificationTier?: string;
}

interface AiSearchBarProps {
  onFiltersApplied: (filters: AiSearchFilters) => void;
  onSwitchToBasic: () => void;
  initialQuery?: string;
}

// ──────────────────────────────────────────────
// Chip label helpers
// ──────────────────────────────────────────────

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'شقة',
  VILLA: 'فيلا',
  TOWNHOUSE: 'تاون هاوس',
  DUPLEX: 'دوبلكس',
  PENTHOUSE: 'بنتهاوس',
  OFFICE: 'مكتب',
  SHOP: 'محل تجاري',
  LAND: 'أرض',
  WAREHOUSE: 'مخزن',
  BUILDING: 'عمارة',
  OTHER: 'أخرى',
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  SALE: 'للبيع',
  RENT: 'للإيجار',
};

const VERIFICATION_TIER_LABELS: Record<string, string> = {
  GOLD: 'ذهبي',
  VERIFIED: 'موثق',
  LISTED: 'مُدرج',
};

function formatCompactPrice(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

interface FilterChip {
  key: keyof AiSearchFilters;
  label: string;
}

function buildChips(filters: AiSearchFilters): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.city) chips.push({ key: 'city', label: filters.city });
  if (filters.district) chips.push({ key: 'district', label: filters.district });
  if (filters.propertyType) {
    chips.push({
      key: 'propertyType',
      label: PROPERTY_TYPE_LABELS[filters.propertyType] ?? filters.propertyType,
    });
  }
  if (filters.transactionType) {
    chips.push({
      key: 'transactionType',
      label: TRANSACTION_TYPE_LABELS[filters.transactionType] ?? filters.transactionType,
    });
  }
  if (filters.bedrooms != null) {
    chips.push({ key: 'bedrooms', label: `${filters.bedrooms} غرف` });
  }
  if (filters.maxPrice != null) {
    chips.push({ key: 'maxPrice', label: `حتى ${formatCompactPrice(filters.maxPrice)} جنيه` });
  }
  if (filters.minPrice != null) {
    chips.push({ key: 'minPrice', label: `من ${formatCompactPrice(filters.minPrice)} جنيه` });
  }
  if (filters.monthlyBudget != null) {
    chips.push({
      key: 'monthlyBudget',
      label: `قسط ${formatCompactPrice(filters.monthlyBudget)}/شهر`,
    });
  }
  if (filters.hasFinancing) {
    chips.push({ key: 'hasFinancing', label: 'بالتقسيط' });
  }
  if (filters.verificationTier) {
    chips.push({
      key: 'verificationTier',
      label: VERIFICATION_TIER_LABELS[filters.verificationTier] ?? filters.verificationTier,
    });
  }

  return chips;
}

// ──────────────────────────────────────────────
// Sparkle icon (inline SVG — no extra package)
// ──────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM12 20.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75a.75.75 0 0 1 .75-.75ZM3 12.75a.75.75 0 0 0 0-1.5H2.25a.75.75 0 0 0 0 1.5H3Zm18.75 0a.75.75 0 0 0 0-1.5H21a.75.75 0 0 0 0 1.5h.75ZM5.636 5.636a.75.75 0 0 1 0 1.061l-.53.53a.75.75 0 0 1-1.06-1.061l.53-.53a.75.75 0 0 1 1.06 0Zm12.728 12.728a.75.75 0 0 1 0 1.06l-.53.53a.75.75 0 0 1-1.061-1.06l.53-.53a.75.75 0 0 1 1.061 0Zm-14.85.53a.75.75 0 0 1-1.06-1.06l.53-.53a.75.75 0 0 1 1.061 1.06l-.53.53Zm12.728-12.728a.75.75 0 0 1-1.061 0l-.53-.53a.75.75 0 0 1 1.061-1.06l.53.53a.75.75 0 0 1 0 1.06Z" />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Loading spinner
// ──────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 14.627 0 12 4v8z"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Inner search form (shared between inline + modal)
// ──────────────────────────────────────────────

interface SearchFormProps {
  initialQuery?: string;
  onSuccess: (filters: AiSearchFilters) => void;
  autoFocus?: boolean;
}

function SearchForm({ initialQuery = '', onSuccess, autoFocus = false }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AiSearchFilters | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setLoading(true);
      setErrorMsg(null);
      setAppliedFilters(null);

      try {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });

        if (res.status === 429) {
          setErrorMsg('لقد تجاوزت الحد المسموح به. حاول مرة أخرى بعد قليل.');
          return;
        }

        const json = (await res.json()) as { success: boolean; filters?: AiSearchFilters };

        if (!json.success || !json.filters || Object.keys(json.filters).length === 0) {
          setErrorMsg('لم نتعرف على البحث. جرّب البحث التقليدي.');
          return;
        }

        setAppliedFilters(json.filters);
        onSuccess(json.filters);
      } catch {
        setErrorMsg('لم نتعرف على البحث. جرّب البحث التقليدي.');
      } finally {
        setLoading(false);
      }
    },
    [query, onSuccess],
  );

  const removeChip = useCallback(
    (key: keyof AiSearchFilters) => {
      if (!appliedFilters) return;
      const updated = { ...appliedFilters };
      delete updated[key];
      setAppliedFilters(updated);
      onSuccess(updated);
    },
    [appliedFilters, onSuccess],
  );

  const chips = appliedFilters ? buildChips(appliedFilters) : [];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جرّب: شقة ٣ غرف في المعادي بأقل من ٢ مليون"
            dir="rtl"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pe-12 ps-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
          />
          {/* Sparkle icon — right side in RTL */}
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-blue-500">
            {loading ? <Spinner /> : <SparkleIcon className="h-5 w-5" />}
          </span>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || query.trim().length < 3}
          className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {loading ? 'جارٍ تحليل بحثك...' : 'بحث ذكي'}
        </button>
      </form>

      {/* Error message */}
      {errorMsg && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {errorMsg}
        </p>
      )}

      {/* Filter chips */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" dir="rtl">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="ms-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 hover:text-blue-800 transition-colors"
                aria-label={`إزالة ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Ctrl+K Modal
// ──────────────────────────────────────────────

interface SearchModalProps {
  onClose: () => void;
  onSuccess: (filters: AiSearchFilters) => void;
}

function SearchModal({ onClose, onSuccess }: SearchModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSuccess = (filters: AiSearchFilters) => {
    onSuccess(filters);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="البحث الذكي"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold text-blue-600">البحث الذكي</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="إغلاق"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SearchForm onSuccess={handleSuccess} autoFocus />

        <p className="mt-3 text-center text-xs text-gray-400">
          اضغط{' '}
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{' '}
          للإغلاق
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main exported component
// ──────────────────────────────────────────────

export function AiSearchBar({ onFiltersApplied, onSwitchToBasic, initialQuery }: AiSearchBarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div className="w-full" dir="rtl">
        {/* Label */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <SparkleIcon className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-600">البحث الذكي</span>
          <span className="ms-auto text-[10px] text-gray-400">
            Ctrl+K
          </span>
        </div>

        {/* Inline search form */}
        <SearchForm
          initialQuery={initialQuery}
          onSuccess={onFiltersApplied}
        />

        {/* Toggle to basic search */}
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={onSwitchToBasic}
            className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700 transition-colors"
          >
            التبديل للبحث التقليدي ↔
          </button>
        </div>
      </div>

      {/* Ctrl+K Modal */}
      {modalOpen && (
        <SearchModal
          onClose={() => setModalOpen(false)}
          onSuccess={(filters) => {
            onFiltersApplied(filters);
          }}
        />
      )}
    </>
  );
}
