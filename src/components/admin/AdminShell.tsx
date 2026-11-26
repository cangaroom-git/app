"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Sparkles } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import type { AdminSidebarCounts } from "@/lib/services/adminDashboardService";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  counts: AdminSidebarCounts;
  children: React.ReactNode;
}

export function AdminShell({
  adminName,
  adminEmail,
  counts,
  children,
}: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const initial = (adminName || adminEmail || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
      {/* Flex-Docked Left Sidebar (never overlaps table content) */}
      <AdminSidebar
        counts={counts}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Right Main Column */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Ultra-Compact 46px Top Header */}
        <header className="h-[46px] shrink-0 border-b border-[var(--color-border)] bg-[var(--color-background-body)] px-4 flex items-center justify-between gap-3 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/admin" className="lg:hidden inline-flex items-center shrink-0">
              <img
                src="/brand/nondii-icon-square-black.svg"
                alt="Nondii"
                className="w-5 h-5 dark:invert"
              />
            </Link>
            <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)] whitespace-nowrap">
              Admin Center
            </span>
            <span
              aria-hidden="true"
              className="hidden sm:inline-block w-px h-3.5 bg-[var(--color-border)]"
            />
            <span className="hidden sm:inline text-[12.5px] text-[var(--color-text-secondary)] truncate">
              {adminName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/admin/promos?drop=1"
              className="h-7.5 px-3 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">โยนโปรให้ AI แกะ</span>
              <span className="sm:hidden">AI โปร</span>
            </Link>

            <Link
              href="/studio"
              className="hidden md:inline-flex h-7.5 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Studio</span>
            </Link>

            <div
              title={adminEmail}
              className="h-7 w-7 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[11.5px] font-bold inline-flex items-center justify-center shrink-0"
            >
              {initial}
            </div>
          </div>
        </header>

        {/* Full-Bleed Independent Workspace */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col pb-[54px] lg:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
