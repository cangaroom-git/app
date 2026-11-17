# 05 — แผนปฏิบัติการผ่าตัดระบบครั้งใหญ่ เคลียร์โค้ดเก่า และผูกฐานข้อมูลจริง (System Surgery Master Plan)

เป้าหมายของการผ่าตัดระบบครั้งนี้มี 2 ข้อที่ชัดเจน:
1. **Optimize & Declutter Codebase**: ลบหน้าเว็บ คอมโพเนนต์ และสโตร์เก่าที่ไม่ได้ใช้งานหรือขัดแย้งกับโมเดลธุรกิจใหม่ออกทั้งหมด (~4,800+ บรรทัด) เพื่อให้โค้ดสะอาด เบา บิลด์ไว และไม่มีโค้ดขยะมาสร้างความสับสน
2. **100% Real Database Binding**: เปลี่ยนข้อมูลทุกหน้าบนเว็บไซต์ให้ดึงและบันทึกผ่านฐานข้อมูล **Neon PostgreSQL (Prisma 7.10 + `@prisma/adapter-pg`)** จริงทั้งหมด เพื่อเปิดเผยจุดบกพร่อง (Bugs / Edge Cases) ที่เคยถูกซ่อนไว้หลัง `localStorage` และ Mock Data ให้เห็นและแก้ไขได้อย่างเด็ดขาด

---

## Phase 1: ล้างบางไฟล์ขยะ หน้าเว็บเก่า และระบบ JSON ก้อนเดียว

### 1.1 ลบหน้า Route ที่เลิกใช้งานหรือผิดโมเดลธุรกิจ (`6 Routes`)
- ลบ `src/app/booking/page.tsx` (Redirect เก่าไป `/sapanunseen`)
- ลบ `src/app/room/page.tsx` (Redirect เก่าซ้ำซ้อน)
- ลบ `src/app/shorts/page.tsx` (Redirect เก่าไป `/board`)
- ลบ `src/app/guide/page.tsx` (หน้าแผนที่ของโรงแรมเดียวบน Global URL — ย้ายเข้าเป็นแท็บใน `/{hotelSlug}`)
- ลบ `src/app/review/page.tsx` (หน้ารีวิวของโรงแรมเดียวบน Global URL — ย้ายเข้าเป็นแท็บใน `/{hotelSlug}`)
- ลบ `src/app/chat/page.tsx` (หน้าแชท AI ของโรงแรมสะปันอันซีนแห่งเดียวบน Global Sidebar — แทนที่ด้วยปุ่มส่งต่อ LINE OA / Messenger แบบเก็บสถิติคลิกในหน้าโปรไฟล์โรงแรม)

### 1.2 ลบคอมโพเนนต์ที่ตายแล้ว (`0 Imports`) และระบบ Inline CMS แบบเก่า (`16 Files`)
- ลบ `src/components/home/ResortHeroHeader.tsx`, `RoomFeedCard.tsx`, `ShortVideoCard.tsx`, `ThailandDiscoverySidebar.tsx`
- ลบ `src/components/drawers/ShortVideoDrawer.tsx`, `RoomGalleryDrawer.tsx`
- ลบ `src/components/chat/AiConciergeChat.tsx`, `AnimatedAiBotAvatar.tsx`
- ลบชุดแก้ไขหน้าเว็บสดแบบ JSON ก้อนเดียว (`src/components/cms/AdminEditOverlay.tsx`, `CmsEditorDrawer.tsx`, `CmsFormPrimitives.tsx`, `CmsIconRegistry.tsx`, `src/components/cms/editors/*`, และ `src/app/api/cms/route.ts`)
- ย้าย `PureMediaViewer.tsx` และ `UniversalVideoPlayer.tsx` ไปไว้ใน `src/components/media/`

### 1.3 เคลียร์ไฟล์จำลองและเอกสารยุคเก่าที่สร้างความสับสน
- ลบ `src/data/cmsDefaults.ts`, `src/data/shortsData.ts`, โฟลเดอร์ `plan/` (SaaS 12,000฿/ปี), ไฟล์ `booking-flow.md`, และโฟลเดอร์ `.data/`

---

## Phase 2: วางโครงสร้างฐานข้อมูลจริงบน Neon PostgreSQL (Prisma 7.10) & Seed ข้อมูลจริง

1. **ตั้งค่า Prisma 7.10 + Neon Pooled Adapter**:
   - สร้าง `prisma.config.ts` ชี้ `datasource.url` ไปที่ `DIRECT_URL` สำหรับ CLI Migrations
   - สร้าง `src/lib/prisma.ts` เชื่อมต่อผ่าน `PrismaPg` (`DATABASE_URL` แบบ Pooled)
   - แทนที่ `src/lib/db.ts` เดิม (ตัด `CREATE TABLE IF NOT EXISTS` และตัดวันหมดอายุ Trial 30 วันออกทั้งหมด)
2. **อัปเกรด `prisma/schema.prisma` ครบ 17 ตารางมาตรฐานสากล**:
   - `User`, `Hotel`, `Room` (`@@unique([hotelId, code])`), `RoomDateOverride`, `HotelAddon`
   - `Pin`, `PinLike` (`@@id([userId, pinId])`), `PinComment` (รองรับ `parentId` Reply ซ้อน + `isHotelOwnerReply`), `PinCommentLike`, `PinShare`
   - `SavedBoard`, `SavedBoardPin` (เก็บ `savedPriceSnapshotThb` เช็กราคาลง)
   - `Coupon`, `UserCouponWallet`
   - `Booking` (ล็อกคิว 15 นาที + `slipQrPayload @unique` กันสลิปซ้ำ), `GuestReview`, `ContactClickLog` (นับคลิกทัก LINE / Messenger / โทร), `SocialConnection`, `SponsoredCampaign`
3. **Seed ข้อมูลที่พักจริงหลากหลายสไตล์ลง Neon PostgreSQL (`prisma/seed.ts`)**:
   - Seed ที่พักตัวอย่าง 6 แห่งครบ 6 สไตล์หลักของไทยลงตารางจริง แล้วลบ `CURATED_THAILAND_PARTNER_PINS` และลบ `src/lib/store.ts` (`localStorage` store) ทิ้งทั้งหมด (แยกเฉพาะสูตรคำนวณวันและตัวอ่าน QR สลิปไปไว้ใน `src/lib/bookingMath.ts` และ `src/lib/slipScanner.ts`)

---

## Phase 3: สร้าง Clean Backend Services, REST APIs และรากฐาน AI Agent มาตรฐานสากล

1. **Service Layer (`src/lib/services/*`)**:
   - `stayDiscoveryService.ts`, `pinEngagementService.ts` (Atomic Counter Transactions), `hotelStorefrontService.ts`, `bookingCheckoutService.ts`, และ `facebookSyncService.ts` (AI 3-Tier Smart Triage + Cloudinary CDN upload)
2. **REST APIs ครบทั้ง 3 บทบาท**:
   - Traveller & Public: `/api/auth/me`, `/api/pins`, `/api/pins/[pinId]/like|share|comments`, `/api/boards`, `/api/deals`, `/api/wallet/coupons`, `/api/hotels/[hotelSlug]`, `/api/hotels/[hotelSlug]/contact-click`, `/api/bookings`
   - Hotel Owner (`/api/studio/*`): `onboarding` (ฟรี 0% GP ตลอดชีพ), `hotel`, `rooms`, `addons`, `coupons`, `date-overrides`, `bookings`, `pins`, `facebook-sync`
   - Super Admin (`/api/super-admin/*`): `hotels` (`VERIFIED` / `SUSPENDED`), `campaigns` (`Sponsored`), `users`
3. **Agentic Web Foundation Endpoints**:
   - `GET /.well-known/agent-card.json`, `GET /llms.txt`, และ `POST /api/mcp` (`search_thailand_stays`, `get_hotel_details`, `list_active_coupons`, `create_direct_booking_link`)

---

## Phase 4: ผ่าตัด App Shell & ผูกหน้าเว็บหลักทั้ง 8 หน้าเข้ากับฐานข้อมูลจริง 100%

1. **ลดรูป `HotelAppShell.tsx` และอัปเดต `PrimaryNavigation.tsx`**:
   - แถบเมนูซ้าย `72px` เหลือเฉพาะปุ่มระดับแพลตฟอร์ม (`Home`, `Board`, `Deal` ไอคอน `TicketPercent`, ปุ่ม `/studio` หรือ `/register-hotel`, และโปรไฟล์ `/trips`)
2. **ผูกหน้าเว็บหลักทั้ง 8 หน้าเข้ากับข้อมูลจาก PostgreSQL จริง**:
   - `/` (Home Masonry Feed + Pin Detail กด Like / Threaded Comment / Share / Save จริง)
   - `/board` (Saved Boards + ป้ายแจ้งเตือนราคาลง/คูปองใหม่จริง)
   - `/deal` (Multi-Hotel Coupon Hub — ตัดหมูกระทะออกจากหน้านี้)
   - `/{hotelSlug}` (Hotel Direct Profile + JSON-LD + คูปองประจำร้าน + ปุ่มทัก LINE/Messenger เก็บสถิติคลิก + รีวิว + แผนที่ + ระบบจองตรงแนบสลิป)
   - `/trips` (ประวัติใบจองทุกโรงแรม + กระเป๋าคูปองจริง โดยให้ `/setting` redirect มาที่นี่)
   - `/register-hotel` (เปิดเพจที่พักฟรี 0% GP ตลอดชีพ)
   - `/studio` (หลังบ้านเจ้าของที่พัก + ยอดคนเซฟบอร์ด/ยอดคลิกแชท + โมดูลซิงก์เพจ Facebook โดยให้ `/admin` redirect มาที่นี่)
   - `/super-admin` (ยืนยันที่พักจริง `VERIFIED` + จัดการแคมเปญโฆษณา `Sponsored`)

---

## Phase 5: ตรวจสอบความถูกต้องและไล่จับข้อผิดพลาดจากฐานข้อมูลจริง (End-to-End Verification)

1. ทดสอบ Query และการบันทึกข้อมูลจริงครบทั้ง 3 บทบาทบนฐานข้อมูล Neon PostgreSQL
2. สแกนตรวจกฎเหล็ก UI ว่า **ไม่มี `hover:scale-*` หรือขยายขนาดเมื่อชี้เมาส์แม้แต่จุดเดียว**
3. รัน `npx tsc --noEmit` และ `npm run build` ผ่านสำเร็จ 100% ไร้ไฟล์ขยะหรือ Broken Imports
