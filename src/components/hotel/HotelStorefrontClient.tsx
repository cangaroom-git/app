"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Images,
  Info,
  MapPin,
  Maximize,
  MessageCircle,
  Minus,
  PawPrint,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Tag,
  Users,
} from "lucide-react";
import {
  addDaysToDate,
  computeNightsBetween,
  formatDateStr,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { trackTelemetryEvent } from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import {
  RoomBookingDrawer,
  type RoomBookingDrawerStep,
} from "@/components/drawers/RoomBookingDrawer";
import type {
  CouponDealDto,
  HotelStorefrontDto,
  PinCommentDto,
  PinFeedItemDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

export type HotelProfileTabId =
  | "posts"
  | "rooms"
  | "blog"
  | "reviews"
  | "more";

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

interface InlineRoomCalendarProps {
  language: LanguageCode;
  todayDate: Date;
  checkInDate: string;
  checkOutDate: string;
  onChangeDates: (nextIn: string, nextOut: string) => void;
  guestCount: number;
  onChangeGuestCount: (guests: number) => void;
  stayNights: number;
  isRefreshing: boolean;
  rooms: RoomAvailabilityDto[];
  matchingRoomsCount: number;
  onlyAvailableFilter: boolean;
  onToggleOnlyAvailable: (next: boolean) => void;
  onQuickSelectRoom: (room: RoomAvailabilityDto) => void;
}

function InlineRoomCalendarFilter({
  language,
  todayDate,
  checkInDate,
  checkOutDate,
  onChangeDates,
  guestCount,
  onChangeGuestCount,
  stayNights,
  isRefreshing,
  rooms,
  matchingRoomsCount,
  onlyAvailableFilter,
  onToggleOnlyAvailable,
  onQuickSelectRoom,
}: InlineRoomCalendarProps) {
  const [selectingPhase, setSelectingPhase] = useState<"checkin" | "checkout">(
    "checkin"
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);

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

  const effectiveRangeEnd =
    selectingPhase === "checkout" && hoverDate && hoverDate > checkInDate
      ? hoverDate
      : checkOutDate;

  const weekdayLabels = language === "th" ? WEEKDAYS_TH : WEEKDAYS_EN;

  const formatMonthTitle = (year: number, monthIdx: number) =>
    language === "th"
      ? `${MONTHS_TH[monthIdx]} ${year + 543}`
      : `${MONTHS_EN[monthIdx]} ${year}`;

  const renderMonthGrid = (year: number, monthIdx: number) => {
    const cells = buildMondayFirstMonthCells(year, monthIdx);
    return (
      <div className="w-full max-w-[272px] mx-auto select-none">
        <div className="grid grid-cols-7 mb-1">
          {weekdayLabels.map((wd) => (
            <div
              key={wd}
              className="h-7 flex items-center justify-center text-[12px] font-semibold text-[var(--color-text-secondary)]"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-8.5" />;
            }

            const { dateStr, dayNumber } = cell;
            const isPast = dateStr < todayStr;
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
                className="relative h-8.5 flex items-center justify-center"
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
                  className={`relative z-10 h-8 w-8 rounded-[10px] flex items-center justify-center text-[13px] transition-colors ${
                    isPast
                      ? "text-[var(--color-text-disabled)] cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111] font-bold cursor-pointer"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-medium cursor-pointer"
                  }`}
                >
                  <span>{dayNumber}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* LEFT 7 COLS: COMPACT PROPORTIONAL 2-MONTH CALENDAR (Zero Horizontal Stretch) */}
      <div className="lg:col-span-7 rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
            <span className="text-[14px] font-bold text-[var(--color-text-primary)]">
              {language === "th"
                ? "เลือกวันเช็กอิน – เช็กเอาต์"
                : "Select Check-in & Check-out"}
            </span>
          </div>

          <span className="text-[12px] text-[var(--color-text-secondary)]">
            {selectingPhase === "checkout"
              ? language === "th"
                ? "จิ้มวันเช็กเอาต์ต่อได้เลย"
                : "Now tap check-out date"
              : language === "th"
              ? "จิ้มวันที่เพื่อเช็กห้องว่างทันที"
              : "Tap dates to check live availability"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[8px] inline-flex items-center justify-center transition-colors ${
                canGoPrevMonth
                  ? "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] cursor-pointer"
                  : "text-[var(--color-text-disabled)] cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h3 className="text-center text-[14px] font-bold text-[var(--color-text-primary)]">
              {formatMonthTitle(leftMonth.year, leftMonth.month)}
            </h3>

            <h3 className="hidden sm:block text-center text-[14px] font-bold text-[var(--color-text-primary)]">
              {formatMonthTitle(rightMonth.year, rightMonth.month)}
            </h3>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>{renderMonthGrid(leftMonth.year, leftMonth.month)}</div>
            <div className="hidden sm:block">
              {renderMonthGrid(rightMonth.year, rightMonth.month)}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT 5 COLS: LIVE ROOM AVAILABILITY SUMMARY FOR SELECTED DATES */}
      <div className="lg:col-span-5 rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col justify-between gap-3.5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[var(--color-text-primary)] truncate">
                {formatShortDate(checkInDate, language)} –{" "}
                {formatShortDate(checkOutDate, language)} ({stayNights}{" "}
                {language === "th" ? "คืน" : "nights"})
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {isRefreshing
                  ? language === "th"
                    ? "กำลังอัปเดตสถานะห้องว่าง..."
                    : "Checking room availability..."
                  : language === "th"
                  ? `สถานะห้องพักว่าง ${matchingRoomsCount} จาก ${rooms.length} แบบห้อง`
                  : `${matchingRoomsCount} of ${rooms.length} room types available`}
              </p>
            </div>

            {/* Guest Count Stepper */}
            <div className="h-8 px-2.5 rounded-[8px] bg-[var(--color-background-muted)] inline-flex items-center gap-2 shrink-0">
              <Users className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              <button
                type="button"
                onClick={() => onChangeGuestCount(Math.max(1, guestCount - 1))}
                aria-label="Decrease guests"
                className="h-5 w-5 rounded-[5px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[12px] font-bold min-w-[28px] text-center">
                {guestCount} {language === "th" ? "ท่าน" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChangeGuestCount(Math.min(12, guestCount + 1))}
                aria-label="Increase guests"
                className="h-5 w-5 rounded-[5px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Per-Room Live Availability Breakdown */}
          <div className="space-y-1.5 max-h-[196px] overflow-y-auto pr-0.5">
            {rooms.map((rm) => {
              const hasUnits = rm.availableUnits > 0;
              const fitsGuests = rm.maxGuests >= guestCount;
              const isReady = hasUnits && fitsGuests;

              return (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => onQuickSelectRoom(rm)}
                  className={`w-full px-3 py-2 rounded-[10px] border border-[var(--color-border)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                    isReady
                      ? "bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)]/60"
                      : "bg-[var(--color-background-muted)]/50 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-[5px] bg-[var(--color-background-muted)] text-[11px] font-bold text-[var(--color-text-primary)] shrink-0">
                      {rm.code}
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                      {language === "th" ? rm.nameTh : rm.nameEn}
                    </span>
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        !hasUnits
                          ? "bg-rose-500"
                          : !fitsGuests
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span
                      className={
                        isReady
                          ? "text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      {!hasUnits
                        ? language === "th"
                          ? "เต็มช่วงนี้"
                          : "Sold out"
                        : !fitsGuests
                        ? language === "th"
                          ? `สูงสุด ${rm.maxGuests} ท่าน`
                          : `Max ${rm.maxGuests}`
                        : language === "th"
                        ? `ว่าง ${rm.availableUnits} · ฿${rm.weekdayPriceThb.toLocaleString()}`
                        : `${rm.availableUnits} left · ฿${rm.weekdayPriceThb.toLocaleString()}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            {language === "th"
              ? "คลิกห้องด้านบนเพื่อดูรายละเอียดหรือกรองการ์ดด้านล่าง"
              : "Click any room above or filter cards below"}
          </span>

          <button
            type="button"
            onClick={() => onToggleOnlyAvailable(!onlyAvailableFilter)}
            className={`h-8 px-3 rounded-[8px] text-[12px] font-semibold shrink-0 cursor-pointer transition-colors ${
              onlyAvailableFilter
                ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
            }`}
          >
            {onlyAvailableFilter
              ? language === "th"
                ? `เฉพาะห้องว่าง (${matchingRoomsCount})`
                : `Available (${matchingRoomsCount})`
              : language === "th"
              ? "กรองเฉพาะห้องว่าง"
              : "Filter available"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HotelStorefrontClient({
  initialStorefront,
  hotelSlug,
  initialTab = "posts",
}: {
  initialStorefront: HotelStorefrontDto;
  hotelSlug: string;
  initialTab?: HotelProfileTabId;
}) {
  const cleanSlug = hotelSlug.trim().toLowerCase();
  const router = useRouter();

  const {
    lang: language,
    user: currentUser,
    refreshMe,
    today,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    guests,
    setGuests,
    claimCouponToWallet,
    openCouponWallet,
  } = useHotelApp();

  const [storefront, setStorefront] =
    useState<HotelStorefrontDto>(initialStorefront);
  const [isRefreshingDates, setIsRefreshingDates] = useState(false);

  const [activeProfileTab, setActiveProfileTab] =
    useState<HotelProfileTabId>(initialTab);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [onlyAvailableRooms, setOnlyAvailableRooms] = useState(false);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [pinHistoryStack, setPinHistoryStack] = useState<PinFeedItemDto[]>([]);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
  } | null>(null);
  const latestPinReqRef = useRef<string | null>(null);
  const [optimisticSavedIds, setOptimisticSavedIds] = useState<Set<string>>(
    () =>
      new Set(
        initialStorefront.pins.filter((p) => p.isSavedByMe).map((p) => p.id)
      )
  );
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [drawerRoom, setDrawerRoom] = useState<RoomAvailabilityDto | null>(null);
  const [drawerInitialStep, setDrawerInitialStep] =
    useState<RoomBookingDrawerStep>("details");
  const [initialCouponCode, setInitialCouponCode] = useState<string | null>(
    null
  );
  const [contactToast, setContactToast] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const didMountFetchRef = useRef(false);

  const selectProfileTab = useCallback((nextTab: HotelProfileTabId) => {
    setActiveProfileTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextTab === "posts") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", nextTab);
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const loadStorefront = useCallback(
    async (silent = true) => {
      if (!cleanSlug) return;
      if (!silent) setIsRefreshingDates(true);
      try {
        const qs = new URLSearchParams({ checkIn, checkOut });
        const res = await fetch(
          `/api/hotels/${encodeURIComponent(cleanSlug)}?${qs.toString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as HotelStorefrontDto;
        setStorefront(data);
        setOptimisticSavedIds(
          new Set(data.pins.filter((p) => p.isSavedByMe).map((p) => p.id))
        );
      } catch {
        // retain SSR storefront safely on transient failure
      } finally {
        setIsRefreshingDates(false);
      }
    },
    [cleanSlug, checkIn, checkOut]
  );

  // Sync URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const paramIn = sp.get("checkIn");
    const paramOut = sp.get("checkOut");
    if (paramIn && /^\d{4}-\d{2}-\d{2}$/.test(paramIn)) setCheckIn(paramIn);
    if (paramOut && /^\d{4}-\d{2}-\d{2}$/.test(paramOut)) setCheckOut(paramOut);

    const paramTab = sp.get("tab");
    if (
      paramTab === "posts" ||
      paramTab === "rooms" ||
      paramTab === "blog" ||
      paramTab === "reviews" ||
      paramTab === "more"
    ) {
      setActiveProfileTab(paramTab);
    } else if (paramTab === "info") {
      setActiveProfileTab("more");
    }

    const paramCoupon = sp.get("coupon");
    if (paramCoupon) {
      setInitialCouponCode(paramCoupon.toUpperCase());
      setActiveProfileTab("rooms");
    }

    const paramPin = sp.get("pin");
    if (paramPin) {
      setSelectedPinId(paramPin);
      setActiveProfileTab("posts");
    }

    const paramRoom = sp.get("room");
    if (paramRoom) {
      setActiveProfileTab("rooms");
      const matched = initialStorefront.rooms.find(
        (r) =>
          r.id === paramRoom ||
          r.code.toLowerCase() === paramRoom.toLowerCase() ||
          r.slug.toLowerCase() === paramRoom.toLowerCase()
      );
      if (matched) {
        setDrawerRoom(matched);
        setDrawerInitialStep(paramCoupon ? "checkout" : "details");
        setIsBookingDrawerOpen(true);
      }
    }
  }, [initialStorefront.rooms, setCheckIn, setCheckOut]);

  // Refresh availability immediately whenever user taps calendar dates or changes login
  useEffect(() => {
    if (!didMountFetchRef.current) {
      didMountFetchRef.current = true;
      return;
    }
    loadStorefront(false);
  }, [checkIn, checkOut, currentUser?.id, loadStorefront]);

  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (latestPinReqRef.current === pinId) {
        setPinDetail({ pin: data.pin, comments: data.comments });
      }
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      setPinDetail((prev) => (prev?.pin.id === selectedPinId ? prev : null));
      loadPinDetail(selectedPinId);
    } else {
      latestPinReqRef.current = null;
      setSelectedPinSnapshot(null);
      setPinDetail(null);
    }
  }, [selectedPinId, loadPinDetail]);

  const activePin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return storefront.pins.find((p) => p.id === selectedPinId) || null;
  }, [pinDetail, selectedPinId, selectedPinSnapshot, storefront.pins]);

  const activePinComments = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id ? pinDetail.comments : [],
    [activePin, pinDetail]
  );

  const openRoomModal = (
    room: RoomAvailabilityDto,
    step: RoomBookingDrawerStep = "details"
  ) => {
    trackTelemetryEvent({
      eventType: step === "checkout" ? "BOOKING_INITIATE" : "HOTEL_PROFILE_VIEW",
      hotelId: storefront.hotel.id,
      provinceId: storefront.hotel.provinceId,
      stayStyles: storefront.hotel.stayStyles.slice(0, 6),
      priceThb: room.weekdayPriceThb,
      guests,
    });
    setDrawerRoom(room);
    setDrawerInitialStep(step);
    setIsBookingDrawerOpen(true);
  };

  const gridHotelPins = useMemo(
    () =>
      activePin
        ? storefront.pins.filter((p) => p.id !== activePin.id)
        : storefront.pins,
    [storefront.pins, activePin]
  );

  const handleCloseHotelPin = useCallback(() => {
    latestPinReqRef.current = null;
    setPinHistoryStack([]);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
  }, []);

  const handleSelectPinFromMasonry = useCallback(
    (pin: PinFeedItemDto, pushStack = true) => {
      if (pushStack && activePin && activePin.id !== pin.id) {
        setPinHistoryStack((prev) =>
          [
            ...prev.filter((p) => p.id !== activePin.id && p.id !== pin.id),
            activePin,
          ].slice(-16)
        );
      }
      setSelectedPinSnapshot(pin);
      setPinDetail((prev) => (prev?.pin.id === pin.id ? prev : null));
      setSelectedPinId(pin.id);
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    },
    [activePin]
  );

  const handleStepBackHotelPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleCloseHotelPin();
      return;
    }
    const prevPin = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((prev) => prev.slice(0, -1));
    setSelectedPinSnapshot(prevPin);
    setPinDetail(null);
    setSelectedPinId(prevPin.id);
  }, [pinHistoryStack, handleCloseHotelPin]);

  const handleNavigateHotelPin = useCallback(
    (direction: "prev" | "next") => {
      if (!activePin || storefront.pins.length <= 1) return;
      const idx = storefront.pins.findIndex((p) => p.id === activePin.id);
      if (idx === -1) return;
      const nextIdx =
        direction === "next"
          ? (idx + 1) % storefront.pins.length
          : (idx - 1 + storefront.pins.length) % storefront.pins.length;
      const nextPin = storefront.pins[nextIdx];
      if (nextPin) {
        handleSelectPinFromMasonry(nextPin);
      }
    },
    [activePin, storefront.pins, handleSelectPinFromMasonry]
  );

  const handleSharePin = (pin: PinFeedItemDto) => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/${storefront.hotel.slug}?pin=${encodeURIComponent(
      pin.id
    )}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setContactToast(
      language === "th" ? "คัดลอกลิงก์โพสต์แล้ว" : "Post link copied"
    );
    window.setTimeout(() => setContactToast(null), 2200);
  };

  const handleContactClick = async (
    channel: "LINE" | "FACEBOOK_MESSENGER" | "PHONE"
  ) => {
    fetch(
      `/api/hotels/${encodeURIComponent(storefront.hotel.slug)}/contact-click`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      }
    ).catch(() => {});

    const prefillMsg = `สวัสดีครับ ดูที่พัก ${storefront.hotel.nameTh} มาจาก Cangaroom สนใจเข้าพักวันที่ ${checkIn} ถึง ${checkOut} (${guests} ท่าน)`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(prefillMsg).catch(() => {});
    }

    if (channel === "LINE" && storefront.hotel.contactLine) {
      const cleanLine = storefront.hotel.contactLine.replace(/^@/, "");
      setContactToast("คัดลอกข้อความวันเข้าพักแล้ว · กำลังเปิด LINE OA...");
      window.open(
        `https://line.me/R/ti/p/@${encodeURIComponent(cleanLine)}`,
        "_blank"
      );
    } else if (
      channel === "FACEBOOK_MESSENGER" &&
      storefront.hotel.facebookPageUrl
    ) {
      setContactToast("คัดลอกข้อความวันเข้าพักแล้ว · กำลังเปิดเพจที่พัก...");
      window.open(storefront.hotel.facebookPageUrl, "_blank");
    } else if (channel === "PHONE" && storefront.hotel.contactPhone) {
      window.location.href = `tel:${storefront.hotel.contactPhone.replace(
        /[^0-9+]/g,
        ""
      )}`;
      return;
    }
    window.setTimeout(() => setContactToast(null), 2800);
  };

  const handleClaimHotelCoupon = async (coupon: CouponDealDto) => {
    if (!currentUser) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/${cleanSlug}`)}`
      );
      return;
    }
    const res = await claimCouponToWallet({ couponId: coupon.id });
    setContactToast(res.message);
    window.setTimeout(() => setContactToast(null), 2600);
    await loadStorefront(true);
  };

  const { hotel, rooms, addons, coupons, reviews, dateOverrides, posts } =
    storefront;
  const stayNights = computeNightsBetween(checkIn, checkOut);

  const matchingAvailableRooms = useMemo(
    () => rooms.filter((r) => r.availableUnits > 0 && r.maxGuests >= guests),
    [rooms, guests]
  );

  const minRoomPrice = rooms.reduce(
    (min, r) => (r.weekdayPriceThb < min ? r.weekdayPriceThb : min),
    rooms[0]?.weekdayPriceThb ?? 0
  );

  const coverBannerUrl =
    hotel.coverImageUrl ||
    rooms[0]?.galleryUrls[0] ||
    storefront.pins[0]?.coverImageUrl ||
    hotel.logoUrl ||
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85";

  const avatarUrl =
    hotel.logoUrl ||
    hotel.coverImageUrl ||
    rooms[0]?.galleryUrls[0] ||
    coverBannerUrl;

  const allCoverSlides = useMemo<PureMediaSlide[]>(() => {
    const urls = new Set<string>();
    if (hotel.coverImageUrl) urls.add(hotel.coverImageUrl);
    for (const r of rooms) {
      for (const u of r.galleryUrls) urls.add(u);
    }
    for (const p of storefront.pins) {
      if (p.coverImageUrl) urls.add(p.coverImageUrl);
    }
    return Array.from(urls).map((url) => ({ type: "image", url }));
  }, [hotel.coverImageUrl, rooms, storefront.pins]);

  const fullBio =
    (language === "th" ? hotel.descriptionTh : hotel.descriptionEn) ||
    (language === "th" ? hotel.taglineTh : hotel.taglineEn) ||
    "";

  const handlePrimaryBookClick = () => {
    if (activeProfileTab === "rooms") {
      const firstReady = matchingAvailableRooms[0] || rooms[0];
      if (firstReady) openRoomModal(firstReady, "checkout");
    } else {
      selectProfileTab("rooms");
    }
  };

  const handlePrimaryContactClick = () => {
    if (hotel.contactLine) {
      void handleContactClick("LINE");
    } else if (hotel.facebookPageUrl) {
      void handleContactClick("FACEBOOK_MESSENGER");
    } else if (hotel.contactPhone) {
      void handleContactClick("PHONE");
    } else {
      selectProfileTab("more");
    }
  };

  return (
    <div className="cgr-page-standard space-y-6">
      {/* =====================================================================
          FACEBOOK COVER PHOTO BANNER + FLUSH PROPERTY IDENTITY HEADER
      ====================================================================== */}
      <header className="space-y-4">
        {/* Large Cover Photo Banner (100% Width = 1120px) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (allCoverSlides.length > 0) {
              setFullscreenMedia({ slides: allCoverSlides, index: 0 });
            }
          }}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              allCoverSlides.length > 0
            ) {
              e.preventDefault();
              setFullscreenMedia({ slides: allCoverSlides, index: 0 });
            }
          }}
          aria-label={
            language === "th" ? "เปิดดูรูปภาพหน้าปก" : "View cover photos"
          }
          className="relative w-full h-[210px] sm:h-[290px] lg:h-[340px] rounded-[20px] overflow-hidden bg-[var(--color-background-muted)] border border-[var(--color-border)] cursor-pointer"
        >
          <img
            src={coverBannerUrl}
            alt={hotel.nameTh}
            className="h-full w-full object-cover"
          />

          {allCoverSlides.length > 1 && (
            <span className="absolute bottom-3.5 right-3.5 h-8 px-3 rounded-[8px] bg-white/95 hover:bg-white text-[#111111] border border-black/10 text-[12px] font-semibold inline-flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5" />
              <span>
                {language === "th"
                  ? `ดูภาพทั้งหมด (${allCoverSlides.length})`
                  : `All photos (${allCoverSlides.length})`}
              </span>
            </span>
          )}
        </div>

        {/* Overlapping Profile Picture + Title + Flush Right Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
            <img
              src={avatarUrl}
              alt={hotel.nameTh}
              className="-mt-12 sm:-mt-16 ml-4 sm:ml-6 h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover bg-[var(--color-background-card)] ring-4 ring-[var(--color-background-body)] border border-[var(--color-border)] shrink-0 relative z-10"
            />

            <div className="pb-0.5 space-y-1 min-w-0">
              <h1 className="text-[22px] sm:text-[28px] font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
                <span className="truncate">
                  {language === "th" ? hotel.nameTh : hotel.nameEn}
                </span>
                {hotel.verificationStatus === "VERIFIED" && (
                  <BadgeCheck
                    aria-label="Verified Direct Stay"
                    className="w-5 h-5 text-[var(--color-text-primary)] shrink-0"
                  />
                )}
              </h1>

              <div className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  @{hotel.slug}
                </span>
                <span>·</span>
                <span>
                  {hotel.districtTh}{" "}
                  {language === "th"
                    ? `จ.${hotel.provinceNameTh}`
                    : hotel.provinceNameEn}
                </span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => selectProfileTab("reviews")}
                  className="font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer"
                >
                  ★ {hotel.ratingAvg.toFixed(1)} ({reviews.length}{" "}
                  {language === "th" ? "รีวิว" : "reviews"})
                </button>
                {minRoomPrice > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      {language === "th"
                        ? `เริ่มต้น ฿${minRoomPrice.toLocaleString()}/คืน`
                        : `From ฿${minRoomPrice.toLocaleString()}/night`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Flush Right Monochrome Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 pb-0.5">
            <button
              type="button"
              onClick={handlePrimaryBookClick}
              className="h-10 px-4 rounded-[10px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-opacity"
            >
              <BedDouble className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `เลือกห้องพัก (${rooms.length})`
                  : `View Rooms (${rooms.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrimaryContactClick}
              className="h-10 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {hotel.contactLine
                  ? language === "th"
                    ? "ทัก LINE"
                    : "LINE"
                  : language === "th"
                  ? "ติดต่อที่พัก"
                  : "Contact"}
              </span>
            </button>

            {hotel.contactPhone && (
              <button
                type="button"
                onClick={() => handleContactClick("PHONE")}
                className="h-10 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{hotel.contactPhone}</span>
              </button>
            )}
          </div>
        </div>

        {/* Flush Left/Right Property Bio & Inline Dashed Coupons */}
        <div className="space-y-3">
          {fullBio && (
            <div className="space-y-1 max-w-4xl">
              {(hotel.taglineTh || hotel.taglineEn) &&
                fullBio !== hotel.taglineTh && (
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {language === "th" ? hotel.taglineTh : hotel.taglineEn}
                  </p>
                )}
              <p
                className={`text-[14px] leading-relaxed text-[var(--color-text-primary)] ${
                  !isBioExpanded && fullBio.length > 200 ? "line-clamp-2" : ""
                }`}
              >
                {fullBio}
              </p>
              {fullBio.length > 200 && (
                <button
                  type="button"
                  onClick={() => setIsBioExpanded((v) => !v)}
                  className="text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  {isBioExpanded
                    ? language === "th"
                      ? "ย่อข้อความ"
                      : "Show less"
                    : language === "th"
                    ? "อ่านเพิ่มเติม"
                    : "Read more"}
                </button>
              )}
            </div>
          )}

          {coupons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] inline-flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {language === "th" ? "คูปองจองตรง:" : "Direct coupons:"}
                </span>
              </span>
              {coupons.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (c.isClaimedByMe && rooms[0]) {
                      setInitialCouponCode(c.code);
                      selectProfileTab("rooms");
                      openRoomModal(rooms[0], "checkout");
                    } else {
                      void handleClaimHotelCoupon(c);
                    }
                  }}
                  className="h-8 px-3 rounded-[8px] border border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)]/75 hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="font-mono font-bold">{c.code}</span>
                  <span className="text-[var(--color-text-secondary)]">
                    (
                    {c.discountType === "PERCENT"
                      ? `ลด ${c.discountValue}%`
                      : `ลด ฿${c.discountValue.toLocaleString()}`}
                    )
                  </span>
                  {c.isClaimedByMe ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  )}
                </button>
              ))}
            </div>
          )}

          {contactToast && (
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-4 py-2.5 text-[13px] font-semibold">
              {contactToast}
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
          5 FLUSH BOTTOM-UNDERLINE TABS (POSTS | ROOMS | BLOG | REVIEWS | MORE)
      ====================================================================== */}
      <div
        role="tablist"
        aria-label="Property sections"
        className="border-b border-[var(--color-border)] flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar"
      >
        {(
          [
            {
              id: "posts" as const,
              icon: <Images className="w-4 h-4" />,
              label:
                language === "th"
                  ? `โพสต์ (${storefront.pins.length})`
                  : `Posts (${storefront.pins.length})`,
            },
            {
              id: "rooms" as const,
              icon: <BedDouble className="w-4 h-4" />,
              label:
                language === "th"
                  ? `ห้องพัก (${rooms.length})`
                  : `Rooms (${rooms.length})`,
            },
            {
              id: "blog" as const,
              icon: <BookOpen className="w-4 h-4" />,
              label:
                language === "th"
                  ? `บทความ (${posts.length})`
                  : `Blog (${posts.length})`,
            },
            {
              id: "reviews" as const,
              icon: <Star className="w-4 h-4" />,
              label:
                language === "th"
                  ? `รีวิว (${reviews.length})`
                  : `Reviews (${reviews.length})`,
            },
            {
              id: "more" as const,
              icon: <Info className="w-4 h-4" />,
              label: language === "th" ? "เพิ่มเติม" : "More",
            },
          ]
        ).map((tab) => {
          const isActive = activeProfileTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => selectProfileTab(tab.id)}
              className={`py-3 -mb-px border-b-2 inline-flex items-center gap-2 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                isActive
                  ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-bold"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          5 SSR DOM TAB PANELS (ALL RENDERED IN HTML FOR 100% SEO & AI)
      ====================================================================== */}

      {/* TAB 1: TOP PIN DETAIL STAGE + FLUSH 5-COLUMN PINTEREST MASONRY */}
      <section
        id="panel-posts"
        role="tabpanel"
        aria-labelledby="tab-posts"
        aria-hidden={activeProfileTab !== "posts"}
        className={activeProfileTab === "posts" ? "space-y-5" : "hidden"}
      >
        {activePin && (
          <PinterestPinDetail
            pin={activePin}
            language={language}
            currentUser={currentUser}
            comments={activePinComments}
            savedPinIds={optimisticSavedIds}
            relatedPins={gridHotelPins}
            canStepBack={pinHistoryStack.length > 0}
            onBack={handleStepBackHotelPin}
            onClose={handleCloseHotelPin}
            onSelectPin={(next) => handleSelectPinFromMasonry(next, true)}
            onNavigatePin={handleNavigateHotelPin}
            onToggleLike={async (pinId) => {
              if (!currentUser) {
                router.push(`/login?callbackUrl=/${cleanSlug}`);
                return;
              }
              await fetch(`/api/pins/${encodeURIComponent(pinId)}/like`, {
                method: "POST",
              });
              await Promise.all([loadStorefront(true), loadPinDetail(pinId)]);
            }}
            onToggleSave={async (pinId) => {
              if (!currentUser) {
                router.push(`/login?callbackUrl=/${cleanSlug}`);
                return;
              }
              await fetch("/api/boards/toggle-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinId }),
              });
              await Promise.all([loadStorefront(true), refreshMe()]);
            }}
            onSharePin={handleSharePin}
            onExpandMedia={(urls, idx) =>
              setFullscreenMedia({
                slides: urls.map((u) => ({ type: "image", url: u })),
                index: idx,
              })
            }
            onAddComment={async (text, parentId) => {
              if (!currentUser) {
                router.push(`/login?callbackUrl=/${cleanSlug}`);
                return;
              }
              await fetch(
                `/api/pins/${encodeURIComponent(activePin.id)}/comments`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ body: text, parentId }),
                }
              );
              await loadPinDetail(activePin.id);
            }}
            onDeleteComment={async (commentId) => {
              await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
                method: "DELETE",
              });
              await loadPinDetail(activePin.id);
            }}
          />
        )}

        {storefront.pins.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-10 text-center ty-body text-[var(--color-text-secondary)]">
            ยังไม่มีรูปภาพหรือวิดีโอที่เผยแพร่สำหรับที่พักนี้
          </div>
        ) : (
          gridHotelPins.length > 0 && (
            <MasonryGrid
              items={gridHotelPins.map((p) => ({
                ...p,
                aspectClass: p.aspectRatio,
              }))}
              columnWidth={208}
              gutter={16}
              fitContainer={true}
              renderItem={(pin) => (
                <PinterestPinCard
                  pin={pin}
                  language={language}
                  isSaved={pin.isSavedByMe || optimisticSavedIds.has(pin.id)}
                  onSelectPin={handleSelectPinFromMasonry}
                  onToggleSave={async (pinId) => {
                    if (!currentUser) {
                      router.push(`/login?callbackUrl=/${cleanSlug}`);
                      return;
                    }
                    await fetch("/api/boards/toggle-pin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pinId }),
                    });
                    await Promise.all([loadStorefront(true), refreshMe()]);
                  }}
                  onSharePin={handleSharePin}
                />
              )}
            />
          )
        )}
      </section>

      {/* TAB 2: COMPACT CALENDAR + LIVE MATRIX + EQUAL-HEIGHT ROOM CARDS */}
      <section
        id="panel-rooms"
        role="tabpanel"
        aria-labelledby="tab-rooms"
        aria-hidden={activeProfileTab !== "rooms"}
        className={activeProfileTab === "rooms" ? "space-y-5" : "hidden"}
      >
        <InlineRoomCalendarFilter
          language={language}
          todayDate={today}
          checkInDate={checkIn}
          checkOutDate={checkOut}
          onChangeDates={(nextIn, nextOut) => {
            setCheckIn(nextIn);
            setCheckOut(nextOut);
            trackTelemetryEvent({
              eventType: "ROOM_CALENDAR_SELECT",
              hotelId: storefront.hotel.id,
              provinceId: storefront.hotel.provinceId,
              stayStyles: storefront.hotel.stayStyles.slice(0, 6),
              priceThb: rooms[0]?.weekdayPriceThb ?? undefined,
              guests,
            });
          }}
          guestCount={guests}
          onChangeGuestCount={setGuests}
          stayNights={stayNights}
          isRefreshing={isRefreshingDates}
          rooms={rooms}
          matchingRoomsCount={matchingAvailableRooms.length}
          onlyAvailableFilter={onlyAvailableRooms}
          onToggleOnlyAvailable={setOnlyAvailableRooms}
          onQuickSelectRoom={(rm) =>
            openRoomModal(
              rm,
              rm.availableUnits > 0 && rm.maxGuests >= guests
                ? "checkout"
                : "details"
            )
          }
        />

        {onlyAvailableRooms && matchingAvailableRooms.length === 0 && (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-8 text-center space-y-3">
            <h3 className="ty-subtitle font-bold">
              {language === "th"
                ? `ไม่มีห้องว่างสำหรับวันที่ ${formatShortDate(
                    checkIn,
                    language
                  )} – ${formatShortDate(checkOut, language)} (${guests} ท่าน)`
                : `No available rooms for ${formatShortDate(
                    checkIn,
                    language
                  )} – ${formatShortDate(checkOut, language)} (${guests} guests)`}
            </h3>
            <p className="ty-caption">
              {language === "th"
                ? "ลองจิ้มเปลี่ยนวันเข้าพักบนปฏิทินด้านบน หรือกดดูห้องพักทั้งหมดของที่พัก"
                : "Tap different dates on the calendar above or view all property room types."}
            </p>
            <button
              type="button"
              onClick={() => setOnlyAvailableRooms(false)}
              className="btn-round-solid inline-flex"
            >
              {language === "th"
                ? `ดูห้องพักทั้งหมด (${rooms.length})`
                : `Show All Rooms (${rooms.length})`}
            </button>
          </div>
        )}

        {/* Strictly Equal-Height Room Cards Across All Rows (sm:h-[216px]) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {rooms.map((room) => {
            const hasUnits = room.availableUnits > 0;
            const fitsGuests = room.maxGuests >= guests;
            const matchesInstantFilter = hasUnits && fitsGuests;
            const isHiddenByFilter =
              onlyAvailableRooms && !matchesInstantFilter;
            const roomCover =
              room.galleryUrls[0] ||
              hotel.coverImageUrl ||
              "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80";
            const estSubtotal = room.weekdayPriceThb * stayNights;
            const descText =
              (language === "th"
                ? room.shortDescTh
                : room.shortDescEn || room.shortDescTh) ||
              (language === "th"
                ? "ห้องพักจองตรง 0% GP พร้อมสิ่งอำนวยความสะดวกครบครัน"
                : "Direct 0% GP stay with full resort amenities.");

            return (
              <article
                key={room.id}
                aria-hidden={isHiddenByFilter}
                className={
                  isHiddenByFilter
                    ? "hidden"
                    : `sm:h-[216px] rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row gap-4 transition-opacity ${
                        !matchesInstantFilter ? "opacity-75" : ""
                      }`
                }
              >
                <button
                  type="button"
                  onClick={() => openRoomModal(room, "details")}
                  className="relative w-full sm:w-[208px] h-[180px] sm:h-full rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 cursor-pointer text-left"
                >
                  <img
                    src={roomCover}
                    alt={language === "th" ? room.nameTh : room.nameEn}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[6px] bg-black/75 backdrop-blur-md !text-white text-[11px] font-bold">
                    {room.code}
                  </span>

                  {!hasUnits && (
                    <span className="absolute inset-0 bg-black/45 flex items-center justify-center !text-white text-[12px] font-bold">
                      {language === "th" ? "เต็มช่วงวันที่เลือก" : "Sold Out"}
                    </span>
                  )}

                  {room.galleryUrls.length > 1 && (
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold inline-flex items-center gap-1">
                      <Images className="w-3 h-3" />
                      {room.galleryUrls.length}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0 h-full flex flex-col justify-between gap-2">
                  <div className="space-y-1.5 min-w-0">
                    {/* Fixed 24px Title + Date Status Pill */}
                    <div className="h-[24px] flex items-center justify-between gap-2">
                      <h3 className="text-[16px] leading-[22px] font-bold text-[var(--color-text-primary)] truncate">
                        {language === "th" ? room.nameTh : room.nameEn}
                      </h3>
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 h-6 text-[11px] font-semibold">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            !hasUnits
                              ? "bg-rose-500"
                              : !fitsGuests
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span>
                          {!hasUnits
                            ? language === "th"
                              ? "เต็มช่วงนี้"
                              : "Full"
                            : !fitsGuests
                            ? language === "th"
                              ? `สูงสุด ${room.maxGuests} ท่าน`
                              : `Max ${room.maxGuests}`
                            : language === "th"
                            ? `ว่าง ${room.availableUnits} ห้อง`
                            : `${room.availableUnits} left`}
                        </span>
                      </span>
                    </div>

                    {/* Fixed 36px 2-Line Description */}
                    <p className="h-[36px] text-[13px] leading-[18px] text-[var(--color-text-secondary)] line-clamp-2">
                      {descText}
                    </p>

                    {/* Fixed 24px Single-Row Specs */}
                    <div className="h-[24px] flex items-center gap-1.5 overflow-hidden">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                        <Users className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        สูงสุด {room.maxGuests} ท่าน
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                        <Maximize className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        {room.sizeSqm} ตร.ม.
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                        <BedDouble className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        {room.bedrooms} นอน
                      </span>
                      {room.petsAllowed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                          <PawPrint className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          Pet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[var(--color-border)] flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[19px] leading-tight font-extrabold text-[var(--color-text-primary)]">
                        ฿{room.weekdayPriceThb.toLocaleString()}
                        <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
                          {" "}
                          / คืน
                        </span>
                      </p>
                      <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                        รวม {stayNights} คืน ฿{estSubtotal.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openRoomModal(room, "details")}
                        className="h-9 px-3 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                      >
                        รายละเอียด
                      </button>
                      <button
                        type="button"
                        disabled={!hasUnits}
                        onClick={() => openRoomModal(room, "checkout")}
                        className="h-9 px-3.5 rounded-[8px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[13px] font-semibold cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {hasUnits ? "จองตรงทันที" : "เต็มช่วงนี้"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] px-4 py-3 ty-caption flex flex-wrap items-center justify-between gap-2 text-[var(--color-text-primary)] font-medium">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <span>โอนตรงบัญชีที่พัก 0% GP · ระบบสแกนตรวจสลิปอัตโนมัติ</span>
          </span>
          <span className="text-[var(--color-text-secondary)]">
            เช็กอิน {hotel.checkInTime} น. · เช็กเอาต์ {hotel.checkOutTime} น.
          </span>
        </div>
      </section>

      {/* TAB 3: HOTEL STORIES & SEO GUIDES */}
      <section
        id="panel-blog"
        role="tabpanel"
        aria-labelledby="tab-blog"
        aria-hidden={activeProfileTab !== "blog"}
        className={activeProfileTab === "blog" ? "space-y-5" : "hidden"}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="ty-title">
            บทความและคู่มือท่องเที่ยวจาก {hotel.nameTh}
          </h2>

          <Link
            href={`/${hotel.slug}/posts`}
            className="h-9 px-3.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>ดูหน้าบทความทั้งหมด ({posts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-10 text-center ty-body text-[var(--color-text-secondary)]">
            ที่พักยังไม่ได้เผยแพร่บทความแนะนำท่องเที่ยว — เจ้าของที่พักสามารถเขียนบทความ SEO ได้จากหน้า Hotel Studio
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {posts.map((post) => (
              <article
                key={post.id}
                className="h-full rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <Link
                    href={`/${hotel.slug}/posts/${post.slug}`}
                    className="block relative h-44 bg-[var(--color-background-muted)] overflow-hidden"
                  >
                    <img
                      src={post.coverImageUrl}
                      alt={post.titleTh}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold">
                      {post.categoryTh}
                    </span>
                  </Link>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-[var(--color-text-secondary)]">
                      <span>{formatShortDate(post.publishedAt, language)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.viewsCount}
                      </span>
                    </div>

                    <Link
                      href={`/${hotel.slug}/posts/${post.slug}`}
                      className="block group"
                    >
                      <h3 className="ty-subtitle font-bold leading-snug group-hover:underline line-clamp-2">
                        {post.titleTh}
                      </h3>
                    </Link>

                    <p className="ty-caption line-clamp-2">{post.excerptTh}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2.5 border-t border-[var(--color-border)]/70 flex items-center justify-between gap-2">
                  {post.roomCode ? (
                    <span className="px-2.5 py-1 rounded-[8px] bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-primary)]">
                      ห้อง {post.roomCode} · ฿{post.roomPriceThb?.toLocaleString()}
                    </span>
                  ) : (
                    <span className="ty-caption">{hotel.provinceNameTh}</span>
                  )}

                  <Link
                    href={`/${hotel.slug}/posts/${post.slug}`}
                    className="text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1 hover:underline"
                  >
                    <span>อ่านต่อ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* TAB 4: DEDICATED GUEST REVIEWS */}
      <section
        id="panel-reviews"
        role="tabpanel"
        aria-labelledby="tab-reviews"
        aria-hidden={activeProfileTab !== "reviews"}
        className={activeProfileTab === "reviews" ? "space-y-5" : "hidden"}
      >
        <div className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="ty-title">
              รีวิวผู้เข้าพักจริง ({reviews.length})
            </h2>
            <p className="ty-caption">
              ความคิดเห็นและภาพถ่ายจากผู้ที่จองเข้าพักตรงกับ {hotel.nameTh}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-background-muted)] px-4 py-2">
            <Star className="w-5 h-5 fill-current text-[var(--color-text-primary)]" />
            <span className="text-[22px] font-extrabold text-[var(--color-text-primary)]">
              {hotel.ratingAvg.toFixed(1)}
            </span>
            <span className="ty-caption">/ 5.0</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-10 text-center ty-body text-[var(--color-text-secondary)]">
            ยังไม่มีรีวิวสำหรับที่พักนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {reviews.map((rv) => (
              <article
                key={rv.id}
                className="h-full rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center font-bold ty-caption">
                      {rv.authorName[0]}
                    </span>
                    <div>
                      <p className="ty-body font-bold">{rv.authorName}</p>
                      <p className="ty-caption">
                        {rv.roomCode ? `ห้อง ${rv.roomCode} · ` : ""}
                        {formatShortDate(rv.createdAt, language)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 h-7 text-[12px] font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    {rv.rating}.0
                  </span>
                </div>
                <p className="ty-body">{rv.commentTh}</p>
                {rv.photoUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {rv.photoUrls.map((u, idx) => (
                      <img
                        key={idx}
                        src={u}
                        alt="Guest photo"
                        onClick={() =>
                          setFullscreenMedia({
                            slides: rv.photoUrls.map((url) => ({
                              type: "image",
                              url,
                            })),
                            index: idx,
                          })
                        }
                        className="h-24 w-32 rounded-[10px] object-cover cursor-pointer shrink-0"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* TAB 5: MORE ("เพิ่มเติม" — MAP, LOCATION, POLICIES, CONTACT & FAQS) */}
      <section
        id="panel-more"
        role="tabpanel"
        aria-labelledby="tab-more"
        aria-hidden={activeProfileTab !== "more"}
        className={
          activeProfileTab === "more"
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            : "hidden"
        }
      >
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ty-title">แผนที่ & การเดินทาง</h2>
              {hotel.googleMapsUrl && (
                <a
                  href={hotel.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              )}
            </div>

            <p className="ty-body flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 mt-1" />
              <span>
                {hotel.addressTh ||
                  `${hotel.districtTh} จ.${hotel.provinceNameTh}`}
              </span>
            </p>

            {hotel.latitude && hotel.longitude && (
              <div className="h-[260px] rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] border border-[var(--color-border)]">
                <iframe
                  title={hotel.nameTh}
                  src={`https://maps.google.com/maps?q=${hotel.latitude},${hotel.longitude}&hl=${language}&z=14&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            )}

            {hotel.nearbySpots.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="ty-caption font-semibold">สถานที่ใกล้เคียง</p>
                <div className="flex flex-wrap gap-2">
                  {hotel.nearbySpots.map((spot, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] px-3 py-1.5 ty-caption font-medium"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                      <strong>{spot.nameTh}</strong>
                      <span className="text-[var(--color-text-secondary)]">
                        ({spot.distTh})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3">
            <h3 className="ty-subtitle font-bold">ช่องทางติดต่อที่พักโดยตรง</h3>
            <div className="flex flex-wrap gap-2">
              {hotel.contactLine && (
                <button
                  type="button"
                  onClick={() => handleContactClick("LINE")}
                  className="h-9 px-3.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>LINE: {hotel.contactLine}</span>
                </button>
              )}
              {hotel.facebookPageUrl && (
                <button
                  type="button"
                  onClick={() => handleContactClick("FACEBOOK_MESSENGER")}
                  className="h-9 px-3.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Facebook Page</span>
                </button>
              )}
              {hotel.contactPhone && (
                <button
                  type="button"
                  onClick={() => handleContactClick("PHONE")}
                  className="h-9 px-3.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>โทร {hotel.contactPhone}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3">
            <h2 className="ty-title">เวลาเช็กอิน & นโยบายที่พัก</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ty-body">
              <div className="rounded-[10px] bg-[var(--color-background-muted)] p-3 space-y-0.5">
                <p className="ty-caption flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>เช็กอิน / เช็กเอาต์</span>
                </p>
                <p className="font-bold">
                  {hotel.checkInTime} / {hotel.checkOutTime} น.
                </p>
              </div>
              <div className="rounded-[10px] bg-[var(--color-background-muted)] p-3 sm:col-span-2 space-y-0.5">
                <p className="ty-caption flex items-center gap-1">
                  <PawPrint className="w-3.5 h-3.5" />
                  <span>นโยบายสัตว์เลี้ยง</span>
                </p>
                <p className="font-semibold">
                  {hotel.petsAllowed
                    ? hotel.petPolicyTh || "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                    : hotel.petPolicyTh || "งดนำสัตว์เลี้ยงเข้าพัก"}
                </p>
              </div>
            </div>

            {hotel.highlights.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="ty-caption font-semibold">จุดเด่นของที่พัก</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {hotel.highlights.map((hl, idx) => (
                    <div
                      key={idx}
                      className="rounded-[10px] bg-[var(--color-background-muted)]/60 border border-[var(--color-border)] p-3 space-y-0.5"
                    >
                      <p className="ty-body font-bold">{hl.titleTh}</p>
                      <p className="ty-caption">{hl.descTh}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hotel.faqs.length > 0 && (
            <div className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-2">
              <h3 className="ty-subtitle font-bold">คำถามที่พบบ่อย</h3>
              {hotel.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border-b border-[var(--color-border)] last:border-0 py-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaqIdx(openFaqIdx === idx ? null : idx)
                    }
                    className="w-full flex items-center justify-between text-left ty-body font-bold cursor-pointer py-1"
                  >
                    <span>{faq.qTh}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openFaqIdx === idx ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaqIdx === idx && (
                    <p className="ty-body text-[var(--color-text-secondary)] pt-1">
                      {faq.aTh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Booking Drawer */}
      <RoomBookingDrawer
        isOpen={isBookingDrawerOpen}
        onClose={() => setIsBookingDrawerOpen(false)}
        hotel={hotel}
        rooms={rooms}
        selectedRoom={drawerRoom || rooms[0] || null}
        onSelectRoom={(r) => setDrawerRoom(r)}
        dateOverrides={dateOverrides}
        addons={addons}
        coupons={coupons}
        language={language}
        checkInDate={checkIn}
        checkOutDate={checkOut}
        onChangeDates={(nextIn, nextOut) => {
          setCheckIn(nextIn);
          setCheckOut(nextOut);
        }}
        guests={guests}
        onChangeGuests={setGuests}
        initialStep={drawerInitialStep}
        initialCouponCode={initialCouponCode}
        defaultGuestName={currentUser?.name || ""}
        defaultGuestPhone={currentUser?.phone || ""}
        defaultGuestEmail={currentUser?.email || ""}
        onOpenCouponWallet={openCouponWallet}
        onBookingCompleted={() => loadStorefront(true)}
      />

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
