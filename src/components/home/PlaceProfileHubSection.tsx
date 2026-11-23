"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import type {
  HotelPostSummaryDto,
  PinActiveCouponDto,
  PinFeedItemDto,
} from "@/types/cangaroom";

export interface PlaceProfileHubSectionProps {
  pin: PinFeedItemDto;
  ownerFeedPosts: HotelPostSummaryDto[];
  ownerBlogs: HotelPostSummaryDto[];
  nearbyPlaces: PinFeedItemDto[];
  savedPinIds: Set<string>;
  language: LanguageCode;
  /** Strict 1-Hop Lock: true when viewing a place clicked from another place's Nearby row -> hides Nearby row! */
  isNearbyHop?: boolean;
  isModalContext?: boolean;
  onOpenPromoCoupon?: (coupon: PinActiveCouponDto) => void;
  onSelectNearbyPlace?: (place: PinFeedItemDto) => void;
  onToggleSavePin?: (pinId: string) => void;
}

function formatShortDateLabel(iso: string, lang: LanguageCode): string {
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

function getPromoBadgeLabel(
  coupon: PinActiveCouponDto,
  lang: LanguageCode
): string {
  const isTh = lang === "th";
  if (isTh && coupon.badgeTextTh?.trim()) return coupon.badgeTextTh.trim();
  if (!isTh && coupon.badgeTextEn?.trim()) return coupon.badgeTextEn.trim();
  if (coupon.discountValue > 0) {
    return coupon.discountType === "PERCENT"
      ? isTh
        ? `ลด ${coupon.discountValue}%`
        : `${coupon.discountValue}% OFF`
      : isTh
      ? `ลด ฿${coupon.discountValue.toLocaleString()}`
      : `฿${coupon.discountValue.toLocaleString()} OFF`;
  }
  return isTh ? coupon.titleTh : coupon.titleEn || coupon.titleTh;
}

function HorizontalPreviewRow({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel,
  openInNewTab = true,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string | null;
  seeAllLabel?: string;
  openInNewTab?: boolean;
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollArrows();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateScrollArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollArrows, children]);

  const scrollByStep = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.78));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="py-6 sm:py-7 first:pt-6 space-y-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16.5px] sm:text-[18px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden lg:flex items-center gap-1 mr-1">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => scrollByStep(-1)}
              aria-label="เลื่อนซ้าย"
              className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] disabled:opacity-30 inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => scrollByStep(1)}
              aria-label="เลื่อนขวา"
              className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] disabled:opacity-30 inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>

          {seeAllHref && seeAllLabel && (
            <Link
              href={seeAllHref}
              target={openInNewTab ? "_blank" : undefined}
              rel={openInNewTab ? "noopener noreferrer" : undefined}
              className="h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <span>{seeAllLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
            </Link>
          )}
        </div>
      </div>

      {/* Edge-Safe Horizontal Snap Track (Strictly Isolated From Parent Modal Swipes!) */}
      <div
        ref={trackRef}
        data-swipe-ignore="true"
        onScroll={updateScrollArrows}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:mx-0 lg:px-0 lg:scroll-px-0 pb-1"
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Shared Layer 2 Place Profile Hub (Identical Across /, /style, /explore, /trip):
 * - Equal-rhythm hairline-divided horizontal slide rows (Home-style preview + full profile links):
 *   Row 1: All Active Promotions owned by this Place
 *   Row 2: Owner Short Feed Posts (preview + "อ่านต่อ ↗" opens in new tab)
 *   Row 3: Owner Blog Articles (preview + "อ่านต่อ ↗" opens in new tab)
 *   Row 4: Recommended Nearby Places from Nondii DB (STRICT 1-HOP LOCK: hidden when isNearbyHop=true!)
 */
export function PlaceProfileHubSection({
  pin,
  ownerFeedPosts,
  ownerBlogs,
  nearbyPlaces,
  savedPinIds,
  language,
  isNearbyHop = false,
  isModalContext = true,
  onOpenPromoCoupon,
  onSelectNearbyPlace,
  onToggleSavePin,
}: PlaceProfileHubSectionProps) {
  const isTh = language === "th";
  const placeName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const catMeta = getPlaceCategoryMeta(pin.placeCategory);
  const fullProfileHref = `/${encodeURIComponent(pin.hotelSlug)}`;
  const allPostsHref = `/${encodeURIComponent(pin.hotelSlug)}/posts`;

  const promos = pin.activeCoupons ?? [];
  const showNearbyRow = !isNearbyHop && nearbyPlaces.length > 0;

  return (
    <div
      data-swipe-ignore="true"
      className={`${
        isModalContext
          ? "px-4 sm:px-6 lg:px-0 mt-5 lg:mt-7 pb-[calc(92px+var(--cgr-safe-bottom))] lg:pb-6"
          : "px-4 sm:px-6 lg:px-0 mt-6 lg:mt-8 pb-[calc(92px+var(--cgr-safe-bottom))] lg:pb-8"
      } border-t border-[var(--color-border)] bg-[var(--color-background-body)] max-w-[1120px] mx-auto w-full divide-y divide-[var(--color-border)]`}
    >
      {/* =================================================================
          ROW 1: ALL PROMOTIONS OF THIS PLACE
      ================================================================== */}
      {promos.length > 0 && (
        <HorizontalPreviewRow
          title={
            isTh
              ? `โปรโมชั่นทั้งหมดของที่นี่ (${promos.length})`
              : `All promotions (${promos.length})`
          }
          subtitle={
            isTh
              ? "กดดูเงื่อนไขหรือเก็บสิทธิ์ใช้งานได้ทันที"
              : "Tap any perk to view terms or claim"
          }
          seeAllHref={fullProfileHref}
          seeAllLabel={isTh ? "ดูโปรไฟล์ร้าน" : "Full profile"}
          openInNewTab={isModalContext}
        >
          {promos.slice(0, 8).map((coupon, idx) => {
            const isCardFeatured =
              (pin.featuredCouponId && coupon.id === pin.featuredCouponId) ||
              (!pin.featuredCouponId && idx === 0);
            const headline = getPromoBadgeLabel(coupon, language);
            const kindLabel =
              coupon.promoKind === "ONSITE_PERK"
                ? isTh
                  ? "โชว์การ์ดหน้าร้าน"
                  : "Show at venue"
                : coupon.promoKind === "EXTERNAL_LINK_DEAL"
                ? isTh
                  ? "ดีลพาร์ทเนอร์"
                  : "Partner deal"
                : isTh
                ? "จองตรง 0% GP"
                : "Direct 0% GP";

            return (
              <div
                key={coupon.id}
                className="w-[248px] sm:w-[276px] shrink-0 snap-start rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col justify-between gap-3 text-left"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] truncate">
                      {kindLabel}
                    </span>
                    {isCardFeatured && (
                      <span className="px-2 py-0.5 rounded-[7px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[10.5px] font-semibold shrink-0 leading-tight">
                        {isTh ? "โปรหน้าการ์ด" : "Featured"}
                      </span>
                    )}
                  </div>

                  <p className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] leading-snug truncate tabular-nums">
                    {headline}
                  </p>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)] leading-snug line-clamp-1">
                    {isTh ? coupon.titleTh : coupon.titleEn || coupon.titleTh}
                  </p>
                  {(isTh ? coupon.descriptionTh : coupon.descriptionEn) && (
                    <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                      {isTh ? coupon.descriptionTh : coupon.descriptionEn}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
                  <span className="text-[11.5px] font-semibold text-[var(--color-text-secondary)] truncate tabular-nums">
                    {coupon.code ? `${isTh ? "โค้ด" : "Code"}: ${coupon.code}` : kindLabel}
                  </span>

                  {coupon.externalUrl ? (
                    <a
                      href={coupon.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>{isTh ? "ดูโปร" : "Open"}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenPromoCoupon?.(coupon)}
                      className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                    >
                      <TicketPercent className="w-3.5 h-3.5" />
                      <span>{isTh ? "ดูสิทธิ์" : "Details"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </HorizontalPreviewRow>
      )}

      {/* =================================================================
          ROW 2: OWNER SHORT FEED POSTS (Preview + "อ่านต่อ ↗" New Tab)
      ================================================================== */}
      {ownerFeedPosts.length > 0 && (
        <HorizontalPreviewRow
          title={
            isTh ? "โพสต์อัปเดตจากเจ้าของสถานที่" : "Latest updates from owner"
          }
          subtitle={
            isTh
              ? `บรรยากาศล่าสุด เมนูใหม่ และข่าวสารจาก ${placeName}`
              : `Fresh highlights and updates shared by ${placeName}`
          }
          seeAllHref={allPostsHref}
          seeAllLabel={isTh ? "ดูทั้งหมด" : "All updates"}
          openInNewTab={true}
        >
          {ownerFeedPosts.slice(0, 6).map((post) => {
            const postUrl = `/${encodeURIComponent(
              post.hotelSlug
            )}/posts/${encodeURIComponent(post.slug)}`;
            const dateLabel = formatShortDateLabel(post.publishedAt, language);
            return (
              <article
                key={post.id}
                className="w-[244px] sm:w-[272px] shrink-0 snap-start flex flex-col gap-2.5 text-left"
              >
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[16/10] w-full rounded-[14px] overflow-hidden bg-[var(--color-background-muted)]"
                >
                  {post.coverImageUrl ? (
                    <img
                      src={getOptimizedPinImageUrl(post.coverImageUrl, "card")}
                      alt={post.titleTh}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  )}
                  {dateLabel && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-[7px] bg-black/52 backdrop-blur-sm text-white text-[10.5px] font-semibold inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{dateLabel}</span>
                    </span>
                  )}
                </a>

                <div className="space-y-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                    {post.titleTh}
                  </h3>
                  {post.excerptTh && (
                    <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                      {post.excerptTh}
                    </p>
                  )}
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 pt-0.5 text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 transition-opacity"
                  >
                    <span>{isTh ? "อ่านต่อ" : "Read more"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </HorizontalPreviewRow>
      )}

      {/* =================================================================
          ROW 3: OWNER BLOGS & GUIDES (Preview + "อ่านต่อ ↗" New Tab)
      ================================================================== */}
      {ownerBlogs.length > 0 && (
        <HorizontalPreviewRow
          title={
            isTh ? "บทความ & คู่มือจากเจ้าของสถานที่" : "Articles & local guides"
          }
          subtitle={
            isTh
              ? "เรื่องราวเจาะลึกและเส้นทางเที่ยวที่แนะนำโดยเจ้าของ"
              : "In-depth tips and itineraries written by the venue"
          }
          seeAllHref={allPostsHref}
          seeAllLabel={isTh ? "บทความทั้งหมด" : "All guides"}
          openInNewTab={true}
        >
          {ownerBlogs.slice(0, 6).map((blog) => {
            const blogUrl = `/${encodeURIComponent(
              blog.hotelSlug
            )}/posts/${encodeURIComponent(blog.slug)}`;
            return (
              <article
                key={blog.id}
                className="w-[260px] sm:w-[292px] shrink-0 snap-start flex flex-col gap-2.5 text-left"
              >
                <a
                  href={blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[16/10] w-full rounded-[14px] overflow-hidden bg-[var(--color-background-muted)]"
                >
                  {blog.coverImageUrl ? (
                    <img
                      src={getOptimizedPinImageUrl(blog.coverImageUrl, "card")}
                      alt={blog.titleTh}
                      loading="lazy"
                      decoding="async"
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
                </a>

                <div className="space-y-1 min-w-0">
                  <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                    {blog.titleTh}
                  </h3>
                  {blog.excerptTh && (
                    <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                      {blog.excerptTh}
                    </p>
                  )}
                  <a
                    href={blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 pt-0.5 text-[12.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 transition-opacity"
                  >
                    <span>{isTh ? "อ่านบทความเต็ม" : "Read full guide"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </HorizontalPreviewRow>
      )}

      {/* =================================================================
          ROW 4: RECOMMENDED NEARBY PLACES (STRICT 1-HOP LOCK!)
          Shown ONLY at Depth = 0 (`!isNearbyHop`) so users can peek at nearby
          cafes/dining/attractions/stays & save to trip, then step back cleanly!
      ================================================================== */}
      {showNearbyRow && (
        <HorizontalPreviewRow
          title={
            isTh
              ? `สถานที่ใกล้เคียงรอบ ${placeName}`
              : `Nearby places around ${placeName}`
          }
          subtitle={
            isTh
              ? "คาเฟ่ ร้านอาหาร ที่เที่ยว และที่พักจริงบน Nondii ปักหมุดเก็บเข้าทริปเดียวกันได้ทันที"
              : "Real Nondii places nearby — tap to preview or pin straight into your trip"
          }
        >
          {nearbyPlaces.slice(0, 8).map((nearby) => (
            <div
              key={nearby.id}
              className="w-[44vw] min-w-[154px] max-w-[186px] sm:w-[192px] shrink-0 snap-start"
            >
              <VerticalCouponCard
                pin={nearby}
                language={language}
                isSaved={savedPinIds.has(nearby.id)}
                distanceKm={nearby.distanceKm}
                onSelect={(nextPlace) => onSelectNearbyPlace?.(nextPlace)}
                onToggleSave={(id) => onToggleSavePin?.(id)}
              />
            </div>
          ))}
        </HorizontalPreviewRow>
      )}

      {/* =================================================================
          CLEAN FULL PROFILE FOOTER BAR (Opens Full /{slug} Profile Page)
      ================================================================== */}
      <section className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
            {isTh
              ? `เข้าชมหน้าโปรไฟล์เต็มของ ${placeName}`
              : `View full profile of ${placeName}`}
          </p>
          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
            {pin.merchantMode === "DIRECT_BOOKING"
              ? isTh
                ? "ดูห้องว่าง ปฏิทินราคา โปรโมชั่น โพสต์ และรีวิวทั้งหมดแบบครบวงจร (จองตรง 0% GP)"
                : "Browse rooms, live calendar, promotions, posts, and reviews (0% GP direct)"
              : isTh
              ? `ดูข้อมูล${catMeta.shortLabelTh} เวลาเปิด-ปิด โปรโมชั่น โพสต์ บทความ และช่องทางติดต่อทั้งหมด`
              : `See opening hours, all perks, owner posts, guides, and direct links`}
          </p>
        </div>

        <Link
          href={fullProfileHref}
          target={isModalContext ? "_blank" : undefined}
          rel={isModalContext ? "noopener noreferrer" : undefined}
          className="h-10 px-4 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <span>{isTh ? "เปิดโปรไฟล์เต็ม" : "Open full profile"}</span>
          <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={2.1} />
        </Link>
      </section>
    </div>
  );
}
