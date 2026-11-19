"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Coffee,
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Maximize2,
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
import {
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
} from "@/lib/geo/airbnbMapLibreStyle";
import {
  buildCurvedArcGeoJson,
  estimateRoadDistanceAndTime,
  formatDistanceLabel,
  haversineDistanceKm,
  offsetCoordinateByKm,
  parseThaiDistanceKm,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";

const HOUSE_SVG_MARKUP = `
  <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
    <path d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h4v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6h4a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9z"/>
  </svg>
`;

const DISTANCE_MINI_SVG = `
  <svg viewBox="0 0 24 24" width="12.5" height="12.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="5" cy="12" r="2.2"/>
    <circle cx="19" cy="12" r="2.2"/>
    <path d="M7.5 12h9"/>
  </svg>
`;

const PIN_WHITE_ICONS = {
  host: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>`,
  dining: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  cafe: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
  groceries: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  nature: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>`,
  landmark: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  medical: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>`,
  transit: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
};

/**
 * Resolve Airbnb-style distinct category medallion color & crisp white icon for map symbology.
 */
function resolveAirbnbCategoryPinVisual(place: NearbyPlaceItem): {
  bgHex: string;
  iconSvg: string;
} {
  switch (place.category) {
    case "dining":
      return { bgHex: "#E8A328", iconSvg: PIN_WHITE_ICONS.dining };
    case "cafe":
      return { bgHex: "#D4842A", iconSvg: PIN_WHITE_ICONS.cafe };
    case "shopping":
      return { bgHex: "#4285F4", iconSvg: PIN_WHITE_ICONS.shopping };
    case "groceries":
      return { bgHex: "#2574D9", iconSvg: PIN_WHITE_ICONS.groceries };
    case "essential": {
      const text = `${place.subcategoryLabelTh} ${place.subcategoryLabelEn} ${place.nameTh}`;
      if (/โรงพยาบาล|คลินิก|ยา|medical|hospital|pharmacy/i.test(text)) {
        return { bgHex: "#E5534B", iconSvg: PIN_WHITE_ICONS.medical };
      }
      return { bgHex: "#5C6F84", iconSvg: PIN_WHITE_ICONS.transit };
    }
    case "attraction": {
      const text = `${place.subcategoryLabelTh} ${place.subcategoryLabelEn} ${place.nameTh}`;
      if (/วัด|โบราณ|พิพิธภัณฑ์|temple|historic|museum/i.test(text)) {
        return { bgHex: "#E0568C", iconSvg: PIN_WHITE_ICONS.landmark };
      }
      return { bgHex: "#46A742", iconSvg: PIN_WHITE_ICONS.nature };
    }
    case "host":
    default:
      return { bgHex: "#222222", iconSvg: PIN_WHITE_ICONS.host };
  }
}

/**
 * Airbnb-style Illustrated Map Artwork for POIs without an external Wikimedia/OSM photograph.
 */
function PlaceCategoryArtwork({
  place,
  variant,
}: {
  place: NearbyPlaceItem;
  variant: "banner" | "thumb";
}) {
  const { bgHex, iconSvg } = resolveAirbnbCategoryPinVisual(place);

  if (variant === "thumb") {
    return (
      <div className="relative h-11 w-11 rounded-[10px] overflow-hidden bg-[#F3F1EC] dark:bg-[#2B2B2B] flex items-center justify-center shrink-0 select-none">
        <svg
          viewBox="0 0 44 44"
          className="absolute inset-0 w-full h-full opacity-55 dark:opacity-25"
          aria-hidden="true"
        >
          <path
            d="M0 14 L44 8 M10 0 L18 44 M0 32 L44 27 M31 0 L26 44"
            stroke="#DFDDD6"
            strokeWidth="2.2"
            fill="none"
          />
          <circle cx="34" cy="12" r="7" fill="#DCEFD5" />
        </svg>
        <span
          style={{ backgroundColor: bgHex }}
          className="relative z-10 h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#222222] shadow-[var(--shadow-popover)] flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] rounded-[14px] overflow-hidden bg-[#F4F2EC] dark:bg-[#262626] flex items-center justify-center select-none">
      {/* Subtle Architectural Vector Map Grid + River + Park Illustration */}
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-90 dark:opacity-25"
        aria-hidden="true"
      >
        <rect width="320" height="180" fill="#F4F2EC" />
        <path
          d="M-10 145 Q 85 110, 155 128 T 330 88 L 330 190 L -10 190 Z"
          fill="#E4F1DF"
        />
        <path
          d="M-10 38 C 65 52, 115 20, 185 48 C 240 70, 275 56, 330 34"
          stroke="#CBE6F3"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M-10 112 L 330 68 M 74 -10 L 118 190 M 218 -10 L 188 190 M 15 55 L 295 148"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Center Elevated Medallion Pin + Ground Shadow */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          style={{ backgroundColor: bgHex }}
          className="h-12 w-12 rounded-full ring-[3px] ring-white dark:ring-[#222222] shadow-[var(--shadow-popover)] flex items-center justify-center"
        >
          <span
            className="flex items-center justify-center [&_svg]:w-[18px] [&_svg]:h-[18px]"
            dangerouslySetInnerHTML={{ __html: iconSvg }}
          />
        </div>
        <span
          style={{ backgroundColor: bgHex }}
          className="h-2.5 w-2.5 -mt-1.5 rotate-45 rounded-[2px]"
        />
        <span className="mt-1.5 h-1.5 w-6 rounded-full bg-black/15 dark:bg-black/40" />
      </div>
    </div>
  );
}

const ROUTE_SOURCE_ID = "cgr-curved-arc-source";
const ROUTE_BG_LAYER_ID = "cgr-curved-arc-bg-layer";
const ROUTE_LAYER_ID = "cgr-curved-arc-layer";
const ROUTE_TIP_LAYER_ID = "cgr-curved-arc-tip-layer";
const VECTOR_POI_LAYER_IDS = ["poi_r20", "poi_r7", "poi_r1", "poi_transit"];

interface HotelLocationMapProps {
  hotelName: string;
  addressText: string;
  districtText: string;
  provinceText: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  nearbySpots: Array<{ nameTh: string; distTh: string }>;
  language: "th" | "en";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s\-_.'"()]+/g, "")
    .trim();
}

interface CategoryDropdownMeta {
  id: Exclude<NearbyPlaceCategory, "all">;
  labelTh: string;
  labelEn: string;
  probeQuery: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const AIRBNB_FLOATING_CATEGORIES: ReadonlyArray<CategoryDropdownMeta> = [
  {
    id: "host",
    labelTh: "ที่พักแนะนำ",
    labelEn: "Host picks",
    probeQuery: "[tourism=viewpoint]",
    Icon: Sparkles,
  },
  {
    id: "dining",
    labelTh: "ร้านอาหาร",
    labelEn: "Restaurants",
    probeQuery: "[amenity=restaurant]",
    Icon: Utensils,
  },
  {
    id: "groceries",
    labelTh: "ร้านสะดวกซื้อ & ของชำ",
    labelEn: "Groceries",
    probeQuery: "[shop=convenience]",
    Icon: ShoppingCart,
  },
  {
    id: "shopping",
    labelTh: "แหล่งช้อปปิ้ง & ตลาด",
    labelEn: "Shopping",
    probeQuery: "[amenity=marketplace]",
    Icon: ShoppingBag,
  },
  {
    id: "essential",
    labelTh: "การเดินทาง & ปั๊มน้ำมัน",
    labelEn: "Transit",
    probeQuery: "[amenity=fuel]",
    Icon: Navigation,
  },
  {
    id: "attraction",
    labelTh: "ที่เที่ยว & จุดชมวิว",
    labelEn: "Attractions",
    probeQuery: "[tourism=attraction]",
    Icon: Compass,
  },
  {
    id: "cafe",
    labelTh: "คาเฟ่",
    labelEn: "Cafe",
    probeQuery: "[amenity=cafe]",
    Icon: Coffee,
  },
];

function classifyVectorTilePoi(
  cls = "",
  sub = ""
): {
  category: Exclude<NearbyPlaceCategory, "all">;
  subTh: string;
  subEn: string;
} | null {
  const c = cls.toLowerCase();
  const s = sub.toLowerCase();
  if (
    c === "lodging" ||
    s === "hotel" ||
    s === "guest_house" ||
    s === "hostel" ||
    s === "motel" ||
    s === "resort"
  ) {
    return null;
  }
  if (c === "cafe" || s === "cafe" || s === "coffee_shop" || s === "bakery") {
    return { category: "cafe", subTh: "คาเฟ่ & เบเกอรี่", subEn: "Cafe" };
  }
  if (
    c === "restaurant" ||
    c === "fast_food" ||
    c === "bar" ||
    c === "biergarten" ||
    s === "restaurant" ||
    s === "ice_cream"
  ) {
    return { category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant" };
  }
  if (
    c === "grocery" ||
    s === "convenience" ||
    s === "supermarket" ||
    s === "greengrocer"
  ) {
    return {
      category: "groceries",
      subTh: "ร้านสะดวกซื้อ & ของชำ",
      subEn: "Groceries",
    };
  }
  if (
    c === "shop" ||
    s === "marketplace" ||
    s === "mall" ||
    s === "department_store" ||
    s === "clothes" ||
    s === "gift"
  ) {
    return { category: "shopping", subTh: "ร้านค้า & ตลาด", subEn: "Shopping" };
  }
  if (
    c === "fuel" ||
    c === "bus" ||
    c === "railway" ||
    c === "aerodrome" ||
    c === "hospital" ||
    c === "pharmacy" ||
    c === "bank" ||
    s === "fuel" ||
    s === "bus_station" ||
    s === "atm"
  ) {
    return {
      category: "essential",
      subTh:
        c === "hospital" || c === "pharmacy"
          ? "โรงพยาบาล & ร้านยา"
          : s === "fuel" || c === "fuel"
          ? "ปั๊มน้ำมัน"
          : "บริการ & เดินทาง",
      subEn:
        c === "hospital" || c === "pharmacy"
          ? "Medical"
          : s === "fuel" || c === "fuel"
          ? "Gas station"
          : "Transit",
    };
  }
  if (
    c === "park" ||
    c === "attraction" ||
    c === "viewpoint" ||
    c === "place_of_worship" ||
    c === "museum" ||
    c === "castle" ||
    s === "waterfall" ||
    s === "viewpoint" ||
    s === "attraction" ||
    s === "peak"
  ) {
    return {
      category: "attraction",
      subTh:
        c === "place_of_worship"
          ? "วัด / ศาสนสถาน"
          : s === "viewpoint"
          ? "จุดชมวิว"
          : "สถานที่ท่องเที่ยว",
      subEn:
        c === "place_of_worship"
          ? "Temple"
          : s === "viewpoint"
          ? "Viewpoint"
          : "Attraction",
    };
  }
  return null;
}

function getCategoryMeta(
  category: NearbyPlaceCategory,
  lang: "th" | "en"
): {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  probeQuery: string;
} {
  const found = AIRBNB_FLOATING_CATEGORIES.find((c) => c.id === category);
  if (!found) {
    return {
      label: lang === "th" ? "ทั้งหมด" : "All",
      Icon: MapPin,
      probeQuery: "",
    };
  }
  return {
    label: lang === "th" ? found.labelTh : found.labelEn,
    Icon: found.Icon,
    probeQuery: found.probeQuery,
  };
}

function createResortDomMarker(
  hotelName: string,
  size: "preview" | "interactive"
): HTMLDivElement {
  const outer = document.createElement("div");
  const haloClass = size === "preview" ? "h-20 w-20" : "h-20 w-20";
  const badgeClass = size === "preview" ? "h-12 w-12" : "h-11 w-11";
  outer.className = `pointer-events-none select-none flex items-center justify-center ${haloClass} rounded-full bg-[#222222]/[0.09] dark:bg-white/[0.12]`;
  outer.innerHTML = `
    <div
      title="${escapeHtml(hotelName)}"
      class="${badgeClass} rounded-full bg-[#222222] dark:bg-[#f5f5f5] text-white dark:text-[#222222] shadow-[var(--shadow-popover)] flex items-center justify-center ring-4 ring-white/90 dark:ring-[#222222]/90"
    >
      ${HOUSE_SVG_MARKUP}
    </div>
  `;
  return outer;
}

const EMPTY_GEOJSON_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

interface InteractiveVectorSurfaceProps {
  mode: "inline-desktop" | "fullscreen-modal";
  hotelName: string;
  latitude: number;
  longitude: number;
  isDark: boolean;
  isTh: boolean;
  language: "th" | "en";
  displayedPlaces: NearbyPlaceItem[];
  activeCategory: NearbyPlaceCategory;
  hasSearchResults: boolean;
  selectedPlace: NearbyPlaceItem | null;
  onSelectPlace: (
    place: NearbyPlaceItem,
    options?: { panCamera?: boolean }
  ) => void;
  onHarvestPois: (items: NearbyPlaceItem[]) => void;
  onPanAreaFetch: (lat: number, lng: number) => void;
  onDismissDropdown: () => void;
  mapRefOut: React.MutableRefObject<maplibregl.Map | null>;
}

function InteractiveVectorSurface({
  mode,
  hotelName,
  latitude,
  longitude,
  isDark,
  isTh,
  language,
  displayedPlaces,
  activeCategory,
  hasSearchResults,
  selectedPlace,
  onSelectPlace,
  onHarvestPois,
  onPanAreaFetch,
  onDismissDropdown,
  mapRefOut,
}: InteractiveVectorSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localMapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const lastFetchedRef = useRef<{ lat: number; lng: number }>({
    lat: latitude,
    lng: longitude,
  });
  const [mapReadyTick, setMapReadyTick] = useState(0);

  // Keep latest callbacks in refs so MapLibre event listeners never go stale
  const callbacksRef = useRef({
    onSelectPlace,
    onHarvestPois,
    onPanAreaFetch,
    onDismissDropdown,
  });
  callbacksRef.current = {
    onSelectPlace,
    onHarvestPois,
    onPanAreaFetch,
    onDismissDropdown,
  };

  useEffect(() => {
    if (!containerRef.current) return;
    ensureMapLibreWorker();
    const container = containerRef.current;
    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;
    let panTimer: number | null = null;

    const isInlineDesktop = mode === "inline-desktop";

    const onWheelInline = (ev: WheelEvent) => {
      const m = localMapRef.current;
      if (m && (ev.ctrlKey || ev.metaKey) && !m.scrollZoom.isEnabled()) {
        m.scrollZoom.enable();
      }
    };
    const onMouseLeaveInline = () => {
      const m = localMapRef.current;
      if (isInlineDesktop && m && m.scrollZoom.isEnabled()) {
        m.scrollZoom.disable();
      }
    };

    if (isInlineDesktop) {
      container.addEventListener("wheel", onWheelInline, { passive: true });
      container.addEventListener("mouseleave", onMouseLeaveInline);
    }

    getAirbnbVectorMapStyle(isDark).then((style) => {
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container,
        style,
        center: [longitude, latitude],
        zoom: isInlineDesktop ? 13.9 : 13.8,
        minZoom: 4.5,
        maxZoom: 19,
        scrollZoom: !isInlineDesktop,
        dragPan: true,
        doubleClickZoom: true,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });

      const canvas = map.getCanvas();
      canvas.style.cursor = "grab";
      map.on("dragstart", () => {
        canvas.style.cursor = "grabbing";
      });
      map.on("dragend", () => {
        canvas.style.cursor = "grab";
      });

      // Resort Home Marker
      new maplibregl.Marker({
        element: createResortDomMarker(hotelName, "interactive"),
        anchor: "center",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      map.on("load", () => {
        if (cancelled) return;

        // Pre-create persistent Curved Trajectory source & layers once
        if (!map.getSource(ROUTE_SOURCE_ID)) {
          map.addSource(ROUTE_SOURCE_ID, {
            type: "geojson",
            data: EMPTY_GEOJSON_COLLECTION,
          });

          map.addLayer({
            id: ROUTE_BG_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            filter: ["==", "$type", "LineString"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": isDark ? "#f5f5f5" : "#222222",
              "line-width": 3,
              "line-opacity": 0.12,
            },
          });

          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            filter: ["==", "$type", "LineString"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": isDark ? "#f5f5f5" : "#222222",
              "line-width": 3,
              "line-dasharray": [0.28, 1.85],
              "line-opacity": 0.92,
            },
          });

          map.addLayer({
            id: ROUTE_TIP_LAYER_ID,
            type: "circle",
            source: ROUTE_SOURCE_ID,
            filter: ["==", "$type", "Point"],
            paint: {
              "circle-radius": 4.5,
              "circle-color": isDark ? "#f5f5f5" : "#222222",
              "circle-stroke-width": 2,
              "circle-stroke-color": isDark ? "#222222" : "#ffffff",
            },
          });
        }

        const buildItemFromVectorFeature = (
          feat: maplibregl.MapGeoJSONFeature
        ): NearbyPlaceItem | null => {
          if (!feat.geometry || feat.geometry.type !== "Point") return null;
          const [pLng, pLat] = feat.geometry.coordinates as [number, number];
          const props = (feat.properties || {}) as Record<string, unknown>;
          const mapped = classifyVectorTilePoi(
            String(props.class || ""),
            String(props.subclass || "")
          ) || {
            category: "attraction" as const,
            subTh: "สถานที่ใกล้เคียง",
            subEn: "Nearby place",
          };

          const rawTh = String(
            props["name:th"] ||
              props["name:nonlatin"] ||
              props.name ||
              props.name_en ||
              ""
          ).trim();
          const rawEn = String(
            props.name_en || props["name:latin"] || props.name || rawTh
          ).trim();
          if (!rawTh || /^\d+$/.test(rawTh)) return null;

          const dist = haversineDistanceKm(latitude, longitude, pLat, pLng);
          const { driveMinutes, walkMinutes } = estimateRoadDistanceAndTime(dist);

          return {
            id: `vtile-${mapped.category}-${pLat.toFixed(6)}-${pLng.toFixed(6)}`,
            nameTh: rawTh,
            nameEn: rawEn || rawTh,
            category: mapped.category,
            subcategoryLabelTh: mapped.subTh,
            subcategoryLabelEn: mapped.subEn,
            lat: pLat,
            lng: pLng,
            distanceKm: Number(dist.toFixed(2)),
            driveMinutes,
            walkMinutes,
            source: "osm",
          };
        };

        const activePoiLayers = VECTOR_POI_LAYER_IDS.filter((id) =>
          Boolean(map.getLayer(id))
        );

        for (const layerId of activePoiLayers) {
          map.on("mouseenter", layerId, () => {
            canvas.style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            canvas.style.cursor = "grab";
          });
        }

        map.on("click", (e: maplibregl.MapMouseEvent) => {
          if (isInlineDesktop && !map.scrollZoom.isEnabled()) {
            map.scrollZoom.enable();
          }
          callbacksRef.current.onDismissDropdown();

          const existingLayers = VECTOR_POI_LAYER_IDS.filter((id) =>
            Boolean(map.getLayer(id))
          );
          if (existingLayers.length === 0) return;

          const hitFeatures = map.queryRenderedFeatures(e.point, {
            layers: existingLayers,
          });
          const topHit = hitFeatures[0];
          if (!topHit) return;
          const clickedItem = buildItemFromVectorFeature(topHit);
          if (!clickedItem) return;

          callbacksRef.current.onHarvestPois([clickedItem]);
          callbacksRef.current.onSelectPlace(clickedItem, { panCamera: true });
        });

        setMapReadyTick((t) => t + 1);
      });

      map.on("moveend", () => {
        if (panTimer !== null) {
          window.clearTimeout(panTimer);
        }
        panTimer = window.setTimeout(() => {
          const c = map.getCenter();
          const movedKm = haversineDistanceKm(
            lastFetchedRef.current.lat,
            lastFetchedRef.current.lng,
            c.lat,
            c.lng
          );
          if (movedKm >= 3.5 && map.getZoom() >= 9.5) {
            lastFetchedRef.current = { lat: c.lat, lng: c.lng };
            callbacksRef.current.onPanAreaFetch(c.lat, c.lng);
          }
        }, 500);
      });

      localMapRef.current = map;
      mapRefOut.current = map;
      mapInstance = map;
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => localMapRef.current?.resize())
        : null;
    ro?.observe(container);

    return () => {
      cancelled = true;
      if (panTimer !== null) {
        window.clearTimeout(panTimer);
      }
      if (isInlineDesktop) {
        container.removeEventListener("wheel", onWheelInline);
        container.removeEventListener("mouseleave", onMouseLeaveInline);
      }
      ro?.disconnect();
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      mapInstance?.remove();
      localMapRef.current = null;
      if (mapRefOut.current === mapInstance) {
        mapRefOut.current = null;
      }
    };
  }, [hotelName, isDark, latitude, longitude, mapRefOut, mode]);

  // Render Airbnb Category Medallion Pins + Haloed Labels (Zero Coordinate Offset!)
  useEffect(() => {
    const map = localMapRef.current;
    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    if (!map) return;

    const isFiltered = activeCategory !== "all" || hasSearchResults;
    // Exact Airbnb Overview Behavior:
    // - Default view shows ONLY Resort pin (+ Host-curated picks if any, max 8) over the clean GPU vector map
    // - Selecting a category or searching renders up to 24 crisp category pins on demand
    const placesToPin = isFiltered
      ? displayedPlaces.slice(0, 24)
      : displayedPlaces
          .filter((p) => p.isHostPick || p.id === selectedPlace?.id)
          .slice(0, 8);

    if (
      selectedPlace &&
      !placesToPin.some((p) => p.id === selectedPlace.id)
    ) {
      placesToPin.unshift(selectedPlace);
    }

    const labelHaloStyle = isDark
      ? "text-shadow: -1.5px -1.5px 0 #181818, 1.5px -1.5px 0 #181818, -1.5px 1.5px 0 #181818, 1.5px 1.5px 0 #181818, 0 1px 4px rgba(0,0,0,0.9);"
      : "text-shadow: -1.5px -1.5px 0 #ffffff, 1.5px -1.5px 0 #ffffff, -1.5px 1.5px 0 #ffffff, 1.5px 1.5px 0 #ffffff, 0 1px 4px rgba(255,255,255,0.95);";

    for (const place of placesToPin) {
      const isSelected = place.id === selectedPlace?.id;
      const rawTitle = isTh ? place.nameTh : place.nameEn;
      const shortTitle =
        rawTitle.length > 22 ? `${rawTitle.slice(0, 21)}…` : rawTitle;

      const wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.setAttribute("aria-label", rawTitle);
      wrapper.style.zIndex = isSelected ? "40" : place.isHostPick ? "22" : "15";

      if (isSelected) {
        // Selected Destination Target: 28x28px circle anchored at EXACT center [lng, lat] (0px error!)
        // Honest straight-line distance badge floats cleanly above without shifting MapLibre's anchor point
        const distBadgeLabel = `~${formatDistanceLabel(place.distanceKm, language)}`;
        wrapper.className =
          "relative h-7 w-7 rounded-[14px] cursor-pointer select-none focus:outline-none flex items-center justify-center";
        wrapper.innerHTML = `
          <span class="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 -translate-x-1/2 h-7 px-2.5 rounded-[9px] bg-white dark:bg-[#242424] text-[#222222] dark:text-[#f5f5f5] border border-black/[0.08] dark:border-white/[0.14] shadow-[var(--shadow-popover)] text-[12px] font-semibold tabular-nums inline-flex items-center gap-1.5 whitespace-nowrap">
            ${DISTANCE_MINI_SVG}
            <span>${escapeHtml(distBadgeLabel)}</span>
          </span>
          <span class="h-7 w-7 rounded-full bg-[#222222] dark:bg-[#f5f5f5] ring-[2.5px] ring-white dark:ring-[#222222] shadow-[var(--shadow-popover)] flex items-center justify-center">
            <span class="h-2.5 w-2.5 rounded-full bg-white dark:bg-[#222222]"></span>
          </span>
        `;

        wrapper.addEventListener("click", (ev) => {
          ev.stopPropagation();
          callbacksRef.current.onSelectPlace(place, { panCamera: true });
        });

        const marker = new maplibregl.Marker({
          element: wrapper,
          anchor: "center",
        })
          .setLngLat([place.lng, place.lat])
          .addTo(map);

        markersRef.current.push(marker);
      } else {
        // Airbnb Category Medallion Pin (30x34px teardrop anchored at exact bottom tip + haloed label beside it)
        const { bgHex, iconSvg } = resolveAirbnbCategoryPinVisual(place);
        wrapper.className =
          "group relative w-[30px] h-[34px] rounded-[10px] flex flex-col items-center cursor-pointer select-none focus:outline-none hover:brightness-95 transition";
        wrapper.title = rawTitle;
        wrapper.innerHTML = `
          <span
            style="background-color: ${bgHex};"
            class="relative z-10 h-[30px] w-[30px] rounded-full ring-2 ring-white dark:ring-[#222222] shadow-[var(--shadow-popover)] flex items-center justify-center shrink-0"
          >
            ${iconSvg}
          </span>
          <span
            style="background-color: ${bgHex};"
            class="h-2 w-2 -mt-[5px] rotate-45 rounded-[1.5px] shrink-0"
          ></span>
          <span
            style="${labelHaloStyle}"
            class="pointer-events-auto absolute left-[35px] top-[15px] -translate-y-1/2 text-[12px] font-semibold text-[#222222] dark:text-[#f5f5f5] whitespace-nowrap leading-tight"
          >
            ${escapeHtml(shortTitle)}
          </span>
        `;

        wrapper.addEventListener("click", (ev) => {
          ev.stopPropagation();
          callbacksRef.current.onSelectPlace(place, { panCamera: true });
        });

        const marker = new maplibregl.Marker({
          element: wrapper,
          anchor: "bottom",
        })
          .setLngLat([place.lng, place.lat])
          .addTo(map);

        markersRef.current.push(marker);
      }
    }
  }, [
    activeCategory,
    displayedPlaces,
    hasSearchResults,
    isDark,
    isTh,
    language,
    mapReadyTick,
    selectedPlace,
  ]);

  // Professional One-Shot Trajectory Draw-Out Animation (Resort -> Selected Destination, Zero Stale State!)
  const selectedId = selectedPlace ? selectedPlace.id : null;
  const selectedLat = selectedPlace ? selectedPlace.lat : null;
  const selectedLng = selectedPlace ? selectedPlace.lng : null;

  useEffect(() => {
    const map = localMapRef.current;
    if (!map) return;

    // Never gate on map.isStyleLoaded() (which returns false while zoom/pan tiles stream)!
    // ROUTE_SOURCE_ID is guaranteed available as soon as mapReadyTick > 0.
    const source = map.getSource(ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (selectedLat === null || selectedLng === null) {
      source.setData(EMPTY_GEOJSON_COLLECTION);
      return;
    }

    const fullArc = buildCurvedArcGeoJson(
      longitude,
      latitude,
      selectedLng,
      selectedLat,
      72
    );
    const coords = fullArc.geometry.coordinates;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || coords.length < 3) {
      source.setData({
        type: "FeatureCollection",
        features: [fullArc],
      });
      return;
    }

    let rafId: number | null = null;
    const durationMs = 460;
    const startTime = performance.now();

    const animateDraw = (now: number) => {
      const rawProgress = Math.min(1, Math.max(0, (now - startTime) / durationMs));
      // Smooth cubic ease-out: launches briskly from Resort and settles softly into Destination
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      const exactIdx = eased * (coords.length - 1);
      const wholeIdx = Math.floor(exactIdx);
      const frac = exactIdx - wholeIdx;

      if (rawProgress >= 1) {
        source.setData({
          type: "FeatureCollection",
          features: [fullArc],
        });
        rafId = null;
        return;
      }

      const partialCoords: Array<[number, number]> = coords.slice(0, wholeIdx + 1);
      if (wholeIdx + 1 < coords.length && frac > 0) {
        const p0 = coords[wholeIdx];
        const p1 = coords[wholeIdx + 1];
        partialCoords.push([
          p0[0] + (p1[0] - p0[0]) * frac,
          p0[1] + (p1[1] - p0[1]) * frac,
        ]);
      }

      if (partialCoords.length >= 2) {
        const tipCoord = partialCoords[partialCoords.length - 1];
        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: partialCoords,
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: tipCoord,
              },
            },
          ],
        });
      }

      rafId = window.requestAnimationFrame(animateDraw);
    };

    rafId = window.requestAnimationFrame(animateDraw);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [latitude, longitude, mapReadyTick, selectedId, selectedLat, selectedLng]);

  return <div ref={containerRef} className="w-full h-full" />;
}

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

  const [isDesktopLg, setIsDesktopLg] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileSearchSheetOpen, setIsMobileSearchSheetOpen] = useState(false);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const [activeCategory, setActiveCategory] =
    useState<NearbyPlaceCategory>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NearbyPlaceItem[] | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [pendingHostNameFocus, setPendingHostNameFocus] = useState<
    string | null
  >(null);
  const [resolvedHostCoords, setResolvedHostCoords] = useState<
    Record<string, { lat: number; lng: number }>
  >({});

  // On-demand Wikipedia / Wikimedia Commons photo enrichment + broken-image fallback tracking
  const [enrichedMediaById, setEnrichedMediaById] = useState<
    Record<string, { thumbnailUrl?: string; extract?: string }>
  >({});
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, true>>({});
  const attemptedPhotoIdsRef = useRef<Set<string>>(new Set());

  const sectionWrapperRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewContainerRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewMapRef = useRef<maplibregl.Map | null>(null);

  const inlineDesktopMapRef = useRef<maplibregl.Map | null>(null);
  const modalMapRef = useRef<maplibregl.Map | null>(null);
  const mobileSheetInputRef = useRef<HTMLInputElement | null>(null);

  const mobileCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const desktopCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const applyMediaEnrichment = useCallback(
    (item: NearbyPlaceItem): NearbyPlaceItem => {
      const enriched = enrichedMediaById[item.id];
      const candidateThumb = item.thumbnailUrl || enriched?.thumbnailUrl;
      const safeThumb =
        candidateThumb && !brokenImageIds[item.id] ? candidateThumb : undefined;
      return {
        ...item,
        thumbnailUrl: safeThumb,
        description: item.description || enriched?.extract || undefined,
      };
    },
    [brokenImageIds, enrichedMediaById]
  );

  // Merge host nearbySpots with discovered OSM & Wikipedia places
  const mergedHostAndNearby = useMemo<NearbyPlaceItem[]>(() => {
    if (!hasCoords) return [];

    const hostItems: NearbyPlaceItem[] = nearbySpots.map((spot, idx) => {
      const normSpot = normalizeText(spot.nameTh);
      const matched = nearbyPlaces.find((p) => {
        const normP = normalizeText(p.nameTh);
        return (
          normSpot.length >= 3 &&
          (normP.includes(normSpot) || normSpot.includes(normP))
        );
      });

      if (matched) {
        return applyMediaEnrichment({
          ...matched,
          id: `host-${idx}`,
          nameTh: spot.nameTh,
          category: "host",
          subcategoryLabelTh: "จุดแนะนำจากที่พัก",
          subcategoryLabelEn: "Host pick",
          isHostPick: true,
          isApproximateCoord: false,
        });
      }

      const cleanHostDesc = /ขับรถ|เดิน|กม\.|km|นาที|เมตร/i.test(spot.distTh)
        ? undefined
        : spot.distTh;

      const geocoded = resolvedHostCoords[spot.nameTh];
      if (geocoded) {
        const dist = haversineDistanceKm(
          latitude!,
          longitude!,
          geocoded.lat,
          geocoded.lng
        );
        const { driveMinutes, walkMinutes } = estimateRoadDistanceAndTime(dist);
        return applyMediaEnrichment({
          id: `host-${idx}`,
          nameTh: spot.nameTh,
          nameEn: spot.nameTh,
          category: "host",
          subcategoryLabelTh: "จุดแนะนำจากที่พัก",
          subcategoryLabelEn: "Host pick",
          lat: geocoded.lat,
          lng: geocoded.lng,
          distanceKm: Number(dist.toFixed(2)),
          driveMinutes,
          walkMinutes,
          description: cleanHostDesc,
          isHostPick: true,
          isApproximateCoord: false,
          source: "host",
        });
      }

      const parsedKm = parseThaiDistanceKm(spot.distTh);
      const bearing = (idx * 67 + 25) % 360;
      const approx = offsetCoordinateByKm(
        latitude!,
        longitude!,
        parsedKm,
        bearing
      );
      const { driveMinutes, walkMinutes } =
        estimateRoadDistanceAndTime(parsedKm);

      return applyMediaEnrichment({
        id: `host-${idx}`,
        nameTh: spot.nameTh,
        nameEn: spot.nameTh,
        category: "host",
        subcategoryLabelTh: "จุดแนะนำจากที่พัก",
        subcategoryLabelEn: "Host pick",
        lat: approx.lat,
        lng: approx.lng,
        distanceKm: Number(parsedKm.toFixed(2)),
        driveMinutes,
        walkMinutes,
        description: cleanHostDesc,
        isHostPick: true,
        isApproximateCoord: true,
        source: "host",
      });
    });

    const filteredOsm = nearbyPlaces
      .filter((p) => {
        const normP = normalizeText(p.nameTh);
        return !hostItems.some((h) => {
          const normH = normalizeText(h.nameTh);
          return (
            normH.length >= 3 && (normP.includes(normH) || normH.includes(normP))
          );
        });
      })
      .map(applyMediaEnrichment);

    return [...hostItems, ...filteredOsm];
  }, [
    applyMediaEnrichment,
    hasCoords,
    latitude,
    longitude,
    nearbyPlaces,
    nearbySpots,
    resolvedHostCoords,
  ]);

  const displayedPlaces = useMemo<NearbyPlaceItem[]>(() => {
    if (searchResults !== null) {
      return searchResults.map(applyMediaEnrichment);
    }
    if (activeCategory === "all") {
      return mergedHostAndNearby;
    }
    return mergedHostAndNearby.filter((p) => p.category === activeCategory);
  }, [activeCategory, applyMediaEnrichment, mergedHostAndNearby, searchResults]);

  const selectedPlace = useMemo(() => {
    const raw =
      displayedPlaces.find((p) => p.id === selectedPlaceId) ??
      mergedHostAndNearby.find((p) => p.id === selectedPlaceId) ??
      searchResults?.find((p) => p.id === selectedPlaceId) ??
      null;
    return raw ? applyMediaEnrichment(raw) : null;
  }, [
    applyMediaEnrichment,
    displayedPlaces,
    mergedHostAndNearby,
    searchResults,
    selectedPlaceId,
  ]);

  // Automatically look up real photos from Wikipedia / Wikimedia Commons for selected & top visible places
  useEffect(() => {
    const candidates: NearbyPlaceItem[] = [];
    if (selectedPlace && !selectedPlace.thumbnailUrl) {
      candidates.push(selectedPlace);
    }
    if (activeCategory !== "all" || searchResults !== null) {
      for (const item of displayedPlaces.slice(0, 6)) {
        if (!item.thumbnailUrl && !candidates.some((c) => c.id === item.id)) {
          candidates.push(item);
        }
      }
    }

    const toFetch = candidates.filter(
      (c) => !attemptedPhotoIdsRef.current.has(c.id)
    );
    if (toFetch.length === 0) return;

    let cancelled = false;
    for (const item of toFetch) {
      attemptedPhotoIdsRef.current.add(item.id);
      fetch(
        `/api/places/photo?name=${encodeURIComponent(item.nameTh)}&lat=${
          item.lat
        }&lng=${item.lng}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (
            data: { thumbnailUrl?: string | null; extract?: string | null } | null
          ) => {
            if (cancelled || !data) return;
            if (data.thumbnailUrl || data.extract) {
              setEnrichedMediaById((prev) => ({
                ...prev,
                [item.id]: {
                  thumbnailUrl: data.thumbnailUrl || undefined,
                  extract: data.extract || undefined,
                },
              }));
            }
          }
        )
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [activeCategory, displayedPlaces, searchResults, selectedPlace]);

  const markBrokenThumb = useCallback((placeId: string) => {
    setBrokenImageIds((prev) =>
      prev[placeId] ? prev : { ...prev, [placeId]: true }
    );
  }, []);

  const mergeIncomingPlaces = useCallback((incoming: NearbyPlaceItem[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setNearbyPlaces((prev) => {
      let changed = false;
      const combined = [...prev];
      const seenIds = new Set(prev.map((ex) => ex.id));
      const seenNames = new Set(
        prev.map((ex) => `${normalizeText(ex.nameTh)}|${ex.lat.toFixed(2)}|${ex.lng.toFixed(2)}`)
      );
      for (const item of incoming) {
        const nameKey = `${normalizeText(item.nameTh)}|${item.lat.toFixed(2)}|${item.lng.toFixed(2)}`;
        if (seenIds.has(item.id) || seenNames.has(nameKey)) continue;
        seenIds.add(item.id);
        seenNames.add(nameKey);
        combined.push(item);
        changed = true;
      }
      if (!changed) return prev;
      combined.sort((a, b) => a.distanceKm - b.distanceKm);
      return combined.slice(0, 120);
    });
  }, []);

  const fetchAreaPlaces = useCallback(
    async (centerLat: number, centerLng: number) => {
      if (!hasCoords) return;
      setIsLoadingNearby(true);
      try {
        const res = await fetch(
          `/api/places/nearby?lat=${centerLat}&lng=${centerLng}&originLat=${latitude}&originLng=${longitude}`
        );
        const data = (await res.json()) as { items?: NearbyPlaceItem[] };
        if (Array.isArray(data.items)) {
          mergeIncomingPlaces(data.items);
        }
      } catch {
        // retain existing items
      } finally {
        setIsLoadingNearby(false);
        setHasLoadedInitial(true);
      }
    },
    [hasCoords, latitude, longitude, mergeIncomingPlaces]
  );

  // On-demand nearby POI loading ONLY when the user selects a non-host category (Zero auto-fetch storm on page scroll or map expand!)
  useEffect(() => {
    if (!hasCoords || hasLoadedInitial) return;
    if (activeCategory !== "all" && activeCategory !== "host") {
      void fetchAreaPlaces(latitude!, longitude!);
    }
  }, [activeCategory, fetchAreaPlaces, hasCoords, hasLoadedInitial, latitude, longitude]);

  const handlePanAreaFetchIfFiltered = useCallback(
    (lat: number, lng: number) => {
      if (activeCategory === "all" || activeCategory === "host") return;
      void fetchAreaPlaces(lat, lng);
    },
    [activeCategory, fetchAreaPlaces]
  );

  // Geocode unresolved host nearbySpots once initial load completes
  useEffect(() => {
    if (!hasCoords || !hasLoadedInitial) return;
    const unresolved = nearbySpots.filter((spot) => {
      if (resolvedHostCoords[spot.nameTh]) return false;
      const normSpot = normalizeText(spot.nameTh);
      return !nearbyPlaces.some(
        (p) => normSpot.length >= 3 && normalizeText(p.nameTh).includes(normSpot)
      );
    });
    if (unresolved.length === 0) return;

    let cancelled = false;
    Promise.all(
      unresolved.slice(0, 6).map(async (spot) => {
        try {
          const query = `${spot.nameTh} ${provinceText}`.trim();
          const res = await fetch(
            `/api/places/search?q=${encodeURIComponent(
              query
            )}&lat=${latitude}&lng=${longitude}&originLat=${latitude}&originLng=${longitude}`
          );
          if (!res.ok) return null;
          const data = (await res.json()) as { items?: NearbyPlaceItem[] };
          const hit = data.items?.[0];
          if (hit && hit.distanceKm <= 60) {
            return { nameTh: spot.nameTh, lat: hit.lat, lng: hit.lng };
          }
        } catch {
          // retain fallback offset
        }
        return null;
      })
    ).then((hits) => {
      if (cancelled) return;
      const updates: Record<string, { lat: number; lng: number }> = {};
      for (const h of hits) {
        if (h) updates[h.nameTh] = { lat: h.lat, lng: h.lng };
      }
      if (Object.keys(updates).length > 0) {
        setResolvedHostCoords((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    hasCoords,
    hasLoadedInitial,
    latitude,
    longitude,
    nearbyPlaces,
    nearbySpots,
    provinceText,
    resolvedHostCoords,
  ]);

  const getActiveMap = useCallback((): maplibregl.Map | null => {
    if (isModalOpen) return modalMapRef.current;
    if (isDesktopLg) return inlineDesktopMapRef.current;
    return null;
  }, [isDesktopLg, isModalOpen]);

  const focusPlaceOnMap = useCallback(
    (place: NearbyPlaceItem, options?: { panCamera?: boolean }) => {
      setSelectedPlaceId(place.id);
      setIsDropdownOpen(false);
      const shouldPan = options?.panCamera ?? true;
      const map = getActiveMap();
      if (shouldPan && map && hasCoords) {
        const swLng = Math.min(longitude!, place.lng);
        const swLat = Math.min(latitude!, place.lat);
        const neLng = Math.max(longitude!, place.lng);
        const neLat = Math.max(latitude!, place.lat);
        const isInline = !isModalOpen;

        map.fitBounds(
          [
            [swLng, swLat],
            [neLng, neLat],
          ],
          {
            padding: {
              top: isInline ? 90 : 110,
              bottom: isInline ? 70 : isDesktopLg ? 100 : 210,
              left: isDesktopLg ? 380 : 60,
              right: 90,
            },
            maxZoom: 16.2,
            duration: 480,
          }
        );
      }

      if (shouldPan) {
        window.setTimeout(() => {
          mobileCardRefs.current[place.id]?.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
          desktopCardRefs.current[place.id]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }, 60);
      }
    },
    [getActiveMap, hasCoords, isDesktopLg, isModalOpen, latitude, longitude]
  );

  const openModal = useCallback(
    (
      options?: {
        initialCategory?: NearbyPlaceCategory;
        focusHostName?: string;
        openMobileSearchSheet?: boolean;
        preserveCurrentState?: boolean;
      }
    ) => {
      if (!hasCoords) return;
      if (!options?.preserveCurrentState) {
        const nextCat = options?.initialCategory ?? "all";
        setActiveCategory(nextCat);
        setSearchResults(null);
        setActiveSearchQuery("");
        setSearchInput(
          nextCat !== "all" ? getCategoryMeta(nextCat, language).label : ""
        );
        // Exact Airbnb Image 4 UX: show clean category dropdown ready to pick when opening fullscreen without a filter
        setIsDropdownOpen(nextCat === "all" && !options?.focusHostName);
      } else {
        setIsDropdownOpen(
          activeCategory === "all" && searchResults === null && !selectedPlaceId
        );
      }
      setPendingHostNameFocus(options?.focusHostName ?? null);
      setIsModalOpen(true);
      setIsMobileSearchSheetOpen(Boolean(options?.openMobileSearchSheet));
    },
    [activeCategory, hasCoords, language, searchResults, selectedPlaceId]
  );

  // Focus pending Host Spot chip once ready
  useEffect(() => {
    if (!pendingHostNameFocus) return;
    const match = mergedHostAndNearby.find(
      (p) => p.nameTh === pendingHostNameFocus
    );
    if (!match) return;
    const timer = window.setTimeout(() => {
      focusPlaceOnMap(match);
      setPendingHostNameFocus(null);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [focusPlaceOnMap, mergedHostAndNearby, pendingHostNameFocus]);

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMobileSearchSheetOpen) {
          setIsMobileSearchSheetOpen(false);
        } else {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileSearchSheetOpen, isModalOpen]);

  // Initialize lightweight non-interactive Mobile/Tablet Preview Map (< lg ONLY, unmounted while modal is open!)
  useEffect(() => {
    if (isDesktopLg || isModalOpen || !hasCoords || !mobilePreviewContainerRef.current) return;
    ensureMapLibreWorker();
    const container = mobilePreviewContainerRef.current;
    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    getAirbnbVectorMapStyle(isDark).then((style) => {
      if (cancelled || !mobilePreviewContainerRef.current) return;
      const map = new maplibregl.Map({
        container,
        style,
        center: [longitude!, latitude!],
        zoom: 13.7,
        interactive: false,
        attributionControl: false,
      });

      new maplibregl.Marker({
        element: createResortDomMarker(hotelName, "preview"),
        anchor: "center",
      })
        .setLngLat([longitude!, latitude!])
        .addTo(map);

      mobilePreviewMapRef.current = map;
      mapInstance = map;
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => mobilePreviewMapRef.current?.resize())
        : null;
    ro?.observe(container);

    return () => {
      cancelled = true;
      ro?.disconnect();
      mapInstance?.remove();
      mobilePreviewMapRef.current = null;
    };
  }, [hasCoords, hotelName, isDark, isDesktopLg, isModalOpen, latitude, longitude]);

  const runSearchQuery = useCallback(
    async (
      rawQuery: string,
      forcedCategory?: Exclude<NearbyPlaceCategory, "all">
    ) => {
      const q = rawQuery.trim();
      if (!q || !hasCoords) return;
      const activeMap = getActiveMap();
      const center = activeMap?.getCenter();
      const viewLat = center ? center.lat : latitude!;
      const viewLng = center ? center.lng : longitude!;

      setActiveSearchQuery(q);
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(
            q
          )}&lat=${viewLat}&lng=${viewLng}&originLat=${latitude}&originLng=${longitude}`
        );
        const data = (await res.json()) as { items?: NearbyPlaceItem[] };
        const items = (Array.isArray(data.items) ? data.items : []).map(
          (item) =>
            forcedCategory ? { ...item, category: forcedCategory } : item
        );

        if (forcedCategory) {
          mergeIncomingPlaces(items);
        } else {
          setSearchResults(items);
          if (items.length > 0) {
            focusPlaceOnMap(items[0]);
          } else {
            setSelectedPlaceId(null);
          }
        }
      } catch {
        if (!forcedCategory) setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [focusPlaceOnMap, getActiveMap, hasCoords, latitude, longitude, mergeIncomingPlaces]
  );

  const handleSelectCategory = useCallback(
    (cat: Exclude<NearbyPlaceCategory, "all">) => {
      const meta = getCategoryMeta(cat, language);
      setActiveCategory(cat);
      setSearchResults(null);
      setActiveSearchQuery("");
      setSearchInput(meta.label);
      setIsDropdownOpen(false);
      setIsMobileSearchSheetOpen(false);
      setSelectedPlaceId(null);

      const existingCount = mergedHostAndNearby.filter(
        (p) => p.category === cat
      ).length;
      if (cat !== "host" && existingCount < 4 && meta.probeQuery) {
        void runSearchQuery(meta.probeQuery, cat);
      }
    },
    [language, mergedHostAndNearby, runSearchQuery]
  );

  const handleClearFilterAndSearch = () => {
    setActiveCategory("all");
    setSearchInput("");
    setActiveSearchQuery("");
    setSearchResults(null);
    setSelectedPlaceId(null);
    setIsDropdownOpen(false);
  };

  // Live debounced search on typing custom text
  useEffect(() => {
    if (!hasCoords || (!isDesktopLg && !isModalOpen && !isMobileSearchSheetOpen)) {
      return;
    }
    const trimmed = searchInput.trim();
    const activeCatLabel =
      activeCategory !== "all"
        ? getCategoryMeta(activeCategory, language).label
        : "";

    if (!trimmed || trimmed === activeCatLabel) {
      return;
    }
    if (trimmed.length < 2 || trimmed === activeSearchQuery) return;

    const timer = window.setTimeout(() => {
      setActiveCategory("all");
      setIsDropdownOpen(false);
      void runSearchQuery(trimmed);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [
    activeCategory,
    activeSearchQuery,
    hasCoords,
    isDesktopLg,
    isMobileSearchSheetOpen,
    isModalOpen,
    language,
    runSearchQuery,
    searchInput,
  ]);

  const handleZoomActiveMap = (
    targetRef: React.MutableRefObject<maplibregl.Map | null>,
    delta: number
  ) => {
    const map = targetRef.current;
    if (!map) return;
    map.easeTo({
      zoom: Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), map.getZoom() + delta)
      ),
      duration: 240,
    });
  };

  const handleRecenterMap = (
    targetRef: React.MutableRefObject<maplibregl.Map | null>
  ) => {
    if (!hasCoords || !targetRef.current) return;
    targetRef.current.flyTo({
      center: [longitude!, latitude!],
      zoom: 13.9,
      duration: 480,
    });
  };

  const hasActiveFilter =
    activeCategory !== "all" ||
    searchResults !== null ||
    searchInput.trim().length > 0;
  const showCategoryDropdown = isDropdownOpen && !hasActiveFilter;
  const showResultsPanel = activeCategory !== "all" || searchResults !== null;

  const availableCategories = useMemo(
    () =>
      AIRBNB_FLOATING_CATEGORIES.filter(
        (c) => c.id !== "host" || nearbySpots.length > 0
      ),
    [nearbySpots.length]
  );

  // Shared Desktop Floating Top-Left Search + Category Menu + Results / Airbnb Spotlight Card
  const renderDesktopFloatingLeftTool = (isCompactInline: boolean) => {
    const maxListHeightClass = isCompactInline
      ? "max-h-[340px]"
      : "max-h-[min(450px,calc(100dvh-110px))]";

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20"
      >
        {/* Search Input + Separate Clear (X) Button */}
        <div className="flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchInput.trim();
              if (!q) return;
              setActiveCategory("all");
              setIsDropdownOpen(false);
              void runSearchQuery(q);
            }}
            className="w-[300px] xl:w-[332px] h-11 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] flex items-center px-3.5 gap-2.5"
          >
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <input
              type="text"
              value={searchInput}
              onFocus={() => {
                if (activeCategory !== "all") {
                  handleClearFilterAndSearch();
                }
                setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (activeCategory !== "all") {
                  setActiveCategory("all");
                }
                if (!val.trim()) {
                  setSearchResults(null);
                  setActiveSearchQuery("");
                  setIsDropdownOpen(true);
                }
              }}
              placeholder={
                isTh
                  ? "ค้นหากิจกรรม ร้านอาหาร คาเฟ่..."
                  : "Find things to do"
              }
              className="flex-1 min-w-0 bg-transparent border-0 text-[14px] font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
            />
            {(isSearching || isLoadingNearby) && (
              <span className="text-[11px] text-[var(--color-text-tertiary)] shrink-0">
                ...
              </span>
            )}
          </form>

          {(hasActiveFilter || selectedPlace) && (
            <button
              type="button"
              onClick={handleClearFilterAndSearch}
              aria-label={isTh ? "ล้างตัวกรอง" : "Clear"}
              className="h-11 w-11 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Dropdown Menu */}
        {showCategoryDropdown && (
          <div
            className={`mt-2.5 w-[300px] xl:w-[332px] ${maxListHeightClass} overflow-y-auto rounded-[18px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] py-1.5`}
          >
            {availableCategories.map((cat) => {
              const CatIcon = cat.Icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3.5 hover:bg-[var(--color-background-muted)] text-left cursor-pointer transition-colors"
                >
                  <span className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0">
                    <CatIcon className="w-4 h-4" />
                  </span>
                  <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {isTh ? cat.labelTh : cat.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filtered Category / Search Results List */}
        {showResultsPanel && (
          <div
            className={`flex flex-col mt-2.5 w-[300px] xl:w-[332px] ${maxListHeightClass} rounded-[18px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden`}
          >
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
              {(isSearching || isLoadingNearby) &&
              displayedPlaces.length === 0 ? (
                <div className="px-4 py-7 text-center text-[13px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "กำลังค้นหาสถานที่ในบริเวณนี้..."
                    : "Finding places in this area..."}
                </div>
              ) : displayedPlaces.length === 0 ? (
                <div className="px-4 py-7 text-center text-[13px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "ยังไม่พบสถานที่ในหมวดนี้ในบริเวณที่เลือก ลองเลื่อนแผนที่หรือพิมพ์ชื่อสถานที่"
                    : "No places found here yet. Try panning the map or typing a landmark."}
                </div>
              ) : (
                displayedPlaces.map((place) => {
                  const isSelected = place.id === selectedPlaceId;
                  const subLabel = isTh
                    ? place.subcategoryLabelTh
                    : place.subcategoryLabelEn;

                  return (
                    <button
                      key={place.id}
                      ref={(el) => {
                        desktopCardRefs.current[place.id] = el;
                      }}
                      type="button"
                      onClick={() => focusPlaceOnMap(place)}
                      className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--color-background-muted)]"
                          : "bg-transparent hover:bg-[var(--color-background-muted)]/60"
                      }`}
                    >
                      {place.thumbnailUrl ? (
                        <img
                          src={place.thumbnailUrl}
                          alt={place.nameTh}
                          loading="lazy"
                          onError={() => markBrokenThumb(place.id)}
                          className="h-11 w-11 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
                        />
                      ) : (
                        <PlaceCategoryArtwork place={place} variant="thumb" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                          {isTh ? place.nameTh : place.nameEn}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">
                          {subLabel}
                        </p>
                      </div>

                      <span className="shrink-0 text-[12px] font-medium text-[var(--color-text-secondary)] tabular-nums">
                        {formatDistanceLabel(place.distanceKm, language)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {selectedPlace && (
              <div className="px-3.5 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-background-card)] flex items-center justify-between gap-2.5 shrink-0">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)] truncate">
                    {isTh ? selectedPlace.nameTh : selectedPlace.nameEn}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-text-secondary)] tabular-nums">
                    {isTh
                      ? `ห่าง ~${formatDistanceLabel(selectedPlace.distanceKm, language)} (ระยะตรง)`
                      : `~${formatDistanceLabel(selectedPlace.distanceKm, language)} away (straight line)`}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-[9px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0"
                >
                  <span>{isTh ? "นำทาง" : "Directions"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* AIRBNB PLACE SPOTLIGHT CARD (Always displays real photo OR Airbnb Illustrated Map Cover!) */}
        {!showResultsPanel && !showCategoryDropdown && selectedPlace && (
          <div className="mt-2.5 w-[300px] xl:w-[332px] rounded-[20px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] p-3">
            <div className="relative w-full">
              {selectedPlace.thumbnailUrl ? (
                <div className="relative w-full aspect-[16/9] rounded-[14px] overflow-hidden bg-[var(--color-background-muted)]">
                  <img
                    src={selectedPlace.thumbnailUrl}
                    alt={selectedPlace.nameTh}
                    onError={() => markBrokenThumb(selectedPlace.id)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <PlaceCategoryArtwork place={selectedPlace} variant="banner" />
              )}

              <button
                type="button"
                onClick={() => setSelectedPlaceId(null)}
                aria-label="Close card"
                className="absolute top-2.5 right-2.5 z-20 h-8 w-8 rounded-[10px] bg-white/92 dark:bg-[#222222]/90 hover:bg-white dark:hover:bg-[#222222] text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 pb-1 px-2 text-center space-y-1">
              <h3 className="text-[15.5px] font-semibold text-[var(--color-text-primary)] leading-snug">
                {isTh ? selectedPlace.nameTh : selectedPlace.nameEn}
              </h3>
              <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                {isTh
                  ? selectedPlace.subcategoryLabelTh
                  : selectedPlace.subcategoryLabelEn}{" "}
                · {formatDistanceLabel(selectedPlace.distanceKm, language)}
              </p>
              {selectedPlace.description && (
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 pt-0.5">
                  {selectedPlace.description}
                </p>
              )}
              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3.5 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>{isTh ? "นำทางไปจุดนี้" : "Directions"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={sectionWrapperRef} className="space-y-4">
      {hasCoords && (
        <>
          {/* ===============================================================
              1A. DESKTOP (>= lg) DIRECTLY INTERACTIVE INLINE MAP
          ================================================================ */}
          {isDesktopLg ? (
            <div className="relative isolate w-full h-[460px] rounded-[16px] overflow-hidden bg-[#F6F4EF] dark:bg-[#191919] select-none">
              {!isModalOpen && (
                <InteractiveVectorSurface
                  mode="inline-desktop"
                  hotelName={hotelName}
                  latitude={latitude!}
                  longitude={longitude!}
                  isDark={isDark}
                  isTh={isTh}
                  language={language}
                  displayedPlaces={displayedPlaces}
                  activeCategory={activeCategory}
                  hasSearchResults={searchResults !== null}
                  selectedPlace={selectedPlace}
                  onSelectPlace={focusPlaceOnMap}
                  onHarvestPois={mergeIncomingPlaces}
                  onPanAreaFetch={handlePanAreaFetchIfFiltered}
                  onDismissDropdown={() => setIsDropdownOpen(false)}
                  mapRefOut={inlineDesktopMapRef}
                />
              )}

              {renderDesktopFloatingLeftTool(true)}

              <div className="absolute top-3.5 right-3.5 z-20 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal({ preserveCurrentState: true })}
                  aria-label={
                    isTh ? "ขยายแผนที่เต็มจอ" : "Expand full-screen map"
                  }
                  title={isTh ? "ขยายแผนที่เต็มจอ" : "Expand map"}
                  className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <div className="rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)] overflow-hidden flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleZoomActiveMap(inlineDesktopMapRef, 0.85)}
                    aria-label="Zoom in"
                    className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleZoomActiveMap(inlineDesktopMapRef, -0.85)
                    }
                    aria-label="Zoom out"
                    className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleRecenterMap(inlineDesktopMapRef)}
                  aria-label={isTh ? "กลับไปตำแหน่งที่พัก" : "Center on property"}
                  title={isTh ? "กลับไปตำแหน่งที่พัก" : "Center on property"}
                  className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              </div>

              <span className="absolute bottom-1.5 right-2.5 z-10 text-[10px] text-[var(--color-text-tertiary)] bg-white/75 dark:bg-black/50 px-1.5 py-0.5 rounded-[4px] pointer-events-none">
                OpenFreeMap · © OpenStreetMap
              </span>
            </div>
          ) : (
            /* ===============================================================
                1B. MOBILE & TABLET (< lg) PREVIEW MAP
            ================================================================ */
            <div
              role="button"
              tabIndex={0}
              onClick={() => openModal()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openModal();
                }
              }}
              aria-label={
                isTh ? "แตะเพื่อเปิดแผนที่เต็มจอ" : "Tap to open full-screen map"
              }
              className="relative isolate w-full aspect-square sm:aspect-[16/10] rounded-[16px] overflow-hidden bg-[#F6F4EF] dark:bg-[#191919] cursor-pointer select-none"
            >
              <div ref={mobilePreviewContainerRef} className="w-full h-full" />

              <div className="absolute top-3.5 inset-x-3.5 z-10 flex items-center justify-between gap-2.5 pointer-events-none">
                <div className="w-10 shrink-0 hidden sm:block" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal({ openMobileSearchSheet: true });
                  }}
                  className="pointer-events-auto h-11 px-4 rounded-[14px] bg-white/96 dark:bg-[#242424]/96 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] border border-black/[0.06] dark:border-white/[0.1] text-[13.5px] font-medium inline-flex items-center gap-2 max-w-[calc(100%-54px)] cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                  <span className="truncate text-[var(--color-text-secondary)]">
                    {isTh ? "ค้นหากิจกรรม ร้านอาหาร..." : "Find things to do"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal();
                  }}
                  aria-label={isTh ? "ขยายแผนที่เต็มจอ" : "Expand map"}
                  className="pointer-events-auto h-10 w-10 rounded-[12px] bg-white/96 dark:bg-[#242424]/96 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] border border-black/[0.06] dark:border-white/[0.1] inline-flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-24px)] px-3 py-1.5 rounded-[10px] bg-white/95 dark:bg-[#222222]/95 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] text-[12px] font-semibold inline-flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {addressText || `${districtText} · จ.${provinceText}`}
                </span>
              </div>
            </div>
          )}
        </>
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
                onClick={() => openModal({ initialCategory: "host" })}
                className="text-[13px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer hover:opacity-80"
              >
                {isTh ? "ขยายดูเต็มจอ" : "Full map"}
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto overflow-y-hidden gap-2 -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:px-0 md:scroll-px-0 sm:flex-wrap pb-1 no-scrollbar">
            {nearbySpots.map((spot, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (hasCoords) {
                    if (isDesktopLg) {
                      setPendingHostNameFocus(spot.nameTh);
                    } else {
                      openModal({
                        initialCategory: "host",
                        focusHostName: spot.nameTh,
                      });
                    }
                  } else if (googleMapsUrl) {
                    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
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
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          FULL-SCREEN /map INTERACTIVE MODAL
      ====================================================================== */}
      {isModalOpen && hasCoords && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTh ? `แผนที่รอบ ${hotelName}` : `${hotelName} area map`}
          className="fixed inset-0 z-[85] bg-[#F6F4EF] dark:bg-[#191919] overflow-hidden animate-fade-in-backdrop"
        >
          <div className="absolute inset-0 w-full h-full">
            <InteractiveVectorSurface
              mode="fullscreen-modal"
              hotelName={hotelName}
              latitude={latitude!}
              longitude={longitude!}
              isDark={isDark}
              isTh={isTh}
              language={language}
              displayedPlaces={displayedPlaces}
              activeCategory={activeCategory}
              hasSearchResults={searchResults !== null}
              selectedPlace={selectedPlace}
              onSelectPlace={focusPlaceOnMap}
              onHarvestPois={mergeIncomingPlaces}
              onPanAreaFetch={handlePanAreaFetchIfFiltered}
              onDismissDropdown={() => setIsDropdownOpen(false)}
              mapRefOut={modalMapRef}
            />
          </div>

          <span className="hidden sm:inline-block absolute bottom-2 right-3 z-10 text-[10.5px] text-[var(--color-text-tertiary)] bg-white/80 dark:bg-black/55 px-2 py-0.5 rounded-[6px] pointer-events-none">
            OpenFreeMap · © OpenStreetMap contributors
          </span>

          {isDesktopLg ? (
            renderDesktopFloatingLeftTool(false)
          ) : (
            <div className="absolute top-3.5 left-3.5 right-16 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchSheetOpen(true);
                  window.setTimeout(
                    () => mobileSheetInputRef.current?.focus(),
                    120
                  );
                }}
                className="flex-1 max-w-[320px] h-11 px-3.5 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                <span
                  className={`text-[14px] font-medium truncate ${
                    searchInput
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {searchInput ||
                    (isTh ? "ค้นหากิจกรรม ร้านอาหาร..." : "Find things to do")}
                </span>
              </button>

              {(hasActiveFilter || selectedPlace) && (
                <button
                  type="button"
                  onClick={handleClearFilterAndSearch}
                  aria-label="Clear filter"
                  className="h-11 w-11 rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchSheetOpen(false);
                setIsModalOpen(false);
              }}
              aria-label={isTh ? "ปิดแผนที่" : "Close map"}
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)] overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => handleZoomActiveMap(modalMapRef, 0.85)}
                aria-label="Zoom in"
                className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoomActiveMap(modalMapRef, -0.85)}
                aria-label="Zoom out"
                className="h-10 w-10 text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRecenterMap(modalMapRef)}
              aria-label={isTh ? "กลับไปตำแหน่งที่พัก" : "Center on property"}
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          {/* MOBILE & TABLET (< lg) BOTTOM SWIPEABLE SNAP CARDS */}
          {!isDesktopLg &&
            !isMobileSearchSheetOpen &&
            displayedPlaces.length > 0 && (
              <div className="absolute bottom-0 inset-x-0 z-20 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3 px-4 py-2.5 scroll-px-4 no-scrollbar">
                  {displayedPlaces.slice(0, 25).map((place) => {
                    const isSelected = place.id === selectedPlaceId;
                    const subLabel = isTh
                      ? place.subcategoryLabelTh
                      : place.subcategoryLabelEn;

                    return (
                      <div
                        key={place.id}
                        ref={(el) => {
                          mobileCardRefs.current[place.id] = el;
                        }}
                        onClick={() => focusPlaceOnMap(place)}
                        className={`w-[84vw] max-w-[330px] shrink-0 snap-center rounded-[16px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] p-3.5 flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? "border-[1.5px] border-[#222222] dark:border-[#f5f5f5]"
                            : "border border-black/[0.06] dark:border-white/[0.1]"
                        }`}
                      >
                        {place.thumbnailUrl ? (
                          <img
                            src={place.thumbnailUrl}
                            alt={place.nameTh}
                            loading="lazy"
                            onError={() => markBrokenThumb(place.id)}
                            className="h-11 w-11 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
                          />
                        ) : (
                          <PlaceCategoryArtwork place={place} variant="thumb" />
                        )}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
                              {subLabel}
                            </span>
                            <span className="text-[12px] font-semibold text-[var(--color-text-primary)] tabular-nums shrink-0">
                              {formatDistanceLabel(place.distanceKm, language)}
                            </span>
                          </div>
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                            {isTh ? place.nameTh : place.nameEn}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[12px] text-[var(--color-text-secondary)] truncate tabular-nums">
                              {isTh
                                ? `ห่าง ~${formatDistanceLabel(place.distanceKm, language)} (ระยะตรง)`
                                : `~${formatDistanceLabel(place.distanceKm, language)} away`}
                            </span>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${place.lat},${place.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 px-2.5 rounded-[8px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[11.5px] font-semibold inline-flex items-center gap-1 shrink-0"
                            >
                              <span>{isTh ? "นำทาง" : "Go"}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* MOBILE & TABLET (< lg) SLIDE-UP SEARCH & CATEGORY BOTTOM SHEET */}
          {!isDesktopLg && isMobileSearchSheetOpen && (
            <div className="fixed inset-0 z-[90] flex flex-col justify-end">
              <div
                className="fixed inset-0 bg-black/30 animate-fade-in-backdrop"
                onClick={() => setIsMobileSearchSheetOpen(false)}
              />

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full h-[86dvh] rounded-t-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet"
              >
                <div className="pt-3 pb-2 flex justify-center shrink-0">
                  <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
                </div>

                <div className="px-4 pb-3 flex items-center gap-2.5 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = searchInput.trim();
                      if (!q) return;
                      setActiveCategory("all");
                      setIsMobileSearchSheetOpen(false);
                      void runSearchQuery(q);
                    }}
                    className="flex-1 h-12 rounded-[14px] border border-[#222222] dark:border-[#f5f5f5] bg-[var(--color-background-card)] px-3.5 flex items-center gap-2.5"
                  >
                    <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    <input
                      ref={mobileSheetInputRef}
                      type="text"
                      value={searchInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        if (activeCategory !== "all") {
                          setActiveCategory("all");
                        }
                        if (!val.trim()) {
                          setSearchResults(null);
                          setActiveSearchQuery("");
                        }
                      }}
                      placeholder={
                        isTh
                          ? "ค้นหากิจกรรม ร้านอาหาร คาเฟ่..."
                          : "Find things to do"
                      }
                      className="flex-1 min-w-0 bg-transparent border-0 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setSearchResults(null);
                          setActiveSearchQuery("");
                        }}
                        aria-label="Clear input"
                        className="h-6 w-6 rounded-[7px] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>

                  <button
                    type="button"
                    onClick={() => setIsMobileSearchSheetOpen(false)}
                    aria-label="Close search"
                    className="h-11 w-11 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 pb-4 border-b border-[var(--color-border)] flex flex-wrap gap-2.5 shrink-0">
                  {availableCategories.map((cat) => {
                    const CatIcon = cat.Icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`h-11 pl-2 pr-4 rounded-[14px] shadow-[var(--shadow-popover)] border inline-flex items-center gap-2.5 text-[14px] font-semibold cursor-pointer transition-colors ${
                          isActive
                            ? "bg-[#222222] dark:bg-[#f5f5f5] border-[#222222] dark:border-[#f5f5f5] !text-white dark:!text-[#222222]"
                            : "bg-[var(--color-background-card)] border-black/[0.06] dark:border-white/[0.1] text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
                        }`}
                      >
                        <span className="h-7 w-7 rounded-[9px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0">
                          <CatIcon className="w-3.5 h-3.5" />
                        </span>
                        <span>{isTh ? cat.labelTh : cat.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
                  {displayedPlaces.slice(0, 30).map((place) => {
                    const subLabel = isTh
                      ? place.subcategoryLabelTh
                      : place.subcategoryLabelEn;
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => {
                          setIsMobileSearchSheetOpen(false);
                          focusPlaceOnMap(place);
                        }}
                        className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-[var(--color-background-muted)] cursor-pointer transition-colors"
                      >
                        {place.thumbnailUrl ? (
                          <img
                            src={place.thumbnailUrl}
                            alt={place.nameTh}
                            loading="lazy"
                            onError={() => markBrokenThumb(place.id)}
                            className="h-11 w-11 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
                          />
                        ) : (
                          <PlaceCategoryArtwork place={place} variant="thumb" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                            {isTh ? place.nameTh : place.nameEn}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">
                            {subLabel}
                          </p>
                        </div>
                        <span className="shrink-0 text-[12.5px] font-medium text-[var(--color-text-secondary)] tabular-nums">
                          ~{formatDistanceLabel(place.distanceKm, language)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
