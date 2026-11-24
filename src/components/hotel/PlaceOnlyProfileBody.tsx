"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Sparkles,
  Star,
  TicketPercent,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import { UltraHorizontalScroll } from "@/components/shared/UltraHorizontalScroll";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import type {
  HotelPostSummaryDto,
  HotelStorefrontDto,
  PinFeedItemDto,
  PlaceOpeningHoursDayDto,
} from "@/types/cangaroom";

const HotelLocationMap = dynamic(
  () =>
    import("@/components/hotel/HotelLocationMap").then(
      (mod) => mod.HotelLocationMap
    ),
  { ssr: false }
);

const DAY_LABELS: Record<string, { th: string; en: string; jsDay: number }> = {
  sun: { th: "อาทิตย์", en: "Sunday", jsDay: 0 },
  mon: { th: "จันทร์", en: "Monday", jsDay: 1 },
  tue: { th: "อังคาร", en: "Tuesday", jsDay: 2 },
  wed: { th: "พุธ", en: "Wednesday", jsDay: 3 },
  thu: { th: "พฤหัสบดี", en: "Thursday", jsDay: 4 },
  fri: { th: "ศุกร์", en: "Friday", jsDay: 5 },
  sat: { th: "เสาร์", en: "Saturday", jsDay: 6 },
};

function getSafeExternalUrl(raw?: string | null): string | null {
  const clean = (raw || "").trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  return null;
}

function getTodayOpeningSummary(
  hours: PlaceOpeningHoursDayDto[] | undefined,
  lang: LanguageCode
): { label: string; isOpenToday: boolean } | null {
  if (!hours || hours.length === 0) return null;
  const todayJs = new Date().getDay();
  const todayEntry = hours.find((h) => DAY_LABELS[h.day]?.jsDay === todayJs);
  if (!todayEntry) return null;
  if (todayEntry.closed) {
    return {
      label: lang === "th" ? "ปิดทำการวันนี้" : "Closed today",
      isOpenToday: false,
    };
  }
  return {
    label:
      lang === "th"
        ? `เปิดวันนี้ ${todayEntry.open} – ${todayEntry.close} น.`
        : `Open today ${todayEntry.open} – ${todayEntry.close}`,
    isOpenToday: true,
  };
}

function formatShortDate(iso: string, lang: LanguageCode): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffDays = Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
  if (diffDays === 0) return lang === "th" ? "วันนี้" : "Today";
  if (diffDays === 1) return lang === "th" ? "เมื่อวาน" : "Yesterday";
  if (diffDays < 30) {
    return lang === "th" ? `${diffDays} วันที่แล้ว` : `${diffDays}d ago`;
  }
  const months = Math.floor(diffDays / 30);
  return lang === "th" ? `${months} เดือนที่แล้ว` : `${months}mo ago`;
}

export interface PlaceOnlyProfileBodyProps {
  storefront: HotelStorefrontDto;
  language: LanguageCode;
  isOwner?: boolean;
  isSaved: boolean;
  savedPinIds: Set<string>;
  isNearbyHop: boolean;
  backTargetName: string | null;
  onBack: () => void;
  onToggleSaveCanonical: () => void;
  onToggleSavePin: (pinId: string) => void;
  onSelectNearbyPlace: (place: PinFeedItemDto, rect?: CardOriginRect | null) => void;
  onContactClick: (channel: "LINE" | "PHONE" | "FACEBOOK" | "INSTAGRAM" | "MAP") => void;
}

/**
 * Dedicated Group 2 Place Profile Body (CAFE / RESTAURANT / ATTRACTION / WELLNESS / External Stay):
 * - ZERO empty room booking calendar or check-in/check-out guest picker noise!
 * - Airbnb 7 / 1 / 4 asymmetric layout below the Top 3:4 Hero:
 *   Left 7 cols: Overview -> Opening Hours -> All Promotions -> Highlights
 *   Right 4 cols: Sticky Action & Contact Card (--shadow-booking-widget)
 *   Full-width below: Owner Feed Posts -> Owner Blogs -> Reviews -> Map -> Nearby Places (Strict 1-Hop Lock!)
 */
export function PlaceOnlyProfileBody({
  storefront,
  language,
  isOwner = false,
  isSaved,
  savedPinIds,
  isNearbyHop,
  backTargetName,
  onBack,
  onToggleSaveCanonical,
  onToggleSavePin,
  onSelectNearbyPlace,
  onContactClick,
}: PlaceOnlyProfileBodyProps) {
  const isTh = language === "th";
  const { hotel, coupons, reviews } = storefront;
  const catMeta = getPlaceCategoryMeta(hotel.placeCategory);
  const placeName = isTh ? hotel.nameTh : hotel.nameEn;

  const ownerFeedPosts: HotelPostSummaryDto[] = useMemo(
    () =>
      storefront.ownerFeedPosts ??
      storefront.posts.filter((p) => p.postKind === "FEED_POST"),
    [storefront.ownerFeedPosts, storefront.posts]
  );

  const ownerBlogs: HotelPostSummaryDto[] = useMemo(
    () =>
      storefront.ownerBlogs ??
      storefront.posts.filter((p) => p.postKind !== "FEED_POST"),
    [storefront.ownerBlogs, storefront.posts]
  );

  const nearbyPlaces = storefront.nearbyPlaces ?? [];
  const showNearbySection = !isNearbyHop && nearbyPlaces.length > 0;

  const openingHours = hotel.openingHours ?? [];
  const todaySummary = useMemo(
    () => getTodayOpeningSummary(openingHours, language),
    [openingHours, language]
  );

  const primaryOutboundUrl =
    getSafeExternalUrl(hotel.externalWebsiteUrl) ??
    getSafeExternalUrl(hotel.googleMapsUrl) ??
    getSafeExternalUrl(hotel.facebookPageUrl) ??
    getSafeExternalUrl(hotel.instagramUrl) ??
    (hotel.latitude && hotel.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
      : null);

  const primaryCtaLabel =
    hotel.primaryCtaLabelTh?.trim() ||
    (isTh ? catMeta.defaultCtaTh : catMeta.defaultCtaEn);

  const mapsUrl =
    getSafeExternalUrl(hotel.googleMapsUrl) ??
    (hotel.latitude && hotel.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
      : null);

  const todayJs = new Date().getDay();

  return (
    <div className="w-full pb-10 lg:pb-12">
      {/* =====================================================================
          7 / 1 / 4 ASYMMETRIC PLACE OVERVIEW & STICKY CONTACT/CTA WIDGET
      ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start pt-2 lg:pt-6 pb-10">
        {/* LEFT 7 COLUMNS — EQUAL-RHYTHM HAIRLINE-DIVIDED SECTIONS */}
        <div className="lg:col-span-7 divide-y divide-[var(--color-border)] min-w-0">
          {/* 1. Overview & Category Trust Line */}
          <section className="py-8 first:pt-0 space-y-3">
            <div className="space-y-1">
              <h2 className="ty-title text-[var(--color-text-primary)] leading-snug">
                {isTh
                  ? `${catMeta.labelTh}ใน ${hotel.districtTh ? `${hotel.districtTh} ` : ""}จ.${hotel.provinceNameTh}`
                  : `${catMeta.labelEn} in ${hotel.districtTh ? `${hotel.districtTh}, ` : ""}${hotel.provinceNameEn}`}
              </h2>
              {hotel.taglineTh && (
                <p className="text-[14.5px] text-[var(--color-text-secondary)]">
                  {isTh ? hotel.taglineTh : hotel.taglineEn}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-[var(--color-text-primary)]">
              {hotel.ratingAvg > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{hotel.ratingAvg.toFixed(1)}</span>
                </span>
              )}
              {reviews.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-[var(--color-text-secondary)]">
                    ·
                  </span>
                  <a
                    href="#section-reviews"
                    className="font-semibold underline underline-offset-2 hover:opacity-80"
                  >
                    {isTh ? `${reviews.length} รีวิว` : `${reviews.length} reviews`}
                  </a>
                </>
              )}
              {todaySummary && (
                <>
                  <span aria-hidden="true" className="text-[var(--color-text-secondary)]">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                    <Clock className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                    <span>{todaySummary.label}</span>
                  </span>
                </>
              )}
            </div>

            {(isTh ? hotel.descriptionTh : hotel.descriptionEn) && (
              <p className="text-[15px] leading-[1.7] text-[var(--color-text-primary)] pt-1 whitespace-pre-line">
                {isTh ? hotel.descriptionTh : hotel.descriptionEn}
              </p>
            )}

            {hotel.addressTh && (
              <p className="text-[13.5px] text-[var(--color-text-secondary)] flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-text-primary)]" />
                <span>{hotel.addressTh}</span>
              </p>
            )}

            {/* Mobile Inline Primary CTA & Direct Contact Actions (Clean in-flow — NO bottom dock!) */}
            <div className="lg:hidden pt-3 space-y-2.5">
              {primaryOutboundUrl && (
                <a
                  href={primaryOutboundUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                </a>
              )}

              <div className="flex flex-wrap gap-2">
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onContactClick("MAP")}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span>{isTh ? "นำทาง" : "Directions"}</span>
                  </a>
                )}
                {hotel.contactLine && (
                  <button
                    type="button"
                    onClick={() => onContactClick("LINE")}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>LINE</span>
                  </button>
                )}
                {hotel.contactPhone && (
                  <button
                    type="button"
                    onClick={() => onContactClick("PHONE")}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{hotel.contactPhone}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 2. All Active Promotions & Onsite Perks */}
          {coupons.length > 0 && (
            <section id="section-coupons" className="py-8 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                    {isTh
                      ? `โปรโมชั่นและสิทธิพิเศษ (${coupons.length})`
                      : `Promotions & perks (${coupons.length})`}
                  </h2>
                  <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                    {isTh
                      ? "สิทธิพิเศษล่าสุดจากร้านนี้ สามารถแสดงหน้าการ์ดหรือกดรับสิทธิ์ผ่านลิงก์ด้านล่าง"
                      : "Active perks shared by this venue"}
                  </p>
                </div>
                {isOwner && (
                  <Link
                    href={`/studio/listings/promotions?hotel=${encodeURIComponent(hotel.slug)}`}
                    className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isTh ? "จัดการโปร" : "Edit promos"}</span>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {coupons.map((coupon, idx) => {
                  const isFeatured =
                    (hotel.featuredCouponId && coupon.id === hotel.featuredCouponId) ||
                    (!hotel.featuredCouponId && idx === 0);
                  const headline =
                    (isTh ? coupon.badgeTextTh : coupon.badgeTextEn)?.trim() ||
                    (coupon.discountValue > 0
                      ? coupon.discountType === "PERCENT"
                        ? isTh
                          ? `ลด ${coupon.discountValue}%`
                          : `${coupon.discountValue}% OFF`
                        : isTh
                        ? `ลด ฿${coupon.discountValue.toLocaleString()}`
                        : `฿${coupon.discountValue.toLocaleString()} OFF`
                      : isTh
                      ? coupon.titleTh
                      : coupon.titleEn);
                  const promoKindLabel =
                    coupon.promoKind === "ONSITE_PERK"
                      ? isTh
                        ? "โชว์การ์ดหน้าร้าน"
                        : "Show at venue"
                      : coupon.promoKind === "EXTERNAL_LINK_DEAL"
                      ? isTh
                        ? "ดีลพาร์ทเนอร์"
                        : "Partner deal"
                      : isTh
                      ? "โปรโมชั่นพิเศษ"
                      : "Special offer";
                  const couponUrl = getSafeExternalUrl(coupon.externalUrl);

                  return (
                    <div
                      key={coupon.id}
                      className="rounded-[20px] bg-[var(--color-background-muted)] p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold text-[var(--color-text-secondary)] inline-flex items-center gap-1">
                            <TicketPercent className="w-3.5 h-3.5" />
                            <span>{promoKindLabel}</span>
                          </span>
                          {isFeatured && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent)] !text-[var(--color-on-accent)] text-[10.5px] font-semibold leading-tight">
                              {isTh ? "โปรหน้าการ์ด" : "Featured"}
                            </span>
                          )}
                        </div>
                        <p className="text-[18px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] leading-snug tabular-nums">
                          {headline}
                        </p>
                        <p className="text-[13.5px] font-medium text-[var(--color-text-primary)] leading-snug">
                          {isTh ? coupon.titleTh : coupon.titleEn}
                        </p>
                        {(isTh ? coupon.descriptionTh : coupon.descriptionEn) && (
                          <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed">
                            {isTh ? coupon.descriptionTh : coupon.descriptionEn}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)]">
                        <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] tabular-nums truncate">
                          {coupon.code
                            ? `${isTh ? "โค้ด" : "Code"}: ${coupon.code}`
                            : promoKindLabel}
                        </span>
                        {couponUrl && (
                          <a
                            href={couponUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
                          >
                            <span>{isTh ? "รับสิทธิ์" : "Open"}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Opening Hours (7-Day Hairline Schedule) */}
          {openingHours.length > 0 && (
            <section id="section-hours" className="py-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                  {isTh ? "เวลาเปิด-ปิด" : "Opening hours"}
                </h2>
                {todaySummary && (
                  <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                    {todaySummary.label}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {openingHours.map((row) => {
                  const meta = DAY_LABELS[row.day];
                  const isToday = meta?.jsDay === todayJs;
                  return (
                    <div
                      key={row.day}
                      className={`py-2.5 flex items-center justify-between gap-4 text-[14px] ${
                        isToday
                          ? "font-semibold text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{isTh ? meta?.th ?? row.day : meta?.en ?? row.day}</span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[var(--color-background-muted)] text-[11px] font-semibold text-[var(--color-text-primary)]">
                            {isTh ? "วันนี้" : "Today"}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {row.closed
                          ? isTh
                            ? "ปิดทำการ"
                            : "Closed"
                          : `${row.open} – ${row.close}${isTh ? " น." : ""}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Highlights */}
          {hotel.highlights.length > 0 && (
            <section className="py-8 space-y-4">
              <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {isTh ? "จุดเด่นของสถานที่นี้" : "Highlights"}
              </h2>
              <div className="divide-y divide-[var(--color-border)]">
                {hotel.highlights.map((hl, i) => (
                  <div key={`${hl.titleTh}-${i}`} className="py-3.5 first:pt-0 last:pb-0 space-y-0.5">
                    <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {hl.titleTh}
                    </p>
                    {hl.descTh && (
                      <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
                        {hl.descTh}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 1 EMPTY BREATHING COL + 4-COL DESKTOP STICKY PLACE ACTION CARD */}
        <aside className="hidden lg:block lg:col-start-9 lg:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-[22px] sm:rounded-[24px] bg-[var(--color-background-card)] border border-black/[0.04] dark:border-white/[0.08] shadow-[var(--shadow-booking-widget)] p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">
                {isTh ? catMeta.labelTh : catMeta.labelEn} ·{" "}
                {isTh ? hotel.provinceNameTh : hotel.provinceNameEn}
              </p>
              <p className="text-[18px] font-semibold text-[var(--color-text-primary)] leading-snug">
                {placeName}
              </p>
              {todaySummary && (
                <p className="text-[13px] text-[var(--color-text-secondary)] inline-flex items-center gap-1.5 pt-0.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{todaySummary.label}</span>
                </p>
              )}
            </div>

            {primaryOutboundUrl && (
              <a
                href={primaryOutboundUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>{primaryCtaLabel}</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              </a>
            )}

            <div className="grid grid-cols-2 gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onContactClick("MAP")}
                  className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>{isTh ? "นำทาง" : "Directions"}</span>
                </a>
              )}

              <button
                type="button"
                onClick={onToggleSaveCanonical}
                className={`h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isSaved
                    ? "bg-[var(--color-promo)] !text-white"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 shrink-0 ${isSaved ? "fill-current" : ""}`}
                />
                <span>
                  {isSaved
                    ? isTh
                      ? "ใน Wishlist"
                      : "Saved"
                    : isTh
                    ? "บันทึก Wishlist"
                    : "Wishlist"}
                </span>
              </button>
            </div>

            {(hotel.contactLine ||
              hotel.contactPhone ||
              hotel.facebookPageUrl ||
              hotel.instagramUrl) && (
              <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
                <p className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  {isTh ? "ช่องทางติดต่อโดยตรง" : "Direct channels"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {hotel.contactLine && (
                    <button
                      type="button"
                      onClick={() => onContactClick("LINE")}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>LINE</span>
                    </button>
                  )}
                  {hotel.contactPhone && (
                    <button
                      type="button"
                      onClick={() => onContactClick("PHONE")}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors tabular-nums"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{hotel.contactPhone}</span>
                    </button>
                  )}
                  {getSafeExternalUrl(hotel.facebookPageUrl) && (
                    <a
                      href={getSafeExternalUrl(hotel.facebookPageUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onContactClick("FACEBOOK")}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Facebook</span>
                    </a>
                  )}
                  {getSafeExternalUrl(hotel.instagramUrl) && (
                    <a
                      href={getSafeExternalUrl(hotel.instagramUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onContactClick("INSTAGRAM")}
                      className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Instagram</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* =====================================================================
          FULL-WIDTH LOWER SECTIONS (EQUAL RHYTHM HAIRLINE DIVIDERS)
      ====================================================================== */}
      <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
        {/* Owner Short Feed Posts */}
        {ownerFeedPosts.length > 0 && (
          <section className="py-8 lg:py-10 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                  {isTh ? "โพสต์อัปเดตจากเจ้าของสถานที่" : "Latest updates"}
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? `บรรยากาศล่าสุด เมนูใหม่ และข่าวสารจาก ${placeName}`
                    : `Fresh highlights shared by ${placeName}`}
                </p>
              </div>
              <Link
                href={`/${encodeURIComponent(hotel.slug)}/posts`}
                className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{isTh ? "ดูทั้งหมด" : "All updates"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <UltraHorizontalScroll className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-1">
              {ownerFeedPosts.map((post) => (
                <article
                  key={post.id}
                  className="w-[260px] sm:w-[290px] shrink-0 flex flex-col gap-2.5"
                >
                  <Link
                    href={`/${encodeURIComponent(post.hotelSlug)}/posts/${encodeURIComponent(post.slug)}`}
                    className="relative block aspect-square w-full rounded-[22px] overflow-hidden bg-[var(--color-background-muted)]"
                  >
                    {post.coverImageUrl ? (
                      <img
                        src={getOptimizedPinImageUrl(post.coverImageUrl, "card")}
                        alt={post.titleTh}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-[7px] bg-black/52 backdrop-blur-sm text-white text-[10.5px] font-semibold inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatShortDate(post.publishedAt, language)}</span>
                    </span>
                  </Link>
                  <div className="space-y-1">
                    <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                      {post.titleTh}
                    </h3>
                    {post.excerptTh && (
                      <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                        {post.excerptTh}
                      </p>
                    )}
                    <Link
                      href={`/${encodeURIComponent(post.hotelSlug)}/posts/${encodeURIComponent(post.slug)}`}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75"
                    >
                      <span>{isTh ? "อ่านต่อ" : "Read more"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </UltraHorizontalScroll>
          </section>
        )}

        {/* Owner Blogs & Guides */}
        {ownerBlogs.length > 0 && (
          <section className="py-8 lg:py-10 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                  {isTh ? "บทความ & คู่มือจากเจ้าของสถานที่" : "Articles & local guides"}
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "เรื่องราวเจาะลึกและเส้นทางเที่ยวแนะนำ"
                    : "In-depth tips and itineraries"}
                </p>
              </div>
              <Link
                href={`/${encodeURIComponent(hotel.slug)}/posts`}
                className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{isTh ? "บทความทั้งหมด" : "All guides"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <UltraHorizontalScroll className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-1">
              {ownerBlogs.map((blog) => (
                <article
                  key={blog.id}
                  className="w-[272px] sm:w-[310px] shrink-0 flex flex-col gap-2.5"
                >
                  <Link
                    href={`/${encodeURIComponent(blog.hotelSlug)}/posts/${encodeURIComponent(blog.slug)}`}
                    className="relative block aspect-square w-full rounded-[22px] overflow-hidden bg-[var(--color-background-muted)]"
                  >
                    {blog.coverImageUrl ? (
                      <img
                        src={getOptimizedPinImageUrl(blog.coverImageUrl, "card")}
                        alt={blog.titleTh}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                    {blog.categoryTh && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-[7px] bg-black/52 backdrop-blur-sm text-white text-[10.5px] font-semibold">
                        {blog.categoryTh}
                      </span>
                    )}
                  </Link>
                  <div className="space-y-1">
                    <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                      {blog.titleTh}
                    </h3>
                    {blog.excerptTh && (
                      <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                        {blog.excerptTh}
                      </p>
                    )}
                    <Link
                      href={`/${encodeURIComponent(blog.hotelSlug)}/posts/${encodeURIComponent(blog.slug)}`}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75"
                    >
                      <span>{isTh ? "อ่านบทความเต็ม" : "Read full guide"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </UltraHorizontalScroll>
          </section>
        )}

        {/* Guest Reviews */}
        {reviews.length > 0 && (
          <section id="section-reviews" className="py-8 lg:py-10 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-current text-[var(--color-text-primary)]" />
              <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {hotel.ratingAvg.toFixed(1)} ·{" "}
                {isTh ? `${reviews.length} รีวิวจากผู้มาเยือน` : `${reviews.length} reviews`}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.slice(0, 6).map((rv) => (
                <div key={rv.id} className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] font-semibold text-[13px] inline-flex items-center justify-center shrink-0">
                      {rv.authorName[0] || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                        {rv.authorName}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-secondary)]">
                        ★ {rv.rating.toFixed(1)} · {formatShortDate(rv.createdAt, language)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                    {isTh ? rv.commentTh : rv.commentEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interactive Location Map */}
        {typeof hotel.latitude === "number" &&
          typeof hotel.longitude === "number" && (
            <section id="section-location" className="py-8 lg:py-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                    {isTh ? "ตำแหน่งที่ตั้ง & แผนที่" : "Location & map"}
                  </h2>
                  <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                    {hotel.addressTh ||
                      `${hotel.districtTh} ${isTh ? hotel.provinceNameTh : hotel.provinceNameEn}`}
                  </p>
                </div>
                {isOwner && (
                  <Link
                    href={`/studio/listings/location?hotel=${encodeURIComponent(hotel.slug)}`}
                    className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isTh ? "แก้พิกัด" : "Edit map"}</span>
                  </Link>
                )}
              </div>
              <HotelLocationMap
                hotelName={placeName}
                addressText={hotel.addressTh}
                districtText={hotel.districtTh}
                provinceText={isTh ? hotel.provinceNameTh : hotel.provinceNameEn}
                latitude={hotel.latitude}
                longitude={hotel.longitude}
                googleMapsUrl={hotel.googleMapsUrl}
                nearbySpots={hotel.nearbySpots}
                language={language}
              />
            </section>
          )}

        {/* Nearby Places on Nondii (STRICT 1-HOP LOCK!) */}
        {showNearbySection && (
          <section id="section-nearby" className="py-8 lg:py-10 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {isTh
                  ? `สถานที่ใกล้เคียงรอบ ${placeName}`
                  : `Nearby places around ${placeName}`}
              </h2>
              <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                {isTh
                  ? "คาเฟ่ ร้านอาหาร ที่เที่ยว และที่พักจริงบน Nondii ปักหมุดเก็บเข้าทริปเดียวกันได้ทันที"
                  : "Real places nearby on Nondii — tap to flip in or save straight to your trip"}
              </p>
            </div>

            <UltraHorizontalScroll className="flex gap-3.5 sm:gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-1">
              {nearbyPlaces.slice(0, 8).map((nearby) => (
                <div
                  key={nearby.id}
                  className="w-[44vw] min-w-[154px] max-w-[186px] sm:w-[192px] shrink-0"
                >
                  <VerticalCouponCard
                    pin={nearby}
                    language={language}
                    isSaved={savedPinIds.has(nearby.id)}
                    distanceKm={nearby.distanceKm}
                    onSelect={(nextPlace, rect) =>
                      onSelectNearbyPlace(nextPlace, rect)
                    }
                    onToggleSave={onToggleSavePin}
                  />
                </div>
              ))}
            </UltraHorizontalScroll>
          </section>
        )}
      </div>
    </div>
  );
}
