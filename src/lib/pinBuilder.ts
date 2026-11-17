import {
  CURATED_THAILAND_PARTNER_PINS,
  StayStyleTag,
} from "@/data/thailandProvinces";
import { SiteCmsContent, pickLocalizedText } from "@/data/cmsDefaults";
import {
  ExtraAddon,
  PromoCoupon,
  RoomLodge,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { LanguageCode } from "@/lib/dateFormatters";
import { CmsEditorTarget } from "@/components/cms/AdminEditOverlay";

export type PinCategoryId =
  | "all"
  | "rooms"
  | "videos"
  | "views"
  | "dining"
  | "reviews"
  | "deals";

export interface PinterestPinItem {
  id: string;
  category: Exclude<PinCategoryId, "all">;
  provinceId: string;
  provinceLabel: string;
  styles: StayStyleTag[];
  aspectClass: string;
  imageUrl: string;
  galleryUrls: string[];
  videoUrl?: string;
  videoDuration?: string;
  title: string;
  description: string;
  boardLabel: string;
  authorName: string;
  authorSubtitle: string;
  authorAvatar?: string;
  footerCaption?: string;
  footerSubcaption?: string;
  nightlyPriceThb?: number;
  ratingScore?: string;
  roomId?: string;
  maxGuests?: number;
  ctaLabel?: string;
  onCtaClick?: () => void;
  baseLikes: number;
  rankingScore: number;
  onEdit?: () => void;
}

export interface UserBoardCollection {
  id: string;
  name: string;
  pinIds: string[];
  createdAtIso: string;
}

export const SAVED_PINS_STORAGE_KEY = "cangaroom-saved-pins";
export const LIKED_PINS_STORAGE_KEY = "cangaroom-liked-pins";
export const USER_BOARDS_STORAGE_KEY = "cangaroom-user-boards";

const STAGGERED_PHOTO_ASPECTS = [
  "aspect-[2/3]",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-[1/1]",
  "aspect-[5/6]",
  "aspect-[4/3]",
];

/** Varied video aspect ratios (16:9 landscape + 9:16 vertical + 3:4 + 2:3 — matches Fastwork & Pinterest mixed video masonry!) */
const STAGGERED_VIDEO_ASPECTS = [
  "aspect-[16/9]",
  "aspect-[9/16]",
  "aspect-[3/4]",
  "aspect-[2/3]",
  "aspect-[16/9]",
  "aspect-[4/5]",
];

const VIDEO_DURATIONS = ["0:18", "0:24", "0:32", "0:15", "0:28", "0:41"];

function detectProvinceIdFromLocation(locationText: string): string {
  const t = locationText.toLowerCase();
  if (t.includes("น่าน") || t.includes("สะปัน") || t.includes("nan")) return "nan";
  if (t.includes("เชียงใหม่") || t.includes("chiang mai")) return "chiang-mai";
  if (t.includes("ภูเก็ต") || t.includes("phuket")) return "phuket";
  if (t.includes("เขาใหญ่") || t.includes("นครราชสีมา") || t.includes("khao yai"))
    return "nakhon-ratchasima";
  if (t.includes("กรุงเทพ") || t.includes("bangkok")) return "bangkok";
  if (t.includes("ชลบุรี") || t.includes("พัทยา")) return "chon-buri";
  if (t.includes("กระบี่") || t.includes("krabi")) return "krabi";
  if (t.includes("หัวหิน") || t.includes("ประจวบ")) return "prachuap-khiri-khan";
  if (t.includes("กาญจนบุรี")) return "kanchanaburi";
  return "nan";
}

export interface BuildMarketplacePinsParams {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  addons: ExtraAddon[];
  coupons: PromoCoupon[];
  cms: SiteCmsContent;
  language: LanguageCode;
  navigateToBookRoom: (roomId?: string) => void;
  navigateToReview: () => void;
  claimCouponAndBook: (code: string) => void;
  openCmsEditor?: (target: CmsEditorTarget) => void;
  includePartnerPins?: boolean;
}

export function buildAllMarketplacePins({
  propertyConfig,
  rooms,
  addons,
  coupons,
  cms,
  language,
  navigateToBookRoom,
  navigateToReview,
  claimCouponAndBook,
  openCmsEditor,
  includePartnerPins = true,
}: BuildMarketplacePinsParams): PinterestPinItem[] {
  const resortName = pickLocalizedText(
    language,
    propertyConfig.nameTh.split("(")[0].trim(),
    propertyConfig.nameEn
  );
  const resortSubtitle = pickLocalizedText(
    language,
    propertyConfig.locationTh,
    propertyConfig.locationEn
  );
  const primaryProvinceId = detectProvinceIdFromLocation(
    `${propertyConfig.locationTh} ${propertyConfig.locationEn}`
  );
  const primaryProvinceLabel =
    primaryProvinceId === "nan"
      ? language === "th"
        ? "น่าน"
        : "Nan"
      : resortSubtitle;

  const resortAvatar =
    cms.home.heroImageUrl ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url;

  const rawList: PinterestPinItem[] = [];
  let photoCursor = 0;
  const nextPhotoAspect = () => {
    const val =
      STAGGERED_PHOTO_ASPECTS[photoCursor % STAGGERED_PHOTO_ASPECTS.length];
    photoCursor += 1;
    return val;
  };

  // 1. Flagship / Active Tenant Rooms
  rooms.forEach((room, rIdx) => {
    const allUrls = room.images.map((im) => im.url).filter(Boolean);
    const styles: StayStyleTag[] = ["mountain", "bathtub", "glamping"];
    if (room.nameEn.toLowerCase().includes("pool")) styles.push("pool-villa");

    if (allUrls[0]) {
      const likes = cms.pinLikes?.[`room-${room.id}`] ?? 46 + rIdx * 14;
      const commentsCount = cms.pinComments?.[`room-${room.id}`]?.length ?? 0;

      rawList.push({
        id: `room-${room.id}`,
        category: "rooms",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles,
        aspectClass: rIdx % 2 === 0 ? "aspect-[2/3]" : "aspect-[3/4]",
        imageUrl: allUrls[0],
        galleryUrls: allUrls,
        title: pickLocalizedText(language, room.nameTh, room.nameEn),
        description: pickLocalizedText(
          language,
          `${room.shortDescTh} · พื้นที่ ${room.sizeSqm} ตร.ม. รองรับ ${room.baseGuests}–${room.maxGuests} ท่าน ราคาเริ่มต้น ฿${room.basePriceThb.toLocaleString()}/คืน รวมอาหารเช้าเสิร์ฟถึงหน้าห้อง`,
          `${room.shortDescEn} · ${room.sizeSqm} m² for ${room.baseGuests}–${room.maxGuests} guests from ฿${room.basePriceThb.toLocaleString()}/night.`
        ),
        boardLabel: `${room.code} · ${primaryProvinceLabel}`,
        authorName: resortName,
        authorSubtitle: resortSubtitle,
        authorAvatar: resortAvatar,
        footerCaption: pickLocalizedText(language, room.nameTh, room.nameEn),
        footerSubcaption: `${resortName} · ฿${room.basePriceThb.toLocaleString()}/คืน`,
        nightlyPriceThb: room.basePriceThb,
        ratingScore: "4.9",
        roomId: room.id,
        maxGuests: room.maxGuests,
        ctaLabel:
          language === "th"
            ? `เช็กวันว่าง & จองห้องพัก (${room.code})`
            : `Check Dates & Book (${room.code})`,
        onCtaClick: () => navigateToBookRoom(room.id),
        baseLikes: likes,
        rankingScore: likes * 1.2 + commentsCount * 4 + 32,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "room", roomId: room.id })
          : undefined,
      });
    }

    room.images.slice(1).forEach((img, imgIdx) => {
      if (!img.url) return;
      const pinId = `room-angle-${room.id}-${imgIdx}`;
      const likes = cms.pinLikes?.[pinId] ?? 24 + imgIdx * 8;
      rawList.push({
        id: pinId,
        category: "rooms",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles,
        aspectClass: nextPhotoAspect(),
        imageUrl: img.url,
        galleryUrls: [img.url, ...allUrls.filter((u) => u !== img.url)],
        title: pickLocalizedText(
          language,
          img.captionTh || `มุมพักผ่อน ${room.nameTh}`,
          img.captionEn || `Inside ${room.nameEn}`
        ),
        description: pickLocalizedText(
          language,
          room.longDescTh[0] || room.shortDescTh,
          room.longDescEn[0] || room.shortDescEn
        ),
        boardLabel: `${room.code} · Interior`,
        authorName: resortName,
        authorSubtitle: resortSubtitle,
        authorAvatar: resortAvatar,
        nightlyPriceThb: room.basePriceThb,
        ratingScore: "4.9",
        roomId: room.id,
        maxGuests: room.maxGuests,
        ctaLabel:
          language === "th"
            ? `ดูตารางห้องว่าง ${room.code}`
            : `View ${room.code} Availability`,
        onCtaClick: () => navigateToBookRoom(room.id),
        baseLikes: likes,
        rankingScore: likes * 1.1 + 18,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "room", roomId: room.id })
          : undefined,
      });
    });
  });

  // 2. Resort Short Video Pins (Staggered Aspect Ratios so Video Tab is True Masonry!)
  cms.shortsPage.videos
    .filter((v) => v.isActive !== false)
    .forEach((vid, vIdx) => {
      const pinId = `vid-${vid.id}`;
      const likes = cms.pinLikes?.[pinId] ?? (vid.likes || 58);
      rawList.push({
        id: pinId,
        category: "videos",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles: ["mountain", "bathtub", "glamping"],
        aspectClass:
          STAGGERED_VIDEO_ASPECTS[vIdx % STAGGERED_VIDEO_ASPECTS.length],
        imageUrl: vid.posterUrl,
        galleryUrls: [vid.posterUrl],
        videoUrl: vid.videoUrl,
        videoDuration: VIDEO_DURATIONS[vIdx % VIDEO_DURATIONS.length],
        title: pickLocalizedText(language, vid.titleTh, vid.titleEn),
        description: pickLocalizedText(language, vid.captionTh, vid.captionEn),
        boardLabel:
          language === "th" ? `วิดีโอ · ${primaryProvinceLabel}` : "Video Tour",
        authorName: resortName,
        authorSubtitle: `@${cms.shortsPage.channelHandle}`,
        authorAvatar: cms.shortsPage.channelAvatarUrl || resortAvatar,
        footerCaption: pickLocalizedText(language, vid.titleTh, vid.titleEn),
        footerSubcaption: `${resortName} · ${primaryProvinceLabel}`,
        ctaLabel:
          language === "th" ? "เช็กวันว่างของที่พักนี้" : "Check Availability",
        onCtaClick: () => navigateToBookRoom(),
        baseLikes: likes,
        rankingScore: likes * 1.2 + 28,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "short-video", videoId: vid.id })
          : undefined,
      });
    });

  // 3. Curated Partner Hotels across Thailand (Phuket, Chiang Mai, Bangkok, Khao Yai, Krabi, Trat, Hua Hin, Kanchanaburi)
  if (includePartnerPins) {
    CURATED_THAILAND_PARTNER_PINS.forEach((partner) => {
    const likes = cms.pinLikes?.[partner.id] ?? partner.baseLikes;
    const commentsCount = cms.pinComments?.[partner.id]?.length ?? 0;
    const hotelName = pickLocalizedText(
      language,
      partner.hotelNameTh,
      partner.hotelNameEn
    );
    const provLabel = pickLocalizedText(
      language,
      partner.provinceLabelTh,
      partner.provinceLabelEn
    );

    rawList.push({
      id: partner.id,
      category: partner.mediaKind === "video" ? "videos" : "rooms",
      provinceId: partner.provinceId,
      provinceLabel: provLabel,
      styles: partner.styles,
      aspectClass: partner.aspectClass,
      imageUrl: partner.imageUrl,
      galleryUrls: partner.galleryUrls,
      videoUrl: partner.videoUrl,
      videoDuration: partner.videoDuration,
      title: pickLocalizedText(language, partner.titleTh, partner.titleEn),
      description: pickLocalizedText(language, partner.descTh, partner.descEn),
      boardLabel: provLabel,
      authorName: hotelName,
      authorSubtitle: provLabel,
      authorAvatar: partner.imageUrl,
      footerCaption: hotelName,
      footerSubcaption: `${provLabel} · ฿${partner.nightlyPriceThb.toLocaleString()}/คืน · ★ ${partner.rating}`,
      nightlyPriceThb: partner.nightlyPriceThb,
      ratingScore: partner.rating,
      maxGuests: partner.styles.includes("pool-villa") ? 6 : 4,
      ctaLabel:
        language === "th"
          ? `ดูรายละเอียด & เช็กวันว่าง (฿${partner.nightlyPriceThb.toLocaleString()}/คืน)`
          : `Check Rates (฿${partner.nightlyPriceThb.toLocaleString()}/night)`,
      onCtaClick: () => navigateToBookRoom(),
      baseLikes: likes,
      rankingScore: likes * 1.15 + commentsCount * 4 + 26,
    });
    });
  }

  // 4. Guest Reviews
  cms.reviews
    .filter((r) => Boolean(r.photos[0]))
    .forEach((rev, revIdx) => {
      const pinId = `rev-${rev.id}`;
      const likes = cms.pinLikes?.[pinId] ?? (rev.likesCount || 42);
      rawList.push({
        id: pinId,
        category: "reviews",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles: ["mountain", "bathtub"],
        aspectClass: revIdx % 2 === 0 ? "aspect-[4/5]" : "aspect-[3/4]",
        imageUrl: rev.photos[0],
        galleryUrls: rev.photos,
        title: `${pickLocalizedText(
          language,
          rev.authorNameTh,
          rev.authorNameEn
        )} · ★ ${rev.rating}`,
        description: pickLocalizedText(language, rev.captionTh, rev.captionEn),
        boardLabel: language === "th" ? "รีวิวผู้เข้าพัก" : "Guest Review",
        authorName: pickLocalizedText(
          language,
          rev.authorNameTh,
          rev.authorNameEn
        ),
        authorSubtitle: `${resortName} · ${rev.roomLabel}`,
        authorAvatar: rev.authorAvatar,
        footerCaption: pickLocalizedText(
          language,
          rev.authorNameTh,
          rev.authorNameEn
        ),
        footerSubcaption: `รีวิวผู้เข้าพักจริง · ★ ${rev.rating}`,
        ctaLabel: language === "th" ? "อ่านรีวิวทั้งหมด" : "All Guest Reviews",
        onCtaClick: navigateToReview,
        baseLikes: likes,
        rankingScore: likes * 1.1 + 20,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "review", reviewId: rev.id })
          : undefined,
      });
    });

  // 5. Atmosphere & Dining Gallery Photos
  cms.gallery.photos.forEach((gPhoto, gIdx) => {
    const isDining = gPhoto.category === "dining";
    const pinId = `gal-${gPhoto.id}`;
    const likes = cms.pinLikes?.[pinId] ?? 22 + gIdx * 7;
    rawList.push({
      id: pinId,
      category: isDining ? "dining" : "views",
      provinceId: primaryProvinceId,
      provinceLabel: primaryProvinceLabel,
      styles: isDining ? ["mountain", "bars"] : ["mountain", "glamping"],
      aspectClass: nextPhotoAspect(),
      imageUrl: gPhoto.url,
      galleryUrls: [gPhoto.url],
      title: pickLocalizedText(
        language,
        gPhoto.captionTh || resortName,
        gPhoto.captionEn || resortName
      ),
      description: pickLocalizedText(
        language,
        `${gPhoto.captionTh} — บรรยากาศจริงจาก ${propertyConfig.nameTh}`,
        `${gPhoto.captionEn} — ${propertyConfig.nameEn}`
      ),
      boardLabel: isDining
        ? language === "th"
          ? "อาหาร & เครื่องดื่ม"
          : "Dining"
        : primaryProvinceLabel,
      authorName: resortName,
      authorSubtitle: resortSubtitle,
      authorAvatar: resortAvatar,
      baseLikes: likes,
      rankingScore: likes + 12,
      onEdit: openCmsEditor
        ? () => openCmsEditor({ type: "gallery-photos" })
        : undefined,
    });
  });

  // 6. Coupons & Dining Addons
  coupons
    .filter((c) => c.isActive && c.imageUrl)
    .forEach((cp, cIdx) => {
      const pinId = `cp-${cp.id}`;
      const likes = cms.pinLikes?.[pinId] ?? 50 + cIdx * 9;
      rawList.push({
        id: pinId,
        category: "deals",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles: ["mountain"],
        aspectClass: cIdx % 2 === 0 ? "aspect-[3/4]" : "aspect-[1/1]",
        imageUrl: cp.imageUrl!,
        galleryUrls: [cp.imageUrl!],
        title: pickLocalizedText(language, cp.titleTh, cp.titleEn),
        description: pickLocalizedText(
          language,
          `${cp.descTh || cp.titleTh} (รหัสคูปอง: ${cp.code})`,
          `${cp.titleEn || cp.titleTh} (Promo code: ${cp.code})`
        ),
        boardLabel: `โค้ด ${cp.code}`,
        authorName: resortName,
        authorSubtitle: language === "th" ? "ดีลจองตรง" : "Direct Deal",
        authorAvatar: resortAvatar,
        footerCaption: pickLocalizedText(language, cp.titleTh, cp.titleEn),
        footerSubcaption: `คูปอง ${cp.code}`,
        ctaLabel:
          language === "th"
            ? `เก็บคูปอง ${cp.code} & จองห้องพัก`
            : `Claim ${cp.code} & Book`,
        onCtaClick: () => claimCouponAndBook(cp.code),
        baseLikes: likes,
        rankingScore: likes + 15,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "coupon", couponId: cp.id })
          : undefined,
      });
    });

  addons
    .filter((ad) => ad.isActive && ad.imageUrl)
    .forEach((ad, aIdx) => {
      const pinId = `addon-${ad.id}`;
      const likes = cms.pinLikes?.[pinId] ?? 29 + aIdx * 6;
      rawList.push({
        id: pinId,
        category: "dining",
        provinceId: primaryProvinceId,
        provinceLabel: primaryProvinceLabel,
        styles: ["mountain", "bars"],
        aspectClass: aIdx % 2 === 0 ? "aspect-[4/5]" : "aspect-[1/1]",
        imageUrl: ad.imageUrl!,
        galleryUrls: [ad.imageUrl!],
        title: pickLocalizedText(language, ad.nameTh, ad.nameEn),
        description: `${ad.descTh} · ฿${ad.priceThb.toLocaleString()} / ${ad.unitTh}`,
        boardLabel: language === "th" ? "เซ็ตอาหาร & บาร์" : "Dining & Bar",
        authorName: resortName,
        authorSubtitle: resortSubtitle,
        authorAvatar: resortAvatar,
        baseLikes: likes,
        rankingScore: likes + 10,
        onEdit: openCmsEditor
          ? () => openCmsEditor({ type: "addon", addonId: ad.id })
          : undefined,
      });
    });

  // Deduplicate identical image URLs (preserving videos) & apply International Diversity Ranking
  const seenImageUrls = new Set<string>();
  const uniquePins = rawList.filter((p) => {
    if (!p.imageUrl) return false;
    if (!p.videoUrl && seenImageUrls.has(p.imageUrl)) return false;
    seenImageUrls.add(p.imageUrl);
    return true;
  });

  // Sort by quality/engagement score descending, then apply author diversity penalty so one property doesn't cluster 5x in a row
  const sortedByScore = [...uniquePins].sort(
    (a, b) => b.rankingScore - a.rankingScore
  );

  const diversified: PinterestPinItem[] = [];
  const pool = [...sortedByScore];
  while (pool.length > 0) {
    const prevAuthor = diversified[diversified.length - 1]?.authorName;
    const prevAspect = diversified[diversified.length - 1]?.aspectClass;
    let pickIndex = pool.findIndex(
      (item) =>
        item.authorName !== prevAuthor && item.aspectClass !== prevAspect
    );
    if (pickIndex === -1) {
      pickIndex = pool.findIndex((item) => item.aspectClass !== prevAspect);
    }
    if (pickIndex === -1) {
      pickIndex = 0;
    }
    diversified.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }

  return diversified;
}

