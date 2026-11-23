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
import dynamic from "next/dynamic";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Globe,
  Layers,
  LayoutGrid,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Shuffle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { STAY_STYLE_TABS } from "@/data/thailandProvinces";
import {
  DEFAULT_PROVINCE_CONFIGS,
  DEFAULT_REGION_CONFIGS,
} from "@/data/thailandProvinceBounds";
import { StandardCheckbox } from "@/components/ui/standards";
import {
  getRecentViewedPinIds,
  RECENT_VIEWS_UPDATED_EVENT,
  recordRecentViewedPinId,
} from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  consumeExploreCameraSnapshot,
  peekExploreCameraSnapshot,
  readExploreViewMode,
  saveExploreCameraSnapshot,
  saveExploreViewMode,
} from "@/lib/placeNavigationStore";
import {
  configureThailandMapInteractions,
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
  THAILAND_DEFAULT_CENTER,
  THAILAND_DEFAULT_ZOOM,
  THAILAND_MAX_ZOOM,
  WORLD_MIN_ZOOM,
} from "@/lib/geo/airbnbMapLibreStyle";
import { getDealPromoOnlyHeadline } from "@/components/home/VerticalCouponCard";
import { ExploreHorizontalCardStrip } from "@/components/explore/ExploreHorizontalCardStrip";
import {
  getPlaceCategoryMeta,
  PLACE_CATEGORIES,
} from "@/lib/placeCategories";
import {
  getPlaceCategoryMapSvg,
  PlaceCategoryCrest,
} from "@/components/shared/PlaceCategoryCrest";
import {
  FannedPhotoCardDeck,
  type FannedDeckCardItem,
} from "@/components/shared/FannedPhotoCardDeck";
import {
  TripCardFlipModal,
  type CardOriginRect,
} from "@/components/trip/TripCardFlipModal";
import type { PureMediaSlide } from "@/components/media/PureMediaViewer";
import { clearLastClickedPinOrigin } from "@/lib/pinOriginStore";
import { preloadPinHeroImages } from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";
import type {
  HotelPostSummaryDto,
  PinCommentDto,
  PinFeedItemDto,
  PlaceCategoryDto,
} from "@/types/cangaroom";
import type { LocationCatalogDto } from "@/lib/services/locationConfigService";
import type {
  LocationScopeId,
  ProvincePickerSelection,
} from "@/components/explore/ProvinceWheelPickerModal";

const ProvinceWheelPickerModal = dynamic(
  () =>
    import("@/components/explore/ProvinceWheelPickerModal").then(
      (mod) => mod.ProvinceWheelPickerModal
    ),
  { ssr: false }
);

const PinterestPinDetail = dynamic(
  () =>
    import("@/components/home/PinterestPinDetail").then(
      (mod) => mod.PinterestPinDetail
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center bg-[var(--color-background-body)]">
        <img
          src="/brand/nondi-icon-with-text-black.svg"
          alt="Nondii"
          className="h-[34px] sm:h-[38px] w-auto object-contain opacity-90 animate-pulse dark:invert"
        />
      </div>
    ),
  }
);

const PureMediaViewer = dynamic(
  () =>
    import("@/components/media/PureMediaViewer").then(
      (mod) => mod.PureMediaViewer
    ),
  { ssr: false }
);

type DealSourceFilter = "ALL" | "INTERNAL" | "EXTERNAL";

interface MapBoundsSnapshot {
  openNorth: number;
  openSouth: number;
  openEast: number;
  openWest: number;
  fullNorth: number;
  fullSouth: number;
  fullEast: number;
  fullWest: number;
  centerLat: number;
  centerLng: number;
}

const MIN_EXPLORE_CAMERA_ZOOM = 5.1;
const EXPLORE_MAP_SETTLE_DELAY_MS = 1000;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function dedupeDealsByHotel(pins: PinFeedItemDto[]): PinFeedItemDto[] {
  const best = new Map<string, PinFeedItemDto>();
  const score = (p: PinFeedItemDto) =>
    (p.promoHeadlineTh ? 100 : 0) +
    (p.activeCoupon || p.promoCode ? 60 : 0) +
    (p.promoDealPriceThb ? 40 : 0) +
    (p.isSponsored ? 20 : 0);

  for (const p of pins) {
    const key = `${p.hotelId}:${p.dealSourceType}`;
    const existing = best.get(key);
    if (!existing || score(p) > score(existing)) {
      best.set(key, p);
    }
  }
  return Array.from(best.values());
}

function isInBox(
  d: PinFeedItemDto,
  north: number,
  south: number,
  east: number,
  west: number
): boolean {
  if (
    typeof d.hotelLatitude !== "number" ||
    typeof d.hotelLongitude !== "number"
  ) {
    return false;
  }
  return (
    d.hotelLatitude <= north &&
    d.hotelLatitude >= south &&
    d.hotelLongitude <= east &&
    d.hotelLongitude >= west
  );
}

function getDealsInBounds(
  deals: PinFeedItemDto[],
  bounds: MapBoundsSnapshot
): PinFeedItemDto[] {
  const inOpen = deals.filter((d) =>
    isInBox(
      d,
      bounds.openNorth,
      bounds.openSouth,
      bounds.openEast,
      bounds.openWest
    )
  );
  if (inOpen.length > 0) return inOpen;
  return deals.filter((d) =>
    isInBox(
      d,
      bounds.fullNorth,
      bounds.fullSouth,
      bounds.fullEast,
      bounds.fullWest
    )
  );
}

function getUnorderedDealSetKey(deals: PinFeedItemDto[]): string {
  return deals
    .map((d) => d.id)
    .sort()
    .join(",");
}

function sortDealsAroundCenter(
  deals: PinFeedItemDto[],
  centerLat: number,
  centerLng: number
): PinFeedItemDto[] {
  return [...deals].sort((a, b) => {
    const aLat = a.hotelLatitude ?? centerLat;
    const aLng = a.hotelLongitude ?? centerLng;
    const bLat = b.hotelLatitude ?? centerLat;
    const bLng = b.hotelLongitude ?? centerLng;
    const dA = Math.hypot(aLat - centerLat, aLng - centerLng);
    const dB = Math.hypot(bLat - centerLat, bLng - centerLng);
    // Gentle sponsored/promo relevance nudge without overriding clear map proximity
    const boostA = (a.isSponsored ? 0.04 : 0) + (a.promoHeadlineTh ? 0.02 : 0);
    const boostB = (b.isSponsored ? 0.04 : 0) + (b.promoHeadlineTh ? 0.02 : 0);
    return dA - boostA - (dB - boostB);
  });
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getExploreSymmetricStartIdx(count: number): number {
  if (count >= 5) return 2;
  if (count >= 3) return 1;
  return 0;
}

/**
 * Arranges ranked deals so the #1 best/closest deal sits dead-center of the symmetric
 * 5-card fan (e.g. [rank4, rank2, rank1(CENTER), rank3, rank5, rank6...])!
 * That way BOTH left and right wings of the fan open symmetrically on Frame 1 & every Auto-Shuffle!
 */
function arrangeSymmetricFanDeals(ranked: PinFeedItemDto[]): PinFeedItemDto[] {
  if (ranked.length <= 2) return ranked;
  const centerIdx = getExploreSymmetricStartIdx(ranked.length);
  if (centerIdx === 1) {
    // 3 or 4 items: [rank2, rank1(CENTER), rank3, ...rest]
    return [ranked[1], ranked[0], ...ranked.slice(2)];
  }
  // 5+ items: [rank4, rank2, rank1(CENTER), rank3, rank5, ...rest]
  return [ranked[3], ranked[1], ranked[0], ranked[2], ranked[4], ...ranked.slice(5)];
}

export interface ExploreMapClientProps {
  initialDeals: PinFeedItemDto[];
  initialStyle?: string;
  initialCategory?: PlaceCategoryDto | "ALL";
  initialSource?: DealSourceFilter;
  initialRegion?: LocationScopeId;
  initialProvince?: string | null;
  locationCatalog?: LocationCatalogDto;
  initialRecentOnly?: boolean;
  initialRecentPinIds?: string[];
  initialQuery?: string;
  initialCenter?: { lat: number; lng: number } | null;
}

export function ExploreMapClient({
  initialDeals,
  initialStyle = "all",
  initialCategory = "ALL",
  initialSource = "ALL",
  initialRegion = "all",
  initialProvince = null,
  locationCatalog,
  initialRecentOnly = false,
  initialRecentPinIds = [],
  initialQuery = "",
  initialCenter = null,
}: ExploreMapClientProps) {
  const {
    lang: language,
    theme,
    user: currentUser,
    globalSearchQuery,
    setGlobalSearchQuery,
    savedPinIds: globalSavedPinIds,
    triggerPinToBoard,
    togglePinLikeInstant,
    navigateToPlaceWithFlip,
  } = useHotelApp();

  const isTh = language === "th";
  const isDark = theme === "dark";

  const resolvedLocationCatalog = useMemo<LocationCatalogDto>(
    () =>
      locationCatalog ?? {
        regions: DEFAULT_REGION_CONFIGS.map((r) => ({ ...r, isActive: true })),
        provinces: DEFAULT_PROVINCE_CONFIGS.map((p) => ({
          ...p,
          isActive: true,
          placeCount: 0,
        })),
      },
    [locationCatalog]
  );

  const provinceById = useMemo(
    () => new Map(resolvedLocationCatalog.provinces.map((p) => [p.id, p])),
    [resolvedLocationCatalog.provinces]
  );

  const regionById = useMemo(
    () => new Map(resolvedLocationCatalog.regions.map((r) => [r.id, r])),
    [resolvedLocationCatalog.regions]
  );

  const [allDeals, setAllDeals] = useState<PinFeedItemDto[]>(() =>
    dedupeDealsByHotel(initialDeals)
  );
  const [activeStyle, setActiveStyle] = useState<string>(initialStyle);
  const [placeCategoryFilter, setPlaceCategoryFilter] = useState<
    PlaceCategoryDto | "ALL"
  >(initialCategory);
  const [sourceFilter, setSourceFilter] =
    useState<DealSourceFilter>(initialSource);
  const [provinceFilter, setProvinceFilter] = useState<string | null>(
    initialProvince
  );
  const [regionFilter, setRegionFilter] = useState<LocationScopeId>(() => {
    if (initialRegion === "tourist") return "tourist";
    if (initialProvince) {
      const matched = resolvedLocationCatalog.provinces.find(
        (p) => p.id === initialProvince
      );
      if (matched) {
        return initialRegion !== "all" ? initialRegion : matched.regionId;
      }
    }
    return initialRegion;
  });
  const [isProvincePickerOpen, setIsProvincePickerOpen] = useState(false);
  const [hasMountedProvincePicker, setHasMountedProvincePicker] =
    useState(false);
  const fetchedProvincesRef = useRef<Set<string>>(
    new Set(initialProvince ? [initialProvince] : [])
  );
  const handleOpenProvincePicker = useCallback(() => {
    setHasMountedProvincePicker(true);
    setIsProvincePickerOpen(true);
  }, []);
  const [recentOnly, setRecentOnly] = useState<boolean>(initialRecentOnly);
  const [recentPinIds, setRecentPinIds] =
    useState<string[]>(initialRecentPinIds);

  // Bottom Deck Presentation Mode ("fan" = Fanned Photo Deck | "list" = Horizontal Single-Row Card Strip),
  // Permanent Hide/Collapse state (Airbnb peek bar — stays hidden until user explicitly clicks to expand!), & Filter Modal
  const [deckViewMode, setDeckViewMode] = useState<"fan" | "list">("fan");
  const [isDeckHidden, setIsDeckHidden] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);
  const isDeckHiddenRef = useRef(isDeckHidden);
  isDeckHiddenRef.current = isDeckHidden;
  const sheetSwipeStartYRef = useRef<number | null>(null);
  const sheetTouchSamplesRef = useRef<Array<{ y: number; t: number }>>([]);
  const sheetDragMovedRef = useRef(false);

  // Map Viewport & Auto-Shuffle Deck State
  const [mapBounds, setMapBounds] = useState<MapBoundsSnapshot | null>(null);
  const [hasUserMovedMap, setHasUserMovedMap] = useState<boolean>(
    Boolean(initialCenter)
  );
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    getExploreSymmetricStartIdx(dedupeDealsByHotel(initialDeals).length)
  );
  const [shuffleKey, setShuffleKey] = useState(0);
  const [manualShuffleOrder, setManualShuffleOrder] = useState<string[] | null>(
    null
  );
  // Exact 1:1 card order restored on Back navigation from /{slug} (locks deck order until user pans/filters/shuffles!)
  const [restoredDealIds, setRestoredDealIds] = useState<string[] | null>(null);
  const [pinnedOutsideDealId, setPinnedOutsideDealId] = useState<string | null>(
    null
  );
  const deckViewModeRef = useRef(deckViewMode);
  deckViewModeRef.current = deckViewMode;

  // User GPS Location State
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Detail Modal State (`deck` -> 3D Hero Photo Flip; `list` -> Calm Fade Slide-In/Out Modal!)
  const [detailOpenSource, setDetailOpenSource] = useState<"deck" | "list">(
    "deck"
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [flipOriginRect, setFlipOriginRect] = useState<CardOriginRect | null>(
    null
  );
  const [flipStopNumber, setFlipStopNumber] = useState<number>(1);
  const [flipBadgeText, setFlipBadgeText] = useState<string | null>(null);
  const [animatingPinId, setAnimatingPinId] = useState<string | null>(null);
  const [pinHistoryStack, setPinHistoryStack] = useState<
    Array<{ pin: PinFeedItemDto; scrollY: number }>
  >([]);
  const [detailRestoreScrollY, setDetailRestoreScrollY] = useState<
    number | null
  >(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
    hotelPosts?: HotelPostSummaryDto[];
    ownerFeedPosts?: HotelPostSummaryDto[];
    ownerBlogs?: HotelPostSummaryDto[];
    nearbyPlaces?: PinFeedItemDto[];
  } | null>(null);
  const latestPinReqRef = useRef<string | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // MapLibre & Anti-Loop Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<
      string,
      {
        marker: maplibregl.Marker;
        btn: HTMLButtonElement;
        crestEl: HTMLSpanElement;
        textEl: HTMLSpanElement;
        deal: PinFeedItemDto;
      }
    >
  >(new Map());
  const lodRafRef = useRef<number | null>(null);
  const lastLodSyncMsRef = useRef<number>(0);
  const syncMarkersLodRef = useRef<() => void>(() => {});
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isProgrammaticCameraRef = useRef(false);
  const userGestureActiveRef = useRef(false);
  const pendingUserGestureRef = useRef(false);
  const isMapMovingRef = useRef(false);
  isMapMovingRef.current = isMapMoving;
  const settleTimerRef = useRef<number | null>(null);
  const onMapUserStartRef = useRef<(e: { originalEvent?: Event }) => void>(() => {});
  const onMapMoveStartRef = useRef<(e: { originalEvent?: Event }) => void>(() => {});
  const onMapMoveEndRef = useRef<() => void>(() => {});
  const prevDeckSignatureRef = useRef<string>("");
  const skipNextDeckSignatureRef = useRef(false);
  const pendingRestoreDealIdRef = useRef<string | null>(null);
  const hasUserMovedMapRef = useRef(hasUserMovedMap);
  hasUserMovedMapRef.current = hasUserMovedMap;
  const [isMapReady, setIsMapReady] = useState(false);

  const filterModalPresence = useModalPresence(isFilterModalOpen, 250);
  const listDetailPresence = useModalPresence(
    Boolean(selectedPinId) && detailOpenSource === "list",
    240
  );
  useBodyScrollLock(
    filterModalPresence.shouldRender || listDetailPresence.shouldRender
  );

  // Clean up list-mode detail snapshot after fade slide-out finishes so content never flashes blank mid-exit
  useEffect(() => {
    if (
      detailOpenSource === "list" &&
      !selectedPinId &&
      !listDetailPresence.shouldRender
    ) {
      setSelectedPinSnapshot(null);
      setPinDetail(null);
    }
  }, [detailOpenSource, listDetailPresence.shouldRender, selectedPinId]);

  // Escape key dismisses topmost modal cleanly (Filter -> List Detail)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (fullscreenMedia || isProvincePickerOpen) return;
      if (isFilterModalOpen) {
        e.preventDefault();
        setIsFilterModalOpen(false);
      } else if (selectedPinId && detailOpenSource === "list") {
        e.preventDefault();
        clearLastClickedPinOrigin();
        setPinHistoryStack([]);
        setDetailRestoreScrollY(null);
        setSelectedPinId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    detailOpenSource,
    fullscreenMedia,
    isFilterModalOpen,
    isProvincePickerOpen,
    selectedPinId,
  ]);

  // Synchronously restore exact view mode, hidden state, active card & 1:1 card order BEFORE first paint on Back!
  useLayoutEffect(() => {
    if (initialQuery && !globalSearchQuery) {
      setGlobalSearchQuery(initialQuery);
    }

    const savedMode = readExploreViewMode();
    if (!initialCenter) {
      const peek = peekExploreCameraSnapshot();
      if (peek) {
        skipNextDeckSignatureRef.current = true;
        pendingRestoreDealIdRef.current = peek.activeDealId;

        if (peek.deckViewMode) {
          setDeckViewMode(peek.deckViewMode);
        } else if (savedMode) {
          setDeckViewMode(savedMode);
        }
        if (typeof peek.isDeckHidden === "boolean") {
          setIsDeckHidden(peek.isDeckHidden);
        }
        if (peek.hasUserMovedMap) {
          setHasUserMovedMap(true);
        }

        if (peek.visibleDealIds && peek.visibleDealIds.length > 0) {
          const availableIds = new Set(
            attributeFilteredDealsRef.current.map((d) => d.id)
          );
          const validOrder = peek.visibleDealIds.filter((id) =>
            availableIds.has(id)
          );
          if (validOrder.length > 0) {
            skipNextDeckSignatureRef.current = false;
            setRestoredDealIds(validOrder);
            const restoredIdx = peek.activeDealId
              ? validOrder.indexOf(peek.activeDealId)
              : typeof peek.activeIdx === "number"
              ? peek.activeIdx
              : -1;
            if (restoredIdx >= 0) {
              setActiveIdx(restoredIdx);
              pendingRestoreDealIdRef.current = null;
            }
            return;
          }
        }

        if (!peek.hasUserMovedMap && peek.activeDealId) {
          const idx = visibleDealsRef.current.findIndex(
            (d) => d.id === peek.activeDealId
          );
          if (idx >= 0) {
            setActiveIdx(idx);
            pendingRestoreDealIdRef.current = null;
          }
        }
        return;
      }
    }

    if (savedMode) {
      setDeckViewMode(savedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock root viewport overscroll while on /explore so pulling cards down NEVER triggers browser pull-to-refresh or page bounce!
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehavior;
    const prevBody = body.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overscrollBehavior = prevHtml;
      body.style.overscrollBehavior = prevBody;
    };
  }, []);

  const getExpandedSheetHeight = useCallback(
    () => (typeof window !== "undefined" && window.innerWidth >= 640 ? 358 : 314),
    []
  );
  const getCollapsedSheetHeight = useCallback(
    () => (typeof window !== "undefined" && window.innerWidth >= 1024 ? 74 : 76),
    []
  );

  // Single-Axis Native iOS Detent Physics (height ONLY, ZERO translateY vs height transition fight!):
  // - Expanded -> Collapsed: 1:1 downward tracking straight to 76px peek bar, then soft 4px floor cushion (NEVER plunges past 76px & rebounds!)
  // - Collapsed -> Expanded: 1:1 upward growth from bottom:0 (NEVER detaches from bottom edge!)
  const computeDraggedSheetHeight = useCallback(
    (rawDy: number, startedCollapsed: boolean): number => {
      const expandedH = getExpandedSheetHeight();
      const collapsedH = getCollapsedSheetHeight();
      const baseH = startedCollapsed ? collapsedH : expandedH;
      const rawH = baseH - rawDy;
      if (rawH > expandedH) {
        const over = rawH - expandedH;
        return expandedH + Math.min(20, (over * 0.22) / (1 + over / 110));
      }
      if (rawH < collapsedH) {
        const under = collapsedH - rawH;
        return collapsedH - Math.min(4, under * 0.05);
      }
      return rawH;
    },
    [getCollapsedSheetHeight, getExpandedSheetHeight]
  );

  const handleSheetPullMove = useCallback(
    (rawDy: number) => {
      setIsDraggingSheet(true);
      setSheetDragHeight(computeDraggedSheetHeight(rawDy, false));
    },
    [computeDraggedSheetHeight]
  );

  const handleSheetPullEnd = useCallback((rawDy: number, vy: number) => {
    setIsDraggingSheet(false);
    setSheetDragHeight(null);
    if (rawDy >= 48 || (rawDy >= 18 && vy > 0.3)) {
      setIsDeckHidden(true);
    }
  }, []);

  const handleSheetHeaderTouchStart = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      const y = e.touches[0]?.clientY;
      if (y === undefined) return;
      sheetSwipeStartYRef.current = y;
      sheetTouchSamplesRef.current = [{ y, t: performance.now() }];
      sheetDragMovedRef.current = false;
    },
    []
  );

  const handleSheetHeaderTouchMove = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      const startY = sheetSwipeStartYRef.current;
      const currY = e.touches[0]?.clientY;
      if (startY === null || currY === undefined) return;
      const rawDy = currY - startY;
      const now = performance.now();
      const samples = sheetTouchSamplesRef.current;
      samples.push({ y: currY, t: now });
      while (samples.length > 2 && now - samples[0].t > 105) {
        samples.shift();
      }
      if (Math.abs(rawDy) > 4) {
        sheetDragMovedRef.current = true;
        setIsDraggingSheet(true);
        setSheetDragHeight(
          computeDraggedSheetHeight(rawDy, isDeckHiddenRef.current)
        );
      }
    },
    [computeDraggedSheetHeight]
  );

  const handleSheetHeaderTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      const startY = sheetSwipeStartYRef.current;
      sheetSwipeStartYRef.current = null;
      const endY = e.changedTouches[0]?.clientY;
      const samples = sheetTouchSamplesRef.current;
      sheetTouchSamplesRef.current = [];

      let vy = 0;
      const now = performance.now();
      if (samples.length >= 2) {
        const newest = samples[samples.length - 1];
        if (now - newest.t < 95) {
          const oldest = samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 5) vy = (newest.y - oldest.y) / dt;
        }
      }

      setIsDraggingSheet(false);
      setSheetDragHeight(null);

      if (startY === null || endY === undefined) return;
      const rawDy = endY - startY;

      if (isDeckHiddenRef.current) {
        if (rawDy <= -24 || (rawDy <= -12 && vy < -0.24)) {
          setIsDeckHidden(false);
        }
      } else {
        if (rawDy >= 44 || (rawDy >= 16 && vy > 0.28)) {
          setIsDeckHidden(true);
        }
      }
    },
    []
  );

  const handleSheetHeaderTouchCancel = useCallback(() => {
    sheetSwipeStartYRef.current = null;
    sheetTouchSamplesRef.current = [];
    setIsDraggingSheet(false);
    setSheetDragHeight(null);
  }, []);

  // Persist user's chosen Fan <-> Horizontal Row mode across navigations
  const handleToggleDeckViewMode = useCallback(() => {
    if (isDeckHiddenRef.current) {
      setIsDeckHidden(false);
      return;
    }
    setDeckViewMode((prev) => {
      const next = prev === "fan" ? "list" : "fan";
      saveExploreViewMode(next);
      return next;
    });
  }, []);

  // Silently fetch user GPS coordinates on load if browser permission is already granted
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const checkExistingPermission = async () => {
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (status.state !== "granted" || cancelled) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!cancelled) {
                setUserCoords({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
              }
            },
            () => {},
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
          );
        }
      } catch {
        // permissions API unavailable — user can tap GPS button anytime
      }
    };
    void checkExistingPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge local + SSR recent viewed pin IDs and hydrate any missing IDs from Postgres
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncRecent = (localIds: string[]) => {
      const merged: string[] = [];
      const seen = new Set<string>();
      for (const id of [...localIds, ...initialRecentPinIds]) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(id);
        if (merged.length >= 24) break;
      }
      setRecentPinIds(merged);
    };
    syncRecent(getRecentViewedPinIds());
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ pinIds?: string[] }>).detail;
      syncRecent(
        Array.isArray(detail?.pinIds) ? detail.pinIds : getRecentViewedPinIds()
      );
    };
    window.addEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
    return () =>
      window.removeEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
  }, [initialRecentPinIds]);

  useEffect(() => {
    if (!recentOnly || recentPinIds.length === 0) return;
    const known = new Set(allDeals.map((d) => d.id));
    const missing = recentPinIds.filter((id) => !known.has(id)).slice(0, 24);
    if (missing.length === 0) return;

    let cancelled = false;
    fetch(`/api/pins?ids=${encodeURIComponent(missing.join(","))}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pins?: PinFeedItemDto[] } | null) => {
        if (cancelled || !data?.pins?.length) return;
        setAllDeals((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const extra = data.pins!.filter((p) => !seen.has(p.id));
          return extra.length > 0 ? [...prev, ...extra] : prev;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [recentOnly, recentPinIds, allDeals]);

  // 1. Attribute filtering (style, source, province, recent, global search)
  const attributeFilteredDeals = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const recentOrder = recentOnly
      ? new Map(recentPinIds.map((id, idx) => [id, idx]))
      : null;

    const filtered = allDeals.filter((d) => {
      if (recentOrder && !recentOrder.has(d.id)) return false;
      if (
        placeCategoryFilter !== "ALL" &&
        d.placeCategory !== placeCategoryFilter
      ) {
        return false;
      }
      if (sourceFilter !== "ALL" && d.dealSourceType !== sourceFilter) {
        return false;
      }
      if (activeStyle !== "all" && !d.stayStyles.includes(activeStyle)) {
        return false;
      }
      if (provinceFilter && d.provinceId !== provinceFilter) return false;
      if (!provinceFilter && regionFilter === "tourist") {
        const provMeta = provinceById.get(d.provinceId);
        if (!provMeta || !provMeta.isTouristHub) return false;
      } else if (!provinceFilter && regionFilter !== "all") {
        const provMeta = provinceById.get(d.provinceId);
        if (!provMeta || provMeta.regionId !== regionFilter) return false;
      }
      if (q) {
        const hay =
          `${d.hotelNameTh} ${d.hotelNameEn} ${d.provinceNameTh} ${d.provinceNameEn} ${d.hotelDistrictTh} ${d.titleTh} ${d.externalSourceName || ""} ${d.promoHeadlineTh || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (recentOrder) {
      filtered.sort(
        (a, b) =>
          (recentOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (recentOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return filtered;
  }, [
    allDeals,
    recentOnly,
    recentPinIds,
    placeCategoryFilter,
    sourceFilter,
    activeStyle,
    provinceFilter,
    regionFilter,
    provinceById,
    globalSearchQuery,
  ]);

  // 2. Spatial bounds filtering (preserving exact 1:1 restored card order on Back until next user pan/filter/shuffle!)
  const visibleDeals = useMemo(() => {
    if (restoredDealIds && restoredDealIds.length > 0) {
      const dealById = new Map(attributeFilteredDeals.map((d) => [d.id, d]));
      const restored = restoredDealIds
        .map((id) => dealById.get(id))
        .filter((d): d is PinFeedItemDto => Boolean(d));
      if (restored.length > 0) {
        return restored;
      }
    }

    let base: PinFeedItemDto[];
    if (!mapBounds || !hasUserMovedMap) {
      base = attributeFilteredDeals;
    } else {
      const inOpenArea = attributeFilteredDeals.filter((d) =>
        isInBox(
          d,
          mapBounds.openNorth,
          mapBounds.openSouth,
          mapBounds.openEast,
          mapBounds.openWest
        )
      );
      const inFullArea =
        inOpenArea.length > 0
          ? inOpenArea
          : attributeFilteredDeals.filter((d) =>
              isInBox(
                d,
                mapBounds.fullNorth,
                mapBounds.fullSouth,
                mapBounds.fullEast,
                mapBounds.fullWest
              )
            );
      base = sortDealsAroundCenter(
        inFullArea,
        mapBounds.centerLat,
        mapBounds.centerLng
      );
      // If user clicked a visible edge price pin outside openBounds, keep their zone intact and bring it into deck!
      if (
        pinnedOutsideDealId &&
        !base.some((d) => d.id === pinnedOutsideDealId)
      ) {
        const pinnedDeal = attributeFilteredDeals.find(
          (d) => d.id === pinnedOutsideDealId
        );
        if (pinnedDeal) {
          base = [pinnedDeal, ...base];
        }
      }
    }

    let ordered = base;
    if (manualShuffleOrder && manualShuffleOrder.length > 0) {
      const orderMap = new Map(manualShuffleOrder.map((id, i) => [id, i]));
      ordered = [...base].sort(
        (a, b) =>
          (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return arrangeSymmetricFanDeals(ordered);
  }, [
    attributeFilteredDeals,
    hasUserMovedMap,
    manualShuffleOrder,
    mapBounds,
    pinnedOutsideDealId,
    restoredDealIds,
  ]);

  // Trigger Auto-Shuffle animation ONLY when the visible deal signature actually changes!
  const deckSignature = useMemo(
    () => visibleDeals.slice(0, 8).map((d) => d.id).join(","),
    [visibleDeals]
  );

  useEffect(() => {
    if (!prevDeckSignatureRef.current) {
      prevDeckSignatureRef.current = deckSignature;
      if (pendingRestoreDealIdRef.current) {
        const idx = visibleDeals.findIndex(
          (d) => d.id === pendingRestoreDealIdRef.current
        );
        if (idx >= 0) {
          setActiveIdx(idx);
          pendingRestoreDealIdRef.current = null;
        }
      }
      return;
    }
    if (prevDeckSignatureRef.current !== deckSignature) {
      prevDeckSignatureRef.current = deckSignature;
      if (skipNextDeckSignatureRef.current) {
        skipNextDeckSignatureRef.current = false;
        if (pendingRestoreDealIdRef.current) {
          const idx = visibleDeals.findIndex(
            (d) => d.id === pendingRestoreDealIdRef.current
          );
          if (idx >= 0) {
            setActiveIdx(idx);
          }
          pendingRestoreDealIdRef.current = null;
        }
        return;
      }
      setActiveIdx(getExploreSymmetricStartIdx(visibleDeals.length));
      setShuffleKey((k) => k + 1);
    } else if (pendingRestoreDealIdRef.current) {
      const idx = visibleDeals.findIndex(
        (d) => d.id === pendingRestoreDealIdRef.current
      );
      if (idx >= 0) {
        setActiveIdx(idx);
      }
      pendingRestoreDealIdRef.current = null;
    }
  }, [deckSignature, visibleDeals]);

  // Clamp activeIdx cleanly
  const safeActiveIdx =
    visibleDeals.length === 0
      ? 0
      : Math.max(0, Math.min(visibleDeals.length - 1, activeIdx));
  const activeDeal = visibleDeals[safeActiveIdx] ?? null;

  const deckItems = useMemo<FannedDeckCardItem[]>(
    () =>
      visibleDeals.map((pin, idx) => ({
        key: pin.id,
        pin,
        stopNumber: idx + 1,
      })),
    [visibleDeals]
  );

  const visibleDealsRef = useRef(visibleDeals);
  visibleDealsRef.current = visibleDeals;
  const attributeFilteredDealsRef = useRef(attributeFilteredDeals);
  attributeFilteredDealsRef.current = attributeFilteredDeals;

  const getMapCameraPadding = useCallback(() => {
    const containerH = mapContainerRef.current?.clientHeight ?? 540;
    const isDesktop =
      typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
    if (isDesktop) {
      return {
        top: 56,
        right: 84,
        bottom: isDeckHiddenRef.current
          ? 56
          : Math.min(Math.round(containerH * 0.49), 296),
        left: 64,
      };
    }
    const isTablet =
      typeof window !== "undefined" ? window.innerWidth >= 640 : false;
    const mobileBottom = isDeckHiddenRef.current
      ? 92
      : Math.min(Math.round(containerH * 0.54), isTablet ? 370 : 326);
    return {
      top: 72,
      right: 56,
      bottom: mobileBottom,
      left: 32,
    };
  }, []);

  const readEffectiveBounds = useCallback(
    (map: maplibregl.Map): MapBoundsSnapshot => {
      const full = map.getBounds();
      const el = mapContainerRef.current;
      const w = el?.clientWidth || window.innerWidth;
      const h = el?.clientHeight || window.innerHeight;
      const isDesktop = window.innerWidth >= 1024;
      const isTablet = window.innerWidth >= 640;
      const padTop = isDesktop ? 44 : 48;
      const padBottom = isDesktop
        ? isDeckHiddenRef.current
          ? 44
          : Math.min(Math.round(h * 0.48), 276)
        : isDeckHiddenRef.current
        ? 92
        : Math.min(Math.round(h * 0.52), isTablet ? 348 : 308);
      const padSide = isDesktop ? 48 : 16;

      const nw = map.unproject([padSide, padTop]);
      const se = map.unproject([
        Math.max(padSide + 40, w - padSide),
        Math.max(padTop + 40, h - padBottom),
      ]);
      const openCenter = map.unproject([
        w * 0.5,
        padTop + Math.max(20, (h - padTop - padBottom) * 0.5),
      ]);

      return {
        openNorth: Math.max(nw.lat, se.lat),
        openSouth: Math.min(nw.lat, se.lat),
        openEast: Math.max(nw.lng, se.lng),
        openWest: Math.min(nw.lng, se.lng),
        fullNorth: full.getNorth(),
        fullSouth: full.getSouth(),
        fullEast: full.getEast(),
        fullWest: full.getWest(),
        centerLat: openCenter.lat,
        centerLng: openCenter.lng,
      };
    },
    []
  );

  // Smooth Linear Camera Fit without double-padding!
  const fitMapToDeals = useCallback(
    (dealsToFit: PinFeedItemDto[], animate = true) => {
      const map = mapRef.current;
      if (!map) return;
      const withCoords = dealsToFit.filter(
        (d) =>
          typeof d.hotelLatitude === "number" &&
          typeof d.hotelLongitude === "number"
      );
      if (withCoords.length === 0) return;

      const padding = getMapCameraPadding();
      userGestureActiveRef.current = false;
      isProgrammaticCameraRef.current = true;

      if (withCoords.length === 1) {
        map.easeTo({
          center: [
            withCoords[0].hotelLongitude!,
            withCoords[0].hotelLatitude!,
          ],
          zoom: 12.8,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          offset: [0, -Math.round((padding.bottom - padding.top) * 0.45)],
          duration: animate ? 620 : 0,
          easing: easeOutCubic,
          essential: true,
        });
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const d of withCoords) {
        bounds.extend([d.hotelLongitude!, d.hotelLatitude!]);
      }

      const cam = map.cameraForBounds(bounds, { padding, maxZoom: 13.8 });
      if (cam && cam.center && typeof cam.zoom === "number") {
        const clampedZoom = Math.max(
          MIN_EXPLORE_CAMERA_ZOOM,
          Math.min(13.8, cam.zoom)
        );
        map.easeTo({
          center: cam.center,
          zoom: clampedZoom,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          duration: animate ? 680 : 0,
          easing: easeOutCubic,
          essential: true,
        });
      } else {
        map.fitBounds(bounds, {
          padding,
          maxZoom: 13.8,
          linear: true,
          duration: animate ? 680 : 0,
          essential: true,
        });
      }
    },
    [getMapCameraPadding]
  );

  // Smooth Camera Focus to Selected Province or Region (ZERO setMaxBounds -> user can pan freely anywhere!)
  const flyMapToLocation = useCallback(
    (selection: ProvincePickerSelection, animate = true) => {
      const map = mapRef.current;
      if (!map) return;

      const padding = getMapCameraPadding();
      userGestureActiveRef.current = false;
      isProgrammaticCameraRef.current = true;

      if (selection.provinceId) {
        const prov = provinceById.get(selection.provinceId);
        if (prov) {
          const bounds = new maplibregl.LngLatBounds(
            [prov.westLng, prov.southLat],
            [prov.eastLng, prov.northLat]
          );
          const cam = map.cameraForBounds(bounds, {
            padding,
            maxZoom: Math.max(prov.defaultZoom, 12.2),
          });
          if (cam && cam.center && typeof cam.zoom === "number") {
            map.easeTo({
              center: cam.center,
              zoom: Math.max(7.0, Math.min(13.2, cam.zoom)),
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
              duration: animate ? 740 : 0,
              easing: easeOutCubic,
              essential: true,
            });
            return;
          }
          map.easeTo({
            center: [prov.centerLng, prov.centerLat],
            zoom: prov.defaultZoom,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            offset: [0, -Math.round((padding.bottom - padding.top) * 0.42)],
            duration: animate ? 740 : 0,
            easing: easeOutCubic,
            essential: true,
          });
          return;
        }
      }

      if (selection.regionId !== "all" && selection.regionId !== "tourist") {
        const reg = regionById.get(selection.regionId);
        if (reg) {
          const bounds = new maplibregl.LngLatBounds(
            [reg.westLng, reg.southLat],
            [reg.eastLng, reg.northLat]
          );
          const cam = map.cameraForBounds(bounds, {
            padding,
            maxZoom: Math.max(reg.defaultZoom, 9.2),
          });
          if (cam && cam.center && typeof cam.zoom === "number") {
            map.easeTo({
              center: cam.center,
              zoom: Math.max(5.4, Math.min(9.5, cam.zoom)),
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
              duration: animate ? 740 : 0,
              easing: easeOutCubic,
              essential: true,
            });
            return;
          }
          map.easeTo({
            center: [reg.centerLng, reg.centerLat],
            zoom: reg.defaultZoom,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            duration: animate ? 740 : 0,
            easing: easeOutCubic,
            essential: true,
          });
          return;
        }
      }

      map.easeTo({
        center: THAILAND_DEFAULT_CENTER,
        zoom: THAILAND_DEFAULT_ZOOM,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        duration: animate ? 720 : 0,
        easing: easeOutCubic,
        essential: true,
      });
    },
    [getMapCameraPadding, provinceById, regionById]
  );

  const syncLocationQueryToUrl = useCallback(
    (selection: ProvincePickerSelection) => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (selection.provinceId) {
        url.searchParams.set("province", selection.provinceId);
        url.searchParams.delete("region");
      } else if (selection.regionId !== "all") {
        url.searchParams.set("region", selection.regionId);
        url.searchParams.delete("province");
      } else {
        url.searchParams.delete("province");
        url.searchParams.delete("region");
      }
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    },
    []
  );

  const handleConfirmProvinceSelection = useCallback(
    (selection: ProvincePickerSelection) => {
      const resolvedRegion: LocationScopeId =
        selection.regionId === "tourist"
          ? "tourist"
          : selection.provinceId
          ? provinceById.get(selection.provinceId)?.regionId ??
            selection.regionId
          : selection.regionId;

      setProvinceFilter(selection.provinceId);
      setRegionFilter(resolvedRegion);
      setIsProvincePickerOpen(false);
      setHasUserMovedMap(false);
      setRestoredDealIds(null);
      setManualShuffleOrder(null);
      setPinnedOutsideDealId(null);
      syncLocationQueryToUrl({
        regionId: resolvedRegion,
        provinceId: selection.provinceId,
      });
      flyMapToLocation(
        { regionId: resolvedRegion, provinceId: selection.provinceId },
        true
      );

      // Hydrate all places in the chosen province even if outside the initial nationwide top 100
      if (
        selection.provinceId &&
        !fetchedProvincesRef.current.has(selection.provinceId)
      ) {
        const targetProvId = selection.provinceId;
        fetchedProvincesRef.current.add(targetProvId);
        fetch(`/api/pins?provinceId=${encodeURIComponent(targetProvId)}&limit=80&compact=1`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { pins?: PinFeedItemDto[] } | null) => {
            if (!data?.pins?.length) return;
            setAllDeals((prev) => dedupeDealsByHotel([...prev, ...data.pins!]));
          })
          .catch(() => {
            fetchedProvincesRef.current.delete(targetProvId);
          });
      }
    },
    [flyMapToLocation, provinceById, syncLocationQueryToUrl]
  );

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const scheduleMapSettleReveal = useCallback(
    (wasUserGesture: boolean) => {
      clearSettleTimer();
      // 1000ms (1s) Settle-to-Reveal debounce:
      // Gives generous breathing room for consecutive drag-lift-drag strokes so the bottom sheet
      // stays tucked until the user genuinely finishes exploring, then glides smoothly back up once!
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        pendingUserGestureRef.current = false;
        const map = mapRef.current;
        if (!map) {
          setIsMapMoving(false);
          return;
        }
        if (wasUserGesture) {
          const nextBounds = readEffectiveBounds(map);
          const nextInArea = getDealsInBounds(
            attributeFilteredDealsRef.current,
            nextBounds
          );
          const currentSetKey = getUnorderedDealSetKey(
            visibleDealsRef.current
          );
          const nextSetKey = getUnorderedDealSetKey(nextInArea);
          if (nextSetKey === currentSetKey) {
            // Exact same stays -> smoothly rise the same cards back up with ZERO reload!
            setIsMapMoving(false);
            return;
          }
          // Batch new bounds + activeIdx + shuffleKey + isMapMoving=false atomically
          // so the tucked deck swaps invisibly and springs straight up with ZERO double-dip!
          skipNextDeckSignatureRef.current = true;
          setRestoredDealIds(null);
          setManualShuffleOrder(null);
          setPinnedOutsideDealId(null);
          setHasUserMovedMap(true);
          setMapBounds(nextBounds);
          setActiveIdx(getExploreSymmetricStartIdx(nextInArea.length));
          setShuffleKey((k) => k + 1);
        }
        setIsMapMoving(false);
      }, EXPLORE_MAP_SETTLE_DELAY_MS);
    },
    [clearSettleTimer, readEffectiveBounds]
  );

  onMapUserStartRef.current = (e: { originalEvent?: Event }) => {
    if (e.originalEvent) {
      clearSettleTimer();
      userGestureActiveRef.current = true;
      pendingUserGestureRef.current = true;
      isProgrammaticCameraRef.current = false;
      React.startTransition(() => setIsMapMoving(true));
    }
  };

  onMapMoveStartRef.current = (e: { originalEvent?: Event }) => {
    if (e.originalEvent) {
      clearSettleTimer();
    }
  };

  onMapMoveEndRef.current = () => {
    syncMarkersLodRef.current();
    clearSettleTimer();
    if (lodRafRef.current !== null) {
      window.cancelAnimationFrame(lodRafRef.current);
      lodRafRef.current = null;
    }

    if (
      isProgrammaticCameraRef.current &&
      !userGestureActiveRef.current &&
      !pendingUserGestureRef.current
    ) {
      isProgrammaticCameraRef.current = false;
      setIsMapMoving(false);
      return;
    }

    const wasUserGesture =
      userGestureActiveRef.current || pendingUserGestureRef.current;
    userGestureActiveRef.current = false;
    scheduleMapSettleReveal(wasUserGesture);
  };

  // Initialize MapLibre Vector Map ($0 OpenFreeMap style matching /trip!)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    const initMap = async () => {
      ensureMapLibreWorker();
      const style = await getAirbnbVectorMapStyle(isDark, {
        hideCommercialPois: true,
      });
      if (cancelled || !mapContainerRef.current) return;

      const restoredCam = !initialCenter ? consumeExploreCameraSnapshot() : null;
      const startCenter: [number, number] = restoredCam
        ? [restoredCam.lng, restoredCam.lat]
        : initialCenter
        ? [initialCenter.lng, initialCenter.lat]
        : THAILAND_DEFAULT_CENTER;
      const startZoom = restoredCam
        ? restoredCam.zoom
        : initialCenter
        ? 11.4
        : THAILAND_DEFAULT_ZOOM;
      if (restoredCam) {
        // Camera, exact card order, active card & view mode are already restored synchronously in useLayoutEffect!
        if (!restoredCam.visibleDealIds?.length) {
          skipNextDeckSignatureRef.current = true;
          pendingRestoreDealIdRef.current = restoredCam.activeDealId;
          if (restoredCam.hasUserMovedMap) {
            setHasUserMovedMap(true);
            if (restoredCam.activeDealId) {
              setPinnedOutsideDealId(restoredCam.activeDealId);
            }
          } else if (restoredCam.activeDealId) {
            const idx = visibleDealsRef.current.findIndex(
              (d) => d.id === restoredCam.activeDealId
            );
            if (idx >= 0) {
              setActiveIdx(idx);
              pendingRestoreDealIdRef.current = null;
            }
          }
        }
      }

      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style,
        center: startCenter,
        zoom: startZoom,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        fadeDuration: 120,
        maxTileCacheSize: 64,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
      configureThailandMapInteractions(mapInstance);
      mapRef.current = mapInstance;

      mapInstance.on("load", () => {
        if (cancelled || !mapInstance) return;
        setIsMapReady(true);
        if (restoredCam && !restoredCam.visibleDealIds?.length) {
          skipNextDeckSignatureRef.current = true;
        }
        setMapBounds(readEffectiveBounds(mapInstance));
        if (!restoredCam && !initialCenter) {
          if (initialProvince || initialRegion !== "all") {
            flyMapToLocation(
              { regionId: regionFilter, provinceId: initialProvince },
              false
            );
          } else if (initialStyle !== "all" || initialQuery) {
            fitMapToDeals(attributeFilteredDeals, false);
          }
        }
      });

      mapInstance.on("dragstart", (e) => onMapUserStartRef.current(e));
      mapInstance.on("zoomstart", (e) => onMapUserStartRef.current(e));
      mapInstance.on("movestart", (e) => onMapMoveStartRef.current(e));
      mapInstance.on("zoom", () => {
        const now = performance.now();
        if (now - lastLodSyncMsRef.current < 110) return;
        if (lodRafRef.current !== null) return;
        lodRafRef.current = window.requestAnimationFrame(() => {
          lodRafRef.current = null;
          lastLodSyncMsRef.current = performance.now();
          syncMarkersLodRef.current();
        });
      });
      mapInstance.on("moveend", () => onMapMoveEndRef.current());
    };

    void initMap();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            mapRef.current?.resize();
          })
        : null;
    ro?.observe(el);

    return () => {
      cancelled = true;
      ro?.disconnect();
      clearSettleTimer();
      if (lodRafRef.current !== null) {
        window.cancelAnimationFrame(lodRafRef.current);
        lodRafRef.current = null;
      }
      for (const entry of markersRef.current.values()) {
        entry.marker.remove();
      }
      markersRef.current.clear();
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Render Current User GPS Blue Dot on the Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !userCoords) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.setAttribute(
      "aria-label",
      isTh ? "ตำแหน่งปัจจุบันของคุณ" : "Your current location"
    );
    wrapper.style.cssText =
      "width:34px;height:34px;display:flex;align-items:center;justify-content:center;pointer-events:none;";

    const inner = document.createElement("span");
    inner.style.cssText =
      "position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;";

    const halo = document.createElement("span");
    halo.style.cssText =
      "position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.22);";

    const dot = document.createElement("span");
    dot.style.cssText =
      "position:relative;width:14px;height:14px;border-radius:9999px;background:#2563EB;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(37,99,235,0.45);";

    inner.appendChild(halo);
    inner.appendChild(dot);
    wrapper.appendChild(inner);

    const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
      .setLngLat([userCoords.lng, userCoords.lat])
      .addTo(map);
    marker.getElement().style.zIndex = "10";
    userLocationMarkerRef.current = marker;
  }, [userCoords, isMapReady, isTh]);

  // Gently pan map ONLY if active deck card's marker sits outside the unobstructed map window
  // (NEVER changes zoom & NEVER triggers a re-shuffle loop!)
  const panSoftlyToDealIfNeeded = useCallback((deal: PinFeedItemDto) => {
    const map = mapRef.current;
    const el = mapContainerRef.current;
    if (
      !map ||
      !el ||
      typeof deal.hotelLatitude !== "number" ||
      typeof deal.hotelLongitude !== "number"
    ) {
      return;
    }

    const pt = map.project([deal.hotelLongitude, deal.hotelLatitude]);
    const w = el.clientWidth;
    const h = el.clientHeight;
    const isDesktop = window.innerWidth >= 1024;
    const topSafe = isDesktop ? 82 : 112;
    const bottomSafe =
      h -
      (isDeckHiddenRef.current
        ? isDesktop
          ? 56
          : 92
        : Math.min(Math.round(h * 0.48), isDesktop ? 276 : 308));
    const sideSafe = isDesktop ? 76 : 42;

    if (
      pt.x < sideSafe ||
      pt.x > w - sideSafe ||
      pt.y < topSafe ||
      pt.y > bottomSafe
    ) {
      isProgrammaticCameraRef.current = true;
      map.easeTo({
        center: [deal.hotelLongitude, deal.hotelLatitude],
        offset: [0, -Math.round((h - bottomSafe - topSafe) * 0.45)],
        duration: 460,
        easing: easeOutCubic,
        essential: true,
      });
    }
  }, []);

  const handleSelectDeckIndex = useCallback(
    (nextIndex: number) => {
      const list = visibleDealsRef.current;
      if (list.length === 0) return;
      const clamped = Math.max(0, Math.min(list.length - 1, nextIndex));
      setActiveIdx(clamped);
      const targetDeal = list[clamped];
      if (targetDeal) {
        panSoftlyToDealIfNeeded(targetDeal);
      }
    },
    [panSoftlyToDealIfNeeded]
  );

  // Google Maps-Style Smart Zoom LOD & 2D Collision Decluttering for 5-Category Place Pins
  const syncMarkersLodAndStyle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom();
    const activeId = activeDeal?.id ?? null;

    const entries = Array.from(markersRef.current.entries());
    entries.sort(([idA, a], [idB, b]) => {
      if (idA === activeId) return -1;
      if (idB === activeId) return 1;
      const score = (d: PinFeedItemDto) =>
        (d.isSponsored ? 1000 : 0) +
        (d.merchantMode === "DIRECT_BOOKING" ? 300 : 0) +
        (d.hasActivePromo ? 120 : 0) +
        Math.min(400, d.likesCount * 0.05);
      return score(b.deal) - score(a.deal);
    });

    const placedPills: Array<{
      x: number;
      y: number;
      halfW: number;
      halfH: number;
    }> = [];

    for (const [id, { marker, btn, crestEl, textEl, deal }] of entries) {
      if (
        typeof deal.hotelLatitude !== "number" ||
        typeof deal.hotelLongitude !== "number"
      ) {
        continue;
      }

      const isSelected = id === activeId;
      const catMeta = getPlaceCategoryMeta(deal.placeCategory);
      const pt = map.project([deal.hotelLongitude, deal.hotelLatitude]);

      const priceLabel =
        deal.placeCategory === "STAY"
          ? deal.promoDealPriceThb ?? deal.nightlyPriceThb
          : null;
      const promoLabel = getDealPromoOnlyHeadline(deal, language);
      const placeName = isTh ? deal.hotelNameTh : deal.hotelNameEn;

      let chipText = "";
      if (priceLabel) {
        chipText = `฿${priceLabel.toLocaleString()}`;
      } else if (promoLabel) {
        chipText =
          promoLabel.length > 11 ? `${promoLabel.slice(0, 10)}…` : promoLabel;
      } else if (isSelected || zoom >= 10.6) {
        chipText =
          placeName.length > 11 ? `${placeName.slice(0, 10)}…` : placeName;
      }

      const hasText = chipText.length > 0;
      const estHalfW = hasText
        ? Math.min(60, 20 + chipText.length * 3.8)
        : 15;
      const estHalfH = 16;

      const collides =
        !isSelected &&
        placedPills.some(
          (p) =>
            Math.abs(pt.x - p.x) < p.halfW + estHalfW + 4 &&
            Math.abs(pt.y - p.y) < p.halfH + estHalfH + 4
        );

      if (collides) {
        // State D: Compact Google Maps Mini Colored Category Dot (Zero Clutter, 100% Clickable!)
        crestEl.style.display = "none";
        textEl.style.display = "none";
        btn.style.width = "14px";
        btn.style.height = "14px";
        btn.style.padding = "0";
        btn.style.gap = "0";
        btn.style.background = catMeta.crestBgHex;
        btn.style.border = `2px solid ${isDark ? "#1a1a1a" : "#ffffff"}`;
        btn.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.28)";
        marker.getElement().style.zIndex = "12";
        continue;
      }

      placedPills.push({
        x: pt.x,
        y: pt.y,
        halfW: estHalfW,
        halfH: estHalfH,
      });

      if (!hasText && !isSelected) {
        // State C: Unobstructed Icon-Only Colored Crest Pin (Low-Zoom No-Promo Places)
        crestEl.style.display = "inline-flex";
        crestEl.style.width = "22px";
        crestEl.style.height = "22px";
        crestEl.style.background = "transparent";
        textEl.style.display = "none";
        btn.style.width = "28px";
        btn.style.height = "28px";
        btn.style.padding = "0";
        btn.style.gap = "0";
        btn.style.background = catMeta.crestBgHex;
        btn.style.color = "#ffffff";
        btn.style.border = `2px solid ${isDark ? "#1a1a1a" : "#ffffff"}`;
        btn.style.boxShadow = "0 3px 10px rgba(0, 0, 0, 0.22)";
        marker.getElement().style.zIndex = "22";
        continue;
      }

      // State A (Selected Active Pill) or State B (Unobstructed Full Category Pill)
      crestEl.style.display = "inline-flex";
      crestEl.style.width = isSelected ? "22px" : "20px";
      crestEl.style.height = isSelected ? "22px" : "20px";
      crestEl.style.background = catMeta.crestBgHex;
      textEl.textContent = chipText || placeName.slice(0, 10);
      textEl.style.display = "inline";

      btn.style.width = "auto";
      btn.style.height = isSelected ? "32px" : "29px";
      btn.style.padding = isSelected ? "0 11px 0 4px" : "0 9px 0 4px";
      btn.style.gap = "5px";
      btn.style.background = isSelected
        ? isDark
          ? "#f5f5f5"
          : "#222222"
        : isDark
        ? "#262626"
        : "#ffffff";
      btn.style.color = isSelected
        ? isDark
          ? "#222222"
          : "#ffffff"
        : isDark
        ? "#f5f5f5"
        : "#222222";
      btn.style.border = isSelected
        ? isDark
          ? "2px solid #222222"
          : "2px solid #ffffff"
        : isDark
        ? "1px solid rgba(255,255,255,0.16)"
        : "1px solid rgba(0,0,0,0.08)";
      btn.style.boxShadow = isSelected
        ? "0 6px 18px rgba(0,0,0,0.3)"
        : "0 3px 10px rgba(0,0,0,0.16)";
      marker.getElement().style.zIndex = isSelected ? "52" : "26";
    }
  }, [activeDeal?.id, isDark, isTh, language]);

  syncMarkersLodRef.current = syncMarkersLodAndStyle;

  // Render 5-Category Smart Zoom Place Pins on the Map (Bi-directional Sync with Deck!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    for (const entry of markersRef.current.values()) {
      entry.marker.remove();
    }
    markersRef.current.clear();

    for (const deal of attributeFilteredDeals) {
      if (
        typeof deal.hotelLatitude !== "number" ||
        typeof deal.hotelLongitude !== "number"
      ) {
        continue;
      }

      const catMeta = getPlaceCategoryMeta(deal.placeCategory);
      const btn = document.createElement("button");
      btn.type = "button";
      const placeName = isTh ? deal.hotelNameTh : deal.hotelNameEn;
      const catLabel = isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn;
      btn.setAttribute("aria-label", `${placeName} (${catLabel})`);
      btn.title = `${placeName} · ${catLabel}`;
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
      `;

      const crestEl = document.createElement("span");
      crestEl.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        background: ${catMeta.crestBgHex};
        color: #ffffff;
        flex-shrink: 0;
      `;
      crestEl.innerHTML = getPlaceCategoryMapSvg(catMeta.id, 11);

      const textEl = document.createElement("span");
      textEl.style.cssText = "line-height: 1;";

      btn.appendChild(crestEl);
      btn.appendChild(textEl);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentVisible = visibleDealsRef.current;
        const idx = currentVisible.findIndex((d) => d.id === deal.id);
        if (idx >= 0) {
          setActiveIdx(idx);
          panSoftlyToDealIfNeeded(deal);
        } else {
          const fallbackList =
            currentVisible.length > 0
              ? currentVisible
              : attributeFilteredDealsRef.current;
          const nextOrder = [
            deal.id,
            ...fallbackList.filter((d) => d.id !== deal.id).map((d) => d.id),
          ];
          if (currentVisible.length === 0) {
            setHasUserMovedMap(false);
          } else {
            setPinnedOutsideDealId(deal.id);
          }
          setRestoredDealIds(null);
          setManualShuffleOrder(nextOrder);
          setActiveIdx(getExploreSymmetricStartIdx(nextOrder.length));
          panSoftlyToDealIfNeeded(deal);
        }
      });

      const marker = new maplibregl.Marker({ element: btn, anchor: "center" })
        .setLngLat([deal.hotelLongitude, deal.hotelLatitude])
        .addTo(map);

      markersRef.current.set(deal.id, {
        marker,
        btn,
        crestEl,
        textEl,
        deal,
      });
    }

    syncMarkersLodRef.current();
  }, [
    attributeFilteredDeals,
    isMapReady,
    isTh,
    panSoftlyToDealIfNeeded,
  ]);

  // Synchronize active pill highlight & Smart Zoom LOD whenever selection, theme, or language changes
  useEffect(() => {
    if (!isMapReady) return;
    syncMarkersLodAndStyle();
  }, [isMapReady, syncMarkersLodAndStyle]);

  // Manual "สุ่ม" (Shuffle) button handler
  const handleManualShuffle = useCallback(() => {
    if (visibleDeals.length <= 1) return;
    const shuffled = fisherYatesShuffle(visibleDeals);
    // Guarantee a fresh lead card when possible
    if (shuffled[0]?.id === activeDeal?.id && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    skipNextDeckSignatureRef.current = true;
    setRestoredDealIds(null);
    setManualShuffleOrder(shuffled.map((d) => d.id));
    setActiveIdx(getExploreSymmetricStartIdx(shuffled.length));
    setShuffleKey((k) => k + 1);
    if (shuffled[0]) {
      panSoftlyToDealIfNeeded(shuffled[0]);
    }
  }, [activeDeal?.id, panSoftlyToDealIfNeeded, visibleDeals]);

  // GPS "ใกล้ฉัน" Button Handler
  const handleLocateMyPosition = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationNotice(
        isTh
          ? "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง"
          : "Geolocation is not supported by this browser"
      );
      window.setTimeout(() => setLocationNotice(null), 3500);
      return;
    }

    setIsLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const nextCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(nextCoords);
        userGestureActiveRef.current = true;
        isProgrammaticCameraRef.current = false;
        map.easeTo({
          center: [nextCoords.lng, nextCoords.lat],
          zoom: Math.max(map.getZoom(), 11.8),
          duration: 650,
          easing: easeOutCubic,
          essential: true,
        });
      },
      (err) => {
        setIsLocatingUser(false);
        setLocationNotice(
          err.code === err.PERMISSION_DENIED
            ? isTh
              ? "กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์"
              : "Please allow location access in your browser"
            : isTh
            ? "ไม่สามารถดึงตำแหน่งปัจจุบันได้ในขณะนี้"
            : "Unable to get your current location right now"
        );
        window.setTimeout(() => setLocationNotice(null), 3800);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [isTh]);

  // Reset to All Thailand (clears province/region lock & fits nationwide map cleanly)
  const handleResetMapArea = useCallback(() => {
    setProvinceFilter(null);
    setRegionFilter("all");
    setHasUserMovedMap(false);
    setRestoredDealIds(null);
    setManualShuffleOrder(null);
    setPinnedOutsideDealId(null);
    syncLocationQueryToUrl({ regionId: "all", provinceId: null });
    setActiveIdx(getExploreSymmetricStartIdx(allDeals.length));
    flyMapToLocation({ regionId: "all", provinceId: null }, true);
  }, [allDeals.length, flyMapToLocation, syncLocationQueryToUrl]);

  const handleRecenterSelectedLocation = useCallback(() => {
    setHasUserMovedMap(false);
    setRestoredDealIds(null);
    setManualShuffleOrder(null);
    setPinnedOutsideDealId(null);
    flyMapToLocation(
      { regionId: regionFilter, provinceId: provinceFilter },
      true
    );
  }, [flyMapToLocation, provinceFilter, regionFilter]);

  const handleClearAllFilters = useCallback(() => {
    setPlaceCategoryFilter("ALL");
    setActiveStyle("all");
    setSourceFilter("ALL");
    setProvinceFilter(null);
    setRegionFilter("all");
    setRecentOnly(false);
    setGlobalSearchQuery("");
    setHasUserMovedMap(false);
    setRestoredDealIds(null);
    setManualShuffleOrder(null);
    setPinnedOutsideDealId(null);
    syncLocationQueryToUrl({ regionId: "all", provinceId: null });
    setActiveIdx(getExploreSymmetricStartIdx(allDeals.length));
    flyMapToLocation({ regionId: "all", provinceId: null }, true);
  }, [allDeals.length, flyMapToLocation, setGlobalSearchQuery, syncLocationQueryToUrl]);

  // Pin Detail Fetching & Shared-Element 3D Hero Flip Handlers
  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      pin: PinFeedItemDto;
      comments: PinCommentDto[];
      relatedPins: PinFeedItemDto[];
      hotelPosts?: HotelPostSummaryDto[];
      ownerFeedPosts?: HotelPostSummaryDto[];
      ownerBlogs?: HotelPostSummaryDto[];
      nearbyPlaces?: PinFeedItemDto[];
    };
    if (latestPinReqRef.current === pinId) {
      setPinDetail(data);
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      void loadPinDetail(selectedPinId);
    }
  }, [selectedPinId, loadPinDetail]);

  const activeModalPin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return allDeals.find((d) => d.id === selectedPinId) ?? null;
  }, [allDeals, pinDetail, selectedPinId, selectedPinSnapshot]);

  const activeModalComments = useMemo(
    () => (pinDetail?.pin.id === selectedPinId ? pinDetail.comments : []),
    [pinDetail, selectedPinId]
  );

  const activeModalHotelPosts = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.hotelPosts ?? [] : [],
    [pinDetail, selectedPinId]
  );

  const activeModalOwnerFeedPosts = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId
        ? pinDetail.ownerFeedPosts
        : undefined,
    [pinDetail, selectedPinId]
  );

  const activeModalOwnerBlogs = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.ownerBlogs : undefined,
    [pinDetail, selectedPinId]
  );

  const activeModalNearbyPlaces = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.nearbyPlaces ?? [] : [],
    [pinDetail, selectedPinId]
  );

  const activePinIdxInDeck = useMemo(() => {
    if (!activeModalPin) return -1;
    return visibleDeals.findIndex((d) => d.id === activeModalPin.id);
  }, [activeModalPin, visibleDeals]);

  const prevPinPreview =
    activePinIdxInDeck > 0 ? visibleDeals[activePinIdxInDeck - 1] ?? null : null;
  const nextPinPreview =
    activePinIdxInDeck >= 0 && activePinIdxInDeck < visibleDeals.length - 1
      ? visibleDeals[activePinIdxInDeck + 1] ?? null
      : null;

  // Save current MapLibre camera, exact card order & view mode before leaving /explore so Back restores 1:1!
  const persistExploreCameraBeforeNavigate = useCallback((dealId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const currentVisibleIds = visibleDealsRef.current.map((d) => d.id);
    const currentIdx = currentVisibleIds.indexOf(dealId);
    saveExploreViewMode(deckViewModeRef.current);
    saveExploreCameraSnapshot({
      lat: c.lat,
      lng: c.lng,
      zoom: map.getZoom(),
      activeDealId: dealId,
      hasUserMovedMap: hasUserMovedMapRef.current,
      visibleDealIds: currentVisibleIds,
      activeIdx: currentIdx >= 0 ? currentIdx : undefined,
      deckViewMode: deckViewModeRef.current,
      isDeckHidden: isDeckHiddenRef.current,
    });
  }, []);

  // Open from Bottom Fanned Deck -> Persistent Cross-Route 3D Card Flip straight into /{slug}!
  const handleOpenCardFlip = useCallback(
    (
      pin: PinFeedItemDto,
      _stopNumber: number,
      _badgeText: string | null,
      originRect: CardOriginRect | null
    ) => {
      clearLastClickedPinOrigin();
      persistExploreCameraBeforeNavigate(pin.id);
      navigateToPlaceWithFlip({ pin, originRect });
    },
    [navigateToPlaceWithFlip, persistExploreCameraBeforeNavigate]
  );

  // Open from Horizontal List Strip -> Persistent Cross-Route 3D Card Flip straight into /{slug}!
  const handleOpenDetailFromList = useCallback(
    (pin: PinFeedItemDto, originRect?: CardOriginRect | null) => {
      clearLastClickedPinOrigin();
      persistExploreCameraBeforeNavigate(pin.id);
      navigateToPlaceWithFlip({ pin, originRect });
    },
    [navigateToPlaceWithFlip, persistExploreCameraBeforeNavigate]
  );

  const handleCloseModal = useCallback(() => {
    clearLastClickedPinOrigin();
    setPinHistoryStack([]);
    setDetailRestoreScrollY(null);
    setSelectedPinId(null);
  }, []);

  const handleAfterFlipClose = useCallback(() => {
    setAnimatingPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    setFlipOriginRect(null);
    setFlipBadgeText(null);
  }, []);

  const handleSelectRelatedPin = useCallback(
    (pin: PinFeedItemDto) => {
      // Strict 1-Hop Lock: only allow hopping from Depth 0 -> Depth 1!
      if (pinHistoryStack.length >= 1) return;
      if (activeModalPin && activeModalPin.id !== pin.id) {
        setPinHistoryStack([{ pin: activeModalPin, scrollY: 0 }]);
      }
      recordRecentViewedPinId(pin.id);
      setDetailRestoreScrollY(null);
      setSelectedPinSnapshot(pin);
      setSelectedPinId(pin.id);
    },
    [activeModalPin, pinHistoryStack.length]
  );

  const handleStepBackPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleCloseModal();
      return;
    }
    const prev = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((s) => s.slice(0, -1));
    setDetailRestoreScrollY(prev.scrollY);
    setSelectedPinSnapshot(prev.pin);
    setSelectedPinId(prev.pin.id);
  }, [handleCloseModal, pinHistoryStack]);

  const handleNavigatePin = useCallback(
    (direction: "prev" | "next") => {
      const target = direction === "next" ? nextPinPreview : prevPinPreview;
      if (!target) return;
      recordRecentViewedPinId(target.id);
      setPinHistoryStack([]);
      setDetailRestoreScrollY(null);
      setSelectedPinSnapshot(target);
      setSelectedPinId(target.id);
    },
    [nextPinPreview, prevPinPreview]
  );

  const handleToggleSavePin = useCallback(
    (pin: PinFeedItemDto) => {
      triggerPinToBoard({
        id: pin.id,
        coverImageUrl: pin.coverImageUrl,
        isSavedByMe: globalSavedPinIds.has(pin.id),
      });
    },
    [globalSavedPinIds, triggerPinToBoard]
  );

  const handleToggleLike = useCallback(
    (pinId: string) => {
      const target =
        (activeModalPin?.id === pinId ? activeModalPin : null) ??
        allDeals.find((d) => d.id === pinId);
      if (!target) return;
      togglePinLikeInstant({
        id: target.id,
        isLikedByMe: target.isLikedByMe,
        likesCount: target.likesCount,
      });
    },
    [activeModalPin, allDeals, togglePinLikeInstant]
  );

  const activeProvinceObj = provinceFilter
    ? provinceById.get(provinceFilter) ?? null
    : null;
  const activeRegionObj =
    regionFilter !== "all" && regionFilter !== "tourist"
      ? regionById.get(regionFilter) ?? null
      : null;
  const isTouristScopeOnly = !activeProvinceObj && regionFilter === "tourist";
  const isLocationFiltered = Boolean(
    activeProvinceObj || activeRegionObj || isTouristScopeOnly
  );
  const bookTabLabel = activeProvinceObj
    ? isTh
      ? activeProvinceObj.shortNameTh
      : activeProvinceObj.shortNameEn
    : isTouristScopeOnly
    ? isTh
      ? "เมืองท่องเที่ยว"
      : "Top destinations"
    : activeRegionObj
    ? isTh
      ? activeRegionObj.labelTh
      : activeRegionObj.labelEn
    : isTh
    ? "ทั่วประเทศ"
    : "All Thailand";

  const activeFilterCount =
    (placeCategoryFilter !== "ALL" ? 1 : 0) +
    (activeStyle !== "all" ? 1 : 0) +
    (sourceFilter !== "ALL" ? 1 : 0) +
    (isLocationFiltered ? 1 : 0) +
    (recentOnly ? 1 : 0);

  const modalPin = activeModalPin ?? selectedPinSnapshot;

  const renderDetailContent = () =>
    modalPin ? (
      <PinterestPinDetail
        pin={modalPin}
        language={language}
        currentUser={currentUser}
        comments={activeModalComments}
        savedPinIds={globalSavedPinIds}
        relatedPins={[]}
        detailFooterMode="property-only"
        hotelPosts={activeModalHotelPosts}
        ownerFeedPosts={activeModalOwnerFeedPosts}
        ownerBlogs={activeModalOwnerBlogs}
        nearbyPlaces={activeModalNearbyPlaces}
        isNearbyHop={pinHistoryStack.length > 0}
        backTargetName={
          pinHistoryStack.length > 0
            ? isTh
              ? pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameTh
              : pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameEn
            : null
        }
        mobileOverlayMode={true}
        prevPinPreview={prevPinPreview}
        nextPinPreview={nextPinPreview}
        canStepBack={pinHistoryStack.length > 0}
        restoreScrollY={detailRestoreScrollY}
        onBack={handleStepBackPin}
        onClose={handleCloseModal}
        onSelectPin={handleSelectRelatedPin}
        onNavigatePin={handleNavigatePin}
        onToggleLike={handleToggleLike}
        onToggleSave={(targetPinId) => {
          const target =
            (modalPin.id === targetPinId ? modalPin : null) ??
            activeModalNearbyPlaces.find((p) => p.id === targetPinId) ??
            allDeals.find((d) => d.id === targetPinId);
          if (target) handleToggleSavePin(target);
        }}
        onSharePin={() => {}}
        onExpandMedia={(urls, idx) =>
          setFullscreenMedia({
            slides: urls.map((u) => ({ type: "image", url: u })),
            index: idx,
          })
        }
        onAddComment={async (text, parentId) => {
          await fetch(`/api/pins/${encodeURIComponent(modalPin.id)}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text, parentId }),
          });
          await loadPinDetail(modalPin.id);
        }}
        onDeleteComment={async (commentId) => {
          await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
            method: "DELETE",
          });
          await loadPinDetail(modalPin.id);
        }}
      />
    ) : null;

  return (
    <>
      {/* =====================================================================
          CONTINUOUS LIVE MAP STAGE (DESKTOP DIV CARD / MOBILE FULL-BLEED)
          + FLUSH-BOTTOM AUTO-SHUFFLE FANNED PHOTO DECK (EXACT /trip CLONE!)
      ====================================================================== */}
      {/* Static Map Stage Height (ZERO MapLibre canvas resize or WebGL flicker on hide/show!) */}
      <div className="cgr-trip-stage-enter fixed inset-x-0 top-0 bottom-[var(--cgr-mobile-nav-h)] lg:left-[72px] lg:top-16 lg:bottom-0 z-20 overflow-clip overscroll-none bg-[var(--color-background-body)] lg:px-8 lg:pt-4 lg:pb-[74px] select-none">
        <div className="relative w-full h-full lg:max-w-[1220px] lg:mx-auto lg:rounded-[26px] overflow-hidden lg:border lg:border-[var(--color-border)] bg-[var(--color-background-muted)]">
          {/* 1. ISOLATED MAPLIBRE VECTOR MAP LAYER */}
          <div
            ref={mapContainerRef}
            onPointerDownCapture={() => {
              if (isMapMovingRef.current && settleTimerRef.current !== null) {
                clearSettleTimer();
                const resume = () => {
                  window.removeEventListener("pointerup", resume);
                  window.removeEventListener("pointercancel", resume);
                  if (
                    isMapMovingRef.current &&
                    !userGestureActiveRef.current &&
                    settleTimerRef.current === null
                  ) {
                    scheduleMapSettleReveal(pendingUserGestureRef.current);
                  }
                };
                window.addEventListener("pointerup", resume, { once: true });
                window.addEventListener("pointercancel", resume, {
                  once: true,
                });
              }
            }}
            className="absolute inset-0 z-0 isolate w-full h-full touch-none [transform:translateZ(0)]"
            aria-label={isTh ? "แผนที่สำรวจโปรที่พัก" : "Explore stay deals map"}
          />

          {/* 2. TOP-RIGHT ALIGNED MAP UTILITY RAIL (Zoom + GPS + Shuffle + All Thailand) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute top-[max(12px,env(safe-area-inset-top))] right-3 sm:top-4 sm:right-4 z-30 flex flex-col items-end gap-2"
          >
            {/* Desktop/Tablet Grouped Zoom Controls */}
            <div className="hidden sm:flex flex-col rounded-[12px] overflow-hidden bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)]">
              <button
                type="button"
                onClick={() => {
                  userGestureActiveRef.current = true;
                  mapRef.current?.zoomIn({ duration: 240 });
                }}
                aria-label={isTh ? "ซูมเข้า" : "Zoom in"}
                className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => {
                  userGestureActiveRef.current = true;
                  mapRef.current?.zoomOut({ duration: 240 });
                }}
                aria-label={isTh ? "ซูมออก" : "Zoom out"}
                className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>

            {/* GPS Near Me */}
            <button
              type="button"
              onClick={handleLocateMyPosition}
              aria-label={isTh ? "ตำแหน่งใกล้ฉัน" : "Near me"}
              title={isTh ? "หาที่พักใกล้ฉัน" : "Near me"}
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              {isLocatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" strokeWidth={2.1} />
              )}
            </button>

            {/* Manual Shuffle Deck */}
            {visibleDeals.length > 1 && (
              <button
                type="button"
                onClick={handleManualShuffle}
                aria-label={isTh ? "สุ่มสับการ์ดโปรใหม่" : "Shuffle deals"}
                title={isTh ? "สุ่มสับการ์ดโปรในโซนนี้" : "Shuffle deals"}
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Shuffle className="w-4 h-4" strokeWidth={2.1} />
              </button>
            )}

            {/* Reset to All Thailand */}
            {(hasUserMovedMap || isLocationFiltered) && (
              <button
                type="button"
                onClick={handleResetMapArea}
                aria-label={isTh ? "ดูโปรทั่วไทย" : "Show all Thailand"}
                title={isTh ? "ดูโปรทั่วไทย" : "Show all Thailand"}
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Globe className="w-4 h-4" strokeWidth={2.1} />
              </button>
            )}
          </div>

          {/* 3. BOTTOM-RIGHT VERTICAL ICON STACK: FILTER & DECK/ROW TOGGLE (Thumb-Friendly Icon-Only Buttons!) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              transitionProperty: "bottom",
              transitionDuration: "var(--duration-morph)",
              transitionTimingFunction: "var(--ease-ios-sheet)",
            }}
            className={`absolute right-3 sm:right-4 lg:right-4 z-30 flex flex-col items-end gap-2.5 ${
              visibleDeals.length === 0
                ? "bottom-[150px] sm:bottom-[142px] lg:bottom-[64px]"
                : isDeckHidden
                ? "bottom-[90px] sm:bottom-[90px] lg:bottom-5"
                : "bottom-[326px] sm:bottom-[370px] lg:bottom-[298px]"
            }`}
          >
            {/* Filter Icon Button */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              aria-label={isTh ? "ตัวกรองโปรที่พัก" : "Filter stay deals"}
              title={isTh ? "ตัวกรอง" : "Filters"}
              className={`relative h-11 w-11 rounded-[13px] border shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors ${
                activeFilterCount > 0
                  ? "bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] border-transparent !text-white dark:!text-[#222222]"
                  : "bg-[var(--color-background-popover)]/96 backdrop-blur-md border-black/[0.06] dark:border-white/[0.1] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.1} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-[#e60023] text-white text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-[var(--color-background-body)] tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Toggle Fan Deck <-> Horizontal Single-Row Card Strip */}
            <button
              type="button"
              aria-pressed={!isDeckHidden && deckViewMode === "list"}
              onClick={handleToggleDeckViewMode}
              aria-label={
                isDeckHidden
                  ? isTh
                    ? "แสดงการ์ดสถานที่"
                    : "Show place cards"
                  : deckViewMode === "fan"
                  ? isTh
                    ? "เปลี่ยนเป็นแถวการ์ดแนวนอน"
                    : "Switch to horizontal card row"
                  : isTh
                  ? "สลับกลับเป็น Fan Card"
                  : "Switch back to fanned deck"
              }
              title={
                isDeckHidden
                  ? isTh
                    ? `แสดงการ์ด (${visibleDeals.length})`
                    : `Show cards (${visibleDeals.length})`
                  : deckViewMode === "fan"
                  ? isTh
                    ? `แถวการ์ดแนวนอน (${visibleDeals.length})`
                    : `Card row (${visibleDeals.length})`
                  : isTh
                  ? "กลับไปดูแบบ Fan Card"
                  : "Fanned deck"
              }
              className="h-11 w-11 rounded-[13px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              {deckViewMode === "fan" ? (
                <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={2.1} />
              ) : (
                <Layers className="w-[18px] h-[18px]" strokeWidth={2.1} />
              )}
            </button>
          </div>

          {/* 4. OPTIONAL LOCATION NOTICE TOAST */}
          {locationNotice && (
            <div className="pointer-events-none absolute top-[max(16px,env(safe-area-inset-top))] sm:top-5 left-1/2 -translate-x-1/2 z-30 px-3">
              <div className="rounded-[12px] bg-[#222222]/92 dark:bg-[#f5f5f5]/95 text-white dark:text-[#222222] px-3.5 py-2 text-[12.5px] font-medium shadow-[var(--shadow-popover)]">
                {locationNotice}
              </div>
            </div>
          )}
        </div>

        {/* 6. PERSISTENT AIRBNB WHITE BOTTOM SHEET + PROTRUDING BOOK INDEX TAB (YEAR-ROUND PROVINCE / REGION PICKER) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 lg:px-[104px] flex justify-center">
          <div
            data-tucked={
              !isDeckHidden &&
              visibleDeals.length > 0 &&
              isMapMoving &&
              !selectedPinId
                ? "true"
                : "false"
            }
            data-dragging={isDraggingSheet ? "true" : "false"}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={
              isDraggingSheet && sheetDragHeight !== null
                ? {
                    height: `${sheetDragHeight}px`,
                  }
                : undefined
            }
            className={`cgr-explore-dock-sheet relative w-full lg:max-w-[1160px] flex flex-col overflow-visible ${
              visibleDeals.length === 0
                ? "h-[136px] sm:h-[128px] lg:h-[124px]"
                : isDeckHidden
                ? "h-[76px] lg:h-[74px]"
                : "h-[314px] sm:h-[358px] lg:h-[358px]"
            }`}
          >
            {/* PROTRUDING BOOK INDEX TAB ("ปีกสมุดยื่นออกมา") — OPENS iPHONE HH:MM WHEEL PICKER */}
            <button
              type="button"
              onClick={handleOpenProvincePicker}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              aria-haspopup="dialog"
              aria-expanded={isProvincePickerOpen}
              aria-label={
                isTh
                  ? `เลือกจังหวัดหรือภาค (กำลังดู: ${bookTabLabel})`
                  : `Select province or region (current: ${bookTabLabel})`
              }
              className="group pointer-events-auto absolute bottom-full left-0 -mb-[1px] z-20 inline-flex items-center h-[38px] sm:h-[40px] pl-2 pr-2 sm:pl-2.5 sm:pr-2.5 rounded-tr-[14px] lg:rounded-tl-[16px] bg-[var(--color-background-body)] border-t border-r lg:border-l border-[var(--color-border)] text-[var(--color-text-primary)] cursor-pointer"
            >
              {/* Seamless bottom bridge masking sheet top border directly beneath the tab */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[var(--color-background-body)]"
              />
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] group-hover:bg-[var(--color-background-muted)] transition-colors">
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isLocationFiltered
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
                  }`}
                  strokeWidth={2.2}
                />
                <span className="max-w-[164px] sm:max-w-[220px] truncate text-[13.5px] sm:text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                  {bookTabLabel}
                </span>
                {isLocationFiltered && (
                  <span className="text-[11.5px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                    ({attributeFilteredDeals.length})
                  </span>
                )}
                <ChevronDown
                  className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors"
                  strokeWidth={2.2}
                />
              </span>
              {/* Crisp Concave Right-Shoulder Fillet smoothly fusing tab into top edge of bottom sheet */}
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="pointer-events-none absolute bottom-0 -right-[13px] w-[14px] h-[14px] text-[var(--color-background-body)]"
              >
                <path
                  d="M0 0 L0 14 L14 14 A14 14 0 0 1 0 0 Z"
                  fill="currentColor"
                />
                <path
                  d="M0.5 0 A13.5 13.5 0 0 0 14 13.5"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
              </svg>
            </button>

            {/* INNER WHITE SHEET BODY (rounded-tl-none so left edge flows seamlessly from the Book Tab!) */}
            <div
              className={`relative z-10 w-full h-full flex flex-col overflow-hidden bg-[var(--color-background-body)] ${
                visibleDeals.length === 0
                  ? "rounded-tl-none rounded-tr-[24px] lg:rounded-tr-[26px] border-t lg:border-x border-[var(--color-border)] shadow-[var(--shadow-popover)]"
                  : isDeckHidden
                  ? "rounded-tl-none rounded-tr-[24px] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] lg:rounded-none lg:border-0 lg:shadow-none"
                  : "rounded-tl-none rounded-tr-[24px] lg:rounded-tr-[26px] border-t lg:border-x border-[var(--color-border)] shadow-[var(--shadow-popover)]"
              }`}
            >
              {visibleDeals.length === 0 ? (
                /* COMPACT EMPTY STATE DIRECTLY BELOW THE BOOK TAB (never traps user in an empty province!) */
                <div className="cgr-sheet-content-in w-full h-full px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                      {activeProvinceObj
                        ? hasUserMovedMap && attributeFilteredDeals.length > 0
                          ? isTh
                            ? `เลื่อนออกนอกโซนที่พักใน${activeProvinceObj.nameTh}`
                            : `Moved outside places in ${activeProvinceObj.nameEn}`
                          : isTh
                          ? `ยังไม่มีสถานที่ใน${activeProvinceObj.nameTh}`
                          : `No places in ${activeProvinceObj.nameEn} yet`
                        : activeRegionObj
                        ? isTh
                          ? `ยังไม่มีสถานที่ใน${activeRegionObj.labelTh}บริเวณนี้`
                          : `No places in ${activeRegionObj.labelEn} here`
                        : isTh
                        ? "ยังไม่มีโปรที่พักในโซนแผนที่นี้"
                        : "No places in this map area"}
                    </p>
                    <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {isTh
                        ? "เลือกจังหวัดอื่นจากปีกสมุดด้านซ้าย หรือดูทั้งหมดทั่วประเทศ"
                        : "Pick another province from the tab or view all Thailand."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLocationFiltered &&
                    hasUserMovedMap &&
                    attributeFilteredDeals.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleRecenterSelectedLocation}
                        className="h-9 sm:h-10 px-4 rounded-[11px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? `กลับไป${bookTabLabel}` : `Back to ${bookTabLabel}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenProvincePicker}
                        className="h-9 sm:h-10 px-4 rounded-[11px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? "เปลี่ยนจังหวัด" : "Change province"}
                      </button>
                    )}

                    {(hasUserMovedMap || isLocationFiltered) && (
                      <button
                        type="button"
                        onClick={handleResetMapArea}
                        className="h-9 sm:h-10 px-3.5 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? "ดูทั่วประเทศ" : "All Thailand"}
                      </button>
                    )}

                    {(placeCategoryFilter !== "ALL" ||
                      activeStyle !== "all" ||
                      sourceFilter !== "ALL" ||
                      recentOnly ||
                      globalSearchQuery.trim()) && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="h-9 sm:h-10 px-3.5 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? "ล้างตัวกรอง" : "Reset"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* UNIFIED CONTINUOUS SHEET MORPH (Apple Maps / Airbnb Native Detent Standard):
                   - ONE persistent grab handle at top (NEVER unmounts or shifts!)
                   - Live opacity crossfade between Fan/List cards & Collapsed Peek Label ("พบ xx สถานที่...")
                   - Zero double-transition fight, zero pop-in flash, zero bounce-back! */
                (() => {
                  const expandedH = getExpandedSheetHeight();
                  const collapsedH = getCollapsedSheetHeight();
                  const liveH =
                    isDraggingSheet && sheetDragHeight !== null
                      ? sheetDragHeight
                      : isDeckHidden
                      ? collapsedH
                      : expandedH;
                  const collapseProgress = Math.max(
                    0,
                    Math.min(
                      1,
                      (expandedH - liveH) / Math.max(1, expandedH - collapsedH)
                    )
                  );
                  const deckContentOpacity = Math.max(
                    0,
                    Math.min(1, 1 - (collapseProgress - 0.08) / 0.54)
                  );
                  const peekLabelOpacity = Math.max(
                    0,
                    Math.min(1, (collapseProgress - 0.56) / 0.36)
                  );
                  const isFullyCollapsedAtRest =
                    isDeckHidden && !isDraggingSheet;

                  return (
                    <>
                      {/* 1. Persistent Grab Handle / Collapsed Full-Bar Tap & Drag Target */}
                      <button
                        type="button"
                        onClick={() => {
                          if (sheetDragMovedRef.current) {
                            sheetDragMovedRef.current = false;
                            return;
                          }
                          setIsDeckHidden((prev) => !prev);
                        }}
                        onTouchStart={handleSheetHeaderTouchStart}
                        onTouchMove={handleSheetHeaderTouchMove}
                        onTouchEnd={handleSheetHeaderTouchEnd}
                        onTouchCancel={handleSheetHeaderTouchCancel}
                        aria-expanded={!isDeckHidden}
                        aria-label={
                          isDeckHidden
                            ? isTh
                              ? `แสดง ${visibleDeals.length} สถานที่ในแผนที่`
                              : `Show ${visibleDeals.length} places within map area`
                            : isTh
                            ? "ซ่อนแถบการ์ด"
                            : "Hide cards"
                        }
                        title={
                          isDeckHidden
                            ? isTh
                              ? "แสดงการ์ด"
                              : "Show cards"
                            : isTh
                            ? "ซ่อนการ์ด"
                            : "Hide cards"
                        }
                        className={`group relative z-40 shrink-0 w-full flex flex-col items-center justify-start pt-3.5 px-5 cursor-pointer touch-none ${
                          isDeckHidden
                            ? "h-full hover:bg-[var(--color-background-muted)]/60 transition-colors"
                            : "h-9"
                        }`}
                      >
                        <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] group-hover:bg-[var(--color-text-secondary)] transition-colors shrink-0" />
                      </button>

                      {/* 2. Live Crossfade Collapsed Peek Label (fades smoothly IN right as sheet reaches 76px!) */}
                      <div
                        aria-hidden={peekLabelOpacity < 0.05}
                        style={{
                          opacity: peekLabelOpacity,
                          transform: `translate3d(0, ${(
                            (1 - peekLabelOpacity) *
                            6
                          ).toFixed(2)}px, 0)`,
                          transition: isDraggingSheet
                            ? "none"
                            : "opacity 220ms ease, transform 280ms var(--ease-out-expo)",
                        }}
                        className="pointer-events-none absolute inset-x-0 top-[30px] z-40 flex items-center justify-center px-5"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[14.5px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] tracking-[-0.01em] tabular-nums">
                          <span>
                            {hasUserMovedMap
                              ? isTh
                                ? `พบ ${visibleDeals.length.toLocaleString()} สถานที่ในโซนแผนที่นี้`
                                : `${visibleDeals.length.toLocaleString()} places within map area`
                              : isTh
                              ? `พบ ${visibleDeals.length.toLocaleString()} สถานที่บนแผนที่`
                              : `${visibleDeals.length.toLocaleString()} places on map`}
                          </span>
                          <ChevronUp
                            className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0"
                            strokeWidth={2.2}
                          />
                        </span>
                      </div>

                      {/* 3. Persistent Rigid Expanded Deck Wrapper (anchored top-9 -> rides 1:1 with thumb while fading cleanly!) */}
                      <div
                        aria-hidden={isFullyCollapsedAtRest}
                        style={{
                          opacity: deckContentOpacity,
                          visibility:
                            isFullyCollapsedAtRest && deckContentOpacity <= 0.01
                              ? "hidden"
                              : "visible",
                          transition: isDraggingSheet
                            ? "none"
                            : "opacity 220ms ease",
                        }}
                        className={`absolute inset-x-0 top-9 h-[278px] sm:h-[322px] w-full flex flex-col ${
                          isFullyCollapsedAtRest ? "pointer-events-none" : ""
                        }`}
                      >
                        {deckViewMode === "fan" ? (
                          <div className="relative flex-1 min-h-0 w-full">
                            <FannedPhotoCardDeck
                              items={deckItems}
                              activeIdx={safeActiveIdx}
                              language={language}
                              mode="explore"
                              deckIdentityKey="explore-deck"
                              shuffleKey={shuffleKey}
                              isMapMoving={isMapMoving}
                              modalOpenPinId={
                                detailOpenSource === "deck"
                                  ? animatingPinId
                                  : null
                              }
                              enableReorder={false}
                              cardTopAction="bookmark"
                              savedPinIds={globalSavedPinIds}
                              centerVisibleRatio={0.85}
                              showMobileWhiteBackdrop={false}
                              captureMobileBackdropSwipe={true}
                              onSelectIndex={handleSelectDeckIndex}
                              onOpenCard={(pin, stopNum, badgeText, originRect) =>
                                handleOpenCardFlip(
                                  pin,
                                  stopNum,
                                  badgeText,
                                  originRect
                                )
                              }
                              onToggleSavePin={handleToggleSavePin}
                              onSheetPullMove={handleSheetPullMove}
                              onSheetPullEnd={handleSheetPullEnd}
                            />
                          </div>
                        ) : (
                          <ExploreHorizontalCardStrip
                            deals={visibleDeals}
                            activeIdx={safeActiveIdx}
                            language={language}
                            savedPinIds={globalSavedPinIds}
                            onSelectPin={(pin, rect) =>
                              handleOpenDetailFromList(pin, rect)
                            }
                            onHoverIndex={(idx) => setActiveIdx(idx)}
                            onToggleSavePin={handleToggleSavePin}
                            onSheetPullMove={handleSheetPullMove}
                            onSheetPullEnd={handleSheetPullEnd}
                          />
                        )}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          UNIFIED AIRBNB WARM MINIMAL FILTER MODAL
          (Slide-Up Bottom Sheet on Mobile / Centered Modal on Desktop, z-[95])
          Holds ALL filter options cleanly with minimal borders & equal divide-y sections!
      ====================================================================== */}
      {filterModalPresence.shouldRender &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isTh ? "ตัวกรองโปรที่พัก" : "Filter stay deals"}
            data-state={filterModalPresence.dataState}
            onClick={() => setIsFilterModalOpen(false)}
            className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/50 flex items-end lg:items-center justify-center p-0 lg:p-6"
          >
            <div
              data-state={filterModalPresence.dataState}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="cgr-modal-surface-md w-full lg:max-w-[540px] max-h-[84dvh] rounded-t-[24px] lg:rounded-[24px] bg-[var(--color-background-popover)] border-t lg:border border-[var(--color-border)] lg:border-black/[0.06] lg:dark:border-white/[0.1] shadow-[var(--shadow-popover)] pb-[max(20px,var(--cgr-safe-bottom))] lg:pb-0 flex flex-col overflow-hidden"
            >
              {/* Mobile Top Drag Handle */}
              <div className="flex lg:hidden justify-center pt-2.5 pb-1 shrink-0">
                <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
              </div>

              {/* Header */}
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                <h2 className="text-[16.5px] font-semibold text-[var(--color-text-primary)] tracking-[-0.01em]">
                  {isTh ? "ตัวกรองสถานที่ & โปรโมชั่น" : "Filter places & deals"}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  aria-label={isTh ? "ปิดตัวกรอง" : "Close filters"}
                  className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Equal-Rhythm Single-Hairline Sections (Zero Border Fatigue, Zero Price Filter) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 divide-y divide-[var(--color-border)]">
                {/* Section 1: 5 Place Categories with Colored Crest Icons */}
                <section className="pb-5 space-y-3">
                  <div className="space-y-0.5">
                    <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "ประเภทสถานที่" : "Place category"}
                    </h3>
                    <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "เลือกดูที่พัก คาเฟ่ ร้านอาหาร ที่เที่ยว หรือสปาบนแผนที่"
                        : "Filter map pins by stays, cafes, dining, attractions, or wellness."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={placeCategoryFilter === "ALL"}
                      onClick={() => {
                        setPlaceCategoryFilter("ALL");
                        setRestoredDealIds(null);
                        setManualShuffleOrder(null);
                        setPinnedOutsideDealId(null);
                      }}
                      className={`h-10 px-3.5 rounded-[11px] text-[13px] font-semibold cursor-pointer transition-colors ${
                        placeCategoryFilter === "ALL"
                          ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                          : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      {isTh ? "ทุกประเภท" : "All places"}
                    </button>
                    {PLACE_CATEGORIES.map((cat) => {
                      const isActive = placeCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setPlaceCategoryFilter(cat.id);
                            setRestoredDealIds(null);
                            setManualShuffleOrder(null);
                            setPinnedOutsideDealId(null);
                          }}
                          className={`h-10 pl-2 pr-3.5 rounded-[11px] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                            isActive
                              ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                          }`}
                        >
                          <PlaceCategoryCrest
                            category={cat.id}
                            language={language}
                            size="sm"
                          />
                          <span>{isTh ? cat.shortLabelTh : cat.shortLabelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Section 2: Deal Source (จองตรง 0% GP / ทั้งหมด / ดีลพาร์ทเนอร์) */}
                <section className="py-5 space-y-3">
                  <div className="space-y-0.5">
                    <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "แหล่งโปรโมชั่น" : "Deal source"}
                    </h3>
                    <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "เลือกดูโปรจองตรงกับที่พัก 0% GP หรือรวมดีลพิเศษจากพาร์ทเนอร์"
                        : "Choose direct 0% GP hotel deals or include partner offers."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "ALL", th: "ทั้งหมด", en: "All" },
                        { id: "INTERNAL", th: "จองตรง 0% GP", en: "0% GP" },
                        { id: "EXTERNAL", th: "ดีลพาร์ทเนอร์", en: "Partner" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={sourceFilter === opt.id}
                        onClick={() => {
                          setSourceFilter(opt.id);
                          setRestoredDealIds(null);
                          setManualShuffleOrder(null);
                          setPinnedOutsideDealId(null);
                        }}
                        className={`h-10 rounded-[11px] text-[13px] font-semibold cursor-pointer transition-colors ${
                          sourceFilter === opt.id
                            ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {isTh ? opt.th : opt.en}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Section 2: Stay Style */}
                <section className="py-5 space-y-3">
                  <div className="space-y-0.5">
                    <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "สไตล์ที่พัก" : "Stay style"}
                    </h3>
                    <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "กรองบรรยากาศที่พักที่ตรงใจในโซนแผนที่นี้"
                        : "Filter by atmosphere and stay type."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STAY_STYLE_TABS.map((tab) => {
                      const isActive = activeStyle === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setActiveStyle(tab.id);
                            setRestoredDealIds(null);
                            setManualShuffleOrder(null);
                            setPinnedOutsideDealId(null);
                          }}
                          className={`h-9 px-3.5 rounded-[11px] text-[13px] font-semibold cursor-pointer transition-colors ${
                            isActive
                              ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                          }`}
                        >
                          {isTh ? tab.labelTh : tab.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Section 3: Extra Display Options (Recently Viewed & Active Area/Search) */}
                <section className="pt-5 space-y-3">
                  <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                    {isTh ? "ตัวเลือกเพิ่มเติม" : "Additional options"}
                  </h3>
                  <div className="space-y-3">
                    <StandardCheckbox
                      checked={recentOnly}
                      onChange={(next) => {
                        setRecentOnly(next);
                        setRestoredDealIds(null);
                        setManualShuffleOrder(null);
                        setPinnedOutsideDealId(null);
                      }}
                      label={
                        isTh
                          ? "แสดงเฉพาะที่พักที่เคยเปิดดูล่าสุด"
                          : "Recently viewed stays only"
                      }
                    />
                    {(isLocationFiltered || globalSearchQuery.trim()) && (
                      <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[var(--color-text-secondary)]">
                        <span className="truncate">
                          {globalSearchQuery.trim()
                            ? isTh
                              ? `คำค้นหา: “${globalSearchQuery.trim()}”`
                              : `Search: "${globalSearchQuery.trim()}"`
                            : isTh
                            ? `พื้นที่ที่เลือก: ${bookTabLabel}`
                            : `Selected area: ${bookTabLabel}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProvinceFilter(null);
                            setRegionFilter("all");
                            setGlobalSearchQuery("");
                            setRestoredDealIds(null);
                            setManualShuffleOrder(null);
                            syncLocationQueryToUrl({
                              regionId: "all",
                              provinceId: null,
                            });
                          }}
                          className="text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 shrink-0 cursor-pointer"
                        >
                          {isTh ? "ล้างตัวกรอง" : "Clear"}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Sticky Footer: Underline Reset Link + Solid #222222 CTA */}
              <div className="shrink-0 px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleClearAllFilters();
                    setIsFilterModalOpen(false);
                  }}
                  className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 cursor-pointer transition-opacity"
                >
                  {isTh ? "ล้างทั้งหมด" : "Clear all"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors tabular-nums"
                >
                  {isTh
                    ? `แสดง ${visibleDeals.length} โปรที่พัก`
                    : `Show ${visibleDeals.length} stays`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          DETAIL MODAL A (FROM BOTTOM FANNED DECK):
          SIGNATURE SHARED-ELEMENT HERO PHOTO 3D FLIP MODAL (IDENTICAL TO /trip!)
      ====================================================================== */}
      <TripCardFlipModal
        isOpen={Boolean(activeModalPin) && detailOpenSource === "deck"}
        pin={detailOpenSource === "deck" ? modalPin : null}
        stopNumber={flipStopNumber}
        frontBadgeText={flipBadgeText}
        originRect={flipOriginRect}
        language={language}
        onRequestClose={handleCloseModal}
        onAfterClose={handleAfterFlipClose}
      >
        {detailOpenSource === "deck" ? renderDetailContent() : null}
      </TripCardFlipModal>

      {/* =====================================================================
          DETAIL MODAL B (FROM LIST MODAL):
          CALM FADE SLIDE-IN / SLIDE-OUT MODAL (ZERO BOTTOM 3D CARD FLIP!)
      ====================================================================== */}
      {listDetailPresence.shouldRender &&
        modalPin &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isTh ? "รายละเอียดโปรโมชั่น" : "Promotion details"}
            data-state={listDetailPresence.dataState}
            onClick={handleCloseModal}
            className="cgr-modal-backdrop fixed inset-0 z-[90] bg-black/55 flex items-end lg:items-center justify-center p-0 lg:p-6"
          >
            <div
              data-state={listDetailPresence.dataState}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="cgr-modal-surface-lg w-full h-[100dvh] lg:w-[90vw] lg:max-w-[1140px] lg:h-[90vh] lg:max-h-[840px] rounded-none lg:rounded-[24px] bg-[var(--color-background-body)] lg:border border-black/[0.08] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-y-auto px-0 lg:px-7 py-0 lg:py-6"
            >
              {renderDetailContent()}
            </div>
          </div>,
          document.body
        )}

      {hasMountedProvincePicker && (
        <ProvinceWheelPickerModal
          isOpen={isProvincePickerOpen}
          language={language}
          catalog={resolvedLocationCatalog}
          selectedRegionId={regionFilter}
          selectedProvinceId={provinceFilter}
          onClose={() => setIsProvincePickerOpen(false)}
          onConfirm={handleConfirmProvinceSelection}
        />
      )}

      {fullscreenMedia && (
        <PureMediaViewer
          slides={fullscreenMedia.slides}
          initialIndex={fullscreenMedia.index}
          onClose={() => setFullscreenMedia(null)}
        />
      )}
    </>
  );
}
