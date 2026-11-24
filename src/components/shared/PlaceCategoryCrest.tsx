"use client";

import React from "react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  formatCompactLikeCount,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import { usePlaceLike } from "@/lib/placeLikeStore";
import type { PlaceCategoryDto } from "@/types/cangaroom";

/**
 * Modern friendly filled/duotone travel icons inspired by Explore Nearby medallions:
 * Clean architectural & travel silhouettes that read warmly at small card & map sizes.
 */
export function PlaceCategoryIcon({
  category,
  className = "w-4 h-4",
}: {
  category?: PlaceCategoryDto | string | null;
  className?: string;
  strokeWidth?: number;
}) {
  switch (category) {
    case "CAFE":
      // Warm rounded coffee cup with saucer + soft steam wisps
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path
            d="M8.5 4.2c0 1 .9 1.4.9 2.3M12 3.5c0 1 .9 1.4.9 2.3"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity="0.72"
          />
          <path
            d="M4.5 9.25A1.25 1.25 0 0 1 5.75 8h10.5A1.25 1.25 0 0 1 17.5 9.25v4.5a5.5 5.5 0 0 1-5.5 5.5h-2a5.5 5.5 0 0 1-5.5-5.5v-4.5Z"
            fill="currentColor"
          />
          <path
            d="M17.25 9.5h1.35a2.4 2.4 0 0 1 0 4.8h-1.35"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <rect x="4" y="20" width="14" height="1.9" rx="0.95" fill="currentColor" opacity="0.55" />
        </svg>
      );
    case "RESTAURANT":
      // Modern dining cloche / warm culinary emblem
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <circle cx="12" cy="6.2" r="1.5" fill="currentColor" />
          <path
            d="M4.2 16.5a7.8 7.8 0 0 1 15.6 0H4.2Z"
            fill="currentColor"
          />
          <path
            d="M8.3 12.6a4.5 4.5 0 0 1 3.7-2.1"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.65"
          />
          <rect x="2.8" y="18" width="18.4" height="2.2" rx="1.1" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "ATTRACTION":
      // Scenic twin mountain peaks + warm sun dot
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <circle cx="17.2" cy="6.8" r="2.2" fill="currentColor" opacity="0.55" />
          <path
            d="M3.2 19.2c-.6 0-.96-.67-.63-1.18l5.8-8.98a1.15 1.15 0 0 1 1.94.02l3.15 5.05 1.66-2.46a1.1 1.1 0 0 1 1.84.03l4.48 6.34c.36.51 0 1.18-.62 1.18H3.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "WELLNESS":
      // Serene 3-petal spa lotus blossom
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path
            d="M12 4.2c2.2 2.5 3.3 5.3 3.3 8.1 0 2.1-1.35 3.9-3.3 4.7-1.95-.8-3.3-2.6-3.3-4.7 0-2.8 1.1-5.6 3.3-8.1Z"
            fill="currentColor"
          />
          <path
            d="M6.4 8.2c2.2.8 3.8 2.4 4.4 4.6.45 1.6-.1 3.4-1.35 4.45-2.15-.1-4.1-1.55-4.75-3.75-.55-1.85.15-3.85 1.7-5.3Z"
            fill="currentColor"
            opacity="0.68"
          />
          <path
            d="M17.6 8.2c-2.2.8-3.8 2.4-4.4 4.6-.45 1.6.1 3.4 1.35 4.45 2.15-.1 4.1-1.55 4.75-3.75.55-1.85-.15-3.85-1.7-5.3Z"
            fill="currentColor"
            opacity="0.68"
          />
          <rect x="6.5" y="19" width="11" height="1.8" rx="0.9" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case "STAY":
    default:
      // Boutique hotel building silhouette with clean window cutouts (Screen #3 inspired)
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.5 4.5A2 2 0 0 1 7.5 2.5h9a2 2 0 0 1 2 2V19.5h1.25a.75.75 0 0 1 0 1.5H4.25a.75.75 0 0 1 0-1.5H5.5V4.5Zm3.25 2.25a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V7.5a.75.75 0 0 0-.75-.75h-1.5Zm5 0a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V7.5a.75.75 0 0 0-.75-.75h-1.5Zm-5 4.5a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V12a.75.75 0 0 0-.75-.75h-1.5Zm5 0a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V12a.75.75 0 0 0-.75-.75h-1.5Zm-3.25 4.75a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3.5h-3V16Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

/**
 * Floating Crisp-White Modern Travel Medallion (Screen #3 "Explore Nearby" inspired):
 * - Clean pure-white squircle badge (`bg-white/95 dark:bg-[#1f1f1f]/95`) holding the soothing-colored travel icon
 * - Light, airy, modern look that sits effortlessly over full-bleed super-rounded square photography
 */
export function PlaceCategoryCrest({
  category,
  language = "th",
  size = "md",
  corner = "none",
  className = "",
}: {
  category?: PlaceCategoryDto | string | null;
  language?: LanguageCode;
  size?: "sm" | "md";
  corner?: "none" | "top-left";
  className?: string;
}) {
  const meta = getPlaceCategoryMeta(category);
  const label = language === "th" ? meta.labelTh : meta.labelEn;
  const isCornerBadge = corner === "top-left";

  const boxClass = isCornerBadge
    ? size === "sm"
      ? "m-2 h-7 w-7 rounded-[10px]"
      : "m-2.5 h-8 w-8 sm:h-9 sm:w-9 rounded-[11px] sm:rounded-[12px]"
    : size === "sm"
    ? "h-7 w-7 rounded-[9px]"
    : "h-8 w-8 rounded-[10px]";

  const iconClass =
    size === "sm"
      ? "w-4 h-4"
      : "w-[17px] h-[17px] sm:w-[19px] sm:h-[19px]";

  return (
    <span
      title={label}
      aria-label={label}
      style={{ color: meta.crestBgHex }}
      className={`${boxClass} bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-sm ring-1 ring-black/[0.06] dark:ring-white/[0.1] inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <PlaceCategoryIcon category={meta.id} className={iconClass} />
    </span>
  );
}

/**
 * Bottom-Right Minimal Like Power Badge (Interactive Heart):
 */
export function PlaceLikePowerBadge({
  pinId,
  initialIsLiked,
  initialLikesCount,
  language = "th",
  interactive = true,
  size = "md",
  corner = "none",
  className = "",
}: {
  pinId: string;
  initialIsLiked: boolean;
  initialLikesCount: number;
  language?: LanguageCode;
  interactive?: boolean;
  size?: "sm" | "md";
  corner?: "none" | "bottom-right";
  className?: string;
}) {
  const { isLiked, likesCount, toggleLike } = usePlaceLike(
    pinId,
    initialIsLiked,
    initialLikesCount
  );
  const formatted = formatCompactLikeCount(likesCount);
  const isTh = language === "th";
  const isFlushCorner = corner === "bottom-right";

  const sizeClass = isFlushCorner
    ? formatted
      ? "h-8 sm:h-9 px-2.5 gap-1.5 rounded-[11px] text-[11.5px] sm:text-[12px]"
      : "h-8 w-8 sm:h-9 sm:w-9 rounded-[11px]"
    : size === "sm"
    ? formatted
      ? "h-6 px-1.5 gap-1 rounded-[8px] text-[10.5px]"
      : "h-6 w-6 rounded-[8px]"
    : formatted
    ? "h-7 sm:h-[30px] px-2 gap-1 rounded-[9px] text-[11px] sm:text-[11.5px]"
    : "h-7 w-7 sm:h-[30px] sm:w-[30px] rounded-[9px]";

  const heartSvg = (
    <svg
      viewBox="0 0 24 24"
      className={
        size === "sm"
          ? "w-3.5 h-3.5 shrink-0"
          : "w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] shrink-0"
      }
      aria-hidden="true"
    >
      <path
        d="M12 20.25s-7.25-4.55-9.2-8.72C1.22 8.17 3.05 4.75 6.45 4.75c1.92 0 3.55 1.03 4.55 2.48 1-1.45 2.63-2.48 4.55-2.48 3.4 0 5.23 3.42 3.65 6.78-1.95 4.17-9.2 8.72-9.2 8.72Z"
        fill={isLiked ? "#e60023" : "rgba(0,0,0,0.22)"}
        stroke={isLiked ? "#e60023" : "#ffffff"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!interactive) {
    return (
      <span
        aria-hidden="true"
        className={`${sizeClass} bg-black/44 backdrop-blur-sm text-white font-semibold tabular-nums inline-flex items-center justify-center leading-none select-none ${className}`}
      >
        {heartSvg}
        {formatted && <span>{formatted}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        toggleLike();
      }}
      aria-pressed={isLiked}
      aria-label={
        isLiked
          ? isTh
            ? "เลิกถูกใจสถานที่นี้"
            : "Unlike this place"
          : isTh
          ? "ถูกใจสถานที่นี้"
          : "Like this place"
      }
      title={
        formatted
          ? `${formatted} ${isTh ? "ถูกใจ" : "likes"}`
          : isTh
          ? "ถูกใจ"
          : "Like"
      }
      className={`${sizeClass} text-white font-semibold tabular-nums inline-flex items-center justify-center leading-none cursor-pointer transition-colors ${className}`}
    >
      {heartSvg}
      {formatted && <span>{formatted}</span>}
    </button>
  );
}

/**
 * Pure inline SVG icon markup for MapLibre DOM markers matching the exact same
 * 5 friendly filled travel silhouettes!
 */
export function getPlaceCategoryMapSvg(
  category?: PlaceCategoryDto | string | null,
  size = 12
): string {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"`;
  switch (category) {
    case "CAFE":
      return `<svg ${common}><path d="M4.5 9.25A1.25 1.25 0 0 1 5.75 8h10.5A1.25 1.25 0 0 1 17.5 9.25v4.5a5.5 5.5 0 0 1-5.5 5.5h-2a5.5 5.5 0 0 1-5.5-5.5v-4.5Z" fill="currentColor"/><path d="M17.25 9.5h1.35a2.4 2.4 0 0 1 0 4.8h-1.35" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="4" y="20" width="14" height="2" rx="1" fill="currentColor"/></svg>`;
    case "RESTAURANT":
      return `<svg ${common}><circle cx="12" cy="6.2" r="1.6" fill="currentColor"/><path d="M4.2 16.5a7.8 7.8 0 0 1 15.6 0H4.2Z" fill="currentColor"/><rect x="2.8" y="18" width="18.4" height="2.2" rx="1.1" fill="currentColor"/></svg>`;
    case "ATTRACTION":
      return `<svg ${common}><circle cx="17.2" cy="6.8" r="2.2" fill="currentColor" opacity="0.7"/><path d="M3.2 19.2c-.6 0-.96-.67-.63-1.18l5.8-8.98a1.15 1.15 0 0 1 1.94.02l3.15 5.05 1.66-2.46a1.1 1.1 0 0 1 1.84.03l4.48 6.34c.36.51 0 1.18-.62 1.18H3.2Z" fill="currentColor"/></svg>`;
    case "WELLNESS":
      return `<svg ${common}><path d="M12 4.2c2.2 2.5 3.3 5.3 3.3 8.1 0 2.1-1.35 3.9-3.3 4.7-1.95-.8-3.3-2.6-3.3-4.7 0-2.8 1.1-5.6 3.3-8.1Z" fill="currentColor"/><path d="M6.4 8.2c2.2.8 3.8 2.4 4.4 4.6.45 1.6-.1 3.4-1.35 4.45-2.15-.1-4.1-1.55-4.75-3.75-.55-1.85.15-3.85 1.7-5.3Z" fill="currentColor" opacity="0.75"/><path d="M17.6 8.2c-2.2.8-3.8 2.4-4.4 4.6-.45 1.6.1 3.4 1.35 4.45 2.15-.1 4.1-1.55 4.75-3.75.55-1.85-.15-3.85-1.7-5.3Z" fill="currentColor" opacity="0.75"/></svg>`;
    case "STAY":
    default:
      return `<svg ${common}><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 4.5A2 2 0 0 1 7.5 2.5h9a2 2 0 0 1 2 2V19.5h1.25a.75.75 0 0 1 0 1.5H4.25a.75.75 0 0 1 0-1.5H5.5V4.5Zm3.25 2.25a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V7.5a.75.75 0 0 0-.75-.75h-1.5Zm5 0a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V7.5a.75.75 0 0 0-.75-.75h-1.5Zm-5 4.5a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V12a.75.75 0 0 0-.75-.75h-1.5Zm5 0a.75.75 0 0 0-.75.75v1.5c0 .41.34.75.75.75h1.5c.41 0 .75-.34.75-.75V12a.75.75 0 0 0-.75-.75h-1.5Zm-3.25 4.75a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3.5h-3V16Z" fill="currentColor"/></svg>`;
  }
}
