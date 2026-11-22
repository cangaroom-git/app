"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  Calendar,
  CalendarCheck,
  ExternalLink,
  Menu,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { AirbnbMenuDrawer } from "@/components/navigation/AirbnbMenuDrawer";
import {
  StudioProvider,
  useStudio,
} from "@/components/studio/StudioContext";

function StudioShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/studio";
  const { user, refreshMe, signOutUser, lang, setLang, theme, toggleTheme } =
    useHotelApp();
  const { data, notice, reload, switchHotel, buildHref } = useStudio();

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  const ownedHotels = user?.ownedHotels ?? [];
  const isTodayActive = pathname === "/studio" || pathname === "/studio/today";
  const isCalendarActive = pathname.startsWith("/studio/calendar");
  const isListingsActive = pathname.startsWith("/studio/listings");
  const isMenuOrReviewsActive =
    pathname.startsWith("/studio/menu") || pathname.startsWith("/studio/reviews");

  const primaryTabs = [
    {
      id: "today",
      label: "วันนี้",
      href: buildHref("/studio"),
      active: isTodayActive,
      badge: data.stats.pendingBookingsCount,
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      id: "calendar",
      label: "ปฏิทิน",
      href: buildHref("/studio/calendar"),
      active: isCalendarActive,
      badge: 0,
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: "listings",
      label: "ที่พัก",
      href: buildHref("/studio/listings"),
      active: isListingsActive,
      badge: 0,
      icon: <BedDouble className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-body)] flex flex-col">
      {/* Floating Toast Notification */}
      {notice && (
        <div className="fixed bottom-24 lg:bottom-6 right-5 z-[100] rounded-[12px] bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] shadow-[var(--shadow-popover)] px-4 py-2.5 text-[13.5px] font-semibold">
          {notice}
        </div>
      )}

      {/* =====================================================================
          FULL-BLEED AIRBNB HOSTING TOP BAR (3 Clean Centered Tabs)
      ====================================================================== */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-8 lg:px-10">
        <div className="h-full max-w-[1360px] mx-auto w-full grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left: Minimal Brand Mark + Soft Property Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={buildHref("/studio")}
              className="inline-flex items-center gap-2 text-[var(--color-text-primary)] shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Nondii Studio"
            >
              <img
                src="/brand/nondii-icon-square-black.svg"
                alt="Nondii"
                className="w-[34px] h-[34px] object-contain dark:invert"
              />
            </Link>

            {ownedHotels.length > 1 ? (
              <div className="w-[175px] sm:w-[220px]">
                <ResponsiveSelect
                  value={data.hotel.slug}
                  onChange={switchHotel}
                  sheetTitle="เลือกที่พักที่ต้องการจัดการ"
                  triggerClassName="w-full h-9 px-3 rounded-[10px] bg-transparent hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)]"
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
              <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                {data.hotel.nameTh}
              </p>
            )}
          </div>

          {/* Center: Clean 3 Airbnb-style Underline Tabs (วันนี้ · ปฏิทิน · ที่พัก) */}
          <nav
            aria-label="เมนูหลักหลังบ้าน"
            className="hidden lg:flex items-center justify-center gap-9 h-full"
          >
            {primaryTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`h-full border-b-2 px-1 inline-flex items-center gap-1.5 text-[15px] transition-colors relative ${
                  tab.active
                    ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-semibold"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-promo)] shrink-0" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right: Calm "Switch to traveling" + Avatar + Clean Menu */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <Link
              href="/"
              className="hidden md:inline-flex h-10 px-3.5 rounded-[12px] hover:bg-[var(--color-background-muted)] text-[14px] font-medium text-[var(--color-text-primary)] items-center transition-colors whitespace-nowrap"
            >
              โหมดนักเดินทาง
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(true)}
              aria-label={lang === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
              className="hidden sm:inline-flex h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] items-center justify-center shrink-0 cursor-pointer transition-colors relative"
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-9 w-9"
                iconSizeClass="w-4 h-4"
              />
            </button>

            {/* Desktop Airbnb Slide-Over Menu Trigger */}
            <button
              type="button"
              onClick={() => setIsMenuDrawerOpen(true)}
              aria-label={lang === "th" ? "เมนูเพิ่มเติม" : "Open menu"}
              aria-expanded={isMenuDrawerOpen}
              aria-haspopup="dialog"
              className="hidden lg:inline-flex h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] items-center justify-center cursor-pointer transition-colors relative"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
              {data.stats.pendingBookingsCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
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

            {/* Mobile quick link to storefront */}
            <Link
              href={`/${data.hotel.slug}`}
              className="lg:hidden h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] text-[13px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1"
            >
              <span>หน้าร้าน</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Route Outlet */}
      <div className="flex-1 w-full flex flex-col pt-16 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>

      {/* =====================================================================
          MOBILE 4-TAB OWNER BOTTOM NAVIGATION (< lg)
      ====================================================================== */}
      <nav
        aria-label="เมนูหลังบ้านมือถือ"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-background-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-[520px] mx-auto grid grid-cols-4 gap-1">
          {primaryTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`py-1.5 rounded-[12px] flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                tab.active
                  ? "text-[var(--color-text-primary)] font-semibold bg-[var(--color-background-muted)]"
                  : "text-[var(--color-text-secondary)] font-medium"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.badge > 0 && (
                  <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
                )}
              </span>
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </Link>
          ))}

          <Link
            href={buildHref("/studio/menu")}
            className={`py-1.5 rounded-[12px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isMenuOrReviewsActive
                ? "text-[var(--color-text-primary)] font-semibold bg-[var(--color-background-muted)]"
                : "text-[var(--color-text-secondary)] font-medium"
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] leading-tight">เมนู</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioProvider>
      <StudioShellFrame>{children}</StudioShellFrame>
    </StudioProvider>
  );
}
