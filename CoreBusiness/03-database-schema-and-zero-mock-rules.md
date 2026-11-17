# 03 — สถาปัตยกรรมฐานข้อมูลจริง (Neon PostgreSQL) และกฎเหล็กห้ามใช้ Mock Data

## 1. กฎเหล็กด้านข้อมูล (Strict Real-Database Policy)

ที่ผ่านมาโปรเจกต์ซ่อนปัญหาหลายจุดไว้เบื้องหลังข้อมูลจำลองในฝั่ง Client (`src/data/rooms.ts`, `CURATED_THAILAND_PARTNER_PINS`, `localStorage` key `white_label_resort_store_v7` และการยัดข้อมูลทุกอย่างลง JSON ก้อนเดียวใน `site_cms_state`) ซึ่งทำให้เกิดปัญหาใหญ่ 3 ประการ:
1. เมื่อลูกค้าสองคนจองพร้อมกัน ข้อมูลจะเขียนทับกันเอง (Race Condition)
2. การบันทึกบอร์ด (`/board`) และการเก็บคูปอง (`/deal`) หายทันทีเมื่อเปลี่ยนอุปกรณ์ และโรงแรมไม่เห็นยอดคนสนใจจริง
3. เวลามีบั๊กใน API หรือฐานข้อมูล หน้าเว็บกลับแอบดึงค่า Mock มาแสดงแทน ทำให้เราไม่เห็นข้อผิดพลาดจริง

**ดังนั้น ตั้งแต่นี้เป็นต้นไป ห้ามทำสิ่งเหล่านี้โดยเด็ดขาด:**
- **ห้ามเก็บข้อมูลธุรกิจหลักไว้ใน `localStorage`**: อนุญาตให้ใช้ `localStorage` เฉพาะค่าตั้งค่าหน้าจอชั่วคราวที่ไม่ใช่ข้อมูลธุรกิจเท่านั้น ได้แก่ `theme` (`light`/`dark`) และ `lang` (`th`/`en`)
- **ห้ามมี Silent Fallback ไปหา Mock Array ในโค้ดหน้าบ้าน**: หากฐานข้อมูลไม่มีข้อมูล ต้องแสดงสถานะ Empty State จริง และหาก Query พลาดต้องแสดง Error ที่ชัดเจนเพื่อให้นักพัฒนาเห็นและซ่อมได้ทันที
- **ข้อมูลตัวอย่างเริ่มต้นต้องมาจาก `prisma/seed.ts` ลงฐานข้อมูลจริงเท่านั้น**: การใส่ข้อมูลตัวอย่างของที่พักไทยในระบบเพื่อทดสอบ ต้อง Seed ลงตาราง PostgreSQL จริง เพื่อให้ทุกปุ่มกดทำงานผ่าน SQL Query จริง 100%

---

## 2. มาตรฐานการเชื่อมต่อ Neon Lakebase Postgres & Prisma

ตามหลักปฏิบัติสากลของ Neon Postgres:
- **Runtime Application Queries (`DATABASE_URL`)**: ใช้สายเชื่อมต่อแบบ **Pooled Connection (`-pooler`)** ร่วมกับ `@prisma/adapter-pg` (`pg.Pool`) เพื่อรองรับ Serverless / Next.js App Router โดยไม่ทำให้ Connection เต็ม
- **Schema Migrations (`DIRECT_URL`)**: ใช้สายเชื่อมต่อตรง (ไม่มี `-pooler`) สำหรับรัน `prisma migrate` หรือ `prisma db push` เท่านั้น
- **ห้ามรัน `CREATE TABLE IF NOT EXISTS` แทรกใน Runtime API (`src/lib/db.ts` แบบเดิม)**: ทุกตารางต้องถูกประกาศและควบคุมเวอร์ชันผ่าน `prisma/schema.prisma` เท่านั้น
- **ป้องกัน Egress เกินจำเป็น**: ห้ามดึง `SELECT *` หรือโหลดตารางลูกทั้งหมดโดยไม่มี `take` / Cursor Pagination บนหน้า Feed รวม

---

## 3. โครงสร้างตารางฐานข้อมูลเชิงสัมพันธ์ (Multi-Tenant Relational Schema)

### 3.1 กลุ่มผู้ใช้งาน (`User`)
- `id` (`String @id @default(cuid())`)
- `email` (`String @unique`)
- `name` (`String?`)
- `phone` (`String?`) — เบอร์โทรเริ่มต้นสำหรับกรอกใบจองอัตโนมัติ
- `avatarUrl` (`String?`)
- `role` (`UserRole`: `TRAVELLER` | `HOTEL_OWNER` | `SUPER_ADMIN`, ค่าเริ่มต้น `TRAVELLER`)
- `createdAt`, `updatedAt`

### 3.2 กลุ่มที่พักและทรัพยากรการขาย (`Hotel`, `Room`, `RoomDateOverride`, `HotelAddon`)

#### ตาราง `Hotel` (แทนที่ `platform_tenants` เดิม โดยตัดวันหมดอายุ Trial ออก)
- `id`, `slug` (`String @unique` — ใช้เป็น URL `cangaroom.com/{hotelSlug}`)
- `ownerId` (`String` -> FK `User.id`, Indexed)
- `nameTh`, `nameEn`, `taglineTh`, `taglineEn`, `descriptionTh`, `descriptionEn`
- `logoUrl`, `coverImageUrl`
- `provinceId` (`String`, Indexed — รหัสจังหวัดมาตรฐาน 77 จังหวัด เช่น `"nan"`, `"chiang-mai"`, `"phuket"`)
- `districtTh`, `addressTh`, `latitude` (`Float?`), `longitude` (`Float?`), `googleMapsUrl`
- `stayStyles` (`String[]` — เช่น `["mountain", "bathtub"]` พร้อม GIN Index สำหรับกรองหน้าแรกอย่างรวดเร็ว)
- **ข้อมูลเชิงความหมายสำหรับค้นหาและ AI Agent (`Semantic Stay Attributes`)**:
  - `checkInTime` (`"14:00"`), `checkOutTime` (`"11:00"`)
  - `petsAllowed` (`Boolean @default(false)`), `petPolicyNote` (`String?`)
  - `highlightsJson` (`Json` — จุดเด่น สิ่งอำนวยความสะดวก และสถานที่เที่ยวใกล้เคียงสำหรับแสดงในแท็บแผนที่ของ `/{hotelSlug}`)
- **ช่องทางติดต่อและการรับเงินตรง 0% GP**:
  - `contactPhone`, `contactLine`, `facebookPageUrl`, `instagramUrl`
  - `promptPayId` (เบอร์โทรศัพท์หรือเลขประจำตัวผู้เสียภาษีสำหรับสร้าง QR รับเงินตรงเข้าที่พัก), `promptPayAccountName`, `bankName`, `bankAccountNo`
- **สถานะความน่าเชื่อถือ**:
  - `verificationStatus` (`VerificationStatus`: `PENDING_REVIEW` | `VERIFIED` | `SUSPENDED`)
  - `isPublished` (`Boolean @default(true)`)
  - `ratingAvg` (`Float @default(0)`), `reviewCount` (`Int @default(0)`)

#### ตาราง `Room` (ประเภทบ้านพัก/ห้องพักของแต่ละโรงแรม)
- `id`, `hotelId` (FK `Hotel.id`)
- `code` (`@@unique([hotelId, code])` — เช่น `"A1"` ซ้ำกันข้ามโรงแรมได้ แต่ห้ามซ้ำในโรงแรมเดียวกัน!)
- `slug` (`@@unique([hotelId, slug])`)
- `nameTh`, `nameEn`, `shortDescTh`, `shortDescEn`
- `totalUnits` (`Int @default(1)` — จำนวนยูนิตจริงของห้องประเภทนี้เพื่อคำนวณห้องว่างตามวัน)
- `weekdayPriceThb` (`Int`), `weekendPriceThb` (`Int`), `extraGuestPriceThb` (`Int @default(0)`)
- `sizeSqm` (`Int`), `standardGuests` (`Int @default(2)`), `maxGuests` (`Int @default(2)`)
- `bedrooms`, `beds`, `bathrooms`, `petsAllowed`
- `amenities` (`String[]`), `galleryUrls` (`String[]`)
- `isActive` (`Boolean @default(true)`), `sortOrder` (`Int @default(0)`)
- `@@index([hotelId, isActive, sortOrder])`

#### ตาราง `RoomDateOverride` (ปิดห้องด่วน / ปรับราคาวันหยุดนักขัตฤกษ์)
- `id`, `roomId` (FK `Room.id`), `date` (`DateTime @db.Date`)
- `blockedUnits` (`Int @default(0)` — สำหรับกรณีเจ้าของที่พักรับจองมาจาก Facebook/Walk-in แล้วกดล็อกห้องใน `/studio`)
- `overridePriceThb` (`Int?` — ราคาพิเศษเฉพาะวันนั้น)
- `note` (`String?`)
- `@@unique([roomId, date])`

#### ตาราง `HotelAddon` (บริการเสริมตอนจองห้อง เช่น ชุดหมูกระทะ เตียงเสริม รถรับส่ง)
- `id`, `hotelId` (FK `Hotel.id`)
- `nameTh`, `nameEn`, `priceThb` (`Int`), `unitLabelTh` (เช่น `"ชุด"`, `"ท่าน/คืน"`), `imageUrl`
- `isActive` (`Boolean @default(true)`), `sortOrder` (`Int @default(0)`)

---

### 3.3 กลุ่ม Visual Discovery & Saved Boards (`Pin`, `PinLike`, `PinComment`, `SavedBoard`, `SavedBoardPin`)

#### ตาราง `Pin` (หัวใจของหน้า `/` , `/board` และ `/{hotelSlug}`)
- `id`, `hotelId` (FK `Hotel.id`), `roomId` (FK `Room.id` Nullable — ผูกห้องเพื่อให้กดจองจาก Pin ได้ทันที), `couponId` (FK `Coupon.id` Nullable)
- `mediaType` (`PinMediaType`: `PHOTO` | `CAROUSEL` | `VIDEO`)
- `category` (`PinCategory`: `ROOMS` | `VIEWS` | `VIDEOS` | `DINING` | `REVIEWS`)
- `titleTh`, `titleEn`, `descriptionTh`, `descriptionEn`
- `coverImageUrl` (`String`), `mediaUrls` (`String[]`), `videoUrl` (`String?`), `aspectRatio` (`String @default("3/4")`)
- `provinceId` (`String`, Indexed), `stayStyles` (`String[]`)
- `semanticTags` (`String[]` — คำค้นเชิงความหมายที่สกัดจากรูปและแคปชันสำหรับระบบค้นหาและ AI Agent)
- **ข้อมูลแหล่งที่มา (รองรับ Facebook Auto-Sync)**:
  - `sourcePlatform` (`SocialPlatform`: `MANUAL` | `FACEBOOK` | `INSTAGRAM` | `TIKTOK`)
  - `externalPostId` (`String?`) — `@@unique([hotelId, sourcePlatform, externalPostId])` ป้องกันดึงโพสต์ซ้ำ
  - `publishStatus` (`PinPublishStatus`: `PUBLISHED` | `PENDING_APPROVAL` | `DISCARDED`)
  - `aiConfidenceScore` (`Int?`)
- **ตัวชี้วัดและโฆษณา (`Monetization & Ranking`)**:
  - `isSponsored` (`Boolean @default(false)`)
  - `sponsoredPriority` (`Int @default(0)`)
  - `likesCount` (`Int @default(0)`), `savesCount` (`Int @default(0)`), `commentsCount` (`Int @default(0)`), `sharesCount` (`Int @default(0)`), `viewsCount` (`Int @default(0)`)
- `@@index([publishStatus, provinceId])`
- `@@index([publishStatus, isSponsored, sponsoredPriority])`

#### ตาราง `HotelPost` (บทความ Blog / คู่มือท่องเที่ยว Native UGC สำหรับ SEO ของแต่ละโรงแรม)
- `id`, `hotelId` (FK `Hotel.id`), `authorId` (`String?`), `roomId` (FK `Room.id` Nullable — แนบการ์ดห้องพักให้กดจองต่อจากบทความ)
- `slug` (`String`), `titleTh`, `titleEn`, `excerptTh`, `contentTh` (`Text`)
- `coverImageUrl`, `galleryUrls` (`String[]`), `categoryTh`, `tags` (`String[]`)
- `status` (`PostPublishStatus`: `DRAFT` | `PUBLISHED` | `ARCHIVED`), `viewsCount`, `publishedAt`
- `@@unique([hotelId, slug])`, `@@index([hotelId, status, publishedAt])`

#### ตาราง `SavedBoard` และ `SavedBoardPin` (หน้า `/board` ติดตามราคาและโปรโมชั่น)
- `SavedBoard`: `id`, `userId` (FK `User.id`), `name`, `createdAt`, `updatedAt`
- `SavedBoardPin`:
  - `id`, `boardId` (FK `SavedBoard.id`), `pinId` (FK `Pin.id`), `userId` (FK `User.id`)
  - **`savedPriceSnapshotThb`** (`Int?` — บันทึกราคาเริ่มต้นของห้อง/ที่พัก ณ วันที่ผู้ใช้กด Pin เพื่อนำไปคำนวณป้ายแจ้งเตือนเมื่อที่พักลดราคาลง!)
  - `createdAt`
  - `@@unique([boardId, pinId])`

#### ตาราง Social Engagement มาตรฐานระดับ Facebook / Instagram (`PinLike`, `PinComment`, `PinCommentLike`, `PinShare`)
ใช้สถาปัตยกรรม **Source-of-Truth Event Tables + Atomic Counter Cache บน `Pin`** (เพื่อไม่ต้องรัน `COUNT(*)` ตอนโหลดหน้า Feed ขนาดใหญ่ แต่ตรวจสอบข้อมูลจริงและป้องกันการกดซ้ำได้ 100%):
- `PinLike`:
  - `userId` (FK `User.id`) + `pinId` (FK `Pin.id`) เป็น Composite Primary Key `@@id([userId, pinId])`
  - `createdAt` (`DateTime @default(now())`)
- `PinComment` (รองรับทั้งคอมเมนต์หลัก และการตอบกลับซ้อน 1 ชั้นแบบ Instagram / Facebook):
  - `id`, `pinId` (FK `Pin.id`), `userId` (FK `User.id`)
  - **`parentId`** (`String?` -> Self-FK `PinComment.id` สำหรับกด Reply ตอบกลับใต้คอมเมนต์ เช่น เจ้าของที่พักมาตอบคำถามลูกค้า)
  - `isHotelOwnerReply` (`Boolean @default(false)` — แสดงป้าย `เจ้าของที่พัก` อย่างชัดเจน)
  - `body` (`String`), `likesCount` (`Int @default(0)`)
  - `status` (`CommentStatus`: `VISIBLE` | `HIDDEN` | `DELETED`)
  - `createdAt`, `updatedAt`
  - `@@index([pinId, status, createdAt])`, `@@index([parentId])`
- `PinCommentLike` (กดหัวใจให้คอมเมนต์ที่มีประโยชน์):
  - `userId` (FK `User.id`) + `commentId` (FK `PinComment.id`) เป็น `@@id([userId, commentId])`
- `PinShare` (เก็บสถิติการแชร์ Pin ออกไปยังโซเชียลอื่นเพื่อวัดความไวรัล):
  - `id`, `pinId` (FK `Pin.id`), `userId` (`String?` Nullable — รองรับทั้งสมาชิกและผู้ชมทั่วไปกดแชร์)
  - `channel` (`ShareChannel`: `LINE` | `FACEBOOK` | `COPY_LINK` | `WEB_SHARE` | `OTHER`)
  - `createdAt` (`DateTime @default(now())`)
  - `@@index([pinId, createdAt])`

---

### 3.4 กลุ่มคูปองส่วนลดและกระเป๋าคูปอง (`Coupon`, `UserCouponWallet`)

#### ตาราง `Coupon` (แสดงในหน้า `/deal` และหน้า `/{hotelSlug}`)
- `id`, `hotelId` (FK `Hotel.id`)
- `code` (`@@unique([hotelId, code])` — โค้ดส่วนลดประจำโรงแรม)
- `titleTh`, `titleEn`, `descriptionTh`
- `discountType` (`DiscountType`: `PERCENT` | `FIXED_THB`)
- `discountValue` (`Int`), `minSpendThb` (`Int @default(0)`), `maxDiscountThb` (`Int?`)
- `totalQuota` (`Int?`), `claimedCount` (`Int @default(0)`), `usedCount` (`Int @default(0)`)
- `startsAt` (`DateTime`), `expiresAt` (`DateTime`)
- `isFeaturedDeal` (`Boolean @default(false)` — พื้นที่โฆษณาแถวบนสุดของหน้า `/deal`)
- `isActive` (`Boolean @default(true)`)

#### ตาราง `UserCouponWallet`
- `id`, `userId` (FK `User.id`), `couponId` (FK `Coupon.id`)
- `claimedAt` (`DateTime @default(now())`), `usedAt` (`DateTime?`), `usedBookingId` (`String?`)
- `@@unique([userId, couponId])`

---

### 3.5 กลุ่มการจองห้องพัก รีวิว และการโปรโมท (`Booking`, `GuestReview`, `SocialConnection`, `SponsoredCampaign`)

#### ตาราง `Booking`
- `id`, `bookingCode` (`String @unique` — เช่น `CGR-261117-4821`)
- `hotelId` (FK `Hotel.id`), `roomId` (FK `Room.id`), `userId` (FK `User.id` Nullable), `couponId` (FK `Coupon.id` Nullable)
- `checkInDate` (`DateTime @db.Date`), `checkOutDate` (`DateTime @db.Date`), `nights` (`Int`), `guests` (`Int`), `unitsBooked` (`Int @default(1)`)
- `roomSubtotalThb` (`Int`), `addonsTotalThb` (`Int`), `discountThb` (`Int`), `netTotalThb` (`Int`)
- `addonsJson` (`Json?` — รายการบริการเสริมที่เลือก ณ วันจอง)
- `guestName`, `guestPhone`, `guestEmail`, `guestLine`, `guestNote`
- `slipImageUrl` (`String?`), `slipQrPayload` (`String? @unique` — ป้องกันการนำสลิปโอนเงินใบเดิมมาอัปโหลดซ้ำ)
- `holdExpiresAt` (`DateTime?` — ล็อกคิวห้องพักชั่วคราว 15 นาทีระหว่างรอโอน)
- `status` (`BookingStatus`: `HOLD_PENDING_PAYMENT` | `PENDING_VERIFICATION` | `CONFIRMED` | `CANCELLED` | `COMPLETED`)
- `@@index([roomId, status, checkInDate, checkOutDate])`
- `@@index([userId, createdAt])`
- `@@index([hotelId, status, createdAt])`

#### ตาราง `GuestReview`
- `id`, `hotelId` (FK `Hotel.id`), `bookingId` (`String? @unique`), `userId` (`String?`)
- `authorName`, `rating` (`Int` 1–5), `comment`, `photoUrls` (`String[]`), `isVerifiedStay` (`Boolean @default(false)`), `createdAt`

#### ตาราง `SocialConnection` (เชื่อมต่อ Facebook Page ในเฟสแรก)
- `id`, `hotelId` (FK `Hotel.id`), `platform` (`FACEBOOK` | `INSTAGRAM` | `TIKTOK`)
- `externalPageId`, `externalPageName`, `accessTokenEncrypted` (`String?`)
- `publishMode` (`ONE_CLICK_APPROVE` | `AUTO_HIGH_CONFIDENCE`, ค่าเริ่มต้น `ONE_CLICK_APPROVE`)
- `excludedHashtags` (`String[]`), `lastSyncedAt` (`DateTime?`)
- `@@unique([hotelId, platform, externalPageId])`

#### ตาราง `SponsoredCampaign` (ระบบโฆษณาของแพลตฟอร์ม)
- `id`, `hotelId` (FK `Hotel.id`), `pinId` (FK `Pin.id` Nullable), `couponId` (FK `Coupon.id` Nullable)
- `placement` (`HOME_FEED` | `DEAL_FEATURED` | `AGENT_PRIORITY`)
- `dailyBudgetThb` (`Int`), `impressions` (`Int @default(0)`), `clicks` (`Int @default(0)`), `bookingsAttributed` (`Int @default(0)`)
- `startsAt`, `endsAt`, `status` (`ACTIVE` | `PAUSED` | `ENDED`)

#### ตาราง `ContactClickLog` (เก็บสถิติการส่งต่อลูกค้าทัก LINE / Messenger / โทรหาโรงแรม)
- `id`, `hotelId` (FK `Hotel.id`), `roomId` (`String?`), `userId` (`String?`)
- `channel` (`ContactChannel`: `LINE` | `FACEBOOK_MESSENGER` | `PHONE`)
- `createdAt` (`DateTime @default(now())`)
- `@@index([hotelId, channel, createdAt])`
- ใช้แสดงตัวเลข ROI ในหน้า `/studio` ให้เจ้าของที่พักเห็นชัดเจนว่า Cangaroom ช่วยส่งลูกค้าทักแชทไปกี่ครั้ง โดยไม่ต้องแบกภาระสร้างระบบ Live Chat บน WebApp ในเฟสแรก

