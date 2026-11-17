import { z } from "zod";

export const CGR_CONSENT_COOKIE = "cgr_consent";
export const CGR_VISITOR_COOKIE = "cgr_vid";
export const PDPA_RETENTION_DAYS = 180;
export const PDPA_COOKIE_MAX_AGE_SEC = PDPA_RETENTION_DAYS * 24 * 60 * 60;

export type ConsentLevel = "analytics" | "essential";

export const TELEMETRY_EVENT_TYPES = [
  "PIN_IMPRESSION",
  "PIN_OPEN",
  "PIN_DWELL",
  "CAROUSEL_SWIPE",
  "MEDIA_EXPAND",
  "VIDEO_PROGRESS",
  "PIN_SAVE",
  "PIN_LIKE",
  "PIN_SHARE",
  "HOTEL_PROFILE_VIEW",
  "ROOM_CALENDAR_SELECT",
  "COUPON_CLAIM",
  "BOOKING_INITIATE",
  "SEARCH_FILTER",
] as const;

export type TelemetryEventTypeName = (typeof TELEMETRY_EVENT_TYPES)[number];

export const ConsentRequestSchema = z.object({
  consent: z.enum(["analytics", "essential"]),
  preferredLang: z.enum(["th", "en"]).optional(),
  preferredTheme: z.enum(["light", "dark"]).optional(),
  viewportBucket: z.enum(["sm", "md", "lg"]).optional(),
});

export const TelemetrySingleEventSchema = z.object({
  eventType: z.enum(TELEMETRY_EVENT_TYPES),
  pinId: z.string().max(64).optional().nullable(),
  hotelId: z.string().max(64).optional().nullable(),
  provinceId: z.string().max(64).optional().nullable(),
  dwellMs: z.number().int().min(0).max(600_000).optional().nullable(),
  carouselDepth: z.number().int().min(1).max(30).optional().nullable(),
  stayStyles: z.array(z.string().max(32)).max(8).optional(),
  semanticTags: z.array(z.string().max(48)).max(12).optional(),
  priceThb: z.number().int().min(0).max(500_000).optional().nullable(),
  guests: z.number().int().min(1).max(30).optional().nullable(),
  styleTab: z.string().max(32).optional().nullable(),
  referrerHost: z.string().max(120).optional().nullable(),
});

export const TelemetryBatchPayloadSchema = z.object({
  sessionId: z.string().min(6).max(64),
  viewportBucket: z.enum(["sm", "md", "lg"]).optional(),
  lang: z.enum(["th", "en"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  events: z.array(TelemetrySingleEventSchema).min(1).max(50),
});

export type TelemetrySingleEventInput = z.infer<
  typeof TelemetrySingleEventSchema
>;

/**
 * Compact URL-safe session taste summary sent on `/api/pins` & `/api/pins/[pinId]`.
 * Works purely from in-tab session memory even when persistent cookies are disabled!
 */
export interface CompactSessionTasteSignal {
  /** Top stay styles -> positive score */
  s?: Record<string, number>;
  /** Top provinces -> positive score */
  p?: Record<string, number>;
  /** Top semantic tags -> positive score */
  t?: Record<string, number>;
  /** Inferred preferred nightly budget in THB */
  b?: number | null;
  /** Recently opened pin IDs in this tab */
  o?: string[];
  /** Skipped / fatigued pin IDs (seen >=3x with 0 clicks or <1.5s quick bounce) */
  x?: string[];
  /** Viewport device hint */
  v?: "sm" | "md" | "lg";
}

export function encodeCompactTasteSignal(
  signal: CompactSessionTasteSignal
): string {
  try {
    const json = JSON.stringify(signal);
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      return encodeURIComponent(
        window.btoa(encodeURIComponent(json))
      );
    }
    return encodeURIComponent(
      Buffer.from(encodeURIComponent(json), "utf8").toString("base64")
    );
  } catch {
    return "";
  }
}

export function decodeCompactTasteSignal(
  raw: string | null | undefined
): CompactSessionTasteSignal | null {
  if (!raw || raw.length > 2400) return null;
  try {
    const unescaped = decodeURIComponent(raw);
    const decodedUri = Buffer.from(unescaped, "base64").toString("utf8");
    const jsonStr = decodeURIComponent(decodedUri);
    const parsed = JSON.parse(jsonStr) as CompactSessionTasteSignal;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

