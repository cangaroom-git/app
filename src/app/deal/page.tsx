"use client";

import React, { useState } from "react";
import {
  Tag,
  Check,
  Copy,
  ArrowRight,
  Calendar,
  Percent,
  Gift,
  Utensils,
} from "lucide-react";
import { useHotelApp, formatShortDate } from "@/components/HotelAppShell";

export default function DealPage() {
  const {
    coupons,
    addons,
    seasonalRates,
    lang,
    checkIn,
    checkOut,
    nights,
    guests,
    appliedCouponCode,
    handleApplyCoupon,
    selectedAddons,
    toggleAddon,
    navigateToTab,
  } = useHotelApp();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeCoupons = coupons.filter((c) => c.isActive);
  const activeDiningPromos = addons.filter((a) => a.isActive);

  const fallbackPhotos = [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
  ];

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    handleApplyCoupon(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="px-3.5 sm:px-4 lg:px-0 py-3 sm:py-4 space-y-8">
      {/* =====================================================================
          CATEGORY 1: EXCLUSIVE DIRECT BOOKING COUPONS
          - Categorized Card Slider / 3-Col Grid: flex gap-3 md:grid md:grid-cols-3 md:gap-3
          - Clean top image per card (no gradient, no text on image)
      ====================================================================== */}
      <section id="offers" className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="fw-head-icon shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="ty-title truncate">
                  {lang === "th"
                    ? `คูปองส่วนลดพิเศษสำหรับการจองตรง (${activeCoupons.length})`
                    : `Exclusive Direct Booking Coupons (${activeCoupons.length})`}
                </h1>
                {appliedCouponCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 py-0.5 text-[11px] font-bold">
                    <Check className="w-3 h-3" />
                    <span>
                      {lang === "th"
                        ? `กำลังใช้: ${appliedCouponCode}`
                        : `Active: ${appliedCouponCode}`}
                    </span>
                  </span>
                )}
              </div>
              <p className="ty-caption truncate">
                {lang === "th"
                  ? `เข้าพัก ${formatShortDate(checkIn, lang)} – ${formatShortDate(
                      checkOut,
                      lang
                    )} (${nights} คืน · ${guests} ท่าน)`
                  : `Stay ${formatShortDate(checkIn, lang)} – ${formatShortDate(
                      checkOut,
                      lang
                    )} (${nights} nights · ${guests} guests)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateToTab("book")}
            className="btn-fw-secondary shrink-0"
          >
            <span>
              {lang === "th" ? "ไปหน้าจองห้องพัก →" : "Browse Rooms →"}
            </span>
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3">
          {activeCoupons.map((offer, idx) => {
            const isApplied = appliedCouponCode === offer.code;
            const isCopied = copiedCode === offer.code;

            return (
              <div
                key={offer.id}
                onClick={() => {
                  handleApplyCoupon(offer.code);
                  navigateToTab("book");
                }}
                className="group snap-start shrink-0 w-[265px] sm:w-[290px] md:w-auto rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between cursor-pointer transition hover:border-[var(--color-border-emphasized)]"
              >
                <div>
                  <div className="relative h-36 w-full overflow-hidden bg-[var(--color-background-muted)]">
                    <img
                      src={
                        offer.imageUrl ||
                        fallbackPhotos[idx % fallbackPhotos.length]
                      }
                      alt={lang === "th" ? offer.titleTh : offer.titleEn}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2.5 py-0.5 text-[11px] font-bold">
                        {offer.discountType === "PERCENT"
                          ? lang === "th"
                            ? `ลด ${offer.discountValue}%`
                            : `${offer.discountValue}% OFF`
                          : lang === "th"
                          ? `ลด ฿${offer.discountValue.toLocaleString()}`
                          : `฿${offer.discountValue.toLocaleString()} OFF`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(e, offer.code)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] border border-[var(--color-border)] px-2.5 py-0.5 text-[11px] font-mono font-bold hover:opacity-80 transition cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>
                          {isCopied
                            ? lang === "th"
                              ? "คัดลอกแล้ว"
                              : "Copied"
                            : offer.code}
                        </span>
                      </button>
                    </div>
                    <h3 className="ty-body font-bold line-clamp-2">
                      {lang === "th" ? offer.titleTh : offer.titleEn}
                    </h3>
                    <p className="ty-caption">
                      {lang === "th"
                        ? `ขั้นต่ำ ฿${offer.minSpendThb.toLocaleString()}`
                        : `Min. spend ฿${offer.minSpendThb.toLocaleString()}`}
                    </p>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5">
                  <span
                    className={`w-full rounded-full py-2 px-3 text-[12px] font-semibold flex items-center justify-center gap-1.5 ${
                      isApplied
                        ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                        : "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    }`}
                  >
                    <span>
                      {isApplied
                        ? lang === "th"
                          ? `✓ ใช้โค้ด ${offer.code} แล้ว`
                          : `✓ Code ${offer.code} Applied`
                        : lang === "th"
                        ? `เก็บโค้ด ${offer.code}`
                        : `Apply Code ${offer.code}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          CATEGORY 2: IN-VILLA DINING & WELLNESS PROMOTIONS
          - Categorized Card Slider / 3-Col Grid: flex gap-3 md:grid md:grid-cols-3 md:gap-3
          - Clean top image per card (no gradient, no text on image)
      ====================================================================== */}
      <section id="dining-promotions" className="space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="fw-head-icon shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="ty-title">
              {lang === "th"
                ? "โปรโมชั่นชุดหมูกระทะริมระเบียง & สปาส่วนตัว"
                : "Private Terrace Dining & In-Villa Spa Offers"}
            </h2>
            <p className="ty-caption">
              {lang === "th"
                ? "สิทธิพิเศษสำหรับผู้เข้าพักจองตรง เสิร์ฟถึงระเบียงวิลล่าส่วนตัว"
                : "Exclusive pre-order packages served directly to your private villa deck"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3">
          {activeDiningPromos.map((promo) => {
            const isClaimed = selectedAddons.includes(promo.id);
            const originalPrice = Math.round(promo.priceThb * 1.25);
            const discountPct = Math.round(
              ((originalPrice - promo.priceThb) / originalPrice) * 100
            );

            return (
              <div
                key={promo.id}
                onClick={() => {
                  if (!isClaimed) {
                    toggleAddon(promo.id);
                  }
                  navigateToTab("book");
                }}
                className="group snap-start shrink-0 w-[265px] sm:w-[290px] md:w-auto rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between cursor-pointer transition hover:border-[var(--color-border-emphasized)]"
              >
                <div>
                  <div className="relative h-36 w-full overflow-hidden bg-[var(--color-background-muted)]">
                    <img
                      src={
                        promo.imageUrl ||
                        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={lang === "th" ? promo.nameTh : promo.nameEn}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 py-0.5 text-[11px] font-bold">
                        {lang === "th"
                          ? `โปรลด ${discountPct}%`
                          : `SAVE ${discountPct}%`}
                      </span>
                      <span className="ty-caption font-medium truncate">
                        {lang === "th" ? promo.unitTh : promo.unitEn}
                      </span>
                    </div>
                    <h3 className="ty-body font-bold line-clamp-1">
                      {lang === "th" ? promo.nameTh : promo.nameEn}
                    </h3>
                    <p className="ty-caption line-clamp-2">
                      {lang === "th" ? promo.descTh : promo.descEn}
                    </p>
                    <div className="pt-1 flex items-baseline gap-2">
                      <span className="ty-subtitle font-bold">
                        ฿{promo.priceThb.toLocaleString()}
                      </span>
                      <span className="ty-caption line-through">
                        ฿{originalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5">
                  <span
                    className={`w-full rounded-full py-2 px-3 text-[12px] font-semibold flex items-center justify-center gap-1.5 ${
                      isClaimed
                        ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                        : "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    }`}
                  >
                    <span>
                      {isClaimed
                        ? lang === "th"
                          ? "✓ รับสิทธิ์แล้ว"
                          : "✓ Added to Stay"
                        : lang === "th"
                        ? "รับสิทธิ์โปรโมชั่นนี้"
                        : "Add to My Stay"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          CATEGORY 3: DIRECT BOOKING PRIVILEGES & SEASONAL RATE TIERS
          - Categorized Card Slider / 3-Col Grid: flex gap-3 md:grid md:grid-cols-3 md:gap-3
      ====================================================================== */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="fw-head-icon shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="ty-title">
              {lang === "th"
                ? "สิทธิพิเศษเมื่อจองตรงผ่านเว็บที่พัก"
                : "Direct Booking Privileges"}
            </h2>
            <p className="ty-caption">
              {lang === "th"
                ? "การันตีราคาดีที่สุด พร้อมบริการดูแลตลอดการเข้าพัก"
                : "100% Best Rate Guarantee with personalized concierge care"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3">
          {[
            {
              titleTh: "ฟรี อาหารเช้า & ดริปกาแฟ",
              titleEn: "Complimentary Breakfast & Drip Coffee",
              descTh: "เสิร์ฟถึงระเบียงวิลล่าส่วนตัวทุกเช้า พร้อมชมทะเลหมอก",
              descEn:
                "Served daily to your private villa terrace overlooking the morning mist",
              img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
              badgeTh: "ฟรีสำหรับทุกห้อง",
              badgeEn: "COMPLIMENTARY",
            },
            {
              titleTh: "ล็อคห้องพัก 15 นาทีด้วย QR",
              titleEn: "Instant 15-Minute Room Hold via QR",
              descTh: "ระบบสแกนตรวจสอบสลิปอัตโนมัติ ป้องกันการจองซ้อน 100%",
              descEn:
                "Automated bank slip QR verification prevents double bookings 100%",
              img: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
              badgeTh: "ล็อคห้องทันที",
              badgeEn: "INSTANT HOLD",
            },
            {
              titleTh: "เลื่อนวันเข้าพักฟรี 1 ครั้ง",
              titleEn: "1 Free Date Change",
              descTh: "แจ้งล่วงหน้าอย่างน้อย 7 วันก่อนเช็คอิน ไม่มีค่าธรรมเนียม",
              descEn:
                "Modify your stay dates once free of charge up to 7 days before arrival",
              img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
              badgeTh: "ยืดหยุ่นวันพัก",
              badgeEn: "FLEXIBLE STAY",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[265px] sm:w-[290px] md:w-auto rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col"
            >
              <div className="h-32 w-full overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={item.img}
                  alt={lang === "th" ? item.titleTh : item.titleEn}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5 space-y-1">
                <span className="inline-block rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-text-secondary)]">
                  {lang === "th" ? item.badgeTh : item.badgeEn}
                </span>
                <h3 className="ty-body font-bold pt-0.5">
                  {lang === "th" ? item.titleTh : item.titleEn}
                </h3>
                <p className="ty-caption">
                  {lang === "th" ? item.descTh : item.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>

        {seasonalRates.filter((s) => s.isActive).length > 0 && (
          <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              <span className="ty-body font-bold">
                {lang === "th"
                  ? "ตารางเรทราคาตามฤดูกาล"
                  : "Seasonal Rate Tiers"}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3">
              {seasonalRates
                .filter((s) => s.isActive)
                .map((season) => (
                  <div
                    key={season.id}
                    className="snap-start shrink-0 w-[250px] md:w-auto rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="ty-body font-semibold truncate">
                        {lang === "th" ? season.nameTh : season.nameEn}
                      </p>
                      <p className="ty-caption flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatShortDate(season.startDate, lang)} –{" "}
                          {formatShortDate(season.endDate, lang)}
                        </span>
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-bold shrink-0">
                      {lang === "th"
                        ? season.badgeTh
                        : season.badgeEn || season.badgeTh}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
