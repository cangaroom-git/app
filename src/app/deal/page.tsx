"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { STAY_STYLE_TABS } from "@/data/thailandProvinces";
import { useHotelApp } from "@/components/HotelAppShell";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";
import type { CouponDealDto } from "@/types/cangaroom";

export default function DealMarketplacePage() {
  const {
    lang: language,
    user: currentUser,
    globalSearchQuery,
    setGlobalSearchQuery,
    walletCoupons,
    claimedCouponIds,
    claimCouponToWallet,
    openCouponWallet,
    openAuthModal,
  } = useHotelApp();

  const [activeStyleTab, setActiveStyleTab] = useState("all");
  const [deals, setDeals] = useState<CouponDealDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadDeals = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/deals", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { deals?: CouponDealDto[] };
        setDeals(data.deals || []);
      } catch {
        if (!silent) {
          setErrorMsg(
            language === "th"
              ? "ไม่สามารถโหลดรายการคูปองส่วนลดได้ในขณะนี้"
              : "Unable to load hotel coupons right now."
          );
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [language]
  );

  useEffect(() => {
    void loadDeals(false);
  }, [loadDeals, currentUser?.id]);

  const executeClaim = async (deal: CouponDealDto): Promise<boolean> => {
    setClaimingId(deal.id);
    setFeedbackBanner(null);
    const res = await claimCouponToWallet({ couponId: deal.id });
    setClaimingId(null);
    if (res.success) {
      void loadDeals(true);
    } else {
      setFeedbackBanner({
        type: "error",
        text: res.message,
      });
      window.setTimeout(() => setFeedbackBanner(null), 3200);
    }
    return res.success;
  };

  const handleClaim = async (deal: CouponDealDto): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อเก็บคูปองส่วนลดเข้ากระเป๋า",
        reasonEn: "Log in to save this coupon to your wallet",
        onSuccess: async () => {
          await executeClaim(deal);
        },
      });
      return false;
    }
    return executeClaim(deal);
  };

  // Zero-Dead-End Search Ranking on /deal: ranks exact matches first, then style/region matches, then all remaining deals
  const filteredDeals = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const baseList =
      activeStyleTab === "all" || q
        ? deals
        : deals.filter((d) => d.stayStyles.includes(activeStyleTab));

    if (!q) return baseList;

    const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
    const terms = tokens.length > 0 ? tokens : [q];

    return [...baseList].sort((a, b) => {
      const scoreDeal = (d: CouponDealDto) => {
        let sc = 0;
        const hotelTh = d.hotelNameTh.toLowerCase();
        const hotelEn = d.hotelNameEn.toLowerCase();
        const provTh = d.provinceNameTh.toLowerCase();
        const provEn = d.provinceNameEn.toLowerCase();
        const titleTh = d.titleTh.toLowerCase();
        const titleEn = d.titleEn.toLowerCase();
        const code = d.code.toLowerCase();

        if (code.includes(q) || hotelTh.includes(q) || hotelEn.includes(q)) {
          sc += 1000;
        }
        if (provTh.includes(q) || provEn.includes(q)) {
          sc += 850;
        }
        if (titleTh.includes(q) || titleEn.includes(q)) {
          sc += 650;
        }
        for (const t of terms) {
          if (hotelTh.includes(t) || hotelEn.includes(t)) sc += 300;
          if (provTh.includes(t) || provEn.includes(t)) sc += 260;
          if (titleTh.includes(t) || titleEn.includes(t)) sc += 180;
        }
        if (activeStyleTab !== "all" && d.stayStyles.includes(activeStyleTab)) {
          sc += 120;
        }
        return sc;
      };
      return scoreDeal(b) - scoreDeal(a);
    });
  }, [deals, activeStyleTab, globalSearchQuery]);

  const walletCount = Math.max(
    currentUser?.savedCouponsCount ?? 0,
    walletCoupons.length,
    claimedCouponIds.size
  );
  const hasActiveFilter =
    activeStyleTab !== "all" || Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    setActiveStyleTab("all");
    setGlobalSearchQuery("");
  };

  return (
    <div className="cgr-page-standard space-y-6">
      {/* Clean 1-Row Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ty-display">
            {language === "th" ? "คูปองส่วนลดที่พัก" : "Hotel Coupons"}
          </h1>
          <p className="ty-caption mt-0.5">
            {language === "th"
              ? `คูปองจองตรง 0% GP ทั้งหมด ${filteredDeals.length} รายการ · กดเก็บหน้าบัตรหรือพลิกดูเงื่อนไขได้เลย`
              : `${filteredDeals.length} direct-stay vouchers · Collect on front or flip for terms`}
          </p>
        </div>

        <button
          type="button"
          data-coupon-wallet-target="true"
          onClick={openCouponWallet}
          className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ty-body font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {language === "th" ? "กระเป๋าคูปองของฉัน" : "My Wallet"}
          </span>
          {walletCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-[7px] bg-[var(--color-promo)] !text-white text-[11px] font-bold inline-flex items-center justify-center leading-none tabular-nums">
              {walletCount}
            </span>
          )}
        </button>
      </header>

      {/* Single-Row Stay Style Underline Tabs (Matches Home /) */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-y-none no-scrollbar border-b border-[var(--color-border)]">
        {STAY_STYLE_TABS.map((tab) => {
          const isActive = activeStyleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStyleTab(tab.id)}
              className={`relative shrink-0 py-3 border-b-2 ty-body transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
            </button>
          );
        })}

        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto shrink-0 h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{language === "th" ? "ล้างการค้นหา" : "Reset"}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {feedbackBanner && (
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-muted)] px-4 py-2.5 ty-body font-semibold text-[var(--color-text-primary)]">
          {feedbackBanner.text}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-muted)] p-4 ty-body text-[var(--color-error)]">
          {errorMsg}
        </div>
      )}

      {/* Clean Minimalist 3-Column Coupon Ticket Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
          <h2 className="ty-title">
            {language === "th"
              ? "ไม่พบคูปองส่วนลดที่ตรงกับตัวกรองนี้"
              : "No active coupons match your filters"}
          </h2>
          <p className="ty-caption">
            {language === "th"
              ? "ลองเลือกดูทุกจังหวัด หรือแสดงทุกสไตล์ที่พัก"
              : "Try clearing province or stay style filters."}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-round-solid inline-flex"
            >
              {language === "th" ? "ดูคูปองทั้งหมด" : "Show All Coupons"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => {
            const isClaimed =
              deal.isClaimedByMe || claimedCouponIds.has(deal.id);
            return (
              <HotelCouponTicketCard
                key={deal.id}
                deal={deal}
                language={language}
                variant="grid"
                notchBgClass="bg-[var(--color-background-body)]"
                isClaimed={isClaimed}
                isClaiming={claimingId === deal.id}
                onClaim={(d) => handleClaim(d)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
