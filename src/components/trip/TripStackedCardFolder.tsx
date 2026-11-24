"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Heart,
  MapPin,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  PIN_IMAGE_SIZES,
} from "@/lib/mediaUtils";
import {
  estimateRoadDistanceAndTime,
  formatDistanceLabel,
  haversineDistanceKm,
} from "@/lib/geo/nearbyPlacesTypes";
import type { SavedBoardDto, SavedBoardPinItemDto } from "@/types/cangaroom";

interface TripStackedCardFolderProps {
  board: SavedBoardDto;
  language: LanguageCode;
  priority?: boolean;
  ownerDisplayName?: string | null;
  onOpenTrip: (board: SavedBoardDto) => void;
  onDeleteTrip?: (board: SavedBoardDto) => void;
}

const MAX_VISIBLE_STACK = 4;

/**
 * Kavsoft-inspired Looping Stacked Coupon Card Folder (View 1 on /trip).
 * - Displays up to 4 saved Nondii coupon tickets stacked with crisp translate3d + rotate depth (ZERO hover scale!).
 * - Mobile/Pointer: 1:1 horizontal drag with organic tilt; release past threshold loops the front card to the back.
 * - Desktop: Crisp small `<` and `>` buttons cycle cards forward/backward so users can preview stays inside the trip.
 * - Tapping the front card (without dragging) or clicking the trip title opens View 2 (Trip Map + Fanned Arc Deck).
 */
export const TripStackedCardFolder = React.memo(function TripStackedCardFolder({
  board,
  language,
  priority = false,
  ownerDisplayName,
  onOpenTrip,
  onDeleteTrip,
}: TripStackedCardFolderProps) {
  const isTh = language === "th";
  const items = board.items;
  const totalCount = items.length;

  const [topIndex, setTopIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [flyingOut, setFlyingOut] = useState<{
    boardPinId: string;
    direction: -1 | 1;
  } | null>(null);

  useEffect(() => {
    const syncBp = () => {
      if (typeof window !== "undefined") {
        setIsMobileGrid(window.innerWidth < 640);
      }
    };
    syncBp();
    window.addEventListener("resize", syncBp, { passive: true });
    return () => window.removeEventListener("resize", syncBp);
  }, []);

  const safeTopIndex = totalCount > 0 ? topIndex % totalCount : 0;

  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    axis: "horizontal" | "vertical" | null;
    moved: boolean;
    samples: Array<{ x: number; t: number }>;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const flyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flyTimeoutRef.current) {
        window.clearTimeout(flyTimeoutRef.current);
      }
    };
  }, []);

  const promoAlertCount = useMemo(
    () =>
      items.filter((e) => e.priceDropThb > 0 || e.hasActivePromo).length,
    [items]
  );

  // Quick sequential route distance summary for folder subtitle when >= 2 stays have coordinates
  const totalRouteSummary = useMemo(() => {
    const withCoords = items.filter(
      (e) =>
        typeof e.pin.hotelLatitude === "number" &&
        typeof e.pin.hotelLongitude === "number" &&
        Number.isFinite(e.pin.hotelLatitude) &&
        Number.isFinite(e.pin.hotelLongitude)
    );
    if (withCoords.length < 2) return null;
    let totalKm = 0;
    for (let i = 1; i < withCoords.length; i++) {
      const prev = withCoords[i - 1].pin;
      const curr = withCoords[i].pin;
      const straight = haversineDistanceKm(
        prev.hotelLatitude!,
        prev.hotelLongitude!,
        curr.hotelLatitude!,
        curr.hotelLongitude!
      );
      if (straight >= 0.03) {
        totalKm += estimateRoadDistanceAndTime(straight).roadKm;
      }
    }
    if (totalKm <= 0) return null;
    return formatDistanceLabel(totalKm, language);
  }, [items, language]);

  const stackedCards = useMemo(() => {
    if (totalCount === 0) return [];
    const count = Math.min(MAX_VISIBLE_STACK, totalCount);
    const ordered: Array<{
      entry: SavedBoardPinItemDto;
      depth: number;
      stopNumber: number;
    }> = [];
    for (let d = 0; d < count; d++) {
      const idx = (safeTopIndex + d) % totalCount;
      ordered.push({
        entry: items[idx],
        depth: d,
        stopNumber: idx + 1,
      });
    }
    // Render back-to-front so DOM stacking matches depth cleanly
    return ordered.reverse();
  }, [items, safeTopIndex, totalCount]);

  const cycleNext = useCallback(
    (direction: -1 | 1 = -1) => {
      if (totalCount <= 1 || flyingOut) return;
      const frontEntry = items[safeTopIndex];
      if (!frontEntry) return;
      setFlyingOut({ boardPinId: frontEntry.boardPinId, direction });
      setDragX(0);
      setIsDragging(false);

      if (flyTimeoutRef.current) {
        window.clearTimeout(flyTimeoutRef.current);
      }
      flyTimeoutRef.current = window.setTimeout(() => {
        setTopIndex((prev) => (prev + 1) % totalCount);
        setFlyingOut(null);
      }, 210);
    },
    [flyingOut, items, safeTopIndex, totalCount]
  );

  const cyclePrev = useCallback(() => {
    if (totalCount <= 1 || flyingOut) return;
    setDragX(0);
    setIsDragging(false);
    setTopIndex((prev) => (prev - 1 + totalCount) % totalCount);
  }, [flyingOut, totalCount]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalCount <= 1 || flyingOut) return;
    // Ignore secondary mouse buttons
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      moved: false,
      samples: [{ x: e.clientX, t: performance.now() }],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const now = performance.now();

    g.samples.push({ x: e.clientX, t: now });
    while (g.samples.length > 2 && now - g.samples[0].t > 105) {
      g.samples.shift();
    }

    if (g.axis === null) {
      if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy) * 0.9) {
        g.axis = "horizontal";
        g.moved = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore if capture unavailable
        }
      } else if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        g.axis = "vertical";
      }
    }

    if (g.axis === "horizontal") {
      // Silky 1:1 follow with gentle hyperbolic rubber resistance beyond 140px
      const absDx = Math.abs(dx);
      const effective =
        absDx <= 140
          ? dx
          : Math.sign(dx) * (140 + ((absDx - 140) * 0.38) / (1 + (absDx - 140) / 140));
      setDragX(Math.max(-195, Math.min(195, effective)));
    }
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.pointerId !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    if (g.axis === "horizontal") {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 240);

      const finalDx = e.clientX - g.startX;
      const now = performance.now();
      let vx = 0;
      if (g.samples.length >= 2) {
        const newest = g.samples[g.samples.length - 1];
        if (now - newest.t < 90) {
          const oldest = g.samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 5) {
            vx = (newest.x - oldest.x) / dt;
          }
        }
      }

      // Effortless iOS flick detection: either deliberate drag (>= 38px) OR quick velocity flick (|vx| >= 0.24 px/ms & >= 14px)!
      const isVelocityFlick = Math.abs(vx) >= 0.24 && Math.abs(finalDx) >= 14;
      if (Math.abs(finalDx) >= 38 || isVelocityFlick) {
        const dir = isVelocityFlick ? (vx < 0 ? -1 : 1) : finalDx < 0 ? -1 : 1;
        cycleNext(dir);
      } else {
        setIsDragging(false);
        setDragX(0);
      }
    } else {
      setIsDragging(false);
      setDragX(0);
    }
  };

  const dragProgress = isDragging ? Math.min(1, Math.abs(dragX) / 115) : 0;

  return (
    <div className="group/trip relative flex flex-col select-none">
      {/* ===================================================================
          STACKED LOOPING COUPON DECK STAGE (Kavsoft-Inspired, Zero Hover Scale)
      ==================================================================== */}
      <div
        className={`relative w-full pt-1 pb-2 sm:pb-2.5 ${
          totalCount >= 1 ? "pr-6 sm:pr-9" : "pr-0"
        }`}
      >
        {totalCount === 0 ? (
          /* Empty Trip Folder — Clean Warm Minimal Dashed Voucher Outline */
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenTrip(board)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenTrip(board);
              }
            }}
            className="relative aspect-square w-full rounded-[22px] sm:rounded-[24px] border border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75 transition-colors cursor-pointer flex flex-col items-center justify-center text-center px-3.5 sm:px-5 py-7 sm:py-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]"
          >
            <span className="h-11 w-11 rounded-[12px] bg-[var(--color-background-card)] text-[var(--color-text-secondary)] inline-flex items-center justify-center mb-3">
              <Heart className="w-5 h-5" />
            </span>
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              {isTh ? "ยังไม่มีสถานที่ในรายการนี้" : "No places saved yet"}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1">
              {isTh
                ? "กดหัวใจบนการ์ดสถานที่ที่ถูกใจเพื่อเก็บไว้ที่นี่"
                : "Tap the heart on places you love to save them here"}
            </p>

            {/* Top-Left Delete Button */}
            {onDeleteTrip && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrip(board);
                }}
                aria-label={isTh ? `ลบทริป ${board.name}` : `Delete ${board.name}`}
                title={isTh ? "ลบทริปนี้" : "Delete trip"}
                className="absolute top-2.5 left-2.5 z-20 h-8 w-8 rounded-[10px] bg-white/94 dark:bg-[#222222]/94 hover:bg-white dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] inline-flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/trip:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* Looping Stacked Nondii Coupon Cards */
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishGesture}
            onPointerCancel={finishGesture}
            className="relative w-full touch-pan-y"
          >
            {/* Subtle Straight Ghost Backing When Only 1 Place Is Saved */}
            {totalCount === 1 && (
              <div
                aria-hidden="true"
                style={{
                  transform: `translate3d(${isMobileGrid ? 10 : 15}px, 0px, 0) scale(0.905)`,
                  transformOrigin: "100% 50%",
                }}
                className="pointer-events-none absolute inset-0 rounded-[18px] sm:rounded-[20px] bg-[var(--color-background-muted)]/75 opacity-65"
              />
            )}

            {/* Render Back-to-Front Upright Straight Stacked Cards (Smaller + Faded Behind Front Card!) */}
            {stackedCards.map(({ entry, depth, stopNumber }) => {
              const isFront = depth === 0;
              const isExiting =
                flyingOut?.boardPinId === entry.boardPinId && isFront;
              const pin = entry.pin;
              const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;

              // Effective depth shifts smoothly forward as the front card is dragged or flying off!
              const shiftForward = isExiting ? 1 : dragProgress;
              const effectiveDepth = isFront
                ? 0
                : Math.max(0, depth - shiftForward);

              const stepOffsetX = isMobileGrid ? 11 : 17;
              const tx = isExiting
                ? flyingOut.direction * 118
                : isFront
                ? dragX
                : effectiveDepth * stepOffsetX -
                  Math.max(0, effectiveDepth - 1) * (isMobileGrid ? 1.5 : 2);
              const ty = isExiting ? 6 : 0;
              const rot = isExiting
                ? flyingOut.direction * 6
                : isFront && isDragging
                ? dragX * 0.04
                : 0;
              const cardScale = isFront
                ? 1
                : Math.max(0.72, 1 - effectiveDepth * 0.095);
              const imgFadeOpacity = isFront
                ? 1
                : effectiveDepth <= 1
                ? Math.max(0.55, 1 - effectiveDepth * 0.45)
                : Math.max(0.28, 0.55 - (effectiveDepth - 1) * 0.2);
              const containerOpacity = isExiting ? 0 : 1;

              const transformValue = isExiting
                ? `translate3d(${tx}%, ${ty}px, 0) rotate(${rot}deg)`
                : isFront
                ? `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`
                : `translate3d(${tx}px, 0px, 0) scale(${cardScale.toFixed(4)})`;

              return (
                <div
                  key={entry.boardPinId}
                  role={isFront ? "button" : undefined}
                  tabIndex={isFront ? 0 : undefined}
                  aria-hidden={!isFront}
                  onClick={() => {
                    if (!isFront) return;
                    if (suppressClickRef.current) return;
                    onOpenTrip(board);
                  }}
                  onKeyDown={(e) => {
                    if (!isFront) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenTrip(board);
                    } else if (e.key === "ArrowRight") {
                      e.preventDefault();
                      cycleNext(-1);
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      cyclePrev();
                    }
                  }}
                  style={{
                    transform: transformValue,
                    opacity: containerOpacity,
                    zIndex: 30 - depth * 6,
                    transformOrigin: isFront ? "50% 60%" : "100% 50%",
                    transition:
                      isDragging && isFront
                        ? "none"
                        : isExiting
                        ? "transform 220ms var(--ease-ios-sheet), opacity 190ms ease"
                        : "transform 380ms var(--ease-out-expo), opacity 280ms ease",
                  }}
                  className={`${
                    isFront
                      ? "relative cgr-trip-stack-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] rounded-[20px]"
                      : "absolute inset-0 pointer-events-none"
                  } will-change-transform`}
                >
                  {/* Clean Borderless Modern Super-Rounded Square Photo Card (1:1, ZERO side notches) */}
                  <div
                    className={`relative aspect-square w-full rounded-[22px] sm:rounded-[24px] overflow-hidden text-left ${
                      isFront
                        ? "bg-[var(--color-background-muted)]"
                        : "bg-[var(--color-background-body)]"
                    }`}
                  >
                    <img
                      src={getOptimizedPinImageUrl(pin.coverImageUrl, "card")}
                      srcSet={getOptimizedPinImageSrcSet(
                        pin.coverImageUrl,
                        "card"
                      )}
                      sizes={PIN_IMAGE_SIZES.card}
                      alt={hotelName}
                      loading={priority && isFront ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                      style={{
                        opacity: imgFadeOpacity,
                        transition: "opacity 280ms ease",
                      }}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />

                    {/* Top-Left Floating White Medallion (Front Card Only) */}
                    {isFront && (
                      <div className="absolute top-0 left-0 z-10 pointer-events-none">
                        <PlaceCategoryCrest
                          category={pin.placeCategory}
                          language={language}
                          corner="top-left"
                        />
                      </div>
                    )}

                    {/* Top-Right Inset Count Pill (+ Hover Delete) */}
                    {isFront && (
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                        {onDeleteTrip && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTrip(board);
                            }}
                            aria-label={
                              isTh
                                ? `ลบทริป ${board.name}`
                                : `Delete ${board.name}`
                            }
                            title={isTh ? "ลบทริปนี้" : "Delete trip"}
                            className="h-7 w-7 rounded-[9px] bg-white/95 dark:bg-[#1f1f1f]/95 hover:bg-white dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f5f5f5] ring-1 ring-black/[0.06] dark:ring-white/[0.1] inline-flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/trip:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        )}
                        <span className="h-7 sm:h-8 px-2.5 rounded-[10px] bg-black/46 backdrop-blur-sm text-white text-[11px] font-semibold inline-flex items-center tabular-nums leading-none">
                          {stopNumber}/{totalCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================
          CLEAN TRIP META FOOTER (Click to Open View 2 Map & Fanned Deck)
      ==================================================================== */}
      <button
        type="button"
        onClick={() => onOpenTrip(board)}
        className="pt-1 px-0.5 text-left space-y-0.5 cursor-pointer group/meta focus:outline-none"
      >
        <div className="flex items-center justify-between gap-1.5">
          <h2 className="text-[14.5px] sm:text-[16px] font-semibold text-[var(--color-text-primary)] truncate group-hover/meta:underline underline-offset-2">
            {board.name}
          </h2>
          <ChevronRight
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-text-secondary)] shrink-0 opacity-70 group-hover/meta:opacity-100 transition-opacity"
            strokeWidth={2}
          />
        </div>

        <p className="text-[12px] sm:text-[13px] text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-1 sm:gap-x-1.5 gap-y-0.5">
          <span>
            {isTh
              ? `บันทึกแล้ว ${board.pinCount} แห่ง`
              : `${board.pinCount} saved`}
          </span>
          {promoAlertCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--color-text-primary)] font-medium">
                {isTh
                  ? `${promoAlertCount} โปรโมชั่น`
                  : `${promoAlertCount} deals`}
              </span>
            </>
          )}
          {totalRouteSummary && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>
                  {isTh ? `รวม ${totalRouteSummary}` : `${totalRouteSummary}`}
                </span>
              </span>
            </>
          )}
          {ownerDisplayName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {isTh ? `โดย ${ownerDisplayName}` : `by ${ownerDisplayName}`}
              </span>
            </>
          )}
        </p>
      </button>
    </div>
  );
});
