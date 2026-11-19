"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface StudioSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  heightClass?: string;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function StudioSheetModal({
  isOpen,
  onClose,
  onBack,
  backLabel = "ย้อนกลับ",
  title,
  subtitle,
  maxWidthClass = "md:max-w-[600px]",
  heightClass = "max-h-[92dvh] md:max-h-[86dvh]",
  bodyRef,
  footer,
  children,
}: StudioSheetModalProps) {
  useBodyScrollLock(isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] bg-black/50 flex items-end md:items-center justify-center animate-fade-in-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClass} ${heightClass} rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet`}
      >
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Sticky Header */}
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 overscroll-contain"
        >
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="shrink-0 px-5 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-[var(--color-background-popover)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
