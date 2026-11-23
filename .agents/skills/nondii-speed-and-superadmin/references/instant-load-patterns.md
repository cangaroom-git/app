# Nondii Instant-Load & Speed Optimization Patterns (Distilled from WeGlobal)

This reference provides exact, copy-paste-ready engineering patterns proven in `WeGlobal` (`my-shop`) and adapted directly to `Nondii` (`my-hotel`) on `Next.js 16` + `React 19` + `Prisma 7` + `Neon PostgreSQL` + `Cloudinary` + `Vercel`.

---

## 1. Production-Safe Prisma Singleton & Connection Pool (`src/lib/prisma.ts`)

### Why Nondii Was Slow
In `my-hotel/src/lib/prisma.ts`, the `prisma` export is a `Proxy` that invokes `getOrCreatePrismaClient()` on every property access, while caching on `globalThis` was wrapped in `if (process.env.NODE_ENV !== "production")`. In production, every `prisma.hotel` / `prisma.pin` access created a **brand-new `pg.Pool` and `PrismaClient`**, triggering fresh TLS connections to Neon on every query.

### WeGlobal Pattern Adapted for Nondii
Cache the pool and client in **both development and production** (so warm Vercel serverless instances reuse connections across requests), increase pool capacity for parallel `Promise.all` RSC queries, and attach a pool error handler:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  __nondiiPrisma?: PrismaClient;
  __nondiiPgPool?: Pool;
};

function normalizePgConnectionString(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (sslmode === "require" || sslmode === "prefer" || sslmode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  if (!raw) throw new Error("Missing DATABASE_URL / DIRECT_URL");

  const pool =
    globalForPrisma.__nondiiPgPool ??
    new Pool({
      connectionString: normalizePgConnectionString(raw),
      max: 20, // Supports parallel Promise.all RSC queries without pool starvation
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true,
    });

  if (!globalForPrisma.__nondiiPgPool) {
    pool.on("error", (err) => {
      console.error("[pg.Pool] Unexpected idle client error:", err);
    });
    globalForPrisma.__nondiiPgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__nondiiPrisma ?? createPrismaClient();
// CRITICAL: Cache unconditionally so production serverless workers reuse the singleton!
globalForPrisma.__nondiiPrisma = prisma;
export default prisma;
```

---

## 2. Vercel Region Co-location & Function Sizing (`vercel.json`)

WeGlobal pins deployment to Singapore (`sin1`) — right next to Neon APAC/Singapore and Thai users — and bumps memory on heavy routes (more memory = proportionally faster vCPU and faster cold starts):

```json
{
  "regions": ["sin1"],
  "crons": [
    {
      "path": "/api/cron/sync-stats",
      "schedule": "0 */2 * * *"
    }
  ],
  "functions": {
    "src/app/api/**/*": { "memory": 1792 },
    "src/app/[hotelSlug]/page.tsx": { "memory": 1792 },
    "src/app/explore/page.tsx": { "memory": 1792 }
  }
}
```

---

## 3. 3-Tier Server Cache + Request Deduplication + Data Revival + Tag Invalidation

### Pattern A — `React.cache` + `unstable_cache` + Data Revival (`/{hotelSlug}`)
Wrap public detail fetches in **both** `React.cache` (deduplicates `generateMetadata` + `Page` in the same request) and `unstable_cache` (skips Neon completely for 1 hour across users):

```typescript
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// 1. Ultra-lean metadata query (used ONLY by generateMetadata if page doesn't need full payload yet)
export const getPlaceMetadataBySlug = cache(async (rawSlug: string) => {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return null;

  return unstable_cache(
    async () =>
      prisma.hotel.findUnique({
        where: { slug, isPublished: true },
        select: {
          id: true,
          slug: true,
          nameTh: true,
          nameEn: true,
          taglineTh: true,
          descriptionTh: true,
          coverImageUrl: true,
          logoUrl: true,
          provinceId: true,
          districtTh: true,
          stayStyles: true,
          placeCategory: true,
          merchantMode: true,
          rooms: {
            where: { isActive: true },
            select: { weekdayPriceThb: true },
            orderBy: { weekdayPriceThb: "asc" },
            take: 1,
          },
        },
      }),
    [`place-meta-v1-${slug}`],
    { revalidate: 3600, tags: ["places", `place-${slug}`] }
  )();
});

// 2. Public Base Storefront (NO userId / session / likes inside shared cache!)
export const getPublicPlaceStorefrontBySlug = cache(async (rawSlug: string) => {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return null;

  const raw = await unstable_cache(
    async () => fetchPublicPlaceFromDb(slug),
    [`place-storefront-v1-${slug}`],
    { revalidate: 3600, tags: ["places", `place-${slug}`] }
  )();

  if (!raw) return null;

  // MANDATORY DATA REVIVAL: unstable_cache converts Date & Prisma Decimal to JSON strings!
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    ratingAvg: Number(raw.ratingAvg),
    // Revive any nested dates/decimals here...
  };
});
```

### Pattern B — Deterministic Normalized Cache Keys (Discovery / Explore / Search)
Sort object keys and array arguments before passing to `unstable_cache` so identical filter combinations hit the same cache entry instead of exploding cache cardinality:

```typescript
export async function getCachedDiscoveryFeed(filters: DiscoveryFilters) {
  const normalized = {
    category: filters.placeCategory ?? "ALL",
    province: filters.provinceId ?? "all",
    source: filters.sourceType ?? "ALL",
    style: filters.style ?? "all",
    maxPrice: filters.maxPriceThb ?? null,
    attributes: Object.fromEntries(
      Object.entries(filters.attributes ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, vals]) => [k, [...new Set(vals)].sort()])
    ),
    page: filters.page ?? 1,
    limit: filters.limit ?? 48,
  };

  const filterKey = JSON.stringify(normalized);
  return unstable_cache(
    async () => queryDiscoveryFeedFromDb(normalized),
    ["nondii-discovery-v1", filterKey],
    {
      revalidate: 900, // 15m for feeds/deals; invalidated instantly on admin/host mutation
      tags: ["places", "place-list", "home-feed", "explore-feed"],
    }
  )();
}
```

### Pattern C — Centralized Cache Invalidation Helper (`src/lib/cache/revalidateNondii.ts`)
Mirror WeGlobal's `revalidateProductCatalog()` — call this on **every** host studio, super-admin, or booking/coupon/category mutation:

```typescript
import { revalidatePath, revalidateTag } from "next/cache";

export function revalidatePlaceCatalog(options?: {
  slug?: string;
  previousSlug?: string;
  provinceId?: string;
  includeCategories?: boolean;
}) {
  revalidateTag("places", "max");
  revalidateTag("place-list", "max");
  revalidateTag("home-feed", "max");
  revalidateTag("explore-feed", "max");

  if (options?.includeCategories) {
    revalidateTag("place-categories", "max");
  }
  if (options?.slug) {
    revalidateTag(`place-${options.slug}`, "max");
    revalidatePath(`/${options.slug}`);
  }
  if (options?.previousSlug && options.previousSlug !== options.slug) {
    revalidateTag(`place-${options.previousSlug}`, "max");
    revalidatePath(`/${options.previousSlug}`);
  }
  revalidatePath("/");
  revalidatePath("/explore");
}

export function revalidateSystemAppearance() {
  revalidateTag("appearance", "max");
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/super-admin/systems");
}
```

---

## 4. Zero-Write Auth Session & Scoped Middleware

### Fix `getServerSessionUser()` (`src/lib/auth/session.ts`)
- Wrap in `React.cache()` so calling it in layout + page + helpers only hits Neon Auth once per request.
- Use **read-only `prisma.user.findUnique()`** on normal requests. Only call `prisma.user.upsert()` when the row doesn't exist yet (first login) or inside the auth callback route!
- **Public-First Pattern:** On public storefront/home routes (`/` and `/explore`), do NOT block initial HTML rendering waiting on session/taste lookups when rendering cached public shells — overlay user likes/saves/boards via client-side SWR after hydration or inside a non-blocking `<Suspense>` slot!

### Scoped `src/middleware.ts`
Never intercept public routes (`/`, `/explore`, `/{hotelSlug}`, `/style/*`):

```typescript
export const config = {
  matcher: [
    "/super-admin/:path*",
    "/studio/:path*",
    "/bookings/:path*",
    "/register-hotel/:path*",
    "/login",
  ],
};
```

---

## 5. Shell-First Streaming RSC & Stable LCP Node

Learned directly from WeGlobal's `08-page-speed-performance-plan.md` (which cut Home LCP by **38%** and Search LCP by **49%**):

```tsx
// page.tsx (Server Component)
export default async function HomePage() {
  // 1. Await ONLY cached shell data (categories + system hero config)
  const [categories, siteConfig] = await Promise.all([
    getPlaceCategoryHierarchy(), // unstable_cache 1h
    getSystemConfig("home_config"), // unstable_cache 1h
  ]);

  // 2. Start primary feed promise in parallel without blocking the LCP shell header
  const feedPromise = getCachedDiscoveryFeed({ limit: 48 });

  return (
    <main>
      {/* STABLE LCP SHELL — never inside streaming Suspense! */}
      <CategoryStrip categories={categories} />

      {/* Stream secondary / heavy sections independently */}
      <Suspense fallback={<FeedGridSkeleton />}>
        <HomeDiscoveryFeedSection dataPromise={feedPromise} />
      </Suspense>
    </main>
  );
}
```

### Rules Learned from WeGlobal's Streaming Fixes
1. **Never duplicate the LCP hero/banner inside both fallback and resolved Suspense trees** — Chrome's `MutationObserver` & Lighthouse treat a swapped node as a brand-new late LCP paint!
2. **Audit full-page `loading.tsx`**: WeGlobal deleted `src/app/search/loading.tsx` because Next.js wrapped the entire route in Suspense, adding +221ms render delay to the hero banner. Prefer fast cached SSR + granular below-the-fold `<Suspense>`.
3. **Stream below-the-fold `/{hotelSlug}` blocks**: Render Hero + Core Place Info + Primary Booking/CTA immediately from cached `getPublicPlaceStorefrontBySlug`; wrap `NearbyPlacesSection`, `GuestReviewsSection`, `OwnerBlogsSection`, and `RelatedPinsSection` in separate `<Suspense>` boundaries with `[content-visibility:auto]`.

---

## 6. Smart Prefetch Discipline & Instant Client Deduplication

### Why Blind Prefetching Makes Apps Slow
In WeGlobal commit `8b11c1d`, disabling `prefetch` on `ProductCard` (`prefetch={false}`) dramatically improved real click responsiveness because 40+ cards in a grid were firing simultaneous RSC fetches in the background, starving the browser network queue and Neon DB pool.

### Nondii Prefetch Policy
| UI Element | Prefetch Setting | Reason |
|---|---|---|
| `VerticalCouponCard`, `ExploreHorizontalCardStrip`, `SeeAllCouponCard`, `Footer`, filter chips | **`prefetch={false}`** (and remove hover `router.prefetch()` storms!) | Prevents 20–60 background dynamic hits saturating Neon & Vercel |
| Primary Nav (`Home`, `Explore`, `Trip`) | `prefetch={isHome}` (selective) | Keeps return-to-home instant without pulling heavy map/blog chunks |
| Single high-intent CTA inside an open modal (e.g. "เข้าหน้าร้าน / จองตรง") | `prefetch={true}` (1 link only) | High conversion intent (>50% click probability), only 1 lightweight cached route |
| Client modals / drawers / map detail fetches (`/api/pins/[id]`, `/api/places/detail`) | **In-Flight Promise + Memory Cache** (`dataCache` + `promiseCache`) or SWR `preload()` | Zero duplicate network hits; re-opening any place card resolves in **0ms** |

### Client-Side In-Flight Promise & Memory Cache Pattern (from WeGlobal `chat-product-cache.ts`)
```typescript
const dataCache = new Map<string, PlaceDetailPayload>();
const promiseCache = new Map<string, Promise<PlaceDetailPayload>>();

export async function getCachedPlaceDetail(placeId: string): Promise<PlaceDetailPayload> {
  if (dataCache.has(placeId)) return dataCache.get(placeId)!;
  if (promiseCache.has(placeId)) return promiseCache.get(placeId)!;

  const req = fetch(`/api/pins/${encodeURIComponent(placeId)}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: PlaceDetailPayload) => {
      dataCache.set(placeId, data);
      return data;
    });

  promiseCache.set(placeId, req);
  try {
    return await req;
  } catch (err) {
    promiseCache.delete(placeId);
    throw err;
  }
}
```

---

## 7. Data Diet, DB-First Facets & Pre-Aggregated `PlaceStats`

### A. Strict Projection Separation
- `placeCardSelect`: `id, slug, nameTh, provinceId, districtTh, placeCategory, categoryId, coverImageUrl, latitude, longitude, ratingAvg, minPriceThb, verificationStatus` + top 1 active coupon.
- **Denormalize `minPriceThb` & `maxGuests` on `Hotel` (updated whenever a `Room` is saved)** so Home/Explore NEVER has to `JOIN` all `rooms` rows just to compute `Math.min(...)` or filter `maxPriceThb` in JavaScript!

### B. DB-First Facets (`groupBy` / `aggregate` / `$queryRaw`)
Share ONE pure `buildPlaceWhere(filters)` function across both the grid query and facet queries, then run them in parallel:

```typescript
const [places, total, categoryGroups, provinceGroups, priceBounds, attributeFacets] =
  await Promise.all([
    prisma.hotel.findMany({ where, select: placeCardSelect, take: limit, skip, orderBy }),
    prisma.hotel.count({ where }),
    prisma.hotel.groupBy({ by: ["categoryId"], _count: { _all: true }, where }),
    prisma.hotel.groupBy({ by: ["provinceId"], _count: { _all: true }, where }),
    prisma.hotel.aggregate({ _min: { minPriceThb: true }, _max: { minPriceThb: true }, where: whereWithoutPrice }),
    getPlaceAttributeFacets(where), // Raw SQL pivot COUNT(DISTINCT ha."hotelId") GROUP BY attribute, value
  ]);
```

### C. Pre-Aggregated `PlaceStats` Table (O(1) Trending & Ranking)
Instead of scanning `TelemetryEvent` / `ContactClickLog` on every page load:

```prisma
model PlaceStats {
  hotelId         String   @id
  views24h        Int      @default(0)
  views7d         Int      @default(0)
  views30d        Int      @default(0)
  savesCount      Int      @default(0)
  likesCount      Int      @default(0)
  contactClicks7d Int      @default(0)
  bookings30d     Int      @default(0)
  popularityScore Float    @default(0)
  updatedAt       DateTime @updatedAt
  hotel           Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)

  @@index([views7d(sort: Desc)])
  @@index([popularityScore(sort: Desc)])
}
```
- Refreshed by `/api/cron/sync-stats` (`stats-aggregator.ts`), plus prune `TelemetryEvent` older than 30 days.
- Ranking query becomes a `<10ms` indexed read (`orderBy: { stats: { popularityScore: "desc" } }`).

---

## 8. LCP Image Priority Budget, Lazy Card Sliders & Bundle Hygiene

### Image Priority Rules
- **Priority Budget:** Maximum **1–2 images per route** get `priority` + `fetchPriority="high"` (first 2 cards on mobile Home grid, or the main hero photo on `/{hotelSlug}`). Every card at index `>= 2` MUST use `loading="lazy"`.
- **Responsive `sizes`:** Match real grid columns — e.g. `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"` — never default `100vw` on 2-column mobile grids.
- **Lazy Multi-Photo Sliders (from WeGlobal `ProductCard.tsx`):**
  ```tsx
  const [hasInteracted, setHasInteracted] = useState(false);
  // Only render slide 0 in initial DOM; mount slides 1..N after first hover or touch!
  const shouldRender = idx === currentIndex || hasInteracted;
  ```
- **Below-the-fold CSS Skipping:** Wrap heavy detail sections (reviews, related pins, long blog feeds) in `[content-visibility:auto] [contain-intrinsic-size:auto_720px]`.

### Global Shell & Context Hygiene (`HotelAppShell.tsx`)
1. Convert ALL non-initial overlays in `HotelAppShell.tsx` to `next/dynamic(..., { ssr: false })`:
   - `PlaceCardFlipOverlay`, `AuthPromptModal`, `ChooseBoardModal`, `CreateBoardModal`, `BoardSaveToast`, `CookieConsentBanner`, `CouponWalletDrawer`, `Toaster`.
   - Mount modals conditionally (`{isAuthModalOpen && <AuthPromptModal ... />}`) so dynamic chunks are not even fetched until first interaction!
2. Split `PlatformAppContext` (40+ fields) into **5 isolated contexts**:
   - `ThemeLangContext` (rarely changes)
   - `AuthSessionContext` (changes on login/logout)
   - `BookingSearchFilterContext` (dates, guests, search query, province)
   - `BoardAndLikeContext` (saved boards, optimistic like overrides — or use `useSyncExternalStore` like `placeLikeStore.ts` so ONLY the single toggled card re-renders!)
   - `PlaceFlipTransitionContext` (flip animation state)
3. **Never import Zod schemas into public client providers**: extract static constants (e.g. `PLACE_CATEGORY_DEFAULTS`, `THAILAND_PROVINCES`) into schema-free pure TypeScript files so `zod` stays completely out of the public client bundle!
