"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Check, Tag, Users } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";
import { StandardButton } from "@/components/ui/standards";

export default function BookingPage() {
  const {
    propertyConfig,
    rooms,
    coupons,
    lang: language,
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut,
    guests,
    nights: stayNights,
    roomStatusMap,
    totalAvailableUnitsCount,
    findNextAvailableRangeForRoom,
    openCalendarDrawer,
    openRoomDrawer,
    navigateToTab,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
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

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;

  const filteredRooms = rooms.filter((room) => {
    if (onlyAvailable) {
      const st = roomStatusMap[room.id];
      const isAvail =
        st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
      if (!isAvail) return false;
    }

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

  const categoryChips = [
    {
      id: "all",
      label:
        language === "th"
          ? `ทั้งหมด (${rooms.length})`
          : `All (${rooms.length})`,
    },
    ...cms.bookingPage.categoryChips.map((chip) => ({
      id: chip.id,
      label: pickLocalizedText(language, chip.labelTh, chip.labelEn),
    })),
  ];

  return (
    <div className="w-full min-w-0 space-y-4 select-none">
      {/* 1. DEDICATED DIRECT BOOKING SEARCH & FILTER HEADER CARD (No Duplicate Cover Photo!) */}
      <section className="app-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="ty-display">
              {language === "th"
                ? "เช็กห้องว่างและจองตรงกับที่พัก"
                : "Available Rooms & Direct Rates"}
            </h1>
            <p className="ty-caption mt-0.5">
              {language === "th"
                ? totalAvailableUnitsCount > 0
                  ? `มีห้องว่างพร้อมจอง ${totalAvailableUnitsCount} หลัง สำหรับวันที่เลือก · ล็อกห้องอัตโนมัติ 15 นาที`
                  : "วันที่เลือกเต็มแล้ว · กดเปลี่ยนวันเข้าพักด้านขวาเพื่อดูวันว่างถัดไป"
                : `${totalAvailableUnitsCount} villas available for your dates · Instant 15-min hold`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                icon="add"
                label="เพิ่มห้องพักใหม่"
                onClick={() => openCmsEditor({ type: "room" })}
              />
            )}

            {activeCouponsCount > 0 && (
              <button
                type="button"
                onClick={() => navigateToTab("deal")}
                className="h-9 px-3 rounded-[8px] bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] ty-caption font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {language === "th"
                    ? `เก็บคูปองลดเพิ่ม (${activeCouponsCount})`
                    : `Coupons (${activeCouponsCount})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Date & Guest Selector Row */}
        <div className="rounded-[10px] bg-[var(--color-background-muted)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-body">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {formatShortDate(checkIn, language)} –{" "}
                {formatShortDate(checkOut, language)} ({stayNights}{" "}
                {language === "th" ? "คืน" : "nights"})
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <Users className="w-4 h-4" />
              <span>
                {guests} {language === "th" ? "ท่าน" : "guests"}
              </span>
            </span>
          </div>

          <StandardButton
            variant="primary"
            size="md"
            onClick={openCalendarDrawer}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {language === "th"
                ? "เปลี่ยนวันเข้าพัก / ผู้เข้าพัก"
                : "Change Dates / Guests"}
            </span>
          </StandardButton>
        </div>

        {/* Category & Availability Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categoryChips.map((chip) => {
              const isActive = selectedCategoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(chip.id)}
                  className={`h-8 px-3.5 rounded-full ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOnlyAvailable((v) => !v)}
            className={`h-8 px-3 rounded-full ty-caption font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
              onlyAvailable
                ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
            }`}
          >
            {onlyAvailable && <Check className="w-3.5 h-3.5" />}
            <span>
              {language === "th" ? "แสดงเฉพาะห้องว่าง" : "Available only"}
            </span>
          </button>
        </div>
      </section>

      {/* 2. FILTERED ROOM CARDS */}
      <section id="rooms" className="scroll-mt-16 space-y-4">
        {filteredRooms.length === 0 ? (
          <div className="app-card p-8 text-center space-y-3">
            <p className="ty-subtitle font-bold">
              {language === "th"
                ? "ไม่พบห้องว่างในเงื่อนไขที่เลือก"
                : "No available rooms match your filter"}
            </p>
            <p className="ty-caption">
              {language === "th"
                ? "ลองเปลี่ยนวันเข้าพักหรือปิดตัวกรอง “แสดงเฉพาะห้องว่าง” เพื่อดูวันว่างถัดไปของแต่ละบ้านพัก"
                : "Try selecting different dates or showing all villas."}
            </p>
            <div className="flex justify-center gap-2">
              <StandardButton
                variant="secondary"
                size="md"
                onClick={() => setOnlyAvailable(false)}
              >
                <span>{language === "th" ? "แสดงทุกห้อง" : "Show All"}</span>
              </StandardButton>
              <StandardButton
                variant="primary"
                size="md"
                onClick={openCalendarDrawer}
              >
                <span>
                  {language === "th" ? "เลือกวันใหม่" : "Change Dates"}
                </span>
              </StandardButton>
            </div>
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
