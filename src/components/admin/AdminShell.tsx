"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  SuperAdminAvatarCircle,
  UserAvatarCircle,
} from "@/components/navigation/UserProfileDropdown";
import { AirbnbMenuDrawer } from "@/components/navigation/AirbnbMenuDrawer";
import { useGlobalAutoHideScrollbars } from "@/components/workspace/WorkspaceSplitLayout";
import type { AdminSidebarCounts } from "@/lib/services/adminDashboardService";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  counts: AdminSidebarCounts;
  children: React.ReactNode;
}

/**
 * Unified Nondii Clean Minimal Shell (`/admin` — Admin Crimson Red Theme)
 * - Scopes `--color-accent` to Admin Crimson Red (`#dc2626`) across all `/admin/*` UI and portals
 *   so Super Admins can distinguish Admin Center from Merchant Studio (Travel-Blue) at a glance
 * - Identical top bar height (`h-14`), width (`max-w-[1160px]`), borders, and typography to `StudioShell`
 */
export function AdminShell({
  adminName,
  adminEmail,
  counts,
  children,
}: AdminShellProps) {
  useGlobalAutoHideScrollbars();
  const { user, refreshMe, signOutUser, lang, setLang, theme, toggleTheme } =
    useHotelApp();
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  // Scope document-level Admin Red tokens so portaled modals, sheets, and dropdowns inherit Red
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.workspaceTheme = "admin";
    return () => {
      delete document.documentElement.dataset.workspaceTheme;
    };
  }, []);

  return (
    <div className="cgr-admin-theme flex flex-col h-[100dvh] overflow-hidden font-sans text-[var(--color-text-primary)] bg-[var(--color-background-body)]">
      {/* Left Vertical Hover-Expand Icon Rail (`60px -> 200px`) */}
      <AdminSidebar counts={counts} />

      {/* Unified Clean Top Bar (`h-14`, matches StudioShell 1:1) */}
      <header className="sticky top-0 z-40 bg-[var(--color-background-body)]/90 backdrop-blur-md border-b border-[var(--color-border)] lg:pl-[60px] shrink-0">
        <div className="relative w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 gap-3">
          {/* Left: Horizontal Nondii Logo + Admin Center Red Pill */}
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

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-badge"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
              <span>Admin Center</span>
            </Link>
          </div>

          {/* Right: Studio Switch + Language + Single Profile Photo Trigger */}
          <div className="flex items-center gap-2.5 shrink-0 z-30">
            <Link
              href="/studio"
              className="hidden xl:inline-flex items-center h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] transition-colors"
            >
              Merchant Studio
            </Link>

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
              {user ? (
                <UserAvatarCircle
                  user={user}
                  sizeClass="h-9 w-9"
                  iconSizeClass="w-4 h-4"
                />
              ) : (
                <SuperAdminAvatarCircle sizeClass="h-9 w-9" />
              )}
            </button>

            <AirbnbMenuDrawer
              isOpen={isMenuDrawerOpen}
              onClose={() => setIsMenuDrawerOpen(false)}
              variant="admin"
              user={user}
              adminFallback={{ name: adminName, email: adminEmail }}
              onRefreshProfile={refreshMe}
              onSignOut={signOutUser}
              language={lang}
              onToggleLanguage={() => setLang(lang === "th" ? "en" : "th")}
              isDarkTheme={theme === "dark"}
              onToggleTheme={toggleTheme}
            />
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col lg:pl-[60px] relative bg-[var(--color-background-body)] pb-[56px] lg:pb-0">
        {children}
      </main>
    </div>
  );
}
