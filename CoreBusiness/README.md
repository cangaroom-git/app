# Cangaroom — Core Business & Architecture Blueprint (`CoreBusiness/`)

> **MANDATORY SOURCE OF TRUTH FOR ALL AI AGENTS & DEVELOPERS**
> เอกสารทั้งหมดในโฟลเดอร์ `CoreBusiness/` นี้คือ **พิมพ์เขียวหลักฉบับปัจจุบัน (Single Source of Truth)** ของแพลตฟอร์ม **Cangaroom**
> - **ยกเลิกโมเดลธุรกิจเก่าทั้งหมด**: ห้ามยึดตามเอกสารเก่าในโฟลเดอร์ `plan/` (โมเดลเก็บค่าเช่า SaaS 12,000 บาท/ปี หรือทดลองใช้ฟรี 30 วัน) และห้ามยึดตาม `booking-flow.md` (โมเดลเว็บไซต์ของรีสอร์ทสะปันอันซีนเพียงแห่งเดียว)
> - **กฎเหล็กด้าน UI/UX**: ก่อนแก้ไขหรือสร้างหน้าเว็บใดๆ ต้องอ่านและปฏิบัติตาม `.agents/skills/my-hotel-design-system/SKILL.md` และ `AGENTS.md` อย่างเคร่งครัด โดยเฉพาะกฎ **ห้ามใช้ `hover:scale-*` หรือขยายขนาดเมื่อชี้เมาส์ทั่วทั้งเว็บไซต์โดยเด็ดขาด**

---

## สรุปภาพรวม Cangaroom ใน 1 นาที (TL;DR for AI Agents)

1. **Nondii (Cangaroom) คืออะไร?**
   - **ศูนย์รวมคูปองและโปรโมชั่นที่พักสวยทั่วไทย** ที่รวบรวมทั้ง **โปรจองตรง 0% GP จากพาร์ทเนอร์บนเว็บเรา (`INTERNAL` -> `/{hotelSlug}`)** และ **ดีล/ส่วนลดคัดพิเศษจากเว็บภายนอก (`EXTERNAL` -> ไทยเที่ยวไทย, Megatix, Agoda, Klook, Trip.com, เว็บตรงโรงแรม)** ในรูปแบบ **การ์ดคูปองแนวตั้ง (Vertical Ticket Card)** บนโครงสร้างหน้าแรกแบบ Airbnb (`/` + แผนที่ซูมเปลี่ยนรายการ `/explore`) และระบบบันทึกคูปองเข้า `/board` (ยกเลิกหน้า `/deal` และกระเป๋าคูปองแยกซ้ำซ้อน)
2. **โมเดลรายได้ (0% GP Forever -> Sponsored Ads)**:
   - **เปิดใช้ฟรีตลอดชีพ 0% GP**: เจ้าของที่พักเปิดโปรไฟล์ `cangaroom.com/{hotelSlug}` พร้อมระบบจองห้อง ปฏิทินห้องว่าง ระบบตรวจสลิปชำระเงินตรง และคูปองส่วนลดได้ **ฟรี ไม่มีวันหมดอายุ และไม่หักค่าคอมมิชชัน (0% GP)** เพื่อดึงที่พักทั่วไทยเข้ามาเป็น Supply หลักของแพลตฟอร์ม
   - **รายได้หลักมาจากค่าโฆษณา (Promoted Pins & Featured Deals)**: โรงแรมที่ต้องการดัน Pin รูป/วิดีโอขึ้นอันดับต้นๆ บนหน้าแรก (`/`), หน้าค้นหาตามจังหวัด/สไตล์, หน้าคูปอง (`/deal`), หรือติดอันดับแนะนำในระบบ AI Agent จะจ่ายเงินค่าโฆษณา (Sponsored Boost)
3. **ผู้ใช้งาน 3 กลุ่มหลัก (3 Core Roles)**:
   - `TRAVELLER` — ค้นหาที่พัก กดบันทึก Pin เข้า `/board` เพื่อติดตามราคา/โปรโมชั่น เก็บคูปองจาก `/deal` เข้ากระเป๋า และจองตรงกับที่พัก
   - `HOTEL_OWNER` — บริหารหน้าร้าน `cangaroom.com/{hotelSlug}` ของตัวเองผ่านหน้า `/studio` เชื่อมต่อ **Facebook Page Auto-Sync** เพื่อดึงโพสต์รูป/คลิปมาสร้าง Pin โดยไม่ต้องอัปโหลดซ้ำ จัดการห้องว่าง/ใบจอง และซื้อโฆษณาโปรโมทที่พัก
   - `SUPER_ADMIN` — ตรวจสอบยืนยันตัวตนที่พักจริง (`Verified Stay` ป้องกันเพจปลอมมิจฉาชีพ) จัดการผู้ใช้งาน คัดกรองเนื้อหา และบริหารแคมเปญโฆษณาที่หน้า `/super-admin`
4. **กฎเหล็กด้านข้อมูล (Strict Real-Database Policy)**:
   - ข้อมูลทุกชิ้นที่แสดงบนหน้าเว็บต้องดึงจาก **ฐานข้อมูลจริง (Neon PostgreSQL ผ่าน Prisma)** เท่านั้น ห้ามซ่อนปัญหาด้วยการใช้ Mock Array ในฝั่ง Client หรือเก็บข้อมูลธุรกิจหลักไว้ใน `localStorage` / JSONB ก้อนเดียวอีกต่อไป
5. **รากฐานพร้อมรับยุค AI Agent (Agentic Web Ready)**:
   - โครงสร้างฐานข้อมูลและ Backend API ต้องแยกออกจาก UI อย่างสะอาด (Headless API-First) พร้อมเปิดมาตรฐานสากล (`Schema.org`, `llms.txt`, `/.well-known/agent-card.json` ตามโปรโตคอล A2A และ `/api/mcp` ตามมาตรฐาน MCP) เพื่อให้ AI ผู้ช่วยส่วนตัวเชื่อมต่อค้นหาห้องว่างและส่งลิงก์จองตรงได้ตั้งแต่เฟสแรก

---

## สารบัญเอกสารใน `CoreBusiness/`

| ลำดับไฟล์ | ชื่อเอกสาร | เนื้อหาสำคัญที่ AI Agent ต้องอ่านเมื่อทำงานส่วนนั้น |
| :--- | :--- | :--- |
| **[01-business-model-and-roles.md](./01-business-model-and-roles.md)** | โมเดลธุรกิจ วงล้อการเติบโต และสิทธิ์ผู้ใช้งาน 3 กลุ่ม | กลไกตัวล่อ 0% GP, ระบบโอนเงินตรงเข้าบัญชีโรงแรม + ตรวจสลิป, ป้าย Verified Stay กันเพจปลอม, โมเดลรายได้โฆษณา และตารางสิทธิ์ RBAC |
| **[02-page-architecture-and-ux-flows.md](./02-page-architecture-and-ux-flows.md)** | ผังโครงสร้างหน้าเว็บ URL มาตรฐาน และหน้าที่ต้องตัดทิ้ง | สเปกรายหน้าของ `/`, `/board`, `/deal`, `/trips`, `/{hotelSlug}`, `/register-hotel`, `/studio`, `/super-admin` และรายชื่อหน้าเก่าที่ห้ามสร้างซ้ำ |
| **[03-database-schema-and-zero-mock-rules.md](./03-database-schema-and-zero-mock-rules.md)** | โครงสร้างฐานข้อมูล PostgreSQL & กฎห้ามใช้ Mock Data | Relational Schema ครบทุกตารางบน Neon Postgres + Prisma, การทำ Indexing, การเชื่อม Pooled vs Direct URL และการยกเลิก `localStorage` Store |
| **[04-facebook-sync-and-agentic-standards.md](./04-facebook-sync-and-agentic-standards.md)** | ระบบดึงโพสต์ Facebook อัตโนมัติ & มาตรฐาน AI Agent สากล | ระบบคัดกรองโพสต์ Facebook ด้วย AI 3 ระดับ (กันโพสต์ตลก/ข่าวไม่เกี่ยว) และสเปก `MCP Server` + `agent-card.json` สำหรับยุค Agent-to-Agent |
| **[05-system-surgery-master-plan.md](./05-system-surgery-master-plan.md)** | แผนปฏิบัติการผ่าตัดระบบ เคลียร์โค้ดเก่า และผูก DB จริง | ลำดับขั้นการลบไฟล์ที่ไม่ได้ใช้ การรื้อระบบเก่าออกทีละส่วน การย้ายขึ้นฐานข้อมูลจริง และการตรวจสอบหาข้อผิดพลาดแบบ End-to-End |
| **[06-ugc-trip-board-and-card-motion.md](./06-ugc-trip-board-and-card-motion.md)** | แผนพัฒนา UGC Trip Board, Smart Day Timeline & Card Motion UI *(Draft)* | แผนสร้างวงล้อ UGC (Place/Stay Cards อิสระ + Day Timeline คำนวณเวลาเดินทางจาก Google Maps & Weather) และสเปก Card Motion Animation 2 รูปแบบจาก Dribbble |
| **[07-place-profile-card-architecture.md](./07-place-profile-card-architecture.md)** | สถาปัตยกรรม 1 การ์ด = 1 โปรไฟล์สถานที่ & Minimal Collectible Travel Card *(Active)* | โมเดล 5 ประเภทสถานที่ (`STAY/CAFE/RESTAURANT/ATTRACTION/WELLNESS`), เจ้าของ 2 กลุ่ม (`/register`), การ์ดสะสม `3:4`, Shared Place Modal 1-Hop Lock, Smart Map & Anti-Spam |

