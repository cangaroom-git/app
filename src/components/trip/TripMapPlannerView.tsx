"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  ChevronUp,
  Compass,
  CopyPlus,
  Layers,
  LayoutGrid,
  Loader2,
  LocateFixed,
  Minus,
  Pause,
  Play,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { ExploreHorizontalCardStrip } from "@/components/explore/ExploreHorizontalCardStrip";
import {
  FannedPhotoCardDeck,
  type FannedDeckCardItem,
} from "@/components/shared/FannedPhotoCardDeck";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { getPlaceCategoryMapSvg } from "@/components/shared/PlaceCategoryCrest";
import {
  configureThailandMapInteractions,
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
  THAILAND_DEFAULT_CENTER,
  THAILAND_DEFAULT_ZOOM,
  THAILAND_MAX_ZOOM,
  WORLD_MIN_ZOOM,
} from "@/lib/geo/airbnbMapLibreStyle";
import {
  buildCurvedArcGeoJson,
  estimateRoadDistanceAndTime,
  formatDistanceLabel,
  haversineDistanceKm,
  offsetCoordinateByKm,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import {
  createCategoryPinElement,
  resolveCategoryPinVisual,
} from "@/lib/geo/googleMapsLoader";
import { getProvinceCenter } from "@/lib/geo/thailandProvinceCentroids";
import { useModalPresence } from "@/lib/useModalPresence";
import { TripAmbientAudioPlayer } from "@/lib/audio/tripAmbientAudio";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type {
  PinFeedItemDto,
  SavedBoardDto,
  SavedBoardPinItemDto,
} from "@/types/cangaroom";

interface ResolvedTripStop {
  entry: SavedBoardPinItemDto;
  index: number;
  stopNumber: number;
  lat: number;
  lng: number;
  isApproximateCoord: boolean;
}

export interface TripMapPlannerViewProps {
  board: SavedBoardDto;
  entries: SavedBoardPinItemDto[];
  language: LanguageCode;
  isDark: boolean;
  /** True when the current viewer owns this trip (shows Move, Remove, Delete). False = public guest view! */
  isOwner?: boolean;
  /** Displayed subtly under trip title when viewing someone else's shared trip */
  ownerDisplayName?: string | null;
  /** Viewer's saved pin IDs for guest Bookmark toggle */
  savedPinIds?: Set<string>;
  /** Pin ID currently opened or animating in the 3D Flip Modal */
  modalOpenPinId: string | null;
  isCloningTrip?: boolean;
  onBack: () => void;
  onDeleteTrip: (board: SavedBoardDto) => void;
  onShareTrip?: () => void;
  onCloneTrip?: () => void;
  onSelectPinDetail: (
    pin: PinFeedItemDto,
    stopNumber: number,
    originRect: CardOriginRect | null
  ) => void;
  onRemovePin: (pinId: string) => void;
  onToggleSavePin?: (pin: PinFeedItemDto) => void;
  onReorderPins: (orderedPinIds: string[]) => Promise<void>;
}

const PREVIEW_NEXT_SRC_ID = "cgr-trip-preview-next-src";
const PREVIEW_NEXT_LAYER_ID = "cgr-trip-preview-next-layer";
const STORY_TRAIL_SRC_ID = "cgr-trip-story-trail-src";
const STORY_ACTIVE_SRC_ID = "cgr-trip-story-active-src";
const STORY_TRAIL_LAYER_ID = "cgr-trip-story-trail-layer";
const STORY_ACTIVE_LAYER_ID = "cgr-trip-story-active-layer";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

// Hard zoom floor so camera NEVER zooms out to India / Australia!
const MIN_TRIP_CAMERA_ZOOM = 5.1;
const TRIP_MAP_SETTLE_DELAY_MS = 1000;
const TRIP_VIEW_MODE_STORAGE_KEY = "nondii:trip-view-mode:v1";
const EMPTY_SAVED_PIN_SET = new Set<string>();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function sliceArcCoords(
  coords: Array<[number, number]>,
  progress: number
): { sliced: Array<[number, number]>; head: [number, number] } {
  if (coords.length < 2) {
    const pt = coords[0] ?? [100.5, 13.75];
    return { sliced: [pt, pt], head: pt };
  }
  const clamped = Math.max(0, Math.min(1, progress));
  const totalSegs = coords.length - 1;
  const exactPos = clamped * totalSegs;
  const segIdx = Math.min(totalSegs - 1, Math.floor(exactPos));
  const localT = exactPos - segIdx;

  const p0 = coords[segIdx];
  const p1 = coords[segIdx + 1];
  const head: [number, number] = [
    p0[0] + (p1[0] - p0[0]) * localT,
    p0[1] + (p1[1] - p0[1]) * localT,
  ];

  const sliced = coords.slice(0, segIdx + 1);
  sliced.push(head);
  return { sliced, head };
}

function createRouteHeadDotElement(isDark: boolean): HTMLDivElement {
  const wrap = document.createElement("div");
  // NEVER set position: relative on outer MapLibre marker node!
  wrap.style.cssText =
    "display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:50;";
  const dot = document.createElement("span");
  dot.style.cssText = [
    "position:relative",
    "width:14px",
    "height:14px",
    "border-radius:9999px",
    `background:${isDark ? "#ffffff" : "#222222"}`,
    `border:2.5px solid ${isDark ? "#222222" : "#ffffff"}`,
    "box-shadow:0 0 0 5px rgba(34,34,34,0.16), 0 3px 10px rgba(0,0,0,0.28)",
  ].join(";");
  wrap.appendChild(dot);
  return wrap;
}

function createStoryLegDistanceMarkerElement(
  label: string,
  isDark: boolean
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:48;";
  const pill = document.createElement("span");
  pill.style.cssText = [
    "position:relative",
    "display:inline-flex",
    "align-items:center",
    "height:24px",
    "padding:0 10px",
    "border-radius:9999px",
    "font-size:11.5px",
    "font-weight:700",
    "white-space:nowrap",
    "font-variant-numeric:tabular-nums",
    `background:${isDark ? "#f5f5f5" : "#222222"}`,
    `color:${isDark ? "#222222" : "#ffffff"}`,
    "box-shadow:0 4px 14px rgba(0,0,0,0.22)",
  ].join(";");
  pill.textContent = label;
  wrap.appendChild(pill);
  return wrap;
}

/**
 * Trip Planner Stage — Faithful 30fps Motion Choreography on BOTH Mobile/Tablet AND Desktop:
 * 1. Flush-Bottom 85–90% Center Card on BOTH Mobile & Desktop (NEVER floats above bottom edge!).
 *    - Mobile/Tablet (< lg): 100% Full-Bleed Map right down to the 5-icon Bottom Menu.
 *    - Desktop (>= lg): Elevated Rounded Map Div Card (`rounded-[26px]`) raised above bottom edge,
 *      while bottom-anchored fanned cards partially overlap its lower edge (80%+ unobstructed map!).
 * 2. Center-Out Staggered Spring Entry Bounce on open (Center 0ms -> ±1 105ms -> ±2 210ms).
 * 3. Slide Choreography: Outermost newly entering card (`+2` / `-2`) waits ~110ms then slides up
 *    diagonally from beneath along its tilted rail with spring bounce overshoot!
 * 4. Card Tap: Sibling cards swiftly drop below bottom edge & active card hands off its exact
 *    DOMRect to `TripCardFlipModal` for Lift -> 90deg Spin -> Simultaneous Un-Flip + Morph Expand!
 */
export function TripMapPlannerView({
  board,
  entries,
  language,
  isDark,
  isOwner = true,
  ownerDisplayName = null,
  savedPinIds,
  modalOpenPinId,
  isCloningTrip = false,
  onBack,
  onDeleteTrip,
  onShareTrip,
  onCloneTrip,
  onSelectPinDetail,
  onRemovePin,
  onToggleSavePin,
  onReorderPins,
}: TripMapPlannerViewProps) {
  const isTh = language === "th";

  const [activeIdx, setActiveIdx] = useState(0);
  const [prevFocusIdx, setPrevFocusIdx] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1024);

  // Unified Explore-Grade White Bottom Dock Sheet State (100% Parity with /explore!)
  // - Fan Card (85%) <-> Horizontal Single-Row Card Strip mode switcher
  // - Permanent Collapse/Expand Airbnb Peek Bar + 1:1 Direct Touch Drag
  // - Map-Drag Smooth Tuck-Down + 1000ms Settle-to-Reveal
  const [deckViewMode, setDeckViewMode] = useState<"fan" | "list">("fan");
  const [isDeckHidden, setIsDeckHidden] = useState(false);
  const [isDeckReorderMode, setIsDeckReorderMode] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);
  const [isMapMoving, setIsMapMoving] = useState(false);

  const isDeckHiddenRef = useRef(isDeckHidden);
  isDeckHiddenRef.current = isDeckHidden;
  const isMapMovingRef = useRef(isMapMoving);
  isMapMovingRef.current = isMapMoving;
  const sheetSwipeStartYRef = useRef<number | null>(null);
  const sheetTouchSamplesRef = useRef<Array<{ y: number; t: number }>>([]);
  const sheetDragMovedRef = useRef(false);
  const isProgrammaticCameraRef = useRef(false);
  const userGestureActiveRef = useRef(false);
  const pendingUserGestureRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const onMapUserStartRef = useRef<(e: { originalEvent?: Event }) => void>(() => {});
  const onMapMoveStartRef = useRef<(e: { originalEvent?: Event }) => void>(() => {});
  const onMapMoveEndRef = useRef<() => void>(() => {});

  // Lock root viewport overscroll while on /trip/[tripId] so pulling cards down NEVER triggers pull-to-refresh or page bounce!
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

  // Restore preferred Fan <-> Horizontal Row mode across navigations
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.sessionStorage.getItem(TRIP_VIEW_MODE_STORAGE_KEY);
      if (stored === "fan" || stored === "list") {
        setDeckViewMode(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleToggleDeckViewMode = useCallback(() => {
    if (isDeckHiddenRef.current) {
      setIsDeckHidden(false);
      return;
    }
    setIsDeckReorderMode(false);
    setDeckViewMode((prev) => {
      const next = prev === "fan" ? "list" : "fan";
      try {
        window.sessionStorage.setItem(TRIP_VIEW_MODE_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const scheduleMapSettleReveal = useCallback(() => {
    clearSettleTimer();
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      pendingUserGestureRef.current = false;
      setIsMapMoving(false);
    }, TRIP_MAP_SETTLE_DELAY_MS);
  }, [clearSettleTimer]);

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
    clearSettleTimer();
    if (
      isProgrammaticCameraRef.current &&
      !userGestureActiveRef.current &&
      !pendingUserGestureRef.current
    ) {
      isProgrammaticCameraRef.current = false;
      setIsMapMoving(false);
      return;
    }
    userGestureActiveRef.current = false;
    scheduleMapSettleReveal();
  };

  // Highlight "Play" Trip Story Playback Mode
  const [isPlayingStory, setIsPlayingStory] = useState(false);

  const getExpandedSheetHeight = useCallback(
    () => (typeof window !== "undefined" && window.innerWidth >= 640 ? 358 : 314),
    []
  );
  const getCollapsedSheetHeight = useCallback(
    () => (typeof window !== "undefined" && window.innerWidth >= 1024 ? 74 : 76),
    []
  );

  // Single-Axis Native iOS Detent Physics (100% Parity with /explore!)
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
      if (isPlayingStory) return;
      setIsDraggingSheet(true);
      setSheetDragHeight(computeDraggedSheetHeight(rawDy, false));
    },
    [computeDraggedSheetHeight, isPlayingStory]
  );

  const handleSheetPullEnd = useCallback(
    (rawDy: number, vy: number) => {
      setIsDraggingSheet(false);
      setSheetDragHeight(null);
      if (!isPlayingStory && (rawDy >= 48 || (rawDy >= 18 && vy > 0.3))) {
        setIsDeckReorderMode(false);
        setIsDeckHidden(true);
      }
    },
    [isPlayingStory]
  );

  const handleSheetHeaderTouchStart = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      if (isPlayingStory && !isDeckHiddenRef.current) return;
      const y = e.touches[0]?.clientY;
      if (y === undefined) return;
      sheetSwipeStartYRef.current = y;
      sheetTouchSamplesRef.current = [{ y, t: performance.now() }];
      sheetDragMovedRef.current = false;
    },
    [isPlayingStory]
  );

  const handleSheetHeaderTouchMove = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      if (isPlayingStory && !isDeckHiddenRef.current) return;
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
    [computeDraggedSheetHeight, isPlayingStory]
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
      } else if (!isPlayingStory) {
        if (rawDy >= 44 || (rawDy >= 16 && vy > 0.28)) {
          setIsDeckReorderMode(false);
          setIsDeckHidden(true);
        }
      }
    },
    [isPlayingStory]
  );

  const handleSheetHeaderTouchCancel = useCallback(() => {
    sheetSwipeStartYRef.current = null;
    sheetTouchSamplesRef.current = [];
    setIsDraggingSheet(false);
    setSheetDragHeight(null);
  }, []);
  const [isStoryMuted, setIsStoryMuted] = useState(false);
  const [storyStatusText, setStoryStatusText] = useState<string | null>(null);
  const storyBannerPresence = useModalPresence(
    Boolean(isPlayingStory && storyStatusText),
    220
  );
  const audioPlayerRef = useRef<TripAmbientAudioPlayer | null>(null);
  const storyCancelRef = useRef<{ cancelled: boolean; rafId: number | null }>({
    cancelled: true,
    rafId: null,
  });
  const storyHeadMarkerRef = useRef<maplibregl.Marker | null>(null);
  const storyLegBadgeRef = useRef<maplibregl.Marker | null>(null);

  // Optional "$0" Nearby Spots overlay around active stay
  const [showNearbySpots, setShowNearbySpots] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [selectedNearbyPlace, setSelectedNearbyPlace] =
    useState<NearbyPlaceItem | null>(null);
  const nearbyCacheRef = useRef<Map<string, NearbyPlaceItem[]>>(new Map());
  const lastSelectedNearbyRef = useRef<NearbyPlaceItem | null>(null);
  if (selectedNearbyPlace) {
    lastSelectedNearbyRef.current = selectedNearbyPlace;
  }
  const {
    shouldRender: shouldRenderNearbyCard,
    dataState: nearbyCardDataState,
  } = useModalPresence(Boolean(selectedNearbyPlace && showNearbySpots), 240);

  // MapLibre refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hasFittedInitialRef = useRef<string | null>(null);
  const lastCameraStopRef = useRef<{
    boardPinId: string;
    pairKey?: string;
    lat: number;
    lng: number;
  } | null>(null);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== "undefined") {
        setViewportWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth, { passive: true });
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Clamp activeIdx safely if items change
  useEffect(() => {
    if (entries.length === 0) {
      setActiveIdx(0);
    } else if (activeIdx >= entries.length) {
      setActiveIdx(entries.length - 1);
    }
  }, [activeIdx, entries.length]);

  // Resolve coordinates for every saved stop
  const stops = useMemo<ResolvedTripStop[]>(() => {
    const approxCounters = new Map<string, number>();
    return entries.map((entry, idx) => {
      const hasExact =
        typeof entry.pin.hotelLatitude === "number" &&
        typeof entry.pin.hotelLongitude === "number" &&
        Number.isFinite(entry.pin.hotelLatitude) &&
        Number.isFinite(entry.pin.hotelLongitude);

      if (hasExact) {
        return {
          entry,
          index: idx,
          stopNumber: idx + 1,
          lat: entry.pin.hotelLatitude!,
          lng: entry.pin.hotelLongitude!,
          isApproximateCoord: false,
        };
      }

      const base = getProvinceCenter(entry.pin.provinceId);
      const seenCount = approxCounters.get(entry.pin.provinceId) ?? 0;
      approxCounters.set(entry.pin.provinceId, seenCount + 1);
      const pt =
        seenCount === 0
          ? base
          : offsetCoordinateByKm(
              base.lat,
              base.lng,
              1.2 + seenCount * 0.6,
              seenCount * 75
            );

      return {
        entry,
        index: idx,
        stopNumber: idx + 1,
        lat: pt.lat,
        lng: pt.lng,
        isApproximateCoord: true,
      };
    });
  }, [entries]);

  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const activeStop = stops[activeIdx] ?? null;

  const deckItems = useMemo<FannedDeckCardItem[]>(
    () =>
      stops.map((s) => ({
        key: s.entry.boardPinId,
        pin: s.entry.pin,
        stopNumber: s.stopNumber,
      })),
    [stops]
  );

  const tripDeals = useMemo<PinFeedItemDto[]>(
    () => stops.map((s) => s.entry.pin),
    [stops]
  );

  // Balanced upper-zone padding (100% synced with Explore's White Bottom Dock Sheet heights!)
  const getMapCameraPadding = useCallback(() => {
    const containerH = mapContainerRef.current?.clientHeight ?? 540;
    if (viewportWidth >= 1024) {
      return {
        top: 84,
        right: 96,
        bottom: isDeckHiddenRef.current
          ? 56
          : Math.min(Math.round(containerH * 0.49), 296),
        left: 96,
      };
    }
    const isTablet = viewportWidth >= 640;
    const mobileBottom = isDeckHiddenRef.current
      ? 92
      : Math.min(Math.round(containerH * 0.54), isTablet ? 370 : 326);
    return {
      top: 84,
      right: isTablet ? 64 : 44,
      bottom: mobileBottom,
      left: isTablet ? 64 : 44,
    };
  }, [viewportWidth]);

  /**
   * Smooth linear camera glide via `cameraForBounds` + `easeTo` (zoom floor >= 5.1, NEVER double-padded!).
   * Note: MapLibre's `cameraForBounds(bounds, { padding })` already bakes the padding offset into `cam.center`,
   * so we reset `easeTo` padding to 0 (matching MapLibre's internal `_fitInternal`).
   */
  const easeMapToBounds = useCallback(
    (
      bounds: maplibregl.LngLatBounds,
      options?: { maxZoom?: number; duration?: number }
    ) => {
      const map = mapRef.current;
      if (!map) return;
      const padding = getMapCameraPadding();
      const maxZoom = options?.maxZoom ?? 15.8;
      const duration = options?.duration ?? 780;
      userGestureActiveRef.current = false;
      isProgrammaticCameraRef.current = true;

      const cam = map.cameraForBounds(bounds, { padding, maxZoom });
      if (cam && cam.center && typeof cam.zoom === "number") {
        const clampedZoom = Math.max(
          MIN_TRIP_CAMERA_ZOOM,
          Math.min(maxZoom, cam.zoom)
        );
        map.easeTo({
          center: cam.center,
          zoom: clampedZoom,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          duration,
          easing: easeOutCubic,
          essential: true,
        });
      } else {
        map.fitBounds(bounds, {
          padding,
          maxZoom,
          linear: true,
          duration,
          essential: true,
        });
      }
    },
    [getMapCameraPadding]
  );

  // Clear Play Story animated layers & markers
  const clearStoryVisuals = useCallback(() => {
    const map = mapRef.current;
    if (storyHeadMarkerRef.current) {
      storyHeadMarkerRef.current.remove();
      storyHeadMarkerRef.current = null;
    }
    if (storyLegBadgeRef.current) {
      storyLegBadgeRef.current.remove();
      storyLegBadgeRef.current = null;
    }
    if (map) {
      const trailSrc = map.getSource(STORY_TRAIL_SRC_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      trailSrc?.setData(EMPTY_FEATURE_COLLECTION);
      const activeSrc = map.getSource(STORY_ACTIVE_SRC_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      activeSrc?.setData(EMPTY_FEATURE_COLLECTION);
    }
  }, []);

  const stopStoryPlayback = useCallback(
    (clearVisuals = true) => {
      storyCancelRef.current.cancelled = true;
      if (storyCancelRef.current.rafId !== null) {
        cancelAnimationFrame(storyCancelRef.current.rafId);
        storyCancelRef.current.rafId = null;
      }
      audioPlayerRef.current?.stop();
      setIsPlayingStory(false);
      setStoryStatusText(null);
      if (clearVisuals) {
        clearStoryVisuals();
      }
    },
    [clearStoryVisuals]
  );

  useEffect(() => {
    return () => {
      storyCancelRef.current.cancelled = true;
      if (storyCancelRef.current.rafId !== null) {
        cancelAnimationFrame(storyCancelRef.current.rafId);
      }
      audioPlayerRef.current?.dispose();
      audioPlayerRef.current = null;
    };
  }, []);

  const fitAllStopsOnMap = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      const currentStops = stopsRef.current;
      if (!map || currentStops.length === 0) return;
      const padding = getMapCameraPadding();

      if (currentStops.length === 1) {
        userGestureActiveRef.current = false;
        isProgrammaticCameraRef.current = true;
        map.easeTo({
          center: [currentStops[0].lng, currentStops[0].lat],
          zoom: 12.6,
          padding,
          duration: animate ? 720 : 0,
          easing: easeOutCubic,
          essential: true,
        });
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const s of currentStops) {
        bounds.extend([s.lng, s.lat]);
      }
      easeMapToBounds(bounds, {
        maxZoom: 13.4,
        duration: animate ? 820 : 0,
      });
    },
    [easeMapToBounds, getMapCameraPadding]
  );

  // Switch active stop cleanly (FannedPhotoCardDeck automatically plays outer-card bottom-up bounce!)
  const selectStopIndex = useCallback(
    (nextIndex: number) => {
      const prevIndex = activeIdxRef.current;
      const clamped = Math.max(
        0,
        Math.min(stopsRef.current.length - 1, nextIndex)
      );
      if (clamped === prevIndex) return;
      if (isPlayingStory) {
        stopStoryPlayback(true);
      }
      setPrevFocusIdx(prevIndex);
      setActiveIdx(clamped);
    },
    [isPlayingStory, stopStoryPlayback]
  );

  // Initialize MapLibre Vector Map ($0 cost)
  useEffect(() => {
    let cancelled = false;
    const container = mapContainerRef.current;
    if (!container) return;

    ensureMapLibreWorker();

    void (async () => {
      const style = await getAirbnbVectorMapStyle(isDark, {
        hideCommercialPois: true,
      });
      if (cancelled || !mapContainerRef.current) return;

      const initialCenter: [number, number] =
        stopsRef.current.length > 0
          ? [stopsRef.current[0].lng, stopsRef.current[0].lat]
          : THAILAND_DEFAULT_CENTER;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style,
        center: initialCenter,
        zoom: stopsRef.current.length > 0 ? 9.5 : THAILAND_DEFAULT_ZOOM,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        fadeDuration: 120,
        maxTileCacheSize: 64,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });

      configureThailandMapInteractions(map);
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        // 1. Subtle faint dotted preview arc from Active Center Card -> Next Card (Normal mode)
        if (!map.getSource(PREVIEW_NEXT_SRC_ID)) {
          map.addSource(PREVIEW_NEXT_SRC_ID, {
            type: "geojson",
            data: EMPTY_FEATURE_COLLECTION,
          });
          map.addLayer({
            id: PREVIEW_NEXT_LAYER_ID,
            type: "line",
            source: PREVIEW_NEXT_SRC_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": isDark ? "#e5e5e5" : "#222222",
              "line-width": 2.2,
              "line-opacity": 0.34,
              "line-dasharray": [1.8, 2.8],
            },
          });
        }

        // 2. Story Playback completed trail
        if (!map.getSource(STORY_TRAIL_SRC_ID)) {
          map.addSource(STORY_TRAIL_SRC_ID, {
            type: "geojson",
            data: EMPTY_FEATURE_COLLECTION,
          });
          map.addLayer({
            id: STORY_TRAIL_LAYER_ID,
            type: "line",
            source: STORY_TRAIL_SRC_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": isDark ? "#e5e5e5" : "#222222",
              "line-width": 2.4,
              "line-opacity": 0.34,
              "line-dasharray": [1.6, 2.6],
            },
          });
        }

        // 3. Story Playback actively drawing crisp flight-style curved dotted line!
        if (!map.getSource(STORY_ACTIVE_SRC_ID)) {
          map.addSource(STORY_ACTIVE_SRC_ID, {
            type: "geojson",
            data: EMPTY_FEATURE_COLLECTION,
          });
          map.addLayer({
            id: STORY_ACTIVE_LAYER_ID,
            type: "line",
            source: STORY_ACTIVE_SRC_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": isDark ? "#ffffff" : "#222222",
              "line-width": 3.2,
              "line-opacity": 0.94,
              "line-dasharray": [1.6, 2.4],
            },
          });
        }

        setMapReady(true);
      });

      map.on("click", () => {
        setSelectedNearbyPlace(null);
      });
      map.on("dragstart", (e) => onMapUserStartRef.current(e));
      map.on("zoomstart", (e) => onMapUserStartRef.current(e));
      map.on("movestart", (e) => onMapMoveStartRef.current(e));
      map.on("moveend", () => onMapMoveEndRef.current());
    })();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            mapRef.current?.resize();
          })
        : null;
    if (resizeObserver && container) {
      resizeObserver.observe(container);
    }

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      clearSettleTimer();
      setMapReady(false);
      stopMarkersRef.current.forEach((m) => m.remove());
      stopMarkersRef.current = [];
      nearbyMarkersRef.current.forEach((m) => m.remove());
      nearbyMarkersRef.current = [];
      storyHeadMarkerRef.current?.remove();
      storyHeadMarkerRef.current = null;
      storyLegBadgeRef.current?.remove();
      storyLegBadgeRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      hasFittedInitialRef.current = null;
      lastCameraStopRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Initial framing on trip open: tightly frame Stop 1 & Stop 2 so distance & dotted arc are clear
  useEffect(() => {
    if (!mapReady || stops.length === 0) return;
    if (hasFittedInitialRef.current !== board.id) {
      hasFittedInitialRef.current = board.id;
      const first = stops[0];
      const second = stops[1] ?? null;
      lastCameraStopRef.current = {
        boardPinId: first.entry.boardPinId,
        pairKey: `${first.entry.boardPinId}::${second?.entry.boardPinId ?? "end"}`,
        lat: first.lat,
        lng: first.lng,
      };
      if (second) {
        const dist = haversineDistanceKm(
          first.lat,
          first.lng,
          second.lat,
          second.lng
        );
        if (dist >= 0.05) {
          const b = new maplibregl.LngLatBounds();
          b.extend([first.lng, first.lat]);
          b.extend([second.lng, second.lat]);
          easeMapToBounds(b, { maxZoom: 15.8, duration: 0 });
          return;
        }
      }
      fitAllStopsOnMap(false);
    }
  }, [board.id, easeMapToBounds, fitAllStopsOnMap, mapReady, stops]);

  // Normal Mode: Draw ONLY ONE subtle faint curved dotted line from Active Center Card -> Next Card
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const previewSrc = map.getSource(PREVIEW_NEXT_SRC_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!previewSrc) return;

    if (isPlayingStory || !activeStop) {
      previewSrc.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    const nextStop = stops[activeIdx + 1] ?? null;
    if (!nextStop) {
      previewSrc.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    const distKm = haversineDistanceKm(
      activeStop.lat,
      activeStop.lng,
      nextStop.lat,
      nextStop.lng
    );
    if (distKm < 0.04) {
      previewSrc.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    const arc = buildCurvedArcGeoJson(
      activeStop.lng,
      activeStop.lat,
      nextStop.lng,
      nextStop.lat,
      44
    );
    previewSrc.setData({
      type: "FeatureCollection",
      features: [arc],
    });
  }, [activeIdx, activeStop, isPlayingStory, mapReady, stops]);

  // Smooth Linear 2-Point Camera Zoom/Pan when switching cards — tightly frames ONLY activeStop + nextStop!
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !activeStop || isPlayingStory) return;

    const nextStop = stops[activeIdx + 1] ?? null;
    const currentPairKey = `${activeStop.entry.boardPinId}::${
      nextStop?.entry.boardPinId ?? "end"
    }`;

    const prev = lastCameraStopRef.current;
    if (!prev) {
      lastCameraStopRef.current = {
        boardPinId: activeStop.entry.boardPinId,
        pairKey: currentPairKey,
        lat: activeStop.lat,
        lng: activeStop.lng,
      };
      return;
    }

    if (
      prev.pairKey === currentPairKey &&
      prev.boardPinId === activeStop.entry.boardPinId
    ) {
      return;
    }

    if (nextStop) {
      const distKm = haversineDistanceKm(
        activeStop.lat,
        activeStop.lng,
        nextStop.lat,
        nextStop.lng
      );
      if (distKm >= 0.05) {
        const pairBounds = new maplibregl.LngLatBounds();
        pairBounds.extend([activeStop.lng, activeStop.lat]);
        pairBounds.extend([nextStop.lng, nextStop.lat]);
        easeMapToBounds(pairBounds, { maxZoom: 15.8, duration: 760 });
      } else {
        const pad = getMapCameraPadding();
        userGestureActiveRef.current = false;
        isProgrammaticCameraRef.current = true;
        map.easeTo({
          center: [activeStop.lng, activeStop.lat],
          zoom: 15.2,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          offset: [0, -Math.round((pad.bottom - pad.top) * 0.5)],
          duration: 720,
          easing: easeOutCubic,
          essential: true,
        });
      }
    } else {
      // Final stop in the trip (no next card) -> zoom cleanly onto the active stay
      const pad = getMapCameraPadding();
      userGestureActiveRef.current = false;
      isProgrammaticCameraRef.current = true;
      map.easeTo({
        center: [activeStop.lng, activeStop.lat],
        zoom: 14.8,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        offset: [0, -Math.round((pad.bottom - pad.top) * 0.5)],
        duration: 720,
        easing: easeOutCubic,
        essential: true,
      });
    }

    lastCameraStopRef.current = {
      boardPinId: activeStop.entry.boardPinId,
      pairKey: currentPairKey,
      lat: activeStop.lat,
      lng: activeStop.lng,
    };
  }, [
    activeIdx,
    activeStop,
    easeMapToBounds,
    getMapCameraPadding,
    isPlayingStory,
    mapReady,
    stops,
  ]);

  // Sync crisp numbered price-pill stop markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    for (const stop of stops) {
      const isSelected = stop.index === activeIdx;
      const isNextPaired = !isPlayingStory && stop.index === activeIdx + 1;
      const isPrevPaired = isPlayingStory && stop.index === prevFocusIdx;
      const dealPrice =
        stop.entry.pin.promoDealPriceThb ?? stop.entry.pin.nightlyPriceThb;
      const labelMain = dealPrice
        ? `฿${dealPrice.toLocaleString()}`
        : (isTh ? stop.entry.pin.hotelNameTh : stop.entry.pin.hotelNameEn).slice(
            0,
            12
          );

      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = `${stop.stopNumber}. ${
        isTh ? stop.entry.pin.hotelNameTh : stop.entry.pin.hotelNameEn
      }`;
      btn.setAttribute(
        "aria-label",
        `${stop.stopNumber}. ${stop.entry.pin.hotelNameTh}`
      );
      btn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;padding:0;margin:0;cursor:pointer;user-select:none;z-index:${
        isSelected ? 40 : isNextPaired || isPrevPaired ? 32 : 20
      };`;

      const pill = document.createElement("span");
      pill.style.cssText = [
        "position:relative",
        "display:inline-flex",
        "align-items:center",
        "gap:6px",
        isSelected
          ? "height:34px;padding:0 11px 0 5px;"
          : "height:30px;padding:0 9px 0 4px;",
        "border-radius:9999px",
        `background:${
          isSelected
            ? isDark
              ? "#f5f5f5"
              : "#222222"
            : isDark
            ? "#262626"
            : "#ffffff"
        }`,
        `color:${
          isSelected
            ? isDark
              ? "#222222"
              : "#ffffff"
            : isDark
            ? "#f5f5f5"
            : "#222222"
        }`,
        `border:${
          isSelected
            ? isDark
              ? "2px solid #222222"
              : "2px solid #ffffff"
            : isNextPaired || isPrevPaired
            ? isDark
              ? "1.5px solid #d4d4d4"
              : "1.5px solid #222222"
            : isDark
            ? "1px solid rgba(255,255,255,0.16)"
            : "1px solid rgba(0,0,0,0.08)"
        }`,
        `box-shadow:${
          isSelected
            ? "0 6px 18px rgba(0,0,0,0.28)"
            : "0 3px 10px rgba(0,0,0,0.16)"
        }`,
        "font-size:12.5px",
        "font-weight:700",
        "white-space:nowrap",
        "font-variant-numeric:tabular-nums",
        "transition:background-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
      ].join(";");

      const catMeta = getPlaceCategoryMeta(stop.entry.pin.placeCategory);
      const numBadge = document.createElement("span");
      numBadge.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "gap:2px",
        isSelected ? "height:22px;padding:0 6px;" : "height:20px;padding:0 5px;",
        "border-radius:9999px",
        "font-size:10.5px",
        "font-weight:700",
        `background:${catMeta.crestBgHex}`,
        "color:#ffffff",
      ].join(";");
      numBadge.innerHTML = `${getPlaceCategoryMapSvg(catMeta.id, 11)}<span>${stop.stopNumber}</span>`;

      const textSpan = document.createElement("span");
      textSpan.textContent = labelMain;

      pill.appendChild(numBadge);
      pill.appendChild(textSpan);
      btn.appendChild(pill);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedNearbyPlace(null);
        selectStopIndex(stop.index);
      });

      const marker = new maplibregl.Marker({
        element: btn,
        anchor: "center",
      })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      stopMarkersRef.current.push(marker);
    }
  }, [
    activeIdx,
    isDark,
    isPlayingStory,
    isTh,
    mapReady,
    prevFocusIdx,
    selectStopIndex,
    stops,
  ]);

  // =========================================================================
  // SIGNATURE HIGHLIGHT: CINEMATIC "PLAY" TRIP STORY MODE
  // =========================================================================
  const startStoryPlayback = useCallback(async () => {
    const map = mapRef.current;
    const currentStops = stopsRef.current;
    if (!map || !mapReady || currentStops.length === 0) return;

    setSelectedNearbyPlace(null);
    setIsDeckHidden(false);
    setDeckViewMode("fan");
    setIsDeckReorderMode(false);
    setIsMapMoving(false);
    clearStoryVisuals();

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new TripAmbientAudioPlayer();
    }
    audioPlayerRef.current.start(isStoryMuted);

    const token = { cancelled: false, rafId: null as number | null };
    storyCancelRef.current = token;
    setIsPlayingStory(true);

    const waitMs = (ms: number) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const tick = (now: number) => {
          if (token.cancelled || now - start >= ms) {
            resolve();
            return;
          }
          token.rafId = requestAnimationFrame(tick);
        };
        token.rafId = requestAnimationFrame(tick);
      });

    const animateArc = (
      coords: Array<[number, number]>,
      durationMs: number
    ) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const headEl = createRouteHeadDotElement(isDark);
        const headMarker = new maplibregl.Marker({
          element: headEl,
          anchor: "center",
        })
          .setLngLat(coords[0])
          .addTo(map);
        storyHeadMarkerRef.current?.remove();
        storyHeadMarkerRef.current = headMarker;

        const tick = (now: number) => {
          if (token.cancelled) {
            resolve();
            return;
          }
          const rawT = Math.min(1, (now - start) / durationMs);
          const eased = easeOutCubic(rawT);
          const { sliced, head } = sliceArcCoords(coords, eased);

          const activeSrc = map.getSource(STORY_ACTIVE_SRC_ID) as
            | maplibregl.GeoJSONSource
            | undefined;
          activeSrc?.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: sliced },
              },
            ],
          });
          headMarker.setLngLat(head);

          if (rawT < 1) {
            token.rafId = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        token.rafId = requestAnimationFrame(tick);
      });

    const completedTrailFeatures: Array<ReturnType<typeof buildCurvedArcGeoJson>> =
      [];
    const padding = getMapCameraPadding();

    const first = currentStops[0];
    setPrevFocusIdx(null);
    setActiveIdx(0);
    lastCameraStopRef.current = {
      boardPinId: first.entry.boardPinId,
      lat: first.lat,
      lng: first.lng,
    };
    setStoryStatusText(
      isTh
        ? `จุดที่ 1/${currentStops.length} · ${first.entry.pin.hotelNameTh}`
        : `Stop 1/${currentStops.length} · ${first.entry.pin.hotelNameEn}`
    );

    userGestureActiveRef.current = false;
    isProgrammaticCameraRef.current = true;
    map.easeTo({
      center: [first.lng, first.lat],
      zoom: 11.4,
      padding,
      duration: 950,
      easing: easeOutCubic,
      essential: true,
    });
    await waitMs(1500);
    if (token.cancelled) return;

    for (let i = 1; i < currentStops.length; i++) {
      if (token.cancelled) return;
      const fromStop = currentStops[i - 1];
      const toStop = currentStops[i];

      const straightKm = haversineDistanceKm(
        fromStop.lat,
        fromStop.lng,
        toStop.lat,
        toStop.lng
      );
      const { roadKm } = estimateRoadDistanceAndTime(straightKm);
      const distLabel =
        straightKm < 0.04
          ? isTh
            ? "ที่พักเดียวกัน"
            : "Same stay"
          : formatDistanceLabel(roadKm, language);

      setPrevFocusIdx(i - 1);
      setStoryStatusText(
        isTh
          ? `#${i} → #${i + 1} · ${toStop.entry.pin.hotelNameTh} (${distLabel})`
          : `#${i} → #${i + 1} · ${toStop.entry.pin.hotelNameEn} (${distLabel})`
      );

      if (straightKm >= 0.05) {
        const pairBounds = new maplibregl.LngLatBounds();
        pairBounds.extend([fromStop.lng, fromStop.lat]);
        pairBounds.extend([toStop.lng, toStop.lat]);
        easeMapToBounds(pairBounds, { maxZoom: 13.2, duration: 920 });
        await waitMs(860);
        if (token.cancelled) return;

        const fullArc = buildCurvedArcGeoJson(
          fromStop.lng,
          fromStop.lat,
          toStop.lng,
          toStop.lat,
          56
        );
        await animateArc(fullArc.geometry.coordinates, 1450);
        if (token.cancelled) return;

        const midPt =
          fullArc.geometry.coordinates[
            Math.floor(fullArc.geometry.coordinates.length / 2)
          ];
        storyLegBadgeRef.current?.remove();
        if (midPt) {
          storyLegBadgeRef.current = new maplibregl.Marker({
            element: createStoryLegDistanceMarkerElement(distLabel, isDark),
            anchor: "center",
          })
            .setLngLat(midPt)
            .addTo(map);
        }

        completedTrailFeatures.push(fullArc);
        const trailSrc = map.getSource(STORY_TRAIL_SRC_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        trailSrc?.setData({
          type: "FeatureCollection",
          features: completedTrailFeatures,
        });
      } else {
        userGestureActiveRef.current = false;
        isProgrammaticCameraRef.current = true;
        map.easeTo({
          center: [toStop.lng, toStop.lat],
          zoom: 12.6,
          padding,
          duration: 750,
          easing: easeOutCubic,
          essential: true,
        });
        await waitMs(820);
        if (token.cancelled) return;
      }

      // Advance fanned deck (FannedPhotoCardDeck automatically triggers outer rightmost card bounce!)
      setActiveIdx(i);
      lastCameraStopRef.current = {
        boardPinId: toStop.entry.boardPinId,
        lat: toStop.lat,
        lng: toStop.lng,
      };
      await waitMs(1750);
      if (token.cancelled) return;
    }

    if (currentStops.length > 1) {
      storyHeadMarkerRef.current?.remove();
      storyHeadMarkerRef.current = null;
      storyLegBadgeRef.current?.remove();
      storyLegBadgeRef.current = null;
      const activeSrc = map.getSource(STORY_ACTIVE_SRC_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      activeSrc?.setData(EMPTY_FEATURE_COLLECTION);

      setStoryStatusText(
        isTh
          ? `${board.name} · ครบทั้ง ${currentStops.length} จุดหมาย`
          : `${board.name} · All ${currentStops.length} stops`
      );
      fitAllStopsOnMap(true);
      await waitMs(2300);
    }

    if (!token.cancelled) {
      stopStoryPlayback(true);
    }
  }, [
    board.name,
    clearStoryVisuals,
    easeMapToBounds,
    fitAllStopsOnMap,
    getMapCameraPadding,
    isDark,
    isStoryMuted,
    isTh,
    language,
    mapReady,
    stopStoryPlayback,
  ]);

  const handleToggleMute = () => {
    setIsStoryMuted((prev) => {
      const next = !prev;
      audioPlayerRef.current?.setMuted(next);
      return next;
    });
  };

  // Optional "$0" Nearby Spots fetch
  useEffect(() => {
    if (!showNearbySpots || !activeStop) {
      setNearbyPlaces([]);
      setSelectedNearbyPlace(null);
      setIsLoadingNearby(false);
      return;
    }

    const cacheKey = `${activeStop.lat.toFixed(4)},${activeStop.lng.toFixed(4)}`;
    const cached = nearbyCacheRef.current.get(cacheKey);
    if (cached) {
      setNearbyPlaces(cached);
      setSelectedNearbyPlace(null);
      setIsLoadingNearby(false);
      return;
    }

    let cancelled = false;
    setIsLoadingNearby(true);
    setSelectedNearbyPlace(null);

    void fetch(
      `/api/places/recommended?lat=${encodeURIComponent(
        activeStop.lat.toFixed(6)
      )}&lng=${encodeURIComponent(activeStop.lng.toFixed(6))}&limit=8`,
      { cache: "no-store" }
    )
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((data: { places?: NearbyPlaceItem[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.places) ? data.places : [];
        nearbyCacheRef.current.set(cacheKey, list);
        setNearbyPlaces(list);
      })
      .catch(() => {
        if (!cancelled) setNearbyPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNearby(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeStop, showNearbySpots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    nearbyMarkersRef.current.forEach((m) => m.remove());
    nearbyMarkersRef.current = [];

    if (!showNearbySpots || nearbyPlaces.length === 0) return;

    for (const place of nearbyPlaces) {
      const isSelected = selectedNearbyPlace?.id === place.id;
      const el = createCategoryPinElement({
        place,
        isSelected,
        isHovered: false,
        language,
        isDark,
        showLabel: isSelected,
        anchorMode: "maplibre",
        onClick: () => {
          setSelectedNearbyPlace((prev) =>
            prev?.id === place.id ? null : place
          );
        },
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
      nearbyMarkersRef.current.push(marker);
    }
  }, [
    isDark,
    language,
    mapReady,
    nearbyPlaces,
    selectedNearbyPlace?.id,
    showNearbySpots,
  ]);

  // Swap active stop earlier/later in route sequence (persists to Neon DB!)
  const handleSwapActiveStop = useCallback(
    async (delta: -1 | 1) => {
      if (!isOwner) return;
      const currIdx = activeIdxRef.current;
      const currEntries = entriesRef.current;
      const targetIdx = currIdx + delta;
      if (targetIdx < 0 || targetIdx >= currEntries.length) return;

      const nextEntries = [...currEntries];
      const [moved] = nextEntries.splice(currIdx, 1);
      nextEntries.splice(targetIdx, 0, moved);
      setActiveIdx(targetIdx);
      await onReorderPins(nextEntries.map((it) => it.pin.id));
    },
    [isOwner, onReorderPins]
  );

  const displayNearbyPlace = selectedNearbyPlace ?? lastSelectedNearbyRef.current;

  return (
    /* =======================================================================
       UNIFIED VIEWPORT-LOCKED STAGE ON BOTH MOBILE & DESKTOP (100% /explore PARITY!):
       - Static Map Stage Height (ZERO MapLibre canvas resize or WebGL flicker on hide/show!)
       - Desktop (>= lg): Elevated Rounded Map Card (`lg:pb-[74px]`) + Persistent Airbnb White Bottom Dock Sheet
       - Mobile/Tablet (< lg): 100% Full-Bleed Map right down to 5-icon Bottom Menu
    ======================================================================== */
    <div className="cgr-trip-stage-enter fixed inset-x-0 top-0 bottom-[var(--cgr-mobile-nav-h)] lg:left-[72px] lg:top-16 lg:bottom-0 z-20 overflow-clip overscroll-none bg-[var(--color-background-body)] lg:px-8 lg:pt-4 lg:pb-[74px] select-none">
      {/* =====================================================================
          MAP CONTAINER:
          - Mobile/Tablet (< lg): 100% Full-Bleed edge-to-edge
          - Desktop (>= lg): Elevated Centered Rounded Div Card (`rounded-[26px] border`)
      ====================================================================== */}
      <div className="relative w-full h-full lg:max-w-[1220px] lg:mx-auto lg:rounded-[26px] overflow-hidden lg:border lg:border-[var(--color-border)] bg-[var(--color-background-muted)]">
        {/* 1. ISOLATED MAPLIBRE VECTOR MAP LAYER (`z-0 isolate`) */}
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
                  scheduleMapSettleReveal();
                }
              };
              window.addEventListener("pointerup", resume, { once: true });
              window.addEventListener("pointercancel", resume, {
                once: true,
              });
            }
          }}
          className="absolute inset-0 z-0 isolate w-full h-full touch-none [transform:translateZ(0)]"
          aria-label={
            isTh
              ? `แผนที่เส้นทางทริป ${board.name}`
              : `Trip map for ${board.name}`
          }
        />

        {/* 2. TOP-LEFT FLOATING HEADER PILL */}
        <div className="absolute top-[max(12px,env(safe-area-inset-top))] left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2 max-w-[calc(100%-192px)] sm:max-w-[360px]">
          <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-[14px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] min-w-0">
            <button
              type="button"
              onClick={() => {
                stopStoryPlayback(true);
                onBack();
              }}
              aria-label={isTh ? "กลับไปหน้ารวมทริป" : "Back to trips"}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
            </button>

            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[15.5px] font-semibold text-[var(--color-text-primary)] leading-tight truncate">
                {board.name}
              </h1>
              <p className="text-[11px] sm:text-[12px] text-[var(--color-text-secondary)] leading-tight truncate tabular-nums">
                {!isOwner && ownerDisplayName
                  ? isTh
                    ? `โดย ${ownerDisplayName} · ${entries.length} ที่พัก`
                    : `By ${ownerDisplayName} · ${entries.length} ${
                        entries.length === 1 ? "stay" : "stays"
                      }`
                  : isTh
                  ? `${entries.length} ที่พักในทริป`
                  : `${entries.length} ${
                      entries.length === 1 ? "stay" : "stays"
                    }`}
              </p>
            </div>
          </div>
        </div>

        {/* 3. TOP-RIGHT FLOATING CONTROLS (PLAY + Mute + Nearby + Fit + Delete + Zoom) */}
        <div className="absolute top-[max(12px,env(safe-area-inset-top))] right-3 sm:top-4 sm:right-4 z-30 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            {entries.length >= 1 && (
              <button
                type="button"
                onClick={() => {
                  if (isPlayingStory) {
                    stopStoryPlayback(true);
                  } else {
                    void startStoryPlayback();
                  }
                }}
                aria-pressed={isPlayingStory}
                title={
                  isPlayingStory
                    ? isTh
                      ? "หยุดเล่นเรื่องราวทริป"
                      : "Stop trip playback"
                    : isTh
                    ? "เล่นเรื่องราวทริปพร้อมเสียงดนตรีและเส้นทาง"
                    : "Play trip story with ambient music"
                }
                className="h-10 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] shadow-[var(--shadow-popover)] text-[12.5px] sm:text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isPlayingStory ? (
                  <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                )}
                <span>{isPlayingStory ? (isTh ? "หยุด" : "Stop") : "Play"}</span>
              </button>
            )}

            {isPlayingStory && (
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isStoryMuted ? "Unmute music" : "Mute music"}
                title={
                  isStoryMuted
                    ? isTh
                      ? "เปิดเสียงเพลง"
                      : "Unmute"
                    : isTh
                    ? "ปิดเสียงเพลง"
                    : "Mute"
                }
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                {isStoryMuted ? (
                  <VolumeX className="w-4 h-4" strokeWidth={2.1} />
                ) : (
                  <Volume2 className="w-4 h-4" strokeWidth={2.1} />
                )}
              </button>
            )}

            {entries.length > 0 && !isPlayingStory && (
              <button
                type="button"
                onClick={() => setShowNearbySpots((prev) => !prev)}
                aria-pressed={showNearbySpots}
                title={
                  isTh
                    ? "แสดงที่เที่ยว คาเฟ่ และร้านอาหารใกล้จุดที่เลือก"
                    : "Show nearby attractions, cafes & dining"
                }
                className={`h-10 px-3 sm:px-3.5 rounded-full border shadow-[var(--shadow-popover)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showNearbySpots
                    ? "bg-[var(--color-accent)] border-transparent !text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-popover)]/96 backdrop-blur-md border-black/[0.06] dark:border-white/[0.1] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
                }`}
              >
                {isLoadingNearby ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Compass className="w-4 h-4 shrink-0" strokeWidth={2.1} />
                )}
                <span className="hidden md:inline">
                  {isTh ? "ที่เที่ยวใกล้เคียง" : "Nearby"}
                </span>
              </button>
            )}

            {entries.length > 0 && !isPlayingStory && (
              <button
                type="button"
                onClick={() => {
                  setPrevFocusIdx(null);
                  fitAllStopsOnMap(true);
                }}
                aria-label={isTh ? "ดูทุกจุดในทริป" : "Fit all stops"}
                title={isTh ? "ดูทุกจุดในทริป" : "Fit all stops"}
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <LocateFixed className="w-4 h-4" strokeWidth={2.1} />
              </button>
            )}

            {!isPlayingStory && onShareTrip && (
              <button
                type="button"
                onClick={onShareTrip}
                aria-label={isTh ? "แชร์ทริปนี้" : "Share this trip"}
                title={isTh ? "แชร์ลิงก์ทริปนี้" : "Share trip link"}
                className="h-10 px-2.5 sm:px-3 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4 shrink-0" strokeWidth={2.1} />
                <span className="hidden lg:inline">
                  {isTh ? "แชร์ทริป" : "Share"}
                </span>
              </button>
            )}

            {!isOwner && !isPlayingStory && onCloneTrip && (
              <button
                type="button"
                disabled={isCloningTrip}
                onClick={onCloneTrip}
                aria-label={isTh ? "คัดลอกทริปนี้เก็บไว้" : "Clone this trip"}
                title={isTh ? "คัดลอกทริปนี้เข้าบัญชีของคุณ" : "Copy this trip to your account"}
                className="h-10 px-2.5 sm:px-3 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] disabled:opacity-50 text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isCloningTrip ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <CopyPlus className="w-4 h-4 shrink-0" strokeWidth={2.1} />
                )}
                <span className="hidden md:inline">
                  {isTh ? "คัดลอกทริป" : "Save trip"}
                </span>
              </button>
            )}

            {isOwner && !isPlayingStory && (
              <button
                type="button"
                onClick={() => onDeleteTrip(board)}
                aria-label={isTh ? "ลบทริปนี้" : "Delete trip"}
                title={isTh ? "ลบทริปนี้" : "Delete trip"}
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {!isPlayingStory && (
            <div className="hidden sm:flex flex-col rounded-[12px] overflow-hidden bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)]">
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
                aria-label={isTh ? "ซูมเข้า" : "Zoom in"}
                className="h-9 w-9 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
                aria-label={isTh ? "ซูมออก" : "Zoom out"}
                className="h-9 w-9 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        {/* 4. STORY PLAYBACK LIVE CAPTION PILL */}
        {storyBannerPresence.shouldRender && storyStatusText && (
          <div
            data-state={storyBannerPresence.dataState}
            className="cgr-fade-slide-pill absolute top-[calc(max(12px,env(safe-area-inset-top))+56px)] sm:top-[68px] left-1/2 -translate-x-1/2 z-35 pointer-events-none max-w-[calc(100%-32px)]"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] bg-[#222222]/90 dark:bg-[#f5f5f5]/94 backdrop-blur-md !text-white dark:!text-[#222222] shadow-[var(--shadow-popover)] text-[12px] font-semibold truncate">
              <span className="h-2 w-2 rounded-full bg-[#e60023] animate-pulse shrink-0" />
              <span className="truncate">{storyStatusText}</span>
            </div>
          </div>
        )}

        {/* 5. OPTIONAL NEARBY PLACE MICRO-POPOVER */}
        {shouldRenderNearbyCard && displayNearbyPlace && !isPlayingStory && (
          <div
            data-state={nearbyCardDataState}
            className="cgr-floating-card-motion absolute top-[calc(max(12px,env(safe-area-inset-top))+56px)] left-3 right-3 sm:top-[72px] sm:left-4 sm:right-auto sm:w-[310px] z-35 pointer-events-auto"
          >
            <div className="rounded-[14px] bg-[var(--color-background-popover)]/98 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] p-3 flex items-center gap-3">
              <span
                style={{
                  backgroundColor:
                    resolveCategoryPinVisual(displayNearbyPlace).bgHex,
                }}
                className="h-9 w-9 rounded-full shrink-0 inline-flex items-center justify-center text-white"
                dangerouslySetInnerHTML={{
                  __html: resolveCategoryPinVisual(displayNearbyPlace).iconSvg,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">
                  {isTh
                    ? displayNearbyPlace.nameTh
                    : displayNearbyPlace.nameEn || displayNearbyPlace.nameTh}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate tabular-nums">
                  {isTh
                    ? `${displayNearbyPlace.subcategoryLabelTh} · ห่าง ${formatDistanceLabel(
                        displayNearbyPlace.distanceKm,
                        "th"
                      )}`
                    : `${displayNearbyPlace.subcategoryLabelEn} · ${formatDistanceLabel(
                        displayNearbyPlace.distanceKm,
                        "en"
                      )} away`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNearbyPlace(null)}
                aria-label={isTh ? "ปิด" : "Close"}
                className="h-7 w-7 rounded-[8px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 6. BOTTOM-RIGHT FAN DECK <-> HORIZONTAL ROW MODE TOGGLE (100% /explore PARITY!) */}
        {entries.length > 0 && !isPlayingStory && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              transitionProperty: "bottom",
              transitionDuration: "var(--duration-morph)",
              transitionTimingFunction: "var(--ease-ios-sheet)",
            }}
            className={`absolute right-3 sm:right-4 lg:right-4 z-30 flex flex-col items-end gap-2.5 ${
              isDeckHidden
                ? "bottom-[90px] sm:bottom-[90px] lg:bottom-5"
                : "bottom-[326px] sm:bottom-[370px] lg:bottom-[298px]"
            }`}
          >
            <button
              type="button"
              aria-pressed={!isDeckHidden && deckViewMode === "list"}
              onClick={handleToggleDeckViewMode}
              aria-label={
                isDeckHidden
                  ? isTh
                    ? "แสดงการ์ดสถานที่ในทริป"
                    : "Show trip cards"
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
                    ? `แสดงการ์ด (${entries.length})`
                    : `Show cards (${entries.length})`
                  : deckViewMode === "fan"
                  ? isTh
                    ? `แถวการ์ดแนวนอน (${entries.length})`
                    : `Card row (${entries.length})`
                  : isTh
                  ? "กลับไปดูแบบ Fan Card"
                  : "Fanned deck"
              }
              className="h-11 w-11 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              {deckViewMode === "fan" ? (
                <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={2.1} />
              ) : (
                <Layers className="w-[18px] h-[18px]" strokeWidth={2.1} />
              )}
            </button>
          </div>
        )}

        {/* 7. EMPTY TRIP FLOATING CARD */}
        {entries.length === 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto max-w-[360px] w-full rounded-[20px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] p-6 text-center space-y-3">
              <span className="h-11 w-11 rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? "ยังไม่มีคูปองหรือที่พักในทริปนี้"
                  : "No stays in this trip yet"}
              </h2>
              <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
                {isTh
                  ? "กลับไปหน้าแรกแล้วกดหัวใจบนการ์ดสถานที่ที่ถูกใจ เพื่อเก็บเข้า Wishlist และจัดทริปของคุณ"
                  : "Save places to your Wishlist from the home feed to map your trip and play your travel story."}
              </p>
              <Link
                href="/"
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13.5px] font-semibold inline-flex items-center justify-center transition-colors"
              >
                {isTh ? "สำรวจคูปองที่พัก" : "Explore stay deals"}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          8. PERSISTENT AIRBNB WHITE BOTTOM DOCK SHEET (100% /explore PARITY!)
             - 120fps GPU Fade Slide-In/Out on Map Drag + 420ms Continuous Morph + 1:1 Direct Touch Drag
             - Seamless Fan Card (85% visible + Move Reorder) <-> Horizontal Single-Row Card Strip!
      ====================================================================== */}
      {entries.length > 0 && activeStop && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 lg:px-[104px] flex justify-center">
          <div
            data-tucked={
              !isDeckHidden && isMapMoving && !modalOpenPinId && !isPlayingStory
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
            className={`cgr-explore-dock-sheet relative w-full lg:max-w-[1160px] flex flex-col ${
              isDeckReorderMode ? "overflow-visible" : "overflow-hidden"
            } bg-[var(--color-background-body)] ${
              isDeckHidden
                ? "h-[76px] lg:h-[74px] rounded-t-[26px] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] lg:rounded-none lg:border-0 lg:shadow-none"
                : "h-[314px] sm:h-[358px] lg:h-[358px] rounded-t-[26px] border-t lg:border-x border-[var(--color-border)] shadow-[var(--shadow-popover)]"
            }`}
          >
            {(() => {
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
              const isFullyCollapsedAtRest = isDeckHidden && !isDraggingSheet;

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
                      if (!isDeckHidden) {
                        if (isPlayingStory) return;
                        setIsDeckReorderMode(false);
                        setIsDeckHidden(true);
                      } else {
                        setIsDeckHidden(false);
                      }
                    }}
                    onTouchStart={handleSheetHeaderTouchStart}
                    onTouchMove={handleSheetHeaderTouchMove}
                    onTouchEnd={handleSheetHeaderTouchEnd}
                    onTouchCancel={handleSheetHeaderTouchCancel}
                    aria-expanded={!isDeckHidden}
                    aria-label={
                      isDeckHidden
                        ? isTh
                          ? `แสดง ${entries.length} สถานที่ในทริปนี้`
                          : `Show ${entries.length} places in this trip`
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

                  {/* 2. Live Crossfade Collapsed Peek Label */}
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
                        {isTh
                          ? `สถานที่ในทริปนี้ ${entries.length.toLocaleString()} แห่ง`
                          : `${entries.length.toLocaleString()} ${
                              entries.length === 1 ? "place" : "places"
                            } in this trip`}
                      </span>
                      <ChevronUp
                        className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0"
                        strokeWidth={2.2}
                      />
                    </span>
                  </div>

                  {/* 3. Persistent Rigid Expanded Deck Wrapper */}
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
                          activeIdx={activeIdx}
                          language={language}
                          mode="trip"
                          deckIdentityKey={board.id}
                          isMapMoving={isMapMoving && !isPlayingStory}
                          modalOpenPinId={modalOpenPinId}
                          isPlayingStory={isPlayingStory}
                          enableReorder={isOwner}
                          cardTopAction={isOwner ? "remove" : "bookmark"}
                          savedPinIds={savedPinIds}
                          centerVisibleRatio={0.85}
                          showMobileWhiteBackdrop={false}
                          captureMobileBackdropSwipe={true}
                          onSelectIndex={selectStopIndex}
                          onOpenCard={(pin, stopNum, _badgeText, originRect) =>
                            onSelectPinDetail(pin, stopNum, originRect)
                          }
                          onRemovePin={onRemovePin}
                          onToggleSavePin={onToggleSavePin}
                          onSwapActiveStop={handleSwapActiveStop}
                          onInterruptStory={() => stopStoryPlayback(true)}
                          onReorderModeChange={setIsDeckReorderMode}
                          onSheetPullMove={handleSheetPullMove}
                          onSheetPullEnd={handleSheetPullEnd}
                        />
                      </div>
                    ) : (
                      <ExploreHorizontalCardStrip
                        deals={tripDeals}
                        activeIdx={activeIdx}
                        language={language}
                        savedPinIds={savedPinIds ?? EMPTY_SAVED_PIN_SET}
                        onSelectPin={(pin, rect) => {
                          const idx = stops.findIndex(
                            (s) => s.entry.pin.id === pin.id
                          );
                          onSelectPinDetail(pin, idx >= 0 ? idx + 1 : 1, rect);
                        }}
                        onHoverIndex={(idx) => selectStopIndex(idx)}
                        onToggleSavePin={(pin) => {
                          if (isOwner) {
                            onRemovePin(pin.id);
                          } else {
                            onToggleSavePin?.(pin);
                          }
                        }}
                        onSheetPullMove={handleSheetPullMove}
                        onSheetPullEnd={handleSheetPullEnd}
                      />
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
