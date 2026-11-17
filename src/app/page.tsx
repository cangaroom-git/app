"use client";

import React, {
  useCallback,
  useEffect,
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
  const [pins, setPins] = useState<PinFeedItemDto[]>([]);
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
  const feedSwipeRef = useRef<{
    startX: number;
    startY: number;
    ignore: boolean;
  } | null>(null);
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

  const loadPins = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingPins(true);
      setFetchError(null);
      try {
        const qs = new URLSearchParams();
        if (activeStyleTab !== "all") qs.set("style", activeStyleTab);
        if (globalSearchQuery.trim()) qs.set("q", globalSearchQuery.trim());

        const tasteParam = getEncodedSessionTasteParam();
        if (tasteParam) {
          qs.set("taste", tasteParam);
        }
        lastFeedTasteSeqRef.current = getSessionInteractionCount();

        if (activeStyleTab !== "all") {
          trackTelemetryEvent({
            eventType: "SEARCH_FILTER",
            styleTab: activeStyleTab,
          });
        }

        const res = await fetch(`/api/pins?${qs.toString()}`, {
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
        setPins(fetched);
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
    },
    [activeStyleTab, globalSearchQuery]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPins(false);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [loadPins]);

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
    return pins.find((p) => p.id === selectedPinId) ?? null;
  }, [pinDetail, selectedPinId, selectedPinSnapshot, pins]);

  const handleSelectPin = useCallback(
    (pin: PinFeedItemDto, pushHistoryStack = true) => {
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
        pins.find((p) => p.id === pinId);
      if (targetPin) trackPinInteraction("PIN_SAVE", targetPin);
    }
    setOptimisticSavedIds((prev) => {
      const next = new Set(prev);
      if (result.isSaved) next.add(pinId);
      else next.delete(pinId);
      return next;
    });
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId ? { ...p, isSavedByMe: result.isSaved } : p
      )
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
        pins.find((p) => p.id === pinId);
      if (targetPin) trackPinInteraction("PIN_LIKE", targetPin);
    }

    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? { ...p, isLikedByMe: data.isLiked, likesCount: data.likesCount }
          : p
      )
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

  const activePinComments = useMemo(
    () =>
      activePin && pinDetail?.pin.id === activePin.id ? pinDetail.comments : [],
    [activePin, pinDetail]
  );

  // Instant client-side similarity sort used during the ~80ms before server `relatedPins` resolves
  const instantSimilarFallback = useMemo(() => {
    if (!activePin) return [];
    const anchorStyles = new Set(activePin.stayStyles);
    const anchorRegion = getProvinceById(activePin.provinceId)?.region ?? null;

    // Exclude same hotel upfront per user rule
    const otherHotels = pins.filter(
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
  }, [activePin, pins, hiddenPinIds]);

  // When a Pin is open, `gridPins` displays a stable single-pass similarity ranking
  // without re-shuffling cards that are already visible on screen when `/api/pins/[id]` resolves!
  const gridPins = useMemo(() => {
    if (!activePin) {
      return pins.filter((p) => !hiddenPinIds.has(p.id));
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

  const handleFeedTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activePin || typeof window === "undefined" || window.innerWidth >= 1024) {
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
    feedSwipeRef.current = { startX: t.clientX, startY: t.clientY, ignore };
  };

  const handleFeedTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const st = feedSwipeRef.current;
    feedSwipeRef.current = null;
    if (
      !st ||
      st.ignore ||
      activePin ||
      typeof window === "undefined" ||
      window.innerWidth >= 1024
    ) {
      return;
    }
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      const currentIdx = STAY_STYLE_TABS.findIndex(
        (tab) => tab.id === activeStyleTab
      );
      if (currentIdx === -1) return;
      if (dx < 0 && currentIdx < STAY_STYLE_TABS.length - 1) {
        setActiveStyleTab(STAY_STYLE_TABS[currentIdx + 1].id);
      } else if (dx > 0 && currentIdx > 0) {
        setActiveStyleTab(STAY_STYLE_TABS[currentIdx - 1].id);
      }
    }
  };

  const hasActiveFilter =
    activeStyleTab !== "all" || Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    setActiveStyleTab("all");
    setGlobalSearchQuery("");
  };

  return (
    <div
      onTouchStart={handleFeedTouchStart}
      onTouchEnd={handleFeedTouchEnd}
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

      {/* Pin Close-Up Stage at Very Top (Instant Open Without Smooth Slide | Mobile Fullscreen Overlay) */}
      {activePin && (
        <PinterestPinDetail
          pin={activePin}
          language={language}
          currentUser={currentUser}
          comments={activePinComments}
          savedPinIds={optimisticSavedIds}
          relatedPins={gridPins}
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
            onClick={() => loadPins(false)}
            className="btn-round-solid !h-9 shrink-0"
          >
            {language === "th" ? "ลองใหม่" : "Retry"}
          </button>
        </div>
      )}

      {/* In-Place Animated Masonry Grid (Expands Clicked Pin Right at Its Row — Zero Jump to Top!) */}
      {isLoadingPins && !activePin ? (
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
      ) : pins.length === 0 && !activePin ? (
        <div className="rounded-[20px] bg-[var(--color-background-muted)] p-10 text-center space-y-3">
          <h2 className="ty-title">
            {language === "th"
              ? "ไม่พบที่พักที่ตรงกับตัวกรองนี้"
              : "No stays match your active filters"}
          </h2>
          <p className="ty-body text-[var(--color-text-secondary)]">
            {language === "th"
              ? "ลองเปลี่ยนจังหวัด สไตล์ที่พัก หรือล้างช่วงวันเข้าพักเพื่อชมที่พักทั้งหมดในระบบ"
              : "Try clearing province, stay style, or date filters."}
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
          <section className="space-y-3">
            {activePin && (
              <h2 className="hidden lg:block ty-subtitle font-bold pt-2">
                {language === "th"
                  ? "ที่พักสไตล์ใกล้เคียงที่คุณน่าจะชอบ"
                  : "You may also like"}
              </h2>
            )}
            <MasonryGrid
              key={
                activePin
                  ? `related-${activePin.id}`
                  : `feed-${activeStyleTab}-${globalSearchQuery.trim() || "all"}`
              }
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
                  isSaved={pin.isSavedByMe || optimisticSavedIds.has(pin.id)}
                  onSelectPin={(p) => handleSelectPin(p, true)}
                  onToggleSave={handleToggleSave}
                  onSharePin={handleSharePin}
                  onHidePin={handleHidePin}
                />
              )}
            />
          </section>
        )
      )}

      <PureMediaViewer
        slides={fullscreenMedia?.slides ?? null}
        initialIndex={fullscreenMedia?.index ?? 0}
        onClose={() => setFullscreenMedia(null)}
      />
    </div>
  );
}
