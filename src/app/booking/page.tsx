"use client";

import React, { useEffect, useState } from "react";
import { CalendarCheck, SlidersHorizontal } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { StayDatePickerBar } from "@/components/booking/StayDatePickerBar";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";

export default function BookingPage() {
  const {
    propertyConfig,
    rooms,
    lang: language,
    checkIn,
    checkOut,
    guests,
    setCheckIn,
    setCheckOut,
    nights: stayNights,
    roomStatusMap,
    totalAvailableUnitsCount,
    findNextAvailableRangeForRoom,
    openCalendarDrawer,
    openRoomDrawer,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(
    "all"
  );
  const [likedRoomsById, setLikedRoomsById] = useState<Record<string, boolean>>(
    {}
  );
  const [recentlySharedRoomId, setRecentlySharedRoomId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    if (categoryParam) {
      setSelectedCategoryFilter(categoryParam);
    }
    const targetRoomId = params.get("room");
    if (targetRoomId && rooms.length > 0) {
      const targetElement = document.getElementById(
        `room-card-${targetRoomId}`
      );
      targetElement?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rooms]);

  const handleToggleRoomLike = (roomId: string) => {
    setLikedRoomsById((previous) => ({
      ...previous,
      [roomId]: !previous[roomId],
    }));
  };

  const handleShareRoomLink = async (roomTitle: string, roomId: string) => {
    const roomShareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/booking?room=${roomId}`
        : "";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: roomTitle,
          text: `${roomTitle} — ${propertyConfig.nameTh}`,
          url: roomShareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      roomShareUrl
    ) {
      navigator.clipboard.writeText(roomShareUrl);
    }
    setRecentlySharedRoomId(roomId);
    setTimeout(() => setRecentlySharedRoomId(null), 1800);
  };

  const filteredRooms = rooms.filter((room) => {
    if (selectedCategoryFilter === "all") {
      return true;
    }
    if (selectedCategoryFilter === "available-only") {
      const status = roomStatusMap[room.id];
      return status?.state === "AVAILABLE" && (status?.availableUnits ?? 0) > 0;
    }
    const matchingChip = cms.bookingPage.categoryChips.find(
      (chip) => chip.id === selectedCategoryFilter
    );
    if (matchingChip?.codePrefix) {
      return room.code
        .toUpperCase()
        .startsWith(matchingChip.codePrefix.toUpperCase());
    }
    return true;
  });

  const filterChips = [
    {
      id: "all",
      label:
        language === "th"
          ? `ห้องพักทั้งหมด (${rooms.length})`
          : `All Rooms (${rooms.length})`,
    },
    {
      id: "available-only",
      label:
        language === "th"
          ? `เฉพาะห้องว่าง (${totalAvailableUnitsCount})`
          : `Available (${totalAvailableUnitsCount})`,
    },
    ...cms.bookingPage.categoryChips.map((chip) => ({
      id: chip.id,
      label: pickLocalizedText(language, chip.labelTh, chip.labelEn),
    })),
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3.5 sm:gap-4 select-none">
      {/* 1. DEDICATED SEARCH & AVAILABILITY CONTROL CARD (No duplicate Hero Cover!) */}
      <section className="app-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="ty-title flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span>
                {language === "th"
                  ? "เช็กวันว่าง & เลือกห้องพัก"
                  : "Select Stay Dates & Room"}
              </span>
            </h1>
            <p className="ty-caption mt-0.5">
              {language === "th"
                ? `ราคาตรงจากที่พัก · ล็อกห้องอัตโนมัติ 15 นาทีระหว่างชำระเงิน`
                : `Official direct rates · Instant 15-minute room hold`}
            </p>
          </div>

          <StayDatePickerBar
            language={language}
            checkInDate={checkIn}
            checkOutDate={checkOut}
            guestCount={guests}
            stayNights={stayNights}
            availableRoomUnitsCount={totalAvailableUnitsCount}
            onOpenCalendarDrawer={openCalendarDrawer}
          />
        </div>

        {/* Category & Availability Filter Pills */}
        <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 mr-0.5" />
            {filterChips.map((chip) => {
              const isActive = selectedCategoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(chip.id)}
                  className={`h-8 px-3.5 rounded-full ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {canShowEditControls && (
            <EditSpotButton
              icon="add"
              label="เพิ่มห้องพัก"
              onClick={() => openCmsEditor({ type: "room" })}
            />
          )}
        </div>
      </section>

      {/* 2. ROOM AVAILABILITY CARDS */}
      <section id="rooms" className="space-y-3.5 sm:space-y-4">
        {filteredRooms.length === 0 ? (
          <div className="app-card p-8 text-center space-y-2">
            <p className="ty-subtitle font-bold">
              {language === "th"
                ? "ไม่มีห้องว่างในตัวกรองที่เลือก"
                : "No rooms match your filter"}
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className="ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {language === "th" ? "แสดงห้องพักทั้งหมด" : "Show all rooms"}
            </button>
          </div>
        ) : (
          filteredRooms.map((room, roomIndex) => {
            const roomStatus = roomStatusMap[room.id];
            const isRoomAvailable =
              roomStatus?.state === "AVAILABLE" &&
              (roomStatus?.availableUnits ?? 0) > 0;
            const nextAvailableRange = !isRoomAvailable
              ? findNextAvailableRangeForRoom(room)
              : null;

            return (
              <RoomFeedCard
                key={room.id}
                room={room}
                roomIndex={roomIndex}
                language={language}
                stayNights={stayNights}
                roomStatus={roomStatus}
                nextAvailableRange={nextAvailableRange}
                isLiked={Boolean(likedRoomsById[room.id])}
                isShared={recentlySharedRoomId === room.id}
                onToggleLike={() => handleToggleRoomLike(room.id)}
                onShareRoom={() =>
                  handleShareRoomLink(
                    pickLocalizedText(language, room.nameTh, room.nameEn),
                    room.id
                  )
                }
                onSelectNextAvailableDates={(nextCheckIn, nextCheckOut) => {
                  setCheckIn(nextCheckIn);
                  setCheckOut(nextCheckOut);
                }}
                onOpenRoomDetails={(initialPhotoIndex) =>
                  openRoomDrawer(room, "details", initialPhotoIndex ?? 0)
                }
                onBookRoom={() => openRoomDrawer(room, "calendar")}
                onEditRoom={
                  canShowEditControls
                    ? () => openCmsEditor({ type: "room", roomId: room.id })
                    : undefined
                }
              />
            );
          })
        )}
      </section>
    </div>
  );
}
