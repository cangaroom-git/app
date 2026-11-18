"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const ROUTE_PROGRESS_START_EVENT = "cgr:route-start";

/**
 * Triggers the slim monochrome top route loading indicator immediately on SPA
 * navigation (e.g. `router.push`), before Next.js streams the next route.
 */
export function startRouteProgress(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_START_EVENT));
}

function RouteProgressBarInner() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() || ""}`;

  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const isActiveRef = useRef(false);
  const prevRouteKeyRef = useRef(routeKey);
  const trickleTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (trickleTimerRef.current !== null) {
      window.clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const completeProgress = useCallback(() => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;
    clearTimers();
    setProgress(100);
    finishTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      finishTimerRef.current = window.setTimeout(() => {
        setProgress(0);
      }, 200);
    }, 180);
  }, [clearTimers]);

  const beginProgress = useCallback(() => {
    clearTimers();
    isActiveRef.current = true;
    setIsVisible(true);
    setProgress((prev) => (prev > 18 && prev < 85 ? prev : 20));

    trickleTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const step = prev < 50 ? 11 : prev < 75 ? 5 : 2;
        return Math.min(90, prev + step);
      });
    }, 180);

    safetyTimerRef.current = window.setTimeout(() => {
      completeProgress();
    }, 8000);
  }, [clearTimers, completeProgress]);

  // Complete progress bar once App Router updates pathname or query string
  useEffect(() => {
    if (prevRouteKeyRef.current !== routeKey) {
      prevRouteKeyRef.current = routeKey;
      completeProgress();
    }
  }, [routeKey, completeProgress]);

  useEffect(() => {
    const onCustomStart = () => {
      beginProgress();
    };

    const onDocumentClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref.startsWith("/")) return;

      try {
        const dest = new URL(rawHref, window.location.origin);
        if (dest.origin !== window.location.origin) return;
        // Same pathname + same search (e.g., #anchor jump or already on this route)
        if (
          dest.pathname === window.location.pathname &&
          dest.search === window.location.search
        ) {
          return;
        }
        beginProgress();
      } catch {
        // ignore invalid href
      }
    };

    window.addEventListener(ROUTE_PROGRESS_START_EVENT, onCustomStart);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener(ROUTE_PROGRESS_START_EVENT, onCustomStart);
      document.removeEventListener("click", onDocumentClick, true);
      clearTimers();
    };
  }, [beginProgress, clearTimers]);

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 inset-x-0 z-[120] h-[2.5px] pointer-events-none transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-[var(--color-text-primary)] origin-left transition-[transform] duration-200 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBarInner />
    </Suspense>
  );
}

