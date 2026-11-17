"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface MasonryItemWithRatio {
  id: string;
  aspectClass: string;
}

export function estimateHeightRatio(aspectClass: string): number {
  if (aspectClass.includes("16/9")) return 9 / 16; // 0.5625 (landscape)
  if (aspectClass.includes("4/3")) return 3 / 4; // 0.75
  if (aspectClass.includes("1/1")) return 1.0; // square
  if (aspectClass.includes("5/6")) return 6 / 5; // 1.2
  if (aspectClass.includes("4/5")) return 5 / 4; // 1.25
  if (aspectClass.includes("3/4")) return 4 / 3; // 1.333
  if (aspectClass.includes("2/3")) return 3 / 2; // 1.5
  if (aspectClass.includes("3/5")) return 5 / 3; // 1.667
  if (aspectClass.includes("9/16")) return 16 / 9; // 1.778 (tall vertical)
  return 1.25;
}

export interface MasonryGridProps<T extends MasonryItemWithRatio> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  /** Target column width in pixels (default 236px) */
  columnWidth?: number;
  /** Horizontal and vertical gutter spacing in pixels (default 16px) */
  gutter?: number;
  /** Stretch columns edge-to-edge (offsetX = 0) so bounded containers have zero side whitespace */
  fitContainer?: boolean;
  /** Optional upper limit on columns */
  maxColumns?: number;
  /** Kept optional for backwards compatibility */
  columnBreakpoints?: [number, number, number, number, number];
  /** Optional callback notifying parent of calculated masonry height in px */
  onCalculatedHeight?: (heightPx: number) => void;
  /** Optional ID of currently expanded pin — opens an in-place full-width stage at that row without jumping to top */
  expandedItemId?: string | null;
  /** Renders the full-width stage band in-place when expandedItemId is active */
  renderExpandedStage?: () => React.ReactNode;
  gapClass?: string;
}

interface MeasuredBox {
  width: number;
  height: number;
}

interface PositionedItem<T> {
  item: T;
  x: number;
  y: number;
  width: number;
}

export function MasonryGrid<T extends MasonryItemWithRatio>({
  items,
  renderItem,
  columnWidth = 236,
  gutter = 16,
  fitContainer = true,
  maxColumns,
  onCalculatedHeight,
  expandedItemId = null,
  renderExpandedStage,
}: MasonryGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageNodeRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [measuredSizes, setMeasuredSizes] = useState<
    Record<string, MeasuredBox>
  >({});
  const [stageHeight, setStageHeight] = useState<number>(720);
  const [isResizingViewport, setIsResizingViewport] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);

  const itemObserverRef = useRef<ResizeObserver | null>(null);
  const nodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const refCallbacksRef = useRef<
    Map<string, (el: HTMLDivElement | null) => void>
  >(new Map());
  const resizeTimerRef = useRef<number | null>(null);
  const resizeAnimEndTimerRef = useRef<number | null>(null);
  const hasInitialWidthRef = useRef<boolean>(false);
  const prevExpandedIdRef = useRef<string | null>(expandedItemId);
  const isFirstMountRef = useRef<boolean>(true);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Measure available container width cleanly via ResizeObserver
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const initialW = el.clientWidth;
    if (initialW > 0) {
      hasInitialWidthRef.current = true;
      setContainerWidth(initialW);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextW = Math.round(entry.contentRect.width);
      if (nextW <= 0) return;

      if (!hasInitialWidthRef.current) {
        hasInitialWidthRef.current = true;
        setContainerWidth(nextW);
        return;
      }

      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null;
        setContainerWidth((prev) => {
          if (Math.abs(prev - nextW) > 1) {
            setIsResizingViewport(true);
            if (resizeAnimEndTimerRef.current !== null) {
              window.clearTimeout(resizeAnimEndTimerRef.current);
            }
            resizeAnimEndTimerRef.current = window.setTimeout(() => {
              resizeAnimEndTimerRef.current = null;
              setIsResizingViewport(false);
            }, 280);
            return nextW;
          }
          return prev;
        });
      }, 120);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      if (resizeAnimEndTimerRef.current !== null) {
        window.clearTimeout(resizeAnimEndTimerRef.current);
        resizeAnimEndTimerRef.current = null;
      }
    };
  }, []);

  // Measure dynamic height of the expanded stage whenever mounted/resized
  useIsomorphicLayoutEffect(() => {
    if (!expandedItemId || !renderExpandedStage) return;
    const node = stageNodeRef.current;
    if (!node) return;

    const initialH = Math.round(node.getBoundingClientRect().height);
    if (initialH > 0) {
      setStageHeight((prev) =>
        Math.abs(prev - initialH) > 2 ? initialH : prev
      );
    }

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const h = Math.round(entry.contentRect.height);
      if (h > 0) {
        setStageHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
      }
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [expandedItemId, renderExpandedStage]);

  // Shared ResizeObserver to measure real rendered card heights without polling
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setMeasuredSizes((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const id = target.dataset.masonryItemId;
          if (!id) continue;
          const h = Math.round(entry.contentRect.height);
          const w = Math.round(entry.contentRect.width);
          const existing = prev[id];
          if (
            h > 0 &&
            (!existing ||
              Math.abs(existing.height - h) > 1 ||
              Math.abs(existing.width - w) > 2)
          ) {
            next[id] = { width: w, height: h };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });

    itemObserverRef.current = observer;
    for (const node of nodeMapRef.current.values()) {
      observer.observe(node);
    }

    return () => {
      observer.disconnect();
      itemObserverRef.current = null;
    };
  }, []);

  const getItemRef = useCallback((id: string) => {
    const existingCb = refCallbacksRef.current.get(id);
    if (existingCb) return existingCb;

    const cb = (el: HTMLDivElement | null) => {
      const prevEl = nodeMapRef.current.get(id);
      if (prevEl && prevEl !== el) {
        itemObserverRef.current?.unobserve(prevEl);
        nodeMapRef.current.delete(id);
      }
      if (el) {
        nodeMapRef.current.set(id, el);
        itemObserverRef.current?.observe(el);
      }
    };
    refCallbacksRef.current.set(id, cb);
    return cb;
  }, []);

  const hasExpandedStage = Boolean(expandedItemId && renderExpandedStage);

  const layout = useMemo<{
    positions: PositionedItem<T>[];
    totalHeight: number;
    stageY: number | null;
  }>(() => {
    if (containerWidth <= 0) {
      return {
        positions: [],
        totalHeight: 0,
        stageY: hasExpandedStage ? 0 : null,
      };
    }

    const isMobile = containerWidth < 640;
    const isTablet = containerWidth >= 640 && containerWidth < 1024;
    const activeGutter = isMobile ? 6 : isTablet ? Math.min(gutter, 10) : gutter;

    let cols: number;
    let activeColWidth: number;
    let offsetX: number;

    if (isMobile) {
      cols = 2;
      activeColWidth = Math.max(120, (containerWidth - activeGutter) / 2);
      offsetX = 0;
    } else {
      const rawCols = Math.max(
        1,
        Math.floor(
          (containerWidth + activeGutter) / (columnWidth + activeGutter)
        )
      );
      cols = maxColumns ? Math.min(maxColumns, rawCols) : rawCols;

      if (fitContainer && cols > 1) {
        activeColWidth = (containerWidth - (cols - 1) * activeGutter) / cols;
        offsetX = 0;
      } else if (fitContainer && cols === 1) {
        activeColWidth = containerWidth;
        offsetX = 0;
      } else {
        activeColWidth =
          cols === 1 && containerWidth < columnWidth
            ? containerWidth
            : columnWidth;
        const gridTotalW = cols * activeColWidth + (cols - 1) * activeGutter;
        offsetX = Math.max(0, Math.floor((containerWidth - gridTotalW) / 2));
      }
    }

    const colHeights = new Array<number>(cols).fill(0);
    const positions: PositionedItem<T>[] = [];
    let stageY: number | null = null;

    const expandedIdx = hasExpandedStage
      ? items.findIndex((it) => it.id === expandedItemId)
      : -1;

    // If expanded pin is not in `items` (e.g. direct deep link), place stage at y=0
    if (hasExpandedStage && expandedIdx === -1) {
      stageY = 0;
      colHeights.fill(stageHeight + activeGutter);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (hasExpandedStage && i === expandedIdx) {
        stageY = i === 0 ? 0 : Math.max(...colHeights);
        colHeights.fill(stageY + stageHeight + activeGutter);
        continue;
      }

      let shortestCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[shortestCol]) {
          shortestCol = c;
        }
      }

      const x = offsetX + shortestCol * (activeColWidth + activeGutter);
      const y = colHeights[shortestCol];

      const measured = measuredSizes[item.id];
      const estimatedCardHeight = Math.round(
        activeColWidth * estimateHeightRatio(item.aspectClass) + 56
      );
      const itemHeight =
        measured && Math.abs(measured.width - activeColWidth) <= 3
          ? measured.height
          : estimatedCardHeight;

      positions.push({
        item,
        x,
        y,
        width: activeColWidth,
      });

      colHeights[shortestCol] = y + itemHeight + activeGutter;
    }

    const rawMaxH = Math.max(0, ...colHeights);
    const totalHeight = Math.max(
      0,
      rawMaxH > 0 ? rawMaxH - activeGutter : 0
    );

    return { positions, totalHeight, stageY };
  }, [
    containerWidth,
    items,
    columnWidth,
    gutter,
    fitContainer,
    maxColumns,
    measuredSizes,
    hasExpandedStage,
    expandedItemId,
    stageHeight,
  ]);

  // Anchor viewport right on the newly clicked stage in-place (NEVER jump back to top: 0!)
  useIsomorphicLayoutEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevExpandedIdRef.current = expandedItemId;
      return;
    }

    const prevId = prevExpandedIdRef.current;
    prevExpandedIdRef.current = expandedItemId;

    if (
      !expandedItemId ||
      expandedItemId === prevId ||
      layout.stageY === null ||
      containerWidth <= 0 ||
      typeof window === "undefined"
    ) {
      return;
    }

    const containerEl = containerRef.current;
    if (!containerEl) return;

    const containerDocTop =
      containerEl.getBoundingClientRect().top + window.scrollY;
    const stageDocTop = containerDocTop + layout.stageY;
    const desiredScrollTop = Math.max(0, stageDocTop - 80);

    // Instant scroll compensation if previous stage closed above us, or gentle local align
    if (prevId !== null) {
      window.scrollTo({ top: desiredScrollTop, behavior: "instant" });
    } else {
      const stageViewportTop = stageDocTop - window.scrollY;
      if (stageViewportTop < 68 || stageViewportTop > window.innerHeight * 0.45) {
        window.scrollTo({ top: desiredScrollTop, behavior: "smooth" });
      }
    }
  }, [expandedItemId, layout.stageY, containerWidth]);

  useEffect(() => {
    if (onCalculatedHeight && containerWidth > 0) {
      onCalculatedHeight(layout.totalHeight);
    }
  }, [layout.totalHeight, containerWidth, onCalculatedHeight]);

  const shouldAnimate = isResizingViewport && !prefersReducedMotion;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0"
      style={{
        height:
          containerWidth > 0 && layout.totalHeight > 0
            ? `${layout.totalHeight}px`
            : undefined,
      }}
    >
      {containerWidth <= 0 ? (
        <div className="space-y-5">
          {hasExpandedStage && renderExpandedStage && (
            <div>{renderExpandedStage()}</div>
          )}
          <div
            className="grid gap-1.5 sm:gap-2.5 lg:gap-4 justify-center"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(150px, ${columnWidth}px))`,
            }}
          >
            {items
              .filter((it) => it.id !== expandedItemId)
              .map((item) => (
                <div key={item.id}>{renderItem(item)}</div>
              ))}
          </div>
        </div>
      ) : (
        <>
          {hasExpandedStage &&
            renderExpandedStage &&
            layout.stageY !== null && (
              <div
                ref={stageNodeRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translate3d(0px, ${layout.stageY}px, 0)`,
                  zIndex: 20,
                }}
              >
                {renderExpandedStage()}
              </div>
            )}

          {layout.positions.map((pos) => (
            <div
              key={pos.item.id}
              ref={getItemRef(pos.item.id)}
              data-masonry-item-id={pos.item.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${pos.width}px`,
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                transition: shouldAnimate
                  ? "transform 240ms cubic-bezier(0.2, 0, 0, 1)"
                  : "none",
                willChange: "transform",
              }}
            >
              {renderItem(pos.item)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
