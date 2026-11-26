# 08 — พิมพ์เขียวระบบหลังบ้าน `/admin` & Automation Engine (ถอดแบบสถาปัตยกรรม WeGlobal `my-shop`)

> **แหล่งอ้างอิงสถาปัตยกรรม:** ศึกษาแบบ Read-Only จากโปรเจกต์ต้นแบบ **WeGlobal (`/Users/light/my-shop/src/app/admin/*`, `src/components/dashboard/*`, `src/components/admin/*`, `src/actions/*`)** ที่ใช้ Stack เดียวกัน (`Next.js 16 + React 19 + Prisma 7 + Neon Postgres`)
> **กฎเหล็ก 2 ข้อ:**
> 1. **ห้ามแก้ไขไฟล์ใดๆ ใน `/Users/light/my-shop` โดยเด็ดขาด**
> 2. **นำสถาปัตยกรรม, โครงสร้าง Shell, Data-Flow และ Safety Guardrails ของ WeGlobal มาใช้ แต่คุมหน้าตา UI ด้วย Nondii Design System v3.0** (Travel-Blue `#1e78d6`, Airbnb Warm Minimal, Zero Hover Scale, Zero Card Shadows, Inset-Label `<StandardInput />`, `<ResponsiveSelect />`, `<StandardCheckbox />`, `useModalPresence`)

---

## 1. สิ่งที่ถอดแบบได้จาก WeGlobal (`my-shop`) `/admin`

จากการแกะโครงสร้างโค้ดจริงของ `my-shop` มี **6 เสาหลักทางสถาปัตยกรรม** ที่ทำให้หลังบ้าน WeGlobal ทำงานเร็ว ดูแลง่าย และขยายได้ไม่พัง:

### 1.1 Server-Guarded 3-Zone App Shell (`layout.tsx` + `AdminSidebar` + `.admin-page`)
- **Defense-in-Depth Guard (`src/app/admin/layout.tsx`):** ตรวจ `sessionUser.role === "SUPER_ADMIN"` ที่ Server Component ชั้น Layout เลย ก่อนส่ง HTML/JS ของหลังบ้านออกไป (ถ้าไม่ใช่ Redirect ทันที)
- **Collapsible Hover Icon Rail (`AdminSidebar` — ดัดแปลงจาก `DashboardSidebar.tsx`):**
  - แถบซ้ายกว้าง `60px` (ไอคอนคมชัด) พอวางเมาส์ขยายเป็น `200px` แสดงชื่อเมนูครบ ใช้สีเน้น Travel-Blue (`#1e78d6`) ของ Nondii แทนสีม่วง `#643B9F` ของ WeGlobal
  - แสดง **Live Badge Count** (เช่น จำนวนโปรใน `Promo Inbox` ที่รออนุมัติ / จำนวนสถานที่รอ `Verified` / จำนวน `PlaceReport` ที่เปิดอยู่)
- **Independent Scroll Canvas (`.admin-page > .admin-toolbar + .admin-body`):**
  - `h-[100dvh] overflow-hidden` แยกหัว `.admin-toolbar` (ชื่อหน้า + คำทักทาย + ช่องค้นหา + ปุ่ม Action) ติดด้านบน และให้ `.admin-body` เลื่อนอิสระเฉพาะพื้นที่ทำงาน (ใช้งานลื่นเหมือนแอป SaaS จริง)

### 1.2 Overview Dashboard (`/admin` — ดัดแปลงจาก `DashboardOverview.tsx` + `WorldMapCard.tsx` + `ProductStatsTable.tsx`)
1. **Top KPI Strip (3–4 การ์ดพื้นสี Sky Cloud Muted `#f3f7fc`, Zero Shadow, กดลิงก์เข้าคิวงานได้ทันที):**
   - `Promo Inbox (รออนุมัติ)` → `/admin/promos?status=PENDING_REVIEW`
   - `Active Promotions (โปรใช้งานอยู่)` → `/admin/promos?status=ACTIVE`
   - `Places & Brands (ร้านค้า/แบรนด์)` → `/admin/places`
   - `Under Review / Reports (รอตรวจ & รายงาน)` → `/admin/reports`
2. **Thailand Province Reach & Promo Density Map** *(ดัดแปลงจาก `WorldMapCard` ของ WeGlobal)*:
   - แผนที่ประเทศไทย 77 จังหวัดแบบ Choropleth Heatmap แสดงความหนาแน่นของโปรโมชั่นและยอดเข้าชมรายจังหวัด + ตัวกรองช่วงเวลา (`7 วัน / 30 วัน / ทั้งหมด`) + ลิสต์ **Top Provinces** ด้านซ้าย (ช่วยให้เห็นทันทีว่าจังหวัดไหนของยังน้อยต้องเติมโปร!)
3. **Pre-Aggregated Performance Table** *(ดัดแปลงจาก `ProductStatsTable`)*:
   - ดึงจากตาราง `PlaceStats` แบบแบ่งหน้า (`50 แถว/หน้า`) กรองตาม `Category`, `Province`, `LocationScope`, `DealSource` และเรียงตามยอดวิว, ยอดบันทึก Wishlist, ยอดคลิกโปร และยอดคลิก Affiliate

### 1.3 Standardized 5-File Module Pattern (กฎเหล็กกันโค้ดบวมและบั๊ก Type)
ทุกโมดูลใน `/admin` ต้องแยก 5 ไฟล์ชัดเจนตามมาตรฐาน WeGlobal:
1. `src/lib/schemas/<entity>.schema.ts` — Zod validation schema *(ห้าม import เข้าฝั่ง Public Client เพื่อคุมขนาด JS bundle)*
2. `src/lib/mappers/<entity>.mapper.ts` — Pure mapper (`safeNumber`, `slugify`) + explicit DTO serializer (`Date`/`Decimal` → JSON-safe, ห้ามใช้ `JSON.parse(JSON.stringify(...))`)
3. `src/actions/admin/<entities>.ts` — Server Action ขึ้นต้นด้วย `await requireSuperAdmin()`, ตรวจ Zod, รัน multi-table mutation ใน `prisma.$transaction`, และเรียก `revalidateTag(..., "max")` + `revalidatePath(...)` ทันที
4. `src/components/admin/<entity>/<Entity>FormSheet.tsx` — Slide-Up Sheet (Mobile) / Drawer (Desktop) ด้วย `useModalPresence`, `<StandardInput />`, `<ResponsiveSelect />`, `<StandardCheckbox />`
5. `src/components/admin/<entity>/<Entity>Client.tsx` — Optimistic UI + Lazy-load ข้อมูลย่อยเมื่อคลิก + รักษา State หลัง `router.refresh()`

### 1.4 Dynamic Categories — Miller Columns + Safe Re-Parenting (`/admin/categories`)
ถอดแบบจาก `my-shop/src/app/admin/categories/page.tsx` และ `src/actions/categories.ts`:
- โหลดเฉพาะโครงหมวดหมู่ upfront (`includePlaces: false`) และ Lazy-load รายการสถานที่/โปรเฉพาะตอนคลิกหมวดนั้น
- **3 คอลัมน์ (Miller Columns):** `L1 หมวดโปรหลัก` (`ที่พัก`, `คาเฟ่`, `ร้านอาหาร & บาร์`, `สปา & เวลเนส`, `กิจกรรม`) → `L2 หมวดย่อย` (`พูลวิลล่า`, `คาเฟ่ Specialty`, `บุฟเฟ่ต์โรงแรม`, `รูฟท็อปบาร์`) → `L3 แท็กพิเศษ` (`Pet-Friendly`, `ติดทะเล`, `โปรบัตรเครดิต`)
- **เปิด/ปิดหมวดได้ทันทีด้วย Toggle `isActive`:** ช่วงเปิดตัวเปิดโชว์เฉพาะหมวดที่มีของแน่น พอหมวดใหม่พร้อมค่อยกดเปิดขึ้นหน้า `/` ได้เลยโดยไม่ต้องแก้โค้ด!
- **Safety Guardrails:** ป้องกัน Cycle (ย้ายแม่ไปใต้ลูก), จำกัดลึกไม่เกิน 3 ชั้น, ลบหรือเปลี่ยนระดับหมวดต้องรันใน `prisma.$transaction` พร้อมย้ายรายการที่ได้รับผลกระทบไปยังหมวดทดแทนหรือถาด `Uncategorized`

### 1.5 URL-Driven Tabbed Systems Hub (`/admin/systems`)
ถอดแบบจาก `my-shop/src/app/admin/systems/page.tsx` และ `SettingsClient.tsx`:
- รวมการตั้งค่าระบบไว้ในหน้าเดียวด้วย `?view=...` (บนมือถือเลื่อนแบบ Forward/Back Slide, บน Desktop เป็น 2 คอลัมน์):
  - `general` — ชื่อเว็บ, ภาษา, ข้อมูลติดต่อ
  - `seo` — Global Meta Tags, OG Default, Sitemap / Robots
  - `appearance` — จัดการ **Home Hero (`HomeCollectibleHero`)** และลำดับแถวโปรโมชั่นบนหน้า `/`
  - `synonyms` — 3-Level Search Synonyms (เช่น `พูลวิลล่า` ↔ `บ้านพักมีสระ` ↔ `pool villa`, `บุฟเฟ่ต์` ↔ `buffet`)
  - `ai-prompts` — แก้ Prompt ของ Gemini สำหรับแกะโปสเตอร์โปร, แกะอีเมล และคัดกรองโพสต์ Facebook ได้สดๆ
  - `users` — จัดการสิทธิ์ผู้ใช้ (`TRAVELLER` / `HOTEL_OWNER` / `SUPER_ADMIN`)

### 1.6 Shared Primitives Between `/admin` และ `/studio`
ตามแนวทาง `admin_seller_unify_plan` ของ WeGlobal:
- คอมโพเนนต์กลางอย่าง `DashboardOverview`, `PromoStatsTable`, `PromoFormSheet`, `MediaPicker` รับ prop `role: "SUPER_ADMIN" | "HOTEL_OWNER"` เพื่อใช้ร่วมกันทั้ง `/admin` (เห็นทั้งแพลตฟอร์ม) และ `/studio` (เห็นเฉพาะร้านของตัวเอง) ลดโค้ดซ้ำซ้อนเกินครึ่ง

---

## 2. ผังเมนูและเส้นทางทั้งหมดของ `/admin` สำหรับ Nondii v4.0

```text
src/app/admin/
├── layout.tsx              # Server RBAC Guard (SUPER_ADMIN) + AdminSidebar + Shell
├── page.tsx                # Overview Dashboard: KPIs + Thailand Reach Map + Promo/Place Stats
├── promos/page.tsx         # Promo Hub: Active/Expiring/Expired + Promo Inbox + AI Quick Promo Drop
├── places/page.tsx         # Places & Brands Directory (SINGLE / MULTI_BRANCH / NATIONWIDE) + KYC Verified
├── categories/page.tsx     # Dynamic Promo & Place Categories (Miller Columns + DnD + Safe Move)
├── attributes/page.tsx     # Dynamic Filter Facets & Perks (bound per Category + In-Use Guard)
├── ingestion/page.tsx      # Automation Hub: Affiliate API Sync + Email Webhook + Auto-Expire Cron Logs
├── campaigns/page.tsx      # Sponsored Promos, Featured Deals & Affiliate Tracking Config
├── locations/page.tsx      # Regions & 77 Provinces Sort / Bounding Box (ย้ายจาก SuperAdminLocationsManager)
├── reports/page.tsx        # Moderation Queue: PlaceReport & Expired/Broken Promo Reports
├── media/page.tsx          # Shared Media Library & Dynamic Branded Promo Card (`next/og`) Previewer
└── systems/page.tsx        # Tabbed Hub: General | SEO | Appearance | Synonyms | AI Prompts | Users
```

---

## 3. โฟลว์การทำงานของ "Promo Hub & AI Quick Promo Drop" (`/admin/promos`)

ออกแบบให้ทีมงาน 1 คนจัดการโปรได้วันละหลายสิบรายการภายในไม่กี่นาที:

1. **ปุ่ม `+ โยนโปรให้ AI แกะ (AI Quick Promo Drop)`:**
   - วาง **รูปโปสเตอร์โปรโมชั่น** (drag & drop / paste จาก clipboard) หรือ **ข้อความ/ลิงก์โปร**
   - Server Action ส่งเข้า **Gemini Vision + Structured JSON** → แกะออกเป็นฟอร์มพร้อมตรวจ:
     - ชื่อร้าน/แบรนด์ (พร้อม Auto-Match กับตาราง `Hotel` เดิม หรือกดสร้าง Brand ใหม่แบบ `SINGLE_LOCATION` / `MULTI_BRANCH` / `NATIONWIDE_ONLINE`)
     - หมวดโปรโมชั่น (`promoCategoryCode`)
     - พาดหัวโปรสั้นๆ สำหรับการ์ด `1:1` + โค้ดส่วนลด + ราคาเดิม/ราคาโปร
     - วันเริ่ม (`promoStartsAt`) และ **วันหมดอายุ (`promoExpiresAt`)**
     - โหมดภาพ: ใช้รูป Official ของร้าน/API หรือ **กดพรีวิว Dynamic Branded Card (`next/og`)** ทันที
   - กด **`เผยแพร่ทันที`** → บันทึกลง Neon Postgres + `revalidatePlaceCatalog()` ขึ้นหน้า `/` ทันที
2. **แท็บ `Promo Inbox (รออนุมัติ)`:**
   - รวมรายการที่ไหลมาจาก **Inbound Email (`deals@nondii.com`)**, **Affiliate Sync**, **ร้านค้าส่งเอง** และ **Community Tip**
   - มีปุ่ม **✓ อนุมัติใน 1 คลิก** / **แก้ไข** / **✗ ปัดตก** (พร้อมป้ายเตือนถ้าซ้ำกับโปรเดิมในระบบ)
3. **แท็บ `กำลังใช้งาน / ใกล้หมดอายุ / หมดอายุแล้ว`:**
   - ตรวจดูโปรที่กำลังจะหมดอายุใน 3 วันข้างหน้าเพื่อรีบอัปเดตหรือต่ออายุ และดูผลการทำงานของ **Auto-Expire Cron** รายวัน
