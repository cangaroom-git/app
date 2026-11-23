import React from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import {
  THAILAND_REGIONS,
  VALID_STYLE_TAGS,
  type ThailandRegionId,
} from "@/data/thailandProvinces";
import { isValidPlaceCategory } from "@/lib/placeCategories";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getPinsByIds,
  getRecentViewedPinIdsForRequest,
  searchDiscoveryPins,
} from "@/lib/services/stayDiscoveryService";
import {
  buildStaticFallbackLocationCatalog,
  getPublicLocationCatalog,
  type LocationCatalogDto,
} from "@/lib/services/locationConfigService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
} from "@/lib/telemetry/tasteTypes";
import {
  ExploreMapClient,
} from "@/components/explore/ExploreMapClient";
import type { LocationScopeId } from "@/components/explore/ProvinceWheelPickerModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แผนที่โปรที่พักทั่วไทย | Nondii",
  description:
    "ซูมและเลื่อนแผนที่เพื่อค้นหาคูปองส่วนลดและโปรที่พักทั่วไทย ทั้งจองตรง 0% GP และดีลคัดพิเศษจากทุกแหล่ง",
};

interface ExploreSearchParams {
  style?: string;
  category?: string;
  source?: string;
  region?: string;
  province?: string;
  recent?: string;
  q?: string;
  lat?: string;
  lng?: string;
}

const VALID_REGION_IDS = new Set<string>(THAILAND_REGIONS.map((r) => r.id));

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
  const catRaw = (sp?.category || "").trim().toUpperCase();
  const initialCategory = isValidPlaceCategory(catRaw) ? catRaw : "ALL";
  const srcRaw = (sp?.source || "").trim().toUpperCase();
  const initialSource: "ALL" | "INTERNAL" | "EXTERNAL" =
    srcRaw === "INTERNAL" || srcRaw === "EXTERNAL" ? srcRaw : "ALL";
  const regionRaw = (sp?.region || "").trim().toLowerCase();
  const initialRegion: LocationScopeId =
    regionRaw === "tourist"
      ? "tourist"
      : VALID_REGION_IDS.has(regionRaw)
      ? (regionRaw as ThailandRegionId)
      : "all";
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
  let locationCatalog: LocationCatalogDto = buildStaticFallbackLocationCatalog();
  try {
    const [fetchedDeals, provinceDeals, recentIds, catalog] = await Promise.all([
      searchDiscoveryPins({
        style: null,
        limit: 100,
        compact: true,
        userId: sessionUser?.id ?? null,
        visitorId,
        hasAnalyticsConsent: consent === "analytics",
        originProvinceId: coarse.provinceId,
        deviceType: coarse.deviceType,
      }),
      initialProvince
        ? searchDiscoveryPins({
            provinceId: initialProvince,
            limit: 80,
            compact: true,
            userId: sessionUser?.id ?? null,
            visitorId,
            hasAnalyticsConsent: consent === "analytics",
            originProvinceId: coarse.provinceId,
            deviceType: coarse.deviceType,
          })
        : Promise.resolve<PinFeedItemDto[]>([]),
      getRecentViewedPinIdsForRequest({
        userId: sessionUser?.id ?? null,
        visitorId,
        hasAnalyticsConsent: consent === "analytics",
        limit: 24,
      }),
      getPublicLocationCatalog(),
    ]);
    locationCatalog = catalog;
    initialRecentPinIds = recentIds;

    const mergedById = new Map<string, PinFeedItemDto>();
    for (const d of fetchedDeals) mergedById.set(d.id, d);
    for (const d of provinceDeals) mergedById.set(d.id, d);
    initialDeals = Array.from(mergedById.values());

    if (recentIds.length > 0) {
      const missing = recentIds.filter((id) => !mergedById.has(id));
      if (missing.length > 0) {
        const extra = await getPinsByIds(missing, sessionUser?.id ?? null);
        initialDeals = [...initialDeals, ...extra];
      }
    }
  } catch (err) {
    console.error("[ExploreMapPage SSR]", err);
  }

  return (
    <ExploreMapClient
      initialDeals={initialDeals}
      initialStyle={initialStyle}
      initialCategory={initialCategory}
      initialSource={initialSource}
      initialRegion={initialRegion}
      initialProvince={initialProvince}
      locationCatalog={locationCatalog}
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
