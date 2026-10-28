"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Search,
  Tag,
  X,
} from "lucide-react";
import {
  BookingRecord,
  RoomLodge,
  SeasonalRateRule,
  SpecialDateRateOverride,
} from "@/data/rooms";
import { getRoomInventoryForRange, StayPricingBreakdown } from "@/lib/store";
import { LanguageCode } from "@/lib/dateFormatters";
import {
  CalendarWeatherSummary,
  RoomAvailabilityCalendarGrid,
} from "@/components/booking/RoomAvailabilityCalendarGrid";

export interface BookingCalendarStepProps {
  language: LanguageCode;
  rooms: RoomLodge[];
  selectedRoom: RoomLodge;
  onSelectRoom: (room: RoomLodge) => void;
  calendarMonth: Date;
  onChangeCalendarMonth: (nextMonth: Date) => void;
  checkInDate: string;
  onChangeCheckInDate: (dateString: string) => void;
  checkOutDate: string;
  onChangeCheckOutDate: (dateString: string) => void;
  pricingBreakdown: StayPricingBreakdown;
  bookings: BookingRecord[];
  seasonalRates: SeasonalRateRule[];
  specialDateRates: SpecialDateRateOverride[];
  weather: CalendarWeatherSummary | null;
  todayDate: Date;
  onOpenPhotoGallery?: (room: RoomLodge) => void;
}

export function BookingCalendarStep({
  language,
  rooms,
  selectedRoom,
  onSelectRoom,
  calendarMonth,
  onChangeCalendarMonth,
  checkInDate,
  onChangeCheckInDate,
  checkOutDate,
  onChangeCheckOutDate,
  pricingBreakdown,
  bookings,
  seasonalRates,
  specialDateRates,
  weather,
  todayDate,
  onOpenPhotoGallery,
}: BookingCalendarStepProps) {
  const photoTrackRef = useRef<HTMLDivElement | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");

  const availableRoomIdsForRange = useMemo(() => {
    const availableSet = new Set<string>();
    for (const candidateRoom of rooms) {
      if (!checkInDate || !checkOutDate) {
        availableSet.add(candidateRoom.id);
        continue;
      }
      const inventory = getRoomInventoryForRange(
        candidateRoom,
        checkInDate,
        checkOutDate,
        bookings
      );
      if (inventory.state === "AVAILABLE" && inventory.availableUnits > 0) {
        availableSet.add(candidateRoom.id);
      }
    }
    return availableSet;
  }, [rooms, checkInDate, checkOutDate, bookings]);

  const filteredRooms = useMemo(() => {
    const normalizedQuery = roomSearchQuery.trim().toLowerCase();
    return rooms.filter((candidateRoom) => {
      if (showAvailableOnly && !availableRoomIdsForRange.has(candidateRoom.id)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        candidateRoom.code.toLowerCase().includes(normalizedQuery) ||
        candidateRoom.nameTh.toLowerCase().includes(normalizedQuery) ||
        candidateRoom.nameEn.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [rooms, showAvailableOnly, availableRoomIdsForRange, roomSearchQuery]);

  const roomPhotos = selectedRoom.images?.length
    ? selectedRoom.images
    : [
        {
          url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
          captionTh: selectedRoom.nameTh,
          captionEn: selectedRoom.nameEn,
        },
      ];
  const totalPhotosCount = roomPhotos.length;

  // Reset photo preview to first slide whenever the user selects another villa (A1 -> A2 -> A3 -> A4)
  useEffect(() => {
    setActivePhotoIndex(0);
    if (photoTrackRef.current) {
      photoTrackRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [selectedRoom.id]);

  const handleSelectRoomById = (roomId: string) => {
    const matchedRoom = rooms.find((candidate) => candidate.id === roomId);
    if (matchedRoom) {
      onSelectRoom(matchedRoom);
    }
  };

  const scrollToPhotoSlide = (targetIndex: number) => {
    const trackElement = photoTrackRef.current;
    setActivePhotoIndex(targetIndex);
    if (trackElement && trackElement.clientWidth > 0) {
      trackElement.scrollTo({
        left: targetIndex * trackElement.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleStepPhoto = (
    event: React.MouseEvent<HTMLButtonElement>,
    direction: 1 | -1
  ) => {
    event.stopPropagation();
    if (totalPhotosCount <= 1) return;
    const nextIndex =
      (activePhotoIndex + direction + totalPhotosCount) % totalPhotosCount;
    scrollToPhotoSlide(nextIndex);
  };

  const handlePhotoTrackScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const trackElement = event.currentTarget;
    if (trackElement.clientWidth <= 0) return;
    const nextIndex = Math.round(
      trackElement.scrollLeft / trackElement.clientWidth
    );
    if (
      nextIndex >= 0 &&
      nextIndex < totalPhotosCount &&
      nextIndex !== activePhotoIndex
    ) {
      setActivePhotoIndex(nextIndex);
    }
  };

  const nightlyDisplayPrice =
    pricingBreakdown.nightlyPrice || selectedRoom.basePriceThb;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--color-background-card)]">
      {/* 1. Large Swipeable Selected Room Preview + Villa Switcher */}
      <div className="px-4 pt-0.5 pb-2 shrink-0 space-y-2.5">
        <div
          onClick={() => onOpenPhotoGallery?.(selectedRoom)}
          className={`relative w-full h-[150px] sm:h-[180px] rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] select-none ${
            onOpenPhotoGallery ? "cursor-pointer group/calhero" : ""
          }`}
        >
          <div
            ref={photoTrackRef}
            onScroll={handlePhotoTrackScroll}
            className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar touch-manipulation"
          >
            {roomPhotos.map((photoItem, photoIdx) => (
              <img
                key={`${selectedRoom.id}-cal-photo-${photoIdx}`}
                src={photoItem.url}
                alt={
                  language === "th"
                    ? photoItem.captionTh || selectedRoom.nameTh
                    : photoItem.captionEn || selectedRoom.nameEn
                }
                draggable={false}
                className="h-full w-full shrink-0 snap-center snap-always object-cover"
              />
            ))}
          </div>

          <span className="absolute top-2.5 left-2.5 pointer-events-none inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 h-6 ty-caption font-bold shadow-xs">
            {selectedRoom.code}
          </span>

          {selectedRoom.discountPercent > 0 && (
            <span className="badge-promo absolute top-2.5 right-2.5 pointer-events-none shadow-xs">
              <Tag className="w-3 h-3" />
              <span>
                {language === "th"
                  ? `ลด ${selectedRoom.discountPercent}%`
                  : `-${selectedRoom.discountPercent}%`}
              </span>
            </span>
          )}

          {totalPhotosCount > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => handleStepPhoto(event, -1)}
                aria-label="Previous room photo"
                className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/calhero:opacity-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(event) => handleStepPhoto(event, 1)}
                aria-label="Next room photo"
                className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/calhero:opacity-100 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1.5">
                {roomPhotos.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`h-1.5 rounded-full shadow-xs transition-all duration-200 ${
                      dotIdx === activePhotoIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {onOpenPhotoGallery && (
            <span className="absolute bottom-2.5 right-2.5 pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md text-white px-2.5 h-6 ty-caption font-semibold">
              <Images className="w-3.5 h-3.5" />
              <span>
                {activePhotoIndex + 1}/{totalPhotosCount}
              </span>
            </span>
          )}
        </div>

        {/* Selected Room Title, Inline Specs & Scalable Availability Filter */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="ty-body font-bold truncate">
              {language === "th" ? selectedRoom.nameTh : selectedRoom.nameEn}
            </h3>
            <span className="ty-subtitle text-[var(--color-accent)] shrink-0 tabular-nums">
              ฿{nightlyDisplayPrice.toLocaleString()}
              <span className="ty-caption font-normal">
                /{language === "th" ? "คืน" : "N"}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="ty-caption whitespace-nowrap">
              {selectedRoom.sizeSqm} {language === "th" ? "ตร.ม." : "m²"} ·{" "}
              {selectedRoom.baseGuests}–{selectedRoom.maxGuests}{" "}
              {language === "th" ? "ท่าน" : "guests"}
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              {rooms.length > 6 && (
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(event) => setRoomSearchQuery(event.target.value)}
                    placeholder={language === "th" ? "ค้นหาห้อง..." : "Search..."}
                    className="h-7 w-28 sm:w-36 pl-7 pr-6 rounded-full bg-[var(--color-background-muted)] ty-caption text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--color-accent)]"
                  />
                  {roomSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRoomSearchQuery("")}
                      aria-label="Clear room search"
                      className="absolute right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAvailableOnly((previous) => !previous)}
                className={`h-7 px-3 rounded-full ty-caption font-semibold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                  showAvailableOnly
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {showAvailableOnly ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                )}
                <span>
                  {language === "th"
                    ? `เฉพาะห้องว่าง (${availableRoomIdsForRange.size})`
                    : `Available (${availableRoomIdsForRange.size})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Interactive Availability & Nightly Rate Calendar */}
      <RoomAvailabilityCalendarGrid
        language={language}
        rooms={filteredRooms}
        selectedRoomId={selectedRoom.id}
        onSelectRoomId={handleSelectRoomById}
        calendarMonth={calendarMonth}
        onChangeCalendarMonth={onChangeCalendarMonth}
        checkInDate={checkInDate}
        onChangeCheckInDate={onChangeCheckInDate}
        checkOutDate={checkOutDate}
        onChangeCheckOutDate={onChangeCheckOutDate}
        bookings={bookings}
        seasonalRates={seasonalRates}
        specialDateRates={specialDateRates}
        weather={weather}
        todayDate={todayDate}
        fillContainerHeight
      />
    </div>
  );
}
