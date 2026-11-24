"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  STAY_STYLE_TABS,
  VALID_STYLE_TAGS,
} from "@/data/thailandProvinces";
import {
  getEncodedSessionTasteParam,
  getRecentViewedPinIds,
  RECENT_VIEWS_UPDATED_EVENT,
  recordRecentViewedPinId,
  trackPinInteraction,
  trackTelemetryEvent,
} from "@/lib/telemetry/clientTelemetry";
import { clearLastClickedPinOrigin } from "@/lib/pinOriginStore";
import { useHotelApp } from "@/components/HotelAppShell";
import type { PureMediaSlide } from "@/components/media/PureMediaViewer";
import { DealSlideRow } from "@/components/home/DealSlideRow";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import { useUltraHorizontalScroll } from "@/lib/useUltraHorizontalScroll";
import type {
  HotelPostSummaryDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";

// Code-split heavy detail modal (3,950+ lines) & fullscreen media viewer out of the initial Home JS bundle!
const PinterestPinDetail = dynamic(
  () =>
    import("@/components/home/PinterestPinDetail").then(
      (m) => m.PinterestPinDetail
    ),
  { ssr: false }
);
const PureMediaViewer = dynamic(
  () =>
    import("@/components/media/PureMediaViewer").then(
      (m) => m.PureMediaViewer
    ),
  { ssr: false }
);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type DealSourceFilter = "ALL" | "INTERNAL" | "EXTERNAL";

export interface HomeFeedClientProps {
  initialPins: PinFeedItemDto[];
  initialRecentPinIds?: string[];
  initialRecentPins?: PinFeedItemDto[];
  initialStyleTab?: string;
  initialSourceFilter?: DealSourceFilter;
  initialStayId?: string | null;
  initialPinDetail?: {
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
    hotelPosts?: HotelPostSummaryDto[];
    ownerFeedPosts?: HotelPostSummaryDto[];
    ownerBlogs?: HotelPostSummaryDto[];
    nearbyPlaces?: PinFeedItemDto[];
  } | null;
}

/**
 * Deduplicate pins by hotelId + dealSourceType so every Card Slide row displays
 * distinct properties/deals instead of repeating the same stay.
 */
function pickPrimaryDealPerHotel(pins: PinFeedItemDto[]): PinFeedItemDto[] {
  const bestByHotel = new Map<string, PinFeedItemDto>();

  const scoreDeal = (p: PinFeedItemDto) => {
    let sc = 0;
    if (p.promoHeadlineTh) sc += 100;
    if (p.activeCoupon || p.promoCode) sc += 60;
    if (p.promoDealPriceThb) sc += 40;
    if (p.isSponsored) sc += 25;
    if (p.mediaUrls.length > 1) sc += 10;
    sc += Math.min(20, p.likesCount * 0.05);
    return sc;
  };

  for (const pin of pins) {
    const key = `${pin.hotelId}:${pin.dealSourceType}`;
    const existing = bestByHotel.get(key);
    if (!existing || scoreDeal(pin) > scoreDeal(existing)) {
      bestByHotel.set(key, pin);
    }
  }

  return Array.from(bestByHotel.values());
}

const STYLE_GROUP_TITLES: Record<string, { th: string; en: string }> = {
  mountain: { th: "ภูเขา & ทะเลหมอก", en: "Mountain & mist stays" },
  "pool-villa": { th: "พูลวิลล่าส่วนตัว", en: "Private pool villas" },
  sea: { th: "ติดทะเล & ชายหาด", en: "Beachfront & island deals" },
  bars: { th: "บาร์ & รูฟท็อป", en: "Rooftop & bar stays" },
  bathtub: { th: "อ่างแช่น้ำ & ออนเซ็น", en: "Onsen & soaking tubs" },
  glamping: { th: "แกลมปิ้ง & เคบิน", en: "Glamping & mountain cabins" },
};

export function HomeFeedClient({
  initialPins,
  initialRecentPinIds = [],
  initialRecentPins = [],
  initialStyleTab = "all",
  initialSourceFilter = "ALL",
  initialStayId = null,
  initialPinDetail = null,
}: HomeFeedClientProps) {
  const {
    lang: language,
    user: currentUser,
    globalSearchQuery,
    setGlobalSearchQuery,
    openAuthModal,
    savedPinIds: globalSavedPinIds,
    hasLoadedBoardsOnce,
    triggerPinToBoard,
    togglePinLikeInstant,
    navigateToPlaceWithFlip,
  } = useHotelApp();

  const isTh = language === "th";

  const resolvedInitialAnchor = VALID_STYLE_TAGS.has(initialStyleTab)
    ? initialStyleTab
    : "all";

  const [activeAnchorId, setActiveAnchorId] = useState<string>(
    resolvedInitialAnchor
  );
  const [sourceFilter, setSourceFilter] =
    useState<DealSourceFilter>(initialSourceFilter);
  const [isTabsPinned, setIsTabsPinned] = useState<boolean>(false);

  const [masterPins, setMasterPins] = useState<PinFeedItemDto[]>(initialPins);
  const [recentPinIds, setRecentPinIds] = useState<string[]>(() =>
    initialRecentPinIds.length > 0
      ? initialRecentPinIds
      : initialRecentPins.map((p) => p.id)
  );
  const [extraRecentPinsById, setExtraRecentPinsById] = useState<
    Record<string, PinFeedItemDto>
  >(() => {
    const map: Record<string, PinFeedItemDto> = {};
    for (const p of initialRecentPins) map[p.id] = p;
    return map;
  });
  const [searchPins, setSearchPins] = useState<PinFeedItemDto[] | null>(null);
  const [isLoadingPins, setIsLoadingPins] = useState<boolean>(
    initialPins.length === 0
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(
    initialStayId
  );
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(initialPinDetail?.pin ?? null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
    hotelPosts?: HotelPostSummaryDto[];
    ownerFeedPosts?: HotelPostSummaryDto[];
    ownerBlogs?: HotelPostSummaryDto[];
    nearbyPlaces?: PinFeedItemDto[];
  } | null>(initialPinDetail);
  const latestPinReqRef = useRef<string | null>(initialStayId);
  const [optimisticSavedIds, setOptimisticSavedIds] = useState<Set<string>>(
    () => new Set(initialPins.filter((p) => p.isSavedByMe).map((p) => p.id))
  );
  const [hiddenPinIds, setHiddenPinIds] = useState<Set<string>>(
    () => new Set()
  );
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

  const inlineTabsSentinelRef = useRef<HTMLDivElement | null>(null);
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const stickyTabsScrollRef = useRef<HTMLDivElement | null>(null);
  useUltraHorizontalScroll(tabsScrollRef);
  useUltraHorizontalScroll(stickyTabsScrollRef);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stickyTabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const savedFeedScrollYRef = useRef<number>(0);
  const wasPinOpenRef = useRef<boolean>(Boolean(initialStayId));
  const anchorScrollLockUntilRef = useRef<number>(0);

  // Sync URL query params (?stay=..., ?source=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const stayParam = params.get("stay") || params.get("pin");
      setSelectedPinId(stayParam);

      const srcParam = (params.get("source") || "").toUpperCase();
      if (srcParam === "INTERNAL" || srcParam === "EXTERNAL") {
        setSourceFilter(srcParam);
      }
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const loadMasterPins = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingPins(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "100");
      qs.set("compact", "1");
      const tasteParam = getEncodedSessionTasteParam();
      if (tasteParam) qs.set("taste", tasteParam);
      const res = await fetch(`/api/pins?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        pins?: PinFeedItemDto[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถโหลดรายการโปรที่พักได้");
      }
      const fetched = data.pins || [];
      setMasterPins(fetched);
      setOptimisticSavedIds(
        new Set(fetched.filter((p) => p.isSavedByMe).map((p) => p.id))
      );
    } catch (err) {
      if (!silent) {
        setFetchError(
          err instanceof Error ? err.message : "โหลดรายการโปรที่พักไม่สำเร็จ"
        );
      }
    } finally {
      if (!silent) setIsLoadingPins(false);
    }
  }, []);

  useEffect(() => {
    if (initialPins.length === 0) {
      void loadMasterPins(false);
    }
  }, [initialPins.length, loadMasterPins]);

  // Sync recently viewed pin IDs (local instant history + DB SSR history + cross-tab sync)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dbIds =
      initialRecentPinIds.length > 0
        ? initialRecentPinIds
        : initialRecentPins.map((p) => p.id);

    const mergeIds = (localIds: string[]) => {
      const merged: string[] = [];
      const seen = new Set<string>();
      for (const id of [...localIds, ...dbIds]) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(id);
        if (merged.length >= 24) break;
      }
      setRecentPinIds(merged);
    };

    mergeIds(getRecentViewedPinIds());

    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ pinIds?: string[] }>).detail;
      mergeIds(Array.isArray(detail?.pinIds) ? detail.pinIds : getRecentViewedPinIds());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cgr_recent_viewed_pins_v1") {
        mergeIds(getRecentViewedPinIds());
      }
    };
    window.addEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_VIEWS_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [initialRecentPinIds, initialRecentPins]);

  // Hydrate any locally recorded recent pin IDs not present in masterPins from real Postgres DB
  useEffect(() => {
    if (recentPinIds.length === 0) return;
    const known = new Set<string>(masterPins.map((p) => p.id));
    for (const id of Object.keys(extraRecentPinsById)) known.add(id);
    const missing = recentPinIds.filter((id) => !known.has(id)).slice(0, 20);
    if (missing.length === 0) return;

    let cancelled = false;
    fetch(`/api/pins?ids=${encodeURIComponent(missing.join(","))}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pins?: PinFeedItemDto[] } | null) => {
        if (cancelled || !data?.pins?.length) return;
        setExtraRecentPinsById((prev) => {
          const next = { ...prev };
          for (const p of data.pins!) next[p.id] = p;
          return next;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [recentPinIds, masterPins, extraRecentPinsById]);

  const recentViewedDeals = useMemo(() => {
    if (recentPinIds.length === 0) return [];
    const byId = new Map<string, PinFeedItemDto>();
    for (const p of Object.values(extraRecentPinsById)) byId.set(p.id, p);
    for (const p of masterPins) byId.set(p.id, p);

    const seenHotels = new Set<string>();
    const out: PinFeedItemDto[] = [];
    for (const id of recentPinIds) {
      if (hiddenPinIds.has(id)) continue;
      const pin = byId.get(id);
      if (!pin) continue;
      if (sourceFilter !== "ALL" && pin.dealSourceType !== sourceFilter) {
        continue;
      }
      if (seenHotels.has(pin.hotelId)) continue;
      seenHotels.add(pin.hotelId);
      out.push(pin);
      if (out.length >= 16) break;
    }
    return out;
  }, [recentPinIds, extraRecentPinsById, masterPins, hiddenPinIds, sourceFilter]);

  // Debounced search query fetch
  useEffect(() => {
    const trimmed = globalSearchQuery.trim();
    if (!trimmed) {
      setSearchPins(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (masterPins.length === 0) setIsLoadingPins(true);
      setFetchError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("q", trimmed);
        qs.set("limit", "100");
        const tasteParam = getEncodedSessionTasteParam();
        if (tasteParam) qs.set("taste", tasteParam);

        const res = await fetch(`/api/pins?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          pins?: PinFeedItemDto[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "ไม่สามารถค้นหาโปรที่พักได้");
        }
        if (!cancelled) {
          setSearchPins(data.pins || []);
        }
      } catch (err) {
        if (!cancelled && masterPins.length === 0) {
          setFetchError(
            err instanceof Error ? err.message : "ค้นหาโปรที่พักไม่สำเร็จ"
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPins(false);
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [globalSearchQuery, masterPins.length]);

  // Deduplicated deal catalog (1 hero coupon per hotel+source) filtered by Source switcher
  const visibleCatalog = useMemo(() => {
    const base = globalSearchQuery.trim()
      ? searchPins ?? masterPins
      : masterPins;
    const nonHidden = base.filter((p) => !hiddenPinIds.has(p.id));
    const deduped = pickPrimaryDealPerHotel(nonHidden);
    if (sourceFilter === "ALL") return deduped;
    return deduped.filter((p) => p.dealSourceType === sourceFilter);
  }, [globalSearchQuery, searchPins, masterPins, hiddenPinIds, sourceFilter]);

  // Build pure horizontal Card Slide groups matching the top Anchor Tabs
  const slideGroups = useMemo(() => {
    const internalDeals = visibleCatalog.filter(
      (p) => p.placeCategory === "STAY" && p.dealSourceType === "INTERNAL"
    );
    const cafeDiningPlaces = visibleCatalog.filter(
      (p) => p.placeCategory === "CAFE" || p.placeCategory === "RESTAURANT"
    );
    const attractionWellnessPlaces = visibleCatalog.filter(
      (p) => p.placeCategory === "ATTRACTION" || p.placeCategory === "WELLNESS"
    );
    const externalDeals = visibleCatalog.filter(
      (p) => p.placeCategory === "STAY" && p.dealSourceType === "EXTERNAL"
    );

    const styleGroups = STAY_STYLE_TABS.filter((t) => t.id !== "all").map(
      (tab) => {
        const titleMeta = STYLE_GROUP_TITLES[tab.id] ?? {
          th: tab.labelTh,
          en: tab.labelEn,
        };
        return {
          id: tab.id,
          anchorDomId: `group-${tab.id}`,
          titleTh: titleMeta.th,
          titleEn: titleMeta.en,
          seeAllHref: `/style/${encodeURIComponent(tab.id)}`,
          deals: visibleCatalog.filter((p) => p.stayStyles.includes(tab.id)),
        };
      }
    );

    return {
      internalDeals,
      cafeDiningPlaces,
      attractionWellnessPlaces,
      externalDeals,
      styleGroups,
    };
  }, [visibleCatalog]);

  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    try {
      const tasteParam = getEncodedSessionTasteParam();
      const qs = tasteParam ? `?taste=${tasteParam}` : "";
      const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}${qs}`, {
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
      if (pinDetail?.pin.id === selectedPinId) return;
      setPinDetail(null);
      void loadPinDetail(selectedPinId);
    } else {
      latestPinReqRef.current = null;
      setSelectedPinSnapshot(null);
      setPinDetail(null);
    }
  }, [selectedPinId, pinDetail?.pin.id, loadPinDetail]);

  const handleClosePin = useCallback(() => {
    latestPinReqRef.current = null;
    setDetailRestoreScrollY(null);
    setPinHistoryStack([]);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("stay");
      url.searchParams.delete("pin");
      window.history.pushState(null, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResetHomePin = () => handleClosePin();
    window.addEventListener("cgr:reset-home-pin", onResetHomePin);
    return () =>
      window.removeEventListener("cgr:reset-home-pin", onResetHomePin);
  }, [handleClosePin]);

  const currentOpenPin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return (
      visibleCatalog.find((p) => p.id === selectedPinId) ??
      masterPins.find((p) => p.id === selectedPinId) ??
      null
    );
  }, [pinDetail, selectedPinId, selectedPinSnapshot, visibleCatalog, masterPins]);

  const handleSelectPin = useCallback(
    (pin: PinFeedItemDto, pushHistoryStack = true) => {
      setDetailRestoreScrollY(null);

      if (typeof window !== "undefined" && !currentOpenPin) {
        savedFeedScrollYRef.current = window.scrollY;
      }

      if (pushHistoryStack && currentOpenPin && currentOpenPin.id !== pin.id) {
        const currentDetailScrollY =
          typeof window !== "undefined" ? window.scrollY : 0;
        setPinHistoryStack((prev) =>
          [
            ...prev.filter(
              (entry) =>
                entry.pin.id !== currentOpenPin.id && entry.pin.id !== pin.id
            ),
            { pin: currentOpenPin, scrollY: currentDetailScrollY },
          ].slice(-20)
        );
      }

      recordRecentViewedPinId(pin.id);
      setExtraRecentPinsById((prev) =>
        prev[pin.id] ? prev : { ...prev, [pin.id]: pin }
      );
      setSelectedPinSnapshot(pin);
      setPinDetail((prev) => (prev?.pin.id === pin.id ? prev : null));
      setSelectedPinId(pin.id);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("pin");
        url.searchParams.set("stay", pin.id);
        window.history.pushState(null, "", url.toString());
        if (window.innerWidth >= 1024) {
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }
      }
    },
    [currentOpenPin]
  );

  const handleStepBackPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleClosePin();
      return;
    }
    const prevEntry = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((prev) => prev.slice(0, -1));
    setDetailRestoreScrollY(prevEntry.scrollY);
    setSelectedPinSnapshot(prevEntry.pin);
    setPinDetail(null);
    setSelectedPinId(prevEntry.pin.id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("pin");
      url.searchParams.set("stay", prevEntry.pin.id);
      window.history.pushState(null, "", url.toString());
      if (window.innerWidth >= 1024) {
        window.scrollTo({
          top: Math.max(0, prevEntry.scrollY),
          behavior: "instant" as ScrollBehavior,
        });
      }
    }
  }, [pinHistoryStack, handleClosePin]);

  const handleHidePin = useCallback(
    (pinId: string) => {
      setHiddenPinIds((prev) => {
        const next = new Set(prev);
        next.add(pinId);
        return next;
      });
      if (selectedPinId === pinId) {
        handleStepBackPin();
      }
    },
    [selectedPinId, handleStepBackPin]
  );

  const handleToggleSave = async (pinId: string) => {
    const targetPin =
      (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
      masterPins.find((p) => p.id === pinId) ??
      visibleCatalog.find((p) => p.id === pinId) ??
      (selectedPinSnapshot?.id === pinId ? selectedPinSnapshot : null);

    if (!targetPin) return;

    const result = await triggerPinToBoard({
      id: targetPin.id,
      coverImageUrl: targetPin.coverImageUrl,
      isSavedByMe:
        globalSavedPinIds.has(targetPin.id) || targetPin.isSavedByMe,
    });
    if (!result) return;

    if (result.isSaved) {
      trackPinInteraction("PIN_SAVE", targetPin);
    }
    setOptimisticSavedIds((prev) => {
      const next = new Set(prev);
      if (result.isSaved) next.add(pinId);
      else next.delete(pinId);
      return next;
    });
    const updatePinSave = (list: PinFeedItemDto[]) =>
      list.map((p) =>
        p.id === pinId ? { ...p, isSavedByMe: result.isSaved } : p
      );
    setMasterPins(updatePinSave);
    setSearchPins((prev) => (prev ? updatePinSave(prev) : null));
    setSelectedPinSnapshot((prev) =>
      prev && prev.id === pinId ? { ...prev, isSavedByMe: result.isSaved } : prev
    );
    if (pinDetail?.pin.id === pinId) {
      setPinDetail((prev) =>
        prev
          ? { ...prev, pin: { ...prev.pin, isSavedByMe: result.isSaved } }
          : prev
      );
    }
  };

  const handleToggleSaveRef = useRef(handleToggleSave);
  handleToggleSaveRef.current = handleToggleSave;
  const handleToggleSaveStable = useCallback((pinId: string) => {
    void handleToggleSaveRef.current(pinId);
  }, []);

  const handleSelectPinRef = useRef(handleSelectPin);
  handleSelectPinRef.current = handleSelectPin;
  const handleSelectFeedDeal = useCallback(
    (
      p: PinFeedItemDto,
      originRect?: CardOriginRect | null,
      event?: React.MouseEvent | React.KeyboardEvent
    ) => {
      navigateToPlaceWithFlip({
        pin: p,
        originRect,
        openInNewTab: Boolean(
          event && "metaKey" in event && (event.metaKey || event.ctrlKey)
        ),
      });
    },
    [navigateToPlaceWithFlip]
  );

  const effectiveSavedPinIds =
    currentUser && !hasLoadedBoardsOnce ? optimisticSavedIds : globalSavedPinIds;

  const handleToggleLike = (pinId: string) => {
    const targetPin =
      (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
      masterPins.find((p) => p.id === pinId);
    if (!targetPin) return;
    togglePinLikeInstant({
      id: targetPin.id,
      isLikedByMe: targetPin.isLikedByMe,
      likesCount: targetPin.likesCount,
    });
    if (currentUser && !targetPin.isLikedByMe) {
      trackPinInteraction("PIN_LIKE", targetPin);
    }
  };

  const handleSharePin = async (pin: PinFeedItemDto) => {
    trackPinInteraction("PIN_SHARE", pin);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?stay=${encodeURIComponent(pin.id)}`
        : "";
    let channel: "WEB_SHARE" | "COPY_LINK" = "COPY_LINK";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: pin.titleTh,
          text: pin.descriptionTh,
          url: shareUrl,
        });
        channel = "WEB_SHARE";
      } catch {
        // fallback clipboard
      }
    }
    if (
      channel === "COPY_LINK" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    await fetch(`/api/pins/${encodeURIComponent(pin.id)}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    }).catch(() => {});
  };

  const handleAddComment = async (
    text: string,
    parentId?: string | null
  ) => {
    if (!selectedPinId) return;
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อแสดงความคิดเห็น",
        reasonEn: "Log in to post a comment",
        onSuccess: async () => {
          const res = await fetch(
            `/api/pins/${encodeURIComponent(selectedPinId)}/comments`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: text, parentId }),
            }
          );
          if (res.ok) await loadPinDetail(selectedPinId);
        },
      });
      return;
    }

    const res = await fetch(
      `/api/pins/${encodeURIComponent(selectedPinId)}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId }),
      }
    );
    if (res.ok) await loadPinDetail(selectedPinId);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPinId) return;
    const res = await fetch(
      `/api/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" }
    );
    if (res.ok) await loadPinDetail(selectedPinId);
  };

  const activePin = currentOpenPin;

  // Restore scroll position when closing Detail Stage
  useIsomorphicLayoutEffect(() => {
    const isNowOpen = Boolean(activePin);
    if (wasPinOpenRef.current && !isNowOpen && typeof window !== "undefined") {
      window.scrollTo({
        top: savedFeedScrollYRef.current,
        behavior: "instant" as ScrollBehavior,
      });
    }
    wasPinOpenRef.current = isNowOpen;
  }, [activePin]);

  const activePinComments = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id ? pinDetail.comments : [],
    [activePin, pinDetail]
  );

  // Deduplicated related deals + symmetrical Card Slide groups for Deal Detail (both Mobile & Desktop!)
  // Strictly excludes the currently viewed card AND any other deal from the same hotel.
  const allOtherDeals = useMemo(() => {
    if (!activePin) return [];
    const catalog = pickPrimaryDealPerHotel(
      masterPins.filter((p) => !hiddenPinIds.has(p.id))
    );
    const seenHotels = new Set<string>([activePin.hotelId]);
    return catalog.filter((p) => {
      if (
        p.id === activePin.id ||
        p.hotelId === activePin.hotelId ||
        p.hotelSlug === activePin.hotelSlug
      ) {
        return false;
      }
      if (seenHotels.has(p.hotelId)) return false;
      seenHotels.add(p.hotelId);
      return true;
    });
  }, [activePin, masterPins, hiddenPinIds]);

  const prevPinPreview =
    pinHistoryStack.length > 0
      ? pinHistoryStack[pinHistoryStack.length - 1]?.pin ?? null
      : allOtherDeals[allOtherDeals.length - 1] ?? null;
  const nextPinPreview = allOtherDeals[0] ?? null;

  const handleNavigatePin = useCallback(
    (direction: "prev" | "next") => {
      if (!activePin) return;
      clearLastClickedPinOrigin();
      if (direction === "prev" && pinHistoryStack.length > 0) {
        handleStepBackPin();
        return;
      }
      if (allOtherDeals.length === 0) return;
      const target =
        direction === "next"
          ? allOtherDeals[0]
          : allOtherDeals[allOtherDeals.length - 1];
      if (target) handleSelectPin(target, true);
    },
    [
      activePin,
      pinHistoryStack.length,
      allOtherDeals,
      handleStepBackPin,
      handleSelectPin,
    ]
  );

  // Sticky Anchor Tabs Observer
  useEffect(() => {
    if (activePin) {
      setIsTabsPinned(false);
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    const sentinelEl = inlineTabsSentinelRef.current;
    if (!sentinelEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsTabsPinned(!entry.isIntersecting);
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [activePin]);

  // Smooth rAF-Throttled Scroll-Spy for Anchor Tabs (zero layout thrash on mobile scroll!)
  useEffect(() => {
    if (activePin || typeof window === "undefined") return;
    const sectionIds = STAY_STYLE_TABS.map((t) => ({
      tabId: t.id,
      domId: t.id === "all" ? "group-all" : `group-${t.id}`,
    }));

    let rafId = 0;
    const evaluateScroll = () => {
      rafId = 0;
      if (Date.now() < anchorScrollLockUntilRef.current) return;
      if (window.scrollY < 100) {
        setActiveAnchorId((prev) => (prev === "all" ? prev : "all"));
        return;
      }
      let current = "all";
      const offsetTop = 160;
      for (const item of sectionIds) {
        const el = document.getElementById(item.domId);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offsetTop) {
          current = item.tabId;
        }
      }
      setActiveAnchorId((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(evaluateScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, [activePin, visibleCatalog.length]);

  // Keep active anchor tab centered in horizontal scroller
  useEffect(() => {
    if (activePin) return;
    const syncScroller = (
      scroller: HTMLDivElement | null,
      btn: HTMLButtonElement | null
    ) => {
      if (!scroller || !btn || scroller.scrollWidth <= scroller.clientWidth) {
        return;
      }
      const targetLeft = Math.max(
        0,
        Math.min(
          scroller.scrollWidth - scroller.clientWidth,
          btn.offsetLeft + btn.offsetWidth / 2 - scroller.clientWidth / 2
        )
      );
      scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    };
    syncScroller(tabsScrollRef.current, tabButtonRefs.current[activeAnchorId]);
    syncScroller(
      stickyTabsScrollRef.current,
      stickyTabButtonRefs.current[activeAnchorId]
    );
  }, [activeAnchorId, activePin, language]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isTabsPinned && !activePin) {
      document.documentElement.dataset.homeTabsPinned = "true";
    } else {
      delete document.documentElement.dataset.homeTabsPinned;
    }
    return () => {
      delete document.documentElement.dataset.homeTabsPinned;
    };
  }, [isTabsPinned, activePin]);

  // Anchor Scroll Handler — scrolls smoothly to the target Slide Group without switching tabs!
  const scrollToGroupAnchor = useCallback((tabId: string) => {
    setActiveAnchorId(tabId);
    anchorScrollLockUntilRef.current = Date.now() + 700;
    if (tabId !== "all") {
      trackTelemetryEvent({
        eventType: "SEARCH_FILTER",
        styleTab: tabId,
      });
    }
    if (typeof window === "undefined") return;
    if (tabId === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const targetEl = document.getElementById(`group-${tabId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleResetFilters = () => {
    setSourceFilter("ALL");
    setGlobalSearchQuery("");
    scrollToGroupAnchor("all");
  };

  const exploreMapHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (activeAnchorId !== "all") qs.set("style", activeAnchorId);
    if (sourceFilter !== "ALL") qs.set("source", sourceFilter);
    if (globalSearchQuery.trim()) qs.set("q", globalSearchQuery.trim());
    const str = qs.toString();
    return str ? `/explore?${str}` : "/explore";
  }, [activeAnchorId, sourceFilter, globalSearchQuery]);

  return (
    <div className="cgr-page-wide pb-14 [overflow-anchor:none]">
      {/* Scroll-Reveal Sticky Anchor Tabs Bar */}
      {!activePin && (
        <nav
          aria-label={isTh ? "ลัดไปกลุ่มโปรที่พัก" : "Jump to deal category"}
          aria-hidden={!isTabsPinned}
          className={`fixed top-0 lg:top-16 inset-x-0 lg:left-[72px] z-30 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 transition-[opacity,transform] duration-200 ${
            isTabsPinned
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="max-w-[1360px] mx-auto">
            <div
              ref={stickyTabsScrollRef}
              data-style-tabs-bar="true"
              className="h-12 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-y overscroll-x-contain overscroll-y-none no-scrollbar select-none"
            >
              {STAY_STYLE_TABS.map((tab) => {
                const isActive = activeAnchorId === tab.id;
                return (
                  <button
                    key={`sticky-${tab.id}`}
                    ref={(el) => {
                      stickyTabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => scrollToGroupAnchor(tab.id)}
                    className={`h-full border-b-2 inline-flex items-center shrink-0 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                      isActive
                        ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                        : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>{isTh ? tab.labelTh : tab.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Top Editorial "เที่ยวอะไรดี" Prompt + Inline Anchor Tabs */}
      <div
        aria-hidden={Boolean(activePin)}
        className={activePin ? "hidden" : ""}
      >
        <div className="pb-2.5 sm:pb-3 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-tight">
              {isTh ? "เที่ยวอะไรดี" : "What kind of escape?"}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] mt-0.5 truncate">
              {isTh
                ? "สะสมการ์ดที่พัก คาเฟ่ ร้านอาหาร และที่เที่ยวสวยทั่วไทย พร้อมโปรโมชั่นและดีลจองตรง 0% GP"
                : "Collect stays, cafes, dining, and attractions across Thailand with curated perks & 0% GP booking"}
            </p>
          </div>
        </div>

        <div ref={inlineTabsSentinelRef}>
          <div
            ref={tabsScrollRef}
            data-style-tabs-bar="true"
            className="h-11 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-y overscroll-y-none overscroll-x-contain no-scrollbar border-b border-[var(--color-border)] select-none"
          >
            {STAY_STYLE_TABS.map((tab) => {
              const isActive = activeAnchorId === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabButtonRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => scrollToGroupAnchor(tab.id)}
                  className={`h-full border-b-2 inline-flex items-center shrink-0 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                      : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{isTh ? tab.labelTh : tab.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shared 2-Layer Place Profile View (Identical Across /, /style, /explore, /trip!) */}
      {activePin && (
        <PinterestPinDetail
          pin={activePin}
          language={language}
          currentUser={currentUser}
          comments={activePinComments}
          savedPinIds={effectiveSavedPinIds}
          relatedPins={allOtherDeals}
          hotelPosts={
            pinDetail?.pin.id === activePin.id ? pinDetail.hotelPosts ?? [] : []
          }
          ownerFeedPosts={
            pinDetail?.pin.id === activePin.id
              ? pinDetail.ownerFeedPosts
              : undefined
          }
          ownerBlogs={
            pinDetail?.pin.id === activePin.id
              ? pinDetail.ownerBlogs
              : undefined
          }
          nearbyPlaces={
            pinDetail?.pin.id === activePin.id
              ? pinDetail.nearbyPlaces ?? []
              : []
          }
          isNearbyHop={pinHistoryStack.length > 0}
          backTargetName={
            pinHistoryStack.length > 0
              ? isTh
                ? pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameTh
                : pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameEn
              : null
          }
          prevPinPreview={prevPinPreview}
          nextPinPreview={nextPinPreview}
          canStepBack={pinHistoryStack.length > 0}
          restoreScrollY={detailRestoreScrollY}
          onBack={handleStepBackPin}
          onClose={handleClosePin}
          onSelectPin={(next) => {
            if (pinHistoryStack.length >= 1) return;
            handleSelectPin(next, true);
          }}
          onNavigatePin={handleNavigatePin}
          onHidePin={handleHidePin}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onSharePin={handleSharePin}
          onExpandMedia={(urls, idx) =>
            setFullscreenMedia({
              slides: urls.map((u) => ({ type: "image", url: u })),
              index: idx,
            })
          }
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      )}

      {/* Error State */}
      {fetchError && !activePin && (
        <div className="mt-6 rounded-[16px] bg-[var(--color-background-muted)] p-5 flex items-center justify-between gap-4">
          <p className="ty-body font-semibold text-[var(--color-error)]">
            {fetchError}
          </p>
          <button
            type="button"
            onClick={() => void loadMasterPins(false)}
            className="btn-round-solid !h-9 shrink-0"
          >
            {isTh ? "ลองใหม่" : "Retry"}
          </button>
        </div>
      )}

      {/* Pure 100% Card Slide Home Feed (Airbnb-Style Horizontal Carousels Only!) */}
      {!activePin &&
        (isLoadingPins && masterPins.length === 0 ? (
          <div className="pt-6 space-y-8">
            {[0, 1].map((row) => (
              <div key={row} className="space-y-4">
                <div className="h-6 w-56 rounded-[8px] bg-[var(--color-background-muted)] animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-[266px] aspect-square shrink-0 rounded-[22px] bg-[var(--color-background-muted)] animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : visibleCatalog.length === 0 ? (
          <div className="mt-6 rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
            <h2 className="ty-title">
              {isTh
                ? "ยังไม่พบโปรที่พักที่ตรงกับคำค้นหานี้"
                : "No stay deals match your search"}
            </h2>
            <p className="ty-caption">
              {isTh
                ? "ลองล้างคำค้นหา หรือสำรวจทุกโปรบนแผนที่ทั่วไทย"
                : "Try clearing filters or exploring all deals on the map."}
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-round-solid"
              >
                {isTh ? "แสดงโปรทั้งหมด" : "Show all deals"}
              </button>
              <Link href="/explore" className="btn-fw-secondary">
                {isTh ? "เปิดแผนที่" : "Open map"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 sm:space-y-1">
            {/* Search Results Slide Row (When searching) */}
            {globalSearchQuery.trim() && (
              <DealSlideRow
                id="group-all"
                title={
                  isTh
                    ? `ผลค้นหา "${globalSearchQuery.trim()}" (${visibleCatalog.length})`
                    : `Results for "${globalSearchQuery.trim()}" (${visibleCatalog.length})`
                }
                seeAllHref={exploreMapHref}
                deals={visibleCatalog}
                language={language}
                savedPinIds={effectiveSavedPinIds}
                priorityRow={true}
                onSelectDeal={handleSelectFeedDeal}
                onToggleSave={handleToggleSaveStable}
              />
            )}

            {/* Featured Top Anchor Section (#group-all) */}
            {!globalSearchQuery.trim() && (
              <>
                {recentViewedDeals.length > 0 && (
                  <DealSlideRow
                    id="group-all"
                    title={isTh ? "ดูล่าสุด" : "Recently viewed"}
                    seeAllHref="/style/recent"
                    deals={recentViewedDeals}
                    language={language}
                    savedPinIds={effectiveSavedPinIds}
                    priorityRow={true}
                    onSelectDeal={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                )}

                {slideGroups.internalDeals.length > 0 && (
                  <DealSlideRow
                    id={recentViewedDeals.length === 0 ? "group-all" : undefined}
                    title={
                      isTh
                        ? "ที่พักจองตรง 0% GP แนะนำ"
                        : "Direct 0% GP featured stays"
                    }
                    seeAllHref="/style/direct"
                    deals={slideGroups.internalDeals}
                    language={language}
                    savedPinIds={effectiveSavedPinIds}
                    priorityRow={recentViewedDeals.length === 0}
                    onSelectDeal={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                )}

                {slideGroups.cafeDiningPlaces.length > 0 && (
                  <DealSlideRow
                    title={
                      isTh
                        ? "คาเฟ่ & ร้านอาหารน่าสะสม"
                        : "Curated cafes & dining"
                    }
                    seeAllHref="/explore?category=CAFE"
                    deals={slideGroups.cafeDiningPlaces}
                    language={language}
                    savedPinIds={effectiveSavedPinIds}
                    onSelectDeal={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                )}

                {slideGroups.attractionWellnessPlaces.length > 0 && (
                  <DealSlideRow
                    title={
                      isTh
                        ? "ที่เที่ยวธรรมชาติ & สปาแนะนำ"
                        : "Attractions & wellness"
                    }
                    seeAllHref="/explore?category=ATTRACTION"
                    deals={slideGroups.attractionWellnessPlaces}
                    language={language}
                    savedPinIds={effectiveSavedPinIds}
                    onSelectDeal={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                )}

                {slideGroups.externalDeals.length > 0 && (
                  <DealSlideRow
                    id={
                      recentViewedDeals.length === 0 &&
                      slideGroups.internalDeals.length === 0
                        ? "group-all"
                        : undefined
                    }
                    title={
                      isTh
                        ? "รวมโปรที่พักเด็ดจากทุกแหล่งทั่วไทย"
                        : "Curated stay deals from every source"
                    }
                    seeAllHref="/style/curated"
                    deals={slideGroups.externalDeals}
                    language={language}
                    savedPinIds={effectiveSavedPinIds}
                    priorityRow={
                      recentViewedDeals.length === 0 &&
                      slideGroups.internalDeals.length === 0
                    }
                    onSelectDeal={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                )}
              </>
            )}

            {/* All 6 Travel-Style Anchor Slide Groups */}
            {slideGroups.styleGroups.map((group) => (
              <DealSlideRow
                key={group.id}
                id={group.anchorDomId}
                title={isTh ? group.titleTh : group.titleEn}
                seeAllHref={group.seeAllHref}
                deals={group.deals}
                language={language}
                savedPinIds={effectiveSavedPinIds}
                onSelectDeal={handleSelectFeedDeal}
                onToggleSave={handleToggleSaveStable}
              />
            ))}
          </div>
        ))}

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
