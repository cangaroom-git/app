"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface AgodaDateRangeFilterProps {
  language: LanguageCode;
  todayDate: Date;
  checkInDate: string;
  checkOutDate: string;
  onChangeCheckInDate: (dateStr: string) => void;
  onChangeCheckOutDate: (dateStr: string) => void;
  guestCount: number;
  onChangeGuestCount: (guests: number) => void;
  isDateFilterActive: boolean;
  onChangeDateFilterActive: (active: boolean) => void;
  allowClear?: boolean;
  popoverAlign?: "left" | "right";
  triggerClassName?: string;
}

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

/** Thai Holidays / Special Dates (MM-DD) for subtle Agoda top dot indicator */
const THAI_HOLIDAY_MMDD = new Set([
  "01-01",
  "02-14",
  "04-06",
  "04-13",
  "04-14",
  "04-15",
  "05-01",
  "05-04",
  "06-03",
  "07-28",
  "08-12",
  "10-13",
  "10-23",
  "12-05",
  "12-07",
  "12-10",
  "12-31",
]);

function buildMondayFirstMonthCells(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat -> Convert to Monday=0 ... Sunday=6
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

export function AgodaDateRangeFilter({
  language,
  todayDate,
  checkInDate,
  checkOutDate,
  onChangeCheckInDate,
  onChangeCheckOutDate,
  guestCount,
  onChangeGuestCount,
  isDateFilterActive,
  onChangeDateFilterActive,
  allowClear = true,
  popoverAlign = "right",
  triggerClassName = "",
}: AgodaDateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [selectingPhase, setSelectingPhase] = useState<"checkin" | "checkout">(
    "checkin"
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const todayStr = useMemo(() => formatDateStr(todayDate), [todayDate]);

  // Base month shown on the left side of the 2-month calendar
  const [baseYearMonth, setBaseYearMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const d = checkInDate ? new Date(`${checkInDate}T00:00:00`) : todayDate;
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useBodyScrollLock(isOpen && isMobileViewport);

  useEffect(() => {
    if (!isOpen || isMobileViewport) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, isMobileViewport]);

  const leftMonth = baseYearMonth;
  const rightMonth = useMemo(() => {
    if (leftMonth.month === 11) {
      return { year: leftMonth.year + 1, month: 0 };
    }
    return { year: leftMonth.year, month: leftMonth.month + 1 };
  }, [leftMonth]);

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
      const nextDayStr = formatDateStr(
        addDaysToDate(new Date(`${dateStr}T00:00:00`), 1)
      );
      onChangeCheckInDate(dateStr);
      onChangeCheckOutDate(nextDayStr);
      onChangeDateFilterActive(true);
      setSelectingPhase("checkout");
      setHoverDate(null);
    } else {
      onChangeCheckOutDate(dateStr);
      onChangeDateFilterActive(true);
      setSelectingPhase("checkin");
      setHoverDate(null);
      if (!isMobileViewport) {
        setIsOpen(false);
      }
    }
  };

  const effectiveRangeEnd =
    selectingPhase === "checkout" && hoverDate && hoverDate > checkInDate
      ? hoverDate
      : checkOutDate;

  const weekdayLabels = language === "th" ? WEEKDAYS_TH : WEEKDAYS_EN;

  const formatMonthTitle = (year: number, monthIdx: number) => {
    if (language === "th") {
      return `${MONTHS_TH[monthIdx]} ${year}`;
    }
    return `${MONTHS_EN[monthIdx]} ${year}`;
  };

  const renderMonthGrid = (year: number, monthIdx: number) => {
    const cells = buildMondayFirstMonthCells(year, monthIdx);
    return (
      <div className="w-full">
        {/* Weekday Header Row (Mo Tu We Th Fr Sa Su) */}
        <div className="grid grid-cols-7 mb-2">
          {weekdayLabels.map((wd) => (
            <div
              key={wd}
              className="h-8 flex items-center justify-center text-[13px] font-bold text-[#6b7280]"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }

            const { dateStr, dayNumber } = cell;
            const isPast = dateStr < todayStr;
            const isStart = dateStr === checkInDate;
            const isEnd = dateStr === effectiveRangeEnd;
            const isBetween =
              dateStr > checkInDate && dateStr < effectiveRangeEnd;
            const hasRange = effectiveRangeEnd > checkInDate;
            const mmdd = dateStr.slice(5);
            const isHolidayDot = THAI_HOLIDAY_MMDD.has(mmdd);

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
                className="relative h-10 flex items-center justify-center"
              >
                {/* Soft Agoda Range Strip (#e8f0fe) */}
                {hasRange && isBetween && (
                  <div className="absolute inset-x-0 inset-y-0.5 bg-[#e8f0fe] dark:bg-[#2067da]/25 pointer-events-none" />
                )}
                {hasRange && isStart && (
                  <div className="absolute left-1/2 right-0 inset-y-0.5 bg-[#e8f0fe] dark:bg-[#2067da]/25 pointer-events-none" />
                )}
                {hasRange && isEnd && (
                  <div className="absolute left-0 right-1/2 inset-y-0.5 bg-[#e8f0fe] dark:bg-[#2067da]/25 pointer-events-none" />
                )}

                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(dateStr)}
                  className={`relative z-10 h-9 w-9 rounded-full flex flex-col items-center justify-center text-[14px] transition-colors ${
                    isPast
                      ? "text-[var(--color-text-disabled)] cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)] font-semibold cursor-pointer"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-normal cursor-pointer"
                  }`}
                >
                  {isHolidayDot && !isStart && !isEnd && !isPast && (
                    <span className="absolute top-1 h-1 w-1 rounded-full bg-[#374151] dark:bg-[#d1d5db]" />
                  )}
                  <span className={isStart || isEnd ? "!text-[var(--color-on-accent)]" : ""}>
                    {dayNumber}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={wrapperRef} className="relative shrink-0 select-none">
      {/* SEARCH BAR TRIGGER PILL */}
      <div
        className={`inline-flex items-center h-9 rounded-[12px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] shadow-2xs border border-[var(--color-border)]/70 ${triggerClassName}`}
      >
        <button
          type="button"
          onClick={() => {
            setSelectingPhase("checkin");
            setIsOpen((prev) => !prev);
          }}
          title={
            language === "th"
              ? "เลือกวันเช็กอิน-เช็กเอาท์เพื่อกรองที่พักว่าง"
              : "Select dates to filter available stays"
          }
          className="h-full px-2.5 sm:px-3 inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-text-primary)] cursor-pointer"
        >
          <Calendar
            className={`w-3.5 h-3.5 shrink-0 ${
              isDateFilterActive || !allowClear
                ? "text-[#2067da]"
                : "text-[var(--color-text-secondary)]"
            }`}
          />
          <span className="whitespace-nowrap">
            {isDateFilterActive || !allowClear ? (
              <>
                {formatShortDate(checkInDate, language)} –{" "}
                {formatShortDate(checkOutDate, language)}
                <span className={!allowClear ? "inline" : "hidden md:inline"}>
                  {" "}
                  · {guestCount} {language === "th" ? "ท่าน" : "guests"}
                </span>
              </>
            ) : language === "th" ? (
              "เลือกวันเข้าพัก"
            ) : (
              "Any dates"
            )}
          </span>
        </button>

        {allowClear && isDateFilterActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeDateFilterActive(false);
            }}
            aria-label="Clear date filter"
            className="pr-2.5 pl-0.5 h-full inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* =====================================================================
          DESKTOP AGODA 2-MONTH SIDE-BY-SIDE CALENDAR POPOVER (>= md)
          Matches uploaded Agoda screenshot 100%
      ====================================================================== */}
      {isOpen && !isMobileViewport && (
        <div
          className={`hidden md:block absolute ${
            popoverAlign === "left" ? "left-0" : "right-0"
          } top-[calc(100%+10px)] z-[85] w-[664px] max-w-[calc(100vw-2rem)] rounded-[20px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-6 space-y-5`}
        >
          {/* Top Navigation & 2 Month Headers */}
          <div className="relative grid grid-cols-2 gap-8 items-center">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] inline-flex items-center justify-center transition-colors ${
                canGoPrevMonth
                  ? "text-[#2067da] hover:bg-[var(--color-background-muted)] cursor-pointer"
                  : "text-[var(--color-text-disabled)] cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
            </button>

            <h3 className="text-center text-[16px] font-bold text-[var(--color-text-primary)]">
              {formatMonthTitle(leftMonth.year, leftMonth.month)}
            </h3>

            <h3 className="text-center text-[16px] font-bold text-[var(--color-text-primary)]">
              {formatMonthTitle(rightMonth.year, rightMonth.month)}
            </h3>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] text-[#2067da] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>

          {/* 2 Side-by-Side Month Grids */}
          <div className="grid grid-cols-2 gap-8">
            {renderMonthGrid(leftMonth.year, leftMonth.month)}
            {renderMonthGrid(rightMonth.year, rightMonth.month)}
          </div>

          {/* Compact Footer: Guests Stepper + Clear / Filter Available */}
          <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
                <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>{language === "th" ? "ผู้เข้าพัก" : "Guests"}</span>
              </span>

              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeGuestCount(Math.max(1, guestCount - 1))
                  }
                  className="h-7 w-7 rounded-[8px] border border-[var(--color-border)] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-5 text-center ty-body font-bold">
                  {guestCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeGuestCount(Math.min(12, guestCount + 1))
                  }
                  className="h-7 w-7 rounded-[8px] border border-[var(--color-border)] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {allowClear && isDateFilterActive && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeDateFilterActive(false);
                    setIsOpen(false);
                  }}
                  className="h-9 px-3.5 rounded-[10px] hover:bg-[var(--color-background-muted)] ty-caption font-semibold text-[var(--color-text-secondary)] cursor-pointer"
                >
                  {language === "th" ? "ไม่ระบุวัน" : "Clear dates"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onChangeDateFilterActive(true);
                  setIsOpen(false);
                }}
                className="h-9 px-4 rounded-[10px] bg-[#2067da] hover:bg-[#1956b8] !text-white ty-caption font-semibold cursor-pointer"
              >
                <span className="!text-white">
                  {!allowClear
                    ? language === "th"
                      ? "ยืนยันวันเข้าพัก"
                      : "Apply Dates"
                    : language === "th"
                    ? "ค้นหาที่พักว่างช่วงนี้"
                    : "Filter Available Stays"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MOBILE (< md): FULL-SCREEN AGODA CALENDAR SHEET
      ====================================================================== */}
      {isOpen && isMobileViewport && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-[95] bg-[var(--color-background-body)] flex flex-col"
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background-card)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <p className="ty-body font-bold">
              {language === "th"
                ? "เลือกวันเช็กอิน – เช็กเอาท์"
                : "Select Stay Dates"}
            </p>

            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChangeDateFilterActive(false);
                  setIsOpen(false);
                }}
                className="ty-caption font-semibold text-[var(--color-text-secondary)] cursor-pointer"
              >
                {language === "th" ? "ล้างค่า" : "Clear"}
              </button>
            ) : (
              <span className="w-10" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={!canGoPrevMonth}
                onClick={handlePrevMonth}
                className={`h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center ${
                  canGoPrevMonth ? "text-[#2067da]" : "opacity-40"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="ty-body font-bold">
                {formatMonthTitle(leftMonth.year, leftMonth.month)}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] text-[#2067da] flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {renderMonthGrid(leftMonth.year, leftMonth.month)}

            <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
              <p className="text-center ty-body font-bold">
                {formatMonthTitle(rightMonth.year, rightMonth.month)}
              </p>
              {renderMonthGrid(rightMonth.year, rightMonth.month)}
            </div>
          </div>

          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background-card)] pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between">
              <span className="ty-body font-semibold">
                {language === "th" ? "จำนวนผู้เข้าพัก" : "Guests"}
              </span>
              <div className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onChangeGuestCount(Math.max(1, guestCount - 1))
                  }
                  className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="ty-body font-bold w-6 text-center">
                  {guestCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeGuestCount(Math.min(12, guestCount + 1))
                  }
                  className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onChangeDateFilterActive(true);
                setIsOpen(false);
              }}
              className="w-full h-11 rounded-[14px] bg-[#2067da] !text-white ty-body font-semibold"
            >
              <span className="!text-white">
                {language === "th"
                  ? `${allowClear ? "ดูที่พักว่าง" : "ยืนยันวันเข้าพัก"} (${formatShortDate(
                      checkInDate,
                      language
                    )} – ${formatShortDate(checkOutDate, language)})`
                  : allowClear
                  ? "Show Available Stays"
                  : "Apply Stay Dates"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
