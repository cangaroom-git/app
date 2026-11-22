import React, { cache } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { VALID_STYLE_TAGS } from "@/data/thailandProvinces";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getPinDetailById,
  getPinsByIds,
  getRecentViewedPinIdsForRequest,
  searchDiscoveryPins,
} from "@/lib/services/stayDiscoveryService";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
} from "@/lib/telemetry/tasteTypes";
import { HomeFeedClient } from "@/components/home/HomeFeedClient";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

export const dynamic = "force-dynamic";

const loadPinDetailForSsr = cache(async (stayId: string) => {
  try {
    return await getPinDetailById(stayId, null);
  } catch {
    return null;
  }
});

interface HomeSearchParams {
  stay?: string;
  pin?: string;
  style?: string;
  source?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>;
}): Promise<Metadata> {
  const sp = await (searchParams ?? Promise.resolve<HomeSearchParams>({}));
  const stayId = (sp?.stay || sp?.pin || "").trim();

  if (!stayId) {
    return {
      title: "Nondii — รวมคูปองและโปรที่พักสวยทั่วไทย · จองตรง 0% GP",
      description:
        "ศูนย์รวมส่วนลด คูปอง และโปรโมชั่นที่พักสวยทั่วไทย ทั้งโปรจองตรง 0% GP และดีลคัดพิเศษจากทุกแหล่ง ค้นหาตามจังหวัด สไตล์ และแผนที่ได้ในที่เดียว",
    };
  }

  const detail = await loadPinDetailForSsr(stayId);
  if (!detail) {
    return {
      title: "Nondii — รวมคูปองและโปรที่พักทั่วไทย",
    };
  }

  const { pin } = detail;
  const promoTag = pin.promoHeadlineTh ? ` (${pin.promoHeadlineTh})` : "";
  const title = `${pin.hotelNameTh}${promoTag} | Nondii`;
  const description =
    pin.descriptionTh ||
    `ดูรายละเอียดโปรโมชั่น คูปองส่วนลด และทำเลที่พัก ${pin.hotelNameTh} จ.${pin.provinceNameTh}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: pin.coverImageUrl ? [{ url: pin.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: pin.coverImageUrl ? [pin.coverImageUrl] : undefined,
    },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>;
}) {
  const [sp, sessionUser, cookieStore, hdrs] = await Promise.all([
    searchParams ?? Promise.resolve<HomeSearchParams>({}),
    getServerSessionUser(),
    cookies(),
    headers(),
  ]);

  const stayId = (sp?.stay || sp?.pin || "").trim() || null;
  const styleParam = (sp?.style || "").trim();
  const initialStyleTab = VALID_STYLE_TAGS.has(styleParam)
    ? styleParam
    : "all";
  const sourceParam = (sp?.source || "").trim().toUpperCase();
  const initialSourceFilter: "ALL" | "INTERNAL" | "EXTERNAL" =
    sourceParam === "INTERNAL" || sourceParam === "EXTERNAL"
      ? sourceParam
      : "ALL";

  const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
  const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
  const coarse = inferCoarseContextFromHeaders(hdrs);

  const hints = {
    visitorId,
    hasAnalyticsConsent: consent === "analytics",
    originProvinceId: coarse.provinceId,
    deviceType: coarse.deviceType,
  };

  let initialPins: PinFeedItemDto[] = [];
  let initialRecentPins: PinFeedItemDto[] = [];
  let initialPinDetail: {
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null = null;

  try {
    const [fetchedPins, fetchedDetail, recentPinIds] = await Promise.all([
      searchDiscoveryPins({
        style: null,
        limit: 80,
        userId: sessionUser?.id ?? null,
        ...hints,
      }),
      stayId
        ? sessionUser?.id
          ? getPinDetailById(stayId, sessionUser.id, hints)
          : loadPinDetailForSsr(stayId)
        : Promise.resolve(null),
      getRecentViewedPinIdsForRequest({
        userId: sessionUser?.id ?? null,
        visitorId,
        hasAnalyticsConsent: consent === "analytics",
        limit: 20,
      }),
    ]);
    initialPins = fetchedPins;
    initialPinDetail = fetchedDetail;

    if (recentPinIds.length > 0) {
      const byId = new Map(fetchedPins.map((p) => [p.id, p]));
      const missingIds = recentPinIds.filter((id) => !byId.has(id));
      if (missingIds.length > 0) {
        const extraPins = await getPinsByIds(
          missingIds,
          sessionUser?.id ?? null
        );
        for (const ep of extraPins) byId.set(ep.id, ep);
      }
      initialRecentPins = recentPinIds
        .map((id) => byId.get(id))
        .filter((p): p is PinFeedItemDto => Boolean(p));
    }
  } catch (err) {
    console.error("[HomePage SSR]", err);
  }

  return (
    <HomeFeedClient
      initialPins={initialPins}
      initialRecentPins={initialRecentPins}
      initialStyleTab={initialStyleTab}
      initialSourceFilter={initialSourceFilter}
      initialStayId={stayId}
      initialPinDetail={initialPinDetail}
    />
  );
}
