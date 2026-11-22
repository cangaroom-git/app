import { getProvinceById } from "@/data/thailandProvinces";
import type { PinActiveCouponDto, PinFeedItemDto } from "@/types/cangaroom";

export const PIN_COUPON_SELECT = {
  id: true,
  code: true,
  titleTh: true,
  titleEn: true,
  descriptionTh: true,
  descriptionEn: true,
  coverImageUrl: true,
  discountType: true,
  discountValue: true,
  minSpendThb: true,
  maxDiscountThb: true,
  totalQuota: true,
  claimedCount: true,
  startsAt: true,
  expiresAt: true,
  isActive: true,
} as const;

export interface RawPinCoupon {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  coverImageUrl: string | null;
  discountType: "PERCENT" | "FIXED_THB";
  discountValue: number;
  minSpendThb: number;
  maxDiscountThb: number | null;
  totalQuota: number | null;
  claimedCount: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface RawPinWithRelations {
  id: string;
  hotelId: string;
  roomId: string | null;
  couponId: string | null;
  mediaType: "PHOTO" | "CAROUSEL" | "VIDEO";
  category: "ROOMS" | "VIEWS" | "VIDEOS" | "DINING" | "REVIEWS";
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  coverImageUrl: string;
  mediaUrls: string[];
  videoUrl: string | null;
  aspectRatio: string;
  provinceId: string;
  stayStyles: string[];
  semanticTags: string[];
  sourcePlatform: "MANUAL" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  dealSourceType?: "INTERNAL" | "EXTERNAL";
  externalDealUrl?: string | null;
  externalSourceName?: string | null;
  promoHeadlineTh?: string | null;
  promoHeadlineEn?: string | null;
  promoCode?: string | null;
  promoOriginalPriceThb?: number | null;
  promoDealPriceThb?: number | null;
  promoExpiresAt?: Date | null;
  externalClickCount?: number;
  publishStatus: "PUBLISHED" | "PENDING_APPROVAL" | "DISCARDED";
  aiConfidenceScore: number | null;
  aiTriageNote: string | null;
  isSponsored: boolean;
  sponsoredPriority: number;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  hotel: {
    slug: string;
    nameTh: string;
    nameEn: string;
    logoUrl: string | null;
    verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
    ratingAvg: number;
    latitude?: number | null;
    longitude?: number | null;
    districtTh?: string | null;
    addressTh?: string | null;
    googleMapsUrl?: string | null;
    nearbySpotsJson?: unknown;
    rooms?: Array<{ weekdayPriceThb: number }>;
    coupons?: RawPinCoupon[];
  };
  room: {
    code: string;
    nameTh: string;
    nameEn: string;
    weekdayPriceThb: number;
  } | null;
  coupon: RawPinCoupon | { code: string } | null;
}

function isFullCoupon(
  coupon: RawPinCoupon | { code: string } | null | undefined
): coupon is RawPinCoupon {
  return Boolean(coupon && "id" in coupon && "discountValue" in coupon);
}

function isCouponClaimable(c: RawPinCoupon, nowMs: number): boolean {
  if (!c.isActive) return false;
  if (c.expiresAt.getTime() <= nowMs) return false;
  if (c.totalQuota !== null && c.claimedCount >= c.totalQuota) return false;
  return true;
}

function toPinActiveCouponDto(c: RawPinCoupon): PinActiveCouponDto {
  return {
    id: c.id,
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
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
  };
}

export function mapPinToDto(
  pin: RawPinWithRelations,
  likedSet?: ReadonlySet<string>,
  savedSet?: ReadonlySet<string>
): PinFeedItemDto {
  const province = getProvinceById(pin.provinceId);
  const hotelMinPrice =
    pin.hotel.rooms && pin.hotel.rooms.length > 0
      ? Math.min(...pin.hotel.rooms.map((r) => r.weekdayPriceThb))
      : null;

  const seenMediaKeys = new Set<string>();
  const cleanedMediaUrls: string[] = [];
  for (const raw of pin.mediaUrls) {
    const clean = (raw || "").trim();
    if (!clean || clean.includes("res.cloudinary.com/dxxb2gvyw/")) continue;
    let key = clean;
    try {
      const u = new URL(clean);
      if (u.hostname === "images.unsplash.com") {
        key = `${u.origin}${u.pathname}`;
      }
    } catch {
      // keep literal URL as dedupe key
    }
    if (seenMediaKeys.has(key)) continue;
    seenMediaKeys.add(key);
    cleanedMediaUrls.push(clean);
  }

  const nowMs = Date.now();
  const seenCouponIds = new Set<string>();
  const resolvedRawCoupons: RawPinCoupon[] = [];

  if (isFullCoupon(pin.coupon) && isCouponClaimable(pin.coupon, nowMs)) {
    seenCouponIds.add(pin.coupon.id);
    resolvedRawCoupons.push(pin.coupon);
  }
  if (pin.hotel.coupons && pin.hotel.coupons.length > 0) {
    for (const c of pin.hotel.coupons) {
      if (!seenCouponIds.has(c.id) && isCouponClaimable(c, nowMs)) {
        seenCouponIds.add(c.id);
        resolvedRawCoupons.push(c);
      }
    }
  }

  const activeCoupons = resolvedRawCoupons.map(toPinActiveCouponDto);
  const activeCoupon = activeCoupons[0] ?? null;

  const rawNearby = Array.isArray(pin.hotel.nearbySpotsJson)
    ? pin.hotel.nearbySpotsJson
    : [];
  const hotelNearbySpots = rawNearby
    .filter(
      (item): item is { nameTh: string; distTh?: string } =>
        Boolean(item && typeof item === "object" && "nameTh" in item)
    )
    .map((item) => ({
      nameTh: String(item.nameTh || ""),
      distTh: String(item.distTh || ""),
    }))
    .filter((item) => item.nameTh.length > 0);

  const dealSourceType = pin.dealSourceType ?? "INTERNAL";
  const resolvedPromoHeadlineTh =
    pin.promoHeadlineTh ||
    (activeCoupon
      ? activeCoupon.discountType === "PERCENT"
        ? `ลด ${activeCoupon.discountValue}%`
        : `ลด ฿${activeCoupon.discountValue.toLocaleString()}`
      : null);
  const resolvedPromoHeadlineEn =
    pin.promoHeadlineEn ||
    (activeCoupon
      ? activeCoupon.discountType === "PERCENT"
        ? `${activeCoupon.discountValue}% OFF`
        : `฿${activeCoupon.discountValue.toLocaleString()} OFF`
      : null);

  return {
    id: pin.id,
    hotelId: pin.hotelId,
    hotelSlug: pin.hotel.slug,
    hotelNameTh: pin.hotel.nameTh,
    hotelNameEn: pin.hotel.nameEn || pin.hotel.nameTh,
    hotelLogoUrl: pin.hotel.logoUrl,
    hotelVerificationStatus: pin.hotel.verificationStatus,
    hotelRatingAvg: pin.hotel.ratingAvg,
    hotelLatitude:
      typeof pin.hotel.latitude === "number" ? pin.hotel.latitude : null,
    hotelLongitude:
      typeof pin.hotel.longitude === "number" ? pin.hotel.longitude : null,
    hotelDistrictTh: pin.hotel.districtTh ?? "",
    hotelAddressTh: pin.hotel.addressTh ?? "",
    hotelGoogleMapsUrl: pin.hotel.googleMapsUrl ?? null,
    hotelNearbySpots,
    roomId: pin.roomId,
    roomCode: pin.room?.code ?? null,
    roomNameTh: pin.room?.nameTh ?? null,
    roomNameEn: pin.room?.nameEn ?? null,
    couponId: activeCoupon?.id ?? pin.couponId,
    couponCode: activeCoupon?.code ?? pin.promoCode ?? pin.coupon?.code ?? null,
    activeCoupon,
    activeCoupons,
    dealSourceType,
    externalDealUrl: pin.externalDealUrl ?? null,
    externalSourceName: pin.externalSourceName ?? null,
    promoHeadlineTh: resolvedPromoHeadlineTh,
    promoHeadlineEn: resolvedPromoHeadlineEn,
    promoCode: pin.promoCode ?? activeCoupon?.code ?? null,
    promoOriginalPriceThb: pin.promoOriginalPriceThb ?? null,
    promoDealPriceThb: pin.promoDealPriceThb ?? null,
    promoExpiresAt: pin.promoExpiresAt
      ? pin.promoExpiresAt.toISOString()
      : activeCoupon?.expiresAt ?? null,
    externalClickCount: pin.externalClickCount ?? 0,
    mediaType: pin.mediaType,
    category: pin.category,
    titleTh: pin.titleTh,
    titleEn: pin.titleEn || pin.titleTh,
    descriptionTh: pin.descriptionTh,
    descriptionEn: pin.descriptionEn || pin.descriptionTh,
    coverImageUrl: pin.coverImageUrl,
    mediaUrls:
      cleanedMediaUrls.length > 0 ? cleanedMediaUrls : [pin.coverImageUrl],
    videoUrl: pin.videoUrl,
    aspectRatio: pin.aspectRatio || "aspect-[3/4]",
    provinceId: pin.provinceId,
    provinceNameTh: province
      ? province.nameTh.split("(")[0].trim()
      : pin.provinceId,
    provinceNameEn: province ? province.nameEn : pin.provinceId,
    stayStyles: pin.stayStyles,
    semanticTags: pin.semanticTags,
    sourcePlatform: pin.sourcePlatform,
    publishStatus: pin.publishStatus,
    aiConfidenceScore: pin.aiConfidenceScore,
    aiTriageNote: pin.aiTriageNote,
    isSponsored: pin.isSponsored,
    sponsoredPriority: pin.sponsoredPriority,
    nightlyPriceThb:
      pin.promoDealPriceThb ?? pin.room?.weekdayPriceThb ?? hotelMinPrice,
    likesCount: pin.likesCount,
    savesCount: pin.savesCount,
    commentsCount: pin.commentsCount,
    sharesCount: pin.sharesCount,
    isLikedByMe: likedSet ? likedSet.has(pin.id) : false,
    isSavedByMe: savedSet ? savedSet.has(pin.id) : false,
    createdAt: pin.createdAt.toISOString(),
  };
}
