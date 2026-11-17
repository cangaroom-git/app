"use client";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { PinCommentItem, pickLocalizedText } from "@/data/cmsDefaults";
import { CURATED_THAILAND_PARTNER_PINS } from "@/data/thailandProvinces";
import {
  LIKED_PINS_STORAGE_KEY,
  PinCategoryId,
  PinterestPinItem,
  SAVED_PINS_STORAGE_KEY,
  buildAllMarketplacePins,
} from "@/lib/pinBuilder";
import {
  formatShortDate,
  useHotelApp,
} from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import {
  PureMediaSlide,
  PureMediaViewer,
} from "@/components/cms/PureMediaViewer";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";

type HotelProfileTabId = PinCategoryId | "about";

export default function HotelFastworkProfilePage({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}) {
  const resolvedParams = use(params);
  const hotelSlug = (resolvedParams.hotelSlug || "sapanunseen")
    .trim()
    .toLowerCase();

  const {
    propertyConfig,
    rooms,
    addons,
    coupons,
    lang: language,
    checkIn,
    roomStatusMap,
    totalAvailableUnitsCount,
    openCalendarDrawer,
    openRoomDrawer,
    claimAndApplyCoupon,
    cms,
    saveStore,
    canShowEditControls,
    openCmsEditor,
    globalSearchQuery,
  } = useHotelApp();

  const { user: currentUser } = useAuthenticatedProfile();

  const [activeTab, setActiveTab] = useState<HotelProfileTabId>("all");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [savedPinsMap, setSavedPinsMap] = useState<Record<string, boolean>>({});
  const [likedPinsMap, setLikedPinsMap] = useState<Record<string, boolean>>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // Hydrate saved & liked pins + deep-linked ?pin=... or ?room=...
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedRaw = localStorage.getItem(SAVED_PINS_STORAGE_KEY);
      if (savedRaw) setSavedPinsMap(JSON.parse(savedRaw));
      const likedRaw = localStorage.getItem(LIKED_PINS_STORAGE_KEY);
      if (likedRaw) setLikedPinsMap(JSON.parse(likedRaw));

      const searchParams = new URLSearchParams(window.location.search);
      const pinParam = searchParams.get("pin");
      if (pinParam) setSelectedPinId(pinParam);

      const roomParam = searchParams.get("room");
      if (roomParam) {
        const matchedRoom = rooms.find(
          (r) => r.id.toLowerCase() === roomParam.toLowerCase()
        );
        if (matchedRoom) {
          openRoomDrawer(matchedRoom, "details");
        }
      }
    } catch {
      // ignore
    }
  }, [openRoomDrawer, rooms]);

  const navigateToBookRoom = useCallback(
    (roomId?: string) => {
      if (roomId) {
        const found = rooms.find((r) => r.id === roomId);
        if (found) {
          openRoomDrawer(found, "details");
          return;
        }
      }
      if (rooms[0]) {
        openRoomDrawer(rooms[0], "details");
      }
    },
    [openRoomDrawer, rooms]
  );

  const navigateToReview = useCallback(() => {
    setActiveTab("reviews");
    setSelectedPinId(null);
  }, []);

  const claimCouponAndBook = useCallback(
    (code: string) => {
      claimAndApplyCoupon(code);
      if (rooms[0]) {
        openRoomDrawer(rooms[0], "details");
      }
    },
    [claimAndApplyCoupon, openRoomDrawer, rooms]
  );

  // Build pins strictly for this hotel property (includePartnerPins: false)
  const hotelPins = useMemo<PinterestPinItem[]>(
    () =>
      buildAllMarketplacePins({
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
        includePartnerPins: false,
      }),
    [
      addons,
      claimCouponAndBook,
      cms,
      coupons,
      language,
      navigateToBookRoom,
      navigateToReview,
      openCmsEditor,
      propertyConfig,
      rooms,
    ]
  );

  const filteredPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    return hotelPins.filter((pin) => {
      if (
        activeTab !== "all" &&
        activeTab !== "about" &&
        pin.category !== activeTab
      ) {
        return false;
      }
      if (!q) return true;
      return (
        pin.title.toLowerCase().includes(q) ||
        pin.description.toLowerCase().includes(q) ||
        pin.boardLabel.toLowerCase().includes(q)
      );
    });
  }, [activeTab, globalSearchQuery, hotelPins]);

  const selectedPin = useMemo(
    () =>
      selectedPinId
        ? hotelPins.find((p) => p.id === selectedPinId) ?? null
        : null,
    [hotelPins, selectedPinId]
  );

  const relatedPins = useMemo(() => {
    if (!selectedPin) return [];
    return hotelPins.filter((p) => p.id !== selectedPin.id);
  }, [hotelPins, selectedPin]);

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
        window.dispatchEvent(new Event("cangaroom-saved-pins-changed"));
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
        ? `${window.location.origin}/${encodeURIComponent(
            hotelSlug
          )}?pin=${encodeURIComponent(pin.id)}`
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
        // fallback
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

  // Check if slug matches a curated partner preview if not Sapan Unseen
  const partnerPreview = useMemo(
    () =>
      CURATED_THAILAND_PARTNER_PINS.find((p) =>
        p.id.toLowerCase().includes(hotelSlug)
      ) ?? null,
    [hotelSlug]
  );

  const displayHotelName = partnerPreview
    ? pickLocalizedText(
        language,
        partnerPreview.hotelNameTh,
        partnerPreview.hotelNameEn
      )
    : pickLocalizedText(
        language,
        propertyConfig.nameTh.split("(")[0].trim(),
        propertyConfig.nameEn
      );

  const displayLocation = partnerPreview
    ? pickLocalizedText(
        language,
        partnerPreview.provinceLabelTh,
        partnerPreview.provinceLabelEn
      )
    : pickLocalizedText(
        language,
        propertyConfig.locationTh,
        propertyConfig.locationEn
      );

  const avatarUrl = partnerPreview
    ? partnerPreview.imageUrl
    : cms.home.heroImageUrl ||
      propertyConfig.heroImageUrl ||
      rooms[0]?.images[0]?.url;

  const coverBannerUrl = partnerPreview
    ? partnerPreview.galleryUrls[1] || partnerPreview.imageUrl
    : rooms[0]?.images[0]?.url ||
      cms.home.heroImageUrl ||
      propertyConfig.heroImageUrl;

  const minRoomPrice = useMemo(() => {
    if (partnerPreview) return partnerPreview.nightlyPriceThb;
    if (rooms.length === 0) return 2590;
    return Math.min(...rooms.map((r) => r.basePriceThb));
  }, [partnerPreview, rooms]);

  const profileTabs: Array<{
    id: HotelProfileTabId;
    labelTh: string;
    labelEn: string;
  }> = [
    { id: "all", labelTh: "ผลงาน", labelEn: "Portfolio" },
    { id: "rooms", labelTh: "ห้องพัก & วิลล่า", labelEn: "Rooms & Villas" },
    { id: "videos", labelTh: "คลิปบรรยากาศ", labelEn: "Videos" },
    { id: "views", labelTh: "วิว & มุมถ่ายรูป", labelEn: "Scenic Views" },
    { id: "dining", labelTh: "อาหาร & บาร์", labelEn: "Dining" },
    { id: "reviews", labelTh: "รีวิว", labelEn: "Reviews" },
    { id: "about", labelTh: "เกี่ยวกับ", labelEn: "About" },
  ];

  const highlightPills =
    language === "th"
      ? ["Mountain & Mist", "Private Villa", "Onsen Bathtub", "Direct Booking"]
      : ["Mountain & Mist", "Private Villa", "Onsen Bathtub", "Direct Booking"];

  return (
    <div className="w-full min-w-0 space-y-6">
      {selectedPin ? (
        <PinterestPinDetail
          key={selectedPin.id}
          pin={selectedPin}
          relatedPins={relatedPins}
          language={language}
          currentUser={currentUser}
          canEdit={canShowEditControls}
          isLiked={Boolean(likedPinsMap[selectedPin.id])}
          likeCount={cms.pinLikes?.[selectedPin.id] ?? selectedPin.baseLikes}
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
        <>
          {/* =================================================================
              1. FASTWORK-STYLE TOP PROFILE SECTION (Matches Image 5 100%)
                 - Left: Avatar + Online Dot + Title + @handle + Subtitle + 4-Metric Box
                 - Right: Wide Rounded Cover Image + Tag Pills + Location
          ================================================================== */}
          <section className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="ty-body-muted font-medium">
                {language === "th"
                  ? `โปรไฟล์ ${displayHotelName}`
                  : `Profile · ${displayHotelName}`}
              </p>

              {canShowEditControls && (
                <EditSpotButton
                  label="แก้ไขข้อมูลที่พัก"
                  onClick={() => openCmsEditor({ type: "home-hero" })}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: Identity + 4-Metric Box */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={avatarUrl}
                      alt={displayHotelName}
                      className="h-[84px] w-[84px] rounded-full object-cover bg-[var(--color-background-muted)]"
                    />
                    <span
                      title="Available for Instant Booking"
                      className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-[#22c55e] ring-2 ring-[var(--color-background-card)]"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h1 className="ty-display truncate">{displayHotelName}</h1>
                    <p className="ty-caption flex flex-wrap items-center gap-1.5">
                      <span className="underline text-[var(--color-text-primary)] font-medium">
                        @{hotelSlug}
                      </span>
                      <span>·</span>
                      <span>
                        {language === "th"
                          ? `ผู้ติดตาม ${(12.4).toFixed(1)}K คน`
                          : "12.4K followers"}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="ty-caption text-[var(--color-text-secondary)]">
                  {language === "th"
                    ? "Private Villa / Mountain & Mist / Onsen Bathtub / Direct Booking / อาหารเช้าเสิร์ฟถึงระเบียง"
                    : "Private Villa / Mountain & Mist / Onsen Bathtub / Direct Booking / Terrace Breakfast"}
                </p>

                {/* Fastwork 4-Metric Box */}
                <div className="rounded-[16px] border border-[var(--color-border)] px-5 py-3.5 grid grid-cols-4 gap-3 max-w-[440px] text-center bg-[var(--color-background-card)]">
                  <div>
                    <p className="ty-body font-bold text-[var(--color-text-primary)]">
                      ฿{minRoomPrice.toLocaleString()}+
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {language === "th" ? "เริ่มต้น/คืน" : "From/Night"}
                    </p>
                  </div>

                  <div>
                    <p className="ty-body font-bold text-[var(--color-text-primary)]">
                      {rooms.length}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {language === "th" ? "ประเภทห้อง" : "Room Types"}
                    </p>
                  </div>

                  <div>
                    <p className="ty-body font-bold text-[var(--color-text-primary)]">
                      {totalAvailableUnitsCount}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {language === "th" ? "ว่างวันนี้" : "Available"}
                    </p>
                  </div>

                  <div>
                    <p className="ty-body font-bold text-[var(--color-text-primary)] inline-flex items-center justify-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>4.9</span>
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {language === "th" ? "คะแนน" : "Rating"}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT: Wide Rounded Cover Image + Tag Pills + Location */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative h-[185px] sm:h-[210px] w-full rounded-[20px] overflow-hidden bg-[var(--color-background-muted)]">
                  <img
                    src={coverBannerUrl}
                    alt={displayHotelName}
                    className="h-full w-full object-cover"
                  />
                  {canShowEditControls && (
                    <div className="absolute bottom-3 right-3">
                      <EditSpotButton
                        label="เปลี่ยนภาพปก"
                        onClick={() => openCmsEditor({ type: "home-hero" })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {highlightPills.map((tag) => (
                      <span
                        key={tag}
                        className="h-7 px-3.5 rounded-full border border-[var(--color-border)] inline-flex items-center text-[12px] text-[var(--color-text-primary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-secondary)]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{displayLocation}, Thailand</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              2. FASTWORK 2-COLUMN WORKSPACE
                 - Left: Underline Tabs + Masonry Portfolio
                 - Right: Room Types & Pricing Cards ("ประเภทห้องพัก")
          ================================================================== */}
          <div className="flex flex-col lg:flex-row items-start gap-7 pt-1">
            {/* LEFT COLUMN: Underline Tabs + Masonry Grid */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                  {profileTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative pb-3 ty-body font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          isActive
                            ? "text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span>
                          {language === "th" ? tab.labelTh : tab.labelEn}
                        </span>
                        {isActive && (
                          <span className="absolute bottom-0 inset-x-0 h-[2px] rounded-full bg-[var(--color-text-primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {canShowEditControls && (
                  <div className="flex items-center gap-1.5 pb-2 shrink-0">
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

              {activeTab === "about" ? (
                <div className="rounded-[20px] border border-[var(--color-border)] p-5 sm:p-6 space-y-5">
                  <div className="space-y-1.5">
                    <h2 className="ty-title">{displayHotelName}</h2>
                    <p className="ty-body text-[var(--color-text-secondary)]">
                      {pickLocalizedText(
                        language,
                        propertyConfig.taglineTh,
                        propertyConfig.taglineEn
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-[14px] bg-[var(--color-background-muted)]/60 p-3.5 space-y-1">
                      <p className="ty-caption flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? "เช็กอิน / เช็กเอาท์"
                            : "Check-in / Check-out"}
                        </span>
                      </p>
                      <p className="ty-body font-semibold">
                        {propertyConfig.checkInTime} /{" "}
                        {propertyConfig.checkOutTime}
                      </p>
                    </div>

                    <div className="rounded-[14px] bg-[var(--color-background-muted)]/60 p-3.5 space-y-1">
                      <p className="ty-caption flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
                        <span>
                          {language === "th" ? "ติดต่อที่พัก" : "Contact"}
                        </span>
                      </p>
                      <p className="ty-body font-semibold">
                        {propertyConfig.phones[0] || "089-xxx-xxxx"} · LINE{" "}
                        {propertyConfig.lineId}
                      </p>
                    </div>

                    <div className="rounded-[14px] bg-[var(--color-background-muted)]/60 p-3.5 space-y-1">
                      <p className="ty-caption flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? "การันตีจองตรง"
                            : "Direct Guarantee"}
                        </span>
                      </p>
                      <p className="ty-body font-semibold">
                        {language === "th"
                          ? "ราคาตรงจากที่พัก 0% ค่าธรรมเนียมแฝง"
                          : "Best direct rate · 0% hidden fees"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <MasonryGrid
                  items={filteredPins}
                  columnBreakpoints={[2, 2, 3, 3, 3]}
                  gapClass="gap-4"
                  renderItem={(pin) => (
                    <PinterestPinCard
                      pin={pin}
                      language={language}
                      isSaved={Boolean(savedPinsMap[pin.id])}
                      canEdit={canShowEditControls}
                      onSelectPin={handleSelectPin}
                      onToggleSave={handleToggleSavePin}
                      onSharePin={handleSharePin}
                    />
                  )}
                />
              )}
            </div>

            {/* RIGHT COLUMN: Fastwork-Style Room Types & Pricing Cards ("ประเภทห้องพัก") */}
            <aside className="w-full lg:w-[360px] xl:w-[390px] shrink-0 lg:sticky lg:top-20 space-y-3.5 select-none">
              <div className="flex items-center justify-between gap-2">
                <h2 className="ty-subtitle font-bold">
                  {language === "th" ? "ประเภทห้องพัก" : "Rooms & Villas"}
                </h2>

                <button
                  type="button"
                  onClick={openCalendarDrawer}
                  className="ty-body font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer"
                >
                  {language === "th"
                    ? `เช็กวันว่าง (${formatShortDate(checkIn, language)})`
                    : `Dates (${formatShortDate(checkIn, language)})`}
                </button>
              </div>

              <div className="space-y-3">
                {rooms.map((room, rIdx) => {
                  const status = roomStatusMap[room.id];
                  const isAvailable = (status?.availableUnits ?? 1) > 0;
                  const nightlyPrice = Math.round(
                    room.basePriceThb * (1 - (room.discountPercent || 0) / 100)
                  );
                  const reviewCount = 18 + rIdx * 6;

                  return (
                    <div
                      key={room.id}
                      onClick={() => openRoomDrawer(room, "details")}
                      className="w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-background-card)] hover:border-[var(--color-border-emphasized)] p-3.5 flex items-center gap-4 transition cursor-pointer"
                    >
                      <div className="relative w-[116px] h-[84px] rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] shrink-0">
                        <img
                          src={room.images[0]?.url}
                          alt={room.nameTh}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {canShowEditControls && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-1.5 left-1.5"
                          >
                            <EditSpotButton
                              onClick={() =>
                                openCmsEditor({ type: "room", roomId: room.id })
                              }
                            />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                          {pickLocalizedText(language, room.nameTh, room.nameEn)}
                        </p>

                        <p className="ty-caption truncate">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            ฿{nightlyPrice.toLocaleString()}
                          </span>{" "}
                          / {language === "th" ? "คืน" : "night"} ·{" "}
                          {language === "th"
                            ? `รองรับ ${room.baseGuests}–${room.maxGuests} ท่าน`
                            : `${room.baseGuests}–${room.maxGuests} guests`}
                        </p>

                        <p className="ty-caption flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current text-[var(--color-text-primary)]" />
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            4.9
                          </span>
                          <span>({reviewCount})</span>
                          <span>·</span>
                          <span
                            className={
                              isAvailable
                                ? "text-[var(--color-success)] font-medium"
                                : "text-[var(--color-error)] font-medium"
                            }
                          >
                            {isAvailable
                              ? language === "th"
                                ? `ว่าง ${status?.availableUnits ?? 1} หลัง`
                                : `${status?.availableUnits ?? 1} left`
                              : language === "th"
                              ? "เต็มแล้ว"
                              : "Sold out"}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </>
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
