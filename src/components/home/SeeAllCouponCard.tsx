"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import type { PinFeedItemDto, PlaceCategoryDto } from "@/types/cangaroom";

export interface SeeAllCouponCardProps {
  href: string;
  title: string;
  deals: PinFeedItemDto[];
  visibleCount?: number;
  language: LanguageCode;
}

interface MiniVoucherData {
  id: string;
  imageUrl: string | null;
  placeCategory: PlaceCategoryDto;
}

/**
 * Frameless 3-Ticket Fanned "See All" Card (Nondii Signature).
 * - ZERO outer frame / box — 3 sculpted vertical coupon tickets float directly on the open canvas.
 * - Each ticket has authentic semicircular side notches, dashed tear seam, real stay photo & real deal stub.
 * - Replays staggered bottom-arc spring unfurl every time it leaves and re-enters view + organic paper breeze + wide hand-spread on hover (ZERO scale!).
 */
export function SeeAllCouponCard({
  href,
  title,
  deals,
  visibleCount,
  language,
}: SeeAllCouponCardProps) {
  const isTh = language === "th";
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const [isFanned, setIsFanned] = useState(false);

  // Replay staggered spring unfurl every time the card leaves view and scrolls back in (hysteresis prevents edge jitter)
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsFanned(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          setIsFanned(true);
        } else if (!entry.isIntersecting || entry.intersectionRatio <= 0.02) {
          setIsFanned(false);
        }
      },
      { threshold: [0, 0.02, 0.35] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pick up to 3 distinct real deals: prioritize unseen deals beyond the 8 shown, then non-adjacent earlier deals (never duplicate the adjacent card!)
  const tickets = useMemo<MiniVoucherData[]>(() => {
    const shownCount =
      typeof visibleCount === "number" && visibleCount > 0
        ? Math.min(visibleCount, deals.length)
        : deals.length;
    const unseenDeals = deals.slice(shownCount);
    const shownDeals = deals.slice(0, shownCount);
    const nonAdjacentShown =
      shownDeals.length >= 5
        ? shownDeals.slice(0, shownDeals.length - 2)
        : shownDeals.length >= 4
        ? shownDeals.slice(0, shownDeals.length - 1)
        : shownDeals;

    const ordered = [
      ...unseenDeals,
      ...nonAdjacentShown,
      ...shownDeals.slice(nonAdjacentShown.length),
    ];

    const seen = new Set<string>();
    const out: MiniVoucherData[] = [];

    for (const d of ordered) {
      const url = (d.coverImageUrl || "").trim();
      const dedupeKey = url || d.id;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        id: d.id,
        imageUrl: url || null,
        placeCategory: d.placeCategory,
      });
      if (out.length >= 3) break;
    }
    return out;
  }, [deals, visibleCount]);

  const centerTicket = tickets[0] ?? null;
  const leftTicket = tickets[1] ?? tickets[0] ?? null;
  const rightTicket = tickets[2] ?? tickets[1] ?? tickets[0] ?? null;
  const totalCount = deals.length;

  const renderMiniTicket = (
    ticket: MiniVoucherData | null,
    variant: "left" | "center" | "right"
  ) => {
    const isCenter = variant === "center";
    const wrapperPositionClass = isCenter ? "relative z-20" : "absolute z-10";

    const fanModifier =
      variant === "left"
        ? "cgr-fan-ticket--left"
        : variant === "right"
        ? "cgr-fan-ticket--right"
        : "cgr-fan-ticket--center";

    const floatModifier =
      variant === "left"
        ? "cgr-fan-float--left"
        : variant === "right"
        ? "cgr-fan-float--right"
        : "cgr-fan-float--center";

    return (
      <div className={`${wrapperPositionClass} cgr-fan-ticket ${fanModifier}`}>
        <div className={`${floatModifier} cgr-trip-stack-shadow`}>
          <div
            className={`relative rounded-[18px] sm:rounded-[20px] overflow-hidden ${
              isCenter
                ? "bg-[var(--color-background-muted)] w-[108px] h-[108px] sm:w-[132px] sm:h-[132px]"
                : "bg-[var(--color-background-body)] w-[94px] h-[94px] sm:w-[116px] sm:h-[116px]"
            }`}
          >
            {ticket?.imageUrl ? (
              <img
                src={getOptimizedPinImageUrl(ticket.imageUrl, "thumb")}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
                  isCenter
                    ? "opacity-100"
                    : "opacity-55 group-hover:opacity-75"
                }`}
              />
            ) : (
              <div className="absolute inset-0 h-full w-full bg-[var(--color-background-subtle)]" />
            )}

            {/* Floating White Medallion (Top-Left) + Count Badge (Top-Right) on Center Mini Card */}
            {isCenter && (
              <>
                <div className="absolute top-0 left-0 z-10 pointer-events-none">
                  <PlaceCategoryCrest
                    category={ticket?.placeCategory}
                    language={language}
                    size="sm"
                    corner="top-left"
                  />
                </div>
                <span className="absolute top-2 right-2 z-10 h-6 px-2 rounded-[9px] bg-black/48 backdrop-blur-sm text-[10px] font-bold text-white inline-flex items-center justify-center leading-none tabular-nums">
                  +{totalCount}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Link
      ref={cardRef}
      href={href}
      data-fanned={isFanned ? "true" : "false"}
      aria-label={isTh ? `ดูทั้งหมดใน ${title}` : `See all in ${title}`}
      className="cgr-seeall-link group relative flex flex-col items-center w-full cursor-pointer select-none text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] rounded-[22px]"
    >
      {/* Frameless Open Canvas — 3 Floating Fanned Super-Rounded Square Cards */}
      <div
        aria-hidden="true"
        className="relative aspect-square w-full flex items-center justify-center"
      >
        <div className="relative flex items-center justify-center">
          {renderMiniTicket(leftTicket, "left")}
          {renderMiniTicket(rightTicket, "right")}
          {renderMiniTicket(centerTicket, "center")}
        </div>
      </div>

      {/* Clean Frameless Editorial Label + Signature ">" Squircle Chip Aligned With Card Captions */}
      <div className="shrink-0 pt-2.5 inline-flex items-center justify-center gap-1.5 max-w-full">
        <span className="text-[14.5px] sm:text-[15.5px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] leading-snug">
          {isTh ? "ดูทั้งหมด" : "See all"}
        </span>
        <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[var(--color-background-muted)] group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-on-accent)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 transition-colors duration-200">
          <ChevronRight
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={2.5}
          />
        </span>
      </div>
    </Link>
  );
}
