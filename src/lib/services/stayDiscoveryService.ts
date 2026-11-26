import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NONDII_CACHE_TAGS } from "@/lib/cache/revalidateNondii";
import {
  getProvinceById,
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
  type ThailandRegionId,
} from "@/data/thailandProvinces";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";
import {
  loadMergedTasteContext,
  rankPersonalizedHomeFeed,
  rankRelatedPinsForPin,
} from "@/lib/services/recommendationEngine";
import type { CompactSessionTasteSignal } from "@/lib/telemetry/tasteTypes";
import { mapHotelPostToSummaryDto } from "@/lib/services/hotelPostService";
import { computeHaversineKm } from "@/lib/placeCategories";
import type {
  HotelPostSummaryDto,
  PinCommentDto,
  PinFeedItemDto,
  PlaceCategoryDto,
} from "@/types/cangaroom";

export interface PersonalizationRequestHints {
  visitorId?: string | null;
  hasAnalyticsConsent?: boolean;
  sessionSignal?: CompactSessionTasteSignal | null;
  originProvinceId?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop";
}

export interface SearchStaysParams extends PersonalizationRequestHints {
  style?: string | null;
  placeCategory?: PlaceCategoryDto | "ALL" | null;
  provinceId?: string | null;
  sourceType?: "ALL" | "INTERNAL" | "EXTERNAL" | null;
  q?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  maxPriceThb?: number | null;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  limit?: number;
  userId?: string | null;
  /** Strip heavy detail-only fields (nearbySpotsJson, full gallery mediaUrls, multi-coupons, descriptions) for ultra-fast Home SSR payload */
  compact?: boolean;
}

/**
 * 3-Tier Zero-Dead-End Search Relevance Cascade:
 * - Tier 1 (Score >= 1000): Direct match on Hotel Name, Province, District, Pin Title, Tags, or Description.
 * - Tier 2 (Score 200..999): Semantic / Regional Expansion (same region as searched province, or same stay style / tags as Tier-1 matches).
 * - Tier 3 (Score 1..199): Taste-Personalized Discovery Fallback (preserves base rank order so the feed is NEVER sparse or empty).
 */
function rankPinsByZeroDeadEndSearch(params: {
  pins: Array<{
    dto: PinFeedItemDto;
    districtTh: string;
  }>;
  query: string;
}): PinFeedItemDto[] {
  const { pins, query } = params;
  const qNorm = query.trim().toLowerCase();
  if (!qNorm) return pins.map((p) => p.dto);

  const tokens = qNorm
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const searchTerms = tokens.length > 0 ? tokens : [qNorm];

  // 1. Detect if query mentions any of Thailand's 77 provinces (even if 0 stays exist in that province!)
  const matchedProvinces = THAILAND_77_PROVINCES.filter((prov) => {
    const pTh = prov.nameTh.toLowerCase();
    const pEn = prov.nameEn.toLowerCase();
    return (
      pTh.includes(qNorm) ||
      qNorm.includes(pTh) ||
      pEn.includes(qNorm) ||
      qNorm.includes(pEn) ||
      searchTerms.some((t) => pTh.includes(t) || pEn.includes(t))
    );
  });
  const matchedProvinceIds = new Set(matchedProvinces.map((p) => p.id));
  const matchedRegions = new Set<ThailandRegionId>(
    matchedProvinces.map((p) => p.region)
  );

  // 2. Detect if query mentions any stay style keywords
  const matchedStyleIds = new Set<string>();
  for (const st of STAY_STYLE_TABS) {
    if (st.id === "all") continue;
    const sTh = st.labelTh.toLowerCase();
    const sEn = st.labelEn.toLowerCase();
    if (
      sTh.includes(qNorm) ||
      qNorm.includes(sTh) ||
      sEn.includes(qNorm) ||
      qNorm.includes(sEn) ||
      searchTerms.some((t) => sTh.includes(t) || sEn.includes(t))
    ) {
      matchedStyleIds.add(st.id);
    }
  }

  // First pass: identify Tier-1 direct matches and collect their styles/regions/tags to power Tier-2 expansion
  const tier1Styles = new Set<string>(matchedStyleIds);
  const tier1Regions = new Set<ThailandRegionId>(matchedRegions);
  const tier1Tags = new Set<string>();

  const directScores = new Map<string, number>();

  for (const { dto, districtTh } of pins) {
    let directScore = 0;
    const hotelTh = dto.hotelNameTh.toLowerCase();
    const hotelEn = dto.hotelNameEn.toLowerCase();
    const slug = dto.hotelSlug.toLowerCase();
    const titleTh = dto.titleTh.toLowerCase();
    const titleEn = dto.titleEn.toLowerCase();
    const descTh = dto.descriptionTh.toLowerCase();
    const descEn = dto.descriptionEn.toLowerCase();
    const provTh = dto.provinceNameTh.toLowerCase();
    const provEn = dto.provinceNameEn.toLowerCase();
    const dist = (districtTh || "").toLowerCase();
    const tagsLow = dto.semanticTags.map((t) => t.toLowerCase());

    if (matchedProvinceIds.has(dto.provinceId)) {
      directScore += 1500;
    }

    if (
      hotelTh.includes(qNorm) ||
      hotelEn.includes(qNorm) ||
      slug.includes(qNorm)
    ) {
      directScore += 1800;
    }
    if (dist && (dist.includes(qNorm) || qNorm.includes(dist))) {
      directScore += 1400;
    }
    if (titleTh.includes(qNorm) || titleEn.includes(qNorm)) {
      directScore += 1250;
    }
    if (tagsLow.some((tg) => tg.includes(qNorm) || qNorm.includes(tg))) {
      directScore += 1100;
    }
    if (descTh.includes(qNorm) || descEn.includes(qNorm)) {
      directScore += 900;
    }

    // Token-level partial matching
    let matchedTokenCount = 0;
    for (const term of searchTerms) {
      let tokenHit = false;
      if (hotelTh.includes(term) || hotelEn.includes(term)) {
        directScore += 450;
        tokenHit = true;
      }
      if (provTh.includes(term) || provEn.includes(term) || dist.includes(term)) {
        directScore += 400;
        tokenHit = true;
      }
      if (titleTh.includes(term) || titleEn.includes(term)) {
        directScore += 320;
        tokenHit = true;
      }
      if (tagsLow.some((tg) => tg.includes(term))) {
        directScore += 260;
        tokenHit = true;
      }
      if (descTh.includes(term) || descEn.includes(term)) {
        directScore += 160;
        tokenHit = true;
      }
      if (tokenHit) matchedTokenCount += 1;
    }

    if (matchedTokenCount > 1) {
      directScore += matchedTokenCount * 220;
    }

    if (directScore > 0) {
      directScores.set(dto.id, directScore);
      for (const st of dto.stayStyles) tier1Styles.add(st);
      const provObj = getProvinceById(dto.provinceId);
      if (provObj) tier1Regions.add(provObj.region);
      for (const tg of tagsLow) tier1Tags.add(tg);
    }
  }

  // Second pass: score all pins across Tier 1 -> Tier 2 -> Tier 3
  const totalCount = Math.max(1, pins.length);
  const scored = pins.map(({ dto }, idx) => {
    const tier1 = directScores.get(dto.id) ?? 0;
    const baseTasteScore = ((totalCount - idx) / totalCount) * 180; // 1..180

    if (tier1 > 0) {
      return {
        dto,
        score: 1000 + tier1 + baseTasteScore,
      };
    }

    // Tier 2: Semantic style / region / tag similarity
    let tier2 = 0;
    const provObj = getProvinceById(dto.provinceId);
    if (provObj && tier1Regions.has(provObj.region)) {
      tier2 += 360;
    }
    for (const st of dto.stayStyles) {
      if (tier1Styles.has(st)) {
        tier2 += 240;
      }
    }
    for (const tg of dto.semanticTags) {
      if (tier1Tags.has(tg.toLowerCase())) {
        tier2 += 120;
      }
    }

    if (tier2 > 0) {
      return {
        dto,
        score: 200 + Math.min(790, tier2) + baseTasteScore * 0.5,
      };
    }

    // Tier 3: Taste-Personalized Discovery Fallback
    return {
      dto,
      score: baseTasteScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.dto);
}

interface PublicDiscoveryCandidate {
  dto: PinFeedItemDto;
  districtTh: string;
  referencePrice: number | null;
}

async function fetchPublicDiscoveryCandidatesFromDb(params: {
  style: string | null;
  placeCategory: PlaceCategoryDto | "ALL";
  provinceId: string | null;
  sourceType: "ALL" | "INTERNAL" | "EXTERNAL";
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  take: number;
  compact: boolean;
}): Promise<PublicDiscoveryCandidate[]> {
  const { style, placeCategory, provinceId, sourceType, bounds, take, compact } =
    params;
  const nowDate = new Date();

  const hotelFilter: Prisma.HotelWhereInput = {
    isPublished: true,
    verificationStatus: { not: "SUSPENDED" },
  };
  if (placeCategory !== "ALL") {
    hotelFilter.placeCategory = placeCategory;
  }
  if (bounds) {
    hotelFilter.locationScope = { not: "NATIONWIDE_ONLINE" };
    hotelFilter.latitude = { gte: bounds.south, lte: bounds.north };
    hotelFilter.longitude = { gte: bounds.west, lte: bounds.east };
  }

  const andConditions: Prisma.PinWhereInput[] = [
    {
      OR: [{ promoExpiresAt: null }, { promoExpiresAt: { gt: nowDate } }],
    },
  ];

  // Hybrid Card Rule:
  // - Map viewport (bounds): strictly canonical 1-location / geocoded places
  // - Home & Discovery feed: canonical single-location places + multi-campaign brand/credit-card promos
  if (bounds) {
    andConditions.push({ isCanonicalCard: true });
  } else {
    andConditions.push({
      OR: [
        { isCanonicalCard: true },
        {
          hotel: {
            locationScope: { in: ["MULTI_BRANCH", "NATIONWIDE_ONLINE"] },
          },
        },
      ],
    });
  }

  if (provinceId && provinceId !== "all") {
    if (provinceId === "nationwide") {
      andConditions.push({
        OR: [
          { provinceId: "nationwide" },
          {
            hotel: {
              locationScope: { in: ["MULTI_BRANCH", "NATIONWIDE_ONLINE"] },
            },
          },
        ],
      });
    } else {
      andConditions.push({
        OR: [
          { provinceId },
          {
            hotel: {
              locationScope: { in: ["MULTI_BRANCH", "NATIONWIDE_ONLINE"] },
              OR: [
                { eligibleProvinceIds: { isEmpty: true } },
                { eligibleProvinceIds: { has: provinceId } },
              ],
            },
          },
        ],
      });
    }
  }

  const where: Prisma.PinWhereInput = {
    publishStatus: "PUBLISHED",
    AND: andConditions,
    hotel: hotelFilter,
  };

  if (sourceType === "INTERNAL" || sourceType === "EXTERNAL") {
    where.dealSourceType = sourceType;
  }

  if (style && style !== "all") {
    where.stayStyles = { has: style };
  }

  const rawPins = await prisma.pin.findMany({
    where,
    orderBy: [
      { isSponsored: "desc" },
      { sponsoredPriority: "desc" },
      { likesCount: "desc" },
      { createdAt: "desc" },
    ],
    take,
    select: {
      id: true,
      hotelId: true,
      roomId: true,
      couponId: true,
      mediaType: true,
      category: true,
      titleTh: true,
      titleEn: true,
      coverImageUrl: true,
      videoUrl: true,
      aspectRatio: true,
      provinceId: true,
      stayStyles: true,
      sourcePlatform: true,
      dealSourceType: true,
      externalDealUrl: true,
      externalSourceName: true,
      promoHeadlineTh: true,
      promoHeadlineEn: true,
      promoCode: true,
      promoOriginalPriceThb: true,
      promoDealPriceThb: true,
      promoStartsAt: true,
      promoExpiresAt: true,
      promoCategoryCode: true,
      visualMode: true,
      externalClickCount: true,
      publishStatus: true,
      aiConfidenceScore: true,
      isSponsored: true,
      sponsoredPriority: true,
      likesCount: true,
      savesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
      ...(compact
        ? {}
        : {
            descriptionTh: true,
            descriptionEn: true,
            mediaUrls: true,
            semanticTags: true,
            aiTriageNote: true,
          }),
      hotel: {
        select: {
          slug: true,
          nameTh: true,
          nameEn: true,
          districtTh: true,
          placeCategory: true,
          merchantMode: true,
          locationScope: true,
          branchSummaryTh: true,
          branchSummaryEn: true,
          eligibleProvinceIds: true,
          externalWebsiteUrl: true,
          primaryCtaLabelTh: true,
          featuredCouponId: true,
          ...(compact
            ? {}
            : {
                addressTh: true,
                googleMapsUrl: true,
                nearbySpotsJson: true,
                logoUrl: true,
              }),
          latitude: true,
          longitude: true,
          verificationStatus: true,
          ratingAvg: true,
          rooms: {
            where: { isActive: true },
            select: {
              weekdayPriceThb: true,
            },
          },
          coupons: {
            where: { isActive: true, expiresAt: { gt: nowDate } },
            orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
            take: compact ? 2 : 8,
            select: PIN_COUPON_SELECT,
          },
        },
      },
      room: {
        select: {
          code: true,
          nameTh: true,
          nameEn: true,
          weekdayPriceThb: true,
        },
      },
      coupon: {
        select: PIN_COUPON_SELECT,
      },
    },
  });

  const emptySet = new Set<string>();
  return rawPins.map((p) => {
    const referencePrice =
      p.room?.weekdayPriceThb ??
      (p.hotel.rooms.length > 0
        ? Math.min(...p.hotel.rooms.map((r) => r.weekdayPriceThb))
        : null);

    const mapped = mapPinToDto(
      {
        ...p,
        descriptionTh: "descriptionTh" in p && typeof p.descriptionTh === "string" ? p.descriptionTh : "",
        descriptionEn: "descriptionEn" in p && typeof p.descriptionEn === "string" ? p.descriptionEn : "",
        mediaUrls: "mediaUrls" in p && Array.isArray(p.mediaUrls) ? p.mediaUrls : [p.coverImageUrl],
        semanticTags: "semanticTags" in p && Array.isArray(p.semanticTags) ? p.semanticTags : [],
        aiTriageNote: "aiTriageNote" in p && typeof p.aiTriageNote === "string" ? p.aiTriageNote : null,
        hotel: {
          ...p.hotel,
          logoUrl: "logoUrl" in p.hotel ? p.hotel.logoUrl : null,
          addressTh: "addressTh" in p.hotel ? p.hotel.addressTh : null,
          googleMapsUrl:
            "googleMapsUrl" in p.hotel ? p.hotel.googleMapsUrl : null,
          nearbySpotsJson:
            "nearbySpotsJson" in p.hotel ? p.hotel.nearbySpotsJson : null,
        },
      },
      emptySet,
      emptySet
    );

    const dto = compact
      ? {
          ...mapped,
          descriptionTh: "",
          descriptionEn: "",
          mediaUrls: [mapped.coverImageUrl],
          hotelAddressTh: "",
          hotelGoogleMapsUrl: null,
          hotelNearbySpots: [],
          activeCoupons: mapped.activeCoupon ? [mapped.activeCoupon] : [],
          semanticTags: [],
          aiTriageNote: null,
        }
      : mapped;

    return {
      dto,
      districtTh: p.hotel.districtTh || "",
      referencePrice,
    };
  });
}

function getCachedPublicDiscoveryCandidates(params: {
  style: string | null;
  placeCategory: PlaceCategoryDto | "ALL";
  provinceId: string | null;
  sourceType: "ALL" | "INTERNAL" | "EXTERNAL";
  take: number;
  compact: boolean;
}): Promise<PublicDiscoveryCandidate[]> {
  const normalizedKey = JSON.stringify({
    c: params.compact ? 1 : 0,
    cat: params.placeCategory,
    p: params.provinceId ?? "all",
    src: params.sourceType,
    st: params.style ?? "all",
    t: params.take,
  });

  return unstable_cache(
    async () => fetchPublicDiscoveryCandidatesFromDb(params),
    ["nondii-discovery-pins-v2", normalizedKey],
    {
      revalidate: 300, // 5m server cache; immediately purged on host/admin mutations
      tags: [
        NONDII_CACHE_TAGS.places,
        NONDII_CACHE_TAGS.placeList,
        NONDII_CACHE_TAGS.homeFeed,
        NONDII_CACHE_TAGS.exploreFeed,
      ],
    }
  )();
}

export async function searchDiscoveryPins(
  params: SearchStaysParams
): Promise<PinFeedItemDto[]> {
  const {
    style,
    placeCategory,
    provinceId,
    sourceType,
    q,
    maxPriceThb,
    bounds,
    limit = 60,
    userId,
    visitorId,
    hasAnalyticsConsent,
    sessionSignal,
    originProvinceId,
    deviceType,
    compact = false,
  } = params;

  const trimmedQuery = q?.trim() || "";
  const effectiveStyle =
    style && style !== "all" && !trimmedQuery ? style : null;
  const effectiveCategory: PlaceCategoryDto | "ALL" =
    placeCategory && placeCategory !== "ALL" ? placeCategory : "ALL";
  const effectiveProvince =
    provinceId && provinceId !== "all" ? provinceId : null;
  const effectiveSource: "ALL" | "INTERNAL" | "EXTERNAL" =
    sourceType === "INTERNAL" || sourceType === "EXTERNAL" ? sourceType : "ALL";
  const take = compact ? Math.min(limit, 80) : Math.min(limit * 2, 120);

  // Parallelize cached public candidates + per-user taste profile (zero personalization leakage)
  const [publicCandidates, taste] = await Promise.all([
    bounds
      ? fetchPublicDiscoveryCandidatesFromDb({
          style: effectiveStyle,
          placeCategory: effectiveCategory,
          provinceId: effectiveProvince,
          sourceType: effectiveSource,
          bounds,
          take,
          compact,
        })
      : getCachedPublicDiscoveryCandidates({
          style: effectiveStyle,
          placeCategory: effectiveCategory,
          provinceId: effectiveProvince,
          sourceType: effectiveSource,
          take,
          compact,
        }),
    loadMergedTasteContext({
      userId,
      visitorId,
      hasAnalyticsConsent,
      sessionSignal,
      originProvinceId,
      deviceType,
    }),
  ]);

  const filteredCandidates = publicCandidates.filter((item) => {
    if (
      maxPriceThb &&
      item.referencePrice !== null &&
      item.referencePrice > maxPriceThb
    ) {
      return false;
    }
    return true;
  });

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();

  if (userId && filteredCandidates.length > 0) {
    const pinIds = filteredCandidates.map((item) => item.dto.id);
    const [likes, saves] = await Promise.all([
      prisma.pinLike.findMany({
        where: { userId, pinId: { in: pinIds } },
        select: { pinId: true },
      }),
      prisma.savedBoardPin.findMany({
        where: { userId, pinId: { in: pinIds } },
        select: { pinId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.pinId));
    savedSet = new Set(saves.map((s) => s.pinId));
  }

  const districtByPinId = new Map<string, string>();
  const candidateDtos = filteredCandidates.map((item) => {
    districtByPinId.set(item.dto.id, item.districtTh);
    if (!userId) return item.dto;
    return {
      ...item.dto,
      isLikedByMe: likedSet.has(item.dto.id),
      isSavedByMe: savedSet.has(item.dto.id),
    };
  });

  const personalizedBase = rankPersonalizedHomeFeed({
    candidates: candidateDtos,
    taste,
    activeStyleFilter: style,
    limit: candidateDtos.length,
  });

  if (trimmedQuery) {
    const rankedBySearch = rankPinsByZeroDeadEndSearch({
      pins: personalizedBase.map((dto) => ({
        dto,
        districtTh: districtByPinId.get(dto.id) || "",
      })),
      query: trimmedQuery,
    });
    return rankedBySearch.slice(0, limit);
  }

  return personalizedBase.slice(0, limit);
}

interface CachedPinDetailBase {
  anchorDto: PinFeedItemDto;
  candidateDtos: PinFeedItemDto[];
  hotelPosts: HotelPostSummaryDto[];
  ownerFeedPosts: HotelPostSummaryDto[];
  ownerBlogs: HotelPostSummaryDto[];
  nearbyPlaces: PinFeedItemDto[];
  coSaveScoreByPinIdEntries: Array<[string, number]>;
  coSaveScoreByHotelIdEntries: Array<[string, number]>;
}

async function fetchPublicPinDetailBaseFromDb(
  pinId: string
): Promise<CachedPinDetailBase | null> {
  const rawPin = await prisma.pin.findUnique({
    where: { id: pinId },
    include: {
      hotel: {
        select: {
          slug: true,
          nameTh: true,
          nameEn: true,
          districtTh: true,
          addressTh: true,
          placeCategory: true,
          merchantMode: true,
          locationScope: true,
          branchSummaryTh: true,
          branchSummaryEn: true,
          eligibleProvinceIds: true,
          externalWebsiteUrl: true,
          primaryCtaLabelTh: true,
          featuredCouponId: true,
          latitude: true,
          longitude: true,
          googleMapsUrl: true,
          nearbySpotsJson: true,
          logoUrl: true,
          verificationStatus: true,
          ratingAvg: true,
          rooms: {
            where: { isActive: true },
            select: { weekdayPriceThb: true },
          },
          coupons: {
            where: { isActive: true, expiresAt: { gt: new Date() } },
            orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
            take: 12,
            select: PIN_COUPON_SELECT,
          },
        },
      },
      room: {
        select: {
          code: true,
          nameTh: true,
          nameEn: true,
          weekdayPriceThb: true,
        },
      },
      coupon: { select: PIN_COUPON_SELECT },
    },
  });

  if (!rawPin || rawPin.publishStatus !== "PUBLISHED") {
    return null;
  }

  const [relatedRaw, rawHotelPosts, anchorBoards] = await Promise.all([
    prisma.pin.findMany({
      where: {
        id: { not: pinId },
        hotelId: { not: rawPin.hotelId },
        publishStatus: "PUBLISHED",
        isCanonicalCard: true,
        hotel: {
          isPublished: true,
          verificationStatus: { not: "SUSPENDED" },
        },
      },
      orderBy: [
        { isSponsored: "desc" },
        { likesCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 64,
      select: {
        id: true,
        hotelId: true,
        roomId: true,
        couponId: true,
        mediaType: true,
        category: true,
        titleTh: true,
        titleEn: true,
        coverImageUrl: true,
        videoUrl: true,
        aspectRatio: true,
        provinceId: true,
        stayStyles: true,
        semanticTags: true,
        sourcePlatform: true,
        dealSourceType: true,
        externalDealUrl: true,
        externalSourceName: true,
        promoHeadlineTh: true,
        promoHeadlineEn: true,
        promoCode: true,
        promoOriginalPriceThb: true,
        promoDealPriceThb: true,
        promoStartsAt: true,
        promoExpiresAt: true,
        promoCategoryCode: true,
        visualMode: true,
        externalClickCount: true,
        publishStatus: true,
        aiConfidenceScore: true,
        isSponsored: true,
        sponsoredPriority: true,
        likesCount: true,
        savesCount: true,
        commentsCount: true,
        sharesCount: true,
        createdAt: true,
        hotel: {
          select: {
            slug: true,
            nameTh: true,
            nameEn: true,
            districtTh: true,
            placeCategory: true,
            merchantMode: true,
            locationScope: true,
            branchSummaryTh: true,
            branchSummaryEn: true,
            eligibleProvinceIds: true,
            externalWebsiteUrl: true,
            primaryCtaLabelTh: true,
            featuredCouponId: true,
            latitude: true,
            longitude: true,
            logoUrl: true,
            verificationStatus: true,
            ratingAvg: true,
            rooms: {
              where: { isActive: true },
              select: { weekdayPriceThb: true },
            },
            coupons: {
              where: { isActive: true, expiresAt: { gt: new Date() } },
              orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
              take: 2,
              select: PIN_COUPON_SELECT,
            },
          },
        },
        room: {
          select: {
            code: true,
            nameTh: true,
            nameEn: true,
            weekdayPriceThb: true,
          },
        },
        coupon: { select: PIN_COUPON_SELECT },
      },
    }),
    prisma.hotelPost
      .findMany({
        where: {
          hotelId: rawPin.hotelId,
          status: "PUBLISHED",
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 16,
        include: {
          room: {
            select: {
              code: true,
              nameTh: true,
              weekdayPriceThb: true,
            },
          },
        },
      })
      .catch(() => []),
    prisma.savedBoardPin
      .findMany({
        where: {
          OR: [{ pinId }, { pin: { hotelId: rawPin.hotelId } }],
        },
        take: 40,
        select: { boardId: true },
      })
      .catch(() => []),
  ]);

  const coSaveScoreByPinId = new Map<string, number>();
  const coSaveScoreByHotelId = new Map<string, number>();

  if (anchorBoards.length > 0) {
    const boardIds = Array.from(new Set(anchorBoards.map((b) => b.boardId)));
    const coSavedEntries = await prisma.savedBoardPin
      .findMany({
        where: {
          boardId: { in: boardIds },
          pinId: { not: pinId },
        },
        take: 160,
        select: {
          pinId: true,
          pin: { select: { hotelId: true } },
        },
      })
      .catch(() => []);

    for (const entry of coSavedEntries) {
      coSaveScoreByPinId.set(
        entry.pinId,
        (coSaveScoreByPinId.get(entry.pinId) ?? 0) + 1
      );
      if (entry.pin.hotelId !== rawPin.hotelId) {
        coSaveScoreByHotelId.set(
          entry.pin.hotelId,
          (coSaveScoreByHotelId.get(entry.pin.hotelId) ?? 0) + 1
        );
      }
    }
  }

  const emptySet = new Set<string>();
  const anchorDto = mapPinToDto(rawPin, emptySet, emptySet);
  const candidateDtos = relatedRaw.map((r) =>
    mapPinToDto(
      {
        ...r,
        descriptionTh: "",
        descriptionEn: "",
        mediaUrls: [r.coverImageUrl],
        aiTriageNote: null,
        hotel: {
          ...r.hotel,
          addressTh: null,
          googleMapsUrl: null,
          nearbySpotsJson: null,
        },
      },
      emptySet,
      emptySet
    )
  );

  const hotelPosts = rawHotelPosts.map((post) =>
    mapHotelPostToSummaryDto(post, {
      slug: rawPin.hotel.slug,
      nameTh: rawPin.hotel.nameTh,
      logoUrl: rawPin.hotel.logoUrl,
      verificationStatus: rawPin.hotel.verificationStatus,
      provinceId: rawPin.provinceId,
    })
  );

  const ownerFeedPosts = hotelPosts.filter((p) => p.postKind === "FEED_POST");
  const ownerBlogs = hotelPosts.filter((p) => p.postKind !== "FEED_POST");

  let nearbyPlaces: PinFeedItemDto[] = [];
  if (
    typeof anchorDto.hotelLatitude === "number" &&
    typeof anchorDto.hotelLongitude === "number"
  ) {
    const withDist = candidateDtos
      .filter(
        (c) =>
          typeof c.hotelLatitude === "number" &&
          typeof c.hotelLongitude === "number"
      )
      .map((c) => {
        const km = computeHaversineKm(
          anchorDto.hotelLatitude!,
          anchorDto.hotelLongitude!,
          c.hotelLatitude!,
          c.hotelLongitude!
        );
        return { ...c, distanceKm: Math.round(km * 10) / 10 };
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    const withinLocalRadius = withDist.filter(
      (c) => (c.distanceKm ?? 9999) <= 85
    );
    nearbyPlaces = (
      withinLocalRadius.length >= 3 ? withinLocalRadius : withDist
    ).slice(0, 10);
  } else {
    nearbyPlaces = candidateDtos
      .filter((c) => c.provinceId === anchorDto.provinceId)
      .slice(0, 10);
  }

  return {
    anchorDto,
    candidateDtos,
    hotelPosts,
    ownerFeedPosts,
    ownerBlogs,
    nearbyPlaces,
    coSaveScoreByPinIdEntries: Array.from(coSaveScoreByPinId.entries()),
    coSaveScoreByHotelIdEntries: Array.from(coSaveScoreByHotelId.entries()),
  };
}

function getCachedPinDetailBase(
  pinId: string
): Promise<CachedPinDetailBase | null> {
  return unstable_cache(
    async () => fetchPublicPinDetailBaseFromDb(pinId),
    [`nondii-pin-detail-base-v1-${pinId}`],
    {
      revalidate: 600, // 10m cache; invalidated on pin/hotel mutation
      tags: [
        NONDII_CACHE_TAGS.places,
        NONDII_CACHE_TAGS.pinDetail,
        NONDII_CACHE_TAGS.pin(pinId),
      ],
    }
  )();
}

export async function getPinDetailById(
  pinId: string,
  userId?: string | null,
  hints?: PersonalizationRequestHints
): Promise<{
  pin: PinFeedItemDto;
  comments: PinCommentDto[];
  relatedPins: PinFeedItemDto[];
  hotelPosts: HotelPostSummaryDto[];
  ownerFeedPosts: HotelPostSummaryDto[];
  ownerBlogs: HotelPostSummaryDto[];
  nearbyPlaces: PinFeedItemDto[];
} | null> {
  const [base, rawComments, taste] = await Promise.all([
    getCachedPinDetailBase(pinId),
    prisma.pinComment.findMany({
      where: { pinId, status: "VISIBLE" },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    }),
    loadMergedTasteContext({
      userId,
      visitorId: hints?.visitorId,
      hasAnalyticsConsent: hints?.hasAnalyticsConsent,
      sessionSignal: hints?.sessionSignal,
      originProvinceId: hints?.originProvinceId,
      deviceType: hints?.deviceType,
    }),
  ]);

  if (!base) {
    return null;
  }

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();

  if (userId) {
    const allPinIds = [
      base.anchorDto.id,
      ...base.candidateDtos.map((c) => c.id),
    ];
    const [likes, saves] = await Promise.all([
      prisma.pinLike.findMany({
        where: { userId, pinId: { in: allPinIds } },
        select: { pinId: true },
      }),
      prisma.savedBoardPin.findMany({
        where: { userId, pinId: { in: allPinIds } },
        select: { pinId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.pinId));
    savedSet = new Set(saves.map((s) => s.pinId));
  }

  const commentMap = new Map<string, PinCommentDto>();
  const topLevelComments: PinCommentDto[] = [];

  for (const c of rawComments) {
    const dto: PinCommentDto = {
      id: c.id,
      pinId: c.pinId,
      userId: c.userId,
      authorName: c.user.name || c.user.email.split("@")[0],
      authorAvatar: c.user.avatarUrl,
      parentId: c.parentId,
      isHotelOwnerReply: c.isHotelOwnerReply,
      body: c.body,
      likesCount: c.likesCount,
      createdAt: c.createdAt.toISOString(),
      replies: [],
    };
    commentMap.set(c.id, dto);
  }

  for (const dto of commentMap.values()) {
    if (dto.parentId && commentMap.has(dto.parentId)) {
      commentMap.get(dto.parentId)!.replies.push(dto);
    } else {
      topLevelComments.push(dto);
    }
  }

  const anchorDto = userId
    ? {
        ...base.anchorDto,
        isLikedByMe: likedSet.has(base.anchorDto.id),
        isSavedByMe: savedSet.has(base.anchorDto.id),
      }
    : base.anchorDto;

  const candidateDtos = userId
    ? base.candidateDtos.map((c) => ({
        ...c,
        isLikedByMe: likedSet.has(c.id),
        isSavedByMe: savedSet.has(c.id),
      }))
    : base.candidateDtos;

  const nearbyPlaces = userId
    ? base.nearbyPlaces.map((c) => ({
        ...c,
        isLikedByMe: likedSet.has(c.id),
        isSavedByMe: savedSet.has(c.id),
      }))
    : base.nearbyPlaces;

  const coSaveScoreByPinId = new Map<string, number>(
    base.coSaveScoreByPinIdEntries
  );
  const coSaveScoreByHotelId = new Map<string, number>(
    base.coSaveScoreByHotelIdEntries
  );

  const rankedRelated = rankRelatedPinsForPin({
    anchorPin: anchorDto,
    candidates: candidateDtos,
    coSaveScoreByPinId,
    coSaveScoreByHotelId,
    taste,
    limit: 24,
  });

  return {
    pin: anchorDto,
    comments: topLevelComments,
    relatedPins: rankedRelated,
    hotelPosts: base.hotelPosts,
    ownerFeedPosts: base.ownerFeedPosts,
    ownerBlogs: base.ownerBlogs,
    nearbyPlaces,
  };
}

export async function getRecentViewedPinIdsForRequest(params: {
  userId?: string | null;
  visitorId?: string | null;
  hasAnalyticsConsent?: boolean;
  limit?: number;
}): Promise<string[]> {
  const { userId, visitorId, hasAnalyticsConsent = false, limit = 24 } = params;
  if (!userId && !(hasAnalyticsConsent && visitorId)) return [];

  const profile = await prisma.visitorTasteProfile
    .findFirst({
      where: userId
        ? {
            OR: [
              { userId },
              ...(hasAnalyticsConsent && visitorId ? [{ visitorId }] : []),
            ],
          }
        : { visitorId: visitorId! },
      select: { recentViewedPinIds: true },
    })
    .catch(() => null);

  if (!profile?.recentViewedPinIds?.length) return [];

  // recentViewedPinIds is appended oldest -> newest; reverse for most-recent-first
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (let i = profile.recentViewedPinIds.length - 1; i >= 0; i--) {
    const id = profile.recentViewedPinIds[i]?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
    if (ordered.length >= limit) break;
  }
  return ordered;
}

export async function getPinsByIds(
  pinIds: string[],
  userId?: string | null
): Promise<PinFeedItemDto[]> {
  const cleanIds = Array.from(
    new Set(pinIds.map((id) => id.trim()).filter(Boolean))
  ).slice(0, 30);

  if (cleanIds.length === 0) return [];

  const nowDate = new Date();
  const rawPins = await prisma.pin.findMany({
    where: {
      id: { in: cleanIds },
      publishStatus: "PUBLISHED",
      AND: [
        {
          OR: [{ promoExpiresAt: null }, { promoExpiresAt: { gt: nowDate } }],
        },
      ],
      hotel: {
        isPublished: true,
        verificationStatus: { not: "SUSPENDED" },
      },
    },
    include: {
      hotel: {
        select: {
          slug: true,
          nameTh: true,
          nameEn: true,
          districtTh: true,
          addressTh: true,
          placeCategory: true,
          merchantMode: true,
          locationScope: true,
          branchSummaryTh: true,
          branchSummaryEn: true,
          eligibleProvinceIds: true,
          externalWebsiteUrl: true,
          primaryCtaLabelTh: true,
          featuredCouponId: true,
          latitude: true,
          longitude: true,
          googleMapsUrl: true,
          nearbySpotsJson: true,
          logoUrl: true,
          verificationStatus: true,
          ratingAvg: true,
          rooms: {
            where: { isActive: true },
            select: {
              id: true,
              weekdayPriceThb: true,
              maxGuests: true,
            },
          },
          coupons: {
            where: { isActive: true, expiresAt: { gt: nowDate } },
            orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
            take: 6,
            select: PIN_COUPON_SELECT,
          },
        },
      },
      room: {
        select: {
          id: true,
          code: true,
          nameTh: true,
          nameEn: true,
          weekdayPriceThb: true,
          maxGuests: true,
        },
      },
      coupon: {
        select: PIN_COUPON_SELECT,
      },
    },
  });

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();

  if (userId && rawPins.length > 0) {
    const foundIds = rawPins.map((p) => p.id);
    const [likes, saves] = await Promise.all([
      prisma.pinLike.findMany({
        where: { userId, pinId: { in: foundIds } },
        select: { pinId: true },
      }),
      prisma.savedBoardPin.findMany({
        where: { userId, pinId: { in: foundIds } },
        select: { pinId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.pinId));
    savedSet = new Set(saves.map((s) => s.pinId));
  }

  const byId = new Map<string, PinFeedItemDto>();
  for (const p of rawPins) {
    byId.set(p.id, mapPinToDto(p, likedSet, savedSet));
  }

  const ordered: PinFeedItemDto[] = [];
  for (const id of cleanIds) {
    const dto = byId.get(id);
    if (dto) ordered.push(dto);
  }
  return ordered;
}

