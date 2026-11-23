"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getNeighborProvinceIds,
  getProvinceById,
  getRegionLabel,
  getStyleCollectionMeta,
} from "@/data/thailandProvinces";
import type { LanguageCode } from "@/lib/dateFormatters";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import type { PinFeedItemDto } from "@/types/cangaroom";

type TierId =
  | "all"
  | "same-style"
  | "direct-province"
  | "same-province"
  | "neighbor-province"
  | "same-region"
  | "nationwide";

export interface StayCascadingRecommendationsGridProps {
  anchorPin: PinFeedItemDto;
  candidates: PinFeedItemDto[];
  language: LanguageCode;
  savedPinIds: ReadonlySet<string>;
  notchBgClass?: string;
  compactPadding?: boolean;
  onSelectDeal: (pin: PinFeedItemDto) => void;
  onToggleSave: (pinId: string) => void;
}

function getEffectiveDealScore(pin: PinFeedItemDto): number {
  const directBonus = pin.dealSourceType === "INTERNAL" ? 18 : 0;
  const sponsorBonus = pin.isSponsored ? 12 : 0;
  const ratingBonus = (pin.hotelRatingAvg ?? 4.5) * 4;
  return directBonus + sponsorBonus + ratingBonus;
}

/**
 * Pure Vertical Grid Recommendations (NO horizontal sliding!) for "เที่ยวอะไร" (`/` & `/style/[slug]`):
 * - Mobile: 2 columns (`grid-cols-2`) · Desktop: up to 5 columns (`lg:grid-cols-5`) matching Home 5-card width!
 * - Strict 6-tier cascading order (Same Style First -> Spreads Outward Geographically):
 *   1. Same primary/secondary style (e.g. "ที่พักติดทะเล & ชายหาด")
 *   2. Direct 0% GP in anchor province (e.g. "โปรจองตรงเชียงใหม่")
 *   3. Same province ("ที่พักจังหวัดเชียงใหม่")
 *   4. Neighboring provinces ("ที่พักจังหวัดรอบเชียงใหม่" via 77-province adjacency map)
 *   5. Same region ("ที่พักในภาคเหนือ")
 *   6. Nationwide ("ที่พักทั่วประเทศ")
 */
export function StayCascadingRecommendationsGrid({
  anchorPin,
  candidates,
  language,
  savedPinIds,
  notchBgClass = "bg-[var(--color-background-body)]",
  compactPadding = false,
  onSelectDeal,
  onToggleSave,
}: StayCascadingRecommendationsGridProps) {
  const isTh = language === "th";
  const [activeTier, setActiveTier] = useState<TierId>("all");

  // Reset active filter tab whenever anchor stay changes
  const anchorKey = anchorPin.id;
  const [lastAnchorKey, setLastAnchorKey] = useState(anchorKey);
  if (lastAnchorKey !== anchorKey) {
    setLastAnchorKey(anchorKey);
    setActiveTier("all");
  }

  const primaryStyle = anchorPin.stayStyles[0] ?? null;
  const primaryStyleMeta = primaryStyle
    ? getStyleCollectionMeta(primaryStyle)
    : null;
  const anchorProvince = getProvinceById(anchorPin.provinceId);
  const provinceShortTh = anchorPin.provinceNameTh || anchorProvince?.nameTh || "";
  const provinceShortEn = anchorPin.provinceNameEn || anchorProvince?.nameEn || "";
  const regionLabelTh = getRegionLabel(anchorProvince?.region, "th");
  const regionLabelEn = getRegionLabel(anchorProvince?.region, "en");

  const { orderedAll, buckets } = useMemo(() => {
    const seenHotels = new Set<string>([anchorPin.hotelId]);
    const cleanCandidates = candidates.filter((cand) => {
      if (
        cand.id === anchorPin.id ||
        cand.hotelId === anchorPin.hotelId ||
        cand.hotelSlug === anchorPin.hotelSlug
      ) {
        return false;
      }
      if (seenHotels.has(cand.hotelId)) return false;
      seenHotels.add(cand.hotelId);
      return true;
    });

    const anchorStyleSet = new Set(anchorPin.stayStyles);
    const neighborSet = new Set(getNeighborProvinceIds(anchorPin.provinceId));
    const anchorRegion = anchorProvince?.region ?? null;

    const sameStyleList: PinFeedItemDto[] = [];
    const directProvinceList: PinFeedItemDto[] = [];
    const sameProvinceList: PinFeedItemDto[] = [];
    const neighborProvinceList: PinFeedItemDto[] = [];
    const sameRegionList: PinFeedItemDto[] = [];
    const nationwideList: PinFeedItemDto[] = [];

    // Pure bucket memberships (for filter pills) + strict cascading deduplicated master order!
    const usedIds = new Set<string>();
    const cascaded: PinFeedItemDto[] = [];

    const sortWithinTier = (list: PinFeedItemDto[], preferPrimaryStyle = false) =>
      [...list].sort((a, b) => {
        if (preferPrimaryStyle && primaryStyle) {
          const aPri = a.stayStyles.includes(primaryStyle) ? 1 : 0;
          const bPri = b.stayStyles.includes(primaryStyle) ? 1 : 0;
          if (aPri !== bPri) return bPri - aPri;
        }
        const aProv = a.provinceId === anchorPin.provinceId ? 1 : 0;
        const bProv = b.provinceId === anchorPin.provinceId ? 1 : 0;
        if (aProv !== bProv) return bProv - aProv;
        return getEffectiveDealScore(b) - getEffectiveDealScore(a);
      });

    for (const c of cleanCandidates) {
      const hasSameStyle =
        anchorStyleSet.size > 0 && c.stayStyles.some((s) => anchorStyleSet.has(s));
      const isSameProv = c.provinceId === anchorPin.provinceId;
      const isDirect = c.dealSourceType === "INTERNAL";
      const isNeighbor = neighborSet.has(c.provinceId);
      const candRegion = getProvinceById(c.provinceId)?.region ?? null;
      const isSameReg = Boolean(anchorRegion) && candRegion === anchorRegion;

      if (hasSameStyle) sameStyleList.push(c);
      if (isSameProv && isDirect) directProvinceList.push(c);
      if (isSameProv) sameProvinceList.push(c);
      if (isNeighbor) neighborProvinceList.push(c);
      if (isSameReg && !isSameProv) sameRegionList.push(c);
      nationwideList.push(c);
    }

    const pushUnique = (list: PinFeedItemDto[]) => {
      for (const item of list) {
        if (usedIds.has(item.id)) continue;
        usedIds.add(item.id);
        cascaded.push(item);
      }
    };

    // Strict 6-Tier Cascading Progression:
    // 1. Same Style -> 2. Direct 0% GP Province -> 3. Same Province -> 4. Neighbor Provinces -> 5. Same Region -> 6. Nationwide
    pushUnique(sortWithinTier(sameStyleList, true));
    pushUnique(sortWithinTier(directProvinceList));
    pushUnique(sortWithinTier(sameProvinceList));
    pushUnique(sortWithinTier(neighborProvinceList));
    pushUnique(sortWithinTier(sameRegionList));
    pushUnique(sortWithinTier(nationwideList));

    return {
      orderedAll: cascaded,
      buckets: {
        "same-style": sortWithinTier(sameStyleList, true),
        "direct-province": sortWithinTier(directProvinceList),
        "same-province": sortWithinTier(sameProvinceList),
        "neighbor-province": sortWithinTier(neighborProvinceList),
        "same-region": sortWithinTier(sameRegionList),
        nationwide: sortWithinTier(nationwideList),
      },
    };
  }, [anchorPin, anchorProvince?.region, candidates, primaryStyle]);

  if (orderedAll.length === 0) return null;

  const displayedDeals =
    activeTier === "all" ? orderedAll : buckets[activeTier] ?? orderedAll;

  const tierPills: Array<{ id: TierId; label: string; count: number }> = [
    {
      id: "all",
      label: isTh ? "แนะนำทั้งหมด" : "All picks",
      count: orderedAll.length,
    },
  ];

  if (primaryStyleMeta && buckets["same-style"].length > 0) {
    tierPills.push({
      id: "same-style",
      label: isTh
        ? `ที่พัก${primaryStyleMeta.labelTh}`
        : primaryStyleMeta.labelEn,
      count: buckets["same-style"].length,
    });
  }
  if (buckets["direct-province"].length > 0 && provinceShortTh) {
    tierPills.push({
      id: "direct-province",
      label: isTh
        ? `โปรจองตรง${provinceShortTh}`
        : `0% GP ${provinceShortEn}`,
      count: buckets["direct-province"].length,
    });
  }
  if (buckets["same-province"].length > 0 && provinceShortTh) {
    tierPills.push({
      id: "same-province",
      label: isTh
        ? `จังหวัด${provinceShortTh}`
        : provinceShortEn,
      count: buckets["same-province"].length,
    });
  }
  if (buckets["neighbor-province"].length > 0 && provinceShortTh) {
    tierPills.push({
      id: "neighbor-province",
      label: isTh
        ? `จังหวัดรอบ${provinceShortTh}`
        : `Near ${provinceShortEn}`,
      count: buckets["neighbor-province"].length,
    });
  }
  if (buckets["same-region"].length > 0 && anchorProvince?.region) {
    tierPills.push({
      id: "same-region",
      label: isTh ? `ใน${regionLabelTh}` : regionLabelEn,
      count: buckets["same-region"].length,
    });
  }

  const sectionHeading = primaryStyleMeta
    ? isTh
      ? `ที่พัก${primaryStyleMeta.labelTh} และดีลใกล้เคียงที่แนะนำ`
      : `${primaryStyleMeta.labelEn} & related stays`
    : isTh
    ? "โปรที่พักที่ใกล้เคียงและแนะนำสำหรับคุณ"
    : "Recommended stays for you";

  return (
    <section
      aria-label={sectionHeading}
      className={`${
        compactPadding
          ? "px-4 sm:px-6 pt-6 pb-[calc(88px+var(--cgr-safe-bottom))]"
          : "pt-8 pb-6"
      } border-t border-[var(--color-border)] bg-[var(--color-background-body)] space-y-4`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.018em] text-[var(--color-text-primary)] truncate">
            {sectionHeading}
          </h2>
          <p className="text-[12.5px] sm:text-[13px] text-[var(--color-text-secondary)] mt-0.5 truncate">
            {isTh
              ? "เรียงจากสไตล์เดียวกัน โปรจองตรง จังหวัดใกล้เคียง ไปจนถึงทั่วประเทศ"
              : "Ranked from same stay style and direct deals outward across Thailand"}
          </p>
        </div>

        {primaryStyle && (
          <Link
            href={`/style/${encodeURIComponent(primaryStyle)}`}
            className="h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>{isTh ? "ดูหมวดนี้ทั้งหมด" : "See all"}</span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.3} />
          </Link>
        )}
      </div>

      {/* Cascading Tier Filter Chips (Borderless Warm Minimal Squircles) */}
      {tierPills.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x pb-0.5">
          {tierPills.map((pill) => {
            const isActive = activeTier === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveTier(pill.id)}
                className={`h-9 px-3.5 rounded-[11px] text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors tabular-nums ${
                  isActive
                    ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {pill.label}
                <span
                  className={`ml-1.5 text-[11.5px] ${
                    isActive ? "opacity-75" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Pure Vertical Grid: Mobile 2 cols -> Tablet 3-4 cols -> Desktop 5-6 cols matching Home 3:4 card width! */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
        {displayedDeals.map((deal) => (
          <VerticalCouponCard
            key={`rec-${anchorPin.id}-${deal.id}`}
            pin={deal}
            language={language}
            isSaved={savedPinIds.has(deal.id)}
            notchBgClass={notchBgClass}
            enablePhotoSlide={true}
            onSelect={onSelectDeal}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </section>
  );
}
