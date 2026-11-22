import { NextRequest, NextResponse } from "next/server";
import { queryRecommendedThailandPlaces } from "@/lib/geo/thailandPlacesDb";
import type { NearbyPlaceCategory } from "@/lib/geo/nearbyPlacesTypes";

const ALLOWED_CATEGORIES = new Set<NearbyPlaceCategory>([
  "all",
  "host",
  "dining",
  "cafe",
  "groceries",
  "shopping",
  "essential",
  "attraction",
]);

/**
 * GET /api/places/recommended?lat=...&lng=...&limit=6&category=all
 * Zero-cost ($0) fast (< 30ms) query against Nondii's own `ThailandPlace` Neon PostgreSQL database.
 * Used by DealDetailInlineMap, HotelLocationMap previews, and "Nondii แนะนำ" — NEVER spends Google API quota!
 */
export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(request.nextUrl.searchParams.get("lng") ?? "");
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "Valid lat and lng are required." },
      { status: 400 }
    );
  }

  const rawCategory = (
    request.nextUrl.searchParams.get("category") || "all"
  ).trim() as NearbyPlaceCategory;
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : "all";

  const rawLimit = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "6",
    10
  );
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(20, rawLimit))
    : 6;

  const rawRadius = Number.parseFloat(
    request.nextUrl.searchParams.get("radiusKm") ?? "12"
  );
  const radiusKm = Number.isFinite(rawRadius)
    ? Math.max(1, Math.min(30, rawRadius))
    : 12;

  try {
    const items = await queryRecommendedThailandPlaces({
      lat,
      lng,
      radiusKm,
      category,
      limit,
      autoHarvestIfEmpty: true,
    });

    return NextResponse.json(
      {
        items,
        source: "nondii_db",
        count: items.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/places/recommended]", err);
    return NextResponse.json(
      { items: [], source: "nondii_db", count: 0 },
      { status: 200 }
    );
  }
}
