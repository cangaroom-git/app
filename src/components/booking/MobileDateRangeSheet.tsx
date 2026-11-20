"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
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
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";
import type {
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export interface MobileDateRangeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  todayDate: Date;
  initialCheckIn: string | null;
  initialCheckOut: string | null;
  hasConfirmedDates: boolean;
  guests: number;
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  bookedUnitsByRoomDate: Record<string, number>;
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>;
  minPriceThb: number;
  ratingAvg: number;
  specificRoomId?: string | null;
  onSaveDates: (nextIn: string, nextOut: string) => void;
  onClearDates?: () => void;
}

const INITIAL_MONTHS = 3;
const MONTHS_INCREMENT = 3;
const MAX_MONTHS = 12;

export function MobileDateRangeSheet({
  isOpen,
  onClose,
  language,
  todayDate,
  initialCheckIn,
  initialCheckOut,
  hasConfirmedDates,
  guests,
  rooms,
  bookedUnitsByRoomDate,
  dateOverrides,
  minPriceThb,
  ratingAvg,
  specificRoomId = null,
  onSaveDates,
  onClearDates,
}: MobileDateRangeSheetProps) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);

  const isTh = language === "th";
  const todayStr = useMemo(() => formatDateStr(todayDate), [todayDate]);

  const [mounted, setMounted] = useState(false);
  const wasOpenRef = useRef(false);
  const [draftCheckIn, setDraftCheckIn] = useState<string | null>(null);
  const [draftCheckOut, setDraftCheckOut] = useState<string | null>(null);
  const [visibleMonthCount, setVisibleMonthCount] = useState(INITIAL_MONTHS);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ONLY initialize draft state when transitioning closed -> open (prevents Clear/Save from resetting scroll or month count)
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    if (hasConfirmedDates && initialCheckIn && initialCheckOut) {
      setDraftCheckIn(initialCheckIn);
      setDraftCheckOut(initialCheckOut);
      // Ensure the initial check-in month is loaded inside the visible vertical list
      const parsed = new Date(`${initialCheckIn}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        const monthOffset =
          (parsed.getFullYear() - todayDate.getFullYear()) * 12 +
          (parsed.getMonth() - todayDate.getMonth());
        const required = Math.min(
          MAX_MONTHS,
          Math.max(INITIAL_MONTHS, monthOffset + 2)
        );
        setVisibleMonthCount(required);
      } else {
        setVisibleMonthCount(INITIAL_MONTHS);
      }
    } else {
      setDraftCheckIn(null);
      setDraftCheckOut(null);
      setVisibleMonthCount(INITIAL_MONTHS);
    }
  }, [isOpen, hasConfirmedDates, initialCheckIn, initialCheckOut, todayDate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

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

  const isSelectingCheckout = Boolean(draftCheckIn && !draftCheckOut);

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

  const monthList = useMemo(() => {
    const startYear = todayDate.getFullYear();
    const startMonth = todayDate.getMonth();
    const list: Array<{ year: number; month: number }> = [];
    for (let i = 0; i < visibleMonthCount; i++) {
      const total = startMonth + i;
      list.push({
        year: startYear + Math.floor(total / 12),
        month: total % 12,
      });
    }
    return list;
  }, [todayDate, visibleMonthCount]);

  const handleDayTap = (dateStr: string) => {
    if (dateStr < todayStr) return;

    if (!draftCheckIn || (draftCheckIn && draftCheckOut) || dateStr <= draftCheckIn) {
      if (isNightSoldOut(dateStr)) return;
      setDraftCheckIn(dateStr);
      setDraftCheckOut(null);
      return;
    }

    if (
      firstSoldOutAfterCheckIn !== null &&
      dateStr > firstSoldOutAfterCheckIn
    ) {
      return;
    }
    setDraftCheckOut(dateStr);
  };

  const handleClear = () => {
    setDraftCheckIn(null);
    setDraftCheckOut(null);
    onClearDates?.();
  };

  const handleSave = () => {
    if (!draftCheckIn || !draftCheckOut) return;
    onSaveDates(draftCheckIn, draftCheckOut);
    onClose();
  };

  const draftNights =
    draftCheckIn && draftCheckOut
      ? computeNightsBetween(draftCheckIn, draftCheckOut)
      : 0;

  const weekdayLabels = isTh
    ? SUNDAY_FIRST_WEEKDAYS_TH
    : SUNDAY_FIRST_WEEKDAYS_EN;

  if (!shouldRender || !mounted) return null;

  const headerTitle = !draftCheckIn
    ? isTh
      ? "เลือกวันเช็กอิน"
      : "Select check-in date"
    : !draftCheckOut
    ? isTh
      ? "เลือกวันเช็กเอาต์"
      : "Select checkout date"
    : isTh
    ? `${draftNights} คืน`
    : `${draftNights} ${draftNights === 1 ? "night" : "nights"}`;

  const headerSubtitle =
    draftCheckIn && draftCheckOut
      ? `${formatShortDate(draftCheckIn, language)} – ${formatShortDate(
          draftCheckOut,
          language
        )}`
      : isTh
      ? "ระบุวันเดินทางเพื่อดูห้องว่างและราคาจริง"
      : "Add your travel dates for exact pricing";

  const canSave = Boolean(draftCheckIn && draftCheckOut);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      data-state={dataState}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] bg-black/48 flex items-end md:items-center justify-center cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[520px] h-[92dvh] md:h-[84dvh] rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden cgr-modal-surface-md"
      >
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Top bar: Close & Clear dates */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!draftCheckIn && !draftCheckOut}
            className={`text-[13.5px] font-semibold underline underline-offset-2 cursor-pointer transition-opacity ${
              draftCheckIn || draftCheckOut
                ? "text-[var(--color-text-primary)] hover:opacity-75"
                : "text-[var(--color-text-disabled)] cursor-not-allowed"
            }`}
          >
            {isTh ? "ล้างวันที่" : "Clear dates"}
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="px-5 pb-3 shrink-0">
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {headerTitle}
          </h2>
          <p className="text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
            {headerSubtitle}
          </p>
        </div>

        {/* Sticky Weekday Strip */}
        <div className="px-5 py-2 border-b border-[var(--color-border)] grid grid-cols-7 shrink-0 bg-[var(--color-background-popover)]">
          {weekdayLabels.map((wd, i) => (
            <div
              key={`${wd}-${i}`}
              className="text-center text-[12px] font-semibold text-[var(--color-text-secondary)]"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Vertically Scrollable Multi-Month Stack */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 overscroll-contain">
          {monthList.map(({ year, month }) => {
            const cells = buildSundayFirstMonthCells(year, month);
            return (
              <div key={`${year}-${month}`} className="select-none space-y-3">
                <h3 className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                  {formatCalendarMonthTitle(year, month, language)}
                </h3>

                <div className="grid grid-cols-7 gap-y-1">
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="h-11" />;
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
                    const isEnd = dateStr === draftCheckOut;
                    const hasRange = Boolean(
                      draftCheckIn && draftCheckOut && draftCheckOut > draftCheckIn
                    );
                    const isBetween =
                      hasRange &&
                      draftCheckIn !== null &&
                      draftCheckOut !== null &&
                      dateStr > draftCheckIn &&
                      dateStr < draftCheckOut;
                    const showStrikethrough =
                      (isPast || isSoldOut) && !isStart && !isEnd;

                    return (
                      <div
                        key={dateStr}
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
                          onClick={() => handleDayTap(dateStr)}
                          aria-label={dateStr}
                          className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center text-[14px] tabular-nums transition-colors ${
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
          })}

          {visibleMonthCount < MAX_MONTHS && (
            <div className="pt-1 pb-3">
              <button
                type="button"
                onClick={() =>
                  setVisibleMonthCount((prev) =>
                    Math.min(MAX_MONTHS, prev + MONTHS_INCREMENT)
                  )
                }
                className="w-full h-12 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14.5px] font-semibold cursor-pointer transition-colors"
              >
                {isTh ? "โหลดเดือนเพิ่มเติม" : "Load more dates"}
              </button>
            </div>
          )}
        </div>

        {/* Sticky Footer: From Price + Save */}
        <div className="shrink-0 px-5 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-[var(--color-background-popover)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            {minPriceThb > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  {isTh ? "เริ่มต้น" : "From"}
                </span>
                <span className="text-[16px] font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-2">
                  ฿{minPriceThb.toLocaleString()}
                </span>
                <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                  / {isTh ? "คืน" : "night"}
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-text-primary)] mt-0.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{ratingAvg.toFixed(1)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className={`h-12 px-7 rounded-[12px] text-[15px] font-semibold transition-colors shrink-0 ${
              canSave
                ? "bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] cursor-pointer"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-disabled)] cursor-not-allowed"
            }`}
          >
            {isTh ? "บันทึก" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
