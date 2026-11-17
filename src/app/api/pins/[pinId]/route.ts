import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getPinDetailById } from "@/lib/services/stayDiscoveryService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  decodeCompactTasteSignal,
} from "@/lib/telemetry/tasteTypes";

export async function GET(
  request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const { pinId } = await context.params;
    const url = new URL(request.url);
    const tasteParam = url.searchParams.get("taste");

    const [sessionUser, cookieStore] = await Promise.all([
      getServerSessionUser(),
      cookies(),
    ]);

    const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
    const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const coarse = inferCoarseContextFromHeaders(request.headers);
    const sessionSignal = decodeCompactTasteSignal(tasteParam);

    const detail = await getPinDetailById(pinId, sessionUser?.id ?? null, {
      visitorId,
      hasAnalyticsConsent: consent === "analytics",
      sessionSignal,
      originProvinceId: coarse.provinceId,
      deviceType: coarse.deviceType,
    });

    if (!detail) {
      return NextResponse.json({ error: "ไม่พบ Pin นี้" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[GET /api/pins/[pinId]]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายละเอียด Pin ได้" },
      { status: 500 }
    );
  }
}
