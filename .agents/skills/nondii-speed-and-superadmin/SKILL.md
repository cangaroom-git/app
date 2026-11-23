---
name: nondii-speed-and-superadmin
description: >-
  Authoritative Performance Optimization ("Instant-Load") Constitution and Super-Admin / Dynamic
  Category-Type Architecture Blueprint for Nondii (my-hotel), distilled from production WeGlobal
  (my-shop) patterns and tailored to Nondii's Next.js 16 + Prisma 7 + Neon PostgreSQL stack.
  Use whenever optimizing page speed, fixing slow/sluggish routes, improving TTFB/LCP/INP/CLS,
  adding server caching (unstable_cache/React.cache/revalidateTag), tuning Prisma/Neon/Vercel,
  fixing prefetch storms or bundle bloat, or designing/building Nondii's /super-admin backend,
  dynamic Place Categories/Types, Attributes/Amenities, Search Synonyms, Appearance/SEO settings,
  and verification/moderation queues.
---

# Nondii Speed Optimization & Super-Admin Architecture Constitution

> **Scope & Compatibility:**
> - **Performance & Backend Architecture:** Distilled from production `WeGlobal` (`my-shop`) engineering patterns — same core stack (`Next.js 16`, `React 19`, `Prisma 7 + @prisma/adapter-pg`, `Neon Postgres`, `Cloudinary`, `Vercel`).
> - **UI/UX Compliance:** Every Admin & Storefront UI built with this skill **MUST** still obey `.agents/skills/my-hotel-design-system/SKILL.md` (Airbnb Warm Minimal, Inset-Label `<StandardInput />`, `<ResponsiveSelect />`, `<StandardCheckbox />`, `useModalPresence`, **ZERO hover scale**, **ZERO card/button shadows**, **ZERO border fatigue**, **ZERO Apple Blue buttons**). Adopt WeGlobal's *architecture and data-flow*, NEVER copy WeGlobal's Apple Blue visual styles.
> - **Business Blueprint:** Always align business entities with `CoreBusiness/README.md` (`01`–`07`).

---

## Quick Navigation (Progressive Disclosure)

Load the targeted reference file when implementing a specific area:

1. **Instant-Load & Speed Cookbook:** [references/instant-load-patterns.md](./references/instant-load-patterns.md) — Exact code patterns for Prisma singleton pooling, `vercel.json` `sin1`, `React.cache` + `unstable_cache` + data revival, `revalidateTag`, shell-first `<Suspense>` streaming, smart prefetch discipline, Data Diet projections, DB-first facets, pre-aggregated `PlaceStats`, CDN image priority budgets, and bundle/context splitting.
2. **Super-Admin & Dynamic Category/Type Blueprint:** [references/super-admin-and-taxonomy-blueprint.md](./references/super-admin-and-taxonomy-blueprint.md) — Full `/super-admin` module map, standardized 5-file module architecture (`Schema -> Mapper -> Action -> FormSheet -> Client`), DB-backed dynamic `PlaceCategoryConfig` (replacing hardcoded `PlaceCategory`/`PropertyType`/`STAY_STYLE_TABS`), safe transactional re-parenting & Miller-Column DnD, dynamic `PlaceAttribute` facets, `SystemConfig`/`AiPrompt`, Search Synonyms, and RBAC hardening.
3. **Performance Verification & CI Gate Workflow:** [references/perf-verification-workflow.md](./references/perf-verification-workflow.md) — Closed-loop 5-step optimization workflow, production-only measurement contract (`npm run build && npm run start`), 3-run mobile Lighthouse runner (`perf:audit`), schema-2 budget gate (`perf:check`), INP interaction trace testing, and consent-aware RUM (`@vercel/speed-insights`).

---

## Part 1 — The 12 Non-Negotiable Instant-Load Laws (กฎเหล็กทำให้ Nondii โหลดทันทีที่กด)

Every page, API route, Server Action, and database query in `my-hotel` MUST obey these 12 laws:

### Law 1 — Production-Safe Prisma Singleton & Pool (`CRITICAL`)
- **NEVER** guard `globalThis` Prisma/Pool caching behind `if (process.env.NODE_ENV !== "production")` when using a lazy `Proxy` factory — in production that creates a brand-new `pg.Pool` and TCP+TLS handshake on **every single query**.
- Always instantiate ONE module-level / `globalThis` `pg.Pool` + `PrismaClient` (both dev and prod) with:
  - `max: 20` (handle parallel RSC `Promise.all` queries without queuing)
  - `connectionTimeoutMillis: 20000`, `idleTimeoutMillis: 30000`, `allowExitOnIdle: true`
  - `pool.on("error", ...)` listener so idle disconnects never crash the serverless worker.

### Law 2 — Vercel Region Co-location & Serverless Sizing (`vercel.json`)
- Pin `"regions": ["sin1"]` in `vercel.json` so Vercel Serverless Functions run in **Singapore** alongside Neon Postgres and Thai users (eliminates 200–400ms cross-region RTT per query).
- Allocate `"memory": 1792` to heavy API & SSR routes (`src/app/api/**/*`, `src/app/explore/page.tsx`, `src/app/[hotelSlug]/page.tsx`) for faster vCPU and lower cold-start latency.
- Schedule Vercel Cron (`/api/cron/sync-stats`) for background stats aggregation and log pruning.

### Law 3 — 3-Tier Server Caching + Request Memoization + Strict Tag Invalidation
- **Tier 1 (Per-Request Deduplication):** Wrap shared read functions in `React.cache(...)` so `generateMetadata()` and `Page()` NEVER execute the same DB query twice in one request.
- **Tier 2 (Cross-Request Data Cache):** Wrap public catalog, category tree, place profile, explore discovery, and system config reads in `unstable_cache(fn, deterministicKeys, { revalidate, tags })`.
  - Global config / categories / place profiles / discovery: `revalidate: 3600` (1 hour).
  - Flash deals / active coupons: `revalidate: 900` (15 minutes).
  - **Deterministic Keys:** Sort filter keys and array values before `JSON.stringify` to prevent cache explosion.
- **Tier 3 (Centralized Mutation Invalidation):** Create ONE helper `revalidatePlaceCatalog({ slug, previousSlug, provinceId })` that calls `revalidateTag(tag, "max")` + `revalidatePath(...)` across ALL affected tags (`"places"`, `"place-list"`, `"home-feed"`, `"explore-feed"`, `"place-categories"`, `"place-${slug}"`, plus `"place-${previousSlug}"` on slug rename!) on EVERY create/update/approve/delete mutation.
- **Data Revival Rule (Cache Trap Prevention):** `unstable_cache` JSON-serializes `Date` and Prisma `Decimal` into strings. ALWAYS revive them (`new Date(...)`, `Number(...)`) immediately after reading from cache before any math or date formatting.
- **Zero Personalization Leakage:** NEVER cache `session`, `userId`, `likedSet`, `savedSet`, `wallet`, or `tasteProfile` inside a shared `unstable_cache`. Cache the **public base payload**, then overlay per-user flags via a tiny indexed lookup or client-side SWR!

### Law 4 — Ban Unnecessary `force-dynamic`, Auth Writes on Read, & Public Middleware
- **Remove `export const dynamic = "force-dynamic"`** from public discovery/profile pages whenever possible; rely on tagged `unstable_cache` + ISR. Keep `force-dynamic` strictly on authenticated private dashboards (`/super-admin`, `/studio`, `/bookings`, `/trip`).
- **ZERO DB Writes in `getServerSessionUser()`:** NEVER execute `prisma.user.upsert()` on every SSR page render! Wrap `getServerSessionUser()` in `React.cache()`, use read-only `prisma.user.findUnique()`, and perform `upsert` ONLY on auth callback/sign-in or when the user row does not yet exist.
- **Scoped `middleware.ts`:** Limit middleware `matcher` strictly to protected/auth paths (`/super-admin/:path*`, `/studio/:path*`, `/bookings/:path*`, `/register-hotel/:path*`, `/login`). NEVER intercept public pages (`/`, `/explore`, `/{hotelSlug}`).

### Law 5 — Shell-First Streaming RSC & Stable LCP Node
- Fetch ONLY lightweight cached shell data at the top of `page.tsx` via `Promise.all`; kick off heavy secondary data promises *without* blocking the shell and stream them inside granular `<Suspense>` boundaries (`reviews`, `nearbyPlaces`, `relatedPins`, `ownerBlogs`).
- **Stable LCP Node Rule:** Keep the primary LCP element (Hero / First Row / Place Cover) **outside** streaming `<Suspense>` boundaries so it paints in the initial HTML and is NEVER unmounted/replaced when dynamic slots resolve.
- **Audit Full-Page `loading.tsx`:** If a route's `loading.tsx` wraps the entire page and delays rendering of the cached Hero/LCP shell, remove it in favor of shell-first streaming + targeted inline `<Suspense>` skeletons.

### Law 6 — Smart Prefetch Discipline (Kill Prefetch Storms!)
- **NEVER** leave default prefetch or `prefetch={true}` on repeating cards (`VerticalCouponCard`, `ExploreHorizontalCardStrip`, `SeeAllCouponCard`), footer links, or filter/tag chips! Firing 20–60 background dynamic RSC prefetches saturates Neon's pool and makes the user's *actual click* wait in queue. Set `prefetch={false}` on card grids, footers, and filter chips.
- **DO** keep instant click feel through:
  1. Selective `prefetch={isHome}` on primary top/bottom nav items (never prefetch heavy secondary routes like blog/map unless needed).
  2. Immediate visual feedback on click (`RouteProgressBar` / `NextTopLoader` + optimistic transition).
  3. **Client Session Deduplication (`dataCache` + `promiseCache`)** or SWR `preload()` for hover/open modal & drawer data so repeated opens resolve in `0ms` with zero duplicate network requests.

### Law 7 — Strict Query Separation ("Data Diet") & DB-First Facets
- Maintain strictly separated Prisma `select` shapes:
  - `placeMetadataSelect` — tiny 6-field query for `generateMetadata()` ONLY.
  - `placeCardSelect` — lean fields for Home/Explore cards ONLY (no descriptions, no 60 pins, no 365-day overrides, no nearby JSON).
  - `placeStorefrontSelect` — detail page only, with below-the-fold sections split into parallel/streamed queries.
- **Strict Ban:** NEVER call `getHotelStorefrontBySlug` inside `generateMetadata()` and NEVER use deep `include: { ...: true }` on list endpoints.
- **DB-First Filtering & Facets:** Push price range (`minPriceThb`), province/category counts, and attribute facets into Postgres (`prisma.groupBy`, `prisma.aggregate`, `prisma.$queryRaw` with a shared `buildPlaceWhere()` builder). NEVER load 100+ rows with nested `rooms` & `coupons` into JS to filter or count.

### Law 8 — Pre-Aggregated Stats & Composite Indexing
- Decouple high-volume event tables (`TelemetryEvent`, `ContactClickLog`, `PinShare`) from feed ranking. Maintain a compact `PlaceStats` / `PinStats` aggregate table (`views24h`, `views7d`, `views30d`, `savesCount`, `bookingClicks`, `popularityScore`) refreshed via Cron (`/api/cron/sync-stats`) and prune raw telemetry older than 30 days.
- Always pair high-frequency `WHERE + ORDER BY` patterns with composite Prisma `@@index(...)` definitions and pivot indexes (`@@index([valueId, hotelId])`).

### Law 9 — LCP Image Priority Budget, CDN Loader & Lazy Multi-Slide Cards
- Keep `<link rel="preconnect" href="https://res.cloudinary.com" />` and custom responsive CDN resizing (`f_auto,q_auto,c_limit,w_${width}`) with `deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920]` and `formats: ["image/avif", "image/webp"]`.
- **Priority Budget:** Give `priority` + `fetchPriority="high"` ONLY to the **1–2 true above-the-fold LCP images** per route (first 2 mobile cards or hero cover). Every other image MUST stay `loading="lazy"`. Match `sizes` to actual rendered layout width (e.g., `50vw` on 2-col mobile grid, NOT `100vw`).
- **Lazy Card Carousels:** Inside multi-image cards, render ONLY slide `0` until `hasInteracted` (hover/touch).
- **Below-the-Fold Rendering:** Use `[content-visibility:auto] [contain-intrinsic-size:auto_<px>]` on heavy below-the-fold detail blocks (reviews, related stays, blogs) — never guess heights that trigger CLS.

### Law 10 — Lean Root Shell, Split Contexts & Zero Admin Schema Leakage
- Keep `RootLayout` and `HotelAppShell` razor-thin: dynamically import (`next/dynamic(..., { ssr: false })`) ALL modals, drawers, flip overlays, auth prompts, board modals, cookie banners, and toasters so they ship `0 KB` until triggered.
- **Context Isolation:** NEVER put fast-changing UI state (search input, card likes, flip transition) in the same React Context as stable auth/theme/settings — split into focused providers so one state change does not re-render every card on screen.
- **No Zod in Public Bundles:** Keep client-safe static constants/options in pure files (e.g., `src/lib/placeCategoryDefaults.ts`) and NEVER import Zod validation schemas (`src/lib/schemas/*.schema.ts`) into public client components/providers.
- **Font Budget (<100KB):** Load only critical weights/subsets of `Plus Jakarta Sans` + `Anuphan`; keep specialty/editor fonts route-scoped.

### Law 11 — Optimistic UI & Instant Interaction (INP <= 200ms)
- Every interactive toggle (Like, Save to Board, Category Drag-Reorder, Verification Approve/Reject, Campaign Toggle) MUST apply optimistic client state in `<16ms`, fire the mutation asynchronously, and roll back ONLY on server failure.
- Avoid race conditions during rapid actions: do NOT trigger heavy full-list re-fetches after every single optimistic drag-drop; sync cleanly via server response or debounced refresh.

### Law 12 — Evidence-First Closed-Loop Verification
- **NEVER** benchmark on `npm run dev`! Always measure on `npm run build && npm run start`.
- Follow the 5-step loop: **Measure (3 cold mobile runs) -> Diagnose (trace/network evidence) -> Refactor (critical/high only) -> Verify (3 cold runs before/after median) -> Monitor (consent-aware RUM)**.
- Hard release budgets: **LCP <= 2.5s goal (<= 4.0s hard gate)**, **INP <= 200ms**, **CLS <= 0.1 (0 outliers)**, **TTFB <= 800ms**, **Total Transfer <= 1.5MB**, **JS < 300KB**, **Fonts < 100KB**.

---

## Part 2 — Audited Immediate Bottlenecks in `my-hotel` (Priority Fix Order)

These verified findings in `my-hotel` directly explain current sluggishness — fix in this exact order:

| Priority | File / Area | Verified Bottleneck | Required Fix |
|---|---|---|---|
| **P0** | `src/lib/prisma.ts` | `if (process.env.NODE_ENV !== "production")` prevents caching `__cangaroomPrisma` & `__cangaroomPgPool` in production — creating a **new DB pool on every `prisma.<model>` access**, plus tiny `max: 8` pool. | Cache singleton unconditionally in both dev & prod, tune `max: 20`, `connectionTimeoutMillis: 20000`, `idleTimeoutMillis: 30000`, `allowExitOnIdle: true`, add `pool.on("error")`. |
| **P0** | `src/app/[hotelSlug]/page.tsx` + `src/lib/services/hotelStorefrontService.ts` | `generateMetadata()` AND `HotelStorefrontPage()` BOTH call `getHotelStorefrontBySlug()` (10+ queries incl. 365-day bookings/overrides + `getPinDetailById`) with **zero `React.cache` and zero `unstable_cache`** -> **20+ DB queries per click**. | Split tiny cached `getPlaceMetadataBySlug()` for metadata; wrap public storefront base in `React.cache` + `unstable_cache` (1h, tag `place-${slug}`); overlay live availability/user likes separately; stream reviews/blogs/nearby via `<Suspense>`. |
| **P0** | `vercel.json` (missing) | No `vercel.json` -> Vercel defaults to US (`iad1`) instead of Singapore (`sin1`), adding hundreds of ms RTT per Neon roundtrip. | Add `vercel.json` with `"regions": ["sin1"]`, `1792 MB` memory on API/SSR routes, and `/api/cron/sync-stats`. |
| **P0** | `src/lib/auth/session.ts` | `getServerSessionUser()` runs `prisma.user.upsert()` (**DB WRITE**) on every SSR page load and is not wrapped in `React.cache()`. | Wrap in `React.cache()`, switch to read-only `findUnique()`, upsert ONLY on auth login callback or when missing. |
| **P0** | `src/lib/services/stayDiscoveryService.ts` + `src/app/page.tsx` + `src/app/explore/page.tsx` | Zero `unstable_cache` anywhere; `force-dynamic` on every public route; blocks entire HTML waiting for auth + taste + 80–100 pins + nested rooms/coupons + sequential `getPinsByIds()`. | Cache public base discovery feed with `unstable_cache` (tags `home-feed`, `explore-feed`, `places`), denormalize `minPriceThb` on `Hotel`/`Pin`, push price filter to SQL, stream below-the-fold & personalized overlays without blocking LCP shell. |
| **P1** | `VerticalCouponCard.tsx` & `PinterestPinDetail.tsx` | Hover `router.prefetch()` on cards + 5x `prefetch={true}` links hit uncached dynamic `/{hotelSlug}` routes -> **prefetch storm** queueing real clicks. | Disable card/footer prefetch (`prefetch={false}`); rely on fast cached `/{hotelSlug}` + targeted modal/session memory cache (`promiseCache`) + `RouteProgressBar`. |
| **P1** | `src/components/HotelAppShell.tsx` | 1,333-line root client shell synchronously imports modals/overlays + packs 40+ unrelated values into one monolithic Context. | `next/dynamic(..., { ssr: false })` all modals/overlays/banners; split Context into isolated Auth, UI/Prefs, Search, Boards/Likes, and FlipTransition providers. |
| **P1** | `src/app/[hotelSlug]/loading.tsx` | Full-page loading boundary can delay/replace cached hero shell during navigation. | Measure before/after; prefer instant cached storefront + granular `<Suspense>` for non-LCP sections. |
| **P2** | `src/app/super-admin/*` & `src/lib/placeCategories.ts` | Hardcoded `PlaceCategory`/`PropertyType`/`STAY_STYLE_TABS` enums + client-only 3-tab `/super-admin/page.tsx` with no server layout RBAC guard or taxonomy/system tools. | Build full Server-Guarded `/super-admin` console + DB-backed `PlaceCategoryConfig`, `PlaceAttribute`, `SystemConfig`, `AiPrompt`, and `SearchSynonym` (see Part 3). |
| **P2** | `scripts/performance/*` (missing) | No automated Lighthouse runner, budget gate, or RUM telemetry. | Port WeGlobal's `perf:audit`, `perf:check`, GitHub Actions guardrail, and consent-aware `@vercel/speed-insights`. |

---

## Part 3 — Super-Admin Backend & Dynamic Category/Type Rules

When building or extending `/super-admin` in `my-hotel`, follow these core architectural rules (full Prisma models, folder map, and templates are in [references/super-admin-and-taxonomy-blueprint.md](./references/super-admin-and-taxonomy-blueprint.md)):

1. **Mandatory 5-File Standardized Admin Module Pattern:**
   Every Super-Admin domain (`categories`, `attributes`, `places`, `campaigns`, `reports`, `synonyms`, `systems`, `users`) MUST separate responsibilities across 5 clean layers:
   - `src/lib/schemas/<entity>.schema.ts` — Zod validation schema (NEVER imported into public client bundles!)
   - `src/lib/mappers/<entity>.mapper.ts` — Pure form-to-payload mapper (`safeNumber`, `slugify`) + explicit Prisma `Decimal`/`Date` serializer (NEVER use `JSON.parse(JSON.stringify(...))`!)
   - `src/actions/admin/<entities>.ts` (or protected API route) — Server Action with **mandatory `SUPER_ADMIN` role assertion**, unique slug check, `prisma.$transaction` integrity, and **immediate `revalidateTag` + `revalidatePath`**.
   - `src/components/super-admin/<entity>/<Entity>FormSheet.tsx` — Airbnb Warm Minimal Slide-Up Sheet / Desktop Drawer (`useModalPresence`, `<StandardInput />`, `<ResponsiveSelect />`, Zod error catch).
   - `src/components/super-admin/<entity>/<Entity>Client.tsx` — Optimistic UI + lazy-loaded child records + server-prop merge sync after `router.refresh()`.
2. **Dynamic Categories / Place Types (Zero-Code Taxonomy Management):**
   - Transition from hardcoded `PlaceCategory` enum / `PropertyType` / `STAY_STYLE_TABS` to a DB-backed hierarchical `PlaceCategoryConfig` table (`parentId` self-relation up to 3 levels: **L1 Place Type** e.g. `STAY / CAFE / RESTAURANT / ATTRACTION / WELLNESS` -> **L2 Sub-Type** e.g. `Pool Villa / Glamping / Specialty Coffee` -> **L3 Style/Theme Tag**).
   - Store all presentation & SEO metadata in DB (`slug`, `code`, `labelTh`, `labelEn`, `shortLabelTh`, `crestBgHex`, `iconKey`, `schemaOrgType`, `defaultCtaTh/En`, `defaultMerchantMode`, `position`, `isActive`, `isSystem`), served publicly through `getPlaceCategoryHierarchy()` (`unstable_cache`, `revalidate: 3600`, `tags: ["place-categories"]`).
   - **Safe Mutation & Re-Parenting Rules:**
     - Prevent self-parenting and ancestor->descendant cycles (`descendantIds` check) + enforce max depth (`<= 3`).
     - Deleting or changing level of a category MUST execute inside `prisma.$transaction`, safely reassigning affected places (to a chosen replacement category or `Uncategorized` staging queue) — NEVER orphan rows or throw FK errors!
     - Reordering uses `@dnd-kit` optimistic state + transactional `updateCategoryPositions()` + immediate `revalidateTag("place-categories", "max")`.
     - Upfront admin load fetches categories with `includePlaces: false` and lazy-loads places only when a category column is clicked!
3. **Dynamic Attributes / Amenities (`PlaceAttribute` + `CategoryAttributeBinding`):**
   - Super-Admin defines reusable filter dimensions (Amenities, Views, Pet Policy, Coffee Roast, Parking, Payment) and binds them to specific Place Types so `STAY` hosts see room amenities while `CAFE` owners see cafe attributes.
   - Support **diff-based bulk assignment** (`$transaction`), **"quiet" inline value creation** (no `revalidatePath` mid-form), and **In-Use Deletion Guard** (block deletion if `usageCount > 0`).
4. **Essential Super-Admin Control Plane Modules:**
   - **Dashboard (`/super-admin`)**: Platform KPIs (`Pending Verification`, `Open Place Reports`, `Active Sponsored Ads`, `Total Verified Places`) + Pre-Aggregated `PlaceStats` Table (filterable by Category/Province).
   - **Categories & Types (`/super-admin/categories`)**: Miller Columns + Drag-Reorder + Safe Move Modal + Uncategorized Drop Zone.
   - **Attributes & Amenities (`/super-admin/attributes`)**: Filter facets bound per Place Type.
   - **Places & Verification (`/super-admin/places`)**: `Verified Stay` anti-scam review queue + bulk Type/Category switcher + `PlaceReport` moderation queue.
   - **Ads & Featured Deals (`/super-admin/campaigns`)**: `SponsoredCampaign`, `Pin.isSponsored / sponsoredPriority`, `Coupon.isFeaturedDeal`.
   - **Systems (`/super-admin/systems`)**: Tabbed hub for **General/Site Settings**, **Global SEO**, **Homepage Appearance** (`SystemConfig` KV store cached 1h), **Search Synonyms** (3-level Thai/EN mapping), **AI Prompts** (Facebook Sync Triage / Photo Organizer), and **Users & RBAC**.
5. **Defense-in-Depth RBAC Guard:**
   - Guard 1: `src/middleware.ts` blocks unauthenticated hits to `/super-admin/:path*`.
   - Guard 2: Server Component `src/app/super-admin/layout.tsx` verifies `sessionUser.role === "SUPER_ADMIN"` before rendering shell (never rely on client-side `if (user?.role !== "SUPER_ADMIN")` alone!).
   - Guard 3: Every mutating Server Action & `/api/super-admin/*` route starts with `await requireSuperAdmin()` — returning `403` / `{ success: false, error: "Forbidden" }` if unauthorized.

---

## Validation Checklist Before Marking Any Performance or Super-Admin Task Done

- [ ] `npx tsc --noEmit` passes with 0 errors and `npm run build` succeeds cleanly.
- [ ] Every new/edited public read path uses `React.cache` + `unstable_cache` (where public) with explicit Date/Decimal revival and zero user/session data inside shared caches.
- [ ] Every new/edited mutation calls centralized `revalidateTag(..., "max")` + `revalidatePath(...)` (including previous slug on rename).
- [ ] Zero `prefetch={true}` on repeating cards/footers; zero `hover:scale-*`, zero native `<select>`, zero raw `<input type="checkbox">` (Airbnb Warm Minimal Design Constitution respected).
- [ ] Every `/super-admin` page has server-side layout RBAC guard and every action verifies `SUPER_ADMIN` role.
- [ ] Performance changes verified with **3 cold mobile runs on production build** (`npm run build && npm run start`) showing before/after median metrics and zero CLS > 0.1 outliers.
