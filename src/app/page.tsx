import React, { cache } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { VALID_STYLE_TAGS } from "@/data/thailandProvinces";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getPinDetailById,
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
      title: "Cangaroom — ค้นหาที่พักสวยทั่วไทย & จองตรงฟรีค่า GP 0%",
      description:
        "Cangaroom แพลตฟอร์มรวมที่พักไทยสไตล์ Pinterest ทั้งภูเขา ทะเล พูลวิลล่า แกลมปิ้ง พร้อมเก็บคูปองส่วนลดและจองห้องพักตรงกับโรงแรม 0% GP",
    };
  }

  const detail = await loadPinDetailForSsr(stayId);
  if (!detail) {
    return {
      title: "Cangaroom — ค้นหาที่พักสวยทั่วไทย",
    };
  }

  const { pin } = detail;
  const priceTag = pin.nightlyPriceThb
    ? ` · เริ่มต้น ฿${pin.nightlyPriceThb.toLocaleString()}/คืน`
    : "";
  const title = `${pin.hotelNameTh} — ${pin.titleTh}${priceTag} | Cangaroom`;
  const description =
    pin.descriptionTh ||
    `ชมบรรยากาศจริงและจองห้องพักตรง 0% GP ที่ ${pin.hotelNameTh} จ.${pin.provinceNameTh}`;

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
  let initialPinDetail: {
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null = null;

  try {
    const [fetchedPins, fetchedDetail] = await Promise.all([
      searchDiscoveryPins({
        style: null,
        limit: 60,
        userId: sessionUser?.id ?? null,
        ...hints,
      }),
      stayId
        ? sessionUser?.id
          ? getPinDetailById(stayId, sessionUser.id, hints)
          : loadPinDetailForSsr(stayId)
        : Promise.resolve(null),
    ]);
    initialPins = fetchedPins;
    initialPinDetail = fetchedDetail;
  } catch (err) {
    console.error("[HomePage SSR]", err);
  }

  return (
    <HomeFeedClient
      initialPins={initialPins}
      initialStyleTab={initialStyleTab}
      initialStayId={stayId}
      initialPinDetail={initialPinDetail}
    />
  );
}
