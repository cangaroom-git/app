"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  Menu,
  SlidersHorizontal,
  Star,
  Store,
  TicketPercent,
  X,
} from "lucide-react";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useStudio } from "@/components/studio/StudioContext";

interface StudioNavItem {
  label: string;
  labelTh: string;
  href: string;
  matchPrefix: string;
  icon: typeof LayoutDashboard;
  badgeCount?: number;
  exact?: boolean;
}

/**
 * WeGlobal-Style Merchant Studio Left Hover-Expand Sidebar (`60px -> 200px`)
 * - Adapts automatically between `DIRECT_BOOKING` (Stay 0% GP) and `PROFILE_ONLY` (Cafe / Dining / Brand)
 * - Active state: Travel-Blue `var(--color-accent)` pill; Urgent badges: Contrast Yellow `#FEF211`
 * - Mobile `< lg`: Clean 5-icon docked bottom bar + slide-up "More" sheet
 */
export function StudioSidebar() {
  const pathname = usePathname() || "/studio";
  const { data, buildHref } = useStudio();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const { shouldRender: renderMore, dataState: moreState } = useModalPresence(
    isMobileMoreOpen,
    240,
  );
  useBodyScrollLock(renderMore);

  const isDirectBooking = data.hotel.merchantMode !== "PROFILE_ONLY";

  const primaryItems: StudioNavItem[] = isDirectBooking
    ? [
        {
          label: "Overview",
          labelTh: "ภาพรวม",
          href: buildHref("/studio"),
          matchPrefix: "/studio",
          icon: LayoutDashboard,
          badgeCount: data.stats.pendingBookingsCount,
          exact: true,
        },
        {
          label: "Promotions",
          labelTh: "โปรโมชั่น",
          href: buildHref("/studio/promos"),
          matchPrefix: "/studio/promos",
          icon: TicketPercent,
          badgeCount: data.stats.pendingSyncPinsCount,
        },
        {
          label: "Calendar",
          labelTh: "ปฏิทิน",
          href: buildHref("/studio/calendar"),
          matchPrefix: "/studio/calendar",
          icon: Calendar,
        },
        {
          label: "Rooms",
          labelTh: "ห้องพัก",
          href: buildHref("/studio/listings"),
          matchPrefix: "/studio/listings",
          icon: BedDouble,
        },
      ]
    : [
        {
          label: "Overview",
          labelTh: "ภาพรวม",
          href: buildHref("/studio"),
          matchPrefix: "/studio",
          icon: LayoutDashboard,
          exact: true,
        },
        {
          label: "Promotions",
          labelTh: "โปรโมชั่น",
          href: buildHref("/studio/promos"),
          matchPrefix: "/studio/promos",
          icon: TicketPercent,
          badgeCount: data.stats.pendingSyncPinsCount,
        },
        {
          label: "Posts",
          labelTh: "โพสต์",
          href: buildHref("/studio/listings/content"),
          matchPrefix: "/studio/listings/content",
          icon: FileText,
        },
        {
          label: "Place Info",
          labelTh: "ข้อมูลร้าน",
          href: buildHref("/studio/listings"),
          matchPrefix: "/studio/listings/about",
          icon: Store,
        },
      ];

  const secondaryItems: StudioNavItem[] = [
    {
      label: "Reviews",
      labelTh: "รีวิว",
      href: buildHref("/studio/reviews"),
      matchPrefix: "/studio/reviews",
      icon: Star,
    },
    {
      label: "Settings",
      labelTh: "ตั้งค่าร้าน",
      href: buildHref("/studio/settings"),
      matchPrefix: "/studio/settings",
      icon: SlidersHorizontal,
    },
  ];

  const desktopItems: StudioNavItem[] = [
    {
      label: "Home",
      labelTh: "หน้าเว็บ",
      href: "/",
      matchPrefix: "/",
      icon: Home,
      exact: true,
    },
    ...primaryItems,
    ...secondaryItems,
  ];

  const isActive = (item: StudioNavItem) => {
    if (item.exact) {
      return pathname === item.matchPrefix;
    }
    if (item.matchPrefix === "/studio/listings/about") {
      return (
        pathname === "/studio/listings" ||
        pathname.startsWith("/studio/listings/about") ||
        pathname.startsWith("/studio/listings/location")
      );
    }
    return (
      pathname === item.matchPrefix ||
      pathname.startsWith(`${item.matchPrefix}/`)
    );
  };

  return (
    <>
      {/* ═══ DESKTOP: Left Hover-Expand Icon Rail (60px -> 200px, Identical to AdminSidebar) ═══ */}
      <nav
        aria-label="Merchant Studio Navigation"
        className="group/sidebar hidden lg:flex fixed top-0 left-0 bottom-0 z-[45] w-[60px] hover:w-[200px] bg-[var(--color-background-body)] border-r border-[var(--color-border)] flex-col py-3.5 px-2 gap-1 transition-all duration-300 ease-in-out overflow-hidden select-none"
      >
        <div className="flex flex-col gap-1 flex-1">
          {desktopItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const isHome = item.matchPrefix === "/";

            return (
              <Link
                key={item.matchPrefix}
                href={item.href}
                className={`group/item relative flex items-center gap-3 w-full h-11 px-1.5 rounded-full transition-colors duration-200 ${
                  active
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                  <Icon
                    className="w-[20px] h-[20px]"
                    strokeWidth={active || isHome ? 2.2 : 1.8}
                  />
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[var(--color-accent-yellow)] px-0.5 text-[12px] leading-none font-semibold text-[#182334]">
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </span>
                  ) : null}
                </div>

                <span
                  className={`text-[14px] truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 ${
                    active || isHome ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.labelTh}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ═══ MOBILE: Docked 5-Icon Bottom Bar ═══ */}
      <nav
        aria-label="Mobile Studio Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-background-body)] border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-5 h-[56px] px-1">
          {primaryItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const isListingsRoot =
              item.matchPrefix === "/studio/listings" ||
              item.matchPrefix === "/studio/listings/about";
            return (
              <Link
                key={item.matchPrefix}
                href={item.href}
                onClick={() => {
                  if (isListingsRoot && typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("cgr:studio-listings-reset"),
                    );
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-gray-500"
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon
                    className="w-[19px] h-[19px]"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] text-[12px] font-semibold inline-flex items-center justify-center leading-none">
                      {item.badgeCount > 9 ? "9+" : item.badgeCount}
                    </span>
                  ) : null}
                </span>
                <span className="truncate max-w-full px-0.5">
                  {item.labelTh}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[12px] font-medium text-gray-500 cursor-pointer"
          >
            <Menu className="w-[19px] h-[19px]" strokeWidth={1.85} />
            <span>เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {/* ═══ MOBILE: Slide-Up More Sheet ═══ */}
      {renderMore && (
        <div
          data-state={moreState}
          onClick={() => setIsMobileMoreOpen(false)}
          className="cgr-modal-backdrop fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] flex items-end justify-center lg:hidden"
        >
          <div
            data-state={moreState}
            onClick={(e) => e.stopPropagation()}
            className="cgr-modal-surface-md w-full rounded-t-[24px] bg-white shadow-[var(--shadow-popover)] px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <p className="ws-subtitle truncate">{data.hotel.nameTh}</p>
                <p className="ws-caption truncate">/{data.hotel.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                aria-label="ปิด"
                className="h-8 w-8 rounded-full bg-gray-100 inline-flex items-center justify-center text-gray-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                ...secondaryItems,
                {
                  label: "Storefront",
                  labelTh: `ดูหน้าร้าน /${data.hotel.slug}`,
                  href: `/${data.hotel.slug}`,
                  matchPrefix: `/${data.hotel.slug}`,
                  icon: Store,
                },
                {
                  label: "Home",
                  labelTh: "กลับโหมดนักเดินทาง",
                  href: "/",
                  matchPrefix: "/",
                  icon: Home,
                  exact: true,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMoreOpen(false)}
                    className={`py-3 flex items-center gap-3 text-[14px] ${
                      active
                        ? "font-semibold text-[var(--color-accent)]"
                        : "font-medium text-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.labelTh}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
