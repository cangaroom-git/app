import { NextResponse } from "next/server";
import {
  consumeGoogleQuota,
  peekGoogleQuota,
} from "@/lib/geo/googlePlacesQuota";
import { isGooglePlacesConfigured } from "@/lib/geo/googlePlacesServer";

function hasClientMapsKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
}

/**
 * GET /api/places/quota — Read-only snapshot of current dynamic monthly pacing status.
 */
export async function GET() {
  const hasGoogle = hasClientMapsKey() && isGooglePlacesConfigured();
  if (!hasGoogle) {
    return NextResponse.json({
      googleEnabled: false,
      mapsJsAllowed: false,
      placesNearbyAllowed: false,
      placesPhotoAllowed: false,
    });
  }

  const [mapsJs, nearby, photo] = await Promise.all([
    peekGoogleQuota("MAPS_JS_LOAD"),
    peekGoogleQuota("PLACES_NEARBY_PRO"),
    peekGoogleQuota("PLACES_PHOTO"),
  ]);

  return NextResponse.json({
    googleEnabled: true,
    mapsJsAllowed: mapsJs.allowed,
    placesNearbyAllowed: nearby.allowed,
    placesPhotoAllowed: photo.allowed,
    pacing: {
      mapsJs: {
        monthlyUsed: mapsJs.monthlyUsed,
        monthlyCap: mapsJs.monthlyCap,
        dailyUsed: mapsJs.dailyUsed,
        todayAllowed: mapsJs.todayAllowed,
        daysLeftInMonth: mapsJs.daysLeftInMonth,
      },
      nearby: {
        monthlyUsed: nearby.monthlyUsed,
        monthlyCap: nearby.monthlyCap,
        dailyUsed: nearby.dailyUsed,
        todayAllowed: nearby.todayAllowed,
      },
      photo: {
        monthlyUsed: photo.monthlyUsed,
        monthlyCap: photo.monthlyCap,
        dailyUsed: photo.dailyUsed,
        todayAllowed: photo.todayAllowed,
      },
    },
  });
}

/**
 * POST /api/places/quota — Atomically reserve 1 Dynamic Maps JS load when opening the Nearby Explorer Modal.
 * Ensures Google Maps JS loads strictly stay under the monthly free tier (10,000/mo -> 9,500 safety cap).
 */
export async function POST() {
  const hasGoogle = hasClientMapsKey() && isGooglePlacesConfigured();
  if (!hasGoogle) {
    return NextResponse.json({
      googleEnabled: false,
      mapsJsAllowed: false,
      placesNearbyAllowed: false,
      placesPhotoAllowed: false,
    });
  }

  const [mapsJs, nearby, photo] = await Promise.all([
    consumeGoogleQuota("MAPS_JS_LOAD", 1),
    peekGoogleQuota("PLACES_NEARBY_PRO"),
    peekGoogleQuota("PLACES_PHOTO"),
  ]);

  return NextResponse.json({
    googleEnabled: true,
    mapsJsAllowed: mapsJs.allowed,
    placesNearbyAllowed: nearby.allowed,
    placesPhotoAllowed: photo.allowed,
  });
}
