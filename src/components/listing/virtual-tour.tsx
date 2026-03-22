'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';

interface VirtualTourProps {
  virtualTourUrl: string | null | undefined;
  listingTitleAr: string;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function VirtualTour({ virtualTourUrl, listingTitleAr }: VirtualTourProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!virtualTourUrl) return null;

  const isVideo = isVideoUrl(virtualTourUrl);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group w-full text-start"
        aria-label="فتح الجولة ثلاثية الأبعاد"
      >
        {/* Thumbnail placeholder */}
        <div className="relative w-24 h-16 flex-shrink-0 bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center">
          <Play size={24} className="text-white opacity-80 group-hover:opacity-100 transition-opacity" fill="white" />
        </div>
        <div className="flex-1 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">جولة ثلاثية الأبعاد</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white leading-none">3D</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">اضغط لمشاهدة الجولة التفاعلية</p>
        </div>
      </button>

      {/* Fullscreen modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`جولة ثلاثية الأبعاد — ${listingTitleAr}`}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">{listingTitleAr}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white leading-none">3D</span>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="إغلاق الجولة"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {isVideo ? (
              <video
                src={virtualTourUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <iframe
                src={virtualTourUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="xr-spatial-tracking; gyroscope; accelerometer"
                title={`جولة ثلاثية الأبعاد — ${listingTitleAr}`}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
