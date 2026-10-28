"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Gift,
  Percent,
  ShoppingBag,
  Tag,
  Utensils,
} from "lucide-react";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import { StandardButton, StatusPill } from "@/components/ui/standards";

const FALLBACK_COUPON_IMAGES = [
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
];

const DIRECT_BOOKING_PRIVILEGES = [
  {
    titleTh: "ฟรี อาหารเช้า & ดริปกาแฟ",
    titleEn: "Complimentary Breakfast & Drip Coffee",
    descTh: "เสิร์ฟถึงระเบียงวิลล่าส่วนตัวทุกเช้า พร้อมชมทะเลหมอก",
    descEn:
      "Served daily to your private villa terrace overlooking the mist",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    badgeTh: "ฟรีทุกห้อง",
    badgeEn: "COMPLIMENTARY",
  },
  {
    titleTh: "ล็อคห้องพัก 15 นาทีด้วย QR",
    titleEn: "Instant 15-Minute Room Hold via QR",
    descTh: "ระบบสแกนตรวจสอบสลิปอัตโนมัติ ป้องกันการจองซ้อน 100%",
    descEn:
      "Automated slip QR verification prevents double bookings 100%",
    imageUrl:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
    badgeTh: "ล็อคห้องทันที",
    badgeEn: "INSTANT HOLD",
  },
  {
    titleTh: "เลื่อนวันเข้าพักฟรี 1 ครั้ง",
    titleEn: "1 Free Date Change",
    descTh: "แจ้งล่วงหน้าอย่างน้อย 7 วันก่อนเช็คอิน ไม่มีค่าธรรมเนียม",
    descEn:
      "Modify stay dates once free of charge up to 7 days before arrival",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    badgeTh: "ยืดหยุ่นวันพัก",
    badgeEn: "FLEXIBLE STAY",
  },
];

export default function DealPage() {
  const {
    coupons,
    addons,
    seasonalRates,
    lang: language,
    checkIn,
    checkOut,
    nights: stayNights,
    guests: guestCount,
    savedCouponCodes,
    openCouponWallet,
    saveCouponToWallet,
    claimAndApplyCoupon,
    appliedCouponCode,
    selectedAddons,
    toggleAddon,
    navigateToTab,
  } = useHotelApp();

  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [recentBagFeedback, setRecentBagFeedback] = useState<string | null>(
    null
  );

  const activeCoupons = coupons.filter((coupon) => coupon.isActive);
  const activeDiningAddons = addons.filter((addon) => addon.isActive);
  const savedCodesUpperSet = new Set(
    savedCouponCodes.map((code) => code.toUpperCase())
  );

  const handleCopyCouponCode = (
    event: React.MouseEvent,
    couponCode: string
  ) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(couponCode);
    }
    const result = saveCouponToWallet(couponCode);
    setRecentBagFeedback(result.message);
    setCopiedCouponCode(couponCode);
    setTimeout(() => setCopiedCouponCode(null), 1800);
    setTimeout(() => setRecentBagFeedback(null), 2600);
  };

  const handleCouponActionClick = (couponCode: string, isSavedInBag: boolean) => {
    if (!isSavedInBag) {
      const result = saveCouponToWallet(couponCode);
      setRecentBagFeedback(result.message);
      setTimeout(() => setRecentBagFeedback(null), 2600);
      return;
    }

    claimAndApplyCoupon(couponCode);
    navigateToTab("book");
  };

  return (
    <>
      {/* 1. Direct Booking Coupons (#c53829 Promo Standard — Open Canvas, 1-Layer Cards) */}
      <section id="offers" className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ty-title flex items-center gap-2 truncate">
                <Tag className="w-5 h-5 text-[var(--color-promo-text)] shrink-0" />
                <span className="truncate">
                  {language === "th"
                    ? `คูปองส่วนลดจองตรง (${activeCoupons.length})`
                    : `Direct Booking Coupons (${activeCoupons.length})`}
                </span>
              </h1>
              {appliedCouponCode && (
                <StatusPill variant="promo">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {language === "th"
                      ? `กำลังใช้: ${appliedCouponCode}`
                      : `Active: ${appliedCouponCode}`}
                  </span>
                </StatusPill>
              )}
            </div>
            <p className="ty-caption truncate mt-0.5">
              {recentBagFeedback ? (
                <span className="font-semibold text-[var(--color-promo-text)]">
                  ✓ {recentBagFeedback}
                </span>
              ) : language === "th" ? (
                `เข้าพัก ${formatShortDate(
                  checkIn,
                  language
                )} – ${formatShortDate(checkOut, language)} (${stayNights} คืน · ${guestCount} ท่าน)`
              ) : (
                `Stay ${formatShortDate(
                  checkIn,
                  language
                )} – ${formatShortDate(checkOut, language)} (${stayNights}N · ${guestCount} guests)`
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StandardButton
              variant="promo"
              size="md"
              onClick={openCouponWallet}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `กระเป๋าคูปอง (${savedCouponCodes.length})`
                  : `Coupon Bag (${savedCouponCodes.length})`}
              </span>
            </StandardButton>

            <button
              type="button"
              onClick={() => navigateToTab("book")}
              className="hidden sm:inline-flex btn-fw-secondary shrink-0 cursor-pointer"
            >
              <span>
                {language === "th" ? "เลือกห้องพัก →" : "Browse Rooms →"}
              </span>
            </button>
          </div>
        </header>

        <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
          {activeCoupons.map((couponItem, couponIndex) => {
            const isApplied = appliedCouponCode === couponItem.code;
            const isSavedInBag = savedCodesUpperSet.has(
              couponItem.code.toUpperCase()
            );
            const isCopied = copiedCouponCode === couponItem.code;

            return (
              <article
                key={couponItem.id}
                onClick={() =>
                  handleCouponActionClick(couponItem.code, isSavedInBag)
                }
                className={`group snap-start shrink-0 w-[268px] sm:w-auto rounded-[16px] overflow-hidden flex flex-col justify-between cursor-pointer transition ${
                  isApplied
                    ? "ring-2 ring-[var(--color-promo)] bg-[var(--color-promo-muted)]/35"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75"
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden bg-[var(--color-background-subtle)]">
                  <img
                    src={
                      couponItem.imageUrl ||
                      FALLBACK_COUPON_IMAGES[
                        couponIndex % FALLBACK_COUPON_IMAGES.length
                      ]
                    }
                    alt={
                      language === "th"
                        ? couponItem.titleTh
                        : couponItem.titleEn || couponItem.titleTh
                    }
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isSavedInBag && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-md text-white px-2.5 py-0.5 ty-caption font-semibold">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{language === "th" ? "ในกระเป๋า" : "In Bag"}</span>
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge-promo">
                        {couponItem.discountType === "PERCENT"
                          ? language === "th"
                            ? `ลด ${couponItem.discountValue}%`
                            : `${couponItem.discountValue}% OFF`
                          : language === "th"
                          ? `ลด ฿${couponItem.discountValue.toLocaleString()}`
                          : `฿${couponItem.discountValue.toLocaleString()} OFF`}
                      </span>

                      <button
                        type="button"
                        onClick={(event) =>
                          handleCopyCouponCode(event, couponItem.code)
                        }
                        className="shrink-0 inline-flex items-center gap-1 ty-caption font-mono font-bold text-[var(--color-promo-text)] hover:underline cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>
                          {isCopied
                            ? language === "th"
                              ? "คัดลอกแล้ว"
                              : "Copied"
                            : couponItem.code}
                        </span>
                      </button>
                    </div>

                    <h3 className="ty-body font-bold text-[var(--color-text-primary)] line-clamp-2">
                      {language === "th"
                        ? couponItem.titleTh
                        : couponItem.titleEn || couponItem.titleTh}
                    </h3>
                    <p className="ty-caption">
                      {language === "th"
                        ? `ยอดขั้นต่ำ ฿${couponItem.minSpendThb.toLocaleString()}`
                        : `Min. spend ฿${couponItem.minSpendThb.toLocaleString()}`}
                    </p>
                  </div>

                  <StandardButton
                    variant={isApplied ? "secondary" : "promo"}
                    size="md"
                    className={`w-full ${
                      isApplied
                        ? "!bg-[var(--color-success-muted)] !text-[var(--color-success)]"
                        : isSavedInBag
                        ? "!bg-[var(--color-promo-muted)] !text-[var(--color-promo-text)]"
                        : ""
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? `กำลังใช้ ${couponItem.code}`
                            : `${couponItem.code} Active`}
                        </span>
                      </>
                    ) : isSavedInBag ? (
                      <>
                        <span>
                          {language === "th"
                            ? `ใช้คูปอง ${couponItem.code}`
                            : `Use ${couponItem.code}`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? "เก็บเข้ากระเป๋า"
                            : "Save to Bag"}
                        </span>
                      </>
                    )}
                  </StandardButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. In-Villa Dining & Wellness Promotions (#c53829 Deals) */}
      <section id="dining-promotions" className="space-y-4">
        <header>
          <h2 className="ty-title flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[var(--color-promo-text)] shrink-0" />
            <span>
              {language === "th"
                ? "โปรโมชั่นหมูกระทะริมระเบียง & สปาส่วนตัว"
                : "Terrace Dining & In-Villa Spa Deals"}
            </span>
          </h2>
          <p className="ty-caption mt-0.5">
            {language === "th"
              ? "ราคาพิเศษสำหรับลูกค้าจองตรง เสิร์ฟถึงระเบียงวิลล่า"
              : "Special direct-booking packages served to your private deck"}
          </p>
        </header>

        <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
          {activeDiningAddons.map((addonPromo) => {
            const isSelectedForStay = selectedAddons.includes(addonPromo.id);
            const originalPriceThb = Math.round(addonPromo.priceThb * 1.25);
            const discountPercent = Math.round(
              ((originalPriceThb - addonPromo.priceThb) / originalPriceThb) *
                100
            );

            return (
              <article
                key={addonPromo.id}
                onClick={() => {
                  if (!isSelectedForStay) {
                    toggleAddon(addonPromo.id);
                  }
                  navigateToTab("book");
                }}
                className="group snap-start shrink-0 w-[268px] sm:w-auto rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75 overflow-hidden flex flex-col justify-between cursor-pointer transition"
              >
                <img
                  src={
                    addonPromo.imageUrl ||
                    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={
                    language === "th"
                      ? addonPromo.nameTh
                      : addonPromo.nameEn || addonPromo.nameTh
                  }
                  className="h-36 w-full object-cover bg-[var(--color-background-subtle)] transition-transform duration-300 group-hover:scale-105"
                />

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge-promo">
                        {language === "th"
                          ? `ลด ${discountPercent}%`
                          : `-${discountPercent}%`}
                      </span>
                      <span className="ty-caption font-medium truncate">
                        {language === "th"
                          ? addonPromo.unitTh
                          : addonPromo.unitEn || addonPromo.unitTh}
                      </span>
                    </div>
                    <h3 className="ty-body font-bold text-[var(--color-text-primary)] line-clamp-1">
                      {language === "th"
                        ? addonPromo.nameTh
                        : addonPromo.nameEn || addonPromo.nameTh}
                    </h3>
                    <p className="ty-caption line-clamp-2">
                      {language === "th"
                        ? addonPromo.descTh
                        : addonPromo.descEn || addonPromo.descTh}
                    </p>
                    <div className="pt-0.5 flex items-baseline gap-2">
                      <span className="ty-subtitle font-bold text-[var(--color-promo-text)]">
                        ฿{addonPromo.priceThb.toLocaleString()}
                      </span>
                      <span className="ty-caption line-through">
                        ฿{originalPriceThb.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <StandardButton
                    variant={isSelectedForStay ? "secondary" : "promo"}
                    size="md"
                    className={`w-full ${
                      isSelectedForStay
                        ? "!bg-[var(--color-success-muted)] !text-[var(--color-success)]"
                        : ""
                    }`}
                  >
                    {isSelectedForStay ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {language === "th" ? "รับสิทธิ์แล้ว" : "Added to Stay"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {language === "th"
                            ? "รับโปรโมชั่นนี้"
                            : "Claim Offer"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </StandardButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. Direct Booking Privileges & Seasonal Rate Tiers */}
      <section className="space-y-5">
        <header>
          <h2 className="ty-title flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            <span>
              {language === "th"
                ? "สิทธิพิเศษเมื่อจองตรงผ่านเว็บที่พัก"
                : "Direct Booking Privileges"}
            </span>
          </h2>
          <p className="ty-caption mt-0.5">
            {language === "th"
              ? "การันตีราคาดีที่สุด พร้อมบริการดูแลตลอดการเข้าพัก"
              : "Best rate guarantee with personalized concierge care"}
          </p>
        </header>

        <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {DIRECT_BOOKING_PRIVILEGES.map((privilege) => (
            <article
              key={privilege.titleEn}
              className="snap-start shrink-0 w-[268px] sm:w-auto rounded-[16px] bg-[var(--color-background-muted)] overflow-hidden flex flex-col"
            >
              <img
                src={privilege.imageUrl}
                alt={language === "th" ? privilege.titleTh : privilege.titleEn}
                className="h-36 w-full object-cover bg-[var(--color-background-subtle)]"
              />
              <div className="p-4 space-y-1">
                <span className="ty-caption font-bold text-[var(--color-accent)]">
                  {language === "th" ? privilege.badgeTh : privilege.badgeEn}
                </span>
                <h3 className="ty-body font-bold text-[var(--color-text-primary)]">
                  {language === "th" ? privilege.titleTh : privilege.titleEn}
                </h3>
                <p className="ty-caption">
                  {language === "th" ? privilege.descTh : privilege.descEn}
                </p>
              </div>
            </article>
          ))}
        </div>

        {seasonalRates.some((season) => season.isActive) && (
          <div className="space-y-3 pt-1">
            <h3 className="ty-body font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
              <Percent className="w-4 h-4 text-[var(--color-promo-text)]" />
              <span>
                {language === "th"
                  ? "ตารางเรทราคาตามฤดูกาล"
                  : "Seasonal Rate Tiers"}
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {seasonalRates
                .filter((season) => season.isActive)
                .map((seasonRule) => {
                  const isDiscountTier =
                    seasonRule.adjustmentType === "PERCENT_DISCOUNT";
                  return (
                    <div
                      key={seasonRule.id}
                      className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                          {language === "th"
                            ? seasonRule.nameTh
                            : seasonRule.nameEn}
                        </p>
                        <p className="ty-caption flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                          <span>
                            {formatShortDate(seasonRule.startDate, language)} –{" "}
                            {formatShortDate(seasonRule.endDate, language)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={
                          isDiscountTier
                            ? "badge-promo shrink-0"
                            : "ty-caption font-bold text-[var(--color-accent)] shrink-0"
                        }
                      >
                        {language === "th"
                          ? seasonRule.badgeTh
                          : seasonRule.badgeEn || seasonRule.badgeTh}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
