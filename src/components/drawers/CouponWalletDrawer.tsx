"use client";

import React, { useEffect, useState } from "react";
import { Plus, ShoppingBag, Sparkles, Tag, X } from "lucide-react";
import type { CouponDealDto } from "@/types/cangaroom";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StandardInput } from "@/components/ui/standards";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";

export interface CouponWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  isAuthenticated: boolean;
  walletCoupons: CouponDealDto[];
  claimedCouponIds: Set<string>;
  recommendedDeals: CouponDealDto[];
  onClaimCoupon: (params: { couponId?: string; code?: string }) => Promise<{
    success: boolean;
    message: string;
  }>;
  onRemoveCoupon: (couponId: string) => Promise<void>;
  onOpenAuthModal: (options?: {
    reasonTh?: string;
    reasonEn?: string;
    onSuccess?: () => void | Promise<void>;
  }) => void;
}

export function CouponWalletDrawer({
  isOpen,
  onClose,
  language,
  isAuthenticated,
  walletCoupons,
  claimedCouponIds,
  recommendedDeals,
  onClaimCoupon,
  onRemoveCoupon,
  onOpenAuthModal,
}: CouponWalletDrawerProps) {
  const isTh = language === "th";
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setFeedbackBanner(null);
      setManualCodeInput("");
      return;
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commitManualCode = async (code: string) => {
    setIsSubmittingCode(true);
    const res = await onClaimCoupon({ code });
    if (res.success) {
      setFeedbackBanner(null);
      setManualCodeInput("");
    } else {
      setFeedbackBanner({
        type: "error",
        text: res.message,
      });
      window.setTimeout(() => setFeedbackBanner(null), 3000);
    }
    setIsSubmittingCode(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCodeInput.trim().toUpperCase();
    if (!code || isSubmittingCode) return;
    if (!isAuthenticated) {
      onOpenAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อบันทึกโค้ดส่วนลดเข้ากระเป๋า",
        reasonEn: "Log in to save this coupon code",
        onSuccess: async () => {
          await commitManualCode(code);
        },
      });
      return;
    }
    await commitManualCode(code);
  };

  const commitRecommendedClaim = async (deal: CouponDealDto): Promise<boolean> => {
    setClaimingId(deal.id);
    const res = await onClaimCoupon({ couponId: deal.id });
    setClaimingId(null);
    if (!res.success) {
      setFeedbackBanner({
        type: "error",
        text: res.message,
      });
      window.setTimeout(() => setFeedbackBanner(null), 3000);
    } else {
      setFeedbackBanner(null);
    }
    return res.success;
  };

  const handleClaimRecommended = async (
    deal: CouponDealDto
  ): Promise<boolean> => {
    if (!isAuthenticated) {
      onOpenAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อเก็บคูปองเข้ากระเป๋า",
        reasonEn: "Log in to collect this coupon",
        onSuccess: async () => {
          await commitRecommendedClaim(deal);
        },
      });
      return false;
    }
    return commitRecommendedClaim(deal);
  };

  const unclaimedDeals = recommendedDeals.filter(
    (d) => !claimedCouponIds.has(d.id) && d.isActive
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "กระเป๋าคูปอง" : "Coupon Wallet"}
      className="fixed inset-0 z-[92] flex items-end lg:items-stretch justify-center lg:justify-end overflow-hidden"
    >
      <div
        className="fixed inset-0 bg-black/45 animate-fade-in-backdrop"
        onClick={onClose}
      />

      {/* Mobile: Full-Width Slide-Up Bottom Sheet | Desktop: Crisp Right Drawer */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full h-[88dvh] rounded-t-[24px] lg:rounded-none lg:h-full lg:w-[440px] bg-[var(--color-background-popover)] border-t lg:border-t-0 lg:border-l border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet lg:animate-slide-in-right-drawer"
      >
        <div className="lg:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        <header className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2.5 shrink-0 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              data-coupon-wallet-drawer-target="true"
              className="h-9 w-9 rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="ty-subtitle truncate">
                {isTh ? "กระเป๋าคูปอง" : "Coupon Wallet"}
              </h2>
              {walletCoupons.length > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-[7px] bg-[var(--color-promo)] !text-white text-[11px] font-bold inline-flex items-center justify-center leading-none tabular-nums shrink-0">
                  {walletCoupons.length}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-4 sm:px-5 py-3 border-b border-[var(--color-border)] shrink-0 space-y-2">
          <form onSubmit={handleManualSubmit} className="flex items-stretch gap-2.5">
            <div className="flex-1 min-w-0">
              <StandardInput
                label={isTh ? "โค้ดส่วนลด" : "Coupon code"}
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                placeholder={
                  isTh ? "กรอกโค้ดเพื่อเก็บเข้ากระเป๋า..." : "Enter coupon code..."
                }
                className="uppercase font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCodeInput.trim() || isSubmittingCode}
              className="min-h-[56px] px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] ty-body font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-45 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isTh ? "เก็บโค้ด" : "Save"}</span>
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-[max(24px,env(safe-area-inset-bottom))] space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="ty-body font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-text-primary)]" />
                <span>
                  {isTh ? "คูปองในกระเป๋าของคุณ" : "Saved Coupons"}
                </span>
              </h3>
              <span className="ty-caption tabular-nums">
                {walletCoupons.length} {isTh ? "รายการ" : "items"}
              </span>
            </div>

            {!isAuthenticated ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5 text-center space-y-3">
                <p className="ty-body font-semibold">
                  {isTh
                    ? "เข้าสู่ระบบเพื่อเก็บคูปองข้ามโรงแรมไว้ในบัญชีของคุณ"
                    : "Sign in to save hotel coupons across devices"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onOpenAuthModal({
                      reasonTh: "เข้าสู่ระบบเพื่อเปิดใช้งานกระเป๋าคูปองของคุณ",
                      reasonEn: "Log in to access your coupon wallet",
                    })
                  }
                  className="h-10 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] ty-body font-semibold inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isTh ? "เข้าสู่ระบบ" : "Log in"}
                </button>
              </div>
            ) : walletCoupons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5 text-center space-y-1.5">
                <p className="ty-body font-semibold">
                  {isTh ? "ยังไม่มีคูปองในกระเป๋า" : "Your wallet is empty"}
                </p>
                <p className="ty-caption">
                  {isTh
                    ? "เลือกเก็บคูปองจากด้านล่างหรือหน้า /deal เพื่อใช้ลดเพิ่มตอนจอง"
                    : "Collect hotel vouchers below or on /deal to redeem at checkout"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {walletCoupons.map((coupon) => (
                  <HotelCouponTicketCard
                    key={coupon.id}
                    deal={coupon}
                    language={language}
                    variant="compact"
                    notchBgClass="bg-[var(--color-background-popover)]"
                    isClaimed={true}
                    onClaim={() => false}
                    onRemove={onRemoveCoupon}
                    onNavigateHotel={onClose}
                  />
                ))}
              </div>
            )}
          </section>

          {unclaimedDeals.length > 0 && (
            <section className="space-y-3 pt-2 border-t border-[var(--color-border)]">
              <h3 className="ty-body font-bold flex items-center gap-2 pt-2">
                <Sparkles className="w-4 h-4 text-[var(--color-text-primary)]" />
                <span>
                  {isTh
                    ? "คูปองแนะนำจากที่พักทั่วไทย"
                    : "Recommended Thailand Deals"}
                </span>
              </h3>

              <div className="space-y-3">
                {unclaimedDeals.slice(0, 6).map((coupon) => {
                  const isClaimed = claimedCouponIds.has(coupon.id);
                  return (
                    <HotelCouponTicketCard
                      key={`rec-${coupon.id}`}
                      deal={coupon}
                      language={language}
                      variant="compact"
                      notchBgClass="bg-[var(--color-background-popover)]"
                      isClaimed={isClaimed}
                      isClaiming={claimingId === coupon.id}
                      onClaim={(d) => handleClaimRecommended(d)}
                      onNavigateHotel={onClose}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
