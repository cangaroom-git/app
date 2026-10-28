"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { PromoCoupon } from "@/data/rooms";
import { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StandardButton } from "@/components/ui/standards";

export interface CouponWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  allCoupons: PromoCoupon[];
  savedCouponCodes: string[];
  appliedCouponCode: string | null;
  onSaveCouponToWallet: (code: string) => { success: boolean; message: string };
  onRemoveCouponFromWallet: (code: string) => void;
  onApplyCouponCode: (code: string | null) => void;
  onBrowseRooms?: () => void;
}

export function CouponWalletDrawer({
  isOpen,
  onClose,
  language,
  allCoupons,
  savedCouponCodes,
  appliedCouponCode,
  onSaveCouponToWallet,
  onRemoveCouponFromWallet,
  onApplyCouponCode,
  onBrowseRooms,
}: CouponWalletDrawerProps) {
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setFeedbackBanner(null);
      setManualCodeInput("");
    }
  }, [isOpen]);

  const activeCoupons = useMemo(
    () => allCoupons.filter((coupon) => coupon.isActive),
    [allCoupons]
  );

  const savedCouponSet = useMemo(
    () => new Set(savedCouponCodes.map((code) => code.toUpperCase())),
    [savedCouponCodes]
  );

  const savedCoupons = useMemo(
    () =>
      activeCoupons.filter((coupon) =>
        savedCouponSet.has(coupon.code.toUpperCase())
      ),
    [activeCoupons, savedCouponSet]
  );

  const unclaimedCoupons = useMemo(
    () =>
      activeCoupons.filter(
        (coupon) => !savedCouponSet.has(coupon.code.toUpperCase())
      ),
    [activeCoupons, savedCouponSet]
  );

  const handleManualClaimSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedInput = manualCodeInput.trim().toUpperCase();
    if (!normalizedInput) {
      return;
    }

    const result = onSaveCouponToWallet(normalizedInput);
    setFeedbackBanner({
      type: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setManualCodeInput("");
    }
  };

  const handleCopyCouponCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    }
  };

  const formatDiscountBadgeLabel = (coupon: PromoCoupon): string => {
    if (coupon.discountType === "PERCENT") {
      return language === "th"
        ? `ลด ${coupon.discountValue}%`
        : `${coupon.discountValue}% OFF`;
    }
    return language === "th"
      ? `ลด ฿${coupon.discountValue.toLocaleString()}`
      : `฿${coupon.discountValue.toLocaleString()} OFF`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Wallet"
      }
      className="fixed inset-0 z-[82] overflow-hidden"
    >
      <div
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
        onClick={onClose}
      />

      <aside className="app-right-drawer z-10 animate-slide-in-right-drawer">
        {/* Sticky Drawer Header */}
        <header className="px-4 sm:px-5 py-3 bg-[var(--color-background-card)] flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="ty-subtitle truncate">
                {language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
              </h2>
              <span className="badge-promo shrink-0">{savedCoupons.length}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={language === "th" ? "ปิดกระเป๋าคูปอง" : "Close"}
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Flat Manual Promo Code Input Bar (Zero Outer Box Wrapper) */}
        <div className="px-4 sm:px-5 pb-3 bg-[var(--color-background-card)] shrink-0 space-y-2">
          <form
            onSubmit={handleManualClaimSubmit}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={manualCodeInput}
              onChange={(event) =>
                setManualCodeInput(event.target.value.toUpperCase())
              }
              placeholder={
                language === "th"
                  ? "กรอกโค้ดส่วนลดเพื่อเก็บเข้ากระเป๋า..."
                  : "Enter promo code to save..."
              }
              className="h-10 rounded-full bg-[var(--color-background-muted)] px-4 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-promo)]/30 flex-1 uppercase font-mono"
            />
            <button
              type="submit"
              disabled={!manualCodeInput.trim()}
              className="btn-promo-solid shrink-0 disabled:opacity-50 disabled:pointer-events-none"
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

        {/* Scrollable Coupon Lists */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* 1. Saved Coupons in Bag */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="ty-body font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th" ? "คูปองในกระเป๋าของคุณ" : "Saved in Bag"}
                </span>
              </h3>
              <span className="ty-caption">
                {savedCoupons.length}{" "}
                {language === "th" ? "รายการ" : "coupons"}
              </span>
            </div>

            {savedCoupons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-6 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] inline-flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="ty-body font-semibold">
                  {language === "th"
                    ? "ยังไม่มีคูปองในกระเป๋า"
                    : "Your coupon bag is empty"}
                </p>
                <p className="ty-caption">
                  {language === "th"
                    ? "กดเก็บคูปองด้านล่างหรือจากหน้าโปรโมชั่นเพื่อนำมาใช้ลดราคาห้องพัก"
                    : "Collect coupons below or from the Deals page to apply at checkout"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedCoupons.map((coupon) => {
                  const isApplied =
                    appliedCouponCode?.toUpperCase() ===
                    coupon.code.toUpperCase();
                  const isCopied = copiedCode === coupon.code;

                  return (
                    <div
                      key={coupon.id}
                      className={`rounded-[16px] p-3.5 transition-all ${
                        isApplied
                          ? "ring-2 ring-[var(--color-promo)] bg-[var(--color-promo-muted)]/45"
                          : "bg-[var(--color-background-muted)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="badge-promo">
                            <Tag className="w-3 h-3" />
                            <span>{formatDiscountBadgeLabel(coupon)}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyCouponCode(coupon.code)}
                            title={
                              language === "th" ? "คัดลอกโค้ด" : "Copy code"
                            }
                            className="inline-flex items-center gap-1 ty-caption font-mono font-bold text-[var(--color-text-primary)] hover:text-[var(--color-promo-text)] transition cursor-pointer"
                          >
                            <span>{coupon.code}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-[var(--color-success)]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[var(--color-text-secondary)]" />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveCouponFromWallet(coupon.code)}
                          title={
                            language === "th"
                              ? "ลบออกจากกระเป๋า"
                              : "Remove from bag"
                          }
                          aria-label={
                            language === "th"
                              ? "ลบออกจากกระเป๋า"
                              : "Remove from bag"
                          }
                          className="h-8 w-8 rounded-full inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)] transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="ty-body font-bold truncate">
                            {language === "th"
                              ? coupon.titleTh
                              : coupon.titleEn}
                          </p>
                          <p className="ty-caption mt-0.5">
                            {coupon.minSpendThb > 0
                              ? language === "th"
                                ? `ขั้นต่ำ ฿${coupon.minSpendThb.toLocaleString()}`
                                : `Min. spend ฿${coupon.minSpendThb.toLocaleString()}`
                              : language === "th"
                              ? "ไม่มีขั้นต่ำ"
                              : "No minimum spend"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onApplyCouponCode(isApplied ? null : coupon.code)
                          }
                          className={`h-8 px-3.5 rounded-full ty-caption font-semibold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                            isApplied
                              ? "bg-[var(--color-promo)] text-[var(--color-on-promo)]"
                              : "bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] hover:bg-[var(--color-promo)] hover:text-[var(--color-on-promo)]"
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {language === "th" ? "ใช้อยู่" : "Active"}
                              </span>
                            </>
                          ) : (
                            <span>
                              {language === "th" ? "ใช้คูปอง" : "Use"}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Unclaimed Storefront Coupons Ready to Collect */}
          {unclaimedCoupons.length > 0 && (
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="ty-body font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-promo-text)]" />
                  <span>
                    {language === "th"
                      ? "คูปองแนะนำ เก็บเพิ่มได้ทันที"
                      : "Available Coupons to Collect"}
                  </span>
                </h3>
              </div>

              <div className="space-y-2.5">
                {unclaimedCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-[16px] bg-[var(--color-background-muted)] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge-promo">
                          {formatDiscountBadgeLabel(coupon)}
                        </span>
                        <span className="ty-caption font-mono font-bold text-[var(--color-text-primary)]">
                          {coupon.code}
                        </span>
                      </div>
                      <p className="ty-body font-semibold truncate">
                        {language === "th" ? coupon.titleTh : coupon.titleEn}
                      </p>
                      {coupon.minSpendThb > 0 && (
                        <p className="ty-caption">
                          {language === "th"
                            ? `ยอดจองขั้นต่ำ ฿${coupon.minSpendThb.toLocaleString()}`
                            : `Min. ฿${coupon.minSpendThb.toLocaleString()}`}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const result = onSaveCouponToWallet(coupon.code);
                        setFeedbackBanner({
                          type: result.success ? "success" : "error",
                          text: result.message,
                        });
                      }}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-[var(--color-on-promo)] ty-caption font-semibold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {language === "th" ? "เก็บคูปอง" : "Collect"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky Drawer Footer */}
        <footer className="px-4 sm:px-5 py-3 bg-[var(--color-background-card)] shadow-[0_-4px_24px_rgba(15,23,42,0.06)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="ty-caption block">
              {language === "th" ? "คูปองที่เลือกใช้" : "Applied Coupon"}
            </span>
            {appliedCouponCode ? (
              <span className="ty-body font-bold text-[var(--color-promo-text)] font-mono">
                {appliedCouponCode}
              </span>
            ) : (
              <span className="ty-body font-semibold text-[var(--color-text-secondary)]">
                {language === "th" ? "ยังไม่ได้เลือกใช้" : "None selected"}
              </span>
            )}
          </div>

          {onBrowseRooms && (
            <StandardButton
              type="button"
              variant="primary"
              size="lg"
              onClick={() => {
                onClose();
                onBrowseRooms();
              }}
            >
              <span>{language === "th" ? "เลือกห้องพัก" : "Browse Rooms"}</span>
              <ChevronRight className="w-4 h-4" />
            </StandardButton>
          )}
        </footer>
      </aside>
    </div>
  );
}
