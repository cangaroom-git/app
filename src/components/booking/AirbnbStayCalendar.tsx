"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import {
  addDaysToDate,
  calculateNightlyRateForDate,
  formatDateStr,
} from "@/lib/bookingMath";
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
  onChangeGuests: (nextGuests: number) => void;
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
  onChangeGuests,
  stayNights,
  hotelName,
  rooms,
  calendarRoomFilterId,
  onChangeCalendarRoomFilterId,
  bookedUnitsByRoomDate,
  dateOverrides,
  headingPrefix = "1. ",
}: AirbnbStayCalendarProps) {
  const [selectingPhase, setSelectingPhase] = useState<"checkin" | "checkout">(
    "checkin"
  );
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

  const maxRoomCapacity = useMemo(
    () => rooms.reduce((max, r) => Math.max(max, r.maxGuests), 1),
    [rooms]
  );

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

    if (selectingPhase === "checkin" || dateStr <= checkInDate) {
      const nextDayStr = addDaysToDate(dateStr, 1);
      onChangeDates(dateStr, nextDayStr);
      setSelectingPhase("checkout");
      setHoverDate(null);
    } else {
      onChangeDates(checkInDate, dateStr);
      setSelectingPhase("checkin");
      setHoverDate(null);
    }
  };

  const handleResetDates = () => {
    const tomorrow = addDaysToDate(todayStr, 1);
    const nextOut = addDaysToDate(tomorrow, 1);
    onChangeDates(tomorrow, nextOut);
    setSelectingPhase("checkin");
    setHoverDate(null);
  };

  const effectiveRangeEnd =
    selectingPhase === "checkout" && hoverDate && hoverDate > checkInDate
      ? hoverDate
      : checkOutDate;

  const weekdayLabels = isTh ? WEEKDAYS_TH : WEEKDAYS_EN;

  const formatMonthTitle = (year: number, monthIdx: number) =>
    isTh
      ? `${MONTHS_TH[monthIdx]} ${year + 543}`
      : `${MONTHS_EN[monthIdx]} ${year}`;

  const formatCompactRate = (thb: number) => {
    if (thb >= 1000) {
      const k = thb / 1000;
      return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return String(thb);
  };

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

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-11" />;
            }

            const { dateStr, dayNumber } = cell;
            const isPast = dateStr < todayStr;

            let isBlocked = false;
            let isPartiallyFull = false;
            let nightlyRate: number | null = null;

            if (!isPast && rooms.length > 0) {
              if (selectedScopeRoom) {
                const freeUnits = getRoomFreeUnitsOnDate(
                  selectedScopeRoom,
                  dateStr
                );
                const fitsGuests = selectedScopeRoom.maxGuests >= guests;
                isBlocked = !fitsGuests || freeUnits <= 0;
                nightlyRate = calculateNightlyRateForDate(
                  selectedScopeRoom,
                  dateStr,
                  dateOverrides
                );
                isPartiallyFull =
                  fitsGuests &&
                  freeUnits === 1 &&
                  selectedScopeRoom.totalUnits > 1;
              } else {
                const eligibleRooms = rooms.filter((r) => r.maxGuests >= guests);
                const openRooms = eligibleRooms.filter(
                  (r) => getRoomFreeUnitsOnDate(r, dateStr) > 0
                );
                isBlocked = openRooms.length === 0;
                nightlyRate =
                  openRooms.length > 0
                    ? Math.min(
                        ...openRooms.map((r) =>
                          calculateNightlyRateForDate(
                            r,
                            dateStr,
                            dateOverrides
                          )
                        )
                      )
                    : null;
                isPartiallyFull =
                  openRooms.length > 0 &&
                  eligibleRooms.length > 1 &&
                  openRooms.length < eligibleRooms.length;
              }
            }

            const isStart = dateStr === checkInDate;
            const isEnd = dateStr === effectiveRangeEnd;
            const isBetween =
              dateStr > checkInDate && dateStr < effectiveRangeEnd;
            const hasRange = effectiveRangeEnd > checkInDate;

            return (
              <div
                key={dateStr}
                onMouseEnter={() => {
                  if (!isPast && selectingPhase === "checkout") {
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
                  <div className="absolute inset-x-0 inset-y-0.5 bg-[var(--color-background-muted)] pointer-events-none" />
                )}
                {hasRange && isStart && (
                  <div className="absolute left-1/2 right-0 inset-y-0.5 bg-[var(--color-background-muted)] pointer-events-none" />
                )}
                {hasRange && isEnd && (
                  <div className="absolute left-0 right-1/2 inset-y-0.5 bg-[var(--color-background-muted)] pointer-events-none" />
                )}

                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(dateStr)}
                  aria-label={`${dateStr}${
                    isBlocked ? (isTh ? " เต็ม" : " unavailable") : ""
                  }`}
                  className={`relative z-10 h-10 w-full max-w-[44px] rounded-[10px] flex flex-col items-center justify-center transition-colors ${
                    isPast
                      ? "text-[var(--color-text-disabled)] cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] font-semibold cursor-pointer"
                      : isBlocked
                      ? "text-[var(--color-text-disabled)] line-through hover:bg-[var(--color-background-muted)]/60 cursor-pointer"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-medium cursor-pointer"
                  }`}
                >
                  {isPartiallyFull && !isStart && !isEnd && !isPast && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]"
                    />
                  )}
                  <span className="text-[13px] leading-none">{dayNumber}</span>
                  {!isPast && (isBlocked || nightlyRate) && (
                    <span
                      className={`text-[9.5px] leading-none mt-1 tabular-nums ${
                        isStart || isEnd
                          ? "opacity-85"
                          : isBlocked
                          ? "text-[var(--color-text-disabled)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {isBlocked
                        ? isTh
                          ? "เต็ม"
                          : "full"
                        : formatCompactRate(nightlyRate!)}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="ty-title text-[var(--color-text-primary)]">
          {selectingPhase === "checkout"
            ? isTh
              ? `${headingPrefix}เลือกวันเช็กเอาต์`
              : `${headingPrefix}Select check-out date`
            : isTh
            ? `${headingPrefix}เลือกวันเข้าพักและผู้เข้าพัก (${stayNights} คืนที่ ${hotelName})`
            : `${headingPrefix}Select dates & guests (${stayNights} ${
                stayNights === 1 ? "night" : "nights"
              } at ${hotelName})`}
        </h2>
        <p className="ty-caption text-[var(--color-text-secondary)]">
          {formatShortDate(checkInDate, language)} –{" "}
          {formatShortDate(checkOutDate, language)} · {guests}{" "}
          {isTh ? "ท่าน" : "guests"} ·{" "}
          {selectingPhase === "checkout"
            ? isTh
              ? "แตะวันที่ต้องการเช็กเอาต์บนปฏิทิน"
              : "Tap your check-out date"
            : selectedScopeRoom
            ? isTh
              ? `กำลังดูปฏิทินว่างเฉพาะห้อง ${selectedScopeRoom.code}`
              : `Viewing calendar for room ${selectedScopeRoom.code}`
            : isTh
            ? "เลือกวันและจำนวนผู้เข้าพักก่อน ระบบจะแสดงห้องที่ว่าง"
            : "Pick your dates first to see matching available rooms"}
        </p>
      </div>

      {/* Control Bar: Guest Stepper + Scalable Room Scope Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="h-10 px-3 rounded-[10px] bg-[var(--color-background-muted)] border border-[var(--color-border)] inline-flex items-center gap-2.5 shrink-0">
          <Users className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            {isTh ? "ผู้เข้าพัก" : "Guests"}
          </span>
          <button
            type="button"
            onClick={() => onChangeGuests(Math.max(1, guests - 1))}
            aria-label="Decrease guests"
            className="h-6 w-6 rounded-[7px] bg-[var(--color-background-card)] border border-[var(--color-border)] hover:border-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)] min-w-[40px] text-center tabular-nums">
            {guests} {isTh ? "ท่าน" : ""}
          </span>
          <button
            type="button"
            onClick={() => onChangeGuests(Math.min(12, guests + 1))}
            aria-label="Increase guests"
            className="h-6 w-6 rounded-[7px] bg-[var(--color-background-card)] border border-[var(--color-border)] hover:border-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {rooms.length > 1 && (
          <div className="flex-1 min-w-[230px] h-10 px-3 rounded-[10px] bg-[var(--color-background-muted)] border border-[var(--color-border)] flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <select
              aria-label={
                isTh ? "ตัวกรองปฏิทินห้องว่าง" : "Calendar room filter"
              }
              value={calendarRoomFilterId}
              onChange={(e) => onChangeCalendarRoomFilterId(e.target.value)}
              className="w-full bg-transparent text-[13px] font-semibold text-[var(--color-text-primary)] focus:outline-none cursor-pointer truncate"
            >
              <option value="ALL">
                {isTh
                  ? `ภาพรวมทุกแบบห้อง (${rooms.length} แบบ · ราคาเริ่มต้น)`
                  : `All room types (${rooms.length} · lowest rate)`}
              </option>
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {isTh ? "เฉพาะ" : "Only"} {rm.code} ·{" "}
                  {isTh ? rm.nameTh : rm.nameEn} (
                  {isTh ? `สูงสุด ${rm.maxGuests} ท่าน` : `max ${rm.maxGuests}`}
                  )
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {rooms.length > 0 && guests > maxRoomCapacity && (
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-muted)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-text-secondary)]">
          {isTh
            ? `ที่พักนี้รองรับสูงสุดห้องละ ${maxRoomCapacity} ท่าน หากเดินทาง ${guests} ท่านแนะนำเลือกหลายห้องรวมกันครับ`
            : `Single rooms host up to ${maxRoomCapacity} guests. Consider booking multiple rooms for ${guests} guests.`}
        </div>
      )}

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

      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-text-secondary)]">
          <span>
            {selectedScopeRoom
              ? isTh
                ? `ตัวเลข = เรทห้อง ${selectedScopeRoom.code}/คืน`
                : `Rates = ${selectedScopeRoom.code}/night`
              : isTh
              ? "ตัวเลข = ราคาเริ่มต้นของห้องที่ว่าง"
              : "Rates = lowest open room rate"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)] inline-block" />
            <span>{isTh ? "บางแบบเริ่มเต็ม" : "Limited rooms"}</span>
          </span>
          <span>
            {isTh ? 'ขีดฆ่า "เต็ม" = หมด' : 'Strikethrough "full" = sold out'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedScopeRoom && (
            <button
              type="button"
              onClick={() => onChangeCalendarRoomFilterId("ALL")}
              className="h-8 px-2.5 rounded-[9px] text-[12.5px] font-semibold text-[var(--color-text-primary)] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] cursor-pointer transition-colors"
            >
              {isTh ? "ดูรวมทุกห้อง" : "All rooms"}
            </button>
          )}
          <button
            type="button"
            onClick={handleResetDates}
            className="h-8 px-2.5 rounded-[9px] text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline cursor-pointer shrink-0 transition-colors"
          >
            {isTh ? "ล้างวันที่" : "Clear dates"}
          </button>
        </div>
      </div>
    </div>
  );
}

