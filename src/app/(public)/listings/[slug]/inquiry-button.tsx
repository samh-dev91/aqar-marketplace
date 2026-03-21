'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { InquiryModal } from '@/components/inquiry/inquiry-modal';
import { cn } from '@/lib/utils';

interface InquiryButtonProps {
  listingSlug: string;
  listingTitle: string;
  mobile?: boolean;
}

export function InquiryButton({ listingSlug, listingTitle, mobile = false }: InquiryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold rounded-xl transition-colors shadow-md',
          mobile
            ? 'fixed bottom-16 inset-x-4 z-40 h-14 text-base md:hidden'
            : 'w-full h-12 text-base'
        )}
      >
        <MessageCircle size={20} />
        استفسر عن هذا العقار
      </button>

      <InquiryModal
        listingSlug={listingSlug}
        listingTitle={listingTitle}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
