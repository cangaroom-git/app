import { NextRequest, NextResponse } from "next/server";
import { haversineDistanceKm } from "@/lib/geo/nearbyPlacesTypes";

interface CachedPhotoResult {
  expiresAt: number;
  thumbnailUrl: string | null;
  extract: string | null;
}

const PHOTO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const photoCache = new Map<string, CachedPhotoResult>();

interface WikiSearchPage {
  pageid: number;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  coordinates?: Array<{ lat: number; lon: number }>;
}

interface WikiSearchResponse {
  query?: {
    pages?: Record<string, WikiSearchPage>;
  };
}

interface CommonsImagePage {
  pageid: number;
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    mime?: string;
  }>;
}

interface CommonsSearchResponse {
  query?: {
    pages?: Record<string, CommonsImagePage>;
  };
}

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s\-_.'"()@]+/g, "")
    .trim();
}

function buildSearchCandidates(rawName: string): string[] {
  const cleaned = rawName.replace(/[@()]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = [cleaned];
  const fixedSpelling = cleaned
    .replace(/สินเทาว์/g, "สินเธาว์")
    .replace(/โบราณ$/g, "")
    .trim();
  if (fixedSpelling && fixedSpelling !== cleaned && fixedSpelling.length >= 3) {
    candidates.push(fixedSpelling);
  }
  const corePlace = fixedSpelling.replace(/สินเธาว์/g, "").trim();
  if (
    corePlace &&
    !candidates.includes(corePlace) &&
    corePlace.length >= 3
  ) {
    candidates.push(corePlace);
  }
  return candidates;
}

async function queryWikipediaOnce(
  wikiLang: "th" | "en",
  queryText: string,
  lat: number,
  lng: number
): Promise<{ thumbnailUrl: string; extract?: string } | null> {
  if (queryText.length < 2) return null;

  const url = new URL(`https://${wikiLang}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", queryText);
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "pageimages|coordinates|extracts");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exchars", "150");
  url.searchParams.set("pithumbsize", "560");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "CangaroomDirectStay/1.0 (+https://cangaroom.com)",
    },
    signal: AbortSignal.timeout(3200),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as WikiSearchResponse;
  const pages = Object.values(data.query?.pages ?? {});
  const normTarget = normalizeName(queryText);

  for (const page of pages) {
    const thumb = page.thumbnail?.source;
    const title = (page.title || "").trim();
    if (!thumb || !title) continue;
    if (/\.svg(\?|$)/i.test(thumb) || /map|locator|flag|seal/i.test(thumb)) {
      continue;
    }

    const coord = page.coordinates?.[0];
    if (coord) {
      const distKm = haversineDistanceKm(lat, lng, coord.lat, coord.lon);
      if (distKm <= 20) {
        return {
          thumbnailUrl: thumb,
          extract: page.extract?.replace(/\s+/g, " ").trim().slice(0, 140),
        };
      }
      // Has coordinates in a completely different region -> skip
      continue;
    }

    // No coordinates on article: require direct normalized title overlap so unrelated articles never leak
    const normTitle = normalizeName(title);
    if (
      normTitle.length >= 4 &&
      normTarget.length >= 4 &&
      (normTitle === normTarget ||
        normTarget.includes(normTitle) ||
        normTitle.includes(normTarget))
    ) {
      return {
        thumbnailUrl: thumb,
        extract: page.extract?.replace(/\s+/g, " ").trim().slice(0, 140),
      };
    }
  }

  return null;
}

async function searchWikipediaPhoto(
  wikiLang: "th" | "en",
  rawName: string,
  lat: number,
  lng: number
): Promise<{ thumbnailUrl: string; extract?: string } | null> {
  try {
    const candidates = buildSearchCandidates(rawName);
    for (const q of candidates) {
      const hit = await queryWikipediaOnce(wikiLang, q, lat, lng);
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

async function searchCommonsNamedPhoto(rawName: string): Promise<string | null> {
  try {
    const clean = rawName.replace(/[@()]/g, " ").trim();
    // Skip generic short names or English cafe/shop names without distinct landmark tokens
    if (clean.length < 5 || /caf[eé]|coffee|shop|store|7-eleven|resort|hotel/i.test(clean)) {
      return null;
    }

    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `"${clean}" filetype:bitmap`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "4");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("iiurlwidth", "560");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "CangaroomDirectStay/1.0 (+https://cangaroom.com)",
      },
      signal: AbortSignal.timeout(3200),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as CommonsSearchResponse;
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const mime = info?.mime || "";
      const thumb = info?.thumburl || info?.url;
      if (!thumb) continue;
      if (!mime.startsWith("image/") || mime.includes("svg")) continue;
      if (/icon|logo|map|sign|chart/i.test(page.title || "")) continue;
      return thumb;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get("name") || "").trim();
  const lat = Number.parseFloat(request.nextUrl.searchParams.get("lat") || "");
  const lng = Number.parseFloat(request.nextUrl.searchParams.get("lng") || "");

  if (
    !name ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ thumbnailUrl: null, extract: null });
  }

  const cacheKey = `v2|${normalizeName(name)}|${lat.toFixed(4)},${lng.toFixed(
    4
  )}`;
  const cached = photoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      thumbnailUrl: cached.thumbnailUrl,
      extract: cached.extract,
    });
  }

  const [thWiki, enWiki, commonsNamed] = await Promise.all([
    searchWikipediaPhoto("th", name, lat, lng),
    searchWikipediaPhoto("en", name, lat, lng),
    searchCommonsNamedPhoto(name),
  ]);

  const bestWiki = thWiki || enWiki;
  const thumbnailUrl = bestWiki?.thumbnailUrl || commonsNamed || null;
  const extract = bestWiki?.extract || null;

  if (photoCache.size > 400) {
    const oldest = photoCache.keys().next().value;
    if (oldest) photoCache.delete(oldest);
  }
  photoCache.set(cacheKey, {
    expiresAt: Date.now() + PHOTO_CACHE_TTL_MS,
    thumbnailUrl,
    extract,
  });

  return NextResponse.json({ thumbnailUrl, extract });
}
