"use client";

import React from "react";
import { ArrowUpRight, BadgeCheck, Clock, Info } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface DealHeroCouponSlideProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  hotelName: string;
  provinceLabel: string;
  discountHeadline: string;
  dealPrice: number | null;
  dealOriginalPrice: number | null;
  expiryLabel: string | null;
  onOpenTerms: () => void;
}

const NOTCH_PERCENT_Y = "62%";
const OUTER_HERO_MASK = [
  `radial-gradient(circle 11px at 0px ${NOTCH_PERCENT_Y}, transparent 96%, #000 100%)`,
  `radial-gradient(circle 11px at 100% ${NOTCH_PERCENT_Y}, transparent 96%, #000 100%)`,
].join(", ");

const INNER_HERO_MASK = [
  `radial-gradient(circle 12.5px at -1.5px ${NOTCH_PERCENT_Y}, transparent 96%, #000 100%)`,
  `radial-gradient(circle 12.5px at calc(100% + 1.5px) ${NOTCH_PERCENT_Y}, transparent 96%, #000 100%)`,
].join(", ");

export function DealHeroCouponSlide({
  pin,
  language,
  hotelName,
  provinceLabel,
  discountHeadline,
  dealPrice,
  dealOriginalPrice,
  expiryLabel,
  onOpenTerms,
}: DealHeroCouponSlideProps) {
  const isTh = language === "th";
  const isExternal = pin.dealSourceType === "EXTERNAL";
  const heroUrl = getOptimizedPinImageUrl(pin.coverImageUrl, "hero");
  const heroSrcSet = getOptimizedPinImageSrcSet(pin.coverImageUrl, "hero");

  const sourceLabel = isExternal
    ? pin.externalSourceName || (isTh ? "ดีลภายนอก" : "Partner deal")
    : isTh
    ? "จองตรง 0% GP"
    : "Direct 0% GP";

  const minSpendText =
    pin.activeCoupon && pin.activeCoupon.minSpendThb > 0
      ? isTh
        ? `ขั้นต่ำ ฿${pin.activeCoupon.minSpendThb.toLocaleString()}`
        : `Min spend ฿${pin.activeCoupon.minSpendThb.toLocaleString()}`
      : isTh
      ? "ไม่มีขั้นต่ำในการจอง"
      : "No minimum spend";

  const outerFrameBg = "var(--color-border-emphasized)";

  return (
    <div
      style={{
        background: outerFrameBg,
        padding: "1.5px",
        WebkitMaskImage: OUTER_HERO_MASK,
        maskImage: OUTER_HERO_MASK,
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
      className="relative w-full h-full rounded-[24px] sm:rounded-[26px] lg:rounded-[20px] select-none"
    >
      <div
        style={{
          WebkitMaskImage: INNER_HERO_MASK,
          maskImage: INNER_HERO_MASK,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
        className="relative w-full h-full rounded-[22.5px] sm:rounded-[24.5px] lg:rounded-[18.5px] overflow-hidden bg-[#181818]"
      >
        {/* Full-Bleed Edge-to-Edge Stay Photography */}
        <img
          src={heroUrl}
          srcSet={heroSrcSet}
          sizes={PIN_IMAGE_SIZES.hero}
          alt={hotelName}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Soft Editorial Legibility Veil Over Bottom Coupon Section Only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%]"
          style={{
            background:
              "linear-gradient(to top, rgba(14,14,14,0.92) 0%, rgba(14,14,14,0.72) 52%, rgba(14,14,14,0.0) 100%)",
          }}
        />

        {/* Top-Left Clean Frosted Source Tag (Clears Mobile Back Button) */}
        <span className="absolute top-3.5 left-16 lg:left-4 z-10 h-7 px-2.5 rounded-[8px] bg-white/92 dark:bg-[#1e1e1e]/92 backdrop-blur-md text-[11.5px] font-semibold text-[#222222] dark:text-[#f5f5f5] inline-flex items-center gap-1 leading-none">
          <span>{sourceLabel}</span>
          {isExternal && (
            <ArrowUpRight className="w-3 h-3 shrink-0" strokeWidth={2.2} />
          )}
        </span>

        {/* Crisp Dashed Perforation Line Aligned Dead-Center With The 62% Side Notches */}
        <div
          aria-hidden="true"
          style={{ top: NOTCH_PERCENT_Y }}
          className="pointer-events-none absolute inset-x-4 z-10 -translate-y-1/2 border-t border-dashed border-white/40"
        />

        {/* Bottom 38% Full-Bleed Editorial Coupon Details (Right Padding Clears Vertical Icon Rail!) */}
        <div
          style={{ top: NOTCH_PERCENT_Y }}
          className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-6 pr-16 sm:pr-20 pt-4 pb-5 flex flex-col justify-between text-white"
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[12.5px] font-medium text-white/85 flex items-center gap-1.5 truncate">
              <span className="truncate font-semibold text-white">
                {hotelName}
              </span>
              {pin.hotelVerificationStatus === "VERIFIED" && (
                <BadgeCheck className="w-3.5 h-3.5 text-white shrink-0" />
              )}
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{provinceLabel}</span>
            </p>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[30px] sm:text-[36px] font-bold tracking-[-0.025em] leading-none text-white tabular-nums">
                {discountHeadline}
              </span>
              {dealPrice && (
                <span className="text-[15.5px] font-semibold text-white/95 tabular-nums">
                  ฿{dealPrice.toLocaleString()}
                  <span className="text-[12.5px] font-normal text-white/75">
                    /{isTh ? "คืน" : "night"}
                  </span>
                  {dealOriginalPrice && (
                    <span className="ml-1.5 text-[12.5px] font-normal line-through text-white/55">
                      ฿{dealOriginalPrice.toLocaleString()}
                    </span>
                  )}
                </span>
              )}
            </div>

            {(isTh ? pin.titleTh : pin.titleEn) && (
              <p className="text-[13px] leading-snug text-white/80 line-clamp-2 pt-0.5">
                {isTh ? pin.titleTh : pin.titleEn}
              </p>
            )}
          </div>

          <div className="space-y-2 pt-1.5">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11.5px] text-white/75 tabular-nums">
              <span>{minSpendText}</span>
              {expiryLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{expiryLabel}</span>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              data-swipe-ignore="true"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenTerms();
              }}
              className="h-9 px-3.5 rounded-[10px] bg-white/18 hover:bg-white/28 backdrop-blur-md border border-white/30 text-[12.5px] font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-white/90 shrink-0" strokeWidth={2.1} />
              <span>{isTh ? "เงื่อนไขโปร" : "Promo terms"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
