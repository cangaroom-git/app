# 03 — โครงสร้างฐานข้อมูลจริง (Neon PostgreSQL) และกฎเหล็กห้ามใช้ Mock Data

## 1. กฎเหล็กด้านข้อมูล (Strict Real-Database Policy)

1. **ห้ามเก็บข้อมูลธุรกิจหลักไว้ใน `localStorage`**: อนุญาตให้ใช้ `localStorage` เฉพาะค่าตั้งค่าหน้าจอชั่วคราวที่ไม่ใช่ข้อมูลธุรกิจเท่านั้น ได้แก่ `theme` (`light`/`dark`) และ `lang` (`th`/`en`)
2. **ห้ามมี Silent Fallback ไปหา Mock Array**: หากฐานข้อมูลไม่มีข้อมูล ต้องแสดง Empty State จริง และหาก Query ผิดพลาดต้องรายงาน Error ชัดเจน
3. **ข้อมูลเริ่มต้นต้อง Seed ลงฐานข้อมูลจริงเท่านั้น (`prisma/seed.ts`)**

---

## 2. มาตรฐานการเชื่อมต่อ Neon Lakebase Postgres & Prisma 7

- **Runtime Queries (`DATABASE_URL`)**: ใช้ **Pooled Connection (`-pooler`)** ผ่าน `@prisma/adapter-pg` (`pg.Pool`) ใน `src/lib/prisma.ts`
- **Schema Migrations (`DIRECT_URL`)**: ใช้ Direct Connection ใน `prisma.config.ts` สำหรับ `prisma migrate` / `prisma db push`
- **Schema Control**: ประกาศและแก้ไขทุกตารางผ่าน `prisma/schema.prisma` เท่านั้น ห้ามรัน `CREATE TABLE IF NOT EXISTS` ใน Runtime API
- **Egress Control**: ใช้ `select` เฉพาะฟิลด์ที่จำเป็นและกำหนด `take` / Pagination เสมอ ห้ามดึง `SELECT *` แบบไร้ขอบเขตบนหน้า Feed

---

## 3. โครงสร้างตารางปัจจุบันใน `prisma/schema.prisma` (Active Schema)

### 3.1 ผู้ใช้งาน & สิทธิ์ (`User`)
- `User`: `id`, `email @unique`, `name`, `phone`, `avatarUrl`, `role` (`TRAVELLER` | `HOTEL_OWNER` | `SUPER_ADMIN`)

### 3.2 สถานที่และธุรกิจกลาง (`Hotel` = Unified Place Entity)
- **`Hotel`**: รองรับทั้ง 5 ประเภทสถานที่และ 2 โหมดธุรกิจในตารางเดียว:
  - อัตลักษณ์ & URL: `slug @unique`, `ownerId`, `nameTh`, `nameEn`, `taglineTh`, `descriptionTh`, `logoUrl`, `coverImageUrl`
  - ประเภท & โหมด: `placeCategory` (`STAY` | `CAFE` | `RESTAURANT` | `ATTRACTION` | `WELLNESS`), `merchantMode` (`DIRECT_BOOKING` | `PROFILE_ONLY`), `propertyType` (`BOUTIQUE_HOTEL` | `RESORT` | `POOL_VILLA` | `GLAMPING_HOMESTAY`)
  - พิกัด & การ์ดหลัก: `provinceId`, `districtTh`, `addressTh`, `latitude`, `longitude`, `googleMapsUrl`, `googlePlaceId`, `canonicalPinId`, `featuredCouponId`
  - ข้อมูลหน้าโปรไฟล์: `openingHoursJson`, `externalWebsiteUrl`, `primaryCtaLabelTh`, `highlightsJson`, `nearbySpotsJson`, `faqJson`, `stayStyles`, `contactPhone`, `contactLine`, `facebookPageUrl`, `instagramUrl`
  - ข้อมูลเฉพาะโหมด `DIRECT_BOOKING`: `checkInTime`, `checkOutTime`, `petsAllowed`, `petPolicyTh`, `seasonalRulesJson`, `promptPayId`, `promptPayAccountName`, `bankName`, `bankAccountNo`
  - สถานะ: `verificationStatus` (`PENDING_REVIEW` | `VERIFIED` | `SUSPENDED`), `isPublished`, `ratingAvg`, `reviewCount`
- **โมดูลจองตรง (เฉพาะ `DIRECT_BOOKING`)**:
  - `Room` (`@@unique([hotelId, code])`, `galleryMetaJson`, `totalUnits`, `weekdayPriceThb`, `weekendPriceThb`)
  - `RoomDateOverride` (`@@unique([roomId, date])`, `blockedUnits`, `overridePriceThb`, `minNights`)
  - `HotelDiscountRule` (`LENGTH_OF_STAY` | `EARLY_BIRD` | `LAST_MINUTE`)
  - `HotelAddon` (บริการเสริม)
  - `Booking` (`bookingCode @unique`, `slipQrPayload @unique`, `holdExpiresAt`, `status`)

### 3.3 การ์ดสะสม, คอนเทนต์ และ Social Engagement
- **`Pin`**: `isCanonicalCard` (`true` = การ์ดหลัก 1 ใบต่อ 1 สถานที่), `dealSourceType` (`INTERNAL` | `EXTERNAL`), `promoHeadlineTh`, `mediaType`, `coverImageUrl`, `videoUrl`, `provinceId`, `isSponsored`, Atomic Counters (`likesCount`, `savesCount`, `commentsCount`, `sharesCount`, `viewsCount`)
- **`PinLike`**, **`PinComment`** (รองรับ `parentId` ซ้อน 1 ชั้น + `isHotelOwnerReply`), **`PinCommentLike`**, **`PinShare`**
- **`HotelPost`**: รองรับ `postKind` (`FEED_POST` โพสต์อัปเดตสั้น | `BLOG` บทความ SEO) พร้อม `slug`, `sourcePlatform`, `status`
- **`GuestReview`**: รีวิวผู้เข้าพัก/ผู้มาเยือนพร้อม `ownerReplyTh` และ `isVerifiedStay`
- **`Coupon`** (`promoKind`: `BOOKING_COUPON` | `ONSITE_PERK` | `EXTERNAL_LINK_DEAL`) & **`UserCouponWallet`**

### 3.4 Wishlist ของนักเดินทาง (`/wishlist` — ใช้ตาราง `SavedBoard` เดิม)
- **`SavedBoard`**: `id`, `userId`, `name`, `shareSlug @unique`, `isPublic` *(รองรับ Custom Boards และดึงรวมทุก Saved Items เพื่อ Auto-จัดหมวดตาม `Hotel.placeCategory`)*
- **`SavedBoardPin`**: `boardId`, `pinId`, `userId`, `sortOrder`, `savedPriceSnapshotThb`

### 3.5 แผนที่, โควต้า API, การตลาด & ความปลอดภัยแพลตฟอร์ม
- **`ThailandPlace`**: แคชสถานที่สาธารณะในไทยจาก Open Data (`osm` / `wikipedia` / `overture`) พร้อม `category`, `lat`, `lng`, `popularityScore`
- **`ApiQuotaUsage`**: คุมโควต้ารายวัน/รายเดือนของ Google Places / Routes SKU
- **`RegionConfig`** & **`ProvinceConfig`**: ข้อมูลภูมิภาคและ 77 จังหวัดพร้อม Bounding Box สำหรับ `/explore`
- **`PlaceReport`**: คิวรายงานร้านซ้ำ/ปิดกิจการ/มิจฉาชีพเข้า `/super-admin`
- **`ContactClickLog`**, **`SocialConnection`**, **`SponsoredCampaign`**, **`VisitorTasteProfile`**, **`TelemetryEvent`**

---

## 4. ส่วนต่อขยาย Schema เป้าหมายสำหรับระบบ Road-Trip แยกขาด (`/trip` & `/trip/[tripId]` — Phase 3B)

*(วางแผนไว้สำหรับ Phase 3B — แยกตารางออกจาก `SavedBoard` Wishlist อย่างชัดเจน)*
- **`RoadTrip`**: `id`, `slug @unique`, `userId`, `titleTh`, `descriptionTh`, `coverImageUrl`, `provinceId`, `originName`, `originLat`, `originLng`, `destName`, `destLat`, `destLng`, `destinationHotelId?`, `routePolyline`, `totalDistanceKm`, `totalDriveMins`, `isPublic @default(true)`, `clonedFromTripId?`, `cloneCount @default(0)`
- **`RoadTripStop`**: `id`, `tripId`, `sortOrder`, `stopSource` (`NONDII_PLACE` | `THAILAND_PLACE` | `CUSTOM`), `hotelId?`, `thailandPlaceId?`, `nameTh`, `category`, `lat`, `lng`, `coverImageUrl?`, `driveMinsFromPrev`, `driveKmFromPrev`, `noteTh`
- **`RouteGeometryCache`**: `routeKey @unique`, `polyline`, `distanceKm`, `durationMins`, `expiresAt` *(เก็บผลลัพธ์เส้นทางขับรถจริงจาก OSRM เพื่อโหลดทันทีและไม่ยิงซ้ำ)*
