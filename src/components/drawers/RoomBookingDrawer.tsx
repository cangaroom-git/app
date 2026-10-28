"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import {
  BookingRecord,
  ExtraAddon,
  PromoCoupon,
  RoomLodge,
  SeasonalRateRule,
  SpecialDateRateOverride,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { RoomInventoryStatus, StayPricingBreakdown } from "@/lib/store";
import {
  formatNavbarDateCard,
  formatStayDateRangePill,
  LanguageCode,
} from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StandardButton } from "@/components/ui/standards";
import { CalendarWeatherSummary } from "@/components/booking/RoomAvailabilityCalendarGrid";
import { BookingCalendarStep } from "@/components/booking/BookingCalendarStep";
import {
  BookingCheckoutStep,
  GuestBookingFormValues,
} from "@/components/booking/BookingCheckoutStep";
import { RoomSpecificationView } from "@/components/booking/RoomSpecificationView";

export type { GuestBookingFormValues };
export type RoomBookingDrawerStep = "calendar" | "checkout" | "details";
export type BookingCalendarOrigin = "navbar" | "room" | "details";

export interface RoomBookingDrawerProps {
  isOpen: boolean;
  room: RoomLodge | null;
  rooms: RoomLodge[];
  onSelectRoom: (room: RoomLodge) => void;
  activeStep: RoomBookingDrawerStep;
  onChangeStep: (nextStep: RoomBookingDrawerStep) => void;
  calendarOrigin: BookingCalendarOrigin;
  onChangeCalendarOrigin: (origin: BookingCalendarOrigin) => void;
  onClose: () => void;
  onOpenPhotoGallery?: (room: RoomLodge) => void;
  language: LanguageCode;
  propertyConfig: WhiteLabelPropertyConfig;
  todayDate: Date;
  checkInDate: string;
  onChangeCheckInDate: (dateString: string) => void;
  checkOutDate: string;
  onChangeCheckOutDate: (dateString: string) => void;
  stayNights: number;
  guestCount: number;
  unitsToBook: number;
  availableRoomUnitsCount: number;
  roomStatusMap: Record<string, RoomInventoryStatus>;
  bookings: BookingRecord[];
  seasonalRates: SeasonalRateRule[];
  specialDateRates: SpecialDateRateOverride[];
  weather: CalendarWeatherSummary | null;
  pricingBreakdown: StayPricingBreakdown;
  priceGuaranteeRemainingSeconds: number;
  slideImageIndex: number;
  onChangeSlideImageIndex: React.Dispatch<React.SetStateAction<number>>;
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
  guestForm: GuestBookingFormValues;
  onChangeGuestForm: (updates: Partial<GuestBookingFormValues>) => void;
  bookingConflictError: string | null;
  onClearBookingConflictError: () => void;
  onSubmitHoldBooking: (event: React.FormEvent) => void;
  activeHoldBooking: BookingRecord | null;
  holdRemainingSeconds: number;
  onCancelHoldBooking: (bookingId: string) => void;
  isVerifyingSlip: boolean;
  slipVerificationFeedback: string | null;
  onUploadSlipFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RoomBookingDrawer({
  isOpen,
  room,
  rooms,
  onSelectRoom,
  activeStep,
  onChangeStep,
  calendarOrigin,
  onChangeCalendarOrigin,
  onClose,
  onOpenPhotoGallery,
  language,
  propertyConfig,
  todayDate,
  checkInDate,
  onChangeCheckInDate,
  checkOutDate,
  onChangeCheckOutDate,
  stayNights,
  guestCount,
  unitsToBook,
  availableRoomUnitsCount,
  roomStatusMap,
  bookings,
  seasonalRates,
  specialDateRates,
  weather,
  pricingBreakdown,
  priceGuaranteeRemainingSeconds,
  slideImageIndex,
  onChangeSlideImageIndex,
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
  guestForm,
  onChangeGuestForm,
  bookingConflictError,
  onClearBookingConflictError,
  onSubmitHoldBooking,
  activeHoldBooking,
  holdRemainingSeconds,
  onCancelHoldBooking,
  isVerifyingSlip,
  slipVerificationFeedback,
  onUploadSlipFile,
}: RoomBookingDrawerProps) {
  const detailsScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const checkoutScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const baseDate = checkInDate
      ? new Date(checkInDate + "T00:00:00")
      : todayDate;
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const minMonth = new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      1
    );
    const parsedCheckIn = checkInDate
      ? new Date(checkInDate + "T00:00:00")
      : todayDate;
    if (!isNaN(parsedCheckIn.getTime())) {
      const candidateMonth = new Date(
        parsedCheckIn.getFullYear(),
        parsedCheckIn.getMonth(),
        1
      );
      setCalendarMonth(
        candidateMonth.getTime() < minMonth.getTime()
          ? minMonth
          : candidateMonth
      );
    }
  }, [isOpen, checkInDate, todayDate]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (activeStep === "details" && detailsScrollContainerRef.current) {
      detailsScrollContainerRef.current.scrollTop = 0;
    }
    if (activeStep === "checkout" && checkoutScrollContainerRef.current) {
      checkoutScrollContainerRef.current.scrollTop = 0;
    }
  }, [activeStep, room?.id]);

  if (!isOpen || !room) {
    return null;
  }

  const availableUnitsForRoom = roomStatusMap[room.id]?.availableUnits ?? 0;
  const isRoomAvailableForUnits = availableUnitsForRoom >= unitsToBook;
  const isNavbarCalendarMode =
    activeStep === "calendar" && calendarOrigin === "navbar";
  const canNavigateBack =
    (activeStep === "checkout" && !activeHoldBooking) ||
    (activeStep === "calendar" && calendarOrigin === "details");

  const handleBackNavigation = () => {
    if (activeStep === "checkout" && !activeHoldBooking) {
      onChangeStep("calendar");
      return;
    }
    if (activeStep === "calendar" && calendarOrigin === "details") {
      onChangeStep("details");
    }
  };

  const handleOpenCalendarFromStep = () => {
    if (activeStep === "details") {
      onChangeCalendarOrigin("details");
    }
    onChangeStep("calendar");
  };

  const handleProceedToCheckout = () => {
    if (!isRoomAvailableForUnits) {
      return;
    }
    onClearBookingConflictError();
    onChangeStep("checkout");
  };

  const headerTitleText = (() => {
    if (activeStep === "calendar") {
      if (isNavbarCalendarMode) {
        return language === "th"
          ? "เลือกวันเข้าพัก & เช็คห้องว่าง"
          : "Select Dates & Availability";
      }
      return language === "th"
        ? `เลือกวันเข้าพัก (${room.code})`
        : `Select Dates (${room.code})`;
    }
    if (activeStep === "checkout") {
      if (activeHoldBooking) {
        return language === "th"
          ? `ชำระเงิน QR (${room.code})`
          : `QR Payment (${room.code})`;
      }
      return language === "th"
        ? `สรุปการจอง & ชำระเงิน (${room.code})`
        : `Checkout (${room.code})`;
    }
    return language === "th"
      ? `รายละเอียดห้องพัก (${room.code})`
      : `Room Details (${room.code})`;
  })();

  const stepBadgeLabel =
    activeStep === "calendar" && !isNavbarCalendarMode
      ? "1 / 2"
      : activeStep === "checkout" && !activeHoldBooking
      ? "2 / 2"
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

      <div
        id={isNavbarCalendarMode ? "navbar-calendar-drawer" : undefined}
        className="app-right-drawer z-10 animate-slide-in-right-drawer"
      >
        {/* Sticky Right Drawer Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-[var(--color-background-card)]/90 backdrop-blur-md px-4 sm:px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {canNavigateBack ? (
              <button
                type="button"
                onClick={handleBackNavigation}
                aria-label="Back"
                className="btn-icon shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : activeStep === "calendar" ? (
              <Calendar className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            ) : null}

            <h2 className="ty-subtitle truncate">{headerTitleText}</h2>

            {stepBadgeLabel && (
              <span className="inline-flex items-center h-6 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-2.5 ty-caption font-bold shrink-0">
                {stepBadgeLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeStep !== "calendar" && !activeHoldBooking && (
              <button
                type="button"
                onClick={handleOpenCalendarFromStep}
                title={
                  language === "th"
                    ? "แก้ไขวันเข้าพัก"
                    : "Change check-in / check-out dates"
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] px-3 h-9 transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span className="ty-caption font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                  {formatNavbarDateCard(checkInDate, language)}
                </span>
                <span className="ty-caption font-bold text-[var(--color-accent)]">
                  ({stayNights}
                  {language === "th" ? "คืน" : "N"})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Flat Inline Price Guarantee Strip (Checkout & Room Details) */}
        {activeStep !== "calendar" && (
          <div className="shrink-0 px-4 sm:px-5 pb-2 flex items-center justify-between gap-2 ty-caption">
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-secondary)] truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
              {language === "th"
                ? "การันตีราคาตรงดีที่สุด"
                : "Best Direct Rate Guaranteed"}
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--color-accent)] shrink-0">
              <Timer className="w-3.5 h-3.5" />
              {String(
                Math.floor(priceGuaranteeRemainingSeconds / 60)
              ).padStart(2, "0")}
              :{String(priceGuaranteeRemainingSeconds % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Drawer Viewport */}
        <div className="flex-1 relative overflow-hidden bg-[var(--color-background-card)]">
          {activeStep === "calendar" ? (
            <BookingCalendarStep
              language={language}
              rooms={rooms}
              selectedRoom={room}
              onSelectRoom={onSelectRoom}
              calendarMonth={calendarMonth}
              onChangeCalendarMonth={setCalendarMonth}
              checkInDate={checkInDate}
              onChangeCheckInDate={onChangeCheckInDate}
              checkOutDate={checkOutDate}
              onChangeCheckOutDate={onChangeCheckOutDate}
              pricingBreakdown={pricingBreakdown}
              bookings={bookings}
              seasonalRates={seasonalRates}
              specialDateRates={specialDateRates}
              weather={weather}
              todayDate={todayDate}
              onOpenPhotoGallery={onOpenPhotoGallery}
            />
          ) : activeStep === "checkout" ? (
            <BookingCheckoutStep
              room={room}
              language={language}
              propertyConfig={propertyConfig}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              stayNights={stayNights}
              guestCount={guestCount}
              unitsToBook={unitsToBook}
              pricingBreakdown={pricingBreakdown}
              addons={addons}
              selectedAddonIds={selectedAddonIds}
              addonQuantities={addonQuantities}
              onUpdateAddonQuantity={onUpdateAddonQuantity}
              coupons={coupons}
              savedCouponCodes={savedCouponCodes}
              appliedCouponCode={appliedCouponCode}
              couponInput={couponInput}
              onChangeCouponInput={onChangeCouponInput}
              couponError={couponError}
              onApplyCoupon={onApplyCoupon}
              onOpenCouponWallet={onOpenCouponWallet}
              onEditStayDates={handleOpenCalendarFromStep}
              guestForm={guestForm}
              onChangeGuestForm={onChangeGuestForm}
              bookingConflictError={bookingConflictError}
              onSubmitHoldBooking={onSubmitHoldBooking}
              activeHoldBooking={activeHoldBooking}
              holdRemainingSeconds={holdRemainingSeconds}
              onCancelHoldBooking={onCancelHoldBooking}
              isVerifyingSlip={isVerifyingSlip}
              slipVerificationFeedback={slipVerificationFeedback}
              onUploadSlipFile={onUploadSlipFile}
              onCloseDrawer={onClose}
              scrollContainerRef={checkoutScrollContainerRef}
            />
          ) : (
            <RoomSpecificationView
              room={room}
              language={language}
              propertyConfig={propertyConfig}
              stayNights={stayNights}
              roomStatusMap={roomStatusMap}
              pricingBreakdown={pricingBreakdown}
              slideImageIndex={slideImageIndex}
              onChangeSlideImageIndex={onChangeSlideImageIndex}
              onOpenPhotoGallery={onOpenPhotoGallery}
              scrollContainerRef={detailsScrollContainerRef}
            />
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <footer className="shrink-0 bg-[var(--color-background-card)] shadow-[0_-4px_24px_rgba(15,23,42,0.06)] px-4 sm:px-5 py-3 z-20 flex items-center justify-between gap-3">
          {activeStep === "calendar" ? (
            <>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 h-5 ty-caption font-bold shrink-0">
                    {room.code}
                  </span>
                  <span className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                    {formatStayDateRangePill(
                      checkInDate,
                      checkOutDate,
                      language
                    )}{" "}
                    ({language === "th" ? `${stayNights} คืน` : `${stayNights}N`}
                    )
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="ty-title leading-none">
                    ฿{pricingBreakdown.netTotal.toLocaleString()}
                  </span>
                  <span
                    className={`ty-caption font-semibold ${
                      isRoomAvailableForUnits
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-error)]"
                    }`}
                  >
                    {isNavbarCalendarMode
                      ? availableRoomUnitsCount > 0
                        ? language === "th"
                          ? `ว่างรวม ${availableRoomUnitsCount} หลัง`
                          : `${availableRoomUnitsCount} villas free`
                        : language === "th"
                        ? "เต็มทุกห้อง"
                        : "All sold out"
                      : isRoomAvailableForUnits
                      ? language === "th"
                        ? "ว่างพร้อมจอง"
                        : "Available"
                      : language === "th"
                      ? "เต็มในวันที่เลือก"
                      : "Sold out"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isNavbarCalendarMode && (
                  <StandardButton
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={onClose}
                  >
                    {language === "th" ? "ใช้วันที่นี้" : "Apply"}
                  </StandardButton>
                )}

                <StandardButton
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!isRoomAvailableForUnits}
                  onClick={handleProceedToCheckout}
                >
                  <span>
                    {!isRoomAvailableForUnits
                      ? language === "th"
                        ? "ห้องพักเต็ม"
                        : "Sold Out"
                      : isNavbarCalendarMode
                      ? language === "th"
                        ? `จอง ${room.code}`
                        : `Book ${room.code}`
                      : language === "th"
                      ? "ถัดไป · สรุปการจอง"
                      : "Next · Checkout"}
                  </span>
                  {isRoomAvailableForUnits && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </StandardButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {room.images?.[0]?.url && (
                  <img
                    src={room.images[0].url}
                    alt={room.code}
                    className="h-11 w-16 rounded-[12px] object-cover shrink-0 hidden sm:block"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 h-5 ty-caption font-bold shrink-0">
                      {room.code}
                    </span>
                    <span className="ty-caption truncate">
                      {stayNights} {language === "th" ? "คืน" : "nights"} ·{" "}
                      {unitsToBook} {language === "th" ? "หลัง" : "villa"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="ty-title leading-none">
                      ฿{pricingBreakdown.netTotal.toLocaleString()}
                    </span>
                    {room.discountPercent > 0 && (
                      <span className="ty-caption line-through">
                        ฿
                        {Math.round(
                          pricingBreakdown.netTotal /
                            (1 - room.discountPercent / 100)
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {activeStep === "details" ? (
                <StandardButton
                  type="button"
                  variant={isRoomAvailableForUnits ? "primary" : "outline"}
                  size="lg"
                  onClick={handleOpenCalendarFromStep}
                  className="shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {isRoomAvailableForUnits
                      ? language === "th"
                        ? "จองห้องพักนี้"
                        : "Book Room"
                      : language === "th"
                      ? "ดูตารางวันว่าง"
                      : "View Calendar"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </StandardButton>
              ) : !activeHoldBooking ? (
                <StandardButton
                  type="submit"
                  form="sidebar-booking-form"
                  size="lg"
                  className="shrink-0"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {language === "th" ? "ยืนยัน & รับ QR" : "Confirm & Get QR"}
                  </span>
                </StandardButton>
              ) : (
                <StandardButton
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="shrink-0"
                >
                  {language === "th" ? "ปิดหน้าต่าง" : "Close"}
                </StandardButton>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
