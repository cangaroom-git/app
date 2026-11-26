"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";

/**
 * Nondii Canonical Workspace Primitives Kit
 * Single source of truth for `/admin/*`, `/studio/*`, and `/account`
 * - Locked to `Plus Jakarta Sans` + `Anuphan`, max weight 600 (`font-semibold`), 8px spatial rhythm
 */

export function WorkspacePageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="pb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        {eyebrow && <div className="ws-caption">{eyebrow}</div>}
        <h1 className="ws-display truncate">{title}</h1>
        {subtitle && <p className="ws-caption">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </section>
  );
}

export interface WorkspaceKpiItem {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  urgent?: boolean;
  href: string;
}

export function WorkspaceKpiBand({ items }: { items: WorkspaceKpiItem[] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Link
            key={`${item.label}-${idx}`}
            href={item.href}
            className={`group py-6 transition-colors hover:bg-[var(--color-background-muted)]/45 block ${
              idx === 0 ? "sm:pr-6" : idx === 1 ? "sm:px-6" : "sm:pl-6"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="ws-caption-medium">{item.label}</span>
              <span
                className={`h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 ${
                  item.urgent
                    ? "bg-[var(--color-accent-yellow)] text-[#182334]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-accent)]"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="ws-kpi">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </p>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            {item.sublabel && (
              <p className="ws-caption mt-1 truncate">{item.sublabel}</p>
            )}
          </Link>
        );
      })}
    </section>
  );
}

export function WorkspaceSection({
  title,
  subtitle,
  action,
  bordered = true,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`ws-section space-y-5 ${
        bordered ? "border-b border-[var(--color-border)]" : ""
      }`}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {title && <h2 className="ws-title">{title}</h2>}
            {subtitle && <p className="ws-caption">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function WorkspaceSearchInput({
  value,
  onChange,
  placeholder,
  className = "w-full sm:w-64",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-8 rounded-full bg-[var(--color-background-muted)] focus:bg-[var(--color-background-card)] border border-transparent focus:border-[var(--color-text-primary)] ws-body placeholder:text-[var(--color-text-secondary)] focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="ล้างคำค้นหา"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function WorkspaceStatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "primary" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
      : tone === "warning"
        ? "bg-[var(--color-accent-yellow)] text-[#182334]"
        : tone === "danger"
          ? "bg-red-50 text-red-600"
          : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full ws-badge whitespace-nowrap ${toneClass}`}
    >
      {children}
    </span>
  );
}

/**
 * Canonical Single-Row Compact Toolbar (`/admin/*` & `/studio/*`)
 * - Mobile (`< md`): Strictly ONE single row (`h-9`, zero vertical wrapping!).
 *   - Search collapses into a crisp `h-9 w-9` circular icon button (with active accent dot when query non-empty).
 *   - Tapping the Search icon smoothly expands the search input in-place across the single row with auto-focus + close `×`.
 *   - Filter pills sit in a horizontally scrollable single-line strip (`overflow-x-auto no-scrollbar`).
 *   - Primary/utility action buttons stay pinned cleanly on the right.
 * - Desktop (`>= md`): Inline pill search + filter pills + right-aligned actions on ONE single calm row.
 */
export function WorkspaceCompactToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "ค้นหา...",
  filters,
  actions,
  bordered = true,
  compactPadding = false,
}: {
  searchValue?: string;
  onSearchChange?: (next: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  bordered?: boolean;
  compactPadding?: boolean;
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const hasSearch = typeof onSearchChange === "function";
  const hasQuery = Boolean(searchValue?.trim());

  const wrapperClass = bordered
    ? "cgr-admin-toolbar"
    : `w-full flex items-center justify-between gap-2 shrink-0 ${
        compactPadding ? "py-2" : "pb-4 border-b border-[var(--color-border)]"
      }`;

  return (
    <div className={wrapperClass}>
      {/* ═══ MOBILE SINGLE-ROW COMPACT BAR (< md) ═══ */}
      <div className="flex md:hidden items-center gap-1.5 w-full min-w-0 h-9">
        {mobileSearchOpen && hasSearch ? (
          <div className="flex items-center gap-1.5 w-full min-w-0 animate-fade-in">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-8 rounded-full bg-[var(--color-background-muted)] focus:bg-[var(--color-background-card)] border border-[var(--color-text-primary)] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none transition-colors"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="h-9 px-3 rounded-full bg-[var(--color-background-muted)] ws-caption-medium !text-[var(--color-text-primary)] shrink-0 cursor-pointer"
            >
              ปิด
            </button>
          </div>
        ) : (
          <>
            {hasSearch && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label={searchPlaceholder}
                title={searchPlaceholder}
                className={`relative h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                  hasQuery
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                <Search className="w-4 h-4" />
                {hasQuery && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-white" />
                )}
              </button>
            )}

            {filters && (
              <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar py-0.5">
                {filters}
              </div>
            )}

            {!filters && <div className="flex-1 min-w-0" />}

            {actions && (
              <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
            )}
          </>
        )}
      </div>

      {/* ═══ DESKTOP SINGLE-ROW BAR (>= md) ═══ */}
      <div className="hidden md:flex items-center justify-between gap-3 w-full min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {hasSearch && (
            <div className="relative w-56 lg:w-64 shrink-0">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-8 rounded-full bg-[var(--color-background-muted)] focus:bg-[var(--color-background-card)] border border-transparent focus:border-[var(--color-text-primary)] ws-body placeholder:text-[var(--color-text-secondary)] focus:outline-none transition-colors"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {filters && (
            <div className="flex items-center gap-1.5 shrink-0">{filters}</div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
