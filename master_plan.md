# Aqar Trust Platform — Master Implementation Plan
## منصة عقار ثرست — الخطة الرئيسية الشاملة

> **Last updated:** 2026-03-21
> **Status legend:** ✅ Complete · 🔄 In Progress · 🔜 Not started · ⚠️ Partially complete

---

## Strategic Summary

A **consumer-facing property marketplace** at `aqar.[domain].com` that aggregates verified listings from all brokerage firms using the existing CRM at `crm.[domain].com`. Every listing is backed by real CRM data — eliminating ghost ads, fake prices, and spam calls.

**Architecture:** Fully separate Next.js project with its own PostgreSQL database. Integrates with the CRM via a dedicated Marketplace Bridge API. The CRM is the broker's daily tool; the marketplace is the consumer's destination. They communicate through clean API contracts, never sharing a database connection.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    aqar.[domain].com                              │
│                 (Marketplace — C:/firm/B2C/)                      │
│                                                                   │
│   Next.js 14 App Router (SSR + ISR + SSG)                        │
│   Own PostgreSQL DB (public-safe data only)                      │
│   Own Redis (caching, rate limiting, sessions)                   │
│   Mapbox GL JS (interactive maps)                                 │
│   Capacitor (iOS + Android native apps)                          │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │ Marketplace Bridge API        │ Consumer inquiries
               ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    crm.[domain].com                               │
│               (CRM — C:/firm/)                                    │
│                                                                   │
│   /api/marketplace-bridge/* — 5 HMAC-authenticated endpoints    │
│   Webhook: fires on property publish/unpublish/update/sold       │
│   Lead creation: inquiry → broker's CRM pipeline                 │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Rules

| Direction | Mechanism | What flows |
|-----------|-----------|-----------|
| CRM → Marketplace | Webhook POST (HMAC-SHA256) | Public-safe listing data only |
| Marketplace → CRM | POST /api/marketplace-bridge/inquiry | Consumer name, hashed phone, message |
| CRM → Marketplace | GET /api/marketplace-bridge/firm-profiles | Public firm data (name, logo) |
| CRM → Marketplace | GET /api/marketplace-bridge/district-stats | Anonymous aggregated deal statistics |

**Non-negotiable data isolation:**
- Owner names, owner phone, owner email → NEVER leave the CRM database
- Broker full names, phone, email → NEVER leave the CRM database
- Firm-internal notes, commission data, deal financials → NEVER leave the CRM database
- The marketplace database contains ONLY what a stranger can safely see

---

## Tech Stack

| Concern | Technology | Reason |
|---------|-----------|--------|
| Framework | **Next.js 14** App Router | SSR + ISR + SSG for SEO, Arabic-first |
| Styling | **Tailwind CSS** (custom tokens) | RTL support, consistent design |
| State | **Zustand** + **React Query v5** | Same as CRM, minimal learning curve |
| Database | **PostgreSQL** (own instance) | Isolated from CRM |
| ORM | **Prisma 5** | Generated types, same as CRM |
| Cache | **Redis** (ioredis) | Sessions, rate limiting, autocomplete |
| Auth | **Custom OTP** (bearer token) | Phone-first, privacy-native |
| Map | **Mapbox GL JS** | Best Arabic RTL labels, Egypt coverage |
| Charts | **Recharts** | Same as CRM |
| i18n | **next-intl** | App Router native, RTL support |
| Money | **Decimal.js** | Same rule as CRM — never native floats |
| Mobile | **Capacitor** | iOS + Android wrapping Next.js |
| Push | **web-push** (VAPID) | Price drop alerts, new match alerts |
| SEO | **Next.js Metadata API** | Per-page Arabic OG, schema.org |
| Video/Tour | **iframe embed** | Matterport / YouTube virtual tour |
| Validation | **Zod** | Shared schema conventions with CRM |

---

## CRM Side: Marketplace Bridge API ✅ Complete

All five bridge endpoints built at `C:/firm/server/src/routes/marketplace-bridge.ts`:

```
Authentication: X-Marketplace-Signature — HMAC-SHA256(body, MARKETPLACE_SECRET)

GET  /api/marketplace-bridge/listings              — paginated public listings (strips all private data)
GET  /api/marketplace-bridge/listings/:propertyId  — single listing public data
GET  /api/marketplace-bridge/firm-profiles         — active firms public profiles
GET  /api/marketplace-bridge/district-stats        — anonymous aggregated deal stats ($queryRaw)
POST /api/marketplace-bridge/inquiries             — create CRM lead from marketplace inquiry
```

Outbound webhook from CRM fires on:
- `properties.ts` — status change (SOLD/RENTED/WITHDRAWN) or public field update → `marketplaceSyncService`
- `listings.ts` — `isPublished` toggle → `onPropertyPublished` / `onPropertyUnpublished`

---

## Environment Variables

```env
# Marketplace (C:/firm/B2C/.env)
MARKETPLACE_DATABASE_URL=postgresql://user:pass@host:5432/aqar_marketplace
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=https://aqar.[domain].com

# CRM Bridge
CRM_BRIDGE_URL=https://crm.[domain].com/api/marketplace-bridge
CRM_BRIDGE_SECRET=<64-char HMAC secret — same on both sides>

# Auth
NEXTAUTH_SECRET=<32+ chars>
NEXTAUTH_URL=https://aqar.[domain].com

# WhatsApp OTP (Phase 6)
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=your_instance
ULTRAMSG_TOKEN=your_token
PLATFORM_WHATSAPP_NUMBER=+201XXXXXXXXX

# Maps (Phase 5)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# Push notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:push@domain.com

# Analytics (Phase 7)
POSTHOG_KEY=...
POSTHOG_HOST=https://app.posthog.com

# CRM additions (C:/firm/.env)
MARKETPLACE_WEBHOOK_URL=https://aqar.[domain].com/api/webhook/crm
MARKETPLACE_SECRET=<same 64-char secret>
```

---

## Phase Summary

| # | Name | Status | Completion |
|---|------|--------|-----------|
| 1 | Foundation & Core Search | ✅ Complete | All tasks done |
| 2 | Trust Layer | ✅ Complete | Aqar Score, district/firm pages, calculators done. Mapbox maps → Phase 5 |
| 3 | Lead Intelligence | ⚠️ Partial | Auth, favorites, alerts done. WhatsApp flow → Phase 6 |
| 4 | Mobile Native | ⚠️ Partial | Capacitor config, nearby search, push service done. Full plugins + perf hardening → Phases 7–8 |
| 5 | Mapbox Maps & Geographic Discovery | 🔜 Next | Listing map pin, search map view, district heatmap |
| 6 | WhatsApp Intelligence & Inquiry Shield | 🔜 Next | OTP delivery, opt-in flow, viewing scheduler, WhatsApp bot |
| 7 | Performance & Scale Hardening | 🔜 Next | CDN, Redis caching, connection pooling, load testing |
| 8 | Market Reports, Comparison & App Store | 🔜 Next | Monthly PDF reports, property comparison, app store submission |
| 9 | Developer & Project Pages | 🔜 Future | New-build compounds, unit matrix, reservation flow |
| 10 | Maps & Market Intelligence | 🔜 Future | Price heatmaps, Cairo Real Estate Index, commute-time search |
| 11 | AI Valuation — Aqar Estimate | 🔜 Future | Hedonic AVM, estimate badge, comparable transactions |
| 12 | Broker Trust & Reputation System | 🔜 Future | Verified broker tiers, consumer reviews, SuperAgent program |
| 13 | Arabic Natural Language Search | 🔜 Future | Claude API query parser, Arabic morphology, smart autocomplete |
| 14 | Rich Media — 3D Tours & Virtual Staging | 🔜 Future | Matterport embed, floor plan viewer, AI virtual staging |
| 15 | Financial Ecosystem | 🔜 Future | Bank pre-qualification, developer plan DB, Fawry reservation |
| 16 | SEO & Content Intelligence | 🔜 Future | Neighborhood guides, Arabic blog CMS, schema.org upgrades |
| 17 | Consumer Intelligence & Personalization | 🔜 Future | Recommendations engine, smart saved searches, behavior analytics |

---

---

## Phase 1: Foundation & Core Search ✅ COMPLETE

**Delivered:** Next.js 14 project initialized, all Prisma models, lib utilities, i18n, API routes, CRM sync pipeline, all UI components, all consumer pages.

### Completed Tasks

#### 1.1 — Project Setup ✅
- [x] Next.js 14 App Router initialized
- [x] Tailwind CSS with custom design tokens (Primary: #1B4F72, Gold: #D4AC0D, Cairo + Tajawal + Inter fonts)
- [x] Prisma schema with all 16 marketplace models
- [x] Redis client with graceful fallback (`src/lib/redis.ts`)
- [x] `next.config.ts` — image domains, security headers, next-intl plugin
- [x] Root layout with RTL support, Google fonts, NextIntlClientProvider

#### 1.2 — CRM Integration (Bridge + Webhook) ✅
- [x] `C:/firm/server/src/routes/marketplace-bridge.ts` — 5 HMAC-authenticated endpoints
- [x] `C:/firm/server/src/services/marketplaceSyncService.ts` — outbound webhook, fire-and-forget
- [x] `C:/firm/server/src/routes/properties.ts` — webhook trigger on status/price/image change
- [x] `C:/firm/server/src/routes/listings.ts` — webhook trigger on `isPublished` toggle
- [x] `src/app/api/webhook/crm/route.ts` — HMAC-verified receiver, async delegation
- [x] `src/services/listing-sync.ts` — processWebhook: upsert, price history, nanoid slugs
- [x] `src/scripts/initial-sync.ts` — bulk sync from CRM bridge API (50/page)

#### 1.3 — Core API Routes ✅
- [x] `src/app/api/search/route.ts` — full-text search, all filters, 5 sort modes, max 24/page
- [x] `src/app/api/listings/[slug]/route.ts` — detail + similar (4) + district stats + price history (24)
- [x] `src/app/api/inquire/route.ts` — rate-limited (5/phone/hr Redis), SHA-256 phone hash
- [x] `src/app/api/autocomplete/route.ts` — Redis-cached (5 min), min 2 chars

#### 1.4 — Frontend Components ✅
- [x] `src/components/ui/button.tsx`, `badge.tsx` — CVA variants
- [x] `src/components/trust/verification-badge.tsx` — LISTED / VERIFIED / GOLD shields
- [x] `src/components/trust/live-badge.tsx` — animated pulse sync indicator
- [x] `src/components/listing/listing-card.tsx` — image, specs, badges, favorite toggle
- [x] `src/components/layout/marketplace-header.tsx` — sticky RTL, mobile hamburger
- [x] `src/components/layout/mobile-bottom-nav.tsx` — 5-tab fixed bottom nav
- [x] `src/components/layout/marketplace-footer.tsx` — dark 4-col grid
- [x] `src/components/inquiry/inquiry-modal.tsx` — Inquiry Shield modal
- [x] `src/components/search/search-filters.tsx` — filter panel with monthly budget toggle

#### 1.5 — Pages ✅
- [x] `src/app/(public)/layout.tsx` — route group with header/footer/mobile nav
- [x] `src/app/(public)/page.tsx` — hero search, stats bar, featured listings, districts, how-it-works (ISR 60s, WebSite JSON-LD)
- [x] `src/app/(public)/search/page.tsx` — SSR search results, filter sidebar, pagination
- [x] `src/app/(public)/search/search-filters-panel.tsx` — client filter wrapper, URL navigation, mobile bottom sheet
- [x] `src/app/(public)/listings/[slug]/page.tsx` — ISR detail (revalidate 60s), gallery, specs, RealEstateListing JSON-LD
- [x] `src/app/(public)/listings/[slug]/inquiry-button.tsx` — client InquiryModal trigger
- [x] `src/app/sitemap.ts` — dynamic Prisma-sourced, 50k limit
- [x] `src/app/robots.ts` — disallow /api/, /auth/, /profile/, /favorites/

#### 1.6 — i18n ✅
- [x] `src/i18n/request.ts` — next-intl server config
- [x] `src/i18n/messages/ar.json` — full Arabic strings for Phase 1
- [x] `src/i18n/messages/en.json` — full English strings for Phase 1

**Exit criteria met:** API routes operational, ISR pages render, CRM sync pipeline wired, no private data in any response.

---

## Phase 2: Trust Layer ✅ COMPLETE (Mapbox → Phase 5)

**Delivered:** Aqar Score service and nightly scoring, district and firm overview pages, installment calculator, price history chart, district stats card, AqarScore badge, all wired into listing detail page.

### Completed Tasks

#### 2.1 — Aqar Score Service ✅
- [x] `src/services/aqar-score.ts`
  - [x] `computeScore(listing, districtStats)` — 5 factors: price competitiveness (30%), demand velocity (25%), price trend (25%), broker track record (10%), freshness (10%)
  - [x] `recomputeAll()` — batch update all active listings, 100 per chunk
  - [x] `updateDistrictStats()` — aggregate avgPricePerSqm, medianPrice, priceChange6m per district/type

#### 2.2 — Components ✅
- [x] `src/components/trust/aqar-score-badge.tsx` — SVG circular ring, 4 color tiers, 3 sizes, Arabic label
- [x] `src/components/listing/installment-calculator.tsx` — interactive sliders, developer terms block, 20% Egypt rate, Decimal.js
- [x] `src/components/listing/price-history-chart.tsx` — Recharts line, Arabic dates, custom tooltip
- [x] `src/components/listing/district-stats-card.tsx` — Decimal.js price vs district avg comparison (green/amber/red)

#### 2.3 — Pages ✅
- [x] `src/app/(public)/district/[city]/[district]/page.tsx` — ISR district overview: breadcrumb, stats pills, price trend banner, listings grid
- [x] `src/app/(public)/firm/[slug]/page.tsx` — ISR firm profile: logo, name, stats, listing grid

#### 2.4 — Wired into Listing Detail ✅
- [x] AqarScoreBadge rendered next to price
- [x] DistrictStatsCard in main content area
- [x] PriceHistoryChart after district stats
- [x] InstallmentCalculator in right-column sticky card

#### 2.5 — Deferred to Phase 5 ⚠️
- [ ] Mapbox listing map pin (property detail page)
- [ ] Mapbox search map view (clustered pins, grid/map toggle)
- [ ] District heatmap (price intensity per district)
- [ ] Property comparison tool (deferred to Phase 8)

---

## Phase 3: Lead Intelligence ⚠️ PARTIALLY COMPLETE

**Delivered:** OTP auth (send/verify), consumer sessions, profile (GET/PUT), favorites CRUD, price alerts CRUD, consumer profile page, favorites page, alerts management page. WhatsApp delivery and Inquiry Shield opt-in flow deferred.

### Completed Tasks

#### 3.1 — Consumer Auth ✅
- [x] `src/app/api/auth/otp/send/route.ts` — rate-limited (3/10min Redis), OTP stored, code logged to console
- [x] `src/app/api/auth/otp/verify/route.ts` — 5-attempt lockout, Consumer upsert + SHA-256 phoneHash, 7-day session
- [x] `src/app/api/auth/session/route.ts` — internal session validator for middleware
- [x] `src/middleware.ts` — edge middleware, Bearer token → x-consumer-id header
- [x] `src/lib/consumer-auth.ts` — SSR-safe localStorage helpers, fetchWithAuth
- [x] `src/app/(public)/auth/login/page.tsx` + `login-form.tsx` — 2-step OTP flow, 60s resend countdown

#### 3.2 — Consumer APIs ✅
- [x] `src/app/api/me/route.ts` — GET/PUT consumer profile
- [x] `src/app/api/favorites/route.ts` — GET with full listing data
- [x] `src/app/api/favorites/[slug]/route.ts` — POST/DELETE with favoriteCount sync
- [x] `src/app/api/alerts/route.ts` — GET/POST listing-specific alerts
- [x] `src/app/api/alerts/[id]/route.ts` — DELETE (soft: isActive = false)

#### 3.3 — Consumer Pages ✅
- [x] `src/app/(public)/favorites/page.tsx` — auth-gated grid with optimistic favorite toggle
- [x] `src/app/(public)/profile/page.tsx` — profile form, logout
- [x] `src/app/(public)/profile/alerts/page.tsx` — alert management

#### 3.4 — Deferred to Phase 6 ⚠️
- [ ] WhatsApp OTP actual delivery (currently console.log only)
- [ ] Inquiry Shield full WhatsApp opt-in flow
- [ ] Inbound WhatsApp webhook handler
- [ ] 24h opt-in reminder cron
- [ ] Consumer inquiry status tracking page
- [ ] Viewing scheduler component + flow
- [ ] WhatsApp search bot ("شقق زمالك 3 غرف")
- [ ] Google Sign In (Capacitor plugin)
- [ ] Apple Sign In (iOS App Store requirement)
- [ ] Saved searches with new-match-count badge

---

## Phase 4: Mobile Native ⚠️ PARTIALLY COMPLETE

**Delivered:** Capacitor config, geolocation nearby search API + page, Web Push service, push subscription API (Redis), IndexedDB offline cache, service worker, SW registrar in root layout.

### Completed Tasks

#### 4.1 — Capacitor Config ✅
- [x] `capacitor.config.ts` — appId: com.aqartrust.marketplace, Geolocation + PushNotifications + SplashScreen + StatusBar plugins

#### 4.2 — Geolocation ✅
- [x] `src/app/api/search/nearby/route.ts` — Haversine $queryRaw, radius up to 50km, distance_km per listing
- [x] `src/app/(public)/nearby/page.tsx` — geolocation request, radius selector (5/10/20/50km), distance badge overlay

#### 4.3 — Push Notifications ✅
- [x] `src/services/push-notifications.ts` — web-push VAPID, sendPriceDropAlerts (via Favorites), sendNewMatchAlerts
- [x] `src/app/api/push/subscribe/route.ts` — POST/DELETE Redis-stored subscription (TTL 30d)

#### 4.4 — PWA / Offline ✅
- [x] `src/lib/offline.ts` — IndexedDB (aqar-offline-v1), cacheListingsOffline, getCachedListings, isOnline
- [x] `src/components/sw-registrar.tsx` — client-side service worker registration
- [x] `public/sw.js` — push event handler, notificationclick, stale-while-revalidate fetch strategy
- [x] Service worker wired into root layout

#### 4.5 — Deferred to Phases 7–8 ⚠️
- [ ] Full Capacitor plugin setup: `@capacitor/share`, `@capacitor/haptics`, `@capacitor/browser`
- [ ] Native push via FCM (Android) + APNs (iOS) — currently Web Push only
- [ ] Apple Sign In via Capacitor (iOS App Store requirement)
- [ ] Deep links: `aqar://listings/:slug` (Universal Links + App Links)
- [ ] Search query caching in Redis (popular queries, TTL 2min)
- [ ] Cloudflare edge caching for listing pages (60s, purge on webhook)
- [ ] PgBouncer / Prisma Accelerate connection pooling
- [ ] Sentry error monitoring + PostHog analytics
- [ ] Monthly market reports (Puppeteer PDF, HTML pages)
- [ ] App Store / Google Play submission

---

---

## Phase 5: Mapbox Maps & Geographic Discovery 🔜

**Goal:** Interactive maps on listing detail pages, search map view with clustered pins, district heatmap, draw-a-search polygon, commute-time isochrone search.

**Priority:** HIGH — #1 expected feature missing from the platform.

### Tasks

#### 5.1 — Mapbox Foundation
- [ ] Install `mapbox-gl` + `mapbox-gl-rtl-text` (already in package.json, needs RTL plugin config)
- [ ] Create `src/lib/mapbox.ts` — VAPID config, RTL text plugin setup:
  ```typescript
  mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
    null
  );
  ```
- [ ] Add `NEXT_PUBLIC_MAPBOX_TOKEN` to environment variables
- [ ] Create custom map style (navy water #1B4F72, minimal Arabic labels)

#### 5.2 — Listing Detail Map (`src/components/map/listing-map.tsx`)
- [ ] `'use client'` Mapbox GL JS component
- [ ] Single property pin with price overlay label
- [ ] Custom marker: shield icon in primary-700 color
- [ ] Nearby POI layer: metro stations, schools, hospitals (Mapbox POI tileset)
- [ ] "فتح في خرائط جوجل" link button (using googleMapsUrl if available, else lat/lng)
- [ ] Mobile: fixed height 250px with expand-to-fullscreen button
- [ ] Graceful fallback if `latitude`/`longitude` are null: show address text instead of map
- [ ] Wire into `listings/[slug]/page.tsx` — render between specs and district stats

#### 5.3 — Search Map View (`src/components/map/search-map.tsx`)
- [ ] `'use client'` map view for search results page
- [ ] Clustered listing pins (Mapbox `cluster: true` source)
- [ ] Click cluster → zoom in to reveal individual pins
- [ ] Click pin → listing card popup (image, price, beds/baths, badge)
- [ ] Popup "عرض التفاصيل" link → `/listings/{slug}`
- [ ] Pins color-coded by verification tier (grey/blue/gold)
- [ ] Map/grid toggle button in `search/page.tsx` — URL param `?view=map`
- [ ] Mobile: full-screen map with bottom sheet listing strip (10 listings, horizontal scroll)
- [ ] Map bounds auto-update → triggers new search with `bbox` param
- [ ] New API param: `GET /api/search?bbox=lng1,lat1,lng2,lat2` (add to search route)

#### 5.4 — District Heatmap (`src/components/map/district-heatmap.tsx`)
- [ ] Egypt-wide map with district-level fill layer
- [ ] Fill color = avgPricePerSqm intensity (light blue → dark blue gradient)
- [ ] Data source: `GET /api/map/districts` → returns GeoJSON + stats per district
- [ ] Create `src/app/api/map/districts/route.ts` — returns active district stats with boundaries
  - Hardcode simplified GeoJSON boundaries for top 20 Cairo districts
  - Join with `DistrictStats` table for price data
- [ ] Click district polygon → popup with stats (avg price, count, trend)
- [ ] Popup "عرض عقارات المنطقة" → `/search?district={name}`
- [ ] New page: `src/app/(public)/map/page.tsx` — full-screen Egypt heatmap
- [ ] Link from home page district showcase section

#### 5.5 — Draw-a-Search (`src/components/map/draw-search.tsx`)
- [ ] Mapbox Draw plugin for polygon drawing on search map
- [ ] "ارسم منطقة البحث" toggle button
- [ ] User draws polygon → API searches listings inside `ST_Within(point, polygon)` via `$queryRaw`
- [ ] New API param: `GET /api/search?polygon=[[lng,lat],...]` (PostGIS-style)
- [ ] Clear polygon button

#### 5.6 — Commute-Time Search
- [ ] Input: office address + max travel time (15/30/45/60 min) + mode (driving/transit/walking)
- [ ] Call Mapbox Isochrone API → get polygon → use as bbox filter
- [ ] `src/app/api/search/commute/route.ts` — proxies Mapbox Isochrone API (keeps token server-side)
- [ ] `src/app/(public)/search/commute/page.tsx` — commute search landing page
- [ ] "ابحث قريباً من العمل" CTA on home page and search page

**Exit Criteria:**
- [ ] Mapbox map renders on listing detail with RTL Arabic labels
- [ ] Search page has working map view with clustered pins
- [ ] District heatmap renders correctly for Cairo districts
- [ ] Arabic text renders right-to-left on all map labels

---

## Phase 6: WhatsApp Intelligence & Full Inquiry Shield 🔜

**Goal:** Actual WhatsApp OTP delivery, full Inquiry Shield opt-in handshake, inbound WhatsApp webhook, viewing scheduler, WhatsApp search bot.

**Priority:** HIGH — Inquiry Shield is a core brand promise; current OTP just logs to console.

### Tasks

#### 6.1 — WhatsApp OTP Delivery
- [ ] Wire `ULTRAMSG_TOKEN` + `ULTRAMSG_INSTANCE_ID` into OTP send route
- [ ] Create `src/lib/whatsapp.ts`:
  ```typescript
  export async function sendWhatsApp(phone: string, message: string): Promise<void>
  // POST https://api.ultramsg.com/{instanceId}/messages/chat
  // Body: { token, to: phone, body: message }
  ```
- [ ] Update `src/app/api/auth/otp/send/route.ts` — replace `console.log` with `sendWhatsApp(phone, "رمز التحقق: {code}")`
- [ ] Test end-to-end: phone input → WhatsApp received → code entered → session created

#### 6.2 — Full Inquiry Shield WhatsApp Flow
- [ ] Update `src/app/api/inquire/route.ts`:
  1. Create Inquiry record (status: PENDING)
  2. Call `sendWhatsApp(consumerPhone, "استفساركم عن [العقار]. للموافقة على مشاركة رقمك مع الوسيط، رد بـ: نعم")`
  3. Update status → WHATSAPP_SENT, set `expiresAt = now + 48h`
  4. Notify broker in CRM: `crmBridgeApi.notifyBrokerInquiryPending(crmFirmId, crmPropertyId, inquiryId)`
  5. Add new CRM bridge endpoint: `POST /api/marketplace-bridge/notify-broker`
- [ ] Create `src/app/api/webhook/whatsapp/route.ts` — inbound WhatsApp handler:
  - Verify Ultramsg webhook signature
  - Match phone → find open `WHATSAPP_SENT` inquiry
  - Message = "نعم" or "yes" → call `crmBridgeApi.createInquiry()`, update status → OPTED_IN, notify broker
  - Message = "لا" or "no" → update status → DECLINED, send "تم الإلغاء" reply
  - Any other message → ignore or send help text
- [ ] 24h opt-in reminder cron:
  - Add to `src/services/cron.ts` (create if not exists)
  - Find WHATSAPP_SENT inquiries where `createdAt < now - 24h` and `expiresAt > now`
  - Send reminder: "هل لا تزال مهتماً؟ اضغط نعم للمتابعة أو لا للإلغاء"
- [ ] Consumer inquiry tracking page: `src/app/(public)/profile/inquiries/page.tsx`
  - List all consumer's inquiries with status badge (PENDING/OPTED_IN/DECLINED/EXPIRED)

#### 6.3 — Viewing Scheduler
- [ ] `src/components/inquiry/viewing-scheduler.tsx`
  - Calendar date picker (next 14 days, weekdays + Fridays)
  - Time slots: 10am / 12pm / 2pm / 4pm / 6pm
  - Add `preferredViewingDate` to inquiry form
  - WhatsApp confirmation to consumer: "تم حجز موعد معاينة [العقار] يوم [date] الساعة [time]. سيتواصل معكم الوسيط للتأكيد."
- [ ] Wire into InquiryModal — add "حجز معاينة" tab alongside standard inquiry form

#### 6.4 — Google + Apple Sign In
- [ ] Add Google OAuth to consumer auth:
  - `POST /api/auth/google/route.ts` — accepts Google ID token, verifies via Google API, upserts Consumer
  - Add Google Sign In button to `login-form.tsx`
- [ ] Apple Sign In (iOS App Store requirement):
  - `POST /api/auth/apple/route.ts` — verifies Apple JWT, upserts Consumer
  - Apple button renders only on iOS (detect via user agent or Capacitor platform check)

#### 6.5 — WhatsApp Search Bot
- [ ] Extend `src/app/api/webhook/whatsapp/route.ts` to handle search queries:
  - Pattern: "شقق [district] [beds] غرف" → parse → call search API → format top 3 results
  - Format: image URL + price + title + link per result
  - Send via Ultramsg template messages (3 results as list)
  - Fallback to link: "اضغط هنا للبحث المتقدم: {searchUrl}"
- [ ] Register webhook URL with Ultramsg instance

#### 6.6 — Saved Searches with New-Match Count
- [ ] `src/app/api/searches/route.ts` — GET/POST saved searches
- [ ] `src/app/api/searches/[id]/route.ts` — DELETE
- [ ] "حفظ البحث" button on search results page (auth-gated)
- [ ] `src/app/(public)/profile/searches/page.tsx` — list saved searches, "X نتيجة جديدة منذ آخر زيارة"
- [ ] 6h cron: run saved searches, compare result count to `lastResultCount`, if new → push + WhatsApp notification

**Exit Criteria:**
- [ ] OTP arrives via WhatsApp within 10 seconds
- [ ] Inquiry Shield end-to-end: form → WhatsApp → YES reply → CRM lead created
- [ ] Broker notified in CRM dashboard when inquiry pending
- [ ] WhatsApp bot responds to "شقق المعادي" with 3 formatted listings

---

## Phase 7: Performance & Scale Hardening 🔜

**Goal:** Production-ready performance, monitoring, and infrastructure.

### Tasks

#### 7.1 — Redis Search Cache
- [ ] Cache popular search results in Redis (TTL: 2 min)
- [ ] Cache key = MD5 hash of sorted query params
- [ ] Cache invalidation: when new listing published in same city/district → purge matching cache keys
- [ ] Benchmark: search endpoint <100ms cached, <400ms cold

#### 7.2 — Cloudflare Edge Caching
- [ ] Configure Cloudflare Page Rules for listing detail pages: `Cache-Control: s-maxage=60`
- [ ] On-demand cache purge: add Cloudflare API call to webhook handler after listing update
  ```typescript
  // After processWebhook succeeds, purge Cloudflare cache for the affected slug
  await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
    method: 'POST', headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    body: JSON.stringify({ files: [`${APP_URL}/listings/${slug}`] })
  })
  ```
- [ ] Static assets (images, fonts, CSS): `Cache-Control: max-age=31536000, immutable`

#### 7.3 — Database Connection Pooling
- [ ] Set up PgBouncer in transaction mode OR use Prisma Accelerate
- [ ] Update `DATABASE_URL` to use pooler endpoint
- [ ] Test: 100 concurrent requests without "too many clients" errors

#### 7.4 — Rate Limiting Hardening
- [ ] Replace any in-memory rate limiters with Redis sliding window
- [ ] Add rate limits to remaining public endpoints (autocomplete: 60/min, map/districts: 30/min)
- [ ] Add DDoS protection rules in Cloudflare (challenge bots on /api/search at >100 req/min per IP)

#### 7.5 — Monitoring & Observability
- [ ] Install Sentry: `npm install @sentry/nextjs`
- [ ] Configure `sentry.client.config.ts` + `sentry.server.config.ts`
- [ ] Capture all unhandled API errors with request context
- [ ] Install PostHog: `npm install posthog-js`
- [ ] Track key events: search, listing view, inquiry submit, favorite add, auth
- [ ] Create PostHog dashboard: Daily Active Users, Search→Inquiry funnel, Top viewed listings

#### 7.6 — Full Capacitor Native Setup
- [ ] Run `npx cap add ios && npx cap add android`
- [ ] Install native plugins: `@capacitor/share`, `@capacitor/haptics`, `@capacitor/browser`
- [ ] Configure deep links:
  - iOS: `apple-app-site-association` file in `public/.well-known/`
  - Android: `assetlinks.json` + intent filters in `AndroidManifest.xml`
- [ ] Native push: FCM for Android (add `google-services.json`), APNs for iOS (add push certificate)
- [ ] Add "Share" button to listing detail page (Capacitor Share API)
- [ ] Haptic feedback on favorite toggle (`Haptics.impact({ style: 'Light' })`)

#### 7.7 — Load Testing
- [ ] Install k6 or Artillery
- [ ] Write test script: 1000 concurrent users hitting search + listing detail
- [ ] Exit criteria: p95 <500ms, p99 <1000ms, zero 5xx errors
- [ ] Run test weekly in CI (GitHub Actions)

**Exit Criteria:**
- [ ] Search endpoint: <100ms cached, <400ms cold on 1000 concurrent users
- [ ] Sentry capturing errors with <1% error rate target
- [ ] Cloudflare cache hit rate >80% for listing pages
- [ ] Native iOS + Android apps build and run correctly

---

## Phase 8: Market Reports, Comparison Tool & App Store 🔜

**Goal:** Monthly PDF market reports, property comparison tool, app store submission.

### Tasks

#### 8.1 — Cairo Real Estate Index (Monthly Market Report)
- [ ] `src/services/market-report.ts` — aggregation service:
  - Pulls from `DistrictStats` for all districts
  - Computes: top gaining districts, fastest-selling, best ROI estimate, monthly summary stats
  - Generates structured report data (JSON)
- [ ] `src/app/(public)/market/page.tsx` — live index dashboard:
  - Cards: top 5 districts by price growth, fastest-selling, highest demand
  - Bar chart: avg price/sqm per district (Recharts)
  - Line chart: Cairo-wide price trend (last 12 months)
  - CTA: "تحميل التقرير الكامل PDF"
- [ ] `src/app/(public)/market/[period]/page.tsx` — archived monthly reports (e.g. `/market/2026-03`)
- [ ] PDF generation via Puppeteer (Arabic RTL A4):
  - `src/app/api/market/report/[period]/pdf/route.ts` — triggers Puppeteer render
  - Same pattern as CRM's PDF service
- [ ] Email delivery: monthly report sent to all verified consumers
- [ ] Create `MarketReport` record in DB for each generated report
- [ ] SEO: "تقرير السوق العقاري في القاهرة مارس 2026" — high-value keywords

#### 8.2 — Property Comparison Tool
- [ ] Zustand store: `src/store/comparison.store.ts`
  - Max 3 listings, persists to localStorage
  - Actions: `addToComparison(slug)`, `removeFromComparison(slug)`, `clearComparison()`
- [ ] `src/components/layout/comparison-drawer.tsx` — fixed bottom bar "قارن (N)" when items added
- [ ] `src/app/(public)/compare/page.tsx` — side-by-side table:
  - Rows: price, price/sqm, area, beds, baths, floor, verification tier, Aqar Score, financing (monthly from)
  - Best-value column highlight (green background on lowest price, highest score)
  - "استفسر عن الكل" bulk inquiry button
  - "حذف من المقارنة" X button per column
- [ ] Add "إضافة للمقارنة" button on listing cards and detail page
- [ ] Mobile: comparison drawer collapses to floating button, full-screen modal on tap

#### 8.3 — App Store Submission (iOS)
- [ ] App icons: 1024×1024 master icon with shield motif (Arabic branding)
- [ ] Splash screens: Arabic "عقار ثرست" on navy background for all required sizes
- [ ] Screenshots: 6.7" iPhone screenshots in Arabic (home, search, listing detail, map, profile)
- [ ] App Store description (Arabic primary, English secondary):
  - Keywords: "عقارات", "شقق للبيع", "عقارات مصر", "كراء شقق"
- [ ] Privacy manifest: declare data usage (App Store requirement since iOS 17)
- [ ] Universal Links configuration for deep linking
- [ ] Submit for App Store review

#### 8.4 — Google Play Submission (Android)
- [ ] Android adaptive icon + feature graphic (Arabic)
- [ ] Screenshots: all required Android screen sizes in Arabic
- [ ] Play Store listing with Arabic description
- [ ] App Links configuration for deep linking
- [ ] Sign APK with release keystore
- [ ] Submit to Play Store

**Exit Criteria:**
- [ ] Market report page renders correctly with live district stats
- [ ] PDF report generates in <10s with correct Arabic RTL layout
- [ ] Comparison tool handles 2-3 listings side by side on mobile
- [ ] iOS app approved and live on App Store
- [ ] Android app approved and live on Play Store

---

---

## Phase 9: Developer & Project Pages ✅ COMPLETE

**Goal:** New-build compound pages competing directly with Nawy. Unit availability matrix, 3D compound overview, reservation flow.

**Why now:** New-build properties are 60%+ of Egyptian real estate search volume. Without compound pages, we cede this to Nawy entirely.

### Tasks

#### 9.1 — Schema Additions
- [ ] Add `Project` model to Prisma schema:
  ```prisma
  model Project {
    id              String   @id @default(cuid())
    slug            String   @unique
    nameAr          String
    nameEn          String?
    developerNameAr String
    coverImageUrl   String?
    galleryImages   String[]
    videoUrl        String?
    virtualTourUrl  String?
    district        String
    city            String
    latitude        Decimal? @db.Decimal(10,7)
    longitude       Decimal? @db.Decimal(10,7)
    deliveryYear    Int?
    totalUnits      Int?
    availableUnits  Int?
    minPrice        Decimal  @db.Decimal(15,2)
    maxPrice        Decimal? @db.Decimal(15,2)
    hasFinancing    Boolean  @default(true)
    minDownPayment  Int?     // percent
    maxYears        Int?     // installment years
    amenities       String[] // "pool", "gym", "security", "parking"
    descriptionAr   String?
    isActive        Boolean  @default(true)
    publishedAt     DateTime @default(now())
    updatedAt       DateTime @updatedAt
    listings        Listing[]
  }
  ```
- [ ] Add `projectId` (optional) to `Listing` model

#### 9.2 — CRM Bridge Addition
- [ ] Add `GET /api/marketplace-bridge/projects` — paginated list of active developer projects
- [ ] Sync projects via initial-sync script

#### 9.3 — Pages
- [ ] `src/app/(public)/projects/page.tsx` — compound directory: filter by city, developer, delivery year, financing
- [ ] `src/app/(public)/projects/[slug]/page.tsx` — compound detail:
  - Hero: full-width cover image + video embed
  - Developer info + "مشروع موثق على عقار ثرست" badge
  - Amenities grid (icons: pool, gym, security, parking, etc.)
  - Unit type selector (Studio / 1BR / 2BR / 3BR / Villa) → filtered listing grid
  - Financing terms card: "قسط من X جنيه / شهر — مقدم X%"
  - Map with compound boundary polygon
  - "شقق متاحة في هذا المشروع" section linking to individual listings
  - Inquiry CTA: "استفسر عن المشروع"

#### 9.4 — Unit Availability Matrix
- [ ] Interactive floor/unit selector for structured developments
- [ ] Grid: floors (rows) × units-per-floor (columns)
- [ ] Color: green = available, amber = reserved, red = sold
- [ ] Click available unit → opens inquiry modal pre-filled with unit details

#### 9.5 — Reservation Flow
- [ ] "احجز الوحدة" CTA on project and listing pages (where `hasFinancing = true`)
- [ ] Reservation fee payment: integrate Fawry or Paymob for 5,000–10,000 EGP
- [ ] On payment success: set listing status to RESERVED, notify broker via CRM
- [ ] Consumer gets WhatsApp: "تم حجز وحدتك بنجاح. سيتواصل معكم الوسيط خلال 24 ساعة."

**Exit Criteria:**
- [ ] Project pages render with gallery, units, and financing terms
- [ ] Unit matrix shows availability correctly
- [ ] Reservation payment flow works end-to-end

---

## Phase 10: Maps & Market Intelligence *(Enhancement)* ✅ COMPLETE

**Goal:** Price heatmaps with real transaction data, Cairo Real Estate Index as a standalone media product, commute-time search.

*Note: Phase 10 expands on Phase 5's map work with richer data layers and the market intelligence publication.*

### Tasks

#### 10.1 — Price Heatmap (Upgrade from Phase 5)
- [ ] Add actual GeoJSON district boundaries for all Cairo districts (source: OpenStreetMap export)
- [ ] Color scale: compute min/max across all districts → normalize to 0–1 → map to blue spectrum
- [ ] Add map legend with price range labels
- [ ] Toggle layers: Avg Price/sqm · Listing Count · Price Trend (6-month %)
- [ ] Animate price trend: show how prices have moved over last 12 months (time-series slider)

#### 10.2 — Cairo Real Estate Index (Standalone Media Product)
- [ ] Compute on 1st of each month via cron
- [ ] Publish at `/market/index/[year]/[month]`
- [ ] Press-ready format: downloadable data table (CSV) for journalists
- [ ] Submit to Google News via RSS feed
- [ ] Tweet/social post automation on publish

#### 10.3 — Rental Yield Calculator
- [ ] On SALE listings: "عائد الإيجار التقديري: X%" based on district rental averages
- [ ] Formula: `estimated_annual_rent / asking_price × 100`
- [ ] Source: avg rental prices for same district + type from active RENT listings
- [ ] Display: "استثمار: عائد إيجار تقديري ٨٪" chip on listing cards

**Exit Criteria:**
- [ ] Heatmap accurately reflects transaction price data (not asking prices)
- [ ] Monthly index published automatically on 1st of month
- [ ] Rental yield displayed on SALE listings

---

## Phase 11: AI Valuation — Aqar Estimate *(Enhancement)* ✅ COMPLETE

**Goal:** Automated Valuation Model (AVM) using real closed transaction data. Egypt's first deal-data AVM.

### Tasks

#### 11.1 — Aqar Estimate Service (`src/services/aqar-estimate.ts`)

Hedonic pricing model (no ML required initially):

```typescript
interface EstimateResult {
  estimate: string;          // Decimal string "2300000"
  rangeLow: string;          // estimate × 0.92
  rangeHigh: string;         // estimate × 1.08
  confidence: 'high' | 'medium' | 'low';
  comparables: ComparableTransaction[];  // up to 5
  methodology: string;       // Arabic explanation
}

// Algorithm:
// 1. Find comparable deals: same city + district + propertyType + ±20% area
//    Source: CRM bridge /district-stats + aggregated deal data
// 2. Compute base $/sqm: weighted average (weight = 1/days_since_close)
// 3. Apply adjustments: +floor premium, +furnished, +exclusive, +verified tier
// 4. Apply trend: multiply by (1 + priceChange6m/100)
// 5. Range: ±8% confidence interval
// 6. Confidence: high if ≥10 comps, medium 5–9, low <5
```

- [ ] `src/app/api/estimate/route.ts` — `GET /api/estimate?city=&district=&type=&area=&beds=&floor=&isFurnished=`
- [ ] `src/app/(public)/estimate/page.tsx` — "ما قيمة عقارك؟" landing page:
  - Form: location, type, area, bedrooms, floor, furnished checkbox
  - Result card: "تقدير عقار ثرست: ١.٩م – ٢.٢م جنيه" + confidence bar + methodology note
  - 5 comparable transactions (anonymized: district, type, area, price, date)
  - CTA: "هل تريد بيع عقارك؟ أضفه للمنصة عبر شركتك العقارية"
- [ ] `src/components/trust/estimate-badge.tsx` — on listing detail: "تقدير عقار: ±١٠٪ من السعر المطلوب" (green/amber/red)
- [ ] Show estimate comparison on listing detail: "هذا العقار مقيَّم بـ X% [أعلى/أقل] من تقديرنا"

#### 11.2 — CRM Upsell
- [ ] Add `GET /api/v1/marketplace/estimate/:propertyId` to CRM bridge — returns broker-facing estimate
- [ ] CRM listing form: show "السعر المطلوب X جنيه | تقدير عقار ثرست: Y جنيه (+/-Z%)" insight widget
- [ ] Broker dashboard alert: "5 من عقاراتك أعلى بـ 15%+ من تقديرنا — قد يطول وقت البيع"

**Exit Criteria:**
- [ ] Estimate API returns result in <200ms
- [ ] Confidence is "high" for major districts (≥10 comparables)
- [ ] Estimate shown on all listing detail pages
- [ ] CRM broker dashboard shows estimate vs. asking price gap

---

## Phase 12: Broker Trust & Reputation System *(Enhancement)* ✅ COMPLETE

**Goal:** Verified broker tiers, consumer reviews (post-transaction only), SuperBroker program.

### Tasks

#### 12.1 — Broker Tier System
- [ ] Add fields to `Listing` model (already has `brokerDealCount`, `brokerResponseTime`):
  - `brokerSuccessRate: Float?` — deals closed / inquiries received ratio
  - `brokerVerifiedSince: DateTime?`
  - `brokerTier: String?` — STANDARD / TRUSTED / GOLD_BROKER
- [ ] Compute broker tier nightly in `aqar-score.ts` `updateDistrictStats()`:
  - STANDARD: active CRM broker, <2 stale listings
  - TRUSTED: ≥20 completed deals + avg response <24h
  - GOLD_BROKER: ≥50 completed deals + avg response <6h + ≥4.5 star rating

#### 12.2 — Consumer Reviews
- [ ] New Prisma model:
  ```prisma
  model BrokerReview {
    id          String   @id @default(cuid())
    consumerId  String
    crmFirmSlug String
    rating      Int      // 1–5
    commentAr   String?
    isVerified  Boolean  @default(false)  // only after CRM deal closed
    createdAt   DateTime @default(now())
  }
  ```
- [ ] Review trigger: after CRM deal marked COMPLETED → webhook fires → send consumer WhatsApp "كيف كانت تجربتك؟ قيّم الوسيط من ١ إلى ٥"
- [ ] `src/app/api/firms/[slug]/reviews/route.ts` — GET (paginated) + POST (auth required, verified)
- [ ] Star rating display on firm profile page
- [ ] Anti-fraud: only one review per consumer per firm per completed inquiry

#### 12.3 — SuperBroker Badge & Program
- [ ] `src/components/trust/super-broker-badge.tsx` — gold star badge for Gold Broker tier
- [ ] SuperBroker listings get priority placement in search results (boost `aqarScore + 5`)
- [ ] CRM dashboard: show broker their current tier + what's needed to level up

**Exit Criteria:**
- [ ] Broker tiers display correctly on listing cards and firm pages
- [ ] Consumer reviews submit successfully after verified transaction
- [ ] SuperBroker listings rank higher in search

---

## Phase 13: Arabic Natural Language Search *(Enhancement)* ✅ COMPLETE

**Goal:** Arabic conversational search using Claude API. "شقة ٣ غرف في المعادي بالتقسيط" → structured filters.

### Tasks

#### 13.1 — NL Query Parser (`src/app/api/search/ai/route.ts`)
- [ ] Install Anthropic SDK: `npm install @anthropic-ai/sdk`
- [ ] POST endpoint accepts `{ query: string }` (Arabic natural language)
- [ ] System prompt defines extraction schema:
  ```
  Extract search parameters from Arabic real estate queries.
  Return JSON: { city?, district?, propertyType?, transactionType?,
                 bedrooms?, maxPrice?, minPrice?, monthlyBudget?,
                 hasFinancing?, verificationTier? }
  Handle Egyptian Arabic dialects and abbreviations.
  ```
- [ ] Rate limit: 10 NL searches / consumer / hour (to control Claude API cost)
- [ ] Cache identical queries in Redis (TTL: 1h)
- [ ] Fallback: if Claude API unavailable, return `{ error: 'fallback' }` → client uses standard search

#### 13.2 — AI Search Bar (`src/components/search/ai-search-bar.tsx`)
- [ ] `'use client'` — replaces the current basic text input
- [ ] Placeholder: "جرب: شقة ٣ غرف في المعادي بأقل من ٢ مليون بالتقسيط"
- [ ] On submit: POST to `/api/search/ai` → apply returned filters → trigger search
- [ ] Show parsed filter chips: "٣ غرف" | "المعادي" | "حتى ٢ مليون" — each deletable
- [ ] Toggle: "البحث التقليدي ↔ البحث الذكي"
- [ ] Keyboard shortcut: `Ctrl+K` opens AI search modal

#### 13.3 — Smart Autocomplete Enhancement
- [ ] Autocomplete now suggests full query completions (not just location names):
  - "شقق المعا..." → suggests "شقق المعادي ٢ غرف للبيع", "شقق المعادي للإيجار", "شقق المعادي بالتقسيط"
- [ ] Query completion model: Redis sorted set of popular full queries, weight by click-through

**Exit Criteria:**
- [ ] "شقة ٣ غرف في المعادي" correctly parses to `{ propertyType: 'APARTMENT', bedrooms: 3, district: 'المعادي' }`
- [ ] NL search responds in <2s including Claude API call
- [ ] Smart autocomplete shows compound suggestions after 2 chars

---

## Phase 14: Rich Media — 3D Tours & Virtual Staging *(Enhancement)* ✅ COMPLETE

**Goal:** Matterport/Kuula 3D tour embed, floor plan viewer, AI virtual staging preview.

### Tasks

#### 14.1 — Virtual Tour Embed
- [ ] `src/components/listing/virtual-tour.tsx`:
  - `'use client'` — iframe embed (Matterport, Kuula, or direct mp4)
  - Show thumbnail with "▶ جولة ثلاثية الأبعاد" overlay button
  - Click → fullscreen iframe or modal
  - Mobile: native video player fallback for mp4 URLs
- [ ] `virtualTourUrl` field already exists in `Listing` model and `ListingDetail` type
- [ ] CRM side: add `virtualTourUrl` input to property form
- [ ] Display "جولة ٣D" badge on listing cards when `virtualTourUrl` is set
- [ ] Wire into listing detail page after gallery section

#### 14.2 — Floor Plan Viewer
- [ ] `src/components/listing/floor-plan-viewer.tsx`:
  - `next/image` with `layout="fill"` and pan/zoom via CSS transform
  - Fullscreen expand button
  - "مسقط الأرض" tab in gallery carousel
- [ ] `floorPlanUrl` already in `ListingDetail` type
- [ ] Add floor plan tab to existing image gallery on listing detail page

#### 14.3 — AI Virtual Staging
- [ ] `src/app/api/listings/[slug]/stage/route.ts`:
  - Accept `{ imageIndex: number, style: 'modern' | 'classic' | 'minimal' }`
  - Call Replicate API (Stable Diffusion inpainting) with "furnished room, Arabic style, photorealistic" prompt
  - Cache staged image URL in Redis (TTL: 7 days)
  - Return staged image URL
- [ ] `src/components/listing/staging-toggle.tsx` — "اعرض مفروشاً" toggle on empty-room images
- [ ] Rate limit: 3 staging requests per listing per consumer per day
- [ ] Add `REPLICATE_API_TOKEN` to environment variables

**Exit Criteria:**
- [ ] 3D tour renders in fullscreen on listing detail
- [ ] Floor plan displays with zoom capability
- [ ] Virtual staging generates in <15s for a sample unfurnished room

---

## Phase 15: Financial Ecosystem *(Enhancement)* ✅ COMPLETE

**Goal:** Bank mortgage pre-qualification, developer payment plan database, online reservation fee payment.

### Tasks

#### 15.1 — Mortgage Pre-Qualification
- [ ] `src/app/(public)/finance/pre-qualify/page.tsx`:
  - Form: monthly income, employment type (employed/self-employed/business owner), nationality
  - Submit → instant "تأهل مبدئي لتمويل حتى X جنيه" calculation (formula: income × 7 × 12 × max_ltv)
  - CTA: "تقدم لطلب التمويل" → sends email/WhatsApp to bank partner contact
- [ ] Pre-qualification badge on search results: filter "أعرض العقارات ضمن تمويلي" (requires pre-qual)
- [ ] Partner banks to approach: NBE, CIB, Banque Misr, HDB (Housing & Development Bank)

#### 15.2 — Developer Payment Plan Database
- [ ] `DeveloperPlan` model (if not already via Project model):
  ```prisma
  model DeveloperPlan {
    id             String   @id @default(cuid())
    firmSlug       String
    compound       String?
    unitType       String?
    downPaymentPct Int      // minimum down payment percent
    years          Int      // installment years
    monthlyFrom    Decimal  @db.Decimal(15,2)
    bankPartner    String?
    validUntil     DateTime?
    createdAt      DateTime @default(now())
  }
  ```
- [ ] CRM: brokers enter developer plans in new "خطط التقسيط" tab
- [ ] CRM bridge endpoint: `GET /api/marketplace-bridge/developer-plans`
- [ ] Show in search filters: "عرض خطط التقسيط فقط" + "مقدم من X%"

#### 15.3 — Reservation Fee Payment (Fawry/Paymob)
- [ ] Integrate Fawry or Paymob API for online payment
- [ ] `src/app/api/payments/reserve/route.ts`:
  - Creates payment order for 5,000 or 10,000 EGP reservation fee
  - On payment success: set `Listing.status = RESERVED`, notify broker via CRM bridge
  - On payment failure: return error, do not change listing status
- [ ] Consumer gets WhatsApp confirmation with booking reference
- [ ] Auto-cancel reservation after 48h if broker doesn't confirm

**Exit Criteria:**
- [ ] Pre-qualification form calculates correctly using Decimal.js
- [ ] Developer plans sync from CRM and display on listings/search
- [ ] Reservation payment flow completes end-to-end in staging environment

---

## Phase 16: SEO & Content Intelligence *(Enhancement)* ✅ COMPLETE

**Goal:** Neighborhood guides, Arabic blog CMS, advanced schema.org markup, press-ready market data.

### Tasks

#### 16.1 — Auto-Generated Neighborhood Guides
- [ ] `src/app/(public)/guide/[city]/[district]/page.tsx` — ISR 24h:
  - Dynamic title: "دليل عقارات [district] [year]"
  - Sections: avg price, price trend chart, "أفضل شوارع [district]", nearby metro/schools
  - Data: from DistrictStats + listings aggregate
  - "أفضل العقارات المتاحة الآن" — 6 listings from `/api/search?district=X&sortBy=score`
  - Schema.org `Article` + `BreadcrumbList` + `FAQPage` (common buyer questions)
- [ ] Add 500+ guide pages to sitemap.ts
- [ ] Internal linking: district pages → guide pages → listing pages

#### 16.2 — Arabic Blog CMS
- [ ] Install Contentlayer or MDX: `npm install contentlayer next-contentlayer`
- [ ] `src/app/(public)/blog/page.tsx` — article index
- [ ] `src/app/(public)/blog/[slug]/page.tsx` — article page with ISR
- [ ] Article schema: frontmatter `title`, `titleAr`, `publishedAt`, `district?`, `tags`
- [ ] Schema.org `Article` + `NewsArticle` structured data
- [ ] RSS feed at `/blog/rss.xml` — auto-submit to Google News
- [ ] Suggested monthly topics auto-generated from search trend data

#### 16.3 — Enhanced Schema.org
- [ ] `AggregateRating` on firm pages (broker review score)
- [ ] `FloorPlan` schema on listings with floor data
- [ ] `GeoCoordinates` on all listings with lat/lng
- [ ] `PriceSpecification` with installment terms
- [ ] `LodgingBusiness` for rental properties
- [ ] Validate all structured data via Google Rich Results Test

#### 16.4 — Technical SEO Hardening
- [ ] Canonical URLs on all pages (prevent duplicate content from filters)
- [ ] `hreflang` alternate tags (ar-EG ↔ en-EG)
- [ ] Core Web Vitals optimization:
  - LCP: preload hero image, use `priority` on first listing card images
  - CLS: reserve space for lazy-loaded images using aspect-ratio
  - FID/INP: defer non-critical JS
- [ ] Google Search Console property claim + sitemap submission
- [ ] Lighthouse: SEO ≥97, Performance ≥90, Accessibility ≥92

**Exit Criteria:**
- [ ] 500+ neighborhood guide pages indexed in Google
- [ ] Blog RSS feed accepted by Google News
- [ ] All listing pages pass Rich Results Test with no warnings
- [ ] Core Web Vitals all "Good" on real user monitoring

---

## Phase 17: Consumer Intelligence & Personalization *(Enhancement)* ✅ COMPLETE

**Goal:** AI-powered recommendations, smart saved searches, consumer behavior analytics, retention loops.

### Tasks

#### 17.1 — Recommendations Engine (`src/services/recommendation.ts`)
- [ ] Collaborative filtering (item-based):
  - Build co-view matrix: "consumers who viewed X also viewed Y" (from ViewHistory)
  - Compute daily: for each active listing, top 5 co-viewed listings
  - Store in Redis: `recs:listing:{id}` → JSON array of recommended slugs
- [ ] `src/app/api/recommendations/route.ts`:
  - `GET /api/recommendations?slug=X` → returns 4 recommended listings (from Redis)
  - `GET /api/recommendations/personalized` (auth) → recommendations based on consumer's ViewHistory
- [ ] `src/components/listing/recommendations-strip.tsx`:
  - "عقارات قد تعجبك" horizontal scroll strip
  - On home page: personalized (if logged in) or popular (if anonymous)
  - On listing detail: "مشابه لما شاهدته مؤخراً"

#### 17.2 — Smart Saved Searches
- [ ] Wire up existing `SavedSearch` model (schema exists, API deferred from Phase 3)
- [ ] `src/app/api/searches/route.ts` — GET/POST saved searches
- [ ] 6h cron (`src/services/cron.ts`):
  - Run all active saved searches
  - Compare to previous `resultCount`
  - If new results: update count + send WhatsApp/push: "وجدنا ٤ عقارات جديدة تطابق بحثك في المعادي"
- [ ] Consumer search dashboard: `src/app/(public)/profile/searches/page.tsx`
  - Show each saved search with "X نتيجة جديدة منذ آخر زيارتك" count badge
  - One-click "تشغيل البحث" button

#### 17.3 — View History & Recently Viewed
- [ ] `src/app/api/history/route.ts` — GET recently viewed (from Redis sorted set OR ViewHistory DB)
  - Redis: `history:consumer:{id}` sorted set, score = timestamp, max 50 entries
  - Fire-and-forget write on listing detail page view (when consumer is authenticated)
- [ ] "شاهدت مؤخراً" strip on home page for logged-in consumers
- [ ] "تابعت هذا العقار X مرة" insight on listing detail (auth only)

#### 17.4 — Consumer Analytics Dashboard (Internal)
- [ ] PostHog dashboard (from Phase 7): consumer behavior funnels
- [ ] Key metrics to track:
  - Search → Listing View → Inquiry → Opt-In conversion funnel
  - Average sessions per consumer per week
  - Most-favorited districts
  - Consumer budget distribution (histogram)
  - Return visit rate after inquiry
- [ ] CRM-side: "Marketplace Channel Performance" widget showing per-firm metrics

**Exit Criteria:**
- [ ] Recommendations render on home page and listing detail
- [ ] Saved search alert sends WhatsApp within 6h of new matching listing
- [ ] View history persists across sessions for logged-in consumers
- [ ] PostHog funnel shows Search → Inquiry conversion rate

---

## Competitive Positioning

| Data Point | Our Source | Competitor Can Replicate? |
|-----------|-----------|--------------------------|
| "Last verified 8 min ago" | CRM property.updatedAt — broker uses this daily | ❌ No liveness signal |
| "Sells in 38 days here" | actual deal.actualCloseDate across 50+ firms | ❌ They see listing dates, not close dates |
| "12% below district avg" | real closed deal values, not asking prices | ❌ They only aggregate asking prices |
| "Broker responds in 2h avg" | CRM Activity first-response timestamps | ❌ No broker accountability |
| "Gold Verified: title deed + exclusive" | Document model with approval + e-signature | ❌ "Verified" badges are pay-to-play |
| "From 8,500 EGP/month" | InstallmentSchedule from real deal structures | Partial (Nawy: developer data only) |
| "Aqar Estimate: ±8%" | Cross-firm deal velocity + price comp data | ❌ No cross-firm transaction data |

---

## The Broker Flywheel (Our Moat)

```
Broker uses CRM daily (commissions depend on accurate data)
  → One-click publish = free marketing with zero extra effort
    → Marketplace brings pre-qualified, opted-in leads
      → Lead source "MARKETPLACE" tracked in CRM analytics
        → Broker sees ROI → upgrades CRM plan
          → More active CRM use = fresher marketplace data
            → Better data = more consumer trust
              → More trust = more organic traffic (SEO)
                → More traffic = more leads for brokers
                  → Broker recommends CRM to colleagues
```

**Competitors cannot enter this flywheel from either end without building both sides simultaneously.**

---

*Build it to be the most trusted property platform in Egypt.*
*ابنِه ليكون أكثر منصة عقارية موثوقة في مصر.*
