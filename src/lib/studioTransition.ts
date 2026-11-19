"use client";

import { flushSync } from "react-dom";

export type StudioTransitionMode = "forward" | "back" | "swap" | "morph";

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

type DocumentWithVT = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

let activeTransition: ViewTransitionLike | null = null;

/**
 * Runs a state update inside the browser's native View Transition API
 * (`document.startViewTransition` + `flushSync`) with Airbnb-calibrated
 * directional micro-slide + cross-fade or shared-element morphing.
 *
 * Gracefully degrades to instant updates on unsupported browsers or
 * when `prefers-reduced-motion: reduce` is enabled.
 */
export function runStudioTransition(
  mode: StudioTransitionMode,
  update: () => void
): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    update();
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const doc = document as DocumentWithVT;
  if (prefersReducedMotion || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }

  // If a prior transition is still mid-flight, finish it cleanly so rapid clicks feel instant
  if (activeTransition) {
    try {
      activeTransition.skipTransition();
    } catch {
      // ignore
    }
    activeTransition = null;
  }

  const root = document.documentElement;
  root.dataset.studioVt = mode;

  try {
    const vt = doc.startViewTransition(() => {
      flushSync(update);
    });
    activeTransition = vt;
    vt.finished
      .catch(() => {
        // ignore aborted transitions
      })
      .finally(() => {
        if (activeTransition === vt) {
          activeTransition = null;
        }
        if (root.dataset.studioVt === mode) {
          delete root.dataset.studioVt;
        }
      });
  } catch {
    delete root.dataset.studioVt;
    update();
  }
}
