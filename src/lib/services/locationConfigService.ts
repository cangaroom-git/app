import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PROVINCE_CONFIGS,
  DEFAULT_REGION_CONFIGS,
} from "@/data/thailandProvinceBounds";
import { NONDII_CACHE_TAGS } from "@/lib/cache/revalidateNondii";
import type { ThailandRegionId } from "@/data/thailandProvinces";

export interface RegionConfigDto {
  id: ThailandRegionId;
  labelTh: string;
  labelEn: string;
  sortOrder: number;
  centerLat: number;
  centerLng: number;
  southLat: number;
  westLng: number;
  northLat: number;
  eastLng: number;
  defaultZoom: number;
  isActive: boolean;
}

export interface ProvinceConfigDto {
  id: string;
  regionId: ThailandRegionId;
  nameTh: string;
  nameEn: string;
  shortNameTh: string;
  shortNameEn: string;
  isTouristHub: boolean;
  regionSortOrder: number;
  nationalSortOrder: number;
  centerLat: number;
  centerLng: number;
  southLat: number;
  westLng: number;
  northLat: number;
  eastLng: number;
  defaultZoom: number;
  isActive: boolean;
  placeCount: number;
}

export interface LocationCatalogDto {
  regions: RegionConfigDto[];
  provinces: ProvinceConfigDto[];
}

export function buildStaticFallbackLocationCatalog(
  placeCounts?: Map<string, number>
): LocationCatalogDto {
  return {
    regions: DEFAULT_REGION_CONFIGS.map((r) => ({
      ...r,
      isActive: true,
    })),
    provinces: DEFAULT_PROVINCE_CONFIGS.map((p) => ({
      ...p,
      isActive: true,
      placeCount: placeCounts?.get(p.id) ?? 0,
    })),
  };
}

/**
 * Ensures RegionConfig (6) and ProvinceConfig (77) exist in PostgreSQL.
 * Safe and idempotent via createMany(skipDuplicates: true).
 */
export async function ensureLocationConfigsSeeded(): Promise<void> {
  const existingProvinceCount = await prisma.provinceConfig.count();
  if (existingProvinceCount >= DEFAULT_PROVINCE_CONFIGS.length) {
    return;
  }

  await prisma.$transaction([
    prisma.regionConfig.createMany({
      data: DEFAULT_REGION_CONFIGS.map((r) => ({ ...r, isActive: true })),
      skipDuplicates: true,
    }),
    prisma.provinceConfig.createMany({
      data: DEFAULT_PROVINCE_CONFIGS.map((p) => ({ ...p, isActive: true })),
      skipDuplicates: true,
    }),
  ]);
}

async function fetchLocationCatalogFromDb(options?: {
  includeInactive?: boolean;
}): Promise<LocationCatalogDto> {
  const includeInactive = Boolean(options?.includeInactive);

  try {
    await ensureLocationConfigsSeeded();

    const [regions, provinces, placeGroups] = await Promise.all([
      prisma.regionConfig.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
      prisma.provinceConfig.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ nationalSortOrder: "asc" }, { regionSortOrder: "asc" }],
      }),
      prisma.pin.groupBy({
        by: ["provinceId"],
        where: {
          publishStatus: "PUBLISHED",
          isCanonicalCard: true,
          hotel: {
            isPublished: true,
            verificationStatus: { not: "SUSPENDED" },
          },
        },
        _count: { _all: true },
      }),
    ]);

    const placeCounts = new Map<string, number>(
      placeGroups.map((g) => [g.provinceId, g._count._all])
    );

    if (regions.length === 0 || provinces.length === 0) {
      return buildStaticFallbackLocationCatalog(placeCounts);
    }

    return {
      regions: regions.map((r) => ({
        id: r.id as ThailandRegionId,
        labelTh: r.labelTh,
        labelEn: r.labelEn,
        sortOrder: r.sortOrder,
        centerLat: r.centerLat,
        centerLng: r.centerLng,
        southLat: r.southLat,
        westLng: r.westLng,
        northLat: r.northLat,
        eastLng: r.eastLng,
        defaultZoom: r.defaultZoom,
        isActive: r.isActive,
      })),
      provinces: provinces.map((p) => ({
        id: p.id,
        regionId: p.regionId as ThailandRegionId,
        nameTh: p.nameTh,
        nameEn: p.nameEn,
        shortNameTh: p.shortNameTh,
        shortNameEn: p.shortNameEn,
        isTouristHub: p.isTouristHub,
        regionSortOrder: p.regionSortOrder,
        nationalSortOrder: p.nationalSortOrder,
        centerLat: p.centerLat,
        centerLng: p.centerLng,
        southLat: p.southLat,
        westLng: p.westLng,
        northLat: p.northLat,
        eastLng: p.eastLng,
        defaultZoom: p.defaultZoom,
        isActive: p.isActive,
        placeCount: placeCounts.get(p.id) ?? 0,
      })),
    };
  } catch (err) {
    console.error("[fetchLocationCatalogFromDb] fallback to static defaults:", err);
    return buildStaticFallbackLocationCatalog();
  }
}

/**
 * Cached public location catalog (regions + 77 provinces + live place counts).
 * 1-hour server cache, invalidated immediately when Super-Admin saves ordering/coords.
 */
export const getPublicLocationCatalog = cache(
  async (): Promise<LocationCatalogDto> => {
    return unstable_cache(
      async () => fetchLocationCatalogFromDb({ includeInactive: false }),
      ["nondii-location-catalog-v1"],
      {
        revalidate: 3600,
        tags: [NONDII_CACHE_TAGS.locations, NONDII_CACHE_TAGS.places],
      }
    )();
  }
);

/**
 * Live uncached location catalog for Super-Admin console (includes inactive items).
 */
export async function getAdminLocationCatalog(): Promise<LocationCatalogDto> {
  return fetchLocationCatalogFromDb({ includeInactive: true });
}
