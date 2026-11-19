"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  Calendar,
  CalendarCheck,
  Crown,
  ExternalLink,
  Globe,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Star,
  Sun,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  StudioProvider,
  useStudio,
} from "@/components/studio/StudioContext";

function StudioShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/studio";
  const { user, lang, setLang, theme, toggleTheme } = useHotelApp();
  const { data, notice, reload, switchHotel, buildHref } = useStudio();

  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDesktopMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(e.target as Node)
      ) {
        setIsDesktopMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDesktopMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isDesktopMenuOpen]);

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
      <header className="sticky top-0 z-40 h-[68px] lg:h-[78px] bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-8 lg:px-10">
        <div className="h-full max-w-[1360px] mx-auto w-full grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left: Minimal Brand Mark + Soft Property Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={buildHref("/studio")}
              className="inline-flex items-center gap-2 text-[var(--color-text-primary)] shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Cangaroom Studio"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[26px] h-[26px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.05"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="5.5" />
                <path d="M8 15.5 12 8.5l4 7" />
                <circle cx="16.5" cy="7.5" r="1.15" fill="currentColor" stroke="none" />
              </svg>
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

            <span
              aria-hidden="true"
              className="hidden sm:inline-flex h-9 w-9 rounded-full bg-[var(--color-background-muted)] text-[13.5px] font-semibold text-[var(--color-text-primary)] items-center justify-center shrink-0"
            >
              {(user?.name || user?.email || "H").slice(0, 1).toUpperCase()}
            </span>

            {/* Desktop Secondary Menu Popover */}
            <div ref={desktopMenuRef} className="hidden lg:block relative">
              <button
                type="button"
                onClick={() => setIsDesktopMenuOpen((v) => !v)}
                aria-label="เมนูเพิ่มเติม"
                className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>

              {isDesktopMenuOpen && (
                <div className="absolute right-0 top-11 w-[264px] rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-2 space-y-0.5 z-50">
                  <Link
                    href={`/${data.hotel.slug}`}
                    onClick={() => setIsDesktopMenuOpen(false)}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] font-medium"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4" />
                      <span>ดูหน้าร้านจริง</span>
                    </span>
                    <span className="text-[11.5px] text-[var(--color-text-secondary)]">
                      /{data.hotel.slug}
                    </span>
                  </Link>

                  <Link
                    href={buildHref("/studio/reviews")}
                    onClick={() => setIsDesktopMenuOpen(false)}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] font-medium"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Star className="w-4 h-4" />
                      <span>รีวิวผู้เข้าพัก ({data.reviews.length})</span>
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      ★ {data.hotel.ratingAvg.toFixed(1)}
                    </span>
                  </Link>

                  <Link
                    href="/register-hotel"
                    onClick={() => setIsDesktopMenuOpen(false)}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มที่พักแห่งใหม่</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDesktopMenuOpen(false);
                      void reload();
                    }}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>รีเฟรชข้อมูลล่าสุด</span>
                  </button>

                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsDesktopMenuOpen(false)}
                      className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] font-medium"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Super Admin Console</span>
                    </Link>
                  )}

                  <div className="my-1 border-t border-[var(--color-border)]" />

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {theme === "dark" ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                      <span>โหมดสี</span>
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      {theme === "dark" ? "มืด" : "สว่าง"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLang(lang === "th" ? "en" : "th")}
                    className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Globe className="w-4 h-4" />
                      <span>ภาษา</span>
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      {lang.toUpperCase()}
                    </span>
                  </button>
                </div>
              )}
            </div>

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
      <div className="flex-1 w-full flex flex-col pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
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
