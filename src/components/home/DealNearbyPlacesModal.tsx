"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Bike,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Compass,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";
import {
  configureThailandMapInteractions,
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
  THAILAND_MAX_ZOOM,
  WORLD_MIN_ZOOM,
} from "@/lib/geo/airbnbMapLibreStyle";
import {
  AIRBNB_WARM_CATEGORY_COLORS,
  createCategoryPinElement,
  createHomeHousePinElement,
  getGoogleMapsVectorMapId,
  hasLoadedGoogleMapsInSession,
  isGoogleMapsClientConfigured,
  isGoogleMapsQuotaReservedForSession,
  loadGoogleMapsJs,
  markGoogleMapsQuotaReservedForSession,
  resolveCategoryPinVisual,
  type GoogleMapsRuntime,
} from "@/lib/geo/googleMapsLoader";
import {
  buildCurvedArcGeoJson,
  formatDistanceLabel,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";

export interface DealNearbyPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelName: string;
  locationSubtitle: string;
  addressTh: string;
  lat: number;
  lng: number;
  /** Host-recommended nearby spots from DB (always free $0 — shown immediately without any API call!) */
  places: NearbyPlaceItem[];
  isLoadingPlaces?: boolean;
  initialSelectedPlaceId?: string | null;
  initialCategory?: Exclude<NearbyPlaceCategory, "all"> | null;
  initialFocusSearch?: boolean;
  language: "th" | "en";
}

type ActiveCategoryId = Exclude<NearbyPlaceCategory, "all"> | null;
type MobileSheetSnap = "collapsed" | "half" | "full";

interface AutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  category: Exclude<NearbyPlaceCategory, "all">;
}

interface GoogleMapClickEvent {
  placeId?: string;
  stop?: () => void;
}

interface GoogleMapLike {
  setCenter: (pos: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  getZoom: () => number | undefined;
  getCenter: () => { lat: () => number; lng: () => number } | undefined;
  panTo: (pos: { lat: number; lng: number }) => void;
  fitBounds: (bounds: unknown, padding?: unknown) => void;
  addListener: (
    event: string,
    cb: (e?: GoogleMapClickEvent) => void
  ) => unknown;
}

interface GoogleAdvancedMarkerLike {
  map: unknown;
  position: { lat: number; lng: number };
  zIndex?: number;
}

const EXPLORE_CATEGORIES: Array<{
  id: Exclude<NearbyPlaceCategory, "all">;
  th: string;
  en: string;
  color: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    id: "dining",
    th: "ร้านอาหาร",
    en: "Restaurants",
    color: AIRBNB_WARM_CATEGORY_COLORS.dining,
    icon: Utensils,
  },
  {
    id: "cafe",
    th: "คาเฟ่ & กาแฟ",
    en: "Cafes",
    color: AIRBNB_WARM_CATEGORY_COLORS.cafe,
    icon: Coffee,
  },
  {
    id: "groceries",
    th: "ร้านสะดวกซื้อ & ของชำ",
    en: "Groceries & 7-Eleven",
    color: AIRBNB_WARM_CATEGORY_COLORS.groceries,
    icon: ShoppingCart,
  },
  {
    id: "shopping",
    th: "ช้อปปิ้ง & ตลาด",
    en: "Shopping & markets",
    color: AIRBNB_WARM_CATEGORY_COLORS.shopping,
    icon: ShoppingBag,
  },
  {
    id: "essential",
    th: "ปั๊มน้ำมัน, EV & เดินทาง",
    en: "Fuel, EV & transit",
    color: AIRBNB_WARM_CATEGORY_COLORS.essential,
    icon: Navigation,
  },
  {
    id: "attraction",
    th: "ที่เที่ยว & จุดชมวิว",
    en: "Attractions & views",
    color: AIRBNB_WARM_CATEGORY_COLORS.attraction,
    icon: Compass,
  },
  {
    id: "host",
    th: "Nondii แนะนำ",
    en: "Nondii picks",
    color: AIRBNB_WARM_CATEGORY_COLORS.host,
    icon: Sparkles,
  },
];

export function resolveCategoryPinColor(category: NearbyPlaceCategory): string {
  switch (category) {
    case "dining":
      return AIRBNB_WARM_CATEGORY_COLORS.dining;
    case "cafe":
      return AIRBNB_WARM_CATEGORY_COLORS.cafe;
    case "groceries":
      return AIRBNB_WARM_CATEGORY_COLORS.groceries;
    case "shopping":
      return AIRBNB_WARM_CATEGORY_COLORS.shopping;
    case "essential":
      return AIRBNB_WARM_CATEGORY_COLORS.essential;
    case "attraction":
      return AIRBNB_WARM_CATEGORY_COLORS.attraction;
    case "host":
    default:
      return AIRBNB_WARM_CATEGORY_COLORS.host;
  }
}

export function buildCirclePolygonGeoJson(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  points = 48
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const latDegPerKm = 1 / 111.32;
  const lngDegPerKm = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    coords.push([
      centerLng + Math.cos(angle) * radiusKm * lngDegPerKm,
      centerLat + Math.sin(angle) * radiusKm * latDegPerKm,
    ]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

/**
 * Pick well-spaced pins allowed to display inline text-halo labels so map labels NEVER collide.
 */
function computeSpacedLabelIds(
  places: NearbyPlaceItem[],
  selectedId: string | null,
  hoveredId: string | null,
  maxLabels = 6
): Set<string> {
  const allowed = new Set<string>();
  const keptCoords: Array<{ lat: number; lng: number }> = [];

  if (selectedId) {
    const sel = places.find((p) => p.id === selectedId);
    if (sel) {
      allowed.add(sel.id);
      keptCoords.push({ lat: sel.lat, lng: sel.lng });
    }
  }
  if (hoveredId && hoveredId !== selectedId) {
    const hov = places.find((p) => p.id === hoveredId);
    if (hov) {
      allowed.add(hov.id);
      keptCoords.push({ lat: hov.lat, lng: hov.lng });
    }
  }

  for (const p of places) {
    if (allowed.size >= maxLabels) break;
    if (allowed.has(p.id)) continue;
    const tooClose = keptCoords.some(
      (c) => Math.abs(c.lat - p.lat) < 0.0022 && Math.abs(c.lng - p.lng) < 0.0042
    );
    if (!tooClose) {
      allowed.add(p.id);
      keptCoords.push({ lat: p.lat, lng: p.lng });
    }
  }
  return allowed;
}

function getPlacePhotoProxyUrl(photoName: string, maxWidth = 360): string {
  return `/api/places/photo?googlePhotoName=${encodeURIComponent(
    photoName
  )}&maxWidth=${maxWidth}`;
}

/**
 * Unified Airbnb-Exact Nearby Places Explorer Modal (Mobile < 768px + Tablet/Desktop >= 768px).
 * - Mobile (< md): 100dvh full-bleed vector map + Airbnb floating bottom sheet (idle / expanded search / 3-state results / floating bottom POI card with zero clipping!)
 * - Tablet & Desktop (>= md, matching Airbnb 768px breakpoint): Full-bleed rounded modal + floating top-left search/categories/results/POI detail card!
 * - Google Maps JS Vector + Google Places API (New) with Dynamic Monthly Quota Pacing + Auto-Fallback to MapLibre + OSM.
 */
export function DealNearbyPlacesModal({
  isOpen,
  onClose,
  hotelName,
  lat,
  lng,
  places: hostAndSeedPlaces,
  initialSelectedPlaceId = null,
  initialCategory = null,
  initialFocusSearch = false,
  language,
}: DealNearbyPlacesModalProps) {
  const { theme } = useHotelApp();
  const isDark = theme === "dark";
  const isTh = language === "th";

  const { shouldRender, dataState } = useModalPresence(isOpen, 280);
  useBodyScrollLock(shouldRender);

  const [mounted, setMounted] = useState(false);
  const [isMediumUp, setIsMediumUp] = useState(true);
  const [mapEngine, setMapEngine] = useState<"checking" | "google" | "maplibre">(
    "checking"
  );
  const [placesPhotoAllowed, setPlacesPhotoAllowed] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Active category / search state
  const [activeCategory, setActiveCategory] = useState<ActiveCategoryId>(
    initialCategory
  );
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileSheetSnap, setMobileSheetSnap] =
    useState<MobileSheetSnap>("half");
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetDragOffsetY, setSheetDragOffsetY] = useState(0);
  const [cachedSelectedPlace, setCachedSelectedPlace] =
    useState<NearbyPlaceItem | null>(null);
  const [autocompleteItems, setAutocompleteItems] = useState<
    AutocompleteSuggestion[]
  >([]);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);

  const [fetchedPlaces, setFetchedPlaces] = useState<NearbyPlaceItem[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [providerNotice, setProviderNotice] = useState<"google" | "osm" | null>(
    null
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    initialSelectedPlaceId
  );
  const [inspectedBasePlace, setInspectedBasePlace] =
    useState<NearbyPlaceItem | null>(null);
  const [isLoadingBasePlace, setIsLoadingBasePlace] = useState(false);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<"drive" | "moto" | "walk">(
    "walk"
  );
  const [isTravelDropdownOpen, setIsTravelDropdownOpen] = useState(false);
  const [travelOverlayHost, setTravelOverlayHost] =
    useState<HTMLDivElement | null>(null);
  const [detailPhotoIdx, setDetailPhotoIdx] = useState(0);
  const [brokenPhotoKeys, setBrokenPhotoKeys] = useState<Record<string, true>>(
    {}
  );
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const sheetDragStartYRef = useRef<number | null>(null);
  const photoSwipeStartXRef = useRef<number | null>(null);

  const googleRuntimeRef = useRef<GoogleMapsRuntime | null>(null);
  const googleMapRef = useRef<GoogleMapLike | null>(null);
  const googleMarkersRef = useRef<GoogleAdvancedMarkerLike[]>([]);
  const googleTravelMarkerRef = useRef<GoogleAdvancedMarkerLike | null>(null);
  const googleHomeMarkerRef = useRef<GoogleAdvancedMarkerLike | null>(null);
  const googleCircleRef = useRef<{ setMap: (m: unknown) => void } | null>(null);
  const googleArcRef = useRef<{
    setMap: (m: unknown) => void;
    setPath: (p: Array<{ lat: number; lng: number }>) => void;
  } | null>(null);
  const googleAdvMarkerCtorRef = useRef<
    (new (opts: Record<string, unknown>) => GoogleAdvancedMarkerLike) | null
  >(null);

  const maplibreMapRef = useRef<maplibregl.Map | null>(null);
  const maplibreMarkersRef = useRef<maplibregl.Marker[]>([]);
  const maplibreTravelMarkerRef = useRef<maplibregl.Marker | null>(null);

  const suppressNextMovePromptRef = useRef(false);
  const sessionTokenRef = useRef<string>("");
  const reqSeqRef = useRef(0);

  const hostPicks = useMemo(
    () =>
      hostAndSeedPlaces.filter(
        (p) => p.isHostPick || p.source === "host" || p.source === "nondii_db"
      ),
    [hostAndSeedPlaces]
  );

  const visibleCategories = useMemo(
    () =>
      EXPLORE_CATEGORIES.filter(
        (cat) => cat.id !== "host" || hostPicks.length > 0
      ),
    [hostPicks.length]
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    // Exact Airbnb breakpoint: >= 768px (iPad Tablet & Desktop) uses floating top-left card; < 768px uses Mobile floating bottom sheet!
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMediumUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Reset state cleanly when opening modal
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlaceId(initialSelectedPlaceId);
    setInspectedBasePlace(null);
    setIsLoadingBasePlace(false);
    setActiveCategory(initialCategory);
    setSearchInput("");
    setActiveSearchQuery("");
    setIsSearchFocused(Boolean(initialFocusSearch && !initialCategory && !initialSelectedPlaceId));
    setMobileSheetSnap("half");
    setIsDraggingSheet(false);
    setSheetDragOffsetY(0);
    setAutocompleteItems([]);
    setFetchedPlaces([]);
    setShowSearchThisArea(false);
    setDetailPhotoIdx(0);
    setHoveredPlaceId(null);
    setIsTravelDropdownOpen(false);
    sessionTokenRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `st_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, [isOpen, initialSelectedPlaceId, initialCategory, initialFocusSearch]);

  // Auto-focus mobile search input gently after modal open if launched via Search trigger
  useEffect(() => {
    if (!isOpen || !isSearchFocused || isMediumUp) return;
    const timer = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus({ preventScroll: true });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [isOpen, isSearchFocused, isMediumUp]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Step 1: Check Dynamic Monthly Quota Gate before deciding Google Maps Vector vs MapLibre Fallback
  useEffect(() => {
    if (!isOpen || !mounted) return;
    let cancelled = false;

    const decideEngine = async () => {
      if (!isGoogleMapsClientConfigured()) {
        setMapEngine("maplibre");
        setPlacesPhotoAllowed(false);
        return;
      }

      setMapEngine("checking");
      try {
        const alreadyLoaded =
          hasLoadedGoogleMapsInSession() ||
          isGoogleMapsQuotaReservedForSession();
        const res = await fetch("/api/places/quota", {
          method: alreadyLoaded ? "GET" : "POST",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          mapsJsAllowed?: boolean;
          placesPhotoAllowed?: boolean;
        };
        if (cancelled) return;

        setPlacesPhotoAllowed(Boolean(data.placesPhotoAllowed));
        if (data.mapsJsAllowed || alreadyLoaded) {
          markGoogleMapsQuotaReservedForSession();
          setMapEngine("google");
        } else {
          setMapEngine("maplibre");
        }
      } catch {
        if (!cancelled) {
          setMapEngine("maplibre");
          setPlacesPhotoAllowed(false);
        }
      }
    };

    void decideEngine();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mounted]);

  const getActiveSearchViewport = useCallback((): {
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
  } => {
    if (mapEngine === "google" && googleMapRef.current) {
      const c = googleMapRef.current.getCenter();
      const z = googleMapRef.current.getZoom() ?? 14;
      const radiusMeters =
        z >= 16 ? 1200 : z >= 15 ? 2500 : z >= 14 ? 4500 : z >= 12 ? 9000 : 18000;
      if (c) {
        return { centerLat: c.lat(), centerLng: c.lng(), radiusMeters };
      }
    }
    if (mapEngine === "maplibre" && maplibreMapRef.current) {
      const c = maplibreMapRef.current.getCenter();
      const z = maplibreMapRef.current.getZoom();
      const radiusMeters =
        z >= 16 ? 1200 : z >= 15 ? 2500 : z >= 14 ? 4500 : z >= 12 ? 9000 : 18000;
      return { centerLat: c.lat, centerLng: c.lng, radiusMeters };
    }
    return { centerLat: lat, centerLng: lng, radiusMeters: 5000 };
  }, [mapEngine, lat, lng]);

  const runCategoryFetch = useCallback(
    async (
      category: Exclude<NearbyPlaceCategory, "all">,
      centerLat = lat,
      centerLng = lng,
      radiusMeters = 5000
    ) => {
      if (category === "host") {
        setFetchedPlaces(hostPicks);
        setIsFetchingPlaces(false);
        setShowSearchThisArea(false);
        return;
      }

      const seq = ++reqSeqRef.current;
      setIsFetchingPlaces(true);
      setShowSearchThisArea(false);
      try {
        const provider = mapEngine === "google" ? "auto" : "osm";
        const qs = new URLSearchParams({
          lat: String(centerLat),
          lng: String(centerLng),
          originLat: String(lat),
          originLng: String(lng),
          category,
          radius: String(radiusMeters),
          provider,
          lang: language,
        });
        const res = await fetch(`/api/places/nearby?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Nearby fetch failed");
        const data = (await res.json()) as {
          items?: NearbyPlaceItem[];
          providerUsed?: "google" | "osm";
        };
        if (seq !== reqSeqRef.current) return;

        const incoming = Array.isArray(data.items) ? data.items : [];
        const cleaned =
          data.providerUsed === "google"
            ? incoming
            : incoming.filter((it) => it.category === category);
        setFetchedPlaces(cleaned.slice(0, 20));
        setProviderNotice(data.providerUsed ?? "osm");
      } catch {
        if (seq === reqSeqRef.current) setFetchedPlaces([]);
      } finally {
        if (seq === reqSeqRef.current) setIsFetchingPlaces(false);
      }
    },
    [lat, lng, hostPicks, mapEngine, language]
  );

  const runTextSearch = useCallback(
    async (
      query: string,
      centerLat = lat,
      centerLng = lng,
      radiusMeters = 12000
    ) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const seq = ++reqSeqRef.current;
      setIsFetchingPlaces(true);
      setActiveCategory(null);
      setActiveSearchQuery(trimmed);
      setSearchInput(trimmed);
      setIsSearchFocused(false);
      setMobileSheetSnap("half");
      setAutocompleteItems([]);
      setSelectedPlaceId(null);
      setInspectedBasePlace(null);
      setShowSearchThisArea(false);

      try {
        const provider = mapEngine === "google" ? "auto" : "osm";
        const qs = new URLSearchParams({
          q: trimmed,
          lat: String(centerLat),
          lng: String(centerLng),
          originLat: String(lat),
          originLng: String(lng),
          mode: "text",
          provider,
          radius: String(radiusMeters),
          lang: language,
        });
        const res = await fetch(`/api/places/search?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as {
          items?: NearbyPlaceItem[];
          providerUsed?: "google" | "osm";
        };
        if (seq !== reqSeqRef.current) return;
        setFetchedPlaces(
          Array.isArray(data.items) ? data.items.slice(0, 20) : []
        );
        setProviderNotice(data.providerUsed ?? "osm");
      } catch {
        if (seq === reqSeqRef.current) setFetchedPlaces([]);
      } finally {
        if (seq === reqSeqRef.current) setIsFetchingPlaces(false);
      }
    },
    [lat, lng, mapEngine, language]
  );

  useEffect(() => {
    if (!isOpen || !initialCategory || mapEngine === "checking") return;
    const meta = EXPLORE_CATEGORIES.find((c) => c.id === initialCategory);
    if (meta) setSearchInput(isTh ? meta.th : meta.en);
    setMobileSheetSnap("half");
    void runCategoryFetch(initialCategory, lat, lng, 5000);
  }, [isOpen, initialCategory, mapEngine, lat, lng, isTh, runCategoryFetch]);

  // Debounced Autocomplete (350ms, min 2 chars)
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (
      !isOpen ||
      !isSearchFocused ||
      trimmed.length < 2 ||
      trimmed === activeSearchQuery ||
      mapEngine !== "google"
    ) {
      setAutocompleteItems([]);
      setIsAutocompleteLoading(false);
      return;
    }

    let cancelled = false;
    setIsAutocompleteLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { centerLat, centerLng } = getActiveSearchViewport();
        const qs = new URLSearchParams({
          q: trimmed,
          lat: String(centerLat),
          lng: String(centerLng),
          mode: "autocomplete",
          sessionToken: sessionTokenRef.current,
          lang: language,
        });
        const res = await fetch(`/api/places/search?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          suggestions?: AutocompleteSuggestion[];
        };
        if (!cancelled) {
          setAutocompleteItems(
            Array.isArray(data.suggestions) ? data.suggestions : []
          );
        }
      } catch {
        if (!cancelled) setAutocompleteItems([]);
      } finally {
        if (!cancelled) setIsAutocompleteLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    isSearchFocused,
    searchInput,
    activeSearchQuery,
    mapEngine,
    getActiveSearchViewport,
    language,
  ]);

  const displayedPlaces = useMemo(() => {
    const base =
      activeCategory === "host"
        ? hostPicks
        : activeCategory || activeSearchQuery
        ? fetchedPlaces
        : hostPicks.slice(0, 6);

    if (
      inspectedBasePlace &&
      !base.some((p) => p.id === inspectedBasePlace.id)
    ) {
      return [inspectedBasePlace, ...base];
    }
    return base;
  }, [
    activeCategory,
    activeSearchQuery,
    fetchedPlaces,
    hostPicks,
    inspectedBasePlace,
  ]);

  const selectedPlace = useMemo(
    () =>
      displayedPlaces.find((p) => p.id === selectedPlaceId) ??
      (inspectedBasePlace && inspectedBasePlace.id === selectedPlaceId
        ? inspectedBasePlace
        : null),
    [displayedPlaces, selectedPlaceId, inspectedBasePlace]
  );

  // Cache last selected place so Mobile/Desktop POI Detail Card keeps photo & title intact during its smooth exit glide
  useEffect(() => {
    if (selectedPlace) {
      setCachedSelectedPlace(selectedPlace);
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (!shouldRender) {
      setCachedSelectedPlace(null);
    }
  }, [shouldRender]);

  const hasActiveFilter = Boolean(activeCategory || activeSearchQuery);
  const showAutocompleteDropdown =
    isSearchFocused && searchInput.trim().length >= 2 && !activeCategory;
  const desktopPanelOpen = Boolean(
    selectedPlace || showAutocompleteDropdown || hasActiveFilter || isSearchFocused
  );
  const desktopPanelPresence = useModalPresence(desktopPanelOpen, 180);
  const mobilePoiPresence = useModalPresence(Boolean(selectedPlace), 250);

  // Intercept clicks on Google Maps base landmarks ("สะพานสะปัน", "น้ำตกสะปัน") while strictly blocking competing hotels
  const inspectClickedBaseGooglePlace = useCallback(
    async (placeId: string) => {
      const existing = displayedPlaces.find(
        (p) => p.googlePlaceId === placeId || p.id === `gplace-${placeId}`
      );
      if (existing) {
        setSelectedPlaceId(existing.id);
        setIsSearchFocused(false);
        return;
      }

      setIsLoadingBasePlace(true);
      setIsSearchFocused(false);
      try {
        const qs = new URLSearchParams({
          placeId,
          originLat: String(lat),
          originLng: String(lng),
          lang: language,
        });
        const res = await fetch(`/api/places/detail?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          place?: NearbyPlaceItem | null;
          blocked?: boolean;
        };
        if (data.blocked || !data.place) return;
        setInspectedBasePlace(data.place);
        setSelectedPlaceId(data.place.id);
      } catch {
        // ignore
      } finally {
        setIsLoadingBasePlace(false);
      }
    },
    [displayedPlaces, lat, lng, language]
  );
  const inspectClickedBaseGooglePlaceRef = useRef(inspectClickedBaseGooglePlace);
  inspectClickedBaseGooglePlaceRef.current = inspectClickedBaseGooglePlace;

  const hasActiveFilterRef = useRef(false);
  hasActiveFilterRef.current = Boolean(activeCategory || activeSearchQuery);

  useEffect(() => {
    setIsTravelDropdownOpen(false);
    if (!selectedPlace) return;
    setDetailPhotoIdx(0);
    setTravelMode(
      selectedPlace.distanceKm <= 1.1 && selectedPlace.walkMinutes <= 18
        ? "walk"
        : "drive"
    );
  }, [selectedPlace?.id]);

  // Mount/Unmount Floating Airbnb Travel-Time Pill + Dropdown Directly Above the Selected Pin
  useEffect(() => {
    if (googleTravelMarkerRef.current) {
      googleTravelMarkerRef.current.map = null;
      googleTravelMarkerRef.current = null;
    }
    if (maplibreTravelMarkerRef.current) {
      maplibreTravelMarkerRef.current.remove();
      maplibreTravelMarkerRef.current = null;
    }

    if (!isMapReady || !selectedPlace) {
      setTravelOverlayHost(null);
      return;
    }

    const host = document.createElement("div");
    host.style.cssText =
      "padding-bottom:24px;pointer-events:none;z-index:90;";

    if (
      mapEngine === "google" &&
      googleMapRef.current &&
      googleAdvMarkerCtorRef.current
    ) {
      const AdvMarker = googleAdvMarkerCtorRef.current;
      const m = new AdvMarker({
        map: googleMapRef.current,
        position: { lat: selectedPlace.lat, lng: selectedPlace.lng },
        content: host,
        zIndex: 120,
      });
      googleTravelMarkerRef.current = m;
      setTravelOverlayHost(host);
    } else if (mapEngine === "maplibre" && maplibreMapRef.current) {
      const m = new maplibregl.Marker({ element: host, anchor: "bottom" })
        .setLngLat([selectedPlace.lng, selectedPlace.lat])
        .addTo(maplibreMapRef.current);
      m.getElement().style.zIndex = "90";
      maplibreTravelMarkerRef.current = m;
      setTravelOverlayHost(host);
    } else {
      setTravelOverlayHost(null);
    }

    return () => {
      if (googleTravelMarkerRef.current) {
        googleTravelMarkerRef.current.map = null;
        googleTravelMarkerRef.current = null;
      }
      if (maplibreTravelMarkerRef.current) {
        maplibreTravelMarkerRef.current.remove();
        maplibreTravelMarkerRef.current = null;
      }
      setTravelOverlayHost(null);
    };
  }, [
    isMapReady,
    mapEngine,
    selectedPlace?.id,
    selectedPlace?.lat,
    selectedPlace?.lng,
  ]);

  // =========================================================================
  // MAP INITIALIZATION (Google Maps JS Vector Primary | MapLibre Fallback)
  // Kept mounted across `shouldRender` so closing exit animation never flashes grey!
  // =========================================================================
  useEffect(() => {
    if (!shouldRender || !mounted || mapEngine === "checking") return;
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;
    setIsMapReady(false);

    if (mapEngine === "google") {
      const listeners: unknown[] = [];

      const initGoogle = async () => {
        try {
          const g = await loadGoogleMapsJs(language);
          if (cancelled || !mapContainerRef.current) return;

          const mapsLib = (await g.maps.importLibrary("maps")) as {
            Map: new (
              el: HTMLElement,
              opts: Record<string, unknown>
            ) => GoogleMapLike;
          };
          const markerLib = (await g.maps.importLibrary("marker")) as {
            AdvancedMarkerElement: new (
              opts: Record<string, unknown>
            ) => GoogleAdvancedMarkerLike;
          };
          if (cancelled || !mapContainerRef.current) return;

          googleRuntimeRef.current = g;
          googleAdvMarkerCtorRef.current = markerLib.AdvancedMarkerElement;

          const mapId = getGoogleMapsVectorMapId();
          const map = new mapsLib.Map(mapContainerRef.current, {
            center: { lat, lng },
            zoom: 14.2,
            minZoom: 5,
            maxZoom: 19,
            ...(mapId ? { mapId } : {}),
            colorScheme: isDark ? "DARK" : "LIGHT",
            disableDefaultUI: true,
            clickableIcons: true,
            gestureHandling: "greedy",
          });
          googleMapRef.current = map;

          const circle = new g.maps.Circle({
            map,
            center: { lat, lng },
            radius: 1200,
            fillColor: isDark ? "#ffffff" : "#222222",
            fillOpacity: 0.045,
            strokeColor: isDark ? "#a8a8a8" : "#717171",
            strokeOpacity: 0.35,
            strokeWeight: 1.2,
            clickable: false,
          });
          googleCircleRef.current = circle;

          const homeMarker = new markerLib.AdvancedMarkerElement({
            map,
            position: { lat, lng },
            content: createHomeHousePinElement(hotelName, "google"),
            zIndex: 60,
          });
          googleHomeMarkerRef.current = homeMarker;

          const arcLine = new g.maps.Polyline({
            map,
            path: [],
            strokeOpacity: 0,
            clickable: false,
            icons: [
              {
                icon: {
                  path: g.maps.SymbolPath.CIRCLE,
                  fillColor: isDark ? "#f5f5f5" : "#222222",
                  fillOpacity: 0.9,
                  strokeOpacity: 0,
                  scale: 2.3,
                },
                offset: "0",
                repeat: "9px",
              },
            ],
          });
          googleArcRef.current = arcLine;

          listeners.push(
            map.addListener("click", (ev?: GoogleMapClickEvent) => {
              if (ev?.placeId) {
                ev.stop?.();
                void inspectClickedBaseGooglePlaceRef.current(ev.placeId);
                return;
              }
              setIsTravelDropdownOpen(false);
              setIsSearchFocused(false);
              // Airbnb Mobile: tapping map background collapses the results sheet to a compact pill bar!
              if (hasActiveFilterRef.current) {
                setMobileSheetSnap("collapsed");
              }
              setSelectedPlaceId(null);
            })
          );
          listeners.push(
            map.addListener("dragend", () => {
              if (suppressNextMovePromptRef.current) {
                suppressNextMovePromptRef.current = false;
                return;
              }
              setShowSearchThisArea(true);
            })
          );

          setIsMapReady(true);
        } catch (err) {
          console.warn(
            "[DealNearbyPlacesModal] Google Maps JS fallback -> MapLibre:",
            err
          );
          if (!cancelled) setMapEngine("maplibre");
        }
      };

      void initGoogle();

      return () => {
        cancelled = true;
        for (const l of listeners) {
          googleRuntimeRef.current?.maps?.event?.removeListener(l);
        }
        for (const m of googleMarkersRef.current) m.map = null;
        googleMarkersRef.current = [];
        if (googleHomeMarkerRef.current) {
          googleHomeMarkerRef.current.map = null;
          googleHomeMarkerRef.current = null;
        }
        if (googleCircleRef.current) {
          googleCircleRef.current.setMap(null);
          googleCircleRef.current = null;
        }
        if (googleArcRef.current) {
          googleArcRef.current.setMap(null);
          googleArcRef.current = null;
        }
        googleMapRef.current = null;
        setIsMapReady(false);
      };
    }

    // Engine B: Free MapLibre Fallback
    let mlMap: maplibregl.Map | null = null;
    const initMapLibre = async () => {
      ensureMapLibreWorker();
      const style = await getAirbnbVectorMapStyle(isDark);
      if (cancelled || !mapContainerRef.current) return;

      mlMap = new maplibregl.Map({
        container: mapContainerRef.current,
        style,
        center: [lng, lat],
        zoom: 13.8,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
      configureThailandMapInteractions(mlMap);
      maplibreMapRef.current = mlMap;

      mlMap.on("load", () => {
        if (cancelled || !mlMap) return;
        for (const layer of mlMap.getStyle().layers || []) {
          if (layer.id.toLowerCase().includes("poi")) {
            try {
              mlMap.setLayoutProperty(layer.id, "visibility", "none");
            } catch {
              // ignore
            }
          }
        }

        mlMap.addSource("nearby-radius-ring", {
          type: "geojson",
          data: buildCirclePolygonGeoJson(lng, lat, 1.5),
        });
        mlMap.addLayer({
          id: "nearby-radius-fill",
          type: "fill",
          source: "nearby-radius-ring",
          paint: {
            "fill-color": isDark ? "#ffffff" : "#222222",
            "fill-opacity": 0.045,
          },
        });
        mlMap.addLayer({
          id: "nearby-radius-outline",
          type: "line",
          source: "nearby-radius-ring",
          paint: {
            "line-color": isDark ? "#a8a8a8" : "#717171",
            "line-width": 1.2,
            "line-dasharray": [3, 3],
            "line-opacity": 0.45,
          },
        });
        mlMap.addSource("nearby-arc-line", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mlMap.addLayer({
          id: "nearby-arc-stroke",
          type: "line",
          source: "nearby-arc-line",
          layout: { "line-cap": "round" },
          paint: {
            "line-color": isDark ? "#f5f5f5" : "#222222",
            "line-width": 2.4,
            "line-dasharray": [1.5, 2.5],
            "line-opacity": 0.9,
          },
        });
        setIsMapReady(true);
      });

      mlMap.on("click", () => {
        setIsTravelDropdownOpen(false);
        setIsSearchFocused(false);
        if (hasActiveFilterRef.current) {
          setMobileSheetSnap("collapsed");
        }
        setSelectedPlaceId(null);
      });
      mlMap.on("dragend", () => {
        if (suppressNextMovePromptRef.current) {
          suppressNextMovePromptRef.current = false;
          return;
        }
        setShowSearchThisArea(true);
      });

      new maplibregl.Marker({
        element: createHomeHousePinElement(hotelName, "maplibre"),
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(mlMap);
    };

    void initMapLibre();

    return () => {
      cancelled = true;
      for (const m of maplibreMarkersRef.current) m.remove();
      maplibreMarkersRef.current = [];
      if (mlMap) mlMap.remove();
      maplibreMapRef.current = null;
      setIsMapReady(false);
    };
  }, [shouldRender, mounted, mapEngine, lat, lng, hotelName, isDark, language]);

  // =========================================================================
  // RENDER AIRBNB CIRCULAR CATEGORY MEDALLIONS + CURVED DOTTED ARC
  // =========================================================================
  useEffect(() => {
    if (!isMapReady) return;

    const spacedLabelIds = computeSpacedLabelIds(
      displayedPlaces,
      selectedPlaceId,
      hoveredPlaceId,
      6
    );

    if (mapEngine === "google") {
      const map = googleMapRef.current;
      const g = googleRuntimeRef.current;
      const AdvMarker = googleAdvMarkerCtorRef.current;
      if (!map || !g || !AdvMarker) return;

      for (const m of googleMarkersRef.current) m.map = null;
      googleMarkersRef.current = [];

      for (const place of displayedPlaces) {
        const isSelected = selectedPlaceId === place.id;
        const isHovered = hoveredPlaceId === place.id;
        const pinEl = createCategoryPinElement({
          place,
          isSelected,
          isHovered,
          language,
          isDark,
          showLabel: spacedLabelIds.has(place.id),
          anchorMode: "google",
          onClick: () => {
            setSelectedPlaceId(place.id);
            setIsSearchFocused(false);
          },
          onHover: (hov) => setHoveredPlaceId(hov ? place.id : null),
        });

        const marker = new AdvMarker({
          map,
          position: { lat: place.lat, lng: place.lng },
          content: pinEl,
          zIndex: isSelected ? 50 : isHovered ? 35 : 15,
        });
        googleMarkersRef.current.push(marker);
      }

      if (googleArcRef.current) {
        if (selectedPlace) {
          const geo = buildCurvedArcGeoJson(
            lng,
            lat,
            selectedPlace.lng,
            selectedPlace.lat
          );
          googleArcRef.current.setPath(
            geo.geometry.coordinates.map(([pLng, pLat]) => ({
              lat: pLat,
              lng: pLng,
            }))
          );
        } else {
          googleArcRef.current.setPath([]);
        }
      }
      return;
    }

    const mlMap = maplibreMapRef.current;
    if (!mlMap) return;

    for (const m of maplibreMarkersRef.current) m.remove();
    maplibreMarkersRef.current = [];

    for (const place of displayedPlaces) {
      const isSelected = selectedPlaceId === place.id;
      const isHovered = hoveredPlaceId === place.id;
      const pinEl = createCategoryPinElement({
        place,
        isSelected,
        isHovered,
        language,
        isDark,
        showLabel: spacedLabelIds.has(place.id),
        anchorMode: "maplibre",
        onClick: () => {
          setSelectedPlaceId(place.id);
          setIsSearchFocused(false);
        },
        onHover: (hov) => setHoveredPlaceId(hov ? place.id : null),
      });

      const marker = new maplibregl.Marker({ element: pinEl, anchor: "center" })
        .setLngLat([place.lng, place.lat])
        .addTo(mlMap);
      maplibreMarkersRef.current.push(marker);
    }

    const arcSrc = mlMap.getSource("nearby-arc-line") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (arcSrc) {
      if (selectedPlace) {
        arcSrc.setData(
          buildCurvedArcGeoJson(lng, lat, selectedPlace.lng, selectedPlace.lat)
        );
      } else {
        arcSrc.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [
    displayedPlaces,
    selectedPlaceId,
    hoveredPlaceId,
    selectedPlace,
    isMapReady,
    mapEngine,
    language,
    isDark,
    lat,
    lng,
  ]);

  // Smart Viewport-Aware Camera Framing (Airbnb Mobile: keeps pins above floating bottom sheet/card; Tablet/Desktop: keeps pins right of floating top-left card!)
  useEffect(() => {
    if (!isMapReady) return;
    const vh = typeof window !== "undefined" ? window.innerHeight : 844;
    const mobileBottomPad = selectedPlace
      ? 330
      : mobileSheetSnap === "half"
      ? Math.round(vh * 0.52)
      : 132;

    const padding = isMediumUp
      ? { top: 76, right: 72, bottom: 68, left: 380 }
      : { top: 96, right: 56, bottom: mobileBottomPad, left: 32 };

    if (
      mapEngine === "google" &&
      googleMapRef.current &&
      googleRuntimeRef.current
    ) {
      const map = googleMapRef.current;
      const g = googleRuntimeRef.current;

      if (selectedPlace) {
        suppressNextMovePromptRef.current = true;
        const bounds = new g.maps.LatLngBounds();
        bounds.extend({ lat, lng });
        bounds.extend({ lat: selectedPlace.lat, lng: selectedPlace.lng });
        map.fitBounds(bounds, padding);
      } else if (
        (activeCategory || activeSearchQuery) &&
        displayedPlaces.length > 0
      ) {
        suppressNextMovePromptRef.current = true;
        const bounds = new g.maps.LatLngBounds();
        bounds.extend({ lat, lng });
        for (const p of displayedPlaces.slice(0, 12)) {
          bounds.extend({ lat: p.lat, lng: p.lng });
        }
        map.fitBounds(bounds, padding);
      }
      return;
    }

    if (mapEngine === "maplibre" && maplibreMapRef.current) {
      const mlMap = maplibreMapRef.current;
      if (selectedPlace) {
        suppressNextMovePromptRef.current = true;
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([lng, lat]);
        bounds.extend([selectedPlace.lng, selectedPlace.lat]);
        mlMap.fitBounds(bounds, {
          padding,
          maxZoom: 15.5,
          duration: 420,
        });
      } else if (
        (activeCategory || activeSearchQuery) &&
        displayedPlaces.length > 0
      ) {
        suppressNextMovePromptRef.current = true;
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([lng, lat]);
        for (const p of displayedPlaces.slice(0, 12)) {
          bounds.extend([p.lng, p.lat]);
        }
        mlMap.fitBounds(bounds, {
          padding,
          maxZoom: 14.8,
          duration: 360,
        });
      }
    }
  }, [
    selectedPlace,
    activeCategory,
    activeSearchQuery,
    displayedPlaces,
    isMapReady,
    mapEngine,
    isMediumUp,
    mobileSheetSnap,
    lat,
    lng,
  ]);

  const handleSelectCategory = (catId: Exclude<NearbyPlaceCategory, "all">) => {
    const meta = EXPLORE_CATEGORIES.find((c) => c.id === catId);
    setActiveCategory(catId);
    setActiveSearchQuery("");
    setSearchInput(meta ? (isTh ? meta.th : meta.en) : "");
    setIsSearchFocused(false);
    setMobileSheetSnap("half");
    setAutocompleteItems([]);
    setSelectedPlaceId(null);
    setInspectedBasePlace(null);
    void runCategoryFetch(catId, lat, lng, 5000);
  };

  const handleClearSearch = () => {
    setActiveCategory(null);
    setActiveSearchQuery("");
    setSearchInput("");
    setAutocompleteItems([]);
    setFetchedPlaces([]);
    setSelectedPlaceId(null);
    setInspectedBasePlace(null);
    setShowSearchThisArea(false);
    setIsSearchFocused(false);
    setMobileSheetSnap("half");
  };

  const handleSearchThisArea = () => {
    const { centerLat, centerLng, radiusMeters } = getActiveSearchViewport();
    if (activeSearchQuery) {
      void runTextSearch(activeSearchQuery, centerLat, centerLng, radiusMeters);
    } else if (activeCategory && activeCategory !== "host") {
      void runCategoryFetch(activeCategory, centerLat, centerLng, radiusMeters);
    } else {
      setShowSearchThisArea(false);
    }
  };

  const handleZoom = (delta: number) => {
    if (mapEngine === "google" && googleMapRef.current) {
      const z = googleMapRef.current.getZoom() ?? 14;
      googleMapRef.current.setZoom(Math.max(5, Math.min(19, z + delta)));
    } else if (maplibreMapRef.current) {
      maplibreMapRef.current.easeTo({
        zoom: Math.max(
          WORLD_MIN_ZOOM,
          Math.min(THAILAND_MAX_ZOOM, maplibreMapRef.current.getZoom() + delta)
        ),
        duration: 220,
      });
    }
  };

  const handleRecenter = () => {
    suppressNextMovePromptRef.current = true;
    if (mapEngine === "google" && googleMapRef.current) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(14.5);
    } else if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [lng, lat],
        zoom: 14.2,
        duration: 420,
      });
    }
  };

  // 1:1 Direct Touch Finger-Tracking Drag + Smooth Spring Snap on Mobile Sheet Handle
  const handleSheetHandleTouchStart = (e: React.TouchEvent) => {
    sheetDragStartYRef.current = e.touches[0]?.clientY ?? null;
    setIsDraggingSheet(true);
    setSheetDragOffsetY(0);
  };
  const handleSheetHandleTouchMove = (e: React.TouchEvent) => {
    const startY = sheetDragStartYRef.current;
    const currentY = e.touches[0]?.clientY;
    if (startY === null || typeof currentY !== "number") return;
    const rawDy = currentY - startY;
    // Gentle 0.35x rubber-banding past limits so drag feels tactile like iOS UIKit
    const isFullLike = isSearchFocused || (hasActiveFilter && mobileSheetSnap === "full");
    let offset = rawDy;
    if (isFullLike && rawDy < 0) {
      offset = rawDy * 0.25;
    } else if (!hasActiveFilter && !isSearchFocused && rawDy > 0) {
      offset = rawDy * 0.28;
    } else {
      offset = Math.max(-140, Math.min(240, rawDy * 0.72));
    }
    setSheetDragOffsetY(offset);
  };
  const handleSheetHandleTouchEnd = (e: React.TouchEvent) => {
    const startY = sheetDragStartYRef.current;
    sheetDragStartYRef.current = null;
    setIsDraggingSheet(false);
    setSheetDragOffsetY(0);
    const endY = e.changedTouches[0]?.clientY;
    if (startY === null || typeof endY !== "number") return;
    const dy = endY - startY;
    if (Math.abs(dy) < 28) return;

    if (isSearchFocused) {
      if (dy > 38) {
        mobileSearchInputRef.current?.blur();
        setIsSearchFocused(false);
      }
      return;
    }
    if (!hasActiveFilter) {
      // Idle bottom card: swiping UP smoothly expands the Search Sheet!
      if (dy < -32) {
        setIsSearchFocused(true);
      }
      return;
    }
    if (dy < -28) {
      setMobileSheetSnap((prev) => (prev === "collapsed" ? "half" : "full"));
    } else if (dy > 28) {
      setMobileSheetSnap((prev) => (prev === "full" ? "half" : "collapsed"));
    }
  };

  const cycleMobileSheetSnap = () => {
    if (isSearchFocused) {
      mobileSearchInputRef.current?.blur();
      setIsSearchFocused(false);
      return;
    }
    if (!hasActiveFilter) {
      setIsSearchFocused(true);
      return;
    }
    setMobileSheetSnap((prev) =>
      prev === "collapsed" ? "half" : prev === "half" ? "full" : "collapsed"
    );
  };

  if (!shouldRender || !mounted) return null;

  const activeDetailPlace = selectedPlace ?? cachedSelectedPlace;
  const selectedPhotoUrls: string[] = [];
  if (activeDetailPlace) {
    if (
      activeDetailPlace.thumbnailUrl &&
      !brokenPhotoKeys[activeDetailPlace.thumbnailUrl]
    ) {
      selectedPhotoUrls.push(activeDetailPlace.thumbnailUrl);
    }
    if (placesPhotoAllowed && activeDetailPlace.photoNames?.length) {
      for (const pn of activeDetailPlace.photoNames.slice(0, 4)) {
        const u = getPlacePhotoProxyUrl(pn, 600);
        if (!brokenPhotoKeys[u]) selectedPhotoUrls.push(u);
      }
    }
  }

  // Airbnb Vertical POI Detail Card (Shared by Tablet/Desktop top-left card & Mobile bottom floating card!)
  const renderPlaceDetailCard = (
    place: NearbyPlaceItem,
    variant: "desktop" | "mobile"
  ) => {
    const visual = resolveCategoryPinVisual(place);
    const activePhotoUrl = selectedPhotoUrls[detailPhotoIdx] ?? null;

    const handlePhotoTouchStart = (e: React.TouchEvent) => {
      photoSwipeStartXRef.current = e.touches[0]?.clientX ?? null;
    };
    const handlePhotoTouchEnd = (e: React.TouchEvent) => {
      const startX = photoSwipeStartXRef.current;
      photoSwipeStartXRef.current = null;
      const endX = e.changedTouches[0]?.clientX;
      if (
        startX === null ||
        typeof endX !== "number" ||
        selectedPhotoUrls.length <= 1
      ) {
        return;
      }
      const dx = endX - startX;
      if (dx < -30) {
        setDetailPhotoIdx((i) => (i + 1) % selectedPhotoUrls.length);
      } else if (dx > 30) {
        setDetailPhotoIdx((i) =>
          i === 0 ? selectedPhotoUrls.length - 1 : i - 1
        );
      }
    };

    return (
      <div className="p-2.5 flex flex-col min-h-0">
        {/* Rounded Photo Stage With Top-Right Close × + Swipeable Carousel */}
        <div
          onTouchStart={handlePhotoTouchStart}
          onTouchEnd={handlePhotoTouchEnd}
          className={`relative w-full ${
            variant === "mobile" ? "h-[188px]" : "aspect-[16/10]"
          } rounded-[16px] bg-[var(--color-background-muted)] overflow-hidden shrink-0`}
        >
          {activePhotoUrl ? (
            <img
              src={activePhotoUrl}
              alt={isTh ? place.nameTh : place.nameEn}
              onError={() =>
                setBrokenPhotoKeys((prev) => ({
                  ...prev,
                  [activePhotoUrl]: true,
                }))
              }
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)]">
              <span
                style={{ backgroundColor: visual.bgHex }}
                className="h-12 w-12 rounded-[14px] text-white inline-flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: visual.iconSvg }}
              />
              <span className="text-[12px] font-medium">
                {isTh ? place.subcategoryLabelTh : place.subcategoryLabelEn}
              </span>
            </div>
          )}

          {/* Close Detail Card × (Returns smoothly to results sheet) */}
          <button
            type="button"
            onClick={() => setSelectedPlaceId(null)}
            aria-label={isTh ? "ปิดรายละเอียด" : "Close details"}
            className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-[10px] bg-white/92 hover:bg-white dark:bg-[#222222]/92 dark:hover:bg-[#2c2c2c] text-[var(--color-text-primary)] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.3} />
          </button>

          {selectedPhotoUrls.length > 1 && (
            <>
              {detailPhotoIdx > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDetailPhotoIdx((i) => Math.max(0, i - 1))
                  }
                  aria-label={isTh ? "รูปก่อนหน้า" : "Previous photo"}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[9px] bg-white/88 hover:bg-white dark:bg-[#222222]/88 dark:hover:bg-[#2c2c2c] text-[var(--color-text-primary)] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {detailPhotoIdx < selectedPhotoUrls.length - 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDetailPhotoIdx((i) =>
                      Math.min(selectedPhotoUrls.length - 1, i + 1)
                    )
                  }
                  aria-label={isTh ? "รูปถัดไป" : "Next photo"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[9px] bg-white/88 hover:bg-white dark:bg-[#222222]/88 dark:hover:bg-[#2c2c2c] text-[var(--color-text-primary)] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-[8px] bg-black/45">
                {selectedPhotoUrls.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === detailPhotoIdx
                        ? "w-3 bg-white"
                        : "w-1.5 bg-white/55"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clean Centered Place Title & Category (Never Clipped on Mobile!) */}
        <div className="px-2 pt-3 pb-1.5 text-center space-y-0.5">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
            {isTh ? place.nameTh : place.nameEn || place.nameTh}
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] truncate">
            {isTh ? place.subcategoryLabelTh : place.subcategoryLabelEn}
          </p>
        </div>
      </div>
    );
  };

  const renderResultsList = (isMobileList = false) => {
    if (isFetchingPlaces) {
      return (
        <div className="py-10 px-4 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-[13px]">
            {isTh ? "กำลังค้นหาสถานที่รอบที่พัก..." : "Finding nearby places..."}
          </p>
        </div>
      );
    }

    if (displayedPlaces.length === 0) {
      return (
        <div className="py-10 px-4 text-center space-y-2">
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {isTh
              ? "ไม่พบสถานที่ในบริเวณนี้"
              : "No places found in this area"}
          </p>
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">
            {isTh
              ? "ลองซูมแผนที่ออกแล้วกด \"ค้นหาในพื้นที่นี้\" หรือลองคำค้นอื่น"
              : "Try zooming out and tapping \"Search this area\" or another term."}
          </p>
          <button
            type="button"
            onClick={handleClearSearch}
            className="mt-1 h-8 px-3.5 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer"
          >
            {isTh ? "เลือกหมวดหมู่อื่น" : "Choose another category"}
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-[var(--color-border)] px-3.5">
        {displayedPlaces.map((place, idx) => {
          const visual = resolveCategoryPinVisual(place);
          const isHovered = hoveredPlaceId === place.id;
          const firstPhotoName =
            placesPhotoAllowed && idx < 4 ? place.photoNames?.[0] : undefined;
          const thumbUrl =
            place.thumbnailUrl ||
            (firstPhotoName
              ? getPlacePhotoProxyUrl(firstPhotoName, 240)
              : undefined);
          const safeThumb =
            thumbUrl && !brokenPhotoKeys[thumbUrl] ? thumbUrl : null;

          return (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                setSelectedPlaceId(place.id);
                setIsSearchFocused(false);
              }}
              onMouseEnter={() => setHoveredPlaceId(place.id)}
              onMouseLeave={() => setHoveredPlaceId(null)}
              className={`w-full py-3 px-2 -mx-2 rounded-[12px] flex items-center gap-3.5 text-left cursor-pointer transition-colors ${
                isHovered
                  ? "bg-[var(--color-background-muted)]"
                  : "hover:bg-[var(--color-background-muted)]/70"
              }`}
            >
              {safeThumb ? (
                <img
                  src={safeThumb}
                  alt={isTh ? place.nameTh : place.nameEn}
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    setBrokenPhotoKeys((prev) => ({
                      ...prev,
                      [safeThumb]: true,
                    }))
                  }
                  className={`${
                    isMobileList ? "h-14 w-14 rounded-[12px]" : "h-12 w-12 rounded-[11px]"
                  } object-cover bg-[var(--color-background-muted)] shrink-0`}
                />
              ) : (
                <span
                  style={{ backgroundColor: visual.bgHex }}
                  className={`${
                    isMobileList ? "h-14 w-14 rounded-[12px]" : "h-11 w-11 rounded-[11px]"
                  } text-white inline-flex items-center justify-center shrink-0`}
                  dangerouslySetInnerHTML={{ __html: visual.iconSvg }}
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                  {isTh ? place.nameTh : place.nameEn || place.nameTh}
                </p>
                <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate mt-0.5">
                  {isTh ? place.subcategoryLabelTh : place.subcategoryLabelEn}
                </p>
              </div>

              {place.distanceKm > 0 && (
                <span className="shrink-0 text-[12.5px] font-medium text-[var(--color-text-secondary)] tabular-nums">
                  {formatDistanceLabel(place.distanceKm, language)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCategoryMenu = () => (
    <div className="py-1.5 divide-y divide-[var(--color-border)]">
      {visibleCategories.map((cat) => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelectCategory(cat.id)}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--color-background-muted)] text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                style={{ backgroundColor: cat.color }}
                className="h-8 w-8 rounded-full text-white inline-flex items-center justify-center shrink-0"
              >
                <Icon className="w-4 h-4" strokeWidth={2.1} />
              </span>
              <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">
                {isTh ? cat.th : cat.en}
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0"
              strokeWidth={2.2}
            />
          </button>
        );
      })}
    </div>
  );

  const renderAutocompleteList = () => (
    <div className="py-1.5 divide-y divide-[var(--color-border)]">
      <button
        type="button"
        onClick={() => void runTextSearch(searchInput)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-background-muted)] text-left cursor-pointer transition-colors"
      >
        <span className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0">
          <Search className="w-4 h-4" />
        </span>
        <span className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
          {isTh
            ? `ค้นหา "${searchInput.trim()}"`
            : `Search for "${searchInput.trim()}"`}
        </span>
      </button>

      {isAutocompleteLoading ? (
        <div className="px-4 py-3.5 flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{isTh ? "กำลังแนะนำสถานที่..." : "Finding suggestions..."}</span>
        </div>
      ) : (
        autocompleteItems.map((sug) => (
          <button
            key={sug.placeId}
            type="button"
            onClick={() => void runTextSearch(sug.mainText)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-background-muted)] text-left cursor-pointer transition-colors"
          >
            <span
              style={{ backgroundColor: resolveCategoryPinColor(sug.category) }}
              className="h-9 w-9 rounded-full text-white inline-flex items-center justify-center shrink-0"
            >
              <MapPin className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                {sug.mainText}
              </p>
              {sug.secondaryText && (
                <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                  {sug.secondaryText}
                </p>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );

  // Persistent Multi-Detent Mobile Sheet Geometry (Continuous 420ms iOS Glide — Zero Snap!)
  const isMobileSheetHidden = Boolean(selectedPlace);
  const isMobileSheetFull =
    !isMobileSheetHidden &&
    (isSearchFocused || (hasActiveFilter && mobileSheetSnap === "full"));
  const isMobileSheetHalf =
    !isMobileSheetHidden &&
    !isSearchFocused &&
    hasActiveFilter &&
    mobileSheetSnap === "half";
  const isMobileSheetCollapsed =
    !isMobileSheetHidden &&
    !isSearchFocused &&
    hasActiveFilter &&
    mobileSheetSnap === "collapsed";

  const mobileSheetStyle: React.CSSProperties = {
    height: isMobileSheetFull
      ? "calc(100dvh - 14px)"
      : isMobileSheetHalf
      ? "48dvh"
      : isMobileSheetCollapsed
      ? "86px"
      : "158px",
    left: isMobileSheetFull ? "0px" : "14px",
    right: isMobileSheetFull ? "0px" : "14px",
    bottom: isMobileSheetFull
      ? "0px"
      : "max(26px, env(safe-area-inset-bottom))",
    borderRadius: isMobileSheetFull
      ? "26px 26px 0px 0px"
      : isMobileSheetCollapsed
      ? "24px"
      : "26px",
    transform: isMobileSheetHidden
      ? "translate3d(0, calc(100% + 48px), 0)"
      : sheetDragOffsetY !== 0
      ? `translate3d(0, ${sheetDragOffsetY}px, 0)`
      : "translate3d(0, 0, 0)",
    opacity: isMobileSheetHidden ? 0 : 1,
    pointerEvents: isMobileSheetHidden ? "none" : "auto",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        isTh ? `สำรวจรอบ ${hotelName}` : `Explore around ${hotelName}`
      }
      data-swipe-ignore="true"
      data-state={dataState}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/55 md:backdrop-blur-[2px] flex items-center justify-center md:p-5"
    >
      {/* Modal Frame: 2-Frame GPU Enter/Exit (Mobile = Slide-Up/Down 100dvh | Tablet & Desktop >= md = Airbnb Fade-Slide!) */}
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="cgr-modal-surface-md relative w-full h-[100dvh] md:w-[min(1180px,95vw)] md:h-[min(88vh,780px)] bg-[var(--color-background-muted)] md:border md:border-[var(--color-border)] md:rounded-[22px] shadow-[var(--shadow-popover)] overflow-hidden"
      >
        {/* 100% FULL-BLEED VECTOR MAP CANVAS (Always Full Height on Mobile, Tablet & Desktop!) */}
        <div ref={mapContainerRef} className="w-full h-full touch-none" />

        {mapEngine === "checking" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-muted)] z-10">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
          </div>
        )}

        {/* Floating "ค้นหาในพื้นที่นี้" (Airbnb Show More) Pill after manual Pan/Zoom */}
        {showSearchThisArea &&
          (activeCategory || activeSearchQuery) &&
          !isSearchFocused && (
            <div className="absolute top-[max(14px,env(safe-area-inset-top))] md:top-4 left-1/2 -translate-x-1/2 z-30">
              <button
                type="button"
                onClick={handleSearchThisArea}
                className="h-9 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] shadow-[var(--shadow-popover)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isTh ? "ค้นหาในพื้นที่นี้" : "Search this area"}</span>
              </button>
            </div>
          )}

        {/* TOP-RIGHT CONTROLS:
            Mobile (< md): X Close + Recenter ONLY (No +/- clutter — pinch-to-zoom like Airbnb!)
            Tablet & Desktop (>= md): X Close + +/- Zoom + Recenter */}
        <div className="absolute right-3.5 top-[max(14px,env(safe-area-inset-top))] md:top-4 md:right-4 z-30 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิดแผนที่" : "Close map"}
            className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.3} />
          </button>

          <div className="hidden md:flex flex-col rounded-[11px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              aria-label={isTh ? "ซูมเข้า" : "Zoom in"}
              className="h-9 w-9 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] border-b border-[var(--color-border)] cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              aria-label={isTh ? "ซูมออก" : "Zoom out"}
              className="h-9 w-9 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRecenter}
            title={isTh ? "กลับไปตำแหน่งที่พัก" : "Center on property"}
            aria-label={isTh ? "กลับไปตำแหน่งที่พัก" : "Center on property"}
            className="h-10 w-10 md:h-9 md:w-9 rounded-[12px] md:rounded-[11px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        {/* AIRBNB FLOATING TRAVEL-TIME PILL + DROPDOWN ANCHORED DIRECTLY ABOVE SELECTED PIN */}
        {selectedPlace &&
          travelOverlayHost &&
          (() => {
            const roadKm = Math.max(0.08, selectedPlace.distanceKm * 1.28);
            const motoMinutes = Math.max(1, Math.round((roadKm / 30) * 60));
            const options: Array<{
              id: "drive" | "moto" | "walk";
              minutes: number;
              labelTh: string;
              labelEn: string;
              Icon: React.ComponentType<{
                className?: string;
                strokeWidth?: number;
              }>;
            }> = [
              {
                id: "drive",
                minutes: selectedPlace.driveMinutes,
                labelTh: `${selectedPlace.driveMinutes} นาที`,
                labelEn: `${selectedPlace.driveMinutes} min`,
                Icon: Car,
              },
              {
                id: "moto",
                minutes: motoMinutes,
                labelTh: `${motoMinutes} นาที`,
                labelEn: `${motoMinutes} min`,
                Icon: Bike,
              },
              {
                id: "walk",
                minutes: selectedPlace.walkMinutes,
                labelTh: `${selectedPlace.walkMinutes} นาที`,
                labelEn: `${selectedPlace.walkMinutes} min`,
                Icon: Footprints,
              },
            ];
            const activeOpt =
              options.find((o) => o.id === travelMode) ?? options[0];
            const ActiveIcon = activeOpt.Icon;

            return createPortal(
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="pointer-events-auto relative flex flex-col items-center"
              >
                {isTravelDropdownOpen ? (
                  <div className="cgr-popover-appear w-[186px] rounded-[16px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.12] shadow-[var(--shadow-popover)] overflow-hidden text-left">
                    <div className="py-1.5">
                      {options.map((opt) => {
                        const OptIcon = opt.Icon;
                        const active = opt.id === travelMode;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTravelMode(opt.id);
                              setIsTravelDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 flex items-center justify-between gap-2.5 text-[13.5px] cursor-pointer transition-colors tabular-nums ${
                              active
                                ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                                : "font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]/70"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2.5">
                              <OptIcon
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.1}
                              />
                              <span>{isTh ? opt.labelTh : opt.labelEn}</span>
                            </span>
                            {active && (
                              <Check
                                className="w-3.5 h-3.5 shrink-0"
                                strokeWidth={2.4}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-3.5 py-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "เวลาทั้งหมดเป็นค่าโดยประมาณ"
                        : "All times are approximate"}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTravelDropdownOpen(true);
                    }}
                    aria-label={isTh ? "เลือกวิธีเดินทาง" : "Change travel mode"}
                    className="h-9 px-3 rounded-[12px] bg-[var(--color-background-popover)] hover:bg-[var(--color-background-muted)] border border-black/[0.06] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors tabular-nums"
                  >
                    <ActiveIcon
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={2.2}
                    />
                    <span>{isTh ? activeOpt.labelTh : activeOpt.labelEn}</span>
                    <ChevronDown
                      className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0"
                      strokeWidth={2.3}
                    />
                  </button>
                )}
              </div>,
              travelOverlayHost
            );
          })()}

        {/* ===================================================================
            TABLET & DESKTOP (>= md / 768px): AIRBNB FLOATING TOP-LEFT CARD
        ==================================================================== */}
        <div className="hidden md:flex flex-col absolute top-4 left-4 z-30 w-[326px] lg:w-[356px] max-h-[calc(100%-32px)] pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runTextSearch(searchInput);
              }}
              className="flex-1 h-12 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.12] shadow-[var(--shadow-popover)] px-3.5 flex items-center gap-2.5 focus-within:border-[var(--color-text-primary)]"
            >
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <input
                type="text"
                value={searchInput}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  if (activeCategory) setActiveCategory(null);
                  if (!val.trim()) {
                    setActiveSearchQuery("");
                    setFetchedPlaces([]);
                    setSelectedPlaceId(null);
                  }
                }}
                placeholder={
                  isTh
                    ? "ค้นหาร้านอาหาร คาเฟ่ 7-Eleven ปั๊ม EV..."
                    : "Search restaurants, cafes, 7-Eleven..."
                }
                className="flex-1 min-w-0 bg-transparent border-0 text-[14px] font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />
              {(isFetchingPlaces || isLoadingBasePlace) && (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-secondary)] shrink-0" />
              )}
            </form>

            {(hasActiveFilter || searchInput || selectedPlace || isSearchFocused) && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label={isTh ? "ล้างการค้นหา" : "Clear search"}
                className="h-12 w-12 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {desktopPanelPresence.shouldRender && (
            <div
              data-state={desktopPanelPresence.dataState}
              className="cgr-popover-motion mt-2.5 rounded-[20px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden flex flex-col min-h-0"
            >
              {!selectedPlace && !showAutocompleteDropdown && !hasActiveFilter && (
                <div className="px-4 pt-3 pb-2 border-b border-[var(--color-border)]">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                    {hotelName}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
                    {isTh
                      ? "เลือกหมวดที่สนใจ หรือพิมพ์ค้นหาสถานที่รอบที่พัก"
                      : "Pick a category or search places nearby"}
                  </p>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto max-h-[min(480px,calc(88vh-150px))]">
                {activeDetailPlace && (selectedPlace || !desktopPanelOpen)
                  ? renderPlaceDetailCard(activeDetailPlace, "desktop")
                  : showAutocompleteDropdown
                  ? renderAutocompleteList()
                  : hasActiveFilter
                  ? renderResultsList(false)
                  : renderCategoryMenu()}
              </div>

              {providerNotice === "osm" && hasActiveFilter && !selectedPlace && (
                <div className="px-4 py-1.5 border-t border-[var(--color-border)] text-[10.5px] text-[var(--color-text-tertiary)]">
                  © OpenStreetMap contributors
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===================================================================
            MOBILE (< md / < 768px): CONTINUOUSLY MORPHING AIRBNB SHEET + POI CARD
            - ONE persistent `.cgr-map-mobile-sheet` glides smoothly between:
              Idle (158px) <-> Full-Height Search (calc(100dvh - 14px)) <->
              Collapsed (86px) / Half (48dvh) / Full Results + 1:1 Finger Drag!
            - Separate `.cgr-floating-card-motion` POI Detail Card glides UP/DOWN
              smoothly via `useModalPresence` while keeping photo intact during exit.
        ==================================================================== */}
        <div className="md:hidden">
          {/* FLOATING VERTICAL POI DETAIL CARD (2-Frame Enter & Exit Glide) */}
          {mobilePoiPresence.shouldRender && activeDetailPlace && (
            <div
              data-state={mobilePoiPresence.dataState}
              className="cgr-floating-card-motion absolute left-3.5 right-3.5 bottom-[max(26px,env(safe-area-inset-bottom))] z-40 rounded-[24px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden"
            >
              {renderPlaceDetailCard(activeDetailPlace, "mobile")}
            </div>
          )}

          {/* PERSISTENT CONTINUOUS MULTI-DETENT MOBILE SHEET (Smooth iOS Glide!) */}
          <div
            data-dragging={isDraggingSheet ? "true" : "false"}
            style={mobileSheetStyle}
            className="cgr-map-mobile-sheet absolute z-40 bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
          >
            {/* Interactive 1:1 Finger-Tracking Grab Handle */}
            <button
              type="button"
              onClick={cycleMobileSheetSnap}
              onTouchStart={handleSheetHandleTouchStart}
              onTouchMove={handleSheetHandleTouchMove}
              onTouchEnd={handleSheetHandleTouchEnd}
              aria-label={
                isSearchFocused
                  ? isTh
                    ? "ปิดหน้าค้นหา"
                    : "Close search"
                  : isTh
                  ? "ปรับขนาดแถบค้นหา"
                  : "Resize sheet"
              }
              className="w-full pt-2.5 pb-1.5 flex justify-center shrink-0 cursor-pointer touch-none"
            >
              <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
            </button>

            {/* Unified Top Search Row (Rides Smoothly All The Way Up & Down Inside The Same Sheet!) */}
            <div className="px-3.5 pb-3 flex items-center gap-2 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mobileSearchInputRef.current?.blur();
                  void runTextSearch(searchInput);
                }}
                className={`flex-1 min-w-0 h-12 rounded-[14px] bg-[var(--color-background-card)] border px-3.5 flex items-center gap-2.5 transition-colors duration-200 ${
                  isSearchFocused
                    ? "border-[var(--color-text-primary)]"
                    : "border-[var(--color-border-emphasized)]"
                }`}
              >
                <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchInput}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchInput(val);
                    if (activeCategory) setActiveCategory(null);
                    if (!val.trim()) {
                      setActiveSearchQuery("");
                      setFetchedPlaces([]);
                    }
                  }}
                  placeholder={
                    isSearchFocused
                      ? isTh
                        ? "ค้นหาบนแผนที่..."
                        : "Search the map"
                      : isTh
                      ? "ค้นหาร้านอาหาร คาเฟ่ 7-Eleven..."
                      : "Find restaurants, cafes, 7-Eleven..."
                  }
                  className="flex-1 min-w-0 bg-transparent border-0 text-[15px] font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                />
                {(isFetchingPlaces || isLoadingBasePlace) && (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-secondary)] shrink-0" />
                )}
                {isSearchFocused && searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setActiveCategory(null);
                      setActiveSearchQuery("");
                      setAutocompleteItems([]);
                      mobileSearchInputRef.current?.focus({ preventScroll: true });
                    }}
                    aria-label={isTh ? "ล้างข้อความ" : "Clear text"}
                    className="h-6 w-6 rounded-[7px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Smoothly Expanding Close/Clear X Button */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 ${
                  isSearchFocused || hasActiveFilter
                    ? "w-12 opacity-100"
                    : "w-0 opacity-0 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  tabIndex={isSearchFocused || hasActiveFilter ? 0 : -1}
                  onClick={() => {
                    mobileSearchInputRef.current?.blur();
                    if (isSearchFocused) {
                      setIsSearchFocused(false);
                    } else {
                      handleClearSearch();
                    }
                  }}
                  aria-label={
                    isSearchFocused
                      ? isTh
                        ? "ปิดการค้นหา"
                        : "Close search"
                      : isTh
                      ? "ล้างการค้นหา"
                      : "Clear search"
                  }
                  className="h-12 w-12 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* Dynamic Sheet Body (Smooth Content Fade-Rise Inside Continuous Sheet) */}
            {isSearchFocused ? (
              <div
                key="mobile-body-search"
                className="cgr-sheet-content-in flex-1 min-h-0 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              >
                {searchInput.trim().length >= 2 ? (
                  renderAutocompleteList()
                ) : (
                  <div className="px-4 pt-1 flex flex-wrap gap-2.5">
                    {visibleCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            mobileSearchInputRef.current?.blur();
                            handleSelectCategory(cat.id);
                          }}
                          className="h-12 pl-2 pr-4 rounded-[14px] bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <span
                            style={{ backgroundColor: cat.color }}
                            className="h-8 w-8 rounded-full text-white inline-flex items-center justify-center shrink-0"
                          >
                            <Icon className="w-4 h-4" strokeWidth={2.1} />
                          </span>
                          <span>{isTh ? cat.th : cat.en}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : hasActiveFilter ? (
              mobileSheetSnap !== "collapsed" && (
                <div
                  key="mobile-body-results"
                  className="cgr-sheet-content-in flex-1 min-h-0 overflow-y-auto pb-2"
                >
                  {renderResultsList(true)}
                </div>
              )
            ) : (
              <div
                key="mobile-body-idle"
                className="cgr-sheet-content-in px-3.5 pb-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-px-3.5 shrink-0"
              >
                {visibleCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className="h-11 pl-1.5 pr-3.5 rounded-[13px] bg-[var(--color-background-card)] border border-black/[0.07] dark:border-white/[0.12] hover:bg-[var(--color-background-muted)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <span
                        style={{ backgroundColor: cat.color }}
                        className="h-8 w-8 rounded-full text-white inline-flex items-center justify-center shrink-0"
                      >
                        <Icon className="w-4 h-4" strokeWidth={2.1} />
                      </span>
                      <span>{isTh ? cat.th : cat.en}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
