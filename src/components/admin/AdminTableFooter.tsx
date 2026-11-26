"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminTableFooterProps {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  pageSizeOptions?: number[];
}

export function AdminTableFooter({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [50, 100, 200],
}: AdminTableFooterProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="h-[40px] shrink-0 border-t border-[var(--color-border)] bg-[var(--color-background-body)] px-4 flex items-center justify-between gap-3 text-[12px] text-[var(--color-text-secondary)]">
      <div className="tabular-nums truncate">
        แสดง{" "}
        <strong className="font-semibold text-[var(--color-text-primary)]">
          {startIdx.toLocaleString()}–{endIdx.toLocaleString()}
        </strong>{" "}
        จาก{" "}
        <strong className="font-semibold text-[var(--color-text-primary)]">
          {totalItems.toLocaleString()}
        </strong>{" "}
        รายการ
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Compact Page Size Pills */}
        <div className="hidden sm:flex items-center gap-1">
          <span>แถว/หน้า:</span>
          {pageSizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onPageSizeChange(size);
                onPageChange(1);
              }}
              className={`h-6 px-2 rounded-full text-[11.5px] font-semibold tabular-nums cursor-pointer transition-colors ${
                pageSize === size
                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                  : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums">
            หน้า {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="หน้าก่อนหน้า"
            className="h-6 w-6 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="หน้าถัดไป"
            className="h-6 w-6 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
