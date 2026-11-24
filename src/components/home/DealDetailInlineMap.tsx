"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, Minus, Plus } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  configureThailandMapInteractions,
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
  THAILAND_MAX_ZOOM,
  WORLD_MIN_ZOOM,
} from "@/lib/geo/airbnbMapLibreStyle";
import {
  createCategoryPinElement,
  createHomeHousePinElement,
} from "@/lib/geo/googleMapsLoader";
import {
  buildCurvedArcGeoJson,
  estimateRoadDistanceAndTime,
  offsetCoordinateByKm,
  parseThaiDistanceKm,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import {
  buildCirclePolygonGeoJson,
  DealNearbyPlacesModal,
} from "@/components/home/DealNearbyPlacesModal";

const PROVINCE_FALLBACK_COORDS: Record<string, [number, number]> = {
  nan: [19.1932, 101.1924],
  "chiang-mai": [18.7883, 98.9853],
  phuket: [7.9519, 98.3381],
  krabi: [8.0315, 98.8235],
  bangkok: [13.7367, 100.5231],
  "nakhon-ratchasima": [14.527, 101.404],
  "prachuap-khiri-khan": [12.5684, 99.9577],
  "surat-thani": [9.512, 100.0136],
  kanchanaburi: [14.0228, 99.5328],
};

export interface DealDetailInlineMapProps {
  hotelName: string;
  provinceId: string;
  provinceLabel: string;
  districtTh: string;
  addressTh: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl?: string | null;
  nearbySpots: Array<{ nameTh: string; distTh: string }>;
  language: "th" | "en";
}

function buildHostNearbyPlaces(
  spots: Array<{ nameTh: string; distTh: string }>,
  baseLat: number,
  baseLng: number
): NearbyPlaceItem[] {
  return spots.map((spot, idx) => {
    const parsedKm = parseThaiDistanceKm(spot.distTh) ?? 0.8 + idx * 0.45;
    const bearingDeg = (idx * 78 + 32) % 360;
    const pos = offsetCoordinateByKm(baseLat, baseLng, parsedKm, bearingDeg);
    const road = estimateRoadDistanceAndTime(parsedKm);
    return {
      id: `host-spot-${idx}-${spot.nameTh}`,
      nameTh: spot.nameTh,
      nameEn: spot.nameTh,
      category: "host",
      subcategoryLabelTh: "ที่พักแนะนำ",
      subcategoryLabelEn: "Host pick",
      lat: pos.lat,
      lng: pos.lng,
      distanceKm: Number(parsedKm.toFixed(2)),
      driveMinutes: road.driveMinutes,
      walkMinutes: road.walkMinutes,
      description: spot.distTh || undefined,
      isHostPick: true,
      source: "host",
    };
  });
}

/**
 * Clean Zero-API-Waste Location Preview (Slide 3 of Deal Detail).
 * - Shows ONLY the Airbnb-style Black House Medallion + soft privacy radius + up to 4 clean Host Pick circular icons (ZERO white pill clutter & ZERO automatic Places API calls!).
 * - Opens the Unified Google Maps + Places API (New) Explorer Modal ONLY when the user clicks "มีอะไรน่าสนใจบ้าง".
 */
export function DealDetailInlineMap({
  hotelName,
  provinceId,
  provinceLabel,
  districtTh,
  addressTh,
  latitude,
  longitude,
  nearbySpots,
  language,
}: DealDetailInlineMapProps) {
  const { theme } = useHotelApp();
  const isDark = theme === "dark";
  const isTh = language === "th";

  const coords = useMemo(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      return { lat: latitude, lng: longitude, isExact: true };
    }
    const fallback = PROVINCE_FALLBACK_COORDS[provinceId] ?? [13.7563, 100.5018];
    return { lat: fallback[0], lng: fallback[1], isExact: false };
  }, [latitude, longitude, provinceId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);
  const [nondiiRecommended, setNondiiRecommended] = useState<NearbyPlaceItem[]>(
    []
  );

  // Own-DB Host Picks + Automatic "Nondii แนะนำ" from our free `ThailandPlace` Neon Postgres DB ($0 API cost!)
  const hostPlaces = useMemo(
    () => buildHostNearbyPlaces(nearbySpots, coords.lat, coords.lng),
    [nearbySpots, coords.lat, coords.lng]
  );

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      limit: "6",
    });
    fetch(`/api/places/recommended?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: NearbyPlaceItem[] } | null) => {
        if (!cancelled && Array.isArray(data?.items)) {
          setNondiiRecommended(data.items);
        }
      })
      .catch(() => {
        // silent fallback
      });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lng]);

  const previewPlaces = useMemo(() => {
    const merged: NearbyPlaceItem[] = [...hostPlaces];
    const seen = new Set(hostPlaces.map((p) => p.nameTh.toLowerCase().trim()));
    for (const item of nondiiRecommended) {
      const key = item.nameTh.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged;
  }, [hostPlaces, nondiiRecommended]);

  const selectedPlace = useMemo(
    () => previewPlaces.find((p) => p.id === selectedPoiId) ?? null,
    [previewPlaces, selectedPoiId]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    const init = async () => {
      ensureMapLibreWorker();
      const style = await getAirbnbVectorMapStyle(isDark);
      if (cancelled || !containerRef.current) return;

      mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [coords.lng, coords.lat],
        zoom: coords.isExact ? 13.6 : 12.0,
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

        // Keep preview canvas crystal-clean by hiding noisy base map POI icons
        for (const layer of mapInstance.getStyle().layers || []) {
          if (layer.id.toLowerCase().includes("poi")) {
            try {
              mapInstance.setLayoutProperty(layer.id, "visibility", "none");
            } catch {
              // ignore
            }
          }
        }

        mapInstance.addSource("inline-radius-ring", {
          type: "geojson",
          data: buildCirclePolygonGeoJson(coords.lng, coords.lat, 1.5),
        });
        mapInstance.addLayer({
          id: "inline-radius-fill",
          type: "fill",
          source: "inline-radius-ring",
          paint: {
            "fill-color": isDark ? "#ffffff" : "#222222",
            "fill-opacity": 0.045,
          },
        });
        mapInstance.addLayer({
          id: "inline-radius-outline",
          type: "line",
          source: "inline-radius-ring",
          paint: {
            "line-color": isDark ? "#a8a8a8" : "#717171",
            "line-width": 1.2,
            "line-dasharray": [3, 3],
            "line-opacity": 0.4,
          },
        });

        mapInstance.addSource("inline-arc-line", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: "inline-arc-stroke",
          type: "line",
          source: "inline-arc-line",
          layout: { "line-cap": "round" },
          paint: {
            "line-color": isDark ? "#f5f5f5" : "#222222",
            "line-width": 2,
            "line-dasharray": [2, 2],
            "line-opacity": 0.85,
          },
        });

        setIsMapReady(true);
      });

      mapInstance.on("click", () => setSelectedPoiId(null));

      // Clean Airbnb Black Circular House Medallion (Zero Giant Pill Blocking Streets!)
      new maplibregl.Marker({
        element: createHomeHousePinElement(hotelName),
        anchor: "center",
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapInstance);
    };

    void init();

    return () => {
      cancelled = true;
      for (const m of poiMarkersRef.current) m.remove();
      poiMarkersRef.current = [];
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [coords.lat, coords.lng, coords.isExact, hotelName, isDark]);

  // Render up to 6 diverse soft Airbnb-colored "Nondii & Host" medallions (zero overlapping text pills!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    for (const m of poiMarkersRef.current) m.remove();
    poiMarkersRef.current = [];

    for (const place of previewPlaces.slice(0, 6)) {
      const isSelected = selectedPoiId === place.id;
      const pinEl = createCategoryPinElement({
        place,
        isSelected,
        isHovered: false,
        language,
        isDark,
        showLabel: isSelected,
        onClick: () => setSelectedPoiId((prev) => (prev === place.id ? null : place.id)),
      });

      const marker = new maplibregl.Marker({ element: pinEl, anchor: "center" })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
      poiMarkersRef.current.push(marker);
    }

    const arcSrc = map.getSource("inline-arc-line") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (arcSrc) {
      if (selectedPlace) {
        arcSrc.setData(
          buildCurvedArcGeoJson(
            coords.lng,
            coords.lat,
            selectedPlace.lng,
            selectedPlace.lat
          )
        );
      } else {
        arcSrc.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [
    previewPlaces,
    selectedPoiId,
    selectedPlace,
    isMapReady,
    language,
    isDark,
    coords.lat,
    coords.lng,
  ]);

  const locationSubtitle = [districtTh, provinceLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-swipe-ignore="true"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="relative w-full h-full min-h-[340px] bg-[var(--color-background-muted)] overflow-hidden"
    >
      <div ref={containerRef} className="w-full h-full touch-none" />

      {/* Right-Top Minimal Zoom Controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col rounded-[10px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] overflow-hidden">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
          aria-label={isTh ? "ซูมเข้า" : "Zoom in"}
          className="h-8 w-8 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] border-b border-[var(--color-border)] cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
          aria-label={isTh ? "ซูมออก" : "Zoom out"}
          className="h-8 w-8 inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] cursor-pointer transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Single Clean Floating Trigger Button — Opens Unified Google Maps + Places Explorer */}
      <div className="absolute left-3.5 bottom-3.5 z-20 max-w-[calc(100%-76px)]">
        <button
          type="button"
          onClick={() => setIsNearbyModalOpen(true)}
          className="h-10 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] shadow-[var(--shadow-popover)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors max-w-full"
        >
          <Compass className="w-4 h-4 shrink-0" strokeWidth={2.1} />
          <span className="truncate">
            {isTh ? "มีอะไรน่าสนใจบ้าง" : "What's nearby"}
          </span>
        </button>
      </div>

      {/* Unified Airbnb-Grade Nearby Explorer Modal (Google Maps Vector + Places New + Auto-Fallback) */}
      <DealNearbyPlacesModal
        isOpen={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        hotelName={hotelName}
        locationSubtitle={locationSubtitle || provinceLabel}
        addressTh={addressTh}
        lat={coords.lat}
        lng={coords.lng}
        places={previewPlaces}
        initialSelectedPlaceId={selectedPoiId}
        language={language}
      />
    </div>
  );
}
