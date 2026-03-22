'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/offline';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
