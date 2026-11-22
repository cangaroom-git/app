import { prisma } from "@/lib/prisma";
import {
  estimateRoadDistanceAndTime,
  haversineDistanceKm,
  type NearbyPlaceCategory,
  type NearbyPlaceItem,
} from "@/lib/geo/nearbyPlacesTypes";

type OpenDataCategory = Exclude<NearbyPlaceCategory, "all" | "host">;

interface RawOpenDataPlace {
  source: "osm" | "wikipedia" | "overture";
  externalId: string;
  nameTh: string;
  nameEn: string;
  category: OpenDataCategory;
  subcategoryTh: string;
  subcategoryEn: string;
  lat: number;
  lng: number;
  description?: string;
  thumbnailUrl?: string;
  popularityScore: number;
}

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
  "parking",
  "atm",
  "toilet",
]);

const LODGING_BLOCK_RE =
  /\b(hotel|resort|hostel|homestay|guesthouse|guest house|villa|bungalow|lodge|motel|inn|glamping|camping|camp|รีสอร์ท|รีสอร์ต|โรงแรม|โฮมสเตย์|พูลวิลล่า|บ้านพัก|ที่พัก|เกสต์เฮาส์|แกลมปิ้ง|แคมป์ปิ้ง)\b/i;

// Cooldown map so background self-healing sync never hammers Overpass/Wikipedia for the same grid cell
const syncedCellsCooldown = new Map<string, number>();
const CELL_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

function gridCellKey(lat: number, lng: number): string {
  // ~5.5km grid cells
  return `${(Math.round(lat * 20) / 20).toFixed(2)},${(
    Math.round(lng * 20) / 20
  ).toFixed(2)}`;
}

function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-_.'"()]+/g, "")
    .trim();
}

function isBlockedLodgingName(name: string): boolean {
  return LODGING_BLOCK_RE.test(name);
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function classifyOsmTags(tags: Record<string, string>): {
  category: OpenDataCategory;
  subTh: string;
  subEn: string;
  baseScore: number;
} | null {
  const tourism = tags.tourism || "";
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const natural = tags.natural || "";
  const waterway = tags.waterway || "";
  const historic = tags.historic || "";
  const leisure = tags.leisure || "";
  const aeroway = tags.aeroway || "";
  const railway = tags.railway || "";

  // Strictly block competing hotels & accommodations
  if (
    tourism === "hotel" ||
    tourism === "motel" ||
    tourism === "hostel" ||
    tourism === "guest_house" ||
    tourism === "chalet" ||
    tourism === "camp_site" ||
    tourism === "caravan_site" ||
    tourism === "apartment" ||
    amenity === "love_hotel"
  ) {
    return null;
  }

  if (waterway === "waterfall" || natural === "waterfall") {
    return {
      category: "attraction",
      subTh: "น้ำตก",
      subEn: "Waterfall",
      baseScore: 86,
    };
  }
  if (tourism === "viewpoint" || natural === "peak") {
    return {
      category: "attraction",
      subTh: "จุดชมวิว",
      subEn: "Viewpoint",
      baseScore: 84,
    };
  }
  if (natural === "beach" || natural === "hot_spring" || natural === "cave_entrance") {
    return {
      category: "attraction",
      subTh:
        natural === "beach"
          ? "ชายหาด"
          : natural === "hot_spring"
          ? "บ่อน้ำพุร้อน"
          : "ถ้ำ & ธรรมชาติ",
      subEn:
        natural === "beach"
          ? "Beach"
          : natural === "hot_spring"
          ? "Hot spring"
          : "Nature spot",
      baseScore: 84,
    };
  }
  if (amenity === "place_of_worship" || historic) {
    return {
      category: "attraction",
      subTh: historic ? "โบราณสถาน / แลนด์มาร์ก" : "วัด / ศาสนสถาน",
      subEn: historic ? "Historic landmark" : "Temple",
      baseScore: 76,
    };
  }
  if (tourism || leisure === "park" || leisure === "nature_reserve" || leisure === "garden") {
    return {
      category: "attraction",
      subTh: "สถานที่ท่องเที่ยว",
      subEn: "Attraction",
      baseScore: 78,
    };
  }
  if (amenity === "cafe" || shop === "coffee" || shop === "bakery") {
    return {
      category: "cafe",
      subTh: "คาเฟ่ & กาแฟ",
      subEn: "Cafe",
      baseScore: 72,
    };
  }
  if (amenity === "restaurant" || amenity === "fast_food") {
    return {
      category: "dining",
      subTh: "ร้านอาหาร",
      subEn: "Restaurant",
      baseScore: 70,
    };
  }
  if (shop === "convenience" || shop === "supermarket" || shop === "greengrocer") {
    return {
      category: "groceries",
      subTh: shop === "convenience" ? "ร้านสะดวกซื้อ" : "ซุปเปอร์มาร์เก็ต",
      subEn: shop === "convenience" ? "Convenience store" : "Supermarket",
      baseScore: 62,
    };
  }
  if (amenity === "marketplace" || shop === "mall" || shop === "department_store") {
    return {
      category: "shopping",
      subTh: amenity === "marketplace" ? "ตลาดท้องถิ่น" : "ศูนย์การค้า",
      subEn: amenity === "marketplace" ? "Local market" : "Shopping mall",
      baseScore: 68,
    };
  }
  if (amenity === "charging_station") {
    return {
      category: "essential",
      subTh: "จุดชาร์จ EV",
      subEn: "EV charging",
      baseScore: 64,
    };
  }
  if (amenity === "fuel") {
    return {
      category: "essential",
      subTh: "ปั๊มน้ำมัน",
      subEn: "Gas station",
      baseScore: 60,
    };
  }
  if (railway === "station" || amenity === "bus_station" || aeroway === "aerodrome") {
    return {
      category: "essential",
      subTh:
        aeroway === "aerodrome"
          ? "สนามบิน"
          : railway === "station"
          ? "สถานีรถไฟฟ้า / รถไฟ"
          : "สถานีขนส่ง",
      subEn:
        aeroway === "aerodrome"
          ? "Airport"
          : railway === "station"
          ? "Transit station"
          : "Bus terminal",
      baseScore: 72,
    };
  }
  if (amenity === "hospital" || amenity === "pharmacy") {
    return {
      category: "essential",
      subTh: amenity === "pharmacy" ? "ร้านขายยา" : "โรงพยาบาล",
      subEn: amenity === "pharmacy" ? "Pharmacy" : "Hospital",
      baseScore: 56,
    };
  }
  return null;
}

async function fetchOsmOverpassBatch(
  lat: number,
  lng: number,
  radiusMeters = 12000
): Promise<RawOpenDataPlace[]> {
  const query = `
[out:json][timeout:10];
(
  nwr["tourism"~"attraction|viewpoint|museum|gallery|theme_park|picnic_site"](around:${radiusMeters},${lat},${lng});
  nwr["natural"~"waterfall|peak|hot_spring|beach|cave_entrance"](around:${radiusMeters},${lat},${lng});
  nwr["waterway"="waterfall"](around:${radiusMeters},${lat},${lng});
  nwr["historic"](around:${radiusMeters},${lat},${lng});
  nwr["leisure"~"park|nature_reserve|garden"](around:${radiusMeters},${lat},${lng});
  nwr["amenity"~"cafe|restaurant|marketplace|place_of_worship|fuel|charging_station|hospital|bus_station"](around:${radiusMeters},${lat},${lng});
  nwr["shop"~"convenience|supermarket|coffee|bakery|mall"](around:${radiusMeters},${lat},${lng});
  nwr["railway"="station"](around:${radiusMeters},${lat},${lng});
  nwr["aeroway"="aerodrome"](around:${radiusMeters},${lat},${lng});
);
out center tags qt 140;
  `.trim();

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ];
  const encodedBody = new URLSearchParams({ data: query }).toString();

  let elements: OverpassElement[] = [];
  try {
    elements = await Promise.any(
      endpoints.map(async (endpoint) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)",
          },
          body: encodedBody,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { elements?: OverpassElement[] };
        if (!Array.isArray(json.elements)) throw new Error("Invalid Overpass response");
        return json.elements;
      })
    );
  } catch {
    return [];
  }

  const out: RawOpenDataPlace[] = [];
  for (const el of elements) {
    const tags = el.tags;
    if (!tags) continue;
    const itemLat = el.lat ?? el.center?.lat;
    const itemLng = el.lon ?? el.center?.lon;
    if (typeof itemLat !== "number" || typeof itemLng !== "number") continue;

    const classified = classifyOsmTags(tags);
    if (!classified) continue;

    const rawTh =
      tags["name:th"] ||
      tags.name ||
      tags["name:en"] ||
      (tags.shop === "convenience" && tags.brand ? tags.brand : "");
    const rawEn = tags["name:en"] || tags.name || tags["name:th"] || rawTh;
    const nameTh = rawTh.trim();
    const nameEn = rawEn.trim();
    if (
      !nameTh ||
      GENERIC_BARE_NAMES.has(nameTh.toLowerCase()) ||
      isBlockedLodgingName(nameTh) ||
      isBlockedLodgingName(nameEn)
    ) {
      continue;
    }

    let thumb: string | undefined;
    if (tags.image && /^https?:\/\/\S+\.(jpe?g|png|webp)/i.test(tags.image)) {
      thumb = tags.image.trim();
    } else if (tags.wikimedia_commons?.trim().startsWith("File:")) {
      thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
        tags.wikimedia_commons.trim().slice(5)
      )}?width=480`;
    }

    const addressNote = [tags["addr:street"], tags["addr:subdistrict"]]
      .filter(Boolean)
      .join(" ");

    let score = classified.baseScore;
    if (thumb) score += 10;
    if (tags.wikipedia || tags.wikidata) score += 8;
    if (/7-eleven|เซเว่น/i.test(nameTh)) score += 6;

    out.push({
      source: "osm",
      externalId: `${el.type}-${el.id}`,
      nameTh,
      nameEn,
      category: classified.category,
      subcategoryTh: classified.subTh,
      subcategoryEn: classified.subEn,
      lat: itemLat,
      lng: itemLng,
      description: addressNote || undefined,
      thumbnailUrl: thumb,
      popularityScore: Math.min(100, score),
    });
  }

  return out;
}

interface WikiPage {
  pageid: number;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  coordinates?: Array<{ lat: number; lon: number }>;
}

async function fetchWikipediaBatch(
  wikiLang: "th" | "en",
  lat: number,
  lng: number
): Promise<RawOpenDataPlace[]> {
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
    url.searchParams.set("pithumbsize", "480");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: { pages?: Record<string, WikiPage> };
    };
    const pages = Object.values(data.query?.pages ?? {});

    const out: RawOpenDataPlace[] = [];
    for (const page of pages) {
      const title = (page.title || "").trim();
      const coord = page.coordinates?.[0];
      if (!title || !coord) continue;
      if (
        title.startsWith("จังหวัด") ||
        title.startsWith("อำเภอ") ||
        title.startsWith("ตำบล") ||
        title.endsWith(" Province") ||
        title.endsWith(" district") ||
        title.endsWith(" District") ||
        title === "ประเทศไทย" ||
        title === "Thailand" ||
        isBlockedLodgingName(title)
      ) {
        continue;
      }

      const description = (page.extract || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      const isTransit =
        /สถานีรถไฟฟ้า|บีทีเอส|เอ็มอาร์ที|bts|mrt|station|airport|ท่าอากาศยาน/i.test(
          title
        );
      const isMall = /ศูนย์การค้า|เซ็นทรัล|พารากอน|ไอคอนสยาม|central|mall|market|ตลาด/i.test(
        title
      );

      out.push({
        source: "wikipedia",
        externalId: `${wikiLang}-${page.pageid}`,
        nameTh: title,
        nameEn: title,
        category: isTransit ? "essential" : isMall ? "shopping" : "attraction",
        subcategoryTh: isTransit
          ? "สถานีเดินทางสำคัญ"
          : isMall
          ? "แหล่งช้อปปิ้ง & ตลาด"
          : "จุดเช็กอินแนะนำ",
        subcategoryEn: isTransit
          ? "Transit hub"
          : isMall
          ? "Shopping & Market"
          : "Notable landmark",
        lat: coord.lat,
        lng: coord.lon,
        description: description || undefined,
        thumbnailUrl: page.thumbnail?.source || undefined,
        popularityScore: page.thumbnail?.source ? 94 : 80,
      });
    }
    return out;
  } catch {
    return [];
  }
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_value?: string;
    name?: string;
    street?: string;
    district?: string;
    city?: string;
  };
}

async function fetchPhotonSupplementBatch(
  lat: number,
  lng: number
): Promise<RawOpenDataPlace[]> {
  const probes: Array<{
    q: string;
    category: OpenDataCategory;
    subTh: string;
    subEn: string;
    score: number;
  }> = [
    { q: "คาเฟ่", category: "cafe", subTh: "คาเฟ่ & กาแฟ", subEn: "Cafe", score: 70 },
    { q: "cafe", category: "cafe", subTh: "คาเฟ่ & กาแฟ", subEn: "Cafe", score: 69 },
    { q: "ร้านอาหาร", category: "dining", subTh: "ร้านอาหาร", subEn: "Restaurant", score: 68 },
    { q: "7-Eleven", category: "groceries", subTh: "ร้านสะดวกซื้อ", subEn: "7-Eleven", score: 64 },
    { q: "น้ำตก", category: "attraction", subTh: "น้ำตก", subEn: "Waterfall", score: 82 },
    { q: "จุดชมวิว", category: "attraction", subTh: "จุดชมวิว", subEn: "Viewpoint", score: 82 },
    { q: "ตลาด", category: "shopping", subTh: "ตลาดท้องถิ่น", subEn: "Market", score: 66 },
  ];

  const settled = await Promise.allSettled(
    probes.map(async (probe) => {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", probe.q);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("limit", "10");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "NondiiDirectStay/1.0 (+https://nondii.com)" },
        signal: AbortSignal.timeout(5500),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { features?: PhotonFeature[] };
      const features = Array.isArray(data.features) ? data.features : [];

      const items: RawOpenDataPlace[] = [];
      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        const coords = f.geometry?.coordinates;
        const props = f.properties;
        const name = (props?.name || "").trim();
        if (!coords || coords.length < 2 || !name) continue;
        if (
          GENERIC_BARE_NAMES.has(name.toLowerCase()) ||
          isBlockedLodgingName(name) ||
          props?.osm_value === "hotel" ||
          props?.osm_value === "guest_house"
        ) {
          continue;
        }
        const [pLng, pLat] = coords;
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;
        if (haversineDistanceKm(lat, lng, pLat, pLng) > 15) continue;

        const desc = [props?.street, props?.district, props?.city]
          .filter(Boolean)
          .join(", ");

        items.push({
          source: "osm",
          externalId: `photon-${props?.osm_id ?? `${probe.category}-${pLat.toFixed(4)}-${pLng.toFixed(4)}-${i}`}`,
          nameTh: name,
          nameEn: name,
          category: probe.category,
          subcategoryTh: probe.subTh,
          subcategoryEn: probe.subEn,
          lat: pLat,
          lng: pLng,
          description: desc || undefined,
          popularityScore: probe.score,
        });
      }
      return items;
    })
  );

  const collected: RawOpenDataPlace[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") collected.push(...r.value);
  }
  return collected;
}

/**
 * Harvest 100% Free Open Data (OSM + Wikipedia/Wikimedia + Photon) around a Thailand coordinate
 * and persist permanently into our own `ThailandPlace` PostgreSQL table ($0 API cost, 100% Google-ToS clean).
 */
export async function syncFreeOpenDataPlacesAround(
  lat: number,
  lng: number,
  provinceId?: string | null,
  radiusMeters = 12000
): Promise<{ fetched: number; upserted: number }> {
  const [osmRes, wikiThRes, wikiEnRes, photonRes] = await Promise.allSettled([
    fetchOsmOverpassBatch(lat, lng, radiusMeters),
    fetchWikipediaBatch("th", lat, lng),
    fetchWikipediaBatch("en", lat, lng),
    fetchPhotonSupplementBatch(lat, lng),
  ]);

  const osmItems = osmRes.status === "fulfilled" ? osmRes.value : [];
  const wikiItems = [
    ...(wikiThRes.status === "fulfilled" ? wikiThRes.value : []),
    ...(wikiEnRes.status === "fulfilled" ? wikiEnRes.value : []),
  ];
  const photonItems = photonRes.status === "fulfilled" ? photonRes.value : [];

  // Deduplicate OSM + Photon + Wikipedia cleanly (merging Wikipedia photos/Thai names onto matching landmarks)
  const merged: RawOpenDataPlace[] = [];
  for (const item of [...osmItems, ...photonItems]) {
    const norm = normalizePlaceName(item.nameTh);
    const dup = merged.find(
      (ex) =>
        (normalizePlaceName(ex.nameTh) === norm &&
          haversineDistanceKm(ex.lat, ex.lng, item.lat, item.lng) < 0.3) ||
        haversineDistanceKm(ex.lat, ex.lng, item.lat, item.lng) < 0.035
    );
    if (!dup) merged.push(item);
  }

  for (const wiki of wikiItems) {
    const normWiki = normalizePlaceName(wiki.nameTh);
    const match = merged.find((ex) => {
      const dist = haversineDistanceKm(ex.lat, ex.lng, wiki.lat, wiki.lng);
      const normEx = normalizePlaceName(ex.nameTh);
      return (
        (normWiki.length > 2 && normEx === normWiki && dist < 1.5) ||
        (dist <= 0.16 && ex.category === "attraction") ||
        (ex.thumbnailUrl && wiki.thumbnailUrl && ex.thumbnailUrl === wiki.thumbnailUrl)
      );
    });
    if (match) {
      if (!match.thumbnailUrl && wiki.thumbnailUrl) match.thumbnailUrl = wiki.thumbnailUrl;
      if (!match.description && wiki.description) match.description = wiki.description;
      if (/[\u0E00-\u0E7F]/.test(wiki.nameTh) && !/[\u0E00-\u0E7F]/.test(match.nameTh)) {
        match.nameTh = wiki.nameTh;
      }
      match.popularityScore = Math.max(match.popularityScore, wiki.popularityScore);
    } else {
      merged.push(wiki);
    }
  }

  if (merged.length === 0) {
    return { fetched: 0, upserted: 0 };
  }

  // Upsert cleanly in small parallel chunks to stay gentle on Neon Postgres connections
  const now = new Date();
  let upserted = 0;
  const CHUNK_SIZE = 20;
  for (let i = 0; i < merged.length; i += CHUNK_SIZE) {
    const chunk = merged.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((item) =>
        prisma.thailandPlace
          .upsert({
            where: {
              source_externalId: {
                source: item.source,
                externalId: item.externalId,
              },
            },
            create: {
              source: item.source,
              externalId: item.externalId,
              nameTh: item.nameTh,
              nameEn: item.nameEn,
              category: item.category,
              subcategoryTh: item.subcategoryTh,
              subcategoryEn: item.subcategoryEn,
              provinceId: provinceId ?? null,
              lat: item.lat,
              lng: item.lng,
              description: item.description ?? null,
              thumbnailUrl: item.thumbnailUrl ?? null,
              popularityScore: item.popularityScore,
              syncedAt: now,
            },
            update: {
              nameTh: item.nameTh,
              nameEn: item.nameEn,
              subcategoryTh: item.subcategoryTh,
              subcategoryEn: item.subcategoryEn,
              provinceId: provinceId ?? undefined,
              description: item.description ?? undefined,
              thumbnailUrl: item.thumbnailUrl ?? undefined,
              popularityScore: item.popularityScore,
              syncedAt: now,
            },
          })
          .then(() => {
            upserted += 1;
          })
          .catch(() => {
            // Ignore transient row conflict
          })
      )
    );
  }

  syncedCellsCooldown.set(gridCellKey(lat, lng), Date.now());
  return { fetched: merged.length, upserted };
}

/**
 * Non-blocking self-healing trigger: if a newly pinned hotel has sparse Open Data nearby in `ThailandPlace`,
 * harvest free OSM + Wikipedia spots around it in the background (with 6h per-cell cooldown).
 */
export async function ensureThailandPlacesAroundCoord(
  lat: number,
  lng: number,
  provinceId?: string | null
): Promise<void> {
  const key = gridCellKey(lat, lng);
  const lastSync = syncedCellsCooldown.get(key) ?? 0;
  if (Date.now() - lastSync < CELL_SYNC_COOLDOWN_MS) return;

  const latDelta = 10 / 111.32;
  const lngDelta = 10 / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

  const existingCount = await prisma.thailandPlace
    .count({
      where: {
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
    })
    .catch(() => 0);

  if (existingCount >= 6) {
    syncedCellsCooldown.set(key, Date.now());
    return;
  }

  syncedCellsCooldown.set(key, Date.now());
  await syncFreeOpenDataPlacesAround(lat, lng, provinceId).catch(() => {});
}

function mapRowToNearbyPlaceItem(
  row: {
    id: string;
    nameTh: string;
    nameEn: string;
    category: string;
    subcategoryTh: string;
    subcategoryEn: string;
    lat: number;
    lng: number;
    description: string | null;
    thumbnailUrl: string | null;
  },
  originLat: number,
  originLng: number
): NearbyPlaceItem {
  const straightKm = haversineDistanceKm(originLat, originLng, row.lat, row.lng);
  const { driveMinutes, walkMinutes } = estimateRoadDistanceAndTime(straightKm);
  const validCat = (
    ["dining", "cafe", "groceries", "shopping", "essential", "attraction"].includes(
      row.category
    )
      ? row.category
      : "attraction"
  ) as OpenDataCategory;

  return {
    id: `ndb-${row.id}`,
    nameTh: row.nameTh,
    nameEn: row.nameEn || row.nameTh,
    category: validCat,
    subcategoryLabelTh: row.subcategoryTh || "Nondii แนะนำ",
    subcategoryLabelEn: row.subcategoryEn || "Nondii pick",
    lat: row.lat,
    lng: row.lng,
    distanceKm: Number(straightKm.toFixed(2)),
    driveMinutes,
    walkMinutes,
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    source: "nondii_db",
  };
}

/**
 * Query our own free `ThailandPlace` table in Neon Postgres (< 30ms, $0 API cost)
 * and select a diverse, spatially well-spaced set of 5–6 "Nondii แนะนำ" spots!
 *
 * Quota diversity target (when category = "all"):
 *  - Attractions/Viewpoints/Waterfalls: up to 2
 *  - Cafes: up to 2
 *  - Restaurants: up to 2
 *  - Convenience/Market/Transit/Fuel: up to 1
 */
export async function queryRecommendedThailandPlaces(params: {
  lat: number;
  lng: number;
  originLat?: number;
  originLng?: number;
  radiusKm?: number;
  category?: NearbyPlaceCategory;
  limit?: number;
  autoHarvestIfEmpty?: boolean;
}): Promise<NearbyPlaceItem[]> {
  const {
    lat,
    lng,
    originLat = lat,
    originLng = lng,
    radiusKm = 12,
    category = "all",
    limit = 6,
    autoHarvestIfEmpty = true,
  } = params;

  const latDelta = radiusKm / 111.32;
  const lngDelta =
    radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

  const categoryFilter =
    category !== "all" && category !== "host" ? { category } : {};

  const rows = await prisma.thailandPlace.findMany({
    where: {
      ...categoryFilter,
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    select: {
      id: true,
      nameTh: true,
      nameEn: true,
      category: true,
      subcategoryTh: true,
      subcategoryEn: true,
      lat: true,
      lng: true,
      description: true,
      thumbnailUrl: true,
      popularityScore: true,
    },
    orderBy: [{ popularityScore: "desc" }],
    take: 120,
  });

  if (rows.length < 3 && autoHarvestIfEmpty) {
    // Non-blocking background self-heal so future visits to this area get instant < 30ms DB hits!
    void ensureThailandPlacesAroundCoord(lat, lng);
  }

  if (rows.length === 0) return [];

  // Rank candidates by combined quality (popularity + photo + closeness to property)
  const scored = rows
    .map((row) => {
      const distKm = haversineDistanceKm(originLat, originLng, row.lat, row.lng);
      const distPenalty = Math.min(35, distKm * 3.2);
      const photoBonus = row.thumbnailUrl ? 14 : 0;
      const rankScore = row.popularityScore + photoBonus - distPenalty;
      return { row, distKm, rankScore };
    })
    .filter((entry) => entry.distKm <= radiusKm && entry.distKm >= 0.04)
    .sort((a, b) => b.rankScore - a.rankScore);

  // If filtering a single category, return top N cleanly spaced items
  if (category !== "all" && category !== "host") {
    return scored
      .slice(0, limit)
      .map((s) => mapRowToNearbyPlaceItem(s.row, originLat, originLng));
  }

  // Curated Diverse "Nondii แนะนำ" Mix (5–6 pins across categories with anti-overlap spacing!)
  const quotas: Record<string, number> = {
    attraction: 2,
    cafe: 2,
    dining: 2,
    groceries: 1,
    shopping: 1,
    essential: 1,
  };
  const usedCounts: Record<string, number> = {};
  const picked: Array<{ row: (typeof rows)[number]; distKm: number }> = [];

  const isWellSpaced = (candLat: number, candLng: number) =>
    picked.every(
      (p) => haversineDistanceKm(p.row.lat, p.row.lng, candLat, candLng) >= 0.14
    );

  // Pass 1: Respect category quotas + minimum 140m pin separation
  for (const cand of scored) {
    if (picked.length >= limit) break;
    const cat = cand.row.category;
    const maxForCat = quotas[cat] ?? 1;
    if ((usedCounts[cat] ?? 0) >= maxForCat) continue;
    if (!isWellSpaced(cand.row.lat, cand.row.lng)) continue;

    picked.push(cand);
    usedCounts[cat] = (usedCounts[cat] ?? 0) + 1;
  }

  // Pass 2: Backfill up to `limit` if area is rural & lacks some categories
  if (picked.length < limit) {
    for (const cand of scored) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.row.id === cand.row.id)) continue;
      if (!isWellSpaced(cand.row.lat, cand.row.lng)) continue;
      picked.push(cand);
    }
  }

  return picked
    .sort((a, b) => a.distKm - b.distKm)
    .map((p) => mapRowToNearbyPlaceItem(p.row, originLat, originLng));
}
