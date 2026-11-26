"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Home,
  Layers,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Store,
  Sun,
  TicketPercent,
  X,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { AdminSidebarCounts } from "@/lib/services/adminDashboardService";

interface AdminNavItem {
  labelTh: string;
  href: string;
  icon: typeof LayoutDashboard;
  badgeCount?: number;
  exact?: boolean;
}

interface AdminSidebarProps {
  counts: AdminSidebarCounts;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  counts,
  collapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname() || "/admin";
  const { theme, toggleTheme } = useHotelApp();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const { shouldRender: renderMore, dataState: moreState } = useModalPresence(
    isMobileMoreOpen,
    240
  );
  useBodyScrollLock(renderMore);

  const primaryItems: AdminNavItem[] = [
    {
      labelTh: "ภาพรวม",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      labelTh: "โปรโมชั่น & AI",
      href: "/admin/promos",
      icon: TicketPercent,
      badgeCount: counts.pendingInboxCount,
    },
    {
      labelTh: "สถานที่ & แบรนด์",
      href: "/admin/places",
      icon: Store,
      badgeCount: counts.pendingPlacesCount,
    },
    {
      labelTh: "หมวดหมู่โปร",
      href: "/admin/categories",
      icon: Layers,
    },
  ];

  const secondaryItems: AdminNavItem[] = [
    {
      labelTh: "โฆษณา & ดีลเด่น",
      href: "/admin/campaigns",
      icon: Flame,
    },
    {
      labelTh: "จังหวัด & ภาค (77)",
      href: "/admin/locations",
      icon: MapPin,
    },
    {
      labelTh: "ตั้งค่าระบบ",
      href: "/admin/systems",
      icon: SlidersHorizontal,
    },
  ];

  const isActive = (item: AdminNavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const desktopItems: AdminNavItem[] = [
    { labelTh: "หน้าเว็บ Nondii", href: "/", icon: Home, exact: true },
    ...primaryItems,
    ...secondaryItems,
  ];

  return (
    <>
      {/* Desktop Docked Non-Overlapping Sidebar (200px expanded <-> 56px collapsed) */}
      <aside
        aria-label="Admin Navigation"
        className={`hidden lg:flex shrink-0 h-full bg-[var(--color-background-body)] border-r border-[var(--color-border)] flex-col select-none transition-[width] duration-200 ease-[var(--ease-out-expo)] ${
          collapsed ? "w-[56px]" : "w-[200px]"
        }`}
      >
        {/* Top Brand Strip (matches 46px topbar) */}
        <div
          className={`h-[46px] shrink-0 border-b border-[var(--color-border)] flex items-center ${
            collapsed ? "justify-center px-1.5" : "justify-between px-3"
          }`}
        >
          <Link
            href="/admin"
            className="flex items-center gap-2 min-w-0 text-[var(--color-text-primary)]"
          >
            <img
              src="/brand/nondii-icon-square-black.svg"
              alt="Nondii"
              className="w-5 h-5 shrink-0 dark:invert"
            />
            {!collapsed && (
              <span className="text-[14px] font-bold tracking-[-0.02em] truncate">
                Nondii Admin
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="ย่อเมนูซ้าย"
              aria-label="ย่อเมนูซ้าย"
              className="h-7 w-7 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Compact Nav List */}
        <nav className="flex-1 flex flex-col gap-0.5 p-1.5 overflow-y-auto no-scrollbar">
          {desktopItems.map((item, idx) => {
            const active = isActive(item);
            const Icon = item.icon;
            const showDivider = idx === 1 || idx === 5;
            return (
              <React.Fragment key={item.href}>
                {showDivider && (
                  <div className="my-1 mx-2 h-px bg-[var(--color-border)]" />
                )}
                <Link
                  href={item.href}
                  title={collapsed ? item.labelTh : undefined}
                  className={`relative flex items-center h-9 rounded-full transition-colors duration-150 ${
                    collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
                  } ${
                    active
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)] font-medium"
                  }`}
                >
                  <span className="relative inline-flex items-center justify-center shrink-0">
                    <Icon
                      className="w-[16px] h-[16px]"
                      strokeWidth={active ? 2.2 : 1.85}
                    />
                    {collapsed && item.badgeCount && item.badgeCount > 0 ? (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-[#e60023] text-white text-[9px] font-bold inline-flex items-center justify-center leading-none tabular-nums">
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </span>
                    ) : null}
                  </span>

                  {!collapsed && (
                    <>
                      <span className="text-[13px] truncate flex-1">
                        {item.labelTh}
                      </span>
                      {item.badgeCount && item.badgeCount > 0 ? (
                        <span
                          className={`min-w-[18px] h-[18px] px-1.5 rounded-full text-[10.5px] font-bold inline-flex items-center justify-center leading-none tabular-nums ${
                            active
                              ? "bg-white/25 text-white"
                              : "bg-[#e60023] text-white"
                          }`}
                        >
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Controls */}
        <div className="p-1.5 border-t border-[var(--color-border)] flex flex-col gap-0.5">
          {collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="ขยายเมนูซ้าย"
              aria-label="ขยายเมนูซ้าย"
              className="h-9 w-full rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
            className={`h-9 w-full rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)] inline-flex items-center cursor-pointer transition-colors ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
            }`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            {!collapsed && (
              <span className="text-[12.5px] font-medium truncate">
                {theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Docked 5-Tab Admin Bottom Bar */}
      <nav
        aria-label="Mobile Admin Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-background-body)]/96 backdrop-blur-md border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-5 h-[54px] px-1">
          {primaryItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors ${
                  active
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon
                    className="w-[19px] h-[19px]"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#e60023] text-white text-[9px] font-bold inline-flex items-center justify-center leading-none">
                      {item.badgeCount > 9 ? "9+" : item.badgeCount}
                    </span>
                  ) : null}
                </span>
                <span className="truncate max-w-full px-0.5">
                  {item.labelTh.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-[var(--color-text-secondary)] cursor-pointer"
          >
            <Menu className="w-[19px] h-[19px]" strokeWidth={1.85} />
            <span>เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Up Bottom Sheet for Secondary Admin Routes */}
      {renderMore && (
        <div
          data-state={moreState}
          onClick={() => setIsMobileMoreOpen(false)}
          className="cgr-modal-backdrop fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] flex items-end justify-center lg:hidden"
        >
          <div
            data-state={moreState}
            onClick={(e) => e.stopPropagation()}
            className="cgr-modal-surface-md w-full rounded-t-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
                เมนูจัดการระบบ
              </p>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                aria-label="ปิด"
                className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {[
                ...secondaryItems,
                { labelTh: "กลับหน้าเว็บ Nondii", href: "/", icon: Home, exact: true },
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
                        : "font-medium text-[var(--color-text-primary)]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.labelTh}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsMobileMoreOpen(false);
                }}
                className="w-full py-3 flex items-center gap-3 text-[14px] font-medium text-[var(--color-text-primary)] cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span>
                  {theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
