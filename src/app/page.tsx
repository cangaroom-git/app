"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PinCommentItem } from "@/data/cmsDefaults";
import { StayStyleTag } from "@/data/thailandProvinces";
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
        window.location.href = `/sapanunseen?room=${encodeURIComponent(roomId)}`;
        return;
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
           MODE B: CLEAN 2-COLUMN MINIMAL WORKSPACE
              - Left: Category Underline Tabs + Staggered Masonry (Photos + Videos)
              - Right: Minimal Stay Styles & 77 Provinces Cross-Filter
        ====================================================================== */
        <div className="flex flex-col lg:flex-row items-start gap-7">
          {/* LEFT COLUMN: Category Tabs + Active Filter Bar + Variable-Height Masonry */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Category Underline Tabs */}
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

            {/* True Shortest-Column Staggered Masonry Grid (Photos + Mixed Aspect Videos) */}
            {filteredPins.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <p className="ty-title">
                  {language === "th"
                    ? "ยังไม่มีที่พักที่ตรงกับตัวกรองนี้"
                    : "No stays match the selected filters"}
                </p>
                <p className="ty-body-muted max-w-md mx-auto">
                  {language === "th"
                    ? "ลองล้างตัวกรองเพื่อดูที่พักทั้งหมด หรือนำที่พักของคุณในจังหวัดนี้เข้าร่วมฟรี 30 วัน"
                    : "Try resetting filters to browse all curated Thailand stays."}
                </p>
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="h-10 px-4 rounded-[12px] bg-[var(--color-text-primary)] text-[var(--color-background-card)] ty-body font-semibold cursor-pointer"
                  >
                    {language === "th" ? "ดูที่พักทั้งหมด" : "Show All Stays"}
                  </button>
                  <Link
                    href="/register-hotel"
                    className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] ty-body font-semibold inline-flex items-center"
                  >
                    {language === "th"
                      ? "+ ลงที่พักฟรี 30 วัน"
                      : "+ List Property Free"}
                  </Link>
                </div>
              </div>
            ) : (
              <MasonryGrid
                items={filteredPins}
                columnBreakpoints={[2, 2, 3, 4, 5]}
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

          {/* RIGHT COLUMN: Slim Ultra-Minimal Stay Styles & 77 Provinces Rail */}
          <div className="w-full lg:w-[236px] xl:w-[248px] shrink-0 lg:sticky lg:top-20">
            <ThailandDiscoverySidebar
              language={language}
              selectedProvinceId={selectedProvinceId}
              onSelectProvince={setSelectedProvinceId}
              selectedStyles={selectedStyles}
              onToggleStyle={handleToggleStyle}
              onResetAllFilters={handleResetAllFilters}
              resultCount={filteredPins.length}
            />
          </div>
        </div>
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
