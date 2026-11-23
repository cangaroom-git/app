"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { SeeAllCouponCard } from "@/components/home/SeeAllCouponCard";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

// Mobile (< sm): 2 cards + gentle peek; Tablet (sm..lg-1): 3 cards + gentle peek;
// Desktop lg (1024-1279px): EXACTLY 5 FULL 3:4 CARDS; Desktop xl (>= 1280px): EXACTLY 6 FULL 3:4 CARDS (ZERO clipped edge card!)
export const COUPON_CARD_SLOT_WIDTH_CLASS =
  "w-[calc((100%-36px)/2)] sm:w-[calc((100%-52px)/3)] lg:w-[calc((100%-64px)/5)] xl:w-[calc((100%-80px)/6)] shrink-0 snap-start flex items-start";

export interface DealSlideRowProps {
  id?: string;
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  showSeeAllCard?: boolean;
  maxVisibleCards?: number;
  deals: PinFeedItemDto[];
  language: LanguageCode;
  savedPinIds: ReadonlySet<string>;
  priorityRow?: boolean;
  notchBgClass?: string;
  compactTop?: boolean;
  compactHeader?: boolean;
  highlightedPinId?: string | null;
  trackEdgeClassName?: string;
  onSelectDeal: (
    pin: PinFeedItemDto,
    originRect?: CardOriginRect | null,
    event?: React.MouseEvent | React.KeyboardEvent
  ) => void;
  onToggleSave: (pinId: string) => void;
  onHoverDeal?: (pin: PinFeedItemDto | null) => void;
}

export const DealSlideRow = React.memo(function DealSlideRow({
  id,
  title,
  subtitle,
  seeAllHref,
  showSeeAllCard = true,
  maxVisibleCards = 11,
  deals,
  language,
  savedPinIds,
  priorityRow = false,
  notchBgClass = "bg-[var(--color-background-body)]",
  compactTop = false,
  compactHeader = false,
  highlightedPinId = null,
  trackEdgeClassName = "-mx-4 px-4 sm:-mx-6 sm:px-6 scroll-px-4 sm:scroll-px-6 lg:mx-0 lg:px-0 lg:scroll-px-0",
  onSelectDeal,
  onToggleSave,
  onHoverDeal,
}: DealSlideRowProps) {
  const isTh = language === "th";
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollBounds();

    const onScroll = () => updateScrollBounds();
    el.addEventListener("scroll", onScroll, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateScrollBounds());
      ro.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
  }, [deals.length, updateScrollBounds]);

  const scrollByStep = (direction: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    // On Desktop (>= 1024px), slide by exact full 5-card page (`clientWidth + 16px gap`)
    // so every stopped state shows 5 FULL cards with ZERO half-clipped card!
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;
    const step = isDesktop
      ? el.clientWidth + 16
      : Math.max(280, Math.round(el.clientWidth * 0.78));
    el.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  if (deals.length === 0) return null;

  const visibleDeals =
    maxVisibleCards > 0 ? deals.slice(0, maxVisibleCards) : deals;

  return (
    <section
      id={id}
      className={`${
        compactHeader
          ? "py-3 first:pt-1 space-y-2.5"
          : compactTop
          ? "py-3.5 sm:py-4.5 first:pt-2 space-y-2.5 sm:space-y-3"
          : "py-3.5 sm:py-5 first:pt-2.5 space-y-2.5 sm:space-y-3.5"
      } ${
        priorityRow
          ? ""
          : "[content-visibility:auto] [contain-intrinsic-size:auto_280px]"
      } scroll-mt-[126px] lg:scroll-mt-[128px]`}
    >
      {/* Header Row: Clean Title Left | Far-Right Signature ">" Action (+ Desktop Slide Controls) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="group inline-block min-w-0 max-w-full hover:opacity-80 transition-opacity"
            >
              <h2
                className={`${
                  compactHeader
                    ? "text-[16px] sm:text-[17.5px]"
                    : "text-[18.5px] sm:text-[21px]"
                } font-semibold tracking-[-0.018em] text-[var(--color-text-primary)] truncate`}
              >
                {title}
              </h2>
            </Link>
          ) : (
            <h2
              className={`${
                compactHeader
                  ? "text-[16px] sm:text-[17.5px]"
                  : "text-[18.5px] sm:text-[21px]"
              } font-semibold tracking-[-0.018em] text-[var(--color-text-primary)] truncate`}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-[13px] text-[var(--color-text-secondary)] truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Far-Right Controls: Mobile ">" Button | Desktop Slide Prev/Next + Far-Right ">" See All */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop Minimal Slide Controls */}
          {(canScrollLeft || canScrollRight) && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canScrollLeft}
                onClick={() => scrollByStep("prev")}
                aria-label={isTh ? "เลื่อนซ้าย" : "Scroll left"}
                className="h-8 w-8 rounded-[10px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                disabled={!canScrollRight}
                onClick={() => scrollByStep("next")}
                aria-label={isTh ? "เลื่อนขวา" : "Scroll right"}
                className="h-8 w-8 rounded-[10px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          )}

          {/* Far-Right Signature ">" See All Link */}
          {seeAllHref && (
            <>
              {(canScrollLeft || canScrollRight) && (
                <span
                  aria-hidden="true"
                  className="hidden lg:block h-4 w-px bg-[var(--color-border)] mx-0.5"
                />
              )}
              <Link
                href={seeAllHref}
                aria-label={
                  isTh ? `ดูทั้งหมดใน ${title}` : `See all in ${title}`
                }
                className="group h-8 w-8 lg:w-auto lg:px-2.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center gap-1 shrink-0 transition-colors"
              >
                <span className="hidden lg:inline text-[12.5px] font-semibold">
                  {isTh ? "ดูทั้งหมด" : "See all"}
                </span>
                <ChevronRight
                  className="w-4 h-4 lg:w-3.5 lg:h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  strokeWidth={2.4}
                />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Pure Horizontal Card Slide Track — Allows BOTH Vertical Page Scroll & Horizontal Slide on Touch Devices! */}
      <div
        ref={trackRef}
        data-swipe-ignore="true"
        className={`${trackEdgeClassName} flex items-start gap-3 lg:gap-4 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-proximity lg:snap-mandatory`}
      >
        {visibleDeals.map((deal, idx) => (
          <div
            key={`${id || title}-${deal.id}`}
            className={COUPON_CARD_SLOT_WIDTH_CLASS}
          >
            <VerticalCouponCard
              pin={deal}
              language={language}
              priority={priorityRow && idx < 2}
              isSaved={savedPinIds.has(deal.id)}
              isHighlighted={highlightedPinId === deal.id}
              notchBgClass={notchBgClass}
              onSelect={onSelectDeal}
              onToggleSave={onToggleSave}
              onMouseEnter={onHoverDeal ? (p) => onHoverDeal(p) : undefined}
              onMouseLeave={onHoverDeal ? () => onHoverDeal(null) : undefined}
            />
          </div>
        ))}

        {/* End-of-Track Signature Nondii "See All" Fanned Voucher Card (Slot #9 when 8 cards shown) */}
        {seeAllHref && showSeeAllCard && (
          <div className={COUPON_CARD_SLOT_WIDTH_CLASS}>
            <SeeAllCouponCard
              href={seeAllHref}
              title={title}
              deals={deals}
              visibleCount={visibleDeals.length}
              language={language}
            />
          </div>
        )}
      </div>
    </section>
  );
});
