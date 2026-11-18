import { prisma } from "@/lib/prisma";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import {
  formatProvinceLabel,
  getProvinceById,
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import { isEasyWeekendDriveFromOrigin } from "@/lib/telemetry/geoHeaders";
import {
  loadMergedTasteContext,
  type MergedTasteContext,
} from "@/lib/services/recommendationEngine";
import type { CompactSessionTasteSignal } from "@/lib/telemetry/tasteTypes";

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
  type: "province" | "style" | "tag";
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

interface HotelWithSignals {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  provinceId: string;
  districtTh: string;
  stayStyles: string[];
  petsAllowed: boolean;
  ratingAvg: number;
  reviewCount: number;
  coverImageUrl: string | null;
  logoUrl: string | null;
  rooms: Array<{ weekdayPriceThb: number }>;
  coupons: Array<{
    discountType: "PERCENT" | "FIXED_THB";
    discountValue: number;
    titleTh: string;
    titleEn: string;
  }>;
  pins: Array<{
    id: string;
    titleTh: string;
    titleEn: string;
    coverImageUrl: string;
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

function formatCouponSummary(
  coupons: HotelWithSignals["coupons"]
): { th: string | null; en: string | null } {
  const top = coupons[0];
  if (!top) return { th: null, en: null };
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
        score += (taste.tagWeights[norm] ?? taste.tagWeights[tag.toLowerCase()] ?? 0) * 10;
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

  if (hotel.coupons.length > 0) score += 10;
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

  // 1. Personal compound idea: top style + top province where verified stays exist
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
          badgeTh: "แนะนำสำหรับคุณ",
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
        titleTh: `พักผ่อนใกล้คุณ · ${provTh}`,
        titleEn: `Weekend drive · ${provEn}`,
        subtitleTh: "ขับรถถึงง่ายจากพื้นที่ของคุณ",
        subtitleEn: "Easy weekend getaway near you",
        imageUrl: pickHotelCoverThumb(nearbyMatch.hotel),
        badgeTh: "ใกล้คุณ",
        badgeEn: "Near you",
        kind: "for-you",
      });
    }
  }

  // 3. Budget-aware idea if user shows price affinity
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

  // 4. Top semantic tag affinity
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
        subtitleEn: "Based on stays you explored",
        imageUrl: pickHotelCoverThumb(tagMatch.hotel),
        kind: "for-you",
      });
    }
  }

  // 5. Cold-start / top-up so For You always looks vibrant (4–6 cards)
  for (const { hotel } of scoredHotels) {
    if (forYouIdeas.length >= 6) break;
    const styleId = hotel.stayStyles[0];
    const provTh = formatProvinceLabel(hotel.provinceId, "th");
    const provEn = formatProvinceLabel(hotel.provinceId, "en");
    const query = styleId ? `${getStyleShortTh(styleId)} ${provTh}` : provTh;
    pushIdea(forYouIdeas, {
      id: `fy-pick-${hotel.id}`,
      query,
      titleTh: styleId ? `${getStyleShortTh(styleId)} ${provTh}` : hotel.nameTh,
      titleEn: styleId
        ? `${getStyleShortEn(styleId)} · ${provEn}`
        : hotel.nameEn || hotel.nameTh,
      subtitleTh: hotel.coupons[0]
        ? `${hotel.nameTh} · มีคูปองลดราคา`
        : `${hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      subtitleEn: hotel.coupons[0]
        ? `${hotel.nameEn || hotel.nameTh} · Deal available`
        : `${hotel.nameEn || hotel.nameTh} · ★ ${hotel.ratingAvg.toFixed(1)}`,
      imageUrl: pickHotelCoverThumb(hotel),
      kind: "for-you",
    });
  }

  // Aggregate Trending by Province, Style & Real Semantic Tags
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

  const topTrendingStyles = Array.from(styleAgg.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const topTrendingProvs = Array.from(provinceAgg.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const topTrendingTags = Array.from(tagAgg.values()).sort(
    (a, b) => b.score - a.score
  );

  for (const [styleId, data] of topTrendingStyles.slice(0, 4)) {
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

  for (const [provId, data] of topTrendingProvs.slice(0, 4)) {
    const provTh = formatProvinceLabel(provId, "th");
    const provEn = formatProvinceLabel(provId, "en");
    pushIdea(trendingSearches, {
      id: `tr-prov-${provId}`,
      query: provTh,
      titleTh: `ที่พัก${provTh}`,
      titleEn: `${provEn} Stays`,
      subtitleTh: `${data.count} ที่พักกำลังฮิต`,
      subtitleEn: `${data.count} stays trending`,
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
      subtitleTh: `พบใน ${t.count} ที่พัก`,
      subtitleEn: `In ${t.count} stays`,
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
  const qNorm = rawQuery.trim().toLowerCase();
  const terms = qNorm.split(/\s+/).filter(Boolean);

  // 1. Score & match verified hotels (Direct Jump)
  const scoredHotels = hotels
    .map((hotel) => {
      const provTh = formatProvinceLabel(hotel.provinceId, "th").toLowerCase();
      const provEn = formatProvinceLabel(hotel.provinceId, "en").toLowerCase();
      const nameThLow = hotel.nameTh.toLowerCase();
      const nameEnLow = hotel.nameEn.toLowerCase();
      const distLow = hotel.districtTh.toLowerCase();
      const slugLow = hotel.slug.toLowerCase();
      const styleLabelsLow = hotel.stayStyles
        .map((st) => `${getStyleShortTh(st)} ${getStyleShortEn(st)}`.toLowerCase())
        .join(" ");
      const tagsText = hotel.pins
        .flatMap((p) => p.semanticTags)
        .join(" ")
        .toLowerCase();
      const pinTitlesText = hotel.pins
        .map((p) => `${p.titleTh} ${p.titleEn}`.toLowerCase())
        .join(" ");

      let textScore = 0;
      if (nameThLow.startsWith(qNorm) || nameEnLow.startsWith(qNorm)) {
        textScore += 2000;
      } else if (
        nameThLow.includes(qNorm) ||
        nameEnLow.includes(qNorm) ||
        slugLow.includes(qNorm)
      ) {
        textScore += 1400;
      }
      if (provTh.includes(qNorm) || provEn.includes(qNorm) || distLow.includes(qNorm)) {
        textScore += 1000;
      }
      if (styleLabelsLow.includes(qNorm) || tagsText.includes(qNorm)) {
        textScore += 800;
      }
      if (pinTitlesText.includes(qNorm)) {
        textScore += 600;
      }

      let termHits = 0;
      for (const term of terms) {
        const hit =
          nameThLow.includes(term) ||
          nameEnLow.includes(term) ||
          provTh.includes(term) ||
          provEn.includes(term) ||
          distLow.includes(term) ||
          styleLabelsLow.includes(term) ||
          tagsText.includes(term) ||
          pinTitlesText.includes(term);
        if (hit) termHits += 1;
      }
      if (terms.length > 1 && termHits === terms.length) {
        textScore += 900;
      } else if (termHits > 0) {
        textScore += termHits * 250;
      }

      const personalBonus = scoreHotelForTaste(hotel, taste) * 0.2;
      return {
        hotel,
        textScore,
        totalScore: textScore + personalBonus,
      };
    })
    .filter((entry) => entry.textScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  const matchedHotels: SmartSearchMatchedHotel[] = scoredHotels
    .slice(0, 4)
    .map(({ hotel }) => {
      const coupon = formatCouponSummary(hotel.coupons);
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
        priceFromThb: hotel.rooms[0]?.weekdayPriceThb ?? null,
        imageUrl: pickHotelCoverThumb(hotel),
        stayStyles: hotel.stayStyles,
        couponSummaryTh: coupon.th,
        couponSummaryEn: coupon.en,
      };
    });

  // 2. Match Destinations (Provinces + Stay Styles + Popular Tags)
  const provinceCounts = new Map<string, { count: number; thumb: string }>();
  const styleCounts = new Map<string, { count: number; thumb: string }>();
  const tagCounts = new Map<
    string,
    { label: string; count: number; thumb: string }
  >();

  for (const h of hotels) {
    const thumb = pickHotelCoverThumb(h);
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

  for (const prov of THAILAND_77_PROVINCES) {
    const fullText = `${prov.nameTh} ${prov.nameEn} ${prov.id}`.toLowerCase();
    const shortTh = prov.nameTh.split("(")[0].trim();
    const isMatch =
      fullText.includes(qNorm) || terms.every((t) => fullText.includes(t));
    if (!isMatch) continue;
    const stats = provinceCounts.get(prov.id);
    const staysCount = stats?.count ?? 0;
    const personalW = taste.provinceWeights[prov.id] ?? 0;
    const startsWith =
      shortTh.toLowerCase().startsWith(qNorm) ||
      prov.nameEn.toLowerCase().startsWith(qNorm);
    destCandidates.push({
      id: `dest-prov-${prov.id}`,
      query: shortTh,
      nameTh: prov.nameTh,
      nameEn: prov.nameEn,
      subtitleTh:
        staysCount > 0 ? `${staysCount} ที่พักพร้อมจอง` : "ค้นหาที่พักใกล้เคียงในโซนนี้",
      subtitleEn:
        staysCount > 0 ? `${staysCount} verified stays` : "Explore nearby stays",
      type: "province",
      staysCount,
      imageUrl: stats?.thumb,
      score:
        (startsWith ? 500 : 250) + staysCount * 60 + personalW * 40,
    });
  }

  for (const st of STAY_STYLE_TABS) {
    if (st.id === "all") continue;
    const fullText = `${st.labelTh} ${st.labelEn} ${st.id}`.toLowerCase();
    if (!fullText.includes(qNorm) && !terms.every((t) => fullText.includes(t))) {
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
      subtitleTh: `คีย์เวิร์ดยอดนิยม · ${t.count} ที่พัก`,
      subtitleEn: `Popular tag · ${t.count} stays`,
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

  // 3. Smart Predictive Completions (including Personalized Compound Intents)
  const completions: SmartSearchCompletionItem[] = [];
  const seenComp = new Set<string>();
  const pushCompletion = (item: SmartSearchCompletionItem) => {
    const key = item.query.trim().toLowerCase();
    if (!key || seenComp.has(key)) return;
    seenComp.add(key);
    completions.push(item);
  };

  // Top user personal province for compound synthesis
  const favProvinceId =
    Object.entries(taste.provinceWeights)
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? taste.originProvinceId;

  const matchedStyleDest = matchedDestinations.find((d) => d.type === "style");
  const matchedProvDest = matchedDestinations.find((d) => d.type === "province");

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
          provId === favProvinceId ? "Matches your destination interest" : "Top match",
        imageUrl: pickHotelCoverThumb(comboHotel),
      });
    }
  }

  // If user typed a province, synthesize "Province + Preferred/Available Style"
  if (matchedProvDest) {
    pushCompletion({
      id: `comp-prov-${matchedProvDest.id}`,
      query: matchedProvDest.query,
      labelTh: `ที่พักใน${matchedProvDest.query}`,
      labelEn: `Stays in ${matchedProvDest.nameEn}`,
      reasonTh:
        matchedProvDest.staysCount > 0
          ? `${matchedProvDest.staysCount} ที่พักในจังหวัดนี้`
          : "ค้นหาใกล้เคียงทันที",
      reasonEn:
        matchedProvDest.staysCount > 0
          ? `${matchedProvDest.staysCount} stays available`
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
            styleId === topPersonalStyle ? "Your favorite style" : "Popular vibe",
          imageUrl: pickHotelCoverThumb(matchingHotelWithStyle),
        });
      }
    }
  }

  // Top up completions from matched tags or direct raw query
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

  const taste = await loadMergedTasteContext({
    userId: params.userId ?? null,
    visitorId: params.visitorId ?? null,
    hasAnalyticsConsent: params.hasAnalyticsConsent ?? false,
    sessionSignal: params.sessionSignal ?? null,
    originProvinceId: params.originProvinceId ?? null,
    deviceType: params.deviceType ?? undefined,
  });

  const mergedRecentPinIds = Array.from(
    new Set([
      ...(params.recentOpenedPinIds ?? []),
      ...taste.recentViewedPinIds,
    ])
  )
    .filter(Boolean)
    .slice(0, 8);

  const [hotels, recentRawPins] = await Promise.all([
    prisma.hotel.findMany({
      where: {
        isPublished: true,
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        slug: true,
        nameTh: true,
        nameEn: true,
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
          where: {
            isActive: true,
            expiresAt: { gt: new Date() },
          },
          orderBy: { discountValue: "desc" },
          take: 1,
          select: {
            discountType: true,
            discountValue: true,
            titleTh: true,
            titleEn: true,
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
            stayStyles: true,
            semanticTags: true,
            likesCount: true,
            savesCount: true,
            viewsCount: true,
          },
        },
      },
    }),
    mode === "focus" && mergedRecentPinIds.length > 0
      ? prisma.pin.findMany({
          where: {
            id: { in: mergedRecentPinIds },
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
      : Promise.resolve([]),
  ]);

  const recentById = new Map(recentRawPins.map((p) => [p.id, p]));
  const recentlyViewedPins: SmartSearchRecentPin[] = [];
  for (const id of mergedRecentPinIds) {
    const pin = recentById.get(id);
    if (!pin) continue;
    recentlyViewedPins.push({
      id: pin.id,
      titleTh: pin.titleTh,
      titleEn: pin.titleEn || pin.titleTh,
      hotelNameTh: pin.hotel.nameTh,
      hotelNameEn: pin.hotel.nameEn || pin.hotel.nameTh,
      hotelSlug: pin.hotel.slug,
      provinceNameTh: formatProvinceLabel(pin.hotel.provinceId, "th"),
      provinceNameEn: formatProvinceLabel(pin.hotel.provinceId, "en"),
      priceFromThb: pin.hotel.rooms[0]?.weekdayPriceThb ?? null,
      imageUrl: getOptimizedPinImageUrl(pin.coverImageUrl, "thumb"),
    });
    if (recentlyViewedPins.length >= 6) break;
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
