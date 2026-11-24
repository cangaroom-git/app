# 07 — แผนปฏิบัติการทีละ Phase (Phased Execution Roadmap)

> **สถานะ**: Active Roadmap (ทำทีละ Phase — ห้ามกระโดดข้าม Phase ก่อนยืนยันความเรียบร้อย)
> **กฎเหล็ก**: ทำงานเฉพาะใน `/Users/light/my-hotel` เท่านั้น **ห้ามแก้ไขไฟล์ใดๆ ใน `weglobal` โดยเด็ดขาด**

---

## ภาพรวมลำดับการทำงาน (Execution Phases)

### Phase 0 — Global Card Redesign (Modern Super-Rounded Square `1:1` + Travel Medallion Icons + Heart Wishlist)
- **เป้าหมาย**: ยกระดับการ์ดสถานที่ทั้งเว็บให้เป็นสี่เหลี่ยมโค้งมนสมัยใหม่ (`aspect-square`, `rounded-[22px] sm:rounded-[24px]`, ตัดรอยเว้าคูปองออก), ไอคอนประเภทแบบท่องเที่ยวบนเหรียญสีขาวลอยตัว + โทนสีสบายตา (`#5369A6`, `#D47E35`, `#C6566E`, `#529D48`, `#3A8D9A`), ปุ่มหัวใจ Wishlist มุมขวาบน และแคปชันโปร่งสบายพร้อมคะแนนดาวใต้ภาพ
- **ขอบเขตงาน**:
  1. ปรับ 5 สีโทนสบายตาใน `src/lib/placeCategories.ts` และออกแบบ 5 ไอคอนท่องเที่ยว Filled/Duotone ใน `src/components/shared/PlaceCategoryCrest.tsx` (ทั้งบนการ์ดและหมุดแผนที่)
  2. อัปเกรด `VerticalCouponCard`, `FannedPhotoCardDeck`, `TripStackedCardFolder`, `SeeAllCouponCard`, `PlaceCardFlipOverlay`, `TripCardFlipModal` และ Skeleton ให้เป็น `1:1` โค้งมนสมัยใหม่ทั้งหมด
- **สถานะ**: `Completed`

---

### Phase 0.5 — Global Travel-Blue Palette & Square Media Unification
- **เป้าหมาย**: ปรับโทนสีหลักทั้งระบบใน `globals.css` เป็น Travel-Blue ชวนออกเดินทาง (`#1e78d6` Light / `#4ca3f5` Dark) พร้อมบังคับใช้กรอบรูปภาพจัตุรัสโค้งมน (`aspect-square`, `rounded-[20px]`–`rounded-[24px]`) และปุ่ม CTA โทนฟ้าเดียวกันทุกหน้าหลัก โดยเฉพาะ `/{slug}`, `/posts`, `/book` และ `/studio`
- **สถานะ**: `Completed`

---

### Phase 1 — Unified `/register` + Adaptive `/studio` (วางรากฐานทุกประเภทธุรกิจ)
- **เป้าหมาย**: ยกเลิกภาพจำ "เว็บโรงแรมอย่างเดียว" ตั้งแต่หน้าสมัครจนถึงหลังบ้าน
- **ขอบเขตงาน**:
  1. สร้างหน้า `/register` รวมทุกธุรกิจ 5 ประเภท (`STAY`, `CAFE`, `RESTAURANT`, `ATTRACTION`, `WELLNESS`) ไว้ในหน้าเดียว (และให้ `/register-hotel` redirect มาที่ `/register`)
  2. เฉพาะตอนเลือก `STAY` ให้มีตัวเลือกโหมด: **`DIRECT_BOOKING` (เปิดระบบจองตรง 0% GP ฟรี)** หรือ **`PROFILE_ONLY` (ใช้เฉพาะหน้าโปรไฟล์ & ลิงก์เว็บจองเอง)** — ส่วนอีก 4 ประเภทตั้งเป็น `PROFILE_ONLY` อัตโนมัติ
  3. ปรับ [src/app/studio/layout.tsx](file:///Users/light/my-hotel/src/app/studio/layout.tsx) และหน้าย่อยของ `/studio` ให้แยกเป็น **2 โหมดตาม `merchantMode`**:
     - `PROFILE_ONLY`: เมนูสะอาด 3 แท็บ (`ภาพรวม & สถิติ` · `โพสต์ & โปรโมชั่น` · `ข้อมูลสถานที่ & พิกัด`) ไม่มีคำว่า "ที่พัก", "ปฏิทิน", "ห้องพัก" หรือ "ตรวจสลิป"
     - `DIRECT_BOOKING`: คงเมนู Airbnb Hosting (`วันนี้` · `ปฏิทิน` · `ที่พัก`) ครบชุด
  4. ตรวจสอบ `/{slug}` ([HotelStorefrontClient.tsx](file:///Users/light/my-hotel/src/components/hotel/HotelStorefrontClient.tsx) & [PlaceOnlyProfileBody.tsx](file:///Users/light/my-hotel/src/components/hotel/PlaceOnlyProfileBody.tsx)) ให้รองรับ Base Social Profile + Opt-in Direct Booking โดยไม่มีคำว่า "โรงแรม/ที่พัก" หลุดไปในธุรกิจประเภทอื่น
- **สถานะ**: `Completed`

---

### Phase 2 — Hybrid Owner Mode บน `/{slug}` (ฟีล Facebook / Instagram โดยไม่ทำโค้ดบวม)
- **เป้าหมาย**: ให้เจ้าของธุรกิจจัดการงานโซเชียลและแก้ข้อมูลโปรไฟล์ด่วนได้ทันทีจากหน้า `/{slug}` โดยไม่กระทบความเร็วของลูกค้าทั่วไป และไม่สร้างฟอร์มซ้ำกับ `/studio`
- **ขอบเขตงาน**:
  1. แสดง **Owner Top Action Bar** เฉพาะเมื่อ `sessionUser` เป็นเจ้าของสถานที่ (`แก้ไขโปรไฟล์` · `+ โพสต์ใหม่` · `เปิด Studio` พร้อมจุดแจ้งเตือน)
  2. สร้าง Lightweight Editor Modals แยกไฟล์ภายใต้ `src/components/owner/` และโหลดด้วย `next/dynamic({ ssr: false })` (ลูกค้าทั่วไปโหลด **0 KB**):
     - แก้ไขโปรไฟล์ด่วน (รูปปก, โลโก้, ชื่อ, คำโปรย, เวลาเปิด-ปิด, ช่องทางติดต่อ, ลิงก์ CTA)
     - สร้าง/แก้ไขโพสต์อัปเดต (`FEED_POST`) และปักหมุดโปรโมชั่นหน้าการ์ด (`featuredCouponId`)
  3. เพิ่ม **Edit Jump-Links** (ไอคอนดินสอเฉพาะเจ้าของ) ในส่วนที่ซับซ้อน (ห้องพัก, ปฏิทิน, ราคา Seasonal, คูปองทั้งหมด, นโยบาย) พาตรงไปหน้า `/studio/...` พร้อมปุ่มย้อนกลับ `/{slug}`
- **สถานะ**: `Completed`

---

### Phase 3A — แยกระบบ `Wishlist` (`/wishlist`) ออกจาก `/trip` + ย้ายเข้าเมนู `More`
- **เป้าหมาย**: แยกการเก็บการ์ดที่ถูกใจ (Wishlist) ออกจากทริปเดินทางจริงอย่างเด็ดขาด และไม่ให้ผู้ชมที่ยังไม่ล็อกอินกด Bottom Bar แล้วเจอหน้าว่าง
- **ขอบเขตงาน**:
  1. เปลี่ยนไอคอน Save/Pin บนการ์ดเป็น **หัวใจ (`♥` Wishlist)** และคำเรียกเป็น **`Wishlist`** (รวมถึงเปลี่ยนไอคอน `/trip` บน Navigation เป็นเข็มทิศ `Compass` และเปิดหน้า `/trip` ให้ชมทริปสาธารณะได้โดยไม่ต้องล็อกอิน)
  2. ย้ายโครงสร้าง Board เดิมจาก `/trip` มาอยู่ที่ `/wishlist` (เฉพาะคนล็อกอิน, `/board` redirect -> `/wishlist`) และย้ายทางเข้าไว้ในเมนู **`More` / โปรไฟล์** แทน Bottom Bar
  3. เพิ่มโหมด **Auto-Categorized Wishlist Tabs** (`ทั้งหมด · ที่พัก · คาเฟ่ · ร้านอาหาร · ที่เที่ยว · สปา`) สำหรับคนที่ไม่อยากสร้างบอร์ดเอง คู่กับโหมด Custom Boards เดิม
- **สถานะ**: `Completed`

---

### Phase 3B — สร้างระบบ Road-Trip Planner ใหม่บน `/trip` & `/trip/[tripId]` (Public First)
- **เป้าหมาย**: หน้าวางแผนและแชร์ทริปเดินทางจริงที่ใช้งานง่ายใน 2 คลิก ดูได้แม้ยังไม่ล็อกอิน และช่วยส่ง Traffic ให้ธุรกิจสมาชิก Nondii
- **ขอบเขตงาน**:
  1. ขยาย Schema ฐานข้อมูล: ตาราง `RoadTrip`, `RoadTripStop` (รองรับทั้ง Nondii Place & `ThailandPlace`) และ `RouteGeometryCache`
  2. `/trip`: แสดงแถบสร้างทริปด่วน (`ต้นทาง → ปลายทาง`) + ฟีด **Community Journeys** ที่คนอื่นสร้างไว้ (ดูได้ทันทีไม่ต้องล็อกอิน)
  3. `/trip/[tripId]`:
     - วาด **เส้นถนนขับรถจริง (OSRM ฟรี)** พร้อม **Animation เส้นลากจากต้นทางไปปลายทาง** + แสดงเวลาขับรถและระยะทางจริง
     - จุดแวะแนะนำระหว่างทาง **เด้ง (`spring bounce`) ขึ้นมาตามรายทาง** (คัดเด่น 6–8 จุดจาก **Nondii Canonical Places** + **`ThailandPlace` OSM ฟรี** ไม่ใช้ Google Reviews Enterprise SKU)
     - เจ้าของทริปเพิ่ม/สลับ/ลบจุดแวะ เปลี่ยนที่พักปลายทาง (ดึงจาก Nondii หรือ Wishlist ได้) และกด **"เรียงลำดับประหยัดเวลาอัตโนมัติ"** พร้อมปุ่ม **"เปิดนำทาง/รีวิวใน Google Maps ↗"**
     - รองรับการแชร์ลิงก์สาธารณะและกด **Clone ทริป**
- **สถานะ**: `Pending`

---

### Phase 4 — Supply Onboarding & Growth Polish (Claim Place + Provincial Density)
- **เป้าหมาย**: ลดแรงเสียดทานการสมัครของธุรกิจที่มี Facebook/Google Maps อยู่แล้วให้ใกล้ 0
- **ขอบเขตงาน**:
  1. วางลิงก์ Google Maps ใน `/register` แล้วดึงชื่อ, พิกัด, จังหวัด, `googlePlaceId` อัตโนมัติ + กันร้านซ้ำ < 80 ม.
  2. โฟลว์ **Claim Your Place** สำหรับสถานที่ตั้งต้นในจังหวัดนำร่อง
  3. Facebook Page Sync (AI 3-Tier Triage) ให้ใช้งานได้ทั้ง 5 ประเภทสถานที่
- **สถานะ**: `Pending`

---

## บันทึกการตัดสินใจสำคัญ (Decision Log)
- **2026-11-24**: ยืนยันโครงสร้าง `1 Base Social Profile + Opt-in Modules` (ทุกธุรกิจรวมถึงโรงแรมที่ไม่เปิดระบบจองใช้หน้าตาหลักเหมือนกันได้)
- **2026-11-24**: ยืนยันแนวทาง `Hybrid Owner Mode` บน `/{slug}` (Dynamic Modal สำหรับงานโซเชียลเบา + Jump-Link ไป `/studio` สำหรับงานหนัก)
- **2026-11-24**: ยืนยัน **แยกขาด `Wishlist` (`/wishlist` รูปหัวใจ, เฉพาะคนล็อกอิน, เก็บในเมนู `More`, มี Auto-Category + Boards) ออกจาก `Trip` (`/trip` & `/trip/[tripId]` ระบบเส้นทางขับรถจริง OSRM + Animation เส้นลาก + จุดแวะเด้งระหว่างทางจาก Nondii Places & OSM ฟรี + Public ดูได้ไม่ต้องล็อกอิน, ตัด Google Reviews Enterprise SKU ออก)**
