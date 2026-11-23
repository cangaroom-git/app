"use client";

import React from "react";
import {
  BedDouble,
  Coffee,
  Mountain,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  formatCompactLikeCount,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import { usePlaceLike } from "@/lib/placeLikeStore";
import type { PlaceCategoryDto } from "@/types/cangaroom";

export function PlaceCategoryIcon({
  category,
  className = "w-3.5 h-3.5",
  strokeWidth = 2.2,
}: {
  category?: PlaceCategoryDto | string | null;
  className?: string;
  strokeWidth?: number;
}) {
  switch (category) {
    case "CAFE":
      return <Coffee className={className} strokeWidth={strokeWidth} />;
    case "RESTAURANT":
      return (
        <UtensilsCrossed className={className} strokeWidth={strokeWidth} />
      );
    case "ATTRACTION":
      return <Mountain className={className} strokeWidth={strokeWidth} />;
    case "WELLNESS":
      return <Waves className={className} strokeWidth={strokeWidth} />;
    case "STAY":
    default:
      return <BedDouble className={className} strokeWidth={strokeWidth} />;
  }
}

/**
 * Top-Left Colored Category Crest (Scoped 5-Category Solid Matte Exception):
 * Instantly signals STAY / CAFE / RESTAURANT / ATTRACTION / WELLNESS on every 3:4 Collectible Card.
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
  const isFlushCorner = corner === "top-left";
  const boxClass = isFlushCorner
    ? size === "sm"
      ? "h-7 w-7 rounded-br-[11px]"
      : "h-8 w-8 sm:h-9 sm:w-9 rounded-br-[14px]"
    : size === "sm"
    ? "h-6 w-6 rounded-[7px] ring-1 ring-white/25"
    : "h-7 w-7 sm:h-[30px] sm:w-[30px] rounded-[8px] sm:rounded-[9px] ring-1 ring-white/25";
  const iconClass = isFlushCorner
    ? size === "sm"
      ? "w-3.5 h-3.5"
      : "w-4 h-4 sm:w-[17px] sm:h-[17px]"
    : size === "sm"
    ? "w-3.5 h-3.5"
    : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  return (
    <span
      title={label}
      aria-label={label}
      style={{ backgroundColor: meta.crestBgHex }}
      className={`${boxClass} text-white inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <PlaceCategoryIcon category={meta.id} className={iconClass} />
    </span>
  );
}

/**
 * Bottom-Right Minimal Like Power Badge (Interactive Heart on Every Card):
 * - When likes === 0: shows heart icon ONLY (never "0")
 * - When likes > 0: shows compact heart + formatted count (143, 5.2K, 1.2M)
 * - Tapping directly toggles Like without opening the card modal!
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
      ? "h-8 sm:h-9 px-2.5 gap-1.5 rounded-tl-[14px] text-[11.5px] sm:text-[12px]"
      : "h-8 w-8 sm:h-9 sm:w-9 rounded-tl-[14px]"
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
 * Pure inline SVG icon markup for MapLibre DOM markers so map pins match
 * the exact same 5 Lucide category icons & solid matte Crest colors!
 */
export function getPlaceCategoryMapSvg(
  category?: PlaceCategoryDto | string | null,
  size = 12
): string {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  switch (category) {
    case "CAFE":
      return `<svg ${common}><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`;
    case "RESTAURANT":
      return `<svg ${common}><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`;
    case "ATTRACTION":
      return `<svg ${common}><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`;
    case "WELLNESS":
      return `<svg ${common}><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`;
    case "STAY":
    default:
      return `<svg ${common}><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`;
  }
}
