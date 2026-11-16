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
  Users,
  Wifi,
} from "lucide-react";
import { RoomLodge } from "@/data/rooms";
import { RoomInventoryStatus } from "@/lib/store";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { StandardButton } from "@/components/ui/standards";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { PureMediaViewer } from "@/components/cms/PureMediaViewer";

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
      className="app-card overflow-hidden scroll-mt-16"
    >
      {/* 1. FACEBOOK POST HEADER: Avatar Badge + Room Name + Live Availability */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onOpenRoomDetails(activePhotoIndex)}
            className="h-10 w-10 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-bold ty-body inline-flex items-center justify-center shrink-0 cursor-pointer"
          >
            {room.code}
          </button>

          <div className="min-w-0">
            <h3
              onClick={() => onOpenRoomDetails(activePhotoIndex)}
              className="ty-subtitle font-bold text-[var(--color-text-primary)] hover:underline cursor-pointer truncate"
            >
              {language === "th" ? room.nameTh : room.nameEn}
            </h3>

            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ty-caption">
              {isRoomAvailable ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-success)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  <span>
                    {language === "th"
                      ? `ว่าง ${roomStatus?.availableUnits || 1} หลัง`
                      : `${roomStatus?.availableUnits || 1} available`}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-error)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
                  <span>
                    {language === "th" ? "เต็มในวันที่เลือก" : "Booked on selected dates"}
                  </span>
                </span>
              )}
              <span>·</span>
              <span>
                {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
              </span>
              <span>·</span>
              <span>
                {room.baseGuests}–{room.maxGuests}{" "}
                {language === "th" ? "ท่าน" : "guests"}
              </span>
            </div>
          </div>
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
            title={language === "th" ? "บันทึกห้องที่ชอบ" : "Save"}
            aria-label={language === "th" ? "บันทึกห้องที่ชอบ" : "Save room"}
          >
            <Heart
              className={`w-[18px] h-[18px] ${
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
            title={language === "th" ? "แชร์" : "Share"}
            aria-label={language === "th" ? "แชร์ห้องพัก" : "Share room"}
          >
            {isShared ? (
              <Check className="w-[18px] h-[18px] text-[var(--color-success)]" />
            ) : (
              <Share2 className="w-[18px] h-[18px] text-[var(--color-text-secondary)]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. CONCISE POST CAPTION & INLINE SPECS */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="ty-body text-[var(--color-text-primary)] line-clamp-2">
          {language === "th"
            ? room.shortDescTh || room.highlightTh
            : room.shortDescEn || room.highlightEn}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ty-caption text-[var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {room.baseGuests}–{room.maxGuests}{" "}
              {language === "th" ? "ท่าน" : "guests"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>
              {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5" />
            <span>{language === "th" ? "ฟรีอาหารเช้า" : "Free Breakfast"}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            <span>{language === "th" ? "อ่างอาบน้ำชมวิว" : "View Bathtub"}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi</span>
          </span>
        </div>
      </div>

      {/* 3. FULL-WIDTH 16:9 SWIPEABLE PHOTO STAGE (Opens Pure Photo Viewer Only!) */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="relative w-full aspect-[16/9] max-h-[440px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/hero select-none"
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
          <span className="absolute top-3 left-3 pointer-events-none badge-promo">
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
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(event) => handleStepPhoto(event, 1)}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/75 text-white items-center justify-center opacity-0 group-hover/hero:opacity-100 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <span className="absolute bottom-3 right-3 pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white px-2.5 py-1 ty-caption font-semibold">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>
            {activePhotoIndex + 1}/{totalImagesCount}
          </span>
        </span>
      </div>

      {/* 4. CLEAN PRICE & BOOKING ACTION FOOTER */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
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
          <p className="ty-caption">
            {!isRoomAvailable && nextAvailableRange ? (
              <button
                type="button"
                onClick={() =>
                  onSelectNextAvailableDates(
                    nextAvailableRange.nextCheckIn,
                    nextAvailableRange.nextCheckOut
                  )
                }
                className="font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {language === "th"
                  ? `ดูวันว่างถัดไป (${formatShortDate(
                      nextAvailableRange.nextCheckIn,
                      language
                    )})`
                  : `Next available: ${formatShortDate(
                      nextAvailableRange.nextCheckIn,
                      language
                    )}`}
              </button>
            ) : language === "th" ? (
              `รวม ${stayNights} คืน ฿${totalStayRateThb.toLocaleString()} · รวมอาหารเช้า`
            ) : (
              `${stayNights} nights total ฿${totalStayRateThb.toLocaleString()} · Breakfast included`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StandardButton
            variant="secondary"
            size="md"
            onClick={() => onOpenRoomDetails(activePhotoIndex)}
          >
            <span>{language === "th" ? "รายละเอียด" : "Details"}</span>
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
                  ? "เต็มแล้ว"
                  : "Sold Out"
                : language === "th"
                ? "จองห้องนี้"
                : "Book Now"}
            </span>
          </StandardButton>
        </div>
      </div>

      <PureMediaViewer
        slides={
          isLightboxOpen
            ? room.images.map((img) => ({
                type: "image" as const,
                url: img.url,
                caption:
                  language === "th"
                    ? img.captionTh || room.nameTh
                    : img.captionEn || room.nameEn,
              }))
            : null
        }
        initialIndex={activePhotoIndex}
        onClose={() => setIsLightboxOpen(false)}
      />
    </article>
  );
}
