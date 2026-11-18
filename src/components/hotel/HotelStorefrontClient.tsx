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
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Images,
  MapPin,
  MessageCircle,
  Minus,
  PawPrint,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";
import {
  calculateStayPricing,
  computeNightsBetween,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { trackTelemetryEvent } from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import { startRouteProgress } from "@/components/navigation/RouteProgressBar";
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
import { AirbnbStayCalendar } from "@/components/booking/AirbnbStayCalendar";
import {
  RoomBookingDrawer,
  selectBestEligibleCoupon,
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

type AnchorNavId =
  | "photos"
  | "rooms"
  | "amenities"
  | "posts"
  | "reviews"
  | "blog"
  | "more";

const ANCHOR_DOM_IDS: Record<AnchorNavId, string> = {
  photos: "section-photos",
  rooms: "section-rooms",
  amenities: "section-amenities",
  posts: "section-posts",
  reviews: "section-reviews",
  blog: "section-blog",
  more: "section-location",
};

const INITIAL_VISIBLE_ROOMS = 6;

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

  const [activeAnchor, setActiveAnchor] = useState<AnchorNavId>(() =>
    initialTab === "posts" ? "photos" : initialTab
  );
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllPins, setShowAllPins] = useState(false);
  const [onlyAvailableRooms, setOnlyAvailableRooms] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [calendarRoomFilterId, setCalendarRoomFilterId] = useState<string>("ALL");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAnchorBarVisible, setIsAnchorBarVisible] = useState(false);
  const heroHeaderRef = useRef<HTMLElement | null>(null);
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [pinHistoryStack, setPinHistoryStack] = useState<
    Array<{ pin: PinFeedItemDto; scrollY: number }>
  >([]);
  const [detailRestoreScrollY, setDetailRestoreScrollY] = useState<
    number | null
  >(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
  const postsMasonrySectionRef = useRef<HTMLElement | null>(null);
  const openedHotelPinIdRef = useRef<string | null>(null);
  const lastOpenHotelPinIdRef = useRef<string | null>(null);
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
  const [initialCouponCode, setInitialCouponCode] = useState<string | null>(
    null
  );
  const [contactToast, setContactToast] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const didMountFetchRef = useRef(false);

  const scrollToAnchor = useCallback((nextAnchor: AnchorNavId) => {
    setActiveAnchor(nextAnchor);
    if (typeof window === "undefined") return;

    const targetEl = document.getElementById(ANCHOR_DOM_IDS[nextAnchor]);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const url = new URL(window.location.href);
    if (nextAnchor === "photos") {
      url.searchParams.delete("tab");
    } else if (
      nextAnchor === "rooms" ||
      nextAnchor === "posts" ||
      nextAnchor === "reviews" ||
      nextAnchor === "blog" ||
      nextAnchor === "more"
    ) {
      url.searchParams.set("tab", nextAnchor);
    }
    window.history.replaceState(null, "", url.pathname + url.search);
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

  // Sync URL params & optional deep-link anchor scroll on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const paramIn = sp.get("checkIn");
    const paramOut = sp.get("checkOut");
    if (paramIn && /^\d{4}-\d{2}-\d{2}$/.test(paramIn)) setCheckIn(paramIn);
    if (paramOut && /^\d{4}-\d{2}-\d{2}$/.test(paramOut)) setCheckOut(paramOut);
    const paramGuests = Number(sp.get("guests"));
    if (Number.isFinite(paramGuests) && paramGuests >= 1) {
      setGuests(Math.min(12, Math.floor(paramGuests)));
    }

    const paramCoupon = sp.get("coupon");
    if (paramCoupon) {
      setInitialCouponCode(paramCoupon.toUpperCase());
    }

    const paramPin = sp.get("stay") || sp.get("pin");
    if (paramPin) {
      setSelectedPinId(paramPin);
      window.requestAnimationFrame(() => {
        document
          .getElementById("section-posts")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const paramRoom = sp.get("room");
    if (paramRoom) {
      const matched = initialStorefront.rooms.find(
        (r) =>
          r.id === paramRoom ||
          r.code.toLowerCase() === paramRoom.toLowerCase() ||
          r.slug.toLowerCase() === paramRoom.toLowerCase()
      );
      if (matched) {
        setSelectedRoomId(matched.id);
        setDrawerRoom(matched);
        setIsBookingDrawerOpen(true);
      }
    }

    const paramTab = sp.get("tab");
    if (!paramPin && !paramRoom) {
      const targetAnchor: AnchorNavId | null =
        paramTab === "rooms" || paramCoupon
          ? "rooms"
          : paramTab === "posts"
          ? "posts"
          : paramTab === "reviews"
          ? "reviews"
          : paramTab === "blog"
          ? "blog"
          : paramTab === "more" || paramTab === "info"
          ? "more"
          : null;

      if (targetAnchor) {
        setActiveAnchor(targetAnchor);
        window.requestAnimationFrame(() => {
          document
            .getElementById(ANCHOR_DOM_IDS[targetAnchor])
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [initialStorefront.rooms, setCheckIn, setCheckOut, setGuests]);

  // Scroll-spy observer so the Sticky Anchor Bar highlights the current section
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    const entriesOrder: AnchorNavId[] = [
      "photos",
      "rooms",
      "amenities",
      "posts",
      "reviews",
      "more",
      "blog",
    ];
    const domToAnchor = new Map<string, AnchorNavId>(
      entriesOrder.map((a) => [ANCHOR_DOM_IDS[a], a])
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const found = domToAnchor.get(visible[0].target.id);
          if (found) setActiveAnchor(found);
        }
      },
      {
        rootMargin: "-130px 0px -55% 0px",
        threshold: 0.05,
      }
    );

    for (const domId of domToAnchor.keys()) {
      const el = document.getElementById(domId);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [storefront.posts.length]);

  // Show Top Anchor Jump Bar cleanly once scrolled past the 5-square Hero Mosaic
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    const heroEl = heroHeaderRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsAnchorBarVisible(!entry.isIntersecting);
        }
      },
      {
        rootMargin: "-64px 0px 0px 0px",
        threshold: 0,
      }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

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

  const openRoomDetailsDrawer = (room: RoomAvailabilityDto) => {
    trackTelemetryEvent({
      eventType: "HOTEL_PROFILE_VIEW",
      hotelId: storefront.hotel.id,
      provinceId: storefront.hotel.provinceId,
      stayStyles: storefront.hotel.stayStyles.slice(0, 6),
      priceThb: room.weekdayPriceThb,
      guests,
    });
    setDrawerRoom(room);
    setIsBookingDrawerOpen(true);
  };

  const navigateToCheckout = (
    room: RoomAvailabilityDto,
    couponOverride?: string | null
  ) => {
    trackTelemetryEvent({
      eventType: "BOOKING_INITIATE",
      hotelId: storefront.hotel.id,
      provinceId: storefront.hotel.provinceId,
      stayStyles: storefront.hotel.stayStyles.slice(0, 6),
      priceThb: room.weekdayPriceThb,
      guests,
    });
    setSelectedRoomId(room.id);
    const qs = new URLSearchParams({
      room: room.code,
      checkIn,
      checkOut,
      guests: String(guests),
    });
    const resolvedCoupon = couponOverride || initialCouponCode;
    if (resolvedCoupon) {
      qs.set("coupon", resolvedCoupon);
    }
    startRouteProgress();
    router.push(`/${encodeURIComponent(storefront.hotel.slug)}/book?${qs.toString()}`);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktopViewport(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const gridHotelPins = useMemo(
    () =>
      activePin
        ? storefront.pins.filter((p) => p.id !== activePin.id)
        : storefront.pins,
    [storefront.pins, activePin]
  );

  // On mobile/tablet (< 1024px), keep masonry items unfiltered so cards behind mobileOverlayMode never shift on open/close!
  const masonrySectionPins = useMemo(
    () => (activePin && isDesktopViewport ? gridHotelPins : storefront.pins),
    [activePin, isDesktopViewport, gridHotelPins, storefront.pins]
  );

  const visibleGridPins = useMemo(
    () =>
      showAllPins ? masonrySectionPins : masonrySectionPins.slice(0, 10),
    [masonrySectionPins, showAllPins]
  );

  const handleCloseHotelPin = useCallback(() => {
    const closingPinId = lastOpenHotelPinIdRef.current;
    const openedOriginId = openedHotelPinIdRef.current;
    latestPinReqRef.current = null;
    setDetailRestoreScrollY(null);
    setPinHistoryStack([]);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    openedHotelPinIdRef.current = null;
    lastOpenHotelPinIdRef.current = null;

    if (
      typeof window !== "undefined" &&
      closingPinId &&
      openedOriginId &&
      closingPinId !== openedOriginId
    ) {
      window.requestAnimationFrame(() => {
        const cardEl = postsMasonrySectionRef.current?.querySelector<HTMLElement>(
          `[data-masonry-item-id="${closingPinId}"]`
        );
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          if (rect.height > 0) {
            const targetY = Math.max(
              0,
              Math.round(
                rect.top +
                  window.scrollY -
                  Math.max(88, (window.innerHeight - rect.height) * 0.32)
              )
            );
            window.scrollTo({
              top: targetY,
              behavior: "instant" as ScrollBehavior,
            });
          }
        }
      });
    }
  }, []);

  const handleSelectPinFromMasonry = useCallback(
    (pin: PinFeedItemDto, pushStack = true) => {
      setDetailRestoreScrollY(null);
      if (!activePin) {
        openedHotelPinIdRef.current = pin.id;
      }
      if (pushStack && activePin && activePin.id !== pin.id) {
        const currentOverlayScrollY =
          typeof document !== "undefined"
            ? document.querySelector<HTMLElement>(
                '[data-mobile-scroll-container="true"]'
              )?.scrollTop ?? 0
            : 0;
        setPinHistoryStack((prev) =>
          [
            ...prev.filter(
              (entry) =>
                entry.pin.id !== activePin.id && entry.pin.id !== pin.id
            ),
            { pin: activePin, scrollY: currentOverlayScrollY },
          ].slice(-16)
        );
      }
      lastOpenHotelPinIdRef.current = pin.id;
      setSelectedPinSnapshot(pin);
      setPinDetail((prev) => (prev?.pin.id === pin.id ? prev : null));
      setSelectedPinId(pin.id);
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        document
          .getElementById("section-posts")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [activePin]
  );

  const handleStepBackHotelPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleCloseHotelPin();
      return;
    }
    const prevEntry = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((prev) => prev.slice(0, -1));
    setDetailRestoreScrollY(prevEntry.scrollY);
    lastOpenHotelPinIdRef.current = prevEntry.pin.id;
    setSelectedPinSnapshot(prevEntry.pin);
    setPinDetail(null);
    setSelectedPinId(prevEntry.pin.id);
  }, [pinHistoryStack, handleCloseHotelPin]);

  const prevHotelPinPreview = useMemo<PinFeedItemDto | null>(() => {
    if (!activePin) return null;
    if (pinHistoryStack.length > 0) {
      return pinHistoryStack[pinHistoryStack.length - 1]?.pin ?? null;
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

  const handleShareProperty = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/${storefront.hotel.slug}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setContactToast(
      language === "th"
        ? "คัดลอกลิงก์หน้าเพจที่พักแล้ว"
        : "Property link copied"
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

  const {
    hotel,
    rooms,
    coupons,
    reviews,
    dateOverrides,
    bookedUnitsByRoomDate = {},
    posts,
  } = storefront;
  const stayNights = computeNightsBetween(checkIn, checkOut);

  const matchingAvailableRooms = useMemo(
    () => rooms.filter((r) => r.availableUnits > 0 && r.maxGuests >= guests),
    [rooms, guests]
  );

  const sortedAndFilteredRooms = useMemo(() => {
    const q = roomSearchQuery.trim().toLowerCase();
    const searched = q
      ? rooms.filter(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.nameTh.toLowerCase().includes(q) ||
            r.nameEn.toLowerCase().includes(q) ||
            r.categoryTh.toLowerCase().includes(q) ||
            r.categoryEn.toLowerCase().includes(q)
        )
      : [...rooms];

    const afterAvail = onlyAvailableRooms
      ? searched.filter((r) => r.availableUnits > 0 && r.maxGuests >= guests)
      : searched;

    return [...afterAvail].sort((a, b) => {
      const rank = (r: RoomAvailabilityDto) => {
        if (r.availableUnits > 0 && r.maxGuests >= guests) return 0;
        if (r.availableUnits > 0) return 1;
        return 2;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.sortOrder - b.sortOrder;
    });
  }, [rooms, roomSearchQuery, onlyAvailableRooms, guests]);

  const isRoomSearchActive = roomSearchQuery.trim().length > 0;
  const displayedRooms = useMemo(
    () =>
      showAllRooms || isRoomSearchActive
        ? sortedAndFilteredRooms
        : sortedAndFilteredRooms.slice(0, INITIAL_VISIBLE_ROOMS),
    [sortedAndFilteredRooms, showAllRooms, isRoomSearchActive]
  );
  const visibleRoomIdSet = useMemo(
    () => new Set(displayedRooms.map((r) => r.id)),
    [displayedRooms]
  );

  const minRoomPrice = rooms.reduce(
    (min, r) => (r.weekdayPriceThb < min ? r.weekdayPriceThb : min),
    rooms[0]?.weekdayPriceThb ?? 0
  );

  const activeBookingRoom = useMemo(
    () =>
      (selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null) ||
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
    return list;
  }, [rooms]);

  const displayedAmenities = useMemo(
    () =>
      showAllAmenities ? allUniqueAmenities : allUniqueAmenities.slice(0, 8),
    [allUniqueAmenities, showAllAmenities]
  );

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

  const handlePrimaryContactClick = () => {
    if (hotel.contactLine) {
      void handleContactClick("LINE");
    } else if (hotel.facebookPageUrl) {
      void handleContactClick("FACEBOOK_MESSENGER");
    } else if (hotel.contactPhone) {
      void handleContactClick("PHONE");
    } else {
      scrollToAnchor("more");
    }
  };

  const anchorNavItems: Array<{ id: AnchorNavId; label: string }> = [
    {
      id: "photos",
      label: language === "th" ? "รูปภาพ" : "Photos",
    },
    {
      id: "rooms",
      label:
        language === "th"
          ? `ห้องพัก (${rooms.length})`
          : `Rooms (${rooms.length})`,
    },
    {
      id: "amenities",
      label: language === "th" ? "สิ่งอำนวยความสะดวก" : "Amenities",
    },
    {
      id: "posts",
      label:
        language === "th"
          ? `โพสต์ (${storefront.pins.length})`
          : `Posts (${storefront.pins.length})`,
    },
    {
      id: "reviews",
      label:
        language === "th"
          ? `รีวิว (${reviews.length})`
          : `Reviews (${reviews.length})`,
    },
    ...(posts.length > 0
      ? [
          {
            id: "blog" as const,
            label:
              language === "th"
                ? `บทความ (${posts.length})`
                : `Guides (${posts.length})`,
          },
        ]
      : []),
    {
      id: "more",
      label: language === "th" ? "ที่ตั้ง & ข้อควรรู้" : "Location & Policies",
    },
  ];

  return (
    <div className="cgr-page-standard">
      {/* =====================================================================
          ZONE 1 (TOP): AIRBNB TITLE BAR + 1:1 SQUARE BENTO PHOTO MOSAIC
      ====================================================================== */}
      <header
        ref={heroHeaderRef}
        id="section-photos"
        className="scroll-mt-24 space-y-5 pb-4"
      >
        {/* Mobile 1:1 Square Hero Banner (< sm) */}
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
            language === "th" ? "เปิดดูรูปภาพที่พัก" : "View property photos"
          }
          className="sm:hidden relative -mx-4 -mt-5 aspect-square overflow-hidden bg-[var(--color-background-muted)] border-b border-[var(--color-border)] cursor-pointer"
        >
          <img
            src={getOptimizedPinImageUrl(coverBannerUrl, "hero")}
            srcSet={getOptimizedPinImageSrcSet(coverBannerUrl, "hero")}
            sizes="(max-width: 639px) 100vw, 640px"
            alt={hotel.nameTh}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {allCoverSlides.length > 1 && (
            <span className="absolute bottom-3 right-3 h-8 px-3 rounded-[8px] bg-white/95 text-[#222222] border border-[#222222]/20 text-[12px] font-medium inline-flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5" />
              <span>1 / {allCoverSlides.length}</span>
            </span>
          )}
        </div>

        {/* Airbnb Title + Minimal Ghost Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 sm:pt-0">
          <h1 className="text-[23px] sm:text-[26px] font-semibold leading-tight tracking-[-0.016em] text-[var(--color-text-primary)] flex items-center gap-2 min-w-0">
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

          <div className="flex flex-wrap items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShareProperty}
              className="h-9 px-3 rounded-[8px] bg-transparent hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors underline underline-offset-4 decoration-[var(--color-border-emphasized)]"
            >
              <Share2 className="w-4 h-4" />
              <span>{language === "th" ? "แชร์" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrimaryContactClick}
              className="h-9 px-3 rounded-[8px] bg-transparent hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors underline underline-offset-4 decoration-[var(--color-border-emphasized)]"
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
                className="h-9 px-3 rounded-[8px] bg-transparent hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors underline underline-offset-4 decoration-[var(--color-border-emphasized)]"
              >
                <Phone className="w-4 h-4" />
                <span>{hotel.contactPhone}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tablet / Desktop Airbnb Exact 1:1 Squares 5-Photo Grid (aspect-[2/1] · 4 cols x 2 rows) */}
        {allCoverSlides.length >= 5 ? (
          <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative bg-[var(--color-background-muted)]">
            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: allCoverSlides, index: 0 })
              }
              className="col-span-2 row-span-2 relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition"
            >
              <img
                src={getOptimizedPinImageUrl(allCoverSlides[0].url, "hero")}
                srcSet={getOptimizedPinImageSrcSet(allCoverSlides[0].url, "hero")}
                sizes={PIN_IMAGE_SIZES.hero}
                alt={hotel.nameTh}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>

            {allCoverSlides.slice(1, 5).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: allCoverSlides, index: idx + 1 })
                }
                className="col-span-1 row-span-1 relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition"
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "gallery")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "gallery")}
                  sizes={PIN_IMAGE_SIZES.gallery}
                  alt={`${hotel.nameTh} ${idx + 2}`}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: allCoverSlides, index: 0 })
              }
              className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[8px] bg-white/95 hover:bg-white text-[#222222] border border-[#222222] text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Images className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `แสดงรูปภาพทั้งหมด (${allCoverSlides.length})`
                  : `Show all photos (${allCoverSlides.length})`}
              </span>
            </button>
          </div>
        ) : allCoverSlides.length >= 2 ? (
          <div className="hidden sm:grid sm:grid-cols-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative bg-[var(--color-background-muted)]">
            {allCoverSlides.slice(0, 2).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: allCoverSlides, index: idx })
                }
                className="relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition"
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "hero")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "hero")}
                  sizes={PIN_IMAGE_SIZES.hero}
                  alt={`${hotel.nameTh} ${idx + 1}`}
                  loading="eager"
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: allCoverSlides, index: 0 })
              }
              className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[8px] bg-white/95 hover:bg-white text-[#222222] border border-[#222222] text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Images className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `แสดงรูปภาพทั้งหมด (${allCoverSlides.length})`
                  : `Show all photos (${allCoverSlides.length})`}
              </span>
            </button>
          </div>
        ) : (
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
            className="hidden sm:block relative w-full aspect-[2/1] rounded-[12px] lg:rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] border border-[var(--color-border)] cursor-pointer"
          >
            <img
              src={getOptimizedPinImageUrl(coverBannerUrl, "hero")}
              srcSet={getOptimizedPinImageSrcSet(coverBannerUrl, "hero")}
              sizes={PIN_IMAGE_SIZES.hero}
              alt={hotel.nameTh}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </header>

      {/* =====================================================================
          ZONE 2 (NAV_DEFAULT): AIRBNB SCROLL-REVEAL ANCHOR BAR
          Hidden at scroll top so the Hero Mosaic flows seamlessly into Overview!
      ====================================================================== */}
      <nav
        aria-label="Property section navigation"
        aria-hidden={!isAnchorBarVisible}
        className={`fixed top-[var(--cgr-sticky-header-offset,4rem)] inset-x-0 lg:left-[72px] z-30 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 transition-all duration-200 ${
          isAnchorBarVisible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="cgr-page-standard flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {anchorNavItems.map((item) => {
              const isActive = activeAnchor === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToAnchor(item.id)}
                  className={`py-3.5 -mb-px border-b-2 text-[14px] whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-semibold"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {minRoomPrice > 0 && (
            <div className="hidden md:flex items-center gap-3 shrink-0 py-2">
              <div className="text-right">
                <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  ฿{minRoomPrice.toLocaleString()}
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {" "}
                  / {language === "th" ? "คืน" : "night"} · ★{" "}
                  {hotel.ratingAvg.toFixed(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToAnchor("rooms")}
                className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold cursor-pointer transition-colors"
              >
                {language === "th" ? "ดูห้องว่าง" : "Check rooms"}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* =====================================================================
          ZONE 3 (ALONG_SIDEBAR + SIDEBAR): AIRBNB 7 + 1 + 4 ASYMMETRIC GRID
             7 Cols Main Content | 1 Empty Col (~93px Breathing Air) | 4 Cols Sticky Card
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start pt-2 lg:pt-6 pb-12">
        {/* LEFT MAIN COLUMN (7 OF 12 COLS = 58.33%) */}
        <div className="lg:col-span-7 divide-y divide-[var(--color-border)] min-w-0">
          {/* 3A. Overview + Airbnb Guest-Favorite Style Trust Box */}
          <section className="pb-8 space-y-5">
            <div className="space-y-1">
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th"
                  ? `ที่พักจองตรงใน ${hotel.districtTh} จ.${hotel.provinceNameTh}`
                  : `Direct stay in ${hotel.districtTh}, ${hotel.provinceNameEn}`}
              </h2>
              <p className="ty-body text-[var(--color-text-secondary)]">
                {language === "th"
                  ? `${rooms.length} แบบห้องพัก · เช็กอิน ${hotel.checkInTime} น. · ฟรีค่าธรรมเนียมตัวกลาง 0% GP`
                  : `${rooms.length} room types · Check-in ${hotel.checkInTime} · Direct 0% GP`}
              </p>
            </div>

            {/* Airbnb-Style 3-Column Trust & Rating Highlight Box */}
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-6 h-6 text-[var(--color-text-primary)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-tight">
                    {language === "th" ? "ที่พักยืนยันตัวตน" : "Verified Stay"}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                    {language === "th"
                      ? "โอนตรงบัญชีที่พัก 0% GP"
                      : "Direct host payment · 0% GP"}
                  </p>
                </div>
              </div>

              <div className="h-9 w-px bg-[var(--color-border)] shrink-0" />

              <div className="text-center shrink-0 px-1">
                <p className="text-[18px] font-semibold leading-tight text-[var(--color-text-primary)]">
                  {hotel.ratingAvg.toFixed(1)}
                </p>
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center gap-0.5 mt-0.5 text-[var(--color-text-primary)]"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-current" />
                  ))}
                </div>
              </div>

              <div className="h-9 w-px bg-[var(--color-border)] shrink-0" />

              <button
                type="button"
                onClick={() => scrollToAnchor("reviews")}
                className="text-center shrink-0 px-1 cursor-pointer group"
              >
                <p className="text-[18px] font-semibold leading-tight text-[var(--color-text-primary)]">
                  {reviews.length}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] underline group-hover:text-[var(--color-text-primary)]">
                  {language === "th" ? "รีวิวผู้พัก" : "Reviews"}
                </p>
              </button>
            </div>
          </section>

          {/* 3B. Host Identity + Direct Coupons */}
          <section className="py-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={avatarUrl}
                  alt={hotel.nameTh}
                  className="h-12 w-12 rounded-full object-cover bg-[var(--color-background-muted)] border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[var(--color-text-primary)] truncate">
                    {language === "th"
                      ? `ดูแลที่พักโดย ${hotel.nameTh}`
                      : `Hosted by ${hotel.nameEn}`}
                  </p>
                  <p className="text-[13.5px] text-[var(--color-text-secondary)] truncate">
                    @{hotel.slug} ·{" "}
                    {language === "th"
                      ? "ติดต่อและชำระตรงกับเจ้าของที่พัก"
                      : "Direct host communication & booking"}
                  </p>
                </div>
              </div>

              {coupons.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {coupons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (c.isClaimedByMe && activeBookingRoom) {
                          if (activeBookingRoom.availableUnits > 0) {
                            navigateToCheckout(activeBookingRoom, c.code);
                          } else {
                            setInitialCouponCode(c.code);
                            scrollToCalendarSection();
                          }
                        } else {
                          void handleClaimHotelCoupon(c);
                        }
                      }}
                      className="h-8 px-3 rounded-[9px] border border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="text-[var(--color-text-secondary)]">
                        ·{" "}
                        {c.discountType === "PERCENT"
                          ? `ลด ${c.discountValue}%`
                          : `ลด ฿${c.discountValue.toLocaleString()}`}
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
            </div>

            {contactToast && (
              <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-4 py-2.5 text-[13.5px] font-semibold">
                {contactToast}
              </div>
            )}
          </section>

          {/* 3C. Airbnb Key Highlights Stack */}
          <section className="py-8 space-y-5">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-[var(--color-text-primary)] shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-[15.5px] font-medium text-[var(--color-text-primary)]">
                  {language === "th"
                    ? `เช็กอิน ${hotel.checkInTime} น. · เช็กเอาต์ ${hotel.checkOutTime} น.`
                    : `Check-in ${hotel.checkInTime} · Check-out ${hotel.checkOutTime}`}
                </p>
                <p className="ty-caption text-[var(--color-text-secondary)]">
                  {hotel.petsAllowed
                    ? hotel.petPolicyTh ||
                      (language === "th"
                        ? "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                        : "Pets welcome")
                    : hotel.petPolicyTh ||
                      (language === "th"
                        ? "งดนำสัตว์เลี้ยงเข้าพักเพื่อความสงบของผู้เข้าพัก"
                        : "No pets allowed")}
                </p>
              </div>
            </div>

            {hotel.highlights.slice(0, 3).map((hl, idx) => {
              const meta = getFacilityIconMeta(hl.titleTh);
              const HlIcon = meta.Icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <HlIcon className="w-6 h-6 text-[var(--color-text-primary)] shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="text-[15.5px] font-medium text-[var(--color-text-primary)]">
                      {hl.titleTh}
                    </p>
                    <p className="ty-caption text-[var(--color-text-secondary)]">
                      {hl.descTh}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* 3D. Editorial Description */}
          {fullBio && (
            <section className="py-8 space-y-3">
              {(hotel.taglineTh || hotel.taglineEn) &&
                fullBio !== hotel.taglineTh && (
                  <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {language === "th" ? hotel.taglineTh : hotel.taglineEn}
                  </p>
                )}
              <p
                className={`text-[15.5px] leading-[1.65] text-[var(--color-text-primary)] ${
                  !isBioExpanded && fullBio.length > 260 ? "line-clamp-4" : ""
                }`}
              >
                {fullBio}
              </p>
              {fullBio.length > 260 && (
                <button
                  type="button"
                  onClick={() => setIsBioExpanded((v) => !v)}
                  className="text-[14px] font-semibold text-[var(--color-text-primary)] underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>
                    {isBioExpanded
                      ? language === "th"
                        ? "ย่อข้อความ"
                        : "Show less"
                      : language === "th"
                      ? "อ่านเพิ่มเติม"
                      : "Show more"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </section>
          )}

          {/* 3E. DATE-FIRST MULTI-ROOM BOOKING SECTION (#section-rooms) */}
          <section
            id="section-rooms"
            className="py-10 space-y-8 scroll-mt-20 lg:scroll-mt-32"
          >
            {/* STEP 1: DATES & GUESTS FIRST (2-Month Multi-Room Calendar) */}
            <div
              ref={calendarSectionRef}
              id="rooms-calendar-section"
              className="scroll-mt-20 lg:scroll-mt-32"
            >
              <AirbnbStayCalendar
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
                guests={guests}
                onChangeGuests={setGuests}
                stayNights={stayNights}
                hotelName={language === "th" ? hotel.nameTh : hotel.nameEn}
                rooms={rooms}
                calendarRoomFilterId={calendarRoomFilterId}
                onChangeCalendarRoomFilterId={setCalendarRoomFilterId}
                bookedUnitsByRoomDate={bookedUnitsByRoomDate}
                dateOverrides={dateOverrides}
              />
            </div>

            {/* STEP 2: AVAILABLE ROOM TYPES FOR CHOSEN DATES (Scalable for 50+ rooms) */}
            <div
              id="rooms-list-section"
              className="pt-8 border-t border-[var(--color-border-subtle)] space-y-5 scroll-mt-20 lg:scroll-mt-32"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="ty-title text-[var(--color-text-primary)]">
                    {language === "th"
                      ? "2. เลือกประเภทห้องพัก"
                      : "2. Choose your room"}
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
                        )} – ${formatShortDate(checkOut, language)} · ${guests} ท่าน)`
                      : `${matchingAvailableRooms.length} of ${rooms.length} room types available (${formatShortDate(
                          checkIn,
                          language
                        )} – ${formatShortDate(checkOut, language)} · ${guests} guests)`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {rooms.length > 6 && (
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 pointer-events-none" />
                      <input
                        type="search"
                        value={roomSearchQuery}
                        onChange={(e) => setRoomSearchQuery(e.target.value)}
                        placeholder={
                          language === "th"
                            ? "ค้นหาชื่อห้อง / โค้ด..."
                            : "Search room..."
                        }
                        aria-label={
                          language === "th" ? "ค้นหาประเภทห้องพัก" : "Search rooms"
                        }
                        className="h-9 w-[180px] sm:w-[210px] pl-8 pr-7 rounded-[10px] bg-[var(--color-background-muted)] border border-[var(--color-border)] focus:border-[var(--color-text-primary)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                      />
                      {roomSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setRoomSearchQuery("")}
                          aria-label="Clear room search"
                          className="absolute right-2 h-5 w-5 rounded-[6px] hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setOnlyAvailableRooms((v) => !v)}
                    className={`h-9 px-3.5 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-colors ${
                      onlyAvailableRooms
                        ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
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
              </div>

              {sortedAndFilteredRooms.length === 0 && (
                <div className="rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-6 text-center space-y-3">
                  <h3 className="ty-subtitle font-semibold">
                    {isRoomSearchActive
                      ? language === "th"
                        ? `ไม่พบห้องพักที่ตรงกับ "${roomSearchQuery}"`
                        : `No rooms match "${roomSearchQuery}"`
                      : language === "th"
                      ? `ไม่มีห้องว่างสำหรับวันที่ ${formatShortDate(
                          checkIn,
                          language
                        )} – ${formatShortDate(checkOut, language)} (${guests} ท่าน)`
                      : `No rooms available for ${formatShortDate(
                          checkIn,
                          language
                        )} – ${formatShortDate(checkOut, language)} (${guests} guests)`}
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={scrollToCalendarSection}
                      className="h-9 px-4 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-text-primary)] text-[13px] font-semibold text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {language === "th" ? "ดูวันว่างบนปฏิทิน" : "Jump to calendar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyAvailableRooms(false);
                        setRoomSearchQuery("");
                      }}
                      className="h-9 px-4 rounded-[10px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[13px] font-semibold cursor-pointer"
                    >
                      {language === "th"
                        ? `แสดงห้องทั้งหมด (${rooms.length})`
                        : `Show all (${rooms.length})`}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {sortedAndFilteredRooms.map((room) => {
                  const hasUnits = room.availableUnits > 0;
                  const fitsGuests = room.maxGuests >= guests;
                  const matchesInstantFilter = hasUnits && fitsGuests;
                  const isHiddenByPagination = !visibleRoomIdSet.has(room.id);
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
                      aria-hidden={isHiddenByPagination}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={
                        isHiddenByPagination
                          ? "hidden"
                          : `rounded-[16px] bg-[var(--color-background-card)] border p-4 flex flex-col sm:flex-row gap-4 transition-colors cursor-pointer ${
                              isSelectedForBooking
                                ? "border-[#222222] dark:border-[#f5f5f5]"
                                : "border-[var(--color-border)] hover:border-[var(--color-border-emphasized)]"
                            } ${!matchesInstantFilter ? "opacity-80" : ""}`
                      }
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(room.id);
                          openRoomDetailsDrawer(room);
                        }}
                        className="relative w-full sm:w-[164px] h-[200px] sm:h-[164px] rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 cursor-pointer text-left"
                      >
                        <img
                          src={getOptimizedPinImageUrl(roomCover, "gallery")}
                          srcSet={getOptimizedPinImageSrcSet(roomCover, "gallery")}
                          sizes="(max-width: 639px) 100vw, 180px"
                          alt={language === "th" ? room.nameTh : room.nameEn}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[7px] bg-[#222222]/85 backdrop-blur-md !text-white text-[11px] font-semibold">
                          {room.code}
                        </span>

                        {!hasUnits && (
                          <span className="absolute inset-0 bg-black/45 flex items-center justify-center !text-white text-[12px] font-semibold">
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
                            <h3 className="text-[16.5px] leading-snug font-semibold text-[var(--color-text-primary)] truncate">
                              {language === "th" ? room.nameTh : room.nameEn}
                            </h3>
                            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 h-6 text-[11.5px] font-semibold">
                              <span
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 rounded-full ${
                                  !hasUnits
                                    ? "bg-[var(--color-error)]"
                                    : !fitsGuests
                                    ? "bg-[var(--color-warning)]"
                                    : "bg-[var(--color-success)]"
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

                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            {language === "th"
                              ? `สูงสุด ${room.maxGuests} ท่าน · ${room.bedrooms} ห้องนอน · ${room.beds} เตียง · ${room.bathrooms} น้ำ · ${room.sizeSqm} ตร.ม.`
                              : `Up to ${room.maxGuests} guests · ${room.bedrooms} bed · ${room.bathrooms} bath · ${room.sizeSqm} sqm`}
                          </p>

                          <p className="text-[13.5px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
                            {descText}
                          </p>

                          {room.amenities.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {room.amenities.slice(0, 3).map((item) => (
                                <span
                                  key={item}
                                  className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11.5px] text-[var(--color-text-secondary)]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-[var(--color-border-subtle)] flex flex-wrap items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[17.5px] leading-tight font-semibold text-[var(--color-text-primary)]">
                              ฿{room.weekdayPriceThb.toLocaleString()}
                              <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">
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

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoomId(room.id);
                                openRoomDetailsDrawer(room);
                              }}
                              className="h-9 px-3 rounded-[10px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                            >
                              {language === "th" ? "ดูรายละเอียด" : "Details"}
                            </button>
                            {hasUnits ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToCheckout(room);
                                }}
                                className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold cursor-pointer transition-colors"
                              >
                                {language === "th" ? "จองเลย" : "Reserve"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomId(room.id);
                                  setCalendarRoomFilterId(room.id);
                                  scrollToCalendarSection();
                                }}
                                className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                              >
                                {language === "th"
                                  ? "เช็กวันว่างห้องนี้"
                                  : "Check dates"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {sortedAndFilteredRooms.length > INITIAL_VISIBLE_ROOMS &&
                !isRoomSearchActive && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAllRooms((v) => !v)}
                      className="h-11 px-5 rounded-[12px] border border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    >
                      {showAllRooms
                        ? language === "th"
                          ? "ย่อรายการห้องพัก"
                          : "Show fewer rooms"
                        : language === "th"
                        ? `แสดงห้องพักทั้งหมด (${sortedAndFilteredRooms.length} แบบห้อง)`
                        : `Show all ${sortedAndFilteredRooms.length} rooms`}
                    </button>
                  </div>
                )}
            </div>
          </section>

          {/* 3F. AMENITIES SECTION (#section-amenities — Placed cleanly after room selection) */}
          {allUniqueAmenities.length > 0 && (
            <section
              id="section-amenities"
              className="py-10 space-y-5 scroll-mt-20 lg:scroll-mt-32"
            >
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th"
                  ? "ที่พักนี้มีสิ่งอำนวยความสะดวกอะไรบ้าง"
                  : "What this place offers"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8">
                {displayedAmenities.map((item) => {
                  const meta = getFacilityIconMeta(item);
                  const Icon = meta.Icon;
                  return (
                    <div
                      key={item}
                      className="flex items-center gap-3.5 ty-body text-[var(--color-text-primary)] min-w-0"
                    >
                      <Icon className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  );
                })}
              </div>

              {allUniqueAmenities.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllAmenities((v) => !v)}
                  className="h-11 px-5 rounded-[12px] border border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {showAllAmenities
                    ? language === "th"
                      ? "ย่อรายการสิ่งอำนวยความสะดวก"
                      : "Show fewer amenities"
                    : language === "th"
                    ? `แสดงสิ่งอำนวยความสะดวกทั้งหมด (${allUniqueAmenities.length})`
                    : `Show all ${allUniqueAmenities.length} amenities`}
                </button>
              )}
            </section>
          )}
        </div>

        {/* RIGHT STICKY SIDEBAR (4 OF 12 COLS = 33.33%, WITH COL 8 AS 8.33% BREATHING AIR!) */}
        <aside className="lg:col-start-9 lg:col-span-4 lg:sticky lg:top-[128px] mt-10 lg:mt-0">
          {activeBookingRoom && stickyPricing && (
            <div className="rounded-[16px] border border-[#dddddd] dark:border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-4">
              {/* Price Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                    ฿{activeBookingRoom.weekdayPriceThb.toLocaleString()}
                  </span>
                  <span className="ty-caption text-[var(--color-text-secondary)]">
                    / {language === "th" ? "คืน" : "night"}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-text-primary)]">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeBookingRoom.availableUnits > 0
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-error)]"
                    }`}
                  />
                  <span>
                    {activeBookingRoom.availableUnits > 0
                      ? language === "th"
                        ? `ว่าง ${activeBookingRoom.availableUnits} ห้อง`
                        : `${activeBookingRoom.availableUnits} left`
                      : language === "th"
                      ? "เต็มช่วงนี้"
                      : "Full"}
                  </span>
                </span>
              </div>

              {/* Airbnb Unified Bordered Input Box (Date-First: Dates -> Guests -> Room Type) */}
              <div className="rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] overflow-hidden divide-y divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)] bg-[var(--color-background-card)]">
                <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <button
                    type="button"
                    onClick={scrollToCalendarSection}
                    className="px-3 py-2.5 text-left hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      {language === "th" ? "เช็กอิน" : "CHECK-IN"}
                    </span>
                    <span className="block text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
                      {formatShortDate(checkIn, language)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={scrollToCalendarSection}
                    className="px-3 py-2.5 text-left hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      {language === "th" ? "เช็กเอาต์" : "CHECKOUT"}
                    </span>
                    <span className="block text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
                      {formatShortDate(checkOut, language)}
                    </span>
                  </button>
                </div>

                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                      {language === "th" ? "ผู้เข้าพัก" : "GUESTS"}
                    </span>
                    <span className="block text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
                      {guests} {language === "th" ? "ท่าน" : "guests"} (
                      {language === "th" ? "สูงสุด" : "max"}{" "}
                      {activeBookingRoom.maxGuests})
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      aria-label="Decrease guests"
                      className="h-7 w-7 rounded-[8px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-4 text-center text-[13px] font-semibold tabular-nums">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(12, guests + 1))}
                      aria-label="Increase guests"
                      className="h-7 w-7 rounded-[8px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-3 py-2.5">
                  <label
                    htmlFor="sticky-room-selector"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]"
                  >
                    {language === "th" ? "ห้องพักที่เลือก" : "ROOM TYPE"}
                  </label>
                  <select
                    id="sticky-room-selector"
                    value={activeBookingRoom.id}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-transparent text-[13.5px] text-[var(--color-text-primary)] mt-0.5 focus:outline-none cursor-pointer"
                  >
                    {rooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.code} · {language === "th" ? rm.nameTh : rm.nameEn} (฿
                        {rm.weekdayPriceThb.toLocaleString()} ·{" "}
                        {rm.availableUnits > 0
                          ? language === "th"
                            ? `ว่าง ${rm.availableUnits}`
                            : `${rm.availableUnits} left`
                          : language === "th"
                          ? "เต็ม"
                          : "Full"}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Reserve CTA */}
              {activeBookingRoom.availableUnits > 0 &&
              activeBookingRoom.maxGuests >= guests ? (
                <button
                  type="button"
                  onClick={() => navigateToCheckout(activeBookingRoom)}
                  className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                >
                  {language === "th"
                    ? `จองตรงห้อง ${activeBookingRoom.code}`
                    : `Reserve ${activeBookingRoom.code}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (activeBookingRoom.availableUnits === 0) {
                      setCalendarRoomFilterId(activeBookingRoom.id);
                      scrollToCalendarSection();
                    } else {
                      document
                        .getElementById("rooms-list-section")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="w-full h-12 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold cursor-pointer transition-colors"
                >
                  {activeBookingRoom.availableUnits === 0
                    ? language === "th"
                      ? "ห้องเต็มช่วงนี้ · เปลี่ยนวันเข้าพัก"
                      : "Check availability"
                    : language === "th"
                    ? `ผู้เข้าพักเกิน ${activeBookingRoom.maxGuests} ท่าน`
                    : `Max ${activeBookingRoom.maxGuests} guests`}
                </button>
              )}

              <p className="text-center text-[12.5px] text-[var(--color-text-secondary)]">
                {language === "th"
                  ? "ยังไม่เรียกเก็บเงินตอนนี้ · ล็อคห้อง 15 นาทีเพื่อโอนตรงที่พัก"
                  : "You won't be charged yet"}
              </p>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-2 ty-body">
                <div className="flex justify-between text-[var(--color-text-primary)]">
                  <span className="underline decoration-[var(--color-border-emphasized)]">
                    ฿
                    {Math.round(
                      (stickyBasePricing?.roomSubtotalThb ??
                        activeBookingRoom.weekdayPriceThb * stayNights) /
                        stayNights
                    ).toLocaleString()}{" "}
                    × {stayNights} {language === "th" ? "คืน" : "nights"}
                  </span>
                  <span>
                    ฿
                    {(
                      (stickyBasePricing?.roomSubtotalThb ?? 0) -
                      (stickyBasePricing?.extraGuestTotalThb ?? 0)
                    ).toLocaleString()}
                  </span>
                </div>

                {stickyBasePricing && stickyBasePricing.extraGuestTotalThb > 0 && (
                  <div className="flex justify-between text-[var(--color-text-primary)]">
                    <span>
                      {language === "th" ? "ค่าผู้เข้าพักเสริม" : "Extra guest fee"}
                    </span>
                    <span>
                      +฿{stickyBasePricing.extraGuestTotalThb.toLocaleString()}
                    </span>
                  </div>
                )}

                {stickyPricing.discountThb > 0 && stickyBestCoupon && (
                  <div className="flex justify-between text-[var(--color-success)] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        {language === "th"
                          ? `ส่วนลดคูปอง ${stickyBestCoupon.coupon.code}`
                          : `Coupon ${stickyBestCoupon.coupon.code}`}
                      </span>
                    </span>
                    <span>−฿{stickyPricing.discountThb.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>
                    {language === "th"
                      ? "ค่าบริการแพลตฟอร์ม (0% GP)"
                      : "Platform service fee (0% GP)"}
                  </span>
                  <span className="text-[var(--color-text-primary)]">฿0</span>
                </div>

                <div className="pt-3.5 border-t border-[var(--color-border)] flex items-baseline justify-between font-semibold text-[var(--color-text-primary)]">
                  <span>
                    {language === "th" ? "ยอดรวมสุทธิ" : "Total"}
                  </span>
                  <span className="text-[17px]">
                    ฿{stickyPricing.netTotalThb.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* =====================================================================
          ZONE 4 (BELOW_SIDEBAR): FULL 1120PX CONTINUOUS SECTIONS (48px Rhythm)
      ====================================================================== */}

      {/* 4A. PROPERTY POSTS & ATMOSPHERE MASONRY (#section-posts) */}
      <section
        ref={postsMasonrySectionRef}
        id="section-posts"
        className="py-12 border-t border-[var(--color-border)] space-y-6 scroll-mt-20 lg:scroll-mt-32 [overflow-anchor:none]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="ty-title text-[var(--color-text-primary)]">
              {language === "th"
                ? `บรรยากาศและโพสต์จากที่พัก (${storefront.pins.length})`
                : `Moments & posts (${storefront.pins.length})`}
            </h2>
            <p className="ty-caption text-[var(--color-text-secondary)]">
              {language === "th"
                ? "แตะที่รูปหรือวิดีโอเพื่อดูรายละเอียดบรรยากาศจริงแต่ละมุม"
                : "Explore real photos and videos shared by this stay"}
            </p>
          </div>
        </div>

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
            restoreScrollY={detailRestoreScrollY}
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
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-10 text-center ty-body text-[var(--color-text-secondary)]">
            ยังไม่มีรูปภาพหรือวิดีโอที่เผยแพร่สำหรับที่พักนี้
          </div>
        ) : (
          visibleGridPins.length > 0 && (
            <div className="space-y-6">
              <MasonryGrid
                items={visibleGridPins.map((p) => ({
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

              {masonrySectionPins.length > 10 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAllPins((v) => !v)}
                    className="h-11 px-5 rounded-[12px] border border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                  >
                    {showAllPins
                      ? language === "th"
                        ? "ย่อรายการโพสต์"
                        : "Show fewer posts"
                      : language === "th"
                      ? `ดูโพสต์และวิดีโอทั้งหมด (${masonrySectionPins.length})`
                      : `Show all ${masonrySectionPins.length} posts`}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* 4B. GUEST REVIEWS (#section-reviews — Airbnb Borderless 2-Column Editorial Grid) */}
      <section
        id="section-reviews"
        className="py-12 border-t border-[var(--color-border)] space-y-8 scroll-mt-20 lg:scroll-mt-32"
      >
        <div className="flex items-center gap-2.5">
          <Star className="w-6 h-6 fill-current text-[var(--color-text-primary)]" />
          <h2 className="text-[22px] sm:text-[24px] font-semibold text-[var(--color-text-primary)]">
            {hotel.ratingAvg.toFixed(1)} ·{" "}
            {language === "th"
              ? `${reviews.length} รีวิวจากผู้เข้าพักจริง`
              : `${reviews.length} guest reviews`}
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-8 text-center ty-body text-[var(--color-text-secondary)]">
            ยังไม่มีรีวิวสำหรับที่พักนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            {reviews.map((rv) => (
              <article key={rv.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 rounded-full bg-[var(--color-background-muted)] border border-[var(--color-border)] inline-flex items-center justify-center font-semibold text-[15px] text-[var(--color-text-primary)] shrink-0">
                    {rv.authorName[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)] truncate">
                      {rv.authorName}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {rv.roomCode ? `ห้อง ${rv.roomCode} · ` : ""}
                      {formatShortDate(rv.createdAt, language)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[var(--color-text-primary)]">
                  {Array.from({ length: Math.max(1, Math.min(5, rv.rating)) }).map(
                    (_, idx) => (
                      <Star key={idx} className="w-3 h-3 fill-current" />
                    )
                  )}
                </div>

                <p className="text-[15.5px] leading-[1.65] text-[var(--color-text-primary)]">
                  {rv.commentTh}
                </p>

                {rv.photoUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {rv.photoUrls.map((u, idx) => (
                      <img
                        key={idx}
                        src={getOptimizedPinImageUrl(u, "thumb")}
                        srcSet={getOptimizedPinImageSrcSet(u, "thumb")}
                        sizes="112px"
                        alt="Guest photo"
                        loading="lazy"
                        decoding="async"
                        onClick={() =>
                          setFullscreenMedia({
                            slides: rv.photoUrls.map((url) => ({
                              type: "image",
                              url,
                            })),
                            index: idx,
                          })
                        }
                        className="h-20 w-28 rounded-[10px] object-cover cursor-pointer shrink-0 border border-[var(--color-border)]"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 4C. LOCATION & NEIGHBORHOOD MAP (#section-location — Full 1120px Width) */}
      <section
        id="section-location"
        className="py-12 border-t border-[var(--color-border)] space-y-5 scroll-mt-20 lg:scroll-mt-32"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="ty-title text-[var(--color-text-primary)]">
              {language === "th" ? "ที่พักตั้งอยู่ที่ไหน" : "Where you'll be"}
            </h2>
            <p className="ty-body text-[var(--color-text-secondary)] mt-0.5">
              {hotel.addressTh || `${hotel.districtTh} จ.${hotel.provinceNameTh}`}
            </p>
          </div>

          {hotel.googleMapsUrl && (
            <a
              href={hotel.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-[10px] border border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>
                {language === "th" ? "เปิดใน Google Maps" : "Open Google Maps"}
              </span>
            </a>
          )}
        </div>

        {hotel.latitude && hotel.longitude && (
          <div className="h-[320px] sm:h-[380px] rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] border border-[var(--color-border)]">
            <iframe
              title={hotel.nameTh}
              src={`https://maps.google.com/maps?q=${hotel.latitude},${hotel.longitude}&hl=${language}&z=14&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        )}

        {hotel.nearbySpots.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              {language === "th" ? "จุดเช็กอินใกล้เคียง" : "Nearby landmarks"}
            </p>
            <div className="flex flex-wrap gap-2">
              {hotel.nearbySpots.map((spot, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--color-background-muted)] px-3.5 py-2 ty-caption text-[var(--color-text-primary)]"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  <strong className="font-semibold">{spot.nameTh}</strong>
                  <span className="text-[var(--color-text-secondary)]">
                    ({spot.distTh})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4D. HOTEL GUIDES / BLOG (#section-blog — Rendered when posts exist) */}
      {posts.length > 0 && (
        <section
          id="section-blog"
          className="py-12 border-t border-[var(--color-border)] space-y-6 scroll-mt-20 lg:scroll-mt-32"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="ty-title text-[var(--color-text-primary)]">
              {language === "th"
                ? `คู่มือท่องเที่ยวจาก ${hotel.nameTh}`
                : `Local guides by ${hotel.nameEn}`}
            </h2>

            <Link
              href={`/${hotel.slug}/posts`}
              className="h-9 px-3.5 rounded-[10px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>ดูทั้งหมด ({posts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {posts.map((post) => (
              <article
                key={post.id}
                className="h-full rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <Link
                    href={`/${hotel.slug}/posts/${post.slug}`}
                    className="block relative h-44 bg-[var(--color-background-muted)] overflow-hidden"
                  >
                    <img
                      src={getOptimizedPinImageUrl(post.coverImageUrl, "gallery")}
                      srcSet={getOptimizedPinImageSrcSet(
                        post.coverImageUrl,
                        "gallery"
                      )}
                      sizes={PIN_IMAGE_SIZES.gallery}
                      alt={post.titleTh}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-[8px] bg-[#222222]/80 backdrop-blur-md text-white text-[11px] font-semibold">
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
                      <h3 className="ty-subtitle font-semibold leading-snug group-hover:underline line-clamp-2">
                        {post.titleTh}
                      </h3>
                    </Link>

                    <p className="ty-caption line-clamp-2">{post.excerptTh}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
                  {post.roomCode ? (
                    <span className="px-2.5 py-1 rounded-[8px] bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-primary)]">
                      ห้อง {post.roomCode} · ฿
                      {post.roomPriceThb?.toLocaleString()}
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
        </section>
      )}

      {/* 4E. THINGS TO KNOW / POLICIES & FAQS (#section-policies — Airbnb 3-Column Grid) */}
      <section
        id="section-policies"
        className="py-12 border-t border-[var(--color-border)] space-y-6 scroll-mt-20 lg:scroll-mt-32"
      >
        <h2 className="ty-title text-[var(--color-text-primary)]">
          {language === "th" ? "ข้อควรรู้ก่อนเข้าพัก" : "Things to know"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Col 1: House Rules */}
          <div className="space-y-2.5 ty-body">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {language === "th" ? "กฎและเวลาเข้าพัก" : "House rules"}
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              {language === "th"
                ? `เช็กอินหลัง ${hotel.checkInTime} น.`
                : `Check-in after ${hotel.checkInTime}`}
            </p>
            <p className="text-[var(--color-text-secondary)]">
              {language === "th"
                ? `เช็กเอาต์ก่อน ${hotel.checkOutTime} น.`
                : `Checkout before ${hotel.checkOutTime}`}
            </p>
            <p className="text-[var(--color-text-secondary)]">
              {hotel.petsAllowed
                ? hotel.petPolicyTh || "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                : hotel.petPolicyTh || "งดนำสัตว์เลี้ยงเข้าพัก"}
            </p>
          </div>

          {/* Col 2: Direct Booking & Contact Channels */}
          <div className="space-y-2.5 ty-body">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {language === "th"
                ? "การจองตรง & ช่องทางติดต่อ"
                : "Direct booking & contact"}
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              {language === "th"
                ? "ล็อคห้องพัก 15 นาที · โอนตรงเข้าบัญชีที่พัก 0% GP"
                : "15-min room hold · Direct 0% GP PromptPay"}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {hotel.contactLine && (
                <button
                  type="button"
                  onClick={() => handleContactClick("LINE")}
                  className="h-9 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>LINE: {hotel.contactLine}</span>
                </button>
              )}
              {hotel.facebookPageUrl && (
                <button
                  type="button"
                  onClick={() => handleContactClick("FACEBOOK_MESSENGER")}
                  className="h-9 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </button>
              )}
              {hotel.contactPhone && (
                <button
                  type="button"
                  onClick={() => handleContactClick("PHONE")}
                  className="h-9 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{hotel.contactPhone}</span>
                </button>
              )}
            </div>
          </div>

          {/* Col 3: FAQs */}
          <div className="space-y-2.5">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {language === "th" ? "คำถามที่พบบ่อย" : "Common questions"}
            </h3>
            {hotel.faqs.length === 0 ? (
              <p className="ty-body text-[var(--color-text-secondary)]">
                {language === "th"
                  ? "ทักสอบถามรายละเอียดเพิ่มเติมกับเจ้าของที่พักได้โดยตรงผ่าน LINE หรือโทรศัพท์"
                  : "Message the host directly for special requests or questions."}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {hotel.faqs.map((faq, idx) => (
                  <div key={idx} className="py-2 first:pt-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIdx(openFaqIdx === idx ? null : idx)
                      }
                      className="w-full flex items-center justify-between gap-2 text-left text-[14.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer py-0.5"
                    >
                      <span>{faq.qTh}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          openFaqIdx === idx ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openFaqIdx === idx && (
                      <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] pt-1">
                        {faq.aTh}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 1-Screen Room Details Drawer */}
      <RoomBookingDrawer
        isOpen={isBookingDrawerOpen}
        onClose={() => setIsBookingDrawerOpen(false)}
        hotel={hotel}
        selectedRoom={drawerRoom || rooms[0] || null}
        dateOverrides={dateOverrides}
        coupons={coupons}
        language={language}
        checkInDate={checkIn}
        checkOutDate={checkOut}
        guests={guests}
        onExpandPhotos={(urls, idx) =>
          setFullscreenMedia({
            slides: urls.map((u) => ({ type: "image", url: u })),
            index: idx,
          })
        }
        onProceedToCheckout={(rm) => {
          setIsBookingDrawerOpen(false);
          navigateToCheckout(rm);
        }}
        onCheckRoomDates={(rm) => {
          setSelectedRoomId(rm.id);
          setCalendarRoomFilterId(rm.id);
          scrollToCalendarSection();
        }}
      />

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
