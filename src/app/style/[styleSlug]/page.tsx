import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getStyleCollectionMeta } from "@/data/thailandProvinces";
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
import { StyleCollectionClient } from "@/components/home/StyleCollectionClient";

export const dynamic = "force-dynamic";

interface StylePageProps {
  params: Promise<{ styleSlug: string }>;
  searchParams?: Promise<{ province?: string }>;
}

export async function generateMetadata({
  params,
}: StylePageProps): Promise<Metadata> {
  const { styleSlug } = await params;
  const meta = getStyleCollectionMeta(styleSlug);
  if (!meta) {
    return { title: "ไม่พบหมวดที่พัก | Nondii" };
  }
  return {
    title: `${meta.labelTh} — คูปอง & โปรที่พักสวยทั่วไทย | Nondii`,
    description: meta.taglineTh,
    openGraph: {
      type: "website",
      title: `${meta.labelTh} | Nondii`,
      description: meta.taglineTh,
    },
  };
}

export default async function StyleCollectionPage({
  params,
  searchParams,
}: StylePageProps) {
  const [{ styleSlug }, sp, sessionUser, cookieStore, hdrs] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ province?: string }>({}),
    getServerSessionUser(),
    cookies(),
    headers(),
  ]);

  const meta = getStyleCollectionMeta(styleSlug);
  if (!meta) {
    notFound();
  }

  const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
  const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
  const coarse = inferCoarseContextFromHeaders(hdrs);

  const hints = {
    visitorId,
    hasAnalyticsConsent: consent === "analytics",
    originProvinceId: coarse.provinceId,
    deviceType: coarse.deviceType,
  };

  const [allCatalogPins, recentIds] = await Promise.all([
    searchDiscoveryPins({
      limit: 120,
      compact: true,
      userId: sessionUser?.id ?? null,
      ...hints,
    }),
    meta.slug === "recent"
      ? getRecentViewedPinIdsForRequest({
          userId: sessionUser?.id ?? null,
          visitorId,
          hasAnalyticsConsent: consent === "analytics",
          limit: 32,
        })
      : Promise.resolve<string[]>([]),
  ]);

  let collectionPins = allCatalogPins;
  if (meta.slug === "direct") {
    collectionPins = allCatalogPins.filter(
      (p) => p.dealSourceType === "INTERNAL"
    );
  } else if (meta.slug === "curated") {
    collectionPins = allCatalogPins.filter(
      (p) => p.dealSourceType === "EXTERNAL"
    );
  } else if (meta.slug === "recent") {
    collectionPins =
      recentIds.length > 0
        ? await getPinsByIds(recentIds, sessionUser?.id ?? null)
        : [];
  } else {
    collectionPins = allCatalogPins.filter((p) =>
      p.stayStyles.includes(meta.slug)
    );
  }

  const initialProvinceFilter = (sp?.province || "").trim() || null;

  return (
    <StyleCollectionClient
      meta={meta}
      initialCollectionPins={collectionPins}
      allCatalogPins={allCatalogPins}
      initialRecentPinIds={recentIds}
      initialProvinceFilter={initialProvinceFilter}
    />
  );
}
