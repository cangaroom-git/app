"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Minus,
  Plus,
  Calendar,
  X,
  Search,
} from "lucide-react";
import { formatDateStr, addDaysToDate } from "@/lib/store";

type Lang = "th" | "en";

export interface DailyAvailabilityInfo {
  freeRoomsCount: number;
  heldRoomsCount: number;
  totalActiveRooms: number;
  isSpecialOrHoliday?: boolean;
  rateBadgeTh?: string;
}

interface AgodaBookingBarProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  checkIn: string;
  setCheckIn: (dateStr: string) => void;
  checkOut: string;
  setCheckOut: (dateStr: string) => void;
  guests: number;
  setGuests: (guests: number) => void;
  nights: number;
  freeCount: number;
  totalRoomsCount: number;
  pendingAdminCount: number;
  onOpenDesignSystem: () => void;
  getDailyAvailability: (dateStr: string) => DailyAvailabilityInfo;
  brandCode?: string;
  brandNameTh?: string;
  brandNameEn?: string;
  primaryColor?: string;
  currentTempC?: number | null;
  weatherCityLabel?: string;
  onSearchRooms?: () => void;
}

const WEEKDAYS_MON_FIRST_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_MON_FIRST_TH = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const WEEKDAYS_SUN_FIRST_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const WEEKDAYS_SUN_FIRST_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS_SHORT_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const MONTHS_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG_TH = [
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
const MONTHS_LONG_EN = [
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

function formatAgodaDateMain(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  if (lang === "th") {
    return `${day} ${MONTHS_SHORT_TH[m]} ${y + 543}`;
  }
  return `${day} ${MONTHS_SHORT_EN[m]} ${y}`;
}

function formatCompactMobileDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const m = d.getMonth();
  return lang === "th"
    ? `${day} ${MONTHS_SHORT_TH[m]}`
    : `${day} ${MONTHS_SHORT_EN[m]}`;
}

function formatAgodaWeekday(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const dow = d.getDay();
  return lang === "th"
    ? WEEKDAYS_SUN_FIRST_TH[dow]
    : WEEKDAYS_SUN_FIRST_EN[dow];
}

function formatMonthTitle(monthDate: Date, lang: Lang): string {
  const m = monthDate.getMonth();
  const y = monthDate.getFullYear();
  return lang === "th"
    ? `${MONTHS_LONG_TH[m]} ${y + 543}`
    : `${MONTHS_LONG_EN[m]} ${y}`;
}

function buildMondayFirstMonthGrid(
  year: number,
  month: number,
  todayStr: string,
  getDailyAvailability: (dateStr: string) => DailyAvailabilityInfo
) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{
    dateStr: string | null;
    dayNumber: number | null;
    isPast: boolean;
    isWeekend: boolean;
    availability: DailyAvailabilityInfo | null;
  }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({
      dateStr: null,
      dayNumber: null,
      isPast: false,
      isWeekend: false,
      availability: null,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = formatDateStr(d);
    const dow = d.getDay();
    const isPast = dateStr < todayStr;
    cells.push({
      dateStr,
      dayNumber: day,
      isPast,
      isWeekend: dow === 5 || dow === 6,
      availability: isPast ? null : getDailyAvailability(dateStr),
    });
  }

  return cells;
}

export function AgodaBookingBar({
  lang,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  nights,
  freeCount,
  totalRoomsCount,
  getDailyAvailability,
  onSearchRooms,
}: AgodaBookingBarProps) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);

  const [activePopover, setActivePopover] = useState<
    "none" | "checkin" | "checkout" | "guests"
  >("none");

  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"dates" | "guests">(
    "dates"
  );
  const [mobileDateStep, setMobileDateStep] = useState<"checkin" | "checkout">(
    "checkin"
  );

  const [hoverDateStr, setHoverDateStr] = useState<string | null>(null);

  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const d = new Date(checkIn + "T00:00:00");
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      fallback.setDate(1);
      return fallback;
    }
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const rightMonth = useMemo(
    () => new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1),
    [leftMonth]
  );

  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [adultsCount, setAdultsCount] = useState<number>(Math.max(1, guests));
  const [childrenCount, setChildrenCount] = useState<number>(0);

  const updateGuestsBreakdown = (newAdults: number, newChildren: number) => {
    const clampedAdults = Math.max(1, Math.min(8, newAdults));
    const clampedChildren = Math.max(0, Math.min(6, newChildren));
    setAdultsCount(clampedAdults);
    setChildrenCount(clampedChildren);
    setGuests(clampedAdults + clampedChildren);
  };

  useEffect(() => {
    if (adultsCount + childrenCount !== guests) {
      setAdultsCount(Math.max(1, guests - childrenCount));
    }
  }, [guests, adultsCount, childrenCount]);

  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActivePopover("none");
        setHoverDateStr(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const leftGrid = useMemo(
    () =>
      buildMondayFirstMonthGrid(
        leftMonth.getFullYear(),
        leftMonth.getMonth(),
        todayStr,
        getDailyAvailability
      ),
    [leftMonth, todayStr, getDailyAvailability]
  );

  const rightGrid = useMemo(
    () =>
      buildMondayFirstMonthGrid(
        rightMonth.getFullYear(),
        rightMonth.getMonth(),
        todayStr,
        getDailyAvailability
      ),
    [rightMonth, todayStr, getDailyAvailability]
  );

  const handleSelectCalendarDate = (
    clickedDateStr: string,
    mode: "desktop" | "mobile"
  ) => {
    const currentStep =
      mode === "desktop"
        ? activePopover === "checkout"
          ? "checkout"
          : "checkin"
        : mobileDateStep;

    if (currentStep === "checkin") {
      setCheckIn(clickedDateStr);
      if (clickedDateStr >= checkOut) {
        const nextDay = formatDateStr(
          addDaysToDate(new Date(clickedDateStr + "T00:00:00"), 1)
        );
        setCheckOut(nextDay);
      }
      if (mode === "desktop") {
        setActivePopover("checkout");
      } else {
        setMobileDateStep("checkout");
      }
      setHoverDateStr(null);
    } else {
      if (clickedDateStr <= checkIn) {
        setCheckIn(clickedDateStr);
        const nextDay = formatDateStr(
          addDaysToDate(new Date(clickedDateStr + "T00:00:00"), 1)
        );
        setCheckOut(nextDay);
      } else {
        setCheckOut(clickedDateStr);
        if (mode === "desktop") {
          setActivePopover("none");
        } else {
          setMobileDateStep("checkin");
        }
        setHoverDateStr(null);
      }
    }
  };

  const scrollToRooms = () => {
    setActivePopover("none");
    setMobileSheetOpen(false);
    if (onSearchRooms) {
      onSearchRooms();
      return;
    }
    const el = document.getElementById("rooms");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderCustomAvailabilityMonth = (
    monthDate: Date,
    grid: ReturnType<typeof buildMondayFirstMonthGrid>,
    navMode: "both" | "leftOnly" | "rightOnly",
    deviceMode: "desktop" | "mobile"
  ) => {
    const weekdays =
      lang === "th" ? WEEKDAYS_MON_FIRST_TH : WEEKDAYS_MON_FIRST_EN;
    const isSelectingCheckout =
      (deviceMode === "desktop" && activePopover === "checkout") ||
      (deviceMode === "mobile" && mobileDateStep === "checkout");

    const effectiveEnd =
      isSelectingCheckout && hoverDateStr && hoverDateStr > checkIn
        ? hoverDateStr
        : checkOut;

    return (
      <div className="flex-1 min-w-[270px]">
        <div className="flex items-center justify-between mb-3 px-1">
          {navMode === "both" || navMode === "leftOnly" ? (
            <button
              type="button"
              onClick={() =>
                setLeftMonth(
                  new Date(
                    leftMonth.getFullYear(),
                    leftMonth.getMonth() - 1,
                    1
                  )
                )
              }
              className="h-8 w-8 rounded-full bg-[#0000000f] hover:bg-[#00000018] flex items-center justify-center text-[#171717] transition cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <h4 className="text-[14px] font-semibold text-[#171717]">
            {formatMonthTitle(monthDate, lang)}
          </h4>

          {navMode === "both" || navMode === "rightOnly" ? (
            <button
              type="button"
              onClick={() =>
                setLeftMonth(
                  new Date(
                    leftMonth.getFullYear(),
                    leftMonth.getMonth() + 1,
                    1
                  )
                )
              }
              className="h-8 w-8 rounded-full bg-[#0000000f] hover:bg-[#00000018] flex items-center justify-center text-[#171717] transition cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-[#737373] mb-1.5">
          {weekdays.map((dayLabel) => (
            <span key={dayLabel} className="py-1">
              {dayLabel}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((cell, idx) => {
            if (!cell.dateStr || cell.dayNumber === null) {
              return <div key={idx} className="h-12" />;
            }

            const dateStr = cell.dateStr;
            const isStart = dateStr === checkIn;
            const isEnd = dateStr === effectiveEnd;
            const isInRange = dateStr > checkIn && dateStr < effectiveEnd;
            const avail = cell.availability;
            const free = avail?.freeRoomsCount ?? 0;

            let badgeText = "";
            let badgeColorClass = "text-[var(--color-text-secondary)]";
            if (!cell.isPast && avail) {
              if (free === 0) {
                badgeText = lang === "th" ? "เต็ม" : "Full";
                badgeColorClass =
                  isStart || isEnd
                    ? "text-[var(--color-on-accent)] opacity-80"
                    : "text-[var(--color-error)]";
              } else {
                badgeText = lang === "th" ? `ว่าง ${free}` : `${free} left`;
                badgeColorClass =
                  isStart || isEnd
                    ? "text-[var(--color-on-accent)] opacity-80"
                    : "text-[var(--color-text-secondary)] font-medium";
              }
            }

            return (
              <div
                key={dateStr}
                onMouseEnter={() => {
                  if (
                    deviceMode === "desktop" &&
                    !cell.isPast &&
                    activePopover === "checkout"
                  ) {
                    setHoverDateStr(dateStr);
                  }
                }}
                onMouseLeave={() => {
                  if (
                    deviceMode === "desktop" &&
                    activePopover === "checkout"
                  ) {
                    setHoverDateStr(null);
                  }
                }}
                className="relative h-12 flex items-center justify-center select-none"
              >
                {(isInRange || isStart || isEnd) &&
                  effectiveEnd > checkIn && (
                    <div
                      className={`absolute inset-y-1 bg-[var(--color-background-muted)] z-0 ${
                        isStart
                          ? "left-1/2 right-0"
                          : isEnd
                          ? "left-0 right-1/2"
                          : "inset-x-0"
                      }`}
                    />
                  )}

                <button
                  type="button"
                  disabled={cell.isPast}
                  onClick={() => handleSelectCalendarDate(dateStr, deviceMode)}
                  className={`relative z-10 w-10 h-11 rounded-[10px] flex flex-col items-center justify-center transition ${
                    cell.isPast
                      ? "text-[var(--color-text-disabled)] cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold cursor-pointer shadow-xs"
                      : isInRange
                      ? "text-[var(--color-text-primary)] font-semibold hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                      : free === 0
                      ? "text-[var(--color-text-disabled)] hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                      : "text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                  }`}
                >
                  {avail?.isSpecialOrHoliday &&
                    !cell.isPast &&
                    !isStart &&
                    !isEnd && (
                      <span
                        className="w-1 h-1 rounded-full bg-[var(--color-text-primary)] mb-0.5"
                        title={avail.rateBadgeTh}
                      />
                    )}
                  <span className="text-xs leading-none">{cell.dayNumber}</span>
                  {!cell.isPast && (
                    <span
                      className={`text-[9px] mt-1 leading-none tracking-tight ${badgeColorClass}`}
                    >
                      {badgeText}
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

  const renderGuestsControls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[#171717]">
            {lang === "th" ? "ห้องพัก" : "Rooms"}
          </div>
          <div className="text-[12px] text-[#737373]">
            {lang === "th"
              ? `มีห้องว่างรวม ${freeCount} ยูนิตในวันที่เลือก`
              : `${freeCount} units available`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={roomsCount <= 1}
            onClick={() => setRoomsCount((r) => Math.max(1, r - 1))}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              roomsCount <= 1
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Minus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-[14px] font-semibold text-[#171717]">
            {roomsCount}
          </span>
          <button
            type="button"
            disabled={roomsCount >= totalRoomsCount}
            onClick={() =>
              setRoomsCount((r) => Math.min(totalRoomsCount, r + 1))
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              roomsCount >= totalRoomsCount
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[#171717]">
            {lang === "th" ? "ผู้ใหญ่" : "Adults"}
          </div>
          <div className="text-[12px] text-[#737373]">
            {lang === "th" ? "อายุ 18 ปีขึ้นไป" : "Ages 18 or above"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={adultsCount <= 1}
            onClick={() =>
              updateGuestsBreakdown(adultsCount - 1, childrenCount)
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              adultsCount <= 1
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Minus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-[14px] font-semibold text-[#171717]">
            {adultsCount}
          </span>
          <button
            type="button"
            disabled={adultsCount + childrenCount >= 6}
            onClick={() =>
              updateGuestsBreakdown(adultsCount + 1, childrenCount)
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              adultsCount + childrenCount >= 6
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[#171717]">
            {lang === "th" ? "เด็ก" : "Children"}
          </div>
          <div className="text-[12px] text-[#737373]">
            {lang === "th" ? "อายุ 0-17 ปี" : "Ages 0-17"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={childrenCount <= 0}
            onClick={() =>
              updateGuestsBreakdown(adultsCount, childrenCount - 1)
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              childrenCount <= 0
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Minus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-[14px] font-semibold text-[#171717]">
            {childrenCount}
          </span>
          <button
            type="button"
            disabled={adultsCount + childrenCount >= 6}
            onClick={() =>
              updateGuestsBreakdown(adultsCount, childrenCount + 1)
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              adultsCount + childrenCount >= 6
                ? "bg-[#f1f1f1] text-[#a3a3a3] cursor-not-allowed"
                : "bg-[#0000000f] text-[#171717] hover:bg-[#00000018] cursor-pointer"
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={barRef} className="w-full relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        {/* ===================================================================
            MOBILE COMPACT UNIFIED BOOKING BAR (< sm)
        ==================================================================== */}
        <div className="sm:hidden w-full flex items-center justify-between h-12 rounded-full bg-[var(--color-background-card)] shadow-xs border border-[var(--color-border)] p-1.5">
          <button
            type="button"
            onClick={() => {
              setMobileSheetOpen((prev) => !prev);
              setMobileActiveTab("dates");
            }}
            className="flex-1 flex items-center gap-2.5 px-2.5 text-left text-[var(--color-text-primary)] min-w-0 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--color-neutral)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="truncate leading-tight">
              <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                {formatCompactMobileDate(checkIn, lang)} –{" "}
                {formatCompactMobileDate(checkOut, lang)} ({nights}{" "}
                {lang === "th" ? "คืน" : "nights"})
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                {lang === "th"
                  ? `ผู้ใหญ่ ${adultsCount}${
                      childrenCount > 0 ? `, เด็ก ${childrenCount}` : ""
                    } · ว่าง ${freeCount} ยูนิต`
                  : `${adultsCount} Adults${
                      childrenCount > 0 ? `, ${childrenCount} Child` : ""
                    } · ${freeCount} left`}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={scrollToRooms}
            className="h-9 px-3.5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:opacity-90 text-[12px] font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{lang === "th" ? "ค้นหา" : "Search"}</span>
          </button>
        </div>

        {/* ===================================================================
            DESKTOP & TABLET UNIFIED BOOKING BAR (>= sm) — Non-Overflowing Grid
            Fits 100% cleanly inside the 760px centered feed container
        ==================================================================== */}
        <div className="hidden sm:grid grid-cols-12 relative items-center w-full h-[56px] rounded-full bg-[var(--color-background-card)] shadow-xs border border-[var(--color-border)] p-1.5 gap-1">
          {/* 1. CHECK-IN SEGMENT (col-span-3) */}
          <button
            type="button"
            onClick={() =>
              setActivePopover(
                activePopover === "checkin" ? "none" : "checkin"
              )
            }
            className={`col-span-3 min-w-0 relative flex items-center gap-2.5 px-3 h-full rounded-full text-left transition cursor-pointer ${
              activePopover === "checkin"
                ? "bg-[var(--color-neutral)]"
                : "hover:bg-[var(--color-overlay-hover)]"
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-[var(--color-neutral)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] truncate">
                {lang === "th" ? "เช็คอิน" : "Check-in"}
              </span>
              <span className="block text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                {formatAgodaDateMain(checkIn, lang)}{" "}
              </span>
            </div>
          </button>

          {/* 2. CHECK-OUT SEGMENT (col-span-3) */}
          <button
            type="button"
            onClick={() =>
              setActivePopover(
                activePopover === "checkout" ? "none" : "checkout"
              )
            }
            className={`col-span-3 min-w-0 relative flex items-center gap-2.5 px-3 h-full rounded-full text-left transition cursor-pointer ${
              activePopover === "checkout"
                ? "bg-[var(--color-neutral)]"
                : "hover:bg-[var(--color-overlay-hover)]"
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-[var(--color-neutral)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] truncate">
                {lang === "th"
                  ? `เช็คเอาท์ (${nights} คืน)`
                  : `Check-out (${nights} nights)`}
              </span>
              <span className="block text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                {formatAgodaDateMain(checkOut, lang)}{" "}
              </span>
            </div>
          </button>

          {/* 3. GUESTS & AVAILABILITY SEGMENT (col-span-4) */}
          <div className="col-span-4 min-w-0 relative flex items-stretch h-full">
            <button
              type="button"
              onClick={() =>
                setActivePopover(
                  activePopover === "guests" ? "none" : "guests"
                )
              }
              className={`w-full min-w-0 relative flex items-center justify-between gap-2 px-3 h-full rounded-full text-left transition cursor-pointer ${
                activePopover === "guests"
                  ? "bg-[var(--color-neutral)]"
                  : "hover:bg-[var(--color-overlay-hover)]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-full bg-[var(--color-neutral)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] truncate">
                    {lang === "th"
                      ? `ผู้เข้าพัก · ว่าง ${freeCount} ยูนิต`
                      : `Guests · ${freeCount} available`}
                  </span>
                  <span className="block text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                    {lang === "th"
                      ? `ผู้ใหญ่ ${adultsCount}${
                          childrenCount > 0 ? `, เด็ก ${childrenCount}` : ""
                        } · ${roomsCount} ห้อง`
                      : `${adultsCount} Adults${
                          childrenCount > 0 ? `, ${childrenCount} Child` : ""
                        } · ${roomsCount} ${roomsCount > 1 ? "Rooms" : "Room"}`}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform ${
                  activePopover === "guests" ? "rotate-180" : ""
                }`}
              />
            </button>

            {activePopover === "guests" && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[320px] rounded-[20px] bg-[var(--color-background-popover)] shadow-[0_16px_40px_rgba(0,0,0,0.16)] border border-[var(--color-border)] p-5 z-50">
                {renderGuestsControls()}
              </div>
            )}
          </div>

          {/* 4. COMPACT PILL CTA BUTTON (col-span-2) */}
          <button
            type="button"
            onClick={scrollToRooms}
            className="col-span-2 h-full px-3 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:opacity-90 font-semibold text-[14px] flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === "th" ? "ค้นหา" : "Search"}
            </span>
          </button>

          {/* CUSTOM DAILY ROOM AVAILABILITY DATEPICKER DROPDOWN */}
          {(activePopover === "checkin" || activePopover === "checkout") && (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] w-full rounded-[20px] bg-[var(--color-background-popover)] shadow-[0_16px_40px_rgba(0,0,0,0.16)] border border-[var(--color-border)] p-5 z-50">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {activePopover === "checkin"
                      ? lang === "th"
                        ? "เลือกวันเช็คอิน (แสดงจำนวนห้องว่างรายวัน)"
                        : "Select Check-in Date (Daily room availability)"
                      : lang === "th"
                      ? "เลือกวันเช็คเอาท์"
                      : "Select Check-out Date"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn(formatDateStr(today));
                      setCheckOut(formatDateStr(addDaysToDate(today, 1)));
                      setActivePopover("none");
                    }}
                    className="rounded-full bg-[var(--color-neutral)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] px-3 py-1 text-[12px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
                  >
                    {lang === "th" ? "คืนนี้ (1 คืน)" : "Tonight (1 night)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn(formatDateStr(addDaysToDate(today, 1)));
                      setCheckOut(formatDateStr(addDaysToDate(today, 3)));
                      setActivePopover("none");
                    }}
                    className="rounded-full bg-[var(--color-neutral)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] px-3 py-1 text-[12px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
                  >
                    {lang === "th" ? "2 คืนสุดฮิต" : "Popular 2 Nights"}
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex gap-8">
                {renderCustomAvailabilityMonth(
                  leftMonth,
                  leftGrid,
                  "leftOnly",
                  "desktop"
                )}
                {renderCustomAvailabilityMonth(
                  rightMonth,
                  rightGrid,
                  "rightOnly",
                  "desktop"
                )}
              </div>
              <div className="lg:hidden">
                {renderCustomAvailabilityMonth(
                  leftMonth,
                  leftGrid,
                  "both",
                  "desktop"
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-[13px]">
                <div className="font-medium text-[var(--color-text-primary)]">
                  {formatAgodaDateMain(checkIn, lang)} →{" "}
                  {formatAgodaDateMain(checkOut, lang)} ({nights}{" "}
                  {lang === "th" ? "คืน" : "nights"}) ·{" "}
                  <span
                    className={
                      freeCount > 0
                        ? "text-[var(--color-text-primary)] font-semibold"
                        : "text-[var(--color-error)] font-semibold"
                    }
                  >
                    {freeCount > 0
                      ? lang === "th"
                        ? `ว่างพร้อมจอง ${freeCount} ยูนิต`
                        : `${freeCount} units available`
                      : lang === "th"
                      ? "เต็มทุกห้องในวันที่เลือก"
                      : "Sold out on selected dates"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopover("none")}
                  className="rounded-full bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-on-accent)] font-medium px-5 py-2 text-[13px] transition cursor-pointer"
                >
                  {lang === "th" ? "ตกลง" : "Done"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SLIDE-DOWN FILTER & AVAILABILITY SHEET (< sm) */}
      <div
        className={`sm:hidden fixed inset-0 top-0 z-50 transition-all duration-300 ${
          mobileSheetOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          onClick={() => setMobileSheetOpen(false)}
        />

        <div
          className={`relative bg-[var(--color-background-card)] rounded-b-[24px] shadow-xl border-b border-[var(--color-border)] p-4 max-h-[82vh] overflow-y-auto transition-transform duration-300 ease-out ${
            mobileSheetOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="grid grid-cols-2 flex-1 bg-[var(--color-background-muted)] p-1 rounded-full text-[12px] font-medium">
              <button
                type="button"
                onClick={() => setMobileActiveTab("dates")}
                className={`py-2 rounded-full transition cursor-pointer ${
                  mobileActiveTab === "dates"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {lang === "th"
                  ? `วันเข้าพัก (${nights} คืน)`
                  : `Stay Dates (${nights} nights)`}
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab("guests")}
                className={`py-2 rounded-full transition cursor-pointer ${
                  mobileActiveTab === "guests"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {lang === "th"
                  ? `ผู้เข้าพัก (${guests} ท่าน)`
                  : `Guests (${guests})`}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="h-9 w-9 rounded-full bg-[var(--color-neutral)] flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {mobileActiveTab === "dates" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileDateStep("checkin")}
                  className={`rounded-[12px] border p-2.5 text-left transition cursor-pointer ${
                    mobileDateStep === "checkin"
                      ? "border-[var(--color-accent)] bg-[var(--color-background-muted)]"
                      : "border-[var(--color-border)] bg-[var(--color-background-card)]"
                  }`}
                >
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                    {lang === "th" ? "วันเช็คอิน (14:00)" : "Check-in (14:00)"}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {formatAgodaDateMain(checkIn, lang)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDateStep("checkout")}
                  className={`rounded-[12px] border p-2.5 text-left transition cursor-pointer ${
                    mobileDateStep === "checkout"
                      ? "border-[var(--color-accent)] bg-[var(--color-background-muted)]"
                      : "border-[var(--color-border)] bg-[var(--color-background-card)]"
                  }`}
                >
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                    {lang === "th"
                      ? "วันเช็คเอาท์ (12:00)"
                      : "Check-out (12:00)"}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {formatAgodaDateMain(checkOut, lang)}
                  </span>
                </button>
              </div>

              <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-3">
                {renderCustomAvailabilityMonth(
                  leftMonth,
                  leftGrid,
                  "both",
                  "mobile"
                )}
              </div>
            </div>
          ) : (
            <div className="py-2 px-1">{renderGuestsControls()}</div>
          )}

          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="text-[12px]">
              <span className="text-[var(--color-text-secondary)] block">
                {lang === "th" ? "สถานะห้องว่าง" : "Availability"}
              </span>
              <span
                className={`font-semibold ${
                  freeCount > 0
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-error)]"
                }`}
              >
                {freeCount > 0
                  ? lang === "th"
                    ? `ว่างพร้อมจอง ${freeCount} ยูนิต`
                    : `${freeCount} units available`
                  : lang === "th"
                  ? "เต็มทุกห้องในวันที่เลือก"
                  : "Sold out on selected dates"}
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToRooms}
              className="rounded-full bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-on-accent)] font-medium text-[13px] px-5 py-2.5 cursor-pointer"
            >
              {lang === "th"
                ? `ดูห้องพักที่ว่าง (${freeCount} ยูนิต)`
                : `View Rooms (${freeCount} left)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
