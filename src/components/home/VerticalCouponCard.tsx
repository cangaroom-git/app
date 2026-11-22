"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { getCouponTimeInfo } from "@/lib/couponHelpers";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface VerticalCouponCardProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  priority?: boolean;
  isHighlighted?: boolean;
  notchBgClass?: string;
  enablePhotoSlide?: boolean;
  onClose?: () => void;
  onSelect: (pin: PinFeedItemDto) => void;
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
    if (pin.activeCoupon.discountType === "PERCENT") {
      return isTh
        ? `ลด ${pin.activeCoupon.discountValue}%`
        : `${pin.activeCoupon.discountValue}% OFF`;
    }
    return isTh
      ? `ลด ฿${pin.activeCoupon.discountValue.toLocaleString()}`
      : `฿${pin.activeCoupon.discountValue.toLocaleString()} OFF`;
  }
  if (pin.nightlyPriceThb) {
    return isTh
      ? `เริ่ม ฿${pin.nightlyPriceThb.toLocaleString()}`
      : `From ฿${pin.nightlyPriceThb.toLocaleString()}`;
  }
  return isTh ? "โปรที่พักพิเศษ" : "Special stay deal";
}

const BORDER_THICKNESS_PX = 1.5;

export function VerticalCouponCard({
  pin,
  language,
  isSaved,
  priority = false,
  isHighlighted = false,
  enablePhotoSlide = false,
  onClose,
  onSelect,
  onToggleSave,
  onMouseEnter,
  onMouseLeave,
}: VerticalCouponCardProps) {
  const isTh = language === "th";
  const isExternal = pin.dealSourceType === "EXTERNAL";
  const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceName = isTh ? pin.provinceNameTh : pin.provinceNameEn;
  const discountHeadline = getDealDiscountHeadline(pin, language);

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

  const effectiveExpiresAt =
    pin.promoExpiresAt || pin.activeCoupon?.expiresAt || null;
  const timeInfo = effectiveExpiresAt
    ? getCouponTimeInfo(effectiveExpiresAt, language)
    : null;
  const showShortExpiry = Boolean(
    timeInfo && timeInfo.isTimeLimited && !timeInfo.isExpired && timeInfo.label
  );

  const dealPrice = pin.promoDealPriceThb ?? pin.nightlyPriceThb;
  const originalPrice =
    pin.promoOriginalPriceThb &&
    dealPrice &&
    pin.promoOriginalPriceThb > dealPrice
      ? pin.promoOriginalPriceThb
      : null;

  const sourceLabel = isExternal
    ? pin.externalSourceName || (isTh ? "ดีลภายนอก" : "Partner deal")
    : isTh
    ? "จองตรง 0% GP"
    : "Direct 0% GP";

  // Crisp continuous Warm Minimal monochrome hairline border
  const outerBorderBackground = isHighlighted
    ? "var(--color-text-primary)"
    : "var(--color-border-emphasized)";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => {
        if (suppressNextClickRef.current) return;
        onSelect(pin);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(pin);
        }
      }}
      onMouseEnter={() => onMouseEnter?.(pin)}
      onMouseLeave={() => onMouseLeave?.()}
      aria-label={`${discountHeadline} — ${hotelName}`}
      style={{
        background: outerBorderBackground,
        padding: `${BORDER_THICKNESS_PX}px`,
      }}
      className="cgr-coupon-outer group relative flex flex-col w-full rounded-[16px] cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]"
    >
      {/* Inner Masked Ticket Body — Curves Seamlessly 1.5px Inside Both Semicircular Notches */}
      <div className="cgr-coupon-inner relative flex flex-col w-full rounded-[14.5px] bg-[var(--color-background-card)] overflow-hidden">
        {/* Top Photo Zone — Pixel-Aligned With Perforation Seam & Semicircular Notches */}
        <div
          onTouchStart={handlePhotoTouchStart}
          onTouchMove={handlePhotoTouchMove}
          onTouchEnd={handlePhotoTouchEnd}
          className="cgr-coupon-photo relative w-full shrink-0 overflow-hidden bg-[var(--color-background-muted)]"
        >
          {canSlidePhotos ? (
            <div
              style={{ transform: `translate3d(-${slideIdx * 100}%, 0, 0)` }}
              className="flex h-full w-full transition-transform duration-300 ease-out"
            >
              {photoSlides.map((url, idx) => (
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
              ))}
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

          {/* Top-Left Source Tag (Shown on Slide 0 Coupon Cover) */}
          {slideIdx === 0 && (
            <span
              className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 h-5 sm:h-6 px-2 sm:px-2.5 rounded-[7px] sm:rounded-[8px] bg-white/92 dark:bg-[#1e1e1e]/92 backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold text-[#222222] dark:text-[#f5f5f5] inline-flex items-center gap-0.5 leading-none truncate ${
                onClose ? "max-w-[calc(100%-86px)]" : "max-w-[calc(100%-48px)]"
              }`}
            >
              <span className="truncate">{sourceLabel}</span>
              {isExternal && (
                <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" strokeWidth={2.2} />
              )}
            </span>
          )}

          {/* Top-Right Controls: Bookmark (+ Optional Airbnb-Style Close × When Used as Map Preview!) */}
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(pin.id);
              }}
              aria-label={
                isSaved
                  ? isTh
                    ? "นำคูปองออกจากบอร์ด"
                    : "Remove saved deal"
                  : isTh
                  ? "บันทึกคูปองเข้าบอร์ด"
                  : "Save deal to board"
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
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-[10px] inline-flex items-center justify-center cursor-pointer transition-opacity hover:opacity-90"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[21px] h-[21px] sm:w-[23px] sm:h-[23px] drop-shadow-[0_1px_4px_rgba(0,0,0,0.38)]"
                aria-hidden="true"
              >
                <path
                  d="M6.5 3.75h11a1.75 1.75 0 0 1 1.75 1.75v15.2l-6.64-4.15a1.15 1.15 0 0 0-1.22 0L4.75 20.7V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
                  fill={isSaved ? "#e60023" : "rgba(0, 0, 0, 0.45)"}
                  stroke="#ffffff"
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label={isTh ? "ปิดตัวอย่าง" : "Close preview"}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-[9px] bg-white/92 hover:bg-white dark:bg-[#1e1e1e]/92 dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f5f5f5] backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Desktop Mini Prev/Next Photo Slide Controls (When Inline Photo Slide Enabled) */}
          {canSlidePhotos && slideIdx > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSlideIdx((prev) => Math.max(0, prev - 1));
              }}
              aria-label={isTh ? "ภาพก่อนหน้า" : "Previous photo"}
              className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 absolute left-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-[7px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm items-center justify-center cursor-pointer transition-opacity"
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
              className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-[7px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm items-center justify-center cursor-pointer transition-opacity"
            >
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.4} />
            </button>
          )}

          {/* Subtle Video Tag (Bottom-Left) */}
          {pin.videoUrl && slideIdx === 0 && (
            <span className="absolute bottom-2.5 left-2 sm:left-2.5 z-10 h-5 sm:h-6 px-1.5 sm:px-2 rounded-[7px] bg-black/55 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-medium inline-flex items-center gap-1 leading-none">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{isTh ? "วิดีโอ" : "Video"}</span>
            </span>
          )}

          {/* Subtle Bottom-Center Pagination Dots When Inline Slide Active */}
          {canSlidePhotos && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-[8px] bg-black/28 backdrop-blur-[2px]"
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

        {/* Exact Centered Dashed Perforation Line Right Through Both Semicircular Notches */}
        <div
          aria-hidden="true"
          className="relative w-full h-0 shrink-0 px-2.5 sm:px-3 flex items-center"
        >
          <span className="w-full border-t border-dashed border-[var(--color-border-emphasized)]" />
        </div>

        {/* Bottom Coupon Stub — Fixed Height Anchoring Bottom-Relative Ticket Notches */}
        <div className="cgr-coupon-stub shrink-0 px-2.5 sm:px-3.5 pt-2.5 sm:pt-3 pb-2.5 sm:pb-3 flex flex-col justify-between gap-1 min-w-0 bg-[var(--color-background-card)]">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5 sm:gap-2 min-w-0">
              <p className="text-[14.5px] sm:text-[16.5px] font-bold tracking-[-0.015em] text-[var(--color-text-primary)] leading-tight truncate tabular-nums">
                {discountHeadline}
              </p>
              {showShortExpiry && timeInfo?.label && (
                <span className="text-[10px] sm:text-[11px] font-medium text-[var(--color-text-secondary)] shrink-0 tabular-nums">
                  {timeInfo.label}
                </span>
              )}
            </div>

            <p className="text-[12.5px] sm:text-[13.5px] font-medium text-[var(--color-text-primary)] leading-snug truncate">
              {hotelName}
            </p>
          </div>

          <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-secondary)] tabular-nums min-w-0">
            <p className="flex items-center gap-1 min-w-0 truncate">
              <span className="truncate">{provinceName}</span>
              {dealPrice ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[var(--color-text-primary)] shrink-0">
                    ฿{dealPrice.toLocaleString()}
                  </span>
                  {originalPrice && (
                    <span className="hidden sm:inline line-through text-[11px] text-[var(--color-text-tertiary)] shrink-0">
                      ฿{originalPrice.toLocaleString()}
                    </span>
                  )}
                </>
              ) : null}
            </p>

            {pin.hotelRatingAvg > 0 && (
              <span className="inline-flex items-center gap-0.5 shrink-0 text-[var(--color-text-primary)] font-medium">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" />
                <span>{pin.hotelRatingAvg.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
