"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Info,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  getProvinceById,
  STAY_STYLE_TABS,
} from "@/data/thailandProvinces";
import { formatShortDate } from "@/lib/dateFormatters";
import { useHotelApp } from "@/components/HotelAppShell";
import type { CouponDealDto } from "@/types/cangaroom";

export default function DealMarketplacePage() {
  const router = useRouter();
  const {
    lang: language,
    user: currentUser,
    selectedProvinceId,
    setSelectedProvinceId,
    globalSearchQuery,
    setGlobalSearchQuery,
    walletCoupons,
    claimCouponToWallet,
    openCouponWallet,
  } = useHotelApp();

  const [activeStyleTab, setActiveStyleTab] = useState("all");
  const [deals, setDeals] = useState<CouponDealDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set());

  const loadDeals = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      if (selectedProvinceId) qs.set("provinceId", selectedProvinceId);
      const res = await fetch(`/api/deals?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { deals?: CouponDealDto[] };
      setDeals(data.deals || []);
    } catch {
      setErrorMsg(
        language === "th"
          ? "ไม่สามารถโหลดรายการคูปองส่วนลดได้ในขณะนี้"
          : "Unable to load hotel coupons right now."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvinceId, language]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals, currentUser?.id]);

  const handleCopyCode = async (
    e: React.MouseEvent,
    code: string
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleClaim = async (
    e: React.MouseEvent,
    deal: CouponDealDto
  ) => {
    e.stopPropagation();
    if (!currentUser) {
      router.push("/login?callbackUrl=/deal");
      return;
    }
    setClaimingId(deal.id);
    setFeedbackBanner(null);
    const res = await claimCouponToWallet({ couponId: deal.id });
    setClaimingId(null);
    setFeedbackBanner({
      type: res.success ? "success" : "error",
      text: res.message,
    });
    if (res.success) {
      await loadDeals();
    }
    window.setTimeout(() => setFeedbackBanner(null), 3200);
  };

  const toggleFlip = (dealId: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  const filteredDeals = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const list = deals.filter((d) => {
      if (activeStyleTab !== "all" && !d.stayStyles.includes(activeStyleTab)) {
        return false;
      }
      if (q) {
        const hay = [
          d.code,
          d.titleTh,
          d.titleEn,
          d.hotelNameTh,
          d.hotelNameEn,
          d.provinceNameTh,
          d.provinceNameEn,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list;
  }, [deals, activeStyleTab, globalSearchQuery]);

  const walletCount = currentUser?.savedCouponsCount ?? walletCoupons.length;
  const activeProvince = selectedProvinceId
    ? getProvinceById(selectedProvinceId)
    : null;
  const hasActiveFilter =
    activeStyleTab !== "all" ||
    Boolean(selectedProvinceId) ||
    Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    setActiveStyleTab("all");
    setSelectedProvinceId(null);
    setGlobalSearchQuery("");
  };

  const renderNotches = (emphasized = false) => {
    const borderClass = emphasized
      ? "border-[var(--color-border-emphasized)]"
      : "border-[var(--color-border)]";
    return (
      <>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -left-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[20px] rounded-r-full bg-[var(--color-background-body)] border-y border-r ${borderClass} z-10`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[20px] rounded-l-full bg-[var(--color-background-body)] border-y border-l ${borderClass} z-10`}
        />
      </>
    );
  };

  const renderFlipCouponCard = (deal: CouponDealDto) => {
    const isFlipped = flippedIds.has(deal.id);
    const discountHeadline =
      deal.discountType === "PERCENT"
        ? language === "th"
          ? `ลด ${deal.discountValue}%`
          : `${deal.discountValue}% OFF`
        : language === "th"
        ? `ลด ฿${deal.discountValue.toLocaleString()}`
        : `฿${deal.discountValue.toLocaleString()} OFF`;

    const hotelName = language === "th" ? deal.hotelNameTh : deal.hotelNameEn;
    const provinceName =
      language === "th" ? deal.provinceNameTh : deal.provinceNameEn;
    const logoSrc = deal.hotelLogoUrl || deal.coverImageUrl || "";

    const minSpendText =
      deal.minSpendThb > 0
        ? language === "th"
          ? `ยอดจองขั้นต่ำ ฿${deal.minSpendThb.toLocaleString()}`
          : `Min spend ฿${deal.minSpendThb.toLocaleString()}`
        : language === "th"
        ? "ไม่มีขั้นต่ำในการจอง"
        : "No minimum spend";

    const capText = deal.maxDiscountThb
      ? language === "th"
        ? `ลดสูงสุด ฿${deal.maxDiscountThb.toLocaleString()}`
        : `Max ฿${deal.maxDiscountThb.toLocaleString()}`
      : null;

    const quotaText =
      deal.totalQuota && deal.totalQuota > 0
        ? language === "th"
          ? `เหลือ ${Math.max(0, deal.totalQuota - deal.claimedCount)}/${
              deal.totalQuota
            } สิทธิ์`
          : `${Math.max(0, deal.totalQuota - deal.claimedCount)}/${
              deal.totalQuota
            } left`
        : language === "th"
        ? "ไม่จำกัดสิทธิ์"
        : "Unlimited uses";

    return (
      <div key={deal.id} className="cgr-flip-scene h-[168px] select-none">
        <div className={`cgr-flip-card ${isFlipped ? "is-flipped" : ""}`}>
          {/* ===============================================================
              FRONT FACE — Minimal Zen Coupon (Logo | Dashed | Value + Hotel + Date)
          =============================================================== */}
          <article
            role="button"
            tabIndex={0}
            aria-label={`${discountHeadline} ${hotelName}`}
            onClick={() => toggleFlip(deal.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleFlip(deal.id);
              }
            }}
            className="cgr-flip-face rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] hover:border-[var(--color-border-emphasized)] transition-colors flex items-center cursor-pointer"
          >
            {renderNotches(false)}

            {/* Left Brand Logo Zone */}
            <div className="w-[104px] shrink-0 h-full flex items-center justify-center pl-4 pr-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={hotelName}
                  className="h-14 w-14 rounded-full object-cover border border-[var(--color-border)] bg-[var(--color-background-muted)]"
                />
              ) : (
                <span className="h-14 w-14 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center ty-title font-bold">
                  {hotelName[0] || "C"}
                </span>
              )}
            </div>

            {/* Vertical Dashed Perforation */}
            <div
              aria-hidden="true"
              className="h-[72%] border-l border-dashed border-[var(--color-border-emphasized)] shrink-0"
            />

            {/* Right Clean Value Zone (Strictly 3 Lines) */}
            <div className="flex-1 min-w-0 px-5 py-4 h-full flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[22px] leading-tight font-extrabold tracking-tight text-[var(--color-text-primary)] truncate">
                  {discountHeadline}
                </p>
                {deal.isClaimedByMe && (
                  <span className="shrink-0 h-5 px-2 rounded-full bg-[var(--color-background-muted)] text-[11px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{language === "th" ? "เก็บแล้ว" : "Saved"}</span>
                  </span>
                )}
              </div>

              <p className="text-[15px] font-medium text-[var(--color-text-primary)] truncate">
                {hotelName}
              </p>

              <div className="pt-1.5 flex items-center justify-between gap-2 text-[12px] text-[var(--color-text-secondary)]">
                <span className="truncate">
                  {language === "th"
                    ? `ใช้ได้ถึง ${formatShortDate(deal.expiresAt, language)}`
                    : `Valid until ${formatShortDate(deal.expiresAt, language)}`}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center gap-1 text-[var(--color-text-secondary)]"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </article>

          {/* ===============================================================
              BACK FACE — Conditions, Promo Code & Claim/Redeem CTA
          =============================================================== */}
          <article
            onClick={() => toggleFlip(deal.id)}
            className="cgr-flip-face cgr-flip-face-back rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] px-5 py-3.5 flex flex-col justify-between cursor-pointer"
          >
            {renderNotches(true)}

            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] truncate">
                {language === "th" ? deal.titleTh : deal.titleEn}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFlip(deal.id);
                }}
                aria-label={language === "th" ? "พลิกกลับ" : "Flip back"}
                className="h-6 w-6 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <ul className="space-y-0.5 text-[12px] leading-[1.45] text-[var(--color-text-secondary)]">
              <li className="truncate">
                • {minSpendText}
                {capText ? ` · ${capText}` : ""}
              </li>
              <li className="truncate">
                • {quotaText} · {provinceName} (0% GP)
              </li>
            </ul>

            <div className="pt-2.5 border-t border-dashed border-[var(--color-border-emphasized)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => handleCopyCode(e, deal.code)}
                title={
                  language === "th" ? "คัดลอกโค้ดส่วนลด" : "Copy promo code"
                }
                className="h-8 px-2.5 rounded-[8px] border border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] font-mono text-[12px] font-bold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 min-w-0 cursor-pointer transition-colors"
              >
                <span className="truncate">{deal.code}</span>
                {copiedCode === deal.code ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                )}
              </button>

              <div
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/${deal.hotelSlug}`}
                  title={hotelName}
                  aria-label={hotelName}
                  className="h-8 w-8 rounded-[8px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                {deal.isClaimedByMe ? (
                  <Link
                    href={`/${deal.hotelSlug}?coupon=${encodeURIComponent(
                      deal.code
                    )}`}
                    className="h-8 px-3.5 rounded-[8px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[12px] font-semibold inline-flex items-center gap-1 transition-opacity"
                  >
                    <span>{language === "th" ? "ใช้โค้ด" : "Redeem"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={claimingId === deal.id}
                    onClick={(e) => handleClaim(e, deal)}
                    className="h-8 px-3.5 rounded-[8px] bg-[#111111] hover:opacity-90 dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-opacity"
                  >
                    <span>
                      {claimingId === deal.id
                        ? language === "th"
                          ? "กำลังเก็บ..."
                          : "Saving..."
                        : language === "th"
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
              ? `คูปองจองตรง 0% GP ทั้งหมด ${filteredDeals.length} รายการ · คลิกที่การ์ดเพื่อพลิกดูเงื่อนไข`
              : `${filteredDeals.length} direct-stay vouchers · Click any card to flip for details`}
          </p>
        </div>

        <button
          type="button"
          onClick={openCouponWallet}
          className="h-10 px-4 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ty-body font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {language === "th" ? "กระเป๋าคูปองของฉัน" : "My Wallet"}
          </span>
          {walletCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-promo)] !text-white text-[11px] font-bold inline-flex items-center justify-center leading-none">
              {walletCount}
            </span>
          )}
        </button>
      </header>

      {/* Single-Row Stay Style Underline Tabs (Matches Home /) */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
        {STAY_STYLE_TABS.map((tab) => {
          const isActive = activeStyleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStyleTab(tab.id)}
              className={`relative shrink-0 py-3 -mb-px border-b-2 ty-body transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
            </button>
          );
        })}

        {(activeProvince || hasActiveFilter) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto shrink-0 h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>
              {activeProvince
                ? language === "th"
                  ? `${activeProvince.nameTh} · ล้างตัวกรอง`
                  : `${activeProvince.nameEn} · Reset`
                : language === "th"
                ? "ล้างตัวกรอง"
                : "Reset"}
            </span>
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
              className="h-[168px] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse"
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
          {filteredDeals.map((deal) => renderFlipCouponCard(deal))}
        </div>
      )}
    </div>
  );
}
