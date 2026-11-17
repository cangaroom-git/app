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

export interface StayStyleTabOption {
  id: "all" | StayStyleTag;
  labelTh: string;
  labelEn: string;
}

export const STAY_STYLE_TABS: ReadonlyArray<StayStyleTabOption> = [
  { id: "all", labelTh: "ทั้งหมด", labelEn: "All Stays" },
  { id: "mountain", labelTh: "ภูเขา & ทะเลหมอก", labelEn: "Mountain & Mist" },
  { id: "pool-villa", labelTh: "พูลวิลล่า", labelEn: "Pool Villas" },
  { id: "sea", labelTh: "ติดทะเล & ชายหาด", labelEn: "Sea & Beachfront" },
  { id: "bars", labelTh: "บาร์ & รูฟท็อป", labelEn: "Bars & Rooftop" },
  { id: "bathtub", labelTh: "อ่างแช่น้ำ & ออนเซ็น", labelEn: "Onsen & Bathtub" },
  { id: "glamping", labelTh: "แกลมปิ้ง & เคบิน", labelEn: "Glamping & Cabin" },
];

export const VALID_STYLE_TAGS: ReadonlySet<string> = new Set(
  STAY_STYLE_TABS.filter((t) => t.id !== "all").map((t) => t.id)
);

const PROVINCE_BY_ID_MAP = new Map<string, ThailandProvince>(
  THAILAND_77_PROVINCES.map((p) => [p.id, p])
);

export function getProvinceById(id?: string | null): ThailandProvince | null {
  if (!id) return null;
  return PROVINCE_BY_ID_MAP.get(id) ?? null;
}

export function formatProvinceLabel(
  provinceId: string,
  language: "th" | "en"
): string {
  const found = getProvinceById(provinceId);
  if (!found) return provinceId;
  return language === "th"
    ? found.nameTh.split("(")[0].trim()
    : found.nameEn;
}

