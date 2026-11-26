"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  addDaysToDate,
  formatDateStr,
  isWeekendNight,
} from "@/lib/bookingMath";
import {
  buildSundayFirstMonthCells,
  formatCalendarMonthTitle,
} from "@/lib/calendarAvailability";
import { formatShortDate } from "@/lib/dateFormatters";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import {
  StandardInput,
  StandardStepperRow,
} from "@/components/ui/standards";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
import type {
  StudioPayload,
  StudioRoomRecord,
} from "@/components/studio/studioTypes";

const SUNDAY_FIRST_WEEKDAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAY_OF_WEEK_PILLS = [
  { dow: 0, label: "อา" },
  { dow: 1, label: "จ" },
  { dow: 2, label: "อ" },
  { dow: 3, label: "พ" },
  { dow: 4, label: "พฤ" },
  { dow: 5, label: "ศ" },
  { dow: 6, label: "ส" },
];

type CalendarViewMode = "month" | "matrix";

function formatCompactBaht(price: number): string {
  if (price >= 10000) {
    return `฿${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`;
  }
  return `฿${price.toLocaleString()}`;
}

function formatMobileBaht(price: number): string {
  if (price >= 1000) {
    const k = price / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(price);
}

export function StudioCalendarTab({
  data,
  initialRoomCode,
  onNavigateRoomCode,
  buildHref = (p) => p,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  initialRoomCode?: string | null;
  onNavigateRoomCode?: (roomCode: string | null) => void;
  buildHref?: (path: string) => string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const { hotel, rooms, dateOverrides, bookedUnitsByRoomDate } = data;

  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateStr(todayDate), [todayDate]);

  const matchedInitialRoom = useMemo(() => {
    if (!initialRoomCode) return null;
    const norm = decodeURIComponent(initialRoomCode).trim().toLowerCase();
    return (
      rooms.find(
        (r) =>
          r.code.toLowerCase() === norm ||
          r.slug.toLowerCase() === norm ||
          r.id === initialRoomCode
      ) ?? null
    );
  }, [rooms, initialRoomCode]);

  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (matchedInitialRoom) return "month";
    return rooms.length >= 2 ? "matrix" : "month";
  });
  const [matrixStartDate, setMatrixStartDate] = useState(todayStr);
  const [selectedMobileDate, setSelectedMobileDate] = useState(todayStr);
  const [monthCursor, setMonthCursor] = useState(() => ({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  }));
  const [activeRoomId, setActiveRoomId] = useState(
    matchedInitialRoom?.id || rooms[0]?.id || ""
  );

  // Sync only when a specific room URL (`/studio/calendar/[roomCode]`) is navigated to directly.
  // Never force-override `viewMode` back to "month" on mobile when viewing `/studio/calendar` (รวมห้อง).
  useEffect(() => {
    if (matchedInitialRoom) {
      setActiveRoomId(matchedInitialRoom.id);
      setViewMode("month");
    }
  }, [matchedInitialRoom]);

  // Keep mobile selected date within the active 14-day horizontally scrollable strip when navigating weeks
  useEffect(() => {
    const stripEnd = addDaysToDate(matrixStartDate, 13);
    if (selectedMobileDate < matrixStartDate || selectedMobileDate > stripEnd) {
      setSelectedMobileDate(matrixStartDate);
    }
  }, [matrixStartDate, selectedMobileDate]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? rooms[0] ?? null,
    [rooms, activeRoomId]
  );

  // Day Edit Modal State (opens cleanly only when clicking a date cell — NO permanent side menu!)
  const [selectedCell, setSelectedCell] = useState<{
    roomId: string;
    dateStr: string;
  } | null>(null);
  const [editPriceThb, setEditPriceThb] = useState("");
  const [editBlockedUnits, setEditBlockedUnits] = useState(0);
  const [editMinNights, setEditMinNights] = useState(1);
  const [editNote, setEditNote] = useState("");
  const [isSavingDay, setIsSavingDay] = useState(false);

  // Bulk Date-Range Quick Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRoomIds, setBulkRoomIds] = useState<string[]>(() =>
    matchedInitialRoom ? [matchedInitialRoom.id] : rooms.map((r) => r.id)
  );
  const [bulkStartDate, setBulkStartDate] = useState(todayStr);
  const [bulkEndDate, setBulkEndDate] = useState(() =>
    addDaysToDate(todayStr, 2)
  );
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6,
  ]);
  const [bulkPriceAction, setBulkPriceAction] = useState<
    "keep" | "set" | "clear"
  >("set");
  const [bulkPriceThb, setBulkPriceThb] = useState("");
  const [bulkBlockAction, setBulkBlockAction] = useState<
    "keep" | "open" | "close_all"
  >("keep");
  const [bulkMinNights, setBulkMinNights] = useState(1);
  const [bulkNote, setBulkNote] = useState("");
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const overrideMap = useMemo(() => {
    const map = new Map<string, (typeof dateOverrides)[number]>();
    for (const o of dateOverrides) {
      map.set(`${o.roomId}|${o.dateStr}`, o);
    }
    return map;
  }, [dateOverrides]);

  const getCellMetrics = (room: StudioRoomRecord, dateStr: string) => {
    const ov = overrideMap.get(`${room.id}|${dateStr}`);
    const booked = bookedUnitsByRoomDate[`${room.id}|${dateStr}`] ?? 0;
    const blocked = ov?.blockedUnits ?? 0;
    const free = Math.max(0, room.totalUnits - booked - blocked);
    const defaultPrice = isWeekendNight(dateStr)
      ? room.weekendPriceThb
      : room.weekdayPriceThb;
    const price =
      ov?.overridePriceThb && ov.overridePriceThb > 0
        ? ov.overridePriceThb
        : defaultPrice;
    const hasCustomPrice = Boolean(
      ov?.overridePriceThb && ov.overridePriceThb > 0
    );
    const minNights = ov?.minNights ?? 1;
    return {
      ov,
      booked,
      blocked,
      free,
      price,
      defaultPrice,
      hasCustomPrice,
      minNights,
    };
  };

  const handleSelectRoomForMonth = (room: StudioRoomRecord) => {
    setActiveRoomId(room.id);
    setViewMode("month");
    setBulkRoomIds([room.id]);
    setSelectedCell(null);
    onNavigateRoomCode?.(room.code);
  };

  const handleSwitchToMatrix = () => {
    setViewMode("matrix");
    setBulkRoomIds(rooms.map((r) => r.id));
    setSelectedCell(null);
    onNavigateRoomCode?.(null);
  };

  const openDayEditor = (room: StudioRoomRecord, dateStr: string) => {
    const ov = overrideMap.get(`${room.id}|${dateStr}`);
    setSelectedCell({ roomId: room.id, dateStr });
    setEditPriceThb(ov?.overridePriceThb ? String(ov.overridePriceThb) : "");
    setEditBlockedUnits(ov?.blockedUnits ?? 0);
    setEditMinNights(ov?.minNights ?? 1);
    setEditNote(ov?.note ?? "");
  };

  const selectedRoomObj = useMemo(
    () =>
      selectedCell
        ? rooms.find((r) => r.id === selectedCell.roomId) ?? null
        : null,
    [selectedCell, rooms]
  );

  const selectedMetrics = useMemo(() => {
    if (!selectedCell || !selectedRoomObj) return null;
    return getCellMetrics(selectedRoomObj, selectedCell.dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, selectedRoomObj, overrideMap, bookedUnitsByRoomDate]);

  const matrixDays = useMemo(() => {
    const list: Array<{
      dateStr: string;
      dayNum: number;
      weekdayLabel: string;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];
    for (let i = 0; i < 14; i++) {
      const ds = addDaysToDate(matrixStartDate, i);
      const d = new Date(`${ds}T00:00:00`);
      list.push({
        dateStr: ds,
        dayNum: d.getDate(),
        weekdayLabel: SUNDAY_FIRST_WEEKDAYS_TH[d.getDay()],
        isWeekend: d.getDay() === 5 || d.getDay() === 6,
        isToday: ds === todayStr,
      });
    }
    return list;
  }, [matrixStartDate, todayStr]);

  const monthDropdownOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    for (let offset = 0; offset < 13; offset++) {
      const d = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth() + offset,
        1
      );
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: formatCalendarMonthTitle(d.getFullYear(), d.getMonth(), "th"),
      });
    }
    return opts;
  }, [todayDate]);

  const handleSaveSingleDay = async (clearOverride = false) => {
    if (!selectedCell || !selectedRoomObj) return;
    setIsSavingDay(true);
    try {
      const parsedPrice = Number(editPriceThb);
      const res = await fetch("/api/studio/date-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          roomId: selectedCell.roomId,
          dateStr: selectedCell.dateStr,
          blockedUnits: clearOverride ? 0 : editBlockedUnits,
          overridePriceThb:
            clearOverride || !editPriceThb.trim() || !Number.isFinite(parsedPrice)
              ? null
              : Math.max(100, Math.round(parsedPrice)),
          minNights: clearOverride ? 1 : Math.max(1, editMinNights),
          note: clearOverride ? null : editNote.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกข้อมูลวันนี้ไม่สำเร็จ");
        return;
      }
      setSelectedCell(null);
      onNotify(
        clearOverride
          ? "คืนค่าราคาและสถานะปกติแล้ว"
          : "บันทึกการเปลี่ยนแปลงเรียบร้อย"
      );
      await onReload();
    } finally {
      setIsSavingDay(false);
    }
  };

  const handleSaveBulk = async (resetAll = false) => {
    const targets =
      viewMode === "month" && activeRoom ? [activeRoom.id] : bulkRoomIds;
    if (targets.length === 0) {
      onNotify("กรุณาเลือกอย่างน้อย 1 ห้องพัก");
      return;
    }
    if (!bulkStartDate || !bulkEndDate || bulkEndDate < bulkStartDate) {
      onNotify("กรุณาระบุช่วงวันที่ให้ถูกต้อง");
      return;
    }
    setIsSavingBulk(true);
    try {
      const payload: Record<string, unknown> = {
        hotelSlug: hotel.slug,
        roomIds: targets,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        daysOfWeek: bulkDaysOfWeek,
        resetAll,
      };
      if (!resetAll) {
        if (bulkPriceAction === "set") {
          const parsed = Number(bulkPriceThb);
          if (!Number.isFinite(parsed) || parsed < 100) {
            onNotify("กรุณาระบุราคาพิเศษตั้งแต่ 100 บาทขึ้นไป");
            setIsSavingBulk(false);
            return;
          }
          payload.overridePriceThb = Math.round(parsed);
        } else if (bulkPriceAction === "clear") {
          payload.clearPriceOverride = true;
        }
        if (bulkBlockAction === "open") payload.blockedUnits = 0;
        else if (bulkBlockAction === "close_all") payload.blockedUnits = 999;

        payload.minNights = Math.max(1, bulkMinNights);
        if (bulkNote.trim()) payload.note = bulkNote.trim();
      }

      const res = await fetch("/api/studio/date-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        updatedCount?: number;
      };
      if (!res.ok) {
        onNotify(json.error || "อัปเดตช่วงวันไม่สำเร็จ");
        return;
      }
      setIsBulkModalOpen(false);
      onNotify(
        resetAll
          ? `คืนค่าปกติ ${json.updatedCount ?? 0} รายการแล้ว`
          : `อัปเดตปฏิทิน ${json.updatedCount ?? 0} รายการเรียบร้อย`
      );
      await onReload();
    } finally {
      setIsSavingBulk(false);
    }
  };

  const applyQuickPercent = (pct: number) => {
    if (!selectedMetrics) return;
    const base = selectedMetrics.defaultPrice;
    const next = Math.max(100, Math.round((base * (1 + pct / 100)) / 10) * 10);
    setEditPriceThb(String(next));
  };

  if (rooms.length === 0) {
    return (
      <div className="cgr-admin-page">
        <div className="cgr-admin-body py-16">
          <div className="max-w-[420px] mx-auto text-center space-y-4">
            <p className="ws-title">ยังไม่มีห้องพักในระบบ</p>
            <p className="ws-body text-[var(--color-text-secondary)]">
              กรุณาเพิ่มประเภทห้องพักอย่างน้อย 1 แบบในหน้า &ldquo;ห้องพัก&rdquo; เพื่อเริ่มจัดการปฏิทินและราคา
            </p>
            <Link
              href={buildHref("/studio/listings/rooms")}
              className="inline-flex items-center h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong transition-colors"
            >
              ไปเพิ่มห้องพัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mobileStripDays = matrixDays;
  const selectedMobileTotals = rooms.reduce(
    (acc, rm) => {
      const m = getCellMetrics(rm, selectedMobileDate);
      return { free: acc.free + m.free, total: acc.total + rm.totalUnits };
    },
    { free: 0, total: 0 }
  );

  // =========================================================================
  // UNIFIED 1160px CALENDAR STAGE (Mobile-First Month Grid + 7-Day Agenda / Desktop Matrix)
  // =========================================================================
  return (
    <div className="cgr-admin-page">
      {/* ═══ SINGLE-ROW COMPACT TOP TOOLBAR (Matches 1160px /admin & /studio) ═══ */}
      <div className="cgr-admin-toolbar">
        {/* Left: Month Picker OR Date Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {viewMode === "month" ? (
            <>
              <div className="min-w-[138px] sm:min-w-[175px]">
                <ResponsiveSelect
                  value={`${monthCursor.year}-${monthCursor.month}`}
                  onChange={(val) => {
                    const [y, m] = val.split("-").map(Number);
                    if (Number.isFinite(y) && Number.isFinite(m)) {
                      setMonthCursor({ year: y, month: m });
                    }
                  }}
                  sheetTitle="เลือกเดือน"
                  triggerClassName="h-9 px-2 -ml-1 rounded-full bg-transparent hover:bg-[var(--color-background-muted)] ws-subtitle sm:!text-[20px] !font-semibold whitespace-nowrap"
                  options={monthDropdownOptions}
                />
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((prev) =>
                      prev.month === 0
                        ? { year: prev.year - 1, month: 11 }
                        : { year: prev.year, month: prev.month - 1 }
                    )
                  }
                  aria-label="เดือนก่อนหน้า"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((prev) =>
                      prev.month === 11
                        ? { year: prev.year + 1, month: 0 }
                        : { year: prev.year, month: prev.month + 1 }
                    )
                  }
                  aria-label="เดือนถัดไป"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <h1 className="hidden md:block ws-title truncate">
                ปฏิทินรวมทุกห้อง
              </h1>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setMatrixStartDate((prev) => addDaysToDate(prev, -7))
                  }
                  aria-label="ย้อน 7 วัน"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatrixStartDate(todayStr);
                    setSelectedMobileDate(todayStr);
                  }}
                  className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-badge text-[var(--color-text-primary)] cursor-pointer transition-colors whitespace-nowrap"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMatrixStartDate((prev) => addDaysToDate(prev, 7))
                  }
                  aria-label="ถัดไป 7 วัน"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Compact Mode Toggle + Bulk Price + Seasonal */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rooms.length >= 2 && (
            <div className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeRoom) handleSelectRoomForMonth(activeRoom);
                }}
                className={`h-8 px-2.5 sm:px-3 rounded-full ws-badge whitespace-nowrap cursor-pointer transition-colors ${
                  viewMode === "month"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                รายเดือน
              </button>
              <button
                type="button"
                onClick={handleSwitchToMatrix}
                className={`h-8 px-2.5 sm:px-3 rounded-full ws-badge whitespace-nowrap cursor-pointer transition-colors ${
                  viewMode === "matrix"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                รวมห้อง
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (viewMode === "month" && activeRoom) {
                setBulkRoomIds([activeRoom.id]);
              } else {
                setBulkRoomIds(rooms.map((r) => r.id));
              }
              setIsBulkModalOpen(true);
            }}
            title="ปรับราคาช่วงวัน / ปิดห้องหลายวัน"
            className="h-9 w-9 sm:w-auto sm:px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ws-caption-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <CalendarRange className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="hidden sm:inline">ปรับช่วงวัน</span>
          </button>

          <Link
            href={buildHref("/studio/listings/seasonal")}
            title="ตั้งราคาฤดูกาล"
            className="hidden sm:inline-flex h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ws-caption-medium items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="hidden lg:inline">ฤดูกาล</span>
          </Link>
        </div>
      </div>

      {/* ═══ MAIN CALENDAR BODY (1160px Aligned — Sticky Top Headers + Independent Vertical Scroll) ═══ */}
      <div
        className={`cgr-admin-body ${
          viewMode === "month"
            ? "!overflow-hidden flex flex-col !py-0"
            : "py-4 sm:py-6 max-md:!overflow-hidden max-md:flex max-md:flex-col max-md:!py-0"
        }`}
      >
        {/* VIEW 1: MOBILE-OPTIMIZED & DESKTOP SPACIOUS MONTH GRID */}
        {viewMode === "month" && activeRoom ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Pinned Top Room Switcher Pills (Scroll-X, hidden scrollbar) + 7-Column Weekday Header */}
            <div className="shrink-0 bg-[var(--color-background-body)] pt-3 sm:pt-4 pb-2 border-b border-[var(--color-border)] space-y-3">
              {rooms.length >= 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scroll-px-4 sm:scroll-px-6 pb-0.5">
                  {rooms.map((rm) => {
                    const picked = rm.id === activeRoom.id;
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => handleSelectRoomForMonth(rm)}
                        className={`h-9 px-3.5 rounded-full ws-caption-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          picked
                            ? "bg-[var(--color-accent)] !text-white font-semibold"
                            : "bg-[var(--color-background-muted)] !text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                        }`}
                      >
                        {rm.code} · {rm.nameTh}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 7-Column Weekday Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                {SUNDAY_FIRST_WEEKDAYS_TH.map((wd) => (
                  <div
                    key={wd}
                    className="text-center ws-badge font-medium text-[var(--color-text-secondary)]"
                  >
                    {wd}
                  </div>
                ))}
              </div>
            </div>

            {/* Independently Scrollable 7-Column Month Grid + Legend */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain cgr-scroll-autohide pt-3 pb-20 sm:pb-10 space-y-4">
              <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
              {buildSundayFirstMonthCells(
                monthCursor.year,
                monthCursor.month
              ).map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[68px] sm:h-[104px] lg:h-[116px]"
                    />
                  );
                }

                const isPast = cell.dateStr < todayStr;
                const isToday = cell.dateStr === todayStr;
                const m = getCellMetrics(activeRoom, cell.dateStr);
                const isClosed = m.free === 0;
                const isPartiallyBooked = !isClosed && m.booked > 0;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    disabled={isPast}
                    onClick={() => openDayEditor(activeRoom, cell.dateStr)}
                    className={`min-h-[68px] sm:h-[104px] lg:h-[116px] rounded-[12px] sm:rounded-[14px] p-1.5 sm:p-3 flex flex-col justify-between text-left transition-colors ${
                      isPast
                        ? "bg-[var(--color-background-muted)]/60 text-[var(--color-text-tertiary)] cursor-not-allowed"
                        : isClosed
                          ? "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] cursor-pointer"
                          : isPartiallyBooked
                            ? "bg-[#edf5fd]/75 border border-[var(--color-accent)]/30 hover:border-[var(--color-accent)] text-[var(--color-text-primary)] cursor-pointer"
                            : "bg-[var(--color-background-card)] border border-[var(--color-border)] hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-0.5 w-full">
                      <span
                        className={`text-[13px] sm:text-[14px] font-semibold tabular-nums leading-none ${
                          isToday
                            ? "inline-flex items-center justify-center min-w-[22px] h-[22px] sm:min-w-[26px] sm:h-[26px] px-1 rounded-full bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                            : isPast || isClosed
                              ? "line-through opacity-70"
                              : ""
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {!isPast && m.hasCustomPrice && (
                        <span
                          title={m.ov?.note || "ราคาพิเศษเฉพาะวัน"}
                          className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0"
                        />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0 w-full">
                      {/* Mobile compact price (never truncates!) */}
                      <span
                        className={`sm:hidden block text-[12px] tabular-nums leading-none ${
                          isPast
                            ? "text-[var(--color-text-tertiary)] font-normal"
                            : isClosed
                              ? "text-[var(--color-text-secondary)] font-normal"
                              : m.hasCustomPrice
                                ? "text-[var(--color-accent)] font-semibold"
                                : "text-[var(--color-text-primary)] font-medium"
                        }`}
                      >
                        {isClosed
                          ? m.booked > 0
                            ? "เต็ม"
                            : "ปิด"
                          : formatMobileBaht(m.price)}
                      </span>

                      {/* Desktop full price */}
                      <span
                        className={`hidden sm:block text-[14px] tabular-nums leading-tight truncate ${
                          isPast
                            ? "text-[var(--color-text-tertiary)] font-normal"
                            : m.hasCustomPrice
                              ? "text-[var(--color-accent)] font-semibold"
                              : "text-[var(--color-text-secondary)] font-medium"
                        }`}
                      >
                        {formatCompactBaht(m.price)}
                      </span>

                      {/* Mobile booking sub-indicator when partially booked */}
                      {!isPast && isPartiallyBooked && (
                        <span className="sm:hidden block text-[12px] leading-none font-medium text-[var(--color-accent)] tabular-nums">
                          {m.free}/{activeRoom.totalUnits}
                        </span>
                      )}

                      {/* Desktop status / note line */}
                      {!isPast &&
                        (isClosed ||
                          m.booked > 0 ||
                          m.minNights > 1 ||
                          m.ov?.note) && (
                          <span className="hidden sm:block ws-badge font-normal text-[var(--color-text-secondary)] truncate leading-none">
                            {isClosed
                              ? m.booked > 0
                                ? "จองเต็ม"
                                : "ปิดขาย"
                              : m.ov?.note
                                ? m.ov.note
                                : m.booked > 0
                                  ? `ว่าง ${m.free}/${activeRoom.totalUnits}`
                                  : `ขั้นต่ำ ${m.minNights} คืน`}
                          </span>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Compact Legend & Hint */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)] ws-caption">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <span>ราคาพิเศษ</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#edf5fd] border border-[var(--color-accent)]/30" />
                  <span>มีจองแล้ว</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[var(--color-background-muted)]" />
                  <span>เต็ม / ปิดขาย</span>
                </span>
              </div>
              <span className="hidden sm:inline">
                คลิกที่วันใดก็ได้เพื่อปรับราคา ปิดรับจอง หรือกำหนดคืนขั้นต่ำ
              </span>
            </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: MOBILE STICKY 14-DAY HORIZONTAL STRIP + DESKTOP 14-DAY MATRIX */
          <div className="flex flex-col flex-1 min-h-0 md:space-y-5">
            {/* ─── MOBILE (< md): Sticky Scroll-X 14-Day Date Strip + Independently Scrollable Room List ─── */}
            <div className="md:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Pinned Top Date Strip + Summary (Never scrolls vertically; swipes smoothly horizontally) */}
              <div className="shrink-0 bg-[var(--color-background-body)] pt-3 pb-3 border-b border-[var(--color-border)] space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar -mx-4 px-4 scroll-px-4">
                  {mobileStripDays.map((day) => {
                    const isSelected = day.dateStr === selectedMobileDate;
                    const freeAll = rooms.reduce(
                      (sum, rm) => sum + getCellMetrics(rm, day.dateStr).free,
                      0
                    );
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedMobileDate(day.dateStr)}
                        className={`w-[52px] shrink-0 py-2 px-1 rounded-[14px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[var(--color-accent)] !text-white"
                            : day.isToday
                              ? "bg-[#edf5fd] text-[var(--color-accent)]"
                              : "bg-[var(--color-background-muted)]/65 text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span
                          className={`text-[12px] leading-none ${
                            isSelected
                              ? "text-white/85"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {day.weekdayLabel}
                        </span>
                        <span className="text-[15px] font-semibold tabular-nums leading-none">
                          {day.dayNum}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            freeAll > 0
                              ? isSelected
                                ? "bg-[var(--color-accent-yellow)]"
                                : "bg-[var(--color-accent)]"
                              : isSelected
                                ? "bg-white/40"
                                : "bg-[var(--color-border-emphasized)]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Summary Line (also pinned cleanly under the strip) */}
                <div className="flex items-center justify-between gap-2">
                  <p className="ws-subtitle">
                    {formatShortDate(selectedMobileDate, "th")}
                  </p>
                  <span className="ws-caption tabular-nums">
                    ว่างรวม {selectedMobileTotals.free}/{selectedMobileTotals.total}{" "}
                    ห้อง
                  </span>
                </div>
              </div>

              {/* Independently Scrollable Vertical Room List for Selected Date */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain cgr-scroll-autohide pb-20">
                <div className="divide-y divide-[var(--color-border)]">
                  {rooms.map((room) => {
                    const m = getCellMetrics(room, selectedMobileDate);
                    const isClosed = m.free === 0;
                    return (
                      <div
                        key={room.id}
                        onClick={() => openDayEditor(room, selectedMobileDate)}
                        className="py-3.5 flex items-center justify-between gap-3 cursor-pointer active:bg-[var(--color-background-muted)]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {room.galleryUrls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={room.galleryUrls[0]}
                              alt={room.nameTh}
                              className="h-12 w-12 aspect-square rounded-[12px] object-cover bg-[var(--color-background-muted)] shrink-0"
                            />
                          ) : (
                            <span className="h-12 w-12 aspect-square rounded-[12px] bg-[var(--color-background-muted)] inline-flex items-center justify-center ws-badge text-[var(--color-text-secondary)] shrink-0">
                              {room.code}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="ws-body-medium truncate">
                              {room.code} · {room.nameTh}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full ws-badge ${
                                  isClosed
                                    ? "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                                    : m.booked > 0
                                      ? "bg-[#edf5fd] text-[var(--color-accent)]"
                                      : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                                }`}
                              >
                                {isClosed
                                  ? m.booked > 0
                                    ? "จองเต็ม"
                                    : "ปิดขาย"
                                  : `ว่าง ${m.free}/${room.totalUnits}`}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectRoomForMonth(room);
                                }}
                                className="ws-badge text-[var(--color-accent)] hover:underline cursor-pointer"
                              >
                                ดูรายเดือน →
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`ws-subtitle tabular-nums ${
                              m.hasCustomPrice ? "!text-[var(--color-accent)]" : ""
                            }`}
                          >
                            ฿{m.price.toLocaleString()}
                          </p>
                          <p className="ws-caption">ต่อคืน</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="ws-caption pt-2">
                  แตะที่ห้องเพื่อปรับราคาหรือปิด–เปิดขายสำหรับวันนี้
                </p>
              </div>
            </div>

            {/* ─── DESKTOP (>= md): Breathable 14-Day Multi-Room Matrix ─── */}
            <div className="hidden md:block space-y-4">
              <div className="overflow-x-auto cgr-scroll-autohide">
                <table className="w-full min-w-[920px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="sticky left-0 z-10 bg-[var(--color-background-body)] text-left py-3.5 pr-5 w-[240px] ws-caption-medium">
                        ประเภทห้องพัก
                      </th>
                      {matrixDays.map((day) => (
                        <th
                          key={day.dateStr}
                          className={`py-3 px-1 text-center font-normal ${
                            day.isWeekend
                              ? "bg-[var(--color-background-muted)]/45"
                              : ""
                          }`}
                        >
                          <span className="block ws-badge font-normal text-[var(--color-text-secondary)]">
                            {day.weekdayLabel}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center min-w-[26px] h-[26px] px-1 rounded-full text-[14px] font-semibold tabular-nums mt-0.5 ${
                              day.isToday
                                ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                                : "text-[var(--color-text-primary)]"
                            }`}
                          >
                            {day.dayNum}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="sticky left-0 z-10 bg-[var(--color-background-body)] py-3.5 pr-5 align-middle">
                          <button
                            type="button"
                            onClick={() => handleSelectRoomForMonth(room)}
                            className="flex items-center gap-3 text-left group cursor-pointer"
                          >
                            {room.galleryUrls[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={room.galleryUrls[0]}
                                alt={room.nameTh}
                                className="h-11 w-11 aspect-square rounded-[12px] object-cover bg-[var(--color-background-muted)] shrink-0"
                              />
                            ) : (
                              <span className="h-11 w-11 aspect-square rounded-[12px] bg-[var(--color-background-muted)] inline-flex items-center justify-center ws-badge text-[var(--color-text-secondary)] shrink-0">
                                {room.code}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="ws-body-strong truncate group-hover:underline">
                                {room.code} · {room.nameTh}
                              </p>
                              <p className="ws-caption">
                                {room.totalUnits} ยูนิต · ดูรายเดือน →
                              </p>
                            </div>
                          </button>
                        </td>

                        {matrixDays.map((day) => {
                          const m = getCellMetrics(room, day.dateStr);
                          const isClosed = m.free === 0;

                          return (
                            <td
                              key={day.dateStr}
                              className={`py-2.5 px-1 text-center align-middle ${
                                day.isWeekend
                                  ? "bg-[var(--color-background-muted)]/35"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => openDayEditor(room, day.dateStr)}
                                className={`w-full h-[58px] rounded-[12px] px-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                                  isClosed
                                    ? "bg-[var(--color-background-muted)] text-[var(--color-text-tertiary)]"
                                    : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                                }`}
                              >
                                <span
                                  className={`text-[13px] font-semibold tabular-nums leading-none ${
                                    isClosed ? "line-through" : ""
                                  }`}
                                >
                                  {m.free}/{room.totalUnits}
                                </span>
                                <span
                                  className={`text-[12px] tabular-nums leading-none ${
                                    m.hasCustomPrice
                                      ? "font-semibold text-[var(--color-accent)]"
                                      : "text-[var(--color-text-secondary)]"
                                  }`}
                                >
                                  ฿{formatMobileBaht(m.price)}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="ws-caption">
                คลิกชื่อห้องด้านซ้ายเพื่อดูปฏิทินรายเดือนเต็ม · คลิกที่ช่องวันเพื่อปรับราคาหรือปิด–เปิดห้อง
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          SINGLE DAY EDITOR MODAL / SLIDE-UP SHEET (Unified Airbnb Inputs!)
      ====================================================================== */}
      <StudioSheetModal
        isOpen={Boolean(selectedCell && selectedRoomObj && selectedMetrics)}
        onClose={() => setSelectedCell(null)}
        title={
          selectedCell ? formatShortDate(selectedCell.dateStr, "th") : ""
        }
        subtitle={
          selectedRoomObj && selectedMetrics
            ? `${selectedRoomObj.code} · ${selectedRoomObj.nameTh}${
                selectedMetrics.booked > 0
                  ? ` · มีจองแล้ว ${selectedMetrics.booked} ห้อง`
                  : ""
              }`
            : undefined
        }
        footer={
          selectedMetrics && (
            <div className="flex items-center justify-between gap-3">
              {selectedMetrics.ov || editPriceThb || editBlockedUnits > 0 ? (
                <button
                  type="button"
                  disabled={isSavingDay}
                  onClick={() => handleSaveSingleDay(true)}
                  className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
                >
                  คืนค่าปกติ
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSavingDay}
                  onClick={() => handleSaveSingleDay(false)}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSavingDay ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedRoomObj && selectedMetrics && (
          <div className="divide-y divide-[var(--color-border)]">
            {/* Section 1: Open / Close */}
            <div className="pb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  เปิดรับจองคืนนี้
                </p>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                  ว่างพร้อมขาย{" "}
                  {Math.max(
                    0,
                    selectedRoomObj.totalUnits -
                      selectedMetrics.booked -
                      editBlockedUnits
                  )}{" "}
                  / {selectedRoomObj.totalUnits} ห้อง
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={
                  editBlockedUnits <
                  Math.max(
                    1,
                    selectedRoomObj.totalUnits - selectedMetrics.booked
                  )
                }
                onClick={() => {
                  const maxBlock = Math.max(
                    0,
                    selectedRoomObj.totalUnits - selectedMetrics.booked
                  );
                  setEditBlockedUnits((prev) =>
                    prev >= maxBlock ? 0 : maxBlock
                  );
                }}
                className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  editBlockedUnits <
                  Math.max(
                    1,
                    selectedRoomObj.totalUnits - selectedMetrics.booked
                  )
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border-emphasized)]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full transition-transform ${
                    editBlockedUnits <
                    Math.max(
                      1,
                      selectedRoomObj.totalUnits - selectedMetrics.booked
                    )
                      ? "translate-x-5 bg-white"
                      : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            {/* Section 2: Nightly Price */}
            <div className="py-6 space-y-3.5">
              <StandardInput
                label="ราคาคืนนี้ (บาท)"
                optionalText={`ปกติ ฿${selectedMetrics.defaultPrice.toLocaleString()}`}
                prefixText="฿"
                type="number"
                min={100}
                placeholder={String(selectedMetrics.defaultPrice)}
                value={editPriceThb}
                onChange={(e) => setEditPriceThb(e.target.value)}
                className="font-semibold tabular-nums"
              />

              <div className="flex flex-wrap gap-1.5">
                {[-10, 10, 20, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyQuickPercent(pct)}
                    className="h-8 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-caption-medium !text-[var(--color-text-primary)] cursor-pointer transition-colors"
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
                {editPriceThb && (
                  <button
                    type="button"
                    onClick={() => setEditPriceThb("")}
                    className="h-8 px-2.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
                  >
                    ใช้ราคาปกติ
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Steppers (Allotment & Min Nights) */}
            <div className="py-5 divide-y divide-[var(--color-border-subtle)]">
              {selectedRoomObj.totalUnits > 1 && (
                <StandardStepperRow
                  label="ปิดขายบางห้อง (ยูนิต)"
                  description={`มีจองแล้ว ${selectedMetrics.booked} จาก ${selectedRoomObj.totalUnits} ห้อง`}
                  value={editBlockedUnits}
                  min={0}
                  max={Math.max(
                    0,
                    selectedRoomObj.totalUnits - selectedMetrics.booked
                  )}
                  onChange={setEditBlockedUnits}
                />
              )}

              <StandardStepperRow
                label="จำนวนคืนเข้าพักขั้นต่ำ"
                description="บังคับพักขั้นต่ำเมื่อเช็กอินคืนนี้"
                value={editMinNights}
                min={1}
                max={30}
                onChange={setEditMinNights}
              />
            </div>

            {/* Section 4: Private Note */}
            <div className="pt-6">
              <StandardInput
                label="หมายเหตุส่วนตัว"
                optionalText="ไม่บังคับ"
                placeholder="เช่น เทศกาลปีใหม่ / ปิดซ่อมบำรุง"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
          </div>
        )}
      </StudioSheetModal>

      {/* =====================================================================
          BULK DATE-RANGE MODAL / SLIDE-UP SHEET (Unified Airbnb Inputs!)
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="ปรับราคาช่วงวัน / ปิดห้องหลายวัน"
        subtitle={
          viewMode === "month" && activeRoom
            ? `เฉพาะห้อง ${activeRoom.code} · ${activeRoom.nameTh}`
            : "เลือกปรับหลายห้องพร้อมกันในช่วงวันที่ต้องการ"
        }
        maxWidthClass="md:max-w-[600px]"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSavingBulk}
              onClick={() => handleSaveBulk(true)}
              className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
            >
              ล้างค่าพิเศษช่วงนี้
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSavingBulk}
                onClick={() => handleSaveBulk(false)}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSavingBulk ? "กำลังอัปเดต..." : "บันทึกช่วงวัน"}
              </button>
            </div>
          </div>
        }
      >
        <div className="divide-y divide-[var(--color-border)]">
          {viewMode === "matrix" && rooms.length > 1 && (
            <div className="pb-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  เลือกห้องพัก
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBulkRoomIds(
                      bulkRoomIds.length === rooms.length
                        ? [rooms[0].id]
                        : rooms.map((r) => r.id)
                    )
                  }
                  className="text-[13px] font-medium underline underline-offset-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  {bulkRoomIds.length === rooms.length
                    ? "เลือกห้องเดียว"
                    : "เลือกทุกห้อง"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {rooms.map((rm) => {
                  const picked = bulkRoomIds.includes(rm.id);
                  return (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() =>
                        setBulkRoomIds((prev) =>
                          prev.includes(rm.id)
                            ? prev.filter((id) => id !== rm.id)
                            : [...prev, rm.id]
                        )
                      }
                      className={`h-9 px-3.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                        picked
                          ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      {rm.code} · {rm.nameTh}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Range (Airbnb 2-Month Picker / Mobile Bottom Sheet) */}
          <div className="py-6 first:pt-0 space-y-4">
            <h3 className="ws-subtitle">ช่วงวันที่</h3>
            <StudioDateRangePicker
              startDate={bulkStartDate}
              endDate={bulkEndDate}
              onChange={(nextStart, nextEnd) => {
                setBulkStartDate(nextStart);
                setBulkEndDate(nextEnd);
              }}
            />

            <div className="grid grid-cols-7 gap-1.5">
              {DAY_OF_WEEK_PILLS.map((item) => {
                const active = bulkDaysOfWeek.includes(item.dow);
                return (
                  <button
                    key={item.dow}
                    type="button"
                    onClick={() =>
                      setBulkDaysOfWeek((prev) =>
                        prev.includes(item.dow)
                          ? prev.length > 1
                            ? prev.filter((d) => d !== item.dow)
                            : prev
                          : [...prev, item.dow].sort()
                      )
                    }
                    className={`h-9 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                      active
                        ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                        : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price & Status */}
          <div className="py-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              ราคาและสถานะห้อง
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "set" as const, label: "ตั้งราคาใหม่" },
                { id: "keep" as const, label: "คงราคาเดิม" },
                { id: "clear" as const, label: "คืนราคาปกติ" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBulkPriceAction(opt.id)}
                  className={`h-9 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                    bulkPriceAction === opt.id
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {bulkPriceAction === "set" && (
              <StandardInput
                label="ราคาพิเศษต่อคืน"
                prefixText="฿"
                type="number"
                min={100}
                placeholder="เช่น 4500"
                value={bulkPriceThb}
                onChange={(e) => setBulkPriceThb(e.target.value)}
                className="font-semibold tabular-nums"
              />
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: "keep" as const, label: "สถานะคงเดิม" },
                { id: "open" as const, label: "เปิดขายเต็ม" },
                { id: "close_all" as const, label: "ปิดขายทั้งหมด" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBulkBlockAction(opt.id)}
                  className={`h-9 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                    bulkBlockAction === opt.id
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Nights & Note */}
          <div className="pt-5 space-y-4">
            <StandardStepperRow
              label="พักขั้นต่ำในช่วงนี้ (คืน)"
              value={bulkMinNights}
              min={1}
              max={30}
              onChange={setBulkMinNights}
            />

            <StandardInput
              label="ชื่อช่วง / หมายเหตุ"
              optionalText="ไม่บังคับ"
              placeholder="เช่น หยุดยาววันปิยะ"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
            />
          </div>
        </div>
      </StudioSheetModal>
    </div>
  );
}
