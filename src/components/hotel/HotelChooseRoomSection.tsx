"use client";

import React, { useMemo, useState } from "react";
import { Images, Search, X } from "lucide-react";
import {
  calculateStayPricing,
  computeNightsBetween,
  getRequiredMinNightsForStay,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
} from "@/lib/mediaUtils";
import type {
  HotelDiscountRuleDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

const INITIAL_VISIBLE_HOTEL_ROOMS = 4;

export interface HotelChooseRoomSectionProps {
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  hasConfirmedDates: boolean;
  isRefreshingDates: boolean;
  guests: number;
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>;
  discountRules?: ReadonlyArray<HotelDiscountRuleDto>;
  selectedRoomId: string | null;
  fallbackCoverUrl: string;
  onOpenDatePicker: () => void;
  onSelectRoom: (room: RoomAvailabilityDto) => void;
}

export function HotelChooseRoomSection({
  language,
  checkInDate,
  checkOutDate,
  hasConfirmedDates,
  isRefreshingDates,
  guests,
  rooms,
  dateOverrides,
  discountRules = [],
  selectedRoomId,
  fallbackCoverUrl,
  onOpenDatePicker,
  onSelectRoom,
}: HotelChooseRoomSectionProps) {
  const isTh = language === "th";
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");

  const stayNights = useMemo(
    () => computeNightsBetween(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );

  const displayPool = useMemo(() => {
    // After user selects dates, strictly show ONLY available rooms that fit guests (Airbnb Hotel behavior)
    const base = hasConfirmedDates
      ? rooms.filter((r) => r.availableUnits > 0 && r.maxGuests >= guests)
      : [...rooms];

    const q = roomSearchQuery.trim().toLowerCase();
    const searched = q
      ? base.filter(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.nameTh.toLowerCase().includes(q) ||
            r.nameEn.toLowerCase().includes(q) ||
            r.categoryTh.toLowerCase().includes(q) ||
            r.categoryEn.toLowerCase().includes(q)
        )
      : base;

    return searched
      .map((room) => {
        const pricing = calculateStayPricing({
          room,
          checkInDate,
          checkOutDate,
          guests,
          overrides: dateOverrides,
          discountRules,
        });
        const requiredMinNights = hasConfirmedDates
          ? getRequiredMinNightsForStay(
              room.id,
              checkInDate,
              checkOutDate,
              dateOverrides
            )
          : 1;
        return { room, pricing, requiredMinNights };
      })
      .sort((a, b) => {
        if (hasConfirmedDates) {
          return a.pricing.netTotalThb - b.pricing.netTotalThb;
        }
        return a.room.sortOrder - b.room.sortOrder;
      });
  }, [
    rooms,
    hasConfirmedDates,
    guests,
    roomSearchQuery,
    checkInDate,
    checkOutDate,
    dateOverrides,
    discountRules,
  ]);

  const isSearchActive = roomSearchQuery.trim().length > 0;
  const visibleEntries = useMemo(
    () =>
      showAllRooms || isSearchActive
        ? displayPool
        : displayPool.slice(0, INITIAL_VISIBLE_HOTEL_ROOMS),
    [displayPool, showAllRooms, isSearchActive]
  );

  return (
    <section
      id="section-rooms"
      className="py-8 lg:py-10 space-y-5 scroll-mt-20 lg:scroll-mt-32"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h2 className="ty-title text-[var(--color-text-primary)]">
            {isTh ? "เลือกประเภทห้องพัก" : "Choose your room"}
          </h2>
          <p className="ty-caption text-[var(--color-text-secondary)]">
            {isRefreshingDates
              ? isTh
                ? "กำลังอัปเดตสถานะห้องว่าง..."
                : "Updating live room availability..."
              : hasConfirmedDates
              ? isTh
                ? `ว่างพร้อมเข้าพัก ${displayPool.length} แบบห้อง (${formatShortDate(
                    checkInDate,
                    language
                  )} – ${formatShortDate(checkOutDate, language)} · ${guests} ท่าน)`
                : `${displayPool.length} room ${
                    displayPool.length === 1 ? "type" : "types"
                  } available (${formatShortDate(
                    checkInDate,
                    language
                  )} – ${formatShortDate(checkOutDate, language)} · ${guests} ${
                    guests === 1 ? "guest" : "guests"
                  })`
              : isTh
              ? `มีทั้งหมด ${rooms.length} แบบห้อง · เช็กวันว่างเพื่อดูห้องที่เปิดให้จองและราคาจริง`
              : `${rooms.length} room types · Check availability for exact dates & pricing`}
          </p>
        </div>

        {rooms.length > 6 && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              placeholder={isTh ? "ค้นหาชื่อห้อง..." : "Search room..."}
              aria-label={isTh ? "ค้นหาประเภทห้องพัก" : "Search rooms"}
              className="h-9 w-[176px] sm:w-[204px] pl-8 pr-7 rounded-[10px] bg-[var(--color-background-muted)] border border-transparent focus:border-[var(--color-text-primary)] focus:bg-[var(--color-background-card)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none transition-colors"
            />
            {roomSearchQuery && (
              <button
                type="button"
                onClick={() => setRoomSearchQuery("")}
                aria-label="Clear room search"
                className="absolute right-2 h-5 w-5 rounded-[6px] hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State when no rooms match selected dates/guests */}
      {displayPool.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--color-background-muted)] p-6 text-center space-y-3">
          <h3 className="ty-subtitle font-semibold text-[var(--color-text-primary)]">
            {isSearchActive
              ? isTh
                ? `ไม่พบห้องพักที่ตรงกับ "${roomSearchQuery}"`
                : `No rooms match "${roomSearchQuery}"`
              : isTh
              ? `ไม่มีห้องว่างสำหรับวันที่ ${formatShortDate(
                  checkInDate,
                  language
                )} – ${formatShortDate(checkOutDate, language)} (${guests} ท่าน)`
              : `No rooms available for ${formatShortDate(
                  checkInDate,
                  language
                )} – ${formatShortDate(checkOutDate, language)} (${guests} ${
                  guests === 1 ? "guest" : "guests"
                })`}
          </h3>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            {isTh
              ? "ลองเลือกวันเข้าพักใหม่ หรือปรับจำนวนผู้เข้าพักเพื่อดูห้องที่เปิดว่าง"
              : "Try different dates or adjust the number of guests to see open rooms."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenDatePicker}
              className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13.5px] font-semibold cursor-pointer transition-colors"
            >
              {isTh ? "เปลี่ยนวันเข้าพัก" : "Change dates"}
            </button>
            {isSearchActive && (
              <button
                type="button"
                onClick={() => setRoomSearchQuery("")}
                className="h-10 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                {isTh ? "ล้างคำค้นหา" : "Clear search"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          id="rooms-list-section"
          className="divide-y divide-[var(--color-border)] scroll-mt-20 lg:scroll-mt-32"
        >
          {visibleEntries.map(({ room, pricing, requiredMinNights }) => {
            const roomCover = room.galleryUrls[0] || fallbackCoverUrl;
            const isSelected = selectedRoomId === room.id;

            return (
              <div
                key={room.id}
                className="py-3.5 first:pt-0 last:pb-0"
              >
                <article
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRoom(room)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectRoom(room);
                    }
                  }}
                  className={`group flex items-center gap-4 rounded-[20px] p-2.5 -mx-2.5 cursor-pointer transition-colors focus:outline-none ${
                    isSelected && hasConfirmedDates
                      ? "bg-[var(--color-background-muted)]"
                      : "bg-transparent hover:bg-[var(--color-background-muted)]/70"
                  }`}
                >
                  {/* Left Room Photo Thumbnail (Square + Super-Rounded) */}
                  <div className="relative w-[108px] sm:w-[136px] aspect-square rounded-[18px] sm:rounded-[20px] overflow-hidden bg-[var(--color-background-subtle)] shrink-0 group-hover:brightness-95 transition">
                    <img
                      src={getOptimizedPinImageUrl(roomCover, "gallery")}
                      srcSet={getOptimizedPinImageSrcSet(roomCover, "gallery")}
                      sizes="(max-width: 639px) 120px, 180px"
                      alt={
                        room.galleryMeta?.[0]?.captionTh ||
                        (isTh ? room.nameTh : room.nameEn)
                      }
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {room.galleryUrls.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[7px] bg-black/65 backdrop-blur-md text-white text-[10.5px] font-semibold inline-flex items-center gap-1">
                        <Images className="w-3 h-3" />
                        {room.galleryUrls.length}
                      </span>
                    )}
                  </div>

                  {/* Right Room Summary (Airbnb Horizontal Clean Hierarchy) */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-[15.5px] sm:text-[16.5px] font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-2">
                      {isTh ? room.nameTh : room.nameEn}
                    </h3>

                    <p className="text-[13.5px] text-[var(--color-text-secondary)] truncate">
                      {isTh
                        ? `${room.beds} เตียง · สูงสุด ${room.maxGuests} ท่าน · ${room.sizeSqm} ตร.ม.`
                        : `${room.beds} ${room.beds === 1 ? "bed" : "beds"} · ${
                            room.maxGuests
                          } ${
                            room.maxGuests === 1 ? "guest" : "guests"
                          } · ${room.sizeSqm} sqm`}
                    </p>

                    <div className="pt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      {hasConfirmedDates ? (
                        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                          {pricing.discountThb > 0 && (
                            <span className="text-[13px] font-normal line-through text-[var(--color-text-secondary)] mr-1.5">
                              ฿{pricing.roomSubtotalThb.toLocaleString()}
                            </span>
                          )}
                          ฿{pricing.netTotalThb.toLocaleString()}
                          <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">
                            {" "}
                            {isTh
                              ? `สำหรับ ${stayNights} คืน`
                              : `for ${stayNights} ${
                                  stayNights === 1 ? "night" : "nights"
                                }`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                          <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">
                            {isTh ? "เริ่มต้น " : "From "}
                          </span>
                          ฿{room.weekdayPriceThb.toLocaleString()}
                          <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">
                            {" "}
                            / {isTh ? "คืน" : "night"}
                          </span>
                        </p>
                      )}

                      {hasConfirmedDates && room.availableUnits <= 2 && (
                        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                          ·{" "}
                          {isTh
                            ? `เหลือ ${room.availableUnits} ห้อง`
                            : `${room.availableUnits} left`}
                        </span>
                      )}

                      {hasConfirmedDates &&
                        requiredMinNights > stayNights && (
                          <span className="text-[12px] font-medium text-[var(--color-error)]">
                            ·{" "}
                            {isTh
                              ? `เข้าพักขั้นต่ำ ${requiredMinNights} คืน`
                              : `Min. ${requiredMinNights} nights`}
                          </span>
                        )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}

      {/* Show all N rooms button (Full-width muted squircle — exact Airbnb Hotel pattern) */}
      {displayPool.length > INITIAL_VISIBLE_HOTEL_ROOMS && !isSearchActive && (
        <button
          type="button"
          onClick={() => setShowAllRooms((v) => !v)}
          className="w-full h-12 px-6 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
        >
          {showAllRooms
            ? isTh
              ? "ย่อรายการห้องพัก"
              : "Show fewer rooms"
            : isTh
            ? `แสดงห้องพักทั้งหมด (${displayPool.length} ห้อง)`
            : `Show all ${displayPool.length} rooms`}
        </button>
      )}
    </section>
  );
}
