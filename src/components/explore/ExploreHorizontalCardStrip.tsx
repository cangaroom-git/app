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
}

export function ExploreHorizontalCardStrip({
  deals,
  activeIdx,
  language,
  savedPinIds,
  onSelectPin,
  onHoverIndex,
  onToggleSavePin,
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

  const syncScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollPrev(el.scrollLeft > 6);
    setCanScrollNext(maxScroll > 6 && el.scrollLeft < maxScroll - 6);
  }, []);

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

        {/* Single-Row Horizontally Scrollable Card Track (Cleanly below rounded-t-[26px] header!) */}
        <div
          ref={scrollRef}
          onScroll={syncScrollButtons}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="flex flex-nowrap items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory w-full h-full px-4 sm:px-5 lg:px-5 scroll-px-4 sm:scroll-px-5 lg:scroll-px-5 pt-1 pb-3 sm:pt-1.5 sm:pb-3.5"
        >
          {deals.map((deal, idx) => (
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
                priority={idx < 7}
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
