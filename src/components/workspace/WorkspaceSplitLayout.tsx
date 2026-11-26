"use client";

import React, { useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

let autoHideListenerMountCount = 0;
let autoHideCleanup: (() => void) | null = null;

/**
 * Ref-counted passive scroll observer scoped strictly to workspace shells
 * (`AdminShell`, `StudioShell`, `WorkspaceSplitLayout`) so consumer pages
 * (`/`, `/explore`, `/trip`, `/{hotelSlug}`) carry zero global scroll listeners.
 */
export function useGlobalAutoHideScrollbars() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    autoHideListenerMountCount += 1;

    if (autoHideListenerMountCount === 1) {
      const timers = new WeakMap<HTMLElement, number>();

      const onScrollCapture = (event: Event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (
          !target.classList.contains("cgr-scroll-autohide") &&
          !target.classList.contains("cgr-admin-body")
        ) {
          return;
        }

        target.dataset.scrolling = "true";
        const prev = timers.get(target);
        if (prev) window.clearTimeout(prev);
        const next = window.setTimeout(() => {
          delete target.dataset.scrolling;
          timers.delete(target);
        }, 650);
        timers.set(target, next);
      };

      document.addEventListener("scroll", onScrollCapture, {
        capture: true,
        passive: true,
      });

      autoHideCleanup = () => {
        document.removeEventListener("scroll", onScrollCapture, true);
      };
    }

    return () => {
      autoHideListenerMountCount = Math.max(0, autoHideListenerMountCount - 1);
      if (autoHideListenerMountCount === 0 && autoHideCleanup) {
        autoHideCleanup();
        autoHideCleanup = null;
      }
    };
  }, []);
}

export interface WorkspaceSplitNavItem {
  id: string;
  label: string;
  description?: string;
  badge?: React.ReactNode;
  icon?: React.ComponentType<{
    className?: string;
    size?: number;
    strokeWidth?: number;
  }>;
}

export interface WorkspaceSplitNavGroup {
  title?: string;
  items: WorkspaceSplitNavItem[];
}

interface WorkspaceSplitLayoutProps {
  /** Main H1 title shown at top of left sidebar (Desktop) and root menu (Mobile) */
  title: React.ReactNode;
  /** Subtitle beneath the main H1 title */
  subtitle?: React.ReactNode;
  /** Optional header element placed below title/subtitle inside left nav (e.g. avatar or scope pills) */
  sidebarHeaderExtra?: React.ReactNode;
  /** Optional footer element at the bottom of the left nav */
  sidebarFooter?: React.ReactNode;
  /** Flat or grouped navigation items (ignored if customSidebarList is supplied) */
  navGroups?: WorkspaceSplitNavGroup[];
  /** Custom sidebar list renderer (for sortable DnD lists like /admin/locations) */
  customDesktopSidebarList?: React.ReactNode;
  customMobileSidebarList?: React.ReactNode;
  /** Currently active section/item id */
  activeId: string;
  /** Called when user taps a nav item */
  onSelect?: (id: string) => void;
  /** Mobile view state: "list" shows the menu, "detail" slides in the active pane from the right */
  mobileView: "list" | "detail";
  /** Called when user taps the mobile "< Back" button inside the detail pane */
  onMobileBack: () => void;
  /** Optional back/exit handler on the root screen (e.g. standalone /account, /bookings pages) */
  onRootBack?: () => void;
  /** Aria label for the optional root back button */
  rootBackLabel?: string;
  /** Optional override for the mobile back button label (defaults to `title`) */
  mobileBackLabel?: React.ReactNode;
  /** Active detail title shown next to the back button on mobile */
  mobileDetailTitle?: React.ReactNode;
  /** Right-side content width mode on desktop: "narrow" (680px settings), "wide" (820px editors), "full" (tables/lists) */
  contentWidth?: "narrow" | "wide" | "full";
  /** If true, right pane on desktop uses flex-col overflow-hidden (ideal for internal sticky tables/lists) */
  fullHeightRightPane?: boolean;
  /** Optional top notice banner rendered above the split columns */
  topBanner?: React.ReactNode;
  /** Main detail content for the active section */
  children: React.ReactNode;
}

/**
 * Canonical Nondii 2-Column Split Layout
 * Single source of truth for:
 * - `/admin/systems`
 * - `/admin/locations`
 * - `/studio/settings`
 * - `/studio/listings/*`
 * - `/account`
 *
 * Features:
 * 1. Identical `max-w-[1160px]` Desktop 2-column geometry (`w-[260px]` left borderless nav + right content)
 * 2. Auto-hide scrollbars (`.cgr-scroll-autohide` — invisible when idle, thin thumb only while scrolling)
 * 3. Native iOS mobile horizontal push Slide-In / pop Slide-Out drill-down animation (`translate3d` + `opacity`)
 */
export function WorkspaceSplitLayout({
  title,
  subtitle,
  sidebarHeaderExtra,
  sidebarFooter,
  navGroups = [],
  customDesktopSidebarList,
  customMobileSidebarList,
  activeId,
  onSelect,
  mobileView,
  onMobileBack,
  onRootBack,
  rootBackLabel = "ย้อนกลับ",
  mobileBackLabel,
  mobileDetailTitle,
  contentWidth = "narrow",
  fullHeightRightPane = false,
  topBanner,
  children,
}: WorkspaceSplitLayoutProps) {
  useGlobalAutoHideScrollbars();
  const desktopMainRef = useRef<HTMLDivElement>(null);
  const mobileDetailRef = useRef<HTMLDivElement>(null);

  // Scroll right pane back to top when switching sections cleanly
  useEffect(() => {
    desktopMainRef.current?.scrollTo({ top: 0 });
    mobileDetailRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  const widthClass =
    contentWidth === "full"
      ? "w-full"
      : contentWidth === "wide"
        ? "max-w-[820px]"
        : "max-w-[680px]";

  const renderDesktopNav = () => {
    if (customDesktopSidebarList) return customDesktopSidebarList;
    return (
      <nav className="space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={group.title ?? `g-${gIdx}`} className="space-y-1">
            {group.title && (
              <p className="ws-badge text-[var(--color-text-secondary)] px-3.5 pb-1.5">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[14px] text-left cursor-pointer transition-colors ws-body-medium ${
                      active
                        ? "bg-[var(--color-background-muted)] !font-semibold !text-[var(--color-text-primary)]"
                        : "!text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)]/60 hover:!text-[var(--color-text-primary)]"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className={`w-[20px] h-[20px] shrink-0 ${
                          active
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                        strokeWidth={active ? 2.1 : 1.75}
                      />
                    )}
                    <span className="truncate flex-1 min-w-0">{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="ml-auto ws-badge text-[var(--color-text-secondary)] tabular-nums shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  };

  const renderMobileListNav = () => {
    if (customMobileSidebarList) return customMobileSidebarList;
    return (
      <div className="space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={group.title ?? `mg-${gIdx}`} className="space-y-1">
            {group.title && (
              <p className="ws-badge text-[var(--color-text-secondary)] px-3 pb-1">
                {group.title}
              </p>
            )}
            <div className="divide-y divide-[var(--color-border)]">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    className="w-full flex items-center gap-3.5 px-2 py-3.5 text-left cursor-pointer transition-colors active:bg-[var(--color-background-muted)] hover:bg-[var(--color-background-muted)]/60"
                  >
                    {Icon && (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? "bg-[var(--color-accent)] !text-white"
                            : "bg-[var(--color-background-muted)] text-[var(--color-accent)]"
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="ws-subtitle truncate">{item.label}</p>
                      {item.description && (
                        <p className="ws-caption truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="ws-badge text-[var(--color-text-secondary)] tabular-nums shrink-0">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      size={16}
                      className="text-[var(--color-text-secondary)] shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="cgr-admin-page">
      {topBanner}

      {/* ══════════════════════════════════════════════════════
          DESKTOP / TABLET (>= md): Unified 2-Column Split + Auto-Hide Scrollbars
         ══════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden max-w-[1160px] mx-auto w-full px-4 sm:px-6 lg:px-8 gap-10">
        {/* Left Borderless Nav Column */}
        <aside className="w-[260px] shrink-0 overflow-y-auto cgr-scroll-autohide py-8 pr-1">
          <div className="mb-6 flex items-start gap-2.5">
            {onRootBack && (
              <button
                type="button"
                onClick={onRootBack}
                aria-label={rootBackLabel}
                title={rootBackLabel}
                className="mt-0.5 h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
            <div className="min-w-0 space-y-1">
              <h1 className="ws-display">{title}</h1>
              {subtitle && <p className="ws-caption truncate">{subtitle}</p>}
            </div>
          </div>

          {sidebarHeaderExtra && <div className="mb-5">{sidebarHeaderExtra}</div>}

          {renderDesktopNav()}

          {sidebarFooter && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              {sidebarFooter}
            </div>
          )}
        </aside>

        {/* Right Pure-White Content Stage */}
        <div
          ref={desktopMainRef}
          className={`flex-1 min-w-0 ${
            fullHeightRightPane
              ? "overflow-hidden flex flex-col"
              : "overflow-y-auto cgr-scroll-autohide"
          }`}
        >
          {fullHeightRightPane ? (
            <div className="flex-1 min-h-0 flex flex-col py-8">{children}</div>
          ) : (
            <div className={`${widthClass} py-8 pb-24`}>{children}</div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE (< md): Native iOS Push Slide-In / Pop Slide-Out Drill-Down
         ══════════════════════════════════════════════════════ */}
      <div className="md:hidden cgr-split-mobile-stage">
        {/* Pane 1: Master List Menu */}
        <div
          data-view={mobileView}
          aria-hidden={mobileView === "detail"}
          className="cgr-split-pane-list cgr-scroll-autohide"
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-24">
            <div className="mb-5 flex items-start gap-2.5">
              {onRootBack && (
                <button
                  type="button"
                  onClick={onRootBack}
                  aria-label={rootBackLabel}
                  title={rootBackLabel}
                  className="mt-0.5 h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
              <div className="min-w-0 space-y-1">
                <h1 className="ws-display">{title}</h1>
                {subtitle && <p className="ws-caption truncate">{subtitle}</p>}
              </div>
            </div>

            {sidebarHeaderExtra && (
              <div className="mb-4">{sidebarHeaderExtra}</div>
            )}

            {renderMobileListNav()}

            {sidebarFooter && (
              <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                {sidebarFooter}
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Sliding Detail Screen */}
        <div
          data-view={mobileView}
          aria-hidden={mobileView === "list"}
          className="cgr-split-pane-detail"
        >
          {/* Sticky Mobile Drill-Down Back Header */}
          <div className="sticky top-0 z-20 bg-[var(--color-background-body)] border-b border-[var(--color-border)] px-3 h-12 flex items-center gap-2 shrink-0 touch-none">
            <button
              type="button"
              onClick={onMobileBack}
              className="h-9 pl-1.5 pr-3 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1 ws-body-strong !text-[var(--color-accent)] cursor-pointer transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{mobileBackLabel ?? title}</span>
            </button>
            {mobileDetailTitle && (
              <span className="ws-body-medium truncate text-[var(--color-text-secondary)] ml-auto pr-2">
                {mobileDetailTitle}
              </span>
            )}
          </div>

          <div
            ref={mobileDetailRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain cgr-scroll-autohide"
          >
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-24">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
