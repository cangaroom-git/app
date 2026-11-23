import "dotenv/config";
import type {
  MerchantMode,
  PlaceCategory,
  PromoKind,
  PropertyType,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";

interface SeedPlaceDef {
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  descriptionTh: string;
  provinceId: string;
  districtTh: string;
  addressTh: string;
  latitude: number;
  longitude: number;
  placeCategory: PlaceCategory;
  merchantMode: MerchantMode;
  propertyType: PropertyType;
  externalWebsiteUrl: string;
  primaryCtaLabelTh: string;
  contactLine: string;
  contactPhone: string;
  openingHoursJson: Array<{ day: string; open: string; close: string }>;
  stayStyles: string[];
  semanticTags: string[];
  coverImageUrl: string;
  galleryUrls: string[];
  likesCount: number;
  savesCount: number;
  ratingAvg: number;
  promos: Array<{
    code: string;
    titleTh: string;
    descriptionTh: string;
    promoKind: PromoKind;
    badgeTextTh: string;
    badgeTextEn: string;
    discountType: "PERCENT" | "FIXED_THB";
    discountValue: number;
    minSpendThb: number;
    isFeatured: boolean;
  }>;
  feedPosts: Array<{
    slug: string;
    titleTh: string;
    excerptTh: string;
    contentTh: string;
    coverImageUrl: string;
    galleryUrls: string[];
    daysAgo: number;
  }>;
  blogs: Array<{
    slug: string;
    titleTh: string;
    excerptTh: string;
    contentTh: string;
    coverImageUrl: string;
    categoryTh: string;
    tags: string[];
    daysAgo: number;
  }>;
  comments?: Array<{
    body: string;
    ownerReply?: string;
  }>;
}

const DAILY_CAFE_HOURS = [
  { day: "จันทร์ – ศุกร์", open: "08:00", close: "17:30" },
  { day: "เสาร์ – อาทิตย์", open: "07:30", close: "18:00" },
];

const DAILY_DINING_HOURS = [
  { day: "ทุกวัน", open: "11:00", close: "21:30" },
];

const DAILY_ATTRACTION_HOURS = [
  { day: "ทุกวัน", open: "06:00", close: "18:00" },
];

const DAILY_WELLNESS_HOURS = [
  { day: "ทุกวัน", open: "10:00", close: "21:00" },
];

const NEW_NON_STAY_PLACES: SeedPlaceDef[] = [
  // ============================ NAN (สะปัน / ปัว) ============================
  {
    slug: "sapan-valley-coffee",
    nameTh: "สะปัน วัลเลย์ โรสเตอร์ส & คาเฟ่",
    nameEn: "Sapan Valley Roasters & Cafe",
    taglineTh: "กาแฟดริปเมล็ดน่านคั่วสด ชมวิวหุบเขาสะปันและลำธารสายหมอก",
    descriptionTh:
      "คาเฟ่ไม้สไตล์มินิมอลกลางหุบเขาสะปัน คัดเมล็ดกาแฟอาราบิก้าจากดอยสวนยาหลวงคั่วเองหน้าร้าน พร้อมระเบียงไม้ชมทะเลหมอกยามเช้าและเบเกอรี่โฮมเมดอบสดทุกวัน",
    provinceId: "nan",
    districtTh: "บ่อเกลือ",
    addressTh: "หมู่บ้านสะปัน ต.ดงพญา อ.บ่อเกลือ จ.น่าน",
    latitude: 19.1938,
    longitude: 101.1965,
    placeCategory: "CAFE",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://instagram.com",
    primaryCtaLabelTh: "ดูเมนู & พิกัดร้าน",
    contactLine: "@sapanvalleycoffee",
    contactPhone: "081-234-5501",
    openingHoursJson: DAILY_CAFE_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["คาเฟ่น่าน", "กาแฟดริป", "สะปัน", "วิวหมอก", "เบเกอรี่"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 5200,
    savesCount: 840,
    ratingAvg: 4.9,
    promos: [
      {
        code: "SAPANCAFE15",
        titleTh: "ลด 15% เมนูกาแฟดริป & ซิกเนเจอร์",
        descriptionTh:
          "แสดงการ์ดร้านบน Nondii ที่เคาน์เตอร์รับส่วนลดเครื่องดื่มทันที 15% ไม่จำกัดยอดขั้นต่ำ",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 15% เครื่องดื่ม",
        badgeTextEn: "15% OFF Drinks",
        discountType: "PERCENT",
        discountValue: 15,
        minSpendThb: 0,
        isFeatured: true,
      },
      {
        code: "SAPANCROFFLE",
        titleTh: "ฟรีครัวซองต์มินิ เมื่อสั่งครบ ฿350",
        descriptionTh:
          "รับฟรีครัวซองต์เนยฝรั่งเศสอบใหม่ 1 ชิ้น เมื่อมียอดสั่งเครื่องดื่มและขนมครบ ฿350 ต่อใบเสร็จ",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ฟรีครัวซองต์ 1 ชิ้น",
        badgeTextEn: "Free Croissant",
        discountType: "FIXED_THB",
        discountValue: 95,
        minSpendThb: 350,
        isFeatured: false,
      },
    ],
    feedPosts: [
      {
        slug: "morning-mist-drip-nan-nov",
        titleTh: "หมอกเช้านี้ลงหนามากที่ระเบียงสะปัน 16°C",
        excerptTh:
          "เช้านี้เปิดเตาคั่วล็อตใหม่เมล็ดดอยสวนยาหลวง Honey Process หอมกลิ่นดอกไม้ป่าและพีชอ่อน ๆ ใครแวะมาสะปันวันนี้แวะมานั่งจิบกาแฟอุ่น ๆ ชมหมอกไหลผ่านลำธารกันนะครับ",
        contentTh:
          "เช้านี้เปิดเตาคั่วล็อตใหม่เมล็ดดอยสวนยาหลวง Honey Process หอมกลิ่นดอกไม้ป่าและพีชอ่อน ๆ อุณหภูมิ 16 องศา ระเบียงฝั่งลำธารแสงสวยมากช่วง 07:30–09:00 น. โชว์การ์ด Nondii ลดเครื่องดื่ม 15% ตลอดทั้งวันครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80",
        ],
        daysAgo: 1,
      },
      {
        slug: "new-dirty-macadamia-menu",
        titleTh: "เมนูใหม่ประจำฤดูหนาว: Dirty Macadamia Nan",
        excerptTh:
          "นมเย็นจัดผสมไซรัปแมคคาเดเมียคั่วจากดอยน่าน ราดช็อตเอสเปรสโซ่คั่วกลางเข้ม นุ่มละมุนไม่ต้องเติมน้ำตาล เปิดขายแล้ววันนี้เฉพาะช่วงหน้าหนาว",
        contentTh:
          "เปิดตัวเมนูพิเศษประจำฤดูหนาว Dirty Macadamia Nan ใช้นมเย็นจัดอุณหภูมิติดลบเล็กน้อย ผสมครีมแมคคาเดเมียคั่วหอมจากเกษตรกรในจังหวัดน่าน ราดด้วยช็อตเอสเปรสโซ่คั่วกลางเข้ม รสชาติกลมกล่อมลงตัวมากครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1080&q=80",
        ],
        daysAgo: 4,
      },
    ],
    blogs: [
      {
        slug: "sapan-coffee-guide-morning-route",
        titleTh: "คู่มือเที่ยวน่านสายกาแฟ: เส้นทางดริปสะปัน–บ่อเกลือ 1 วัน",
        excerptTh:
          "แนะนำช่วงเวลาที่หมอกสวยที่สุด จุดจอดรถสะดวก และวิธีเลือกเมล็ดกาแฟดอยน่านติดมือกลับบ้านสำหรับคอกาแฟตัวจริง",
        contentTh:
          "หากคุณพักแถวสะปัน แนะนำให้ออกจากที่พักช่วง 07:30 น. เพื่อเก็บแสงเช้าที่หุบเขา จากนั้นแวะจิบกาแฟดริปเมล็ดสวนยาหลวง ก่อนขับรถต่อไปบ่อเกลือสินเธาว์โบราณเพียง 15 นาที\n\nเคล็ดลับเลือกเมล็ดกาแฟน่าน: ช่วงปลายปีเมล็ด Washed Process จะให้กลิ่นซิตรัสสดชื่น ส่วน Honey Process จะได้ความหวานฉ่ำเหมือนผลไม้สุก เหมาะทั้งชงดริปร้อนและอเมริกาโน่เย็นครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1080&q=80",
        categoryTh: "คู่มือคาเฟ่ & กาแฟ",
        tags: ["คาเฟ่น่าน", "สะปัน", "กาแฟดริป"],
        daysAgo: 6,
      },
    ],
    comments: [
      {
        body: "มีที่จอดรถสำหรับรถเก๋งไหมคะ ทางเข้าชันไหม",
        ownerReply:
          "มีลานจอดรถด้านหน้าร้านจอดได้ประมาณ 12 คันครับ ทางลาดคอนกรีตเรียบ รถเก๋งขับเข้าได้สบายเลยครับ",
      },
    ],
  },
  {
    slug: "krua-rim-wa-sapan",
    nameTh: "ครัวริมน้ำว้า อาหารเหนือสะปัน",
    nameEn: "Krua Rim Wa Sapan Local Dining",
    taglineTh: "ขันโตกพื้นเมืองและไก่ทอดมะแขว่นสูตรบ่อเกลือ ริมลำธารน้ำใส",
    descriptionTh:
      "ร้านอาหารพื้นเมืองรสมือชาวน่านแท้ ๆ ริมลำน้ำว้า เมนูห้ามพลาดคือไก่ทอดมะแขว่นเกลือสินเธาว์ แกงฮังเลหมูสามชั้นนุ่ม และน้ำพริกอ่องผักพื้นบ้านปลอดสาร",
    provinceId: "nan",
    districtTh: "บ่อเกลือ",
    addressTh: "ริมลำน้ำว้า หมู่บ้านสะปัน อ.บ่อเกลือ จ.น่าน",
    latitude: 19.1889,
    longitude: 101.2012,
    placeCategory: "RESTAURANT",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://facebook.com",
    primaryCtaLabelTh: "โทรจองโต๊ะ",
    contactLine: "@kruarimwa",
    contactPhone: "089-412-8801",
    openingHoursJson: DAILY_DINING_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["อาหารเหนือ", "สะปัน", "บ่อเกลือ", "ริมน้ำ"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 342,
    savesCount: 95,
    ratingAvg: 4.8,
    promos: [
      {
        code: "RIMWAFREE",
        titleTh: "ฟรีน้ำพริกอ่องชุดเล็ก เมื่อทานครบ ฿600",
        descriptionTh:
          "แสดงการ์ดร้านจาก Nondii ก่อนสั่งอาหาร รับฟรีน้ำพริกอ่องผักสด 1 ชุด",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ฟรีน้ำพริกอ่อง",
        badgeTextEn: "Free Local Dip",
        discountType: "FIXED_THB",
        discountValue: 120,
        minSpendThb: 600,
        isFeatured: true,
      },
    ],
    feedPosts: [
      {
        slug: "salt-grilled-chicken-makhwaen",
        titleTh: "ไก่ทอดมะแขว่นเกลือสินเธาว์บ่อเกลือ กรอบนอกนุ่มใน",
        excerptTh:
          "วันนี้ได้เกลือสินเธาว์ต้มสดจากบ่อเกลือมาหมักคู่กับเม็ดมะแขว่นคั่วหอม ๆ ทานคู่ข้าวเหนียวร้อน ๆ ริมลำธารฟินมากครับ",
        contentTh:
          "เมนูขายดีอันดับ 1 ของร้าน ไก่บ้านหมักเกลือสินเธาว์บ่อเกลือและเม็ดมะแขว่นคั่วสด ทอดไฟกลางจนหนังกรอบหอมกลิ่นสมุนไพร โต๊ะริมน้ำช่วงเย็นแนะนำโทรจองล่วงหน้าก่อน 17:00 น. นะครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80",
        ],
        daysAgo: 2,
      },
    ],
    blogs: [],
  },
  {
    slug: "sapan-waterfall-nan",
    nameTh: "น้ำตกสะปัน เส้นทางเดินป่าสีเขียว",
    nameEn: "Sapan Waterfall Nature Trail",
    taglineTh: "น้ำตก 3 ชั้นกลางป่าดิบเขา เดินสบาย 300 เมตร น้ำใสเย็นตลอดปี",
    descriptionTh:
      "น้ำตกธรรมชาติขนาดกลางในอุทยานแห่งชาติขุนน่าน ทางเดินปูหินร่มรื่นเดินง่ายเหมาะสำหรับทุกวัย ห่างจากหมู่บ้านสะปันเพียง 5 นาที",
    provinceId: "nan",
    districtTh: "บ่อเกลือ",
    addressTh: "อุทยานแห่งชาติขุนน่าน บ้านสะปัน อ.บ่อเกลือ จ.น่าน",
    latitude: 19.1992,
    longitude: 101.2094,
    placeCategory: "ATTRACTION",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://maps.google.com/?q=19.1992,101.2094",
    primaryCtaLabelTh: "ดูเส้นทาง Google Maps",
    contactLine: "",
    contactPhone: "",
    openingHoursJson: DAILY_ATTRACTION_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["น้ำตก", "สะปัน", "น่าน", "ธรรมชาติ", "เดินป่า"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 1890,
    savesCount: 410,
    ratingAvg: 4.9,
    promos: [], // Intentionally NO promo to test clean 2-line card!
    feedPosts: [
      {
        slug: "sapan-waterfall-clear-water",
        titleTh: "อัปเดตสภาพน้ำ: น้ำใสไหลแรง อากาศเย็นสบาย",
        excerptTh:
          "ช่วงนี้น้ำตกสะปันน้ำใสสะอาดมาก แสงแดดส่องทะลุยอดไม้ลงมาชั้นที่ 2 ช่วง 09:00–11:00 น. ถ่ายรูปสวยที่สุด แนะนำใส่รองเท้ากันลื่นนะครับ",
        contentTh:
          "ช่วงนี้น้ำตกสะปันน้ำใสสะอาดมาก แสงแดดส่องทะลุยอดไม้ลงมาชั้นที่ 2 ช่วง 09:00–11:00 น. ถ่ายรูปสวยที่สุด เดินจากลานจอดรถเพียง 10 นาที แนะนำใส่รองเท้าผ้าใบหรือรองเท้ารัดส้นครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [],
        daysAgo: 3,
      },
    ],
    blogs: [],
  },
  {
    slug: "road-no-3-nan",
    nameTh: "จุดชมวิวถนนเลข 3 น่าน",
    nameEn: "Nan Road No. 3 Scenic Viewpoint",
    taglineTh: "โค้งถนนลอยฟ้าทรงเลข 3 สัญลักษณ์ห้ามพลาดเส้นทางปัว–บ่อเกลือ",
    descriptionTh:
      "จุดเช็คอินยอดนิยมบนทางหลวงหมายเลข 1081 เส้นสันติสุข–บ่อเกลือ โค้งถนนโอบล้อมด้วยภูเขาเขียวขจี มีลานจอดรถและระเบียงถ่ายภาพปลอดภัย",
    provinceId: "nan",
    districtTh: "สันติสุข",
    addressTh: "ทางหลวงหมายเลข 1081 ต.อวน อ.ปัว จ.น่าน",
    latitude: 19.0485,
    longitude: 101.1482,
    placeCategory: "ATTRACTION",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://maps.google.com/?q=19.0485,101.1482",
    primaryCtaLabelTh: "นำทางไปจุดชมวิว",
    contactLine: "",
    contactPhone: "",
    openingHoursJson: DAILY_ATTRACTION_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["ถนนเลข 3", "น่าน", "จุดชมวิว", "ขับรถเที่ยว"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 12400,
    savesCount: 2300,
    ratingAvg: 4.9,
    promos: [], // Intentionally NO promo
    feedPosts: [],
    blogs: [],
  },
  {
    slug: "pua-cocoa-craft-cafe",
    nameTh: "ปัว โกโก้ คราฟต์ & ฟาร์ม คาเฟ่",
    nameEn: "Pua Cocoa Craft & Farm Cafe",
    taglineTh: "โกโก้สดปลูกเองจากสวนปัว คั่วบดทำช็อกโกแลตบาร์แบบ Bean-to-Bar",
    descriptionTh:
      "คาเฟ่กลางสวนโกโก้เมืองปัว เสิร์ฟโกโก้เข้มข้น 70%–85% ไอศกรีมโกโก้สด และทัวร์เดินชมสวนโกโก้แบบใกล้ชิด",
    provinceId: "nan",
    districtTh: "ปัว",
    addressTh: "ต.ปัว อ.ปัว จ.น่าน",
    latitude: 19.1741,
    longitude: 100.9225,
    placeCategory: "CAFE",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://facebook.com",
    primaryCtaLabelTh: "ดูเพจร้าน",
    contactLine: "@puacocoa",
    contactPhone: "085-110-4422",
    openingHoursJson: DAILY_CAFE_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["โกโก้ปัว", "คาเฟ่น่าน", "ช็อกโกแลตคราฟต์"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 0, // Intentionally 0 to verify heart-only (hide "0") UX!
    savesCount: 0,
    ratingAvg: 4.9,
    promos: [
      {
        code: "PUACOCOA10",
        titleTh: "ลด 10% เมนูคราฟต์โกโก้ทุกแก้ว",
        descriptionTh: "แสดงการ์ดจาก Nondii รับส่วนลดทันที 10% สำหรับเครื่องดื่มโกโก้ทุกรายการ",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 10% โกโก้",
        badgeTextEn: "10% OFF Cocoa",
        discountType: "PERCENT",
        discountValue: 10,
        minSpendThb: 0,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },

  // ============================ CHIANG MAI (ม่อนแจ่ม / เมือง) ============================
  {
    slug: "moncham-cloud-roasters",
    nameTh: "ม่อนแจ่ม คลาวด์ คอฟฟี่ เฮาส์",
    nameEn: "Moncham Cloud Coffee House",
    taglineTh: "ระเบียงกาแฟลอยฟ้าบนสันเขาม่อนแจ่ม วิวสวนดอกไม้ 360 องศา",
    descriptionTh:
      "ร้านกาแฟสไตล์เรือนกระจกไม้บนสันเขาม่อนแจ่ม คัดเมล็ดกาแฟดอยแม่ริมคั่วอ่อน-กลาง พร้อมเค้กสตรอว์เบอร์รีสดเก็บจากไร่ข้างเคียง",
    provinceId: "chiang-mai",
    districtTh: "แม่ริม",
    addressTh: "ต.แม่แรม อ.แม่ริม จ.เชียงใหม่",
    latitude: 18.9388,
    longitude: 98.8261,
    placeCategory: "CAFE",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://instagram.com",
    primaryCtaLabelTh: "ดูเมนูร้าน",
    contactLine: "@monchamcloud",
    contactPhone: "082-331-9012",
    openingHoursJson: DAILY_CAFE_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["ม่อนแจ่ม", "คาเฟ่เชียงใหม่", "กาแฟดอย", "วิวเขา"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 2850,
    savesCount: 530,
    ratingAvg: 4.9,
    promos: [
      {
        code: "CLOUD40",
        titleTh: "ลด ฿40 แก้วที่ 2 เมื่อสั่งคู่เบเกอรี่",
        descriptionTh: "โชว์การ์ดร้านบน Nondii รับส่วนลด ฿40 สำหรับเครื่องดื่มแก้วที่ 2",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด ฿40 แก้วที่ 2",
        badgeTextEn: "฿40 OFF 2nd Cup",
        discountType: "FIXED_THB",
        discountValue: 40,
        minSpendThb: 180,
        isFeatured: true,
      },
    ],
    feedPosts: [
      {
        slug: "strawberry-shortcake-season",
        titleTh: "เค้กสตรอว์เบอร์รีสดม่อนแจ่ม กลับมาแล้วครับ",
        excerptTh:
          "สตรอว์เบอร์รีพันธุ์ 80 ลูกแรกของฤดูเก็บสดจากแปลงเช้านี้ หวานกรอบมาก ทำเป็นชอร์ตเค้กครีมสดจำนวนจำกัดวันละ 24 ชิ้น",
        contentTh:
          "สตรอว์เบอร์รีพันธุ์ 80 เก็บสดจากไร่ม่อนแจ่มเช้านี้เลยครับ ทำเป็น Strawberry Shortcake ครีมสดหวานน้อย ตัดกับกาแฟดริปคั่วอ่อนลงตัวสุด ๆ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [],
        daysAgo: 2,
      },
    ],
    blogs: [],
  },
  {
    slug: "khao-soi-nimman-craft",
    nameTh: "ข้าวซอยบ้านสวน แม่ริม–นิมมาน",
    nameEn: "Khao Soi Baan Suan Chiang Mai",
    taglineTh: "ข้าวซอยเนื้อน่องลายตุ๋น 6 ชั่วโมง เครื่องแกงตำสดสูตรดั้งเดิม",
    descriptionTh:
      "ร้านอาหารเหนือร่วมสมัยในสวนร่มรื่นย่านแม่ริม เคี่ยวน้ำแกงข้าวซอยกะทิคั้นสดทุกเช้า เสิร์ฟคู่ผักกาดดองโฮมเมดและไส้อั่วสมุนไพรย่างเตาถ่าน",
    provinceId: "chiang-mai",
    districtTh: "แม่ริม",
    addressTh: "ถ.แม่ริม-สะเมิง ต.แม่แรม อ.แม่ริม จ.เชียงใหม่",
    latitude: 18.9122,
    longitude: 98.8915,
    placeCategory: "RESTAURANT",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://facebook.com",
    primaryCtaLabelTh: "ดูเมนู & จองโต๊ะ",
    contactLine: "@khaosoibaansuan",
    contactPhone: "081-775-3099",
    openingHoursJson: DAILY_DINING_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["ข้าวซอย", "อาหารเหนือ", "เชียงใหม่", "แม่ริม"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 640,
    savesCount: 180,
    ratingAvg: 4.8,
    promos: [
      {
        code: "KHAOSOI10",
        titleTh: "ลด 10% ค่าอาหารเมื่อโชว์การ์ด Nondii",
        descriptionTh: "ใช้ได้ทุกวันจันทร์–ศุกร์ ไม่มีขั้นต่ำ",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 10% ค่าอาหาร",
        badgeTextEn: "10% OFF Dining",
        discountType: "PERCENT",
        discountValue: 10,
        minSpendThb: 0,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },
  {
    slug: "lanna-herbal-onsen-cnx",
    nameTh: "ล้านนา เฮอร์เบิล ออนเซ็น & สปา",
    nameEn: "Lanna Herbal Onsen & Spa Chiang Mai",
    taglineTh: "บ่อออนเซ็นน้ำแร่และอบสมุนไพรล้านนาท่ามกลางสวนไผ่เงียบสงบ",
    descriptionTh:
      "ออนเซ็นส่วนตัวและสปาสมุนไพรล้านนา ใช้ลูกประคบสมุนไพรสดและน้ำมันอโรม่าสกัดจากธรรมชาติ มีห้องแช่บ่อส่วนตัวสำหรับคู่รักและครอบครัว",
    provinceId: "chiang-mai",
    districtTh: "แม่ริม",
    addressTh: "ต.โป่งแยง อ.แม่ริม จ.เชียงใหม่",
    latitude: 18.9265,
    longitude: 98.8421,
    placeCategory: "WELLNESS",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://line.me",
    primaryCtaLabelTh: "จองรอบออนเซ็น LINE",
    contactLine: "@lannaonsencnx",
    contactPhone: "053-112-889",
    openingHoursJson: DAILY_WELLNESS_HOURS,
    stayStyles: ["onsen", "mountain"],
    semanticTags: ["ออนเซ็น", "สปาเชียงใหม่", "นวดแผนไทย", "เวลเนส"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 1520,
    savesCount: 390,
    ratingAvg: 4.9,
    promos: [
      {
        code: "ONSEN300",
        titleTh: "ลด ฿300 แพ็กเกจออนเซ็นส่วนตัว + นวดอโรม่า 90 นาที",
        descriptionTh: "สำรองรอบล่วงหน้าผ่าน LINE แล้วแจ้งโค้ด ONSEN300 จาก Nondii",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด ฿300 ออนเซ็น",
        badgeTextEn: "฿300 OFF Onsen",
        discountType: "FIXED_THB",
        discountValue: 300,
        minSpendThb: 1200,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },
  {
    slug: "doi-moncham-viewpoint",
    nameTh: "สวนดอกไม้และจุดชมวิวม่อนแจ่ม",
    nameEn: "Moncham Flower Terraces & Viewpoint",
    taglineTh: "ทุ่งดอกเวอร์บีน่าและจุดชมวิวทิวเขาสลับซับซ้อนแห่งแม่ริม",
    descriptionTh:
      "จุดชมวิวแลนด์มาร์กของม่อนแจ่ม อากาศเย็นสบายเกือบตลอดปี เดินชมแปลงดอกไม้เมืองหนาวและซื้อผักผลไม้สดจากชุมชนบนดอย",
    provinceId: "chiang-mai",
    districtTh: "แม่ริม",
    addressTh: "บ้านหนองหอยเก่า ต.แม่แรม อ.แม่ริม จ.เชียงใหม่",
    latitude: 18.9354,
    longitude: 98.8229,
    placeCategory: "ATTRACTION",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://maps.google.com/?q=18.9354,98.8229",
    primaryCtaLabelTh: "ดูเส้นทาง",
    contactLine: "",
    contactPhone: "",
    openingHoursJson: DAILY_ATTRACTION_HOURS,
    stayStyles: ["mountain"],
    semanticTags: ["ม่อนแจ่ม", "สวนดอกไม้", "เชียงใหม่", "ที่เที่ยว"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 890,
    savesCount: 220,
    ratingAvg: 4.8,
    promos: [],
    feedPosts: [],
    blogs: [],
  },

  // ============================ KHAO YAI (นครราชสีมา) ============================
  {
    slug: "khaoyai-pine-bakehouse",
    nameTh: "ไพน์ เบคเฮาส์ คาเฟ่กลางสน เขาใหญ่",
    nameEn: "Pine Bakehouse Khao Yai",
    taglineTh: "โรงอบขนมปังซาวโดวจ์และมัทฉะเกรดพิธีการใต้ร่มสนเขาใหญ่",
    descriptionTh:
      "คาเฟ่เรือนอิฐและไม้โอ๊คกลางป่าสนเขาใหญ่ อบซาวโดวจ์และขนมปังโชกุปังสดใหม่ทุกชั่วโมง พร้อมโซนสวนสนามหญ้าพาสัตว์เลี้ยงเข้าได้",
    provinceId: "nakhon-ratchasima",
    districtTh: "ปากช่อง",
    addressTh: "ต.หมูสี อ.ปากช่อง จ.นครราชสีมา",
    latitude: 14.5345,
    longitude: 101.4021,
    placeCategory: "CAFE",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://instagram.com",
    primaryCtaLabelTh: "ดูเมนู & พิกัด",
    contactLine: "@pinebakehouseky",
    contactPhone: "088-512-9904",
    openingHoursJson: DAILY_CAFE_HOURS,
    stayStyles: ["glamping", "mountain"],
    semanticTags: ["คาเฟ่เขาใหญ่", "เบเกอรี่", "Pet Friendly", "มัทฉะ"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 4100,
    savesCount: 720,
    ratingAvg: 4.9,
    promos: [
      {
        code: "PINEBAKE15",
        titleTh: "ลด 15% เบเกอรี่อบสดทุกรายการ",
        descriptionTh: "แสดงการ์ดร้านจาก Nondii รับส่วนลดเบเกอรี่ 15% เมื่อสั่งคู่เครื่องดื่ม 1 แก้ว",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 15% เบเกอรี่",
        badgeTextEn: "15% OFF Bakery",
        discountType: "PERCENT",
        discountValue: 15,
        minSpendThb: 0,
        isFeatured: true,
      },
    ],
    feedPosts: [
      {
        slug: "sourdough-fresh-out-of-oven",
        titleTh: "ซาวโดวจ์รอบ 10:00 น. เพิ่งออกจากเตา หอมเนยทั้งสวนสน",
        excerptTh:
          "วันนี้มี Cranberry Walnut Sourdough กับ Truffle Shio Pan อบใหม่ร้อน ๆ โซนสนามหญ้าด้านนอกลมเย็นมาก พาน้องหมามานั่งเล่นได้เลยครับ",
        contentTh:
          "ซาวโดวจ์รอบ 10:00 น. และ 13:30 น. อบสดใหม่ทุกวัน โซนสนามหญ้า Pet-Friendly มีชามน้ำเตรียมไว้ให้น้อง ๆ ด้วยครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1080&q=80",
        galleryUrls: [],
        daysAgo: 1,
      },
    ],
    blogs: [],
  },
  {
    slug: "grill-in-the-woods-ky",
    nameTh: "กริลล์ อิน เดอะ วูดส์ สเต็กเฮาส์ เขาใหญ่",
    nameEn: "Grill in the Woods Khao Yai",
    taglineTh: "สเต็กย่างฟืนไม้โอ๊คและไวน์โลคอลเขาใหญ่ บรรยากาศแคมป์ไฟยามค่ำ",
    descriptionTh:
      "ร้านอาหารแนว Wood-fired Grill ท่ามกลางต้นไม้ใหญ่ คัดเนื้อดรายเอจและผักออร์แกนิกจากฟาร์มปากช่อง มีดนตรีอะคูสติกเบา ๆ ทุกศุกร์–อาทิตย์",
    provinceId: "nakhon-ratchasima",
    districtTh: "ปากช่อง",
    addressTh: "ถ.ธนะรัชต์ กม.16 ต.หมูสี อ.ปากช่อง จ.นครราชสีมา",
    latitude: 14.5418,
    longitude: 101.4184,
    placeCategory: "RESTAURANT",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://facebook.com",
    primaryCtaLabelTh: "จองโต๊ะดินเนอร์",
    contactLine: "@grillwoodsky",
    contactPhone: "081-990-7721",
    openingHoursJson: DAILY_DINING_HOURS,
    stayStyles: ["glamping", "bars"],
    semanticTags: ["สเต็กเขาใหญ่", "ดินเนอร์", "ปิ้งย่าง", "ปากช่อง"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 510,
    savesCount: 145,
    ratingAvg: 4.8,
    promos: [
      {
        code: "WOODSDRINK",
        titleTh: "ฟรี Mocktail ซิกเนเจอร์ 2 แก้ว เมื่อทานครบ ฿1,500",
        descriptionTh: "แสดงการ์ดร้านจาก Nondii เมื่อจองโต๊ะดินเนอร์",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ฟรีเครื่องดื่ม 2 แก้ว",
        badgeTextEn: "2 Free Mocktails",
        discountType: "FIXED_THB",
        discountValue: 240,
        minSpendThb: 1500,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },
  {
    slug: "haew-suwat-trail-ky",
    nameTh: "เส้นทางธรรมชาติน้ำตกเหวสุวัต เขาใหญ่",
    nameEn: "Haew Suwat Waterfall Trail",
    taglineTh: "น้ำตกชื่อดังกลางผืนป่ามรดกโลกเขาใหญ่ เดินชมป่าดิบชื้นสุดร่มรื่น",
    descriptionTh:
      "จุดท่องเที่ยวธรรมชาติระดับมรดกโลกในอุทยานแห่งชาติเขาใหญ่ เดินลงบันไดชมม่านน้ำตกใกล้ชิด และมีเส้นทางเดินศึกษาธรรมชาติระยะสั้น",
    provinceId: "nakhon-ratchasima",
    districtTh: "ปากช่อง",
    addressTh: "อุทยานแห่งชาติเขาใหญ่ อ.ปากช่อง จ.นครราชสีมา",
    latitude: 14.4347,
    longitude: 101.4132,
    placeCategory: "ATTRACTION",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://maps.google.com/?q=14.4347,101.4132",
    primaryCtaLabelTh: "ดูเส้นทาง",
    contactLine: "",
    contactPhone: "",
    openingHoursJson: DAILY_ATTRACTION_HOURS,
    stayStyles: ["mountain", "glamping"],
    semanticTags: ["เขาใหญ่", "น้ำตก", "เดินป่า", "มรดกโลก"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 730,
    savesCount: 190,
    ratingAvg: 4.9,
    promos: [],
    feedPosts: [],
    blogs: [],
  },

  // ============================ PHUKET (ภูเก็ต) ============================
  {
    slug: "promthep-sunset-deck",
    nameTh: "แหลมพรหมเทพ จุดชมอาทิตย์ตกภูเก็ต",
    nameEn: "Promthep Cape Sunset Viewpoint",
    taglineTh: "แลนด์มาร์กชมพระอาทิตย์ตกลับขอบทะเลอันดามันที่สวยที่สุดแห่งหนึ่งของไทย",
    descriptionTh:
      "แหลมใต้สุดของเกาะภูเก็ต มองเห็นแนวต้นตาลและผืนน้ำสีทองยามเย็น แนะนำให้มาถึงก่อน 17:30 น. เพื่อเก็บแสง Golden Hour",
    provinceId: "phuket",
    districtTh: "เมืองภูเก็ต",
    addressTh: "ต.ราไวย์ อ.เมือง จ.ภูเก็ต",
    latitude: 7.7622,
    longitude: 98.3053,
    placeCategory: "ATTRACTION",
    merchantMode: "PROFILE_ONLY",
    propertyType: "RESORT",
    externalWebsiteUrl: "https://maps.google.com/?q=7.7622,98.3053",
    primaryCtaLabelTh: "ดูเส้นทาง",
    contactLine: "",
    contactPhone: "",
    openingHoursJson: DAILY_ATTRACTION_HOURS,
    stayStyles: ["beach"],
    semanticTags: ["ภูเก็ต", "แหลมพรหมเทพ", "พระอาทิตย์ตก", "ทะเลอันดามัน"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 9600,
    savesCount: 1850,
    ratingAvg: 4.9,
    promos: [],
    feedPosts: [],
    blogs: [],
  },
  {
    slug: "old-town-kopi-phuket",
    nameTh: "โอลด์ทาวน์ โกปิ๊ คาเฟ่ชิโนฯ ภูเก็ต",
    nameEn: "Old Town Kopi & Roastery Phuket",
    taglineTh: "กาแฟ Specialty และขนมพื้นเมืองภูเก็ตในตึกชิโนโปรตุกีสร้อยปี",
    descriptionTh:
      "คาเฟ่รีโนเวทจากอาคารพาณิชย์เก่าแก่บนถนนถลาง เสิร์ฟกาแฟคั่วพิเศษควบคู่กับโอ้เอ๋วและขนมอาโป้งสูตรดั้งเดิม",
    provinceId: "phuket",
    districtTh: "เมืองภูเก็ต",
    addressTh: "ถ.ถลาง ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต",
    latitude: 7.8848,
    longitude: 98.3894,
    placeCategory: "CAFE",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://instagram.com",
    primaryCtaLabelTh: "ดูเมนูร้าน",
    contactLine: "@oldtownkopihkt",
    contactPhone: "076-214-550",
    openingHoursJson: DAILY_CAFE_HOURS,
    stayStyles: ["beach", "bars"],
    semanticTags: ["เมืองเก่าภูเก็ต", "คาเฟ่ภูเก็ต", "ชิโนโปรตุกีส"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 420,
    savesCount: 112,
    ratingAvg: 4.8,
    promos: [
      {
        code: "KOPI10",
        titleTh: "ลด 10% เมนูซิกเนเจอร์ + ขนมพื้นเมือง",
        descriptionTh: "แสดงการ์ดร้านจาก Nondii ที่หน้าเคาน์เตอร์รับส่วนลดทันที",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 10% เมนูร้าน",
        badgeTextEn: "10% OFF Menu",
        discountType: "PERCENT",
        discountValue: 10,
        minSpendThb: 0,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },

  // ============================ BANGKOK (กรุงเทพฯ) ============================
  {
    slug: "chaophraya-aroma-spa",
    nameTh: "เจ้าพระยา อโรม่า เวลเนส & สปา",
    nameEn: "Chao Phraya Aroma Wellness & Spa",
    taglineTh: "สปาเรือนไม้ริมน้ำเจ้าพระยา นวดน้ำมันหอมระเหยและประคบสมุนไพรไทย",
    descriptionTh:
      "สปาบูทีคริมแม่น้ำเจ้าพระยา บรรยากาศเงียบสงบเป็นส่วนตัว ผ่อนคลายด้วยทรีตเมนต์นวดอโรม่า 90 นาที พร้อมชามะตูมอุ่นและวิวแม่น้ำยามเย็น",
    provinceId: "bangkok",
    districtTh: "บางรัก",
    addressTh: "ซ.เจริญกรุง 36 เขตบางรัก กรุงเทพมหานคร",
    latitude: 13.7235,
    longitude: 100.5142,
    placeCategory: "WELLNESS",
    merchantMode: "PROFILE_ONLY",
    propertyType: "BOUTIQUE_HOTEL",
    externalWebsiteUrl: "https://line.me",
    primaryCtaLabelTh: "จองคิวสปา LINE",
    contactLine: "@chaophrayaspa",
    contactPhone: "02-234-8890",
    openingHoursJson: DAILY_WELLNESS_HOURS,
    stayStyles: ["onsen", "bars"],
    semanticTags: ["สปากรุงเทพ", "ริมแม่น้ำเจ้าพระยา", "นวดอโรม่า", "เวลเนส"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1080&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1080&q=80",
    ],
    likesCount: 1180,
    savesCount: 310,
    ratingAvg: 4.9,
    promos: [
      {
        code: "AROMA20",
        titleTh: "ลด 20% ทรีตเมนต์นวดอโรม่า 90 นาที",
        descriptionTh: "สำรองคิวล่วงหน้าผ่าน LINE แจ้งโค้ด AROMA20 จาก Nondii (ใช้ได้ทุกวัน)",
        promoKind: "ONSITE_PERK",
        badgeTextTh: "ลด 20% นวดอโรม่า",
        badgeTextEn: "20% OFF Aroma",
        discountType: "PERCENT",
        discountValue: 20,
        minSpendThb: 900,
        isFeatured: true,
      },
    ],
    feedPosts: [],
    blogs: [],
  },
];

async function main() {
  console.log("🚀 Starting Phase 1 Canonical Place Migration & Multi-Category Seed...");

  // Find a fallback owner account (prefer existing hotel owner / admin)
  const defaultOwner =
    (await prisma.user.findFirst({
      where: { role: { in: ["HOTEL_OWNER", "SUPER_ADMIN"] } },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!defaultOwner) {
    throw new Error("No User found in Neon DB. Please seed base users first.");
  }

  const travellerCommenter =
    (await prisma.user.findFirst({
      where: { id: { not: defaultOwner.id } },
      orderBy: { createdAt: "asc" },
    })) || defaultOwner;

  // =========================================================================
  // STEP 1: Enforce 1 Place = 1 Canonical Card on ALL Existing Hotels
  // =========================================================================
  const existingHotels = await prisma.hotel.findMany({
    include: {
      rooms: { where: { isActive: true }, select: { id: true } },
      coupons: {
        where: { isActive: true },
        orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
      },
      pins: {
        include: {
          _count: {
            select: { comments: true, likes: true, boardEntries: true },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  let consolidatedPinsCount = 0;

  for (const hotel of existingHotels) {
    const isDirect = hotel.rooms.length > 0;
    const merchantMode: MerchantMode = isDirect
      ? "DIRECT_BOOKING"
      : "PROFILE_ONLY";

    // Handle unpublished test hotels cleanly
    if (!hotel.isPublished) {
      await prisma.pin.updateMany({
        where: { hotelId: hotel.id },
        data: { isCanonicalCard: false },
      });
      continue;
    }

    // Score pins to pick the SINGLE best canonical card for this hotel
    const sortedPins = [...hotel.pins].sort((a, b) => {
      const scoreA =
        (a.publishStatus === "PUBLISHED" ? 1000 : 0) +
        (a.couponId ? 400 : 0) +
        a._count.comments * 80 +
        a._count.boardEntries * 60 +
        a.likesCount;
      const scoreB =
        (b.publishStatus === "PUBLISHED" ? 1000 : 0) +
        (b.couponId ? 400 : 0) +
        b._count.comments * 80 +
        b._count.boardEntries * 60 +
        b.likesCount;
      return scoreB - scoreA;
    });

    const canonicalPin = sortedPins[0];
    if (!canonicalPin) continue;

    const duplicatePins = sortedPins.slice(1);

    // Merge unique mediaUrls from duplicate pins onto the canonical pin
    const mergedMedia = new Set<string>([
      canonicalPin.coverImageUrl,
      ...canonicalPin.mediaUrls,
    ]);
    for (const dup of duplicatePins) {
      if (dup.coverImageUrl) mergedMedia.add(dup.coverImageUrl);
      for (const u of dup.mediaUrls) {
        if (u) mergedMedia.add(u);
      }

      // Safely move comments, likes, and saved board entries from duplicate pin -> canonical pin
      await prisma.pinComment.updateMany({
        where: { pinId: dup.id },
        data: { pinId: canonicalPin.id },
      });

      const dupLikes = await prisma.pinLike.findMany({
        where: { pinId: dup.id },
      });
      for (const lk of dupLikes) {
        await prisma.pinLike
          .upsert({
            where: {
              userId_pinId: { userId: lk.userId, pinId: canonicalPin.id },
            },
            create: { userId: lk.userId, pinId: canonicalPin.id },
            update: {},
          })
          .catch(() => {});
      }

      const dupBoardPins = await prisma.savedBoardPin.findMany({
        where: { pinId: dup.id },
      });
      for (const bp of dupBoardPins) {
        await prisma.savedBoardPin
          .upsert({
            where: {
              boardId_pinId: { boardId: bp.boardId, pinId: canonicalPin.id },
            },
            create: {
              boardId: bp.boardId,
              pinId: canonicalPin.id,
              userId: bp.userId,
              sortOrder: bp.sortOrder,
              savedPriceSnapshotThb: bp.savedPriceSnapshotThb,
            },
            update: {},
          })
          .catch(() => {});
      }

      await prisma.sponsoredCampaign.updateMany({
        where: { pinId: dup.id },
        data: { pinId: canonicalPin.id },
      });

      await prisma.pin.delete({ where: { id: dup.id } });
      consolidatedPinsCount += 1;
    }

    // Recompute exact comment count on canonical pin
    const liveCommentsCount = await prisma.pinComment.count({
      where: { pinId: canonicalPin.id, status: "VISIBLE" },
    });

    // Ensure external-promo hotels have an active Coupon + externalWebsiteUrl
    let featuredCouponId = hotel.coupons[0]?.id ?? null;
    const extUrl =
      hotel.externalWebsiteUrl ||
      canonicalPin.externalDealUrl ||
      "";

    if (!isDirect && hotel.coupons.length === 0 && canonicalPin.promoHeadlineTh) {
      const codeBase = hotel.slug
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 10)
        .toUpperCase();
      const promoCode = canonicalPin.promoCode || `${codeBase}DEAL`;
      const createdCoupon = await prisma.coupon.upsert({
        where: { hotelId_code: { hotelId: hotel.id, code: promoCode } },
        create: {
          hotelId: hotel.id,
          code: promoCode,
          titleTh: `${canonicalPin.promoHeadlineTh} — ${hotel.nameTh}`,
          titleEn: canonicalPin.promoHeadlineEn || canonicalPin.promoHeadlineTh,
          descriptionTh:
            canonicalPin.descriptionTh ||
            `โปรโมชั่นพิเศษผ่าน ${canonicalPin.externalSourceName || "เว็บทางการ"}`,
          promoKind: "EXTERNAL_LINK_DEAL",
          badgeTextTh: canonicalPin.promoHeadlineTh,
          badgeTextEn: canonicalPin.promoHeadlineEn || canonicalPin.promoHeadlineTh,
          externalUrl: extUrl || null,
          discountType: canonicalPin.promoHeadlineTh.includes("%")
            ? "PERCENT"
            : "FIXED_THB",
          discountValue:
            Number(canonicalPin.promoHeadlineTh.replace(/[^0-9]/g, "")) || 15,
          minSpendThb: 0,
          isFeaturedDeal: true,
          isActive: true,
          expiresAt:
            canonicalPin.promoExpiresAt ||
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        update: {
          badgeTextTh: canonicalPin.promoHeadlineTh,
          externalUrl: extUrl || null,
          isFeaturedDeal: true,
        },
      });
      featuredCouponId = createdCoupon.id;
    }

    await prisma.pin.update({
      where: { id: canonicalPin.id },
      data: {
        isCanonicalCard: true,
        aspectRatio: "3/4",
        mediaUrls: Array.from(mergedMedia).slice(0, 10),
        commentsCount: Math.max(canonicalPin.commentsCount, liveCommentsCount),
        couponId: featuredCouponId ?? canonicalPin.couponId,
      },
    });

    await prisma.hotel.update({
      where: { id: hotel.id },
      data: {
        merchantMode,
        placeCategory: hotel.placeCategory || "STAY",
        canonicalPinId: canonicalPin.id,
        featuredCouponId,
        externalWebsiteUrl: extUrl,
        primaryCtaLabelTh:
          hotel.primaryCtaLabelTh ||
          (isDirect
            ? "จองตรง 0% GP"
            : canonicalPin.externalSourceName
            ? `ดูโปร ${canonicalPin.externalSourceName}`
            : "ไปที่เว็บไซต์"),
      },
    });
  }

  console.log(
    `✅ Consolidated ${consolidatedPinsCount} duplicate pins -> 1 Place = 1 Canonical Card.`
  );

  // =========================================================================
  // STEP 2: Enrich Flagship Direct-Booking Hotels with Multiple Promos & Feed Posts
  // =========================================================================
  const sapanHotel = await prisma.hotel.findUnique({
    where: { slug: "sapanunseen" },
  });
  if (sapanHotel) {
    const expFuture = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    await prisma.coupon.upsert({
      where: { hotelId_code: { hotelId: sapanHotel.id, code: "SAPAN2NIGHT" } },
      create: {
        hotelId: sapanHotel.id,
        code: "SAPAN2NIGHT",
        titleTh: "พัก 2 คืนขึ้นไป ลดเพิ่ม ฿900 + ฟรีหมูกระทะ",
        titleEn: "Stay 2+ Nights: ฿900 OFF + Free BBQ Set",
        descriptionTh:
          "จองตรง 0% GP ตั้งแต่ 2 คืนขึ้นไป รับส่วนลดเพิ่มทันที ฿900 พร้อมชุดหมูกระทะหน้าบ้าน 1 ชุด",
        promoKind: "BOOKING_COUPON",
        badgeTextTh: "ลด ฿900 พัก 2 คืน",
        badgeTextEn: "฿900 OFF 2+ Nights",
        discountType: "FIXED_THB",
        discountValue: 900,
        minSpendThb: 4500,
        isFeaturedDeal: false,
        isActive: true,
        expiresAt: expFuture,
      },
      update: { isActive: true, expiresAt: expFuture },
    });

    await prisma.coupon.upsert({
      where: { hotelId_code: { hotelId: sapanHotel.id, code: "SAPANWEEKDAY" } },
      create: {
        hotelId: sapanHotel.id,
        code: "SAPANWEEKDAY",
        titleTh: "โปรวันธรรมดา จันทร์–พฤหัส ลดทันที 15%",
        titleEn: "Weekday Special 15% OFF",
        descriptionTh:
          "หนีความวุ่นวายมาชมทะเลหมอกวันธรรมดา ลดค่าห้อง 15% รวมอาหารเช้าเสิร์ฟถึงระเบียง",
        promoKind: "BOOKING_COUPON",
        badgeTextTh: "วันธรรมดา ลด 15%",
        badgeTextEn: "Weekday 15% OFF",
        discountType: "PERCENT",
        discountValue: 15,
        minSpendThb: 2000,
        isFeaturedDeal: false,
        isActive: true,
        expiresAt: expFuture,
      },
      update: { isActive: true, expiresAt: expFuture },
    });

    // Add Owner Feed Posts (short Facebook-style updates)
    const sapanFeedPosts = [
      {
        slug: "feed-sapan-fog-update-today",
        titleTh: "ทะเลหมอกเช้านี้ลอยสูงถึงหน้าระเบียงบ้าน A-Frame",
        excerptTh:
          "อุณหภูมิเช้านี้ 15°C หมอกขาวฟูเต็มหุบเขาตั้งแต่ 06:15 น. จนถึงเกือบเก้าโมง ใครมีแพลนขึ้นน่านสัปดาห์นี้เตรียมเสื้อกันหนาวอุ่น ๆ มาได้เลยนะครับ",
        contentTh:
          "อุณหภูมิเช้านี้ 15°C หมอกขาวฟูเต็มหุบเขาตั้งแต่ 06:15 น. จนถึงเกือบเก้าโมง ช่วงนี้บ้าน A1 และ A2 วันธรรมดายังมีคิวว่างอยู่ สามารถกดจองตรง 0% GP พร้อมใช้โค้ดส่วนลดวันธรรมดา 15% ได้เลยครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1080&q=80",
        daysAgo: 1,
      },
      {
        slug: "feed-sapan-mookata-winter",
        titleTh: "เปิดตัวชุดหมูกระทะ + ซุปหม่าล่าอุ่น ๆ เสิร์ฟถึงระเบียง",
        excerptTh:
          "อากาศเริ่มเย็นแล้ว ทางที่พักเพิ่มเมนูชุดหมูกระทะพรีเมียมและซุปหม่าล่าร้อน ๆ เลือกกด Add-on ตอนจองห้องได้เลย ไม่ต้องขับรถออกไปหาทานข้างนอก",
        contentTh:
          "อากาศช่วงเย็นที่สะปันลดลงเหลือ 17–18°C เหมาะกับการทานหมูกระทะชมดาวหน้าระเบียงที่สุดครับ สามารถเลือกสั่งเพิ่มล่วงหน้าในหน้าจองห้องพักได้เลยชุดละ ฿590 ทานได้ 2 ท่านอิ่มกำลังดีครับ",
        coverImageUrl:
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1080&q=80",
        daysAgo: 3,
      },
    ];

    for (const fp of sapanFeedPosts) {
      await prisma.hotelPost.upsert({
        where: { hotelId_slug: { hotelId: sapanHotel.id, slug: fp.slug } },
        create: {
          hotelId: sapanHotel.id,
          authorId: sapanHotel.ownerId,
          slug: fp.slug,
          titleTh: fp.titleTh,
          excerptTh: fp.excerptTh,
          contentTh: fp.contentTh,
          coverImageUrl: fp.coverImageUrl,
          galleryUrls: [fp.coverImageUrl],
          postKind: "FEED_POST",
          categoryTh: "อัปเดตจากที่พัก",
          tags: ["ทะเลหมอก", "สะปัน", "อัปเดต"],
          status: "PUBLISHED",
          publishedAt: new Date(Date.now() - fp.daysAgo * 24 * 60 * 60 * 1000),
        },
        update: { postKind: "FEED_POST", status: "PUBLISHED" },
      });
    }
  }

  // =========================================================================
  // STEP 3: Upsert 15 Realistic Non-Stay Places (CAFE, RESTAURANT, ATTRACTION, WELLNESS)
  // =========================================================================
  const expDefault = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  for (const place of NEW_NON_STAY_PLACES) {
    const hotel = await prisma.hotel.upsert({
      where: { slug: place.slug },
      create: {
        slug: place.slug,
        ownerId: defaultOwner.id,
        nameTh: place.nameTh,
        nameEn: place.nameEn,
        taglineTh: place.taglineTh,
        taglineEn: place.nameEn,
        descriptionTh: place.descriptionTh,
        descriptionEn: place.descriptionTh,
        logoUrl: place.coverImageUrl,
        coverImageUrl: place.coverImageUrl,
        provinceId: place.provinceId,
        districtTh: place.districtTh,
        addressTh: place.addressTh,
        latitude: place.latitude,
        longitude: place.longitude,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
        stayStyles: place.stayStyles,
        placeCategory: place.placeCategory,
        merchantMode: place.merchantMode,
        propertyType: place.propertyType,
        externalWebsiteUrl: place.externalWebsiteUrl,
        primaryCtaLabelTh: place.primaryCtaLabelTh,
        openingHoursJson: place.openingHoursJson,
        contactPhone: place.contactPhone,
        contactLine: place.contactLine,
        verificationStatus: "VERIFIED",
        isPublished: true,
        ratingAvg: place.ratingAvg,
        reviewCount: place.comments?.length ?? 0,
      },
      update: {
        nameTh: place.nameTh,
        nameEn: place.nameEn,
        taglineTh: place.taglineTh,
        descriptionTh: place.descriptionTh,
        coverImageUrl: place.coverImageUrl,
        latitude: place.latitude,
        longitude: place.longitude,
        placeCategory: place.placeCategory,
        merchantMode: place.merchantMode,
        externalWebsiteUrl: place.externalWebsiteUrl,
        primaryCtaLabelTh: place.primaryCtaLabelTh,
        openingHoursJson: place.openingHoursJson,
        isPublished: true,
        verificationStatus: "VERIFIED",
      },
    });

    // Upsert Promos
    let featuredCouponId: string | null = null;
    let featuredHeadlineTh: string | null = null;
    let featuredHeadlineEn: string | null = null;

    for (const pr of place.promos) {
      const cp = await prisma.coupon.upsert({
        where: { hotelId_code: { hotelId: hotel.id, code: pr.code } },
        create: {
          hotelId: hotel.id,
          code: pr.code,
          titleTh: pr.titleTh,
          titleEn: pr.badgeTextEn,
          descriptionTh: pr.descriptionTh,
          promoKind: pr.promoKind,
          badgeTextTh: pr.badgeTextTh,
          badgeTextEn: pr.badgeTextEn,
          discountType: pr.discountType,
          discountValue: pr.discountValue,
          minSpendThb: pr.minSpendThb,
          isFeaturedDeal: pr.isFeatured,
          isActive: true,
          expiresAt: expDefault,
        },
        update: {
          titleTh: pr.titleTh,
          descriptionTh: pr.descriptionTh,
          promoKind: pr.promoKind,
          badgeTextTh: pr.badgeTextTh,
          badgeTextEn: pr.badgeTextEn,
          isFeaturedDeal: pr.isFeatured,
          isActive: true,
          expiresAt: expDefault,
        },
      });
      if (pr.isFeatured || !featuredCouponId) {
        featuredCouponId = cp.id;
        featuredHeadlineTh = pr.badgeTextTh;
        featuredHeadlineEn = pr.badgeTextEn;
      }
    }

    // Upsert Canonical Pin (1 Place = 1 Card)
    let canonicalPin = await prisma.pin.findFirst({
      where: { hotelId: hotel.id, isCanonicalCard: true },
    });

    if (!canonicalPin) {
      canonicalPin = await prisma.pin.create({
        data: {
          hotelId: hotel.id,
          couponId: featuredCouponId,
          mediaType: place.galleryUrls.length > 1 ? "CAROUSEL" : "PHOTO",
          category: place.placeCategory === "CAFE" || place.placeCategory === "RESTAURANT" ? "DINING" : "VIEWS",
          titleTh: place.taglineTh,
          titleEn: place.nameEn,
          descriptionTh: place.descriptionTh,
          descriptionEn: place.descriptionTh,
          coverImageUrl: place.coverImageUrl,
          mediaUrls: place.galleryUrls,
          aspectRatio: "3/4",
          provinceId: place.provinceId,
          stayStyles: place.stayStyles,
          semanticTags: place.semanticTags,
          dealSourceType: "EXTERNAL",
          externalDealUrl: place.externalWebsiteUrl,
          externalSourceName: place.primaryCtaLabelTh,
          promoHeadlineTh: featuredHeadlineTh,
          promoHeadlineEn: featuredHeadlineEn,
          isCanonicalCard: true,
          publishStatus: "PUBLISHED",
          likesCount: place.likesCount,
          savesCount: place.savesCount,
          commentsCount: place.comments ? place.comments.length * 2 : 0,
        },
      });
    } else {
      canonicalPin = await prisma.pin.update({
        where: { id: canonicalPin.id },
        data: {
          couponId: featuredCouponId,
          coverImageUrl: place.coverImageUrl,
          mediaUrls: place.galleryUrls,
          promoHeadlineTh: featuredHeadlineTh,
          promoHeadlineEn: featuredHeadlineEn,
          likesCount: place.likesCount,
          savesCount: place.savesCount,
          isCanonicalCard: true,
          publishStatus: "PUBLISHED",
        },
      });
    }

    await prisma.hotel.update({
      where: { id: hotel.id },
      data: {
        canonicalPinId: canonicalPin.id,
        featuredCouponId,
      },
    });

    // Upsert Owner Feed Posts
    for (const fp of place.feedPosts) {
      await prisma.hotelPost.upsert({
        where: { hotelId_slug: { hotelId: hotel.id, slug: fp.slug } },
        create: {
          hotelId: hotel.id,
          authorId: defaultOwner.id,
          slug: fp.slug,
          titleTh: fp.titleTh,
          excerptTh: fp.excerptTh,
          contentTh: fp.contentTh,
          coverImageUrl: fp.coverImageUrl,
          galleryUrls: fp.galleryUrls,
          postKind: "FEED_POST",
          categoryTh: "อัปเดตจากสถานที่",
          tags: place.semanticTags.slice(0, 3),
          status: "PUBLISHED",
          publishedAt: new Date(Date.now() - fp.daysAgo * 24 * 60 * 60 * 1000),
        },
        update: {
          titleTh: fp.titleTh,
          excerptTh: fp.excerptTh,
          contentTh: fp.contentTh,
          postKind: "FEED_POST",
          status: "PUBLISHED",
        },
      });
    }

    // Upsert Owner Blogs
    for (const bg of place.blogs) {
      await prisma.hotelPost.upsert({
        where: { hotelId_slug: { hotelId: hotel.id, slug: bg.slug } },
        create: {
          hotelId: hotel.id,
          authorId: defaultOwner.id,
          slug: bg.slug,
          titleTh: bg.titleTh,
          excerptTh: bg.excerptTh,
          contentTh: bg.contentTh,
          coverImageUrl: bg.coverImageUrl,
          galleryUrls: [bg.coverImageUrl],
          postKind: "BLOG",
          categoryTh: bg.categoryTh,
          tags: bg.tags,
          status: "PUBLISHED",
          publishedAt: new Date(Date.now() - bg.daysAgo * 24 * 60 * 60 * 1000),
        },
        update: {
          titleTh: bg.titleTh,
          excerptTh: bg.excerptTh,
          contentTh: bg.contentTh,
          postKind: "BLOG",
          status: "PUBLISHED",
        },
      });
    }

    // Seed initial Q&A comments if none exist yet
    if (place.comments && place.comments.length > 0) {
      const existingComments = await prisma.pinComment.count({
        where: { pinId: canonicalPin.id },
      });
      if (existingComments === 0) {
        for (const cm of place.comments) {
          const parent = await prisma.pinComment.create({
            data: {
              pinId: canonicalPin.id,
              userId: travellerCommenter.id,
              body: cm.body,
              isHotelOwnerReply: false,
            },
          });
          if (cm.ownerReply) {
            await prisma.pinComment.create({
              data: {
                pinId: canonicalPin.id,
                userId: defaultOwner.id,
                parentId: parent.id,
                body: cm.ownerReply,
                isHotelOwnerReply: true,
              },
            });
          }
        }
      }
    }
  }

  // Summary Verification
  const [byCategory, byMode, canonicalCount, feedPostCount, blogCount] =
    await Promise.all([
      prisma.hotel.groupBy({
        by: ["placeCategory"],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      prisma.hotel.groupBy({
        by: ["merchantMode"],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      prisma.pin.count({
        where: { isCanonicalCard: true, publishStatus: "PUBLISHED" },
      }),
      prisma.hotelPost.count({
        where: { postKind: "FEED_POST", status: "PUBLISHED" },
      }),
      prisma.hotelPost.count({
        where: { postKind: "BLOG", status: "PUBLISHED" },
      }),
    ]);

  console.log("🎉 Phase 1 Migration & Seed Complete!");
  console.log({
    canonicalCards: canonicalCount,
    feedPosts: feedPostCount,
    blogs: blogCount,
    byCategory,
    byMode,
  });
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
