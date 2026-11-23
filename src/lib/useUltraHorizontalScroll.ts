"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface UseUltraHorizontalScrollOptions {
  /** Disable engine completely when not needed */
  enabled?: boolean;
  /** Stop pointer/touch propagation to parent swipe/map surfaces (e.g. inside bottom sheets or modals) */
  stopPropagation?: boolean;
  /** Optional vertical pull handoff (e.g. drag DOWN anywhere on /explore horizontal strip to collapse sheet) */
  onVerticalPullMove?: (dy: number) => void;
  onVerticalPullEnd?: (dy: number, velocityY: number) => void;
  /** Optional scroll notification hook for arrow buttons or lazy reveal */
  onScrollUpdate?: () => void;
  /** Exponential deceleration constant in ms^-1 (default 0.0022 -> authentic iOS UIScrollView silky coast) */
  decelerationRate?: number;
  /** Enable soft iOS edge rubber-band overscroll on touch & coast boundary impact (default true) */
  enableRubberBand?: boolean;
}

export interface UseUltraHorizontalScrollApi {
  /** Smooth 120fps quartic ease-out programmatic relative scroll (replaces choppy native behavior:'smooth') */
  scrollBySmooth: (deltaX: number, durationMs?: number) => void;
  /** Smooth 120fps quartic ease-out programmatic absolute scroll */
  scrollToSmooth: (targetLeft: number, durationMs?: number) => void;
  /** Cancel any in-flight inertial coast or programmatic glide immediately */
  stopMotion: () => void;
}

interface MotionSample {
  x: number;
  y: number;
  t: number;
}

const DEFAULT_DECEL_K = 0.0022; // iOS-grade fluid coasting (~450ms tau)
const STOP_VELOCITY_PX_PER_MS = 0.016;
const MAX_RUBBER_PX = 64;
const VELOCITY_WINDOW_MS = 105;

function dampRubberBand(overshootPx: number): number {
  const abs = Math.abs(overshootPx);
  if (abs <= 0.01) return 0;
  // Smooth hyperbolic iOS rubber-band curve (asymptotes cleanly below MAX_RUBBER_PX)
  const damped = (abs * 0.42) / (1 + abs / 145);
  return Math.sign(overshootPx) * Math.min(MAX_RUBBER_PX, damped);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isInteractiveFormTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Ultra-Smooth 120fps Inertial Momentum Horizontal Scroll Engine (Nondii Standard):
 * - Authentic iOS `UIScrollView` exponential-decay coasting (`v(t) = v0 * e^(-k*t)`)
 *   with floating-point sub-pixel position accumulation (zero integer-rounding stutter!).
 * - Dual-axis touch arbitration:
 *   * Horizontal drag -> 1:1 tracking + silky edge rubber-band + 120fps inertial coast + catch-to-stop.
 *   * Vertical drag -> passes 100% cleanly to native page scroll (or optional `onVerticalPullMove` sheet collapse).
 * - Desktop mouse drag-to-flick with identical inertial physics and capture-phase click suppression
 *   only when dragged `> 6px` (never breaks normal card clicks or `<Link>` navigation!).
 * - Native macOS/Windows trackpad `wheel` gestures seamlessly interrupt active coasting.
 * - Zero overhead on responsive desktop grids (`scrollWidth <= clientWidth + 1` -> instant no-op!).
 */
export function useUltraHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  options: UseUltraHorizontalScrollOptions = {}
): UseUltraHorizontalScrollApi {
  const {
    enabled = true,
    stopPropagation = false,
    onVerticalPullMove,
    onVerticalPullEnd,
    onScrollUpdate,
    decelerationRate = DEFAULT_DECEL_K,
    enableRubberBand = true,
  } = options;

  const optsRef = useRef({
    stopPropagation,
    onVerticalPullMove,
    onVerticalPullEnd,
    onScrollUpdate,
    decelerationRate,
    enableRubberBand,
  });
  optsRef.current = {
    stopPropagation,
    onVerticalPullMove,
    onVerticalPullEnd,
    onScrollUpdate,
    decelerationRate,
    enableRubberBand,
  };

  const rafIdRef = useRef<number | null>(null);
  const rubberXRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const clearRubberTransform = useCallback((el: HTMLElement | null) => {
    rubberXRef.current = 0;
    if (el && el.style.transform) {
      el.style.transform = "";
      el.style.willChange = "";
    }
  }, []);

  const stopMotion = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const el = ref.current;
    if (el && rubberXRef.current !== 0) {
      clearRubberTransform(el);
    }
  }, [clearRubberTransform, ref]);

  const animateRubberReturn = useCallback(
    (el: HTMLElement, fromRubberX: number) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (Math.abs(fromRubberX) < 0.4 || prefersReducedMotion()) {
        clearRubberTransform(el);
        return;
      }
      const startTime = performance.now();
      const durationMs = 310;
      el.style.willChange = "transform";

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / durationMs);
        // Smooth cubic ease-out back to exact 0
        const eased = 1 - Math.pow(1 - p, 3);
        const curr = fromRubberX * (1 - eased);
        rubberXRef.current = curr;

        if (p < 1 && Math.abs(curr) >= 0.25) {
          el.style.transform = `translate3d(${curr.toFixed(2)}px, 0, 0)`;
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
          clearRubberTransform(el);
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [clearRubberTransform]
  );

  const animateEdgeCushion = useCallback(
    (el: HTMLElement, peakPx: number) => {
      if (
        !optsRef.current.enableRubberBand ||
        Math.abs(peakPx) < 1.5 ||
        prefersReducedMotion()
      ) {
        clearRubberTransform(el);
        return;
      }
      const startTime = performance.now();
      const outMs = 105;
      const backMs = 245;
      el.style.willChange = "transform";

      const tick = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed < outMs) {
          const p = elapsed / outMs;
          const eased = 1 - Math.pow(1 - p, 2);
          const curr = peakPx * eased;
          rubberXRef.current = curr;
          el.style.transform = `translate3d(${curr.toFixed(2)}px, 0, 0)`;
          rafIdRef.current = requestAnimationFrame(tick);
        } else if (elapsed < outMs + backMs) {
          const p = (elapsed - outMs) / backMs;
          const eased = 1 - Math.pow(1 - p, 3);
          const curr = peakPx * (1 - eased);
          rubberXRef.current = curr;
          el.style.transform = `translate3d(${curr.toFixed(2)}px, 0, 0)`;
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
          clearRubberTransform(el);
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [clearRubberTransform]
  );

  const launchMomentumCoast = useCallback(
    (el: HTMLElement, initialScrollVelocityPxPerMs: number) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (
        prefersReducedMotion() ||
        Math.abs(initialScrollVelocityPxPerMs) < 0.055
      ) {
        return;
      }

      const k = optsRef.current.decelerationRate;
      // Cap extreme velocities so single flick feels powerful yet controlled
      const v0 = Math.max(-4.8, Math.min(4.8, initialScrollVelocityPxPerMs));
      const startPos = el.scrollLeft;
      const startTime = performance.now();

      const tick = (now: number) => {
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        if (maxScroll <= 0) {
          rafIdRef.current = null;
          return;
        }

        const dt = Math.max(0, now - startTime);
        const decay = Math.exp(-k * dt);
        const currentVelocity = v0 * decay;
        const nextVirtual = startPos + (v0 / k) * (1 - decay);

        if (nextVirtual <= 0 && v0 < 0) {
          el.scrollLeft = 0;
          optsRef.current.onScrollUpdate?.();
          rafIdRef.current = null;
          if (Math.abs(currentVelocity) > 0.14) {
            const cushion = Math.min(24, Math.abs(currentVelocity) * 14);
            animateEdgeCushion(el, cushion);
          }
          return;
        }

        if (nextVirtual >= maxScroll && v0 > 0) {
          el.scrollLeft = maxScroll;
          optsRef.current.onScrollUpdate?.();
          rafIdRef.current = null;
          if (Math.abs(currentVelocity) > 0.14) {
            const cushion = -Math.min(24, Math.abs(currentVelocity) * 14);
            animateEdgeCushion(el, cushion);
          }
          return;
        }

        el.scrollLeft = nextVirtual;
        optsRef.current.onScrollUpdate?.();

        if (Math.abs(currentVelocity) <= STOP_VELOCITY_PX_PER_MS) {
          rafIdRef.current = null;
          return;
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [animateEdgeCushion]
  );

  const scrollToSmooth = useCallback(
    (targetLeft: number, durationMs = 460) => {
      const el = ref.current;
      if (!el) return;
      stopMotion();

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const clampedTarget = Math.max(0, Math.min(maxScroll, targetLeft));
      const startLeft = el.scrollLeft;
      const delta = clampedTarget - startLeft;

      if (Math.abs(delta) < 1 || prefersReducedMotion() || durationMs <= 0) {
        el.scrollLeft = clampedTarget;
        optsRef.current.onScrollUpdate?.();
        return;
      }

      const startTime = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - startTime) / durationMs);
        // Ultra-smooth quartic ease-out (silky iOS deceleration)
        const eased = 1 - Math.pow(1 - p, 4);
        el.scrollLeft = startLeft + delta * eased;
        optsRef.current.onScrollUpdate?.();

        if (p < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [ref, stopMotion]
  );

  const scrollBySmooth = useCallback(
    (deltaX: number, durationMs = 460) => {
      const el = ref.current;
      if (!el) return;
      scrollToSmooth(el.scrollLeft + deltaX, durationMs);
    },
    [ref, scrollToSmooth]
  );

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    // -------------------------------------------------------------------------
    // 1. CAPTURE CLICK GUARD (prevents accidental card navigation right after flick/drag)
    // -------------------------------------------------------------------------
    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntilRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // -------------------------------------------------------------------------
    // 2. TOUCH ENGINE (Dual-Axis Arbitration + 1:1 Tracking + Rubber Band + 120fps Coast)
    // -------------------------------------------------------------------------
    let touchState: {
      startX: number;
      startY: number;
      startScrollLeft: number;
      lockOffsetX: number;
      axis: "horizontal" | "vertical" | null;
      caughtCoast: boolean;
      samples: MotionSample[];
    } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t) return;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const hasVerticalPull = Boolean(optsRef.current.onVerticalPullMove);
      if (maxScroll <= 1 && !hasVerticalPull) return;

      const wasCoasting = rafIdRef.current !== null;
      if (wasCoasting) {
        stopMotion();
      }

      touchState = {
        startX: t.clientX,
        startY: t.clientY,
        startScrollLeft: el.scrollLeft,
        lockOffsetX: 0,
        axis: null,
        caughtCoast: wasCoasting,
        samples: [{ x: t.clientX, y: t.clientY, t: performance.now() }],
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - touchState.startX;
      const dy = t.clientY - touchState.startY;
      const now = performance.now();
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);

      if (touchState.axis === null) {
        if (
          maxScroll > 1 &&
          Math.abs(dx) > 5 &&
          Math.abs(dx) >= Math.abs(dy) * 0.85
        ) {
          touchState.axis = "horizontal";
          touchState.lockOffsetX = dx;
          touchState.samples = [{ x: t.clientX, y: t.clientY, t: now }];
        } else if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          touchState.axis = "vertical";
          if (!optsRef.current.onVerticalPullMove) {
            // Pure native vertical page scroll: release immediately with zero overhead!
            touchState = null;
            return;
          }
          touchState.samples = [{ x: t.clientX, y: t.clientY, t: now }];
        } else {
          return;
        }
      }

      if (touchState.axis === "vertical") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        touchState.samples.push({ x: t.clientX, y: t.clientY, t: now });
        while (
          touchState.samples.length > 2 &&
          now - touchState.samples[0].t > VELOCITY_WINDOW_MS
        ) {
          touchState.samples.shift();
        }
        optsRef.current.onVerticalPullMove?.(dy);
        return;
      }

      // HORIZONTAL AXIS LOCKED: 100% eliminates vertical wobble & pull-to-refresh!
      if (e.cancelable) e.preventDefault();
      if (optsRef.current.stopPropagation) {
        e.stopPropagation();
      }

      touchState.samples.push({ x: t.clientX, y: t.clientY, t: now });
      while (
        touchState.samples.length > 2 &&
        now - touchState.samples[0].t > VELOCITY_WINDOW_MS
      ) {
        touchState.samples.shift();
      }

      const rawTarget = touchState.startScrollLeft - (dx - touchState.lockOffsetX);

      if (rawTarget < 0) {
        el.scrollLeft = 0;
        if (optsRef.current.enableRubberBand) {
          const rubber = dampRubberBand(-rawTarget);
          rubberXRef.current = rubber;
          el.style.willChange = "transform";
          el.style.transform = `translate3d(${rubber.toFixed(2)}px, 0, 0)`;
        }
      } else if (rawTarget > maxScroll) {
        el.scrollLeft = maxScroll;
        if (optsRef.current.enableRubberBand) {
          const rubber = dampRubberBand(maxScroll - rawTarget);
          rubberXRef.current = rubber;
          el.style.willChange = "transform";
          el.style.transform = `translate3d(${rubber.toFixed(2)}px, 0, 0)`;
        }
      } else {
        if (rubberXRef.current !== 0) {
          clearRubberTransform(el);
        }
        el.scrollLeft = rawTarget;
      }

      optsRef.current.onScrollUpdate?.();
    };

    const finishTouch = (e: TouchEvent) => {
      if (!touchState) return;
      const st = touchState;
      touchState = null;

      const now = performance.now();
      const samples = st.samples;
      let vx = 0;
      let vy = 0;
      if (samples.length >= 2) {
        const newest = samples[samples.length - 1];
        if (now - newest.t < 95) {
          const oldest = samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 5) {
            vx = (newest.x - oldest.x) / dt;
            vy = (newest.y - oldest.y) / dt;
          }
        }
      }

      if (st.axis === "vertical") {
        suppressClickUntilRef.current = now + 240;
        const t = e.changedTouches[0];
        const dy = t ? t.clientY - st.startY : 0;
        optsRef.current.onVerticalPullEnd?.(dy, vy);
        return;
      }

      if (st.axis === "horizontal") {
        suppressClickUntilRef.current = now + 260;
        if (Math.abs(rubberXRef.current) > 0.5) {
          animateRubberReturn(el, rubberXRef.current);
        } else {
          // Finger moving left (vx < 0) increases scrollLeft (+scrollVelocity)
          launchMomentumCoast(el, -vx);
        }
        return;
      }

      // User tapped purely to catch a fast-coasting strip -> suppress accidental link open!
      if (st.caughtCoast) {
        suppressClickUntilRef.current = now + 220;
      }
    };

    // -------------------------------------------------------------------------
    // 3. DESKTOP MOUSE CLICK-AND-DRAG WITH IDENTICAL 120FPS INERTIAL COAST
    // -------------------------------------------------------------------------
    let mouseState: {
      startX: number;
      startY: number;
      startScrollLeft: number;
      lockOffsetX: number;
      dragging: boolean;
      samples: MotionSample[];
    } | null = null;

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!mouseState) return;
      const dx = e.clientX - mouseState.startX;
      const dy = e.clientY - mouseState.startY;
      const now = performance.now();

      if (!mouseState.dragging) {
        if (Math.abs(dx) > 5 && Math.abs(dx) >= Math.abs(dy) * 0.9) {
          mouseState.dragging = true;
          mouseState.lockOffsetX = dx;
          mouseState.samples = [{ x: e.clientX, y: e.clientY, t: now }];
          el.style.userSelect = "none";
          el.style.cursor = "grabbing";
        } else if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          // Vertical mouse drag (e.g. text selection): release cleanly
          cleanupMouseListeners();
          mouseState = null;
          return;
        } else {
          return;
        }
      }

      e.preventDefault();
      mouseState.samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (
        mouseState.samples.length > 2 &&
        now - mouseState.samples[0].t > VELOCITY_WINDOW_MS
      ) {
        mouseState.samples.shift();
      }

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const rawTarget = mouseState.startScrollLeft - (dx - mouseState.lockOffsetX);
      if (rawTarget < 0) {
        el.scrollLeft = 0;
        if (optsRef.current.enableRubberBand) {
          const rubber = dampRubberBand(-rawTarget);
          rubberXRef.current = rubber;
          el.style.willChange = "transform";
          el.style.transform = `translate3d(${rubber.toFixed(2)}px, 0, 0)`;
        }
      } else if (rawTarget > maxScroll) {
        el.scrollLeft = maxScroll;
        if (optsRef.current.enableRubberBand) {
          const rubber = dampRubberBand(maxScroll - rawTarget);
          rubberXRef.current = rubber;
          el.style.willChange = "transform";
          el.style.transform = `translate3d(${rubber.toFixed(2)}px, 0, 0)`;
        }
      } else {
        if (rubberXRef.current !== 0) {
          clearRubberTransform(el);
        }
        el.scrollLeft = rawTarget;
      }

      optsRef.current.onScrollUpdate?.();
    };

    const onWindowMouseUp = () => {
      if (!mouseState) return;
      const st = mouseState;
      mouseState = null;
      cleanupMouseListeners();

      el.style.userSelect = "";
      el.style.cursor = "";

      if (!st.dragging) return;

      const now = performance.now();
      suppressClickUntilRef.current = now + 260;

      let vx = 0;
      if (st.samples.length >= 2) {
        const newest = st.samples[st.samples.length - 1];
        if (now - newest.t < 95) {
          const oldest = st.samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 5) {
            vx = (newest.x - oldest.x) / dt;
          }
        }
      }

      if (Math.abs(rubberXRef.current) > 0.5) {
        animateRubberReturn(el, rubberXRef.current);
      } else {
        launchMomentumCoast(el, -vx);
      }
    };

    const cleanupMouseListeners = () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      window.removeEventListener("blur", onWindowMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isInteractiveFormTarget(e.target)) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 1) return;

      if (rafIdRef.current !== null) {
        stopMotion();
      }

      mouseState = {
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: el.scrollLeft,
        lockOffsetX: 0,
        dragging: false,
        samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
      };

      window.addEventListener("mousemove", onWindowMouseMove);
      window.addEventListener("mouseup", onWindowMouseUp);
      window.addEventListener("blur", onWindowMouseUp);
    };

    const onDragStart = (e: DragEvent) => {
      if (mouseState) {
        e.preventDefault();
      }
    };

    // -------------------------------------------------------------------------
    // 4. WHEEL / TRACKPAD HANDOFF (Native 120fps macOS trackpad cancels coast cleanly)
    // -------------------------------------------------------------------------
    const onWheel = (e: WheelEvent) => {
      if (rafIdRef.current !== null && Math.abs(e.deltaX) > 0) {
        stopMotion();
      }
    };

    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishTouch, { passive: true });
    el.addEventListener("touchcancel", finishTouch, { passive: true });
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      stopMotion();
      cleanupMouseListeners();
      el.style.userSelect = "";
      el.style.cursor = "";
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishTouch);
      el.removeEventListener("touchcancel", finishTouch);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("wheel", onWheel);
    };
  }, [
    animateRubberReturn,
    clearRubberTransform,
    enabled,
    launchMomentumCoast,
    ref,
    stopMotion,
  ]);

  return {
    scrollBySmooth,
    scrollToSmooth,
    stopMotion,
  };
}
