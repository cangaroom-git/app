"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import type { HotelPostSummaryDto, PinFeedItemDto } from "@/types/cangaroom";

export interface StayPropertyPostsSectionProps {
  pin: PinFeedItemDto;
  hotelPosts: HotelPostSummaryDto[];
  language: LanguageCode;
  isModalContext?: boolean;
}

/**
 * Property-Specific Below-the-Fold Stories & Articles Section (Used on `/explore` & `/trip`):
 * - Zero cross-hotel recommendation chains -> users NEVER get pulled away from their map pin!
 * - Surfaces real published blog posts / stories authored by THIS specific hotel (`HotelPost`)
 *   on BOTH Desktop Modal and Mobile Overlay.
 */
export function StayPropertyPostsSection({
  pin,
  hotelPosts,
  language,
  isModalContext = true,
}: StayPropertyPostsSectionProps) {
  const isTh = language === "th";
  const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const hasInternalStorefront =
    pin.dealSourceType === "INTERNAL" && Boolean(pin.hotelSlug);

  if (hotelPosts.length === 0 && !hasInternalStorefront) {
    return null;
  }

  return (
    <section
      aria-label={
        isTh
          ? `เรื่องราวและบทความจาก ${hotelName}`
          : `Stories & posts from ${hotelName}`
      }
      className={`${
        isModalContext
          ? "px-4 sm:px-6 lg:px-0 mt-6 lg:mt-8 pt-6 lg:pt-7 pb-[calc(88px+var(--cgr-safe-bottom))] lg:pb-4"
          : "pt-8 pb-6"
      } border-t border-[var(--color-border)] bg-[var(--color-background-body)] max-w-[1120px] mx-auto w-full space-y-4`}
    >
      {hotelPosts.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] sm:text-[18.5px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] truncate">
                {isTh
                  ? `เรื่องราว & บทความจาก ${hotelName}`
                  : `Stories & guides from ${hotelName}`}
              </h2>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                {isTh
                  ? "บทความ รีวิวบรรยากาศ และโพสต์ที่ที่พักนี้แชร์ไว้โดยตรง"
                  : "Articles, room highlights, and local tips shared directly by this stay"}
              </p>
            </div>

            {hasInternalStorefront && (
              <Link
                href={`/${encodeURIComponent(pin.hotelSlug)}/posts`}
                className="h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{isTh ? "ดูทั้งหมด" : "All posts"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {hotelPosts.map((post) => (
              <Link
                key={post.id}
                href={`/${encodeURIComponent(post.hotelSlug)}/posts/${encodeURIComponent(post.slug)}`}
                className="group block space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] rounded-[14px]"
              >
                <div className="relative aspect-[16/10] w-full rounded-[14px] overflow-hidden bg-[var(--color-background-muted)]">
                  {post.coverImageUrl ? (
                    <img
                      src={getOptimizedPinImageUrl(post.coverImageUrl, "card")}
                      alt={post.titleTh}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                  {post.categoryTh && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-[8px] bg-black/52 backdrop-blur-sm text-white text-[11px] font-semibold">
                      {post.categoryTh}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)] group-hover:underline underline-offset-2 leading-snug line-clamp-2">
                    {post.titleTh}
                  </h3>
                  {post.excerptTh && (
                    <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                      {post.excerptTh}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        /* Clean single-row storefront shortcut when this verified direct stay has no blog posts yet */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
              {isTh
                ? `ดูรายละเอียดห้องพัก รีวิว และบทความทั้งหมดของ ${hotelName}`
                : `Explore rooms, reviews, and updates from ${hotelName}`}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">
              {isTh
                ? "จองตรงกับที่พักยืนยันตัวตนบน Nondii ฟรีค่าธรรมเนียม 0% GP"
                : "Direct verified hotel storefront on Nondii with 0% GP"}
            </p>
          </div>
          <Link
            href={`/${encodeURIComponent(pin.hotelSlug)}`}
            className="h-9 px-4 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
          >
            <span>{isTh ? "ไปที่หน้าที่พัก" : "Visit stay page"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
