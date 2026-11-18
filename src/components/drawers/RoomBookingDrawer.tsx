"use client";

import React, { useMemo } from "react";
import { Calendar, ChevronRight, ShieldCheck, X } from "lucide-react";
import {
  calculateStayPricing,
  computeCouponDiscount,
  computeNightsBetween,
} from "@/lib/bookingMath";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StandardButton } from "@/components/ui/standards";
import { RoomSpecificationView } from "@/components/booking/RoomSpecificationView";
import type {
  CouponDealDto,
  HotelProfileDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export function selectBestEligibleCoupon(
  coupons: ReadonlyArray<CouponDealDto>,
  subtotalThb: number
): { coupon: CouponDealDto; discountThb: number } | null {
  let best: { coupon: CouponDealDto; discountThb: number } | null = null;
  for (const coupon of coupons) {
    const res = computeCouponDiscount(coupon, subtotalThb);
    if (!res.error && res.discountThb > 0) {
      if (!best || res.discountThb > best.discountThb) {
        best = { coupon, discountThb: res.discountThb };
      }
    }
  }
  return best;
}

export function RoomBookingDrawer({
  isOpen,
  onClose,
  hotel,
  selectedRoom,
  dateOverrides,
  coupons,
  language,
  checkInDate,
  checkOutDate,
  guests,
  onExpandPhotos,
  onProceedToCheckout,
  onCheckRoomDates,
}: {
  isOpen: boolean;
  onClose: () => void;
  hotel: HotelProfileDto;
  selectedRoom: RoomAvailabilityDto | null;
  dateOverrides: RoomDateOverrideDto[];
  coupons: CouponDealDto[];
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  onExpandPhotos?: (photos: string[], index: number) => void;
  onProceedToCheckout: (room: RoomAvailabilityDto) => void;
  onCheckRoomDates?: (room: RoomAvailabilityDto) => void;
}) {
  useBodyScrollLock(isOpen);

  const stayNights = computeNightsBetween(checkInDate, checkOutDate);

  const baseBreakdown = useMemo(() => {
    if (!selectedRoom) {
      return {
        nights: stayNights,
        unitsBooked: 1,
        roomSubtotalThb: 0,
        addonsTotalThb: 0,
        extraGuestTotalThb: 0,
        subtotalBeforeDiscountThb: 0,
        discountThb: 0,
        netTotalThb: 0,
        appliedCouponCode: null,
        couponError: null,
      };
    }
    return calculateStayPricing({
      room: selectedRoom,
      checkInDate,
      checkOutDate,
      guests,
      unitsBooked: 1,
      overrides: dateOverrides,
    });
  }, [selectedRoom, checkInDate, checkOutDate, guests, dateOverrides, stayNights]);

  const bestCoupon = useMemo(
    () =>
      selectBestEligibleCoupon(coupons, baseBreakdown.subtotalBeforeDiscountThb),
    [coupons, baseBreakdown.subtotalBeforeDiscountThb]
  );

  const pricingBreakdown = useMemo(() => {
    if (!selectedRoom) return baseBreakdown;
    return calculateStayPricing({
      room: selectedRoom,
      checkInDate,
      checkOutDate,
      guests,
      unitsBooked: 1,
      overrides: dateOverrides,
      coupon: bestCoupon?.coupon ?? null,
    });
  }, [
    selectedRoom,
    checkInDate,
    checkOutDate,
    guests,
    dateOverrides,
    bestCoupon,
    baseBreakdown,
  ]);

  if (!isOpen || !selectedRoom) return null;

  const isRoomAvailable = selectedRoom.availableUnits > 0;
  const bestCouponPreview = bestCoupon
    ? { code: bestCoupon.coupon.code, discountThb: bestCoupon.discountThb }
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-hidden"
    >
      <div
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
        onClick={onClose}
      />

      <div className="app-right-drawer z-10 animate-slide-in-right-drawer">
        {/* Clean 1-Screen Room Details Header (No multi-step Back stack!) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-[var(--color-background-card)]/95 backdrop-blur-md px-4 sm:px-5 py-3 border-b border-[var(--color-border)] shrink-0">
          <h2 className="ty-subtitle truncate">
            {selectedRoom.code} ·{" "}
            {language === "th" ? selectedRoom.nameTh : selectedRoom.nameEn}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-icon shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Sub-strip */}
        <div className="px-4 sm:px-5 py-2 bg-[var(--color-background-muted)]/55 flex items-center justify-between ty-caption shrink-0">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {language === "th"
                ? "จองตรงกับที่พัก · ฟรีค่าธรรมเนียม 0% GP"
                : "Direct Hotel Booking · 0% GP"}
            </span>
          </span>
          <span className="font-semibold">
            {stayNights} {language === "th" ? "คืน" : "N"}
          </span>
        </div>

        {/* Pure Room Specification View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <RoomSpecificationView
            room={selectedRoom}
            hotel={hotel}
            language={language}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            stayNights={stayNights}
            pricingBreakdown={pricingBreakdown}
            bestCouponPreview={bestCouponPreview}
            onExpandPhotos={onExpandPhotos}
          />
        </div>

        {/* Footer: Jump directly to Airbnb-style Checkout page OR inspect open dates */}
        <footer className="shrink-0 bg-[var(--color-background-card)] border-t border-[var(--color-border)] px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="ty-caption block">
              {selectedRoom.code} · {stayNights}{" "}
              {language === "th" ? "คืน" : "nights"}
            </span>
            <span className="ty-title leading-none text-[var(--color-accent)]">
              ฿{pricingBreakdown.netTotalThb.toLocaleString()}
            </span>
          </div>

          {isRoomAvailable ? (
            <StandardButton
              type="button"
              variant="primary"
              size="lg"
              onClick={() => onProceedToCheckout(selectedRoom)}
            >
              <span>
                {language === "th" ? "จองห้องนี้เลย" : "Reserve room"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </StandardButton>
          ) : (
            <StandardButton
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                onClose();
                onCheckRoomDates?.(selectedRoom);
              }}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === "th" ? "เช็กวันว่างห้องนี้" : "Check dates"}
              </span>
            </StandardButton>
          )}
        </footer>
      </div>
    </div>
  );
}
