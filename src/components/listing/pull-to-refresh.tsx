'use client';
import { useState, useRef, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 70; // px

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD + 20));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <RefreshCw
          size={20}
          className={`text-primary-600 transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)` }}
        />
      </div>
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease' }}>
        {children}
      </div>
    </div>
  );
}
