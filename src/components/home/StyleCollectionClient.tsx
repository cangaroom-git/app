"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import {
  getProvinceById,
  STAY_STYLE_TABS,
  type StyleCollectionMeta,
  type StyleCollectionSlug,
} from "@/data/thailandProvinces";
import { useHotelApp } from "@/components/HotelAppShell";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import type { PureMediaSlide } from "@/components/media/PureMediaViewer";
import {
  getRecentViewedPinIds,
  RECENT_VIEWS_UPDATED_EVENT,
  recordRecentViewedPinId,
} from "@/lib/telemetry/clientTelemetry";
import { clearLastClickedPinOrigin } from "@/lib/pinOriginStore";
import type {
  HotelPostSummaryDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";

const PinterestPinDetail = dynamic(
  () =>
    import("@/components/home/PinterestPinDetail").then(
      (m) => m.PinterestPinDetail
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[420px] flex items-center justify-center">
        <img
          src="/brand/nondi-icon-with-text-black.svg"
          alt="Nondii"
          className="h-[34px] w-auto object-contain opacity-90 animate-pulse dark:invert"
        />
      </div>
    ),
  }
);

const PureMediaViewer = dynamic(
  () =>
    import("@/components/media/PureMediaViewer").then(
      (m) => m.PureMediaViewer
    ),
  { ssr: false }
);

type SortOption = "recommended" | "discount" | "price-low" | "rating";

const STYLE_SWITCHER_ITEMS: ReadonlyArray<{
  slug: StyleCollectionSlug;
  labelTh: string;
  labelEn: string;
}> = [
  ...STAY_STYLE_TABS.filter((t) => t.id !== "all").map((t) => ({
    slug: t.id as StyleCollectionSlug,
    labelTh: t.labelTh,
    labelEn: t.labelEn,
  })),
  { slug: "direct", labelTh: "จองตรง 0% GP", labelEn: "Direct 0% GP" },
  { slug: "curated", labelTh: "รวมโปรเด็ด", labelEn: "Curated" },
];

function dedupeByHotel(pins: PinFeedItemDto[]): PinFeedItemDto[] {
  const best = new Map<string, PinFeedItemDto>();
  const score = (p: PinFeedItemDto) =>
    (p.promoHeadlineTh ? 100 : 0) +
    (p.activeCoupon || p.promoCode ? 60 : 0) +
    (p.promoDealPriceThb ? 40 : 0) +
    (p.isSponsored ? 20 : 0);

  for (const p of pins) {
    const existing = best.get(p.hotelId);
    if (!existing || score(p) > score(existing)) {
      best.set(p.hotelId, p);
    }
  }
  return Array.from(best.values());
}

export interface StyleCollectionClientProps {
  meta: StyleCollectionMeta;
  initialCollectionPins: PinFeedItemDto[];
  allCatalogPins: PinFeedItemDto[];
  initialRecentPinIds?: string[];
  initialProvinceFilter?: string | null;
}

/**
 * Dedicated Clean Editorial Travel-Style Landing Page (`/style/[styleSlug]`):
 * - Reached via "ดูทั้งหมด" from Home ("เที่ยวอะไร") without jarring map redirects!
 * - Pure clean vertical card grid straight from Card #1:
 *   Mobile = 2 columns (`grid-cols-2`) · Desktop = up to 5 columns (`lg:grid-cols-4 xl:grid-cols-5`)
 *   matching Home's exact warm minimal aesthetic & `cgr-page-wide` width!
 */
const INITIAL_STYLE_CARDS = 18;
const STYLE_CARDS_INCREMENT = 18;

export function StyleCollectionClient({
  meta,
  initialCollectionPins,
  allCatalogPins,
  initialRecentPinIds = [],
  initialProvinceFilter = null,
}: StyleCollectionClientProps) {
  const {
    lang: language,
    user: currentUser,
    savedPinIds: globalSavedPinIds,
    triggerPinToBoard,
    togglePinLikeInstant,
    navigateToPlaceWithFlip,
  } = useHotelApp();

  const isTh = language === "th";

  const [recentIds, setRecentIds] = useState<string[]>(initialRecentPinIds);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(
    initialProvinceFilter
  );
  const [directOnly, setDirectOnly] = useState<boolean>(
    meta.slug === "direct"
  );
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_STYLE_CARDS);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // In-page Pin Detail state (preserves scroll position cleanly on back!)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
    hotelPosts?: HotelPostSummaryDto[];
    ownerFeedPosts?: HotelPostSummaryDto[];
    ownerBlogs?: HotelPostSummaryDto[];
    nearbyPlaces?: PinFeedItemDto[];
  } | null>(null);
  const [pinHistoryStack, setPinHistoryStack] = useState<
    Array<{ pin: PinFeedItemDto; scrollY: number }>
  >([]);
  const [detailRestoreScrollY, setDetailRestoreScrollY] = useState<
    number | null
  >(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);
  const savedGridScrollYRef = useRef<number>(0);
  const latestPinReqRef = useRef<string | null>(null);

  // Sync local recently viewed IDs when slug === "recent"
  useEffect(() => {
    if (meta.slug !== "recent" || typeof window === "undefined") return;
    const sync = (localIds: string[]) => {
      const merged: string[] = [];
      const seen = new Set<string>();
      for (const id of [...localIds, ...initialRecentPinIds]) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(id);
      }
      setRecentIds(merged);
    };
    sync(getRecentViewedPinIds());
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ pinIds?: string[] }>).detail;
      sync(Array.isArray(detail?.pinIds) ? detail.pinIds : getRecentViewedPinIds());
    };
    window.addEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
    return () =>
      window.removeEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
  }, [initialRecentPinIds, meta.slug]);

  const baseCollectionDeals = useMemo(() => {
    if (meta.slug === "recent") {
      const byId = new Map<string, PinFeedItemDto>();
      for (const p of allCatalogPins) byId.set(p.id, p);
      for (const p of initialCollectionPins) byId.set(p.id, p);
      const out: PinFeedItemDto[] = [];
      const seenHotels = new Set<string>();
      for (const id of recentIds) {
        const p = byId.get(id);
        if (!p || seenHotels.has(p.hotelId)) continue;
        seenHotels.add(p.hotelId);
        out.push(p);
      }
      return out;
    }
    return dedupeByHotel(initialCollectionPins);
  }, [allCatalogPins, initialCollectionPins, meta.slug, recentIds]);

  // Dynamic province quick pills (ONLY provinces present in this collection!)
  const availableProvinces = useMemo(() => {
    const counts = new Map<string, { id: string; labelTh: string; labelEn: string; count: number }>();
    for (const d of baseCollectionDeals) {
      const existing = counts.get(d.provinceId);
      if (existing) {
        existing.count += 1;
      } else {
        const prov = getProvinceById(d.provinceId);
        counts.set(d.provinceId, {
          id: d.provinceId,
          labelTh: d.provinceNameTh || prov?.nameTh || d.provinceId,
          labelEn: d.provinceNameEn || prov?.nameEn || d.provinceId,
          count: 1,
        });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [baseCollectionDeals]);

  const filteredDeals = useMemo(() => {
    let list = baseCollectionDeals;
    if (selectedProvince) {
      list = list.filter((d) => d.provinceId === selectedProvince);
    }
    if (directOnly && meta.slug !== "direct") {
      list = list.filter((d) => d.dealSourceType === "INTERNAL");
    }

    const sorted = [...list];
    if (sortBy === "price-low") {
      sorted.sort(
        (a, b) =>
          (a.promoDealPriceThb ?? a.nightlyPriceThb ?? Number.MAX_SAFE_INTEGER) -
          (b.promoDealPriceThb ?? b.nightlyPriceThb ?? Number.MAX_SAFE_INTEGER)
      );
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => (b.hotelRatingAvg ?? 0) - (a.hotelRatingAvg ?? 0));
    } else if (sortBy === "discount") {
      const getPct = (p: PinFeedItemDto) => {
        if (
          p.promoOriginalPriceThb &&
          p.promoDealPriceThb &&
          p.promoOriginalPriceThb > p.promoDealPriceThb
        ) {
          return (
            ((p.promoOriginalPriceThb - p.promoDealPriceThb) /
              p.promoOriginalPriceThb) *
            100
          );
        }
        return p.activeCoupon?.discountType === "PERCENT"
          ? p.activeCoupon.discountValue
          : 0;
      };
      sorted.sort((a, b) => getPct(b) - getPct(a));
    }
    return sorted;
  }, [baseCollectionDeals, directOnly, meta.slug, selectedProvince, sortBy]);

  const renderedDeals = useMemo(
    () => filteredDeals.slice(0, visibleCount),
    [filteredDeals, visibleCount]
  );
  const remainingDealsCount = Math.max(
    0,
    filteredDeals.length - renderedDeals.length
  );

  // Reset pagination whenever filters/sort change
  useEffect(() => {
    setVisibleCount(INITIAL_STYLE_CARDS);
  }, [meta.slug, selectedProvince, directOnly, sortBy]);

  // Progressive Viewport Pagination via IntersectionObserver
  useEffect(() => {
    if (remainingDealsCount <= 0) return;
    const el = loadMoreSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) =>
            Math.min(filteredDeals.length, prev + STYLE_CARDS_INCREMENT)
          );
        }
      },
      { rootMargin: "420px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredDeals.length, remainingDealsCount]);

  // Contextual bridge href to "เที่ยวไหน" (/explore) carrying active style/province/source!
  const mapBridgeHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (
      meta.slug !== "direct" &&
      meta.slug !== "curated" &&
      meta.slug !== "recent"
    ) {
      qs.set("style", meta.slug);
    }
    if (meta.slug === "direct" || directOnly) {
      qs.set("source", "INTERNAL");
    } else if (meta.slug === "curated") {
      qs.set("source", "EXTERNAL");
    }
    if (meta.slug === "recent") {
      qs.set("recent", "1");
    }
    if (selectedProvince) {
      qs.set("province", selectedProvince);
    }
    const qStr = qs.toString();
    return qStr ? `/explore?${qStr}` : "/explore";
  }, [directOnly, meta.slug, selectedProvince]);

  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    try {
      const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        pin: PinFeedItemDto;
        comments: PinCommentDto[];
        relatedPins: PinFeedItemDto[];
        hotelPosts?: HotelPostSummaryDto[];
        ownerFeedPosts?: HotelPostSummaryDto[];
        ownerBlogs?: HotelPostSummaryDto[];
        nearbyPlaces?: PinFeedItemDto[];
      };
      if (latestPinReqRef.current === pinId) {
        setPinDetail(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      void loadPinDetail(selectedPinId);
    }
  }, [selectedPinId, loadPinDetail]);

  const activePin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return allCatalogPins.find((p) => p.id === selectedPinId) ?? null;
  }, [allCatalogPins, pinDetail, selectedPinId, selectedPinSnapshot]);

  const activePinComments = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id ? pinDetail.comments : [],
    [activePin, pinDetail]
  );

  const activeOwnerFeedPosts = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id
        ? pinDetail.ownerFeedPosts ?? []
        : [],
    [activePin, pinDetail]
  );

  const activeOwnerBlogs = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id
        ? pinDetail.ownerBlogs ?? []
        : [],
    [activePin, pinDetail]
  );

  const activeNearbyPlaces = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id
        ? pinDetail.nearbyPlaces ?? []
        : [],
    [activePin, pinDetail]
  );

  const backTargetName = useMemo(() => {
    const prev = pinHistoryStack[pinHistoryStack.length - 1]?.pin;
    if (!prev) return null;
    return isTh ? prev.hotelNameTh : prev.hotelNameEn;
  }, [isTh, pinHistoryStack]);

  const handleSelectPin = useCallback(
    (pin: PinFeedItemDto, pushHistory = false) => {
      // Strict 1-Hop Lock: prevent infinite rabbit-hole chaining from Nearby Places
      if (pushHistory && pinHistoryStack.length >= 1) {
        return;
      }
      clearLastClickedPinOrigin();
      setDetailRestoreScrollY(null);
      if (typeof window !== "undefined" && !activePin) {
        savedGridScrollYRef.current = window.scrollY;
      }
      if (pushHistory && activePin && activePin.id !== pin.id) {
        const y = typeof window !== "undefined" ? window.scrollY : 0;
        setPinHistoryStack((prev) =>
          [...prev.filter((e) => e.pin.id !== pin.id), { pin: activePin, scrollY: y }].slice(-20)
        );
      }
      recordRecentViewedPinId(pin.id);
      setSelectedPinSnapshot(pin);
      setPinDetail((prev) => (prev?.pin.id === pin.id ? prev : null));
      setSelectedPinId(pin.id);
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    },
    [activePin, pinHistoryStack.length]
  );

  const handleClosePin = useCallback(() => {
    latestPinReqRef.current = null;
    setPinHistoryStack([]);
    setDetailRestoreScrollY(null);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedGridScrollYRef.current,
          behavior: "instant" as ScrollBehavior,
        });
      });
    }
  }, []);

  const handleStepBackPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleClosePin();
      return;
    }
    const prev = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((s) => s.slice(0, -1));
    setDetailRestoreScrollY(prev.scrollY);
    setSelectedPinSnapshot(prev.pin);
    setPinDetail(null);
    setSelectedPinId(prev.pin.id);
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      window.scrollTo({
        top: Math.max(0, prev.scrollY),
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [handleClosePin, pinHistoryStack]);

  const handleToggleSave = useCallback(
    (pinId: string) => {
      const target =
        (activePin?.id === pinId ? activePin : null) ??
        activeNearbyPlaces.find((p) => p.id === pinId) ??
        allCatalogPins.find((p) => p.id === pinId);
      if (!target) return;
      void triggerPinToBoard({
        id: target.id,
        coverImageUrl: target.coverImageUrl,
        isSavedByMe: globalSavedPinIds.has(target.id),
      });
    },
    [activeNearbyPlaces, activePin, allCatalogPins, globalSavedPinIds, triggerPinToBoard]
  );

  const handleToggleLike = useCallback(
    (pinId: string) => {
      const target =
        (activePin?.id === pinId ? activePin : null) ??
        activeNearbyPlaces.find((p) => p.id === pinId) ??
        allCatalogPins.find((p) => p.id === pinId);
      if (!target) return;
      togglePinLikeInstant({
        id: target.id,
        isLikedByMe: target.isLikedByMe,
        likesCount: target.likesCount,
      });
    },
    [activeNearbyPlaces, activePin, allCatalogPins, togglePinLikeInstant]
  );

  return (
    <div className="cgr-page-wide pb-16 [overflow-anchor:none]">
      {/* Open Place Profile Detail View (Inline on Desktop / Full-Screen Overlay on Mobile) */}
      {activePin && (
        <PinterestPinDetail
          pin={activePin}
          language={language}
          currentUser={currentUser}
          comments={activePinComments}
          savedPinIds={globalSavedPinIds}
          relatedPins={allCatalogPins}
          detailFooterMode="discovery"
          hotelPosts={pinDetail?.hotelPosts}
          ownerFeedPosts={activeOwnerFeedPosts}
          ownerBlogs={activeOwnerBlogs}
          nearbyPlaces={activeNearbyPlaces}
          isNearbyHop={pinHistoryStack.length > 0}
          backTargetName={backTargetName}
          canStepBack={pinHistoryStack.length > 0}
          restoreScrollY={detailRestoreScrollY}
          onBack={handleStepBackPin}
          onClose={handleClosePin}
          onSelectPin={(p) => handleSelectPin(p, true)}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onSharePin={() => {}}
          onExpandMedia={(urls, idx) =>
            setFullscreenMedia({
              slides: urls.map((u) => ({ type: "image", url: u })),
              index: idx,
            })
          }
          onAddComment={async (text, parentId) => {
            await fetch(
              `/api/pins/${encodeURIComponent(activePin.id)}/comments`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: text, parentId }),
              }
            );
            await loadPinDetail(activePin.id);
          }}
          onDeleteComment={async (commentId) => {
            await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
              method: "DELETE",
            });
            await loadPinDetail(activePin.id);
          }}
        />
      )}

      {/* Main Clean Style Collection Grid View */}
      <div
        aria-hidden={Boolean(activePin)}
        className={activePin ? "hidden" : "space-y-5"}
      >
        {/* Top Row: Back to "เที่ยวอะไร" + Quick Underline Style Switcher */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)]">
          <Link
            href="/"
            aria-label={isTh ? "กลับไปหน้าเที่ยวอะไร" : "Back to Discover"}
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </Link>

          <nav
            aria-label={isTh ? "เปลี่ยนสไตล์ที่เที่ยว" : "Switch travel style"}
            className="h-11 flex-1 min-w-0 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-y-none no-scrollbar select-none"
          >
            {STYLE_SWITCHER_ITEMS.map((item) => {
              const isCurrent = item.slug === meta.slug;
              return (
                <Link
                  key={item.slug}
                  href={`/style/${encodeURIComponent(item.slug)}`}
                  className={`h-full border-b-2 inline-flex items-center shrink-0 ty-body whitespace-nowrap transition-colors ${
                    isCurrent
                      ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                      : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {isTh ? item.labelTh : item.labelEn}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Editorial Style Heading + Quiet Bridge to "เที่ยวไหน" Map */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-tight">
                {isTh ? meta.labelTh : meta.labelEn}
              </h1>
              <span className="text-[13.5px] font-medium text-[var(--color-text-secondary)] tabular-nums">
                {isTh
                  ? `${filteredDeals.length} โปรที่พัก`
                  : `${filteredDeals.length} stays`}
              </span>
            </div>
            <p className="text-[13.5px] sm:text-[14.5px] text-[var(--color-text-secondary)] leading-relaxed">
              {isTh ? meta.taglineTh : meta.taglineEn}
            </p>
          </div>

          <Link
            href={mapBridgeHref}
            className="h-9 px-3.5 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto transition-colors"
          >
            <MapIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
            <span>{isTh ? "ดูบนแผนที่ · เที่ยวไหน" : "View on map"}</span>
          </Link>
        </div>

        {/* Clean Single-Row Sub-Filter Bar: Province Chips + 0% GP Toggle + Custom Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x min-w-0 flex-1">
            <button
              type="button"
              aria-pressed={selectedProvince === null}
              onClick={() => setSelectedProvince(null)}
              className={`h-9 px-3.5 rounded-[11px] text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedProvince === null
                  ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                  : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
              }`}
            >
              {isTh ? "ทุกจังหวัด" : "All provinces"}
            </button>

            {availableProvinces.map((prov) => {
              const isActive = selectedProvince === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    setSelectedProvince((prev) =>
                      prev === prov.id ? null : prov.id
                    )
                  }
                  className={`h-9 px-3.5 rounded-[11px] text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors tabular-nums ${
                    isActive
                      ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {isTh ? prov.labelTh : prov.labelEn}
                  <span
                    className={`ml-1.5 text-[11px] ${
                      isActive ? "opacity-75" : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {prov.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {meta.slug !== "direct" && (
              <button
                type="button"
                aria-pressed={directOnly}
                onClick={() => setDirectOnly((prev) => !prev)}
                className={`h-9 px-3.5 rounded-[11px] text-[12.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  directOnly
                    ? "bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {isTh ? "จองตรง 0% GP" : "Direct 0% GP"}
              </button>
            )}

            <div className="w-[164px] shrink-0">
              <ResponsiveSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as SortOption)}
                sheetTitle={isTh ? "เรียงลำดับ" : "Sort by"}
                ariaLabel={isTh ? "เรียงลำดับ" : "Sort by"}
                triggerClassName="!h-9 !min-h-0 !py-0 !px-3 !rounded-[11px] !border-transparent !bg-[var(--color-background-muted)] hover:!bg-[var(--color-background-subtle)] !text-[12.5px] !font-semibold"
                options={[
                  { value: "recommended", label: isTh ? "แนะนำ" : "Recommended" },
                  { value: "discount", label: isTh ? "ส่วนลดสูงสุด" : "Biggest discount" },
                  { value: "price-low", label: isTh ? "ราคาเริ่มต้นต่ำสุด" : "Lowest price" },
                  { value: "rating", label: isTh ? "คะแนนรีวิวสูงสุด" : "Top rated" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Pure Vertical Card Grid From Card #1: Mobile 2 Cols / Desktop up to 4-5 Cols Matching Home */}
        {filteredDeals.length === 0 ? (
          <div className="rounded-[20px] bg-[var(--color-background-muted)] px-6 py-14 text-center space-y-3">
            <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {isTh
                ? "ยังไม่พบโปรที่พักที่ตรงกับตัวกรองนี้"
                : "No stays match this filter yet"}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {(selectedProvince || (directOnly && meta.slug !== "direct")) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvince(null);
                    setDirectOnly(meta.slug === "direct");
                  }}
                  className="h-10 px-4 rounded-[11px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[13px] font-semibold cursor-pointer"
                >
                  {isTh ? "ล้างตัวกรอง" : "Reset filters"}
                </button>
              )}
              <Link
                href="/"
                className="h-10 px-4 rounded-[11px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center"
              >
                {isTh ? "กลับหน้าเที่ยวอะไร" : "Back to Discover"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
              {renderedDeals.map((deal, idx) => (
                <VerticalCouponCard
                  key={deal.id}
                  pin={deal}
                  language={language}
                  priority={idx < 4}
                  isSaved={globalSavedPinIds.has(deal.id)}
                  enablePhotoSlide={true}
                  onSelect={(p, rect, ev) =>
                    navigateToPlaceWithFlip({
                      pin: p,
                      originRect: rect,
                      openInNewTab: Boolean(
                        ev && "metaKey" in ev && (ev.metaKey || ev.ctrlKey)
                      ),
                    })
                  }
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>

            {remainingDealsCount > 0 && (
              <div
                ref={loadMoreSentinelRef}
                className="flex justify-center pt-1"
              >
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(
                        filteredDeals.length,
                        prev + STYLE_CARDS_INCREMENT
                      )
                    )
                  }
                  className="h-10 px-5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold cursor-pointer transition-colors tabular-nums"
                >
                  {isTh
                    ? `ดูเพิ่มเติม (เหลืออีก ${remainingDealsCount} แห่ง)`
                    : `Load more (${remainingDealsCount} more)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {fullscreenMedia && (
        <PureMediaViewer
          slides={fullscreenMedia.slides}
          initialIndex={fullscreenMedia.index}
          onClose={() => setFullscreenMedia(null)}
        />
      )}
    </div>
  );
}
