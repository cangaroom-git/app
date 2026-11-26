# 07 — แผนปฏิบัติการทีละ Phase (Phased Execution Roadmap v4.0)

> **สถานะ**: Active Roadmap v4.0 (ทำทีละ Phase — ห้ามกระโดดข้าม Phase ก่อนยืนยันความเรียบร้อย)
> **กฎเหล็ก**: ทำงานเฉพาะใน `/Users/light/my-hotel` เท่านั้น **ห้ามแก้ไขไฟล์ใดๆ ใน `/Users/light/my-shop` (WeGlobal) โดยเด็ดขาด** (ใช้ศึกษาแบบ Read-Only เท่านั้น)

---

## งานที่ทำเสร็จแล้ว (`Completed`)

- **Phase 0 — Global Card Redesign (`Completed`):** อัปเกรดการ์ดทั้งเว็บเป็น `1:1` Super-Rounded (`rounded-[22px]–[24px]`), 5 Travel Medallion Icons สีสบายตา และปุ่มหัวใจ Wishlist
- **Phase 0.5 — Global Travel-Blue Palette & Square Media (`Completed`):** ปรับโทนสีทั้งระบบเป็น Travel-Blue (`#1e78d6` Light / `#4ca3f5` Dark) + Full-Round Pill Buttons + Square Media
- **Phase 1 — Unified `/register` + Adaptive `/studio` (`Completed`):** หน้าสมัครรวมทุกประเภทธุรกิจ + `/studio` ปรับเมนูตาม `merchantMode` + Modular `/{slug}`
- **Phase 2 — Hybrid Owner Mode บน `/{slug}` (`Completed`):** Owner Top Bar + Lazy Editor Modals (`0 KB` สำหรับลูกค้าทั่วไป) + Edit Jump-Links ไป `/studio`
- **Phase 3A — แยก `/wishlist` ออกจาก `/trip` (`Completed`):** ปุ่มหัวใจ Wishlist + Auto-Categorized Wishlist ในเมนู `More` + `/trip` เปิดชมสาธารณะ
- **Phase 3.5 — Home 4-Layer Collectible Hero & `/trip` Mobile 120fps Fix (`Completed`):** สร้าง Hero 4 เลเยอร์ (`โปรเที่ยวไทย`) ชิดขอบบน Mobile/Tablet + ย่อ WebP และอัปเกรด `/trip` เป็น GPU Compositor Scroll-Driven Animation

---

## แผนปฏิบัติการ v4.0 (Active Next Phases)

### Phase 4A — ย้าย `/super-admin` → `/admin` + ปรับหน้า `/` เป็น "ศูนย์รวมโปรเที่ยวไทย" + รองรับ `LocationScope`
- **เป้าหมาย**: วางรากฐาน URL `/admin` และปรับหน้าแรก/ฐานข้อมูลให้รองรับโปรโมชั่นครบทุกประเภท (ทั้งร้านเดี่ยว, เชนหลายสาขา และบัตรเครดิต/ออนไลน์)
- **ขอบเขตงาน**:
  1. **Switch `/super-admin` → `/admin` (`Completed` ในรอบนี้):** ย้าย Console หลักมาที่ `/admin`, ให้ `/super-admin` redirect → `/admin`, อัปเดต Navigation & Role Destination ทั้งระบบ
  2. **Schema `LocationScope` + `PlaceBranch` + Promo Dates:** เพิ่ม `locationScope` (`SINGLE_LOCATION` | `MULTI_BRANCH` | `NATIONWIDE_ONLINE`), `branchSummaryTh`, `eligibleProvinceIds`, `PlaceBranch`, `promoStartsAt`, `promoCategoryCode`, `visualMode`, `ingestionHash` ใน `prisma/schema.prisma`
  3. **Home `/` Promotion Category Tabs:** เปลี่ยนแท็บสไตล์ที่พักบน `/` เป็น **หมวดโปรโมชั่น** (เริ่มต้น: `ทั้งหมด · ที่พัก · คาเฟ่ · ร้านอาหาร & บาร์`) + ตัวกรองจังหวัด (รวม `"ทั่วประเทศ/ออนไลน์"`) + แสดงช่วงวันที่/วันหมดอายุชัดเจนใต้การ์ด `1:1`
  4. **Modular `/{slug}` ตาม `LocationScope`:** ซ่อนแผนที่สำหรับ `NATIONWIDE_ONLINE`, แสดงปุ่ม `"ค้นหาสาขาใกล้ฉันบน Google Maps ↗"` + รายชื่อสาขาสำหรับ `MULTI_BRANCH`, และคง 1-pin Map + Direct Booking สำหรับ `SINGLE_LOCATION`
- **สถานะ**: `Completed`

---

### Phase 4B — ระบบหลังบ้าน `/admin` สถาปัตยกรรม WeGlobal + Promo Inbox + AI Quick Promo Drop + Branded Card
- **เป้าหมาย**: ยกระดับ `/admin` จากหน้า 4 แท็บเดิมให้เป็น **Admin Control Center เต็มรูปแบบ** ตามต้นแบบสถาปัตยกรรม WeGlobal (`my-shop`) ภายใต้ดีไซน์ Nondii Warm Minimal พร้อมเครื่องมือลงโปรและควบคุมความสดใหม่ของโปรโมชั่น
- **ขอบเขตงาน** *(รายละเอียดครบใน [08-admin-control-plane-and-promo-automation.md](./08-admin-control-plane-and-promo-automation.md))*:
  1. **Admin App Shell:** `src/app/admin/layout.tsx` (Server RBAC Guard) + `AdminSidebar` (Hover-Expand Icon Rail + Live Pending Badge) + `.admin-page > .admin-toolbar + .admin-body`
  2. **Overview Dashboard (`/admin`):** 4 KPI Cards + **Thailand Province Reach / Density Map** + Pre-Aggregated `Promo/Place Stats Table`
  3. **Dynamic Categories (`/admin/categories`) & Attributes (`/admin/attributes`):** DB-backed `PlaceCategoryConfig` (Miller Columns + `@dnd-kit` + Safe Move Modal) ให้เปิด-ปิดหมวดโปรได้ทันทีโดยไม่ต้อง deploy
  4. **Promo Hub (`/admin/promos`):**
     - **AI Quick Promo Drop:** โยนรูปโปสเตอร์โปรหรือวางข้อความ/ลิงก์ → Gemini Vision แกะลงฟอร์มพร้อมจับคู่ร้านเดิมใน 5 วินาที
     - **Promo Inbox:** กล่องพักรออนุมัติ (1-Click Approve / Edit / Reject + Dedupe Hash)
     - **Auto-Expire Cron (`/api/cron/expire-promos`):** ปิด/ติดป้าย `หมดอายุ` อัตโนมัติทุกเที่ยงคืน
  5. **Dynamic Branded Promo Card (`next/og` / `satori`):** สร้างภาพการ์ด `1:1` สไตล์ Nondii อัตโนมัติสำหรับโปรที่ดึงได้เฉพาะข้อมูล Text/โค้ด (เช่น โปรบัตรเครดิต/โค้ดลดเว็บจอง)
  6. **Systems Hub (`/admin/systems`):** Tabbed settings (`General` · `SEO` · `AI Prompts` · `Users & RBAC`) + ย้าย Locations Manager มาที่ `/admin/locations`
- **สถานะ**: `Completed`

---

### Phase 4C — Automation Ingestion Connectors & Supply Scaling
- **เป้าหมาย**: เปิดท่อไหลเข้าของโปรโมชั่นแบบอัตโนมัติจริงและสร้างรายได้ Affiliate ตั้งแต่วันแรก
- **ขอบเขตงาน**:
  1. **Affiliate API Connectors (`/admin/ingestion`):** เชื่อม **Agoda Partner API** (ดึงโปร+รูป Official+ราคาขีดฆ่า+Affiliate Link อัตโนมัติ) และ **Involve Asia / ACCESSTRADE Feed**
  2. **Inbound Email Webhook (`deals@nondii.com`):** รับ Newsletter โรงแรม/บัตรเครดิต (KTC, SCB, KBank, Krungsri) → Gemini แกะโครงสร้างเข้า Promo Inbox อัตโนมัติ
  3. **Merchant Self-Serve & Facebook Sync:** ปุ่มลงโปรด่วนด้วยรูปโปสเตอร์สำหรับเจ้าของคาเฟ่/บาร์ + Facebook Page Sync (AI 3-Tier) + โฟลว์ Google Maps Auto-Fill & **Claim Your Place**
  4. **Performance Hardening (WeGlobal 12 Laws):** Fix Prisma singleton pool (`src/lib/prisma.ts`), เพิ่ม `vercel.json` (`sin1`), `React.cache` + `unstable_cache` + `revalidateTag` และปิด Card Prefetch Storm
- **สถานะ**: `Pending`

---

### Phase 5 — Real Road-Trip Planner บน `/trip` & `/trip/[tripId]` (Public First)
- **เป้าหมาย**: ยกระดับ `/trip` เป็นระบบวางแผนทริปขับรถจริงที่เชื่อมกับโปรโมชั่น Nondii
- **ขอบเขตงาน**:
  1. ตาราง `RoadTrip`, `RoadTripStop`, `RouteGeometryCache`
  2. `/trip`: แถบสร้างทริปด่วน `ต้นทาง → ปลายทาง` + Community Journeys
  3. `/trip/[tripId]`: OSRM Animated Real Driving Route + Bouncing Stops 6–8 จุด (Nondii Places ที่มีโปรก่อน + `ThailandPlace` OSM ฟรี) + คูปองประหยัดงบทริปจากแบรนด์/บัตรเครดิต + Auto-Optimize + Clone
- **สถานะ**: `Pending`

---

## บันทึกการตัดสินใจสำคัญ (Decision Log)
- **2026-11-24**: ยืนยันโครงสร้าง `1 Base Social Profile + Opt-in Modules`, `Hybrid Owner Mode` บน `/{slug}`, และแยกขาด `Wishlist` (`/wishlist`) ออกจาก `Trip` (`/trip`)
- **2026-11-25 (v4.0 Pivot)**: ปรับโมเดล Nondii เป็น **ศูนย์รวมโปรโมชั่นสำหรับนักท่องเที่ยวในประเทศไทย (Thailand Travel Promotion Hub)** ไม่จำกัดเฉพาะที่พัก — เปลี่ยนหน้าแรก `/` เป็น **หมวดโปรโมชั่น** (โฟกัสเริ่มต้น: `ที่พัก`, `คาเฟ่`, `ร้านอาหาร & บาร์` เพื่อสร้างความหนาแน่นก่อนขยายหมวดผ่าน Dynamic Categories)
- **2026-11-25 (LocationScope & Hybrid Cards)**: เพิ่ม 3 `LocationScope` (`SINGLE_LOCATION` / `MULTI_BRANCH` / `NATIONWIDE_ONLINE`) + `PlaceBranch` + กฎ Hybrid Cards เพื่อให้รองรับร้านเดี่ยว, เชนดัง (เช่น KFC, Café Amazon) และบัตรเครดิต/แพลตฟอร์ม (เช่น KTC, Agoda) ได้ภายใต้ URL `nondii.com/{slug}` โดยไม่ทำแผนที่ `/explore` รก
- **2026-11-25 (Realistic Automation & 3-Tier Visuals)**: วางระบบได้มาซึ่งโปรโมชั่น 4 ท่อแบบสมจริงถูกกฎหมาย (Affiliate API + Email Webhook + FB Sync/Self-Serve + AI Quick Promo Drop) พร้อมระบบภาพ 3 ชั้น (`Official Photo` + `next/og Branded Card` + `Fallback`) และ `Auto-Expire Cron`
- **2026-11-25 (`/admin` Control Center)**: เปลี่ยน URL หลังบ้านจาก `/super-admin` เป็น **`/admin`** เพื่อความสะดวกในการจำ และยึดต้นแบบสถาปัตยกรรมระบบหลังบ้านของ **WeGlobal (`my-shop`, Read-Only Study)** ภายใต้ Design System ของ Nondii
