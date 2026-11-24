# 05 — สถาปัตยกรรม “1 การ์ด = 1 โปรไฟล์สถานที่” & Minimal Collectible Travel Card

> **สถานะ**: Locked Architectural Specification (v3.0 — Active Implementation)
> **ขอบเขต**: กฎการออกแบบการ์ดสถานที่ `3:4`, Shared Place Modal, แผนที่ `/explore` และระบบป้องกันสแปมสำหรับทั้ง 5 ประเภทสถานที่บน Nondii

---

## 1. กฎหลัก: 1 Place = 1 Canonical Card

- ทุกสถานที่ในตาราง `Hotel` (Unified Place Entity) มีการ์ดหลักในฟีดและแผนที่เพียง **1 ใบ** (`Hotel.canonicalPinId` + `Pin.isCanonicalCard = true`) เพื่อให้ยอด Like, Save, Comments, Promotions, Posts และ Blogs รวมศูนย์ที่เดียว
- **5 ประเภทสถานที่ (`PlaceCategory`)** พร้อมสีโทนสบายตาประจำ Travel Medallion และหมุดแผนที่ (Screen #3 "Explore Nearby" inspired):
  - `STAY` (`#5369A6` Soft Slate Indigo) · `CAFE` (`#D47E35` Warm Amber Caramel) · `RESTAURANT` (`#C6566E` Soft Rose Berry) · `ATTRACTION` (`#529D48` Fresh Meadow Sage) · `WELLNESS` (`#3A8D9A` Calm Sea Teal)

---

## 2. Modern Super-Rounded Square Travel Card (`1:1` ทั้งเว็บ)

- **สัดส่วน**: `aspect-square` (`1:1`) ขอบโค้งมนสมัยใหม่ `rounded-[22px] sm:rounded-[24px]` (**ยกเลิกรอยเว้าครึ่งวงกลมแบบตั๋วคูปอง** เพื่อให้ดูทันสมัยและเหมาะกับทั้ง 5 ประเภทสถานที่)
- **องค์ประกอบบนหน้าการ์ด (Airy, Modern & Borderless)**:
  - **ZERO card border/rim**, **ZERO inline drop shadow**, **ZERO Hover Scale**
  - **ซ้ายบน (Inset `top-2.5 left-2.5`)**: Floating White Travel Medallion (`bg-white/95`, `rounded-[11px]–[12px]`) บรรจุไอคอนสไตล์ท่องเที่ยวแบบ Filled/Duotone สีโทนสบายตาประจำประเภท
  - **ขวาบน (Inset `top-2.5 right-2.5`)**: ปุ่มหัวใจ **Wishlist (`♥`, สี `#e60023` บนพื้นขาวเมื่อบันทึก)** — กด 1 คลิกเก็บเข้า `/wishlist` และจัดหมวดอัตโนมัติตามประเภทสถานที่
  - **ไม่มีปุ่ม Like แยกซ้ำซ้อนบนหน้าการ์ด** และ **ไม่มีป้ายคำว่า "Video"**
  - **ไม่มีชื่อสถานที่ทับบนรูปภาพ**:
    - หน้า Home / Style / Nearby Grid: แสดงใต้ภาพอย่างโปร่งสบาย (โปรโมชั่นถ้ามี · ชื่อสถานที่ + คะแนนดาวสีเหลืองอุ่น `★ 4.9` · ระยะทาง/จังหวัด)
    - การ์ดพัด `/explore` & `/trip/[tripId]`: สี่เหลี่ยมโค้งมน `1:1` (`204×204` Mobile / `244×244` Desktop) พร้อมโปรโมชั่น + ชื่อสถานที่ลอยแบบไม่มีพื้นหลังเหนือการ์ดใบกลางใบเดียว
  - การ์ดซ้อนในโฟลเดอร์ (`/wishlist`): สี่เหลี่ยมโค้งมน `1:1` ตั้งตรง (`rotate(0deg)`) เรียงเยื้องไปทางขวาโดยใบหลังเล็กลงและจางลงตามลำดับ

---

## 3. Shared Place Profile Modal & Mobile Thumb-Zone UX

- ใช้ Modal เดียวกันทั้งเว็บ (เปิดจาก `/`, `/style/[styleSlug]`, `/explore`, `/trip`)
- **ชั้นที่ 1 (Top Fold)**: สไลด์การ์ด `3:4`/รูป/แผนที่ + Header + CTA ตาม `merchantMode` & `placeCategory` + กล่องคอมเมนต์/รีวิวชุมชน (ป้าย `เจ้าของสถานที่` / `เข้าพักจริง`)
- **ชั้นที่ 2 (Horizontal Slide Rows)**:
  1. **โปรโมชั่นทั้งหมด** (เจ้าของเลือก 1 โปรปักหมุดหน้าการ์ดผ่าน `featuredCouponId`)
  2. **โพสต์อัปเดต (`FEED_POST`)** — แสดงตัวอย่าง + `"อ่านต่อ ↗"`
  3. **บทความ (`BLOG`)** — แสดงตัวอย่าง + `"อ่านต่อ ↗"` ไป `/{slug}/posts/[postSlug]`
  4. **สถานที่ใกล้เคียงแนะนำ (Strict 1-Hop Lock)** — ดึงจาก Canonical Place Cards รอบพิกัด แสดงเฉพาะ **Depth = 0**, เมื่อคลิกเข้าไปดู (Depth = 1) จะซ่อนแถวนี้เพื่อกันผู้ใช้หลงทาง
- **Mobile Thumb-Zone Navigation**: วางปุ่ม Back ใน **Sticky Bottom Dock** (`← กลับ` / `← กลับไป [ชื่อสถานที่เดิม]` คู่ CTA หลัก) + ปุ่ม `✕` มุมขวาบน + Pull-down & Left-Edge Swipe

---

## 4. แผนที่ `/explore` และระบบความปลอดภัยแพลตฟอร์ม

- **Base Map POI Suppression**: ปิด Layer Commercial POIs (`poi_r20 / poi_r7 / poi_r1`) ใน [airbnbMapLibreStyle.ts](file:///Users/light/my-hotel/src/lib/geo/airbnbMapLibreStyle.ts) เฉพาะโหมด Explore/Trip เพื่อไม่ให้ชื่อสถานที่ฐานแผนที่ซ้อนทับหมุดของ Nondii
- **Smart Zoom LOD + Collision Dots**: หมุดเบียดกันย่อเป็นจุดสีตามประเภท (`14px`), ซูมเข้าขยายเป็น Pill (`[Crest] ฿ราคา / โปร / ชื่อย่อ`), กรองด้วย 5 ประเภทสถานที่
- **Hybrid Anti-Spam (Google Maps × Facebook)**:
  - สมัครรวมที่ `/register` (redirect `/register-hotel` → `/register`)
  - ตรวจพิกัดซ้ำ < 80 ม. + `googlePlaceId`
  - กลุ่ม `PROFILE_ONLY`: เผยแพร่ไวแต่จำกัดสูงสุด 3 สถานที่ยังไม่ยืนยันต่อบัญชี + ตรวจลิงก์ `https://`
  - กลุ่ม `DIRECT_BOOKING`: คงเกณฑ์ตรวจยืนยัน `Verified Stay`
  - รองรับ `PlaceReport` เข้าคิวตรวจสอบใน `/super-admin`
