"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface AdminSlideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  thumbnailUrl?: string | null;
  width?: string;
  heightClass?: string;
  headerAction?: React.ReactNode;
  footerAction?: React.ReactNode;
  children: React.ReactNode;
  disableClose?: boolean;
}

/**
 * Nondii Unified Modal Sheet (Exact `MobileDateRangeSheet` / `StudioSheetModal` Pattern)
 * - Mobile (`< md`): Slides smoothly UP from bottom (`rounded-t-[24px]`, top drag handle, safe-area sticky footer)
 * - Desktop (`>= md`): Centered rounded floating modal (`md:rounded-[20px]`, smooth fade + vertical rise via `.cgr-modal-surface-md`)
 * - Consistent width across all `/admin/*` and `/studio/*` modals (`md:max-w-[720px]` default)
 */
export function AdminSlideSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  thumbnailUrl,
  width,
  heightClass = "max-h-[92dvh] md:max-h-[86dvh]",
  headerAction,
  footerAction,
  children,
  disableClose = false,
}: AdminSlideSheetProps) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || disableClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, disableClose, onClose]);

  if (!shouldRender || !mounted || typeof document === "undefined") return null;

  // Normalize legacy drawer width tokens (`max-w-4xl`) into the unified centered Nondii modal width
  const resolvedWidth =
    !width || width === "max-w-4xl" ? "md:max-w-[720px]" : width;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-state={dataState}
      onClick={(e) => {
        e.stopPropagation();
        if (!disableClose) onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] bg-black/48 flex items-end md:items-center justify-center md:p-4 cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${resolvedWidth} ${heightClass} rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden cgr-modal-surface-md`}
      >
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Clean Nondii Header (Title + Subtitle left · optional status + soft X button right) */}
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--color-background-popover)]">
          <div className="flex items-center gap-3 min-w-0">
            {thumbnailUrl !== undefined && (
              <div className="w-10 h-10 rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] border border-[var(--color-border)] shrink-0 flex items-center justify-center">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    No Img
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="ws-title truncate">{title}</h2>
              {subtitle && (
                <div className="ws-caption mt-0.5 truncate">{subtitle}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={disableClose ? undefined : onClose}
              disabled={disableClose}
              aria-label="ปิดหน้าต่าง"
              className={`h-9 w-9 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors shrink-0 ${
                disableClose
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[var(--color-background-subtle)] cursor-pointer"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[var(--color-background-popover)]">
          {children}
        </div>

        {/* Sticky Bottom Footer (Safe-Area Aware) */}
        {footerAction && (
          <div className="shrink-0 px-5 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-[var(--color-background-popover)]">
            {footerAction}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
