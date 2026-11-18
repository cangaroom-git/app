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
  calculateNightlyRateForDate,
  calculateStayPricing,
  computeNightsBetween,
  formatDateStr,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import { trackTelemetryEvent } from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  clearLastClickedPinOrigin,
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import {
  RoomBookingDrawer,
  selectBestEligibleCoupon,
  type RoomBookingDrawerStep,
} from "@/components/drawers/RoomBookingDrawer";
import type {
  CouponDealDto,
  HotelStorefrontDto,
  PinCommentDto,
  PinFeedItemDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
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

interface AirbnbInlineStayCalendarProps {
  language: LanguageCode;
  todayDate: Date;
  checkInDate: string;
  checkOutDate: string;
  onChangeDates: (nextIn: string, nextOut: string) => void;
  stayNights: number;
  hotelName: string;
  rooms: RoomAvailabilityDto[];
  selectedRoom: RoomAvailabilityDto | null;
  onSelectRoom: (roomId: string) => void;
  dateOverrides: RoomDateOverrideDto[];
}

function AirbnbInlineStayCalendar({
  language,
  todayDate,
  checkInDate,
  checkOutDate,
  onChangeDates,
  stayNights,
  hotelName,
  rooms,
  selectedRoom,
  onSelectRoom,
  dateOverrides,
}: AirbnbInlineStayCalendarProps) {
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

  const overrideByDate = useMemo(() => {
    const map = new Map<string, RoomDateOverrideDto>();
    if (!selectedRoom) return map;
    for (const ov of dateOverrides) {
      if (ov.roomId === selectedRoom.id) {
        map.set(ov.dateStr, ov);
      }
    }
    return map;
  }, [dateOverrides, selectedRoom]);

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
              className="h-7 flex items-center justify-center text-[11.5px] font-semibold text-[var(--color-text-secondary)]"
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
            const ov = overrideByDate.get(dateStr);
            const isBlocked = Boolean(
              selectedRoom && ov && ov.blockedUnits >= selectedRoom.totalUnits
            );
            const isStart = dateStr === checkInDate;
            const isEnd = dateStr === effectiveRangeEnd;
            const isBetween =
              dateStr > checkInDate && dateStr < effectiveRangeEnd;
            const hasRange = effectiveRangeEnd > checkInDate;
            const nightlyRate = selectedRoom
              ? calculateNightlyRateForDate(selectedRoom, dateStr, dateOverrides)
              : null;

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
                  aria-label={`${dateStr}${isBlocked ? (isTh ? " เต็ม" : " unavailable") : ""}`}
                  className={`relative z-10 h-10 w-full max-w-[44px] rounded-[10px] flex flex-col items-center justify-center transition-colors ${
                    isPast
                      ? "text-[var(--color-text-disabled)] cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111] font-bold cursor-pointer"
                      : isBlocked
                      ? "text-[var(--color-text-disabled)] line-through hover:bg-[var(--color-background-muted)]/50 cursor-pointer"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-medium cursor-pointer"
                  }`}
                >
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
              ? "เลือกวันเช็กเอาต์"
              : "Select check-out date"
            : isTh
            ? `${stayNights} คืนที่ ${hotelName}`
            : `${stayNights} ${stayNights === 1 ? "night" : "nights"} at ${hotelName}`}
        </h2>
        <p className="ty-caption text-[var(--color-text-secondary)]">
          {formatShortDate(checkInDate, language)} –{" "}
          {formatShortDate(checkOutDate, language)} ·{" "}
          {selectingPhase === "checkout"
            ? isTh
              ? "จิ้มวันที่ต้องการเช็กเอาต์บนปฏิทิน"
              : "Tap your check-out date"
            : isTh
            ? "ราคาใต้ตัวเลขเป็นเรท/คืนของห้องที่เลือก"
            : "Rates shown below each date reflect the selected room"}
        </p>
      </div>

      {rooms.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ty-caption text-[var(--color-text-secondary)] mr-1">
            {isTh ? "ดูเรทราคาห้อง:" : "Rate preview:"}
          </span>
          {rooms.map((rm) => {
            const isSelected = selectedRoom?.id === rm.id;
            return (
              <button
                key={rm.id}
                type="button"
                onClick={() => onSelectRoom(rm.id)}
                className={`h-7 px-2.5 rounded-[8px] text-[12px] font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                {rm.code}
              </button>
            );
          })}
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

      <div className="pt-1 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {isTh
            ? "ตัวเลขใต้แต่ละวัน = ราคาประมาณ/คืน (ศุกร์–เสาร์เป็นเรทวันหยุด)"
            : "Under-date labels show nightly rate (Fri–Sat weekend rate)"}
        </span>
        <button
          type="button"
          onClick={handleResetDates}
          className="h-8 px-2.5 rounded-[9px] text-[12.5px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline cursor-pointer shrink-0 transition-colors"
        >
          {isTh ? "ล้างวันที่" : "Clear dates"}
        </button>
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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => initialStorefront.rooms[0]?.id ?? null
  );
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);

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

    const paramPin = sp.get("stay") || sp.get("pin");
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

  const prevHotelPinPreview = useMemo<PinFeedItemDto | null>(() => {
    if (!activePin) return null;
    if (pinHistoryStack.length > 0) {
      return pinHistoryStack[pinHistoryStack.length - 1] ?? null;
    }
    if (storefront.pins.length <= 1) return null;
    const idx = storefront.pins.findIndex((p) => p.id === activePin.id);
    if (idx === -1) return storefront.pins[0] ?? null;
    return (
      storefront.pins[
        (idx - 1 + storefront.pins.length) % storefront.pins.length
      ] ?? null
    );
  }, [activePin, pinHistoryStack, storefront.pins]);

  const nextHotelPinPreview = useMemo<PinFeedItemDto | null>(() => {
    if (!activePin || storefront.pins.length <= 1) return null;
    const idx = storefront.pins.findIndex((p) => p.id === activePin.id);
    if (idx === -1) return storefront.pins[0] ?? null;
    return storefront.pins[(idx + 1) % storefront.pins.length] ?? null;
  }, [activePin, storefront.pins]);

  const handleNavigateHotelPin = useCallback(
    (direction: "prev" | "next") => {
      if (!activePin) return;
      clearLastClickedPinOrigin();
      if (direction === "prev" && pinHistoryStack.length > 0) {
        handleStepBackHotelPin();
        return;
      }
      if (storefront.pins.length <= 1) return;
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
    [
      activePin,
      pinHistoryStack.length,
      storefront.pins,
      handleStepBackHotelPin,
      handleSelectPinFromMasonry,
    ]
  );

  const handleSharePin = (pin: PinFeedItemDto) => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/${storefront.hotel.slug}?stay=${encodeURIComponent(
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

  const activeBookingRoom = useMemo(
    () =>
      rooms.find((r) => r.id === selectedRoomId) ||
      matchingAvailableRooms[0] ||
      rooms[0] ||
      null,
    [rooms, selectedRoomId, matchingAvailableRooms]
  );

  const allUniqueAmenities = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of rooms) {
      for (const item of r.amenities) {
        const clean = item.trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }
    return list.slice(0, 10);
  }, [rooms]);

  const stickyBasePricing = useMemo(
    () =>
      activeBookingRoom
        ? calculateStayPricing({
            room: activeBookingRoom,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guests,
            overrides: dateOverrides,
          })
        : null,
    [activeBookingRoom, checkIn, checkOut, guests, dateOverrides]
  );

  const stickyBestCoupon = useMemo(
    () =>
      stickyBasePricing
        ? selectBestEligibleCoupon(coupons, stickyBasePricing.roomSubtotalThb)
        : null,
    [coupons, stickyBasePricing]
  );

  const stickyPricing = useMemo(
    () =>
      activeBookingRoom
        ? calculateStayPricing({
            room: activeBookingRoom,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guests,
            overrides: dateOverrides,
            coupon: stickyBestCoupon?.coupon ?? null,
          })
        : null,
    [
      activeBookingRoom,
      checkIn,
      checkOut,
      guests,
      dateOverrides,
      stickyBestCoupon,
    ]
  );

  const scrollToCalendarSection = () => {
    calendarSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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
          className="relative -mx-4 sm:-mx-6 -mt-5 lg:mx-0 lg:mt-0 lg:w-full h-[220px] sm:h-[300px] lg:h-[340px] rounded-none lg:rounded-[20px] overflow-hidden bg-[var(--color-background-muted)] border-b lg:border border-[var(--color-border)] cursor-pointer"
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
              className="-mt-12 sm:-mt-16 ml-0 sm:ml-1 lg:ml-6 h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover bg-[var(--color-background-card)] ring-4 ring-[var(--color-background-body)] border border-[var(--color-border)] shrink-0 relative z-10"
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
            prevPinPreview={prevHotelPinPreview}
            nextPinPreview={nextHotelPinPreview}
            mobileOverlayMode={true}
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

      {/* TAB 2: AIRBNB-STYLE MINIMAL 2-COLUMN SECTION LAYOUT + STICKY RESERVATION WIDGET */}
      <section
        id="panel-rooms"
        role="tabpanel"
        aria-labelledby="tab-rooms"
        aria-hidden={activeProfileTab !== "rooms"}
        className={
          activeProfileTab === "rooms"
            ? "grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start"
            : "hidden"
        }
      >
        {/* LEFT COLUMN (7 COLS): COMPACT MOBILE BAR + ROOM SELECTION + OFFERINGS + INLINE 2-MONTH CALENDAR */}
        <div className="lg:col-span-7 divide-y divide-[var(--color-border)] min-w-0">
          {/* Mobile / Tablet Compact Date & Guest Trip Strip (< lg) */}
          <div className="lg:hidden pb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={scrollToCalendarSection}
              className="flex-1 min-w-[200px] h-11 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] border border-[var(--color-border)] flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                  {formatShortDate(checkIn, language)} –{" "}
                  {formatShortDate(checkOut, language)} ({stayNights}{" "}
                  {language === "th" ? "คืน" : "N"})
                </span>
              </span>
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] underline shrink-0">
                {language === "th" ? "เปลี่ยนวัน" : "Edit"}
              </span>
            </button>

            <div className="h-11 px-3 rounded-[12px] bg-[var(--color-background-muted)] border border-[var(--color-border)] inline-flex items-center gap-2.5 shrink-0">
              <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <button
                type="button"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                aria-label="Decrease guests"
                className="h-6 w-6 rounded-[7px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[13px] font-bold min-w-[36px] text-center">
                {guests} {language === "th" ? "ท่าน" : ""}
              </span>
              <button
                type="button"
                onClick={() => setGuests(Math.min(12, guests + 1))}
                aria-label="Increase guests"
                className="h-6 w-6 rounded-[7px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SECTION 1: ROOM SELECTION CARDS */}
          <div className="pt-5 lg:pt-0 pb-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="ty-title text-[var(--color-text-primary)]">
                  {language === "th"
                    ? "เลือกห้องพักที่ต้องการ"
                    : "Choose your stay"}
                </h2>
                <p className="ty-caption text-[var(--color-text-secondary)]">
                  {isRefreshingDates
                    ? language === "th"
                      ? "กำลังอัปเดตสถานะห้องว่าง..."
                      : "Updating live room availability..."
                    : language === "th"
                    ? `ว่างพร้อมเข้าพัก ${matchingAvailableRooms.length} จาก ${rooms.length} แบบห้อง (${formatShortDate(
                        checkIn,
                        language
                      )} – ${formatShortDate(checkOut, language)})`
                    : `${matchingAvailableRooms.length} of ${rooms.length} room types available (${formatShortDate(
                        checkIn,
                        language
                      )} – ${formatShortDate(checkOut, language)})`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOnlyAvailableRooms((v) => !v)}
                className={`h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold cursor-pointer transition-colors ${
                  onlyAvailableRooms
                    ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                {onlyAvailableRooms
                  ? language === "th"
                    ? `เฉพาะห้องว่าง (${matchingAvailableRooms.length})`
                    : `Available (${matchingAvailableRooms.length})`
                  : language === "th"
                  ? "กรองเฉพาะห้องว่าง"
                  : "Available only"}
              </button>
            </div>

            {onlyAvailableRooms && matchingAvailableRooms.length === 0 && (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-6 text-center space-y-3">
                <h3 className="ty-subtitle font-bold">
                  {language === "th"
                    ? `ไม่มีห้องว่างสำหรับวันที่ ${formatShortDate(
                        checkIn,
                        language
                      )} – ${formatShortDate(checkOut, language)} (${guests} ท่าน)`
                    : `No rooms available for ${formatShortDate(
                        checkIn,
                        language
                      )} – ${formatShortDate(checkOut, language)} (${guests} guests)`}
                </h3>
                <p className="ty-caption text-[var(--color-text-secondary)]">
                  {language === "th"
                    ? "ลองเลื่อนลงไปดูวันว่างรายเดือนบนปฏิทินด้านล่าง หรือกดดูห้องพักทั้งหมด"
                    : "Check open dates on the calendar below or view all room types."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={scrollToCalendarSection}
                    className="h-9 px-4 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-primary)] cursor-pointer"
                  >
                    {language === "th" ? "ดูวันว่างบนปฏิทิน" : "Jump to calendar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyAvailableRooms(false)}
                    className="h-9 px-4 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[13px] font-semibold cursor-pointer"
                  >
                    {language === "th"
                      ? `ดูห้องพักทั้งหมด (${rooms.length})`
                      : `Show All (${rooms.length})`}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {rooms.map((room) => {
                const hasUnits = room.availableUnits > 0;
                const fitsGuests = room.maxGuests >= guests;
                const matchesInstantFilter = hasUnits && fitsGuests;
                const isHiddenByFilter =
                  onlyAvailableRooms && !matchesInstantFilter;
                const isSelectedForBooking = activeBookingRoom?.id === room.id;
                const roomCover =
                  room.galleryUrls[0] ||
                  hotel.coverImageUrl ||
                  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80";
                const roomPricing = calculateStayPricing({
                  room,
                  checkInDate: checkIn,
                  checkOutDate: checkOut,
                  guests,
                  overrides: dateOverrides,
                });
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
                    onClick={() => setSelectedRoomId(room.id)}
                    className={
                      isHiddenByFilter
                        ? "hidden"
                        : `rounded-[18px] bg-[var(--color-background-card)] border p-4 flex flex-col sm:flex-row gap-4 transition-colors cursor-pointer ${
                            isSelectedForBooking
                              ? "border-[#111111] dark:border-[#f5f5f5]"
                              : "border-[var(--color-border)] hover:border-[var(--color-border-emphasized)]"
                          } ${!matchesInstantFilter ? "opacity-80" : ""}`
                    }
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoomId(room.id);
                        openRoomModal(room, "details");
                      }}
                      className="relative w-full sm:w-[212px] h-[184px] sm:h-[168px] rounded-[13px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 cursor-pointer text-left"
                    >
                      <img
                        src={roomCover}
                        alt={language === "th" ? room.nameTh : room.nameEn}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[7px] bg-black/75 backdrop-blur-md !text-white text-[11px] font-bold">
                        {room.code}
                      </span>

                      {!hasUnits && (
                        <span className="absolute inset-0 bg-black/45 flex items-center justify-center !text-white text-[12px] font-bold">
                          {language === "th" ? "เต็มช่วงวันที่เลือก" : "Sold Out"}
                        </span>
                      )}

                      {room.galleryUrls.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-[8px] bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold inline-flex items-center gap-1">
                          <Images className="w-3 h-3" />
                          {room.galleryUrls.length}
                        </span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[16.5px] leading-snug font-bold text-[var(--color-text-primary)] truncate">
                            {language === "th" ? room.nameTh : room.nameEn}
                          </h3>
                          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 h-6 text-[11px] font-semibold">
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

                        <p className="text-[12.5px] font-medium text-[var(--color-text-secondary)]">
                          {language === "th"
                            ? `สูงสุด ${room.maxGuests} ท่าน · ${room.bedrooms} ห้องนอน · ${room.beds} เตียง · ${room.bathrooms} น้ำ · ${room.sizeSqm} ตร.ม.`
                            : `Up to ${room.maxGuests} guests · ${room.bedrooms} bed · ${room.bathrooms} bath · ${room.sizeSqm} sqm`}
                        </p>

                        <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
                          {descText}
                        </p>

                        {room.amenities.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {room.amenities.slice(0, 3).map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-[var(--color-border)] flex flex-wrap items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[18px] leading-tight font-extrabold text-[var(--color-text-primary)]">
                            ฿{room.weekdayPriceThb.toLocaleString()}
                            <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
                              {" "}
                              / {language === "th" ? "คืน" : "night"}
                            </span>
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                            {language === "th"
                              ? `รวม ${stayNights} คืน ฿${roomPricing.roomSubtotalThb.toLocaleString()}`
                              : `${stayNights} nights total ฿${roomPricing.roomSubtotalThb.toLocaleString()}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoomId(room.id);
                              openRoomModal(room, "details");
                            }}
                            className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                          >
                            {language === "th" ? "รายละเอียด" : "Details"}
                          </button>
                          <button
                            type="button"
                            disabled={!hasUnits}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoomId(room.id);
                              openRoomModal(room, "checkout");
                            }}
                            className="h-9 px-3.5 rounded-[10px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[13px] font-semibold cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {hasUnits
                              ? language === "th"
                                ? "จองเลย"
                                : "Book"
                              : language === "th"
                              ? "เต็มช่วงนี้"
                              : "Sold out"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: WHAT THIS STAY OFFERS (AIRBNB CLEAN 2-COLUMN ICON LIST) */}
          <div className="py-7 space-y-4">
            <h2 className="ty-title text-[var(--color-text-primary)]">
              {language === "th"
                ? "สิ่งอำนวยความสะดวกและนโยบายเข้าพัก"
                : "What this place offers"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div className="flex items-center gap-3 ty-body text-[var(--color-text-primary)]">
                <Clock className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />
                <span>
                  {language === "th"
                    ? `เช็กอิน ${hotel.checkInTime} น. · เช็กเอาต์ ${hotel.checkOutTime} น.`
                    : `Check-in ${hotel.checkInTime} · Check-out ${hotel.checkOutTime}`}
                </span>
              </div>

              <div className="flex items-center gap-3 ty-body text-[var(--color-text-primary)]">
                <ShieldCheck className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />
                <span>
                  {language === "th"
                    ? "โอนตรงบัญชีที่พัก 0% GP · ตรวจสลิปอัตโนมัติ"
                    : "Direct 0% GP PromptPay · Instant slip verification"}
                </span>
              </div>

              <div className="flex items-center gap-3 ty-body text-[var(--color-text-primary)]">
                <PawPrint className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />
                <span>
                  {hotel.petsAllowed
                    ? hotel.petPolicyTh ||
                      (language === "th"
                        ? "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                        : "Pets allowed")
                    : hotel.petPolicyTh ||
                      (language === "th"
                        ? "งดนำสัตว์เลี้ยงเข้าพัก"
                        : "No pets allowed")}
                </span>
              </div>

              {allUniqueAmenities.map((item) => {
                const meta = getFacilityIconMeta(item);
                const Icon = meta.Icon;
                return (
                  <div
                    key={item}
                    className="flex items-center gap-3 ty-body text-[var(--color-text-primary)] min-w-0"
                  >
                    <Icon className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: AIRBNB-STYLE INLINE 2-MONTH CALENDAR WITH LIVE RATE HINTS */}
          <div
            ref={calendarSectionRef}
            id="rooms-calendar-section"
            className="pt-7 scroll-mt-24"
          >
            <AirbnbInlineStayCalendar
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
                  priceThb:
                    activeBookingRoom?.weekdayPriceThb ??
                    rooms[0]?.weekdayPriceThb ??
                    undefined,
                  guests,
                });
              }}
              stayNights={stayNights}
              hotelName={language === "th" ? hotel.nameTh : hotel.nameEn}
              rooms={rooms}
              selectedRoom={activeBookingRoom}
              onSelectRoom={(nextRoomId) => setSelectedRoomId(nextRoomId)}
              dateOverrides={dateOverrides}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): STICKY AIRBNB RESERVATION WIDGET */}
        <aside className="lg:col-span-5 lg:sticky lg:top-[88px]">
          {activeBookingRoom && stickyPricing && (
            <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-5 sm:p-6 space-y-4">
              {/* Price Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-extrabold tracking-tight text-[var(--color-text-primary)]">
                    ฿{activeBookingRoom.weekdayPriceThb.toLocaleString()}
                  </span>
                  <span className="ty-caption text-[var(--color-text-secondary)]">
                    / {language === "th" ? "คืน" : "night"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-text-primary)]">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {hotel.ratingAvg.toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-primary)]">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        activeBookingRoom.availableUnits > 0
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span>
                      {activeBookingRoom.availableUnits > 0
                        ? language === "th"
                          ? `ว่าง ${activeBookingRoom.availableUnits}`
                          : `${activeBookingRoom.availableUnits} left`
                        : language === "th"
                        ? "เต็ม"
                        : "Full"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Airbnb Unified Bordered Input Box (Dates + Room + Guests) */}
              <div className="rounded-[14px] border border-[var(--color-border-emphasized)] overflow-hidden divide-y divide-[var(--color-border-emphasized)] bg-[var(--color-background-card)]">
                <div className="grid grid-cols-2 divide-x divide-[var(--color-border-emphasized)]">
                  <button
                    type="button"
                    onClick={scrollToCalendarSection}
                    className="px-3.5 py-2.5 text-left hover:bg-[var(--color-background-muted)]/60 transition-colors cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {language === "th" ? "เช็กอิน" : "CHECK-IN"}
                    </span>
                    <span className="block text-[13.5px] font-semibold text-[var(--color-text-primary)] mt-0.5">
                      {formatShortDate(checkIn, language)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={scrollToCalendarSection}
                    className="px-3.5 py-2.5 text-left hover:bg-[var(--color-background-muted)]/60 transition-colors cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {language === "th" ? "เช็กเอาต์" : "CHECKOUT"}
                    </span>
                    <span className="block text-[13.5px] font-semibold text-[var(--color-text-primary)] mt-0.5">
                      {formatShortDate(checkOut, language)}
                    </span>
                  </button>
                </div>

                <div className="px-3.5 py-2.5">
                  <label
                    htmlFor="sticky-room-selector"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    {language === "th" ? "แบบห้องพัก" : "ROOM TYPE"}
                  </label>
                  <select
                    id="sticky-room-selector"
                    value={activeBookingRoom.id}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-transparent text-[13.5px] font-semibold text-[var(--color-text-primary)] mt-0.5 focus:outline-none cursor-pointer"
                  >
                    {rooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.code} · {language === "th" ? rm.nameTh : rm.nameEn}{" "}
                        (฿{rm.weekdayPriceThb.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {language === "th" ? "ผู้เข้าพัก" : "GUESTS"}
                    </span>
                    <span className="block text-[13.5px] font-semibold text-[var(--color-text-primary)] mt-0.5">
                      {guests} {language === "th" ? "ท่าน" : "guests"}{" "}
                      <span className="text-[11.5px] font-normal text-[var(--color-text-secondary)]">
                        ({language === "th" ? "สูงสุด" : "max"}{" "}
                        {activeBookingRoom.maxGuests})
                      </span>
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      aria-label="Decrease guests"
                      className="h-7 w-7 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-[13px] font-bold tabular-nums">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(12, guests + 1))}
                      aria-label="Increase guests"
                      className="h-7 w-7 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Reserve CTA */}
              {activeBookingRoom.availableUnits > 0 &&
              activeBookingRoom.maxGuests >= guests ? (
                <button
                  type="button"
                  onClick={() => openRoomModal(activeBookingRoom, "checkout")}
                  className="w-full h-12 rounded-[14px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[15px] font-bold cursor-pointer transition-opacity"
                >
                  {language === "th"
                    ? `จองตรงห้อง ${activeBookingRoom.code} ทันที`
                    : `Reserve ${activeBookingRoom.code} directly`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={scrollToCalendarSection}
                  className="w-full h-12 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-bold cursor-pointer transition-colors"
                >
                  {activeBookingRoom.availableUnits === 0
                    ? language === "th"
                      ? "ห้องเต็มช่วงนี้ · กดเลือกวันใหม่"
                      : "Sold out · Choose new dates"
                    : language === "th"
                    ? `เกิน ${activeBookingRoom.maxGuests} ท่าน · เปลี่ยนห้องหรือจำนวนคน`
                    : `Exceeds ${activeBookingRoom.maxGuests} max guests`}
                </button>
              )}

              <p className="text-center text-[12px] text-[var(--color-text-secondary)]">
                {language === "th"
                  ? "ยังไม่เรียกเก็บเงินตอนนี้ · ล็อคห้อง 15 นาทีเพื่อสแกนจ่ายตรงที่พัก"
                  : "You won't be charged yet · 15-min direct PromptPay hold"}
              </p>

              {/* Price Breakdown */}
              <div className="space-y-2 pt-2 border-t border-[var(--color-border)] ty-body">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>
                    ฿
                    {Math.round(
                      (stickyBasePricing?.roomSubtotalThb ??
                        activeBookingRoom.weekdayPriceThb * stayNights) /
                        stayNights
                    ).toLocaleString()}{" "}
                    × {stayNights} {language === "th" ? "คืน" : "nights"}
                  </span>
                  <span className="text-[var(--color-text-primary)] font-medium">
                    ฿
                    {(
                      (stickyBasePricing?.roomSubtotalThb ?? 0) -
                      (stickyBasePricing?.extraGuestTotalThb ?? 0)
                    ).toLocaleString()}
                  </span>
                </div>

                {stickyBasePricing && stickyBasePricing.extraGuestTotalThb > 0 && (
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>
                      {language === "th" ? "ค่าผู้เข้าพักเสริม" : "Extra guest fee"}
                    </span>
                    <span className="text-[var(--color-text-primary)] font-medium">
                      +฿{stickyBasePricing.extraGuestTotalThb.toLocaleString()}
                    </span>
                  </div>
                )}

                {stickyPricing.discountThb > 0 && stickyBestCoupon && (
                  <div className="flex justify-between text-[var(--color-text-primary)] font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        {language === "th"
                          ? `คูปอง ${stickyBestCoupon.coupon.code}`
                          : `Coupon ${stickyBestCoupon.coupon.code}`}
                      </span>
                    </span>
                    <span>−฿{stickyPricing.discountThb.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>
                    {language === "th"
                      ? "ค่าธรรมเนียมแพลตฟอร์ม (0% GP)"
                      : "Platform service fee (0% GP)"}
                  </span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    ฿0
                  </span>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-baseline justify-between">
                  <span className="ty-body font-bold text-[var(--color-text-primary)]">
                    {language === "th" ? "ยอดรวมประมาณการ" : "Estimated total"}
                  </span>
                  <span className="ty-title font-extrabold text-[var(--color-text-primary)]">
                    ฿{stickyPricing.netTotalThb.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
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
        onExpandPhotos={(urls, idx) =>
          setFullscreenMedia({
            slides: urls.map((u) => ({ type: "image", url: u })),
            index: idx,
          })
        }
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
