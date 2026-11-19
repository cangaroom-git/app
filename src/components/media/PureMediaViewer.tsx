"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  getOptimizedVideoUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { UniversalVideoPlayer } from "@/components/media/UniversalVideoPlayer";

export interface PureMediaSlide {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  aspectRatio?: "16/9" | "9/16";
  caption?: string;
  spaceId?: string;
  spaceLabel?: string;
}

export interface PureMediaViewerProps {
  slides: PureMediaSlide[] | null;
  initialIndex?: number;
  onClose: () => void;
}

export function PureMediaViewer({
  slides,
  initialIndex = 0,
  onClose,
}: PureMediaViewerProps) {
  const isOpen = Boolean(slides && slides.length > 0);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setSelectedSpaceId("all");
    if (slides && slides.length > 0) {
      const safeIdx = Math.min(Math.max(0, initialIndex), slides.length - 1);
      setCurrentIndex(safeIdx);
    }
  }, [slides, initialIndex]);

  const spaceTabs = useMemo(() => {
    if (!slides || slides.length === 0) return [];
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const s of slides) {
      if (!s.spaceId || !s.spaceLabel) continue;
      const existing = map.get(s.spaceId);
      if (existing) existing.count += 1;
      else map.set(s.spaceId, { id: s.spaceId, label: s.spaceLabel, count: 1 });
    }
    const items = Array.from(map.values());
    return items.length >= 2 ? items : [];
  }, [slides]);

  const filteredSlides = useMemo(() => {
    if (!slides) return [];
    if (selectedSpaceId === "all") return slides;
    const subset = slides.filter((s) => s.spaceId === selectedSpaceId);
    return subset.length > 0 ? subset : slides;
  }, [slides, selectedSpaceId]);

  const total = filteredSlides.length;

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goPrev, goNext]);

  if (!slides || slides.length === 0) {
    return null;
  }

  const safeCurrentIndex = Math.min(currentIndex, Math.max(0, total - 1));
  const activeSlide = filteredSlides[safeCurrentIndex] || filteredSlides[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onClick={onClose}
      className="fixed inset-0 z-[95] bg-black/94 flex flex-col justify-between select-none animate-fade-in-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="px-4 py-3 flex items-center justify-between gap-3 text-white shrink-0"
      >
        <div className="min-w-0 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {total > 1 && (
            <span className="rounded-[10px] bg-white/15 px-3 py-1 ty-caption !text-white font-semibold tabular-nums shrink-0">
              {safeCurrentIndex + 1} / {total}
            </span>
          )}
          {spaceTabs.length > 0 ? (
            <div className="flex items-center gap-1.5 min-w-max">
              <button
                type="button"
                onClick={() => {
                  setSelectedSpaceId("all");
                  setCurrentIndex(0);
                }}
                className={`h-8 px-3 rounded-[10px] text-[12.5px] font-medium transition-colors cursor-pointer ${
                  selectedSpaceId === "all"
                    ? "bg-white text-[#222222] font-semibold"
                    : "bg-white/12 text-white/85 hover:bg-white/20"
                }`}
              >
                ทั้งหมด ({slides.length})
              </button>
              {spaceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedSpaceId(tab.id);
                    setCurrentIndex(0);
                  }}
                  className={`h-8 px-3 rounded-[10px] text-[12.5px] font-medium transition-colors cursor-pointer ${
                    selectedSpaceId === tab.id
                      ? "bg-white text-[#222222] font-semibold"
                      : "bg-white/12 text-white/85 hover:bg-white/20"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          ) : (
            activeSlide.spaceLabel && (
              <span className="rounded-[9px] bg-white/12 px-2.5 py-1 text-[12px] font-medium text-white/85 shrink-0">
                {activeSlide.spaceLabel}
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10 rounded-[14px] bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-14 pb-4">
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-[14px] bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full flex items-center justify-center"
        >
          {activeSlide.type === "video" ? (
            <div
              className={
                activeSlide.aspectRatio === "16/9"
                  ? "w-[92vw] max-w-[960px] aspect-[16/9] rounded-[12px] overflow-hidden bg-black"
                  : "h-[78dvh] max-h-[760px] aspect-[9/16] rounded-[12px] overflow-hidden bg-black"
              }
            >
              <UniversalVideoPlayer
                videoUrl={getOptimizedVideoUrl(activeSlide.url, "hero")}
                posterUrl={
                  activeSlide.posterUrl
                    ? getOptimizedPinImageUrl(activeSlide.posterUrl, "full")
                    : undefined
                }
                posterSrcSet={
                  activeSlide.posterUrl
                    ? getOptimizedPinImageSrcSet(activeSlide.posterUrl, "full")
                    : undefined
                }
                posterSizes={PIN_IMAGE_SIZES.full}
                title={activeSlide.caption || "Video"}
                aspectRatio={activeSlide.aspectRatio || "9/16"}
                autoPlay={true}
                initialMuted={false}
              />
            </div>
          ) : (
            <img
              key={activeSlide.url}
              src={getOptimizedPinImageUrl(activeSlide.url, "full")}
              srcSet={getOptimizedPinImageSrcSet(activeSlide.url, "full")}
              sizes={PIN_IMAGE_SIZES.full}
              alt={activeSlide.caption || "Photo"}
              decoding="async"
              draggable={false}
              className="max-h-[80dvh] max-w-[92vw] sm:max-w-[84vw] object-contain rounded-[8px]"
            />
          )}
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-[14px] bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center transition cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="px-4 pb-4 pt-1 flex flex-col items-center justify-center gap-2 shrink-0"
      >
        {activeSlide.caption && (
          <p className="text-[13.5px] sm:text-[14px] text-white/90 text-center max-w-2xl leading-relaxed line-clamp-2">
            {activeSlide.spaceLabel ? (
              <span className="font-semibold text-white">
                {activeSlide.spaceLabel} ·{" "}
              </span>
            ) : null}
            {activeSlide.caption}
          </p>
        )}

        {total > 1 && total <= 12 && (
          <div className="flex items-center justify-center gap-1.5">
            {filteredSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === safeCurrentIndex ? "w-5 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

