"use client";

import React, { useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Printer,
  ShieldCheck,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { BookingRecord } from "@/data/rooms";
import { LanguageCode } from "@/lib/dateFormatters";

function formatEmvField(tagId: string, value: string): string {
  const valueLength = String(value.length).padStart(2, "0");
  return `${tagId}${valueLength}${value}`;
}

function calculateCrc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit++) {
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
 * Thai PromptPay QR payload string with exact transaction amount.
 */
export function generatePromptPayPayload(
  rawPromptPayId: string,
  amountThb?: number
): string {
  const digitsOnly = rawPromptPayId.replace(/\D/g, "");
  let recipientSubField = "";

  if (digitsOnly.length === 15) {
    recipientSubField = formatEmvField("03", digitsOnly);
  } else if (digitsOnly.length === 13) {
    recipientSubField = formatEmvField("02", digitsOnly);
  } else {
    let mobileWithoutLeadingZero = digitsOnly;
    if (digitsOnly.startsWith("66") && digitsOnly.length === 11) {
      mobileWithoutLeadingZero = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith("0")) {
      mobileWithoutLeadingZero = digitsOnly.slice(1);
    }
    const formattedMobileId = `0066${mobileWithoutLeadingZero}`.slice(0, 13);
    recipientSubField = formatEmvField("01", formattedMobileId);
  }

  const merchantAccountInfo =
    formatEmvField("00", "A000000677010111") + recipientSubField;

  const hasValidAmount = typeof amountThb === "number" && amountThb > 0;
  const amountField = hasValidAmount
    ? formatEmvField("54", Number(amountThb).toFixed(2))
    : "";

  const payloadWithoutCrc =
    formatEmvField("00", "01") +
    formatEmvField("01", hasValidAmount ? "12" : "11") +
    formatEmvField("29", merchantAccountInfo) +
    formatEmvField("58", "TH") +
    formatEmvField("53", "764") +
    amountField +
    "6304";

  return payloadWithoutCrc + calculateCrc16Ccitt(payloadWithoutCrc);
}

export interface PromptPayQrCodeSvgProps {
  promptPayId?: string;
  amountThb?: number;
  rawPayload?: string;
  size?: number;
}

export function PromptPayQrCodeSvg({
  promptPayId,
  amountThb,
  rawPayload,
  size = 140,
}: PromptPayQrCodeSvgProps) {
  const resolvedPayload = useMemo(() => {
    if (rawPayload) {
      return rawPayload;
    }
    return generatePromptPayPayload(promptPayId || "0957797971", amountThb);
  }, [rawPayload, promptPayId, amountThb]);

  const qrMatrix = useMemo(() => {
    const qrCodeData = QRCode.create(resolvedPayload, {
      errorCorrectionLevel: "M",
    });
    const matrixSize = qrCodeData.modules.size;
    const moduleBits = qrCodeData.modules.data;
    const rows: boolean[][] = [];

    for (let rowIndex = 0; rowIndex < matrixSize; rowIndex++) {
      const rowCells: boolean[] = [];
      for (let colIndex = 0; colIndex < matrixSize; colIndex++) {
        rowCells.push(Boolean(moduleBits[rowIndex * matrixSize + colIndex]));
      }
      rows.push(rowCells);
    }

    return { size: matrixSize, rows };
  }, [resolvedPayload]);

  const quietZoneModules = 2;
  const totalViewBoxSize = qrMatrix.size + quietZoneModules * 2;

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-[16px] bg-[#ffffff] p-2.5 shrink-0 select-none shadow-2xs"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`${-quietZoneModules} ${-quietZoneModules} ${totalViewBoxSize} ${totalViewBoxSize}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="PromptPay QR Code"
      >
        <rect
          x={-quietZoneModules}
          y={-quietZoneModules}
          width={totalViewBoxSize}
          height={totalViewBoxSize}
          fill="#FFFFFF"
        />
        {qrMatrix.rows.map((rowCells, rowIndex) =>
          rowCells.map((isDarkModule, colIndex) =>
            isDarkModule ? (
              <rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex}
                y={rowIndex}
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

export interface PromptPayPaymentCardProps {
  language: LanguageCode;
  promptPayId: string;
  promptPayAccountName: string;
  amountThb: number;
  isVerifyingSlip: boolean;
  slipVerificationFeedback: string | null;
  onUploadSlip: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSimulateValidSlip?: () => void;
  allowDevSimulation?: boolean;
}

export function PromptPayPaymentCard({
  language,
  promptPayId,
  promptPayAccountName,
  amountThb,
  isVerifyingSlip,
  slipVerificationFeedback,
  onUploadSlip,
  onSimulateValidSlip,
  allowDevSimulation = false,
}: PromptPayPaymentCardProps) {
  const [hasCopiedPromptPayId, setHasCopiedPromptPayId] = useState(false);

  const handleCopyPromptPayId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(promptPayId);
      setHasCopiedPromptPayId(true);
      setTimeout(() => setHasCopiedPromptPayId(false), 1600);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Dynamic Scannable QR + Account Details (Single 1-Layer Surface) */}
      <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row items-center gap-4">
        <PromptPayQrCodeSvg
          promptPayId={promptPayId}
          amountThb={amountThb}
          size={136}
        />

        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <p className="inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-accent)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PromptPay QR</span>
          </p>

          <p className="ty-body font-bold truncate">{promptPayAccountName}</p>

          <div className="inline-flex items-center gap-1.5 ty-caption">
            <span className="font-mono text-[var(--color-text-primary)]">
              {promptPayId}
            </span>
            <button
              type="button"
              onClick={handleCopyPromptPayId}
              title={
                language === "th" ? "คัดลอกพร้อมเพย์" : "Copy PromptPay ID"
              }
              aria-label={
                language === "th" ? "คัดลอกพร้อมเพย์" : "Copy PromptPay ID"
              }
              className="h-7 w-7 rounded-full hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
            >
              {hasCopiedPromptPayId ? (
                <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <p className="ty-display pt-0.5">฿{amountThb.toLocaleString()}</p>
        </div>
      </div>

      {/* 1-Click Slip Upload Dropzone (Single 1-Layer Surface) */}
      <label className="min-h-[104px] flex flex-col items-center justify-center rounded-[16px] bg-[var(--color-accent-muted)]/65 hover:bg-[var(--color-accent-muted)] p-4 text-center cursor-pointer transition">
        <Upload className="w-6 h-6 text-[var(--color-accent)] mb-1.5" />
        <span className="ty-body font-semibold">
          {isVerifyingSlip
            ? language === "th"
              ? "กำลังตรวจสลิป..."
              : "Verifying slip..."
            : language === "th"
            ? "แนบสลิปโอนเงิน"
            : "Upload transfer slip"}
        </span>
        <span className="ty-caption mt-0.5">
          {language === "th" ? "ยืนยันห้องพักอัตโนมัติ" : "Auto-verify payment"}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={onUploadSlip}
          className="hidden"
        />
      </label>

      {allowDevSimulation && onSimulateValidSlip && (
        <button
          type="button"
          onClick={onSimulateValidSlip}
          className="btn-fw-secondary w-full"
        >
          <Zap className="w-4 h-4" />
          <span>
            {language === "th" ? "จำลองสแกนจ่ายสำเร็จ" : "Simulate QR Pay"}
          </span>
        </button>
      )}

      {slipVerificationFeedback && (
        <p className="ty-caption font-semibold text-[var(--color-success)] bg-[var(--color-success-muted)] px-3.5 py-2 rounded-[12px]">
          {slipVerificationFeedback}
        </p>
      )}
    </div>
  );
}

export interface BookingDigitalVoucherCardProps {
  booking: BookingRecord;
  propertyName: string;
  language: LanguageCode;
  formatShortDateFn: (dateString: string, language: LanguageCode) => string;
  onClose?: () => void;
}

export function BookingDigitalVoucherCard({
  booking,
  propertyName,
  language,
  formatShortDateFn,
  onClose,
}: BookingDigitalVoucherCardProps) {
  const isBookingConfirmed = booking.status === "CONFIRMED";

  return (
    <div className="rounded-[20px] bg-[var(--color-background-muted)] overflow-hidden">
      {/* Status Banner */}
      <div className="bg-[var(--color-accent)] text-[var(--color-on-accent)] px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <p className="ty-caption !text-white/85">
              {isBookingConfirmed
                ? language === "th"
                  ? "ยืนยันการจองอัตโนมัติสำเร็จ"
                  : "Auto-Confirmed Booking"
                : language === "th"
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
          title={
            language === "th" ? "พิมพ์ / บันทึกใบจอง" : "Print / Save Voucher"
          }
          aria-label={
            language === "th" ? "พิมพ์ / บันทึกใบจอง" : "Print / Save Voucher"
          }
          className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 inline-flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Flat Voucher Details + Check-In QR (Zero Inner White Sub-Boxes) */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-2.5 w-full sm:w-auto min-w-0">
          <div>
            <p className="ty-caption">{propertyName}</p>
            <h4 className="ty-subtitle">
              {booking.roomCode} · {booking.roomNameTh}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ty-caption text-[var(--color-text-primary)]">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {formatShortDateFn(booking.checkIn, language)} →{" "}
                {formatShortDateFn(booking.checkOut, language)} ({booking.nights}{" "}
                {language === "th" ? "คืน" : "nights"})
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Users className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {booking.guests} {language === "th" ? "ท่าน" : "guests"}
              </span>
            </span>
          </div>

          <p className="ty-body pt-0.5">
            <span className="text-[var(--color-text-secondary)]">
              {booking.guestName} ·{" "}
            </span>
            <strong className="ty-subtitle text-[var(--color-accent)]">
              ฿{booking.totalPriceThb.toLocaleString()}
            </strong>
          </p>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <PromptPayQrCodeSvg
            rawPayload={`MYHOTEL-CHECKIN:${booking.bookingCode}|ROOM:${booking.roomCode}|IN:${booking.checkIn}|OUT:${booking.checkOut}`}
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
            className="btn-round-solid !h-9 !px-4"
          >
            {language === "th" ? "เสร็จสิ้น" : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
