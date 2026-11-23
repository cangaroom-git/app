"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Globe, Link2, Lock, Share2, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";

interface ShareTripModalProps {
  isOpen: boolean;
  tripName: string;
  shareSlug: string;
  pinCount: number;
  isOwner: boolean;
  isPublic: boolean;
  isUpdatingVisibility?: boolean;
  language: LanguageCode;
  onTogglePublic?: (nextPublic: boolean) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Airbnb Warm Minimal Share Trip Dialog:
 * - Mobile (< sm): Slide-up Bottom Sheet with drag handle & safe-area bottom padding
 * - Desktop (>= sm): Crisp centered modal with `--shadow-popover`
 * - Smooth fade slide-in & fade slide-out via `useModalPresence` + `createPortal`
 */
export function ShareTripModal({
  isOpen,
  tripName,
  shareSlug,
  pinCount,
  isOwner,
  isPublic,
  isUpdatingVisibility = false,
  language,
  onTogglePublic,
  onClose,
}: ShareTripModalProps) {
  const isTh = language === "th";
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { shouldRender, dataState } = useModalPresence(isOpen, 250);
  useBodyScrollLock(shouldRender);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!mounted || !shouldRender) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://nondii.com";
  const shareUrl = `${origin}/trip/${encodeURIComponent(shareSlug)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback selection
      try {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        // ignore
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: isTh ? `ทริป ${tripName} — Nondii` : `${tripName} trip — Nondii`,
          text: isTh
            ? `ดูแผนที่และโปรที่พักในทริป "${tripName}" (${pinCount} แห่ง) บน Nondii`
            : `Explore my "${tripName}" stay trip (${pinCount} stays) on Nondii`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unavailable -> fallback to copy
      }
    }
    await handleCopy();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "แชร์ทริปนี้" : "Share this trip"}
      data-state={dataState}
      onClick={onClose}
      className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="cgr-modal-surface-md w-full sm:max-w-[460px] rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-[var(--color-border)] shadow-[var(--shadow-popover)] overflow-hidden pb-[max(20px,env(safe-area-inset-bottom))] sm:pb-6"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)] truncate">
              {isTh ? `แชร์ทริป "${tripName}"` : `Share "${tripName}"`}
            </h2>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">
              {isTh
                ? "ส่งลิงก์ให้เพื่อนดูแผนที่ กด Play และดูโปรที่พักได้โดยไม่ต้องเข้าสู่ระบบ"
                : "Anyone with the link can explore the map, press Play, and view stay deals without logging in."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 pt-4 space-y-4">
          {/* Owner Privacy Toggle */}
          {isOwner && onTogglePublic && (
            <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 mt-0.5">
                  {isPublic ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {isPublic
                      ? isTh
                        ? "เปิดแชร์ผ่านลิงก์ (สาธารณะ)"
                        : "Public via link"
                      : isTh
                      ? "ส่วนตัว (เห็นได้เฉพาะคุณ)"
                      : "Private (only you)"}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] leading-snug mt-0.5">
                    {isPublic
                      ? isTh
                        ? "ผู้ที่มีลิงก์นี้ดูและคัดลอกทริปได้ แต่แก้ไขทริปของคุณไม่ได้"
                        : "Viewers can watch & clone your trip, never edit it."
                      : isTh
                      ? "ปิดการเข้าถึงจากภายนอกชั่วคราว ลิงก์เดิมจะดูไม่ได้จนกว่าจะเปิดใหม่"
                      : "External viewers cannot open this link while private."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isUpdatingVisibility}
                onClick={() => void onTogglePublic(!isPublic)}
                className={`h-9 px-3 rounded-[10px] text-[12.5px] font-semibold shrink-0 cursor-pointer disabled:opacity-50 transition-colors ${
                  isPublic
                    ? "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    : "bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222]"
                }`}
              >
                {isPublic
                  ? isTh
                    ? "ตั้งเป็นส่วนตัว"
                    : "Make private"
                  : isTh
                  ? "เปิดแชร์"
                  : "Enable share"}
              </button>
            </div>
          )}

          {/* Share URL Field (Airbnb Inset-Label White Field Standard!) */}
          <div className="rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 py-2.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)] leading-tight flex items-center gap-1">
                <Link2 className="w-3 h-3 shrink-0" />
                <span>{isTh ? "ลิงก์สำหรับแชร์ทริป" : "Shareable trip URL"}</span>
              </p>
              <p className="text-[13.5px] font-medium text-[var(--color-text-primary)] truncate mt-0.5 select-all">
                {shareUrl}
              </p>
            </div>
            <button
              type="button"
              disabled={!isPublic && isOwner}
              onClick={() => void handleCopy()}
              className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] disabled:opacity-40 text-[12.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                  <span>{isTh ? "คัดลอกแล้ว" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isTh ? "คัดลอก" : "Copy"}</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Share Action */}
          <button
            type="button"
            disabled={!isPublic && isOwner}
            onClick={() => void handleNativeShare()}
            className="w-full h-11 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] disabled:opacity-40 text-[14px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>
              {copied
                ? isTh
                  ? "คัดลอกลิงก์ทริปเรียบร้อย"
                  : "Trip link copied"
                : isTh
                ? "แชร์ลิงก์ให้เพื่อน"
                : "Share trip link"}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
