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

/**
 * Geographic neighbor adjacency map across Thailand's 77 provinces
 * so "ที่พักจังหวัดรอบ{จังหวัด}" reflects true neighboring provinces!
 */
export const THAILAND_NEIGHBOR_PROVINCES: Readonly<Record<string, readonly string[]>> = {
  // North
  "chiang-mai": ["chiang-rai", "mae-hong-son", "lamphun", "lampang", "tak"],
  "chiang-rai": ["chiang-mai", "phayao", "lampang"],
  "nan": ["phayao", "phrae", "uttaradit"],
  "mae-hong-son": ["chiang-mai", "tak"],
  "phrae": ["nan", "phayao", "lampang", "sukhothai", "uttaradit"],
  "phayao": ["chiang-rai", "nan", "phrae", "lampang"],
  "lampang": ["chiang-mai", "chiang-rai", "phayao", "phrae", "lamphun", "tak", "sukhothai"],
  "lamphun": ["chiang-mai", "lampang", "tak"],
  "uttaradit": ["nan", "phrae", "sukhothai", "phitsanulok"],

  // Central
  "bangkok": ["nonthaburi", "pathum-thani", "samut-prakan", "samut-sakhon", "nakhon-pathom", "chachoengsao"],
  "phetchabun": ["loei", "khon-kaen", "chaiyaphum", "lop-buri", "nakhon-sawan", "phichit", "phitsanulok"],
  "phra-nakhon-si-ayutthaya": ["ang-thong", "lop-buri", "saraburi", "pathum-thani", "nonthaburi", "nakhon-pathom", "suphan-buri"],
  "nakhon-nayok": ["saraburi", "nakhon-ratchasima", "prachin-buri", "chachoengsao", "pathum-thani"],
  "saraburi": ["lop-buri", "nakhon-ratchasima", "nakhon-nayok", "pathum-thani", "phra-nakhon-si-ayutthaya"],
  "nonthaburi": ["bangkok", "pathum-thani", "phra-nakhon-si-ayutthaya", "nakhon-pathom"],
  "pathum-thani": ["bangkok", "nonthaburi", "phra-nakhon-si-ayutthaya", "saraburi", "nakhon-nayok", "chachoengsao"],
  "samut-prakan": ["bangkok", "chachoengsao", "samut-sakhon"],
  "samut-sakhon": ["bangkok", "nakhon-pathom", "ratchaburi", "samut-songkhram", "samut-prakan"],
  "samut-songkhram": ["samut-sakhon", "ratchaburi", "phetchaburi"],
  "nakhon-pathom": ["bangkok", "nonthaburi", "phra-nakhon-si-ayutthaya", "suphan-buri", "kanchanaburi", "ratchaburi", "samut-sakhon"],
  "suphan-buri": ["uthai-thani", "chai-nat", "sing-buri", "ang-thong", "phra-nakhon-si-ayutthaya", "nakhon-pathom", "kanchanaburi"],
  "ang-thong": ["sing-buri", "lop-buri", "phra-nakhon-si-ayutthaya", "suphan-buri"],
  "sing-buri": ["nakhon-sawan", "lop-buri", "ang-thong", "suphan-buri", "chai-nat"],
  "lop-buri": ["phetchabun", "chaiyaphum", "nakhon-ratchasima", "saraburi", "phra-nakhon-si-ayutthaya", "ang-thong", "sing-buri", "nakhon-sawan"],
  "chai-nat": ["nakhon-sawan", "sing-buri", "suphan-buri", "uthai-thani"],
  "uthai-thani": ["nakhon-sawan", "chai-nat", "suphan-buri", "kanchanaburi", "tak"],
  "nakhon-sawan": ["kamphaeng-phet", "phichit", "phetchabun", "lop-buri", "sing-buri", "chai-nat", "uthai-thani", "tak"],
  "phichit": ["phitsanulok", "phetchabun", "nakhon-sawan", "kamphaeng-phet"],
  "phitsanulok": ["uttaradit", "loei", "phetchabun", "phichit", "kamphaeng-phet", "sukhothai"],
  "sukhothai": ["phrae", "uttaradit", "phitsanulok", "kamphaeng-phet", "tak", "lampang"],
  "kamphaeng-phet": ["sukhothai", "phitsanulok", "phichit", "nakhon-sawan", "tak"],

  // East
  "chon-buri": ["chachoengsao", "chanthaburi", "rayong"],
  "rayong": ["chon-buri", "chanthaburi"],
  "trat": ["chanthaburi"],
  "chanthaburi": ["chachoengsao", "sa-kaeo", "trat", "rayong", "chon-buri"],
  "chachoengsao": ["bangkok", "pathum-thani", "nakhon-nayok", "prachin-buri", "sa-kaeo", "chanthaburi", "chon-buri", "samut-prakan"],
  "prachin-buri": ["nakhon-nayok", "nakhon-ratchasima", "sa-kaeo", "chachoengsao"],
  "sa-kaeo": ["nakhon-ratchasima", "buri-ram", "chanthaburi", "chachoengsao", "prachin-buri"],

  // West
  "prachuap-khiri-khan": ["phetchaburi", "chumphon"],
  "phetchaburi": ["ratchaburi", "samut-songkhram", "prachuap-khiri-khan"],
  "kanchanaburi": ["tak", "uthai-thani", "suphan-buri", "nakhon-pathom", "ratchaburi"],
  "ratchaburi": ["kanchanaburi", "nakhon-pathom", "samut-sakhon", "samut-songkhram", "phetchaburi"],
  "tak": ["mae-hong-son", "chiang-mai", "lamphun", "lampang", "sukhothai", "kamphaeng-phet", "nakhon-sawan", "uthai-thani", "kanchanaburi"],

  // Northeast
  "nakhon-ratchasima": ["chaiyaphum", "khon-kaen", "maha-sarakham", "buri-ram", "sa-kaeo", "prachin-buri", "nakhon-nayok", "saraburi", "lop-buri"],
  "loei": ["nong-khai", "udon-thani", "nong-bua-lam-phu", "khon-kaen", "phetchabun", "phitsanulok"],
  "khon-kaen": ["loei", "nong-bua-lam-phu", "udon-thani", "kalasin", "maha-sarakham", "buri-ram", "nakhon-ratchasima", "chaiyaphum", "phetchabun"],
  "udon-thani": ["nong-khai", "sakon-nakhon", "kalasin", "khon-kaen", "nong-bua-lam-phu", "loei"],
  "ubon-ratchathani": ["amnat-charoen", "yasothon", "si-sa-ket"],
  "buri-ram": ["khon-kaen", "maha-sarakham", "surin", "sa-kaeo", "nakhon-ratchasima"],
  "surin": ["maha-sarakham", "roi-et", "si-sa-ket", "buri-ram"],
  "si-sa-ket": ["yasothon", "ubon-ratchathani", "surin", "roi-et"],
  "chaiyaphum": ["phetchabun", "khon-kaen", "nakhon-ratchasima", "lop-buri"],
  "nong-khai": ["bueng-kan", "sakon-nakhon", "udon-thani", "loei"],
  "bueng-kan": ["nong-khai", "sakon-nakhon", "nakhon-phanom"],
  "nakhon-phanom": ["bueng-kan", "sakon-nakhon", "mukdahan"],
  "sakon-nakhon": ["nong-khai", "bueng-kan", "nakhon-phanom", "mukdahan", "kalasin", "udon-thani"],
  "mukdahan": ["nakhon-phanom", "sakon-nakhon", "kalasin", "roi-et", "yasothon", "amnat-charoen"],
  "kalasin": ["udon-thani", "sakon-nakhon", "mukdahan", "roi-et", "maha-sarakham", "khon-kaen"],
  "maha-sarakham": ["khon-kaen", "kalasin", "roi-et", "surin", "buri-ram", "nakhon-ratchasima"],
  "roi-et": ["kalasin", "mukdahan", "yasothon", "si-sa-ket", "surin", "maha-sarakham"],
  "yasothon": ["mukdahan", "amnat-charoen", "ubon-ratchathani", "si-sa-ket", "roi-et"],
  "amnat-charoen": ["mukdahan", "ubon-ratchathani", "yasothon"],
  "nong-bua-lam-phu": ["udon-thani", "khon-kaen", "loei"],

  // South
  "phuket": ["phang-nga", "krabi"],
  "krabi": ["phang-nga", "surat-thani", "nakhon-si-thammarat", "trang", "phuket"],
  "surat-thani": ["chumphon", "ranong", "phang-nga", "krabi", "nakhon-si-thammarat"],
  "phang-nga": ["ranong", "surat-thani", "krabi", "phuket"],
  "songkhla": ["nakhon-si-thammarat", "phatthalung", "satun", "pattani", "yala"],
  "trang": ["krabi", "nakhon-si-thammarat", "phatthalung", "satun"],
  "satun": ["trang", "phatthalung", "songkhla"],
  "chumphon": ["prachuap-khiri-khan", "ranong", "surat-thani"],
  "ranong": ["chumphon", "surat-thani", "phang-nga"],
  "nakhon-si-thammarat": ["surat-thani", "krabi", "trang", "phatthalung", "songkhla"],
  "phatthalung": ["nakhon-si-thammarat", "trang", "satun", "songkhla"],
  "pattani": ["songkhla", "yala", "narathiwat"],
  "yala": ["songkhla", "pattani", "narathiwat"],
  "narathiwat": ["pattani", "yala"],
};

export function getNeighborProvinceIds(provinceId?: string | null): string[] {
  if (!provinceId) return [];
  return [...(THAILAND_NEIGHBOR_PROVINCES[provinceId] ?? [])];
}

export function getRegionLabel(
  regionId: ThailandRegionId | null | undefined,
  lang: "th" | "en" = "th"
): string {
  if (!regionId) return lang === "th" ? "ทั่วประเทศ" : "Thailand";
  const found = THAILAND_REGIONS.find((r) => r.id === regionId);
  if (!found) return lang === "th" ? "ทั่วประเทศ" : "Thailand";
  return lang === "th" ? found.labelTh : found.labelEn;
}

export type StyleCollectionSlug =
  | StayStyleTag
  | "direct"
  | "curated"
  | "recent";

export interface StyleCollectionMeta {
  slug: StyleCollectionSlug;
  labelTh: string;
  labelEn: string;
  taglineTh: string;
  taglineEn: string;
}

export const STYLE_COLLECTION_META: Readonly<
  Record<StyleCollectionSlug, StyleCollectionMeta>
> = {
  mountain: {
    slug: "mountain",
    labelTh: "ภูเขา & ทะเลหมอก",
    labelEn: "Mountain & Mist",
    taglineTh: "ตื่นรับลมเย็นและทะเลหมอกหน้าห้อง ท่ามกลางหุบเขาทั่วไทย",
    taglineEn: "Wake up to cool mountain air and misty valleys across Thailand.",
  },
  "pool-villa": {
    slug: "pool-villa",
    labelTh: "พูลวิลล่า",
    labelEn: "Pool Villas",
    taglineTh: "วิลล่าสระส่วนตัวทุกหลัง พักผ่อนเต็มที่กับครอบครัวและแก๊งเพื่อน",
    taglineEn: "Private pool villas for effortless getaways with family and friends.",
  },
  sea: {
    slug: "sea",
    labelTh: "ติดทะเล & ชายหาด",
    labelEn: "Sea & Beachfront",
    taglineTh: "เปิดประตูรับลมทะเล เดินลงหาดส่วนตัวพร้อมดีลพักสุดคุ้ม",
    taglineEn: "Step straight onto the sand with curated beachfront stay deals.",
  },
  bars: {
    slug: "bars",
    labelTh: "บาร์ & รูฟท็อป",
    labelEn: "Bars & Rooftop",
    taglineTh: "จิบดริงก์ชมวิวพระอาทิตย์ตกและบรรยากาศยามค่ำคืนสุดชิล",
    taglineEn: "Sunset drinks, skyline views, and stylish boutique escapes.",
  },
  bathtub: {
    slug: "bathtub",
    labelTh: "อ่างแช่น้ำ & ออนเซ็น",
    labelEn: "Onsen & Bathtub",
    taglineTh: "แช่อ่างน้ำอุ่นและออนเซ็นชมวิวธรรมชาติ ผ่อนคลายแบบเต็มวัน",
    taglineEn: "Soak in scenic outdoor tubs and private onsen retreats.",
  },
  glamping: {
    slug: "glamping",
    labelTh: "แกลมปิ้ง & เคบิน",
    labelEn: "Glamping & Cabin",
    taglineTh: "นอนเต็นท์โดมและเคบินไม้กลางธรรมชาติ สบายครบระดับรีสอร์ท",
    taglineEn: "Boutique domes and wooden cabins nestled close to nature.",
  },
  direct: {
    slug: "direct",
    labelTh: "โปรจองตรง 0% GP",
    labelEn: "Direct 0% GP Deals",
    taglineTh: "ดีลจองตรงกับที่พักยืนยันตัวตน ไม่มีค่าธรรมเนียมตัวกลาง",
    taglineEn: "Book directly with verified Thai stays at 0% commission.",
  },
  curated: {
    slug: "curated",
    labelTh: "รวมโปรเด็ดทั่วไทย",
    labelEn: "Curated Deals Across Thailand",
    taglineTh: "คัดรวมดีลพิเศษและคูปองที่พักน่าสนใจจากทุกแหล่งไว้ในที่เดียว",
    taglineEn: "Hand-picked hotel promotions and vouchers from every source.",
  },
  recent: {
    slug: "recent",
    labelTh: "ที่พักที่ดูล่าสุด",
    labelEn: "Recently Viewed Stays",
    taglineTh: "ย้อนดูคูปองและที่พักสวยที่คุณเพิ่งเปิดชมไว้ก่อนหน้านี้",
    taglineEn: "Pick up right where you left off on stays you recently explored.",
  },
};

export function getStyleCollectionMeta(
  slug: string
): StyleCollectionMeta | null {
  return (STYLE_COLLECTION_META as Record<string, StyleCollectionMeta>)[slug] ?? null;
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

