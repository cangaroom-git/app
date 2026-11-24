"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getDealDiscountHeadline } from "@/components/home/VerticalCouponCard";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { PinFeedItemDto } from "@/types/cangaroom";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface CardOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface HeroTargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

type FlipStage = "idle" | "opening" | "open" | "closing";

interface TripCardFlipModalProps {
  isOpen: boolean;
  pin: PinFeedItemDto | null;
  stopNumber: number;
  /** Optional custom top-left pill headline for /explore mode (defaults to `#N · discountHeadline`) */
  frontBadgeText?: string | null;
  originRect: CardOriginRect | null;
  language: LanguageCode;
  onRequestClose: () => void;
  onAfterClose: () => void;
  children: React.ReactNode;
}

// Brisk yet continuous & refined single-arc timing
const OPEN_DURATION_MS = 560;
const CLOSE_DURATION_MS = 450;
const KEYFRAME_SAMPLES = 26;

// Asymmetric S-curve: immediate responsive launch -> fluid 90deg flip apex -> feather-soft settle
const BEZIER_X1 = 0.44;
const BEZIER_Y1 = 0.04;
const BEZIER_X2 = 0.22;
const BEZIER_Y2 = 1.0;

function evalCubic(a: number, b: number, c: number, t: number): number {
  return ((a * t + b) * t + c) * t;
}

function evalCubicDeriv(a: number, b: number, c: number, t: number): number {
  return (3 * a * t + 2 * b) * t + c;
}

function createBezierEvaluator(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const solveTForX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = evalCubic(ax, bx, cx, t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = evalCubicDeriv(ax, bx, cx, t);
      if (Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - err / d));
    }
    return t;
  };

  const solveTForY = (y: number): number => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) * 0.5;
      if (evalCubic(ay, by, cy, mid) < y) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) * 0.5;
  };

  return {
    atProgress: (u: number): number => {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      return evalCubic(ay, by, cy, solveTForX(u));
    },
    uForValue: (y: number): number => {
      return evalCubic(ax, bx, cx, solveTForY(y));
    },
  };
}

const MASTER_EASE = createBezierEvaluator(
  BEZIER_X1,
  BEZIER_Y1,
  BEZIER_X2,
  BEZIER_Y2
);

function getTargetModalSize(vw: number, vh: number): {
  width: number;
  height: number;
  radius: number;
} {
  if (vw >= 1024) {
    return {
      width: Math.min(Math.round(vw * 0.9), 1140),
      height: Math.min(Math.round(vh * 0.9), 840),
      radius: 24,
    };
  }
  return {
    width: vw,
    height: vh,
    radius: 0,
  };
}

/**
 * Fallback estimate of `[data-pin-hero-stage="true"]` rect in case the dynamic
 * `PinterestPinDetail` JS chunk is still downloading on a very slow first open.
 */
function getEstimatedHeroRect(vw: number, vh: number): HeroTargetRect {
  if (vw >= 1024) {
    const modal = getTargetModalSize(vw, vh);
    const modalLeft = (vw - modal.width) / 2;
    const modalTop = (vh - modal.height) / 2;
    const innerLeft = modalLeft + 28;
    const innerTop = modalTop + 24;
    const innerW = modal.width - 56;
    const contentW = Math.min(innerW, 1120);
    const contentLeft = innerLeft + (innerW - contentW) / 2;
    const contentTop = innerTop + 8;
    const outerGap = vw >= 1280 ? 32 : 24;
    const gridGap = vw >= 1280 ? 40 : 32;
    const gridLeft = contentLeft + 40 + outerGap;
    const gridW = contentW - 40 - outerGap;
    const heroW = Math.max(280, Math.round((gridW - gridGap) / 2));
    const colH = Math.max(540, Math.min(Math.round(vh * 0.82), 740));
    const heroH = Math.max(360, colH - 84);
    return {
      left: Math.round(gridLeft),
      top: Math.round(contentTop),
      width: heroW,
      height: heroH,
      radius: 20,
    };
  }

  const isSm = vw >= 640;
  const padX = isSm ? 12 : 6;
  const padTop = isSm ? 10 : 6;
  const width = Math.max(240, vw - padX * 2);
  const height = Math.min(Math.round((width * 5) / 4), Math.round(vh * 0.76));
  return {
    left: padX,
    top: padTop,
    width,
    height,
    radius: isSm ? 26 : 24,
  };
}

function measureMobileBottomNavClipPx(vh: number): number {
  if (typeof document === "undefined" || window.innerWidth >= 1024) return 0;
  const navEl = document.querySelector<HTMLElement>(
    'nav[aria-label="Mobile navigation"]'
  );
  if (!navEl || navEl.getAttribute("aria-hidden") === "true") return 0;
  const rect = navEl.getBoundingClientRect();
  if (rect.height < 20 || rect.top >= vh) return 0;
  return Math.max(0, Math.round(vh - rect.top));
}

function measureLiveHeroRect(
  container: HTMLElement | null
): HeroTargetRect | null {
  if (!container) return null;
  const heroEl = container.querySelector<HTMLElement>(
    '[data-pin-hero-stage="true"]'
  );
  if (!heroEl) return null;
  const rect = heroEl.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return null;
  const computedRadius = parseFloat(window.getComputedStyle(heroEl).borderRadius);
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    radius: Number.isFinite(computedRadius) && computedRadius > 0 ? computedRadius : 20,
  };
}

/**
 * Builds synchronized off-main-thread WAAPI keyframes for a Shared-Element
 * Hero Photo 3D Flip:
 * - Front Face (Deck Card): lifts from `originRect`, scales uniformly (zero image distortion!),
 *   and flips 0deg -> +90deg toward the Modal's Hero Photo frame (`heroTarget`).
 * - Exact 90deg edge crossing (`uMid`): zero-width handoff at identical center & apparent height.
 * - Back Face (Vibrant Hero Photo): unfolds seamlessly -90deg -> 0deg right onto the exact
 *   pixel bounds of `heroTarget` (`[data-pin-hero-stage="true"]`), while the surrounding Modal
 *   container softly fades in around it!
 */
function buildHeroImageFlipKeyframes(
  origin: CardOriginRect,
  heroTarget: HeroTargetRect,
  direction: "open" | "close"
): { frontFrames: Keyframe[]; backFrames: Keyframe[] } {
  const originCx = origin.left + origin.width * 0.5;
  const originCy = origin.top + origin.height * 0.5;
  const targetCx = heroTarget.left + heroTarget.width * 0.5;
  const targetCy = heroTarget.top + heroTarget.height * 0.5;

  const hMid = origin.height + (heroTarget.height - origin.height) * 0.5;
  const midScaleFront = hMid / Math.max(1, origin.height);
  const wMid = origin.width * midScaleFront;

  const uMid = MASTER_EASE.uForValue(0.5);
  const eps = 0.0001;

  const rawOffsets = new Set<number>([0, 1]);
  for (let i = 1; i < KEYFRAME_SAMPLES; i++) {
    rawOffsets.add(i / KEYFRAME_SAMPLES);
  }
  rawOffsets.add(Math.max(0.001, uMid - eps));
  rawOffsets.add(Math.min(0.999, uMid + eps));

  const sortedU = Array.from(rawOffsets).sort((a, b) => a - b);

  const frontFrames: Keyframe[] = [];
  const backFrames: Keyframe[] = [];

  for (const u of sortedU) {
    const eased = MASTER_EASE.atProgress(u);
    const p = direction === "open" ? eased : 1 - eased;

    const cx = originCx + (targetCx - originCx) * p;
    const cy = originCy + (targetCy - originCy) * p - Math.sin(p * Math.PI) * 16;

    const isFrontVisible = direction === "open" ? u <= uMid : u >= uMid;

    // Front Face (positioned with center at (0,0) via negative half-margins at top:0,left:0)
    const pFront = Math.min(0.5, Math.max(0, p));
    const frontH = origin.height + (heroTarget.height - origin.height) * pFront;
    const sFront = frontH / Math.max(1, origin.height);
    const frontDeg = pFront * 180; // 0deg -> +90deg

    frontFrames.push({
      offset: u,
      opacity: isFrontVisible ? 1 : 0,
      transform: `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) perspective(1400px) rotateY(${frontDeg.toFixed(2)}deg) scale3d(${sFront.toFixed(4)}, ${sFront.toFixed(4)}, 1)`,
      easing: "linear",
    });

    // Back Face (exact Hero Photo frame size, centered at (0,0) via negative half-margins)
    const pBack = Math.min(1, Math.max(0.5, p));
    const q = (pBack - 0.5) * 2; // 0 -> 1
    const backW = wMid + (heroTarget.width - wMid) * q;
    const backH = origin.height + (heroTarget.height - origin.height) * pBack;
    const sx = backW / Math.max(1, heroTarget.width);
    const sy = backH / Math.max(1, heroTarget.height);
    const backDeg = -90 * (1 - q); // -90deg -> 0deg

    backFrames.push({
      offset: u,
      opacity: isFrontVisible ? 0 : 1,
      transform: `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) perspective(1400px) rotateY(${backDeg.toFixed(2)}deg) scale3d(${sx.toFixed(4)}, ${sy.toFixed(4)}, 1)`,
      easing: "linear",
    });
  }

  return { frontFrames, backFrames };
}

/**
 * Shared-Element Hero Photo 3D Flip Modal:
 * - ONLY the stay photo card flips & expands in 3D from the bottom fanned deck straight into
 *   the exact Hero Photo slot (`[data-pin-hero-stage="true"]`) inside the Modal!
 * - Meanwhile, the surrounding Modal shell & Backdrop fade in gracefully around the landing photo.
 * - On close, the Modal shell softly fades out while the Hero Photo lifts right off its live rect
 *   and flips cleanly back into the fanned deck (zero flicker, zero sibling bounce!).
 */
export function TripCardFlipModal({
  isOpen,
  pin,
  stopNumber,
  frontBadgeText,
  originRect,
  language,
  onRequestClose,
  onAfterClose,
  children,
}: TripCardFlipModalProps) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<FlipStage>("idle");
  const [viewport, setViewport] = useState({ vw: 1280, vh: 800 });

  const cachedPinRef = useRef<PinFeedItemDto | null>(pin);
  const cachedStopRef = useRef<number>(stopNumber);
  const cachedBadgeRef = useRef<string | null>(frontBadgeText ?? null);
  const cachedOriginRef = useRef<CardOriginRect | null>(originRect);
  if (pin) cachedPinRef.current = pin;
  if (stopNumber > 0) cachedStopRef.current = stopNumber;
  if (frontBadgeText !== undefined) cachedBadgeRef.current = frontBadgeText;
  if (originRect) {
    cachedOriginRef.current = originRect;
  } else if (isOpen) {
    cachedOriginRef.current = null;
  }

  const lastHeroRectRef = useRef<HeroTargetRect | null>(null);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalShellRef = useRef<HTMLDivElement | null>(null);
  const frontClipStageRef = useRef<HTMLDivElement | null>(null);
  const frontCardRef = useRef<HTMLDivElement | null>(null);
  const backPhotoRef = useRef<HTMLDivElement | null>(null);
  const navClipBottomRef = useRef<number>(0);
  const animsRef = useRef<Animation[]>([]);
  const runIdRef = useRef(0);
  const onAfterCloseRef = useRef(onAfterClose);
  onAfterCloseRef.current = onAfterClose;

  const cancelAnimations = useCallback(() => {
    for (const anim of animsRef.current) {
      try {
        anim.cancel();
      } catch {
        // Ignore if already finished/detached
      }
    }
    animsRef.current = [];
  }, []);

  useEffect(() => {
    setMounted(true);
    const syncVp = () => {
      setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    };
    syncVp();
    window.addEventListener("resize", syncVp, { passive: true });
    return () => {
      window.removeEventListener("resize", syncVp);
      cancelAnimations();
    };
  }, [cancelAnimations]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Trigger stage transitions when `isOpen` changes
  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;
    runIdRef.current += 1;

    if (isOpen && cachedPinRef.current) {
      if (prefersReducedMotion || !cachedOriginRef.current) {
        cancelAnimations();
        setStage("open");
        return;
      }
      setStage("opening");
      return;
    }

    if (!isOpen && stage !== "idle") {
      // Snapshot the exact live Hero Photo rect BEFORE switching into closing state!
      const liveRect = measureLiveHeroRect(modalShellRef.current);
      if (liveRect) {
        lastHeroRectRef.current = liveRect;
      }
      if (prefersReducedMotion || !cachedOriginRef.current) {
        cancelAnimations();
        setStage("idle");
        onAfterCloseRef.current();
        return;
      }
      setStage("closing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted]);

  // Run synchronized compositor-thread WAAPI animations BEFORE first paint;
  // ONLY cancel finished animations AFTER React commits "open" or "idle" (ZERO flicker!).
  useIsomorphicLayoutEffect(() => {
    if (stage === "open" || stage === "idle") {
      if (stage === "open") {
        const liveRect = measureLiveHeroRect(modalShellRef.current);
        if (liveRect) lastHeroRectRef.current = liveRect;
      }
      cancelAnimations();
      return;
    }

    const currentRunId = runIdRef.current;
    const backdropEl = backdropRef.current;
    const modalEl = modalShellRef.current;
    const frontEl = frontCardRef.current;
    const backEl = backPhotoRef.current;
    const origin = cachedOriginRef.current;

    if (
      !frontEl ||
      !backEl ||
      !origin ||
      typeof frontEl.animate !== "function"
    ) {
      cancelAnimations();
      if (stage === "opening") {
        setStage("open");
      } else {
        setStage("idle");
        onAfterCloseRef.current();
      }
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const direction = stage === "opening" ? "open" : "close";

    // Lock exact Mobile Bottom Nav clip line BEFORE first paint so the deck card slides smoothly
    // out from behind / tucks smoothly behind the 5-icon Bottom Nav Bar (ZERO overlap over nav icons!)
    const clipPx = measureMobileBottomNavClipPx(vh);
    navClipBottomRef.current = clipPx;
    if (frontClipStageRef.current) {
      frontClipStageRef.current.style.clipPath =
        clipPx > 0 ? `inset(0px 0px ${clipPx}px 0px)` : "none";
    }

    // Measure exact live Hero Photo rect from rendered Modal DOM (fallback to accurate estimate if chunk loading)
    const measuredHero = measureLiveHeroRect(modalEl);
    const heroTarget =
      measuredHero ??
      (direction === "close" ? lastHeroRectRef.current : null) ??
      getEstimatedHeroRect(vw, vh);

    lastHeroRectRef.current = heroTarget;

    // Sync Back Photo box size & radius to the exact measured Hero Photo slot BEFORE painting!
    backEl.style.width = `${heroTarget.width}px`;
    backEl.style.height = `${heroTarget.height}px`;
    backEl.style.marginLeft = `${-heroTarget.width / 2}px`;
    backEl.style.marginTop = `${-heroTarget.height / 2}px`;
    backEl.style.borderRadius = `${heroTarget.radius}px`;

    const duration =
      direction === "open" ? OPEN_DURATION_MS : CLOSE_DURATION_MS;

    const { frontFrames, backFrames } = buildHeroImageFlipKeyframes(
      origin,
      heroTarget,
      direction
    );

    cancelAnimations();

    const activeAnims: Animation[] = [];

    // 1. Calm Backdrop Scrim fade
    if (backdropEl && typeof backdropEl.animate === "function") {
      const scrimAnim = backdropEl.animate(
        direction === "open"
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: direction === "open" ? 400 : 360,
          easing:
            direction === "open"
              ? "cubic-bezier(0.22, 1, 0.36, 1)"
              : "cubic-bezier(0.32, 0.72, 0, 1)",
          fill: "forwards",
        }
      );
      activeAnims.push(scrimAnim);
    }

    // 2. Surrounding Modal Shell gently appears around the flipping photo (or fades out cleanly on close!)
    if (modalEl && typeof modalEl.animate === "function") {
      const modalAnim = modalEl.animate(
        direction === "open"
          ? [
              { offset: 0, opacity: 0 },
              { offset: 0.22, opacity: 0 },
              { offset: 0.92, opacity: 1 },
              { offset: 1, opacity: 1 },
            ]
          : [
              { offset: 0, opacity: 1 },
              { offset: 0.54, opacity: 0 },
              { offset: 1, opacity: 0 },
            ],
        {
          duration,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
      activeAnims.push(modalAnim);
    }

    // 3. Hero Photo Card 3D Flip + Simultaneous Expand directly into/out of Hero Photo slot!
    const frontAnim = frontEl.animate(frontFrames, {
      duration,
      fill: "forwards",
    });
    const backAnim = backEl.animate(backFrames, {
      duration,
      fill: "forwards",
    });

    activeAnims.push(frontAnim, backAnim);
    animsRef.current = activeAnims;

    // Keep `fill: "forwards"` frozen until React commits the next stage (zero flicker!)
    backAnim.onfinish = () => {
      if (runIdRef.current !== currentRunId) return;
      if (direction === "open") {
        setStage("open");
      } else {
        setStage("idle");
        onAfterCloseRef.current();
      }
    };

    return () => {
      backAnim.onfinish = null;
    };
  }, [stage, cancelAnimations]);

  const shouldRender =
    mounted && stage !== "idle" && Boolean(cachedPinRef.current);
  useBodyScrollLock(shouldRender);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onRequestClose]);

  if (!shouldRender || !cachedPinRef.current) return null;

  const displayPin = cachedPinRef.current;
  const isTh = language === "th";
  const hotelName = isTh ? displayPin.hotelNameTh : displayPin.hotelNameEn;
  const discountHeadline = getDealDiscountHeadline(displayPin, language);
  const dealPrice = displayPin.promoDealPriceThb ?? displayPin.nightlyPriceThb;

  const { vw, vh } = viewport;
  const fallbackOrigin: CardOriginRect = {
    left: Math.round((vw - 214) / 2),
    top: Math.round(vh - 256),
    width: 214,
    height: 292,
  };
  const origin = cachedOriginRef.current ?? fallbackOrigin;
  const targetModal = getTargetModalSize(vw, vh);
  const initialHero = lastHeroRectRef.current ?? getEstimatedHeroRect(vw, vh);

  const originCx = origin.left + origin.width * 0.5;
  const originCy = origin.top + origin.height * 0.5;
  const heroCx = initialHero.left + initialHero.width * 0.5;
  const heroCy = initialHero.top + initialHero.height * 0.5;

  const isAnimating = stage === "opening" || stage === "closing";
  const isDesktop = vw >= 1024;
  const activeNavClipPx = isDesktop
    ? 0
    : navClipBottomRef.current || measureMobileBottomNavClipPx(vh);

  const cardImgUrl = getOptimizedPinImageUrl(displayPin.coverImageUrl, "card");
  const cardImgSrcSet = getOptimizedPinImageSrcSet(
    displayPin.coverImageUrl,
    "card"
  );
  const heroImgUrl = getOptimizedPinImageUrl(displayPin.coverImageUrl, "hero");
  const heroImgSrcSet = getOptimizedPinImageSrcSet(
    displayPin.coverImageUrl,
    "hero"
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "รายละเอียดโปรโมชั่น" : "Promotion details"}
      onClick={() => {
        if (stage === "open") onRequestClose();
      }}
      className="fixed inset-0 z-[85] flex items-center justify-center p-0 lg:p-6 overflow-hidden"
    >
      {/* 1. Calm Backdrop Scrim (Zero backdrop-blur over WebGL -> locked 120fps) */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        style={{
          opacity: stage === "open" || stage === "closing" ? 1 : 0,
        }}
        className="fixed inset-0 z-10 bg-black/55 pointer-events-none"
      />

      {/* 2. REAL MODAL SHELL (Gently fades in around the flipping Hero Photo; ZERO transform!) */}
      <div
        ref={modalShellRef}
        data-flip-hero-hidden={isAnimating ? "true" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isDesktop ? `${targetModal.width}px` : "100%",
          height: isDesktop ? `${targetModal.height}px` : "100dvh",
          borderRadius: `${targetModal.radius}px`,
          opacity: stage === "open" || stage === "closing" ? 1 : 0,
          pointerEvents: stage === "open" ? "auto" : "none",
        }}
        className="relative z-20 bg-[var(--color-background-body)] lg:border border-black/[0.08] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-y-auto px-0 lg:px-7 py-0 lg:py-6"
      >
        <div className="w-full min-h-full">
          {children ? (
            children
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="/brand/nondi-icon-with-text-black.svg"
                alt="Nondii"
                draggable={false}
                className="h-[34px] sm:h-[38px] w-auto object-contain opacity-90 animate-pulse dark:invert"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. FLOATING 3D HERO PHOTO FLIP LAYER (z-30, ABOVE MODAL SHELL — FLIPS PHOTO ONLY!) */}
      {isAnimating && (
        <>
          {/* FRONT FACE STAGE — Clipped cleanly at Mobile Bottom Nav top border so card glides
              out from behind / tucks back behind the 5-icon Bottom Nav Bar without covering it! */}
          <div
            ref={frontClipStageRef}
            aria-hidden="true"
            style={{
              clipPath:
                activeNavClipPx > 0
                  ? `inset(0px 0px ${activeNavClipPx}px 0px)`
                  : undefined,
            }}
            className="fixed inset-0 z-30 pointer-events-none overflow-hidden"
          >
            {/* FRONT FACE — Matches exact Semicircular Coupon Cutouts + Adaptive Bevel Rim + True-Color Deck Card */}
            <div
              ref={frontCardRef}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: `${origin.width}px`,
                height: `${origin.height}px`,
                marginLeft: `${-origin.width / 2}px`,
                marginTop: `${-origin.height / 2}px`,
                transform: `translate3d(${originCx.toFixed(2)}px, ${originCy.toFixed(2)}px, 0) perspective(1400px) rotateY(0deg) scale3d(1, 1, 1)`,
                opacity: stage === "opening" ? 1 : 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform, opacity",
              }}
              className="cgr-fanned-coupon-wrap"
            >
              <div className="relative w-full h-full rounded-[22px] sm:rounded-[24px] overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={cardImgUrl}
                  srcSet={cardImgSrcSet}
                  sizes={PIN_IMAGE_SIZES.card}
                  alt={hotelName}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute top-0 left-0 z-10">
                  <PlaceCategoryCrest
                    category={displayPin.placeCategory}
                    language={language}
                    corner="top-left"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BACK FACE STAGE — Unclipped full-viewport layer for Hero Photo landing into Modal slot */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 pointer-events-none overflow-hidden"
          >
            {/* BACK FACE — Full-Color Vibrant Hero Photo Landing Directly Into Modal Hero Slot */}
            <div
              ref={backPhotoRef}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: `${initialHero.width}px`,
                height: `${initialHero.height}px`,
                marginLeft: `${-initialHero.width / 2}px`,
                marginTop: `${-initialHero.height / 2}px`,
                borderRadius: `${initialHero.radius}px`,
                transform: `translate3d(${heroCx.toFixed(2)}px, ${heroCy.toFixed(2)}px, 0) perspective(1400px) rotateY(0deg) scale3d(1, 1, 1)`,
                opacity: stage === "closing" ? 1 : 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform, opacity",
              }}
              className="overflow-hidden bg-[#181818] shadow-[var(--shadow-popover)]"
            >
              {/* Cached card photo underneath guarantees instant paint even on cold slow networks */}
              <img
                src={cardImgUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <img
                src={heroImgUrl}
                srcSet={heroImgSrcSet}
                sizes={PIN_IMAGE_SIZES.hero}
                alt={hotelName}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
