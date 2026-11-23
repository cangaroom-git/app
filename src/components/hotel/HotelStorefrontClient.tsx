"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Images,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  Share,
  Share2,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import {
  addDaysToDate,
  calculateStayPricing,
  computeNightsBetween,
  getRequiredMinNightsForStay,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import {
  recordRecentViewedPinId,
  trackTelemetryEvent,
} from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import { startRouteProgress } from "@/components/navigation/RouteProgressBar";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  clearLastClickedPinOrigin,
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import { getRoomPhotoSpaceDef } from "@/lib/roomPhotoSpaces";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import { AirbnbStayCalendar } from "@/components/booking/AirbnbStayCalendar";
import { ChooseRoomBottomSheet } from "@/components/booking/ChooseRoomBottomSheet";
import { DesktopDateRangePopover } from "@/components/booking/DesktopDateRangePopover";
import { MobileDateRangeSheet } from "@/components/booking/MobileDateRangeSheet";
import { HotelChooseRoomSection } from "@/components/hotel/HotelChooseRoomSection";
import { HotelInfoBottomSheet } from "@/components/hotel/HotelInfoBottomSheet";
import { PlaceCommentsModal } from "@/components/hotel/PlaceCommentsModal";
import { PlaceOnlyProfileBody } from "@/components/hotel/PlaceOnlyProfileBody";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import { syncPinLikeState } from "@/lib/placeLikeStore";
import {
  clearNearbyHopOrigin,
  readNearbyHopOriginForSlug,
  type PlaceNearbyHopOrigin,
} from "@/lib/placeNavigationStore";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { RouteHeroTargetRect } from "@/components/navigation/PlaceCardFlipOverlay";
import {
  RoomBookingDrawer,
  selectBestEligibleCoupon,
} from "@/components/drawers/RoomBookingDrawer";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";
import { ShareStayModal } from "@/components/shared/ShareStayModal";
import { formatCouponDiscountHeadline } from "@/lib/couponHelpers";
import { launchCouponFlyAnimation } from "@/lib/couponClaimAnimation";
import { computeCouponDiscount } from "@/lib/bookingMath";
import type {
  CouponDealDto,
  HotelStorefrontDto,
  PinCommentDto,
  PinFeedItemDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

const HotelLocationMap = dynamic(
  () =>
    import("@/components/hotel/HotelLocationMap").then(
      (mod) => mod.HotelLocationMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-square sm:aspect-[16/9] lg:aspect-auto lg:h-[400px] rounded-[16px] bg-[var(--color-background-muted)]" />
    ),
  }
);

type HotelInfoSheetId =
  | "description"
  | "amenities"
  | "reviews"
  | "rules"
  | "contact"
  | "faqs"
  | null;

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
    isDateFilterActive,
    setIsDateFilterActive,
    walletCoupons,
    claimCouponToWallet,
    openCouponWallet,
    openAuthModal,
    savedPinIds: globalSavedPinIds,
    hasLoadedBoardsOnce,
    triggerPinToBoard,
    pinLikeOverrides,
    togglePinLikeInstant,
    navigateToPlaceWithFlip,
    signalPlaceHeroReady,
    activeFlipTargetSlug,
  } = useHotelApp();

  const [storefront, setStorefront] =
    useState<HotelStorefrontDto>(initialStorefront);
  const [isRefreshingDates, setIsRefreshingDates] = useState(false);

  const [activeAnchor, setActiveAnchor] = useState<AnchorNavId>(() =>
    initialTab === "posts" ? "photos" : initialTab
  );
  const [activeInfoSheet, setActiveInfoSheet] =
    useState<HotelInfoSheetId>(null);
  const [mobileHeroIndex, setMobileHeroIndex] = useState(0);
  const [showAllPins, setShowAllPins] = useState(false);
  const [calendarRoomFilterId, setCalendarRoomFilterId] = useState<string>("ALL");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasConfirmedDates, setHasConfirmedDates] = useState<boolean>(
    () => isDateFilterActive
  );
  const [isMobileDateSheetOpen, setIsMobileDateSheetOpen] = useState(false);
  const [desktopDatePopoverPhase, setDesktopDatePopoverPhase] = useState<
    "checkin" | "checkout" | null
  >(null);
  const [datePickerScopeRoomId, setDatePickerScopeRoomId] = useState<
    string | null
  >(null);
  const [isChooseRoomSheetOpen, setIsChooseRoomSheetOpen] = useState(false);
  const [isAnchorBarVisible, setIsAnchorBarVisible] = useState(false);
  const heroHeaderRef = useRef<HTMLElement | null>(null);
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const stickySidebarRef = useRef<HTMLElement | null>(null);
  const stickyCardRef = useRef<HTMLDivElement | null>(null);

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
  const effectiveSavedPinIds =
    currentUser && !hasLoadedBoardsOnce ? optimisticSavedIds : globalSavedPinIds;
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [drawerRoom, setDrawerRoom] = useState<RoomAvailabilityDto | null>(null);

  // Adaptive Place Profile + Cross-Route 3D Flip + Strict 1-Hop Nearby Lock state
  const [nearbyHopOrigin, setNearbyHopOrigin] =
    useState<PlaceNearbyHopOrigin | null>(null);
  const [canonicalComments, setCanonicalComments] = useState<PinCommentDto[]>(
    () => initialStorefront.pinComments ?? []
  );
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isHeroMoreMenuOpen, setIsHeroMoreMenuOpen] = useState(false);
  const heroMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const mosaicPrimaryHeroRef = useRef<HTMLElement | null>(null);
  const mobileHeroStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCanonicalComments(initialStorefront.pinComments ?? []);
  }, [initialStorefront.pinComments, cleanSlug]);

  useEffect(() => {
    if (!isHeroMoreMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        heroMoreMenuRef.current &&
        !heroMoreMenuRef.current.contains(e.target as Node)
      ) {
        setIsHeroMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isHeroMoreMenuOpen]);

  // Synchronize `nearbyHopOrigin` BEFORE measuring the Hero rect so the Depth-1 Back Bar
  // ("← กลับไป ...") is already painted when we report `signalPlaceHeroReady` (ZERO 56px shift!).
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const expectedHop = readNearbyHopOriginForSlug(cleanSlug);
    const currentFrom = nearbyHopOrigin?.fromSlug ?? null;
    const expectedFrom = expectedHop?.fromSlug ?? null;
    if (currentFrom !== expectedFrom) {
      setNearbyHopOrigin(expectedHop);
      return;
    }

    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
    const targetEl =
      window.innerWidth >= 640
        ? mosaicPrimaryHeroRef.current
        : mobileHeroStageRef.current;
    if (!targetEl) return;
    const r = targetEl.getBoundingClientRect();
    if (r.width >= 40 && r.height >= 40) {
      const isDesktop = window.innerWidth >= 1024;
      const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
      signalPlaceHeroReady(cleanSlug, {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        radius: isDesktop ? 16 : isTablet ? 12 : 0,
        borderRadiusCss: isDesktop
          ? "16px 0px 0px 16px"
          : isTablet
          ? "12px 0px 0px 12px"
          : "0px",
      });
    }
  }, [cleanSlug, signalPlaceHeroReady, nearbyHopOrigin]);

  const refreshCanonicalComments = useCallback(async (pinId: string) => {
    try {
      const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { comments?: PinCommentDto[] };
      if (Array.isArray(data.comments)) {
        setCanonicalComments(data.comments);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleProfileBack = useCallback(() => {
    if (nearbyHopOrigin) {
      const targetSlug = nearbyHopOrigin.fromSlug;
      clearNearbyHopOrigin();
      router.push(`/${encodeURIComponent(targetSlug)}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [nearbyHopOrigin, router]);

  const handleHeroStageMeasured = useCallback(
    (rect: RouteHeroTargetRect) => {
      signalPlaceHeroReady(cleanSlug, rect);
    },
    [cleanSlug, signalPlaceHeroReady]
  );

  // Record this property's primary deal pin into Recently Viewed when visiting /{hotelSlug}
  useEffect(() => {
    const primaryPinId =
      initialStorefront.canonicalPin?.id ?? initialStorefront.pins[0]?.id;
    if (primaryPinId) {
      recordRecentViewedPinId(primaryPinId);
    }
  }, [
    initialStorefront.hotel.id,
    initialStorefront.canonicalPin?.id,
    initialStorefront.pins,
  ]);
  const [initialCouponCode, setInitialCouponCode] = useState<string | null>(
    null
  );
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [optimisticClaimedCouponIds, setOptimisticClaimedCouponIds] = useState<
    Set<string>
  >(() => new Set());
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
    const hasValidParamIn = Boolean(paramIn && /^\d{4}-\d{2}-\d{2}$/.test(paramIn));
    const hasValidParamOut = Boolean(paramOut && /^\d{4}-\d{2}-\d{2}$/.test(paramOut));
    if (hasValidParamIn && paramIn) setCheckIn(paramIn);
    if (hasValidParamOut && paramOut) setCheckOut(paramOut);
    if (hasValidParamIn && hasValidParamOut) {
      setHasConfirmedDates(true);
      setIsDateFilterActive(true);
    }
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
  }, [
    initialStorefront.rooms,
    setCheckIn,
    setCheckOut,
    setGuests,
    setIsDateFilterActive,
  ]);

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

  // Lock global top bar out of the way on < lg whenever the Property Anchor Bar is visible
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isAnchorBarVisible) {
      document.documentElement.dataset.hotelAnchorPinned = "true";
    } else {
      delete document.documentElement.dataset.hotelAnchorPinned;
    }
    return () => {
      delete document.documentElement.dataset.hotelAnchorPinned;
    };
  }, [isAnchorBarVisible]);

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
      showAllPins ? masonrySectionPins : masonrySectionPins.slice(0, 6),
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
    setIsShareModalOpen(true);
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

    const prefillMsg = `สวัสดีครับ ดูที่พัก ${storefront.hotel.nameTh} มาจาก Nondii สนใจเข้าพักวันที่ ${checkIn} ถึง ${checkOut} (${guests} ท่าน)`;
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

  const handleClaimHotelCoupon = async (
    coupon: CouponDealDto,
    sourceEl: HTMLElement | null = null
  ): Promise<boolean> => {
    const executeClaim = async (): Promise<boolean> => {
      setClaimingCouponId(coupon.id);
      try {
        const res = await claimCouponToWallet({ couponId: coupon.id });
        if (res.success) {
          setOptimisticClaimedCouponIds((prev) => {
            const next = new Set(prev);
            next.add(coupon.id);
            return next;
          });
          void loadStorefront(true);
          return true;
        }
        return false;
      } finally {
        setClaimingCouponId(null);
      }
    };

    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อเก็บคูปองส่วนลดเข้ากระเป๋า",
        reasonEn: "Log in to save this coupon to your wallet",
        onSuccess: async () => {
          const ok = await executeClaim();
          if (ok) {
            launchCouponFlyAnimation(
              sourceEl,
              formatCouponDiscountHeadline(coupon, language)
            );
          }
        },
      });
      return false;
    }

    return executeClaim();
  };

  const {
    hotel,
    rooms,
    coupons,
    discountRules = [],
    reviews,
    dateOverrides,
    bookedUnitsByRoomDate = {},
    posts,
  } = storefront;

  // Auto-adjust storefront mode: 1 active room type -> Single-Unit Host Mode; 2+ active room types -> Multi-Room Hotel Mode
  const storefrontMode: "SINGLE_UNIT" | "MULTI_ROOM" =
    rooms.length <= 1 ? "SINGLE_UNIT" : "MULTI_ROOM";
  const isMultiRoomHotel = storefrontMode === "MULTI_ROOM";
  const singleUnitRoom = !isMultiRoomHotel ? rooms[0] ?? null : null;

  const walletCouponIdSet = useMemo(
    () => new Set(walletCoupons.map((c) => c.id)),
    [walletCoupons]
  );

  const isHotelCouponClaimed = useCallback(
    (coupon: CouponDealDto) =>
      Boolean(coupon.isClaimedByMe) ||
      walletCouponIdSet.has(coupon.id) ||
      optimisticClaimedCouponIds.has(coupon.id),
    [walletCouponIdSet, optimisticClaimedCouponIds]
  );

  const claimedHotelCoupons = useMemo(
    () => coupons.filter((c) => isHotelCouponClaimed(c)),
    [coupons, isHotelCouponClaimed]
  );
  const stayNights = computeNightsBetween(checkIn, checkOut);

  const matchingAvailableRooms = useMemo(
    () => rooms.filter((r) => r.availableUnits > 0 && r.maxGuests >= guests),
    [rooms, guests]
  );

  // Enforce/surface Minimum Stay restriction immediately when guest selects dates
  const stayMinNightsInfo = useMemo(() => {
    if (!hasConfirmedDates) {
      return { requiredMinNights: 1, isBlocked: false };
    }
    if (!isMultiRoomHotel) {
      if (!singleUnitRoom) return { requiredMinNights: 1, isBlocked: false };
      const req = getRequiredMinNightsForStay(
        singleUnitRoom.id,
        checkIn,
        checkOut,
        dateOverrides
      );
      return { requiredMinNights: req, isBlocked: stayNights < req };
    }
    if (matchingAvailableRooms.length === 0) {
      return { requiredMinNights: 1, isBlocked: false };
    }
    const perRoomReqs = matchingAvailableRooms.map((r) =>
      getRequiredMinNightsForStay(r.id, checkIn, checkOut, dateOverrides)
    );
    const lowestReq = Math.min(...perRoomReqs);
    return {
      requiredMinNights: lowestReq,
      isBlocked: stayNights < lowestReq,
    };
  }, [
    hasConfirmedDates,
    isMultiRoomHotel,
    singleUnitRoom,
    matchingAvailableRooms,
    checkIn,
    checkOut,
    dateOverrides,
    stayNights,
  ]);

  const maxHotelGuests = useMemo(
    () => Math.max(2, ...rooms.map((r) => r.maxGuests)),
    [rooms]
  );

  const minRoomPrice = rooms.reduce(
    (min, r) => (r.weekdayPriceThb < min ? r.weekdayPriceThb : min),
    rooms[0]?.weekdayPriceThb ?? 0
  );

  const cheapestAvailableRoomPricing = useMemo(() => {
    if (matchingAvailableRooms.length === 0) return null;
    let best: {
      room: RoomAvailabilityDto;
      subtotalThb: number;
      netTotalThb: number;
      discountThb: number;
      couponCode: string | null;
    } | null = null;

    for (const room of matchingAvailableRooms) {
      const base = calculateStayPricing({
        room,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests,
        overrides: dateOverrides,
      });
      const bestCoupon = selectBestEligibleCoupon(coupons, base.roomSubtotalThb);
      const net = calculateStayPricing({
        room,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests,
        overrides: dateOverrides,
        coupon: bestCoupon?.coupon ?? null,
        discountRules,
      });
      if (!best || net.netTotalThb < best.netTotalThb) {
        best = {
          room,
          subtotalThb: net.roomSubtotalThb,
          netTotalThb: net.netTotalThb,
          discountThb: net.discountThb,
          couponCode: net.appliedCouponCode,
        };
      }
    }
    return best;
  }, [
    matchingAvailableRooms,
    checkIn,
    checkOut,
    guests,
    dateOverrides,
    coupons,
    discountRules,
  ]);

  const activeBookingRoom = useMemo(
    () =>
      singleUnitRoom ||
      (selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null) ||
      cheapestAvailableRoomPricing?.room ||
      matchingAvailableRooms[0] ||
      rooms[0] ||
      null,
    [
      singleUnitRoom,
      rooms,
      selectedRoomId,
      cheapestAvailableRoomPricing,
      matchingAvailableRooms,
    ]
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
    () => allUniqueAmenities.slice(0, 8),
    [allUniqueAmenities]
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

  const stickyBestCoupon = useMemo(() => {
    if (!stickyBasePricing) return null;
    if (initialCouponCode) {
      const requested = coupons.find(
        (c) => c.code.toUpperCase() === initialCouponCode.toUpperCase()
      );
      if (requested) {
        const res = computeCouponDiscount(
          requested,
          stickyBasePricing.roomSubtotalThb
        );
        if (!res.error && res.discountThb > 0) {
          return { coupon: requested, discountThb: res.discountThb };
        }
      }
    }
    return selectBestEligibleCoupon(coupons, stickyBasePricing.roomSubtotalThb);
  }, [coupons, stickyBasePricing, initialCouponCode]);

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
            discountRules,
          })
        : null,
    [
      activeBookingRoom,
      checkIn,
      checkOut,
      guests,
      dateOverrides,
      stickyBestCoupon,
      discountRules,
    ]
  );

  const scrollToCalendarSection = () => {
    calendarSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openDatePicker = useCallback(
    (
      preferredPhase: "checkin" | "checkout" = "checkin",
      scopeRoomId: string | null = null
    ) => {
      setDatePickerScopeRoomId(scopeRoomId);
      if (isDesktopViewport) {
        // Ensure sticky booking card is visible in viewport when opening anchored desktop popover
        const sidebarRect = stickySidebarRef.current?.getBoundingClientRect();
        if (
          sidebarRect &&
          (sidebarRect.bottom < 120 || sidebarRect.top > window.innerHeight - 120)
        ) {
          document
            .getElementById("section-rooms")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setDesktopDatePopoverPhase(preferredPhase);
      } else {
        setIsMobileDateSheetOpen(true);
      }
    },
    [isDesktopViewport]
  );

  const handleCommitStayDates = useCallback(
    (nextIn: string, nextOut: string) => {
      setCheckIn(nextIn);
      setCheckOut(nextOut);
      setHasConfirmedDates(true);
      setIsDateFilterActive(true);
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
    },
    [
      setCheckIn,
      setCheckOut,
      setIsDateFilterActive,
      storefront.hotel.id,
      storefront.hotel.provinceId,
      storefront.hotel.stayStyles,
      activeBookingRoom?.weekdayPriceThb,
      rooms,
      guests,
    ]
  );

  const handleClearStayDates = useCallback(() => {
    setHasConfirmedDates(false);
    setIsDateFilterActive(false);
  }, [setIsDateFilterActive]);

  const handleRedeemHotelCoupon = (coupon: CouponDealDto) => {
    setInitialCouponCode(coupon.code);
    if (!hasConfirmedDates) {
      openDatePicker("checkin");
      return;
    }
    if (isMultiRoomHotel) {
      if (matchingAvailableRooms.length > 0) {
        setIsChooseRoomSheetOpen(true);
      } else {
        openDatePicker("checkin");
      }
      return;
    }
    if (
      singleUnitRoom &&
      singleUnitRoom.availableUnits > 0 &&
      singleUnitRoom.maxGuests >= guests
    ) {
      navigateToCheckout(singleUnitRoom, coupon.code);
    } else {
      openDatePicker("checkin", singleUnitRoom?.id ?? null);
    }
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
    const seen = new Set<string>();
    const slides: PureMediaSlide[] = [];

    const pushSlide = (slide: PureMediaSlide) => {
      if (!slide.url || seen.has(slide.url)) return;
      seen.add(slide.url);
      slides.push(slide);
    };

    if (hotel.coverImageUrl) {
      pushSlide({
        type: "image",
        url: hotel.coverImageUrl,
        caption: hotel.nameTh,
        spaceId: "exterior",
        spaceLabel: language === "th" ? "ภาพหลักที่พัก" : "Property",
      });
    }

    for (const r of rooms) {
      const metaList =
        r.galleryMeta && r.galleryMeta.length > 0
          ? r.galleryMeta
          : r.galleryUrls.map((url) => ({
              url,
              space: "additional" as const,
              captionTh: undefined,
            }));

      for (const m of metaList) {
        const spaceDef = getRoomPhotoSpaceDef(m.space);
        pushSlide({
          type: "image",
          url: m.url,
          caption: m.captionTh || (language === "th" ? r.nameTh : r.nameEn),
          spaceId: m.space,
          spaceLabel: language === "th" ? spaceDef.labelTh : spaceDef.labelEn,
        });
      }
    }

    for (const p of storefront.pins) {
      if (p.coverImageUrl) {
        pushSlide({
          type: "image",
          url: p.coverImageUrl,
          caption: language === "th" ? p.titleTh : p.titleEn,
          spaceId: "additional",
          spaceLabel: language === "th" ? "บรรยากาศ" : "Moments",
        });
      }
    }

    return slides;
  }, [hotel.coverImageUrl, hotel.nameTh, rooms, storefront.pins, language]);

  const mobileHeroSlides = useMemo<PureMediaSlide[]>(
    () =>
      allCoverSlides.length > 0
        ? allCoverSlides
        : [{ type: "image", url: coverBannerUrl }],
    [allCoverSlides, coverBannerUrl]
  );

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
      label: isMultiRoomHotel
        ? language === "th"
          ? `ห้องพัก (${rooms.length})`
          : `Rooms (${rooms.length})`
        : language === "th"
        ? "ปฏิทินวันว่าง"
        : "Availability",
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

  const canonicalPin: PinFeedItemDto | null =
    storefront.canonicalPin ?? storefront.pins[0] ?? null;
  const isProfileOnlyPlace =
    hotel.merchantMode === "PROFILE_ONLY" || rooms.length === 0;
  const nearbyPlaces = storefront.nearbyPlaces ?? [];
  const backTargetName = nearbyHopOrigin
    ? language === "th"
      ? nearbyHopOrigin.fromNameTh
      : nearbyHopOrigin.fromNameEn
    : null;
  const isFlipHidingHero =
    activeFlipTargetSlug !== null &&
    activeFlipTargetSlug.toLowerCase() === cleanSlug;

  const handleSelectNearbyPlace = useCallback(
    (nextPlace: PinFeedItemDto, rect?: CardOriginRect | null) => {
      // Strict 1-Hop Lock: only allow hopping from Depth 0 -> Depth 1!
      if (nearbyHopOrigin) return;
      navigateToPlaceWithFlip({
        pin: nextPlace,
        originRect: rect,
        fromNearbyOf: {
          fromSlug: hotel.slug,
          fromNameTh: hotel.nameTh,
          fromNameEn: hotel.nameEn,
        },
      });
    },
    [hotel.nameEn, hotel.nameTh, hotel.slug, navigateToPlaceWithFlip, nearbyHopOrigin]
  );

  const handleToggleSaveAnyPin = useCallback(
    async (pinId: string) => {
      const target =
        (canonicalPin?.id === pinId ? canonicalPin : null) ??
        nearbyPlaces.find((p) => p.id === pinId) ??
        storefront.pins.find((p) => p.id === pinId);
      if (!target) return;
      const res = await triggerPinToBoard({
        id: target.id,
        coverImageUrl: target.coverImageUrl,
        isSavedByMe: effectiveSavedPinIds.has(target.id),
      });
      if (res) {
        setOptimisticSavedIds((prev) => {
          const next = new Set(prev);
          if (res.isSaved) next.add(pinId);
          else next.delete(pinId);
          return next;
        });
      }
    },
    [canonicalPin, effectiveSavedPinIds, nearbyPlaces, storefront.pins, triggerPinToBoard]
  );

  const heroLikeOverride = canonicalPin
    ? pinLikeOverrides[canonicalPin.id]
    : undefined;
  const effectiveHeroIsLiked =
    heroLikeOverride?.isLiked ?? canonicalPin?.isLikedByMe ?? false;
  const effectiveHeroLikesCount =
    heroLikeOverride?.likesCount ?? canonicalPin?.likesCount ?? 0;
  const effectiveHeroIsSaved = Boolean(
    canonicalPin && effectiveSavedPinIds.has(canonicalPin.id)
  );
  const totalHeroCommentsCount = useMemo(
    () =>
      canonicalComments.reduce(
        (sum, c) => sum + 1 + (c.replies?.length ?? 0),
        0
      ),
    [canonicalComments]
  );

  const handleHeroToggleLike = () => {
    if (!canonicalPin) return;
    const nextLiked = !effectiveHeroIsLiked;
    const nextCount = Math.max(
      0,
      effectiveHeroLikesCount + (nextLiked ? 1 : -1)
    );
    syncPinLikeState(canonicalPin.id, nextLiked, nextCount);
    togglePinLikeInstant({
      id: canonicalPin.id,
      isLikedByMe: effectiveHeroIsLiked,
      likesCount: effectiveHeroLikesCount,
    });
  };

  const handleHeroAddComment = async (
    text: string,
    parentId?: string | null
  ) => {
    if (!canonicalPin) return;
    const runComment = async () => {
      await fetch(
        `/api/pins/${encodeURIComponent(canonicalPin.id)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text, parentId }),
        }
      );
      await refreshCanonicalComments(canonicalPin.id);
    };
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อแสดงความคิดเห็น",
        reasonEn: "Log in to post a comment",
        onSuccess: runComment,
      });
      return;
    }
    await runComment();
  };

  const handleHeroDeleteComment = async (commentId: string) => {
    if (!canonicalPin) return;
    await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    await refreshCanonicalComments(canonicalPin.id);
  };

  // Ensure the primary card cover image is ALWAYS Slide 0, followed by all canonicalPin.mediaUrls
  // and room/storefront slides (deduplicated by Unsplash photo path so every mosaic slot is strictly unique!)
  const heroMosaicSlides = useMemo<PureMediaSlide[]>(() => {
    const seen = new Set<string>();
    const out: PureMediaSlide[] = [];
    const getPhotoKey = (raw: string) => {
      try {
        const u = new URL(raw);
        if (u.hostname === "images.unsplash.com") {
          return `${u.origin}${u.pathname}`;
        }
      } catch {
        // ignore
      }
      return raw;
    };
    const pushUrl = (raw?: string | null, caption?: string) => {
      const url = (raw || "").trim();
      if (!url || url.includes("res.cloudinary.com/dxxb2gvyw/")) return;
      const key = getPhotoKey(url);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ type: "image", url, caption: caption || hotel.nameTh });
    };
    pushUrl(canonicalPin?.coverImageUrl || coverBannerUrl, hotel.nameTh);
    if (canonicalPin?.mediaUrls) {
      for (const u of canonicalPin.mediaUrls) {
        pushUrl(u, hotel.nameTh);
      }
    }
    for (const s of allCoverSlides) {
      pushUrl(s.url, s.caption);
    }
    return out;
  }, [
    allCoverSlides,
    canonicalPin?.coverImageUrl,
    canonicalPin?.mediaUrls,
    coverBannerUrl,
    hotel.nameTh,
  ]);

  return (
    <div className="cgr-page-standard">
      {/* =====================================================================
          ZONE 1 (TOP): FULL-WIDTH 1120PX AIRBNB 5-PHOTO MOSAIC + INSTAGRAM ACTION BAR
          - Left 2×2 Primary Photo Slot (`data-place-hero-stage="true"`) is the exact 1:1 3D Flip landing zone!
          - Directly underneath: clean `♡ 💬 ↗ •••` row opening the Instagram Comment Modal!
      ====================================================================== */}
      <header
        ref={heroHeaderRef}
        id="section-photos"
        className="scroll-mt-24 space-y-3.5 sm:space-y-4 pb-3"
      >
        {/* Depth-1 Back Bar (Shown cleanly when hopped here from a Nearby Place!) */}
        {backTargetName && (
          <div className="hidden sm:flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={handleProfileBack}
              className="h-9 px-3.5 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span className="truncate max-w-[420px]">
                {language === "th"
                  ? `กลับไป ${backTargetName}`
                  : `Back to ${backTargetName}`}
              </span>
            </button>
          </div>
        )}

        {/* Mobile Swipeable Top Hero Carousel (< sm) — 3D Flip Landing Zone on Mobile */}
        <div
          ref={mobileHeroStageRef}
          data-place-hero-stage="true"
          className="sm:hidden relative -mx-4 -mt-4 aspect-square overflow-hidden bg-[var(--color-background-muted)]"
        >
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              const width = el.clientWidth;
              if (width > 0) {
                const idx = Math.round(el.scrollLeft / width);
                setMobileHeroIndex(
                  Math.max(0, Math.min(heroMosaicSlides.length - 1, idx))
                );
              }
            }}
            className="flex h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
          >
            {heroMosaicSlides.slice(0, 12).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: heroMosaicSlides, index: idx })
                }
                aria-label={`${hotel.nameTh} ${idx + 1}`}
                className="w-full h-full shrink-0 snap-center relative cursor-pointer"
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "hero")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "hero")}
                  sizes="(max-width: 639px) 100vw, 640px"
                  alt={slide.caption || `${hotel.nameTh} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleProfileBack}
            aria-label={
              backTargetName
                ? language === "th"
                  ? `กลับไป ${backTargetName}`
                  : `Back to ${backTargetName}`
                : language === "th"
                ? "ย้อนกลับ"
                : "Back"
            }
            className="absolute top-3 left-3 z-10 h-9 w-9 rounded-[10px] bg-white/92 dark:bg-[#222222]/92 text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleShareProperty}
            aria-label={language === "th" ? "แชร์สถานที่" : "Share place"}
            className="absolute top-3 right-3 z-10 h-9 w-9 rounded-[10px] bg-white/92 dark:bg-[#222222]/92 text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {heroMosaicSlides.length > 1 && (
            <span className="pointer-events-none absolute bottom-3 right-3 h-7 px-2.5 rounded-[9px] bg-[#222222]/80 backdrop-blur-md !text-white text-[12px] font-medium inline-flex items-center tabular-nums">
              {mobileHeroIndex + 1} / {Math.min(12, heroMosaicSlides.length)}
            </span>
          )}
        </div>

        {/* Airbnb Full-Width Title + Minimal Share/Save Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-0.5 sm:pt-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!backTargetName && (
              <button
                type="button"
                onClick={handleProfileBack}
                aria-label={language === "th" ? "ย้อนกลับ" : "Back"}
                className="hidden sm:inline-flex h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}
            <h1 className="text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-text-primary)] flex items-center gap-2 min-w-0">
              <span className="truncate">
                {language === "th" ? hotel.nameTh : hotel.nameEn}
              </span>
              {hotel.verificationStatus === "VERIFIED" && (
                <BadgeCheck
                  aria-label="Verified Place"
                  className="w-5 h-5 text-[var(--color-text-primary)] shrink-0"
                />
              )}
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShareProperty}
              className="h-9 px-3 rounded-[10px] bg-transparent hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors underline underline-offset-4 decoration-[var(--color-border-emphasized)]"
            >
              <Share className="w-4 h-4" strokeWidth={2} />
              <span>{language === "th" ? "แชร์" : "Share"}</span>
            </button>

            {canonicalPin && (
              <button
                type="button"
                onClick={() => void handleToggleSaveAnyPin(canonicalPin.id)}
                className={`h-9 px-3 rounded-[10px] bg-transparent hover:bg-[var(--color-background-muted)] text-[14px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors underline underline-offset-4 decoration-[var(--color-border-emphasized)] ${
                  effectiveHeroIsSaved
                    ? "text-[var(--color-promo)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${effectiveHeroIsSaved ? "fill-current" : ""}`}
                  strokeWidth={2}
                />
                <span>
                  {effectiveHeroIsSaved
                    ? language === "th"
                      ? "บันทึกแล้ว"
                      : "Saved"
                    : language === "th"
                    ? "บันทึก"
                    : "Save"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tablet / Desktop Full-Width 1120px Airbnb 5-Photo Mosaic (Photo-Only Standard!)
            Left 2×2 Primary Photo Slot = Exact 1:1 3D Card Flip Landing Zone (ZERO post-flip blink!) */}
        {heroMosaicSlides.length >= 5 ? (
          <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative bg-[var(--color-background-muted)]">
            <button
              ref={(el) => {
                mosaicPrimaryHeroRef.current = el;
              }}
              data-place-hero-stage="true"
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 })
              }
              className="col-span-2 row-span-2 relative w-full h-full overflow-hidden cursor-pointer transition"
            >
              <img
                src={getOptimizedPinImageUrl(heroMosaicSlides[0].url, "hero")}
                srcSet={getOptimizedPinImageSrcSet(
                  heroMosaicSlides[0].url,
                  "hero"
                )}
                sizes={PIN_IMAGE_SIZES.hero}
                alt={heroMosaicSlides[0].caption || hotel.nameTh}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 left-0 z-10 pointer-events-none">
                <PlaceCategoryCrest
                  category={hotel.placeCategory}
                  language={language}
                  corner="top-left"
                />
              </div>
            </button>

            {heroMosaicSlides.slice(1, 5).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: heroMosaicSlides, index: idx + 1 })
                }
                className="col-span-1 row-span-1 relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition"
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "gallery")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "gallery")}
                  sizes={PIN_IMAGE_SIZES.gallery}
                  alt={slide.caption || `${hotel.nameTh} ${idx + 2}`}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 })
              }
              className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[10px] bg-white/95 hover:bg-white text-[#222222] text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Images className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `แสดงรูปภาพทั้งหมด (${heroMosaicSlides.length})`
                  : `Show all photos (${heroMosaicSlides.length})`}
              </span>
            </button>
          </div>
        ) : heroMosaicSlides.length >= 3 ? (
          <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative bg-[var(--color-background-muted)]">
            <button
              ref={(el) => {
                mosaicPrimaryHeroRef.current = el;
              }}
              data-place-hero-stage="true"
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 })
              }
              className="col-span-2 row-span-2 relative w-full h-full overflow-hidden cursor-pointer transition"
            >
              <img
                src={getOptimizedPinImageUrl(heroMosaicSlides[0].url, "hero")}
                srcSet={getOptimizedPinImageSrcSet(
                  heroMosaicSlides[0].url,
                  "hero"
                )}
                sizes={PIN_IMAGE_SIZES.hero}
                alt={heroMosaicSlides[0].caption || hotel.nameTh}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 left-0 z-10 pointer-events-none">
                <PlaceCategoryCrest
                  category={hotel.placeCategory}
                  language={language}
                  corner="top-left"
                />
              </div>
            </button>

            {heroMosaicSlides.slice(1, 4).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: heroMosaicSlides, index: idx + 1 })
                }
                className={`${
                  heroMosaicSlides.length === 3
                    ? "col-span-2 row-span-1"
                    : idx === 0
                    ? "col-span-2 row-span-1"
                    : "col-span-1 row-span-1"
                } relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition`}
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "gallery")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "gallery")}
                  sizes={PIN_IMAGE_SIZES.gallery}
                  alt={slide.caption || `${hotel.nameTh} ${idx + 2}`}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 })
              }
              className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[10px] bg-white/95 hover:bg-white text-[#222222] text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Images className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `แสดงรูปภาพทั้งหมด (${heroMosaicSlides.length})`
                  : `Show all photos (${heroMosaicSlides.length})`}
              </span>
            </button>
          </div>
        ) : heroMosaicSlides.length === 2 ? (
          <div className="hidden sm:grid sm:grid-cols-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative bg-[var(--color-background-muted)]">
            {heroMosaicSlides.slice(0, 2).map((slide, idx) => (
              <button
                key={`${slide.url}-${idx}`}
                ref={
                  idx === 0
                    ? (el) => {
                        mosaicPrimaryHeroRef.current = el;
                      }
                    : undefined
                }
                data-place-hero-stage={idx === 0 ? "true" : undefined}
                type="button"
                onClick={() =>
                  setFullscreenMedia({ slides: heroMosaicSlides, index: idx })
                }
                className="relative w-full h-full overflow-hidden cursor-pointer hover:brightness-95 transition"
              >
                <img
                  src={getOptimizedPinImageUrl(slide.url, "hero")}
                  srcSet={getOptimizedPinImageSrcSet(slide.url, "hero")}
                  sizes={PIN_IMAGE_SIZES.hero}
                  alt={slide.caption || `${hotel.nameTh} ${idx + 1}`}
                  loading="eager"
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <div className="absolute top-0 left-0 z-10 pointer-events-none">
                    <PlaceCategoryCrest
                      category={hotel.placeCategory}
                      language={language}
                      corner="top-left"
                    />
                  </div>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 })
              }
              className="absolute bottom-4 right-4 h-9 px-3.5 rounded-[10px] bg-white/95 hover:bg-white text-[#222222] text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Images className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `แสดงรูปภาพทั้งหมด (${heroMosaicSlides.length})`
                  : `Show all photos (${heroMosaicSlides.length})`}
              </span>
            </button>
          </div>
        ) : (
          <div
            ref={(el) => {
              mosaicPrimaryHeroRef.current = el;
            }}
            data-place-hero-stage="true"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (heroMosaicSlides.length > 0) {
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 });
              }
            }}
            onKeyDown={(e) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                heroMosaicSlides.length > 0
              ) {
                e.preventDefault();
                setFullscreenMedia({ slides: heroMosaicSlides, index: 0 });
              }
            }}
            className="hidden sm:block relative w-full aspect-[2/1] rounded-[12px] lg:rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer"
          >
            <img
              src={getOptimizedPinImageUrl(
                heroMosaicSlides[0]?.url || coverBannerUrl,
                "hero"
              )}
              srcSet={getOptimizedPinImageSrcSet(
                heroMosaicSlides[0]?.url || coverBannerUrl,
                "hero"
              )}
              sizes={PIN_IMAGE_SIZES.hero}
              alt={hotel.nameTh}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-0 left-0 z-10 pointer-events-none">
              <PlaceCategoryCrest
                category={hotel.placeCategory}
                language={language}
                corner="top-left"
              />
            </div>
          </div>
        )}

        {/* Clean Instagram-Style Social Action Row Directly Below Photo Mosaic (`♡ 143  💬 3  ↗  •••`) */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-1 -ml-1.5">
            {canonicalPin && (
              <button
                type="button"
                onClick={handleHeroToggleLike}
                aria-label={language === "th" ? "ถูกใจ" : "Like"}
                className="h-10 px-2 rounded-[11px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Heart
                  className={`w-[22px] h-[22px] ${
                    effectiveHeroIsLiked
                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                      : ""
                  }`}
                  strokeWidth={2}
                />
                {effectiveHeroLikesCount > 0 && (
                  <span className="text-[14.5px] font-semibold tabular-nums">
                    {effectiveHeroLikesCount.toLocaleString()}
                  </span>
                )}
              </button>
            )}

            {canonicalPin && (
              <button
                type="button"
                onClick={() => setIsCommentsModalOpen(true)}
                aria-label={language === "th" ? "ความคิดเห็น" : "Comments"}
                className="h-10 px-2 rounded-[11px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-[22px] h-[22px]" strokeWidth={2} />
                {totalHeroCommentsCount > 0 && (
                  <span className="text-[14.5px] font-semibold tabular-nums">
                    {totalHeroCommentsCount.toLocaleString()}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleShareProperty}
              aria-label={language === "th" ? "แชร์" : "Share"}
              className="h-10 w-10 rounded-[11px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <Share className="w-[20px] h-[20px]" strokeWidth={2} />
            </button>

            <div ref={heroMoreMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsHeroMoreMenuOpen((v) => !v)}
                aria-label={language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
                aria-expanded={isHeroMoreMenuOpen}
                className="h-10 w-10 rounded-[11px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <MoreHorizontal className="w-[21px] h-[21px]" strokeWidth={2} />
              </button>

              {isHeroMoreMenuOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-52 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] p-1.5 divide-y divide-[var(--color-border)]">
                  <div className="pb-1">
                    {canonicalPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeroMoreMenuOpen(false);
                          void handleToggleSaveAnyPin(canonicalPin.id);
                        }}
                        className="w-full px-3 py-2 rounded-[9px] hover:bg-[var(--color-background-muted)] text-left text-[13.5px] font-medium text-[var(--color-text-primary)] cursor-pointer transition-colors"
                      >
                        {effectiveHeroIsSaved
                          ? language === "th"
                            ? "นำออกจากทริป"
                            : "Remove from trip"
                          : language === "th"
                          ? "บันทึกลงทริป"
                          : "Save to trip"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeroMoreMenuOpen(false);
                        setIsCommentsModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-[9px] hover:bg-[var(--color-background-muted)] text-left text-[13.5px] font-medium text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    >
                      {language === "th"
                        ? "ดูความคิดเห็นทั้งหมด"
                        : "View all comments"}
                    </button>
                  </div>
                  <div className="pt-1">
                    {hotel.contactLine && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeroMoreMenuOpen(false);
                          handleContactClick("LINE");
                        }}
                        className="w-full px-3 py-2 rounded-[9px] hover:bg-[var(--color-background-muted)] text-left text-[13.5px] font-medium text-[var(--color-text-primary)] cursor-pointer transition-colors"
                      >
                        {language === "th" ? "ทัก LINE เจ้าของ" : "Message via LINE"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeroMoreMenuOpen(false);
                        handleShareProperty();
                      }}
                      className="w-full px-3 py-2 rounded-[9px] hover:bg-[var(--color-background-muted)] text-left text-[13.5px] font-medium text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    >
                      {language === "th" ? "คัดลอกลิงก์โปรไฟล์" : "Copy profile link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Quick Save Pill on Right of Social Row */}
          {canonicalPin && (
            <button
              type="button"
              onClick={() => void handleToggleSaveAnyPin(canonicalPin.id)}
              aria-label={
                effectiveHeroIsSaved
                  ? language === "th"
                    ? "บันทึกแล้ว"
                    : "Saved"
                  : language === "th"
                  ? "บันทึก"
                  : "Save"
              }
              className={`sm:hidden h-9 px-3 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                effectiveHeroIsSaved
                  ? "bg-[var(--color-promo)] !text-white"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
              }`}
            >
              <Bookmark
                className={`w-4 h-4 ${effectiveHeroIsSaved ? "fill-current" : ""}`}
                strokeWidth={2}
              />
              <span>
                {effectiveHeroIsSaved
                  ? language === "th"
                    ? "บันทึกแล้ว"
                    : "Saved"
                  : language === "th"
                  ? "บันทึก"
                  : "Save"}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* =====================================================================
          ADAPTIVE BODY BRANCH:
          - GROUP 2 (PROFILE_ONLY / CAFE / RESTAURANT / ATTRACTION / WELLNESS):
            Clean Place Profile Body (NO room booking calendar or check-in noise!)
          - GROUP 1 (DIRECT_BOOKING WITH ROOMS):
            Full 0% GP Booking Storefront + Nearby Places (1-Hop Lock)
      ====================================================================== */}
      {isProfileOnlyPlace ? (
        <PlaceOnlyProfileBody
          storefront={storefront}
          language={language}
          isSaved={Boolean(
            canonicalPin && effectiveSavedPinIds.has(canonicalPin.id)
          )}
          savedPinIds={effectiveSavedPinIds}
          isNearbyHop={Boolean(nearbyHopOrigin)}
          backTargetName={backTargetName}
          onBack={handleProfileBack}
          onToggleSaveCanonical={() => {
            if (canonicalPin) void handleToggleSaveAnyPin(canonicalPin.id);
          }}
          onToggleSavePin={(pinId) => void handleToggleSaveAnyPin(pinId)}
          onSelectNearbyPlace={handleSelectNearbyPlace}
          onContactClick={(ch) => {
            if (ch === "LINE" || ch === "PHONE") {
              handleContactClick(ch);
            } else if (ch === "FACEBOOK") {
              handleContactClick("FACEBOOK_MESSENGER");
            }
          }}
        />
      ) : (
        <>

      {/* =====================================================================
          ZONE 2 (NAV_DEFAULT): AIRBNB SCROLL-REVEAL ANCHOR BAR
          Hidden at scroll top so the Hero Mosaic flows seamlessly into Overview!
      ====================================================================== */}
      <nav
        aria-label="Property section navigation"
        aria-hidden={!isAnchorBarVisible}
        className={`fixed top-0 lg:top-16 inset-x-0 lg:left-[72px] z-30 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 transition-[opacity,transform] duration-200 ${
          isAnchorBarVisible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="cgr-page-standard flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-y-none no-scrollbar">
            {anchorNavItems.map((item) => {
              const isActive = activeAnchor === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToAnchor(item.id)}
                  className={`h-12 border-b-2 inline-flex items-center text-[14px] whitespace-nowrap cursor-pointer transition-colors ${
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
            <div className="hidden lg:flex items-center gap-3 shrink-0 py-2">
              <div className="text-right">
                <span className="text-[14px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  {hasConfirmedDates && isMultiRoomHotel && cheapestAvailableRoomPricing
                    ? `${language === "th" ? "เริ่มต้น " : "From "}฿${cheapestAvailableRoomPricing.subtotalThb.toLocaleString()}`
                    : hasConfirmedDates && !isMultiRoomHotel && stickyPricing
                    ? `฿${stickyPricing.netTotalThb.toLocaleString()}`
                    : `${language === "th" ? "เริ่มต้น " : "From "}฿${minRoomPrice.toLocaleString()}`}
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {" "}
                  {hasConfirmedDates && stayMinNightsInfo.isBlocked
                    ? language === "th"
                      ? `ขั้นต่ำ ${stayMinNightsInfo.requiredMinNights} คืน`
                      : `Min. ${stayMinNightsInfo.requiredMinNights} nights`
                    : hasConfirmedDates
                    ? language === "th"
                      ? `สำหรับ ${stayNights} คืน`
                      : `for ${stayNights} ${stayNights === 1 ? "night" : "nights"}`
                    : `/ ${language === "th" ? "คืน" : "night"}`}{" "}
                  · ★ {hotel.ratingAvg.toFixed(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedDates) {
                    openDatePicker("checkin");
                  } else if (stayMinNightsInfo.isBlocked) {
                    handleCommitStayDates(
                      checkIn,
                      addDaysToDate(checkIn, stayMinNightsInfo.requiredMinNights)
                    );
                  } else if (isMultiRoomHotel) {
                    if (matchingAvailableRooms.length > 0) {
                      setIsChooseRoomSheetOpen(true);
                    } else {
                      openDatePicker("checkin");
                    }
                  } else if (
                    singleUnitRoom &&
                    singleUnitRoom.availableUnits > 0 &&
                    singleUnitRoom.maxGuests >= guests
                  ) {
                    navigateToCheckout(singleUnitRoom);
                  } else {
                    openDatePicker("checkin", singleUnitRoom?.id ?? null);
                  }
                }}
                className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold cursor-pointer transition-colors"
              >
                {!hasConfirmedDates
                  ? language === "th"
                    ? "เช็กวันว่าง"
                    : "Check availability"
                  : stayMinNightsInfo.isBlocked
                  ? language === "th"
                    ? `ปรับเป็น ${stayMinNightsInfo.requiredMinNights} คืน`
                    : `Extend to ${stayMinNightsInfo.requiredMinNights} nights`
                  : isMultiRoomHotel
                  ? matchingAvailableRooms.length > 0
                    ? language === "th"
                      ? "เลือกห้องพัก"
                      : "Choose room"
                    : language === "th"
                    ? "เปลี่ยนวัน"
                    : "Change dates"
                  : singleUnitRoom &&
                    singleUnitRoom.availableUnits > 0 &&
                    singleUnitRoom.maxGuests >= guests
                  ? language === "th"
                    ? "จองที่พักนี้"
                    : "Reserve"
                  : language === "th"
                  ? "เปลี่ยนวัน"
                  : "Change dates"}
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
          {/* 3A. Overview + Inline Rating & Direct Stay Trust Line */}
          <section className="pb-6 space-y-2.5">
            <div className="space-y-1">
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th"
                  ? `ที่พักจองตรงใน ${hotel.districtTh} จ.${hotel.provinceNameTh}`
                  : `Direct stay in ${hotel.districtTh}, ${hotel.provinceNameEn}`}
              </h2>
              <p className="ty-body text-[var(--color-text-secondary)]">
                {!isMultiRoomHotel && singleUnitRoom
                  ? language === "th"
                    ? `สูงสุด ${singleUnitRoom.maxGuests} ท่าน · ${singleUnitRoom.bedrooms} ห้องนอน · ${singleUnitRoom.beds} เตียง · ${singleUnitRoom.bathrooms} ห้องน้ำ · ${singleUnitRoom.sizeSqm} ตร.ม.`
                    : `Up to ${singleUnitRoom.maxGuests} guests · ${singleUnitRoom.bedrooms} bedroom · ${singleUnitRoom.beds} bed · ${singleUnitRoom.bathrooms} bath · ${singleUnitRoom.sizeSqm} sqm`
                  : language === "th"
                  ? `${rooms.length} แบบห้องพัก · เช็กอิน ${hotel.checkInTime} น. · ฟรีค่าธรรมเนียมตัวกลาง 0% GP`
                  : `${rooms.length} room types · Check-in ${hotel.checkInTime} · Direct 0% GP`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] text-[var(--color-text-primary)]">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="w-4 h-4 fill-current" />
                <span>{hotel.ratingAvg.toFixed(1)}</span>
              </span>
              <span aria-hidden="true" className="text-[var(--color-text-secondary)]">·</span>
              <button
                type="button"
                onClick={() => scrollToAnchor("reviews")}
                className="font-semibold underline underline-offset-2 cursor-pointer hover:opacity-80"
              >
                {language === "th"
                  ? `${reviews.length} รีวิวผู้พัก`
                  : `${reviews.length} reviews`}
              </button>
              <span aria-hidden="true" className="text-[var(--color-text-secondary)]">·</span>
              <span className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                <span>
                  {language === "th"
                    ? "ที่พักยืนยันตัวตน · โอนตรงบัญชีที่พัก"
                    : "Verified stay · Direct host payment"}
                </span>
              </span>
            </div>
          </section>

          {/* 3B. Host Identity */}
          <section className="py-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={avatarUrl}
                  alt={hotel.nameTh}
                  className="h-11 w-11 rounded-full object-cover bg-[var(--color-background-muted)] shrink-0"
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
            </div>

            {contactToast && (
              <div className="rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-4 py-2.5 text-[13.5px] font-semibold">
                {contactToast}
              </div>
            )}
          </section>

          {/* 3B-2. Direct Stay Coupons Section (Signature 3D Flip Ticket Design) */}
          {coupons.length > 0 && (
            <section id="section-coupons" className="py-8 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[18px] sm:text-[20px] font-semibold text-[var(--color-text-primary)]">
                      {language === "th"
                        ? "คูปองส่วนลดของที่พักนี้"
                        : "Direct stay coupons"}
                    </h2>
                    {claimedHotelCoupons.length > 0 && (
                      <span className="h-6 px-2.5 rounded-[8px] bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
                        <span>
                          {language === "th"
                            ? `มีในกระเป๋าแล้ว ${claimedHotelCoupons.length} ใบ`
                            : `${claimedHotelCoupons.length} in your wallet`}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="ty-caption text-[var(--color-text-secondary)]">
                    {claimedHotelCoupons.length > 0
                      ? language === "th"
                        ? "คุณมีคูปองส่วนลดสำหรับที่พักนี้แล้ว · ระบบนำส่วนลดที่คุ้มที่สุดไปคำนวณให้อัตโนมัติตอนจอง"
                        : "You have saved coupon(s) for this stay · Auto-applied at checkout"
                      : language === "th"
                      ? "เก็บคูปองส่วนลดจองตรง 0% GP เข้ากระเป๋า เพื่อใช้ลดราคาห้องพักได้ทันที"
                      : "Collect direct booking coupons to save on your stay"}
                  </p>
                </div>
              </div>

              <div
                className={
                  coupons.length === 1
                    ? "max-w-[380px]"
                    : "-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 gap-3.5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar"
                }
              >
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className={
                      coupons.length > 1
                        ? "w-[88%] max-w-[340px] sm:w-auto sm:max-w-none shrink-0 snap-start"
                        : "w-full"
                    }
                  >
                    <HotelCouponTicketCard
                      deal={coupon}
                      language={language}
                      isClaimed={isHotelCouponClaimed(coupon)}
                      isClaiming={claimingCouponId === coupon.id}
                      variant="compact"
                      subtitleMode="campaign"
                      notchBgClass="bg-[var(--color-background-body)]"
                      onClaim={(targetDeal, sourceEl) =>
                        handleClaimHotelCoupon(targetDeal, sourceEl)
                      }
                      onRedeem={handleRedeemHotelCoupon}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

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

          {/* 3D-HOTEL: MULTI-ROOM CHOOSE YOUR ROOM (Promoted right after Highlights — Airbnb Hotel Layout, NO inline 2-month calendar) */}
          {isMultiRoomHotel && (
            <HotelChooseRoomSection
              language={language}
              checkInDate={checkIn}
              checkOutDate={checkOut}
              hasConfirmedDates={hasConfirmedDates}
              isRefreshingDates={isRefreshingDates}
              guests={guests}
              rooms={rooms}
              dateOverrides={dateOverrides}
              discountRules={discountRules}
              selectedRoomId={selectedRoomId}
              fallbackCoverUrl={coverBannerUrl}
              onOpenDatePicker={() => openDatePicker("checkin")}
              onSelectRoom={(rm) => {
                setSelectedRoomId(rm.id);
                openRoomDetailsDrawer(rm);
              }}
            />
          )}

          {/* 3D. Editorial Description (Clamped + Opens Slide-Up Bottom Sheet) */}
          {fullBio && (
            <section className="py-8 lg:py-10 space-y-3">
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th"
                  ? `เกี่ยวกับ ${hotel.nameTh}`
                  : `About ${hotel.nameEn}`}
              </h2>
              {(hotel.taglineTh || hotel.taglineEn) &&
                fullBio !== hotel.taglineTh && (
                  <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {language === "th" ? hotel.taglineTh : hotel.taglineEn}
                  </p>
                )}
              <p className="text-[15.5px] leading-[1.65] text-[var(--color-text-primary)] line-clamp-4">
                {fullBio}
              </p>
              {(fullBio.length > 160 || hotel.highlights.length > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveInfoSheet("description")}
                  className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer inline-flex items-center gap-1 hover:opacity-80"
                >
                  <span>
                    {language === "th" ? "อ่านเพิ่มเติม" : "Show more"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </section>
          )}

          {/* 3E-HOST: SINGLE-UNIT WHERE YOU'LL SLEEP SUMMARY (Airbnb Host Layout — Zero redundant room picker!) */}
          {!isMultiRoomHotel && singleUnitRoom && (
            <section className="py-8 lg:py-10 space-y-4">
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th" ? "พื้นที่พักผ่อน" : "Where you'll sleep"}
              </h2>

              <div
                role="button"
                tabIndex={0}
                onClick={() => openRoomDetailsDrawer(singleUnitRoom)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRoomDetailsDrawer(singleUnitRoom);
                  }
                }}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-[16px] p-3 -mx-3 hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
              >
                <div className="relative w-full sm:w-[200px] aspect-[16/10] rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 group-hover:brightness-95 transition">
                  <img
                    src={getOptimizedPinImageUrl(
                      singleUnitRoom.galleryUrls[0] || coverBannerUrl,
                      "gallery"
                    )}
                    srcSet={getOptimizedPinImageSrcSet(
                      singleUnitRoom.galleryUrls[0] || coverBannerUrl,
                      "gallery"
                    )}
                    sizes="(max-width: 639px) 100vw, 200px"
                    alt={
                      language === "th"
                        ? singleUnitRoom.nameTh
                        : singleUnitRoom.nameEn
                    }
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-[var(--color-text-primary)]">
                    <BedDouble className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                    <h3 className="text-[16.5px] font-semibold truncate">
                      {language === "th"
                        ? singleUnitRoom.nameTh
                        : singleUnitRoom.nameEn}
                    </h3>
                  </div>

                  <p className="text-[14px] text-[var(--color-text-secondary)]">
                    {language === "th"
                      ? `${singleUnitRoom.bedrooms} ห้องนอน · ${singleUnitRoom.beds} เตียง · ${singleUnitRoom.bathrooms} ห้องน้ำ · ${singleUnitRoom.sizeSqm} ตร.ม.`
                      : `${singleUnitRoom.bedrooms} bedroom · ${singleUnitRoom.beds} bed · ${singleUnitRoom.bathrooms} bath · ${singleUnitRoom.sizeSqm} sqm`}
                  </p>

                  {(singleUnitRoom.shortDescTh || singleUnitRoom.shortDescEn) && (
                    <p className="text-[13.5px] text-[var(--color-text-secondary)] line-clamp-2">
                      {language === "th"
                        ? singleUnitRoom.shortDescTh
                        : singleUnitRoom.shortDescEn ||
                          singleUnitRoom.shortDescTh}
                    </p>
                  )}

                  <span className="inline-flex items-center gap-1 pt-1 text-[13.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2">
                    <span>
                      {language === "th"
                        ? "ดูรายละเอียดและรูปภาพทั้งหมด"
                        : "View room details & photos"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 3F. AMENITIES SECTION (#section-amenities — Clamped 6 Mobile / 8 Desktop + Bottom Sheet) */}
          {allUniqueAmenities.length > 0 && (
            <section
              id="section-amenities"
              className="py-8 lg:py-10 space-y-5 scroll-mt-20 lg:scroll-mt-32"
            >
              <h2 className="ty-title text-[var(--color-text-primary)]">
                {language === "th"
                  ? "ที่พักนี้มีสิ่งอำนวยความสะดวกอะไรบ้าง"
                  : "What this place offers"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8">
                {displayedAmenities.map((item, idx) => {
                  const meta = getFacilityIconMeta(item);
                  const Icon = meta.Icon;
                  return (
                    <div
                      key={item}
                      className={`${
                        idx >= 6 ? "hidden sm:flex" : "flex"
                      } items-center gap-3.5 ty-body text-[var(--color-text-primary)] min-w-0`}
                    >
                      <Icon className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  );
                })}
              </div>

              {allUniqueAmenities.length > 6 && (
                <button
                  type="button"
                  onClick={() => setActiveInfoSheet("amenities")}
                  className="w-full sm:w-auto h-12 px-6 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {language === "th"
                    ? `แสดงสิ่งอำนวยความสะดวกทั้งหมด (${allUniqueAmenities.length})`
                    : `Show all ${allUniqueAmenities.length} amenities`}
                </button>
              )}
            </section>
          )}

          {/* 3G-HOST: SINGLE-UNIT INLINE 2-MONTH AVAILABILITY CALENDAR (Host Mode ONLY — 1:1 exact availability) */}
          {!isMultiRoomHotel && (
            <section
              id="section-rooms"
              ref={calendarSectionRef}
              className="py-8 lg:py-10 scroll-mt-20 lg:scroll-mt-32"
            >
              <AirbnbStayCalendar
                language={language}
                todayDate={today}
                checkInDate={checkIn}
                checkOutDate={checkOut}
                onChangeDates={handleCommitStayDates}
                guests={guests}
                onChangeGuests={setGuests}
                stayNights={stayNights}
                hotelName={language === "th" ? hotel.nameTh : hotel.nameEn}
                rooms={rooms}
                calendarRoomFilterId={singleUnitRoom?.id ?? calendarRoomFilterId}
                onChangeCalendarRoomFilterId={setCalendarRoomFilterId}
                bookedUnitsByRoomDate={bookedUnitsByRoomDate}
                dateOverrides={dateOverrides}
              />
            </section>
          )}
        </div>

        {/* RIGHT STICKY SIDEBAR (4 OF 12 COLS — HIDDEN ON MOBILE/TABLET, AIRBNB FLOATING FOOTER SHOWN INSTEAD) */}
        <aside
          ref={stickySidebarRef}
          className="hidden lg:block lg:col-start-9 lg:col-span-4 lg:sticky lg:top-[128px] lg:z-20 relative"
        >
          {rooms.length > 0 && (
            <div className="space-y-3">
              {/* Subtle Direct Coupon Banner above Sticky Widget (Zero extra shadow per Design System v3.0) */}
              {coupons.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("section-coupons")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {language === "th"
                      ? `มีคูปองส่วนลดจองตรง ${coupons.length} ใบ (0% GP)`
                      : `${coupons.length} direct stay coupon${
                          coupons.length > 1 ? "s" : ""
                        } available`}
                  </span>
                </button>
              )}

              <div
                ref={stickyCardRef}
                className="relative rounded-[16px] border border-black/[0.04] dark:border-white/[0.08] shadow-[var(--shadow-booking-widget)] bg-[var(--color-background-card)] p-6 space-y-4"
              >
                {/* Anchored Desktop 2-Month Calendar Popover (Portal z-[80] — Zero stacking overlap!) */}
                <DesktopDateRangePopover
                  isOpen={desktopDatePopoverPhase !== null}
                  onClose={() => setDesktopDatePopoverPhase(null)}
                  anchorRef={stickyCardRef}
                  language={language}
                  todayDate={today}
                  checkInDate={checkIn}
                  checkOutDate={checkOut}
                  hasConfirmedDates={hasConfirmedDates}
                  initialPhase={desktopDatePopoverPhase ?? "checkin"}
                  guests={guests}
                  rooms={rooms}
                  bookedUnitsByRoomDate={bookedUnitsByRoomDate}
                  dateOverrides={dateOverrides}
                  specificRoomId={
                    !isMultiRoomHotel
                      ? singleUnitRoom?.id ?? null
                      : datePickerScopeRoomId
                  }
                  onCommitDates={handleCommitStayDates}
                  onClearDates={handleClearStayDates}
                />

                {/* Price Header */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {isMultiRoomHotel ? (
                    hasConfirmedDates ? (
                      cheapestAvailableRoomPricing ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[14px] text-[var(--color-text-secondary)]">
                            {language === "th" ? "เริ่มต้น" : "From"}
                          </span>
                          <span className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-4 tabular-nums">
                            ฿
                            {cheapestAvailableRoomPricing.subtotalThb.toLocaleString()}
                          </span>
                          <span className="ty-caption text-[var(--color-text-secondary)]">
                            {language === "th"
                              ? `สำหรับ ${stayNights} คืน`
                              : `for ${stayNights} ${
                                  stayNights === 1 ? "night" : "nights"
                                }`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                          {language === "th"
                            ? "ไม่มีห้องว่างในช่วงนี้"
                            : "No rooms available"}
                        </span>
                      )
                    ) : (
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[14px] text-[var(--color-text-secondary)]">
                          {language === "th" ? "เริ่มต้น" : "From"}
                        </span>
                        <span className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-4 tabular-nums">
                          ฿{minRoomPrice.toLocaleString()}
                        </span>
                        <span className="ty-caption text-[var(--color-text-secondary)]">
                          / {language === "th" ? "คืน" : "night"}
                        </span>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-4 tabular-nums">
                          ฿
                          {(hasConfirmedDates && stickyPricing
                            ? stickyPricing.netTotalThb
                            : singleUnitRoom?.weekdayPriceThb ?? minRoomPrice
                          ).toLocaleString()}
                        </span>
                        <span className="ty-caption text-[var(--color-text-secondary)]">
                          {hasConfirmedDates
                            ? language === "th"
                              ? `สำหรับ ${stayNights} คืน`
                              : `for ${stayNights} ${
                                  stayNights === 1 ? "night" : "nights"
                                }`
                            : `/ ${language === "th" ? "คืน" : "night"}`}
                        </span>
                      </div>

                      {hasConfirmedDates && singleUnitRoom && (
                        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-text-primary)]">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              singleUnitRoom.availableUnits > 0
                                ? "bg-[var(--color-success)]"
                                : "bg-[var(--color-error)]"
                            }`}
                          />
                          <span>
                            {singleUnitRoom.availableUnits > 0
                              ? language === "th"
                                ? "ว่างพร้อมจอง"
                                : "Available"
                              : language === "th"
                              ? "เต็มช่วงนี้"
                              : "Full"}
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Airbnb Unified 2-Row Input Box: CHECK-IN | CHECKOUT + GUESTS (Clean, Zero Room Dropdown) */}
                <div className="rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] divide-y divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)] bg-[var(--color-background-card)]">
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <button
                      type="button"
                      onClick={() => openDatePicker("checkin")}
                      className="px-3 py-2.5 rounded-tl-[11px] text-left hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                        {language === "th" ? "เช็กอิน" : "CHECK-IN"}
                      </span>
                      <span
                        className={`block text-[13.5px] mt-0.5 truncate ${
                          hasConfirmedDates
                            ? "text-[var(--color-text-primary)] font-medium"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {hasConfirmedDates
                          ? formatShortDate(checkIn, language)
                          : language === "th"
                          ? "เพิ่มวันที่"
                          : "Add date"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openDatePicker("checkout")}
                      className="px-3 py-2.5 rounded-tr-[11px] text-left hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                        {language === "th" ? "เช็กเอาต์" : "CHECKOUT"}
                      </span>
                      <span
                        className={`block text-[13.5px] mt-0.5 truncate ${
                          hasConfirmedDates
                            ? "text-[var(--color-text-primary)] font-medium"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {hasConfirmedDates
                          ? formatShortDate(checkOut, language)
                          : language === "th"
                          ? "เพิ่มวันที่"
                          : "Add date"}
                      </span>
                    </button>
                  </div>

                  <div className="px-3 py-2.5 rounded-b-[11px] flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                        {language === "th" ? "ผู้เข้าพัก" : "GUESTS"}
                      </span>
                      <span className="block text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
                        {guests}{" "}
                        {language === "th"
                          ? "ท่าน"
                          : guests === 1
                          ? "guest"
                          : "guests"}{" "}
                        ({language === "th" ? "สูงสุด" : "max"}{" "}
                        {maxHotelGuests})
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        aria-label="Decrease guests"
                        className="h-7 w-7 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-4 text-center text-[13px] font-semibold tabular-nums">
                        {guests}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGuests(
                            Math.min(Math.max(12, maxHotelGuests), guests + 1)
                          )
                        }
                        aria-label="Increase guests"
                        className="h-7 w-7 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Minimum Stay Notice (Surfaced Immediately When Date Range < minNights) */}
                {hasConfirmedDates && stayMinNightsInfo.isBlocked && (
                  <div className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-text-primary)]">
                    {language === "th"
                      ? `ช่วงวันที่เลือกกำหนดเข้าพักขั้นต่ำ ${stayMinNightsInfo.requiredMinNights} คืน กรุณาปรับวันเช็กเอาต์`
                      : `Minimum stay of ${stayMinNightsInfo.requiredMinNights} nights is required for these dates.`}
                  </div>
                )}

                {/* Primary CTA — Auto-Adjusted by Storefront Mode & Date Confirmation */}
                {!hasConfirmedDates ? (
                  <button
                    type="button"
                    onClick={() => openDatePicker("checkin")}
                    className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                  >
                    {language === "th" ? "เช็กวันว่าง" : "Check availability"}
                  </button>
                ) : stayMinNightsInfo.isBlocked ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleCommitStayDates(
                        checkIn,
                        addDaysToDate(checkIn, stayMinNightsInfo.requiredMinNights)
                      )
                    }
                    className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                  >
                    {language === "th"
                      ? `ปรับเป็น ${stayMinNightsInfo.requiredMinNights} คืน`
                      : `Extend to ${stayMinNightsInfo.requiredMinNights} nights`}
                  </button>
                ) : isMultiRoomHotel ? (
                  matchingAvailableRooms.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsChooseRoomSheetOpen(true)}
                      className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                    >
                      {language === "th" ? "เลือกห้องพัก" : "Choose room"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDatePicker("checkin")}
                      className="w-full h-12 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14.5px] font-semibold cursor-pointer transition-colors"
                    >
                      {language === "th"
                        ? "ไม่มีห้องว่าง · เปลี่ยนวันเข้าพัก"
                        : "Change dates"}
                    </button>
                  )
                ) : singleUnitRoom &&
                  singleUnitRoom.availableUnits > 0 &&
                  singleUnitRoom.maxGuests >= guests ? (
                  <button
                    type="button"
                    onClick={() => navigateToCheckout(singleUnitRoom)}
                    className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                  >
                    {language === "th" ? "จองที่พักนี้" : "Reserve"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openDatePicker("checkin", singleUnitRoom?.id ?? null)
                    }
                    className="w-full h-12 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold cursor-pointer transition-colors"
                  >
                    {singleUnitRoom && singleUnitRoom.availableUnits === 0
                      ? language === "th"
                        ? "เต็มช่วงนี้ · เปลี่ยนวันเข้าพัก"
                        : "Check availability"
                      : language === "th"
                      ? `ผู้เข้าพักเกิน ${singleUnitRoom?.maxGuests ?? maxHotelGuests} ท่าน`
                      : `Max ${singleUnitRoom?.maxGuests ?? maxHotelGuests} guests`}
                  </button>
                )}

                {hasConfirmedDates && (
                  <p className="text-center text-[12.5px] text-[var(--color-text-secondary)]">
                    {language === "th"
                      ? "ยังไม่เรียกเก็บเงินตอนนี้ · ล็อคห้อง 15 นาทีเพื่อโอนตรงที่พัก"
                      : "You won't be charged yet"}
                  </p>
                )}

                {/* Single-Unit Host Mode Price Breakdown (Only after dates confirmed & available) */}
                {!isMultiRoomHotel &&
                  hasConfirmedDates &&
                  singleUnitRoom &&
                  singleUnitRoom.availableUnits > 0 &&
                  stickyPricing && (
                    <div className="space-y-2.5 pt-2 ty-body">
                      <div className="flex justify-between text-[var(--color-text-primary)]">
                        <span className="underline decoration-[var(--color-border-emphasized)]">
                          ฿
                          {Math.round(
                            (stickyBasePricing?.roomSubtotalThb ??
                              singleUnitRoom.weekdayPriceThb * stayNights) /
                              stayNights
                          ).toLocaleString()}{" "}
                          × {stayNights}{" "}
                          {language === "th"
                            ? "คืน"
                            : stayNights === 1
                            ? "night"
                            : "nights"}
                        </span>
                        <span>
                          ฿
                          {(
                            (stickyBasePricing?.roomSubtotalThb ?? 0) -
                            (stickyBasePricing?.extraGuestTotalThb ?? 0)
                          ).toLocaleString()}
                        </span>
                      </div>

                      {stickyBasePricing &&
                        stickyBasePricing.extraGuestTotalThb > 0 && (
                          <div className="flex justify-between text-[var(--color-text-primary)]">
                            <span>
                              {language === "th"
                                ? "ค่าผู้เข้าพักเสริม"
                                : "Extra guest fee"}
                            </span>
                            <span>
                              +฿
                              {stickyBasePricing.extraGuestTotalThb.toLocaleString()}
                            </span>
                          </div>
                        )}

                      {stickyPricing.discountThb > 0 &&
                        (stickyPricing.appliedCouponCode ||
                          stickyPricing.appliedAutoDiscountLabel) && (
                          <div className="flex justify-between gap-2 text-[var(--color-success)] font-medium">
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <Tag className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {stickyPricing.appliedCouponCode
                                  ? language === "th"
                                    ? `ส่วนลดคูปอง ${stickyPricing.appliedCouponCode}`
                                    : `Coupon ${stickyPricing.appliedCouponCode}`
                                  : stickyPricing.appliedAutoDiscountLabel}
                              </span>
                            </span>
                            <span className="shrink-0">
                              −฿{stickyPricing.discountThb.toLocaleString()}
                            </span>
                          </div>
                        )}

                      <div className="flex justify-between text-[var(--color-text-secondary)]">
                        <span>
                          {language === "th"
                            ? "ค่าบริการแพลตฟอร์ม (0% GP)"
                            : "Platform service fee (0% GP)"}
                        </span>
                        <span className="text-[var(--color-text-primary)]">
                          ฿0
                        </span>
                      </div>

                      <div className="pt-3.5 border-t border-[var(--color-border)] flex items-baseline justify-between font-semibold text-[var(--color-text-primary)]">
                        <span>
                          {language === "th" ? "ยอดรวมสุทธิ" : "Total"}
                        </span>
                        <span className="text-[17px] tabular-nums">
                          ฿{stickyPricing.netTotalThb.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
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
            savedPinIds={effectiveSavedPinIds}
            relatedPins={gridHotelPins}
            detailFooterMode="property-only"
            hotelPosts={storefront.posts}
            prevPinPreview={prevHotelPinPreview}
            nextPinPreview={nextHotelPinPreview}
            mobileOverlayMode={true}
            canStepBack={pinHistoryStack.length > 0}
            restoreScrollY={detailRestoreScrollY}
            onBack={handleStepBackHotelPin}
            onClose={handleCloseHotelPin}
            onSelectPin={(next) => handleSelectPinFromMasonry(next, true)}
            onNavigatePin={handleNavigateHotelPin}
            onToggleLike={(pinId) => {
              const target =
                (activePin.id === pinId ? activePin : null) ??
                storefront.pins.find((p) => p.id === pinId);
              if (!target) return;
              togglePinLikeInstant({
                id: target.id,
                isLikedByMe: target.isLikedByMe,
                likesCount: target.likesCount,
              });
            }}
            onToggleSave={async (pinId) => {
              const target =
                storefront.pins.find((p) => p.id === pinId) ?? activePin;
              if (!target) return;
              const res = await triggerPinToBoard({
                id: target.id,
                coverImageUrl: target.coverImageUrl,
                isSavedByMe: effectiveSavedPinIds.has(target.id),
              });
              if (res) {
                setOptimisticSavedIds((prev) => {
                  const next = new Set(prev);
                  if (res.isSaved) next.add(pinId);
                  else next.delete(pinId);
                  return next;
                });
              }
            }}
            onSharePin={handleSharePin}
            onExpandMedia={(urls, idx) =>
              setFullscreenMedia({
                slides: urls.map((u) => ({ type: "image", url: u })),
                index: idx,
              })
            }
            onAddComment={async (text, parentId) => {
              const runComment = async () => {
                await fetch(
                  `/api/pins/${encodeURIComponent(activePin.id)}/comments`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body: text, parentId }),
                  }
                );
                await loadPinDetail(activePin.id);
              };
              if (!currentUser) {
                openAuthModal({
                  reasonTh: "เข้าสู่ระบบเพื่อแสดงความคิดเห็น",
                  reasonEn: "Log in to post a comment",
                  onSuccess: runComment,
                });
                return;
              }
              await runComment();
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
                    isSaved={effectiveSavedPinIds.has(pin.id)}
                    onSelectPin={handleSelectPinFromMasonry}
                    onToggleSave={async (pinId) => {
                      const target =
                        storefront.pins.find((p) => p.id === pinId) ?? pin;
                      const res = await triggerPinToBoard({
                        id: target.id,
                        coverImageUrl: target.coverImageUrl,
                        isSavedByMe: effectiveSavedPinIds.has(target.id),
                      });
                      if (res) {
                        setOptimisticSavedIds((prev) => {
                          const next = new Set(prev);
                          if (res.isSaved) next.add(pinId);
                          else next.delete(pinId);
                          return next;
                        });
                      }
                    }}
                    onToggleLike={(pinId) => {
                      const target =
                        storefront.pins.find((p) => p.id === pinId) ?? pin;
                      togglePinLikeInstant({
                        id: target.id,
                        isLikedByMe: target.isLikedByMe,
                        likesCount: target.likesCount,
                      });
                    }}
                    onSharePin={handleSharePin}
                  />
                )}
              />

              {masonrySectionPins.length > 6 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAllPins((v) => !v)}
                    className="w-full sm:w-auto h-12 px-6 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
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

      {/* 4B. GUEST REVIEWS (#section-reviews — Mobile Horizontal Carousel / Desktop 2-Col Editorial Grid) */}
      <section
        id="section-reviews"
        className="py-12 border-t border-[var(--color-border)] space-y-6 scroll-mt-20 lg:scroll-mt-32"
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
          <div className="space-y-6">
            <div className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3.5 -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 pb-1 no-scrollbar md:mx-0 md:px-0 md:scroll-px-0 md:pb-0 md:grid md:grid-cols-2 md:gap-x-16 md:gap-y-8">
              {reviews.slice(0, 6).map((rv) => (
                <article
                  key={rv.id}
                  className="w-[82vw] max-w-[330px] shrink-0 snap-start rounded-[16px] border border-[var(--color-border)] p-4 flex flex-col justify-between gap-3 md:w-auto md:max-w-none md:rounded-none md:border-0 md:p-0"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center font-semibold text-[15px] text-[var(--color-text-primary)] shrink-0">
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

                    <p className="text-[15.5px] leading-[1.65] text-[var(--color-text-primary)] line-clamp-4">
                      {rv.commentTh}
                    </p>

                    {rv.commentTh.length > 130 && (
                      <button
                        type="button"
                        onClick={() => setActiveInfoSheet("reviews")}
                        className="text-[13.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 hover:opacity-80"
                      >
                        <span>{language === "th" ? "อ่านต่อ" : "Show more"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {rv.ownerReplyTh && (
                      <div className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2.5 space-y-1">
                        <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                          {language === "th"
                            ? `ตอบกลับจาก ${hotel.nameTh}`
                            : `Response from ${hotel.nameEn}`}
                        </p>
                        <p className="text-[13px] leading-[1.55] text-[var(--color-text-secondary)] line-clamp-3">
                          {rv.ownerReplyTh}
                        </p>
                      </div>
                    )}
                  </div>

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
                          className="h-20 w-28 rounded-[10px] object-cover cursor-pointer shrink-0 hover:brightness-95 transition"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveInfoSheet("reviews")}
              className="w-full sm:w-auto h-12 px-6 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              {language === "th"
                ? `ดูรีวิวทั้งหมด (${reviews.length})`
                : `Show all ${reviews.length} reviews`}
            </button>
          </div>
        )}
      </section>

      {/* 4C. LOCATION & INTERACTIVE EXPLORER MAP (#section-location — Square Mobile + Fullscreen Modal) */}
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
        </div>

        <HotelLocationMap
          hotelName={language === "th" ? hotel.nameTh : hotel.nameEn}
          addressText={hotel.addressTh}
          districtText={hotel.districtTh}
          provinceText={hotel.provinceNameTh}
          latitude={hotel.latitude}
          longitude={hotel.longitude}
          googleMapsUrl={hotel.googleMapsUrl}
          nearbySpots={hotel.nearbySpots}
          language={language}
        />
      </section>

      {/* 4D. HOTEL GUIDES / BLOG (#section-blog — Mobile Snap Carousel / Desktop 3-Col Grid) */}
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
              className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>ดูทั้งหมด ({posts.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-4 -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 pb-1 no-scrollbar md:mx-0 md:px-0 md:scroll-px-0 md:pb-0 md:grid md:grid-cols-3 md:gap-6 md:items-start">
            {posts.map((post) => (
              <article
                key={post.id}
                className="w-[80vw] max-w-[310px] shrink-0 snap-start md:w-auto md:max-w-none flex flex-col gap-3"
              >
                <Link
                  href={`/${hotel.slug}/posts/${post.slug}`}
                  className="block relative aspect-[16/10] rounded-[14px] bg-[var(--color-background-muted)] overflow-hidden hover:brightness-95 transition"
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

                <div className="space-y-1.5 min-w-0">
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

                <div className="pt-0.5 flex items-center justify-between gap-2">
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
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 4D-2. NEARBY PLACES ON NONDII (STRICT 1-HOP LOCK + 3D CARD FLIP!) */}
      {!nearbyHopOrigin && nearbyPlaces.length > 0 && (
        <section
          id="section-nearby"
          className="py-10 border-t border-[var(--color-border)] space-y-4 scroll-mt-20 lg:scroll-mt-32"
        >
          <div className="space-y-0.5">
            <h2 className="ty-title text-[var(--color-text-primary)]">
              {language === "th"
                ? `สถานที่ใกล้เคียงรอบ ${hotel.nameTh}`
                : `Nearby places around ${hotel.nameEn}`}
            </h2>
            <p className="ty-caption text-[var(--color-text-secondary)]">
              {language === "th"
                ? "คาเฟ่ ร้านอาหาร ที่เที่ยว และที่พักจริงบน Nondii ปักหมุดเก็บเข้าทริปเดียวกันได้ทันที"
                : "Real places nearby on Nondii — tap to flip in or save to your trip"}
            </p>
          </div>

          <div className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:mx-0 lg:px-0 lg:scroll-px-0 pb-1">
            {nearbyPlaces.slice(0, 8).map((nearby) => (
              <div
                key={nearby.id}
                className="w-[44vw] min-w-[154px] max-w-[186px] sm:w-[192px] shrink-0 snap-start"
              >
                <VerticalCouponCard
                  pin={nearby}
                  language={language}
                  isSaved={effectiveSavedPinIds.has(nearby.id)}
                  distanceKm={nearby.distanceKm}
                  onSelect={(nextPlace, rect) =>
                    handleSelectNearbyPlace(nextPlace, rect)
                  }
                  onToggleSave={(id) => void handleToggleSaveAnyPin(id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4E. THINGS TO KNOW / POLICIES & FAQS (#section-policies — Mobile Tappable Rows + Bottom Sheets / Desktop 3-Column) */}
      <section
        id="section-policies"
        className="py-12 border-t border-[var(--color-border)] space-y-6 scroll-mt-20 lg:scroll-mt-32"
      >
        <h2 className="ty-title text-[var(--color-text-primary)]">
          {language === "th" ? "ข้อควรรู้ก่อนเข้าพัก" : "Things to know"}
        </h2>

        {/* Mobile/Tablet (< md): Airbnb-Style Compact Tappable Rows -> Bottom Sheet */}
        <div className="md:hidden divide-y divide-[var(--color-border)] -my-2">
          <button
            type="button"
            onClick={() => setActiveInfoSheet("rules")}
            className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "กฎและเวลาเข้าพัก" : "House rules"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)] truncate">
                {language === "th"
                  ? `เช็กอินหลัง ${hotel.checkInTime} น. · เช็กเอาต์ก่อน ${hotel.checkOutTime} น.`
                  : `Check-in after ${hotel.checkInTime} · Checkout before ${hotel.checkOutTime}`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setActiveInfoSheet("contact")}
            className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                {language === "th"
                  ? "การจองตรง & ช่องทางติดต่อ"
                  : "Direct booking & contact"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)] truncate">
                {language === "th"
                  ? "ล็อคห้องพัก 15 นาที · โอนตรงเข้าบัญชีที่พัก 0% GP"
                  : "15-min room hold · Direct 0% GP PromptPay"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setActiveInfoSheet("faqs")}
            className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "คำถามที่พบบ่อย" : "Common questions"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)] truncate">
                {hotel.faqs.length > 0
                  ? language === "th"
                    ? `${hotel.faqs.length} คำถามควรรู้ก่อนเข้าพัก`
                    : `${hotel.faqs.length} FAQs before your stay`
                  : language === "th"
                  ? "สอบถามข้อมูลเพิ่มเติมกับเจ้าของที่พัก"
                  : "Message the host directly for details"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
          </button>
        </div>

        {/* Desktop (>= md): Airbnb 3-Column Layout + Bottom Sheet Triggers */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 items-start">
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
            <p className="text-[var(--color-text-secondary)] line-clamp-2">
              {hotel.petsAllowed
                ? hotel.petPolicyTh || "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                : hotel.petPolicyTh || "งดนำสัตว์เลี้ยงเข้าพัก"}
            </p>
            <button
              type="button"
              onClick={() => setActiveInfoSheet("rules")}
              className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 pt-1 hover:opacity-80"
            >
              <span>{language === "th" ? "ดูรายละเอียด" : "Show more"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
            <button
              type="button"
              onClick={() => setActiveInfoSheet("contact")}
              className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 pt-1 hover:opacity-80"
            >
              <span>{language === "th" ? "ดูรายละเอียด" : "Show more"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
                {hotel.faqs.slice(0, 3).map((faq, idx) => (
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
            {hotel.faqs.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveInfoSheet("faqs")}
                className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer inline-flex items-center gap-0.5 pt-1 hover:opacity-80"
              >
                <span>
                  {language === "th"
                    ? `ดูทั้งหมด (${hotel.faqs.length})`
                    : "Show more"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Slide-Up Bottom Sheet Modals (Description / Amenities / Reviews / Rules / Contact / FAQs) */}
      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "description"}
        onClose={() => setActiveInfoSheet(null)}
        title={language === "th" ? "เกี่ยวกับที่พัก" : "About this space"}
      >
        <div className="space-y-5">
          {(hotel.taglineTh || hotel.taglineEn) &&
            fullBio !== hotel.taglineTh && (
              <p className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? hotel.taglineTh : hotel.taglineEn}
              </p>
            )}
          <p className="text-[15.5px] leading-[1.7] text-[var(--color-text-primary)] whitespace-pre-line">
            {fullBio}
          </p>
          {hotel.highlights.length > 0 && (
            <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "จุดเด่นของที่พัก" : "Property highlights"}
              </p>
              {hotel.highlights.map((hl, idx) => {
                const meta = getFacilityIconMeta(hl.titleTh);
                const HlIcon = meta.Icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5">
                    <HlIcon className="w-5 h-5 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {hl.titleTh}
                      </p>
                      <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                        {hl.descTh}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HotelInfoBottomSheet>

      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "amenities"}
        onClose={() => setActiveInfoSheet(null)}
        title={
          language === "th"
            ? `สิ่งอำนวยความสะดวก (${allUniqueAmenities.length})`
            : `What this place offers (${allUniqueAmenities.length})`
        }
      >
        <div className="divide-y divide-[var(--color-border-subtle)] -my-2">
          {allUniqueAmenities.map((item) => {
            const meta = getFacilityIconMeta(item);
            const Icon = meta.Icon;
            return (
              <div key={item} className="py-3.5 flex items-center gap-3.5">
                <Icon className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                <span className="text-[15px] text-[var(--color-text-primary)]">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </HotelInfoBottomSheet>

      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "reviews"}
        onClose={() => setActiveInfoSheet(null)}
        title={`★ ${hotel.ratingAvg.toFixed(1)} · ${
          language === "th"
            ? `${reviews.length} รีวิวจากผู้เข้าพักจริง`
            : `${reviews.length} reviews`
        }`}
      >
        <div className="divide-y divide-[var(--color-border)] -my-4">
          {reviews.map((rv) => (
            <article key={rv.id} className="py-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center font-semibold text-[14px] text-[var(--color-text-primary)] shrink-0">
                  {rv.authorName[0]}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                    {rv.authorName}
                  </p>
                  <p className="text-[12.5px] text-[var(--color-text-secondary)]">
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

              <p className="text-[15px] leading-[1.65] text-[var(--color-text-primary)]">
                {rv.commentTh}
              </p>

              {rv.ownerReplyTh && (
                <div className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {language === "th"
                        ? `ตอบกลับจาก ${hotel.nameTh}`
                        : `Response from ${hotel.nameEn}`}
                    </span>
                    {rv.ownerRepliedAt && (
                      <span className="text-[var(--color-text-secondary)]">
                        {formatShortDate(rv.ownerRepliedAt, language)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {rv.ownerReplyTh}
                  </p>
                </div>
              )}

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
                      className="h-20 w-28 rounded-[10px] object-cover cursor-pointer shrink-0 hover:brightness-95 transition"
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </HotelInfoBottomSheet>

      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "rules"}
        onClose={() => setActiveInfoSheet(null)}
        title={language === "th" ? "กฎและเวลาเข้าพัก" : "House rules"}
      >
        <div className="divide-y divide-[var(--color-border-subtle)] -my-2">
          <div className="py-3.5 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {language === "th"
                  ? `เช็กอินหลัง ${hotel.checkInTime} น.`
                  : `Check-in after ${hotel.checkInTime}`}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                {language === "th"
                  ? `เช็กเอาต์ก่อน ${hotel.checkOutTime} น.`
                  : `Checkout before ${hotel.checkOutTime}`}
              </p>
            </div>
          </div>

          <div className="py-3.5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "นโยบายสัตว์เลี้ยง" : "Pet policy"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                {hotel.petsAllowed
                  ? hotel.petPolicyTh || "ต้อนรับสัตว์เลี้ยงเข้าพักได้"
                  : hotel.petPolicyTh || "งดนำสัตว์เลี้ยงเข้าพัก"}
              </p>
            </div>
          </div>
        </div>
      </HotelInfoBottomSheet>

      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "contact"}
        onClose={() => setActiveInfoSheet(null)}
        title={
          language === "th"
            ? "การจองตรง & ช่องทางติดต่อ"
            : "Direct booking & contact"
        }
      >
        <div className="space-y-4">
          <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {language === "th"
              ? "จองตรงกับที่พัก ล็อคห้องพักอัตโนมัติ 15 นาที เพื่อสแกนจ่าย PromptPay เข้าบัญชีเจ้าของที่พักโดยตรง (ค่าธรรมเนียมแพลตฟอร์ม 0% GP)"
              : "Book directly with the property. Rooms are held for 15 minutes for direct PromptPay settlement with 0% platform GP."}
          </p>

          <div className="space-y-2">
            {hotel.contactLine && (
              <button
                type="button"
                onClick={() => handleContactClick("LINE")}
                className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4" />
                  <span>LINE OA: {hotel.contactLine}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {hotel.facebookPageUrl && (
              <button
                type="button"
                onClick={() => handleContactClick("FACEBOOK_MESSENGER")}
                className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4" />
                  <span>Facebook Page</span>
                </span>
                <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {hotel.contactPhone && (
              <button
                type="button"
                onClick={() => handleContactClick("PHONE")}
                className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Phone className="w-4 h-4" />
                  <span>{hotel.contactPhone}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            )}
          </div>
        </div>
      </HotelInfoBottomSheet>

      <HotelInfoBottomSheet
        isOpen={activeInfoSheet === "faqs"}
        onClose={() => setActiveInfoSheet(null)}
        title={language === "th" ? "คำถามที่พบบ่อย" : "Common questions"}
      >
        {hotel.faqs.length === 0 ? (
          <p className="text-[15px] text-[var(--color-text-secondary)]">
            {language === "th"
              ? "ทักสอบถามรายละเอียดเพิ่มเติมกับเจ้าของที่พักได้โดยตรงผ่าน LINE หรือโทรศัพท์"
              : "Message the host directly for special requests or questions."}
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)] -my-3">
            {hotel.faqs.map((faq, idx) => (
              <div key={idx} className="py-4 space-y-1.5">
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {faq.qTh}
                </p>
                <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  {faq.aTh}
                </p>
              </div>
            ))}
          </div>
        )}
      </HotelInfoBottomSheet>

      {/* Airbnb Sticky Mobile/Tablet Booking Footer (BOOK_IT_FLOATING_FOOTER, < lg) */}
      {rooms.length > 0 && !activePin && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-background-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="max-w-[680px] mx-auto flex items-center justify-between gap-3">
            {/* Left summary (tapping opens Mobile Vertical Month Sheet) */}
            <button
              type="button"
              onClick={() =>
                openDatePicker(
                  "checkin",
                  !isMultiRoomHotel ? singleUnitRoom?.id ?? null : null
                )
              }
              className="min-w-0 text-left cursor-pointer"
            >
              {isMultiRoomHotel ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    {!hasConfirmedDates ? (
                      <>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                          {language === "th" ? "เริ่มต้น" : "From"}
                        </span>
                        <span className="text-[17px] font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-2 tabular-nums">
                          ฿{minRoomPrice.toLocaleString()}
                        </span>
                      </>
                    ) : cheapestAvailableRoomPricing ? (
                      <>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                          {language === "th" ? "เริ่มต้น" : "From"}
                        </span>
                        <span className="text-[17px] font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-2 tabular-nums">
                          ฿
                          {cheapestAvailableRoomPricing.subtotalThb.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                        {language === "th" ? "เต็มช่วงนี้" : "Sold out"}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">
                    {hasConfirmedDates && stayMinNightsInfo.isBlocked
                      ? language === "th"
                        ? `ช่วงนี้เข้าพักขั้นต่ำ ${stayMinNightsInfo.requiredMinNights} คืน`
                        : `Min. ${stayMinNightsInfo.requiredMinNights} nights required`
                      : hasConfirmedDates
                      ? `${
                          language === "th"
                            ? `สำหรับ ${stayNights} คืน`
                            : `for ${stayNights} ${
                                stayNights === 1 ? "night" : "nights"
                              }`
                        } · ${formatShortDate(
                          checkIn,
                          language
                        )} – ${formatShortDate(checkOut, language)}`
                      : language === "th"
                      ? "ต่อคืน · แตะเพื่อเลือกวันเข้าพัก"
                      : "per night · Tap to pick dates"}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-2 tabular-nums">
                      ฿
                      {(hasConfirmedDates && stickyPricing
                        ? stickyPricing.netTotalThb
                        : singleUnitRoom?.weekdayPriceThb ?? minRoomPrice
                      ).toLocaleString()}
                    </span>
                    <span className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
                      {hasConfirmedDates
                        ? language === "th"
                          ? `สำหรับ ${stayNights} คืน`
                          : `for ${stayNights} ${
                              stayNights === 1 ? "night" : "nights"
                            }`
                        : `/ ${language === "th" ? "คืน" : "night"}`}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">
                    {hasConfirmedDates && stayMinNightsInfo.isBlocked
                      ? language === "th"
                        ? `ช่วงนี้เข้าพักขั้นต่ำ ${stayMinNightsInfo.requiredMinNights} คืน`
                        : `Min. ${stayMinNightsInfo.requiredMinNights} nights required`
                      : hasConfirmedDates
                      ? `${formatShortDate(
                          checkIn,
                          language
                        )} – ${formatShortDate(checkOut, language)}`
                      : language === "th"
                      ? "แตะเพื่อเลือกวันเข้าพัก"
                      : "Tap to add dates"}
                  </p>
                </>
              )}
            </button>

            {/* Right Primary CTA (Auto-Adjusted State Machine) */}
            {!hasConfirmedDates ? (
              <button
                type="button"
                onClick={() =>
                  openDatePicker(
                    "checkin",
                    !isMultiRoomHotel ? singleUnitRoom?.id ?? null : null
                  )
                }
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {language === "th" ? "เช็กวันว่าง" : "Check availability"}
              </button>
            ) : stayMinNightsInfo.isBlocked ? (
              <button
                type="button"
                onClick={() =>
                  handleCommitStayDates(
                    checkIn,
                    addDaysToDate(checkIn, stayMinNightsInfo.requiredMinNights)
                  )
                }
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {language === "th"
                  ? `ปรับเป็น ${stayMinNightsInfo.requiredMinNights} คืน`
                  : `${stayMinNightsInfo.requiredMinNights} nights min`}
              </button>
            ) : isMultiRoomHotel ? (
              matchingAvailableRooms.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsChooseRoomSheetOpen(true)}
                  className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  {language === "th" ? "เลือกห้องพัก" : "Choose room"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openDatePicker("checkin")}
                  className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  {language === "th" ? "เปลี่ยนวัน" : "Change dates"}
                </button>
              )
            ) : singleUnitRoom &&
              singleUnitRoom.availableUnits > 0 &&
              singleUnitRoom.maxGuests >= guests ? (
              <button
                type="button"
                onClick={() => navigateToCheckout(singleUnitRoom)}
                className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {language === "th" ? "จองที่พักนี้" : "Reserve"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openDatePicker("checkin", singleUnitRoom?.id ?? null)
                }
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {language === "th" ? "เปลี่ยนวัน" : "Check dates"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Vertical Multi-Month Date Picker Sheet with "Load more dates" (Airbnb Screenshot 4) */}
      <MobileDateRangeSheet
        isOpen={isMobileDateSheetOpen}
        onClose={() => setIsMobileDateSheetOpen(false)}
        language={language}
        todayDate={today}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        hasConfirmedDates={hasConfirmedDates}
        guests={guests}
        rooms={rooms}
        bookedUnitsByRoomDate={bookedUnitsByRoomDate}
        dateOverrides={dateOverrides}
        minPriceThb={minRoomPrice}
        ratingAvg={hotel.ratingAvg}
        specificRoomId={
          !isMultiRoomHotel ? singleUnitRoom?.id ?? null : datePickerScopeRoomId
        }
        onSaveDates={handleCommitStayDates}
        onClearDates={handleClearStayDates}
      />

      {/* Multi-Room Hotel "Choose your room" Slide-Up Bottom Sheet / Desktop Modal (Airbnb Screenshot 6) */}
      {isMultiRoomHotel && (
        <ChooseRoomBottomSheet
          isOpen={isChooseRoomSheetOpen}
          onClose={() => setIsChooseRoomSheetOpen(false)}
          language={language}
          checkInDate={checkIn}
          checkOutDate={checkOut}
          guests={guests}
          availableRooms={matchingAvailableRooms}
          dateOverrides={dateOverrides}
          coupons={coupons}
          discountRules={discountRules}
          initialCouponCode={initialCouponCode}
          fallbackCoverUrl={coverBannerUrl}
          initialSelectedRoomId={selectedRoomId}
          onInspectRoom={(rm) => {
            setSelectedRoomId(rm.id);
            openRoomDetailsDrawer(rm);
          }}
          onOpenDatePicker={() => openDatePicker("checkin")}
          onConfirmRoom={(rm) => navigateToCheckout(rm)}
        />
      )}

      {/* Airbnb-Grade Centered Split Room Modal (Desktop Left Switcher Rail / Mobile Bottom Sheet) */}
      <RoomBookingDrawer
        isOpen={isBookingDrawerOpen}
        onClose={() => setIsBookingDrawerOpen(false)}
        hotel={hotel}
        rooms={rooms}
        selectedRoom={drawerRoom || rooms[0] || null}
        onSelectRoom={(rm) => {
          setDrawerRoom(rm);
          setSelectedRoomId(rm.id);
        }}
        dateOverrides={dateOverrides}
        coupons={coupons}
        discountRules={discountRules}
        language={language}
        checkInDate={checkIn}
        checkOutDate={checkOut}
        guests={guests}
        hasConfirmedDates={hasConfirmedDates}
        fallbackCoverUrl={coverBannerUrl}
        onExpandPhotos={(urls, idx) =>
          setFullscreenMedia({
            slides: urls.map((u) => ({ type: "image", url: u })),
            index: idx,
          })
        }
        onProceedToCheckout={(rm) => {
          setIsBookingDrawerOpen(false);
          setIsChooseRoomSheetOpen(false);
          navigateToCheckout(rm);
        }}
        onCheckRoomDates={(rm) => {
          setSelectedRoomId(rm.id);
          setCalendarRoomFilterId(rm.id);
          if (!isMultiRoomHotel && isDesktopViewport) {
            scrollToCalendarSection();
          } else {
            openDatePicker("checkin", isMultiRoomHotel ? null : rm.id);
          }
        }}
        onAutoExtendMinNights={(minNights) =>
          handleCommitStayDates(checkIn, addDaysToDate(checkIn, minNights))
        }
      />
        </>
      )}

      {canonicalPin && (
        <PlaceCommentsModal
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          pin={canonicalPin}
          mediaUrls={heroMosaicSlides.map((s) => s.url)}
          comments={canonicalComments}
          language={language}
          currentUser={currentUser}
          isLiked={effectiveHeroIsLiked}
          likesCount={effectiveHeroLikesCount}
          isSaved={effectiveHeroIsSaved}
          onToggleLike={handleHeroToggleLike}
          onToggleSave={() => void handleToggleSaveAnyPin(canonicalPin.id)}
          onShare={() => {
            setIsCommentsModalOpen(false);
            handleShareProperty();
          }}
          onAddComment={handleHeroAddComment}
          onDeleteComment={handleHeroDeleteComment}
        />
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />

      <ShareStayModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        language={language}
        shareUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/${encodeURIComponent(hotel.slug)}`
            : `/${encodeURIComponent(hotel.slug)}`
        }
        title={language === "th" ? hotel.nameTh : hotel.nameEn}
        subtitle={[
          language === "th" ? hotel.provinceNameTh : hotel.provinceNameEn,
          hotel.ratingAvg > 0 ? `★ ${hotel.ratingAvg.toFixed(1)}` : null,
          minRoomPrice > 0
            ? language === "th"
              ? `เริ่มต้น ฿${minRoomPrice.toLocaleString()}/คืน`
              : `from ฿${minRoomPrice.toLocaleString()}/night`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        imageUrl={getOptimizedPinImageUrl(coverBannerUrl, "card")}
      />
    </div>
  );
}
