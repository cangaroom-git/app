import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProvinceById } from "@/data/thailandProvinces";
import { getRoomsAvailabilityForRange } from "@/lib/services/availabilityService";
import { mapPinToDto } from "@/lib/services/pinMapper";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

export interface SearchStaysParams {
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

export async function searchDiscoveryPins(
  params: SearchStaysParams
): Promise<PinFeedItemDto[]> {
  const {
    style,
    provinceId,
    q,
    checkIn,
    checkOut,
    guests,
    maxPriceThb,
    limit = 60,
    userId,
  } = params;

  const where: Prisma.PinWhereInput = {
    publishStatus: "PUBLISHED",
    hotel: {
      isPublished: true,
      verificationStatus: { not: "SUSPENDED" },
    },
  };

  if (style && style !== "all") {
    where.stayStyles = { has: style };
  }

  if (provinceId) {
    where.provinceId = provinceId;
  }

  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    where.OR = [
      { titleTh: { contains: trimmedQuery, mode: "insensitive" } },
      { titleEn: { contains: trimmedQuery, mode: "insensitive" } },
      { descriptionTh: { contains: trimmedQuery, mode: "insensitive" } },
      { semanticTags: { has: trimmedQuery } },
      {
        hotel: {
          OR: [
            { nameTh: { contains: trimmedQuery, mode: "insensitive" } },
            { nameEn: { contains: trimmedQuery, mode: "insensitive" } },
            { districtTh: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        },
      },
    ];
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

  // Check real room availability when date range filter or guest capacity filter is active
  const hasDateFilter = Boolean(checkIn && checkOut && checkIn < checkOut);
  const guestLimit = guests && guests > 0 ? guests : null;

  let availabilityMap = new Map<
    string,
    { availableUnits: number }
  >();

  if (hasDateFilter && checkIn && checkOut) {
    const allRoomIds = Array.from(
      new Set(
        rawPins.flatMap((p) => {
          const ids = p.hotel.rooms.map((r) => r.id);
          if (p.room?.id) ids.push(p.room.id);
          return ids;
        })
      )
    );
    availabilityMap = await getRoomsAvailabilityForRange({
      roomIds: allRoomIds,
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });
  }

  const filteredPins = rawPins.filter((pin) => {
    // Price ceiling check
    const referencePrice =
      pin.room?.weekdayPriceThb ??
      (pin.hotel.rooms.length > 0
        ? Math.min(...pin.hotel.rooms.map((r) => r.weekdayPriceThb))
        : null);

    if (maxPriceThb && referencePrice && referencePrice > maxPriceThb) {
      return false;
    }

    // Province text match support if q matches province Thai/EN label
    if (trimmedQuery && !provinceId) {
      const prov = getProvinceById(pin.provinceId);
      const qLow = trimmedQuery.toLowerCase();
      if (
        prov &&
        (prov.nameTh.toLowerCase().includes(qLow) ||
          prov.nameEn.toLowerCase().includes(qLow))
      ) {
        // already included or matched
      }
    }

    if (hasDateFilter || guestLimit) {
      const candidateRooms = pin.room
        ? [pin.room]
        : pin.hotel.rooms;

      if (candidateRooms.length === 0) return false;

      const hasMatchingRoom = candidateRooms.some((room) => {
        if (guestLimit && room.maxGuests < guestLimit) {
          return false;
        }
        if (hasDateFilter) {
          const avail = availabilityMap.get(room.id)?.availableUnits ?? 0;
          if (avail <= 0) return false;
        }
        return true;
      });

      if (!hasMatchingRoom) return false;
    }

    return true;
  });

  const sliced = filteredPins.slice(0, limit);

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();

  if (userId && sliced.length > 0) {
    const pinIds = sliced.map((p) => p.id);
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

  return sliced.map((p) => mapPinToDto(p, likedSet, savedSet));
}

export async function getPinDetailById(
  pinId: string,
  userId?: string | null
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

  const [rawComments, relatedRaw, userLike, userSave] = await Promise.all([
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
        hotel: { isPublished: true, verificationStatus: { not: "SUSPENDED" } },
      },
      orderBy: [{ isSponsored: "desc" }, { likesCount: "desc" }],
      take: 16,
      include: {
        hotel: {
          select: {
            slug: true,
            nameTh: true,
            nameEn: true,
            logoUrl: true,
            verificationStatus: true,
            ratingAvg: true,
            rooms: { where: { isActive: true }, select: { weekdayPriceThb: true } },
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
  ]);

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

  // Rank related pins with matching province or stay styles first
  const pinStylesSet = new Set(rawPin.stayStyles);
  const sortedRelated = [...relatedRaw].sort((a, b) => {
    const aScore =
      (a.provinceId === rawPin.provinceId ? 2 : 0) +
      (a.stayStyles.some((s) => pinStylesSet.has(s)) ? 1 : 0);
    const bScore =
      (b.provinceId === rawPin.provinceId ? 2 : 0) +
      (b.stayStyles.some((s) => pinStylesSet.has(s)) ? 1 : 0);
    return bScore - aScore;
  });

  return {
    pin: mapPinToDto(rawPin, likedSet, savedSet),
    comments: topLevelComments,
    relatedPins: sortedRelated.map((r) =>
      mapPinToDto(r, relatedLikedSet, relatedSavedSet)
    ),
  };
}

