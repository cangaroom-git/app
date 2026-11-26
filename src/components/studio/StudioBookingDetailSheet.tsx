"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  CheckCheck,
  ExternalLink,
  Phone,
  Receipt,
  User,
  X,
} from "lucide-react";
import { AdminSlideSheet } from "@/components/admin/ui/AdminSlideSheet";
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
import type { BookingSummaryDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

const STATUS_LABELS: Record<string, string> = {
  HOLD_PENDING_PAYMENT: "รอโอนเงิน",
  PENDING_VERIFICATION: "รอตรวจสลิป",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "เข้าพักเสร็จสิ้น",
  CANCELLED: "ยกเลิกแล้ว",
};

interface StudioBookingDetailSheetProps {
  booking: BookingSummaryDto | null;
  hotelSlug: string;
  onClose: () => void;
  onUpdated: (message: string) => void;
}

/**
 * Click-Row Slide-Over Booking & Slip Verification Sheet (`max-w-4xl`)
 */
export function StudioBookingDetailSheet({
  booking,
  hotelSlug,
  onClose,
  onUpdated,
}: StudioBookingDetailSheetProps) {
  const [busy, setBusy] = useState(false);

  const handleStatus = async (status: "CONFIRMED" | "CANCELLED" | "COMPLETED") => {
    if (!booking) return;
    setBusy(true);
    try {
      const res = await fetch("/api/studio/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug,
          bookingId: booking.id,
          status,
        }),
      });
      if (!res.ok) {
        onUpdated("อัปเดตสถานะการจองไม่สำเร็จ");
        return;
      }
      onUpdated(
        status === "CONFIRMED"
          ? `ยืนยันใบจอง #${booking.bookingCode} เรียบร้อยแล้ว`
          : status === "COMPLETED"
            ? `บันทึกเช็กเอาต์ #${booking.bookingCode} แล้ว`
            : `ยกเลิกใบจอง #${booking.bookingCode} และคืนโควตาห้องแล้ว`,
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const isPending =
    booking?.status === "PENDING_VERIFICATION" ||
    booking?.status === "HOLD_PENDING_PAYMENT";
  const isConfirmed = booking?.status === "CONFIRMED";
  const isFinished =
    booking?.status === "COMPLETED" || booking?.status === "CANCELLED";

  const footerAction = booking ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {!isFinished && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStatus("CANCELLED")}
            className="ws-body-strong !text-red-600 hover:!text-red-700 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>ปฏิเสธ / คืนห้อง</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
        >
          ปิด
        </button>
        {isPending && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStatus("CONFIRMED")}
            className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>ยอดตรง · ยืนยันจอง</span>
          </button>
        )}
        {isConfirmed && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStatus("COMPLETED")}
            className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>เช็กเอาต์แล้ว</span>
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <AdminSlideSheet
      isOpen={Boolean(booking)}
      onClose={onClose}
      title={booking ? `ใบจอง #${booking.bookingCode}` : "รายละเอียดใบจอง"}
      subtitle={
        booking
          ? `${booking.guestName} · ยอดโอนสุทธิ ฿${booking.netTotalThb.toLocaleString()}`
          : undefined
      }
      footerAction={footerAction}
    >
      {booking && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest & Stay Summary */}
            <div className="space-y-3">
              <p className="ws-subtitle">ข้อมูลผู้เข้าพักและการจอง</p>

              <div className="divide-y divide-[var(--color-border)] ws-body">
                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption">สถานะ</span>
                  <span
                    className={`px-2.5 py-1 rounded-full ws-badge ${
                      isPending
                        ? "bg-[var(--color-accent-yellow)] text-[#182334]"
                        : isConfirmed || booking.status === "COMPLETED"
                          ? "bg-[#edf5fd] text-[var(--color-accent)]"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {STATUS_LABELS[booking.status] || booking.status}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> ชื่อผู้เข้าพัก
                  </span>
                  <span className="ws-body-strong">{booking.guestName}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> เบอร์โทร
                  </span>
                  <a
                    href={`tel:${booking.guestPhone}`}
                    className="ws-body-strong !text-[var(--color-accent)] underline underline-offset-2"
                  >
                    {booking.guestPhone}
                  </a>
                </div>

                {booking.guestLine && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="ws-caption">LINE ID</span>
                    <span className="ws-body-medium">{booking.guestLine}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption inline-flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5" /> ห้องพัก
                  </span>
                  <span className="ws-body-strong">
                    {booking.roomCode} · {booking.roomNameTh}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption">เข้าพัก</span>
                  <span className="ws-body-medium">
                    {formatShortDate(booking.checkInDate, "th")} →{" "}
                    {formatShortDate(booking.checkOutDate, "th")} (
                    {booking.nights} คืน)
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="ws-caption">จำนวน</span>
                  <span className="ws-body-medium">
                    {booking.guests} ท่าน · {booking.unitsBooked} ห้อง
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="ws-subtitle">ยอดโอนสุทธิ (0% GP)</span>
                  <span className="ws-title !text-[var(--color-accent)] tabular-nums">
                    ฿{booking.netTotalThb.toLocaleString()}
                  </span>
                </div>

                {booking.guestNote && (
                  <div className="pt-3">
                    <p className="ws-caption mb-1.5">หมายเหตุจากแขก</p>
                    <p className="ws-body bg-[var(--color-background-muted)] rounded-[14px] p-3">
                      {booking.guestNote}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Slip Verification Viewer */}
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="ws-subtitle inline-flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>สลิปโอนเงิน PromptPay</span>
                </p>
                {booking.slipImageUrl && (
                  <a
                    href={booking.slipImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[var(--color-accent)] inline-flex items-center gap-1 hover:underline"
                  >
                    <span>เปิดภาพเต็ม</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {booking.slipImageUrl ? (
                <div className="rounded-xl overflow-hidden bg-white flex items-center justify-center flex-1 min-h-[280px] max-h-[55vh] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={booking.slipImageUrl}
                    alt={`Slip ${booking.bookingCode}`}
                    className="max-h-[52vh] w-auto object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-white flex-1 min-h-[240px] flex flex-col items-center justify-center text-center p-6 text-gray-400 gap-2">
                  <Receipt className="w-8 h-8" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-gray-500">
                    ยังไม่มีรูปสลิปแนบ (หรือเป็นการจอง Walk-in / LINE)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminSlideSheet>
  );
}

interface StudioManualBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  data: StudioPayload;
  onCreated: (message: string) => void;
}

/**
 * Walk-in / LINE / Phone Manual Booking Slide-Over Sheet (`max-w-4xl`)
 */
export function StudioManualBookingSheet({
  isOpen,
  onClose,
  data,
  onCreated,
}: StudioManualBookingSheetProps) {
  const { hotel, rooms, dateOverrides } = data;
  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  const [manualRoomId, setManualRoomId] = useState(rooms[0]?.id || "");
  const [manualCheckIn, setManualCheckIn] = useState(todayStr);
  const [manualCheckOut, setManualCheckOut] = useState(() =>
    addDaysToDate(todayStr, 1),
  );
  const [manualGuests, setManualGuests] = useState(2);
  const [manualUnits, setManualUnits] = useState(1);
  const [manualGuestName, setManualGuestName] = useState("");
  const [manualGuestPhone, setManualGuestPhone] = useState("");
  const [manualGuestLine, setManualGuestLine] = useState("");
  const [manualSource, setManualSource] = useState("LINE");
  const [manualCustomTotal, setManualCustomTotal] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === manualRoomId) ?? rooms[0] ?? null,
    [rooms, manualRoomId],
  );

  const suggestedTotal = useMemo(() => {
    if (!selectedRoom || !manualCheckIn || !manualCheckOut) return 0;
    if (manualCheckIn >= manualCheckOut) return selectedRoom.weekdayPriceThb;
    const calc = calculateStayPricing({
      room: {
        ...selectedRoom,
        hotelId: hotel.id,
        availableUnits: selectedRoom.totalUnits,
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
    selectedRoom,
    hotel.id,
    manualCheckIn,
    manualCheckOut,
    manualGuests,
    manualUnits,
    dateOverrides,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = manualRoomId || rooms[0]?.id;
    if (!roomId || !manualGuestName.trim() || !manualGuestPhone.trim()) {
      setErrorMsg("กรุณากรอกห้องพัก ชื่อแขก และเบอร์โทรศัพท์");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const totalThb = manualCustomTotal.trim()
        ? Number(manualCustomTotal)
        : suggestedTotal;
      const res = await fetch("/api/studio/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          roomId,
          checkInDate: manualCheckIn,
          checkOutDate: manualCheckOut,
          guests: manualGuests,
          unitsBooked: manualUnits,
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
        setErrorMsg(json.error || "บันทึกใบจองไม่สำเร็จ");
        return;
      }
      setManualGuestName("");
      setManualGuestPhone("");
      setManualGuestLine("");
      setManualCustomTotal("");
      setManualNote("");
      onCreated("บันทึกการจองและตัดโควตาห้องบนปฏิทินแล้ว");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminSlideSheet
      isOpen={isOpen}
      onClose={onClose}
      title="บันทึกการจอง Walk-in / LINE"
      subtitle="ตัดโควตาห้องว่างบนปฏิทินอัตโนมัติ ป้องกันจองซ้ำ"
      footerAction={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="studio-manual-booking-form"
            disabled={isSubmitting}
            className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการจอง"}
          </button>
        </div>
      }
    >
      <form
        id="studio-manual-booking-form"
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto p-5 space-y-6 bg-white"
      >
        {errorMsg && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <section className="space-y-4">
          <p className="ws-subtitle">ห้องพักและวันเข้าพัก</p>

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardSelectField
                grouped
                label="เลือกประเภทห้องพัก *"
                value={manualRoomId || rooms[0]?.id || ""}
                onChange={setManualRoomId}
                sheetTitle="เลือกประเภทห้องพัก"
                options={rooms.map((r) => ({
                  value: r.id,
                  label: `${r.code} · ${r.nameTh}`,
                  sublabel: `฿${r.weekdayPriceThb.toLocaleString()} / คืน`,
                }))}
              />
              <StandardSelectField
                grouped
                label="ช่องทางการจอง"
                value={manualSource}
                onChange={setManualSource}
                sheetTitle="ช่องทางการจอง"
                options={[
                  { value: "LINE", label: "LINE OA / แชท" },
                  { value: "PHONE", label: "โทรศัพท์" },
                  { value: "WALK_IN", label: "Walk-in หน้าเคาน์เตอร์" },
                  { value: "FACEBOOK", label: "Facebook / IG" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardInput
                grouped
                type="date"
                label="วันเช็กอิน *"
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
                type="date"
                label="วันเช็กเอาต์ *"
                value={manualCheckOut}
                min={addDaysToDate(manualCheckIn, 1)}
                onChange={(e) => setManualCheckOut(e.target.value)}
              />
            </div>
          </StandardFieldGroup>

          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            <StandardStepperRow
              label="จำนวนผู้เข้าพัก"
              value={manualGuests}
              min={1}
              max={selectedRoom?.maxGuests ?? 12}
              onChange={setManualGuests}
            />
            <StandardStepperRow
              label="จำนวนห้อง"
              value={manualUnits}
              min={1}
              max={selectedRoom?.totalUnits ?? 10}
              onChange={setManualUnits}
            />
          </div>
        </section>

        <section className="space-y-4">
          <p className="ws-subtitle">ข้อมูลผู้เข้าพักและยอดชำระ</p>

          <StandardFieldGroup>
            <StandardInput
              grouped
              label="ชื่อผู้เข้าพัก *"
              value={manualGuestName}
              onChange={(e) => setManualGuestName(e.target.value)}
              placeholder="เช่น คุณสมชาย ใจดี"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardInput
                grouped
                label="เบอร์โทรศัพท์ *"
                value={manualGuestPhone}
                onChange={(e) => setManualGuestPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
              />
              <StandardInput
                grouped
                label="LINE ID (ถ้ามี)"
                value={manualGuestLine}
                onChange={(e) => setManualGuestLine(e.target.value)}
                placeholder="@lineid"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardInput
                grouped
                type="number"
                label={`ยอดสุทธิ (บาท · แนะนำ ฿${suggestedTotal.toLocaleString()})`}
                value={manualCustomTotal}
                onChange={(e) => setManualCustomTotal(e.target.value)}
                placeholder={String(suggestedTotal)}
              />
              <StandardInput
                grouped
                label="หมายเหตุเพิ่มเติม"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="เช่น ขอเตียงเสริม, เช็กอินดึก"
              />
            </div>
          </StandardFieldGroup>
        </section>
      </form>
    </AdminSlideSheet>
  );
}
