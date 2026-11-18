import React from "react";

/**
 * Instant streaming route skeleton for `/{hotelSlug}/book` checkout.
 */
export default function HotelCheckoutLoading() {
  return (
    <div className="cgr-page-standard space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)]" />
        <div className="h-7 w-56 rounded-[10px] bg-[var(--color-background-muted)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-4">
            <div className="h-6 w-44 rounded-[8px] bg-[var(--color-background-muted)]" />
            <div className="h-14 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
            <div className="h-14 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
          </div>

          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-4">
            <div className="h-6 w-40 rounded-[8px] bg-[var(--color-background-muted)]" />
            <div className="h-11 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
            <div className="h-11 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-4">
            <div className="flex gap-3">
              <div className="h-24 w-24 rounded-[12px] bg-[var(--color-background-muted)] shrink-0" />
              <div className="space-y-2 flex-1 pt-1">
                <div className="h-4 w-40 rounded-[8px] bg-[var(--color-background-muted)]" />
                <div className="h-4 w-28 rounded-[8px] bg-[var(--color-background-muted)]" />
              </div>
            </div>
            <div className="h-24 w-full rounded-[12px] bg-[var(--color-background-muted)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

