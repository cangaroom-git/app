import type { PlaceCategoryDto } from "@/types/cangaroom";

export interface PlaceCategoryMeta {
  id: PlaceCategoryDto;
  labelTh: string;
  labelEn: string;
  shortLabelTh: string;
  shortLabelEn: string;
  /** Solid matte Crest & Map Pin color token (strictly scoped to Category Crest & Map Pin only) */
  crestBgHex: string;
  schemaOrgType: string;
  defaultCtaTh: string;
  defaultCtaEn: string;
}

export const PLACE_CATEGORIES: readonly PlaceCategoryMeta[] = [
  {
    id: "STAY",
    labelTh: "ที่พัก & โรงแรม",
    labelEn: "Stays & Hotels",
    shortLabelTh: "ที่พัก",
    shortLabelEn: "Stay",
    crestBgHex: "#5369A6",
    schemaOrgType: "LodgingBusiness",
    defaultCtaTh: "จองตรง 0% GP",
    defaultCtaEn: "Book Direct 0% GP",
  },
  {
    id: "CAFE",
    labelTh: "คาเฟ่",
    labelEn: "Cafes",
    shortLabelTh: "คาเฟ่",
    shortLabelEn: "Cafe",
    crestBgHex: "#D47E35",
    schemaOrgType: "CafeOrCoffeeShop",
    defaultCtaTh: "ดูข้อมูลร้าน",
    defaultCtaEn: "Visit Cafe",
  },
  {
    id: "RESTAURANT",
    labelTh: "ร้านอาหาร",
    labelEn: "Restaurants",
    shortLabelTh: "ร้านอาหาร",
    shortLabelEn: "Dining",
    crestBgHex: "#C6566E",
    schemaOrgType: "Restaurant",
    defaultCtaTh: "ดูเมนู & จองโต๊ะ",
    defaultCtaEn: "Menu & Reserve",
  },
  {
    id: "ATTRACTION",
    labelTh: "สถานที่เที่ยว",
    labelEn: "Attractions",
    shortLabelTh: "ที่เที่ยว",
    shortLabelEn: "Attraction",
    crestBgHex: "#529D48",
    schemaOrgType: "TouristAttraction",
    defaultCtaTh: "ดูเส้นทาง",
    defaultCtaEn: "Directions",
  },
  {
    id: "WELLNESS",
    labelTh: "สปา & ออนเซ็น",
    labelEn: "Wellness & Spa",
    shortLabelTh: "สปา",
    shortLabelEn: "Wellness",
    crestBgHex: "#3A8D9A",
    schemaOrgType: "HealthAndBeautyBusiness",
    defaultCtaTh: "จองทรีตเมนต์",
    defaultCtaEn: "Book Session",
  },
] as const;

const PLACE_CATEGORY_MAP = new Map<PlaceCategoryDto, PlaceCategoryMeta>(
  PLACE_CATEGORIES.map((c) => [c.id, c])
);

export function getPlaceCategoryMeta(
  category?: PlaceCategoryDto | string | null
): PlaceCategoryMeta {
  if (category && PLACE_CATEGORY_MAP.has(category as PlaceCategoryDto)) {
    return PLACE_CATEGORY_MAP.get(category as PlaceCategoryDto)!;
  }
  return PLACE_CATEGORIES[0];
}

export function isValidPlaceCategory(
  value: unknown
): value is PlaceCategoryDto {
  return (
    typeof value === "string" &&
    PLACE_CATEGORY_MAP.has(value as PlaceCategoryDto)
  );
}

/**
 * Minimal Game-Card Like Power formatting:
 * - 0 -> null (hide "0"; render heart icon only)
 * - 1..999 -> "143"
 * - 1,000..999,999 -> "5.2K" (strips trailing ".0" -> "1K")
 * - >= 1,000,000 -> "1.2M" (strips trailing ".0" -> "2M")
 */
export function formatCompactLikeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count < 1000) return String(Math.floor(count));
  if (count < 1_000_000) {
    const val = (count / 1000).toFixed(count >= 100_000 ? 0 : 1);
    return `${val.replace(/\.0$/, "")}K`;
  }
  const val = (count / 1_000_000).toFixed(count >= 100_000_000 ? 0 : 1);
  return `${val.replace(/\.0$/, "")}M`;
}

/** Haversine great-circle distance in kilometers */
export function computeHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceKmLabel(
  km: number | null | undefined,
  lang: "th" | "en" = "th"
): string | null {
  if (typeof km !== "number" || !Number.isFinite(km) || km < 0) return null;
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return lang === "th" ? `${meters} ม.` : `${meters} m`;
  }
  const rounded = km < 10 ? km.toFixed(1).replace(/\.0$/, "") : String(Math.round(km));
  return lang === "th" ? `${rounded} กม.` : `${rounded} km`;
}

/** Strict HTTPS URL validator for merchant outbound links (anti-phishing / anti-XSS) */
export function sanitizeOutboundHttpsUrl(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  try {
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}
