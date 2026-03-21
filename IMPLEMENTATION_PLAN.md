# Aqar Trust Platform — B2C Property Marketplace
## Complete Implementation Plan (Revised: Separate Project Architecture)

> **Status:** Planning phase. Do not begin implementation until this plan is approved.
> **Last updated:** 2026-03-21

---

## Strategic Summary

A **consumer-facing property marketplace** at `aqar.[domain].com` that aggregates verified listings from all brokerage firms using the existing CRM at `crm.[domain].com`. Every listing is backed by real CRM data — eliminating ghost ads, fake prices, and spam calls.

**Architecture decision:** Fully separate Next.js project with its own database. Integrates with the CRM via a dedicated Marketplace Integration API. The CRM is the broker's daily tool; the marketplace is the consumer's destination. They communicate through clean API contracts, never sharing a database connection.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    aqar.[domain].com                              │
│                 (Marketplace — NEW project)                       │
│                                                                   │
│   Next.js 14 App Router (SSR + ISR + SSG)                        │
│   Own PostgreSQL DB (public-safe data only)                      │
│   Own Redis (caching, rate limiting, sessions)                   │
│   Mapbox (interactive maps)                                       │
│   Capacitor (iOS + Android native apps)                          │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │ Marketplace Integration API   │ Consumer inquiries
               ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    crm.[domain].com                               │
│               (CRM — existing C:/firm/)                           │
│                                                                   │
│   New: /api/marketplace-bridge/* endpoints                       │
│   Webhook: fires on property publish/unpublish/update            │
│   Lead creation: inquiry → broker's CRM pipeline                 │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Rules

| Direction | Mechanism | What flows |
|-----------|-----------|-----------|
| CRM → Marketplace | Webhook POST on publish/update/status change | Public-safe listing data only |
| Marketplace → CRM | POST /api/marketplace-bridge/inquiry | Consumer name, phone (hashed until opt-in), message |
| CRM → Marketplace | GET /api/marketplace-bridge/firm-profile/:slug | Public firm data (name, logo, response stats) |
| CRM → Marketplace | GET /api/marketplace-bridge/district-stats | Anonymous aggregated deal statistics |

**Non-negotiable data rules:**
- Owner names, owner phone, owner email → NEVER leave the CRM database
- Broker full names, phone, email → NEVER leave the CRM database
- Firm-internal notes, commission data, deal financials → NEVER leave the CRM database
- The marketplace database contains ONLY what a stranger can safely see

---

## Project Structure

```
aqar-marketplace/                   ← NEW standalone project
├── src/
│   ├── app/                        ← Next.js 14 App Router
│   │   ├── (public)/               ← Public routes (no auth required)
│   │   │   ├── page.tsx            ← Home
│   │   │   ├── search/page.tsx     ← Search results
│   │   │   ├── listings/[slug]/    ← Property detail
│   │   │   ├── districts/          ← District pages (SEO landing pages)
│   │   │   ├── firms/[firmSlug]/   ← Firm profile pages
│   │   │   ├── compare/            ← Property comparison tool
│   │   │   └── market-reports/     ← Monthly market reports
│   │   ├── (auth)/                 ← Auth flows
│   │   │   ├── login/page.tsx      ← OTP + Google + Apple
│   │   │   └── profile/page.tsx
│   │   ├── (consumer)/             ← Protected consumer pages
│   │   │   ├── favorites/
│   │   │   ├── alerts/
│   │   │   ├── history/
│   │   │   └── dashboard/
│   │   ├── api/                    ← Next.js API routes (thin layer)
│   │   │   ├── search/route.ts
│   │   │   ├── inquire/route.ts
│   │   │   ├── favorites/route.ts
│   │   │   ├── auth/route.ts
│   │   │   └── webhook/crm/route.ts  ← Receives push from CRM
│   │   ├── layout.tsx              ← Root layout (RTL, fonts, meta)
│   │   ├── sitemap.ts              ← Dynamic sitemap
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                     ← shadcn/ui base components
│   │   ├── listing/                ← Listing-related components
│   │   │   ├── listing-card.tsx
│   │   │   ├── listing-gallery.tsx
│   │   │   ├── listing-map.tsx     ← Mapbox component
│   │   │   ├── listing-specs.tsx
│   │   │   ├── installment-calculator.tsx
│   │   │   ├── price-history-chart.tsx
│   │   │   ├── comparison-panel.tsx
│   │   │   └── virtual-tour.tsx
│   │   ├── search/
│   │   │   ├── search-bar.tsx
│   │   │   ├── search-filters.tsx
│   │   │   ├── district-map.tsx    ← Mapbox clusters
│   │   │   └── monthly-budget-toggle.tsx
│   │   ├── trust/
│   │   │   ├── verification-badge.tsx
│   │   │   ├── aqar-score-badge.tsx
│   │   │   ├── live-badge.tsx
│   │   │   └── broker-response-badge.tsx
│   │   ├── inquiry/
│   │   │   ├── inquiry-modal.tsx
│   │   │   ├── inquiry-shield-banner.tsx
│   │   │   └── viewing-scheduler.tsx
│   │   └── layout/
│   │       ├── marketplace-header.tsx
│   │       ├── marketplace-footer.tsx
│   │       ├── mobile-bottom-nav.tsx
│   │       └── comparison-drawer.tsx
│   ├── lib/
│   │   ├── db.ts                   ← Prisma client (marketplace DB)
│   │   ├── redis.ts                ← Redis client
│   │   ├── crm-api.ts              ← HTTP client to CRM integration API
│   │   ├── mapbox.ts               ← Mapbox utilities
│   │   ├── auth.ts                 ← NextAuth config
│   │   ├── format.ts               ← Price formatters (Decimal.js)
│   │   └── seo.ts                  ← generateMetadata helpers
│   ├── services/
│   │   ├── listing-sync.ts         ← Process incoming CRM webhooks
│   │   ├── otp.service.ts          ← WhatsApp OTP for web login
│   │   ├── aqar-score.service.ts   ← Score computation
│   │   └── alert.service.ts        ← Price alert processing
│   ├── store/                      ← Zustand client state
│   │   ├── auth.store.ts
│   │   ├── comparison.store.ts     ← Compare up to 3 properties
│   │   └── search.store.ts
│   ├── i18n/
│   │   ├── ar.json
│   │   └── en.json
│   └── types/
│       ├── listing.ts
│       ├── user.ts
│       └── crm-webhook.ts
├── prisma/
│   ├── schema.prisma               ← Marketplace DB (own PostgreSQL)
│   └── migrations/
├── public/
│   ├── icons/                      ← PWA + app store icons
│   └── og-images/                  ← Default Open Graph images
├── capacitor/                      ← Native mobile app config
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env
```

---

## Tech Stack

| Concern | Technology | Reason |
|---------|-----------|--------|
| Framework | **Next.js 14** (App Router) | SSR+ISR+SSG for SEO, React Server Components for speed |
| Styling | **Tailwind CSS + shadcn/ui** | Same tokens as CRM, RTL support, consistent design |
| State | **Zustand** (client) + **React Query v5** | Same as CRM, minimal learning curve |
| Database | **PostgreSQL** (own instance) | Isolated from CRM, marketplace data only |
| ORM | **Prisma** | Same as CRM team already knows |
| Cache | **Redis** | Sessions, rate limiting, search cache, district stats |
| Auth | **NextAuth.js v5** | Handles OTP, Google, Apple in one library |
| Map | **Mapbox GL JS** | Best Arabic RTL label support, excellent Egypt coverage, free tier 50k loads/month, custom brand colors |
| Charts | **Recharts** | Same as CRM |
| i18n | **next-intl** | Next.js-optimized i18n with RTL support, replaces i18next |
| Images | **next/image** | Automatic WebP, lazy-load, responsive, CDN-ready |
| Money | **Decimal.js** | Same rule as CRM — never native floats |
| Mobile | **Capacitor** | iOS + Android wrapping Next.js PWA |
| Push | **Web Push API** (web-push) | Price drop alerts, new match alerts |
| SEO | **Next.js Metadata API** | Per-page Arabic Open Graph, schema.org, sitemap |
| Video/Tour | **iframe embed** | YouTube/Matterport virtual tour support |
| PDF | **Puppeteer** | Monthly market report generation (same as CRM) |
| Validation | **Zod** | Shared with CRM team conventions |
| Analytics | **PostHog** (self-hosted option) | Privacy-first analytics, no Google dependency |
| CDN | **Cloudflare** | Free tier, Arabic region performance, image caching |
| Email | **Nodemailer** | Saved search reports, alert summaries |

---

## Database Schema (Marketplace — Separate PostgreSQL)

```prisma
// ============================================================
// MARKETPLACE DATABASE — PUBLIC-SAFE DATA ONLY
// Never store: owner contacts, broker full details,
// deal financials, firm-internal notes
// ============================================================

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("MARKETPLACE_DATABASE_URL")
}

// ── Listings ─────────────────────────────────────────────────

model Listing {
  id              String   @id @default(cuid())

  // CRM reference (for sync only, never exposed in API)
  crmFirmId       String
  crmPropertyId   String

  // Public URL identity
  slug            String   @unique
  crmFirmSlug     String   // for linking to firm profile

  // Core property data
  titleAr         String
  titleEn         String?
  descriptionAr   String?  // optional broker-written public description
  descriptionEn   String?
  propertyType    String   // APARTMENT | VILLA | OFFICE | SHOP | LAND | etc.
  transactionType String   // SALE | RENT

  // Location
  address         String
  district        String?
  city            String   @default("Cairo")
  latitude        Decimal? @db.Decimal(10,7)
  longitude       Decimal? @db.Decimal(10,7)
  googleMapsUrl   String?

  // Specs
  area            Decimal? @db.Decimal(10,2)
  bedrooms        Int?
  bathrooms       Int?
  floor           Int?
  totalFloors     Int?
  parkingSpaces   Int?
  isFurnished     Boolean?

  // Pricing
  askingPrice     Decimal  @db.Decimal(15,2)
  pricePerSqm     Decimal? @db.Decimal(10,2)
  priceIsHidden   Boolean  @default(false)    // firm chose to hide price

  // Media
  images          String[] // array of CDN image URLs (max 20)
  videoUrl        String?  // YouTube or direct MP4
  virtualTourUrl  String?  // Matterport or similar 360 embed URL
  floorPlanUrl    String?  // floor plan image URL

  // Trust & Quality
  verificationTier String  @default("LISTED")  // LISTED | VERIFIED | GOLD
  isStale         Boolean  @default(false)
  staleSince      DateTime?
  lastSyncAt      DateTime @default(now())
  aqarScore       Int?     // 0-100
  aqarScoreAt     DateTime?

  // Broker public profile (anonymized)
  brokerDisplayName  String?  // "أحمد م." — first name + last initial
  brokerResponseTime Int?     // average minutes to first response
  brokerDealCount    Int?     // lifetime completed deals

  // Firm public profile (denormalized for performance)
  firmNameAr      String
  firmNameEn      String?
  firmLogoUrl     String?

  // Financing
  hasFinancing    Boolean  @default(false)
  monthlyFrom     Decimal? @db.Decimal(15,2)
  downPaymentFrom Decimal? @db.Decimal(15,2)
  installmentMonths Int?

  // Engagement counters
  viewCount       Int      @default(0)
  inquiryCount    Int      @default(0)
  favoriteCount   Int      @default(0)
  shareCount      Int      @default(0)

  // Status
  isActive        Boolean  @default(true)
  publishedAt     DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  financing       ListingFinancing?
  priceHistory    PriceHistory[]
  inquiries       Inquiry[]
  favorites       Favorite[]
  alerts          PriceAlert[]
  comparisons     ComparisonItem[]

  @@unique([crmFirmId, crmPropertyId])
  @@index([isActive, city, district])
  @@index([isActive, propertyType, transactionType])
  @@index([isActive, askingPrice])
  @@index([isActive, verificationTier])
  @@index([isActive, aqarScore])
  @@index([isActive, bedrooms])
  @@index([slug])
  @@index([crmFirmSlug])
  @@index([latitude, longitude])
}

model ListingFinancing {
  id                String   @id @default(cuid())
  listingId         String   @unique
  listing           Listing  @relation(fields: [listingId], references: [id])
  downPaymentMin    Decimal  @db.Decimal(15,2)
  downPaymentMax    Decimal? @db.Decimal(15,2)
  installmentMonths Int
  frequency         String   @default("MONTHLY")
  monthlyMin        Decimal  @db.Decimal(15,2)
  monthlyMax        Decimal? @db.Decimal(15,2)
  developerName     String?  // for new developments
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model PriceHistory {
  id          String   @id @default(cuid())
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id])
  price       Decimal  @db.Decimal(15,2)
  changeType  String   @default("SYNC")  // SYNC | MANUAL | INITIAL
  recordedAt  DateTime @default(now())

  @@index([listingId, recordedAt])
}

// ── Consumer Accounts ─────────────────────────────────────────

model Consumer {
  id                 String   @id @default(cuid())
  phone              String?  @unique
  phoneHash          String?  @unique   // SHA-256 for dedup
  email              String?  @unique
  nameAr             String?
  nameEn             String?
  avatarUrl          String?

  // Preferences
  preferredCity      String?
  preferredDistricts String[]
  budgetMin          Decimal? @db.Decimal(15,2)
  budgetMax          Decimal? @db.Decimal(15,2)
  monthlyBudget      Decimal? @db.Decimal(15,2)
  preferredTypes     String[]  // property types
  searchPreferences  Json?

  // Auth providers
  googleId           String?  @unique
  appleId            String?  @unique

  // Push notifications
  pushSubscriptions  Json?    // array of web push subscription objects

  lastActiveAt       DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  sessions           ConsumerSession[]
  favorites          Favorite[]
  inquiries          Inquiry[]
  alerts             PriceAlert[]
  comparisons        Comparison[]
  viewHistory        ViewHistory[]
  savedSearches      SavedSearch[]
}

model ConsumerSession {
  id          String   @id @default(cuid())
  consumerId  String
  consumer    Consumer @relation(fields: [consumerId], references: [id])
  token       String   @unique @default(cuid())
  provider    String   @default("OTP")   // OTP | GOOGLE | APPLE | NEXTAUTH
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@index([consumerId])
}

// ── Inquiry Shield Flow ───────────────────────────────────────

model Inquiry {
  id                String   @id @default(cuid())
  listingId         String
  listing           Listing  @relation(fields: [listingId], references: [id])
  consumerId        String?
  consumer          Consumer? @relation(fields: [consumerId], references: [id])

  // CRM routing (for creating lead on the right firm)
  crmFirmId         String
  crmPropertyId     String

  // Consumer data
  consumerName      String
  consumerPhone     String   // stored for WhatsApp messaging
  consumerPhoneHash String   // SHA-256 for dedup / anti-spam
  consumerEmail     String?
  message           String?
  budgetStated      Decimal? @db.Decimal(15,2)
  preferredViewing  DateTime? // consumer stated preferred viewing date

  // Inquiry Shield handshake
  status            String   @default("PENDING")
  // PENDING → WHATSAPP_SENT → OPTED_IN | DECLINED | EXPIRED
  crmLeadId         String?  // set after opt-in, CRM lead ID
  optInMethod       String?  // WHATSAPP_REPLY | AUTO (if consumer is verified)

  // Tracking
  whatsappSentAt    DateTime?
  brokerNotifiedAt  DateTime?
  consumerOptedInAt DateTime?
  expiresAt         DateTime? // 48h from creation

  createdAt         DateTime @default(now())

  @@index([listingId])
  @@index([crmFirmId])
  @@index([consumerId])
  @@index([status])
  @@index([consumerPhoneHash])
  @@index([createdAt])
}

// ── Favorites ────────────────────────────────────────────────

model Favorite {
  id          String   @id @default(cuid())
  consumerId  String
  consumer    Consumer @relation(fields: [consumerId], references: [id])
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([consumerId, listingId])
  @@index([consumerId])
}

// ── Price Alerts ─────────────────────────────────────────────

model PriceAlert {
  id              String   @id @default(cuid())
  consumerId      String
  consumer        Consumer @relation(fields: [consumerId], references: [id])
  listingId       String?
  listing         Listing? @relation(fields: [listingId], references: [id])
  savedSearchId   String?
  savedSearch     SavedSearch? @relation(fields: [savedSearchId], references: [id])

  alertType       String   // PRICE_DROP | NEW_MATCH | STATUS_CHANGE | OPEN_HOUSE
  priceThreshold  Decimal? @db.Decimal(15,2)
  dropPercent     Decimal? @db.Decimal(5,2)  // alert when price drops X%
  isActive        Boolean  @default(true)
  lastTriggeredAt DateTime?
  triggerCount    Int      @default(0)
  createdAt       DateTime @default(now())

  @@index([consumerId, isActive])
  @@index([listingId])
  @@index([savedSearchId])
}

// ── Saved Searches ────────────────────────────────────────────

model SavedSearch {
  id          String   @id @default(cuid())
  consumerId  String
  consumer    Consumer @relation(fields: [consumerId], references: [id])
  nameAr      String?  // user-given name: "شقق زمالك 3 غرف"
  filters     Json     // all filter params saved as JSON
  lastRunAt   DateTime?
  resultCount Int?     // last known result count
  createdAt   DateTime @default(now())

  alerts      PriceAlert[]

  @@index([consumerId])
}

// ── Property Comparison ───────────────────────────────────────

model Comparison {
  id          String   @id @default(cuid())
  consumerId  String
  consumer    Consumer @relation(fields: [consumerId], references: [id])
  name        String?  // "مقارنة 1"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       ComparisonItem[]

  @@index([consumerId])
}

model ComparisonItem {
  id           String     @id @default(cuid())
  comparisonId String
  comparison   Comparison @relation(fields: [comparisonId], references: [id])
  listingId    String
  listing      Listing    @relation(fields: [listingId], references: [id])
  addedAt      DateTime   @default(now())
  position     Int        @default(0)  // 0, 1, 2 (max 3 items)

  @@unique([comparisonId, listingId])
  @@index([comparisonId])
}

// ── View History ─────────────────────────────────────────────

model ViewHistory {
  id          String   @id @default(cuid())
  consumerId  String
  consumer    Consumer @relation(fields: [consumerId], references: [id])
  listingId   String
  viewedAt    DateTime @default(now())

  @@index([consumerId, viewedAt])
}

// ── Market Intelligence ───────────────────────────────────────

model DistrictStats {
  id              String   @id @default(cuid())
  city            String
  district        String
  propertyType    String
  transactionType String

  avgPricePerSqm  Decimal  @db.Decimal(10,2)
  medianPrice     Decimal  @db.Decimal(15,2)
  avgDaysOnMarket Int
  dealVelocity    Int      // closed deals in last 90 days
  priceChange6m   Decimal  @db.Decimal(5,2)   // percentage
  priceChange12m  Decimal  @db.Decimal(5,2)   // percentage
  listingCount    Int
  soldCount30d    Int      @default(0)

  computedAt      DateTime @default(now())

  @@unique([city, district, propertyType, transactionType])
  @@index([city, district])
}

model MarketReport {
  id          String   @id @default(cuid())
  titleAr     String
  titleEn     String?
  period      String   // "2026-Q1", "2026-03"
  periodType  String   // MONTHLY | QUARTERLY
  city        String?  // null = Egypt-wide
  bodyAr      String   // HTML or markdown
  bodyEn      String?
  pdfUrl      String?
  coverImageUrl String?
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  viewCount   Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([periodType, isPublished])
  @@index([city])
}

// ── CRM Sync Log ──────────────────────────────────────────────

model SyncLog {
  id          String   @id @default(cuid())
  eventType   String   // LISTING_PUBLISHED | LISTING_UPDATED | LISTING_REMOVED | STATUS_CHANGED
  crmFirmId   String
  crmPropertyId String
  listingSlug String?
  payload     Json?    // raw webhook payload
  status      String   @default("PENDING")  // PENDING | SUCCESS | FAILED
  errorMessage String?
  processedAt DateTime?
  createdAt   DateTime @default(now())

  @@index([status, createdAt])
  @@index([crmFirmId])
}
```

---

## CRM Side: Marketplace Bridge API

Add these endpoints to the existing CRM (`C:/firm/`). These are the only connection points between the two systems.

### New file: `C:/firm/server/src/routes/marketplace-bridge.ts`

```
Authentication: Shared secret HMAC-SHA256 header "X-Marketplace-Signature"
All requests verified against MARKETPLACE_SECRET env var

Endpoints:

POST /api/marketplace-bridge/sync
  → Receives webhook from CRM when property is published/updated/removed
  → CRM calls this; marketplace processes it
  (Actually: CRM should call OUT to the marketplace webhook URL)

GET  /api/marketplace-bridge/listings
  → Paginated list of all published properties (public-safe data only)
  → Used for bulk initial sync
  → Returns: id, firmSlug, propertyCode, title, type, address, district, city,
             area, beds, baths, price, images, isExclusive, verificationData
  → NEVER returns: ownerName, ownerPhone, ownerEmail, notes

GET  /api/marketplace-bridge/listings/:propertyId
  → Single listing public data

GET  /api/marketplace-bridge/firm-profiles
  → All active firms with public profiles
  → Returns: slug, nameAr, nameEn, logoUrl, memberSince, listingCount,
             avgResponseTime, activeDealsCount

GET  /api/marketplace-bridge/district-stats
  → Anonymous aggregated deal statistics by district/type
  → Returns: city, district, type, avgPricePerSqm, medianPrice,
             avgDaysOnMarket, velocity, priceChange6m
  → Source: closed deals across all firms (anonymous aggregation)
  → Cached: 24h TTL

POST /api/marketplace-bridge/inquiries
  → Marketplace sends consumer inquiry here
  → Creates Lead in the correct firm's CRM pipeline
  → Body: { crmFirmId, crmPropertyId, consumerName, consumerPhone,
            consumerEmail?, message?, budgetStated?, viewingDate? }
  → Returns: { success, crmLeadId }
```

### Webhook outbound from CRM

When a broker publishes/unpublishes/updates a property in the CRM, the CRM fires an outbound webhook to the marketplace:

```typescript
// In CRM: server/src/services/marketplaceSyncService.ts
// Called after property publish/unpublish/status change

POST https://aqar.[domain].com/api/webhook/crm
Headers: { "X-Marketplace-Signature": hmac_sha256(payload, MARKETPLACE_SECRET) }
Body: {
  event: "LISTING_PUBLISHED" | "LISTING_UPDATED" | "LISTING_REMOVED" | "STATUS_CHANGED",
  firmId: string,
  firmSlug: string,
  propertyId: string,
  data: { ...public-safe property fields }
}
```

---

## Map Feature: Mapbox GL JS

**Why Mapbox over alternatives:**

| Option | Egypt Coverage | Arabic Labels | Free Tier | Custom Styling | Cost at Scale |
|--------|---------------|---------------|-----------|---------------|---------------|
| **Mapbox** | ✅ Excellent | ✅ Native RTL | 50k loads/mo free | ✅ Full | ~$0.50/1k |
| Google Maps | ✅ Best | ✅ Good | $200 credit/mo | ❌ Limited | Expensive |
| Leaflet + OSM | ⚠️ Variable | ❌ No RTL | Free forever | ✅ Custom | Free |

**Mapbox implementation:**

```typescript
// src/components/listing/listing-map.tsx
// Interactive map on property detail page
// Shows: property pin with price overlay, nearby amenities layer
// Style: custom brand style (navy #1B4F72 water, minimal labels)

// src/components/search/district-map.tsx
// Search results map view with clustered pins
// Color-coded by price range
// Click cluster → zoom in
// Click pin → listing card popup

// src/lib/mapbox.ts
// Arabic-aware mapbox config
// RTL plugin: mapbox-gl-rtl-text (required for Arabic labels)
```

**Key Mapbox setup:**
```typescript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
// Required for Arabic right-to-left text rendering:
mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js', null);
```

---

## Authentication: NextAuth.js v5

Three providers for consumers:

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials'; // for OTP flow

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Web: OTP via WhatsApp
    Credentials({ name: 'OTP', credentials: { phone: {}, otp: {} }, authorize: verifyOtp }),
    // Mobile + Web: Google
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
    // Mobile (iOS required): Apple
    Apple({ clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET }),
  ],
  callbacks: {
    session: ({ session, token }) => ({ ...session, consumer: token.consumer }),
  }
});
```

**Auth flow by platform:**
- **Web:** OTP via WhatsApp (primary) or Google
- **Android app:** Google login (Capacitor Google Auth plugin)
- **iOS app:** Apple Sign In (required by App Store) + Google option

---

## SEO Architecture

This is why Next.js is worth it. Every property page is a fully-indexed SEO asset.

### Dynamic Metadata per listing

```typescript
// src/app/(public)/listings/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const listing = await getListing(params.slug);
  return {
    title: `${listing.titleAr} - ${listing.city} | عقار`,
    description: `${listing.propertyType} للـ${listing.transactionType} في ${listing.district}، ${listing.city}. المساحة: ${listing.area} م². السعر: ${formatPrice(listing.askingPrice)} جنيه.`,
    openGraph: {
      title: listing.titleAr,
      description: `${listing.bedrooms} غرف، ${listing.area} م²، ${listing.city}`,
      images: [{ url: listing.images[0], width: 1200, height: 630 }],
      locale: 'ar_EG',
      type: 'website',
    },
    // Arabic + English alternate tags
    alternates: { languages: { 'ar': `/ar/listings/${slug}`, 'en': `/en/listings/${slug}` } }
  };
}
```

### Schema.org Structured Data

```typescript
// Every listing page gets JSON-LD for Google rich results
const structuredData = {
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": listing.titleAr,
  "description": listing.descriptionAr,
  "url": `https://aqar.domain.com/listings/${listing.slug}`,
  "image": listing.images,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": listing.district,
    "addressRegion": listing.city,
    "addressCountry": "EG"
  },
  "numberOfRooms": listing.bedrooms,
  "floorSize": { "@type": "QuantitativeValue", "value": listing.area, "unitCode": "MTK" },
  "price": listing.askingPrice,
  "priceCurrency": "EGP",
}
```

### ISR (Incremental Static Regeneration)

```typescript
// Property pages: pre-render at build, re-validate every 60s
// When broker updates price → page auto-refreshes within 60s
export const revalidate = 60;

// District pages: re-validate every 6h (stats change slowly)
export const revalidate = 21600;

// Home page: re-validate every 5min
export const revalidate = 300;
```

### Dynamic Sitemap

```typescript
// src/app/sitemap.ts
// Auto-generates XML sitemap with all active listing slugs
// Submits to Google Search Console
// Updates incrementally as listings are added/removed
```

---

## Environment Variables

```env
# Marketplace project (.env)
MARKETPLACE_DATABASE_URL=postgresql://user:pass@host:5432/aqar_marketplace
REDIS_URL=redis://localhost:6379

# CRM Bridge
CRM_BASE_URL=https://crm.[domain].com
MARKETPLACE_SECRET=<64-char shared secret for HMAC webhook verification>

# NextAuth
NEXTAUTH_SECRET=<random 64 chars>
NEXTAUTH_URL=https://aqar.[domain].com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
MAPBOX_SECRET_TOKEN=sk.eyJ1...

# WhatsApp (OTP for web login)
WHATSAPP_PROVIDER=META  # or ULTRAMSG
META_PHONE_NUMBER_ID=...
META_ACCESS_TOKEN=...
PLATFORM_WHATSAPP_NUMBER=+201XXXXXXXXX  # dedicated platform number

# Push notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:push@domain.com

# Analytics
POSTHOG_KEY=...
POSTHOG_HOST=https://app.posthog.com

# CRM project (.env additions)
MARKETPLACE_WEBHOOK_URL=https://aqar.[domain].com/api/webhook/crm
MARKETPLACE_SECRET=<same 64-char secret>
```

---

## Implementation Phases

---

### Phase A: Foundation & Core Search
**Goal:** Marketplace live with search, property detail pages, CRM integration pipeline.

#### A1 — Project Setup

- [ ] Initialize Next.js 14 project: `npx create-next-app@latest aqar-marketplace --typescript --tailwind --app`
- [ ] Install dependencies: `prisma`, `@prisma/client`, `decimal.js`, `mapbox-gl`, `next-auth`, `next-intl`, `zustand`, `@tanstack/react-query`, `recharts`, `ioredis`, `web-push`, `zod`, `axios`, `lucide-react`, `mapbox-gl-rtl-text`
- [ ] Install shadcn/ui: `npx shadcn@latest init` with navy primary color
- [ ] Configure Tailwind with same design tokens as CRM (Primary: #1B4F72, Gold: #D4AC0D, fonts: Cairo + Tajawal + Inter)
- [ ] Configure next.config.ts: image domains, i18n (ar default, en), security headers
- [ ] Set up Prisma with marketplace schema (all models from schema above)
- [ ] Create initial migration and run: `npx prisma migrate dev`
- [ ] Set up Redis connection (same pattern as CRM)
- [ ] Configure root layout.tsx: RTL by default, Arabic fonts, dark/light support

#### A2 — CRM Integration API (work on CRM repo)

- [ ] Create `C:/firm/server/src/routes/marketplace-bridge.ts`
  - [ ] `GET /api/marketplace-bridge/listings` — paginated public listings
  - [ ] `GET /api/marketplace-bridge/listings/:propertyId` — single listing
  - [ ] `GET /api/marketplace-bridge/firm-profiles` — firm public profiles
  - [ ] `GET /api/marketplace-bridge/district-stats` — anonymous aggregated stats
  - [ ] `POST /api/marketplace-bridge/inquiries` — create CRM lead from marketplace inquiry
  - [ ] HMAC-SHA256 authentication on all requests
- [ ] Create `C:/firm/server/src/services/marketplaceSyncService.ts`
  - [ ] `fireWebhook(event, firmId, propertyId, data)` — sends outbound POST to marketplace webhook
  - [ ] Called from `properties.ts` on status change + update
  - [ ] Called from `listings.ts` on publish/unpublish
  - [ ] Called from `documents.ts` on document approval (for verification tier)
  - [ ] Retry logic: 3 attempts with exponential backoff, log failures to `SyncLog`
- [ ] Mount bridge routes in `C:/firm/server/src/index.ts`:
  ```typescript
  app.use('/api/marketplace-bridge', marketplaceBridgeMiddleware, bridgeRoutes);
  ```

#### A3 — Marketplace Webhook Receiver

- [ ] Create `src/app/api/webhook/crm/route.ts`
  - [ ] Verify HMAC-SHA256 signature on all incoming requests
  - [ ] Parse event type (LISTING_PUBLISHED, LISTING_UPDATED, LISTING_REMOVED, STATUS_CHANGED)
  - [ ] Create `SyncLog` record for every webhook received
  - [ ] Call `listing-sync.service.ts` to process payload
  - [ ] Return 200 immediately (async processing)
- [ ] Create `src/services/listing-sync.ts`
  - [ ] `processPublish(payload)` — upsert Listing from CRM data (NEVER copy private fields)
  - [ ] `processUpdate(payload)` — update public fields, record price history if price changed
  - [ ] `processRemove(payload)` — set `isActive = false`
  - [ ] `processStatusChange(payload)` — auto-unpublish if SOLD/RENTED/WITHDRAWN
  - [ ] `computeVerificationTier(crmFirmId, crmPropertyId)` — calls CRM bridge API to check documents
  - [ ] Generate URL-safe Arabic slug: `apartment-3br-new-cairo-{nanoid(8)}`

#### A4 — Initial Data Sync

- [ ] Create `src/scripts/initial-sync.ts`
  - [ ] Calls `GET /api/marketplace-bridge/listings` (paginated)
  - [ ] Populates Listing + DistrictStats tables
  - [ ] Run once: `npx tsx src/scripts/initial-sync.ts`

#### A5 — Core API Routes

- [ ] `src/app/api/search/route.ts` — GET with all filters, pagination, sorting
  - Full-text search via PostgreSQL `tsvector` (raw query for Arabic)
  - Monthly budget filter
  - Returns `ListingCard[]` + pagination + filter facets
- [ ] `src/app/api/listings/[slug]/route.ts` — GET full listing detail
  - Increment viewCount (fire-and-forget)
  - Fetch similar listings, price history, district stats, firm profile
- [ ] `src/app/api/inquire/route.ts` — POST
  - Rate limit: 5/phone/hour (Redis)
  - Create Inquiry record (status: PENDING)
  - POST to CRM bridge `/inquiries` to create lead
  - (Phase C: add WhatsApp opt-in step)
- [ ] `src/app/api/autocomplete/route.ts` — GET typeahead
  - Redis-cached district + city suggestions
  - Debounced (min 2 chars)

#### A6 — Frontend Core Components

- [ ] `src/components/layout/marketplace-header.tsx`
  - Logo, search bar, language switcher, login button
  - Mobile: hamburger → slide-in menu
  - Sticky, backdrop blur
- [ ] `src/components/layout/marketplace-footer.tsx`
  - Links, social media, copyright, app store badges
- [ ] `src/components/layout/mobile-bottom-nav.tsx`
  - 5 tabs: Home, Search, Map, Favorites, Profile
- [ ] `src/components/listing/listing-card.tsx`
  - Verification badge overlay
  - Stale warning banner
  - Favorite heart button
  - Aqar Score mini badge
  - Mobile: full-width card with swipe-to-favorite gesture
- [ ] `src/components/trust/verification-badge.tsx`
  - Shield icon, 3 tiers, tooltip in Arabic + English
- [ ] `src/components/inquiry/inquiry-modal.tsx`
  - Form → submit → success with privacy shield message
  - Bottom sheet on mobile, centered dialog on desktop

#### A7 — Pages

- [ ] `src/app/(public)/page.tsx` — Home
  - Hero: full-width search with background image
  - Quick filters (property type, city, transaction type)
  - Featured listings grid (ISR, revalidate 5min)
  - District showcase (top 6 by listing count)
  - Trust indicators: verified listings count, firms count
  - How it works section
  - Market brief: latest month's key stats
- [ ] `src/app/(public)/search/page.tsx` — Search Results
  - Server-rendered initial results (SEO)
  - Client-side filter updates without page reload
  - Dual view: grid + map toggle
  - Filter sidebar (desktop) / bottom sheet (mobile)
  - Monthly budget search toggle
  - Infinite scroll OR pagination (pagination preferred for SEO)
- [ ] `src/app/(public)/listings/[slug]/page.tsx` — Property Detail
  - SSR + ISR (revalidate 60s)
  - Full gallery with lightbox
  - Mapbox pin for property location
  - Specs grid
  - Financing calculator (if available)
  - Inquiry CTA (sticky on mobile)
  - Similar listings section
  - Firm profile card
  - SEO: full metadata + schema.org JSON-LD
- [ ] Sitemap + robots.ts

#### A8 — i18n Setup

- [ ] Configure next-intl with `ar` default, `en` secondary
- [ ] RTL/LTR switching based on locale
- [ ] Populate `src/i18n/ar.json` and `en.json` with all Phase A strings

**Phase A Exit Criteria:**
- [ ] CRM webhook → listing appears in marketplace within 5 seconds
- [ ] Property status changed to SOLD in CRM → listing deactivates instantly
- [ ] Search page ranks for test keywords in Google Search Console
- [ ] Lighthouse score: Performance ≥90, SEO ≥95, Accessibility ≥90 on mobile
- [ ] No private data (owner contacts, firm internals) in any API response
- [ ] `npx tsc --noEmit` passes
- [ ] Arabic RTL rendering correct on all pages

---

### Phase B: Trust Layer
**Goal:** Verification badges live, Aqar Score computing, Mapbox maps on all pages, installment calculator, district intelligence.

#### B1 — Aqar Score Service

- [ ] Create `src/services/aqar-score.service.ts`
  - [ ] `refreshDistrictStats()` — calls CRM bridge for anonymous deal aggregates, upserts DistrictStats
  - [ ] `computeListingScore(listingId)` — weighted 5-factor score (price competitiveness 30%, demand velocity 25%, price trend 25%, broker track record 10%, freshness 10%)
  - [ ] `runNightlyBatch()` — refresh all active listing scores
- [ ] Add nightly cron (2am Cairo) for score recomputation
- [ ] Add daily cron (3am Cairo) for staleness detection (30-day inactivity → isStale = true)
- [ ] Expose scores via search API + listing detail

#### B2 — Mapbox Integration

- [ ] `src/components/listing/listing-map.tsx`
  - Single property pin with price overlay
  - Nearby POIs: metro, schools, hospitals (via Mapbox POI layer)
  - Street view link
  - RTL Arabic labels via `mapbox-gl-rtl-text` plugin
- [ ] `src/components/search/district-map.tsx`
  - Clustered listing pins, color-coded by price
  - Click pin → listing card popup
  - Click cluster → zoom in
  - Map/list toggle in search page
  - Mobile: full-screen map with bottom sheet listing strip
- [ ] `src/app/(public)/districts/page.tsx`
  - Egypt map with district-level heatmap (avg price/sqm intensity)
  - Click district → district detail page
- [ ] `src/app/(public)/districts/[city]/[district]/page.tsx`
  - Stats: avg price, days-on-market, velocity, 6-month price trend
  - Price trend chart (Recharts line chart)
  - Listings grid for this district
  - SEO: "شقق للبيع في المعادي" style page titles

#### B3 — Installment Calculator

- [ ] `src/components/listing/installment-calculator.tsx`
  - Interactive: price shown, user sets down payment + term
  - Real-time monthly payment calculation using Decimal.js
  - If listing has `ListingFinancing`, show firm's actual plan as pre-fill
  - "اتصل بنا لمزيد من التفاصيل" CTA if financing available
  - ROI helper: for SALE properties, show estimated rental yield (rentPrice ÷ salePrice × 100)

#### B4 — Price History + Comparison Tool

- [ ] `src/components/listing/price-history-chart.tsx`
  - Recharts area chart, Arabic date labels
  - Shows original price, all changes, current price
  - "انخفض السعر X مرة" badge if multiple drops detected
- [ ] `src/components/layout/comparison-drawer.tsx`
  - Fixed bottom bar: "قارن (N)" when items are in comparison store
  - Zustand store: max 3 items, persists in localStorage
- [ ] `src/app/(public)/compare/page.tsx`
  - Side-by-side 2-3 property comparison table
  - Rows: price, price/sqm, area, beds, baths, floor, verification tier, Aqar Score, financing
  - Column highlight: best value indicator
  - "استفسر عن الكل" bulk inquiry option

#### B5 — Firm + Broker Profile Pages

- [ ] `src/app/(public)/firms/[firmSlug]/page.tsx`
  - Firm logo, name, member since, listing count
  - Response time badge (avg minutes to first response from CRM Activity data)
  - Active listings grid
  - "شركة موثقة" badge if Active plan + documents on file
- [ ] Enhanced listing cards with broker response time badge

#### B6 — CRM Dashboard Widget (work on CRM repo)

- [ ] Add `GET /api/v1/listings/marketplace-stats` to CRM
  - Total marketplace views for firm's listings
  - Total inquiries received
  - Opt-in rate
  - Avg response time
  - Top 5 listings by views
- [ ] Add "Marketplace Channel" widget to CRM dashboard page

**Phase B Exit Criteria:**
- [ ] Aqar Score displays on all listing cards + detail pages
- [ ] Mapbox map renders correctly on property detail + search
- [ ] Arabic district/city names render correctly on map (RTL plugin active)
- [ ] Installment calculator produces correct Decimal.js results
- [ ] District pages rank for SEO neighborhood keywords
- [ ] Comparison tool handles 2-3 listings side by side
- [ ] CRM dashboard shows marketplace channel stats

---

### Phase C: Lead Intelligence
**Goal:** Inquiry Shield WhatsApp flow, consumer accounts, favorites, price alerts, saved searches.

#### C1 — Consumer Auth (NextAuth)

- [ ] Configure NextAuth with OTP, Google, Apple providers
- [ ] `src/app/(auth)/login/page.tsx` — Phone OTP flow (web default)
- [ ] Google Sign In button (web + Android)
- [ ] Apple Sign In button (iOS required)
- [ ] Consumer profile creation on first sign-in
- [ ] `src/app/(consumer)/profile/page.tsx` — Preferences, budget, notifications
- [ ] Social profile merge: if same phone + Google account, merge Consumer records

#### C2 — Inquiry Shield (WhatsApp Opt-In)

Full implementation of the privacy-first inquiry flow:

- [ ] Upgrade `src/app/api/inquire/route.ts`:
  1. Create Inquiry (status: PENDING)
  2. Send WhatsApp via platform number (not firm's number): "Your inquiry for [property]. Reply YES to share your contact with the broker."
  3. Update status → WHATSAPP_SENT
  4. Notify broker in CRM: "New marketplace inquiry pending consumer opt-in"
  5. Set `expiresAt` = 48h
- [ ] `src/app/api/webhook/whatsapp/route.ts`
  - Receives inbound WhatsApp from consumers
  - If message = YES/نعم: find WHATSAPP_SENT inquiry, call CRM bridge to create lead, update status → OPTED_IN, notify broker
  - If message = NO/لا: update status → DECLINED, confirm to consumer
  - 24h reminder: cron sends "هل لا تزال مهتماً؟" if no response
- [ ] Enhanced inquiry modal with privacy shield messaging
- [ ] Consumer can track inquiry status in `/consumer/inquiries` page

#### C3 — Favorites + Saved Searches + Alerts

- [ ] `src/app/(consumer)/favorites/page.tsx` — Favorited listings grid
- [ ] `src/app/(consumer)/alerts/page.tsx` — Active price alerts list
- [ ] `src/app/(consumer)/searches/page.tsx` — Saved searches with "New X matches since last visit" count
- [ ] Favorite button on listing cards (sync to DB, persist to server)
- [ ] "Save this search" button on search page
- [ ] Price drop alert button on listing detail
- [ ] Cron (every 6h): process active alerts, send WhatsApp/push to consumers
- [ ] Push notification subscription prompt after first favorite

#### C4 — Viewing Scheduler

- [ ] `src/components/inquiry/viewing-scheduler.tsx`
  - Calendar picker (date + time slot)
  - Broker confirms/reschedules via CRM (future CRM enhancement)
  - Consumer gets WhatsApp confirmation
  - Reduces inquiry friction: "Book a viewing" is more concrete than "Inquire"

#### C5 — WhatsApp Bot (Basic)

- [ ] Consumer can search via WhatsApp: "شقق زمالك 3 غرف للبيع"
  - Bot replies with top 3 matching listings (image + price + link)
  - Follow-up: "هل تريد استفسار عن أي منها؟"
- [ ] Powered by: inbound WhatsApp webhook + search API + template message

**Phase C Exit Criteria:**
- [ ] End-to-end Inquiry Shield: inquiry → WhatsApp → YES → CRM lead created
- [ ] Consumer can save favorites, create price alerts
- [ ] Saved search shows new match count on return visit
- [ ] Push notification fires when favorite listing price drops
- [ ] WhatsApp bot responds to basic search queries

---

### Phase D: Mobile Native + Scale
**Goal:** Capacitor iOS/Android apps, push notifications for price drops, geolocation, performance hardening.

#### D1 — Capacitor Mobile App

- [ ] Initialize Capacitor in Next.js project
- [ ] Configure `capacitor.config.ts`:
  - appId: `com.aqar.marketplace`
  - appName: "عقار"
  - Deep links: `aqar://listings/:slug`
  - Push: FCM (Android) + APNs (iOS)
- [ ] Capacitor plugins: `@capacitor/geolocation`, `@capacitor/share`, `@capacitor/push-notifications`, `@capacitor/haptics`, `@capacitor-community/google-auth`, `@capacitor/browser`
- [ ] iOS: Apple Sign In via Capacitor
- [ ] Android: Google Sign In via Capacitor
- [ ] iOS-specific UX: safe area insets, native keyboard handling

#### D2 — Geolocation Search

- [ ] "بالقرب منك" (Near Me) search option
- [ ] Haversine distance calculation in PostgreSQL via raw query
- [ ] Distance badge on listing cards: "٢.٣ كم"
- [ ] Map auto-centers on user location (with permission)
- [ ] Neighborhood auto-detect: "أنت في المعادي — عرض ٤٧ عقار بالقرب منك"

#### D3 — Push Notification Campaigns

- [ ] Price drop on favorited listing → push + WhatsApp
- [ ] New listing matches saved search → push
- [ ] "Price reduced X% in [your favorite district]" district alert
- [ ] Weekly market brief: "أبرز عقارات الأسبوع في [city]"
- [ ] Inquiry status update: "قبل الوسيط استفسارك"

#### D4 — Performance Hardening (Scale-Ready)

- [ ] **Search caching:** Redis cache for popular search queries (TTL: 2min). Cache key = sorted query params hash
- [ ] **CDN images:** All property images proxied through Cloudflare → `next/image` optimization → WebP served from edge
- [ ] **Database indexes:** Verify all query execution plans, add covering indexes where needed
- [ ] **Connection pooling:** PgBouncer for PostgreSQL (or Prisma Accelerate)
- [ ] **Rate limiting:** Redis-based sliding window (not in-memory — survives restarts)
- [ ] **Edge caching:** Cloudflare rules for listing detail pages (cache 60s at edge, purge on webhook)
- [ ] **Image upload:** Direct-to-S3/R2 signed URL upload flow for broker property photos
- [ ] **Monitoring:** Sentry for errors, PostHog for consumer behavior analytics

#### D5 — Market Reports

- [ ] `src/app/(public)/market-reports/page.tsx` — Monthly PDF reports list
- [ ] `src/app/(public)/market-reports/[period]/page.tsx` — Report detail (HTML + PDF download)
- [ ] Admin-generated via Puppeteer (Arabic RTL A4 PDF) from aggregated DistrictStats
- [ ] Email delivery: monthly report sent to all subscribed consumers
- [ ] SEO: "تقرير السوق العقاري في القاهرة 2026" — high-value long-tail keywords

#### D6 — App Store Submission

- [ ] App icons: 1024×1024 + adaptive (Arabic design, shield motif)
- [ ] Splash screens: Arabic text, navy background
- [ ] Screenshots: 6.7" (iPhone) + 12.9" (iPad) in Arabic
- [ ] App Store description (Arabic primary, English secondary)
- [ ] Google Play Store listing
- [ ] Deep link configuration (Universal Links iOS, App Links Android)

**Phase D Exit Criteria:**
- [ ] iOS + Android builds pass store review
- [ ] Push notification end-to-end: price drop → consumer notification in <30s
- [ ] Geolocation search works on device (with permission)
- [ ] Lighthouse: Performance ≥92, SEO ≥97 on mobile
- [ ] Search endpoint <100ms for cached, <400ms for cold (verified via load test)
- [ ] 1000 concurrent users: no degradation (load test with k6 or Artillery)

---

## Enhancement Ideas (Future Phases)

These are NOT in the current scope but are worth planning for:

### E1 — AI-Powered Search
- Natural language search: "شقة قريبة من مترو المعادي بـ 3 غرف" → auto-parses intent into filters
- Visual similarity search: upload a photo of your dream apartment → find similar listings
- Powered by: OpenAI embeddings or local model (no new tech dependency for now — design the interface)

### E2 — Developer/Project Pages
- New development project pages (compete with Nawy's core strength)
- Floor plan browser, unit availability matrix
- Progress photos timeline for under-construction projects
- Reservation flow: "Reserve unit online with 5% deposit"

### E3 — Rental Management Integration
- Tenant portal: current tenant can see their contract, pay rent, submit maintenance requests
- Links rental deals from CRM to long-term tenant accounts
- Arabic lease agreement generation

### E4 — Investment Analytics
- Rental yield calculator: "This property at 1.2M EGP rents for ~8,000/month = 8% annual yield"
- District appreciation tracker: 5-year price chart per district
- "Best ROI districts in Cairo" report (SEO goldmine)
- Portfolio view for investors with multiple properties

### E5 — Social Proof & Reviews
- Consumer reviews of brokerage firms (not individual listings)
- Review verified only after a successful transaction in CRM
- Trust score for firms based on: response time + review score + deal completion rate

### E6 — Open House Events
- Broker schedules open house in CRM calendar → auto-published on marketplace
- Consumer can RSVP: "سأحضر يوم السبت"
- Reminder push notification 1h before
- "Live open house" feature: broker streams via mobile during showing

### E7 — Arabic Voice Search
- Web Speech API (already supported in Chrome/Safari)
- "مساعد عقار": voice command → search query → results
- "أريد شقة بـ 3 غرف في المعادي بأقل من مليون"

---

## Competitive Summary

### What Our Data Shows That No One Else Can

| Data Point | Our Source | Competitor Can Replicate? |
|-----------|-----------|--------------------------|
| "Last verified 8 min ago" | CRM property.updatedAt — broker uses this daily | NO — they have no liveness signal |
| "Sells in 38 days here" | actual deal.actualCloseDate across 50+ firms | NO — they see listing dates, not close dates |
| "12% below district avg" | real closed deal values, not asking prices | NO — they only aggregate asking prices |
| "Broker responds in 2h avg" | CRM Activity first-response timestamps | NO — no broker accountability |
| "Gold Verified: title deed + exclusive" | Document model with approval + e-signature | NO — "verified" badges are pay-to-play |
| "From 8,500 EGP/month" | InstallmentSchedule from real deal structures | PARTIAL — Nawy has developer data only |
| Anonymous investment scoring | Cross-firm deal velocity + price comp data | NO — no one has cross-firm transaction data |

### The Broker Flywheel (Our Moat)

The marketplace is ONLY possible because brokers use our CRM daily. Their data quality is high because they need it for their own commissions, not because we ask them to maintain a portal listing.

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

Competitors cannot enter this flywheel from either end without building both sides simultaneously.

---

## Key Decisions Record

| Decision | Choice | Reason |
|----------|--------|--------|
| Project architecture | Separate Next.js project | SEO, security isolation, independent scaling |
| Domain | `aqar.[domain].com` subdomain | Clean brand, separate from CRM |
| Database | Separate PostgreSQL instance | Zero risk to CRM financial data |
| Map library | Mapbox GL JS | Best Arabic RTL support, 50k free loads/month, Egypt coverage |
| Auth | NextAuth.js v5 (OTP + Google + Apple) | Single library, required for iOS App Store |
| Mobile | Capacitor wrapping Next.js | Same codebase for web + iOS + Android |
| CRM integration | Webhook push + bridge REST API | Decoupled, testable, retry-safe |
| i18n | next-intl | Next.js-optimized, replaces i18next for this project |
| Analytics | PostHog | Privacy-first, can be self-hosted |
| CDN | Cloudflare | Free tier, edge caching for property pages |
