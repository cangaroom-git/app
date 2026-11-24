import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";
import { generateTripShareSlug } from "@/lib/tripShareSlug";
import type { PublicTripDto, SavedBoardDto } from "@/types/cangaroom";

/**
 * Lean explicit Prisma select for SavedBoardPin -> Pin cards on `/trip` & `/trip/[tripId]`.
 * Strips heavy detail-only columns (descriptionTh/En, mediaUrls, nearbySpotsJson, addressTh, googleMapsUrl, aiTriageNote)
 * and limits coupons to top 2 per hotel so board & trip pages load ~65% lighter!
 */
function buildLeanBoardPinSelect(nowDate: Date) {
  return {
    id: true,
    boardId: true,
    pinId: true,
    sortOrder: true,
    savedPriceSnapshotThb: true,
    createdAt: true,
    pin: {
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
        promoExpiresAt: true,
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
              where: {
                isActive: true,
                expiresAt: { gt: nowDate },
              },
              orderBy: [
                { isFeaturedDeal: "desc" as const },
                { discountValue: "desc" as const },
              ],
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
    },
  };
}

export async function getUserSavedBoards(
  userId: string
): Promise<SavedBoardDto[]> {
  const nowDate = new Date();
  const boards = await prisma.savedBoard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      shareSlug: true,
      isPublic: true,
      createdAt: true,
      pins: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: buildLeanBoardPinSelect(nowDate),
      },
    },
  });

  const allPinIds = Array.from(
    new Set(boards.flatMap((b) => b.pins.map((bp) => bp.pinId)))
  );

  // Scope pinLike lookup strictly to pins in user's boards + backfill any missing shareSlugs in parallel
  const boardsMissingSlug = boards.filter((b) => !(b.shareSlug || "").trim());
  const generatedSlugs = new Map<string, string>();
  for (const b of boardsMissingSlug) {
    generatedSlugs.set(b.id, generateTripShareSlug());
  }

  const [userLikes] = await Promise.all([
    allPinIds.length > 0
      ? prisma.pinLike.findMany({
          where: { userId, pinId: { in: allPinIds } },
          select: { pinId: true },
        })
      : Promise.resolve([]),
    ...boardsMissingSlug.map((b) =>
      prisma.savedBoard
        .updateMany({
          where: { id: b.id, shareSlug: null },
          data: { shareSlug: generatedSlugs.get(b.id)! },
        })
        .catch(() => {})
    ),
  ]);

  const likedSet = new Set(userLikes.map((l) => l.pinId));
  const savedSet = new Set(allPinIds);

  return boards.map((board) => {
    const shareSlug =
      (board.shareSlug || "").trim() ||
      generatedSlugs.get(board.id) ||
      board.id;

    return {
      id: board.id,
      name: board.name,
      shareSlug,
      isPublic: board.isPublic ?? true,
      createdAt: board.createdAt.toISOString(),
      pinCount: board.pins.length,
      items: board.pins.map((entry) => {
        const pinDto = mapPinToDto(
          {
            ...entry.pin,
            descriptionTh: "",
            descriptionEn: "",
            mediaUrls: [entry.pin.coverImageUrl],
            semanticTags: [],
            aiTriageNote: null,
            hotel: {
              ...entry.pin.hotel,
              addressTh: null,
              googleMapsUrl: null,
              nearbySpotsJson: null,
            },
          },
          likedSet,
          savedSet
        );
        const currentMinPriceThb = pinDto.nightlyPriceThb;
        const priceDropThb =
          entry.savedPriceSnapshotThb &&
          currentMinPriceThb &&
          entry.savedPriceSnapshotThb > currentMinPriceThb
            ? entry.savedPriceSnapshotThb - currentMinPriceThb
            : 0;
        const topCoupon = entry.pin.hotel.coupons[0] || null;
        const activePromoLabel = topCoupon
          ? topCoupon.discountType === "PERCENT"
            ? `คูปองลด ${topCoupon.discountValue}% (${topCoupon.code})`
            : `คูปองลด ฿${topCoupon.discountValue.toLocaleString()} (${topCoupon.code})`
          : null;

        return {
          boardPinId: entry.id,
          boardId: board.id,
          boardName: board.name,
          sortOrder: entry.sortOrder,
          savedPriceSnapshotThb: entry.savedPriceSnapshotThb,
          currentMinPriceThb,
          priceDropThb,
          hasActivePromo: Boolean(topCoupon),
          activePromoLabel,
          savedAt: entry.createdAt.toISOString(),
          pin: pinDto,
        };
      }),
    };
  });
}

export type TripLookupResult =
  | { status: "not_found" }
  | { status: "private" }
  | { status: "ok"; trip: PublicTripDto };

const getTripBySlugOrIdCached = cache(
  async (cleanKey: string, viewerUserId: string): Promise<TripLookupResult> => {
    const nowDate = new Date();
    const resolvedViewerId = viewerUserId || null;

    // Single indexed lookup using Prisma typed columns (zero raw SQL round-trips!)
    const board = await prisma.savedBoard.findFirst({
      where: {
        OR: [{ shareSlug: cleanKey }, { id: cleanKey }],
      },
      select: {
        id: true,
        userId: true,
        name: true,
        shareSlug: true,
        isPublic: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        pins: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: buildLeanBoardPinSelect(nowDate),
        },
      },
    });

    if (!board) {
      return { status: "not_found" };
    }

    const isOwner = Boolean(
      resolvedViewerId && resolvedViewerId === board.userId
    );
    const isPublic = board.isPublic ?? true;

    if (!isPublic && !isOwner) {
      return { status: "private" };
    }

    let shareSlug = (board.shareSlug || "").trim();
    const needsSlugBackfill = !shareSlug;
    if (needsSlugBackfill) {
      shareSlug = generateTripShareSlug();
    }

    const boardPinIds = board.pins.map((bp) => bp.pinId);

    const [viewerLikes, viewerSavedPins] = await Promise.all([
      resolvedViewerId && boardPinIds.length > 0
        ? prisma.pinLike.findMany({
            where: { userId: resolvedViewerId, pinId: { in: boardPinIds } },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      resolvedViewerId && boardPinIds.length > 0
        ? prisma.savedBoardPin.findMany({
            where: { userId: resolvedViewerId, pinId: { in: boardPinIds } },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      needsSlugBackfill
        ? prisma.savedBoard
            .updateMany({
              where: { id: board.id, shareSlug: null },
              data: { shareSlug },
            })
            .catch(() => {})
        : Promise.resolve(null),
    ]);

    const likedSet = new Set(viewerLikes.map((l) => l.pinId));
    const savedSet = new Set(viewerSavedPins.map((s) => s.pinId));
    const safeDisplayName =
      (board.user?.name || "").trim() || "Nondii Traveller";

    return {
      status: "ok",
      trip: {
        id: board.id,
        name: board.name,
        shareSlug,
        isPublic,
        isOwner,
        ownerDisplayName: safeDisplayName,
        ownerAvatarUrl: board.user?.avatarUrl ?? null,
        createdAt: board.createdAt.toISOString(),
        pinCount: board.pins.length,
        items: board.pins.map((entry) => {
          const pinDto = mapPinToDto(
            {
              ...entry.pin,
              descriptionTh: "",
              descriptionEn: "",
              mediaUrls: [entry.pin.coverImageUrl],
              semanticTags: [],
              aiTriageNote: null,
              hotel: {
                ...entry.pin.hotel,
                addressTh: null,
                googleMapsUrl: null,
                nearbySpotsJson: null,
              },
            },
            likedSet,
            savedSet
          );
          const currentMinPriceThb = pinDto.nightlyPriceThb;
          const priceDropThb =
            entry.savedPriceSnapshotThb &&
            currentMinPriceThb &&
            entry.savedPriceSnapshotThb > currentMinPriceThb
              ? entry.savedPriceSnapshotThb - currentMinPriceThb
              : 0;
          const topCoupon = entry.pin.hotel.coupons[0] || null;
          const activePromoLabel = topCoupon
            ? topCoupon.discountType === "PERCENT"
              ? `คูปองลด ${topCoupon.discountValue}% (${topCoupon.code})`
              : `คูปองลด ฿${topCoupon.discountValue.toLocaleString()} (${topCoupon.code})`
            : null;

          return {
            boardPinId: entry.id,
            boardId: board.id,
            boardName: board.name,
            sortOrder: entry.sortOrder,
            savedPriceSnapshotThb: entry.savedPriceSnapshotThb,
            currentMinPriceThb,
            priceDropThb,
            hasActivePromo: Boolean(topCoupon),
            activePromoLabel,
            savedAt: entry.createdAt.toISOString(),
            pin: pinDto,
          };
        }),
      },
    };
  }
);

/**
 * Request-memoized public-safe trip loader supporting both `shareSlug` (e.g. `t-7k2m9p4q`) and legacy `id`.
 * Deduplicates `generateMetadata` + `PublicTripDetailPage` SSR queries automatically via `React.cache`.
 */
export async function getTripBySlugOrId(
  slugOrId: string,
  viewerUserId: string | null
): Promise<TripLookupResult> {
  const cleanKey = slugOrId.trim();
  if (!cleanKey || cleanKey.length > 120) {
    return { status: "not_found" };
  }
  return getTripBySlugOrIdCached(cleanKey, viewerUserId ?? "");
}

export type PublicCommunityTripDto = SavedBoardDto & {
  ownerDisplayName: string;
};

/**
 * Loads public community trip boards containing at least 1 place so `/trip`
 * showcases real traveller itineraries immediately even before login.
 */
export async function getPublicCommunityTrips(
  limit = 12
): Promise<PublicCommunityTripDto[]> {
  const nowDate = new Date();
  const safeTake = Math.min(Math.max(limit, 1), 24);
  const boards = await prisma.savedBoard.findMany({
    where: {
      isPublic: true,
      pins: { some: {} },
    },
    orderBy: { updatedAt: "desc" },
    take: safeTake,
    select: {
      id: true,
      name: true,
      shareSlug: true,
      isPublic: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
      pins: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: buildLeanBoardPinSelect(nowDate),
      },
    },
  });

  const emptySet = new Set<string>();

  return boards.map((board) => {
    const shareSlug = (board.shareSlug || "").trim() || board.id;
    const ownerDisplayName =
      (board.user?.name || "").trim() || "Nondii Traveller";

    return {
      id: board.id,
      name: board.name,
      shareSlug,
      isPublic: board.isPublic ?? true,
      createdAt: board.createdAt.toISOString(),
      pinCount: board.pins.length,
      ownerDisplayName,
      items: board.pins.map((entry) => {
        const pinDto = mapPinToDto(
          {
            ...entry.pin,
            descriptionTh: "",
            descriptionEn: "",
            mediaUrls: [entry.pin.coverImageUrl],
            semanticTags: [],
            aiTriageNote: null,
            hotel: {
              ...entry.pin.hotel,
              addressTh: null,
              googleMapsUrl: null,
              nearbySpotsJson: null,
            },
          },
          emptySet,
          emptySet
        );
        const currentMinPriceThb = pinDto.nightlyPriceThb;
        const priceDropThb =
          entry.savedPriceSnapshotThb &&
          currentMinPriceThb &&
          entry.savedPriceSnapshotThb > currentMinPriceThb
            ? entry.savedPriceSnapshotThb - currentMinPriceThb
            : 0;
        const topCoupon = entry.pin.hotel.coupons[0] || null;
        const activePromoLabel = topCoupon
          ? topCoupon.discountType === "PERCENT"
            ? `คูปองลด ${topCoupon.discountValue}% (${topCoupon.code})`
            : `คูปองลด ฿${topCoupon.discountValue.toLocaleString()} (${topCoupon.code})`
          : null;

        return {
          boardPinId: entry.id,
          boardId: board.id,
          boardName: board.name,
          sortOrder: entry.sortOrder,
          savedPriceSnapshotThb: entry.savedPriceSnapshotThb,
          currentMinPriceThb,
          priceDropThb,
          hasActivePromo: Boolean(topCoupon),
          activePromoLabel,
          savedAt: entry.createdAt.toISOString(),
          pin: pinDto,
        };
      }),
    };
  });
}
