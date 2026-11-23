"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getDealDiscountHeadline,
  getDealPromoOnlyHeadline,
} from "@/components/home/VerticalCouponCard";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface FannedDeckCardItem {
  key: string;
  pin: PinFeedItemDto;
  stopNumber?: number;
}

export interface FannedPhotoCardDeckProps {
  items: FannedDeckCardItem[];
  activeIdx: number;
  language: LanguageCode;
  mode: "trip" | "explore";
  /** Re-runs initial Center-Out spring entry when switching boards */
  deckIdentityKey: string;
  /** Increment on /explore when map bounds settle with a new deal set to trigger Shuffle Deal animation! */
  shuffleKey?: number;
  /** True while user is actively dragging/zooming map on /explore (subtly dips deck for breathing room) */
  isMapMoving?: boolean;
  /** Pin ID currently open in TripCardFlipModal (hides ONLY the clicked center card; siblings stay stationary!) */
  modalOpenPinId?: string | null;
  /** True while Trip Story playback is running (disables Move/action buttons & pauses on tap) */
  isPlayingStory?: boolean;
  /** Enables floating Move button + 1:1 drag reorder (Trip owner mode only) */
  enableReorder?: boolean;
  /** Top-right button behavior on the active center card */
  cardTopAction?: "remove" | "bookmark" | "none";
  savedPinIds?: Set<string>;
  /** Optional visible vertical fraction of the center card (default 1 = 100%; e.g. 0.85 = 85% visible, 15% clipped at bottom) */
  centerVisibleRatio?: number;
  /** Renders a clean solid white bottom backdrop behind the fan deck on Mobile/Tablet (< lg) to separate cards from the map */
  showMobileWhiteBackdrop?: boolean;
  /** Captures horizontal deck swipes across the mobile/tablet bottom backdrop area when backdrop is rendered by parent */
  captureMobileBackdropSwipe?: boolean;
  onSelectIndex: (nextIndex: number) => void;
  onOpenCard: (
    pin: PinFeedItemDto,
    stopNumber: number,
    badgeText: string,
    originRect: CardOriginRect | null
  ) => void;
  onRemovePin?: (pinId: string) => void;
  onToggleSavePin?: (pin: PinFeedItemDto) => void;
  onSwapActiveStop?: (delta: -1 | 1) => Promise<void> | void;
  onInterruptStory?: () => void;
  onReorderModeChange?: (isReorderMode: boolean) => void;
  /** Optional 1:1 vertical pull-down gesture handoff so dragging DOWN anywhere on the fan cards collapses the parent dock sheet */
  onSheetPullMove?: (dy: number) => void;
  onSheetPullEnd?: (dy: number, velocityY: number) => void;
}

/**
 * Exact 5-card symmetric fanned arc geometry with heroic larger center card:
 * - Center card (`rel = 0`): upright `0deg`, `scale = 1.0`, `ty = 0`, anchored flush bottom
 * - Inner pair (`rel = ±1`): `±18deg`, `scale = 0.85`, recessed behind center
 * - Outer pair (`rel = ±2`): `±34deg`, `scale = 0.75`, deeper receding arc
 * - Beyond `±2.2`: smoothly sinks below bottom edge
 */
function computeFanSlotPose(
  rel: number,
  cardW: number,
  cardH: number
): { tx: number; ty: number; rot: number; scale: number } {
  const sign = rel < 0 ? -1 : 1;
  const a = Math.abs(rel);

  let xRatio: number;
  let yRatio: number;
  let deg: number;
  let scale: number;

  if (a <= 1) {
    xRatio = a * 0.61;
    yRatio = a * 0.165;
    deg = a * 18;
    scale = 1 - a * 0.15; // 1.0 -> 0.85
  } else if (a <= 2) {
    const t = a - 1;
    xRatio = 0.61 + t * 0.45;
    yRatio = 0.165 + t * 0.195;
    deg = 18 + t * 16;
    scale = 0.85 - t * 0.1; // 0.85 -> 0.75
  } else {
    const t = a - 2;
    xRatio = 1.06 + t * 0.32;
    yRatio = 0.36 + t * 0.52;
    deg = 34 + t * 14;
    scale = Math.max(0.68, 0.75 - t * 0.06);
  }

  return {
    tx: sign * xRatio * cardW,
    ty: yRatio * cardH,
    rot: sign * deg,
    scale,
  };
}

export function buildDeckCardBadgeText(
  pin: PinFeedItemDto,
  mode: "trip" | "explore",
  language: LanguageCode,
  stopNumber: number
): string {
  const isTh = language === "th";
  const discountHeadline = getDealDiscountHeadline(pin, language);
  if (mode === "trip") {
    return `#${stopNumber} · ${discountHeadline}`;
  }
  const sourceLabel =
    pin.dealSourceType === "EXTERNAL"
      ? pin.externalSourceName || (isTh ? "ดีลพิเศษ" : "Partner")
      : isTh
      ? "จองตรง 0% GP"
      : "0% GP";
  return `${discountHeadline} · ${sourceLabel}`;
}

/**
 * Unified Nondii Fanned Photo Card Deck Engine (Shared by `/trip`, `/trip/[slug]`, and `/explore`):
 * - Adaptive Photo-Through Bevel Rim (`.cgr-trip-card-rim` + `.cgr-trip-card-lighting`), true-color photos, zero star rating
 * - Center-Out Staggered Spring Entry Bounce (`0ms -> 90ms -> 180ms`)
 * - Outermost Entering Card (`+2 / -2`) Diagonal Bottom-Up Bounce (`.cgr-fan-outer-pop-in`), auto-cleared so zero bounce on modal close
 * - Optional Auto-Shuffle Deal Transition (`shuffleKey`) for `/explore` map pan/zoom
 * - Optional Single-Card Lift Reorder Mode (`enableReorder`) for `/trip` owners
 * - Pixel-locked `visibility: hidden` handoff to Shared-Element 3D Hero Flip Modal (all sibling cards remain stationary!)
 */
export function FannedPhotoCardDeck({
  items,
  activeIdx,
  language,
  mode,
  deckIdentityKey,
  shuffleKey,
  isMapMoving = false,
  modalOpenPinId = null,
  isPlayingStory = false,
  enableReorder = false,
  cardTopAction = "none",
  savedPinIds,
  centerVisibleRatio = 1,
  showMobileWhiteBackdrop = false,
  captureMobileBackdropSwipe = false,
  onSelectIndex,
  onOpenCard,
  onRemovePin,
  onToggleSavePin,
  onSwapActiveStop,
  onInterruptStory,
  onReorderModeChange,
  onSheetPullMove,
  onSheetPullEnd,
}: FannedPhotoCardDeckProps) {
  const isTh = language === "th";
  const isModalActive = Boolean(modalOpenPinId);

  // Always initialize to deterministic SSR width (1280) and sync real window.innerWidth inside useEffect
  // so Mobile SSR hydration matches 100% with ZERO React hydration mismatch!
  const [viewportWidth, setViewportWidth] = useState<number>(1280);

  // Entry & Shuffle Deal staging states (decoupled displayActiveIdx prevents teleporting during shuffles or far map-pin jumps!)
  const [renderedItems, setRenderedItems] =
    useState<FannedDeckCardItem[]>(items);
  const [displayActiveIdx, setDisplayActiveIdx] = useState<number>(activeIdx);
  const [hasEntered, setHasEntered] = useState(false);
  const [entrySettled, setEntrySettled] = useState(false);
  const [isShufflingOut, setIsShufflingOut] = useState(false);

  // Outermost entering card bottom-up bounce tracking
  const [outerPopIn, setOuterPopIn] = useState<{
    key: string;
    seq: number;
  } | null>(null);
  const slideSeqRef = useRef(0);
  const outerPopInTimerRef = useRef<number | null>(null);
  const prevDisplayIdxRef = useRef(activeIdx);
  const prevShuffleKeyRef = useRef(shuffleKey);
  const prevIsMapMovingRef = useRef(isMapMoving);
  const shuffleTimersRef = useRef<number[]>([]);
  const isShufflingOutRef = useRef(false);
  isShufflingOutRef.current = isShufflingOut;

  // Swipe / live drag / Move Reorder state
  const [dragDx, setDragDx] = useState(0);
  const [isDraggingDeck, setIsDraggingDeck] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderDragX, setReorderDragX] = useState(0);
  const deckGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    axis: "horizontal" | "vertical" | null;
    samples: Array<{ x: number; y: number; t: number }>;
  } | null>(null);
  const suppressDeckClickRef = useRef(false);

  const latestItemsRef = useRef(items);
  latestItemsRef.current = items;
  const latestActiveIdxRef = useRef(activeIdx);
  latestActiveIdxRef.current = activeIdx;
  const renderedItemsRef = useRef(renderedItems);
  renderedItemsRef.current = renderedItems;

  const clearShuffleTimers = useCallback(() => {
    for (const id of shuffleTimersRef.current) {
      window.clearTimeout(id);
    }
    shuffleTimersRef.current = [];
  }, []);

  /**
   * Smooth 2-beat Dip-Down -> Center-Out Spring Deal choreography:
   * Locks old cards & old active index while dipping down (`140ms`), then swaps
   * both `renderedItems` and `displayActiveIdx` atomically before springing up!
   */
  const runDipAndDealTransition = useCallback(() => {
    clearShuffleTimers();
    if (outerPopInTimerRef.current !== null) {
      window.clearTimeout(outerPopInTimerRef.current);
      outerPopInTimerRef.current = null;
    }
    setOuterPopIn(null);
    isShufflingOutRef.current = true;
    setIsShufflingOut(true);
    setEntrySettled(false);

    const swapTimer = window.setTimeout(() => {
      const nextItems = latestItemsRef.current;
      const nextIdx = latestActiveIdxRef.current;
      prevDisplayIdxRef.current = nextIdx;
      isShufflingOutRef.current = false;
      setRenderedItems(nextItems);
      setDisplayActiveIdx(nextIdx);
      setHasEntered(false);
      setIsShufflingOut(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasEntered(true);
        });
      });

      const settleTimer = window.setTimeout(() => {
        setEntrySettled(true);
      }, 740);
      shuffleTimersRef.current.push(settleTimer);
    }, 140);

    shuffleTimersRef.current.push(swapTimer);
  }, [clearShuffleTimers]);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== "undefined") {
        setViewportWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth, { passive: true });
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    return () => {
      clearShuffleTimers();
      if (outerPopInTimerRef.current !== null) {
        window.clearTimeout(outerPopInTimerRef.current);
      }
    };
  }, [clearShuffleTimers]);

  // Keep Move Mode disabled if list shrinks to <= 1 or reorder disabled
  useEffect(() => {
    if ((!enableReorder || renderedItems.length <= 1) && isReorderMode) {
      setIsReorderMode(false);
      onReorderModeChange?.(false);
    }
  }, [enableReorder, isReorderMode, onReorderModeChange, renderedItems.length]);

  const setReorderModeSynced = useCallback(
    (next: boolean) => {
      setIsReorderMode(next);
      setReorderDragX(0);
      onReorderModeChange?.(next);
    },
    [onReorderModeChange]
  );

  // Initial Center-Out Staggered Spring Entry Bounce when deck identity mounts/changes
  useEffect(() => {
    clearShuffleTimers();
    setIsShufflingOut(false);
    const startIdx = latestActiveIdxRef.current;
    prevDisplayIdxRef.current = startIdx;
    setRenderedItems(latestItemsRef.current);
    setDisplayActiveIdx(startIdx);
    setHasEntered(false);
    setEntrySettled(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setHasEntered(true);
      });
    });
    const settleTimer = window.setTimeout(() => {
      setEntrySettled(true);
    }, 820);
    shuffleTimersRef.current.push(settleTimer);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearShuffleTimers();
    };
  }, [deckIdentityKey, clearShuffleTimers]);

  // Sync `items` immediately whenever NOT in an active shuffle transition (or when shuffleKey is unused)
  // NOTE: Runs BEFORE the `isMapMoving` effect so `prevIsMapMovingRef.current` still accurately tells us
  // whether the deck was ALREADY tucked beneath the bottom edge when `shuffleKey` & `isMapMoving=false` batch together!
  useEffect(() => {
    if (shuffleKey === undefined) {
      setRenderedItems(items);
      return;
    }

    if (prevShuffleKeyRef.current === shuffleKey) {
      // Same shuffle cohort (e.g. optimistic save/like toggle on an existing card): update in place cleanly!
      if (!isShufflingOutRef.current) {
        setRenderedItems(items);
      }
      return;
    }

    // NEW Shuffle Deal triggered by map pan/zoom, manual shuffle, or edge pin click!
    prevShuffleKeyRef.current = shuffleKey;

    // If the deck was ALREADY tucked beneath the bottom edge during map drag/zoom,
    // swap immediately with ZERO redundant dip-out delay so the new deck springs straight up in 1 fluid motion!
    if (prevIsMapMovingRef.current || isMapMoving) {
      clearShuffleTimers();
      if (outerPopInTimerRef.current !== null) {
        window.clearTimeout(outerPopInTimerRef.current);
        outerPopInTimerRef.current = null;
      }
      setOuterPopIn(null);
      isShufflingOutRef.current = false;
      setIsShufflingOut(false);
      setEntrySettled(false);

      const nextItems = latestItemsRef.current;
      const nextIdx = latestActiveIdxRef.current;
      prevDisplayIdxRef.current = nextIdx;
      setRenderedItems(nextItems);
      setDisplayActiveIdx(nextIdx);
      setHasEntered(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasEntered(true);
        });
      });

      const settleTimer = window.setTimeout(() => {
        setEntrySettled(true);
      }, 740);
      shuffleTimersRef.current.push(settleTimer);
      return;
    }

    runDipAndDealTransition();
  }, [items, shuffleKey, isMapMoving, clearShuffleTimers, runDipAndDealTransition]);

  // Full Tuck-Away on Map Drag/Zoom -> Seamless Continuous Center-Out Rise on Stop
  useEffect(() => {
    const wasMoving = prevIsMapMovingRef.current;
    prevIsMapMovingRef.current = isMapMoving;

    if (isMapMoving && !isModalActive) {
      clearShuffleTimers();
      if (outerPopInTimerRef.current !== null) {
        window.clearTimeout(outerPopInTimerRef.current);
        outerPopInTimerRef.current = null;
      }
      setOuterPopIn(null);
      setEntrySettled(false);
      return;
    }

    if (wasMoving && !isMapMoving && !isShufflingOutRef.current) {
      // Returning from tucked map-drag state -> allow Center-Out spring settle!
      const settleTimer = window.setTimeout(() => {
        setEntrySettled(true);
      }, 740);
      shuffleTimersRef.current.push(settleTimer);
    }
  }, [isMapMoving, isModalActive, clearShuffleTimers]);

  // Sync `activeIdx` -> `displayActiveIdx`:
  // - Nearby shifts (`<= 3` slots, covered by `absRel <= 4.15` pre-mount buffer): instant live horizontal fan glide!
  // - Far map-pin jumps (`>= 4` slots across deck): smooth Dip-Down -> Center-Out Spring Deal (ZERO teleporting!)
  useEffect(() => {
    if (isShufflingOutRef.current) return;
    if (activeIdx === displayActiveIdx) return;

    const dist = Math.abs(activeIdx - displayActiveIdx);
    if (dist >= 4 && entrySettled && !isReorderMode && !isModalActive) {
      runDipAndDealTransition();
      return;
    }

    setDisplayActiveIdx(activeIdx);
  }, [
    activeIdx,
    displayActiveIdx,
    entrySettled,
    isModalActive,
    isReorderMode,
    runDipAndDealTransition,
  ]);

  // Always clear outerPopIn when opening a modal (prevents bounce on modal close!)
  useEffect(() => {
    if (modalOpenPinId) {
      if (outerPopInTimerRef.current !== null) {
        window.clearTimeout(outerPopInTimerRef.current);
        outerPopInTimerRef.current = null;
      }
      setOuterPopIn(null);
    }
  }, [modalOpenPinId]);

  // Trigger Outermost Entering Card (+2 / -2) bottom-up bounce whenever displayActiveIdx glides by 1-3 slots
  useEffect(() => {
    const prevIdx = prevDisplayIdxRef.current;
    prevDisplayIdxRef.current = displayActiveIdx;
    if (
      prevIdx === displayActiveIdx ||
      !entrySettled ||
      isReorderMode ||
      isModalActive ||
      isShufflingOut
    ) {
      return;
    }

    if (outerPopInTimerRef.current !== null) {
      window.clearTimeout(outerPopInTimerRef.current);
      outerPopInTimerRef.current = null;
    }

    const dir = displayActiveIdx > prevIdx ? 1 : -1;
    const enteringIdx = displayActiveIdx + dir * 2;
    const enteringItem = renderedItemsRef.current[enteringIdx];
    if (enteringItem) {
      slideSeqRef.current += 1;
      setOuterPopIn({
        key: enteringItem.key,
        seq: slideSeqRef.current,
      });
      outerPopInTimerRef.current = window.setTimeout(() => {
        setOuterPopIn(null);
        outerPopInTimerRef.current = null;
      }, 660);
    } else {
      setOuterPopIn(null);
    }
  }, [displayActiveIdx, entrySettled, isModalActive, isReorderMode, isShufflingOut]);

  // Keyboard navigation (← / →)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        renderedItemsRef.current.length <= 1 ||
        isModalActive ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isReorderMode && enableReorder && onSwapActiveStop) {
          void onSwapActiveStop(1);
        } else {
          onSelectIndex(
            Math.min(renderedItemsRef.current.length - 1, activeIdx + 1)
          );
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isReorderMode && enableReorder && onSwapActiveStop) {
          void onSwapActiveStop(-1);
        } else {
          onSelectIndex(Math.max(0, activeIdx - 1));
        }
      } else if (e.key === "Escape" && isReorderMode) {
        setReorderModeSynced(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeIdx,
    enableReorder,
    isModalActive,
    isReorderMode,
    onSelectIndex,
    onSwapActiveStop,
    setReorderModeSynced,
  ]);

  const isDesktop = viewportWidth >= 1024;
  const isCompactMobile = viewportWidth < 640;
  // Heroic larger center card with exact 3:4 portrait ratio (198x264 mobile · 236x314 tablet/desktop!)
  const cardW = isCompactMobile ? 198 : 236;
  const cardH = isCompactMobile ? 264 : 314;
  const stepX = Math.round(cardW * 0.61);
  const clampedVisibleRatio = Math.max(0.45, Math.min(1, centerVisibleRatio));
  const bottomOffsetPx =
    clampedVisibleRatio < 1
      ? -Math.round(cardH * (1 - clampedVisibleRatio))
      : null;
  const isDeckTuckedByMap = isMapMoving && !isModalActive;

  const safeActiveIdx =
    renderedItems.length === 0
      ? 0
      : Math.max(0, Math.min(renderedItems.length - 1, displayActiveIdx));
  const activeItem = renderedItems[safeActiveIdx] ?? null;

  // Dual-Axis Ultra-Smooth Deck Gesture Handler:
  // - Horizontal -> Continuous 1:1 multi-card swipe with velocity projection (zero snap-back glitch!)
  // - Vertical Downward -> Seamless 1:1 pull-down collapse of parent white dock sheet (zero pull-to-refresh!)
  const handleDeckPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isModalActive) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isPlayingStory) {
      onInterruptStory?.();
    }
    deckGestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
  };

  const handleDeckPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = deckGestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const now = performance.now();

    g.samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (g.samples.length > 2 && now - g.samples[0].t > 105) {
      g.samples.shift();
    }

    if (g.axis === null) {
      if (
        renderedItems.length > 1 &&
        Math.abs(dx) > 6 &&
        Math.abs(dx) >= Math.abs(dy) * 0.9
      ) {
        g.axis = "horizontal";
        setIsDraggingDeck(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      } else if (
        !isReorderMode &&
        onSheetPullMove &&
        Math.abs(dy) > 7 &&
        Math.abs(dy) > Math.abs(dx) * 1.15
      ) {
        g.axis = "vertical";
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }

    if (g.axis === "vertical") {
      if (onSheetPullMove) {
        const resisted = dy < 0 ? dy * 0.28 : Math.min(280, dy);
        onSheetPullMove(resisted);
      }
      return;
    }

    if (g.axis !== "horizontal") return;

    if (isReorderMode && enableReorder && onSwapActiveStop) {
      const swapThreshold = Math.max(62, Math.round(stepX * 0.58));
      if (dx > swapThreshold && safeActiveIdx < renderedItems.length - 1) {
        g.startX = e.clientX;
        setReorderDragX(0);
        void onSwapActiveStop(1);
        return;
      }
      if (dx < -swapThreshold && safeActiveIdx > 0) {
        g.startX = e.clientX;
        setReorderDragX(0);
        void onSwapActiveStop(-1);
        return;
      }

      let clamped = dx;
      if (
        (safeActiveIdx === 0 && dx < 0) ||
        (safeActiveIdx === renderedItems.length - 1 && dx > 0)
      ) {
        clamped = dx * 0.28;
      }
      setReorderDragX(Math.max(-135, Math.min(135, clamped)));
      return;
    }

    // Continuous multi-card 1:1 horizontal tracking with soft rubber-band ONLY past first/last card!
    const maxPositiveDx = safeActiveIdx * stepX;
    const maxNegativeDx = -(renderedItems.length - 1 - safeActiveIdx) * stepX;
    let effectiveDx = dx;
    if (dx > maxPositiveDx) {
      effectiveDx = maxPositiveDx + (dx - maxPositiveDx) * 0.28;
    } else if (dx < maxNegativeDx) {
      effectiveDx = maxNegativeDx + (dx - maxNegativeDx) * 0.28;
    }
    // Keep within smooth ±3.2 card live glide range so cards never clip out of the pre-mounted buffer
    const maxLiveGlide = stepX * 3.2;
    setDragDx(Math.max(-maxLiveGlide, Math.min(maxLiveGlide, effectiveDx)));
  };

  const handleDeckPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = deckGestureRef.current;
    deckGestureRef.current = null;
    if (!g || g.pointerId !== e.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const now = performance.now();
    const samples = g.samples;
    let vx = 0;
    let vy = 0;
    if (samples.length >= 2) {
      const newest = samples[samples.length - 1];
      if (now - newest.t < 90) {
        const oldest = samples[0];
        const dt = newest.t - oldest.t;
        if (dt > 6) {
          vx = (newest.x - oldest.x) / dt;
          vy = (newest.y - oldest.y) / dt;
        }
      }
    }

    if (g.axis === "vertical") {
      suppressDeckClickRef.current = true;
      window.setTimeout(() => {
        suppressDeckClickRef.current = false;
      }, 220);
      const dy = e.clientY - g.startY;
      onSheetPullEnd?.(dy, vy);
      return;
    }

    if (g.axis === "horizontal") {
      suppressDeckClickRef.current = true;
      window.setTimeout(() => {
        suppressDeckClickRef.current = false;
      }, 220);

      if (!isReorderMode && renderedItems.length > 1) {
        const dx = e.clientX - g.startX;
        // Combine finger displacement + flick momentum for effortless iOS-grade 1..3 card glides!
        const displacementCards = -dx / stepX;
        const momentumCards = -(vx * 220) / stepX;
        let deltaSlots = Math.round(displacementCards + momentumCards);

        // Quick light flick (> 0.24 px/ms) with modest travel (>= 14px) always advances 1 card cleanly
        if (deltaSlots === 0 && Math.abs(dx) >= 14 && Math.abs(vx) >= 0.24) {
          deltaSlots = vx < 0 ? 1 : -1;
        }
        // Deliberate slow drag past 34% of card step always commits to next/prev (NEVER snaps back!)
        if (deltaSlots === 0 && Math.abs(dx) >= stepX * 0.34) {
          deltaSlots = dx < 0 ? 1 : -1;
        }

        // Clamp single flick to ±3 cards so all entering cards glide smoothly from the pre-mounted buffer
        deltaSlots = Math.max(-3, Math.min(3, deltaSlots));

        const targetIdx = Math.max(
          0,
          Math.min(renderedItems.length - 1, safeActiveIdx + deltaSlots)
        );
        if (targetIdx !== safeActiveIdx) {
          // Update displayActiveIdx synchronously in same batch as dragDx=0 so the spring glides forward with ZERO jump!
          setDisplayActiveIdx(targetIdx);
          onSelectIndex(targetIdx);
        }
      }
    }

    setDragDx(0);
    setReorderDragX(0);
    setIsDraggingDeck(false);
  };

  if (renderedItems.length === 0 || !activeItem) return null;

  return (
    <>
      {/* =====================================================================
          FLUSH-BOTTOM FANNED PHOTO DECK (BOTH MOBILE & DESKTOP!)
      ====================================================================== */}
      <div
        onPointerDown={handleDeckPointerDown}
        onPointerMove={handleDeckPointerMove}
        onPointerUp={handleDeckPointerUp}
        onPointerCancel={handleDeckPointerUp}
        className={`absolute inset-x-0 bottom-0 z-10 ${
          clampedVisibleRatio < 1
            ? "h-[278px] sm:h-[322px] lg:h-[322px]"
            : "h-[268px] sm:h-[322px] lg:h-[344px] z-30"
        } pointer-events-none flex items-end justify-center touch-none overscroll-none`}
      >
        {/* Transparent swipe capture layer over parent-rendered mobile white backdrop */}
        {captureMobileBackdropSwipe && !isDeckTuckedByMap && !isModalActive && (
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-auto absolute inset-0 z-0"
          />
        )}
        {/* Clean Solid White Backdrop Behind Fan Deck on Mobile/Tablet (< lg) */}
        {showMobileWhiteBackdrop && (
          <div
            aria-hidden="true"
            style={{
              transform: isDeckTuckedByMap
                ? "translate3d(0, 100%, 0)"
                : "translate3d(0, 0, 0)",
              opacity: isDeckTuckedByMap ? 0 : 1,
              transition: isDeckTuckedByMap
                ? "transform 230ms var(--ease-ios-sheet), opacity 180ms ease"
                : "transform 360ms var(--ease-ios-sheet), opacity 220ms ease",
            }}
            className="lg:hidden pointer-events-auto absolute inset-x-0 bottom-0 z-0 h-[272px] sm:h-[308px] rounded-t-[26px] bg-[var(--color-background-body)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] will-change-transform"
          />
        )}
        {renderedItems.map((item, idx) => {
          const isCenter = idx === safeActiveIdx;
          const isTuckedByMap = isMapMoving && !isModalActive;
          const rel =
            idx - safeActiveIdx + (isReorderMode ? 0 : dragDx / stepX);
          const absRel = Math.abs(rel);
          if (absRel > 4.15) return null;

          const pin = item.pin;
          const stopNumber = item.stopNumber ?? idx + 1;
          const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
          const discountHeadline = getDealDiscountHeadline(pin, language);
          const dealPrice = pin.promoDealPriceThb ?? pin.nightlyPriceThb;
          const badgeText = buildDeckCardBadgeText(
            pin,
            mode,
            language,
            stopNumber
          );
          const isSavedByMe = savedPinIds?.has(pin.id) ?? false;

          const pose = computeFanSlotPose(rel, cardW, cardH);

          let tx = pose.tx;
          let ty = pose.ty;
          let rot = pose.rot;
          let cardScale = pose.scale;
          let opacity =
            absRel <= 2.25 ? 1 : Math.max(0, 1 - (absRel - 2.25) * 1.4);
          const isHiddenForFlip = isModalActive && pin.id === modalOpenPinId;

          if (!hasEntered || isShufflingOut || isTuckedByMap) {
            ty = pose.ty + cardH + 90;
            opacity = 0;
          } else if (isReorderMode && isCenter) {
            tx = reorderDragX;
            ty = isDesktop ? -92 : -88;
            rot = reorderDragX * 0.055;
            cardScale = 1.02;
            opacity = 1;
          } else if (isReorderMode && !isCenter) {
            opacity = absRel <= 2.25 ? 0.78 : 0;
          }

          const zIndex = isCenter
            ? 50
            : Math.max(10, 45 - Math.round(absRel * 10));

          // Non-center cards smoothly desaturate into soft, airy faded gray so the vivid larger center hero card commands 100% focus!
          const grayscaleAmount =
            absRel <= 0.05 ? 0 : Math.min(1, absRel * 1.15);
          const cardContentOpacity =
            absRel <= 0.05
              ? 1
              : absRel <= 1
              ? 1 - absRel * 0.56
              : Math.max(0.24, 0.44 - (absRel - 1) * 0.18);
          // Subtle floating elevation shadow strictly on the center hero card (respects coupon side cutouts via drop-shadow!)
          const centerLift = Math.max(0, 1 - absRel * 1.35);
          const centerShadowFilter =
            centerLift > 0.02
              ? `drop-shadow(0 16px 26px rgba(0, 0, 0, ${(0.22 * centerLift).toFixed(3)})) drop-shadow(0 4px 10px rgba(0, 0, 0, ${(0.11 * centerLift).toFixed(3)}))`
              : "none";

          // Center-Out Staggered Spring Entry Delay (0ms -> 85ms -> 170ms)
          const entryDelayMs =
            !entrySettled && !isShufflingOut && !isTuckedByMap
              ? Math.min(2, Math.round(absRel)) * 85
              : 0;

          let transitionCss: string;
          if (isDraggingDeck && (!isReorderMode || isCenter)) {
            transitionCss = "none";
          } else if (isTuckedByMap) {
            transitionCss =
              "transform 230ms var(--ease-ios-sheet), opacity 180ms ease, filter 220ms ease";
          } else if (isShufflingOut) {
            transitionCss =
              "transform 140ms var(--ease-ios-sheet), opacity 125ms ease, filter 160ms ease";
          } else if (!hasEntered) {
            transitionCss = "none";
          } else if (!entrySettled) {
            transitionCss = `transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${entryDelayMs}ms, opacity 240ms ease ${entryDelayMs}ms, filter 280ms ease ${entryDelayMs}ms`;
          } else if (isHiddenForFlip) {
            transitionCss = "none";
          } else if (absRel > 2.25) {
            transitionCss =
              "transform 260ms var(--ease-ios-sheet), opacity 220ms ease, filter 220ms ease";
          } else {
            // Critically-damped ultra-smooth iOS deceleration (zero ugly rubber snap-back!)
            transitionCss =
              "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease, filter 280ms ease";
          }

          const shouldPopInOuter =
            entrySettled &&
            !isShufflingOut &&
            !isTuckedByMap &&
            !isReorderMode &&
            !isModalActive &&
            outerPopIn?.key === item.key &&
            Math.round(absRel) === 2;

          const showActionBtn =
            isCenter &&
            !isReorderMode &&
            !isPlayingStory &&
            cardTopAction !== "none";
          const promoOnlyHeadline = getDealPromoOnlyHeadline(pin, language);
          const showFloatingCenterLabel =
            isCenter &&
            !isHiddenForFlip &&
            !isTuckedByMap &&
            !isShufflingOut &&
            !isModalActive &&
            hasEntered;

          return (
            <div
              key={item.key}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                ...(bottomOffsetPx !== null
                  ? { bottom: `${bottomOffsetPx}px` }
                  : {}),
                transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(
                  2
                )}px, 0) rotate(${rot.toFixed(2)}deg) scale(${cardScale.toFixed(
                  3
                )})`,
                opacity,
                filter: centerShadowFilter,
                visibility: isHiddenForFlip ? "hidden" : "visible",
                zIndex,
                transformOrigin: "50% 108%",
                transition: transitionCss,
              }}
              className={`${
                absRel <= 2.25 &&
                !isModalActive &&
                !isShufflingOut &&
                !isTuckedByMap
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              } absolute ${
                bottomOffsetPx === null
                  ? "bottom-[4px] sm:bottom-[6px] lg:bottom-[6px]"
                  : ""
              } will-change-transform`}
            >
              {/* Clean Bg-Less Floating Promo + Place Name Above Center Card ONLY */}
              {isCenter && (
                <div
                  aria-hidden={!showFloatingCenterLabel}
                  className={`cgr-map-floating-label pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 -translate-x-1/2 w-[236px] sm:w-[290px] text-center select-none transition-[opacity,transform] duration-220 ease-out ${
                    showFloatingCenterLabel
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1.5"
                  }`}
                >
                  {promoOnlyHeadline && (
                    <p className="text-[13.5px] sm:text-[14.5px] font-extrabold tracking-[-0.015em] leading-tight truncate tabular-nums">
                      {mode === "trip"
                        ? `#${stopNumber} · ${promoOnlyHeadline}`
                        : promoOnlyHeadline}
                    </p>
                  )}
                  <p
                    className={`${
                      promoOnlyHeadline
                        ? "text-[12.5px] sm:text-[13.5px] font-semibold mt-0.5"
                        : "text-[13.5px] sm:text-[14.5px] font-bold"
                    } tracking-[-0.01em] leading-tight truncate`}
                  >
                    {mode === "trip" && !promoOnlyHeadline
                      ? `#${stopNumber} · ${hotelName}`
                      : hotelName}
                  </p>
                </div>
              )}

              <article
                role="button"
                tabIndex={isCenter && !isModalActive ? 0 : -1}
                aria-label={
                  promoOnlyHeadline
                    ? `${hotelName} — ${promoOnlyHeadline}`
                    : hotelName
                }
                onClick={(e) => {
                  if (suppressDeckClickRef.current || isModalActive) return;
                  if (isPlayingStory) {
                    onInterruptStory?.();
                    return;
                  }
                  if (!isCenter) {
                    if (!isReorderMode) {
                      onSelectIndex(idx);
                    }
                  } else if (!isReorderMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onOpenCard(pin, stopNumber, badgeText, {
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isCenter && !isReorderMode) {
                      onSelectIndex(idx);
                    } else if (isCenter && !isReorderMode) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onOpenCard(pin, stopNumber, badgeText, {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      });
                    }
                  }
                }}
                className={`${
                  shouldPopInOuter ? "cgr-fan-outer-pop-in" : ""
                } cgr-fanned-coupon-mask relative w-full h-full rounded-[20px] overflow-hidden cursor-pointer ${
                  isCenter
                    ? "bg-[var(--color-background-muted)]"
                    : "bg-[var(--color-background-body)]"
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] ${
                  isCenter && isReorderMode
                    ? "ring-[2.5px] ring-[#222222] dark:ring-[#f5f5f5]"
                    : ""
                }`}
              >
                {/* 100% Full-Bleed Borderless Place Photography (Center = Vivid Color | Non-Center = Smooth Grayscale) */}
                <img
                  src={getOptimizedPinImageUrl(pin.coverImageUrl, "card")}
                  srcSet={getOptimizedPinImageSrcSet(
                    pin.coverImageUrl,
                    "card"
                  )}
                  sizes={PIN_IMAGE_SIZES.card}
                  alt={hotelName}
                  loading={absRel <= 2.1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  style={{
                    opacity: cardContentOpacity,
                    filter:
                      grayscaleAmount > 0.01
                        ? `grayscale(${grayscaleAmount.toFixed(2)}) brightness(${(
                            1 +
                            grayscaleAmount * 0.14
                          ).toFixed(2)}) contrast(${(
                            1 -
                            grayscaleAmount * 0.18
                          ).toFixed(2)})`
                        : "none",
                    transition: isDraggingDeck
                      ? "none"
                      : "opacity 280ms ease, filter 280ms ease",
                  }}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />

                {/* Top-Left Flush Corner Category Crest (+ Trip Stop #) — Soft Faded Gray on Non-Center Cards */}
                <div
                  style={{
                    opacity:
                      absRel <= 0.05 ? 1 : cardContentOpacity * 0.82,
                    filter:
                      grayscaleAmount > 0.01
                        ? `grayscale(${grayscaleAmount.toFixed(2)}) brightness(${(
                            1 +
                            grayscaleAmount * 0.18
                          ).toFixed(2)}) contrast(${(
                            1 -
                            grayscaleAmount * 0.14
                          ).toFixed(2)})`
                        : "none",
                    transition: isDraggingDeck
                      ? "none"
                      : "opacity 280ms ease, filter 280ms ease",
                  }}
                  className="absolute top-0 left-0 z-10 inline-flex items-start pointer-events-none"
                >
                  <PlaceCategoryCrest
                    category={pin.placeCategory}
                    language={language}
                    corner="top-left"
                  />
                  {mode === "trip" && (
                    <span className="mt-1.5 ml-1.5 h-6 px-1.5 rounded-[7px] bg-black/48 backdrop-blur-sm text-white text-[10.5px] font-bold tabular-nums inline-flex items-center leading-none">
                      #{stopNumber}
                    </span>
                  )}
                </div>

                {/* Top-Right Flush Corner Pin / Remove Button */}
                {showActionBtn && cardTopAction === "remove" && onRemovePin && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePin(pin.id);
                    }}
                    aria-label={
                      isTh ? "นำสถานที่ออกจากทริป" : "Remove place from trip"
                    }
                    title={isTh ? "นำออกจากทริปนี้" : "Remove from trip"}
                    className="absolute top-0 right-0 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-bl-[14px] bg-black/46 hover:bg-black/62 backdrop-blur-sm inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-[17px] h-[17px]"
                      aria-hidden="true"
                    >
                      <path
                        d="M6.5 3.75h11a1.75 1.75 0 0 1 1.75 1.75v15.2l-6.64-4.15a1.15 1.15 0 0 0-1.22 0L4.75 20.7V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
                        fill="#e60023"
                        stroke="#ffffff"
                        strokeWidth="1.9"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {showActionBtn &&
                  cardTopAction === "bookmark" &&
                  onToggleSavePin && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSavePin(pin);
                      }}
                      aria-label={
                        isSavedByMe
                          ? isTh
                            ? "บันทึกแล้ว"
                            : "Saved"
                          : isTh
                          ? "บันทึกเข้าทริป"
                          : "Save to trip"
                      }
                      title={
                        isSavedByMe
                          ? isTh
                            ? "บันทึกในทริปแล้ว"
                            : "Saved to trip"
                          : isTh
                          ? "บันทึกเข้าทริป"
                          : "Save to trip"
                      }
                      className="absolute top-0 right-0 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-bl-[14px] bg-black/46 hover:bg-black/62 backdrop-blur-sm inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-[17px] h-[17px]"
                        aria-hidden="true"
                      >
                        <path
                          d="M6.5 3.75h11a1.75 1.75 0 0 1 1.75 1.75v15.2l-6.64-4.15a1.15 1.15 0 0 0-1.22 0L4.75 20.7V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
                          fill={isSavedByMe ? "#e60023" : "rgba(0,0,0,0.35)"}
                          stroke="#ffffff"
                          strokeWidth="1.9"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}

              </article>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          OPTIONAL FLOATING "MOVE" REORDER DOCK (TRIP OWNER MODE ONLY)
      ====================================================================== */}
      {enableReorder &&
        renderedItems.length > 1 &&
        !isPlayingStory &&
        !isModalActive &&
        onSwapActiveStop && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 sm:bottom-3.5 z-[55] flex justify-center px-3">
            {!isReorderMode ? (
              <button
                type="button"
                onClick={() => setReorderModeSynced(true)}
                aria-label={isTh ? "ย้ายลำดับการ์ด" : "Move card order"}
                className="pointer-events-auto h-9 px-3.5 rounded-[12px] bg-[var(--color-background-popover)]/96 hover:bg-[var(--color-background-popover)] backdrop-blur-md text-[var(--color-text-primary)] border border-black/[0.08] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                <span>{isTh ? "ย้ายลำดับ" : "Move"}</span>
              </button>
            ) : (
              <div className="pointer-events-auto inline-flex items-center gap-1.5 p-1 rounded-[14px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.12] shadow-[var(--shadow-popover)]">
                <button
                  type="button"
                  disabled={safeActiveIdx <= 0}
                  onClick={() => void onSwapActiveStop(-1)}
                  aria-label={isTh ? "เลื่อนไปลำดับก่อนหน้า" : "Move earlier"}
                  className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] disabled:opacity-30 inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
                </button>

                <button
                  type="button"
                  onClick={() => setReorderModeSynced(false)}
                  className="h-9 px-3.5 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  <span>
                    {isTh
                      ? `เสร็จสิ้น · #${safeActiveIdx + 1}/${renderedItems.length}`
                      : `Done · #${safeActiveIdx + 1}/${renderedItems.length}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={safeActiveIdx >= renderedItems.length - 1}
                  onClick={() => void onSwapActiveStop(1)}
                  aria-label={isTh ? "เลื่อนไปลำดับถัดไป" : "Move later"}
                  className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] disabled:opacity-30 inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
                </button>
              </div>
            )}
          </div>
        )}
    </>
  );
}
