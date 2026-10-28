"use client";

import React, { useMemo, useRef } from "react";
import { BedDouble, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BookingRecord,
  RoomLodge,
  SeasonalRateRule,
  SpecialDateRateOverride,
} from "@/data/rooms";
import {
  addDaysToDate,
  calculateNightlyRateForDate,
  formatDateStr,
  getRoomInventoryForRange,
} from "@/lib/store";
import {
  formatMonthYearLabel,
  LanguageCode,
  SHORT_DAYS_EN,
  SHORT_DAYS_TH,
} from "@/lib/dateFormatters";

export interface CalendarWeatherSummary {
  currentTemp?: number;
  daily?: ReadonlyArray<{ dateStr: string; tempAvg: number }>;
}

export interface RoomAvailabilityCalendarGridProps {
  language: LanguageCode;
  rooms: RoomLodge[];
  selectedRoomId: string;
  onSelectRoomId: (roomId: string) => void;
  calendarMonth: Date;
  onChangeCalendarMonth: (nextMonth: Date) => void;
  checkInDate: string;
  onChangeCheckInDate: (dateString: string) => void;
  checkOutDate: string;
  onChangeCheckOutDate: (dateString: string) => void;
  bookings?: BookingRecord[];
  seasonalRates?: SeasonalRateRule[];
  specialDateRates?: SpecialDateRateOverride[];
  weather?: CalendarWeatherSummary | null;
  todayDate?: Date;
  fillContainerHeight?: boolean;
}

interface CalendarDayColumn {
  date: Date;
  dateStr: string;
  nextDateStr: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeekLabel: string;
  averageTempC: number;
}

const ROOM_COLUMN_WIDTH_CLASS = "w-[92px] sm:w-[100px] shrink-0";
const DATE_COLUMN_WIDTH_CLASS = "w-[80px] sm:w-[84px] shrink-0";

export function RoomAvailabilityCalendarGrid({
  language,
  rooms,
  selectedRoomId,
  onSelectRoomId,
  calendarMonth,
  onChangeCalendarMonth,
  checkInDate,
  onChangeCheckInDate,
  checkOutDate,
  onChangeCheckOutDate,
  bookings = [],
  seasonalRates = [],
  specialDateRates = [],
  weather = null,
  todayDate,
  fillContainerHeight = false,
}: RoomAvailabilityCalendarGridProps) {
  const calendarScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCalendarRef = useRef(false);
  const hasDraggedCalendarRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const normalizedToday = useMemo(() => {
    const baseDate = todayDate ? new Date(todayDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }, [todayDate]);

  const todayDateStr = useMemo(
    () => formatDateStr(normalizedToday),
    [normalizedToday]
  );

  const minimumMonthDate = useMemo(
    () =>
      new Date(normalizedToday.getFullYear(), normalizedToday.getMonth(), 1),
    [normalizedToday]
  );

  const activeYear = calendarMonth.getFullYear();
  const activeMonthIndex = calendarMonth.getMonth();
  const totalDaysInMonth = new Date(
    activeYear,
    activeMonthIndex + 1,
    0
  ).getDate();

  const isViewingCurrentMonth =
    activeYear === normalizedToday.getFullYear() &&
    activeMonthIndex === normalizedToday.getMonth();

  const canNavigatePrevMonth =
    activeYear > minimumMonthDate.getFullYear() ||
    (activeYear === minimumMonthDate.getFullYear() &&
      activeMonthIndex > minimumMonthDate.getMonth());

  const monthHeaderLabel = formatMonthYearLabel(
    activeMonthIndex,
    activeYear,
    language
  );

  const firstVisibleDayNumber = isViewingCurrentMonth
    ? normalizedToday.getDate()
    : 1;

  const visibleMonthDays = useMemo<CalendarDayColumn[]>(() => {
    const dayCount = Math.max(1, totalDaysInMonth - firstVisibleDayNumber + 1);

    return Array.from({ length: dayCount }, (_, dayOffset) => {
      const dayNumber = firstVisibleDayNumber + dayOffset;
      const cellDate = new Date(activeYear, activeMonthIndex, dayNumber);
      const cellDateStr = formatDateStr(cellDate);
      const nextDateStr = formatDateStr(addDaysToDate(cellDate, 1));
      const dailyForecast = weather?.daily?.find(
        (forecastItem) => forecastItem.dateStr === cellDateStr
      );
      const averageTempC =
        dailyForecast?.tempAvg ??
        weather?.currentTemp ??
        21 - (dayNumber % 3);
      const dayOfWeekIndex = cellDate.getDay();
      const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

      return {
        date: cellDate,
        dateStr: cellDateStr,
        nextDateStr,
        dayNumber,
        isToday: cellDateStr === todayDateStr,
        isWeekend,
        dayOfWeekLabel:
          language === "th"
            ? SHORT_DAYS_TH[dayOfWeekIndex]
            : SHORT_DAYS_EN[dayOfWeekIndex],
        averageTempC,
      };
    });
  }, [
    totalDaysInMonth,
    firstVisibleDayNumber,
    activeYear,
    activeMonthIndex,
    weather,
    todayDateStr,
    language,
  ]);

  const focusedRoom =
    rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;

  const handleSelectRoomAndDate = (targetRoom: RoomLodge, targetDate: Date) => {
    if (hasDraggedCalendarRef.current) {
      hasDraggedCalendarRef.current = false;
      return;
    }

    const clickedDateStr = formatDateStr(targetDate);
    if (clickedDateStr < todayDateStr) {
      return;
    }

    const clickedNextDateStr = formatDateStr(addDaysToDate(targetDate, 1));
    const singleNightInventory = getRoomInventoryForRange(
      targetRoom,
      clickedDateStr,
      clickedNextDateStr,
      bookings
    );
    const isClickedDayAvailable =
      singleNightInventory.state === "AVAILABLE" &&
      singleNightInventory.availableUnits > 0;

    if (!isClickedDayAvailable) {
      return;
    }

    const isSameFocusedRoom = focusedRoom?.id === targetRoom.id;
    onSelectRoomId(targetRoom.id);

    if (!isSameFocusedRoom) {
      onChangeCheckInDate(clickedDateStr);
      onChangeCheckOutDate(clickedNextDateStr);
      return;
    }

    const currentStartStr = checkInDate || todayDateStr;
    const currentEndStr = checkOutDate || clickedNextDateStr;
    const currentStayNights = Math.max(
      1,
      Math.round(
        (new Date(currentEndStr + "T00:00:00").getTime() -
          new Date(currentStartStr + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const shouldExtendDateRange =
      (currentStayNights === 1 && clickedDateStr !== currentStartStr) ||
      (currentStayNights > 1 && clickedDateStr >= currentEndStr);

    if (shouldExtendDateRange) {
      const candidateStartStr =
        clickedDateStr < currentStartStr ? clickedDateStr : currentStartStr;
      const candidateEndStr =
        clickedDateStr < currentStartStr ? currentEndStr : clickedNextDateStr;
      const rangeInventory = getRoomInventoryForRange(
        targetRoom,
        candidateStartStr,
        candidateEndStr,
        bookings
      );

      if (
        rangeInventory.state === "AVAILABLE" &&
        rangeInventory.availableUnits > 0
      ) {
        onChangeCheckInDate(candidateStartStr);
        onChangeCheckOutDate(candidateEndStr);
        return;
      }
    }

    onChangeCheckInDate(clickedDateStr);
    onChangeCheckOutDate(clickedNextDateStr);
  };

  const handleHorizontalScrollStep = (direction: "left" | "right") => {
    const scrollDelta = direction === "left" ? -320 : 320;
    calendarScrollContainerRef.current?.scrollBy({
      left: scrollDelta,
      behavior: "smooth",
    });
  };

  const handleCalendarMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!calendarScrollContainerRef.current) {
      return;
    }
    isDraggingCalendarRef.current = true;
    hasDraggedCalendarRef.current = false;
    dragStartXRef.current =
      event.pageX - calendarScrollContainerRef.current.offsetLeft;
    dragStartScrollLeftRef.current =
      calendarScrollContainerRef.current.scrollLeft;
  };

  const handleCalendarMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCalendarRef.current || !calendarScrollContainerRef.current) {
      return;
    }
    const pointerX =
      event.pageX - calendarScrollContainerRef.current.offsetLeft;
    const dragOffset = pointerX - dragStartXRef.current;
    if (Math.abs(dragOffset) > 5) {
      hasDraggedCalendarRef.current = true;
    }
    calendarScrollContainerRef.current.scrollLeft =
      dragStartScrollLeftRef.current - dragOffset;
  };

  const handleCalendarMouseUpOrLeave = () => {
    isDraggingCalendarRef.current = false;
  };

  const handleJumpToToday = () => {
    onChangeCalendarMonth(minimumMonthDate);
    if (focusedRoom) {
      handleSelectRoomAndDate(focusedRoom, normalizedToday);
    }
    calendarScrollContainerRef.current?.scrollTo({
      left: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={
        fillContainerHeight ? "flex-1 flex flex-col min-h-0" : "flex flex-col"
      }
    >
      {/* Fixed-Geometry Month Stepper & Horizontal Day Scroll Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--color-background-card)] shrink-0">
        {/* Fixed-width centered month label prevents Prev/Next buttons from shifting across months */}
        <div className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] p-0.5 shrink-0">
          <button
            type="button"
            disabled={!canNavigatePrevMonth}
            onClick={() => {
              if (!canNavigatePrevMonth) {
                return;
              }
              onChangeCalendarMonth(
                new Date(activeYear, activeMonthIndex - 1, 1)
              );
              if (calendarScrollContainerRef.current) {
                calendarScrollContainerRef.current.scrollLeft = 0;
              }
            }}
            aria-label={language === "th" ? "เดือนก่อนหน้า" : "Previous month"}
            title={language === "th" ? "เดือนก่อนหน้า" : "Previous month"}
            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition ${
              canNavigatePrevMonth
                ? "hover:bg-[var(--color-background-card)] text-[var(--color-text-primary)] cursor-pointer"
                : "opacity-30 text-[var(--color-text-disabled)] cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h4 className="w-[132px] sm:w-[144px] text-center ty-body font-bold text-[var(--color-text-primary)] tabular-nums truncate select-none px-1">
            {monthHeaderLabel}
          </h4>

          <button
            type="button"
            onClick={() => {
              onChangeCalendarMonth(
                new Date(activeYear, activeMonthIndex + 1, 1)
              );
              if (calendarScrollContainerRef.current) {
                calendarScrollContainerRef.current.scrollLeft = 0;
              }
            }}
            aria-label={language === "th" ? "เดือนถัดไป" : "Next month"}
            title={language === "th" ? "เดือนถัดไป" : "Next month"}
            className="h-8 w-8 rounded-full hover:bg-[var(--color-background-card)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-background-muted)] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => handleHorizontalScrollStep("left")}
            aria-label="Scroll calendar left"
            className="h-8 w-8 rounded-full hover:bg-[var(--color-background-card)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleJumpToToday}
            className="h-8 px-3 rounded-full bg-[var(--color-background-card)] hover:opacity-90 ty-caption font-semibold text-[var(--color-text-primary)] shadow-2xs transition cursor-pointer"
          >
            {language === "th" ? "วันนี้" : "Today"}
          </button>
          <button
            type="button"
            onClick={() => handleHorizontalScrollStep("right")}
            aria-label="Scroll calendar right"
            className="h-8 w-8 rounded-full hover:bg-[var(--color-background-card)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unified 2D Sticky Availability Matrix (Exact Column Symmetry + Scales to 30-50 Rooms) */}
      <div
        ref={calendarScrollContainerRef}
        onMouseDown={handleCalendarMouseDown}
        onMouseMove={handleCalendarMouseMove}
        onMouseUp={handleCalendarMouseUpOrLeave}
        onMouseLeave={handleCalendarMouseUpOrLeave}
        className={`${
          fillContainerHeight
            ? "flex-1 min-h-0 overflow-auto overscroll-contain"
            : "overflow-x-auto"
        } select-none cursor-grab active:cursor-grabbing no-scrollbar`}
      >
        <div role="grid" className="min-w-max pr-4 pb-4 flex flex-col">
          {/* Sticky Top Date Header Row — Open Canvas (No Card Boxes, Visually Distinct from Price Tiles) */}
          <div
            role="row"
            className="sticky top-0 z-20 flex items-stretch bg-[var(--color-background-card)] pb-2"
          >
            {/* Top-Left Pinned Axis Label (Open Canvas) */}
            <div
              role="columnheader"
              className="sticky left-0 z-30 pl-4 pr-1.5 bg-[var(--color-background-card)] shrink-0 flex items-end"
            >
              <div
                className={`${ROOM_COLUMN_WIDTH_CLASS} h-[56px] px-1.5 pb-1 flex flex-col justify-end`}
              >
                <span className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-text-secondary)]">
                  <BedDouble className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === "th" ? "ห้องพัก" : "Rooms"}</span>
                </span>
                <span className="ty-caption font-medium text-[var(--color-text-secondary)]/80 tabular-nums">
                  {rooms.length} {language === "th" ? "รายการ" : "listed"}
                </span>
              </div>
            </div>

            {/* Day Column Headers — Clean Typographic Axis on Open Canvas */}
            <div className="flex items-stretch gap-1.5">
              {visibleMonthDays.map((dayColumn) => {
                const isDateWithinStayRange =
                  Boolean(checkInDate && checkOutDate) &&
                  dayColumn.dateStr >= checkInDate &&
                  dayColumn.dateStr < checkOutDate;

                return (
                  <button
                    key={dayColumn.dateStr}
                    type="button"
                    role="columnheader"
                    onClick={() => {
                      if (focusedRoom) {
                        handleSelectRoomAndDate(focusedRoom, dayColumn.date);
                      }
                    }}
                    className={`${DATE_COLUMN_WIDTH_CLASS} h-[56px] rounded-[12px] py-1 px-1 flex flex-col items-center justify-center transition cursor-pointer hover:bg-[var(--color-overlay-hover)]`}
                  >
                    <span
                      className={`ty-caption leading-none ${
                        isDateWithinStayRange
                          ? "text-[var(--color-accent)] font-bold"
                          : dayColumn.isWeekend
                          ? "text-[var(--color-text-primary)] font-semibold"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {dayColumn.dayOfWeekLabel}
                    </span>
                    <span
                      className={`my-0.5 h-6 min-w-6 px-3 rounded-full inline-flex items-center justify-center ty-body font-bold tabular-nums leading-none transition ${
                        isDateWithinStayRange
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-2xs"
                          : dayColumn.isToday
                          ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {dayColumn.dayNumber}
                    </span>
                    <span className="ty-caption leading-none tabular-nums text-[var(--color-text-secondary)]">
                      {dayColumn.averageTempC}°C
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Nightly Rate Rows */}
          {rooms.length === 0 ? (
            <div className="px-4 py-8 text-center ty-body-muted">
              {language === "th"
                ? "ไม่พบห้องว่างในช่วงวันที่เลือก ลองเลื่อนเลือกวันอื่นด้านบน"
                : "No available rooms match this filter. Try another date above."}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rooms.map((room) => {
                const isFocusedRoom = focusedRoom?.id === room.id;

                return (
                  <div
                    key={room.id}
                    role="row"
                    className="flex items-stretch"
                  >
                    {/* Sticky Left Room Row Header — Clean Open-Canvas Label + Active Accent Indicator */}
                    <div className="sticky left-0 z-10 pl-4 pr-1.5 bg-[var(--color-background-card)] shrink-0">
                      <button
                        type="button"
                        role="rowheader"
                        onClick={() => onSelectRoomId(room.id)}
                        className={`${ROOM_COLUMN_WIDTH_CLASS} relative h-[70px] pl-3 pr-3 text-left flex flex-col justify-center transition cursor-pointer ${
                          isFocusedRoom
                            ? ""
                            : "bg-transparent hover:bg-[var(--color-overlay-hover)]"
                        }`}
                      >
                        {isFocusedRoom && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0.5 top-2 bottom-2 w-1 rounded-full bg-[var(--color-accent)]"
                          />
                        )}
                        <span
                          className={`ty-body font-bold leading-tight truncate ${
                            isFocusedRoom
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-text-primary)]"
                          }`}
                        >
                          {room.code}
                        </span>
                        <span className="ty-caption whitespace-nowrap leading-tight mt-0.5 tabular-nums">
                          {room.baseGuests}–{room.maxGuests}{" "}
                          {language === "th" ? "ท่าน" : "guests"}
                        </span>
                      </button>
                    </div>

                    {/* Nightly Rate Cells — ONLY Selectable Data Cells Render as Tonal Tiles */}
                    <div className="flex items-stretch gap-1.5 mt-2">
                      {visibleMonthDays.map((dayColumn) => {
                        const dayInventory = getRoomInventoryForRange(
                          room,
                          dayColumn.dateStr,
                          dayColumn.nextDateStr,
                          bookings
                        );
                        const isDayAvailable =
                          dayInventory.state === "AVAILABLE" &&
                          dayInventory.availableUnits > 0;
                        const isCellSelected =
                          isFocusedRoom &&
                          Boolean(checkInDate && checkOutDate) &&
                          dayColumn.dateStr >= checkInDate &&
                          dayColumn.dateStr < checkOutDate;
                        const nightlyRateBreakdown = calculateNightlyRateForDate(
                          room,
                          dayColumn.dateStr,
                          seasonalRates,
                          specialDateRates
                        );

                        return (
                          <button
                            key={`${room.id}-${dayColumn.dateStr}`}
                            type="button"
                            role="gridcell"
                            disabled={!isDayAvailable}
                            onClick={() =>
                              handleSelectRoomAndDate(room, dayColumn.date)
                            }
                            className={`${DATE_COLUMN_WIDTH_CLASS} h-[50px] rounded-[12px] p-1.5 flex items-center justify-center text-center transition ${
                              !isDayAvailable
                                ? "bg-[var(--color-background-muted)]/45 cursor-not-allowed"
                                : isCellSelected
                                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-2xs cursor-pointer"
                                : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] cursor-pointer"
                            }`}
                          >
                            {isDayAvailable ? (
                              <span
                                className={`ty-caption tabular-nums leading-none ${
                                  isCellSelected
                                    ? "font-bold !text-[var(--color-on-accent)]"
                                    : "font-medium text-[var(--color-text-primary)]"
                                }`}
                              >
                                ฿
                                {nightlyRateBreakdown.finalNightlyRate.toLocaleString()}
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-[var(--color-error)] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
