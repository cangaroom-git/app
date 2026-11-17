"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  FolderPlus,
  LogIn,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { STAY_STYLE_TABS } from "@/data/thailandProvinces";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import type {
  PinCommentDto,
  PinFeedItemDto,
  SavedBoardDto,
} from "@/types/cangaroom";

export default function SavedBoardPage() {
  const {
    lang: language,
    user: currentUser,
    refreshMe,
    globalSearchQuery,
    selectedProvinceId,
  } = useHotelApp();

  const [authenticated, setAuthenticated] = useState<boolean>(true);
  const [boards, setBoards] = useState<SavedBoardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeBoardId, setActiveBoardId] = useState<string>("all");
  const [activeStyleTab, setActiveStyleTab] = useState<string>("all");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/boards", { cache: "no-store" });
      const data = (await res.json()) as {
        authenticated?: boolean;
        boards?: SavedBoardDto[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "ไม่สามารถโหลดบอร์ดได้");
      setAuthenticated(Boolean(data.authenticated));
      setBoards(data.boards || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "โหลดบอร์ดที่บันทึกไม่สำเร็จ"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [currentUser?.id, loadBoards]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoardName.trim() }),
    });
    if (res.ok) {
      setNewBoardName("");
      setIsCreatingBoard(false);
      await loadBoards();
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    await fetch(`/api/boards/${encodeURIComponent(boardId)}`, {
      method: "DELETE",
    });
    if (activeBoardId === boardId) setActiveBoardId("all");
    await Promise.all([loadBoards(), refreshMe()]);
  };

  const handleRemovePinFromBoard = async (pinId: string, boardId?: string) => {
    await fetch("/api/boards/toggle-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinId, boardId }),
    });
    if (selectedPinId === pinId) {
      setSelectedPinId(null);
      setPinDetail(null);
    }
    await Promise.all([loadBoards(), refreshMe()]);
  };

  const allSavedEntries = useMemo(() => {
    const raw =
      activeBoardId === "all"
        ? boards.flatMap((b) => b.items)
        : boards.find((b) => b.id === activeBoardId)?.items ?? [];

    const q = globalSearchQuery.trim().toLowerCase();
    return raw.filter((entry) => {
      if (
        activeStyleTab !== "all" &&
        !entry.pin.stayStyles.includes(activeStyleTab)
      ) {
        return false;
      }
      if (selectedProvinceId && entry.pin.provinceId !== selectedProvinceId) {
        return false;
      }
      if (q) {
        return (
          entry.pin.titleTh.toLowerCase().includes(q) ||
          entry.pin.hotelNameTh.toLowerCase().includes(q) ||
          entry.pin.provinceNameTh.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [boards, activeBoardId, activeStyleTab, selectedProvinceId, globalSearchQuery]);

  const alertItems = useMemo(
    () =>
      allSavedEntries.filter(
        (entry) => entry.priceDropThb > 0 || entry.hasActivePromo
      ),
    [allSavedEntries]
  );

  const savedPinIdSet = useMemo(
    () => new Set(allSavedEntries.map((e) => e.pin.id)),
    [allSavedEntries]
  );

  const activeBoardPin = useMemo(
    () => (selectedPinId && pinDetail ? pinDetail.pin : null),
    [selectedPinId, pinDetail]
  );

  const gridBoardEntries = useMemo(
    () =>
      activeBoardPin
        ? allSavedEntries.filter((e) => e.pin.id !== activeBoardPin.id)
        : allSavedEntries,
    [allSavedEntries, activeBoardPin]
  );

  const loadPinDetail = useCallback(async (pinId: string) => {
    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      setPinDetail(await res.json());
    }
  }, []);

  if (!isLoading && !authenticated) {
    return (
      <div className="cgr-page-form py-8">
        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-[14px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <h1 className="ty-display">
            {language === "th"
              ? "บอร์ดที่พักที่บันทึกไว้ & ติดตามราคา"
              : "Saved Stay Boards & Price Watch"}
          </h1>
          <p className="ty-body text-[var(--color-text-secondary)]">
            {language === "th"
              ? "เข้าสู่ระบบเพื่อบันทึกที่พักที่ชอบแยกตามทริป และให้ระบบช่วยแจ้งเตือนทันทีเมื่อที่พักลดราคาหรือปล่อยคูปองส่วนลดใหม่"
              : "Sign in to organize your favorite Thailand stays into boards and track price drops & new hotel coupons across devices."}
          </p>
          <Link
            href="/login?callbackUrl=/board"
            className="btn-round-solid inline-flex"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {language === "th" ? "เข้าสู่ระบบด้วย Google" : "Sign in"}
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-page-fluid space-y-5">
      {/* Header & Board Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ty-display">
            {language === "th"
              ? "บอร์ดที่พักที่บันทึกไว้"
              : "My Saved Boards"}
          </h1>
          <p className="ty-caption mt-0.5">
            {language === "th"
              ? "ระบบติดตามราคาที่ลดลงและคูปองส่วนลดใหม่ของที่พักที่คุณปักหมุดไว้โดยอัตโนมัติ"
              : "Live price-drop & new coupon tracker for all your saved stays."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingBoard((v) => !v)}
          className="h-10 px-4 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-body font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-[var(--color-text-primary)]" />
          <span>{language === "th" ? "สร้างบอร์ดใหม่" : "New Board"}</span>
        </button>
      </div>

      {isCreatingBoard && (
        <form
          onSubmit={handleCreateBoard}
          className="rounded-[14px] bg-[var(--color-background-muted)] p-3 flex items-center gap-2 max-w-md"
        >
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="เช่น ทริปน่านหน้าหนาว, พูลวิลล่าปีใหม่..."
            className="flex-1 h-10 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-border)] px-3.5 ty-body focus:outline-none"
          />
          <button type="submit" className="btn-round-solid">
            <Plus className="w-4 h-4" />
            <span>สร้าง</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingBoard(false)}
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Board Collection Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveBoardId("all")}
          className={`h-9 px-4 rounded-[10px] ty-caption font-semibold cursor-pointer transition-colors ${
            activeBoardId === "all"
              ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
              : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
          }`}
        >
          ทั้งหมด ({boards.reduce((sum, b) => sum + b.pinCount, 0)})
        </button>

        {boards.map((board) => {
          const isSel = activeBoardId === board.id;
          return (
            <div
              key={board.id}
              className={`h-9 pl-3.5 pr-1.5 rounded-[10px] inline-flex items-center gap-2 ty-caption font-semibold transition-colors ${
                isSel
                  ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveBoardId(board.id)}
                className="cursor-pointer"
              >
                {board.name} ({board.pinCount})
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBoard(board.id)}
                aria-label="Delete board"
                className="h-6 w-6 rounded-[6px] hover:bg-black/15 dark:hover:bg-white/15 inline-flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Price Drop & New Coupon Watch Strip */}
      {alertItems.length > 0 && (
        <section className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex items-center gap-2 ty-body font-bold text-[var(--color-text-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <span>
              {language === "th"
                ? `อัปเดตราคา & โปรโมชั่นของที่พักในบอร์ดคุณ (${alertItems.length} รายการ)`
                : `Live Price & Promo Alerts (${alertItems.length})`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {alertItems.map((entry) => (
              <Link
                key={entry.boardPinId}
                href={`/${entry.pin.hotelSlug}`}
                className="rounded-[12px] bg-[var(--color-background-muted)]/60 border border-[var(--color-border)] p-3 flex items-center gap-3 hover:bg-[var(--color-background-muted)] transition-colors"
              >
                <img
                  src={entry.pin.coverImageUrl}
                  alt={entry.pin.hotelNameTh}
                  className="h-12 w-12 rounded-[10px] object-cover shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="ty-body font-bold truncate">
                    {entry.pin.hotelNameTh}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.priceDropThb > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-0.5 text-[11px] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ลดราคาลง ฿{entry.priceDropThb.toLocaleString()}
                      </span>
                    )}
                    {entry.hasActivePromo && entry.activePromoLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-0.5 text-[11px] font-semibold">
                        <Tag className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        {entry.activePromoLabel}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Style Tabs */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
        {STAY_STYLE_TABS.map((tab) => {
          const isActive = activeStyleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStyleTab(tab.id)}
              className={`relative shrink-0 py-3 -mb-px border-b-2 ty-body cursor-pointer whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-[16px] bg-[var(--color-error-muted)] p-4 ty-body text-[var(--color-error)]">
          {errorMsg}
        </div>
      )}

      {/* In-Place Animated Masonry Grid (Zero Scroll Jump to Top) */}
      {isLoading && !activeBoardPin ? (
        <div className="flex flex-wrap justify-center gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="w-[calc(50%-8px)] sm:w-[236px] aspect-[3/4] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : allSavedEntries.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
          <h2 className="ty-title">
            {language === "th"
              ? "ยังไม่มีที่พักที่บันทึกไว้ในบอร์ดนี้"
              : "No stays saved in this board yet"}
          </h2>
          <p className="ty-body text-[var(--color-text-secondary)]">
            {language === "th"
              ? "ลองเลือกดูที่พักสวยๆ จากหน้าแรกแล้วกดปุ่ม บันทึก เพื่อเก็บเข้าบอร์ดและติดตามโปรโมชั่น"
              : "Browse the Home feed and click Save on any Pin to collect stays here."}
          </p>
          <Link href="/" className="btn-promo-solid inline-flex">
            {language === "th" ? "สำรวจที่พักทั่วไทย" : "Explore Thailand Stays"}
          </Link>
        </div>
      ) : (
        <section>
          <MasonryGrid
            items={allSavedEntries.map((e) => ({
              ...e.pin,
              aspectClass: e.pin.aspectRatio,
              boardEntry: e,
            }))}
            columnWidth={236}
            gutter={16}
            expandedItemId={activeBoardPin?.id ?? null}
            renderExpandedStage={
              activeBoardPin
                ? () => (
                    <PinterestPinDetail
                      pin={activeBoardPin}
                      language={language}
                      currentUser={currentUser}
                      comments={pinDetail?.comments ?? []}
                      savedPinIds={savedPinIdSet}
                      onClose={() => {
                        setSelectedPinId(null);
                        setPinDetail(null);
                      }}
                      onSelectPin={(next) => {
                        setSelectedPinId(next.id);
                        loadPinDetail(next.id);
                      }}
                      onToggleLike={async (pinId) => {
                        await fetch(
                          `/api/pins/${encodeURIComponent(pinId)}/like`,
                          { method: "POST" }
                        );
                        await loadPinDetail(pinId);
                      }}
                      onToggleSave={(pinId) =>
                        handleRemovePinFromBoard(
                          pinId,
                          activeBoardId === "all" ? undefined : activeBoardId
                        )
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
                          `/api/pins/${encodeURIComponent(
                            activeBoardPin.id
                          )}/comments`,
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
                  )
                : undefined
            }
            renderItem={(item) => (
              <div className="space-y-1">
                <PinterestPinCard
                  pin={item}
                  language={language}
                  isSaved={true}
                  onSelectPin={(pin) => {
                    setSelectedPinId(pin.id);
                    loadPinDetail(pin.id);
                  }}
                  onToggleSave={(pinId) =>
                    handleRemovePinFromBoard(pinId, item.boardEntry.boardId)
                  }
                  onSharePin={() => {}}
                />
                  {(item.boardEntry.priceDropThb > 0 ||
                    item.boardEntry.hasActivePromo) && (
                    <div className="px-1 flex flex-wrap gap-1">
                      {item.boardEntry.priceDropThb > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ลด ฿{item.boardEntry.priceDropThb.toLocaleString()}
                        </span>
                      )}
                      {item.boardEntry.hasActivePromo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10px] font-semibold">
                          มีคูปองใหม่
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            />
          </section>
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
