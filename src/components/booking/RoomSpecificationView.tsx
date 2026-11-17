"use client";

import React, { useState } from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Star,
  Users,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import type { StayPricingBreakdown } from "@/lib/bookingMath";
import type {
  HotelProfileDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

export function RoomSpecificationView({
  room,
  hotel,
  language,
  stayNights,
  pricingBreakdown,
}: {
  room: RoomAvailabilityDto;
  hotel: HotelProfileDto;
  language: LanguageCode;
  stayNights: number;
  pricingBreakdown: StayPricingBreakdown;
}) {
  const photos =
    room.galleryUrls.length > 0
      ? room.galleryUrls
      : [
          hotel.coverImageUrl ||
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
        ];

  const [slideIdx, setSlideIdx] = useState(0);
  const safeIdx = slideIdx < photos.length ? slideIdx : 0;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-[var(--color-background-muted)]">
        <img
          src={photos[safeIdx]}
          alt={language === "th" ? room.nameTh : room.nameEn}
          className="h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setSlideIdx((prev) => (prev - 1 + photos.length) % photos.length)
              }
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-[#111111] inline-flex items-center justify-center shadow cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((prev) => (prev + 1) % photos.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-[#111111] inline-flex items-center justify-center shadow cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 h-6 ty-caption font-bold">
            {room.code}
          </span>
          <span className="inline-flex items-center gap-1 ty-caption font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {hotel.ratingAvg.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1 ty-caption">
            <MapPin className="w-3.5 h-3.5" />
            {language === "th" ? hotel.provinceNameTh : hotel.provinceNameEn}
          </span>
        </div>

        <h3 className="ty-title">
          {language === "th" ? room.nameTh : room.nameEn}
        </h3>
        <p className="ty-body text-[var(--color-text-secondary)]">
          {language === "th" ? room.shortDescTh : room.shortDescEn}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[12px] bg-[var(--color-background-muted)] p-2.5 flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          <span className="ty-caption font-semibold">{room.sizeSqm} ตร.ม.</span>
        </div>
        <div className="rounded-[12px] bg-[var(--color-background-muted)] p-2.5 flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          <span className="ty-caption font-semibold">
            สูงสุด {room.maxGuests} ท่าน
          </span>
        </div>
        <div className="rounded-[12px] bg-[var(--color-background-muted)] p-2.5 flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          <span className="ty-caption font-semibold">
            {room.beds} เตียง · {room.bathrooms} น้ำ
          </span>
        </div>
      </div>

      {room.amenities.length > 0 && (
        <div className="space-y-2">
          <h4 className="ty-body font-bold">
            {language === "th" ? "สิ่งอำนวยความสะดวก" : "Amenities"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {room.amenities.map((item) => {
              const meta = getFacilityIconMeta(item);
              const Icon = meta.Icon;
              return (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] px-3 py-1.5 ty-caption font-medium"
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>{item}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-[14px] bg-[var(--color-background-muted)] p-3.5 flex items-center justify-between">
        <div>
          <p className="ty-caption">
            {language === "th"
              ? `ค่าห้องพัก (${stayNights} คืน)`
              : `Room estimate (${stayNights} nights)`}
          </p>
          <p className="ty-title text-[var(--color-accent)]">
            ฿{pricingBreakdown.roomSubtotalThb.toLocaleString()}
          </p>
        </div>
        <span
          className={`ty-caption font-bold px-3 py-1 rounded-full ${
            room.availableUnits > 0
              ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
              : "bg-[var(--color-error-muted)] text-[var(--color-error)]"
          }`}
        >
          {room.availableUnits > 0
            ? language === "th"
              ? `ว่าง ${room.availableUnits} ห้อง`
              : `${room.availableUnits} left`
            : language === "th"
            ? "เต็มในช่วงวันที่เลือก"
            : "Sold out"}
        </span>
      </div>
    </div>
  );
}
