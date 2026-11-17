"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  Calendar,
  MapPin,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { PinCommentItem } from "@/data/cmsDefaults";
import {
  STAY_STYLE_CATEGORIES,
  StayStyleTag,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import {
  LIKED_PINS_STORAGE_KEY,
  PinCategoryId,
  PinterestPinItem,
  SAVED_PINS_STORAGE_KEY,
  buildAllMarketplacePins,
} from "@/lib/pinBuilder";
import { useHotelApp } from "@/components/HotelAppShell";
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
import { ThailandDiscoverySidebar } from "@/components/home/ThailandDiscoverySidebar";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";

const QUICK_DESTINATION_SPOTLIGHTS: ReadonlyArray<{
  provinceId: string;
  labelTh: string;
  labelEn: string;
  subTh: string;
  subEn: string;
  imageUrl: string;
}> = [
  {
    provinceId: "nan",
    labelTh: "น่าน · สะปัน",
    labelEn: "Nan · Sapan",
    subTh: "ขุนเขา & สายหมอก",
    subEn: "Mist & Valleys",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80",
  },
  {
    provinceId: "chiang-mai",
    labelTh: "เชียงใหม่",
    labelEn: "Chiang Mai",
    subTh: "แม่ริม & ออนเซ็น",
    subEn: "Forest & Onsen",
    imageUrl:
      "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=500&q=80",
  },
  {
    provinceId: "phuket",
    labelTh: "ภูเก็ต",
    labelEn: "Phuket",
    subTh: "พูลวิลล่าวิวทะเล",
    subEn: "Ocean Pool Villas",
    imageUrl:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=500&q=80",
  },
  {
    provinceId: "nakhon-ratchasima",
    labelTh: "เขาใหญ่",
    labelEn: "Khao Yai",
    subTh: "แกลมปิ้ง & ไวน์บาร์",
    subEn: "Glamping & Vineyards",
    imageUrl:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=500&q=80",
  },
  {
    provinceId: "krabi",
    labelTh: "กระบี่",
    labelEn: "Krabi",
    subTh: "อ่าวนาง & หน้าผาหินปูน",
    subEn: "Cliffs & Sunset",
    imageUrl:
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=500&q=80",
  },
  {
    provinceId: "bangkok",
    labelTh: "กรุงเทพฯ",
    labelEn: "Bangkok",
    subTh: "ริมเจ้าพระยา & รูฟท็อป",
    subEn: "River & Rooftop Bars",
    imageUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=500&q=80",
  },
];

const VALID_PIN_CATEGORIES: ReadonlySet<string> = new Set([
  "all",
  "rooms",
  "videos",
  "views",
  "dining",
  "reviews",
  "deals",
]);

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
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null
  );
  const [selectedStyles, setSelectedStyles] = useState<StayStyleTag[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [savedPinsMap, setSavedPinsMap] = useState<Record<string, boolean>>({});
  const [likedPinsMap, setLikedPinsMap] = useState<Record<string, boolean>>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // Hydrate saved & liked pins + deep-linked ?pin=... or ?category=...
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
      const catParam = params.get("category");
      if (catParam && VALID_PIN_CATEGORIES.has(catParam)) {
        setActiveCategory(catParam as PinCategoryId);
      }
    } catch {
      // ignore storage errors
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedPinId(params.get("pin"));
      const catParam = params.get("category");
      if (catParam && VALID_PIN_CATEGORIES.has(catParam)) {
        setActiveCategory(catParam as PinCategoryId);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToBookRoom = useCallback(
    (roomId?: string) => {
      if (roomId && typeof window !== "undefined") {
        window.history.pushState(null, "", `/booking?room=${roomId}`);
      }
      navigateToTab("book");
    },
    [navigateToTab]
  );

  const navigateToReview = useCallback(() => {
    navigateToTab("review");
  }, [navigateToTab]);

  const claimCouponAndBook = useCallback(
    (code: string) => {
      claimAndApplyCoupon(code);
      navigateToTab("book");
    },
    [claimAndApplyCoupon, navigateToTab]
  );

  // Build ranked & staggered multi-hotel Thailand discovery pins
  const allPins = useMemo<PinterestPinItem[]>(
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

  // Cross-Filter: Category Tab × Province (77 Provinces) × Stay Styles × Top Search Query
  const filteredPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    return allPins.filter((pin) => {
      if (activeCategory !== "all" && pin.category !== activeCategory) {
        return false;
      }
      if (selectedProvinceId && pin.provinceId !== selectedProvinceId) {
        return false;
      }
      if (
        selectedStyles.length > 0 &&
        !selectedStyles.some((st) => pin.styles.includes(st))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        pin.title.toLowerCase().includes(q) ||
        pin.description.toLowerCase().includes(q) ||
        pin.boardLabel.toLowerCase().includes(q) ||
        pin.authorName.toLowerCase().includes(q) ||
        pin.provinceLabel.toLowerCase().includes(q)
      );
    });
  }, [
    activeCategory,
    allPins,
    globalSearchQuery,
    selectedProvinceId,
    selectedStyles,
  ]);

  const selectedPin = useMemo(
    () =>
      selectedPinId
        ? allPins.find((p) => p.id === selectedPinId) ?? null
        : null,
    [allPins, selectedPinId]
  );

  const relatedPins = useMemo(() => {
    if (!selectedPin) return [];
    const sameCategoryOrStyle = allPins.filter(
      (p) =>
        p.id !== selectedPin.id &&
        (p.category === selectedPin.category ||
          p.styles.some((s) => selectedPin.styles.includes(s)))
    );
    const others = allPins.filter(
      (p) =>
        p.id !== selectedPin.id &&
        p.category !== selectedPin.category &&
        !p.styles.some((s) => selectedPin.styles.includes(s))
    );
    return [...sameCategoryOrStyle, ...others];
  }, [allPins, selectedPin]);

  const savedPinsCount = useMemo(
    () => Object.values(savedPinsMap).filter(Boolean).length,
    [savedPinsMap]
  );

  const handleToggleStyle = (style: StayStyleTag) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleResetAllFilters = () => {
    setSelectedProvinceId(null);
    setSelectedStyles([]);
    setActiveCategory("all");
  };

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
    { id: "all", labelTh: "ทั้งหมด", labelEn: "All Stays" },
    { id: "rooms", labelTh: "ที่พัก & พูลวิลล่า", labelEn: "Villas & Suites" },
    { id: "videos", labelTh: "คลิปบรรยากาศ", labelEn: "Videos" },
    { id: "views", labelTh: "วิว & มุมถ่ายรูป", labelEn: "Scenic Views" },
    { id: "dining", labelTh: "อาหาร & บาร์", labelEn: "Dining & Bars" },
    { id: "reviews", labelTh: "รีวิวผู้เข้าพัก", labelEn: "Guest Stories" },
    { id: "deals", labelTh: "โปรโมชั่นจองตรง", labelEn: "Direct Deals" },
  ];

  const activeProvinceMeta = selectedProvinceId
    ? THAILAND_77_PROVINCES.find((p) => p.id === selectedProvinceId) ?? null
    : null;

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* =====================================================================
          MODE A: IN-PAGE PINTEREST PIN DETAIL CLOSE-UP + RELATED MASONRY
             - Zero empty space underneath the image (related masonry directly below)
             - Squircle rounded-[16px] Back button matching Pinterest reference
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
        /* =====================================================================
           MODE B: CANGAROOM TOP DISCOVERY BANNER + 2-COLUMN WORKSPACE
              - Top: Distinct Cangaroom Thailand Hotel Discovery Header
              - Left: Staggered Variable-Height Masonry (Photos + Videos)
              - Right: Fastwork-Inspired Stay Styles & 77 Provinces Cross-Filter
        ====================================================================== */
        <>
          {/* 1. DISTINCT CANGAROOM TOP DISCOVERY SECTION */}
          <section className="rounded-[24px] bg-[var(--color-background-muted)]/60 border border-[var(--color-border)] p-4 sm:p-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
              {/* Brand Headline & Quick Actions */}
              <div className="xl:col-span-6 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-border)] ty-caption font-semibold text-[var(--color-text-primary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-promo)]" />
                  <span>
                    {language === "th"
                      ? "CANGAROOM · แหล่งรวมที่พักสวยทั่วไทย 77 จังหวัด"
                      : "CANGAROOM · THAILAND VISUAL STAYS MARKETPLACE"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h1 className="ty-display">
                    {language === "th"
                      ? "ค้นหา บันทึกที่พักในฝัน และจองตรงราคาดีที่สุด"
                      : "Discover, Save & Book Boutique Stays Across Thailand"}
                  </h1>
                  <p className="ty-body-muted max-w-2xl">
                    {language === "th"
                      ? "สำรวจภาพถ่ายจริงและคลิปบรรยากาศจากรีสอร์ท พูลวิลล่า และโฮมสเตย์ทั่วไทย กดบันทึกเก็บเข้าบอร์ดทริปส่วนตัว หรือเลือกจองตรงกับที่พักได้ทันที"
                      : "Explore real photos and atmosphere videos from resorts & pool villas across all 77 provinces. Save favorites to your personal trip board or book direct."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    href="/board"
                    className="h-11 px-4 rounded-[14px] bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-[var(--color-on-promo)] inline-flex items-center gap-2 ty-body font-semibold transition-colors"
                  >
                    <Bookmark className="w-[18px] h-[18px]" fill="currentColor" />
                    <span>
                      {language === "th"
                        ? `บอร์ดที่บันทึกไว้${
                            savedPinsCount > 0 ? ` (${savedPinsCount})` : ""
                          }`
                        : `My Saved Board${
                            savedPinsCount > 0 ? ` (${savedPinsCount})` : ""
                          }`}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => navigateToTab("book")}
                    className="h-11 px-4 rounded-[14px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] inline-flex items-center gap-2 ty-body font-semibold transition-colors cursor-pointer"
                  >
                    <Calendar className="w-[18px] h-[18px] text-[var(--color-accent)]" />
                    <span>
                      {language === "th"
                        ? "เช็กห้องว่าง & จองตรง"
                        : "Check Availability"}
                    </span>
                  </button>

                  <Link
                    href="/register-hotel"
                    className="h-11 px-4 rounded-[14px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] inline-flex items-center gap-2 ty-body font-semibold transition-colors"
                  >
                    <Building2 className="w-[18px] h-[18px] text-[var(--color-text-secondary)]" />
                    <span>
                      {language === "th"
                        ? "เจ้าของที่พัก: ลงที่พักฟรี 30 วัน"
                        : "List Your Hotel Free"}
                    </span>
                  </Link>
                </div>
              </div>

              {/* Quick Destination Spotlight Grid (One-Click Province Cross-Filter) */}
              <div className="xl:col-span-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {QUICK_DESTINATION_SPOTLIGHTS.map((spot) => {
                    const isSelected = selectedProvinceId === spot.provinceId;
                    return (
                      <button
                        key={spot.provinceId}
                        type="button"
                        onClick={() =>
                          setSelectedProvinceId(
                            isSelected ? null : spot.provinceId
                          )
                        }
                        className={`relative h-[86px] rounded-[16px] overflow-hidden text-left p-3 flex flex-col justify-end transition-shadow cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-[var(--color-promo)] shadow-sm"
                            : "hover:opacity-95"
                        }`}
                      >
                        <img
                          src={spot.imageUrl}
                          alt={spot.labelTh}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5" />
                        <div className="relative z-10 min-w-0">
                          <p className="text-white text-[13px] font-bold leading-tight truncate">
                            {language === "th" ? spot.labelTh : spot.labelEn}
                          </p>
                          <p className="text-white/80 text-[11px] font-medium truncate">
                            {language === "th" ? spot.subTh : spot.subEn}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-[6px] bg-[var(--color-promo)] text-white text-[10px] font-bold">
                            {language === "th" ? "เลือกอยู่" : "Active"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 2. MAIN 2-COLUMN DISCOVERY WORKSPACE (Left Masonry Feed + Right Fastwork Cross-Filter) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Category Tabs + Active Filter Bar + Variable-Height Masonry */}
            <div className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-4">
              {/* Category Underline Tabs (Matches Fastwork & Pinterest) */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar">
                  {categoryTabs.map((tab) => {
                    const isActive = activeCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
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
                          <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[var(--color-text-primary)]" />
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

              {/* Active Cross-Filter Chips Bar */}
              {(activeProvinceMeta || selectedStyles.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ty-caption font-semibold">
                    {language === "th"
                      ? `ผลลัพธ์ ${filteredPins.length} รายการ:`
                      : `${filteredPins.length} stays:`}
                  </span>

                  {activeProvinceMeta && (
                    <button
                      type="button"
                      onClick={() => setSelectedProvinceId(null)}
                      className="h-8 px-3 rounded-[10px] bg-[var(--color-text-primary)] text-[var(--color-background-card)] inline-flex items-center gap-1.5 ty-caption font-semibold cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {language === "th"
                          ? activeProvinceMeta.nameTh
                          : activeProvinceMeta.nameEn}
                      </span>
                      <X className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  )}

                  {selectedStyles.map((stId) => {
                    const stMeta = STAY_STYLE_CATEGORIES.find(
                      (c) => c.id === stId
                    );
                    if (!stMeta) return null;
                    return (
                      <button
                        key={stId}
                        type="button"
                        onClick={() => handleToggleStyle(stId)}
                        className="h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center gap-1.5 ty-caption font-semibold cursor-pointer"
                      >
                        <span>
                          {language === "th" ? stMeta.titleTh : stMeta.titleEn}
                        </span>
                        <X className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="h-8 px-2.5 rounded-[10px] text-[var(--color-promo)] hover:underline inline-flex items-center gap-1 ty-caption font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {language === "th" ? "ล้างทั้งหมด" : "Reset all"}
                    </span>
                  </button>
                </div>
              )}

              {/* True Shortest-Column Staggered Masonry Grid (Photos + Mixed Aspect Videos) */}
              {filteredPins.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-muted)]/40 py-16 px-4 text-center space-y-3">
                  <p className="ty-title">
                    {language === "th"
                      ? "ยังไม่มีที่พักที่ตรงกับตัวกรองนี้"
                      : "No stays match the selected filters"}
                  </p>
                  <p className="ty-body-muted max-w-md mx-auto">
                    {language === "th"
                      ? "เรากำลังเปิดรับที่พักสวยทั่วไทยทั้ง 77 จังหวัด ลองล้างตัวกรองเพื่อดูที่พักแนะนำทั้งหมด หรือลงทะเบียนที่พักของคุณฟรี 30 วัน"
                      : "Try resetting province or stay style filters to browse all curated Thailand stays."}
                  </p>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="h-10 px-4 rounded-[12px] bg-[var(--color-text-primary)] text-[var(--color-background-card)] ty-body font-semibold cursor-pointer"
                    >
                      {language === "th"
                        ? "ดูที่พักแนะนำทั้งหมด"
                        : "Show All Stays"}
                    </button>
                    <Link
                      href="/register-hotel"
                      className="h-10 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[var(--color-border)] ty-body font-semibold inline-flex items-center"
                    >
                      {language === "th"
                        ? "+ ลงที่พักในจังหวัดนี้"
                        : "+ List a Property Here"}
                    </Link>
                  </div>
                </div>
              ) : (
                <MasonryGrid
                  items={filteredPins}
                  columnBreakpoints={[2, 2, 3, 3, 4]}
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

            {/* RIGHT COLUMN: Fastwork-Style Stay Styles + All 77 Provinces Cross-Filter */}
            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20">
              <ThailandDiscoverySidebar
                language={language}
                selectedProvinceId={selectedProvinceId}
                onSelectProvince={setSelectedProvinceId}
                selectedStyles={selectedStyles}
                onToggleStyle={handleToggleStyle}
                onResetAllFilters={handleResetAllFilters}
              />
            </div>
          </div>
        </>
      )}

      {/* Optional Fullscreen Image Zoom */}
      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
