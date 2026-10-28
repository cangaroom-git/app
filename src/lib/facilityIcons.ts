import {
  Bath,
  BedDouble,
  Car,
  Coffee,
  Flame,
  LucideIcon,
  Mountain,
  Sparkles,
  Tv,
  Utensils,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";

export interface FacilityIconMeta {
  Icon: LucideIcon;
  toneClass: string;
}

const FACILITY_KEYWORD_RULES: ReadonlyArray<{
  keywords: readonly string[];
  Icon: LucideIcon;
}> = [
  {
    keywords: ["สระ", "pool", "jacuzzi", "จากุซซี่"],
    Icon: Waves,
  },
  {
    keywords: ["อ่าง", "bath", "น้ำอุ่น", "ห้องน้ำ"],
    Icon: Bath,
  },
  {
    keywords: ["วิว", "ภูเขา", "หมอก", "ระเบียง", "ดาดฟ้า", "view", "terrace"],
    Icon: Mountain,
  },
  {
    keywords: ["เตียง", "ที่นอน", "หมอน", "bed", "king"],
    Icon: BedDouble,
  },
  {
    keywords: ["กาแฟ", "ดริป", "ชา", "กาน้ำร้อน", "มินิบาร์", "coffee", "tea"],
    Icon: Coffee,
  },
  {
    keywords: ["อาหาร", "หมูกระทะ", "ดินเนอร์", "โต๊ะ", "breakfast", "dining"],
    Icon: Utensils,
  },
  {
    keywords: ["wi-fi", "wifi", "อินเทอร์เน็ต", "เน็ต"],
    Icon: Wifi,
  },
  {
    keywords: ["แอร์", "ปรับอากาศ", "ไดร์", "พัดลม", "air"],
    Icon: Wind,
  },
  {
    keywords: ["ทีวี", "ลำโพง", "marshall", "netflix", "tv"],
    Icon: Tv,
  },
  {
    keywords: ["จอดรถ", "รถ", "parking"],
    Icon: Car,
  },
  {
    keywords: ["ปิ้งย่าง", "เตา", "bbq"],
    Icon: Flame,
  },
];

export function getFacilityIconMeta(facilityLabel: string): FacilityIconMeta {
  const normalizedLabel = facilityLabel.toLowerCase();
  const toneClass = "bg-[var(--color-neutral)] text-[var(--color-text-primary)]";

  const matchedRule = FACILITY_KEYWORD_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedLabel.includes(keyword))
  );

  return {
    Icon: matchedRule?.Icon ?? Sparkles,
    toneClass,
  };
}
