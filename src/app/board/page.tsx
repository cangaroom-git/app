"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  FolderPlus,
  LogIn,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  clearLastClickedPinOrigin,
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import {
  BoardFolderThumb,
  DeleteBoardConfirmModal,
} from "@/components/board/BoardActionModals";
import type {
  PinCommentDto,
  PinFeedItemDto,
  SavedBoardDto,
} from "@/types/cangaroom";

export default function SavedBoardPage() {
  const {
    lang: language,
    user: currentUser,
    isCheckingSession,
    globalSearchQuery,
    selectedProvinceId,
    openAuthModal,
    savedBoards,
    savedPinIds,
    isLoadingBoards,
    refreshSavedBoards,
    openCreateBoardModal,
    deleteSavedBoard,
    togglePinLikeInstant,
  } = useHotelApp();

  const isTh = language === "th";

  const [openBoardId, setOpenBoardId] = useState<string | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<SavedBoardDto | null>(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [pinHistoryStack, setPinHistoryStack] = useState<
    Array<{ pin: PinFeedItemDto; scrollY: number }>
  >([]);
  const [detailRestoreScrollY, setDetailRestoreScrollY] = useState<
    number | null
  >(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null>(null);
  const latestPinReqRef = useRef<string | null>(null);

  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      void refreshSavedBoards();
    }
  }, [currentUser?.id, refreshSavedBoards]);

  // If the currently opened folder was deleted, return to folder grid
  useEffect(() => {
    if (openBoardId && !savedBoards.some((b) => b.id === openBoardId)) {
      setOpenBoardId(null);
      setSelectedPinId(null);
      setSelectedPinSnapshot(null);
      setPinDetail(null);
    }
  }, [openBoardId, savedBoards]);

  const activeBoard = useMemo(
    () => savedBoards.find((b) => b.id === openBoardId) ?? null,
    [openBoardId, savedBoards]
  );

  const visibleFolderEntries = useMemo(() => {
    if (!activeBoard) return [];
    const q = globalSearchQuery.trim().toLowerCase();
    return activeBoard.items.filter((entry) => {
      if (selectedProvinceId && entry.pin.provinceId !== selectedProvinceId) {
        return false;
      }
      if (q) {
        const hay =
          `${entry.pin.titleTh} ${entry.pin.titleEn} ${entry.pin.hotelNameTh} ${entry.pin.provinceNameTh}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeBoard, globalSearchQuery, selectedProvinceId]);

  const alertItems = useMemo(
    () =>
      visibleFolderEntries.filter(
        (entry) => entry.priceDropThb > 0 || entry.hasActivePromo
      ),
    [visibleFolderEntries]
  );

  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      pin: PinFeedItemDto;
      comments: PinCommentDto[];
      relatedPins: PinFeedItemDto[];
    };
    if (latestPinReqRef.current === pinId) {
      setPinDetail(data);
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      void loadPinDetail(selectedPinId);
    }
  }, [selectedPinId, loadPinDetail]);

  const activeBoardPin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return (
      visibleFolderEntries.find((e) => e.pin.id === selectedPinId)?.pin ?? null
    );
  }, [pinDetail, selectedPinId, selectedPinSnapshot, visibleFolderEntries]);

  const activeBoardComments = useMemo(
    () => (pinDetail?.pin.id === selectedPinId ? pinDetail.comments : []),
    [pinDetail, selectedPinId]
  );

  const gridBoardEntries = useMemo(() => {
    if (!activeBoardPin) return visibleFolderEntries;
    return visibleFolderEntries.filter((e) => e.pin.id !== activeBoardPin.id);
  }, [activeBoardPin, visibleFolderEntries]);

  const activePinIdxInFolder = useMemo(() => {
    if (!activeBoardPin) return -1;
    return visibleFolderEntries.findIndex(
      (e) => e.pin.id === activeBoardPin.id
    );
  }, [activeBoardPin, visibleFolderEntries]);

  const prevBoardPinPreview =
    activePinIdxInFolder > 0
      ? visibleFolderEntries[activePinIdxInFolder - 1]?.pin ?? null
      : null;
  const nextBoardPinPreview =
    activePinIdxInFolder >= 0 &&
    activePinIdxInFolder < visibleFolderEntries.length - 1
      ? visibleFolderEntries[activePinIdxInFolder + 1]?.pin ?? null
      : null;

  const handleSelectBoardPin = (pin: PinFeedItemDto, pushHistory = false) => {
    if (pushHistory && activeBoardPin && activeBoardPin.id !== pin.id) {
      setPinHistoryStack((prev) => [
        ...prev,
        {
          pin: activeBoardPin,
          scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        },
      ]);
    } else if (!pushHistory) {
      setPinHistoryStack([]);
    }
    setDetailRestoreScrollY(null);
    setSelectedPinSnapshot(pin);
    setSelectedPinId(pin.id);
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const handleCloseBoardPin = () => {
    clearLastClickedPinOrigin();
    setPinHistoryStack([]);
    setDetailRestoreScrollY(null);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
  };

  const handleStepBackBoardPin = () => {
    if (pinHistoryStack.length === 0) {
      handleCloseBoardPin();
      return;
    }
    const prev = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((s) => s.slice(0, -1));
    setDetailRestoreScrollY(prev.scrollY);
    setSelectedPinSnapshot(prev.pin);
    setSelectedPinId(prev.pin.id);
  };

  const handleNavigateBoardPin = (direction: "prev" | "next") => {
    const target =
      direction === "next" ? nextBoardPinPreview : prevBoardPinPreview;
    if (!target) return;
    setPinHistoryStack([]);
    setDetailRestoreScrollY(null);
    setSelectedPinSnapshot(target);
    setSelectedPinId(target.id);
  };

  const handleRemovePinFromCurrentBoard = async (
    pinId: string,
    boardId?: string
  ) => {
    await fetch("/api/boards/toggle-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pinId,
        boardId: boardId ?? openBoardId ?? null,
        action: "unsave",
      }),
    });
    if (selectedPinId === pinId) {
      handleCloseBoardPin();
    }
    await refreshSavedBoards();
  };

  const handleToggleLikeOnBoard = (pinId: string) => {
    const target =
      (activeBoardPin?.id === pinId ? activeBoardPin : null) ??
      visibleFolderEntries.find((e) => e.pin.id === pinId)?.pin ??
      savedBoards
        .flatMap((b) => b.items)
        .find((item) => item.pin.id === pinId)?.pin;
    if (!target) return;
    togglePinLikeInstant({
      id: target.id,
      isLikedByMe: target.isLikedByMe,
      likesCount: target.likesCount,
    });
  };

  const handleConfirmDeleteBoard = async () => {
    if (!boardToDelete || isDeletingBoard) return;
    setIsDeletingBoard(true);
    try {
      await deleteSavedBoard(boardToDelete.id);
      if (openBoardId === boardToDelete.id) {
        setOpenBoardId(null);
      }
      setBoardToDelete(null);
    } finally {
      setIsDeletingBoard(false);
    }
  };

  // =========================================================================
  // LOGGED-OUT VIEW: Open In-Place Auth Modal instead of jumping to /login
  // =========================================================================
  if (!isCheckingSession && !currentUser) {
    return (
      <div className="cgr-page-standard py-10">
        <div className="max-w-[460px] mx-auto rounded-[20px] bg-[var(--color-background-muted)] p-8 text-center space-y-4">
          <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] inline-flex items-center justify-center mx-auto">
            <Bookmark className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[21px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "บอร์ดที่พักของฉัน" : "Boards"}
            </h1>
            <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
              {isTh
                ? "เข้าสู่ระบบเพื่อปักหมุดที่พักสวยๆ จัดแยกเป็นโฟลเดอร์ทริป และติดตามคูปองส่วนลด"
                : "Log in to pin favorite stays into trip folders and track price drops & deals."}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openAuthModal({
                reasonTh: "เข้าสู่ระบบเพื่อดูและจัดการบอร์ดที่พักของคุณ",
                reasonEn: "Log in to view and manage your saved boards",
              })
            }
            className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>{isTh ? "เข้าสู่ระบบ" : "Log in"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-page-standard pb-14 space-y-6 sm:space-y-8">
      {/* =====================================================================
          VIEW 1: AIRBNB-STYLE FOLDER GRID (Default Top-Level /board View)
      ====================================================================== */}
      {!activeBoard && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {isTh ? "บอร์ดของฉัน" : "Boards"}
            </h1>

            <button
              type="button"
              onClick={openCreateBoardModal}
              className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isTh ? "สร้างบอร์ดใหม่" : "Create board"}</span>
            </button>
          </div>

          {isLoadingBoards && savedBoards.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <div className="w-full aspect-square rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
                  <div className="h-4 w-28 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
                  <div className="h-3.5 w-16 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
                </div>
              ))}
            </div>
          ) : savedBoards.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 sm:p-12 text-center space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ยังไม่มีบอร์ดที่พัก" : "Create your first board"}
                </h2>
                <p className="text-[14.5px] text-[var(--color-text-secondary)] max-w-md mx-auto">
                  {isTh
                    ? "กดไอคอนปักหมุดบนการ์ดที่พักที่ถูกใจ เพื่อเก็บแยกตามทริปหรือจังหวัดที่อยากไป"
                    : "Tap the pin icon on any stay card while browsing to collect stays into trip folders."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={openCreateBoardModal}
                  className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>{isTh ? "สร้างบอร์ดใหม่" : "Create board"}</span>
                </button>
                <Link
                  href="/"
                  className="h-11 px-5 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
                >
                  {isTh ? "สำรวจที่พักทั่วไทย" : "Explore stays"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7">
              {savedBoards.map((board) => {
                const covers = board.items
                  .slice(0, 4)
                  .map((entry) => entry.pin.coverImageUrl);
                const promoAlertCount = board.items.filter(
                  (e) => e.priceDropThb > 0 || e.hasActivePromo
                ).length;

                return (
                  <div
                    key={board.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenBoardId(board.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenBoardId(board.id);
                      }
                    }}
                    className="group relative text-left cursor-pointer focus:outline-none"
                  >
                    {/* Folder Square Cover (1 full image OR Airbnb 2x2 Collage) */}
                    <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-[var(--color-background-muted)] group-hover:brightness-95 transition">
                      <BoardFolderThumb
                        coverUrls={covers}
                        sizeClass="w-full h-full"
                      />

                      {/* Hover Delete (X) Button — Top-Left just like Airbnb Image 2! */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoardToDelete(board);
                        }}
                        aria-label={
                          isTh ? `ลบบอร์ด ${board.name}` : `Delete ${board.name}`
                        }
                        title={isTh ? "ลบบอร์ดนี้" : "Delete board"}
                        className="absolute top-3 left-3 z-10 h-8 w-8 rounded-[10px] bg-white/92 dark:bg-[#222222]/92 hover:bg-white dark:hover:bg-[#222222] text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] inline-flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Clean 2-Line Folder Meta Below Cover */}
                    <div className="pt-2.5 px-0.5 space-y-0.5">
                      <h2 className="text-[15.5px] font-semibold text-[var(--color-text-primary)] truncate">
                        {board.name}
                      </h2>
                      <p className="text-[13.5px] text-[var(--color-text-secondary)] flex items-center gap-1.5 truncate">
                        <span>
                          {isTh
                            ? `บันทึกแล้ว ${board.pinCount} แห่ง`
                            : `${board.pinCount} saved`}
                        </span>
                        {promoAlertCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--color-text-primary)] font-medium">
                              {isTh
                                ? `${promoAlertCount} โปรโมชั่น`
                                : `${promoAlertCount} deals`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          VIEW 2: INSIDE AN OPENED BOARD FOLDER
      ====================================================================== */}
      {activeBoard && (
        <div className="space-y-6">
          {/* Folder Header (Hidden when Pin Close-Up is open on mobile) */}
          <div
            className={
              activeBoardPin
                ? "hidden lg:flex items-center justify-between gap-4"
                : "flex items-center justify-between gap-4"
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  handleCloseBoardPin();
                  setOpenBoardId(null);
                }}
                aria-label={isTh ? "กลับไปหน้ารวมบอร์ด" : "Back to boards"}
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.016em] text-[var(--color-text-primary)] truncate">
                  {activeBoard.name}
                </h1>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? `บันทึกแล้ว ${visibleFolderEntries.length} แห่ง`
                    : `${visibleFolderEntries.length} saved`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBoardToDelete(activeBoard)}
              className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors shrink-0"
            >
              {isTh ? "ลบบอร์ด" : "Delete"}
            </button>
          </div>

          {/* Price Drop & New Coupon Watch Strip (Minimal Borderless Surface) */}
          {!activeBoardPin && alertItems.length > 0 && (
            <section className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                  {isTh
                    ? `อัปเดตราคา & คูปองใหม่ในบอร์ดนี้ (${alertItems.length})`
                    : `Live price drops & deals (${alertItems.length})`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {alertItems.map((entry) => (
                  <Link
                    key={entry.boardPinId}
                    href={`/${entry.pin.hotelSlug}`}
                    className="rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)]/50 p-3 flex items-center gap-3 transition-colors"
                  >
                    <img
                      src={entry.pin.coverImageUrl}
                      alt={entry.pin.hotelNameTh}
                      className="h-11 w-11 rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">
                        {isTh ? entry.pin.hotelNameTh : entry.pin.hotelNameEn}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--color-text-secondary)]">
                        {entry.priceDropThb > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                            {isTh
                              ? `ลด ฿${entry.priceDropThb.toLocaleString()}`
                              : `-฿${entry.priceDropThb.toLocaleString()}`}
                          </span>
                        )}
                        {entry.hasActivePromo && entry.activePromoLabel && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>{entry.activePromoLabel}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Pin Close-Up Stage */}
          {activeBoardPin && (
            <PinterestPinDetail
              pin={activeBoardPin}
              language={language}
              currentUser={currentUser}
              comments={activeBoardComments}
              savedPinIds={savedPinIds}
              relatedPins={gridBoardEntries.map((e) => e.pin)}
              prevPinPreview={prevBoardPinPreview}
              nextPinPreview={nextBoardPinPreview}
              canStepBack={pinHistoryStack.length > 0}
              restoreScrollY={detailRestoreScrollY}
              onBack={handleStepBackBoardPin}
              onClose={handleCloseBoardPin}
              onSelectPin={(next) => handleSelectBoardPin(next, true)}
              onNavigatePin={handleNavigateBoardPin}
              onToggleLike={handleToggleLikeOnBoard}
              onToggleSave={(pinId) =>
                handleRemovePinFromCurrentBoard(pinId, activeBoard.id)
              }
              onSharePin={() => {}}
              onExpandMedia={(urls, idx) =>
                setFullscreenMedia({
                  slides: urls.map((u) => ({ type: "image", url: u })),
                  index: idx,
                })
              }
              onAddComment={async (text, parentId) => {
                await fetch(
                  `/api/pins/${encodeURIComponent(activeBoardPin.id)}/comments`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body: text, parentId }),
                  }
                );
                await loadPinDetail(activeBoardPin.id);
              }}
              onDeleteComment={async (commentId) => {
                await fetch(
                  `/api/comments/${encodeURIComponent(commentId)}`,
                  { method: "DELETE" }
                );
                await loadPinDetail(activeBoardPin.id);
              }}
            />
          )}

          {/* Desktop Related Stays in This Board */}
          {activeBoardPin && gridBoardEntries.length > 0 && (
            <section className="hidden lg:block pt-8 lg:pt-10 border-t border-[var(--color-border)] space-y-4">
              <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                {isTh ? "ที่พักอื่นในบอร์ดนี้" : "More in this board"}
              </h2>
              <MasonryGrid
                key={`board-related-${activeBoardPin.id}`}
                items={gridBoardEntries.map((e) => ({
                  ...e.pin,
                  aspectClass: e.pin.aspectRatio,
                  boardEntry: e,
                }))}
                columnWidth={184}
                maxColumnWidth={235}
                gutter={14}
                fitContainer={true}
                renderItem={(item, cardIdx) => (
                  <PinterestPinCard
                    pin={item}
                    language={language}
                    priority={cardIdx < 6}
                    isSaved={true}
                    onSelectPin={(p) => handleSelectBoardPin(p, true)}
                    onToggleSave={(pinId) =>
                      handleRemovePinFromCurrentBoard(pinId, activeBoard.id)
                    }
                    onToggleLike={handleToggleLikeOnBoard}
                    onSharePin={() => {}}
                  />
                )}
              />
            </section>
          )}

          {/* Folder Masonry Grid */}
          {!activeBoardPin &&
            (visibleFolderEntries.length === 0 ? (
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                  {isTh
                    ? "ยังไม่มีที่พักในบอร์ดนี้"
                    : "No stays saved in this board yet"}
                </p>
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "กลับไปหน้าสำรวจแล้วกดปักหมุดบนการ์ดที่พักที่ชอบได้เลย"
                    : "Head back to explore and tap the pin button on stays you like."}
                </p>
                <Link
                  href="/"
                  className="h-10 px-5 rounded-[12px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center justify-center"
                >
                  {isTh ? "สำรวจที่พักทั่วไทย" : "Explore stays"}
                </Link>
              </div>
            ) : (
              <MasonryGrid
                key={`folder-grid-${activeBoard.id}`}
                items={visibleFolderEntries.map((e) => ({
                  ...e.pin,
                  aspectClass: e.pin.aspectRatio,
                  boardEntry: e,
                }))}
                columnWidth={184}
                maxColumnWidth={235}
                gutter={14}
                fitContainer={true}
                renderItem={(item, cardIdx) => (
                  <PinterestPinCard
                    pin={item}
                    language={language}
                    priority={cardIdx < 8}
                    isSaved={true}
                    onSelectPin={(p) => handleSelectBoardPin(p, false)}
                    onToggleSave={(pinId) =>
                      handleRemovePinFromCurrentBoard(pinId, activeBoard.id)
                    }
                    onToggleLike={handleToggleLikeOnBoard}
                    onSharePin={() => {}}
                  />
                )}
              />
            ))}
        </div>
      )}

      {/* Airbnb-Style Delete Board Confirmation Modal */}
      <DeleteBoardConfirmModal
        board={boardToDelete}
        language={language}
        isDeleting={isDeletingBoard}
        onClose={() => setBoardToDelete(null)}
        onConfirmDelete={handleConfirmDeleteBoard}
      />

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
