# 03 — โครงสร้างฐานข้อมูลจริง (Neon PostgreSQL) และกฎเหล็กห้ามใช้ Mock Data (v4.0)

## 1. กฎเหล็กด้านข้อมูล (Strict Real-Database Policy)

1. **ห้ามเก็บข้อมูลธุรกิจหรือโปรโมชั่นไว้ใน `localStorage`**: อนุญาตให้ใช้ `localStorage` เฉพาะค่าตั้งค่าหน้าจอชั่วคราวที่ไม่ใช่ข้อมูลธุรกิจเท่านั้น ได้แก่ `theme` (`light`/`dark`) และ `lang` (`th`/`en`)
2. **ห้ามมี Silent Fallback ไปหา Mock Array**: หากฐานข้อมูลไม่มีข้อมูล ต้องแสดง Empty State จริง และหาก Query ผิดพลาดต้องรายงาน Error ชัดเจน
3. **ข้อมูลเริ่มต้นต้อง Seed ลงฐานข้อมูลจริงเท่านั้น (`prisma/seed.ts`)**

---

## 2. มาตรฐานการเชื่อมต่อ Neon Lakebase Postgres, Prisma 7 & Instant-Load Caching

- **Runtime Queries (`DATABASE_URL`)**: ใช้ **Pooled Connection (`-pooler`)** ผ่าน `@prisma/adapter-pg` (`pg.Pool` singleton แบบ Production-safe ทั้ง dev และ prod, `max: 20`) ใน `src/lib/prisma.ts`
- **Schema Migrations (`DIRECT_URL`)**: ใช้ Direct Connection ใน `prisma.config.ts` สำหรับ `prisma migrate` / `prisma db push`
- **Schema Control**: ประกาศและแก้ไขทุกตารางผ่าน `prisma/schema.prisma` เท่านั้น ห้ามรัน `CREATE TABLE IF NOT EXISTS` ใน Runtime API
- **Egress & Speed Control**: แยก `select` projection (`metadataSelect` / `cardSelect` / `storefrontSelect`), ใช้ `React.cache` + `unstable_cache` (Revive `Date`/`Decimal` เสมอ, ห้ามใส่ข้อมูล user ส่วนตัวใน shared cache) และเรียก `revalidatePlaceCatalog()` / `revalidateTag(..., "max")` ทุกครั้งหลัง Mutation

---

## 3. โครงสร้างตารางปัจจุบันใน `prisma/schema.prisma` (Active Schema)

### 3.1 ผู้ใช้งาน & สิทธิ์ (`User`)
- `User`: `id`, `email @unique`, `name`, `phone`, `avatarUrl`, `role` (`TRAVELLER` | `HOTEL_OWNER` | `SUPER_ADMIN`)

### 3.2 สถานที่และแบรนด์กลาง (`Hotel` = Unified Place & Brand Entity)
- **`Hotel`**: รองรับสถานที่เดี่ยว, แบรนด์เชน และแบรนด์ออนไลน์/บัตรเครดิตในตารางเดียว:
  - อัตลักษณ์ & URL: `slug @unique`, `ownerId`, `nameTh`, `nameEn`, `taglineTh`, `descriptionTh`, `logoUrl`, `coverImageUrl`
  - หมวด & โหมด: `placeCategory`, `merchantMode` (`DIRECT_BOOKING` | `PROFILE_ONLY`), `propertyType`
  - พิกัด & การ์ดหลัก: `provinceId` *(รองรับ `"nationwide"` สำหรับทั่วประเทศ)*, `districtTh`, `addressTh`, `latitude Float?`, `longitude Float?`, `googleMapsUrl`, `googlePlaceId`, `canonicalPinId`, `featuredCouponId`
  - ข้อมูลหน้าโปรไฟล์: `openingHoursJson`, `externalWebsiteUrl`, `primaryCtaLabelTh`, `highlightsJson`, `nearbySpotsJson`, `faqJson`, `stayStyles`, `contactPhone`, `contactLine`, `facebookPageUrl`, `instagramUrl`
  - ข้อมูลเฉพาะโหมด `DIRECT_BOOKING`: `checkInTime`, `checkOutTime`, `petsAllowed`, `petPolicyTh`, `seasonalRulesJson`, `promptPayId`, `promptPayAccountName`, `bankName`, `bankAccountNo`
  - สถานะ: `verificationStatus` (`PENDING_REVIEW` | `VERIFIED` | `SUSPENDED`), `isPublished`, `ratingAvg`, `reviewCount`
- **โมดูลจองตรง (เฉพาะ `DIRECT_BOOKING`)**: `Room`, `RoomDateOverride`, `HotelDiscountRule`, `HotelAddon`, `Booking`

### 3.3 การ์ดโปรโมชั่น, คูปอง และ Social Engagement
- **`Pin`**: `isCanonicalCard`, `dealSourceType` (`INTERNAL` | `EXTERNAL`), `promoHeadlineTh`, `promoCode`, `promoOriginalPriceThb`, `promoDealPriceThb`, `promoExpiresAt`, `externalDealUrl`, `externalSourceName`, `mediaType`, `coverImageUrl`, `videoUrl`, `provinceId`, `isSponsored`, Atomic Counters (`likesCount`, `savesCount`, `commentsCount`, `sharesCount`, `viewsCount`, `externalClickCount`)
- **`Coupon`** (`promoKind`: `BOOKING_COUPON` | `ONSITE_PERK` | `EXTERNAL_LINK_DEAL`) & **`UserCouponWallet`**
- **`PinLike`**, **`PinComment`**, **`PinCommentLike`**, **`PinShare`**, **`HotelPost`** (`FEED_POST` | `BLOG`), **`GuestReview`**

### 3.4 Wishlist (`/wishlist`), แผนที่, โควต้า API และความปลอดภัย
- **`SavedBoard`** & **`SavedBoardPin`** — ข้อมูล Wishlist ของผู้ใช้ (Auto-Category + Custom Boards)
- **`ThailandPlace`** — แคชสถานที่สาธารณะจาก Open Data (OSM/Wikipedia)
- **`ApiQuotaUsage`**, **`RegionConfig`**, **`ProvinceConfig`**, **`PlaceReport`**, **`ContactClickLog`**, **`SocialConnection`**, **`SponsoredCampaign`**, **`VisitorTasteProfile`**, **`TelemetryEvent`**

---

## 4. ส่วนต่อขยาย Schema เป้าหมายสำหรับ v4.0 (Phases 4A → 5)

### 4.1 LocationScope & Multi-Branch (`Phase 4A`)
- เพิ่มใน `Hotel`:
  - `locationScope LocationScope @default(SINGLE_LOCATION)` (`SINGLE_LOCATION` | `MULTI_BRANCH` | `NATIONWIDE_ONLINE`)
  - `branchSummaryTh String @default("")` *(เช่น `"ทุกสาขาทั่วประเทศ"` หรือ `"เฉพาะสาขาเชียงใหม่และภูเก็ต"`)*
  - `eligibleProvinceIds String[] @default([])` *(ว่าง = ทั่วประเทศเมื่อเป็น `NATIONWIDE_ONLINE` หรือ `MULTI_BRANCH`)*
- เพิ่มใน `Pin`:
  - `promoStartsAt DateTime?` *(เพื่อแสดงช่วงวันที่ชัดเจน เช่น `23 ต.ค. - 26 ต.ค.`)*
  - `promoCategoryCode String?` *(เพื่อให้ 1 แบรนด์เช่น KTC มีหลาย Promo Card คนละหมวดบน `/` ได้)*
  - `visualMode PromoVisualMode @default(OFFICIAL_PHOTO)` (`OFFICIAL_PHOTO` | `BRANDED_CARD` | `CATEGORY_FALLBACK`)
  - `ingestionHash String? @unique` *(กันโปรซ้ำจากระบบ Automation)*
- ตาราง **`PlaceBranch`**: `id`, `hotelId`, `branchNameTh`, `provinceId`, `addressTh`, `latitude`, `longitude`, `googleMapsUrl`, `googlePlaceId`, `isActive` *(สำหรับแบรนด์เชนที่มี 2–50 สาขาและต้องการปักหมุดจริงบน `/explore`)*

### 4.2 Dynamic Categories, Attributes & `/admin` Control Plane (`Phase 4B` — จากต้นแบบ WeGlobal)
- **`PlaceCategoryConfig`** & **`HotelCategoryLink`**: หมวดหมู่ 3 ระดับ (`L1 หมวดโปรหลัก` → `L2 หมวดย่อย` → `L3 แท็ก/คอลเลกชัน`) เก็บสี Crest, ไอคอน, `schemaOrgType`, ลำดับ `position`, `isActive`, `isSystem` ปรับจาก `/admin/categories` ได้โดยไม่ต้อง deploy
- **`PlaceAttribute`**, **`PlaceAttributeValue`**, **`CategoryAttributeBinding`**, **`HotelAttributeValue`** *(พร้อม pivot index `@@index([valueId, hotelId])`)*
- **`SystemConfig`** (`settings_general`, `global_seo`, `home_appearance`, `affiliate_config`), **`AiPrompt`** (`promo_poster_extract`, `promo_email_extract`, `fb_sync_triage`), **`SearchSynonymGroup` / `Display` / `Synonym`**
- **`PlaceStats`**: ตาราง Pre-Aggregated สถิติ (`views24h`, `views7d`, `views30d`, `savesCount`, `promoClicks`, `affiliateClicks`, `popularityScore`) อัปเดตด้วย Cron เพื่อเลี้ยงหน้า Dashboard `/admin` และจัดอันดับได้เร็วมาก

### 4.3 Promotion Ingestion Pipeline (`Phase 4B–4C`)
- **`PromoInboxItem`**: `id`, `sourceType` (`AFFILIATE_API` | `EMAIL_WEBHOOK` | `FACEBOOK_SYNC` | `ADMIN_AI_DROP` | `MERCHANT_SUBMIT` | `COMMUNITY_TIP`), `sourceRefId`, `rawPayloadJson`, `rawImageUrl`, `extractedJson`, `matchedHotelId?`, `promoCategoryCode`, `titleTh`, `promoCode?`, `discountLabelTh`, `startsAt?`, `expiresAt?`, `externalUrl?`, `affiliateUrl?`, `visualMode`, `status` (`PENDING_REVIEW` | `APPROVED` | `REJECTED` | `EXPIRED`), `dedupeHash @unique`, `reviewedById?`, `publishedPinId?`, `createdAt`
- **`IngestionSourceLog`**: เก็บ Log การรัน Cron (Affiliate Sync, Email Parse, Auto-Expire, Link Health) เพื่อตรวจสอบความสมบูรณ์ใน `/admin/ingestion`

### 4.4 ระบบ Road-Trip แยกขาด (`Phase 5`)
- **`RoadTrip`**, **`RoadTripStop`**, **`RouteGeometryCache`** (รายละเอียดครบใน [06-traveller-trip-profile-and-road-routing.md](./06-traveller-trip-profile-and-road-routing.md))
