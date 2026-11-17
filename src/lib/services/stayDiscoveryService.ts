import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getProvinceById,
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
  type ThailandRegionId,
} from "@/data/thailandProvinces";
import { mapPinToDto } from "@/lib/services/pinMapper";
import {
  loadMergedTasteContext,
  rankPersonalizedHomeFeed,
  rankRelatedPinsForPin,
} from "@/lib/services/recommendationEngine";
import type { CompactSessionTasteSignal } from "@/lib/telemetry/tasteTypes";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

export interface PersonalizationRequestHints {
  visitorId?: string | null;
  hasAnalyticsConsent?: boolean;
  sessionSignal?: CompactSessionTasteSignal | null;
  originProvinceId?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop";
}

export interface SearchStaysParams extends PersonalizationRequestHints {
  style?: string | null;
  provinceId?: string | null;
  q?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  maxPriceThb?: number | null;
  limit?: number;
  userId?: string | null;
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

export async function searchDiscoveryPins(
  params: SearchStaysParams
): Promise<PinFeedItemDto[]> {
  const {
    style,
    q,
    maxPriceThb,
    limit = 60,
    userId,
    visitorId,
    hasAnalyticsConsent,
    sessionSignal,
    originProvinceId,
    deviceType,
  } = params;

  const trimmedQuery = q?.trim() || "";

  const where: Prisma.PinWhereInput = {
    publishStatus: "PUBLISHED",
    hotel: {
      isPublished: true,
      verificationStatus: { not: "SUSPENDED" },
    },
  };

  // Only apply hard style filter when browsing a specific category tab without a text search
  if (style && style !== "all" && !trimmedQuery) {
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
    take: Math.min(limit * 2, 120),
    include: {
      hotel: {
        select: {
          slug: true,
          nameTh: true,
          nameEn: true,
          districtTh: true,
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
        select: { code: true },
      },
    },
  });

  const filteredPins = rawPins.filter((pin) => {
    const referencePrice =
      pin.room?.weekdayPriceThb ??
      (pin.hotel.rooms.length > 0
        ? Math.min(...pin.hotel.rooms.map((r) => r.weekdayPriceThb))
        : null);

    if (maxPriceThb && referencePrice && referencePrice > maxPriceThb) {
      return false;
    }
    return true;
  });

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();

  if (userId && filteredPins.length > 0) {
    const pinIds = filteredPins.map((p) => p.id);
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
  const candidateDtos = filteredPins.map((p) => {
    districtByPinId.set(p.id, p.hotel.districtTh || "");
    return mapPinToDto(p, likedSet, savedSet);
  });

  const taste = await loadMergedTasteContext({
    userId,
    visitorId,
    hasAnalyticsConsent,
    sessionSignal,
    originProvinceId,
    deviceType,
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

export async function getPinDetailById(
  pinId: string,
  userId?: string | null,
  hints?: PersonalizationRequestHints
): Promise<{
  pin: PinFeedItemDto;
  comments: PinCommentDto[];
  relatedPins: PinFeedItemDto[];
} | null> {
  const rawPin = await prisma.pin.findUnique({
    where: { id: pinId },
    include: {
      hotel: {
        select: {
          slug: true,
          nameTh: true,
          nameEn: true,
          logoUrl: true,
          verificationStatus: true,
          ratingAvg: true,
          rooms: {
            where: { isActive: true },
            select: { weekdayPriceThb: true },
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
      coupon: { select: { code: true } },
    },
  });

  if (!rawPin || rawPin.publishStatus !== "PUBLISHED") {
    return null;
  }

  const [rawComments, relatedRaw, anchorBoards, userLike, userSave, taste] =
    await Promise.all([
      prisma.pinComment.findMany({
        where: { pinId, status: "VISIBLE" },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.pin.findMany({
        where: {
          id: { not: pinId },
          publishStatus: "PUBLISHED",
          hotel: {
            isPublished: true,
            verificationStatus: { not: "SUSPENDED" },
          },
        },
        orderBy: [{ isSponsored: "desc" }, { likesCount: "desc" }, { createdAt: "desc" }],
        take: 100,
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              verificationStatus: true,
              ratingAvg: true,
              rooms: {
                where: { isActive: true },
                select: { weekdayPriceThb: true },
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
          coupon: { select: { code: true } },
        },
      }),
      prisma.savedBoardPin
        .findMany({
          where: {
            OR: [{ pinId }, { pin: { hotelId: rawPin.hotelId } }],
          },
          take: 40,
          select: { boardId: true },
        })
        .catch(() => []),
      userId
        ? prisma.pinLike.findUnique({
            where: { userId_pinId: { userId, pinId } },
            select: { pinId: true },
          })
        : Promise.resolve(null),
      userId
        ? prisma.savedBoardPin.findFirst({
            where: { userId, pinId },
            select: { pinId: true },
          })
        : Promise.resolve(null),
      loadMergedTasteContext({
        userId,
        visitorId: hints?.visitorId,
        hasAnalyticsConsent: hints?.hasAnalyticsConsent,
        sessionSignal: hints?.sessionSignal,
        originProvinceId: hints?.originProvinceId,
        deviceType: hints?.deviceType,
      }),
    ]);

  // Collaborative Pixie-style Board Co-Save Graph
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

  let relatedLikedSet = new Set<string>();
  let relatedSavedSet = new Set<string>();
  if (userId && relatedRaw.length > 0) {
    const relatedIds = relatedRaw.map((r) => r.id);
    const [rLikes, rSaves] = await Promise.all([
      prisma.pinLike.findMany({
        where: { userId, pinId: { in: relatedIds } },
        select: { pinId: true },
      }),
      prisma.savedBoardPin.findMany({
        where: { userId, pinId: { in: relatedIds } },
        select: { pinId: true },
      }),
    ]);
    relatedLikedSet = new Set(rLikes.map((l) => l.pinId));
    relatedSavedSet = new Set(rSaves.map((s) => s.pinId));
  }

  // Group threaded replies under parent comments
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

  const likedSet = new Set<string>(userLike ? [pinId] : []);
  const savedSet = new Set<string>(userSave ? [pinId] : []);

  const anchorDto = mapPinToDto(rawPin, likedSet, savedSet);
  const candidateDtos = relatedRaw.map((r) =>
    mapPinToDto(r, relatedLikedSet, relatedSavedSet)
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
  };
}

