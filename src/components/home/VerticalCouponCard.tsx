"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import {
  formatDistanceKmLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface VerticalCouponCardProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  priority?: boolean;
  isHighlighted?: boolean;
  notchBgClass?: string;
  enablePhotoSlide?: boolean;
  distanceKm?: number | null;
  onClose?: () => void;
  onSelect: (
    pin: PinFeedItemDto,
    originRect?: CardOriginRect | null,
    event?: React.MouseEvent | React.KeyboardEvent
  ) => void;
  onToggleSave: (pinId: string) => void;
  onMouseEnter?: (pin: PinFeedItemDto) => void;
  onMouseLeave?: () => void;
}

export function getDealDiscountHeadline(
  pin: PinFeedItemDto,
  language: LanguageCode
): string {
  const isTh = language === "th";
  if (isTh && pin.promoHeadlineTh) return pin.promoHeadlineTh;
  if (!isTh && pin.promoHeadlineEn) return pin.promoHeadlineEn;
  if (pin.activeCoupon) {
    if (isTh && pin.activeCoupon.badgeTextTh?.trim()) {
      return pin.activeCoupon.badgeTextTh.trim();
    }
    if (!isTh && pin.activeCoupon.badgeTextEn?.trim()) {
      return pin.activeCoupon.badgeTextEn.trim();
    }
    if (pin.activeCoupon.discountValue > 0) {
      if (pin.activeCoupon.discountType === "PERCENT") {
        return isTh
          ? `ลด ${pin.activeCoupon.discountValue}%`
          : `${pin.activeCoupon.discountValue}% OFF`;
      }
      return isTh
        ? `ลด ฿${pin.activeCoupon.discountValue.toLocaleString()}`
        : `฿${pin.activeCoupon.discountValue.toLocaleString()} OFF`;
    }
  }
  if (pin.nightlyPriceThb) {
    return isTh
      ? `เริ่ม ฿${pin.nightlyPriceThb.toLocaleString()}`
      : `From ฿${pin.nightlyPriceThb.toLocaleString()}`;
  }
  const catMeta = getPlaceCategoryMeta(pin.placeCategory);
  return isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn;
}

/**
 * Returns ONLY a real active promotion headline, or null when the place has no promo.
 * (No-promo places like scenic viewpoints/attractions omit the promo line cleanly!)
 */
export function getDealPromoOnlyHeadline(
  pin: PinFeedItemDto,
  language: LanguageCode
): string | null {
  const isTh = language === "th";
  if (isTh && pin.promoHeadlineTh?.trim()) return pin.promoHeadlineTh.trim();
  if (!isTh && pin.promoHeadlineEn?.trim()) return pin.promoHeadlineEn.trim();
  if (pin.activeCoupon) {
    if (isTh && pin.activeCoupon.badgeTextTh?.trim()) {
      return pin.activeCoupon.badgeTextTh.trim();
    }
    if (!isTh && pin.activeCoupon.badgeTextEn?.trim()) {
      return pin.activeCoupon.badgeTextEn.trim();
    }
    if (pin.activeCoupon.discountValue > 0) {
      if (pin.activeCoupon.discountType === "PERCENT") {
        return isTh
          ? `ลด ${pin.activeCoupon.discountValue}%`
          : `${pin.activeCoupon.discountValue}% OFF`;
      }
      return isTh
        ? `ลด ฿${pin.activeCoupon.discountValue.toLocaleString()}`
        : `฿${pin.activeCoupon.discountValue.toLocaleString()} OFF`;
    }
    if (pin.activeCoupon.titleTh.trim()) {
      return isTh ? pin.activeCoupon.titleTh.trim() : pin.activeCoupon.titleEn.trim();
    }
  }
  return null;
}

export const VerticalCouponCard = React.memo(function VerticalCouponCard({
  pin,
  language,
  isSaved,
  priority = false,
  isHighlighted = false,
  enablePhotoSlide = false,
  distanceKm,
  onClose,
  onSelect,
  onToggleSave,
  onMouseEnter,
  onMouseLeave,
}: VerticalCouponCardProps) {
  const cardMediaRef = useRef<HTMLDivElement | null>(null);
  const [hasInteractedWithSlides, setHasInteractedWithSlides] = useState(false);
  const isTh = language === "th";

  const measureMediaRect = (): CardOriginRect | null => {
    const el = cardMediaRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceName = isTh ? pin.provinceNameTh : pin.provinceNameEn;
  const promoHeadline = getDealPromoOnlyHeadline(pin, language);
  const resolvedDistance = formatDistanceKmLabel(
    distanceKm ?? pin.distanceKm,
    language
  );

  // Build deduplicated photo slides when inline photo sliding is enabled:
  // Slide 0 is ALWAYS coverImageUrl (Coupon Front), followed by up to 4 additional mediaUrls.
  const photoSlides = useMemo(() => {
    const cleanCover = (pin.coverImageUrl || "").trim();
    const list: string[] = [];
    const seen = new Set<string>();
    const addUrl = (raw: string) => {
      const url = (raw || "").trim();
      if (!url || url.includes("res.cloudinary.com/dxxb2gvyw/")) return;
      let key = url;
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "images.unsplash.com") {
          key = `${parsed.origin}${parsed.pathname}`;
        }
      } catch {
        // raw url key
      }
      if (seen.has(key)) return;
      seen.add(key);
      list.push(url);
    };

    if (cleanCover) addUrl(cleanCover);
    if (enablePhotoSlide && Array.isArray(pin.mediaUrls)) {
      for (const m of pin.mediaUrls) {
        if (list.length >= 5) break;
        addUrl(m);
      }
    }
    return list.length > 0 ? list : [pin.coverImageUrl];
  }, [pin.coverImageUrl, pin.mediaUrls, enablePhotoSlide]);

  const [slideIdx, setSlideIdx] = useState(0);
  const swipeStateRef = useRef<{
    startX: number;
    startY: number;
    locked: "horizontal" | "vertical" | null;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    setSlideIdx(0);
  }, [pin.id]);

  const canSlidePhotos = enablePhotoSlide && photoSlides.length > 1;

  const handlePhotoTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canSlidePhotos) return;
    const t = e.touches[0];
    if (!t) return;
    swipeStateRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      locked: null,
    };
  };

  const handlePhotoTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const st = swipeStateRef.current;
    if (!canSlidePhotos || !st) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    if (st.locked === null) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        st.locked = "horizontal";
      } else if (Math.abs(dy) > 10) {
        st.locked = "vertical";
      }
    }
    if (st.locked === "horizontal") {
      e.stopPropagation();
    }
  };

  const handlePhotoTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const st = swipeStateRef.current;
    swipeStateRef.current = null;
    if (!canSlidePhotos || !st) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - st.startX;
    if (st.locked === "horizontal" && Math.abs(dx) > 26) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 260);
      setSlideIdx((prev) =>
        dx < 0
          ? Math.min(photoSlides.length - 1, prev + 1)
          : Math.max(0, prev - 1)
      );
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (suppressNextClickRef.current) return;
        onSelect(pin, measureMediaRect(), e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(pin, measureMediaRect(), e);
        }
      }}
      onMouseEnter={() => {
        if (!hasInteractedWithSlides) setHasInteractedWithSlides(true);
        onMouseEnter?.(pin);
      }}
      onTouchStart={() => {
        if (!hasInteractedWithSlides) setHasInteractedWithSlides(true);
      }}
      onMouseLeave={() => onMouseLeave?.()}
      aria-label={promoHeadline ? `${promoHeadline} — ${hotelName}` : hotelName}
      className="group relative flex flex-col w-full cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] rounded-[20px]"
    >
      {/* Clean Borderless Collectible Travel Card (3:4 across entire website — Airbnb Photo-Only Standard):
          - ZERO card border/rim, crisp full-bleed photography + semicircular coupon side cutouts
          - Top-Left: Colored Category Crest (STAY / CAFE / RESTAURANT / ATTRACTION / WELLNESS)
          - Top-Right: Pin/Save to Trip button
          - ZERO Like badge, ZERO video, ZERO place name clutter on the photo, ZERO hover scale! */}
      <div
        ref={cardMediaRef}
        onTouchStart={handlePhotoTouchStart}
        onTouchMove={handlePhotoTouchMove}
        onTouchEnd={handlePhotoTouchEnd}
        className={`cgr-fanned-coupon-mask relative aspect-[3/4] w-full shrink-0 rounded-[18px] sm:rounded-[20px] overflow-hidden bg-[var(--color-background-muted)] ${
          isHighlighted
            ? "ring-2 ring-[var(--color-text-primary)]"
            : ""
        }`}
      >
        {canSlidePhotos ? (
          <div
            style={{ transform: `translate3d(-${slideIdx * 100}%, 0, 0)` }}
            className="flex h-full w-full transition-transform duration-300 ease-out"
          >
            {photoSlides.map((url, idx) => {
              const shouldRenderSlide =
                idx === slideIdx || hasInteractedWithSlides;
              return shouldRenderSlide ? (
                <img
                  key={`${pin.id}-slide-${idx}`}
                  src={getOptimizedPinImageUrl(url, "card")}
                  srcSet={getOptimizedPinImageSrcSet(url, "card")}
                  sizes={PIN_IMAGE_SIZES.card}
                  alt={idx === 0 ? hotelName : `${hotelName} ${idx + 1}`}
                  loading={priority && idx === 0 ? "eager" : "lazy"}
                  fetchPriority={priority && idx === 0 ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full shrink-0 object-cover object-center"
                />
              ) : (
                <div
                  key={`${pin.id}-slide-${idx}`}
                  className="h-full w-full shrink-0 bg-[var(--color-background-muted)]"
                />
              );
            })}
          </div>
        ) : (
          <img
            src={getOptimizedPinImageUrl(pin.coverImageUrl, "card")}
            srcSet={getOptimizedPinImageSrcSet(pin.coverImageUrl, "card")}
            sizes={PIN_IMAGE_SIZES.card}
            alt={hotelName}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover object-center"
          />
        )}

        {/* Top-Left Flush Corner Category Crest (Scoped 5-Category Matte Emblem) */}
        <div className="absolute top-0 left-0 z-10 pointer-events-none">
          <PlaceCategoryCrest
            category={pin.placeCategory}
            language={language}
            corner="top-left"
          />
        </div>

        {/* Top-Right Flush Corner Controls: Pin/Bookmark (+ Optional Close ×) */}
        <div className="absolute top-0 right-0 z-10 flex items-center">
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label={isTh ? "ปิดตัวอย่าง" : "Close preview"}
              className="mr-1 mt-1 h-7 w-7 rounded-[9px] bg-white/92 hover:bg-white dark:bg-[#1e1e1e]/92 dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f5f5f5] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.4} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(pin.id);
            }}
            aria-label={
              isSaved
                ? isTh
                  ? "นำคูปองออกจากทริป"
                  : "Remove saved deal"
                : isTh
                ? "บันทึกคูปองเข้าทริป"
                : "Save deal to trip"
            }
            title={
              isSaved
                ? isTh
                  ? "บันทึกแล้ว"
                  : "Saved"
                : isTh
                ? "บันทึกโปร"
                : "Save deal"
            }
            className="h-10 w-10 rounded-bl-[14px] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[20px] h-[20px]"
              aria-hidden="true"
            >
              <path
                d="M6.5 3.75h11a1.75 1.75 0 0 1 1.75 1.75v15.2l-6.64-4.15a1.15 1.15 0 0 0-1.22 0L4.75 20.7V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
                fill={isSaved ? "#e60023" : "rgba(0, 0, 0, 0.35)"}
                stroke="#ffffff"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Desktop Mini Prev/Next Photo Slide Controls */}
        {canSlidePhotos && slideIdx > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSlideIdx((prev) => Math.max(0, prev - 1));
            }}
            aria-label={isTh ? "ภาพก่อนหน้า" : "Previous photo"}
            className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-[7px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm items-center justify-center cursor-pointer transition-opacity"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        )}
        {canSlidePhotos && slideIdx < photoSlides.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSlideIdx((prev) => Math.min(photoSlides.length - 1, prev + 1));
            }}
            aria-label={isTh ? "ภาพถัดไป" : "Next photo"}
            className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 absolute right-2.5 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-[7px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm items-center justify-center cursor-pointer transition-opacity"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        )}

        {/* Subtle Bottom-Center Pagination Dots When Inline Slide Active */}
        {canSlidePhotos && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-[8px] bg-black/30 backdrop-blur-[2px]"
          >
            {photoSlides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === slideIdx ? "w-2.5 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clean Borderless Editorial Caption Below Photo:
          - With Promo: 3 lines (Promo Headline -> Place Name -> Distance/Province)
          - Without Promo: 2 lines (Place Name -> Distance/Province — zero fake promo!) */}
      <div className="pt-2.5 px-0.5 space-y-0.5 min-w-0">
        {promoHeadline && (
          <p className="text-[14.5px] sm:text-[15.5px] font-bold tracking-[-0.015em] text-[var(--color-text-primary)] leading-snug truncate tabular-nums">
            {promoHeadline}
          </p>
        )}
        <p
          className={`${
            promoHeadline
              ? "text-[13px] sm:text-[13.5px] font-medium"
              : "text-[14px] sm:text-[14.5px] font-semibold tracking-[-0.01em]"
          } text-[var(--color-text-primary)] leading-snug truncate`}
        >
          {hotelName}
        </p>
        <p className="text-[12px] sm:text-[12.5px] text-[var(--color-text-secondary)] leading-snug truncate tabular-nums">
          {resolvedDistance
            ? `${resolvedDistance} · ${provinceName}`
            : provinceName}
        </p>
      </div>
    </article>
  );
});
