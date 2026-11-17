"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Compass,
  FolderHeart,
  FolderPlus,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PinCommentItem } from "@/data/cmsDefaults";
import {
  LIKED_PINS_STORAGE_KEY,
  PinterestPinItem,
  SAVED_PINS_STORAGE_KEY,
  USER_BOARDS_STORAGE_KEY,
  UserBoardCollection,
  buildAllMarketplacePins,
} from "@/lib/pinBuilder";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  PureMediaSlide,
  PureMediaViewer,
} from "@/components/cms/PureMediaViewer";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import {
  UserAvatarCircle,
  useAuthenticatedProfile,
} from "@/components/navigation/UserProfileDropdown";

export default function SavedBoardPage() {
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

  const [savedPinsMap, setSavedPinsMap] = useState<Record<string, boolean>>({});
  const [likedPinsMap, setLikedPinsMap] = useState<Record<string, boolean>>({});
  const [userBoards, setUserBoards] = useState<UserBoardCollection[]>([]);
  const [activeBoardFilter, setActiveBoardFilter] = useState<string>("all");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // Create new custom board UI state
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [assigningPinId, setAssigningPinId] = useState<string | null>(null);

  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedRaw = localStorage.getItem(SAVED_PINS_STORAGE_KEY);
      if (savedRaw) setSavedPinsMap(JSON.parse(savedRaw));
      const likedRaw = localStorage.getItem(LIKED_PINS_STORAGE_KEY);
      if (likedRaw) setLikedPinsMap(JSON.parse(likedRaw));
      const boardsRaw = localStorage.getItem(USER_BOARDS_STORAGE_KEY);
      if (boardsRaw) setUserBoards(JSON.parse(boardsRaw));

      const params = new URLSearchParams(window.location.search);
      const pinParam = params.get("pin");
      if (pinParam) setSelectedPinId(pinParam);
    } catch {
      // ignore storage errors
    }
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

  const savedPins = useMemo(
    () => allPins.filter((pin) => Boolean(savedPinsMap[pin.id])),
    [allPins, savedPinsMap]
  );

  // Auto-grouped province boards from saved pins
  const savedProvinceGroups = useMemo(() => {
    const map = new Map<
      string,
      { provinceId: string; label: string; pins: PinterestPinItem[] }
    >();
    savedPins.forEach((pin) => {
      const existing = map.get(pin.provinceId);
      if (existing) {
        existing.pins.push(pin);
      } else {
        map.set(pin.provinceId, {
          provinceId: pin.provinceId,
          label: pin.provinceLabel,
          pins: [pin],
        });
      }
    });
    return Array.from(map.values());
  }, [savedPins]);

  const displayedSavedPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    let list = savedPins;

    if (activeBoardFilter.startsWith("board:")) {
      const boardId = activeBoardFilter.replace("board:", "");
      const foundBoard = userBoards.find((b) => b.id === boardId);
      if (foundBoard) {
        const idSet = new Set(foundBoard.pinIds);
        list = savedPins.filter((p) => idSet.has(p.id));
      }
    } else if (activeBoardFilter.startsWith("prov:")) {
      const provId = activeBoardFilter.replace("prov:", "");
      list = savedPins.filter((p) => p.provinceId === provId);
    }

    if (!q) return list;
    return list.filter(
      (pin) =>
        pin.title.toLowerCase().includes(q) ||
        pin.description.toLowerCase().includes(q) ||
        pin.provinceLabel.toLowerCase().includes(q) ||
        pin.authorName.toLowerCase().includes(q)
    );
  }, [activeBoardFilter, globalSearchQuery, savedPins, userBoards]);

  const selectedPin = useMemo(
    () =>
      selectedPinId
        ? allPins.find((p) => p.id === selectedPinId) ?? null
        : null,
    [allPins, selectedPinId]
  );

  const relatedPins = useMemo(() => {
    if (!selectedPin) return [];
    return allPins.filter((p) => p.id !== selectedPin.id);
  }, [allPins, selectedPin]);

  const persistBoards = (nextBoards: UserBoardCollection[]) => {
    setUserBoards(nextBoards);
    try {
      localStorage.setItem(USER_BOARDS_STORAGE_KEY, JSON.stringify(nextBoards));
    } catch {
      // ignore
    }
  };

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    const created: UserBoardCollection = {
      id: `brd-${Date.now()}`,
      name: trimmed,
      pinIds: [],
      createdAtIso: new Date().toISOString(),
    };
    const nextBoards = [created, ...userBoards];
    persistBoards(nextBoards);
    setNewBoardName("");
    setIsCreatingBoard(false);
    setActiveBoardFilter(`board:${created.id}`);
  };

  const handleDeleteBoard = (boardId: string) => {
    const nextBoards = userBoards.filter((b) => b.id !== boardId);
    persistBoards(nextBoards);
    if (activeBoardFilter === `board:${boardId}`) {
      setActiveBoardFilter("all");
    }
  };

  const handleTogglePinInBoard = (boardId: string, pinId: string) => {
    // Also ensure pin is marked saved globally
    if (!savedPinsMap[pinId]) {
      handleToggleSavePin(pinId);
    }
    const nextBoards = userBoards.map((board) => {
      if (board.id !== boardId) return board;
      const exists = board.pinIds.includes(pinId);
      return {
        ...board,
        pinIds: exists
          ? board.pinIds.filter((id) => id !== pinId)
          : [...board.pinIds, pinId],
      };
    });
    persistBoards(nextBoards);
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

  const activeUserBoard = activeBoardFilter.startsWith("board:")
    ? userBoards.find((b) => `board:${b.id}` === activeBoardFilter) ?? null
    : null;

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
              1. PINTEREST-STYLE PERSONAL BOARD HEADER
          ================================================================== */}
          <section className="rounded-[24px] bg-[var(--color-background-muted)]/60 border border-[var(--color-border)] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Link
                  href="/"
                  title={language === "th" ? "กลับหน้าแรก" : "Back to Home"}
                  className="h-12 w-12 rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] flex items-center justify-center text-[var(--color-text-primary)] shrink-0 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
                </Link>

                {currentUser ? (
                  <UserAvatarCircle
                    user={currentUser}
                    sizeClass="h-14 w-14"
                    iconSizeClass="w-7 h-7"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-[18px] bg-[var(--color-promo)] text-[var(--color-on-promo)] flex items-center justify-center shrink-0">
                    <Bookmark className="w-7 h-7" fill="currentColor" />
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="ty-display truncate">
                    {language === "th"
                      ? "บอร์ดที่พักที่บันทึกไว้"
                      : "My Saved Stay Boards"}
                  </h1>
                  <p className="ty-body-muted">
                    {language === "th"
                      ? `บันทึกไว้ ${savedPins.length} การ์ด · ${savedProvinceGroups.length} จังหวัด · ${userBoards.length} บอร์ดทริปส่วนตัว`
                      : `${savedPins.length} saved cards · ${savedProvinceGroups.length} provinces · ${userBoards.length} custom boards`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingBoard((v) => !v)}
                  className="h-11 px-4 rounded-[14px] bg-[var(--color-text-primary)] text-[var(--color-background-card)] hover:opacity-90 inline-flex items-center gap-2 ty-body font-semibold cursor-pointer transition-opacity"
                >
                  <FolderPlus className="w-5 h-5" />
                  <span>
                    {language === "th"
                      ? "สร้างบอร์ดทริปใหม่"
                      : "Create Trip Board"}
                  </span>
                </button>

                <Link
                  href="/"
                  className="h-11 px-4 rounded-[14px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] inline-flex items-center gap-2 ty-body font-semibold transition-colors"
                >
                  <Compass className="w-5 h-5 text-[var(--color-promo)]" />
                  <span>
                    {language === "th" ? "สำรวจที่พักเพิ่ม" : "Explore Stays"}
                  </span>
                </Link>
              </div>
            </div>

            {/* Inline Create Trip Board Form */}
            {isCreatingBoard && (
              <form
                onSubmit={handleCreateBoard}
                className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder={
                    language === "th"
                      ? "ตั้งชื่อบอร์ด เช่น ทริปหน้าหนาวน่าน, พูลวิลล่าภูเก็ตกับเพื่อน..."
                      : "Board name e.g. Winter Mountain Trip, Phuket Pool Villas..."
                  }
                  autoFocus
                  className="flex-1 h-11 px-4 rounded-[14px] bg-[var(--color-background-card)] border border-[var(--color-border)] ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-[14px] bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-[var(--color-on-promo)] ty-body font-semibold cursor-pointer"
                  >
                    {language === "th" ? "สร้างบอร์ด" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingBoard(false)}
                    className="h-11 px-3.5 rounded-[14px] bg-[var(--color-background-card)] border border-[var(--color-border)] ty-body font-semibold cursor-pointer"
                  >
                    {language === "th" ? "ยกเลิก" : "Cancel"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* =================================================================
              2. BOARD COLLECTIONS & PROVINCE FILTER TABS
          ================================================================== */}
          {(savedPins.length > 0 || userBoards.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setActiveBoardFilter("all")}
                  className={`h-10 px-4 rounded-[12px] ty-body font-semibold whitespace-nowrap inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    activeBoardFilter === "all"
                      ? "bg-[var(--color-text-primary)] text-[var(--color-background-card)]"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>
                    {language === "th"
                      ? `ทั้งหมดที่บันทึกไว้ (${savedPins.length})`
                      : `All Saved (${savedPins.length})`}
                  </span>
                </button>

                {/* User Custom Boards */}
                {userBoards.map((board) => {
                  const key = `board:${board.id}`;
                  const isActive = activeBoardFilter === key;
                  const validCount = board.pinIds.filter(
                    (id) => savedPinsMap[id]
                  ).length;
                  return (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => setActiveBoardFilter(key)}
                      className={`h-10 px-4 rounded-[12px] ty-body font-semibold whitespace-nowrap inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--color-promo)] text-[var(--color-on-promo)]"
                          : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      <FolderHeart className="w-4 h-4" />
                      <span>
                        {board.name} ({validCount})
                      </span>
                    </button>
                  );
                })}

                {/* Auto Province Boards */}
                {savedProvinceGroups.map((group) => {
                  const key = `prov:${group.provinceId}`;
                  const isActive = activeBoardFilter === key;
                  return (
                    <button
                      key={group.provinceId}
                      type="button"
                      onClick={() => setActiveBoardFilter(key)}
                      className={`h-10 px-3.5 rounded-[12px] ty-body font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--color-text-primary)] text-[var(--color-background-card)]"
                          : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>
                        {group.label} ({group.pins.length})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Custom Board Toolbar */}
              {activeUserBoard && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-[16px] bg-[var(--color-background-muted)]/60 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderHeart className="w-5 h-5 text-[var(--color-promo)] shrink-0" />
                    <div className="min-w-0">
                      <p className="ty-body font-bold truncate">
                        {activeUserBoard.name}
                      </p>
                      <p className="ty-caption">
                        {language === "th"
                          ? "กดปุ่ม “+ จัดเข้าบอร์ด” บนการ์ดที่บันทึกไว้เพื่อเพิ่มเข้าบอร์ดทริปนี้"
                          : "Use '+ Add to Board' on any saved card to organize into this trip board."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBoard(activeUserBoard.id)}
                    className="h-9 px-3 rounded-[10px] hover:bg-[var(--color-background-subtle)] text-[var(--color-error)] inline-flex items-center gap-1.5 ty-caption font-semibold cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {language === "th" ? "ลบบอร์ดนี้" : "Delete Board"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              3. SAVED PINS MASONRY GRID OR EMPTY STATE WITH STARTER PICKS
          ================================================================== */}
          {savedPins.length === 0 ? (
            <div className="space-y-8">
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-muted)]/35 py-14 px-5 text-center space-y-3">
                <div className="h-14 w-14 rounded-[18px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center mx-auto">
                  <Bookmark className="w-7 h-7" />
                </div>
                <h2 className="ty-title">
                  {language === "th"
                    ? "ยังไม่มีที่พักที่บันทึกไว้ในบอร์ดของคุณ"
                    : "Your Saved Board is Empty"}
                </h2>
                <p className="ty-body-muted max-w-md mx-auto">
                  {language === "th"
                    ? "กดปุ่ม “บันทึก” สีแดงบนรูปภาพหรือคลิปบรรยากาศของที่พักที่ชอบ การ์ดทั้งหมดจะถูกเก็บไว้ในหน้านี้ให้คุณกลับมาเปรียบเทียบและจองทีหลังได้ตลอดเวลา"
                    : "Click the red 'Save' button on any hotel photo or video to collect your favorite stays here for trip planning."}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="h-11 px-5 rounded-[14px] bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-[var(--color-on-promo)] inline-flex items-center gap-2 ty-body font-semibold"
                  >
                    <Compass className="w-5 h-5" />
                    <span>
                      {language === "th"
                        ? "ไปเลือกดูที่พักหน้าแรก"
                        : "Discover Stays on Home"}
                    </span>
                  </Link>
                </div>
              </div>

              {/* Starter Curated Recommendations so User Can Try Saving Immediately */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="ty-subtitle font-bold">
                    {language === "th"
                      ? "ที่พักยอดนิยมทั่วไทย — ลองกด “บันทึก” เก็บเข้าบอร์ดของคุณ"
                      : "Popular Thailand Stays — Click 'Save' to Start Your Board"}
                  </h3>
                </div>
                <MasonryGrid
                  items={allPins.slice(0, 10)}
                  columnBreakpoints={[2, 3, 4, 5, 5]}
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
              </div>
            </div>
          ) : displayedSavedPins.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-muted)]/35 py-12 px-4 text-center space-y-3">
              <p className="ty-title">
                {language === "th"
                  ? "ยังไม่มีการ์ดในบอร์ดทริปนี้"
                  : "No cards in this trip board yet"}
              </p>
              <button
                type="button"
                onClick={() => setActiveBoardFilter("all")}
                className="h-10 px-4 rounded-[12px] bg-[var(--color-text-primary)] text-[var(--color-background-card)] ty-body font-semibold cursor-pointer"
              >
                {language === "th"
                  ? "ดูการ์ดที่บันทึกไว้ทั้งหมดเพื่อเลือกเพิ่มเข้าบอร์ด"
                  : "View All Saved Cards"}
              </button>
            </div>
          ) : (
            <MasonryGrid
              items={displayedSavedPins}
              columnBreakpoints={[2, 3, 4, 5, 5]}
              gapClass="gap-4"
              renderItem={(pin) => (
                <div className="relative">
                  <PinterestPinCard
                    pin={pin}
                    language={language}
                    isSaved={Boolean(savedPinsMap[pin.id])}
                    canEdit={canShowEditControls}
                    onSelectPin={handleSelectPin}
                    onToggleSave={handleToggleSavePin}
                    onSharePin={handleSharePin}
                  />

                  {/* Assign to Custom Trip Board Trigger */}
                  {userBoards.length > 0 && (
                    <div className="-mt-2 mb-4 flex items-center justify-between gap-2 px-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAssigningPinId(
                            assigningPinId === pin.id ? null : pin.id
                          )
                        }
                        className="h-7 px-2.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center gap-1 ty-caption font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {language === "th" ? "จัดเข้าบอร์ด" : "Add to Board"}
                        </span>
                      </button>

                      <span className="ty-caption truncate">
                        {pin.provinceLabel}
                      </span>
                    </div>
                  )}

                  {assigningPinId === pin.id && userBoards.length > 0 && (
                    <div className="mb-4 p-2.5 rounded-[14px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-md space-y-1">
                      <div className="flex items-center justify-between px-1 pb-1 border-b border-[var(--color-border)]">
                        <span className="ty-caption font-bold text-[var(--color-text-primary)]">
                          {language === "th"
                            ? "เลือกบอร์ดทริป"
                            : "Select Trip Board"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAssigningPinId(null)}
                          className="h-6 w-6 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {userBoards.map((board) => {
                        const inBoard = board.pinIds.includes(pin.id);
                        return (
                          <button
                            key={board.id}
                            type="button"
                            onClick={() =>
                              handleTogglePinInBoard(board.id, pin.id)
                            }
                            className="w-full h-9 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-caption font-semibold text-[var(--color-text-primary)] cursor-pointer"
                          >
                            <span className="truncate">{board.name}</span>
                            {inBoard && (
                              <Check className="w-4 h-4 text-[var(--color-promo)] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            />
          )}
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

