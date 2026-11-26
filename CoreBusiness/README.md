# Nondii (`nondii.com`) — Core Business & Architecture Blueprint (`CoreBusiness/` v4.0)

> **MANDATORY SOURCE OF TRUTH FOR ALL AI AGENTS & DEVELOPERS**
> เอกสารทั้งหมดในโฟลเดอร์ `CoreBusiness/` นี้คือ **พิมพ์เขียวหลักฉบับปัจจุบัน (Single Source of Truth v4.0)** ของแพลตฟอร์ม **Nondii (`nondii.com`)**
> - **กฎเหล็กด้าน UI/UX**: ก่อนแก้ไขหรือสร้างหน้าเว็บใดๆ ต้องอ่านและปฏิบัติตาม `.agents/skills/my-hotel-design-system/SKILL.md` และ `AGENTS.md` อย่างเคร่งครัด โดยเฉพาะกฎ **ห้ามใช้ `hover:scale-*`**, **Minimal Borders**, **Unified Airbnb Inset-Label Inputs**, **Zero Card Shadows**, **Full-Round Pill Buttons**, **Square `1:1` Cards** และ **Smooth Fade Slide-In/Out**
> - **กฎเหล็กด้าน Speed & Admin Architecture**: อ่าน `.agents/skills/nondii-speed-and-superadmin/SKILL.md` และ `08-admin-control-plane-and-promo-automation.md` ก่อนออกแบบหรือสร้างโมดูลใน `/admin`
> - **กฎเหล็กด้าน Workspace**: ห้ามแก้ไขไฟล์ใดๆ นอก `/Users/light/my-hotel` (**ห้ามแตะหรือแก้ไขไฟล์ใน `/Users/light/my-shop` (WeGlobal) โดยเด็ดขาด** — ใช้ศึกษาแบบ Read-Only เท่านั้น)

---

## สรุปภาพรวม Nondii v4.0 ใน 1 นาที (TL;DR)

1. **Nondii (`nondii.com`) คืออะไร? (v4.0 Pivot)**
   - **ศูนย์รวมโปรโมชั่นสำหรับนักท่องเที่ยวในประเทศไทย (Thailand Travel Promotion Hub)** ที่ผสาน **แผนที่สำรวจ (`/explore`) + วางแผนทริปขับรถจริง (`/trip`) + จองที่พักตรง 0% GP** ไว้ในที่เดียว — **ไม่จำกัดเฉพาะที่พัก** แต่ครอบคลุมทุกจุดแวะที่นักท่องเที่ยวไทยใช้จ่ายจริง
   - **กลยุทธ์โฟกัสหมวดเริ่มต้น (Phase-First Density):** เพื่อไม่ให้ข้อมูลบางกระจายหลายหมวด ช่วงเปิดตัวโฟกัส **3 หมวดหลักที่ใหญ่และมีโปรจริงต่อเนื่อง** ได้แก่ **`ที่พัก (STAY)`**, **`คาเฟ่ (CAFE)`** และ **`ร้านอาหาร & บาร์ (DINING / BAR)`** แล้วจึงทยอยเปิดหมวด **`สปา & เวลเนส (WELLNESS)`**, **`กิจกรรม & ที่เที่ยว (ACTIVITY)`**, **`เช่ารถ & เดินทาง`** เพิ่มเติมผ่านระบบ Dynamic Categories ใน `/admin/categories` โดยไม่ต้องแก้โค้ด
   - **รองรับทั้งร้านเดี่ยว, เชนดัง และบัตรเครดิต/แพลตฟอร์ม (`LocationScope`):**
     - `SINGLE_LOCATION` — ที่พัก/คาเฟ่/ร้านเดี่ยว 1 พิกัด (แสดงทั้ง `/`, หมุด `/explore`, จุดแวะ `/trip`)
     - `MULTI_BRANCH` — ร้านเชน/แบรนด์หลายสาขา เช่น KFC, Café Amazon, After You, Centara (`nondii.com/{slug}` เป็น Brand Hub + ปุ่มค้นหาสาขาใกล้ฉันบน Google Maps + ตาราง `PlaceBranch` สำหรับสาขาหลัก)
     - `NATIONWIDE_ONLINE` — โปรทั่วประเทศ/ออนไลน์/บัตรเครดิต/OTA เช่น KTC, Agoda, Klook, AirAsia (แสดงบน `/` และหน้า Brand Hub โดยไม่รกหมุดบน `/explore`)
2. **เครื่องยนต์ได้มาซึ่งโปรโมชั่น (Promotion Ingestion & Automation Engine):**
   - ใช้ **4 ท่อร่วมกัน** อย่างสมจริงและถูกกฎหมาย: (1) **Official Affiliate APIs** (Agoda Partner API / Involve Asia / ACCESSTRADE / Klook), (2) **Inbound Email Newsletter Parsing** (`deals@nondii.com` รับเมลโรงแรม & บัตรเครดิต → Gemini แกะโครงสร้าง), (3) **Merchant Self-Serve & Facebook Page Auto-Sync** (เจ้าของร้านเชื่อมเพจหรือโยนรูปโปสเตอร์โปร), (4) **AI Quick Promo Drop + Promo Inbox** ใน `/admin/promos` พร้อม **Auto-Expire Cron** ทุกเที่ยงคืน
   - **ระบบภาพการ์ดอัตโนมัติ 3 ชั้น (Zero Copyright Violation):** (1) Official Photo จาก Affiliate API / รูปโปรไฟล์ร้านสมาชิก, (2) **Dynamic Branded Promo Card (`next/og` / `satori`)** สร้างภาพการ์ดคูปองสไตล์ Nondii อัตโนมัติสำหรับโปรที่ดึงได้เฉพาะข้อมูล Text/โค้ด, (3) โครงข้อมูลชัดเจนใต้การ์ด `1:1` (หมวด · พาดหัวโปร · ช่วงวันที่/วันหมดอายุ)
3. **โมเดลธุรกิจและรายได้ (Dual-Engine Revenue):**
   - **ขาที่ 1 — Affiliate Commission (ทำเงินได้ตั้งแต่วันแรก):** จากดีลที่พัก/โรงแรม/กิจกรรมที่ดึงผ่าน Agoda, Involve Asia, ACCESSTRADE, Klook, Megatix
   - **ขาที่ 2 — Advertising & Sponsored Intent (ขยายระยะยาว):** ฟรีตลอดชีพ 0% GP สำหรับธุรกิจที่เปิดโปรไฟล์/จองตรง → ขาย `Promoted Promo Cards`, `Featured Deals`, และ `Sponsored AI Agent Priority`
4. **ผู้ใช้งาน 3 บทบาทหลัก (RBAC):**
   - `TRAVELLER` — ค้นหาและเก็บโปรเที่ยวไทยบน `/`, สำรวจแผนที่ `/explore`, เก็บหัวใจเข้า `/wishlist`, วางแผน/แชร์/คัดลอกทริปจริงบน `/trip`, และจองที่พักตรง 0% GP
   - `HOTEL_OWNER` *(ธุรกิจเรียก `MERCHANT_OWNER` / `PLACE_OWNER`)* — เจ้าของธุรกิจทุกประเภทและแบรนด์ สมัครที่ `/register`, จัดการงานโซเชียลและลงโปรด่วนจาก Owner Mode บน `/{slug}` และจัดการหลังบ้านใน `/studio` ที่ปรับเมนูตามโหมด
   - `SUPER_ADMIN` — ดูแลแพลตฟอร์มผ่าน **`/admin`** *(เปลี่ยน URL จาก `/super-admin` → `/admin` เพื่อความสะดวกในการจำ โดยออกแบบสถาปัตยกรรมตามต้นแบบ WeGlobal `my-shop`)*
5. **กฎเหล็กด้านข้อมูล & Agentic Web:**
   - **Strict Real-Database Policy**: ข้อมูลธุรกิจและโปรโมชั่นทั้งหมดมาจาก **Neon PostgreSQL (Prisma 7)** เท่านั้น ห้ามใช้ Mock Array หรือ `localStorage` เก็บข้อมูลธุรกิจ
   - **Agentic Web Ready**: Headless Service Layer (`src/lib/services/*`) + `Schema.org`, `/llms.txt`, `/.well-known/agent-card.json`, `/api/mcp`

---

## สารบัญเอกสารใน `CoreBusiness/` (v4.0 — Active Only)

| ลำดับไฟล์ | ชื่อเอกสาร | เนื้อหาหลัก |
| :--- | :--- | :--- |
| **[01-business-model-and-roles.md](./01-business-model-and-roles.md)** | โมเดลธุรกิจ Travel Promo Hub, `LocationScope` และสิทธิ์ 3 กลุ่ม | Positioning "ศูนย์รวมโปรเที่ยวไทย", โฟกัสหมวดเริ่มต้น, 3 `LocationScope`, 2 โหมดธุรกิจ (`PROFILE_ONLY`/`DIRECT_BOOKING`), โมเดลรายได้ Affiliate + Sponsored และ RBAC |
| **[02-page-architecture-and-ux-flows.md](./02-page-architecture-and-ux-flows.md)** | ผังโครงสร้างหน้าเว็บ, Home หมวดโปรโมชั่น, Modular `/{slug}` และ `/admin` | หน้าแรก `/` แบบ Promotion Category Tabs, `/{slug}` รองรับร้านเดี่ยว/เชน/บัตรเครดิต, Hybrid Owner Mode, Adaptive `/studio`, และ Active Routes ทั้งหมด (`/admin`) |
| **[03-database-schema-and-zero-mock-rules.md](./03-database-schema-and-zero-mock-rules.md)** | โครงสร้างฐานข้อมูล Neon Postgres & กฎห้ามใช้ Mock Data | ตารางจริงปัจจุบัน + ส่วนต่อขยาย `LocationScope`, `PlaceBranch`, `PromoInboxItem`, Dynamic `PlaceCategoryConfig`, `PlaceAttribute`, `SystemConfig`, `RoadTrip` |
| **[04-facebook-sync-and-agentic-standards.md](./04-facebook-sync-and-agentic-standards.md)** | ระบบดึงโปรโมชั่น Automation, ภาพอัตโนมัติ 3 ชั้น, Facebook Sync & Agentic Web | ความจริงทางเทคนิคของแต่ละท่อดึงโปร (Agoda/Involve Asia/Email/FB/AI Drop), 3-Tier Visuals & `next/og` Branded Card, Auto-Expire, Google Maps Guardrails และ MCP/A2A |
| **[05-place-profile-card-architecture.md](./05-place-profile-card-architecture.md)** | สถาปัตยกรรม การ์ด `1:1` แบบ Hybrid (Place Card × Campaign Promo Card) | กฎการ์ด `1:1` Super-Rounded, การแสดงช่วงวันที่/วันหมดอายุ, กฎ Hybrid สำหรับร้านเดี่ยว vs เชน/บัตรเครดิต, Shared Place Modal (1-Hop Lock) และแผนที่ `/explore` |
| **[06-traveller-trip-profile-and-road-routing.md](./06-traveller-trip-profile-and-road-routing.md)** | แยกขาด `Wishlist` (`/wishlist`) vs ระบบทริปเดินทางจริง (`/trip`) | Wishlist รูปหัวใจในเมนู `More` vs Public Road-Trip OSRM + Animation เส้นลาก + จุดแวะเด้งตามรายทาง + คูปองประหยัดงบทริปจากแบรนด์/บัตรเครดิต |
| **[07-phase-execution-roadmap.md](./07-phase-execution-roadmap.md)** | แผนปฏิบัติการทีละ Phase & Decision Log | สรุป Phase 0–3A ที่เสร็จแล้ว และแผน Phase 4A → 5 (`/admin` + Home Promo Tabs → WeGlobal-style Admin & Promo Inbox → Automation Connectors → Road-Trip 3B) |
| **[08-admin-control-plane-and-promo-automation.md](./08-admin-control-plane-and-promo-automation.md)** | พิมพ์เขียวระบบหลังบ้าน `/admin` (ถอดแบบสถาปัตยกรรม WeGlobal `my-shop`) | โครงสร้าง `/admin/*` ครบชุด, 5-File Module Pattern, Hover Sidebar + `.admin-page` Layout, Thailand Reach Map, Dynamic Categories (Miller Columns), AI Promo Drop & Inbox |
