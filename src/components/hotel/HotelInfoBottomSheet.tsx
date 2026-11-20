"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";

export function HotelInfoBottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-state={dataState}
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/48 flex items-end md:items-center justify-center cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[680px] max-h-[88dvh] rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden cgr-modal-surface-md"
      >
        {/* Mobile bottom sheet drag handle */}
        <div
          aria-hidden="true"
          className="md:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Sticky Header */}
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

