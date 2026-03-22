/**
 * PostHog analytics stub.
 * Install posthog-js and set NEXT_PUBLIC_POSTHOG_KEY to activate.
 */

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: string, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    // Dev: log events to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, properties);
    }
    return;
  }

  // PostHog integration — activate when posthog-js is installed:
  // import posthog from 'posthog-js';
  // posthog.capture(event, properties);

  // Fallback: use navigator.sendBeacon for zero-overhead analytics
  const payload = JSON.stringify({ event, properties, timestamp: Date.now() });
  try {
    navigator.sendBeacon(`https://app.posthog.com/capture/`, payload);
  } catch {
    // ignore
  }
}

// Pre-defined event helpers
export const analytics = {
  searchPerformed: (query: string, resultsCount: number) =>
    trackEvent('search_performed', { query, results_count: resultsCount }),

  listingViewed: (slug: string, city: string, price: number) =>
    trackEvent('listing_viewed', { slug, city, price }),

  inquirySubmitted: (slug: string, hasViewing: boolean) =>
    trackEvent('inquiry_submitted', { slug, has_viewing: hasViewing }),

  favoriteToggled: (slug: string, added: boolean) =>
    trackEvent('favorite_toggled', { slug, added }),

  authStarted: (method: 'otp' | 'google') =>
    trackEvent('auth_started', { method }),

  authCompleted: (method: 'otp' | 'google') =>
    trackEvent('auth_completed', { method }),

  mapViewed: (type: 'listing' | 'search' | 'heatmap') =>
    trackEvent('map_viewed', { type }),
};
