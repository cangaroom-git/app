"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Copy,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { CouponDealDto } from "@/types/cangaroom";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface CouponWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  isAuthenticated: boolean;
  walletCoupons: CouponDealDto[];
  recommendedDeals: CouponDealDto[];
  onClaimCoupon: (params: { couponId?: string; code?: string }) => Promise<{
    success: boolean;
    message: string;
  }>;
  onRemoveCoupon: (couponId: string) => Promise<void>;
}

export function CouponWalletDrawer({
  isOpen,
  onClose,
  language,
  isAuthenticated,
  walletCoupons,
  recommendedDeals,
  onClaimCoupon,
  onRemoveCoupon,
}: CouponWalletDrawerProps) {
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setFeedbackBanner(null);
      setManualCodeInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const claimedIds = new Set(walletCoupons.map((c) => c.id));
  const unclaimedDeals = recommendedDeals.filter(
    (d) => !claimedIds.has(d.id) && d.isActive
  );

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCodeInput.trim().toUpperCase();
    if (!code || isBusy) return;
    setIsBusy(true);
    const res = await onClaimCoupon({ code });
    setFeedbackBanner({
      type: res.success ? "success" : "error",
      text: res.message,
    });
    if (res.success) setManualCodeInput("");
    setIsBusy(false);
  };

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    }
  };

  const formatDiscountBadge = (c: CouponDealDto) =>
    c.discountType === "PERCENT"
      ? language === "th"
        ? `ลด ${c.discountValue}%`
        : `${c.discountValue}% OFF`
      : language === "th"
      ? `ลด ฿${c.discountValue.toLocaleString()}`
      : `฿${c.discountValue.toLocaleString()} OFF`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Coupon Wallet"
      className="fixed inset-0 z-[82] overflow-hidden"
    >
      <div
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
        onClick={onClose}
      />

      <aside className="app-right-drawer z-10 animate-slide-in-right-drawer">
        <header className="px-4 sm:px-5 py-3 bg-[var(--color-background-card)] flex items-center justify-between gap-2.5 shrink-0 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="ty-subtitle truncate">
                {language === "th" ? "กระเป๋าคูปอง" : "Coupon Wallet"}
              </h2>
              <span className="badge-promo shrink-0">{walletCoupons.length}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-4 sm:px-5 py-3 bg-[var(--color-background-card)] shrink-0 space-y-2">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
              placeholder={
                language === "th"
                  ? "กรอกโค้ดส่วนลดเพื่อเก็บเข้ากระเป๋า..."
                  : "Enter coupon code..."
              }
              className="h-10 rounded-[12px] bg-[var(--color-background-muted)] px-4 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-emphasized)] flex-1 uppercase font-mono"
            />
            <button
              type="submit"
              disabled={!manualCodeInput.trim() || isBusy}
              className="h-10 px-4 rounded-[12px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] ty-body font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "th" ? "เก็บโค้ด" : "Save"}</span>
            </button>
          </form>

          {feedbackBanner && (
            <p
              className={`ty-caption font-semibold px-3 py-1.5 rounded-[10px] ${
                feedbackBanner.type === "success"
                  ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                  : "bg-[var(--color-error-muted)] text-[var(--color-error)]"
              }`}
            >
              {feedbackBanner.text}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="ty-body font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th" ? "คูปองในกระเป๋าของคุณ" : "Saved Coupons"}
                </span>
              </h3>
              <span className="ty-caption">
                {walletCoupons.length} {language === "th" ? "รายการ" : "items"}
              </span>
            </div>

            {!isAuthenticated ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5 text-center space-y-2.5">
                <p className="ty-body font-semibold">
                  {language === "th"
                    ? "เข้าสู่ระบบเพื่อเก็บคูปองข้ามโรงแรมไว้ในบัญชีของคุณ"
                    : "Sign in to save hotel coupons across devices"}
                </p>
                <Link
                  href="/login"
                  onClick={onClose}
                  className="h-10 px-5 rounded-[12px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] ty-body font-semibold inline-flex items-center justify-center transition-opacity"
                >
                  {language === "th" ? "เข้าสู่ระบบด้วย Google" : "Sign in"}
                </Link>
              </div>
            ) : walletCoupons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5 text-center space-y-1.5">
                <p className="ty-body font-semibold">
                  {language === "th"
                    ? "ยังไม่มีคูปองในกระเป๋า"
                    : "Your wallet is empty"}
                </p>
                <p className="ty-caption">
                  {language === "th"
                    ? "เลือกเก็บคูปองจากที่พักด้านล่างหรือหน้า /deal เพื่อใช้ตอนจอง"
                    : "Collect hotel vouchers below or on the Deals page"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {walletCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-[16px] p-3.5 bg-[var(--color-background-muted)] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="badge-promo">
                          {formatDiscountBadge(coupon)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="inline-flex items-center gap-1 ty-caption font-mono font-bold hover:text-[var(--color-promo-text)] cursor-pointer"
                        >
                          <span>{coupon.code}</span>
                          {copiedCode === coupon.code ? (
                            <Check className="w-3 h-3 text-[var(--color-success)]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          )}
                        </button>
                      </div>

                      {!coupon.usedAt && (
                        <button
                          type="button"
                          onClick={() => onRemoveCoupon(coupon.id)}
                          aria-label="Remove coupon"
                          className="h-7 w-7 rounded-[9px] inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="ty-caption font-semibold text-[var(--color-accent)] truncate">
                          {coupon.hotelNameTh}
                        </p>
                        <p className="ty-body font-bold truncate">
                          {language === "th" ? coupon.titleTh : coupon.titleEn}
                        </p>
                      </div>

                      {coupon.usedAt ? (
                        <span className="ty-caption font-semibold px-2.5 py-1 rounded-[8px] bg-[var(--color-background-card)] shrink-0">
                          ใช้แล้ว
                        </span>
                      ) : (
                        <Link
                          href={`/${coupon.hotelSlug}?coupon=${encodeURIComponent(
                            coupon.code
                          )}`}
                          onClick={onClose}
                          className="h-8 px-3 rounded-[10px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] ty-caption font-semibold inline-flex items-center gap-1 shrink-0 transition-opacity"
                        >
                          <span>{language === "th" ? "จองเลย" : "Use"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {unclaimedDeals.length > 0 && (
            <section className="space-y-3">
              <h3 className="ty-body font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th"
                    ? "คูปองแนะนำจากที่พักทั่วไทย"
                    : "Recommended Thailand Deals"}
                </span>
              </h3>

              <div className="space-y-2.5">
                {unclaimedDeals.slice(0, 6).map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-[16px] bg-[var(--color-background-muted)] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="badge-promo">
                          {formatDiscountBadge(coupon)}
                        </span>
                        <span className="ty-caption font-mono font-bold">
                          {coupon.code}
                        </span>
                      </div>
                      <p className="ty-body font-semibold truncate">
                        {coupon.hotelNameTh}
                      </p>
                      <p className="ty-caption truncate">{coupon.titleTh}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setIsBusy(true);
                        const res = await onClaimCoupon({ couponId: coupon.id });
                        setFeedbackBanner({
                          type: res.success ? "success" : "error",
                          text: res.message,
                        });
                        setIsBusy(false);
                      }}
                      className="h-8 px-3 rounded-[10px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] ty-caption font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === "th" ? "เก็บ" : "Save"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
