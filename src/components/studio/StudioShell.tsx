"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Crown, Globe } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { AirbnbMenuDrawer } from "@/components/navigation/AirbnbMenuDrawer";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { useGlobalAutoHideScrollbars } from "@/components/workspace/WorkspaceSplitLayout";

/**
 * Unified Nondii Clean Minimal Shell (`/studio/*` — Travel-Blue Merchant Studio)
 * - Identical top bar height (`h-14`), width (`max-w-[1160px]`), borders, and typography to `AdminShell`
 */
export function StudioShell({ children }: { children: React.ReactNode }) {
  useGlobalAutoHideScrollbars();
  const { user, refreshMe, signOutUser, lang, setLang, theme, toggleTheme } =
    useHotelApp();
  const { data, notice, reload, switchHotel, buildHref } = useStudio();

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const ownedHotels = user?.ownedHotels ?? [];

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden font-sans text-[var(--color-text-primary)] bg-[var(--color-background-body)]">
      {/* Floating Toast Notification */}
      {notice && (
        <div className="fixed bottom-20 lg:bottom-6 right-5 z-[110] rounded-full bg-[var(--color-accent)] !text-white shadow-[var(--shadow-popover)] px-5 py-2.5 ws-body-strong">
          {notice}
        </div>
      )}

      {/* Left Vertical Hover-Expand Icon Rail (`60px -> 200px`) */}
      <StudioSidebar />

      {/* Unified Clean Top Bar (`h-14` + safe-area top for `viewport-fit=cover`, solid opaque for iOS Safari) */}
      <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] lg:pt-0 bg-[var(--color-background-body)] border-b border-[var(--color-border)] lg:pl-[60px] shrink-0">
        <div className="relative w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 gap-3">
          {/* Left: Horizontal Nondii Logo + Store Switcher */}
          <div className="flex items-center gap-3 min-w-0 z-30">
            <Link
              href="/"
              aria-label="Nondii Home"
              className="flex items-center shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/nondi-icon-with-text-black.svg"
                alt="Nondii"
                className="h-6 sm:h-7 w-auto object-contain shrink-0"
              />
            </Link>

            <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block shrink-0" />

            {ownedHotels.length > 1 ? (
              <div className="w-[155px] sm:w-[210px] min-w-0">
                <ResponsiveSelect
                  value={data.hotel.slug}
                  onChange={switchHotel}
                  sheetTitle="เลือกร้าน / ที่พักที่ต้องการจัดการ"
                  triggerClassName="w-full h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-badge text-[var(--color-text-primary)]"
                  options={ownedHotels.map((item) => ({
                    value: item.slug,
                    label: item.nameTh,
                    sublabel:
                      item.pendingBookingsCount > 0
                        ? `${item.pendingBookingsCount} รอตรวจสลิป`
                        : `/${item.slug}`,
                  }))}
                />
              </div>
            ) : (
              <Link
                href={buildHref("/studio")}
                className="hidden sm:inline-flex items-center h-8 px-3 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] ws-badge max-w-[200px] truncate"
              >
                <span className="truncate">{data.hotel.nameTh}</span>
              </Link>
            )}
          </div>

          {/* Right: Admin Switch + Language + Single Profile Photo Trigger */}
          <div className="flex items-center gap-2.5 shrink-0 z-30">
            {user?.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                title="Admin Center"
                className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold transition-colors"
              >
                <Crown className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Admin Center</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="hidden sm:flex items-center gap-1.5 text-right leading-tight text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer px-1"
              title="เปลี่ยนภาษา"
            >
              <div className="ws-badge font-normal">
                <div className="font-medium text-[var(--color-text-primary)]">
                  {lang === "th" ? "ไทย" : "EN"}
                </div>
                <div className="text-[var(--color-text-secondary)]">THB</div>
              </div>
              <Globe className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(true)}
              aria-label="โปรไฟล์และเมนู"
              aria-expanded={isMenuDrawerOpen}
              aria-haspopup="dialog"
              className={`relative inline-flex h-9 w-9 rounded-full items-center justify-center hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer shrink-0 ${
                isMenuDrawerOpen
                  ? "ring-2 ring-[var(--color-text-primary)]"
                  : ""
              }`}
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-9 w-9"
                iconSizeClass="w-4 h-4"
              />
              {data.stats.pendingBookingsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-body)]" />
              )}
            </button>

            <AirbnbMenuDrawer
              isOpen={isMenuDrawerOpen}
              onClose={() => setIsMenuDrawerOpen(false)}
              variant="studio"
              user={user}
              onRefreshProfile={refreshMe}
              onSignOut={signOutUser}
              language={lang}
              onToggleLanguage={() => setLang(lang === "th" ? "en" : "th")}
              isDarkTheme={theme === "dark"}
              onToggleTheme={toggleTheme}
              studio={{
                hotelName: data.hotel.nameTh,
                hotelSlug: data.hotel.slug,
                ratingAvg: data.hotel.ratingAvg,
                reviewsCount: data.reviews.length,
                pendingBookingsCount: data.stats.pendingBookingsCount,
                reviewsHref: buildHref("/studio/reviews"),
                todayHref: buildHref("/studio"),
                onReload: reload,
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col lg:pl-[60px] relative bg-[var(--color-background-body)] pb-[56px] lg:pb-0 overflow-y-auto cgr-scroll-autohide">
        {children}
      </main>
    </div>
  );
}
