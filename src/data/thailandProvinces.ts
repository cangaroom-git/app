export type ThailandRegionId =
  | "north"
  | "central"
  | "northeast"
  | "east"
  | "west"
  | "south";

export interface ThailandProvince {
  id: string;
  nameTh: string;
  nameEn: string;
  region: ThailandRegionId;
  isPopular?: boolean;
}

export const THAILAND_REGIONS: Array<{
  id: "all" | ThailandRegionId;
  labelTh: string;
  labelEn: string;
}> = [
  { id: "all", labelTh: "ทั่วไทย (77)", labelEn: "All 77" },
  { id: "north", labelTh: "ภาคเหนือ", labelEn: "North" },
  { id: "south", labelTh: "ภาคใต้ & ทะเล", labelEn: "South" },
  { id: "east", labelTh: "ตะวันออก", labelEn: "East" },
  { id: "central", labelTh: "ภาคกลาง & กทม.", labelEn: "Central" },
  { id: "northeast", labelTh: "อีสาน / เขาใหญ่", labelEn: "Northeast" },
  { id: "west", labelTh: "ตะวันตก", labelEn: "West" },
];

/** Complete official 77 Provinces of Thailand */
export const THAILAND_77_PROVINCES: ThailandProvince[] = [
  // North (9 + upper central scenic)
  { id: "chiang-mai", nameTh: "เชียงใหม่", nameEn: "Chiang Mai", region: "north", isPopular: true },
  { id: "nan", nameTh: "น่าน", nameEn: "Nan", region: "north", isPopular: true },
  { id: "chiang-rai", nameTh: "เชียงราย", nameEn: "Chiang Rai", region: "north", isPopular: true },
  { id: "mae-hong-son", nameTh: "แม่ฮ่องสอน", nameEn: "Mae Hong Son", region: "north", isPopular: true },
  { id: "phrae", nameTh: "แพร่", nameEn: "Phrae", region: "north" },
  { id: "phayao", nameTh: "พะเยา", nameEn: "Phayao", region: "north" },
  { id: "lampang", nameTh: "ลำปาง", nameEn: "Lampang", region: "north" },
  { id: "lamphun", nameTh: "ลำพูน", nameEn: "Lamphun", region: "north" },
  { id: "uttaradit", nameTh: "อุตรดิตถ์", nameEn: "Uttaradit", region: "north" },

  // Central (22)
  { id: "bangkok", nameTh: "กรุงเทพมหานคร", nameEn: "Bangkok", region: "central", isPopular: true },
  { id: "phetchabun", nameTh: "เพชรบูรณ์ (เขาค้อ)", nameEn: "Phetchabun", region: "central", isPopular: true },
  { id: "phra-nakhon-si-ayutthaya", nameTh: "พระนครศรีอยุธยา", nameEn: "Ayutthaya", region: "central" },
  { id: "nakhon-nayok", nameTh: "นครนายก", nameEn: "Nakhon Nayok", region: "central" },
  { id: "saraburi", nameTh: "สระบุรี", nameEn: "Saraburi", region: "central" },
  { id: "nonthaburi", nameTh: "นนทบุรี", nameEn: "Nonthaburi", region: "central" },
  { id: "pathum-thani", nameTh: "ปทุมธานี", nameEn: "Pathum Thani", region: "central" },
  { id: "samut-prakan", nameTh: "สมุทรปราการ", nameEn: "Samut Prakan", region: "central" },
  { id: "samut-sakhon", nameTh: "สมุทรสาคร", nameEn: "Samut Sakhon", region: "central" },
  { id: "samut-songkhram", nameTh: "สมุทรสงคราม (อัมพวา)", nameEn: "Samut Songkhram", region: "central" },
  { id: "nakhon-pathom", nameTh: "นครปฐม", nameEn: "Nakhon Pathom", region: "central" },
  { id: "suphan-buri", nameTh: "สุพรรณบุรี", nameEn: "Suphan Buri", region: "central" },
  { id: "ang-thong", nameTh: "อ่างทอง", nameEn: "Ang Thong", region: "central" },
  { id: "sing-buri", nameTh: "สิงห์บุรี", nameEn: "Sing Buri", region: "central" },
  { id: "lop-buri", nameTh: "ลพบุรี", nameEn: "Lop Buri", region: "central" },
  { id: "chai-nat", nameTh: "ชัยนาท", nameEn: "Chai Nat", region: "central" },
  { id: "uthai-thani", nameTh: "อุทัยธานี", nameEn: "Uthai Thani", region: "central" },
  { id: "nakhon-sawan", nameTh: "นครสวรรค์", nameEn: "Nakhon Sawan", region: "central" },
  { id: "phichit", nameTh: "พิจิตร", nameEn: "Phichit", region: "central" },
  { id: "phitsanulok", nameTh: "พิษณุโลก", nameEn: "Phitsanulok", region: "central" },
  { id: "sukhothai", nameTh: "สุโขทัย", nameEn: "Sukhothai", region: "central" },
  { id: "kamphaeng-phet", nameTh: "กำแพงเพชร", nameEn: "Kamphaeng Phet", region: "central" },

  // East (7)
  { id: "chon-buri", nameTh: "ชลบุรี (พัทยา/บางแสน)", nameEn: "Chon Buri", region: "east", isPopular: true },
  { id: "rayong", nameTh: "ระยอง (เกาะเสม็ด)", nameEn: "Rayong", region: "east", isPopular: true },
  { id: "trat", nameTh: "ตราด (เกาะช้าง/เกาะกูด)", nameEn: "Trat", region: "east", isPopular: true },
  { id: "chanthaburi", nameTh: "จันทบุรี", nameEn: "Chanthaburi", region: "east" },
  { id: "chachoengsao", nameTh: "ฉะเชิงเทรา", nameEn: "Chachoengsao", region: "east" },
  { id: "prachin-buri", nameTh: "ปราจีนบุรี", nameEn: "Prachin Buri", region: "east" },
  { id: "sa-kaeo", nameTh: "สระแก้ว", nameEn: "Sa Kaeo", region: "east" },

  // West (5)
  { id: "prachuap-khiri-khan", nameTh: "ประจวบคีรีขันธ์ (หัวหิน)", nameEn: "Hua Hin / Prachuap", region: "west", isPopular: true },
  { id: "phetchaburi", nameTh: "เพชรบุรี (ชะอำ)", nameEn: "Phetchaburi", region: "west", isPopular: true },
  { id: "kanchanaburi", nameTh: "กาญจนบุรี", nameEn: "Kanchanaburi", region: "west", isPopular: true },
  { id: "ratchaburi", nameTh: "ราชบุรี (สวนผึ้ง)", nameEn: "Ratchaburi", region: "west" },
  { id: "tak", nameTh: "ตาก", nameEn: "Tak", region: "west" },

  // Northeast / Isan (20)
  { id: "nakhon-ratchasima", nameTh: "นครราชสีมา (เขาใหญ่)", nameEn: "Khao Yai / Korat", region: "northeast", isPopular: true },
  { id: "loei", nameTh: "เลย (เชียงคาน)", nameEn: "Loei", region: "northeast", isPopular: true },
  { id: "khon-kaen", nameTh: "ขอนแก่น", nameEn: "Khon Kaen", region: "northeast" },
  { id: "udon-thani", nameTh: "อุดรธานี", nameEn: "Udon Thani", region: "northeast" },
  { id: "ubon-ratchathani", nameTh: "อุบลราชธานี", nameEn: "Ubon Ratchathani", region: "northeast" },
  { id: "buri-ram", nameTh: "บุรีรัมย์", nameEn: "Buri Ram", region: "northeast" },
  { id: "surin", nameTh: "สุรินทร์", nameEn: "Surin", region: "northeast" },
  { id: "si-sa-ket", nameTh: "ศรีสะเกษ", nameEn: "Si Sa Ket", region: "northeast" },
  { id: "chaiyaphum", nameTh: "ชัยภูมิ", nameEn: "Chaiyaphum", region: "northeast" },
  { id: "nong-khai", nameTh: "หนองคาย", nameEn: "Nong Khai", region: "northeast" },
  { id: "bueng-kan", nameTh: "บึงกาฬ", nameEn: "Bueng Kan", region: "northeast" },
  { id: "nakhon-phanom", nameTh: "นครพนม", nameEn: "Nakhon Phanom", region: "northeast" },
  { id: "sakon-nakhon", nameTh: "สกลนคร", nameEn: "Sakon Nakhon", region: "northeast" },
  { id: "mukdahan", nameTh: "มุกดาหาร", nameEn: "Mukdahan", region: "northeast" },
  { id: "kalasin", nameTh: "กาฬสินธุ์", nameEn: "Kalasin", region: "northeast" },
  { id: "maha-sarakham", nameTh: "มหาสารคาม", nameEn: "Maha Sarakham", region: "northeast" },
  { id: "roi-et", nameTh: "ร้อยเอ็ด", nameEn: "Roi Et", region: "northeast" },
  { id: "yasothon", nameTh: "ยโสธร", nameEn: "Yasothon", region: "northeast" },
  { id: "amnat-charoen", nameTh: "อำนาจเจริญ", nameEn: "Amnat Charoen", region: "northeast" },
  { id: "nong-bua-lam-phu", nameTh: "หนองบัวลำภู", nameEn: "Nong Bua Lam Phu", region: "northeast" },

  // South (14)
  { id: "phuket", nameTh: "ภูเก็ต", nameEn: "Phuket", region: "south", isPopular: true },
  { id: "krabi", nameTh: "กระบี่", nameEn: "Krabi", region: "south", isPopular: true },
  { id: "surat-thani", nameTh: "สุราษฎร์ธานี (สมุย/พะงัน)", nameEn: "Koh Samui / Surat", region: "south", isPopular: true },
  { id: "phang-nga", nameTh: "พังงา (เขาหลัก)", nameEn: "Phang Nga", region: "south", isPopular: true },
  { id: "songkhla", nameTh: "สงขลา (หาดใหญ่)", nameEn: "Songkhla", region: "south" },
  { id: "trang", nameTh: "ตรัง", nameEn: "Trang", region: "south" },
  { id: "satun", nameTh: "สตูล (เกาะหลีเป๊ะ)", nameEn: "Satun / Koh Lipe", region: "south" },
  { id: "chumphon", nameTh: "ชุมพร", nameEn: "Chumphon", region: "south" },
  { id: "ranong", nameTh: "ระนอง", nameEn: "Ranong", region: "south" },
  { id: "nakhon-si-thammarat", nameTh: "นครศรีธรรมราช (ขนอม)", nameEn: "Nakhon Si Thammarat", region: "south" },
  { id: "phatthalung", nameTh: "พัทลุง", nameEn: "Phatthalung", region: "south" },
  { id: "pattani", nameTh: "ปัตตานี", nameEn: "Pattani", region: "south" },
  { id: "yala", nameTh: "ยะลา (เบตง)", nameEn: "Yala / Betong", region: "south" },
  { id: "narathiwat", nameTh: "นราธิวาส", nameEn: "Narathiwat", region: "south" },
];

export type StayStyleTag =
  | "mountain"
  | "sea"
  | "pool-villa"
  | "bars"
  | "glamping"
  | "bathtub";

export interface StayStyleCategoryMeta {
  id: StayStyleTag;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  priceFromThb: number;
  rating: string;
  countLabel: string;
  thumbUrl: string;
}

export const STAY_STYLE_CATEGORIES: StayStyleCategoryMeta[] = [
  {
    id: "mountain",
    titleTh: "Mountain & Mist",
    titleEn: "Mountain & Mist",
    subtitleTh: "ที่พักวิวภูเขา & ทะเลหมอก",
    subtitleEn: "Highland sanctuaries & morning mist",
    priceFromThb: 2590,
    rating: "4.9",
    countLabel: "48 แห่ง",
    thumbUrl:
      "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838919/my-hotel/hero/obxqa4pz2mbziitzrgop.webp",
  },
  {
    id: "pool-villa",
    titleTh: "Pool Villas",
    titleEn: "Pool Villas",
    subtitleTh: "พูลวิลล่าสระส่วนตัวเหมาหลัง",
    subtitleEn: "Private infinity & courtyard pool villas",
    priceFromThb: 4500,
    rating: "4.9",
    countLabel: "64 แห่ง",
    thumbUrl:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sea",
    titleTh: "Sea & Beachfront",
    titleEn: "Sea & Beachfront",
    subtitleTh: "รีสอร์ทติดทะเล & เกาะส่วนตัว",
    subtitleEn: "Beachfront resorts & island escapes",
    priceFromThb: 3200,
    rating: "4.8",
    countLabel: "52 แห่ง",
    thumbUrl:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "bars",
    titleTh: "Bars & Rooftop",
    titleEn: "Bars & Rooftop",
    subtitleTh: "โรงแรมมีรูฟท็อปบาร์ & ไนท์ไลฟ์",
    subtitleEn: "Boutique stays with craft bars & skyline views",
    priceFromThb: 2900,
    rating: "4.8",
    countLabel: "29 แห่ง",
    thumbUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "bathtub",
    titleTh: "Onsen & Bathtub",
    titleEn: "Onsen & Bathtub",
    subtitleTh: "อ่างแช่น้ำกลางแจ้งชมวิวธรรมชาติ",
    subtitleEn: "Outdoor soaking tubs & private onsen",
    priceFromThb: 2890,
    rating: "4.9",
    countLabel: "37 แห่ง",
    thumbUrl:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "glamping",
    titleTh: "Glamping & Cabin",
    titleEn: "Glamping & Cabin",
    subtitleTh: "แกลมปิ้งโดม & เคบินไม้กลางป่าสน",
    subtitleEn: "Luxury tents & Nordic timber cabins",
    priceFromThb: 1990,
    rating: "4.8",
    countLabel: "31 แห่ง",
    thumbUrl:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80",
  },
];

export interface CuratedPartnerPin {
  id: string;
  hotelNameTh: string;
  hotelNameEn: string;
  provinceId: string;
  provinceLabelTh: string;
  provinceLabelEn: string;
  styles: StayStyleTag[];
  mediaKind: "photo" | "video";
  aspectClass: string;
  imageUrl: string;
  galleryUrls: string[];
  videoUrl?: string;
  videoDuration?: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  nightlyPriceThb: number;
  rating: string;
  baseLikes: number;
}

/** Curated Partner Properties across Thailand so users can explore & cross-filter immediately */
export const CURATED_THAILAND_PARTNER_PINS: CuratedPartnerPin[] = [
  {
    id: "partner-phuket-villa-1",
    hotelNameTh: "คามาล่า คลิฟ พูลวิลล่า",
    hotelNameEn: "Kamala Cliff Pool Villa",
    provinceId: "phuket",
    provinceLabelTh: "ภูเก็ต",
    provinceLabelEn: "Phuket",
    styles: ["sea", "pool-villa"],
    mediaKind: "photo",
    aspectClass: "aspect-[2/3]",
    imageUrl:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
    ],
    titleTh: "Infinity Pool Villa ริมผามองเห็นทะเลอันดามัน 180°",
    titleEn: "Oceanfront Infinity Pool Villa Overlooking Andaman Sea",
    descTh:
      "พูลวิลล่าส่วนตัวบนเนินผาหาดกมลา จ.ภูเก็ต สระว่ายน้ำไร้ขอบหันรับพระอาทิตย์ตกทะเลอันดามัน พร้อม Floating Breakfast เสิร์ฟถึงสระ",
    descEn:
      "Private cliffside pool villa in Kamala, Phuket featuring sunset Andaman views and floating breakfast.",
    nightlyPriceThb: 6900,
    rating: "4.9",
    baseLikes: 128,
  },
  {
    id: "partner-chiangmai-mist-vid",
    hotelNameTh: "ม่อนแจ่ม สกาย เคบิน",
    hotelNameEn: "Mon Jam Sky Cabin",
    provinceId: "chiang-mai",
    provinceLabelTh: "เชียงใหม่",
    provinceLabelEn: "Chiang Mai",
    styles: ["mountain", "glamping", "bathtub"],
    mediaKind: "video",
    aspectClass: "aspect-[16/9]",
    imageUrl:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85",
    ],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-foggy-mountains-at-sunrise-41575-large.mp4",
    videoDuration: "0:22",
    titleTh: "คลิปแสงเช้าเหนือทะเลหมอกแม่ริม อากาศ 16°C จากหน้าเคบินไม้",
    titleEn: "16°C Morning Mist Drifting Past Nordic Pine Cabins in Mae Rim",
    descTh:
      "เคบินไม้สนสไตล์นอร์ดิกกลางหุบเขาแม่ริม จ.เชียงใหม่ แช่อ่างน้ำอุ่นกลางแจ้งดูดาวตอนกลางคืนและตื่นรับทะเลหมอกยามเช้า",
    descEn:
      "Nordic pine cabin in Mae Rim, Chiang Mai with outdoor heated tub and panoramic mist.",
    nightlyPriceThb: 3400,
    rating: "4.9",
    baseLikes: 94,
  },
  {
    id: "partner-bangkok-rooftop-bar",
    hotelNameTh: "เดอะ ริเวอร์ไซด์ สกาย บาร์ & สวีท",
    hotelNameEn: "The Riverside Sky Bar & Suites",
    provinceId: "bangkok",
    provinceLabelTh: "กรุงเทพมหานคร",
    provinceLabelEn: "Bangkok",
    styles: ["bars"],
    mediaKind: "photo",
    aspectClass: "aspect-[4/5]",
    imageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=85",
    ],
    titleTh: "บูทีคโฮเทลริมเจ้าพระยา พร้อม Craft Cocktail Rooftop Bar ชั้นดาดฟ้า",
    titleEn: "Chao Phraya Boutique Hotel with Craft Cocktail Rooftop Bar",
    descTh:
      "ห้องพักดีไซน์คลาสสิกย่านเจริญกรุง กรุงเทพฯ ขึ้นลิฟต์ส่วนตัวสู่บาร์ค็อกเทลดาดฟ้าชมวิวโค้งแม่น้ำเจ้าพระยายามค่ำคืน",
    descEn:
      "Charoenkrung boutique stay featuring an intimate rooftop cocktail lounge overlooking the Chao Phraya River.",
    nightlyPriceThb: 3800,
    rating: "4.8",
    baseLikes: 82,
  },
  {
    id: "partner-khaoyai-poolvilla",
    hotelNameTh: "คีรีมาลา พูลวิลล่า เขาใหญ่",
    hotelNameEn: "Kirimala Pool Villa Khao Yai",
    provinceId: "nakhon-ratchasima",
    provinceLabelTh: "นครราชสีมา (เขาใหญ่)",
    provinceLabelEn: "Khao Yai",
    styles: ["mountain", "pool-villa", "bars"],
    mediaKind: "video",
    aspectClass: "aspect-[3/4]",
    imageUrl:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
    ],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-luxury-swimming-pool-at-sunset-41573-large.mp4",
    videoDuration: "0:19",
    titleTh: "พูลวิลล่าโมเดิร์นท่ามกลางทิวเขาใหญ่ พร้อมมินิบาร์ไวน์ส่วนตัว",
    titleEn: "Modern Mountain-View Pool Villa in Khao Yai with Wine Bar",
    descTh:
      "พูลวิลล่าเหมาหลัง 3 ห้องนอน โอบล้อมด้วยวิวอุทยานแห่งชาติเขาใหญ่ สระระบบเกลืออุ่นได้ตลอดปีพร้อมเคาน์เตอร์บาร์ริมสระ",
    descEn:
      "3-bedroom heated saltwater pool villa framed by Khao Yai mountain ridges.",
    nightlyPriceThb: 7500,
    rating: "4.9",
    baseLikes: 115,
  },
  {
    id: "partner-krabi-beach",
    hotelNameTh: "อ่าวนาง ลากูน่า รีสอร์ท",
    hotelNameEn: "Ao Nang Laguna Hideaway",
    provinceId: "krabi",
    provinceLabelTh: "กระบี่",
    provinceLabelEn: "Krabi",
    styles: ["sea", "bathtub"],
    mediaKind: "photo",
    aspectClass: "aspect-[3/4]",
    imageUrl:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85",
    ],
    titleTh: "บังกะโลริมหาดน้ำใสสีมรกต จ.กระบี่ เดินลงทะเลได้จากหน้าห้อง",
    titleEn: "Emerald Beachfront Bungalow Steps from the Sea in Krabi",
    descTh:
      "พักผ่อนเงียบสงบหน้าภูเขาหินปูนอันเป็นเอกลักษณ์ของกระบี่ พายคายัคยามเช้าและชมพระอาทิตย์ตกริมชายหาดส่วนตัว",
    descEn:
      "Tranquil beachfront hideaway facing Krabi's iconic limestone karsts.",
    nightlyPriceThb: 4200,
    rating: "4.9",
    baseLikes: 109,
  },
  {
    id: "partner-trat-kohkood-vid",
    hotelNameTh: "โซเนวา โคสต์ เกาะกูด วิลล่า",
    hotelNameEn: "Koh Kood Turquoise Cove",
    provinceId: "trat",
    provinceLabelTh: "ตราด (เกาะช้าง/เกาะกูด)",
    provinceLabelEn: "Koh Kood, Trat",
    styles: ["sea", "pool-villa", "bars"],
    mediaKind: "video",
    aspectClass: "aspect-[2/3]",
    imageUrl:
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=85",
    ],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4",
    videoDuration: "0:27",
    titleTh: "วิลล่าไม้ยื่นกลางน้ำทะเลสีเทอร์ควอยซ์ เกาะกูด จ.ตราด",
    titleEn: "Overwater Wooden Villa & Sunset Beach Bar on Koh Kood",
    descTh:
      "น้ำทะเลใสเห็นพื้นทรายขาวละเอียด พร้อม Sunset Beach Bar ริมสะพานไม้ส่วนตัวและกิจกรรมดำน้ำตื้นหน้าวิลล่า",
    descEn:
      "Crystal-clear turquoise lagoon villa on Koh Kood with private pier and sunset beach bar.",
    nightlyPriceThb: 5900,
    rating: "5.0",
    baseLikes: 164,
  },
  {
    id: "partner-huahin-courtyard",
    hotelNameTh: "เวลา การ์เด้น พูลวิลล่า หัวหิน",
    hotelNameEn: "Vela Courtyard Pool Villa Hua Hin",
    provinceId: "prachuap-khiri-khan",
    provinceLabelTh: "ประจวบคีรีขันธ์ (หัวหิน)",
    provinceLabelEn: "Hua Hin",
    styles: ["sea", "pool-villa"],
    mediaKind: "photo",
    aspectClass: "aspect-[1/1]",
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    ],
    titleTh: "พูลวิลล่ามินิมอลสีขาวใกล้ชายหาดหัวหิน เพียง 2.5 ชม. จากกรุงเทพฯ",
    titleEn: "Minimalist White Courtyard Pool Villa Near Hua Hin Beach",
    descTh:
      "ดีไซน์โปร่งโล่งรับแสงธรรมชาติรอบสระน้ำส่วนตัว เหมาะทั้งคู่รักและแก๊งเพื่อน พร้อมมุมปิ้งย่างบาร์บีคิวริมสระ",
    descEn:
      "Sunlit minimalist courtyard pool villa minutes from Hua Hin beach.",
    nightlyPriceThb: 4800,
    rating: "4.8",
    baseLikes: 76,
  },
  {
    id: "partner-kanchanaburi-raft",
    hotelNameTh: "ริเวอร์แคว โฟลทติ้ง ออนเซ็น",
    hotelNameEn: "River Kwai Floating Onsen Villa",
    provinceId: "kanchanaburi",
    provinceLabelTh: "กาญจนบุรี",
    provinceLabelEn: "Kanchanaburi",
    styles: ["mountain", "bathtub"],
    mediaKind: "photo",
    aspectClass: "aspect-[5/6]",
    imageUrl:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1000&q=85",
    galleryUrls: [
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
    ],
    titleTh: "แพพักหรูริมแม่น้ำแควน้อย พร้อมอ่างแช่น้ำแร่ชมสายหมอกเหนือน้ำ",
    titleEn: "Luxury River Kwai Raft Villa with Private Riverfront Soaking Tub",
    descTh:
      "นอนฟังเสียงน้ำไหลท่ามกลางขุนเขาไทรโยค จ.กาญจนบุรี แช่อ่างน้ำอุ่นริมระเบียงแพส่วนตัวสุดเงียบสงบ",
    descEn:
      "Floating luxury raft suite in Sai Yok, Kanchanaburi with private riverfront tub.",
    nightlyPriceThb: 3900,
    rating: "4.9",
    baseLikes: 88,
  },
];
