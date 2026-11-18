import React from "react";

/**
 * Instant streaming route skeleton for `/{hotelSlug}` so mobile/desktop taps
 * transition immediately while Neon DB data resolves.
 */
export default function HotelStorefrontLoading() {
  return (
    <div className="cgr-page-standard space-y-6 animate-pulse">
      {/* Mobile 1:1 square hero skeleton (< sm) */}
      <div className="sm:hidden -mx-4 -mt-5 aspect-square bg-[var(--color-background-muted)]" />

      {/* Title row skeleton (sm+) */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        <div className="h-8 w-64 rounded-[10px] bg-[var(--color-background-muted)]" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-[10px] bg-[var(--color-background-muted)]" />
          <div className="h-9 w-24 rounded-[10px] bg-[var(--color-background-muted)]" />
        </div>
      </div>

      {/* Airbnb 1:1 Square 5-photo mosaic skeleton (sm+) */}
      <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 aspect-[2/1] w-full rounded-[12px] lg:rounded-[16px] overflow-hidden">
        <div className="col-span-2 row-span-2 bg-[var(--color-background-muted)]" />
        <div className="bg-[var(--color-background-muted)]" />
        <div className="bg-[var(--color-background-muted)]" />
        <div className="bg-[var(--color-background-muted)]" />
        <div className="bg-[var(--color-background-muted)]" />
      </div>

      {/* Main 7 + 1 + 4 overview + sticky booking widget skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3 pb-6 border-b border-[var(--color-border)]">
            <div className="h-7 w-72 rounded-[10px] bg-[var(--color-background-muted)]" />
            <div className="h-4 w-52 rounded-[8px] bg-[var(--color-background-muted)]" />
          </div>

          <div className="flex items-center gap-3 pb-6 border-b border-[var(--color-border)]">
            <div className="h-12 w-12 rounded-full bg-[var(--color-background-muted)] shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 rounded-[8px] bg-[var(--color-background-muted)]" />
              <div className="h-3.5 w-36 rounded-[8px] bg-[var(--color-background-muted)]" />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="h-4 w-full rounded-[8px] bg-[var(--color-background-muted)]" />
            <div className="h-4 w-11/12 rounded-[8px] bg-[var(--color-background-muted)]" />
            <div className="h-4 w-3/4 rounded-[8px] bg-[var(--color-background-muted)]" />
          </div>
        </div>

        <div className="lg:col-span-4 lg:col-start-9">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-4">
            <div className="h-7 w-36 rounded-[10px] bg-[var(--color-background-muted)]" />
            <div className="h-24 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
            <div className="h-12 w-full rounded-[14px] bg-[var(--color-background-muted)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

