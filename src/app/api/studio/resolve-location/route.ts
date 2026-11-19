import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvinceById } from "@/data/thailandProvinces";
import { getProvinceCenter } from "@/lib/geo/thailandProvinceCentroids";

const ResolveLocationSchema = z.object({
  query: z.string().trim().min(2).max(600),
  provinceId: z.string().trim().max(80).optional(),
});

const ALLOWED_GOOGLE_MAP_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.google.co.th",
  "www.google.co.th",
]);

export interface ResolvedLocationCandidate {
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  extractedGoogleMapsUrl?: string;
  wasSwappedLatLng?: boolean;
}

function normalizeLatLngPair(
  first: number,
  second: number
): { lat: number; lng: number; swapped: boolean } | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  // Detect accidentally swapped Thailand coordinates (e.g. "101.1965, 19.1912")
  if (first >= 97 && first <= 106 && second >= 5 && second <= 21) {
    return {
      lat: Number(second.toFixed(6)),
      lng: Number(first.toFixed(6)),
      swapped: true,
    };
  }

  if (Math.abs(first) > 90 && Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return {
      lat: Number(second.toFixed(6)),
      lng: Number(first.toFixed(6)),
      swapped: true,
    };
  }

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return {
      lat: Number(first.toFixed(6)),
      lng: Number(second.toFixed(6)),
      swapped: false,
    };
  }

  return null;
}

function extractCoordinatesFromTextOrUrl(raw: string): {
  lat: number;
  lng: number;
  placeLabel?: string;
  swapped?: boolean;
} | null {
  // 1. Exact Google Maps pin marker (!3dLAT!4dLNG — prefer last match in data string)
  const bangMatches = [
    ...raw.matchAll(/!3d(-?\d{1,3}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/g),
  ];
  if (bangMatches.length > 0) {
    const last = bangMatches[bangMatches.length - 1];
    const pair = normalizeLatLngPair(Number(last[1]), Number(last[2]));
    if (pair) {
      const placeMatch = raw.match(/\/maps\/place\/([^/@?]+)/);
      const placeLabel = placeMatch
        ? decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
        : undefined;
      return { ...pair, placeLabel };
    }
  }

  // 2. Query param coordinates (?q=LAT,LNG | ?ll=LAT,LNG | ?query=LAT,LNG | /search/LAT,LNG)
  const queryMatch = raw.match(
    /(?:[?&](?:q|ll|query|center|destination|daddr)=|\/search\/)(-?\d{1,3}\.\d{3,})(?:,|%2C|\s+|\+)(-?\d{1,3}\.\d{3,})/i
  );
  if (queryMatch) {
    const pair = normalizeLatLngPair(
      Number(queryMatch[1]),
      Number(queryMatch[2])
    );
    if (pair) return pair;
  }

  // 3. Google Maps camera viewport (@LAT,LNG)
  const atMatch = raw.match(/@(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})/);
  if (atMatch) {
    const pair = normalizeLatLngPair(Number(atMatch[1]), Number(atMatch[2]));
    if (pair) {
      const placeMatch = raw.match(/\/maps\/place\/([^/@?]+)/);
      const placeLabel = placeMatch
        ? decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
        : undefined;
      return { ...pair, placeLabel };
    }
  }

  // 4. Direct raw coordinate paste: "19.1912, 101.1965"
  const rawCoordMatch = raw
    .trim()
    .match(/^(-?\d{1,3}\.\d{2,})\s*[,\s]\s*(-?\d{1,3}\.\d{2,})$/);
  if (rawCoordMatch) {
    const pair = normalizeLatLngPair(
      Number(rawCoordMatch[1]),
      Number(rawCoordMatch[2])
    );
    if (pair) return pair;
  }

  return null;
}

async function geocodePlaceCandidates(
  searchQuery: string,
  provinceId?: string
): Promise<ResolvedLocationCandidate[]> {
  const center = getProvinceCenter(provinceId);
  const prov = getProvinceById(provinceId);
  const provHint = prov ? prov.nameTh.split("(")[0].trim() : "";
  const enrichedQuery =
    provHint && !searchQuery.includes(provHint)
      ? `${searchQuery} ${provHint}`
      : searchQuery;

  const nomUrl = new URL("https://nominatim.openstreetmap.org/search");
  nomUrl.searchParams.set("format", "jsonv2");
  nomUrl.searchParams.set("q", enrichedQuery);
  nomUrl.searchParams.set("countrycodes", "th");
  nomUrl.searchParams.set("accept-language", "th,en");
  nomUrl.searchParams.set("limit", "6");

  const photonUrl = new URL("https://photon.komoot.io/api/");
  photonUrl.searchParams.set("q", searchQuery);
  photonUrl.searchParams.set("lat", String(center.lat));
  photonUrl.searchParams.set("lon", String(center.lng));
  photonUrl.searchParams.set("limit", "6");

  const [nomRes, photonRes] = await Promise.allSettled([
    fetch(nomUrl.toString(), {
      headers: {
        "User-Agent": "CangaroomDirectStay/1.0 (+https://cangaroom.com)",
      },
      signal: AbortSignal.timeout(5000),
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(photonUrl.toString(), {
      headers: {
        "User-Agent": "CangaroomDirectStay/1.0 (+https://cangaroom.com)",
      },
      signal: AbortSignal.timeout(5000),
    }).then((r) => (r.ok ? r.json() : { features: [] })),
  ]);

  const candidates: ResolvedLocationCandidate[] = [];

  if (nomRes.status === "fulfilled" && Array.isArray(nomRes.value)) {
    for (const item of nomRes.value as Array<{
      lat?: string;
      lon?: string;
      name?: string;
      display_name?: string;
    }>) {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const parts = (item.display_name || "").split(",").map((s) => s.trim());
      candidates.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        label: item.name || parts[0] || searchQuery,
        sublabel: parts.slice(1, 4).join(", ") || undefined,
      });
    }
  }

  if (
    photonRes.status === "fulfilled" &&
    Array.isArray((photonRes.value as { features?: unknown[] }).features)
  ) {
    const feats = (
      photonRes.value as {
        features: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: {
            name?: string;
            district?: string;
            city?: string;
            state?: string;
            countrycode?: string;
          };
        }>;
      }
    ).features;

    for (const f of feats) {
      const coords = f.geometry?.coordinates;
      const props = f.properties;
      if (!coords || coords.length < 2) continue;
      if (props?.countrycode && props.countrycode.toUpperCase() !== "TH") {
        continue;
      }
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const label = props?.name || props?.district || props?.city || searchQuery;
      const sublabel = [props?.district, props?.city, props?.state]
        .filter(Boolean)
        .join(", ");
      const duplicate = candidates.some(
        (c) => Math.abs(c.lat - lat) < 0.002 && Math.abs(c.lng - lng) < 0.002
      );
      if (!duplicate) {
        candidates.push({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          label,
          sublabel: sublabel || undefined,
        });
      }
    }
  }

  return candidates.slice(0, 6);
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ResolveLocationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาระบุลิงก์ Google Maps หรือชื่อสถานที่" },
        { status: 422 }
      );
    }

    const { query, provinceId } = parsed.data;

    // 1. Direct coordinate or full Google Maps URL extraction
    const directHit = extractCoordinatesFromTextOrUrl(query);
    if (directHit) {
      const isUrl = /^https?:\/\//i.test(query);
      return NextResponse.json({
        candidates: [
          {
            lat: directHit.lat,
            lng: directHit.lng,
            label:
              directHit.placeLabel ||
              `พิกัด (${directHit.lat.toFixed(5)}, ${directHit.lng.toFixed(5)})`,
            extractedGoogleMapsUrl: isUrl ? query : undefined,
            wasSwappedLatLng: directHit.swapped,
          },
        ] satisfies ResolvedLocationCandidate[],
      });
    }

    // 2. Shortened Google Maps URL (e.g. https://maps.app.goo.gl/...) — follow redirect safely on allowlisted Google domains
    if (/^https?:\/\//i.test(query)) {
      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(query);
      } catch {
        parsedUrl = null;
      }

      if (
        parsedUrl &&
        parsedUrl.protocol === "https:" &&
        ALLOWED_GOOGLE_MAP_HOSTS.has(parsedUrl.hostname.toLowerCase())
      ) {
        try {
          const res = await fetch(parsedUrl.toString(), {
            method: "GET",
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(5500),
          });

          const finalUrl = res.url || query;
          const fromFinalUrl = extractCoordinatesFromTextOrUrl(finalUrl);
          if (fromFinalUrl) {
            return NextResponse.json({
              candidates: [
                {
                  lat: fromFinalUrl.lat,
                  lng: fromFinalUrl.lng,
                  label:
                    fromFinalUrl.placeLabel ||
                    `ดึงพิกัดจาก Google Maps (${fromFinalUrl.lat.toFixed(5)}, ${fromFinalUrl.lng.toFixed(5)})`,
                  extractedGoogleMapsUrl: query,
                },
              ] satisfies ResolvedLocationCandidate[],
            });
          }

          const htmlSnippet = (await res.text()).slice(0, 120000);
          const fromHtml = extractCoordinatesFromTextOrUrl(htmlSnippet);
          if (fromHtml) {
            return NextResponse.json({
              candidates: [
                {
                  lat: fromHtml.lat,
                  lng: fromHtml.lng,
                  label:
                    fromHtml.placeLabel ||
                    `ดึงพิกัดจาก Google Maps (${fromHtml.lat.toFixed(5)}, ${fromHtml.lng.toFixed(5)})`,
                  extractedGoogleMapsUrl: query,
                },
              ] satisfies ResolvedLocationCandidate[],
            });
          }

          const placeNameMatch = finalUrl.match(/\/maps\/place\/([^/@?]+)/);
          if (placeNameMatch) {
            const decodedPlace = decodeURIComponent(
              placeNameMatch[1].replace(/\+/g, " ")
            );
            const fallbackCandidates = await geocodePlaceCandidates(
              decodedPlace,
              provinceId
            );
            if (fallbackCandidates.length > 0) {
              return NextResponse.json({
                candidates: fallbackCandidates.map((c) => ({
                  ...c,
                  extractedGoogleMapsUrl: query,
                })),
              });
            }
          }
        } catch {
          // Fall through gracefully
        }
      }

      return NextResponse.json(
        {
          candidates: [],
          error:
            "ไม่สามารถถอดพิกัดจากลิงก์นี้ได้ ลองพิมพ์ชื่อที่พักหรือเลื่อนปักหมุดบนแผนที่ด้านล่างได้เลยครับ",
        },
        { status: 200 }
      );
    }

    // 3. Place / Village / Subdistrict name search in Thailand
    const candidates = await geocodePlaceCandidates(query, provinceId);
    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหาพิกัด" },
      { status: 500 }
    );
  }
}

