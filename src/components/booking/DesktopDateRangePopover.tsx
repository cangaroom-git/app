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
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  computeNightsBetween,
  formatDateStr,
} from "@/lib/bookingMath";
import {
  buildOverrideLookup,
  buildSundayFirstMonthCells,
  findFirstSoldOutAfterCheckIn,
  formatCalendarMonthTitle,
  isPropertyNightSoldOut,
  SUNDAY_FIRST_WEEKDAYS_EN,
  SUNDAY_FIRST_WEEKDAYS_TH,
} from "@/lib/calendarAvailability";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import type {
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export interface DesktopDateRangePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  language: LanguageCode;
  todayDate: Date;
  checkInDate: string;
  checkOutDate: string;
  hasConfirmedDates: boolean;
  initialPhase?: "checkin" | "checkout";
  guests: number;
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  bookedUnitsByRoomDate: Record<string, number>;
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>;
  specificRoomId?: string | null;
  onCommitDates: (nextIn: string, nextOut: string) => void;
  onClearDates: () => void;
}

const POPOVER_WIDTH = 640;
const VIEWPORT_PADDING = 16;

export function DesktopDateRangePopover({
  isOpen,
  onClose,
  anchorRef,
  language,
  todayDate,
  checkInDate,
  checkOutDate,
  hasConfirmedDates,
  initialPhase = "checkin",
  guests,
  rooms,
  bookedUnitsByRoomDate,
  dateOverrides,
  specificRoomId = null,
  onCommitDates,
  onClearDates,
}: DesktopDateRangePopoverProps) {
  const isTh = language === "th";
  const todayStr = useMemo(() => formatDateStr(todayDate), [todayDate]);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const prevInitialPhaseRef = useRef(initialPhase);

  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [draftCheckIn, setDraftCheckIn] = useState<string | null>(null);
  const [draftCheckOut, setDraftCheckOut] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<"checkin" | "checkout">(
    "checkin"
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [baseYearMonth, setBaseYearMonth] = useState<{
    year: number;
    month: number;
  }>(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  // ONLY initialize draft state on closed -> open transition so parent commits NEVER reset/jump the picker!
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!justOpened) return;

    if (hasConfirmedDates && checkInDate && checkOutDate) {
      setDraftCheckIn(checkInDate);
      setDraftCheckOut(checkOutDate);
      const parsed = new Date(`${checkInDate}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        setBaseYearMonth({
          year: parsed.getFullYear(),
          month: parsed.getMonth(),
        });
      }
      setActiveField(initialPhase === "checkout" ? "checkout" : "checkin");
    } else {
      setDraftCheckIn(null);
      setDraftCheckOut(null);
      setBaseYearMonth({
        year: todayDate.getFullYear(),
        month: todayDate.getMonth(),
      });
      setActiveField("checkin");
    }
    setHoverDate(null);
  }, [
    isOpen,
    hasConfirmedDates,
    checkInDate,
    checkOutDate,
    initialPhase,
    todayDate,
  ]);

  // If user clicks CHECK-IN or CHECKOUT on the sticky card while popover is ALREADY open, switch active field cleanly without resetting months
  useEffect(() => {
    const phaseChanged = prevInitialPhaseRef.current !== initialPhase;
    prevInitialPhaseRef.current = initialPhase;
    if (!isOpen || !phaseChanged) return;
    if (initialPhase === "checkout" && draftCheckIn) {
      setActiveField("checkout");
    } else if (initialPhase === "checkin") {
      setActiveField("checkin");
    }
  }, [initialPhase, isOpen, draftCheckIn]);

  // Compute portal fixed viewport coordinates anchored cleanly to the sticky booking card
  const updatePosition = useCallback(() => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PADDING * 2);

    const anchorEl = anchorRef.current;
    if (!anchorEl) {
      setCoords({
        top: Math.max(88, Math.round((vh - 460) / 2)),
        left: Math.max(VIEWPORT_PADDING, Math.round((vw - width) / 2)),
        width,
      });
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    // Right-align popover with the sticky card (Airbnb exact pattern), clamped to viewport
    const desiredLeft = rect.right - width;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(desiredLeft, vw - width - VIEWPORT_PADDING)
    );

    // Overlay near the CHECK-IN / CHECKOUT box inside the sticky card, clamped within viewport height
    const estimatedHeight = popoverRef.current?.offsetHeight || 440;
    const desiredTop = rect.top + 56;
    const maxTop = Math.max(80, vh - estimatedHeight - VIEWPORT_PADDING);
    const top = Math.max(76, Math.min(desiredTop, maxTop));

    setCoords({ top, left, width });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return;
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, mounted, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const overrideMap = useMemo(
    () => buildOverrideLookup(dateOverrides),
    [dateOverrides]
  );

  const isNightSoldOut = useCallback(
    (dateStr: string) =>
      isPropertyNightSoldOut({
        rooms,
        guests,
        dateStr,
        overrideMap,
        bookedUnitsByRoomDate,
        specificRoomId,
      }),
    [rooms, guests, overrideMap, bookedUnitsByRoomDate, specificRoomId]
  );

  const isSelectingCheckout =
    activeField === "checkout" && draftCheckIn !== null;

  const firstSoldOutAfterCheckIn = useMemo(() => {
    if (!isSelectingCheckout || !draftCheckIn) return null;
    return findFirstSoldOutAfterCheckIn({
      checkInDate: draftCheckIn,
      rooms,
      guests,
      overrideMap,
      bookedUnitsByRoomDate,
      specificRoomId,
    });
  }, [
    isSelectingCheckout,
    draftCheckIn,
    rooms,
    guests,
    overrideMap,
    bookedUnitsByRoomDate,
    specificRoomId,
  ]);

  const leftMonth = baseYearMonth;
  const rightMonth = useMemo(
    () =>
      leftMonth.month === 11
        ? { year: leftMonth.year + 1, month: 0 }
        : { year: leftMonth.year, month: leftMonth.month + 1 },
    [leftMonth]
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

    // Starting a new check-in (either activeField is checkin, no check-in yet, or clicked date <= current check-in)
    if (
      activeField === "checkin" ||
      !draftCheckIn ||
      dateStr <= draftCheckIn
    ) {
      if (isNightSoldOut(dateStr)) return;
      setDraftCheckIn(dateStr);
      setDraftCheckOut(null);
      setActiveField("checkout");
      setHoverDate(null);
      return;
    }

    // Selecting check-out (draftCheckIn is set and dateStr > draftCheckIn)
    if (
      firstSoldOutAfterCheckIn !== null &&
      dateStr > firstSoldOutAfterCheckIn
    ) {
      return;
    }

    setDraftCheckOut(dateStr);
    setHoverDate(null);
    setActiveField("checkin");
    onCommitDates(draftCheckIn, dateStr);
  };

  const handleClearAll = () => {
    setDraftCheckIn(null);
    setDraftCheckOut(null);
    setActiveField("checkin");
    setHoverDate(null);
    onClearDates();
  };

  if (!isOpen || !mounted || !coords) return null;

  const effectiveEnd =
    isSelectingCheckout && hoverDate && draftCheckIn && hoverDate > draftCheckIn
      ? hoverDate
      : draftCheckOut;

  const draftNights =
    draftCheckIn && draftCheckOut
      ? computeNightsBetween(draftCheckIn, draftCheckOut)
      : 0;

  const weekdayLabels = isTh
    ? SUNDAY_FIRST_WEEKDAYS_TH
    : SUNDAY_FIRST_WEEKDAYS_EN;

  const renderMonth = (year: number, monthIdx: number) => {
    const cells = buildSundayFirstMonthCells(year, monthIdx);
    return (
      <div className="w-full select-none">
        <div className="grid grid-cols-7 mb-1.5">
          {weekdayLabels.map((wd, idx) => (
            <div
              key={`${wd}-${idx}`}
              className="h-7 flex items-center justify-center text-[11.5px] font-semibold text-[var(--color-text-secondary)]"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }

            const { dateStr, dayNumber } = cell;
            const isPast = dateStr < todayStr;
            const isSoldOut = !isPast && isNightSoldOut(dateStr);
            const isBlockedBeyondGap =
              isSelectingCheckout &&
              draftCheckIn !== null &&
              dateStr > draftCheckIn &&
              firstSoldOutAfterCheckIn !== null &&
              dateStr > firstSoldOutAfterCheckIn;
            const canUseAsCheckoutMorning =
              isSelectingCheckout &&
              draftCheckIn !== null &&
              dateStr > draftCheckIn &&
              firstSoldOutAfterCheckIn === dateStr;
            const isDisabled =
              isPast ||
              isBlockedBeyondGap ||
              (isSoldOut && !canUseAsCheckoutMorning);

            const isStart = dateStr === draftCheckIn;
            const isEnd = dateStr === effectiveEnd;
            const hasRange = Boolean(
              draftCheckIn && effectiveEnd && effectiveEnd > draftCheckIn
            );
            const isBetween =
              hasRange &&
              draftCheckIn !== null &&
              effectiveEnd !== null &&
              dateStr > draftCheckIn &&
              dateStr < effectiveEnd;
            const showStrikethrough =
              (isPast || isSoldOut) && !isStart && !isEnd;

            return (
              <div
                key={dateStr}
                onMouseEnter={() => {
                  if (!isDisabled && isSelectingCheckout) {
                    setHoverDate(dateStr);
                  }
                }}
                onMouseLeave={() => {
                  if (isSelectingCheckout) {
                    setHoverDate(null);
                  }
                }}
                className="relative h-10 flex items-center justify-center"
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
                  aria-label={dateStr}
                  className={`relative z-10 h-9 w-9 rounded-[10px] flex items-center justify-center text-[13.5px] tabular-nums transition-colors ${
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

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={isTh ? "เลือกวันเข้าพัก" : "Select dates"}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
      className="z-[80] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-6 space-y-5 isolate"
    >
      {/* Top Row: Summary Left + Active Dual Check-in/Checkout Box Right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {draftCheckIn && draftCheckOut
              ? isTh
                ? `${draftNights} คืน`
                : `${draftNights} ${draftNights === 1 ? "night" : "nights"}`
              : draftCheckIn
              ? isTh
                ? "เลือกวันเช็กเอาต์"
                : "Select checkout date"
              : isTh
              ? "เลือกวันเช็กอิน"
              : "Select check-in date"}
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 truncate">
            {draftCheckIn && draftCheckOut
              ? `${formatShortDate(draftCheckIn, language)} – ${formatShortDate(
                  draftCheckOut,
                  language
                )}`
              : draftCheckIn
              ? `${formatShortDate(draftCheckIn, language)} – ${
                  isTh ? "เลือกวันเช็กเอาต์" : "Add checkout"
                }`
              : isTh
              ? "ระบุวันเช็กอินและเช็กเอาต์เพื่อดูห้องว่างจริง"
              : "Add your travel dates for exact pricing"}
          </p>
        </div>

        <div className="grid grid-cols-2 w-[290px] shrink-0 rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveField("checkin")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveField("checkin");
              }
            }}
            className={`px-3 py-2 flex items-center justify-between gap-1 cursor-pointer rounded-[11px] transition-colors ${
              activeField === "checkin"
                ? "ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)]"
                : "hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <div className="min-w-0">
              <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {isTh ? "เช็กอิน" : "CHECK-IN"}
              </span>
              <span className="block text-[13px] text-[var(--color-text-primary)] truncate mt-0.5">
                {draftCheckIn
                  ? formatShortDate(draftCheckIn, language)
                  : isTh
                  ? "เพิ่มวันที่"
                  : "Add date"}
              </span>
            </div>
            {draftCheckIn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                aria-label="Clear check-in"
                className="h-5 w-5 rounded-[6px] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (draftCheckIn) {
                setActiveField("checkout");
              } else {
                setActiveField("checkin");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (draftCheckIn) setActiveField("checkout");
              }
            }}
            className={`px-3 py-2 flex items-center justify-between gap-1 cursor-pointer rounded-[11px] border-l border-[var(--color-border)] transition-colors ${
              activeField === "checkout"
                ? "ring-2 ring-inset ring-[var(--color-text-primary)] bg-[var(--color-background-card)]"
                : "hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <div className="min-w-0">
              <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {isTh ? "เช็กเอาต์" : "CHECKOUT"}
              </span>
              <span className="block text-[13px] text-[var(--color-text-primary)] truncate mt-0.5">
                {draftCheckOut
                  ? formatShortDate(draftCheckOut, language)
                  : isTh
                  ? "เพิ่มวันที่"
                  : "Add date"}
              </span>
            </div>
            {draftCheckOut && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftCheckOut(null);
                  setActiveField("checkout");
                }}
                aria-label="Clear checkout"
                className="h-5 w-5 rounded-[6px] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Month Headers & Navigation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            aria-label={isTh ? "เดือนก่อนหน้า" : "Previous month"}
            className={`h-8 w-8 rounded-[10px] inline-flex items-center justify-center transition-colors ${
              canGoPrevMonth
                ? "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] cursor-pointer"
                : "text-[var(--color-text-disabled)] cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 grid grid-cols-2 gap-8 text-center text-[14.5px] font-semibold text-[var(--color-text-primary)]">
            <span>
              {formatCalendarMonthTitle(leftMonth.year, leftMonth.month, language)}
            </span>
            <span>
              {formatCalendarMonthTitle(
                rightMonth.year,
                rightMonth.month,
                language
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label={isTh ? "เดือนถัดไป" : "Next month"}
            className="h-8 w-8 rounded-[10px] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {renderMonth(leftMonth.year, leftMonth.month)}
          {renderMonth(rightMonth.year, rightMonth.month)}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {isTh
            ? "วันที่ขีดฆ่าคือวันที่ห้องเต็มทั้งหมด"
            : "Crossed-out dates are fully booked"}
        </span>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[13.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 cursor-pointer"
          >
            {isTh ? "ล้างวันที่" : "Clear dates"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold cursor-pointer transition-colors"
          >
            {isTh ? "ปิด" : "Close"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
