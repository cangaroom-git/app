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

const CURATED_EXTERNAL_PROPERTIES = [
  {
    slug: "veranda-huahin-promo",
    nameTh: "วีรันดา รีสอร์ท แอนด์ วิลล่า หัวหิน",
    nameEn: "Veranda Resort & Villas Hua Hin",
    taglineTh: "รีสอร์ทติดหาดชะอำ-หัวหิน สระว่ายน้ำไร้ขอบริมทะเล",
    provinceId: "prachuap-khiri-khan",
    districtTh: "หัวหิน-ชะอำ",
    addressTh: "737/12 ถ.มุ่งทะเล ต.ชะอำ จ.เพชรบุรี-หัวหิน",
    latitude: 12.7105,
    longitude: 99.9694,
    stayStyles: ["sea", "pool-villa"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดหัวหิน-ชะอำ", distTh: "ติดชายหาด" },
      { nameTh: "ตลาดโต้รุ่งหัวหิน", distTh: "ขับรถ 15 นาที" },
      { nameTh: "ซิเคด้า มาร์เก็ต", distTh: "ขับรถ 20 นาที" },
    ],
    deal: {
      externalPostId: "ext-ttt-veranda-huahin-2026",
      titleTh: "โปรงานไทยเที่ยวไทย ห้อง Deluxe ติดหาด รวมอาหารเช้า 2 ท่าน",
      titleEn: "Thai Tiew Thai Beachfront Deluxe Deal with Breakfast",
      descriptionTh:
        "ดีล Voucher งานไทยเที่ยวไทย ห้อง Deluxe Seaview พร้อมอาหารเช้า 2 ท่านและส่วนลดสปา 20% ใช้เข้าพักวันอาทิตย์-พฤหัสบดี",
      externalSourceName: "ไทยเที่ยวไทย",
      externalDealUrl: "https://www.verandaresort.com/verandahuahin/",
      promoHeadlineTh: "ลด 38%",
      promoHeadlineEn: "38% OFF",
      promoCode: "TTTHH38",
      promoOriginalPriceThb: 5800,
      promoDealPriceThb: 3590,
      expiresInDays: 5,
      mediaUrls: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "sala-samui-chaweng-promo",
    nameTh: "ศาลา สมุย เฉวง บีช รีสอร์ท",
    nameEn: "SALA Samui Chaweng Beach Resort",
    taglineTh: "รีสอร์ทมินิมอลสีขาวริมหาดเฉวง สระรูปพระจันทร์สุดไอคอนิก",
    provinceId: "surat-thani",
    districtTh: "หาดเฉวง เกาะสมุย",
    addressTh: "99/10 ม.2 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี",
    latitude: 9.5418,
    longitude: 100.0684,
    stayStyles: ["sea", "pool-villa"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดเฉวง", distTh: "ติดชายหาด" },
      { nameTh: "Fisherman's Village บ่อผุด", distTh: "ขับรถ 12 นาที" },
      { nameTh: "สนามบินสมุย", distTh: "ขับรถ 10 นาที" },
    ],
    deal: {
      externalPostId: "ext-megatix-sala-samui-2026",
      titleTh: "Megatix E-Voucher ห้อง Pool Suite รวมอาหารเช้า + เครดิตรีสอร์ท ฿1,000",
      titleEn: "Megatix Pool Suite E-Voucher + ฿1,000 Resort Credit",
      descriptionTh:
        "เวาเชอร์ราคาพิเศษบน Megatix พัก Pool Suite ริมหาดเฉวง รวมอาหารเช้าสำหรับ 2 ท่าน และเครดิตอาหาร/สปา ฿1,000 ต่อการเข้าพัก",
      externalSourceName: "Megatix",
      externalDealUrl: "https://megatix.in.th/",
      promoHeadlineTh: "ลด ฿2,400",
      promoHeadlineEn: "฿2,400 OFF",
      promoCode: "SALASAMUI",
      promoOriginalPriceThb: 9900,
      promoDealPriceThb: 7500,
      expiresInDays: 9,
      mediaUrls: [
        "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1615460549969-36fa19521a4f?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "panviman-chiangmai-promo",
    nameTh: "ปานวิมาน เชียงใหม่ สปา รีสอร์ท",
    nameEn: "Panviman Chiang Mai Spa Resort",
    taglineTh: "รีสอร์ทบนยอดเขาแม่ริม วิวหุบเขาและหมอกเช้า 360 องศา",
    provinceId: "chiang-mai",
    districtTh: "อ.แม่ริม",
    addressTh: "197/2 ม.1 ต.โป่งแยง อ.แม่ริม จ.เชียงใหม่",
    latitude: 18.8981,
    longitude: 98.8235,
    stayStyles: ["mountain", "bathtub"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "ม่อนแจ่ม", distTh: "ขับรถ 12 นาที" },
      { nameTh: "สวนพฤกษศาสตร์สมเด็จพระนางเจ้าสิริกิติ์", distTh: "ขับรถ 10 นาที" },
      { nameTh: "น้ำตกแม่สา", distTh: "ขับรถ 18 นาที" },
    ],
    deal: {
      externalPostId: "ext-agoda-panviman-cm-2026",
      titleTh: "Flash Deal หน้าหนาว ห้อง Valley Deluxe วิวเขา + อ่างแช่จากุซซี่",
      titleEn: "Winter Flash Deal Valley Deluxe with Jacuzzi",
      descriptionTh:
        "โปรลดแรงเฉพาะช่วงหน้าหนาว จองผ่าน Agoda ราคาพิเศษพร้อมอาหารเช้าและสิทธิ์ยกเลิกฟรีก่อนวันเข้าพัก 7 วัน",
      externalSourceName: "Agoda",
      externalDealUrl: "https://www.agoda.com/",
      promoHeadlineTh: "ลด 32%",
      promoHeadlineEn: "32% OFF",
      promoCode: null,
      promoOriginalPriceThb: 4900,
      promoDealPriceThb: 3320,
      expiresInDays: 4,
      mediaUrls: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "float-house-kanchanaburi-promo",
    nameTh: "เดอะ โฟลต เฮาส์ ริเวอร์แคว กาญจนบุรี",
    nameEn: "The FloatHouse River Kwai",
    taglineTh: "วิลล่าลอยน้ำสุดหรูกลางแม่น้ำแควน้อย โอบล้อมด้วยป่าและสายหมอก",
    provinceId: "kanchanaburi",
    districtTh: "อ.ไทรโยค",
    addressTh: "55 ม.5 ต.วังกระแจะ อ.ไทรโยค จ.กาญจนบุรี",
    latitude: 14.2869,
    longitude: 98.9996,
    stayStyles: ["mountain", "glamping"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "ท่าเรือพุตะเคียน", distTh: "นั่งเรือ 15 นาที" },
      { nameTh: "ช่องเขาขาด", distTh: "ขับรถ 20 นาที" },
      { nameTh: "น้ำตกไทรโยคน้อย", distTh: "ขับรถ 25 นาที" },
    ],
    deal: {
      externalPostId: "ext-klook-floathouse-kan-2026",
      titleTh: "แพ็กเกจ Klook พักแพหรู 2 วัน 1 คืน รวมดินเนอร์ + เรือรับส่ง",
      titleEn: "Klook Floating Villa Package with Dinner & Boat Transfer",
      descriptionTh:
        "แพ็กเกจสุดคุ้มจาก Klook พัก Floating Villa ริมแม่น้ำแคว พร้อมอาหารเช้า-เย็น และเรือหางยาวรับส่งจากท่าเรือพุตะเคียน",
      externalSourceName: "Klook",
      externalDealUrl: "https://www.klook.com/th/",
      promoHeadlineTh: "ลด ฿1,100",
      promoHeadlineEn: "฿1,100 OFF",
      promoCode: "KLOOKKWAI",
      promoOriginalPriceThb: 5900,
      promoDealPriceThb: 4800,
      expiresInDays: 14,
      mediaUrls: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "the-standard-bangkok-promo",
    nameTh: "เดอะ สแตนดาร์ด แบงค็อก มหานคร",
    nameEn: "The Standard, Bangkok Mahanakhon",
    taglineTh: "โรงแรมดีไซน์ไอคอนิกใจกลางสาทร พร้อม SkyBeach รูฟท็อปบาร์สูงสุดในไทย",
    provinceId: "bangkok",
    districtTh: "สีลม-สาทร",
    addressTh: "114 ถ.นราธิวาสราชนครินทร์ แขวงสีลม เขตบางรัก กรุงเทพฯ",
    latitude: 13.7234,
    longitude: 100.5284,
    stayStyles: ["bars", "bathtub"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "BTS ช่องนนทรี", distTh: "เดิน 2 นาที" },
      { nameTh: "Mahanakhon SkyWalk", distTh: "ภายในอาคาร" },
      { nameTh: "สวนลุมพินี", distTh: "ขับรถ 8 นาที" },
    ],
    deal: {
      externalPostId: "ext-direct-standard-bkk-2026",
      titleTh: "โปร Staycation เว็บตรงโรงแรม แถมบัตรขึ้น SkyWalk + Late Checkout 15:00",
      titleEn: "Official Staycation Deal + Free SkyWalk & 3PM Checkout",
      descriptionTh:
        "จองผ่านเว็บไซต์ทางการของโรงแรม รับส่วนลดห้อง Standard King 25% พร้อมบัตรขึ้น Mahanakhon SkyWalk ฟรี 2 ใบ",
      externalSourceName: "เว็บตรงโรงแรม",
      externalDealUrl: "https://www.standardhotels.com/bangkok/properties/bangkok",
      promoHeadlineTh: "ลด 25%",
      promoHeadlineEn: "25% OFF",
      promoCode: "STAYBKK25",
      promoOriginalPriceThb: 7200,
      promoDealPriceThb: 5400,
      expiresInDays: 18,
      mediaUrls: [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "keemala-phuket-promo",
    nameTh: "กีมาลา ภูเก็ต วิลล่ารังนก",
    nameEn: "Keemala Phuket",
    taglineTh: "พูลวิลล่าดีไซน์รังนกและบ้านต้นไม้กลางป่าฝนกมลา",
    provinceId: "phuket",
    districtTh: "กมลา อ.กะทู้",
    addressTh: "10/88 หมู่ 6 ถ.นาคาสุวรรณ ต.กมลา อ.กะทู้ จ.ภูเก็ต",
    latitude: 7.9436,
    longitude: 98.2932,
    stayStyles: ["pool-villa", "mountain"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดกมลา", distTh: "ขับรถ 7 นาที" },
      { nameTh: "หาดสุรินทร์", distTh: "ขับรถ 12 นาที" },
    ],
    deal: {
      externalPostId: "ext-trip-keemala-phuket-2026",
      titleTh: "ดีล Trip.com Early Bird ลดพิเศษ Clay Pool Cottage รวมอาหารเช้า",
      titleEn: "Trip.com Early Bird Clay Pool Cottage Deal",
      descriptionTh:
        "จองล่วงหน้า 14 วันผ่าน Trip.com ลดเพิ่มทันที ฿3,000 สำหรับวิลล่าสระส่วนตัวกลางป่าฝน พร้อม Afternoon Tea",
      externalSourceName: "Trip.com",
      externalDealUrl: "https://th.trip.com/",
      promoHeadlineTh: "ลด ฿3,000",
      promoHeadlineEn: "฿3,000 OFF",
      promoCode: "TRIPPKT3000",
      promoOriginalPriceThb: 14500,
      promoDealPriceThb: 11500,
      expiresInDays: 11,
      mediaUrls: [
        "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "intercon-khaoyai-promo",
    nameTh: "อินเตอร์คอนติเนนตัล เขาใหญ่ รีสอร์ท",
    nameEn: "InterContinental Khao Yai Resort",
    taglineTh: "รีสอร์ทธีมตู้รถไฟสุดคลาสสิกกลางป่าสนและทะเลสาบเขาใหญ่",
    provinceId: "nakhon-ratchasima",
    districtTh: "อ.ปากช่อง เขาใหญ่",
    addressTh: "262 ม.6 ต.โป่งตาลอง อ.ปากช่อง จ.นครราชสีมา",
    latitude: 14.5392,
    longitude: 101.4728,
    stayStyles: ["glamping", "mountain", "bathtub"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "อุทยานแห่งชาติเขาใหญ่", distTh: "ขับรถ 25 นาที" },
      { nameTh: "Toscana Valley", distTh: "ขับรถ 10 นาที" },
    ],
    deal: {
      externalPostId: "ext-ttt-intercon-ky-2026",
      titleTh: "โปรไทยเที่ยวไทย ห้อง Classic Lake View + บุฟเฟต์อาหารเช้า",
      titleEn: "Thai Tiew Thai Classic Lake View Room Deal",
      descriptionTh:
        "บัตรกำนัลห้องพักวิวทะเลสาบสุดหรูในธีมตู้รถไฟเขาใหญ่ รวมอาหารเช้า 2 ท่านและส่วนลดห้องอาหาร Somying's Kitchen 15%",
      externalSourceName: "ไทยเที่ยวไทย",
      externalDealUrl: "https://khaoyai.intercontinental.com/",
      promoHeadlineTh: "ลด 30%",
      promoHeadlineEn: "30% OFF",
      promoCode: "TTTKY30",
      promoOriginalPriceThb: 7900,
      promoDealPriceThb: 5530,
      expiresInDays: 6,
      mediaUrls: [
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "rayavadee-krabi-promo",
    nameTh: "รายาวดี กระบี่ หาดไร่เลย์",
    nameEn: "Rayavadee Krabi",
    taglineTh: "พาวิลเลียน 2 ชั้นกลางสวนมะพร้าวติด 3 ชายหาดไร่เลย์",
    provinceId: "krabi",
    districtTh: "อ่าวไร่เลย์ อ.เมือง",
    addressTh: "214 ม.2 ต.อ่าวนาง อ.เมือง จ.กระบี่",
    latitude: 8.0061,
    longitude: 98.8396,
    stayStyles: ["sea", "pool-villa"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดพระนาง & ถ้ำพระนาง", distTh: "เดิน 3 นาที" },
      { nameTh: "หาดไร่เลย์ตะวันตก", distTh: "ติดชายหาด" },
    ],
    deal: {
      externalPostId: "ext-direct-rayavadee-2026",
      titleTh: "โปร Thai Resident พัก Deluxe Pavilion รวมสปีดโบ๊ทรับส่งไป-กลับ",
      titleEn: "Thai Resident Deluxe Pavilion + Complimentary Speedboat",
      descriptionTh:
        "สิทธิ์พิเศษเฉพาะคนไทยและผู้พำนักในไทย จองตรงหน้าเว็บโรงแรม รับส่วนลดห้องพัก 25% ฟรีเรือสปีดโบ๊ทรับส่งจากท่าเรือ",
      externalSourceName: "เว็บตรงโรงแรม",
      externalDealUrl: "https://www.rayavadee.com/",
      promoHeadlineTh: "ลด 25%",
      promoHeadlineEn: "25% OFF",
      promoCode: "THAIRES25",
      promoOriginalPriceThb: 13800,
      promoDealPriceThb: 10350,
      expiresInDays: 25,
      mediaUrls: [
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "capella-bangkok-promo",
    nameTh: "คาเพลลา กรุงเทพฯ ริมแม่น้ำเจ้าพระยา",
    nameEn: "Capella Bangkok Riverside",
    taglineTh: "โรงแรมหรูริมเจ้าพระยา พร้อม Stella Cocktail Bar ระดับเอเชีย",
    provinceId: "bangkok",
    districtTh: "เจริญกรุง",
    addressTh: "300/2 ถ.เจริญกรุง แขวงยานนาวา เขตสาทร กรุงเทพฯ",
    latitude: 13.7117,
    longitude: 100.5112,
    stayStyles: ["bars", "bathtub", "pool-villa"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "เอเชียทีค เดอะ ริเวอร์ฟร้อนท์", distTh: "เดิน 6 นาที" },
      { nameTh: "ท่าเรือสาทร", distTh: "นั่งเรือ 5 นาที" },
    ],
    deal: {
      externalPostId: "ext-megatix-capella-bkk-2026",
      titleTh: "Megatix Riverfront Stay + เครดิตค็อกเทลบาร์ Stella ฿2,000",
      titleEn: "Capella Riverfront Deal + ฿2,000 Stella Bar Credit",
      descriptionTh:
        "แพ็กเกจพักผ่อนริมแม่น้ำเจ้าพระยา รวมอาหารเช้าแชมเปญและเครดิตเครื่องดื่มที่บาร์ Stella",
      externalSourceName: "Megatix",
      externalDealUrl: "https://megatix.in.th/",
      promoHeadlineTh: "ลด ฿3,500",
      promoHeadlineEn: "฿3,500 OFF",
      promoCode: "CAPELLABAR",
      promoOriginalPriceThb: 19500,
      promoDealPriceThb: 16000,
      expiresInDays: 9,
      mediaUrls: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "kimpton-maalai-bangkok-promo",
    nameTh: "คิมป์ตัน มาลัย กรุงเทพฯ หลังสวน",
    nameEn: "Kimpton Maa-Lai Bangkok",
    taglineTh: "โรงแรม Pet-Friendly ใจกลางหลังสวน พร้อม Bar.Yard รูฟท็อปสุดชิล",
    provinceId: "bangkok",
    districtTh: "หลังสวน ปทุมวัน",
    addressTh: "78 ซ.ต้นสน แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ",
    latitude: 13.7396,
    longitude: 100.5435,
    stayStyles: ["bars", "bathtub"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "สวนลุมพินี", distTh: "เดิน 5 นาที" },
      { nameTh: "BTS ชิดลม", distTh: "เดิน 8 นาที" },
    ],
    deal: {
      externalPostId: "ext-klook-kimpton-bkk-2026",
      titleTh: "โปร Staycation + บัตร Bar.Yard Rooftop 2 แก้ว พาสัตว์เลี้ยงเข้าพักฟรี",
      titleEn: "Pet-Friendly Staycation + Bar.Yard Rooftop Cocktails",
      descriptionTh:
        "ห้อง Essential Room วิวสวนหลังสวน พร้อมฟรีค็อกเทลที่ Bar.Yard ชั้น 40 และต้อนรับสัตว์เลี้ยงฟรี",
      externalSourceName: "Klook",
      externalDealUrl: "https://www.klook.com/th/",
      promoHeadlineTh: "ลด 28%",
      promoHeadlineEn: "28% OFF",
      promoCode: "BARYARD28",
      promoOriginalPriceThb: 8900,
      promoDealPriceThb: 6400,
      expiresInDays: 12,
      mediaUrls: [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "baba-beach-club-phuket-promo",
    nameTh: "บาบา บีช คลับ นาใต้ พังงา-ภูเก็ต",
    nameEn: "Baba Beach Club Natai",
    taglineTh: "พูลวิลล่าและบีชคลับสุดฮิปติดหาดนาใต้ เสียงเพลงและวิวพระอาทิตย์ตก",
    provinceId: "phang-nga",
    districtTh: "หาดนาใต้ ตะกั่วทุ่ง",
    addressTh: "88 ม.5 ต.โคกกลอย อ.ตะกั่วทุ่ง จ.พังงา",
    latitude: 8.2738,
    longitude: 98.2775,
    stayStyles: ["bars", "sea", "pool-villa"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดนาใต้", distTh: "ติดชายหาด" },
      { nameTh: "สะพานสารสิน", distTh: "ขับรถ 12 นาที" },
    ],
    deal: {
      externalPostId: "ext-ttt-baba-natai-2026",
      titleTh: "โปรไทยเที่ยวไทย Baba Pool Suite ติดหาด + Beach Club Credit ฿1,500",
      titleEn: "Thai Tiew Thai Baba Pool Suite + Beach Club Credit",
      descriptionTh:
        "พูลสวีทกว้างขวางพร้อมสระส่วนตัว เดินลงหาดนาใต้ได้เลย รับเครดิตอาหารและเครื่องดื่มที่บีชคลับ ฿1,500",
      externalSourceName: "ไทยเที่ยวไทย",
      externalDealUrl: "https://www.bababeachclub.com/natai/",
      promoHeadlineTh: "ลด 35%",
      promoHeadlineEn: "35% OFF",
      promoCode: "BABANATAI",
      promoOriginalPriceThb: 12500,
      promoDealPriceThb: 8125,
      expiresInDays: 7,
      mediaUrls: [
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "lala-mukha-khaoyai-promo",
    nameTh: "ลาล่า มูก้า เต็นท์ รีสอร์ท เขาใหญ่",
    nameEn: "Lala Mukha Tented Resort Khao Yai",
    taglineTh: "แกลมปิ้งซาฟารีหรูติดแอร์กลางหุบเขาและทะเลสาบเขาใหญ่",
    provinceId: "nakhon-ratchasima",
    districtTh: "อ.ปากช่อง เขาใหญ่",
    addressTh: "515 ม.5 ต.หมูสี อ.ปากช่อง จ.นครราชสีมา",
    latitude: 14.5582,
    longitude: 101.4114,
    stayStyles: ["glamping", "mountain"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "อุทยานแห่งชาติเขาใหญ่", distTh: "ขับรถ 10 นาที" },
      { nameTh: "บ่อน้ำผุดธรรมชาติ", distTh: "ขับรถ 8 นาที" },
    ],
    deal: {
      externalPostId: "ext-agoda-lalamukha-2026",
      titleTh: "โปร Eco Safari Tent แกลมปิ้งเขาใหญ่ รวมอาหารเช้า + เซ็ตปิ้งย่าง",
      titleEn: "Eco Safari Tent Glamping Deal with Breakfast",
      descriptionTh:
        "พักเต็นท์ซาฟารีติดแอร์วิวผาเขาใหญ่ พร้อมสระว่ายน้ำกลางหุบเขาและอาหารเช้าบุฟเฟต์",
      externalSourceName: "Agoda",
      externalDealUrl: "https://www.agoda.com/",
      promoHeadlineTh: "ลด 30%",
      promoHeadlineEn: "30% OFF",
      promoCode: null,
      promoOriginalPriceThb: 4200,
      promoDealPriceThb: 2940,
      expiresInDays: 8,
      mediaUrls: [
        "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "hinoki-chiangdao-glamp-promo",
    nameTh: "ฮิโนกิ แคมป์ & ออนเซ็น เชียงดาว",
    nameEn: "Hinoki Camp & Onsen Chiang Dao",
    taglineTh: "เคบินไม้สนและเต็นท์โดมวิววิวดอยหลวงเชียงดาว พร้อมบ่อแช่น้ำอุ่นส่วนตัว",
    provinceId: "chiang-mai",
    districtTh: "อ.เชียงดาว",
    addressTh: "112 ม.4 ต.เชียงดาว อ.เชียงดาว จ.เชียงใหม่",
    latitude: 19.3665,
    longitude: 98.9612,
    stayStyles: ["glamping", "mountain", "bathtub"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "จุดชมวิวดอยหลวงเชียงดาว", distTh: "ขับรถ 10 นาที" },
      { nameTh: "ถ้ำเชียงดาว", distTh: "ขับรถ 14 นาที" },
    ],
    deal: {
      externalPostId: "ext-direct-hinoki-cd-2026",
      titleTh: "โปรหน้าหนาวเชียงดาว เคบินวิววิวดอยหลวง + ชุดหมูกระทะ + อาหารเช้า",
      titleEn: "Chiang Dao Winter Cabin + Onsen & Dinner Set",
      descriptionTh:
        "จองตรงหน้าเพจที่พัก รับส่วนลดทันที ฿600 สำหรับเคบินไม้พร้อมอ่างแช่ชมดอยหลวงเชียงดาว",
      externalSourceName: "เว็บตรงโรงแรม",
      externalDealUrl: "https://www.facebook.com/",
      promoHeadlineTh: "ลด ฿600",
      promoHeadlineEn: "฿600 OFF",
      promoCode: "DAO600",
      promoOriginalPriceThb: 3490,
      promoDealPriceThb: 2890,
      expiresInDays: 10,
      mediaUrls: [
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "phuchaisai-chiangrai-promo",
    nameTh: "ภูใจใส เมาน์เท่น รีสอร์ท เชียงราย",
    nameEn: "Phu Chaisai Mountain Resort Chiang Rai",
    taglineTh: "คอทเทจไม้ไผ่ธรรมชาติกลางหุบเขาแม่จัน ชมวิวไร่ชาและทะเลหมอก",
    provinceId: "chiang-rai",
    districtTh: "อ.แม่จัน",
    addressTh: "388 ม.4 ต.ศรีค้ำ อ.แม่จัน จ.เชียงราย",
    latitude: 20.1742,
    longitude: 99.7825,
    stayStyles: ["mountain", "glamping", "bathtub"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "ไร่ชาฉุยฟง", distTh: "ขับรถ 15 นาที" },
      { nameTh: "ดอยแม่สลอง", distTh: "ขับรถ 25 นาที" },
    ],
    deal: {
      externalPostId: "ext-trip-phuchaisai-cr-2026",
      titleTh: "Trip.com Exclusive Bamboo Mountain Cottage รวมอาหารเช้าออร์แกนิก",
      titleEn: "Trip.com Bamboo Mountain Cottage + Organic Breakfast",
      descriptionTh:
        "พักผ่อนกลางขุนเขาเชียงราย ราคาพิเศษพร้อมฟรี Afternoon Tea ชาอู่หลงแม่สลอง",
      externalSourceName: "Trip.com",
      externalDealUrl: "https://th.trip.com/",
      promoHeadlineTh: "ลด 25%",
      promoHeadlineEn: "25% OFF",
      promoCode: "TRIPCR25",
      promoOriginalPriceThb: 4800,
      promoDealPriceThb: 3600,
      expiresInDays: 15,
      mediaUrls: [
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "soneva-kiri-kohkood-promo",
    nameTh: "โซเนวา คีรี เกาะกูด พูลวิลล่า",
    nameEn: "High Season Pool Villa Koh Kood",
    taglineTh: "พูลวิลล่าส่วนตัวติดหาดคลองเจ้า น้ำใสสีฟ้าครามเกาะกูด",
    provinceId: "trat",
    districtTh: "หาดคลองเจ้า เกาะกูด",
    addressTh: "117 ม.2 ต.เกาะกูด อ.เกาะกูด จ.ตราด",
    latitude: 11.6328,
    longitude: 102.5432,
    stayStyles: ["sea", "pool-villa", "bars"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดคลองเจ้า", distTh: "ติดชายหาด" },
      { nameTh: "น้ำตกคลองเจ้า", distTh: "ขับรถ 10 นาที" },
    ],
    deal: {
      externalPostId: "ext-ttt-kohkood-2026",
      titleTh: "โปรเกาะกูด 3 วัน 2 คืน พูลวิลล่าติดหาด + เรือสปีดโบ๊ท + บีชบาร์",
      titleEn: "Koh Kood 3D2N Beachfront Pool Villa Package",
      descriptionTh:
        "แพ็กเกจสุดคุ้มเกาะกูด พักพูลวิลล่าติดหาดคลองเจ้า รวมอาหารเช้าและค็อกเทลชมพระอาทิตย์ตกริมหาด",
      externalSourceName: "ไทยเที่ยวไทย",
      externalDealUrl: "https://www.highseasonresort.com/",
      promoHeadlineTh: "ลด ฿2,000",
      promoHeadlineEn: "฿2,000 OFF",
      promoCode: "KOOD2000",
      promoOriginalPriceThb: 9800,
      promoDealPriceThb: 7800,
      expiresInDays: 13,
      mediaUrls: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
  {
    slug: "the-slate-phuket-promo",
    nameTh: "เดอะ สเลต ภูเก็ต หาดในยาง",
    nameEn: "The Slate Phuket",
    taglineTh: "รีสอร์ทดีไซน์อาร์ตติดหาดในยาง พร้อมบาร์กลางสระและอ่างแช่กลางแจ้ง",
    provinceId: "phuket",
    districtTh: "หาดในยาง ถลาง",
    addressTh: "116 ม.1 ต.สาคู อ.ถลาง จ.ภูเก็ต",
    latitude: 8.0884,
    longitude: 98.3005,
    stayStyles: ["sea", "bars", "bathtub", "pool-villa"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดในยาง", distTh: "เดิน 2 นาที" },
      { nameTh: "สนามบินภูเก็ต", distTh: "ขับรถ 10 นาที" },
    ],
    deal: {
      externalPostId: "ext-agoda-theslate-pkt-2026",
      titleTh: "โปร Agoda Pearl Bed Suite พร้อมอ่างแช่กลางแจ้ง & สระผู้ใหญ่",
      titleEn: "Agoda Pearl Bed Suite with Outdoor Tub",
      descriptionTh:
        "ห้องสวีทดีไซน์หรูเอกลักษณ์ภูเก็ต พร้อมอ่างอาบน้ำกลางแจ้งและบาร์ริมสระสุดสงบ",
      externalSourceName: "Agoda",
      externalDealUrl: "https://www.agoda.com/",
      promoHeadlineTh: "ลด 27%",
      promoHeadlineEn: "27% OFF",
      promoCode: null,
      promoOriginalPriceThb: 7800,
      promoDealPriceThb: 5690,
      expiresInDays: 11,
      mediaUrls: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1200&q=85",
      ],
    },
  },
];

const EXTRA_INTERNAL_PARTNERS = [
  {
    slug: "pua-mist-cabin-nan",
    nameTh: "ปัว มิสต์ เคบิน & แกลมปิ้ง น่าน",
    nameEn: "Pua Mist Cabin & Glamping Nan",
    taglineTh: "เคบินไม้กลางทุ่งนาและทะเลหมอกปัว พร้อมอ่างแช่น้ำอุ่นส่วนตัว",
    provinceId: "nan",
    districtTh: "อ.ปัว",
    addressTh: "45 ม.3 ต.ศิลาเพชร อ.ปัว จ.น่าน",
    latitude: 19.1684,
    longitude: 100.9168,
    stayStyles: ["mountain", "glamping", "bathtub"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "คาเฟ่เห็ดหัวน้ำ", distTh: "ขับรถ 6 นาที" },
      { nameTh: "วัดภูเก็ต ปัว", distTh: "ขับรถ 8 นาที" },
    ],
    roomPrice: 2890,
    couponCode: "PUA450",
    discountValue: 450,
    promoHeadlineTh: "ลด ฿450",
    promoHeadlineEn: "฿450 OFF",
    promoDealPriceThb: 2440,
  },
  {
    slug: "kohchang-horizon-villa",
    nameTh: "เกาะช้าง ฮอไรซอน พูลวิลล่า",
    nameEn: "Koh Chang Horizon Pool Villa",
    taglineTh: "พูลวิลล่าริมหาดคลองพร้าว ชมพระอาทิตย์ตกอ่าวไทยแบบส่วนตัว",
    provinceId: "trat",
    districtTh: "หาดคลองพร้าว เกาะช้าง",
    addressTh: "88/4 ม.4 ต.เกาะช้าง อ.เกาะช้าง จ.ตราด",
    latitude: 12.0625,
    longitude: 102.2932,
    stayStyles: ["sea", "pool-villa", "bars"],
    ratingAvg: 4.8,
    coverImageUrl:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "หาดคลองพร้าว", distTh: "ติดชายหาด" },
      { nameTh: "น้ำตกคลองพลู", distTh: "ขับรถ 10 นาที" },
    ],
    roomPrice: 4900,
    couponCode: "CHANG700",
    discountValue: 700,
    promoHeadlineTh: "ลด ฿700",
    promoHeadlineEn: "฿700 OFF",
    promoDealPriceThb: 4200,
  },
  {
    slug: "pai-onsen-sanctuary",
    nameTh: "ปาย ออนเซ็น แซงชัวรี แม่ฮ่องสอน",
    nameEn: "Pai Onsen Sanctuary Mae Hong Son",
    taglineTh: "วิลล่าบ่อแช่น้ำแร่ธรรมชาติส่วนตัวท่ามกลางสายหมอกเมืองปาย",
    provinceId: "mae-hong-son",
    districtTh: "อ.ปาย",
    addressTh: "29 ม.2 ต.แม่ฮี้ อ.ปาย จ.แม่ฮ่องสอน",
    latitude: 19.3589,
    longitude: 98.4581,
    stayStyles: ["mountain", "bathtub", "glamping"],
    ratingAvg: 4.9,
    coverImageUrl:
      "https://images.unsplash.com/photo-1615460549969-36fa19521a4f?auto=format&fit=crop&w=1200&q=85",
    nearbySpots: [
      { nameTh: "ถนนคนเดินปาย", distTh: "ขับรถ 6 นาที" },
      { nameTh: "กองแลน (Pai Canyon)", distTh: "ขับรถ 12 นาที" },
    ],
    roomPrice: 3400,
    couponCode: "PAIONSEN500",
    discountValue: 500,
    promoHeadlineTh: "ลด ฿500",
    promoHeadlineEn: "฿500 OFF",
    promoDealPriceThb: 2900,
  },
];

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (!admin) {
    throw new Error("SUPER_ADMIN user not found. Run npm run db:seed first.");
  }

  // 1. Cleanly unpublish the 2 old test hotels ("aaa", "aaaa") so dummy cards don't clutter Home/Explore
  await prisma.hotel.updateMany({
    where: { slug: { in: ["aaa", "aaaa"] } },
    data: { isPublished: false },
  });

  // 2. Clean up mismatched stock cover images on existing internal pins & enrich internal hero pins with crisp promo metadata
  const internalUpdates: Array<{
    slug: string;
    coverImageUrl: string;
    promoHeadlineTh: string;
    promoHeadlineEn: string;
    promoOriginalPriceThb: number;
    promoDealPriceThb: number;
    expiresInDays: number;
  }> = [
    {
      slug: "sapanunseen",
      coverImageUrl:
        "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838919/my-hotel/hero/obxqa4pz2mbziitzrgop.webp",
      promoHeadlineTh: "ลด ฿500",
      promoHeadlineEn: "฿500 OFF",
      promoOriginalPriceThb: 2990,
      promoDealPriceThb: 2490,
      expiresInDays: 12,
    },
    {
      slug: "andaman-cliff-phuket",
      coverImageUrl:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
      promoHeadlineTh: "ลด 15%",
      promoHeadlineEn: "15% OFF",
      promoOriginalPriceThb: 6500,
      promoDealPriceThb: 5525,
      expiresInDays: 16,
    },
    {
      slug: "krabi-cove-hideaway",
      coverImageUrl:
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
      promoHeadlineTh: "ลด 10%",
      promoHeadlineEn: "10% OFF",
      promoOriginalPriceThb: 4200,
      promoDealPriceThb: 3780,
      expiresInDays: 21,
    },
    {
      slug: "skyline-velvet-bangkok",
      coverImageUrl:
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
      promoHeadlineTh: "ลด ฿350",
      promoHeadlineEn: "฿350 OFF",
      promoOriginalPriceThb: 3800,
      promoDealPriceThb: 3450,
      expiresInDays: 19,
    },
    {
      slug: "moncham-onsen-retreat",
      coverImageUrl:
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=85",
      promoHeadlineTh: "ลด ฿400",
      promoHeadlineEn: "฿400 OFF",
      promoOriginalPriceThb: 3600,
      promoDealPriceThb: 3200,
      expiresInDays: 8,
    },
    {
      slug: "khaoyai-starlight-camp",
      coverImageUrl:
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=85",
      promoHeadlineTh: "ลด ฿300",
      promoHeadlineEn: "฿300 OFF",
      promoOriginalPriceThb: 2490,
      promoDealPriceThb: 2190,
      expiresInDays: 10,
    },
  ];

  const now = Date.now();
  for (const u of internalUpdates) {
    const hotel = await prisma.hotel.findUnique({
      where: { slug: u.slug },
      include: {
        coupons: { where: { isActive: true }, take: 1 },
        pins: { where: { publishStatus: "PUBLISHED" }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!hotel) continue;

    // Pick the primary coupon-linked pin (or first pin) and enrich it with crisp promo metadata
    const heroPin =
      hotel.pins.find((p) => p.couponId !== null) ?? hotel.pins[0] ?? null;
    if (heroPin) {
      await prisma.pin.update({
        where: { id: heroPin.id },
        data: {
          dealSourceType: "INTERNAL",
          couponId: hotel.coupons[0]?.id ?? heroPin.couponId,
          coverImageUrl: u.coverImageUrl,
          promoHeadlineTh: u.promoHeadlineTh,
          promoHeadlineEn: u.promoHeadlineEn,
          promoCode: hotel.coupons[0]?.code ?? null,
          promoOriginalPriceThb: u.promoOriginalPriceThb,
          promoDealPriceThb: u.promoDealPriceThb,
          promoExpiresAt: new Date(now + u.expiresInDays * 86400000),
          isSponsored: u.slug === "sapanunseen" || u.slug === "andaman-cliff-phuket",
        },
      });
    }
  }

  // 3. Upsert 8 curated External Promo Deals across Thailand
  for (const item of CURATED_EXTERNAL_PROPERTIES) {
    const hotel = await prisma.hotel.upsert({
      where: { slug: item.slug },
      update: {
        nameTh: item.nameTh,
        nameEn: item.nameEn,
        taglineTh: item.taglineTh,
        provinceId: item.provinceId,
        districtTh: item.districtTh,
        addressTh: item.addressTh,
        latitude: item.latitude,
        longitude: item.longitude,
        googleMapsUrl: `https://maps.google.com/?q=${item.latitude},${item.longitude}`,
        stayStyles: item.stayStyles,
        coverImageUrl: item.coverImageUrl,
        logoUrl: item.coverImageUrl,
        nearbySpotsJson: item.nearbySpots,
        ratingAvg: item.ratingAvg,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
      create: {
        slug: item.slug,
        ownerId: admin.id,
        nameTh: item.nameTh,
        nameEn: item.nameEn,
        taglineTh: item.taglineTh,
        provinceId: item.provinceId,
        districtTh: item.districtTh,
        addressTh: item.addressTh,
        latitude: item.latitude,
        longitude: item.longitude,
        googleMapsUrl: `https://maps.google.com/?q=${item.latitude},${item.longitude}`,
        stayStyles: item.stayStyles,
        coverImageUrl: item.coverImageUrl,
        logoUrl: item.coverImageUrl,
        nearbySpotsJson: item.nearbySpots,
        ratingAvg: item.ratingAvg,
        reviewCount: 24,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
    });

    await prisma.pin.upsert({
      where: {
        hotelId_sourcePlatform_externalPostId: {
          hotelId: hotel.id,
          sourcePlatform: "MANUAL",
          externalPostId: item.deal.externalPostId,
        },
      },
      update: {
        dealSourceType: "EXTERNAL",
        externalSourceName: item.deal.externalSourceName,
        externalDealUrl: item.deal.externalDealUrl,
        promoHeadlineTh: item.deal.promoHeadlineTh,
        promoHeadlineEn: item.deal.promoHeadlineEn,
        promoCode: item.deal.promoCode,
        promoOriginalPriceThb: item.deal.promoOriginalPriceThb,
        promoDealPriceThb: item.deal.promoDealPriceThb,
        promoExpiresAt: new Date(now + item.deal.expiresInDays * 86400000),
        titleTh: item.deal.titleTh,
        titleEn: item.deal.titleEn,
        descriptionTh: item.deal.descriptionTh,
        coverImageUrl: item.coverImageUrl,
        mediaUrls: item.deal.mediaUrls,
        mediaType: "CAROUSEL",
        provinceId: item.provinceId,
        stayStyles: item.stayStyles,
        publishStatus: "PUBLISHED",
      },
      create: {
        hotelId: hotel.id,
        sourcePlatform: "MANUAL",
        externalPostId: item.deal.externalPostId,
        dealSourceType: "EXTERNAL",
        externalSourceName: item.deal.externalSourceName,
        externalDealUrl: item.deal.externalDealUrl,
        promoHeadlineTh: item.deal.promoHeadlineTh,
        promoHeadlineEn: item.deal.promoHeadlineEn,
        promoCode: item.deal.promoCode,
        promoOriginalPriceThb: item.deal.promoOriginalPriceThb,
        promoDealPriceThb: item.deal.promoDealPriceThb,
        promoExpiresAt: new Date(now + item.deal.expiresInDays * 86400000),
        titleTh: item.deal.titleTh,
        titleEn: item.deal.titleEn,
        descriptionTh: item.deal.descriptionTh,
        coverImageUrl: item.coverImageUrl,
        mediaUrls: item.deal.mediaUrls,
        mediaType: "CAROUSEL",
        aspectRatio: "aspect-[4/3]",
        provinceId: item.provinceId,
        stayStyles: item.stayStyles,
        semanticTags: [item.deal.externalSourceName, item.districtTh],
        publishStatus: "PUBLISHED",
        likesCount: 38 + Math.floor(Math.random() * 90),
      },
    });
  }

  // 4. Upsert extra Internal 0% GP partner stays so every slide row has 6-10 rich cards!
  for (const partner of EXTRA_INTERNAL_PARTNERS) {
    const hotel = await prisma.hotel.upsert({
      where: { slug: partner.slug },
      update: {
        nameTh: partner.nameTh,
        nameEn: partner.nameEn,
        taglineTh: partner.taglineTh,
        provinceId: partner.provinceId,
        districtTh: partner.districtTh,
        addressTh: partner.addressTh,
        latitude: partner.latitude,
        longitude: partner.longitude,
        googleMapsUrl: `https://maps.google.com/?q=${partner.latitude},${partner.longitude}`,
        stayStyles: partner.stayStyles,
        coverImageUrl: partner.coverImageUrl,
        logoUrl: partner.coverImageUrl,
        nearbySpotsJson: partner.nearbySpots,
        ratingAvg: partner.ratingAvg,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
      create: {
        slug: partner.slug,
        ownerId: admin.id,
        nameTh: partner.nameTh,
        nameEn: partner.nameEn,
        taglineTh: partner.taglineTh,
        descriptionTh: partner.taglineTh,
        provinceId: partner.provinceId,
        districtTh: partner.districtTh,
        addressTh: partner.addressTh,
        latitude: partner.latitude,
        longitude: partner.longitude,
        googleMapsUrl: `https://maps.google.com/?q=${partner.latitude},${partner.longitude}`,
        stayStyles: partner.stayStyles,
        coverImageUrl: partner.coverImageUrl,
        logoUrl: partner.coverImageUrl,
        nearbySpotsJson: partner.nearbySpots,
        promptPayId: "0957797971",
        promptPayAccountName: partner.nameTh,
        ratingAvg: partner.ratingAvg,
        reviewCount: 19,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
    });

    await prisma.room.upsert({
      where: { hotelId_code: { hotelId: hotel.id, code: "V1" } },
      update: { weekdayPriceThb: partner.roomPrice, weekendPriceThb: partner.roomPrice + 400 },
      create: {
        hotelId: hotel.id,
        code: "V1",
        slug: "signature-villa",
        nameTh: "ซิกเนเจอร์ วิลล่า",
        nameEn: "Signature Villa",
        weekdayPriceThb: partner.roomPrice,
        weekendPriceThb: partner.roomPrice + 400,
        galleryUrls: [partner.coverImageUrl],
      },
    });

    const coupon = await prisma.coupon.upsert({
      where: { hotelId_code: { hotelId: hotel.id, code: partner.couponCode } },
      update: {
        titleTh: `${partner.promoHeadlineTh} จองตรง 0% GP ที่ ${partner.nameTh}`,
        discountType: "FIXED_THB",
        discountValue: partner.discountValue,
        expiresAt: new Date(now + 20 * 86400000),
        isActive: true,
      },
      create: {
        hotelId: hotel.id,
        code: partner.couponCode,
        titleTh: `${partner.promoHeadlineTh} จองตรง 0% GP ที่ ${partner.nameTh}`,
        titleEn: `${partner.promoHeadlineEn} Direct 0% GP`,
        discountType: "FIXED_THB",
        discountValue: partner.discountValue,
        minSpendThb: 2000,
        totalQuota: 50,
        expiresAt: new Date(now + 20 * 86400000),
        isFeaturedDeal: true,
        isActive: true,
      },
    });

    await prisma.pin.upsert({
      where: {
        hotelId_sourcePlatform_externalPostId: {
          hotelId: hotel.id,
          sourcePlatform: "MANUAL",
          externalPostId: `internal-hero-${partner.slug}`,
        },
      },
      update: {
        dealSourceType: "INTERNAL",
        couponId: coupon.id,
        promoHeadlineTh: partner.promoHeadlineTh,
        promoHeadlineEn: partner.promoHeadlineEn,
        promoCode: partner.couponCode,
        promoOriginalPriceThb: partner.roomPrice,
        promoDealPriceThb: partner.promoDealPriceThb,
        promoExpiresAt: new Date(now + 16 * 86400000),
        coverImageUrl: partner.coverImageUrl,
        mediaUrls: [
          partner.coverImageUrl,
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
        ],
        provinceId: partner.provinceId,
        stayStyles: partner.stayStyles,
        publishStatus: "PUBLISHED",
      },
      create: {
        hotelId: hotel.id,
        sourcePlatform: "MANUAL",
        externalPostId: `internal-hero-${partner.slug}`,
        dealSourceType: "INTERNAL",
        couponId: coupon.id,
        promoHeadlineTh: partner.promoHeadlineTh,
        promoHeadlineEn: partner.promoHeadlineEn,
        promoCode: partner.couponCode,
        promoOriginalPriceThb: partner.roomPrice,
        promoDealPriceThb: partner.promoDealPriceThb,
        promoExpiresAt: new Date(now + 16 * 86400000),
        titleTh: partner.taglineTh,
        titleEn: partner.nameEn,
        descriptionTh: `${partner.taglineTh} · ใช้โค้ด ${partner.couponCode} ลดทันที ${partner.promoHeadlineTh} เมื่อจองตรง 0% GP`,
        coverImageUrl: partner.coverImageUrl,
        mediaUrls: [
          partner.coverImageUrl,
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85",
        ],
        mediaType: "CAROUSEL",
        aspectRatio: "aspect-[4/3]",
        provinceId: partner.provinceId,
        stayStyles: partner.stayStyles,
        publishStatus: "PUBLISHED",
        likesCount: 54,
      },
    });
  }

  const totalDeals = await prisma.pin.count({
    where: {
      publishStatus: "PUBLISHED",
      hotel: { isPublished: true },
    },
  });
  const extDeals = await prisma.pin.count({
    where: {
      publishStatus: "PUBLISHED",
      dealSourceType: "EXTERNAL",
      hotel: { isPublished: true },
    },
  });
  console.log(
    `Done! Published pins: ${totalDeals} (External curated deals: ${extDeals})`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
