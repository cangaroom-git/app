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
              className="h-8 w-8 rounded-lg border border-slate-200 hover:border-[#0063F5] hover:bg-[#EFF6FF] flex items-center justify-center text-[#121317] transition cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <h4 className="text-sm sm:text-[15px] font-bold tracking-wide text-[#121317]">
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
              className="h-8 w-8 rounded-lg border border-slate-200 hover:border-[#0063F5] hover:bg-[#EFF6FF] flex items-center justify-center text-[#121317] transition cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {weekdays.map((dayLabel, i) => (
            <span
              key={dayLabel}
              className={`py-1 ${i >= 4 ? "text-[#0063F5]" : ""}`}
            >
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
            const total = avail?.totalActiveRooms ?? totalRoomsCount;

            let badgeText = "";
            let badgeColorClass = "text-slate-400";
            if (!cell.isPast && avail) {
              if (free === 0) {
                badgeText = lang === "th" ? "เต็ม" : "Full";
                badgeColorClass =
                  isStart || isEnd ? "text-red-100" : "text-rose-600/80";
              } else if (free >= Math.ceil(total * 0.5)) {
                badgeText = lang === "th" ? `ว่าง ${free}` : `${free} left`;
                badgeColorClass =
                  isStart || isEnd
                    ? "text-white"
                    : "text-[#0063F5] font-semibold";
              } else {
                badgeText = lang === "th" ? `ว่าง ${free}` : `${free} left`;
                badgeColorClass =
                  isStart || isEnd
                    ? "text-amber-100"
                    : "text-amber-600 font-semibold";
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
                      className={`absolute inset-y-1 bg-[#EFF6FF] z-0 ${
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
                  className={`relative z-10 w-10 h-11 rounded-xl flex flex-col items-center justify-center transition ${
                    cell.isPast
                      ? "text-slate-300 cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[#0063F5] text-white font-bold shadow-[0_4px_12px_rgba(0,99,245,0.28)] cursor-pointer"
                      : isInRange
                      ? "text-[#0063F5] font-bold hover:bg-[#DBEAFE] cursor-pointer"
                      : free === 0
                      ? "text-slate-400 hover:bg-rose-50/60 cursor-pointer"
                      : "text-[#121317] font-semibold hover:bg-slate-100 cursor-pointer"
                  }`}
                >
                  {avail?.isSpecialOrHoliday &&
                    !cell.isPast &&
                    !isStart &&
                    !isEnd && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#0063F5] mb-0.5"
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
          <div className="text-sm sm:text-base font-bold text-[#121317]">
            {lang === "th" ? "ห้องพัก (Rooms)" : "Rooms"}
          </div>
          <div className="text-[11px] text-slate-500">
            {lang === "th"
              ? `มีห้องว่างรวม ${freeCount} ยูนิตในวันที่เลือก`
              : `${freeCount} units available`}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            disabled={roomsCount <= 1}
            onClick={() => setRoomsCount((r) => Math.max(1, r - 1))}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              roomsCount <= 1
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Minus className="w-4 h-4 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-base font-bold text-[#121317]">
            {roomsCount}
          </span>
          <button
            type="button"
            disabled={roomsCount >= totalRoomsCount}
            onClick={() =>
              setRoomsCount((r) => Math.min(totalRoomsCount, r + 1))
            }
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              roomsCount >= totalRoomsCount
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm sm:text-base font-bold text-[#121317]">
            {lang === "th" ? "ผู้ใหญ่ (Adult)" : "Adult"}
          </div>
          <div className="text-[11px] text-slate-500">
            {lang === "th" ? "อายุ 18 ปีขึ้นไป" : "Ages 18 or above"}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            disabled={adultsCount <= 1}
            onClick={() =>
              updateGuestsBreakdown(adultsCount - 1, childrenCount)
            }
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              adultsCount <= 1
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Minus className="w-4 h-4 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-base font-bold text-[#121317]">
            {adultsCount}
          </span>
          <button
            type="button"
            disabled={adultsCount + childrenCount >= 6}
            onClick={() =>
              updateGuestsBreakdown(adultsCount + 1, childrenCount)
            }
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              adultsCount + childrenCount >= 6
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm sm:text-base font-bold text-[#121317]">
            {lang === "th" ? "เด็ก (Children)" : "Children"}
          </div>
          <div className="text-[11px] text-slate-500">
            {lang === "th" ? "อายุ 0-17 ปี" : "Ages 0-17"}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            disabled={childrenCount <= 0}
            onClick={() =>
              updateGuestsBreakdown(adultsCount, childrenCount - 1)
            }
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              childrenCount <= 0
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Minus className="w-4 h-4 stroke-[2]" />
          </button>
          <span className="w-5 text-center text-base font-bold text-[#121317]">
            {childrenCount}
          </span>
          <button
            type="button"
            disabled={adultsCount + childrenCount >= 6}
            onClick={() =>
              updateGuestsBreakdown(adultsCount, childrenCount + 1)
            }
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              adultsCount + childrenCount >= 6
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-[#0063F5] text-[#0063F5] hover:bg-[#EFF6FF] cursor-pointer"
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={barRef} className="w-full relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        {/* ===================================================================
            MOBILE COMPACT UNIFIED BOOKING BAR (< md) — Fastwork Rounded Style
        ==================================================================== */}
        <div className="md:hidden w-full flex items-stretch h-13 rounded-2xl bg-white border border-slate-200/90 shadow-moder-card overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setMobileSheetOpen((prev) => !prev);
              setMobileActiveTab("dates");
            }}
            className="flex-1 flex items-center gap-2.5 px-3.5 text-left text-[#121317] min-w-0 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-xl bg-[#EFF6FF] text-[#0063F5] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="truncate leading-tight">
              <div className="text-xs font-extrabold text-[#121317] truncate">
                {formatCompactMobileDate(checkIn, lang)} –{" "}
                {formatCompactMobileDate(checkOut, lang)} ({nights} คืน)
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                ผู้ใหญ่ {adultsCount}
                {childrenCount > 0 ? `, เด็ก ${childrenCount}` : ""} ·{" "}
                <span className="text-[#0063F5] font-bold">
                  ว่าง {freeCount} ยูนิต
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={scrollToRooms}
            className="px-4 bg-[#0063F5] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>เช็คห้องว่าง</span>
          </button>
        </div>

        {/* ===================================================================
            DESKTOP & TABLET UNIFIED BOOKING BAR (>= md) — Modern Fastwork Card
        ==================================================================== */}
        <div className="hidden md:inline-flex relative items-stretch h-[60px] rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-1.5 gap-1">
          {/* 1. CHECK-IN SEGMENT */}
          <button
            type="button"
            onClick={() =>
              setActivePopover(
                activePopover === "checkin" ? "none" : "checkin"
              )
            }
            className={`relative flex items-center gap-3 px-4 rounded-xl text-left transition cursor-pointer min-w-[205px] ${
              activePopover === "checkin"
                ? "bg-[#EFF6FF] ring-1 ring-[#0063F5]"
                : "hover:bg-slate-50"
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-[#EFF6FF] text-[#0063F5] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                วันเช็คอิน (Check-in)
              </span>
              <span className="block text-[13px] font-bold text-[#121317] mt-0.5">
                {formatAgodaDateMain(checkIn, lang)}{" "}
                <span className="text-[11px] font-medium text-slate-500">
                  ({formatAgodaWeekday(checkIn, lang)})
                </span>
              </span>
            </div>
          </button>

          <div className="w-[1px] my-2 bg-slate-200" />

          {/* 2. CHECK-OUT SEGMENT */}
          <button
            type="button"
            onClick={() =>
              setActivePopover(
                activePopover === "checkout" ? "none" : "checkout"
              )
            }
            className={`relative flex items-center gap-3 px-4 rounded-xl text-left transition cursor-pointer min-w-[205px] ${
              activePopover === "checkout"
                ? "bg-[#EFF6FF] ring-1 ring-[#0063F5]"
                : "hover:bg-slate-50"
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-[#EFF6FF] text-[#0063F5] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                วันเช็คเอาท์ ({nights} คืน)
              </span>
              <span className="block text-[13px] font-bold text-[#121317] mt-0.5">
                {formatAgodaDateMain(checkOut, lang)}{" "}
                <span className="text-[11px] font-medium text-slate-500">
                  ({formatAgodaWeekday(checkOut, lang)})
                </span>
              </span>
            </div>
          </button>

          <div className="w-[1px] my-2 bg-slate-200" />

          {/* 3. GUESTS & AVAILABILITY SEGMENT */}
          <div className="relative flex items-stretch">
            <button
              type="button"
              onClick={() =>
                setActivePopover(
                  activePopover === "guests" ? "none" : "guests"
                )
              }
              className={`relative flex items-center justify-between gap-3 px-4 rounded-xl text-left min-w-[225px] transition cursor-pointer ${
                activePopover === "guests"
                  ? "bg-[#EFF6FF] ring-1 ring-[#0063F5]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#EFF6FF] text-[#0063F5] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0063F5]">
                    ผู้เข้าพัก · ว่าง {freeCount} ยูนิต
                  </span>
                  <span className="block text-[13px] font-bold text-[#121317] mt-0.5">
                    ผู้ใหญ่ {adultsCount} ท่าน
                    {childrenCount > 0 ? `, เด็ก ${childrenCount}` : ""} ·{" "}
                    {roomsCount} ห้อง
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activePopover === "guests" ? "rotate-180 text-[#0063F5]" : ""
                }`}
              />
            </button>

            {activePopover === "guests" && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[330px] rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] border border-slate-200 p-5 z-50">
                {renderGuestsControls()}
              </div>
            )}
          </div>

          {/* 4. FASTWORK BLUE CTA BUTTON ("เช็คห้องว่าง") */}
          <button
            type="button"
            onClick={scrollToRooms}
            className="px-6 rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,99,245,0.28)] transition cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>เช็คห้องว่าง</span>
          </button>

          {/* CUSTOM DAILY ROOM AVAILABILITY DATEPICKER DROPDOWN */}
          {(activePopover === "checkin" || activePopover === "checkout") && (
            <div className="absolute left-0 top-[calc(100%+10px)] w-[350px] lg:w-[680px] rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] border border-slate-200 p-5 z-50">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-extrabold text-[#121317]">
                    {activePopover === "checkin"
                      ? "1. เลือกวันเช็คอิน (แสดงจำนวนห้องว่างรายวัน)"
                      : "2. เลือกวันเช็คเอาท์"}
                  </span>
                  <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#0063F5]" />
                      ว่างพร้อมจอง
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      เรทวันหยุดพิเศษ
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      เต็ม
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn(formatDateStr(today));
                      setCheckOut(formatDateStr(addDaysToDate(today, 1)));
                      setActivePopover("none");
                    }}
                    className="rounded-lg bg-slate-50 hover:bg-[#0063F5] hover:text-white px-2.5 py-1 text-[11px] font-bold text-[#121317] border border-slate-200 transition cursor-pointer"
                  >
                    คืนนี้ (1 คืน)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn(formatDateStr(addDaysToDate(today, 1)));
                      setCheckOut(formatDateStr(addDaysToDate(today, 3)));
                      setActivePopover("none");
                    }}
                    className="rounded-lg bg-slate-50 hover:bg-[#0063F5] hover:text-white px-2.5 py-1 text-[11px] font-bold text-[#121317] border border-slate-200 transition cursor-pointer"
                  >
                    2 คืนสุดฮิต
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

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-[#121317]">
                  {formatAgodaDateMain(checkIn, lang)} →{" "}
                  {formatAgodaDateMain(checkOut, lang)} ({nights} คืน) ·{" "}
                  <span
                    className={
                      freeCount > 0
                        ? "text-[#0063F5] font-bold"
                        : "text-rose-600 font-bold"
                    }
                  >
                    {freeCount > 0
                      ? `มีห้องว่างพร้อมจอง ${freeCount} ยูนิต`
                      : "เต็มทุกห้องในวันที่เลือก"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopover("none")}
                  className="rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white font-bold px-5 py-2 text-xs transition cursor-pointer"
                >
                  ตกลง
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SLIDE-DOWN FILTER & AVAILABILITY SHEET (< md) */}
      <div
        className={`md:hidden fixed inset-0 top-14 z-50 transition-all duration-300 ${
          mobileSheetOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setMobileSheetOpen(false)}
        />

        <div
          className={`relative bg-white rounded-b-3xl shadow-2xl border-b border-slate-200 p-4 max-h-[82vh] overflow-y-auto transition-transform duration-300 ease-out ${
            mobileSheetOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="grid grid-cols-2 flex-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileActiveTab("dates")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  mobileActiveTab === "dates"
                    ? "bg-[#0063F5] text-white shadow-xs"
                    : "text-slate-600"
                }`}
              >
                📅 วันเข้าพัก ({nights} คืน)
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab("guests")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  mobileActiveTab === "guests"
                    ? "bg-[#0063F5] text-white shadow-xs"
                    : "text-slate-600"
                }`}
              >
                👥 ผู้เข้าพัก ({guests} ท่าน)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#121317] cursor-pointer shrink-0"
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
                  className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    mobileDateStep === "checkin"
                      ? "border-[#0063F5] bg-[#EFF6FF]/60 ring-1 ring-[#0063F5]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0063F5] block">
                    วันเช็คอิน (14:00)
                  </span>
                  <span className="text-xs font-bold text-[#121317]">
                    {formatAgodaDateMain(checkIn, lang)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDateStep("checkout")}
                  className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    mobileDateStep === "checkout"
                      ? "border-[#0063F5] bg-[#EFF6FF]/60 ring-1 ring-[#0063F5]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0063F5] block">
                    วันเช็คเอาท์ (12:00)
                  </span>
                  <span className="text-xs font-bold text-[#121317]">
                    {formatAgodaDateMain(checkOut, lang)}
                  </span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
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

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-slate-500 block">สถานะห้องว่าง</span>
              <span
                className={`font-bold ${
                  freeCount > 0 ? "text-[#0063F5]" : "text-rose-600"
                }`}
              >
                {freeCount > 0
                  ? `ว่างพร้อมจอง ${freeCount} ยูนิต`
                  : "เต็มทุกห้องในวันที่เลือก"}
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToRooms}
              className="rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white font-bold text-xs px-5 py-3 cursor-pointer shadow-[0_4px_12px_rgba(0,99,245,0.25)]"
            >
              ดูห้องพักที่ว่าง ({freeCount} ยูนิต)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
