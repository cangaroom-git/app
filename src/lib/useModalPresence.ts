"use client";

import { useEffect, useState } from "react";

/**
 * 2-frame GPU-composited modal presence hook (Airbnb Fade + Vertical Slide).
 * - Mounts at `dataState="closed"` first so the browser paints the initial off-axis state cleanly.
 * - Promotes to `dataState="open"` on the following animation frame so CSS `transition` runs
 *   purely on the GPU compositor thread with zero first-frame layout stutter.
 * - Keeps `shouldRender = true` until exit transition finishes (so `useBodyScrollLock(shouldRender)`
 *   never unlocks the scrollbar mid-exit and causes horizontal wobble!).
 */
export function useModalPresence(
  isOpen: boolean,
  exitDurationMs = 270
): {
  shouldRender: boolean;
  dataState: "open" | "closed";
} {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2) window.cancelAnimationFrame(raf2);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, exitDurationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, exitDurationMs]);

  return {
    shouldRender: isOpen || shouldRender,
    dataState: isOpen && isVisible ? "open" : "closed",
  };
}

