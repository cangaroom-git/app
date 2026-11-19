import { prisma } from "@/lib/prisma";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";
import type { SavedBoardDto } from "@/types/cangaroom";

export async function getUserSavedBoards(
  userId: string
): Promise<SavedBoardDto[]> {
  const boards = await prisma.savedBoard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      pins: {
        orderBy: { createdAt: "desc" },
        include: {
          pin: {
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
                  coupons: {
                    where: {
                      isActive: true,
                      expiresAt: { gt: new Date() },
                    },
                    orderBy: [
                      { isFeaturedDeal: "desc" },
                      { discountValue: "desc" },
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
        },
      },
    },
  });

  const userLikes = await prisma.pinLike.findMany({
    where: { userId },
    select: { pinId: true },
  });
  const likedSet = new Set(userLikes.map((l) => l.pinId));
  const savedSet = new Set<string>();
  for (const b of boards) {
    for (const bp of b.pins) {
      savedSet.add(bp.pinId);
    }
  }

  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    createdAt: board.createdAt.toISOString(),
    pinCount: board.pins.length,
    items: board.pins.map((entry) => {
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
        savedPriceSnapshotThb: entry.savedPriceSnapshotThb,
        currentMinPriceThb,
        priceDropThb,
        hasActivePromo: Boolean(topCoupon),
        activePromoLabel,
        savedAt: entry.createdAt.toISOString(),
        pin: pinDto,
      };
    }),
  }));
}

