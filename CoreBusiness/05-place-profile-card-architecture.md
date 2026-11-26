# 05 — สถาปัตยกรรม การ์ดโปรโมชั่น `1:1` แบบ Hybrid (Place Card × Brand Campaign Card) (v4.0)

> **สถานะ**: Locked Architectural Specification (v4.0 — Thailand Travel Promotion Hub)
> **ขอบเขต**: กฎการออกแบบการ์ด `1:1` Super-Rounded, กฎ Hybrid สำหรับร้านเดี่ยว vs เชน/บัตรเครดิต, โครงสร้างข้อมูลโปรโมชั่นและวันหมดอายุ, Shared Modal และแผนที่ `/explore`

---

## 1. กฎ Hybrid Card Model (แก้ปัญหา 1 ร้านเดี่ยว vs 1 แบรนด์มีหลายโปรคนละหมวด)

| ขอบเขตสถานที่ (`LocationScope`) | บนหน้าแรก `/` (Promotion-First Feed) | บนแผนที่ `/explore` & `/trip` (Map-First) |
| :--- | :--- | :--- |
| **`SINGLE_LOCATION`** *(ที่พัก / คาเฟ่ / ร้านเดี่ยว)* | **1 Place = 1 Canonical Card** (แสดงโปรหลักที่ปักหมุดไว้ `featuredCouponId` เพื่อไม่ให้ร้านเดียวสแปมฟีด) | ปัก **1 หมุด** ตามพิกัดจริง (`lat/lng`) และแวะใส่ `/trip` ได้ |
| **`MULTI_BRANCH`** *(เชนหลายสาขา เช่น KFC, Café Amazon, After You, Centara)* | **1 แคมเปญโปร = 1 Promo Card** (อนุญาตให้ 1 แบรนด์มีหลายการ์ดคนละหมวด/คนละแคมเปญได้ และกดชื่อแบรนด์รวมศูนย์ที่ `nondii.com/{slug}`) | ปักหมุดเฉพาะสาขาที่บันทึกใน `PlaceBranch` (เชนพันสาขาไม่ปักหมุดรกแผนที่ แต่แสดงในแถบ *"โปรใช้ได้ทั่วพื้นที่นี้"*) |
| **`NATIONWIDE_ONLINE`** *(บัตรเครดิต KTC/SCB, Agoda, Klook, สายการบิน)* | **1 แคมเปญโปร = 1 Promo Card** (โผล่ในแท็บหมวดที่เกี่ยวข้อง เช่น บัตร KTC ลดโรงแรม → โผล่แท็บ `ที่พัก`, บัตร KTC ลดคาเฟ่ → โผล่แท็บ `คาเฟ่`) | **ไม่ปักหมุดบนแผนที่ `/explore`** — ใช้เป็นคูปองประหยัดงบใน `/trip` แทน |

---

## 2. 5 สีโทนสบายตาประจำหมวด (Soothing Matte Travel Medallion Tokens)

- **`STAY`** (`#5369A6` Soft Slate Indigo) — ที่พัก โรงแรม รีสอร์ท พูลวิลล่า
- **`CAFE`** (`#D47E35` Warm Amber Caramel) — คาเฟ่ ร้านกาแฟ เบเกอรี
- **`RESTAURANT` / `BAR`** (`#C6566E` Soft Rose Berry) — ร้านอาหาร บุฟเฟ่ต์ บาร์ รูฟท็อป บีชคลับ
- **`ATTRACTION`** (`#529D48` Fresh Meadow Sage) — กิจกรรม สวนน้ำ ทัวร์เกาะ ที่เที่ยว
- **`WELLNESS`** (`#3A8D9A` Calm Sea Teal) — สปา นวด ออนเซ็น เวลเนส

*(บริหารจัดการ เพิ่ม/แก้ไข/เรียงลำดับ และเปิด-ปิดหมวดได้แบบ Dynamic ผ่าน `/admin/categories`)*

---

## 3. มาตรฐานการ์ด `1:1` Super-Rounded & ข้อมูลโปรโมชั่นใต้ภาพ

- **สัดส่วนภาพ**: `aspect-square` (`1:1`) ขอบโค้งมน `rounded-[22px] sm:rounded-[24px]` (**ZERO card border/rim**, **ZERO inline drop shadow**, **ZERO Hover Scale**)
- **บนหน้าภาพ (Ultra-Clean — ไม่เอาตัวหนังสือรกไปแปะทับรูปถ่าย):**
  - **ซ้ายบน (`top-2.5 left-2.5`)**: Floating White Travel Medallion (`bg-white/95`, `rounded-[11px]–[12px]`) ไอคอนประจำหมวดสีโทนสบายตา
  - **ขวาบน (`top-2.5 right-2.5`)**: ปุ่มหัวใจ **Wishlist (`♥` `#e60023` เมื่อบันทึก)** — กด 1 คลิกเก็บเข้า `/wishlist`
  - **รองรับ 2 โหมดภาพอัตโนมัติ (`visualMode`):**
    1. `OFFICIAL_PHOTO`: ภาพสถานที่จริงจากโปรไฟล์ร้าน หรือจาก Official Affiliate API (หรือวิดีโอ Autoplay ปิดเสียง ไม่มีป้ายคำว่า "Video")
    2. `BRANDED_CARD`: ภาพการ์ดโปรโมชั่นที่ระบบสร้างอัตโนมัติ (`next/og` / `satori`) สำหรับโปรโค้ด/บัตรเครดิตที่ไม่มีรูปถ่าย (โทนสะอาด Travel-Blue + โลโก้แบรนด์ + ตัวเลขส่วนลดใหญ่คมชัด)
- **ใต้ภาพ (ได้ข้อมูลครบใน 1 วินาที — เก็บจุดแข็งของเว็บโปรมาไว้ในดีไซน์ที่คลีนแบบ Nondii):**
  1. **บรรทัดที่ 1 (พาดหัวโปรตัวหนา):** เช่น `ลด 20% เครื่องดื่ม & เบเกอรี` / `พัก 2 คืนลด 1,000฿ + อาหารเช้า`
  2. **บรรทัดที่ 2 (ชื่อร้าน/แบรนด์ + ดาว):** เช่น `Graph Cafe Chiang Mai` + `★ 4.9` หรือ `บัตรเครดิต KTC`
  3. **บรรทัดที่ 3 (พื้นที่ + ช่วงวันที่/สถานะโปร):** เช่น `เชียงใหม่ · ถึง 30 พ.ย.` · `ทุกสาขาทั่วไทย · 23–26 ต.ค.` · หรือป้ายเตือนใกล้หมดเขต / `หมดอายุ` (ในหน้าประวัติ)
- **การ์ดพัด `/explore` & `/trip/[tripId]`:** สี่เหลี่ยมโค้งมน `1:1` (`204×204` Mobile / `244×244` Desktop)
- **การ์ดซ้อนในโฟลเดอร์ (`/wishlist`):** `1:1` ตั้งตรง (`rotate(0deg)`) เรียงเยื้องขวาโดยใบหลังเล็กลงและจางลง

---

## 4. Shared Place & Promo Modal (1-Hop Lock + Mobile Thumb-Zone UX)

- **ชั้นที่ 1 (Top Fold):** สไลด์ภาพ `1:1` / Branded Card + พาดหัวโปร + โค้ดส่วนลด (กดคัดลอก 1 แตะ) + ช่วงวันที่ใช้สิทธิ์ + CTA หลักตาม `merchantMode` & `locationScope` (`จองตรง 0% GP`, `รับสิทธิ์ / จองผ่านพาร์ทเนอร์ ↗`, `หาสาขาใกล้ฉัน ↗`, `ดูโปรไฟล์แบรนด์`) + คอมเมนต์ชุมชน
- **ชั้นที่ 2 (Horizontal Slide Rows):** โปรโมชั่นอื่นของร้าน/แบรนด์นี้ → โพสต์อัปเดต (`FEED_POST`) → บทความ (`BLOG`) → สถานที่ใกล้เคียงแนะนำ (เฉพาะ `SINGLE_LOCATION` และ **Strict 1-Hop Lock Depth = 0**)
- **Mobile Thumb-Zone Navigation:** ปุ่ม `← กลับ` ใน Sticky Bottom Dock คู่ CTA หลัก + ปุ่ม `✕` มุมขวาบน + Pull-down & Left-Edge Swipe

---

## 5. แผนที่ `/explore` และระบบความปลอดภัยแพลตฟอร์ม

- **Base Map POI Suppression:** ปิด Commercial POIs บนฐานแผนที่ใน `airbnbMapLibreStyle.ts` เฉพาะโหมด Explore/Trip ไม่ให้ข้อความแผนที่ทับหมุด Nondii
- **Smart Zoom LOD + Collision Dots:** แสดงหมุดเฉพาะ `SINGLE_LOCATION` และ `PlaceBranch` ที่มีพิกัดจริง กรองตามหมวดโปรโมชั่นได้
- **Hybrid Anti-Spam:** เช็กพิกัดซ้ำ < 80 ม. + `googlePlaceId` สำหรับร้านเดี่ยว, เช็ก `dedupeHash` กันโปรซ้ำ, จำกัดสถานที่ยังไม่ยืนยันสำหรับ `PROFILE_ONLY`, และคิว `PlaceReport` (รวมเหตุผล `"โปรหมดอายุ/ใช้ไม่ได้จริง"`) ส่งตรงเข้า `/admin/reports`
