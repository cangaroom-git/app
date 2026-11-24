"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import { PlaceProfileSkeleton } from "@/components/hotel/PlaceProfileSkeleton";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface RouteHeroTargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  borderRadiusCss?: string;
}

export interface ActivePlaceFlipTransition {
  id: number;
  slug: string;
  pin: PinFeedItemDto;
  originRect: CardOriginRect;
  hasNearbyBackBar: boolean;
}

interface PlaceCardFlipOverlayProps {
  transition: ActivePlaceFlipTransition | null;
  readyHero: { slug: string; rect: RouteHeroTargetRect } | null;
  language: LanguageCode;
  onComplete: (id: number) => void;
}

const FLIP_DURATION_MS = 460;
const KEYFRAME_SAMPLES = 32;
const MAX_WAIT_AFTER_FLIP_MS = 8000;

class CubicBezierCurve {
  private readonly ax: number;
  private readonly bx: number;
  private readonly cx: number;
  private readonly ay: number;
  private readonly by: number;
  private readonly cy: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.cx = 3 * x1;
    this.bx = 3 * (x2 - x1) - this.cx;
    this.ax = 1 - this.cx - this.bx;
    this.cy = 3 * y1;
    this.by = 3 * (y2 - y1) - this.cy;
    this.ay = 1 - this.cy - this.by;
  }

  private sampleX(t: number): number {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  }

  private sampleY(t: number): number {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  }

  private solveTForX(x: number): number {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) * 0.5;
      if (this.sampleX(mid) < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) * 0.5;
  }

  atProgress(u: number): number {
    const clamped = Math.max(0, Math.min(1, u));
    return this.sampleY(this.solveTForX(clamped));
  }

  uForValue(targetY: number): number {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) * 0.5;
      if (this.atProgress(mid) < targetY) lo = mid;
      else hi = mid;
    }
    return (lo + hi) * 0.5;
  }
}

// Balanced symmetric S-curve: midpoint (p = 0.5 / 90deg edge crossing) lands cleanly near u = 0.45
// so 3D rotation, arc translation, and expansion stay 100% synchronized from start to landing!
const MASTER_EASE = new CubicBezierCurve(0.42, 0, 0.22, 1);

/**
 * Deterministic hero rectangle matching the EXACT Left 2×2 Primary Hero Photo slot
 * inside the full-width `1120px` Airbnb 5-Photo Mosaic on `/{slug}` (Desktop/Tablet)
 * and the top full-bleed `aspect-square` Hero Carousel on Mobile (`< 640px`).
 * Uses `document.documentElement.clientWidth` (excludes scrollbar!) for 0px horizontal drift.
 */
function estimateProfileHeroRect(
  cw: number,
  hasNearbyBackBar: boolean
): RouteHeroTargetRect {
  if (cw >= 1024) {
    const sidebarW = 72;
    const availW = cw - sidebarW - 64; // px-8 each side
    const containerW = Math.min(1120, Math.max(640, availW));
    const containerLeft = sidebarW + (cw - sidebarW - containerW) / 2;
    const mosaicH = containerW / 2; // aspect-[2/1]
    const leftSlotW = (containerW - 8) / 2; // col-span-2 of 4-col grid minus gap-2 (8px)
    // 64px top bar + 20px pt-5 + 36px h-9 title row + 16px sm:space-y-4 = 136px
    const topBase = 136 + (hasNearbyBackBar ? 56 : 0);
    return {
      left: containerLeft,
      top: topBase,
      width: leftSlotW,
      height: mosaicH,
      radius: 16,
      borderRadiusCss: "16px 0px 0px 16px",
    };
  }

  if (cw >= 640) {
    const availW = cw - 48; // px-6 each side
    const mosaicH = availW / 2;
    const leftSlotW = (availW - 8) / 2;
    // 20px sm:pt-5 + 36px h-9 title row + 16px sm:space-y-4 = 72px
    // Back bar (when present): 36px h-9 + 4px pb-1 + 16px sm:space-y-4 = 56px
    const topBase = 72 + (hasNearbyBackBar ? 56 : 0);
    return {
      left: 24,
      top: topBase,
      width: leftSlotW,
      height: mosaicH,
      radius: 12,
      borderRadiusCss: "12px 0px 0px 12px",
    };
  }

  // Mobile (< 640px): full-bleed `-mx-4 -mt-4 aspect-square` top hero carousel
  return {
    left: 0,
    top: 0,
    width: cw,
    height: cw,
    radius: 0,
    borderRadiusCss: "0px",
  };
}

function buildCrossRouteFlipKeyframes(
  origin: CardOriginRect,
  heroTarget: RouteHeroTargetRect
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
    const p = MASTER_EASE.atProgress(u);
    const cx = originCx + (targetCx - originCx) * p;
    const cy = originCy + (targetCy - originCy) * p - Math.sin(p * Math.PI) * 18;
    const isFrontVisible = u <= uMid;

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

    const pBack = Math.min(1, Math.max(0.5, p));
    const q = (pBack - 0.5) * 2;
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
 * Persistent Root Cross-Route 3D Card Flip Overlay (Lives in HotelAppShell — Never Unmounts!):
 * - Launches at 0ms from ANY clicked card's exact `getBoundingClientRect()` on /, /style, /explore, /trip.
 * - Flips cleanly in 3D (`0deg -> +90deg -> -90deg -> 0deg`) directly onto the top 3:4 Hero slot of `/{slug}`.
 * - Waits calmly on the landed Hero frame if SSR is still streaming, then cross-fades cleanly once `/{slug}` paints!
 */
export function PlaceCardFlipOverlay({
  transition,
  readyHero,
  language,
  onComplete,
}: PlaceCardFlipOverlayProps) {
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const frontCardRef = useRef<HTMLDivElement | null>(null);
  const backPhotoRef = useRef<HTMLDivElement | null>(null);
  const [flipDoneForId, setFlipDoneForId] = useState<number | null>(null);

  // Freeze the launch target per transition ID so mid-flight `readyHero` React re-renders
  // NEVER mutate `backPhotoRef` dimensions out from under the running WAAPI keyframes!
  // Also account for the OS vertical scrollbar width so launching from scrollbar-less
  // fixed stages (/trip/[id], /explore) matches the exact scrollable `/{slug}` clientWidth!
  const lockedLaunchRef = useRef<{
    id: number;
    rect: RouteHeroTargetRect;
    isDesktopOrTablet: boolean;
    destClientWidth: number;
  } | null>(null);

  const expectedDestCw = (() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return 1280;
    }
    const curCw = document.documentElement.clientWidth;
    const osScrollbarW =
      Number(document.documentElement.dataset.scrollbarWidth || "0") || 0;
    // Destination `/{slug}` is always vertically scrollable (>100vh), so on OSes with
    // layout-consuming scrollbars (Windows / macOS external mouse), its clientWidth is
    // always `window.innerWidth - osScrollbarW` even when launching from a fixed 100vh page.
    if (osScrollbarW > 0 && window.innerWidth > 0) {
      return Math.min(curCw, window.innerWidth - osScrollbarW);
    }
    return curCw;
  })();

  if (transition) {
    if (!lockedLaunchRef.current || lockedLaunchRef.current.id !== transition.id) {
      lockedLaunchRef.current = {
        id: transition.id,
        rect: estimateProfileHeroRect(expectedDestCw, transition.hasNearbyBackBar),
        isDesktopOrTablet: expectedDestCw >= 640,
        destClientWidth: expectedDestCw,
      };
    }
  } else {
    lockedLaunchRef.current = null;
  }

  const isRouteReadyForTransition = Boolean(
    transition &&
      readyHero &&
      readyHero.slug.toLowerCase() === transition.slug.toLowerCase()
  );

  const targetRect: RouteHeroTargetRect | null =
    lockedLaunchRef.current?.rect ?? null;
  const isDesktopOrTablet =
    lockedLaunchRef.current?.isDesktopOrTablet ?? expectedDestCw >= 640;
  const destClientWidth =
    lockedLaunchRef.current?.destClientWidth ?? expectedDestCw;

  // Run 120fps WAAPI 3D flip immediately upon transition start
  useLayoutEffect(() => {
    if (!transition || !targetRect) {
      setFlipDoneForId(null);
      return;
    }

    setFlipDoneForId(null);

    const curtainEl = curtainRef.current;
    const frontEl = frontCardRef.current;
    const backEl = backPhotoRef.current;
    if (!curtainEl || !frontEl || !backEl) return;

    const anims: Animation[] = [];
    const { frontFrames, backFrames } = buildCrossRouteFlipKeyframes(
      transition.originRect,
      targetRect
    );

    const curtainAnim = curtainEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 210,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    });
    const frontAnim = frontEl.animate(frontFrames, {
      duration: FLIP_DURATION_MS,
      easing: "linear",
      fill: "forwards",
    });
    const backAnim = backEl.animate(backFrames, {
      duration: FLIP_DURATION_MS,
      easing: "linear",
      fill: "forwards",
    });

    anims.push(curtainAnim, frontAnim, backAnim);

    let cancelled = false;
    void Promise.all(
      anims.map((a) => a.finished.catch(() => undefined))
    ).then(() => {
      if (cancelled) return;
      setFlipDoneForId(transition.id);
    });

    return () => {
      cancelled = true;
      anims.forEach((a) => {
        try {
          a.cancel();
        } catch {
          // ignore
        }
      });
    };
    // Intentionally keyed ONLY on transition.id so a late readyHero update doesn't restart the flip mid-air!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition?.id]);

  // Pixel-Exact Zero-Snap Handoff:
  // Once flip has landed AND destination `/{slug}` Hero is painted underneath (2 rAFs):
  // 1) If live measured `readyHero.rect` differs by >0.5px (e.g., 2-line title), glide smoothly
  //    to the exact live rect during the 160ms curtain reveal so there is ZERO jump on unmount!
  // 2) Fade ONLY `curtainRef` (`1 -> 0`) revealing the 4 right mosaic tiles & page around the landed Hero.
  useEffect(() => {
    if (!transition || !targetRect || flipDoneForId !== transition.id) return;

    let cancelled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;
    let finishTimer: number | null = null;
    const activeAnims: Animation[] = [];

    const runSeamlessCurtainReveal = () => {
      raf1 = window.requestAnimationFrame(() => {
        if (cancelled) return;
        raf2 = window.requestAnimationFrame(() => {
          if (cancelled) return;
          const curtainEl = curtainRef.current;
          const backEl = backPhotoRef.current;
          const liveRect =
            isRouteReadyForTransition && readyHero ? readyHero.rect : targetRect;

          // Micro-settle backPhotoRef onto exact live DOM rect if >0.5px delta
          if (
            backEl &&
            (Math.abs(liveRect.left - targetRect.left) > 0.5 ||
              Math.abs(liveRect.top - targetRect.top) > 0.5 ||
              Math.abs(liveRect.width - targetRect.width) > 0.5 ||
              Math.abs(liveRect.height - targetRect.height) > 0.5)
          ) {
            const fromCx = targetRect.left + targetRect.width * 0.5;
            const fromCy = targetRect.top + targetRect.height * 0.5;
            const toCx = liveRect.left + liveRect.width * 0.5;
            const toCy = liveRect.top + liveRect.height * 0.5;
            const sx = liveRect.width / Math.max(1, targetRect.width);
            const sy = liveRect.height / Math.max(1, targetRect.height);
            const settleAnim = backEl.animate(
              [
                {
                  transform: `translate3d(${fromCx.toFixed(2)}px, ${fromCy.toFixed(2)}px, 0) scale3d(1, 1, 1)`,
                },
                {
                  transform: `translate3d(${toCx.toFixed(2)}px, ${toCy.toFixed(2)}px, 0) scale3d(${sx.toFixed(4)}, ${sy.toFixed(4)}, 1)`,
                },
              ],
              {
                duration: 160,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                fill: "forwards",
              }
            );
            activeAnims.push(settleAnim);
          }

          if (curtainEl) {
            const curtainFadeAnim = curtainEl.animate(
              [{ opacity: 1 }, { opacity: 0 }],
              {
                duration: 170,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                fill: "forwards",
              }
            );
            activeAnims.push(curtainFadeAnim);
          }

          if (activeAnims.length > 0) {
            void Promise.all(
              activeAnims.map((a) => a.finished.catch(() => undefined))
            ).then(() => {
              if (!cancelled) onComplete(transition.id);
            });
          } else {
            onComplete(transition.id);
          }
        });
      });
    };

    if (isRouteReadyForTransition) {
      runSeamlessCurtainReveal();
    } else {
      finishTimer = window.setTimeout(() => {
        if (!cancelled) runSeamlessCurtainReveal();
      }, MAX_WAIT_AFTER_FLIP_MS);
    }

    return () => {
      cancelled = true;
      if (raf1 !== null) window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      activeAnims.forEach((a) => {
        try {
          a.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [
    flipDoneForId,
    isRouteReadyForTransition,
    onComplete,
    readyHero,
    targetRect,
    transition,
  ]);

  if (!transition || !targetRect || typeof document === "undefined") {
    return null;
  }

  const { pin, originRect } = transition;
  const hotelName = language === "th" ? pin.hotelNameTh : pin.hotelNameEn;
  const cardImgUrl = getOptimizedPinImageUrl(pin.coverImageUrl, "card");
  const cardImgSrcSet = getOptimizedPinImageSrcSet(pin.coverImageUrl, "card");
  const heroImgUrl = getOptimizedPinImageUrl(pin.coverImageUrl, "hero");
  const heroImgSrcSet = getOptimizedPinImageSrcSet(pin.coverImageUrl, "hero");

  const originCx = originRect.left + originRect.width * 0.5;
  const originCy = originRect.top + originRect.height * 0.5;
  const heroCx = targetRect.left + targetRect.width * 0.5;
  const heroCy = targetRect.top + targetRect.height * 0.5;

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[95] pointer-events-none overflow-hidden"
    >
      {/* Clean Page Canvas Curtain + Exact Matching Skeleton (Omits Flipping Hero Slot!) */}
      <div
        ref={curtainRef}
        style={{ opacity: 0 }}
        className="fixed top-0 lg:top-16 left-0 lg:left-[72px] right-0 bottom-0 bg-[var(--color-background-body)] overflow-hidden"
      >
        <div
          style={{
            width:
              destClientWidth >= 1024
                ? `${destClientWidth - 72}px`
                : `${destClientWidth}px`,
          }}
          className="pt-[env(safe-area-inset-top,0px)] lg:pt-0"
        >
          <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
            <PlaceProfileSkeleton
              omitPrimaryHeroSlot={true}
              hasNearbyBackBar={transition.hasNearbyBackBar}
            />
          </div>
        </div>
      </div>

      {/* FRONT FACE: Exact Borderless 3:4 Card Lifting Out of Grid / Deck */}
      <div
        ref={frontCardRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: `${originRect.width}px`,
          height: `${originRect.height}px`,
          marginLeft: `${-originRect.width / 2}px`,
          marginTop: `${-originRect.height / 2}px`,
          transform: `translate3d(${originCx.toFixed(2)}px, ${originCy.toFixed(2)}px, 0) perspective(1400px) rotateY(0deg) scale3d(1, 1, 1)`,
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
              category={pin.placeCategory}
              language={language}
              corner="top-left"
            />
          </div>
        </div>
      </div>

      {/* BACK FACE: Full-Bleed Hero Photo Matching Exact Left 2×2 Mosaic Corner Radius & Crest */}
      <div
        ref={backPhotoRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          marginLeft: `${-targetRect.width / 2}px`,
          marginTop: `${-targetRect.height / 2}px`,
          borderRadius: targetRect.borderRadiusCss ?? `${targetRect.radius}px`,
          transform: `translate3d(${heroCx.toFixed(2)}px, ${heroCy.toFixed(2)}px, 0) perspective(1400px) rotateY(-90deg) scale3d(1, 1, 1)`,
          opacity: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform, opacity",
        }}
        className="overflow-hidden bg-[var(--color-background-muted)]"
      >
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
        {isDesktopOrTablet && (
          <div className="absolute top-0 left-0 z-10 pointer-events-none">
            <PlaceCategoryCrest
              category={pin.placeCategory}
              language={language}
              corner="top-left"
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
