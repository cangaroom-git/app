"use client";

import React, { useState } from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Maximize2,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
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
  checkInDate,
  checkOutDate,
  stayNights,
  pricingBreakdown,
  bestCouponPreview = null,
  onExpandPhotos,
}: {
  room: RoomAvailabilityDto;
  hotel: HotelProfileDto;
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  stayNights: number;
  pricingBreakdown: StayPricingBreakdown;
  bestCouponPreview?: { code: string; discountThb: number } | null;
  onExpandPhotos?: (photos: string[], index: number) => void;
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
  const isTh = language === "th";
  const isAvailable = room.availableUnits > 0;
  const discountedSubtotal =
    bestCouponPreview && bestCouponPreview.discountThb > 0
      ? Math.max(
          0,
          pricingBreakdown.roomSubtotalThb - bestCouponPreview.discountThb
        )
      : null;

  return (
    <div className="space-y-4 pb-3">
      {/* 1. Hero Gallery + Tap-to-Zoom Fullscreen + Squircle Thumbnail Strip */}
      <div className="space-y-2.5">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => onExpandPhotos?.(photos, safeIdx)}
            aria-label={isTh ? "ขยายดูรูปภาพเต็มหน้าจอ" : "Expand room photo"}
            className="block w-full h-full cursor-pointer"
          >
            <img
              src={photos[safeIdx]}
              alt={isTh ? room.nameTh : room.nameEn}
              className="h-full w-full object-cover"
            />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((prev) => (prev - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[12px] bg-[var(--color-background-card)]/95 border border-[var(--color-border)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--color-background-card)]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((prev) => (prev + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[12px] bg-[var(--color-background-card)]/95 border border-[var(--color-border)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--color-background-card)]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {onExpandPhotos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpandPhotos(photos, safeIdx);
              }}
              className="absolute bottom-3 right-3 h-8 px-3 rounded-[10px] bg-[var(--color-background-card)]/95 hover:bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>
                {photos.length > 1
                  ? `${isTh ? "ดูรูปเต็ม" : "Expand"} · ${safeIdx + 1}/${photos.length}`
                  : isTh
                  ? "ดูรูปเต็ม"
                  : "Expand"}
              </span>
            </button>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {photos.map((photoUrl, idx) => {
              const isSelected = idx === safeIdx;
              return (
                <button
                  key={`${photoUrl}-${idx}`}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={
                    isTh ? `ดูภาพที่ ${idx + 1}` : `View photo ${idx + 1}`
                  }
                  className={`relative h-[52px] w-[68px] rounded-[10px] overflow-hidden shrink-0 cursor-pointer border-2 transition-opacity ${
                    isSelected
                      ? "border-[#111111] dark:border-[#f5f5f5] opacity-100"
                      : "border-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Airbnb-Style Clean 1px Divided Sections */}
      <div className="divide-y divide-[var(--color-border)]">
        {/* Section A: Header, Specs & Description */}
        <section className="pb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-[8px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] px-2.5 h-6 ty-caption font-bold">
              {room.code}
            </span>
            <span className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-text-primary)]">
              <Star className="w-3.5 h-3.5 fill-current text-[var(--color-text-primary)]" />
              {hotel.ratingAvg.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1 ty-caption text-[var(--color-text-secondary)]">
              <MapPin className="w-3.5 h-3.5" />
              {isTh ? hotel.provinceNameTh : hotel.provinceNameEn}
            </span>
          </div>

          <h3 className="ty-title text-[var(--color-text-primary)]">
            {isTh ? room.nameTh : room.nameEn}
          </h3>

          <p className="ty-caption font-medium text-[var(--color-text-primary)]">
            {isTh
              ? `สูงสุด ${room.maxGuests} ท่าน · ${room.bedrooms} ห้องนอน · ${room.beds} เตียง · ${room.bathrooms} ห้องน้ำ · ${room.sizeSqm} ตร.ม.`
              : `Up to ${room.maxGuests} guests · ${room.bedrooms} bedrooms · ${room.beds} beds · ${room.bathrooms} baths · ${room.sizeSqm} sqm`}
          </p>

          {(isTh ? room.shortDescTh : room.shortDescEn || room.shortDescTh) && (
            <p className="ty-body text-[var(--color-text-secondary)] pt-0.5">
              {isTh ? room.shortDescTh : room.shortDescEn || room.shortDescTh}
            </p>
          )}
        </section>

        {/* Section B: Airbnb Key Stay Highlights */}
        <section className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-[18px] h-[18px] text-[var(--color-text-primary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? `เช็กอิน ${hotel.checkInTime} น. · เช็กเอาต์ ${hotel.checkOutTime} น.`
                  : `Check-in ${hotel.checkInTime} · Check-out ${hotel.checkOutTime}`}
              </p>
              <p className="ty-caption text-[var(--color-text-secondary)]">
                {isTh
                  ? "ติดต่อรับกุญแจและเช็กอินกับทางที่พักได้โดยตรง"
                  : "Flexible direct check-in coordinated with the property host"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Tag className="w-[18px] h-[18px] text-[var(--color-text-primary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? `วันธรรมดา ฿${room.weekdayPriceThb.toLocaleString()} · ศุกร์–เสาร์ ฿${room.weekendPriceThb.toLocaleString()} / คืน`
                  : `Weekdays ฿${room.weekdayPriceThb.toLocaleString()} · Fri–Sat ฿${room.weekendPriceThb.toLocaleString()} / night`}
              </p>
              <p className="ty-caption text-[var(--color-text-secondary)]">
                {room.extraGuestPriceThb > 0
                  ? isTh
                    ? `ราคามาตรฐานสำหรับ ${room.standardGuests} ท่าน (ผู้เข้าพักเพิ่ม +฿${room.extraGuestPriceThb.toLocaleString()}/ท่าน/คืน)`
                    : `Standard rate for ${room.standardGuests} guests (extra guest +฿${room.extraGuestPriceThb.toLocaleString()}/night)`
                  : isTh
                  ? `ราคารวมเข้าพักมาตรฐาน ${room.standardGuests} ท่าน`
                  : `Standard rate includes ${room.standardGuests} guests`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-[18px] h-[18px] text-[var(--color-text-primary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? "จองตรง 0% GP ไม่มีค่าธรรมเนียมแพลตฟอร์ม"
                  : "Direct 0% GP booking with zero platform markup"}
              </p>
              <p className="ty-caption text-[var(--color-text-secondary)]">
                {isTh
                  ? `ชำระเงินตรงเข้าบัญชี ${hotel.nameTh} พร้อมล็อคห้อง 15 นาที`
                  : `Transfer directly to ${hotel.nameEn || hotel.nameTh} with 15-min instant hold`}
              </p>
            </div>
          </div>
        </section>

        {/* Section C: Amenities (Clean 2-Column Icon Grid) */}
        {room.amenities.length > 0 && (
          <section className="py-4 space-y-3">
            <h4 className="ty-subtitle font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-[var(--color-text-primary)]" />
              <span>
                {isTh ? "สิ่งอำนวยความสะดวกในห้อง" : "What this room offers"}
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
              {room.amenities.map((item) => {
                const meta = getFacilityIconMeta(item);
                const Icon = meta.Icon;
                return (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 ty-body text-[var(--color-text-primary)] min-w-0"
                  >
                    <Icon className="w-[18px] h-[18px] text-[var(--color-text-secondary)] shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section D: Selected Dates & Coupon-Aware Summary */}
        <section className="pt-4">
          <div className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="ty-caption font-semibold text-[var(--color-text-primary)]">
                {formatShortDate(checkInDate, language)} →{" "}
                {formatShortDate(checkOutDate, language)} ({stayNights}{" "}
                {isTh ? "คืน" : "nights"})
              </p>

              <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 h-6 text-[11px] font-semibold text-[var(--color-text-primary)]">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    isAvailable ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span>
                  {isAvailable
                    ? isTh
                      ? `ว่าง ${room.availableUnits} ห้อง`
                      : `${room.availableUnits} left`
                    : isTh
                    ? "เต็มช่วงวันที่เลือก"
                    : "Sold out"}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="ty-caption text-[var(--color-text-secondary)]">
                  {discountedSubtotal !== null
                    ? isTh
                      ? "ราคาห้องพักหลังหักคูปอง"
                      : "Estimated room total after coupon"
                    : isTh
                    ? `ค่าห้องพัก (${stayNights} คืน)`
                    : `Room total (${stayNights} nights)`}
                </p>
                <div className="flex items-baseline gap-2">
                  {discountedSubtotal !== null ? (
                    <>
                      <span className="ty-title text-[var(--color-text-primary)]">
                        ฿{discountedSubtotal.toLocaleString()}
                      </span>
                      <span className="ty-caption line-through text-[var(--color-text-secondary)]">
                        ฿{pricingBreakdown.roomSubtotalThb.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="ty-title text-[var(--color-text-primary)]">
                      ฿{pricingBreakdown.roomSubtotalThb.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {bestCouponPreview && bestCouponPreview.discountThb > 0 && (
                <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  <Tag className="w-3 h-3" />
                  <span>
                    {bestCouponPreview.code} · −฿
                    {bestCouponPreview.discountThb.toLocaleString()}
                  </span>
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
