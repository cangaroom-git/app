"use client";

import React, { useEffect, useMemo, useState } from "react";

export interface MasonryItemWithRatio {
  id: string;
  aspectClass: string;
}

function estimateHeightRatio(aspectClass: string): number {
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
  /** Responsive column counts: [mobile (<640), sm (>=640), md (>=768), xl (>=1280), 2xl (>=1536)] */
  columnBreakpoints?: [number, number, number, number, number];
  gapClass?: string;
}

export function MasonryGrid<T extends MasonryItemWithRatio>({
  items,
  renderItem,
  columnBreakpoints = [2, 2, 3, 4, 4],
  gapClass = "gap-4",
}: MasonryGridProps<T>) {
  const [colCount, setColCount] = useState<number>(columnBreakpoints[2]);

  useEffect(() => {
    const syncColumns = () => {
      const w = window.innerWidth;
      if (w >= 1536) setColCount(columnBreakpoints[4]);
      else if (w >= 1280) setColCount(columnBreakpoints[3]);
      else if (w >= 768) setColCount(columnBreakpoints[2]);
      else if (w >= 640) setColCount(columnBreakpoints[1]);
      else setColCount(columnBreakpoints[0]);
    };
    syncColumns();
    window.addEventListener("resize", syncColumns);
    return () => window.removeEventListener("resize", syncColumns);
  }, [columnBreakpoints]);

  const columns = useMemo(() => {
    const safeCols = Math.max(1, colCount);
    const buckets: T[][] = Array.from({ length: safeCols }, () => []);
    const heights = new Array<number>(safeCols).fill(0);

    for (const item of items) {
      let shortestIdx = 0;
      for (let c = 1; c < safeCols; c++) {
        if (heights[c] < heights[shortestIdx]) {
          shortestIdx = c;
        }
      }
      buckets[shortestIdx].push(item);
      heights[shortestIdx] += estimateHeightRatio(item.aspectClass) + 0.18;
    }

    return buckets;
  }, [colCount, items]);

  return (
    <div className={`flex items-start w-full min-w-0 ${gapClass}`}>
      {columns.map((colItems, colIdx) => (
        <div
          key={`masonry-col-${colIdx}`}
          className="flex-1 min-w-0 flex flex-col gap-4"
        >
          {colItems.map((item) => (
            <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

