"use client";

import React, { useState, useMemo } from "react";
import QRCode from "qrcode";
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
  Pencil,
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
 * Generates an official Bank of Thailand (BOT) / EMVCo-compliant
 * Thai PromptPay QR Payload string with exact transaction amount.
 * Supports:
 * - 10-digit Thai Mobile Number (08X/09X/06X -> 0066...)
 * - 13-digit National ID / Tax ID
 * - 15-digit e-Wallet ID
 */
export function generatePromptPayPayload(
  rawId: string,
  amountThb?: number
): string {
  const digits = rawId.replace(/\D/g, "");
  let targetField = "";

  if (digits.length === 15) {
    // e-Wallet ID (Sub-tag 03)
    targetField = formatField("03", digits);
  } else if (digits.length === 13) {
    // National ID / Tax ID (Sub-tag 02)
    targetField = formatField("02", digits);
  } else {
    // Mobile Phone Number (Sub-tag 01: 13 digits starting with 0066)
    let phoneNoLeadingZero = digits;
    if (digits.startsWith("66") && digits.length === 11) {
      phoneNoLeadingZero = digits.slice(2);
    } else if (digits.startsWith("0")) {
      phoneNoLeadingZero = digits.slice(1);
    }
    const formattedMobile = `0066${phoneNoLeadingZero}`.slice(0, 13);
    targetField = formatField("01", formattedMobile);
  }

  const merchantInfo =
    formatField("00", "A000000677010111") + targetField;

  const hasAmount = typeof amountThb === "number" && amountThb > 0;
  const amountTag = hasAmount
    ? formatField("54", Number(amountThb).toFixed(2))
    : "";

  const body =
    formatField("00", "01") +
    formatField("01", hasAmount ? "12" : "11") +
    formatField("29", merchantInfo) +
    formatField("58", "TH") +
    formatField("53", "764") +
    amountTag +
    "6304";

  return body + crc16Ccitt(body);
}

/**
 * Renders a 100% genuine, scannable ISO/IEC 18004 QR Code SVG
 * using the `qrcode` Reed-Solomon encoder so real Thai mobile banking apps
 * (K PLUS, SCB EASY, Krungthai NEXT, BBL, KMA, ttb touch) can scan and pay.
 */
export function DynamicPromptPayQrSvg({
  promptPayId,
  amountThb,
  rawPayload,
  size = 148,
}: {
  promptPayId?: string;
  amountThb?: number;
  rawPayload?: string;
  size?: number;
}) {
  const payload = useMemo(() => {
    if (rawPayload) return rawPayload;
    return generatePromptPayPayload(promptPayId || "0957797971", amountThb);
  }, [rawPayload, promptPayId, amountThb]);

  const qrMatrix = useMemo(() => {
    const qr = QRCode.create(payload, {
      errorCorrectionLevel: "M",
    });
    const matrixSize = qr.modules.size;
    const data = qr.modules.data;
    const rows: boolean[][] = [];
    for (let r = 0; r < matrixSize; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < matrixSize; c++) {
        row.push(Boolean(data[r * matrixSize + c]));
      }
      rows.push(row);
    }
    return { size: matrixSize, rows };
  }, [payload]);

  const quietZone = 2;
  const totalViewBox = qrMatrix.size + quietZone * 2;

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-[16px] bg-white p-2.5 border border-[var(--color-border)] shrink-0 select-none shadow-xs"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`${-quietZone} ${-quietZone} ${totalViewBox} ${totalViewBox}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="PromptPay QR Code"
      >
        <rect
          x={-quietZone}
          y={-quietZone}
          width={totalViewBox}
          height={totalViewBox}
          fill="#FFFFFF"
        />
        {qrMatrix.rows.map((row, r) =>
          row.map((isDark, c) =>
            isDark ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#000000"
              />
            ) : null
          )
        )}
      </svg>
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
  onChangePromptPayId?: (nextId: string) => void;
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
  onChangePromptPayId,
}: AutoQrPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingId, setIsEditingId] = useState(false);
  const [customPromptPayId, setCustomPromptPayId] = useState(promptPayId);

  const effectivePromptPayId =
    customPromptPayId.trim().replace(/\D/g, "").length >= 10
      ? customPromptPayId.trim()
      : promptPayId;

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(effectivePromptPayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const handleSaveCustomId = () => {
    setIsEditingId(false);
    if (onChangePromptPayId && customPromptPayId.trim()) {
      onChangePromptPayId(customPromptPayId.trim());
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left: Dynamic Scannable QR + Account Details */}
      <div className="lg:col-span-6 app-surface-muted p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
        <DynamicPromptPayQrSvg
          promptPayId={effectivePromptPayId}
          amountThb={amountThb}
          size={148}
        />

        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 ty-caption font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PromptPay QR</span>
          </div>

          <p className="ty-body font-bold truncate">{promptPayAccountName}</p>

          {isEditingId ? (
            <div className="inline-flex items-center gap-1.5">
              <input
                type="tel"
                value={customPromptPayId}
                onChange={(e) => setCustomPromptPayId(e.target.value)}
                placeholder="เบอร์พร้อมเพย์ / เลขผู้เสียภาษี"
                className="h-7 w-36 rounded-lg border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-2 font-mono text-[12px] text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveCustomId}
                title={lang === "th" ? "บันทึกเบอร์พร้อมเพย์" : "Save ID"}
                className="h-7 w-7 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 ty-caption">
              <span className="font-mono">{effectivePromptPayId}</span>
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
              <button
                type="button"
                onClick={() => {
                  setCustomPromptPayId(effectivePromptPayId);
                  setIsEditingId(true);
                }}
                title={
                  lang === "th"
                    ? "เปลี่ยนเบอร์พร้อมเพย์เพื่อทดสอบสแกนจริง"
                    : "Edit PromptPay ID for live scan test"
                }
                className="h-6 w-6 rounded-full hover:bg-[var(--color-overlay-hover)] inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}

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

        {/* Right: Scannable Check-In Pass QR */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center sm:border-l sm:border-dashed sm:border-[var(--color-border)] sm:pl-4">
          <DynamicPromptPayQrSvg
            rawPayload={`MYHOTEL-CHECKIN:${booking.bookingCode}|ROOM:${booking.roomCode}|IN:${booking.checkIn}|OUT:${booking.checkOut}`}
            size={104}
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
