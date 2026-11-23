"use client";

import React from "react";
import { useHotelApp } from "@/components/HotelAppShell";
import { PlaceProfileSkeleton } from "@/components/hotel/PlaceProfileSkeleton";

/**
 * Instant streaming route skeleton for `/{hotelSlug}` so slow connections show
 * the exact Airbnb 5-Photo Mosaic + Instagram Action Bar + 7/4 layout immediately.
 * Automatically omits the primary Hero photo slot while a 3D Card Flip is in flight!
 */
export default function HotelStorefrontLoading() {
  const { activeFlipTargetSlug } = useHotelApp();
  return (
    <PlaceProfileSkeleton
      omitPrimaryHeroSlot={Boolean(activeFlipTargetSlug)}
    />
  );
}
