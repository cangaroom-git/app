import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("Missing DIRECT_URL or DATABASE_URL in environment.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CLOUDINARY_SAPAN_HERO =
  "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838919/my-hotel/hero/obxqa4pz2mbziitzrgop.webp";

async function main() {
  console.log("Seeding Cangaroom Neon PostgreSQL database...");

  // 1. Seed core platform users (Super Admin + Hotel Owners + Traveller)
  const adminUser = await prisma.user.upsert({
    where: { email: "cangaroomapp@gmail.com" },
    update: {
      name: "Cangaroom Official",
      role: "SUPER_ADMIN",
      phone: "095-779-7971",
    },
    create: {
      email: "cangaroomapp@gmail.com",
      name: "Cangaroom Official",
      role: "SUPER_ADMIN",
      phone: "095-779-7971",
    },
  });

  const ownerAndaman = await prisma.user.upsert({
    where: { email: "owner.andaman@cangaroom.com" },
    update: { name: "คุณธนกฤต · อันดามัน คลิฟ", role: "HOTEL_OWNER" },
    create: {
      email: "owner.andaman@cangaroom.com",
      name: "คุณธนกฤต · อันดามัน คลิฟ",
      role: "HOTEL_OWNER",
      phone: "081-445-8899",
    },
  });

  const ownerMoncham = await prisma.user.upsert({
    where: { email: "owner.moncham@cangaroom.com" },
    update: { name: "คุณพิมลวรรณ · ม่อนแจ่ม ออนเซ็น", role: "HOTEL_OWNER" },
    create: {
      email: "owner.moncham@cangaroom.com",
      name: "คุณพิมลวรรณ · ม่อนแจ่ม ออนเซ็น",
      role: "HOTEL_OWNER",
      phone: "089-772-3311",
    },
  });

  const demoTraveller = await prisma.user.upsert({
    where: { email: "traveller.demo@cangaroom.com" },
    update: { name: "คุณมิ้นท์ สายเที่ยวไทย", role: "TRAVELLER" },
    create: {
      email: "traveller.demo@cangaroom.com",
      name: "คุณมิ้นท์ สายเที่ยวไทย",
      role: "TRAVELLER",
      phone: "086-991-2244",
    },
  });

  const now = new Date();
  const nextYear = new Date(now.getTime() + 180 * 86400000);

  // 2. Seed 6 Verified Thai Properties across all 6 stay styles
  const sapanHotel = await prisma.hotel.upsert({
    where: { slug: "sapanunseen" },
    update: {},
    create: {
      slug: "sapanunseen",
      ownerId: adminUser.id,
      nameTh: "สะปัน อันซีน น่าน",
      nameEn: "Sapan Unseen Nan",
      taglineTh: "วิลล่าทรง A-Frame กลางทะเลหมอกสะปัน พร้อมอ่างแช่น้ำชมขุนเขา 180°",
      taglineEn: "A-Frame mountain villas & outdoor soaking tubs in Sapan Valley, Nan",
      descriptionTh:
        "ที่พักบูทีคกลางหุบเขาหมู่บ้านสะปัน อ.บ่อเกลือ จ.น่าน ออกแบบเพื่อการพักผ่อนท่ามกลางหมอกเช้าและเสียงลำธาร พร้อมบริการหมูกระทะริมระเบียงและอาหารเช้าเสิร์ฟถึงห้อง",
      descriptionEn:
        "Intimate mountain retreat in Sapan Valley, Nan featuring panoramic mist terraces, private outdoor tubs, and locally sourced morning breakfast.",
      logoUrl: CLOUDINARY_SAPAN_HERO,
      coverImageUrl: CLOUDINARY_SAPAN_HERO,
      provinceId: "nan",
      districtTh: "อ.บ่อเกลือ",
      addressTh: "หมู่บ้านสะปัน ต.ดงพญา อ.บ่อเกลือ จ.น่าน 55220",
      latitude: 19.1932,
      longitude: 101.1924,
      googleMapsUrl: "https://maps.google.com/?q=19.1932,101.1924",
      stayStyles: ["mountain", "bathtub"],
      checkInTime: "14:00",
      checkOutTime: "11:00",
      petsAllowed: false,
      petPolicyTh: "งดนำสัตว์เลี้ยงเข้าพักเพื่อรักษาความสงบของหุบเขา",
      highlightsJson: [
        { titleTh: "ทะเลหมอกหน้าบ้าน", descTh: "ชมหมอกยามเช้าจากระเบียงได้ทุกหลัง" },
        { titleTh: "อ่างแช่น้ำอุ่นส่วนตัว", descTh: "ตีฟองบาธบอมบ์ชมวิวภูเขา" },
        { titleTh: "รวมอาหารเช้าถึงห้อง", descTh: "เสิร์ฟข้าวต้มร้อน กาแฟดริปน่าน 08:00 น." },
      ],
      nearbySpotsJson: [
        { nameTh: "จุดชมวิวหยุดเวลา", distTh: "ขับรถ 4 นาที" },
        { nameTh: "น้ำตกสะปัน", distTh: "ขับรถ 6 นาที" },
        { nameTh: "บ่อเกลือสินเธาว์โบราณ", distTh: "ขับรถ 12 นาที" },
      ],
      faqJson: [
        {
          qTh: "เช็กอิน-เช็กเอาต์กี่โมง?",
          aTh: "เช็กอินได้ตั้งแต่ 14:00 น. และเช็กเอาต์ก่อน 11:00 น. ครับ",
        },
        {
          qTh: "รถเก๋งขับขึ้นมาถึงที่พักไหม?",
          aTh: "ถนนลาดยางสะดวกตลอดสาย รถเก๋งทุกขนาดขับมาจอดถึงหน้ารีสอร์ทได้เลย",
        },
      ],
      contactPhone: "095-779-7971",
      contactLine: "@sapanunseen",
      facebookPageUrl: "https://facebook.com/sapanunseen",
      instagramUrl: "https://instagram.com/sapanunseen",
      promptPayId: "0957797971",
      promptPayAccountName: "สะปัน อันซีน น่าน (Sapan Unseen)",
      bankName: "กสิกรไทย",
      bankAccountNo: "088-2-94120-1",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.9,
      reviewCount: 42,
    },
  });

  const andamanHotel = await prisma.hotel.upsert({
    where: { slug: "andaman-cliff-phuket" },
    update: {},
    create: {
      slug: "andaman-cliff-phuket",
      ownerId: ownerAndaman.id,
      nameTh: "อันดามัน คลิฟ พูลวิลล่า ภูเก็ต",
      nameEn: "Andaman Cliff Pool Villa Phuket",
      taglineTh: "พูลวิลล่าส่วนตัวริมผาหาดกมลา ชมพระอาทิตย์ตกทะเลอันดามัน 180°",
      taglineEn: "Private cliffside infinity pool villas overlooking Kamala Bay",
      descriptionTh:
        "พูลวิลล่าหรูส่วนตัวบนเนินผาหาดกมลา จ.ภูเก็ต สระว่ายน้ำไร้ขอบส่วนตัวทุกหลัง พร้อมบริการ Floating Breakfast และรถรับส่งหาด",
      descriptionEn:
        "Luxurious ocean-facing private pool villas in Kamala, Phuket with sunset infinity edges and floating breakfast.",
      logoUrl:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=600&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1400&q=85",
      provinceId: "phuket",
      districtTh: "หาดกมลา อ.กะทู้",
      addressTh: "99/14 ถ.กมลา-ป่าตอง ต.กมลา อ.กะทู้ จ.ภูเก็ต 83150",
      latitude: 7.9519,
      longitude: 98.2773,
      googleMapsUrl: "https://maps.google.com/?q=7.9519,98.2773",
      stayStyles: ["pool-villa", "sea"],
      petsAllowed: false,
      nearbySpotsJson: [
        { nameTh: "หาดกมลา", distTh: "ขับรถ 5 นาที" },
        { nameTh: "จุดชมวิวแหลมสิงห์", distTh: "ขับรถ 8 นาที" },
      ],
      faqJson: [
        {
          qTh: "สระว่ายน้ำเป็นระบบเกลือหรือไม่?",
          aTh: "ทุกวิลล่าเป็นสระระบบเกลือส่วนตัว ไม่แสบตาและชมวิวทะเลได้เต็มสายตาครับ",
        },
      ],
      contactPhone: "081-445-8899",
      contactLine: "@andamancliff",
      facebookPageUrl: "https://facebook.com/andamancliffphuket",
      promptPayId: "0814458899",
      promptPayAccountName: "บจก. อันดามัน คลิฟ วิลล่า",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.9,
      reviewCount: 28,
    },
  });

  const krabiHotel = await prisma.hotel.upsert({
    where: { slug: "krabi-cove-hideaway" },
    update: {},
    create: {
      slug: "krabi-cove-hideaway",
      ownerId: ownerAndaman.id,
      nameTh: "กระบี่ โคฟ ไฮด์อะเวย์",
      nameEn: "Krabi Cove Hideaway",
      taglineTh: "บังกะโลติดหาดน้ำใสสีมรกต หันหน้าสู่ผาหินปูนไร่เลย์",
      taglineEn: "Emerald beachfront bungalows facing Krabi's limestone cliffs",
      descriptionTh:
        "ที่พักติดชายหาดส่วนตัวเงียบสงบในอ่าวนาง จ.กระบี่ เดินลงทรายขาวได้จากหน้าห้อง พร้อมกิจกรรมพายคายัคใสชมพระอาทิตย์ตก",
      descriptionEn:
        "Quiet beachfront villas in Ao Nang, Krabi with complimentary clear kayaks and sunset pier dining.",
      logoUrl:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=85",
      provinceId: "krabi",
      districtTh: "อ่าวนาง อ.เมือง",
      addressTh: "212 ม.2 ต.อ่าวนาง อ.เมือง จ.กระบี่ 81180",
      latitude: 8.0315,
      longitude: 98.8235,
      googleMapsUrl: "https://maps.google.com/?q=8.0315,98.8235",
      stayStyles: ["sea", "bathtub"],
      petsAllowed: true,
      petPolicyTh: "ต้อนรับน้องหมาพันธุ์เล็กน้ำหนักไม่เกิน 10 กก. (มีค่าทำความสะอาด 500฿/ทริป)",
      nearbySpotsJson: [
        { nameTh: "หาดอ่าวนาง", distTh: "เดิน 1 นาที (ติดหาด)" },
        { nameTh: "ท่าเรือไปเกาะห้อง", distTh: "ขับรถ 10 นาที" },
      ],
      contactPhone: "082-334-7788",
      contactLine: "@krabicove",
      promptPayId: "0823347788",
      promptPayAccountName: "กระบี่ โคฟ ไฮด์อะเวย์",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.8,
      reviewCount: 19,
    },
  });

  const bkkHotel = await prisma.hotel.upsert({
    where: { slug: "skyline-velvet-bangkok" },
    update: {},
    create: {
      slug: "skyline-velvet-bangkok",
      ownerId: ownerMoncham.id,
      nameTh: "สกายไลน์ เวลเวท รูฟท็อป โฮเทล",
      nameEn: "Skyline Velvet Rooftop Hotel Bangkok",
      taglineTh: "บูทีคโฮเทลริมแม่น้ำเจ้าพระยา พร้อม Craft Cocktail Bar ชั้นดาดฟ้า",
      taglineEn: "Charoenkrung boutique suites with skyline rooftop cocktail bar",
      descriptionTh:
        "ดีไซน์โฮเทลสุดเท่ย่านเจริญกรุง-สาทร กรุงเทพฯ ห้องพักกระจกบานใหญ่ชมวิวเมือง พร้อมสิทธิ์เข้า Rooftop Bar ชั้น 22",
      descriptionEn:
        "Architectural boutique stay in Charoenkrung, Bangkok featuring floor-to-ceiling city views and a rooftop craft bar.",
      logoUrl:
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=85",
      provinceId: "bangkok",
      districtTh: "บางรัก / เจริญกรุง",
      addressTh: "1188 ถ.เจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพฯ 10500",
      latitude: 13.722,
      longitude: 100.514,
      googleMapsUrl: "https://maps.google.com/?q=13.7220,100.5140",
      stayStyles: ["bars", "pool-villa"],
      nearbySpotsJson: [
        { nameTh: "BTS สะพานตากสิน", distTh: "เดิน 5 นาที" },
        { nameTh: "ไอคอนสยาม (ข้ามเรือ)", distTh: "10 นาที" },
      ],
      contactPhone: "02-664-9900",
      contactLine: "@skylinevelvet",
      promptPayId: "0897723311",
      promptPayAccountName: "สกายไลน์ เวลเวท โฮเทล",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.8,
      reviewCount: 34,
    },
  });

  const monchamHotel = await prisma.hotel.upsert({
    where: { slug: "moncham-onsen-retreat" },
    update: {},
    create: {
      slug: "moncham-onsen-retreat",
      ownerId: ownerMoncham.id,
      nameTh: "ม่อนแจ่ม ออนเซ็น รีทรีต เชียงใหม่",
      nameEn: "Mon Cham Onsen Retreat Chiang Mai",
      taglineTh: "วิลล่าไม้ฮิโนกิกลางป่าสน อ่างแช่น้ำแร่อุ่น 40°C ตลอดคืน",
      taglineEn: "Private cedar villas with 40°C mineral onsen tubs in Mae Rim",
      descriptionTh:
        "สัมผัสอากาศเย็น 15°C บนเนินเขาม่อนแจ่ม อ.แม่ริม จ.เชียงใหม่ แช่น้ำแร่ออนเซ็นส่วนตัวกลางหุบเขาและป่าสนแบบไม่ต้องบินไปญี่ปุ่น",
      descriptionEn:
        "Japanese-inspired cedar sanctuary in Mae Rim, Chiang Mai offering private mineral hot springs overlooking misty pine ridges.",
      logoUrl:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=85",
      provinceId: "chiang-mai",
      districtTh: "ม่อนแจ่ม อ.แม่ริม",
      addressTh: "88 ม.11 ต.แม่แรม อ.แม่ริม จ.เชียงใหม่ 50180",
      latitude: 18.9358,
      longitude: 98.8229,
      googleMapsUrl: "https://maps.google.com/?q=18.9358,98.8229",
      stayStyles: ["mountain", "bathtub"],
      petsAllowed: true,
      petPolicyTh: "เข้าพักกับน้องหมา/น้องแมวได้ทุกสายพันธุ์ (โซน Garden Onsen Villa)",
      nearbySpotsJson: [
        { nameTh: "ยอดดอยม่อนแจ่ม", distTh: "ขับรถ 3 นาที" },
        { nameTh: "สวนพฤกษศาสตร์สมเด็จพระนางเจ้าสิริกิติ์", distTh: "ขับรถ 12 นาที" },
      ],
      contactPhone: "089-772-3311",
      contactLine: "@monchamonsen",
      promptPayId: "0897723311",
      promptPayAccountName: "ม่อนแจ่ม ออนเซ็น รีทรีต",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.9,
      reviewCount: 51,
    },
  });

  const khaoyaiHotel = await prisma.hotel.upsert({
    where: { slug: "khaoyai-starlight-camp" },
    update: {},
    create: {
      slug: "khaoyai-starlight-camp",
      ownerId: ownerAndaman.id,
      nameTh: "เขาใหญ่ สตาร์ไลท์ แกลมปิ้ง",
      nameEn: "Khao Yai Starlight Glamping",
      taglineTh: "โดมใสดูดาว & เคบินไม้กลางทิวเขาใหญ่ ขับรถจาก กทม. 2 ชม.",
      taglineEn: "Stargazing luxury domes & pine cabins on the edge of Khao Yai",
      descriptionTh:
        "แกลมปิ้งหรูติดแอร์เย็นฉ่ำพร้อมอ่างอาบน้ำกลางสนามหญ้าส่วนตัว ตกเย็นปิ้งมาร์ชเมลโลว์รอบกองไฟชมทางช้างเผือก",
      descriptionEn:
        "Air-conditioned geodesic starlight domes with private outdoor soaking tubs and sunset campfire decks in Khao Yai.",
      logoUrl:
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
      provinceId: "nakhon-ratchasima",
      districtTh: "หมูสี อ.ปากช่อง",
      addressTh: "145 ม.6 ต.หมูสี อ.ปากช่อง จ.นครราชสีมา 30130",
      latitude: 14.527,
      longitude: 101.404,
      googleMapsUrl: "https://maps.google.com/?q=14.5270,101.4040",
      stayStyles: ["glamping", "mountain"],
      petsAllowed: true,
      petPolicyTh: "สนามหญ้าส่วนตัวรอบโดม พาน้องหมาวิ่งเล่นได้ฟรี",
      nearbySpotsJson: [
        { nameTh: "ประตูอุทยานแห่งชาติเขาใหญ่", distTh: "ขับรถ 7 นาที" },
        { nameTh: "บ่อน้ำผุดธรรมชาติบ้านท่าช้าง", distTh: "ขับรถ 9 นาที" },
      ],
      contactPhone: "084-556-1234",
      contactLine: "@khaoyaistarlight",
      promptPayId: "0845561234",
      promptPayAccountName: "เขาใหญ่ สตาร์ไลท์ แกลมปิ้ง",
      verificationStatus: "VERIFIED",
      isPublished: true,
      ratingAvg: 4.8,
      reviewCount: 23,
    },
  });

  // 3. Seed Rooms for all 6 Properties
  const roomDefs = [
    // Sapan Unseen (4 rooms)
    {
      hotelId: sapanHotel.id,
      code: "A1",
      slug: "a1-aframe-panorama",
      nameTh: "บ้านทรง A-Frame วิวทะเลหมอก (A1)",
      nameEn: "A-Frame Panorama Villa A1",
      categoryTh: "A-Frame Villa",
      categoryEn: "A-Frame Villa",
      shortDescTh: "บ้าน 2 ชั้นมีชั้นลอยกระจกบานใหญ่ พร้อมอ่างแช่น้ำกลางแจ้งชมหมอก",
      shortDescEn: "Two-story A-Frame loft with outdoor soaking tub and 180° mist view",
      totalUnits: 1,
      weekdayPriceThb: 2990,
      weekendPriceThb: 3590,
      extraGuestPriceThb: 850,
      sizeSqm: 44,
      standardGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["อ่างแช่น้ำกลางแจ้ง", "รวมอาหารเช้า", "กาแฟดริปน่าน", "Wi-Fi ความเร็วสูง", "ที่จอดรถส่วนตัว"],
      galleryUrls: [
        CLOUDINARY_SAPAN_HERO,
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
    {
      hotelId: sapanHotel.id,
      code: "A2",
      slug: "a2-aframe-horizon",
      nameTh: "บ้านทรง A-Frame ฮอไรซอน (A2)",
      nameEn: "A-Frame Horizon Villa A2",
      categoryTh: "A-Frame Villa",
      categoryEn: "A-Frame Villa",
      shortDescTh: "ระเบียงหันทิศตะวันออกรับแสงเช้าและทะเลหมอกเต็มตา",
      shortDescEn: "East-facing private terrace capturing morning sunlight & valley mist",
      totalUnits: 1,
      weekdayPriceThb: 2990,
      weekendPriceThb: 3590,
      extraGuestPriceThb: 850,
      sizeSqm: 44,
      standardGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["อ่างแช่น้ำกลางแจ้ง", "รวมอาหารเช้า", "ลำโพง Marshall", "เครื่องทำน้ำอุ่น"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85",
        CLOUDINARY_SAPAN_HERO,
      ],
      sortOrder: 2,
    },
    {
      hotelId: sapanHotel.id,
      code: "A3",
      slug: "a3-mist-suite-cabin",
      nameTh: "เคบินสวีทชมวิวลำธาร & หมอก (A3)",
      nameEn: "Mist Suite Cabin A3",
      categoryTh: "Suite Cabin",
      categoryEn: "Suite Cabin",
      shortDescTh: "เคบินไม้โทนอบอุ่น วิวเปิดกว้างเห็นทุ่งนาสะปันและยอดเขา",
      shortDescEn: "Warm timber suite cabin opening to lush green paddy fields & hills",
      totalUnits: 2,
      weekdayPriceThb: 2590,
      weekendPriceThb: 3190,
      extraGuestPriceThb: 750,
      sizeSqm: 34,
      standardGuests: 2,
      maxGuests: 3,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["ระเบียงชมวิว", "รวมอาหารเช้า", "เครื่องปรับอากาศ", "Wi-Fi ความเร็วสูง"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 3,
    },
    {
      hotelId: sapanHotel.id,
      code: "A4",
      slug: "a4-private-corner",
      nameTh: "ไพรเวท คอร์เนอร์ วิลล่า (A4)",
      nameEn: "Private Corner Villa A4",
      categoryTh: "Private Villa",
      categoryEn: "Private Villa",
      shortDescTh: "หลังริมสุดทางเดินเป็นส่วนตัวสูงสุด พร้อมมุมถ่ายรูปอ่างแช่ริมผา",
      shortDescEn: "Secluded end-of-row sanctuary with cliffside bathtub deck",
      totalUnits: 1,
      weekdayPriceThb: 3290,
      weekendPriceThb: 3890,
      extraGuestPriceThb: 850,
      sizeSqm: 48,
      standardGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["อ่างแช่น้ำกลางแจ้ง", "รวมอาหารเช้า", "มุมส่วนตัวริมผา", "กาแฟดริปน่าน"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 4,
    },
    // Andaman Cliff Phuket
    {
      hotelId: andamanHotel.id,
      code: "PV1",
      slug: "ocean-infinity-1br",
      nameTh: "โอเชียน อินฟินิตี้ พูลวิลล่า (1 ห้องนอน)",
      nameEn: "Ocean Infinity Pool Villa (1BR)",
      categoryTh: "Pool Villa",
      categoryEn: "Pool Villa",
      shortDescTh: "สระว่ายน้ำส่วนตัวระบบเกลือยาว 8 เมตร หันหน้าออกทะเลอันดามัน",
      shortDescEn: "8m private saltwater infinity pool overlooking Andaman sunset",
      totalUnits: 3,
      weekdayPriceThb: 6500,
      weekendPriceThb: 7900,
      extraGuestPriceThb: 1200,
      sizeSqm: 95,
      standardGuests: 2,
      maxGuests: 3,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["สระว่ายน้ำส่วนตัว", "วิวทะเล 180°", "รวมอาหารเช้า", "มินิบาร์ฟรี"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
    {
      hotelId: andamanHotel.id,
      code: "PV2",
      slug: "grand-andaman-2br",
      nameTh: "แกรนด์ อันดามัน พูลวิลล่า (2 ห้องนอน)",
      nameEn: "Grand Andaman Sunset Pool Villa (2BR)",
      categoryTh: "Pool Villa",
      categoryEn: "Pool Villa",
      shortDescTh: "วิลล่าขนาดใหญ่สำหรับครอบครัวหรือแก๊งเพื่อน พร้อมโซนปาร์ตี้ริมสระ",
      shortDescEn: "Spacious 2-bedroom sunset villa with outdoor lounge deck",
      totalUnits: 2,
      weekdayPriceThb: 10900,
      weekendPriceThb: 12900,
      extraGuestPriceThb: 1200,
      sizeSqm: 165,
      standardGuests: 4,
      maxGuests: 6,
      bedrooms: 2,
      beds: 2,
      bathrooms: 2,
      petsAllowed: false,
      amenities: ["สระว่ายน้ำส่วนตัว", "ครัวขนาดย่อม", "วิวทะเล 180°", "รวมอาหารเช้า"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 2,
    },
    // Krabi Cove
    {
      hotelId: krabiHotel.id,
      code: "KB1",
      slug: "beachfront-emerald-bungalow",
      nameTh: "บังกะโลติดชายหาดหน้าผาหินปูน",
      nameEn: "Beachfront Limestone View Bungalow",
      categoryTh: "Beachfront",
      categoryEn: "Beachfront",
      shortDescTh: "เปิดประตูเดินลงหาดทรายขาวทันที พร้อมอ่างหินขัดชมวิวทะเล",
      shortDescEn: "Direct sand access steps from your porch with terrazzo soaking tub",
      totalUnits: 4,
      weekdayPriceThb: 4200,
      weekendPriceThb: 4900,
      extraGuestPriceThb: 900,
      sizeSqm: 52,
      standardGuests: 2,
      maxGuests: 3,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: true,
      amenities: ["ติดทะเลเดินลงหาด", "ต้อนรับสัตว์เลี้ยง", "คายัคฟรี", "รวมอาหารเช้า"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
    // Skyline Velvet Bangkok
    {
      hotelId: bkkHotel.id,
      code: "BK1",
      slug: "chao-phraya-sky-suite",
      nameTh: "เจ้าพระยา สกาย คอร์เนอร์ สวีท",
      nameEn: "Chao Phraya Sky Corner Suite",
      categoryTh: "Rooftop Suite",
      categoryEn: "Rooftop Suite",
      shortDescTh: "ห้องหัวมุมกระจก 2 ด้าน พร้อมค็อกเทลต้อนรับ 2 แก้วที่ Rooftop Bar",
      shortDescEn: "Dual-aspect skyline corner suite with 2 welcome rooftop cocktails",
      totalUnits: 5,
      weekdayPriceThb: 3800,
      weekendPriceThb: 4400,
      extraGuestPriceThb: 900,
      sizeSqm: 46,
      standardGuests: 2,
      maxGuests: 3,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      amenities: ["ฟรีค็อกเทล 2 แก้ว", "วิวแม่น้ำเจ้าพระยา", "สระว่ายน้ำดาดฟ้า", "ใกล้ BTS"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
    // Moncham Onsen Chiang Mai
    {
      hotelId: monchamHotel.id,
      code: "ON1",
      slug: "hinoki-onsen-villa",
      nameTh: "ฮิโนกิ ไพรเวท ออนเซ็น วิลล่า",
      nameEn: "Hinoki Private Onsen Villa",
      categoryTh: "Onsen Villa",
      categoryEn: "Onsen Villa",
      shortDescTh: "บ่อออนเซ็นไม้ฮิโนกิส่วนตัวควบคุมอุณหภูมิ 40°C ตลอด 24 ชม.",
      shortDescEn: "Handcrafted Hinoki soaking tub heated to 40°C overlooking misty pines",
      totalUnits: 3,
      weekdayPriceThb: 3600,
      weekendPriceThb: 4500,
      extraGuestPriceThb: 950,
      sizeSqm: 58,
      standardGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: true,
      amenities: ["อ่างออนเซ็นส่วนตัว 40°C", "ต้อนรับสัตว์เลี้ยง", "ชุดยูกาตะฟรี", "รวมอาหารเช้า"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
    // Khao Yai Glamping
    {
      hotelId: khaoyaiHotel.id,
      code: "GL1",
      slug: "starlight-dome-tub",
      nameTh: "สตาร์ไลท์ โดมใส & อ่างแช่กลางแจ้ง",
      nameEn: "Starlight Geodesic Dome & Outdoor Tub",
      categoryTh: "Glamping",
      categoryEn: "Glamping",
      shortDescTh: "นอนดูดาวจากบนเตียงคิงไซส์ พร้อมลานปิ้งย่างและอ่างอาบน้ำส่วนตัว",
      shortDescEn: "Panoramic stargazing ceiling above king bed with private outdoor tub",
      totalUnits: 4,
      weekdayPriceThb: 2490,
      weekendPriceThb: 3190,
      extraGuestPriceThb: 700,
      sizeSqm: 40,
      standardGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: true,
      amenities: ["โดมใสดูดาว", "อ่างแช่น้ำกลางแจ้ง", "ต้อนรับสัตว์เลี้ยง", "รวมอาหารเช้า"],
      galleryUrls: [
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
      ],
      sortOrder: 1,
    },
  ];

  const createdRoomsByKey: Record<string, { id: string; code: string; weekdayPriceThb: number }> = {};
  for (const r of roomDefs) {
    const upserted = await prisma.room.upsert({
      where: { hotelId_code: { hotelId: r.hotelId, code: r.code } },
      update: {},
      create: r,
    });
    createdRoomsByKey[r.code] = {
      id: upserted.id,
      code: upserted.code,
      weekdayPriceThb: upserted.weekdayPriceThb,
    };
  }

  // 4. Seed Hotel Addons (only shown inside each hotel's booking checkout, NEVER on /deal)
  const existingAddonsCount = await prisma.hotelAddon.count();
  if (existingAddonsCount === 0) {
    await prisma.hotelAddon.createMany({
      data: [
        {
          hotelId: sapanHotel.id,
          nameTh: "ชุดหมูกระทะริมระเบียง (สำหรับ 2 ท่าน)",
          nameEn: "Mountain Terrace Mookata Set (2 pax)",
          descriptionTh: "หมูหมักงา ผักสด น้ำจิ้มรสเด็ด พร้อมเตาถ่านเสิร์ฟ 17:30 น.",
          priceThb: 590,
          unitLabelTh: "ชุด",
          unitLabelEn: "set",
          sortOrder: 1,
        },
        {
          hotelId: sapanHotel.id,
          nameTh: "ชุดตีฟองบาธบอมบ์ + น้ำมันหอมระเหย",
          nameEn: "Organic Bath Bomb & Bubble Set",
          descriptionTh: "สำหรับแช่อ่างกลางแจ้งชมทะเลหมอก",
          priceThb: 250,
          unitLabelTh: "ชุด",
          unitLabelEn: "set",
          sortOrder: 2,
        },
        {
          hotelId: andamanHotel.id,
          nameTh: "Floating Breakfast เสิร์ฟในสระส่วนตัว",
          nameEn: "Private Pool Floating Breakfast",
          descriptionTh: "เซตอาหารเช้านานาชาติ + ผลไม้เมืองร้อน + สปาร์กลิง",
          priceThb: 950,
          unitLabelTh: "เซต",
          unitLabelEn: "set",
          sortOrder: 1,
        },
        {
          hotelId: khaoyaiHotel.id,
          nameTh: "เซตปิ้งย่าง BBQ & มาร์ชเมลโลว์รอบกองไฟ",
          nameEn: "Campfire BBQ & Marshmallow Kit",
          descriptionTh: "เนื้อพรีเมียม ผักย่าง เตาฟืน และมาร์ชเมลโลว์",
          priceThb: 790,
          unitLabelTh: "ชุด",
          unitLabelEn: "set",
          sortOrder: 1,
        },
      ],
    });
  }

  // 5. Seed Multi-Hotel Coupons (/deal + Hotel Profile Vouchers)
  const couponDefs = [
    {
      hotelId: sapanHotel.id,
      code: "SAPANMIST500",
      titleTh: "ลดทันที ฿500 จองตรงรับลมหนาวสะปัน",
      titleEn: "฿500 Off Sapan Mist Direct Booking",
      descriptionTh: "ใช้ได้กับบ้านทรง A-Frame และ Suite Cabin ทุกหลังเมื่อยอดจองครบ 2,500 บาท",
      descriptionEn: "Valid across all A-Frame & Suite villas on bookings over ฿2,500.",
      coverImageUrl: CLOUDINARY_SAPAN_HERO,
      discountType: "FIXED_THB" as const,
      discountValue: 500,
      minSpendThb: 2500,
      totalQuota: 100,
      claimedCount: 28,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: true,
    },
    {
      hotelId: andamanHotel.id,
      code: "ANDAMAN15",
      titleTh: "ลด 15% พูลวิลล่าริมผาหาดกมลา",
      titleEn: "15% Off Kamala Cliff Pool Villas",
      descriptionTh: "ส่วนลดสูงสุด 1,800 บาท เมื่อจองตรงบน Cangaroom (0% GP)",
      descriptionEn: "Save up to ฿1,800 when booking direct on Cangaroom.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80",
      discountType: "PERCENT" as const,
      discountValue: 15,
      minSpendThb: 5000,
      maxDiscountThb: 1800,
      totalQuota: 80,
      claimedCount: 19,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: true,
    },
    {
      hotelId: monchamHotel.id,
      code: "ONSEN400",
      titleTh: "ลด ฿400 แช่ออนเซ็นม่อนแจ่ม (พาสัตว์เลี้ยงพักได้)",
      titleEn: "฿400 Off Private Hinoki Onsen Villa",
      descriptionTh: "ใช้ได้ทุกวันอาทิตย์-พฤหัสบดีและวันหยุด",
      descriptionEn: "Valid for all Hinoki Private Onsen Villas.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=900&q=80",
      discountType: "FIXED_THB" as const,
      discountValue: 400,
      minSpendThb: 3000,
      totalQuota: 120,
      claimedCount: 34,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: false,
    },
    {
      hotelId: krabiHotel.id,
      code: "KRABI10",
      titleTh: "ลด 10% บังกะโลติดหาดกระบี่ + ฟรีคายัค",
      titleEn: "10% Off Krabi Beachfront Bungalow",
      descriptionTh: "จองตรงรับสิทธิ์พายคายัคใสฟรีตลอดการเข้าพัก",
      descriptionEn: "Includes complimentary clear kayak rental.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&q=80",
      discountType: "PERCENT" as const,
      discountValue: 10,
      minSpendThb: 3500,
      maxDiscountThb: 1000,
      totalQuota: 60,
      claimedCount: 12,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: false,
    },
    {
      hotelId: bkkHotel.id,
      code: "ROOFTOP350",
      titleTh: "ลด ฿350 + ฟรีค็อกเทล 2 แก้วบน Rooftop",
      titleEn: "฿350 Off + 2 Free Rooftop Cocktails",
      descriptionTh: "สำหรับลูกค้าจองตรงห้องสวีทริมเจ้าพระยา",
      descriptionEn: "Direct-booking privilege for Chao Phraya Sky Suites.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
      discountType: "FIXED_THB" as const,
      discountValue: 350,
      minSpendThb: 3000,
      totalQuota: 90,
      claimedCount: 22,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: false,
    },
    {
      hotelId: khaoyaiHotel.id,
      code: "CAMP300",
      titleTh: "ลด ฿300 นอนโดมดูดาวเขาใหญ่",
      titleEn: "฿300 Off Khao Yai Starlight Dome",
      descriptionTh: "จองตรงไม่มีค่า GP พาน้องหมาวิ่งเล่นฟรี",
      descriptionEn: "Pet-friendly starlight glamping direct offer.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=80",
      discountType: "FIXED_THB" as const,
      discountValue: 300,
      minSpendThb: 2000,
      totalQuota: 150,
      claimedCount: 41,
      startsAt: now,
      expiresAt: nextYear,
      isFeaturedDeal: false,
    },
  ];

  const createdCouponsByCode: Record<string, string> = {};
  for (const c of couponDefs) {
    const upserted = await prisma.coupon.upsert({
      where: { hotelId_code: { hotelId: c.hotelId, code: c.code } },
      update: {},
      create: c,
    });
    createdCouponsByCode[c.code] = upserted.id;
  }

  // 6. Seed Pins across all 6 Thai hotels + Facebook Auto-Sync Queue Samples
  const existingPins = await prisma.pin.findMany({
    select: { id: true, hotelId: true, titleTh: true, roomId: true },
  });
  const existingTitles = new Set(existingPins.map((p) => p.titleTh));
  let seededPins: Array<{ id: string; hotelId: string; titleTh: string; roomId: string | null }> = [...existingPins];
  if (true) {
    const pinDefs = [
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A1"]?.id,
        couponId: createdCouponsByCode["SAPANMIST500"],
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "A-Frame กลางทะเลหมอกสะปัน ตื่นมาก็เจอวิวภูเขา 180°",
        titleEn: "A-Frame Panorama Villa Facing Sapan Morning Mist",
        descriptionTh:
          "เปิดม่านชั้นลอยชมทะเลหมอกยามเช้าแบบส่วนตัว พร้อมอ่างแช่น้ำอุ่นกลางแจ้งและอาหารเช้าเสิร์ฟถึงระเบียง",
        descriptionEn:
          "Wake up above drifting valley mist in Bo Kluea, Nan with your own outdoor soaking tub.",
        coverImageUrl: CLOUDINARY_SAPAN_HERO,
        mediaUrls: [
          CLOUDINARY_SAPAN_HERO,
          "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[2/3]",
        provinceId: "nan",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["ทะเลหมอก", "น่าน", "สะปัน", "A-Frame", "อ่างแช่น้ำ", "วิวภูเขา"],
        isSponsored: true,
        sponsoredPriority: 95,
        likesCount: 142,
        savesCount: 89,
        commentsCount: 2,
      },
      {
        hotelId: andamanHotel.id,
        roomId: createdRoomsByKey["PV1"]?.id,
        couponId: createdCouponsByCode["ANDAMAN15"],
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "Infinity Pool Villa ริมผาหาดกมลา มองเห็นทะเลอันดามัน",
        titleEn: "Oceanfront Infinity Pool Villa Overlooking Andaman Sea",
        descriptionTh:
          "พูลวิลล่าส่วนตัวบนเนินผาหาดกมลา จ.ภูเก็ต สระระบบเกลือไร้ขอบหันรับพระอาทิตย์ตก พร้อม Floating Breakfast",
        descriptionEn:
          "Private cliffside pool villa in Kamala, Phuket with sunset sea views.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[4/5]",
        provinceId: "phuket",
        stayStyles: ["pool-villa", "sea"],
        semanticTags: ["พูลวิลล่า", "ภูเก็ต", "สระว่ายน้ำส่วนตัว", "ติดทะเล", "พระอาทิตย์ตก"],
        isSponsored: true,
        sponsoredPriority: 90,
        likesCount: 186,
        savesCount: 112,
        commentsCount: 1,
      },
      {
        hotelId: monchamHotel.id,
        roomId: createdRoomsByKey["ON1"]?.id,
        couponId: createdCouponsByCode["ONSEN400"],
        mediaType: "VIDEO" as const,
        category: "VIDEOS" as const,
        titleTh: "คลิปแสงเช้าเหนือทะเลหมอกแม่ริม อากาศ 16°C จากบ่อออนเซ็นส่วนตัว",
        titleEn: "16°C Morning Mist Drifting Past Private Hinoki Onsen",
        descriptionTh:
          "แช่ออนเซ็นน้ำแร่อุ่น 40°C ท่ามกลางป่าสนม่อนแจ่ม พาน้องหมาพักด้วยได้ฟรี",
        descriptionEn:
          "Private 40°C mineral onsen in Mae Rim, Chiang Mai — pet-friendly.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
        ],
        videoUrl:
          "https://assets.mixkit.co/videos/41575/41575-720.mp4",
        aspectRatio: "aspect-[16/9]",
        provinceId: "chiang-mai",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["ออนเซ็น", "เชียงใหม่", "ม่อนแจ่ม", "สัตว์เลี้ยงเข้าพักได้", "อ่างแช่น้ำ"],
        isSponsored: true,
        sponsoredPriority: 85,
        likesCount: 164,
        savesCount: 97,
        commentsCount: 0,
      },
      {
        hotelId: bkkHotel.id,
        roomId: createdRoomsByKey["BK1"]?.id,
        couponId: createdCouponsByCode["ROOFTOP350"],
        mediaType: "PHOTO" as const,
        category: "DINING" as const,
        titleTh: "Craft Cocktail Rooftop Bar ชั้นดาดฟ้าวิวโค้งน้ำเจ้าพระยา",
        titleEn: "Chao Phraya Craft Cocktail Rooftop Bar & Skyline Suites",
        descriptionTh:
          "Staycation สุดชิคย่านเจริญกรุง รับฟรีค็อกเทลต้อนรับ 2 แก้วบนรูฟท็อปบาร์",
        descriptionEn:
          "Boutique Bangkok rooftop lounge with panoramic river views.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[3/4]",
        provinceId: "bangkok",
        stayStyles: ["bars"],
        semanticTags: ["รูฟท็อปบาร์", "กรุงเทพ", "เจ้าพระยา", "staycation", "ค็อกเทล"],
        likesCount: 98,
        savesCount: 54,
        commentsCount: 0,
      },
      {
        hotelId: krabiHotel.id,
        roomId: createdRoomsByKey["KB1"]?.id,
        couponId: createdCouponsByCode["KRABI10"],
        mediaType: "VIDEO" as const,
        category: "VIEWS" as const,
        titleTh: "บังกะโลริมหาดน้ำใสสีมรกต จ.กระบี่ เดินลงทะเลได้จากหน้าห้อง",
        titleEn: "Emerald Beachfront Bungalow Steps from Ao Nang Sea",
        descriptionTh:
          "น้ำใสเห็นพื้นทรายหน้าผาหินปูน พายคายัคใสฟรีและต้อนรับน้องหมาพันธุ์เล็ก",
        descriptionEn:
          "Clear-water beachfront escape facing Krabi's limestone karsts.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
        ],
        videoUrl:
          "https://assets.mixkit.co/videos/5016/5016-720.mp4",
        aspectRatio: "aspect-[2/3]",
        provinceId: "krabi",
        stayStyles: ["sea", "bathtub"],
        semanticTags: ["ติดทะเล", "กระบี่", "อ่าวนาง", "หมาพักได้", "คายัค"],
        likesCount: 132,
        savesCount: 77,
        commentsCount: 0,
      },
      {
        hotelId: khaoyaiHotel.id,
        roomId: createdRoomsByKey["GL1"]?.id,
        couponId: createdCouponsByCode["CAMP300"],
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "โดมใสดูดาวเขาใหญ่ พร้อมอ่างแช่กลางสนามหญ้าและปิ้งย่างรอบกองไฟ",
        titleEn: "Starlight Geodesic Dome & Outdoor Soaking Tub in Khao Yai",
        descriptionTh:
          "ขับรถจากกรุงเทพฯ แค่ 2 ชม. นอนนับดาวในโดมแอร์เย็นสบาย พาน้องหมาวิ่งเล่นได้เต็มที่",
        descriptionEn:
          "Pet-friendly starlight glamping dome just 2 hours from Bangkok.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[1/1]",
        provinceId: "nakhon-ratchasima",
        stayStyles: ["glamping", "mountain"],
        semanticTags: ["แกลมปิ้ง", "เขาใหญ่", "ดูดาว", "สัตว์เลี้ยงพักได้", "ปิ้งย่าง"],
        likesCount: 118,
        savesCount: 72,
        commentsCount: 0,
      },
      {
        hotelId: andamanHotel.id,
        roomId: createdRoomsByKey["PV2"]?.id,
        mediaType: "VIDEO" as const,
        category: "VIDEOS" as const,
        titleTh: "ปาร์ตี้สระว่ายน้ำไร้ขอบชมพระอาทิตย์ตก 2 ห้องนอนใหญ่ภูเก็ต",
        titleEn: "2-Bedroom Sunset Pool Villa Party Deck in Phuket",
        descriptionTh: "เหมาะกับแก๊งเพื่อนและครอบครัว ชมวิวทะเลอันดามันกว้างสุดสายตา",
        descriptionEn: "2BR sunset infinity villa for friends and family in Kamala.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
        ],
        videoUrl:
          "https://assets.mixkit.co/videos/41573/41573-720.mp4",
        aspectRatio: "aspect-[3/4]",
        provinceId: "phuket",
        stayStyles: ["pool-villa", "sea"],
        semanticTags: ["พูลวิลล่า", "ภูเก็ต", "2 ห้องนอน", "ครอบครัว"],
        likesCount: 95,
        savesCount: 64,
        commentsCount: 0,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A4"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "มุมอ่างแช่ริมผาส่วนตัว หลัง A4 สะปัน อันซีน น่าน",
        titleEn: "Private Cliffside Soaking Tub Deck at Villa A4, Sapan",
        descriptionTh:
          "หลังริมสุดทางเดิน เงียบสงบเป็นส่วนตัว 100% ตีฟองแช่น้ำอุ่นท่ามกลางลมหนาว",
        descriptionEn: "Corner cliffside bathtub overlooking Sapan valley.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[5/6]",
        provinceId: "nan",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["น่าน", "สะปัน", "อ่างอาบน้ำ", "ส่วนตัว"],
        likesCount: 84,
        savesCount: 51,
        commentsCount: 0,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A3"]?.id,
        mediaType: "PHOTO" as const,
        category: "DINING" as const,
        titleTh: "หมูกระทะร้อนๆ บนระเบียงชมวิวพระอาทิตย์ลับขอบฟ้าสะปัน",
        titleEn: "Sunset Mookata & Craft Drip Coffee on Your Terrace",
        descriptionTh: "สั่งเพิ่มได้ในขั้นตอนจองห้อง เสิร์ฟตรงถึงหน้าบ้านเวลา 17:30 น.",
        descriptionEn: "Order Mookata terrace dinner directly during checkout.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[4/5]",
        provinceId: "nan",
        stayStyles: ["mountain"],
        semanticTags: ["หมูกระทะ", "สะปัน", "อาหารเย็น", "น่าน"],
        likesCount: 73,
        savesCount: 39,
        commentsCount: 0,
      },
      {
        hotelId: bkkHotel.id,
        roomId: createdRoomsByKey["BK1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "ห้องหัวมุมกระจกสูง 3 เมตร ชมไฟเมืองกรุงเทพฯ ยามค่ำ",
        titleEn: "Floor-to-Ceiling Corner Suite Above Charoenkrung",
        descriptionTh: "เดิน 5 นาทีถึง BTS สะพานตากสิน เหมาะพักผ่อนสุดสัปดาห์",
        descriptionEn: "5-minute walk to BTS Saphan Taksin.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[2/3]",
        provinceId: "bangkok",
        stayStyles: ["bars"],
        semanticTags: ["กรุงเทพ", "โรงแรมบูทีค", "วิวเมือง"],
        likesCount: 61,
        savesCount: 33,
        commentsCount: 0,
      },
      {
        hotelId: krabiHotel.id,
        roomId: createdRoomsByKey["KB1"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "สะพานไม้และบาร์ริมหาดส่วนตัว ช่วงเวลา Golden Hour กระบี่",
        titleEn: "Private Pier & Turquoise Lagoon at Golden Hour, Krabi",
        descriptionTh: "นั่งฟังเสียงคลื่นจิบเครื่องดื่มเย็นๆ หน้าวิลล่า",
        descriptionEn: "Sunset drinks along our private Ao Nang pier.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[4/5]",
        provinceId: "krabi",
        stayStyles: ["sea", "bars"],
        semanticTags: ["กระบี่", "ติดทะเล", "พระอาทิตย์ตก"],
        likesCount: 110,
        savesCount: 68,
        commentsCount: 0,
      },
      {
        hotelId: khaoyaiHotel.id,
        roomId: createdRoomsByKey["GL1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "สวนหินสีขาวและลานพักผ่อนมินิมอลกลางทิวเขาใหญ่",
        titleEn: "Minimalist Courtyard & Heated Tubs in Khao Yai",
        descriptionTh: "มุมถ่ายรูปสวยทุกองศา เหมาะพาครอบครัวหรือคู่รักมาชาร์จพลัง",
        descriptionEn: "Minimalist nature sanctuary 2 hours from Bangkok.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[3/4]",
        provinceId: "nakhon-ratchasima",
        stayStyles: ["glamping", "pool-villa"],
        semanticTags: ["เขาใหญ่", "มินิมอล", "วันหยุดใกล้กรุง"],
        likesCount: 89,
        savesCount: 44,
        commentsCount: 0,
      },
      // Sample Facebook Page Auto-Sync Triage Queue for Sapan Unseen (/studio demo)
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A2"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "หมอกลงหนาเช้านี้หน้าบ้าน A2 อุณหภูมิ 15 องศา (นำเข้าจาก Facebook)",
        titleEn: "Morning Mist at Villa A2 — 15°C Today",
        descriptionTh:
          "AI ตรวจพบภาพถ่ายบรรยากาศทะเลหมอกจริงจากเพจ Facebook สะปัน อันซีน — พร้อมให้เจ้าของกดอนุมัติขึ้นเว็บใน 1 คลิก",
        descriptionEn: "Auto-synced from Sapan Unseen Facebook Page (Tier 1 Visual Match).",
        coverImageUrl:
          "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[4/5]",
        provinceId: "nan",
        stayStyles: ["mountain"],
        semanticTags: ["ทะเลหมอก", "สะปัน", "น่าน"],
        sourcePlatform: "FACEBOOK" as const,
        externalPostId: "fb-post-sapan-901",
        externalPermalink: "https://facebook.com/sapanunseen/posts/901",
        publishStatus: "PENDING_APPROVAL" as const,
        aiConfidenceScore: 96,
        aiTriageNote: "Tier 1 · ภาพถ่ายทะเลหมอกและที่พักคมชัด จับคู่กับห้อง A2 แล้ว",
      },
      {
        hotelId: sapanHotel.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "โพสต์แชร์ข่าวสภาพจราจรและมุกตลกวันศุกร์ (AI คัดทิ้งอัตโนมัติ)",
        titleEn: "General News / Meme Post",
        descriptionTh: "AI ตรวจพบว่าเป็นโพสต์ข่าว/มีมตลก ไม่ใช่ภาพห้องพักหรือบรรยากาศที่พัก",
        descriptionEn: "Filtered out automatically by 3-Tier Smart Triage.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=60",
        mediaUrls: [],
        aspectRatio: "aspect-[1/1]",
        provinceId: "nan",
        stayStyles: [],
        semanticTags: [],
        sourcePlatform: "FACEBOOK" as const,
        externalPostId: "fb-post-sapan-902",
        publishStatus: "DISCARDED" as const,
        aiConfidenceScore: 18,
        aiTriageNote: "Tier 3 · โพสต์ทั่วไป/ข่าว ไม่เกี่ยวกับที่พัก (ซ่อนอัตโนมัติ)",
      },
      // Additional 12 diverse published pins so Masonry Feed has rich 24+ items
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A2"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "ชั้นลอยกระจกบ้าน A2 รับแดดอุ่นและไอหมอกแรกของวัน",
        titleEn: "Mezzanine Glass Loft A2 Greeting First Morning Mist",
        descriptionTh: "เตียงนุ่มชมวิวยอดดอยสะปันแบบไม่มีอะไรบังสายตา",
        descriptionEn: "Unobstructed mountain loft view in Sapan.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[3/4]",
        provinceId: "nan",
        stayStyles: ["mountain"],
        semanticTags: ["น่าน", "สะปัน", "ห้องนอนวิวเขา"],
        likesCount: 91,
        savesCount: 47,
      },
      {
        hotelId: andamanHotel.id,
        roomId: createdRoomsByKey["PV1"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "Floating Breakfast เสิร์ฟกลางสระไร้ขอบริมผาภูเก็ต",
        titleEn: "Private Infinity Pool Floating Breakfast in Kamala",
        descriptionTh: "สั่งเพิ่มในขั้นตอนจองได้ทันที เสิร์ฟเวลา 07:30–10:00 น.",
        descriptionEn: "Fresh tropical fruits & artisan pastries served poolside.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[4/5]",
        provinceId: "phuket",
        stayStyles: ["pool-villa", "sea"],
        semanticTags: ["ภูเก็ต", "พูลวิลล่า", "อาหารเช้าลอยน้ำ"],
        likesCount: 154,
        savesCount: 83,
      },
      {
        hotelId: monchamHotel.id,
        roomId: createdRoomsByKey["ON1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "ห้องนอนสไตล์เรียวกังญี่ปุ่นกลางสวนสนม่อนแจ่ม",
        titleEn: "Japanese Cedar Suite Amidst Pine Forest",
        descriptionTh: "พร้อมชุดยูกาตะและชาเขียวมัทฉะต้อนรับยามบ่าย",
        descriptionEn: "Includes complimentary yukata robes & ceremonial matcha.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[2/3]",
        provinceId: "chiang-mai",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["เชียงใหม่", "เรียวกัง", "ออนเซ็น"],
        likesCount: 121,
        savesCount: 66,
      },
      {
        hotelId: bkkHotel.id,
        roomId: createdRoomsByKey["BK1"]?.id,
        mediaType: "PHOTO" as const,
        category: "DINING" as const,
        titleTh: "สระว่ายน้ำชั้นดาดฟ้าพร้อมค็อกเทลบาร์ช่วงค่ำกรุงเทพฯ",
        titleEn: "Rooftop Pool & Twilight Cocktail Bar Above Bangkok",
        descriptionTh: "ชมแสงสีฝั่งธนบุรีและไอคอนสยามแบบ 270 องศา",
        descriptionEn: "270-degree river & skyline views in Charoenkrung.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[4/3]",
        provinceId: "bangkok",
        stayStyles: ["bars", "pool-villa"],
        semanticTags: ["กรุงเทพ", "รูฟท็อป", "สระว่ายน้ำ"],
        likesCount: 87,
        savesCount: 41,
      },
      {
        hotelId: krabiHotel.id,
        roomId: createdRoomsByKey["KB1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "ระเบียงเปลตาข่ายหน้าน้ำทะเลสีคราม จ.กระบี่",
        titleEn: "Overwater Hammock Deck Facing Krabi Sea",
        descriptionTh: "นอนฟังเสียงคลื่นชิลๆ ตลอดบ่าย พาน้องหมาพักได้",
        descriptionEn: "Pet-friendly beachfront hammock porch in Ao Nang.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[3/4]",
        provinceId: "krabi",
        stayStyles: ["sea"],
        semanticTags: ["กระบี่", "ติดทะเล", "สัตว์เลี้ยงพักได้"],
        likesCount: 147,
        savesCount: 92,
      },
      {
        hotelId: khaoyaiHotel.id,
        roomId: createdRoomsByKey["GL1"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "รอบกองไฟยามค่ำคืนใต้ฟ้าดาวเขาใหญ่",
        titleEn: "Evening Campfire Lounge Under Khao Yai Stars",
        descriptionTh: "พร้อมบริการชุด BBQ ปิ้งย่างและมาร์ชเมลโลว์",
        descriptionEn: "Cozy stargazing firepit right outside your dome.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[4/5]",
        provinceId: "nakhon-ratchasima",
        stayStyles: ["glamping", "mountain"],
        semanticTags: ["แกลมปิ้ง", "เขาใหญ่", "กางเต็นท์"],
        likesCount: 103,
        savesCount: 58,
      },
      {
        hotelId: monchamHotel.id,
        roomId: createdRoomsByKey["ON1"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "อ่างหินธรรมชาติกลางระเบียงไม้ชมยอดดอยเชียงใหม่",
        titleEn: "Outdoor Stone Onsen Tub Overlooking Chiang Mai Ridges",
        descriptionTh: "น้ำแร่อุ่น 40°C แช่ได้ทั้งครอบครัว",
        descriptionEn: "Heated mineral spring soaking tub in Mae Rim.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[2/3]",
        provinceId: "chiang-mai",
        stayStyles: ["bathtub", "mountain"],
        semanticTags: ["ออนเซ็น", "เชียงใหม่", "อ่างแช่น้ำ"],
        likesCount: 138,
        savesCount: 79,
      },
      {
        hotelId: andamanHotel.id,
        roomId: createdRoomsByKey["PV1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "ห้องนั่งเล่นเปิดโล่งรับลมทะเลอันดามันทุกทิศทาง",
        titleEn: "Open-Air Pavilion Living Room Facing Andaman Sea",
        descriptionTh: "เดินจากเตียงนอนลงสระน้ำส่วนตัวได้เลย",
        descriptionEn: "Seamless indoor-outdoor infinity pool living.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[5/6]",
        provinceId: "phuket",
        stayStyles: ["pool-villa"],
        semanticTags: ["พูลวิลล่า", "ภูเก็ต", "ดีไซน์หรู"],
        likesCount: 112,
        savesCount: 61,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A1"]?.id,
        mediaType: "PHOTO" as const,
        category: "DINING" as const,
        titleTh: "กาแฟดริปเมล็ดคั่วสะปันเสิร์ฟคู่ข้าวต้มร้อนยามเช้า",
        titleEn: "Morning Drip Coffee & Warm Highland Breakfast Tray",
        descriptionTh: "รวมอยู่ในค่าห้องพักแล้ว เสิร์ฟตรงถึงระเบียง 08:00 น.",
        descriptionEn: "Complimentary artisan breakfast delivered to your villa.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[1/1]",
        provinceId: "nan",
        stayStyles: ["mountain"],
        semanticTags: ["กาแฟดริป", "อาหารเช้า", "สะปัน"],
        likesCount: 68,
        savesCount: 35,
      },
      {
        hotelId: bkkHotel.id,
        roomId: createdRoomsByKey["BK1"]?.id,
        mediaType: "PHOTO" as const,
        category: "DINING" as const,
        titleTh: "Signature Craft Cocktail ยามพระอาทิตย์ตกริมเจ้าพระยา",
        titleEn: "Golden Hour Signature Cocktails on the 22nd Floor",
        descriptionTh: "ใช้คูปอง ROOFTOP350 รับส่วนลดห้องและเครื่องดื่มทันที",
        descriptionEn: "Book direct with ROOFTOP350 for complimentary cocktails.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[3/4]",
        provinceId: "bangkok",
        stayStyles: ["bars"],
        semanticTags: ["บาร์", "ค็อกเทล", "กรุงเทพ"],
        likesCount: 94,
        savesCount: 49,
      },
      {
        hotelId: krabiHotel.id,
        roomId: createdRoomsByKey["KB1"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "อ่างหินขัดชมวิวหาดส่วนตัวและทิวต้นมะพร้าวกระบี่",
        titleEn: "Ocean-Breeze Terrazzo Bathtub in Krabi Villa",
        descriptionTh: "แช่น้ำชมเสียงคลื่นตอนเย็นแบบไม่เร่งรีบ",
        descriptionEn: "Open-breeze stone soaking tub steps from the waves.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[4/5]",
        provinceId: "krabi",
        stayStyles: ["bathtub", "sea"],
        semanticTags: ["กระบี่", "อ่างแช่น้ำ", "ติดทะเล"],
        likesCount: 119,
        savesCount: 70,
      },
      {
        hotelId: khaoyaiHotel.id,
        roomId: createdRoomsByKey["GL1"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "เตียงคิงไซส์ใต้หลังคาโดมกระจกใสรับแสงธรรมชาติเขาใหญ่",
        titleEn: "King Bed Under Clear Stargazing Canopy in Khao Yai",
        descriptionTh: "ติดแอร์เย็นฉ่ำพร้อมผ้าม่านบังแสงปรับระดับได้",
        descriptionEn: "Air-conditioned luxury dome with retractable canopy.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: ["https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=85"],
        aspectRatio: "aspect-[2/3]",
        provinceId: "nakhon-ratchasima",
        stayStyles: ["glamping"],
        semanticTags: ["แกลมปิ้ง", "เขาใหญ่", "โดมใส"],
        likesCount: 86,
        savesCount: 45,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A1"]?.id,
        mediaType: "VIDEO" as const,
        category: "VIDEOS" as const,
        titleTh: "คลิปทะเลหมอกไหลผ่านระเบียงวิลล่า A-Frame ยามเช้าที่สะปัน",
        titleEn: "Morning Mist Flowing Past A-Frame Terrace in Sapan Valley",
        descriptionTh:
          "ตื่นรับไอเย็น 16°C และชมสายหมอกลอยเหนือหุบเขาสะปันจากหน้าห้องพัก",
        descriptionEn:
          "Silently drifting valley mist right outside your private mountain balcony.",
        coverImageUrl: CLOUDINARY_SAPAN_HERO,
        mediaUrls: [CLOUDINARY_SAPAN_HERO],
        videoUrl: "https://assets.mixkit.co/videos/4716/4716-720.mp4",
        aspectRatio: "aspect-[3/4]",
        provinceId: "nan",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["วิดีโอ", "ทะเลหมอก", "สะปัน", "น่าน"],
        likesCount: 129,
        savesCount: 74,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A3"]?.id,
        mediaType: "PHOTO" as const,
        category: "VIEWS" as const,
        titleTh: "แสงอาทิตย์ยามเย็นสาดทอทิวเขาสะปันหน้าวิลล่า A3",
        titleEn: "Golden Sunset Glow Across Sapan Ridges Outside Villa A3",
        descriptionTh:
          "จุดนั่งจิบเครื่องดื่มอุ่นๆ ชมวิวภูเขา 360 องศาแบบไม่มีเสาไฟบดบัง",
        descriptionEn:
          "Panoramic golden hour sunset deck overlooking unspoiled Bo Kluea peaks.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[4/5]",
        provinceId: "nan",
        stayStyles: ["mountain"],
        semanticTags: ["น่าน", "สะปัน", "วิวภูเขา", "พระอาทิตย์ตก"],
        likesCount: 97,
        savesCount: 53,
      },
      {
        hotelId: sapanHotel.id,
        roomId: createdRoomsByKey["A4"]?.id,
        mediaType: "PHOTO" as const,
        category: "ROOMS" as const,
        titleTh: "อ่างไม้แช่น้ำอุ่นกลางระเบียงไม้สักส่วนตัวที่สะปัน อันซีน",
        titleEn: "Private Cedar Balcony Soaking Tub Amidst Mist in Nan",
        descriptionTh:
          "ตีฟองบาธบอมบ์พร้อมวิวสายน้ำว้าและทิวเขาสลับซับซ้อน",
        descriptionEn:
          "Warm private outdoor soak facing misty Bo Kluea valley.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1000&q=85",
        mediaUrls: [
          "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
        ],
        aspectRatio: "aspect-[2/3]",
        provinceId: "nan",
        stayStyles: ["mountain", "bathtub"],
        semanticTags: ["อ่างแช่น้ำ", "น่าน", "สะปัน", "ส่วนตัว"],
        likesCount: 108,
        savesCount: 62,
      },
    ];

    for (const p of pinDefs) {
      if (existingTitles.has(p.titleTh)) continue;
      const created = await prisma.pin.create({ data: p });
      seededPins.push({
        id: created.id,
        hotelId: created.hotelId,
        titleTh: created.titleTh,
        roomId: created.roomId,
      });
    }
  }

  // 7. Seed Threaded Comments (with Hotel Owner reply) if empty
  const commentCount = await prisma.pinComment.count();
  if (commentCount === 0 && seededPins.length >= 2) {
    const sapanMainPin = seededPins.find((p) => p.hotelId === sapanHotel.id);
    const phuketPin = seededPins.find((p) => p.hotelId === andamanHotel.id);

    if (sapanMainPin) {
      const parentComment = await prisma.pinComment.create({
        data: {
          pinId: sapanMainPin.id,
          userId: demoTraveller.id,
          body: "บ้าน A1 มีน้ำอุ่นให้อาบไหมคะ แล้วสั่งหมูกระทะเพิ่มตอนจองได้ไหม?",
        },
      });
      await prisma.pinComment.create({
        data: {
          pinId: sapanMainPin.id,
          userId: adminUser.id,
          parentId: parentComment.id,
          isHotelOwnerReply: true,
          body: "มีเครื่องทำน้ำอุ่นระบบแก๊สอุ่นสม่ำเสมอเลยครับ และเลือกชุดหมูกระทะ 590฿ เพิ่มในหน้าจองห้องได้เลยครับ",
        },
      });
    }

    if (phuketPin) {
      await prisma.pinComment.create({
        data: {
          pinId: phuketPin.id,
          userId: demoTraveller.id,
          body: "วิลล่าสวยมาก ใช้คูปอง ANDAMAN15 ลดได้อีกคุ้มเลย",
        },
      });
    }
  }

  // 8. Seed Verified Guest Reviews if empty
  const reviewCount = await prisma.guestReview.count();
  if (reviewCount === 0) {
    await prisma.guestReview.createMany({
      data: [
        {
          hotelId: sapanHotel.id,
          roomCode: "A1",
          authorName: "คุณพิมพ์ชนก · กรุงเทพฯ",
          rating: 5,
          commentTh:
            "ประทับใจมากค่ะ ตื่นมาเจอทะเลหมอกหน้านอนเต็มตา อ่างแช่น้ำกลางแจ้งอุ่นกำลังดี หมูกระทะตอนเย็นอร่อยมาก จองตรงผ่าน Cangaroom ราคาดีและยืนยันไวมาก",
          commentEn: "Incredible morning mist right from the A-Frame loft and cozy outdoor tub.",
          photoUrls: [CLOUDINARY_SAPAN_HERO],
          isVerifiedStay: true,
        },
        {
          hotelId: sapanHotel.id,
          roomCode: "A4",
          authorName: "คุณณัฐวุฒิ · เชียงใหม่",
          rating: 5,
          commentTh: "หลัง A4 เงียบสงบเป็นส่วนตัวสุดๆ เจ้าของดูแลดีมากครับ",
          commentEn: "Super private corner villa with attentive host.",
          photoUrls: [],
          isVerifiedStay: true,
        },
        {
          hotelId: andamanHotel.id,
          roomCode: "PV1",
          authorName: "คุณชลธิชา · นนทบุรี",
          rating: 5,
          commentTh:
            "วิวพระอาทิตย์ตกสวยสมชื่ออันดามันจริงๆ ใช้โค้ด ANDAMAN15 จองตรงลดไปเยอะมาก",
          commentEn: "Breathtaking sunset infinity pool view and smooth direct booking.",
          photoUrls: [
            "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80",
          ],
          isVerifiedStay: true,
        },
      ],
    });
  }

  // 9. Seed Social Connection, Contact Clicks, Saved Board & Sponsored Campaign
  await prisma.socialConnection.upsert({
    where: {
      hotelId_platform_externalPageId: {
        hotelId: sapanHotel.id,
        platform: "FACEBOOK",
        externalPageId: "1029384756001",
      },
    },
    update: {},
    create: {
      hotelId: sapanHotel.id,
      platform: "FACEBOOK",
      externalPageId: "1029384756001",
      externalPageName: "Sapan Unseen สะปัน อันซีน น่าน",
      pageUrl: "https://facebook.com/sapanunseen",
      publishMode: "ONE_CLICK_APPROVE",
      excludedHashtags: ["#ประกาศปิดถนน", "#มีม"],
      lastSyncedAt: now,
    },
  });

  const existingClicks = await prisma.contactClickLog.count();
  if (existingClicks === 0) {
    await prisma.contactClickLog.createMany({
      data: [
        { hotelId: sapanHotel.id, channel: "LINE" },
        { hotelId: sapanHotel.id, channel: "LINE" },
        { hotelId: sapanHotel.id, channel: "FACEBOOK_MESSENGER" },
        { hotelId: sapanHotel.id, channel: "PHONE" },
      ],
    });
  }

  const existingBoard = await prisma.savedBoard.findFirst({
    where: { userId: adminUser.id },
  });
  if (!existingBoard && seededPins.length >= 2) {
    const board = await prisma.savedBoard.create({
      data: {
        userId: adminUser.id,
        name: "ทริปพักผ่อนปลายปี",
      },
    });
    // Snapshot slightly higher price on 2nd pin so Price Drop watch badge demonstrates immediately!
    const firstPin = seededPins[0];
    const secondPin = seededPins[1];
    await prisma.savedBoardPin.createMany({
      data: [
        {
          boardId: board.id,
          pinId: firstPin.id,
          userId: adminUser.id,
          savedPriceSnapshotThb: 2990,
        },
        {
          boardId: board.id,
          pinId: secondPin.id,
          userId: adminUser.id,
          savedPriceSnapshotThb: 7200,
        },
      ],
    });
  }

  const existingCampaigns = await prisma.sponsoredCampaign.count();
  if (existingCampaigns === 0 && seededPins.length > 0) {
    await prisma.sponsoredCampaign.create({
      data: {
        hotelId: sapanHotel.id,
        pinId: seededPins[0].id,
        placement: "HOME_FEED",
        dailyBudgetThb: 350,
        impressions: 4820,
        clicks: 312,
        bookingsAttributed: 14,
        startsAt: now,
        endsAt: nextYear,
        status: "ACTIVE",
      },
    });
  }

  // 10. Seed Native SEO Hotel Blog / Story UGC Posts
  const blogPostDefs = [
    {
      hotelId: sapanHotel.id,
      authorId: adminUser.id,
      roomId: createdRoomsByKey["A1"]?.id ?? null,
      slug: "sapan-winter-mist-travel-guide",
      titleTh: "คู่มือเที่ยวหมู่บ้านสะปัน จ.น่าน หน้าหนาว: จุดชมทะเลหมอก & คาเฟ่ลับห้ามพลาด",
      titleEn: "Sapan Valley Nan Winter Travel Guide: Mist Viewpoints & Hidden Cafes",
      excerptTh:
        "รวบรวมแพลนเที่ยวสะปัน 2 วัน 1 คืน ช่วงเวลาชมทะเลหมอกหน้าที่พัก คาเฟ่ดริปกาแฟท้องถิ่น และการเดินทางด้วยรถเก๋งแบบสบายๆ",
      contentTh: `## ทำไมต้องมาเที่ยวหมู่บ้านสะปันช่วงปลายฝน–หน้าหนาว?\n\nหมู่บ้านสะปัน อำเภอบ่อเกลือ จังหวัดน่าน เป็นหุบเขาที่มีแม่น้ำว้าไหลผ่านตลอดทั้งปี ทำให้อากาศเย็นสบายและเกิดทะเลหมอกหนานุ่มเกือบทุกเช้าตั้งแต่เวลา 06:00 – 08:30 น.\n\n### จุดเช็กอินห้ามพลาดรอบสะปัน อันซีน น่าน\n1. จุดชมวิวหยุดเวลา — ขับรถจากที่พักเพียง 4 นาที ชมทัศนียภาพทุ่งนาขั้นบันไดและสายหมอก 180 องศา\n2. น้ำตกสะปัน — เดินเล่นรับโอโซนในป่าเขียวขจี ห่างออกไปเพียง 6 นาที\n3. บ่อเกลือสินเธาว์โบราณ — แวะชิมไข่ต้มเกลือภูเขาและเลือกซื้อเกลือสปาธรรมชาติกลับบ้าน\n\n### ทิปส์การเลือกห้องพักชมหมอกเต็มตา\nหากอยากเปิดม่านจากเตียงนอนแล้วเห็นทะเลหมอกไหลผ่านหน้าต่าง แนะนำเลือก **วิลล่า A-Frame (A1 / A2)** ของสะปัน อันซีน ซึ่งออกแบบระเบียงยกสูงหันหน้าเข้าหุบเขาสะปันโดยตรง พร้อมเสิร์ฟกาแฟดริปน่านและข้าวต้มร้อนถึงหน้าห้องเวลา 08:00 น.`,
      coverImageUrl: CLOUDINARY_SAPAN_HERO,
      galleryUrls: [
        CLOUDINARY_SAPAN_HERO,
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
      ],
      categoryTh: "คู่มือเที่ยว & ที่พัก",
      tags: ["น่าน", "สะปัน", "ทะเลหมอก", "เที่ยวหน้าหนาว", "บ่อเกลือ"],
      status: "PUBLISHED" as const,
      viewsCount: 412,
      publishedAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      hotelId: sapanHotel.id,
      authorId: adminUser.id,
      roomId: createdRoomsByKey["A4"]?.id ?? null,
      slug: "sapan-aframe-bathtub-experience",
      titleTh: "รีวิวพักผ่อนวิลล่าทรง A-Frame แช่อ่างน้ำอุ่นชมวิวขุนเขา 180 องศาที่สะปัน",
      titleEn: "A-Frame Private Soaking Tub Experience Overlooking Sapan Ridges",
      excerptTh:
        "เจาะลึกประสบการณ์เข้าพักบ้าน A4 มุมส่วนตัวที่สุดของรีสอร์ท พร้อมชุดหมูกระทะร้อนๆ บนระเบียงไม้ยามเย็น",
      contentTh: `## ความเป็นส่วนตัวระดับ 10/10 บนเนินเขาสะปัน\n\nสำหรับคู่รักหรือผู้ที่ต้องการความเงียบสงบอย่างแท้จริง วิลล่า A4 คือหลังมุมสุดทางเดินของสะปัน อันซีน น่าน ที่ไม่มีห้องอื่นเดินผ่านหน้าบ้าน\n\n### ไฮไลต์ที่แขกผู้เข้าพักหลงรัก\n- **อ่างแช่น้ำอุ่นกลางแจ้ง**: ทำอุณหภูมิคงที่ตลอดคืนด้วยระบบทำน้ำอุ่นแก๊ส พร้อมวิวทิวเขาซ้อนกันสุดสายตา\n- **หมูกระทะริมระเบียง**: สั่งเพิ่มได้ทันทีในขั้นตอนจองตรง ไม่มีค่าบริการแฝง เสิร์ฟตรงถึงห้องเวลา 17:30 น.\n- **จองตรงราคาดีกว่า**: ใช้รหัสคูปอง \`SAPANMIST500\` ลดเพิ่มทันที ฿500 เมื่อจองตรงบน Cangaroom (0% GP)`,
      coverImageUrl:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
      galleryUrls: [
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
      ],
      categoryTh: "รีวิวจริงจากที่พัก",
      tags: ["อ่างแช่น้ำ", "A-Frame", "สะปันอันซีน", "หมูกระทะ", "น่าน"],
      status: "PUBLISHED" as const,
      viewsCount: 289,
      publishedAt: new Date(now.getTime() - 5 * 86400000),
    },
    {
      hotelId: andamanHotel.id,
      authorId: ownerAndaman.id,
      roomId: createdRoomsByKey["PV1"]?.id ?? null,
      slug: "kamala-sunset-pool-villa-guide",
      titleTh: "เจาะลึกพูลวิลล่าหาดกมลา ภูเก็ต: มุมชมพระอาทิตย์ตกสวยที่สุดและแพ็กเกจ Floating Breakfast",
      titleEn: "Kamala Cliffside Sunset Pool Villas & Floating Breakfast Guide",
      excerptTh:
        "ทำความรู้จักหาดกมลา ฝั่งเงียบสงบของภูเก็ต พร้อมทริคเลือกวิลล่าสระน้ำเกลือไร้ขอบที่มองเห็นทะเลอันดามันแบบเต็มสายตา",
      contentTh: `## ทำไมสายพักผ่อนถึงเลือกโซนหน้าผาหาดกมลา\n\nหาดกมลาตั้งอยู่ระหว่างหาดป่าตองและหาดสุรินทร์ มีบรรยากาศเงียบสงบเป็นส่วนตัวกว่าโซนอื่น แต่เดินทางเชื่อมร้านอาหารดังและบีชคลับได้ใน 10 นาที\n\n### กิจกรรมแนะนำในวิลล่า\nเริ่มต้นเช้าวันใหม่ด้วย **Floating Breakfast** กลางสระว่ายน้ำส่วนตัวระบบเกลือ จากนั้นช่วง 17:45 น. รอชมพระอาทิตย์ตกสีทองเหนือท้องทะเลอันดามันจากเทอเรซหน้าห้องพัก`,
      coverImageUrl:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
      galleryUrls: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
      ],
      categoryTh: "คู่มือเที่ยว & ที่พัก",
      tags: ["ภูเก็ต", "พูลวิลล่า", "หาดกมลา", "ทะเลอันดามัน"],
      status: "PUBLISHED" as const,
      viewsCount: 356,
      publishedAt: new Date(now.getTime() - 3 * 86400000),
    },
    {
      hotelId: monchamHotel.id,
      authorId: ownerMoncham.id,
      roomId: createdRoomsByKey["ON1"]?.id ?? null,
      slug: "moncham-private-onsen-winter-guide",
      titleTh: "หนีเมืองไปแช่ออนเซ็นน้ำแร่ 40°C ท่ามกลางป่าสนม่อนแจ่ม เชียงใหม่",
      titleEn: "Private 40°C Mineral Onsen Escape in Mon Cham Pine Forest",
      excerptTh:
        "เช็กอุณหภูมิเฉลี่ยม่อนแจ่ม การเตรียมตัวพาน้องหมาเข้าพัก และวิธีจองวิลล่าไม้ฮิโนกิตรงกับที่พักแบบไม่ต้องผ่านเอเยนต์",
      contentTh: `## ฟีลญี่ปุ่นแบบขับรถขึ้นดอยเพียง 45 นาทีจากตัวเมืองเชียงใหม่\n\nม่อนแจ่ม ออนเซ็น รีทรีต ออกแบบวิลล่าจากไม้หอมฮิโนกิท่ามกลางแนวป่าสน อุณหภูมิกลางคืนเย็นสบาย 14–18 องศา เหมาะแก่การแช่น้ำแร่อุ่น 40°C คลายความเมื่อยล้า\n\n### พาน้องหมาและน้องแมวเข้าพักได้จริง\nโซน Garden Onsen Villa เปิดต้อนรับสัตว์เลี้ยงทุกสายพันธุ์ พร้อมลานหญ้าส่วนตัวให้เด็กๆ วิ่งเล่นอย่างปลอดภัย`,
      coverImageUrl:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
      galleryUrls: [
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85",
      ],
      categoryTh: "คู่มือเที่ยว & ที่พัก",
      tags: ["เชียงใหม่", "ม่อนแจ่ม", "ออนเซ็น", "Pet Friendly"],
      status: "PUBLISHED" as const,
      viewsCount: 274,
      publishedAt: new Date(now.getTime() - 4 * 86400000),
    },
  ];

  for (const postDef of blogPostDefs) {
    await prisma.hotelPost.upsert({
      where: {
        hotelId_slug: {
          hotelId: postDef.hotelId,
          slug: postDef.slug,
        },
      },
      update: {},
      create: postDef,
    });
  }

  const summary = await Promise.all([
    prisma.user.count(),
    prisma.hotel.count(),
    prisma.room.count(),
    prisma.pin.count(),
    prisma.coupon.count(),
    prisma.guestReview.count(),
    prisma.hotelPost.count(),
  ]);

  console.log("Seed completed successfully:", {
    users: summary[0],
    hotels: summary[1],
    rooms: summary[2],
    pins: summary[3],
    coupons: summary[4],
    reviews: summary[5],
    posts: summary[6],
  });
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
