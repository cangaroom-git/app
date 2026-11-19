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
    globalSearchQuery,
    setGlobalSearchQuery,
    openAuthModal,
    savedPinIds: globalSavedPinIds,
    hasLoadedBoardsOnce,
    triggerPinToBoard,
    togglePinLikeInstant,
  } = useHotelApp();

  const resolvedInitialStyle = VALID_STYLE_TAGS.has(initialStyleTab)
    ? initialStyleTab
    : "all";

  const [activeStyleTab, setActiveStyleTab] =
    useState<string>(resolvedInitialStyle);
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
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stickyTabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const feedGridContainerRef = useRef<HTMLElement | null>(null);
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
    const targetPin =
      (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
      masterPins.find((p) => p.id === pinId) ??
      pins.find((p) => p.id === pinId) ??
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
        prev ? { ...prev, pin: { ...prev.pin, isSavedByMe: result.isSaved } } : prev
      );
    }
  };

  const effectiveSavedPinIds =
    currentUser && !hasLoadedBoardsOnce ? optimisticSavedIds : globalSavedPinIds;

  const handleToggleLike = (pinId: string) => {
    const targetPin =
      (pinDetail?.pin.id === pinId ? pinDetail.pin : null) ??
      masterPins.find((p) => p.id === pinId) ??
      pins.find((p) => p.id === pinId);
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
          if (res.ok) {
            await loadPinDetail(selectedPinId);
          }
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
      const panelEl = feedGridContainerRef.current;

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

  // Show Sticky Tabs Bar cleanly once scrolled past inline tabs (mirrors HotelStorefrontClient anchor bar)
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
        if (entry) {
          setIsTabsPinned(!entry.isIntersecting);
        }
      },
      {
        rootMargin: "-64px 0px 0px 0px",
        threshold: 0,
      }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [activePin]);

  // Slide global Mobile Top Bar out smoothly when Home Sticky Tabs Bar is pinned at top-0
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

  // Keep active tab centered inside both inline and sticky horizontal tab scrollers
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
    syncScroller(tabsScrollRef.current, tabButtonRefs.current[activeStyleTab]);
    syncScroller(
      stickyTabsScrollRef.current,
      stickyTabButtonRefs.current[activeStyleTab]
    );
  }, [activeStyleTab, activePin, language]);

  const selectStyleTabByTap = useCallback(
    (tabId: string) => {
      setActiveStyleTab(tabId);
      if (isTabsPinned && typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [isTabsPinned]
  );

  const hasActiveFilter =
    activeStyleTab !== "all" || Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    selectStyleTabByTap("all");
    setGlobalSearchQuery("");
  };

  return (
    <div className="cgr-page-fluid space-y-4 sm:space-y-5 [overflow-anchor:none]">
      {/* Scroll-Reveal Sticky Stay Style Tabs Bar (Fixed Top Bar under 64px Header on Desktop / Top Edge on Mobile) */}
      {!activePin && (
        <nav
          aria-label={language === "th" ? "หมวดหมู่สไตล์ที่พัก" : "Stay styles"}
          aria-hidden={!isTabsPinned}
          className={`fixed top-0 lg:top-16 inset-x-0 lg:left-[72px] z-30 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-3 sm:px-6 lg:px-8 transition-[opacity,transform] duration-200 ${
            isTabsPinned
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div
            ref={stickyTabsScrollRef}
            data-style-tabs-bar="true"
            className="h-12 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-y-none no-scrollbar select-none"
          >
            {STAY_STYLE_TABS.map((tab) => {
              const isActive = activeStyleTab === tab.id;
              return (
                <button
                  key={`sticky-${tab.id}`}
                  ref={(el) => {
                    stickyTabButtonRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => selectStyleTabByTap(tab.id)}
                  className={`h-full border-b-2 inline-flex items-center shrink-0 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                      : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Inline Stay Style Tabs Bar + Active Search Filter Banner (Persisted silently when activePin is open!) */}
      <div
        aria-hidden={Boolean(activePin)}
        className={activePin ? "hidden" : "space-y-2"}
      >
        <div ref={inlineTabsSentinelRef}>
          <div
            ref={tabsScrollRef}
            data-style-tabs-bar="true"
            className="h-11 flex items-center gap-5 sm:gap-6 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-y-none overscroll-x-contain no-scrollbar border-b border-[var(--color-border)] select-none"
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
                  onClick={() => selectStyleTabByTap(tab.id)}
                  className={`h-full border-b-2 inline-flex items-center shrink-0 ty-body whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                      : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>
                </button>
              );
            })}
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
          savedPinIds={effectiveSavedPinIds}
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

      {/* Desktop Close-Up Related Grid (Equal Section Rhythm via Single 1px Hairline) */}
      {activePin && gridPins.length > 0 && (
        <section className="hidden lg:block pt-8 lg:pt-10 border-t border-[var(--color-border)] space-y-4">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
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
                isSaved={effectiveSavedPinIds.has(pin.id)}
                onSelectPin={(p) => handleSelectPin(p, true)}
                onToggleSave={handleToggleSave}
                onToggleLike={handleToggleLike}
                onSharePin={handleSharePin}
                onHidePin={handleHidePin}
              />
            )}
          />
        </section>
      )}

      {/* Persistent Masonry Feed Stage (Never Unmounts on Pin Open = Exact Scroll Restore!) */}
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
          ref={feedGridContainerRef}
          aria-hidden={Boolean(activePin)}
          className={activePin ? "hidden" : "relative space-y-3"}
        >
          {pins.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
              <h2 className="ty-title">
                {language === "th"
                  ? "ไม่พบที่พักที่ตรงกับหมวดหมู่นี้"
                  : "No stays match this category"}
              </h2>
              <p className="ty-body text-[var(--color-text-secondary)]">
                {language === "th"
                  ? "เลือกหมวดหมู่อื่นด้านบน หรือกดแสดงที่พักทั้งหมดในระบบ"
                  : "Pick another category above, or view all stays."}
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
            <MasonryGrid
              key={`tab-grid-${activeStyleTab}`}
              items={pins.map((p) => ({
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
                  priority={cardIdx < 8}
                  isSaved={effectiveSavedPinIds.has(pin.id)}
                  onSelectPin={(p) => handleSelectPin(p, true)}
                  onToggleSave={handleToggleSave}
                  onToggleLike={handleToggleLike}
                  onSharePin={handleSharePin}
                  onHidePin={handleHidePin}
                />
              )}
            />
          )}
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

