"use client";

import React, { useMemo, useState } from "react";
import {
  Bookmark,
  CalendarCheck,
  Check,
  CheckCheck,
  ExternalLink,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import {
  addDaysToDate,
  calculateStayPricing,
  formatDateStr,
} from "@/lib/bookingMath";
import { formatShortDate } from "@/lib/dateFormatters";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardStepperRow,
} from "@/components/ui/standards";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
import type { BookingSummaryDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

type BookingFilterTab = "pending" | "today" | "upcoming" | "all";

const STATUS_LABELS: Record<string, string> = {
  HOLD_PENDING_PAYMENT: "รอโอนเงิน",
  PENDING_VERIFICATION: "รอตรวจสลิป",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "เข้าพักเสร็จสิ้น",
  CANCELLED: "ยกเลิกแล้ว",
};

export function StudioTodayTab({
  data,
  onReload,
  onNotify,
  onNavigateTab,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
  onNavigateTab: (tab: "today" | "calendar" | "property" | "growth") => void;
}) {
  const { hotel, stats, bookings, rooms, dateOverrides } = data;
  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  const [filterTab, setFilterTab] = useState<BookingFilterTab>(() =>
    stats.pendingBookingsCount > 0 ? "pending" : "upcoming"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [slipPreviewBooking, setSlipPreviewBooking] =
    useState<BookingSummaryDto | null>(null);

  // Manual Walk-in / LINE Booking Sheet state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRoomId, setManualRoomId] = useState(rooms[0]?.id || "");
  const [manualCheckIn, setManualCheckIn] = useState(todayStr);
  const [manualCheckOut, setManualCheckOut] = useState(() =>
    addDaysToDate(todayStr, 1)
  );
  const [manualGuests, setManualGuests] = useState(2);
  const [manualUnits, setManualUnits] = useState(1);
  const [manualGuestName, setManualGuestName] = useState("");
  const [manualGuestPhone, setManualGuestPhone] = useState("");
  const [manualGuestLine, setManualGuestLine] = useState("");
  const [manualSource, setManualSource] = useState("LINE");
  const [manualCustomTotal, setManualCustomTotal] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const selectedManualRoom = useMemo(
    () => rooms.find((r) => r.id === manualRoomId) ?? rooms[0] ?? null,
    [rooms, manualRoomId]
  );

  const suggestedManualTotal = useMemo(() => {
    if (!selectedManualRoom || !manualCheckIn || !manualCheckOut) return 0;
    if (manualCheckIn >= manualCheckOut) return selectedManualRoom.weekdayPriceThb;
    const calc = calculateStayPricing({
      room: {
        ...selectedManualRoom,
        hotelId: hotel.id,
        availableUnits: selectedManualRoom.totalUnits,
        heldUnits: 0,
      },
      checkInDate: manualCheckIn,
      checkOutDate: manualCheckOut,
      guests: manualGuests,
      unitsBooked: manualUnits,
      overrides: dateOverrides,
    });
    return calc.roomSubtotalThb;
  }, [
    selectedManualRoom,
    hotel.id,
    manualCheckIn,
    manualCheckOut,
    manualGuests,
    manualUnits,
    dateOverrides,
  ]);

  const counts = useMemo(() => {
    const pending = bookings.filter(
      (b) =>
        b.status === "PENDING_VERIFICATION" ||
        b.status === "HOLD_PENDING_PAYMENT"
    ).length;
    const todayCheckIn = bookings.filter(
      (b) =>
        b.status === "CONFIRMED" &&
        b.checkInDate.slice(0, 10) === todayStr
    ).length;
    const upcoming = bookings.filter(
      (b) =>
        (b.status === "CONFIRMED" || b.status === "PENDING_VERIFICATION") &&
        b.checkOutDate.slice(0, 10) >= todayStr
    ).length;
    return { pending, todayCheckIn, upcoming, all: bookings.length };
  }, [bookings, todayStr]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (filterTab === "pending") {
        if (
          b.status !== "PENDING_VERIFICATION" &&
          b.status !== "HOLD_PENDING_PAYMENT"
        ) {
          return false;
        }
      } else if (filterTab === "today") {
        if (
          b.status !== "CONFIRMED" ||
          b.checkInDate.slice(0, 10) !== todayStr
        ) {
          return false;
        }
      } else if (filterTab === "upcoming") {
        if (
          (b.status !== "CONFIRMED" && b.status !== "PENDING_VERIFICATION") ||
          b.checkOutDate.slice(0, 10) < todayStr
        ) {
          return false;
        }
      }

      if (!q) return true;
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        b.roomCode.toLowerCase().includes(q) ||
        b.roomNameTh.toLowerCase().includes(q)
      );
    });
  }, [bookings, filterTab, searchQuery, todayStr]);

  const handleBookingStatus = async (
    bookingId: string,
    status: "CONFIRMED" | "CANCELLED" | "COMPLETED"
  ) => {
    setBusyId(bookingId);
    try {
      const res = await fetch("/api/studio/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          bookingId,
          status,
        }),
      });
      if (res.ok) {
        onNotify(
          status === "CONFIRMED"
            ? "ยืนยันการจองและส่งสิทธิ์ห้องพักแล้ว"
            : status === "COMPLETED"
            ? "บันทึกสถานะเช็กเอาต์เสร็จสิ้นแล้ว"
            : "ยกเลิกและคืนห้องพักเข้าระบบแล้ว"
        );
        if (slipPreviewBooking?.id === bookingId) {
          setSlipPreviewBooking(null);
        }
        await onReload();
      } else {
        onNotify("อัปเดตสถานะไม่สำเร็จ");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoomId || !manualGuestName.trim() || !manualGuestPhone.trim()) {
      onNotify("กรุณากรอกข้อมูลห้องพัก ชื่อแขก และเบอร์โทรศัพท์");
      return;
    }
    setIsSubmittingManual(true);
    try {
      const totalThb = manualCustomTotal.trim()
        ? Number(manualCustomTotal)
        : suggestedManualTotal;
      const res = await fetch("/api/studio/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          roomId: manualRoomId,
          checkInDate: manualCheckIn,
          checkOutDate: manualCheckOut,
          guests: Number(manualGuests),
          unitsBooked: Number(manualUnits),
          netTotalThb: Math.max(0, Math.round(totalThb)),
          guestName: manualGuestName.trim(),
          guestPhone: manualGuestPhone.trim(),
          guestLine: manualGuestLine.trim() || null,
          guestNote: manualNote.trim() || null,
          sourceLabel: manualSource,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกใบจองไม่สำเร็จ");
        return;
      }
      setIsManualModalOpen(false);
      setManualGuestName("");
      setManualGuestPhone("");
      setManualGuestLine("");
      setManualCustomTotal("");
      setManualNote("");
      onNotify("บันทึกการจองและตัดโควตาห้องบนปฏิทินแล้ว");
      await onReload();
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const filterOptions: Array<{
    id: BookingFilterTab;
    label: string;
    count: number;
  }> = [
    { id: "pending", label: "รอตรวจสลิป", count: counts.pending },
    { id: "today", label: "เช็กอินวันนี้", count: counts.todayCheckIn },
    { id: "upcoming", label: "กำลังจะเข้าพัก", count: counts.upcoming },
    { id: "all", label: "ทั้งหมด", count: counts.all },
  ];

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {/* 1. Minimalist ROI Summary Strip (Zero border fatigue, zero pastel boxes) */}
      <section className="pb-8 lg:pb-10 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              วันนี้ที่ {hotel.nameTh}
            </h1>
            <p className="text-[14.5px] text-[var(--color-text-secondary)]">
              ภาพรวมยอดจองตรง 0% GP และรายการที่ต้องจัดการประจำวัน
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!manualRoomId && rooms[0]) setManualRoomId(rooms[0].id);
              setIsManualModalOpen(true);
            }}
            disabled={rooms.length === 0}
            className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกการจอง Walk-in / LINE</span>
          </button>
        </div>

        {/* 3-Column Equal Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] bg-[var(--color-background-muted)] rounded-[16px]">
          <div className="p-5 space-y-1">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--color-text-secondary)]">
              <span>ยอดจองตรง 0% GP</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-text-primary)]" />
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums">
              ฿{stats.confirmedRevenueThb.toLocaleString()}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)]">
              ประหยัดค่า GP OTA แล้ว ~฿
              {stats.estimatedOtaGpSavedThb.toLocaleString()}
            </p>
          </div>

          <div className="p-5 space-y-1">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--color-text-secondary)]">
              <span>คนบันทึกเข้า /board</span>
              <Bookmark className="w-4 h-4 text-[var(--color-text-primary)]" />
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums">
              {stats.boardSavesCount.toLocaleString()} ครั้ง
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("growth")}
              className="text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer hover:opacity-75"
            >
              ออกคูปองกระตุ้นยอดจอง →
            </button>
          </div>

          <div className="p-5 space-y-1">
            <div className="flex items-center justify-between text-[13px] font-medium text-[var(--color-text-secondary)]">
              <span>ยอดคลิกทักตรง</span>
              <MessageCircle className="w-4 h-4 text-[var(--color-text-primary)]" />
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums">
              {stats.contactClicksTotal.toLocaleString()} ครั้ง
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)]">
              LINE {stats.contactClicksByChannel.LINE} · FB{" "}
              {stats.contactClicksByChannel.FACEBOOK_MESSENGER} · โทร{" "}
              {stats.contactClicksByChannel.PHONE}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Filterable Reservations & Slip Verification */}
      <section className="py-8 lg:py-10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status filter pills (Squircle, monochrome hierarchy) */}
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar pb-0.5">
            {filterOptions.map((opt) => {
              const active = filterTab === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterTab(opt.id)}
                  className={`h-10 px-4 rounded-[12px] text-[13.5px] font-semibold whitespace-nowrap inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    active
                      ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.count > 0 && (
                    <span
                      className={`text-[12px] tabular-nums ${
                        active ? "opacity-80" : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Borderless search input */}
          <div className="relative flex items-center sm:w-[260px]">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อแขก / รหัสจอง..."
              className="w-full h-10 pl-9 pr-8 rounded-[12px] bg-[var(--color-background-muted)] border border-transparent focus:border-[var(--color-text-primary)] focus:bg-[var(--color-background-card)] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2.5 h-6 w-6 rounded-[8px] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bookings List (Zero border fatigue — divide-y rows) */}
        {filteredBookings.length === 0 ? (
          <div className="rounded-[16px] bg-[var(--color-background-muted)] py-12 px-6 text-center space-y-2.5">
            <CalendarCheck className="w-8 h-8 mx-auto text-[var(--color-text-secondary)]" strokeWidth={1.6} />
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {filterTab === "pending"
                ? "ไม่มีใบจองรอตรวจสลิปในขณะนี้"
                : filterTab === "today"
                ? "ไม่มีรายการเช็กอินในวันนี้"
                : "ไม่พบรายการจองที่ตรงกับเงื่อนไข"}
            </h3>
            <p className="text-[13.5px] text-[var(--color-text-secondary)]">
              หากมีลูกค้าจองผ่าน LINE หรือโทรศัพท์ สามารถกดบันทึกการจองเองเพื่อตัดโควตาห้องบนปฏิทินได้ทันที
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredBookings.map((b) => {
              const isPending =
                b.status === "PENDING_VERIFICATION" ||
                b.status === "HOLD_PENDING_PAYMENT";
              const isConfirmed = b.status === "CONFIRMED";
              const isFinished =
                b.status === "COMPLETED" || b.status === "CANCELLED";

              return (
                <article
                  key={b.id}
                  className="py-5 first:pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-[var(--color-text-primary)]">
                        #{b.bookingCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-[7px] bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-primary)]">
                        {b.roomCode} · {b.roomNameTh}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            b.status === "CONFIRMED" || b.status === "COMPLETED"
                              ? "bg-[var(--color-success)]"
                              : b.status === "CANCELLED"
                              ? "bg-[var(--color-error)]"
                              : "bg-[var(--color-warning)]"
                          }`}
                        />
                        <span>{STATUS_LABELS[b.status] || b.status}</span>
                      </span>
                    </div>

                    <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                      {b.guestName} ·{" "}
                      <a
                        href={`tel:${b.guestPhone}`}
                        className="underline underline-offset-2 font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        {b.guestPhone}
                      </a>
                      {b.guestLine ? ` · LINE: ${b.guestLine}` : ""}
                    </p>

                    <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                      {formatShortDate(b.checkInDate, "th")} →{" "}
                      {formatShortDate(b.checkOutDate, "th")} ({b.nights} คืน ·{" "}
                      {b.guests} ท่าน
                      {b.unitsBooked > 1 ? ` · ${b.unitsBooked} ห้อง` : ""}) ·{" "}
                      <strong className="text-[var(--color-text-primary)] tabular-nums">
                        ฿{b.netTotalThb.toLocaleString()}
                      </strong>
                      {b.couponCode ? ` (โค้ด ${b.couponCode})` : ""}
                    </p>

                    {b.guestNote && (
                      <p className="text-[13px] text-[var(--color-text-secondary)]">
                        หมายเหตุ: {b.guestNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {b.slipImageUrl && (
                      <button
                        type="button"
                        onClick={() => setSlipPreviewBooking(b)}
                        className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>ตรวจสลิป</span>
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => handleBookingStatus(b.id, "CONFIRMED")}
                        className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>ยืนยันจอง</span>
                      </button>
                    )}

                    {isConfirmed && (
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => handleBookingStatus(b.id, "COMPLETED")}
                        className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>เช็กเอาต์แล้ว</span>
                      </button>
                    )}

                    {!isFinished && (
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => handleBookingStatus(b.id, "CANCELLED")}
                        className="h-9 px-3 rounded-[10px] text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ยกเลิก</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Slip Verification Lightbox Modal (Side-by-side amount check + 1-click confirm) */}
      <StudioSheetModal
        isOpen={Boolean(slipPreviewBooking)}
        onClose={() => setSlipPreviewBooking(null)}
        title={
          slipPreviewBooking
            ? `ตรวจสลิป #${slipPreviewBooking.bookingCode}`
            : "ตรวจสลิปโอนเงิน"
        }
        subtitle={
          slipPreviewBooking
            ? `${slipPreviewBooking.guestName} · ยอดที่ต้องได้รับ ฿${slipPreviewBooking.netTotalThb.toLocaleString()}`
            : undefined
        }
        maxWidthClass="md:max-w-[680px]"
        footer={
          slipPreviewBooking && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  ยอดโอนสุทธิที่ต้องตรงกับสลิป
                </p>
                <p className="text-[20px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  ฿{slipPreviewBooking.netTotalThb.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {slipPreviewBooking.status !== "CANCELLED" &&
                  slipPreviewBooking.status !== "COMPLETED" && (
                    <button
                      type="button"
                      disabled={busyId === slipPreviewBooking.id}
                      onClick={() =>
                        handleBookingStatus(slipPreviewBooking.id, "CANCELLED")
                      }
                      className="h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-error)] cursor-pointer transition-colors"
                    >
                      ปฏิเสธ / คืนห้อง
                    </button>
                  )}
                {(slipPreviewBooking.status === "PENDING_VERIFICATION" ||
                  slipPreviewBooking.status === "HOLD_PENDING_PAYMENT") && (
                  <button
                    type="button"
                    disabled={busyId === slipPreviewBooking.id}
                    onClick={() =>
                      handleBookingStatus(slipPreviewBooking.id, "CONFIRMED")
                    }
                    className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>ยอดตรง · ยืนยันจอง</span>
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {slipPreviewBooking?.slipImageUrl && (
          <div className="space-y-4">
            <div className="rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center max-h-[55dvh]">
              <img
                src={slipPreviewBooking.slipImageUrl}
                alt={`Slip ${slipPreviewBooking.bookingCode}`}
                className="max-h-[55dvh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-[13px] text-[var(--color-text-secondary)]">
              <span>
                ห้อง {slipPreviewBooking.roomCode} ·{" "}
                {formatShortDate(slipPreviewBooking.checkInDate, "th")} –{" "}
                {formatShortDate(slipPreviewBooking.checkOutDate, "th")}
              </span>
              <a
                href={slipPreviewBooking.slipImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--color-text-primary)] underline underline-offset-2 inline-flex items-center gap-1"
              >
                <span>เปิดภาพขนาดเต็ม</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </StudioSheetModal>

      {/* Manual Walk-in / LINE Booking Sheet */}
      <StudioSheetModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="บันทึกการจองเอง (Walk-in / LINE / โทร)"
        subtitle="ตัดโควตาห้องว่างบนปฏิทินอัตโนมัติ ป้องกันจองซ้ำ"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="h-11 px-5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="manual-booking-form"
              disabled={isSubmittingManual}
              className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmittingManual ? "กำลังบันทึก..." : "บันทึกการจอง"}
            </button>
          </div>
        }
      >
        <form
          id="manual-booking-form"
          onSubmit={handleCreateManualBooking}
          className="divide-y divide-[var(--color-border)]"
        >
          <section className="pb-6 space-y-4">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              ห้องพักและวันเข้าพัก
            </h3>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardSelectField
                  grouped
                  label="เลือกประเภทห้องพัก *"
                  value={manualRoomId}
                  onChange={setManualRoomId}
                  sheetTitle="เลือกประเภทห้องพัก"
                  options={rooms.map((r) => ({
                    value: r.id,
                    label: `${r.code} · ${r.nameTh}`,
                    sublabel: `฿${r.weekdayPriceThb.toLocaleString()}/คืน · ${r.totalUnits} ยูนิต`,
                  }))}
                />
                <StandardSelectField
                  grouped
                  label="ช่องทางจอง"
                  value={manualSource}
                  onChange={setManualSource}
                  sheetTitle="เลือกช่องทางจอง"
                  options={[
                    { value: "LINE", label: "LINE OA" },
                    { value: "Walk-in", label: "Walk-in หน้าเคาน์เตอร์" },
                    { value: "Phone", label: "โทรศัพท์" },
                    { value: "Facebook", label: "Facebook Inbox" },
                    { value: "OTA", label: "ช่องทาง OTA อื่น" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="วันเช็กอิน *"
                  type="date"
                  required
                  value={manualCheckIn}
                  onChange={(e) => {
                    const nextIn = e.target.value;
                    setManualCheckIn(nextIn);
                    if (nextIn >= manualCheckOut) {
                      setManualCheckOut(addDaysToDate(nextIn, 1));
                    }
                  }}
                />
                <StandardInput
                  grouped
                  label="วันเช็กเอาต์ *"
                  type="date"
                  required
                  value={manualCheckOut}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                />
              </div>
            </StandardFieldGroup>

            <div className="divide-y divide-[var(--color-border-subtle)]">
              <StandardStepperRow
                label="จำนวนผู้เข้าพัก (ท่าน)"
                value={manualGuests}
                min={1}
                max={30}
                onChange={setManualGuests}
              />
              <StandardStepperRow
                label="จำนวนห้อง (ยูนิต)"
                value={manualUnits}
                min={1}
                max={selectedManualRoom?.totalUnits ?? 20}
                onChange={setManualUnits}
              />
            </div>
          </section>

          <section className="pt-6 space-y-4">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              ข้อมูลผู้เข้าพักและยอดเงิน
            </h3>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="ชื่อผู้เข้าพัก *"
                  required
                  placeholder="เช่น คุณสมชาย ใจดี"
                  value={manualGuestName}
                  onChange={(e) => setManualGuestName(e.target.value)}
                />
                <StandardInput
                  grouped
                  label="เบอร์โทรศัพท์ *"
                  required
                  placeholder="08X-XXX-XXXX"
                  value={manualGuestPhone}
                  onChange={(e) => setManualGuestPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="ยอดเงินสุทธิ (฿)"
                  optionalText={`อัตโนมัติ ฿${suggestedManualTotal.toLocaleString()}`}
                  prefixText="฿"
                  type="number"
                  min={0}
                  placeholder={String(suggestedManualTotal)}
                  value={manualCustomTotal}
                  onChange={(e) => setManualCustomTotal(e.target.value)}
                  className="font-semibold tabular-nums"
                />
                <StandardInput
                  grouped
                  label="LINE ID ผู้เข้าพัก"
                  optionalText="ไม่บังคับ"
                  value={manualGuestLine}
                  onChange={(e) => setManualGuestLine(e.target.value)}
                />
              </div>
            </StandardFieldGroup>

            <StandardInput
              label="หมายเหตุเพิ่มเติม"
              optionalText="ไม่บังคับ"
              placeholder="เช่น โอนมัดจำแล้ว 50%, ขอเตียงเสริม"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
            />
          </section>
        </form>
      </StudioSheetModal>
    </div>
  );
}
