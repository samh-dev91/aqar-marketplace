# PROJECT_BRIEF.md — Aqar Trust Platform
## منصة عقار ثرست — سوق العقارات B2C

> **For any AI reading this:** Start here. This file tracks the live build state.
> - `CLAUDE.md` — specification, tech stack, non-negotiable rules, GitHub workflow
> - `IMPLEMENTATION_PLAN.md` — complete phase-by-phase task list with exit criteria
>
> **MANDATORY UPDATE RULE:** Every session that modifies any file MUST update this brief AND push to GitHub before the session ends.

---

## Quick Reference

| Item | Value |
|---|---|
| Project root | `C:/firm/B2C/` (planning only — full project will be at `C:/aqar-marketplace/` or similar when initialized) |
| Spec | `CLAUDE.md` |
| Phase task list | `IMPLEMENTATION_PLAN.md` |
| GitHub repo | `https://github.com/samh-dev91/aqar-marketplace` |
| Last updated | 2026-03-21 |
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (separate from CRM) |
| CRM repo | `https://github.com/samh-dev91/realestate-crm` |
| Related project | `C:/firm/` — CRM platform that feeds this marketplace |

---

## Current Build State

### Phase Status

| Phase | Name | Status | Notes |
|---|---|---|---|
| A | Foundation & Core Search | 🔜 Not started | Next.js setup, CRM Bridge API, search engine, core pages |
| B | Trust Layer | 🔜 Not started | Aqar Score, Mapbox maps, installment calculator, district intelligence |
| C | Lead Intelligence | 🔜 Not started | Inquiry Shield WhatsApp flow, consumer accounts, favorites, alerts |
| D | Mobile Native | 🔜 Not started | Capacitor iOS/Android, geolocation, push notifications |

**Current status:** Planning complete. Implementation has NOT started. Awaiting build approval.

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

These additions to the CRM (`C:/firm/`) are required before Phase A can complete:

| File | Change | Status |
|---|---|---|
| `server/src/routes/marketplace-bridge.ts` | NEW — 5 HMAC-authenticated endpoints | 🔜 Not started |
| `server/src/services/marketplaceSyncService.ts` | NEW — outbound webhook fires on publish/update/status change | 🔜 Not started |
| `server/src/routes/properties.ts` | MODIFY — add webhook trigger after property status/price/image changes | 🔜 Not started |
| `server/src/routes/listings.ts` | MODIFY — add webhook trigger on `isPublished` toggle | 🔜 Not started |
| `server/src/routes/documents.ts` | MODIFY — add verification tier recompute trigger on document approval | 🔜 Not started |

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

## Known Issues / Deferred Items

- GitHub repo `samh-dev91/aqar-marketplace` — to be created when Phase A starts
- Next.js project initialization pending build approval
- CRM bridge endpoints not yet built

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
