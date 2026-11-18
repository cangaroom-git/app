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
import { X } from "lucide-react";
import {
  getProvinceById,
  STAY_STYLE_TABS,
  VALID_STYLE_TAGS,
} from "@/data/thailandProvinces";
import {
  getEncodedSessionTasteParam,
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
  clearLastClickedPinOrigin,
  PinterestPinCard,
  PinterestPinDetail,
} from "@/components/home/PinterestPinDetail";
import type { PinCommentDto, PinFeedItemDto } from "@/types/cangaroom";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface HomeFeedClientProps {
  initialPins: PinFeedItemDto[];
  initialStyleTab?: string;
  initialStayId?: string | null;
  initialPinDetail?: {
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null;
}

export function HomeFeedClient({
  initialPins,
  initialStyleTab = "all",
  initialStayId = null,
  initialPinDetail = null,
}: HomeFeedClientProps) {
  const router = useRouter();
  const {
    lang: language,
    user: currentUser,
    refreshMe,
    globalSearchQuery,
    setGlobalSearchQuery,
  } = useHotelApp();

  const resolvedInitialStyle = VALID_STYLE_TAGS.has(initialStyleTab)
    ? initialStyleTab
    : "all";

  const [activeStyleTab, setActiveStyleTab] =
    useState<string>(resolvedInitialStyle);
  const [visualStyleTab, setVisualStyleTab] =
    useState<string>(resolvedInitialStyle);
  const [mountedTabIds, setMountedTabIds] = useState<Set<string>>(() => {
    const idx = Math.max(
      0,
      STAY_STYLE_TABS.findIndex((t) => t.id === resolvedInitialStyle)
    );
    const initialSet = new Set<string>([STAY_STYLE_TABS[idx]?.id || "all"]);
    if (idx > 0) initialSet.add(STAY_STYLE_TABS[idx - 1].id);
    if (idx < STAY_STYLE_TABS.length - 1) {
      initialSet.add(STAY_STYLE_TABS[idx + 1].id);
    }
    return initialSet;
  });

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

  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const tabUnderlineRef = useRef<HTMLSpanElement | null>(null);
  const hasMountedUnderlineRef = useRef<boolean>(false);
  const prevPinOpenForTabsRef = useRef<boolean>(Boolean(initialStayId));
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const homeRootRef = useRef<HTMLDivElement | null>(null);
  const feedSwipeViewportRef = useRef<HTMLElement | null>(null);
  const feedSwipeTrackRef = useRef<HTMLDivElement | null>(null);
  const tabSwipeTimerRef = useRef<number | null>(null);
  const swipedWhileScrolledRef = useRef<boolean>(false);
  const justDraggedFeedUntilRef = useRef<number>(0);
  const savedFeedScrollYRef = useRef<number>(0);
  const openedFromFeedRef = useRef<{ pinId: string; scrollY: number } | null>(
    null
  );
  const lastOpenPinIdRef = useRef<string | null>(initialStayId);
  const wasPinOpenRef = useRef<boolean>(Boolean(initialStayId));

  // Sync ?stay=... (backward compatible with legacy ?pin=...) & ?style=...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const stayParam = params.get("stay") || params.get("pin");
      setSelectedPinId(stayParam);

      if (params.has("pin") && !params.has("stay") && stayParam) {
        params.set("stay", stayParam);
        params.delete("pin");
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      }

      const styleParam = params.get("style");
      if (styleParam && VALID_STYLE_TAGS.has(styleParam)) {
        setActiveStyleTab(styleParam);
        setVisualStyleTab(styleParam);
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

  // Only fetch /api/pins on mount if SSR fallback was empty (eliminates redundant cold waterfall!)
  useEffect(() => {
    if (initialPins.length === 0) {
      void loadMasterPins(false);
    }
  }, [initialPins.length, loadMasterPins]);

  // Keep adjacent tabs pre-mounted so swipes never allocate/unmount Masonry grids mid-gesture
  useEffect(() => {
    const idx = Math.max(
      0,
      STAY_STYLE_TABS.findIndex((t) => t.id === activeStyleTab)
    );
    setMountedTabIds((prev) => {
      const currId = STAY_STYLE_TABS[idx]?.id || "all";
      const prevId = idx > 0 ? STAY_STYLE_TABS[idx - 1].id : null;
      const nextId =
        idx < STAY_STYLE_TABS.length - 1 ? STAY_STYLE_TABS[idx + 1].id : null;
      if (
        prev.has(currId) &&
        (!prevId || prev.has(prevId)) &&
        (!nextId || prev.has(nextId))
      ) {
        return prev;
      }
      const next = new Set(prev);
      next.add(currId);
      if (prevId) next.add(prevId);
      if (nextId) next.add(nextId);
      return next;
    });
  }, [activeStyleTab]);

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
      if (pinDetail?.pin.id === selectedPinId) {
        return;
      }
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

      setDetailRestoreScrollY(null);

      if (typeof window !== "undefined" && !currentOpenPin) {
        openedFromFeedRef.current = {
          pinId: pin.id,
          scrollY: window.scrollY,
        };
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
      lastOpenPinIdRef.current = pin.id;
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

  // Drill-down step-back: pops previous Stay card in stack until returning to Home feed!
  const handleStepBackPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleClosePin();
      return;
    }
    const prevEntry = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((prev) => prev.slice(0, -1));
    setDetailRestoreScrollY(prevEntry.scrollY);
    lastOpenPinIdRef.current = prevEntry.pin.id;
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
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/?stay=${pinId}`)}`
      );
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
        // fallback clipboard below
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
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/?stay=${selectedPinId}`)}`
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

  useEffect(() => {
    if (activePin) {
      lastOpenPinIdRef.current = activePin.id;
    }
  }, [activePin]);

  // Restore exact card scroll position synchronously BEFORE paint when closing Stay on any viewport (like Pinterest!)
  useIsomorphicLayoutEffect(() => {
    const isNowOpen = Boolean(activePin);
    if (
      wasPinOpenRef.current &&
      !isNowOpen &&
      typeof window !== "undefined"
    ) {
      const openedOrigin = openedFromFeedRef.current;
      const targetPinId =
        lastOpenPinIdRef.current || openedOrigin?.pinId || null;
      const panelEl = tabPanelRefs.current[activeStyleTab];

      const computeTargetScrollY = (): number => {
        const cardEl = targetPinId
          ? panelEl?.querySelector<HTMLElement>(
              `[data-masonry-item-id="${targetPinId}"]`
            )
          : null;

        if (openedOrigin && openedOrigin.pinId === targetPinId) {
          if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            const cardDocTop = rect.top + window.scrollY;
            const cardDocBottom = rect.bottom + window.scrollY;
            const visibleTop = openedOrigin.scrollY + 56;
            const visibleBottom =
              openedOrigin.scrollY + window.innerHeight - 64;
            if (
              rect.height > 0 &&
              (cardDocBottom < visibleTop || cardDocTop > visibleBottom)
            ) {
              return Math.max(
                0,
                Math.round(
                  cardDocTop -
                    Math.max(88, (window.innerHeight - rect.height) * 0.32)
                )
              );
            }
          }
          return openedOrigin.scrollY;
        }

        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          if (rect.height > 0) {
            const cardDocTop = rect.top + window.scrollY;
            return Math.max(
              0,
              Math.round(
                cardDocTop -
                  Math.max(88, (window.innerHeight - rect.height) * 0.32)
              )
            );
          }
        }

        return openedOrigin?.scrollY ?? savedFeedScrollYRef.current;
      };

      const initialResolvedY = computeTargetScrollY();
      window.scrollTo({
        top: initialResolvedY,
        behavior: "instant" as ScrollBehavior,
      });

      window.requestAnimationFrame(() => {
        const settledY = computeTargetScrollY();
        if (Math.abs(window.scrollY - settledY) > 6) {
          window.scrollTo({
            top: settledY,
            behavior: "instant" as ScrollBehavior,
          });
        }
        openedFromFeedRef.current = null;
        lastOpenPinIdRef.current = null;
        setDetailRestoreScrollY(null);
      });
    } else if (isNowOpen && activePin) {
      lastOpenPinIdRef.current = activePin.id;
    }
    wasPinOpenRef.current = isNowOpen;
  }, [activePin, activeStyleTab]);

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
      return pinHistoryStack[pinHistoryStack.length - 1]?.pin ?? null;
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
      clearLastClickedPinOrigin();
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
    [
      activePin,
      pinHistoryStack.length,
      gridPins,
      handleStepBackPin,
      handleSelectPin,
    ]
  );

  // Adjacent Stay Style Tabs
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

  // Real-Time 0ms Indicator & Tab Bar Horizontal Sync Helper
  const syncTabIndicator = useCallback(
    (fromIdx: number, toIdx: number, tProgress: number, animateMs: number) => {
      const indicator = tabUnderlineRef.current;
      const scroller = tabsScrollRef.current;
      const fromTab = STAY_STYLE_TABS[fromIdx];
      const toTab = STAY_STYLE_TABS[toIdx] ?? fromTab;
      if (!indicator || !fromTab || !toTab) return;

      const fromBtn = tabButtonRefs.current[fromTab.id];
      const toBtn = tabButtonRefs.current[toTab.id] ?? fromBtn;
      if (!fromBtn || !toBtn) return;

      const x =
        fromBtn.offsetLeft + (toBtn.offsetLeft - fromBtn.offsetLeft) * tProgress;
      const w =
        fromBtn.offsetWidth +
        (toBtn.offsetWidth - fromBtn.offsetWidth) * tProgress;

      indicator.style.transition =
        animateMs > 0
          ? `transform ${animateMs}ms cubic-bezier(0.22, 1, 0.36, 1), width ${animateMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
          : "none";
      indicator.style.transform = `translate3d(${x}px, 0, 0)`;
      indicator.style.width = `${w}px`;

      if (scroller && scroller.scrollWidth > scroller.clientWidth) {
        const targetScrollLeft = Math.max(
          0,
          Math.min(
            scroller.scrollWidth - scroller.clientWidth,
            x + w / 2 - scroller.clientWidth / 2
          )
        );
        if (animateMs === 0) {
          scroller.scrollLeft = targetScrollLeft;
        } else {
          scroller.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
        }
      }
    },
    []
  );

  // Sync underline indicator immediately on visualStyleTab changes (0ms lag on swipe release or tap!)
  useIsomorphicLayoutEffect(() => {
    if (activePin) {
      prevPinOpenForTabsRef.current = true;
      return;
    }
    const justClosedPin = prevPinOpenForTabsRef.current;
    prevPinOpenForTabsRef.current = false;
    const idx = Math.max(
      0,
      STAY_STYLE_TABS.findIndex((t) => t.id === visualStyleTab)
    );
    const animateMs =
      hasMountedUnderlineRef.current && !justClosedPin ? 240 : 0;
    hasMountedUnderlineRef.current = true;
    syncTabIndicator(idx, idx, 0, animateMs);
  }, [visualStyleTab, activePin, language, syncTabIndicator]);

  // Synchronously reset feed swipe track & scroll BEFORE browser paint when activeStyleTab commits (Zero Flash!)
  useIsomorphicLayoutEffect(() => {
    if (tabSwipeTimerRef.current !== null) {
      window.clearTimeout(tabSwipeTimerRef.current);
      tabSwipeTimerRef.current = null;
    }
    if (feedSwipeTrackRef.current) {
      feedSwipeTrackRef.current.style.transition = "none";
      feedSwipeTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
    }
    for (const tab of STAY_STYLE_TABS) {
      const panelEl = tabPanelRefs.current[tab.id];
      if (panelEl) panelEl.style.top = "0px";
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

  // Precompute all cached Pin arrays by tab ID so persistent mounted panels never allocate mid-swipe
  const tabPinsMap = useMemo(() => {
    const map: Record<string, PinFeedItemDto[]> = {};
    for (const tab of STAY_STYLE_TABS) {
      map[tab.id] = getPinsForStyleTab(tab.id);
    }
    return map;
  }, [getPinsForStyleTab]);

  const selectStyleTabByTap = useCallback((tabId: string) => {
    const idx = Math.max(
      0,
      STAY_STYLE_TABS.findIndex((t) => t.id === tabId)
    );
    setMountedTabIds((prev) => {
      const next = new Set(prev);
      next.add(tabId);
      if (idx > 0) next.add(STAY_STYLE_TABS[idx - 1].id);
      if (idx < STAY_STYLE_TABS.length - 1) {
        next.add(STAY_STYLE_TABS[idx + 1].id);
      }
      return next;
    });
    setVisualStyleTab(tabId);
    setActiveStyleTab(tabId);
  }, []);

  // =========================================================================
  // ENGINE C: 120FPS INTERACTIVE HOME STAY-STYLE TAB SWIPE PAGER (< lg)
  // =========================================================================
  const tabSwipeStateRef = useRef({
    isPinOpen: Boolean(activePin),
    currentTabIdx,
    prevStyleTab,
    nextStyleTab,
    syncTabIndicator,
  });
  tabSwipeStateRef.current = {
    isPinOpen: Boolean(activePin),
    currentTabIdx,
    prevStyleTab,
    nextStyleTab,
    syncTabIndicator,
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
          const activeId =
            STAY_STYLE_TABS[tabSwipeStateRef.current.currentTabIdx]?.id;
          for (const tab of STAY_STYLE_TABS) {
            if (tab.id === activeId) continue;
            const panelEl = tabPanelRefs.current[tab.id];
            if (panelEl) panelEl.style.top = `${topOff}px`;
          }
        } else {
          state.locked = "vertical";
        }
      }

      if (state.locked === "horizontal") {
        if (e.cancelable) e.preventDefault();
        const track = feedSwipeTrackRef.current;
        if (!track) return;
        const {
          currentTabIdx: curIdx,
          prevStyleTab: prevT,
          nextStyleTab: nextT,
          syncTabIndicator: syncFn,
        } = tabSwipeStateRef.current;

        const atEdge = (dx > 0 && !prevT) || (dx < 0 && !nextT);
        const effectiveDx = atEdge ? dx * 0.24 : dx;
        track.style.transition = "none";
        track.style.transform = `translate3d(${effectiveDx}px, 0, 0)`;

        // Live 1:1 underline & tab-bar scroll tracking during finger drag
        const vw =
          feedSwipeViewportRef.current?.clientWidth ||
          window.innerWidth ||
          375;
        if (dx < 0 && nextT) {
          syncFn(curIdx, curIdx + 1, Math.min(1, -dx / vw), 0);
        } else if (dx > 0 && prevT) {
          syncFn(curIdx, curIdx - 1, Math.min(1, dx / vw), 0);
        } else {
          syncFn(curIdx, curIdx, 0, 0);
        }
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
      const {
        currentTabIdx: curIdx,
        prevStyleTab: prevT,
        nextStyleTab: nextT,
        syncTabIndicator: syncFn,
      } = tabSwipeStateRef.current;

      const commitNext = Boolean(nextT) && (dx < -vw * 0.18 || vx < -0.32);
      const commitPrev = Boolean(prevT) && (dx > vw * 0.18 || vx > 0.32);

      if (commitNext && nextT) {
        swipedWhileScrolledRef.current = st.scrolledOffset > 0;
        // Immediate 0ms tab highlight + tab bar scroll on finger release!
        setVisualStyleTab(nextT.id);
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(calc(-100% - 12px), 0, 0)";
        tabSwipeTimerRef.current = window.setTimeout(() => {
          tabSwipeTimerRef.current = null;
          setActiveStyleTab(nextT.id);
        }, 260);
      } else if (commitPrev && prevT) {
        swipedWhileScrolledRef.current = st.scrolledOffset > 0;
        setVisualStyleTab(prevT.id);
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(calc(100% + 12px), 0, 0)";
        tabSwipeTimerRef.current = window.setTimeout(() => {
          tabSwipeTimerRef.current = null;
          setActiveStyleTab(prevT.id);
        }, 260);
      } else {
        syncFn(curIdx, curIdx, 0, 220);
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
    selectStyleTabByTap("all");
    setGlobalSearchQuery("");
  };

  return (
    <div
      ref={homeRootRef}
      className="cgr-page-fluid space-y-4 sm:space-y-5 [overflow-anchor:none]"
    >
      {/* Strictly Locked 44px Horizontal Stay Style Tabs Bar (Persisted silently when activePin is open!) */}
      <div
        aria-hidden={Boolean(activePin)}
        className={activePin ? "hidden" : "space-y-2"}
      >
          <div
            ref={tabsScrollRef}
            data-style-tabs-bar="true"
            style={{ touchAction: "pan-x" }}
            className="relative h-11 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar border-b border-[var(--color-border)] select-none"
          >
            <div className="relative flex items-center gap-5 sm:gap-6 h-full min-w-max">
              {STAY_STYLE_TABS.map((tab) => {
                const isVisualActive = visualStyleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => selectStyleTabByTap(tab.id)}
                    className={`h-full inline-flex items-center shrink-0 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                      isVisualActive
                        ? "font-bold text-[var(--color-text-primary)]"
                        : "font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>
                      {language === "th" ? tab.labelTh : tab.labelEn}
                    </span>
                  </button>
                );
              })}

              <span
                ref={tabUnderlineRef}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-[var(--color-text-primary)] will-change-transform"
              />
            </div>
          </div>

          {globalSearchQuery.trim() && (
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="ty-caption truncate">
                {language === "th"
                  ? `ผลค้นหา: "${globalSearchQuery.trim()}"`
                  : `Results for "${globalSearchQuery.trim()}"`}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="shrink-0 h-8 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{language === "th" ? "ล้างคำค้นหา" : "Clear search"}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      {/* Stay Close-Up Stage at Very Top (Native Window Scroll on Mobile for Translucent Safari Bar + 1:1 Card Slide!) */}
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
          restoreScrollY={detailRestoreScrollY}
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

      {/* Desktop Close-Up Related Grid (Rendered cleanly without unmounting main Home feed!) */}
      {activePin && gridPins.length > 0 && (
        <section className="hidden lg:block space-y-3">
          <h2 className="ty-subtitle font-bold pt-2">
            {language === "th"
              ? "ที่พักสไตล์ใกล้เคียงที่คุณน่าจะชอบ"
              : "You may also like"}
          </h2>
          <MasonryGrid
            key={`related-${activePin.id}`}
            items={gridPins.map((p) => ({
              ...p,
              aspectClass: p.aspectRatio,
            }))}
            columnWidth={184}
            maxColumnWidth={235}
            gutter={14}
            fitContainer={true}
            renderItem={(pin, cardIdx) => (
              <PinterestPinCard
                pin={pin}
                language={language}
                priority={cardIdx < 6}
                isSaved={pin.isSavedByMe || optimisticSavedIds.has(pin.id)}
                onSelectPin={(p) => handleSelectPin(p, true)}
                onToggleSave={handleToggleSave}
                onSharePin={handleSharePin}
                onHidePin={handleHidePin}
              />
            )}
          />
        </section>
      )}

      {/* Interactive Persistent Multi-Tab Masonry Stage (Never Unmounts on Pin Open = Zero Reflow & Exact Scroll Restore!) */}
      {isLoadingPins && masterPins.length === 0 && !activePin ? (
        <div className="flex flex-wrap justify-center gap-3.5">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-[calc(50%-8px)] sm:w-[200px] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse ${
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
          aria-hidden={Boolean(activePin)}
          className={
            activePin
              ? "hidden"
              : "relative overflow-x-clip space-y-3"
          }
        >
          <div
            ref={feedSwipeTrackRef}
            className="relative w-full will-change-transform"
          >
            {STAY_STYLE_TABS.map((tab, idx) => {
              if (!mountedTabIds.has(tab.id)) return null;
              const isCurrent = idx === currentTabIdx;
              const offsetTabs = idx - currentTabIdx;
              const tabPins = tabPinsMap[tab.id] || [];

              return (
                <div
                  key={tab.id}
                  ref={(el) => {
                    tabPanelRefs.current[tab.id] = el;
                  }}
                  aria-hidden={!isCurrent}
                  style={
                    isCurrent
                      ? undefined
                      : {
                          left: `calc(${offsetTabs * 100}% + ${
                            offsetTabs * 12
                          }px)`,
                        }
                  }
                  className={
                    isCurrent
                      ? "relative w-full"
                      : "lg:hidden absolute top-0 w-full pointer-events-none select-none"
                  }
                >
                  {tabPins.length === 0 ? (
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
                      {hasActiveFilter && isCurrent && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="btn-round-solid inline-flex"
                        >
                          {language === "th"
                            ? "แสดงที่พักทั้งหมด"
                            : "Show All Stays"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <MasonryGrid
                      key={`tab-grid-${tab.id}`}
                      items={tabPins.map((p) => ({
                        ...p,
                        aspectClass: p.aspectRatio,
                      }))}
                      columnWidth={184}
                      maxColumnWidth={235}
                      gutter={14}
                      fitContainer={true}
                      renderItem={(pin, cardIdx) => (
                        <PinterestPinCard
                          pin={pin}
                          language={language}
                          priority={isCurrent && cardIdx < 8}
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
                  )}
                </div>
              );
            })}
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

