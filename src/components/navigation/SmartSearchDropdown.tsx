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
  Tag,
  Ticket,
  X,
} from "lucide-react";
import {
  clearRecentSearches,
  getEncodedSessionTasteParam,
  getLiveClientTasteSnapshot,
  getRecentSearches,
  getRecentViewedPinIds,
  removeRecentSearch,
  type RecentSearchItem,
} from "@/lib/telemetry/clientTelemetry";
import type {
  SmartSearchMatchedHotel,
  SmartSearchRecentPin,
  SmartSearchResponseDto,
} from "@/lib/services/smartSearchService";
import { useModalPresence } from "@/lib/useModalPresence";

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

/* ============================================================================
   MODULE-LEVEL SWR CACHE + IDLE PREWARM
   Survives overlay unmount/remount so Desktop & Mobile Search open in 0ms
   with zero skeleton flash and zero height-jump hitch.
   ============================================================================ */
interface FocusCacheEntry {
  fetchedAt: number;
  tasteKey: string;
  payload: SmartSearchResponseDto;
}

interface QueryCacheEntry {
  fetchedAt: number;
  payload: SmartSearchResponseDto;
}

const FOCUS_CACHE_TTL_MS = 45_000;
const QUERY_CACHE_TTL_MS = 60_000;
const MAX_QUERY_CACHE_SIZE = 32;

let moduleFocusCache: FocusCacheEntry | null = null;
let inflightFocusKey: string | null = null;
let inflightFocusPromise: Promise<SmartSearchResponseDto | null> | null = null;
const moduleQueryCache = new Map<string, QueryCacheEntry>();

function buildClientSearchContext(): {
  tasteParam: string;
  recentPinsParam: string;
  cacheKey: string;
} {
  if (typeof window === "undefined") {
    return { tasteParam: "", recentPinsParam: "", cacheKey: "|" };
  }
  const tasteParam = getEncodedSessionTasteParam() ?? "";
  const liveSnap = getLiveClientTasteSnapshot();
  const storedRecentPins = getRecentViewedPinIds();
  const mergedRecentPins = Array.from(
    new Set([...liveSnap.recentOpenedPinIds, ...storedRecentPins])
  )
    .filter(Boolean)
    .slice(0, 8);
  const recentPinsParam = mergedRecentPins.join(",");
  return {
    tasteParam,
    recentPinsParam,
    cacheKey: `${tasteParam}|${recentPinsParam}`,
  };
}

function getQueryCacheEntry(
  cacheKey: string,
  normalizedQuery: string
): SmartSearchResponseDto | null {
  const fullKey = `${cacheKey}|${normalizedQuery}`;
  const hit = moduleQueryCache.get(fullKey);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > QUERY_CACHE_TTL_MS) {
    moduleQueryCache.delete(fullKey);
    return null;
  }
  return hit.payload;
}

function setQueryCacheEntry(
  cacheKey: string,
  normalizedQuery: string,
  payload: SmartSearchResponseDto
): void {
  const fullKey = `${cacheKey}|${normalizedQuery}`;
  if (moduleQueryCache.size >= MAX_QUERY_CACHE_SIZE) {
    const oldestKey = moduleQueryCache.keys().next().value;
    if (oldestKey) moduleQueryCache.delete(oldestKey);
  }
  moduleQueryCache.set(fullKey, { fetchedAt: Date.now(), payload });
}

async function fetchFocusSuggestionsWithDedup(
  ctx: ReturnType<typeof buildClientSearchContext>
): Promise<SmartSearchResponseDto | null> {
  if (
    moduleFocusCache &&
    moduleFocusCache.tasteKey === ctx.cacheKey &&
    Date.now() - moduleFocusCache.fetchedAt < FOCUS_CACHE_TTL_MS
  ) {
    return moduleFocusCache.payload;
  }

  if (inflightFocusPromise && inflightFocusKey === ctx.cacheKey) {
    return inflightFocusPromise;
  }

  inflightFocusKey = ctx.cacheKey;
  inflightFocusPromise = (async () => {
    try {
      const params = new URLSearchParams();
      if (ctx.tasteParam) params.set("taste", ctx.tasteParam);
      if (ctx.recentPinsParam) params.set("recentPins", ctx.recentPinsParam);

      const res = await fetch(`/api/search/suggestions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const payload = (await res.json()) as SmartSearchResponseDto;
      moduleFocusCache = {
        fetchedAt: Date.now(),
        tasteKey: ctx.cacheKey,
        payload,
      };
      return payload;
    } catch {
      return null;
    } finally {
      if (inflightFocusKey === ctx.cacheKey) {
        inflightFocusKey = null;
        inflightFocusPromise = null;
      }
    }
  })();

  return inflightFocusPromise;
}

/**
 * Call on idle / pointerdown / hover to warm personalized focus suggestions
 * before the user even finishes tapping Search (0ms instant open!).
 */
export function prewarmSmartSearchSuggestions(): void {
  if (typeof window === "undefined") return;
  const ctx = buildClientSearchContext();
  void fetchFocusSuggestionsWithDedup(ctx);
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
  const normalizedQuery = trimmedQuery.toLowerCase();

  // Desktop uses smooth Fade Slide-In / Slide-Out presence; mobile is wrapped inside
  // the bottom-anchored sheet which owns the sheet slide transition.
  const desktopPresence = useModalPresence(
    variant === "desktop" ? isOpen : false,
    170
  );

  // Hydrate synchronously from module-level cache & localStorage so frame 0 has real data!
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() =>
    getRecentSearches()
  );
  const [focusData, setFocusData] = useState<SmartSearchResponseDto | null>(
    () => moduleFocusCache?.payload ?? null
  );
  const [queryData, setQueryData] = useState<SmartSearchResponseDto | null>(
    () => {
      if (!normalizedQuery) return null;
      const ctx = buildClientSearchContext();
      return getQueryCacheEntry(ctx.cacheKey, normalizedQuery);
    }
  );
  const [isLoadingFocus, setIsLoadingFocus] = useState(false);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const requestSeqRef = useRef(0);

  // Sync localStorage recent searches whenever opened
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }
    setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Fetch / revalidate Focus or Predictive Query suggestions with stale-while-revalidate
  useEffect(() => {
    if (!isOpen) return;

    const ctx = buildClientSearchContext();

    if (!trimmedQuery) {
      // Immediately show cached focus payload if present (0ms, zero flash!)
      if (moduleFocusCache) {
        setFocusData(moduleFocusCache.payload);
        if (
          moduleFocusCache.tasteKey === ctx.cacheKey &&
          Date.now() - moduleFocusCache.fetchedAt < FOCUS_CACHE_TTL_MS
        ) {
          setIsLoadingFocus(false);
          return;
        }
      }

      let cancelled = false;
      const reqId = ++requestSeqRef.current;
      // Only show skeleton if we truly have zero cached focus payload yet
      if (!moduleFocusCache) setIsLoadingFocus(true);

      fetchFocusSuggestionsWithDedup(ctx).then((payload) => {
        if (cancelled || reqId !== requestSeqRef.current) return;
        if (payload) setFocusData(payload);
        setIsLoadingFocus(false);
      });

      return () => {
        cancelled = true;
      };
    }

    // Query mode: check instant LRU cache hit first (0ms!)
    const cachedQuery = getQueryCacheEntry(ctx.cacheKey, normalizedQuery);
    if (cachedQuery) {
      setQueryData(cachedQuery);
      setIsLoadingQuery(false);
      setHighlightedIndex(-1);
      return;
    }

    let cancelled = false;
    const reqId = ++requestSeqRef.current;
    const controller = new AbortController();

    // Short 95ms debounce; keep previous queryData visible while fetching (zero flicker!)
    const timer = window.setTimeout(async () => {
      if (cancelled || reqId !== requestSeqRef.current) return;
      setIsLoadingQuery(true);
      try {
        const params = new URLSearchParams();
        params.set("q", trimmedQuery);
        if (ctx.tasteParam) params.set("taste", ctx.tasteParam);
        if (ctx.recentPinsParam) params.set("recentPins", ctx.recentPinsParam);

        const res = await fetch(`/api/search/suggestions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok || cancelled || reqId !== requestSeqRef.current) return;
        const payload = (await res.json()) as SmartSearchResponseDto;
        if (cancelled || reqId !== requestSeqRef.current) return;

        setQueryCacheEntry(ctx.cacheKey, normalizedQuery, payload);
        setQueryData(payload);
        setHighlightedIndex(-1);
      } catch {
        // Ignore aborted or transient errors on live autocomplete
      } finally {
        if (!cancelled && reqId === requestSeqRef.current) {
          setIsLoadingQuery(false);
        }
      }
    }, 95);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, normalizedQuery, trimmedQuery]);

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

  // Flatten interactive rows for desktop keyboard Up/Down navigation
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
      if (focusData?.mode === "focus") {
        for (const pin of focusData.recentlyViewedPins) {
          list.push({
            id: `viewed-${pin.id}`,
            execute: () => onSelectPin(pin),
          });
        }
        for (const idea of focusData.forYouIdeas) {
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
        for (const trend of focusData.trendingSearches) {
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

    if (queryData?.mode === "query") {
      for (const hotel of queryData.matchedHotels) {
        list.push({
          id: `hotel-${hotel.id}`,
          execute: () => onSelectHotel(hotel),
        });
      }
      for (const comp of queryData.smartCompletions) {
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
      for (const dest of queryData.matchedDestinations) {
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
    focusData,
    isOpen,
    isTh,
    onSelectHotel,
    onSelectPin,
    onSelectQuery,
    queryData,
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

  if (variant === "desktop" && !desktopPresence.shouldRender) return null;

  const isFocusMode = trimmedQuery.length === 0;
  const focusPayload = focusData?.mode === "focus" ? focusData : null;
  const queryPayload = queryData?.mode === "query" ? queryData : null;

  const showFocusSkeleton = isLoadingFocus && !focusPayload;
  const showQuerySkeleton = isLoadingQuery && !queryPayload;

  // Borderless Airbnb Warm Minimal interactive row (Zero 4-sided card borders, zero hover scale!)
  const rowBase =
    "group w-full text-left rounded-[12px] hover:bg-[var(--color-background-muted)] active:bg-[var(--color-background-subtle)] transition-colors cursor-pointer";

  const wrapperClass =
    variant === "desktop"
      ? "absolute left-0 right-0 top-[calc(100%+8px)] z-[65] max-h-[min(76vh,660px)] overflow-y-auto overscroll-y-contain rounded-[20px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] p-4 sm:p-5 cgr-popover-motion"
      : "w-full";

  return (
    <div
      role="listbox"
      data-state={variant === "desktop" ? desktopPresence.dataState : undefined}
      aria-label={isTh ? "คำแนะนำการค้นหาอัจฉริยะ" : "Smart search suggestions"}
      onMouseDown={(e) => {
        // Keep desktop input focused when scrolling inside popover
        if (
          variant === "desktop" &&
          (e.target as HTMLElement).closest("button") === null
        ) {
          e.preventDefault();
        }
      }}
      className={wrapperClass}
    >
      {/* ===================================================================
          MODE 1: FOCUS MODE (Recent -> Recently Viewed -> For You -> Trending)
      ==================================================================== */}
      {isFocusMode ? (
        <div className="divide-y divide-[var(--color-border)]">
          {/* 1A. Local Recent Searches — compact borderless pills on mobile, clean grid on desktop */}
          {recentSearches.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
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
                  className="px-2.5 py-1 rounded-full ty-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] transition-colors cursor-pointer"
                >
                  {isTh ? "ล้างทั้งหมด" : "Clear all"}
                </button>
              </div>

              {variant === "mobile" ? (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 6).map((rec) => (
                    <div
                      key={rec.query}
                      className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] pl-3 pr-1 py-1 max-w-full"
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
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-primary)] truncate max-w-[180px] cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                        <span className="truncate">{rec.query}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={
                          isTh ? `ลบ ${rec.query}` : `Remove ${rec.query}`
                        }
                        onClick={(e) => handleDeleteRecent(e, rec.query)}
                        className="ml-1 h-6 w-6 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {recentSearches.slice(0, 6).map((rec) => {
                    const idx = indexMap.get(`recent-${rec.query}`) ?? -1;
                    const isActive = idx >= 0 && idx === highlightedIndex;
                    return (
                      <div
                        key={rec.query}
                        className={`flex items-center gap-1.5 rounded-[12px] pr-1.5 transition-colors ${
                          isActive
                            ? "bg-[var(--color-background-muted)]"
                            : "hover:bg-[var(--color-background-muted)]"
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
                          className="flex-1 min-w-0 flex items-center gap-2.5 p-1.5 text-left cursor-pointer rounded-[12px]"
                        >
                          {rec.imageUrl ? (
                            <img
                              src={rec.imageUrl}
                              alt=""
                              loading="eager"
                              className="w-10 h-10 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                            />
                          ) : (
                            <span className="w-10 h-10 aspect-square rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                              <History className="w-4 h-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                              {rec.query}
                            </p>
                            {rec.subtitle && (
                              <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                                {rec.subtitle}
                              </p>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          aria-label={
                            isTh ? `ลบ ${rec.query}` : `Remove ${rec.query}`
                          }
                          onClick={(e) => handleDeleteRecent(e, rec.query)}
                          className="h-7 w-7 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 1B. Recently Viewed Places (Direct Jump back to Pin) */}
          {focusPayload && focusPayload.recentlyViewedPins.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <Compass className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "ที่คุณเพิ่งดูล่าสุด" : "Recently viewed"}
                </h3>
              </div>

              <div
                className={
                  variant === "mobile"
                    ? "divide-y divide-[var(--color-border)]"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                }
              >
                {focusPayload.recentlyViewedPins
                  .slice(0, variant === "mobile" ? 4 : 6)
                  .map((pin) => {
                    const idx = indexMap.get(`viewed-${pin.id}`) ?? -1;
                    const isActive = idx >= 0 && idx === highlightedIndex;
                    return (
                      <button
                        key={pin.id}
                        type="button"
                        onClick={() => onSelectPin(pin)}
                        className={`${rowBase} ${
                          variant === "mobile" ? "py-2.5 px-1.5" : "p-2"
                        } flex items-center gap-3 ${
                          isActive ? "bg-[var(--color-background-muted)]" : ""
                        }`}
                      >
                        <img
                          src={pin.imageUrl}
                          alt={isTh ? pin.titleTh : pin.titleEn}
                          loading="eager"
                          className="w-11 h-11 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                            {isTh ? pin.hotelNameTh : pin.hotelNameEn}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                            {isTh ? pin.provinceNameTh : pin.provinceNameEn}
                            {pin.priceFromThb
                              ? ` · ฿${pin.priceFromThb.toLocaleString()}`
                              : ""}
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 opacity-60" />
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          {/* 1C. Ideas for You (Personalized Taste + Geo + Budget + Active Deals) */}
          {showFocusSkeleton ? (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
              <div className="h-4 w-36 rounded-full bg-[var(--color-background-muted)] animate-pulse" />
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
              <section className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                    <h3 className="ty-caption font-semibold">
                      {focusPayload.hasPersonalSignal
                        ? isTh
                          ? "แนะนำตรงใจคุณ"
                          : "Picked for you"
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

                <div
                  className={
                    variant === "mobile"
                      ? "divide-y divide-[var(--color-border)]"
                      : "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                  }
                >
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
                        className={`${rowBase} ${
                          variant === "mobile" ? "py-2.5 px-1.5" : "p-2"
                        } flex items-center gap-3 ${
                          isActive ? "bg-[var(--color-background-muted)]" : ""
                        }`}
                      >
                        <img
                          src={idea.imageUrl}
                          alt={isTh ? idea.titleTh : idea.titleEn}
                          loading="eager"
                          className="w-12 h-12 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                              {isTh ? idea.titleTh : idea.titleEn}
                            </span>
                            {(isTh ? idea.badgeTh : idea.badgeEn) && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--color-background-muted)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
                                {isTh ? idea.badgeTh : idea.badgeEn}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">
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

          {/* 1D. Trending Now on Nondii */}
          {focusPayload && focusPayload.trendingSearches.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <Flame className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "กำลังฮิตใน Nondii" : "Trending on Nondii"}
                </h3>
              </div>

              <div
                className={
                  variant === "mobile"
                    ? "divide-y divide-[var(--color-border)]"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                }
              >
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
                      className={`${rowBase} ${
                        variant === "mobile" ? "py-2.5 px-1.5" : "p-2"
                      } flex items-center gap-3 ${
                        isActive ? "bg-[var(--color-background-muted)]" : ""
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={isTh ? item.titleTh : item.titleEn}
                        loading="lazy"
                        className="w-11 h-11 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? item.titleTh : item.titleEn}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? item.subtitleTh : item.subtitleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ===================================================================
           MODE 2: AS-YOU-TYPE PREDICTIVE OMNIBOX (Stale-While-Revalidate)
        ==================================================================== */
        <div
          className={`divide-y divide-[var(--color-border)] transition-opacity duration-150 ${
            isLoadingQuery && queryPayload ? "opacity-80" : "opacity-100"
          }`}
        >
          {showQuerySkeleton && (
            <div className="py-2 space-y-2.5">
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="h-12 rounded-[12px] bg-[var(--color-background-muted)] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* 2A. Direct Place Jumps -> /{hotelSlug} (Highest conversion first!) */}
          {queryPayload && queryPayload.matchedHotels.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                  {isTh ? "สถานที่และร้านที่ตรงกัน" : "Matching places"}
                </h3>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {queryPayload.matchedHotels.map((hotel) => {
                  const idx = indexMap.get(`hotel-${hotel.id}`) ?? -1;
                  const isActive = idx >= 0 && idx === highlightedIndex;
                  const couponText = isTh
                    ? hotel.couponSummaryTh
                    : hotel.couponSummaryEn;
                  const categoryLabel = isTh
                    ? hotel.categoryLabelTh
                    : hotel.categoryLabelEn;
                  return (
                    <button
                      key={hotel.id}
                      type="button"
                      onClick={() => onSelectHotel(hotel)}
                      className={`${rowBase} py-2.5 px-1.5 flex items-center gap-3 ${
                        isActive ? "bg-[var(--color-background-muted)]" : ""
                      }`}
                    >
                      <img
                        src={hotel.imageUrl}
                        alt={isTh ? hotel.nameTh : hotel.nameEn}
                        className="w-12 h-12 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                            {isTh ? hotel.nameTh : hotel.nameEn}
                          </span>
                          {couponText && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-background-muted)] text-[10px] font-semibold text-[var(--color-accent)]">
                              <Ticket className="w-3 h-3" />
                              <span className="truncate max-w-[110px]">
                                {couponText}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                          {categoryLabel && (
                            <span className="font-medium text-[var(--color-text-primary)]">
                              {categoryLabel}
                            </span>
                          )}
                          <span className="truncate">
                            {hotel.districtTh
                              ? `${hotel.districtTh}, ${
                                  isTh
                                    ? hotel.provinceNameTh
                                    : hotel.provinceNameEn
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
                      <ArrowUpRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2B. Smart Predictive Completions */}
          {queryPayload && queryPayload.smartCompletions.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <h3 className="ty-caption font-semibold">
                  {isTh ? "คำค้นหาที่ใกล้เคียง" : "Suggested queries"}
                </h3>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
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
                      className={`${rowBase} py-2.5 px-1.5 flex items-center gap-3 ${
                        isActive ? "bg-[var(--color-background-muted)]" : ""
                      }`}
                    >
                      {comp.imageUrl ? (
                        <img
                          src={comp.imageUrl}
                          alt=""
                          className="w-10 h-10 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                      ) : (
                        <span className="w-10 h-10 aspect-square rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                          <Search className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? comp.labelTh : comp.labelEn}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                          {isTh ? comp.reasonTh : comp.reasonEn}
                        </p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2C. Categories, Provinces, Styles & Tags */}
          {queryPayload && queryPayload.matchedDestinations.length > 0 && (
            <section className="py-3.5 first:pt-0 last:pb-0 space-y-2">
              <h3 className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                {isTh
                  ? "หมวดหมู่ จังหวัด และสไตล์"
                  : "Categories, destinations & styles"}
              </h3>

              <div
                className={
                  variant === "mobile"
                    ? "divide-y divide-[var(--color-border)]"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                }
              >
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
                      className={`${rowBase} ${
                        variant === "mobile" ? "py-2.5 px-1.5" : "p-2"
                      } flex items-center gap-3 ${
                        isActive ? "bg-[var(--color-background-muted)]" : ""
                      }`}
                    >
                      {dest.imageUrl ? (
                        <img
                          src={dest.imageUrl}
                          alt=""
                          className="w-10 h-10 aspect-square rounded-[10px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                        />
                      ) : (
                        <span className="w-10 h-10 aspect-square rounded-[10px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                          {dest.type === "category" ? (
                            <Tag className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                          {isTh ? dest.nameTh : dest.nameEn}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
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
          <div className="pt-3 first:pt-0">
            <button
              type="button"
              onClick={() => onSelectQuery({ query: trimmedQuery })}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-full text-left transition-colors cursor-pointer ${
                highlightedIndex === actionItems.length - 1
                  ? "bg-[var(--color-background-subtle)]"
                  : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <span className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                  {isTh
                    ? `ค้นหาทั้งหมดสำหรับ “${trimmedQuery}”`
                    : `Search all results for “${trimmedQuery}”`}
                </span>
              </span>
              {variant === "desktop" && (
                <span className="ty-caption text-[var(--color-text-secondary)] shrink-0">
                  Enter ↵
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Subtle Desktop Keyboard Legend */}
      {variant === "desktop" && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
          <span>
            {isTh
              ? "เรียงผลลัพธ์จากใกล้เคียงที่สุดไปน้อย — ไม่มีหน้าว่างเปล่า"
              : "Ranked closest to furthest — zero empty dead-ends"}
          </span>
          <span className="hidden sm:inline">
            ↑↓ {isTh ? "เลือก" : "Navigate"} · Enter{" "}
            {isTh ? "เปิด" : "Select"} · Esc {isTh ? "ปิด" : "Close"}
          </span>
        </div>
      )}
    </div>
  );
}
