'use client';
import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url: string;
  price: string;
}

export function ShareButton({ title, url, price }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `عقار ثرست — ${title}`,
      text: `${title}\n${price}\n`,
      url,
    };

    // Try Capacitor Share (native app)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const capacitorShare = await import(
        /* webpackIgnore: true */ '@capacitor/share' as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await capacitorShare.Share.share(shareData);
      return;
    } catch {
      // Not in Capacitor context, try Web Share API
    }

    // Try Web Share API (modern browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or not supported
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${price}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={() => void handleShare()}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-700 transition font-cairo px-3 py-2 rounded-lg hover:bg-gray-100"
      aria-label="مشاركة العقار"
    >
      {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
      {copied ? <span className="text-green-600">تم النسخ</span> : <span>مشاركة</span>}
    </button>
  );
}
