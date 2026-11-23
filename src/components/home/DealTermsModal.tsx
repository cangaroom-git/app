"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  Clock,
  Info,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { PinFeedItemDto } from "@/types/cangaroom";

export interface DealTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: PinFeedItemDto;
  language: LanguageCode;
  hotelName: string;
  provinceLabel: string;
  discountHeadline: string;
  dealPrice: number | null;
  dealOriginalPrice: number | null;
  expiryLabel: string | null;
  isSaved: boolean;
  internalHotelHref: string;
  externalDealHref: string;
  onToggleSave: (pinId: string) => void;
  onVisitHotelClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onExternalDealClick: () => void;
}

function formatFullExpiryDate(
  isoString: string | null,
  language: LanguageCode
): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DealTermsModal({
  isOpen,
  onClose,
  pin,
  language,
  hotelName,
  provinceLabel,
  discountHeadline,
  dealPrice,
  dealOriginalPrice,
  expiryLabel,
  isSaved,
  internalHotelHref,
  externalDealHref,
  onToggleSave,
  onVisitHotelClick,
  onExternalDealClick,
}: DealTermsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isTh = language === "th";
  const isExternal = pin.dealSourceType === "EXTERNAL";
  const sourceName = isExternal
    ? pin.externalSourceName || (isTh ? "เว็บไซต์พันธมิตร" : "Partner site")
    : isTh
    ? "Nondii จองตรง 0% GP"
    : "Nondii Direct 0% GP";

  const effectiveExpiresAt =
    pin.promoExpiresAt || pin.activeCoupon?.expiresAt || null;
  const fullExpiryDate = formatFullExpiryDate(effectiveExpiresAt, language);

  const minSpendThb = pin.activeCoupon?.minSpendThb ?? 0;
  const maxDiscountThb = pin.activeCoupon?.maxDiscountThb ?? null;
  const remainingQuota =
    pin.activeCoupon?.totalQuota != null
      ? Math.max(0, pin.activeCoupon.totalQuota - pin.activeCoupon.claimedCount)
      : null;

  const extraDescription = isTh
    ? pin.activeCoupon?.descriptionTh || pin.descriptionTh
    : pin.activeCoupon?.descriptionEn || pin.descriptionEn || pin.descriptionTh;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "เงื่อนไขโปรโมชั่น" : "Promotion terms"}
      data-swipe-ignore="true"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[460px] max-h-[86dvh] bg-[var(--color-background-popover)] border-t sm:border border-[var(--color-border)] rounded-t-[24px] sm:rounded-[20px] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet sm:animate-none"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2.5 sm:pt-4 pb-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Info
              className="w-4 h-4 text-[var(--color-text-primary)] shrink-0"
              strokeWidth={2}
            />
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] truncate">
              {isTh ? "เงื่อนไขโปรโมชั่น" : "Promotion terms"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body — Clean Divide-Y Rhythm (Zero Border Fatigue) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 divide-y divide-[var(--color-border)]">
          {/* 1. Deal Headline & Stay Summary */}
          <div className="py-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)]">
              <span className="truncate font-semibold text-[var(--color-text-primary)]">
                {hotelName}
              </span>
              {pin.hotelVerificationStatus === "VERIFIED" && (
                <BadgeCheck className="w-3.5 h-3.5 text-[var(--color-text-primary)] shrink-0" />
              )}
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{provinceLabel}</span>
            </div>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[24px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] tabular-nums leading-tight">
                {discountHeadline}
              </span>
              {dealPrice && (
                <span className="text-[14.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  ฿{dealPrice.toLocaleString()}
                  <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">
                    /{isTh ? "คืน" : "night"}
                  </span>
                  {dealOriginalPrice && (
                    <span className="ml-1.5 text-[12.5px] font-normal line-through text-[var(--color-text-tertiary)]">
                      ฿{dealOriginalPrice.toLocaleString()}
                    </span>
                  )}
                </span>
              )}
            </div>

            <p className="text-[12.5px] text-[var(--color-text-secondary)] flex items-center gap-1.5 pt-0.5">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isExternal
                  ? isTh
                    ? `แหล่งที่มาโปรโมชั่น: ${sourceName}`
                    : `Deal source: ${sourceName}`
                  : isTh
                  ? "คูปองจองตรงกับที่พักผ่าน Nondii (0% GP)"
                  : "Direct 0% GP stay voucher on Nondii"}
              </span>
            </p>
          </div>

          {/* 2. How to Redeem (Zero Manual Code Typing!) */}
          <div className="py-4 space-y-2">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isTh ? "วิธีรับสิทธิ์ส่วนลด" : "How to redeem"}</span>
            </p>
            <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
              {isExternal ? (
                <p>
                  {isTh
                    ? `กดปุ่ม "ไปที่ ${sourceName}" เพื่อรับสิทธิ์และจองโดยตรงบนหน้าโปรโมชั่นต้นทาง ไม่ต้องกรอกโค้ดบน Nondii (ราคาและห้องว่างเป็นไปตามเงื่อนไขของผู้ให้บริการ)`
                    : `Tap "Open ${sourceName}" to claim this offer directly on the partner page. Final availability and pricing follow the partner's terms.`}
                </p>
              ) : (
                <p>
                  {isTh
                    ? "ไม่ต้องกรอกโค้ดเอง — กด \"บันทึกโปร\" เพื่อเก็บสิทธิ์เข้าทริป หรือกด \"จองตรง 0% GP\" เพื่อไปยังหน้าที่พัก ระบบจะนำส่วนลดไปหักให้อัตโนมัติตอนจอง"
                    : "No code entry needed — save this deal to your board or tap \"Book direct 0% GP\" and your discount will apply automatically at checkout."}
                </p>
              )}
            </div>
          </div>

          {/* 3. Key Conditions */}
          <div className="py-4 space-y-2.5 text-[13.5px]">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "รายละเอียดและข้อกำหนด" : "Key conditions"}
            </p>

            <ul className="space-y-2 text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                <span>
                  {minSpendThb > 0
                    ? isTh
                      ? `ยอดจองขั้นต่ำ ฿${minSpendThb.toLocaleString()} ต่อการจอง`
                      : `Minimum spend ฿${minSpendThb.toLocaleString()} per booking`
                    : isTh
                    ? "ไม่มีขั้นต่ำในการจอง สามารถใช้สิทธิ์ได้ทันที"
                    : "No minimum spend required"}
                </span>
              </li>

              {maxDiscountThb != null && maxDiscountThb > 0 && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                  <span>
                    {isTh
                      ? `ส่วนลดสูงสุดไม่เกิน ฿${maxDiscountThb.toLocaleString()}`
                      : `Maximum discount up to ฿${maxDiscountThb.toLocaleString()}`}
                  </span>
                </li>
              )}

              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                <span>
                  {fullExpiryDate
                    ? isTh
                      ? `ใช้สิทธิ์ได้ถึง ${fullExpiryDate}${
                          expiryLabel ? ` (${expiryLabel})` : ""
                        }`
                      : `Valid until ${fullExpiryDate}${
                          expiryLabel ? ` (${expiryLabel})` : ""
                        }`
                    : isTh
                    ? "ใช้สิทธิ์ได้จนกว่าโควต้าโปรโมชั่นจะหมด"
                    : "Valid while promotional quota lasts"}
                </span>
              </li>

              {remainingQuota !== null && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                  <span className="tabular-nums">
                    {isTh
                      ? `สิทธิ์คงเหลือ ${remainingQuota.toLocaleString()} สิทธิ์ (1 สิทธิ์ต่อการจอง)`
                      : `${remainingQuota.toLocaleString()} redemptions remaining (1 per booking)`}
                  </span>
                </li>
              )}

              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                <span>
                  {isTh
                    ? "ไม่สามารถแลกเปลี่ยนเป็นเงินสดได้ และขึ้นอยู่กับห้องว่างในวันที่เข้าพัก"
                    : "Non-refundable and subject to room availability on selected dates"}
                </span>
              </li>
            </ul>

            {extraDescription && (
              <p className="pt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {extraDescription}
              </p>
            )}
          </div>
        </div>

        {/* Sticky Footer — Warm Minimal 2-Button Hierarchy */}
        <div className="px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border)] flex items-center gap-2.5 shrink-0 bg-[var(--color-background-popover)]">
          <button
            type="button"
            onClick={() => onToggleSave(pin.id)}
            className={`h-11 px-4 rounded-[12px] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              isSaved
                ? "bg-[var(--color-promo)] !text-white"
                : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
              strokeWidth={2}
            />
            <span>
              {isSaved
                ? isTh
                  ? "บันทึกแล้ว"
                  : "Saved"
                : isTh
                ? "บันทึกโปร"
                : "Save deal"}
            </span>
          </button>

          {isExternal ? (
            <a
              href={externalDealHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onExternalDealClick();
                onClose();
              }}
              className="flex-1 h-11 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="truncate">
                {isTh
                  ? `ไปที่ ${pin.externalSourceName || "หน้าโปร"}`
                  : `Open ${pin.externalSourceName || "deal"}`}
              </span>
              <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            </a>
          ) : (
            <Link
              href={internalHotelHref}
              prefetch={true}
              onClick={(e) => {
                onClose();
                onVisitHotelClick(e);
              }}
              className="flex-1 h-11 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{isTh ? "จองตรง 0% GP" : "Book direct 0% GP"}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
