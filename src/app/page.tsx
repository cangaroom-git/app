"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PinCommentItem } from "@/data/cmsDefaults";
import { StayStyleTag } from "@/data/thailandProvinces";
import {
  LIKED_PINS_STORAGE_KEY,
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
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";

type HomeStyleTabId = "all" | StayStyleTag;

const STAY_STYLE_TABS: ReadonlyArray<{
  id: HomeStyleTabId;
  labelTh: string;
  labelEn: string;
}> = [
  { id: "all", labelTh: "ทั้งหมด", labelEn: "All Stays" },
  { id: "mountain", labelTh: "ภูเขา & ทะเลหมอก", labelEn: "Mountain & Mist" },
  { id: "pool-villa", labelTh: "พูลวิลล่า", labelEn: "Pool Villas" },
  { id: "sea", labelTh: "ติดทะเล & ชายหาด", labelEn: "Sea & Beachfront" },
  { id: "bars", labelTh: "บาร์ & รูฟท็อป", labelEn: "Bars & Rooftop" },
  { id: "bathtub", labelTh: "อ่างแช่น้ำ & ออนเซ็น", labelEn: "Onsen & Bathtub" },
  { id: "glamping", labelTh: "แกลมปิ้ง & เคบิน", labelEn: "Glamping & Cabin" },
];

const VALID_STYLE_TABS: ReadonlySet<string> = new Set(
  STAY_STYLE_TABS.map((t) => t.id)
);

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
    selectedProvinceId,
    setSelectedProvinceId,
    isDateFilterActive,
    setIsDateFilterActive,
    roomStatusMap,
    totalAvailableUnitsCount,
    guests,
  } = useHotelApp();

  const { user: currentUser } = useAuthenticatedProfile();

  const [activeStyleTab, setActiveStyleTab] = useState<HomeStyleTabId>("all");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [savedPinsMap, setSavedPinsMap] = useState<Record<string, boolean>>({});
  const [likedPinsMap, setLikedPinsMap] = useState<Record<string, boolean>>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // Hydrate saved & liked pins + deep-linked ?pin=... or ?style=...
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
      const styleParam = params.get("style");
      if (styleParam && VALID_STYLE_TABS.has(styleParam)) {
        setActiveStyleTab(styleParam as HomeStyleTabId);
      }
    } catch {
      // ignore storage errors
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedPinId(params.get("pin"));
      const styleParam = params.get("style");
      if (styleParam && VALID_STYLE_TABS.has(styleParam)) {
        setActiveStyleTab(styleParam as HomeStyleTabId);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToBookRoom = useCallback(
    (roomId?: string) => {
      if (roomId && typeof window !== "undefined") {
        window.location.href = `/sapanunseen?room=${encodeURIComponent(
          roomId
        )}`;
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

  // Cross-Filter: Stay Style Tab × Province (Search Bar) × Agoda Date Availability (Search Bar) × Text Query
  const filteredPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    return allPins.filter((pin) => {
      // 1. Stay Style Tab
      if (activeStyleTab !== "all" && !pin.styles.includes(activeStyleTab)) {
        return false;
      }

      // 2. Province Filter (from Top Search Bar)
      if (selectedProvinceId && pin.provinceId !== selectedProvinceId) {
        return false;
      }

      // 3. Agoda Calendar Date & Guest Availability Filter (from Top Search Bar)
      if (isDateFilterActive) {
        if (pin.roomId) {
          const roomAvail = roomStatusMap[pin.roomId]?.availableUnits ?? 0;
          if (roomAvail <= 0) return false;
          if (pin.maxGuests && guests > pin.maxGuests) return false;
        } else if (pin.maxGuests) {
          if (guests > pin.maxGuests) return false;
        } else {
          // General resort atmosphere/video pins: require at least 1 available unit at the resort
          if (totalAvailableUnitsCount <= 0) return false;
        }
      }

      // 4. Keyword Search
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
    activeStyleTab,
    allPins,
    globalSearchQuery,
    guests,
    isDateFilterActive,
    roomStatusMap,
    selectedProvinceId,
    totalAvailableUnitsCount,
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

  const handleResetAllFilters = () => {
    setActiveStyleTab("all");
    setSelectedProvinceId(null);
    setIsDateFilterActive(false);
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

  return (
    <div className="w-full min-w-0 space-y-5">
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
           FULL-WIDTH 6-COLUMN PINTEREST MASONRY + STAY STYLE UNDERLINE TABS
        ====================================================================== */
        <div className="w-full min-w-0 space-y-4">
          {/* Stay Style Horizontal Underline Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar">
              {STAY_STYLE_TABS.map((tab) => {
                const isActive = activeStyleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveStyleTab(tab.id)}
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

          {/* Full-Width 6-Column Staggered Masonry Grid */}
          {filteredPins.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <p className="ty-title">
                {language === "th"
                  ? "ไม่พบที่พักว่างที่ตรงกับตัวกรองนี้"
                  : "No available stays match the selected filters"}
              </p>
              <p className="ty-body-muted max-w-md mx-auto">
                {language === "th"
                  ? "ลองเปลี่ยนจังหวัด วันเข้าพัก หรือเลือกสไตล์ “ทั้งหมด” เพื่อดูที่พักแนะนำทั่วไทย"
                  : "Try clearing the province, stay dates, or style filter to view all curated stays."}
              </p>
              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="h-10 px-4 rounded-[12px] bg-[#111111] !text-white ty-body font-semibold cursor-pointer"
                >
                  <span className="!text-white">
                    {language === "th" ? "ดูที่พักทั้งหมด" : "Show All Stays"}
                  </span>
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
              columnBreakpoints={[2, 3, 4, 5, 6]}
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
