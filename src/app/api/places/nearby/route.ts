import { NextRequest, NextResponse } from "next/server";
import {
  estimateRoadDistanceAndTime,
  haversineDistanceKm,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import {
  isGooglePlacesConfigured,
  searchGoogleNearbyCategory,
} from "@/lib/geo/googlePlacesServer";
import { queryRecommendedThailandPlaces } from "@/lib/geo/thailandPlacesDb";

const VALID_GOOGLE_CATEGORIES = new Set<
  Exclude<NearbyPlaceCategory, "all" | "host">
>(["dining", "cafe", "groceries", "shopping", "essential", "attraction"]);

interface CachedNearbyEntry {
  expiresAt: number;
  radiusUsedKm: number;
  items: NearbyPlaceItem[];
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const nearbyCache = new Map<string, CachedNearbyEntry>();

const GENERIC_BARE_NAMES = new Set([
  "cafe",
  "coffee",
  "restaurant",
  "ร้านอาหาร",
  "คาเฟ่",
  "วัด",
  "น้ำตก",
  "จุดชมวิว",
  "ร้านค้า",
  "ร้านสะดวกซื้อ",
]);

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface WikiPage {
  pageid: number;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  coordinates?: Array<{ lat: number; lon: number }>;
}

interface WikiGeoResponse {
  query?: {
    pages?: Record<string, WikiPage>;
  };
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    city?: string;
    district?: string;
  };
}

function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-_.'"()]+/g, "")
    .trim();
}

function classifyOsmTags(
  tags: Record<string, string>
): {
  category: NearbyPlaceItem["category"];
  subTh: string;
  subEn: string;
} | null {
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const tourism = tags.tourism || "";
  const natural = tags.natural || "";
  const waterway = tags.waterway || "";
  const historic = tags.historic || "";
  const leisure = tags.leisure || "";
  const aeroway = tags.aeroway || "";

  if (amenity === "cafe" || shop === "coffee" || shop === "bakery") {
    return { category: "cafe", subTh: "คาเฟ่ & เบเกอรี่", subEn: "Cafe" };
  }
  if (amenity === "restaurant" || amenity === "fast_food" || amenity === "bar") {
    return { category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant" };
  }
  if (waterway === "waterfall" || natural === "waterfall") {
    return { category: "attraction", subTh: "น้ำตก", subEn: "Waterfall" };
  }
  if (tourism === "viewpoint" || natural === "peak") {
    return { category: "attraction", subTh: "จุดชมวิว", subEn: "Viewpoint" };
  }
  if (amenity === "place_of_worship" || historic) {
    return {
      category: "attraction",
      subTh: historic ? "โบราณสถาน / แลนด์มาร์ก" : "วัด / ศาสนสถาน",
      subEn: historic ? "Historic site" : "Temple",
    };
  }
  if (tourism || natural || leisure) {
    return {
      category: "attraction",
      subTh: "สถานที่ท่องเที่ยว",
      subEn: "Attraction",
    };
  }
  if (shop === "convenience" || shop === "supermarket" || shop === "greengrocer") {
    return {
      category: "groceries",
      subTh: shop === "convenience" ? "ร้านสะดวกซื้อ" : "ซุปเปอร์มาร์เก็ต / ของชำ",
      subEn: shop === "convenience" ? "Convenience store" : "Groceries",
    };
  }
  if (
    amenity === "marketplace" ||
    shop === "mall" ||
    shop === "department_store"
  ) {
    return {
      category: "shopping",
      subTh: amenity === "marketplace" ? "ตลาด" : "ศูนย์การค้า / ตลาด",
      subEn: "Market & Shopping",
    };
  }
  if (shop) {
    return {
      category: "shopping",
      subTh: "ร้านค้าท้องถิ่น",
      subEn: "Shop",
    };
  }
  if (amenity === "fuel") {
    return { category: "essential", subTh: "ปั๊มน้ำมัน", subEn: "Gas station" };
  }
  if (amenity === "hospital" || amenity === "clinic" || amenity === "pharmacy") {
    return {
      category: "essential",
      subTh: amenity === "pharmacy" ? "ร้านขายยา" : "โรงพยาบาล / คลินิก",
      subEn: "Medical",
    };
  }
  if (amenity === "atm" || amenity === "bank") {
    return { category: "essential", subTh: "ธนาคาร / ATM", subEn: "ATM & Bank" };
  }
  if (amenity === "bus_station" || aeroway === "aerodrome") {
    return {
      category: "essential",
      subTh: aeroway === "aerodrome" ? "สนามบิน" : "สถานีขนส่ง",
      subEn: aeroway === "aerodrome" ? "Airport" : "Transit",
    };
  }

  return null;
}

async function fetchOverpassFast(
  lat: number,
  lng: number,
  radiusMeters = 10000
): Promise<OverpassElement[]> {
  const query = `
[out:json][timeout:4];
(
  nwr["tourism"~"attraction|viewpoint|museum|gallery|theme_park|picnic_site"](around:${radiusMeters},${lat},${lng});
  nwr["natural"~"waterfall|peak|hot_spring|beach|cave_entrance"](around:${radiusMeters},${lat},${lng});
  nwr["waterway"="waterfall"](around:${radiusMeters},${lat},${lng});
  nwr["historic"](around:${radiusMeters},${lat},${lng});
  nwr["leisure"~"park|nature_reserve|garden"](around:${radiusMeters},${lat},${lng});
  nwr["amenity"~"cafe|restaurant|marketplace|place_of_worship|fuel|pharmacy|hospital|bus_station"](around:${radiusMeters},${lat},${lng});
  nwr["shop"~"convenience|supermarket|coffee|bakery|mall"](around:${radiusMeters},${lat},${lng});
  nwr["aeroway"="aerodrome"](around:${radiusMeters},${lat},${lng});
);
out center tags qt 100;
  `.trim();

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ];

  const encodedBody = new URLSearchParams({ data: query }).toString();

  try {
    return await Promise.any(
      endpoints.map(async (endpoint) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
          },
          body: encodedBody,
          signal: AbortSignal.timeout(4500),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OverpassResponse;
        if (!Array.isArray(json.elements)) throw new Error("Invalid payload");
        return json.elements;
      })
    );
  } catch {
    return [];
  }
}

async function fetchWikipediaNearby(
  wikiLang: "th" | "en",
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): Promise<NearbyPlaceItem[]> {
  try {
    const url = new URL(`https://${wikiLang}.wikipedia.org/w/api.php`);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "geosearch");
    url.searchParams.set("ggscoord", `${lat}|${lng}`);
    url.searchParams.set("ggsradius", "10000");
    url.searchParams.set("ggslimit", "25");
    url.searchParams.set("prop", "coordinates|pageimages|extracts");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("exchars", "160");
    url.searchParams.set("pithumbsize", "320");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as WikiGeoResponse;
    const pages = Object.values(data.query?.pages ?? {});

    const items: NearbyPlaceItem[] = [];
    for (const page of pages) {
      const title = (page.title || "").trim();
      const coord = page.coordinates?.[0];
      if (!title || !coord) continue;
      if (
        title.startsWith("จังหวัด") ||
        title.endsWith(" Province") ||
        title === "ประเทศไทย" ||
        title === "Thailand"
      ) {
        continue;
      }

      const straightKm = haversineDistanceKm(
        originLat,
        originLng,
        coord.lat,
        coord.lon
      );
      const { driveMinutes, walkMinutes } =
        estimateRoadDistanceAndTime(straightKm);
      const description = (page.extract || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);

      items.push({
        id: `wiki-${wikiLang}-${page.pageid}`,
        nameTh: title,
        nameEn: title,
        category: "attraction",
        subcategoryLabelTh: "จุดเด่นใกล้เคียง",
        subcategoryLabelEn: "Notable place",
        lat: coord.lat,
        lng: coord.lon,
        distanceKm: Number(straightKm.toFixed(2)),
        driveMinutes,
        walkMinutes,
        description: description || undefined,
        thumbnailUrl: page.thumbnail?.source || undefined,
        source: "wikipedia",
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchPhotonCategorySupplement(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): Promise<NearbyPlaceItem[]> {
  const probes: Array<{
    q: string;
    category: NearbyPlaceItem["category"];
    subTh: string;
    subEn: string;
  }> = [
    { q: "cafe", category: "cafe", subTh: "คาเฟ่ & เบเกอรี่", subEn: "Cafe" },
    { q: "กาแฟ", category: "cafe", subTh: "ร้านกาแฟ & คาเฟ่", subEn: "Coffee" },
    { q: "ร้านอาหาร", category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant" },
    { q: "7-Eleven", category: "groceries", subTh: "ร้านสะดวกซื้อ", subEn: "7-Eleven" },
    { q: "ตลาด", category: "shopping", subTh: "ตลาดท้องถิ่น", subEn: "Market" },
    { q: "น้ำตก", category: "attraction", subTh: "น้ำตก & ธรรมชาติ", subEn: "Waterfall" },
    { q: "จุดชมวิว", category: "attraction", subTh: "จุดชมวิว", subEn: "Viewpoint" },
    { q: "วัด", category: "attraction", subTh: "วัด / ศาสนสถาน", subEn: "Temple" },
    { q: "ปั๊ม", category: "essential", subTh: "ปั๊มน้ำมัน", subEn: "Gas station" },
  ];

  const settled = await Promise.allSettled(
    probes.map(async (probe) => {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", probe.q);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("limit", "15");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
        },
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { features?: PhotonFeature[] };
      const features = Array.isArray(data.features) ? data.features : [];

      const items: NearbyPlaceItem[] = [];
      for (let idx = 0; idx < features.length; idx++) {
        const feat = features[idx];
        const coords = feat.geometry?.coordinates;
        const props = feat.properties;
        const name = (props?.name || "").trim();
        if (!coords || coords.length < 2 || !name) continue;
        if (GENERIC_BARE_NAMES.has(name.toLowerCase())) continue;
        if (props?.osm_value === "hotel" || props?.osm_value === "guest_house") {
          continue;
        }

        const [pLng, pLat] = coords;
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

        const distFromQueryKm = haversineDistanceKm(lat, lng, pLat, pLng);
        // Ignore hits outside regional radius around the viewed area
        if (distFromQueryKm > 28) continue;

        const straightKm = haversineDistanceKm(originLat, originLng, pLat, pLng);
        const { driveMinutes, walkMinutes } =
          estimateRoadDistanceAndTime(straightKm);
        const desc = [props?.street, props?.district, props?.city]
          .filter(Boolean)
          .join(", ");

        items.push({
          id: `photon-near-${probe.category}-${props?.osm_id ?? idx}`,
          nameTh: name,
          nameEn: name,
          category: probe.category,
          subcategoryLabelTh: probe.subTh,
          subcategoryLabelEn: probe.subEn,
          lat: pLat,
          lng: pLng,
          distanceKm: Number(straightKm.toFixed(2)),
          driveMinutes,
          walkMinutes,
          description: desc || undefined,
          source: "osm",
        });
      }
      return items;
    })
  );

  const list: NearbyPlaceItem[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") list.push(...r.value);
  }
  return list;
}

interface NominatimPoiRow {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  type?: string;
}

async function fetchNominatimCategorySupplement(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): Promise<NearbyPlaceItem[]> {
  const tagProbes: Array<{
    q: string;
    category: NearbyPlaceItem["category"];
    subTh: string;
    subEn: string;
  }> = [
    { q: "[amenity=cafe]", category: "cafe", subTh: "คาเฟ่ & กาแฟ", subEn: "Cafe" },
    { q: "[amenity=restaurant]", category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant" },
    { q: "[shop=convenience]", category: "groceries", subTh: "ร้านสะดวกซื้อ", subEn: "Convenience store" },
    { q: "[amenity=marketplace]", category: "shopping", subTh: "ตลาด & แหล่งช้อปปิ้ง", subEn: "Market" },
    { q: "[amenity=fuel]", category: "essential", subTh: "ปั๊มน้ำมัน & เดินทาง", subEn: "Gas station" },
    { q: "[tourism=viewpoint]", category: "attraction", subTh: "จุดชมวิว", subEn: "Viewpoint" },
  ];

  const viewbox = `${(lng - 0.45).toFixed(4)},${(lat + 0.45).toFixed(4)},${(
    lng + 0.45
  ).toFixed(4)},${(lat - 0.45).toFixed(4)}`;

  const fetchBatch = async (batch: typeof tagProbes): Promise<NearbyPlaceItem[]> => {
    const settled = await Promise.allSettled(
      batch.map(async (probe) => {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("q", probe.q);
        url.searchParams.set("viewbox", viewbox);
        url.searchParams.set("bounded", "1");
        url.searchParams.set("limit", "10");
        url.searchParams.set("accept-language", "th,en");

        const res = await fetch(url.toString(), {
          headers: {
            "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (!res.ok) return [];
        const rows = (await res.json()) as NominatimPoiRow[];
        if (!Array.isArray(rows)) return [];

        const out: NearbyPlaceItem[] = [];
        for (const row of rows) {
          const pLat = Number.parseFloat(row.lat);
          const pLng = Number.parseFloat(row.lon);
          if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

          const rawTitle = (row.name || "").trim();
          // Skip unnamed nodes so street names don't masquerade as business names
          if (!rawTitle || /^\d+$/.test(rawTitle)) continue;

          const straightKm = haversineDistanceKm(
            originLat,
            originLng,
            pLat,
            pLng
          );
          const { driveMinutes, walkMinutes } =
            estimateRoadDistanceAndTime(straightKm);
          const subtitle = row.display_name
            ?.split(",")
            .slice(1, 3)
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");

          out.push({
            id: `nom-cat-${probe.category}-${row.place_id}`,
            nameTh: rawTitle,
            nameEn: rawTitle,
            category: probe.category,
            subcategoryLabelTh: probe.subTh,
            subcategoryLabelEn: probe.subEn,
            lat: pLat,
            lng: pLng,
            distanceKm: Number(straightKm.toFixed(2)),
            driveMinutes,
            walkMinutes,
            description: subtitle || undefined,
            source: "osm",
          });
        }
        return out;
      })
    );

    const collected: NearbyPlaceItem[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") collected.push(...r.value);
    }
    return collected;
  };

  // Run in two polite mini-batches so Nominatim never drops concurrent queries
  const firstHalf = await fetchBatch(tagProbes.slice(0, 3));
  const secondHalf = await fetchBatch(tagProbes.slice(3));
  return [...firstHalf, ...secondHalf];
}

export async function GET(request: NextRequest) {
  const latStr = request.nextUrl.searchParams.get("lat");
  const lngStr = request.nextUrl.searchParams.get("lng");
  const originLatStr = request.nextUrl.searchParams.get("originLat");
  const originLngStr = request.nextUrl.searchParams.get("originLng");

  const lat = Number.parseFloat(latStr ?? "");
  const lng = Number.parseFloat(lngStr ?? "");

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "Valid lat and lng query parameters are required." },
      { status: 400 }
    );
  }

  const parsedOriginLat = Number.parseFloat(originLatStr ?? "");
  const parsedOriginLng = Number.parseFloat(originLngStr ?? "");
  const originLat =
    Number.isFinite(parsedOriginLat) &&
    parsedOriginLat >= -90 &&
    parsedOriginLat <= 90
      ? parsedOriginLat
      : lat;
  const originLng =
    Number.isFinite(parsedOriginLng) &&
    parsedOriginLng >= -180 &&
    parsedOriginLng <= 180
      ? parsedOriginLng
      : lng;

  // On-demand Google Places API (New) per-category search (Airbnb strategy + Dynamic Monthly Quota Pacing!)
  const categoryParam = (
    request.nextUrl.searchParams.get("category") || ""
  ).trim() as Exclude<NearbyPlaceCategory, "all" | "host">;
  const providerParam = (
    request.nextUrl.searchParams.get("provider") || "auto"
  ).trim();
  const radiusParam = Number.parseFloat(
    request.nextUrl.searchParams.get("radius") ?? ""
  );
  const langParam =
    request.nextUrl.searchParams.get("lang") === "en" ? "en" : "th";

  if (
    providerParam !== "osm" &&
    VALID_GOOGLE_CATEGORIES.has(categoryParam) &&
    isGooglePlacesConfigured()
  ) {
    const radiusMeters =
      Number.isFinite(radiusParam) && radiusParam > 0
        ? Math.max(500, Math.min(25000, radiusParam))
        : 5000;

    const googleRes = await searchGoogleNearbyCategory({
      lat,
      lng,
      originLat,
      originLng,
      category: categoryParam,
      radiusMeters,
      language: langParam,
    });

    if (googleRes.items.length > 0 || !googleRes.quotaExceeded) {
      // If Google returned results cleanly (even 0 in an empty forest within tiny radius), return directly;
      // if quota was exceeded, fall through to free OSM + Wikipedia automatically!
      if (!googleRes.quotaExceeded) {
        return NextResponse.json({
          items: googleRes.items,
          radiusUsedKm: Math.round(radiusMeters / 1000),
          providerUsed: "google",
          fromCache: googleRes.fromCache,
        });
      }
    }
  }

  // Fast Zero-Cost DB Fallback: check our own `ThailandPlace` table in Neon Postgres (< 30ms) BEFORE external Overpass!
  const dbFallbackItems = await queryRecommendedThailandPlaces({
    lat,
    lng,
    originLat,
    originLng,
    radiusKm:
      Number.isFinite(radiusParam) && radiusParam > 0
        ? Math.max(2, Math.min(25, radiusParam / 1000))
        : 12,
    category: VALID_GOOGLE_CATEGORIES.has(categoryParam) ? categoryParam : "all",
    limit: 20,
    autoHarvestIfEmpty: true,
  }).catch(() => []);

  if (dbFallbackItems.length >= 3) {
    return NextResponse.json({
      items: dbFallbackItems,
      radiusUsedKm: 12,
      providerUsed: "osm",
      fromDb: true,
    });
  }

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}|${originLat.toFixed(
    3
  )},${originLng.toFixed(3)}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      items: cached.items,
      radiusUsedKm: cached.radiusUsedKm,
    });
  }

  const [osmResult, wikiThResult, wikiEnResult, photonResult, nominatimResult] =
    await Promise.allSettled([
      fetchOverpassFast(lat, lng, 12000),
      fetchWikipediaNearby("th", lat, lng, originLat, originLng),
      fetchWikipediaNearby("en", lat, lng, originLat, originLng),
      fetchPhotonCategorySupplement(lat, lng, originLat, originLng),
      fetchNominatimCategorySupplement(lat, lng, originLat, originLng),
    ]);

  const osmElements = osmResult.status === "fulfilled" ? osmResult.value : [];

  const osmItems: NearbyPlaceItem[] = [];
  for (const el of osmElements) {
    const tags = el.tags;
    if (!tags) continue;
    const itemLat = el.lat ?? el.center?.lat;
    const itemLng = el.lon ?? el.center?.lon;
    if (typeof itemLat !== "number" || typeof itemLng !== "number") continue;

    const classification = classifyOsmTags(tags);
    if (!classification) continue;

    const rawTh =
      tags["name:th"] ||
      tags.name ||
      tags["name:en"] ||
      (tags.shop === "convenience" && tags.brand ? tags.brand : "");
    const rawEn =
      tags["name:en"] || tags.name || tags["name:th"] || rawTh;
    const nameTh = rawTh.trim();
    const nameEn = rawEn.trim();
    if (!nameTh || GENERIC_BARE_NAMES.has(nameTh.toLowerCase())) continue;

    const straightKm = haversineDistanceKm(
      originLat,
      originLng,
      itemLat,
      itemLng
    );
    const { driveMinutes, walkMinutes } =
      estimateRoadDistanceAndTime(straightKm);

    const addressNote = [tags["addr:street"], tags["addr:subdistrict"]]
      .filter(Boolean)
      .join(" ");

    let osmThumb: string | undefined;
    if (tags.image && /^https?:\/\/\S+\.(jpe?g|png|webp)/i.test(tags.image)) {
      osmThumb = tags.image.trim();
    } else if (tags.wikimedia_commons) {
      const rawCommons = tags.wikimedia_commons.trim();
      if (rawCommons.startsWith("File:")) {
        osmThumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          rawCommons.slice(5)
        )}?width=480`;
      }
    }

    osmItems.push({
      id: `osm-${el.type}-${el.id}`,
      nameTh,
      nameEn,
      category: classification.category,
      subcategoryLabelTh: classification.subTh,
      subcategoryLabelEn: classification.subEn,
      lat: itemLat,
      lng: itemLng,
      distanceKm: Number(straightKm.toFixed(2)),
      driveMinutes,
      walkMinutes,
      description: addressNote || undefined,
      thumbnailUrl: osmThumb,
      source: "osm",
    });
  }

  const wikiItems: NearbyPlaceItem[] = [
    ...(wikiThResult.status === "fulfilled" ? wikiThResult.value : []),
    ...(wikiEnResult.status === "fulfilled" ? wikiEnResult.value : []),
  ];
  const photonItems: NearbyPlaceItem[] =
    photonResult.status === "fulfilled" ? photonResult.value : [];
  const nominatimItems: NearbyPlaceItem[] =
    nominatimResult.status === "fulfilled" ? nominatimResult.value : [];

  const merged: NearbyPlaceItem[] = [];

  for (const osmItem of [...osmItems, ...nominatimItems, ...photonItems]) {
    const normOsm = normalizePlaceName(osmItem.nameTh);
    const duplicate = merged.find(
      (existing) =>
        (normalizePlaceName(existing.nameTh) === normOsm &&
          haversineDistanceKm(
            existing.lat,
            existing.lng,
            osmItem.lat,
            osmItem.lng
          ) < 0.25) ||
        haversineDistanceKm(existing.lat, existing.lng, osmItem.lat, osmItem.lng) <
          0.03
    );
    if (!duplicate) {
      merged.push(osmItem);
    }
  }

  for (const wikiItem of wikiItems) {
    const normWiki = normalizePlaceName(wikiItem.nameTh);
    const matchedExisting = merged.find((existing) => {
      const dist = haversineDistanceKm(
        existing.lat,
        existing.lng,
        wikiItem.lat,
        wikiItem.lng
      );
      const normEx = normalizePlaceName(existing.nameTh);

      // 1. Exact/substring normalized name match
      if (
        normWiki.length > 2 &&
        ((normEx === normWiki && dist < 1.5) ||
          (dist <= 0.25 &&
            (normEx.includes(normWiki) || normWiki.includes(normEx))))
      ) {
        return true;
      }

      // 2. Same landmark returned in different scripts (e.g. Thai Wiki vs English Wiki) at nearly identical coordinates
      if (
        dist <= 0.18 &&
        (existing.source === "wikipedia" || existing.category === "attraction")
      ) {
        return true;
      }

      // 3. Shared Wikimedia thumbnail URL across bilingual Wikipedia articles
      if (
        existing.thumbnailUrl &&
        wikiItem.thumbnailUrl &&
        existing.thumbnailUrl === wikiItem.thumbnailUrl
      ) {
        return true;
      }

      // 4. Cross-script reference inside Wikipedia intro extract (e.g. "Khun Nan National Park (Thai: อุทยานแห่งชาติขุนน่าน...)")
      if (dist <= 3.0) {
        if (
          existing.nameTh.length >= 3 &&
          wikiItem.description?.includes(existing.nameTh)
        ) {
          return true;
        }
        if (
          wikiItem.nameTh.length >= 3 &&
          existing.description?.includes(wikiItem.nameTh)
        ) {
          return true;
        }
      }

      return false;
    });

    if (matchedExisting) {
      if (!matchedExisting.thumbnailUrl && wikiItem.thumbnailUrl) {
        matchedExisting.thumbnailUrl = wikiItem.thumbnailUrl;
      }
      if (!matchedExisting.description && wikiItem.description) {
        matchedExisting.description = wikiItem.description;
      }
      if (
        /[\u0E00-\u0E7F]/.test(wikiItem.nameTh) &&
        !/[\u0E00-\u0E7F]/.test(matchedExisting.nameTh)
      ) {
        matchedExisting.nameTh = wikiItem.nameTh;
      }
      if (
        !/[\u0E00-\u0E7F]/.test(wikiItem.nameEn) &&
        /[\u0E00-\u0E7F]/.test(matchedExisting.nameEn)
      ) {
        matchedExisting.nameEn = wikiItem.nameEn;
      }
    } else {
      merged.push(wikiItem);
    }
  }

  merged.sort((a, b) => {
    const aRich = a.thumbnailUrl ? 0 : 1;
    const bRich = b.thumbnailUrl ? 0 : 1;
    if (aRich !== bRich && Math.abs(a.distanceKm - b.distanceKm) < 2.5) {
      return aRich - bRich;
    }
    return a.distanceKm - b.distanceKm;
  });

  const maxDist = merged.reduce(
    (m, it) => (it.distanceKm > m && it.distanceKm <= 25 ? it.distanceKm : m),
    10
  );
  const radiusUsedKm = Math.round(maxDist);
  const finalItems = merged.slice(0, 80);

  if (nearbyCache.size > 200) {
    const firstKey = nearbyCache.keys().next().value;
    if (firstKey) nearbyCache.delete(firstKey);
  }
  nearbyCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    radiusUsedKm,
    items: finalItems,
  });

  return NextResponse.json({
    items: finalItems,
    radiusUsedKm,
  });
}
