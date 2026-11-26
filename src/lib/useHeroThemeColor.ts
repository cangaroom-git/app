"use client";

import { useEffect, useState, type RefObject } from "react";

function getDefaultSurfaceThemeColor(): string {
  if (typeof document === "undefined") return "#ffffff";
  return document.documentElement.classList.contains("dark")
    ? "#11161d"
    : "#ffffff";
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

/**
 * Replaces the `<meta name="theme-color">` node cleanly so iOS Safari 17/18/26
 * immediately repaints the Dynamic Island status bar even after client-side SPA navigation.
 */
function setDocumentThemeColor(hex: string) {
  if (typeof document === "undefined") return;
  const existing = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (existing.length === 1 && existing[0].content.toLowerCase() === hex.toLowerCase()) {
    return;
  }
  existing.forEach((node) => node.remove());
  const next = document.createElement("meta");
  next.name = "theme-color";
  next.content = hex;
  document.head.appendChild(next);
}

/**
 * Samples the EXACT visible top-edge strip (y = 0..10px inside `stageEl`) of an `object-cover`
 * image element, automatically accounting for aspect-ratio cropping, negative insets, and zoom!
 */
function sampleRenderedTopEdgeHex(
  imgEl: HTMLImageElement,
  stageEl: HTMLElement | null
): string | null {
  try {
    const natW = imgEl.naturalWidth;
    const natH = imgEl.naturalHeight;
    if (!natW || !natH) return null;

    const imgRect = imgEl.getBoundingClientRect();
    if (imgRect.width <= 0 || imgRect.height <= 0) return null;

    const stageRect = stageEl
      ? stageEl.getBoundingClientRect()
      : {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };

    // Map `object-cover object-center` coordinates from rendered box -> source image pixels
    const natAspect = natW / natH;
    const boxAspect = imgRect.width / imgRect.height;

    let coverSrcX = 0;
    let coverSrcY = 0;
    let coverSrcW = natW;
    let coverSrcH = natH;

    if (natAspect > boxAspect) {
      // Image is wider than rendered box -> horizontally cropped
      coverSrcW = natH * boxAspect;
      coverSrcX = (natW - coverSrcW) / 2;
    } else {
      // Image is taller than rendered box -> vertically cropped
      coverSrcH = natW / boxAspect;
      coverSrcY = (natH - coverSrcH) / 2;
    }

    // Intersect rendered image box with the visible top strip of the stage (top 10px)
    const visLeftFrac = Math.max(
      0,
      Math.min(0.95, (stageRect.left - imgRect.left) / imgRect.width)
    );
    const visRightFrac = Math.max(
      visLeftFrac + 0.05,
      Math.min(1, (stageRect.left + stageRect.width - imgRect.left) / imgRect.width)
    );
    const visTopFrac = Math.max(
      0,
      Math.min(0.92, (stageRect.top - imgRect.top) / imgRect.height)
    );
    const stripHeightFrac = Math.max(0.015, Math.min(0.06, 14 / imgRect.height));

    const sx = coverSrcX + visLeftFrac * coverSrcW;
    const sw = Math.max(1, (visRightFrac - visLeftFrac) * coverSrcW);
    const sy = coverSrcY + visTopFrac * coverSrcH;
    const sh = Math.max(1, Math.min(coverSrcH - visTopFrac * coverSrcH, stripHeightFrac * coverSrcH));

    const canvas = document.createElement("canvas");
    const cw = 24;
    const ch = 4;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, cw, ch);
    const pixels = ctx.getImageData(0, 0, cw, ch).data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 200) continue;
      rSum += pixels[i];
      gSum += pixels[i + 1];
      bSum += pixels[i + 2];
      count++;
    }
    if (count === 0) return null;
    return rgbToHex(rSum / count, gSum / count, bSum / count);
  } catch {
    return null;
  }
}

/**
 * Automatically learns the real rendered top-edge color of ANY Hero background image
 * (accounting for object-cover, negative inset, and initial zoom), syncs iOS Safari's
 * `<meta name="theme-color">` seamlessly, and returns `learnedTopColor` so the Hero's
 * top edge & 32px feather mask match the iOS status bar 100% with zero seam.
 */
export function useHeroThemeColor(
  fallbackHex: string,
  scrollThresholdRatio = 0.62,
  imgRef?: RefObject<HTMLImageElement | null>,
  stageRef?: RefObject<HTMLElement | null>
): string {
  const [learnedHex, setLearnedHex] = useState<string>(fallbackHex);

  useEffect(() => {
    setLearnedHex(fallbackHex);
  }, [fallbackHex]);

  // 1. Learn exact rendered top-edge color from the live Hero background image
  useEffect(() => {
    if (typeof window === "undefined") return;
    const imgEl = imgRef?.current;
    if (!imgEl) return;

    let cancelled = false;
    const learn = () => {
      if (cancelled) return;
      // Wait 1 rAF so initial layout/transform is painted
      window.requestAnimationFrame(() => {
        if (cancelled || !imgRef?.current) return;
        const sampled = sampleRenderedTopEdgeHex(
          imgRef.current,
          stageRef?.current ?? null
        );
        if (sampled) {
          setLearnedHex(sampled);
        }
      });
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      learn();
    }
    imgEl.addEventListener("load", learn);
    window.addEventListener("resize", learn, { passive: true });
    return () => {
      cancelled = true;
      imgEl.removeEventListener("load", learn);
      window.removeEventListener("resize", learn);
    };
  }, [imgRef, stageRef, fallbackHex]);

  // 2. Sync `<meta name="theme-color">` on scroll / viewport / Dark Mode changes
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
          ? learnedHex
          : getDefaultSurfaceThemeColor();
      setDocumentThemeColor(nextColor);
    };

    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(sync);
    };

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
  }, [learnedHex, scrollThresholdRatio]);

  return learnedHex;
}
