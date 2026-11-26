"use client";

import { useEffect } from "react";

function getDefaultSurfaceThemeColor(): string {
  if (typeof document === "undefined") return "#ffffff";
  return document.documentElement.classList.contains("dark")
    ? "#11161d"
    : "#ffffff";
}

function setDocumentThemeColor(hex: string) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (meta.content !== hex) {
    meta.content = hex;
  }
}

/**
 * Dynamically syncs iOS Safari / Mobile Chrome `<meta name="theme-color">`
 * with a full-bleed Hero's top sky color when at the top of the page,
 * and seamlessly reverts to the Light/Dark canvas color once scrolled past the Hero
 * (or on unmount / theme toggle).
 */
export function useHeroThemeColor(
  heroColorHex: string,
  scrollThresholdRatio = 0.62
) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;

    const sync = () => {
      rafId = null;
      const isMobileOrTablet = window.innerWidth < 1024;
      if (!isMobileOrTablet) {
        setDocumentThemeColor(getDefaultSurfaceThemeColor());
        return;
      }
      const thresholdPx = Math.max(window.innerHeight * scrollThresholdRatio, 260);
      const nextColor =
        window.scrollY < thresholdPx
          ? heroColorHex
          : getDefaultSurfaceThemeColor();
      setDocumentThemeColor(nextColor);
    };

    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(sync);
    };

    // Also react immediately if the user toggles Dark/Light mode
    const themeObserver = new MutationObserver(sync);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    sync();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      themeObserver.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      setDocumentThemeColor(getDefaultSurfaceThemeColor());
    };
  }, [heroColorHex, scrollThresholdRatio]);
}
