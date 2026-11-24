"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Calendar,
  Clock,
  Info,
  Maximize2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  calculateStayPricing,
  computeNightsBetween,
  getRequiredMinNightsForStay,
} from "@/lib/bookingMath";
import { selectBestEligibleCoupon } from "@/lib/couponHelpers";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
} from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";
import type {
  CouponDealDto,
  HotelDiscountRuleDto,
  HotelProfileDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export { selectBestEligibleCoupon };

const INITIAL_VISIBLE_AMENITIES = 6;

export function RoomBookingDrawer({
  isOpen,
  onClose,
  hotel,
  rooms = [],
  selectedRoom: selectedRoomProp,
  onSelectRoom,
  dateOverrides,
  coupons,
  discountRules = [],
  language,
  checkInDate,
  checkOutDate,
  guests,
  hasConfirmedDates = true,
  fallbackCoverUrl = "",
  onExpandPhotos,
  onProceedToCheckout,
  onCheckRoomDates,
  onAutoExtendMinNights,
}: {
  isOpen: boolean;
  onClose: () => void;
  hotel: HotelProfileDto;
  rooms?: ReadonlyArray<RoomAvailabilityDto>;
  selectedRoom: RoomAvailabilityDto | null;
  onSelectRoom?: (room: RoomAvailabilityDto) => void;
  dateOverrides: RoomDateOverrideDto[];
  coupons: CouponDealDto[];
  discountRules?: HotelDiscountRuleDto[];
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  hasConfirmedDates?: boolean;
  fallbackCoverUrl?: string;
  onExpandPhotos?: (photos: string[], index: number) => void;
  onProceedToCheckout: (room: RoomAvailabilityDto) => void;
  onCheckRoomDates?: (room: RoomAvailabilityDto) => void;
  onAutoExtendMinNights?: (minNights: number) => void;
}) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);

  // Preserve last non-null room during exit transition so closing never flashes blank
  const lastRoomRef = useRef<RoomAvailabilityDto | null>(selectedRoomProp);
  if (selectedRoomProp) {
    lastRoomRef.current = selectedRoomProp;
  }
  const selectedRoom = selectedRoomProp ?? lastRoomRef.current;

  const isTh = language === "th";
  const [mounted, setMounted] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);

  const desktopPhotoScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopSpecScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
  const railItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchableRooms = useMemo(() => {
    if (rooms.length > 0) return rooms;
    return selectedRoom ? [selectedRoom] : [];
  }, [rooms, selectedRoom]);

  const currentIndex = useMemo(() => {
    if (!selectedRoom) return -1;
    return switchableRooms.findIndex((r) => r.id === selectedRoom.id);
  }, [switchableRooms, selectedRoom]);

  const canSwitchRooms = Boolean(onSelectRoom) && switchableRooms.length > 1;
  const hasPrevRoom = canSwitchRooms && currentIndex > 0;
  const hasNextRoom =
    canSwitchRooms &&
    currentIndex >= 0 &&
    currentIndex < switchableRooms.length - 1;

  // Reset scroll & local expansion cleanly when switching rooms
  const selectedRoomId = selectedRoom?.id ?? null;
  useEffect(() => {
    setShowAllAmenities(false);
    setMobilePhotoIndex(0);
    desktopPhotoScrollRef.current?.scrollTo({ top: 0 });
    desktopSpecScrollRef.current?.scrollTo({ top: 0 });
    mobileBodyScrollRef.current?.scrollTo({ top: 0 });
    mobileCarouselRef.current?.scrollTo({ left: 0 });
    if (selectedRoomId) {
      railItemRefs.current[selectedRoomId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedRoomId]);

  // Keyboard shortcuts: Escape to close, ArrowUp / ArrowDown to switch rooms on Desktop
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp" && hasPrevRoom && onSelectRoom) {
        e.preventDefault();
        onSelectRoom(switchableRooms[currentIndex - 1]);
      } else if (e.key === "ArrowDown" && hasNextRoom && onSelectRoom) {
        e.preventDefault();
        onSelectRoom(switchableRooms[currentIndex + 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isOpen,
    onClose,
    hasPrevRoom,
    hasNextRoom,
    onSelectRoom,
    switchableRooms,
    currentIndex,
  ]);

  const stayNights = computeNightsBetween(checkInDate, checkOutDate);

  const requiredMinNights = useMemo(() => {
    if (!selectedRoom || !hasConfirmedDates) return 1;
    return getRequiredMinNightsForStay(
      selectedRoom.id,
      checkInDate,
      checkOutDate,
      dateOverrides
    );
  }, [selectedRoom, hasConfirmedDates, checkInDate, checkOutDate, dateOverrides]);

  const isMinNightsBlocked =
    hasConfirmedDates && stayNights < requiredMinNights;

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
        appliedAutoDiscountLabel: null,
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
      discountRules,
    });
  }, [
    selectedRoom,
    checkInDate,
    checkOutDate,
    guests,
    dateOverrides,
    bestCoupon,
    discountRules,
    baseBreakdown,
  ]);

  if (!shouldRender || !selectedRoom || !mounted) return null;

  const gallery =
    selectedRoom.galleryUrls.length > 0
      ? selectedRoom.galleryUrls
      : fallbackCoverUrl
      ? [fallbackCoverUrl]
      : [];

  const roomName = isTh ? selectedRoom.nameTh : selectedRoom.nameEn;
  const roomDesc = isTh
    ? selectedRoom.shortDescTh
    : selectedRoom.shortDescEn || selectedRoom.shortDescTh;
  const isRoomAvailable =
    selectedRoom.availableUnits > 0 && selectedRoom.maxGuests >= guests;

  const amenitiesList = selectedRoom.amenities ?? [];
  const visibleAmenities = showAllAmenities
    ? amenitiesList
    : amenitiesList.slice(0, INITIAL_VISIBLE_AMENITIES);
  const hiddenAmenityCount = Math.max(
    0,
    amenitiesList.length - INITIAL_VISIBLE_AMENITIES
  );

  const specsLine = isTh
    ? `${selectedRoom.beds} เตียง · พักได้สูงสุด ${selectedRoom.maxGuests} ท่าน · ${selectedRoom.sizeSqm} ตร.ม.`
    : `${selectedRoom.beds} ${
        selectedRoom.beds === 1 ? "bed" : "beds"
      } · ${selectedRoom.maxGuests} ${
        selectedRoom.maxGuests === 1 ? "guest" : "guests"
      } · ${selectedRoom.sizeSqm} sqm`;

  const dateRangeShort = `${formatShortDate(
    checkInDate,
    language
  )} – ${formatShortDate(checkOutDate, language)}`;

  const renderPrimaryCta = () => {
    if (!hasConfirmedDates) {
      return (
        <button
          type="button"
          onClick={() => {
            onClose();
            onCheckRoomDates?.(selectedRoom);
          }}
          className="h-12 px-7 sm:px-8 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[15px] font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
        >
          <span>{isTh ? "เช็กวันว่าง" : "Check availability"}</span>
        </button>
      );
    }

    if (isMinNightsBlocked) {
      return (
        <button
          type="button"
          onClick={() => {
            if (onAutoExtendMinNights) {
              onAutoExtendMinNights(requiredMinNights);
            } else {
              onClose();
              onCheckRoomDates?.(selectedRoom);
            }
          }}
          className="h-12 px-7 sm:px-8 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
        >
          <span>
            {isTh
              ? `ปรับเป็น ${requiredMinNights} คืน`
              : `Extend to ${requiredMinNights} nights`}
          </span>
        </button>
      );
    }

    if (isRoomAvailable) {
      return (
        <button
          type="button"
          onClick={() => onProceedToCheckout(selectedRoom)}
          className="h-12 px-7 sm:px-8 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[15px] font-semibold inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        >
          <span>{isTh ? "จองห้องนี้" : "Reserve"}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          onClose();
          onCheckRoomDates?.(selectedRoom);
        }}
        className="h-12 px-6 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>
          {selectedRoom.availableUnits === 0
            ? isTh
              ? "เต็มช่วงนี้ · เปลี่ยนวัน"
              : "Sold out · Change dates"
            : isTh
            ? `สูงสุด ${selectedRoom.maxGuests} ท่าน`
            : `Max ${selectedRoom.maxGuests} guests`}
        </span>
      </button>
    );
  };

  const renderEditorialSections = (isMobileLayout: boolean) => (
    <div className="divide-y divide-[var(--color-border)]">
      {/* 1. Centered Hero Room Title + Concise Single-Line Specs */}
      <section className="pb-6 text-center space-y-1.5">
        <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-snug">
          {roomName}
        </h2>
        <p className="text-[13.5px] text-[var(--color-text-secondary)]">
          {specsLine}
        </p>
      </section>

      {/* 2. About this room (On Mobile Airbnb places About right below title!) */}
      {isMobileLayout && (
        <section className="py-6 space-y-2.5">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "เกี่ยวกับห้องพักนี้" : "About this room"}
          </h3>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {roomDesc ||
              (isTh
                ? `ห้องพัก ${roomName} จองตรงกับ ${hotel.nameTh} ไม่มีค่า GP พร้อมสิ่งอำนวยความสะดวกครบครัน`
                : `${roomName} direct stay at ${hotel.nameEn} with 0% GP pricing and essential comforts.`)}
          </p>
          <p className="text-[13px] text-[var(--color-text-tertiary)] tabular-nums">
            {isTh
              ? `วันธรรมดา ฿${selectedRoom.weekdayPriceThb.toLocaleString()} · คืนศุกร์–เสาร์ ฿${selectedRoom.weekendPriceThb.toLocaleString()} / คืน`
              : `Weekdays ฿${selectedRoom.weekdayPriceThb.toLocaleString()} · Fri–Sat ฿${selectedRoom.weekendPriceThb.toLocaleString()} / night`}
          </p>
        </section>
      )}

      {/* 3. What this room offers (2-col on Desktop, 1-col on Mobile — Exact Airbnb Images 2 & 6!) */}
      {amenitiesList.length > 0 && (
        <section className="py-6 space-y-4">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "สิ่งอำนวยความสะดวกในห้อง" : "What this room offers"}
          </h3>

          <div
            className={
              isMobileLayout
                ? "space-y-3.5"
                : "grid grid-cols-2 gap-x-5 gap-y-3.5"
            }
          >
            {visibleAmenities.map((label) => {
              const { Icon } = getFacilityIconMeta(label);
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 text-[14px] text-[var(--color-text-primary)] min-w-0"
                >
                  <Icon className="w-[18px] h-[18px] text-[var(--color-text-primary)] stroke-[1.65] shrink-0" />
                  <span className="leading-snug truncate">{label}</span>
                </div>
              );
            })}
          </div>

          {hiddenAmenityCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllAmenities((v) => !v)}
              className={`h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors ${
                isMobileLayout ? "w-full" : ""
              }`}
            >
              {showAllAmenities
                ? isTh
                  ? "ซ่อนบางรายการ"
                  : "Show fewer amenities"
                : isTh
                ? `ดูสิ่งอำนวยความสะดวกทั้งหมด (${amenitiesList.length})`
                : `Show all ${amenitiesList.length} amenities`}
            </button>
          )}
        </section>
      )}

      {/* 4. About this room (On Desktop Airbnb places About right below Amenities — Exact Image 2-3!) */}
      {!isMobileLayout && (
        <section className="py-6 space-y-2.5">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "เกี่ยวกับห้องพักนี้" : "About this room"}
          </h3>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {roomDesc ||
              (isTh
                ? `ห้องพัก ${roomName} จองตรงกับ ${hotel.nameTh} ไม่มีค่า GP พร้อมสิ่งอำนวยความสะดวกครบครัน`
                : `${roomName} direct stay at ${hotel.nameEn} with 0% GP pricing and essential comforts.`)}
          </p>
          <p className="text-[13px] text-[var(--color-text-tertiary)] tabular-nums">
            {isTh
              ? `วันธรรมดา ฿${selectedRoom.weekdayPriceThb.toLocaleString()} · คืนศุกร์–เสาร์ ฿${selectedRoom.weekendPriceThb.toLocaleString()} / คืน`
              : `Weekdays ฿${selectedRoom.weekdayPriceThb.toLocaleString()} · Fri–Sat ฿${selectedRoom.weekendPriceThb.toLocaleString()} / night`}
          </p>
        </section>
      )}

      {/* 5. Dates Row with Clean "Change" Button (Exact Airbnb Images 3–4!) */}
      <section className="py-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "วันที่เข้าพัก" : "Dates"}
            </h3>
            <p className="text-[14px] text-[var(--color-text-secondary)] tabular-nums">
              {hasConfirmedDates
                ? isTh
                  ? `${stayNights} คืน · ${dateRangeShort} · ${guests} ท่าน`
                  : `${stayNights} ${
                      stayNights === 1 ? "night" : "nights"
                    } · ${dateRangeShort} · ${guests} ${
                      guests === 1 ? "guest" : "guests"
                    }`
                : isTh
                ? "ยังไม่ได้เลือกวันเข้าพัก"
                : "Add dates for exact availability & price"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCheckRoomDates?.(selectedRoom);
            }}
            className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] shrink-0 cursor-pointer transition-colors"
          >
            {hasConfirmedDates
              ? isTh
                ? "เปลี่ยน"
                : "Change"
              : isTh
              ? "เลือกวัน"
              : "Add dates"}
          </button>
        </div>

        {isMinNightsBlocked && (
          <div className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-text-primary)]">
            {isTh
              ? `ช่วงวันที่เลือกกำหนดเข้าพักขั้นต่ำ ${requiredMinNights} คืน กรุณาปรับวันเช็กเอาต์`
              : `Minimum stay of ${requiredMinNights} nights is required for these dates.`}
          </div>
        )}
      </section>

      {/* 6. Keep in mind (Clean Icon Rows, Zero 4-Sided Borders — Exact Airbnb Images 3–4 & 6!) */}
      <section className="py-6 last:pb-2 space-y-4">
        <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          {isTh ? "ข้อมูลควรทราบ" : "Keep in mind"}
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <Clock className="w-[18px] h-[18px] text-[var(--color-text-primary)] stroke-[1.7] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[13.5px]">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTh ? "เวลาเช็กอิน & เช็กเอาต์" : "Check-in & checkout"}
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {isTh
                  ? `เช็กอินหลัง ${hotel.checkInTime} น. · เช็กเอาต์ก่อน ${hotel.checkOutTime} น.`
                  : `Check-in after ${hotel.checkInTime} · Checkout before ${hotel.checkOutTime}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Users className="w-[18px] h-[18px] text-[var(--color-text-primary)] stroke-[1.7] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[13.5px]">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTh ? "กฎของห้องพัก" : "Room rules"}
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {isTh
                  ? `พักได้สูงสุด ${selectedRoom.maxGuests} ท่าน · ${
                      selectedRoom.petsAllowed
                        ? "ต้อนรับสัตว์เลี้ยง"
                        : "งดนำสัตว์เลี้ยงเข้าพัก"
                    }${
                      selectedRoom.extraGuestPriceThb > 0
                        ? ` · ผู้เข้าพักเสริม +฿${selectedRoom.extraGuestPriceThb.toLocaleString()}/คืน`
                        : ""
                    }`
                  : `Up to ${selectedRoom.maxGuests} overnight guests · ${
                      selectedRoom.petsAllowed
                        ? "Pets allowed"
                        : "No pets allowed"
                    }`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <ShieldCheck className="w-[18px] h-[18px] text-[var(--color-text-primary)] stroke-[1.7] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[13.5px]">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTh ? "จองตรงกับที่พัก · 0% GP" : "Direct booking · 0% GP"}
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {isTh
                  ? `ล็อกห้องทันที 15 นาที เพื่อโอนตรงเข้าบัญชี ${hotel.nameTh} ไม่มีค่าธรรมเนียมแพลตฟอร์ม`
                  : `15-minute instant room hold with direct PromptPay transfer to ${hotel.nameEn}.`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Info className="w-[18px] h-[18px] text-[var(--color-text-primary)] stroke-[1.7] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[13.5px]">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTh ? "ข้อมูลห้องพัก" : "Room details"}
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {isTh
                  ? `รหัสห้อง ${selectedRoom.code} · ${selectedRoom.bedrooms} ห้องนอน · ${selectedRoom.bathrooms} ห้องน้ำ · ทั้งหมด ${selectedRoom.totalUnits} ยูนิต`
                  : `Code ${selectedRoom.code} · ${selectedRoom.bedrooms} bedroom · ${selectedRoom.bathrooms} bath · ${selectedRoom.totalUnits} units`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderStickyFooter = (isMobileLayout: boolean) => (
    <footer
      className={`shrink-0 bg-[var(--color-background-card)] border-t border-[var(--color-border)] flex items-center justify-between gap-4 ${
        isMobileLayout
          ? "px-5 pt-3.5 pb-[max(14px,env(safe-area-inset-bottom))]"
          : "px-7 py-4"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap tabular-nums">
          {hasConfirmedDates && pricingBreakdown.discountThb > 0 && (
            <span className="text-[13px] line-through text-[var(--color-text-tertiary)]">
              ฿{pricingBreakdown.subtotalBeforeDiscountThb.toLocaleString()}
            </span>
          )}
          <span className="text-[17px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 decoration-[var(--color-text-primary)] leading-tight">
            ฿
            {(hasConfirmedDates
              ? pricingBreakdown.netTotalThb
              : selectedRoom.weekdayPriceThb
            ).toLocaleString()}
          </span>
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5 tabular-nums">
          {hasConfirmedDates
            ? isMinNightsBlocked
              ? isTh
                ? `เข้าพักขั้นต่ำ ${requiredMinNights} คืน`
                : `Min. ${requiredMinNights} nights`
              : isTh
              ? `สำหรับ ${stayNights} คืน · ${dateRangeShort}`
              : `for ${stayNights} ${
                  stayNights === 1 ? "night" : "nights"
                } · ${dateRangeShort}`
            : isTh
            ? "เริ่มต้นต่อคืน"
            : "starting per night"}
        </p>
      </div>

      {renderPrimaryCta()}
    </footer>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={roomName}
      data-state={dataState}
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] bg-black/48 flex items-end lg:items-center justify-center lg:p-6 cgr-modal-backdrop"
    >
      {/* =====================================================================
          DESKTOP (>= lg): AIRBNB LEFT VERTICAL ROOM SWITCHER + CENTERED SPLIT MODAL
      ====================================================================== */}
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="hidden lg:flex items-center justify-center gap-4 w-full max-w-[1160px] cgr-modal-fade-slide"
      >
        {/* Left Floating Vertical Room Switcher Rail (Exact Airbnb Images 2–4!) */}
        {canSwitchRooms && (
          <nav
            aria-label={isTh ? "สลับดูห้องพักอื่น" : "Switch room"}
            className="flex flex-col items-center gap-2.5 shrink-0"
          >
            <button
              type="button"
              disabled={!hasPrevRoom}
              onClick={() => {
                if (hasPrevRoom && onSelectRoom) {
                  onSelectRoom(switchableRooms[currentIndex - 1]);
                }
              }}
              aria-label={isTh ? "ห้องก่อนหน้า" : "Previous room"}
              className="h-10 w-10 rounded-full bg-[var(--color-background-popover)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            <div className="max-h-[min(460px,62dvh)] overflow-y-auto no-scrollbar py-1.5 px-1 flex flex-col items-center gap-2.5">
              {switchableRooms.map((rm) => {
                const isActive = rm.id === selectedRoom.id;
                const thumb = rm.galleryUrls[0] || fallbackCoverUrl;
                const label = isTh ? rm.nameTh : rm.nameEn;

                return (
                  <button
                    key={rm.id}
                    ref={(el) => {
                      railItemRefs.current[rm.id] = el;
                    }}
                    type="button"
                    onClick={() => onSelectRoom?.(rm)}
                    title={`${label} · ฿${rm.weekdayPriceThb.toLocaleString()}`}
                    aria-label={label}
                    aria-current={isActive ? "true" : undefined}
                    className={`h-12 w-12 rounded-[14px] p-[2px] overflow-hidden shrink-0 cursor-pointer transition-all ${
                      isActive
                        ? "ring-2 ring-[#222222] dark:ring-[#f5f5f5] bg-white dark:bg-[#222222] shadow-[var(--shadow-popover)] opacity-100"
                        : "bg-white/75 dark:bg-[#222222]/75 shadow-[var(--shadow-popover)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="w-full h-full rounded-[11px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center">
                      {thumb ? (
                        <img
                          src={getOptimizedPinImageUrl(thumb, "thumb")}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BedDouble className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!hasNextRoom}
              onClick={() => {
                if (hasNextRoom && onSelectRoom) {
                  onSelectRoom(switchableRooms[currentIndex + 1]);
                }
              }}
              aria-label={isTh ? "ห้องถัดไป" : "Next room"}
              className="h-10 w-10 rounded-full bg-[var(--color-background-popover)] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </nav>
        )}

        {/* Centered 2-Column Split Modal Surface */}
        <div className="w-full max-w-[1020px] h-[min(680px,86dvh)] rounded-[24px] bg-[var(--color-background-card)] shadow-[var(--shadow-popover)] grid grid-cols-[1.08fr_1fr] overflow-hidden">
          {/* Left Column: Editorial Scrollable Photo Stack (Hero + 2-Col Grid — Exact Images 2–4!) */}
          <div
            ref={desktopPhotoScrollRef}
            className="h-full overflow-y-auto p-5 pr-2.5 no-scrollbar bg-[var(--color-background-card)]"
          >
            {gallery.length > 0 ? (
              <div className={gallery.length === 1 ? "h-full" : "space-y-2.5"}>
                {/* Primary Hero Photo */}
                <button
                  type="button"
                  onClick={() => onExpandPhotos?.(gallery, 0)}
                  aria-label={isTh ? "ขยายรูปภาพห้องพัก" : "Expand room photos"}
                  className="group relative block aspect-square w-full overflow-hidden rounded-[22px] bg-[var(--color-background-muted)] cursor-pointer text-left"
                >
                  <img
                    src={getOptimizedPinImageUrl(gallery[0], "gallery")}
                    srcSet={getOptimizedPinImageSrcSet(gallery[0], "gallery")}
                    sizes="540px"
                    alt={selectedRoom.galleryMeta?.[0]?.captionTh || roomName}
                    className="w-full h-full object-cover group-hover:brightness-[0.96] transition"
                  />
                  {onExpandPhotos && (
                    <span className="absolute bottom-3 right-3 h-8 px-3.5 rounded-full bg-white/92 dark:bg-[#222222]/90 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] text-[12px] font-semibold inline-flex items-center gap-1.5 opacity-95 group-hover:opacity-100">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>
                        {gallery.length > 1
                          ? isTh
                            ? `ดูทั้งหมด ${gallery.length} รูป`
                            : `All ${gallery.length} photos`
                          : isTh
                          ? "ขยายรูป"
                          : "Expand"}
                      </span>
                    </span>
                  )}
                </button>

                {/* Secondary 2-Column Photo Grid */}
                {gallery.length > 1 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {gallery.slice(1).map((url, idx) => (
                      <button
                        key={`${selectedRoom.id}-photo-${idx + 1}`}
                        type="button"
                        onClick={() => onExpandPhotos?.(gallery, idx + 1)}
                        aria-label={`${roomName} photo ${idx + 2}`}
                        className="group relative block aspect-square w-full overflow-hidden rounded-[18px] bg-[var(--color-background-muted)] cursor-pointer"
                      >
                        <img
                          src={getOptimizedPinImageUrl(url, "gallery")}
                          srcSet={getOptimizedPinImageSrcSet(url, "gallery")}
                          sizes="260px"
                          alt={
                            selectedRoom.galleryMeta?.[idx + 1]?.captionTh ||
                            `${roomName} ${idx + 2}`
                          }
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:brightness-[0.95] transition"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full rounded-[14px] bg-[var(--color-background-muted)] flex flex-col items-center justify-center gap-2 text-[var(--color-text-tertiary)]">
                <BedDouble className="w-8 h-8 stroke-[1.5]" />
                <span className="text-[13px]">
                  {isTh ? "ยังไม่มีรูปภาพห้องพัก" : "No room photos yet"}
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Clean Editorial Details + Sticky Price/Reserve Footer */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 flex items-center justify-end px-5 pt-4 pb-1">
              <button
                type="button"
                onClick={onClose}
                aria-label={isTh ? "ปิด" : "Close"}
                className="h-9 w-9 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div
              ref={desktopSpecScrollRef}
              className="flex-1 overflow-y-auto px-7 pb-6"
            >
              {renderEditorialSections(false)}
            </div>

            {renderStickyFooter(false)}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MOBILE & TABLET (< lg): AIRBNB SLIDE-UP BOTTOM SHEET (Images 5–6!)
      ====================================================================== */}
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="lg:hidden relative w-full h-[92dvh] rounded-t-[24px] bg-[var(--color-background-card)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden cgr-modal-sheet-only"
      >
        {/* Floating Top-Right Close Button (Exact Images 5–6!) */}
        <button
          type="button"
          onClick={onClose}
          aria-label={isTh ? "ปิด" : "Close"}
          className="absolute top-3.5 right-3.5 z-30 h-9 w-9 rounded-full bg-white/95 dark:bg-[#222222]/95 border border-black/[0.08] dark:border-white/[0.12] shadow-[var(--shadow-popover)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Sheet Body */}
        <div
          ref={mobileBodyScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {/* Full-Bleed Swipeable Photo Carousel */}
          <div className="relative w-full aspect-square bg-[var(--color-background-muted)] overflow-hidden">
            {gallery.length > 0 ? (
              <>
                <div
                  ref={mobileCarouselRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.clientWidth > 0) {
                      setMobilePhotoIndex(
                        Math.round(el.scrollLeft / el.clientWidth)
                      );
                    }
                  }}
                  className="flex w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
                >
                  {gallery.map((url, idx) => (
                    <button
                      key={`${selectedRoom.id}-mob-${idx}`}
                      type="button"
                      onClick={() => onExpandPhotos?.(gallery, idx)}
                      aria-label={`${roomName} ${idx + 1}`}
                      className="w-full h-full shrink-0 snap-center cursor-pointer"
                    >
                      <img
                        src={getOptimizedPinImageUrl(url, "gallery")}
                        srcSet={getOptimizedPinImageSrcSet(url, "gallery")}
                        sizes="100vw"
                        alt={
                          selectedRoom.galleryMeta?.[idx]?.captionTh ||
                          `${roomName} ${idx + 1}`
                        }
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {gallery.length > 1 && (
                  <div className="pointer-events-none absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
                    {gallery.slice(0, 7).map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === mobilePhotoIndex
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                <BedDouble className="w-8 h-8 stroke-[1.5]" />
              </div>
            )}
          </div>

          {/* Mobile Editorial Content */}
          <div className="px-5 pt-5 pb-6">{renderEditorialSections(true)}</div>
        </div>

        {/* Mobile Sticky Price + Reserve Footer */}
        {renderStickyFooter(true)}
      </div>
    </div>,
    document.body
  );
}
