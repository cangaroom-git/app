export type NearbyPlaceCategory =
  | "all"
  | "host"
  | "dining"
  | "cafe"
  | "groceries"
  | "shopping"
  | "essential"
  | "attraction";

export interface NearbyPlaceItem {
  id: string;
  nameTh: string;
  nameEn: string;
  category: Exclude<NearbyPlaceCategory, "all">;
  subcategoryLabelTh: string;
  subcategoryLabelEn: string;
  lat: number;
  lng: number;
  distanceKm: number;
  driveMinutes: number;
  walkMinutes: number;
  description?: string;
  thumbnailUrl?: string;
  isHostPick?: boolean;
  isApproximateCoord?: boolean;
  source: "host" | "osm" | "wikipedia" | "search";
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute great-circle haversine distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Estimate practical road distance (1.28x straight line) plus driving & walking durations.
 */
export function estimateRoadDistanceAndTime(straightKm: number): {
  roadKm: number;
  driveMinutes: number;
  walkMinutes: number;
} {
  const safeKm = Math.max(0.05, Number.isFinite(straightKm) ? straightKm : 0.5);
  const roadKm = safeKm * 1.28;
  const driveMinutes = Math.max(1, Math.round((roadKm / 36) * 60));
  const walkMinutes = Math.max(1, Math.round((roadKm / 4.5) * 60));
  return { roadKm, driveMinutes, walkMinutes };
}

/**
 * Format compact distance label for UI pills and POI cards.
 */
export function formatDistanceLabel(
  distanceKm: number,
  lang: "th" | "en"
): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "";
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 10) * 10);
    return lang === "th" ? `${meters.toLocaleString()} ม.` : `${meters} m`;
  }
  return lang === "th"
    ? `${distanceKm.toFixed(1)} กม.`
    : `${distanceKm.toFixed(1)} km`;
}

/**
 * Parse host-provided Thai/English distance string (e.g. "800 ม.", "1.2 กม.", "5 นาที") into km.
 */
export function parseThaiDistanceKm(distText: string): number {
  const text = (distText || "").trim().toLowerCase();
  const numMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return 1.0;
  const value = Number.parseFloat(numMatch[1]);
  if (!Number.isFinite(value) || value <= 0) return 1.0;

  if (text.includes("กม") || text.includes("km")) {
    return value;
  }
  if (text.includes("นาที") || text.includes("min")) {
    return Number(((value / 60) * 30).toFixed(2));
  }
  if (text.includes("ม.") || text.endsWith("m") || text.includes("เมตร")) {
    return value >= 20 ? value / 1000 : value;
  }
  return value >= 50 ? value / 1000 : value;
}

/**
 * Deterministic fallback coordinate offset around resort center when geocoding has no exact hit.
 */
export function offsetCoordinateByKm(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg: number
): { lat: number; lng: number } {
  const angularDist = Math.max(0.15, distanceKm) / EARTH_RADIUS_KM;
  const bearingRad = toRad(bearingDeg);
  const latRad = toRad(lat);
  const lngRad = toRad(lng);

  const nextLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDist) +
      Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearingRad)
  );
  const nextLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(latRad),
      Math.cos(angularDist) - Math.sin(latRad) * Math.sin(nextLatRad)
    );

  return {
    lat: (nextLatRad * 180) / Math.PI,
    lng: (nextLngRad * 180) / Math.PI,
  };
}

/**
 * Build a smooth quadratic Bezier GeoJSON LineString between the resort and a selected POI.
 */
export function buildCurvedArcGeoJson(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 36
): {
  type: "Feature";
  properties: Record<string, never>;
  geometry: {
    type: "LineString";
    coordinates: Array<[number, number]>;
  };
} {
  const midLng = (fromLng + toLng) / 2;
  const midLat = (fromLat + toLat) / 2;
  const dx = toLng - fromLng;
  const dy = toLat - fromLat;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-6) {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
      },
    };
  }

  // Offset perpendicular to chord cleanly upward so arc looks balanced on Mercator
  const perpX = -dy;
  const perpY = dx;
  const sign = perpY >= 0 ? 1 : -1;
  const curveAmount = 0.18;
  const ctrlLng = midLng + perpX * curveAmount * sign;
  const ctrlLat = midLat + perpY * curveAmount * sign;

  const coordinates: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;
    const lng =
      oneMinusT * oneMinusT * fromLng +
      2 * oneMinusT * t * ctrlLng +
      t * t * toLng;
    const lat =
      oneMinusT * oneMinusT * fromLat +
      2 * oneMinusT * t * ctrlLat +
      t * t * toLat;
    coordinates.push([lng, lat]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

