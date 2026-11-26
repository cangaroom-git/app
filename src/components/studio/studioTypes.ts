import type { SeasonalRuleRecord } from "@/lib/seasonalPricing";
import type {
  BookingSummaryDto,
  GuestReviewDto,
  HotelAddonDto,
  HotelDiscountRuleDto,
  HotelPostDetailDto,
  MerchantModeDto,
  PinFeedItemDto,
  PlaceCategoryDto,
  PlaceOpeningHoursDayDto,
  PropertyTypeDto,
  RoomDateOverrideDto,
  RoomPhotoMetaDto,
  VerificationStatusDto,
} from "@/types/cangaroom";

export interface StudioHotelHighlight {
  titleTh: string;
  descTh: string;
}

export interface StudioNearbySpot {
  nameTh: string;
  distTh: string;
}

export interface StudioFaqItem {
  qTh: string;
  aTh: string;
}

export interface StudioHotelRecord {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  taglineEn: string;
  descriptionTh: string;
  descriptionEn: string;
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
  highlightsJson: StudioHotelHighlight[] | null;
  nearbySpotsJson: StudioNearbySpot[] | null;
  faqJson: StudioFaqItem[] | null;
  seasonalRulesJson?: SeasonalRuleRecord[] | null;
  contactPhone: string;
  contactLine: string;
  facebookPageUrl: string;
  instagramUrl: string;
  promptPayId: string;
  promptPayAccountName: string;
  bankName: string;
  bankAccountNo: string;
  propertyType: PropertyTypeDto;
  placeCategory: PlaceCategoryDto;
  merchantMode: MerchantModeDto;
  locationScope?: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh?: string;
  branchSummaryEn?: string;
  eligibleProvinceIds?: string[];
  externalWebsiteUrl: string;
  primaryCtaLabelTh: string;
  openingHoursJson?: PlaceOpeningHoursDayDto[] | null;
  googlePlaceId?: string | null;
  canonicalPinId?: string | null;
  featuredCouponId?: string | null;
  isPublished: boolean;
  ratingAvg: number;
  reviewCount: number;
  verificationStatus: VerificationStatusDto;
}

export interface StudioBranchRecord {
  id: string;
  branchNameTh: string;
  branchNameEn: string;
  provinceId: string;
  districtTh: string;
  addressTh: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface StudioMerchantSettingsExtras {
  taxInvoiceEnabled: boolean;
  taxLegalName: string;
  taxId: string;
  taxBranchCode: string;
  taxAddress: string;
  allowSearchIndexing: boolean;
  seoMetaTitle: string;
  seoMetaDescription: string;
}

export interface StudioRoomRecord {
  id: string;
  code: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  categoryTh: string;
  categoryEn: string;
  shortDescTh: string;
  shortDescEn: string;
  totalUnits: number;
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
  galleryMetaJson?: RoomPhotoMetaDto[] | null;
  isActive: boolean;
  sortOrder: number;
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
  startsAt: string;
  expiresAt: string;
  isFeaturedDeal: boolean;
  isActive: boolean;
  sortOrder?: number;
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
    totalPinViews?: number;
    totalExternalClicks?: number;
    activePromosCount?: number;
  };
  branches?: StudioBranchRecord[];
  merchantSettings?: StudioMerchantSettingsExtras;
  rooms: StudioRoomRecord[];
  dateOverrides: RoomDateOverrideDto[];
  bookedUnitsByRoomDate: Record<string, number>;
  addons: HotelAddonDto[];
  coupons: StudioCouponRecord[];
  discountRules: HotelDiscountRuleDto[];
  pins: PinFeedItemDto[];
  bookings: BookingSummaryDto[];
  reviews: GuestReviewDto[];
  socialConnections: StudioSocialConnectionRecord[];
  posts: HotelPostDetailDto[];
}
