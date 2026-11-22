"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Globe,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { STAY_STYLE_TABS } from "@/data/thailandProvinces";
import {
  getRecentViewedPinIds,
  RECENT_VIEWS_UPDATED_EVENT,
  recordRecentViewedPinId,
} from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
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
  getDealDiscountHeadline,
  VerticalCouponCard,
} from "@/components/home/VerticalCouponCard";
import { PinterestPinDetail } from "@/components/home/PinterestPinDetail";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

type DealSourceFilter = "ALL" | "INTERNAL" | "EXTERNAL";

interface MapBoundsBox {
  north: number;
  south: number;
  east: number;
  west: number;
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

export interface ExploreMapClientProps {
  initialDeals: PinFeedItemDto[];
  initialStyle?: string;
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
    openAuthModal,
    savedPinIds: globalSavedPinIds,
    triggerPinToBoard,
    togglePinLikeInstant,
  } = useHotelApp();

  const isTh = language === "th";
  const isDark = theme === "dark";

  const [allDeals, setAllDeals] = useState<PinFeedItemDto[]>(() =>
    dedupeDealsByHotel(initialDeals)
  );
  const [activeStyle, setActiveStyle] = useState<string>(initialStyle);
  const [sourceFilter, setSourceFilter] =
    useState<DealSourceFilter>(initialSource);
  const [provinceFilter, setProvinceFilter] = useState<string | null>(
    initialProvince
  );
  const [recentOnly, setRecentOnly] = useState<boolean>(initialRecentOnly);
  const [recentPinIds, setRecentPinIds] = useState<string[]>(initialRecentPinIds);
  const [mapBounds, setMapBounds] = useState<MapBoundsBox | null>(null);
  const [hasUserMovedMap, setHasUserMovedMap] = useState<boolean>(false);

  const [hoveredDealId, setHoveredDealId] = useState<string | null>(null);
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);

  // User GPS Location State (Shows blue dot on map + "My Location" button)
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Viewport awareness so Desktop (>= lg) renders in-place map card while Mobile/Tablet (< lg) renders Airbnb Image 6 bottom preview card
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const isDesktopViewportRef = useRef<boolean>(isDesktopViewport);
  isDesktopViewportRef.current = isDesktopViewport;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Strictly 2-state Mobile/Tablet Bottom Sheet with 60fps translate3d slide animation
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isDesktopMapExpanded, setIsDesktopMapExpanded] = useState(false);

  // Deal Detail Modal Stage
  const [openDetailPin, setOpenDetailPin] = useState<PinFeedItemDto | null>(
    null
  );
  const [openDetailData, setOpenDetailData] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; btn: HTMLButtonElement }>
  >(new Map());
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const desktopFocusedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [desktopPopupContainer, setDesktopPopupContainer] =
    useState<HTMLDivElement | null>(null);
  const suppressNextBoundsSyncRef = useRef<boolean>(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useBodyScrollLock(Boolean(openDetailPin) || isMobileFilterOpen);

  useEffect(() => {
    if (initialQuery && !globalSearchQuery) {
      setGlobalSearchQuery(initialQuery);
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
        // permissions API unavailable (e.g. older Safari) — user can tap GPS button anytime
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

  // Apply attribute filters (recent, style, source, province, search query) before geographic bounds
  const attributeFilteredDeals = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const recentOrder = recentOnly
      ? new Map(recentPinIds.map((id, idx) => [id, idx]))
      : null;

    const filtered = allDeals.filter((d) => {
      if (recentOrder && !recentOrder.has(d.id)) {
        return false;
      }
      if (sourceFilter !== "ALL" && d.dealSourceType !== sourceFilter) {
        return false;
      }
      if (activeStyle !== "all" && !d.stayStyles.includes(activeStyle)) {
        return false;
      }
      if (provinceFilter && d.provinceId !== provinceFilter) {
        return false;
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
    sourceFilter,
    activeStyle,
    provinceFilter,
    globalSearchQuery,
  ]);

  // Apply live Map Viewport Bounds filtering whenever the user manually pans/zooms the map
  const visibleDeals = useMemo(() => {
    if (!mapBounds || !hasUserMovedMap) {
      return attributeFilteredDeals;
    }
    return attributeFilteredDeals.filter((d) => {
      if (
        typeof d.hotelLatitude !== "number" ||
        typeof d.hotelLongitude !== "number"
      ) {
        return false;
      }
      return (
        d.hotelLatitude <= mapBounds.north &&
        d.hotelLatitude >= mapBounds.south &&
        d.hotelLongitude <= mapBounds.east &&
        d.hotelLongitude >= mapBounds.west
      );
    });
  }, [attributeFilteredDeals, mapBounds, hasUserMovedMap]);

  const focusedDeal = useMemo(
    () =>
      focusedPinId
        ? attributeFilteredDeals.find((d) => d.id === focusedPinId) ?? null
        : null,
    [focusedPinId, attributeFilteredDeals]
  );

  // Initialize Standard World MapLibre GL Vector Map (Zero Edge Locking!) + Native Touch Gestures
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;
    let moveTimer: number | null = null;

    const initMap = async () => {
      ensureMapLibreWorker();
      const style = await getAirbnbVectorMapStyle(isDark);
      if (cancelled || !mapContainerRef.current) return;

      const startCenter: [number, number] = initialCenter
        ? [initialCenter.lng, initialCenter.lat]
        : THAILAND_DEFAULT_CENTER;
      const startZoom = initialCenter ? 11.2 : THAILAND_DEFAULT_ZOOM;

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

      const syncBounds = (markUserMoved: boolean) => {
        if (!mapInstance) return;
        const b = mapInstance.getBounds();
        setMapBounds({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
        if (markUserMoved) {
          setHasUserMovedMap(true);
        }
      };

      mapInstance.on("load", () => {
        if (cancelled) return;
        setIsMapReady(true);
        syncBounds(Boolean(initialCenter));
      });

      mapInstance.on("dragstart", () => {
        suppressNextBoundsSyncRef.current = false;
      });

      mapInstance.on("click", () => {
        setFocusedPinId(null);
      });

      mapInstance.on("moveend", () => {
        if (moveTimer !== null) window.clearTimeout(moveTimer);
        if (suppressNextBoundsSyncRef.current) {
          suppressNextBoundsSyncRef.current = false;
          return;
        }
        moveTimer = window.setTimeout(() => {
          syncBounds(true);
        }, 90);
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
      if (moveTimer !== null) window.clearTimeout(moveTimer);
      for (const entry of markersRef.current.values()) {
        entry.marker.remove();
      }
      markersRef.current.clear();
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (desktopFocusedMarkerRef.current) {
        desktopFocusedMarkerRef.current.remove();
        desktopFocusedMarkerRef.current = null;
      }
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      setDesktopPopupContainer(null);
      setIsMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Render Current User GPS Blue Dot + Accuracy Halo on the Map
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
    wrapper.title = isTh ? "ตำแหน่งปัจจุบันของคุณ" : "Your current location";
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

  // Go to User Current GPS Location Button Handler
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
        map.flyTo({
          center: [nextCoords.lng, nextCoords.lat],
          zoom: Math.max(map.getZoom(), 12.2),
          duration: 620,
        });
      },
      (err) => {
        setIsLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNotice(
            isTh
              ? "กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์"
              : "Please allow location access in your browser"
          );
        } else {
          setLocationNotice(
            isTh
              ? "ไม่สามารถดึงตำแหน่งปัจจุบันได้ในขณะนี้"
              : "Unable to get your current location right now"
          );
        }
        window.setTimeout(() => setLocationNotice(null), 3800);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [isTh]);

  // Fit map cleanly to filtered deals when resetting area/filters
  const fitMapToDeals = useCallback((dealsToFit: PinFeedItemDto[]) => {
    const map = mapRef.current;
    if (!map) return;
    const withCoords = dealsToFit.filter(
      (d) =>
        typeof d.hotelLatitude === "number" &&
        typeof d.hotelLongitude === "number"
    );
    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      suppressNextBoundsSyncRef.current = true;
      map.flyTo({
        center: [withCoords[0].hotelLongitude!, withCoords[0].hotelLatitude!],
        zoom: 12.2,
        duration: 500,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const d of withCoords) {
      bounds.extend([d.hotelLongitude!, d.hotelLatitude!]);
    }
    suppressNextBoundsSyncRef.current = true;
    map.fitBounds(bounds, {
      padding: { top: 64, bottom: 90, left: 48, right: 48 },
      maxZoom: 12.5,
      duration: 520,
    });
  }, []);

  // Render floating Warm Minimal Price Pins on the Map
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

      const btn = document.createElement("button");
      btn.type = "button";
      const priceLabel = deal.promoDealPriceThb ?? deal.nightlyPriceThb;
      const chipText = priceLabel
        ? `฿${priceLabel.toLocaleString()}`
        : getDealDiscountHeadline(deal, language);

      btn.textContent = chipText;
      btn.setAttribute("aria-label", `${deal.hotelNameTh} ${chipText}`);
      btn.style.cssText = `
        background: ${isDark ? "#222222" : "#ffffff"};
        color: ${isDark ? "#f5f5f5" : "#222222"};
        border: 1px solid ${isDark ? "#444444" : "rgba(0,0,0,0.08)"};
        border-radius: 10px;
        padding: 5px 10px;
        font-size: 13px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
      `;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setFocusedPinId(deal.id);

        if (
          typeof deal.hotelLatitude === "number" &&
          typeof deal.hotelLongitude === "number"
        ) {
          const point = map.project([deal.hotelLongitude, deal.hotelLatitude]);
          const width = mapContainerRef.current?.clientWidth || window.innerWidth;
          const height =
            mapContainerRef.current?.clientHeight || window.innerHeight;

          if (isDesktopViewportRef.current) {
            // Desktop: Keep card list flicker-free and gently pan if popup would clip top/side edges
            if (point.y < 320 || point.x < 145 || point.x > width - 145) {
              suppressNextBoundsSyncRef.current = true;
              map.easeTo({
                center: [deal.hotelLongitude, deal.hotelLatitude],
                offset: [0, 125],
                duration: 360,
              });
            }
          } else {
            // Mobile/Tablet (< lg): Ensure selected charcoal price pin sits cleanly ABOVE the Airbnb-style bottom preview card!
            const bottomClearanceY = height - 340;
            if (point.y < 80 || point.y > bottomClearanceY) {
              suppressNextBoundsSyncRef.current = true;
              map.easeTo({
                center: [deal.hotelLongitude, deal.hotelLatitude],
                offset: [0, -Math.round(height * 0.18)],
                duration: 360,
              });
            }
          }
        }
      });

      const marker = new maplibregl.Marker({ element: btn })
        .setLngLat([deal.hotelLongitude, deal.hotelLatitude])
        .addTo(map);

      markersRef.current.set(deal.id, { marker, btn });
    }
  }, [attributeFilteredDeals, isMapReady, isDark, language]);

  // Synchronize active/hovered price pill markers
  // Desktop: hide raw price pill when expanded in-place; Mobile: keep highlighted charcoal price pill visible!
  useEffect(() => {
    for (const [id, { marker, btn }] of markersRef.current.entries()) {
      const isFocused = id === focusedPinId;
      btn.style.display = isFocused && isDesktopViewport ? "none" : "";

      const active = id === hoveredDealId || isFocused;
      btn.style.background = active
        ? isDark
          ? "#f5f5f5"
          : "#222222"
        : isDark
        ? "#222222"
        : "#ffffff";
      btn.style.color = active
        ? isDark
          ? "#222222"
          : "#ffffff"
        : isDark
        ? "#f5f5f5"
        : "#222222";
      btn.style.borderColor = active
        ? isDark
          ? "#f5f5f5"
          : "#222222"
        : isDark
        ? "#444444"
        : "rgba(0,0,0,0.08)";
      marker.getElement().style.zIndex = active ? "35" : "1";
    }
  }, [hoveredDealId, focusedPinId, isDark, isDesktopViewport]);

  // Mount Desktop-Only Proportioned Standardized VerticalCouponCard Inside MapLibre Marker
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapReady ||
      !isDesktopViewport ||
      !focusedDeal ||
      typeof focusedDeal.hotelLatitude !== "number" ||
      typeof focusedDeal.hotelLongitude !== "number"
    ) {
      if (desktopFocusedMarkerRef.current) {
        desktopFocusedMarkerRef.current.remove();
        desktopFocusedMarkerRef.current = null;
      }
      setDesktopPopupContainer(null);
      return;
    }

    const el = document.createElement("div");
    el.style.zIndex = "45";
    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([focusedDeal.hotelLongitude, focusedDeal.hotelLatitude])
      .addTo(map);
    marker.getElement().style.zIndex = "45";
    desktopFocusedMarkerRef.current = marker;
    setDesktopPopupContainer(el);

    return () => {
      marker.remove();
      if (desktopFocusedMarkerRef.current === marker) {
        desktopFocusedMarkerRef.current = null;
      }
      setDesktopPopupContainer(null);
    };
  }, [
    focusedDeal?.id,
    focusedDeal?.hotelLatitude,
    focusedDeal?.hotelLongitude,
    isMapReady,
    isDesktopViewport,
  ]);

  // Load full detail + comments when opening a Deal Detail
  const loadDealDetail = useCallback(async (pin: PinFeedItemDto) => {
    recordRecentViewedPinId(pin.id);
    setOpenDetailPin(pin);
    setOpenDetailData(null);
    try {
      const res = await fetch(`/api/pins/${encodeURIComponent(pin.id)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          pin: PinFeedItemDto;
          comments: PinCommentDto[];
          relatedPins: PinFeedItemDto[];
        };
        setOpenDetailData(data);
      }
    } catch {
      // keep snapshot
    }
  }, []);

  const handleToggleSave = async (pinId: string) => {
    const target = allDeals.find((d) => d.id === pinId) ?? openDetailPin;
    if (!target) return;
    const result = await triggerPinToBoard({
      id: target.id,
      coverImageUrl: target.coverImageUrl,
      isSavedByMe: globalSavedPinIds.has(target.id) || target.isSavedByMe,
    });
    if (!result) return;
    setAllDeals((prev) =>
      prev.map((d) =>
        d.id === pinId ? { ...d, isSavedByMe: result.isSaved } : d
      )
    );
  };

  const handleToggleLike = (pinId: string) => {
    const target = allDeals.find((d) => d.id === pinId) ?? openDetailPin;
    if (!target) return;
    togglePinLikeInstant({
      id: target.id,
      isLikedByMe: target.isLikedByMe,
      likesCount: target.likesCount,
    });
  };

  const handleAddComment = async (text: string, parentId?: string | null) => {
    if (!openDetailPin) return;
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อแสดงความคิดเห็น",
        reasonEn: "Log in to post a comment",
        onSuccess: async () => {
          const res = await fetch(
            `/api/pins/${encodeURIComponent(openDetailPin.id)}/comments`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: text, parentId }),
            }
          );
          if (res.ok) await loadDealDetail(openDetailPin);
        },
      });
      return;
    }
    const res = await fetch(
      `/api/pins/${encodeURIComponent(openDetailPin.id)}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId }),
      }
    );
    if (res.ok) await loadDealDetail(openDetailPin);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!openDetailPin) return;
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    if (res.ok) await loadDealDetail(openDetailPin);
  };

  const handleResetArea = () => {
    setHasUserMovedMap(false);
    setFocusedPinId(null);
    setProvinceFilter(null);
    fitMapToDeals(attributeFilteredDeals);
  };

  const handleResetAllFilters = () => {
    setActiveStyle("all");
    setSourceFilter("ALL");
    setProvinceFilter(null);
    setRecentOnly(false);
    setGlobalSearchQuery("");
    setHasUserMovedMap(false);
    setFocusedPinId(null);
    fitMapToDeals(allDeals);
  };

  const hasActiveFilters =
    recentOnly ||
    sourceFilter !== "ALL" ||
    activeStyle !== "all" ||
    Boolean(provinceFilter);

  const summaryTitle = useMemo(() => {
    if (globalSearchQuery.trim()) {
      return isTh
        ? `โปรที่พัก "${globalSearchQuery.trim()}"`
        : `Deals for "${globalSearchQuery.trim()}"`;
    }
    if (recentOnly) {
      return isTh ? "ที่พักที่ดูล่าสุด" : "Recently viewed stays";
    }
    if (activeStyle !== "all") {
      const tab = STAY_STYLE_TABS.find((t) => t.id === activeStyle);
      if (tab) return isTh ? `โปร${tab.labelTh}` : tab.labelEn;
    }
    if (sourceFilter === "INTERNAL") {
      return isTh ? "โปรจองตรง 0% GP" : "Direct 0% GP deals";
    }
    if (sourceFilter === "EXTERNAL") {
      return isTh ? "ดีลคัดพิเศษจากเว็บอื่น" : "External stay deals";
    }
    return isTh ? "โปรที่พักทั่วไทย" : "Stay deals across Thailand";
  }, [globalSearchQuery, recentOnly, activeStyle, sourceFilter, isTh]);

  const activeOpenDetail = openDetailData?.pin ?? openDetailPin;

  // Smooth 60fps translate3d transform for Mobile/Tablet 2-State Bottom Sheet
  const mobileSheetTransform = focusedDeal
    ? "translate3d(0, 100%, 0)"
    : isMobileSheetOpen
    ? "translate3d(0, 0, 0)"
    : "translate3d(0, calc(100% - 126px - env(safe-area-inset-bottom)), 0)";

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-[var(--color-background-body)] lg:flex">
      {/* ===================================================================
          DESKTOP LEFT COLUMN: AIRBNB 50/50 SPLIT CAPPED AT max-w-[848px]
          1024–1619px: 50% Left (2 fluid 4:3 cols) | 50% Right Rounded Map
          1620–1768px: 50% Left (3 fluid 4:3 cols) | 50% Right Rounded Map
          1769px+ Ultrawide: Left caps at 848px (3 cols @ 256px max) | Right Map flex-1 expands!
      ==================================================================== */}
      <section
        className={`hidden ${
          isDesktopMapExpanded
            ? "lg:hidden"
            : "lg:flex lg:w-1/2 lg:max-w-[848px] lg:shrink-0"
        } flex-col h-full min-h-0`}
      >
        {/* Clean Minimal Filter Header */}
        <div className="shrink-0 px-6 pt-4 pb-3.5 border-b border-[var(--color-border)] space-y-3 bg-[var(--color-background-body)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href="/"
                aria-label={isTh ? "กลับหน้าแรก" : "Back to home"}
                className="h-8 w-8 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] truncate">
                  {summaryTitle} ·{" "}
                  <span className="tabular-nums">{visibleDeals.length}</span>{" "}
                  {isTh ? "โปร" : "deals"}
                </h1>
              </div>
            </div>

            {hasUserMovedMap && (
              <button
                type="button"
                onClick={handleResetArea}
                className="text-[13px] font-medium text-[var(--color-text-primary)] underline underline-offset-4 hover:opacity-75 shrink-0 cursor-pointer"
              >
                {isTh ? "ดูทั่วไทย" : "Show all Thailand"}
              </button>
            )}
          </div>

          {/* Compact Source + Style Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {recentOnly && (
              <button
                type="button"
                onClick={() => setRecentOnly(false)}
                className="h-8 px-3 rounded-[9px] text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] inline-flex items-center gap-1.5"
              >
                <span>{isTh ? "ดูล่าสุด" : "Recently viewed"}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {(
              [
                { id: "ALL", th: "ทุกแหล่ง", en: "All" },
                { id: "INTERNAL", th: "จองตรง 0% GP", en: "Direct 0% GP" },
                { id: "EXTERNAL", th: "ดีลจากเว็บอื่น", en: "External" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSourceFilter(opt.id)}
                className={`h-8 px-3 rounded-[9px] text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  sourceFilter === opt.id
                    ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {isTh ? opt.th : opt.en}
              </button>
            ))}

            <span
              aria-hidden="true"
              className="h-4 w-px bg-[var(--color-border-emphasized)] mx-1 shrink-0"
            />

            {STAY_STYLE_TABS.filter((t) => t.id !== "all").map((tab) => {
              const active = activeStyle === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveStyle((prev) => (prev === tab.id ? "all" : tab.id))
                  }
                  className={`h-8 px-3 rounded-[9px] text-[12.5px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {isTh ? tab.labelTh : tab.labelEn}
                </button>
              );
            })}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="ml-1 text-[12.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-4 shrink-0 cursor-pointer"
              >
                {isTh ? "ล้างตัวกรอง" : "Reset"}
              </button>
            )}
          </div>
        </div>

        {/* Independent Scrollable Ratio-Locked Vertical Grid (100% Edge-to-Edge!) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {visibleDeals.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3 mt-4">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? "ยังไม่มีโปรที่พักในบริเวณแผนที่นี้"
                  : "No stay deals in this map area"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                {isTh
                  ? "ลองซูมออกหรือกดดูโปรทั้งหมดทั่วไทย"
                  : "Try zooming out or resetting the map area."}
              </p>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="btn-round-solid inline-flex"
              >
                {isTh ? "ดูโปรทั้งหมดทั่วไทย" : "Show all deals"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 2xl:grid-cols-3 gap-4 pb-8">
              {visibleDeals.map((deal, idx) => (
                <VerticalCouponCard
                  key={deal.id}
                  pin={deal}
                  language={language}
                  priority={idx < 8}
                  isSaved={globalSavedPinIds.has(deal.id)}
                  enablePhotoSlide={true}
                  isHighlighted={
                    hoveredDealId === deal.id || focusedPinId === deal.id
                  }
                  onSelect={(p) => void loadDealDetail(p)}
                  onToggleSave={handleToggleSave}
                  onMouseEnter={(p) => setHoveredDealId(p.id)}
                  onMouseLeave={() => setHoveredDealId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================
          INTERACTIVE VECTOR MAP STAGE
          Desktop (>= lg): Airbnb Floating Rounded Map Card on RIGHT (or Full-Width When Expanded!)
          Mobile/Tablet (< lg): Full-Bleed Map + Smooth 2-State Sheet / Airbnb Bottom Preview Card
      ==================================================================== */}
      <section
        className={`relative w-full h-full ${
          isDesktopMapExpanded
            ? "lg:flex-1 lg:p-4"
            : "lg:flex-1 lg:min-w-0 lg:py-4 lg:pr-5 lg:pl-2"
        }`}
      >
        <div className="relative isolate w-full h-full lg:rounded-[20px] overflow-hidden bg-[var(--color-background-muted)]">
          <div ref={mapContainerRef} className="relative z-0 w-full h-full touch-none" />

          {/* Desktop-Only Proportioned Standardized VerticalCouponCard Anchored In-Place on Map */}
          {isDesktopViewport &&
            desktopPopupContainer &&
            focusedDeal &&
            createPortal(
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center drop-shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
              >
                <div className="w-[252px]">
                  <VerticalCouponCard
                    pin={focusedDeal}
                    language={language}
                    isSaved={globalSavedPinIds.has(focusedDeal.id)}
                    enablePhotoSlide={true}
                    onClose={() => setFocusedPinId(null)}
                    onSelect={(p) => void loadDealDetail(p)}
                    onToggleSave={handleToggleSave}
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="w-3 h-3 -mt-[6px] rotate-45 bg-[var(--color-background-card)] border-r border-b border-[var(--color-border-emphasized)]"
                />
              </div>,
              desktopPopupContainer
            )}

          {/* Mobile/Tablet Compact Top-Left Back Icon */}
          <Link
            href="/"
            aria-label={isTh ? "กลับหน้าแรก" : "Back to home"}
            className="lg:hidden absolute top-3 left-3 z-20 h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] inline-flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </Link>

          {/* Mobile/Tablet Compact Top-Right Filter Icon */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label={isTh ? "กรองโปรบนแผนที่" : "Filter deals"}
            className="lg:hidden absolute top-3 right-3 z-20 h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2.1} />
            {hasActiveFilters && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#e60023]"
              />
            )}
          </button>

          {/* Desktop Floating Top-Left Status Pill */}
          <div className="hidden lg:flex absolute top-3.5 left-3.5 z-20 items-center gap-2">
            <span className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-popover)]/95 backdrop-blur-md border border-[var(--color-border)] shadow-[var(--shadow-popover)] text-[12.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 tabular-nums">
              <MapIcon className="w-3.5 h-3.5" />
              <span>
                {isTh
                  ? `แสดง ${visibleDeals.length} โปรในกรอบแผนที่`
                  : `${visibleDeals.length} deals in map area`}
              </span>
            </span>
          </div>

          {/* Right Map Controls: Expand/Collapse (Desktop Airbnb Style) | Zoom (+ / -) | My GPS | Fit Thailand */}
          <div className="absolute right-3 top-[60px] lg:top-3.5 z-20 flex flex-col gap-2">
            {/* Desktop Expand / Collapse Full-Width Map Toggle (Airbnb Top-Right Icon!) */}
            <button
              type="button"
              onClick={() => setIsDesktopMapExpanded((prev) => !prev)}
              title={
                isDesktopMapExpanded
                  ? isTh
                    ? "แสดงรายการด้านข้าง"
                    : "Show list"
                  : isTh
                  ? "ขยายแผนที่เต็มจอ"
                  : "Expand map"
              }
              aria-label={
                isDesktopMapExpanded
                  ? isTh
                    ? "แสดงรายการด้านข้าง"
                    : "Show list"
                  : isTh
                  ? "ขยายแผนที่เต็มจอ"
                  : "Expand map"
              }
              className="hidden lg:inline-flex h-9 w-9 rounded-[10px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] items-center justify-center cursor-pointer transition-colors"
            >
              {isDesktopMapExpanded ? (
                <Minimize2 className="w-4 h-4" strokeWidth={2.1} />
              ) : (
                <Maximize2 className="w-4 h-4" strokeWidth={2.1} />
              )}
            </button>

            <div className="flex flex-col rounded-[10px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] overflow-hidden">
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
                aria-label={isTh ? "ซูมเข้า" : "Zoom in"}
                className="h-9 w-9 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] border-b border-[var(--color-border)] cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
                aria-label={isTh ? "ซูมออก" : "Zoom out"}
                className="h-9 w-9 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Go to User's Current GPS Location */}
            <button
              type="button"
              onClick={handleLocateMyPosition}
              disabled={isLocatingUser}
              title={isTh ? "ตำแหน่งปัจจุบันของฉัน" : "My current location"}
              aria-label={isTh ? "ตำแหน่งปัจจุบันของฉัน" : "My current location"}
              className={`h-9 w-9 rounded-[10px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors ${
                userCoords
                  ? "text-[#2563EB]"
                  : "text-[var(--color-text-primary)]"
              }`}
            >
              {isLocatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" strokeWidth={2.1} />
              )}
            </button>

            {/* Fit All Deals Across Thailand */}
            <button
              type="button"
              onClick={handleResetArea}
              title={isTh ? "ดูโปรทั้งหมดทั่วไทย" : "Fit all deals in Thailand"}
              aria-label={isTh ? "ดูโปรทั้งหมดทั่วไทย" : "Fit all deals in Thailand"}
              className="h-9 w-9 rounded-[10px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <Globe className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Subtle Location Permission Notice Toast */}
          {locationNotice && (
            <div className="absolute top-16 lg:top-16 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-32px)] px-3.5 py-2 rounded-[10px] bg-[#222222] text-white text-[12px] font-medium shadow-[var(--shadow-popover)] whitespace-nowrap truncate">
              {locationNotice}
            </div>
          )}

          {/* =================================================================
              MOBILE / TABLET (< lg): AIRBNB IMAGE 6 BOTTOM PREVIEW CARD
              Shown smoothly when tapping a price pill on the map!
          ================================================================== */}
          {!isDesktopViewport && focusedDeal && (
            <div className="lg:hidden absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 pointer-events-none">
              <div className="pointer-events-auto w-[252px] sm:w-[264px] rounded-[16px] shadow-[var(--shadow-popover)] animate-slide-up-sheet">
                <VerticalCouponCard
                  pin={focusedDeal}
                  language={language}
                  isSaved={globalSavedPinIds.has(focusedDeal.id)}
                  enablePhotoSlide={true}
                  onClose={() => setFocusedPinId(null)}
                  onSelect={(p) => void loadDealDetail(p)}
                  onToggleSave={handleToggleSave}
                />
              </div>
            </div>
          )}

          {/* =================================================================
              MOBILE / TABLET (< lg): SMOOTH 60FPS 2-STATE BOTTOM SHEET
              Animated strictly via GPU transform: translate3d (Silky Slide-In / Slide-Out!)
          ================================================================== */}
          <div
            style={{ transform: mobileSheetTransform }}
            className="lg:hidden absolute inset-x-0 bottom-0 z-30 h-[56%] flex flex-col rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          >
            {/* Grab Handle + Smooth 2-State Toggle Header */}
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen((prev) => !prev)}
              className="w-full shrink-0 pt-2.5 pb-3 px-4 flex flex-col items-center gap-1.5 cursor-pointer border-b border-[var(--color-border)] touch-manipulation select-none"
            >
              <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
              <div className="w-full flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
                  {isTh
                    ? `${visibleDeals.length} โปรในพื้นที่แผนที่นี้`
                    : `${visibleDeals.length} deals in this area`}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
                  <span>
                    {isMobileSheetOpen
                      ? isTh
                        ? "ซ่อน"
                        : "Hide"
                      : isTh
                      ? "ดูรายการ"
                      : "Show list"}
                  </span>
                  {isMobileSheetOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
            </button>

            {/* Ratio-Locked Edge-to-Edge Vertical Grid (2-Col Mobile | 3-Col Tablet — ZERO Side Whitespace!) */}
            <div
              aria-hidden={!isMobileSheetOpen}
              className={`flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-5 pt-3 pb-[calc(92px+env(safe-area-inset-bottom))] transition-opacity duration-200 ${
                isMobileSheetOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              {visibleDeals.length === 0 ? (
                <div className="rounded-[16px] bg-[var(--color-background-muted)] p-6 text-center space-y-2.5 mt-1">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {isTh
                      ? "ไม่พบโปรในกรอบแผนที่นี้"
                      : "No deals in this map view"}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="btn-round-solid !h-9 text-[13px]"
                  >
                    {isTh ? "ดูโปรทั้งหมดทั่วไทย" : "Show all deals"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {visibleDeals.map((deal, idx) => (
                    <VerticalCouponCard
                      key={`m-${deal.id}`}
                      pin={deal}
                      language={language}
                      priority={idx < 4}
                      isSaved={globalSavedPinIds.has(deal.id)}
                      enablePhotoSlide={true}
                      isHighlighted={focusedPinId === deal.id}
                      onSelect={(p) => void loadDealDetail(p)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          MOBILE FILTER SLIDE-UP BOTTOM SHEET
      ==================================================================== */}
      {isMobileFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsMobileFilterOpen(false)}
          className="lg:hidden fixed inset-0 z-[95] flex items-end bg-black/45 animate-fade-in-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-5 pt-3.5 pb-[max(24px,env(safe-area-inset-bottom))] space-y-5 animate-slide-up-sheet"
          >
            <div className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                {isTh ? "กรองโปรบนแผนที่" : "Filter deals on map"}
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="h-8 w-8 rounded-[9px] bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                {isTh ? "แหล่งที่มาของโปร" : "Deal source"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "ALL", th: "ทุกแหล่ง", en: "All sources" },
                    { id: "INTERNAL", th: "จองตรง 0% GP", en: "Direct 0% GP" },
                    { id: "EXTERNAL", th: "ดีลจากเว็บอื่น", en: "External" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceFilter(opt.id)}
                    className={`h-9 px-3.5 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-colors ${
                      sourceFilter === opt.id
                        ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                        : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {isTh ? opt.th : opt.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                {isTh ? "สไตล์ที่พัก" : "Stay style"}
              </p>
              <div className="flex flex-wrap gap-2">
                {STAY_STYLE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveStyle(tab.id)}
                    className={`h-9 px-3.5 rounded-[10px] text-[13px] font-medium cursor-pointer transition-colors ${
                      activeStyle === tab.id
                        ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                        : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {isTh ? tab.labelTh : tab.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[14px] font-medium text-[var(--color-text-primary)] underline underline-offset-4 cursor-pointer"
              >
                {isTh ? "ล้างทั้งหมด" : "Clear all"}
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="h-11 px-6 rounded-[12px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer"
              >
                {isTh
                  ? `แสดง ${visibleDeals.length} โปร`
                  : `Show ${visibleDeals.length} deals`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          IN-PLACE DEAL DETAIL MODAL STAGE (Opens when clicking any deal card)
      ==================================================================== */}
      {activeOpenDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[85] bg-[var(--color-background-body)] overflow-y-auto px-0 lg:px-8 py-0 lg:py-6"
        >
          <PinterestPinDetail
            pin={activeOpenDetail}
            language={language}
            currentUser={currentUser}
            comments={openDetailData?.comments ?? []}
            savedPinIds={globalSavedPinIds}
            relatedPins={visibleDeals.filter(
              (d) =>
                d.id !== activeOpenDetail.id &&
                d.hotelId !== activeOpenDetail.hotelId &&
                d.hotelSlug !== activeOpenDetail.hotelSlug
            )}
            mobileOverlayMode={true}
            onBack={() => {
              setOpenDetailPin(null);
              setOpenDetailData(null);
            }}
            onClose={() => {
              setOpenDetailPin(null);
              setOpenDetailData(null);
            }}
            onSelectPin={(next) => void loadDealDetail(next)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onSharePin={() => {}}
            onExpandMedia={(urls, idx) =>
              setFullscreenMedia({
                slides: urls.map((u) => ({ type: "image", url: u })),
                index: idx,
              })
            }
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
