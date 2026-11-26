import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProvinceById } from "@/data/thailandProvinces";
import { addDaysToDate, formatDateStr, listDatesInRange } from "@/lib/bookingMath";
import { NONDII_CACHE_TAGS } from "@/lib/cache/revalidateNondii";
import { computeHaversineKm } from "@/lib/placeCategories";
import { mapHotelPostToSummaryDto } from "@/lib/services/hotelPostService";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";
import { normalizeRoomPhotos } from "@/lib/roomPhotoSpaces";
import type {
  CouponDealDto,
  GuestReviewDto,
  HotelAddonDto,
  HotelDiscountRuleDto,
  HotelPostSummaryDto,
  HotelProfileDto,
  HotelStorefrontDto,
  MerchantModeDto,
  PinCommentDto,
  PinFeedItemDto,
  PlaceCategoryDto,
  PlaceOpeningHoursDayDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

function parseJsonArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export interface PlaceMetadataSummary {
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  descriptionTh: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  provinceId: string;
  provinceNameTh: string;
  districtTh: string;
  stayStyles: string[];
  placeCategory: PlaceCategoryDto;
  merchantMode: MerchantModeDto;
  hasActiveRooms: boolean;
  minWeekdayPriceThb: number;
}

/**
 * Ultra-lean cached metadata query for `generateMetadata()` on `/{hotelSlug}`
 * and `/{hotelSlug}/book`. Eliminates running the heavy 10+ query storefront
 * fetch twice on every page load.
 */
export const getPlaceMetadataBySlug = cache(
  async (rawSlug: string): Promise<PlaceMetadataSummary | null> => {
    const slug = (rawSlug || "").trim().toLowerCase();
    if (!slug) return null;

    return unstable_cache(
      async (): Promise<PlaceMetadataSummary | null> => {
        const hotel = await prisma.hotel.findUnique({
          where: { slug },
          select: {
            slug: true,
            nameTh: true,
            nameEn: true,
            taglineTh: true,
            descriptionTh: true,
            coverImageUrl: true,
            logoUrl: true,
            provinceId: true,
            districtTh: true,
            stayStyles: true,
            placeCategory: true,
            merchantMode: true,
            rooms: {
              where: { isActive: true },
              orderBy: { weekdayPriceThb: "asc" },
              take: 1,
              select: { weekdayPriceThb: true },
            },
          },
        });

        if (!hotel) return null;
        const province = getProvinceById(hotel.provinceId);
        const provinceNameTh = province
          ? province.nameTh.split("(")[0].trim()
          : hotel.provinceId;

        return {
          slug: hotel.slug,
          nameTh: hotel.nameTh,
          nameEn: hotel.nameEn || hotel.nameTh,
          taglineTh: hotel.taglineTh,
          descriptionTh: hotel.descriptionTh,
          coverImageUrl: hotel.coverImageUrl,
          logoUrl: hotel.logoUrl,
          provinceId: hotel.provinceId,
          provinceNameTh,
          districtTh: hotel.districtTh,
          stayStyles: hotel.stayStyles,
          placeCategory: hotel.placeCategory,
          merchantMode: hotel.merchantMode,
          hasActiveRooms: hotel.rooms.length > 0,
          minWeekdayPriceThb: hotel.rooms[0]?.weekdayPriceThb ?? 0,
        };
      },
      [`place-meta-v1-${slug}`],
      {
        revalidate: 3600,
        tags: [NONDII_CACHE_TAGS.places, NONDII_CACHE_TAGS.place(slug)],
      }
    )();
  }
);

interface CachedPublicStorefrontBase {
  hotel: HotelProfileDto;
  rooms: RoomAvailabilityDto[];
  addons: HotelAddonDto[];
  coupons: CouponDealDto[];
  discountRules: HotelDiscountRuleDto[];
  pins: PinFeedItemDto[];
  reviews: GuestReviewDto[];
  posts: HotelPostSummaryDto[];
  ownerFeedPostsFallback: HotelPostSummaryDto[];
  ownerBlogsFallback: HotelPostSummaryDto[];
  nearbyPlaces: PinFeedItemDto[];
  canonicalPinId: string | null;
}

async function fetchPublicStorefrontBaseFromDb(
  slug: string
): Promise<CachedPublicStorefrontBase | null> {
  const nowDate = new Date();
  const [hotel, totalSavesAgg] = await Promise.all([
    prisma.hotel.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        ownerId: true,
        placeCategory: true,
        merchantMode: true,
        locationScope: true,
        branchSummaryTh: true,
        branchSummaryEn: true,
        eligibleProvinceIds: true,
        externalWebsiteUrl: true,
        primaryCtaLabelTh: true,
        openingHoursJson: true,
        canonicalPinId: true,
        featuredCouponId: true,
        googlePlaceId: true,
        nameTh: true,
        nameEn: true,
        taglineTh: true,
        taglineEn: true,
        descriptionTh: true,
        descriptionEn: true,
        logoUrl: true,
        coverImageUrl: true,
        provinceId: true,
        districtTh: true,
        addressTh: true,
        latitude: true,
        longitude: true,
        googleMapsUrl: true,
        stayStyles: true,
        checkInTime: true,
        checkOutTime: true,
        petsAllowed: true,
        petPolicyTh: true,
        highlightsJson: true,
        nearbySpotsJson: true,
        faqJson: true,
        contactPhone: true,
        contactLine: true,
        facebookPageUrl: true,
        instagramUrl: true,
        promptPayId: true,
        promptPayAccountName: true,
        bankName: true,
        bankAccountNo: true,
        verificationStatus: true,
        isPublished: true,
        ratingAvg: true,
        reviewCount: true,
        rooms: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            hotelId: true,
            code: true,
            slug: true,
            nameTh: true,
            nameEn: true,
            categoryTh: true,
            categoryEn: true,
            shortDescTh: true,
            shortDescEn: true,
            totalUnits: true,
            weekdayPriceThb: true,
            weekendPriceThb: true,
            extraGuestPriceThb: true,
            sizeSqm: true,
            standardGuests: true,
            maxGuests: true,
            bedrooms: true,
            beds: true,
            bathrooms: true,
            petsAllowed: true,
            amenities: true,
            galleryUrls: true,
            galleryMetaJson: true,
            isActive: true,
            sortOrder: true,
          },
        },
        addons: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            hotelId: true,
            nameTh: true,
            nameEn: true,
            descriptionTh: true,
            priceThb: true,
            unitLabelTh: true,
            unitLabelEn: true,
            imageUrl: true,
            isActive: true,
            sortOrder: true,
          },
        },
        coupons: {
          where: { isActive: true, expiresAt: { gt: nowDate } },
          orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
          select: {
            ...PIN_COUPON_SELECT,
            hotelId: true,
            usedCount: true,
          },
        },
        discountRules: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            hotelId: true,
            ruleType: true,
            titleTh: true,
            discountType: true,
            discountValue: true,
            minNights: true,
            minAdvanceDays: true,
            maxAdvanceDays: true,
            isActive: true,
          },
        },
        pins: {
          where: { publishStatus: "PUBLISHED" },
          orderBy: [{ isSponsored: "desc" }, { createdAt: "desc" }],
          take: 24,
          select: {
            id: true,
            hotelId: true,
            roomId: true,
            couponId: true,
            isCanonicalCard: true,
            mediaType: true,
            category: true,
            titleTh: true,
            titleEn: true,
            descriptionTh: true,
            descriptionEn: true,
            coverImageUrl: true,
            mediaUrls: true,
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
            aiTriageNote: true,
            isSponsored: true,
            sponsoredPriority: true,
            likesCount: true,
            savesCount: true,
            commentsCount: true,
            sharesCount: true,
            createdAt: true,
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
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 24,
          select: {
            id: true,
            hotelId: true,
            roomCode: true,
            authorName: true,
            authorAvatar: true,
            rating: true,
            commentTh: true,
            commentEn: true,
            photoUrls: true,
            isVerifiedStay: true,
            ownerReplyTh: true,
            ownerRepliedAt: true,
            createdAt: true,
          },
        },
        posts: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 12,
          select: {
            id: true,
            hotelId: true,
            roomId: true,
            slug: true,
            titleTh: true,
            titleEn: true,
            excerptTh: true,
            contentTh: true,
            coverImageUrl: true,
            galleryUrls: true,
            postKind: true,
            categoryTh: true,
            tags: true,
            status: true,
            viewsCount: true,
            publishedAt: true,
            room: {
              select: { code: true, nameTh: true, weekdayPriceThb: true },
            },
          },
        },
        branches: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 50,
          select: {
            id: true,
            hotelId: true,
            branchNameTh: true,
            branchNameEn: true,
            provinceId: true,
            districtTh: true,
            addressTh: true,
            latitude: true,
            longitude: true,
            googleMapsUrl: true,
            googlePlaceId: true,
          },
        },
      },
    }),
    prisma.pin.aggregate({
      where: { hotel: { slug }, publishStatus: "PUBLISHED" },
      _sum: { savesCount: true },
    }),
  ]);

  if (!hotel) return null;

  const province = getProvinceById(hotel.provinceId);
  const provinceNameTh =
    hotel.provinceId === "nationwide"
      ? "ทั่วประเทศ"
      : province
      ? province.nameTh.split("(")[0].trim()
      : hotel.provinceId;
  const provinceNameEn =
    hotel.provinceId === "nationwide"
      ? "Nationwide"
      : province
      ? province.nameEn
      : hotel.provinceId;

  const branchesDto = hotel.branches.map((br) => {
    const brProv = getProvinceById(br.provinceId);
    return {
      id: br.id,
      hotelId: br.hotelId,
      branchNameTh: br.branchNameTh,
      branchNameEn: br.branchNameEn || br.branchNameTh,
      provinceId: br.provinceId,
      provinceNameTh: brProv
        ? brProv.nameTh.split("(")[0].trim()
        : br.provinceId,
      provinceNameEn: brProv ? brProv.nameEn : br.provinceId,
      districtTh: br.districtTh,
      addressTh: br.addressTh,
      latitude: br.latitude,
      longitude: br.longitude,
      googleMapsUrl: br.googleMapsUrl,
      googlePlaceId: br.googlePlaceId,
    };
  });

  const hotelProfile: HotelProfileDto = {
    id: hotel.id,
    slug: hotel.slug,
    ownerId: hotel.ownerId,
    placeCategory: hotel.placeCategory,
    merchantMode: hotel.merchantMode,
    locationScope: hotel.locationScope,
    branchSummaryTh: hotel.branchSummaryTh,
    branchSummaryEn: hotel.branchSummaryEn,
    eligibleProvinceIds: hotel.eligibleProvinceIds,
    branches: branchesDto,
    externalWebsiteUrl: hotel.externalWebsiteUrl,
    primaryCtaLabelTh: hotel.primaryCtaLabelTh,
    openingHours: parseJsonArray<PlaceOpeningHoursDayDto>(
      hotel.openingHoursJson
    ),
    canonicalPinId: hotel.canonicalPinId,
    featuredCouponId: hotel.featuredCouponId,
    googlePlaceId: hotel.googlePlaceId,
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

  const roomsDto: RoomAvailabilityDto[] = hotel.rooms.map((room) => ({
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
    availableUnits: room.totalUnits,
    heldUnits: 0,
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
    galleryMeta: normalizeRoomPhotos(room.galleryUrls, room.galleryMetaJson),
    isActive: room.isActive,
    sortOrder: room.sortOrder,
  }));

  const couponsDto: CouponDealDto[] = hotel.coupons.map((c) => ({
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
    promoKind: c.promoKind,
    badgeTextTh: c.badgeTextTh,
    badgeTextEn: c.badgeTextEn,
    externalUrl: c.externalUrl,
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
    isClaimedByMe: false,
    usedAt: null,
  }));

  const emptySet = new Set<string>();
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
          placeCategory: hotel.placeCategory,
          merchantMode: hotel.merchantMode,
          locationScope: hotel.locationScope,
          branchSummaryTh: hotel.branchSummaryTh,
          branchSummaryEn: hotel.branchSummaryEn,
          eligibleProvinceIds: hotel.eligibleProvinceIds,
          externalWebsiteUrl: hotel.externalWebsiteUrl,
          primaryCtaLabelTh: hotel.primaryCtaLabelTh,
          featuredCouponId: hotel.featuredCouponId,
          districtTh: hotel.districtTh,
          addressTh: hotel.addressTh,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          googleMapsUrl: hotel.googleMapsUrl,
          nearbySpotsJson: hotel.nearbySpotsJson,
          rooms: hotel.rooms.map((r) => ({ weekdayPriceThb: r.weekdayPriceThb })),
          coupons: hotel.coupons,
        },
      },
      emptySet,
      emptySet
    )
  );

  const postsDto = hotel.posts.map((post) => mapHotelPostToSummaryDto(post, hotel));
  const ownerFeedPostsFallback = postsDto.filter((p) => p.postKind === "FEED_POST");
  const ownerBlogsFallback = postsDto.filter((p) => p.postKind !== "FEED_POST");

  const canonicalPinId =
    hotel.canonicalPinId ??
    hotel.pins.find((p) => p.isCanonicalCard)?.id ??
    hotel.pins[0]?.id ??
    null;

  // Compute & cache nearby places inside the 30m storefront cache (eliminates heavy per-request getPinDetailById!)
  const hasCoords =
    typeof hotel.latitude === "number" &&
    typeof hotel.longitude === "number" &&
    Number.isFinite(hotel.latitude) &&
    Number.isFinite(hotel.longitude);

  const nearbySelect = {
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
          where: { isActive: true, expiresAt: { gt: nowDate } },
          orderBy: [{ isFeaturedDeal: "desc" as const }, { discountValue: "desc" as const }],
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
  };

  const isNationwideOnline = hotel.locationScope === "NATIONWIDE_ONLINE";

  let nearbyRaw = isNationwideOnline
    ? []
    : await prisma.pin.findMany({
        where: {
          hotelId: { not: hotel.id },
          publishStatus: "PUBLISHED",
          isCanonicalCard: true,
          ...(hasCoords
            ? {
                hotel: {
                  isPublished: true,
                  locationScope: { not: "NATIONWIDE_ONLINE" },
                  verificationStatus: { not: "SUSPENDED" },
                  latitude: {
                    gte: hotel.latitude! - 0.85,
                    lte: hotel.latitude! + 0.85,
                  },
                  longitude: {
                    gte: hotel.longitude! - 0.85,
                    lte: hotel.longitude! + 0.85,
                  },
                },
              }
            : {
                provinceId: hotel.provinceId,
                hotel: {
                  isPublished: true,
                  locationScope: { not: "NATIONWIDE_ONLINE" },
                  verificationStatus: { not: "SUSPENDED" },
                },
              }),
        },
        orderBy: [{ isSponsored: "desc" }, { likesCount: "desc" }],
        take: 28,
        select: nearbySelect,
      });

  if (!isNationwideOnline && nearbyRaw.length < 3) {
    nearbyRaw = await prisma.pin.findMany({
      where: {
        hotelId: { not: hotel.id },
        publishStatus: "PUBLISHED",
        isCanonicalCard: true,
        hotel: {
          isPublished: true,
          locationScope: { not: "NATIONWIDE_ONLINE" },
          verificationStatus: { not: "SUSPENDED" },
        },
      },
      orderBy: [{ isSponsored: "desc" }, { likesCount: "desc" }],
      take: 24,
      select: nearbySelect,
    });
  }

  const nearbyCandidates = nearbyRaw.map((r) =>
    mapPinToDto(
      {
        ...r,
        descriptionTh: "",
        descriptionEn: "",
        mediaUrls: [r.coverImageUrl],
        semanticTags: [],
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

  let nearbyPlaces: PinFeedItemDto[];
  if (hasCoords) {
    const withDist = nearbyCandidates
      .filter(
        (c) =>
          typeof c.hotelLatitude === "number" &&
          typeof c.hotelLongitude === "number"
      )
      .map((c) => {
        const km = computeHaversineKm(
          hotel.latitude!,
          hotel.longitude!,
          c.hotelLatitude!,
          c.hotelLongitude!
        );
        return { ...c, distanceKm: Math.round(km * 10) / 10 };
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    const withinLocal = withDist.filter((c) => (c.distanceKm ?? 9999) <= 85);
    nearbyPlaces = (withinLocal.length >= 3 ? withinLocal : withDist).slice(
      0,
      10
    );
  } else {
    nearbyPlaces = nearbyCandidates.slice(0, 10);
  }

  return {
    hotel: hotelProfile,
    rooms: roomsDto,
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
    discountRules: hotel.discountRules.map((dr) => ({
      id: dr.id,
      hotelId: dr.hotelId,
      ruleType: dr.ruleType,
      titleTh: dr.titleTh,
      discountType: dr.discountType,
      discountValue: dr.discountValue,
      minNights: dr.minNights,
      minAdvanceDays: dr.minAdvanceDays,
      maxAdvanceDays: dr.maxAdvanceDays,
      isActive: dr.isActive,
    })),
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
      ownerReplyTh: rv.ownerReplyTh,
      ownerRepliedAt: rv.ownerRepliedAt ? rv.ownerRepliedAt.toISOString() : null,
      createdAt: rv.createdAt.toISOString(),
    })),
    posts: postsDto,
    ownerFeedPostsFallback,
    ownerBlogsFallback,
    nearbyPlaces,
    canonicalPinId,
  };
}

function getCachedPublicStorefrontBase(
  slug: string
): Promise<CachedPublicStorefrontBase | null> {
  return unstable_cache(
    async () => fetchPublicStorefrontBaseFromDb(slug),
    [`place-storefront-base-v3-${slug}`],
    {
      revalidate: 1800, // 30m data cache; invalidated immediately via revalidatePlaceCatalog
      tags: [NONDII_CACHE_TAGS.places, NONDII_CACHE_TAGS.place(slug)],
    }
  )();
}

const getHotelStorefrontCachedPerRequest = cache(
  async (
    slug: string,
    checkInDate: string,
    checkOutDate: string,
    userId: string
  ): Promise<HotelStorefrontDto | null> => {
    const base = await getCachedPublicStorefrontBase(slug);
    if (!base) return null;

    const resolvedUserId = userId || null;
    const todayStr = formatDateStr(new Date());
    const checkIn = checkInDate || addDaysToDate(todayStr, 1);
    const checkOut = checkOutDate || addDaysToDate(checkIn, 1);

    const hasBookableRooms =
      base.rooms.length > 0 && base.hotel.merchantMode !== "PROFILE_ONLY";
    const roomIds = hasBookableRooms ? base.rooms.map((r) => r.id) : [];
    const pinIds = base.pins.map((p) => p.id);
    const couponIds = base.coupons.map((c) => c.id);

    const now = new Date();
    const rangeStart = new Date(`${todayStr}T00:00:00.000Z`);
    const rangeEndStr = addDaysToDate(todayStr, 365);
    const rangeEnd = new Date(`${rangeEndStr}T00:00:00.000Z`);

    // Single parallel round-trip: zero redundant getRoomsAvailabilityForRange (computed in RAM below!) & zero heavy getPinDetailById!
    const [
      dateOverrides,
      activeBookingsInRange,
      userLikes,
      userSaves,
      userWallet,
      rawComments,
    ] = await Promise.all([
      hasBookableRooms
        ? prisma.roomDateOverride.findMany({
            where: {
              roomId: { in: roomIds },
              date: { gte: rangeStart, lte: rangeEnd },
            },
            select: {
              id: true,
              roomId: true,
              date: true,
              blockedUnits: true,
              overridePriceThb: true,
              minNights: true,
              note: true,
            },
          })
        : Promise.resolve([]),
      hasBookableRooms
        ? prisma.booking.findMany({
            where: {
              roomId: { in: roomIds },
              checkInDate: { lt: rangeEnd },
              checkOutDate: { gt: rangeStart },
              OR: [
                {
                  status: {
                    in: ["CONFIRMED", "PENDING_VERIFICATION", "COMPLETED"],
                  },
                },
                {
                  status: "HOLD_PENDING_PAYMENT",
                  holdExpiresAt: { gt: now },
                },
              ],
            },
            select: {
              roomId: true,
              checkInDate: true,
              checkOutDate: true,
              unitsBooked: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      resolvedUserId && pinIds.length > 0
        ? prisma.pinLike.findMany({
            where: {
              userId: resolvedUserId,
              pinId: { in: pinIds },
            },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      resolvedUserId && pinIds.length > 0
        ? prisma.savedBoardPin.findMany({
            where: {
              userId: resolvedUserId,
              pinId: { in: pinIds },
            },
            select: { pinId: true },
          })
        : Promise.resolve([]),
      resolvedUserId && couponIds.length > 0
        ? prisma.userCouponWallet.findMany({
            where: {
              userId: resolvedUserId,
              couponId: { in: couponIds },
            },
            select: { couponId: true, usedAt: true },
          })
        : Promise.resolve([]),
      base.canonicalPinId
        ? prisma.pinComment
            .findMany({
              where: { pinId: base.canonicalPinId, status: "VISIBLE" },
              orderBy: { createdAt: "asc" },
              take: 40,
              select: {
                id: true,
                pinId: true,
                userId: true,
                parentId: true,
                isHotelOwnerReply: true,
                body: true,
                likesCount: true,
                createdAt: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const bookedUnitsByRoomDate: Record<string, number> = {};
    const heldUnitsByRoomDate: Record<string, number> = {};
    for (const booking of activeBookingsInRange) {
      const rawStart = formatDateStr(booking.checkInDate);
      const rawEnd = formatDateStr(booking.checkOutDate);
      let cursor = rawStart < todayStr ? todayStr : rawStart;
      const endBound = rawEnd > rangeEndStr ? rangeEndStr : rawEnd;
      const isHold = booking.status === "HOLD_PENDING_PAYMENT";
      let guard = 0;
      while (cursor < endBound && guard < 185) {
        const key = `${booking.roomId}:${cursor}`;
        bookedUnitsByRoomDate[key] =
          (bookedUnitsByRoomDate[key] ?? 0) + booking.unitsBooked;
        if (isHold) {
          heldUnitsByRoomDate[key] =
            (heldUnitsByRoomDate[key] ?? 0) + booking.unitsBooked;
        }
        cursor = addDaysToDate(cursor, 1);
        guard += 1;
      }
    }

    const blockedByRoomDate = new Map<string, number>();
    for (const o of dateOverrides) {
      if (o.blockedUnits > 0) {
        blockedByRoomDate.set(
          `${o.roomId}:${formatDateStr(o.date)}`,
          o.blockedUnits
        );
      }
    }

    const stayDates = hasBookableRooms ? listDatesInRange(checkIn, checkOut) : [];

    const likedSet = new Set(userLikes.map((l) => l.pinId));
    const savedSet = new Set(userSaves.map((s) => s.pinId));
    const walletMap = new Map<string, Date | null>(
      userWallet.map((w) => [w.couponId, w.usedAt])
    );

    const roomsDto = hasBookableRooms
      ? base.rooms.map((room) => {
          if (stayDates.length === 0) return room;
          let minAvail = room.totalUnits;
          let maxHeld = 0;
          for (const d of stayDates) {
            const key = `${room.id}:${d}`;
            const bookedOrHeld = bookedUnitsByRoomDate[key] ?? 0;
            const held = heldUnitsByRoomDate[key] ?? 0;
            const blocked = blockedByRoomDate.get(key) ?? 0;
            const free = Math.max(0, room.totalUnits - bookedOrHeld - blocked);
            if (free < minAvail) minAvail = free;
            if (held > maxHeld) maxHeld = held;
          }
          return {
            ...room,
            availableUnits: minAvail,
            heldUnits: maxHeld,
          };
        })
      : base.rooms;

    // Filter out coupons that expired since cache entry was created, and stamp user wallet flags
    const nowIso = now.toISOString();
    const couponsDto: CouponDealDto[] = base.coupons
      .filter((c) => c.expiresAt > nowIso)
      .map((c) => {
        if (!resolvedUserId) return c;
        const usedAt = walletMap.get(c.id);
        return {
          ...c,
          isClaimedByMe: walletMap.has(c.id),
          usedAt: usedAt ? usedAt.toISOString() : null,
        };
      });

    const pinsDto = resolvedUserId
      ? base.pins.map((p) => ({
          ...p,
          isLikedByMe: likedSet.has(p.id),
          isSavedByMe: savedSet.has(p.id),
        }))
      : base.pins;

    const canonicalPin =
      (base.canonicalPinId
        ? pinsDto.find((p) => p.id === base.canonicalPinId)
        : null) ??
      pinsDto[0] ??
      null;

    const commentMap = new Map<string, PinCommentDto>();
    const pinComments: PinCommentDto[] = [];
    for (const c of rawComments) {
      commentMap.set(c.id, {
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
      });
    }
    for (const dto of commentMap.values()) {
      if (dto.parentId && commentMap.has(dto.parentId)) {
        commentMap.get(dto.parentId)!.replies.push(dto);
      } else {
        pinComments.push(dto);
      }
    }

    return {
      hotel: base.hotel,
      rooms: roomsDto,
      bookedUnitsByRoomDate,
      dateOverrides: dateOverrides.map((o) => ({
        id: o.id,
        roomId: o.roomId,
        dateStr: formatDateStr(o.date),
        blockedUnits: o.blockedUnits,
        overridePriceThb: o.overridePriceThb,
        minNights: o.minNights,
        note: o.note,
      })),
      addons: base.addons,
      coupons: couponsDto,
      discountRules: base.discountRules,
      pins: pinsDto,
      reviews: base.reviews,
      posts: base.posts,
      canonicalPin,
      pinComments,
      ownerFeedPosts: base.ownerFeedPostsFallback,
      ownerBlogs: base.ownerBlogsFallback,
      nearbyPlaces: base.nearbyPlaces,
    };
  }
);

export async function getHotelStorefrontBySlug(
  rawSlug: string,
  options?: {
    checkInDate?: string | null;
    checkOutDate?: string | null;
    userId?: string | null;
  }
): Promise<HotelStorefrontDto | null> {
  const slug = (rawSlug || "").trim().toLowerCase();
  if (!slug) return null;

  return getHotelStorefrontCachedPerRequest(
    slug,
    options?.checkInDate ?? "",
    options?.checkOutDate ?? "",
    options?.userId ?? ""
  );
}
