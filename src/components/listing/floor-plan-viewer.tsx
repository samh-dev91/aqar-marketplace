'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface FloorPlanViewerProps {
  floorPlanUrl: string | null | undefined;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

export function FloorPlanViewer({ floorPlanUrl }: FloorPlanViewerProps) {
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);

  const handleClose = useCallback(() => setIsFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, handleClose]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  // Reset transform when fullscreen changes
  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [isFullscreen]);

  const zoomIn = () => {
    setTransform(t => ({ ...t, scale: Math.min(t.scale + SCALE_STEP, MAX_SCALE) }));
  };

  const zoomOut = () => {
    setTransform(t => ({
      ...t,
      scale: Math.max(t.scale - SCALE_STEP, MIN_SCALE),
      // Reset pan if zooming back to near 1x
      x: t.scale - SCALE_STEP <= 1 ? 0 : t.x,
      y: t.scale - SCALE_STEP <= 1 ? 0 : t.y,
    }));
  };

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: transform.x, panY: transform.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setTransform(t => ({ ...t, x: dragStartRef.current!.panX + dx, y: dragStartRef.current!.panY + dy }));
  };

  const onMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Touch drag
  const touchStartRef = useRef<{ touchX: number; touchY: number; panX: number; panY: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { touchX: touch.clientX, touchY: touch.clientY, panX: transform.x, panY: transform.y };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !touchStartRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.touchX;
    const dy = touch.clientY - touchStartRef.current.touchY;
    setTransform(t => ({ ...t, x: touchStartRef.current!.panX + dx, y: touchStartRef.current!.panY + dy }));
  };

  const onTouchEnd = () => {
    touchStartRef.current = null;
  };

  if (!floorPlanUrl) return null;

  const imageStyle: React.CSSProperties = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.15s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  const controls = (
    <div className="flex items-center gap-2">
      <button
        onClick={zoomOut}
        disabled={transform.scale <= MIN_SCALE}
        className="p-2 rounded-lg bg-white/90 hover:bg-white shadow-sm border border-gray-200 disabled:opacity-40 transition-colors"
        aria-label="تصغير"
      >
        <ZoomOut size={16} />
      </button>
      <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center">
        {Math.round(transform.scale * 100)}%
      </span>
      <button
        onClick={zoomIn}
        disabled={transform.scale >= MAX_SCALE}
        className="p-2 rounded-lg bg-white/90 hover:bg-white shadow-sm border border-gray-200 disabled:opacity-40 transition-colors"
        aria-label="تكبير"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );

  return (
    <>
      {/* Inline viewer */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">مسقط الأرض</h2>
          <div className="flex items-center gap-2">
            {controls}
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-lg bg-white/90 hover:bg-white shadow-sm border border-gray-200 transition-colors"
              aria-label="تكبير إلى ملء الشاشة"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-200"
          style={{ height: 320 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center select-none" style={imageStyle}>
            <Image
              src={floorPlanUrl}
              alt="مسقط الأرض"
              width={600}
              height={400}
              className="max-w-full max-h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="مسقط الأرض — ملء الشاشة"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 flex-shrink-0">
            <h2 className="text-white font-semibold text-sm">مسقط الأرض</h2>
            <div className="flex items-center gap-3">
              {controls}
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Image area — tap backdrop to close */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div style={imageStyle} className="select-none">
              <Image
                src={floorPlanUrl}
                alt="مسقط الأرض"
                width={1200}
                height={900}
                className="max-w-[90vw] max-h-[80vh] object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
