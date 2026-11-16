"use client";

import React, { useRef, useState } from "react";
import {
  Bath,
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
      className="app-card overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch scroll-mt-20"
    >
      {/* 1. LEFT: 16:9 SWIPEABLE PHOTO CAROUSEL */}
      <div
        onClick={() => onOpenRoomDetails(activePhotoIndex)}
        className="md:col-span-5 relative w-full aspect-[16/9] md:aspect-auto md:min-h-[236px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/hero select-none"
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

        <span className="absolute top-3 left-3 pointer-events-none rounded-full bg-white/95 text-[#080809] px-2.5 py-0.5 ty-caption font-bold shadow-xs">
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
              className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[#080809] shadow-sm items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(event) => handleStepPhoto(event, 1)}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[#080809] shadow-sm items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <span className="absolute bottom-3 right-3 pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/60 text-white px-2.5 py-0.5 ty-caption font-semibold">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>
            {activePhotoIndex + 1}/{totalImagesCount}
          </span>
        </span>
      </div>

      {/* 2. RIGHT: CLEAN SPECS, AVAILABILITY & DIRECT BOOKING CTA */}
      <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 ty-caption mb-0.5">
                {isRoomAvailable ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-success)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                    <span>
                      {language === "th"
                        ? `ว่างพร้อมจอง (${roomStatus?.availableUnits || 1} หลัง)`
                        : `Available (${roomStatus?.availableUnits || 1} left)`}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-error)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
                    <span>
                      {language === "th"
                        ? "เต็มในวันที่เลือก"
                        : "Sold out on selected dates"}
                    </span>
                  </span>
                )}
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>9.8</span>
                </span>
              </div>

              <h3
                onClick={() => onOpenRoomDetails(activePhotoIndex)}
                className="ty-title hover:text-[var(--color-accent)] transition cursor-pointer leading-snug"
              >
                {language === "th" ? room.nameTh : room.nameEn}
              </h3>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onEditRoom && (
                <EditSpotButton
                  label="แก้ไขห้อง"
                  onClick={() => onEditRoom()}
                />
              )}
              <button
                type="button"
                onClick={onToggleLike}
                className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-muted)] transition cursor-pointer"
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
                className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-muted)] transition cursor-pointer"
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ty-caption text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>
                {room.baseGuests}–{room.maxGuests}{" "}
                {language === "th" ? "ท่าน" : "guests"}
              </span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>
                {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
              </span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5" />
              <span>{language === "th" ? "ฟรีอาหารเช้า" : "Breakfast"}</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              <span>{language === "th" ? "อ่างชมวิว" : "Bathtub"}</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              <span>Wi-Fi</span>
            </span>
          </div>

          <p className="ty-body text-[var(--color-text-secondary)] line-clamp-2">
            {language === "th"
              ? room.shortDescTh || room.highlightTh
              : room.shortDescEn || room.highlightEn}
          </p>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              {room.discountPercent > 0 && (
                <span className="ty-caption line-through">
                  ฿{originalNightlyRateThb.toLocaleString()}
                </span>
              )}
              <span className="ty-title font-bold text-[var(--color-text-primary)]">
                ฿{nightlyRateThb.toLocaleString()}
              </span>
              <span className="ty-caption">
                / {language === "th" ? "คืน" : "night"}
              </span>
            </div>
            {!isRoomAvailable && nextAvailableRange ? (
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
                  : `Next available ${formatShortDate(
                      nextAvailableRange.nextCheckIn,
                      language
                    )} →`}
              </button>
            ) : (
              <p className="ty-caption">
                {language === "th"
                  ? `รวม ${stayNights} คืน ฿${totalStayRateThb.toLocaleString()}`
                  : `${stayNights} nights total ฿${totalStayRateThb.toLocaleString()}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StandardButton
              variant="subtle"
              size="md"
              onClick={() => onOpenRoomDetails(activePhotoIndex)}
            >
              <span>{language === "th" ? "รายละเอียด" : "Details"}</span>
            </StandardButton>

            <StandardButton
              variant="primary"
              size="lg"
              disabled={!isRoomAvailable}
              onClick={() => {
                if (!isRoomAvailable) return;
                onBookRoom();
              }}
            >
              <span>
                {!isRoomAvailable
                  ? language === "th"
                    ? "ห้องพักเต็ม"
                    : "Sold Out"
                  : language === "th"
                  ? "จองห้องนี้"
                  : "Reserve"}
              </span>
            </StandardButton>
          </div>
        </div>
      </div>
    </article>
  );
}
