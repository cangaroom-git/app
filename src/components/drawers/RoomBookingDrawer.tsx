"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  calculateStayPricing,
  computeNightsBetween,
} from "@/lib/bookingMath";
import type { LanguageCode } from "@/lib/dateFormatters";
import { scanSlipQrFromFile, uploadMediaFile } from "@/lib/slipScanner";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StandardButton } from "@/components/ui/standards";
import { RoomSpecificationView } from "@/components/booking/RoomSpecificationView";
import {
  BookingCheckoutStep,
  type GuestBookingFormValues,
} from "@/components/booking/BookingCheckoutStep";
import type {
  BookingSummaryDto,
  CouponDealDto,
  HotelAddonDto,
  HotelProfileDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export type RoomBookingDrawerStep = "details" | "dates" | "checkout";

export function RoomBookingDrawer({
  isOpen,
  onClose,
  hotel,
  rooms,
  selectedRoom,
  onSelectRoom,
  dateOverrides,
  addons,
  coupons,
  language,
  checkInDate,
  checkOutDate,
  onChangeDates,
  guests,
  onChangeGuests,
  initialStep = "details",
  initialCouponCode = null,
  defaultGuestName = "",
  defaultGuestPhone = "",
  defaultGuestEmail = "",
  onOpenCouponWallet,
  onBookingCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  hotel: HotelProfileDto;
  rooms: RoomAvailabilityDto[];
  selectedRoom: RoomAvailabilityDto | null;
  onSelectRoom: (room: RoomAvailabilityDto) => void;
  dateOverrides: RoomDateOverrideDto[];
  addons: HotelAddonDto[];
  coupons: CouponDealDto[];
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  onChangeDates: (nextIn: string, nextOut: string) => void;
  guests: number;
  onChangeGuests: (nextGuests: number) => void;
  initialStep?: RoomBookingDrawerStep;
  initialCouponCode?: string | null;
  defaultGuestName?: string;
  defaultGuestPhone?: string;
  defaultGuestEmail?: string;
  onOpenCouponWallet?: () => void;
  onBookingCompleted?: () => void;
}) {
  const [step, setStep] = useState<RoomBookingDrawerStep>(initialStep);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [couponInput, setCouponInput] = useState(initialCouponCode || "");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    initialCouponCode
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState<GuestBookingFormValues>({
    guestName: defaultGuestName,
    guestPhone: defaultGuestPhone,
    guestEmail: defaultGuestEmail,
    guestLine: "",
    guestNote: "",
  });

  const [isCreatingHold, setIsCreatingHold] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingSummaryDto | null>(null);
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState(900);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipFeedback, setSlipFeedback] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setBookingError(null);
      setSlipError(null);
      setSlipFeedback(null);
      setActiveBooking(null);
      if (initialCouponCode) {
        setCouponInput(initialCouponCode);
        setAppliedCouponCode(initialCouponCode);
      }
      setGuestForm((prev) => ({
        ...prev,
        guestName: prev.guestName || defaultGuestName,
        guestPhone: prev.guestPhone || defaultGuestPhone,
        guestEmail: prev.guestEmail || defaultGuestEmail,
      }));
    }
  }, [
    isOpen,
    initialStep,
    initialCouponCode,
    defaultGuestName,
    defaultGuestPhone,
    defaultGuestEmail,
  ]);

  useEffect(() => {
    if (
      !activeBooking ||
      activeBooking.status !== "HOLD_PENDING_PAYMENT" ||
      !activeBooking.holdExpiresAt
    ) {
      return;
    }
    const tick = () => {
      const rem = Math.max(
        0,
        Math.floor(
          (new Date(activeBooking.holdExpiresAt!).getTime() - Date.now()) / 1000
        )
      );
      setHoldRemainingSeconds(rem);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeBooking]);

  const stayNights = computeNightsBetween(checkInDate, checkOutDate);

  const matchedCoupon = useMemo(
    () =>
      appliedCouponCode
        ? coupons.find(
            (c) => c.code.toUpperCase() === appliedCouponCode.toUpperCase()
          ) ?? null
        : null,
    [coupons, appliedCouponCode]
  );

  const pricingBreakdown = useMemo(() => {
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
      addons,
      addonQuantities,
      coupon: matchedCoupon,
    });
  }, [
    selectedRoom,
    checkInDate,
    checkOutDate,
    guests,
    dateOverrides,
    addons,
    addonQuantities,
    matchedCoupon,
    stayNights,
  ]);

  if (!isOpen || !selectedRoom) return null;

  const isRoomAvailable = selectedRoom.availableUnits > 0;

  const handleUpdateAddonQty = (addonId: string, delta: number) => {
    setAddonQuantities((prev) => {
      const next = Math.max(0, (prev[addonId] || 0) + delta);
      return { ...prev, [addonId]: next };
    });
  };

  const handleApplyCoupon = (codeOverride?: string) => {
    const candidate = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!candidate) {
      setAppliedCouponCode(null);
      setCouponError(null);
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === candidate);
    if (!found) {
      setCouponError(`ไม่พบโค้ดส่วนลด "${candidate}" สำหรับที่พักนี้`);
      return;
    }
    setCouponInput(found.code);
    setAppliedCouponCode(found.code);
    setCouponError(null);
  };

  const handleSubmitHoldBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingHold) return;
    setIsCreatingHold(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          roomId: selectedRoom.id,
          checkInDate,
          checkOutDate,
          guests,
          unitsBooked: 1,
          addonQuantities,
          couponCode: pricingBreakdown.appliedCouponCode,
          guestName: guestForm.guestName,
          guestPhone: guestForm.guestPhone,
          guestEmail: guestForm.guestEmail || null,
          guestLine: guestForm.guestLine || null,
          guestNote: guestForm.guestNote || null,
        }),
      });
      const data = (await res.json()) as {
        booking?: BookingSummaryDto;
        error?: string;
      };
      if (!res.ok || !data.booking) {
        setBookingError(data.error || "สร้างรายการจองไม่สำเร็จ");
        return;
      }
      setActiveBooking(data.booking);
      onBookingCompleted?.();
    } catch {
      setBookingError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบจอง");
    } finally {
      setIsCreatingHold(false);
    }
  };

  const handleCancelHold = async (bookingId: string) => {
    await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
    });
    setActiveBooking(null);
    onBookingCompleted?.();
  };

  const handleUploadSlipFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !activeBooking) return;

    setIsVerifyingSlip(true);
    setSlipError(null);
    setSlipFeedback(null);

    try {
      const [qrResult, uploadedUrl] = await Promise.all([
        scanSlipQrFromFile(file),
        uploadMediaFile(file, "slips"),
      ]);

      const res = await fetch(
        `/api/bookings/${encodeURIComponent(activeBooking.id)}/slip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slipImageUrl: uploadedUrl,
            slipQrPayload: qrResult.qrPayload,
          }),
        }
      );

      const data = (await res.json()) as {
        booking?: BookingSummaryDto;
        error?: string;
      };
      if (!res.ok || !data.booking) {
        setSlipError(data.error || "ตรวจสลิปไม่สำเร็จ");
        return;
      }

      setActiveBooking(data.booking);
      setSlipFeedback(
        "แนบสลิปเรียบร้อย! ส่งข้อมูลให้ทางที่พักกดยืนยันแล้ว"
      );
      onBookingCompleted?.();
    } catch (err) {
      setSlipError(
        err instanceof Error ? err.message : "อัปโหลดสลิปไม่สำเร็จ"
      );
    } finally {
      setIsVerifyingSlip(false);
    }
  };

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
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-[var(--color-background-card)]/95 backdrop-blur-md px-4 sm:px-5 py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step !== "details" && !activeBooking && (
              <button
                type="button"
                onClick={() =>
                  setStep(step === "checkout" ? "dates" : "details")
                }
                aria-label="Back"
                className="btn-icon shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="ty-subtitle truncate">
              {step === "details"
                ? `${selectedRoom.code} · ${selectedRoom.nameTh}`
                : step === "dates"
                ? language === "th"
                  ? "เลือกวันเข้าพัก & ห้องพัก"
                  : "Dates & Rooms"
                : activeBooking
                ? language === "th"
                  ? `ชำระเงินตรง (${selectedRoom.code})`
                  : `Direct Payment (${selectedRoom.code})`
                : language === "th"
                ? `สรุปการจอง (${selectedRoom.code})`
                : `Checkout (${selectedRoom.code})`}
            </h2>
          </div>

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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === "details" && (
            <RoomSpecificationView
              room={selectedRoom}
              hotel={hotel}
              language={language}
              stayNights={stayNights}
              pricingBreakdown={pricingBreakdown}
            />
          )}

          {step === "dates" && (
            <div className="space-y-5">
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-3">
                <h3 className="ty-body font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>
                    {language === "th"
                      ? "เลือกวันเช็กอิน - เช็กเอาต์"
                      : "Select Check-in & Check-out"}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ty-caption block mb-1">เช็กอิน</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => {
                        const nextIn = e.target.value;
                        if (nextIn) {
                          const nextOut =
                            nextIn >= checkOutDate ? "" : checkOutDate;
                          if (!nextOut) {
                            const d = new Date(`${nextIn}T00:00:00`);
                            d.setDate(d.getDate() + 1);
                            onChangeDates(nextIn, d.toISOString().slice(0, 10));
                          } else {
                            onChangeDates(nextIn, nextOut);
                          }
                        }
                      }}
                      className="w-full h-10 rounded-[12px] bg-[var(--color-background-card)] border border-[var(--color-border)] px-3 ty-body"
                    />
                  </div>
                  <div>
                    <label className="ty-caption block mb-1">เช็กเอาต์</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={checkInDate}
                      onChange={(e) => {
                        if (e.target.value && e.target.value > checkInDate) {
                          onChangeDates(checkInDate, e.target.value);
                        }
                      }}
                      className="w-full h-10 rounded-[12px] bg-[var(--color-background-card)] border border-[var(--color-border)] px-3 ty-body"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="ty-body font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>ผู้เข้าพัก</span>
                  </span>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeGuests(Math.max(1, guests - 1))}
                      className="h-8 w-8 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center ty-body font-bold">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeGuests(Math.min(16, guests + 1))}
                      className="h-8 w-8 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="ty-body font-bold">
                  {language === "th"
                    ? "สถานะห้องพักในช่วงวันที่เลือก"
                    : "Rooms Availability"}
                </h3>
                {rooms.map((r) => {
                  const isSel = r.id === selectedRoom.id;
                  const canFit = guests <= r.maxGuests;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRoom(r)}
                      className={`w-full text-left rounded-[16px] p-3.5 border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSel
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]/35"
                          : "border-[var(--color-border)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="badge-accent">{r.code}</span>
                          <span className="ty-body font-bold truncate">
                            {r.nameTh}
                          </span>
                        </div>
                        <p className="ty-caption mt-1">
                          ฿{r.weekdayPriceThb.toLocaleString()}/คืน · สูงสุด{" "}
                          {r.maxGuests} ท่าน
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`ty-caption font-bold px-2.5 py-1 rounded-full ${
                            r.availableUnits > 0 && canFit
                              ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                              : "bg-[var(--color-error-muted)] text-[var(--color-error)]"
                          }`}
                        >
                          {!canFit
                            ? `เกิน ${r.maxGuests} ท่าน`
                            : r.availableUnits > 0
                            ? `ว่าง ${r.availableUnits}`
                            : "เต็ม"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "checkout" && (
            <BookingCheckoutStep
              room={selectedRoom}
              hotel={hotel}
              language={language}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              stayNights={stayNights}
              guestCount={guests}
              pricingBreakdown={pricingBreakdown}
              addons={addons}
              addonQuantities={addonQuantities}
              onUpdateAddonQuantity={handleUpdateAddonQty}
              coupons={coupons}
              appliedCouponCode={pricingBreakdown.appliedCouponCode}
              couponInput={couponInput}
              onChangeCouponInput={setCouponInput}
              couponError={couponError || pricingBreakdown.couponError}
              onApplyCoupon={handleApplyCoupon}
              onOpenCouponWallet={onOpenCouponWallet}
              onEditStayDates={() => setStep("dates")}
              guestForm={guestForm}
              onChangeGuestForm={(updates) =>
                setGuestForm((prev) => ({ ...prev, ...updates }))
              }
              bookingError={bookingError}
              onSubmitHoldBooking={handleSubmitHoldBooking}
              activeBooking={activeBooking}
              holdRemainingSeconds={holdRemainingSeconds}
              onCancelHoldBooking={handleCancelHold}
              isVerifyingSlip={isVerifyingSlip}
              slipError={slipError}
              slipFeedback={slipFeedback}
              onUploadSlipFile={handleUploadSlipFile}
              onCloseDrawer={onClose}
            />
          )}
        </div>

        {/* Footer */}
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

          {step === "details" && (
            <StandardButton
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setStep(isRoomAvailable ? "checkout" : "dates")}
            >
              <span>
                {isRoomAvailable
                  ? language === "th"
                    ? "จองห้องนี้เลย"
                    : "Book This Room"
                  : language === "th"
                  ? "เปลี่ยนวันเข้าพัก"
                  : "Change Dates"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </StandardButton>
          )}

          {step === "dates" && (
            <StandardButton
              type="button"
              variant="primary"
              size="lg"
              disabled={!isRoomAvailable || guests > selectedRoom.maxGuests}
              onClick={() => setStep("checkout")}
            >
              <span>
                {!isRoomAvailable
                  ? "ห้องพักเต็ม"
                  : guests > selectedRoom.maxGuests
                  ? "ผู้เข้าพักเกิน"
                  : language === "th"
                  ? "ถัดไป · กรอกข้อมูลจอง"
                  : "Next · Checkout"}
              </span>
              {isRoomAvailable && <ChevronRight className="w-4 h-4" />}
            </StandardButton>
          )}

          {step === "checkout" && !activeBooking && (
            <StandardButton
              type="submit"
              form="hotel-checkout-form"
              variant="primary"
              size="lg"
              disabled={isCreatingHold || !isRoomAvailable}
            >
              <QrCode className="w-4 h-4" />
              <span>
                {isCreatingHold
                  ? "กำลังล็อคห้อง..."
                  : language === "th"
                  ? "ยืนยันจอง & รับ QR"
                  : "Confirm & Get QR"}
              </span>
            </StandardButton>
          )}

          {step === "checkout" && activeBooking && (
            <StandardButton
              type="button"
              variant="outline"
              onClick={onClose}
            >
              {language === "th" ? "ปิดหน้าต่าง" : "Close"}
            </StandardButton>
          )}
        </footer>
      </div>
    </div>
  );
}
