"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  X,
  QrCode,
  ShieldCheck,
  Tag,
  Upload,
  CheckCircle2,
  Timer,
  Sparkles,
  MapPin,
  Star,
  Wifi,
  Coffee,
  Bath,
  Wind,
  Tv,
  Car,
  Waves,
  Mountain,
  BedDouble,
  Maximize2,
  ThumbsUp,
  Flame,
  Utensils,
  Minus,
  Plus,
} from "lucide-react";
import {
  RoomLodge,
  BookingRecord,
  WhiteLabelPropertyConfig,
  SeasonalRateRule,
  SpecialDateRateOverride,
  ExtraAddon,
  PromoCoupon,
  ResortExperienceItem,
} from "@/data/rooms";
import {
  useSapanStore,
  formatDateStr,
  addDaysToDate,
  scanSlipQrFromFile,
  calculateStayPricingBreakdown,
  getRoomInventoryForRange,
  getLatestBookingsSnapshot,
  SapanStoreData,
} from "@/lib/store";
import {
  StandardButton,
  StandardInput,
  StandardFeedContainer,
} from "@/components/ui/standards";
import {
  AgodaBookingBar,
  DailyAvailabilityInfo,
} from "@/components/AgodaBookingBar";
import {
  useResortWeather,
  LiveWeatherData,
} from "@/components/ResortWeatherWidget";
import {
  HOTEL_NAV_TABS,
  MyHotelNav,
  HotelNavTabId,
  getTabIdFromPathname,
} from "@/components/MyHotelNav";
import type { RoomStatusSummary } from "@/components/AiBookingChatView";

const AutoQrPaymentCard = dynamic(
  () =>
    import("@/components/DynamicPromptPayQr").then(
      (mod) => mod.AutoQrPaymentCard
    ),
  { ssr: false }
);
const DigitalBookingVoucherCard = dynamic(
  () =>
    import("@/components/DynamicPromptPayQr").then(
      (mod) => mod.DigitalBookingVoucherCard
    ),
  { ssr: false }
);
const RoomGalleryModal = dynamic(
  () =>
    import("@/components/RoomGalleryModal").then((mod) => mod.RoomGalleryModal),
  { ssr: false }
);
const AiChatDesktopBubble = dynamic(
  () =>
    import("@/components/AiBookingChatView").then(
      (mod) => mod.AiChatDesktopBubble
    ),
  { ssr: false }
);

export type Lang = "th" | "en";
export type ThemeMode = "light" | "dark";
export type RoomFilterMode =
  | "all"
  | "available"
  | "VILLA"
  | "SUITE"
  | "DELUXE";

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

export function formatShortDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return dateStr;
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  return lang === "th"
    ? `${d} ${SHORT_MONTHS_TH[m]} ${y + 543}`
    : `${d} ${SHORT_MONTHS_EN[m]} ${y}`;
}

export function formatNavbarDateCard(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return dateStr;
  const dow = date.getDay();
  const d = date.getDate();
  const m = date.getMonth();
  return lang === "th"
    ? `${SHORT_DAYS_TH[dow]}, ${d} ${SHORT_MONTHS_TH[m]}`
    : `${SHORT_DAYS_EN[dow]}, ${SHORT_MONTHS_EN[m]} ${d}`;
}

export function getFacilityIconMeta(text: string) {
  const lower = text.toLowerCase();
  const toneClass =
    "bg-[var(--color-neutral)] text-[var(--color-text-primary)]";

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
  if (
    lower.includes("จอดรถ") ||
    lower.includes("รถ") ||
    lower.includes("parking")
  ) {
    return { Icon: Car, toneClass };
  }
  if (
    lower.includes("ปิ้งย่าง") ||
    lower.includes("เตา") ||
    lower.includes("bbq")
  ) {
    return { Icon: Flame, toneClass };
  }
  return { Icon: Sparkles, toneClass };
}

export interface HotelAppContextValue {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  seasonalRates: SeasonalRateRule[];
  specialDateRates: SpecialDateRateOverride[];
  addons: ExtraAddon[];
  coupons: PromoCoupon[];
  experiences: ResortExperienceItem[];
  bookings: BookingRecord[];
  saveStore: (updater: (prev: SapanStoreData) => SapanStoreData) => void;
  today: Date;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  checkIn: string;
  setCheckIn: (d: string) => void;
  checkOut: string;
  setCheckOut: (d: string) => void;
  guests: number;
  setGuests: (g: number) => void;
  nights: number;
  weather: LiveWeatherData | null;
  weatherLoading: boolean;
  roomStatusMap: Record<string, RoomStatusSummary>;
  totalAvailableUnitsCount: number;
  totalInventoryUnitsCount: number;
  pendingAdminCount: number;
  getDailyAvailability: (dateStr: string) => DailyAvailabilityInfo;
  findNextAvailableRangeForRoom: (
    room: RoomLodge
  ) => { nextCheckIn: string; nextCheckOut: string } | null;
  selectedAddons: string[];
  addonQuantities: Record<string, number>;
  setSelectedAddons: React.Dispatch<React.SetStateAction<string[]>>;
  toggleAddon: (addonId: string) => void;
  setAddonQuantity: (addonId: string, quantity: number) => void;
  updateAddonQuantity: (addonId: string, delta: number) => void;
  appliedCouponCode: string | null;
  setAppliedCouponCode: (code: string | null) => void;
  couponInput: string;
  setCouponInput: (code: string) => void;
  couponError: string | null;
  handleApplyCoupon: (codeToApply?: string) => void;
  openRoomDrawer: (
    room: RoomLodge,
    initialTab?: "details" | "booking"
  ) => void;
  openGalleryModal: (room: RoomLodge) => void;
  navigateToTab: (tab: HotelNavTabId) => void;
  pendingChatPrompt: string | null;
  setPendingChatPrompt: (prompt: string | null) => void;
  submitChatPrompt: (prompt: string) => void;
  initialShortIndex: number;
  openShortsAt: (index: number) => void;
  roomFilterMode: RoomFilterMode;
  setRoomFilterMode: (mode: RoomFilterMode) => void;
  hideSoldOutRooms: boolean;
  setHideSoldOutRooms: React.Dispatch<React.SetStateAction<boolean>>;
}

const HotelAppContext = createContext<HotelAppContextValue | null>(null);

export function useHotelApp(): HotelAppContextValue {
  const ctx = useContext(HotelAppContext);
  if (!ctx) {
    throw new Error("useHotelApp must be used within HotelAppShell");
  }
  return ctx;
}

export function HotelAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
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

  const [lang, setLangState] = useState<Lang>("th");
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isMobileHeaderVisible, setIsMobileHeaderVisible] =
    useState<boolean>(true);

  const applyThemeToDom = useCallback((mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    const isDarkMode = mode === "dark";
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, []);

  // Auto-hide sticky top header on mobile scroll down & show on scroll up (matching weglobal.co / my-shop Nav.tsx)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.scrollY;
      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;

      // Ignore iOS Safari rubber-band overscroll
      if (scrollY < 0 || (maxScrollY > 0 && scrollY > maxScrollY)) {
        ticking = false;
        return;
      }

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }

      if (scrollY > lastScrollY && scrollY > 60) {
        setIsMobileHeaderVisible(false);
      } else if (scrollY < lastScrollY) {
        setIsMobileHeaderVisible(true);
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load saved theme and lang from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("my-hotel-theme") as ThemeMode | null;
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
        applyThemeToDom(saved);
      } else {
        applyThemeToDom("light");
      }
      const savedLang = localStorage.getItem("my-hotel-lang") as Lang | null;
      if (savedLang === "th" || savedLang === "en") {
        setLangState(savedLang);
      }
    } catch {
      // ignore storage errors
    }
  }, [applyThemeToDom]);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    try {
      localStorage.setItem("my-hotel-lang", nextLang);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      applyThemeToDom(nextTheme);
      try {
        localStorage.setItem("my-hotel-theme", nextTheme);
      } catch {
        // ignore
      }
    },
    [applyThemeToDom]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Route-based active tab
  const activeTab = getTabIdFromPathname(pathname);

  const navigateToTab = useCallback(
    (targetTab: HotelNavTabId) => {
      if (targetTab === "setting") {
        router.push("/setting");
        return;
      }
      if (targetTab === "guide") {
        router.push("/guide");
        return;
      }
      if (targetTab === "review") {
        router.push("/review");
        return;
      }
      if (targetTab === "chat") {
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
          setIsDesktopChatOpen(true);
          if (pathname.startsWith("/chat")) {
            router.replace("/");
          }
          return;
        }
        router.push("/chat");
        return;
      }
      if (
        targetTab === "book" ||
        targetTab === "home" ||
        targetTab === "room"
      ) {
        if (pathname !== "/") {
          router.push("/");
        } else if (targetTab === "room") {
          document
            .getElementById("rooms")
            ?.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
      const found = HOTEL_NAV_TABS.find((t) => t.id === targetTab);
      if (!found) return;
      router.push(found.href);
    },
    [router, pathname]
  );

  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(
    null
  );
  const [isDesktopChatOpen, setIsDesktopChatOpen] = useState<boolean>(false);
  const [initialShortIndex, setInitialShortIndex] = useState<number>(0);

  // On Desktop (>= 1024px), /chat should never be shown as a standalone page; redirect to / and open the bottom-right Chat Bubble
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResponsiveChatRoute = () => {
      if (window.innerWidth >= 1024 && pathname.startsWith("/chat")) {
        setIsDesktopChatOpen(true);
        router.replace("/");
      }
    };
    handleResponsiveChatRoute();
    window.addEventListener("resize", handleResponsiveChatRoute);
    return () => window.removeEventListener("resize", handleResponsiveChatRoute);
  }, [pathname, router]);

  const submitChatPrompt = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (trimmed) {
        setPendingChatPrompt(trimmed);
      }
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        setIsDesktopChatOpen(true);
        if (pathname.startsWith("/chat")) {
          router.replace("/");
        }
        return;
      }
      router.push("/chat");
    },
    [router, pathname]
  );

  const openShortsAt = useCallback(
    (index: number) => {
      setInitialShortIndex(index);
      router.push("/shorts");
    },
    [router]
  );

  // Shared booking dates & guests state
  const [checkIn, setCheckIn] = useState<string>(() => formatDateStr(today));
  const [checkOut, setCheckOut] = useState<string>(() =>
    formatDateStr(addDaysToDate(today, 1))
  );
  const [guests, setGuests] = useState<number>(2);
  const [roomFilterMode, setRoomFilterMode] = useState<RoomFilterMode>("all");
  const [hideSoldOutRooms, setHideSoldOutRooms] = useState<boolean>(false);

  const { weather, loading: weatherLoading } = useResortWeather(
    propertyConfig.latitude,
    propertyConfig.longitude
  );

  // Gallery Modal & Unified Modal Continuity State
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryRoom, setGalleryRoom] = useState<RoomLodge | null>(null);
  const [cameFromGallery, setCameFromGallery] = useState(false);
  const [returningToGallery, setReturningToGallery] = useState(false);
  const openGalleryModal = useCallback((room: RoomLodge) => {
    setCameFromGallery(false);
    setReturningToGallery(false);
    setGalleryRoom(room);
    setGalleryModalOpen(true);
  }, []);

  // Slide-Over Booking Drawer State
  const [activeRoom, setActiveRoom] = useState<RoomLodge | null>(null);
  const [displayedRoom, setDisplayedRoom] = useState<RoomLodge | null>(null);
  const [drawerSlideIndex, setDrawerSlideIndex] = useState<number>(0);
  const [drawerTab, setDrawerTab] = useState<"details" | "booking">("details");
  const [unitsToBook, setUnitsToBook] = useState<number>(1);
  const [priceGuaranteeSeconds, setPriceGuaranteeSeconds] =
    useState<number>(900);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const bookingSlideScrollRef = useRef<HTMLDivElement | null>(null);

  const [addonQuantities, setAddonQuantities] = useState<
    Record<string, number>
  >({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const setAddonQuantity = useCallback((addonId: string, quantity: number) => {
    const clamped = Math.max(0, quantity);
    setAddonQuantities((prev) => {
      const next = { ...prev };
      if (clamped <= 0) {
        delete next[addonId];
      } else {
        next[addonId] = clamped;
      }
      return next;
    });
    setSelectedAddons((prev) => {
      if (clamped <= 0) {
        return prev.filter((id) => id !== addonId);
      }
      return prev.includes(addonId) ? prev : [...prev, addonId];
    });
  }, []);

  const updateAddonQuantity = useCallback((addonId: string, delta: number) => {
    setAddonQuantities((prev) => {
      const cur = prev[addonId] || 0;
      const nextVal = Math.max(0, cur + delta);
      const updated = { ...prev };
      if (nextVal <= 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = nextVal;
      }
      setSelectedAddons((old) => {
        if (nextVal <= 0) {
          return old.filter((id) => id !== addonId);
        }
        return old.includes(addonId) ? old : [...old, addonId];
      });
      return updated;
    });
  }, []);

  const toggleAddon = useCallback((addonId: string) => {
    setAddonQuantities((prev) => {
      const cur = prev[addonId] || 0;
      const nextVal = cur > 0 ? 0 : 1;
      const updated = { ...prev };
      if (nextVal <= 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = nextVal;
      }
      setSelectedAddons((old) => {
        if (nextVal <= 0) {
          return old.filter((id) => id !== addonId);
        }
        return old.includes(addonId) ? old : [...old, addonId];
      });
      return updated;
    });
  }, []);

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

  useEffect(() => {
    setBookingConflictError(null);
    setActiveHoldBookingId(null);
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!activeRoom) return;
    const timer = setInterval(() => {
      setPriceGuaranteeSeconds((prev) => (prev > 1 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRoom]);

  // Unified Background Scroll Lock for Both Modals (Prevents background scrolling & scrollbar width shift)
  const isAnyModalOpen = galleryModalOpen || Boolean(activeRoom);
  useEffect(() => {
    if (!isAnyModalOpen) return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevHtmlOverscroll = htmlEl.style.overscrollBehavior;
    const prevBodyOverscroll = bodyEl.style.overscrollBehavior;

    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    htmlEl.style.overscrollBehavior = "none";
    bodyEl.style.overscrollBehavior = "none";

    return () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      bodyEl.style.overflow = prevBodyOverflow;
      htmlEl.style.overscrollBehavior = prevHtmlOverscroll;
      bodyEl.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [isAnyModalOpen]);

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

  const roomStatusMap = useMemo(() => {
    const map: Record<string, RoomStatusSummary> = {};
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

  const totalAvailableUnitsCount = useMemo(
    () =>
      rooms.reduce(
        (sum, r) => sum + (roomStatusMap[r.id]?.availableUnits ?? 0),
        0
      ),
    [rooms, roomStatusMap]
  );

  const totalInventoryUnitsCount = useMemo(
    () => rooms.reduce((sum, r) => sum + Math.max(1, r.totalUnits ?? 1), 0),
    [rooms]
  );

  const soldOutFilteredCount = useMemo(() => {
    return rooms.filter((r) => {
      const st = roomStatusMap[r.id];
      const avail = st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
      if (roomFilterMode === "available") return false;
      if (
        roomFilterMode === "VILLA" ||
        roomFilterMode === "SUITE" ||
        roomFilterMode === "DELUXE"
      ) {
        if ((r.roomCategory || "VILLA") !== roomFilterMode) return false;
      }
      return !avail;
    }).length;
  }, [rooms, roomFilterMode, roomStatusMap]);

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
      addonQuantities,
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
    addonQuantities,
    coupons,
    appliedCouponCode,
  ]);

  const openRoomDrawer = useCallback(
    (
      room: RoomLodge,
      initialTab: "details" | "booking" = "details",
      fromGallery: boolean = false
    ) => {
      const currentBookings = getLatestBookingsSnapshot(bookings);
      const existingHold = currentBookings.find(
        (b) =>
          b.roomId === room.id &&
          b.status === "HOLD_15_MIN" &&
          new Date(b.holdExpiresAtIso).getTime() > Date.now() &&
          checkIn < b.checkOut &&
          checkOut > b.checkIn
      );

      setCameFromGallery(fromGallery);
      setReturningToGallery(false);
      if (fromGallery) {
        setGalleryModalOpen(false);
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
        // 2-step booking flow: always start on Step 1 ("details" + upsell add-ons) before Step 2 ("booking" guest form)
        setActiveHoldBookingId(null);
        setDrawerTab("details");
        setTimeout(() => {
          sidebarScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
        }, 0);
      }
    },
    [bookings, checkIn, checkOut]
  );

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

  const handleApplyCoupon = useCallback(
    (codeToApply?: string) => {
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
        setCouponError(
          lang === "th"
            ? "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว"
            : "Invalid or expired promo code"
        );
        return;
      }
      setCouponInput(found.code);
      setAppliedCouponCode(found.code);
    },
    [couponInput, coupons, lang]
  );

  const handleCreateHoldBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebarRoom || !guestName.trim() || !guestPhone.trim()) return;
    setBookingConflictError(null);

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
          : `${formatShortDate(checkIn, lang)} – ${formatShortDate(
              checkOut,
              lang
            )}`;
      setBookingConflictError(
        lang === "th"
          ? `ไม่สามารถจองทับวันได้: ${sidebarRoom.nameTh} มีผู้จองเต็มแล้วในคืนวันที่ ${conflictText} กรุณาเปลี่ยนวันเข้าพักหรือเลือกบ้านพักหลังอื่นครับ`
          : `Dates unavailable: ${sidebarRoom.nameEn} is already booked on ${conflictText}. Please select different dates or another villa.`
      );
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `bk-${Date.now()}`;
    const chosenAddons = addons
      .filter((a) => a.isActive && selectedAddons.includes(a.id))
      .map((a) => {
        const qty = addonQuantities[a.id] || 1;
        return {
          id: a.id,
          nameTh: qty > 1 ? `${a.nameTh} (×${qty} ${a.unitTh})` : a.nameTh,
          priceThb: a.priceThb * qty,
        };
      });

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
          lang === "th"
            ? "⚠️ ระบบตรวจพบว่าสลิปใบนี้เคยถูกใช้ไปแล้ว กรุณาแนบสลิปใบใหม่"
            : "⚠️ This transfer slip has already been used. Please upload a valid new slip."
        );
        setIsScanningSlip(false);
        return;
      }

      const autoConfirm =
        propertyConfig.autoConfirmSlip !== false && result.qrFound;
      const nextStatus = autoConfirm ? "CONFIRMED" : "PENDING_ADMIN";

      saveStore((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === activeHoldBooking.id
            ? {
                ...b,
                status: nextStatus,
                slipDataUrl: result.dataUrl,
                slipQrVerified: result.qrFound,
                slipQrPayload: result.qrPayload,
              }
            : b
        ),
      }));
      setSlipScanFeedback(
        autoConfirm
          ? lang === "th"
            ? `✅ ตรวจสลิปผ่านอัตโนมัติ! ยืนยันการจอง #${activeHoldBooking.bookingCode} เรียบร้อยแล้ว`
            : `✅ Slip verified! Booking #${activeHoldBooking.bookingCode} is now CONFIRMED.`
          : lang === "th"
          ? `✅ สแกน QR บนสลิปสำเร็จ ส่งให้แอดมินตรวจสอบเรียบร้อย!`
          : `✅ Slip QR verified. Submitted for admin approval!`
      );
    } catch {
      setSlipScanFeedback(
        lang === "th"
          ? "เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ กรุณาลองอีกครั้ง"
          : "Error reading image file. Please try again."
      );
    } finally {
      setIsScanningSlip(false);
    }
  };

  const handleSimulateValidSlip = () => {
    if (!activeHoldBooking) return;
    const mockRef = `0046000600000101030040220${Date.now()}KBNKTH`;
    const autoConfirm = propertyConfig.autoConfirmSlip !== false;
    const nextStatus = autoConfirm ? "CONFIRMED" : "PENDING_ADMIN";

    saveStore((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === activeHoldBooking.id
          ? {
              ...b,
              status: nextStatus,
              slipDataUrl:
                "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
              slipQrVerified: true,
              slipQrPayload: mockRef,
            }
          : b
      ),
    }));
    setSlipScanFeedback(
      autoConfirm
        ? lang === "th"
          ? `✅ ตรวจสลิปผ่านอัตโนมัติ (Ref: ${mockRef.slice(
              -10
            )}) ยืนยันห้องพักทันที!`
          : `✅ Slip auto-verified (Ref: ${mockRef.slice(
              -10
            )}). Booking CONFIRMED!`
        : lang === "th"
        ? `✅ สแกนพบ QR สลิปธนาคารจริง ส่งเข้าหน้า /admin เรียบร้อย!`
        : `✅ Verified bank slip QR. Sent to /admin for confirmation!`
    );
  };

  const contextValue = useMemo<HotelAppContextValue>(
    () => ({
      propertyConfig,
      rooms,
      seasonalRates,
      specialDateRates,
      addons,
      coupons,
      experiences,
      bookings,
      saveStore,
      today,
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme,
      checkIn,
      setCheckIn,
      checkOut,
      setCheckOut,
      guests,
      setGuests,
      nights,
      weather,
      weatherLoading,
      roomStatusMap,
      totalAvailableUnitsCount,
      totalInventoryUnitsCount,
      pendingAdminCount,
      getDailyAvailability,
      findNextAvailableRangeForRoom,
      selectedAddons,
      addonQuantities,
      setSelectedAddons,
      toggleAddon,
      setAddonQuantity,
      updateAddonQuantity,
      appliedCouponCode,
      setAppliedCouponCode,
      couponInput,
      setCouponInput,
      couponError,
      handleApplyCoupon,
      openRoomDrawer,
      openGalleryModal,
      navigateToTab,
      pendingChatPrompt,
      setPendingChatPrompt,
      submitChatPrompt,
      initialShortIndex,
      openShortsAt,
      roomFilterMode,
      setRoomFilterMode,
      hideSoldOutRooms,
      setHideSoldOutRooms,
    }),
    [
      propertyConfig,
      rooms,
      seasonalRates,
      specialDateRates,
      addons,
      coupons,
      experiences,
      bookings,
      saveStore,
      today,
      lang,
      theme,
      setTheme,
      toggleTheme,
      checkIn,
      checkOut,
      guests,
      nights,
      weather,
      weatherLoading,
      roomStatusMap,
      totalAvailableUnitsCount,
      totalInventoryUnitsCount,
      pendingAdminCount,
      getDailyAvailability,
      findNextAvailableRangeForRoom,
      selectedAddons,
      addonQuantities,
      toggleAddon,
      setAddonQuantity,
      updateAddonQuantity,
      appliedCouponCode,
      couponInput,
      couponError,
      handleApplyCoupon,
      openRoomDrawer,
      openGalleryModal,
      navigateToTab,
      pendingChatPrompt,
      submitChatPrompt,
      initialShortIndex,
      openShortsAt,
      roomFilterMode,
      hideSoldOutRooms,
    ]
  );

  // Admin Console (/admin), Super Admin (/super-admin) & Login (/login) render dedicated workspaces
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/login")
  ) {
    return (
      <HotelAppContext.Provider value={contextValue}>
        {children}
      </HotelAppContext.Provider>
    );
  }

  const isSidebarOpen = Boolean(activeRoom);

  return (
    <HotelAppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] lg:pl-[72px] transition-colors duration-200">
        {/* 1. LEFT SIDEBAR (DESKTOP >= lg) + LIQUID GLASS BOTTOM NAV & RIGHT DRAWER (MOBILE & TABLET < lg) */}
        <MyHotelNav
          activeTab={activeTab}
          onSelectTab={navigateToTab}
          propertyConfig={propertyConfig}
          lang={lang}
          setLang={setLang}
          theme={theme}
          onToggleTheme={toggleTheme}
          propertyNameTh={propertyConfig.nameTh}
          propertyNameEn={propertyConfig.nameEn}
          brandCode={propertyConfig.brandCode}
          availableUnitsCount={totalAvailableUnitsCount}
          availableRoomCount={totalAvailableUnitsCount}
          pendingAdminCount={pendingAdminCount}
        />

        {/* 2 & 3. INSTAGRAM 2-COLUMN FLEX LAYOUT FOR BOOK TAB (Feed + Sticky Right Rail — Never Overlaps!) */}
        {activeTab === "book" ||
        activeTab === "home" ||
        activeTab === "room" ? (
          <div className="w-full max-w-[960px] mx-auto flex justify-center items-start gap-6 xl:gap-8">
            {/* LEFT/CENTER COLUMN: 760px Main Social Feed + Sticky Booking Bar */}
            <div className="w-full max-w-[760px] min-w-0 flex-1">
              <div
                className={`sticky top-0 z-30 bg-[var(--color-background-body)]/95 backdrop-blur-xl transition-transform duration-300 ${
                  isMobileHeaderVisible
                    ? "translate-y-0"
                    : "-translate-y-full lg:translate-y-0"
                }`}
              >
                <div className="w-full px-3 sm:px-4 lg:px-6 py-2">
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
                    onOpenDesignSystem={() => {}}
                    getDailyAvailability={getDailyAvailability}
                    onSearchRooms={() =>
                      document
                        .getElementById("rooms")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  />
                </div>
              </div>

              <main className="relative w-full min-w-0 pb-28 lg:pb-14">
                <StandardFeedContainer>{children}</StandardFeedContainer>
              </main>
            </div>

            {/* RIGHT COLUMN: Ultra-Minimal Sticky Room Rail (Icon + Room Code + Available/Full Only) */}
            <aside
              aria-label={
                lang === "th"
                  ? "สถานะห้องว่างและทางลัดห้องพัก"
                  : "Room availability quick jump"
              }
              className="hidden xl:flex w-[148px] shrink-0 sticky top-4 pt-3 pr-2 flex-col gap-3.5 select-none"
            >
              {rooms.map((rm) => {
                const st = roomStatusMap[rm.id];
                const isAvail =
                  st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;

                return (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(
                        `room-card-${rm.id}`
                      );
                      if (el) {
                        const top =
                          el.getBoundingClientRect().top +
                          window.scrollY -
                          88;
                        window.scrollTo({
                          top: Math.max(0, top),
                          behavior: "smooth",
                        });
                      }
                    }}
                    className="group w-full flex items-center gap-3 text-left transition cursor-pointer"
                  >
                    <div className="relative h-11 w-11 shrink-0">
                      <img
                        src={rm.images[0]?.url}
                        alt={rm.code}
                        className="h-11 w-11 rounded-full object-cover bg-[var(--color-background-muted)] transition"
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-background-body)] ${
                          isAvail ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="ty-body font-bold leading-tight text-[var(--color-text-primary)]">
                        {rm.code}
                      </p>
                      <p
                        className={`ty-caption font-medium leading-tight mt-0.5 ${
                          isAvail
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {isAvail
                          ? lang === "th"
                            ? "ว่าง"
                            : "Available"
                          : lang === "th"
                          ? "เต็ม"
                          : "Full"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </aside>
          </div>
        ) : (
          <main
            className={`relative w-full min-w-0 ${
              activeTab === "chat" || activeTab === "shorts"
                ? "pb-0"
                : "pb-28 lg:pb-14"
            }`}
          >
            <StandardFeedContainer
              className={
                activeTab === "chat" || activeTab === "shorts"
                  ? "!py-0 lg:!py-3"
                  : ""
              }
            >
              {children}
            </StandardFeedContainer>
          </main>
        )}

        {/* 4. DESKTOP FLOATING AI CHAT BUBBLE (Bottom-Right Corner) */}
        <AiChatDesktopBubble
          propertyNameTh={propertyConfig.nameTh}
          propertyNameEn={propertyConfig.nameEn}
          lang={lang}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          guests={guests}
          setGuests={setGuests}
          rooms={rooms}
          roomStatusMap={roomStatusMap}
          coupons={coupons}
          appliedCouponCode={appliedCouponCode}
          onApplyCoupon={(code) => handleApplyCoupon(code)}
          addons={addons}
          selectedAddons={selectedAddons}
          onToggleAddon={toggleAddon}
          weather={weather}
          formatShortDate={(d) => formatShortDate(d, lang)}
          onOpenRoomDetails={(rm) => openRoomDrawer(rm, "details")}
          onSwitchToBookTab={() => navigateToTab("room")}
          onNavigateToChatPage={() => navigateToTab("chat")}
          isOnChatPage={activeTab === "chat"}
          isOpen={isDesktopChatOpen}
          onOpenChange={setIsDesktopChatOpen}
          initialPrompt={pendingChatPrompt}
          onConsumeInitialPrompt={() => setPendingChatPrompt(null)}
        />

        {/* 5. GLOBAL ROOM DETAILS & 15-MINUTE QR BOOKING MODAL (Unified with RoomGalleryModal) */}
        {isSidebarOpen && sidebarRoom && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden"
          >
            <div
              className={`fixed inset-0 bg-black/60 ${
                cameFromGallery ? "" : "animate-fade-in-backdrop"
              }`}
              onClick={() => {
                setActiveRoom(null);
                setCameFromGallery(false);
              }}
            />

            <div
              className={`relative w-full h-[95dvh] max-h-[95dvh] lg:h-[95vh] lg:max-h-[95vh] lg:w-[90vw] lg:max-w-4xl xl:max-w-[960px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] rounded-t-[24px] rounded-b-none shadow-2xl flex flex-col overflow-hidden z-10 border-t border-x border-[var(--color-border)] border-b-0 ${
                cameFromGallery ? "" : "animate-slide-up-modal"
              }`}
            >
              {/* Sticky Modal Header */}
              <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background-card)] px-4 sm:px-6 py-3 shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (drawerTab === "booking" && !activeHoldBooking) {
                        setCameFromGallery(false);
                        setDrawerTab("details");
                      } else {
                        setReturningToGallery(true);
                        setGalleryRoom(sidebarRoom);
                        setActiveRoom(null);
                        setGalleryModalOpen(true);
                      }
                    }}
                    aria-label="Back"
                    className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="hidden sm:block min-w-0 flex-1">
                    <h2 className="ty-subtitle truncate">
                      {drawerTab === "booking"
                        ? lang === "th"
                          ? `ยืนยันการจองห้องพัก (${sidebarRoom.code})`
                          : `Confirm Booking (${sidebarRoom.code})`
                        : lang === "th"
                        ? `รายละเอียดและจองห้องพัก (${sidebarRoom.code})`
                        : `Room Details & Add-ons (${sidebarRoom.code})`}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setReturningToGallery(true);
                      setGalleryRoom(sidebarRoom);
                      setActiveRoom(null);
                      setGalleryModalOpen(true);
                    }}
                    title={
                      lang === "th"
                        ? "คลิกเพื่อกลับไปแก้ไขวันเข้าพัก"
                        : "Click to change check-in / check-out dates"
                    }
                    className="inline-flex items-center gap-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] border border-[var(--color-border)] hover:border-[var(--color-border-emphasized)] px-3.5 py-1.5 transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 hidden sm:block" />
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-[11px] text-[var(--color-text-secondary)] hidden md:inline">
                        {lang === "th" ? "เช็คอิน" : "Check-in"}
                      </span>
                      <span className="ty-body font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        {formatNavbarDateCard(checkIn, lang)}
                      </span>
                      <span className="text-[var(--color-text-secondary)] font-semibold">
                        →
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] hidden md:inline">
                        {lang === "th" ? "เช็คเอาท์" : "Check-out"}
                      </span>
                      <span className="ty-body font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        {formatNavbarDateCard(checkOut, lang)}
                      </span>
                    </div>
                    <span className="rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--color-text-primary)] shrink-0">
                      {nights} {lang === "th" ? "คืน" : "nights"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoom(null);
                      setCameFromGallery(false);
                    }}
                    aria-label="Close modal"
                    className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Price Guarantee Countdown Banner */}
              <div className="shrink-0 bg-[var(--color-warning-muted)] border-b border-[var(--color-border)] px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                    {lang === "th" ? (
                      <>
                        <strong>การันตีราคาดีที่สุด</strong> · ล็อคเรทราคานี้ให้คุณภายในเวลาที่กำหนด
                      </>
                    ) : (
                      <>
                        <strong>PRICE GUARANTEED</strong> · We hold this direct booking rate for you
                      </>
                    )}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 py-0.5 font-mono text-[12px] font-semibold shrink-0">
                  <Timer className="w-3 h-3" />
                  <span>
                    {String(Math.floor(priceGuaranteeSeconds / 60)).padStart(
                      2,
                      "0"
                    )}
                    :{String(priceGuaranteeSeconds % 60).padStart(2, "0")}
                  </span>
                </span>
              </div>

              {/* Modal Viewport: Full-Width Step Panels */}
              <div className="flex-1 relative overflow-hidden bg-[var(--color-background-card)]">
                {drawerTab === "details" ? (
                  /* STEP 2: รายละเอียดและจองห้องพัก (Room Details & Add-ons) */
                  <div
                    key="step-details"
                    ref={sidebarScrollRef}
                    className={`w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--color-background-card)] flex flex-col ${
                      cameFromGallery
                        ? "animate-modal-step-in-right"
                        : "animate-modal-step-in-left"
                    }`}
                  >
                  <div className="w-full sm:px-6 sm:pt-5">
                    <div className="relative aspect-[16/10] sm:aspect-auto sm:h-[380px] lg:h-[420px] w-full shrink-0 overflow-hidden bg-[var(--color-background-muted)] rounded-none sm:rounded-[16px] border-b sm:border border-[var(--color-border)]">
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
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/65 text-white flex items-center justify-center transition cursor-pointer"
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/65 text-white flex items-center justify-center transition cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-[12px] font-semibold text-white">
                        {drawerSlideIndex + 1}/{sidebarRoom.images.length}
                      </div>
                    </div>
                  </div>

                  <div className="w-full p-5 sm:p-6 space-y-6">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-block rounded-full bg-[var(--color-neutral)] px-3 py-1 ty-caption font-semibold uppercase">
                            {(sidebarRoom.inventoryMode || "SINGLE_UNIT") ===
                            "SINGLE_UNIT"
                              ? lang === "th"
                                ? "บ้านเดี่ยวส่วนตัว (Private Villa)"
                                : "Private Villa · Single Unit"
                              : lang === "th"
                              ? `ว่าง ${
                                  roomStatusMap[sidebarRoom.id]
                                    ?.availableUnits ?? 0
                                } / ${sidebarRoom.totalUnits} ห้อง`
                              : `${
                                  roomStatusMap[sidebarRoom.id]
                                    ?.availableUnits ?? 0
                                } / ${sidebarRoom.totalUnits} Available`}
                          </span>

                          <div className="inline-flex items-center gap-1.5">
                            <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 py-0.5 text-[12px] font-semibold">
                              9.6
                            </span>
                            <span className="ty-caption font-semibold text-[var(--color-text-primary)]">
                              {lang === "th" ? "ยอดเยี่ยมมาก" : "Exceptional"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="ty-title">
                              {lang === "th"
                                ? sidebarRoom.nameTh
                                : sidebarRoom.nameEn}
                            </h3>
                            <div className="inline-flex items-center gap-0.5 text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                          </div>
                          <p className="ty-caption mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === "th"
                                ? propertyConfig.locationTh
                                : propertyConfig.locationEn}
                            </span>
                          </p>
                        </div>

                        <div className="space-y-2 ty-body-muted pt-1">
                          {(lang === "th"
                            ? sidebarRoom.longDescTh
                            : sidebarRoom.longDescEn?.length
                            ? sidebarRoom.longDescEn
                            : sidebarRoom.longDescTh
                          ).map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </div>

                      {/* Highlights */}
                      <div className="pt-5 border-t border-[var(--color-border)] space-y-4">
                        <h4 className="ty-subtitle">
                          {lang === "th"
                            ? "จุดเด่นของห้องพักนี้"
                            : "Top reasons for booking"}
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
                              <BedDouble className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="ty-body font-semibold">
                                {lang === "th"
                                  ? "ความสะดวกสบายและคุณภาพเตียงนอนระดับพรีเมียม"
                                  : "Premium bedding & exceptional sleep comfort"}
                              </p>
                              <p className="ty-caption flex items-center gap-1.5 mt-0.5">
                                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>
                                  {lang === "th"
                                    ? "98% ของผู้เข้าพักประทับใจความสบายของห้องพัก"
                                    : "98% of guests rated room comfort 5 stars"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="ty-body font-semibold">
                                {lang === "th"
                                  ? `พื้นที่ใช้สอยกว้างขวาง ${sidebarRoom.sizeSqm} ตร.ม. พร้อมระเบียงชมวิวส่วนตัว`
                                  : `Spacious ${sidebarRoom.sizeSqm} m² layout with private panoramic terrace`}
                              </p>
                              <p className="ty-caption mt-0.5">
                                {lang === "th"
                                  ? `รองรับผู้เข้าพักมาตรฐาน ${sidebarRoom.baseGuests} ท่าน (สูงสุด ${sidebarRoom.maxGuests} ท่าน)`
                                  : `Standard occupancy ${sidebarRoom.baseGuests} guests (max ${sidebarRoom.maxGuests} guests)`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Facilities */}
                      <div className="pt-5 border-t border-[var(--color-border)] space-y-4">
                        <h4 className="ty-subtitle">
                          {lang === "th"
                            ? `สิ่งอำนวยความสะดวกในห้องพัก (${sidebarRoom.code})`
                            : `Room Amenities & Facilities (${sidebarRoom.code})`}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {(lang === "en" && sidebarRoom.amenitiesEn
                            ? [
                                ...sidebarRoom.amenitiesEn.outdoor,
                                ...sidebarRoom.amenitiesEn.dining,
                                ...sidebarRoom.amenitiesEn.common,
                              ]
                            : [
                                ...sidebarRoom.amenities.outdoor,
                                ...sidebarRoom.amenities.dining,
                                ...sidebarRoom.amenities.common,
                              ]
                          ).map((item, idx) => {
                            const { Icon, toneClass } =
                              getFacilityIconMeta(item);
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
                                <span className="ty-body font-medium">
                                  {item}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Night-by-Night Breakdown & Add-ons */}
                      <div className="pt-5 border-t border-[var(--color-border)] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="ty-subtitle">
                            {lang === "th"
                              ? `รายละเอียดราคารายคืน (${nights} คืน: ${formatShortDate(
                                  checkIn,
                                  lang
                                )} – ${formatShortDate(checkOut, lang)})`
                              : `Nightly Rate Breakdown (${nights} nights: ${formatShortDate(
                                  checkIn,
                                  lang
                                )} – ${formatShortDate(checkOut, lang)})`}
                          </h4>
                          {sidebarRoom.discountPercent > 0 && (
                            <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 py-0.5 text-[12px] font-semibold">
                              {lang === "th"
                                ? `ประหยัด ${sidebarRoom.discountPercent}%`
                                : `SAVE ${sidebarRoom.discountPercent}%`}
                            </span>
                          )}
                        </div>

                        <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] ty-body">
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
                                  <span className="font-semibold">
                                    {lang === "th"
                                      ? `คืน ${formatShortDate(
                                          nItem.dateStr,
                                          lang
                                        )}`
                                      : `Night of ${formatShortDate(
                                          nItem.dateStr,
                                          lang
                                        )}`}
                                  </span>
                                  <span className="ty-caption">
                                    (
                                    {lang === "th"
                                      ? nItem.rateLabelTh
                                      : nItem.rateLabelEn || nItem.rateLabelTh}
                                    )
                                  </span>
                                  {isNightBooked ? (
                                    <span className="rounded-full bg-[var(--color-error-muted)] text-[var(--color-error)] px-2 py-0.5 text-[12px] font-semibold">
                                      {lang === "th" ? "เต็มคืนนี้" : "Booked"}
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2 py-0.5 text-[12px] font-semibold">
                                      {lang === "th" ? "ว่าง" : "Available"}
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold">
                                  ฿{nItem.finalNightlyRate.toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add-ons Upsell */}
                        <div className="pt-4 space-y-3">
                          <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <h4 className="ty-subtitle">
                                {lang === "th"
                                  ? "บริการเสริมพิเศษเสิร์ฟถึงห้องพัก (เลือกเพิ่มได้)"
                                  : "Optional In-Villa Add-ons & Experiences"}
                              </h4>
                              <p className="ty-caption mt-0.5">
                                {lang === "th"
                                  ? "สั่งจองล่วงหน้าพร้อมห้องพักได้ทันที"
                                  : "Pre-order dining or spa packages with your villa"}
                              </p>
                            </div>
                            {selectedAddons.length > 0 && (
                              <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-3 py-1 text-[12px] font-semibold">
                                {lang === "th"
                                  ? `✓ เลือกแล้ว ${selectedAddons.reduce(
                                      (sum, id) =>
                                        sum + (addonQuantities[id] || 1),
                                      0
                                    )} รายการ (+฿${activePricing.addonsTotal.toLocaleString()})`
                                  : `✓ ${selectedAddons.reduce(
                                      (sum, id) =>
                                        sum + (addonQuantities[id] || 1),
                                      0
                                    )} selected (+฿${activePricing.addonsTotal.toLocaleString()})`}
                              </span>
                            )}
                          </div>

                          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                            {addons
                              .filter((a) => a.isActive)
                              .map((addon) => {
                                const quantity = addonQuantities[addon.id] || 0;
                                const checked = quantity > 0;
                                const itemTotalPrice =
                                  addon.priceThb * (quantity || 1);

                                return (
                                  <div
                                    key={addon.id}
                                    className={`py-3 rounded-[16px] flex items-center justify-between gap-3.5 transition my-1.5 border ${
                                      checked ? "border-none" : "border-transparent"
                                    }`}
                                  >
                                    <div
                                      className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                                      onClick={() => {
                                        if (!checked) {
                                          updateAddonQuantity(addon.id, 1);
                                        }
                                      }}
                                    >
                                      <img
                                        src={
                                          addon.imageUrl ||
                                          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
                                        }
                                        alt={
                                          lang === "th"
                                            ? addon.nameTh
                                            : addon.nameEn
                                        }
                                        className="w-16 h-16 rounded-[12px] object-cover shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <h5 className="ty-body font-bold truncate">
                                          {lang === "th"
                                            ? addon.nameTh
                                            : addon.nameEn}
                                        </h5>
                                        <p className="ty-caption line-clamp-1">
                                          {lang === "th"
                                            ? addon.descTh
                                            : addon.descEn}
                                        </p>
                                        <p className="ty-body font-semibold mt-0.5">
                                          +฿{addon.priceThb.toLocaleString()}{" "}
                                          <span className="ty-caption font-normal">
                                            /{" "}
                                            {lang === "th"
                                              ? addon.unitTh
                                              : addon.unitEn}
                                          </span>
                                          {quantity > 1 && (
                                            <span className="ml-2 text-[12px] font-bold text-[var(--color-text-primary)]">
                                              (
                                              {lang === "th" ? "รวม" : "Total"}{" "}
                                              ฿{itemTotalPrice.toLocaleString()}
                                              )
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Stepper Quantity Controls when selected, or Add Button when not selected */}
                                    <div className="shrink-0 flex items-center">
                                      {checked ? (
                                        <div className="inline-flex items-center rounded-full bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] p-0.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateAddonQuantity(addon.id, -1);
                                            }}
                                            aria-label={
                                              lang === "th"
                                                ? "ลดจำนวน"
                                                : "Decrease quantity"
                                            }
                                            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] transition cursor-pointer"
                                          >
                                            <Minus className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="w-8 text-center text-[13px] font-bold tabular-nums text-[var(--color-text-primary)]">
                                            {quantity}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateAddonQuantity(addon.id, 1);
                                            }}
                                            aria-label={
                                              lang === "th"
                                                ? "เพิ่มจำนวน"
                                                : "Increase quantity"
                                            }
                                            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] transition cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateAddonQuantity(addon.id, 1);
                                          }}
                                          className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] hover:bg-[var(--color-background-card)] text-[var(--color-text-primary)] transition cursor-pointer shrink-0"
                                        >
                                          {lang === "th"
                                            ? "+ เลือกเพิ่ม"
                                            : "+ Add"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STEP 3: ยืนยันการจองห้องพัก (Guest Form, Summary & PromptPay QR) */
                  <div
                    key="step-booking"
                    ref={bookingSlideScrollRef}
                    className="w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--color-background-card)] animate-modal-step-in-right"
                  >
                    <div className="w-full p-5 sm:p-6">
                      {activeHoldBooking ? (
                        <div className="space-y-4">
                          {activeHoldBooking.status === "HOLD_15_MIN" && (
                            <div className="rounded-[20px] bg-[var(--color-warning-muted)] border border-[var(--color-border)] p-4 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <Timer className="w-5 h-5 shrink-0" />
                                  <div>
                                    <p className="ty-body font-bold">
                                      {lang === "th"
                                        ? `ล็อคห้อง ${activeHoldBooking.roomCode} ชั่วคราวให้คุณแล้ว! (${activeHoldBooking.bookingCode})`
                                        : `Villa ${activeHoldBooking.roomCode} is temporarily held for you! (${activeHoldBooking.bookingCode})`}
                                    </p>
                                    <p className="ty-caption">
                                      {lang === "th"
                                        ? "กรุณาชำระเงินและแนบสลิปภายใน 15 นาที"
                                        : "Please complete payment and upload your transfer slip within 15 minutes"}
                                    </p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-3 py-1 font-mono text-[12px] font-bold shrink-0">
                                  {String(
                                    Math.floor(holdSecondsLeft / 60)
                                  ).padStart(2, "0")}
                                  :
                                  {String(holdSecondsLeft % 60).padStart(2, "0")}
                                </span>
                              </div>
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCancelHoldBooking(activeHoldBooking.id)
                                  }
                                  className="ty-caption font-semibold text-[var(--color-error)] hover:underline cursor-pointer"
                                >
                                  {lang === "th"
                                    ? "ยกเลิกการล็อคห้องชั่วคราว"
                                    : "Cancel temporary hold"}
                                </button>
                              </div>
                            </div>
                          )}

                          {activeHoldBooking.status === "PENDING_ADMIN" ||
                          activeHoldBooking.status === "CONFIRMED" ? (
                            <DigitalBookingVoucherCard
                              booking={activeHoldBooking}
                              propertyName={
                                lang === "th"
                                  ? propertyConfig.nameTh
                                  : propertyConfig.nameEn
                              }
                              lang={lang}
                              formatShortDateFn={formatShortDate}
                              onClose={() => {
                                setActiveRoom(null);
                                setCameFromGallery(false);
                              }}
                            />
                          ) : (
                            <AutoQrPaymentCard
                              lang={lang}
                              promptPayId={propertyConfig.promptPayId}
                              promptPayAccountName={
                                propertyConfig.promptPayAccountName
                              }
                              amountThb={activeHoldBooking.totalPriceThb}
                              isScanningSlip={isScanningSlip}
                              slipScanFeedback={slipScanFeedback}
                              onUploadSlip={handleSlipFileUpload}
                              onSimulateValidSlip={handleSimulateValidSlip}
                              onChangePromptPayId={(nextId) => {
                                saveStore((prev) => ({
                                  ...prev,
                                  propertyConfig: {
                                    ...prev.propertyConfig,
                                    promptPayId: nextId,
                                  },
                                }));
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <form
                          id="sidebar-booking-form"
                          onSubmit={handleCreateHoldBooking}
                          className="space-y-4"
                        >
                          {bookingConflictError && (
                            <div className="rounded-[16px] bg-[var(--color-error-muted)] p-3.5 ty-caption font-semibold text-[var(--color-error)]">
                              ⚠️ {bookingConflictError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Left Column on Desktop: Guest Information Form */}
                            <div className="lg:col-span-7 app-card p-5 space-y-3.5">
                              <h3 className="ty-subtitle">
                                {lang === "th"
                                  ? "ข้อมูลผู้เข้าพัก"
                                  : "Guest Information"}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <StandardInput
                                  label={
                                    lang === "th"
                                      ? "ชื่อ - นามสกุล *"
                                      : "Full Name *"
                                  }
                                  placeholder={
                                    lang === "th"
                                      ? "เช่น คุณกานต์ วงศ์สวัสดิ์"
                                      : "e.g. Alex Mercer"
                                  }
                                  required
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                />
                                <StandardInput
                                  label={
                                    lang === "th"
                                      ? "เบอร์โทรศัพท์ *"
                                      : "Phone Number *"
                                  }
                                  type="tel"
                                  placeholder="08X-XXX-XXXX"
                                  required
                                  value={guestPhone}
                                  onChange={(e) =>
                                    setGuestPhone(e.target.value)
                                  }
                                />
                              </div>
                              <StandardInput
                                label={
                                  lang === "th"
                                    ? "อีเมล หรือ LINE ID"
                                    : "Email or LINE ID"
                                }
                                optionalText={
                                  lang === "th"
                                    ? "สำหรับรับใบยืนยันการจอง"
                                    : "For booking confirmation"
                                }
                                placeholder="name@email.com / LINE ID"
                                value={guestContact}
                                onChange={(e) =>
                                  setGuestContact(e.target.value)
                                }
                              />
                              <StandardInput
                                label={
                                  lang === "th"
                                    ? "คำขอพิเศษเพิ่มเติม"
                                    : "Special Requests"
                                }
                                optionalText={
                                  lang === "th" ? "ไม่บังคับ" : "Optional"
                                }
                                placeholder={
                                  lang === "th"
                                    ? "เช่น ขอเข้าเช็คอินเวลา 15:00 น."
                                    : "e.g. Estimated arrival at 15:00"
                                }
                                value={guestNote}
                                onChange={(e) => setGuestNote(e.target.value)}
                              />
                            </div>

                            {/* Right Column on Desktop: Booking Summary + Promo Code */}
                            <div className="lg:col-span-5 space-y-4">
                              <div className="app-surface-muted p-4 sm:p-5 space-y-3.5">
                                <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                                  <img
                                    src={sidebarRoom.images[0]?.url}
                                    alt={
                                      lang === "th"
                                        ? sidebarRoom.nameTh
                                        : sidebarRoom.nameEn
                                    }
                                    className="h-14 w-20 rounded-[12px] object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 py-0.5 text-[12px] font-bold">
                                      {sidebarRoom.code} ({unitsToBook}{" "}
                                      {lang === "th" ? "หลัง" : "villa"})
                                    </span>
                                    <h4 className="ty-body font-bold mt-0.5 truncate">
                                      {lang === "th"
                                        ? sidebarRoom.nameTh
                                        : sidebarRoom.nameEn}
                                    </h4>
                                    <p className="ty-caption truncate">
                                      {formatShortDate(checkIn, lang)} →{" "}
                                      {formatShortDate(checkOut, lang)} (
                                      {nights}{" "}
                                      {lang === "th" ? "คืน" : "nights"} ·{" "}
                                      {guests}{" "}
                                      {lang === "th" ? "ท่าน" : "guests"})
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1.5 ty-caption">
                                  <div className="flex justify-between">
                                    <span>
                                      {lang === "th"
                                        ? `ค่าห้องพัก (${nights} คืน × ${unitsToBook} หลัง)`
                                        : `Room rate (${nights} nights × ${unitsToBook} villa)`}
                                    </span>
                                    <span className="font-semibold text-[var(--color-text-primary)]">
                                      ฿
                                      {activePricing.roomSubtotal.toLocaleString()}
                                    </span>
                                  </div>
                                  {activePricing.extraBedTotal > 0 && (
                                    <div className="flex justify-between">
                                      <span>
                                        {lang === "th"
                                          ? `เสริมที่นอน (${activePricing.extraGuests} ท่าน)`
                                          : `Extra bed (${activePricing.extraGuests} guests)`}
                                      </span>
                                      <span className="font-semibold text-[var(--color-text-primary)]">
                                        +฿
                                        {activePricing.extraBedTotal.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {activePricing.addonsTotal > 0 && (
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="truncate">
                                        {lang === "th"
                                          ? `บริการเสริม (${selectedAddons
                                              .map((id) => {
                                                const a = addons.find(
                                                  (item) => item.id === id
                                                );
                                                const q =
                                                  addonQuantities[id] || 1;
                                                return a
                                                  ? `${a.nameTh}${
                                                      q > 1 ? ` ×${q}` : ""
                                                    }`
                                                  : "";
                                              })
                                              .filter(Boolean)
                                              .join(", ")})`
                                          : `Add-ons (${selectedAddons
                                              .map((id) => {
                                                const a = addons.find(
                                                  (item) => item.id === id
                                                );
                                                const q =
                                                  addonQuantities[id] || 1;
                                                return a
                                                  ? `${a.nameEn}${
                                                      q > 1 ? ` ×${q}` : ""
                                                    }`
                                                  : "";
                                              })
                                              .filter(Boolean)
                                              .join(", ")})`}
                                      </span>
                                      <span className="font-semibold text-[var(--color-text-primary)] shrink-0">
                                        +฿
                                        {activePricing.addonsTotal.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {activePricing.couponDiscount > 0 && (
                                    <div className="flex justify-between text-[var(--color-success)] font-bold">
                                      <span>
                                        {lang === "th"
                                          ? `ส่วนลดคูปอง (${appliedCouponCode})`
                                          : `Promo discount (${appliedCouponCode})`}
                                      </span>
                                      <span>
                                        −฿
                                        {activePricing.couponDiscount.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-baseline">
                                    <span className="ty-body font-bold text-[var(--color-text-primary)]">
                                      {lang === "th"
                                        ? "ยอดชำระสุทธิ"
                                        : "Net Total"}
                                    </span>
                                    <span className="ty-subtitle font-bold text-[var(--color-text-primary)]">
                                      ฿{activePricing.netTotal.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="app-surface-muted p-4 sm:p-5 space-y-2.5">
                                <label className="ty-body font-bold flex items-center gap-1.5">
                                  <Tag className="w-4 h-4" />
                                  {lang === "th"
                                    ? "คูปองส่วนลด"
                                    : "Promo Code"}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={couponInput}
                                    onChange={(e) =>
                                      setCouponInput(
                                        e.target.value.toUpperCase()
                                      )
                                    }
                                    placeholder={
                                      lang === "th"
                                        ? "กรอกรหัส เช่น SAPAN10"
                                        : "Enter code e.g. SAPAN10"
                                    }
                                    className="h-10 flex-grow rounded-full border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-4 text-[14px] font-mono uppercase focus:outline-none min-w-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleApplyCoupon()}
                                    className="btn-round-solid shrink-0"
                                  >
                                    {lang === "th" ? "ใช้โค้ด" : "Apply"}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {coupons
                                    .filter((c) => c.isActive)
                                    .map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() =>
                                          handleApplyCoupon(c.code)
                                        }
                                        className={`rounded-full px-3 py-1 text-[12px] font-mono font-semibold border cursor-pointer transition ${
                                          appliedCouponCode === c.code
                                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] border-[var(--color-accent)]"
                                            : "bg-[var(--color-background-card)] text-[var(--color-text-primary)] border-[var(--color-border)]"
                                        }`}
                                      >
                                        {c.code}
                                      </button>
                                    ))}
                                </div>
                                {couponError && (
                                  <p className="ty-caption text-[var(--color-error)]">
                                    {couponError}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Bottom Bar (Identical across all 3 modal pages) */}
              <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-background-card)] px-4 sm:px-6 py-3 z-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {sidebarRoom.images?.[0]?.url && (
                    <img
                      src={sidebarRoom.images[0].url}
                      alt={sidebarRoom.code}
                      className="h-11 w-16 rounded-[10px] object-cover border border-[var(--color-border)] shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center rounded bg-[var(--color-accent)] text-[var(--color-on-accent)] px-1.5 py-0.5 text-[11px] font-bold shrink-0">
                        {sidebarRoom.code}
                      </span>
                      <span className="ty-caption truncate">
                        ({nights} {lang === "th" ? "คืน" : "nights"} ·{" "}
                        {unitsToBook} {lang === "th" ? "หลัง" : "villa"})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="ty-title leading-none">
                        ฿{activePricing.netTotal.toLocaleString()}
                      </span>
                      {sidebarRoom.discountPercent > 0 && (
                        <span className="ty-caption line-through">
                          ฿
                          {Math.round(
                            activePricing.netTotal /
                              (1 - sidebarRoom.discountPercent / 100)
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {drawerTab === "details" ? (
                  (roomStatusMap[sidebarRoom.id]?.availableUnits ?? 0) >=
                  unitsToBook ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingConflictError(null);
                        setDrawerTab("booking");
                      }}
                      className="btn-round-solid !px-5 !py-2.5 shrink-0"
                    >
                      <span>
                        {lang === "th"
                          ? "ยืนยันการจองห้องพัก →"
                          : "Proceed to Confirm →"}
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-full bg-[var(--color-error-muted)] text-[var(--color-error)] px-4 py-2 ty-caption font-semibold">
                      {lang === "th" ? "เต็มในวันที่เลือก" : "Sold Out"}
                    </div>
                  )
                ) : !activeHoldBooking ? (
                  <button
                    type="submit"
                    form="sidebar-booking-form"
                    className="btn-round-solid !px-5 !py-2.5 shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {lang === "th"
                        ? "ยืนยันการจอง & รับ QR"
                        : "Confirm & Get QR"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoom(null);
                      setCameFromGallery(false);
                    }}
                    className="btn-round-border shrink-0"
                  >
                    {lang === "th" ? "ปิดหน้าต่างนี้" : "Close Window"}
                  </button>
                )}
              </footer>
            </div>
          </div>
        )}

        {/* 6. FULL-SCREEN PHOTO GALLERY MODAL */}
        <RoomGalleryModal
          isOpen={galleryModalOpen}
          onClose={() => {
            setGalleryModalOpen(false);
            setReturningToGallery(false);
          }}
          selectedRoom={galleryRoom}
          allRooms={rooms}
          propertyConfig={propertyConfig}
          addons={addons}
          experiences={experiences}
          lang={lang}
          onBookRoom={(rm) => openRoomDrawer(rm, "details", true)}
          bookings={bookings}
          today={today}
          checkIn={checkIn}
          setCheckIn={setCheckIn}
          checkOut={checkOut}
          setCheckOut={setCheckOut}
          nights={nights}
          weather={weather}
          skipEntryAnimation={returningToGallery}
        />
      </div>
    </HotelAppContext.Provider>
  );
}
