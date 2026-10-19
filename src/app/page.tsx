"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  QrCode,
  ShieldCheck,
  Phone,
  Tag,
  Upload,
  CheckCircle2,
  Timer,
  Sparkles,
  Award,
  MapPin,
  Clock,
  Utensils,
  Compass,
  Star,
  Calendar,
  Layers,
  Home,
  Instagram,
  Mail,
  ChevronDown,
  ExternalLink,
  Wifi,
  Coffee,
  Bath,
  Wind,
  Tv,
  Car,
  Waves,
  Mountain,
  BedDouble,
  Users,
  Maximize2,
  ThumbsUp,
  Flame,
  Camera,
} from "lucide-react";
import { RoomLodge, BookingRecord, RoomCategoryType } from "@/data/rooms";
import {
  useSapanStore,
  formatDateStr,
  addDaysToDate,
  scanSlipQrFromFile,
  calculateStayPricingBreakdown,
  getRoomInventoryForRange,
  getLatestBookingsSnapshot,
} from "@/lib/store";
import {
  StandardButton,
  StandardInput,
  StatusPill,
} from "@/components/ui/standards";
import {
  AgodaBookingBar,
  DailyAvailabilityInfo,
} from "@/components/AgodaBookingBar";
import {
  useResortWeather,
  ResortWeatherWidget,
} from "@/components/ResortWeatherWidget";
import { RoomGalleryModal } from "@/components/RoomGalleryModal";

type Lang = "th" | "en";
type FilterMode = "all" | "available" | "VILLA" | "SUITE" | "DELUXE";

const SHORT_MONTHS_TH = [
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
const SHORT_MONTHS_EN = [
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
const SHORT_DAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const SHORT_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatShortDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return dateStr;
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  return lang === "th"
    ? `${d} ${SHORT_MONTHS_TH[m]} ${y + 543}`
    : `${d} ${SHORT_MONTHS_EN[m]} ${y}`;
}

function formatNavbarDateCard(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return dateStr;
  const dow = date.getDay();
  const d = date.getDate();
  const m = date.getMonth();
  return lang === "th"
    ? `${SHORT_DAYS_TH[dow]}, ${d} ${SHORT_MONTHS_TH[m]}`
    : `${SHORT_DAYS_EN[dow]}, ${SHORT_MONTHS_EN[m]} ${d}`;
}

function getFacilityIconMeta(text: string, idx: number) {
  const lower = text.toLowerCase();
  const tones = [
    "bg-[#F9EAEA] text-[#4A4643]",
    "bg-[#F7F2DC] text-[#4A4643]",
    "bg-[#E8F4E5] text-[#4A4643]",
    "bg-[#E6F1F8] text-[#4A4643]",
    "bg-[#EFE8F8] text-[#4A4643]",
    "bg-[#F4EFE6] text-[#4A4643]",
  ];
  const toneClass = tones[idx % tones.length];

  if (
    lower.includes("สระ") ||
    lower.includes("pool") ||
    lower.includes("jacuzzi") ||
    lower.includes("จากุซซี่")
  ) {
    return { Icon: Waves, toneClass };
  }
  if (
    lower.includes("อ่าง") ||
    lower.includes("bath") ||
    lower.includes("น้ำอุ่น") ||
    lower.includes("ห้องน้ำ")
  ) {
    return { Icon: Bath, toneClass };
  }
  if (
    lower.includes("วิว") ||
    lower.includes("ภูเขา") ||
    lower.includes("หมอก") ||
    lower.includes("ระเบียง") ||
    lower.includes("ดาดฟ้า") ||
    lower.includes("view") ||
    lower.includes("terrace")
  ) {
    return { Icon: Mountain, toneClass };
  }
  if (
    lower.includes("เตียง") ||
    lower.includes("ที่นอน") ||
    lower.includes("หมอน") ||
    lower.includes("bed") ||
    lower.includes("king")
  ) {
    return { Icon: BedDouble, toneClass };
  }
  if (
    lower.includes("กาแฟ") ||
    lower.includes("ดริป") ||
    lower.includes("ชา") ||
    lower.includes("กาน้ำร้อน") ||
    lower.includes("มินิบาร์") ||
    lower.includes("coffee") ||
    lower.includes("tea")
  ) {
    return { Icon: Coffee, toneClass };
  }
  if (
    lower.includes("อาหาร") ||
    lower.includes("หมูกระทะ") ||
    lower.includes("ดินเนอร์") ||
    lower.includes("โต๊ะ") ||
    lower.includes("breakfast") ||
    lower.includes("dining")
  ) {
    return { Icon: Utensils, toneClass };
  }
  if (
    lower.includes("wi-fi") ||
    lower.includes("wifi") ||
    lower.includes("อินเทอร์เน็ต") ||
    lower.includes("เน็ต")
  ) {
    return { Icon: Wifi, toneClass };
  }
  if (
    lower.includes("แอร์") ||
    lower.includes("ปรับอากาศ") ||
    lower.includes("ไดร์") ||
    lower.includes("พัดลม") ||
    lower.includes("air")
  ) {
    return { Icon: Wind, toneClass };
  }
  if (
    lower.includes("ทีวี") ||
    lower.includes("ลำโพง") ||
    lower.includes("marshall") ||
    lower.includes("netflix") ||
    lower.includes("tv")
  ) {
    return { Icon: Tv, toneClass };
  }
  if (lower.includes("จอดรถ") || lower.includes("รถ") || lower.includes("parking")) {
    return { Icon: Car, toneClass };
  }
  if (lower.includes("ปิ้งย่าง") || lower.includes("เตา") || lower.includes("bbq")) {
    return { Icon: Flame, toneClass };
  }
  return { Icon: Sparkles, toneClass };
}

export default function WhiteLabelLuxuryResortHomePage() {
  const { store, saveStore } = useSapanStore();
  const {
    propertyConfig,
    rooms,
    seasonalRates,
    specialDateRates,
    addons,
    coupons,
    experiences,
    bookings,
  } = store;

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [lang, setLang] = useState<Lang>("th");
  const [checkIn, setCheckIn] = useState<string>(() => formatDateStr(today));
  const [checkOut, setCheckOut] = useState<string>(() =>
    formatDateStr(addDaysToDate(today, 1))
  );
  const [guests, setGuests] = useState<number>(2);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);
  const [openNearbyCategory, setOpenNearbyCategory] = useState<
    "shopping" | "attractions" | "transportation" | null
  >("attractions");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [newsletterEmail, setNewsletterEmail] = useState<string>("");
  const [newsletterSubscribed, setNewsletterSubscribed] =
    useState<boolean>(false);

  // Live Weather API Hook (Open-Meteo API based on Property's Latitude/Longitude)
  const { weather, loading: weatherLoading } = useResortWeather(
    propertyConfig.latitude,
    propertyConfig.longitude
  );

  // Photo Gallery Modal State (Agoda Style)
  const [galleryModalOpen, setGalleryModalOpen] = useState<boolean>(false);
  const [galleryRoom, setGalleryRoom] = useState<RoomLodge | null>(null);

  const openGalleryModal = (room: RoomLodge) => {
    setGalleryRoom(room);
    setGalleryModalOpen(true);
  };

  // Per-card image slider state
  const [cardSlideIndex, setCardSlideIndex] = useState<Record<string, number>>(
    {}
  );

  // Slide-Over EditSidebar / Booking Drawer State + Animation Support
  const [activeRoom, setActiveRoom] = useState<RoomLodge | null>(null);
  const [displayedRoom, setDisplayedRoom] = useState<RoomLodge | null>(null);
  const [drawerSlideIndex, setDrawerSlideIndex] = useState<number>(0);
  const [drawerTab, setDrawerTab] = useState<"details" | "booking">("details");
  const [unitsToBook, setUnitsToBook] = useState<number>(1);
  const [priceGuaranteeSeconds, setPriceGuaranteeSeconds] =
    useState<number>(900);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const bookingSlideScrollRef = useRef<HTMLDivElement | null>(null);
  const offersSliderRef = useRef<HTMLDivElement | null>(null);
  const diningSliderRef = useRef<HTMLDivElement | null>(null);
  const experiencesSliderRef = useRef<HTMLDivElement | null>(null);

  const scrollCardSlider = (
    ref: React.RefObject<HTMLDivElement | null>,
    dir: "left" | "right"
  ) => {
    if (!ref.current) return;
    ref.current.scrollBy({
      left: dir === "left" ? -420 : 420,
      behavior: "smooth",
    });
  };

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [bookingConflictError, setBookingConflictError] = useState<
    string | null
  >(null);

  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [guestContact, setGuestContact] = useState<string>("");
  const [guestNote, setGuestNote] = useState<string>("");

  // Active held booking awaiting slip upload
  const [activeHoldBookingId, setActiveHoldBookingId] = useState<string | null>(
    null
  );
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(900);
  const [isScanningSlip, setIsScanningSlip] = useState<boolean>(false);
  const [slipScanFeedback, setSlipScanFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (activeRoom) {
      setDisplayedRoom(activeRoom);
      setPriceGuaranteeSeconds(900);
      setBookingConflictError(null);
    }
  }, [activeRoom]);

  // Clear conflict error and active hold view whenever checkIn or checkOut changes
  useEffect(() => {
    setBookingConflictError(null);
    setActiveHoldBookingId(null);
  }, [checkIn, checkOut]);

  // Live Price Guarantee countdown timer while sidebar is open
  useEffect(() => {
    if (!activeRoom) return;
    const timer = setInterval(() => {
      setPriceGuaranteeSeconds((prev) => (prev > 1 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRoom]);

  const pendingAdminCount = useMemo(
    () => bookings.filter((b) => b.status === "PENDING_ADMIN").length,
    [bookings]
  );

  const nights = useMemo(() => {
    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    return Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [checkIn, checkOut]);

  const activeHoldBooking = useMemo(
    () => bookings.find((b) => b.id === activeHoldBookingId) ?? null,
    [bookings, activeHoldBookingId]
  );

  useEffect(() => {
    if (!activeHoldBooking || activeHoldBooking.status !== "HOLD_15_MIN")
      return;
    const interval = setInterval(() => {
      const expiresMs = new Date(activeHoldBooking.holdExpiresAtIso).getTime();
      const diffSec = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setHoldSecondsLeft(diffSec);
      if (diffSec === 0) {
        saveStore((prev) => ({
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === activeHoldBooking.id ? { ...b, status: "CANCELLED" } : b
          ),
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHoldBooking, saveStore]);

  // Callback passed into AgodaBookingBar so the DatePicker dropdown shows exact available units per day
  const getDailyAvailability = useCallback(
    (dateStr: string): DailyAvailabilityInfo => {
      const activeRooms = rooms.filter((r) => r.statusMode === "ACTIVE");
      const d = new Date(dateStr + "T00:00:00");
      const nextStr = formatDateStr(addDaysToDate(d, 1));
      let freeUnits = 0;
      let heldUnits = 0;
      let totalUnits = 0;

      for (const rm of activeRooms) {
        const inv = getRoomInventoryForRange(rm, dateStr, nextStr, bookings);
        freeUnits += inv.availableUnits;
        heldUnits += inv.heldUnits;
        totalUnits += inv.totalUnits;
      }

      const spOverride = specialDateRates.find(
        (sp) => sp.isActive && sp.dateStr === dateStr
      );
      const seasonMatch = seasonalRates.find(
        (s) => s.isActive && dateStr >= s.startDate && dateStr <= s.endDate
      );

      return {
        freeRoomsCount: freeUnits,
        heldRoomsCount: heldUnits,
        totalActiveRooms: totalUnits,
        isSpecialOrHoliday: Boolean(spOverride),
        rateBadgeTh: spOverride?.titleTh || seasonMatch?.badgeTh,
      };
    },
    [rooms, bookings, specialDateRates, seasonalRates]
  );

  // Room availability & dynamic seasonal/special pricing for currently selected [checkIn, checkOut)
  const roomStatusMap = useMemo(() => {
    const map: Record<
      string,
      {
        state: "AVAILABLE" | "HELD" | "BOOKED" | "MAINTENANCE";
        totalUnits: number;
        availableUnits: number;
        conflictDates: string[];
        capacityOk: boolean;
        effectiveNightlyPrice: number;
        totalStayRoomPrice: number;
        activeRateBadgeTh: string;
        hasSpecialOrSeasonalRate: boolean;
      }
    > = {};

    for (const room of rooms) {
      const inv = getRoomInventoryForRange(room, checkIn, checkOut, bookings);
      const pricing = calculateStayPricingBreakdown({
        room,
        checkIn,
        checkOut,
        guests,
        unitsBooked: 1,
        seasonalRates,
        specialDateRates,
        addons: [],
        selectedAddonIds: [],
        coupons: [],
        appliedCouponCode: null,
      });

      const firstNight = pricing.nightlyBreakdown[0];
      const hasSpecial = pricing.nightlyBreakdown.some(
        (n) => n.rateType === "SPECIAL_DATE" || n.rateType === "SEASONAL"
      );

      map[room.id] = {
        state: inv.state,
        totalUnits: inv.totalUnits,
        availableUnits: inv.availableUnits,
        conflictDates: inv.conflictDates,
        capacityOk: guests <= room.maxGuests * Math.max(1, inv.availableUnits),
        effectiveNightlyPrice: pricing.nightlyPrice,
        totalStayRoomPrice: pricing.roomSubtotal,
        activeRateBadgeTh: firstNight?.rateLabelTh ?? "Standard Rate",
        hasSpecialOrSeasonalRate: hasSpecial,
      };
    }
    return map;
  }, [
    rooms,
    checkIn,
    checkOut,
    guests,
    bookings,
    seasonalRates,
    specialDateRates,
  ]);

  // Total available units across all active rooms
  const totalAvailableUnitsCount = useMemo(
    () =>
      rooms.reduce(
        (sum, r) => sum + (roomStatusMap[r.id]?.availableUnits ?? 0),
        0
      ),
    [rooms, roomStatusMap]
  );

  const totalInventoryUnitsCount = useMemo(
    () =>
      rooms.reduce((sum, r) => sum + Math.max(1, r.totalUnits ?? 1), 0),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const st = roomStatusMap[r.id];
      const avail = st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
      if (filterMode === "available") return avail;
      if (
        filterMode === "VILLA" ||
        filterMode === "SUITE" ||
        filterMode === "DELUXE"
      ) {
        return (r.roomCategory || "VILLA") === filterMode;
      }
      return true;
    });
  }, [rooms, filterMode, roomStatusMap]);

  const [hideSoldOutRooms, setHideSoldOutRooms] = useState<boolean>(false);

  // Agoda Logic: Always separate & prioritize AVAILABLE rooms first, and place SOLD-OUT rooms below (or hide them)
  const availableFilteredRooms = useMemo(
    () =>
      filteredRooms.filter((r) => {
        const st = roomStatusMap[r.id];
        return st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
      }),
    [filteredRooms, roomStatusMap]
  );

  const soldOutFilteredRooms = useMemo(
    () =>
      filteredRooms.filter((r) => {
        const st = roomStatusMap[r.id];
        const avail = st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
        return !avail;
      }),
    [filteredRooms, roomStatusMap]
  );

  // Find the nearest upcoming date range where a specific room is available
  const findNextAvailableRangeForRoom = useCallback(
    (room: RoomLodge): { nextCheckIn: string; nextCheckOut: string } | null => {
      const startBase = new Date(checkIn + "T00:00:00");
      const stayLength = Math.max(1, nights);
      for (let offset = 1; offset <= 14; offset++) {
        const candIn = formatDateStr(addDaysToDate(startBase, offset));
        const candOut = formatDateStr(
          addDaysToDate(startBase, offset + stayLength)
        );
        const inv = getRoomInventoryForRange(room, candIn, candOut, bookings);
        if (inv.state === "AVAILABLE" && inv.availableUnits > 0) {
          return { nextCheckIn: candIn, nextCheckOut: candOut };
        }
      }
      return null;
    },
    [checkIn, nights, bookings]
  );

  // Pricing calculation for the active room inside the Slide-Over Sidebar
  const sidebarRoom = activeRoom ?? displayedRoom;

  const activePricing = useMemo(() => {
    if (!sidebarRoom) {
      return {
        nights: 1,
        nightlyBreakdown: [],
        nightlyPrice: 0,
        roomSubtotal: 0,
        extraGuests: 0,
        extraBedTotal: 0,
        addonsTotal: 0,
        couponDiscount: 0,
        netTotal: 0,
      };
    }
    return calculateStayPricingBreakdown({
      room: sidebarRoom,
      checkIn,
      checkOut,
      guests,
      unitsBooked: unitsToBook,
      seasonalRates,
      specialDateRates,
      addons,
      selectedAddonIds: selectedAddons,
      coupons,
      appliedCouponCode,
    });
  }, [
    sidebarRoom,
    checkIn,
    checkOut,
    guests,
    unitsToBook,
    seasonalRates,
    specialDateRates,
    addons,
    selectedAddons,
    coupons,
    appliedCouponCode,
  ]);

  const openRoomDrawer = (
    room: RoomLodge,
    initialTab: "details" | "booking" = "details"
  ) => {
    // Check if there is an active 15-minute hold on this room for the selected dates
    const currentBookings = getLatestBookingsSnapshot(bookings);
    const existingHold = currentBookings.find(
      (b) =>
        b.roomId === room.id &&
        b.status === "HOLD_15_MIN" &&
        new Date(b.holdExpiresAtIso).getTime() > Date.now() &&
        checkIn < b.checkOut &&
        checkOut > b.checkIn
    );

    const st = roomStatusMap[room.id];
    const isAvailable =
      st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;

    // Agoda UX Rule: Prevent opening the booking drawer for sold-out rooms so guests never get confused
    if (!isAvailable && !existingHold) {
      return;
    }

    setDisplayedRoom(room);
    setActiveRoom(room);
    setUnitsToBook(1);
    setDrawerSlideIndex(0);
    setSlipScanFeedback(null);
    setBookingConflictError(null);

    if (existingHold) {
      const expiresMs = new Date(existingHold.holdExpiresAtIso).getTime();
      setHoldSecondsLeft(
        Math.max(1, Math.floor((expiresMs - Date.now()) / 1000))
      );
      setActiveHoldBookingId(existingHold.id);
      setDrawerTab(initialTab);
    } else {
      // Mandatory Upsell & Price Summary Flow:
      // Always start on the "details" slide first so the guest sees night-by-night pricing and add-on upsells before filling out guest info
      setActiveHoldBookingId(null);
      setDrawerTab("details");
      setTimeout(() => {
        sidebarScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }, 0);
    }
  };

  const handleCancelHoldBooking = (bookingId: string) => {
    saveStore((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "CANCELLED" } : b
      ),
    }));
    setActiveHoldBookingId(null);
    setSlipScanFeedback(null);
    setBookingConflictError(null);
  };

  const handleApplyCoupon = (codeToApply?: string) => {
    const raw = (codeToApply ?? couponInput).trim().toUpperCase();
    setCouponError(null);
    if (!raw) {
      setAppliedCouponCode(null);
      return;
    }
    const found = coupons.find(
      (c) => c.isActive && c.code.toUpperCase() === raw
    );
    if (!found) {
      setCouponError("ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว");
      return;
    }
    setCouponInput(found.code);
    setAppliedCouponCode(found.code);
  };

  // Lock room for 15 minutes (HOLD_15_MIN) & show PromptPay QR
  // Uses synchronous snapshot verification BEFORE saveStore to prevent React 18/19 deferred updater race
  const handleCreateHoldBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebarRoom || !guestName.trim() || !guestPhone.trim()) return;
    setBookingConflictError(null);

    // Synchronous pre-submit verification against latest bookings (React state + localStorage)
    const currentBookings = getLatestBookingsSnapshot(bookings);
    const latestCheck = getRoomInventoryForRange(
      sidebarRoom,
      checkIn,
      checkOut,
      currentBookings
    );
    if (latestCheck.availableUnits < unitsToBook) {
      const conflictText =
        latestCheck.conflictDates.length > 0
          ? latestCheck.conflictDates
              .map((d) => formatShortDate(d, lang))
              .join(", ")
          : `${formatShortDate(checkIn, lang)} – ${formatShortDate(checkOut, lang)}`;
      setBookingConflictError(
        `ไม่สามารถจองทับวันได้: ${sidebarRoom.nameTh} มีผู้จองเต็มแล้วในคืนวันที่ ${conflictText} กรุณาเปลี่ยนวันเข้าพักหรือเลือกบ้านพักหลังอื่นครับ`
      );
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `bk-${Date.now()}`;
    const chosenAddons = addons
      .filter((a) => a.isActive && selectedAddons.includes(a.id))
      .map((a) => ({ id: a.id, nameTh: a.nameTh, priceThb: a.priceThb }));

    const newBooking: BookingRecord = {
      id: newId,
      bookingCode: `SPN-${randomNum}`,
      roomId: sidebarRoom.id,
      roomCode: sidebarRoom.code,
      roomNameTh: sidebarRoom.nameTh,
      unitsBooked: unitsToBook,
      checkIn,
      checkOut,
      nights,
      guests,
      extraGuests: activePricing.extraGuests,
      extraBedTotalThb: activePricing.extraBedTotal,
      addonsSelected: chosenAddons,
      addonsTotalThb: activePricing.addonsTotal,
      couponCode: appliedCouponCode ?? undefined,
      couponDiscountThb: activePricing.couponDiscount,
      roomSubtotalThb: activePricing.roomSubtotal,
      totalPriceThb: activePricing.netTotal,
      depositAmountThb: activePricing.netTotal,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestContact: guestContact.trim(),
      guestNote: guestNote.trim(),
      status: "HOLD_15_MIN",
      createdAtIso: new Date().toISOString(),
      holdExpiresAtIso: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      source: "WEBSITE",
    };

    saveStore((prev) => ({
      ...prev,
      bookings: [newBooking, ...prev.bookings],
    }));

    setHoldSecondsLeft(900);
    setActiveHoldBookingId(newId);
  };

  // Upload slip file & run free QR slip scanner
  const handleSlipFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeHoldBooking) return;

    setIsScanningSlip(true);
    setSlipScanFeedback(null);
    try {
      const result = await scanSlipQrFromFile(file);

      const isDuplicate = bookings.some(
        (b) =>
          b.id !== activeHoldBooking.id &&
          b.slipQrPayload &&
          b.slipQrPayload === result.qrPayload
      );

      if (isDuplicate) {
        setSlipScanFeedback(
          "⚠️ ระบบตรวจพบว่าสลิปใบนี้เคยถูกใช้ไปแล้ว กรุณาแนบสลิปใบใหม่"
        );
        setIsScanningSlip(false);
        return;
      }

      saveStore((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === activeHoldBooking.id
            ? {
                ...b,
                status: "PENDING_ADMIN",
                slipDataUrl: result.dataUrl,
                slipQrVerified: result.qrFound,
                slipQrPayload: result.qrPayload,
              }
            : b
        ),
      }));
      setSlipScanFeedback(
        `✅ สแกน QR บนสลิปสำเร็จ (${result.qrPayload.slice(
          0,
          18
        )}...) ส่งให้แอดมินตรวจสอบเรียบร้อย!`
      );
    } catch {
      setSlipScanFeedback("เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ กรุณาลองอีกครั้ง");
    } finally {
      setIsScanningSlip(false);
    }
  };

  // 1-Click Simulate Valid Bank Slip with QR
  const handleSimulateValidSlip = () => {
    if (!activeHoldBooking) return;
    const mockRef = `0046000600000101030040220${Date.now()}KBNKTH`;
    saveStore((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === activeHoldBooking.id
          ? {
              ...b,
              status: "PENDING_ADMIN",
              slipDataUrl:
                "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
              slipQrVerified: true,
              slipQrPayload: mockRef,
            }
          : b
      ),
    }));
    setSlipScanFeedback(
      `✅ สแกนพบ QR สลิปธนาคารจริง (Ref: ${mockRef.slice(
        -12
      )}) ล็อคห้องต่อเนื่องและส่งเข้าหน้า /admin เรียบร้อย!`
    );
  };

  const isSidebarOpen = Boolean(activeRoom);
  const vis = propertyConfig.sectionsVisibility;

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[#4A4643]">
      {/* =====================================================================
          SECTION 1: STICKY SINGLE-LAYER TOP BOOKING BAR (WITH DAILY AVAILABILITY)
      ====================================================================== */}
      <AgodaBookingBar
        lang={lang}
        setLang={setLang}
        checkIn={checkIn}
        setCheckIn={setCheckIn}
        checkOut={checkOut}
        setCheckOut={setCheckOut}
        guests={guests}
        setGuests={setGuests}
        nights={nights}
        freeCount={totalAvailableUnitsCount}
        totalRoomsCount={totalInventoryUnitsCount}
        pendingAdminCount={pendingAdminCount}
        onOpenDesignSystem={() => setShowDesignSystem(true)}
        getDailyAvailability={getDailyAvailability}
        brandCode={propertyConfig.brandCode}
        brandNameTh={propertyConfig.nameTh}
        brandNameEn={propertyConfig.nameEn}
        primaryColor={propertyConfig.primaryColor || "#4A4946"}
        currentTempC={weather?.currentTemp ?? null}
        weatherCityLabel={
          lang === "th"
            ? propertyConfig.weatherCityLabelTh
            : propertyConfig.weatherCityLabelEn
        }
      />

      {/* =====================================================================
          SECTION 2: ANANTARA-STYLE CINEMATIC HERO SHOWCASE (EXTENDS BEHIND TRANSLUCENT NAVBAR)
      ====================================================================== */}
      {vis.heroSection ? (
        <section
          id="overview"
          className="scroll-mt-20 relative bg-[#4A4946] grid min-h-[480px] sm:min-h-[560px] overflow-hidden border-b border-[#D8CBB8]/30"
        >
          <img
            src={propertyConfig.heroImageUrl}
            alt={propertyConfig.nameTh}
            className="object-cover object-center w-full h-full absolute inset-0 z-0 pointer-events-none scale-[1.01]"
          />
          <div className="relative z-10 flex flex-col justify-between items-center bg-gradient-to-b from-black/45 via-black/15 to-[#3D3936]/80 px-4 sm:px-8 pt-24 sm:pt-32 pb-10 sm:pb-14">
            <div />
            <div className="text-center text-white max-w-3xl px-2 space-y-3.5">
              <div className="inline-flex items-center gap-3">
                <span className="h-[1px] w-8 bg-[#D8CBB8]" />
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#EFE7DA] font-semibold">
                  {lang === "th"
                    ? propertyConfig.subtitleTh
                    : propertyConfig.subtitleEn}
                </p>
                <span className="h-[1px] w-8 bg-[#D8CBB8]" />
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-light tracking-wide drop-shadow-xs">
                {lang === "th" ? propertyConfig.nameTh : propertyConfig.nameEn}
              </h1>
              <p className="text-xs sm:text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
                {lang === "th"
                  ? propertyConfig.taglineTh
                  : propertyConfig.taglineEn}
              </p>
            </div>

            {/* Quick Luxury Highlights Bar at bottom of Hero */}
            <div className="w-full max-w-5xl pt-6 mt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-white">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D8CBB8] block">
                  BEST RATE GUARANTEE
                </span>
                <span className="text-xs sm:text-sm font-semibold mt-0.5 block">
                  จองตรงราคาดีที่สุด 100%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D8CBB8] block">
                  INVENTORY MODEL
                </span>
                <span className="text-xs sm:text-sm font-semibold mt-0.5 block">
                  วิลล่าส่วนตัว & ห้องสวีท ({totalInventoryUnitsCount} ยูนิต)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D8CBB8] block">
                  DYNAMIC SEASONAL RATES
                </span>
                <span className="text-xs sm:text-sm font-semibold mt-0.5 block">
                  คำนวณเรทตามฤดูกาลอัตโนมัติ
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D8CBB8] block">
                  GUEST RATING
                </span>
                <span className="text-xs sm:text-sm font-semibold mt-0.5 block">
                  ★ 9.6 / 10 Exceptional
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="h-16 md:h-[74px] bg-[#4A4946]" />
      )}

      {/* =====================================================================
          SECTION 3A: THE RESORT SANCTUARY STORY (BG: PURE WHITE #FFFFFF)
      ====================================================================== */}
      {vis.storyAndWeatherSection && (
        <section id="story-weather" className="scroll-mt-20 bg-white py-14 sm:py-16">
          <div id="story" className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            {/* Editorial Sanctuary Story (Grand Centered Storytelling) */}
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* Kicker */}
              <div className="flex items-center justify-center gap-3">
                <span className="h-[1px] w-8 sm:w-16 bg-[#A29080]" />
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#A29080]">
                  THE RESORT SANCTUARY · เสน่ห์แห่งการพักผ่อนเหนือระดับ
                </p>
                <span className="h-[1px] w-8 sm:w-16 bg-[#A29080]" />
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-light tracking-[0.06em] text-[#A29080] uppercase leading-snug sm:leading-relaxed">
                {lang === "th"
                  ? propertyConfig.storyTitleTh
                  : propertyConfig.storyTitleEn}
              </h2>

              {/* Narrative Storytelling Paragraphs */}
              <div className="max-w-3xl mx-auto space-y-4 text-xs sm:text-sm lg:text-[15px] text-[#5C554E] leading-relaxed sm:leading-loose font-normal">
                {(lang === "th"
                  ? propertyConfig.storyParagraphsTh
                  : propertyConfig.storyParagraphsEn
                ).map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* Direct Booking Privileges (Horizontal Trust Strip) */}
              <div className="pt-8 mt-10 border-t border-[#E6E0D6] max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4 text-center">
                  <Award className="w-4 h-4 text-[#A29080]" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#4A4643]">
                    DIRECT BOOKING PRIVILEGES · สิทธิพิเศษเมื่อจองตรงผ่านเว็บไซต์ทางการ
                  </span>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-xs sm:text-sm text-[#5C554E]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#A29080] shrink-0" />
                    <span>
                      รับส่วนลดทันทีเมื่อใช้โค้ด{" "}
                      <strong className="text-[#4A4643] font-bold">SAPAN10</strong> บนหน้าเว็บทางการ
                    </span>
                  </div>
                  <span className="hidden md:inline text-[#D6C9B8]">•</span>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#A29080] shrink-0" />
                    <span>เช็คจำนวนห้องว่างรายวันได้ทันทีบนแถบเลือกวันที่</span>
                  </div>
                  <span className="hidden md:inline text-[#D6C9B8]">•</span>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#A29080] shrink-0" />
                    <span>ล็อคห้อง 15 นาที พร้อมตรวจสลิป QR อัตโนมัติ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 3B: 14-DAY TEMPERATURE, ROOMS & PROMOTIONS (BG: WARM CREAM #F4EFE6)
      ====================================================================== */}
      {vis.storyAndWeatherSection && (
        <section
          id="weather-forecast"
          className="scroll-mt-20 bg-[#F4EFE6] border-y border-[#E6E0D6] py-14 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <ResortWeatherWidget
              weather={weather}
              loading={weatherLoading}
              cityLabel={
                lang === "th"
                  ? propertyConfig.weatherCityLabelTh
                  : propertyConfig.weatherCityLabelEn
              }
              checkInDateStr={checkIn}
              lang={lang}
              accentColor={propertyConfig.accentColor}
              onSelectCheckInDate={(selectedDateStr) => {
                setCheckIn(selectedDateStr);
                const nextDay = addDaysToDate(
                  new Date(selectedDateStr + "T00:00:00"),
                  Math.max(1, nights)
                );
                setCheckOut(formatDateStr(nextDay));
                const el = document.getElementById("rooms");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              getDailyRoomSnapshot={(dateStr) => {
                const avail = getDailyAvailability(dateStr);
                const activeRooms = rooms.filter(
                  (r) => r.statusMode === "ACTIVE"
                );
                const d = new Date(dateStr + "T00:00:00");
                const nextStr = formatDateStr(addDaysToDate(d, 1));
                const dayOfWeek = d.getDay();
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                let minFinal = Infinity;
                let minOriginal = Infinity;

                for (const rm of activeRooms) {
                  const p = calculateStayPricingBreakdown({
                    room: rm,
                    checkIn: dateStr,
                    checkOut: nextStr,
                    guests: 2,
                    unitsBooked: 1,
                    seasonalRates,
                    specialDateRates,
                    addons: [],
                    selectedAddonIds: [],
                    coupons: [],
                    appliedCouponCode: null,
                  });
                  const nightPrice = p.nightlyPrice || rm.basePriceThb;
                  const sapan10Active = coupons.some(
                    (c) =>
                      c.isActive &&
                      (c.code === "SAPAN10" || c.code === "DIRECT15")
                  );
                  const effectivePromoPrice = sapan10Active
                    ? Math.round(nightPrice * 0.9)
                    : nightPrice;
                  const origBeforeRoomDisc =
                    rm.discountPercent > 0
                      ? Math.round(nightPrice / (1 - rm.discountPercent / 100))
                      : nightPrice;

                  if (effectivePromoPrice < minFinal) {
                    minFinal = effectivePromoPrice;
                    minOriginal = Math.max(origBeforeRoomDisc, nightPrice);
                  }
                }

                if (!isFinite(minFinal)) {
                  minFinal = 2331;
                  minOriginal = 2590;
                }

                const promoLabelTh = avail.isSpecialOrHoliday
                  ? avail.rateBadgeTh || "เรทวันพิเศษ"
                  : !isWeekend
                  ? "โปรวันธรรมดา -10%"
                  : "โปรจองตรง -10%";

                return {
                  freeRoomsCount: avail.freeRoomsCount,
                  totalActiveRooms: avail.totalActiveRooms,
                  startingPriceThb: minFinal,
                  originalPriceThb: minOriginal,
                  promoLabelTh,
                  isPromoDay: true,
                };
              }}
            />
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 4: ACCOMMODATIONS SHOWCASE (BG: PURE WHITE #FFFFFF)
          Desktop: 1 Room Per Row (Agoda-style Full Information Row + Sold-Out Logic)
      ====================================================================== */}
      {vis.accommodationsSection && (
        <main id="rooms" className="scroll-mt-20 bg-white py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#545351]">
                  ACCOMMODATIONS · ROOMS, SUITES & VILLAS
                </p>
                <h2 className="text-2xl sm:text-4xl font-light tracking-[0.08em] uppercase text-[#A29080] mt-1">
                  LUXURY ROOMS, SUITES & PRIVATE VILLAS
                </h2>
                <p className="text-xs sm:text-sm text-[#5C554E] mt-1.5">
                  เปรียบเทียบรายละเอียดห้องพักแบบครบถ้วน พร้อมคำนวณราคาตามฤดูกาลสำหรับ{" "}
                  <strong className="text-[#4A4643]">
                    {formatShortDate(checkIn, lang)} –{" "}
                    {formatShortDate(checkOut, lang)} ({nights} คืน · ผู้เข้าพัก{" "}
                    {guests} ท่าน)
                  </strong>
                </p>
              </div>

              {/* Category & Availability Filter Tabs + Hide Sold-Out Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: "all", label: `ALL (${rooms.length})` },
                    {
                      id: "available",
                      label: `ว่างพร้อมจอง (${totalAvailableUnitsCount})`,
                    },
                    { id: "VILLA", label: "PRIVATE VILLAS" },
                    { id: "SUITE", label: "SUITES" },
                    { id: "DELUXE", label: "DELUXE ROOMS" },
                  ] as { id: FilterMode; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={`rounded-[2px] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] border transition cursor-pointer ${
                      filterMode === tab.id
                        ? "bg-[#A29080] text-white border-[#A29080]"
                        : "bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {soldOutFilteredRooms.length > 0 &&
                  filterMode !== "available" && (
                    <button
                      type="button"
                      onClick={() => setHideSoldOutRooms((prev) => !prev)}
                      className={`rounded-[2px] px-3.5 py-2 text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        hideSoldOutRooms
                          ? "bg-[#545351] text-white border-[#545351]"
                          : "bg-[#FBF9F6] text-[#5C554E] border-[#E2DAD0] hover:border-[#A29080]"
                      }`}
                    >
                      <span>
                        {hideSoldOutRooms
                          ? `✓ ซ่อนห้องที่เต็มแล้ว (${soldOutFilteredRooms.length})`
                          : `ซ่อนห้องที่เต็มแล้ว (${soldOutFilteredRooms.length})`}
                      </span>
                    </button>
                  )}
              </div>
            </div>

            {/* Active Seasonal / Special Date Banner */}
            <div className="mb-8 rounded-[2px] bg-[#F4EFE6] border-l-4 border-l-[#A29080] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-[2px] bg-[#545351] text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                  ACTIVE RATE TIER
                </span>
                <span className="font-bold text-[#4A4643]">
                  {rooms[0] && roomStatusMap[rooms[0].id]?.activeRateBadgeTh}
                </span>
                <span className="text-[#5C554E]">
                  (คำนวณอัตโนมัติตาม Season / วันศุกร์-เสาร์ / วันหยุดนักขัตฤกษ์)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#4A4643] flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#A29080]" />
                  คูปองลดเพิ่ม:
                </span>
                {coupons
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCouponInput(c.code);
                        setAppliedCouponCode(c.code);
                      }}
                      className={`rounded-[2px] px-2.5 py-1 font-mono text-[11px] font-bold border transition cursor-pointer ${
                        appliedCouponCode === c.code
                          ? "bg-[#A29080] text-white border-[#A29080]"
                          : "bg-white text-[#4A4643] border-[#D6C9B8] hover:border-[#A29080]"
                      }`}
                    >
                      {c.code} (
                      {c.discountType === "PERCENT"
                        ? `-${c.discountValue}%`
                        : `-฿${c.discountValue}`}
                      )
                    </button>
                  ))}
              </div>
            </div>

            {/* Agoda-style Alert Banner when 0 rooms are available on selected dates */}
            {availableFilteredRooms.length === 0 && (
              <div className="mb-8 rounded-[2px] bg-[#FDF8F5] border-l-4 border-l-[#B85D43] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#9B2C2C] font-bold text-sm sm:text-base">
                    <span>
                      ขออภัย ห้องพักเต็มครบทุกหลังในช่วงวันที่{" "}
                      {formatShortDate(checkIn, lang)} –{" "}
                      {formatShortDate(checkOut, lang)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5C554E]">
                    ระบบได้ปิดปุ่มการจองของห้องที่เต็มแล้วเพื่อป้องกันการจองซ้อน
                    คุณสามารถกดเลือกวันว่างใกล้เคียงด้านขวาเพื่อดูห้องที่พร้อมจองได้ทันทีครับ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {Array.from({ length: 10 }, (_, idx) => {
                    const candDate = addDaysToDate(today, idx);
                    const candIn = formatDateStr(candDate);
                    const candOut = formatDateStr(
                      addDaysToDate(candDate, Math.max(1, nights))
                    );
                    let freeCount = 0;
                    for (const rm of rooms) {
                      const inv = getRoomInventoryForRange(
                        rm,
                        candIn,
                        candOut,
                        bookings
                      );
                      if (inv.state === "AVAILABLE") {
                        freeCount += inv.availableUnits;
                      }
                    }
                    return { candIn, candOut, freeCount };
                  })
                    .filter((item) => item.freeCount > 0)
                    .slice(0, 3)
                    .map((item) => (
                      <button
                        key={item.candIn}
                        type="button"
                        onClick={() => {
                          setCheckIn(item.candIn);
                          setCheckOut(item.candOut);
                          if (filterMode === "available") {
                            setFilterMode("all");
                          }
                        }}
                        className="rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white px-4 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        {formatShortDate(item.candIn, lang)} –{" "}
                        {formatShortDate(item.candOut, lang)} (ว่าง{" "}
                        {item.freeCount} หลัง) →
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                PART A: AVAILABLE ROOMS (1 ROOM PER ROW ON DESKTOP — AGODA STYLE)
            ================================================================ */}
            {availableFilteredRooms.length > 0 && (
              <div className="divide-y divide-[#E2DAD0] border-t border-[#E2DAD0]">
                {availableFilteredRooms.map((room) => {
                  const currentSlide = cardSlideIndex[room.id] ?? 0;
                  const totalSlides = room.images.length;
                  const st = roomStatusMap[room.id];
                  const nightlyRate =
                    st?.effectiveNightlyPrice ?? room.basePriceThb;
                  const totalStayRate =
                    st?.totalStayRoomPrice ?? nightlyRate * nights;
                  const originalNightlyRate =
                    room.discountPercent > 0
                      ? Math.round(
                          nightlyRate / (1 - room.discountPercent / 100)
                        )
                      : nightlyRate;
                  const isSingleVilla =
                    (room.inventoryMode || "SINGLE_UNIT") === "SINGLE_UNIT";
                  const allFacilities = [
                    ...room.amenities.outdoor,
                    ...room.amenities.dining,
                    ...room.amenities.common,
                  ];

                  return (
                    <article
                      key={room.id}
                      className="group py-8 first:pt-6 transition-colors"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                        {/* COLUMN 1: Photo Slider + Interactive Thumbnails (lg:col-span-4) */}
                        <div className="lg:col-span-4 flex flex-col gap-2.5">
                          <div
                            onClick={() => openGalleryModal(room)}
                            className="relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] cursor-pointer group/photo"
                          >
                            <div
                              className="flex h-full w-full transition-transform duration-500 ease-out"
                              style={{
                                transform: `translateX(-${currentSlide * 100}%)`,
                              }}
                            >
                              {room.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img.url}
                                  alt={img.captionTh || room.nameTh}
                                  className="h-full w-full shrink-0 object-cover object-center transition-transform duration-500 group-hover/photo:scale-105"
                                />
                              ))}
                            </div>

                            {/* Top Left Status & Promo Pill */}
                            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                              <StatusPill
                                status="available"
                                label={
                                  isSingleVilla
                                    ? "ว่างพร้อมจอง (1 หลังสุดท้าย)"
                                    : `ว่าง ${st?.availableUnits} / ${st?.totalUnits} ห้อง`
                                }
                              />
                              {room.discountPercent > 0 && (
                                <span className="self-start rounded-[2px] bg-[#B85D43] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  SAVE {room.discountPercent}% TODAY
                                </span>
                              )}
                            </div>

                            {/* Top Right Room Code */}
                            <div className="absolute top-3 right-3 z-10 rounded-[2px] bg-[#545351]/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white flex items-center gap-1 pointer-events-none">
                              <Home className="w-3 h-3 text-[#E6DEC8]" />
                              <span>{room.code}</span>
                            </div>

                            {/* Center Hover Overlay Badge: "คลิกเพื่อดูภาพรวมทั้งหมด" */}
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <div className="rounded-[2px] bg-white/95 text-[#2C2A29] px-3.5 py-1.5 text-xs font-bold shadow-lg flex items-center gap-2">
                                <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                                <span>ดูภาพรวมทั้งหมด ({totalSlides} รูป)</span>
                              </div>
                            </div>

                            {/* Bottom Right Image Counter */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                openGalleryModal(room);
                              }}
                              className="absolute bottom-2.5 right-2.5 z-10 rounded-[2px] bg-[#4A4643]/85 hover:bg-[#2563EB] backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-semibold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{currentSlide + 1} / {totalSlides}</span>
                            </div>

                            {/* Left/Right Slider Arrows */}
                            {totalSlides > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardSlideIndex((prev) => ({
                                      ...prev,
                                      [room.id]:
                                        (currentSlide - 1 + totalSlides) %
                                        totalSlides,
                                    }));
                                  }}
                                  aria-label="Previous slide"
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[2px] bg-[#4A4643]/75 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition hover:bg-[#A29080] cursor-pointer z-10"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardSlideIndex((prev) => ({
                                      ...prev,
                                      [room.id]:
                                        (currentSlide + 1) % totalSlides,
                                    }));
                                  }}
                                  aria-label="Next slide"
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[2px] bg-[#4A4643]/75 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition hover:bg-[#A29080] cursor-pointer z-10"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Thumbnail Strip */}
                          {totalSlides > 1 && (
                            <div className="grid grid-cols-3 gap-2">
                              {room.images.slice(0, 3).map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setCardSlideIndex((prev) => ({
                                      ...prev,
                                      [room.id]: idx,
                                    }))
                                  }
                                  className={`relative aspect-[16/10] rounded-[2px] overflow-hidden cursor-pointer transition ${
                                    currentSlide === idx
                                      ? "ring-2 ring-[#A29080] opacity-100"
                                      : "opacity-65 hover:opacity-100"
                                  }`}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.captionTh || room.nameTh}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* COLUMN 2: Complete Room Information, Perks & Facilities (lg:col-span-5) */}
                        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            {/* Category & Rating */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A29080]">
                                {isSingleVilla
                                  ? `SINGLE PRIVATE LODGE · บ้านพักระบุหลัง (${room.code})`
                                  : `ROOM CATEGORY · มีทั้งหมด ${st?.totalUnits} ห้อง`}
                              </span>
                              <div className="inline-flex items-center gap-1.5 text-xs">
                                <span className="rounded-[2px] bg-[#A29080] text-white px-2 py-0.5 text-[11px] font-bold">
                                  9.6
                                </span>
                                <span className="font-bold text-[#4A4643]">
                                  Exceptional
                                </span>
                              </div>
                            </div>

                            {/* Room Title */}
                            <div>
                              <h3
                                onClick={() => openRoomDrawer(room, "details")}
                                className="text-xl sm:text-2xl font-bold text-[#4A4643] hover:text-[#A29080] transition-colors cursor-pointer"
                              >
                                {lang === "th" ? room.nameTh : room.nameEn}
                              </h3>
                              {/* Key Specs Row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-[#5C554E] mt-2">
                                <span className="inline-flex items-center gap-1.5">
                                  <Maximize2 className="w-3.5 h-3.5 text-[#A29080]" />
                                  ขนาด {room.sizeSqm} ตร.ม.
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-[#A29080]" />
                                  ผู้เข้าพักมาตรฐาน {room.baseGuests} ท่าน (สูงสุด{" "}
                                  {room.maxGuests} ท่าน)
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Mountain className="w-3.5 h-3.5 text-[#A29080]" />
                                  วิวภูเขาและสายหมอกสะปัน
                                </span>
                              </div>
                            </div>

                            {/* Full Room Description */}
                            <p className="text-xs sm:text-sm text-[#5C554E] leading-relaxed">
                              {lang === "th"
                                ? room.shortDescTh
                                : room.shortDescEn}{" "}
                              {lang === "th" && room.longDescTh[0]
                                ? room.longDescTh[0]
                                : ""}
                            </p>

                            {/* Included Booking Perks (Agoda-style green checkmarks) */}
                            <div className="pt-1 space-y-1.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4A4643]">
                                สิทธิประโยชน์ที่รวมในราคาห้องพัก (Included Benefits)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#2E6B47] font-medium">
                                <div className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>ฟรีอาหารเช้าเสิร์ฟถึงระเบียงบ้านพัก</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>ฟรีชุดดริปกาแฟสด & มินิบาร์</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>ฟรี Wi-Fi ความเร็วสูง & ที่จอดรถ</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>ล็อคห้องทันทีเมื่อยืนยันการจอง</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Room Facilities with Pastel Icons */}
                          <div className="pt-3 border-t border-[#E6E0D6]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C8278] mb-2">
                              สิ่งอำนวยความสะดวกหลักในห้องพัก ({room.code})
                            </p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                              {allFacilities.slice(0, 6).map((item, idx) => {
                                const { Icon, toneClass } = getFacilityIconMeta(
                                  item,
                                  idx
                                );
                                return (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2.5 text-xs text-[#4A4643] min-w-0"
                                  >
                                    <span
                                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="leading-snug">{item}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>

                        {/* COLUMN 3: Agoda-Style Price Breakdown & Instant Booking CTA (lg:col-span-3) */}
                        <div className="lg:col-span-3 flex flex-col justify-between lg:border-l lg:border-[#E6E0D6] lg:pl-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E6E0D6]">
                          <div className="space-y-2 lg:text-right">
                            <div className="inline-flex items-center gap-1.5 rounded-[2px] bg-[#F1F8F4] text-[#2E6B47] px-3 py-1 text-xs font-bold">
                              <span>
                                ● เหลือห้องว่าง {st?.availableUnits} หลังสุดท้าย!
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-[#A29080]">
                              {st?.activeRateBadgeTh}
                            </p>

                            <div className="pt-1">
                              {room.discountPercent > 0 && (
                                <div className="flex lg:justify-end items-center gap-2">
                                  <span className="text-xs text-[#8C8278] line-through">
                                    ฿{originalNightlyRate.toLocaleString()}
                                  </span>
                                  <span className="rounded-[2px] bg-[#FDF2F2] text-[#B85D43] px-1.5 py-0.5 text-[10px] font-bold">
                                    -{room.discountPercent}%
                                  </span>
                                </div>
                              )}
                              <div className="flex lg:justify-end items-baseline gap-1.5 mt-0.5">
                                <span className="text-2xl sm:text-3xl font-extrabold text-[#B85D43]">
                                  ฿{nightlyRate.toLocaleString()}
                                </span>
                                <span className="text-xs text-[#5C554E] font-medium">
                                  / คืน
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#4A4643] mt-1">
                                ยอดรวม {nights} คืน: ฿
                                {totalStayRate.toLocaleString()}
                              </p>
                              <p className="text-[11px] text-[#8C8278] mt-0.5">
                                รวมภาษีและค่าธรรมเนียมแล้ว · ไม่มีบวกเพิ่ม
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 pt-5">
                            <button
                              type="button"
                              onClick={() => openRoomDrawer(room, "details")}
                              className="w-full rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white py-3 px-5 text-xs sm:text-sm font-bold tracking-wide transition cursor-pointer shadow-xs"
                            >
                              ดูรายละเอียด & เลือกจอง ({room.code})
                            </button>
                            <p className="text-[11px] text-[#8C8278] lg:text-right">
                              แสดงสรุปราคารายคืน & เลือกบริการเสริมก่อนกรอกข้อมูล
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* ===============================================================
                PART B: SOLD-OUT ROOMS ON SELECTED DATES (AGODA LOGIC)
                - Separated below available rooms (or hidden when hideSoldOutRooms is active)
                - Booking drawer is strictly disabled so guests never get confused
                - Provides 1-click switch to the nearest available date for that room
            ================================================================ */}
            {!hideSoldOutRooms &&
              filterMode !== "available" &&
              soldOutFilteredRooms.length > 0 && (
                <div className="mt-10 pt-8 border-t-2 border-[#E2DAD0]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9B2C2C] block">
                        SOLD OUT ON YOUR SELECTED DATES
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-[#4A4643]">
                        ห้องพักที่เต็มแล้วในช่วงวันที่{" "}
                        {formatShortDate(checkIn, lang)} –{" "}
                        {formatShortDate(checkOut, lang)} (
                        {soldOutFilteredRooms.length} ห้อง)
                      </h3>
                      <p className="text-xs text-[#5C554E] mt-0.5">
                        ตามมาตรฐานเดียวกับ Agoda: ห้องที่เต็มแล้วจะถูกปิดปุ่มจองเพื่อป้องกันความสับสน
                        หากคุณต้องการเข้าพักห้องด้านล่าง สามารถกดเปลี่ยนเป็นวันว่างถัดไปได้ทันที
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setHideSoldOutRooms(true)}
                      className="text-xs font-bold text-[#5C554E] hover:text-[#4A4643] underline cursor-pointer"
                    >
                      ซ่อนห้องที่เต็มแล้วทั้งหมด
                    </button>
                  </div>

                  <div className="divide-y divide-[#E6E0D6] border-t border-[#E6E0D6]">
                    {soldOutFilteredRooms.map((room) => {
                      const currentSlide = cardSlideIndex[room.id] ?? 0;
                      const totalSlides = room.images.length;
                      const st = roomStatusMap[room.id];
                      const isSingleVilla =
                        (room.inventoryMode || "SINGLE_UNIT") === "SINGLE_UNIT";
                      const nextAvail = findNextAvailableRangeForRoom(room);
                      const hasOwnActiveHold = bookings.some(
                        (b) =>
                          b.roomId === room.id &&
                          b.status === "HOLD_15_MIN" &&
                          new Date(b.holdExpiresAtIso).getTime() > Date.now() &&
                          checkIn < b.checkOut &&
                          checkOut > b.checkIn
                      );
                      const allFacilities = [
                        ...room.amenities.outdoor,
                        ...room.amenities.dining,
                        ...room.amenities.common,
                      ];

                      return (
                        <article
                          key={room.id}
                          className="py-7 opacity-80 transition"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                            {/* COLUMN 1: Photo Gallery (Read-only preview, does not open booking drawer) */}
                            <div className="lg:col-span-4 flex flex-col gap-2">
                              <div
                                onClick={() => openGalleryModal(room)}
                                className="relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] cursor-pointer group/soldphoto"
                              >
                                <div
                                  className="flex h-full w-full transition-transform duration-500 ease-out grayscale-[25%]"
                                  style={{
                                    transform: `translateX(-${
                                      currentSlide * 100
                                    }%)`,
                                  }}
                                >
                                  {room.images.map((img, i) => (
                                    <img
                                      key={i}
                                      src={img.url}
                                      alt={img.captionTh || room.nameTh}
                                      className="h-full w-full shrink-0 object-cover object-center transition-transform duration-500 group-hover/soldphoto:scale-105"
                                    />
                                  ))}
                                </div>

                                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                                  {st?.state === "HELD" ? (
                                    <StatusPill
                                      status="last_unit"
                                      label="ติดล็อค/รอชำระเงิน"
                                    />
                                  ) : (
                                    <StatusPill
                                      status="booked"
                                      label="เต็มในวันที่เลือก (Sold Out)"
                                    />
                                  )}
                                </div>

                                <div className="absolute top-3 right-3 z-10 rounded-[2px] bg-[#545351]/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white flex items-center gap-1 pointer-events-none">
                                  <Home className="w-3 h-3 text-[#E6DEC8]" />
                                  <span>{room.code}</span>
                                </div>

                                {/* Bottom Right Image Counter */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGalleryModal(room);
                                  }}
                                  className="absolute bottom-2.5 right-2.5 z-10 rounded-[2px] bg-[#4A4643]/85 hover:bg-[#2563EB] backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-semibold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>{currentSlide + 1} / {totalSlides}</span>
                                </div>

                                {totalSlides > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCardSlideIndex((prev) => ({
                                          ...prev,
                                          [room.id]:
                                            (currentSlide - 1 + totalSlides) %
                                            totalSlides,
                                        }))
                                      }
                                      className="absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[2px] bg-[#4A4643]/75 text-white flex items-center justify-center hover:bg-[#A29080] cursor-pointer"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCardSlideIndex((prev) => ({
                                          ...prev,
                                          [room.id]:
                                            (currentSlide + 1) % totalSlides,
                                        }))
                                      }
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[2px] bg-[#4A4643]/75 text-white flex items-center justify-center hover:bg-[#A29080] cursor-pointer"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* COLUMN 2: Room Details & Facilities */}
                            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8C8278]">
                                  {isSingleVilla
                                    ? `SINGLE PRIVATE LODGE · บ้านพักระบุหลัง (${room.code})`
                                    : `ROOM CATEGORY (${room.code})`}
                                </span>
                                <h4 className="text-lg sm:text-xl font-bold text-[#4A4643]">
                                  {lang === "th" ? room.nameTh : room.nameEn}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#5C554E]">
                                  <span>ขนาด {room.sizeSqm} ตร.ม.</span>
                                  <span>
                                    · พัก {room.baseGuests}–{room.maxGuests} ท่าน
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#5C554E] leading-relaxed">
                                  {lang === "th"
                                    ? room.shortDescTh
                                    : room.shortDescEn}
                                </p>
                              </div>

                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-[#E6E0D6]">
                                {allFacilities.slice(0, 6).map((item, idx) => {
                                  const { Icon, toneClass } =
                                    getFacilityIconMeta(item, idx);
                                  return (
                                    <li
                                      key={idx}
                                      className="flex items-center gap-2 text-xs text-[#5C554E] min-w-0"
                                    >
                                      <span
                                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}
                                      >
                                        <Icon className="w-3 h-3" />
                                      </span>
                                      <span className="leading-snug">{item}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>

                            {/* COLUMN 3: Sold-Out Lock State + Next Available Date Action */}
                            <div className="lg:col-span-3 flex flex-col justify-between lg:border-l lg:border-[#E6E0D6] lg:pl-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E6E0D6]">
                              <div className="space-y-2 lg:text-right">
                                <span className="inline-block rounded-[2px] bg-[#FDF2F2] border border-[#F5C6C6] text-[#9B2C2C] px-3 py-1 text-xs font-bold">
                                  ✕ ห้องพักนี้เต็มแล้วในวันที่เลือก
                                </span>

                                {st?.conflictDates &&
                                  st.conflictDates.length > 0 && (
                                    <p className="text-xs font-bold text-[#9B2C2C]">
                                      ติดคิวจองคืน:{" "}
                                      {st.conflictDates
                                        .map((d) => formatShortDate(d, lang))
                                        .join(", ")}
                                    </p>
                                  )}

                                <p className="text-[11px] text-[#8C8278] leading-relaxed">
                                  ไม่สามารถกดเปิดหน้าจองสำหรับห้องที่เต็มแล้วได้
                                  เพื่อป้องกันความสับสนและการจองทับวัน
                                </p>
                              </div>

                              <div className="space-y-2 pt-4">
                                {hasOwnActiveHold ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openRoomDrawer(room, "booking")
                                    }
                                    className="w-full rounded-[2px] bg-[#545351] hover:bg-[#4A4643] text-white py-2.5 px-4 text-xs font-bold transition cursor-pointer"
                                  >
                                    ดู QR ชำระเงิน / ปลดล็อคห้อง →
                                  </button>
                                ) : nextAvail ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCheckIn(nextAvail.nextCheckIn);
                                      setCheckOut(nextAvail.nextCheckOut);
                                    }}
                                    className="w-full rounded-[2px] border border-[#A29080] bg-[#FBF9F6] hover:bg-[#A29080] hover:text-white text-[#4A4643] py-2.5 px-4 text-xs font-bold transition cursor-pointer"
                                  >
                                    ว่างอีกครั้ง{" "}
                                    {formatShortDate(
                                      nextAvail.nextCheckIn,
                                      lang
                                    )}{" "}
                                    → กดเปลี่ยนวัน
                                  </button>
                                ) : (
                                  <div className="w-full rounded-[2px] bg-[#F4EFE6] text-[#8C8278] py-2.5 px-4 text-xs font-bold text-center cursor-not-allowed">
                                    ปิดรับจองในวันที่เลือก
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </main>
      )}

      {/* =====================================================================
          SECTION 5: EXCLUSIVE OFFERS & PACKAGES (BG: WARM CREAM #F4EFE6)
          Card Slider with Right-Aligned Previous/Next Controls
      ====================================================================== */}
      {vis.specialOffersSection && (
        <section
          id="offers"
          className="scroll-mt-20 bg-[#F4EFE6] border-y border-[#E6E0D6] py-14 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            {/* Header with Right-Aligned Previous/Next Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#545351]">
                  EXCLUSIVE OFFERS & PACKAGES
                </p>
                <h2 className="text-2xl sm:text-4xl font-light uppercase tracking-[0.08em] text-[#A29080] mt-1">
                  DIRECT BOOKING PRIVILEGES & PACKAGES
                </h2>
                <p className="text-xs sm:text-sm text-[#5C554E] mt-1.5">
                  สิทธิพิเศษและรหัสส่วนลดสำหรับการจองตรง —{" "}
                  <strong className="text-[#4A4643]">
                    คลิกเลือกคูปองเพื่อใช้ลดราคาห้องพักได้ทันที
                  </strong>
                </p>
              </div>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 shrink-0">
                {appliedCouponCode && (
                  <span className="rounded-[2px] bg-[#A29080] text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider">
                    ✓ กำลังใช้คูปอง: {appliedCouponCode}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => scrollCardSlider(offersSliderRef, "left")}
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ก่อนหน้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollCardSlider(offersSliderRef, "right")}
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Card Slider matching TEMPERATURE, ROOMS & SEASONAL PROMOTIONS */}
            <div
              ref={offersSliderRef}
              className="flex items-stretch gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {coupons
                .filter((c) => c.isActive)
                .map((offer) => {
                  const isApplied = appliedCouponCode === offer.code;
                  return (
                    <article
                      key={offer.id}
                      onClick={() => {
                        setCouponInput(offer.code);
                        setAppliedCouponCode(offer.code);
                        const el = document.getElementById("rooms");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`group snap-start shrink-0 w-[300px] sm:w-[350px] relative flex flex-col justify-between rounded-[2px] bg-white/90 backdrop-blur-xs border overflow-hidden transition duration-300 cursor-pointer ${
                        isApplied
                          ? "border-[#A29080] shadow-[0_12px_32px_rgba(162,144,128,0.18)]"
                          : "border-[#E2DAD0] hover:border-[#A29080] hover:shadow-[0_12px_32px_rgba(74,70,67,0.08)]"
                      }`}
                    >
                      <div>
                        <div className="relative h-48 w-full overflow-hidden bg-[#EAE4DC]">
                          <img
                            src={
                              offer.imageUrl ||
                              "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80"
                            }
                            alt={offer.titleTh}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <span className="absolute top-3 left-3 rounded-[2px] bg-[#545351]/90 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                            {offer.badgeTh ||
                              (offer.discountType === "PERCENT"
                                ? `SAVE ${offer.discountValue}%`
                                : `SAVE ฿${offer.discountValue}`)}
                          </span>
                          <span className="absolute top-3 right-3 rounded-[2px] bg-[#A29080] text-white px-2.5 py-1 font-mono text-[11px] font-bold">
                            {offer.code}
                          </span>
                        </div>

                        <div className="p-5 flex flex-col gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A29080]">
                              PROMO CODE · {offer.code}
                            </span>
                            <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug text-[#4A4643] group-hover:text-[#A29080] transition-colors mt-0.5">
                              {offer.titleTh}
                            </h3>
                          </div>

                          <p className="text-xs text-[#5C554E] leading-relaxed line-clamp-2">
                            {offer.descTh ||
                              "รับส่วนลดพิเศษทันทีเมื่อใช้รหัสคูปองนี้ในขั้นตอนการจองห้องพัก"}
                          </p>

                          <div className="pt-3 border-t border-[#E2DAD0] flex items-end justify-between text-xs text-[#5C554E]">
                            <div>
                              <span className="block font-semibold text-[#4A4643]">
                                ยอดจองขั้นต่ำ ฿
                                {offer.minSpendThb.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-[#A29080] font-medium">
                                ใช้ลดเพิ่มในหน้าจองได้ทันที
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-[#8C8278] block">
                                PRIVILEGE
                              </span>
                              <span className="text-lg font-extrabold text-[#4A4643]">
                                {offer.discountType === "PERCENT"
                                  ? `-${offer.discountValue}%`
                                  : `-฿${offer.discountValue.toLocaleString()}`}
                              </span>
                              <span className="text-[10px] text-[#8C8278] block">
                                ส่วนลดพิเศษ
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <footer className="px-5 pb-5">
                        <div
                          className={`w-full rounded-[2px] py-2.5 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-center border transition ${
                            isApplied
                              ? "bg-[#545351] border-[#545351] text-white"
                              : "bg-[#A29080] border-[#A29080] text-white group-hover:bg-[#8E7B6B] group-hover:border-[#8E7B6B]"
                          }`}
                        >
                          {isApplied
                            ? `✓ APPLIED CODE: ${offer.code}`
                            : `APPLY ${offer.code} & SELECT ROOM`}
                        </div>
                      </footer>
                    </article>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 6: DINING & CULINARY JOURNEYS (BG: PURE WHITE #FFFFFF)
          Card Slider with Right-Aligned Previous/Next Controls
      ====================================================================== */}
      {vis.diningSection && (
        <section id="dining" className="scroll-mt-20 bg-white py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            {/* Header with Right-Aligned Previous/Next Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#545351]">
                  DINING & CULINARY JOURNEYS
                </p>
                <h2 className="text-2xl sm:text-4xl font-light uppercase tracking-[0.08em] text-[#A29080] mt-1">
                  CURATED IN-VILLA DINING & LOCAL FLAVOURS
                </h2>
                <p className="text-xs sm:text-sm text-[#5C554E] mt-1.5">
                  ประสบการณ์มื้ออาหารและบริการเสริมสุดพิเศษ —{" "}
                  <strong className="text-[#4A4643]">
                    สามารถเลือกสั่งจองล่วงหน้าพร้อมห้องพักได้ทันที
                  </strong>
                </p>
              </div>

              <div className="ml-auto flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => scrollCardSlider(diningSliderRef, "left")}
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ก่อนหน้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollCardSlider(diningSliderRef, "right")}
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Card Slider matching TEMPERATURE, ROOMS & SEASONAL PROMOTIONS */}
            <div
              ref={diningSliderRef}
              className="flex items-stretch gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {addons
                .filter((a) => a.isActive)
                .map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <article
                      key={addon.id}
                      onClick={() =>
                        setSelectedAddons((prev) =>
                          prev.includes(addon.id)
                            ? prev.filter((id) => id !== addon.id)
                            : [...prev, addon.id]
                        )
                      }
                      className={`group snap-start shrink-0 w-[300px] sm:w-[350px] relative flex flex-col justify-between rounded-[2px] bg-white/90 backdrop-blur-xs border overflow-hidden transition duration-300 cursor-pointer ${
                        isSelected
                          ? "border-[#A29080] shadow-[0_12px_32px_rgba(162,144,128,0.18)]"
                          : "border-[#E2DAD0] hover:border-[#A29080] hover:shadow-[0_12px_32px_rgba(74,70,67,0.08)]"
                      }`}
                    >
                      <div>
                        <div className="relative h-48 w-full overflow-hidden bg-[#EAE4DC]">
                          <img
                            src={
                              addon.imageUrl ||
                              "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
                            }
                            alt={addon.nameTh}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <span className="absolute top-3 left-3 rounded-[2px] bg-[#545351]/90 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                            {addon.category || "IN-VILLA ADD-ON"}
                          </span>
                          <span className="absolute bottom-3 right-3 rounded-[2px] bg-[#545351]/90 px-3 py-1 text-xs font-bold text-white">
                            +฿{addon.priceThb.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-5 flex flex-col gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A29080]">
                              CURATED ADD-ON · {addon.unitTh}
                            </span>
                            <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug text-[#4A4643] group-hover:text-[#A29080] transition-colors mt-0.5">
                              {lang === "th" ? addon.nameTh : addon.nameEn}
                            </h3>
                          </div>

                          <p className="text-xs text-[#5C554E] leading-relaxed line-clamp-2">
                            {lang === "th" ? addon.descTh : addon.descEn}
                          </p>

                          <div className="pt-3 border-t border-[#E2DAD0] flex items-end justify-between text-xs text-[#5C554E]">
                            <div>
                              <span className="block font-semibold text-[#4A4643]">
                                เสิร์ฟถึงบ้านพักส่วนตัว
                              </span>
                              <span className="text-[10px] text-[#A29080] font-medium">
                                {addon.unitTh}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-[#8C8278] block">
                                PRICE
                              </span>
                              <span className="text-lg font-extrabold text-[#4A4643]">
                                ฿{addon.priceThb.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-[#8C8278] block">
                                บริการเสริม
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <footer className="px-5 pb-5">
                        <div
                          className={`w-full rounded-[2px] py-2.5 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-center border transition ${
                            isSelected
                              ? "bg-[#545351] border-[#545351] text-white"
                              : "bg-[#A29080] border-[#A29080] text-white group-hover:bg-[#8E7B6B] group-hover:border-[#8E7B6B]"
                          }`}
                        >
                          {isSelected
                            ? "✓ เพิ่มในรายการจองของคุณแล้ว"
                            : "+ เลือกบริการเสริมนี้ล่วงหน้า"}
                        </div>
                      </footer>
                    </article>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 7: SIGNATURE EXPERIENCES & WELLNESS (BG: WARM CREAM #F4EFE6)
          Card Slider with Right-Aligned Previous/Next Controls
      ====================================================================== */}
      {vis.experiencesSection && (
        <section
          id="experiences"
          className="scroll-mt-20 bg-[#F4EFE6] text-[#4A4643] py-14 sm:py-16 border-y border-[#E6E0D6]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            {/* Header with Right-Aligned Previous/Next Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#545351]">
                  SIGNATURE EXPERIENCES & WELLNESS
                </p>
                <h2 className="text-2xl sm:text-4xl font-light uppercase tracking-[0.08em] text-[#A29080] mt-1">
                  LEISURE, SPA & SANCTUARY MOMENTS
                </h2>
                <p className="text-xs sm:text-sm text-[#5C554E] mt-1.5">
                  การพักผ่อนท่ามกลางสายหมอกและแหล่งท่องเที่ยวรอบหมู่บ้านสะปัน–บ่อเกลือ
                </p>
              </div>

              <div className="ml-auto flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => scrollCardSlider(experiencesSliderRef, "left")}
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ก่อนหน้า</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    scrollCardSlider(experiencesSliderRef, "right")
                  }
                  className="rounded-[2px] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] border bg-white border-[#E2DAD0] text-[#5C554E] hover:border-[#A29080] hover:text-[#4A4643] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Card Slider matching TEMPERATURE, ROOMS & SEASONAL PROMOTIONS */}
            <div
              ref={experiencesSliderRef}
              className="flex items-stretch gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {experiences.map((exp) => (
                <article
                  key={exp.id}
                  className="group snap-start shrink-0 w-[300px] sm:w-[350px] relative flex flex-col justify-between rounded-[2px] bg-white/90 backdrop-blur-xs border border-[#E6E0D6] hover:border-[#A29080] hover:shadow-[0_12px_32px_rgba(74,70,67,0.08)] overflow-hidden transition duration-300"
                >
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-[#EAE4DC]">
                      <img
                        src={exp.imageUrl}
                        alt={exp.titleTh}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="absolute top-3 left-3 rounded-[2px] bg-[#545351]/90 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                        {exp.categoryTh}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A29080]">
                          {exp.categoryTh}
                        </span>
                        <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug text-[#4A4643] group-hover:text-[#A29080] transition-colors mt-0.5">
                          {lang === "th" ? exp.titleTh : exp.titleEn}
                        </h3>
                      </div>

                      <p className="text-xs text-[#5C554E] leading-relaxed line-clamp-2">
                        {lang === "th" ? exp.descTh : exp.descEn}
                      </p>
                    </div>
                  </div>

                  <footer className="px-5 pb-5">
                    <div className="w-full rounded-[2px] border border-[#D8CBB8] bg-[#F4EFE6] text-[#7D6B5C] py-2.5 px-4 text-[11px] font-bold text-center">
                      {exp.highlightTh}
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 8: GUEST REVIEWS (BG: PURE WHITE #FFFFFF)
      ====================================================================== */}
      {vis.galleryAndReviewsSection && (
        <section id="reviews" className="scroll-mt-20 bg-white py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-[#E6E0D6] pb-6 lg:pb-0 lg:pr-6">
                <div className="inline-flex items-center gap-1 text-[#A29080]">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-light text-[#4A4643]">
                    9.6
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A29080]">
                    EXCEPTIONAL · ยอดเยี่ยมมาก
                  </span>
                </div>
                <p className="text-xs text-[#5C554E]">
                  อ้างอิงจากรีวิวผู้เข้าพักจริงที่จองตรงผ่านเว็บไซต์ทางการของรีสอร์ท
                </p>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5 lg:pl-2">
                  <p className="text-xs sm:text-sm text-[#4A4643] italic leading-relaxed">
                    &ldquo;ระบบจองหน้าเว็บใช้งานง่ายมาก เห็นจำนวนห้องว่างรายวันชัดเจนตั้งแต่เลือกวันที่ และเช็คพยากรณ์อากาศล่วงหน้าได้เลย วิลล่าบรรยากาศหรูหราเป็นส่วนตัวมากค่ะ&rdquo;
                  </p>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A29080]">
                    — คุณกมลชนก · เข้าพัก Private Pool Villa
                  </div>
                </div>
                <div className="space-y-2.5 sm:border-l sm:border-[#E6E0D6] sm:pl-6">
                  <p className="text-xs sm:text-sm text-[#4A4643] italic leading-relaxed">
                    &ldquo;ประทับใจตั้งแต่กดจองตรงได้ส่วนลด DIRECT15 แนบสลิปปุ๊บระบบสแกน QR ยืนยันไวมาก ห้องพักและอาหารเช้าดีงามระดับ 5 ดาวครับ&rdquo;
                  </p>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A29080]">
                    — คุณภาคิน · เข้าพัก Panorama Suite
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 9: FOLLOW US · INSTAGRAM 8-TILE MOSAIC (BG: WARM CREAM #F4EFE6)
      ====================================================================== */}
      {vis.galleryAndReviewsSection && (
        <section
          id="instagram"
          className="scroll-mt-20 bg-[#F4EFE6] border-y border-[#E6E0D6] py-14 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#545351]">
                FOLLOW US
              </p>
              <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-light uppercase tracking-[0.14em] text-[#A29080] mt-1.5">
                YOUR SAPAN UNSEEN JOURNEYS
              </h2>
            </div>

            {/* 4x2 Seamless Square Mosaic Grid matching Screenshot 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#E6E0D6]">
              {/* Tile 1: Warm Slate-Grey Editorial Callout Box */}
              <div className="aspect-square bg-[#545351] text-white p-6 sm:p-10 flex flex-col justify-between">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-xl font-normal uppercase tracking-[0.08em] text-white">
                    SAPAN UNSEEN MOMENTS
                  </h3>
                  <div className="space-y-1 text-xs sm:text-sm text-white/90 font-light">
                    <p>Share your memories with</p>
                    <a
                      href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white hover:text-[#D8CBB8] transition font-normal pt-0.5"
                    >
                      <Instagram className="w-4 h-4 shrink-0" />
                      <span>@sapanunseen</span>
                    </a>
                  </div>
                </div>

                <div>
                  <a
                    href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs sm:text-sm uppercase tracking-[0.14em] text-white border-b border-white/80 pb-1 hover:text-[#D8CBB8] hover:border-[#D8CBB8] transition"
                  >
                    SEE MORE
                  </a>
                </div>
              </div>

              {/* Tiles 2–8: 7 Square Lifestyle & Sanctuary Moments */}
              {[
                {
                  url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
                  caption: "Morning pool & mountain breeze @sapanunseen",
                },
                {
                  url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
                  caption: "In-villa private dining & afternoon tea",
                },
                {
                  url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
                  caption: "Refined sanctuary suite interior",
                },
                {
                  url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
                  caption: "Golden hour terrace views",
                },
                {
                  url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
                  caption: "Private pavilion amidst lush greenery",
                },
                {
                  url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
                  caption: "Timeless architectural serenity",
                },
                {
                  url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
                  caption: "Misty valley pathways & nature walk",
                },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden bg-[#EAE4DC] block"
                >
                  <img
                    src={item.url}
                    alt={item.caption}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4 space-y-1">
                      <Instagram className="w-6 h-6 mx-auto" />
                      <span className="block text-[11px] tracking-wider uppercase">
                        @sapanunseen
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 10: GOOGLE MAP, RESORT CONTACT & EXPLORE NEARBY (BG: PURE WHITE #FFFFFF)
      ====================================================================== */}
      {vis.policiesAndLocationSection && (
        <section
          id="location-map"
          className="scroll-mt-20 bg-white py-14 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-light uppercase tracking-[0.14em] text-[#A29080] leading-snug">
                IMMERSE YOURSELF IN MISTY MOUNTAINS, LOCAL FLAVOURS AND CULTURE
              </h2>
            </div>

            {/* Split Map (Left 7 Cols) + Contact & Explore Nearby Card (Right 5 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E6E0D6]">
              {/* Left: Embedded Interactive Google Map */}
              <div className="lg:col-span-7 xl:col-span-8 relative min-h-[380px] sm:min-h-[480px] bg-[#EAE4DC]">
                <iframe
                  title="Resort Google Map"
                  src={`https://maps.google.com/maps?q=${propertyConfig.latitude},${propertyConfig.longitude}&hl=${lang}&z=14&output=embed`}
                  className="w-full h-full min-h-[380px] sm:min-h-[480px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href="https://maps.app.goo.gl/oGkpxrTD2C2pmeWf6?g_st=ic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 right-4 h-10 px-3.5 bg-white/95 hover:bg-white text-[#4A4643] border border-[#E6E0D6] shadow-sm text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#A29080]" />
                  <span>ขยายแผนที่ Google Maps</span>
                </a>
              </div>

              {/* Right: Resort Contact Details + GPS + EXPLORE NEARBY Accordions */}
              <div className="lg:col-span-5 xl:col-span-4 p-7 sm:p-10 flex flex-col justify-between bg-[#FBF9F6] lg:border-l border-[#E6E0D6] space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-light text-[#A29080] leading-snug">
                    {lang === "th"
                      ? propertyConfig.nameTh
                      : propertyConfig.nameEn}
                  </h3>

                  <div className="space-y-2.5 text-xs sm:text-sm text-[#5C554E]">
                    <p className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-[#A29080] shrink-0" />
                      <a
                        href={`tel:${propertyConfig.phones[0]}`}
                        className="underline decoration-[#A29080]/60 underline-offset-4 hover:text-[#A29080] transition"
                      >
                        {propertyConfig.phones.join(" , ")}
                      </a>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-[#A29080] shrink-0" />
                      <a
                        href={`mailto:${propertyConfig.email}`}
                        className="underline decoration-[#A29080]/60 underline-offset-4 hover:text-[#A29080] transition"
                      >
                        {propertyConfig.email}
                      </a>
                    </p>
                    <p className="flex items-start gap-2.5 pt-1">
                      <MapPin className="w-4 h-4 text-[#4A4643] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        {lang === "th"
                          ? propertyConfig.locationTh
                          : propertyConfig.locationEn}
                      </span>
                    </p>
                  </div>

                  <div className="pt-1 space-y-1 text-xs sm:text-sm">
                    <p className="text-[#5C554E]">
                      <strong className="uppercase tracking-wider text-[11px] text-[#4A4643]">
                        GPS:
                      </strong>{" "}
                      {propertyConfig.latitude.toFixed(6)},
                      {propertyConfig.longitude.toFixed(6)}
                    </p>
                    <p>
                      <a
                        href="https://maps.app.goo.gl/oGkpxrTD2C2pmeWf6?g_st=ic"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#A29080] underline decoration-[#A29080] underline-offset-4 hover:text-[#8E7B6B] font-medium"
                      >
                        <span>Open Google Map</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* EXPLORE NEARBY Accordion matching Screenshot 2 */}
                <div className="space-y-2 pt-4 border-t border-[#E6E0D6]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#545351] mb-3">
                    EXPLORE NEARBY
                  </p>

                  {[
                    {
                      id: "shopping" as const,
                      title: "Cafes & Local Dining (คาเฟ่และร้านอาหารแนะนำ)",
                      pinColor: "text-[#3D4B5C]",
                      items: [
                        "หยุดเวลา คาเฟ่ (Yood Wela Cafe) — จุดชมวิวหมู่บ้านสะปันมุมสูง (5 นาที)",
                        "หลงเขา คาเฟ่ (Lhong Khao Cafe) — คาเฟ่ริมลำธารท่ามกลางขุนเขา (7 นาที)",
                        "ถนนคนเดินสะปัน & ตลาดเช้าชุมชน — อาหารพื้นเมืองและของฝาก (5 นาที)",
                      ],
                    },
                    {
                      id: "attractions" as const,
                      title: "Tourist Attractions (สถานที่ท่องเที่ยวยอดฮิต)",
                      pinColor: "text-[#8B3A3A]",
                      items: [
                        "น้ำตกสะปัน & สะพานแขวน — เส้นทางเดินศึกษาธรรมชาติสุดร่มรื่น (5 นาที)",
                        "วัดสะปัน — จุดชมทะเลหมอกยามเช้าเหนือหุบเขาและลำน้ำว้า (6 นาที)",
                        "บ่อเกลือสินเธาว์ภูเขาโบราณ อ.บ่อเกลือ — มรดกทางวัฒนธรรมกว่า 800 ปี (15 นาที)",
                      ],
                    },
                    {
                      id: "transportation" as const,
                      title: "Transportation (การเดินทางมายังที่พัก)",
                      pinColor: "text-[#A29080]",
                      items: [
                        "เดินทางด้วยรถยนต์ส่วนตัวผ่านถนนลอยฟ้า 1081 / 1256 (รถเก๋งเล็กสามารถขึ้นได้สะดวก)",
                        "ท่าอากาศยานน่านนคร (NNN) — ใช้เวลาเดินทางผ่านเส้นทางชมวิวประมาณ 1 ชม. 45 นาที",
                        "มีลานจอดรถส่วนตัวภายในบริเวณที่พัก พร้อมเจ้าหน้าที่ดูแลและช่วยยกสัมภาระ",
                      ],
                    },
                  ].map((cat) => {
                    const isOpen = openNearbyCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className="border-b border-[#E6E0D6] py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenNearbyCategory(isOpen ? null : cat.id)
                          }
                          className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-sm font-bold text-[#4A4643] hover:text-[#A29080] transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <MapPin
                              className={`w-4 h-4 shrink-0 ${cat.pinColor}`}
                            />
                            <span>{cat.title}</span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#5C554E] transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <ul className="mt-2.5 pl-6 space-y-1.5 text-xs text-[#5C554E] leading-relaxed">
                            {cat.items.map((line, i) => (
                              <li key={i} className="list-disc">
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 11: FREQUENTLY ASKED QUESTIONS / คำถามที่พบบ่อย (BG: WARM CREAM #F4EFE6)
      ====================================================================== */}
      <section
        id="faqs"
        className="scroll-mt-20 bg-[#F4EFE6] border-t border-[#E6E0D6] py-14 sm:py-20"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-light uppercase tracking-[0.14em] text-[#A29080]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-xs sm:text-sm text-[#6E675F] mt-2">
              คำถามที่พบบ่อยเกี่ยวกับการเข้าพัก สภาพอากาศ และการสำรองห้องพักโดยตรง
            </p>
          </div>

          <div className="border-t border-[#E6E0D6] divide-y divide-[#E6E0D6]">
            {[
              {
                q: "ช่วงเดือนไหนเหมาะแก่การมาพักผ่อนและชมทะเลหมอกที่สุด?",
                a: "สามารถมาพักผ่อนได้ตลอดทั้งปี โดยแบ่งเป็น 3 ช่วงไฮไลท์: (1) พฤศจิกายน–กุมภาพันธ์ คือช่วงฤดูหนาว อากาศเย็นจัด 12°C–24°C และมีทะเลหมอกหนาแน่นทุกเช้า (2) กรกฎาคม–ตุลาคม คือช่วง Green Season ทุ่งนาขั้นบันไดและขุนเขาเขียวขจีที่สุด พร้อมสายหมอกฟุ้งหลังฝนตก และ (3) มีนาคม–มิถุนายน บรรยากาศเงียบสงบเป็นส่วนตัวพร้อมโปรโมชั่นราคาพิเศษ ทั้งนี้คุณสามารถเช็คพยากรณ์อากาศสดล่วงหน้า 14 วันได้ที่ตารางสภาพอากาศด้านบนของเว็บไซต์",
              },
              {
                q: "ห้องพักของที่พักมีรูปแบบไหนบ้าง มาเป็นคู่รักหรือครอบครัวควรเลือกห้องไหน?",
                a: "เรารองรับทั้งรูปแบบบ้านพักพูลวิลล่าส่วนตัวเป็นหลัง (Single Private Villa เช่น V1, V2) ที่มอบความเป็นส่วนตัวสูงสุด และห้องพักแบบพาโนรามาสูท/ดีลักซ์ (Suite & Deluxe) สำหรับคู่รักหรือครอบครัว โดยทุกยูนิตแสดงจำนวนห้องว่างรายวันแบบเรียลไทม์บนแถบเลือกวันที่ด้านบน",
              },
              {
                q: "ราคาห้องพักรวมอาหารเช้าแล้วหรือไม่ และมีบริการชุดหมูกระทะหรือดินเนอร์เสิร์ฟถึงห้องไหม?",
                a: "ราคาห้องพักทุกเรทบนเว็บไซต์รวมเซ็ตอาหารเช้าสำหรับจำนวนผู้เข้าพักมาตรฐานเรียบร้อยแล้ว และผู้เข้าพักสามารถเลือกสั่งจองบริการเสริม (เช่น ชุดหมูกระทะพรีเมียมริมระเบียง, ชุด Afternoon Tea หรือบริการสปา) ล่วงหน้าในขั้นตอนการจองห้องพักได้ทันที",
              },
              {
                q: "ขั้นตอนการจองตรงผ่านเว็บไซต์และการล็อคห้องพัก 15 นาทีทำงานอย่างไร?",
                a: "เมื่อคุณเลือกวันเข้าพักและกดจองห้องที่ต้องการ ระบบจะล็อคห้องพักให้คุณชั่วคราวเป็นเวลา 15 นาที พร้อมสร้าง QR PromptPay ตามยอดสุทธิ เมื่อโอนเงินและแนบรูปสลิป ระบบจะสแกนตรวจสอบ QR บนสลิปอัตโนมัติเพื่อยืนยันการจองอย่างรวดเร็วโดยไม่ต้องรอแอดมินตอบแชท",
              },
              {
                q: "สามารถขอเสริมเตียงสำหรับผู้เข้าพักเพิ่ม หรือพาเด็กเข้าพักได้หรือไม่?",
                a: "เด็กอายุ 0–6 ปี สามารถเข้าพักร่วมเตียงกับผู้ปกครองได้ฟรี สำหรับผู้เข้าพักที่เกินจากจำนวนมาตรฐานของห้องพัก สามารถเพิ่มเตียงเสริมพร้อมอาหารเช้าได้ (ระบบจะคำนวณค่าบริการเตียงเสริมให้อัตโนมัติตามจำนวนผู้เข้าพักที่คุณเลือก)",
              },
              {
                q: "เส้นทางการเดินทางมายังที่พักเป็นอย่างไร รถเก๋งเล็กสามารถขับมาได้ไหม?",
                a: "ถนนสายหลักสู่ที่พักเป็นถนนลาดยางตลอดสาย รถเก๋งขนาดเล็กและรถยนต์ทั่วไปสามารถขับเดินทางมาได้สะดวก มีป้ายบอกทางชัดเจนและสามารถกดปุ่ม Open Google Map ในหมวดแผนที่ด้านบนเพื่อนำทางมายังลานจอดรถส่วนตัวของรีสอร์ทได้ทันที",
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4 sm:py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-[15px] font-bold text-[#4A4643] group-hover:text-[#A29080] transition-colors">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#A29080] transition-transform duration-300 shrink-0 ${
                        isOpen ? "rotate-180 text-[#4A4643]" : "group-hover:text-[#4A4643]"
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      transitionProperty: "grid-template-rows, opacity",
                      transitionDuration: "300ms",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="pt-3 pr-4 sm:pr-6 text-xs sm:text-sm text-[#5C554E] leading-relaxed">
                        <p>{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 11: ANANTARA PROFESSIONAL LUXURY FOOTER (SCREENSHOT 4)
          Uses warm slate-grey bg-[#4A4946] — zero #231F20!
      ====================================================================== */}
      <footer
        id="policies"
        className="scroll-mt-20 bg-[#4A4946] text-[#F4EFE6] border-t border-white/15"
      >
        {/* Upper Tier: 3 Navigation Columns + Newsletter Box */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* 3 Link Columns on Left (7 Cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs sm:text-[13px]">
              <div className="space-y-3">
                <p className="font-bold uppercase tracking-[0.16em] text-white text-xs">
                  About Sanctuary
                </p>
                <ul className="space-y-2.5 text-white/80 font-light">
                  <li>
                    <a
                      href="#overview"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Overview & Story
                    </a>
                  </li>
                  <li>
                    <a
                      href="#rooms"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Villas & Suites
                    </a>
                  </li>
                  <li>
                    <a
                      href="#story-weather"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Live Weather & Seasons
                    </a>
                  </li>
                  <li>
                    <a
                      href="#offers"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Best Rate Guarantee
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowDesignSystem(true)}
                      className="hover:text-[#D8CBB8] transition cursor-pointer text-left"
                    >
                      Design Standards
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="font-bold uppercase tracking-[0.16em] text-white text-xs">
                  Experiences & Dining
                </p>
                <ul className="space-y-2.5 text-white/80 font-light">
                  <li>
                    <a
                      href="#offers"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Special Offers
                    </a>
                  </li>
                  <li>
                    <a
                      href="#dining"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      In-Villa Dining & Add-ons
                    </a>
                  </li>
                  <li>
                    <a
                      href="#experiences"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Spa & Wellness
                    </a>
                  </li>
                  <li>
                    <a
                      href="#location-map"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Location & Google Map
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#D8CBB8] transition inline-flex items-center gap-1.5"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span>@sapanunseen</span>
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 col-span-2 sm:col-span-1">
                <p className="font-bold uppercase tracking-[0.16em] text-white text-xs">
                  Direct Privileges
                </p>
                <ul className="space-y-2.5 text-white/80 font-light">
                  <li>
                    <a
                      href="#faqs"
                      className="hover:text-[#D8CBB8] transition"
                    >
                      FAQs (คำถามที่พบบ่อย)
                    </a>
                  </li>
                  <li>
                    <span className="text-white/75">
                      Check-in: {propertyConfig.checkInTime}
                    </span>
                  </li>
                  <li>
                    <span className="text-white/75">
                      Check-out: {propertyConfig.checkOutTime}
                    </span>
                  </li>
                  <li>
                    <a
                      href={`tel:${propertyConfig.phones[0]}`}
                      className="hover:text-[#D8CBB8] transition"
                    >
                      Tel: {propertyConfig.phones[0]}
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/admin"
                      className="text-[#D8CBB8] hover:text-white font-normal underline underline-offset-4 transition"
                    >
                      Admin PMS Backoffice ({pendingAdminCount})
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Newsletter Subscription Box on Right (5 Cols) matching Screenshot 4 */}
            <div className="lg:col-span-5 flex flex-col lg:items-end justify-start">
              <div className="w-full max-w-md space-y-2.5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.trim()) {
                      setNewsletterSubscribed(true);
                      setNewsletterEmail("");
                    }
                  }}
                  className="flex items-center border border-white/35 bg-transparent h-12 px-4 focus-within:border-[#D8CBB8] transition"
                >
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Subscribe to newsletter / รับข่าวสารโปรโมชั่นพิเศษ"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-white/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="text-[#D8CBB8] hover:text-white pl-3 transition cursor-pointer"
                  >
                    ▶
                  </button>
                </form>
                {newsletterSubscribed && (
                  <p className="text-xs text-[#D8CBB8]">
                    ✓ ขอบคุณที่ติดตามข่าวสารและสิทธิพิเศษสำหรับการจองตรงจากทางรีสอร์ท
                  </p>
                )}
                <div className="pt-2 flex items-center justify-between text-[11px] text-white/65">
                  <span>LINE Official: {propertyConfig.lineId}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLang("th")}
                      className={`uppercase cursor-pointer ${
                        lang === "th"
                          ? "text-white font-bold underline underline-offset-4"
                          : "hover:text-white"
                      }`}
                    >
                      TH
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setLang("en")}
                      className={`uppercase cursor-pointer ${
                        lang === "en"
                          ? "text-white font-bold underline underline-offset-4"
                          : "hover:text-white"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Tier: Framed Luxury Hospitality Collection Showcase Box matching Screenshot 4 */}
        <div className="border-t border-white/15 py-10 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-[11px] sm:text-xs text-white/80 font-light tracking-wide">
              {propertyConfig.nameEn} is an Official Direct-Booking Sanctuary.
              Rewarding every journey with verified room availability and
              seasonal privileges.
            </p>

            {/* Framed Partner / Collection Emblem Box */}
            <div className="relative border border-white/20 px-6 py-8 sm:px-10 sm:py-9">
              <div className=" -mt-12 mb-5 flex justify-center">
                <span className="bg-[#4A4946] px-5 text-sm sm:text-base font-bold uppercase tracking-[0.28em] text-white">
                  {propertyConfig.brandCode} · HOSPITALITY COLLECTION
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center text-white/85">
                <div className="text-center">
                  <span className="block text-xs font-serif tracking-[0.22em] uppercase">
                    SAPAN UNSEEN
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    MOUNTAIN SANCTUARY
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-light tracking-[0.22em] uppercase">
                    AURELIA
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    RIVERSIDE VILLAS
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-semibold tracking-[0.2em] uppercase">
                    HORIZON
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    PRIVATE POOL VILLAS
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-light tracking-[0.24em] uppercase">
                    BOTANICA
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    SPA & WELLNESS
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-serif tracking-[0.18em] uppercase">
                    SPICE SPOONS
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    CULINARY JOURNEYS
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-semibold tracking-[0.18em] uppercase">
                    DIRECT
                  </span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/55 uppercase mt-0.5">
                    PRIVILEGE CLUB
                  </span>
                </div>
              </div>

              <div className="-mb-12 mt-6 flex justify-center">
                <span className="bg-[#4A4946] px-5 text-xs font-semibold uppercase tracking-[0.25em] text-[#D8CBB8]">
                  SANCTUARY &nbsp;|&nbsp; DISCOVERY
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Legal Bar */}
        <div className="border-t border-white/15 py-5 px-4 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/65">
            <div>
              © 2026 {propertyConfig.nameEn}. All Rights Reserved.
            </div>
            <div className="text-xs font-semibold tracking-[0.22em] uppercase text-white/85">
              OFFICIAL DIRECT BOOKING
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="#faqs" className="hover:text-white transition">
                Legal Notice
              </a>
              <a href="#faqs" className="hover:text-white transition">
                Privacy Policy
              </a>
              <a href="#faqs" className="hover:text-white transition">
                Cookie Policy
              </a>
              <a href="#faqs" className="hover:text-white transition">
                Terms and Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          SLIDE-OVER SIDEBAR (EditSidebar Style) WITH SMOOTH SLIDER ANIMATION
          Includes Night-by-Night Seasonal/Special Date Rate Breakdown!
      ====================================================================== */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-[#4A4946]/65 backdrop-blur-xs"
          onClick={() => setActiveRoom(null)}
        />

        <aside
          className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl border-l border-[#E2DAD0] flex flex-col transition-transform duration-300 ease-out ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {sidebarRoom && (
            <>
              {/* =============================================================
                  1. STICKY NAVBAR: Check-in / Check-out Dates, Times & Nights
                     (Matches Reference Image 3)
              ============================================================== */}
              <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E6E0D6] bg-white px-4 sm:px-5 py-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (drawerTab === "booking" && !activeHoldBooking) {
                      setDrawerTab("details");
                    } else {
                      setActiveRoom(null);
                    }
                  }}
                  aria-label="Back"
                  className="h-9 w-9 rounded-[2px] border border-[#E2DAD0] hover:bg-[#F4EFE6] flex items-center justify-center text-[#4A4643] transition cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Center Rounded Card matching Image 3: Check-in -> Check-out | Nights */}
                <div className="flex-1 max-w-md bg-white px-5 flex items-center justify-between gap-1">
                  <div className="text-left min-w-0">
                    <span className="block text-[11px] text-[#6E675F] leading-tight">
                      Check-in
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-[#2C2A29] leading-snug truncate">
                      {formatNavbarDateCard(checkIn, lang)}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-[#2C2A29] shrink-0">
                    →
                  </span>

                  <div className="text-left min-w-0">
                    <span className="block text-[11px] text-[#6E675F] leading-tight">
                      Check-out
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-[#2C2A29] leading-snug truncate">
                      {formatNavbarDateCard(checkOut, lang)}
                    </span>
                  </div>

                  <div className="text-center pl-2 shrink-0">
                    <span className="block text-sm sm:text-base font-bold text-[#2C2A29] leading-tight">
                      {nights}
                    </span>
                    <span className="block text-[11px] text-[#6E675F] leading-tight">
                      {lang === "th"
                        ? "คืน"
                        : nights === 1
                        ? "night"
                        : "nights"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  aria-label="Close sidebar"
                  className="h-9 w-9 rounded-[2px] border border-[#E2DAD0] hover:bg-[#F4EFE6] flex items-center justify-center text-[#4A4643] transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* =============================================================
                  2. TOP BADGE: Live Price Guarantee Countdown Notification
              ============================================================== */}
              <div className="shrink-0 bg-[#FFF8EB] border-b border-[#E5C99B] px-4 sm:px-5 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#A29080] shrink-0" />
                  <p className="text-[11px] sm:text-xs font-semibold text-[#4A4643] truncate">
                    <strong className="uppercase tracking-wider text-[#8C5E1A]">
                      Price is Guaranteed
                    </strong>{" "}
                    · การันตีเรทราคานี้ให้คุณภายในเวลาที่กำหนด
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#4A4643] text-white px-2.5 py-0.5 font-mono text-xs font-bold shrink-0">
                  <Timer className="w-3 h-3 text-[#E5C99B]" />
                  <span>
                    {String(Math.floor(priceGuaranteeSeconds / 60)).padStart(
                      2,
                      "0"
                    )}
                    :{String(priceGuaranteeSeconds % 60).padStart(2, "0")}
                  </span>
                </span>
              </div>

              {/* =============================================================
                  SIDEBAR VIEWPORT WITH 2 INDEPENDENT SCROLLABLE SLIDE PANELS
                  Prevents blank screen & horizontal scroll bleed when switching tabs!
              ============================================================== */}
              <div className="flex-1 relative overflow-hidden bg-white">
                {/* =========================================================
                    SLIDE 1: FULL-BLEED PHOTO SLIDER + FACILITY ICONS + RATES
                ========================================================== */}
                <div
                  ref={sidebarScrollRef}
                  className={`absolute inset-0 overflow-y-auto overflow-x-hidden bg-white flex flex-col transition-transform duration-300 ease-out ${
                    drawerTab === "details"
                      ? "translate-x-0"
                      : "-translate-x-full pointer-events-none"
                  }`}
                >
                  {/* 3. EDGE-TO-EDGE PHOTO SLIDER (Zero Margin at Edges + Bottom-Right Counter) */}
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#EAE4DC]">
                      <div
                        className="flex h-full w-full transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${drawerSlideIndex * 100}%)`,
                        }}
                      >
                        {sidebarRoom.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.captionTh || sidebarRoom.nameTh}
                            className="h-full w-full shrink-0 object-cover"
                          />
                        ))}
                      </div>

                      {sidebarRoom.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDrawerSlideIndex(
                                (prev) =>
                                  (prev - 1 + sidebarRoom.images.length) %
                                  sidebarRoom.images.length
                              )
                            }
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[2px] bg-white/90 hover:bg-white text-[#4A4643] shadow-md flex items-center justify-center transition cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDrawerSlideIndex(
                                (prev) => (prev + 1) % sidebarRoom.images.length
                              )
                            }
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[2px] bg-white/90 hover:bg-white text-[#4A4643] shadow-md flex items-center justify-center transition cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      {/* Image Count Pill at Bottom-Right Corner (e.g. 1/4) */}
                      <div className="absolute bottom-3 right-3 rounded-[2px] bg-[#4A4643]/85 backdrop-blur-xs px-3 py-1 text-xs font-bold text-white tracking-wider">
                        {drawerSlideIndex + 1}/{sidebarRoom.images.length}
                      </div>
                    </div>

                    {/* Content Body Below Full-Bleed Image */}
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Header Title, Stars & Availability Callout */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-block rounded-[2px] bg-[#A29080] text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                            {(sidebarRoom.inventoryMode || "SINGLE_UNIT") ===
                            "SINGLE_UNIT"
                              ? "Private Villa · บ้านเดี่ยวส่วนตัว"
                              : `ว่าง ${
                                  roomStatusMap[sidebarRoom.id]
                                    ?.availableUnits ?? 0
                                } / ${sidebarRoom.totalUnits} ห้อง`}
                          </span>

                          <div className="inline-flex items-center gap-1.5">
                            <span className="rounded-[2px] bg-[#A29080] text-white px-2 py-0.5 text-xs font-bold">
                              9.6
                            </span>
                            <span className="text-xs font-bold text-[#A29080]">
                              Exceptional
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-[#4A4643]">
                              {lang === "th"
                                ? sidebarRoom.nameTh
                                : sidebarRoom.nameEn}
                            </h3>
                            <div className="inline-flex items-center gap-0.5 text-[#C87D32]">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                          </div>
                          <p className="text-xs text-[#5C554E] mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#A29080] shrink-0" />
                            <span>
                              {lang === "th"
                                ? propertyConfig.locationTh
                                : propertyConfig.locationEn}
                            </span>
                          </p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 text-xs sm:text-sm text-[#5C554E] leading-relaxed pt-1">
                          {sidebarRoom.longDescTh.map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </div>

                      {/* 4A. TOP REASONS FOR BOOKING (With Circular Pastel Icons) */}
                      <div className="pt-5 border-t border-[#E6E0D6] space-y-4">
                        <h4 className="text-base font-bold text-[#4A4643]">
                          จุดเด่นของห้องพักนี้ (Top reasons for booking)
                        </h4>

                        <div className="space-y-3.5">
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-[#F9EAEA] text-[#4A4643] flex items-center justify-center shrink-0">
                              <BedDouble className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#4A4643]">
                                ความสะดวกสบายและคุณภาพเตียงนอนระดับพรีเมียม
                              </p>
                              <p className="text-xs text-[#5C554E] flex items-center gap-1.5 mt-0.5">
                                <ThumbsUp className="w-3.5 h-3.5 text-[#2E7D32] fill-current shrink-0" />
                                <span>
                                  98% ของผู้เข้าพักประทับใจความสบายของห้องพัก
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-[#F7F2DC] text-[#4A4643] flex items-center justify-center shrink-0">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#4A4643]">
                                พื้นที่ใช้สอยกว้างขวาง {sidebarRoom.sizeSqm}{" "}
                                ตร.ม. พร้อมระเบียงชมวิวส่วนตัว
                              </p>
                              <p className="text-xs text-[#5C554E] flex items-center gap-1.5 mt-0.5">
                                <ThumbsUp className="w-3.5 h-3.5 text-[#2E7D32] fill-current shrink-0" />
                                <span>
                                  รองรับผู้เข้าพักมาตรฐาน{" "}
                                  {sidebarRoom.baseGuests} ท่าน (สูงสุด{" "}
                                  {sidebarRoom.maxGuests} ท่าน)
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-[#E8F4E5] text-[#4A4643] flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#4A4643]">
                                สะอาดไร้ที่ติ พร้อมบริการอาหารเช้าเสิร์ฟถึงที่พัก
                              </p>
                              <p className="text-xs text-[#5C554E] flex items-center gap-1.5 mt-0.5">
                                <ThumbsUp className="w-3.5 h-3.5 text-[#2E7D32] fill-current shrink-0" />
                                <span>
                                  100% ของผู้เข้าพักให้คะแนนความคุ้มค่าสูงสุด
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4B. ROOM FACILITIES WITH ICONS (สิ่งอำนวยความสะดวกพร้อมไอคอน) */}
                      <div className="pt-5 border-t border-[#E6E0D6] space-y-4">
                        <h4 className="text-base font-bold text-[#4A4643]">
                          สิ่งอำนวยความสะดวกในห้องพัก ({sidebarRoom.code}{" "}
                          Facilities)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            ...sidebarRoom.amenities.outdoor,
                            ...sidebarRoom.amenities.dining,
                            ...sidebarRoom.amenities.common,
                          ].map((item, idx) => {
                            const { Icon, toneClass } = getFacilityIconMeta(
                              item,
                              idx
                            );
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-3 py-1"
                              >
                                <div
                                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-[#4A4643] leading-snug">
                                  {item}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4C. NIGHT-BY-NIGHT SEASONAL & SPECIAL RATE BREAKDOWN + ADD-ONS */}
                      <div className="pt-5 border-t border-[#E6E0D6] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-base font-bold text-[#4A4643]">
                            รายละเอียดราคารายคืน ({nights} คืน:{" "}
                            {formatShortDate(checkIn, lang)} –{" "}
                            {formatShortDate(checkOut, lang)})
                          </h4>
                          {sidebarRoom.discountPercent > 0 && (
                            <span className="rounded-[2px] bg-[#A29080] text-white px-2.5 py-0.5 text-[11px] font-bold">
                              SAVE {sidebarRoom.discountPercent}%
                            </span>
                          )}
                        </div>

                        <div className="divide-y divide-[#E6E0D6] border-y border-[#E6E0D6] text-xs">
                          {activePricing.nightlyBreakdown.map((nItem) => {
                            const isNightBooked =
                              roomStatusMap[
                                sidebarRoom.id
                              ]?.conflictDates?.includes(nItem.dateStr) ??
                              false;
                            return (
                              <div
                                key={nItem.dateStr}
                                className="py-2.5 flex items-center justify-between gap-2"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-[#4A4643]">
                                    คืน {formatShortDate(nItem.dateStr, lang)}
                                  </span>
                                  <span className="text-[11px] text-[#A29080] font-medium">
                                    ({nItem.rateLabelTh})
                                  </span>
                                  {isNightBooked ? (
                                    <span className="rounded-[2px] bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6] px-2 py-0.5 text-[10px] font-bold">
                                      เต็มคืนนี้
                                    </span>
                                  ) : (
                                    <span className="rounded-[2px] bg-[#F1F8F4] text-[#2E6B47] px-2 py-0.5 text-[10px] font-bold">
                                      ว่าง
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-[#4A4643]">
                                  ฿{nItem.finalNightlyRate.toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Multi-Unit Quantity Selector if ROOM_TYPE */}
                        {(sidebarRoom.totalUnits ?? 1) > 1 &&
                          (roomStatusMap[sidebarRoom.id]?.availableUnits ?? 0) >
                            1 && (
                            <div className="flex items-center justify-between pt-2 text-xs">
                              <span className="font-bold text-[#4A4643]">
                                จำนวนห้องที่ต้องการจอง (ว่าง{" "}
                                {roomStatusMap[sidebarRoom.id]?.availableUnits}{" "}
                                ห้อง):
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnitsToBook((u) => Math.max(1, u - 1))
                                  }
                                  className="h-8 w-8 rounded-[2px] border border-[#A29080] font-bold cursor-pointer hover:bg-[#F4EFE6]"
                                >
                                  −
                                </button>
                                <span className="font-extrabold text-sm px-2">
                                  {unitsToBook} ห้อง
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnitsToBook((u) =>
                                      Math.min(
                                        roomStatusMap[sidebarRoom.id]
                                          ?.availableUnits ?? 1,
                                        u + 1
                                      )
                                    )
                                  }
                                  className="h-8 w-8 rounded-[2px] border border-[#A29080] font-bold cursor-pointer hover:bg-[#F4EFE6]"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                        {/* Optional Add-ons (Visual Upsell with Photos — Unboxed Editorial Style) */}
                        <div className="pt-5 border-t border-[#E6E0D6] space-y-4">
                          <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A29080] block">
                                ENHANCE YOUR STAY · IN-VILLA UPSELL
                              </span>
                              <h4 className="text-base font-bold text-[#4A4643] mt-0.5">
                                บริการเสริมพิเศษเสิร์ฟถึงห้องพัก (เลือกเพิ่มได้)
                              </h4>
                              <p className="text-xs text-[#5C554E] mt-0.5">
                                สั่งจองล่วงหน้าพร้อมห้องพัก เพื่อความสะดวกสบายสูงสุดเมื่อเช็คอิน
                              </p>
                            </div>
                            {selectedAddons.length > 0 && (
                              <span className="rounded-[2px] bg-[#F1F8F4] text-[#2E6B47] px-2.5 py-1 text-xs font-bold">
                                ✓ เลือกแล้ว {selectedAddons.length} รายการ (+฿
                                {activePricing.addonsTotal.toLocaleString()})
                              </span>
                            )}
                          </div>

                          <div className="divide-y divide-[#E6E0D6] border-y border-[#E6E0D6]">
                            {addons
                              .filter((a) => a.isActive)
                              .map((addon, idx) => {
                                const checked = selectedAddons.includes(
                                  addon.id
                                );
                                const isPopular = idx === 0 || idx === 1;
                                return (
                                  <div
                                    key={addon.id}
                                    onClick={() =>
                                      setSelectedAddons((prev) =>
                                        prev.includes(addon.id)
                                          ? prev.filter((id) => id !== addon.id)
                                          : [...prev, addon.id]
                                      )
                                    }
                                    className={`group py-4 px-2 -mx-2 rounded-[2px] flex items-start sm:items-center gap-4 transition cursor-pointer ${
                                      checked
                                        ? "bg-[#FBF8F3]"
                                        : "hover:bg-[#FAF7F2]/60"
                                    }`}
                                  >
                                    {/* Appetizing Add-on Photo */}
                                    <div className="relative w-24 h-24 sm:w-32 sm:h-24 rounded-[2px] overflow-hidden bg-[#EAE4DC] shrink-0">
                                      <img
                                        src={
                                          addon.imageUrl ||
                                          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
                                        }
                                        alt={addon.nameTh}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      />
                                      {isPopular && (
                                        <span className="absolute top-1.5 left-1.5 rounded-[2px] bg-[#B85D43] text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                          RECOMMENDED
                                        </span>
                                      )}
                                      {checked && (
                                        <div className="absolute inset-0 bg-[#4A4643]/25 flex items-center justify-center">
                                          <span className="h-7 w-7 rounded-full bg-[#A29080] text-white flex items-center justify-center shadow-sm">
                                            <Check className="w-4 h-4" />
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Add-on Info & Action */}
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A29080]">
                                            {addon.category === "SPA"
                                              ? "OUTDOOR BATHTUB & SPA"
                                              : "IN-VILLA DINING"}
                                          </span>
                                        </div>
                                        <h5 className="text-xs sm:text-sm font-bold text-[#4A4643] group-hover:text-[#A29080] transition-colors leading-snug">
                                          {lang === "th"
                                            ? addon.nameTh
                                            : addon.nameEn}
                                        </h5>
                                        <p className="text-[11px] sm:text-xs text-[#5C554E] leading-relaxed line-clamp-2">
                                          {lang === "th"
                                            ? addon.descTh
                                            : addon.descEn}
                                        </p>
                                      </div>

                                      {/* Price & Toggle Button */}
                                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-1 sm:pt-0">
                                        <div className="sm:text-right">
                                          <span className="text-sm sm:text-base font-extrabold text-[#B85D43] block leading-tight">
                                            +฿{addon.priceThb.toLocaleString()}
                                          </span>
                                          <span className="text-[10px] text-[#8C8278] block">
                                            {lang === "th"
                                              ? addon.unitTh
                                              : addon.unitEn}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAddons((prev) =>
                                              prev.includes(addon.id)
                                                ? prev.filter(
                                                    (id) => id !== addon.id
                                                  )
                                                : [...prev, addon.id]
                                            );
                                          }}
                                          className={`rounded-[2px] px-3 py-1.5 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                                            checked
                                              ? "bg-[#545351] text-white"
                                              : "border border-[#A29080] text-[#4A4643] bg-white group-hover:bg-[#A29080] group-hover:text-white"
                                          }`}
                                        >
                                          {checked ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              <span>เลือกแล้ว</span>
                                            </>
                                          ) : (
                                            <span>+ เลือกเพิ่ม</span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================
                      SLIDE 2: กรอกข้อมูลผู้เข้าพัก + ชำระเงิน & สแกนสลิป
                  ========================================================== */}
                  <div
                    ref={bookingSlideScrollRef}
                    className={`absolute inset-0 overflow-y-auto overflow-x-hidden bg-white p-5 sm:p-6 space-y-5 transition-transform duration-300 ease-out ${
                      drawerTab === "booking"
                        ? "translate-x-0"
                        : "translate-x-full pointer-events-none"
                    }`}
                  >
                    {activeHoldBooking ? (
                      <div className="space-y-5">
                        {activeHoldBooking.status === "HOLD_15_MIN" && (
                          <div className="rounded-[2px] bg-[#FFF8EB] border border-[#E5C99B] p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <Timer className="w-5 h-5 text-[#A29080] shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-[#4A4643]">
                                    ล็อคห้อง {activeHoldBooking.roomCode}{" "}
                                    ชั่วคราวให้คุณแล้ว! (
                                    {activeHoldBooking.bookingCode})
                                  </p>
                                  <p className="text-[11px] text-[#5C554E]">
                                    กรุณาชำระเงินและแนบสลิปภายใน 15 นาที
                                  </p>
                                </div>
                              </div>
                              <span className="rounded-[2px] bg-[#545351] text-white px-3 py-1.5 font-mono text-base font-bold shrink-0">
                                {String(
                                  Math.floor(holdSecondsLeft / 60)
                                ).padStart(2, "0")}
                                :
                                {String(holdSecondsLeft % 60).padStart(2, "0")}
                              </span>
                            </div>
                            <div className="flex justify-end pt-1 border-t border-[#E5C99B]/60">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelHoldBooking(activeHoldBooking.id)
                                }
                                className="text-[11px] font-bold text-[#9B2C2C] hover:underline cursor-pointer"
                              >
                                ยกเลิกการล็อคห้องชั่วคราว (ปลดล็อคห้องนี้ทันที)
                              </button>
                            </div>
                          </div>
                        )}

                        {activeHoldBooking.status === "PENDING_ADMIN" ||
                        activeHoldBooking.status === "CONFIRMED" ? (
                          <div className="rounded-[2px] border border-[#A29080] bg-white p-6 text-center space-y-4">
                            <CheckCircle2 className="w-12 h-12 text-[#A29080] mx-auto" />
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A29080]">
                              {activeHoldBooking.status === "CONFIRMED"
                                ? "🟢 ยืนยันการจองสำเร็จ (CONFIRMED)"
                                : "🔵 แนบสลิปและตรวจ QR เบื้องต้นผ่านแล้ว"}
                            </p>
                            <h3 className="text-xl font-bold text-[#4A4643]">
                              รหัสการจอง: {activeHoldBooking.bookingCode} (
                              {activeHoldBooking.roomCode})
                            </h3>
                            <p className="text-xs sm:text-sm text-[#5C554E]">
                              ระบบได้ส่งสลิปไปที่หน้า /admin เพื่อให้แอดมินกดยืนยันการจองใน 1 คลิกเรียบร้อยแล้วครับ
                            </p>
                            <div className="pt-2 flex flex-wrap justify-center gap-3">
                              <Link
                                href="/admin"
                                className="btn-round-solid !text-xs"
                              >
                                เปิดหน้า /admin เพื่อกดยืนยัน 1 คลิก →
                              </Link>
                              <StandardButton
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveRoom(null)}
                              >
                                ปิดหน้าต่างนี้
                              </StandardButton>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[2px] border border-[#E2DAD0] bg-white p-5 space-y-5">
                            <div className="flex flex-col sm:flex-row items-center gap-5 bg-[#FBF9F6] p-4 rounded-[2px] border border-[#E2DAD0]">
                              <div className="w-32 h-32 rounded-[2px] border border-[#A29080] bg-white p-2 flex flex-col items-center justify-center shrink-0">
                                <QrCode className="w-20 h-20 text-[#4A4643]" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A29080]">
                                  PROMPTPAY
                                </span>
                              </div>
                              <div className="space-y-1 text-center sm:text-left">
                                <span className="inline-block rounded-[2px] bg-[#545351] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  สแกนโอนผ่านแอปธนาคารได้ทุกธนาคาร
                                </span>
                                <p className="text-sm font-bold text-[#4A4643]">
                                  ชื่อบัญชี:{" "}
                                  {propertyConfig.promptPayAccountName}
                                </p>
                                <p className="text-xs text-[#5C554E]">
                                  พร้อมเพย์: {propertyConfig.promptPayId}
                                </p>
                                <p className="text-xl font-extrabold text-[#A29080] pt-1">
                                  ยอดโอนสุทธิ: ฿
                                  {activeHoldBooking.totalPriceThb.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-[#A29080] bg-[#FBF9F6] p-5 text-center cursor-pointer hover:bg-[#F4EFE6] transition">
                                <Upload className="w-6 h-6 text-[#A29080] mb-1.5" />
                                <span className="text-sm font-bold text-[#4A4643]">
                                  {isScanningSlip
                                    ? "กำลังสแกน QR Code ในรูปสลิป..."
                                    : "คลิกเพื่อแนบรูปสลิปโอนเงิน"}
                                </span>
                                <span className="text-xs text-[#8C8278] mt-0.5">
                                  ระบบจะสแกนตรวจ QR บนสลิปอัตโนมัติ
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSlipFileUpload}
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={handleSimulateValidSlip}
                                className="w-full rounded-[2px] border border-[#A29080] bg-[#F4EFE6] hover:bg-[#A29080] hover:text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-[#4A4643] transition cursor-pointer"
                              >
                                ⚡ ปุ่มทดสอบด่วน: จำลองการแนบสลิปธนาคารที่มี QR จริง
                              </button>

                              {slipScanFeedback && (
                                <p className="text-xs font-semibold text-[#7D623B] bg-[#FFF8EB] border border-[#E5C99B] p-2.5 rounded-[2px]">
                                  {slipScanFeedback}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form
                        id="sidebar-booking-form"
                        onSubmit={handleCreateHoldBooking}
                        className="space-y-5"
                      >
                        {bookingConflictError && (
                          <div className="rounded-[2px] bg-[#FDF2F2] border border-[#F5C6C6] p-3.5 text-xs font-semibold text-[#9B2C2C]">
                            ⚠️ {bookingConflictError}
                          </div>
                        )}

                        {/* Booking Summary Banner */}
                        <div className="pb-4 border-b border-[#E6E0D6] space-y-3">
                          <div className="flex items-center gap-3 pb-3 border-b border-[#E6E0D6]">
                            <img
                              src={sidebarRoom.images[0]?.url}
                              alt={sidebarRoom.nameTh}
                              className="h-14 w-20 rounded-[2px] object-cover shrink-0"
                            />
                            <div>
                              <span className="rounded-[2px] bg-[#545351] text-white px-2 py-0.5 text-[10px] font-bold">
                                {sidebarRoom.code} ({unitsToBook} หลัง)
                              </span>
                              <h4 className="text-sm font-bold text-[#4A4643] mt-0.5">
                                {sidebarRoom.nameTh}
                              </h4>
                              <p className="text-xs text-[#5C554E]">
                                {formatShortDate(checkIn, lang)} →{" "}
                                {formatShortDate(checkOut, lang)} ({nights} คืน
                                · {guests} ท่าน)
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-[#5C554E]">
                              <span>
                                ค่าห้องพักตามเรทฤดูกาล ({nights} คืน ×{" "}
                                {unitsToBook} หลัง)
                              </span>
                              <span className="font-semibold text-[#4A4643]">
                                ฿{activePricing.roomSubtotal.toLocaleString()}
                              </span>
                            </div>
                            {activePricing.extraBedTotal > 0 && (
                              <div className="flex justify-between text-[#5C554E]">
                                <span>
                                  เสริมที่นอน ({activePricing.extraGuests} ท่าน)
                                </span>
                                <span className="font-semibold text-[#4A4643]">
                                  +฿
                                  {activePricing.extraBedTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {activePricing.addonsTotal > 0 && (
                              <div className="flex justify-between text-[#5C554E]">
                                <span>บริการเสริม</span>
                                <span className="font-semibold text-[#4A4643]">
                                  +฿{activePricing.addonsTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {activePricing.couponDiscount > 0 && (
                              <div className="flex justify-between text-[#A29080] font-semibold">
                                <span>ส่วนลดคูปอง ({appliedCouponCode})</span>
                                <span>
                                  −฿
                                  {activePricing.couponDiscount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Guest Information Form */}
                        <div className="space-y-3 pb-4 border-b border-[#E6E0D6]">
                          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A4643]">
                            ข้อมูลผู้เข้าพัก (Guest Information)
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <StandardInput
                              label="ชื่อ - นามสกุล *"
                              placeholder="เช่น คุณกานต์ วงศ์สวัสดิ์"
                              required
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                            />
                            <StandardInput
                              label="เบอร์โทรศัพท์ *"
                              type="tel"
                              placeholder="08X-XXX-XXXX"
                              required
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value)}
                            />
                          </div>
                          <StandardInput
                            label="อีเมล หรือ LINE ID"
                            optionalText="สำหรับรับใบยืนยันการจอง"
                            placeholder="name@email.com / LINE ID"
                            value={guestContact}
                            onChange={(e) => setGuestContact(e.target.value)}
                          />
                          <StandardInput
                            label="คำขอพิเศษเพิ่มเติม"
                            optionalText="ไม่บังคับ"
                            placeholder="เช่น ขอเข้าเช็คอินเวลา 15:00 น."
                            value={guestNote}
                            onChange={(e) => setGuestNote(e.target.value)}
                          />
                        </div>

                        {/* Promo Code Section */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#5C554E] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-[#A29080]" />
                            คูปองส่วนลด (Promo Code)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponInput}
                              onChange={(e) =>
                                setCouponInput(e.target.value.toUpperCase())
                              }
                              placeholder="กรอกรหัส เช่น SAPAN10"
                              className="h-10 flex-grow rounded-[2px] border border-[#E2DAD0] px-3 text-xs font-mono uppercase focus:border-[#A29080] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon()}
                              className="btn-round-border !py-1.5 !px-4 !text-xs"
                            >
                              ใช้โค้ด
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {coupons
                              .filter((c) => c.isActive)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className={`rounded-[2px] px-2 py-0.5 text-[11px] font-mono font-bold border cursor-pointer ${
                                    appliedCouponCode === c.code
                                      ? "bg-[#A29080] text-white border-[#A29080]"
                                      : "bg-[#FBF9F6] text-[#4A4643] border-[#E2DAD0]"
                                  }`}
                                >
                                  {c.code}
                                </button>
                              ))}
                          </div>
                          {couponError && (
                            <p className="text-xs text-[#9B2C2C]">
                              {couponError}
                            </p>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                </div>

              {/* =============================================================
                  5. STICKY BOTTOM BAR: Price Summary + Instant Action CTA
              ============================================================== */}
              <div className="sticky bottom-0 z-30 shrink-0 border-t border-[#E2DAD0] bg-white px-5 py-3.5 shadow-[0_-8px_24px_rgba(74,70,67,0.08)] flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-[#5C554E] block">
                    Start at · ยอดสุทธิ ({nights} คืน · {unitsToBook} หลัง)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-extrabold text-[#B85D43]">
                      ฿{activePricing.netTotal.toLocaleString()}
                    </span>
                    {sidebarRoom.discountPercent > 0 && (
                      <span className="text-xs text-[#8C8278] line-through">
                        ฿
                        {Math.round(
                          activePricing.netTotal /
                            (1 - sidebarRoom.discountPercent / 100)
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B85D43] block">
                    {sidebarRoom.discountPercent > 0
                      ? `-${sidebarRoom.discountPercent}% TODAY`
                      : appliedCouponCode
                      ? `APPLIED ${appliedCouponCode}`
                      : "BEST RATE GUARANTEED"}
                  </span>
                </div>

                {drawerTab === "details" ? (
                  (roomStatusMap[sidebarRoom.id]?.availableUnits ?? 0) >=
                  unitsToBook ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingConflictError(null);
                        setDrawerTab("booking");
                        bookingSlideScrollRef.current?.scrollTo({
                          top: 0,
                          behavior: "instant",
                        });
                      }}
                      className="rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white px-6 sm:px-8 py-3 text-xs sm:text-sm font-bold tracking-wide shadow-sm transition cursor-pointer shrink-0"
                    >
                      เลือกจองห้องพักนี้ →
                    </button>
                  ) : activeHoldBooking &&
                    activeHoldBooking.roomId === sidebarRoom.id &&
                    activeHoldBooking.status === "HOLD_15_MIN" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingConflictError(null);
                        setDrawerTab("booking");
                        bookingSlideScrollRef.current?.scrollTo({
                          top: 0,
                          behavior: "instant",
                        });
                      }}
                      className="rounded-[2px] bg-[#545351] hover:bg-[#4A4643] text-white px-5 sm:px-6 py-3 text-xs sm:text-sm font-bold tracking-wide shadow-sm transition cursor-pointer shrink-0"
                    >
                      ดู QR ชำระเงิน / ปลดล็อคห้อง →
                    </button>
                  ) : (
                    <div className="rounded-[2px] bg-[#FDF2F2] border border-[#F5C6C6] text-[#9B2C2C] px-4 py-2.5 text-xs font-bold text-right">
                      เต็มในวันที่เลือก
                    </div>
                  )
                ) : !activeHoldBooking ? (
                  (roomStatusMap[sidebarRoom.id]?.availableUnits ?? 0) >=
                  unitsToBook ? (
                    <button
                      type="submit"
                      form="sidebar-booking-form"
                      className="rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white px-6 sm:px-8 py-3 text-xs sm:text-sm font-bold tracking-wide shadow-sm transition cursor-pointer inline-flex items-center gap-2 shrink-0"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>ยืนยันการจอง & รับ QR</span>
                    </button>
                  ) : (
                    <div className="rounded-[2px] bg-[#FDF2F2] border border-[#F5C6C6] text-[#9B2C2C] px-4 py-2.5 text-xs font-bold text-right">
                      เต็มในวันที่เลือก
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveRoom(null)}
                    className="rounded-[2px] border border-[#A29080] text-[#4A4643] hover:bg-[#F4EFE6] px-6 py-2.5 text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    ปิดหน้าต่างนี้
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ANANTARA UI DESIGN SYSTEM MODAL */}
      {showDesignSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4A4946]/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-[2px] bg-[#FBF9F6] p-6 shadow-2xl border border-[#E2DAD0] border-t-2 border-t-[#A29080] space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2DAD0] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29080]">
                  ANANTARA EDITORIAL LUXURY DESIGN SYSTEM
                </p>
                <h2 className="text-lg font-bold text-[#4A4643]">
                  มาตรฐานสี ปุ่ม และการ์ดสำหรับรีสอร์ททุกรูปแบบ (White-Label Hospitality)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDesignSystem(false)}
                className="h-8 w-8 rounded-[2px] border border-[#E2DAD0] bg-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-[2px] bg-[#545351] text-white border border-[#A29080]/40">
                <div className="font-bold">Warm Slate Grey</div>
                <div className="font-mono text-[11px] opacity-80">#545351</div>
              </div>
              <div className="p-3 rounded-[2px] bg-[#A29080] text-white">
                <div className="font-bold">Anantara Taupe</div>
                <div className="font-mono text-[11px] opacity-80">#A29080</div>
              </div>
              <div className="p-3 rounded-[2px] bg-[#F4EFE6] text-[#4A4643] border border-[#E2DAD0]">
                <div className="font-bold">Champagne Sand</div>
                <div className="font-mono text-[11px] opacity-80">#F4EFE6</div>
              </div>
              <div className="p-3 rounded-[2px] bg-[#FBF9F6] text-[#4A4643] border border-[#E2DAD0]">
                <div className="font-bold">Alabaster Ivory</div>
                <div className="font-mono text-[11px] opacity-80">#FBF9F6</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StandardButton variant="primary">Primary Taupe CTA</StandardButton>
              <StandardButton variant="secondary">Warm Slate CTA</StandardButton>
              <StandardButton variant="outline">Architectural Outline</StandardButton>
              <StandardButton variant="subtle">Champagne Subtle</StandardButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="available" label="ว่างพร้อมจอง" />
              <StatusPill status="last_unit" label="ล็อคชั่วคราว 15 นาที" />
              <StatusPill status="booked" label="เต็มแล้ว" />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          AGODA-STYLE ROOM GALLERY MODAL (ALL PHOTOS, CATEGORY TABS & LIGHTBOX)
      ====================================================================== */}
      <RoomGalleryModal
        isOpen={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
        selectedRoom={galleryRoom}
        allRooms={rooms}
        propertyConfig={propertyConfig}
        addons={addons}
        experiences={experiences}
        lang={lang}
        onBookRoom={(rm) => openRoomDrawer(rm, "booking")}
      />
    </div>
  );
}
