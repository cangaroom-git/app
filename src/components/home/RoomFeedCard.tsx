"use client";

import React, { useRef, useState } from "react";
import {
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Heart,
  Image as ImageIcon,
  Maximize2,
  Share2,
  Star,
  Users,
  Wifi,
} from "lucide-react";
import { RoomLodge } from "@/data/rooms";
import { RoomInventoryStatus } from "@/lib/store";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { StandardButton, StatusPill } from "@/components/ui/standards";

export interface RoomFeedCardProps {
  room: RoomLodge;
  roomIndex: number;
  language: LanguageCode;
  stayNights: number;
  roomStatus?: RoomInventoryStatus;
  nextAvailableRange: { nextCheckIn: string; nextCheckOut: string } | null;
  isLiked: boolean;
  isShared: boolean;
  onToggleLike: () => void;
  onShareRoom: () => void;
  onSelectNextAvailableDates: (checkIn: string, checkOut: string) => void;
  onOpenRoomDetails: (initialPhotoIndex?: number) => void;
  onBookRoom: () => void;
}

export function RoomFeedCard({
  room,
  roomIndex,
  language,
  stayNights,
  roomStatus,
  nextAvailableRange,
  isLiked,
  isShared,
  onToggleLike,
  onShareRoom,
  onSelectNextAvailableDates,
  onOpenRoomDetails,
  onBookRoom,
}: RoomFeedCardProps) {
  const photoTrackRef = useRef<HTMLDivElement | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const totalImagesCount = room.images.length;

  const isRoomAvailable =
    roomStatus?.state === "AVAILABLE" && (roomStatus?.availableUnits ?? 0) > 0;
  const nightlyRateThb = roomStatus?.effectiveNightlyPrice ?? room.basePriceThb;
  const totalStayRateThb =
    roomStatus?.totalStayRoomPrice ?? nightlyRateThb * stayNights;
  const originalNightlyRateThb =
    room.discountPercent > 0
      ? Math.round(nightlyRateThb / (1 - room.discountPercent / 100))
      : nightlyRateThb;

  const scrollToPhotoIndex = (targetIndex: number) => {
    const trackElement = photoTrackRef.current;
    setActivePhotoIndex(targetIndex);
    if (trackElement && trackElement.clientWidth > 0) {
      trackElement.scrollTo({
        left: targetIndex * trackElement.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleStepPhoto = (
    event: React.MouseEvent<HTMLButtonElement>,
    direction: 1 | -1
  ) => {
    event.stopPropagation();
    if (totalImagesCount <= 1) return;
    const nextIndex =
      (activePhotoIndex + direction + totalImagesCount) % totalImagesCount;
    scrollToPhotoIndex(nextIndex);
  };

  const handlePhotoTrackScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const trackElement = event.currentTarget;
    if (trackElement.clientWidth <= 0) return;
    const nextIndex = Math.round(
      trackElement.scrollLeft / trackElement.clientWidth
    );
    if (
      nextIndex >= 0 &&
      nextIndex < totalImagesCount &&
      nextIndex !== activePhotoIndex
    ) {
      setActivePhotoIndex(nextIndex);
    }
  };

  return (
    <article
      id={`room-card-${room.id}`}
      className="app-card overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch scroll-mt-16"
    >
      {/* 1. Native Scroll-Snap Photo Stage — Tapping Photo Opens Unified Room Photos & Details Drawer */}
      <div
        onClick={() => onOpenRoomDetails(activePhotoIndex)}
        className="md:col-span-5 relative w-full aspect-[16/10] md:aspect-auto md:min-h-[252px] overflow-hidden bg-[var(--color-background-subtle)] cursor-pointer group/hero select-none"
      >
        <div
          ref={photoTrackRef}
          onScroll={handlePhotoTrackScroll}
          className="absolute inset-0 flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar touch-manipulation"
        >
          {room.images.map((photoItem, photoIdx) => (
            <img
              key={`${room.id}-photo-${photoIdx}`}
              src={photoItem.url}
              alt={photoItem.captionTh || room.nameTh}
              draggable={false}
              loading={roomIndex === 0 && photoIdx === 0 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full shrink-0 snap-center snap-always object-cover md:transition-transform md:duration-300"
            />
          ))}
        </div>

        <span className="absolute top-3 left-3 pointer-events-none inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 py-0.5 ty-caption font-bold">
          {room.code}
        </span>

        {room.discountPercent > 0 && (
          <span className="absolute top-3 right-3 pointer-events-none badge-promo">
            {language === "th"
              ? `ลด ${room.discountPercent}%`
              : `-${room.discountPercent}%`}
          </span>
        )}

        {totalImagesCount > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => handleStepPhoto(event, -1)}
              aria-label="Previous photo"
              className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(event) => handleStepPhoto(event, 1)}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1.5">
              {room.images.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`h-1.5 rounded-full shadow-xs transition-all duration-200 ${
                    dotIdx === activePhotoIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <span className="absolute bottom-3 right-3 pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md text-white px-2.5 py-1 ty-caption font-semibold">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>
            {activePhotoIndex + 1}/{totalImagesCount}
          </span>
        </span>
      </div>

      {/* 2. Flat Details & Inline Pricing Column (Padding only on text side) */}
      <div className="md:col-span-7 p-4 sm:p-5 md:px-6 md:py-5 flex flex-col justify-between gap-3 min-w-0">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 ty-caption mb-0.5">
                <span className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)]">
                  <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                  <span>9.8</span>
                </span>
                <span>·</span>
                <span>
                  {120 + roomIndex * 35} {language === "th" ? "รีวิว" : "reviews"}
                </span>
              </div>

              <h3
                onClick={() => onOpenRoomDetails(activePhotoIndex)}
                className="ty-title text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition cursor-pointer leading-snug"
              >
                {language === "th" ? room.nameTh : room.nameEn}
              </h3>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onToggleLike}
                className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-subtle)] transition cursor-pointer"
                title={language === "th" ? "ถูกใจ" : "Save"}
                aria-label={language === "th" ? "ถูกใจห้องพัก" : "Like room"}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked
                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={onShareRoom}
                className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-subtle)] transition cursor-pointer"
                title={language === "th" ? "แชร์ห้องพัก" : "Share room"}
                aria-label={language === "th" ? "แชร์ห้องพัก" : "Share room"}
              >
                {isShared ? (
                  <Check className="w-4 h-4 text-[var(--color-success)] stroke-[2.5]" />
                ) : (
                  <Share2 className="w-4 h-4 text-[var(--color-text-primary)]" />
                )}
              </button>
            </div>
          </div>

          {/* Flat Icon + Inline Specs (Replaces 5 nested pill boxes) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ty-caption font-medium text-[var(--color-text-primary)]">
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
              </span>
            </span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {room.baseGuests}–{room.maxGuests}{" "}
                {language === "th" ? "ท่าน" : "guests"}
              </span>
            </span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>{language === "th" ? "อาหารเช้า" : "Breakfast"}</span>
            </span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>{language === "th" ? "อ่างชมวิว" : "Bathtub"}</span>
            </span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Wi-Fi</span>
            </span>
          </div>

          <p className="ty-body-muted line-clamp-2">
            {language === "th"
              ? room.shortDescTh || room.highlightTh
              : room.shortDescEn || room.highlightEn}
          </p>
        </div>

        {/* Bottom Status + Price + Primary CTA (Single Flat Row) */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {isRoomAvailable ? (
              <StatusPill variant="success">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span>
                  {language === "th"
                    ? `ว่างพร้อมจอง (${roomStatus?.availableUnits || 1} หลัง)`
                    : `Available (${roomStatus?.availableUnits || 1} left)`}
                </span>
              </StatusPill>
            ) : (
              <>
                <StatusPill variant="error">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
                  <span>
                    {language === "th" ? "เต็มในวันที่เลือก" : "Fully booked"}
                  </span>
                </StatusPill>
                {nextAvailableRange && (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectNextAvailableDates(
                        nextAvailableRange.nextCheckIn,
                        nextAvailableRange.nextCheckOut
                      )
                    }
                    className="ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    {language === "th"
                      ? `ว่างเร็วสุด ${formatShortDate(
                          nextAvailableRange.nextCheckIn,
                          language
                        )} →`
                      : `Next ${formatShortDate(
                          nextAvailableRange.nextCheckIn,
                          language
                        )} →`}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenRoomDetails(activePhotoIndex)}
              className="ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {language === "th"
                ? "ดูรูป & รายละเอียด →"
                : "Photos & Details →"}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
            <div className="sm:text-right">
              <div className="flex items-baseline sm:justify-end gap-1.5">
                {room.discountPercent > 0 && (
                  <span className="ty-caption line-through">
                    ฿{originalNightlyRateThb.toLocaleString()}
                  </span>
                )}
                <span className="ty-display text-[var(--color-accent)] leading-none">
                  ฿{nightlyRateThb.toLocaleString()}
                </span>
                <span className="ty-caption">
                  /{language === "th" ? "คืน" : "night"}
                </span>
              </div>
              <span className="block ty-caption mt-0.5">
                {language === "th"
                  ? `รวม ${stayNights} คืน ฿${totalStayRateThb.toLocaleString()}`
                  : `${stayNights}N total ฿${totalStayRateThb.toLocaleString()}`}
              </span>
            </div>

            <StandardButton
              variant="primary"
              size="lg"
              disabled={!isRoomAvailable}
              onClick={() => {
                if (!isRoomAvailable) return;
                onBookRoom();
              }}
              className="shrink-0"
            >
              <BedDouble className="w-4 h-4" />
              <span>
                {!isRoomAvailable
                  ? language === "th"
                    ? "ห้องพักเต็ม"
                    : "Sold Out"
                  : language === "th"
                  ? "จองห้องพักนี้"
                  : "Book Room"}
              </span>
            </StandardButton>
          </div>
        </div>
      </div>
    </article>
  );
}
