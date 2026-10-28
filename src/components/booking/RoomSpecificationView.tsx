"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { RoomLodge, WhiteLabelPropertyConfig } from "@/data/rooms";
import { RoomInventoryStatus, StayPricingBreakdown } from "@/lib/store";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";

export interface RoomSpecificationViewProps {
  room: RoomLodge;
  language: LanguageCode;
  propertyConfig: WhiteLabelPropertyConfig;
  stayNights: number;
  roomStatusMap: Record<string, RoomInventoryStatus>;
  pricingBreakdown: StayPricingBreakdown;
  slideImageIndex: number;
  onChangeSlideImageIndex: React.Dispatch<React.SetStateAction<number>>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function RoomSpecificationView({
  room,
  language,
  propertyConfig,
  stayNights,
  roomStatusMap,
  pricingBreakdown,
  slideImageIndex,
  onChangeSlideImageIndex,
  scrollContainerRef,
}: RoomSpecificationViewProps) {
  const heroTrackRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const roomPhotos = room.images?.length
    ? room.images
    : [
        {
          url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
          captionTh: room.nameTh,
          captionEn: room.nameEn,
        },
      ];
  const totalPhotosCount = roomPhotos.length;
  const safeSlideIndex =
    slideImageIndex >= 0 && slideImageIndex < totalPhotosCount
      ? slideImageIndex
      : 0;

  const availableUnitsForRoom = roomStatusMap[room.id]?.availableUnits ?? 0;

  // Reset lightbox & sync hero scroll position when switching rooms or opening at a specific photo index
  useEffect(() => {
    setIsLightboxOpen(false);
  }, [room.id]);

  useEffect(() => {
    if (isLightboxOpen) return;
    const trackElement = heroTrackRef.current;
    if (!trackElement || trackElement.clientWidth <= 0) return;
    const targetLeft = safeSlideIndex * trackElement.clientWidth;
    if (Math.abs(trackElement.scrollLeft - targetLeft) > 8) {
      trackElement.scrollTo({
        left: targetLeft,
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [isLightboxOpen, room.id]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        handleCloseLightbox();
      } else if (event.key === "ArrowLeft" && totalPhotosCount > 1) {
        onChangeSlideImageIndex(
          (prevIndex) => (prevIndex - 1 + totalPhotosCount) % totalPhotosCount
        );
      } else if (event.key === "ArrowRight" && totalPhotosCount > 1) {
        onChangeSlideImageIndex(
          (prevIndex) => (prevIndex + 1) % totalPhotosCount
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isLightboxOpen, totalPhotosCount, onChangeSlideImageIndex]);

  const scrollToHeroPhoto = (targetIndex: number) => {
    onChangeSlideImageIndex(targetIndex);
    const trackElement = heroTrackRef.current;
    if (trackElement && trackElement.clientWidth > 0) {
      trackElement.scrollTo({
        left: targetIndex * trackElement.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleStepHeroPhoto = (
    event: React.MouseEvent<HTMLButtonElement>,
    direction: 1 | -1
  ) => {
    event.stopPropagation();
    if (totalPhotosCount <= 1) return;
    const nextIndex =
      (safeSlideIndex + direction + totalPhotosCount) % totalPhotosCount;
    scrollToHeroPhoto(nextIndex);
  };

  const handleHeroTrackScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const trackElement = event.currentTarget;
    if (trackElement.clientWidth <= 0) return;
    const nextIndex = Math.round(
      trackElement.scrollLeft / trackElement.clientWidth
    );
    if (
      nextIndex >= 0 &&
      nextIndex < totalPhotosCount &&
      nextIndex !== safeSlideIndex
    ) {
      onChangeSlideImageIndex(nextIndex);
    }
  };

  const handleOpenLightbox = (photoIndex: number) => {
    if (scrollContainerRef?.current) {
      savedScrollTopRef.current = scrollContainerRef.current.scrollTop;
    }
    onChangeSlideImageIndex(photoIndex);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    requestAnimationFrame(() => {
      if (scrollContainerRef?.current) {
        scrollContainerRef.current.scrollTop = savedScrollTopRef.current;
      }
      const trackElement = heroTrackRef.current;
      if (trackElement && trackElement.clientWidth > 0) {
        trackElement.scrollTo({
          left: safeSlideIndex * trackElement.clientWidth,
          behavior: "instant" as ScrollBehavior,
        });
      }
    });
  };

  const roomAmenitiesList =
    language === "en" && room.amenitiesEn
      ? [
          ...room.amenitiesEn.outdoor,
          ...room.amenitiesEn.dining,
          ...room.amenitiesEn.common,
        ]
      : [
          ...room.amenities.outdoor,
          ...room.amenities.dining,
          ...room.amenities.common,
        ];

  const roomLongDescriptionParagraphs =
    language === "th"
      ? room.longDescTh
      : room.longDescEn?.length
      ? room.longDescEn
      : room.longDescTh;

  // In-Drawer Full-View Lightbox (Keeps Sticky "Book Room" Footer Always Accessible)
  if (isLightboxOpen) {
    const activeLightboxPhoto = roomPhotos[safeSlideIndex];
    const activeCaption =
      language === "th"
        ? activeLightboxPhoto?.captionTh || room.nameTh
        : activeLightboxPhoto?.captionEn || room.nameEn;

    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--color-background-card)]">
        <div className="px-4 sm:px-5 py-2 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCloseLightbox}
            className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {language === "th" ? "กลับไปรายละเอียด" : "Back to details"}
            </span>
          </button>

          <span className="ty-caption font-bold text-[var(--color-text-primary)] tabular-nums">
            {safeSlideIndex + 1} / {totalPhotosCount}
          </span>
        </div>

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none">
          <img
            src={activeLightboxPhoto.url}
            alt={activeCaption}
            className="max-h-full max-w-full object-contain"
          />

          {totalPhotosCount > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChangeSlideImageIndex(
                    (prevIndex) =>
                      (prevIndex - 1 + totalPhotosCount) % totalPhotosCount
                  );
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChangeSlideImageIndex(
                    (prevIndex) => (prevIndex + 1) % totalPhotosCount
                  );
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {activeCaption && (
            <div className="absolute bottom-3 inset-x-4 flex justify-center pointer-events-none">
              <span className="rounded-full bg-black/65 backdrop-blur-md text-white px-3.5 py-1 ty-caption font-medium truncate max-w-full">
                {activeCaption}
              </span>
            </div>
          )}
        </div>

        {totalPhotosCount > 1 && (
          <div className="px-4 sm:px-5 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-[var(--color-background-card)]">
            {roomPhotos.map((photoItem, photoIdx) => {
              const isSelected = photoIdx === safeSlideIndex;
              return (
                <button
                  key={`${room.id}-lb-thumb-${photoIdx}`}
                  type="button"
                  onClick={() => onChangeSlideImageIndex(photoIdx)}
                  className={`relative h-13 w-20 rounded-[8px] overflow-hidden shrink-0 transition cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[var(--color-accent)] opacity-100"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photoItem.url}
                    alt={photoItem.captionTh || room.nameTh}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--color-background-card)] flex flex-col animate-modal-step-in-left"
    >
      {/* 1. Native Scroll-Snap Swipeable Room Gallery Stage */}
      <div
        onClick={() => handleOpenLightbox(safeSlideIndex)}
        className="relative aspect-[16/10] sm:aspect-auto sm:h-[268px] w-full shrink-0 overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/detailshero select-none"
      >
        <div
          ref={heroTrackRef}
          onScroll={handleHeroTrackScroll}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar touch-manipulation"
        >
          {roomPhotos.map((imageItem, imageIdx) => (
            <img
              key={`${room.id}-spec-photo-${imageIdx}`}
              src={imageItem.url}
              alt={
                language === "th"
                  ? imageItem.captionTh || room.nameTh
                  : imageItem.captionEn || room.nameEn
              }
              draggable={false}
              className="h-full w-full shrink-0 snap-center snap-always object-cover"
            />
          ))}
        </div>

        {room.discountPercent > 0 && (
          <span className="badge-promo absolute top-3 left-3 pointer-events-none shadow-xs">
            <Tag className="w-3 h-3" />
            <span>
              {language === "th"
                ? `ลด ${room.discountPercent}%`
                : `-${room.discountPercent}%`}
            </span>
          </span>
        )}

        {totalPhotosCount > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => handleStepHeroPhoto(event, -1)}
              aria-label="Previous image"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center opacity-0 group-hover/detailshero:opacity-100 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(event) => handleStepHeroPhoto(event, 1)}
              aria-label="Next image"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white items-center justify-center opacity-0 group-hover/detailshero:opacity-100 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleOpenLightbox(safeSlideIndex);
          }}
          className="absolute bottom-3 right-3 rounded-full bg-black/70 hover:bg-black/85 backdrop-blur-md px-3 h-7 inline-flex items-center gap-1.5 ty-caption font-semibold !text-white transition cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {language === "th"
              ? `ขยายภาพ · ${safeSlideIndex + 1}/${totalPhotosCount}`
              : `Expand · ${safeSlideIndex + 1}/${totalPhotosCount}`}
          </span>
        </button>
      </div>

      {/* 2. Room Photo Thumbnail Strip (All Angles of THIS Room at a Glance) */}
      {totalPhotosCount > 1 && (
        <div className="px-4 sm:px-5 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {roomPhotos.map((photoItem, photoIdx) => {
            const isActiveSlide = photoIdx === safeSlideIndex;
            return (
              <button
                key={`${room.id}-thumb-${photoIdx}`}
                type="button"
                onClick={() => scrollToHeroPhoto(photoIdx)}
                className={`relative h-14 w-22 sm:h-15 sm:w-24 rounded-[10px] overflow-hidden shrink-0 transition cursor-pointer ${
                  isActiveSlide
                    ? "ring-2 ring-[var(--color-accent)] opacity-100"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={photoItem.url}
                  alt={photoItem.captionTh || room.nameTh}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Flat Room Specs, Inline Highlights & Amenities (Zero Box-in-Box) */}
      <div className="w-full p-4 sm:p-5 space-y-6">
        <header className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 ty-caption">
            <span className="font-semibold text-[var(--color-accent)]">
              {(room.inventoryMode || "SINGLE_UNIT") === "SINGLE_UNIT"
                ? language === "th"
                  ? "บ้านเดี่ยวส่วนตัว"
                  : "Private Villa"
                : language === "th"
                ? `ว่าง ${availableUnitsForRoom} / ${room.totalUnits} ห้อง`
                : `${availableUnitsForRoom} / ${room.totalUnits} Available`}
            </span>

            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
              <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
              <span>9.6 / 10</span>
            </span>
          </div>

          <h3 className="ty-title">
            {language === "th" ? room.nameTh : room.nameEn}
          </h3>

          {/* Inline Core Specs */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-caption text-[var(--color-text-primary)]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              {room.baseGuests}–{room.maxGuests}{" "}
              {language === "th" ? "ท่าน" : "guests"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <BedDouble className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              {language === "th" ? "เตียง King Size" : "King Bed"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {language === "th"
                ? propertyConfig.locationTh
                : propertyConfig.locationEn}
            </span>
          </div>

          <div className="space-y-2 ty-body-muted pt-1">
            {roomLongDescriptionParagraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </header>

        {/* Flat Icon + Label Amenities Grid */}
        <section className="space-y-3">
          <h4 className="ty-subtitle">
            {language === "th"
              ? `สิ่งอำนวยความสะดวก (${room.code})`
              : `Amenities (${room.code})`}
          </h4>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            {roomAmenitiesList.map((amenityLabel, amenityIdx) => {
              const { Icon } = getFacilityIconMeta(amenityLabel);
              return (
                <li
                  key={amenityIdx}
                  className="flex items-center gap-2.5 ty-body"
                >
                  <Icon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                  <span>{amenityLabel}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 1-Layer Nightly Reference Breakdown */}
        <section className="space-y-2.5">
          <h4 className="ty-subtitle">
            {language === "th"
              ? `ราคารายคืน (${stayNights} คืน)`
              : `Nightly Rates (${stayNights} nights)`}
          </h4>

          <div className="space-y-1.5 ty-body">
            {pricingBreakdown.nightlyBreakdown.map((nightlyItem) => {
              const isNightBooked =
                roomStatusMap[room.id]?.conflictDates?.includes(
                  nightlyItem.dateStr
                ) ?? false;
              return (
                <div
                  key={nightlyItem.dateStr}
                  className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {formatShortDate(nightlyItem.dateStr, language)}
                    </span>
                    <span className="ty-caption">
                      {language === "th"
                        ? nightlyItem.rateLabelTh
                        : nightlyItem.rateLabelEn || nightlyItem.rateLabelTh}
                    </span>
                    <span
                      className={`ty-caption font-semibold ${
                        isNightBooked
                          ? "text-[var(--color-error)]"
                          : "text-[var(--color-success)]"
                      }`}
                    >
                      ·{" "}
                      {isNightBooked
                        ? language === "th"
                          ? "เต็ม"
                          : "Booked"
                        : language === "th"
                        ? "ว่าง"
                        : "Available"}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    ฿{nightlyItem.finalNightlyRate.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
