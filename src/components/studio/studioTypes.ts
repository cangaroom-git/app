import type {
  BookingSummaryDto,
  HotelAddonDto,
  HotelPostDetailDto,
  PinFeedItemDto,
  RoomDateOverrideDto,
  VerificationStatusDto,
} from "@/types/cangaroom";

export interface StudioHotelRecord {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  descriptionTh: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  provinceId: string;
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
  contactPhone: string;
  contactLine: string;
  facebookPageUrl: string;
  instagramUrl: string;
  promptPayId: string;
  promptPayAccountName: string;
  verificationStatus: VerificationStatusDto;
}

export interface StudioRoomRecord {
  id: string;
  code: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  shortDescTh: string;
  totalUnits: number;
  weekdayPriceThb: number;
  weekendPriceThb: number;
  extraGuestPriceThb: number;
  sizeSqm: number;
  standardGuests: number;
  maxGuests: number;
  petsAllowed: boolean;
  amenities: string[];
  galleryUrls: string[];
  isActive: boolean;
}

export interface StudioCouponRecord {
  id: string;
  code: string;
  titleTh: string;
  descriptionTh: string;
  discountType: "PERCENT" | "FIXED_THB";
  discountValue: number;
  minSpendThb: number;
  maxDiscountThb: number | null;
  totalQuota: number | null;
  claimedCount: number;
  usedCount: number;
  expiresAt: string;
  isFeaturedDeal: boolean;
  isActive: boolean;
}

export interface StudioSocialConnectionRecord {
  id: string;
  platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  externalPageId: string;
  externalPageName: string;
  pageUrl: string | null;
  publishMode: "ONE_CLICK_APPROVE" | "AUTO_HIGH_CONFIDENCE";
  lastSyncedAt: string | null;
}

export interface StudioPayload {
  hotel: StudioHotelRecord;
  stats: {
    boardSavesCount: number;
    contactClicksTotal: number;
    contactClicksByChannel: {
      LINE: number;
      FACEBOOK_MESSENGER: number;
      PHONE: number;
    };
    confirmedRevenueThb: number;
    estimatedOtaGpSavedThb: number;
    pendingBookingsCount: number;
    pendingSyncPinsCount: number;
  };
  rooms: StudioRoomRecord[];
  dateOverrides: RoomDateOverrideDto[];
  addons: HotelAddonDto[];
  coupons: StudioCouponRecord[];
  pins: PinFeedItemDto[];
  bookings: BookingSummaryDto[];
  socialConnections: StudioSocialConnectionRecord[];
  posts: HotelPostDetailDto[];
}

