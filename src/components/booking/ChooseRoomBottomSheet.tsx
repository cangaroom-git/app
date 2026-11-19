"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Tag, X } from "lucide-react";
import {
  calculateStayPricing,
  computeCouponDiscount,
  computeNightsBetween,
} from "@/lib/bookingMath";
import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
} from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { selectBestEligibleCoupon } from "@/components/drawers/RoomBookingDrawer";
import type {
  CouponDealDto,
  HotelDiscountRuleDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export interface ChooseRoomBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  availableRooms: ReadonlyArray<RoomAvailabilityDto>;
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>;
  coupons: ReadonlyArray<CouponDealDto>;
  discountRules?: ReadonlyArray<HotelDiscountRuleDto>;
  initialCouponCode?: string | null;
  fallbackCoverUrl: string;
  initialSelectedRoomId?: string | null;
  onInspectRoom: (room: RoomAvailabilityDto) => void;
  onOpenDatePicker: () => void;
  onConfirmRoom: (room: RoomAvailabilityDto) => void;
}

export function ChooseRoomBottomSheet({
  isOpen,
  onClose,
  language,
  checkInDate,
  checkOutDate,
  guests,
  availableRooms,
  dateOverrides,
  coupons,
  discountRules = [],
  initialCouponCode = null,
  fallbackCoverUrl,
  initialSelectedRoomId = null,
  onInspectRoom,
  onOpenDatePicker,
  onConfirmRoom,
}: ChooseRoomBottomSheetProps) {
  useBodyScrollLock(isOpen);

  const isTh = language === "th";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stayNights = useMemo(
    () => computeNightsBetween(checkInDate, checkOutDate),
    [checkInDate, checkOutDate]
  );

  // Compute exact stay pricing per available room & sort cheapest first (Airbnb standard)
  const pricedRooms = useMemo(() => {
    return availableRooms
      .map((room) => {
        const base = calculateStayPricing({
          room,
          checkInDate,
          checkOutDate,
          guests,
          overrides: dateOverrides,
        });

        let bestCoupon: { coupon: CouponDealDto; discountThb: number } | null =
          null;
        if (initialCouponCode) {
          const requested = coupons.find(
            (c) => c.code.toUpperCase() === initialCouponCode.toUpperCase()
          );
          if (requested) {
            const res = computeCouponDiscount(requested, base.roomSubtotalThb);
            if (!res.error && res.discountThb > 0) {
              bestCoupon = { coupon: requested, discountThb: res.discountThb };
            }
          }
        }
        if (!bestCoupon) {
          bestCoupon = selectBestEligibleCoupon(coupons, base.roomSubtotalThb);
        }

        const pricing = calculateStayPricing({
          room,
          checkInDate,
          checkOutDate,
          guests,
          overrides: dateOverrides,
          coupon: bestCoupon?.coupon ?? null,
          discountRules,
        });

        return { room, pricing, bestCoupon };
      })
      .sort((a, b) => a.pricing.netTotalThb - b.pricing.netTotalThb);
  }, [
    availableRooms,
    checkInDate,
    checkOutDate,
    guests,
    dateOverrides,
    coupons,
    discountRules,
    initialCouponCode,
  ]);

  const [pickedRoomId, setPickedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const preferred =
      initialSelectedRoomId &&
      pricedRooms.some((entry) => entry.room.id === initialSelectedRoomId)
        ? initialSelectedRoomId
        : pricedRooms[0]?.room.id ?? null;
    setPickedRoomId(preferred);
  }, [isOpen, initialSelectedRoomId, pricedRooms]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const activeEntry = useMemo(
    () =>
      pricedRooms.find((e) => e.room.id === pickedRoomId) ??
      pricedRooms[0] ??
      null,
    [pricedRooms, pickedRoomId]
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "เลือกห้องพัก" : "Choose your room"}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] bg-black/50 flex items-end md:items-center justify-center animate-fade-in-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[560px] max-h-[90dvh] rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet"
      >
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Sticky Header */}
        <div className="px-5 pt-3.5 pb-3.5 border-b border-[var(--color-border)] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {isTh ? "เลือกห้องพัก" : "Choose your room"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              <span>
                {formatShortDate(checkInDate, language)} –{" "}
                {formatShortDate(checkOutDate, language)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {guests} {isTh ? "ท่าน" : guests === 1 ? "guest" : "guests"}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDatePicker();
                }}
                className="font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer hover:opacity-75"
              >
                {isTh ? "เปลี่ยนวัน" : "Edit dates"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Available Rooms List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 overscroll-contain">
          {pricedRooms.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                {isTh
                  ? "ไม่มีห้องว่างในช่วงวันที่เลือก"
                  : "No rooms available for these dates"}
              </p>
              <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                {isTh
                  ? "ลองเปลี่ยนวันเข้าพักหรือลดจำนวนผู้เข้าพักเพื่อดูห้องที่ว่าง"
                  : "Try selecting different dates or adjusting guests."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDatePicker();
                }}
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors"
              >
                {isTh ? "เปลี่ยนวันเข้าพัก" : "Change dates"}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {pricedRooms.map(({ room, pricing }) => {
                const isSelected = activeEntry?.room.id === room.id;
                const roomThumb = room.galleryUrls[0] || fallbackCoverUrl;

                return (
                  <div key={room.id} className="py-2.5 first:pt-1 last:pb-1">
                    <div
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => setPickedRoomId(room.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPickedRoomId(room.id);
                        }
                      }}
                      className={`w-full rounded-[14px] p-2.5 flex items-center gap-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[var(--color-background-muted)] ring-2 ring-[var(--color-text-primary)]"
                          : "bg-transparent hover:bg-[var(--color-background-muted)]/60"
                      }`}
                    >
                      {/* Room Thumbnail with bottom-left ↗ expand detail button */}
                      <div className="relative w-[104px] sm:w-[120px] aspect-[4/3] rounded-[10px] overflow-hidden bg-[var(--color-background-subtle)] shrink-0">
                        <img
                          src={getOptimizedPinImageUrl(roomThumb, "thumb")}
                          srcSet={getOptimizedPinImageSrcSet(roomThumb, "thumb")}
                          sizes="120px"
                          alt={isTh ? room.nameTh : room.nameEn}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectRoom(room);
                          }}
                          aria-label={
                            isTh
                              ? `ดูรายละเอียดห้อง ${room.nameTh}`
                              : `View ${room.nameEn} details`
                          }
                          className="absolute bottom-1.5 left-1.5 h-7 w-7 rounded-[8px] bg-white/95 dark:bg-[#222222]/95 text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Room Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-snug">
                          {isTh ? room.nameTh : room.nameEn}
                        </p>
                        <p className="text-[13px] text-[var(--color-text-secondary)] truncate">
                          {isTh
                            ? `${room.beds} เตียง · สูงสุด ${room.maxGuests} ท่าน`
                            : `${room.beds} ${
                                room.beds === 1 ? "bed" : "beds"
                              } · ${room.maxGuests} ${
                                room.maxGuests === 1 ? "guest" : "guests"
                              }`}
                          {room.availableUnits <= 2 &&
                            (isTh
                              ? ` · เหลือ ${room.availableUnits} ห้อง`
                              : ` · ${room.availableUnits} left`)}
                        </p>
                        <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] pt-0.5 tabular-nums">
                          ฿{pricing.netTotalThb.toLocaleString()}
                          <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">
                            {" "}
                            {isTh
                              ? `สำหรับ ${stayNights} คืน`
                              : `for ${stayNights} ${
                                  stayNights === 1 ? "night" : "nights"
                                }`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer: Selected Room Price + Next CTA */}
        {activeEntry && (
          <div className="shrink-0 px-5 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-[var(--color-background-popover)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-border-emphasized)] underline-offset-2 tabular-nums leading-tight">
                ฿{activeEntry.pricing.netTotalThb.toLocaleString()}
              </p>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate mt-0.5">
                {isTh
                  ? `สำหรับ ${stayNights} คืน · ${formatShortDate(
                      checkInDate,
                      language
                    )} – ${formatShortDate(checkOutDate, language)}`
                  : `for ${stayNights} ${
                      stayNights === 1 ? "night" : "nights"
                    } · ${formatShortDate(
                      checkInDate,
                      language
                    )} – ${formatShortDate(checkOutDate, language)}`}
              </p>
              {activeEntry.pricing.discountThb > 0 &&
                (activeEntry.pricing.appliedCouponCode ||
                  activeEntry.pricing.appliedAutoDiscountLabel) && (
                  <p className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-text-primary)] bg-[var(--color-background-muted)] px-2 py-0.5 rounded-[6px] mt-1">
                    <Tag className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {isTh
                        ? `ลดแล้ว ฿${activeEntry.pricing.discountThb.toLocaleString()} (${
                            activeEntry.pricing.appliedCouponCode ||
                            activeEntry.pricing.appliedAutoDiscountLabel
                          })`
                        : `Saved ฿${activeEntry.pricing.discountThb.toLocaleString()}`}
                    </span>
                  </p>
                )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmRoom(activeEntry.room);
              }}
              className="h-12 px-8 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold shrink-0 cursor-pointer transition-colors"
            >
              {isTh ? "ถัดไป" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
