import { NextRequest, NextResponse } from "next/server";
import {
  estimateRoadDistanceAndTime,
  haversineDistanceKm,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import {
  isGooglePlacesConfigured,
  searchGoogleAutocomplete,
  searchGoogleText,
} from "@/lib/geo/googlePlacesServer";

interface CachedSearchEntry {
  expiresAt: number;
  items: NearbyPlaceItem[];
}

const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const searchCache = new Map<string, CachedSearchEntry>();

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
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
    state?: string;
  };
}

function mapCategoryFromType(
  key = "",
  val = ""
): {
  category: NearbyPlaceItem["category"];
  subTh: string;
  subEn: string;
} {
  if ((key === "amenity" && val === "cafe") || val === "coffee" || val === "bakery") {
    return {
      category: "cafe",
      subTh: "คาเฟ่",
      subEn: "Cafe",
    };
  }
  if (key === "amenity" && ["restaurant", "fast_food", "bar"].includes(val)) {
    return {
      category: "dining",
      subTh: "ร้านอาหาร",
      subEn: "Restaurant",
    };
  }
  if (val === "convenience" || val === "supermarket" || val === "greengrocer") {
    return {
      category: "groceries",
      subTh: "ร้านสะดวกซื้อ / ของชำ",
      subEn: "Groceries",
    };
  }
  if (key === "shop" || val === "marketplace") {
    return {
      category: "shopping",
      subTh: "ร้านค้า / ตลาด",
      subEn: "Shop & Market",
    };
  }
  if (key === "tourism" || key === "natural" || key === "historic" || val === "waterfall") {
    return {
      category: "attraction",
      subTh: "สถานที่ / จุดท่องเที่ยว",
      subEn: "Landmark",
    };
  }
  if (
    key === "aeroway" ||
    ["fuel", "hospital", "clinic", "pharmacy", "bus_station", "atm", "bank"].includes(val)
  ) {
    return {
      category: "essential",
      subTh: val === "aerodrome" ? "สนามบิน" : "บริการ / เดินทาง",
      subEn: "Transit & Essential",
    };
  }
  return {
    category: "attraction",
    subTh: "สถานที่ค้นหา",
    subEn: "Place",
  };
}

async function fetchNominatimSearch(
  query: string,
  lat: number,
  lng: number,
  bounded: boolean
): Promise<NearbyPlaceItem[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("accept-language", "th,en");
    url.searchParams.set("countrycodes", "th");
    if (bounded) {
      url.searchParams.set(
        "viewbox",
        `${lng - 0.45},${lat + 0.45},${lng + 0.45},${lat - 0.45}`
      );
      url.searchParams.set("bounded", "1");
    }

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const list = (await res.json()) as NominatimItem[];
    if (!Array.isArray(list)) return [];

    const results: NearbyPlaceItem[] = [];
    for (const item of list) {
      const pLat = Number.parseFloat(item.lat);
      const pLng = Number.parseFloat(item.lon);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;
      const isTagQuery = query.startsWith("[");
      const title = (
        isTagQuery
          ? item.name || ""
          : item.name || item.display_name?.split(",")[0] || ""
      ).trim();
      if (!title || /^\d+$/.test(title)) continue;

      const straightKm = haversineDistanceKm(lat, lng, pLat, pLng);
      const { driveMinutes, walkMinutes } =
        estimateRoadDistanceAndTime(straightKm);
      const mapped = mapCategoryFromType(item.category, item.type);

      results.push({
        id: `nom-${item.place_id}`,
        nameTh: title,
        nameEn: title,
        category: mapped.category,
        subcategoryLabelTh: mapped.subTh,
        subcategoryLabelEn: mapped.subEn,
        lat: pLat,
        lng: pLng,
        distanceKm: Number(straightKm.toFixed(2)),
        driveMinutes,
        walkMinutes,
        description: item.display_name
          ?.split(",")
          .slice(1, 4)
          .join(",")
          .trim(),
        source: "search",
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchPhotonSearch(
  query: string,
  lat: number,
  lng: number
): Promise<NearbyPlaceItem[]> {
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const features = Array.isArray(data.features) ? data.features : [];

    const results: NearbyPlaceItem[] = [];
    for (let idx = 0; idx < features.length; idx++) {
      const feat = features[idx];
      const coords = feat.geometry?.coordinates;
      const props = feat.properties;
      if (!coords || coords.length < 2 || !props?.name) continue;
      const [pLng, pLat] = coords;
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

      const straightKm = haversineDistanceKm(lat, lng, pLat, pLng);
      const { driveMinutes, walkMinutes } =
        estimateRoadDistanceAndTime(straightKm);
      const mapped = mapCategoryFromType(props.osm_key, props.osm_value);
      const subtitle = [props.street, props.city, props.state]
        .filter(Boolean)
        .join(", ");

      results.push({
        id: `photon-${props.osm_id ?? idx}`,
        nameTh: props.name,
        nameEn: props.name,
        category: mapped.category,
        subcategoryLabelTh: mapped.subTh,
        subcategoryLabelEn: mapped.subEn,
        lat: pLat,
        lng: pLng,
        distanceKm: Number(straightKm.toFixed(2)),
        driveMinutes,
        walkMinutes,
        description: subtitle || undefined,
        source: "search",
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const latStr = request.nextUrl.searchParams.get("lat");
  const lngStr = request.nextUrl.searchParams.get("lng");
  const originLatStr = request.nextUrl.searchParams.get("originLat");
  const originLngStr = request.nextUrl.searchParams.get("originLng");

  const lat = Number.parseFloat(latStr ?? "");
  const lng = Number.parseFloat(lngStr ?? "");

  if (
    !q ||
    q.length > 100 ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "Valid q, lat and lng query parameters are required." },
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

  const mode = (request.nextUrl.searchParams.get("mode") || "text").trim();
  const providerParam = (
    request.nextUrl.searchParams.get("provider") || "auto"
  ).trim();
  const sessionToken =
    (request.nextUrl.searchParams.get("sessionToken") || "").trim() ||
    undefined;
  const langParam =
    request.nextUrl.searchParams.get("lang") === "en" ? "en" : "th";
  const radiusParam = Number.parseFloat(
    request.nextUrl.searchParams.get("radius") ?? ""
  );

  // Mode 1: Fast Thailand-biased Autocomplete (New) — 10,000 free calls/month
  if (mode === "autocomplete") {
    if (providerParam !== "osm" && isGooglePlacesConfigured()) {
      const ac = await searchGoogleAutocomplete({
        input: q,
        lat,
        lng,
        sessionToken,
        language: langParam,
      });
      if (!ac.quotaExceeded) {
        return NextResponse.json({
          suggestions: ac.suggestions,
          providerUsed: "google",
        });
      }
    }
    return NextResponse.json({ suggestions: [], providerUsed: "osm" });
  }

  // Mode 2: Google Places Text Search (New) — 5,000 free calls/month (falls back to OSM when quota hit)
  if (providerParam !== "osm" && isGooglePlacesConfigured()) {
    const gText = await searchGoogleText({
      query: q,
      lat,
      lng,
      originLat,
      originLng,
      radiusMeters:
        Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : 15000,
      language: langParam,
    });
    if (!gText.quotaExceeded) {
      return NextResponse.json({
        items: gText.items,
        providerUsed: "google",
      });
    }
  }

  const cacheKey = `${q.toLowerCase()}|${lat.toFixed(2)},${lng.toFixed(
    2
  )}|${originLat.toFixed(2)},${originLng.toFixed(2)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ items: cached.items });
  }

  const [boundedNom, photon] = await Promise.allSettled([
    fetchNominatimSearch(q, lat, lng, true),
    fetchPhotonSearch(q, lat, lng),
  ]);

  const combined: NearbyPlaceItem[] = [
    ...(boundedNom.status === "fulfilled" ? boundedNom.value : []),
    ...(photon.status === "fulfilled" ? photon.value : []),
  ];

  // Fallback across Thailand for major regional landmarks (e.g. airports 40-80km away)
  if (combined.length < 3) {
    const nationalNom = await fetchNominatimSearch(q, lat, lng, false);
    combined.push(...nationalNom);
  }

  const deduped: NearbyPlaceItem[] = [];
  for (const item of combined) {
    const dup = deduped.find(
      (ex) => haversineDistanceKm(ex.lat, ex.lng, item.lat, item.lng) < 0.15
    );
    if (!dup) {
      const distFromOrigin = haversineDistanceKm(
        originLat,
        originLng,
        item.lat,
        item.lng
      );
      const { driveMinutes, walkMinutes } =
        estimateRoadDistanceAndTime(distFromOrigin);
      deduped.push({
        ...item,
        distanceKm: Number(distFromOrigin.toFixed(2)),
        driveMinutes,
        walkMinutes,
      });
    }
  }

  deduped.sort((a, b) => {
    const aNear = a.distanceKm <= 80 ? 0 : 1;
    const bNear = b.distanceKm <= 80 ? 0 : 1;
    if (aNear !== bNear) return aNear - bNear;
    return a.distanceKm - b.distanceKm;
  });

  const finalItems = deduped.slice(0, 15);
  if (searchCache.size > 200) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    items: finalItems,
  });

  return NextResponse.json({ items: finalItems });
}

