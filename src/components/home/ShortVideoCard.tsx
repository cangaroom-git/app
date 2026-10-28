"use client";

import React from "react";
import { Play } from "lucide-react";

export interface ShortVideoCardProps {
  id: string;
  title: string;
  roomCode?: string;
  posterUrl: string;
  viewsCount?: string;
  priceThb?: number;
  discountPercent?: number;
  isPinned?: boolean;
  isAvailable?: boolean;
  onCardClick?: () => void;
}

export function ShortVideoCard({
  title,
  roomCode,
  posterUrl,
  viewsCount = "450.3K",
  priceThb,
  discountPercent,
  isPinned = false,
  isAvailable = true,
  onCardClick,
}: ShortVideoCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick?.();
        }
      }}
      className="tiktok-video-card group"
      aria-label={title}
    >
      <img
        src={posterUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
        {discountPercent && discountPercent > 0 ? (
          <span className="badge-promo shadow-xs">-{discountPercent}%</span>
        ) : isPinned ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-caption font-bold shadow-xs">
            PINNED
          </span>
        ) : null}
      </div>

      <div className="absolute top-2.5 right-2.5 z-10">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ty-caption font-bold backdrop-blur-md ${
            isAvailable
              ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
              : "bg-[var(--color-error-muted)] text-[var(--color-error)]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? "bg-white" : "bg-[var(--color-error)]"
            }`}
          />
          {roomCode || (isAvailable ? "ว่าง" : "เต็ม")}
        </span>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white ty-caption font-semibold">
          <Play className="w-3.5 h-3.5 fill-white text-white" />
          <span>{viewsCount}</span>
        </span>

        {priceThb && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--color-background-card)]/95 backdrop-blur-md text-[var(--color-accent)] ty-caption font-bold shadow-xs">
            ฿{priceThb.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
