"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import { useUltraHorizontalScroll } from "@/lib/useUltraHorizontalScroll";
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

  const { scrollBySmooth, scrollToSmooth, stopMotion } =
    useUltraHorizontalScroll(scrollRef, {
      stopPropagation: true,
      onVerticalPullMove: onSheetPullMove,
      onVerticalPullEnd: onSheetPullEnd,
      onScrollUpdate: syncScrollButtons,
    });

  // Scroll behavior:
  // - Initial mount (e.g. Back from /{slug} or Fan->List toggle): jump silently (`instant`) ONLY if active card is off-screen
  // - New deals loaded (after map pan/zoom/filter/shuffle): instantly reset to left=0 with ZERO sideways slide animation!
  // - Same deals + activeIdx changed via map pin click: smoothly center the selected card via 120fps ease-out
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
          const target =
            node.offsetLeft - Math.max(0, (el.clientWidth - node.clientWidth) / 2);
          el.scrollLeft = Math.max(0, target);
        }
      }
      const timer = window.setTimeout(syncScrollButtons, 60);
      return () => window.clearTimeout(timer);
    }

    if (dealsChanged) {
      stopMotion();
      el.scrollLeft = 0;
      const timer = window.setTimeout(syncScrollButtons, 60);
      return () => window.clearTimeout(timer);
    }

    if (hoveredIdxRef.current === activeIdx) return;
    const activeDeal = deals[activeIdx];
    const node = activeDeal ? cardNodesRef.current.get(activeDeal.id) : null;
    if (!node) return;

    const targetLeft =
      node.offsetLeft - Math.max(0, (el.clientWidth - node.clientWidth) / 2);
    scrollToSmooth(targetLeft, 440);

    const timer = window.setTimeout(syncScrollButtons, 460);
    return () => window.clearTimeout(timer);
  }, [activeIdx, deals, dealsKey, scrollToSmooth, stopMotion, syncScrollButtons]);

  const handleStepScroll = useCallback(
    (direction: -1 | 1) => {
      const el = scrollRef.current;
      if (!el) return;
      const delta = Math.max(320, Math.round(el.clientWidth * 0.68));
      scrollBySmooth(direction * delta, 460);
    },
    [scrollBySmooth]
  );

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

        {/* Single-Row Ultra-Smooth Inertial Momentum Card Track (Strictly X-Locked + Downward Sheet Collapse!) */}
        <div
          ref={scrollRef}
          onScroll={syncScrollButtons}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="flex flex-nowrap items-start gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden overscroll-none touch-none no-scrollbar w-full h-full px-4 sm:px-5 lg:px-5 pt-1 pb-2.5 sm:pt-1.5 sm:pb-3"
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
              className="shrink-0 w-[132px] sm:w-[152px]"
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
