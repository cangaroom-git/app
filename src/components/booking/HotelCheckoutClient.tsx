"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Calendar,
  Check,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  Timer,
  X,
} from "lucide-react";
import {
  calculateStayPricing,
  computeCouponDiscount,
  computeNightsBetween,
} from "@/lib/bookingMath";
import { formatShortDate } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import { scanSlipQrFromFile, uploadMediaFile } from "@/lib/slipScanner";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardInput } from "@/components/ui/standards";
import { AirbnbStayCalendar } from "@/components/booking/AirbnbStayCalendar";
import { selectBestEligibleCoupon } from "@/components/drawers/RoomBookingDrawer";
import type { GuestBookingFormValues } from "@/components/booking/BookingCheckoutStep";
import {
  BookingDigitalVoucherCard,
  PromptPayPaymentCard,
} from "@/components/booking/PromptPayPaymentCard";
import type {
  BookingSummaryDto,
  HotelStorefrontDto,
  RoomAvailabilityDto,
} from "@/types/cangaroom";

function matchRoomFromParam(
  rooms: ReadonlyArray<RoomAvailabilityDto>,
  param?: string | null
): RoomAvailabilityDto | null {
  if (!param) return null;
  const clean = param.trim().toLowerCase();
  return (
    rooms.find(
      (r) =>
        r.id.toLowerCase() === clean ||
        r.code.toLowerCase() === clean ||
        r.slug.toLowerCase() === clean
    ) ?? null
  );
}

export function HotelCheckoutClient({
  initialStorefront,
  initialRoomParam,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialCouponParam,
}: {
  initialStorefront: HotelStorefrontDto;
  initialRoomParam?: string | null;
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
  initialCouponParam?: string | null;
}) {
  const router = useRouter();
  const {
    lang: language,
    user: currentUser,
    today,
    setCheckIn: setGlobalCheckIn,
    setCheckOut: setGlobalCheckOut,
    setGuests: setGlobalGuests,
    openCouponWallet,
  } = useHotelApp();

  const isTh = language === "th";

  const [storefront, setStorefront] =
    useState<HotelStorefrontDto>(initialStorefront);
  const [localCheckIn, setLocalCheckIn] = useState(initialCheckIn);
  const [localCheckOut, setLocalCheckOut] = useState(initialCheckOut);
  const [localGuests, setLocalGuests] = useState(
    Math.max(1, Math.min(12, initialGuests || 2))
  );
  const [isRefreshingDates, setIsRefreshingDates] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    const matched = matchRoomFromParam(initialStorefront.rooms, initialRoomParam);
    if (matched) return matched.id;
    const firstAvail = initialStorefront.rooms.find((r) => r.availableUnits > 0);
    return firstAvail?.id || initialStorefront.rooms[0]?.id || "";
  });

  const [calendarRoomFilterId, setCalendarRoomFilterId] = useState<string>(
    () => {
      const matched = matchRoomFromParam(
        initialStorefront.rooms,
        initialRoomParam
      );
      return matched?.id || "ALL";
    }
  );

  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isSwitchRoomOpen, setIsSwitchRoomOpen] = useState(false);

  useBodyScrollLock(isEditTripOpen || isSwitchRoomOpen);

  const {
    hotel,
    rooms,
    addons,
    coupons,
    dateOverrides,
    bookedUnitsByRoomDate = {},
  } = storefront;

  const selectedRoom = useMemo(
    () =>
      rooms.find((r) => r.id === selectedRoomId) ||
      rooms.find((r) => r.availableUnits > 0) ||
      rooms[0] ||
      null,
    [rooms, selectedRoomId]
  );

  const stayNights = computeNightsBetween(localCheckIn, localCheckOut);

  const [addonQuantities, setAddonQuantities] = useState<
    Record<string, number>
  >({});

  const initialCouponResolved = useMemo(() => {
    if (initialCouponParam?.trim()) {
      const match = coupons.find(
        (c) => c.code.toUpperCase() === initialCouponParam.trim().toUpperCase()
      );
      if (match) return match.code;
    }
    if (!selectedRoom) return null;
    const base = calculateStayPricing({
      room: selectedRoom,
      checkInDate: initialCheckIn,
      checkOutDate: initialCheckOut,
      guests: initialGuests,
      overrides: initialStorefront.dateOverrides,
    });
    const best = selectBestEligibleCoupon(coupons, base.roomSubtotalThb);
    return best?.coupon.code ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [couponInput, setCouponInput] = useState(initialCouponResolved || "");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    initialCouponResolved
  );
  const [couponError, setCouponError] = useState<string | null>(null);

  const [guestForm, setGuestForm] = useState<GuestBookingFormValues>({
    guestName: currentUser?.name || "",
    guestPhone: currentUser?.phone || "",
    guestEmail: currentUser?.email || "",
    guestLine: "",
    guestNote: "",
  });

  useEffect(() => {
    if (!currentUser) return;
    setGuestForm((prev) => ({
      ...prev,
      guestName: prev.guestName || currentUser.name || "",
      guestPhone: prev.guestPhone || currentUser.phone || "",
      guestEmail: prev.guestEmail || currentUser.email || "",
    }));
  }, [currentUser]);

  const [isCreatingHold, setIsCreatingHold] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingSummaryDto | null>(
    null
  );
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState(900);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipFeedback, setSlipFeedback] = useState<string | null>(null);

  const syncCheckoutUrlParams = useCallback(
    (params: {
      roomCode?: string;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      coupon?: string | null;
    }) => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (params.roomCode) url.searchParams.set("room", params.roomCode);
      if (params.checkIn) url.searchParams.set("checkIn", params.checkIn);
      if (params.checkOut) url.searchParams.set("checkOut", params.checkOut);
      if (typeof params.guests === "number") {
        url.searchParams.set("guests", String(params.guests));
      }
      if (params.coupon === null) {
        url.searchParams.delete("coupon");
      } else if (params.coupon) {
        url.searchParams.set("coupon", params.coupon);
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    },
    []
  );

  const didMountFetchRef = useRef(false);

  const refreshAvailability = useCallback(
    async (nextIn: string, nextOut: string) => {
      setIsRefreshingDates(true);
      try {
        const qs = new URLSearchParams({ checkIn: nextIn, checkOut: nextOut });
        const res = await fetch(
          `/api/hotels/${encodeURIComponent(hotel.slug)}?${qs.toString()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = (await res.json()) as HotelStorefrontDto;
          setStorefront(data);
        }
      } catch {
        // retain current storefront cleanly on transient error
      } finally {
        setIsRefreshingDates(false);
      }
    },
    [hotel.slug]
  );

  useEffect(() => {
    if (!didMountFetchRef.current) {
      didMountFetchRef.current = true;
      return;
    }
    void refreshAvailability(localCheckIn, localCheckOut);
  }, [localCheckIn, localCheckOut, refreshAvailability]);

  useEffect(() => {
    if (!isEditTripOpen && !isSwitchRoomOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditTripOpen(false);
        setIsSwitchRoomOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isEditTripOpen, isSwitchRoomOpen]);

  const handleDatesChanged = (nextIn: string, nextOut: string) => {
    setLocalCheckIn(nextIn);
    setLocalCheckOut(nextOut);
    setGlobalCheckIn(nextIn);
    setGlobalCheckOut(nextOut);
    syncCheckoutUrlParams({
      roomCode: selectedRoom?.code,
      checkIn: nextIn,
      checkOut: nextOut,
      guests: localGuests,
      coupon: appliedCouponCode,
    });
  };

  const handleGuestsChanged = (nextGuests: number) => {
    const bounded = Math.max(1, Math.min(12, nextGuests));
    setLocalGuests(bounded);
    setGlobalGuests(bounded);
    syncCheckoutUrlParams({
      roomCode: selectedRoom?.code,
      checkIn: localCheckIn,
      checkOut: localCheckOut,
      guests: bounded,
      coupon: appliedCouponCode,
    });
  };

  const handleSwitchRoom = (room: RoomAvailabilityDto) => {
    setSelectedRoomId(room.id);
    setCalendarRoomFilterId(room.id);
    setIsSwitchRoomOpen(false);
    syncCheckoutUrlParams({
      roomCode: room.code,
      checkIn: localCheckIn,
      checkOut: localCheckOut,
      guests: localGuests,
      coupon: appliedCouponCode,
    });
  };

  // Strict 1-Click Back back to /{hotelSlug}
  const handleBackToHotel = () => {
    setGlobalCheckIn(localCheckIn);
    setGlobalCheckOut(localCheckOut);
    setGlobalGuests(localGuests);
    router.push(
      `/${encodeURIComponent(hotel.slug)}?checkIn=${encodeURIComponent(
        localCheckIn
      )}&checkOut=${encodeURIComponent(
        localCheckOut
      )}&guests=${localGuests}#section-rooms`
    );
  };

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
      checkInDate: localCheckIn,
      checkOutDate: localCheckOut,
      guests: localGuests,
      unitsBooked: 1,
      overrides: dateOverrides,
      addons,
      addonQuantities,
      coupon: matchedCoupon,
    });
  }, [
    selectedRoom,
    localCheckIn,
    localCheckOut,
    localGuests,
    dateOverrides,
    addons,
    addonQuantities,
    matchedCoupon,
    stayNights,
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

  const handleUpdateAddonQty = (addonId: string, delta: number) => {
    setAddonQuantities((prev) => ({
      ...prev,
      [addonId]: Math.max(0, (prev[addonId] || 0) + delta),
    }));
  };

  const handleApplyCoupon = (codeOverride?: string) => {
    const candidate = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!candidate) {
      setAppliedCouponCode(null);
      setCouponError(null);
      syncCheckoutUrlParams({ coupon: null });
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === candidate);
    if (!found) {
      setCouponError(
        isTh
          ? `ไม่พบโค้ดส่วนลด "${candidate}" สำหรับที่พักนี้`
          : `Coupon "${candidate}" not found for this stay`
      );
      return;
    }
    const check = computeCouponDiscount(
      found,
      pricingBreakdown.subtotalBeforeDiscountThb
    );
    if (check.error) {
      setCouponError(check.error);
      return;
    }
    setCouponInput(found.code);
    setAppliedCouponCode(found.code);
    setCouponError(null);
    syncCheckoutUrlParams({ coupon: found.code });
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setCouponInput("");
    setCouponError(null);
    syncCheckoutUrlParams({ coupon: null });
  };

  const handleSubmitHoldBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingHold || !selectedRoom) return;
    setIsCreatingHold(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          roomId: selectedRoom.id,
          checkInDate: localCheckIn,
          checkOutDate: localCheckOut,
          guests: localGuests,
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
        setBookingError(
          data.error ||
            (isTh
              ? "สร้างรายการจองไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง"
              : "Could not create reservation")
        );
        return;
      }
      setActiveBooking(data.booking);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      void refreshAvailability(localCheckIn, localCheckOut);
    } catch {
      setBookingError(
        isTh
          ? "เกิดข้อผิดพลาดในการเชื่อมต่อระบบจอง"
          : "Network error while creating reservation"
      );
    } finally {
      setIsCreatingHold(false);
    }
  };

  const handleCancelHold = async (bookingId: string) => {
    await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
    });
    setActiveBooking(null);
    void refreshAvailability(localCheckIn, localCheckOut);
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
        setSlipError(
          data.error || (isTh ? "ตรวจสลิปไม่สำเร็จ" : "Slip verification failed")
        );
        return;
      }

      setActiveBooking(data.booking);
      setSlipFeedback(
        isTh
          ? "แนบสลิปเรียบร้อย! ส่งข้อมูลให้ทางที่พักกดยืนยันแล้ว"
          : "Slip uploaded! Sent to property host for verification."
      );
      void refreshAvailability(localCheckIn, localCheckOut);
    } catch (err) {
      setSlipError(
        err instanceof Error
          ? err.message
          : isTh
          ? "อัปโหลดสลิปไม่สำเร็จ"
          : "Could not upload slip"
      );
    } finally {
      setIsVerifyingSlip(false);
    }
  };

  if (!selectedRoom) {
    return (
      <div className="cgr-page-standard py-12 text-center space-y-4">
        <h1 className="ty-display">
          {isTh ? "ไม่พบข้อมูลห้องพักสำหรับที่พักนี้" : "No rooms available"}
        </h1>
        <button
          type="button"
          onClick={handleBackToHotel}
          className="h-11 px-5 rounded-[12px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer"
        >
          {isTh ? "กลับหน้าเพจที่พัก" : "Back to property"}
        </button>
      </div>
    );
  }

  const isRoomAvailable = selectedRoom.availableUnits > 0;
  const fitsGuests = localGuests <= selectedRoom.maxGuests;
  const canConfirm = isRoomAvailable && fitsGuests && !isRefreshingDates;
  const roomCover =
    selectedRoom.galleryUrls[0] ||
    hotel.coverImageUrl ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80";

  const selectedAddonsList = addons
    .map((a) => ({ addon: a, qty: addonQuantities[a.id] || 0 }))
    .filter((item) => item.qty > 0);

  const baseRoomWithoutExtraGuest = Math.max(
    0,
    pricingBreakdown.roomSubtotalThb - pricingBreakdown.extraGuestTotalThb
  );
  const avgNightlyBase = Math.round(
    baseRoomWithoutExtraGuest / Math.max(1, stayNights)
  );

  const renderPriceDetailsBlock = () => (
    <div className="space-y-3 ty-body">
      <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
        {isTh ? "รายละเอียดราคา" : "Price details"}
      </h3>

      <div className="space-y-2.5 text-[14.5px]">
        <div className="flex justify-between gap-3 text-[var(--color-text-primary)]">
          <span className="underline decoration-[var(--color-border-emphasized)]">
            ฿{avgNightlyBase.toLocaleString()} × {stayNights}{" "}
            {isTh ? "คืน" : "nights"}
          </span>
          <span className="tabular-nums">
            ฿{baseRoomWithoutExtraGuest.toLocaleString()}
          </span>
        </div>

        {pricingBreakdown.extraGuestTotalThb > 0 && (
          <div className="flex justify-between gap-3 text-[var(--color-text-primary)]">
            <span>
              {isTh
                ? `ค่าผู้เข้าพักเสริม (เกิน ${selectedRoom.standardGuests} ท่าน)`
                : "Extra guest fee"}
            </span>
            <span className="tabular-nums">
              +฿{pricingBreakdown.extraGuestTotalThb.toLocaleString()}
            </span>
          </div>
        )}

        {selectedAddonsList.map(({ addon, qty }) => (
          <div
            key={addon.id}
            className="flex justify-between gap-3 text-[var(--color-text-primary)]"
          >
            <span className="truncate">
              {isTh ? addon.nameTh : addon.nameEn} × {qty}
            </span>
            <span className="tabular-nums shrink-0">
              +฿{(addon.priceThb * qty).toLocaleString()}
            </span>
          </div>
        ))}

        {pricingBreakdown.discountThb > 0 && appliedCouponCode && (
          <div className="flex justify-between gap-3 text-[var(--color-success)] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isTh
                  ? `ส่วนลดคูปอง ${appliedCouponCode}`
                  : `Coupon ${appliedCouponCode}`}
              </span>
            </span>
            <span className="tabular-nums">
              −฿{pricingBreakdown.discountThb.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-3 text-[var(--color-text-secondary)]">
          <span>
            {isTh
              ? "ค่าบริการแพลตฟอร์ม Cangaroom (0% GP)"
              : "Cangaroom service fee (0% GP)"}
          </span>
          <span className="text-[var(--color-text-primary)]">฿0</span>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--color-border)] flex items-baseline justify-between gap-3">
        <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          {isTh ? "ยอดรวมสุทธิ (THB)" : "Total (THB)"}
        </span>
        <div className="flex items-baseline gap-2">
          {pricingBreakdown.discountThb > 0 && (
            <span className="text-[13.5px] line-through text-[var(--color-text-secondary)] tabular-nums">
              ฿{pricingBreakdown.subtotalBeforeDiscountThb.toLocaleString()}
            </span>
          )}
          <span className="text-[19px] font-semibold text-[var(--color-text-primary)] tabular-nums">
            ฿{pricingBreakdown.netTotalThb.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cgr-page-standard pb-14">
      {/* =====================================================================
          TOP HEADER BAR (Airbnb Style: Single 1-Click Squircle Back Button + H1)
      ====================================================================== */}
      <header className="flex items-center gap-3.5 pt-1 pb-6">
        <button
          type="button"
          onClick={handleBackToHotel}
          aria-label={isTh ? "กลับหน้าเพจที่พัก" : "Back to property"}
          className="h-10 w-10 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[28px] leading-tight font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
            {activeBooking
              ? activeBooking.status === "HOLD_PENDING_PAYMENT"
                ? isTh
                  ? "สแกนชำระเงินตรงกับที่พัก"
                  : "Complete direct payment"
                : isTh
                ? "ใบยืนยันการจองของคุณ"
                : "Your reservation"
              : isTh
              ? "ยืนยันและชำระเงิน"
              : "Confirm and pay"}
          </h1>
          <p className="ty-caption text-[var(--color-text-secondary)] truncate">
            {isTh ? hotel.nameTh : hotel.nameEn} ·{" "}
            {isTh ? "จองตรง 0% GP" : "Direct stay · 0% GP"}
          </p>
        </div>
      </header>

      {/* MOBILE COMPACT PROPERTY SUMMARY (< lg) */}
      <div className="lg:hidden mb-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4 flex items-center gap-3.5">
        <img
          src={roomCover}
          alt={isTh ? selectedRoom.nameTh : selectedRoom.nameEn}
          className="h-20 w-24 rounded-[12px] object-cover bg-[var(--color-background-muted)] shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
            {isTh ? hotel.nameTh : hotel.nameEn}
          </p>
          <h2 className="text-[15.5px] font-semibold text-[var(--color-text-primary)] truncate">
            {selectedRoom.code} ·{" "}
            {isTh ? selectedRoom.nameTh : selectedRoom.nameEn}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
              <Star className="w-3.5 h-3.5 fill-current" />
              {hotel.ratingAvg.toFixed(1)}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-[var(--color-text-primary)]" />
              {isTh ? "ยืนยันตัวตน" : "Verified"}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          AIRBNB 2-COLUMN CHECKOUT SPLIT (6 Cols Left Form + 1 Col Gap + 5 Cols Sticky)
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (6 OF 12 COLS) */}
        <div className="lg:col-span-6 min-w-0">
          {activeBooking ? (
            <div className="space-y-6">
              {activeBooking.status === "HOLD_PENDING_PAYMENT" && (
                <div className="rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Timer className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                      <div className="min-w-0">
                        <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                          {isTh
                            ? `ล็อคห้อง ${activeBooking.roomCode} ชั่วคราวแล้ว (#${activeBooking.bookingCode})`
                            : `Room ${activeBooking.roomCode} Held (#${activeBooking.bookingCode})`}
                        </p>
                        <p className="ty-caption text-[var(--color-text-secondary)]">
                          {isTh
                            ? "โอนตรงเข้าบัญชีที่พักและแนบสลิปภายใน 15 นาที"
                            : "Transfer directly and upload your slip within 15 minutes"}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center h-8 rounded-[10px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] px-3 font-mono text-[13px] font-bold shrink-0">
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
                      onClick={() => handleCancelHold(activeBooking.id)}
                      className="ty-caption font-semibold text-[var(--color-error)] hover:underline cursor-pointer"
                    >
                      {isTh ? "ยกเลิกการล็อคห้อง" : "Cancel room hold"}
                    </button>
                  </div>
                </div>
              )}

              {activeBooking.status === "PENDING_VERIFICATION" ||
              activeBooking.status === "CONFIRMED" ||
              activeBooking.status === "COMPLETED" ? (
                <div className="space-y-5">
                  <BookingDigitalVoucherCard
                    booking={activeBooking}
                    language={language}
                    formatShortDateFn={formatShortDate}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/trips"
                      className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
                    >
                      {isTh ? "ดูทริปการจองของฉัน" : "View my trips"}
                    </Link>
                    <button
                      type="button"
                      onClick={handleBackToHotel}
                      className="h-11 px-5 rounded-[12px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    >
                      {isTh ? "กลับหน้าเพจที่พัก" : "Back to property"}
                    </button>
                  </div>
                </div>
              ) : (
                <PromptPayPaymentCard
                  language={language}
                  promptPayId={
                    activeBooking.promptPayId || hotel.promptPayId
                  }
                  promptPayAccountName={
                    activeBooking.promptPayAccountName ||
                    hotel.promptPayAccountName
                  }
                  amountThb={activeBooking.netTotalThb}
                  isVerifyingSlip={isVerifyingSlip}
                  slipError={slipError}
                  slipFeedback={slipFeedback}
                  onUploadSlip={handleUploadSlipFile}
                />
              )}
            </div>
          ) : (
            <form
              id="airbnb-checkout-form"
              onSubmit={handleSubmitHoldBooking}
              className="divide-y divide-[var(--color-border)]"
            >
              {/* 1. YOUR TRIP (Inline Modal Triggers — ZERO Back History Stack!) */}
              <section className="pb-7 space-y-5">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "การเดินทางของคุณ" : "Your trip"}
                </h2>

                {/* Dates Row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "วันที่เข้าพัก" : "Dates"}
                    </p>
                    <p className="text-[14.5px] text-[var(--color-text-secondary)] mt-0.5">
                      {formatShortDate(localCheckIn, language)} –{" "}
                      {formatShortDate(localCheckOut, language)} ({stayNights}{" "}
                      {isTh ? "คืน" : "nights"})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditTripOpen(true)}
                    className="h-8 px-2.5 rounded-[9px] text-[14px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline cursor-pointer shrink-0 transition-colors"
                  >
                    {isTh ? "แก้ไข" : "Edit"}
                  </button>
                </div>

                {/* Guests Row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "ผู้เข้าพัก" : "Guests"}
                    </p>
                    <p className="text-[14.5px] text-[var(--color-text-secondary)] mt-0.5">
                      {localGuests} {isTh ? "ท่าน" : "guests"}{" "}
                      {!fitsGuests && (
                        <span className="text-[var(--color-error)] font-medium">
                          ·{" "}
                          {isTh
                            ? `ห้อง ${selectedRoom.code} รองรับสูงสุด ${selectedRoom.maxGuests} ท่าน`
                            : `Max ${selectedRoom.maxGuests} for ${selectedRoom.code}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditTripOpen(true)}
                    className="h-8 px-2.5 rounded-[9px] text-[14px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline cursor-pointer shrink-0 transition-colors"
                  >
                    {isTh ? "แก้ไข" : "Edit"}
                  </button>
                </div>

                {/* Selected Room Type Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "ห้องพักที่เลือก" : "Room"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[14.5px] text-[var(--color-text-secondary)]">
                        {selectedRoom.code} ·{" "}
                        {isTh ? selectedRoom.nameTh : selectedRoom.nameEn}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--color-background-muted)] px-2 h-5 text-[11px] font-semibold text-[var(--color-text-primary)]">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            isRoomAvailable
                              ? "bg-[var(--color-success)]"
                              : "bg-[var(--color-error)]"
                          }`}
                        />
                        <span>
                          {isRoomAvailable
                            ? isTh
                              ? `ว่าง ${selectedRoom.availableUnits} ห้อง`
                              : `${selectedRoom.availableUnits} left`
                            : isTh
                            ? "เต็มช่วงวันที่เลือก"
                            : "Sold out"}
                        </span>
                      </span>
                    </div>
                  </div>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsSwitchRoomOpen(true)}
                      className="h-8 px-2.5 rounded-[9px] text-[14px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline cursor-pointer shrink-0 transition-colors"
                    >
                      {isTh ? "เปลี่ยนห้อง" : "Change"}
                    </button>
                  )}
                </div>

                {(!isRoomAvailable || !fitsGuests) && (
                  <div className="rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] p-3.5 flex flex-wrap items-center justify-between gap-2.5">
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      {!isRoomAvailable
                        ? isTh
                          ? `ห้อง ${selectedRoom.code} เต็มในช่วงวันที่เลือกแล้ว`
                          : `${selectedRoom.code} is sold out for these dates`
                        : isTh
                        ? `ผู้เข้าพักเกินความจุห้อง ${selectedRoom.code} (${selectedRoom.maxGuests} ท่าน)`
                        : `Guest count exceeds room ${selectedRoom.code} max (${selectedRoom.maxGuests})`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditTripOpen(true)}
                        className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[12.5px] font-semibold cursor-pointer"
                      >
                        {isTh ? "เปลี่ยนวัน / จำนวนคน" : "Edit dates"}
                      </button>
                      {rooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsSwitchRoomOpen(true)}
                          className="h-8 px-3 rounded-[9px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[12.5px] font-semibold cursor-pointer"
                        >
                          {isTh ? "เลือกห้องที่ว่าง" : "Switch room"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* 2. PROPERTY ADD-ONS */}
              {addons.length > 0 && (
                <section className="py-7 space-y-4">
                  <div className="space-y-0.5">
                    <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                      {isTh ? "บริการเสริมจากที่พัก" : "Enhance your stay"}
                    </h2>
                    <p className="ty-caption text-[var(--color-text-secondary)]">
                      {isTh
                        ? "เพิ่มบริการพิเศษล่วงหน้าได้เลย (คิดรวมในยอดชำระรอบเดียว)"
                        : "Add optional experiences hosted by this property"}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {addons.map((addon) => {
                      const qty = addonQuantities[addon.id] || 0;
                      const meta = getFacilityIconMeta(addon.nameTh);
                      const FallbackIcon = meta.Icon;
                      return (
                        <div
                          key={addon.id}
                          className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {addon.imageUrl ? (
                              <img
                                src={addon.imageUrl}
                                alt={isTh ? addon.nameTh : addon.nameEn}
                                className="h-14 w-14 rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)] border border-[var(--color-border)]"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-[10px] bg-[var(--color-background-muted)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-primary)]">
                                <FallbackIcon className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                                {isTh ? addon.nameTh : addon.nameEn}
                              </h3>
                              {addon.descriptionTh && (
                                <p className="text-[12.5px] text-[var(--color-text-secondary)] line-clamp-1">
                                  {addon.descriptionTh}
                                </p>
                              )}
                              <p className="text-[13px] mt-0.5 text-[var(--color-text-primary)]">
                                <strong>
                                  +฿{addon.priceThb.toLocaleString()}
                                </strong>{" "}
                                <span className="text-[var(--color-text-secondary)]">
                                  /{" "}
                                  {isTh
                                    ? addon.unitLabelTh
                                    : addon.unitLabelEn}
                                </span>
                              </p>
                            </div>
                          </div>

                          {qty > 0 ? (
                            <div className="inline-flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateAddonQty(addon.id, -1)
                                }
                                aria-label="Decrease addon quantity"
                                className="h-8 w-8 rounded-[9px] bg-[var(--color-background-muted)] border border-[var(--color-border)] hover:border-[var(--color-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-[13.5px] font-semibold tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateAddonQty(addon.id, 1)}
                                aria-label="Increase addon quantity"
                                className="h-8 w-8 rounded-[9px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateAddonQty(addon.id, 1)}
                              className="h-9 rounded-[10px] px-3.5 text-[13px] font-semibold bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isTh ? "เพิ่ม" : "Add"}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. GUEST DETAILS */}
              <section className="py-7 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ข้อมูลผู้เข้าพัก" : "Guest details"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <StandardInput
                    label={isTh ? "ชื่อ - นามสกุล *" : "Full Name *"}
                    placeholder={
                      isTh ? "เช่น คุณกานต์ วงศ์สวัสดิ์" : "Full name"
                    }
                    required
                    value={guestForm.guestName}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        guestName: e.target.value,
                      }))
                    }
                  />
                  <StandardInput
                    label={isTh ? "เบอร์โทรศัพท์ *" : "Phone Number *"}
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    required
                    value={guestForm.guestPhone}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        guestPhone: e.target.value,
                      }))
                    }
                  />
                  <StandardInput
                    label="LINE ID"
                    optionalText={isTh ? "รับใบจอง" : "Optional"}
                    placeholder="@lineid"
                    value={guestForm.guestLine}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        guestLine: e.target.value,
                      }))
                    }
                  />
                  <StandardInput
                    label={
                      isTh ? "คำขอพิเศษถึงที่พัก" : "Special requests"
                    }
                    optionalText={isTh ? "ไม่บังคับ" : "Optional"}
                    placeholder={
                      isTh ? "เช่น เช็กอิน 15:00 น." : "e.g. Late check-in"
                    }
                    value={guestForm.guestNote}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        guestNote: e.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              {/* 4. ENTER A COUPON */}
              <section className="py-7 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                    {isTh ? "คูปองส่วนลด" : "Enter a coupon"}
                  </h2>
                  <button
                    type="button"
                    onClick={openCouponWallet}
                    className="h-8 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>
                      {isTh ? "เปิดกระเป๋าคูปอง" : "Coupon wallet"}
                    </span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder={
                      isTh
                        ? "กรอกโค้ดส่วนลดของที่พักนี้..."
                        : "Enter coupon code..."
                    }
                    className="h-10 flex-1 rounded-[12px] bg-[var(--color-background-muted)] border border-[var(--color-border)] focus:border-[var(--color-border-emphasized)] px-3.5 text-[14px] font-mono uppercase focus:outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="h-10 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{isTh ? "ใช้โค้ด" : "Apply"}</span>
                  </button>
                </div>

                {appliedCouponCode && pricingBreakdown.discountThb > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-muted)] px-3.5 py-2 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-success)]">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>
                        {isTh
                          ? `ใช้โค้ด ${appliedCouponCode} แล้ว (ประหยัด ฿${pricingBreakdown.discountThb.toLocaleString()})`
                          : `${appliedCouponCode} applied (saved ฿${pricingBreakdown.discountThb.toLocaleString()})`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[12.5px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline cursor-pointer"
                    >
                      {isTh ? "ลบโค้ด" : "Remove"}
                    </button>
                  </div>
                )}

                {coupons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coupons.map((c) => {
                      const isApplied = appliedCouponCode === c.code;
                      const discountText =
                        c.discountType === "PERCENT"
                          ? isTh
                            ? `ลด ${c.discountValue}%`
                            : `${c.discountValue}% OFF`
                          : isTh
                          ? `ลด ฿${c.discountValue.toLocaleString()}`
                          : `−฿${c.discountValue.toLocaleString()}`;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className={`inline-flex items-center gap-1.5 rounded-[9px] px-3 h-8 text-[12px] font-mono font-bold cursor-pointer transition border ${
                            isApplied
                              ? "bg-[#222222] border-[#222222] !text-white dark:bg-[#f5f5f5] dark:border-[#f5f5f5] dark:!text-[#222222]"
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

                {(couponError || pricingBreakdown.couponError) && (
                  <p className="ty-caption text-[var(--color-error)]">
                    {couponError || pricingBreakdown.couponError}
                  </p>
                )}
              </section>

              {/* 5. PAYMENT METHOD & GROUND RULES */}
              <section className="py-7 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ช่องทางชำระเงิน & ข้อตกลงการเข้าพัก" : "Payment & ground rules"}
                </h2>

                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4 flex items-start gap-3">
                  <QrCode className="w-5 h-5 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {isTh
                        ? "สแกนจ่าย PromptPay เข้าบัญชีที่พักโดยตรง (0% GP)"
                        : "Direct PromptPay QR to property account (0% GP)"}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? `ชื่อบัญชี: ${hotel.promptPayAccountName} · ล็อคห้องให้ 15 นาทีหลังกดยืนยันและแนบสลิปได้ทันที`
                        : `Account: ${hotel.promptPayAccountName} · 15-min room hold after confirmation`}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 text-[13.5px] text-[var(--color-text-secondary)] list-disc pl-5">
                  <li>
                    {isTh
                      ? `เช็กอินหลัง ${hotel.checkInTime} น. · เช็กเอาต์ก่อน ${hotel.checkOutTime} น.`
                      : `Check-in after ${hotel.checkInTime} · Checkout before ${hotel.checkOutTime}`}
                  </li>
                  <li>
                    {hotel.petsAllowed
                      ? hotel.petPolicyTh ||
                        (isTh
                          ? "ต้อนรับสัตว์เลี้ยงเข้าพักได้ตามเงื่อนไขที่พัก"
                          : "Pets welcome under property guidelines")
                      : hotel.petPolicyTh ||
                        (isTh
                          ? "งดนำสัตว์เลี้ยงเข้าพักเพื่อความสงบของผู้เข้าพัก"
                          : "No pets allowed")}
                  </li>
                </ul>
              </section>

              {/* 6. MOBILE PRICE BREAKDOWN + FINAL CONFIRM CTA */}
              <section className="pt-7 space-y-5">
                <div className="lg:hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4">
                  {renderPriceDetailsBlock()}
                </div>

                {bookingError && (
                  <div className="rounded-[12px] border border-[var(--color-error)] bg-[var(--color-background-muted)] p-3.5 text-[13.5px] font-semibold text-[var(--color-error)]">
                    {bookingError}
                  </div>
                )}

                <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  {isTh
                    ? "เมื่อกดปุ่มด้านล่าง ระบบจะล็อคห้องพักไว้ให้คุณชั่วคราว 15 นาที เพื่อสแกน QR ชำระเงินเข้าบัญชีที่พักโดยตรงโดยไม่เสียค่าธรรมเนียมตัวกลาง"
                    : "Selecting Confirm and pay holds this room for 15 minutes so you can transfer directly via PromptPay with 0% platform fees."}
                </p>

                <button
                  type="submit"
                  disabled={isCreatingHold || !canConfirm}
                  className="h-12 w-full sm:w-auto sm:min-w-[260px] px-7 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {isCreatingHold
                      ? isTh
                        ? "กำลังล็อคห้อง..."
                        : "Holding room..."
                      : !canConfirm
                      ? isTh
                        ? "กรุณาปรับวันเข้าพักหรือห้องพัก"
                        : "Adjust dates or room first"
                      : isTh
                      ? `ยืนยันและรับ QR ชำระเงิน · ฿${pricingBreakdown.netTotalThb.toLocaleString()}`
                      : `Confirm & pay · ฿${pricingBreakdown.netTotalThb.toLocaleString()}`}
                  </span>
                </button>
              </section>
            </form>
          )}
        </div>

        {/* COLUMN 7: 8.33% (~93px) AIRBNB BREATHING AIR -> RIGHT STICKY CARD (COLS 8–12) */}
        <aside className="hidden lg:block lg:col-start-8 lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-6 space-y-5">
            {/* Property & Room Header */}
            <div className="flex items-start gap-4">
              <img
                src={roomCover}
                alt={isTh ? selectedRoom.nameTh : selectedRoom.nameEn}
                className="h-24 w-28 rounded-[12px] object-cover bg-[var(--color-background-muted)] shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
                  {isTh ? hotel.nameTh : hotel.nameEn}
                </p>
                <h2 className="text-[15.5px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                  {selectedRoom.code} ·{" "}
                  {isTh ? selectedRoom.nameTh : selectedRoom.nameEn}
                </h2>
                <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-secondary)] pt-0.5">
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {hotel.ratingAvg.toFixed(1)}
                  </span>
                  <span>
                    ({hotel.reviewCount} {isTh ? "รีวิว" : "reviews"})
                  </span>
                  <span>·</span>
                  <span>0% GP</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 flex items-center justify-between gap-2 text-[13.5px]">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatShortDate(localCheckIn, language)} –{" "}
                  {formatShortDate(localCheckOut, language)}
                </p>
                <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                  {stayNights} {isTh ? "คืน" : "nights"} · {localGuests}{" "}
                  {isTh ? "ท่าน" : "guests"}
                </p>
              </div>
              {!activeBooking && (
                <button
                  type="button"
                  onClick={() => setIsEditTripOpen(true)}
                  className="text-[13px] font-semibold text-[var(--color-text-primary)] underline cursor-pointer"
                >
                  {isTh ? "แก้ไข" : "Edit"}
                </button>
              )}
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              {renderPriceDetailsBlock()}
            </div>

            <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 flex items-start gap-2.5 text-[12.5px] text-[var(--color-text-secondary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
              <span>
                {isTh
                  ? `โอนตรงบัญชี ${hotel.promptPayAccountName} · ตรวจสลิปอัตโนมัติ รับใบจองทันทีหลังชำระเงิน`
                  : `Direct payment to ${hotel.promptPayAccountName} · Instant digital voucher after verification`}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          FLOATING MODAL 1: EDIT DATES & GUESTS (Zero Browser History Push!)
      ====================================================================== */}
      {isEditTripOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            isTh ? "แก้ไขวันเข้าพักและผู้เข้าพัก" : "Edit dates and guests"
          }
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/45 animate-fade-in-backdrop"
            onClick={() => setIsEditTripOpen(false)}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[740px] max-h-[88dvh] overflow-y-auto rounded-[20px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-5 sm:p-6 space-y-5"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                <Calendar className="w-4 h-4" />
                <span>
                  {isTh
                    ? "แก้ไขวันเข้าพักและผู้เข้าพัก"
                    : "Change dates & guests"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTripOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AirbnbStayCalendar
              language={language}
              todayDate={today}
              checkInDate={localCheckIn}
              checkOutDate={localCheckOut}
              onChangeDates={handleDatesChanged}
              guests={localGuests}
              onChangeGuests={handleGuestsChanged}
              stayNights={stayNights}
              hotelName={isTh ? hotel.nameTh : hotel.nameEn}
              rooms={rooms}
              calendarRoomFilterId={calendarRoomFilterId}
              onChangeCalendarRoomFilterId={setCalendarRoomFilterId}
              bookedUnitsByRoomDate={bookedUnitsByRoomDate}
              dateOverrides={dateOverrides}
              headingPrefix=""
            />

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
              <div className="text-[13px] text-[var(--color-text-secondary)]">
                {selectedRoom.code} ·{" "}
                {isRoomAvailable
                  ? isTh
                    ? `ว่าง ${selectedRoom.availableUnits} ห้องสำหรับช่วงที่เลือก`
                    : `${selectedRoom.availableUnits} available`
                  : isTh
                  ? "ห้องนี้เต็มในช่วงวันที่เลือก"
                  : "Sold out on selected dates"}
              </div>
              <button
                type="button"
                onClick={() => setIsEditTripOpen(false)}
                className="h-10 px-5 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors"
              >
                {isTh ? "เสร็จสิ้น" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOATING MODAL 2: SWITCH ROOM TYPE (Zero Browser History Push!)
      ====================================================================== */}
      {isSwitchRoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTh ? "เปลี่ยนประเภทห้องพัก" : "Switch room type"}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/45 animate-fade-in-backdrop"
            onClick={() => setIsSwitchRoomOpen(false)}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[560px] max-h-[85dvh] overflow-y-auto rounded-[20px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                <BedDouble className="w-4 h-4" />
                <span>
                  {isTh ? "เลือกประเภทห้องพักอื่น" : "Switch room type"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchRoomOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {rooms.map((rm) => {
                const isSelected = rm.id === selectedRoom.id;
                const avail = rm.availableUnits > 0;
                const fits = rm.maxGuests >= localGuests;
                const rmPhoto = rm.galleryUrls[0] || roomCover;
                return (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => handleSwitchRoom(rm)}
                    className={`w-full text-left rounded-[14px] border p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-[#222222] dark:border-[#f5f5f5] bg-[var(--color-background-muted)]"
                        : "border-[var(--color-border)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={rmPhoto}
                        alt={isTh ? rm.nameTh : rm.nameEn}
                        className="h-14 w-16 rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                          {rm.code} · {isTh ? rm.nameTh : rm.nameEn}
                        </p>
                        <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                          ฿{rm.weekdayPriceThb.toLocaleString()}/
                          {isTh ? "คืน" : "night"} ·{" "}
                          {isTh ? `สูงสุด ${rm.maxGuests} ท่าน` : `max ${rm.maxGuests}`}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-background-muted)] border border-[var(--color-border)] px-2.5 h-6 text-[11px] font-semibold text-[var(--color-text-primary)]">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          !avail
                            ? "bg-[var(--color-error)]"
                            : !fits
                            ? "bg-[var(--color-warning)]"
                            : "bg-[var(--color-success)]"
                        }`}
                      />
                      <span>
                        {!avail
                          ? isTh
                            ? "เต็ม"
                            : "Full"
                          : !fits
                          ? isTh
                            ? `เกิน ${rm.maxGuests}`
                            : `Max ${rm.maxGuests}`
                          : isTh
                          ? `ว่าง ${rm.availableUnits}`
                          : `${rm.availableUnits} left`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

