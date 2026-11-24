"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Trash2,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  formatCouponDiscountHeadline,
  getCouponQuotaInfo,
  getCouponTimeInfo,
} from "@/lib/couponHelpers";
import { launchCouponFlyAnimation } from "@/lib/couponClaimAnimation";
import type { CouponDealDto } from "@/types/cangaroom";

export interface HotelCouponTicketCardProps {
  deal: CouponDealDto;
  language: LanguageCode;
  isClaimed: boolean;
  isClaiming?: boolean;
  variant?: "grid" | "compact";
  subtitleMode?: "hotel" | "campaign";
  notchBgClass?: string;
  onClaim: (
    deal: CouponDealDto,
    sourceEl: HTMLElement | null
  ) => Promise<boolean> | boolean;
  onRemove?: (couponId: string) => Promise<void> | void;
  onNavigateHotel?: () => void;
  onRedeem?: (deal: CouponDealDto) => void;
}

export function HotelCouponTicketCard({
  deal,
  language,
  isClaimed,
  isClaiming = false,
  variant = "grid",
  subtitleMode = "hotel",
  notchBgClass = "bg-[var(--color-background-body)]",
  onClaim,
  onRemove,
  onNavigateHotel,
  onRedeem,
}: HotelCouponTicketCardProps) {
  const isTh = language === "th";
  const [isFlipped, setIsFlipped] = useState(false);
  const [justClaimedAnim, setJustClaimedAnim] = useState(false);
  const [copied, setCopied] = useState(false);
  const frontClaimBtnRef = useRef<HTMLButtonElement | null>(null);
  const backClaimBtnRef = useRef<HTMLButtonElement | null>(null);

  const isCompact = variant === "compact";
  const discountHeadline = formatCouponDiscountHeadline(deal, language);
  const hotelName = isTh ? deal.hotelNameTh : deal.hotelNameEn;
  const provinceName = isTh ? deal.provinceNameTh : deal.provinceNameEn;
  const heroImageSrc = deal.coverImageUrl || deal.hotelLogoUrl || "";

  const effectiveClaimedCount =
    isClaimed && !deal.isClaimedByMe
      ? deal.claimedCount + 1
      : deal.claimedCount;
  const quotaInfo = getCouponQuotaInfo(
    deal.totalQuota,
    effectiveClaimedCount,
    language
  );
  const timeInfo = getCouponTimeInfo(deal.expiresAt, language);

  const minSpendText =
    deal.minSpendThb > 0
      ? isTh
        ? `ยอดจองขั้นต่ำ ฿${deal.minSpendThb.toLocaleString()}`
        : `Min spend ฿${deal.minSpendThb.toLocaleString()}`
      : isTh
      ? "ไม่มีขั้นต่ำในการจอง"
      : "No minimum spend";

  const capText = deal.maxDiscountThb
    ? isTh
      ? `ลดสูงสุด ฿${deal.maxDiscountThb.toLocaleString()}`
      : `Max ฿${deal.maxDiscountThb.toLocaleString()}`
    : null;

  const frontSubtitle =
    subtitleMode === "campaign"
      ? (isTh ? deal.titleTh : deal.titleEn) || minSpendText
      : hotelName;

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const triggerClaim = async (
    e: React.MouseEvent,
    btnEl: HTMLButtonElement | null
  ) => {
    e.stopPropagation();
    if (isClaiming || isClaimed || quotaInfo.isSoldOut) return;
    const committed = await onClaim(deal, btnEl);
    if (committed) {
      setJustClaimedAnim(true);
      launchCouponFlyAnimation(btnEl, discountHeadline);
      window.setTimeout(() => setJustClaimedAnim(false), 950);
    }
  };

  const renderNotches = (emphasized = false) => {
    const borderClass = emphasized
      ? "border-[var(--color-border-emphasized)]"
      : "border-[var(--color-border)]";
    return (
      <>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -left-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[20px] rounded-r-full ${notchBgClass} border-y border-r ${borderClass} z-10`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[20px] rounded-l-full ${notchBgClass} border-y border-l ${borderClass} z-10`}
        />
      </>
    );
  };

  const frontSurfaceClass = isClaimed
    ? "bg-[var(--color-background-muted)] border border-[var(--color-border)]"
    : "bg-[var(--color-background-card)] border border-[var(--color-border)] hover:border-[var(--color-border-emphasized)]";

  return (
    <div
      className={`cgr-flip-scene select-none ${
        isCompact ? "h-[148px]" : "h-[180px]"
      }`}
    >
      <div className={`cgr-flip-card ${isFlipped ? "is-flipped" : ""}`}>
        {/* ===============================================================
            FRONT FACE — Clean Zen Ticket with Front-Face Collect CTA
        =============================================================== */}
        <article
          tabIndex={0}
          aria-label={`${discountHeadline} ${hotelName}`}
          onClick={() => setIsFlipped((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsFlipped((prev) => !prev);
            }
          }}
          className={`cgr-flip-face rounded-[16px] ${frontSurfaceClass} transition-colors flex items-center cursor-pointer`}
        >
          {renderNotches(false)}

          {justClaimedAnim && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[15px] z-20"
            >
              <span className="animate-ticket-sheen absolute -inset-y-4 left-0 w-1/3 bg-white/45 dark:bg-white/15" />
            </span>
          )}

          {/* Left Property Photo Zone */}
          <div
            className={`relative shrink-0 h-full overflow-hidden rounded-l-[15px] bg-[var(--color-background-muted)] ${
              isCompact ? "w-[88px]" : "w-[106px] sm:w-[116px]"
            }`}
          >
            {heroImageSrc ? (
              <>
                <img
                  src={heroImageSrc}
                  alt={hotelName}
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    isClaimed ? "grayscale-[35%] opacity-75" : ""
                  }`}
                />
              </>
            ) : (
              <span className="h-full w-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center ty-title font-bold">
                {hotelName[0] || "C"}
              </span>
            )}
          </div>

          {/* Vertical Dashed Perforation */}
          <div
            aria-hidden="true"
            className="h-full border-l border-dashed border-[var(--color-border-emphasized)] shrink-0"
          />

          {/* Right Value + Meta + Front-Face Claim/Redeem CTA */}
          <div
            className={`flex-1 min-w-0 h-full flex flex-col justify-between ${
              isCompact ? "px-3.5 py-2.5" : "px-4 py-3.5"
            }`}
          >
            {/* Top: Discount Value + Utility Buttons */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-start justify-between gap-1.5">
                <p
                  className={`font-extrabold tracking-tight leading-tight truncate ${
                    isCompact ? "text-[17px]" : "text-[20px] sm:text-[21px]"
                  } ${
                    isClaimed
                      ? "text-[var(--color-text-secondary)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {discountHeadline}
                </p>

                <div className="flex items-center gap-0.5 shrink-0">
                  {onRemove && !deal.usedAt && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onRemove(deal.id);
                      }}
                      aria-label={isTh ? "ลบคูปอง" : "Remove coupon"}
                      className="h-6 w-6 rounded-[7px] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                    aria-label={isTh ? "ดูเงื่อนไขคูปอง" : "Coupon terms"}
                    className="h-6 w-6 rounded-[7px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p
                className={`font-medium truncate ${
                  isCompact ? "text-[13px]" : "text-[14px]"
                } ${
                  isClaimed
                    ? "text-[var(--color-text-secondary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                {frontSubtitle}
              </p>

              {/* Urgency Meta Row: Quota left or Expiry countdown */}
              <div className="pt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--color-text-secondary)] truncate tabular-nums">
                {quotaInfo.hasQuota && !deal.usedAt && (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span
                      className={
                        quotaInfo.isLowQuota
                          ? "font-semibold text-[var(--color-text-primary)]"
                          : ""
                      }
                    >
                      {quotaInfo.label}
                    </span>
                    {!isCompact && (
                      <span className="hidden sm:inline-block w-9 h-[3px] rounded-full bg-[var(--color-border)] overflow-hidden">
                        <span
                          className="block h-full bg-[var(--color-text-primary)]"
                          style={{
                            width: `${Math.max(
                              12,
                              Math.round((1 - quotaInfo.usedRatio) * 100)
                            )}%`,
                          }}
                        />
                      </span>
                    )}
                  </span>
                )}
                {quotaInfo.hasQuota && !deal.usedAt && timeInfo.label && (
                  <span aria-hidden="true">·</span>
                )}
                {timeInfo.label && (
                  <span className="inline-flex items-center gap-1 truncate">
                    {timeInfo.isTimeLimited && (
                      <Clock className="w-3 h-3 shrink-0" />
                    )}
                    <span className="truncate">{timeInfo.label}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row: Direct Front-Face Action CTA */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {deal.usedAt ? (
                <span className="h-7 px-2.5 rounded-[8px] bg-[var(--color-background-card)] text-[11.5px] font-semibold text-[var(--color-text-secondary)] inline-flex items-center">
                  {isTh ? "ใช้แล้ว" : "Used"}
                </span>
              ) : isClaimed ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-secondary)] ${
                      justClaimedAnim ? "animate-stamp-pop" : ""
                    }`}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5 text-[var(--color-text-primary)] shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.5l3 3 6-6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={justClaimedAnim ? "animate-check-draw" : ""}
                      />
                    </svg>
                    <span>{isTh ? "เก็บแล้ว" : "Saved"}</span>
                  </span>

                  {onRedeem ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRedeem(deal);
                      }}
                      className="text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                    >
                      <span>{isTh ? "ใช้โค้ด" : "Redeem"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <Link
                      href={`/${deal.hotelSlug}?coupon=${encodeURIComponent(
                        deal.code
                      )}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateHotel?.();
                      }}
                      className="text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 inline-flex items-center gap-0.5 shrink-0"
                    >
                      <span>{isTh ? "ใช้โค้ด" : "Redeem"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </>
              ) : quotaInfo.isSoldOut ? (
                <span className="h-7 px-2.5 rounded-[8px] bg-[var(--color-background-muted)] text-[11.5px] font-semibold text-[var(--color-text-secondary)] inline-flex items-center">
                  {isTh ? "สิทธิ์เต็มแล้ว" : "Sold out"}
                </span>
              ) : (
                <>
                  <span className="font-mono text-[11.5px] font-semibold text-[var(--color-text-secondary)] truncate">
                    {deal.code}
                  </span>

                  <button
                    ref={frontClaimBtnRef}
                    type="button"
                    disabled={isClaiming}
                    onClick={(e) => void triggerClaim(e, frontClaimBtnRef.current)}
                    className={`rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] font-semibold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-colors ${
                      isCompact
                        ? "h-7 px-3 text-[12px]"
                        : "h-8 px-3.5 text-[12.5px]"
                    }`}
                  >
                    <span>
                      {isClaiming
                        ? isTh
                          ? "กำลังเก็บ..."
                          : "Saving..."
                        : isTh
                        ? "เก็บคูปอง"
                        : "Claim"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </article>

        {/* ===============================================================
            BACK FACE — Conditions, Promo Code Copy & Hotel Link
        =============================================================== */}
        <article
          onClick={() => setIsFlipped(false)}
          className={`cgr-flip-face cgr-flip-face-back rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] ${
            isCompact ? "px-4 py-3" : "px-5 py-3.5"
          } flex flex-col justify-between cursor-pointer`}
        >
          {renderNotches(true)}

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13.5px] font-bold text-[var(--color-text-primary)] truncate">
              {isTh ? deal.titleTh : deal.titleEn}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              aria-label={isTh ? "พลิกกลับ" : "Flip back"}
              className="h-6 w-6 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <ul className="space-y-0.5 text-[12px] leading-[1.4] text-[var(--color-text-secondary)]">
            <li className="truncate">
              • {minSpendText}
              {capText ? ` · ${capText}` : ""}
            </li>
            <li className="truncate">
              • {quotaInfo.label} · {provinceName} (0% GP)
            </li>
          </ul>

          <div className="pt-2 border-t border-dashed border-[var(--color-border-emphasized)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              title={isTh ? "คัดลอกโค้ดส่วนลด" : "Copy promo code"}
              className="h-8 px-2.5 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] font-mono text-[12px] font-bold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 min-w-0 cursor-pointer transition-colors"
            >
              <span className="truncate">{deal.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              )}
            </button>

            <div
              className="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {!onRedeem && (
                <Link
                  href={`/${deal.hotelSlug}`}
                  onClick={onNavigateHotel}
                  title={hotelName}
                  aria-label={hotelName}
                  className="h-8 w-8 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              {isClaimed ? (
                onRedeem ? (
                  <button
                    type="button"
                    onClick={() => onRedeem(deal)}
                    className="h-8 px-3.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{isTh ? "ใช้โค้ด" : "Redeem"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                ) : (
                  <Link
                    href={`/${deal.hotelSlug}?coupon=${encodeURIComponent(
                      deal.code
                    )}`}
                    onClick={onNavigateHotel}
                    className="h-8 px-3.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{isTh ? "ใช้โค้ด" : "Redeem"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )
              ) : (
                <button
                  ref={backClaimBtnRef}
                  type="button"
                  disabled={isClaiming || quotaInfo.isSoldOut}
                  onClick={(e) => void triggerClaim(e, backClaimBtnRef.current)}
                  className="h-8 px-3.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <span>
                    {isClaiming
                      ? isTh
                        ? "กำลังเก็บ..."
                        : "Saving..."
                      : isTh
                      ? "เก็บคูปอง"
                      : "Claim"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
