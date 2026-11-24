"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Compass, FolderPlus, Heart, LogIn } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { TripStackedCardFolder } from "@/components/trip/TripStackedCardFolder";
import type { PublicCommunityTripDto } from "@/lib/services/boardService";
import type { SavedBoardDto } from "@/types/cangaroom";

const DeleteBoardConfirmModal = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.DeleteBoardConfirmModal
    ),
  { ssr: false }
);

function filterBoards(
  boards: SavedBoardDto[],
  query: string,
  provinceId: string | null
) {
  const q = query.trim().toLowerCase();
  if (!q && !provinceId) return boards;
  return boards.filter((trip) => {
    if (q && trip.name.toLowerCase().includes(q)) return true;
    return trip.items.some((entry) => {
      if (provinceId && entry.pin.provinceId !== provinceId) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${entry.pin.titleTh} ${entry.pin.titleEn} ${entry.pin.hotelNameTh} ${entry.pin.provinceNameTh}`.toLowerCase();
      return hay.includes(q);
    });
  });
}

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

  const [communityTrips, setCommunityTrips] = useState<
    PublicCommunityTripDto[]
  >([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);

  useEffect(() => {
    if (tripToDelete) setHasMountedDeleteModal(true);
  }, [tripToDelete]);

  useEffect(() => {
    let active = true;
    setIsLoadingCommunity(true);
    fetch("/api/trips/public")
      .then((res) => (res.ok ? res.json() : { trips: [] }))
      .then((data: { trips?: PublicCommunityTripDto[] }) => {
        if (active && Array.isArray(data.trips)) {
          setCommunityTrips(data.trips);
        }
      })
      .catch(() => {
        if (active) setCommunityTrips([]);
      })
      .finally(() => {
        if (active) setIsLoadingCommunity(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleMyTrips = useMemo(
    () =>
      filterBoards(
        savedBoards,
        globalSearchQuery,
        selectedProvinceId
      ) as SavedBoardDto[],
    [globalSearchQuery, savedBoards, selectedProvinceId]
  );

  const ownedIds = useMemo(
    () => new Set(savedBoards.map((b) => b.id)),
    [savedBoards]
  );

  const visibleCommunityTrips = useMemo(() => {
    const nonOwned = communityTrips.filter((t) => !ownedIds.has(t.id));
    return filterBoards(
      nonOwned,
      globalSearchQuery,
      selectedProvinceId
    ) as PublicCommunityTripDto[];
  }, [communityTrips, globalSearchQuery, ownedIds, selectedProvinceId]);

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

  return (
    <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {isTh ? "ทริปเดินทาง" : "Travel Trips"}
          </h1>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            {isTh
              ? "สำรวจเส้นทางและทริปแนะนำจากนักเดินทางบน Nondii หรือสร้างทริปของคุณเองได้ทันที"
              : "Explore shared itineraries from the Nondii community or organize your own trips."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {currentUser ? (
            <>
              <Link
                href="/wishlist"
                className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Heart className="w-4 h-4 text-[#e60023]" />
                <span>{isTh ? "Wishlist ของฉัน" : "Wishlist"}</span>
              </Link>
              <button
                type="button"
                onClick={openCreateBoardModal}
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{isTh ? "สร้างทริปใหม่" : "New trip"}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/explore"
                className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>{isTh ? "สำรวจแผนที่" : "Explore map"}</span>
              </Link>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{isTh ? "เข้าสู่ระบบเพื่อสร้างทริป" : "Sign in to create"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section 1: My Trips (when signed in) */}
      {!isCheckingSession && currentUser && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] sm:text-[19px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "ทริปของฉัน" : "My Trips"}
            </h2>
            {visibleMyTrips.length > 0 && (
              <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                {visibleMyTrips.length}{" "}
                {isTh ? "ทริป" : visibleMyTrips.length === 1 ? "trip" : "trips"}
              </span>
            )}
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
          ) : visibleMyTrips.length === 0 ? (
            <div className="rounded-[24px] bg-[var(--color-background-muted)] px-6 py-10 text-center space-y-3">
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {savedBoards.length === 0
                  ? isTh
                    ? "คุณยังไม่มีทริปส่วนตัว"
                    : "You don’t have any personal trips yet"
                  : isTh
                  ? "ไม่พบทริปส่วนตัวที่ตรงกับการค้นหา"
                  : "No personal trips match your filter"}
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[420px] mx-auto">
                {savedBoards.length === 0
                  ? isTh
                    ? "กดปุ่ม “สร้างทริปใหม่” ด้านบน หรือกดหัวใจบนสถานที่ที่ถูกใจเพื่อเริ่มจัดทริปของคุณ"
                    : "Click “New trip” above or tap the heart on any place to start organizing."
                  : isTh
                  ? "ลองเปลี่ยนคำค้นหา หรือดูทริปจากนักเดินทางด้านล่าง"
                  : "Try clearing the filter or explore community trips below."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-9">
              {visibleMyTrips.map((trip, idx) => (
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
        </section>
      )}

      {/* Section 2: Public Community Trips (Visible to EVERYONE including guests!) */}
      <section
        className={`space-y-4 ${
          !isCheckingSession && currentUser
            ? "border-t border-[var(--color-border)] pt-8"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-[17px] sm:text-[19px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "ทริปจากนักเดินทาง" : "Community Trips"}
            </h2>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              {isTh
                ? "เปิดดูเส้นทางและที่พักแนะนำได้ทันที ไม่ต้องเข้าสู่ระบบ"
                : "Open curated travel folders and routes right away — no login required."}
            </p>
          </div>
        </div>

        {isLoadingCommunity ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-square rounded-[22px] sm:rounded-[24px] bg-[var(--color-background-muted)] animate-pulse" />
                <div className="h-4 w-3/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
                <div className="h-3.5 w-2/5 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleCommunityTrips.length === 0 ? (
          <div className="rounded-[24px] bg-[var(--color-background-muted)] px-6 py-12 text-center space-y-3">
            <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[var(--color-accent)] inline-flex items-center justify-center mx-auto">
              <Compass className="w-5 h-5" />
            </span>
            <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "ยังไม่มีทริปสาธารณะในขณะนี้" : "No public community trips yet"}
            </p>
            <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[400px] mx-auto">
              {isTh
                ? "เริ่มต้นค้นหาที่พัก คาเฟ่ และที่เที่ยวบนแผนที่ แล้วบันทึกเป็นทริปแรกได้เลย"
                : "Discover stays, cafes, and spots on the map to create the first public trip."}
            </p>
            <div className="pt-1">
              <Link
                href="/explore"
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
              >
                {isTh ? "เปิดแผนที่สำรวจสถานที่" : "Explore map"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-6 sm:gap-x-6 sm:gap-y-9">
            {visibleCommunityTrips.map((trip, idx) => (
              <TripStackedCardFolder
                key={trip.id}
                board={trip}
                language={language}
                priority={!currentUser && idx < 4}
                ownerDisplayName={trip.ownerDisplayName}
                onOpenTrip={handleOpenTripFolder}
              />
            ))}
          </div>
        )}
      </section>

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
