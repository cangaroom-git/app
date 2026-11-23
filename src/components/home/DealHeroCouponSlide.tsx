"use client";

import React from "react";
import { ArrowUpRight, BadgeCheck, Clock, Info } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { getDealPromoOnlyHeadline } from "@/components/home/VerticalCouponCard";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
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
  const isDirectBooking =
    pin.merchantMode !== "PROFILE_ONLY" && pin.dealSourceType === "INTERNAL";
  const isExternal = !isDirectBooking;
  const catMeta = getPlaceCategoryMeta(pin.placeCategory);
  const realPromoHeadline = getDealPromoOnlyHeadline(pin, language);
  const hasRealPromo = Boolean(realPromoHeadline);
  const heroUrl = getOptimizedPinImageUrl(pin.coverImageUrl, "hero");
  const heroSrcSet = getOptimizedPinImageSrcSet(pin.coverImageUrl, "hero");

  const sourceLabel = isDirectBooking
    ? isTh
      ? "ที่พัก · จองตรง 0% GP"
      : "Stay · Direct 0% GP"
    : pin.placeCategory !== "STAY"
    ? isTh
      ? catMeta.labelTh
      : catMeta.labelEn
    : pin.externalSourceName || (isTh ? "ดีลภายนอก" : "Partner deal");

  const minSpendText =
    pin.activeCoupon && pin.activeCoupon.minSpendThb > 0
      ? isTh
        ? `ขั้นต่ำ ฿${pin.activeCoupon.minSpendThb.toLocaleString()}`
        : `Min spend ฿${pin.activeCoupon.minSpendThb.toLocaleString()}`
      : isTh
      ? "ไม่มีขั้นต่ำในการใช้สิทธิ์"
      : "No minimum spend";

  return (
    <div
      style={
        hasRealPromo
          ? {
              WebkitMaskImage: OUTER_HERO_MASK,
              maskImage: OUTER_HERO_MASK,
              WebkitMaskComposite: "source-in",
              maskComposite: "intersect",
            }
          : undefined
      }
      className="relative w-full h-full rounded-[24px] sm:rounded-[26px] lg:rounded-[20px] overflow-hidden bg-[#181818] select-none"
    >
      {/* Full-Bleed Edge-to-Edge Place Photography */}
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

      {/* Soft Editorial Legibility Veil Over Bottom Section Only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[54%]"
        style={{
          background:
            "linear-gradient(to top, rgba(14,14,14,0.92) 0%, rgba(14,14,14,0.68) 52%, rgba(14,14,14,0.0) 100%)",
        }}
      />

      {/* Top-Left Category Crest + Label (No longer blocked by Mobile top-left back button!) */}
      <div className="absolute top-3.5 left-3.5 lg:left-4 z-10 inline-flex items-center gap-1.5">
        <PlaceCategoryCrest
          category={pin.placeCategory}
          language={language}
          size="sm"
        />
        <span className="h-7 px-2.5 rounded-[8px] bg-white/92 dark:bg-[#1e1e1e]/92 backdrop-blur-md text-[11.5px] font-semibold text-[#222222] dark:text-[#f5f5f5] inline-flex items-center gap-1 leading-none">
          <span>{sourceLabel}</span>
          {isExternal && pin.placeCategory === "STAY" && (
            <ArrowUpRight className="w-3 h-3 shrink-0" strokeWidth={2.2} />
          )}
        </span>
      </div>

      {/* Crisp Dashed Perforation Line ONLY When Place Has an Active Promo */}
      {hasRealPromo && (
        <div
          aria-hidden="true"
          style={{ top: NOTCH_PERCENT_Y }}
          className="pointer-events-none absolute inset-x-4 z-10 -translate-y-1/2 border-t border-dashed border-white/40"
        />
      )}

      {/* Bottom Full-Bleed Details (Promo Ticket View OR Clean Editorial Place Hero View) */}
      {hasRealPromo ? (
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
              <span className="text-[28px] sm:text-[34px] font-bold tracking-[-0.025em] leading-none text-white tabular-nums">
                {realPromoHeadline || discountHeadline}
              </span>
              {dealPrice && pin.placeCategory === "STAY" && (
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
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-6 pr-16 sm:pr-20 pb-5 pt-8 flex flex-col justify-end text-white space-y-1.5">
          <p className="text-[12.5px] font-medium text-white/80 flex items-center gap-1.5 truncate">
            <span>{isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {pin.hotelDistrictTh
                ? `${pin.hotelDistrictTh}, ${provinceLabel}`
                : provinceLabel}
            </span>
          </p>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-tight text-white flex items-center gap-1.5">
            <span className="line-clamp-2">{hotelName}</span>
            {pin.hotelVerificationStatus === "VERIFIED" && (
              <BadgeCheck className="w-4 h-4 text-white shrink-0" />
            )}
          </h2>
          {(isTh ? pin.titleTh : pin.titleEn) && (
            <p className="text-[13px] leading-relaxed text-white/85 line-clamp-2">
              {isTh ? pin.titleTh : pin.titleEn}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
