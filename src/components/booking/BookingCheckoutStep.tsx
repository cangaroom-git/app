"use client";

import React from "react";
import {
  Calendar,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Timer,
} from "lucide-react";
import {
  BookingRecord,
  ExtraAddon,
  PromoCoupon,
  RoomLodge,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { StayPricingBreakdown } from "@/lib/store";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { StandardInput } from "@/components/ui/standards";
import {
  BookingDigitalVoucherCard,
  PromptPayPaymentCard,
} from "@/components/booking/PromptPayPaymentCard";

export interface GuestBookingFormValues {
  guestName: string;
  guestPhone: string;
  guestContact: string;
  guestNote: string;
}

export interface BookingCheckoutStepProps {
  room: RoomLodge;
  language: LanguageCode;
  propertyConfig: WhiteLabelPropertyConfig;
  checkInDate: string;
  checkOutDate: string;
  stayNights: number;
  guestCount: number;
  unitsToBook: number;
  pricingBreakdown: StayPricingBreakdown;
  addons: ExtraAddon[];
  selectedAddonIds: string[];
  addonQuantities: Record<string, number>;
  onUpdateAddonQuantity: (addonId: string, delta: number) => void;
  coupons: PromoCoupon[];
  savedCouponCodes: string[];
  appliedCouponCode: string | null;
  couponInput: string;
  onChangeCouponInput: (value: string) => void;
  couponError: string | null;
  onApplyCoupon: (codeOverride?: string) => void;
  onOpenCouponWallet?: () => void;
  onEditStayDates: () => void;
  guestForm: GuestBookingFormValues;
  onChangeGuestForm: (updates: Partial<GuestBookingFormValues>) => void;
  bookingConflictError: string | null;
  onSubmitHoldBooking: (event: React.FormEvent) => void;
  activeHoldBooking: BookingRecord | null;
  holdRemainingSeconds: number;
  onCancelHoldBooking: (bookingId: string) => void;
  isVerifyingSlip: boolean;
  slipVerificationFeedback: string | null;
  onUploadSlipFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCloseDrawer: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function BookingCheckoutStep({
  room,
  language,
  propertyConfig,
  checkInDate,
  checkOutDate,
  stayNights,
  guestCount,
  unitsToBook,
  pricingBreakdown,
  addons,
  selectedAddonIds,
  addonQuantities,
  onUpdateAddonQuantity,
  coupons,
  savedCouponCodes,
  appliedCouponCode,
  couponInput,
  onChangeCouponInput,
  couponError,
  onApplyCoupon,
  onOpenCouponWallet,
  onEditStayDates,
  guestForm,
  onChangeGuestForm,
  bookingConflictError,
  onSubmitHoldBooking,
  activeHoldBooking,
  holdRemainingSeconds,
  onCancelHoldBooking,
  isVerifyingSlip,
  slipVerificationFeedback,
  onUploadSlipFile,
  onCloseDrawer,
  scrollContainerRef,
}: BookingCheckoutStepProps) {
  const savedCodeUpperSet = new Set(
    savedCouponCodes.map((code) => code.toUpperCase())
  );
  const activeCoupons = coupons.filter((coupon) => coupon.isActive);
  const savedActiveCoupons = activeCoupons.filter((coupon) =>
    savedCodeUpperSet.has(coupon.code.toUpperCase())
  );
  const quickSelectCoupons =
    savedActiveCoupons.length > 0 ? savedActiveCoupons : activeCoupons;

  const activeAddonsList = addons.filter((addon) => addon.isActive);
  const selectedAddonItemsCount = selectedAddonIds.reduce(
    (sum, addonId) => sum + (addonQuantities[addonId] || 1),
    0
  );

  const selectedAddonsSummaryLabel = selectedAddonIds
    .map((addonId) => {
      const matchedAddon = addons.find((item) => item.id === addonId);
      if (!matchedAddon) {
        return "";
      }
      const quantity = addonQuantities[addonId] || 1;
      const addonTitle =
        language === "th" ? matchedAddon.nameTh : matchedAddon.nameEn;
      return `${addonTitle}${quantity > 1 ? ` ×${quantity}` : ""}`;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--color-background-card)] animate-modal-step-in-right"
    >
      <div className="w-full p-4 sm:p-5">
        {activeHoldBooking ? (
          <div className="space-y-4">
            {activeHoldBooking.status === "HOLD_15_MIN" && (
              <div className="rounded-[16px] bg-[var(--color-warning-muted)] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Timer className="w-5 h-5 text-[var(--color-warning)] shrink-0" />
                    <div className="min-w-0">
                      <p className="ty-body font-bold truncate">
                        {language === "th"
                          ? `ล็อคห้อง ${activeHoldBooking.roomCode} ชั่วคราวแล้ว (#${activeHoldBooking.bookingCode})`
                          : `Villa ${activeHoldBooking.roomCode} Held (#${activeHoldBooking.bookingCode})`}
                      </p>
                      <p className="ty-caption">
                        {language === "th"
                          ? "ชำระเงินและแนบสลิปภายใน 15 นาที"
                          : "Scan QR and upload slip within 15 minutes"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center h-7 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-3 font-mono ty-caption font-bold shrink-0">
                    {String(Math.floor(holdRemainingSeconds / 60)).padStart(
                      2,
                      "0"
                    )}
                    :{String(holdRemainingSeconds % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onCancelHoldBooking(activeHoldBooking.id)}
                    className="ty-caption font-semibold text-[var(--color-error)] hover:underline cursor-pointer"
                  >
                    {language === "th"
                      ? "ยกเลิกการล็อคห้องชั่วคราว"
                      : "Cancel hold"}
                  </button>
                </div>
              </div>
            )}

            {activeHoldBooking.status === "PENDING_ADMIN" ||
            activeHoldBooking.status === "CONFIRMED" ? (
              <BookingDigitalVoucherCard
                booking={activeHoldBooking}
                propertyName={
                  language === "th"
                    ? propertyConfig.nameTh
                    : propertyConfig.nameEn
                }
                language={language}
                formatShortDateFn={formatShortDate}
                onClose={onCloseDrawer}
              />
            ) : (
              <PromptPayPaymentCard
                language={language}
                promptPayId={propertyConfig.promptPayId}
                promptPayAccountName={propertyConfig.promptPayAccountName}
                amountThb={activeHoldBooking.totalPriceThb}
                isVerifyingSlip={isVerifyingSlip}
                slipVerificationFeedback={slipVerificationFeedback}
                onUploadSlip={onUploadSlipFile}
              />
            )}
          </div>
        ) : (
          <form
            id="sidebar-booking-form"
            onSubmit={onSubmitHoldBooking}
            className="space-y-6"
          >
            {bookingConflictError && (
              <div className="rounded-[16px] bg-[var(--color-error-muted)] p-3.5 ty-caption font-semibold text-[var(--color-error)]">
                {bookingConflictError}
              </div>
            )}

            {/* 1. Selected Room & Stay Dates Summary (Single 1-Layer Surface) */}
            <div className="rounded-[16px] bg-[var(--color-background-muted)] p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={room.images[0]?.url}
                  alt={language === "th" ? room.nameTh : room.nameEn}
                  className="h-14 w-20 rounded-[12px] object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 ty-caption font-bold">
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
                className="ty-caption font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{language === "th" ? "เปลี่ยนวัน" : "Edit"}</span>
              </button>
            </div>

            {/* 2. In-Villa Add-ons Upsell (Flat Section Directly on Drawer) */}
            {activeAddonsList.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="ty-subtitle">
                    {language === "th"
                      ? "บริการเสริมเสิร์ฟถึงห้องพัก"
                      : "In-Villa Add-ons"}
                  </h3>
                  {selectedAddonItemsCount > 0 && (
                    <span className="inline-flex items-center h-6 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 ty-caption font-semibold">
                      {language === "th"
                        ? `เลือก ${selectedAddonItemsCount} รายการ (+฿${pricingBreakdown.addonsTotal.toLocaleString()})`
                        : `${selectedAddonItemsCount} selected (+฿${pricingBreakdown.addonsTotal.toLocaleString()})`}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {activeAddonsList.map((addon) => {
                    const quantity = addonQuantities[addon.id] || 0;
                    const isAddonSelected = quantity > 0;
                    const itemTotalPrice = addon.priceThb * (quantity || 1);

                    return (
                      <div
                        key={addon.id}
                        className="rounded-[14px] bg-[var(--color-background-muted)] p-3 flex items-center justify-between gap-3"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (!isAddonSelected) {
                              onUpdateAddonQuantity(addon.id, 1);
                            }
                          }}
                        >
                          <img
                            src={
                              addon.imageUrl ||
                              "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
                            }
                            alt={
                              language === "th" ? addon.nameTh : addon.nameEn
                            }
                            className="w-12 h-12 rounded-[10px] object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="ty-body font-bold truncate">
                              {language === "th" ? addon.nameTh : addon.nameEn}
                            </h4>
                            <p className="ty-caption mt-0.5">
                              <strong className="text-[var(--color-text-primary)]">
                                +฿{addon.priceThb.toLocaleString()}
                              </strong>{" "}
                              /{" "}
                              {language === "th" ? addon.unitTh : addon.unitEn}
                              {quantity > 1 && (
                                <span className="ml-1.5 font-bold text-[var(--color-accent)]">
                                  (฿{itemTotalPrice.toLocaleString()})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {isAddonSelected ? (
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateAddonQuantity(addon.id, -1);
                              }}
                              aria-label={
                                language === "th"
                                  ? "ลดจำนวน"
                                  : "Decrease quantity"
                              }
                              className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center ty-body font-bold tabular-nums text-[var(--color-text-primary)]">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateAddonQuantity(addon.id, 1);
                              }}
                              aria-label={
                                language === "th"
                                  ? "เพิ่มจำนวน"
                                  : "Increase quantity"
                              }
                              className="h-8 w-8 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onUpdateAddonQuantity(addon.id, 1);
                            }}
                            className="h-8 rounded-full px-3 ty-caption font-semibold bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center gap-1 transition cursor-pointer shrink-0"
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

            {/* 3. Guest Information Form (Flat Directly on Drawer) */}
            <section className="space-y-3">
              <h3 className="ty-subtitle">
                {language === "th" ? "ข้อมูลผู้เข้าพัก" : "Guest Information"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StandardInput
                  label={
                    language === "th" ? "ชื่อ - นามสกุล *" : "Full Name *"
                  }
                  placeholder={
                    language === "th"
                      ? "เช่น คุณกานต์ วงศ์สวัสดิ์"
                      : "e.g. Alex Mercer"
                  }
                  required
                  value={guestForm.guestName}
                  onChange={(event) =>
                    onChangeGuestForm({ guestName: event.target.value })
                  }
                />
                <StandardInput
                  label={
                    language === "th" ? "เบอร์โทรศัพท์ *" : "Phone Number *"
                  }
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  required
                  value={guestForm.guestPhone}
                  onChange={(event) =>
                    onChangeGuestForm({ guestPhone: event.target.value })
                  }
                />
                <StandardInput
                  label={
                    language === "th"
                      ? "อีเมล หรือ LINE ID"
                      : "Email or LINE ID"
                  }
                  optionalText={language === "th" ? "รับใบจอง" : "Optional"}
                  placeholder="name@email.com / LINE ID"
                  value={guestForm.guestContact}
                  onChange={(event) =>
                    onChangeGuestForm({ guestContact: event.target.value })
                  }
                />
                <StandardInput
                  label={
                    language === "th" ? "คำขอพิเศษ" : "Special Requests"
                  }
                  optionalText={language === "th" ? "ไม่บังคับ" : "Optional"}
                  placeholder={
                    language === "th"
                      ? "เช่น เช็คอิน 15:00 น."
                      : "e.g. Arrival 15:00"
                  }
                  value={guestForm.guestNote}
                  onChange={(event) =>
                    onChangeGuestForm({ guestNote: event.target.value })
                  }
                />
              </div>
            </section>

            {/* 4. Promo Code & Coupon Bag Quick-Select (#c53829, Flat on Drawer) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="ty-subtitle flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[var(--color-promo-text)]" />
                  <span>
                    {language === "th" ? "คูปองส่วนลด" : "Promo Code"}
                  </span>
                </span>

                {onOpenCouponWallet && (
                  <button
                    type="button"
                    onClick={onOpenCouponWallet}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] px-3 h-7 ty-caption font-semibold hover:opacity-90 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>
                      {language === "th"
                        ? `กระเป๋าคูปอง (${savedCouponCodes.length})`
                        : `Bag (${savedCouponCodes.length})`}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(event) =>
                    onChangeCouponInput(event.target.value.toUpperCase())
                  }
                  placeholder={
                    language === "th"
                      ? "กรอกรหัส เช่น SAPAN10"
                      : "Enter code e.g. SAPAN10"
                  }
                  className="h-10 flex-1 rounded-full bg-[var(--color-background-muted)] px-4 ty-body font-mono uppercase focus:ring-2 focus:ring-[var(--color-promo)]/30 focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => onApplyCoupon()}
                  className="btn-promo-solid shrink-0"
                >
                  <Tag className="w-4 h-4" />
                  <span>{language === "th" ? "ใช้โค้ด" : "Apply"}</span>
                </button>
              </div>

              {quickSelectCoupons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {quickSelectCoupons.map((coupon) => {
                    const isCouponSaved = savedCodeUpperSet.has(
                      coupon.code.toUpperCase()
                    );
                    const isCouponApplied = appliedCouponCode === coupon.code;
                    return (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => onApplyCoupon(coupon.code)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 h-7 ty-caption font-mono font-bold cursor-pointer transition ${
                          isCouponApplied
                            ? "bg-[var(--color-promo)] text-[var(--color-on-promo)]"
                            : "bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] hover:opacity-90"
                        }`}
                      >
                        {isCouponSaved ? (
                          <ShoppingBag className="w-3 h-3" />
                        ) : (
                          <Tag className="w-3 h-3" />
                        )}
                        <span>{coupon.code}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {couponError && (
                <p className="ty-caption text-[var(--color-error)]">
                  {couponError}
                </p>
              )}
            </section>

            {/* 5. Flat Price Breakdown + 1-Layer Net Total Highlight */}
            <section className="space-y-2 ty-caption">
              <div className="flex justify-between">
                <span>
                  {language === "th"
                    ? `ค่าห้องพัก (${stayNights} คืน × ${unitsToBook} หลัง)`
                    : `Room rate (${stayNights} nights × ${unitsToBook} villa)`}
                </span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  ฿{pricingBreakdown.roomSubtotal.toLocaleString()}
                </span>
              </div>

              {pricingBreakdown.extraBedTotal > 0 && (
                <div className="flex justify-between">
                  <span>
                    {language === "th"
                      ? `เสริมที่นอน (${pricingBreakdown.extraGuests} ท่าน)`
                      : `Extra bed (${pricingBreakdown.extraGuests} guests)`}
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    +฿{pricingBreakdown.extraBedTotal.toLocaleString()}
                  </span>
                </div>
              )}

              {pricingBreakdown.addonsTotal > 0 && (
                <div className="flex justify-between items-start gap-2">
                  <span className="truncate">
                    {language === "th"
                      ? `บริการเสริม (${selectedAddonsSummaryLabel})`
                      : `Add-ons (${selectedAddonsSummaryLabel})`}
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)] shrink-0">
                    +฿{pricingBreakdown.addonsTotal.toLocaleString()}
                  </span>
                </div>
              )}

              {pricingBreakdown.couponDiscount > 0 && (
                <div className="flex justify-between text-[var(--color-promo-text)] font-bold">
                  <span>
                    {language === "th"
                      ? `ส่วนลดคูปอง (${appliedCouponCode})`
                      : `Promo discount (${appliedCouponCode})`}
                  </span>
                  <span>
                    −฿{pricingBreakdown.couponDiscount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="mt-1 rounded-[14px] bg-[var(--color-background-muted)] px-4 py-3 flex justify-between items-baseline">
                <span className="ty-body font-bold text-[var(--color-text-primary)]">
                  {language === "th" ? "ยอดชำระสุทธิ" : "Net Total"}
                </span>
                <span className="ty-title text-[var(--color-accent)]">
                  ฿{pricingBreakdown.netTotal.toLocaleString()}
                </span>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
