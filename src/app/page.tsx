"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PinCommentItem, pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import {
  PureMediaSlide,
  PureMediaViewer,
} from "@/components/cms/PureMediaViewer";
import {
  PinCategoryId,
  PinterestPinCard,
  PinterestPinDetail,
  PinterestPinItem,
} from "@/components/home/PinterestPinDetail";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";

const STAGGERED_PIN_ASPECTS = [
  "aspect-[2/3]",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-[1/1]",
  "aspect-[5/6]",
  "aspect-[3/5]",
];

const VIDEO_DURATIONS = ["0:18", "0:24", "0:32", "0:15", "0:28", "0:41"];

const SAVED_PINS_STORAGE_KEY = "cangaroom-saved-pins";
const LIKED_PINS_STORAGE_KEY = "cangaroom-liked-pins";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    addons,
    coupons,
    lang: language,
    navigateToTab,
    claimAndApplyCoupon,
    cms,
    saveStore,
    canShowEditControls,
    openCmsEditor,
    globalSearchQuery,
  } = useHotelApp();

  const { user: currentUser } = useAuthenticatedProfile();

  const [activeCategory, setActiveCategory] = useState<PinCategoryId>("all");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [savedPinsMap, setSavedPinsMap] = useState<Record<string, boolean>>({});
  const [likedPinsMap, setLikedPinsMap] = useState<Record<string, boolean>>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // Hydrate saved & liked pins + deep-linked ?pin=...
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedRaw = localStorage.getItem(SAVED_PINS_STORAGE_KEY);
      if (savedRaw) setSavedPinsMap(JSON.parse(savedRaw));
      const likedRaw = localStorage.getItem(LIKED_PINS_STORAGE_KEY);
      if (likedRaw) setLikedPinsMap(JSON.parse(likedRaw));

      const params = new URLSearchParams(window.location.search);
      const pinParam = params.get("pin");
      if (pinParam) setSelectedPinId(pinParam);
    } catch {
      // ignore storage errors
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedPinId(params.get("pin"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
  const resortAvatar =
    cms.home.heroImageUrl ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url;

  // Assemble rich variable-height Pinterest Masonry Pins from all resort media
  const allPins = useMemo<PinterestPinItem[]>(() => {
    const built: PinterestPinItem[] = [];
    let aspectCursor = 0;
    const nextAspect = () => {
      const picked =
        STAGGERED_PIN_ASPECTS[aspectCursor % STAGGERED_PIN_ASPECTS.length];
      aspectCursor += 1;
      return picked;
    };

    // 1. Room Primary & Secondary Pins
    const primaryRoomPins: PinterestPinItem[] = [];
    const extraRoomPhotoPins: PinterestPinItem[] = [];

    rooms.forEach((room, rIdx) => {
      const allRoomUrls = room.images.map((im) => im.url).filter(Boolean);
      if (allRoomUrls[0]) {
        primaryRoomPins.push({
          id: `room-${room.id}`,
          category: "rooms",
          aspectClass: rIdx % 2 === 0 ? "aspect-[2/3]" : "aspect-[3/4]",
          imageUrl: allRoomUrls[0],
          galleryUrls: allRoomUrls,
          title: pickLocalizedText(language, room.nameTh, room.nameEn),
          description: pickLocalizedText(
            language,
            `${room.shortDescTh} · พื้นที่ใช้สอย ${room.sizeSqm} ตร.ม. รองรับ ${room.baseGuests}–${room.maxGuests} ท่าน ราคาเริ่มต้น ฿${room.basePriceThb.toLocaleString()}/คืน พร้อมอาหารเช้าเสิร์ฟถึงระเบียงห้องพัก`,
            `${room.shortDescEn} · ${room.sizeSqm} m² for ${room.baseGuests}–${room.maxGuests} guests from ฿${room.basePriceThb.toLocaleString()}/night including terrace breakfast.`
          ),
          boardLabel: `${room.code} · Villa`,
          authorName: resortName,
          authorSubtitle: resortSubtitle,
          authorAvatar: resortAvatar,
          footerCaption: pickLocalizedText(language, room.nameTh, room.nameEn),
          footerSubcaption: `฿${room.basePriceThb.toLocaleString()} / ${
            language === "th" ? "คืน" : "night"
          }`,
          ctaLabel:
            language === "th"
              ? `เช็กวันว่าง & จองบ้านพัก ${room.code}`
              : `Check Dates & Rates (${room.code})`,
          onCtaClick: () => {
            if (typeof window !== "undefined") {
              window.history.pushState(null, "", `/booking?room=${room.id}`);
            }
            navigateToTab("book");
          },
          baseLikes: 38 + rIdx * 14,
          onEdit: () => openCmsEditor({ type: "room", roomId: room.id }),
        });
      }

      // Additional interior/terrace angles as standalone discovery pins
      room.images.slice(1).forEach((img, imgIdx) => {
        if (!img.url) return;
        extraRoomPhotoPins.push({
          id: `room-angle-${room.id}-${imgIdx}`,
          category: "rooms",
          aspectClass: nextAspect(),
          imageUrl: img.url,
          galleryUrls: [
            img.url,
            ...allRoomUrls.filter((u) => u !== img.url),
          ],
          title: pickLocalizedText(
            language,
            img.captionTh || `มุมพักผ่อนภายใน ${room.nameTh}`,
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
          ctaLabel:
            language === "th"
              ? `ดูตารางห้องว่าง ${room.code}`
              : `View ${room.code} Availability`,
          onCtaClick: () => navigateToTab("book"),
          baseLikes: 21 + imgIdx * 9,
          onEdit: () => openCmsEditor({ type: "room", roomId: room.id }),
        });
      });
    });

    // 2. Short Video Pins (9:16 Vertical with Duration Pill)
    const videoPins: PinterestPinItem[] = cms.shortsPage.videos
      .filter((v) => v.isActive !== false)
      .map((vid, vIdx) => ({
        id: `vid-${vid.id}`,
        category: "videos",
        aspectClass: "aspect-[9/16]",
        imageUrl: vid.posterUrl,
        galleryUrls: [vid.posterUrl],
        videoUrl: vid.videoUrl,
        videoDuration: VIDEO_DURATIONS[vIdx % VIDEO_DURATIONS.length],
        title: pickLocalizedText(language, vid.titleTh, vid.titleEn),
        description: pickLocalizedText(language, vid.captionTh, vid.captionEn),
        boardLabel: language === "th" ? "คลิปบรรยากาศ" : "Video Tour",
        authorName: resortName,
        authorSubtitle: `@${cms.shortsPage.channelHandle}`,
        authorAvatar: cms.shortsPage.channelAvatarUrl || resortAvatar,
        footerCaption: pickLocalizedText(language, vid.titleTh, vid.titleEn),
        ctaLabel:
          language === "th" ? "เช็กห้องว่างของคลิปนี้" : "Check Room Availability",
        onCtaClick: () => navigateToTab("book"),
        baseLikes: vid.likes || 64,
        onEdit: () => openCmsEditor({ type: "short-video", videoId: vid.id }),
      }));

    // 3. Guest Review Pins
    const reviewPins: PinterestPinItem[] = cms.reviews
      .filter((r) => Boolean(r.photos[0]))
      .map((rev, revIdx) => ({
        id: `rev-${rev.id}`,
        category: "reviews",
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
        authorSubtitle: rev.roomLabel,
        authorAvatar: rev.authorAvatar,
        footerCaption: pickLocalizedText(
          language,
          rev.authorNameTh,
          rev.authorNameEn
        ),
        footerSubcaption: `รีวิวผู้เข้าพักจริง · ★ ${rev.rating}`,
        ctaLabel: language === "th" ? "อ่านรีวิวทั้งหมด" : "Read All Reviews",
        onCtaClick: () => navigateToTab("review"),
        baseLikes: rev.likesCount || 42,
        onEdit: () => openCmsEditor({ type: "review", reviewId: rev.id }),
      }));

    // 4. Managed Gallery & Editorial Atmosphere Pins
    const viewAndDiningPins: PinterestPinItem[] = cms.gallery.photos.map(
      (gPhoto, gIdx) => {
        const isDining = gPhoto.category === "dining";
        return {
          id: `gal-${gPhoto.id}`,
          category: isDining ? "dining" : "views",
          aspectClass: nextAspect(),
          imageUrl: gPhoto.url,
          galleryUrls: [gPhoto.url],
          title: pickLocalizedText(
            language,
            gPhoto.captionTh || resortName,
            gPhoto.captionEn || resortName
          ),
          description: pickLocalizedText(
            language,
            `${gPhoto.captionTh} — บรรยากาศจริงจาก ${propertyConfig.nameTh} อำเภอบ่อเกลือ จังหวัดน่าน`,
            `${gPhoto.captionEn} — Captured at ${propertyConfig.nameEn}, Bo Kluea, Nan.`
          ),
          boardLabel: isDining
            ? language === "th"
              ? "อาหาร & คาเฟ่"
              : "Dining"
            : language === "th"
            ? "มุมถ่ายรูปสะปัน"
            : "Sapan Views",
          authorName: resortName,
          authorSubtitle: resortSubtitle,
          authorAvatar: resortAvatar,
          baseLikes: 19 + gIdx * 7,
          onEdit: () => openCmsEditor({ type: "gallery-photos" }),
        };
      }
    );

    // 5. Dining Add-ons & Special Promo Coupon Pins
    const dealAndAddonPins: PinterestPinItem[] = [
      ...coupons
        .filter((c) => c.isActive && c.imageUrl)
        .map((cp, cIdx) => ({
          id: `cp-${cp.id}`,
          category: "deals" as const,
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
          authorSubtitle: language === "th" ? "สิทธิพิเศษจองตรง" : "Direct Offer",
          authorAvatar: resortAvatar,
          footerCaption: pickLocalizedText(language, cp.titleTh, cp.titleEn),
          footerSubcaption: `โค้ดส่วนลด ${cp.code}`,
          ctaLabel:
            language === "th"
              ? `เก็บคูปอง ${cp.code} & ใช้จองห้องพัก`
              : `Claim ${cp.code} & Book`,
          onCtaClick: () => {
            claimAndApplyCoupon(cp.code);
            navigateToTab("book");
          },
          baseLikes: 53 + cIdx * 11,
          onEdit: () => openCmsEditor({ type: "coupon", couponId: cp.id }),
        })),
      ...addons
        .filter((ad) => ad.isActive && ad.imageUrl)
        .map((ad, aIdx) => ({
          id: `addon-${ad.id}`,
          category: "dining" as const,
          aspectClass: aIdx % 2 === 0 ? "aspect-[4/5]" : "aspect-[1/1]",
          imageUrl: ad.imageUrl!,
          galleryUrls: [ad.imageUrl!],
          title: pickLocalizedText(language, ad.nameTh, ad.nameEn),
          description: pickLocalizedText(
            language,
            `${ad.descTh} · ฿${ad.priceThb.toLocaleString()} / ${ad.unitTh}`,
            `${ad.descEn || ad.descTh} · ฿${ad.priceThb.toLocaleString()}`
          ),
          boardLabel: language === "th" ? "เซ็ตอาหาร & บริการเสริม" : "Add-on",
          authorName: resortName,
          authorSubtitle: resortSubtitle,
          authorAvatar: resortAvatar,
          baseLikes: 31 + aIdx * 8,
          onEdit: () => openCmsEditor({ type: "addon", addonId: ad.id }),
        })),
    ];

    // Interleave all groups so the Masonry grid has rich variety in both topic & height
    const buckets = [
      primaryRoomPins,
      videoPins,
      viewAndDiningPins,
      reviewPins,
      extraRoomPhotoPins,
      dealAndAddonPins,
    ];
    const maxBucketLen = Math.max(...buckets.map((b) => b.length), 0);
    const usedUrls = new Set<string>();

    for (let i = 0; i < maxBucketLen; i++) {
      for (const bucket of buckets) {
        const candidate = bucket[i];
        if (!candidate || !candidate.imageUrl) continue;
        // Deduplicate identical URLs unless it's a video pin
        if (!candidate.videoUrl && usedUrls.has(candidate.imageUrl)) continue;
        usedUrls.add(candidate.imageUrl);
        built.push(candidate);
      }
    }

    return built;
  }, [
    addons,
    claimAndApplyCoupon,
    cms.gallery.photos,
    cms.reviews,
    cms.shortsPage.channelAvatarUrl,
    cms.shortsPage.channelHandle,
    cms.shortsPage.videos,
    coupons,
    language,
    navigateToTab,
    openCmsEditor,
    propertyConfig.nameEn,
    propertyConfig.nameTh,
    resortAvatar,
    resortName,
    resortSubtitle,
    rooms,
  ]);

  // Filter by Category Tab + Top Pinterest Search Query
  const filteredPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    return allPins.filter((pin) => {
      if (activeCategory !== "all" && pin.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        pin.title.toLowerCase().includes(q) ||
        pin.description.toLowerCase().includes(q) ||
        pin.boardLabel.toLowerCase().includes(q) ||
        pin.authorName.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, allPins, globalSearchQuery]);

  const selectedPin = useMemo(
    () =>
      selectedPinId
        ? allPins.find((p) => p.id === selectedPinId) ?? null
        : null,
    [allPins, selectedPinId]
  );

  const relatedPins = useMemo(() => {
    if (!selectedPin) return [];
    const sameCategory = allPins.filter(
      (p) => p.id !== selectedPin.id && p.category === selectedPin.category
    );
    const others = allPins.filter(
      (p) => p.id !== selectedPin.id && p.category !== selectedPin.category
    );
    return [...sameCategory, ...others];
  }, [allPins, selectedPin]);

  const handleSelectPin = (pin: PinterestPinItem) => {
    setSelectedPinId(pin.id);
    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("pin", pin.id);
      window.history.pushState(null, "", nextUrl.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClosePinDetail = () => {
    setSelectedPinId(null);
    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("pin");
      window.history.pushState(null, "", nextUrl.toString());
    }
  };

  const handleToggleSavePin = (pinId: string) => {
    setSavedPinsMap((prev) => {
      const next = { ...prev, [pinId]: !prev[pinId] };
      try {
        localStorage.setItem(SAVED_PINS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleLikePin = (pin: PinterestPinItem) => {
    const currentlyLiked = Boolean(likedPinsMap[pin.id]);
    const nextLiked = !currentlyLiked;

    setLikedPinsMap((prev) => {
      const next = { ...prev, [pin.id]: nextLiked };
      try {
        localStorage.setItem(LIKED_PINS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    const currentCount = cms.pinLikes?.[pin.id] ?? pin.baseLikes;
    const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

    saveStore((prevStore) => ({
      ...prevStore,
      cms: {
        ...prevStore.cms,
        pinLikes: {
          ...(prevStore.cms.pinLikes || {}),
          [pin.id]: nextCount,
        },
      },
    }));
  };

  const handleSharePin = async (pin: PinterestPinItem) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?pin=${encodeURIComponent(pin.id)}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: pin.title,
          text: pin.description,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleAddPinComment = (pinId: string, text: string) => {
    const newComment: PinCommentItem = {
      id: `pcm-${Date.now()}`,
      authorName:
        currentUser?.name ||
        (language === "th" ? "ผู้เยี่ยมชม" : "Guest Visitor"),
      authorEmail: currentUser?.email,
      authorAvatar: currentUser?.image || null,
      text,
      createdAtIso: new Date().toISOString(),
      likes: 0,
    };

    saveStore((prevStore) => {
      const existing = prevStore.cms.pinComments?.[pinId] || [];
      return {
        ...prevStore,
        cms: {
          ...prevStore.cms,
          pinComments: {
            ...(prevStore.cms.pinComments || {}),
            [pinId]: [...existing, newComment],
          },
        },
      };
    });
  };

  const handleDeletePinComment = (pinId: string, commentId: string) => {
    saveStore((prevStore) => {
      const existing = prevStore.cms.pinComments?.[pinId] || [];
      return {
        ...prevStore,
        cms: {
          ...prevStore.cms,
          pinComments: {
            ...(prevStore.cms.pinComments || {}),
            [pinId]: existing.filter((c) => c.id !== commentId),
          },
        },
      };
    });
  };

  const categoryTabs: Array<{
    id: PinCategoryId;
    labelTh: string;
    labelEn: string;
  }> = [
    { id: "all", labelTh: "ทั้งหมด", labelEn: "All" },
    { id: "rooms", labelTh: "บ้านพักวิลล่า", labelEn: "Villas & Suites" },
    { id: "videos", labelTh: "คลิปบรรยากาศ", labelEn: "Videos" },
    { id: "views", labelTh: "วิวหมอก & มุมถ่ายรูป", labelEn: "Mist & Views" },
    { id: "dining", labelTh: "อาหารเช้า & หมูกระทะ", labelEn: "Dining" },
    { id: "reviews", labelTh: "รีวิวผู้เข้าพัก", labelEn: "Guest Stories" },
    { id: "deals", labelTh: "คูปองส่วนลด", labelEn: "Offers" },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* =====================================================================
          MODE A: IN-PAGE PINTEREST PIN DETAIL CLOSE-UP + RELATED MASONRY
      ====================================================================== */}
      {selectedPin ? (
        <PinterestPinDetail
          key={selectedPin.id}
          pin={selectedPin}
          relatedPins={relatedPins}
          language={language}
          currentUser={currentUser}
          canEdit={canShowEditControls}
          isLiked={Boolean(likedPinsMap[selectedPin.id])}
          likeCount={
            cms.pinLikes?.[selectedPin.id] ?? selectedPin.baseLikes
          }
          isSaved={Boolean(savedPinsMap[selectedPin.id])}
          savedPinsMap={savedPinsMap}
          comments={cms.pinComments?.[selectedPin.id] || []}
          onClose={handleClosePinDetail}
          onSelectPin={handleSelectPin}
          onToggleLike={() => handleToggleLikePin(selectedPin)}
          onToggleSave={handleToggleSavePin}
          onSharePin={handleSharePin}
          onExpandMedia={(urls, idx) =>
            setFullscreenMedia({
              slides: urls.map((u) => ({
                type: "image",
                url: u,
                caption: selectedPin.title,
              })),
              index: idx,
            })
          }
          onAddComment={(txt) => handleAddPinComment(selectedPin.id, txt)}
          onDeleteComment={(commentId) =>
            handleDeletePinComment(selectedPin.id, commentId)
          }
        />
      ) : (
        /* =====================================================================
           MODE B: PINTEREST HOME CATEGORY BAR + STAGGERED MASONRY PIN GRID
        ====================================================================== */
        <>
          {/* Exact Pinterest Horizontal Underline Category Strip */}
          <div className="flex items-center justify-between gap-3 pt-0.5 pb-1">
            <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar">
              {categoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`relative pb-2 ty-body font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>
                      {language === "th" ? tab.labelTh : tab.labelEn}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[var(--color-text-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {canShowEditControls && (
              <div className="flex items-center gap-1.5 shrink-0">
                <EditSpotButton
                  icon="add"
                  label="เพิ่มรูป"
                  onClick={() => openCmsEditor({ type: "gallery-photos" })}
                />
                <EditSpotButton
                  icon="add"
                  label="เพิ่มคลิป"
                  onClick={() => openCmsEditor({ type: "short-video" })}
                />
                <EditSpotButton
                  icon="add"
                  label="เพิ่มห้อง"
                  onClick={() => openCmsEditor({ type: "room" })}
                />
              </div>
            )}
          </div>

          {/* Variable-Height Staggered Multi-Column Pinterest Masonry Grid */}
          {filteredPins.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="ty-title">
                {language === "th"
                  ? "ไม่พบรูปภาพหรือห้องพักที่ค้นหา"
                  : "No pins match your search"}
              </p>
              <p className="ty-body-muted">
                {language === "th"
                  ? "ลองเลือกหมวด “ทั้งหมด” หรือพิมพ์คำค้นหาอื่นดูนะครับ"
                  : "Try clearing the search filter or selecting All."}
              </p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 2xl:columns-6 gap-4">
              {filteredPins.map((pin) => (
                <PinterestPinCard
                  key={pin.id}
                  pin={pin}
                  language={language}
                  isSaved={Boolean(savedPinsMap[pin.id])}
                  canEdit={canShowEditControls}
                  onSelectPin={handleSelectPin}
                  onToggleSave={handleToggleSavePin}
                  onSharePin={handleSharePin}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Optional Fullscreen Image Zoom (Triggered only via ⤢ button inside Pin Detail) */}
      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
