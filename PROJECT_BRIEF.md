# PROJECT_BRIEF.md — Aqar Trust Platform
## منصة عقار ثرست — سوق العقارات B2C

> **For any AI reading this:** Start here. This file tracks the live build state.
> - `CLAUDE.md` — specification, tech stack, non-negotiable rules, GitHub workflow
> - `master_plan.md` — complete phase-by-phase task list with exit criteria (Phases 1–17)
>
> **MANDATORY UPDATE RULE:** Every session that modifies any file MUST update this brief AND push to GitHub before the session ends.

---

## Quick Reference

| Item | Value |
|---|---|
| Project root | `C:/firm/B2C/` |
| Spec | `CLAUDE.md` |
| Phase task list | `IMPLEMENTATION_PLAN.md` |
| GitHub repo | `https://github.com/samh-dev91/aqar-marketplace` |
| Last updated | 2026-03-22 |
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (separate from CRM) |
| CRM repo | `https://github.com/samh-dev91/realestate-crm` |
| Related project | `C:/firm/` — CRM platform that feeds this marketplace |

---

## Current Build State

### Phase Status

| Phase | Name | Status | Notes |
|---|---|---|---|
| A | Foundation & Core Search | ✅ Complete | All tasks done: foundation, lib, API routes, components, pages |
| B | Trust Layer | ✅ Complete | Aqar Score service, district/firm pages, installment calculator, price history chart |
| C | Lead Intelligence | ✅ Complete | OTP auth, consumer sessions, favorites, price alerts, profile — WhatsApp OTP deferred to Phase D |
| D | Mobile Native | ✅ Complete | Capacitor config, geolocation nearby search, Web Push service, offline IndexedDB, SW registrar |
| E (Phase 8) | Market Reports + Compare API | ✅ Complete | market-report service, GET /api/market/report, POST /api/cron/market-report, GET /api/compare |
| F (Phase 15) | Financial Ecosystem | ✅ Complete | DeveloperPlan model, pre-qualify API, developer-plans API, reservation payment API, listing financing endpoint |

**Current status:** All four original phases complete (A + B + C + D) plus Phase 8 backend (market reports + property comparison) plus Phase 15 Financial Ecosystem backend.

### Completed Work (Phase A — Full)

#### Foundation (A1–A2)
- `prisma/schema.prisma` — 16 models: Listing, ListingFinancing, PriceHistory, Consumer, ConsumerSession, Inquiry, Favorite, PriceAlert, SavedSearch, Comparison, ComparisonItem, ViewHistory, DistrictStats, MarketReport, SyncLog, BrokerReview, OtpCode, Project + **DeveloperPlan** (added Phase 15)
- `src/lib/db.ts`, `src/lib/redis.ts`, `src/lib/format.ts`, `src/lib/crm-api.ts`, `src/lib/utils.ts`
- `src/i18n/request.ts`, `src/i18n/messages/ar.json`, `src/i18n/messages/en.json`
- `src/types/listing.ts`, `src/types/crm-webhook.ts`
- `src/app/layout.tsx`, `src/app/globals.css`
- `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`

#### API Routes (A3–A5)
- `src/app/api/webhook/crm/route.ts` — HMAC-SHA256 verified CRM webhook receiver. Logs to `SyncLog`, delegates to `processWebhook` async.
- `src/app/api/search/route.ts` — Full search with all filters, pagination (max 24/page), 5 sort modes.
- `src/app/api/listings/[slug]/route.ts` — Detail with similar listings (4), district stats, price history (24), fire-and-forget view count.
- `src/app/api/inquire/route.ts` — Rate-limited (5/phone/hr Redis), phone normalization (+20), SHA-256 hashing, creates Inquiry + CRM lead async.
- `src/app/api/autocomplete/route.ts` — Redis-cached (5 min) typeahead, min 2 chars.
- `src/services/listing-sync.ts` — processWebhook: LISTING_PUBLISHED/UPDATED/REMOVED/STATUS_CHANGED. Upsert + price history + nanoid slugs.
- `src/scripts/initial-sync.ts` — Bulk sync from CRM bridge API (paginated 50/page).

#### Components (A6)
- `src/components/ui/button.tsx`, `badge.tsx`
- `src/components/trust/verification-badge.tsx` (LISTED/VERIFIED/GOLD shields), `live-badge.tsx` (pulse sync indicator)
- `src/components/listing/listing-card.tsx`
- `src/components/layout/marketplace-header.tsx`, `mobile-bottom-nav.tsx`, `marketplace-footer.tsx`
- `src/components/inquiry/inquiry-modal.tsx` (Inquiry Shield modal)
- `src/components/search/search-filters.tsx` (with monthly budget toggle)

#### Pages (A7)
- `src/app/(public)/layout.tsx` — Route group layout with header/footer/mobile nav
- `src/app/(public)/page.tsx` — Home: hero search, stats bar, featured listings (ISR 60s), districts, how-it-works, trust signals. WebSite + SearchAction JSON-LD.
- `src/app/(public)/search/page.tsx` — Server Component search results: filter sidebar, responsive grid, sort, pagination, empty state.
- `src/app/(public)/search/search-filters-panel.tsx` — Client filter wrapper with mobile bottom sheet + URL navigation.
- `src/app/(public)/listings/[slug]/page.tsx` — ISR listing detail: image gallery, specs, district stats, similar listings, RealEstateListing JSON-LD.
- `src/app/(public)/listings/[slug]/inquiry-button.tsx` — Client InquiryModal trigger (sticky mobile / desktop card).
- `src/app/sitemap.ts` — Dynamic sitemap from Prisma (50k limit).
- `src/app/robots.ts` — Standard robots with sitemap URL.

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + ISR for SEO, Arabic-first rendering |
| Database | Separate PostgreSQL | Security isolation — CRM data never exposed |
| Auth | NextAuth.js v5 | Handles OTP + Google + Apple in one library |
| Maps | Mapbox GL JS | Best Arabic RTL label support + Egypt coverage; `mapbox-gl-rtl-text` plugin |
| Mobile | Capacitor (not React Native) | Reuse all Next.js code for iOS + Android apps |
| i18n | next-intl | App Router native, Arabic default |
| CRM integration | Webhook + Bridge API | HMAC-SHA256 authenticated; no shared DB connection |
| Listing pages | ISR revalidate: 60s | Near-real-time + SEO benefits |
| Consumer privacy | Phone hashed until opt-in | Inquiry Shield: broker never gets number without consent |
| Money | Decimal.js | Consistent with CRM, no float precision bugs |

---

## Key Files (once project is initialized)

```
aqar-marketplace/
├── app/
│   ├── (marketplace)/          # Consumer-facing pages
│   │   ├── page.tsx            # Home: hero search + featured listings
│   │   ├── search/page.tsx     # Search results with filters
│   │   ├── listings/[slug]/    # Property detail (ISR)
│   │   ├── district/[...]/     # District overview pages
│   │   └── firm/[slug]/        # Broker firm profile
│   └── api/
│       ├── webhook/            # Receives CRM property updates
│       ├── search/             # Full-text + filter search
│       ├── inquire/            # Inquiry Shield entry point
│       └── auth/               # NextAuth.js handlers
├── components/
│   ├── listing-card.tsx        # Property card (grid/list)
│   ├── verification-badge.tsx  # LISTED / VERIFIED / GOLD shield
│   ├── aqar-score-badge.tsx    # 0-100 circular score ring
│   ├── inquiry-modal.tsx       # Shield messaging modal
│   ├── search-filters.tsx      # Filter sidebar + mobile bottom sheet
│   └── marketplace-map.tsx     # Mapbox GL JS component
├── prisma/schema.prisma        # Marketplace DB (9 models)
├── CLAUDE.md                   # Specification + rules
└── PROJECT_BRIEF.md            # This file
```

---

## CRM Dependencies

These additions to the CRM (`C:/firm/`) are required for full end-to-end operation:

| File | Change | Status |
|---|---|---|
| `server/src/routes/marketplace-bridge.ts` | NEW — 5 HMAC-authenticated endpoints | ✅ Complete |
| `server/src/services/marketplaceSyncService.ts` | NEW — outbound webhook fires on publish/update/status change | ✅ Complete |
| `server/src/routes/properties.ts` | MODIFY — webhook trigger on status/price/image changes | ✅ Complete |
| `server/src/routes/listings.ts` | MODIFY — webhook trigger on `isPublished` toggle | ✅ Complete |
| `server/src/routes/documents.ts` | MODIFY — verification tier recompute trigger on document approval | 🔜 Phase B |

---

## Data Isolation Rules (non-negotiable)

**NEVER copied to marketplace DB:**
- `ownerNameAr`, `ownerNameEn`, `ownerPhone`, `ownerPhone2`, `ownerEmail`
- `notes` (any internal notes)
- Commission data, deal financials
- Broker full name, phone, email (only `brokerDisplayName`: "أحمد م." — first name + last initial)
- `firmId`, `propertyId` as exposed API fields (exist internally for sync only)

**District stats:** Anonymous aggregates only. No individual deal data, no firm names.

---

### Phase 15 — Financial Ecosystem (complete)

- `prisma/schema.prisma` — Added `DeveloperPlan` model (`crmFirmSlug`, `compound`, `unitType`, `downPaymentPct`, `years`, `monthlyFrom`, `bankPartner`, `validUntil`, index on `crmFirmSlug`). `prisma generate` re-run.
- `src/app/api/finance/pre-qualify/route.ts` — POST. No auth. Rate-limited 20/IP/hr (Redis). Decimal.js max-loan formula: `monthlyIncome × 7 × 12 × ltv`. LTV: employed=0.80, self_employed=0.70, business=0.75 — non-Egyptian multiplier ×0.85. Amortisation estimate at 14%/20yr. Returns maxLoanAmount, monthlyPaymentEstimate, ltv, breakdown, bankSuggestions (4 major Egyptian banks).
- `src/app/api/developer-plans/route.ts` — GET with `firmSlug` (required), `compound`, `unitType` filters. Redis 1h cache keyed `devplans:{firmSlug}:{compound}:{unitType}`. Filters `validUntil >= now OR null`.
- `src/app/api/payments/reserve/route.ts` — POST. Requires `x-consumer-id` header. Validates consumer exists, listing isActive. Redis duplicate-reservation guard (`reservation:{slug}` key). Paymob stub (falls back to `SIM-{ts}-{slug}` when no `PAYMOB_API_KEY`). Stores reservation 48h in Redis. WhatsApp confirmation to consumer fire-and-forget.
- `src/app/api/listings/[slug]/financing/route.ts` — GET. Returns `financing` (ListingFinancing serialized), `listingSummary` (monthlyFrom/downPaymentFrom/installmentMonths), `project` financing flags, `developerPlans[]` from firm slug (Redis 1h cache reuse), `hasAnyFinancing` computed flag. Never exposes crmFirmId/crmPropertyId.

---

## Known Issues / Deferred Items

- `tsc --noEmit` not yet verified against live DB (pending PostgreSQL + Redis setup on server)
- `Button asChild` prop not wired to Radix Slot — add `@radix-ui/react-slot` if `<Button asChild><Link>` needed
- CRM `documents.ts` verification tier trigger deferred (Phase B item, still pending)
- Mapbox GL JS map component not yet built (deferred — not blocking for Phase B core)
- `avgDaysOnMarket` set to `0` as "unavailable" marker in `updateDistrictStats()` — marketplace doesn't track days-on-market directly; this field improves with CRM deal data integration
- `Consumer` schema uses `nameAr`/`nameEn` (not `name`) — profile UI uses `nameAr` for display; `ConsumerSession` has no `isRevoked` field (session invalidation uses `expiresAt` only)
- `PriceAlert` has no `searchQuery` field — alerts are listing-specific only (not saved search alerts); `priceThreshold` is correct field name
- WhatsApp OTP delivery not wired — OTP code is logged to console; integrate via `ULTRAMSG_TOKEN` when live
- Push notification `/sw.js` service worker file needs to be added to `public/` (handle push events + show notification)
- Capacitor iOS/Android native builds require `npx cap add ios && npx cap add android` after `npm run build`
- `avgDaysOnMarket` set to `0` in districtStats — improves with CRM deal data integration
- `MarketReport` DB model is editorial (no `data` Json column) — `saveMarketReport()` inserts a human-readable summary row; full JSON payload lives in Redis only
- `Listing.images` (not `imageUrls`) — compare route uses correct field name

---

## Competitive Positioning

| Feature | Us | Nawy | Property Finder | Dubizzle |
|---|---|---|---|---|
| Verified by title deed | ✅ Gold badge | ❌ | ❌ | ❌ |
| Real sold-price comps | ✅ Aqar Score | ❌ | ❌ | ❌ |
| Live inventory (seconds) | ✅ | ❌ | ❌ | ❌ |
| No spam calls | ✅ Inquiry Shield | ❌ | ❌ | ❌ |
| Monthly budget search | ✅ | Partial (developer only) | ❌ | ❌ |
| Resale market strength | ✅ | ❌ | Partial | Partial |
