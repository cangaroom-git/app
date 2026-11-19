"use client";

import React from "react";
import { Calendar, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Timer } from "lucide-react";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import type { StayPricingBreakdown } from "@/lib/bookingMath";
import { StandardInput } from "@/components/ui/standards";
import {
  BookingDigitalVoucherCard,
  PromptPayPaymentCard,
} from "@/components/booking/PromptPayPaymentCard";
import type {
  BookingSummaryDto,
  CouponDealDto,
  HotelAddonDto,
  HotelProfileDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

export interface GuestBookingFormValues {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestLine: string;
  guestNote: string;
}

export function BookingCheckoutStep({
  room,
  hotel,
  language,
  checkInDate,
  checkOutDate,
  stayNights,
  guestCount,
  pricingBreakdown,
  addons,
  addonQuantities,
  onUpdateAddonQuantity,
  coupons,
  appliedCouponCode,
  couponInput,
  onChangeCouponInput,
  couponError,
  onApplyCoupon,
  onOpenCouponWallet,
  onEditStayDates,
  guestForm,
  onChangeGuestForm,
  bookingError,
  onSubmitHoldBooking,
  activeBooking,
  holdRemainingSeconds,
  onCancelHoldBooking,
  isVerifyingSlip,
  slipError,
  slipFeedback,
  onUploadSlipFile,
  onCloseDrawer,
}: {
  room: RoomAvailabilityDto;
  hotel: HotelProfileDto;
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  stayNights: number;
  guestCount: number;
  pricingBreakdown: StayPricingBreakdown;
  addons: HotelAddonDto[];
  addonQuantities: Record<string, number>;
  onUpdateAddonQuantity: (addonId: string, delta: number) => void;
  coupons: CouponDealDto[];
  appliedCouponCode: string | null;
  couponInput: string;
  onChangeCouponInput: (value: string) => void;
  couponError: string | null;
  onApplyCoupon: (codeOverride?: string) => void;
  onOpenCouponWallet?: () => void;
  onEditStayDates: () => void;
  guestForm: GuestBookingFormValues;
  onChangeGuestForm: (updates: Partial<GuestBookingFormValues>) => void;
  bookingError: string | null;
  onSubmitHoldBooking: (event: React.FormEvent) => void;
  activeBooking: BookingSummaryDto | null;
  holdRemainingSeconds: number;
  onCancelHoldBooking: (bookingId: string) => void;
  isVerifyingSlip: boolean;
  slipError: string | null;
  slipFeedback: string | null;
  onUploadSlipFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCloseDrawer: () => void;
}) {
  if (activeBooking) {
    return (
      <div className="space-y-4">
        {activeBooking.status === "HOLD_PENDING_PAYMENT" && (
          <div className="rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Timer className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                <div className="min-w-0">
                  <p className="ty-body font-bold truncate">
                    {language === "th"
                      ? `ล็อคห้อง ${activeBooking.roomCode} ชั่วคราวแล้ว (#${activeBooking.bookingCode})`
                      : `Room ${activeBooking.roomCode} Held (#${activeBooking.bookingCode})`}
                  </p>
                  <p className="ty-caption">
                    {language === "th"
                      ? "โอนเงินและแนบสลิปภายใน 15 นาที"
                      : "Transfer and upload slip within 15 minutes"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center h-7 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] px-3 font-mono ty-caption font-bold shrink-0">
                {String(Math.floor(holdRemainingSeconds / 60)).padStart(2, "0")}:
                {String(holdRemainingSeconds % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCancelHoldBooking(activeBooking.id)}
                className="ty-caption font-semibold text-[var(--color-error)] hover:underline cursor-pointer"
              >
                {language === "th" ? "ยกเลิกการล็อคห้อง" : "Cancel hold"}
              </button>
            </div>
          </div>
        )}

        {activeBooking.status === "PENDING_VERIFICATION" ||
        activeBooking.status === "CONFIRMED" ||
        activeBooking.status === "COMPLETED" ? (
          <BookingDigitalVoucherCard
            booking={activeBooking}
            language={language}
            formatShortDateFn={formatShortDate}
            onClose={onCloseDrawer}
          />
        ) : (
          <PromptPayPaymentCard
            language={language}
            promptPayId={activeBooking.promptPayId || hotel.promptPayId}
            promptPayAccountName={
              activeBooking.promptPayAccountName || hotel.promptPayAccountName
            }
            amountThb={activeBooking.netTotalThb}
            isVerifyingSlip={isVerifyingSlip}
            slipError={slipError}
            slipFeedback={slipFeedback}
            onUploadSlip={onUploadSlipFile}
          />
        )}
      </div>
    );
  }

  return (
    <form
      id="hotel-checkout-form"
      onSubmit={onSubmitHoldBooking}
      className="space-y-6"
    >
      {bookingError && (
        <div className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-3.5 ty-caption font-semibold text-[var(--color-error)]">
          {bookingError}
        </div>
      )}

      {/* Selected Room & Dates Summary */}
      <div className="rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {room.galleryUrls[0] && (
            <img
              src={room.galleryUrls[0]}
              alt={room.nameTh}
              className="h-14 w-20 rounded-[12px] object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center h-5 rounded-[7px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] px-2 ty-caption font-bold">
                {room.code}
              </span>
              <h3 className="ty-body font-bold truncate">
                {language === "th" ? room.nameTh : room.nameEn}
              </h3>
            </div>
            <p className="ty-caption mt-1 truncate">
              {formatShortDate(checkInDate, language)} →{" "}
              {formatShortDate(checkOutDate, language)} ({stayNights}{" "}
              {language === "th" ? "คืน" : "nights"} · {guestCount}{" "}
              {language === "th" ? "ท่าน" : "guests"})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditStayDates}
          className="ty-caption font-semibold text-[var(--color-text-primary)] hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{language === "th" ? "เปลี่ยนวัน" : "Edit"}</span>
        </button>
      </div>

      {/* Add-ons Upsell (Scoped strictly to THIS hotel's checkout!) */}
      {addons.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="ty-subtitle">
            {language === "th"
              ? "บริการเสริมเฉพาะที่พักนี้"
              : "Property Add-ons"}
          </h3>
          <div className="space-y-2">
            {addons.map((addon) => {
              const qty = addonQuantities[addon.id] || 0;
              const fallbackMeta = getFacilityIconMeta(addon.nameTh);
              const FallbackIcon = fallbackMeta.Icon;
              return (
                <div
                  key={addon.id}
                  className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-2.5 sm:p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {addon.imageUrl ? (
                      <img
                        src={addon.imageUrl}
                        alt={language === "th" ? addon.nameTh : addon.nameEn}
                        className="h-14 w-14 rounded-[10px] object-cover shrink-0 bg-[var(--color-background-card)] border border-[var(--color-border)]"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-primary)]">
                        <FallbackIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="ty-body font-bold truncate">
                        {language === "th" ? addon.nameTh : addon.nameEn}
                      </h4>
                      {addon.descriptionTh && (
                        <p className="ty-caption text-[var(--color-text-secondary)] line-clamp-1">
                          {addon.descriptionTh}
                        </p>
                      )}
                      <p className="ty-caption mt-0.5">
                        <strong>+฿{addon.priceThb.toLocaleString()}</strong> /{" "}
                        {language === "th"
                          ? addon.unitLabelTh
                          : addon.unitLabelEn}
                      </p>
                    </div>
                  </div>

                  {qty > 0 ? (
                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateAddonQuantity(addon.id, -1)}
                        className="h-8 w-8 rounded-[10px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center ty-body font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateAddonQuantity(addon.id, 1)}
                        className="h-8 w-8 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateAddonQuantity(addon.id, 1)}
                      className="h-8 rounded-[10px] px-3 ty-caption font-semibold bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === "th" ? "เพิ่ม" : "Add"}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Guest Info */}
      <section className="space-y-3">
        <h3 className="ty-subtitle">
          {language === "th" ? "ข้อมูลผู้เข้าพัก" : "Guest Information"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StandardInput
            label={language === "th" ? "ชื่อ - นามสกุล *" : "Full Name *"}
            placeholder="เช่น คุณกานต์ วงศ์สวัสดิ์"
            required
            value={guestForm.guestName}
            onChange={(e) => onChangeGuestForm({ guestName: e.target.value })}
          />
          <StandardInput
            label={language === "th" ? "เบอร์โทรศัพท์ *" : "Phone Number *"}
            type="tel"
            placeholder="08X-XXX-XXXX"
            required
            value={guestForm.guestPhone}
            onChange={(e) => onChangeGuestForm({ guestPhone: e.target.value })}
          />
          <StandardInput
            label="LINE ID"
            optionalText={language === "th" ? "รับใบจอง" : "Optional"}
            placeholder="@lineid"
            value={guestForm.guestLine}
            onChange={(e) => onChangeGuestForm({ guestLine: e.target.value })}
          />
          <StandardInput
            label={language === "th" ? "คำขอพิเศษ" : "Special Requests"}
            optionalText={language === "th" ? "ไม่บังคับ" : "Optional"}
            placeholder="เช่น เช็กอิน 15:00 น."
            value={guestForm.guestNote}
            onChange={(e) => onChangeGuestForm({ guestNote: e.target.value })}
          />
        </div>
      </section>

      {/* Hotel Coupons */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="ty-subtitle flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[var(--color-text-primary)]" />
            <span>{language === "th" ? "คูปองส่วนลด" : "Coupon Code"}</span>
          </span>
          {onOpenCouponWallet && (
            <button
              type="button"
              onClick={onOpenCouponWallet}
              className="inline-flex items-center gap-1.5 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] px-3 h-7 ty-caption font-semibold cursor-pointer transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{language === "th" ? "เปิดกระเป๋าคูปอง" : "Wallet"}</span>
            </button>
          )}
        </div>

        <div className="flex items-stretch gap-2.5">
          <div className="flex-1 min-w-0">
            <StandardInput
              label={language === "th" ? "โค้ดส่วนลด" : "Coupon code"}
              type="text"
              value={couponInput}
              onChange={(e) => onChangeCouponInput(e.target.value.toUpperCase())}
              placeholder="กรอกโค้ดส่วนลดของที่พักนี้..."
              className="font-mono uppercase"
            />
          </div>
          <button
            type="button"
            onClick={() => onApplyCoupon()}
            className="min-h-[56px] px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] ty-body font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>{language === "th" ? "ใช้โค้ด" : "Apply"}</span>
          </button>
        </div>

        {coupons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {coupons.map((c) => {
              const isApplied = appliedCouponCode === c.code;
              const discountText =
                c.discountType === "PERCENT"
                  ? language === "th"
                    ? `ลด ${c.discountValue}%`
                    : `${c.discountValue}% OFF`
                  : language === "th"
                  ? `ลด ฿${c.discountValue.toLocaleString()}`
                  : `−฿${c.discountValue.toLocaleString()}`;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onApplyCoupon(c.code)}
                  className={`inline-flex items-center gap-1.5 rounded-[9px] px-3 h-8 ty-caption font-mono font-bold cursor-pointer transition border ${
                    isApplied
                      ? "bg-[#111111] border-[#111111] !text-white dark:bg-[#f5f5f5] dark:border-[#f5f5f5] dark:!text-[#111111]"
                      : "bg-[var(--color-background-muted)] border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Tag className="w-3 h-3 shrink-0" />
                  <span>{c.code}</span>
                  <span className="font-sans font-semibold opacity-85">
                    · {discountText}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {couponError && (
          <p className="ty-caption text-[var(--color-error)]">{couponError}</p>
        )}
      </section>

      {/* Price Breakdown */}
      <section className="space-y-2 ty-caption">
        <div className="flex justify-between">
          <span>
            {language === "th"
              ? `ค่าห้องพัก (${stayNights} คืน)`
              : `Room (${stayNights} nights)`}
          </span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            ฿{pricingBreakdown.roomSubtotalThb.toLocaleString()}
          </span>
        </div>
        {pricingBreakdown.addonsTotalThb > 0 && (
          <div className="flex justify-between">
            <span>{language === "th" ? "บริการเสริม" : "Add-ons"}</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              +฿{pricingBreakdown.addonsTotalThb.toLocaleString()}
            </span>
          </div>
        )}
        {pricingBreakdown.discountThb > 0 && (
          <div className="flex justify-between text-[var(--color-promo-text)] font-bold">
            <span>
              {language === "th"
                ? `ส่วนลด (${appliedCouponCode})`
                : `Discount (${appliedCouponCode})`}
            </span>
            <span>−฿{pricingBreakdown.discountThb.toLocaleString()}</span>
          </div>
        )}
        <div className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] px-4 py-3 flex justify-between items-baseline">
          <span className="ty-body font-bold text-[var(--color-text-primary)]">
            {language === "th" ? "ยอดชำระสุทธิ (0% GP)" : "Net Total (0% GP)"}
          </span>
          <span className="ty-title text-[var(--color-text-primary)]">
            ฿{pricingBreakdown.netTotalThb.toLocaleString()}
          </span>
        </div>

        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-card)] px-3.5 py-2.5 ty-caption text-[var(--color-text-secondary)] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
          <span>
            {language === "th"
              ? "กดยืนยันเพื่อล็อคห้องพัก 15 นาที · สแกนจ่าย PromptPay เข้าบัญชีที่พักโดยตรง (0% GP) และรับใบจองดิจิทัลทันที"
              : "Press Confirm for an instant 15-min hold · Transfer directly via PromptPay (0% GP) and receive your booking voucher immediately."}
          </span>
        </div>
      </section>
    </form>
  );
}
