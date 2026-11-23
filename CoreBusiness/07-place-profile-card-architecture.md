# 07 — สถาปัตยกรรม “1 การ์ด = 1 โปรไฟล์สถานที่” & Minimal Collectible Travel Card

> **สถานะ**: Locked Architectural Specification (v2.1 — Active Implementation)
> **ขอบเขต**: ยกระดับ Nondii จากกระดานรวมดีลที่พัก สู่ **Travel Place Social + Direct Booking Hub** ที่ทุกสถานที่ (`STAY`, `CAFE`, `RESTAURANT`, `ATTRACTION`, `WELLNESS`) มีการ์ดสะสม `3:4` เป็นโปรไฟล์หลักใบเดียว (Canonical Card)

---

## 1. กฎหลัก: 1 Place = 1 Canonical Card

- ทุกสถานที่ในตาราง `Hotel` (Unified Place Entity) มีการ์ดหลักในฟีดและแผนที่เพียง **1 ใบ** (`Hotel.canonicalPinId` + `Pin.isCanonicalCard = true`) เพื่อให้ยอด Like, Save, Comments, Promotions, Posts และ Blogs รวมศูนย์ที่เดียว
- **5 ประเภทสถานที่ (`PlaceCategory`)** พร้อมสีประจำ Crest และหมุดแผนที่เฉพาะจุด:
  - `STAY` (`#2B3A67`) · `CAFE` (`#9A4D1C`) · `RESTAURANT` (`#B83B3B`) · `ATTRACTION` (`#1F6E50`) · `WELLNESS` (`#146373`)
- **2 กลุ่มเจ้าของสถานที่ (`MerchantMode`)**:
  - `DIRECT_BOOKING` (กลุ่ม 1): โรงแรม/ที่พักที่ใช้ระบบจองตรง 0% GP เต็มรูปแบบ + ฟีเจอร์ชุมชนครบชุด
  - `PROFILE_ONLY` (กลุ่ม 2): คาเฟ่, ร้านอาหาร, ที่เที่ยว, สปา หรือที่พักที่มีเว็บจองเอง ใช้โปรไฟล์ชุมชน + คอมเมนต์ + หลายโปรโมชั่น + โพสต์ + บล็อก + ลิงก์ภายนอก (สมัครฟรีผ่าน `/register` ใน < 2 นาที พร้อมระบบกันร้านซ้ำ 80 ม. / `googlePlaceId`)

---

## 2. Minimal Collectible Travel Card (`3:4` ทั้งเว็บ)

- **สัดส่วน**: `aspect-[3/4]` (`180×240` Mobile deck / `216×288` Desktop deck / 6 การ์ดต่อแถวบน Desktop `1360px`)
- **องค์ประกอบบนหน้าการ์ด (Minimal & Uncluttered)**:
  - ขอบบาง `2px` + Bevel Rim + รอยเว้าครึ่งวงกลมสองข้าง + **Zero Hover Scale**
  - **ซ้ายบน**: Category Crest สีทึบพร้อมไอคอนประเภท
  - **ขวาบน**: ปุ่ม Pin (`Bookmark`, `#e60023` เมื่อบันทึก)
  - **ขวาล่าง**: ปุ่มค่าพลังหัวใจแบบกดได้ทันที (`♡` เฉย ๆ เมื่อยอดเป็น `0`, `1–999`, `5.2K`, `1.2M` — ไม่แสดงเลข Comment บนหน้าการ์ด)
  - **ไม่มีชื่อร้านบนภาพ**:
    - หน้า Home / Style / Nearby: แสดงใต้ภาพ (`3 บรรทัด` เมื่อมีโปร: โปร · ชื่อ · จังหวัด / `2 บรรทัด` เมื่อไม่มีโปร: ชื่อ · จังหวัด)
    - การ์ดพัด `/explore` & `/trip/[tripId]`: หน้าการ์ดคลีนเหมือนกันทั้ง 5 ใบ และมี **ข้อความโปรโมชั่น (ถ้ามี) + ชื่อสถานที่ลอยแบบไม่มีพื้นหลัง (`bg-transparent` + cartographic halo) เหนือการ์ดกลางใบเดียว**

---

## 3. Shared Place Profile Modal & Mobile Thumb-Zone UX

- ใช้ Modal เดียวกันทั้งเว็บ (ทุกหน้า `/`, `/style/[slug]`, `/explore`, `/trip`)
- **ชั้นที่ 1 (Top Fold)**: สไลด์การ์ด `3:4`/รูป/แผนที่ + Header + CTA ตาม `merchantMode` + กล่องคอมเมนต์/รีวิวชุมชน (ป้าย `เจ้าของสถานที่` / `เข้าพักจริง`)
- **ชั้นที่ 2 (Horizontal Slide Rows สไตล์ Home)**:
  1. **โปรโมชั่นทั้งหมด** (เจ้าของการ์ดเลือก 1 โปรปักหมุดหน้าการ์ดผ่าน `featuredCouponId`)
  2. **โพสต์อัปเดตจากเจ้าของ (`HotelPostKind.FEED_POST`)** — แสดงตัวอย่าง + `"อ่านต่อ ↗"` เปิดแท็บใหม่
  3. **บทความจากเจ้าของ (`HotelPostKind.BLOG`)** — แสดงตัวอย่าง + `"อ่านต่อ ↗"` เปิดแท็บใหม่ไป `/{slug}/posts/[postSlug]`
  4. **สถานที่ใกล้เคียงแนะนำ (Strict 1-Hop Lock)** — ดึงจาก Canonical Place Cards จริงรอบพิกัด (`computeHaversineKm`), แสดงเฉพาะ **Depth = 0**, เมื่อคลิกดู (Depth = 1) จะซ่อนแถวนี้ทันทีเพื่อกันหลงทาง
- **Mobile Thumb-Zone Navigation**: ยกเลิกปุ่ม Back มุมซ้ายบน วางไว้ใน **Sticky Bottom Dock** (`← กลับ` / `← กลับไป [ชื่อสถานที่เดิม]` คู่ CTA หลัก) + ปุ่ม `✕` มุมขวาบน + Pull-down & Left-Edge Swipe (`clientX <= 24px`)

---

## 4. แผนที่ `/explore` & `/trip` และความปลอดภัยแพลตฟอร์ม

- **Base Map POI Suppression**: ปิด Layer Commercial POIs (`poi_r20 / poi_r7 / poi_r1`) ใน [airbnbMapLibreStyle.ts](file:///Users/light/my-hotel/src/lib/geo/airbnbMapLibreStyle.ts) เฉพาะโหมด Explore/Trip เพื่อกันชื่อสถานที่ซ้ำซ้อน 100%
- **Smart Zoom LOD + Collision Dots**: หมุดเบียดกันย่อเป็นจุดสีตามประเภท (`14px`), ซูมเข้าขยายเป็น Pill (`[Crest] ฿ราคา / โปร / ชื่อย่อ`), ยกเลิกตัวกรองราคาและใช้ตัวกรอง 5 ประเภทสถานที่แทน
- **Hybrid Anti-Spam (Google Maps × Facebook)**: รวมหน้าสมัครที่ `/register` (redirect `/register-hotel` → `/register`), ตรวจพิกัดซ้ำ < 80 ม. + `googlePlaceId`, กลุ่ม 2 เผยแพร่ไวแต่จำกัดสูงสุด 3 สถานที่ยังไม่ยืนยันต่อบัญชี + ตรวจลิงก์ `https://`, กลุ่ม 1 คงเงื่อนไขตรวจ `Verified Stay`, และรองรับ `PlaceReport` เข้าคิว `/super-admin`
