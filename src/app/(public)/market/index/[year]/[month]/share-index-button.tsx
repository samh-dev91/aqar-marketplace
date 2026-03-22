'use client';
import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface Props {
  title: string;
  text: string;
}

export function ShareIndexButton({ title, text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Fall through to clipboard
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors silently
    }
  };

  return (
    <button
      onClick={() => void handleShare()}
      className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-cairo text-sm hover:bg-gray-50 transition"
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-600" />
          تم النسخ
        </>
      ) : (
        <>
          <Share2 size={16} />
          مشاركة
        </>
      )}
    </button>
  );
}
