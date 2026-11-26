"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const HOME_SKY_COLOR = "#5FAEE9";
const TRIP_SKY_COLOR = "#2986D6";
const LIGHT_SURFACE_COLOR = "#ffffff";
const DARK_SURFACE_COLOR = "#11161d";

function hasScrollableVerticalAncestorAboveTop(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  let el: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      el.scrollHeight > el.clientHeight + 1 &&
      el.scrollTop > 0
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function isInsideModalOrDialog(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const el = target instanceof HTMLElement ? target : target.parentElement;
  if (!el) return false;
  return Boolean(
    el.closest(
      '[aria-modal="true"], [role="dialog"], .maplibregl-map, [data-allow-pull-down="true"]',
    ),
  );
}

/**
 * Forces iOS Safari (iOS 15–18 WebKit) to repaint its status-bar chrome on every
 * client-side SPA route change by removing stale Next.js `<meta name="theme-color">`
 * tags and appending a fresh tag with the exact intended color.
 */
function syncThemeColorMeta(color: string) {
  if (typeof document === "undefined") return;
  const head = document.head;
  if (!head) return;

  const existing = head.querySelectorAll('meta[name="theme-color"]');
  if (
    existing.length === 1 &&
    existing[0].getAttribute("content") === color &&
    existing[0].getAttribute("data-cgr-chrome") === "true"
  ) {
    return;
  }

  existing.forEach((node) => node.remove());
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", color);
  meta.setAttribute("data-cgr-chrome", "true");
  head.appendChild(meta);
}

export interface MobileChromeControllerProps {
  theme: "light" | "dark";
  hasActiveHomeSearch?: boolean;
}

/**
 * Sustainable iOS Safari (iOS 15–18 & iOS 26+ Liquid Glass) Chrome & Overscroll Controller:
 *
 * 1. Top Status Bar Consistency across SPA `<Link>` navigation:
 *    - Removes & re-inserts `<meta name="theme-color">` on route/scroll/theme changes (iOS 15–18)
 *    - Renders a fixed solid top-edge shim (`top: 0`) that iOS 26+ Liquid Glass samples live
 *      instead of keeping stale colors from previous routes (`/trip` <-> `/` <-> `/explore`).
 * 2. Bottom URL Bar Protection:
 *    - Renders a permanent solid opaque bottom-edge shim (`bottom: 0`, pure white / dark canvas)
 *      so iOS 26+ Safari ALWAYS samples the surface color at the bottom edge and NEVER tints
 *      the bottom URL bar blue even when the mobile bottom nav auto-hides on scroll.
 * 3. Native-App Pull-to-Refresh Lock on `/` and `/trip`:
 *    - Intercepts single-finger downward drags at `window.scrollY <= 1` on touch viewports
 *      without breaking `window.scrollY`, sticky hero parallax, horizontal carousels, or modals.
 */
export function MobileChromeController({
  theme,
  hasActiveHomeSearch = false,
}: MobileChromeControllerProps) {
  const pathname = usePathname() || "/";
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  const isHomeRoute = pathname === "/";
  const isTripRootRoute = pathname === "/trip";
  const isHeroRoute = isHomeRoute || isTripRootRoute;
  const isEdgeMapRoute =
    pathname.startsWith("/explore") ||
    (pathname.startsWith("/trip/") && pathname !== "/trip");

  const surfaceColor =
    theme === "dark" ? DARK_SURFACE_COLOR : LIGHT_SURFACE_COLOR;

  // Reset hero scroll state immediately when switching routes
  useEffect(() => {
    if (!isHeroRoute || typeof window === "undefined") {
      setIsScrolledPastHero(false);
      return;
    }

    let rafId = 0;
    const evaluateScroll = () => {
      rafId = 0;
      const vh = Math.max(window.innerHeight, 560);
      // Home sheet starts at ~76svh (-mt-[24svh]); Trip runway is 175svh.
      // Flip status bar cleanly to solid canvas color the exact moment the white sheet hits top.
      const threshold = isHomeRoute ? vh * 0.74 : vh * 1.72;
      const passed = window.scrollY >= threshold;
      setIsScrolledPastHero((prev) => (prev === passed ? prev : passed));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(evaluateScroll);
    };

    evaluateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isHeroRoute, isHomeRoute, pathname]);

  const showHomeBlueTop =
    isHomeRoute &&
    theme === "light" &&
    !hasActiveHomeSearch &&
    !isScrolledPastHero;
  const showTripBlueTop = isTripRootRoute && !isScrolledPastHero;

  const topChromeColor = showHomeBlueTop
    ? HOME_SKY_COLOR
    : showTripBlueTop
      ? TRIP_SKY_COLOR
      : surfaceColor;

  // 1. Force-sync `<meta name="theme-color">` on every SPA navigation / scroll transition
  useEffect(() => {
    syncThemeColorMeta(topChromeColor);
    // Double-sync after Next.js metadata hydration tick in case App Router streams a stale meta tag
    const timer = window.setTimeout(() => {
      syncThemeColorMeta(topChromeColor);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [topChromeColor, pathname]);

  // 2. Native-App Pull-to-Refresh Lock on `/` and `/trip` (Mobile / Touch Viewports)
  useEffect(() => {
    if (!isHeroRoute || typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let ignoreGesture = false;
    let axisLocked: "none" | "x" | "y" = "none";

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || e.touches.length !== 1) {
        ignoreGesture = true;
        return;
      }
      if (
        isInsideModalOrDialog(e.target) ||
        hasScrollableVerticalAncestorAboveTop(e.target)
      ) {
        ignoreGesture = true;
        return;
      }
      ignoreGesture = false;
      axisLocked = "none";
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      lastY = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (ignoreGesture || e.touches.length !== 1) return;
      const t = e.touches[0];
      const totalDx = t.clientX - startX;
      const totalDy = t.clientY - startY;
      const stepDy = t.clientY - lastY;
      lastY = t.clientY;

      if (axisLocked === "none") {
        if (Math.abs(totalDx) > 6 && Math.abs(totalDx) > Math.abs(totalDy)) {
          axisLocked = "x";
          return;
        }
        if (Math.abs(totalDy) > 4) {
          axisLocked = "y";
        }
      }

      if (axisLocked === "x") return;

      // Block downward pull at the top edge (`scrollY <= 1`) so iOS Safari never triggers Pull-to-Refresh
      if (window.scrollY <= 1 && (stepDy > 0 || (stepDy === 0 && totalDy > 0))) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      ignoreGesture = false;
      axisLocked = "none";
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isHeroRoute]);

  return (
    <>
      {/* Top Safe-Area Edge Shim (iOS 26+ Liquid Glass Status Bar Sampling + Notch Fill)
          - On `/` & `/trip`: seamlessly fills Dynamic Island safe area with exact sky blue (or white once scrolled)
          - On full-bleed maps (`/explore`, `/trip/[id]`): hairline 2px edge shim so map remains 100% unobstructed
          - On standard white pages: fills safe area with solid canvas color */}
      <div
        aria-hidden="true"
        className="lg:hidden fixed top-0 inset-x-0 z-[55] pointer-events-none transition-colors duration-200"
        style={{
          height: isEdgeMapRoute
            ? "2px"
            : "max(4px, env(safe-area-inset-top, 0px))",
          backgroundColor: topChromeColor,
        }}
      />

      {/* Permanent Bottom Edge Shim (iOS 26+ Liquid Glass Bottom URL Bar Protection)
          Always solid opaque white/dark so the bottom URL bar NEVER turns blue on scroll or route swap */}
      <div
        aria-hidden="true"
        className="lg:hidden fixed bottom-0 inset-x-0 z-[68] pointer-events-none"
        style={{
          height: "max(4px, env(safe-area-inset-bottom, 0px))",
          backgroundColor: surfaceColor,
        }}
      />
    </>
  );
}
