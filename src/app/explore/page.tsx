import React from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { VALID_STYLE_TAGS } from "@/data/thailandProvinces";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getPinsByIds,
  getRecentViewedPinIdsForRequest,
  searchDiscoveryPins,
} from "@/lib/services/stayDiscoveryService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
} from "@/lib/telemetry/tasteTypes";
import { ExploreMapClient } from "@/components/explore/ExploreMapClient";
import type { PinFeedItemDto } from "@/types/cangaroom";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แผนที่โปรที่พักทั่วไทย | Nondii",
  description:
    "ซูมและเลื่อนแผนที่เพื่อค้นหาคูปองส่วนลดและโปรที่พักทั่วไทย ทั้งจองตรง 0% GP และดีลคัดพิเศษจากทุกแหล่ง",
};

interface ExploreSearchParams {
  style?: string;
  source?: string;
  province?: string;
  recent?: string;
  q?: string;
  lat?: string;
  lng?: string;
}

export default async function ExploreMapPage({
  searchParams,
}: {
  searchParams?: Promise<ExploreSearchParams>;
}) {
  const [sp, sessionUser, cookieStore, hdrs] = await Promise.all([
    searchParams ?? Promise.resolve<ExploreSearchParams>({}),
    getServerSessionUser(),
    cookies(),
    headers(),
  ]);

  const styleParam = (sp?.style || "").trim();
  const initialStyle = VALID_STYLE_TAGS.has(styleParam) ? styleParam : "all";
  const srcRaw = (sp?.source || "").trim().toUpperCase();
  const initialSource: "ALL" | "INTERNAL" | "EXTERNAL" =
    srcRaw === "INTERNAL" || srcRaw === "EXTERNAL" ? srcRaw : "ALL";
  const initialProvince = (sp?.province || "").trim() || null;
  const initialRecentOnly = sp?.recent === "1" || sp?.recent === "true";
  const initialQuery = (sp?.q || "").trim();
  const initialLat = sp?.lat ? Number(sp.lat) : null;
  const initialLng = sp?.lng ? Number(sp.lng) : null;

  const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
  const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
  const coarse = inferCoarseContextFromHeaders(hdrs);

  let initialDeals: PinFeedItemDto[] = [];
  let initialRecentPinIds: string[] = [];
  try {
    const [fetchedDeals, recentIds] = await Promise.all([
      searchDiscoveryPins({
        style: null,
        limit: 100,
        userId: sessionUser?.id ?? null,
        visitorId,
        hasAnalyticsConsent: consent === "analytics",
        originProvinceId: coarse.provinceId,
        deviceType: coarse.deviceType,
      }),
      getRecentViewedPinIdsForRequest({
        userId: sessionUser?.id ?? null,
        visitorId,
        hasAnalyticsConsent: consent === "analytics",
        limit: 24,
      }),
    ]);
    initialDeals = fetchedDeals;
    initialRecentPinIds = recentIds;

    if (recentIds.length > 0) {
      const existing = new Set(fetchedDeals.map((d) => d.id));
      const missing = recentIds.filter((id) => !existing.has(id));
      if (missing.length > 0) {
        const extra = await getPinsByIds(missing, sessionUser?.id ?? null);
        initialDeals = [...fetchedDeals, ...extra];
      }
    }
  } catch (err) {
    console.error("[ExploreMapPage SSR]", err);
  }

  return (
    <ExploreMapClient
      initialDeals={initialDeals}
      initialStyle={initialStyle}
      initialSource={initialSource}
      initialProvince={initialProvince}
      initialRecentOnly={initialRecentOnly}
      initialRecentPinIds={initialRecentPinIds}
      initialQuery={initialQuery}
      initialCenter={
        initialLat !== null &&
        initialLng !== null &&
        Number.isFinite(initialLat) &&
        Number.isFinite(initialLng)
          ? { lat: initialLat, lng: initialLng }
          : null
      }
    />
  );
}
