import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSmartSearchSuggestions } from "@/lib/services/smartSearchService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  decodeCompactTasteSignal,
} from "@/lib/telemetry/tasteTypes";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const tasteParam = url.searchParams.get("taste");
    const recentPinsRaw = url.searchParams.get("recentPins");

    const recentOpenedPinIds = recentPinsRaw
      ? recentPinsRaw
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    const [sessionUser, cookieStore] = await Promise.all([
      getServerSessionUser(),
      cookies(),
    ]);

    const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
    const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const coarse = inferCoarseContextFromHeaders(request.headers);
    const sessionSignal = decodeCompactTasteSignal(tasteParam);

    const payload = await getSmartSearchSuggestions({
      query: q,
      recentOpenedPinIds,
      userId: sessionUser?.id ?? null,
      visitorId,
      hasAnalyticsConsent: consent === "analytics",
      sessionSignal,
      originProvinceId: coarse.provinceId,
      deviceType: coarse.deviceType,
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/search/suggestions]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดคำแนะนำการค้นหาได้" },
      { status: 500 }
    );
  }
}

