"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (slides && slides.length > 0) {
      const safeIdx = Math.min(Math.max(0, initialIndex), slides.length - 1);
      setCurrentIndex(safeIdx);
    }
  }, [slides, initialIndex]);

  const total = slides?.length ?? 0;

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

  const activeSlide = slides[currentIndex] || slides[0];

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
        className="h-14 px-4 flex items-center justify-between text-white shrink-0"
      >
        <div className="min-w-0 flex items-center gap-2.5">
          {total > 1 && (
            <span className="rounded-[10px] bg-white/15 px-3 py-1 ty-caption !text-white font-semibold tabular-nums">
              {currentIndex + 1} / {total}
            </span>
          )}
          {activeSlide.caption && (
            <span className="ty-body !text-white/90 truncate max-w-[65vw]">
              {activeSlide.caption}
            </span>
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
        className="h-8 flex items-center justify-center gap-1.5 pb-3 shrink-0"
      >
        {total > 1 &&
          total <= 12 &&
          slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? "w-5 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
      </div>
    </div>
  );
}

