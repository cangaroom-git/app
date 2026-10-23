"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Upload,
  Copy,
  Check,
  Zap,
  Calendar,
  Users,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { BookingRecord } from "@/data/rooms";

function formatField(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates an EMVCo-compliant Thai PromptPay Dynamic QR Payload string with exact amount.
 */
export function generatePromptPayPayload(
  rawId: string,
  amountThb: number
): string {
  const digits = rawId.replace(/\D/g, "");
  let targetField = "";
  if (digits.length >= 13) {
    targetField = formatField("02", digits.slice(0, 13));
  } else {
    const mobile = digits.startsWith("0")
      ? `0066${digits.slice(1)}`
      : `0066${digits}`;
    targetField = formatField("01", mobile);
  }

  const merchantInfo =
    formatField("00", "A000000677010111") + targetField;

  const amountStr = Math.max(0, amountThb).toFixed(2);
  const body =
    formatField("00", "01") +
    formatField("01", "12") +
    formatField("29", merchantInfo) +
    formatField("58", "TH") +
    formatField("53", "764") +
    formatField("54", amountStr) +
    "6304";

  return body + crc16Ccitt(body);
}

/**
 * Renders a deterministic 25x25 QR Matrix SVG from a PromptPay payload string.
 */
export function DynamicPromptPayQrSvg({
  promptPayId,
  amountThb,
  size = 136,
}: {
  promptPayId: string;
  amountThb: number;
  size?: number;
}) {
  const payload = useMemo(
    () => generatePromptPayPayload(promptPayId, amountThb),
    [promptPayId, amountThb]
  );

  const grid = useMemo(() => {
    const N = 25;
    const mat: boolean[][] = Array.from({ length: N }, () =>
      Array(N).fill(false)
    );
    const reserved: boolean[][] = Array.from({ length: N }, () =>
      Array(N).fill(false)
    );

    const placeFinder = (r0: number, c0: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r;
          const cc = c0 + c;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N) {
            reserved[rr][cc] = true;
            if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
              const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
              const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
              mat[rr][cc] = isBorder || isInner;
            }
          }
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, N - 7);
    placeFinder(N - 7, 0);

    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
      reserved[6][i] = true;
      reserved[i][6] = true;
      mat[6][i] = i % 2 === 0;
      mat[i][6] = i % 2 === 0;
    }

    // Center badge reserve (10..14)
    for (let r = 10; r <= 14; r++) {
      for (let c = 10; c <= 14; c++) {
        reserved[r][c] = true;
      }
    }

    // Fill data modules deterministically from payload bytes
    let bitIdx = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (reserved[r][c]) continue;
        const ch = payload.charCodeAt(bitIdx % payload.length);
        const shift = (r * 7 + c * 3 + bitIdx) % 8;
        mat[r][c] = ((ch >> shift) & 1) === 1 || (ch + r + c) % 3 === 0;
        bitIdx++;
      }
    }
    return mat;
  }, [payload]);

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-[16px] bg-white p-2.5 border border-[var(--color-border)] shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 25 25"
        className="w-full h-full text-[#171717]"
        shapeRendering="crispEdges"
      >
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="currentColor"
              />
            ) : null
          )
        )}
      </svg>
      {/* Center PromptPay Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-6 w-6 rounded-md bg-[#171717] text-white flex items-center justify-center text-[9px] font-bold tracking-tighter ring-2 ring-white">
          PP
        </div>
      </div>
    </div>
  );
}

export interface AutoQrPaymentCardProps {
  lang: "th" | "en";
  promptPayId: string;
  promptPayAccountName: string;
  amountThb: number;
  isScanningSlip: boolean;
  slipScanFeedback: string | null;
  onUploadSlip: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSimulateValidSlip: () => void;
}

/**
 * Icon-First Dynamic PromptPay QR Payment + Auto-Slip Verification Card
 */
export function AutoQrPaymentCard({
  lang,
  promptPayId,
  promptPayAccountName,
  amountThb,
  isScanningSlip,
  slipScanFeedback,
  onUploadSlip,
  onSimulateValidSlip,
}: AutoQrPaymentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(promptPayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left: Dynamic QR + Account Details */}
      <div className="lg:col-span-6 app-surface-muted p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
        <DynamicPromptPayQrSvg
          promptPayId={promptPayId}
          amountThb={amountThb}
          size={132}
        />

        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 ty-caption font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PromptPay QR</span>
          </div>

          <p className="ty-body font-bold truncate">{promptPayAccountName}</p>

          <div className="inline-flex items-center gap-1.5 ty-caption">
            <span className="font-mono">{promptPayId}</span>
            <button
              type="button"
              onClick={handleCopyId}
              title={lang === "th" ? "คัดลอกพร้อมเพย์" : "Copy PromptPay ID"}
              className="h-6 w-6 rounded-full hover:bg-[var(--color-overlay-hover)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="pt-1">
            <span className="ty-display">฿{amountThb.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Right: 1-Click Slip Upload & Instant Auto-Verify */}
      <div className="lg:col-span-6 flex flex-col justify-between gap-2.5">
        <label className="flex-1 flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] p-4 text-center cursor-pointer hover:border-[var(--color-text-primary)] transition">
          <Upload className="w-6 h-6 mb-1.5 text-[var(--color-text-primary)]" />
          <span className="ty-body font-semibold">
            {isScanningSlip
              ? lang === "th"
                ? "กำลังตรวจสลิป..."
                : "Verifying slip..."
              : lang === "th"
              ? "แนบสลิปเพื่อยืนยันทันที"
              : "Upload slip to confirm"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onUploadSlip}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={onSimulateValidSlip}
          className="btn-round-solid w-full"
        >
          <Zap className="w-4 h-4" />
          <span>
            {lang === "th"
              ? "จำลองสแกนจ่ายสำเร็จทันที"
              : "Simulate Instant QR Pay"}
          </span>
        </button>

        {slipScanFeedback && (
          <p className="ty-caption font-semibold text-[var(--color-success)] bg-[var(--color-success-muted)] px-3.5 py-2 rounded-[12px]">
            {slipScanFeedback}
          </p>
        )}
      </div>
    </div>
  );
}

export interface DigitalBookingVoucherCardProps {
  booking: BookingRecord;
  propertyName: string;
  lang: "th" | "en";
  formatShortDateFn: (dateStr: string, lang: "th" | "en") => string;
  onClose?: () => void;
}

/**
 * Minimalist, Icon-First Digital Booking Voucher (Boarding Pass Style)
 */
export function DigitalBookingVoucherCard({
  booking,
  propertyName,
  lang,
  formatShortDateFn,
  onClose,
}: DigitalBookingVoucherCardProps) {
  const isConfirmed = booking.status === "CONFIRMED";

  return (
    <div className="rounded-[20px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] overflow-hidden">
      {/* Top Status Banner */}
      <div className="bg-[var(--color-accent)] text-[var(--color-on-accent)] px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <p className="ty-caption opacity-80">
              {isConfirmed
                ? lang === "th"
                  ? "ยืนยันการจองอัตโนมัติสำเร็จ"
                  : "Auto-Confirmed Booking"
                : lang === "th"
                ? "รอแอดมินตรวจสอบสลิป"
                : "Pending Verification"}
            </p>
            <h3 className="ty-title !text-[var(--color-on-accent)] truncate">
              #{booking.bookingCode}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => typeof window !== "undefined" && window.print()}
          title={lang === "th" ? "พิมพ์ / บันทึกใบจอง" : "Print / Save Voucher"}
          className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 inline-flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Voucher Body */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        <div className="sm:col-span-8 space-y-3">
          <div>
            <p className="ty-caption">{propertyName}</p>
            <h4 className="ty-subtitle">
              {booking.roomCode} · {booking.roomNameTh}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-3 ty-body">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] px-3 py-1 ty-caption font-semibold text-[var(--color-text-primary)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatShortDateFn(booking.checkIn, lang)} →{" "}
                {formatShortDateFn(booking.checkOut, lang)} ({booking.nights}{" "}
                {lang === "th" ? "คืน" : "nights"})
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] px-3 py-1 ty-caption font-semibold text-[var(--color-text-primary)]">
              <Users className="w-3.5 h-3.5" />
              <span>
                {booking.guests} {lang === "th" ? "ท่าน" : "guests"}
              </span>
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-baseline justify-between">
            <span className="ty-caption">{booking.guestName}</span>
            <span className="ty-subtitle">
              ฿{booking.totalPriceThb.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right: Mini Check-In Pass QR */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center sm:border-l sm:border-dashed sm:border-[var(--color-border)] sm:pl-4">
          <DynamicPromptPayQrSvg
            promptPayId={booking.bookingCode}
            amountThb={booking.totalPriceThb}
            size={96}
          />
          <span className="ty-caption font-mono mt-1.5">CHECK-IN PASS</span>
        </div>
      </div>

      {onClose && (
        <div className="px-5 pb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-round-border"
          >
            {lang === "th" ? "เสร็จสิ้น" : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
