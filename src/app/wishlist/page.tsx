"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Heart, LayoutGrid, Layers, LogIn } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import { PlaceCategoryIcon } from "@/components/shared/PlaceCategoryCrest";
import { TripStackedCardFolder } from "@/components/trip/TripStackedCardFolder";
import { PLACE_CATEGORIES } from "@/lib/placeCategories";
import type {
  PinFeedItemDto,
  PlaceCategoryDto,
  SavedBoardDto,
} from "@/types/cangaroom";

const DeleteBoardConfirmModal = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.DeleteBoardConfirmModal
    ),
  { ssr: false }
);

type WishlistTab = "categories" | "boards";
type CategoryFilter = "ALL" | PlaceCategoryDto;

export default function WishlistPage() {
  const router = useRouter();
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
    openCreateBoardModal,
    deleteSavedBoard,
    triggerPinToBoard,
    navigateToPlaceWithFlip,
  } = useHotelApp();

  const isTh = language === "th";

  const [activeTab, setActiveTab] = useState<WishlistTab>("categories");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("ALL");
  const [boardToDelete, setBoardToDelete] = useState<SavedBoardDto | null>(null);
  const [hasMountedDeleteModal, setHasMountedDeleteModal] = useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  useEffect(() => {
    if (boardToDelete) setHasMountedDeleteModal(true);
  }, [boardToDelete]);

  // Deduplicate all saved places across user's boards for Auto-Category Wishlist view
  const allSavedPins = useMemo<PinFeedItemDto[]>(() => {
    const map = new Map<string, PinFeedItemDto>();
    for (const board of savedBoards) {
      for (const entry of board.items) {
        if (!map.has(entry.pin.id)) {
          map.set(entry.pin.id, entry.pin);
        }
      }
    }
    return Array.from(map.values());
  }, [savedBoards]);

  const searchFilteredPins = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    return allSavedPins.filter((pin) => {
      if (selectedProvinceId && pin.provinceId !== selectedProvinceId) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${pin.titleTh} ${pin.titleEn} ${pin.hotelNameTh} ${pin.hotelNameEn} ${pin.provinceNameTh}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allSavedPins, globalSearchQuery, selectedProvinceId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<PlaceCategoryDto, number> = {
      STAY: 0,
      CAFE: 0,
      RESTAURANT: 0,
      ATTRACTION: 0,
      WELLNESS: 0,
    };
    for (const pin of searchFilteredPins) {
      const cat = pin.placeCategory;
      if (cat in counts) {
        counts[cat] += 1;
      } else {
        counts.STAY += 1;
      }
    }
    return counts;
  }, [searchFilteredPins]);

  const visibleCategoryPins = useMemo(() => {
    if (selectedCategory === "ALL") return searchFilteredPins;
    return searchFilteredPins.filter(
      (pin) => pin.placeCategory === selectedCategory
    );
  }, [searchFilteredPins, selectedCategory]);

  const visibleBoards = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q && !selectedProvinceId) return savedBoards;
    return savedBoards.filter((board) => {
      if (q && board.name.toLowerCase().includes(q)) return true;
      return board.items.some((entry) => {
        if (selectedProvinceId && entry.pin.provinceId !== selectedProvinceId) {
          return false;
        }
        if (!q) return true;
        const hay =
          `${entry.pin.titleTh} ${entry.pin.titleEn} ${entry.pin.hotelNameTh} ${entry.pin.provinceNameTh}`.toLowerCase();
        return hay.includes(q);
      });
    });
  }, [globalSearchQuery, savedBoards, selectedProvinceId]);

  const handleConfirmDeleteBoard = async () => {
    if (!boardToDelete) return;
    setIsDeletingBoard(true);
    try {
      const ok = await deleteSavedBoard(boardToDelete.id);
      if (ok) {
        setBoardToDelete(null);
      }
    } finally {
      setIsDeletingBoard(false);
    }
  };

  const handleOpenBoard = (board: SavedBoardDto) => {
    const slugOrId = board.shareSlug || board.id;
    router.push(`/trip/${encodeURIComponent(slugOrId)}`);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  if (isCheckingSession) {
    return (
      <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="h-9 w-48 rounded-[10px] bg-[var(--color-background-muted)] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-square rounded-[22px] sm:rounded-[24px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-4 w-3/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-3.5 w-2/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="cgr-page-standard px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label={isTh ? "ย้อนกลับ" : "Go back"}
          className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isTh ? "ย้อนกลับ" : "Back"}</span>
        </button>

        <div className="max-w-[440px] mx-auto rounded-[24px] bg-[var(--color-background-muted)] px-6 py-12 text-center space-y-4">
          <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[#e60023] inline-flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5" fill="currentColor" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[19px] font-semibold text-[var(--color-text-primary)]">
              {isTh
                ? "เข้าสู่ระบบเพื่อดู Wishlist ที่ถูกใจ"
                : "Sign in to view your Wishlist"}
            </h1>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              {isTh
                ? "กดหัวใจบนที่พัก คาเฟ่ ร้านอาหาร และที่เที่ยวที่อยากไป ระบบจะแยกหมวดหมู่ให้โดยอัตโนมัติ หรือจัดลงบอร์ดของคุณเอง"
                : "Tap the heart on stays, cafes, restaurants, and attractions — auto-organized by category or your own boards."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{isTh ? "เข้าสู่ระบบ" : "Log in"}</span>
            </button>
            <Link
              href="/explore"
              className="h-11 px-6 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              {isTh ? "สำรวจสถานที่น่าไป" : "Explore places"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            aria-label={isTh ? "ย้อนกลับ" : "Go back"}
            title={isTh ? "ย้อนกลับ" : "Go back"}
            className="mt-0.5 h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <div className="space-y-1 min-w-0">
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {isTh ? "Wishlist ที่ถูกใจ" : "My Wishlist"}
            </h1>
            <p className="text-[13.5px] text-[var(--color-text-secondary)]">
              {isTh
                ? `สถานที่ที่บันทึกไว้ ${allSavedPins.length} แห่ง · แยกตามหมวดหมู่ให้อัตโนมัติหรือดูตามบอร์ดของคุณ`
                : `${allSavedPins.length} saved places · auto-grouped by category or organized in your boards`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateBoardModal}
          className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          <span>{isTh ? "สร้างบอร์ดใหม่" : "New board"}</span>
        </button>
      </div>

      {/* Mode Switcher: Auto-Categories vs Custom Boards */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-background-muted)]">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`h-9 px-4 rounded-full text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === "categories"
                ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isTh ? "แยกตามหมวดหมู่" : "By category"}</span>
            <span className="opacity-80 text-[12px] tabular-nums">
              ({searchFilteredPins.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("boards")}
            className={`h-9 px-4 rounded-full text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === "boards"
                ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isTh ? "บอร์ดของฉัน" : "My boards"}</span>
            <span className="opacity-80 text-[12px] tabular-nums">
              ({visibleBoards.length})
            </span>
          </button>
        </div>

        <Link
          href="/trip"
          className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline underline-offset-2"
        >
          {isTh ? "ดูทริปเดินทางทั้งหมด →" : "Browse trips →"}
        </Link>
      </div>

      {isLoadingBoards ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-square rounded-[22px] sm:rounded-[24px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-4 w-3/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-3.5 w-2/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : activeTab === "categories" ? (
        <div className="space-y-6">
          {/* Auto-Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                selectedCategory === "ALL"
                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                  : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
              }`}
            >
              <span>{isTh ? "ทั้งหมด" : "All"}</span>
              <span className="opacity-80 tabular-nums">
                ({searchFilteredPins.length})
              </span>
            </button>

            {PLACE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <PlaceCategoryIcon
                    category={cat.id}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                  <span>{isTh ? cat.shortLabelTh : cat.shortLabelEn}</span>
                  <span className="opacity-80 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          {visibleCategoryPins.length === 0 ? (
            <div className="rounded-[24px] bg-[var(--color-background-muted)] px-6 py-14 text-center space-y-4">
              <div className="space-y-1.5 max-w-[420px] mx-auto">
                <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                  {allSavedPins.length === 0
                    ? isTh
                      ? "ยังไม่มีสถานที่ใน Wishlist"
                      : "Your Wishlist is empty"
                    : isTh
                    ? "ไม่พบสถานที่ในหมวดหมู่นี้"
                    : "No saved places in this category"}
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
                  {allSavedPins.length === 0
                    ? isTh
                      ? "กดรูปหัวใจบนการ์ดที่พัก คาเฟ่ ร้านอาหาร หรือที่เที่ยวที่ถูกใจ เพื่อเก็บไว้ดูย้อนหลังได้ทันที"
                      : "Tap the heart icon on any stay, cafe, restaurant, or attraction to save it here."
                    : isTh
                    ? "ลองเลือกดูหมวดหมู่ทั้งหมด หรือค้นหาสถานที่เพิ่มจากหน้าแรก"
                    : "Switch back to All categories or explore more places to save."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {selectedCategory !== "ALL" && allSavedPins.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {isTh ? "ดูทั้งหมด" : "Show all"}
                  </button>
                )}
                <Link
                  href="/"
                  className="h-11 px-6 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
                >
                  {isTh ? "สำรวจสถานที่น่าเที่ยว" : "Discover places"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-9">
              {visibleCategoryPins.map((pin, idx) => (
                <VerticalCouponCard
                  key={pin.id}
                  pin={pin}
                  language={language}
                  isSaved={savedPinIds.has(pin.id)}
                  priority={idx < 4}
                  onSelect={(selectedPin, originRect) =>
                    navigateToPlaceWithFlip({
                      pin: selectedPin,
                      originRect,
                      href: `/${selectedPin.hotelSlug}`,
                    })
                  }
                  onToggleSave={(pinId) => {
                    const target = allSavedPins.find((p) => p.id === pinId);
                    if (target) {
                      triggerPinToBoard({
                        id: target.id,
                        coverImageUrl: target.coverImageUrl,
                        isSavedByMe: savedPinIds.has(target.id),
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : visibleBoards.length === 0 ? (
        <div className="rounded-[24px] bg-[var(--color-background-muted)] px-6 py-14 text-center space-y-4">
          <div className="space-y-1.5 max-w-[420px] mx-auto">
            <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
              {savedBoards.length === 0
                ? isTh
                  ? "ยังไม่มีบอร์ดที่สร้างไว้"
                  : "No wishlist boards yet"
                : isTh
                ? "ไม่พบบอร์ดที่ตรงกับการค้นหา"
                : "No boards match your search"}
            </h2>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              {savedBoards.length === 0
                ? isTh
                  ? "สร้างบอร์ดเพื่อจัดกลุ่มที่พักและร้านโปรดแยกตามจุดหมายหรือสไตล์ของคุณ"
                  : "Create a board to organize your favorite places by destination or vibe."
                : isTh
                ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองจังหวัด"
                : "Try adjusting your search or clearing the province filter."}
            </p>
          </div>
          {savedBoards.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={openCreateBoardModal}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{isTh ? "สร้างบอร์ดใหม่" : "Create board"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-9">
          {visibleBoards.map((board, idx) => (
            <TripStackedCardFolder
              key={board.id}
              board={board}
              language={language}
              priority={idx < 2}
              onOpenTrip={handleOpenBoard}
              onDeleteTrip={(b) => setBoardToDelete(b)}
            />
          ))}
        </div>
      )}

      {(hasMountedDeleteModal || boardToDelete) && (
        <DeleteBoardConfirmModal
          board={boardToDelete}
          language={language}
          isDeleting={isDeletingBoard}
          onClose={() => setBoardToDelete(null)}
          onConfirmDelete={handleConfirmDeleteBoard}
        />
      )}
    </div>
  );
}
