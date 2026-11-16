"use client";

import React from "react";
import { Check, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { ManagedGalleryCategory } from "@/data/cmsDefaults";
import { HotelNavTabId } from "@/components/navigation/NavigationIcons";

export type CmsEditorTarget =
  | { type: "home-hero" }
  | { type: "home-manifesto" }
  | { type: "home-villas-header" }
  | { type: "home-story"; storyId?: string }
  | { type: "home-living-header" }
  | { type: "home-quotes" }
  | { type: "home-invite" }
  | { type: "booking-hero" }
  | { type: "room"; roomId?: string }
  | { type: "gallery-video" }
  | { type: "gallery-photos"; category?: ManagedGalleryCategory }
  | { type: "shorts-header" }
  | { type: "short-video"; videoId?: string }
  | { type: "coupon"; couponId?: string }
  | { type: "deal-addons-header" }
  | { type: "addon"; addonId?: string }
  | { type: "deal-privilege"; privilegeId?: string }
  | { type: "seasonal-rates" }
  | { type: "review"; reviewId?: string }
  | { type: "guide-location" }
  | { type: "guide-faqs" };

export function EditSpotButton({
  label,
  icon = "edit",
  variant = "accent",
  onClick,
  className = "",
}: {
  label?: string;
  icon?: "edit" | "add";
  variant?: "accent" | "promo" | "dark";
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  const IconComp = icon === "add" ? Plus : Pencil;

  const toneClass =
    variant === "promo"
      ? "bg-[var(--color-promo)] text-[var(--color-on-promo)] hover:bg-[var(--color-promo-hover)]"
      : variant === "dark"
      ? "bg-black/75 hover:bg-black/90 text-white backdrop-blur-md"
      : "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]";

  if (!label) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick(event);
        }}
        title="แก้ไขส่วนนี้"
        aria-label="แก้ไขส่วนนี้"
        className={`h-9 w-9 rounded-full inline-flex items-center justify-center shadow-[var(--shadow-popover)] transition active:scale-95 cursor-pointer z-20 shrink-0 ${toneClass} ${className}`}
      >
        <IconComp className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 ty-caption font-semibold shadow-[var(--shadow-card)] transition active:scale-95 cursor-pointer z-20 shrink-0 ${toneClass} ${className}`}
    >
      <IconComp className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

const EDITABLE_PAGE_JUMPS: { id: HotelNavTabId; label: string }[] = [
  { id: "home", label: "หน้าแรก" },
  { id: "book", label: "หน้าจอง" },
  { id: "shorts", label: "Shorts" },
  { id: "deal", label: "คูปอง/ดีล" },
  { id: "guide", label: "แผนที่/FAQ" },
  { id: "review", label: "รีวิว" },
];

export function AdminFloatingEditBar({
  activeTab,
  isPreviewingAsGuest,
  onToggleGuestPreview,
  onNavigateTab,
  onExitEditMode,
}: {
  activeTab: HotelNavTabId;
  isPreviewingAsGuest: boolean;
  onToggleGuestPreview: () => void;
  onNavigateTab: (tab: HotelNavTabId) => void;
  onExitEditMode: () => void;
}) {
  return (
    <div className="fixed bottom-16 lg:bottom-5 inset-x-0 z-50 px-3 pointer-events-none flex justify-center">
      <div className="pointer-events-auto max-w-full rounded-full bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ty-caption font-bold shrink-0">
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">โหมดแก้ไขหน้าเว็บ</span>
        </span>

        <div className="hidden md:flex items-center gap-1">
          {EDITABLE_PAGE_JUMPS.map((jump) => {
            const isActive =
              activeTab === jump.id ||
              (jump.id === "book" && activeTab === "room");
            return (
              <button
                key={jump.id}
                type="button"
                onClick={() => onNavigateTab(jump.id)}
                className={`h-8 px-3 rounded-full ty-caption font-semibold transition cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {jump.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleGuestPreview}
          className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="สลับดูมุมมองลูกค้าจริง"
        >
          {isPreviewingAsGuest ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>โชว์ปุ่มแก้ไข</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>มุมมองลูกค้า</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onExitEditMode}
          className="h-8 px-3.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-on-accent)] ty-caption font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
          <span>เสร็จสิ้น</span>
        </button>
      </div>
    </div>
  );
}

