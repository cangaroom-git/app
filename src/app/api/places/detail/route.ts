import { NextRequest, NextResponse } from "next/server";
import { getGooglePlaceDetailById } from "@/lib/geo/googlePlacesServer";

/**
 * GET /api/places/detail?placeId=ChIJ...&originLat=...&originLng=...&lang=th
 * Resolves a landmark / restaurant / cafe clicked directly on Google Maps into our Airbnb-style Detail Card,
 * while strictly blocking competing hotels/accommodations.
 */
export async function GET(request: NextRequest) {
  const placeId = (request.nextUrl.searchParams.get("placeId") || "").trim();
  const originLat = Number.parseFloat(
    request.nextUrl.searchParams.get("originLat") || ""
  );
  const originLng = Number.parseFloat(
    request.nextUrl.searchParams.get("originLng") || ""
  );
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "th";

  if (
    !placeId ||
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    originLat < -90 ||
    originLat > 90 ||
    originLng < -180 ||
    originLng > 180
  ) {
    return NextResponse.json(
      { error: "Valid placeId, originLat, and originLng are required." },
      { status: 400 }
    );
  }

  const result = await getGooglePlaceDetailById({
    placeId,
    originLat,
    originLng,
    language: lang,
  });

  return NextResponse.json(result);
}
