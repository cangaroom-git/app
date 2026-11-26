import { prisma } from "@/lib/prisma";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import { THAILAND_PROVINCE_CENTROIDS } from "@/lib/geo/thailandProvinceCentroids";
import type { LocationScopeDto, PlaceCategoryDto } from "@/types/cangaroom";

export interface AdminSidebarCounts {
  pendingInboxCount: number;
  pendingPlacesCount: number;
  openReportsCount: number;
}

export interface ProvinceReachMetric {
  provinceId: string;
  nameTh: string;
  nameEn: string;
  region: string;
  lat: number;
  lng: number;
  placesCount: number;
  activePromosCount: number;
  totalEngagement: number;
}

export interface AdminPerformanceRow {
  id: string;
  hotelId: string;
  hotelSlug: string;
  hotelNameTh: string;
  coverImageUrl: string;
  placeCategory: PlaceCategoryDto;
  locationScope: LocationScopeDto;
  provinceId: string;
  provinceNameTh: string;
  promoHeadlineTh: string | null;
  promoExpiresAt: string | null;
  dealSourceType: "INTERNAL" | "EXTERNAL";
  isSponsored: boolean;
  viewsCount: number;
  savesCount: number;
  likesCount: number;
  externalClickCount: number;
}

export interface AdminOverviewData {
  kpis: {
    pendingInboxCount: number;
    activePromosCount: number;
    totalPlacesCount: number;
    pendingPlacesCount: number;
    openReportsCount: number;
    expiringSoonCount: number;
    provincesCoveredCount: number;
    totalEngagementCount: number;
  };
  provinceReach: ProvinceReachMetric[];
  performanceRows: AdminPerformanceRow[];
}

export async function getAdminSidebarCounts(): Promise<AdminSidebarCounts> {
  const [pendingInboxCount, pendingPlacesCount, openReportsCount] =
    await Promise.all([
      prisma.promoInboxItem.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.hotel.count({ where: { verificationStatus: "PENDING_REVIEW" } }),
      prisma.placeReport.count({ where: { status: "OPEN" } }),
    ]);

  return { pendingInboxCount, pendingPlacesCount, openReportsCount };
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const now = new Date();
  const soonDate = new Date(now.getTime() + 5 * 86_400_000);

  const [
    pendingInboxCount,
    totalPlacesCount,
    pendingPlacesCount,
    openReportsCount,
    allHotels,
    publishedPins,
  ] = await Promise.all([
    prisma.promoInboxItem.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.hotel.count(),
    prisma.hotel.count({ where: { verificationStatus: "PENDING_REVIEW" } }),
    prisma.placeReport.count({ where: { status: "OPEN" } }),
    prisma.hotel.findMany({
      where: { verificationStatus: { not: "SUSPENDED" } },
      select: {
        id: true,
        provinceId: true,
        placeCategory: true,
        locationScope: true,
      },
    }),
    prisma.pin.findMany({
      where: {
        publishStatus: "PUBLISHED",
        hotel: { verificationStatus: { not: "SUSPENDED" } },
      },
      orderBy: [
        { viewsCount: "desc" },
        { savesCount: "desc" },
        { likesCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 500,
      select: {
        id: true,
        hotelId: true,
        coverImageUrl: true,
        provinceId: true,
        promoHeadlineTh: true,
        promoExpiresAt: true,
        promoCategoryCode: true,
        dealSourceType: true,
        isSponsored: true,
        viewsCount: true,
        savesCount: true,
        likesCount: true,
        externalClickCount: true,
        hotel: {
          select: {
            slug: true,
            nameTh: true,
            placeCategory: true,
            locationScope: true,
            coupons: {
              where: { isActive: true, expiresAt: { gt: now } },
              take: 1,
              select: { badgeTextTh: true, titleTh: true, expiresAt: true },
            },
          },
        },
      },
    }),
  ]);

  const provinceNameMap = new Map(
    THAILAND_77_PROVINCES.map((p) => [
      p.id,
      {
        nameTh: p.nameTh.split("(")[0].trim(),
        nameEn: p.nameEn,
        region: p.region,
      },
    ])
  );

  // Aggregate 77-province metrics
  const metricsByProvince = new Map<
    string,
    { placesCount: number; activePromosCount: number; totalEngagement: number }
  >();

  for (const h of allHotels) {
    if (!h.provinceId || h.provinceId === "nationwide") continue;
    const prev = metricsByProvince.get(h.provinceId) ?? {
      placesCount: 0,
      activePromosCount: 0,
      totalEngagement: 0,
    };
    prev.placesCount += 1;
    metricsByProvince.set(h.provinceId, prev);
  }

  let activePromosCount = 0;
  let expiringSoonCount = 0;
  let totalEngagementCount = 0;

  const performanceRows: AdminPerformanceRow[] = [];

  for (const pin of publishedPins) {
    const coupon = pin.hotel.coupons[0] ?? null;
    const resolvedHeadline =
      pin.promoHeadlineTh?.trim() ||
      coupon?.badgeTextTh?.trim() ||
      coupon?.titleTh?.trim() ||
      null;
    const resolvedExpiresAt = pin.promoExpiresAt ?? coupon?.expiresAt ?? null;
    const isExpired = Boolean(
      resolvedExpiresAt && resolvedExpiresAt.getTime() <= now.getTime()
    );
    const hasActivePromo = Boolean(resolvedHeadline && !isExpired);

    if (hasActivePromo) {
      activePromosCount += 1;
      if (
        resolvedExpiresAt &&
        resolvedExpiresAt.getTime() <= soonDate.getTime()
      ) {
        expiringSoonCount += 1;
      }
    }

    const engagement =
      pin.viewsCount + pin.savesCount * 3 + pin.likesCount * 2 + pin.externalClickCount * 4;
    totalEngagementCount += engagement;

    if (pin.provinceId && pin.provinceId !== "nationwide") {
      const prev = metricsByProvince.get(pin.provinceId) ?? {
        placesCount: 0,
        activePromosCount: 0,
        totalEngagement: 0,
      };
      if (hasActivePromo) prev.activePromosCount += 1;
      prev.totalEngagement += Math.max(1, engagement);
      metricsByProvince.set(pin.provinceId, prev);
    }

    const provMeta = provinceNameMap.get(pin.provinceId);
    performanceRows.push({
      id: pin.id,
      hotelId: pin.hotelId,
      hotelSlug: pin.hotel.slug,
      hotelNameTh: pin.hotel.nameTh,
      coverImageUrl: pin.coverImageUrl,
      placeCategory: pin.hotel.placeCategory as PlaceCategoryDto,
      locationScope: pin.hotel.locationScope as LocationScopeDto,
      provinceId: pin.provinceId,
      provinceNameTh:
        pin.provinceId === "nationwide"
          ? "ทั่วประเทศ"
          : provMeta?.nameTh ?? pin.provinceId,
      promoHeadlineTh: resolvedHeadline,
      promoExpiresAt: resolvedExpiresAt ? resolvedExpiresAt.toISOString() : null,
      dealSourceType: pin.dealSourceType,
      isSponsored: pin.isSponsored,
      viewsCount: pin.viewsCount,
      savesCount: pin.savesCount,
      likesCount: pin.likesCount,
      externalClickCount: pin.externalClickCount,
    });
  }

  const provinceReach: ProvinceReachMetric[] = THAILAND_77_PROVINCES.map((p) => {
    const centroid = THAILAND_PROVINCE_CENTROIDS[p.id] ?? {
      lat: 13.7563,
      lng: 100.5018,
    };
    const agg = metricsByProvince.get(p.id) ?? {
      placesCount: 0,
      activePromosCount: 0,
      totalEngagement: 0,
    };
    return {
      provinceId: p.id,
      nameTh: p.nameTh.split("(")[0].trim(),
      nameEn: p.nameEn,
      region: p.region,
      lat: centroid.lat,
      lng: centroid.lng,
      placesCount: agg.placesCount,
      activePromosCount: agg.activePromosCount,
      totalEngagement: agg.totalEngagement,
    };
  });

  const provincesCoveredCount = provinceReach.filter(
    (p) => p.placesCount > 0 || p.activePromosCount > 0
  ).length;

  return {
    kpis: {
      pendingInboxCount,
      activePromosCount,
      totalPlacesCount,
      pendingPlacesCount,
      openReportsCount,
      expiringSoonCount,
      provincesCoveredCount,
      totalEngagementCount,
    },
    provinceReach,
    performanceRows,
  };
}
