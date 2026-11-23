"use client";

import React from "react";

export interface PlaceProfileSkeletonProps {
  /**
   * When true (during Cross-Route 3D Card Flip), omit the skeleton placeholder
   * for the Left 2×2 Primary Hero Photo slot (Desktop/Tablet) and the full-bleed
   * square Top Hero slot (Mobile) so the flipping card lands cleanly with zero overlap.
   */
  omitPrimaryHeroSlot?: boolean;
  /**
   * Reserve exact vertical space for the Depth-1 "← กลับไป [ชื่อเดิม]" bar
   * when navigating from a Nearby Place card.
   */
  hasNearbyBackBar?: boolean;
}

/**
 * Pixel-Exact Place Profile Skeleton (`/{slug}`):
 * - Matches the exact 1120px Airbnb 5-Photo Mosaic + Instagram Social Action Bar
 *   + 7 / 1 / 4 Overview & Floating Sticky Card layout of `HotelStorefrontClient`.
 * - Uses calm warm-monochrome `.cgr-skeleton-block` breathing (zero gradients, zero border fatigue).
 */
export function PlaceProfileSkeleton({
  omitPrimaryHeroSlot = false,
  hasNearbyBackBar = false,
}: PlaceProfileSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className="cgr-page-standard select-none"
    >
      {/* ZONE 1: HEADER + 5-PHOTO MOSAIC + INSTAGRAM SOCIAL ACTION BAR */}
      <header className="space-y-3.5 sm:space-y-4 pb-3">
        {/* Depth-1 Nearby Back Bar Spacer (Desktop/Tablet only) */}
        {hasNearbyBackBar && (
          <div className="hidden sm:flex items-center pb-1">
            <div className="h-9 w-44 rounded-[11px] cgr-skeleton-block" />
          </div>
        )}

        {/* Mobile Full-Bleed 1:1 Hero Slot (< sm) */}
        <div
          className={`sm:hidden relative -mx-4 -mt-4 aspect-square ${
            omitPrimaryHeroSlot ? "bg-transparent" : "cgr-skeleton-block"
          }`}
        />

        {/* Title + Share / Save Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-0.5 sm:pt-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {!hasNearbyBackBar && (
              <div className="hidden sm:block h-9 w-9 rounded-[10px] cgr-skeleton-block shrink-0" />
            )}
            <div className="h-[28px] sm:h-9 w-56 sm:w-80 max-w-[78%] rounded-[10px] cgr-skeleton-block" />
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="h-9 w-16 rounded-[10px] cgr-skeleton-block" />
            <div className="h-9 w-20 rounded-[10px] cgr-skeleton-block" />
          </div>
        </div>

        {/* Tablet / Desktop Full-Width 1120px Airbnb 5-Photo Mosaic */}
        <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden relative">
          {/* Left 2×2 Primary Hero Photo Slot — Omitted during 3D Card Flip! */}
          <div
            className={`col-span-2 row-span-2 w-full h-full ${
              omitPrimaryHeroSlot ? "bg-transparent" : "cgr-skeleton-block"
            }`}
          />

          {/* Right 4 Secondary Photo Tiles */}
          <div
            className="col-span-1 row-span-1 w-full h-full cgr-skeleton-block"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="col-span-1 row-span-1 w-full h-full cgr-skeleton-block"
            style={{ animationDelay: "120ms" }}
          />
          <div
            className="col-span-1 row-span-1 w-full h-full cgr-skeleton-block"
            style={{ animationDelay: "120ms" }}
          />
          <div
            className="col-span-1 row-span-1 w-full h-full cgr-skeleton-block"
            style={{ animationDelay: "240ms" }}
          />
        </div>

        {/* Clean Instagram-Style Social Action Row (`♡  💬  ↗  •••`) */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2 h-10">
            <div className="h-7 w-14 rounded-[9px] cgr-skeleton-block" />
            <div className="h-7 w-11 rounded-[9px] cgr-skeleton-block" />
            <div className="h-7 w-7 rounded-[9px] cgr-skeleton-block" />
            <div className="h-7 w-7 rounded-[9px] cgr-skeleton-block" />
          </div>

          {/* Mobile Quick Save Pill Skeleton (< sm) */}
          <div className="sm:hidden h-9 w-20 rounded-[10px] cgr-skeleton-block" />
        </div>
      </header>

      {/* ZONE 2: 7 / 1 / 4 ASYMMETRIC OVERVIEW & FLOATING STICKY CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start pt-2 lg:pt-6 pb-10">
        {/* Left 7 Columns — Hairline-Divided Editorial Sections */}
        <div className="lg:col-span-7 divide-y divide-[var(--color-border)] min-w-0">
          {/* Overview Section */}
          <section className="py-8 first:pt-0 space-y-3.5">
            <div className="space-y-2">
              <div className="h-7 w-72 max-w-[85%] rounded-[10px] cgr-skeleton-block" />
              <div className="h-4 w-80 max-w-[92%] rounded-[8px] cgr-skeleton-block" />
            </div>

            <div className="flex items-center gap-2.5 pt-0.5">
              <div className="h-4 w-12 rounded-[7px] cgr-skeleton-block" />
              <div className="h-4 w-20 rounded-[7px] cgr-skeleton-block" />
              <div className="h-4 w-32 rounded-[7px] cgr-skeleton-block" />
            </div>

            <div className="space-y-2 pt-1.5">
              <div className="h-4 w-full rounded-[7px] cgr-skeleton-block" />
              <div className="h-4 w-11/12 rounded-[7px] cgr-skeleton-block" />
              <div className="h-4 w-4/5 rounded-[7px] cgr-skeleton-block" />
            </div>

            <div className="h-4 w-60 max-w-[75%] rounded-[7px] cgr-skeleton-block pt-1" />

            {/* Mobile Inline Primary CTA & Contact Pills (< lg) */}
            <div className="lg:hidden pt-3 space-y-2.5">
              <div className="h-11 w-full rounded-[12px] cgr-skeleton-block" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-24 rounded-[10px] cgr-skeleton-block" />
                <div className="h-9 w-20 rounded-[10px] cgr-skeleton-block" />
              </div>
            </div>
          </section>

          {/* Second Section (Promotions / Availability / Highlights) */}
          <section className="py-8 space-y-4">
            <div className="space-y-1.5">
              <div className="h-6 w-52 rounded-[9px] cgr-skeleton-block" />
              <div className="h-3.5 w-64 max-w-[85%] rounded-[7px] cgr-skeleton-block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="h-24 rounded-[12px] cgr-skeleton-block" />
              <div className="h-24 rounded-[12px] cgr-skeleton-block" />
            </div>
          </section>
        </div>

        {/* Right 4 Columns — Floating Sticky Widget Card (Desktop >= lg) */}
        <aside className="hidden lg:block lg:col-span-4 lg:col-start-9">
          <div className="rounded-[16px] border border-black/[0.04] dark:border-white/[0.08] bg-[var(--color-background-card)] shadow-[var(--shadow-booking-widget)] p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-3.5 w-24 rounded-[6px] cgr-skeleton-block" />
              <div className="h-7 w-44 rounded-[9px] cgr-skeleton-block" />
            </div>

            <div className="h-24 w-full rounded-[12px] cgr-skeleton-block" />
            <div className="h-12 w-full rounded-[12px] cgr-skeleton-block" />

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="h-10 rounded-[10px] cgr-skeleton-block" />
              <div className="h-10 rounded-[10px] cgr-skeleton-block" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
