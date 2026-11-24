# 02 — ผังโครงสร้างหน้าเว็บ, Unified `/register`, Modular `/{slug}` และ Adaptive `/studio`

## 1. มาตรฐาน URL ของแพลตฟอร์ม (`nondii.com`)

- **หน้าโปรไฟล์สถานที่ทุกประเภท**: ใช้ Root Slug **`nondii.com/{slug}`** (เช่น `nondii.com/sapanunseen`, `nondii.com/graph-cafe-cnx`)
  - URL สั้น จำง่าย วางบน Bio Instagram, Facebook Page และ LINE OA ได้ทันที
  - ล็อกคำสงวน (`RESERVED_SLUGS`): `admin`, `studio`, `super-admin`, `board`, `deal`, `trip`, `trips`, `bookings`, `setting`, `login`, `register`, `register-hotel`, `partner`, `api`, `mcp`, `.well-known`, `about`, `terms`, `privacy`, `search`, `explore`, `style`, `u`

---

## 2. หลักสถาปัตยกรรม "Unified Social Base + Opt-in Modules" (เหมือน Facebook Page)

> **กฎการออกแบบสำคัญ:** เรา **ไม่สร้าง 5 Template แยกซ้ำซ้อน** สำหรับ 5 ประเภทธุรกิจ แต่ใช้ **1 โครงสร้างโปรไฟล์มาตรฐาน (Base Social Profile)** ที่ทุกธุรกิจใช้ร่วมกันได้ 100% แล้วเปิด/ปิด **Opt-in Modules** ตามความสามารถที่เจ้าของเลือก (Feature-Driven)

### 2.1 ธุรกิจกลุ่มไหนที่ใช้หน้าตาเหมือนกันได้ 100%?
- **`CAFE`, `RESTAURANT`, `ATTRACTION`, `WELLNESS` และ `STAY` (ที่เลือกโหมด `PROFILE_ONLY`)** ทั้ง 5 กลุ่มนี้สามารถใช้ **Base Social Profile หน้าตาเดียวกันทั้งหมด** ต่างกันเพียง:
  - ป้าย Category Crest (สี + ไอคอนประจำประเภท)
  - `Schema.org` Type (`CafeOrCoffeeShop`, `Restaurant`, `TouristAttraction`, `HealthAndBeautyBusiness`, `LodgingBusiness`)
  - ข้อความ CTA หลักเริ่มต้น (เช่น `ดูข้อมูลร้าน`, `ดูเมนู & จองโต๊ะ`, `ดูเส้นทาง`, `จองทรีตเมนต์`, `จองตรงที่เว็บโรงแรม ↗`) และ Metadata เฉพาะหมวด (เช่น เวลาเปิด-ปิด, ค่าเข้าชม, ช่วงราคา)

### 2.2 โครงสร้าง Modular Sections บนหน้า `/{slug}`
- **Core Sections (ทุกธุรกิจมีเหมือนกัน ~70%):**
  1. Hero Media (Gallery / Autoplay Video) + Category Crest + ป้าย `Verified`
  2. Header Overview (ชื่อ, คำโปรย, จังหวัด, คะแนนรีวิว, ยอดบันทึก, ปุ่มบันทึก/แชร์)
  3. Sticky Right Action Card (CTA หลัก + ช่องทางติดต่อ LINE / โทร / Facebook / IG / เว็บไซต์ / นำทาง)
  4. โปรโมชั่น & คูปองทั้งหมด (เจ้าของปักหมุด 1 โปรหลักขึ้นหน้าการ์ดได้ผ่าน `featuredCouponId`)
  5. โพสต์อัปเดต (`FEED_POST`) และบทความ (`BLOG` → `/{slug}/posts/[postSlug]`)
  6. รีวิว & คอมเมนต์ชุมชน (แสดงป้าย `เจ้าของสถานที่` / `เข้าพักจริง`)
  7. แผนที่พิกัดจริง + สถานที่ใกล้เคียงแนะนำ (Strict 1-Hop Lock)
- **Opt-in Modules (ประกอบเพิ่มเฉพาะเมื่อเจ้าของเปิดใช้ ~30%):**
  - **Module A — Direct Booking Engine** *(เปิดใช้เฉพาะ `STAY` + `merchantMode === "DIRECT_BOOKING"`)*:
    - เพิ่ม Section ห้องพัก, ปฏิทินเช็กวันว่าง, Sticky Booking Widget, นโยบาย Check-in/Check-out & สัตว์เลี้ยง, และเส้นทางชำระเงิน `/{slug}/book`
  - **Module B — Category Metadata & Future Catalog** *(ปรับตาม `placeCategory`)*:
    - `CAFE` / `RESTAURANT`: เวลาเปิด-ปิด, *(เฟสถัดไป: เมนูแนะนำ/ช่วงราคา)*
    - `ATTRACTION`: เวลาเปิด-ปิด, *(เฟสถัดไป: ค่าเข้าชม/ฤดูกาลที่แนะนำ)*
    - `WELLNESS`: เวลาเปิด-ปิด, *(เฟสถัดไป: รายการทรีตเมนต์/แพ็กเกจ)*

---

## 3. Hybrid Owner Mode บนหน้า `/{slug}` + Adaptive `/studio`

เพื่อให้ `nondii.com` ให้ความรู้สึกใช้งานง่ายเหมือน Facebook/Instagram **โดยไม่ทำลาย Performance ของหน้าบ้านและไม่เขียนฟอร์มซ้ำซ้อน 2 ที่** จึงแบ่งบทบาทชัดเจนดังนี้:

### 3.1 สิ่งที่ทำได้โดยตรงบนหน้า `/{slug}` (เห็นเฉพาะเมื่อล็อกอินเป็นเจ้าของ)
- **Owner Top Action Bar** (เรียบง่าย ไม่รกหน้าบ้าน): `แก้ไขโปรไฟล์` · `+ โพสต์ใหม่` · `เปิด Studio` (พร้อมจุดแจ้งเตือนเมื่อมีใบจองรอตรวจสลิป)
- **Lightweight Lazy Modals (`next/dynamic` + `ssr: false`, ลูกค้าทั่วไปโหลด 0 KB)**:
  - แก้ไขข้อมูลโปรไฟล์ด่วน (รูปปก, โลโก้, ชื่อ, คำโปรย, เวลาเปิด-ปิด, ช่องทางติดต่อ)
  - สร้าง/แก้ไขโพสต์อัปเดต (`FEED_POST`) และปักหมุดโปรโมชั่นหน้าการ์ด
  - ตอบคอมเมนต์/รีวิวในฐานะ `เจ้าของสถานที่`
- **Edit Jump-Links (ไม่สร้างฟอร์มซ้ำ):** ใน Section ที่ซับซ้อน (ห้องพัก, ปฏิทิน, ราคา Seasonal, คูปองทั้งหมด, นโยบาย) แสดงไอคอนดินสอเล็กๆ เฉพาะเจ้าของ กดแล้วพาไปหน้า `/studio/...` ตรงหมวดนั้นทันทีพร้อมปุ่มกลับ `/{slug}`

### 3.2 Adaptive `/studio` (แยกเมนูตาม `merchantMode` & `placeCategory`)
- **โหมด `PROFILE_ONLY` (คาเฟ่ / ร้านอาหาร / ที่เที่ยว / สปา / โรงแรมไม่ใช้ระบบจอง):**
  - ซ่อนแท็บ `ปฏิทิน`, `ห้องพัก`, `ตรวจสลิป` และเปลี่ยนคำว่า `"ที่พัก"` เป็นคำตามประเภทธุรกิจหรือ `"สถานที่ของฉัน"`
  - เหลือเมนูสะอาด 3 ส่วน: **ภาพรวม & สถิติ** · **โพสต์ & โปรโมชั่น** · **ข้อมูลสถานที่ & พิกัด**
- **โหมด `DIRECT_BOOKING` (ที่พักที่เปิดระบบจองตรง 0% GP):**
  - แสดงครบชุดสไตล์ Airbnb Hosting: **วันนี้ (ใบจอง & ตรวจสลิป)** · **ปฏิทิน (ปิดห้อง/ปรับราคา)** · **ที่พัก (ห้องพัก, `RoomPhotoStudio`, ราคา Seasonal, คูปอง, Add-ons, นโยบาย, บัญชี PromptPay)**

---

## 4. รายชื่อ Route หลักทั้งหมดของระบบ (Active Routes)

### 4.1 ฝั่งสาธารณะและนักเดินทาง (Public & Traveller)
1. **`/`** — Home Discovery Feed: แถบค้นหา + กรองจังหวัด/สไตล์/ประเภท + การ์ดสะสม `3:4` (เปิด Shared Place Modal)
2. **`/explore`** — Full-Screen Interactive WebGL Vector Map (`MapLibre` + `OpenFreeMap`): ซูม/เลื่อนแผนที่เปลี่ยนรายการแบบเรียลไทม์ + กรอง 5 ประเภทสถานที่ + Fanned Card Deck
3. **`/style/[styleSlug]`** — หน้าคอลเลกชันตามสไตล์/หมวดหมู่ที่รองรับ SEO
4. **`/{slug}`** — หน้าโปรไฟล์สถานที่ (Modular Base Profile + Opt-in Direct Booking + Owner Mode)
   - `/{slug}/book` — หน้า Checkout จองตรง 0% GP + PromptPay QR + อัปโหลดสลิป (เฉพาะ `DIRECT_BOOKING`)
   - `/{slug}/posts` & `/{slug}/posts/[postSlug]` — บทความ/บล็อก SEO ของเจ้าของสถานที่
5. **`/trip`** — **Public Road-Trip Discovery & Creator**: สร้างทริปด่วน (`ต้นทาง → ปลายทาง`) + ดูทริปที่คนอื่นสร้างไว้ได้ทันทีโดยไม่ต้องล็อกอิน (อยู่บน Bottom Bar / เมนูหลัก)
6. **`/trip/[tripId]`** — **Animated Real Road-Trip Route Viewer & Editor**: เส้นถนนขับรถจริง (OSRM) + จุดแวะเด้งตามรายทาง (Nondii Places + OSM ฟรี) + ปรับจุดแวะ/ที่พักปลายทาง + เรียงลำดับประหยัดเวลา + แชร์/คัดลอกทริป
7. **`/wishlist`** *(เก็บไว้ในเมนู `More` / โปรไฟล์ — เฉพาะคนล็อกอิน)* — รายการสถานที่ที่กดหัวใจเก็บไว้ แยกหมวดอัตโนมัติ (`ที่พัก · คาเฟ่ · ร้านอาหาร · ที่เที่ยว · สปา`) + Custom Boards
8. **`/bookings`** — ประวัติการจองห้องพักและ Voucher ของนักเดินทาง (รองรับ `/trips` redirect)
9. **`/login`** — เข้าสู่ระบบ / สมัครสมาชิก (`@neon/auth`)

### 4.2 ฝั่งเจ้าของธุรกิจและผู้ดูแลระบบ (Owner & Admin)
9. **`/register`** — **Unified Business Onboarding** *(แทน `/register-hotel` โดยให้ `/register-hotel` redirect มาที่ `/register`)*:
   - ขั้นที่ 1: เลือกประเภทธุรกิจ 1 ใน 5 (`STAY`, `CAFE`, `RESTAURANT`, `ATTRACTION`, `WELLNESS`)
   - ขั้นที่ 2 *(เฉพาะ `STAY`)*: เลือกระหว่าง **"เปิดระบบจองตรง 0% GP ฟรี"** (`DIRECT_BOOKING`) หรือ **"ใช้เฉพาะหน้าโปรไฟล์ & ลิงก์จองของร้านเอง"** (`PROFILE_ONLY`)
   - ขั้นที่ 3: กรอกชื่อ, `@slug`, จังหวัด + ปักหมุดแผนที่ / วางลิงก์ Google Maps (เช็กพิกัดซ้ำ < 80 ม. และ `googlePlaceId`) → สร้างเสร็จเข้าหน้าโปรไฟล์หรือ Studio ที่ตรงประเภททันที
10. **`/studio`** (`/studio/calendar`, `/studio/listings`, `/studio/reviews`, `/studio/menu`) — Adaptive Business Backoffice
11. **`/super-admin`** — Platform Operations: อนุมัติ `VERIFIED`, คิว `PlaceReport`, แคมเปญโฆษณา, ตั้งค่าจังหวัด/ภูมิภาค

### 4.3 Route เก่าที่ยกเลิกถาวร (Retired Routes — ห้ามนำกลับมา)
- `/booking`, `/room`, `/shorts`, `/guide`, `/review`, `/chat` (ระดับ Global)
- `/deal` และ `/board` แบบแยกซ้ำซ้อน (โปรโมชั่นรวมเข้าการ์ดหน้า `/` และ `/explore`, บอร์ดบันทึกย้ายมารวมศูนย์ที่ `/trip`)
