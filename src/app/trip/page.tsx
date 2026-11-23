"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Bookmark, FolderPlus, LogIn } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { TripStackedCardFolder } from "@/components/trip/TripStackedCardFolder";
import type { SavedBoardDto } from "@/types/cangaroom";

const DeleteBoardConfirmModal = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.DeleteBoardConfirmModal
    ),
  { ssr: false }
);

export default function TripPlannerPage() {
  const router = useRouter();
  const {
    lang: language,
    user: currentUser,
    isCheckingSession,
    globalSearchQuery,
    selectedProvinceId,
    openAuthModal,
    savedBoards,
    isLoadingBoards,
    openCreateBoardModal,
    deleteSavedBoard,
  } = useHotelApp();

  const isTh = language === "th";

  const [tripToDelete, setTripToDelete] = useState<SavedBoardDto | null>(null);
  const [hasMountedDeleteModal, setHasMountedDeleteModal] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  useEffect(() => {
    if (tripToDelete) setHasMountedDeleteModal(true);
  }, [tripToDelete]);

  // Filter visible trips in View 1 if global search is active
  const visibleTrips = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q && !selectedProvinceId) return savedBoards;
    return savedBoards.filter((trip) => {
      if (q && trip.name.toLowerCase().includes(q)) return true;
      return trip.items.some((entry) => {
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

  const handleConfirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    setIsDeletingTrip(true);
    try {
      const ok = await deleteSavedBoard(tripToDelete.id);
      if (ok) {
        setTripToDelete(null);
      }
    } finally {
      setIsDeletingTrip(false);
    }
  };

  const handleOpenTripFolder = (board: SavedBoardDto) => {
    const slugOrId = board.shareSlug || board.id;
    router.push(`/trip/${encodeURIComponent(slugOrId)}`);
  };

  if (isCheckingSession) {
    return (
      <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="h-9 w-48 rounded-[10px] bg-[var(--color-background-muted)] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-[3/4] rounded-[18px] sm:rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
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
      <div className="cgr-page-standard px-4 sm:px-6 py-16">
        <div className="max-w-[420px] mx-auto rounded-[20px] bg-[var(--color-background-muted)] px-6 py-12 text-center space-y-4">
          <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] inline-flex items-center justify-center mx-auto">
            <Bookmark className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "เข้าสู่ระบบเพื่อดูทริปของคุณ" : "Sign in to view your trips"}
            </h1>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              {isTh
                ? "บันทึกคูปองและที่พักที่ถูกใจแยกตามทริป ดูระยะทางแต่ละแห่งบนแผนที่ และแชร์ลิงก์ให้เพื่อนได้ทันที"
                : "Save hotel deals into trip folders, map routes, and share trip links with friends."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{isTh ? "เข้าสู่ระบบ" : "Log in"}</span>
            </button>
            <Link
              href="/explore"
              className="h-11 px-5 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              {isTh ? "สำรวจแผนที่ที่พัก" : "Explore map"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {isTh ? "ทริป & คูปองของฉัน" : "My trips & saved deals"}
          </h1>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            {isTh
              ? "แตะทริปเพื่อเปิดแผนที่เส้นทาง กด Play หรือแชร์ลิงก์ให้เพื่อน"
              : "Tap a trip to explore its route map, press Play, or share a link with friends."}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateBoardModal}
          className="h-10 px-3.5 sm:px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          <span>{isTh ? "สร้างทริปใหม่" : "New trip"}</span>
        </button>
      </div>

      {isLoadingBoards ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-[3/4] rounded-[18px] sm:rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-4 w-3/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="h-3.5 w-2/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : visibleTrips.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--color-background-muted)] px-6 py-14 text-center space-y-4">
          <div className="space-y-1.5 max-w-[420px] mx-auto">
            <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
              {savedBoards.length === 0
                ? isTh
                  ? "ยังไม่มีทริปที่บันทึกไว้"
                  : "No trips saved yet"
                : isTh
                ? "ไม่พบทริปที่ตรงกับการค้นหา"
                : "No trips match your search"}
            </h2>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              {savedBoards.length === 0
                ? isTh
                  ? "กดไอคอนปักหมุดบนการ์ดคูปองที่พักที่ถูกใจ เพื่อเก็บแยกตามทริปและดูระยะทางแต่ละจุดบนแผนที่"
                  : "Bookmark stay deals from the home feed or explore map to organize trips and view routes."
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
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{isTh ? "สร้างทริปใหม่" : "Create trip"}</span>
              </button>
              <Link
                href="/explore"
                className="h-11 px-5 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
              >
                {isTh ? "สำรวจแผนที่ที่พัก" : "Explore map"}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-9">
          {visibleTrips.map((trip, idx) => (
            <TripStackedCardFolder
              key={trip.id}
              board={trip}
              language={language}
              priority={idx < 2}
              onOpenTrip={handleOpenTripFolder}
              onDeleteTrip={(b) => setTripToDelete(b)}
            />
          ))}
        </div>
      )}

      {(hasMountedDeleteModal || tripToDelete) && (
        <DeleteBoardConfirmModal
          board={tripToDelete}
          language={language}
          isDeleting={isDeletingTrip}
          onClose={() => setTripToDelete(null)}
          onConfirmDelete={handleConfirmDeleteTrip}
        />
      )}
    </div>
  );
}
