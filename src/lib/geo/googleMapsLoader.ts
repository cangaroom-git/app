"use client";

import type { NearbyPlaceItem } from "@/lib/geo/nearbyPlacesTypes";

export const HOME_HOUSE_SVG = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h4v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6h4a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9z"/>
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
  fuel: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>`,
  ev: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  transit: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
};

/**
 * Soft, Warm Airbnb-Inspired Category Medallion Palette (Unified Across Map Pins & Category Buttons).
 * - Distinct from the #222222 black Home House Pin (Host/Nondii picks use warm terracotta #E87A64, never black!).
 * - Only the actively selected pin switches to #222222 black.
 */
export const AIRBNB_WARM_CATEGORY_COLORS = {
  dining: "#FBBF49",
  cafe: "#F4B242",
  groceries: "#5B9BF8",
  shopping: "#669DF6",
  essential: "#9FBDB9",
  attraction: "#9F88F0",
  host: "#E87A64",
} as const;

export function resolveCategoryPinVisual(place: NearbyPlaceItem): {
  bgHex: string;
  iconSvg: string;
} {
  switch (place.category) {
    case "dining":
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.dining, iconSvg: PIN_WHITE_ICONS.dining };
    case "cafe":
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.cafe, iconSvg: PIN_WHITE_ICONS.cafe };
    case "groceries":
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.groceries, iconSvg: PIN_WHITE_ICONS.groceries };
    case "shopping":
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.shopping, iconSvg: PIN_WHITE_ICONS.shopping };
    case "essential": {
      const text = `${place.subcategoryLabelTh} ${place.subcategoryLabelEn} ${place.nameTh}`;
      if (/โรงพยาบาล|คลินิก|ยา|medical|hospital|pharmacy/i.test(text)) {
        return { bgHex: "#E57373", iconSvg: PIN_WHITE_ICONS.medical };
      }
      if (/ev|ชาร์จ|electric/i.test(text)) {
        return { bgHex: "#69AFA4", iconSvg: PIN_WHITE_ICONS.ev };
      }
      if (/ปั๊ม|น้ำมัน|gas|fuel|ptt|ปตท|บางจาก|shell|caltex/i.test(text)) {
        return { bgHex: "#8EA6B4", iconSvg: PIN_WHITE_ICONS.fuel };
      }
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.essential, iconSvg: PIN_WHITE_ICONS.transit };
    }
    case "attraction": {
      const text = `${place.subcategoryLabelTh} ${place.subcategoryLabelEn} ${place.nameTh}`;
      if (/น้ำตก|อุทยาน|ภูเขา|ชายหาด|สวน|ถ้ำ|waterfall|park|beach|nature|peak/i.test(text)) {
        return { bgHex: "#76BA86", iconSvg: PIN_WHITE_ICONS.nature };
      }
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.attraction, iconSvg: PIN_WHITE_ICONS.landmark };
    }
    case "host":
    default:
      return { bgHex: AIRBNB_WARM_CATEGORY_COLORS.host, iconSvg: PIN_WHITE_ICONS.host };
  }
}

/**
 * Airbnb-style iconic 42×42px charcoal circle with white house icon (ZERO giant pill box blocking streets!).
 *
 * CRITICAL POSITIONING NOTE:
 * - Never set inline `position: relative` on the outer element passed to MapLibre's `new Marker({ element })`
 *   because MapLibre relies on `.maplibregl-marker { position: absolute; top: 0; left: 0; }` — overriding it
 *   stacks subsequent markers vertically downward off their real coordinates!
 * - For Google Maps `AdvancedMarkerElement` (whose default anchor is bottom-center), apply `translateY(50%)`
 *   on the inner wrapper so the circle center lands pixel-exact on `(lat, lng)` where dotted arcs begin!
 */
export function createHomeHousePinElement(
  hotelName: string,
  anchorMode: "maplibre" | "google" = "maplibre"
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.title = hotelName;
  wrap.setAttribute("aria-label", hotelName);
  wrap.style.cssText =
    "display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:default;user-select:none;";

  const circle = document.createElement("div");
  circle.style.cssText = [
    "position:relative",
    anchorMode === "google" ? "transform:translateY(50%)" : "",
    "width:42px",
    "height:42px",
    "border-radius:9999px",
    "background:#222222",
    "color:#ffffff",
    "border:2.5px solid #ffffff",
    "box-shadow:0 4px 14px rgba(0,0,0,0.28)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ]
    .filter(Boolean)
    .join(";");
  circle.innerHTML = HOME_HOUSE_SVG;
  wrap.appendChild(circle);
  return wrap;
}

/**
 * Airbnb-style crisp circular category medallion pin (28–34px) with optional clean text-halo label (ZERO white box clutter!).
 * Keeps the outer root free of `position: relative` (preserving MapLibre's `position: absolute`) and centers
 * Google `AdvancedMarkerElement` via inner `translateY(50%)` so dotted arcs terminate dead-center on every pin!
 */
export function createCategoryPinElement(params: {
  place: NearbyPlaceItem;
  isSelected: boolean;
  isHovered: boolean;
  language: "th" | "en";
  isDark: boolean;
  showLabel: boolean;
  anchorMode?: "maplibre" | "google";
  onClick: () => void;
  onHover?: (hovered: boolean) => void;
}): HTMLButtonElement {
  const {
    place,
    isSelected,
    isHovered,
    language,
    isDark,
    showLabel,
    anchorMode = "maplibre",
    onClick,
    onHover,
  } = params;
  const visual = resolveCategoryPinVisual(place);
  const labelText =
    language === "th" ? place.nameTh : place.nameEn || place.nameTh;
  const emphasized = isSelected || isHovered;
  const size = isSelected ? 34 : 28;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = labelText;
  btn.setAttribute("aria-label", labelText);
  btn.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "background:transparent",
    "border:0",
    "padding:0",
    "margin:0",
    "cursor:pointer",
    "user-select:none",
    `z-index:${isSelected ? 40 : isHovered ? 30 : 10}`,
  ].join(";");

  const inner = document.createElement("span");
  inner.style.cssText = [
    "position:relative",
    anchorMode === "google" ? "transform:translateY(50%)" : "",
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
  ]
    .filter(Boolean)
    .join(";");

  const circle = document.createElement("span");
  circle.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:9999px",
    `background:${isSelected ? "#222222" : visual.bgHex}`,
    "color:#ffffff",
    `border:${isSelected ? "2.5px" : "2px"} solid #ffffff`,
    `box-shadow:${
      emphasized
        ? "0 4px 14px rgba(0,0,0,0.32)"
        : "0 2px 7px rgba(0,0,0,0.22)"
    }`,
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "flex-shrink:0",
    "transition:background-color 140ms ease, box-shadow 140ms ease",
  ].join(";");
  circle.innerHTML = visual.iconSvg;
  inner.appendChild(circle);

  if (showLabel || emphasized) {
    const label = document.createElement("span");
    const haloColor = isDark
      ? "rgba(22,22,22,0.92)"
      : "rgba(255,255,255,0.96)";
    label.style.cssText = [
      "position:absolute",
      `left:${size + 5}px`,
      "top:50%",
      "transform:translateY(-50%)",
      "font-size:11.5px",
      `font-weight:${emphasized ? "700" : "600"}`,
      `color:${isDark ? "#f5f5f5" : "#222222"}`,
      "white-space:nowrap",
      "max-width:142px",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "pointer-events:none",
      `text-shadow:0 1px 0 ${haloColor}, 0 -1px 0 ${haloColor}, 1px 0 0 ${haloColor}, -1px 0 0 ${haloColor}, 1px 1px 2px ${haloColor}, -1px -1px 2px ${haloColor}`,
    ].join(";");
    label.textContent = labelText;
    inner.appendChild(label);
  }

  btn.appendChild(inner);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  if (onHover) {
    btn.addEventListener("mouseenter", () => onHover(true));
    btn.addEventListener("mouseleave", () => onHover(false));
  }

  return btn;
}

/* ============================================================================
   LAZY GOOGLE MAPS JAVASCRIPT API V3 LOADER (Zero External NPM Dependency!)
   ============================================================================ */

export interface GoogleMapsRuntime {
  maps: {
    importLibrary: (name: string) => Promise<Record<string, unknown>>;
    LatLngBounds: new () => {
      extend: (pt: { lat: number; lng: number }) => void;
    };
    Circle: new (opts: Record<string, unknown>) => {
      setMap: (map: unknown) => void;
      setRadius: (r: number) => void;
    };
    Polyline: new (opts: Record<string, unknown>) => {
      setMap: (map: unknown) => void;
      setPath: (path: Array<{ lat: number; lng: number }>) => void;
    };
    SymbolPath: { CIRCLE: number };
    event: {
      removeListener: (listener: unknown) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsRuntime;
    __nondiiGoogleMapsInit?: () => void;
  }
}

let googleMapsPromise: Promise<GoogleMapsRuntime> | null = null;
let googleMapsSessionQuotaReserved = false;

export function isGoogleMapsClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
}

export function getGoogleMapsVectorMapId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || undefined;
}

export function hasLoadedGoogleMapsInSession(): boolean {
  return Boolean(
    typeof window !== "undefined" && window.google?.maps?.importLibrary
  );
}

export function markGoogleMapsQuotaReservedForSession(): void {
  googleMapsSessionQuotaReserved = true;
}

export function isGoogleMapsQuotaReservedForSession(): boolean {
  return googleMapsSessionQuotaReserved;
}

export function loadGoogleMapsJs(
  language: "th" | "en" = "th"
): Promise<GoogleMapsRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser only"));
  }
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }

  googleMapsPromise = new Promise<GoogleMapsRuntime>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      googleMapsPromise = null;
      reject(new Error("Google Maps JS load timed out"));
    }, 10000);

    window.__nondiiGoogleMapsInit = () => {
      window.clearTimeout(timeoutId);
      if (window.google?.maps?.importLibrary) {
        resolve(window.google);
      } else {
        googleMapsPromise = null;
        reject(new Error("Google Maps JS initialized without importLibrary"));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-nondii-gmaps="true"]'
    );
    if (existing) {
      existing.addEventListener("error", () => {
        window.clearTimeout(timeoutId);
        googleMapsPromise = null;
        reject(new Error("Google Maps script error"));
      });
      return;
    }

    const script = document.createElement("script");
    script.dataset.nondiiGmaps = "true";
    script.async = true;
    script.defer = true;
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("v", "weekly");
    url.searchParams.set("language", language === "en" ? "en" : "th");
    url.searchParams.set("region", "TH");
    url.searchParams.set("loading", "async");
    url.searchParams.set("callback", "__nondiiGoogleMapsInit");
    script.src = url.toString();

    script.onerror = () => {
      window.clearTimeout(timeoutId);
      googleMapsPromise = null;
      reject(new Error("Failed to load Google Maps JS"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
