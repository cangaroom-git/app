import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import {
  formatProvinceLabel,
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import { isEasyWeekendDriveFromOrigin } from "@/lib/telemetry/geoHeaders";
import {
  loadMergedTasteContext,
  type MergedTasteContext,
} from "@/lib/services/recommendationEngine";
import type { CompactSessionTasteSignal } from "@/lib/telemetry/tasteTypes";
import { NONDII_CACHE_TAGS } from "@/lib/cache/revalidateNondii";
import {
  getPlaceCategoryMeta,
  HOME_PROMO_TABS,
  resolveEffectivePromoCategory,
  type HomePromoTabId,
} from "@/lib/placeCategories";
import type { PlaceCategoryDto } from "@/types/cangaroom";

export interface SmartSearchIdeaCard {
  id: string;
  query: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  imageUrl: string;
  badgeTh?: string;
  badgeEn?: string;
  kind: "for-you" | "trending";
}

export interface SmartSearchRecentPin {
  id: string;
  titleTh: string;
  titleEn: string;
  hotelNameTh: string;
  hotelNameEn: string;
  hotelSlug: string;
  provinceNameTh: string;
  provinceNameEn: string;
  priceFromThb: number | null;
  imageUrl: string;
  placeCategory?: PlaceCategoryDto;
}

export interface SmartSearchMatchedHotel {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  provinceId: string;
  provinceNameTh: string;
  provinceNameEn: string;
  districtTh: string;
  ratingAvg: number;
  reviewCount: number;
  priceFromThb: number | null;
  imageUrl: string;
  stayStyles: string[];
  couponSummaryTh: string | null;
  couponSummaryEn: string | null;
  placeCategory?: PlaceCategoryDto;
  categoryLabelTh?: string;
  categoryLabelEn?: string;
}

export interface SmartSearchCompletionItem {
  id: string;
  query: string;
  labelTh: string;
  labelEn: string;
  reasonTh: string;
  reasonEn: string;
  imageUrl?: string;
}

export interface SmartSearchDestinationItem {
  id: string;
  query: string;
  nameTh: string;
  nameEn: string;
  subtitleTh: string;
  subtitleEn: string;
  type: "province" | "style" | "tag" | "category";
  staysCount: number;
  imageUrl?: string;
}

export interface SmartSearchResponseDto {
  mode: "focus" | "query";
  query: string;
  hasPersonalSignal: boolean;
  detectedOriginProvinceId: string | null;
  targetBudgetThb: number | null;
  recentlyViewedPins: SmartSearchRecentPin[];
  forYouIdeas: SmartSearchIdeaCard[];
  trendingSearches: SmartSearchIdeaCard[];
  smartCompletions: SmartSearchCompletionItem[];
  matchedHotels: SmartSearchMatchedHotel[];
  matchedDestinations: SmartSearchDestinationItem[];
}

export interface GetSmartSearchParams {
  query?: string | null;
  recentOpenedPinIds?: string[];
  userId?: string | null;
  visitorId?: string | null;
  hasAnalyticsConsent?: boolean;
  sessionSignal?: CompactSessionTasteSignal | null;
  originProvinceId?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop" | null;
}

interface CachedCouponSignal {
  code: string;
  discountType: "PERCENT" | "FIXED_THB";
  discountValue: number;
  titleTh: string;
  titleEn: string;
  expiresAtIso: string;
}

interface HotelWithSignals {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  taglineEn: string;
  placeCategory: PlaceCategoryDto;
  provinceId: string;
  districtTh: string;
  stayStyles: string[];
  petsAllowed: boolean;
  ratingAvg: number;
  reviewCount: number;
  coverImageUrl: string | null;
  logoUrl: string | null;
  rooms: Array<{ weekdayPriceThb: number }>;
  coupons: CachedCouponSignal[];
  pins: Array<{
    id: string;
    titleTh: string;
    titleEn: string;
    coverImageUrl: string;
    promoHeadlineTh: string | null;
    promoCategoryCode: string | null;
    stayStyles: string[];
    semanticTags: string[];
    likesCount: number;
    savesCount: number;
    viewsCount: number;
  }>;
}

const STYLE_MAP = new Map(
  STAY_STYLE_TABS.filter((s) => s.id !== "all").map((s) => [s.id, s])
);

const PROMO_CATEGORY_TABS = HOME_PROMO_TABS.filter((t) => t.id !== "all");

type EffectiveCategoryTab = Exclude<HomePromoTabId, "all">;

const CATEGORY_SYNONYMS: Record<EffectiveCategoryTab, readonly string[]> = {
  stay: [
    "ที่พัก",
    "โรงแรม",
    "รีสอร์ท",
    "รีสอร์ต",
    "วิลล่า",
    "พูลวิลล่า",
    "โฮมสเตย์",
    "แกลมปิ้ง",
    "กางเต็นท์",
    "hotel",
    "resort",
    "stay",
    "villa",
    "glamping",
  ],
  cafe: [
    "คาเฟ่",
    "กาแฟ",
    "ร้านกาแฟ",
    "มัทฉะ",
    "ชาเขียว",
    "เบเกอรี่",
    "ขนม",
    "โกโก้",
    "cafe",
    "coffee",
    "bakery",
    "matcha",
  ],
  restaurant: [
    "ร้านอาหาร",
    "อาหาร",
    "ของกิน",
    "กิน",
    "บุฟเฟ่ต์",
    "ซีฟู้ด",
    "ปิ้งย่าง",
    "ชาบู",
    "ข้าวซอย",
    "restaurant",
    "dining",
    "food",
    "buffet",
    "seafood",
  ],
  bar: [
    "บาร์",
    "รูฟท็อป",
    "บีชคลับ",
    "ค็อกเทล",
    "ไวน์",
    "ผับ",
    "เลานจ์",
    "bar",
    "rooftop",
    "cocktail",
    "beach club",
    "lounge",
  ],
  wellness: [
    "สปา",
    "นวด",
    "ออนเซ็น",
    "เวลเนส",
    "แช่น้ำแร่",
    "spa",
    "onsen",
    "massage",
    "wellness",
  ],
  attraction: [
    "กิจกรรม",
    "ที่เที่ยว",
    "สถานที่เที่ยว",
    "ทัวร์",
    "ดำน้ำ",
    "พายเรือ",
    "attraction",
    "activity",
    "tour",
  ],
};

const LOCATION_NICKNAME_MAP: ReadonlyArray<{
  aliases: readonly string[];
  provinceId: string;
  expandedTerms: readonly string[];
}> = [
  {
    aliases: ["กทม", "bkk", "bangkok", "กรุงเทพ"],
    provinceId: "bangkok",
    expandedTerms: ["กรุงเทพมหานคร", "กรุงเทพ", "bangkok"],
  },
  {
    aliases: ["ชม", "cnx", "แม่ริม", "ม่อนแจ่ม", "แม่กำปอง", "นิมมาน"],
    provinceId: "chiang-mai",
    expandedTerms: ["เชียงใหม่", "chiang mai"],
  },
  {
    aliases: ["hkt", "ป่าตอง", "โอลด์ทาวน์", "ภูเก็ต"],
    provinceId: "phuket",
    expandedTerms: ["ภูเก็ต", "phuket"],
  },
  {
    aliases: ["หัวหิน", "huahin", "ปราณบุรี", "ชะอำ"],
    provinceId: "prachuap-khiri-khan",
    expandedTerms: ["ประจวบคีรีขันธ์", "หัวหิน", "hua hin"],
  },
  {
    aliases: ["เขาใหญ่", "khaoyai", "ปากช่อง", "โคราช"],
    provinceId: "nakhon-ratchasima",
    expandedTerms: ["นครราชสีมา", "เขาใหญ่", "khao yai"],
  },
  {
    aliases: ["สมุย", "เกาะสมุย", "samui", "พะงัน", "เกาะเต่า"],
    provinceId: "surat-thani",
    expandedTerms: ["สุราษฎร์ธานี", "สมุย", "samui"],
  },
  {
    aliases: ["พัทยา", "pattaya", "บางแสน", "เกาะล้าน", "ศรีราชา"],
    provinceId: "chon-buri",
    expandedTerms: ["ชลบุรี", "พัทยา", "pattaya"],
  },
  {
    aliases: ["ปัว", "บ่อเกลือ", "สะปัน", "สกาด", "น่าน"],
    provinceId: "nan",
    expandedTerms: ["น่าน", "nan"],
  },
  {
    aliases: ["ปาย", "pai", "บ้านรักไทย"],
    provinceId: "mae-hong-son",
    expandedTerms: ["แม่ฮ่องสอน", "ปาย", "pai"],
  },
  {
    aliases: ["เชียงคาน", "ภูกระดึง", "ภูเรือ"],
    provinceId: "loei",
    expandedTerms: ["เลย", "เชียงคาน"],
  },
  {
    aliases: ["เกาะช้าง", "เกาะกูด", "เกาะหมาก"],
    provinceId: "trat",
    expandedTerms: ["ตราด", "เกาะช้าง", "เกาะกูด"],
  },
  {
    aliases: ["กาญ", "สังขละ", "ไทรโยค", "แคว"],
    provinceId: "kanchanaburi",
    expandedTerms: ["กาญจนบุรี", "kanchanaburi"],
  },
  {
    aliases: ["อ่าวนาง", "พีพี", "ลันตา", "กระบี่"],
    provinceId: "krabi",
    expandedTerms: ["กระบี่", "krabi"],
  },
];

const PET_QUERY_PATTERN =
  /(?:สัตว์เลี้ยง|หมา|สุนัข|แมว|pet\s*friendly|\bpet\b|\bdog\b)/i;
const PROMO_QUERY_PATTERN =
  /(?:โปร|โปรโมชั่น|ส่วนลด|คูปอง|ลดราคา|ฟรี|ดีล|promo|deal|coupon|discount|free)/i;

interface ParsedSearchIntent {
  qNorm: string;
  terms: string[];
  matchedCategories: EffectiveCategoryTab[];
  matchedProvinceIds: Set<string>;
  expandedTerms: string[];
  wantsPetFriendly: boolean;
  wantsPromo: boolean;
}

function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const qNorm = rawQuery.trim().toLowerCase();
  const terms = qNorm.split(/\s+/).filter(Boolean);
  const matchedCategories: EffectiveCategoryTab[] = [];
  const matchedProvinceIds = new Set<string>();
  const expandedTermsSet = new Set<string>(terms);

  for (const [cat, synonyms] of Object.entries(CATEGORY_SYNONYMS) as Array<
    [EffectiveCategoryTab, readonly string[]]
  >) {
    if (
      synonyms.some(
        (syn) =>
          qNorm.includes(syn) ||
          (qNorm.length >= 2 && syn.startsWith(qNorm)) ||
          terms.some((t) => t.length >= 2 && (syn.includes(t) || t.includes(syn)))
      )
    ) {
      matchedCategories.push(cat);
    }
  }

  for (const loc of LOCATION_NICKNAME_MAP) {
    const hit = loc.aliases.some(
      (alias) =>
        qNorm.includes(alias) ||
        (qNorm.length >= 2 && alias.startsWith(qNorm)) ||
        terms.some((t) => t.length >= 2 && (alias === t || alias.includes(t)))
    );
    if (hit) {
      matchedProvinceIds.add(loc.provinceId);
      for (const exp of loc.expandedTerms) {
        expandedTermsSet.add(exp.toLowerCase());
      }
    }
  }

  return {
    qNorm,
    terms,
    matchedCategories,
    matchedProvinceIds,
    expandedTerms: Array.from(expandedTermsSet),
    wantsPetFriendly: PET_QUERY_PATTERN.test(qNorm),
    wantsPromo: PROMO_QUERY_PATTERN.test(qNorm),
  };
}

/**
 * Shared public place catalog cached across requests via `unstable_cache`
 * (Law 3 — zero user/session data inside shared cache; invalidated by revalidatePlaceCatalog).
 */
const getCachedSmartSearchCatalog = unstable_cache(
  async (): Promise<HotelWithSignals[]> => {
    const rawHotels = await prisma.hotel.findMany({
      where: {
        isPublished: true,
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        slug: true,
        nameTh: true,
        nameEn: true,
        taglineTh: true,
        taglineEn: true,
        placeCategory: true,
        provinceId: true,
        districtTh: true,
        stayStyles: true,
        petsAllowed: true,
        ratingAvg: true,
        reviewCount: true,
        coverImageUrl: true,
        logoUrl: true,
        rooms: {
          where: { isActive: true },
          orderBy: { weekdayPriceThb: "asc" },
          take: 1,
          select: { weekdayPriceThb: true },
        },
        coupons: {
          where: { isActive: true },
          orderBy: { discountValue: "desc" },
          take: 3,
          select: {
            code: true,
            discountType: true,
            discountValue: true,
            titleTh: true,
            titleEn: true,
            expiresAt: true,
          },
        },
        pins: {
          where: { publishStatus: "PUBLISHED" },
          orderBy: [
            { likesCount: "desc" },
            { savesCount: "desc" },
            { createdAt: "desc" },
          ],
          take: 6,
          select: {
            id: true,
            titleTh: true,
            titleEn: true,
            coverImageUrl: true,
            promoHeadlineTh: true,
            promoCategoryCode: true,
            stayStyles: true,
            semanticTags: true,
            likesCount: true,
            savesCount: true,
            viewsCount: true,
          },
        },
      },
    });

    return rawHotels.map((h) => ({
      id: h.id,
      slug: h.slug,
      nameTh: h.nameTh,
      nameEn: h.nameEn,
      taglineTh: h.taglineTh,
      taglineEn: h.taglineEn,
      placeCategory: h.placeCategory as PlaceCategoryDto,
      provinceId: h.provinceId,
      districtTh: h.districtTh,
      stayStyles: h.stayStyles,
      petsAllowed: h.petsAllowed,
      ratingAvg: h.ratingAvg,
      reviewCount: h.reviewCount,
      coverImageUrl: h.coverImageUrl,
      logoUrl: h.logoUrl,
      rooms: h.rooms,
      coupons: h.coupons.map((c) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        titleTh: c.titleTh,
        titleEn: c.titleEn,
        expiresAtIso: c.expiresAt.toISOString(),
      })),
      pins: h.pins,
    }));
  },
  ["smart-search-catalog-v2"],
  {
    revalidate: 300,
    tags: [
      NONDII_CACHE_TAGS.places,
      NONDII_CACHE_TAGS.placeList,
      NONDII_CACHE_TAGS.homeFeed,
    ],
  }
);

function reviveActiveCatalog(
  cached: HotelWithSignals[],
  nowMs: number
): HotelWithSignals[] {
  return cached.map((h) => ({
    ...h,
    coupons: h.coupons.filter((c) => {
      const exp = Date.parse(c.expiresAtIso);
      return Number.isFinite(exp) && exp > nowMs;
    }),
  }));
}

function getEffectiveCategory(hotel: HotelWithSignals): EffectiveCategoryTab {
  const leadPin = hotel.pins[0];
  return resolveEffectivePromoCategory({
    placeCategory: hotel.placeCategory,
    promoCategoryCode: leadPin?.promoCategoryCode,
    stayStyles: hotel.stayStyles,
    hotelNameTh: hotel.nameTh,
    hotelNameEn: hotel.nameEn,
    titleTh: leadPin?.titleTh,
    titleEn: leadPin?.titleEn,
    promoHeadlineTh: leadPin?.promoHeadlineTh,
  });
}

function getEffectiveCategoryLabels(cat: EffectiveCategoryTab): {
  th: string;
  en: string;
} {
  const tab = PROMO_CATEGORY_TABS.find((t) => t.id === cat);
  if (tab) return { th: tab.labelTh, en: tab.labelEn };
  const meta = getPlaceCategoryMeta(cat.toUpperCase());
  return { th: meta.shortLabelTh, en: meta.shortLabelEn };
}

function getStyleShortTh(styleId: string): string {
  const found = STYLE_MAP.get(styleId as never);
  if (!found) return styleId;
  return found.labelTh.split("&")[0].trim();
}

function getStyleShortEn(styleId: string): string {
  const found = STYLE_MAP.get(styleId as never);
  if (!found) return styleId;
  return found.labelEn;
}

function pickHotelCoverThumb(hotel: HotelWithSignals): string {
  const raw =
    hotel.pins[0]?.coverImageUrl || hotel.coverImageUrl || hotel.logoUrl || "";
  return raw ? getOptimizedPinImageUrl(raw, "thumb") : "";
}

function formatPlacePromoSummary(
  hotel: HotelWithSignals
): { th: string | null; en: string | null } {
  const top = hotel.coupons[0];
  if (top) {
    if (top.discountType === "PERCENT") {
      return {
        th: `ลด ${top.discountValue}%`,
        en: `${top.discountValue}% OFF`,
      };
    }
    return {
      th: `ลด ฿${top.discountValue.toLocaleString()}`,
      en: `Save ฿${top.discountValue.toLocaleString()}`,
    };
  }
  const headline = hotel.pins.find((p) => p.promoHeadlineTh?.trim())
    ?.promoHeadlineTh?.trim();
  if (headline) {
    const short =
      headline.length > 26 ? `${headline.slice(0, 25).trim()}…` : headline;
    return { th: short, en: short };
  }
  return { th: null, en: null };
}

function hasActivePromo(hotel: HotelWithSignals): boolean {
  return (
    hotel.coupons.length > 0 ||
    hotel.pins.some((p) => Boolean(p.promoHeadlineTh?.trim()))
  );
}

function scoreHotelForTaste(
  hotel: HotelWithSignals,
  taste: MergedTasteContext
): number {
  let score = hotel.ratingAvg * 4;
  const minPrice = hotel.rooms[0]?.weekdayPriceThb ?? null;

  for (const style of hotel.stayStyles) {
    score += (taste.styleWeights[style] ?? 0) * 14;
  }
  score += (taste.provinceWeights[hotel.provinceId] ?? 0) * 18;

  let engagementSum = 0;
  const seenTags = new Set<string>();
  for (const pin of hotel.pins) {
    engagementSum +=
      pin.viewsCount + pin.likesCount * 3 + pin.savesCount * 5;
    for (const tag of pin.semanticTags) {
      const norm = tag.replace(/^#/, "").toLowerCase();
      if (!seenTags.has(norm)) {
        seenTags.add(norm);
        score +=
          (taste.tagWeights[norm] ?? taste.tagWeights[tag.toLowerCase()] ?? 0) *
          10;
      }
    }
  }
  score += Math.min(25, Math.log10(1 + engagementSum) * 8);

  if (
    taste.originProvinceId &&
    isEasyWeekendDriveFromOrigin(taste.originProvinceId, hotel.provinceId)
  ) {
    score += 16;
  }

  if (taste.targetBudgetThb && minPrice) {
    const ratio =
      Math.abs(minPrice - taste.targetBudgetThb) /
      Math.max(1000, taste.targetBudgetThb);
    if (ratio <= 0.35) score += 18;
    else if (ratio > 0.65) score -= 8;
  }

  if (hotel.coupons.length > 0) score += 12;
  else if (hasActivePromo(hotel)) score += 7;

  return score;
}

function buildFocusRecommendations(
  hotels: HotelWithSignals[],
  taste: MergedTasteContext
): {
  forYouIdeas: SmartSearchIdeaCard[];
  trendingSearches: SmartSearchIdeaCard[];
} {
  const scoredHotels = [...hotels]
    .map((h) => ({ hotel: h, score: scoreHotelForTaste(h, taste) }))
    .sort((a, b) => b.score - a.score);

  const forYouIdeas: SmartSearchIdeaCard[] = [];
  const usedQueries = new Set<string>();

  const pushIdea = (
    target: SmartSearchIdeaCard[],
    card: SmartSearchIdeaCard
  ) => {
    const key = card.query.trim().toLowerCase();
    if (!key || !card.imageUrl || usedQueries.has(key)) return;
    usedQueries.add(key);
    target.push(card);
  };

  const topStyles = Object.entries(taste.styleWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const topProvinces = Object.entries(taste.provinceWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 1. Personal compound idea: top style + top province where verified places exist
  for (const st of topStyles.slice(0, 2)) {
    for (const provId of topProvinces.slice(0, 2)) {
      const match = scoredHotels.find(
        ({ hotel }) =>
          hotel.provinceId === provId && hotel.stayStyles.includes(st)
      );
      if (match) {
        const provTh = formatProvinceLabel(provId, "th");
        const provEn = formatProvinceLabel(provId, "en");
        const stTh = getStyleShortTh(st);
        const stEn = getStyleShortEn(st);
        pushIdea(forYouIdeas, {
          id: `fy-combo-${st}-${provId}`,
          query: `${stTh} ${provTh}`,
          titleTh: `${stTh} ${provTh}`,
          titleEn: `${stEn} in ${provEn}`,
          subtitleTh: "ตรงสไตล์ที่คุณดูบ่อย",
          subtitleEn: "Matches your favorite vibe",
          imageUrl: pickHotelCoverThumb(match.hotel),
          badgeTh: "สำหรับคุณ",
          badgeEn: "For you",
          kind: "for-you",
        });
      }
    }
  }

  // 2. Geo proximity idea: easy weekend drive from visitor's region
  if (taste.originProvinceId) {
    const nearbyMatch = scoredHotels.find(
      ({ hotel }) =>
        hotel.provinceId !== taste.originProvinceId &&
        isEasyWeekendDriveFromOrigin(taste.originProvinceId, hotel.provinceId)
    );
    if (nearbyMatch) {
      const provTh = formatProvinceLabel(nearbyMatch.hotel.provinceId, "th");
      const provEn = formatProvinceLabel(nearbyMatch.hotel.provinceId, "en");
      pushIdea(forYouIdeas, {
        id: `fy-nearby-${nearbyMatch.hotel.provinceId}`,
        query: provTh,
        titleTh: `เที่ยวใกล้คุณ · ${provTh}`,
        titleEn: `Weekend getaway · ${provEn}`,
        subtitleTh: "ขับรถถึงง่ายจากพื้นที่ของคุณ",
        subtitleEn: "Easy weekend getaway near you",
        imageUrl: pickHotelCoverThumb(nearbyMatch.hotel),
        badgeTh: "ใกล้คุณ",
        badgeEn: "Near you",
        kind: "for-you",
      });
    }
  }

  // 3. Active Promo / Deal match tailored to top taste score
  const promoPick = scoredHotels.find(({ hotel }) => hasActivePromo(hotel));
  if (promoPick) {
    const h = promoPick.hotel;
    const cat = getEffectiveCategory(h);
    const catLabels = getEffectiveCategoryLabels(cat);
    const provTh = formatProvinceLabel(h.provinceId, "th");
    const provEn = formatProvinceLabel(h.provinceId, "en");
    const promoSummary = formatPlacePromoSummary(h);
    pushIdea(forYouIdeas, {
      id: `fy-promo-${h.id}`,
      query: `${catLabels.th} ${provTh}`,
      titleTh: `โปร${catLabels.th} ${provTh}`,
      titleEn: `${catLabels.en} deals · ${provEn}`,
      subtitleTh: promoSummary.th
        ? `${promoSummary.th} · ${h.nameTh}`
        : `${h.nameTh} · มีโปรโมชั่น`,
      subtitleEn: promoSummary.en
        ? `${promoSummary.en} · ${h.nameEn || h.nameTh}`
        : `${h.nameEn || h.nameTh} · Deal live`,
      imageUrl: pickHotelCoverThumb(h),
      badgeTh: "โปรเด็ด",
      badgeEn: "Hot deal",
      kind: "for-you",
    });
  }

  // 4. Budget-aware idea if user shows price affinity
  if (taste.targetBudgetThb) {
    const budgetHotel = scoredHotels.find(({ hotel }) => {
      const p = hotel.rooms[0]?.weekdayPriceThb;
      return Boolean(p && p <= taste.targetBudgetThb! * 1.2);
    });
    if (budgetHotel) {
      const h = budgetHotel.hotel;
      const st = h.stayStyles[0];
      const provTh = formatProvinceLabel(h.provinceId, "th");
      const provEn = formatProvinceLabel(h.provinceId, "en");
      const titleTh = st ? `${getStyleShortTh(st)} ${provTh}` : provTh;
      const titleEn = st ? `${getStyleShortEn(st)} · ${provEn}` : provEn;
      pushIdea(forYouIdeas, {
        id: `fy-budget-${h.id}`,
        query: titleTh,
        titleTh,
        titleEn,
        subtitleTh: `ตรงงบประมาณ ~฿${taste.targetBudgetThb.toLocaleString()}/คืน`,
        subtitleEn: `Fits ~฿${taste.targetBudgetThb.toLocaleString()}/night`,
        imageUrl: pickHotelCoverThumb(h),
        badgeTh: "ตรงงบคุณ",
        badgeEn: "Your budget",
        kind: "for-you",
      });
    }
  }

  // 5. Top semantic tag affinity
  const topTagEntry = Object.entries(taste.tagWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])[0];
  if (topTagEntry) {
    const cleanTag = topTagEntry[0].replace(/^#/, "").trim();
    const tagMatch = scoredHotels.find(({ hotel }) =>
      hotel.pins.some((p) =>
        p.semanticTags.some(
          (t) => t.replace(/^#/, "").toLowerCase() === cleanTag.toLowerCase()
        )
      )
    );
    if (tagMatch && cleanTag.length >= 2) {
      pushIdea(forYouIdeas, {
        id: `fy-tag-${cleanTag}`,
        query: cleanTag,
        titleTh: cleanTag,
        titleEn: cleanTag,
        subtitleTh: "ตามคีย์เวิร์ดที่คุณสนใจ",
        subtitleEn: "Based on places you explored",
        imageUrl: pickHotelCoverThumb(tagMatch.hotel),
        kind: "for-you",
      });
    }
  }

  // 6. Multi-category diverse top-up so For You mixes stays, cafes, dining, wellness & deals
  const pickedCats = new Set<EffectiveCategoryTab>();
  for (const { hotel } of scoredHotels) {
    if (forYouIdeas.length >= 6) break;
    const cat = getEffectiveCategory(hotel);
    if (pickedCats.has(cat) && pickedCats.size < 4) continue;
    pickedCats.add(cat);

    const catLabels = getEffectiveCategoryLabels(cat);
    const styleId = hotel.stayStyles[0];
    const provTh = formatProvinceLabel(hotel.provinceId, "th");
    const provEn = formatProvinceLabel(hotel.provinceId, "en");
    const promoSummary = formatPlacePromoSummary(hotel);
    const query =
      cat === "stay" && styleId
        ? `${getStyleShortTh(styleId)} ${provTh}`
        : `${catLabels.th} ${provTh}`;

    pushIdea(forYouIdeas, {
      id: `fy-pick-${hotel.id}`,
      query,
      titleTh:
        cat === "stay" && styleId
          ? `${getStyleShortTh(styleId)} ${provTh}`
          : `${catLabels.th} ${provTh}`,
      titleEn:
        cat === "stay" && styleId
          ? `${getStyleShortEn(styleId)} · ${provEn}`
          : `${catLabels.en} · ${provEn}`,
      subtitleTh: promoSummary.th
        ? `${promoSummary.th} · ${hotel.nameTh}`
        : `${hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      subtitleEn: promoSummary.en
        ? `${promoSummary.en} · ${hotel.nameEn || hotel.nameTh}`
        : `${hotel.nameEn || hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      imageUrl: pickHotelCoverThumb(hotel),
      kind: "for-you",
    });
  }

  // Final top-up if still < 6
  for (const { hotel } of scoredHotels) {
    if (forYouIdeas.length >= 6) break;
    const cat = getEffectiveCategory(hotel);
    const catLabels = getEffectiveCategoryLabels(cat);
    const provTh = formatProvinceLabel(hotel.provinceId, "th");
    const provEn = formatProvinceLabel(hotel.provinceId, "en");
    const promoSummary = formatPlacePromoSummary(hotel);
    pushIdea(forYouIdeas, {
      id: `fy-extra-${hotel.id}`,
      query: `${catLabels.th} ${provTh}`,
      titleTh: `${catLabels.th} ${provTh}`,
      titleEn: `${catLabels.en} · ${provEn}`,
      subtitleTh: promoSummary.th
        ? `${promoSummary.th} · ${hotel.nameTh}`
        : `${hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      subtitleEn: promoSummary.en
        ? `${promoSummary.en} · ${hotel.nameEn || hotel.nameTh}`
        : `${hotel.nameEn || hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      imageUrl: pickHotelCoverThumb(hotel),
      kind: "for-you",
    });
  }

  // Aggregate Trending by Category, Province, Style & Semantic Tags
  const categoryAgg = new Map<
    EffectiveCategoryTab,
    { score: number; count: number; thumb: string }
  >();
  const provinceAgg = new Map<
    string,
    { score: number; count: number; thumb: string }
  >();
  const styleAgg = new Map<
    string,
    { score: number; count: number; thumb: string }
  >();
  const tagAgg = new Map<
    string,
    { label: string; score: number; count: number; thumb: string }
  >();

  for (const hotel of hotels) {
    const thumb = pickHotelCoverThumb(hotel);
    if (!thumb) continue;
    const hotelEngagement = hotel.pins.reduce(
      (sum, p) => sum + p.viewsCount + p.likesCount * 2 + p.savesCount * 3,
      10
    );

    const cat = getEffectiveCategory(hotel);
    const prevCat = categoryAgg.get(cat);
    categoryAgg.set(cat, {
      score: (prevCat?.score ?? 0) + hotelEngagement,
      count: (prevCat?.count ?? 0) + 1,
      thumb: prevCat?.thumb || thumb,
    });

    const prevProv = provinceAgg.get(hotel.provinceId);
    provinceAgg.set(hotel.provinceId, {
      score: (prevProv?.score ?? 0) + hotelEngagement,
      count: (prevProv?.count ?? 0) + 1,
      thumb: prevProv?.thumb || thumb,
    });

    for (const style of hotel.stayStyles) {
      if (!STYLE_MAP.has(style as never)) continue;
      const prevStyle = styleAgg.get(style);
      styleAgg.set(style, {
        score: (prevStyle?.score ?? 0) + hotelEngagement,
        count: (prevStyle?.count ?? 0) + 1,
        thumb: prevStyle?.thumb || thumb,
      });
    }

    const hotelTagsSeen = new Set<string>();
    for (const pin of hotel.pins) {
      for (const rawTag of pin.semanticTags) {
        const clean = rawTag.replace(/^#/, "").trim();
        const key = clean.toLowerCase();
        if (!clean || clean.length < 2 || hotelTagsSeen.has(key)) continue;
        hotelTagsSeen.add(key);
        const prevTag = tagAgg.get(key);
        tagAgg.set(key, {
          label: prevTag?.label || clean,
          score:
            (prevTag?.score ?? 0) +
            pin.viewsCount +
            pin.likesCount * 2 +
            pin.savesCount * 3 +
            15,
          count: (prevTag?.count ?? 0) + 1,
          thumb:
            prevTag?.thumb ||
            getOptimizedPinImageUrl(pin.coverImageUrl, "thumb"),
        });
      }
    }
  }

  const trendingSearches: SmartSearchIdeaCard[] = [];

  const topTrendingProvs = Array.from(provinceAgg.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const topTrendingCats = Array.from(categoryAgg.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const topTrendingStyles = Array.from(styleAgg.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const topTrendingTags = Array.from(tagAgg.values()).sort(
    (a, b) => b.score - a.score
  );

  for (const [provId, data] of topTrendingProvs.slice(0, 3)) {
    const provTh = formatProvinceLabel(provId, "th");
    const provEn = formatProvinceLabel(provId, "en");
    pushIdea(trendingSearches, {
      id: `tr-prov-${provId}`,
      query: provTh,
      titleTh: `โปรเที่ยว${provTh}`,
      titleEn: `${provEn} Deals`,
      subtitleTh: `${data.count} แห่งกำลังฮิต`,
      subtitleEn: `${data.count} trending places`,
      imageUrl: data.thumb,
      kind: "trending",
    });
  }

  for (const [catId, data] of topTrendingCats.slice(0, 3)) {
    const labels = getEffectiveCategoryLabels(catId);
    pushIdea(trendingSearches, {
      id: `tr-cat-${catId}`,
      query: labels.th,
      titleTh: `โปร${labels.th}`,
      titleEn: `${labels.en} Deals`,
      subtitleTh: `${data.count} ร้านและที่พักยอดนิยม`,
      subtitleEn: `${data.count} popular spots`,
      imageUrl: data.thumb,
      kind: "trending",
    });
  }

  for (const [styleId, data] of topTrendingStyles.slice(0, 2)) {
    const query = getStyleShortTh(styleId);
    pushIdea(trendingSearches, {
      id: `tr-style-${styleId}`,
      query,
      titleTh: STAY_STYLE_TABS.find((t) => t.id === styleId)?.labelTh ?? query,
      titleEn: getStyleShortEn(styleId),
      subtitleTh: `${data.count} ที่พักยอดนิยม`,
      subtitleEn: `${data.count} trending stays`,
      imageUrl: data.thumb,
      kind: "trending",
    });
  }

  for (const t of topTrendingTags) {
    if (trendingSearches.length >= 8) break;
    pushIdea(trendingSearches, {
      id: `tr-tag-${t.label}`,
      query: t.label,
      titleTh: `#${t.label}`,
      titleEn: `#${t.label}`,
      subtitleTh: `พบใน ${t.count} แห่ง`,
      subtitleEn: `In ${t.count} places`,
      imageUrl: t.thumb,
      kind: "trending",
    });
  }

  return {
    forYouIdeas: forYouIdeas.slice(0, 6),
    trendingSearches: trendingSearches.slice(0, 8),
  };
}

function buildQueryPredictions(
  rawQuery: string,
  hotels: HotelWithSignals[],
  taste: MergedTasteContext
): {
  smartCompletions: SmartSearchCompletionItem[];
  matchedHotels: SmartSearchMatchedHotel[];
  matchedDestinations: SmartSearchDestinationItem[];
} {
  const intent = parseSearchIntent(rawQuery);
  const { qNorm, terms, matchedCategories, matchedProvinceIds, expandedTerms } =
    intent;

  // 1. Score & match verified places across ALL categories + promos (Direct Jump)
  const scoredHotels = hotels
    .map((hotel) => {
      const cat = getEffectiveCategory(hotel);
      const catLabels = getEffectiveCategoryLabels(cat);
      const provTh = formatProvinceLabel(hotel.provinceId, "th").toLowerCase();
      const provEn = formatProvinceLabel(hotel.provinceId, "en").toLowerCase();
      const nameThLow = hotel.nameTh.toLowerCase();
      const nameEnLow = hotel.nameEn.toLowerCase();
      const taglineLow = `${hotel.taglineTh} ${hotel.taglineEn}`.toLowerCase();
      const distLow = hotel.districtTh.toLowerCase();
      const slugLow = hotel.slug.toLowerCase();
      const catLow = `${catLabels.th} ${catLabels.en} ${hotel.placeCategory}`.toLowerCase();
      const styleLabelsLow = hotel.stayStyles
        .map((st) =>
          `${getStyleShortTh(st)} ${getStyleShortEn(st)}`.toLowerCase()
        )
        .join(" ");
      const tagsText = hotel.pins
        .flatMap((p) => p.semanticTags)
        .join(" ")
        .toLowerCase();
      const pinTitlesText = hotel.pins
        .map((p) => `${p.titleTh} ${p.titleEn} ${p.promoHeadlineTh ?? ""}`.toLowerCase())
        .join(" ");
      const couponText = hotel.coupons
        .map((c) => `${c.titleTh} ${c.titleEn} ${c.code}`.toLowerCase())
        .join(" ");

      let textScore = 0;
      if (nameThLow.startsWith(qNorm) || nameEnLow.startsWith(qNorm)) {
        textScore += 2200;
      } else if (
        nameThLow.includes(qNorm) ||
        nameEnLow.includes(qNorm) ||
        slugLow.includes(qNorm)
      ) {
        textScore += 1500;
      }
      if (
        provTh.includes(qNorm) ||
        provEn.includes(qNorm) ||
        distLow.includes(qNorm) ||
        matchedProvinceIds.has(hotel.provinceId)
      ) {
        textScore += 1050;
      }
      if (matchedCategories.includes(cat) || catLow.includes(qNorm)) {
        textScore += 920;
      }
      if (styleLabelsLow.includes(qNorm) || tagsText.includes(qNorm)) {
        textScore += 820;
      }
      if (couponText.includes(qNorm) || pinTitlesText.includes(qNorm)) {
        textScore += 700;
      }
      if (taglineLow.includes(qNorm)) {
        textScore += 500;
      }
      if (intent.wantsPetFriendly && hotel.petsAllowed) {
        textScore += 900;
      }
      if (intent.wantsPromo && hasActivePromo(hotel)) {
        textScore += 650;
      }

      let termHits = 0;
      for (const term of expandedTerms) {
        const hit =
          nameThLow.includes(term) ||
          nameEnLow.includes(term) ||
          provTh.includes(term) ||
          provEn.includes(term) ||
          distLow.includes(term) ||
          catLow.includes(term) ||
          styleLabelsLow.includes(term) ||
          tagsText.includes(term) ||
          pinTitlesText.includes(term) ||
          couponText.includes(term) ||
          taglineLow.includes(term);
        if (hit) termHits += 1;
      }
      if (terms.length > 1 && termHits >= terms.length) {
        textScore += 950;
      } else if (termHits > 0) {
        textScore += termHits * 240;
      }

      const personalBonus = scoreHotelForTaste(hotel, taste) * 0.22;
      return {
        hotel,
        cat,
        catLabels,
        textScore,
        totalScore: textScore + personalBonus,
      };
    })
    .filter((entry) => entry.textScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  const matchedHotels: SmartSearchMatchedHotel[] = scoredHotels
    .slice(0, 5)
    .map(({ hotel, catLabels }) => {
      const promo = formatPlacePromoSummary(hotel);
      return {
        id: hotel.id,
        slug: hotel.slug,
        nameTh: hotel.nameTh,
        nameEn: hotel.nameEn || hotel.nameTh,
        provinceId: hotel.provinceId,
        provinceNameTh: formatProvinceLabel(hotel.provinceId, "th"),
        provinceNameEn: formatProvinceLabel(hotel.provinceId, "en"),
        districtTh: hotel.districtTh,
        ratingAvg: hotel.ratingAvg,
        reviewCount: hotel.reviewCount,
        priceFromThb:
          hotel.placeCategory === "STAY"
            ? (hotel.rooms[0]?.weekdayPriceThb ?? null)
            : null,
        imageUrl: pickHotelCoverThumb(hotel),
        stayStyles: hotel.stayStyles,
        couponSummaryTh: promo.th,
        couponSummaryEn: promo.en,
        placeCategory: hotel.placeCategory,
        categoryLabelTh: catLabels.th,
        categoryLabelEn: catLabels.en,
      };
    });

  // 2. Match Destinations (Categories + Provinces + Stay Styles + Popular Tags)
  const categoryCounts = new Map<
    EffectiveCategoryTab,
    { count: number; thumb: string }
  >();
  const provinceCounts = new Map<string, { count: number; thumb: string }>();
  const styleCounts = new Map<string, { count: number; thumb: string }>();
  const tagCounts = new Map<
    string,
    { label: string; count: number; thumb: string }
  >();

  for (const h of hotels) {
    const thumb = pickHotelCoverThumb(h);
    const cat = getEffectiveCategory(h);
    const prevC = categoryCounts.get(cat);
    categoryCounts.set(cat, {
      count: (prevC?.count ?? 0) + 1,
      thumb: prevC?.thumb || thumb,
    });

    const prevP = provinceCounts.get(h.provinceId);
    provinceCounts.set(h.provinceId, {
      count: (prevP?.count ?? 0) + 1,
      thumb: prevP?.thumb || thumb,
    });
    for (const st of h.stayStyles) {
      const prevS = styleCounts.get(st);
      styleCounts.set(st, {
        count: (prevS?.count ?? 0) + 1,
        thumb: prevS?.thumb || thumb,
      });
    }
    const hotelSeen = new Set<string>();
    for (const p of h.pins) {
      for (const rawTag of p.semanticTags) {
        const clean = rawTag.replace(/^#/, "").trim();
        const key = clean.toLowerCase();
        if (!clean || hotelSeen.has(key)) continue;
        hotelSeen.add(key);
        const prevT = tagCounts.get(key);
        tagCounts.set(key, {
          label: prevT?.label || clean,
          count: (prevT?.count ?? 0) + 1,
          thumb:
            prevT?.thumb ||
            getOptimizedPinImageUrl(p.coverImageUrl, "thumb"),
        });
      }
    }
  }

  const destCandidates: Array<SmartSearchDestinationItem & { score: number }> =
    [];

  // Categories (คาเฟ่, ร้านอาหาร, บาร์, สปา, กิจกรรม, ที่พัก)
  for (const tab of PROMO_CATEGORY_TABS) {
    const catId = tab.id as EffectiveCategoryTab;
    const isHit =
      matchedCategories.includes(catId) ||
      `${tab.labelTh} ${tab.labelEn}`.toLowerCase().includes(qNorm);
    if (!isHit) continue;
    const stats = categoryCounts.get(catId);
    destCandidates.push({
      id: `dest-cat-${catId}`,
      query: tab.labelTh,
      nameTh: tab.sectionTitleTh,
      nameEn: tab.sectionTitleEn,
      subtitleTh: `${stats?.count ?? 0} แห่งพร้อมโปรโมชั่น`,
      subtitleEn: `${stats?.count ?? 0} places & deals`,
      type: "category",
      staysCount: stats?.count ?? 0,
      imageUrl: stats?.thumb,
      score: 520 + (stats?.count ?? 0) * 45,
    });
  }

  for (const prov of THAILAND_77_PROVINCES) {
    const fullText = `${prov.nameTh} ${prov.nameEn} ${prov.id}`.toLowerCase();
    const shortTh = prov.nameTh.split("(")[0].trim();
    const isMatch =
      matchedProvinceIds.has(prov.id) ||
      fullText.includes(qNorm) ||
      terms.every((t) => fullText.includes(t));
    if (!isMatch) continue;
    const stats = provinceCounts.get(prov.id);
    const staysCount = stats?.count ?? 0;
    const personalW = taste.provinceWeights[prov.id] ?? 0;
    const startsWith =
      shortTh.toLowerCase().startsWith(qNorm) ||
      prov.nameEn.toLowerCase().startsWith(qNorm) ||
      matchedProvinceIds.has(prov.id);
    destCandidates.push({
      id: `dest-prov-${prov.id}`,
      query: shortTh,
      nameTh: prov.nameTh,
      nameEn: prov.nameEn,
      subtitleTh:
        staysCount > 0 ? `${staysCount} แห่งพร้อมโปรเที่ยว` : "ค้นหาใกล้เคียงในโซนนี้",
      subtitleEn:
        staysCount > 0 ? `${staysCount} verified places` : "Explore nearby spots",
      type: "province",
      staysCount,
      imageUrl: stats?.thumb,
      score:
        (startsWith ? 540 : 260) + staysCount * 60 + personalW * 40,
    });
  }

  for (const st of STAY_STYLE_TABS) {
    if (st.id === "all") continue;
    const fullText = `${st.labelTh} ${st.labelEn} ${st.id}`.toLowerCase();
    if (
      !fullText.includes(qNorm) &&
      !terms.every((t) => fullText.includes(t))
    ) {
      continue;
    }
    const stats = styleCounts.get(st.id);
    const shortTh = st.labelTh.split("&")[0].trim();
    destCandidates.push({
      id: `dest-style-${st.id}`,
      query: shortTh,
      nameTh: st.labelTh,
      nameEn: st.labelEn,
      subtitleTh: `สไตล์ที่พัก · ${stats?.count ?? 0} แห่ง`,
      subtitleEn: `Stay style · ${stats?.count ?? 0} stays`,
      type: "style",
      staysCount: stats?.count ?? 0,
      imageUrl: stats?.thumb,
      score:
        420 +
        (stats?.count ?? 0) * 40 +
        (taste.styleWeights[st.id] ?? 0) * 50,
    });
  }

  for (const [key, t] of tagCounts.entries()) {
    if (!key.includes(qNorm) && !terms.every((term) => key.includes(term))) {
      continue;
    }
    destCandidates.push({
      id: `dest-tag-${key}`,
      query: t.label,
      nameTh: `#${t.label}`,
      nameEn: `#${t.label}`,
      subtitleTh: `คีย์เวิร์ดยอดนิยม · ${t.count} แห่ง`,
      subtitleEn: `Popular tag · ${t.count} places`,
      type: "tag",
      staysCount: t.count,
      imageUrl: t.thumb,
      score: 300 + t.count * 35 + (taste.tagWeights[key] ?? 0) * 40,
    });
  }

  destCandidates.sort((a, b) => b.score - a.score);
  const matchedDestinations: SmartSearchDestinationItem[] = destCandidates
    .slice(0, 5)
    .map(({ score: _score, ...item }) => item);

  // 3. Smart Predictive Completions (Personalized Compound Intents across Categories + Provinces)
  const completions: SmartSearchCompletionItem[] = [];
  const seenComp = new Set<string>();
  const pushCompletion = (item: SmartSearchCompletionItem) => {
    const key = item.query.trim().toLowerCase();
    if (!key || seenComp.has(key)) return;
    seenComp.add(key);
    completions.push(item);
  };

  const favProvinceId =
    Object.entries(taste.provinceWeights)
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? taste.originProvinceId;

  const matchedCatDest = matchedDestinations.find((d) => d.type === "category");
  const matchedStyleDest = matchedDestinations.find((d) => d.type === "style");
  const matchedProvDest = matchedDestinations.find((d) => d.type === "province");

  // If user typed a category (e.g. "คาเฟ่", "สปา"), synthesize "Category + Preferred/Matched Province"
  if (matchedCatDest) {
    pushCompletion({
      id: `comp-cat-${matchedCatDest.id}`,
      query: matchedCatDest.query,
      labelTh: matchedCatDest.nameTh,
      labelEn: matchedCatDest.nameEn,
      reasonTh: matchedCatDest.subtitleTh,
      reasonEn: matchedCatDest.subtitleEn,
      imageUrl: matchedCatDest.imageUrl,
    });

    const candidateProvIds = Array.from(
      new Set([
        ...(favProvinceId ? [favProvinceId] : []),
        ...scoredHotels.slice(0, 4).map((s) => s.hotel.provinceId),
      ])
    );

    for (const provId of candidateProvIds) {
      if (completions.length >= 3) break;
      const comboHotel = scoredHotels.find(
        (s) => s.hotel.provinceId === provId
      )?.hotel;
      if (!comboHotel) continue;
      const provTh = formatProvinceLabel(provId, "th");
      const provEn = formatProvinceLabel(provId, "en");
      pushCompletion({
        id: `comp-cat-prov-${matchedCatDest.id}-${provId}`,
        query: `${matchedCatDest.query} ${provTh}`,
        labelTh: `${matchedCatDest.query} · ${provTh}`,
        labelEn: `${matchedCatDest.nameEn} in ${provEn}`,
        reasonTh:
          provId === favProvinceId
            ? "ตรงกับจังหวัดที่คุณสนใจ"
            : "ตัวเลือกยอดนิยม",
        reasonEn:
          provId === favProvinceId ? "Matches your destination" : "Top pick",
        imageUrl: pickHotelCoverThumb(comboHotel),
      });
    }
  }

  // If user typed a style, synthesize "Style + Preferred/Matched Province"
  if (matchedStyleDest) {
    pushCompletion({
      id: `comp-style-${matchedStyleDest.id}`,
      query: matchedStyleDest.query,
      labelTh: matchedStyleDest.query,
      labelEn: matchedStyleDest.nameEn,
      reasonTh: "สไตล์ที่พักแนะนำ",
      reasonEn: "Stay style match",
      imageUrl: matchedStyleDest.imageUrl,
    });

    const candidateProvIds = Array.from(
      new Set([
        ...(favProvinceId ? [favProvinceId] : []),
        ...scoredHotels.slice(0, 3).map((s) => s.hotel.provinceId),
      ])
    );

    for (const provId of candidateProvIds) {
      if (completions.length >= 3) break;
      const comboHotel = scoredHotels.find(
        (s) => s.hotel.provinceId === provId
      )?.hotel;
      if (!comboHotel) continue;
      const provTh = formatProvinceLabel(provId, "th");
      const provEn = formatProvinceLabel(provId, "en");
      pushCompletion({
        id: `comp-combo-${matchedStyleDest.id}-${provId}`,
        query: `${matchedStyleDest.query} ${provTh}`,
        labelTh: `${matchedStyleDest.query} · ${provTh}`,
        labelEn: `${matchedStyleDest.nameEn} in ${provEn}`,
        reasonTh:
          provId === favProvinceId
            ? "ตรงกับจุดหมายที่คุณสนใจ"
            : "ตัวเลือกที่ตรงกันที่สุด",
        reasonEn:
          provId === favProvinceId
            ? "Matches your destination interest"
            : "Top match",
        imageUrl: pickHotelCoverThumb(comboHotel),
      });
    }
  }

  // If user typed a province, synthesize "Province + Preferred Style or Top Category"
  if (matchedProvDest) {
    pushCompletion({
      id: `comp-prov-${matchedProvDest.id}`,
      query: matchedProvDest.query,
      labelTh: `โปรเที่ยว${matchedProvDest.query}`,
      labelEn: `Explore ${matchedProvDest.nameEn}`,
      reasonTh:
        matchedProvDest.staysCount > 0
          ? `${matchedProvDest.staysCount} แห่งในจังหวัดนี้`
          : "ค้นหาใกล้เคียงทันที",
      reasonEn:
        matchedProvDest.staysCount > 0
          ? `${matchedProvDest.staysCount} places available`
          : "Explore closest matches",
      imageUrl: matchedProvDest.imageUrl,
    });

    const topPersonalStyle = Object.entries(taste.styleWeights)
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const matchingHotelWithStyle =
      scoredHotels.find(
        (s) =>
          topPersonalStyle && s.hotel.stayStyles.includes(topPersonalStyle)
      )?.hotel || scoredHotels[0]?.hotel;

    if (matchingHotelWithStyle) {
      const styleId =
        topPersonalStyle &&
        matchingHotelWithStyle.stayStyles.includes(topPersonalStyle)
          ? topPersonalStyle
          : matchingHotelWithStyle.stayStyles[0];
      if (styleId) {
        const stTh = getStyleShortTh(styleId);
        const stEn = getStyleShortEn(styleId);
        pushCompletion({
          id: `comp-prov-style-${matchedProvDest.id}-${styleId}`,
          query: `${matchedProvDest.query} ${stTh}`,
          labelTh: `${matchedProvDest.query} · ${stTh}`,
          labelEn: `${matchedProvDest.nameEn} · ${stEn}`,
          reasonTh:
            styleId === topPersonalStyle
              ? "ตรงสไตล์ที่คุณดูบ่อย"
              : "บรรยากาศยอดนิยม",
          reasonEn:
            styleId === topPersonalStyle
              ? "Your favorite style"
              : "Popular vibe",
          imageUrl: pickHotelCoverThumb(matchingHotelWithStyle),
        });
      }
    }
  }

  // Top up completions from matched destinations
  for (const dest of matchedDestinations) {
    if (completions.length >= 4) break;
    pushCompletion({
      id: `comp-dest-${dest.id}`,
      query: dest.query,
      labelTh: dest.query,
      labelEn: dest.nameEn,
      reasonTh: dest.subtitleTh,
      reasonEn: dest.subtitleEn,
      imageUrl: dest.imageUrl,
    });
  }

  return {
    smartCompletions: completions.slice(0, 4),
    matchedHotels,
    matchedDestinations,
  };
}

export async function getSmartSearchSuggestions(
  params: GetSmartSearchParams
): Promise<SmartSearchResponseDto> {
  const cleanQuery = (params.query ?? "").trim();
  const mode: "focus" | "query" = cleanQuery.length > 0 ? "query" : "focus";

  // Run cached catalog read + personal taste merge in parallel
  const [cachedCatalog, taste] = await Promise.all([
    getCachedSmartSearchCatalog(),
    loadMergedTasteContext({
      userId: params.userId ?? null,
      visitorId: params.visitorId ?? null,
      hasAnalyticsConsent: params.hasAnalyticsConsent ?? false,
      sessionSignal: params.sessionSignal ?? null,
      originProvinceId: params.originProvinceId ?? null,
      deviceType: params.deviceType ?? undefined,
    }),
  ]);

  const hotels = reviveActiveCatalog(cachedCatalog, Date.now());

  const mergedRecentPinIds = Array.from(
    new Set([
      ...(params.recentOpenedPinIds ?? []),
      ...taste.recentViewedPinIds,
    ])
  )
    .filter(Boolean)
    .slice(0, 8);

  const recentlyViewedPins: SmartSearchRecentPin[] = [];

  if (mode === "focus" && mergedRecentPinIds.length > 0) {
    // 1. Resolve from cached catalog in 0ms first (avoids extra DB query in common case!)
    const catalogPinMap = new Map<string, SmartSearchRecentPin>();
    for (const h of hotels) {
      const provTh = formatProvinceLabel(h.provinceId, "th");
      const provEn = formatProvinceLabel(h.provinceId, "en");
      const priceFrom =
        h.placeCategory === "STAY"
          ? (h.rooms[0]?.weekdayPriceThb ?? null)
          : null;
      for (const p of h.pins) {
        catalogPinMap.set(p.id, {
          id: p.id,
          titleTh: p.titleTh,
          titleEn: p.titleEn || p.titleTh,
          hotelNameTh: h.nameTh,
          hotelNameEn: h.nameEn || h.nameTh,
          hotelSlug: h.slug,
          provinceNameTh: provTh,
          provinceNameEn: provEn,
          priceFromThb: priceFrom,
          imageUrl: getOptimizedPinImageUrl(p.coverImageUrl, "thumb"),
          placeCategory: h.placeCategory,
        });
      }
    }

    const missingPinIds = mergedRecentPinIds.filter(
      (id) => !catalogPinMap.has(id)
    );

    if (missingPinIds.length > 0) {
      const fallbackRawPins = await prisma.pin
        .findMany({
          where: {
            id: { in: missingPinIds },
            publishStatus: "PUBLISHED",
            hotel: { isPublished: true, verificationStatus: "VERIFIED" },
          },
          select: {
            id: true,
            titleTh: true,
            titleEn: true,
            coverImageUrl: true,
            hotel: {
              select: {
                slug: true,
                nameTh: true,
                nameEn: true,
                provinceId: true,
                placeCategory: true,
                rooms: {
                  where: { isActive: true },
                  orderBy: { weekdayPriceThb: "asc" },
                  take: 1,
                  select: { weekdayPriceThb: true },
                },
              },
            },
          },
        })
        .catch(() => []);

      for (const pin of fallbackRawPins) {
        const placeCat = pin.hotel.placeCategory as PlaceCategoryDto;
        catalogPinMap.set(pin.id, {
          id: pin.id,
          titleTh: pin.titleTh,
          titleEn: pin.titleEn || pin.titleTh,
          hotelNameTh: pin.hotel.nameTh,
          hotelNameEn: pin.hotel.nameEn || pin.hotel.nameTh,
          hotelSlug: pin.hotel.slug,
          provinceNameTh: formatProvinceLabel(pin.hotel.provinceId, "th"),
          provinceNameEn: formatProvinceLabel(pin.hotel.provinceId, "en"),
          priceFromThb:
            placeCat === "STAY"
              ? (pin.hotel.rooms[0]?.weekdayPriceThb ?? null)
              : null,
          imageUrl: getOptimizedPinImageUrl(pin.coverImageUrl, "thumb"),
          placeCategory: placeCat,
        });
      }
    }

    for (const id of mergedRecentPinIds) {
      const resolved = catalogPinMap.get(id);
      if (!resolved) continue;
      recentlyViewedPins.push(resolved);
      if (recentlyViewedPins.length >= 6) break;
    }
  }

  if (mode === "focus") {
    const { forYouIdeas, trendingSearches } = buildFocusRecommendations(
      hotels,
      taste
    );
    return {
      mode: "focus",
      query: "",
      hasPersonalSignal: taste.hasPersonalSignal,
      detectedOriginProvinceId: taste.originProvinceId,
      targetBudgetThb: taste.targetBudgetThb,
      recentlyViewedPins,
      forYouIdeas,
      trendingSearches,
      smartCompletions: [],
      matchedHotels: [],
      matchedDestinations: [],
    };
  }

  const { smartCompletions, matchedHotels, matchedDestinations } =
    buildQueryPredictions(cleanQuery, hotels, taste);

  return {
    mode: "query",
    query: cleanQuery,
    hasPersonalSignal: taste.hasPersonalSignal,
    detectedOriginProvinceId: taste.originProvinceId,
    targetBudgetThb: taste.targetBudgetThb,
    recentlyViewedPins: [],
    forYouIdeas: [],
    trendingSearches: [],
    smartCompletions,
    matchedHotels,
    matchedDestinations,
  };
}
