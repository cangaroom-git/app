"use client";

import React, { useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
} from "lucide-react";
import { RoomLodge } from "@/data/rooms";
import { RoomInventoryStatus } from "@/lib/store";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { StandardButton } from "@/components/ui/standards";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";

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
  onEditRoom?: () => void;
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
  onEditRoom,
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
      {/* Left 16:9 Photo Stage */}
      <div
        onClick={() => onOpenRoomDetails(activePhotoIndex)}
        className="md:col-span-5 relative w-full aspect-[16/9] md:aspect-auto md:min-h-[224px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/hero select-none"
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
              className="h-full w-full shrink-0 snap-center snap-always object-cover"
            />
          ))}
        </div>

        {room.discountPercent > 0 && (
          <span className="absolute top-2.5 left-2.5 pointer-events-none badge-promo">
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
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 text-[#111111] items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(event) => handleStepPhoto(event, 1)}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 text-[#111111] items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <span className="absolute bottom-2.5 right-2.5 pointer-events-none rounded-[4px] bg-black/65 text-white px-2 py-0.5 text-[12px] font-medium">
          {activePhotoIndex + 1}/{totalImagesCount}
        </span>

        {onEditRoom && (
          <div className="absolute bottom-2.5 left-2.5 z-20">
            <EditSpotButton
              label="แก้ไขห้อง"
              onClick={() => onEditRoom()}
            />
          </div>
        )}
      </div>

      {/* Right Minimal Room Spec & Price Column */}
      <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] mb-0.5">
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                  {room.code}
                </span>
                <span>·</span>
                <span>
                  {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
                </span>
                <span>·</span>
                <span>
                  {room.baseGuests}–{room.maxGuests}{" "}
                  {language === "th" ? "ท่าน" : "guests"}
                </span>
                <span>·</span>
                <span>{language === "th" ? "รวมอาหารเช้า" : "Breakfast"}</span>
              </div>

              <h3
                onClick={() => onOpenRoomDetails(activePhotoIndex)}
                className="ty-subtitle font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer"
              >
                {language === "th" ? room.nameTh : room.nameEn}
              </h3>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onToggleLike}
                className="btn-icon !h-8 !w-8"
                aria-label="Save room"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked
                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={onShareRoom}
                className="btn-icon !h-8 !w-8"
                aria-label="Share room"
              >
                {isShared ? (
                  <Check className="w-4 h-4 text-[var(--color-success)]" />
                ) : (
                  <Share2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                )}
              </button>
            </div>
          </div>

          <p className="ty-body-muted line-clamp-2">
            {language === "th"
              ? room.shortDescTh || room.highlightTh
              : room.shortDescEn || room.highlightEn}
          </p>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            {isRoomAvailable ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-success)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span>
                  {language === "th"
                    ? `ว่างพร้อมจอง (${roomStatus?.availableUnits || 1} หลัง)`
                    : `${roomStatus?.availableUnits || 1} available`}
                </span>
              </span>
            ) : (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-error)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
                  <span>
                    {language === "th" ? "เต็มในวันที่เลือก" : "Unavailable"}
                  </span>
                </span>
                {nextAvailableRange && (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectNextAvailableDates(
                        nextAvailableRange.nextCheckIn,
                        nextAvailableRange.nextCheckOut
                      )
                    }
                    className="block text-[12px] font-medium text-[var(--color-link)] hover:underline cursor-pointer"
                  >
                    {language === "th"
                      ? `ว่างถัดไป ${formatShortDate(
                          nextAvailableRange.nextCheckIn,
                          language
                        )}`
                      : `Next: ${formatShortDate(
                          nextAvailableRange.nextCheckIn,
                          language
                        )}`}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                {room.discountPercent > 0 && (
                  <span className="text-[12px] text-[var(--color-text-secondary)] line-through">
                    ฿{originalNightlyRateThb.toLocaleString()}
                  </span>
                )}
                <span className="text-[18px] font-bold text-[var(--color-text-primary)]">
                  ฿{nightlyRateThb.toLocaleString()}
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  /{language === "th" ? "คืน" : "night"}
                </span>
              </div>
              <span className="block text-[12px] text-[var(--color-text-secondary)]">
                {language === "th"
                  ? `รวม ${stayNights} คืน ฿${totalStayRateThb.toLocaleString()}`
                  : `${stayNights}N ฿${totalStayRateThb.toLocaleString()}`}
              </span>
            </div>

            <StandardButton
              variant="secondary"
              size="md"
              onClick={() => onOpenRoomDetails(activePhotoIndex)}
            >
              <span>{language === "th" ? "ดูข้อมูล" : "Details"}</span>
            </StandardButton>

            <StandardButton
              variant="primary"
              size="md"
              disabled={!isRoomAvailable}
              onClick={() => {
                if (!isRoomAvailable) return;
                onBookRoom();
              }}
            >
              <span>
                {!isRoomAvailable
                  ? language === "th"
                    ? "เต็ม"
                    : "Full"
                  : language === "th"
                  ? "จองห้อง"
                  : "Book"}
              </span>
            </StandardButton>
          </div>
        </div>
      </div>
    </article>
  );
}
