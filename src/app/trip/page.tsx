"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Compass, FolderPlus, X } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { TripStackedCardFolder } from "@/components/trip/TripStackedCardFolder";
import { TripStoryParallaxHero } from "@/components/trip/TripStoryParallaxHero";
import {
  POPULAR_TRIP_PROVINCE_GROUPS,
  TripProvinceGroupsSection,
  matchesProvinceGroup,
  type PopularProvinceGroupConfig,
} from "@/components/trip/TripProvinceGroupsSection";
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
  provinceId: string | null,
  activeGroup: PopularProvinceGroupConfig | null
) {
  const q = query.trim().toLowerCase();
  if (!q && !provinceId && !activeGroup) return boards;
  return boards.filter((trip) => {
    if (activeGroup && !matchesProvinceGroup(trip, activeGroup)) {
      return false;
    }
    if (!activeGroup && provinceId) {
      const hasProvince = trip.items.some(
        (entry) => entry.pin.provinceId === provinceId
      );
      if (!hasProvince) return false;
    }
    if (!q) return true;
    if (trip.name.toLowerCase().includes(q)) return true;
    return trip.items.some((entry) => {
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [communityTrips, setCommunityTrips] = useState<
    PublicCommunityTripDto[]
  >([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const tripSheetRef = useRef<HTMLDivElement | null>(null);
  const [isTripSheetPinned, setIsTripSheetPinned] = useState(false);

  // Match Home (`/`)'s zero-scroll-listener `z-[60]` solid-white cover pattern:
  // when the white Trip sheet reaches the top edge on mobile, mount a solid 6px white cover
  // above the `z-[55]` blue sentinel so Safari samples white; hide via `display: none` when
  // scrolling back up so Safari seamlessly restores `#2986D6` with zero stutter.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.innerWidth >= 1024 ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }
    const sheetEl = tripSheetRef.current;
    if (!sheetEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsTripSheetPinned(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -98% 0px", threshold: 0 }
    );
    observer.observe(sheetEl);
    return () => observer.disconnect();
  }, []);

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

  const activeGroup = useMemo(
    () =>
      POPULAR_TRIP_PROVINCE_GROUPS.find((g) => g.id === selectedGroupId) ??
      null,
    [selectedGroupId]
  );

  const ownedIds = useMemo(
    () => new Set(savedBoards.map((b) => b.id)),
    [savedBoards]
  );

  const allCombinedTrips = useMemo(() => {
    const nonOwned = communityTrips.filter((t) => !ownedIds.has(t.id));
    return [...savedBoards, ...nonOwned];
  }, [communityTrips, ownedIds, savedBoards]);

  const visibleMyTrips = useMemo(
    () =>
      filterBoards(
        savedBoards,
        globalSearchQuery,
        selectedProvinceId,
        activeGroup
      ) as SavedBoardDto[],
    [activeGroup, globalSearchQuery, savedBoards, selectedProvinceId]
  );

  const visibleCommunityTrips = useMemo(() => {
    const nonOwned = communityTrips.filter((t) => !ownedIds.has(t.id));
    return filterBoards(
      nonOwned,
      globalSearchQuery,
      selectedProvinceId,
      activeGroup
    ) as PublicCommunityTripDto[];
  }, [
    activeGroup,
    communityTrips,
    globalSearchQuery,
    ownedIds,
    selectedProvinceId,
  ]);

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

  const handleSelectProvinceGroup = (
    group: PopularProvinceGroupConfig | null
  ) => {
    setSelectedGroupId(group ? group.id : null);
    if (group && typeof document !== "undefined") {
      const feedEl = document.getElementById("trip-stories-feed");
      if (feedEl) {
        feedEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const activeGroupLabel = activeGroup
    ? isTh
      ? activeGroup.nameTh
      : activeGroup.nameEn
    : null;

  return (
    <div className="lg:pb-12">
      {/* Mobile Solid-White Top Cover (z-[60] > z-[55] blue sentinel) when scrolled into white Trip sheet;
          uses `hidden` (`display: none`) while Hero is visible so Safari seamlessly restores `#2986D6`. */}
      <div
        aria-hidden="true"
        className={`lg:hidden fixed top-0 inset-x-0 z-[60] h-[max(6px,env(safe-area-inset-top,0px))] bg-[var(--color-background-body)] pointer-events-none ${
          isTripSheetPinned ? "block" : "hidden"
        }`}
      />

      {/* Section 1: 3D Scroll-Depth Parallax Storytelling Hero */}
      <div className="w-full lg:px-6 lg:pt-2">
        <TripStoryParallaxHero
          language={language}
          isSignedIn={Boolean(currentUser)}
          totalTripsCount={allCombinedTrips.length}
          provinceGroupCount={POPULAR_TRIP_PROVINCE_GROUPS.length}
          communityTrips={communityTrips}
          onCreateTrip={openCreateBoardModal}
          onSignIn={() => openAuthModal()}
        />
      </div>

      {/* Main Content Container — Airbnb-style rounded white sheet overlapping straight-edge Hero on Mobile */}
      <div
        ref={tripSheetRef}
        className="relative z-20 -mt-7 lg:mt-10 -mb-[calc(var(--cgr-mobile-nav-h)+20px)] lg:mb-0 rounded-t-[28px] lg:rounded-none bg-[var(--color-background-body)] pt-7 pb-[calc(var(--cgr-mobile-nav-h)+48px)] lg:pt-0 lg:pb-0 min-h-[100svh]"
      >
        <div className="cgr-page-standard px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section 2: Cute Popular Province Groups (Scrapbook Clusters) */}
        <TripProvinceGroupsSection
          language={language}
          allTrips={allCombinedTrips}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectProvinceGroup}
        />

        {/* Section 3: My Trips + Community Stories Feed */}
        <div id="trip-stories-feed" className="space-y-8 scroll-mt-20">
          {activeGroupLabel && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[var(--color-accent)] !text-[var(--color-on-accent)] text-[13px] font-semibold">
                  <span>
                    {isTh
                      ? `กลุ่มจังหวัด: ${activeGroupLabel}`
                      : `Destination: ${activeGroupLabel}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isTh ? "ล้างตัวกรอง" : "Clear filter"}</span>
                </button>
              </div>
            </div>
          )}

          {/* My Trips (when signed in) */}
          {!isCheckingSession && currentUser && (
            <section className="space-y-4 border-t border-[var(--color-border)] pt-8 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--color-text-primary)]">
                  {activeGroupLabel
                    ? isTh
                      ? `ทริปของฉันใน${activeGroupLabel}`
                      : `My ${activeGroupLabel} Trips`
                    : isTh
                    ? "ทริปของฉัน"
                    : "My Trips"}
                </h2>
                {visibleMyTrips.length > 0 && (
                  <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                    {visibleMyTrips.length}{" "}
                    {isTh
                      ? "ทริป"
                      : visibleMyTrips.length === 1
                      ? "trip"
                      : "trips"}
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
                <div className="rounded-[24px] bg-[var(--color-background-muted)] px-6 py-9 text-center space-y-3">
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    {activeGroupLabel
                      ? isTh
                        ? `คุณยังไม่มีทริปใน${activeGroupLabel}`
                        : `You don’t have a trip in ${activeGroupLabel} yet`
                      : savedBoards.length === 0
                      ? isTh
                        ? "คุณยังไม่มีทริปส่วนตัว"
                        : "You don’t have any personal trips yet"
                      : isTh
                      ? "ไม่พบทริปส่วนตัวที่ตรงกับการค้นหา"
                      : "No personal trips match your filter"}
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[420px] mx-auto">
                    {isTh
                      ? "กดสร้างทริปใหม่เพื่อบันทึกเรื่องราว หรือกดหัวใจเก็บสถานที่โปรดไว้จัดเส้นทาง"
                      : "Create a new trip to share your story or tap the heart on favorite places."}
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

          {/* Public Community Trips (Visible to EVERYONE including guests!) */}
          <section className="space-y-4 border-t border-[var(--color-border)] pt-8 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--color-text-primary)]">
                  {activeGroupLabel
                    ? isTh
                      ? `เรื่องราวและทริปใน${activeGroupLabel}`
                      : `${activeGroupLabel} Travel Stories`
                    : isTh
                    ? "เรื่องราวและทริปจากเพื่อนนักเดินทาง"
                    : "Community Travel Stories"}
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "เปิดดูเส้นทาง คาเฟ่ และที่พักที่เพื่อนๆ แชร์ไว้ได้ทันที ไม่ต้องเข้าสู่ระบบ"
                    : "Explore shared itineraries, stays, and stops right away — no login required."}
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
                <span className="h-12 w-12 rounded-full bg-[var(--color-background-card)] text-[var(--color-accent)] inline-flex items-center justify-center mx-auto">
                  <Compass className="w-5 h-5" />
                </span>
                <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                  {activeGroupLabel
                    ? isTh
                      ? `ยังไม่มีทริปในกลุ่ม${activeGroupLabel}`
                      : `No shared trips in ${activeGroupLabel} yet`
                    : isTh
                    ? "ยังไม่มีทริปสาธารณะในขณะนี้"
                    : "No public community trips yet"}
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[420px] mx-auto">
                  {activeGroupLabel
                    ? isTh
                      ? `มาเป็นคนแรกที่เล่าเรื่องเที่ยวและแชร์พิกัดเด็ดใน${activeGroupLabel}ให้เพื่อนๆ ตามรอยกัน`
                      : `Be the first traveller to share a story and favorite stops in ${activeGroupLabel}.`
                    : isTh
                    ? "เริ่มต้นค้นหาที่พัก คาเฟ่ และที่เที่ยวบนแผนที่ แล้วบันทึกเป็นทริปแรกได้เลย"
                    : "Discover stays, cafes, and spots on the map to create the first public trip."}
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={
                      currentUser ? openCreateBoardModal : () => openAuthModal()
                    }
                    className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>
                      {activeGroupLabel
                        ? isTh
                          ? `แชร์ทริป${activeGroupLabel}`
                          : `Share ${activeGroupLabel} trip`
                        : isTh
                        ? "สร้างทริปแรกของคุณ"
                        : "Create first trip"}
                    </span>
                  </button>

                  {activeGroupLabel ? (
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(null)}
                      className="h-11 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {isTh ? "ดูทริปทุกจังหวัด" : "View all trips"}
                    </button>
                  ) : (
                    <Link
                      href="/explore"
                      className="h-11 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
                    >
                      {isTh ? "เปิดแผนที่สำรวจสถานที่" : "Explore map"}
                    </Link>
                  )}
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
        </div>
        </div>
      </div>

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
