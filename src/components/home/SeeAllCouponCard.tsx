"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { getDealDiscountHeadline } from "@/components/home/VerticalCouponCard";
import type { PinFeedItemDto } from "@/types/cangaroom";

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
  headline: string;
  province: string;
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
        headline: getDealDiscountHeadline(d, language),
        province: isTh ? d.provinceNameTh : d.provinceNameEn,
      });
      if (out.length >= 3) break;
    }
    return out;
  }, [deals, visibleCount, language, isTh]);

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
        <div className={floatModifier}>
          <div
            style={{ padding: "1.5px" }}
            className={`cgr-mini-ticket-outer rounded-[14px] sm:rounded-[16px] bg-[var(--color-border-emphasized)] transition-colors duration-300 ${
              isCenter
                ? "w-[108px] h-[154px] sm:w-[136px] sm:h-[188px] group-hover:bg-[var(--color-text-primary)]"
                : "w-[98px] h-[142px] sm:w-[126px] sm:h-[176px]"
            }`}
          >
            <div
              className={`cgr-mini-ticket-inner relative w-full h-full rounded-[12.5px] sm:rounded-[14.5px] overflow-hidden flex flex-col ${
                isCenter
                  ? "bg-[var(--color-background-card)]"
                  : "bg-[var(--color-background-muted)] group-hover:bg-[var(--color-background-card)] transition-colors duration-300"
              }`}
            >
              {/* Top Stay Photo */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[var(--color-background-subtle)]">
                {ticket?.imageUrl ? (
                  <img
                    src={getOptimizedPinImageUrl(ticket.imageUrl, "card")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={`h-full w-full object-cover object-center transition-[filter] duration-300 ${
                      isCenter
                        ? "brightness-100"
                        : "brightness-[0.92] group-hover:brightness-100"
                    }`}
                  />
                ) : (
                  <div className="h-full w-full bg-[var(--color-background-subtle)]" />
                )}

                {/* Subtle Count Pill Only on Center Ticket Top-Right */}
                {isCenter && (
                  <span className="absolute top-2 right-2 h-5 sm:h-5.5 px-1.5 sm:px-2 rounded-[6px] sm:rounded-[7px] bg-white/92 dark:bg-[#1e1e1e]/92 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold text-[#222222] dark:text-[#f5f5f5] inline-flex items-center justify-center leading-none tabular-nums">
                    +{totalCount}
                  </span>
                )}
              </div>

              {/* Crisp Dashed Perforation Seam Aligned With Side Notches */}
              <div
                aria-hidden="true"
                className="relative w-full h-0 shrink-0 px-2 flex items-center"
              >
                <span className="w-full border-t border-dashed border-[var(--color-border-emphasized)]" />
              </div>

              {/* Authentic Mini Coupon Stub */}
              <div
                className={`cgr-mini-ticket-stub shrink-0 px-2 sm:px-2.5 flex flex-col justify-center min-w-0 ${
                  isCenter
                    ? "bg-[var(--color-background-card)]"
                    : "bg-[var(--color-background-muted)] group-hover:bg-[var(--color-background-card)] transition-colors duration-300"
                }`}
              >
                <p className="text-[11px] sm:text-[12.5px] font-bold tracking-[-0.015em] text-[var(--color-text-primary)] leading-tight truncate tabular-nums">
                  {ticket?.headline || (isTh ? "โปรที่พัก" : "Stay deal")}
                </p>
                {ticket?.province && (
                  <p className="text-[9.5px] sm:text-[10.5px] text-[var(--color-text-secondary)] leading-tight truncate mt-0.5">
                    {ticket.province}
                  </p>
                )}
              </div>
            </div>
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
      className="cgr-seeall-link group relative flex flex-col items-center justify-center w-full min-h-full py-2 px-1 cursor-pointer select-none text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] rounded-[16px]"
    >
      {/* Frameless Open Canvas — 3 Floating Fanned Vertical Coupon Tickets */}
      <div
        aria-hidden="true"
        className="relative w-full flex-1 min-h-[178px] sm:min-h-[218px] flex items-center justify-center pt-4 pb-1"
      >
        <div className="relative flex items-center justify-center">
          {renderMiniTicket(leftTicket, "left")}
          {renderMiniTicket(rightTicket, "right")}
          {renderMiniTicket(centerTicket, "center")}
        </div>
      </div>

      {/* Clean Frameless Editorial Label + Signature ">" Squircle Chip */}
      <div className="shrink-0 pt-2.5 pb-1 inline-flex items-center justify-center gap-1.5 max-w-full">
        <span className="text-[14.5px] sm:text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] leading-tight">
          {isTh ? "ดูทั้งหมด" : "See all"}
        </span>
        <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[9px] bg-[var(--color-background-muted)] group-hover:bg-[#222222] group-hover:text-white dark:group-hover:bg-[#f5f5f5] dark:group-hover:text-[#222222] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 transition-colors duration-200">
          <ChevronRight
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={2.5}
          />
        </span>
      </div>
    </Link>
  );
}
