"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";
import { StandardButton } from "@/components/ui/standards";

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

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >("all");
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
    if (!selectedCategoryFilter || selectedCategoryFilter === "all") {
      return true;
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

  const filterTabs = [
    {
      id: "all",
      label:
        language === "th"
          ? `ห้องพักทั้งหมด (${rooms.length})`
          : `All Rooms (${rooms.length})`,
    },
    ...cms.bookingPage.categoryChips.map((chip) => ({
      id: chip.id,
      label: pickLocalizedText(language, chip.labelTh, chip.labelEn),
    })),
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-5 py-2 select-none">
      {/* 1. Dedicated Booking Workspace Header (NO duplicate Cover Hero!) */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="ty-display">
              {language === "th"
                ? "เลือกห้องพักและเช็ควันว่าง"
                : "Rooms & Availability"}
            </h1>
            <p className="ty-caption mt-0.5">
              {language === "th"
                ? `เข้าพัก ${formatShortDate(
                    checkIn,
                    language
                  )} – ${formatShortDate(
                    checkOut,
                    language
                  )} (${stayNights} คืน · ${guests} ท่าน) · ว่าง ${totalAvailableUnitsCount} หลัง`
                : `${formatShortDate(checkIn, language)} – ${formatShortDate(
                    checkOut,
                    language
                  )} (${stayNights} nights · ${guests} guests) · ${totalAvailableUnitsCount} available`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                icon="add"
                label="เพิ่มห้องพักใหม่"
                onClick={() => openCmsEditor({ type: "room" })}
              />
            )}
            <StandardButton
              variant="primary"
              size="md"
              onClick={openCalendarDrawer}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === "th" ? "เปลี่ยนวันเข้าพัก" : "Change Dates"}
              </span>
            </StandardButton>
          </div>
        </div>

        {/* GoDaddy-Style Horizontal Underline Filter Tabs */}
        <div className="border-b border-[var(--color-border)] flex items-center gap-6 overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => {
            const isActive =
              (!selectedCategoryFilter && tab.id === "all") ||
              selectedCategoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(tab.id)}
                className={`pb-2.5 text-[14px] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-[var(--color-text-primary)] font-semibold text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Clean Room Availability List */}
      <section id="rooms" className="space-y-4">
        {filteredRooms.map((room, roomIndex) => {
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
        })}
      </section>
    </div>
  );
}
