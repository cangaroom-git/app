import { prisma } from "@/lib/prisma";
import { getProvinceById } from "@/data/thailandProvinces";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { getRoomsAvailabilityForRange } from "@/lib/services/availabilityService";
import { mapHotelPostToSummaryDto } from "@/lib/services/hotelPostService";
import { mapPinToDto } from "@/lib/services/pinMapper";
import type {
  CouponDealDto,
  HotelProfileDto,
  HotelStorefrontDto,
} from "@/types/cangaroom";

function parseJsonArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export async function getHotelStorefrontBySlug(
  rawSlug: string,
  options?: {
    checkInDate?: string | null;
    checkOutDate?: string | null;
    userId?: string | null;
  }
): Promise<HotelStorefrontDto | null> {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return null;

  const hotel = await prisma.hotel.findUnique({
    where: { slug },
    include: {
      rooms: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      addons: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      coupons: {
        where: { isActive: true, expiresAt: { gt: new Date() } },
        orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
      },
      pins: {
        where: { publishStatus: "PUBLISHED" },
        orderBy: [{ isSponsored: "desc" }, { createdAt: "desc" }],
        take: 60,
        include: {
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
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 12,
        include: {
          room: {
            select: { code: true, nameTh: true, weekdayPriceThb: true },
          },
        },
      },
    },
  });

  if (!hotel) return null;

  const todayStr = formatDateStr(new Date());
  const checkIn = options?.checkInDate || addDaysToDate(todayStr, 1);
  const checkOut = options?.checkOutDate || addDaysToDate(checkIn, 1);
  const roomIds = hotel.rooms.map((r) => r.id);

  const rangeStart = new Date(`${todayStr}T00:00:00.000Z`);
  const rangeEnd = new Date(`${addDaysToDate(todayStr, 90)}T00:00:00.000Z`);

  const [availabilityMap, dateOverrides, totalSavesAgg, userLikes, userSaves, userWallet] =
    await Promise.all([
      getRoomsAvailabilityForRange({
        roomIds,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      }),
      roomIds.length > 0
        ? prisma.roomDateOverride.findMany({
            where: {
              roomId: { in: roomIds },
              date: { gte: rangeStart, lte: rangeEnd },
            },
          })
        : Promise.resolve([]),
      prisma.pin.aggregate({
        where: { hotelId: hotel.id, publishStatus: "PUBLISHED" },
        _sum: { savesCount: true },
      }),
      options?.userId
        ? prisma.pinLike.findMany({
            where: {
              userId: options.userId,
              pinId: { in: hotel.pins.map((p) => p.id) },
            },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      options?.userId
        ? prisma.savedBoardPin.findMany({
            where: {
              userId: options.userId,
              pinId: { in: hotel.pins.map((p) => p.id) },
            },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      options?.userId
        ? prisma.userCouponWallet.findMany({
            where: {
              userId: options.userId,
              couponId: { in: hotel.coupons.map((c) => c.id) },
            },
            select: { couponId: true, usedAt: true },
          })
        : Promise.resolve([]),
    ]);

  const likedSet = new Set(userLikes.map((l) => l.pinId));
  const savedSet = new Set(userSaves.map((s) => s.pinId));
  const walletMap = new Map<string, Date | null>(
    userWallet.map((w) => [w.couponId, w.usedAt])
  );

  const province = getProvinceById(hotel.provinceId);
  const provinceNameTh = province
    ? province.nameTh.split("(")[0].trim()
    : hotel.provinceId;
  const provinceNameEn = province ? province.nameEn : hotel.provinceId;

  const hotelProfile: HotelProfileDto = {
    id: hotel.id,
    slug: hotel.slug,
    ownerId: hotel.ownerId,
    nameTh: hotel.nameTh,
    nameEn: hotel.nameEn || hotel.nameTh,
    taglineTh: hotel.taglineTh,
    taglineEn: hotel.taglineEn || hotel.taglineTh,
    descriptionTh: hotel.descriptionTh,
    descriptionEn: hotel.descriptionEn || hotel.descriptionTh,
    logoUrl: hotel.logoUrl,
    coverImageUrl: hotel.coverImageUrl,
    provinceId: hotel.provinceId,
    provinceNameTh,
    provinceNameEn,
    districtTh: hotel.districtTh,
    addressTh: hotel.addressTh,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    googleMapsUrl: hotel.googleMapsUrl,
    stayStyles: hotel.stayStyles,
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    petsAllowed: hotel.petsAllowed,
    petPolicyTh: hotel.petPolicyTh,
    highlights: parseJsonArray<{ titleTh: string; descTh: string }>(
      hotel.highlightsJson
    ),
    nearbySpots: parseJsonArray<{ nameTh: string; distTh: string }>(
      hotel.nearbySpotsJson
    ),
    faqs: parseJsonArray<{ qTh: string; aTh: string }>(hotel.faqJson),
    contactPhone: hotel.contactPhone,
    contactLine: hotel.contactLine,
    facebookPageUrl: hotel.facebookPageUrl,
    instagramUrl: hotel.instagramUrl,
    promptPayId: hotel.promptPayId,
    promptPayAccountName: hotel.promptPayAccountName || hotel.nameTh,
    bankName: hotel.bankName,
    bankAccountNo: hotel.bankAccountNo,
    verificationStatus: hotel.verificationStatus,
    isPublished: hotel.isPublished,
    ratingAvg: hotel.ratingAvg,
    reviewCount: hotel.reviewCount,
    totalSavesCount: totalSavesAgg._sum.savesCount ?? 0,
  };

  const roomsDto = hotel.rooms.map((room) => {
    const avail = availabilityMap.get(room.id);
    return {
      id: room.id,
      hotelId: room.hotelId,
      code: room.code,
      slug: room.slug,
      nameTh: room.nameTh,
      nameEn: room.nameEn || room.nameTh,
      categoryTh: room.categoryTh,
      categoryEn: room.categoryEn,
      shortDescTh: room.shortDescTh,
      shortDescEn: room.shortDescEn || room.shortDescTh,
      totalUnits: room.totalUnits,
      availableUnits: avail?.availableUnits ?? room.totalUnits,
      heldUnits: avail?.heldUnits ?? 0,
      weekdayPriceThb: room.weekdayPriceThb,
      weekendPriceThb: room.weekendPriceThb,
      extraGuestPriceThb: room.extraGuestPriceThb,
      sizeSqm: room.sizeSqm,
      standardGuests: room.standardGuests,
      maxGuests: room.maxGuests,
      bedrooms: room.bedrooms,
      beds: room.beds,
      bathrooms: room.bathrooms,
      petsAllowed: room.petsAllowed,
      amenities: room.amenities,
      galleryUrls: room.galleryUrls,
      isActive: room.isActive,
      sortOrder: room.sortOrder,
    };
  });

  const couponsDto: CouponDealDto[] = hotel.coupons.map((c) => {
    const usedAt = walletMap.get(c.id);
    return {
      id: c.id,
      hotelId: c.hotelId,
      hotelSlug: hotel.slug,
      hotelNameTh: hotel.nameTh,
      hotelNameEn: hotel.nameEn || hotel.nameTh,
      hotelLogoUrl: hotel.logoUrl,
      hotelVerificationStatus: hotel.verificationStatus,
      provinceId: hotel.provinceId,
      provinceNameTh,
      provinceNameEn,
      stayStyles: hotel.stayStyles,
      code: c.code,
      titleTh: c.titleTh,
      titleEn: c.titleEn || c.titleTh,
      descriptionTh: c.descriptionTh,
      descriptionEn: c.descriptionEn || c.descriptionTh,
      coverImageUrl: c.coverImageUrl,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minSpendThb: c.minSpendThb,
      maxDiscountThb: c.maxDiscountThb,
      totalQuota: c.totalQuota,
      claimedCount: c.claimedCount,
      usedCount: c.usedCount,
      startsAt: c.startsAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      isFeaturedDeal: c.isFeaturedDeal,
      isActive: c.isActive,
      isClaimedByMe: walletMap.has(c.id),
      usedAt: usedAt ? usedAt.toISOString() : null,
    };
  });

  const pinsDto = hotel.pins.map((p) =>
    mapPinToDto(
      {
        ...p,
        hotel: {
          slug: hotel.slug,
          nameTh: hotel.nameTh,
          nameEn: hotel.nameEn,
          logoUrl: hotel.logoUrl,
          verificationStatus: hotel.verificationStatus,
          ratingAvg: hotel.ratingAvg,
          rooms: hotel.rooms.map((r) => ({ weekdayPriceThb: r.weekdayPriceThb })),
        },
      },
      likedSet,
      savedSet
    )
  );

  return {
    hotel: hotelProfile,
    rooms: roomsDto,
    dateOverrides: dateOverrides.map((o) => ({
      id: o.id,
      roomId: o.roomId,
      dateStr: formatDateStr(o.date),
      blockedUnits: o.blockedUnits,
      overridePriceThb: o.overridePriceThb,
      note: o.note,
    })),
    addons: hotel.addons.map((a) => ({
      id: a.id,
      hotelId: a.hotelId,
      nameTh: a.nameTh,
      nameEn: a.nameEn || a.nameTh,
      descriptionTh: a.descriptionTh,
      priceThb: a.priceThb,
      unitLabelTh: a.unitLabelTh,
      unitLabelEn: a.unitLabelEn,
      imageUrl: a.imageUrl,
      isActive: a.isActive,
      sortOrder: a.sortOrder,
    })),
    coupons: couponsDto,
    pins: pinsDto,
    reviews: hotel.reviews.map((rv) => ({
      id: rv.id,
      hotelId: rv.hotelId,
      roomCode: rv.roomCode,
      authorName: rv.authorName,
      authorAvatar: rv.authorAvatar,
      rating: rv.rating,
      commentTh: rv.commentTh,
      commentEn: rv.commentEn || rv.commentTh,
      photoUrls: rv.photoUrls,
      isVerifiedStay: rv.isVerifiedStay,
      createdAt: rv.createdAt.toISOString(),
    })),
    posts: hotel.posts.map((post) => mapHotelPostToSummaryDto(post, hotel)),
  };
}

