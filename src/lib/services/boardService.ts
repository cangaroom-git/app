import { prisma } from "@/lib/prisma";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";
import { generateTripShareSlug } from "@/lib/tripShareSlug";
import type { PublicTripDto, SavedBoardDto } from "@/types/cangaroom";

const BOARD_PIN_INCLUDE = {
  pin: {
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
            where: {
              isActive: true,
              expiresAt: { gt: new Date() },
            },
            orderBy: [
              { isFeaturedDeal: "desc" as const },
              { discountValue: "desc" as const },
            ],
            take: 6,
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

async function ensureBoardShareMeta(
  boardIds: string[]
): Promise<Map<string, { shareSlug: string; isPublic: boolean }>> {
  const result = new Map<string, { shareSlug: string; isPublic: boolean }>();
  if (boardIds.length === 0) return result;

  const rows = await prisma
    .$queryRaw<
      Array<{ id: string; shareSlug: string | null; isPublic: boolean | null }>
    >`
      SELECT "id", "shareSlug", "isPublic"
      FROM "SavedBoard"
      WHERE "id" = ANY(${boardIds}::text[])
    `
    .catch(
      () =>
        [] as Array<{
          id: string;
          shareSlug: string | null;
          isPublic: boolean | null;
        }>
    );

  for (const row of rows) {
    let slug = (row.shareSlug || "").trim();
    if (!slug) {
      slug = generateTripShareSlug();
      await prisma
        .$executeRaw`
          UPDATE "SavedBoard"
          SET "shareSlug" = ${slug}
          WHERE "id" = ${row.id} AND "shareSlug" IS NULL
        `
        .catch(() => {});
    }
    result.set(row.id, {
      shareSlug: slug || row.id,
      isPublic: row.isPublic ?? true,
    });
  }

  return result;
}

export async function getUserSavedBoards(
  userId: string
): Promise<SavedBoardDto[]> {
  const [boards, userLikes, sortOrderRows] = await Promise.all([
    prisma.savedBoard.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        pins: {
          orderBy: { createdAt: "asc" },
          include: BOARD_PIN_INCLUDE,
        },
      },
    }),
    prisma.pinLike.findMany({
      where: { userId },
      select: { pinId: true },
    }),
    prisma
      .$queryRaw<Array<{ id: string; sortOrder: number }>>`
        SELECT "id", "sortOrder"
        FROM "SavedBoardPin"
        WHERE "userId" = ${userId}
      `
      .catch(() => [] as Array<{ id: string; sortOrder: number }>),
  ]);

  const shareMetaMap = await ensureBoardShareMeta(boards.map((b) => b.id));

  const sortOrderMap = new Map<string, number>();
  for (const row of sortOrderRows) {
    sortOrderMap.set(row.id, Number(row.sortOrder) || 0);
  }

  const likedSet = new Set(userLikes.map((l) => l.pinId));
  const savedSet = new Set<string>();
  for (const b of boards) {
    for (const bp of b.pins) {
      savedSet.add(bp.pinId);
    }
  }

  return boards.map((board) => {
    const meta = shareMetaMap.get(board.id) ?? {
      shareSlug: board.id,
      isPublic: true,
    };

    const orderedPins = [...board.pins].sort((a, b) => {
      const orderA = sortOrderMap.get(a.id) ?? 0;
      const orderB = sortOrderMap.get(b.id) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      id: board.id,
      name: board.name,
      shareSlug: meta.shareSlug,
      isPublic: meta.isPublic,
      createdAt: board.createdAt.toISOString(),
      pinCount: orderedPins.length,
      items: orderedPins.map((entry) => {
        const pinDto = mapPinToDto(entry.pin, likedSet, savedSet);
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
          sortOrder: sortOrderMap.get(entry.id) ?? 0,
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

/**
 * Public-safe trip loader supporting both `shareSlug` (e.g. `t-7k2m9p4q`) and legacy `id`.
 * - Works for unauthenticated guests (`viewerUserId === null`) when `isPublic === true`.
 * - NEVER exposes owner email, userId, or private account details.
 */
export async function getTripBySlugOrId(
  slugOrId: string,
  viewerUserId: string | null
): Promise<TripLookupResult> {
  const cleanKey = slugOrId.trim();
  if (!cleanKey || cleanKey.length > 120) {
    return { status: "not_found" };
  }

  const matchedRows = await prisma
    .$queryRaw<
      Array<{
        id: string;
        userId: string;
        shareSlug: string | null;
        isPublic: boolean | null;
      }>
    >`
      SELECT "id", "userId", "shareSlug", "isPublic"
      FROM "SavedBoard"
      WHERE "shareSlug" = ${cleanKey} OR "id" = ${cleanKey}
      LIMIT 1
    `
    .catch(() => []);

  const matched = matchedRows[0];
  if (!matched) {
    return { status: "not_found" };
  }

  const isOwner = Boolean(viewerUserId && viewerUserId === matched.userId);
  const isPublic = matched.isPublic ?? true;

  if (!isPublic && !isOwner) {
    return { status: "private" };
  }

  const [board, sortOrderRows, viewerLikes, viewerSavedPins] = await Promise.all([
    prisma.savedBoard.findUnique({
      where: { id: matched.id },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        pins: {
          orderBy: { createdAt: "asc" },
          include: BOARD_PIN_INCLUDE,
        },
      },
    }),
    prisma
      .$queryRaw<Array<{ id: string; sortOrder: number }>>`
        SELECT "id", "sortOrder"
        FROM "SavedBoardPin"
        WHERE "boardId" = ${matched.id}
      `
      .catch(() => [] as Array<{ id: string; sortOrder: number }>),
    viewerUserId
      ? prisma.pinLike.findMany({
          where: { userId: viewerUserId },
          select: { pinId: true },
        })
      : Promise.resolve([]),
    viewerUserId
      ? prisma.savedBoardPin.findMany({
          where: { userId: viewerUserId },
          select: { pinId: true },
        })
      : Promise.resolve([]),
  ]);

  if (!board) {
    return { status: "not_found" };
  }

  let shareSlug = (matched.shareSlug || "").trim();
  if (!shareSlug) {
    shareSlug = generateTripShareSlug();
    await prisma
      .$executeRaw`
        UPDATE "SavedBoard"
        SET "shareSlug" = ${shareSlug}
        WHERE "id" = ${board.id} AND "shareSlug" IS NULL
      `
      .catch(() => {});
  }

  const sortOrderMap = new Map<string, number>();
  for (const row of sortOrderRows) {
    sortOrderMap.set(row.id, Number(row.sortOrder) || 0);
  }

  const likedSet = new Set(viewerLikes.map((l) => l.pinId));
  const savedSet = new Set(viewerSavedPins.map((s) => s.pinId));

  const orderedPins = [...board.pins].sort((a, b) => {
    const orderA = sortOrderMap.get(a.id) ?? 0;
    const orderB = sortOrderMap.get(b.id) ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const safeDisplayName = (board.user?.name || "").trim() || "Nondii Traveller";

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
      pinCount: orderedPins.length,
      items: orderedPins.map((entry) => {
        const pinDto = mapPinToDto(entry.pin, likedSet, savedSet);
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
          sortOrder: sortOrderMap.get(entry.id) ?? 0,
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
