import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { searchDiscoveryPins } from "@/lib/services/stayDiscoveryService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  decodeCompactTasteSignal,
} from "@/lib/telemetry/tasteTypes";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const style = url.searchParams.get("style");
    const provinceId = url.searchParams.get("provinceId");
    const q = url.searchParams.get("q");
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");
    const guestsRaw = url.searchParams.get("guests");
    const limitRaw = url.searchParams.get("limit");
    const tasteParam = url.searchParams.get("taste");

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
      provinceId,
      q,
      checkIn,
      checkOut,
      guests: guestsRaw ? Number(guestsRaw) : null,
      limit: limitRaw ? Math.min(Number(limitRaw) || 60, 100) : 60,
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
