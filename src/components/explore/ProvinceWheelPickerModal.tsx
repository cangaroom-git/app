"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { ThailandRegionId } from "@/data/thailandProvinces";
import type {
  LocationCatalogDto,
  ProvinceConfigDto,
} from "@/lib/services/locationConfigService";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";

export type LocationScopeId = "tourist" | "all" | ThailandRegionId;

export interface ProvincePickerSelection {
  regionId: LocationScopeId;
  provinceId: string | null;
}

export interface ProvinceWheelPickerModalProps {
  isOpen: boolean;
  language: LanguageCode;
  catalog: LocationCatalogDto;
  selectedRegionId: LocationScopeId;
  selectedProvinceId: string | null;
  onClose: () => void;
  onConfirm: (selection: ProvincePickerSelection) => void;
}

interface WheelItem {
  id: string;
  label: string;
  count?: number;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 220px
/** iOS-style exponential deceleration coefficient (px/ms per px -> lower = longer glide on hard flick!) */
const IOS_DECEL_K = 0.0022;
const RUBBER_BAND_FACTOR = 0.32;

const WHEEL_MASK_STYLE: React.CSSProperties = {
  maskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.34) 16%, #000 36%, #000 64%, rgba(0,0,0,0.34) 84%, transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.34) 16%, #000 36%, #000 64%, rgba(0,0,0,0.34) 84%, transparent 100%)",
};

function clampNum(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function triggerSubtleHaptic() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(4);
    }
  } catch {
    // ignore unsupported environments
  }
}

interface WheelDrumProps {
  ariaLabel: string;
  items: WheelItem[];
  selectedId: string;
  align?: "left" | "center";
  onSelect: (id: string) => void;
}

/**
 * True iPhone UIPickerView Inertial Momentum Drum:
 * - Custom 120fps requestAnimationFrame exponential-decay physics (flick hard -> glides smoothly across 30-60+ items!)
 * - 1:1 Pointer drag + authentic iOS rubber-band overscroll + smooth non-passive trackpad/wheel inertia
 * - O(1) virtualized 3D cylindrical wheel rows (only renders rows within ±4 of center)
 */
function WheelDrum({
  ariaLabel,
  items,
  selectedId,
  align = "center",
  onSelect,
}: WheelDrumProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const activeIdx = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId)
  );

  const [renderOffset, setRenderOffset] = useState<number>(
    activeIdx * ITEM_HEIGHT
  );
  const offsetRef = useRef<number>(activeIdx * ITEM_HEIGHT);
  const lastHapticIdxRef = useRef<number>(activeIdx);
  const rafRef = useRef<number | null>(null);
  const wheelSettleTimerRef = useRef<number | null>(null);
  const wheelVelRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  // Active drag tracking
  const draggingRef = useRef<boolean>(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const dragMovedRef = useRef<boolean>(false);
  const samplesRef = useRef<Array<{ y: number; t: number }>>([]);
  const lastListSigRef = useRef<string>("");

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const setOffsetImmediate = useCallback((nextOffset: number) => {
    offsetRef.current = nextOffset;
    setRenderOffset(nextOffset);
    const maxIdx = Math.max(0, itemsRef.current.length - 1);
    const idx = clampNum(Math.round(nextOffset / ITEM_HEIGHT), 0, maxIdx);
    if (idx !== lastHapticIdxRef.current) {
      lastHapticIdxRef.current = idx;
      triggerSubtleHaptic();
    }
  }, []);

  const commitIndex = useCallback((idx: number) => {
    const list = itemsRef.current;
    const clamped = clampNum(idx, 0, Math.max(0, list.length - 1));
    const item = list[clamped];
    if (item) {
      onSelectRef.current(item.id);
    }
  }, []);

  /**
   * Velocity-matched iOS exponential ease-to-notch:
   * offset(t) = target - delta * e^(-t / tau)
   * Matches finger release velocity C¹ continuously and glides smoothly to dead-center with zero overshoot!
   */
  const animateToTarget = useCallback(
    (
      targetIdx: number,
      initialVelocityPxPerMs = 0,
      notifyOnComplete = true
    ) => {
      cancelAnimation();
      const maxIdx = Math.max(0, itemsRef.current.length - 1);
      const clampedIdx = clampNum(targetIdx, 0, maxIdx);
      const targetOffset = clampedIdx * ITEM_HEIGHT;
      const startOffset = offsetRef.current;
      const delta = targetOffset - startOffset;

      if (Math.abs(delta) < 0.5) {
        setOffsetImmediate(targetOffset);
        if (notifyOnComplete) commitIndex(clampedIdx);
        return;
      }

      const speed = Math.abs(initialVelocityPxPerMs);
      // Match initial derivative delta/tau ~= release speed so coast feels 100% physically continuous
      const tau =
        speed > 0.08
          ? clampNum(Math.abs(delta) / speed, 115, 440)
          : clampNum(120 + Math.abs(delta) * 0.25, 115, 220);

      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = Math.max(0, now - startTime);
        const factor = Math.exp(-elapsed / tau);
        const next = targetOffset - delta * factor;

        if (Math.abs(targetOffset - next) < 0.4 || elapsed > 2200) {
          rafRef.current = null;
          setOffsetImmediate(targetOffset);
          if (notifyOnComplete) commitIndex(clampedIdx);
          return;
        }

        setOffsetImmediate(next);
        rafRef.current = window.requestAnimationFrame(step);
      };

      rafRef.current = window.requestAnimationFrame(step);
    },
    [cancelAnimation, commitIndex, setOffsetImmediate]
  );

  // Sync silently when items list changes (e.g. left wheel switched region) or external selectedId changes
  useEffect(() => {
    const sig = items.map((i) => i.id).join("|");
    const targetOffset = activeIdx * ITEM_HEIGHT;
    const listChanged = lastListSigRef.current !== sig;
    lastListSigRef.current = sig;

    if (listChanged) {
      cancelAnimation();
      draggingRef.current = false;
      offsetRef.current = targetOffset;
      lastHapticIdxRef.current = activeIdx;
      setRenderOffset(targetOffset);
      return;
    }

    if (
      !draggingRef.current &&
      rafRef.current === null &&
      Math.abs(offsetRef.current - targetOffset) > 1
    ) {
      offsetRef.current = targetOffset;
      lastHapticIdxRef.current = activeIdx;
      setRenderOffset(targetOffset);
    }
  }, [activeIdx, cancelAnimation, items]);

  // Clean up rAF & wheel timers on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
      }
    };
  }, [cancelAnimation]);

  // Non-passive mouse wheel & two-finger trackpad inertia listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cancelAnimation();

      const now = performance.now();
      const rawDelta =
        e.deltaMode === 1
          ? e.deltaY * 28
          : e.deltaMode === 2
          ? e.deltaY * WHEEL_HEIGHT
          : e.deltaY;

      const dt = Math.max(8, Math.min(80, now - lastWheelTimeRef.current));
      lastWheelTimeRef.current = now;

      const maxOffset = Math.max(0, (itemsRef.current.length - 1) * ITEM_HEIGHT);
      const nextRaw = offsetRef.current + rawDelta * 0.72;
      const clamped = clampNum(nextRaw, -ITEM_HEIGHT * 0.65, maxOffset + ITEM_HEIGHT * 0.65);
      setOffsetImmediate(clamped);

      // Exponential moving average of wheel velocity for smooth trackpad momentum
      const instVel = (rawDelta * 0.72) / dt;
      wheelVelRef.current = wheelVelRef.current * 0.45 + instVel * 0.55;

      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
      }
      wheelSettleTimerRef.current = window.setTimeout(() => {
        wheelSettleTimerRef.current = null;
        const v = Math.abs(wheelVelRef.current) > 0.14 ? wheelVelRef.current * 0.55 : 0;
        wheelVelRef.current = 0;
        const maxIdx = Math.max(0, itemsRef.current.length - 1);
        const projected = offsetRef.current + v / IOS_DECEL_K;
        const targetIdx = clampNum(Math.round(projected / ITEM_HEIGHT), 0, maxIdx);
        animateToTarget(targetIdx, v, true);
      }, 95);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [animateToTarget, cancelAnimation, setOffsetImmediate]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      cancelAnimation();
      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
        wheelSettleTimerRef.current = null;
      }

      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      dragStartYRef.current = e.clientY;
      dragStartOffsetRef.current = offsetRef.current;
      dragMovedRef.current = false;
      samplesRef.current = [{ y: e.clientY, t: performance.now() }];

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore synthetic events
      }
    },
    [cancelAnimation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
      const dy = dragStartYRef.current - e.clientY;
      if (Math.abs(dy) > 4) {
        dragMovedRef.current = true;
      }

      const maxOffset = Math.max(0, (itemsRef.current.length - 1) * ITEM_HEIGHT);
      let next = dragStartOffsetRef.current + dy;
      // iOS rubber-band damping past top/bottom bounds
      if (next < 0) {
        next = next * RUBBER_BAND_FACTOR;
      } else if (next > maxOffset) {
        next = maxOffset + (next - maxOffset) * RUBBER_BAND_FACTOR;
      }
      setOffsetImmediate(next);

      const now = performance.now();
      const samples = samplesRef.current;
      samples.push({ y: e.clientY, t: now });
      // Keep only recent 110ms window for crisp flick velocity measurement
      while (samples.length > 2 && now - samples[0].t > 110) {
        samples.shift();
      }
    },
    [setOffsetImmediate]
  );

  const finishDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
      draggingRef.current = false;
      pointerIdRef.current = null;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }

      const maxIdx = Math.max(0, itemsRef.current.length - 1);

      // Tap without drag -> smoothly spin to clicked item based on tap Y inside drum
      if (!dragMovedRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const relY = e.clientY - rect.top - WHEEL_HEIGHT / 2;
          const rowDelta = Math.round(relY / ITEM_HEIGHT);
          const currentCenterIdx = Math.round(offsetRef.current / ITEM_HEIGHT);
          const tappedIdx = clampNum(currentCenterIdx + rowDelta, 0, maxIdx);
          animateToTarget(tappedIdx, 0, true);
          return;
        }
      }

      // Compute flick release velocity (px/ms; positive = scrolling down toward higher index)
      const now = performance.now();
      const samples = samplesRef.current;
      let velocity = 0;

      if (samples.length >= 2) {
        const newest = samples[samples.length - 1];
        // Ignore stale velocity if finger paused > 90ms before lifting
        if (now - newest.t < 90) {
          const oldest = samples[0];
          const dt = newest.t - oldest.t;
          if (dt > 6) {
            // Note: dragging finger UP (clientY decreases) increases offset -> positive velocity
            velocity = (oldest.y - newest.y) / dt;
          }
        }
      }

      // Clamp extreme spike velocities while still allowing full-list flicks across 77 provinces
      const clampedVel = clampNum(velocity, -6.5, 6.5);
      const effectiveVel = Math.abs(clampedVel) > 0.08 ? clampedVel : 0;

      // Project authentic iOS inertial glide distance
      const projectedOffset = offsetRef.current + effectiveVel / IOS_DECEL_K;
      const targetIdx = clampNum(
        Math.round(projectedOffset / ITEM_HEIGHT),
        0,
        maxIdx
      );

      animateToTarget(targetIdx, effectiveVel, true);
    },
    [animateToTarget]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIdx = Math.round(offsetRef.current / ITEM_HEIGHT);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        animateToTarget(currentIdx + 1, 0, true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        animateToTarget(currentIdx - 1, 0, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        animateToTarget(0, 0, true);
      } else if (e.key === "End") {
        e.preventDefault();
        animateToTarget(itemsRef.current.length - 1, 0, true);
      }
    },
    [animateToTarget]
  );

  // Virtualize visible window (±4 rows around current center) for locked 120fps even with 77 provinces
  const floatIdx = renderOffset / ITEM_HEIGHT;
  const centerIdx = clampNum(
    Math.round(floatIdx),
    0,
    Math.max(0, items.length - 1)
  );
  const startRenderIdx = Math.max(0, Math.floor(floatIdx) - 4);
  const endRenderIdx = Math.min(items.length - 1, Math.ceil(floatIdx) + 4);

  const visibleSlice: Array<{ item: WheelItem; idx: number }> = [];
  for (let i = startRenderIdx; i <= endRenderIdx; i++) {
    const it = items[i];
    if (it) visibleSlice.push({ item: it, idx: i });
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-activedescendant={items[centerIdx]?.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onKeyDown={handleKeyDown}
      style={{
        height: `${WHEEL_HEIGHT}px`,
        ...WHEEL_MASK_STYLE,
      }}
      className="relative overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing focus:outline-none"
    >
      {visibleSlice.map(({ item, idx }) => {
        const rel = idx - floatIdx;
        const absRel = Math.abs(rel);
        const y = rel * ITEM_HEIGHT;
        const rotateX = clampNum(rel * -18, -68, 68);
        const drumScale = Math.max(0.84, 1 - absRel * 0.055);
        const opacity = Math.max(0.14, 1 - absRel * 0.32);
        const isCentered = absRel < 0.48;

        return (
          <div
            key={item.id}
            id={item.id}
            role="option"
            aria-selected={idx === centerIdx}
            style={{
              height: `${ITEM_HEIGHT}px`,
              top: "50%",
              marginTop: `${-ITEM_HEIGHT / 2}px`,
              transform: `translate3d(0, ${y.toFixed(2)}px, 0) perspective(440px) rotateX(${rotateX.toFixed(1)}deg) scale(${drumScale.toFixed(3)})`,
              opacity: Number(opacity.toFixed(3)),
            }}
            className={`absolute inset-x-0 px-3 flex items-center gap-1.5 will-change-transform ${
              align === "left"
                ? "justify-between text-left"
                : "justify-center text-center"
            }`}
          >
            <span
              className={`truncate ${
                isCentered
                  ? "text-[15.5px] font-semibold text-[var(--color-text-primary)]"
                  : "text-[14px] font-medium text-[var(--color-text-secondary)]"
              }`}
            >
              {item.label}
            </span>
            {typeof item.count === "number" && item.count > 0 && (
              <span
                className={`text-[11.5px] tabular-nums shrink-0 ${
                  isCentered
                    ? "font-semibold text-[var(--color-text-secondary)]"
                    : "text-[var(--color-text-secondary)]/70"
                }`}
              >
                {item.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * iPhone Clock Alarm (`HH : MM`) style Dual-Column Region + Province Wheel Picker.
 * - Left drum: 1) เมืองท่องเที่ยว · 2) ทั่วประเทศ · 3) ภาคเหนือ · 4) ภาคกลาง · ... (Super-Admin sortable)
 * - Right drum: First row is always "ทุกจังหวัด", followed by provinces (Super-Admin order for เมืองท่องเที่ยว; alphabetical ก–ฮ / A–Z for ทั่วประเทศ & regions)
 * - Powered by true 120fps iOS inertial momentum physics + Airbnb Warm Minimal Slide-Up Bottom Sheet
 */
export function ProvinceWheelPickerModal({
  isOpen,
  language,
  catalog,
  selectedRegionId,
  selectedProvinceId,
  onClose,
  onConfirm,
}: ProvinceWheelPickerModalProps) {
  const isTh = language === "th";
  const presence = useModalPresence(isOpen, 250);
  useBodyScrollLock(presence.shouldRender);

  const provinceById = useMemo(
    () => new Map(catalog.provinces.map((p) => [p.id, p])),
    [catalog.provinces]
  );

  const resolveInitialScope = useCallback((): LocationScopeId => {
    if (selectedRegionId === "tourist") return "tourist";
    if (selectedProvinceId) {
      const p = provinceById.get(selectedProvinceId);
      if (p) return selectedRegionId === "all" ? "all" : p.regionId;
    }
    return selectedRegionId;
  }, [provinceById, selectedProvinceId, selectedRegionId]);

  const [draftRegionId, setDraftRegionId] =
    useState<LocationScopeId>(resolveInitialScope);
  const [draftProvinceId, setDraftProvinceId] = useState<string>(
    selectedProvinceId ?? "__all__"
  );

  // Re-sync draft state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (selectedRegionId === "tourist") {
      setDraftRegionId("tourist");
      setDraftProvinceId(selectedProvinceId ?? "__all__");
      return;
    }
    if (selectedProvinceId) {
      const p = provinceById.get(selectedProvinceId);
      if (p) {
        setDraftRegionId(selectedRegionId === "all" ? "all" : p.regionId);
        setDraftProvinceId(p.id);
        return;
      }
    }
    setDraftRegionId(selectedRegionId);
    setDraftProvinceId("__all__");
  }, [isOpen, provinceById, selectedProvinceId, selectedRegionId]);

  // Escape key close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Left Column: 1) เมืองท่องเที่ยว · 2) ทั่วประเทศ · 3) ภาคเหนือ · 4) ภาคกลาง · ...
  const regionItems = useMemo<WheelItem[]>(() => {
    const sortedRegions = [...catalog.regions].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    return [
      {
        id: "tourist",
        label: isTh ? "เมืองท่องเที่ยว" : "Top destinations",
      },
      {
        id: "all",
        label: isTh ? "ทั่วประเทศ" : "All Thailand",
      },
      ...sortedRegions.map((r) => ({
        id: r.id,
        label: isTh ? r.labelTh : r.labelEn,
      })),
    ];
  }, [catalog.regions, isTh]);

  // Right Column:
  // - Row 0 is ALWAYS "ทุกจังหวัด" ("All provinces")
  // - "เมืองท่องเที่ยว": tourist hubs sorted by Super-Admin nationalSortOrder
  // - "ทั่วประเทศ" & all regions: sorted strictly alphabetically (ก–ฮ / A–Z via Intl.Collator)
  const provinceItems = useMemo<WheelItem[]>(() => {
    const collator = new Intl.Collator(isTh ? "th" : "en", {
      sensitivity: "base",
    });

    let list: ProvinceConfigDto[];
    if (draftRegionId === "tourist") {
      const hubs = catalog.provinces.filter((p) => p.isTouristHub);
      const source = hubs.length > 0 ? hubs : catalog.provinces.slice(0, 20);
      list = [...source].sort(
        (a, b) => a.nationalSortOrder - b.nationalSortOrder
      );
    } else if (draftRegionId === "all") {
      list = [...catalog.provinces].sort((a, b) =>
        collator.compare(
          isTh ? a.shortNameTh : a.shortNameEn,
          isTh ? b.shortNameTh : b.shortNameEn
        )
      );
    } else {
      list = catalog.provinces
        .filter((p) => p.regionId === draftRegionId)
        .sort((a, b) =>
          collator.compare(
            isTh ? a.shortNameTh : a.shortNameEn,
            isTh ? b.shortNameTh : b.shortNameEn
          )
        );
    }

    const totalPlacesInScope = list.reduce((acc, p) => acc + p.placeCount, 0);

    return [
      {
        id: "__all__",
        label: isTh ? "ทุกจังหวัด" : "All provinces",
        count: totalPlacesInScope,
      },
      ...list.map((p) => ({
        id: p.id,
        label: isTh ? p.shortNameTh : p.shortNameEn,
        count: p.placeCount,
      })),
    ];
  }, [catalog.provinces, draftRegionId, isTh]);

  const handleRegionChange = useCallback((nextRegionRaw: string) => {
    const nextRegion = nextRegionRaw as LocationScopeId;
    setDraftRegionId(nextRegion);
    setDraftProvinceId("__all__");
  }, []);

  const handleProvinceChange = useCallback((nextProvinceRaw: string) => {
    setDraftProvinceId(nextProvinceRaw);
  }, []);

  const handleConfirm = useCallback(() => {
    const finalProvinceId =
      draftProvinceId === "__all__" ? null : draftProvinceId;

    onConfirm({
      regionId: draftRegionId,
      provinceId: finalProvinceId,
    });
    onClose();
  }, [draftProvinceId, draftRegionId, onClose, onConfirm]);

  const handleResetAll = useCallback(() => {
    onConfirm({ regionId: "all", provinceId: null });
    onClose();
  }, [onClose, onConfirm]);

  const selectedPreviewLabel = useMemo(() => {
    if (draftProvinceId !== "__all__") {
      const prov = provinceById.get(draftProvinceId);
      if (prov) {
        return isTh ? `ดู${prov.shortNameTh}` : `Explore ${prov.shortNameEn}`;
      }
    }
    if (draftRegionId === "tourist") {
      return isTh ? "ดูเมืองท่องเที่ยว" : "Explore top destinations";
    }
    if (draftRegionId !== "all") {
      const reg = catalog.regions.find((r) => r.id === draftRegionId);
      if (reg) {
        return isTh ? `ดู${reg.labelTh}` : `Explore ${reg.labelEn}`;
      }
    }
    return isTh ? "ดูทั่วประเทศ" : "Explore all Thailand";
  }, [catalog.regions, draftProvinceId, draftRegionId, isTh, provinceById]);

  if (!presence.shouldRender || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      data-state={presence.dataState}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isTh ? "เลือกภาคและจังหวัด" : "Select region and province"}
        data-state={presence.dataState}
        onClick={(e) => e.stopPropagation()}
        className="cgr-modal-surface-md w-full sm:max-w-[460px] rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] overflow-hidden flex flex-col"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* Clean Single-Hairline Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin
              className="w-4 h-4 text-[var(--color-text-primary)] shrink-0"
              strokeWidth={2.2}
            />
            <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] truncate">
              {isTh ? "เลือกจังหวัดที่ต้องการดู" : "Choose destination"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิดหน้าต่างเลือกจังหวัด" : "Close province picker"}
            className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column Labels */}
        <div className="grid grid-cols-12 px-5 pt-3.5 pb-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)]">
          <div className="col-span-5 text-center">
            {isTh ? "ภูมิภาค" : "Region"}
          </div>
          <div className="col-span-7 text-left pl-3">
            {draftRegionId === "tourist"
              ? isTh
                ? "จังหวัดยอดนิยม"
                : "Popular destinations"
              : isTh
              ? "จังหวัด (ก–ฮ)"
              : "Province (A–Z)"}
          </div>
        </div>

        {/* iPhone HH:MM Dual-Column Inertial Physics Drum Wheel */}
        <div className="relative px-4 pb-3">
          {/* Shared Center Selection Highlight Band */}
          <div
            aria-hidden="true"
            style={{ height: `${ITEM_HEIGHT}px` }}
            className="pointer-events-none absolute inset-x-4 top-[88px] rounded-[12px] bg-[var(--color-background-muted)]"
          />

          <div className="relative z-10 grid grid-cols-12 items-center">
            {/* Left Wheel: Tourist -> All -> Regions */}
            <div className="col-span-5 pr-1">
              <WheelDrum
                ariaLabel={isTh ? "เลือกหมวดหมู่หรือภาค" : "Select region"}
                items={regionItems}
                selectedId={draftRegionId}
                align="center"
                onSelect={handleRegionChange}
              />
            </div>

            {/* Subtle Vertical Hairline Divider */}
            <div className="col-span-7 border-l border-[var(--color-border)] pl-1">
              <WheelDrum
                ariaLabel={isTh ? "เลือกจังหวัด" : "Select province"}
                items={provinceItems}
                selectedId={draftProvinceId}
                align="left"
                onSelect={handleProvinceChange}
              />
            </div>
          </div>
        </div>

        {/* Footer: Underline Reset + Solid #222222 Confirm CTA */}
        <div className="shrink-0 px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 cursor-pointer transition-opacity"
          >
            {isTh ? "ดูทั่วประเทศ" : "All Thailand"}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors"
          >
            {selectedPreviewLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
