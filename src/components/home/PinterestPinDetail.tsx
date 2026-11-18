"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  EyeOff,
  Flag,
  Heart,
  Link2,
  Loader2,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  getOptimizedPinImageSrcSet,
  getOptimizedPinImageUrl,
  getOptimizedVideoUrl,
  parseVideoSource,
  PIN_IMAGE_SIZES,
  preloadPinHeroImages,
  resolveAspectRatioCss,
} from "@/lib/mediaUtils";
import { startRouteProgress } from "@/components/navigation/RouteProgressBar";
import { trackPinInteraction } from "@/lib/telemetry/clientTelemetry";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type {
  AuthenticatedMeDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";
import { UniversalVideoPlayer } from "@/components/media/UniversalVideoPlayer";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";

interface ClickedPinOrigin {
  pinId: string;
  top: number;
  left: number;
  width: number;
  height: number;
  timestamp: number;
}

let lastClickedPinOrigin: ClickedPinOrigin | null = null;

export function clearLastClickedPinOrigin(): void {
  lastClickedPinOrigin = null;
}

const QUICK_EMOJIS = ["😍", "🔥", "🌿", "✨", "🌊", "🏡", "❤️", "🙌"];

function formatRelativeCommentDate(
  isoDateStr: string,
  language: LanguageCode
): string {
  const diffMs = Date.now() - new Date(isoDateStr).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) {
    return language === "th" ? `${mins} นาที` : `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return language === "th" ? `${hrs} ชม.` : `${hrs}h`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return language === "th" ? `${days} วัน` : `${days}d`;
  }
  const weeks = Math.floor(days / 7);
  return language === "th" ? `${weeks} สัปดาห์` : `${weeks}w`;
}

interface PinMoreOptionsControlProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinFeedItemDto) => void;
  onHidePin?: (pinId: string) => void;
  triggerClassName: string;
  iconClassName?: string;
  dropdownAlign?: "left" | "right";
}

function PinMoreOptionsControl({
  pin,
  language,
  isSaved,
  onToggleSave,
  onSharePin,
  onHidePin,
  triggerClassName,
  iconClassName = "w-4 h-4",
  dropdownAlign = "right",
}: PinMoreOptionsControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSheet, setIsMobileSheet] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(isOpen && isMobileSheet);

  useEffect(() => {
    if (!isOpen || isMobileSheet) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, isMobileSheet]);

  const hotelName = language === "th" ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel =
    language === "th" ? pin.provinceNameTh : pin.provinceNameEn;

  const showQuickToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => setFeedbackToast(null), 2000);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/?stay=${encodeURIComponent(pin.id)}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    trackPinInteraction("PIN_SHARE", pin);
    setIsOpen(false);
    showQuickToast(language === "th" ? "คัดลอกลิงก์แล้ว" : "Link copied");
  };

  const handleSendShare = () => {
    onSharePin(pin);
    setIsOpen(false);
  };

  const handleHide = () => {
    trackPinInteraction("PIN_DWELL", pin, { dwellMs: 600 });
    setIsOpen(false);
    onHidePin?.(pin.id);
    showQuickToast(language === "th" ? "ซ่อนโพสต์นี้แล้ว" : "Pin hidden");
  };

  const handleReport = () => {
    setIsOpen(false);
    showQuickToast(
      language === "th"
        ? "ส่งรายงานให้ทีมตรวจสอบแล้ว"
        : "Reported for review"
    );
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex" data-swipe-ignore="true">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const mobile =
            typeof window !== "undefined" && window.innerWidth < 1024;
          setIsMobileSheet(mobile);
          setIsOpen((v) => !v);
        }}
        aria-label={language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
        className={triggerClassName}
      >
        <MoreHorizontal className={iconClassName} />
      </button>

      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[95] rounded-[12px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] px-4 py-2 text-[13px] font-semibold shadow-[var(--shadow-popover)] pointer-events-none">
          {feedbackToast}
        </div>
      )}

      {/* DESKTOP STANDARD DROPDOWN (>= lg) */}
      {isOpen && !isMobileSheet && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            dropdownAlign === "right" ? "right-0" : "left-0"
          } top-full mt-1.5 z-40 w-56 rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-1.5 space-y-0.5 text-[13.5px]`}
        >
          <Link
            href={`/${pin.hotelSlug}`}
            onClick={() => {
              trackPinInteraction("HOTEL_PROFILE_VIEW", pin);
              setIsOpen(false);
            }}
            className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-semibold text-[var(--color-text-primary)]"
          >
            <span className="truncate">
              {language === "th"
                ? `ไปที่เพจที่พัก (${provinceLabel})`
                : `Visit stay (${provinceLabel})`}
            </span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </Link>

          <button
            type="button"
            onClick={() => {
              onToggleSave(pin.id);
              setIsOpen(false);
            }}
            className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
          >
            <span>
              {isSaved
                ? language === "th"
                  ? "นำออกจากบอร์ด"
                  : "Remove from board"
                : language === "th"
                ? "บันทึกเข้าบอร์ด"
                : "Save to board"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSendShare}
            className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
          >
            <span>{language === "th" ? "แชร์โพสต์" : "Send / Share"}</span>
            <Share className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
          >
            <span>{language === "th" ? "คัดลอกลิงก์" : "Copy link"}</span>
            <Link2 className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
          </button>

          {onHidePin && (
            <button
              type="button"
              onClick={handleHide}
              className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
            >
              <span>{language === "th" ? "ซ่อนโพสต์นี้" : "Hide Pin"}</span>
              <EyeOff className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
            </button>
          )}

          <button
            type="button"
            onClick={handleReport}
            className="w-full h-10 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <span>{language === "th" ? "รายงานโพสต์" : "Report Pin"}</span>
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MOBILE / TABLET SLIDE-UP BOTTOM SHEET (< lg — Matches Pinterest Mobile App) */}
      {isOpen && isMobileSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 animate-fade-in-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] space-y-3 animate-slide-up-sheet"
          >
            <div className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto" />

            <p className="text-[13px] font-medium text-[var(--color-text-secondary)] pt-1">
              {language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
            </p>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={handleSendShare}
                className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center text-[16px] font-bold text-[var(--color-text-primary)] cursor-pointer"
              >
                {language === "th" ? "ส่งต่อ / แชร์" : "Send"}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center text-[16px] font-bold text-[var(--color-text-primary)] cursor-pointer"
              >
                {language === "th" ? "คัดลอกลิงก์" : "Copy link"}
              </button>

              <Link
                href={`/${pin.hotelSlug}`}
                onClick={() => {
                  trackPinInteraction("HOTEL_PROFILE_VIEW", pin);
                  setIsOpen(false);
                }}
                className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[16px] font-bold text-[var(--color-text-primary)]"
              >
                <span className="truncate">
                  {language === "th"
                    ? `ไปที่เพจ ${hotelName}`
                    : `Visit ${hotelName}`}
                </span>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </Link>

              <button
                type="button"
                onClick={handleReport}
                className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center text-[16px] font-bold text-[var(--color-text-primary)] cursor-pointer"
              >
                {language === "th" ? "รายงานโพสต์" : "Report Pin"}
              </button>

              {onHidePin && (
                <button
                  type="button"
                  onClick={handleHide}
                  className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center text-[16px] font-bold text-[var(--color-text-primary)] cursor-pointer"
                >
                  {language === "th" ? "ซ่อนโพสต์นี้" : "Hide"}
                </button>
              )}
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-11 px-6 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-bold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                {language === "th" ? "ปิด" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface PinterestPinCardProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  priority?: boolean;
  onSelectPin: (pin: PinFeedItemDto) => void;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinFeedItemDto) => void;
  onHidePin?: (pinId: string) => void;
}

export function PinterestPinCard({
  pin,
  language,
  isSaved,
  priority = false,
  onSelectPin,
  onToggleSave,
  onSharePin,
  onHidePin,
}: PinterestPinCardProps) {
  const title = language === "th" ? pin.titleTh : pin.titleEn;
  const cardImageUrl = getOptimizedPinImageUrl(pin.coverImageUrl, "card");
  const cardImageSrcSet = getOptimizedPinImageSrcSet(pin.coverImageUrl, "card");

  const parsedVideo = pin.videoUrl
    ? parseVideoSource(pin.videoUrl, {
        autoplay: true,
        muted: true,
        forceVertical: true,
      })
    : null;
  const isInlineMp4Video = parsedVideo?.provider === "mp4";
  const optimizedCardVideoUrl =
    isInlineMp4Video && parsedVideo
      ? getOptimizedVideoUrl(parsedVideo.embedUrl, "card")
      : null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [optimizedCardVideoUrl]);

  useEffect(() => {
    if (!isInlineMp4Video || !optimizedCardVideoUrl) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = true;
    videoEl.defaultMuted = true;

    if (typeof IntersectionObserver === "undefined") {
      videoEl.preload = "metadata";
      videoEl.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (videoEl.preload === "none") {
              videoEl.preload = "metadata";
            }
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        }
      },
      { rootMargin: "180px 0px", threshold: 0.15 }
    );

    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [isInlineMp4Video, optimizedCardVideoUrl]);

  const mediaBoxRef = useRef<HTMLDivElement | null>(null);
  const impressionLoggedRef = useRef(false);

  // Track PIN_IMPRESSION after card is >=55% visible for >=1000ms
  useEffect(() => {
    const el = mediaBoxRef.current;
    if (
      !el ||
      impressionLoggedRef.current ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }
    let dwellTimer: number | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !impressionLoggedRef.current) {
          if (dwellTimer === null) {
            dwellTimer = window.setTimeout(() => {
              dwellTimer = null;
              if (!impressionLoggedRef.current) {
                impressionLoggedRef.current = true;
                trackPinInteraction("PIN_IMPRESSION", pin);
                obs.disconnect();
              }
            }, 1000);
          }
        } else if (dwellTimer !== null) {
          window.clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: 0.55 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (dwellTimer !== null) window.clearTimeout(dwellTimer);
    };
  }, [pin]);

  const handleCardClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const rect = mediaBoxRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        lastClickedPinOrigin = {
          pinId: pin.id,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          timestamp: Date.now(),
        };
      }
    } else {
      lastClickedPinOrigin = null;
    }
    onSelectPin(pin);
  };

  return (
    <article className="w-full select-none">
      <div
        ref={mediaBoxRef}
        onClick={handleCardClick}
        onMouseEnter={() => preloadPinHeroImages(pin)}
        onTouchStart={() => preloadPinHeroImages(pin)}
        className={`group relative w-full ${pin.aspectRatio} rounded-[14px] sm:rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer`}
      >
        {isInlineMp4Video && optimizedCardVideoUrl ? (
          <>
            <img
              src={cardImageUrl}
              srcSet={cardImageSrcSet}
              sizes={PIN_IMAGE_SIZES.card}
              alt={title}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <video
              ref={videoRef}
              src={optimizedCardVideoUrl}
              poster={cardImageUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              onPlaying={() => setIsVideoPlaying(true)}
              onError={() => setIsVideoPlaying(false)}
              className={`relative z-[1] h-full w-full object-cover object-center pointer-events-none transition-opacity duration-200 ${
                isVideoPlaying ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <img
            src={cardImageUrl}
            srcSet={cardImageSrcSet}
            sizes={PIN_IMAGE_SIZES.card}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            draggable={false}
            className="h-full w-full object-cover object-center"
          />
        )}

        {/* Hover Dim Overlay — Strictly Zero Hover Scale & Squircle Buttons */}
        <div className="pointer-events-none absolute inset-0 bg-black/28 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:flex flex-col justify-between p-2.5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(pin.id);
              }}
              className={`pointer-events-auto h-9 px-3.5 rounded-[12px] text-[13px] font-bold transition-colors cursor-pointer ${
                isSaved
                  ? "bg-[#111111] !text-white"
                  : "bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] !text-white"
              }`}
            >
              {isSaved
                ? language === "th"
                  ? "บันทึกแล้ว"
                  : "Saved"
                : language === "th"
                ? "บันทึก"
                : "Save"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/${pin.hotelSlug}`}
              onClick={(e) => {
                e.stopPropagation();
                trackPinInteraction("HOTEL_PROFILE_VIEW", pin);
              }}
              className="pointer-events-auto max-w-[75%] h-8 px-3 rounded-[10px] bg-white/92 hover:bg-white text-[#111111] text-[12px] font-semibold inline-flex items-center gap-1 truncate"
            >
              <span className="truncate">
                {language === "th" ? pin.hotelNameTh : pin.hotelNameEn}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSharePin(pin);
              }}
              aria-label={language === "th" ? "แชร์โพสต์" : "Share"}
              className="pointer-events-auto h-8 w-8 rounded-[10px] bg-white/92 hover:bg-white text-[#111111] inline-flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Share className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact 2-Line Title + Like/Comment Counts + '...' Menu Underneath */}
      <div className="pt-1.5 pb-0.5 px-0.5 space-y-1 relative">
        <p
          onClick={handleCardClick}
          className="text-[12.5px] sm:text-[13px] leading-[1.35] font-semibold text-[var(--color-text-primary)] line-clamp-2 cursor-pointer"
        >
          {title}
        </p>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCardClick}
            className="flex items-center gap-2.5 text-[11.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
          >
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Heart
                className={`w-3 h-3 ${
                  pin.isLikedByMe
                    ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                    : ""
                }`}
                strokeWidth={2}
              />
              <span>{pin.likesCount}</span>
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageCircle className="w-3 h-3" strokeWidth={2} />
              <span>{pin.commentsCount}</span>
            </span>
          </button>

          <PinMoreOptionsControl
            pin={pin}
            language={language}
            isSaved={isSaved}
            onToggleSave={onToggleSave}
            onSharePin={onSharePin}
            onHidePin={onHidePin}
            iconClassName="w-3.5 h-3.5"
            triggerClassName="h-6 w-6 rounded-[8px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors shrink-0"
          />
        </div>
      </div>
    </article>
  );
}

function MobileAdjacentPinPreview({
  pin,
  language,
  isSaved,
}: {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
}) {
  const title = language === "th" ? pin.titleTh : pin.titleEn;
  const hotelName = language === "th" ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel =
    language === "th" ? pin.provinceNameTh : pin.provinceNameEn;
  const heroAspectCss = resolveAspectRatioCss(pin.aspectRatio);
  const coverSource =
    pin.mediaUrls.length > 0 ? pin.mediaUrls[0] : pin.coverImageUrl;

  return (
    <div className="w-full px-1.5 sm:px-3 pt-1.5 sm:pt-2.5 bg-[var(--color-background-card)] select-none pointer-events-none">
      <div
        style={{ aspectRatio: heroAspectCss }}
        className="relative w-full max-h-[78svh] mx-auto rounded-[24px] sm:rounded-[26px] bg-[var(--color-background-muted)] overflow-hidden"
      >
        <img
          src={getOptimizedPinImageUrl(coverSource, "card")}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
        />
        <img
          src={getOptimizedPinImageUrl(coverSource, "hero")}
          srcSet={getOptimizedPinImageSrcSet(coverSource, "hero")}
          sizes={PIN_IMAGE_SIZES.hero}
          alt={title}
          loading="eager"
          decoding="sync"
          draggable={false}
          className="relative z-10 w-full h-full object-cover select-none"
        />
      </div>

      <div className="px-3.5 sm:px-4 py-3 flex items-center justify-between gap-1.5 bg-[var(--color-background-card)]">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="h-10 px-2 sm:px-2.5 rounded-[12px] inline-flex items-center gap-1.5 ty-body font-semibold text-[var(--color-text-primary)]">
            <Heart className="w-[21px] h-[21px]" strokeWidth={2.1} />
            {pin.likesCount > 0 && <span>{pin.likesCount}</span>}
          </span>
          <span className="h-10 px-2 sm:px-2.5 rounded-[12px] inline-flex items-center gap-1.5 ty-body font-semibold text-[var(--color-text-primary)]">
            <MessageCircle className="w-[21px] h-[21px]" strokeWidth={2.1} />
            {pin.commentsCount > 0 && <span>{pin.commentsCount}</span>}
          </span>
          <span className="h-10 w-9 sm:w-10 rounded-[12px] inline-flex items-center justify-center text-[var(--color-text-primary)]">
            <Share className="w-[20px] h-[20px]" strokeWidth={2.1} />
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="h-10 px-3 sm:px-3.5 rounded-[14px] bg-[var(--color-background-muted)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center justify-center gap-1 whitespace-nowrap">
            <span>{language === "th" ? "เข้าชมที่พัก" : "Visit stay"}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          </span>

          <span
            className={`h-10 px-3.5 sm:px-4 rounded-[14px] ty-body font-bold inline-flex items-center justify-center whitespace-nowrap ${
              isSaved
                ? "bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111]"
                : "bg-[var(--color-promo)] !text-white"
            }`}
          >
            {isSaved
              ? language === "th"
                ? "บันทึกแล้ว"
                : "Saved"
              : language === "th"
              ? "บันทึก"
              : "Save"}
          </span>
        </div>
      </div>

      <div className="px-4 pt-2 pb-6 space-y-3 bg-[var(--color-background-card)]">
        <div className="inline-flex items-center gap-2.5 min-w-0">
          {pin.hotelLogoUrl ? (
            <img
              src={pin.hotelLogoUrl}
              alt={hotelName}
              className="h-7 w-7 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] border border-[var(--color-border)]"
            />
          ) : (
            <span className="h-7 w-7 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-bold shrink-0">
              {hotelName[0] || "C"}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-[var(--color-text-primary)] truncate flex items-center gap-1">
              <span className="truncate">{hotelName}</span>
              {pin.hotelVerificationStatus === "VERIFIED" && (
                <BadgeCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
              )}
            </p>
            <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
              {provinceLabel}
              {pin.nightlyPriceThb
                ? ` · เริ่มต้น ฿${pin.nightlyPriceThb.toLocaleString()}/คืน`
                : ""}
            </p>
          </div>
        </div>

        <h2 className="text-[16.5px] font-bold text-[var(--color-text-primary)] leading-snug">
          {title}
        </h2>
      </div>
    </div>
  );
}

export interface PinterestPinDetailProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  currentUser: AuthenticatedMeDto | null;
  comments: PinCommentDto[];
  savedPinIds: Set<string>;
  relatedPins?: PinFeedItemDto[];
  prevPinPreview?: PinFeedItemDto | null;
  nextPinPreview?: PinFeedItemDto | null;
  mobileOverlayMode?: boolean;
  canStepBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
  onSelectPin?: (pin: PinFeedItemDto) => void;
  onNavigatePin?: (direction: "prev" | "next") => void;
  onHidePin?: (pinId: string) => void;
  onToggleLike: (pinId: string) => void;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinFeedItemDto) => void;
  onExpandMedia: (urls: string[], index: number) => void;
  onAddComment: (text: string, parentId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onBookPin?: (pin: PinFeedItemDto) => void;
}

export function PinterestPinDetail({
  pin,
  language,
  currentUser,
  comments,
  savedPinIds,
  relatedPins = [],
  prevPinPreview = null,
  nextPinPreview = null,
  mobileOverlayMode = false,
  canStepBack = false,
  onBack,
  onClose,
  onSelectPin,
  onNavigatePin,
  onHidePin,
  onToggleLike,
  onToggleSave,
  onSharePin,
  onExpandMedia,
  onAddComment,
  onDeleteComment,
}: PinterestPinDetailProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [slideIndex, setSlideIndex] = useState(0);
  const [isCarouselAnimated, setIsCarouselAnimated] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDesktopCommentsOpen, setIsDesktopCommentsOpen] = useState(true);
  const [pullDownOffset, setPullDownOffset] = useState(0);
  const [isPullingDown, setIsPullingDown] = useState(false);
  const [isNavigatingToHotel, setIsNavigatingToHotel] = useState(false);
  const [failedMediaUrls, setFailedMediaUrls] = useState<Set<string>>(
    () => new Set()
  );
  const [loadedHeroUrls, setLoadedHeroUrls] = useState<Set<string>>(
    () => new Set()
  );

  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const desktopCommentInputRef = useRef<HTMLInputElement | null>(null);
  const desktopCommentsSectionRef = useRef<HTMLDivElement | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pageSwipeTrackRef = useRef<HTMLDivElement | null>(null);
  const leftPeekPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPeekPanelRef = useRef<HTMLDivElement | null>(null);
  const mediaStageRef = useRef<HTMLDivElement | null>(null);
  const carouselTrackRef = useRef<HTMLDivElement | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);
  const mouseDragRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const swipeCommitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobileViewport(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobileViewport(e.matches);
      if (!e.matches) {
        setIsCommentsSheetOpen(false);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Only lock body scroll when using legacy overlay mode (`/{hotelSlug}`) or when mobile comments modal is open!
  // On `/` and `/board`, native `window` scroll stays active so iOS Safari's bottom bar is 100% translucent!
  useBodyScrollLock(
    (mobileOverlayMode && isMobileViewport) ||
      (isCommentsSheetOpen && isMobileViewport)
  );

  useEffect(() => {
    if (typeof document === "undefined" || mobileOverlayMode) return;
    document.documentElement.dataset.mobilePinOpen = "true";
    return () => {
      delete document.documentElement.dataset.mobilePinOpen;
    };
  }, [mobileOverlayMode]);

  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // Synchronously reset swipe & carousel tracks BEFORE browser paint whenever `pin.id` changes (Zero Flash!)
  useIsomorphicLayoutEffect(() => {
    if (swipeCommitTimerRef.current !== null) {
      window.clearTimeout(swipeCommitTimerRef.current);
      swipeCommitTimerRef.current = null;
    }
    setIsCarouselAnimated(false);
    setSlideIndex(0);
    setIsDescriptionOpen(false);
    setIsCommentsSheetOpen(false);
    setReplyingTo(null);
    setPullDownOffset(0);
    setIsPullingDown(false);
    setIsNavigatingToHotel(false);
    setFailedMediaUrls(new Set());
    setLoadedHeroUrls(new Set());

    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.transition = "none";
      carouselTrackRef.current.style.transform = "translate3d(0%, 0, 0)";
    }
    if (pageSwipeTrackRef.current) {
      pageSwipeTrackRef.current.style.transition = "none";
      pageSwipeTrackRef.current.style.transform = "translate3d(0px, 0, 0)";
    }
    if (leftPeekPanelRef.current) {
      leftPeekPanelRef.current.style.top = "0px";
    }
    if (rightPeekPanelRef.current) {
      rightPeekPanelRef.current.style.top = "0px";
    }

    if (mobileOverlayMode) {
      if (overlayRef.current) overlayRef.current.scrollTop = 0;
    } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pin.id, mobileOverlayMode]);

  useEffect(() => {
    const openedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    trackPinInteraction("PIN_OPEN", pin);

    return () => {
      const closedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const dwellMs = Math.round(closedAt - openedAt);
      if (dwellMs >= 250) {
        trackPinInteraction("PIN_DWELL", pin, { dwellMs });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.id]);

  // Preload adjacent card hero images + prefetch hotel storefront route for instant 1-tap transition
  useEffect(() => {
    preloadPinHeroImages(prevPinPreview);
    preloadPinHeroImages(nextPinPreview);
  }, [prevPinPreview, nextPinPreview]);

  useEffect(() => {
    if (pin.hotelSlug) {
      router.prefetch(`/${pin.hotelSlug}`);
    }
  }, [pin.hotelSlug, router]);

  useEffect(() => {
    setIsNavigatingToHotel(false);
  }, [pathname]);

  // Close Comments Sheet on Escape
  useEffect(() => {
    if (!isCommentsSheetOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCommentsSheetOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isCommentsSheetOpen]);

  // Pinterest-style FLIP expansion animation from the clicked card box -> full hero stage
  useIsomorphicLayoutEffect(() => {
    const origin = lastClickedPinOrigin;
    if (
      !origin ||
      origin.pinId !== pin.id ||
      Date.now() - origin.timestamp > 700
    ) {
      return;
    }
    lastClickedPinOrigin = null;

    if (
      typeof window === "undefined" ||
      window.innerWidth >= 1024 ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const mediaEl = mediaStageRef.current;
    const detailsEl = detailsPanelRef.current;
    if (!mediaEl) return;

    const targetRect = mediaEl.getBoundingClientRect();
    if (targetRect.width <= 0 || targetRect.height <= 0) return;

    const dx = origin.left - targetRect.left;
    const dy = origin.top - targetRect.top;
    const sx = origin.width / targetRect.width;
    const sy = origin.height / targetRect.height;

    mediaEl.style.transition = "none";
    mediaEl.style.transformOrigin = "0 0";
    mediaEl.style.borderRadius = "16px";
    mediaEl.style.zIndex = "30";
    mediaEl.style.willChange = "transform, border-radius";
    mediaEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale3d(${sx}, ${sy}, 1)`;

    if (detailsEl) {
      detailsEl.style.transition = "none";
      detailsEl.style.opacity = "0";
      detailsEl.style.transform = "translate3d(0, 14px, 0)";
      detailsEl.style.willChange = "opacity, transform";
    }

    mediaEl.getBoundingClientRect();

    let rafId = 0;
    let cleanupTimer: number | null = null;

    const clearStyles = () => {
      mediaEl.style.transition = "";
      mediaEl.style.transformOrigin = "";
      mediaEl.style.borderRadius = "";
      mediaEl.style.zIndex = "";
      mediaEl.style.willChange = "";
      mediaEl.style.transform = "";
      if (detailsEl) {
        detailsEl.style.transition = "";
        detailsEl.style.opacity = "";
        detailsEl.style.transform = "";
        detailsEl.style.willChange = "";
      }
    };

    rafId = window.requestAnimationFrame(() => {
      mediaEl.style.transition =
        "transform 340ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 340ms cubic-bezier(0.22, 1, 0.36, 1)";
      mediaEl.style.transform = "translate3d(0, 0, 0) scale3d(1, 1, 1)";
      mediaEl.style.borderRadius =
        typeof window !== "undefined" && window.innerWidth >= 1024
          ? "20px"
          : "24px";

      if (detailsEl) {
        detailsEl.style.transition =
          "opacity 260ms ease-out 50ms, transform 280ms cubic-bezier(0.22, 1, 0.36, 1) 50ms";
        detailsEl.style.opacity = "1";
        detailsEl.style.transform = "translate3d(0, 0, 0)";
      }

      cleanupTimer = window.setTimeout(clearStyles, 370);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
      clearStyles();
    };
  }, [pin.id]);

  const baseImages = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const rawList =
      pin.mediaUrls.length > 0 ? pin.mediaUrls : [pin.coverImageUrl];
    for (const raw of rawList) {
      const clean = (raw || "").trim();
      if (!clean || clean.includes("res.cloudinary.com/dxxb2gvyw/")) continue;
      let key = clean;
      try {
        const u = new URL(clean);
        if (u.hostname === "images.unsplash.com") {
          key = `${u.origin}${u.pathname}`;
        }
      } catch {
        // use raw string as dedupe key
      }
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(clean);
    }
    return list.length > 0 ? list : [pin.coverImageUrl];
  }, [pin.mediaUrls, pin.coverImageUrl]);

  const images = useMemo(() => {
    const filtered = baseImages.filter((url) => !failedMediaUrls.has(url));
    return filtered.length > 0 ? filtered : baseImages.slice(0, 1);
  }, [baseImages, failedMediaUrls]);

  useEffect(() => {
    if (slideIndex >= images.length) {
      setSlideIndex(Math.max(0, images.length - 1));
    }
  }, [slideIndex, images.length]);

  const handleMarkMediaError = (brokenUrl: string) => {
    setFailedMediaUrls((prev) => {
      if (prev.has(brokenUrl)) return prev;
      const next = new Set(prev);
      next.add(brokenUrl);
      return next;
    });
  };

  const handleMarkHeroLoaded = (loadedUrl: string) => {
    setLoadedHeroUrls((prev) => {
      if (prev.has(loadedUrl)) return prev;
      const next = new Set(prev);
      next.add(loadedUrl);
      return next;
    });
  };

  const handleVisitHotelClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackPinInteraction("HOTEL_PROFILE_VIEW", pin);
    const targetPath = `/${pin.hotelSlug}`;
    if (pathname === targetPath) {
      e.preventDefault();
      onClose();
      window.setTimeout(() => {
        document
          .getElementById("section-rooms")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
      return;
    }
    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey &&
      e.button === 0
    ) {
      setIsNavigatingToHotel(true);
      startRouteProgress();
    }
  };

  const navigateCarouselSlide = (
    nextIdxOrFn: number | ((prev: number) => number)
  ) => {
    setIsCarouselAnimated(true);
    setSlideIndex((prev) => {
      const resolved =
        typeof nextIdxOrFn === "function" ? nextIdxOrFn(prev) : nextIdxOrFn;
      const clamped = Math.max(0, Math.min(images.length - 1, resolved));
      if (clamped !== prev && images.length > 1) {
        trackPinInteraction("CAROUSEL_SWIPE", pin, {
          carouselDepth: clamped + 1,
        });
      }
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const strip = thumbnailStripRef.current;
          const activeThumb = strip?.querySelector<HTMLElement>(
            `[data-thumb-idx="${clamped}"]`
          );
          activeThumb?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        });
      }
      return clamped;
    });
  };

  // =========================================================================
  // ENGINE A: 120FPS INTERACTIVE MULTI-PHOTO CAROUSEL + PULL-DOWN GESTURE
  // =========================================================================
  const slideIndexRef = useRef(slideIndex);
  slideIndexRef.current = slideIndex;

  const gestureCallbacksRef = useRef({
    handleStepBack: () => {},
    onNavigatePin,
    prevPinPreview,
    nextPinPreview,
    canStepBack,
    imagesCount: images.length,
    hasVideo: Boolean(pin.videoUrl),
    mobileOverlayMode,
  });

  useEffect(() => {
    const el = mediaStageRef.current;
    if (!el || typeof window === "undefined") return;

    let state: {
      startX: number;
      startY: number;
      lastX: number;
      lastTime: number;
      velocityX: number;
      atTop: boolean;
      locked: "pull-down" | "carousel" | "vertical" | null;
    } | null = null;

    const getScrollTop = () =>
      gestureCallbacksRef.current.mobileOverlayMode
        ? overlayRef.current?.scrollTop ?? 0
        : window.scrollY;

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1024 || isCommentsSheetOpen) return;
      const t = e.touches[0];
      if (!t) return;
      const now = performance.now();
      state = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastTime: now,
        velocityX: 0,
        atTop: getScrollTop() <= 8,
        locked: null,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!state || window.innerWidth >= 1024 || isCommentsSheetOpen) return;
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;
      const now = performance.now();
      const dt = now - state.lastTime;
      if (dt > 0) {
        state.velocityX = (t.clientX - state.lastX) / dt;
        state.lastX = t.clientX;
        state.lastTime = now;
      }

      const { imagesCount, hasVideo } = gestureCallbacksRef.current;
      const isMultiPhoto = imagesCount > 1 && !hasVideo;

      if (state.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        if (dy > 0 && state.atTop && Math.abs(dy) > Math.abs(dx) * 1.15) {
          state.locked = "pull-down";
        } else if (isMultiPhoto && Math.abs(dx) > Math.abs(dy) * 1.12) {
          state.locked = "carousel";
        } else {
          state.locked = "vertical";
        }
      }

      if (state.locked === "pull-down") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        setIsPullingDown(true);
        setPullDownOffset(Math.max(0, Math.min(220, dy * 0.72)));
        return;
      }

      if (state.locked === "carousel") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const track = carouselTrackRef.current;
        if (!track) return;
        const curr = slideIndexRef.current;
        const atLeftEdge = curr === 0 && dx > 0;
        const atRightEdge = curr === imagesCount - 1 && dx < 0;
        const effectiveDx = atLeftEdge || atRightEdge ? dx * 0.28 : dx;
        track.style.transition = "none";
        track.style.transform = `translate3d(calc(${-curr * 100}% + ${effectiveDx}px), 0, 0)`;
      }
    };

    const finishGesture = (e: TouchEvent) => {
      if (!state) return;
      const st = state;
      state = null;

      if (st.locked === "pull-down") {
        const t = e.changedTouches[0];
        const dy = t ? t.clientY - st.startY : 0;
        setIsPullingDown(false);
        setPullDownOffset(0);
        if (dy >= 64) {
          gestureCallbacksRef.current.handleStepBack();
        }
        return;
      }

      if (st.locked === "carousel") {
        e.stopPropagation();
        const track = carouselTrackRef.current;
        const stageW = el.clientWidth || window.innerWidth || 360;
        const t = e.changedTouches[0];
        const dx = t ? t.clientX - st.startX : 0;
        const vx = st.velocityX;
        const curr = slideIndexRef.current;
        const count = gestureCallbacksRef.current.imagesCount;

        let targetIdx = curr;
        if ((dx < -stageW * 0.18 || vx < -0.32) && curr < count - 1) {
          targetIdx = curr + 1;
        } else if ((dx > stageW * 0.18 || vx > 0.32) && curr > 0) {
          targetIdx = curr - 1;
        }

        if (track) {
          track.style.transition =
            "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
          track.style.transform = `translate3d(${-targetIdx * 100}%, 0, 0)`;
        }
        navigateCarouselSlide(targetIdx);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishGesture, { passive: true });
    el.addEventListener("touchcancel", finishGesture, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishGesture);
      el.removeEventListener("touchcancel", finishGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.id, isCommentsSheetOpen]);

  // =========================================================================
  // ENGINE B: 120FPS INTERACTIVE WHOLE-PAGE CARD-TO-CARD SLIDE (< lg)
  // =========================================================================
  useEffect(() => {
    const container = overlayRef.current;
    if (!container || typeof window === "undefined") return;

    let state: {
      startX: number;
      startY: number;
      lastX: number;
      lastTime: number;
      velocityX: number;
      locked: "horizontal" | "vertical" | null;
      ignore: boolean;
    } | null = null;

    const getScrollOffset = () => {
      if (gestureCallbacksRef.current.mobileOverlayMode) {
        return container.scrollTop;
      }
      const rect = container.getBoundingClientRect();
      return Math.max(0, -rect.top);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (
        window.innerWidth >= 1024 ||
        isCommentsSheetOpen ||
        swipeCommitTimerRef.current !== null
      ) {
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement | null;
      const { imagesCount, hasVideo } = gestureCallbacksRef.current;
      const insideMultiPhotoHero =
        imagesCount > 1 &&
        !hasVideo &&
        Boolean(mediaStageRef.current?.contains(target));
      const ignore =
        insideMultiPhotoHero ||
        Boolean(
          target?.closest(
            "a, button, input, textarea, select, [role='button'], [data-swipe-ignore='true']"
          )
        );

      const now = performance.now();
      state = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastTime: now,
        velocityX: 0,
        locked: null,
        ignore,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        !state ||
        state.ignore ||
        window.innerWidth >= 1024 ||
        isCommentsSheetOpen ||
        swipeCommitTimerRef.current !== null
      ) {
        return;
      }
      const t = e.touches[0];
      if (!t) return;

      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;
      const now = performance.now();
      const dt = now - state.lastTime;
      if (dt > 0) {
        state.velocityX = (t.clientX - state.lastX) / dt;
        state.lastX = t.clientX;
        state.lastTime = now;
      }

      if (state.locked === null && (Math.abs(dx) > 14 || Math.abs(dy) > 12)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.35) {
          state.locked = "horizontal";
          const scrollOff = getScrollOffset();
          if (leftPeekPanelRef.current) {
            leftPeekPanelRef.current.style.top = `${scrollOff}px`;
          }
          if (rightPeekPanelRef.current) {
            rightPeekPanelRef.current.style.top = `${scrollOff}px`;
          }
        } else {
          state.locked = "vertical";
        }
      }

      if (state.locked === "horizontal") {
        if (e.cancelable) e.preventDefault();
        const track = pageSwipeTrackRef.current;
        if (!track) return;
        const { nextPinPreview: nextP, prevPinPreview: prevP, canStepBack: canBack } =
          gestureCallbacksRef.current;
        const canGoNext = Boolean(nextP);
        const canGoPrev = Boolean(prevP || canBack);

        const effectiveDx =
          (dx < 0 && !canGoNext) || (dx > 0 && !canGoPrev) ? dx * 0.24 : dx;
        track.style.transition = "none";
        track.style.transform = `translate3d(${effectiveDx}px, 0, 0)`;
      }
    };

    const finishPageSwipe = (e: TouchEvent) => {
      if (!state) return;
      const st = state;
      state = null;
      if (st.ignore || st.locked !== "horizontal") return;

      const track = pageSwipeTrackRef.current;
      if (!track) return;

      const vw = window.innerWidth || 375;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - st.startX : 0;
      const vx = st.velocityX;
      const {
        onNavigatePin: navFn,
        nextPinPreview: nextP,
        prevPinPreview: prevP,
        canStepBack: canBack,
        handleStepBack: backFn,
      } = gestureCallbacksRef.current;

      const commitNext = Boolean(nextP && navFn) && (dx < -vw * 0.2 || vx < -0.35);
      const commitPrev =
        Boolean(prevP || canBack) && (dx > vw * 0.2 || vx > 0.35);

      if (commitNext && navFn) {
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(-100%, 0, 0)";
        swipeCommitTimerRef.current = window.setTimeout(() => {
          swipeCommitTimerRef.current = null;
          lastClickedPinOrigin = null;
          navFn("next");
        }, 260);
      } else if (commitPrev) {
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(100%, 0, 0)";
        swipeCommitTimerRef.current = window.setTimeout(() => {
          swipeCommitTimerRef.current = null;
          lastClickedPinOrigin = null;
          if (prevP && navFn) {
            navFn("prev");
          } else {
            backFn();
          }
        }, 260);
      } else {
        track.style.transition =
          "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(0px, 0, 0)";
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", finishPageSwipe, { passive: true });
    container.addEventListener("touchcancel", finishPageSwipe, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", finishPageSwipe);
      container.removeEventListener("touchcancel", finishPageSwipe);
    };
  }, [pin.id, isCommentsSheetOpen]);

  // Desktop keyboard ArrowLeft / ArrowRight navigation for multi-image carousels
  useEffect(() => {
    if (
      images.length <= 1 ||
      pin.videoUrl ||
      isCommentsSheetOpen ||
      typeof window === "undefined"
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth < 1024) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateCarouselSlide(
          (prev) => (prev - 1 + images.length) % images.length
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateCarouselSlide((prev) => (prev + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.id, images.length, pin.videoUrl, isCommentsSheetOpen]);

  const title = language === "th" ? pin.titleTh : pin.titleEn;
  const description = language === "th" ? pin.descriptionTh : pin.descriptionEn;
  const hotelName = language === "th" ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel =
    language === "th" ? pin.provinceNameTh : pin.provinceNameEn;
  const isSaved = pin.isSavedByMe || savedPinIds.has(pin.id);

  const totalCommentsCount = useMemo(() => {
    const loadedCount = comments.reduce(
      (sum, c) => sum + 1 + c.replies.length,
      0
    );
    return Math.max(pin.commentsCount, loadedCount);
  }, [comments, pin.commentsCount]);

  const videoAspect: "9/16" | "16/9" =
    pin.aspectRatio.includes("16/9") || pin.aspectRatio.includes("4/3")
      ? "16/9"
      : "9/16";
  const heroAspectCss = resolveAspectRatioCss(pin.aspectRatio);

  const handleStepBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  gestureCallbacksRef.current = {
    handleStepBack,
    onNavigatePin,
    prevPinPreview,
    nextPinPreview,
    canStepBack,
    imagesCount: images.length,
    hasVideo: Boolean(pin.videoUrl),
    mobileOverlayMode,
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(trimmed, replyingTo?.id ?? null);
      setCommentText("");
      setReplyingTo(null);
      setShowEmojiBar(false);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareWithFeedback = () => {
    onSharePin(pin);
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1800);
  };

  const handleOpenCommentsSheet = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsDesktopCommentsOpen(true);
      window.setTimeout(() => {
        desktopCommentsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        desktopCommentInputRef.current?.focus();
      }, 30);
      return;
    }
    setIsCommentsSheetOpen(true);
  };

  const isOwnerOfPin = Boolean(
    currentUser &&
      (currentUser.role === "SUPER_ADMIN" ||
        currentUser.ownedHotels.some((h) => h.id === pin.hotelId))
  );

  const handleMediaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || images.length <= 1 || pin.videoUrl) return;
    mouseDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
  };

  const handleMediaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = mouseDragRef.current;
    if (!st || e.pointerType !== "mouse" || images.length <= 1 || pin.videoUrl) {
      return;
    }
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      st.dragging = true;
    }
    if (st.dragging && carouselTrackRef.current) {
      const curr = slideIndexRef.current;
      const atEdge =
        (curr === 0 && dx > 0) || (curr === images.length - 1 && dx < 0);
      const effDx = atEdge ? dx * 0.28 : dx;
      carouselTrackRef.current.style.transition = "none";
      carouselTrackRef.current.style.transform = `translate3d(calc(${-curr * 100}% + ${effDx}px), 0, 0)`;
    }
  };

  const handleMediaPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = mouseDragRef.current;
    mouseDragRef.current = null;
    if (!st || e.pointerType !== "mouse" || images.length <= 1 || pin.videoUrl) {
      return;
    }
    const dx = e.clientX - st.startX;
    const stageW = mediaStageRef.current?.clientWidth || 500;
    let targetIdx = slideIndex;
    if (dx < -Math.min(72, stageW * 0.16) && slideIndex < images.length - 1) {
      targetIdx = slideIndex + 1;
    } else if (dx > Math.min(72, stageW * 0.16) && slideIndex > 0) {
      targetIdx = slideIndex - 1;
    }
    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.transition =
        "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
      carouselTrackRef.current.style.transform = `translate3d(${-targetIdx * 100}%, 0, 0)`;
    }
    navigateCarouselSlide(targetIdx);
  };

  return (
    <div
      ref={overlayRef}
      data-mobile-scroll-container={mobileOverlayMode ? "true" : undefined}
      className={
        mobileOverlayMode
          ? "fixed inset-0 z-[60] bg-[var(--color-background-body)] overflow-y-auto overflow-x-hidden overscroll-y-contain lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:overflow-visible w-full lg:pb-2 select-none"
          : "relative w-full overflow-x-clip lg:overflow-visible lg:pb-2 select-none bg-[var(--color-background-body)] lg:bg-transparent"
      }
    >
      {/* GLOBAL STICKY / FIXED BACK BUTTON (Left) & MOBILE MORE BUTTON (Right — 100% Symmetrical Level & Size!) */}
      <button
        type="button"
        onClick={handleStepBack}
        title={
          canStepBack
            ? language === "th"
              ? "ย้อนกลับไปการ์ดก่อนหน้า"
              : "Back to previous Pin"
            : language === "th"
            ? "กลับหน้าฟีด"
            : "Back to feed"
        }
        aria-label={language === "th" ? "ย้อนกลับ" : "Back"}
        className="fixed top-[max(18px,env(safe-area-inset-top))] left-4 sm:left-6 lg:top-[96px] lg:left-[104px] z-[68] h-12 w-12 rounded-[16px] bg-black/55 lg:bg-[var(--color-background-card)]/95 hover:bg-black/70 lg:hover:bg-[var(--color-background-muted)] text-white lg:text-[var(--color-text-primary)] lg:border lg:border-[var(--color-border)] shadow-[var(--shadow-popover)] backdrop-blur-md inline-flex items-center justify-center transition cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6 lg:hidden" strokeWidth={2.4} />
        <ArrowLeft className="hidden lg:block w-6 h-6" strokeWidth={2.4} />
      </button>

      <div className="lg:hidden fixed top-[max(18px,env(safe-area-inset-top))] right-4 sm:right-6 z-[68]">
        <PinMoreOptionsControl
          pin={pin}
          language={language}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onSharePin={onSharePin}
          onHidePin={onHidePin}
          iconClassName="w-6 h-6"
          triggerClassName="h-12 w-12 rounded-[16px] bg-black/55 hover:bg-black/70 text-white shadow-[var(--shadow-popover)] backdrop-blur-md inline-flex items-center justify-center transition cursor-pointer"
        />
      </div>

      {/* WHOLE-PAGE INTERACTIVE CARD-TO-CARD SLIDE TRACK (With Live -100% / +100% Adjacent Card Previews!) */}
      <div ref={pageSwipeTrackRef} className="relative w-full will-change-transform">
        {prevPinPreview && (
          <div
            ref={leftPeekPanelRef}
            aria-hidden="true"
            className="lg:hidden absolute left-[-100%] top-0 w-full min-h-[100dvh] bg-[var(--color-background-body)] pointer-events-none"
          >
            <MobileAdjacentPinPreview
              pin={prevPinPreview}
              language={language}
              isSaved={
                savedPinIds.has(prevPinPreview.id) || prevPinPreview.isSavedByMe
              }
            />
          </div>
        )}

        {nextPinPreview && (
          <div
            ref={rightPeekPanelRef}
            aria-hidden="true"
            className="lg:hidden absolute left-[100%] top-0 w-full min-h-[100dvh] bg-[var(--color-background-body)] pointer-events-none"
          >
            <MobileAdjacentPinPreview
              pin={nextPinPreview}
              language={language}
              isSaved={
                savedPinIds.has(nextPinPreview.id) || nextPinPreview.isSavedByMe
              }
            />
          </div>
        )}

      {/* TALL SPLIT PIN CLOSE-UP CARD (Zero Inline Comment Clutter | Squircle Buttons) */}
      <div
        style={
          isMobileViewport && pullDownOffset > 0
            ? {
                transform: `translate3d(0, ${pullDownOffset}px, 0)`,
                opacity: Math.max(0.75, 1 - pullDownOffset / 380),
                transition: isPullingDown
                  ? "none"
                  : "transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease",
              }
            : isMobileViewport
            ? {
                transition:
                  "transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease",
              }
            : undefined
        }
        className="max-w-[1120px] mx-auto rounded-none lg:rounded-[24px] lg:border lg:border-[var(--color-border)] bg-[var(--color-background-card)] grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] lg:h-[min(85vh,780px)] lg:min-h-[560px] lg:overflow-hidden"
      >
        {/* =================================================================
            LEFT / HERO STAGE: TRUE VERTICAL MEDIA + 1:1 SLIDING CAROUSEL TRACK
        ================================================================== */}
        <div className="lg:col-span-6 min-h-0 px-1.5 sm:px-3 pt-1.5 sm:pt-2.5 lg:p-3 bg-[var(--color-background-card)] flex items-center justify-center lg:h-full">
          <div
            ref={mediaStageRef}
            onPointerDown={handleMediaPointerDown}
            onPointerMove={handleMediaPointerMove}
            onPointerUp={handleMediaPointerUp}
            onPointerCancel={handleMediaPointerUp}
            style={
              !pin.videoUrl
                ? ({ "--pin-aspect": heroAspectCss } as React.CSSProperties)
                : undefined
            }
            className={`relative w-full min-h-0 ${
              !pin.videoUrl
                ? "max-lg:[aspect-ratio:var(--pin-aspect)] max-h-[78svh] lg:max-h-none"
                : "min-h-[280px]"
            } lg:h-full rounded-[24px] sm:rounded-[26px] lg:rounded-[20px] bg-[var(--color-background-muted)] flex items-center justify-center overflow-hidden`}
          >
          {pin.videoUrl ? (
            <div className="w-full h-full bg-[var(--color-background-body)] flex items-center justify-center">
              <UniversalVideoPlayer
                videoUrl={getOptimizedVideoUrl(pin.videoUrl, "hero")}
                posterUrl={getOptimizedPinImageUrl(pin.coverImageUrl, "hero")}
                posterSrcSet={getOptimizedPinImageSrcSet(
                  pin.coverImageUrl,
                  "hero"
                )}
                posterSizes={PIN_IMAGE_SIZES.hero}
                title={title}
                aspectRatio={videoAspect}
                fitMode={videoAspect === "16/9" ? "contain" : "cover"}
                autoPlay={true}
                initialMuted={false}
              />
            </div>
          ) : (
            <>
              <div
                ref={carouselTrackRef}
                className="flex w-full h-full will-change-transform"
                style={{
                  transform: `translate3d(${-slideIndex * 100}%, 0, 0)`,
                  transition: isCarouselAnimated
                    ? "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)"
                    : "none",
                }}
              >
                {images.map((imgUrl, idx) => {
                  const isHeroLoaded = loadedHeroUrls.has(imgUrl);
                  return (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className="relative w-full h-full shrink-0 flex items-center justify-center overflow-hidden"
                    >
                      {!isHeroLoaded && (
                        <img
                          src={getOptimizedPinImageUrl(imgUrl, "card")}
                          alt=""
                          aria-hidden="true"
                          loading={idx === 0 ? "eager" : "lazy"}
                          decoding="sync"
                          draggable={false}
                          className="absolute inset-0 w-full h-full object-cover select-none"
                        />
                      )}
                      <img
                        src={getOptimizedPinImageUrl(imgUrl, "hero")}
                        srcSet={getOptimizedPinImageSrcSet(imgUrl, "hero")}
                        sizes={PIN_IMAGE_SIZES.hero}
                        alt={idx === 0 ? title : `${title} (${idx + 1})`}
                        loading={idx <= 1 ? "eager" : "lazy"}
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        decoding={idx === 0 ? "sync" : "async"}
                        draggable={false}
                        onLoad={() => handleMarkHeroLoaded(imgUrl)}
                        onError={() => handleMarkMediaError(imgUrl)}
                        className="relative z-10 w-full h-full object-cover select-none"
                      />
                    </div>
                  );
                })}
              </div>

              {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-[10px] bg-black/50 backdrop-blur-xs px-3 py-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => navigateCarouselSlide(idx)}
                      aria-label={`Photo ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === slideIndex
                          ? "w-2 bg-white"
                          : "w-1.5 bg-white/55 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  trackPinInteraction("MEDIA_EXPAND", pin);
                  onExpandMedia(images, slideIndex);
                }}
                aria-label="Expand image"
                className="absolute bottom-4 right-4 z-20 h-12 w-12 rounded-[16px] bg-black/55 lg:bg-[var(--color-background-card)]/95 hover:bg-black/70 lg:hover:bg-[var(--color-background-card)] text-white lg:text-[var(--color-text-primary)] lg:border lg:border-[var(--color-border)] shadow-[var(--shadow-popover)] backdrop-blur-md inline-flex items-center justify-center transition cursor-pointer"
              >
                <Maximize2 className="w-5 h-5" strokeWidth={2.3} />
              </button>
            </>
          )}
          </div>
        </div>

        {/* =================================================================
            RIGHT / INFO PANEL: ULTRA-CLEAN PINTEREST ANATOMY (Zero Comment Clutter!)
        ================================================================== */}
        <div
          ref={detailsPanelRef}
          className="lg:col-span-6 min-h-0 flex flex-col justify-between lg:h-full lg:max-h-full bg-[var(--color-background-card)] lg:border-l border-[var(--color-border)]"
        >
          {/* 1. Clean Top Action Bar (♡ | 💬 | 📤 | •••  ...  [เข้าชมที่พัก ↗] [บันทึก] [✕]) */}
          <div className="px-3.5 sm:px-5 py-3 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 lg:border-b border-[var(--color-border)]">
            <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleLike(pin.id)}
                className="h-10 px-2 sm:px-2.5 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1 sm:gap-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <Heart
                  className={`w-[21px] h-[21px] ${
                    pin.isLikedByMe
                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                      : ""
                  }`}
                  strokeWidth={2.1}
                />
                {pin.likesCount > 0 && <span>{pin.likesCount}</span>}
              </button>

              <button
                type="button"
                onClick={handleOpenCommentsSheet}
                aria-label={
                  language === "th" ? "เปิดดูความคิดเห็น" : "Open comments"
                }
                className="h-10 px-2 sm:px-2.5 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1 sm:gap-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <MessageCircle className="w-[21px] h-[21px]" strokeWidth={2.1} />
                {totalCommentsCount > 0 && <span>{totalCommentsCount}</span>}
              </button>

              <button
                type="button"
                onClick={handleShareWithFeedback}
                aria-label="Share"
                className="h-10 w-9 sm:w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer shrink-0"
              >
                {justCopied ? (
                  <Check className="w-[20px] h-[20px] text-[var(--color-success)]" />
                ) : (
                  <Share className="w-[20px] h-[20px]" strokeWidth={2.1} />
                )}
              </button>

              {/* Desktop '...' More Options Dropdown */}
              <div className="hidden lg:inline-flex">
                <PinMoreOptionsControl
                  pin={pin}
                  language={language}
                  isSaved={isSaved}
                  onToggleSave={onToggleSave}
                  onSharePin={onSharePin}
                  onHidePin={onHidePin}
                  dropdownAlign="left"
                  iconClassName="w-[20px] h-[20px]"
                  triggerClassName="h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                />
              </div>
            </div>

            <div
              data-swipe-ignore="true"
              className="flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              <Link
                href={`/${pin.hotelSlug}`}
                prefetch={true}
                onClick={handleVisitHotelClick}
                aria-busy={isNavigatingToHotel}
                className={`h-10 px-3 sm:px-3.5 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] sm:text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors shrink-0 ${
                  isNavigatingToHotel ? "opacity-80 pointer-events-none" : ""
                }`}
              >
                <span>
                  {language === "th" ? "เข้าชมที่พัก" : "Visit stay"}
                </span>
                {isNavigatingToHotel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <ArrowUpRight
                    className="w-3.5 h-3.5 shrink-0"
                    strokeWidth={2.2}
                  />
                )}
              </Link>

              <button
                type="button"
                onClick={() => onToggleSave(pin.id)}
                className={`h-10 px-3.5 sm:px-4 rounded-[14px] ty-body font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSaved
                    ? "bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111]"
                    : "bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] !text-white"
                }`}
              >
                {isSaved
                  ? language === "th"
                    ? "บันทึกแล้ว"
                    : "Saved"
                  : language === "th"
                  ? "บันทึก"
                  : "Save"}
              </button>

              <button
                type="button"
                onClick={onClose}
                title={
                  language === "th" ? "ปิดกลับหน้าแรก" : "Close to Home feed"
                }
                aria-label={language === "th" ? "ปิด" : "Close"}
                className="hidden lg:inline-flex h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* 2. Clean Minimal Info Body (Author + Multi-Photo Thumbnail Strip + Title/Desc!) */}
          <div className="px-4 sm:px-5 pt-2 pb-4 lg:py-4 flex-1 min-h-0 lg:overflow-y-auto space-y-3.5">
            <div className="space-y-3">
              {/* Row 1: Property Identity */}
              <Link
                href={`/${pin.hotelSlug}`}
                prefetch={true}
                onClick={handleVisitHotelClick}
                className="inline-flex items-center gap-2.5 min-w-0 group/author"
              >
                {pin.hotelLogoUrl ? (
                  <img
                    src={pin.hotelLogoUrl}
                    alt={hotelName}
                    className="h-7 w-7 lg:h-8 lg:w-8 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] border border-[var(--color-border)]"
                  />
                ) : (
                  <span className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-bold shrink-0">
                    {hotelName[0] || "C"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[13.5px] lg:text-[14px] font-bold text-[var(--color-text-primary)] group-hover/author:underline truncate flex items-center gap-1">
                    <span className="truncate">{hotelName}</span>
                    {pin.hotelVerificationStatus === "VERIFIED" && (
                      <BadgeCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                    )}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
                    {provinceLabel}
                    {pin.nightlyPriceThb
                      ? ` · เริ่มต้น ฿${pin.nightlyPriceThb.toLocaleString()}/คืน`
                      : ""}
                  </p>
                </div>
              </Link>

              {/* Row 2: Pinterest Multi-Photo Squircle Thumbnail Strip + '>' Next Arrow */}
              {images.length > 1 && !pin.videoUrl && (
                <div
                  data-swipe-ignore="true"
                  className="flex items-center gap-1.5"
                >
                  <div
                    ref={thumbnailStripRef}
                    className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar pl-1 py-1 px-0.5"
                  >
                    {images.map((imgUrl, idx) => {
                      const isCurrent = idx === slideIndex;
                      return (
                        <button
                          key={`${imgUrl}-${idx}`}
                          type="button"
                          data-thumb-idx={idx}
                          onClick={() => navigateCarouselSlide(idx)}
                          aria-label={
                            language === "th"
                              ? `ดูภาพที่ ${idx + 1}`
                              : `View photo ${idx + 1}`
                          }
                          className={`relative h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] rounded-[13px] overflow-hidden shrink-0 cursor-pointer transition-all bg-[var(--color-background-muted)] ${
                            isCurrent
                              ? "ring-2 ring-[var(--color-text-primary)] ring-offset-2 ring-offset-[var(--color-background-card)] opacity-100"
                              : "border border-[var(--color-border)] opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={getOptimizedPinImageUrl(imgUrl, "thumb")}
                            srcSet={getOptimizedPinImageSrcSet(imgUrl, "thumb")}
                            sizes={PIN_IMAGE_SIZES.thumb}
                            alt={`${title} ${idx + 1}`}
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            onError={() => handleMarkMediaError(imgUrl)}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigateCarouselSlide((prev) => (prev + 1) % images.length)
                    }
                    aria-label={language === "th" ? "ภาพถัดไป" : "Next photo"}
                    className="h-9 w-9 rounded-[11px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] shrink-0 cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
                  </button>
                </div>
              )}
            </div>

            {/* Pin Title + Expandable Chevron (Matches Pinterest App Image 1!) */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2.5">
                <h1 className="text-[16.5px] lg:text-[19px] font-bold text-[var(--color-text-primary)] leading-snug">
                  {title}
                </h1>

                {description && description !== title && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen((v) => !v)}
                    aria-label={
                      isDescriptionOpen
                        ? "ซ่อนรายละเอียด"
                        : "อ่านรายละเอียดเพิ่มเติม"
                    }
                    className="lg:hidden shrink-0 h-7 w-7 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors mt-0.5"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDescriptionOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {description && description !== title && (
                <p
                  className={`text-[14px] leading-relaxed text-[var(--color-text-secondary)] lg:text-[var(--color-text-primary)] ${
                    isDescriptionOpen ? "block" : "hidden lg:block"
                  }`}
                >
                  {description}
                </p>
              )}

              {pin.semanticTags.length > 0 && (
                <div
                  className={`flex-wrap items-center gap-1.5 pt-1 ${
                    isDescriptionOpen ? "flex" : "hidden lg:flex"
                  }`}
                >
                  {pin.semanticTags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="h-7 px-2.5 rounded-[9px] bg-[var(--color-background-muted)] text-[12px] font-medium text-[var(--color-text-secondary)] inline-flex items-center"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP INLINE COMMENTS SECTION (>= lg ONLY — Never Uses Mobile Bottom Sheet!) */}
            <div
              ref={desktopCommentsSectionRef}
              className="hidden lg:block pt-4 border-t border-[var(--color-border)] space-y-3.5"
            >
              <button
                type="button"
                onClick={() => setIsDesktopCommentsOpen((v) => !v)}
                className="w-full flex items-center justify-between text-left cursor-pointer group/cmhead"
              >
                <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                  {totalCommentsCount > 0
                    ? language === "th"
                      ? `${totalCommentsCount} ความคิดเห็น`
                      : `${totalCommentsCount} ${
                          totalCommentsCount === 1 ? "comment" : "comments"
                        }`
                    : language === "th"
                    ? "ความคิดเห็น"
                    : "Comments"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--color-text-secondary)] group-hover/cmhead:text-[var(--color-text-primary)] transition-transform duration-200 ${
                    isDesktopCommentsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDesktopCommentsOpen && (
                <div className="space-y-3.5">
                  {comments.length === 0 ? (
                    <p className="text-[13.5px] text-[var(--color-text-secondary)] py-2">
                      {language === "th"
                        ? "ยังไม่มีความคิดเห็น · สอบถามรายละเอียดห้องพักหรือพูดคุยเป็นคนแรกได้เลย"
                        : "No comments yet — ask a question about this stay below."}
                    </p>
                  ) : (
                    comments.map((cm) => {
                      const canRemove =
                        isOwnerOfPin || currentUser?.id === cm.userId;

                      return (
                        <div key={`desk-${cm.id}`} className="space-y-2.5 select-text">
                          <div className="flex items-start gap-2.5">
                            {cm.authorAvatar ? (
                              <img
                                src={cm.authorAvatar}
                                alt={cm.authorName}
                                referrerPolicy="no-referrer"
                                className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]"
                              />
                            ) : (
                              <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                                {(cm.authorName[0] || "G").toUpperCase()}
                              </span>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-[13.5px] font-bold text-[var(--color-text-primary)]">
                                  {cm.authorName}
                                </strong>
                                {cm.isHotelOwnerReply && (
                                  <span className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10.5px] font-semibold">
                                    เจ้าของที่พัก
                                  </span>
                                )}
                                <span className="text-[11.5px] text-[var(--color-text-secondary)]">
                                  {formatRelativeCommentDate(
                                    cm.createdAt,
                                    language
                                  )}
                                </span>
                              </div>

                              <p className="text-[14px] leading-snug break-words text-[var(--color-text-primary)] mt-0.5">
                                {cm.body}
                              </p>

                              <div className="mt-1 flex items-center gap-3.5 text-[12px] text-[var(--color-text-secondary)]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo({
                                      id: cm.id,
                                      authorName: cm.authorName,
                                    });
                                    desktopCommentInputRef.current?.focus();
                                  }}
                                  className="font-semibold hover:text-[var(--color-text-primary)] cursor-pointer"
                                >
                                  {language === "th" ? "ตอบกลับ" : "Reply"}
                                </button>

                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteComment(cm.id)}
                                    className="hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>
                                      {language === "th" ? "ลบ" : "Delete"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {cm.replies.length > 0 && (
                            <div className="pl-9 space-y-2">
                              {cm.replies.map((rp) => {
                                const canRemoveReply =
                                  isOwnerOfPin || currentUser?.id === rp.userId;
                                return (
                                  <div
                                    key={`desk-rp-${rp.id}`}
                                    className="flex items-start gap-2"
                                  >
                                    <CornerDownRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0 mt-1" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <strong className="text-[13px] font-bold text-[var(--color-text-primary)]">
                                          {rp.authorName}
                                        </strong>
                                        {rp.isHotelOwnerReply && (
                                          <span className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10.5px] font-semibold">
                                            เจ้าของที่พัก
                                          </span>
                                        )}
                                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                                          {formatRelativeCommentDate(
                                            rp.createdAt,
                                            language
                                          )}
                                        </span>
                                      </div>
                                      <p className="text-[13.5px] leading-snug break-words text-[var(--color-text-primary)] mt-0.5">
                                        {rp.body}
                                      </p>
                                      {canRemoveReply && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteComment(rp.id)}
                                          className="mt-1 text-[11.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>
                                            {language === "th" ? "ลบ" : "Delete"}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP STICKY INLINE COMMENT COMPOSER (>= lg ONLY) */}
          <div className="hidden lg:block shrink-0 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-card)] space-y-2">
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-[10px] bg-[var(--color-background-muted)] text-[12px]">
                <span>
                  กำลังตอบกลับ <strong>{replyingTo.authorName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="font-semibold text-[var(--color-text-primary)] cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            )}

            {showEmojiBar && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={`desk-em-${em}`}
                    type="button"
                    onClick={() => {
                      setCommentText((prev) => `${prev}${em}`);
                      desktopCommentInputRef.current?.focus();
                    }}
                    className="h-8 w-8 rounded-[9px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[15px] cursor-pointer shrink-0"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmitComment}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setShowEmojiBar((v) => !v)}
                aria-label="Toggle emoji bar"
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer shrink-0 transition-colors"
              >
                <Smile className="w-[18px] h-[18px]" />
              </button>

              {currentUser && (
                <UserAvatarCircle user={currentUser} sizeClass="h-8 w-8" />
              )}

              <div className="flex-1 h-10 rounded-[12px] bg-[var(--color-background-muted)]/65 border border-[var(--color-border)] focus-within:bg-[var(--color-background-card)] focus-within:border-[var(--color-border-emphasized)] pl-3.5 pr-1.5 flex items-center gap-1.5 transition-colors">
                <input
                  ref={desktopCommentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    currentUser
                      ? language === "th"
                        ? "เพิ่มความคิดเห็น..."
                        : "Add a comment..."
                      : language === "th"
                      ? "เข้าสู่ระบบเพื่อแสดงความคิดเห็น..."
                      : "Sign in to comment..."
                  }
                  className="flex-1 min-w-0 bg-transparent text-[13.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                />

                {commentText.trim().length > 0 && (
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    aria-label="Send comment"
                    className="h-7 w-7 rounded-[9px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] hover:opacity-90 inline-flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET "YOU MAY ALSO LIKE" 2-COLUMN TIGHT MASONRY RIGHT UNDER TITLE */}
      {relatedPins.length > 0 && (
        <div className="lg:hidden px-1.5 pt-3 pb-[calc(88px+env(safe-area-inset-bottom))] space-y-2.5 bg-[var(--color-background-body)]">
          <h2 className="px-1 text-[15px] font-bold text-[var(--color-text-primary)]">
            {language === "th"
              ? "ที่พักสไตล์ใกล้เคียงที่คุณน่าจะชอบ"
              : "More to explore"}
          </h2>
          <div className="flex gap-1.5 items-start">
            {[0, 1].map((colIdx) => (
              <div key={colIdx} className="flex-1 min-w-0 flex flex-col gap-1.5">
                {relatedPins
                  .slice(0, 14)
                  .filter((_, idx) => idx % 2 === colIdx)
                  .map((relPin, itemIdx) => (
                    <PinterestPinCard
                      key={relPin.id}
                      pin={relPin}
                      language={language}
                      priority={itemIdx < 2}
                      isSaved={
                        savedPinIds.has(relPin.id) || relPin.isSavedByMe
                      }
                      onSelectPin={(next) => onSelectPin?.(next)}
                      onToggleSave={onToggleSave}
                      onSharePin={onSharePin}
                      onHidePin={onHidePin}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* =====================================================================
          MOBILE / TABLET SLIDE-UP COMMENTS BOTTOM SHEET MODAL (< lg ONLY!)
      ====================================================================== */}
      {isCommentsSheetOpen && isMobileViewport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={language === "th" ? "ความคิดเห็น" : "Comments"}
          data-swipe-ignore="true"
          onClick={() => setIsCommentsSheetOpen(false)}
          className="lg:hidden fixed inset-0 z-[85] flex items-end justify-center bg-black/55 animate-fade-in-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[calc(100%-32px)] md:w-[calc(100%-48px)] sm:max-w-[760px] md:max-w-[860px] h-[78dvh] sm:h-[76dvh] rounded-t-[24px] bg-[var(--color-background-popover)] border-t sm:border-x border-[var(--color-border)] flex flex-col justify-between overflow-hidden animate-slide-up-sheet"
          >
            {/* Top Handle + Header (✕ | N comments | 📤) */}
            <div className="shrink-0 pt-2.5 pb-2.5 px-4 sm:px-6 border-b border-[var(--color-border)] space-y-2">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto" />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCommentsSheetOpen(false)}
                  aria-label={language === "th" ? "ปิดหน้าต่างความคิดเห็น" : "Close comments"}
                  className="h-9 w-9 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">
                  {totalCommentsCount > 0
                    ? language === "th"
                      ? `${totalCommentsCount} ความคิดเห็น`
                      : `${totalCommentsCount} ${
                          totalCommentsCount === 1 ? "comment" : "comments"
                        }`
                    : language === "th"
                    ? "ความคิดเห็น"
                    : "Comments"}
                </h2>

                <button
                  type="button"
                  onClick={handleShareWithFeedback}
                  aria-label={language === "th" ? "แชร์โพสต์" : "Share"}
                  className="h-9 w-9 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {justCopied ? (
                    <Check className="w-4 h-4 text-[var(--color-success)]" />
                  ) : (
                    <Share className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Threaded Comments List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-1.5">
                  <MessageCircle className="w-7 h-7 text-[var(--color-text-secondary)]" />
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {language === "th"
                      ? "ยังไม่มีความคิดเห็น"
                      : "No comments yet"}
                  </p>
                  <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                    {language === "th"
                      ? "สอบถามรายละเอียดห้องพักหรือพูดคุยเป็นคนแรกได้เลย"
                      : "Ask a question or share your thoughts below."}
                  </p>
                </div>
              ) : (
                comments.map((cm) => {
                  const canRemove =
                    isOwnerOfPin || currentUser?.id === cm.userId;

                  return (
                    <div key={cm.id} className="space-y-2.5 select-text">
                      <div className="flex items-start gap-2.5">
                        {cm.authorAvatar ? (
                          <img
                            src={cm.authorAvatar}
                            alt={cm.authorName}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]"
                          />
                        ) : (
                          <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                            {(cm.authorName[0] || "G").toUpperCase()}
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-[13.5px] font-bold text-[var(--color-text-primary)]">
                              {cm.authorName}
                            </strong>
                            {cm.isHotelOwnerReply && (
                              <span className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10.5px] font-semibold">
                                เจ้าของที่พัก
                              </span>
                            )}
                            <span className="text-[11.5px] text-[var(--color-text-secondary)]">
                              {formatRelativeCommentDate(
                                cm.createdAt,
                                language
                              )}
                            </span>
                          </div>

                          <p className="text-[14px] leading-snug break-words text-[var(--color-text-primary)] mt-0.5">
                            {cm.body}
                          </p>

                          <div className="mt-1.5 flex items-center gap-3.5 text-[12px] text-[var(--color-text-secondary)]">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({
                                  id: cm.id,
                                  authorName: cm.authorName,
                                });
                                commentInputRef.current?.focus();
                              }}
                              className="font-semibold hover:text-[var(--color-text-primary)] cursor-pointer"
                            >
                              {language === "th" ? "ตอบกลับ" : "Reply"}
                            </button>

                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => onDeleteComment(cm.id)}
                                className="hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>
                                  {language === "th" ? "ลบ" : "Delete"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {cm.replies.length > 0 && (
                        <div className="pl-9 space-y-2.5">
                          {cm.replies.map((rp) => {
                            const canRemoveReply =
                              isOwnerOfPin || currentUser?.id === rp.userId;
                            return (
                              <div
                                key={rp.id}
                                className="flex items-start gap-2"
                              >
                                <CornerDownRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-[13px] font-bold text-[var(--color-text-primary)]">
                                      {rp.authorName}
                                    </strong>
                                    {rp.isHotelOwnerReply && (
                                      <span className="inline-flex items-center rounded-[7px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[10.5px] font-semibold">
                                        เจ้าของที่พัก
                                      </span>
                                    )}
                                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                                      {formatRelativeCommentDate(
                                        rp.createdAt,
                                        language
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-[13.5px] leading-snug break-words text-[var(--color-text-primary)] mt-0.5">
                                    {rp.body}
                                  </p>
                                  {canRemoveReply && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteComment(rp.id)}
                                      className="mt-1 text-[11.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>
                                        {language === "th" ? "ลบ" : "Delete"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Quick-Prompt Squircle Chips + Squircle Composer (Matches Image 2!) */}
            <div className="shrink-0 px-4 sm:px-6 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] bg-[var(--color-background-popover)] space-y-2.5">
              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-[10px] bg-[var(--color-background-muted)] text-[12px]">
                  <span>
                    กำลังตอบกลับ <strong>{replyingTo.authorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="font-semibold text-[var(--color-text-primary)] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}

              {showEmojiBar && (
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setCommentText((prev) => `${prev}${em}`);
                        commentInputRef.current?.focus();
                      }}
                      className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[16px] cursor-pointer shrink-0"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleSubmitComment}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiBar((v) => !v)}
                  aria-label="Toggle emoji bar"
                  className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer shrink-0 transition-colors"
                >
                  <Smile className="w-[18px] h-[18px]" />
                </button>

                {currentUser && (
                  <UserAvatarCircle user={currentUser} sizeClass="h-8 w-8" />
                )}

                <div className="flex-1 h-11 rounded-[14px] bg-[var(--color-background-muted)]/65 border border-[var(--color-border)] focus-within:bg-[var(--color-background-card)] focus-within:border-[var(--color-border-emphasized)] pl-3.5 pr-1.5 flex items-center gap-1.5 transition-colors">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      currentUser
                        ? language === "th"
                          ? "เพิ่มความคิดเห็น..."
                          : "Add a comment..."
                        : language === "th"
                        ? "เข้าสู่ระบบเพื่อแสดงความคิดเห็น..."
                        : "Sign in to comment..."
                    }
                    className="flex-1 min-w-0 bg-transparent text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                  />

                  {commentText.trim().length > 0 && (
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      aria-label="Send comment"
                      className="h-8 w-8 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] hover:opacity-90 inline-flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
