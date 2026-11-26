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
import { ChevronDown } from "lucide-react";
import {
  HOME_PROMO_TABS,
  matchesHomePromoTab,
  VALID_HOME_PROMO_TAB_IDS,
  type HomePromoTabId,
} from "@/lib/placeCategories";
import {
  getEncodedSessionTasteParam,
  recordRecentViewedPinId,
  trackPinInteraction,
  trackTelemetryEvent,
} from "@/lib/telemetry/clientTelemetry";
import { clearLastClickedPinOrigin } from "@/lib/pinOriginStore";
import { useHotelApp } from "@/components/HotelAppShell";
import type { PureMediaSlide } from "@/components/media/PureMediaViewer";
import { VerticalCouponCard } from "@/components/home/VerticalCouponCard";
import { HomeCollectibleHero } from "@/components/home/HomeCollectibleHero";
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
 * Hybrid Deduplication for Home Promotion Feed:
 * - SINGLE_LOCATION: 1 Place = 1 Canonical Card (dedupe by hotelId + dealSourceType)
 * - MULTI_BRANCH / NATIONWIDE_ONLINE: 1 Active Campaign = 1 Promo Card (allow 1 brand like KTC/KFC to run multiple promos across categories)
 */
function pickPrimaryDealPerHotel(pins: PinFeedItemDto[]): PinFeedItemDto[] {
  const bestByKey = new Map<string, PinFeedItemDto>();

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
    const isMultiCampaignBrand =
      pin.locationScope === "MULTI_BRANCH" ||
      pin.locationScope === "NATIONWIDE_ONLINE";
    const key = isMultiCampaignBrand
      ? `campaign:${pin.id}`
      : `${pin.hotelId}:${pin.dealSourceType}`;
    const existing = bestByKey.get(key);
    if (!existing || scoreDeal(pin) > scoreDeal(existing)) {
      bestByKey.set(key, pin);
    }
  }

  return Array.from(bestByKey.values());
}

const INITIAL_VISIBLE_COUNT = 16;
const LOAD_MORE_STEP = 16;

export function HomeFeedClient({
  initialPins,
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

  const resolvedInitialTab: HomePromoTabId = VALID_HOME_PROMO_TAB_IDS.has(
    initialStyleTab
  )
    ? (initialStyleTab as HomePromoTabId)
    : "all";

  const [activeTab, setActiveTab] = useState<HomePromoTabId>(
    resolvedInitialTab
  );
  const [visibleCount, setVisibleCount] = useState<number>(
    INITIAL_VISIBLE_COUNT
  );
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] =
    useState<DealSourceFilter>(initialSourceFilter);
  const [isTabsPinned, setIsTabsPinned] = useState<boolean>(false);

  const [masterPins, setMasterPins] = useState<PinFeedItemDto[]>(initialPins);
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

  const sheetTopRef = useRef<HTMLDivElement | null>(null);
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

  // Sync URL query params (?stay=..., ?tab=..., ?source=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const stayParam = params.get("stay") || params.get("pin");
      setSelectedPinId(stayParam);

      const tabParam = (
        params.get("tab") ||
        params.get("category") ||
        params.get("style") ||
        ""
      )
        .trim()
        .toLowerCase();
      if (VALID_HOME_PROMO_TAB_IDS.has(tabParam)) {
        setActiveTab(tabParam as HomePromoTabId);
      }

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
      qs.set("limit", "120");
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
        throw new Error(data.error || "ไม่สามารถโหลดรายการโปรโมชั่นได้");
      }
      const fetched = data.pins || [];
      setMasterPins(fetched);
      setOptimisticSavedIds(
        new Set(fetched.filter((p) => p.isSavedByMe).map((p) => p.id))
      );
    } catch (err) {
      if (!silent) {
        setFetchError(
          err instanceof Error ? err.message : "โหลดรายการโปรโมชั่นไม่สำเร็จ"
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

  // Deduplicated deal catalog (Hybrid: 1 card per single-location place, multi-campaign for chains/brands)
  const baseCatalog = useMemo(() => {
    const base = globalSearchQuery.trim()
      ? searchPins ?? masterPins
      : masterPins;
    const nonHidden = base.filter((p) => !hiddenPinIds.has(p.id));
    const deduped = pickPrimaryDealPerHotel(nonHidden);
    if (sourceFilter === "ALL") return deduped;
    return deduped.filter((p) => p.dealSourceType === sourceFilter);
  }, [globalSearchQuery, searchPins, masterPins, hiddenPinIds, sourceFilter]);

  // Build quick area/province chips strictly from real data present in the catalog
  const areaOptions = useMemo(() => {
    const counts = new Map<
      string,
      { id: string; labelTh: string; labelEn: string; count: number }
    >();
    let hasNationwide = false;

    for (const p of baseCatalog) {
      if (
        p.locationScope === "NATIONWIDE_ONLINE" ||
        p.locationScope === "MULTI_BRANCH" ||
        p.provinceId === "nationwide"
      ) {
        hasNationwide = true;
      }
      if (p.provinceId && p.provinceId !== "nationwide") {
        const existing = counts.get(p.provinceId);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(p.provinceId, {
            id: p.provinceId,
            labelTh: p.provinceNameTh,
            labelEn: p.provinceNameEn,
            count: 1,
          });
        }
      }
    }

    const sortedProvinces = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { hasNationwide, provinces: sortedProvinces };
  }, [baseCatalog]);

  const visibleCatalog = useMemo(() => {
    if (areaFilter === "all") return baseCatalog;
    if (areaFilter === "nationwide") {
      return baseCatalog.filter(
        (p) =>
          p.locationScope === "NATIONWIDE_ONLINE" ||
          p.locationScope === "MULTI_BRANCH" ||
          p.provinceId === "nationwide"
      );
    }
    return baseCatalog.filter((p) => {
      if (p.provinceId === areaFilter) return true;
      if (
        p.locationScope === "NATIONWIDE_ONLINE" ||
        p.locationScope === "MULTI_BRANCH"
      ) {
        return (
          !p.eligibleProvinceIds ||
          p.eligibleProvinceIds.length === 0 ||
          p.eligibleProvinceIds.includes(areaFilter)
        );
      }
      return false;
    });
  }, [baseCatalog, areaFilter]);

  // PunPro-style Tab Filtering: compute active tab list + per-tab counts + Load More slice
  const visibleTabs = HOME_PROMO_TABS;

  const activeTabDeals = useMemo(() => {
    if (activeTab === "all") return visibleCatalog;
    return visibleCatalog.filter((p) => matchesHomePromoTab(p, activeTab));
  }, [visibleCatalog, activeTab]);

  const displayedDeals = useMemo(
    () => activeTabDeals.slice(0, visibleCount),
    [activeTabDeals, visibleCount]
  );

  const remainingCount = Math.max(
    0,
    activeTabDeals.length - displayedDeals.length
  );

  // Reset Load More count whenever tab, area filter, or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeTab, areaFilter, globalSearchQuery]);

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
        if (!entry) return;
        const topCutoff = window.innerWidth >= 1024 ? 72 : 12;
        setIsTabsPinned(
          !entry.isIntersecting && entry.boundingClientRect.top < topCutoff
        );
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [activePin]);

  // Keep active category tab centered in horizontal scroller
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
    syncScroller(tabsScrollRef.current, tabButtonRefs.current[activeTab]);
    syncScroller(
      stickyTabsScrollRef.current,
      stickyTabButtonRefs.current[activeTab]
    );
  }, [activeTab, activePin, language]);

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

  const scrollToSheetTop = useCallback(() => {
    if (typeof window === "undefined") return;
    const sheetEl = sheetTopRef.current;
    if (!sheetEl) return;
    const topOffset = window.innerWidth >= 1024 ? 72 : 8;
    const targetY =
      sheetEl.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  }, []);

  // PunPro-Style Tab Switcher (filters vertical grid in-place, syncs ?tab= URL)
  const handleSelectTab = useCallback(
    (tabId: HomePromoTabId, scrollToFeed = false) => {
      setActiveTab(tabId);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      if (tabId !== "all") {
        trackTelemetryEvent({
          eventType: "SEARCH_FILTER",
          styleTab: tabId,
        });
      }
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (tabId === "all") {
          url.searchParams.delete("tab");
          url.searchParams.delete("category");
        } else {
          url.searchParams.set("tab", tabId);
          url.searchParams.delete("category");
        }
        window.history.replaceState(null, "", url.toString());
        if (scrollToFeed || isTabsPinned) {
          scrollToSheetTop();
        }
      }
    },
    [isTabsPinned, scrollToSheetTop]
  );

  const handleResetFilters = () => {
    setSourceFilter("ALL");
    setAreaFilter("all");
    setGlobalSearchQuery("");
    handleSelectTab("all", false);
  };

  const exploreMapHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (activeTab === "stay") qs.set("category", "STAY");
    else if (activeTab === "cafe") qs.set("category", "CAFE");
    else if (activeTab === "restaurant" || activeTab === "bar") {
      qs.set("category", "RESTAURANT");
    } else if (activeTab === "wellness") qs.set("category", "WELLNESS");
    else if (activeTab === "attraction") qs.set("category", "ATTRACTION");
    if (sourceFilter !== "ALL") qs.set("source", sourceFilter);
    if (globalSearchQuery.trim()) qs.set("q", globalSearchQuery.trim());
    const str = qs.toString();
    return str ? `/explore?${str}` : "/explore";
  }, [activeTab, sourceFilter, globalSearchQuery]);

  return (
    <div className="cgr-page-wide pb-14 [overflow-anchor:none]">
      {/* Scroll-Reveal Sticky Promotion Category Tabs Bar */}
      {!activePin && (
        <nav
          aria-label={isTh ? "ลัดไปหมวดโปรโมชั่น" : "Jump to promotion category"}
          aria-hidden={!isTabsPinned}
          className={`fixed top-0 lg:top-16 inset-x-0 lg:left-[72px] z-30 pt-[env(safe-area-inset-top,0px)] lg:pt-0 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 transition-[opacity,transform] duration-200 ${
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
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`sticky-${tab.id}`}
                    ref={(el) => {
                      stickyTabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => handleSelectTab(tab.id, true)}
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

      {/* Top Full-Viewport Sticky 3D Island Hero (Apple Inertia Smooth Zoom + 6 Frosted-Glass Icons) */}
      {!activePin && !globalSearchQuery.trim() && (
        <HomeCollectibleHero
          language={language}
          activeTab={activeTab}
          onSelectCategory={(tabId) => handleSelectTab(tabId, true)}
        />
      )}

      {/* Curved White Sheet Curtain: Peeks at bottom on load, glides smoothly UP over the sticky hero on scroll */}
      <div
        ref={sheetTopRef}
        aria-hidden={Boolean(activePin)}
        className={
          activePin
            ? "hidden"
            : !globalSearchQuery.trim()
            ? "relative z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-[24svh] sm:-mt-[22svh] lg:-mt-[88px] pt-3 lg:pt-4 pb-10 rounded-t-[28px] bg-[var(--color-background-body)] min-h-[100svh]"
            : ""
        }
      >
        {/* Subtle Curved Peek-Sheet Grab Pill (Matches /explore native sheet feel) */}
        {!globalSearchQuery.trim() && (
          <div
            aria-hidden="true"
            className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]"
          />
        )}

        <div>
          <div className="pb-2.5 sm:pb-3 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-tight">
                {globalSearchQuery.trim()
                  ? isTh
                    ? `ผลค้นหา "${globalSearchQuery.trim()}"`
                    : `Results for "${globalSearchQuery.trim()}"`
                  : isTh
                  ? "โปรเที่ยวไทย"
                  : "Thailand Travel Deals"}
              </h1>
              <p className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                {isTh
                  ? "รวมโปรโมชั่นที่พัก คาเฟ่ ร้านอาหาร บาร์ สปา กิจกรรม และแบรนด์ดังทั่วไทย"
                  : "Curated Thailand travel deals across stays, cafes, restaurants, bars, spa & activities"}
              </p>
            </div>
            {!isLoadingPins && (
              <span className="text-[12.5px] font-medium text-[var(--color-text-secondary)] tabular-nums shrink-0">
                {activeTabDeals.length.toLocaleString()}{" "}
                {isTh ? "โปร" : "deals"}
              </span>
            )}
          </div>

          {/* 7 PunPro-Style Filter Tabs */}
          <div ref={inlineTabsSentinelRef}>
            <div
              ref={tabsScrollRef}
              data-style-tabs-bar="true"
              className="h-11 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-y overscroll-y-none overscroll-x-contain no-scrollbar border-b border-[var(--color-border)] select-none"
            >
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => handleSelectTab(tab.id, false)}
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

          {/* Compact Borderless Area / Scope Filter Pills */}
          {(areaOptions.provinces.length > 1 || areaOptions.hasNationwide) && (
            <div className="pt-3 pb-1 flex items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              <button
                type="button"
                onClick={() => setAreaFilter("all")}
                className={`h-8 px-3.5 rounded-full text-[12.5px] font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                  areaFilter === "all"
                    ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {isTh ? "ทุกพื้นที่" : "All Thailand"}
              </button>
              {areaOptions.hasNationwide && (
                <button
                  type="button"
                  onClick={() => setAreaFilter("nationwide")}
                  className={`h-8 px-3.5 rounded-full text-[12.5px] font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                    areaFilter === "nationwide"
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {isTh ? "ทั่วประเทศ / ออนไลน์" : "Nationwide / Online"}
                </button>
              )}
              {areaOptions.provinces.map((prov) => {
                const isSelected = areaFilter === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setAreaFilter(isSelected ? "all" : prov.id)}
                    className={`h-8 px-3.5 rounded-full text-[12.5px] font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                        : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {isTh ? prov.labelTh : prov.labelEn}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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

        {/* PunPro-Style Pure Vertical Grid + Load More ("ดูเพิ่มเติม") — Zero Horizontal Slide Carousels! */}
        {!activePin &&
          (isLoadingPins && masterPins.length === 0 ? (
            <div className="pt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3.5 gap-y-6 sm:gap-x-5 sm:gap-y-7">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="space-y-2.5">
                  <div className="w-full aspect-square rounded-[22px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
                  <div className="h-4 w-3/4 rounded-full bg-[var(--color-background-muted)] cgr-skeleton-block" />
                  <div className="h-3.5 w-1/2 rounded-full bg-[var(--color-background-muted)] cgr-skeleton-block" />
                </div>
              ))}
            </div>
          ) : activeTabDeals.length === 0 ? (
            <div className="mt-6 rounded-[22px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
              <h2 className="ty-title">
                {isTh
                  ? "ยังไม่มีโปรโมชั่นในหมวดหรือพื้นที่นี้"
                  : "No promotions in this category yet"}
              </h2>
              <p className="ty-caption">
                {isTh
                  ? "ลองเลือกหมวดอื่น หรือดูโปรเที่ยวไทยทั้งหมดที่มีตอนนี้"
                  : "Try another category or explore all active Thailand travel deals."}
              </p>
              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-round-solid"
                >
                  {isTh ? "แสดงโปรทั้งหมด" : "Show all deals"}
                </button>
                <Link href={exploreMapHref} className="btn-fw-secondary">
                  {isTh ? "เปิดแผนที่" : "Open map"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="pt-5 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3.5 gap-y-6 sm:gap-x-5 sm:gap-y-7">
                {displayedDeals.map((deal, idx) => (
                  <VerticalCouponCard
                    key={deal.id}
                    pin={deal}
                    language={language}
                    isSaved={effectiveSavedPinIds.has(deal.id)}
                    priority={idx < 8}
                    onSelect={handleSelectFeedDeal}
                    onToggleSave={handleToggleSaveStable}
                  />
                ))}
              </div>

              {/* PunPro-Style Load More ("ดูเพิ่มเติม") Pill */}
              <div className="pt-2 pb-4 flex flex-col items-center gap-2.5">
                {remainingCount > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((prev) => prev + LOAD_MORE_STEP)
                      }
                      className="h-11 px-7 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>
                        {isTh
                          ? `ดูเพิ่มเติม (อีก ${remainingCount.toLocaleString()} โปร)`
                          : `Load more (${remainingCount.toLocaleString()} more)`}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <p className="text-[12px] text-[var(--color-text-secondary)] tabular-nums">
                      {isTh
                        ? `แสดง ${displayedDeals.length.toLocaleString()} จาก ${activeTabDeals.length.toLocaleString()} โปรโมชั่น`
                        : `Showing ${displayedDeals.length.toLocaleString()} of ${activeTabDeals.length.toLocaleString()} deals`}
                    </p>
                  </>
                ) : activeTabDeals.length > INITIAL_VISIBLE_COUNT ? (
                  <p className="text-[12.5px] text-[var(--color-text-secondary)] tabular-nums">
                    {isTh
                      ? `แสดงครบทั้งหมด ${activeTabDeals.length.toLocaleString()} โปรโมชั่นแล้ว`
                      : `Showing all ${activeTabDeals.length.toLocaleString()} deals`}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
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
