"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import type {
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_TH = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function buildMondayFirstMonthCells(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: Array<{ dateStr: string; dayNumber: number } | null> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({
      dateStr: `${year}-${mm}-${dd}`,
      dayNumber: d,
    });
  }
  return cells;
}

export interface AirbnbStayCalendarProps {
  language: LanguageCode;
  todayDate: Date;
  checkInDate: string;
  checkOutDate: string;
  onChangeDates: (nextIn: string, nextOut: string) => void;
  guests: number;
  onChangeGuests?: (nextGuests: number) => void;
  stayNights: number;
  hotelName: string;
  rooms: RoomAvailabilityDto[];
  calendarRoomFilterId: string;
  onChangeCalendarRoomFilterId: (roomId: string) => void;
  bookedUnitsByRoomDate: Record<string, number>;
  dateOverrides: RoomDateOverrideDto[];
  headingPrefix?: string;
}

export function AirbnbStayCalendar({
  language,
  todayDate,
  checkInDate,
  checkOutDate,
  onChangeDates,
  guests,
  stayNights,
  hotelName,
  rooms,
  calendarRoomFilterId,
  onChangeCalendarRoomFilterId,
  bookedUnitsByRoomDate,
  dateOverrides,
  headingPrefix = "",
}: AirbnbStayCalendarProps) {
  const [selectingPhase, setSelectingPhase] = useState<"checkin" | "checkout">(
    "checkin"
  );
  const [pendingCheckIn, setPendingCheckIn] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const isTh = language === "th";
  const todayStr = useMemo(() => formatDateStr(todayDate), [todayDate]);

  const [baseYearMonth, setBaseYearMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const d = checkInDate ? new Date(`${checkInDate}T00:00:00`) : todayDate;
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const leftMonth = baseYearMonth;
  const rightMonth = useMemo(() => {
    if (leftMonth.month === 11) {
      return { year: leftMonth.year + 1, month: 0 };
    }
    return { year: leftMonth.year, month: leftMonth.month + 1 };
  }, [leftMonth]);

  const selectedScopeRoom = useMemo(
    () =>
      calendarRoomFilterId === "ALL"
        ? null
        : rooms.find((r) => r.id === calendarRoomFilterId) ?? null,
    [calendarRoomFilterId, rooms]
  );

  const overrideByRoomDate = useMemo(() => {
    const map = new Map<string, RoomDateOverrideDto>();
    for (const ov of dateOverrides) {
      map.set(`${ov.roomId}:${ov.dateStr}`, ov);
    }
    return map;
  }, [dateOverrides]);

  const getRoomFreeUnitsOnDate = useCallback(
    (rm: RoomAvailabilityDto, dateStr: string) => {
      const ov = overrideByRoomDate.get(`${rm.id}:${dateStr}`);
      const blocked = ov?.blockedUnits ?? 0;
      const booked = bookedUnitsByRoomDate[`${rm.id}:${dateStr}`] ?? 0;
      return Math.max(0, rm.totalUnits - blocked - booked);
    },
    [overrideByRoomDate, bookedUnitsByRoomDate]
  );

  const isNightSoldOut = useCallback(
    (dateStr: string): boolean => {
      if (rooms.length === 0) return false;
      if (selectedScopeRoom) {
        return getRoomFreeUnitsOnDate(selectedScopeRoom, dateStr) <= 0;
      }
      const eligibleRooms = rooms.filter((r) => r.maxGuests >= guests);
      const pool = eligibleRooms.length > 0 ? eligibleRooms : rooms;
      return !pool.some((r) => getRoomFreeUnitsOnDate(r, dateStr) > 0);
    },
    [getRoomFreeUnitsOnDate, guests, rooms, selectedScopeRoom]
  );

  const activeStartDate =
    selectingPhase === "checkout" && pendingCheckIn
      ? pendingCheckIn
      : checkInDate;

  // When picking check-out, allow checking out on the morning of the first sold-out night, but never spanning across it
  const firstSoldOutAfterCheckIn = useMemo<string | null>(() => {
    if (selectingPhase !== "checkout" || !activeStartDate) return null;
    let cursor = activeStartDate;
    for (let i = 0; i < 92; i++) {
      if (isNightSoldOut(cursor)) {
        return cursor;
      }
      cursor = addDaysToDate(cursor, 1);
    }
    return null;
  }, [activeStartDate, isNightSoldOut, selectingPhase]);

  const canGoPrevMonth =
    leftMonth.year > todayDate.getFullYear() ||
    (leftMonth.year === todayDate.getFullYear() &&
      leftMonth.month > todayDate.getMonth());

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setBaseYearMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  };

  const handleNextMonth = () => {
    setBaseYearMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  };

  const handleDayClick = (dateStr: string) => {
    if (dateStr < todayStr) return;

    if (
      selectingPhase === "checkin" ||
      !pendingCheckIn ||
      dateStr <= pendingCheckIn
    ) {
      if (isNightSoldOut(dateStr)) return;
      setPendingCheckIn(dateStr);
      setSelectingPhase("checkout");
      setHoverDate(null);
    } else {
      if (
        firstSoldOutAfterCheckIn !== null &&
        dateStr > firstSoldOutAfterCheckIn
      ) {
        return;
      }
      onChangeDates(pendingCheckIn, dateStr);
      setPendingCheckIn(null);
      setSelectingPhase("checkin");
      setHoverDate(null);
    }
  };

  const handleResetDates = () => {
    let candidate = addDaysToDate(todayStr, 1);
    for (let i = 0; i < 60; i++) {
      if (!isNightSoldOut(candidate)) break;
      candidate = addDaysToDate(candidate, 1);
    }
    const nextOut = addDaysToDate(candidate, 1);
    setPendingCheckIn(null);
    onChangeDates(candidate, nextOut);
    setSelectingPhase("checkin");
    setHoverDate(null);
  };

  const effectiveRangeEnd =
    selectingPhase === "checkout"
      ? hoverDate && activeStartDate && hoverDate > activeStartDate
        ? hoverDate
        : ""
      : checkOutDate;

  const weekdayLabels = isTh ? WEEKDAYS_TH : WEEKDAYS_EN;

  const formatMonthTitle = (year: number, monthIdx: number) =>
    isTh
      ? `${MONTHS_TH[monthIdx]} ${year + 543}`
      : `${MONTHS_EN[monthIdx]} ${year}`;

  const renderMonthGrid = (year: number, monthIdx: number) => {
    const cells = buildMondayFirstMonthCells(year, monthIdx);
    return (
      <div className="w-full select-none">
        <div className="grid grid-cols-7 mb-1.5">
          {weekdayLabels.map((wd) => (
            <div
              key={wd}
              className="h-7 flex items-center justify-center text-[12px] font-semibold text-[var(--color-text-secondary)]"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-11" />;
            }

            const { dateStr, dayNumber } = cell;
            const isPast = dateStr < todayStr;
            const isSoldOut = !isPast && isNightSoldOut(dateStr);
            const isBlockedBeyondGap =
              selectingPhase === "checkout" &&
              dateStr > activeStartDate &&
              firstSoldOutAfterCheckIn !== null &&
              dateStr > firstSoldOutAfterCheckIn;
            const canUseAsCheckoutMorning =
              selectingPhase === "checkout" &&
              dateStr > activeStartDate &&
              firstSoldOutAfterCheckIn === dateStr;
            const isDisabled =
              isPast ||
              isBlockedBeyondGap ||
              (isSoldOut && !canUseAsCheckoutMorning);

            const isStart = dateStr === activeStartDate;
            const isEnd = Boolean(effectiveRangeEnd) && dateStr === effectiveRangeEnd;
            const isBetween =
              Boolean(effectiveRangeEnd) &&
              dateStr > activeStartDate &&
              dateStr < effectiveRangeEnd;
            const hasRange =
              Boolean(effectiveRangeEnd) && effectiveRangeEnd > activeStartDate;
            const showStrikethrough =
              (isPast || isSoldOut) && !isStart && !isEnd;

            return (
              <div
                key={dateStr}
                onMouseEnter={() => {
                  if (!isDisabled && selectingPhase === "checkout") {
                    setHoverDate(dateStr);
                  }
                }}
                onMouseLeave={() => {
                  if (selectingPhase === "checkout") {
                    setHoverDate(null);
                  }
                }}
                className="relative h-11 flex items-center justify-center"
              >
                {hasRange && isBetween && (
                  <div className="absolute inset-x-0 inset-y-1 bg-[var(--color-background-muted)] pointer-events-none" />
                )}
                {hasRange && isStart && (
                  <div className="absolute left-1/2 right-0 inset-y-1 bg-[var(--color-background-muted)] pointer-events-none" />
                )}
                {hasRange && isEnd && (
                  <div className="absolute left-0 right-1/2 inset-y-1 bg-[var(--color-background-muted)] pointer-events-none" />
                )}

                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(dateStr)}
                  aria-label={`${dateStr}${
                    isSoldOut ? (isTh ? " ห้องเต็ม" : " sold out") : ""
                  }`}
                  className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center text-[14px] transition-colors tabular-nums ${
                    isStart || isEnd
                      ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] font-semibold cursor-pointer"
                      : isDisabled
                      ? `text-[var(--color-text-disabled)] cursor-not-allowed ${
                          showStrikethrough
                            ? "line-through decoration-[1.5px]"
                            : ""
                        }`
                      : showStrikethrough
                      ? "text-[var(--color-text-disabled)] line-through decoration-[1.5px] hover:bg-[var(--color-background-muted)] cursor-pointer"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-medium cursor-pointer"
                  }`}
                >
                  {dayNumber}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 isolate">
      <div className="space-y-1">
        <h2 className="ty-title text-[var(--color-text-primary)]">
          {selectingPhase === "checkout"
            ? isTh
              ? `${headingPrefix}เลือกวันเช็กเอาต์`
              : `${headingPrefix}Select check-out date`
            : isTh
            ? `${headingPrefix}${stayNights} คืนที่ ${hotelName}`
            : `${headingPrefix}${stayNights} ${
                stayNights === 1 ? "night" : "nights"
              } in ${hotelName}`}
        </h2>
        <p className="ty-caption text-[var(--color-text-secondary)]">
          {selectingPhase === "checkout" && pendingCheckIn
            ? `${formatShortDate(pendingCheckIn, language)} – ${
                isTh ? "เลือกวันเช็กเอาต์" : "Select checkout"
              }`
            : `${formatShortDate(checkInDate, language)} – ${formatShortDate(
                checkOutDate,
                language
              )}`}
          {selectedScopeRoom && rooms.length > 1
            ? isTh
              ? ` · ปฏิทินว่างเฉพาะห้อง ${selectedScopeRoom.code}`
              : ` · Availability for room ${selectedScopeRoom.code}`
            : ""}
        </p>
      </div>

      <div className="space-y-3 pt-1">
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <button
            type="button"
            disabled={!canGoPrevMonth}
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] inline-flex items-center justify-center transition-colors ${
              canGoPrevMonth
                ? "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] cursor-pointer"
                : "text-[var(--color-text-disabled)] cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h3 className="text-center text-[15px] font-semibold text-[var(--color-text-primary)]">
            {formatMonthTitle(leftMonth.year, leftMonth.month)}
          </h3>

          <h3 className="hidden sm:block text-center text-[15px] font-semibold text-[var(--color-text-primary)]">
            {formatMonthTitle(rightMonth.year, rightMonth.month)}
          </h3>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div>{renderMonthGrid(leftMonth.year, leftMonth.month)}</div>
          <div className="hidden sm:block">
            {renderMonthGrid(rightMonth.year, rightMonth.month)}
          </div>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-end gap-2">
        {selectedScopeRoom && rooms.length > 1 && (
          <button
            type="button"
            onClick={() => onChangeCalendarRoomFilterId("ALL")}
            className="h-8 px-3 rounded-[9px] text-[13px] font-semibold text-[var(--color-text-primary)] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] cursor-pointer transition-colors"
          >
            {isTh ? "ดูรวมทุกห้อง" : "All rooms"}
          </button>
        )}
        <button
          type="button"
          onClick={handleResetDates}
          className="h-8 px-2.5 rounded-[9px] text-[13.5px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline underline-offset-2 cursor-pointer shrink-0 transition-colors"
        >
          {isTh ? "ล้างวันที่" : "Clear dates"}
        </button>
      </div>
    </div>
  );
}
