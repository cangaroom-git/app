import {
  estimateRoadDistanceAndTime,
  haversineDistanceKm,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";
import { consumeGoogleQuota } from "@/lib/geo/googlePlacesQuota";

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";

/**
 * Strictly Pro-tier FieldMask (matches Airbnb's exact cost-control strategy):
 * - Includes: id, displayName, primaryType, primaryTypeDisplayName, types, location, shortFormattedAddress, photos
 * - Excludes: rating, userRatingCount, regularOpeningHours, currentOpeningHours, nationalPhoneNumber, websiteUri (Enterprise SKU!)
 */
const PRO_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.location",
  "places.shortFormattedAddress",
  "places.photos",
].join(",");

/**
 * Validated Table A place types for Google Places API (New), tuned for Thailand travellers.
 */
const CATEGORY_GOOGLE_TYPES: Record<
  Exclude<NearbyPlaceCategory, "all" | "host">,
  {
    includedTypes: string[];
    rankPreference: "POPULARITY" | "DISTANCE";
    fallbackSubTh: string;
    fallbackSubEn: string;
  }
> = {
  dining: {
    includedTypes: [
      "restaurant",
      "thai_restaurant",
      "seafood_restaurant",
      "japanese_restaurant",
      "ramen_restaurant",
      "barbecue_restaurant",
      "fast_food_restaurant",
    ],
    rankPreference: "POPULARITY",
    fallbackSubTh: "ร้านอาหาร",
    fallbackSubEn: "Restaurant",
  },
  cafe: {
    includedTypes: ["cafe", "coffee_shop", "bakery", "dessert_shop"],
    rankPreference: "POPULARITY",
    fallbackSubTh: "คาเฟ่ & กาแฟ",
    fallbackSubEn: "Cafe",
  },
  groceries: {
    includedTypes: ["convenience_store", "supermarket", "grocery_store"],
    rankPreference: "DISTANCE",
    fallbackSubTh: "ร้านสะดวกซื้อ & ของชำ",
    fallbackSubEn: "Groceries",
  },
  shopping: {
    includedTypes: ["shopping_mall", "market", "department_store", "gift_shop"],
    rankPreference: "POPULARITY",
    fallbackSubTh: "ช้อปปิ้ง & ตลาด",
    fallbackSubEn: "Shopping & market",
  },
  essential: {
    includedTypes: [
      "gas_station",
      "electric_vehicle_charging_station",
      "train_station",
      "subway_station",
      "transit_station",
      "bus_station",
      "airport",
      "hospital",
      "pharmacy",
      "atm",
    ],
    rankPreference: "DISTANCE",
    fallbackSubTh: "การเดินทาง & ปั๊มน้ำมัน",
    fallbackSubEn: "Transit & fuel",
  },
  attraction: {
    includedTypes: [
      "tourist_attraction",
      "national_park",
      "park",
      "cultural_landmark",
      "historical_landmark",
      "museum",
      "hiking_area",
      "hindu_temple",
      "place_of_worship",
    ],
    rankPreference: "POPULARITY",
    fallbackSubTh: "ที่เที่ยว & จุดชมวิว",
    fallbackSubEn: "Attraction",
  },
};

const EXCLUDED_LODGING_TYPES = [
  "hotel",
  "resort_hotel",
  "motel",
  "hostel",
  "lodging",
  "bed_and_breakfast",
  "guest_house",
  "campground",
  "camping_cabin",
  "cottage",
  "extended_stay_hotel",
  "farmstay",
  "inn",
  "private_guest_room",
  "rv_park",
];

const LODGING_TYPE_SET = new Set<string>([
  ...EXCLUDED_LODGING_TYPES,
  "japanese_inn",
  "budget_japanese_inn",
  "mobile_home_park",
]);

const SINGLE_PLACE_PRO_FIELD_MASK = [
  "id",
  "displayName",
  "primaryType",
  "primaryTypeDisplayName",
  "types",
  "location",
  "shortFormattedAddress",
  "photos",
].join(",");

interface GooglePlaceRaw {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string; languageCode?: string };
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
  }>;
}

export interface GoogleAutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types: string[];
  category: Exclude<NearbyPlaceCategory, "all">;
}

// Short-lived in-memory runtime cache (15 min) keyed by ~2.2km Spatial Grid cell (ToS-compliant, zero permanent DB warehousing)
const RUNTIME_CACHE_TTL_MS = 15 * 60 * 1000;
const googleNearbyRuntimeCache = new Map<
  string,
  { expiresAt: number; rawPlaces: GooglePlaceRaw[] }
>();

const googleDetailRuntimeCache = new Map<
  string,
  { expiresAt: number; rawPlace: GooglePlaceRaw | null; blocked: boolean }
>();

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

/**
 * Google Places API (New) photo resource names (`places/<id>/photos/<token>`) frequently exceed 450+ chars!
 */
export function isValidGooglePhotoName(name: string): boolean {
  return /^places\/[A-Za-z0-9_-]{8,220}\/photos\/[A-Za-z0-9_.-]{8,1400}$/.test(
    name
  );
}

/**
 * Returns true if a Google Place is a competing hotel/resort/homestay/campground
 * so we NEVER distract guests away from booking the current property.
 */
export function isCompetitorLodgingPlace(raw: GooglePlaceRaw): boolean {
  const primary = (raw.primaryType || "").toLowerCase();
  if (primary && LODGING_TYPE_SET.has(primary)) return true;
  if (Array.isArray(raw.types)) {
    for (const t of raw.types) {
      if (LODGING_TYPE_SET.has(t.toLowerCase())) return true;
    }
  }
  return false;
}

export function inferCategoryFromGoogleTypes(
  primaryType = "",
  types: string[] = []
): {
  category: Exclude<NearbyPlaceCategory, "all">;
  subTh: string;
  subEn: string;
} {
  const all = [primaryType, ...types].map((t) => t.toLowerCase());
  const has = (list: string[]) => all.some((t) => list.includes(t));

  if (has(["cafe", "coffee_shop", "bakery", "dessert_shop", "tea_house"])) {
    return { category: "cafe", subTh: "คาเฟ่ & เบเกอรี่", subEn: "Cafe" };
  }
  if (
    has([
      "restaurant",
      "thai_restaurant",
      "seafood_restaurant",
      "japanese_restaurant",
      "ramen_restaurant",
      "barbecue_restaurant",
      "fast_food_restaurant",
      "bar",
      "meal_takeaway",
    ]) ||
    primaryType.endsWith("_restaurant")
  ) {
    return { category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant" };
  }
  if (has(["convenience_store", "supermarket", "grocery_store"])) {
    return {
      category: "groceries",
      subTh: primaryType === "convenience_store" ? "ร้านสะดวกซื้อ" : "ซุปเปอร์มาร์เก็ต",
      subEn: primaryType === "convenience_store" ? "Convenience store" : "Groceries",
    };
  }
  if (
    has([
      "shopping_mall",
      "market",
      "department_store",
      "gift_shop",
      "clothing_store",
      "store",
    ])
  ) {
    return {
      category: "shopping",
      subTh: primaryType === "market" ? "ตลาด" : "ช้อปปิ้ง & ตลาด",
      subEn: "Shopping",
    };
  }
  if (
    has([
      "gas_station",
      "electric_vehicle_charging_station",
      "train_station",
      "subway_station",
      "transit_station",
      "bus_station",
      "airport",
      "hospital",
      "pharmacy",
      "atm",
      "bank",
    ])
  ) {
    const isEv = has(["electric_vehicle_charging_station"]);
    const isFuel = has(["gas_station"]);
    const isMed = has(["hospital", "pharmacy"]);
    return {
      category: "essential",
      subTh: isEv
        ? "จุดชาร์จรถไฟฟ้า EV"
        : isFuel
        ? "ปั๊มน้ำมัน"
        : isMed
        ? "โรงพยาบาล & ร้านยา"
        : "ขนส่ง & เดินทาง",
      subEn: isEv
        ? "EV charging"
        : isFuel
        ? "Gas station"
        : isMed
        ? "Medical"
        : "Transit",
    };
  }
  return {
    category: "attraction",
    subTh: "ที่เที่ยว & จุดชมวิว",
    subEn: "Attraction",
  };
}

function mapRawGooglePlacesToItems(
  rawPlaces: GooglePlaceRaw[],
  originLat: number,
  originLng: number,
  forcedCategory?: Exclude<NearbyPlaceCategory, "all" | "host">
): NearbyPlaceItem[] {
  const items: NearbyPlaceItem[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawPlaces) {
    if (isCompetitorLodgingPlace(raw)) continue;
    const placeId = (raw.id || "").trim();
    const name = (raw.displayName?.text || "").trim();
    const pLat = raw.location?.latitude;
    const pLng = raw.location?.longitude;
    if (!placeId || !name || typeof pLat !== "number" || typeof pLng !== "number") {
      continue;
    }
    if (seenIds.has(placeId)) continue;
    seenIds.add(placeId);

    const inferred = inferCategoryFromGoogleTypes(
      raw.primaryType || "",
      raw.types || []
    );
    const category = forcedCategory ?? inferred.category;
    const displayType = (raw.primaryTypeDisplayName?.text || "").trim();
    const forcedMeta = forcedCategory
      ? CATEGORY_GOOGLE_TYPES[forcedCategory]
      : null;

    const straightKm = haversineDistanceKm(originLat, originLng, pLat, pLng);
    const { driveMinutes, walkMinutes } =
      estimateRoadDistanceAndTime(straightKm);

    // Collect up to 4 validated Google photo reference names (fetched lazily via /api/places/photo proxy!)
    const photoNames = (raw.photos || [])
      .map((p) => (p.name || "").trim())
      .filter((n) => isValidGooglePhotoName(n))
      .slice(0, 4);

    items.push({
      id: `gplace-${placeId}`,
      googlePlaceId: placeId,
      nameTh: name,
      nameEn: name,
      category,
      subcategoryLabelTh:
        displayType || forcedMeta?.fallbackSubTh || inferred.subTh,
      subcategoryLabelEn:
        displayType || forcedMeta?.fallbackSubEn || inferred.subEn,
      lat: pLat,
      lng: pLng,
      distanceKm: Number(straightKm.toFixed(2)),
      driveMinutes,
      walkMinutes,
      description: raw.shortFormattedAddress?.trim() || undefined,
      photoNames: photoNames.length > 0 ? photoNames : undefined,
      source: "google",
    });
  }

  return items.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Thailand-clustered Spatial Grid Nearby Search (New) with Dynamic Monthly Quota Pacing.
 * Snaps query center to ~2.2km grid cell so adjacent hotels share short-lived runtime cache!
 */
export async function searchGoogleNearbyCategory(params: {
  lat: number;
  lng: number;
  originLat: number;
  originLng: number;
  category: Exclude<NearbyPlaceCategory, "all" | "host">;
  radiusMeters: number;
  language?: "th" | "en";
}): Promise<{
  items: NearbyPlaceItem[];
  quotaExceeded: boolean;
  fromCache: boolean;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return { items: [], quotaExceeded: false, fromCache: false };
  }

  const { lat, lng, originLat, originLng, category, language = "th" } = params;
  const clampedRadius = Math.max(500, Math.min(25000, Math.round(params.radiusMeters)));
  const radiusBucket = Math.round(clampedRadius / 1000) * 1000 || 1000;

  // Spatial Grid Snap (~2.2km resolution: 0.02 deg) — maximizes reuse across resort clusters in Thailand!
  const gridLat = (Math.round(lat * 50) / 50).toFixed(2);
  const gridLng = (Math.round(lng * 50) / 50).toFixed(2);
  const cacheKey = `${category}|${gridLat},${gridLng}|${radiusBucket}|${language}`;

  const cached = googleNearbyRuntimeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      items: mapRawGooglePlacesToItems(
        cached.rawPlaces,
        originLat,
        originLng,
        category
      ),
      quotaExceeded: false,
      fromCache: true,
    };
  }

  // Dynamic Monthly Pacing Quota Gate (never exceeds monthly free tier!)
  const quota = await consumeGoogleQuota("PLACES_NEARBY_PRO", 1);
  if (!quota.allowed) {
    return { items: [], quotaExceeded: true, fromCache: false };
  }

  const cfg = CATEGORY_GOOGLE_TYPES[category];
  const body = {
    includedTypes: cfg.includedTypes,
    excludedTypes: EXCLUDED_LODGING_TYPES,
    maxResultCount: 20,
    rankPreference: cfg.rankPreference,
    languageCode: language === "en" ? "en" : "th",
    regionCode: "TH",
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: clampedRadius,
      },
    },
  };

  try {
    const res = await fetch(`${GOOGLE_PLACES_BASE}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PRO_PLACES_FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[Google searchNearby]", res.status, errText.slice(0, 260));
      return { items: [], quotaExceeded: false, fromCache: false };
    }

    const data = (await res.json()) as { places?: GooglePlaceRaw[] };
    const rawPlaces = Array.isArray(data.places) ? data.places : [];

    if (googleNearbyRuntimeCache.size > 300) {
      const firstKey = googleNearbyRuntimeCache.keys().next().value;
      if (firstKey) googleNearbyRuntimeCache.delete(firstKey);
    }
    googleNearbyRuntimeCache.set(cacheKey, {
      expiresAt: Date.now() + RUNTIME_CACHE_TTL_MS,
      rawPlaces,
    });

    return {
      items: mapRawGooglePlacesToItems(
        rawPlaces,
        originLat,
        originLng,
        category
      ),
      quotaExceeded: false,
      fromCache: false,
    };
  } catch (err) {
    console.error("[Google searchNearby exception]", err);
    return { items: [], quotaExceeded: false, fromCache: false };
  }
}

/**
 * Google Places Text Search (New) — Thailand-locked (`regionCode: "TH"`), biased to current map area.
 */
export async function searchGoogleText(params: {
  query: string;
  lat: number;
  lng: number;
  originLat: number;
  originLng: number;
  radiusMeters?: number;
  language?: "th" | "en";
}): Promise<{
  items: NearbyPlaceItem[];
  quotaExceeded: boolean;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return { items: [], quotaExceeded: false };

  const quota = await consumeGoogleQuota("PLACES_TEXT_PRO", 1);
  if (!quota.allowed) return { items: [], quotaExceeded: true };

  const {
    query,
    lat,
    lng,
    originLat,
    originLng,
    radiusMeters = 15000,
    language = "th",
  } = params;

  try {
    const res = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PRO_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: language === "en" ? "en" : "th",
        regionCode: "TH",
        pageSize: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.max(1000, Math.min(50000, radiusMeters)),
          },
        },
      }),
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[Google searchText]", res.status, errText.slice(0, 260));
      return { items: [], quotaExceeded: false };
    }

    const data = (await res.json()) as { places?: GooglePlaceRaw[] };
    const rawPlaces = Array.isArray(data.places) ? data.places : [];
    return {
      items: mapRawGooglePlacesToItems(rawPlaces, originLat, originLng),
      quotaExceeded: false,
    };
  } catch (err) {
    console.error("[Google searchText exception]", err);
    return { items: [], quotaExceeded: false };
  }
}

/**
 * Google Places Autocomplete (New) — Thailand-only (`includedRegionCodes: ["TH"]`), viewport-biased.
 */
export async function searchGoogleAutocomplete(params: {
  input: string;
  lat: number;
  lng: number;
  sessionToken?: string;
  language?: "th" | "en";
}): Promise<{
  suggestions: GoogleAutocompleteSuggestion[];
  quotaExceeded: boolean;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return { suggestions: [], quotaExceeded: false };

  const quota = await consumeGoogleQuota("PLACES_AUTOCOMPLETE", 1);
  if (!quota.allowed) return { suggestions: [], quotaExceeded: true };

  const { input, lat, lng, sessionToken, language = "th" } = params;

  try {
    const res = await fetch(`${GOOGLE_PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        languageCode: language === "en" ? "en" : "th",
        regionCode: "TH",
        includedRegionCodes: ["TH"],
        ...(sessionToken ? { sessionToken } : {}),
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 25000,
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { suggestions: [], quotaExceeded: false };
    }

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          types?: string[];
        };
      }>;
    };

    const suggestions: GoogleAutocompleteSuggestion[] = [];
    for (const entry of data.suggestions || []) {
      const pred = entry.placePrediction;
      if (!pred?.placeId) continue;
      const mainText = (
        pred.structuredFormat?.mainText?.text ||
        pred.text?.text ||
        ""
      ).trim();
      if (!mainText) continue;
      const secondaryText = (
        pred.structuredFormat?.secondaryText?.text || ""
      ).trim();
      const types = Array.isArray(pred.types) ? pred.types : [];
      const inferred = inferCategoryFromGoogleTypes(types[0] || "", types);

      suggestions.push({
        placeId: pred.placeId,
        mainText,
        secondaryText,
        types,
        category: inferred.category,
      });
      if (suggestions.length >= 6) break;
    }

    return { suggestions, quotaExceeded: false };
  } catch {
    return { suggestions: [], quotaExceeded: false };
  }
}

/**
 * Fetch a single Google Place clicked directly on the Google Vector Map (e.g. "สะพานสะปัน", "น้ำตกสะปัน").
 * - Uses Pro-tier FieldMask (5,000 free calls/month) with Dynamic Monthly Quota Pacing.
 * - Strictly BLOCKS competing accommodations/hotels so guests stay focused on booking this stay!
 */
export async function getGooglePlaceDetailById(params: {
  placeId: string;
  originLat: number;
  originLng: number;
  language?: "th" | "en";
}): Promise<{
  place: NearbyPlaceItem | null;
  blocked: boolean;
  quotaExceeded: boolean;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const cleanPlaceId = params.placeId.trim();
  if (!apiKey || !/^[A-Za-z0-9_-]{8,220}$/.test(cleanPlaceId)) {
    return { place: null, blocked: false, quotaExceeded: false };
  }

  const language = params.language === "en" ? "en" : "th";
  const cacheKey = `${cleanPlaceId}|${language}`;
  const cached = googleDetailRuntimeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.blocked || !cached.rawPlace) {
      return { place: null, blocked: cached.blocked, quotaExceeded: false };
    }
    const mapped = mapRawGooglePlacesToItems(
      [cached.rawPlace],
      params.originLat,
      params.originLng
    );
    return { place: mapped[0] ?? null, blocked: false, quotaExceeded: false };
  }

  const quota = await consumeGoogleQuota("PLACES_DETAIL_PRO", 1);
  if (!quota.allowed) {
    return { place: null, blocked: false, quotaExceeded: true };
  }

  try {
    const url = `${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(
      cleanPlaceId
    )}?languageCode=${language}&regionCode=TH`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": SINGLE_PLACE_PRO_FIELD_MASK,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return { place: null, blocked: false, quotaExceeded: false };
    }

    const raw = (await res.json()) as GooglePlaceRaw;
    const blocked = isCompetitorLodgingPlace(raw);

    if (googleDetailRuntimeCache.size > 300) {
      const firstKey = googleDetailRuntimeCache.keys().next().value;
      if (firstKey) googleDetailRuntimeCache.delete(firstKey);
    }
    googleDetailRuntimeCache.set(cacheKey, {
      expiresAt: Date.now() + RUNTIME_CACHE_TTL_MS,
      rawPlace: blocked ? null : raw,
      blocked,
    });

    if (blocked) {
      return { place: null, blocked: true, quotaExceeded: false };
    }

    const mapped = mapRawGooglePlacesToItems(
      [raw],
      params.originLat,
      params.originLng
    );
    return { place: mapped[0] ?? null, blocked: false, quotaExceeded: false };
  } catch {
    return { place: null, blocked: false, quotaExceeded: false };
  }
}
