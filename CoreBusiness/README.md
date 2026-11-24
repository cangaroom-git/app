# Nondii (`nondii.com`) — Core Business & Architecture Blueprint (`CoreBusiness/`)

> **MANDATORY SOURCE OF TRUTH FOR ALL AI AGENTS & DEVELOPERS**
> เอกสารทั้งหมดในโฟลเดอร์ `CoreBusiness/` นี้คือ **พิมพ์เขียวหลักฉบับปัจจุบัน (Single Source of Truth)** ของแพลตฟอร์ม **Nondii (`nondii.com`)**
> - **กฎเหล็กด้าน UI/UX**: ก่อนแก้ไขหรือสร้างหน้าเว็บใดๆ ต้องอ่านและปฏิบัติตาม `.agents/skills/my-hotel-design-system/SKILL.md` และ `AGENTS.md` อย่างเคร่งครัด โดยเฉพาะกฎ **ห้ามใช้ `hover:scale-*`**, **Minimal Borders**, **Unified Airbnb Inset-Label Inputs**, **Zero Card Shadows** และ **Smooth Fade Slide-In/Out**
> - **กฎเหล็กด้าน Workspace**: ห้ามแก้ไขไฟล์ใดๆ นอก `my-hotel` (ห้ามยุ่งกับ `weglobal` โดยเด็ดขาด)

---

## สรุปภาพรวม Nondii ใน 1 นาที (TL;DR)

1. **Nondii (`nondii.com`) คืออะไร?**
   - **Travel Place Social + 0% GP Direct Booking Hub** ของประเทศไทย ที่รวม 5 ประเภทสถานที่ท่องเที่ยว (`STAY`, `CAFE`, `RESTAURANT`, `ATTRACTION`, `WELLNESS`) ไว้ในรูปแบบ **การ์ดสะสมแนวตั้ง `3:4` (1 Place = 1 Canonical Card)** เชื่อมต่อระหว่าง:
     - **หน้าฟีด & แผนที่สำรวจ (`/`, `/explore`)**: ค้นหาสถานที่และโปรโมชั่นสวยๆ ตามจังหวัด/สไตล์/พิกัด
     - **หน้าโปรไฟล์สถานที่ (`/{slug}`)**: โครงสร้างหน้าตาหลักแบบ **Unified Social Profile (เหมือน Facebook Page)** ที่ทุกธุรกิจใช้ร่วมกันได้ และเปิด/ปิดโมดูลเสริมตามความต้องการ (เช่น โมดูลจองตรง 0% GP สำหรับที่พัก)
     - **ระบบ `Wishlist` (`/wishlist` ในเมนู `More`)**: กดหัวใจเก็บการ์ดที่ถูกใจ (เฉพาะคนล็อกอิน) แยกหมวดอัตโนมัติ (`ที่พัก/คาเฟ่/ร้านอาหาร/ที่เที่ยว/สปา`) + Custom Boards
     - **ระบบสร้างทริปเดินทางจริง (`/trip`, `/trip/[tripId]` — Public First)**: ไม่ต้องล็อกอินก็ดูทริปคนอื่นได้ เลือกต้นทาง–ปลายทาง เล่น Animation เส้นถนนขับรถจริง (OSRM ฟรี) + จุดแวะแนะนำเด้งตามรายทาง (Nondii Places + `ThailandPlace` OSM) และปรับเปลี่ยนจุดแวะ/ที่พักปลายทางได้อิสระ
2. **โมเดลธุรกิจและรายได้ (Free Forever 0% GP → Sponsored Ads)**:
   - **เปิดโปรไฟล์ฟรีตลอดชีพ & จองตรง 0% GP**: ทุกธุรกิจเปิดหน้า `nondii.com/{slug}` ได้ฟรี (ไม่หักค่าคอมมิชชัน ไม่มีวันหมดอายุ) โดยโรงแรมที่มีเว็บจองเองอยู่แล้วสามารถเลือกโหมด `PROFILE_ONLY` เพื่อรับ Traffic โดยไม่ต้องเปลี่ยนระบบจองเดิม
   - **รายได้หลัก**: ค่าโฆษณาและพื้นที่โปรโมท (`SponsoredCampaign` — Promoted Cards, Featured Promotions, Sponsored AI Agent Priority)
3. **ผู้ใช้งาน 3 บทบาทหลัก (RBAC)**:
   - `TRAVELLER` — สำรวจสถานที่, กด Like/Comment/Save, จัดทริปพร้อมเส้นทางขับรถจริงบน `/trip`, แชร์/คัดลอกทริป, และจองที่พักตรง 0% GP
   - `PLACE_OWNER` *(enum `HOTEL_OWNER` ใน DB)* — เจ้าของธุรกิจทั้ง 5 ประเภท สมัครผ่านหน้าเดียว (`/register`), จัดการงานโซเชียล/โปรไฟล์เบาๆ ได้จาก `/{slug}` (Owner Mode) และจัดการงานหลังบ้าน/จองตรงใน `/studio` ที่ปรับเมนูตามประเภทธุรกิจ
   - `SUPER_ADMIN` — ยืนยันตัวตนสถานที่จริง (`VERIFIED`), ดูแลคิวรายงานสแปม (`PlaceReport`), จัดการแคมเปญโฆษณา และตั้งค่าจังหวัด/ภูมิภาคที่ `/super-admin`
4. **กฎเหล็กด้านข้อมูล & Agentic Web**:
   - **Strict Real-Database Policy**: ข้อมูลธุรกิจทั้งหมดต้องมาจาก **Neon PostgreSQL (Prisma)** เท่านั้น ห้ามใช้ Mock Array หรือ `localStorage` เก็บข้อมูลธุรกิจ
   - **Agentic Web Ready**: แยก Headless Service Layer (`src/lib/services/*`) พร้อมมาตรฐาน `Schema.org`, `/llms.txt`, `/.well-known/agent-card.json` และ `/api/mcp`

---

## สารบัญเอกสารใน `CoreBusiness/` (v3.0 — Active Only)

| ลำดับไฟล์ | ชื่อเอกสาร | เนื้อหาหลัก |
| :--- | :--- | :--- |
| **[01-business-model-and-roles.md](./01-business-model-and-roles.md)** | โมเดลธุรกิจ กลยุทธ์ดึงผู้ประกอบการ และสิทธิ์ 3 กลุ่ม | 5 ประเภทสถานที่, 2 โหมดธุรกิจ (`DIRECT_BOOKING` / `PROFILE_ONLY`), 4 จุดตัดสินใจชวนธุรกิจที่มี FB/เว็บจองอยู่แล้ว, โมเดลรายได้โฆษณา และ RBAC |
| **[02-page-architecture-and-ux-flows.md](./02-page-architecture-and-ux-flows.md)** | ผังโครงสร้างหน้าเว็บ Unified `/register`, `/{slug}` และ `/studio` | สถาปัตยกรรม "Unified Social Profile + Opt-in Modules", Hybrid Owner Mode บน `/{slug}`, Adaptive `/studio` ตามประเภทธุรกิจ และ URL มาตรฐานทั้งหมด |
| **[03-database-schema-and-zero-mock-rules.md](./03-database-schema-and-zero-mock-rules.md)** | โครงสร้างฐานข้อมูล Neon Postgres & กฎห้ามใช้ Mock Data | ตารางจริงทั้งหมดใน `prisma/schema.prisma`, โครงสร้างข้อมูลที่เตรียมไว้สำหรับ Road-Trip Routing, และกฎ Neon Pooled vs Direct |
| **[04-facebook-sync-and-agentic-standards.md](./04-facebook-sync-and-agentic-standards.md)** | Facebook Auto-Sync, Google Maps Cost Guardrails & AI Agent | AI 3-Tier Triage ดึงโพสต์ FB, Direct Contact Handoff, กฎคุมงบ/ToS ของ Google Places & Routes API, และสเปก MCP/A2A |
| **[05-place-profile-card-architecture.md](./05-place-profile-card-architecture.md)** | สถาปัตยกรรม 1 การ์ด = 1 สถานที่ & Minimal Collectible Card | กฎ Canonical Card `3:4`, 5 Category Crests, Shared Place Modal (1-Hop Lock), `/explore` Smart Map & Anti-Spam |
| **[06-traveller-trip-profile-and-road-routing.md](./06-traveller-trip-profile-and-road-routing.md)** | แยกขาด `Wishlist` (`/wishlist`) vs ระบบทริปเดินทางจริง (`/trip`) | Wishlist รูปหัวใจในเมนู More (Auto-Category + Boards) vs Public Road-Trip OSRM + Animation เส้นลาก + จุดแวะเด้งตามรายทาง |
| **[07-phase-execution-roadmap.md](./07-phase-execution-roadmap.md)** | แผนปฏิบัติการทีละ Phase & Decision Log | ลำดับการพัฒนา Phase 1 → Phase 4 (Unified `/register` & Adaptive `/studio` → Hybrid Owner Mode → `/trip` → Claim & Growth) |
