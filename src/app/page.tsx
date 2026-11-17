"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STAY_STYLE_TABS, VALID_STYLE_TAGS } from "@/data/thailandProvinces";
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
    selectedProvinceId,
    setSelectedProvinceId,
    isDateFilterActive,
    setIsDateFilterActive,
    checkIn,
    checkOut,
    guests,
  } = useHotelApp();

  const [activeStyleTab, setActiveStyleTab] = useState<string>("all");
  const [pins, setPins] = useState<PinFeedItemDto[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
  } | null>(null);
  const [optimisticSavedIds, setOptimisticSavedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

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

  const loadPins = useCallback(async () => {
    setIsLoadingPins(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      if (activeStyleTab !== "all") qs.set("style", activeStyleTab);
      if (selectedProvinceId) qs.set("provinceId", selectedProvinceId);
      if (globalSearchQuery.trim()) qs.set("q", globalSearchQuery.trim());
      if (isDateFilterActive) {
        qs.set("checkIn", checkIn);
        qs.set("checkOut", checkOut);
        qs.set("guests", String(guests));
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
      setFetchError(
        err instanceof Error ? err.message : "โหลดข้อมูลที่พักไม่สำเร็จ"
      );
    } finally {
      setIsLoadingPins(false);
    }
  }, [
    activeStyleTab,
    selectedProvinceId,
    globalSearchQuery,
    isDateFilterActive,
    checkIn,
    checkOut,
    guests,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPins();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [loadPins]);

  const loadPinDetail = useCallback(async (pinId: string) => {
    try {
      const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        pin: PinFeedItemDto;
        comments: PinCommentDto[];
        relatedPins: PinFeedItemDto[];
      };
      setPinDetail(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      loadPinDetail(selectedPinId);
    } else {
      setPinDetail(null);
    }
  }, [selectedPinId, loadPinDetail]);

  const handleSelectPin = (pin: PinFeedItemDto) => {
    setSelectedPinId(pin.id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("pin", pin.id);
      window.history.pushState(null, "", url.toString());
    }
  };

  const handleClosePin = () => {
    setSelectedPinId(null);
    setPinDetail(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("pin");
      window.history.pushState(null, "", url.toString());
    }
  };

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

  const activePin = useMemo(
    () =>
      pinDetail?.pin ||
      (selectedPinId ? pins.find((p) => p.id === selectedPinId) ?? null : null),
    [pinDetail, selectedPinId, pins]
  );

  const masonryPins = useMemo(() => {
    const base =
      activePin && !pins.some((p) => p.id === activePin.id)
        ? [activePin, ...pins]
        : pins;
    if (!activePin || !pinDetail?.relatedPins) return base;
    const seen = new Set(base.map((p) => p.id));
    const extras = pinDetail.relatedPins.filter((p) => !seen.has(p.id));
    return [...base, ...extras];
  }, [pins, activePin, pinDetail?.relatedPins]);

  const hasActiveFilter =
    activeStyleTab !== "all" ||
    Boolean(selectedProvinceId) ||
    isDateFilterActive ||
    Boolean(globalSearchQuery.trim());

  const handleResetFilters = () => {
    setActiveStyleTab("all");
    setSelectedProvinceId(null);
    setIsDateFilterActive(false);
    setGlobalSearchQuery("");
  };

  return (
    <div className="cgr-page-fluid space-y-5">
      {/* Horizontal Stay Style Tabs */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
        {STAY_STYLE_TABS.map((tab) => {
          const isActive = activeStyleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveStyleTab(tab.id);
                if (selectedPinId) handleClosePin();
              }}
              className={`relative shrink-0 py-3 -mb-px border-b-2 ty-body transition-colors cursor-pointer whitespace-nowrap ${
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

      {/* Error State (Explicit — Zero Silent Mock Fallback!) */}
      {fetchError && (
        <div className="rounded-[16px] bg-[var(--color-error-muted)] p-5 flex items-center justify-between gap-4">
          <p className="ty-body font-semibold text-[var(--color-error)]">
            {fetchError}
          </p>
          <button
            type="button"
            onClick={loadPins}
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
      ) : masonryPins.length === 0 && !activePin ? (
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
        masonryPins.length > 0 && (
          <section>
            <MasonryGrid
              items={masonryPins.map((p) => ({
                ...p,
                aspectClass: p.aspectRatio,
              }))}
              columnWidth={236}
              gutter={16}
              expandedItemId={activePin?.id ?? null}
              renderExpandedStage={
                activePin
                  ? () => (
                      <PinterestPinDetail
                        pin={activePin}
                        language={language}
                        currentUser={currentUser}
                        comments={pinDetail?.comments ?? []}
                        savedPinIds={optimisticSavedIds}
                        onClose={handleClosePin}
                        onSelectPin={handleSelectPin}
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
                    )
                  : undefined
              }
              renderItem={(pin) => (
                <PinterestPinCard
                  pin={pin}
                  language={language}
                  isSaved={pin.isSavedByMe || optimisticSavedIds.has(pin.id)}
                  onSelectPin={handleSelectPin}
                  onToggleSave={handleToggleSave}
                  onSharePin={handleSharePin}
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
