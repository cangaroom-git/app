"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Code2, Copy, Mail, MoreHorizontal, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface ShareStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  shareUrl: string;
  title: string;
  subtitle?: string;
  shareText?: string;
  imageUrl?: string | null;
  onCopied?: () => void;
}

/* ============================================================================
   CRISP MONOCHROME BRAND ICONS (Airbnb Warm Minimal Share Sheet Standard)
============================================================================ */
function LineBrandIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5C6.48 2.5 2 6.08 2 10.5c0 3.96 3.52 7.28 8.27 7.91.32.07.76.21.87.49.1.25.07.64.03.89l-.14.84c-.04.25-.2.98.86.53 1.06-.44 5.71-3.36 7.79-5.76C21.15 13.78 22 12.22 22 10.5c0-4.42-4.48-8-10-8Zm-4.63 10.3H5.56a.56.56 0 0 1-.56-.56V8.62a.56.56 0 0 1 1.12 0v3.06h1.25a.56.56 0 1 1 0 1.12Zm1.74-.56a.56.56 0 0 1-1.12 0V8.62a.56.56 0 0 1 1.12 0v3.62Zm4.27 0a.56.56 0 0 1-.39.53.54.54 0 0 1-.17.03.56.56 0 0 1-.45-.23l-1.84-2.51v2.18a.56.56 0 0 1-1.12 0V8.62a.56.56 0 0 1 .39-.53.56.56 0 0 1 .62.2l1.84 2.51V8.62a.56.56 0 0 1 1.12 0v3.62Zm3.65-2.37a.56.56 0 1 1 0 1.12h-1.25v.69h1.25a.56.56 0 1 1 0 1.12h-1.81a.56.56 0 0 1-.56-.56V8.62a.56.56 0 0 1 .56-.56h1.81a.56.56 0 1 1 0 1.12h-1.25v.69h1.25Z" />
    </svg>
  );
}

function MessagesBrandIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 3.75c-3.18 0-5.75 2.13-5.75 4.75 0 1.49.84 2.82 2.15 3.69-.13.68-.5 1.4-.95 1.88a.28.28 0 0 0 .22.47c1.04-.06 2.04-.41 2.74-.86.51.11 1.04.17 1.59.17 3.18 0 5.75-2.13 5.75-4.75S15.18 6.75 12 6.75Z" />
    </svg>
  );
}

function WhatsAppBrandIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 20.5l1.35-4.2A8.5 8.5 0 1 1 12 20.5a8.45 8.45 0 0 1-4.1-.95L3 20.5Z" />
      <path d="M9.4 8.9c.2-.4.45-.4.65-.4h.5c.15 0 .35.05.5.4l.6 1.45c.1.25.05.45-.1.6l-.45.5c-.1.15-.15.3-.05.45.35.6.95 1.25 1.65 1.65.15.1.3.05.45-.05l.5-.45c.15-.15.35-.2.6-.1l1.45.6c.35.15.4.35.4.5v.5c0 .2 0 .45-.4.65-.45.25-1.3.45-2.15.2-1.45-.4-3.1-1.55-4.15-3.15-.8-1.2-.95-2.25-.45-3.3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MessengerBrandIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5C6.75 2.5 2.5 6.44 2.5 11.3c0 2.77 1.38 5.24 3.54 6.85v3.35l3.24-1.78c.86.24 1.78.37 2.72.37 5.25 0 9.5-3.94 9.5-8.8 0-4.86-4.25-8.8-9.5-8.8Zm.95 11.84-2.42-2.58-4.72 2.58 5.19-5.51 2.48 2.58 4.66-2.58-5.19 5.51Z" />
    </svg>
  );
}

function FacebookBrandIcon({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.25C6.615 2.25 2.25 6.615 2.25 12c0 4.87 3.568 8.905 8.234 9.635v-6.816H8.006V12h2.478V9.852c0-2.446 1.457-3.797 3.686-3.797 1.068 0 2.185.19 2.185.19v2.402h-1.23c-1.213 0-1.591.753-1.591 1.525V12h2.707l-.433 2.819h-2.274v6.816C18.182 20.905 21.75 16.87 21.75 12c0-5.385-4.365-9.75-9.75-9.75Z" />
    </svg>
  );
}

function XBrandIcon({ className = "w-[20px] h-[20px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function ShareStayModal({
  isOpen,
  onClose,
  language,
  shareUrl,
  title,
  subtitle,
  shareText,
  imageUrl,
  onCopied,
}: ShareStayModalProps) {
  const isTh = language === "th";
  const [copiedMode, setCopiedMode] = useState<"link" | "embed" | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setCopiedMode(null);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const resolvedText = shareText || `${title}${subtitle ? ` · ${subtitle}` : ""}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(resolvedText);
  const encodedTitle = encodeURIComponent(title);

  const copyToClipboard = async (text: string, mode: "link" | "embed") => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore clipboard errors
    }
    setCopiedMode(mode);
    if (mode === "link") onCopied?.();
    window.setTimeout(() => {
      setCopiedMode((curr) => (curr === mode ? null : curr));
    }, 2000);
  };

  const openPopupWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleMoreOptions = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: resolvedText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled native share sheet — do not fall back to copy
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      }
    }
    await copyToClipboard(shareUrl, "link");
  };

  const handleEmbed = () => {
    const safeUrl = shareUrl.replace(/"/g, "&quot;");
    const safeTitle = title.replace(/"/g, "&quot;");
    const snippet = `<iframe src="${safeUrl}" title="${safeTitle}" width="100%" height="560" style="border:0;border-radius:16px;" loading="lazy"></iframe>`;
    void copyToClipboard(snippet, "embed");
  };

  const handleMessenger = () => {
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb-messenger://share/?link=${encodedUrl}`;
      return;
    }
    openPopupWindow(
      `https://www.facebook.com/dialog/send?link=${encodedUrl}&redirect_uri=${encodedUrl}`
    );
  };

  const buttonClass =
    "h-[52px] px-4 rounded-[12px] border border-[var(--color-border)] hover:bg-[var(--color-background-muted)] bg-[var(--color-background-card)] text-[var(--color-text-primary)] text-[14.5px] font-medium flex items-center gap-3.5 cursor-pointer transition-colors text-left";

  return createPortal(
    <div
      data-swipe-ignore="true"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[96] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "แชร์ที่พักนี้" : "Share this place"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[540px] max-h-[88vh] flex flex-col rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] animate-slide-up-sheet sm:animate-none overflow-hidden"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]"
          />
        </div>

        {/* Header */}
        <div className="px-6 pt-3 sm:pt-6 pb-4 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {isTh ? "แชร์ที่พักนี้" : "Share this place"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิดหน้าต่าง" : "Close"}
            className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:pb-6 space-y-5">
          {/* Place Preview Row */}
          <div className="flex items-center gap-3.5">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="h-16 w-16 rounded-[12px] object-cover bg-[var(--color-background-muted)] shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-[14.5px] leading-[1.45] text-[var(--color-text-primary)] line-clamp-2">
                <span className="font-semibold">{title}</span>
                {subtitle && (
                  <span className="text-[var(--color-text-secondary)]">
                    {" "}
                    · {subtitle}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 2-Column Share Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Copy Link */}
            <button
              type="button"
              onClick={() => void copyToClipboard(shareUrl, "link")}
              className={buttonClass}
            >
              {copiedMode === "link" ? (
                <Check className="w-[21px] h-[21px] text-[var(--color-success)] shrink-0" />
              ) : (
                <Copy className="w-[20px] h-[20px] shrink-0" strokeWidth={1.9} />
              )}
              <span className="truncate">
                {copiedMode === "link"
                  ? isTh
                    ? "คัดลอกลิงก์แล้ว"
                    : "Link copied"
                  : isTh
                  ? "คัดลอกลิงก์"
                  : "Copy Link"}
              </span>
            </button>

            {/* 2. LINE */}
            <button
              type="button"
              onClick={() =>
                openPopupWindow(
                  `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`
                )
              }
              className={buttonClass}
            >
              <LineBrandIcon className="w-[22px] h-[22px] shrink-0" />
              <span className="truncate">LINE</span>
            </button>

            {/* 3. Email */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A${encodedUrl}`;
              }}
              className={buttonClass}
            >
              <Mail className="w-[20px] h-[20px] shrink-0" strokeWidth={1.9} />
              <span className="truncate">{isTh ? "อีเมล" : "Email"}</span>
            </button>

            {/* 4. Messages */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `sms:?&body=${encodedText}%20${encodedUrl}`;
              }}
              className={buttonClass}
            >
              <MessagesBrandIcon className="w-[21px] h-[21px] shrink-0" />
              <span className="truncate">{isTh ? "ข้อความ" : "Messages"}</span>
            </button>

            {/* 5. WhatsApp */}
            <button
              type="button"
              onClick={() =>
                openPopupWindow(
                  `https://wa.me/?text=${encodedText}%20${encodedUrl}`
                )
              }
              className={buttonClass}
            >
              <WhatsAppBrandIcon className="w-[22px] h-[22px] shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {/* 6. Messenger */}
            <button
              type="button"
              onClick={handleMessenger}
              className={buttonClass}
            >
              <MessengerBrandIcon className="w-[21px] h-[21px] shrink-0" />
              <span className="truncate">Messenger</span>
            </button>

            {/* 7. Facebook */}
            <button
              type="button"
              onClick={() =>
                openPopupWindow(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
                )
              }
              className={buttonClass}
            >
              <FacebookBrandIcon className="w-[21px] h-[21px] shrink-0" />
              <span className="truncate">Facebook</span>
            </button>

            {/* 8. X (Twitter) */}
            <button
              type="button"
              onClick={() =>
                openPopupWindow(
                  `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
                )
              }
              className={buttonClass}
            >
              <XBrandIcon className="w-[19px] h-[19px] shrink-0" />
              <span className="truncate">X (Twitter)</span>
            </button>

            {/* 9. Embed */}
            <button
              type="button"
              onClick={handleEmbed}
              className={buttonClass}
            >
              {copiedMode === "embed" ? (
                <Check className="w-[21px] h-[21px] text-[var(--color-success)] shrink-0" />
              ) : (
                <Code2 className="w-[21px] h-[21px] shrink-0" strokeWidth={1.9} />
              )}
              <span className="truncate">
                {copiedMode === "embed"
                  ? isTh
                    ? "คัดลอกโค้ดฝังแล้ว"
                    : "Embed copied"
                  : isTh
                  ? "ฝังโค้ด (Embed)"
                  : "Embed"}
              </span>
            </button>

            {/* 10. More options (Native OS Share Sheet via Web Share API) */}
            <button
              type="button"
              onClick={() => void handleMoreOptions()}
              className={buttonClass}
            >
              <MoreHorizontal
                className="w-[22px] h-[22px] shrink-0"
                strokeWidth={2}
              />
              <span className="truncate">
                {isTh ? "ตัวเลือกเพิ่มเติม" : "More options"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
