"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface ExploreHorizontalCardStripProps {
  deals: PinFeedItemDto[];
  activeIdx: number;
  language: LanguageCode;
  savedPinIds: Set<string>;
  onSelectPin: (pin: PinFeedItemDto, originRect: CardOriginRect | null) => void;
  onHoverIndex?: (idx: number) => void;
  onToggleSavePin: (pin: PinFeedItemDto) => void;
  /** Optional 1:1 vertical pull-down collapse handoff when dragging DOWN anywhere on cards in list mode */
  onSheetPullMove?: (dy: number) => void;
  onSheetPullEnd?: (dy: number, velocityY: number) => void;
}

const INITIAL_STRIP_CARDS = 16;
const STRIP_CARDS_INCREMENT = 12;

export function ExploreHorizontalCardStrip({
  deals,
  activeIdx,
  language,
  savedPinIds,
  onSelectPin,
  onHoverIndex,
  onToggleSavePin,
  onSheetPullMove,
  onSheetPullEnd,
}: ExploreHorizontalCardStripProps) {
  const isTh = language === "th";
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoveredIdxRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);
  const prevDealsKeyRef = useRef<string>("");

  const dealsKey = deals.map((d) => d.id).join(",");

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    Math.max(INITIAL_STRIP_CARDS, activeIdx + 6)
  );

  // Ensure active card (e.g. from map pin click) is always within rendered window
  useEffect(() => {
    if (activeIdx + 4 > visibleCount) {
      setVisibleCount((prev) =>
        Math.min(deals.length, Math.max(prev, activeIdx + 8))
      );
    }
  }, [activeIdx, deals.length, visibleCount]);

  // Reset rendered window cleanly when deal set changes
  useEffect(() => {
    setVisibleCount(Math.min(deals.length, Math.max(INITIAL_STRIP_CARDS, activeIdx + 6)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealsKey]);

  const syncScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollPrev(el.scrollLeft > 6);
    setCanScrollNext(
      (maxScroll > 6 && el.scrollLeft < maxScroll - 6) ||
        visibleCount < deals.length
    );

    // Progressive horizontal lazy reveal when user nears the right edge of rendered cards
    if (visibleCount < deals.length && maxScroll - el.scrollLeft < 480) {
      setVisibleCount((prev) =>
        Math.min(deals.length, prev + STRIP_CARDS_INCREMENT)
      );
    }
  }, [deals.length, visibleCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncScrollButtons();

    const raf = requestAnimationFrame(syncScrollButtons);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(syncScrollButtons);
      ro.observe(el);
    }
    window.addEventListener("resize", syncScrollButtons, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", syncScrollButtons);
    };
  }, [deals.length, syncScrollButtons]);

  // Scroll behavior:
  // - Initial mount (e.g. Back from /{slug} or Fan->List toggle): jump silently (`instant`) ONLY if active card is off-screen
  // - New deals loaded (after map pan/zoom/filter/shuffle): instantly reset to left=0 with ZERO sideways slide animation!
  // - Same deals + activeIdx changed via map pin click: smoothly center the selected card
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isFirstMount = !hasMountedRef.current;
    const dealsChanged = prevDealsKeyRef.current !== dealsKey;
    hasMountedRef.current = true;
    prevDealsKeyRef.current = dealsKey;

    if (isFirstMount) {
      const activeDeal = deals[activeIdx];
      const node = activeDeal ? cardNodesRef.current.get(activeDeal.id) : null;
      if (node) {
        const elRect = el.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const isOutsideView =
          nodeRect.left < elRect.left || nodeRect.right > elRect.right;
        if (isOutsideView) {
          node.scrollIntoView({
            behavior: "instant",
            inline: "center",
            block: "nearest",
          });
        }
      }
      const timer = window.setTimeout(syncScrollButtons, 60);
      return () => window.clearTimeout(timer);
    }

    if (dealsChanged) {
      el.scrollTo({ left: 0, behavior: "instant" });
      const timer = window.setTimeout(syncScrollButtons, 60);
      return () => window.clearTimeout(timer);
    }

    if (hoveredIdxRef.current === activeIdx) return;
    const activeDeal = deals[activeIdx];
    const node = activeDeal ? cardNodesRef.current.get(activeDeal.id) : null;
    if (!node) return;

    node.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    const timer = window.setTimeout(syncScrollButtons, 360);
    return () => window.clearTimeout(timer);
  }, [activeIdx, deals, dealsKey, syncScrollButtons]);

  const onSheetPullMoveRef = useRef(onSheetPullMove);
  onSheetPullMoveRef.current = onSheetPullMove;
  const onSheetPullEndRef = useRef(onSheetPullEnd);
  onSheetPullEndRef.current = onSheetPullEnd;

  // Dual-axis native touch arbitrator on horizontal card track:
  // - Horizontal swipe -> 100% locked native horizontal scroll (zero vertical wobble!)
  // - Vertical downward drag -> prevents browser pull-to-refresh & collapses parent white dock sheet 1:1!
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let state: {
      startX: number;
      startY: number;
      axis: "horizontal" | "vertical" | null;
      samples: Array<{ y: number; t: number }>;
    } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t) return;
      state = {
        startX: t.clientX,
        startY: t.clientY,
        axis: null,
        samples: [{ y: t.clientY, t: performance.now() }],
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!state || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;
      const now = performance.now();

      if (state.axis === null) {
        if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy) * 0.9) {
          state.axis = "horizontal";
        } else if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          state.axis = "vertical";
        }
      }

      if (state.axis === "vertical") {
        // Strictly block browser pull-to-refresh & vertical bounce!
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        state.samples.push({ y: t.clientY, t: now });
        while (state.samples.length > 2 && now - state.samples[0].t > 105) {
          state.samples.shift();
        }
        const resisted = dy < 0 ? dy * 0.28 : Math.min(280, dy);
        onSheetPullMoveRef.current?.(resisted);
      }
    };

    const finishTouch = (e: TouchEvent) => {
      if (!state) return;
      const st = state;
      state = null;
      if (st.axis !== "vertical") return;

      const t = e.changedTouches[0];
      const dy = t ? t.clientY - st.startY : 0;
      const now = performance.now();
      let vy = 0;
      if (st.samples.length >= 2) {
        const newest = st.samples[st.samples.length - 1];
        if (now - newest.t < 90) {
          const oldest = st.samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 6) vy = (newest.y - oldest.y) / dt;
        }
      }
      onSheetPullEndRef.current?.(dy, vy);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishTouch, { passive: true });
    el.addEventListener("touchcancel", finishTouch, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishTouch);
      el.removeEventListener("touchcancel", finishTouch);
    };
  }, []);

  const handleStepScroll = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = Math.max(320, Math.round(el.clientWidth * 0.68));
    el.scrollBy({
      left: direction * delta,
      behavior: "smooth",
    });
  }, []);

  if (deals.length === 0) return null;

  return (
    <div className="cgr-sheet-content-in relative w-full flex-1 min-h-0 flex items-start">
      <div className="relative w-full h-full flex items-start">
        {/* Desktop Prev Arrow Button */}
        {canScrollPrev && (
          <button
            type="button"
            onClick={() => handleStepScroll(-1)}
            aria-label={isTh ? "เลื่อนดูการ์ดก่อนหน้า" : "Previous places"}
            className="hidden lg:inline-flex absolute left-3 top-[108px] -translate-y-1/2 z-20 h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 hover:bg-[var(--color-background-muted)] backdrop-blur-md border border-black/[0.08] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
          </button>
        )}

        {/* Single-Row Horizontally Scrollable Card Track (Strictly X-Locked: ZERO Vertical Wobble!) */}
        <div
          ref={scrollRef}
          onScroll={syncScrollButtons}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="flex flex-nowrap items-start gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none touch-pan-x no-scrollbar snap-x snap-proximity lg:snap-mandatory w-full h-full px-4 sm:px-5 lg:px-5 scroll-px-4 sm:scroll-px-5 lg:scroll-px-5 pt-1 pb-2.5 sm:pt-1.5 sm:pb-3"
        >
          {deals.slice(0, visibleCount).map((deal, idx) => (
            <div
              key={deal.id}
              ref={(el) => {
                if (el) {
                  cardNodesRef.current.set(deal.id, el);
                } else {
                  cardNodesRef.current.delete(deal.id);
                }
              }}
              className="shrink-0 w-[132px] sm:w-[152px] snap-start"
            >
              <VerticalCouponCard
                pin={deal}
                language={language}
                isSaved={savedPinIds.has(deal.id)}
                isHighlighted={idx === activeIdx}
                priority={idx < 2}
                enablePhotoSlide={false}
                onSelect={(p, rect) => onSelectPin(p, rect ?? null)}
                onToggleSave={() => onToggleSavePin(deal)}
                onMouseEnter={() => {
                  hoveredIdxRef.current = idx;
                  onHoverIndex?.(idx);
                }}
                onMouseLeave={() => {
                  if (hoveredIdxRef.current === idx) {
                    hoveredIdxRef.current = null;
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Desktop Next Arrow Button */}
        {canScrollNext && (
          <button
            type="button"
            onClick={() => handleStepScroll(1)}
            aria-label={isTh ? "เลื่อนดูการ์ดถัดไป" : "Next places"}
            className="hidden lg:inline-flex absolute right-3 top-[108px] -translate-y-1/2 z-20 h-10 w-10 rounded-[12px] bg-[var(--color-background-popover)]/96 hover:bg-[var(--color-background-muted)] backdrop-blur-md border border-black/[0.08] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}
