import { getProvinceById } from "@/data/thailandProvinces";
import type { PinFeedItemDto } from "@/types/cangaroom";

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
  };
  room: {
    code: string;
    nameTh: string;
    nameEn: string;
    weekdayPriceThb: number;
  } | null;
  coupon: {
    code: string;
  } | null;
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
    couponId: pin.couponId,
    couponCode: pin.coupon?.code ?? null,
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
    provinceNameTh: province ? province.nameTh.split("(")[0].trim() : pin.provinceId,
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

