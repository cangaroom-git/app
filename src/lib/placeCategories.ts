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
    labelTh: "ร้านอาหาร & บาร์",
    labelEn: "Dining & Bars",
    shortLabelTh: "อาหาร & บาร์",
    shortLabelEn: "Dining & Bars",
    crestBgHex: "#C6566E",
    schemaOrgType: "Restaurant",
    defaultCtaTh: "ดูเมนู & โปรโมชั่น",
    defaultCtaEn: "Menu & Deals",
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

export type HomePromoTabId =
  | "all"
  | "stay"
  | "cafe"
  | "restaurant"
  | "bar"
  | "wellness"
  | "attraction";

export interface HomePromoTabConfig {
  id: HomePromoTabId;
  labelTh: string;
  labelEn: string;
  sectionTitleTh: string;
  sectionTitleEn: string;
  seeAllHref: string;
  /** Core launch focus tabs stay visible even when sparse */
  isCoreLaunchTab: boolean;
}

export const HOME_PROMO_TABS: readonly HomePromoTabConfig[] = [
  {
    id: "all",
    labelTh: "ทั้งหมด",
    labelEn: "All Deals",
    sectionTitleTh: "โปรเที่ยวไทยทั้งหมด",
    sectionTitleEn: "All Thailand travel deals",
    seeAllHref: "/style/curated",
    isCoreLaunchTab: true,
  },
  {
    id: "stay",
    labelTh: "ที่พัก",
    labelEn: "Stays",
    sectionTitleTh: "โปรที่พัก & โรงแรม",
    sectionTitleEn: "Stay & hotel promotions",
    seeAllHref: "/style/stay",
    isCoreLaunchTab: true,
  },
  {
    id: "cafe",
    labelTh: "คาเฟ่",
    labelEn: "Cafes",
    sectionTitleTh: "โปรคาเฟ่ยอดฮิต",
    sectionTitleEn: "Popular cafe promotions",
    seeAllHref: "/style/cafe",
    isCoreLaunchTab: true,
  },
  {
    id: "restaurant",
    labelTh: "ร้านอาหาร",
    labelEn: "Restaurants",
    sectionTitleTh: "โปรร้านอาหาร & บุฟเฟ่ต์",
    sectionTitleEn: "Restaurant & buffet deals",
    seeAllHref: "/style/dining-bar",
    isCoreLaunchTab: true,
  },
  {
    id: "bar",
    labelTh: "บาร์",
    labelEn: "Bars",
    sectionTitleTh: "โปรบาร์ รูฟท็อป & บีชคลับ",
    sectionTitleEn: "Bars, rooftops & beach clubs",
    seeAllHref: "/style/dining-bar",
    isCoreLaunchTab: true,
  },
  {
    id: "wellness",
    labelTh: "สปา",
    labelEn: "Spa",
    sectionTitleTh: "โปรสปา ออนเซ็น & เวลเนส",
    sectionTitleEn: "Spa, onsen & wellness deals",
    seeAllHref: "/style/wellness",
    isCoreLaunchTab: true,
  },
  {
    id: "attraction",
    labelTh: "กิจกรรม",
    labelEn: "Activities",
    sectionTitleTh: "โปรกิจกรรม & ที่เที่ยว",
    sectionTitleEn: "Activities & attractions",
    seeAllHref: "/style/attraction",
    isCoreLaunchTab: true,
  },
] as const;

export const VALID_HOME_PROMO_TAB_IDS: ReadonlySet<string> = new Set(
  HOME_PROMO_TABS.map((t) => t.id)
);

const BAR_KEYWORD_PATTERN =
  /(?:บาร์|รูฟท็อป|บีชคลับ|ค็อกเทล|ไวน์|ผับ|เลานจ์|\bbar\b|\brooftop\b|\bbeach\s*club\b|\bcocktail\b|\blounge\b|\bpub\b|\bizakaya\b)/i;

function isBarPromoPin(pin: {
  promoCategoryCode?: string | null;
  stayStyles?: string[];
  hotelNameTh?: string;
  hotelNameEn?: string;
  titleTh?: string;
  titleEn?: string;
  promoHeadlineTh?: string | null;
}): boolean {
  const override = (pin.promoCategoryCode || "").trim().toUpperCase();
  if (override === "BAR") return true;
  if (
    pin.stayStyles?.some(
      (s) => s === "bars" || s === "bar" || s === "rooftop" || s === "beach-club"
    )
  ) {
    return true;
  }
  const haystack = `${pin.hotelNameTh || ""} ${pin.hotelNameEn || ""} ${pin.titleTh || ""} ${pin.titleEn || ""} ${pin.promoHeadlineTh || ""}`;
  return BAR_KEYWORD_PATTERN.test(haystack);
}

export function resolveEffectivePromoCategory(pin: {
  placeCategory: PlaceCategoryDto;
  promoCategoryCode?: string | null;
  stayStyles?: string[];
  hotelNameTh?: string;
  hotelNameEn?: string;
  titleTh?: string;
  titleEn?: string;
  promoHeadlineTh?: string | null;
}): Exclude<HomePromoTabId, "all"> {
  const override = (pin.promoCategoryCode || "").trim().toUpperCase();
  if (override === "STAY") return "stay";
  if (override === "CAFE") return "cafe";
  if (override === "BAR") return "bar";
  if (override === "RESTAURANT" || override === "DINING-BAR") {
    return isBarPromoPin(pin) ? "bar" : "restaurant";
  }
  if (override === "WELLNESS") return "wellness";
  if (override === "ATTRACTION") return "attraction";

  if (pin.placeCategory === "CAFE") return "cafe";
  if (pin.placeCategory === "RESTAURANT") {
    return isBarPromoPin(pin) ? "bar" : "restaurant";
  }
  if (pin.placeCategory === "WELLNESS") return "wellness";
  if (pin.placeCategory === "ATTRACTION") return "attraction";
  return isBarPromoPin(pin) ? "bar" : "stay";
}

export function matchesHomePromoTab(
  pin: {
    placeCategory: PlaceCategoryDto;
    promoCategoryCode?: string | null;
    stayStyles?: string[];
    hotelNameTh?: string;
    hotelNameEn?: string;
    titleTh?: string;
    titleEn?: string;
    promoHeadlineTh?: string | null;
  },
  tabId: HomePromoTabId | "dining-bar"
): boolean {
  if (tabId === "all") return true;
  const resolved = resolveEffectivePromoCategory(pin);
  if (tabId === "dining-bar") {
    return resolved === "restaurant" || resolved === "bar";
  }
  if (tabId === "bar") {
    return resolved === "bar" || isBarPromoPin(pin);
  }
  return resolved === tabId;
}

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

const EN_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatShortDayMonth(d: Date, lang: "th" | "en", includeYear = false): string {
  const day = d.getDate();
  const monthIdx = d.getMonth();
  if (lang === "th") {
    const base = `${day} ${THAI_SHORT_MONTHS[monthIdx]}`;
    if (!includeYear) return base;
    const beShort = String((d.getFullYear() + 543) % 100).padStart(2, "0");
    return `${base} ${beShort}`;
  }
  const base = `${EN_SHORT_MONTHS[monthIdx]} ${day}`;
  return includeYear ? `${base}, ${d.getFullYear()}` : base;
}

export interface PromoDateBadgeInfo {
  label: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

/**
 * Formats a concise, readable promotion validity window for 1:1 cards & promo detail blocks.
 * Examples:
 * - "ใกล้หมดเขต · เหลือ 2 วัน" (when <= 3 days left)
 * - "23 ต.ค. – 26 ต.ค." (when start & end window is tight)
 * - "ถึง 30 พ.ย." / "Until Nov 30" (when active ongoing promo)
 * - "หมดอายุ" / "Expired" (if past expiresAt)
 */
export function formatPromoDateRangeLabel(
  startsAtIso?: string | null,
  expiresAtIso?: string | null,
  lang: "th" | "en" = "th"
): PromoDateBadgeInfo | null {
  if (!expiresAtIso) return null;
  const endDate = new Date(expiresAtIso);
  const endMs = endDate.getTime();
  if (!Number.isFinite(endMs)) return null;

  const now = new Date();
  const nowMs = now.getTime();
  const diffMs = endMs - nowMs;

  if (diffMs <= 0) {
    return {
      label: lang === "th" ? "หมดอายุ" : "Expired",
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  const daysLeft = Math.ceil(diffMs / 86_400_000);
  const endYearDiffers = endDate.getFullYear() !== now.getFullYear();

  if (daysLeft <= 3) {
    const endShort = formatShortDayMonth(endDate, lang, endYearDiffers);
    return {
      label:
        lang === "th"
          ? daysLeft === 1
            ? `วันสุดท้าย · ${endShort}`
            : `เหลือ ${daysLeft} วัน · ถึง ${endShort}`
          : daysLeft === 1
          ? `Last day · ${endShort}`
          : `${daysLeft}d left · Until ${endShort}`,
      isExpired: false,
      isExpiringSoon: true,
    };
  }

  if (startsAtIso) {
    const startDate = new Date(startsAtIso);
    const startMs = startDate.getTime();
    if (Number.isFinite(startMs)) {
      const spanDays = Math.ceil((endMs - startMs) / 86_400_000);
      // Show explicit start–end range for scheduled/short campaigns (<= 90 days) or upcoming promos
      if (startMs > nowMs || (spanDays > 0 && spanDays <= 90)) {
        const showYear =
          startDate.getFullYear() !== now.getFullYear() || endYearDiffers;
        const startStr = formatShortDayMonth(startDate, lang, showYear);
        const endStr = formatShortDayMonth(endDate, lang, showYear);
        return {
          label: `${startStr} – ${endStr}`,
          isExpired: false,
          isExpiringSoon: false,
        };
      }
    }
  }

  const endLabel = formatShortDayMonth(endDate, lang, endYearDiffers);
  return {
    label: lang === "th" ? `ถึง ${endLabel}` : `Until ${endLabel}`,
    isExpired: false,
    isExpiringSoon: false,
  };
}

/** Build a free Google Maps "Find nearest branch" search URL for MULTI_BRANCH chains */
export function buildGoogleMapsNearMeUrl(brandName: string): string {
  const clean = brandName.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${clean} near me`
  )}`;
}

/** Resolve concise location / scope label for cards & headers */
export function formatPlaceLocationScopeLabel(
  params: {
    locationScope?: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE" | null;
    branchSummaryTh?: string | null;
    branchSummaryEn?: string | null;
    provinceId?: string | null;
    provinceNameTh: string;
    provinceNameEn: string;
  },
  lang: "th" | "en" = "th"
): string {
  const scope = params.locationScope ?? "SINGLE_LOCATION";
  if (scope === "NATIONWIDE_ONLINE" || params.provinceId === "nationwide") {
    return lang === "th" ? "ทั่วประเทศ · ออนไลน์" : "Nationwide · Online";
  }
  if (scope === "MULTI_BRANCH") {
    const custom =
      lang === "th"
        ? params.branchSummaryTh?.trim()
        : params.branchSummaryEn?.trim() || params.branchSummaryTh?.trim();
    if (custom) return custom;
    return lang === "th" ? "หลายสาขาทั่วไทย" : "Multiple branches";
  }
  return lang === "th" ? params.provinceNameTh : params.provinceNameEn;
}
