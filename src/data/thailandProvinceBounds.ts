import {
  THAILAND_77_PROVINCES,
  type ThailandRegionId,
} from "@/data/thailandProvinces";
import { THAILAND_PROVINCE_CENTROIDS } from "@/lib/geo/thailandProvinceCentroids";

export interface RegionSeedConfig {
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
}

export interface ProvinceSeedConfig {
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
}

/**
 * Default region ordering prioritized by Thailand tourism demand.
 * Super-Admin can re-order or adjust coordinates anytime from /super-admin.
 */
export const DEFAULT_REGION_CONFIGS: readonly RegionSeedConfig[] = [
  {
    id: "north",
    labelTh: "ภาคเหนือ",
    labelEn: "North",
    sortOrder: 0,
    centerLat: 18.85,
    centerLng: 99.45,
    southLat: 17.2,
    westLng: 97.35,
    northLat: 20.46,
    eastLng: 101.35,
    defaultZoom: 7.2,
  },
  {
    id: "central",
    labelTh: "ภาคกลาง",
    labelEn: "Central",
    sortOrder: 1,
    centerLat: 14.55,
    centerLng: 100.45,
    southLat: 13.35,
    westLng: 99.05,
    northLat: 17.45,
    eastLng: 101.65,
    defaultZoom: 7.4,
  },
  {
    id: "south",
    labelTh: "ภาคใต้",
    labelEn: "South",
    sortOrder: 2,
    centerLat: 8.35,
    centerLng: 99.35,
    southLat: 5.62,
    westLng: 98.18,
    northLat: 11.0,
    eastLng: 102.1,
    defaultZoom: 6.9,
  },
  {
    id: "east",
    labelTh: "ภาคตะวันออก",
    labelEn: "East",
    sortOrder: 3,
    centerLat: 13.15,
    centerLng: 101.75,
    southLat: 11.6,
    westLng: 100.75,
    northLat: 14.4,
    eastLng: 102.92,
    defaultZoom: 7.8,
  },
  {
    id: "west",
    labelTh: "ภาคตะวันตก",
    labelEn: "West",
    sortOrder: 4,
    centerLat: 13.85,
    centerLng: 99.35,
    southLat: 10.95,
    westLng: 98.18,
    northLat: 17.7,
    eastLng: 100.18,
    defaultZoom: 7.1,
  },
  {
    id: "northeast",
    labelTh: "ภาคอีสาน",
    labelEn: "Northeast",
    sortOrder: 5,
    centerLat: 16.05,
    centerLng: 103.2,
    southLat: 14.1,
    westLng: 100.9,
    northLat: 18.45,
    eastLng: 105.64,
    defaultZoom: 7.0,
  },
] as const;

/**
 * Curated nationwide tourist-hub ranking (top provinces shown first when "ทั่วประเทศ" is selected).
 * Any province not explicitly listed follows in region/default order.
 */
const NATIONAL_TOURIST_PRIORITY_ORDER: readonly string[] = [
  "chiang-mai",
  "phuket",
  "bangkok",
  "prachuap-khiri-khan",
  "chon-buri",
  "krabi",
  "nan",
  "nakhon-ratchasima",
  "surat-thani",
  "chiang-rai",
  "kanchanaburi",
  "phang-nga",
  "phetchaburi",
  "rayong",
  "trat",
  "phetchabun",
  "mae-hong-son",
  "loei",
  "satun",
  "phra-nakhon-si-ayutthaya",
  "nakhon-nayok",
  "ratchaburi",
  "chanthaburi",
  "samut-songkhram",
  "songkhla",
  "trang",
  "nakhon-si-thammarat",
  "chumphon",
  "ranong",
  "khon-kaen",
  "udon-thani",
  "ubon-ratchathani",
  "sukhothai",
  "lampang",
  "phrae",
  "phayao",
  "saraburi",
  "tak",
  "nong-khai",
  "nakhon-phanom",
  "buri-ram",
  "yala",
  "phatthalung",
];

/**
 * Custom bounding-box half-spans (degrees lat/lng) and ideal default zoom for
 * provinces whose shape/size differs meaningfully from a medium province (~0.42 deg).
 * Format: [latHalfSpan, lngHalfSpan, defaultZoom]
 */
const PROVINCE_SPAN_OVERRIDES: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  // Compact / Island / Metro provinces
  bangkok: [0.18, 0.24, 11.1],
  nonthaburi: [0.14, 0.16, 11.4],
  "pathum-thani": [0.18, 0.22, 10.9],
  "samut-prakan": [0.15, 0.2, 11.2],
  "samut-sakhon": [0.15, 0.2, 11.2],
  "samut-songkhram": [0.14, 0.16, 11.5],
  "sing-buri": [0.18, 0.18, 10.8],
  "ang-thong": [0.18, 0.18, 10.8],
  phuket: [0.24, 0.18, 10.8],
  "nakhon-nayok": [0.24, 0.26, 10.4],
  "nakhon-pathom": [0.22, 0.24, 10.6],
  "phra-nakhon-si-ayutthaya": [0.25, 0.28, 10.3],
  lamphun: [0.35, 0.28, 9.7],

  // Large / Elongated / Island-archipelago provinces
  "chiang-mai": [1.05, 0.68, 8.5],
  "chiang-rai": [0.68, 0.65, 9.0],
  "mae-hong-son": [1.0, 0.55, 8.6],
  nan: [0.85, 0.52, 8.8],
  lampang: [0.78, 0.48, 8.9],
  tak: [1.15, 0.62, 8.4],
  kanchanaburi: [0.95, 0.78, 8.6],
  "prachuap-khiri-khan": [0.95, 0.45, 8.8],
  phetchaburi: [0.48, 0.48, 9.4],
  "chon-buri": [0.46, 0.42, 9.7],
  rayong: [0.32, 0.45, 9.8],
  trat: [0.48, 0.42, 9.6],
  "nakhon-ratchasima": [0.88, 0.92, 8.6],
  "ubon-ratchathani": [0.78, 0.72, 8.8],
  "khon-kaen": [0.62, 0.68, 9.0],
  "udon-thani": [0.62, 0.68, 9.0],
  "surat-thani": [0.78, 0.85, 8.9],
  krabi: [0.52, 0.46, 9.5],
  "phang-nga": [0.58, 0.42, 9.4],
  "nakhon-si-thammarat": [0.68, 0.52, 9.1],
  songkhla: [0.62, 0.48, 9.3],
  satun: [0.38, 0.48, 9.8],
  phetchabun: [0.88, 0.45, 8.9],
  loei: [0.62, 0.55, 9.1],
};

function shortThaiProvinceName(full: string): string {
  const base = full.split("(")[0].trim();
  if (base === "กรุงเทพมหานคร") return "กรุงเทพฯ";
  if (base === "พระนครศรีอยุธยา") return "อยุธยา";
  return base;
}

function shortEnglishProvinceName(full: string): string {
  return full.split("/")[0].trim();
}

export const DEFAULT_PROVINCE_CONFIGS: readonly ProvinceSeedConfig[] = (() => {
  const nationalRankMap = new Map<string, number>(
    NATIONAL_TOURIST_PRIORITY_ORDER.map((id, idx) => [id, idx])
  );
  const regionCounters = new Map<ThailandRegionId, number>();

  return THAILAND_77_PROVINCES.map((prov, index) => {
    const centroid = THAILAND_PROVINCE_CENTROIDS[prov.id] ?? {
      lat: 13.7563,
      lng: 100.5018,
    };
    const [latHalf, lngHalf, defaultZoom] = PROVINCE_SPAN_OVERRIDES[
      prov.id
    ] ?? [0.42, 0.42, 9.5];

    const regionSortOrder = regionCounters.get(prov.region) ?? 0;
    regionCounters.set(prov.region, regionSortOrder + 1);

    const nationalSortOrder =
      nationalRankMap.get(prov.id) ??
      NATIONAL_TOURIST_PRIORITY_ORDER.length + index;

    return {
      id: prov.id,
      regionId: prov.region,
      nameTh: prov.nameTh,
      nameEn: prov.nameEn,
      shortNameTh: shortThaiProvinceName(prov.nameTh),
      shortNameEn: shortEnglishProvinceName(prov.nameEn),
      isTouristHub: Boolean(prov.isPopular),
      regionSortOrder,
      nationalSortOrder,
      centerLat: centroid.lat,
      centerLng: centroid.lng,
      southLat: Number((centroid.lat - latHalf).toFixed(4)),
      westLng: Number((centroid.lng - lngHalf).toFixed(4)),
      northLat: Number((centroid.lat + latHalf).toFixed(4)),
      eastLng: Number((centroid.lng + lngHalf).toFixed(4)),
      defaultZoom,
    };
  });
})();
