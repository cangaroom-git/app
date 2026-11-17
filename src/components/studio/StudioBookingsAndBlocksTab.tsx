"use client";

import React, { useState } from "react";
import { CalendarOff, Check, Trash2, X } from "lucide-react";
import { formatShortDate } from "@/lib/dateFormatters";
import { StandardButton, StatusPill } from "@/components/ui/standards";
import type { StudioPayload } from "@/components/studio/studioTypes";

export function StudioBookingsAndBlocksTab({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [blockRoomId, setBlockRoomId] = useState(data.rooms[0]?.id || "");
  const [blockDateStr, setBlockDateStr] = useState("");
  const [blockUnits, setBlockUnits] = useState(1);
  const [blockNote, setBlockNote] = useState("รับจองผ่าน LINE / Walk-in");
  const [busyId, setBusyId] = useState<string | null>(null);

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
          hotelSlug: data.hotel.slug,
          bookingId,
          status,
        }),
      });
      if (res.ok) {
        onNotify(`อัปเดตสถานะใบจองเป็น ${status} แล้ว`);
        await onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockRoomId || !blockDateStr) return;
    const res = await fetch("/api/studio/date-overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelSlug: data.hotel.slug,
        roomId: blockRoomId,
        dateStr: blockDateStr,
        blockedUnits: Number(blockUnits),
        note: blockNote,
      }),
    });
    if (res.ok) {
      setBlockDateStr("");
      onNotify("ปิดโควตาห้องในวันที่เลือกแล้ว");
      await onReload();
    }
  };

  const handleDeleteBlock = async (id: string) => {
    await fetch(
      `/api/studio/date-overrides?id=${encodeURIComponent(
        id
      )}&hotel=${encodeURIComponent(data.hotel.slug)}`,
      { method: "DELETE" }
    );
    await onReload();
  };

  return (
    <div className="space-y-8">
      {/* 1. Bookings List */}
      <section className="space-y-3">
        <h2 className="ty-title">
          รายการจอง & ตรวจสลิป ({data.bookings.length})
        </h2>

        {data.bookings.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-8 text-center ty-body">
            ยังไม่มีรายการจองสำหรับที่พักนี้
          </div>
        ) : (
          <div className="space-y-3">
            {data.bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col md:flex-row justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono ty-body font-bold">
                      #{b.bookingCode}
                    </span>
                    <span className="badge-accent">{b.roomCode}</span>
                    <StatusPill
                      variant={
                        b.status === "CONFIRMED" || b.status === "COMPLETED"
                          ? "success"
                          : b.status === "CANCELLED"
                          ? "error"
                          : "warning"
                      }
                    >
                      {b.status}
                    </StatusPill>
                  </div>
                  <p className="ty-body font-semibold">
                    {b.guestName} · {b.guestPhone}{" "}
                    {b.guestLine ? `· LINE: ${b.guestLine}` : ""}
                  </p>
                  <p className="ty-caption">
                    เข้าพัก {formatShortDate(b.checkInDate, "th")} →{" "}
                    {formatShortDate(b.checkOutDate, "th")} ({b.nights} คืน ·{" "}
                    {b.guests} ท่าน) · ยอดสุทธิ{" "}
                    <strong className="text-[var(--color-accent)]">
                      ฿{b.netTotalThb.toLocaleString()}
                    </strong>
                    {b.couponCode ? ` (ใช้โค้ด ${b.couponCode})` : ""}
                  </p>
                  {b.guestNote && (
                    <p className="ty-caption">หมายเหตุ: {b.guestNote}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {b.slipImageUrl && (
                    <a
                      href={b.slipImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-fw-secondary !h-9"
                    >
                      ดูรูปสลิป
                    </a>
                  )}

                  {(b.status === "PENDING_VERIFICATION" ||
                    b.status === "HOLD_PENDING_PAYMENT") && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => handleBookingStatus(b.id, "CONFIRMED")}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-success)] text-white ty-caption font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>ยืนยันจอง</span>
                    </button>
                  )}

                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => handleBookingStatus(b.id, "CANCELLED")}
                      className="h-9 px-3 rounded-full bg-[var(--color-error-muted)] text-[var(--color-error)] ty-caption font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>ยกเลิก/คืนห้อง</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Quick Room Date Blocker (Prevent Double-Booking from Walk-in / LINE) */}
      <section className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4">
        <h2 className="ty-subtitle font-bold flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-[var(--color-accent)]" />
          <span>ปิดห้องด่วน (กรณีรับลูกค้าจากช่องทางอื่น / ปิดซ่อม)</span>
        </h2>

        <form
          onSubmit={handleAddBlock}
          className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
        >
          <div>
            <label className="ty-caption block mb-1">ห้องพัก</label>
            <select
              value={blockRoomId}
              onChange={(e) => setBlockRoomId(e.target.value)}
              className="fw-input w-full"
            >
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.nameTh}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ty-caption block mb-1">คืนวันที่</label>
            <input
              type="date"
              required
              value={blockDateStr}
              onChange={(e) => setBlockDateStr(e.target.value)}
              className="fw-input w-full"
            />
          </div>

          <div>
            <label className="ty-caption block mb-1">จำนวนห้องที่ปิด</label>
            <input
              type="number"
              min={1}
              max={20}
              value={blockUnits}
              onChange={(e) => setBlockUnits(Number(e.target.value))}
              className="fw-input w-full"
            />
          </div>

          <div>
            <label className="ty-caption block mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              className="fw-input w-full"
            />
          </div>

          <StandardButton type="submit" variant="primary" size="md">
            ปิดคิววันที่เลือก
          </StandardButton>
        </form>

        {data.dateOverrides.length > 0 && (
          <div className="space-y-2 pt-2">
            {data.dateOverrides.map((ov) => {
              const r = data.rooms.find((rm) => rm.id === ov.roomId);
              return (
                <div
                  key={ov.id}
                  className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2 flex items-center justify-between ty-caption"
                >
                  <span>
                    <strong>{r?.code || "Room"}</strong> · วันที่{" "}
                    <strong>{ov.dateStr}</strong> · ปิด {ov.blockedUnits} ห้อง (
                    {ov.note || "ไม่ระบุ"})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(ov.id)}
                    className="text-[var(--color-error)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

