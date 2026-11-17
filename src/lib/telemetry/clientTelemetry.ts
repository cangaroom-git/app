"use client";

import type { PinFeedItemDto } from "@/types/cangaroom";
import {
  CGR_CONSENT_COOKIE,
  encodeCompactTasteSignal,
  type CompactSessionTasteSignal,
  type TelemetryEventTypeName,
  type TelemetrySingleEventInput,
} from "@/lib/telemetry/tasteTypes";

export const OPEN_PRIVACY_SETTINGS_EVENT = "cgr:open-privacy-settings";

interface InMemorySessionTaste {
  styleScores: Record<string, number>;
  provinceScores: Record<string, number>;
  tagScores: Record<string, number>;
  priceWeightedSum: number;
  priceWeightTotal: number;
  openedPinIds: string[];
  quickSkippedPinIds: Set<string>;
  impressionCounts: Record<string, number>;
  interactionCounter: number;
}

const sessionState: InMemorySessionTaste = {
  styleScores: {},
  provinceScores: {},
  tagScores: {},
  priceWeightedSum: 0,
  priceWeightTotal: 0,
  openedPinIds: [],
  quickSkippedPinIds: new Set(),
  impressionCounts: {},
  interactionCounter: 0,
};

let ephemeralSessionId = "";
let eventQueue: TelemetrySingleEventInput[] = [];
let flushTimerId: number | null = null;
let listenersBound = false;

function getEphemeralSessionId(): string {
  if (ephemeralSessionId) return ephemeralSessionId;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    ephemeralSessionId = crypto.randomUUID();
  } else {
    ephemeralSessionId = `s_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
  }
  return ephemeralSessionId;
}

function getViewportBucket(): "sm" | "md" | "lg" {
  if (typeof window === "undefined") return "lg";
  if (window.innerWidth < 640) return "sm";
  if (window.innerWidth < 1024) return "md";
  return "lg";
}

function getReferrerHost(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const u = new URL(document.referrer);
    if (typeof window !== "undefined" && u.hostname === window.location.hostname) {
      return null;
    }
    return u.hostname.slice(0, 100);
  } catch {
    return null;
  }
}

export function readClientConsentCookie(): "analytics" | "essential" | "unset" {
  if (typeof document === "undefined") return "unset";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CGR_CONSENT_COOKIE}=`));
  if (!match) return "unset";
  const val = match.split("=")[1]?.trim();
  if (val === "analytics" || val === "essential") return val;
  return "unset";
}

function applyInMemoryTasteUpdate(ev: TelemetrySingleEventInput) {
  if (ev.eventType === "PIN_IMPRESSION" && ev.pinId) {
    sessionState.impressionCounts[ev.pinId] =
      (sessionState.impressionCounts[ev.pinId] ?? 0) + 1;
    return;
  }

  if (ev.eventType === "PIN_OPEN" && ev.pinId) {
    sessionState.openedPinIds = [
      ...sessionState.openedPinIds.filter((id) => id !== ev.pinId),
      ev.pinId,
    ].slice(-24);
    sessionState.quickSkippedPinIds.delete(ev.pinId);
    sessionState.interactionCounter += 1;
  }

  let weight = 0;
  switch (ev.eventType) {
    case "PIN_SAVE":
    case "COUPON_CLAIM":
      weight = 6.0;
      break;
    case "BOOKING_INITIATE":
      weight = 7.5;
      break;
    case "ROOM_CALENDAR_SELECT":
      weight = 5.5;
      break;
    case "HOTEL_PROFILE_VIEW":
    case "PIN_SHARE":
      weight = 4.5;
      break;
    case "PIN_LIKE":
      weight = 3.5;
      break;
    case "MEDIA_EXPAND":
      weight = 2.2;
      break;
    case "CAROUSEL_SWIPE":
      weight = Math.min(3.0, 1.0 + (ev.carouselDepth ?? 2) * 0.45);
      break;
    case "PIN_DWELL": {
      const ms = ev.dwellMs ?? 0;
      if (ms > 0 && ms < 1400) {
        weight = -0.4;
        if (ev.pinId) sessionState.quickSkippedPinIds.add(ev.pinId);
      } else if (ms >= 1400 && ms < 4500) {
        weight = 1.0;
      } else if (ms >= 4500 && ms < 12000) {
        weight = 2.8;
      } else if (ms >= 12000) {
        weight = 4.5;
      }
      break;
    }
    case "PIN_OPEN":
      weight = 0.8;
      break;
    default:
      weight = 0;
  }

  if (weight === 0) return;

  sessionState.interactionCounter += 1;

  if (ev.stayStyles) {
    for (const st of ev.stayStyles) {
      sessionState.styleScores[st] = Math.max(
        0,
        (sessionState.styleScores[st] ?? 0) + weight
      );
    }
  }
  if (ev.provinceId) {
    sessionState.provinceScores[ev.provinceId] = Math.max(
      0,
      (sessionState.provinceScores[ev.provinceId] ?? 0) + weight * 0.85
    );
  }
  if (ev.semanticTags) {
    for (const tag of ev.semanticTags) {
      sessionState.tagScores[tag] = Math.max(
        0,
        (sessionState.tagScores[tag] ?? 0) + weight * 0.65
      );
    }
  }
  if (weight > 0 && ev.priceThb && ev.priceThb > 0) {
    sessionState.priceWeightedSum += ev.priceThb * weight;
    sessionState.priceWeightTotal += weight;
  }
}

export function flushTelemetryQueue(useBeacon = false): void {
  if (eventQueue.length === 0 || typeof window === "undefined") return;

  if (flushTimerId !== null) {
    window.clearTimeout(flushTimerId);
    flushTimerId = null;
  }

  const batch = eventQueue.slice(0, 45);
  eventQueue = eventQueue.slice(45);

  const isDark = document.documentElement.classList.contains("dark");
  const payload = JSON.stringify({
    sessionId: getEphemeralSessionId(),
    viewportBucket: getViewportBucket(),
    theme: isDark ? "dark" : "light",
    events: batch,
  });

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry/batch", blob);
    return;
  }

  fetch("/api/telemetry/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function ensureVisibilityFlushListener() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushTelemetryQueue(true);
    }
  });
}

function scheduleBatchFlush() {
  if (typeof window === "undefined") return;
  ensureVisibilityFlushListener();

  if (eventQueue.length >= 25) {
    flushTelemetryQueue(false);
    return;
  }

  if (flushTimerId === null) {
    flushTimerId = window.setTimeout(() => {
      flushTimerId = null;
      flushTelemetryQueue(false);
    }, 10_000);
  }
}

export function trackTelemetryEvent(input: TelemetrySingleEventInput): void {
  const enriched: TelemetrySingleEventInput = {
    ...input,
    referrerHost: input.referrerHost ?? getReferrerHost(),
  };

  // Always update in-tab RAM taste vector immediately (0ms latency, zero cookies required)
  applyInMemoryTasteUpdate(enriched);

  // If user explicitly chose "essential", only send anonymous PIN_OPEN aggregate view count
  const consent = readClientConsentCookie();
  if (consent === "essential" && enriched.eventType !== "PIN_OPEN") {
    return;
  }
  // Before user answers banner ("unset"), only send PIN_OPEN or buffer up to 20 events in memory
  if (consent === "unset" && eventQueue.length >= 20 && enriched.eventType === "PIN_IMPRESSION") {
    return;
  }

  eventQueue.push(enriched);
  scheduleBatchFlush();
}

export function trackPinInteraction(
  eventType: TelemetryEventTypeName,
  pin: PinFeedItemDto,
  extra?: { dwellMs?: number; carouselDepth?: number }
): void {
  trackTelemetryEvent({
    eventType,
    pinId: pin.id,
    hotelId: pin.hotelId,
    provinceId: pin.provinceId,
    stayStyles: pin.stayStyles.slice(0, 6),
    semanticTags: pin.semanticTags.slice(0, 8),
    priceThb: pin.nightlyPriceThb,
    dwellMs: extra?.dwellMs ?? null,
    carouselDepth: extra?.carouselDepth ?? null,
  });
}

export function getEncodedSessionTasteParam(): string {
  const topEntries = (rec: Record<string, number>, max: number) =>
    Object.fromEntries(
      Object.entries(rec)
        .filter(([, v]) => v >= 0.3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, max)
        .map(([k, v]) => [k, Math.round(v * 10) / 10])
    );

  const fatiguedIds = new Set<string>(sessionState.quickSkippedPinIds);
  for (const [pinId, impCount] of Object.entries(sessionState.impressionCounts)) {
    if (impCount >= 3 && !sessionState.openedPinIds.includes(pinId)) {
      fatiguedIds.add(pinId);
    }
  }

  const topStyles = topEntries(sessionState.styleScores, 4);
  const topProvinces = topEntries(sessionState.provinceScores, 4);
  const topTags = topEntries(sessionState.tagScores, 6);
  const avgBudget =
    sessionState.priceWeightTotal > 0
      ? Math.round(sessionState.priceWeightedSum / sessionState.priceWeightTotal)
      : null;

  const signal: CompactSessionTasteSignal = {
    ...(Object.keys(topStyles).length > 0 ? { s: topStyles } : {}),
    ...(Object.keys(topProvinces).length > 0 ? { p: topProvinces } : {}),
    ...(Object.keys(topTags).length > 0 ? { t: topTags } : {}),
    ...(avgBudget ? { b: avgBudget } : {}),
    ...(sessionState.openedPinIds.length > 0
      ? { o: sessionState.openedPinIds.slice(-14) }
      : {}),
    ...(fatiguedIds.size > 0
      ? { x: Array.from(fatiguedIds).slice(-16) }
      : {}),
    v: getViewportBucket(),
  };

  return encodeCompactTasteSignal(signal);
}

export function getSessionInteractionCount(): number {
  return sessionState.interactionCounter;
}

export function resetClientSessionTaste(): void {
  sessionState.styleScores = {};
  sessionState.provinceScores = {};
  sessionState.tagScores = {};
  sessionState.priceWeightedSum = 0;
  sessionState.priceWeightTotal = 0;
  sessionState.openedPinIds = [];
  sessionState.quickSkippedPinIds.clear();
  sessionState.impressionCounts = {};
  sessionState.interactionCounter = 0;
  eventQueue = [];
}

export function openPrivacySettingsModal(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_PRIVACY_SETTINGS_EVENT));
  }
}

