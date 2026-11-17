import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProvinceById } from "@/data/thailandProvinces";
import { isEasyWeekendDriveFromOrigin } from "@/lib/telemetry/geoHeaders";
import type { CompactSessionTasteSignal } from "@/lib/telemetry/tasteTypes";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface MergedTasteContext {
  styleWeights: Record<string, number>;
  provinceWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  targetBudgetThb: number | null;
  originProvinceId: string | null;
  deviceType: "mobile" | "tablet" | "desktop";
  recentViewedPinIds: Set<string>;
  recentSkippedPinIds: Set<string>;
  hasPersonalSignal: boolean;
}

function jsonToNumberMap(val: Prisma.JsonValue | null | undefined): Record<string, number> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      out[k] = v;
    }
  }
  return out;
}

function normalizeMap(map: Record<string, number>): Record<string, number> {
  const vals = Object.values(map);
  if (vals.length === 0) return {};
  const maxVal = Math.max(...vals, 0.001);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v > 0) out[k] = Math.min(1, v / maxVal);
  }
  return out;
}

/**
 * Loads & merges:
 * 1) Persisted `VisitorTasteProfile` (when consented / linked to `userId`),
 * 2) Authenticated user's historical Likes & SavedBoardPins,
 * 3) Live in-tab `CompactSessionTasteSignal` (1.35x recency boost — works even without cookies!),
 * 4) Coarse Edge Geo province & device type.
 */
export async function loadMergedTasteContext(params: {
  userId?: string | null;
  visitorId?: string | null;
  hasAnalyticsConsent?: boolean;
  sessionSignal?: CompactSessionTasteSignal | null;
  originProvinceId?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop";
}): Promise<MergedTasteContext> {
  const {
    userId,
    visitorId,
    hasAnalyticsConsent = false,
    sessionSignal,
    originProvinceId = null,
    deviceType = "desktop",
  } = params;

  const rawStyles: Record<string, number> = {};
  const rawProvinces: Record<string, number> = {};
  const rawTags: Record<string, number> = {};
  let budgetSum = 0;
  let budgetWeight = 0;
  let resolvedOriginProvince = originProvinceId;
  let resolvedDevice = deviceType;

  const recentViewed = new Set<string>(sessionSignal?.o ?? []);
  const recentSkipped = new Set<string>(sessionSignal?.x ?? []);

  // 1. Load persisted VisitorTasteProfile if consented or tied to logged-in user
  if ((hasAnalyticsConsent && visitorId) || userId) {
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
      })
      .catch(() => null);

    if (profile) {
      const dbStyles = jsonToNumberMap(profile.styleWeightsJson);
      const dbProvs = jsonToNumberMap(profile.provinceWeightsJson);
      const dbTags = jsonToNumberMap(profile.tagWeightsJson);

      for (const [k, v] of Object.entries(dbStyles)) {
        rawStyles[k] = (rawStyles[k] ?? 0) + v;
      }
      for (const [k, v] of Object.entries(dbProvs)) {
        rawProvinces[k] = (rawProvinces[k] ?? 0) + v;
      }
      for (const [k, v] of Object.entries(dbTags)) {
        rawTags[k] = (rawTags[k] ?? 0) + v;
      }
      if (profile.priceWeightTotal > 0 && profile.priceSumWeighted > 0) {
        budgetSum += profile.priceSumWeighted;
        budgetWeight += profile.priceWeightTotal;
      }
      if (!resolvedOriginProvince && profile.inferredProvinceId) {
        resolvedOriginProvince = profile.inferredProvinceId;
      }
      for (const id of profile.recentViewedPinIds) recentViewed.add(id);
      for (const id of profile.recentSkippedPinIds) {
        if (!recentViewed.has(id)) recentSkipped.add(id);
      }
    }
  }

  // 2. Fold in authenticated user's explicit Saves & Likes
  if (userId) {
    const [savedRows, likedRows] = await Promise.all([
      prisma.savedBoardPin
        .findMany({
          where: { userId },
          take: 25,
          orderBy: { createdAt: "desc" },
          select: {
            savedPriceSnapshotThb: true,
            pin: {
              select: {
                stayStyles: true,
                provinceId: true,
                semanticTags: true,
              },
            },
          },
        })
        .catch(() => []),
      prisma.pinLike
        .findMany({
          where: { userId },
          take: 25,
          orderBy: { createdAt: "desc" },
          select: {
            pin: {
              select: {
                stayStyles: true,
                provinceId: true,
                semanticTags: true,
              },
            },
          },
        })
        .catch(() => []),
    ]);

    for (const row of savedRows) {
      for (const st of row.pin.stayStyles) {
        rawStyles[st] = (rawStyles[st] ?? 0) + 4.5;
      }
      rawProvinces[row.pin.provinceId] =
        (rawProvinces[row.pin.provinceId] ?? 0) + 3.5;
      for (const tag of row.pin.semanticTags) {
        rawTags[tag] = (rawTags[tag] ?? 0) + 2.5;
      }
      if (row.savedPriceSnapshotThb && row.savedPriceSnapshotThb > 0) {
        budgetSum += row.savedPriceSnapshotThb * 3;
        budgetWeight += 3;
      }
    }

    for (const row of likedRows) {
      for (const st of row.pin.stayStyles) {
        rawStyles[st] = (rawStyles[st] ?? 0) + 2.5;
      }
      rawProvinces[row.pin.provinceId] =
        (rawProvinces[row.pin.provinceId] ?? 0) + 2.0;
      for (const tag of row.pin.semanticTags) {
        rawTags[tag] = (rawTags[tag] ?? 0) + 1.5;
      }
    }
  }

  // 3. Overlay live in-session taste with 1.4x recency multiplier (TikTok real-time intent)
  if (sessionSignal) {
    if (sessionSignal.v === "sm") resolvedDevice = "mobile";
    else if (sessionSignal.v === "md") resolvedDevice = "tablet";

    if (sessionSignal.s) {
      for (const [k, v] of Object.entries(sessionSignal.s)) {
        if (typeof v === "number" && v > 0) {
          rawStyles[k] = (rawStyles[k] ?? 0) + v * 1.4;
        }
      }
    }
    if (sessionSignal.p) {
      for (const [k, v] of Object.entries(sessionSignal.p)) {
        if (typeof v === "number" && v > 0) {
          rawProvinces[k] = (rawProvinces[k] ?? 0) + v * 1.4;
        }
      }
    }
    if (sessionSignal.t) {
      for (const [k, v] of Object.entries(sessionSignal.t)) {
        if (typeof v === "number" && v > 0) {
          rawTags[k] = (rawTags[k] ?? 0) + v * 1.3;
        }
      }
    }
    if (sessionSignal.b && sessionSignal.b > 0) {
      budgetSum += sessionSignal.b * 8;
      budgetWeight += 8;
    }
  }

  const styleWeights = normalizeMap(rawStyles);
  const provinceWeights = normalizeMap(rawProvinces);
  const tagWeights = normalizeMap(rawTags);
  const targetBudgetThb =
    budgetWeight > 0 ? Math.round(budgetSum / budgetWeight) : null;

  const hasPersonalSignal =
    Object.keys(styleWeights).length > 0 ||
    Object.keys(provinceWeights).length > 0 ||
    targetBudgetThb !== null;

  return {
    styleWeights,
    provinceWeights,
    tagWeights,
    targetBudgetThb,
    originProvinceId: resolvedOriginProvince,
    deviceType: resolvedDevice,
    recentViewedPinIds: recentViewed,
    recentSkippedPinIds: recentSkipped,
    hasPersonalSignal,
  };
}

function computePriceProximity01(
  priceA: number | null,
  priceB: number | null
): number {
  if (!priceA || !priceB || priceA <= 0 || priceB <= 0) return 0.55;
  const logDiff = Math.abs(Math.log(priceA / priceB));
  return Math.exp(-1.35 * logDiff);
}

function computeEngagementQuality01(pin: PinFeedItemDto): number {
  const weighted =
    4 * pin.savesCount +
    3 * pin.sharesCount +
    2 * pin.commentsCount +
    1 * pin.likesCount;
  // Log-damped so viral older pins don't permanently crush fresh stays
  return Math.min(1, Math.log1p(Math.max(0, weighted)) / Math.log1p(550));
}

function computeFreshness01(createdAtIso: string): number {
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(createdAtIso).getTime()) / (1000 * 60 * 60 * 24)
  );
  // Half-life around 28 days for cold-start boost
  return Math.exp(-ageDays / 40);
}

function computePersonalTasteScore01(
  pin: PinFeedItemDto,
  taste: MergedTasteContext
): number {
  if (!taste.hasPersonalSignal) return 0;

  let styleHit = 0;
  for (const s of pin.stayStyles) {
    styleHit = Math.max(styleHit, taste.styleWeights[s] ?? 0);
  }

  const provHit = taste.provinceWeights[pin.provinceId] ?? 0;

  let tagHit = 0;
  for (const t of pin.semanticTags) {
    tagHit = Math.max(tagHit, taste.tagWeights[t] ?? 0);
  }

  const budgetHit = taste.targetBudgetThb
    ? computePriceProximity01(pin.nightlyPriceThb, taste.targetBudgetThb)
    : 0.5;

  return Math.min(
    1,
    styleHit * 0.46 + provHit * 0.24 + tagHit * 0.14 + budgetHit * 0.16
  );
}

/**
 * MODE 1: "You May Also Like" / Related Pins Engine (`rankRelatedPinsForPin`)
 * - 6-Signal Scoring (Vibe 35% + Geo 20% + Price 15% + Co-Save 10% + Personal/Session 10% + Quality/Trust 10%)
 * - Strictly excludes same-hotel Pins in the primary recommendation set (so users discover OTHER matching stays!)
 * - Enforces Anti-Clumping across hotels + 70/20/10 Core vs Adjacent Exploration rhythm + Relevance-Gated Sponsored slots.
 */
export function rankRelatedPinsForPin(params: {
  anchorPin: PinFeedItemDto;
  candidates: PinFeedItemDto[];
  coSaveScoreByPinId?: ReadonlyMap<string, number>;
  coSaveScoreByHotelId?: ReadonlyMap<string, number>;
  taste: MergedTasteContext;
  limit?: number;
}): PinFeedItemDto[] {
  const {
    anchorPin,
    candidates,
    coSaveScoreByPinId = new Map(),
    coSaveScoreByHotelId = new Map(),
    taste,
    limit = 24,
  } = params;

  const anchorStyles = new Set(anchorPin.stayStyles);
  const anchorTags = new Set(
    anchorPin.semanticTags.map((t) => t.toLowerCase())
  );
  const anchorRegion = getProvinceById(anchorPin.provinceId)?.region ?? null;

  interface ScoredCandidate {
    pin: PinFeedItemDto;
    score: number;
    isAdjacentDiscovery: boolean;
    isRelevantSponsored: boolean;
  }

  const otherHotelCandidates: ScoredCandidate[] = [];
  const sameHotelFallback: PinFeedItemDto[] = [];

  for (const cand of candidates) {
    if (cand.id === anchorPin.id) continue;

    // User Decision #1: Hold out same-hotel posts from primary recommendations
    if (cand.hotelId === anchorPin.hotelId) {
      sameHotelFallback.push(cand);
      continue;
    }

    // 1. Vibe & Visual Similarity (0..35)
    let sharedStyles = 0;
    for (const s of cand.stayStyles) {
      if (anchorStyles.has(s)) sharedStyles += 1;
    }
    const minStyleDenom = Math.max(
      1,
      Math.min(anchorStyles.size || 1, cand.stayStyles.length || 1)
    );
    const styleRatio =
      anchorStyles.size > 0 ? Math.min(1, sharedStyles / minStyleDenom) : 0.3;

    let sharedTags = 0;
    for (const t of cand.semanticTags) {
      if (anchorTags.has(t.toLowerCase())) sharedTags += 1;
    }
    const tagRatio =
      anchorTags.size > 0
        ? Math.min(1, sharedTags / Math.max(1, Math.min(3, anchorTags.size)))
        : 0;

    const categoryMatch =
      cand.category === anchorPin.category
        ? 2.5
        : cand.mediaType === anchorPin.mediaType
        ? 1.5
        : 0;
    const videoMatch =
      Boolean(cand.videoUrl) === Boolean(anchorPin.videoUrl) ? 1.5 : 0;

    const vibeScore =
      styleRatio * 22 + tagRatio * 9 + categoryMatch + videoMatch; // max 35

    // 2. Destination & Region Affinity (0..20)
    const candRegion = getProvinceById(cand.provinceId)?.region ?? null;
    const sameProvince = cand.provinceId === anchorPin.provinceId;
    const sameRegion = Boolean(anchorRegion && candRegion === anchorRegion);
    let geoScore = 0;
    if (sameProvince) {
      geoScore = 20;
    } else if (sameRegion) {
      geoScore = 12;
    } else if (sharedStyles > 0) {
      geoScore = 5.5;
    }

    // 3. Price-Tier Proximity (0..15)
    const priceScore =
      15 * computePriceProximity01(anchorPin.nightlyPriceThb, cand.nightlyPriceThb);

    // 4. Collaborative Board Co-Save Signal (0..10)
    const pinCoSaves = coSaveScoreByPinId.get(cand.id) ?? 0;
    const hotelCoSaves = coSaveScoreByHotelId.get(cand.hotelId) ?? 0;
    const coSaveScore = Math.min(10, pinCoSaves * 4.5 + hotelCoSaves * 2.5);

    // 5. Personal & Live Session Taste + Fatigue Penalty (-14..+10)
    let personalScore = 10 * computePersonalTasteScore01(cand, taste);
    if (taste.recentSkippedPinIds.has(cand.id)) {
      personalScore -= 14;
    } else if (taste.recentViewedPinIds.has(cand.id)) {
      personalScore -= 6.5;
    }

    // 6. Quality, Trust & Promo Boost (0..10)
    const engScore = 4.5 * computeEngagementQuality01(cand);
    const verifiedBoost = cand.hotelVerificationStatus === "VERIFIED" ? 2.5 : 0;
    const couponBoost = cand.couponCode ? 1.5 : 0;
    const freshBoost = 1.5 * computeFreshness01(cand.createdAt);
    const qualityScore = engScore + verifiedBoost + couponBoost + freshBoost;

    // Relevance Gate for Sponsored Pins: must share at least 1 stayStyle OR same region/province!
    const isRelevantSponsored =
      cand.isSponsored && (sharedStyles > 0 || sameProvince || sameRegion);

    const totalScore =
      vibeScore +
      geoScore +
      priceScore +
      coSaveScore +
      personalScore +
      qualityScore;

    // Adjacent Discovery (20% bucket): either (same vibe in a DIFFERENT province) or (same province with a fresh style)
    const isAdjacentDiscovery =
      (sharedStyles > 0 && !sameProvince) ||
      (sameProvince && sharedStyles === 0) ||
      computeFreshness01(cand.createdAt) > 0.7;

    otherHotelCandidates.push({
      pin: cand,
      score: totalScore,
      isAdjacentDiscovery,
      isRelevantSponsored,
    });
  }

  // Greedy Diversity Re-ranker (Anti-clumping + 70/20/10 rhythm + Relevance-Gated Sponsored cap)
  const selected: PinFeedItemDto[] = [];
  const remaining = [...otherHotelCandidates];
  const hotelCountMap = new Map<string, number>();
  const lastHotelIndexMap = new Map<string, number>();
  let lastSponsoredSlot = -99;

  while (selected.length < limit && remaining.length > 0) {
    const slotIdx = selected.length;
    const isExplorationSlot = slotIdx % 5 === 3 || slotIdx % 5 === 4;
    const canPlaceSponsoredBoost = slotIdx - lastSponsoredSlot >= 6;

    let bestIdx = -1;
    let bestEffectiveScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const hid = item.pin.hotelId;
      const countSoFar = hotelCountMap.get(hid) ?? 0;
      const lastPos = lastHotelIndexMap.get(hid);

      let diversityPenalty = 0;
      // Strict anti-clumping: max 1 pin per hotel in top 8; min distance of 4 slots everywhere
      if (slotIdx < 8 && countSoFar >= 1) {
        diversityPenalty += 38;
      }
      if (lastPos !== undefined && slotIdx - lastPos < 4) {
        diversityPenalty += 50;
      } else if (countSoFar >= 2) {
        diversityPenalty += countSoFar * 12;
      }

      const explorationBonus =
        isExplorationSlot && item.isAdjacentDiscovery ? 6.5 : 0;
      const sponsoredBonus =
        canPlaceSponsoredBoost && item.isRelevantSponsored
          ? 7.5 + Math.min(3, item.pin.sponsoredPriority * 0.3)
          : 0;

      const effective =
        item.score + explorationBonus + sponsoredBonus - diversityPenalty;

      if (effective > bestEffectiveScore) {
        bestEffectiveScore = effective;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const chosen = remaining.splice(bestIdx, 1)[0];
    selected.push(chosen.pin);
    hotelCountMap.set(
      chosen.pin.hotelId,
      (hotelCountMap.get(chosen.pin.hotelId) ?? 0) + 1
    );
    lastHotelIndexMap.set(chosen.pin.hotelId, slotIdx);
    if (chosen.isRelevantSponsored && canPlaceSponsoredBoost) {
      lastSponsoredSlot = slotIdx;
    }
  }

  // Only if total catalog of other hotels is extremely tiny (< 4), append 1 fallback at the very tail
  if (selected.length < 4 && sameHotelFallback.length > 0) {
    selected.push(sameHotelFallback[0]);
  }

  return selected;
}

/**
 * MODE 2: Personalized Home Discovery Feed (`rankPersonalizedHomeFeed`)
 * - Adapts to VisitorTasteProfile + Live Session Taste + Coarse Origin Geo + Device Aspect Ergonomics
 * - Penalizes impression/skip fatigue so unseen stays surface first
 * - Enforces sliding-window hotel diversity and relevance-gated sponsored spacing.
 */
export function rankPersonalizedHomeFeed(params: {
  candidates: PinFeedItemDto[];
  taste: MergedTasteContext;
  activeStyleFilter?: string | null;
  limit?: number;
}): PinFeedItemDto[] {
  const { candidates, taste, activeStyleFilter, limit = 60 } = params;
  if (candidates.length <= 1) return candidates;

  interface ScoredFeedItem {
    pin: PinFeedItemDto;
    baseScore: number;
    isColdStartGem: boolean;
  }

  const scored: ScoredFeedItem[] = candidates.map((pin) => {
    // 1. Personal & In-Session Taste Affinity (0..42)
    const personalScore = taste.hasPersonalSignal
      ? 42 * computePersonalTasteScore01(pin, taste)
      : 16;

    // 2. Origin Geo Weekend-Drive & Popularity Context (0..10)
    const driveBonus = isEasyWeekendDriveFromOrigin(
      taste.originProvinceId,
      pin.provinceId
    )
      ? 4.5
      : 0;
    const provInfo = getProvinceById(pin.provinceId);
    const popularProvBonus = provInfo?.isPopular ? 2.0 : 0;

    // Mobile vertical aspect ergonomics
    const isVerticalMedia =
      pin.aspectRatio.includes("9/16") ||
      pin.aspectRatio.includes("2/3") ||
      pin.aspectRatio.includes("3/5") ||
      Boolean(pin.videoUrl);
    const deviceBonus =
      taste.deviceType === "mobile" && isVerticalMedia ? 3.0 : 0;

    const contextScore = driveBonus + popularProvBonus + deviceBonus;

    // 3. Quality, Verified Trust, Direct Coupon & Cold-Start Freshness (0..28)
    const engUtility = 14 * computeEngagementQuality01(pin);
    const ratingBonus = Math.max(0, (pin.hotelRatingAvg - 4.2) * 4.5); // up to ~3.6
    const verifiedBonus = pin.hotelVerificationStatus === "VERIFIED" ? 4.5 : 0;
    const couponBonus = pin.couponCode ? 2.5 : 0;
    const freshness01 = computeFreshness01(pin.createdAt);
    const freshBonus = 3.5 * freshness01;

    const qualityScore =
      engUtility + ratingBonus + verifiedBonus + couponBonus + freshBonus;

    // 4. Impression / Skip / Already-Opened Fatigue (-18..0)
    let fatiguePenalty = 0;
    if (taste.recentSkippedPinIds.has(pin.id)) {
      fatiguePenalty = 18;
    } else if (taste.recentViewedPinIds.has(pin.id)) {
      fatiguePenalty = 7.5;
    }

    const isColdStartGem = freshness01 > 0.65 && pin.likesCount < 80;

    return {
      pin,
      baseScore: personalScore + contextScore + qualityScore - fatiguePenalty,
      isColdStartGem,
    };
  });

  // Diversity-aware greedy feed assembly
  const result: PinFeedItemDto[] = [];
  const pool = [...scored];
  const lastHotelPos = new Map<string, number>();
  const hotelAppearances = new Map<string, number>();
  let lastSponsoredPos = -99;

  while (result.length < limit && pool.length > 0) {
    const slot = result.length;
    const canBoostSponsored = slot - lastSponsoredPos >= 5;
    const isColdStartSlot = slot > 0 && slot % 7 === 5;

    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      const hid = item.pin.hotelId;
      const prevPos = lastHotelPos.get(hid);
      const count = hotelAppearances.get(hid) ?? 0;

      let clumpingPenalty = 0;
      if (prevPos !== undefined && slot - prevPos < 3) {
        clumpingPenalty += 40;
      }
      if (slot < 10 && count >= 1) {
        clumpingPenalty += 18;
      }

      // Relevance-gated Sponsored Boost
      let sponsoredBoost = 0;
      if (canBoostSponsored && item.pin.isSponsored) {
        const matchesFilter =
          !activeStyleFilter ||
          activeStyleFilter === "all" ||
          item.pin.stayStyles.includes(activeStyleFilter);
        const matchesPersonal =
          !taste.hasPersonalSignal ||
          computePersonalTasteScore01(item.pin, taste) >= 0.32;

        if (matchesFilter && matchesPersonal) {
          sponsoredBoost =
            11 + Math.min(5, item.pin.sponsoredPriority * 0.5);
        }
      }

      const coldStartBonus =
        isColdStartSlot && item.isColdStartGem ? 6.0 : 0;

      const finalScore =
        item.baseScore + sponsoredBoost + coldStartBonus - clumpingPenalty;

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestIdx = i;
      }
    }

    const picked = pool.splice(bestIdx, 1)[0];
    result.push(picked.pin);
    lastHotelPos.set(picked.pin.hotelId, slot);
    hotelAppearances.set(
      picked.pin.hotelId,
      (hotelAppearances.get(picked.pin.hotelId) ?? 0) + 1
    );
    if (picked.pin.isSponsored && canBoostSponsored) {
      lastSponsoredPos = slot;
    }
  }

  return result;
}

