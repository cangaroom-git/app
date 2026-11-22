"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Coffee,
  Compass,
  MapPin,
  Maximize2,
  Navigation,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
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
} from "@/lib/geo/googleMapsLoader";
import {
  estimateRoadDistanceAndTime,
  offsetCoordinateByKm,
  parseThaiDistanceKm,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import {
  buildCirclePolygonGeoJson,
  DealNearbyPlacesModal,
} from "@/components/home/DealNearbyPlacesModal";

export interface HotelLocationMapProps {
  hotelName: string;
  addressText: string;
  districtText: string;
  provinceText: string;
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
      subcategoryLabelTh: "จุดแนะนำจากที่พัก",
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

const PREVIEW_QUICK_CATEGORIES: Array<{
  id: Exclude<NearbyPlaceCategory, "all">;
  th: string;
  en: string;
  color: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { id: "dining", th: "ร้านอาหาร", en: "Restaurants", color: AIRBNB_WARM_CATEGORY_COLORS.dining, icon: Utensils },
  { id: "cafe", th: "คาเฟ่ & กาแฟ", en: "Cafes", color: AIRBNB_WARM_CATEGORY_COLORS.cafe, icon: Coffee },
  {
    id: "groceries",
    th: "ร้านสะดวกซื้อ & 7-Eleven",
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

/**
 * Clean Zero-API-Waste Property Location Preview for /{hotelSlug}.
 * - Renders a serene MapLibre preview with ONLY the Black House Medallion + soft privacy ring + Host Picks ($0 API cost).
 * - Tapping the Search bar, any Quick Category chip, or Expand opens the single Unified Nearby Explorer Modal
 *   powered by Google Maps Vector + Google Places API (New) + Dynamic Monthly Quota Pacing.
 */
export function HotelLocationMap({
  hotelName,
  addressText,
  districtText,
  provinceText,
  latitude,
  longitude,
  googleMapsUrl,
  nearbySpots,
  language,
}: HotelLocationMapProps) {
  const { theme } = useHotelApp();
  const isDark = theme === "dark";
  const isTh = language === "th";

  const hasCoords =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewMapRef = useRef<maplibregl.Map | null>(null);
  const previewMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState<
    Exclude<NearbyPlaceCategory, "all"> | null
  >(null);
  const [modalInitialPlaceId, setModalInitialPlaceId] = useState<string | null>(
    null
  );
  const [modalInitialFocusSearch, setModalInitialFocusSearch] = useState(false);
  const [nondiiRecommended, setNondiiRecommended] = useState<NearbyPlaceItem[]>(
    []
  );

  const hostPlaces = useMemo(
    () =>
      hasCoords ? buildHostNearbyPlaces(nearbySpots, latitude!, longitude!) : [],
    [hasCoords, nearbySpots, latitude, longitude]
  );

  // Zero-cost ($0) fast query to Nondii's own `ThailandPlace` Neon PostgreSQL DB
  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      lat: String(latitude!),
      lng: String(longitude!),
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
  }, [hasCoords, latitude, longitude]);

  // Merge Host Picks (highest priority) + Nondii DB Curated Picks (diverse soft Airbnb colors, max 6 preview pins!)
  const curatedPlaces = useMemo(() => {
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

  const openExplorer = (opts?: {
    category?: Exclude<NearbyPlaceCategory, "all"> | null;
    placeId?: string | null;
    focusSearch?: boolean;
  }) => {
    setModalInitialCategory(opts?.category ?? null);
    setModalInitialPlaceId(opts?.placeId ?? null);
    setModalInitialFocusSearch(Boolean(opts?.focusSearch));
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!hasCoords || !previewContainerRef.current) return;

    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    const initPreview = async () => {
      ensureMapLibreWorker();
      const style = await getAirbnbVectorMapStyle(isDark);
      if (cancelled || !previewContainerRef.current) return;

      mapInstance = new maplibregl.Map({
        container: previewContainerRef.current,
        style,
        center: [longitude!, latitude!],
        zoom: 13.7,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        interactive: false,
        attributionControl: false,
      });
      configureThailandMapInteractions(mapInstance);
      previewMapRef.current = mapInstance;

      mapInstance.on("load", () => {
        if (cancelled || !mapInstance) return;
        for (const layer of mapInstance.getStyle().layers || []) {
          if (layer.id.toLowerCase().includes("poi")) {
            try {
              mapInstance.setLayoutProperty(layer.id, "visibility", "none");
            } catch {
              // ignore
            }
          }
        }

        mapInstance.addSource("hotel-preview-radius", {
          type: "geojson",
          data: buildCirclePolygonGeoJson(longitude!, latitude!, 1.4),
        });
        mapInstance.addLayer({
          id: "hotel-preview-radius-fill",
          type: "fill",
          source: "hotel-preview-radius",
          paint: {
            "fill-color": isDark ? "#ffffff" : "#222222",
            "fill-opacity": 0.045,
          },
        });
        mapInstance.addLayer({
          id: "hotel-preview-radius-outline",
          type: "line",
          source: "hotel-preview-radius",
          paint: {
            "line-color": isDark ? "#a8a8a8" : "#717171",
            "line-width": 1.2,
            "line-dasharray": [3, 3],
            "line-opacity": 0.42,
          },
        });
      });

      new maplibregl.Marker({
        element: createHomeHousePinElement(hotelName),
        anchor: "center",
      })
        .setLngLat([longitude!, latitude!])
        .addTo(mapInstance);

      for (const spot of curatedPlaces.slice(0, 6)) {
        const pinEl = createCategoryPinElement({
          place: spot,
          isSelected: false,
          isHovered: false,
          language,
          isDark,
          showLabel: false,
          onClick: () =>
            openExplorer({
              category: spot.source === "host" ? "host" : null,
              placeId: spot.id,
            }),
        });
        const m = new maplibregl.Marker({ element: pinEl, anchor: "center" })
          .setLngLat([spot.lng, spot.lat])
          .addTo(mapInstance);
        previewMarkersRef.current.push(m);
      }
    };

    void initPreview();

    return () => {
      cancelled = true;
      for (const m of previewMarkersRef.current) m.remove();
      previewMarkersRef.current = [];
      if (mapInstance) mapInstance.remove();
      previewMapRef.current = null;
    };
  }, [hasCoords, latitude, longitude, hotelName, curatedPlaces, isDark, language]);

  const locationSubtitle = [districtText, provinceText]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      {hasCoords && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => openExplorer()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openExplorer();
            }
          }}
          aria-label={
            isTh ? "เปิดแผนที่สำรวจสถานที่ใกล้เคียง" : "Open nearby places explorer"
          }
          className="relative isolate w-full aspect-square sm:aspect-[16/10] lg:aspect-auto lg:h-[420px] rounded-[16px] overflow-hidden bg-[#F6F4EF] dark:bg-[#191919] cursor-pointer select-none"
        >
          <div ref={previewContainerRef} className="w-full h-full" />

          {/* Airbnb-Style Floating Top-Left Search Trigger + Top-Right Expand */}
          <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between gap-2.5 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openExplorer({ focusSearch: true });
              }}
              className="pointer-events-auto h-11 px-4 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[13.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-2.5 max-w-[calc(100%-56px)] sm:w-[320px] cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isTh
                  ? "ค้นหาร้านอาหาร คาเฟ่ 7-Eleven..."
                  : "Find restaurants, cafes, 7-Eleven..."}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openExplorer();
              }}
              aria-label={isTh ? "ขยายแผนที่เต็มจอ" : "Expand map"}
              className="pointer-events-auto h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom-Left Soft Warm Round Airbnb Category Medallions (Zero API cost until clicked!) */}
          <div className="absolute bottom-3.5 inset-x-3.5 z-20 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-none">
            {PREVIEW_QUICK_CATEGORIES.filter(
              (cat) => cat.id !== "host" || curatedPlaces.length > 0
            ).map((cat) => {
              const Icon = cat.icon;
              const label = isTh ? cat.th : cat.en;
              return (
                <button
                  key={cat.id}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={(e) => {
                    e.stopPropagation();
                    openExplorer({ category: cat.id });
                  }}
                  className="pointer-events-auto h-10 w-10 rounded-full bg-[var(--color-background-popover)] hover:bg-[var(--color-background-muted)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <span
                    style={{ backgroundColor: cat.color }}
                    className="h-7 w-7 rounded-full text-white inline-flex items-center justify-center"
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Host Curated Nearby Spots Strip */}
      {nearbySpots.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "จุดเช็กอินและสถานที่ใกล้เคียง" : "Nearby landmarks"}
            </p>
            {hasCoords && (
              <button
                type="button"
                onClick={() => openExplorer({ category: "host" })}
                className="text-[13px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer hover:opacity-80"
              >
                {isTh ? "สำรวจบนแผนที่" : "Explore map"}
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto overflow-y-hidden gap-2 -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:px-0 md:scroll-px-0 sm:flex-wrap pb-1 no-scrollbar">
            {nearbySpots.map((spot, idx) => {
              const matchingHost = hostPlaces[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (hasCoords) {
                      openExplorer({
                        category: "host",
                        placeId: matchingHost?.id ?? null,
                      });
                    }
                  }}
                  className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] shrink-0 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                  <strong className="font-semibold">{spot.nameTh}</strong>
                  <span className="text-[var(--color-text-secondary)]">
                    ({spot.distTh})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Unified Nearby Places Explorer Modal */}
      {hasCoords && (
        <DealNearbyPlacesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          hotelName={hotelName}
          locationSubtitle={locationSubtitle || provinceText}
          addressTh={addressText}
          lat={latitude!}
          lng={longitude!}
          places={curatedPlaces}
          initialCategory={modalInitialCategory}
          initialSelectedPlaceId={modalInitialPlaceId}
          initialFocusSearch={modalInitialFocusSearch}
          language={language}
        />
      )}
    </div>
  );
}
