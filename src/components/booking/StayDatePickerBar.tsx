"use client";

import React from "react";
import { Calendar, ChevronDown, Users } from "lucide-react";
import { formatStayDateRangePill, LanguageCode } from "@/lib/dateFormatters";
import type { CalendarWeatherSummary } from "@/components/booking/RoomAvailabilityCalendarGrid";

export type { CalendarWeatherSummary };

export interface DailyAvailabilityInfo {
  freeRoomsCount: number;
  heldRoomsCount: number;
  totalActiveRooms: number;
  isSpecialOrHoliday?: boolean;
  rateBadgeTh?: string;
}

export interface StayDatePickerBarProps {
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  stayNights: number;
  availableRoomUnitsCount: number;
  isCalendarOpen?: boolean;
  onOpenCalendarDrawer: () => void;
  isCompact?: boolean;
  className?: string;
}

export function StayDatePickerBar({
  language,
  checkInDate,
  checkOutDate,
  guestCount,
  stayNights,
  availableRoomUnitsCount,
  isCalendarOpen = false,
  onOpenCalendarDrawer,
  isCompact = false,
  className = "",
}: StayDatePickerBarProps) {
  return (
    <button
      type="button"
      onClick={onOpenCalendarDrawer}
      aria-label={
        language === "th"
          ? "เลือกวันเข้าพักและเช็คสถานะห้องว่าง"
          : "Select stay dates and room availability"
      }
      aria-expanded={isCalendarOpen}
      className={`group inline-flex items-center justify-between lg:justify-start gap-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] transition-all cursor-pointer select-none active:scale-[0.99] ${
        isCalendarOpen ? "ring-2 ring-[var(--color-accent)]" : ""
      } ${
        isCompact
          ? "flex-1 lg:flex-initial h-11 lg:h-10 px-4"
          : "w-full sm:w-auto h-11 px-4"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-2 min-w-0 truncate">
        <Calendar className="w-4 h-4 text-[var(--color-accent)] shrink-0" />

        <span className="ty-body font-bold whitespace-nowrap">
          {formatStayDateRangePill(checkInDate, checkOutDate, language)}
        </span>

        <span className="ty-caption font-semibold text-[var(--color-accent)] shrink-0">
          · {language === "th" ? `${stayNights} คืน` : `${stayNights}N`}
        </span>

        <span className="hidden sm:inline-flex items-center gap-1 ty-caption font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
          <span>·</span>
          <Users className="w-3.5 h-3.5 hidden md:inline" />
          <span>
            {language === "th" ? `${guestCount} ท่าน` : `${guestCount} Guests`}
          </span>
        </span>
      </span>

      <span className="inline-flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              availableRoomUnitsCount > 0
                ? "bg-[var(--color-success)]"
                : "bg-[var(--color-error)]"
            }`}
          />
          <span>
            {availableRoomUnitsCount > 0
              ? language === "th"
                ? `ว่าง ${availableRoomUnitsCount}`
                : `${availableRoomUnitsCount} left`
              : language === "th"
              ? "เต็ม"
              : "Full"}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 shrink-0 ${
            isCalendarOpen ? "rotate-180 text-[var(--color-accent)]" : ""
          }`}
        />
      </span>
    </button>
  );
}
