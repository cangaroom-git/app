import type {
  RoomPhotoMeta,
  RoomPhotoSpaceId,
} from "@/lib/roomPhotoSpaces";

export type { RoomPhotoSpaceId };
export type RoomPhotoMetaDto = RoomPhotoMeta;

export type AppRole = "TRAVELLER" | "HOTEL_OWNER" | "SUPER_ADMIN";

export type VerificationStatusDto = "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
export type PinMediaTypeDto = "PHOTO" | "CAROUSEL" | "VIDEO";
export type PinCategoryDto = "ROOMS" | "VIEWS" | "VIDEOS" | "DINING" | "REVIEWS";
export type PinPublishStatusDto = "PUBLISHED" | "PENDING_APPROVAL" | "DISCARDED";
export type DealSourceTypeDto = "INTERNAL" | "EXTERNAL";
export type DiscountTypeDto = "PERCENT" | "FIXED_THB";
export type PropertyTypeDto =
  | "BOUTIQUE_HOTEL"
  | "RESORT"
  | "POOL_VILLA"
  | "GLAMPING_HOMESTAY";
export type DiscountRuleTypeDto =
  | "LENGTH_OF_STAY"
  | "EARLY_BIRD"
  | "LAST_MINUTE";
export type BookingStatusDto =
  | "HOLD_PENDING_PAYMENT"
  | "PENDING_VERIFICATION"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export interface PinActiveCouponDto {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  coverImageUrl: string | null;
  discountType: DiscountTypeDto;
  discountValue: number;
  minSpendThb: number;
  maxDiscountThb: number | null;
  totalQuota: number | null;
  claimedCount: number;
  startsAt: string;
  expiresAt: string;
}

export interface PinFeedItemDto {
  id: string;
  hotelId: string;
  hotelSlug: string;
  hotelNameTh: string;
  hotelNameEn: string;
  hotelLogoUrl: string | null;
  hotelVerificationStatus: VerificationStatusDto;
  hotelRatingAvg: number;
  hotelLatitude: number | null;
  hotelLongitude: number | null;
  hotelDistrictTh: string;
  hotelAddressTh: string;
  hotelGoogleMapsUrl: string | null;
  hotelNearbySpots: Array<{ nameTh: string; distTh: string }>;
  roomId: string | null;
  roomCode: string | null;
  roomNameTh: string | null;
  roomNameEn: string | null;
  couponId: string | null;
  couponCode: string | null;
  activeCoupon: PinActiveCouponDto | null;
  activeCoupons: PinActiveCouponDto[];
  dealSourceType: DealSourceTypeDto;
  externalDealUrl: string | null;
  externalSourceName: string | null;
  promoHeadlineTh: string | null;
  promoHeadlineEn: string | null;
  promoCode: string | null;
  promoOriginalPriceThb: number | null;
  promoDealPriceThb: number | null;
  promoExpiresAt: string | null;
  externalClickCount: number;
  mediaType: PinMediaTypeDto;
  category: PinCategoryDto;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  coverImageUrl: string;
  mediaUrls: string[];
  videoUrl: string | null;
  aspectRatio: string;
  provinceId: string;
  provinceNameTh: string;
  provinceNameEn: string;
  stayStyles: string[];
  semanticTags: string[];
  sourcePlatform: "MANUAL" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  publishStatus: PinPublishStatusDto;
  aiConfidenceScore: number | null;
  aiTriageNote: string | null;
  isSponsored: boolean;
  sponsoredPriority: number;
  nightlyPriceThb: number | null;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  createdAt: string;
}

export interface PinCommentDto {
  id: string;
  pinId: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  parentId: string | null;
  isHotelOwnerReply: boolean;
  body: string;
  likesCount: number;
  createdAt: string;
  replies: PinCommentDto[];
}

export interface RoomAvailabilityDto {
  id: string;
  hotelId: string;
  code: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  categoryTh: string;
  categoryEn: string;
  shortDescTh: string;
  shortDescEn: string;
  totalUnits: number;
  availableUnits: number;
  heldUnits: number;
  weekdayPriceThb: number;
  weekendPriceThb: number;
  extraGuestPriceThb: number;
  sizeSqm: number;
  standardGuests: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  petsAllowed: boolean;
  amenities: string[];
  galleryUrls: string[];
  galleryMeta?: RoomPhotoMetaDto[];
  isActive: boolean;
  sortOrder: number;
}

export interface RoomDateOverrideDto {
  id: string;
  roomId: string;
  dateStr: string;
  blockedUnits: number;
  overridePriceThb: number | null;
  minNights?: number;
  note: string | null;
}

export interface HotelDiscountRuleDto {
  id: string;
  hotelId: string;
  ruleType: DiscountRuleTypeDto;
  titleTh: string;
  discountType: DiscountTypeDto;
  discountValue: number;
  minNights: number | null;
  minAdvanceDays: number | null;
  maxAdvanceDays: number | null;
  isActive: boolean;
}

export interface HotelAddonDto {
  id: string;
  hotelId: string;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  priceThb: number;
  unitLabelTh: string;
  unitLabelEn: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CouponDealDto {
  id: string;
  hotelId: string;
  hotelSlug: string;
  hotelNameTh: string;
  hotelNameEn: string;
  hotelLogoUrl: string | null;
  hotelVerificationStatus: VerificationStatusDto;
  provinceId: string;
  provinceNameTh: string;
  provinceNameEn: string;
  stayStyles: string[];
  code: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  coverImageUrl: string | null;
  discountType: DiscountTypeDto;
  discountValue: number;
  minSpendThb: number;
  maxDiscountThb: number | null;
  totalQuota: number | null;
  claimedCount: number;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isFeaturedDeal: boolean;
  isActive: boolean;
  isClaimedByMe: boolean;
  usedAt: string | null;
}

export interface GuestReviewDto {
  id: string;
  hotelId: string;
  roomCode: string | null;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  commentTh: string;
  commentEn: string;
  photoUrls: string[];
  isVerifiedStay: boolean;
  ownerReplyTh?: string | null;
  ownerRepliedAt?: string | null;
  createdAt: string;
}

export type PostPublishStatusDto = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface HotelPostSummaryDto {
  id: string;
  hotelId: string;
  hotelSlug: string;
  hotelNameTh: string;
  hotelLogoUrl: string | null;
  hotelVerificationStatus: VerificationStatusDto;
  provinceNameTh: string;
  roomId: string | null;
  roomCode: string | null;
  roomNameTh: string | null;
  roomPriceThb: number | null;
  slug: string;
  titleTh: string;
  excerptTh: string;
  coverImageUrl: string;
  categoryTh: string;
  tags: string[];
  status: PostPublishStatusDto;
  viewsCount: number;
  publishedAt: string;
}

export interface HotelPostDetailDto extends HotelPostSummaryDto {
  contentTh: string;
  galleryUrls: string[];
}

export interface HotelProfileDto {
  id: string;
  slug: string;
  ownerId: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  taglineEn: string;
  descriptionTh: string;
  descriptionEn: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  provinceId: string;
  provinceNameTh: string;
  provinceNameEn: string;
  districtTh: string;
  addressTh: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  stayStyles: string[];
  checkInTime: string;
  checkOutTime: string;
  petsAllowed: boolean;
  petPolicyTh: string;
  highlights: Array<{ titleTh: string; descTh: string }>;
  nearbySpots: Array<{ nameTh: string; distTh: string }>;
  faqs: Array<{ qTh: string; aTh: string }>;
  contactPhone: string;
  contactLine: string;
  facebookPageUrl: string;
  instagramUrl: string;
  promptPayId: string;
  promptPayAccountName: string;
  bankName: string;
  bankAccountNo: string;
  verificationStatus: VerificationStatusDto;
  isPublished: boolean;
  ratingAvg: number;
  reviewCount: number;
  totalSavesCount: number;
}

export interface HotelStorefrontDto {
  hotel: HotelProfileDto;
  rooms: RoomAvailabilityDto[];
  dateOverrides: RoomDateOverrideDto[];
  bookedUnitsByRoomDate?: Record<string, number>;
  addons: HotelAddonDto[];
  coupons: CouponDealDto[];
  discountRules?: HotelDiscountRuleDto[];
  pins: PinFeedItemDto[];
  reviews: GuestReviewDto[];
  posts: HotelPostSummaryDto[];
}

export interface SavedBoardPinItemDto {
  boardPinId: string;
  boardId: string;
  boardName: string;
  savedPriceSnapshotThb: number | null;
  currentMinPriceThb: number | null;
  priceDropThb: number;
  hasActivePromo: boolean;
  activePromoLabel: string | null;
  savedAt: string;
  pin: PinFeedItemDto;
}

export interface SavedBoardDto {
  id: string;
  name: string;
  createdAt: string;
  pinCount: number;
  items: SavedBoardPinItemDto[];
}

export interface BookingSummaryDto {
  id: string;
  bookingCode: string;
  hotelId: string;
  hotelSlug: string;
  hotelNameTh: string;
  hotelNameEn: string;
  hotelLogoUrl: string | null;
  promptPayId: string;
  promptPayAccountName: string;
  roomId: string;
  roomCode: string;
  roomNameTh: string;
  roomNameEn: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  unitsBooked: number;
  roomSubtotalThb: number;
  addonsTotalThb: number;
  discountThb: number;
  netTotalThb: number;
  addons: Array<{ id: string; nameTh: string; qty: number; unitPriceThb: number }>;
  couponCode: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  guestLine: string | null;
  guestNote: string | null;
  slipImageUrl: string | null;
  slipQrPayload: string | null;
  holdExpiresAt: string | null;
  status: BookingStatusDto;
  createdAt: string;
}

export interface OwnedHotelSummaryDto {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  provinceId: string;
  verificationStatus: VerificationStatusDto;
  pendingBookingsCount: number;
}

export interface AuthenticatedMeDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: AppRole;
  savedPinsCount: number;
  savedCouponsCount: number;
  pendingBookingsCount: number;
  ownedHotels: OwnedHotelSummaryDto[];
}

