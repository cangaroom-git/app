"use client";

export interface PlaceNearbyHopOrigin {
  fromSlug: string;
  fromNameTh: string;
  fromNameEn: string;
  targetSlug: string;
  ts: number;
}

export interface ExploreCameraSnapshot {
  lat: number;
  lng: number;
  zoom: number;
  activeDealId: string | null;
  hasUserMovedMap?: boolean;
  /** Exact visible deal ID order before leaving /explore so Back restores 1:1 order with zero scrambling */
  visibleDealIds?: string[];
  activeIdx?: number;
  deckViewMode?: "fan" | "list";
  isDeckHidden?: boolean;
  ts: number;
}

const NEARBY_HOP_KEY = "nondii:nearby-hop-origin:v1";
const EXPLORE_CAMERA_KEY = "nondii:explore-camera:v1";
const EXPLORE_VIEW_MODE_KEY = "nondii:explore-view-mode:v1";
const TRIP_ACTIVE_INDEX_PREFIX = "nondii:trip-active-idx:v1:";

export function saveNearbyHopOrigin(origin: Omit<PlaceNearbyHopOrigin, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PlaceNearbyHopOrigin = { ...origin, ts: Date.now() };
    window.sessionStorage.setItem(NEARBY_HOP_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function readNearbyHopOriginForSlug(
  currentSlug: string
): PlaceNearbyHopOrigin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(NEARBY_HOP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlaceNearbyHopOrigin>;
    if (
      !parsed ||
      typeof parsed.targetSlug !== "string" ||
      typeof parsed.fromSlug !== "string" ||
      typeof parsed.ts !== "number"
    ) {
      return null;
    }
    // Expire stale hops after 30 minutes
    if (Date.now() - parsed.ts > 30 * 60 * 1000) {
      window.sessionStorage.removeItem(NEARBY_HOP_KEY);
      return null;
    }
    if (parsed.targetSlug.toLowerCase() !== currentSlug.toLowerCase()) {
      return null;
    }
    return {
      fromSlug: parsed.fromSlug,
      fromNameTh: parsed.fromNameTh || parsed.fromSlug,
      fromNameEn: parsed.fromNameEn || parsed.fromNameTh || parsed.fromSlug,
      targetSlug: parsed.targetSlug,
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

export function clearNearbyHopOrigin(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(NEARBY_HOP_KEY);
  } catch {
    // ignore
  }
}

export function saveExploreCameraSnapshot(
  snapshot: Omit<ExploreCameraSnapshot, "ts">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ExploreCameraSnapshot = { ...snapshot, ts: Date.now() };
    window.sessionStorage.setItem(EXPLORE_CAMERA_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function saveExploreViewMode(mode: "fan" | "list"): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(EXPLORE_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function readExploreViewMode(): "fan" | "list" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXPLORE_VIEW_MODE_KEY);
    return raw === "list" || raw === "fan" ? raw : null;
  } catch {
    return null;
  }
}

function normalizeExploreSnapshot(
  parsed: Partial<ExploreCameraSnapshot> | null
): ExploreCameraSnapshot | null {
  if (
    !parsed ||
    typeof parsed.lat !== "number" ||
    typeof parsed.lng !== "number" ||
    typeof parsed.zoom !== "number" ||
    typeof parsed.ts !== "number"
  ) {
    return null;
  }
  if (Date.now() - parsed.ts > 30 * 60 * 1000) return null;
  return {
    lat: parsed.lat,
    lng: parsed.lng,
    zoom: parsed.zoom,
    activeDealId:
      typeof parsed.activeDealId === "string" ? parsed.activeDealId : null,
    hasUserMovedMap:
      typeof parsed.hasUserMovedMap === "boolean"
        ? parsed.hasUserMovedMap
        : true,
    visibleDealIds: Array.isArray(parsed.visibleDealIds)
      ? parsed.visibleDealIds.filter((id): id is string => typeof id === "string")
      : undefined,
    activeIdx: typeof parsed.activeIdx === "number" ? parsed.activeIdx : undefined,
    deckViewMode:
      parsed.deckViewMode === "list" || parsed.deckViewMode === "fan"
        ? parsed.deckViewMode
        : undefined,
    isDeckHidden:
      typeof parsed.isDeckHidden === "boolean" ? parsed.isDeckHidden : undefined,
    ts: parsed.ts,
  };
}

export function peekExploreCameraSnapshot(): ExploreCameraSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXPLORE_CAMERA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExploreCameraSnapshot>;
    return normalizeExploreSnapshot(parsed);
  } catch {
    return null;
  }
}

export function consumeExploreCameraSnapshot(): ExploreCameraSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXPLORE_CAMERA_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(EXPLORE_CAMERA_KEY);
    const parsed = JSON.parse(raw) as Partial<ExploreCameraSnapshot>;
    return normalizeExploreSnapshot(parsed);
  } catch {
    return null;
  }
}

export function saveTripActiveIndex(tripId: string, index: number): void {
  if (typeof window === "undefined" || !tripId) return;
  try {
    window.sessionStorage.setItem(
      `${TRIP_ACTIVE_INDEX_PREFIX}${tripId}`,
      JSON.stringify({ index, ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

export function consumeTripActiveIndex(tripId: string): number | null {
  if (typeof window === "undefined" || !tripId) return null;
  try {
    const key = `${TRIP_ACTIVE_INDEX_PREFIX}${tripId}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    window.sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as { index?: number; ts?: number };
    if (
      typeof parsed.index !== "number" ||
      typeof parsed.ts !== "number" ||
      Date.now() - parsed.ts > 30 * 60 * 1000
    ) {
      return null;
    }
    return parsed.index;
  } catch {
    return null;
  }
}
