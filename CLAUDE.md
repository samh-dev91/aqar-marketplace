# CLAUDE.md — Aqar Trust Platform (B2C Property Marketplace)
## منصة عقار ثرست — سوق العقارات للمستهلكين

> **Instructions for Claude Code:** This is the authoritative specification for the Aqar Trust Platform marketplace. **Read this file and `PROJECT_BRIEF.md` completely before writing a single line of code.**
>
> `PROJECT_BRIEF.md` tracks the live build state. `master_plan.md` has the complete phase-by-phase task list with exit criteria. This file (`CLAUDE.md`) is the specification and workflow rules.

---

## PROJECT_BRIEF.md MAINTENANCE RULE — MANDATORY

**After every session where you:** add a route, create a component, complete a phase, change a schema, make an architectural decision, or change any API contract — **you MUST update `PROJECT_BRIEF.md` AND push to GitHub before the session ends.**

---

## 1. WHAT THIS IS

A **consumer-facing property marketplace** at `aqar.[domain].com` that aggregates verified listings from all brokerage firms using the CRM at `crm.[domain].com`. Built as a completely separate Next.js 14 project with its own PostgreSQL database.

**Core value:** Every listing is backed by real CRM data — eliminating ghost ads, fake prices, and spam calls. This is the #1 trusted property platform in Egypt.

**The five Blue Ocean features:**
1. **Shield Badge** — 3-tier verification (LISTED / VERIFIED / GOLD) backed by Document approval + e-signature
2. **Monthly Budget Search** — installment-aware: search by "I can pay X EGP/month"
3. **Inquiry Shield** — WhatsApp opt-in before broker gets consumer's real phone number
4. **Aqar Score** — 0–100 investment score from anonymous cross-tenant deal aggregation
5. **Live Inventory Guarantee** — property SOLD in CRM → marketplace deactivates in seconds

---

## 2. ARCHITECTURE

**This project** (`aqar-marketplace/`) — Next.js 14 App Router, own PostgreSQL DB, own Redis, Mapbox, Capacitor.
**CRM** (`github.com/samh-dev91/realestate-crm`) — Express/Node.js, provides Marketplace Bridge API + outbound webhooks.

**Data isolation is non-negotiable:**
- Owner names, owner phone, owner email → NEVER leave the CRM database
- Broker full names, phone, email → NEVER leave the CRM database
- The marketplace database contains ONLY what a stranger can safely see

Full architecture diagram and all technical decisions: see `master_plan.md`.

---

## 3. TECH STACK

| Concern | Technology |
|---|---|
| Framework | Next.js 14 App Router (SSR + ISR + SSG) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + TanStack Query v5 |
| Language | TypeScript (strict) |
| Database | PostgreSQL (separate from CRM) via Prisma ORM |
| Auth | NextAuth.js v5 (OTP/WhatsApp + Google + Apple) |
| Maps | Mapbox GL JS + mapbox-gl-rtl-text (Arabic RTL) |
| Mobile | Capacitor (iOS + Android) |
| i18n | next-intl (ar default, en supported) |
| Money | Decimal.js — ALL money, NEVER native floats |
| Charts | Recharts |
| Push | Web Push API |
| SEO | Next.js Metadata API + schema.org RealEstateListing |

---

## 4. NON-NEGOTIABLE RULES

1. **Never expose CRM internal IDs** (`crmFirmId`, `crmPropertyId`) in any API response.
2. **Decimal.js for all money.** Never native JavaScript floats.
3. **Arabic is the default language.** All user-facing strings must exist in Arabic.
4. **`tsc --strict` passes with zero errors** at the end of every phase.
5. **Data isolation:** verify every API response contains NO owner info, broker full name/contact, or firm-internal data.
6. **ISR on all listing pages** — `revalidate: 60` seconds minimum.
7. **Mobile-first design.** All pages must be fully responsive. Lighthouse PWA ≥ 90 on mobile.
8. **Rate limiting** on all public endpoints. Inquiry endpoint: max 5/phone/hour.
9. **Consumer privacy:** phone numbers are hashed until explicit opt-in.
10. **schema.org structured data** on every listing page for Google rich results.

---

## 5. GITHUB WORKFLOW — MANDATORY

**Repository:** `https://github.com/samh-dev91/aqar-marketplace`
**Branch:** `main` is always deployable.

### Push Rules — Non-Negotiable

1. **Every session that writes or modifies any file MUST end with a `git push origin main`.**
2. **Never leave a session with uncommitted local changes.** WIP commits are acceptable (`WIP: description`).
3. **Commit message format:**
   ```
   <type>: <short description>

   - bullet of what changed
   - bullet of what changed

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
   Types: `feat` `fix` `refactor` `chore` `docs` `schema`
4. **Stage specific files only** — never `git add .` blindly. Always exclude `.env`, `.env.local`, and secrets.
5. **After pushing**, confirm with `git status` and `git log --oneline -3`.
6. **PROJECT_BRIEF.md must be committed in the same push** as the code it documents.

### Pre-Push Checklist
- [ ] `tsc --noEmit` passes
- [ ] No `.env` or secrets staged
- [ ] `PROJECT_BRIEF.md` updated
- [ ] Commit message accurately describes what changed

### Related Repos
- CRM: `https://github.com/samh-dev91/realestate-crm`
- Marketplace: `https://github.com/samh-dev91/aqar-marketplace` (this repo)

---

## 6. ENVIRONMENT VARIABLES

```env
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://aqar.[domain].com
NEXT_PUBLIC_CRM_URL=https://crm.[domain].com

# Database
DATABASE_URL=postgresql://user:password@host:5432/aqar_marketplace

# Redis
REDIS_URL=redis://localhost:6379

# CRM Bridge
CRM_BRIDGE_URL=https://crm.[domain].com/api/marketplace-bridge
CRM_BRIDGE_SECRET=minimum_64_char_hmac_secret

# Auth (NextAuth.js v5)
NEXTAUTH_URL=https://aqar.[domain].com
NEXTAUTH_SECRET=minimum_32_char_random_string
GOOGLE_CLIENT_ID=from_google_console
GOOGLE_CLIENT_SECRET=from_google_console
APPLE_ID=from_apple_developer
APPLE_TEAM_ID=from_apple_developer
APPLE_PRIVATE_KEY=from_apple_developer
APPLE_KEY_ID=from_apple_developer

# WhatsApp (OTP + Inquiry Shield)
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=your_instance
ULTRAMSG_TOKEN=your_token

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token

# Push Notifications
VAPID_PUBLIC_KEY=generate_with_web-push
VAPID_PRIVATE_KEY=generate_with_web-push
VAPID_EMAIL=mailto:admin@yourdomain.com
```

---

*Build it to be the most trusted property platform in Egypt.*
*ابنِه ليكون أكثر منصة عقارية موثوقة في مصر.*
