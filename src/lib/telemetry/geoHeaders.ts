import {
  getProvinceById,
  THAILAND_77_PROVINCES,
  type ThailandRegionId,
} from "@/data/thailandProvinces";

/**
 * ISO 3166-2:TH numeric region codes emitted by Vercel (`x-vercel-ip-country-region`)
 * mapped to canonical Cangaroom `provinceId` slugs.
 * Strictly coarse province-level only — raw IP addresses are NEVER read or stored (PDPA).
 */
const ISO_TH_REGION_TO_PROVINCE: Readonly<Record<string, string>> = {
  "10": "bangkok",
  "11": "samut-prakan",
  "12": "nonthaburi",
  "13": "pathum-thani",
  "14": "phra-nakhon-si-ayutthaya",
  "19": "saraburi",
  "20": "chon-buri",
  "21": "rayong",
  "22": "chanthaburi",
  "23": "trat",
  "24": "chachoengsao",
  "26": "nakhon-nayok",
  "30": "nakhon-ratchasima",
  "34": "ubon-ratchathani",
  "40": "khon-kaen",
  "41": "udon-thani",
  "42": "loei",
  "50": "chiang-mai",
  "51": "lamphun",
  "52": "lampang",
  "54": "phrae",
  "55": "nan",
  "56": "phayao",
  "57": "chiang-rai",
  "58": "mae-hong-son",
  "63": "tak",
  "65": "phitsanulok",
  "67": "phetchabun",
  "70": "ratchaburi",
  "71": "kanchanaburi",
  "73": "nakhon-pathom",
  "75": "samut-songkhram",
  "76": "phetchaburi",
  "77": "prachuap-khiri-khan",
  "80": "nakhon-si-thammarat",
  "81": "krabi",
  "82": "phang-nga",
  "83": "phuket",
  "84": "surat-thani",
  "86": "chumphon",
  "90": "songkhla",
  "91": "satun",
  "92": "trang",
};

const METRO_BKK_PROVINCES = new Set([
  "bangkok",
  "nonthaburi",
  "pathum-thani",
  "samut-prakan",
  "samut-sakhon",
  "nakhon-pathom",
]);

const BKK_WEEKEND_DRIVE_PROVINCES = new Set([
  "chon-buri",
  "rayong",
  "prachuap-khiri-khan",
  "phetchaburi",
  "nakhon-ratchasima",
  "kanchanaburi",
  "ratchaburi",
  "saraburi",
  "nakhon-nayok",
  "phra-nakhon-si-ayutthaya",
]);

export interface CoarseRequestContext {
  provinceId: string | null;
  region: ThailandRegionId | null;
  deviceType: "mobile" | "tablet" | "desktop";
  osFamily: "ios" | "android" | "macos" | "windows" | "other";
}

function safeDecodeHeader(val: string | null): string {
  if (!val) return "";
  try {
    return decodeURIComponent(val).trim().toLowerCase();
  } catch {
    return val.trim().toLowerCase();
  }
}

export function inferCoarseContextFromHeaders(
  headers: Headers
): CoarseRequestContext {
  const country = (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    ""
  )
    .trim()
    .toUpperCase();

  const regionCode = (headers.get("x-vercel-ip-country-region") || "").trim();
  const cityRaw = safeDecodeHeader(
    headers.get("x-vercel-ip-city") || headers.get("cf-ipcity")
  );

  let matchedProvinceId: string | null = null;

  if (!country || country === "TH") {
    if (regionCode && ISO_TH_REGION_TO_PROVINCE[regionCode]) {
      matchedProvinceId = ISO_TH_REGION_TO_PROVINCE[regionCode];
    } else if (cityRaw) {
      const normalizedCity = cityRaw.replace(/[\s_-]+/g, "");
      for (const prov of THAILAND_77_PROVINCES) {
        const slugNorm = prov.id.replace(/-/g, "");
        const enNorm = prov.nameEn.toLowerCase().replace(/[\s/()-]+/g, "");
        if (
          normalizedCity.includes(slugNorm) ||
          enNorm.includes(normalizedCity) ||
          prov.nameTh.includes(cityRaw)
        ) {
          matchedProvinceId = prov.id;
          break;
        }
      }
    }
  }

  const provObj = getProvinceById(matchedProvinceId);
  const ua = (headers.get("user-agent") || "").toLowerCase();

  let osFamily: CoarseRequestContext["osFamily"] = "other";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    osFamily = "ios";
  } else if (ua.includes("android")) {
    osFamily = "android";
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    osFamily = "macos";
  } else if (ua.includes("windows")) {
    osFamily = "windows";
  }

  let deviceType: CoarseRequestContext["deviceType"] = "desktop";
  if (
    ua.includes("ipad") ||
    ua.includes("tablet") ||
    (ua.includes("android") && !ua.includes("mobile"))
  ) {
    deviceType = "tablet";
  } else if (
    ua.includes("mobi") ||
    ua.includes("iphone") ||
    ua.includes("android")
  ) {
    deviceType = "mobile";
  }

  return {
    provinceId: provObj ? provObj.id : null,
    region: provObj ? provObj.region : null,
    deviceType,
    osFamily,
  };
}

/**
 * Returns weekend-drive destination provinces relevant to a viewer's coarse origin province.
 */
export function isEasyWeekendDriveFromOrigin(
  originProvinceId: string | null,
  targetProvinceId: string
): boolean {
  if (!originProvinceId) return false;
  if (originProvinceId === targetProvinceId) return true;
  if (METRO_BKK_PROVINCES.has(originProvinceId)) {
    return BKK_WEEKEND_DRIVE_PROVINCES.has(targetProvinceId);
  }
  const originProv = getProvinceById(originProvinceId);
  const targetProv = getProvinceById(targetProvinceId);
  return Boolean(
    originProv && targetProv && originProv.region === targetProv.region
  );
}

