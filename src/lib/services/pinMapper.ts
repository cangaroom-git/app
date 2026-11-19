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

  return {
    id: pin.id,
    hotelId: pin.hotelId,
    hotelSlug: pin.hotel.slug,
    hotelNameTh: pin.hotel.nameTh,
    hotelNameEn: pin.hotel.nameEn || pin.hotel.nameTh,
    hotelLogoUrl: pin.hotel.logoUrl,
    hotelVerificationStatus: pin.hotel.verificationStatus,
    hotelRatingAvg: pin.hotel.ratingAvg,
    roomId: pin.roomId,
    roomCode: pin.room?.code ?? null,
    roomNameTh: pin.room?.nameTh ?? null,
    roomNameEn: pin.room?.nameEn ?? null,
    couponId: activeCoupon?.id ?? pin.couponId,
    couponCode: activeCoupon?.code ?? pin.coupon?.code ?? null,
    activeCoupon,
    activeCoupons,
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
    nightlyPriceThb: pin.room?.weekdayPriceThb ?? hotelMinPrice,
    likesCount: pin.likesCount,
    savesCount: pin.savesCount,
    commentsCount: pin.commentsCount,
    sharesCount: pin.sharesCount,
    isLikedByMe: likedSet ? likedSet.has(pin.id) : false,
    isSavedByMe: savedSet ? savedSet.has(pin.id) : false,
    createdAt: pin.createdAt.toISOString(),
  };
}
