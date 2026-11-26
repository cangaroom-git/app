# 02 — ผังโครงสร้างหน้าเว็บ, Home หมวดโปรโมชั่น, Modular `/{slug}` และ `/admin` (v4.0)

## 1. มาตรฐาน URL ของแพลตฟอร์ม (`nondii.com`)

- **หน้าโปรไฟล์สถานที่และแบรนด์ทุกประเภท**: ใช้ Root Slug **`nondii.com/{slug}`**
  - สถานที่เดี่ยว: `nondii.com/sapanunseen`, `nondii.com/graph-cafe-cnx`
  - แบรนด์เชน / บัตรเครดิต / แพลตฟอร์ม: `nondii.com/kfc`, `nondii.com/cafe-amazon`, `nondii.com/ktc`, `nondii.com/agoda`
  - ล็อกคำสงวน (`RESERVED_SLUGS`): `admin`, `super-admin`, `studio`, `board`, `wishlist`, `deal`, `trip`, `trips`, `bookings`, `setting`, `login`, `register`, `register-hotel`, `partner`, `api`, `mcp`, `.well-known`, `about`, `terms`, `privacy`, `search`, `explore`, `style`, `promo`, `u`
- **ศูนย์ควบคุมผู้ดูแลแพลตฟอร์ม**: เปลี่ยนจาก `/super-admin` มาใช้ **`/admin`** เพื่อความสั้นและจำง่าย (โดยให้ `/super-admin` redirect มาที่ `/admin` ถาวร)

---

## 2. หน้าแรก `/` — ศูนย์รวมโปรโมชั่นท่องเที่ยวไทย (Promotion-First Home Feed)

> **การเปลี่ยนแปลงสำคัญใน v4.0:** ยกเลิกการแยกแท็บหน้าแรกตาม "สไตล์ที่พัก" (`ภูเขา`, `พูลวิลล่า`, `อ่างแช่น้ำ`, `แกลมปิ้ง`) และเปลี่ยนเป็น **แถบหมวดโปรโมชั่นที่ดึงจาก Dynamic Categories ใน `/admin/categories`** เพื่อให้หน้าแรกสื่อความเป็น "ศูนย์รวมโปรเที่ยวไทยทุกหมวด" ตั้งแต่วินาทีแรก

### 2.1 โครงสร้างหน้า `/` บน Desktop & Mobile
1. **4-Layer Collectible Card Hero (`HomeCollectibleHero`):**
   - แสดงการ์ด 3 มิติ `"โปรเที่ยวไทย"` แบบ GPU-only Parallax (บน Mobile/Tablet ชิดขอบเต็มจอ บน–ซ้าย–ขวา + แผ่นเนื้อหาโค้งมน `rounded-t-[24px]` ทับโคนมือ; ซ่อนอัตโนมัติเมื่อพิมพ์ค้นหาหรือเปิดการ์ด)
2. **Header + Dynamic Promotion Category Tabs (Sticky Scroll-Reveal):**
   - หัวข้อ `"โปรเที่ยวไทยวันนี้"` / `"เที่ยวอะไรดี"` + ตัวกรองจังหวัด (รวมตัวเลือก `"ทั่วประเทศ / ออนไลน์"`)
   - แถบหมวดเปิดตัว: **`ทั้งหมด`** · **`ที่พัก`** · **`คาเฟ่`** · **`ร้านอาหาร & บาร์`** *(และเปิดเพิ่ม `สปา & เวลเนส`, `กิจกรรม & ที่เที่ยว` ได้ทันทีจาก `/admin/categories`)*
3. **Horizontal Deal Rows & Promo Cards (`1:1` Super-Rounded):**
   - แถวแนะนำด้านบน: `ดูล่าสุด` · `โปรมาแรงใกล้หมดเขต` · `โปรที่พักแนะนำ (0% GP & ดีลคัดพิเศษ)` · `โปรคาเฟ่ยอดฮิต` · `โปรร้านอาหาร & บาร์` · `โปรบัตรเครดิต & แบรนด์ทั่วไทย`
   - ใต้การ์ดแสดงข้อมูลครบใน 1 วินาที: **พาดหัวโปรชัดๆ** · **ชื่อร้าน/แบรนด์** + ดาว (ถ้ามี) · **จังหวัด / "ทุกสาขาทั่วไทย" / "ออนไลน์"** · **ช่วงวันที่/วันหมดอายุ** (`วันนี้ - 30 พ.ย.` หรือป้ายเตือนใกล้หมดเขต)

---

## 3. หน้าโปรไฟล์ `/{slug}` — Unified Social & Brand Hub (ปรับอัตโนมัติตาม `LocationScope`)

ยังคงหลักการ **"1 โครงสร้างมาตรฐาน + Opt-in Modules"** แต่ขยายให้รองรับทั้ง 3 `LocationScope` อย่างลื่นไหล:

### 3.1 การแสดงผลตาม `LocationScope`
- **`SINGLE_LOCATION` (ที่พัก / คาเฟ่ / ร้านเดี่ยว):**
  - แสดงครบชุด: Hero Media + Category Crest + ป้าย `Verified` + โปรโมชั่นทั้งหมด + โพสต์/บทความ + รีวิวชุมชน + **แผนที่พิกัดจริง 1 หมุด + สถานที่ใกล้เคียง (1-Hop Lock)** + ปุ่มใส่ลง `/trip`
  - หากเปิด `merchantMode === "DIRECT_BOOKING"` (เฉพาะ `STAY`) → เพิ่ม Module ห้องพัก, ปฏิทินว่าง, Sticky Booking Widget และ Checkout `/{slug}/book`
- **`MULTI_BRANCH` (เชน / แบรนด์หลายสาขา เช่น KFC, Café Amazon, After You, Centara):**
  - แสดงเป็น **Brand Deal Hub**: โลโก้แบรนด์ + โปรโมชั่นที่ยัง Active ทั้งหมดของแบรนด์ + ป้ายขอบเขตสาขา (*"ทุกสาขาทั่วประเทศ"* หรือ *"สาขาที่ร่วมรายการ"*)
  - **โซนพิกัด/สาขา:** แสดงลิสต์สาขาที่บันทึกใน `PlaceBranch` (ถ้ามี) คู่กับปุ่มหลัก **`ค้นหาสาขาใกล้ฉันบน Google Maps ↗`** (`google.com/maps/search/?api=1&query=<brand>+near+me`)
- **`NATIONWIDE_ONLINE` (บัตรเครดิต / OTA / สายการบิน เช่น KTC, Agoda, Klook):**
  - แสดงเป็น **Brand Deal Hub**: รวมโค้ดส่วนลดและโปรโมชั่นทั้งหมด แบ่งกลุ่มตามหมวด (เช่น โปรที่พัก, โปรคาเฟ่, โปรร้านอาหาร) + ปุ่ม **คัดลอกโค้ด / ไปหน้าใช้สิทธิ์ ↗**
  - **ซ่อน Section แผนที่และสถานที่ใกล้เคียง** อย่างสะอาดตา (ไม่แสดงพิกัดปลอม)

### 3.2 Hybrid Owner Mode บน `/{slug}` + Adaptive `/studio`
- **Owner Top Action Bar** (เห็นเฉพาะเจ้าของร้าน/แบรนด์): `แก้ไขโปรไฟล์` · `+ ลงโปร / โพสต์ใหม่` · `เปิด Studio`
- **Lazy Modals (`ssr: false`, ลูกค้าทั่วไปโหลด 0 KB):** แก้ข้อมูลด่วน, ลงโปรโมชั่นใหม่พร้อมวันหมดอายุ, ตอบรีวิวในฐานะ `เจ้าของสถานที่`
- **Adaptive `/studio`:**
  - `PROFILE_ONLY` (คาเฟ่ / ร้านอาหาร / บาร์ / แบรนด์เชน / โรงแรมลิงก์ออก): 3 เมนูสะอาด — **ภาพรวม & สถิติ** · **โปรโมชั่น & โพสต์** · **ข้อมูลสถานที่/สาขา**
  - `DIRECT_BOOKING` (ที่พักจองตรง 0% GP): เมนูครบชุดสไตล์ Airbnb Hosting — **วันนี้ (ใบจอง & ตรวจสลิป)** · **ปฏิทิน** · **ที่พัก & โปรโมชั่น**

---

## 4. รายชื่อ Route หลักทั้งหมดของระบบ (Active Routes v4.0)

### 4.1 ฝั่งสาธารณะและนักเดินทาง (Public & Traveller)
1. **`/`** — Home Travel Promotion Hub: Hero 4 เลเยอร์ + Dynamic Promotion Category Tabs + แถวการ์ดโปร `1:1` (รวมร้านเดี่ยว, เชน และบัตรเครดิต)
2. **`/explore`** — Full-Screen Interactive WebGL Vector Map (`MapLibre` + `OpenFreeMap`): แสดงหมุดเฉพาะสถานที่ที่มีพิกัดจริง (`SINGLE_LOCATION` + `PlaceBranch`) กรองตามหมวดและจังหวัด + แถบเสริมโปรที่ใช้ได้ทั่วพื้นที่
3. **`/style/[styleSlug]`** — หน้าคอลเลกชันตามหมวดโปรโมชั่น/แคมเปญที่รองรับ SEO
4. **`/{slug}`** — Unified Place / Brand Profile (ปรับอัตโนมัติตาม `LocationScope` & `MerchantMode`)
   - `/{slug}/book` — Direct 0% GP Booking Checkout (เฉพาะ `STAY` + `DIRECT_BOOKING`)
   - `/{slug}/posts` & `/{slug}/posts/[postSlug]` — บทความ/รีวิว SEO
5. **`/trip`** & **`/trip/[tripId]`** — Public Road-Trip Discovery & Animated Real Driving Route (OSRM ฟรี + จุดแวะเด้งตามรายทาง + คูปองประหยัดงบทริป)
6. **`/wishlist`** *(ในเมนู `More` / โปรไฟล์ — เฉพาะคนล็อกอิน)* — รายการโปรและสถานที่ที่กดหัวใจเก็บไว้ แยกหมวดอัตโนมัติ + Custom Boards
7. **`/bookings`** — ประวัติการจองห้องพักและ Voucher (รองรับ `/trips` redirect)
8. **`/login`** — เข้าสู่ระบบ / สมัครสมาชิก (`@neon/auth`)

### 4.2 ฝั่งผู้ประกอบการและผู้ดูแลระบบ (Owner & Platform Admin)
9. **`/register`** — Unified Business & Brand Onboarding *(รองรับ `/register-hotel` redirect)*: เลือกหมวด, `LocationScope` (ร้านเดี่ยว / หลายสาขา / ออนไลน์), `MerchantMode`, และปักหมุด/วางลิงก์ Google Maps
10. **`/studio`** (`/studio/calendar`, `/studio/listings`, `/studio/reviews`, `/studio/menu`) — Adaptive Business Backoffice
11. **`/admin`** *(เปลี่ยนจาก `/super-admin`, โดย `/super-admin` redirect → `/admin`)* — **WeGlobal-Inspired Admin Control Center** (รายละเอียดครบใน [08-admin-control-plane-and-promo-automation.md](./08-admin-control-plane-and-promo-automation.md)):
    - `/admin` (Overview KPIs + Thailand Reach Map + Promo/Place Stats)
    - `/admin/promos` (Promo Hub + AI Quick Promo Drop + Promo Inbox + Auto-Expire)
    - `/admin/places` (Places & Brands + Verification + `LocationScope` / `PlaceBranch`)
    - `/admin/categories` (Dynamic Categories Miller Columns + DnD)
    - `/admin/attributes` (Dynamic Attributes / Filter Facets)
    - `/admin/ingestion` (Affiliate APIs + Email Webhook + Auto-Expire Cron Logs)
    - `/admin/campaigns` (Sponsored Placements & Featured Deals)
    - `/admin/locations` (Regions & 77 Provinces)
    - `/admin/reports` (Anti-Spam & Expired Promo Reports)
    - `/admin/media` (Media Library & Dynamic Branded Promo Card Templates)
    - `/admin/systems` (General · SEO · Appearance · Search Synonyms · AI Prompts · Users & RBAC)

### 4.3 Route เก่าที่ยกเลิกถาวร (Retired Routes — ห้ามนำกลับมา)
- `/booking`, `/room`, `/shorts`, `/guide`, `/review`, `/chat` (ระดับ Global), `/deal` และ `/board` แบบแยกซ้ำซ้อน (โปรโมชั่นรวมศูนย์ที่ `/` และ `/{slug}`, Wishlist อยู่ที่ `/wishlist`, ทริปอยู่ที่ `/trip`)
- `/super-admin` คงไว้เป็น Redirect ถาวรไปที่ `/admin` เท่านั้น
