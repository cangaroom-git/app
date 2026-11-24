# 04 — Facebook Auto-Sync, Google Maps Cost Guardrails และมาตรฐาน AI Agent สากล

## 1. ระบบซิงก์โพสต์จาก Facebook Page อัตโนมัติ (AI 3-Tier Smart Triage)

เจ้าของธุรกิจไทยเกือบทั้งหมดใช้ **Facebook Page** เป็นช่องทางอัปเดตหลัก Nondii จึงออกแบบระบบนำเข้าโพสต์อัตโนมัติ (Meta Pages Graph API) พร้อมการคัดกรอง **3 ระดับ** เพื่อไม่ให้โพสต์ขยะหลุดขึ้นฟีด:

| ระดับการคัดกรอง (Vision + Text AI) | ลักษณะโพสต์ที่พบ | การจัดการของระบบ |
| :--- | :--- | :--- |
| **Tier 3 — ไม่เกี่ยวกับสถานที่ (`Score < 40`)** | มีมตลก, แชร์ข่าว, คำคม, โพสต์แจ้งปิดปรับปรุงชั่วคราว, ตัวหนังสือล้วน | **ตัดทิ้งอัตโนมัติ (`DISCARDED`)** ไม่รบกวนเจ้าของ |
| **Tier 2 — ป้ายกราฟิกโปรโมชั่น (`Promo Graphic`)** | ภาพตัวหนังสือแน่นแจ้งส่วนลด/โค้ดโปร | **ไม่เอาภาพรกตาขึ้นหน้าการ์ด** แต่สกัดเงื่อนไขเป็น **Draft Coupon / Promo** รอเจ้าของกดเปิดใช้ |
| **Tier 1 — ภาพ/วิดีโอบรรยากาศจริง (`Score >= 85`)** | ภาพถ่ายสวยคมชัดของสถานที่ ห้องพัก อาหาร วิว หรือคลิปบรรยากาศ | AI เตรียมแคปชัน/แท็ก รอในถัง `PENDING_APPROVAL` ให้เจ้าของกด **`อนุมัติใน 1 คลิก`** (หรือเปิด Auto-Publish เฉพาะ Tier 1) |

### กฎความเป็นอิสระของสื่อและข้อมูล
- **อัปโหลดสื่อขึ้น CDN ของ Nondii เอง (Cloudinary)**: ห้ามอ้างอิงลิงก์ `fbcdn.net` โดยตรงเพราะลิงก์หมดอายุไว
- **Native Social Engagement**: Like, Comment, Save และ Share ทำงานบนฐานข้อมูลของ Nondii 100% ไม่ปนกับสแปมต้นทาง

---

## 2. การสื่อสารกับลูกค้า (Smart Direct Contact Handoff)

- เนื่องจาก Nondii เป็น WebApp ที่ไม่มี Push Notification ปลุกบนมือถือ และใช้โมเดล **0% GP** (ไม่ต้องกั้นลูกค้าไม่ให้คุยตรงกับร้าน):
  - **Phase 1–2**: ใช้ปุ่มติดต่อตรง (**LINE OA / Facebook Messenger / โทรศัพท์ / เว็บไซต์ร้าน**) พร้อมบันทึกสถิติลง `ContactClickLog` เพื่อให้เจ้าของเห็น ROI ชัดเจนใน `/studio` + ใช้ช่อง Comment สาธารณะบนโปรไฟล์สำหรับ Q&A
  - **Phase 3+**: ต่อยอดเป็น Place AI Concierge + LINE OA Webhook Bridge

---

## 3. กฎคุมต้นทุนและข้อกำหนดของ Google Places & Routing API

อ้างอิงจากสถาปัตยกรรมจริงใน `src/lib/geo/googlePlacesServer.ts` และ `src/lib/geo/thailandPlacesDb.ts`:

1. **แยก SKU ชัดเจนเพื่อไม่ให้ค่า API บานปลาย**:
   - **Pro SKU** (`id`, `displayName`, `primaryType`, `location`, `shortFormattedAddress`, `photos`): ใช้สำหรับค้นหาทั่วไปและ autocomplete
   - **Enterprise SKU** (`rating`, `userRatingCount`, `regularOpeningHours`, `websiteUri`): ราคาสูงกว่า Pro มาก — **ต้องใช้เฉพาะจุดที่มีมูลค่าสูงจริง** (เช่น การดึงสถานที่ Rating ดีระหว่างทางใน `/trip/[tripId]` เมื่อชั้นข้อมูลของเราเองและ Open Data ยังไม่พอ) และต้องคุมโควต้าผ่านตาราง `ApiQuotaUsage` เสมอ
2. **ปฏิบัติตาม Google Maps Platform Terms of Service (ToS)**:
   - สามารถเก็บ **`googlePlaceId`** ถาวรในฐานข้อมูลได้ (ใช้กันร้านซ้ำและอ้างอิงสถานที่)
   - **ห้าม Cache คะแนน `rating` หรือข้อความ `reviews` ของ Google แบบถาวร** เพื่อสร้างฐานข้อมูลรีวิวแข่งกับ Google — หากดึงคะแนนรีวิวจาก Google มาช่วยจัดอันดับ/แสดงผล ต้องดึงตามเงื่อนไขและแสดง Attribution ตามข้อกำหนด
3. **เส้นทางขับรถจริง (Driving Route Polyline)**:
   - ใช้ **OSRM / OpenStreetMap Routing** (หรือ Provider ที่คุ้มต้นทุน) เป็น Engine หลักในการวาดเส้นทางถนนจริงบน `MapLibre` และคำนวณระยะทาง/เวลาขับรถ พร้อม Cache ในฐานข้อมูล (`RouteGeometryCache`) เพื่อไม่ให้เกิดค่าใช้จ่ายสูงเมื่อมีผู้ใช้เปิดทริปเดิมซ้ำ

---

## 4. รากฐานมาตรฐานสากลสำหรับยุค AI Agent (Agentic Web Ready)

1. **Headless Service Layer (`src/lib/services/*`)**: หน้าเว็บ React และ Endpoint สำหรับ AI Agent เรียกใช้ Service ชุดเดียวกัน 100%
2. **Discovery Metadata**:
   - `GET /.well-known/agent-card.json` (มาตรฐาน A2A)
   - `GET /llms.txt`
   - JSON-LD `Schema.org` รายสถานที่บน `/{slug}` ที่ปรับ `@type` อัตโนมัติตาม 5 `PlaceCategory` (`LodgingBusiness`, `CafeOrCoffeeShop`, `Restaurant`, `TouristAttraction`, `HealthAndBeautyBusiness`)
3. **Model Context Protocol (`POST /api/mcp`)**:
   - Tools มาตรฐานสำหรับค้นหาสถานที่/ที่พักว่างจริง, ดูรายละเอียด `/{slug}`, ดึงคูปองที่ใช้ได้, และสร้าง Direct Checkout Deep Link แบบ Human-in-the-Loop
