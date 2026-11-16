export type RoomStatusMode = "ACTIVE" | "MAINTENANCE";
export type RoomInventoryMode = "SINGLE_UNIT" | "ROOM_TYPE";
export type RoomCategoryType = "VILLA" | "SUITE" | "DELUXE";

export interface RoomLodge {
  id: string;
  slug: string;
  code: string; // e.g. "A1", "A2", "A3", "A4"
  nameTh: string;
  nameEn: string;
  categoryTh: string;
  categoryEn: string;
  roomCategory?: RoomCategoryType;
  inventoryMode?: RoomInventoryMode; // "SINGLE_UNIT" (บ้านเป็นหลัง) | "ROOM_TYPE" (ประเภทห้องมีหลายห้อง)
  totalUnits?: number; // จำนวนห้องทั้งหมดในประเภทนี้ (1 สำหรับบ้านเดี่ยว, >1 สำหรับ Room Type)
  shortDescTh: string;
  shortDescEn: string;
  longDescTh: string[];
  longDescEn: string[];
  basePriceThb: number; // ราคาวันธรรมดา (อา.-พฤ.)
  weekendPriceThb: number; // ราคาวันศุกร์-เสาร์
  discountPercent: number; // ส่วนลดหน้าเว็บ (%) เช่น 0, 10, 15
  extraBedPriceThb: number; // ค่าเสริมที่นอนต่อท่าน/คืน
  sizeSqm: number;
  minGuests: number;
  baseGuests: number; // จำนวนผู้เข้าพักมาตรฐานที่รวมในราคาห้อง
  maxGuests: number; // จำนวนผู้เข้าพักสูงสุดรวมเสริมเตียง
  bedrooms: number;
  beds: number;
  bathrooms: number;
  petsAllowed: boolean;
  statusMode: RoomStatusMode;
  mapX: number;
  mapY: number;
  highlightTh: string;
  highlightEn: string;
  images: {
    url: string;
    captionTh: string;
    captionEn: string;
  }[];
  amenities: {
    common: string[];
    dining: string[];
    outdoor: string[];
  };
  amenitiesEn?: {
    common: string[];
    dining: string[];
    outdoor: string[];
  };
}

export interface SeasonalRateRule {
  id: string;
  nameTh: string;
  nameEn: string;
  seasonType: "PEAK" | "HIGH" | "LOW";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  adjustmentType: "PERCENT_SURCHARGE" | "PERCENT_DISCOUNT" | "FIXED_SURCHARGE";
  adjustmentValue: number; // e.g. 20 (+20%), 15 (-15%), or 800 (+฿800/คืน)
  minStayNights: number;
  badgeTh: string;
  badgeEn?: string;
  isActive: boolean;
}

export interface SpecialDateRateOverride {
  id: string;
  dateStr: string; // YYYY-MM-DD
  titleTh: string;
  titleEn?: string;
  pricingMode: "SURCHARGE_THB" | "FIXED_PRICE_THB";
  amountThb: number; // บวกเพิ่มต่อคืน หรือ กำหนดราคาคงที่
  isActive: boolean;
}

export interface ExtraAddon {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  descEn: string;
  priceThb: number;
  originalPriceThb?: number;
  unitTh: string;
  unitEn: string;
  imageUrl?: string;
  category?: "DINING" | "SPA" | "EXPERIENCE";
  isActive: boolean;
}

export interface PromoCoupon {
  id: string;
  code: string; // เช่น "SAPAN10", "UNSEEN500"
  titleTh: string;
  titleEn?: string;
  descTh?: string;
  badgeTh?: string;
  imageUrl?: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number; // เช่น 10 (%) หรือ 500 (บาท)
  minSpendThb: number;
  isActive: boolean;
}

export interface ResortExperienceItem {
  id: string;
  titleTh: string;
  titleEn: string;
  categoryTh: string;
  categoryEn: string;
  descTh: string;
  descEn: string;
  imageUrl: string;
  highlightTh: string;
}

export interface WhiteLabelPropertyConfig {
  brandCode: string;
  nameTh: string;
  nameEn: string;
  subtitleTh: string;
  subtitleEn: string;
  taglineTh: string;
  taglineEn: string;
  heroImageUrl: string;
  storyTitleTh: string;
  storyTitleEn: string;
  storyParagraphsTh: string[];
  storyParagraphsEn: string[];
  primaryColor: string;
  accentColor: string;
  locationTh: string;
  locationEn: string;
  latitude: number; // พิกัดละติจูดสำหรับ Weather API
  longitude: number; // พิกัดลองจิจูดสำหรับ Weather API
  weatherCityLabelTh: string;
  weatherCityLabelEn: string;
  phones: string[];
  lineId: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  breakfastTime: string;
  promptPayId: string;
  promptPayAccountName: string;
  autoConfirmSlip?: boolean;
  subdomainSlug?: string;
  customDomain?: string;
  lineNotifyConnected?: boolean;
  aiAutoBookingEnabled?: boolean;
  rulesTh: string[];
  sectionsVisibility: {
    heroSection: boolean;
    storyAndWeatherSection: boolean;
    accommodationsSection: boolean;
    specialOffersSection: boolean;
    diningSection: boolean;
    experiencesSection: boolean;
    galleryAndReviewsSection: boolean;
    policiesAndLocationSection: boolean;
  };
}

export type BookingRecordStatus =
  | "HOLD_15_MIN"
  | "PENDING_ADMIN"
  | "CONFIRMED"
  | "CANCELLED";

export interface BookingRecord {
  id: string;
  bookingCode: string;
  roomId: string;
  roomCode: string;
  roomNameTh: string;
  unitsBooked?: number; // จำนวนห้องที่จองในรายการนี้ (ค่าเริ่มต้น 1)
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guests: number;
  extraGuests: number;
  extraBedTotalThb: number;
  addonsSelected: { id: string; nameTh: string; priceThb: number }[];
  addonsTotalThb: number;
  couponCode?: string;
  couponDiscountThb: number;
  roomSubtotalThb: number;
  totalPriceThb: number;
  depositAmountThb: number;
  guestName: string;
  guestPhone: string;
  guestContact: string;
  guestNote: string;
  status: BookingRecordStatus;
  createdAtIso: string;
  holdExpiresAtIso: string;
  slipDataUrl?: string;
  slipQrVerified?: boolean;
  slipQrPayload?: string;
  source: "WEBSITE" | "ADMIN_BLOCK" | "LINE_FACEBOOK" | "AI_AGENT";
}

export const WEATHER_LOCATION_PRESETS: Array<{
  id: string;
  labelTh: string;
  labelEn: string;
  latitude: number;
  longitude: number;
}> = [
  {
    id: "nan-sapan",
    labelTh: "หมู่บ้านสะปัน อ.บ่อเกลือ · จ.น่าน",
    labelEn: "Sapan Valley, Bo Kluea · Nan",
    latitude: 19.1928,
    longitude: 101.1986,
  },
  {
    id: "bangkok-riverside",
    labelTh: "ริมแม่น้ำเจ้าพระยา · กรุงเทพฯ",
    labelEn: "Chao Phraya Riverside · Bangkok",
    latitude: 13.7046,
    longitude: 100.4919,
  },
  {
    id: "chiangmai-maerim",
    labelTh: "แม่ริม · จ.เชียงใหม่",
    labelEn: "Mae Rim Valley · Chiang Mai",
    latitude: 18.9139,
    longitude: 98.945,
  },
  {
    id: "phuket-kamala",
    labelTh: "หาดกมลา · จ.ภูเก็ต",
    labelEn: "Kamala Coast · Phuket",
    latitude: 7.9519,
    longitude: 98.2815,
  },
  {
    id: "khaoyai",
    labelTh: "เขาใหญ่ · จ.นครราชสีมา",
    labelEn: "Khao Yai National Park · Nakhon Ratchasima",
    latitude: 14.4392,
    longitude: 101.3722,
  },
];

export const INITIAL_PROPERTY_CONFIG: WhiteLabelPropertyConfig = {
  brandCode: "SU",
  nameTh: "สะปัน อันซีน น่าน (Sapan Unseen)",
  nameEn: "SAPAN UNSEEN NAN",
  subtitleTh: "A-FRAME PANORAMA VILLAS & MIST SUITES · OFFICIAL DIRECT BOOKING",
  subtitleEn: "A-FRAME PANORAMA VILLAS & MIST SUITES · OFFICIAL DIRECT BOOKING",
  taglineTh:
    "บ้านพักไม้ทรง A-Frame และสวีทส่วนตัวท่ามกลางขุนเขาและทะเลหมอกสะปัน จ.น่าน จองตรงกับที่พัก มั่นใจได้ 100% การันตีราคาดีที่สุด",
  taglineEn:
    "Designed for slower stays and deeper connection with the misty Sapan valley landscape in Bo Kluea, Nan.",
  heroImageUrl:
    "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838919/my-hotel/hero/obxqa4pz2mbziitzrgop.webp",
  storyTitleTh:
    "พักผ่อนท่ามกลางอ้อมกอดขุนเขาและสายหมอก ณ หมู่บ้านสะปัน อ.บ่อเกลือ จ.น่าน",
  storyTitleEn:
    "An Intimate Mountain Sanctuary of Iconic A-Frame Timber Villas & Morning Mist",
  storyParagraphsTh: [
    "สะปัน อันซีน (Sapan Unseen) ตั้งอยู่ท่ามกลางหุบเขาสะปัน ตำบลดงพญา อำเภอบ่อเกลือ จังหวัดน่าน โดดเด่นด้วยบ้านไม้ทรง A-Frame 2 ชั้นดีไซน์อบอุ่นเหมือนบ้านพักตากอากาศต่างประเทศ และห้องพักสวีทส่วนตัวที่เปิดรับวิวทิวเขาและทะเลหมอกยามเช้าผ่านกระจกใสบานใหญ่เต็มบาน",
    "ทุกหลังมาพร้อมระเบียงชมวิวส่วนตัว อ่างแช่น้ำกลางแจ้ง (Outdoor Bathtub) สำหรับนอนแช่น้ำอุ่นรับลมหนาว และบริการเสิร์ฟเซ็ตอาหารเช้าถึงหน้าห้องพัก พร้อมระบบเช็คห้องว่างรายวันและล็อคห้องพักอัตโนมัติ 15 นาทีเมื่อจองตรงผ่านเว็บไซต์ทางการ",
  ],
  storyParagraphsEn: [
    "Nestled in the heart of Ban Sapan, Bo Kluea District, Nan, Sapan Unseen features iconic two-storey A-Frame timber villas and secluded corner suites overlooking misty mountain ridges.",
    "Every lodge includes a private viewing deck with an outdoor soaking bathtub and complimentary morning breakfast served directly to your terrace.",
  ],
  primaryColor: "#2B2826",
  accentColor: "#A29080",
  locationTh: "บ้านสะปัน ต.ดงพญา อ.บ่อเกลือ จ.น่าน",
  locationEn: "Ban Sapan, Dong Phaya, Bo Kluea District, Nan 55220",
  latitude: 19.1928,
  longitude: 101.1986,
  weatherCityLabelTh: "หมู่บ้านสะปัน อ.บ่อเกลือ · จ.น่าน",
  weatherCityLabelEn: "Sapan Valley, Bo Kluea · Nan",
  phones: ["095-779-7971", "086-769-9779"],
  lineId: "@sapanunseen",
  email: "booking@sapanunseen.com",
  checkInTime: "14:00 น.",
  checkOutTime: "11:00 น.",
  breakfastTime: "08:00 – 09:30 น.",
  promptPayId: "0957797971",
  promptPayAccountName: "สะปัน อันซีน น่าน (Sapan Unseen)",
  autoConfirmSlip: true,
  subdomainSlug: "sapanunseen",
  customDomain: "www.sapanunseen.com",
  lineNotifyConnected: true,
  aiAutoBookingEnabled: true,
  rulesTh: [
    "เช็คอิน 14:00 น. / เช็คเอาท์ 11:00 น. (ฟรีอาหารเช้าเสิร์ฟถึงห้องพักเวลา 08:00 – 09:30 น.)",
    "เด็กอายุ 0–5 ปี เข้าพักฟรี (ไม่เสริมที่นอน) | เสริมที่นอนท่านละ 850 บาท/คืน รวมอาหารเช้า (แจ้งล่วงหน้าอย่างน้อย 3 วัน)",
    "ไม่อนุญาตให้นำสัตว์เลี้ยงเข้าพักทุกชนิด และงดสูบบุหรี่ภายในห้องพัก",
    "ห้ามประกอบอาหารบริเวณที่พักทุกชนิดเนื่องจากความเสี่ยงด้านอัคคีภัย (สามารถสั่งชุดหมูกระทะของที่พักได้)",
    "งดใช้เสียงดังหลังเวลา 20:30 น. เพื่อรักษาความสงบเป็นส่วนตัวของผู้เข้าพักทุกท่าน",
  ],
  sectionsVisibility: {
    heroSection: true,
    storyAndWeatherSection: true,
    accommodationsSection: true,
    specialOffersSection: true,
    diningSection: true,
    experiencesSection: true,
    galleryAndReviewsSection: true,
    policiesAndLocationSection: true,
  },
};

// Backwards-compatible alias
export const SAPAN_PROPERTY_INFO = INITIAL_PROPERTY_CONFIG;

export const INITIAL_SEASONAL_RATES: SeasonalRateRule[] = [
  {
    id: "season-high-winter",
    nameTh: "High Season — ฤดูหนาวชมทะเลหมอกสะปัน",
    nameEn: "High Season Winter Mist Escape",
    seasonType: "HIGH",
    startDate: "2026-11-01",
    endDate: "2027-02-28",
    adjustmentType: "PERCENT_SURCHARGE",
    adjustmentValue: 20, // +20%
    minStayNights: 1,
    badgeTh: "High Season (+20%)",
    isActive: true,
  },
  {
    id: "season-peak-newyear",
    nameTh: "Peak Season — เทศกาลปีใหม่ & หยุดยาว",
    nameEn: "Festive Peak Season (New Year)",
    seasonType: "PEAK",
    startDate: "2026-12-24",
    endDate: "2027-01-04",
    adjustmentType: "PERCENT_SURCHARGE",
    adjustmentValue: 30, // +30%
    minStayNights: 2,
    badgeTh: "Peak Festive (+30%)",
    isActive: true,
  },
  {
    id: "season-low-green",
    nameTh: "Green Season — โปรโมชั่นกรีนซีซั่นชมนาข้าวเขียวขจี",
    nameEn: "Green Season Sanctuary Saver",
    seasonType: "LOW",
    startDate: "2026-05-01",
    endDate: "2026-09-30",
    adjustmentType: "PERCENT_DISCOUNT",
    adjustmentValue: 15, // -15%
    minStayNights: 1,
    badgeTh: "Green Season (-15%)",
    isActive: true,
  },
];

export const INITIAL_SPECIAL_DATE_OVERRIDES: SpecialDateRateOverride[] = [
  {
    id: "sp-chulalongkorn-day",
    dateStr: "2026-10-23",
    titleTh: "วันปิยมหาราช (Long Weekend Holiday)",
    titleEn: "Chulalongkorn Memorial Day (Long Weekend)",
    pricingMode: "SURCHARGE_THB",
    amountThb: 500,
    isActive: true,
  },
  {
    id: "sp-newyear-eve",
    dateStr: "2026-12-31",
    titleTh: "คืนส่งท้ายปีเก่าต้อนรับปีใหม่ (New Year's Eve)",
    titleEn: "New Year's Eve Holiday",
    pricingMode: "SURCHARGE_THB",
    amountThb: 1000,
    isActive: true,
  },
];

export const INITIAL_SAPAN_ROOMS: RoomLodge[] = [
  {
    id: "room-a1",
    slug: "a-frame-a1",
    code: "A1",
    nameTh: "บ้านพัก A1 — A-Frame Panorama Villa",
    nameEn: "Lodge A1 — A-Frame Panorama Villa",
    categoryTh: "บ้านไม้ทรงเอเฟรม 2 ชั้น (โซนหน้าใกล้ล็อบบี้)",
    categoryEn: "2-Storey A-Frame Villa",
    roomCategory: "VILLA",
    inventoryMode: "SINGLE_UNIT",
    totalUnits: 1,
    shortDescTh:
      "บ้านไม้ทรง A-Frame 2 ชั้นดีไซน์โดดเด่น ชั้นล่างเป็นเตียงนอนนุ่มชมวิวภูเขาและสายหมอก ชั้นบนเป็นห้องนอนใต้หลังคา พร้อมอ่างแช่น้ำกลางแจ้งหน้าระเบียง",
    shortDescEn:
      "Iconic two-storey A-Frame timber villa featuring a ground-floor panoramic bedroom, cozy attic loft, and private outdoor soaking bathtub facing the misty mountains.",
    longDescTh: [
      "บ้านพัก A1 เป็นบ้านไม้ทรง A-Frame 2 ชั้น ตั้งอยู่โซนด้านหน้าเดินทางสะดวกใกล้จุดจอดรถและล็อบบี้ เปิดรับวิวขุนเขาและทะเลหมอกสะปันผ่านกระจกใสบานใหญ่เต็มบาน",
      "ชั้นล่างจัดวางเตียงนอนหนานุ่มพร้อมมุมนั่งเล่นที่มองเห็นวิวภูเขาได้จากบนเตียง ส่วนชั้นบนเป็นห้องนอนใต้หลังคาให้ความรู้สึกอบอุ่นเหมือนบ้านพักตากอากาศต่างประเทศ",
      "ไฮไลท์คือระเบียงไม้ส่วนตัวพร้อมอ่างแช่น้ำกลางแจ้ง (Outdoor Bathtub) สำหรับนอนแช่น้ำอุ่นรับลมหนาว และบริการเสิร์ฟอาหารเช้าถึงหน้าห้องพัก",
    ],
    longDescEn: [
      "Lodge A1 is our signature 2-storey A-Frame cabin with floor-to-ceiling glass framing the Sapan mountain ridge and morning mist.",
      "Includes a private outdoor bathtub on the wooden deck and complimentary morning breakfast served directly to your terrace.",
    ],
    basePriceThb: 2990,
    weekendPriceThb: 3590,
    discountPercent: 10,
    extraBedPriceThb: 850,
    sizeSqm: 48,
    minGuests: 1,
    baseGuests: 2,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    petsAllowed: false,
    statusMode: "ACTIVE",
    mapX: 52,
    mapY: 55.9,
    highlightTh: "บ้าน A-Frame 2 ชั้น · มีอ่างแช่น้ำระเบียง · เสริมได้สูงสุด 4 ท่าน",
    highlightEn: "2-Storey A-Frame · Outdoor Bathtub · Up to 4 Guests",
    images: [
      {
        url: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ้านพักทรง A-Frame ท่ามกลางขุนเขาและสายหมอกสะปัน",
        captionEn: "A-Frame timber lodge overlooking Sapan valley",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "เตียงนอนชั้นล่างหันรับวิวภูเขาผ่านกระจกบานใหญ่",
        captionEn: "Ground floor panoramic bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ระเบียงส่วนตัวและอ่างแช่น้ำชมวิวธรรมชาติ",
        captionEn: "Private deck and outdoor soaking tub",
      },
    ],
    amenities: {
      common: [
        "บ้านทรง A-Frame 2 ชั้น (ชั้นล่าง + ชั้นลอยใต้หลังคา)",
        "เครื่องปรับอากาศและเครื่องทำน้ำอุ่น",
        "ชุดเครื่องนอนพรีเมียม ผ้าเช็ดตัว และไดร์เป่าผม",
        "ฟรี Wi-Fi ความเร็วสูง",
      ],
      dining: [
        "ฟรีอาหารเช้าเสิร์ฟถึงห้องพัก (08:00 - 09:30 น.)",
        "ชุดดริปกาแฟ / กาน้ำร้อนไฟฟ้า",
        "น้ำดื่มและมินิบาร์ภายในห้อง",
      ],
      outdoor: [
        "อ่างแช่น้ำกลางแจ้ง (Outdoor Bathtub) หน้าระเบียง",
        "ระเบียงไม้ชมทะเลหมอกและขุนเขาส่วนตัว",
      ],
    },
    amenitiesEn: {
      common: [
        "2-Storey A-Frame Villa (Ground floor + Attic loft)",
        "Air conditioning & water heater",
        "Premium bedding, towels, and hair dryer",
        "Complimentary high-speed Wi-Fi",
      ],
      dining: [
        "Free breakfast served to your room (08:00 – 09:30)",
        "Pour-over drip coffee set & electric kettle",
        "Complimentary drinking water & in-room minibar",
      ],
      outdoor: [
        "Private outdoor soaking bathtub on terrace",
        "Private wooden viewing deck overlooking sea of mist",
      ],
    },
  },
  {
    id: "room-a2",
    slug: "a-frame-a2",
    code: "A2",
    nameTh: "บ้านพัก A2 — A-Frame Panorama Villa",
    nameEn: "Lodge A2 — A-Frame Panorama Villa",
    categoryTh: "บ้านไม้ทรงเอเฟรม 2 ชั้น (เคียงคู่บ้าน A1)",
    categoryEn: "2-Storey A-Frame Villa",
    roomCategory: "VILLA",
    inventoryMode: "SINGLE_UNIT",
    totalUnits: 1,
    shortDescTh:
      "บ้านไม้ทรง A-Frame 2 ชั้นหลังที่ 2 ตั้งอยู่เคียงข้างบ้าน A1 มีระเบียงชมวิวและอ่างแช่น้ำกลางแจ้ง เหมาะสำหรับคู่รัก ครอบครัว หรือจองคู่ A1+A2 สำหรับแก๊งเพื่อน",
    shortDescEn:
      "Twin two-storey A-Frame villa next to A1 with panoramic glass facade, attic loft bedroom, and outdoor bathtub on the private deck.",
    longDescTh: [
      "บ้านพัก A2 ออกแบบในสไตล์ A-Frame 2 ชั้นคู่กับหลัง A1 มองเห็นทิวเขาสะปันและสายหมอกยามเช้าได้อย่างชัดเจน",
      "รองรับการเข้าพักมาตรฐาน 2 ท่าน และสามารถเสริมที่นอนเพิ่มได้สูงสุดถึง 4 ท่าน (ท่านที่ 3–4 คิดค่าบริการเสริมท่านละ 850 บาท รวมอาหารเช้า)",
    ],
    longDescEn: [
      "Lodge A2 mirrors the iconic 2-storey A-Frame architecture of A1, ideal for couples, families, or friends booking A1 and A2 together.",
    ],
    basePriceThb: 2990,
    weekendPriceThb: 3590,
    discountPercent: 10,
    extraBedPriceThb: 850,
    sizeSqm: 48,
    minGuests: 1,
    baseGuests: 2,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    petsAllowed: false,
    statusMode: "ACTIVE",
    mapX: 52,
    mapY: 71.3,
    highlightTh: "บ้าน A-Frame 2 ชั้น · จองคู่ A1 ได้ · มีอ่างแช่น้ำระเบียง",
    highlightEn: "2-Storey A-Frame · Outdoor Bathtub · Up to 4 Guests",
    images: [
      {
        url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ้านพัก A2 ทรงเอเฟรมพร้อมระเบียงชมหมอก",
        captionEn: "Lodge A2 A-Frame exterior",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ห้องนอนอบอุ่นมองเห็นวิวธรรมชาติเต็มตา",
        captionEn: "Cozy bedroom with panoramic mountain view",
      },
      {
        url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ห้องนอนชั้นลอยใต้หลังคา",
        captionEn: "Attic loft sleeping area",
      },
    ],
    amenities: {
      common: [
        "บ้านทรง A-Frame 2 ชั้น (ชั้นล่าง + ชั้นลอยใต้หลังคา)",
        "เครื่องปรับอากาศและเครื่องทำน้ำอุ่น",
        "ชุดเครื่องนอนพรีเมียม ผ้าเช็ดตัว และไดร์เป่าผม",
        "ฟรี Wi-Fi ความเร็วสูง",
      ],
      dining: [
        "ฟรีอาหารเช้าเสิร์ฟถึงห้องพัก (08:00 - 09:30 น.)",
        "ชุดดริปกาแฟ / กาน้ำร้อนไฟฟ้า",
        "น้ำดื่มฟรี",
      ],
      outdoor: [
        "อ่างแช่น้ำกลางแจ้ง (Outdoor Bathtub) หน้าระเบียง",
        "ระเบียงส่วนตัวรับลมหนาว",
      ],
    },
    amenitiesEn: {
      common: [
        "2-Storey A-Frame Villa (Ground floor + Attic loft)",
        "Air conditioning & water heater",
        "Premium bedding, towels, and hair dryer",
        "Complimentary high-speed Wi-Fi",
      ],
      dining: [
        "Free breakfast served to your room (08:00 – 09:30)",
        "Pour-over drip coffee set & electric kettle",
        "Complimentary drinking water",
      ],
      outdoor: [
        "Private outdoor soaking bathtub on terrace",
        "Private mountain-view terrace",
      ],
    },
  },
  {
    id: "room-a3",
    slug: "suite-cabin-a3",
    code: "A3",
    nameTh: "บ้านพัก A3 — Mist Suite Cabin",
    nameEn: "Lodge A3 — Mist Suite Cabin",
    categoryTh: "บ้านพักสวีทส่วนตัว (โซนด้านใน ถัดจากศาลาพักผ่อน)",
    categoryEn: "Private Suite Cabin",
    roomCategory: "SUITE",
    inventoryMode: "SINGLE_UNIT",
    totalUnits: 1,
    shortDescTh:
      "บ้านพักโซนด้านในถัดจากลานพักผ่อนกลาง ออกแบบสำหรับ 2 ท่านที่ต้องการความเงียบสงบเป็นส่วนตัว พร้อมอ่างแช่น้ำหน้าระเบียงชมวิวหุบเขาสะปัน",
    shortDescEn:
      "Intimate suite cabin tucked past the central garden pavilion, crafted for couples seeking quiet immersion in Sapan's misty mountain scenery.",
    longDescTh: [
      "บ้านพัก A3 ตั้งอยู่ในโซนด้านในที่เงียบสงบ ถัดจากซุ้มศาลาพักผ่อนกลางสวน หันหน้ารับวิวภูเขาและสายหมอกฝั่งตะวันออกโดยไม่มีสิ่งบดบัง",
      "ออกแบบมาให้เหมาะสำหรับคู่รัก (2 ท่าน) พร้อมอ่างแช่น้ำกลางแจ้งริมระเบียงและบริการอาหารเช้าเสิร์ฟถึงหน้าห้อง",
    ],
    longDescEn: [
      "Lodge A3 is positioned in the tranquil inner garden zone, offering uninterrupted valley views and a private outdoor tub for two.",
    ],
    basePriceThb: 2590,
    weekendPriceThb: 3190,
    discountPercent: 10,
    extraBedPriceThb: 850,
    sizeSqm: 35,
    minGuests: 1,
    baseGuests: 2,
    maxGuests: 3,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    petsAllowed: false,
    statusMode: "ACTIVE",
    mapX: 67.8,
    mapY: 61.8,
    highlightTh: "โซนด้านในเงียบสงบ · อ่างแช่น้ำชมหมอก · เริ่มต้น 2,590.-",
    highlightEn: "Inner Garden Sanctuary · Private Tub · From ฿2,590",
    images: [
      {
        url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ้านพัก A3 ท่ามกลางแมกไม้และสายหมอก",
        captionEn: "Lodge A3 surrounded by lush mountain greenery",
      },
      {
        url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บรรยากาศภายในห้องพักโทนอบอุ่น",
        captionEn: "Warm minimalist suite interior",
      },
      {
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85",
        captionTh: "วิวหุบเขาสะปันจากหน้าระเบียงห้อง A3",
        captionEn: "Sapan valley panorama from terrace",
      },
    ],
    amenities: {
      common: [
        "เตียง King Size หันรับวิวภูเขา",
        "เครื่องปรับอากาศและเครื่องทำน้ำอุ่น",
        "ไดร์เป่าผม ผ้าเช็ดตัว และชุดอาบน้ำ",
        "ฟรี Wi-Fi ความเร็วสูง",
      ],
      dining: [
        "ฟรีอาหารเช้าเสิร์ฟถึงห้องพัก (08:00 - 09:30 น.)",
        "ชุดชงกาแฟและกาน้ำร้อนไฟฟ้า",
        "น้ำดื่มฟรี",
      ],
      outdoor: [
        "อ่างแช่น้ำกลางแจ้งชมวิวภูเขา",
        "ระเบียงไม้ส่วนตัวพร้อมชุดโต๊ะนั่งเล่น",
      ],
    },
    amenitiesEn: {
      common: [
        "King-size bed facing mountain ridge",
        "Air conditioning & water heater",
        "Hair dryer, towels, and bath amenities",
        "Complimentary high-speed Wi-Fi",
      ],
      dining: [
        "Free breakfast served to your room (08:00 – 09:30)",
        "Coffee set & electric kettle",
        "Complimentary drinking water",
      ],
      outdoor: [
        "Outdoor soaking bathtub overlooking the valley",
        "Private wooden terrace with lounge seating",
      ],
    },
  },
  {
    id: "room-a4",
    slug: "suite-cabin-a4",
    code: "A4",
    nameTh: "บ้านพัก A4 — Private Corner Suite",
    nameEn: "Lodge A4 — Private Corner Suite",
    categoryTh: "บ้านพักสวีทหลังในสุด (Private Corner)",
    categoryEn: "Secluded Corner Suite",
    roomCategory: "SUITE",
    inventoryMode: "SINGLE_UNIT",
    totalUnits: 1,
    shortDescTh:
      "บ้านพักหลังในสุดของโครงการ ไม่มีคนเดินผ่านหน้าห้อง มอบความเป็นส่วนตัวสูงสุดพร้อมมุมมองพาโนรามาเปิดโล่งและอ่างแช่น้ำกลางแจ้งริมระเบียง",
    shortDescEn:
      "Our most secluded corner cabin at the end of the garden path, offering 100% privacy, unobstructed valley views, and a private outdoor tub.",
    longDescTh: [
      "บ้านพัก A4 ตั้งอยู่ตำแหน่งริมสุดทางเดินด้านในของสะปัน อันซีน จึงไม่มีผู้เข้าพักท่านอื่นเดินผ่านหน้าระเบียง เหมาะสำหรับผู้ที่ต้องการความเงียบสงบและเป็นส่วนตัวสูงสุด",
      "มาพร้อมระเบียงชมทะเลหมอกมุมกว้าง อ่างแช่น้ำกลางแจ้ง และบริการอาหารเช้าเสิร์ฟถึงห้องพัก",
    ],
    longDescEn: [
      "Situated at the quietest corner of Sapan Unseen, Lodge A4 offers complete seclusion with an open valley panorama.",
    ],
    basePriceThb: 2590,
    weekendPriceThb: 3190,
    discountPercent: 10,
    extraBedPriceThb: 850,
    sizeSqm: 35,
    minGuests: 1,
    baseGuests: 2,
    maxGuests: 3,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    petsAllowed: false,
    statusMode: "ACTIVE",
    mapX: 76.6,
    mapY: 67.5,
    highlightTh: "หลังริมในสุดเป็นส่วนตัว 100% · อ่างแช่น้ำชมวิวพาโนรามา",
    highlightEn: "Most Secluded Corner Lodge · 100% Privacy",
    images: [
      {
        url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ้านพัก A4 โซนในสุดท่ามกลางสายหมอก",
        captionEn: "Secluded corner cabin A4",
      },
      {
        url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=85",
        captionTh: "วิวธรรมชาติจากเตียงนอน",
        captionEn: "Mountain view from the bed",
      },
      {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ทะเลหมอกยามเช้าหน้าห้องพัก",
        captionEn: "Morning sea of mist in Sapan",
      },
    ],
    amenities: {
      common: [
        "เตียง King Size หันรับวิวภูเขา",
        "เครื่องปรับอากาศและเครื่องทำน้ำอุ่น",
        "ไดร์เป่าผม และชุดผ้าเช็ดตัว",
        "ฟรี Wi-Fi ความเร็วสูง",
      ],
      dining: [
        "ฟรีอาหารเช้าเสิร์ฟถึงห้องพัก (08:00 - 09:30 น.)",
        "ชุดชงกาแฟและกาน้ำร้อนไฟฟ้า",
        "น้ำดื่มฟรี",
      ],
      outdoor: [
        "ระเบียงส่วนตัวหลังริมสุดไร้คนเดินผ่าน",
        "อ่างแช่น้ำกลางแจ้งชมวิวขุนเขา",
      ],
    },
    amenitiesEn: {
      common: [
        "King-size bed facing mountain ridge",
        "Air conditioning & water heater",
        "Hair dryer & towel set",
        "Complimentary high-speed Wi-Fi",
      ],
      dining: [
        "Free breakfast served to your room (08:00 – 09:30)",
        "Coffee set & electric kettle",
        "Complimentary drinking water",
      ],
      outdoor: [
        "Private secluded corner terrace with zero foot traffic",
        "Outdoor soaking bathtub with panoramic valley view",
      ],
    },
  },
];

export const INITIAL_EXTRA_ADDONS: ExtraAddon[] = [
  {
    id: "addon-mookata",
    nameTh: "ชุดหมูกระทะรับลมหนาวเสิร์ฟหน้าห้องพัก",
    nameEn: "Private Terrace Thai BBQ (Moo Krata) Set",
    descTh:
      "ชุดหมูหมักนุ่ม ผักสดสะปัน วุ้นเส้น น้ำจิ้มรสเด็ด พร้อมเตาเสิร์ฟถึงระเบียงห้องเวลา 18:00 น.",
    descEn:
      "Complete Thai BBQ set with local vegetables served to your private deck at 18:00.",
    priceThb: 590,
    unitTh: "/ ชุด (สำหรับ 2 ท่าน)",
    unitEn: "/ set (2 persons)",
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    category: "DINING",
    isActive: true,
  },
  {
    id: "addon-bubble-bath",
    nameTh: "เซ็ตตีฟองอ่างอาบน้ำ Aroma Bath Bomb & ดอกไม้",
    nameEn: "Aroma Bubble Bath & Floral Set",
    descTh:
      "สบู่ตีฟองกลิ่นอโรม่าผ่อนคลายสำหรับแช่อ่าง Outdoor Bathtub ถ่ายรูปสวยชมวิวทะเลหมอก",
    descEn: "Luxury aromatic bubble bath set for your outdoor soaking tub.",
    priceThb: 250,
    unitTh: "/ เซ็ต",
    unitEn: "/ set",
    imageUrl:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
    category: "SPA",
    isActive: true,
  },
  {
    id: "addon-drip-coffee",
    nameTh: "เซ็ตเมล็ดกาแฟน่านคั่วสด Special Drip Set",
    nameEn: "Nan Specialty Hand-Roasted Drip Coffee Set",
    descTh: "เมล็ดกาแฟอาราบิก้าแท้จากดอยน่าน พร้อมอุปกรณ์ดริปครบชุดเสิร์ฟถึงห้องพัก",
    descEn: "Single-origin Nan Arabica coffee beans with pour-over equipment.",
    priceThb: 290,
    unitTh: "/ เซ็ต",
    unitEn: "/ set",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    category: "DINING",
    isActive: true,
  },
  {
    id: "addon-northern-khantoke",
    nameTh: "ชุดขันโตกอาหารเหนือต้นตำรับเมืองน่าน",
    nameEn: "Authentic Nan Northern Khantoke Dinner Set",
    descTh:
      "อิ่มอร่อยกับน้ำพริกหนุ่ม แคบหมู ไส้อั่วสมุนไพร แกงฮังเล และข้าวเหนียวอัญชันร้อนๆ เสิร์ฟถึงระเบียง",
    descEn:
      "Traditional Northern Thai Khantoke platter served directly to your villa terrace.",
    priceThb: 490,
    unitTh: "/ ชุด (สำหรับ 2 ท่าน)",
    unitEn: "/ set (2 persons)",
    imageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
    category: "DINING",
    isActive: true,
  },
  {
    id: "addon-afternoon-tea",
    nameTh: "เซ็ตจิบชายามบ่ายชมขุนเขา (Mountain Afternoon Tea)",
    nameEn: "Sapan Valley Afternoon Tea & Homemade Bakery Set",
    descTh:
      "ชาดอกคาโมมายล์และชาอัสสัมจากยอดดอย เสิร์ฟคู่ขนมโฮมเมดและผลไม้ตามฤดูกาลริมระเบียง",
    descEn:
      "Artisanal highland tea paired with homemade pastries and seasonal fruits on your deck.",
    priceThb: 390,
    unitTh: "/ เซ็ต",
    unitEn: "/ set",
    imageUrl:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
    category: "DINING",
    isActive: true,
  },
];

export const INITIAL_PROMO_COUPONS: PromoCoupon[] = [
  {
    id: "coupon-sapan10",
    code: "SAPAN10",
    titleTh: "Sapan Direct Privilege — ลดเพิ่ม 10% เมื่อจองตรงผ่านเว็บ",
    titleEn: "Sapan Direct Privilege — 10% Off",
    descTh:
      "สิทธิพิเศษสำหรับลูกค้าที่จองตรงผ่านเว็บไซต์ทางการของ สะปัน อันซีน ลดเพิ่ม 10% ทุกบ้านพัก พร้อมฟรีอาหารเช้า",
    badgeTh: "DIRECT BOOKING · ลด 10%",
    imageUrl:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=900&q=80",
    discountType: "PERCENT",
    discountValue: 10,
    minSpendThb: 2000,
    isActive: true,
  },
  {
    id: "coupon-unseen500",
    code: "UNSEEN500",
    titleTh: "Stay 2 Nights — พัก 2 คืน หรือจองคู่ ลดทันที 500 บาท",
    titleEn: "Stay Longer Retreat — Save THB 500",
    descTh:
      "เมื่อมียอดจองตั้งแต่ 5,000 บาทขึ้นไป (เช่น พัก 2 คืน หรือจองบ้านคู่ A1+A2) รับส่วนลดท้ายบิลทันที 500 บาท",
    badgeTh: "LONG STAY · ลด ฿500",
    imageUrl:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=80",
    discountType: "FIXED",
    discountValue: 500,
    minSpendThb: 5000,
    isActive: true,
  },
  {
    id: "coupon-weekday300",
    code: "WEEKDAY300",
    titleTh: "Weekday Mist Escape — ส่วนลดวันธรรมดา 300 บาท",
    titleEn: "Weekday Mist Escape — Save THB 300",
    descTh:
      "เที่ยวสะปันวันธรรมดา (อาทิตย์–พฤหัสบดี) บรรยากาศเงียบสงบเป็นส่วนตัว ลดทันที 300 บาท",
    badgeTh: "WEEKDAY SAVER · -฿300",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
    discountType: "FIXED",
    discountValue: 300,
    minSpendThb: 2300,
    isActive: true,
  },
  {
    id: "coupon-earlybird15",
    code: "EARLY15",
    titleTh: "Early Bird Sanctuary — จองล่วงหน้าลดพิเศษ 15%",
    titleEn: "Early Bird Sanctuary — 15% Off Advance Booking",
    descTh:
      "วางแผนทริปสะปันล่วงหน้าและมียอดจองตั้งแต่ 4,500 บาทขึ้นไป รับส่วนลดพิเศษทันที 15%",
    badgeTh: "EARLY BIRD · ลด 15%",
    imageUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80",
    discountType: "PERCENT",
    discountValue: 15,
    minSpendThb: 4500,
    isActive: true,
  },
  {
    id: "coupon-villapair800",
    code: "GROUP800",
    titleTh: "Family & Friends Villa — เหมา 2 หลังขึ้นไป ลดทันที 800 บาท",
    titleEn: "Family & Friends Multi-Villa — Save THB 800",
    descTh:
      "สำหรับการเดินทางแบบครอบครัวหรือกลุ่มเพื่อนเมื่อมียอดจองรวมตั้งแต่ 8,000 บาทขึ้นไป ลดทันที 800 บาท",
    badgeTh: "GROUP PRIVILEGE · -฿800",
    imageUrl:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80",
    discountType: "FIXED",
    discountValue: 800,
    minSpendThb: 8000,
    isActive: true,
  },
];

export const INITIAL_RESORT_EXPERIENCES: ResortExperienceItem[] = [
  {
    id: "exp-outdoor-bathtub",
    titleTh: "Outdoor Soaking Tub & Morning Sea of Mist",
    titleEn: "Outdoor Soaking Tub & Morning Sea of Mist",
    categoryTh: "SIGNATURE EXPERIENCE",
    categoryEn: "SIGNATURE EXPERIENCE",
    descTh:
      "นอนแช่น้ำอุ่นในอ่าง Outdoor Bathtub ริมระเบียงส่วนตัว ชมสายหมอกลอยผ่านทิวเขาสะปันยามเช้า",
    descEn:
      "Unwind in your private outdoor soaking tub as morning mist drifts across the Sapan valley.",
    imageUrl:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=80",
    highlightTh: "มีอ่างแช่น้ำส่วนตัวทุกหลัง (A1–A4)",
  },
  {
    id: "exp-terrace-mookata",
    titleTh: "Private Terrace Moo Krata & Nan Drip Coffee",
    titleEn: "Private Terrace BBQ & Local Drip Coffee",
    categoryTh: "LOCAL CULINARY",
    categoryEn: "LOCAL CULINARY",
    descTh:
      "อิ่มอร่อยกับชุดหมูกระทะร้อนๆ เสิร์ฟถึงระเบียงหน้าห้องพักในยามเย็น และดริปกาแฟเมล็ดน่านคั่วสดยามเช้า",
    descEn:
      "Savor hot Thai BBQ on your private deck at dusk and hand-roasted Nan Arabica drip coffee at dawn.",
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    highlightTh: "เสิร์ฟถึงระเบียงห้องพักเวลา 18:00 น.",
  },
  {
    id: "exp-sapan-discovery",
    titleTh: "Sapan Waterfall, Suspension Bridge & Bo Kluea",
    titleEn: "Sapan Waterfall, Suspension Bridge & Ancient Salt Wells",
    categoryTh: "VALLEY EXPLORATION",
    categoryEn: "VALLEY EXPLORATION",
    descTh:
      "เดินเล่นสะพานแขวนสะปัน น้ำตกสะปัน วัดสะปัน และแวะชมบ่อเกลือสินเธาว์ภูเขาโบราณอายุกว่า 800 ปี",
    descEn:
      "Explore Sapan Waterfall, the scenic suspension bridge, Yood Wela Cafe, and ancient mountain salt wells.",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
    highlightTh: "ห่างจากจุดเช็คอินสะปันเพียง 5 นาที",
  },
  {
    id: "exp-yood-wela-morning",
    titleTh: "Sunrise Mist Viewpoint & Wat Sapan Temple",
    titleEn: "Sunrise Mist Viewpoint & Wat Sapan Temple",
    categoryTh: "MORNING SANCTUARY",
    categoryEn: "MORNING SANCTUARY",
    descTh:
      "ตื่นเช้าไปทำบุญตักบาตรและชมจุดชมวิวทะเลหมอกวัดสะปัน พร้อมแวะคาเฟ่หยุดเวลาที่มองเห็นหมู่บ้านสะปันแบบพาโนรามา",
    descEn:
      "Experience morning alms giving and panoramic valley views above Sapan village.",
    imageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80",
    highlightTh: "จุดชมทะเลหมอกยอดฮิต ห่างเพียง 1.2 กม.",
  },
  {
    id: "exp-stargazing-deck",
    titleTh: "Stargazing & Highland Acoustic Night on Your Deck",
    titleEn: "Stargazing & Peaceful Valley Night",
    categoryTh: "NIGHT SANCTUARY",
    categoryEn: "NIGHT SANCTUARY",
    descTh:
      "ดื่มด่ำกับค่ำคืนอันเงียบสงบท่ามกลางหุบเขาสะปัน ชมดาวเต็มท้องฟ้าจากระเบียงไม้ส่วนตัวในอากาศเย็นสบายตลอดปี",
    descEn:
      "Gaze at a canopy of stars from your private wooden terrace in the tranquil mountain air.",
    imageUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80",
    highlightTh: "บรรยากาศเงียบสงบ ไร้แสงไฟรบกวน",
  },
];
