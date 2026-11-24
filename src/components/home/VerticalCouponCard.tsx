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
      {/* Clean Borderless Modern Super-Rounded Square Travel Card (1:1 — Screen #3 Explore Nearby Inspired):
          - ZERO card border/rim, ZERO ticket side notches, crisp full-bleed photography (`rounded-[22px] sm:rounded-[24px]`)
          - Top-Left: Floating crisp-white travel medallion with soothing category icon
          - Top-Right: Heart Wishlist toggle (♥ #e60023 when saved)
          - ZERO hover scale, ZERO inline drop shadow! */}
      <div
        ref={cardMediaRef}
        onTouchStart={handlePhotoTouchStart}
        onTouchMove={handlePhotoTouchMove}
        onTouchEnd={handlePhotoTouchEnd}
        className={`relative aspect-square w-full shrink-0 rounded-[22px] sm:rounded-[24px] overflow-hidden bg-[var(--color-background-muted)] ${
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

        {/* Top-Right Inset Controls: Heart Wishlist (+ Optional Close ×) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label={isTh ? "ปิดตัวอย่าง" : "Close preview"}
              className="h-8 w-8 rounded-[10px] bg-white/95 hover:bg-white dark:bg-[#1f1f1f]/95 dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f5f5f5] ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
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
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? isTh
                  ? "นำออกจาก Wishlist"
                  : "Remove from Wishlist"
                : isTh
                ? "บันทึกเข้า Wishlist"
                : "Save to Wishlist"
            }
            title={
              isSaved
                ? isTh
                  ? "อยู่ใน Wishlist แล้ว"
                  : "Saved in Wishlist"
                : isTh
                ? "เพิ่มใน Wishlist"
                : "Add to Wishlist"
            }
            className={`h-8 w-8 sm:h-9 sm:w-9 rounded-[11px] sm:rounded-[12px] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors ${
              isSaved
                ? "bg-white/95 dark:bg-[#1f1f1f]/95 ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                : "bg-black/26 hover:bg-black/42"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]"
              aria-hidden="true"
            >
              <path
                d="M12 20.25s-7.25-4.55-9.2-8.72C1.22 8.17 3.05 4.75 6.45 4.75c1.92 0 3.55 1.03 4.55 2.48 1-1.45 2.63-2.48 4.55-2.48 3.4 0 5.23 3.42 3.65 6.78-1.95 4.17-9.2 8.72-9.2 8.72Z"
                fill={isSaved ? "#e60023" : "rgba(0, 0, 0, 0.22)"}
                stroke={isSaved ? "#e60023" : "#ffffff"}
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

      {/* Clean Borderless Editorial Caption Below Square Photo (Nyhavn-Inspired Airy Rhythm):
          - With Promo: Promo Headline -> Place Name + Rating -> Distance/Province
          - Without Promo: Place Name + Rating -> Distance/Province */}
      <div className="pt-2.5 px-1 space-y-0.5 min-w-0">
        {promoHeadline && (
          <p className="text-[14px] sm:text-[15px] font-bold tracking-[-0.015em] text-[var(--color-text-primary)] leading-snug truncate tabular-nums">
            {promoHeadline}
          </p>
        )}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <p
            className={`${
              promoHeadline
                ? "text-[13px] sm:text-[13.5px] font-medium"
                : "text-[14px] sm:text-[15px] font-semibold tracking-[-0.015em]"
            } text-[var(--color-text-primary)] leading-snug truncate`}
          >
            {hotelName}
          </p>
          {typeof pin.hotelRatingAvg === "number" && pin.hotelRatingAvg > 0 && (
            <span className="inline-flex items-center gap-0.5 shrink-0 text-[12px] sm:text-[12.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
              <svg
                viewBox="0 0 20 20"
                className="w-3.5 h-3.5 text-[#F2B035] shrink-0"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.29 3.96a1 1 0 0 0 .95.69h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 0 0-.36 1.12l1.29 3.96c.3.92-.75 1.69-1.54 1.12l-3.37-2.45a1 1 0 0 0-1.18 0l-3.37 2.45c-.79.57-1.84-.2-1.54-1.12l1.29-3.96a1 1 0 0 0-.36-1.12L2.06 9.39c-.78-.57-.38-1.81.59-1.81h4.16a1 1 0 0 0 .95-.69l1.29-3.96Z" />
              </svg>
              <span>{pin.hotelRatingAvg.toFixed(1)}</span>
            </span>
          )}
        </div>
        <p className="text-[12px] sm:text-[12.5px] text-[var(--color-text-secondary)] leading-snug truncate tabular-nums">
          {resolvedDistance
            ? `${resolvedDistance} · ${provinceName}`
            : provinceName}
        </p>
      </div>
    </article>
  );
});
