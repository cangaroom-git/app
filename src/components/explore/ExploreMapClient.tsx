"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Crosshair,
  Globe,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { STAY_STYLE_TABS } from "@/data/thailandProvinces";
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
  saveExploreCameraSnapshot,
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
import {
  getDealPromoOnlyHeadline,
  VerticalCouponCard,
} from "@/components/home/VerticalCouponCard";
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
  initialProvince?: string | null;
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
  initialProvince = null,
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
  const [recentOnly, setRecentOnly] = useState<boolean>(initialRecentOnly);
  const [recentPinIds, setRecentPinIds] =
    useState<string[]>(initialRecentPinIds);

  // Modal States: List Modal (Slide-Up on Mobile / Centered Modal on Desktop) & Unified Filter Modal
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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
  const [pinnedOutsideDealId, setPinnedOutsideDealId] = useState<string | null>(
    null
  );

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
  const syncMarkersLodRef = useRef<() => void>(() => {});
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isProgrammaticCameraRef = useRef(false);
  const userGestureActiveRef = useRef(false);
  const prevDeckSignatureRef = useRef<string>("");
  const skipNextDeckSignatureRef = useRef(false);
  const pendingRestoreDealIdRef = useRef<string | null>(null);
  const hasUserMovedMapRef = useRef(hasUserMovedMap);
  hasUserMovedMapRef.current = hasUserMovedMap;
  const [isMapReady, setIsMapReady] = useState(false);

  const listModalPresence = useModalPresence(isListModalOpen, 250);
  const filterModalPresence = useModalPresence(isFilterModalOpen, 250);
  const listDetailPresence = useModalPresence(
    Boolean(selectedPinId) && detailOpenSource === "list",
    240
  );
  useBodyScrollLock(
    filterModalPresence.shouldRender ||
      listModalPresence.shouldRender ||
      listDetailPresence.shouldRender
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

  // Escape key dismisses topmost modal cleanly (Filter -> List Detail -> List Modal)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (fullscreenMedia) return;
      if (isFilterModalOpen) {
        e.preventDefault();
        setIsFilterModalOpen(false);
      } else if (selectedPinId && detailOpenSource === "list") {
        e.preventDefault();
        clearLastClickedPinOrigin();
        setPinHistoryStack([]);
        setDetailRestoreScrollY(null);
        setSelectedPinId(null);
      } else if (isListModalOpen && !selectedPinId) {
        e.preventDefault();
        setIsListModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpenSource, fullscreenMedia, isFilterModalOpen, isListModalOpen, selectedPinId]);

  // Preload PinterestPinDetail chunk silently so tapping any card flips instantaneously!
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import("@/components/home/PinterestPinDetail");
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialQuery && !globalSearchQuery) {
      setGlobalSearchQuery(initialQuery);
    }
    // Pre-focus the previously clicked card at t=0ms on Back so the fan rises ONCE
    // with the exact card already dead-center (zero double-bounce!).
    if (!initialCenter) {
      const peek = peekExploreCameraSnapshot();
      if (peek) {
        skipNextDeckSignatureRef.current = true;
        pendingRestoreDealIdRef.current = peek.activeDealId;
        if (!peek.hasUserMovedMap && peek.activeDealId) {
          const idx = visibleDealsRef.current.findIndex(
            (d) => d.id === peek.activeDealId
          );
          if (idx >= 0) {
            setActiveIdx(idx);
            pendingRestoreDealIdRef.current = null;
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    globalSearchQuery,
  ]);

  // 2. Spatial bounds filtering (excluding bottom card-covered strip when open area has deals!)
  const visibleDeals = useMemo(() => {
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

  const isEmptyMapZone = visibleDeals.length === 0;
  const emptyZonePresence = useModalPresence(isEmptyMapZone, 240);

  const getMapCameraPadding = useCallback(() => {
    const containerH = mapContainerRef.current?.clientHeight ?? 540;
    const isDesktop =
      typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
    if (isDesktop) {
      return {
        top: 64,
        right: 92,
        bottom: Math.min(Math.round(containerH * 0.45), 252),
        left: 72,
      };
    }
    return {
      top: 72,
      right: 56,
      bottom: Math.min(Math.round(containerH * 0.46), 268),
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
      const padTop = isDesktop ? 44 : 48;
      const padBottom = Math.min(Math.round(h * 0.42), isDesktop ? 236 : 252);
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

  // Initialize MapLibre Vector Map ($0 OpenFreeMap style matching /trip!)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;
    let settleTimer: number | null = null;

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
        // Restore camera & active card silently with ZERO redundant 2nd fan bounce!
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

      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style,
        center: startCenter,
        zoom: startZoom,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
      configureThailandMapInteractions(mapInstance);
      mapRef.current = mapInstance;

      mapInstance.on("load", () => {
        if (cancelled || !mapInstance) return;
        setIsMapReady(true);
        if (restoredCam) {
          skipNextDeckSignatureRef.current = true;
        }
        setMapBounds(readEffectiveBounds(mapInstance));
        if (
          !restoredCam &&
          !initialCenter &&
          (initialProvince || initialStyle !== "all" || initialQuery)
        ) {
          fitMapToDeals(attributeFilteredDeals, false);
        }
      });

      const onUserStart = (e: { originalEvent?: Event }) => {
        if (e.originalEvent) {
          userGestureActiveRef.current = true;
          isProgrammaticCameraRef.current = false;
          setIsMapMoving(true);
        }
      };

      mapInstance.on("dragstart", onUserStart);
      mapInstance.on("zoomstart", onUserStart);
      mapInstance.on("zoom", () => {
        if (lodRafRef.current !== null) return;
        lodRafRef.current = window.requestAnimationFrame(() => {
          lodRafRef.current = null;
          syncMarkersLodRef.current();
        });
      });

      mapInstance.on("moveend", () => {
        syncMarkersLodRef.current();
        if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (lodRafRef.current !== null) {
        window.cancelAnimationFrame(lodRafRef.current);
        lodRafRef.current = null;
      }

        if (isProgrammaticCameraRef.current && !userGestureActiveRef.current) {
          isProgrammaticCameraRef.current = false;
          setIsMapMoving(false);
          return;
        }

        const wasUserGesture = userGestureActiveRef.current;
        userGestureActiveRef.current = false;

        // 240ms Settle-to-Shuffle debounce:
        // Cards stay tucked beneath bottom edge while moving, then rise smoothly in 1 continuous stroke!
        // Only swap/reload deals if the SET of visible stays actually changed!
        settleTimer = window.setTimeout(() => {
          if (!mapInstance) {
            setIsMapMoving(false);
            return;
          }
          if (wasUserGesture) {
            const nextBounds = readEffectiveBounds(mapInstance);
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
            setManualShuffleOrder(null);
            setPinnedOutsideDealId(null);
            setHasUserMovedMap(true);
            setMapBounds(nextBounds);
            setActiveIdx(getExploreSymmetricStartIdx(nextInArea.length));
            setShuffleKey((k) => k + 1);
          }
          setIsMapMoving(false);
        }, 240);
      });
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
      if (settleTimer !== null) window.clearTimeout(settleTimer);
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
    const bottomSafe = h - Math.min(Math.round(h * 0.42), isDesktop ? 225 : 264);
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

  // Reset to All Thailand / All Filtered Deals
  const handleResetMapArea = useCallback(() => {
    setHasUserMovedMap(false);
    setManualShuffleOrder(null);
    setPinnedOutsideDealId(null);
    setActiveIdx(getExploreSymmetricStartIdx(attributeFilteredDeals.length));
    fitMapToDeals(attributeFilteredDeals, true);
  }, [attributeFilteredDeals, fitMapToDeals]);

  const handleClearAllFilters = useCallback(() => {
    setPlaceCategoryFilter("ALL");
    setActiveStyle("all");
    setSourceFilter("ALL");
    setProvinceFilter(null);
    setRecentOnly(false);
    setGlobalSearchQuery("");
    setHasUserMovedMap(false);
    setManualShuffleOrder(null);
    setPinnedOutsideDealId(null);
    setActiveIdx(getExploreSymmetricStartIdx(allDeals.length));
    fitMapToDeals(allDeals, true);
  }, [allDeals, fitMapToDeals, setGlobalSearchQuery]);

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

  // Save current MapLibre camera before leaving /explore so pressing Back restores exact spot!
  const persistExploreCameraBeforeNavigate = useCallback(
    (dealId: string) => {
      const map = mapRef.current;
      if (!map) return;
      const c = map.getCenter();
      saveExploreCameraSnapshot({
        lat: c.lat,
        lng: c.lng,
        zoom: map.getZoom(),
        activeDealId: dealId,
        hasUserMovedMap: hasUserMovedMapRef.current,
      });
    },
    []
  );

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

  // Open from List Modal -> Persistent Cross-Route 3D Card Flip straight into /{slug}!
  const handleOpenDetailFromList = useCallback(
    (pin: PinFeedItemDto, originRect?: CardOriginRect | null) => {
      clearLastClickedPinOrigin();
      persistExploreCameraBeforeNavigate(pin.id);
      setIsListModalOpen(false);
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

  const activeFilterCount =
    (placeCategoryFilter !== "ALL" ? 1 : 0) +
    (activeStyle !== "all" ? 1 : 0) +
    (sourceFilter !== "ALL" ? 1 : 0) +
    (provinceFilter ? 1 : 0) +
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
      <div className="cgr-trip-stage-enter fixed inset-x-0 top-0 bottom-[var(--cgr-mobile-nav-h)] lg:left-[72px] lg:top-16 lg:bottom-0 z-20 overflow-clip bg-[var(--color-background-body)] lg:px-8 lg:pt-4 lg:pb-[108px] select-none">
        <div className="relative w-full h-full lg:max-w-[1220px] lg:mx-auto lg:rounded-[26px] overflow-hidden lg:border lg:border-[var(--color-border)] bg-[var(--color-background-muted)]">
          {/* 1. ISOLATED MAPLIBRE VECTOR MAP LAYER */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 z-0 isolate w-full h-full"
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
            {hasUserMovedMap && (
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

          {/* 3. BOTTOM-RIGHT VERTICAL ICON STACK: FILTER & LIST (Thumb-Friendly Icon-Only Buttons!) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute bottom-[186px] right-3 sm:bottom-[216px] sm:right-4 lg:bottom-5 lg:right-4 z-30 flex flex-col items-end gap-2.5"
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

            {/* List Modal Icon Button */}
            <button
              type="button"
              onClick={() => setIsListModalOpen(true)}
              aria-label={isTh ? "ดูแบบรายการ" : "Open list view"}
              title={isTh ? `รายการ (${visibleDeals.length})` : `List (${visibleDeals.length})`}
              className="h-11 w-11 rounded-[13px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={2.1} />
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

          {/* 5. EMPTY MAP ZONE: Compact Floating Bar (Desktop) + Slide-Up Bottom Sheet (Mobile/Tablet) */}
          {emptyZonePresence.shouldRender && (
            <>
              {/* Desktop (>= lg): Ultra-Compact Single-Row Floating Bar */}
              <div className="hidden lg:flex pointer-events-none absolute inset-x-0 bottom-5 z-30 justify-center px-4">
                <div
                  data-state={emptyZonePresence.dataState}
                  className="cgr-floating-card-motion pointer-events-auto inline-flex items-center gap-3 max-w-[560px] rounded-[14px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] pl-3.5 pr-2.5 py-2"
                >
                  <Sparkles
                    className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0"
                    strokeWidth={2}
                  />
                  <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                    {isTh
                      ? "ยังไม่มีโปรที่พักในโซนนี้"
                      : "No stay deals in this area"}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasUserMovedMap && attributeFilteredDeals.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetMapArea}
                        className="h-8 px-3 rounded-[9px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? "ดูโปรทั่วไทย" : "All Thailand"}
                      </button>
                    )}
                    {(activeFilterCount > 0 || globalSearchQuery) && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="h-8 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {isTh ? "ล้างตัวกรอง" : "Reset"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile / Tablet (< lg): Standard Non-Blocking Slide-Up Bottom Sheet */}
              <div className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-center">
                <div
                  data-state={emptyZonePresence.dataState}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="cgr-modal-surface-md pointer-events-auto w-full rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-5 pt-2.5 pb-4"
                >
                  <div className="flex justify-center pb-2.5">
                    <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] leading-snug">
                        {isTh
                          ? "ยังไม่มีโปรที่พักในโซนนี้"
                          : "No stay deals in this area"}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                        {isTh
                          ? "ลองซูมออก เลื่อนแผนที่ หรือดูโปรทั่วไทย"
                          : "Zoom out, pan the map, or view all deals."}
                      </p>
                    </div>
                  </div>
                  {(hasUserMovedMap && attributeFilteredDeals.length > 0) ||
                  activeFilterCount > 0 ||
                  globalSearchQuery ? (
                    <div className="flex items-center gap-2 mt-3.5">
                      {hasUserMovedMap && attributeFilteredDeals.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetMapArea}
                          className="flex-1 h-10 px-4 rounded-[11px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          {isTh ? "ดูโปรทั่วไทย" : "Show all Thailand"}
                        </button>
                      )}
                      {(activeFilterCount > 0 || globalSearchQuery) && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="flex-1 h-10 px-4 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          {isTh ? "ล้างตัวกรอง" : "Reset filters"}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 6. SHARED FLUSH-BOTTOM FANNED PHOTO DECK WITH AUTO-SHUFFLE! */}
        {visibleDeals.length > 0 && (
          <FannedPhotoCardDeck
            items={deckItems}
            activeIdx={safeActiveIdx}
            language={language}
            mode="explore"
            deckIdentityKey="explore-deck"
            shuffleKey={shuffleKey}
            isMapMoving={isMapMoving}
            modalOpenPinId={detailOpenSource === "deck" ? animatingPinId : null}
            enableReorder={false}
            cardTopAction="bookmark"
            savedPinIds={globalSavedPinIds}
            onSelectIndex={handleSelectDeckIndex}
            onOpenCard={(pin, stopNum, badgeText, originRect) =>
              handleOpenCardFlip(pin, stopNum, badgeText, originRect)
            }
            onToggleSavePin={handleToggleSavePin}
          />
        )}
      </div>

      {/* =====================================================================
          LIST VIEW MODAL (Slide-Up Bottom Sheet on Mobile / Centered Modal on Desktop)
          Zero top filter-chip clutter; tapping any card opens calm Fade-Slide Detail Modal!
      ====================================================================== */}
      {listModalPresence.shouldRender &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isTh ? "รายการโปรที่พัก" : "Stay deals list"}
            data-state={listModalPresence.dataState}
            onClick={() => setIsListModalOpen(false)}
            className="cgr-modal-backdrop fixed inset-0 z-[80] bg-black/50 flex items-end lg:items-center justify-center p-0 lg:p-6"
          >
            <div
              data-state={listModalPresence.dataState}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="cgr-modal-surface-lg w-full lg:max-w-[1080px] h-[88dvh] lg:h-[86dvh] rounded-t-[24px] lg:rounded-[24px] bg-[var(--color-background-popover)] border-t lg:border border-[var(--color-border)] lg:border-black/[0.06] lg:dark:border-white/[0.1] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
            >
              {/* Mobile Slide-Up Drag Handle */}
              <div className="flex lg:hidden justify-center pt-2.5 pb-1 shrink-0">
                <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
              </div>

              {/* Clean Single-Row Modal Header */}
              <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[17px] sm:text-[19px] font-semibold text-[var(--color-text-primary)] tracking-[-0.015em] truncate tabular-nums">
                    {isTh
                      ? `โปรที่พักที่พบ (${visibleDeals.length} แห่ง)`
                      : `Stay deals (${visibleDeals.length})`}
                  </h2>
                  {hasUserMovedMap && (
                    <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {isTh
                        ? "แสดงเฉพาะโซนที่คุณเลือกบนแผนที่"
                        : "Filtered to your current map area"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`h-9 px-3 rounded-[10px] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeFilterCount > 0
                        ? "bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222]"
                        : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>{isTh ? "ตัวกรอง" : "Filters"}</span>
                    {activeFilterCount > 0 && (
                      <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#e60023] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    aria-label={isTh ? "ปิดรายการ" : "Close list"}
                    className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Coupon Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 pb-[max(24px,var(--cgr-safe-bottom))] lg:pb-6">
                {visibleDeals.length === 0 ? (
                  <div className="rounded-[18px] bg-[var(--color-background-muted)] px-6 py-14 text-center space-y-3">
                    <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                      {isTh
                        ? "ไม่พบโปรที่พักที่ตรงกับเงื่อนไข"
                        : "No stay deals match these filters"}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "ลองล้างตัวกรองหรือกลับไปดูโปรทั่วไทย"
                        : "Try resetting filters or showing all deals in Thailand."}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {hasUserMovedMap && attributeFilteredDeals.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetMapArea}
                          className="h-10 px-4 rounded-[11px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          {isTh ? "ดูโปรทั่วไทย" : "Show all Thailand"}
                        </button>
                      )}
                      {(activeFilterCount > 0 || globalSearchQuery) && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="h-10 px-4 rounded-[11px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          {isTh ? "ล้างตัวกรอง" : "Reset filters"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                    {visibleDeals.map((deal, idx) => (
                      <VerticalCouponCard
                        key={deal.id}
                        pin={deal}
                        language={language}
                        isSaved={globalSavedPinIds.has(deal.id)}
                        priority={idx < 8}
                        enablePhotoSlide={true}
                        onSelect={(p, rect) => handleOpenDetailFromList(p, rect)}
                        onToggleSave={() => handleToggleSavePin(deal)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

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
                        setManualShuffleOrder(null);
                        setPinnedOutsideDealId(null);
                      }}
                      label={
                        isTh
                          ? "แสดงเฉพาะที่พักที่เคยเปิดดูล่าสุด"
                          : "Recently viewed stays only"
                      }
                    />
                    {(provinceFilter || globalSearchQuery.trim()) && (
                      <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[var(--color-text-secondary)]">
                        <span className="truncate">
                          {globalSearchQuery.trim()
                            ? isTh
                              ? `คำค้นหา: “${globalSearchQuery.trim()}”`
                              : `Search: "${globalSearchQuery.trim()}"`
                            : isTh
                            ? "กำลังกรองตามจังหวัดที่เลือก"
                            : "Filtered by selected province"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProvinceFilter(null);
                            setGlobalSearchQuery("");
                            setManualShuffleOrder(null);
                          }}
                          className="text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 shrink-0 cursor-pointer"
                        >
                          {isTh ? "ล้างคำค้น" : "Clear"}
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
