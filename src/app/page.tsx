"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getProvinceById,
  STAY_STYLE_TABS,
  VALID_STYLE_TAGS,
} from "@/data/thailandProvinces";
import {
  getEncodedSessionTasteParam,
  getSessionInteractionCount,
  trackPinInteraction,
  trackTelemetryEvent,
} from "@/lib/telemetry/clientTelemetry";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  PureMediaViewer,
  type PureMediaSlide,
} from "@/components/media/PureMediaViewer";
import { MasonryGrid } from "@/components/home/MasonryGrid";
import {
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function HomePage() {
  const router = useRouter();
  const {
    lang: language,
    user: currentUser,
    refreshMe,
    globalSearchQuery,
    setGlobalSearchQuery,
  } = useHotelApp();

  const [activeStyleTab, setActiveStyleTab] = useState<string>("all");
  const [masterPins, setMasterPins] = useState<PinFeedItemDto[]>([]);
  const [searchPins, setSearchPins] = useState<PinFeedItemDto[] | null>(null);
  const [isLoadingPins, setIsLoadingPins] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null>(null);
  const latestPinReqRef = useRef<string | null>(null);
  const [optimisticSavedIds, setOptimisticSavedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [hiddenPinIds, setHiddenPinIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pinHistoryStack, setPinHistoryStack] = useState<PinFeedItemDto[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const homeRootRef = useRef<HTMLDivElement | null>(null);
  const feedSwipeViewportRef = useRef<HTMLElement | null>(null);
  const feedSwipeTrackRef = useRef<HTMLDivElement | null>(null);
  const leftTabPanelRef = useRef<HTMLDivElement | null>(null);
  const rightTabPanelRef = useRef<HTMLDivElement | null>(null);
  const tabSwipeTimerRef = useRef<number | null>(null);
  const swipedWhileScrolledRef = useRef<boolean>(false);
  const justDraggedFeedUntilRef = useRef<number>(0);
  const savedFeedScrollYRef = useRef<number>(0);
  const wasPinOpenRef = useRef<boolean>(false);
  const lastFeedTasteSeqRef = useRef<number>(0);

  // Sync ?pin=... & ?style=... on initial load / popstate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedPinId(params.get("pin"));
      const styleParam = params.get("style");
      if (styleParam && VALID_STYLE_TAGS.has(styleParam)) {
        setActiveStyleTab(styleParam);
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
      const tasteParam = getEncodedSessionTasteParam();
      if (tasteParam) {
        qs.set("taste", tasteParam);
      }
      lastFeedTasteSeqRef.current = getSessionInteractionCount();

      const suffix = qs.toString();
      const res = await fetch(`/api/pins${suffix ? `?${suffix}` : ""}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        pins?: PinFeedItemDto[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถโหลดข้อมูลที่พักได้");
      }
      const fetched = data.pins || [];
      setMasterPins(fetched);
      setOptimisticSavedIds(
        new Set(fetched.filter((p) => p.isSavedByMe).map((p) => p.id))
      );
    } catch (err) {
      if (!silent) {
        setFetchError(
          err instanceof Error ? err.message : "โหลดข้อมูลที่พักไม่สำเร็จ"
        );
      }
    } finally {
      if (!silent) setIsLoadingPins(false);
    }
  }, []);

  // Initial load of personalized master feed (powers instant 0ms tab switching & previews!)
  useEffect(() => {
    void loadMasterPins(false);
  }, [loadMasterPins]);

  // Debounced 3-Tier Zero-Dead-End Search when globalSearchQuery is active
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
          throw new Error(data.error || "ไม่สามารถค้นหาที่พักได้");
        }
        if (!cancelled) {
          setSearchPins(data.pins || []);
        }
      } catch (err) {
        if (!cancelled && masterPins.length === 0) {
          setFetchError(
            err instanceof Error ? err.message : "ค้นหาที่พักไม่สำเร็จ"
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

  // Track style tab filter telemetry without flashing skeletons or reshuffling cards
  useEffect(() => {
    if (activeStyleTab !== "all") {
      trackTelemetryEvent({
        eventType: "SEARCH_FILTER",
        styleTab: activeStyleTab,
      });
    }
  }, [activeStyleTab]);

  const getPinsForStyleTab = useCallback(
    (tabId: string): PinFeedItemDto[] => {
      const base = globalSearchQuery.trim()
        ? searchPins ?? masterPins
        : masterPins;
      const visible = base.filter((p) => !hiddenPinIds.has(p.id));
      if (tabId === "all") return visible;
      const matching = visible.filter((p) => p.stayStyles.includes(tabId));
      return globalSearchQuery.trim() && matching.length === 0
        ? visible
        : matching;
    },
    [globalSearchQuery, searchPins, masterPins, hiddenPinIds]
  );

  const pins = useMemo(
    () => getPinsForStyleTab(activeStyleTab),
    [getPinsForStyleTab, activeStyleTab]
  );

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
      setPinDetail((prev) => (prev?.pin.id === selectedPinId ? prev : null));
      loadPinDetail(selectedPinId);
    } else {
      latestPinReqRef.current = null;
      setSelectedPinSnapshot(null);
      setPinDetail(null);
    }
  }, [selectedPinId, loadPinDetail]);

  const handleClosePin = useCallback(() => {
    latestPinReqRef.current = null;
    setPinHistoryStack([]);
    setSelectedPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("pin");
      window.history.pushState(null, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResetHomePin = () => {
      handleClosePin();
    };
    window.addEventListener("cgr:reset-home-pin", onResetHomePin);
    return () =>
      window.removeEventListener("cgr:reset-home-pin", onResetHomePin);
  }, [handleClosePin]);

  const currentOpenPin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return (
      pins.find((p) => p.id === selectedPinId) ??
      masterPins.find((p) => p.id === selectedPinId) ??
      null
    );
  }, [pinDetail, selectedPinId, selectedPinSnapshot, pins, masterPins]);

  const handleSelectPin = useCallback(
    (pin: PinFeedItemDto, pushHistoryStack = true) => {
      if (Date.now() < justDraggedFeedUntilRef.current) return;

      if (typeof window !== "undefined" && !currentOpenPin) {
        savedFeedScrollYRef.current = window.scrollY;
      }

      if (pushHistoryStack && currentOpenPin && currentOpenPin.id !== pin.id) {
        setPinHistoryStack((prev) =>
          [
            ...prev.filter((p) => p.id !== currentOpenPin.id && p.id !== pin.id),
            currentOpenPin,
          ].slice(-20)
        );
      }
      setSelectedPinSnapshot(pin);
      setPinDetail((prev) => (prev?.pin.id === pin.id ? prev : null));
      setSelectedPinId(pin.id);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("pin", pin.id);
        window.history.pushState(null, "", url.toString());
        if (window.innerWidth >= 1024) {
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }
      }
    },
    [currentOpenPin]
  );

  // Drill-down step-back: pops previous Pin in stack until returning to Home feed!
  const handleStepBackPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleClosePin();
      return;
    }
    const prevPin = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((prev) => prev.slice(0, -1));
    setSelectedPinSnapshot(prevPin);
    setPinDetail(null);
    setSelectedPinId(prevPin.id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("pin", prevPin.id);
      window.history.pushState(null, "", url.toString());
      if (window.innerWidth >= 1024) {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
    if (!currentUser) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/")}`);
      return;
    }

    const res = await fetch("/api/boards/toggle-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinId }),
    });
    if (!res.ok) return;

    const result = (await res.json()) as { isSaved: boolean };
    if (result.isSaved) {
      const targetPin =
        (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
        masterPins.find((p) => p.id === pinId) ??
        pins.find((p) => p.id === pinId);
      if (targetPin) trackPinInteraction("PIN_SAVE", targetPin);
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
        prev ? { ...prev, pin: { ...prev.pin, isSavedByMe: result.isSaved } } : prev
      );
    }
    await refreshMe();
  };

  const handleToggleLike = async (pinId: string) => {
    if (!currentUser) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/?pin=${pinId}`)}`);
      return;
    }

    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}/like`, {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { isLiked: boolean; likesCount: number };
    if (data.isLiked) {
      const targetPin =
        (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
        masterPins.find((p) => p.id === pinId) ??
        pins.find((p) => p.id === pinId);
      if (targetPin) trackPinInteraction("PIN_LIKE", targetPin);
    }

    const updatePinLike = (list: PinFeedItemDto[]) =>
      list.map((p) =>
        p.id === pinId
          ? { ...p, isLikedByMe: data.isLiked, likesCount: data.likesCount }
          : p
      );
    setMasterPins(updatePinLike);
    setSearchPins((prev) => (prev ? updatePinLike(prev) : null));
    setSelectedPinSnapshot((prev) =>
      prev && prev.id === pinId
        ? { ...prev, isLikedByMe: data.isLiked, likesCount: data.likesCount }
        : prev
    );
    if (pinDetail?.pin.id === pinId) {
      setPinDetail((prev) =>
        prev
          ? {
              ...prev,
              pin: {
                ...prev.pin,
                isLikedByMe: data.isLiked,
                likesCount: data.likesCount,
              },
            }
          : prev
      );
    }
  };

  const handleSharePin = async (pin: PinFeedItemDto) => {
    trackPinInteraction("PIN_SHARE", pin);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?pin=${encodeURIComponent(pin.id)}`
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
        // fallback clipboard below
      }
    }
    if (channel === "COPY_LINK" && typeof navigator !== "undefined" && navigator.clipboard) {
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
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/?pin=${selectedPinId}`)}`
      );
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
    if (res.ok) {
      await loadPinDetail(selectedPinId);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPinId) return;
    const res = await fetch(
      `/api/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await loadPinDetail(selectedPinId);
    }
  };

  const activePin = currentOpenPin;

  // Restore exact Home feed scroll position synchronously BEFORE paint when closing Pin on mobile (< lg)
  useIsomorphicLayoutEffect(() => {
    const isNowOpen = Boolean(activePin);
    if (
      wasPinOpenRef.current &&
      !isNowOpen &&
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
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

  // Instant client-side similarity sort across the entire master catalog (~0ms)
  const instantSimilarFallback = useMemo(() => {
    if (!activePin) return [];
    const anchorStyles = new Set(activePin.stayStyles);
    const anchorRegion = getProvinceById(activePin.provinceId)?.region ?? null;
    const sourceCatalog = masterPins.length > 0 ? masterPins : pins;

    // Exclude same hotel upfront per user rule
    const otherHotels = sourceCatalog.filter(
      (p) =>
        p.id !== activePin.id &&
        p.hotelId !== activePin.hotelId &&
        !hiddenPinIds.has(p.id)
    );
    return [...otherHotels].sort((a, b) => {
      const scorePin = (cand: PinFeedItemDto) => {
        let sc = 0;
        for (const s of cand.stayStyles) {
          if (anchorStyles.has(s)) sc += 18;
        }
        if (cand.provinceId === activePin.provinceId) sc += 15;
        else if (
          anchorRegion &&
          getProvinceById(cand.provinceId)?.region === anchorRegion
        ) {
          sc += 9;
        }
        if (activePin.nightlyPriceThb && cand.nightlyPriceThb) {
          const diff = Math.abs(
            Math.log(cand.nightlyPriceThb / activePin.nightlyPriceThb)
          );
          sc += 10 * Math.exp(-1.3 * diff);
        }
        return sc;
      };
      return scorePin(b) - scorePin(a);
    });
  }, [activePin, masterPins, pins, hiddenPinIds]);

  // When a Pin is open, `gridPins` displays a stable single-pass similarity ranking
  // without re-shuffling cards that are already visible on screen when `/api/pins/[id]` resolves!
  const gridPins = useMemo(() => {
    if (!activePin) {
      return pins;
    }
    if (instantSimilarFallback.length > 0) {
      if (
        pinDetail?.pin.id === activePin.id &&
        pinDetail.relatedPins.length > 0
      ) {
        const existingIds = new Set(instantSimilarFallback.map((p) => p.id));
        const extraFromServer = pinDetail.relatedPins.filter(
          (p) => !existingIds.has(p.id) && !hiddenPinIds.has(p.id)
        );
        return [...instantSimilarFallback, ...extraFromServer];
      }
      return instantSimilarFallback;
    }
    if (
      pinDetail?.pin.id === activePin.id &&
      pinDetail.relatedPins.length > 0
    ) {
      return pinDetail.relatedPins.filter((p) => !hiddenPinIds.has(p.id));
    }
    return [];
  }, [activePin, pinDetail, pins, instantSimilarFallback, hiddenPinIds]);

  const prevPinPreview = useMemo<PinFeedItemDto | null>(() => {
    if (!activePin) return null;
    if (pinHistoryStack.length > 0) {
      return pinHistoryStack[pinHistoryStack.length - 1] ?? null;
    }
    return gridPins.length > 0 ? gridPins[gridPins.length - 1] ?? null : null;
  }, [activePin, pinHistoryStack, gridPins]);

  const nextPinPreview = useMemo<PinFeedItemDto | null>(() => {
    if (!activePin || gridPins.length === 0) return null;
    return gridPins[0] ?? null;
  }, [activePin, gridPins]);

  const handleNavigatePin = useCallback(
    (direction: "prev" | "next") => {
      if (!activePin) return;
      if (direction === "prev" && pinHistoryStack.length > 0) {
        handleStepBackPin();
        return;
      }
      if (gridPins.length === 0) return;
      const nextPin =
        direction === "next" ? gridPins[0] : gridPins[gridPins.length - 1];
      if (nextPin) {
        handleSelectPin(nextPin, true);
      }
    },
    [activePin, pinHistoryStack.length, gridPins, handleStepBackPin, handleSelectPin]
  );

  // Adjacent Stay Style Tabs & Cached Previews for 120fps Finger-Tracking Tab Swipe
  const currentTabIdx = useMemo(
    () =>
      Math.max(
        0,
        STAY_STYLE_TABS.findIndex((t) => t.id === activeStyleTab)
      ),
    [activeStyleTab]
  );
  const prevStyleTab =
    currentTabIdx > 0 ? STAY_STYLE_TABS[currentTabIdx - 1] : null;
  const nextStyleTab =
    currentTabIdx < STAY_STYLE_TABS.length - 1
      ? STAY_STYLE_TABS[currentTabIdx + 1]
      : null;

  const prevTabPins = useMemo(
    () => (prevStyleTab ? getPinsForStyleTab(prevStyleTab.id) : []),
    [prevStyleTab, getPinsForStyleTab]
  );
  const nextTabPins = useMemo(
    () => (nextStyleTab ? getPinsForStyleTab(nextStyleTab.id) : []),
    [nextStyleTab, getPinsForStyleTab]
  );

  // Synchronously reset feed swipe track BEFORE browser paint when activeStyleTab commits (0.0px shift!)
  useIsomorphicLayoutEffect(() => {
    if (tabSwipeTimerRef.current !== null) {
      window.clearTimeout(tabSwipeTimerRef.current);
      tabSwipeTimerRef.current = null;
    }
    if (feedSwipeTrackRef.current) {
      feedSwipeTrackRef.current.style.transition = "none";
      feedSwipeTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
    }
    if (leftTabPanelRef.current) {
      leftTabPanelRef.current.style.top = "0px";
    }
    if (rightTabPanelRef.current) {
      rightTabPanelRef.current.style.top = "0px";
    }
    if (swipedWhileScrolledRef.current && typeof window !== "undefined") {
      swipedWhileScrolledRef.current = false;
      const rect = feedSwipeViewportRef.current?.getBoundingClientRect();
      if (rect && rect.top < 0) {
        window.scrollTo({
          top: Math.max(0, Math.round(window.scrollY + rect.top)),
          behavior: "instant" as ScrollBehavior,
        });
      }
    }
  }, [activeStyleTab]);

  useEffect(() => {
    const btn = tabButtonRefs.current[activeStyleTab];
    if (btn) {
      btn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeStyleTab]);

  // =========================================================================
  // ENGINE C: 120FPS INTERACTIVE HOME STAY-STYLE TAB SWIPE PAGER (< lg)
  // =========================================================================
  const tabSwipeStateRef = useRef({
    isPinOpen: Boolean(activePin),
    prevStyleTab,
    nextStyleTab,
  });
  tabSwipeStateRef.current = {
    isPinOpen: Boolean(activePin),
    prevStyleTab,
    nextStyleTab,
  };

  useEffect(() => {
    const rootEl = homeRootRef.current;
    if (!rootEl || typeof window === "undefined") return;

    let state: {
      startX: number;
      startY: number;
      lastX: number;
      lastTime: number;
      velocityX: number;
      scrolledOffset: number;
      locked: "horizontal" | "vertical" | null;
      ignore: boolean;
    } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (
        tabSwipeStateRef.current.isPinOpen ||
        window.innerWidth >= 1024 ||
        tabSwipeTimerRef.current !== null
      ) {
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement | null;
      const ignore = Boolean(
        target?.closest(
          "[data-style-tabs-bar='true'], input, textarea, [data-swipe-ignore='true']"
        )
      );
      const now = performance.now();
      state = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastTime: now,
        velocityX: 0,
        scrolledOffset: 0,
        locked: null,
        ignore,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        !state ||
        state.ignore ||
        tabSwipeStateRef.current.isPinOpen ||
        window.innerWidth >= 1024 ||
        tabSwipeTimerRef.current !== null
      ) {
        return;
      }
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;
      const now = performance.now();
      const dt = now - state.lastTime;
      if (dt > 0) {
        state.velocityX = (t.clientX - state.lastX) / dt;
        state.lastX = t.clientX;
        state.lastTime = now;
      }

      if (state.locked === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.18) {
          state.locked = "horizontal";
          const rect = feedSwipeViewportRef.current?.getBoundingClientRect();
          const topOff = rect && rect.top < 0 ? Math.round(-rect.top) : 0;
          state.scrolledOffset = topOff;
          if (leftTabPanelRef.current) {
            leftTabPanelRef.current.style.top = `${topOff}px`;
          }
          if (rightTabPanelRef.current) {
            rightTabPanelRef.current.style.top = `${topOff}px`;
          }
        } else {
          state.locked = "vertical";
        }
      }

      if (state.locked === "horizontal") {
        if (e.cancelable) e.preventDefault();
        const track = feedSwipeTrackRef.current;
        if (!track) return;
        const { prevStyleTab: prevT, nextStyleTab: nextT } =
          tabSwipeStateRef.current;
        const atEdge = (dx > 0 && !prevT) || (dx < 0 && !nextT);
        const effectiveDx = atEdge ? dx * 0.24 : dx;
        track.style.transition = "none";
        track.style.transform = `translate3d(${effectiveDx}px, 0, 0)`;
      }
    };

    const finishTabSwipe = (e: TouchEvent) => {
      if (!state) return;
      const st = state;
      state = null;
      if (st.ignore || st.locked !== "horizontal") return;

      justDraggedFeedUntilRef.current = Date.now() + 260;

      const track = feedSwipeTrackRef.current;
      if (!track) return;

      const vw =
        feedSwipeViewportRef.current?.clientWidth || window.innerWidth || 375;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - st.startX : 0;
      const vx = st.velocityX;
      const { prevStyleTab: prevT, nextStyleTab: nextT } =
        tabSwipeStateRef.current;

      const commitNext = Boolean(nextT) && (dx < -vw * 0.18 || vx < -0.32);
      const commitPrev = Boolean(prevT) && (dx > vw * 0.18 || vx > 0.32);

      if (commitNext && nextT) {
        swipedWhileScrolledRef.current = st.scrolledOffset > 0;
        track.style.transition =
          "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(calc(-100% - 12px), 0, 0)";
        tabSwipeTimerRef.current = window.setTimeout(() => {
          tabSwipeTimerRef.current = null;
          setActiveStyleTab(nextT.id);
        }, 280);
      } else if (commitPrev && prevT) {
        swipedWhileScrolledRef.current = st.scrolledOffset > 0;
        track.style.transition =
          "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(calc(100% + 12px), 0, 0)";
        tabSwipeTimerRef.current = window.setTimeout(() => {
          tabSwipeTimerRef.current = null;
          setActiveStyleTab(prevT.id);
        }, 280);
      } else {
        track.style.transition =
          "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(0px, 0, 0)";
      }
    };

    rootEl.addEventListener("touchstart", onTouchStart, { passive: true });
    rootEl.addEventListener("touchmove", onTouchMove, { passive: false });
    rootEl.addEventListener("touchend", finishTabSwipe, { passive: true });
    rootEl.addEventListener("touchcancel", finishTabSwipe, { passive: true });

    return () => {
      rootEl.removeEventListener("touchstart", onTouchStart);
      rootEl.removeEventListener("touchmove", onTouchMove);
      rootEl.removeEventListener("touchend", finishTabSwipe);
      rootEl.removeEventListener("touchcancel", finishTabSwipe);
    };
  }, []);

  const hasActiveFilter =
    activeStyleTab !== "all" || Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    setActiveStyleTab("all");
    setGlobalSearchQuery("");
  };

  return (
    <div
      ref={homeRootRef}
      className="cgr-page-fluid space-y-4 sm:space-y-5"
    >
      {/* Horizontal Stay Style Tabs (Hidden when Pin Close-Up Stage is Open) */}
      {!activePin && (
        <div
          data-style-tabs-bar="true"
          className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]"
        >
          {STAY_STYLE_TABS.map((tab) => {
            const isActive = activeStyleTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabButtonRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => {
                  setActiveStyleTab(tab.id);
                }}
                className={`relative shrink-0 py-2.5 sm:py-3 -mb-px border-b-2 ty-body transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                    : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
              </button>
            );
          })}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto shrink-0 h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              {language === "th" ? "ล้างตัวกรอง" : "Reset filters"}
            </button>
          )}
        </div>
      )}

      {/* Pin Close-Up Stage at Very Top (Native Window Scroll on Mobile for Translucent Safari Bar + 1:1 Card Slide!) */}
      {activePin && (
        <PinterestPinDetail
          pin={activePin}
          language={language}
          currentUser={currentUser}
          comments={activePinComments}
          savedPinIds={optimisticSavedIds}
          relatedPins={gridPins}
          prevPinPreview={prevPinPreview}
          nextPinPreview={nextPinPreview}
          canStepBack={pinHistoryStack.length > 0}
          onBack={handleStepBackPin}
          onClose={handleClosePin}
          onSelectPin={(next) => handleSelectPin(next, true)}
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

      {/* Error State (Explicit — Zero Silent Mock Fallback!) */}
      {fetchError && (
        <div className="rounded-[16px] bg-[var(--color-error-muted)] p-5 flex items-center justify-between gap-4">
          <p className="ty-body font-semibold text-[var(--color-error)]">
            {fetchError}
          </p>
          <button
            type="button"
            onClick={() => void loadMasterPins(false)}
            className="btn-round-solid !h-9 shrink-0"
          >
            {language === "th" ? "ลองใหม่" : "Retry"}
          </button>
        </div>
      )}

      {/* Interactive 3-Panel Swipeable Masonry Stage (Zero Skeleton Flash & Zero Card Re-Sorting!) */}
      {isLoadingPins && masterPins.length === 0 && !activePin ? (
        <div className="flex flex-wrap justify-center gap-4">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-[calc(50%-8px)] sm:w-[236px] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse ${
                idx % 3 === 0
                  ? "aspect-[2/3]"
                  : idx % 2 === 0
                  ? "aspect-[4/5]"
                  : "aspect-[3/4]"
              }`}
            />
          ))}
        </div>
      ) : (
        <section
          ref={feedSwipeViewportRef}
          className={
            activePin
              ? "hidden lg:block space-y-3"
              : "relative overflow-x-clip space-y-3"
          }
        >
          <div
            ref={feedSwipeTrackRef}
            className="relative w-full will-change-transform"
          >
            {/* Left Adjacent Category Tab Preview (< lg) */}
            {!activePin && prevStyleTab && prevTabPins.length > 0 && (
              <div
                ref={leftTabPanelRef}
                aria-hidden="true"
                className="lg:hidden absolute left-[calc(-100%-12px)] top-0 w-full pointer-events-none select-none"
              >
                <MasonryGrid
                  items={prevTabPins.slice(0, 10).map((p) => ({
                    ...p,
                    aspectClass: p.aspectRatio,
                  }))}
                  columnWidth={236}
                  gutter={16}
                  fitContainer={true}
                  renderItem={(pin) => (
                    <PinterestPinCard
                      pin={pin}
                      language={language}
                      isSaved={
                        pin.isSavedByMe || optimisticSavedIds.has(pin.id)
                      }
                      onSelectPin={() => {}}
                      onToggleSave={() => {}}
                      onSharePin={() => {}}
                    />
                  )}
                />
              </div>
            )}

            {/* Right Adjacent Category Tab Preview (< lg) */}
            {!activePin && nextStyleTab && nextTabPins.length > 0 && (
              <div
                ref={rightTabPanelRef}
                aria-hidden="true"
                className="lg:hidden absolute left-[calc(100%+12px)] top-0 w-full pointer-events-none select-none"
              >
                <MasonryGrid
                  items={nextTabPins.slice(0, 10).map((p) => ({
                    ...p,
                    aspectClass: p.aspectRatio,
                  }))}
                  columnWidth={236}
                  gutter={16}
                  fitContainer={true}
                  renderItem={(pin) => (
                    <PinterestPinCard
                      pin={pin}
                      language={language}
                      isSaved={
                        pin.isSavedByMe || optimisticSavedIds.has(pin.id)
                      }
                      onSelectPin={() => {}}
                      onToggleSave={() => {}}
                      onSharePin={() => {}}
                    />
                  )}
                />
              </div>
            )}

            {/* Active Center Content */}
            {pins.length === 0 && !activePin ? (
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
                <h2 className="ty-title">
                  {language === "th"
                    ? "ไม่พบที่พักที่ตรงกับหมวดหมู่นี้"
                    : "No stays match this category"}
                </h2>
                <p className="ty-body text-[var(--color-text-secondary)]">
                  {language === "th"
                    ? "ปัดซ้าย-ขวาเพื่อดูหมวดหมู่อื่น หรือกดแสดงที่พักทั้งหมดในระบบ"
                    : "Swipe left or right to browse other categories, or view all stays."}
                </p>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-round-solid inline-flex"
                  >
                    {language === "th" ? "แสดงที่พักทั้งหมด" : "Show All Stays"}
                  </button>
                )}
              </div>
            ) : (
              gridPins.length > 0 && (
                <div className="space-y-3">
                  {activePin && (
                    <h2 className="hidden lg:block ty-subtitle font-bold pt-2">
                      {language === "th"
                        ? "ที่พักสไตล์ใกล้เคียงที่คุณน่าจะชอบ"
                        : "You may also like"}
                    </h2>
                  )}
                  <MasonryGrid
                    key={activePin ? `related-${activePin.id}` : "home-feed"}
                    items={gridPins.map((p) => ({
                      ...p,
                      aspectClass: p.aspectRatio,
                    }))}
                    columnWidth={236}
                    gutter={16}
                    fitContainer={true}
                    renderItem={(pin) => (
                      <PinterestPinCard
                        pin={pin}
                        language={language}
                        isSaved={
                          pin.isSavedByMe || optimisticSavedIds.has(pin.id)
                        }
                        onSelectPin={(p) => handleSelectPin(p, true)}
                        onToggleSave={handleToggleSave}
                        onSharePin={handleSharePin}
                        onHidePin={handleHidePin}
                      />
                    )}
                  />
                </div>
              )
            )}
          </div>
        </section>
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
