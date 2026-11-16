import {
  RESORT_SHORTS,
  SHORTS_CATEGORIES,
  ShortVideoItem,
} from "@/data/shortsData";

export type CmsIconKey =
  | "mountain"
  | "bath"
  | "coffee"
  | "trees"
  | "utensils"
  | "compass"
  | "star"
  | "sparkles"
  | "qrcode"
  | "shield"
  | "wifi"
  | "flame"
  | "sun"
  | "mappin"
  | "gift"
  | "heart";

export type CmsStoryTargetTab = "deal" | "guide" | "book" | "shorts" | "review";

export interface HomePillarItem {
  id: string;
  iconKey: CmsIconKey;
  titleTh: string;
  titleEn: string;
  captionTh: string;
  captionEn: string;
}

export interface HomeEditorialStoryItem {
  id: string;
  isVisible: boolean;
  iconKey: CmsIconKey;
  eyebrowTh: string;
  eyebrowEn: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  imageUrl: string;
  pins: { th: string; en: string }[];
  ctaLabelTh: string;
  ctaLabelEn: string;
  ctaTargetTab: CmsStoryTargetTab;
}

export interface HomeGuestQuoteItem {
  id: string;
  quoteTh: string;
  quoteEn: string;
  authorTh: string;
  authorEn: string;
  score: string;
}

export interface HomeInvitePerkItem {
  id: string;
  iconKey: CmsIconKey;
  labelTh: string;
  labelEn: string;
}

export interface HomeCmsConfig {
  heroImageUrl: string;
  heroLocationTh: string;
  heroLocationEn: string;
  ratingBadgeTh: string;
  ratingBadgeEn: string;
  manifestoTitleTh: string;
  manifestoTitleEn: string;
  manifestoDescTh: string;
  manifestoDescEn: string;
  pillars: HomePillarItem[];
  villasEyebrowTh: string;
  villasEyebrowEn: string;
  villasTitleTh: string;
  villasTitleEn: string;
  stories: HomeEditorialStoryItem[];
  livingEyebrowTh: string;
  livingEyebrowEn: string;
  livingTitleTh: string;
  livingTitleEn: string;
  guestQuotes: HomeGuestQuoteItem[];
  inviteGuaranteeTh: string;
  inviteGuaranteeEn: string;
  inviteTitleTh: string;
  inviteTitleEn: string;
  invitePerks: HomeInvitePerkItem[];
  inviteCtaTh: string;
  inviteCtaEn: string;
}

export interface BookingCategoryChipItem {
  id: string;
  labelTh: string;
  labelEn: string;
  codePrefix?: string;
}

export interface BookingPageCmsConfig {
  heroBannerUrl: string;
  ratingScore: string;
  reviewCountTh: string;
  reviewCountEn: string;
  locationLabelTh: string;
  locationLabelEn: string;
  categoryChips: BookingCategoryChipItem[];
  reviewsHeadingTh: string;
  reviewsHeadingEn: string;
  instagramHandle: string;
  instagramUrl: string;
}

export type ManagedGalleryCategory =
  | "property"
  | "facilities"
  | "dining"
  | "attractions"
  | "guest";

export interface ManagedGalleryPhoto {
  id: string;
  url: string;
  captionTh: string;
  captionEn: string;
  category: ManagedGalleryCategory;
}

export interface GalleryCmsConfig {
  tourVideoUrl: string;
  tourVideoPosterUrl: string;
  tourVideoTitleTh: string;
  tourVideoTitleEn: string;
  tourVideoSubtitleTh: string;
  tourVideoSubtitleEn: string;
  photos: ManagedGalleryPhoto[];
}

export interface ShortsCategoryOption {
  id: string;
  labelTh: string;
  labelEn: string;
}

export interface ManagedShortVideo extends ShortVideoItem {
  roomId?: string;
  isActive?: boolean;
}

export interface ShortsPageCmsConfig {
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  channelHandle: string;
  channelAvatarUrl: string;
  categories: ShortsCategoryOption[];
  videos: ManagedShortVideo[];
}

export interface DirectPrivilegeCardItem {
  id: string;
  badgeTh: string;
  badgeEn: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  imageUrl: string;
}

export interface DealPageCmsConfig {
  couponsTitleTh: string;
  couponsTitleEn: string;
  addonsTitleTh: string;
  addonsTitleEn: string;
  addonsSubtitleTh: string;
  addonsSubtitleEn: string;
  privilegesTitleTh: string;
  privilegesTitleEn: string;
  privilegesSubtitleTh: string;
  privilegesSubtitleEn: string;
  privileges: DirectPrivilegeCardItem[];
}

export interface ManagedGuestReview {
  id: string;
  authorNameTh: string;
  authorNameEn: string;
  authorAvatar: string;
  postedAgoTh: string;
  postedAgoEn: string;
  rating: string;
  roomId: string;
  roomCode: string;
  roomLabel: string;
  captionTh: string;
  captionEn: string;
  hashtags: string[];
  likesCount: number;
  sharesCount: number;
  socialUrl: string;
  photos: string[];
  isFeaturedOnBooking: boolean;
}

export interface GuideNearbySpot {
  id: string;
  nameTh: string;
  nameEn: string;
  distTh: string;
  distEn: string;
}

export interface GuideNearbyCategory {
  id: string;
  titleTh: string;
  titleEn: string;
  itemsTh: string[];
  itemsEn: string[];
}

export interface GuideFaqItem {
  id: string;
  qTh: string;
  qEn: string;
  aTh: string;
  aEn: string;
}

export interface GuidePageCmsConfig {
  titleTh: string;
  titleEn: string;
  googleMapsUrl: string;
  facebookPageUrl: string;
  reviewPageTitleTh: string;
  reviewPageTitleEn: string;
  reviewScorePillTh: string;
  reviewScorePillEn: string;
  nearbySpots: GuideNearbySpot[];
  nearbyCategories: GuideNearbyCategory[];
  faqs: GuideFaqItem[];
}

export interface SiteCmsContent {
  home: HomeCmsConfig;
  bookingPage: BookingPageCmsConfig;
  gallery: GalleryCmsConfig;
  shortsPage: ShortsPageCmsConfig;
  dealPage: DealPageCmsConfig;
  reviews: ManagedGuestReview[];
  guidePage: GuidePageCmsConfig;
}

const ROOM_INDEX_TO_DEFAULT_ROOM_ID = [
  "room-a1",
  "room-a2",
  "room-a3",
  "room-a4",
];

export const INITIAL_SITE_CMS_CONTENT: SiteCmsContent = {
  home: {
    heroImageUrl:
      "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838919/my-hotel/hero/obxqa4pz2mbziitzrgop.webp",
    heroLocationTh: "บ้านสะปัน จ.น่าน",
    heroLocationEn: "Ban Sapan, Nan",
    ratingBadgeTh: "4.9 ★ · บ้านพักไพรเวทกลางหุบเขาสะปัน",
    ratingBadgeEn: "4.9 ★ · Private Mountain Sanctuary in Nan",
    manifestoTitleTh: "พักจังหวะชีวิต ท่ามกลางขุนเขาและสายหมอกสะปัน",
    manifestoTitleEn: "Slow Down Above the Drifting Mist of Sapan Valley",
    manifestoDescTh:
      "วิลล่าไม้ทรง A-Frame และเคบินส่วนตัวเพียงไม่กี่หลัง ริมหุบเขาอำเภอบ่อเกลือ จังหวัดน่าน ออกแบบให้แสงเช้า ทะเลหมอก และความเงียบสงบโอบกอดทุกช่วงเวลาการพักผ่อน",
    manifestoDescEn:
      "An intimate collection of timber A-Frame villas in Bo Kluea, Nan — crafted so morning light, mountain mist, and stillness frame every moment of your stay.",
    pillars: [
      {
        id: "mist",
        iconKey: "mountain",
        titleTh: "วิวหุบเขา 360°",
        titleEn: "360° Mountain Mist",
        captionTh: "ทะเลหมอกลอยผ่านหน้าระเบียง",
        captionEn: "Morning mist right outside your deck",
      },
      {
        id: "soak",
        iconKey: "bath",
        titleTh: "อ่างน้ำอุ่นชมดาว",
        titleEn: "Private Soaking Tub",
        captionTh: "แช่น้ำอุ่นส่วนตัวหน้าวิลล่า",
        captionEn: "Outdoor warm tub at every villa",
      },
      {
        id: "coffee",
        iconKey: "coffee",
        titleTh: "กาแฟดริปเมล็ดน่าน",
        titleEn: "Nan Drip Coffee",
        captionTh: "เสิร์ฟคู่เซตอาหารเช้าถึงห้อง",
        captionEn: "Served with daily terrace breakfast",
      },
      {
        id: "sanctuary",
        iconKey: "trees",
        titleTh: "ไพรเวทท่ามกลางป่า",
        titleEn: "Secluded Sanctuary",
        captionTh: "เงียบสงบ โอบล้อมด้วยธรรมชาติ",
        captionEn: "Intimate timber villas in nature",
      },
    ],
    villasEyebrowTh: "OUR VILLAS",
    villasEyebrowEn: "OUR HOMES",
    villasTitleTh: "เอกลักษณ์บ้านพักแต่ละหลัง",
    villasTitleEn: "Signature Timber Villas",
    stories: [
      {
        id: "story-dining",
        isVisible: true,
        iconKey: "utensils",
        eyebrowTh: "TERRACE DINING & COFFEE",
        eyebrowEn: "TERRACE DINING & COFFEE",
        titleTh: "เช้าดริปกาแฟรับสายหมอก ค่ำหมูกระทะร้อนๆ บนระเบียงส่วนตัว",
        titleEn: "Morning Drip Coffee Over the Mist, Evening BBQ Under the Stars",
        descTh:
          "ทุกเช้าเสิร์ฟเซตอาหารเช้าพื้นเมืองและกาแฟคั่วสดจากน่านถึงหน้าห้องพัก ส่วนยามค่ำเพลิดเพลินกับชุดหมูกระทะท่ามกลางอากาศเย็นสบายโดยไม่ต้องออกไปไหน",
        descEn:
          "Wake up to local breakfast and freshly roasted Nan drip coffee delivered to your terrace, followed by private open-air Thai BBQ dinners in the cool mountain air.",
        imageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
        pins: [],
        ctaLabelTh: "ดูเซตอาหาร & โปรโมชั่นเสริม →",
        ctaLabelEn: "Explore Dining & Add-ons →",
        ctaTargetTab: "deal",
      },
      {
        id: "story-valley",
        isVisible: true,
        iconKey: "compass",
        eyebrowTh: "SENSE OF PLACE · BAN SAPAN",
        eyebrowEn: "SENSE OF PLACE · BAN SAPAN",
        titleTh: "หัวใจของหมู่บ้านสะปัน ห่างน้ำตกและจุดชมวิวเพียง 5 นาที",
        titleEn: "At the Heart of Ban Sapan, Minutes from Iconic Valley Trails",
        descTh:
          "เดินทางสะดวกด้วยรถยนต์ทุกประเภท โอบล้อมด้วยทุ่งนาขั้นบันได ลำน้ำว้า และวิถีชุมชนบ่อเกลือโบราณกว่า 800 ปี",
        descEn:
          "Effortlessly accessible via scenic mountain roads, surrounded by emerald rice terraces, the Wa River stream, and 800-year-old rock salt heritage.",
        imageUrl:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        pins: [
          { th: "น้ำตกสะปัน 5 นาที", en: "Sapan Waterfall · 5m" },
          { th: "หยุดเวลาคาเฟ่ 5 นาที", en: "Yood Wela Cafe · 5m" },
          { th: "บ่อเกลือโบราณ 15 นาที", en: "Ancient Salt Wells · 15m" },
        ],
        ctaLabelTh: "เปิดแผนที่ & คู่มือเที่ยวสะปัน →",
        ctaLabelEn: "View Map & Local Guide →",
        ctaTargetTab: "guide",
      },
    ],
    livingEyebrowTh: "LIVING STORIES",
    livingEyebrowEn: "LIVING STORIES",
    livingTitleTh: "บรรยากาศเคลื่อนไหวจริงจากที่พัก",
    livingTitleEn: "Real Moments in Motion",
    guestQuotes: [
      {
        id: "story-q1",
        quoteTh:
          "ตื่นเช้าเปิดม่านเจอทะเลหมอกลอยผ่านหน้าเตียง อ่างน้ำอุ่นริมระเบียงกับกาแฟดริปคือความสุขที่อยากหยุดเวลาไว้จริงๆ ค่ะ",
        quoteEn:
          "Waking up to a sea of mist drifting right past our terrace tub with freshly brewed Nan drip coffee was pure magic.",
        authorTh: "คุณกมลชนก · A-Frame Villa (A1)",
        authorEn: "Kamonchanok P. · A-Frame Villa (A1)",
        score: "10/10",
      },
      {
        id: "story-q2",
        quoteTh:
          "บ้านไม้หอมกลิ่นสน เงียบสงบเป็นส่วนตัวมาก ตอนค่ำทานหมูกระทะท่ามกลางอากาศ 18°C ดาวเต็มฟ้า ประทับใจที่สุดครับ",
        quoteEn:
          "Quiet timber sanctuary surrounded by mountains. Evening BBQ on our private deck under a starry 18°C sky was unforgettable.",
        authorTh: "คุณภาคิน · Skyline Jacuzzi (A3)",
        authorEn: "Phakin T. · Skyline Jacuzzi (A3)",
        score: "9.8/10",
      },
    ],
    inviteGuaranteeTh: "การันตีราคาดีที่สุดจากที่พักโดยตรง",
    inviteGuaranteeEn: "100% Best Rate Direct Guarantee",
    inviteTitleTh: "พร้อมออกเดินทางสู่สะปันหรือยังครับ?",
    inviteTitleEn: "Ready for Your Misty Mountain Escape?",
    invitePerks: [
      {
        id: "perk-breakfast",
        iconKey: "coffee",
        labelTh: "ฟรีอาหารเช้า & ดริปกาแฟ",
        labelEn: "Free Breakfast",
      },
      {
        id: "perk-qr",
        iconKey: "qrcode",
        labelTh: "ล็อคห้องทันใจ 15 นาทีด้วย QR",
        labelEn: "15-Min Instant QR Hold",
      },
      {
        id: "perk-live",
        iconKey: "shield",
        labelTh: "เช็กวันว่างเรียลไทม์",
        labelEn: "Live Calendar",
      },
    ],
    inviteCtaTh: "เลือกวันเข้าพัก & จองเลย",
    inviteCtaEn: "Select Dates & Book",
  },

  bookingPage: {
    heroBannerUrl:
      "https://res.cloudinary.com/ztlfsfvo/image/upload/v1794838920/my-hotel/hero/sfn2spnfudhdxyowumvi.webp",
    ratingScore: "4.9",
    reviewCountTh: "1,280+ รีวิว",
    reviewCountEn: "1,280+ reviews",
    locationLabelTh: "บ้านสะปัน บ่อเกลือ น่าน",
    locationLabelEn: "Ban Sapan, Bo Kluea, Nan",
    categoryChips: [
      {
        id: "aframe",
        labelTh: "A-Frame",
        labelEn: "A-Frame",
        codePrefix: "A",
      },
      {
        id: "panoramic",
        labelTh: "Panoramic",
        labelEn: "Panoramic",
        codePrefix: "B",
      },
    ],
    reviewsHeadingTh: "9.6 / 10 รีวิวจากผู้เข้าพักจริง",
    reviewsHeadingEn: "9.6 / 10 Verified Guest Reviews",
    instagramHandle: "@sapanunseen",
    instagramUrl:
      "https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr",
  },

  gallery: {
    tourVideoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-drone-flying-over-mountains-in-a-misty-morning-42657-large.mp4",
    tourVideoPosterUrl:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85",
    tourVideoTitleTh: "บินลัดเลาะทะเลหมอกและหุบเขาสะปัน (4K Aerial)",
    tourVideoTitleEn: "Sapan Valley Morning Sea of Mist Drone Tour",
    tourVideoSubtitleTh: "มุมมองภาพรวมรีสอร์ตและขุนเขาดงพญา",
    tourVideoSubtitleEn: "Bird's eye view over resort grounds",
    photos: [
      {
        id: "prop-0",
        url: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=2000&q=85",
        captionTh: "บ้านไม้ทรง A-Frame ท่ามกลางป่าสนและขุนเขาสะปัน",
        captionEn: "Iconic A-Frame timber lodges in pine forest of Sapan",
        category: "property",
      },
      {
        id: "prop-1",
        url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ทัศนียภาพสายหมอกและยอดเขาหุบเขาสะปันยามเช้า",
        captionEn: "Morning sea of mist over Sapan mountain valley",
        category: "property",
      },
      {
        id: "prop-2",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ลำธารธรรมชาติและทางเดินสายหมอกในหมู่บ้านสะปัน",
        captionEn: "Natural stream and misty walkway in Ban Sapan",
        category: "property",
      },
      {
        id: "prop-3",
        url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85",
        captionTh: "แสงสีทองยามเย็นและระเบียงชมวิวพาโนรามา",
        captionEn: "Golden hour sunset terrace view",
        category: "property",
      },
      {
        id: "facility-0",
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
        captionTh: "อ่างแช่น้ำกลางแจ้ง (Outdoor Soaking Tub) ชมวิวทะเลหมอก",
        captionEn: "Outdoor soaking tub overlooking mountain ridge",
        category: "facilities",
      },
      {
        id: "facility-1",
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85",
        captionTh: "มุมพักผ่อนและสปาส่วนตัวท่ามกลางธรรมชาติ",
        captionEn: "Private pavilion amidst lush greenery",
        category: "facilities",
      },
      {
        id: "facility-2",
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ห้องน้ำและสิ่งอำนวยความสะดวกระดับพรีเมียม",
        captionEn: "Luxury bathroom amenities & fittings",
        category: "facilities",
      },
      {
        id: "dining-0",
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ชุดหมูกระทะร้อนๆ รับลมหนาวเสิร์ฟถึงระเบียงห้องพัก",
        captionEn: "Private terrace Thai BBQ (Moo Krata) dinner set",
        category: "dining",
      },
      {
        id: "dining-1",
        url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ชุดดริปกาแฟสดเมล็ดกาแฟน่าน พร้อมกาน้ำร้อนไฟฟ้า",
        captionEn: "Nan single-origin pour-over drip coffee set",
        category: "dining",
      },
      {
        id: "attr-0",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "น้ำตกสะปันและสะพานโบราณใจกลางหมู่บ้าน (เดินเพียง 8 นาที)",
        captionEn: "Sapan Waterfall & ancient village bridge (8-min walk)",
        category: "attractions",
      },
      {
        id: "guest-0",
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
        captionTh:
          "ภาพจากผู้เข้าพัก: แช่น้ำอุ่นยามเช้าหมอกลงหนามาก ประทับใจสุดๆ",
        captionEn: "Guest Photo: Morning outdoor soak in dense sea of mist",
        category: "guest",
      },
    ],
  },

  shortsPage: {
    titleTh: "สำรวจวิดีโอสั้นรีสอร์ท",
    titleEn: "Explore Resort Shorts",
    subtitleTh: "บรรยากาศจริงจากสะปันอันซีน",
    subtitleEn: "Real moments at Sapan Unseen",
    channelHandle: "sapanunseen",
    channelAvatarUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=160&q=80",
    categories: SHORTS_CATEGORIES.map((item) => ({
      id: item.id,
      labelTh: item.labelTh,
      labelEn: item.labelEn,
    })),
    videos: RESORT_SHORTS.map((video) => ({
      ...video,
      roomId:
        ROOM_INDEX_TO_DEFAULT_ROOM_ID[video.roomIndex] || "room-a1",
      isActive: true,
    })),
  },

  dealPage: {
    couponsTitleTh: "คูปองส่วนลดจองตรง",
    couponsTitleEn: "Direct Booking Coupons",
    addonsTitleTh: "โปรโมชั่นหมูกระทะริมระเบียง & สปาส่วนตัว",
    addonsTitleEn: "Terrace Dining & In-Villa Spa Deals",
    addonsSubtitleTh: "ราคาพิเศษสำหรับลูกค้าจองตรง เสิร์ฟถึงระเบียงวิลล่า",
    addonsSubtitleEn:
      "Special direct-booking packages served to your private deck",
    privilegesTitleTh: "สิทธิพิเศษเมื่อจองตรงผ่านเว็บที่พัก",
    privilegesTitleEn: "Direct Booking Privileges",
    privilegesSubtitleTh: "การันตีราคาดีที่สุด พร้อมบริการดูแลตลอดการเข้าพัก",
    privilegesSubtitleEn:
      "Best rate guarantee with personalized concierge care",
    privileges: [
      {
        id: "priv-breakfast",
        badgeTh: "ฟรีทุกห้อง",
        badgeEn: "COMPLIMENTARY",
        titleTh: "ฟรี อาหารเช้า & ดริปกาแฟ",
        titleEn: "Complimentary Breakfast & Drip Coffee",
        descTh: "เสิร์ฟถึงระเบียงวิลล่าส่วนตัวทุกเช้า พร้อมชมทะเลหมอก",
        descEn:
          "Served daily to your private villa terrace overlooking the mist",
        imageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "priv-qr-hold",
        badgeTh: "ล็อคห้องทันที",
        badgeEn: "INSTANT HOLD",
        titleTh: "ล็อคห้องพัก 15 นาทีด้วย QR",
        titleEn: "Instant 15-Minute Room Hold via QR",
        descTh: "ระบบสแกนตรวจสอบสลิปอัตโนมัติ ป้องกันการจองซ้อน 100%",
        descEn:
          "Automated slip QR verification prevents double bookings 100%",
        imageUrl:
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "priv-date-change",
        badgeTh: "ยืดหยุ่นวันพัก",
        badgeEn: "FLEXIBLE STAY",
        titleTh: "เลื่อนวันเข้าพักฟรี 1 ครั้ง",
        titleEn: "1 Free Date Change",
        descTh: "แจ้งล่วงหน้าอย่างน้อย 7 วันก่อนเช็คอิน ไม่มีค่าธรรมเนียม",
        descEn:
          "Modify stay dates once free of charge up to 7 days before arrival",
        imageUrl:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },

  reviews: [
    {
      id: "fb-post-1",
      authorNameTh: "คุณกมลชนก",
      authorNameEn: "KamonchanokPloy",
      authorAvatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
      postedAgoTh: "2 วันที่แล้ว",
      postedAgoEn: "2 days ago",
      rating: "10/10",
      roomId: "room-a1",
      roomCode: "A1",
      roomLabel: "A-Frame Panorama Villa (A1)",
      captionTh:
        "ทริปสะปันรอบนี้ประทับใจบ้าน A1 ทรง A-Frame มากก ตื่นเช้ามาเปิดม่านจากเตียงชั้นล่างเห็นทะเลหมอกลอยผ่านหน้าห้องเลย อ่างแช่น้ำอุ่นหน้าระเบียงคือที่สุด แนะนำสั่งชุดหมูกระทะมาทานตอนเย็นอากาศ 18 องศาฟินมากค่ะ",
      captionEn:
        "So impressed with our A-Frame Panorama Villa (A1) in Ban Sapan! Waking up and opening the curtains to a sea of mist right outside our terrace was magical.",
      hashtags: ["#สะปันอันซีน", "#ที่พักสะปัน", "#บ่อเกลือน่าน", "#AFrameVilla"],
      likesCount: 1420,
      sharesCount: 86,
      socialUrl: "https://www.facebook.com",
      photos: [
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=85",
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
      ],
      isFeaturedOnBooking: true,
    },
    {
      id: "fb-post-2",
      authorNameTh: "คุณภาคิน",
      authorNameEn: "Phakin Wanderlust",
      authorAvatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
      postedAgoTh: "4 วันที่แล้ว",
      postedAgoEn: "4 days ago",
      rating: "9.8/10",
      roomId: "room-a3",
      roomCode: "A3",
      roomLabel: "Skyline Jacuzzi Villa (A3)",
      captionTh:
        "พาแฟนมาพักผ่อนที่ สะปัน อันซีน น่าน จองตรงผ่านหน้าเว็บได้ส่วนลดเพิ่มแถมล็อคห้องด้วย QR 15 นาทีสะดวกมากครับ ห้องพักสะอาด กลิ่นหอมไม้สน อาหารเช้าเสิร์ฟถึงระเบียงพร้อมชุดดริปกาแฟน่านคั่วสด",
      captionEn:
        "Brought my partner to Sapan Unseen Resort. Booking direct gave us an extra discount and instant 15-minute QR hold. Freshly roasted Nan drip coffee on our private balcony was unforgettable.",
      hashtags: ["#SapanUnseen", "#รีวิวที่พักน่าน", "#สะปัน"],
      likesCount: 985,
      sharesCount: 54,
      socialUrl: "https://www.facebook.com",
      photos: [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85",
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
      ],
      isFeaturedOnBooking: true,
    },
    {
      id: "fb-post-3",
      authorNameTh: "คุณณัฐริกา",
      authorNameEn: "Nattarika S.",
      authorAvatar:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
      postedAgoTh: "1 สัปดาห์ที่แล้ว",
      postedAgoEn: "1 week ago",
      rating: "9.6/10",
      roomId: "room-a2",
      roomCode: "A2",
      roomLabel: "A-Frame Panorama Villa (A2)",
      captionTh:
        "ยกแก๊งเพื่อนมาพักบ้าน A2 นอนได้ 4 คนสบายๆ ชั้นลอยใต้หลังคาอบอุ่นเหมือนบ้านพักตากอากาศเมืองนอกเลยค่ะ ใกล้จุดเช็คอินสะพานแขวนสะปันและคาเฟ่หยุดเวลาแค่ 5 นาที ตอนกลางคืนดาวเต็มฟ้า",
      captionEn:
        "Stayed at Villa A2 with friends—sleeps 4 comfortably with a cozy attic loft that feels like an alpine chalet! Just 5 minutes from Sapan Suspension Bridge.",
      hashtags: ["#สะปันอันซีนน่าน", "#หมู่บ้านสะปัน", "#น่านเนิบเนิบ"],
      likesCount: 760,
      sharesCount: 39,
      socialUrl: "https://www.facebook.com",
      photos: [
        "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
      ],
      isFeaturedOnBooking: true,
    },
  ],

  guidePage: {
    titleTh: "แผนที่การเดินทาง & รอบที่พัก",
    titleEn: "Location Map & Nearby Sights",
    googleMapsUrl: "https://maps.app.goo.gl/oGkpxrTD2C2pmeWf6?g_st=ic",
    facebookPageUrl: "https://www.facebook.com",
    reviewPageTitleTh: "โพสต์รีวิวจากลูกค้าบน Facebook",
    reviewPageTitleEn: "Verified Facebook Guest Reviews",
    reviewScorePillTh: "9.6 / 10 ยอดเยี่ยมมาก",
    reviewScorePillEn: "9.6 / 10 Exceptional",
    nearbySpots: [
      {
        id: "spot-1",
        nameTh: "หยุดเวลา คาเฟ่",
        nameEn: "Yood Wela Cafe",
        distTh: "5 นาที",
        distEn: "5 mins",
      },
      {
        id: "spot-2",
        nameTh: "น้ำตกสะปัน & สะพานแขวน",
        nameEn: "Sapan Waterfall & Bridge",
        distTh: "5 นาที",
        distEn: "5 mins",
      },
      {
        id: "spot-3",
        nameTh: "บ่อเกลือสินเธาว์โบราณ",
        nameEn: "Ancient Rock Salt Wells",
        distTh: "15 นาที",
        distEn: "15 mins",
      },
    ],
    nearbyCategories: [
      {
        id: "shopping",
        titleTh: "คาเฟ่และร้านอาหารแนะนำ",
        titleEn: "Recommended Cafes & Local Dining",
        itemsTh: [
          "หยุดเวลา คาเฟ่ (Yood Wela Cafe) — จุดชมวิวหมู่บ้านสะปันมุมสูง (5 นาที)",
          "หลงเขา คาเฟ่ (Lhong Khao Cafe) — คาเฟ่ริมลำธารท่ามกลางขุนเขา (7 นาที)",
          "ถนนคนเดินสะปัน & ตลาดเช้าชุมชน — อาหารพื้นเมืองและของฝาก (5 นาที)",
        ],
        itemsEn: [
          "Yood Wela Cafe — Iconic hilltop viewpoint overlooking Sapan village (5 mins)",
          "Lhong Khao Cafe — Streamside specialty coffee surrounded by mountains (7 mins)",
          "Sapan Walking Street & Morning Market — Local food and handicrafts (5 mins)",
        ],
      },
      {
        id: "attractions",
        titleTh: "สถานที่ท่องเที่ยวยอดฮิต",
        titleEn: "Popular Tourist Attractions",
        itemsTh: [
          "น้ำตกสะปัน & สะพานแขวน — เส้นทางเดินศึกษาธรรมชาติสุดร่มรื่น (5 นาที)",
          "วัดสะปัน — จุดชมทะเลหมอกยามเช้าเหนือหุบเขาและลำน้ำว้า (6 นาที)",
          "บ่อเกลือสินเธาว์ภูเขาโบราณ อ.บ่อเกลือ — มรดกทางวัฒนธรรมกว่า 800 ปี (15 นาที)",
        ],
        itemsEn: [
          "Sapan Waterfall & Suspension Bridge — Lush nature trail (5 mins)",
          "Wat Sapan Viewpoint — Panoramic morning sea of mist over Wa River valley (6 mins)",
          "800-Year-Old Ancient Rock Salt Wells in Bo Kluea — Cultural heritage site (15 mins)",
        ],
      },
      {
        id: "transportation",
        titleTh: "การเดินทางมายังที่พัก",
        titleEn: "Getting Here & Parking",
        itemsTh: [
          "เดินทางด้วยรถยนต์ส่วนตัวผ่านถนนลอยฟ้า 1081 / 1256 (รถเก๋งเล็กสามารถขึ้นได้สะดวก)",
          "ท่าอากาศยานน่านนคร (NNN) — ใช้เวลาเดินทางประมาณ 1 ชม. 45 นาที",
          "มีลานจอดรถส่วนตัวภายในบริเวณที่พัก พร้อมเจ้าหน้าที่ดูแลสัมภาระ",
        ],
        itemsEn: [
          "Accessible by private car via scenic Highway 1081 / 1256 (suitable for all passenger cars)",
          "Nan Nakhon Airport (NNN) — Approximately 1 hr 45 mins drive",
          "Complimentary private on-site parking with luggage assistance",
        ],
      },
    ],
    faqs: [
      {
        id: "faq-1",
        qTh: "ช่วงเดือนไหนเหมาะแก่การมาพักผ่อนและชมทะเลหมอกที่สุด?",
        qEn: "Which months are best for visiting Ban Sapan and seeing the sea of mist?",
        aTh: "สามารถมาพักผ่อนได้ตลอดทั้งปี: (1) พ.ย.–ก.พ. ช่วงฤดูหนาว อากาศเย็น 12°C–24°C และมีทะเลหมอกหนาแน่นทุกเช้า (2) ก.ค.–ต.ค. ช่วง Green Season ทุ่งนาและขุนเขาเขียวขจีพร้อมสายหมอกหลังฝนตก และ (3) มี.ค.–มิ.ย. บรรยากาศเงียบสงบเป็นส่วนตัวพร้อมราคาพิเศษ",
        aEn: "Sapan is beautiful year-round: (1) Nov–Feb Winter Season offers crisp 12°C–24°C mornings with dense sea of mist, (2) Jul–Oct Green Season features emerald rice terraces and misty mountain ridges after rain, and (3) Mar–Jun Summer Retreat offers tranquil privacy and special rates.",
      },
      {
        id: "faq-2",
        qTh: "ห้องพักมีรูปแบบไหนบ้าง มาเป็นคู่รักหรือครอบครัวควรเลือกห้องไหน?",
        qEn: "What villa types are available for couples or families?",
        aTh: "รองรับทั้งบ้านพักพูลวิลล่าส่วนตัวเป็นหลัง (A-Frame Private Villa เช่น A1, A2, A4) และวิลล่าพาโนรามาพร้อมอ่างจากุซซี่ (A3) สำหรับคู่รักหรือกลุ่มเพื่อน 2–4 ท่าน โดยทุกยูนิตสามารถเช็ควันว่างแบบเรียลไทม์ได้ทันที",
        aEn: "We offer private A-Frame timber villas (A1, A2, A4) and our Skyline Jacuzzi Villa (A3), ideal for couples or groups of 2–4 guests. Real-time availability is displayed on every room card.",
      },
      {
        id: "faq-3",
        qTh: "ราคาห้องพักรวมอาหารเช้าแล้วหรือไม่ และมีชุดหมูกระทะเสิร์ฟถึงห้องไหม?",
        qEn: "Is breakfast included, and can we order Thai BBQ (Moo Krata) to our villa?",
        aTh: "ราคาห้องพักทุกเรทรวมอาหารเช้าและชุดดริปกาแฟสดเรียบร้อยแล้ว และสามารถสั่งจองชุดหมูกระทะริมระเบียงหรือบริการเสริมเพิ่มเติมได้ในขั้นตอนการจองหรือหน้าโปรโมชั่น",
        aEn: "Yes, daily local breakfast and a Nan drip coffee set are included with every villa. You can also pre-order private terrace Thai BBQ sets and add-on packages during booking or on the Deals page.",
      },
      {
        id: "faq-4",
        qTh: "ขั้นตอนการจองตรงและการล็อคห้องพัก 15 นาทีทำงานอย่างไร?",
        qEn: "How does the 15-minute instant room hold and QR verification work?",
        aTh: "เมื่อเลือกวันเข้าพักและกดจอง ระบบจะล็อคห้องพักให้ 15 นาทีพร้อมสร้าง QR PromptPay เมื่อแนบรูปสลิป ระบบจะสแกนตรวจสอบ QR บนสลิปอัตโนมัติเพื่อยืนยันการจองทันที",
        aEn: "Once you select your dates and submit your booking details, the system holds your villa for 15 minutes and generates a PromptPay QR code. Upload your transfer slip and our system automatically verifies the slip QR code.",
      },
    ],
  },
};

/**
 * Thai-first text resolver: when English is active, returns English if non-empty,
 * otherwise cleanly falls back to Thai so admins only HAVE to type Thai.
 */
export function pickLocalizedText(
  lang: "th" | "en",
  thText: string | undefined | null,
  enText?: string | undefined | null
): string {
  const safeTh = thText ?? "";
  if (lang === "en") {
    const trimmedEn = enText?.trim();
    return trimmedEn ? trimmedEn : safeTh;
  }
  return safeTh;
}

