"use client";

import React from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Images,
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
  onOpenPhotoGallery?: (room: RoomLodge) => void;
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
  onOpenPhotoGallery,
  scrollContainerRef,
}: RoomSpecificationViewProps) {
  const availableUnitsForRoom = roomStatusMap[room.id]?.availableUnits ?? 0;

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

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--color-background-card)] flex flex-col animate-modal-step-in-left"
    >
      {/* Full-Bleed Hero Image Carousel */}
      <div className="relative aspect-[16/10] sm:aspect-auto sm:h-[260px] w-full shrink-0 overflow-hidden bg-[var(--color-background-muted)]">
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${slideImageIndex * 100}%)`,
          }}
        >
          {room.images.map((imageItem, imageIdx) => (
            <img
              key={imageIdx}
              src={imageItem.url}
              alt={imageItem.captionTh || room.nameTh}
              onClick={() => onOpenPhotoGallery?.(room)}
              className={`h-full w-full shrink-0 object-cover ${
                onOpenPhotoGallery ? "cursor-pointer" : ""
              }`}
            />
          ))}
        </div>

        {room.discountPercent > 0 && (
          <span className="badge-promo absolute top-3 left-3 shadow-xs">
            <Tag className="w-3 h-3" />
            <span>
              {language === "th"
                ? `ลด ${room.discountPercent}%`
                : `-${room.discountPercent}%`}
            </span>
          </span>
        )}

        {room.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                onChangeSlideImageIndex(
                  (prevIndex) =>
                    (prevIndex - 1 + room.images.length) % room.images.length
                )
              }
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/65 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeSlideImageIndex(
                  (prevIndex) => (prevIndex + 1) % room.images.length
                )
              }
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/65 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {onOpenPhotoGallery && (
            <button
              type="button"
              onClick={() => onOpenPhotoGallery(room)}
              className="rounded-full bg-black/75 hover:bg-black/90 px-3 h-7 inline-flex items-center gap-1.5 ty-caption font-semibold !text-white transition cursor-pointer"
            >
              <Images className="w-3.5 h-3.5" />
              <span>
                {language === "th" ? "ดูรูปทั้งหมด" : "All Photos"}
              </span>
            </button>
          )}
          <span className="rounded-full bg-black/75 px-2.5 h-7 inline-flex items-center ty-caption font-semibold !text-white">
            {slideImageIndex + 1}/{room.images.length}
          </span>
        </div>
      </div>

      {/* Flat Room Specs, Inline Highlights & Amenities (Zero Box-in-Box) */}
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

          {/* Inline Core Specs (Replaces Highlight Boxes) */}
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

        {/* Flat Icon + Label Amenities Grid (No 10+ Separate Gray Boxes) */}
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
                  <span className="font-semibold">
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
