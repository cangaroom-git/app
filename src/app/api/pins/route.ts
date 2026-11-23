import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getPinsByIds,
  searchDiscoveryPins,
} from "@/lib/services/stayDiscoveryService";
import { isValidPlaceCategory } from "@/lib/placeCategories";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  decodeCompactTasteSignal,
} from "@/lib/telemetry/tasteTypes";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("ids");
    if (idsParam !== null) {
      const requestedIds = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 30);
      const sessionUser = await getServerSessionUser();
      const pins = await getPinsByIds(requestedIds, sessionUser?.id ?? null);
      return NextResponse.json({ pins });
    }

    const style = url.searchParams.get("style");
    const placeCategoryRaw = url.searchParams.get("placeCategory")?.toUpperCase();
    const placeCategory = isValidPlaceCategory(placeCategoryRaw)
      ? placeCategoryRaw
      : "ALL";
    const provinceId = url.searchParams.get("provinceId");
    const sourceTypeRaw = url.searchParams.get("sourceType")?.toUpperCase();
    const sourceType =
      sourceTypeRaw === "INTERNAL" || sourceTypeRaw === "EXTERNAL"
        ? sourceTypeRaw
        : null;
    const q = url.searchParams.get("q");
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");
    const guestsRaw = url.searchParams.get("guests");
    const maxPriceRaw = url.searchParams.get("maxPrice");
    const limitRaw = url.searchParams.get("limit");
    const tasteParam = url.searchParams.get("taste");
    const compactRaw = url.searchParams.get("compact");
    const compact = compactRaw === "1" || compactRaw === "true";

    const north = Number(url.searchParams.get("north"));
    const south = Number(url.searchParams.get("south"));
    const east = Number(url.searchParams.get("east"));
    const west = Number(url.searchParams.get("west"));
    const hasBounds =
      url.searchParams.has("north") &&
      url.searchParams.has("south") &&
      url.searchParams.has("east") &&
      url.searchParams.has("west") &&
      Number.isFinite(north) &&
      Number.isFinite(south) &&
      Number.isFinite(east) &&
      Number.isFinite(west);

    const [sessionUser, cookieStore] = await Promise.all([
      getServerSessionUser(),
      cookies(),
    ]);

    const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
    const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const coarse = inferCoarseContextFromHeaders(request.headers);
    const sessionSignal = decodeCompactTasteSignal(tasteParam);

    const pins = await searchDiscoveryPins({
      style,
      placeCategory,
      provinceId,
      sourceType,
      q,
      checkIn,
      checkOut,
      guests: guestsRaw ? Number(guestsRaw) : null,
      maxPriceThb: maxPriceRaw ? Number(maxPriceRaw) : null,
      bounds: hasBounds ? { north, south, east, west } : null,
      limit: limitRaw ? Math.min(Number(limitRaw) || 60, 100) : 60,
      compact,
      userId: sessionUser?.id ?? null,
      visitorId,
      hasAnalyticsConsent: consent === "analytics",
      sessionSignal,
      originProvinceId: coarse.provinceId,
      deviceType: coarse.deviceType,
    });

    return NextResponse.json({ pins });
  } catch (err) {
    console.error("[GET /api/pins]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการที่พักได้" },
      { status: 500 }
    );
  }
}
