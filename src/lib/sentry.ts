/**
 * Sentry error tracking stub.
 * Install @sentry/nextjs and set SENTRY_DSN to activate.
 *
 * Usage: import { captureError } from '@/lib/sentry';
 */

interface SentryScope {
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: unknown) => void;
}

type SentryLike = {
  captureException: (err: unknown, ctx?: { extra?: Record<string, unknown>; tags?: Record<string, string> }) => string;
  withScope: (cb: (scope: SentryScope) => void) => void;
};

function getSentry(): SentryLike | null {
  // Will be populated when @sentry/nextjs is installed:
  // return require('@sentry/nextjs') as SentryLike;
  return null;
}

export function captureError(
  err: unknown,
  context?: { extra?: Record<string, unknown>; tags?: Record<string, string> }
): void {
  const sentry = getSentry();
  if (!sentry) {
    console.error('[Error captured]', err, context);
    return;
  }
  sentry.captureException(err, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error'): void {
  const sentry = getSentry();
  if (!sentry) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }
  // sentry.captureMessage(message, level);
}
