# 04 — ระบบดึงโปรโมชั่น Automation, ภาพการ์ดอัตโนมัติ 3 ชั้น, Facebook Sync & Agentic Web (v4.0)

## 1. ความจริงทางเทคนิคของแต่ละท่อดึงโปรโมชั่น (Realistic Ingestion Strategy)

Nondii ออกแบบระบบได้มาซึ่งโปรโมชั่นบนฐานความเป็นจริงทางเทคนิคและกฎหมาย (ไม่พึ่ง Web Scraping ที่ผิด ToS หรือดูดรูปลิขสิทธิ์) โดยผสมผสาน **4 ท่อหลัก**:

| ท่อดึงข้อมูล | ระดับ Automation จริง | ข้อมูล & รูปภาพที่ได้ | เหมาะกับหมวดไหน |
| :--- | :--- | :--- | :--- |
| **ท่อ 1: Official Affiliate APIs & Feeds**<br>*(Agoda Partner API, Involve Asia, ACCESSTRADE, Klook, Megatix)* | **Auto 100%** *(หลังผ่าน Approve บัญชี)* | - **Agoda API**: ชื่อโรงแรม, พิกัด, **`imageURL` ถูกลิขสิทธิ์**, ราคาเดิมขีดฆ่า, ราคาโปร, `% ลด`, อาหารเช้า, `landingURL` ติด Affiliate<br>- **Involve Asia / ACCESSTRADE**: แคมเปญแบรนด์ใหญ่, โค้ดส่วนลด, วันหมดอายุ, Tracking Link | **`ที่พัก`** (แกนหลักที่ Auto ได้เต็มรูปแบบ) + โปรระดับแพลตฟอร์ม/บุฟเฟ่ต์/กิจกรรม |
| **ท่อ 2: Inbound Email Newsletter (`deals@nondii.com`)**<br>*(ผ่าน Resend / Postmark Inbound Webhook)* | **Auto 85–90%** *(AI แกะโครงสร้างเข้า Promo Inbox)* | ชื่อโปร, ส่วนลด, โค้ด, เงื่อนไข, **วันหมดอายุ** แม่นยำมากจากเครือโรงแรม, สายการบิน และ **บัตรเครดิต (KTC, SCB, KBank, Krungsri)** | **`ที่พัก`**, **`ร้านอาหาร & บาร์ (โรงแรม/บัตรเครดิต)`**, **`คาเฟ่เชน`** |
| **ท่อ 3: Merchant Self-Serve & Facebook Page Auto-Sync**<br>*(Meta Pages Graph API — เฉพาะร้านที่เจ้าของกดเชื่อมสิทธิ์ OAuth)* | **Auto 100% หลังร้านเชื่อมต่อ** | โพสต์จริง + รูปจริง + แคปชันจริงของร้าน (ถูกกฎหมาย 100% เพราะเจ้าของกดอนุญาต) ผ่าน **AI 3-Tier Triage** | **`คาเฟ่ท้องถิ่น`**, **`บาร์อิสระ`**, **`ที่พักอิสระ`** |
| **ท่อ 4: AI Quick Promo Drop + Community Tip**<br>*(ใน `/admin/promos` และฟอร์มส่งโปรสำหรับร้านค้า/LINE Bot)* | **Semi-Auto (10 วินาที/โปร)** | โยนรูปโปสเตอร์โปรหรือวางข้อความ/ลิงก์ → **Gemini Vision + Structured JSON** อ่านและกรอกทุกช่อง + จับคู่ร้านเดิมให้อัตโนมัติ | **ทุกหมวด** (ตัวเร่งความเร็วช่วงเริ่มต้นสำหรับคาเฟ่/บาร์ที่ไม่มี API) |

> **ข้อเท็จจริงที่ต้องเคารพ:**
> - Meta **ไม่อนุญาต** ให้ดูดโพสต์จากเพจ Facebook อื่นที่เราไม่ได้เป็นแอดมิน (Facebook Sync ใช้ได้เฉพาะร้านที่เชื่อมสิทธิ์แล้วเท่านั้น)
> - คาเฟ่และบาร์ท้องถิ่นส่วนใหญ่ไม่มี API กลาง จึงต้องใช้ **ท่อ 3 + ท่อ 4** ควบคู่กับ **ท่อ 1 + ท่อ 2** (ที่พัก, บุฟเฟ่ต์โรงแรม, รูฟท็อปบาร์, โปรบัตรเครดิต) เพื่อให้หน้าแรก `/` มีโปรใหม่สดตลอดเวลา

---

## 2. AI Promotion Extraction & Auto-Freshness Lifecycle

### 2.1 AI 3-Tier Smart Triage (ใช้ร่วมกันทั้ง Facebook Sync, Email และ Poster Drop)
| ระดับการคัดกรอง (Gemini Vision + Text) | ลักษณะข้อมูลที่พบ | การจัดการของระบบ |
| :--- | :--- | :--- |
| **Tier 3 — ไม่ใช่โปร/ไม่เกี่ยวกับสถานที่ (`Score < 40`)** | มีม, ข่าวทั่วไป, แจ้งปิดปรับปรุง, โพสต์ไม่เกี่ยวกับท่องเที่ยว | ตัดทิ้งอัตโนมัติ (`DISCARDED`) |
| **Tier 2 — โปสเตอร์โปรโมชั่น / อีเมลดีล (`Promo Extraction`)** | ป้ายส่วนลด, โค้ดโปร, โปรบัตรเครดิต, แพ็กเกจห้องพัก | สกัดเป็น JSON มาตรฐาน (`titleTh`, `promoCode`, `discountLabelTh`, `startsAt`, `expiresAt`, `promoCategoryCode`, `locationScope`) → จับคู่ `Hotel` เดิม + เช็ก `dedupeHash` → ส่งเข้า **`Promo Inbox`** |
| **Tier 1 — ภาพ/วิดีโอบรรยากาศจริง (`Score >= 85`)** | ภาพถ่ายสวยคมชัดของสถานที่/ห้องพัก/อาหาร/กาแฟ (จากร้านที่เชื่อมเพจ) | เตรียมขึ้นโปรไฟล์ `/{slug}` + CDN Cloudinary รอเจ้าของกด **`อนุมัติใน 1 คลิก`** |

### 2.2 Auto-Expire & Freshness Guardrail (Cron รายวัน — หัวใจความน่าเชื่อถือ)
- **ทุกโปรโมชั่นต้องมีวันหมดอายุ (`promoExpiresAt`)** (หรือรอบตรวจอายุสำหรับดีลไม่ระบุวัน)
- **Nightly Auto-Expire Cron (`/api/cron/expire-promos`):**
  1. ปิดการแสดงผลโปรที่เลย `promoExpiresAt` ออกจากหน้าแรก `/` (หรือย้ายสถานะเป็น `EXPIRED` เหมือนป้าย `หมดอายุ` ของปันโปรบนหน้าประวัติ)
  2. หากการ์ดสถานที่เดี่ยวมีโปรหลักหมดอายุ ระบบจะสลับโปรรองที่ยัง Active ขึ้นมาแสดงแทนอัตโนมัติ (หรือถอดป้ายโปรออกเหลือเป็นการ์ดสถานที่ปกติ)
  3. **Weekly Link Health Check:** ตรวจ HTTP status ของ `externalDealUrl` หากเสีย (404/5xx) ซ่อนโปรและแจ้งเตือนใน `/admin/ingestion`

---

## 3. ระบบภาพการ์ดอัตโนมัติ 3 ชั้น (3-Tier Automated Visuals — ถูกกฎหมาย 100%)

เพื่อแก้ปัญหา *"ดึงได้เฉพาะข้อมูล Text/โค้ด แต่ไม่มีรูปถ่าย"* โดยไม่ละเมิดลิขสิทธิ์และไม่ต้องใช้กราฟิกตัดต่อมือ:

1. **Tier 1 — Official Photo (ภาพจริงถูกลิขสิทธิ์ — ใช้เป็นหลัก):**
   - **Affiliate API (Agoda / Partner Feed):** ใช้ `imageURL` ความละเอียดสูงจาก CDN ของพาร์ทเนอร์ตามเงื่อนไข Affiliate
   - **ร้านสมาชิก Nondii (`SINGLE_LOCATION` / `MULTI_BRANCH`):** อัปโหลดรูปบรรยากาศร้าน (`coverImageUrl`) ครั้งเดียวบนโปรไฟล์ → ทุกโปรใหม่ของร้านนั้น **ดึงรูปเดิมมาใช้ซ้ำอัตโนมัติ** เปลี่ยนเฉพาะพาดหัวโปรและช่วงวันที่ใต้ภาพ
2. **Tier 2 — Dynamic Branded Promo Card (`next/og` / `satori` — สร้างภาพการ์ดอัตโนมัติด้วยโค้ด):**
   - สำหรับโปรที่ไม่มีรูปถ่าย (เช่น โค้ดส่วนลด Agoda/Klook, โปรบัตรเครดิต KTC/SCB, โปรจาก Email Newsletter)
   - ระบบสร้างภาพการ์ด `1:1` สไตล์ Nondii อัตโนมัติ (พื้นสีสะอาดโทน Travel-Blue / สีหมวด + โลโก้แบรนด์/บัตร + ตัวเลขส่วนลดใหญ่คมชัด เช่น **`ลดสูงสุด 25%`** + ป้ายช่วงวันที่) → สวยเป็นระเบียบคล้ายคูปองใน Apple Wallet และไม่ละเมิดลิขสิทธิ์รูปถ่ายใดๆ
3. **Tier 3 — Curated Owned Fallback Library:**
   - คลังภาพบรรยากาศที่ Nondii มีสิทธิ์ใช้งานเชิงพาณิชย์ แยกตาม **หมวด × จังหวัด** ใช้เป็นแผนสำรองเฉพาะกรณีจำเป็น (ระบุชัดว่าเป็นภาพประกอบบรรยากาศจนกว่าร้านจะ Claim ใส่รูปจริง)

- **กฎความเป็นอิสระของสื่อ:** สื่อจาก Facebook Sync ที่ร้านอนุมัติต้องโอนขึ้น **Cloudinary CDN** ของ Nondii เอง ห้ามอ้างอิงลิงก์ `fbcdn.net` ตรงเพราะลิงก์หมดอายุไว

---

## 4. Direct Contact Handoff, Google Maps Cost Guardrails & Agentic Web

1. **Direct Contact Handoff:** ปุ่มติดต่อตรง (`LINE OA` / `Facebook Messenger` / `โทร` / `เว็บไซต์จองตรง`) พร้อมเก็บสถิติใน `ContactClickLog` ให้เจ้าของเห็น ROI จริงใน `/studio`
2. **Google Maps Cost Guardrails (`src/lib/geo/googlePlacesServer.ts`):**
   - แยก **Pro SKU** vs **Enterprise SKU** ชัดเจน และคุมโควต้าผ่าน `ApiQuotaUsage`
   - เก็บ `googlePlaceId` ได้ถาวร แต่ **ห้าม Cache คะแนน `rating` หรือข้อความ `reviews` ของ Google แบบถาวร** ตาม ToS
   - ใช้ **OSRM ฟรี + `RouteGeometryCache`** สำหรับเส้นทางขับรถจริงใน `/trip` และใช้ลิงก์ `google.com/maps/search/?api=1&query=...` (ฟรี 100%) สำหรับปุ่ม `"หาสาขาใกล้ฉัน"` ของแบรนด์เชน
3. **Agentic Web Ready:**
   - Headless Service Layer (`src/lib/services/*`) ใช้ร่วมกันระหว่างเว็บและ AI Agent
   - Discovery Endpoints: `GET /.well-known/agent-card.json` (A2A), `GET /llms.txt`, `POST /api/mcp`, และ JSON-LD `Schema.org` รายสถานที่/โปรโมชั่น (`Offer`, `LodgingBusiness`, `CafeOrCoffeeShop`, `Restaurant`, `BarOrPub`, `TouristAttraction`, `HealthAndBeautyBusiness`)
