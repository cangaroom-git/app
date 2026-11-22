"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Clock,
  Compass,
  Flame,
  History,
  MapPin,
  Search,
  Sparkles,
  Star,
  Ticket,
  X,
} from "lucide-react";
import {
  clearRecentSearches,
  getEncodedSessionTasteParam,
  getLiveClientTasteSnapshot,
  getRecentSearches,
  removeRecentSearch,
  type RecentSearchItem,
} from "@/lib/telemetry/clientTelemetry";
import type {
  SmartSearchMatchedHotel,
  SmartSearchRecentPin,
  SmartSearchResponseDto,
} from "@/lib/services/smartSearchService";

export interface SmartSearchSelectQueryPayload {
  query: string;
  imageUrl?: string;
  subtitle?: string;
}

interface SmartSearchActionItem {
  id: string;
  execute: () => void;
}

interface SmartSearchDropdownProps {
  isOpen: boolean;
  query: string;
  language: "th" | "en";
  variant: "desktop" | "mobile";
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onSelectQuery: (payload: SmartSearchSelectQueryPayload) => void;
  onSelectHotel: (hotel: SmartSearchMatchedHotel) => void;
  onSelectPin: (pin: SmartSearchRecentPin) => void;
  onClose: () => void;
}

export function SmartSearchDropdown({
  isOpen,
  query,
  language,
  variant,
  inputRef,
  onSelectQuery,
  onSelectHotel,
  onSelectPin,
  onClose,
}: SmartSearchDropdownProps) {
  const isTh = language === "th";
  const trimmedQuery = query.trim();

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [data, setData] = useState<SmartSearchResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const focusCacheRef = useRef<{
    fetchedAt: number;
    tasteKey: string;
    payload: SmartSearchResponseDto;
  } | null>(null);
  const requestSeqRef = useRef(0);

  // Sync localStorage recent searches whenever the dropdown opens
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }
    setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Fetch personalized Focus or Predictive Query suggestions
  useEffect(() => {
    if (!isOpen) return;

    const tasteParam = getEncodedSessionTasteParam() ?? "";
    const liveSnap = getLiveClientTasteSnapshot();
    const recentPinsParam = liveSnap.recentOpenedPinIds.join(",");
    const cacheKey = `${tasteParam}|${recentPinsParam}`;

    if (
      !trimmedQuery &&
      focusCacheRef.current &&
      focusCacheRef.current.tasteKey === cacheKey &&
      Date.now() - focusCacheRef.current.fetchedAt < 25_000
    ) {
      setData(focusCacheRef.current.payload);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const reqId = ++requestSeqRef.current;
    const delayMs = trimmedQuery ? 130 : 0;

    const timer = window.setTimeout(async () => {
      if (cancelled || reqId !== requestSeqRef.current) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        if (tasteParam) params.set("taste", tasteParam);
        if (recentPinsParam) params.set("recentPins", recentPinsParam);

        const res = await fetch(`/api/search/suggestions?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled || reqId !== requestSeqRef.current) return;
        const payload = (await res.json()) as SmartSearchResponseDto;
        if (cancelled || reqId !== requestSeqRef.current) return;

        if (!trimmedQuery) {
          focusCacheRef.current = {
            fetchedAt: Date.now(),
            tasteKey: cacheKey,
            payload,
          };
        }
        setData(payload);
        setHighlightedIndex(-1);
      } catch {
        // Ignore transient network failures silently on predictive dropdown
      } finally {
        if (!cancelled && reqId === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, trimmedQuery]);

  const handleDeleteRecent = useCallback(
    (e: React.MouseEvent, targetQuery: string) => {
      e.preventDefault();
      e.stopPropagation();
      setRecentSearches(removeRecentSearch(targetQuery));
    },
    []
  );

  const handleClearAllRecent = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches(clearRecentSearches());
  }, []);

  // Flatten interactive rows for keyboard Up/Down navigation
  const actionItems = useMemo<SmartSearchActionItem[]>(() => {
    if (!isOpen) return [];
    const list: SmartSearchActionItem[] = [];

    if (!trimmedQuery) {
      for (const rec of recentSearches.slice(0, 6)) {
        list.push({
          id: `recent-${rec.query}`,
          execute: () =>
            onSelectQuery({
              query: rec.query,
              imageUrl: rec.imageUrl,
              subtitle: rec.subtitle,
            }),
        });
      }
      if (data?.mode === "focus") {
        for (const pin of data.recentlyViewedPins) {
          list.push({
            id: `viewed-${pin.id}`,
            execute: () => onSelectPin(pin),
          });
        }
        for (const idea of data.forYouIdeas) {
          list.push({
            id: `fy-${idea.id}`,
            execute: () =>
              onSelectQuery({
                query: idea.query,
                imageUrl: idea.imageUrl,
                subtitle: isTh ? idea.subtitleTh : idea.subtitleEn,
              }),
          });
        }
        for (const trend of data.trendingSearches) {
          list.push({
            id: `tr-${trend.id}`,
            execute: () =>
              onSelectQuery({
                query: trend.query,
                imageUrl: trend.imageUrl,
                subtitle: isTh ? trend.subtitleTh : trend.subtitleEn,
              }),
          });
        }
      }
      return list;
    }

    if (data?.mode === "query") {
      for (const comp of data.smartCompletions) {
        list.push({
          id: `comp-${comp.id}`,
          execute: () =>
            onSelectQuery({
              query: comp.query,
              imageUrl: comp.imageUrl,
              subtitle: isTh ? comp.reasonTh : comp.reasonEn,
            }),
        });
      }
      for (const hotel of data.matchedHotels) {
        list.push({
          id: `hotel-${hotel.id}`,
          execute: () => onSelectHotel(hotel),
        });
      }
      for (const dest of data.matchedDestinations) {
        list.push({
          id: `dest-${dest.id}`,
          execute: () =>
            onSelectQuery({
              query: dest.query,
              imageUrl: dest.imageUrl,
              subtitle: isTh ? dest.subtitleTh : dest.subtitleEn,
            }),
        });
      }
    }

    list.push({
      id: "submit-raw-query",
      execute: () => onSelectQuery({ query: trimmedQuery }),
    });

    return list;
  }, [
    data,
    isOpen,
    isTh,
    onSelectHotel,
    onSelectPin,
    onSelectQuery,
    recentSearches,
    trimmedQuery,
  ]);

  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    actionItems.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [actionItems]);

  // Bind keyboard navigation directly to the host input
  useEffect(() => {
    const inputEl = inputRef?.current;
    if (!isOpen || !inputEl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        inputEl.blur();
        return;
      }

      if (actionItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < actionItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : actionItems.length - 1
        );
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        const chosen = actionItems[highlightedIndex];
        if (chosen) {
          e.preventDefault();
          chosen.execute();
        }
      }
    };

    inputEl.addEventListener("keydown", handleKeyDown);
    return () => inputEl.removeEventListener("keydown", handleKeyDown);
  }, [actionItems, highlightedIndex, inputRef, isOpen, onClose]);

  if (!isOpen) return null;

  const isFocusMode = trimmedQuery.length === 0;
  const focusPayload = data?.mode === "focus" ? data : null;
  const queryPayload = data?.mode === "query" ? data : null;

  const wrapperClass =
    variant === "desktop"
      ? "absolute left-0 right-0 top-[calc(100%+8px)] z-[65] max-h-[min(76vh,680px)] overflow-y-auto rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-4 sm:p-5 space-y-5"
      : "mt-3 pt-3 border-t border-[var(--color-border)] max-h-[65dvh] overflow-y-auto space-y-4 overscroll-contain";

  const cardBase =
    "group w-full text-left rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer";

  const showInitialSkeleton = isLoading && !data;

  return (
    <div
      role="listbox"
      aria-label={isTh ? "คำแนะนำการค้นหาอัจฉริยะ" : "Smart search suggestions"}
      onMouseDown={(e) => {
        // Keep input focused when scrolling or interacting with non-navigation UI
        if ((e.target as HTMLElement).closest("button") === null) {
          e.preventDefault();
        }
      }}
      className={wrapperClass}
    >
      {/* ===================================================================
          MODE 1: FOCUS MODE (Recent -> Recently Viewed -> For You -> Trending)
      ==================================================================== */}
      {isFocusMode ? (
        <>
          {/* 1A. Local Recent Searches with instant remove */}
          {recentSearches.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                  <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <h3 className="ty-caption font-semibold">
                    {isTh ? "การค้นหาล่าสุด" : "Recent searches"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="px-2 py-1 rounded-[10px] ty-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                >
                  {isTh ? "ล้างทั้งหมด" : "Clear all"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentSearches.slice(0, 6).map((rec) => {
                  const idx = indexMap.get(`recent-${rec.query}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  return (
                    <div
                      key={rec.query}
                      className={`flex items-center gap-2 rounded-[12px] border border-[var(--color-border)] pr-1.5 transition-colors ${
                        isActive
                          ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                          : "bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSelectQuery({
                            query: rec.query,
                            imageUrl: rec.imageUrl,
                            subtitle: rec.subtitle,
                          })
                        }
                        className="flex-1 min-w-0 flex items-center gap-2.5 p-1.5 text-left cursor-pointer rounded-[11px]"
                      >
                        {rec.imageUrl ? (
                          <img
                            src={rec.imageUrl}
                            alt=""
                            loading="eager"
                            className="w-10 h-10 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                          />
                        ) : (
                          <span className="w-10 h-10 rounded-[8px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                            <History className="w-4 h-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                            {rec.query}
                          </p>
                          {rec.subtitle && (
                            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                              {rec.subtitle}
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label={isTh ? `ลบ ${rec.query}` : `Remove ${rec.query}`}
                        onClick={(e) => handleDeleteRecent(e, rec.query)}
                        className="h-7 w-7 rounded-[10px] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 1B. Recently Viewed Stays (Direct Jump back to Pin) */}
          {focusPayload && focusPayload.recentlyViewedPins.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <Compass className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "ที่พักที่คุณเพิ่งดู" : "Recently viewed stays"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {focusPayload.recentlyViewedPins.slice(0, 6).map((pin) => {
                  const idx = indexMap.get(`viewed-${pin.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  return (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => onSelectPin(pin)}
                      className={`${cardBase} p-1.5 flex items-center gap-2.5 ${
                        isActive
                          ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                          : ""
                      }`}
                    >
                      <img
                        src={pin.imageUrl}
                        alt={isTh ? pin.titleTh : pin.titleEn}
                        loading="eager"
                        className="w-11 h-11 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? pin.hotelNameTh : pin.hotelNameEn}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? pin.provinceNameTh : pin.provinceNameEn}
                          {pin.priceFromThb
                            ? ` · ฿${pin.priceFromThb.toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 1C. Ideas for You (Personalized compound synthesis from Taste + Geo + Budget) */}
          {showInitialSkeleton ? (
            <section className="space-y-2.5">
              <div className="h-4 w-36 rounded-[6px] bg-[var(--color-background-muted)] animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="h-14 rounded-[12px] bg-[var(--color-background-muted)] animate-pulse"
                  />
                ))}
              </div>
            </section>
          ) : (
            focusPayload &&
            focusPayload.forYouIdeas.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <h3 className="ty-caption font-semibold">
                      {focusPayload.hasPersonalSignal
                        ? isTh
                          ? "ไอเดียที่พักสำหรับคุณ"
                          : "Ideas picked for you"
                        : isTh
                          ? "แนะนำสำหรับคุณ"
                          : "Recommended ideas"}
                    </h3>
                  </div>
                  {focusPayload.hasPersonalSignal && (
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {isTh
                        ? "ปรับตามสไตล์และพื้นที่ของคุณ"
                        : "Tailored to your taste"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {focusPayload.forYouIdeas.map((idea) => {
                    const idx = indexMap.get(`fy-${idea.id}`) ?? -1;
                    const isActive = idx >= 0 && idx === highlightedIndex;
                    return (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() =>
                          onSelectQuery({
                            query: idea.query,
                            imageUrl: idea.imageUrl,
                            subtitle: isTh ? idea.subtitleTh : idea.subtitleEn,
                          })
                        }
                        className={`${cardBase} p-1.5 flex items-center gap-3 ${
                          isActive
                            ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                            : ""
                        }`}
                      >
                        <img
                          src={idea.imageUrl}
                          alt={isTh ? idea.titleTh : idea.titleEn}
                          loading="eager"
                          className="w-12 h-12 rounded-[9px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="ty-body-strong text-[var(--color-text-primary)] truncate">
                              {isTh ? idea.titleTh : idea.titleEn}
                            </span>
                            {(isTh ? idea.badgeTh : idea.badgeEn) && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded-[6px] bg-[var(--color-background-muted)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text-primary)]">
                                {isTh ? idea.badgeTh : idea.badgeEn}
                              </span>
                            )}
                          </div>
                          <p className="ty-caption text-[var(--color-text-secondary)] truncate">
                            {isTh ? idea.subtitleTh : idea.subtitleEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )
          )}

          {/* 1D. Trending Now on Cangaroom */}
          {focusPayload && focusPayload.trendingSearches.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <Flame className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "กำลังฮิตใน Nondii" : "Trending on Nondii"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {focusPayload.trendingSearches.map((item) => {
                  const idx = indexMap.get(`tr-${item.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onSelectQuery({
                          query: item.query,
                          imageUrl: item.imageUrl,
                          subtitle: isTh ? item.subtitleTh : item.subtitleEn,
                        })
                      }
                      className={`${cardBase} p-1.5 flex items-center gap-2.5 ${
                        isActive
                          ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                          : ""
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={isTh ? item.titleTh : item.titleEn}
                        loading="lazy"
                        className="w-11 h-11 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? item.titleTh : item.titleEn}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? item.subtitleTh : item.subtitleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        /* ===================================================================
           MODE 2: AS-YOU-TYPE PREDICTIVE OMNIBOX
        ==================================================================== */
        <>
          {showInitialSkeleton && (
            <div className="space-y-2">
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="h-12 rounded-[12px] bg-[var(--color-background-muted)] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* 2A. Smart Predictive Completions */}
          {queryPayload && queryPayload.smartCompletions.length > 0 && (
            <section className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)] px-1">
                <Sparkles className="w-3.5 h-3.5" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "คำค้นหาที่ใกล้เคียง" : "Suggested queries"}
                </h3>
              </div>

              <div className="space-y-1">
                {queryPayload.smartCompletions.map((comp) => {
                  const idx = indexMap.get(`comp-${comp.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() =>
                        onSelectQuery({
                          query: comp.query,
                          imageUrl: comp.imageUrl,
                          subtitle: isTh ? comp.reasonTh : comp.reasonEn,
                        })
                      }
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[12px] text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--color-background-muted)]"
                          : "hover:bg-[var(--color-background-muted)]"
                      }`}
                    >
                      {comp.imageUrl ? (
                        <img
                          src={comp.imageUrl}
                          alt=""
                          className="w-9 h-9 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-[8px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                          <Search className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="ty-body-strong text-[var(--color-text-primary)] truncate">
                          {isTh ? comp.labelTh : comp.labelEn}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? comp.reasonTh : comp.reasonEn}
                        </p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2B. Direct Stay Jumps -> /{hotelSlug} */}
          {queryPayload && queryPayload.matchedHotels.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                  {isTh ? "ที่พักแนะนำ (เปิดดูหน้าโปรไฟล์ทันที)" : "Matching stays"}
                </h3>
              </div>

              <div className="space-y-1.5">
                {queryPayload.matchedHotels.map((hotel) => {
                  const idx = indexMap.get(`hotel-${hotel.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  const couponText = isTh
                    ? hotel.couponSummaryTh
                    : hotel.couponSummaryEn;
                  return (
                    <button
                      key={hotel.id}
                      type="button"
                      onClick={() => onSelectHotel(hotel)}
                      className={`${cardBase} p-2 flex items-center gap-3 ${
                        isActive
                          ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                          : ""
                      }`}
                    >
                      <img
                        src={hotel.imageUrl}
                        alt={isTh ? hotel.nameTh : hotel.nameEn}
                        className="w-12 h-12 rounded-[9px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="ty-body-strong text-[var(--color-text-primary)] truncate">
                            {isTh ? hotel.nameTh : hotel.nameEn}
                          </span>
                          {couponText && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[7px] bg-[var(--color-background-muted)] border border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-primary)]">
                              <Ticket className="w-3 h-3" />
                              {couponText}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-secondary)]">
                          <span className="truncate">
                            {hotel.districtTh
                              ? `${hotel.districtTh}, ${
                                  isTh ? hotel.provinceNameTh : hotel.provinceNameEn
                                }`
                              : isTh
                                ? hotel.provinceNameTh
                                : hotel.provinceNameEn}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current text-[var(--color-text-primary)]" />
                            {hotel.ratingAvg.toFixed(1)}
                          </span>
                          {hotel.priceFromThb && (
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              ฿{hotel.priceFromThb.toLocaleString()}/
                              {isTh ? "คืน" : "night"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2C. Locations, Styles & Semantic Tags */}
          {queryPayload && queryPayload.matchedDestinations.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="ty-caption font-semibold text-[var(--color-text-secondary)] px-1">
                {isTh ? "จังหวัด สไตล์ และจุดเด่น" : "Destinations, styles & tags"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {queryPayload.matchedDestinations.map((dest) => {
                  const idx = indexMap.get(`dest-${dest.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() =>
                        onSelectQuery({
                          query: dest.query,
                          imageUrl: dest.imageUrl,
                          subtitle: isTh ? dest.subtitleTh : dest.subtitleEn,
                        })
                      }
                      className={`${cardBase} p-2 flex items-center gap-2.5 ${
                        isActive
                          ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                          : ""
                      }`}
                    >
                      {dest.imageUrl ? (
                        <img
                          src={dest.imageUrl}
                          alt=""
                          className="w-9 h-9 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-[8px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                          <MapPin className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? dest.nameTh : dest.nameEn}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? dest.subtitleTh : dest.subtitleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2D. Direct Submit Full Query Action */}
          <button
            type="button"
            onClick={() => onSelectQuery({ query: trimmedQuery })}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[12px] border border-[var(--color-border)] text-left transition-colors cursor-pointer ${
              highlightedIndex === actionItems.length - 1
                ? "bg-[var(--color-background-muted)] border-[var(--color-border-emphasized)]"
                : "bg-[var(--color-background-muted)]/60 hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
              <span className="ty-body-strong text-[var(--color-text-primary)] truncate">
                {isTh
                  ? `ค้นหาทั้งหมดสำหรับ “${trimmedQuery}”`
                  : `Search all results for “${trimmedQuery}”`}
              </span>
            </span>
            <span className="ty-caption text-[var(--color-text-secondary)] shrink-0">
              Enter ↵
            </span>
          </button>
        </>
      )}

      {/* Subtle Desktop Keyboard Legend */}
      {variant === "desktop" && (
        <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
          <span>
            {isTh
              ? "เรียงผลลัพธ์จากใกล้เคียงที่สุดไปน้อย — ไม่มีหน้าว่างเปล่า"
              : "Ranked closest to furthest — zero empty dead-ends"}
          </span>
          <span className="hidden sm:inline">
            ↑↓ {isTh ? "เลือก" : "Navigate"} · Enter {isTh ? "เปิด" : "Select"} · Esc{" "}
            {isTh ? "ปิด" : "Close"}
          </span>
        </div>
      )}
    </div>
  );
}

