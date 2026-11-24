"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  buildSundayFirstMonthCells,
  formatCalendarMonthTitle,
  SUNDAY_FIRST_WEEKDAYS_TH,
} from "@/lib/calendarAvailability";
import { formatShortDate } from "@/lib/dateFormatters";

export interface StudioDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  onChange: (nextStart: string, nextEnd: string) => void;
  startLabel?: string;
  endLabel?: string;
  grouped?: boolean;
  minDateStr?: string;
}

const POPOVER_WIDTH = 620;
const VIEWPORT_PADDING = 16;

/**
 * Unified Airbnb 2-Month Date Range Picker (Matches HotelStorefrontClient's DesktopDateRangePopover)
 * - Desktop (`>= md`): Portal popover anchored cleanly to the split date field (z-[105] above StudioSheetModal)
 * - Mobile (`< md`): Portal slide-up Bottom Sheet with drag handle
 * - Zero ugly native OS `<input type="date">`!
 */
export function StudioDateRangePicker({
  startDate,
  endDate,
  onChange,
  startLabel = "ตั้งแต่วันที่",
  endLabel = "ถึงวันที่ (รวมคืนสุดท้าย)",
  grouped = true,
  minDateStr,
}: StudioDateRangePickerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<"start" | "end">("start");
  const [draftStart, setDraftStart] = useState<string | null>(startDate || null);
  const [draftEnd, setDraftEnd] = useState<string | null>(endDate || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [baseYearMonth, setBaseYearMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const parsed = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
    const d = isNaN(parsed.getTime()) ? new Date() : parsed;
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openPicker = (phase: "start" | "end") => {
    setDraftStart(startDate || null);
    setDraftEnd(endDate || null);
    setActivePhase(phase);
    setHoverDate(null);
    const refDateStr = phase === "end" && endDate ? endDate : startDate;
    const parsed = refDateStr ? new Date(`${refDateStr}T00:00:00`) : new Date();
    if (!isNaN(parsed.getTime())) {
      setBaseYearMonth({
        year: parsed.getFullYear(),
        month: parsed.getMonth(),
      });
    }
    setIsOpen(true);
  };

  const updatePosition = useCallback(() => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PADDING * 2);

    const anchor = anchorRef.current;
    if (!anchor) {
      setCoords({
        top: Math.max(48, Math.round((vh - 420) / 2)),
        left: Math.max(VIEWPORT_PADDING, Math.round((vw - width) / 2)),
        width,
      });
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const estimatedHeight = popoverRef.current?.offsetHeight || 410;
    const desiredLeft = rect.left + (rect.width - width) / 2;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(desiredLeft, vw - width - VIEWPORT_PADDING)
    );

    const fitsBelow = rect.bottom + 8 + estimatedHeight <= vh - VIEWPORT_PADDING;
    const top = fitsBelow
      ? rect.bottom + 8
      : Math.max(VIEWPORT_PADDING, rect.top - estimatedHeight - 8);

    setCoords({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return;
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true, capture: true });
    window.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, mounted, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [isOpen]);

  const leftMonth = baseYearMonth;
  const rightMonth = useMemo(() => {
    const next = new Date(baseYearMonth.year, baseYearMonth.month + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  }, [baseYearMonth]);

  const leftCells = useMemo(
    () => buildSundayFirstMonthCells(leftMonth.year, leftMonth.month),
    [leftMonth]
  );
  const rightCells = useMemo(
    () => buildSundayFirstMonthCells(rightMonth.year, rightMonth.month),
    [rightMonth]
  );

  const shiftMonths = (delta: number) => {
    setBaseYearMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (minDateStr && dateStr < minDateStr) return;

    if (activePhase === "start" || !draftStart) {
      setDraftStart(dateStr);
      setDraftEnd(null);
      setActivePhase("end");
      return;
    }

    if (dateStr < draftStart) {
      setDraftStart(dateStr);
      setDraftEnd(null);
      setActivePhase("end");
      return;
    }

    setDraftEnd(dateStr);
    onChange(draftStart, dateStr);
    setIsOpen(false);
  };

  const previewEnd =
    draftEnd ?? (activePhase === "end" && draftStart && hoverDate && hoverDate >= draftStart ? hoverDate : null);

  const renderMonth = (
    year: number,
    month: number,
    cells: ReturnType<typeof buildSundayFirstMonthCells>
  ) => (
    <div className="space-y-2.5">
      <p className="text-[14.5px] font-semibold text-center text-[var(--color-text-primary)]">
        {formatCalendarMonthTitle(year, month, "th")}
      </p>
      <div className="grid grid-cols-7 text-center">
        {SUNDAY_FIRST_WEEKDAYS_TH.map((w) => (
          <span
            key={w}
            className="text-[11.5px] font-medium text-[var(--color-text-tertiary)] py-1"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }
          const { dateStr, dayNumber } = cell;
          const disabled = Boolean(minDateStr && dateStr < minDateStr);
          const isStart = draftStart === dateStr;
          const isEnd = draftEnd === dateStr;
          const isInRange = Boolean(
            draftStart &&
              previewEnd &&
              dateStr > draftStart &&
              dateStr < previewEnd
          );
          const isRangePreviewEnd =
            !draftEnd && previewEnd === dateStr && draftStart && dateStr > draftStart;

          return (
            <div
              key={dateStr}
              className={`h-9 flex items-center justify-center ${
                isInRange
                  ? "bg-[var(--color-background-muted)]"
                  : isStart && previewEnd && previewEnd > dateStr
                  ? "bg-[var(--color-background-muted)] rounded-l-[10px]"
                  : (isEnd || isRangePreviewEnd) && draftStart && dateStr > draftStart
                  ? "bg-[var(--color-background-muted)] rounded-r-[10px]"
                  : ""
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => setHoverDate(dateStr)}
                onClick={() => handleDayClick(dateStr)}
                className={`h-9 w-9 rounded-[10px] text-[13px] font-medium tabular-nums inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isStart || isEnd
                    ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)] font-semibold"
                    : isRangePreviewEnd
                    ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] font-semibold"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
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

  const cellBase = grouped
    ? "relative flex flex-col justify-center min-h-[56px] px-3.5 py-2 bg-transparent hover:bg-[var(--color-background-muted)]/40 text-left cursor-pointer transition-colors focus:outline-none"
    : "relative flex flex-col justify-center min-h-[56px] w-full rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 py-2 text-left cursor-pointer transition-colors";

  return (
    <>
      <div
        ref={anchorRef}
        className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]"
      >
        <button
          type="button"
          onClick={() => openPicker("start")}
          className={`${cellBase} ${
            grouped
              ? isOpen && activePhase === "start"
                ? "rounded-[11px] ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)] z-10"
                : "rounded-none sm:rounded-bl-[11px]"
              : isOpen && activePhase === "start"
              ? "ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)] z-10"
              : ""
          }`}
        >
          <span className="text-[12px] font-medium leading-tight text-[var(--color-text-secondary)]">
            {startLabel}
          </span>
          <span className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[15px] font-medium text-[var(--color-text-primary)] tabular-nums truncate">
              {startDate ? formatShortDate(startDate, "th") : "เลือกวันเริ่มต้น"}
            </span>
            <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => openPicker("end")}
          className={`${cellBase} ${
            grouped
              ? isOpen && activePhase === "end"
                ? "rounded-[11px] ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)] z-10"
                : "rounded-b-[11px] sm:rounded-none sm:rounded-br-[11px]"
              : isOpen && activePhase === "end"
              ? "ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)] z-10"
              : ""
          }`}
        >
          <span className="text-[12px] font-medium leading-tight text-[var(--color-text-secondary)]">
            {endLabel}
          </span>
          <span className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[15px] font-medium text-[var(--color-text-primary)] tabular-nums truncate">
              {endDate ? formatShortDate(endDate, "th") : "เลือกวันสิ้นสุด"}
            </span>
            <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
          </span>
        </button>
      </div>

      {/* Portal Calendar: Desktop Instant 2-Month Airbnb Popover / Mobile Slide-Up Bottom Sheet */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[105] bg-black/40 md:bg-transparent flex items-end md:block max-md:animate-fade-in-backdrop"
          >
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              style={
                coords
                  ? {
                      ["--cgr-drp-top" as string]: `${coords.top}px`,
                      ["--cgr-drp-left" as string]: `${coords.left}px`,
                      ["--cgr-drp-width" as string]: `${coords.width}px`,
                    }
                  : undefined
              }
              className="w-full md:fixed md:top-[var(--cgr-drp-top)] md:left-[var(--cgr-drp-left)] md:w-[var(--cgr-drp-width)] max-h-[85dvh] rounded-t-[24px] md:rounded-[16px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:pb-5 flex flex-col gap-4 overflow-y-auto max-md:animate-slide-up-sheet"
            >
              {/* Mobile drag handle */}
              <div
                aria-hidden="true"
                className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto -mt-1 shrink-0"
              />

              {/* Popover Header: Active Step + Prev/Next Month */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    {activePhase === "start"
                      ? "เลือกวันเริ่มต้น"
                      : "เลือกวันสิ้นสุด (รวมคืนสุดท้าย)"}
                  </p>
                  <p className="text-[12.5px] text-[var(--color-text-secondary)] tabular-nums">
                    {draftStart ? formatShortDate(draftStart, "th") : "—"} –{" "}
                    {draftEnd ? formatShortDate(draftEnd, "th") : "เลือกวันสิ้นสุด"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => shiftMonths(-1)}
                    aria-label="เดือนก่อนหน้า"
                    className="h-8.5 w-8.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonths(1)}
                    aria-label="เดือนถัดไป"
                    className="h-8.5 w-8.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="ปิดปฏิทิน"
                    className="h-8.5 w-8.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1-Month on Mobile, 2-Month Side-by-Side on Desktop (Exact Airbnb Standard!) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderMonth(leftMonth.year, leftMonth.month, leftCells)}
                <div className="hidden md:block">
                  {renderMonth(rightMonth.year, rightMonth.month, rightCells)}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
