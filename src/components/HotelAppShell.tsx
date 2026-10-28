"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  BookingRecord,
  ExtraAddon,
  PromoCoupon,
  ResortExperienceItem,
  RoomLodge,
  SeasonalRateRule,
  SpecialDateRateOverride,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import {
  addDaysToDate,
  calculateStayPricingBreakdown,
  formatDateStr,
  getLatestBookingsSnapshot,
  getRoomInventoryForRange,
  RoomInventoryStatus,
  SapanStoreData,
  scanSlipQrFromFile,
  useSapanStore,
} from "@/lib/store";
import {
  formatNavbarDateCard,
  formatShortDate,
  LanguageCode,
} from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import { LiveWeatherData, useResortWeather } from "@/lib/weather";
import { StandardFeedContainer } from "@/components/ui/standards";
import type { DailyAvailabilityInfo } from "@/components/booking/StayDatePickerBar";
import {
  getTabIdFromPathname,
  HOTEL_NAV_TABS,
  HotelNavTabId,
} from "@/components/navigation/NavigationIcons";
import { PrimaryNavigation } from "@/components/navigation/PrimaryNavigation";
import type {
  BookingCalendarOrigin,
  GuestBookingFormValues,
  RoomBookingDrawerStep,
} from "@/components/drawers/RoomBookingDrawer";

const AiChatDesktopDrawer = dynamic(
  () =>
    import("@/components/chat/AiConciergeChat").then(
      (mod) => mod.AiChatDesktopDrawer
    ),
  { ssr: false }
);

const CouponWalletDrawer = dynamic(
  () =>
    import("@/components/drawers/CouponWalletDrawer").then(
      (mod) => mod.CouponWalletDrawer
    ),
  { ssr: false }
);

const RoomBookingDrawer = dynamic(
  () =>
    import("@/components/drawers/RoomBookingDrawer").then(
      (mod) => mod.RoomBookingDrawer
    ),
  { ssr: false }
);

const RoomGalleryDrawer = dynamic(
  () =>
    import("@/components/drawers/RoomGalleryDrawer").then(
      (mod) => mod.RoomGalleryDrawer
    ),
  { ssr: false }
);

export { formatNavbarDateCard, formatShortDate, getFacilityIconMeta };

export type Lang = LanguageCode;
export type ThemeMode = "light" | "dark";
export type RoomFilterMode =
  | "all"
  | "available"
  | "VILLA"
  | "SUITE"
  | "DELUXE";

const SAVED_COUPONS_STORAGE_KEY = "my-hotel-saved-coupons";
const THEME_STORAGE_KEY = "my-hotel-theme";
const LANGUAGE_STORAGE_KEY = "my-hotel-lang";

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
  setLang: (nextLang: Lang) => void;
  theme: ThemeMode;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleTheme: () => void;
  checkIn: string;
  setCheckIn: (nextCheckIn: string) => void;
  checkOut: string;
  setCheckOut: (nextCheckOut: string) => void;
  guests: number;
  setGuests: (nextGuests: number) => void;
  nights: number;
  weather: LiveWeatherData | null;
  weatherLoading: boolean;
  roomStatusMap: Record<string, RoomInventoryStatus>;
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
  savedCouponCodes: string[];
  isCouponWalletOpen: boolean;
  openCouponWallet: () => void;
  closeCouponWallet: () => void;
  saveCouponToWallet: (
    couponCode: string
  ) => { success: boolean; message: string };
  removeCouponFromWallet: (couponCode: string) => void;
  claimAndApplyCoupon: (
    couponCode: string
  ) => { success: boolean; message: string };
  appliedCouponCode: string | null;
  setAppliedCouponCode: (code: string | null) => void;
  couponInput: string;
  setCouponInput: (code: string) => void;
  couponError: string | null;
  handleApplyCoupon: (codeToApply?: string) => void;
  openCalendarDrawer: () => void;
  openRoomDrawer: (
    room: RoomLodge,
    initialStep?: RoomBookingDrawerStep
  ) => void;
  openGalleryModal: (room: RoomLodge | null) => void;
  navigateToTab: (tab: HotelNavTabId) => void;
  pendingChatPrompt: string | null;
  setPendingChatPrompt: (prompt: string | null) => void;
  submitChatPrompt: (prompt: string) => void;
  initialShortIndex: number | null;
  openShortsAt: (index: number) => void;
  roomFilterMode: RoomFilterMode;
  setRoomFilterMode: (mode: RoomFilterMode) => void;
  hideSoldOutRooms: boolean;
  setHideSoldOutRooms: React.Dispatch<React.SetStateAction<boolean>>;
}

const HotelAppContext = createContext<HotelAppContextValue | null>(null);

export function useHotelApp(): HotelAppContextValue {
  const context = useContext(HotelAppContext);
  if (!context) {
    throw new Error("useHotelApp must be used within HotelAppShell");
  }
  return context;
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
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    return currentDate;
  }, []);

  const [lang, setLangState] = useState<Lang>("th");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  const applyThemeClassToDocument = useCallback((mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, []);

  // Hydrate persisted theme, language, and saved coupons bag on client mount
  const [savedCouponCodes, setSavedCouponCodes] = useState<string[]>([]);
  const [isCouponWalletOpen, setIsCouponWalletOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const persistedTheme = localStorage.getItem(
        THEME_STORAGE_KEY
      ) as ThemeMode | null;
      if (persistedTheme === "dark" || persistedTheme === "light") {
        setThemeState(persistedTheme);
        applyThemeClassToDocument(persistedTheme);
      } else {
        applyThemeClassToDocument("light");
      }

      const persistedLanguage = localStorage.getItem(
        LANGUAGE_STORAGE_KEY
      ) as Lang | null;
      if (persistedLanguage === "th" || persistedLanguage === "en") {
        setLangState(persistedLanguage);
      }

      const persistedCouponsJson = localStorage.getItem(
        SAVED_COUPONS_STORAGE_KEY
      );
      if (persistedCouponsJson) {
        const parsedCodes = JSON.parse(persistedCouponsJson);
        if (Array.isArray(parsedCodes)) {
          setSavedCouponCodes(
            parsedCodes
              .filter((item): item is string => typeof item === "string")
              .map((code) => code.trim().toUpperCase())
              .filter(Boolean)
          );
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, [applyThemeClassToDocument]);

  const persistSavedCoupons = useCallback((nextCodes: string[]) => {
    setSavedCouponCodes(nextCodes);
    try {
      localStorage.setItem(
        SAVED_COUPONS_STORAGE_KEY,
        JSON.stringify(nextCodes)
      );
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      applyThemeClassToDocument(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage write errors
      }
    },
    [applyThemeClassToDocument]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Right Sidebar Drawers State
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(
    null
  );
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [initialShortIndex, setInitialShortIndex] = useState<number | null>(
    null
  );
  const [isGalleryDrawerOpen, setIsGalleryDrawerOpen] = useState(false);
  const [selectedGalleryRoom, setSelectedGalleryRoom] =
    useState<RoomLodge | null>(null);
  const [calendarOrigin, setCalendarOrigin] =
    useState<BookingCalendarOrigin>("room");
  const [activeBookingRoom, setActiveBookingRoom] =
    useState<RoomLodge | null>(null);
  const [displayedBookingRoom, setDisplayedBookingRoom] =
    useState<RoomLodge | null>(null);

  const openCouponWallet = useCallback(() => {
    setIsChatDrawerOpen(false);
    setActiveBookingRoom(null);
    setIsGalleryDrawerOpen(false);
    setIsCouponWalletOpen(true);
  }, []);

  const closeCouponWallet = useCallback(() => {
    setIsCouponWalletOpen(false);
  }, []);

  const activeTab = getTabIdFromPathname(pathname);

  const navigateToTab = useCallback(
    (targetTab: HotelNavTabId) => {
      if (targetTab === "chat") {
        setIsCouponWalletOpen(false);
        setActiveBookingRoom(null);
        setIsGalleryDrawerOpen(false);
        setIsChatDrawerOpen((prevOpen) => !prevOpen);
        if (pathname.startsWith("/chat")) {
          router.replace("/");
        }
        return;
      }

      setIsChatDrawerOpen(false);

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
      const matchingNavTab = HOTEL_NAV_TABS.find(
        (navTab) => navTab.id === targetTab
      );
      if (!matchingNavTab) return;
      router.push(matchingNavTab.href);
    },
    [router, pathname]
  );

  // Direct link support (`/chat` on Mobile, Tablet & Desktop): opens the unified AI Chat Drawer over the storefront
  useEffect(() => {
    if (!pathname.startsWith("/chat")) return;
    setIsCouponWalletOpen(false);
    setActiveBookingRoom(null);
    setIsGalleryDrawerOpen(false);
    setIsChatDrawerOpen(true);
    router.replace("/");
  }, [pathname, router]);

  const submitChatPrompt = useCallback(
    (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt) {
        setPendingChatPrompt(trimmedPrompt);
      }
      setIsCouponWalletOpen(false);
      setActiveBookingRoom(null);
      setIsGalleryDrawerOpen(false);
      setIsChatDrawerOpen(true);
      if (pathname.startsWith("/chat")) {
        router.replace("/");
      }
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

  // Shared Stay Dates, Guests & Filter State
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

  const openGalleryModal = useCallback((room: RoomLodge | null) => {
    setIsChatDrawerOpen(false);
    setIsCouponWalletOpen(false);
    setActiveBookingRoom(null);
    setSelectedGalleryRoom(room);
    setIsGalleryDrawerOpen(true);
  }, []);

  // Room Booking Drawer State
  const [drawerSlideImageIndex, setDrawerSlideImageIndex] = useState<number>(0);
  const [activeBookingStep, setActiveBookingStep] =
    useState<RoomBookingDrawerStep>("calendar");
  const [unitsToBook, setUnitsToBook] = useState<number>(1);
  const [priceGuaranteeRemainingSeconds, setPriceGuaranteeRemainingSeconds] =
    useState<number>(900);

  const [addonQuantities, setAddonQuantities] = useState<
    Record<string, number>
  >({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const setAddonQuantity = useCallback((addonId: string, quantity: number) => {
    const clampedQuantity = Math.max(0, quantity);
    setAddonQuantities((previous) => {
      const updated = { ...previous };
      if (clampedQuantity <= 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = clampedQuantity;
      }
      return updated;
    });
    setSelectedAddons((previous) => {
      if (clampedQuantity <= 0) {
        return previous.filter((id) => id !== addonId);
      }
      return previous.includes(addonId) ? previous : [...previous, addonId];
    });
  }, []);

  const updateAddonQuantity = useCallback((addonId: string, delta: number) => {
    setAddonQuantities((previous) => {
      const currentQuantity = previous[addonId] || 0;
      const nextQuantity = Math.max(0, currentQuantity + delta);
      const updated = { ...previous };
      if (nextQuantity <= 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = nextQuantity;
      }
      setSelectedAddons((previousSelected) => {
        if (nextQuantity <= 0) {
          return previousSelected.filter((id) => id !== addonId);
        }
        return previousSelected.includes(addonId)
          ? previousSelected
          : [...previousSelected, addonId];
      });
      return updated;
    });
  }, []);

  const toggleAddon = useCallback((addonId: string) => {
    setAddonQuantities((previous) => {
      const currentQuantity = previous[addonId] || 0;
      const nextQuantity = currentQuantity > 0 ? 0 : 1;
      const updated = { ...previous };
      if (nextQuantity <= 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = nextQuantity;
      }
      setSelectedAddons((previousSelected) => {
        if (nextQuantity <= 0) {
          return previousSelected.filter((id) => id !== addonId);
        }
        return previousSelected.includes(addonId)
          ? previousSelected
          : [...previousSelected, addonId];
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

  const [guestForm, setGuestForm] = useState<GuestBookingFormValues>({
    guestName: "",
    guestPhone: "",
    guestContact: "",
    guestNote: "",
  });

  const handleUpdateGuestForm = useCallback(
    (updates: Partial<GuestBookingFormValues>) => {
      setGuestForm((previous) => ({ ...previous, ...updates }));
    },
    []
  );

  const [activeHoldBookingId, setActiveHoldBookingId] = useState<string | null>(
    null
  );
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(900);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState<boolean>(false);
  const [slipVerificationFeedback, setSlipVerificationFeedback] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (activeBookingRoom) {
      setDisplayedBookingRoom(activeBookingRoom);
      setPriceGuaranteeRemainingSeconds(900);
      setBookingConflictError(null);
    }
  }, [activeBookingRoom]);

  useEffect(() => {
    setBookingConflictError(null);
    setActiveHoldBookingId(null);
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!activeBookingRoom) return;
    const countdownInterval = setInterval(() => {
      setPriceGuaranteeRemainingSeconds((previous) =>
        previous > 1 ? previous - 1 : 900
      );
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [activeBookingRoom]);

  // Note: Right Sidebar Drawers manage body scroll lock safely via shared reference-counted `useBodyScrollLock`.

  const pendingAdminCount = useMemo(
    () =>
      bookings.filter((booking) => booking.status === "PENDING_ADMIN").length,
    [bookings]
  );

  const nights = useMemo(() => {
    const startDate = new Date(checkIn + "T00:00:00");
    const endDate = new Date(checkOut + "T00:00:00");
    return Math.max(
      1,
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  }, [checkIn, checkOut]);

  const activeHoldBooking = useMemo(
    () =>
      bookings.find((booking) => booking.id === activeHoldBookingId) ?? null,
    [bookings, activeHoldBookingId]
  );

  useEffect(() => {
    if (!activeHoldBooking || activeHoldBooking.status !== "HOLD_15_MIN") {
      return;
    }
    const holdCountdownTimer = setInterval(() => {
      const expiresTimestampMs = new Date(
        activeHoldBooking.holdExpiresAtIso
      ).getTime();
      const remainingSec = Math.max(
        0,
        Math.floor((expiresTimestampMs - Date.now()) / 1000)
      );
      setHoldRemainingSeconds(remainingSec);
      if (remainingSec === 0) {
        saveStore((previous) => ({
          ...previous,
          bookings: previous.bookings.map((booking) =>
            booking.id === activeHoldBooking.id
              ? { ...booking, status: "CANCELLED" }
              : booking
          ),
        }));
      }
    }, 1000);
    return () => clearInterval(holdCountdownTimer);
  }, [activeHoldBooking, saveStore]);

  const getDailyAvailability = useCallback(
    (dateStr: string): DailyAvailabilityInfo => {
      const activeRooms = rooms.filter((room) => room.statusMode === "ACTIVE");
      const currentDay = new Date(dateStr + "T00:00:00");
      const nextDayStr = formatDateStr(addDaysToDate(currentDay, 1));
      let freeUnitsCount = 0;
      let heldUnitsCount = 0;
      let totalActiveUnitsCount = 0;

      for (const room of activeRooms) {
        const inventory = getRoomInventoryForRange(
          room,
          dateStr,
          nextDayStr,
          bookings
        );
        freeUnitsCount += inventory.availableUnits;
        heldUnitsCount += inventory.heldUnits;
        totalActiveUnitsCount += inventory.totalUnits;
      }

      const specialDateMatch = specialDateRates.find(
        (override) => override.isActive && override.dateStr === dateStr
      );
      const seasonalMatch = seasonalRates.find(
        (season) =>
          season.isActive &&
          dateStr >= season.startDate &&
          dateStr <= season.endDate
      );

      return {
        freeRoomsCount: freeUnitsCount,
        heldRoomsCount: heldUnitsCount,
        totalActiveRooms: totalActiveUnitsCount,
        isSpecialOrHoliday: Boolean(specialDateMatch),
        rateBadgeTh: specialDateMatch?.titleTh || seasonalMatch?.badgeTh,
      };
    },
    [rooms, bookings, specialDateRates, seasonalRates]
  );

  const roomStatusMap = useMemo(() => {
    const statusByRoomId: Record<string, RoomInventoryStatus> = {};
    for (const room of rooms) {
      const inventory = getRoomInventoryForRange(
        room,
        checkIn,
        checkOut,
        bookings
      );
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

      const firstNightRate = pricing.nightlyBreakdown[0];
      const hasSpecialOrSeasonalRate = pricing.nightlyBreakdown.some(
        (nightItem) =>
          nightItem.rateType === "SPECIAL_DATE" ||
          nightItem.rateType === "SEASONAL"
      );

      statusByRoomId[room.id] = {
        state: inventory.state,
        totalUnits: inventory.totalUnits,
        availableUnits: inventory.availableUnits,
        conflictDates: inventory.conflictDates,
        capacityOk:
          guests <= room.maxGuests * Math.max(1, inventory.availableUnits),
        effectiveNightlyPrice: pricing.nightlyPrice,
        totalStayRoomPrice: pricing.roomSubtotal,
        activeRateBadgeTh: firstNightRate?.rateLabelTh ?? "Standard Rate",
        hasSpecialOrSeasonalRate,
      };
    }
    return statusByRoomId;
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
        (sum, room) => sum + (roomStatusMap[room.id]?.availableUnits ?? 0),
        0
      ),
    [rooms, roomStatusMap]
  );

  const totalInventoryUnitsCount = useMemo(
    () =>
      rooms.reduce(
        (sum, room) => sum + Math.max(1, room.totalUnits ?? 1),
        0
      ),
    [rooms]
  );

  const findNextAvailableRangeForRoom = useCallback(
    (room: RoomLodge): { nextCheckIn: string; nextCheckOut: string } | null => {
      const baseStartDate = new Date(checkIn + "T00:00:00");
      const stayDurationNights = Math.max(1, nights);
      for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
        const candidateCheckIn = formatDateStr(
          addDaysToDate(baseStartDate, dayOffset)
        );
        const candidateCheckOut = formatDateStr(
          addDaysToDate(baseStartDate, dayOffset + stayDurationNights)
        );
        const inventory = getRoomInventoryForRange(
          room,
          candidateCheckIn,
          candidateCheckOut,
          bookings
        );
        if (inventory.state === "AVAILABLE" && inventory.availableUnits > 0) {
          return {
            nextCheckIn: candidateCheckIn,
            nextCheckOut: candidateCheckOut,
          };
        }
      }
      return null;
    },
    [checkIn, nights, bookings]
  );

  const currentDrawerRoom = activeBookingRoom ?? displayedBookingRoom;

  const activePricingBreakdown = useMemo(() => {
    if (!currentDrawerRoom) {
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
      room: currentDrawerRoom,
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
    currentDrawerRoom,
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

  const openCalendarDrawer = useCallback(() => {
    if (
      activeBookingRoom &&
      activeBookingStep === "calendar" &&
      calendarOrigin === "navbar"
    ) {
      setActiveBookingRoom(null);
      return;
    }

    const initialFocusedRoom = displayedBookingRoom ?? rooms[0] ?? null;
    if (!initialFocusedRoom) {
      return;
    }

    setIsChatDrawerOpen(false);
    setIsCouponWalletOpen(false);
    setIsGalleryDrawerOpen(false);
    setCalendarOrigin("navbar");
    setActiveBookingStep("calendar");
    setDisplayedBookingRoom(initialFocusedRoom);
    setActiveBookingRoom(initialFocusedRoom);
    setBookingConflictError(null);
  }, [
    activeBookingRoom,
    activeBookingStep,
    calendarOrigin,
    displayedBookingRoom,
    rooms,
  ]);

  const openRoomDrawer = useCallback(
    (room: RoomLodge, initialStep: RoomBookingDrawerStep = "calendar") => {
      const latestBookings = getLatestBookingsSnapshot(bookings);
      const existingHoldBooking = latestBookings.find(
        (booking) =>
          booking.roomId === room.id &&
          booking.status === "HOLD_15_MIN" &&
          new Date(booking.holdExpiresAtIso).getTime() > Date.now() &&
          checkIn < booking.checkOut &&
          checkOut > booking.checkIn
      );

      setIsChatDrawerOpen(false);
      setIsCouponWalletOpen(false);
      setIsGalleryDrawerOpen(false);
      setCalendarOrigin(initialStep === "details" ? "details" : "room");

      setDisplayedBookingRoom(room);
      setActiveBookingRoom(room);
      setUnitsToBook(1);
      setDrawerSlideImageIndex(0);
      setSlipVerificationFeedback(null);
      setBookingConflictError(null);

      if (existingHoldBooking) {
        const expiresTimestampMs = new Date(
          existingHoldBooking.holdExpiresAtIso
        ).getTime();
        setHoldRemainingSeconds(
          Math.max(1, Math.floor((expiresTimestampMs - Date.now()) / 1000))
        );
        setActiveHoldBookingId(existingHoldBooking.id);
        setActiveBookingStep(initialStep);
      } else {
        setActiveHoldBookingId(null);
        setActiveBookingStep(initialStep);
      }
    },
    [bookings, checkIn, checkOut]
  );

  const handleSelectBookingRoom = useCallback(
    (nextRoom: RoomLodge) => {
      const latestBookings = getLatestBookingsSnapshot(bookings);
      const existingHoldBooking = latestBookings.find(
        (booking) =>
          booking.roomId === nextRoom.id &&
          booking.status === "HOLD_15_MIN" &&
          new Date(booking.holdExpiresAtIso).getTime() > Date.now() &&
          checkIn < booking.checkOut &&
          checkOut > booking.checkIn
      );

      setDisplayedBookingRoom(nextRoom);
      setActiveBookingRoom(nextRoom);
      setDrawerSlideImageIndex(0);
      setBookingConflictError(null);

      if (existingHoldBooking) {
        const expiresTimestampMs = new Date(
          existingHoldBooking.holdExpiresAtIso
        ).getTime();
        setHoldRemainingSeconds(
          Math.max(1, Math.floor((expiresTimestampMs - Date.now()) / 1000))
        );
        setActiveHoldBookingId(existingHoldBooking.id);
      } else {
        setActiveHoldBookingId(null);
      }
    },
    [bookings, checkIn, checkOut]
  );

  // Coupon Bag ("กระเป๋าคูปอง") Actions
  const saveCouponToWallet = useCallback(
    (rawCode: string): { success: boolean; message: string } => {
      const normalizedCode = rawCode.trim().toUpperCase();
      if (!normalizedCode) {
        return {
          success: false,
          message:
            lang === "th"
              ? "กรุณากรอกรหัสคูปองส่วนลด"
              : "Please enter a promo code",
        };
      }

      const matchingCoupon = coupons.find(
        (coupon) =>
          coupon.isActive && coupon.code.toUpperCase() === normalizedCode
      );
      if (!matchingCoupon) {
        return {
          success: false,
          message:
            lang === "th"
              ? "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว"
              : "Invalid or expired promo code",
        };
      }

      const canonicalCode = matchingCoupon.code.toUpperCase();
      const isAlreadySaved = savedCouponCodes.some(
        (savedCode) => savedCode.toUpperCase() === canonicalCode
      );

      if (!isAlreadySaved) {
        persistSavedCoupons([canonicalCode, ...savedCouponCodes]);
      }

      return {
        success: true,
        message: isAlreadySaved
          ? lang === "th"
            ? `คูปอง ${matchingCoupon.code} อยู่ในกระเป๋าของคุณแล้ว`
            : `Coupon ${matchingCoupon.code} is already in your bag`
          : lang === "th"
          ? `เก็บคูปอง ${matchingCoupon.code} เข้ากระเป๋าเรียบร้อยแล้ว`
          : `Saved ${matchingCoupon.code} to your Coupon Bag`,
      };
    },
    [coupons, lang, persistSavedCoupons, savedCouponCodes]
  );

  const removeCouponFromWallet = useCallback(
    (codeToRemove: string) => {
      const normalizedTarget = codeToRemove.trim().toUpperCase();
      const filteredCodes = savedCouponCodes.filter(
        (savedCode) => savedCode.toUpperCase() !== normalizedTarget
      );
      persistSavedCoupons(filteredCodes);
      if (appliedCouponCode?.toUpperCase() === normalizedTarget) {
        setAppliedCouponCode(null);
        setCouponInput("");
      }
    },
    [appliedCouponCode, persistSavedCoupons, savedCouponCodes]
  );

  const handleApplyCoupon = useCallback(
    (codeToApply?: string) => {
      const normalizedCode = (codeToApply ?? couponInput).trim().toUpperCase();
      setCouponError(null);
      if (!normalizedCode) {
        setAppliedCouponCode(null);
        return;
      }

      const matchingCoupon = coupons.find(
        (coupon) =>
          coupon.isActive && coupon.code.toUpperCase() === normalizedCode
      );
      if (!matchingCoupon) {
        setCouponError(
          lang === "th"
            ? "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว"
            : "Invalid or expired promo code"
        );
        return;
      }

      const canonicalCode = matchingCoupon.code.toUpperCase();
      setCouponInput(matchingCoupon.code);
      setAppliedCouponCode(matchingCoupon.code);

      if (
        !savedCouponCodes.some(
          (savedCode) => savedCode.toUpperCase() === canonicalCode
        )
      ) {
        persistSavedCoupons([canonicalCode, ...savedCouponCodes]);
      }
    },
    [couponInput, coupons, lang, persistSavedCoupons, savedCouponCodes]
  );

  const claimAndApplyCoupon = useCallback(
    (couponCode: string): { success: boolean; message: string } => {
      const claimResult = saveCouponToWallet(couponCode);
      if (claimResult.success) {
        const normalizedCode = couponCode.trim().toUpperCase();
        const matchingCoupon = coupons.find(
          (coupon) =>
            coupon.isActive && coupon.code.toUpperCase() === normalizedCode
        );
        if (matchingCoupon) {
          setCouponError(null);
          setCouponInput(matchingCoupon.code);
          setAppliedCouponCode(matchingCoupon.code);
        }
      }
      return claimResult;
    },
    [coupons, saveCouponToWallet]
  );

  const handleCancelHoldBooking = useCallback(
    (bookingId: string) => {
      saveStore((previous) => ({
        ...previous,
        bookings: previous.bookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "CANCELLED" }
            : booking
        ),
      }));
      setActiveHoldBookingId(null);
      setSlipVerificationFeedback(null);
      setBookingConflictError(null);
    },
    [saveStore]
  );

  const handleCreateHoldBooking = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !currentDrawerRoom ||
      !guestForm.guestName.trim() ||
      !guestForm.guestPhone.trim()
    ) {
      return;
    }
    setBookingConflictError(null);

    const latestBookings = getLatestBookingsSnapshot(bookings);
    const inventoryCheck = getRoomInventoryForRange(
      currentDrawerRoom,
      checkIn,
      checkOut,
      latestBookings
    );
    if (inventoryCheck.availableUnits < unitsToBook) {
      const formattedConflicts =
        inventoryCheck.conflictDates.length > 0
          ? inventoryCheck.conflictDates
              .map((dateStr) => formatShortDate(dateStr, lang))
              .join(", ")
          : `${formatShortDate(checkIn, lang)} – ${formatShortDate(
              checkOut,
              lang
            )}`;
      setBookingConflictError(
        lang === "th"
          ? `ไม่สามารถจองทับวันได้: ${currentDrawerRoom.nameTh} มีผู้จองเต็มแล้วในคืนวันที่ ${formattedConflicts} กรุณาเปลี่ยนวันเข้าพักหรือเลือกบ้านพักหลังอื่นครับ`
          : `Dates unavailable: ${currentDrawerRoom.nameEn} is already booked on ${formattedConflicts}. Please select different dates or another villa.`
      );
      return;
    }

    const bookingRandomCode = Math.floor(1000 + Math.random() * 9000);
    const createdBookingId = `bk-${Date.now()}`;
    const selectedAddonItems = addons
      .filter((addon) => addon.isActive && selectedAddons.includes(addon.id))
      .map((addon) => {
        const quantity = addonQuantities[addon.id] || 1;
        return {
          id: addon.id,
          nameTh:
            quantity > 1
              ? `${addon.nameTh} (×${quantity} ${addon.unitTh})`
              : addon.nameTh,
          priceThb: addon.priceThb * quantity,
        };
      });

    const createdBooking: BookingRecord = {
      id: createdBookingId,
      bookingCode: `SPN-${bookingRandomCode}`,
      roomId: currentDrawerRoom.id,
      roomCode: currentDrawerRoom.code,
      roomNameTh: currentDrawerRoom.nameTh,
      unitsBooked: unitsToBook,
      checkIn,
      checkOut,
      nights,
      guests,
      extraGuests: activePricingBreakdown.extraGuests,
      extraBedTotalThb: activePricingBreakdown.extraBedTotal,
      addonsSelected: selectedAddonItems,
      addonsTotalThb: activePricingBreakdown.addonsTotal,
      couponCode: appliedCouponCode ?? undefined,
      couponDiscountThb: activePricingBreakdown.couponDiscount,
      roomSubtotalThb: activePricingBreakdown.roomSubtotal,
      totalPriceThb: activePricingBreakdown.netTotal,
      depositAmountThb: activePricingBreakdown.netTotal,
      guestName: guestForm.guestName.trim(),
      guestPhone: guestForm.guestPhone.trim(),
      guestContact: guestForm.guestContact.trim(),
      guestNote: guestForm.guestNote.trim(),
      status: "HOLD_15_MIN",
      createdAtIso: new Date().toISOString(),
      holdExpiresAtIso: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      source: "WEBSITE",
    };

    saveStore((previous) => ({
      ...previous,
      bookings: [createdBooking, ...previous.bookings],
    }));

    setHoldRemainingSeconds(900);
    setActiveHoldBookingId(createdBookingId);
  };

  const handleUploadSlipFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedSlipFile = event.target.files?.[0];
    if (!selectedSlipFile || !activeHoldBooking) return;

    setIsVerifyingSlip(true);
    setSlipVerificationFeedback(null);
    try {
      const scanResult = await scanSlipQrFromFile(selectedSlipFile);

      const isDuplicateSlip = bookings.some(
        (booking) =>
          booking.id !== activeHoldBooking.id &&
          booking.slipQrPayload &&
          booking.slipQrPayload === scanResult.qrPayload
      );

      if (isDuplicateSlip) {
        setSlipVerificationFeedback(
          lang === "th"
            ? "⚠️ ระบบตรวจพบว่าสลิปใบนี้เคยถูกใช้ไปแล้ว กรุณาแนบสลิปใบใหม่"
            : "⚠️ This transfer slip has already been used. Please upload a valid new slip."
        );
        setIsVerifyingSlip(false);
        return;
      }

      const shouldAutoConfirm =
        propertyConfig.autoConfirmSlip !== false && scanResult.qrFound;
      const nextBookingStatus = shouldAutoConfirm
        ? "CONFIRMED"
        : "PENDING_ADMIN";

      saveStore((previous) => ({
        ...previous,
        bookings: previous.bookings.map((booking) =>
          booking.id === activeHoldBooking.id
            ? {
                ...booking,
                status: nextBookingStatus,
                slipDataUrl: scanResult.dataUrl,
                slipQrVerified: scanResult.qrFound,
                slipQrPayload: scanResult.qrPayload,
              }
            : booking
        ),
      }));

      setSlipVerificationFeedback(
        shouldAutoConfirm
          ? lang === "th"
            ? `✅ ตรวจสลิปผ่านอัตโนมัติ! ยืนยันการจอง #${activeHoldBooking.bookingCode} เรียบร้อยแล้ว`
            : `✅ Slip verified! Booking #${activeHoldBooking.bookingCode} is now CONFIRMED.`
          : lang === "th"
          ? `✅ สแกน QR บนสลิปสำเร็จ ส่งให้แอดมินตรวจสอบเรียบร้อย!`
          : `✅ Slip QR verified. Submitted for admin approval!`
      );
    } catch {
      setSlipVerificationFeedback(
        lang === "th"
          ? "เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ กรุณาลองอีกครั้ง"
          : "Error reading image file. Please try again."
      );
    } finally {
      setIsVerifyingSlip(false);
    }
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
      savedCouponCodes,
      isCouponWalletOpen,
      openCouponWallet,
      closeCouponWallet,
      saveCouponToWallet,
      removeCouponFromWallet,
      claimAndApplyCoupon,
      appliedCouponCode,
      setAppliedCouponCode,
      couponInput,
      setCouponInput,
      couponError,
      handleApplyCoupon,
      openCalendarDrawer,
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
      setLang,
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
      savedCouponCodes,
      isCouponWalletOpen,
      openCouponWallet,
      closeCouponWallet,
      saveCouponToWallet,
      removeCouponFromWallet,
      claimAndApplyCoupon,
      appliedCouponCode,
      couponInput,
      couponError,
      handleApplyCoupon,
      openCalendarDrawer,
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

  const isNavbarCalendarOpen =
    Boolean(activeBookingRoom) &&
    activeBookingStep === "calendar" &&
    calendarOrigin === "navbar";

  const isBookingRoute =
    activeTab === "book" || activeTab === "home" || activeTab === "room";

  return (
    <HotelAppContext.Provider value={contextValue}>
      <div
        className={`min-h-screen ${
          isBookingRoute ? "pt-14" : "pt-0"
        } bg-[var(--color-background-body)] text-[var(--color-text-primary)] lg:pl-[72px] transition-colors duration-200`}
      >
        {/* 1. Primary Navigation (Desktop Left Sidebar + Top Navbar + Mobile Bottom Bar & Profile Drawer) */}
        <PrimaryNavigation
          activeTab={activeTab}
          onSelectTab={navigateToTab}
          propertyConfig={propertyConfig}
          language={lang}
          onChangeLanguage={setLang}
          theme={theme}
          onToggleTheme={toggleTheme}
          brandCode={propertyConfig.brandCode}
          availableUnitsCount={totalAvailableUnitsCount}
          availableRoomCount={totalAvailableUnitsCount}
          pendingAdminCount={pendingAdminCount}
          savedCouponsCount={savedCouponCodes.length}
          onOpenCouponWallet={openCouponWallet}
          checkInDate={checkIn}
          checkOutDate={checkOut}
          guestCount={guests}
          stayNights={nights}
          isCalendarDrawerOpen={isNavbarCalendarOpen}
          onOpenCalendarDrawer={openCalendarDrawer}
          isChatOpen={isChatDrawerOpen}
        />

        {/* 2. Centered 1140px Storefront Feed */}
        <main className="relative w-full min-w-0 pb-28 lg:pb-14">
          <StandardFeedContainer>{children}</StandardFeedContainer>
        </main>

        {/* 3. Unified AI Concierge Drawer (Full-Screen on Mobile · 460px on Tablet · 520px + Launcher on Desktop) */}
        <AiChatDesktopDrawer
          propertyNameTh={propertyConfig.nameTh}
          propertyNameEn={propertyConfig.nameEn}
          language={lang}
          checkInDate={checkIn}
          checkOutDate={checkOut}
          stayNights={nights}
          guestCount={guests}
          onChangeGuestCount={setGuests}
          rooms={rooms}
          roomStatusMap={roomStatusMap}
          coupons={coupons}
          savedCouponCodes={savedCouponCodes}
          appliedCouponCode={appliedCouponCode}
          onApplyCoupon={(code) => handleApplyCoupon(code)}
          onClaimAndApplyCoupon={(code) => {
            claimAndApplyCoupon(code);
          }}
          onOpenCouponWallet={openCouponWallet}
          addons={addons}
          selectedAddonIds={selectedAddons}
          onToggleAddon={toggleAddon}
          weather={weather}
          formatShortDate={(dateStr) => formatShortDate(dateStr, lang)}
          onOpenRoomDetails={(room) => openRoomDrawer(room, "calendar")}
          onSwitchToBookTab={openCalendarDrawer}
          isOpen={isChatDrawerOpen}
          onOpenChange={(nextOpen) => {
            if (nextOpen) {
              setActiveBookingRoom(null);
              setIsGalleryDrawerOpen(false);
              setIsCouponWalletOpen(false);
            }
            setIsChatDrawerOpen(nextOpen);
          }}
          initialPrompt={pendingChatPrompt}
          onConsumeInitialPrompt={() => setPendingChatPrompt(null)}
        />

        {/* 4. Coupon Bag ("กระเป๋าคูปอง") Right Sidebar Drawer */}
        <CouponWalletDrawer
          isOpen={isCouponWalletOpen}
          onClose={closeCouponWallet}
          language={lang}
          allCoupons={coupons}
          savedCouponCodes={savedCouponCodes}
          appliedCouponCode={appliedCouponCode}
          onSaveCouponToWallet={saveCouponToWallet}
          onRemoveCouponFromWallet={removeCouponFromWallet}
          onApplyCouponCode={(code) => {
            if (!code) {
              setAppliedCouponCode(null);
              setCouponInput("");
            } else {
              handleApplyCoupon(code);
            }
          }}
          onBrowseRooms={() => navigateToTab("room")}
        />

        {/* 5. Unified Stay Calendar, Fast 2-Step Checkout & Room Details Right Sidebar Drawer */}
        <RoomBookingDrawer
          isOpen={Boolean(activeBookingRoom)}
          room={currentDrawerRoom}
          rooms={rooms}
          onSelectRoom={handleSelectBookingRoom}
          activeStep={activeBookingStep}
          onChangeStep={setActiveBookingStep}
          calendarOrigin={calendarOrigin}
          onChangeCalendarOrigin={setCalendarOrigin}
          onClose={() => {
            setActiveBookingRoom(null);
          }}
          onOpenPhotoGallery={(room) => openGalleryModal(room)}
          language={lang}
          propertyConfig={propertyConfig}
          todayDate={today}
          checkInDate={checkIn}
          onChangeCheckInDate={setCheckIn}
          checkOutDate={checkOut}
          onChangeCheckOutDate={setCheckOut}
          stayNights={nights}
          guestCount={guests}
          unitsToBook={unitsToBook}
          availableRoomUnitsCount={totalAvailableUnitsCount}
          roomStatusMap={roomStatusMap}
          bookings={bookings}
          seasonalRates={seasonalRates}
          specialDateRates={specialDateRates}
          weather={weather}
          pricingBreakdown={activePricingBreakdown}
          priceGuaranteeRemainingSeconds={priceGuaranteeRemainingSeconds}
          slideImageIndex={drawerSlideImageIndex}
          onChangeSlideImageIndex={setDrawerSlideImageIndex}
          addons={addons}
          selectedAddonIds={selectedAddons}
          addonQuantities={addonQuantities}
          onUpdateAddonQuantity={updateAddonQuantity}
          coupons={coupons}
          savedCouponCodes={savedCouponCodes}
          appliedCouponCode={appliedCouponCode}
          couponInput={couponInput}
          onChangeCouponInput={setCouponInput}
          couponError={couponError}
          onApplyCoupon={handleApplyCoupon}
          onOpenCouponWallet={() => {
            setActiveBookingRoom(null);
            setIsCouponWalletOpen(true);
          }}
          guestForm={guestForm}
          onChangeGuestForm={handleUpdateGuestForm}
          bookingConflictError={bookingConflictError}
          onClearBookingConflictError={() => setBookingConflictError(null)}
          onSubmitHoldBooking={handleCreateHoldBooking}
          activeHoldBooking={activeHoldBooking}
          holdRemainingSeconds={holdRemainingSeconds}
          onCancelHoldBooking={handleCancelHoldBooking}
          isVerifyingSlip={isVerifyingSlip}
          slipVerificationFeedback={slipVerificationFeedback}
          onUploadSlipFile={handleUploadSlipFile}
        />

        {/* 6. Pure Photo & Video Gallery Right Sidebar Drawer (No Calendar) */}
        <RoomGalleryDrawer
          isOpen={isGalleryDrawerOpen}
          onClose={() => setIsGalleryDrawerOpen(false)}
          selectedRoom={selectedGalleryRoom}
          allRooms={rooms}
          propertyConfig={propertyConfig}
          language={lang}
        />
      </div>
    </HotelAppContext.Provider>
  );
}
