"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CornerDownRight,
  EyeOff,
  Flag,
  Heart,
  Images,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Share,
  Smile,
  Star,
  TicketPercent,
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
  CouponDealDto,
  HotelPostSummaryDto,
  PinActiveCouponDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";
import { UniversalVideoPlayer } from "@/components/media/UniversalVideoPlayer";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";
import { ShareStayModal } from "@/components/shared/ShareStayModal";
import { InstagramEmojiPicker } from "@/components/shared/InstagramEmojiPicker";
import { useHotelApp } from "@/components/HotelAppShell";
import { getProvinceById } from "@/data/thailandProvinces";
import { getCouponTimeInfo } from "@/lib/couponHelpers";
import {
  clearLastClickedPinOrigin,
  getLastClickedPinOrigin,
  setLastClickedPinOrigin,
} from "@/lib/pinOriginStore";

export { clearLastClickedPinOrigin };
import { getDealDiscountHeadline } from "@/components/home/VerticalCouponCard";
import { DealHeroCouponSlide } from "@/components/home/DealHeroCouponSlide";
import { DealTermsModal } from "@/components/home/DealTermsModal";
import { PlaceProfileHubSection } from "@/components/home/PlaceProfileHubSection";
import { PlaceCategoryCrest } from "@/components/shared/PlaceCategoryCrest";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { syncPinLikeState } from "@/lib/placeLikeStore";

const DealDetailInlineMap = dynamic(
  () =>
    import("@/components/home/DealDetailInlineMap").then(
      (mod) => mod.DealDetailInlineMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[340px] bg-[var(--color-background-muted)] animate-pulse" />
    ),
  }
);

function mapPinCouponToDealDto(
  c: PinActiveCouponDto,
  pin: PinFeedItemDto,
  isClaimed: boolean
): CouponDealDto {
  return {
    id: c.id,
    hotelId: pin.hotelId,
    hotelSlug: pin.hotelSlug,
    hotelNameTh: pin.hotelNameTh,
    hotelNameEn: pin.hotelNameEn,
    hotelLogoUrl: pin.hotelLogoUrl,
    hotelVerificationStatus: pin.hotelVerificationStatus,
    provinceId: pin.provinceId,
    provinceNameTh: pin.provinceNameTh,
    provinceNameEn: pin.provinceNameEn,
    stayStyles: pin.stayStyles,
    code: c.code,
    titleTh: c.titleTh,
    titleEn: c.titleEn,
    descriptionTh: c.descriptionTh,
    descriptionEn: c.descriptionEn,
    coverImageUrl: c.coverImageUrl || pin.coverImageUrl,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minSpendThb: c.minSpendThb,
    maxDiscountThb: c.maxDiscountThb,
    totalQuota: c.totalQuota,
    claimedCount: c.claimedCount,
    usedCount: 0,
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    isFeaturedDeal: true,
    isActive: true,
    isClaimedByMe: isClaimed,
    usedAt: null,
  };
}

function SparklingCouponIconButton({
  hasUnclaimed,
  sizeClass,
  activeSurfaceClass,
  claimedSurfaceClass,
  ariaLabel,
  title,
  onClick,
  onPointerDown,
  onTouchStart,
}: {
  hasUnclaimed: boolean;
  sizeClass: string;
  activeSurfaceClass: string;
  claimedSurfaceClass: string;
  ariaLabel: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`relative ${sizeClass} inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
        hasUnclaimed ? activeSurfaceClass : claimedSurfaceClass
      }`}
    >
      {hasUnclaimed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <span className="animate-coupon-sheen-loop absolute -inset-y-3 left-0 w-1/2 bg-white/40" />
        </span>
      )}

      {hasUnclaimed ? (
        <svg
          viewBox="0 0 24 24"
          className="relative z-[1] w-[20px] h-[20px]"
          fill="none"
          aria-hidden="true"
        >
          {/* Notched ticket silhouette with periodic wiggle */}
          <g className="animate-ticket-attention">
            <path
              d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2.1a2.1 2.1 0 0 0 0 4.2v2.7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2.7a2.1 2.1 0 0 0 0-4.2V7.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 14.2 14.5 9.8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="9.6" cy="9.9" r="0.95" fill="currentColor" />
            <circle cx="14.4" cy="14.1" r="0.95" fill="currentColor" />
          </g>
          {/* Twinkling 4-point sparkles */}
          <path
            d="M19.2 1.8l.45 1.35 1.35.45-1.35.45-.45 1.35-.45-1.35-1.35-.45 1.35-.45.45-1.35Z"
            fill="currentColor"
            className="animate-sparkle-1"
          />
          <path
            d="M3.6 17.8l.35 1.05 1.05.35-1.05.35-.35 1.05-.35-1.05-1.05-.35 1.05-.35.35-1.05Z"
            fill="currentColor"
            className="animate-sparkle-2"
          />
        </svg>
      ) : (
        <TicketPercent
          className="relative z-[1] w-[19px] h-[19px]"
          strokeWidth={1.95}
        />
      )}
    </button>
  );
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
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
        className={triggerClassName}
      >
        <MoreHorizontal className={iconClassName} />
      </button>

      {feedbackToast &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[96] rounded-[12px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] px-4 py-2 text-[13px] font-semibold shadow-[var(--shadow-popover)] pointer-events-none">
            {feedbackToast}
          </div>,
          document.body
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
                  ? "นำออกจากทริป"
                  : "Remove from board"
                : language === "th"
                ? "บันทึกเข้าทริป"
                : "Save to trip"}
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

      {/* MOBILE / TABLET SLIDE-UP BOTTOM SHEET (< lg — Portaled to document.body to escape overflow-hidden & will-change-transform!) */}
      {isOpen &&
        isMobileSheet &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
            data-swipe-ignore="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 animate-fade-in-backdrop"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] space-y-3 animate-slide-up-sheet"
            >
              <div className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto" />

              <p className="text-[13px] font-medium text-[var(--color-text-secondary)] pt-1">
                {language === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
              </p>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleSave(pin.id);
                    setIsOpen(false);
                  }}
                  className="w-full h-12 rounded-[12px] px-1 hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[16px] font-bold text-[var(--color-text-primary)] cursor-pointer"
                >
                  <span>
                    {isSaved
                      ? language === "th"
                        ? "นำออกจากทริป"
                        : "Remove from board"
                      : language === "th"
                      ? "บันทึกเข้าทริป"
                      : "Save to trip"}
                  </span>
                  <Bookmark
                    className={`w-4 h-4 shrink-0 ${isSaved ? "fill-[var(--color-promo)] text-[var(--color-promo)]" : ""}`}
                  />
                </button>

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
          </div>,
          document.body
        )}
    </div>
  );
}

export function formatAirbnbCardHeadline(
  pin: PinFeedItemDto,
  language: LanguageCode
): string {
  const isTh = language === "th";
  const corpus = [
    pin.roomNameTh,
    pin.roomNameEn,
    pin.titleTh,
    pin.titleEn,
    ...pin.stayStyles,
  ]
    .filter(Boolean)
    .join(" ");

  let typeTh = "ที่พัก";
  let typeEn = "Stay";

  if (/พูลวิลล่า|pool\s*villa/i.test(corpus)) {
    typeTh = "พูลวิลล่า";
    typeEn = "Pool villa";
  } else if (/แกลมปิ้ง|เต็นท์|โดม|glamping|tent|dome/i.test(corpus)) {
    typeTh = "แกลมปิ้ง";
    typeEn = "Glamping";
  } else if (/วิลล่า|villa|a-frame|เอเฟรม/i.test(corpus)) {
    typeTh = "วิลล่า";
    typeEn = "Villa";
  } else if (/ออนเซ็น|onsen/i.test(corpus)) {
    typeTh = "ที่พักออนเซ็น";
    typeEn = "Onsen stay";
  } else if (/บังกะโล|bungalow|cottage|เคบิน|cabin/i.test(corpus)) {
    typeTh = "บังกะโล";
    typeEn = "Cabin";
  } else if (/สวีท|suite/i.test(corpus)) {
    typeTh = "ห้องสวีท";
    typeEn = "Suite";
  } else if (/รีสอร์ท|resort/i.test(corpus)) {
    typeTh = "รีสอร์ท";
    typeEn = "Resort";
  } else if (pin.stayStyles.includes("beach")) {
    typeTh = "ที่พักริมทะเล";
    typeEn = "Beach stay";
  } else if (pin.stayStyles.includes("mountain")) {
    typeTh = "ที่พักภูเขา";
    typeEn = "Mountain stay";
  }

  const province = isTh ? pin.provinceNameTh : pin.provinceNameEn;
  if (!province) return isTh ? typeTh : typeEn;
  return isTh ? `${typeTh}ใน${province}` : `${typeEn} in ${province}`;
}

export interface PinterestPinCardProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  priority?: boolean;
  onSelectPin: (pin: PinFeedItemDto) => void;
  onToggleSave: (pinId: string) => void;
  onToggleLike?: (pinId: string) => void;
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
}: PinterestPinCardProps) {
  const isTh = language === "th";
  const title = isTh ? pin.titleTh : pin.titleEn;
  const headline = formatAirbnbCardHeadline(pin, language);
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

  // Deduplicated photo set for in-card swipe carousel
  const cardImages = useMemo(() => {
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
        // fallback to raw URL string
      }
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(clean);
    }
    return list.length > 0 ? list : [pin.coverImageUrl];
  }, [pin.mediaUrls, pin.coverImageUrl]);

  const hasCarousel = !isInlineMp4Video && cardImages.length > 1;
  const [cardSlideIndex, setCardSlideIndex] = useState(0);
  const [isCardCarouselAnimated, setIsCardCarouselAnimated] = useState(false);
  const cardTrackRef = useRef<HTMLDivElement | null>(null);
  const cardSlideIdxRef = useRef(0);
  cardSlideIdxRef.current = cardSlideIndex;
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    setIsCardCarouselAnimated(false);
    setCardSlideIndex(0);
  }, [pin.id]);

  const goToCardSlide = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(cardImages.length - 1, nextIdx));
    setIsCardCarouselAnimated(true);
    setCardSlideIndex((prev) => {
      if (clamped !== prev) {
        trackPinInteraction("CAROUSEL_SWIPE", pin, {
          carouselDepth: clamped + 1,
        });
      }
      return clamped;
    });
  };

  // 120fps Horizontal In-Card Photo-Set Swipe (Mobile/Touch — lets users browse multi-photo cards directly in feed!)
  useEffect(() => {
    const el = mediaBoxRef.current;
    if (!el || !hasCarousel || typeof window === "undefined") return;

    let state: {
      startX: number;
      startY: number;
      lastX: number;
      lastTime: number;
      velocityX: number;
      locked: "horizontal" | "vertical" | null;
    } | null = null;

    const count = cardImages.length;

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button, a")) return;
      const t = e.touches[0];
      if (!t) return;
      const now = performance.now();
      state = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastTime: now,
        velocityX: 0,
        locked: null,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!state) return;
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

      if (state.locked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.15) {
          state.locked = "horizontal";
        } else {
          state.locked = "vertical";
        }
      }

      if (state.locked === "horizontal") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const track = cardTrackRef.current;
        if (!track) return;
        const curr = cardSlideIdxRef.current;
        const atEdge = (curr === 0 && dx > 0) || (curr === count - 1 && dx < 0);
        const effectiveDx = atEdge ? dx * 0.26 : dx;
        track.style.transition = "none";
        track.style.transform = `translate3d(calc(${-curr * 100}% + ${effectiveDx}px), 0, 0)`;
      }
    };

    const finishSwipe = (e: TouchEvent) => {
      if (!state) return;
      const st = state;
      state = null;
      if (st.locked !== "horizontal") return;

      suppressClickUntilRef.current = Date.now() + 300;
      const track = cardTrackRef.current;
      const boxW = el.clientWidth || 180;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - st.startX : 0;
      const vx = st.velocityX;
      const curr = cardSlideIdxRef.current;

      let targetIdx = curr;
      if ((dx < -boxW * 0.22 || vx < -0.3) && curr < count - 1) {
        targetIdx = curr + 1;
      } else if ((dx > boxW * 0.22 || vx > 0.3) && curr > 0) {
        targetIdx = curr - 1;
      }

      if (track) {
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = `translate3d(${-targetIdx * 100}%, 0, 0)`;
      }
      goToCardSlide(targetIdx);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishSwipe, { passive: true });
    el.addEventListener("touchcancel", finishSwipe, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishSwipe);
      el.removeEventListener("touchcancel", finishSwipe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.id, hasCarousel, cardImages.length]);

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
    if (Date.now() < suppressClickUntilRef.current) return;
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const rect = mediaBoxRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setLastClickedPinOrigin({
          pinId: pin.id,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          timestamp: Date.now(),
        });
      }
    } else {
      clearLastClickedPinOrigin();
    }
    onSelectPin(pin);
  };

  const maxDots = 5;
  const dotStart =
    cardImages.length <= maxDots
      ? 0
      : Math.max(
          0,
          Math.min(
            cardImages.length - maxDots,
            cardSlideIndex - Math.floor(maxDots / 2)
          )
        );
  const dotEnd = Math.min(cardImages.length, dotStart + maxDots);

  return (
    <article className="w-full select-none">
      <div
        ref={mediaBoxRef}
        onClick={handleCardClick}
        onMouseEnter={() => preloadPinHeroImages(pin)}
        onTouchStart={() => preloadPinHeroImages(pin)}
        style={hasCarousel ? { touchAction: "pan-y" } : undefined}
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
        ) : hasCarousel ? (
          <>
            <div
              ref={cardTrackRef}
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translate3d(${-cardSlideIndex * 100}%, 0, 0)`,
                transition: isCardCarouselAnimated
                  ? "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : "none",
              }}
            >
              {cardImages.map((imgUrl, idx) => (
                <div
                  key={`${pin.id}-slide-${idx}`}
                  className="relative h-full w-full shrink-0 overflow-hidden"
                >
                  <img
                    src={getOptimizedPinImageUrl(imgUrl, "card")}
                    srcSet={getOptimizedPinImageSrcSet(imgUrl, "card")}
                    sizes={PIN_IMAGE_SIZES.card}
                    alt={idx === 0 ? title : `${title} (${idx + 1})`}
                    loading={
                      (idx === 0 && priority) || idx <= cardSlideIndex + 1
                        ? "eager"
                        : "lazy"
                    }
                    fetchPriority={idx === 0 && priority ? "high" : "auto"}
                    decoding={idx === 0 && priority ? "sync" : "async"}
                    draggable={false}
                    className="h-full w-full object-cover object-center select-none"
                  />
                </div>
              ))}
            </div>

            {cardSlideIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToCardSlide(cardSlideIndex - 1);
                }}
                aria-label={isTh ? "ภาพก่อนหน้า" : "Previous photo"}
                className="hidden lg:inline-flex opacity-0 group-hover:opacity-100 absolute left-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-[9px] bg-white/90 hover:bg-white dark:bg-[#222222]/90 dark:hover:bg-[#222222] text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] items-center justify-center transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}

            {cardSlideIndex < cardImages.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToCardSlide(cardSlideIndex + 1);
                }}
                aria-label={isTh ? "ภาพถัดไป" : "Next photo"}
                className="hidden lg:inline-flex opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-[9px] bg-white/90 hover:bg-white dark:bg-[#222222]/90 dark:hover:bg-[#222222] text-[#222222] dark:text-[#f5f5f5] shadow-[var(--shadow-popover)] items-center justify-center transition-opacity cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}

            <div className="pointer-events-none absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center gap-1">
              {cardImages.slice(dotStart, dotEnd).map((_, relIdx) => {
                const realIdx = dotStart + relIdx;
                const isActive = realIdx === cardSlideIndex;
                return (
                  <span
                    key={`dot-${realIdx}`}
                    className={`rounded-full transition-colors ${
                      isActive
                        ? "h-1.5 w-1.5 bg-white"
                        : "h-[5px] w-[5px] bg-white/55"
                    }`}
                  />
                );
              })}
            </div>
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
      </div>

      {/* Clean Airbnb 2-Line Caption Left + Bookmark Save Button Right */}
      <div className="pt-2 pb-0.5 px-0.5 flex items-start justify-between gap-2">
        <div
          onClick={handleCardClick}
          className="min-w-0 flex-1 space-y-0.5 cursor-pointer"
        >
          <p className="text-[13.5px] leading-snug font-semibold text-[var(--color-text-primary)] truncate">
            {headline}
          </p>

          <p className="text-[12.5px] leading-snug text-[var(--color-text-secondary)] flex items-center gap-1 truncate tabular-nums">
            {pin.nightlyPriceThb ? (
              <span>
                ฿{pin.nightlyPriceThb.toLocaleString()} /{" "}
                {isTh ? "คืน" : "night"}
              </span>
            ) : null}
            {pin.nightlyPriceThb && pin.hotelRatingAvg > 0 && (
              <span aria-hidden="true">·</span>
            )}
            {pin.hotelRatingAvg > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[var(--color-text-secondary)]">
                <Star className="w-3 h-3 fill-current shrink-0" />
                <span>{pin.hotelRatingAvg.toFixed(1)}</span>
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(pin.id);
          }}
          aria-label={
            isSaved
              ? isTh
                ? "นำออกจากทริป"
                : "Remove from board"
              : isTh
              ? "บันทึกเข้าทริป"
              : "Save to trip"
          }
          title={
            isSaved
              ? isTh
                ? "บันทึกแล้ว"
                : "Saved"
              : isTh
              ? "บันทึก"
              : "Save"
          }
          className={`h-8 w-8 -mr-1 -mt-0.5 rounded-[9px] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[var(--color-background-muted)] ${
            isSaved
              ? "text-[var(--color-promo)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Bookmark
            className={`w-[18px] h-[18px] ${isSaved ? "fill-current" : ""}`}
            strokeWidth={1.9}
          />
        </button>
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
  const isTh = language === "th";
  const title = isTh ? pin.titleTh : pin.titleEn;
  const description = isTh ? pin.descriptionTh : pin.descriptionEn;
  const captionText = (description || title || "").trim();
  const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel = isTh ? pin.provinceNameTh : pin.provinceNameEn;
  const heroAspectCss = resolveAspectRatioCss(pin.aspectRatio);
  const coverSource =
    pin.mediaUrls.length > 0 ? pin.mediaUrls[0] : pin.coverImageUrl;

  return (
    <div className="w-full px-1.5 sm:px-3 pt-1.5 sm:pt-2.5 bg-[var(--color-background-body)] select-none pointer-events-none">
      <div
        style={{ aspectRatio: heroAspectCss }}
        className="relative w-full max-h-[76svh] mx-auto rounded-[24px] sm:rounded-[26px] bg-[var(--color-background-muted)] overflow-hidden"
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
          alt={title || hotelName}
          loading="eager"
          decoding="sync"
          draggable={false}
          className="relative z-[1] w-full h-full object-cover select-none"
        />

        {/* Grouped Bottom-Right Coupon + Save + More Preview Badges */}
        <div
          className={`absolute ${
            pin.videoUrl ? "bottom-14" : "bottom-3"
          } right-3 z-20 flex items-center gap-2`}
        >
          {pin.activeCoupons.length > 0 && (
            <span className="h-10 w-10 rounded-[12px] bg-[var(--color-promo)] !text-white inline-flex items-center justify-center">
              <TicketPercent className="w-[19px] h-[19px]" strokeWidth={2} />
            </span>
          )}
          <span
            className={`h-10 w-10 rounded-[12px] inline-flex items-center justify-center ${
              isSaved
                ? "bg-[var(--color-promo)] !text-white"
                : "bg-black/50 text-white backdrop-blur-md"
            }`}
          >
            <Bookmark
              className={`w-[19px] h-[19px] ${isSaved ? "fill-current" : ""}`}
              strokeWidth={2.1}
            />
          </span>
          <span className="h-10 w-10 rounded-[12px] bg-black/50 text-white backdrop-blur-md inline-flex items-center justify-center">
            <MoreHorizontal className="w-5 h-5" />
          </span>
        </div>
      </div>

      <div className="px-3.5 sm:px-5 pt-3 pb-4 space-y-2.5 bg-[var(--color-background-body)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 -ml-1.5">
            <span className="h-10 w-10 rounded-[12px] inline-flex items-center justify-center text-[var(--color-text-primary)]">
              <Heart className="w-[22px] h-[22px]" strokeWidth={2} />
            </span>
            <span className="h-10 px-2 rounded-[12px] inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text-primary)] tabular-nums">
              <MessageCircle className="w-[21px] h-[21px]" strokeWidth={2} />
              {pin.commentsCount > 0 && <span>{pin.commentsCount}</span>}
            </span>
            <span className="h-10 w-10 rounded-[12px] inline-flex items-center justify-center text-[var(--color-text-primary)]">
              <Share className="w-[20px] h-[20px]" strokeWidth={2} />
            </span>
          </div>

          <span className="h-9 px-4 rounded-[10px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
            <span>{isTh ? "เข้าชมที่พัก" : "Visit stay"}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          </span>
        </div>

        <div className="inline-flex items-center gap-2.5 min-w-0 pt-0.5">
          {pin.hotelLogoUrl ? (
            <img
              src={pin.hotelLogoUrl}
              alt={hotelName}
              className="h-7 w-7 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
            />
          ) : (
            <span className="h-7 w-7 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-semibold shrink-0">
              {hotelName[0] || "C"}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1">
              <span className="truncate">{hotelName}</span>
              {pin.hotelVerificationStatus === "VERIFIED" && (
                <BadgeCheck className="w-3.5 h-3.5 text-[var(--color-text-primary)] shrink-0" />
              )}
            </p>
            <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
              {provinceLabel}
              {pin.nightlyPriceThb
                ? ` · ฿${pin.nightlyPriceThb.toLocaleString()}/${
                    isTh ? "คืน" : "night"
                  }`
                : ""}
            </p>
          </div>
        </div>

        {captionText && (
          <p className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
            {captionText}
          </p>
        )}
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
  /**
   * Below-the-fold footer behavior:
   * - `"discovery"` (`/` & `/style/[slug]`): Cascading 6-tier vertical grid (Mobile 2 cols inside overlay; Desktop 5 cols inline below)
   * - `"property-only"` (`/explore`, `/trip`, `/{hotelSlug}`): NO cross-hotel rabbit hole; shows THIS stay's own blog posts/stories!
   */
  detailFooterMode?: "discovery" | "property-only";
  hotelPosts?: HotelPostSummaryDto[];
  ownerFeedPosts?: HotelPostSummaryDto[];
  ownerBlogs?: HotelPostSummaryDto[];
  nearbyPlaces?: PinFeedItemDto[];
  /** Strict 1-Hop Lock: true when user opened a Nearby Place from another card -> hides Nearby row! */
  isNearbyHop?: boolean;
  /** Name of the previous root place for the prominent "← กลับไป [ชื่อเดิม]" back button */
  backTargetName?: string | null;
  /** True when mounted as the Top 3:4 Place Hero directly on `/{slug}` (no duplicate below-fold hub or mobile dock!) */
  profileHeroMode?: boolean;
  /** Optional smooth in-page primary CTA handler in profileHeroMode (e.g., scroll to #section-rooms) */
  onPrimaryProfileAction?: () => void;
  primaryProfileActionLabel?: string | null;
  /** Hides the Hero stage while the cross-route 3D flip is flying into it */
  hideHeroStageForFlip?: boolean;
  /** Signals measured `[data-place-hero-stage="true"]` rect back to the root flip overlay */
  onHeroStageMeasured?: (rect: {
    left: number;
    top: number;
    width: number;
    height: number;
    radius: number;
  }) => void;
  prevPinPreview?: PinFeedItemDto | null;
  nextPinPreview?: PinFeedItemDto | null;
  mobileOverlayMode?: boolean;
  canStepBack?: boolean;
  restoreScrollY?: number | null;
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
  detailFooterMode = "discovery",
  hotelPosts = [],
  ownerFeedPosts,
  ownerBlogs,
  nearbyPlaces = [],
  isNearbyHop = false,
  backTargetName = null,
  profileHeroMode = false,
  onPrimaryProfileAction,
  primaryProfileActionLabel = null,
  hideHeroStageForFlip = false,
  onHeroStageMeasured,
  prevPinPreview = null,
  nextPinPreview = null,
  mobileOverlayMode = false,
  canStepBack = false,
  restoreScrollY = null,
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
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
  const [isCouponPopoverOpen, setIsCouponPopoverOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hasMountedMapSlide, setHasMountedMapSlide] = useState(false);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
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

  // Lock body scroll on legacy overlay mode or when a modal/sheet is open!
  useBodyScrollLock(
    (mobileOverlayMode && isMobileViewport) ||
      (isCommentsSheetOpen && isMobileViewport) ||
      isCouponPopoverOpen ||
      isTermsModalOpen ||
      isShareModalOpen
  );

  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // Report exact Hero stage rect to the root 3D Flip overlay when mounted as `/{slug}` Top Hero
  useIsomorphicLayoutEffect(() => {
    if (!profileHeroMode || !onHeroStageMeasured) return;
    const el = mediaStageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width >= 40 && rect.height >= 40) {
      const computedRadius = parseFloat(window.getComputedStyle(el).borderRadius);
      onHeroStageMeasured({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        radius:
          Number.isFinite(computedRadius) && computedRadius > 0
            ? computedRadius
            : 20,
      });
    }
  }, [profileHeroMode, onHeroStageMeasured, pin.id]);

  // Toggle mobile/tablet edge-to-edge layout synchronously BEFORE paint so parent feed gutters never jump on dismiss
  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined" || mobileOverlayMode || profileHeroMode)
      return;
    document.documentElement.dataset.mobilePinOpen = "true";
    return () => {
      delete document.documentElement.dataset.mobilePinOpen;
    };
  }, [mobileOverlayMode, profileHeroMode]);

  // Synchronously reset swipe & carousel tracks BEFORE browser paint whenever `pin.id` changes (Zero Flash!)
  useIsomorphicLayoutEffect(() => {
    if (swipeCommitTimerRef.current !== null) {
      window.clearTimeout(swipeCommitTimerRef.current);
      swipeCommitTimerRef.current = null;
    }
    setIsCarouselAnimated(false);
    setSlideIndex(0);
    setHasMountedMapSlide(false);
    setIsCommentsSheetOpen(false);
    setIsCouponPopoverOpen(false);
    setIsTermsModalOpen(false);
    setClaimingCouponId(null);
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

    const targetScrollTop =
      typeof restoreScrollY === "number" && restoreScrollY > 0
        ? restoreScrollY
        : 0;

    if (mobileOverlayMode) {
      if (overlayRef.current) overlayRef.current.scrollTop = targetScrollTop;
      const modalScroller = overlayRef.current?.closest(
        ".overflow-y-auto"
      ) as HTMLElement | null;
      if (modalScroller && modalScroller !== overlayRef.current) {
        modalScroller.scrollTop = targetScrollTop;
      }
    } else if (typeof window !== "undefined") {
      window.scrollTo({
        top: targetScrollTop,
        behavior: "instant" as ScrollBehavior,
      });
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

  // Close Comments Sheet / Stay Coupons / Terms Modal on Escape
  useEffect(() => {
    if (!isCommentsSheetOpen && !isCouponPopoverOpen && !isTermsModalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCommentsSheetOpen(false);
        setIsCouponPopoverOpen(false);
        setIsTermsModalOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isCommentsSheetOpen, isCouponPopoverOpen, isTermsModalOpen]);

  // Pinterest-style FLIP expansion animation from the clicked card box -> full hero stage
  useIsomorphicLayoutEffect(() => {
    const origin = getLastClickedPinOrigin();
    if (
      !origin ||
      origin.pinId !== pin.id ||
      Date.now() - origin.timestamp > 700
    ) {
      return;
    }
    clearLastClickedPinOrigin();

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

  // Unified Swipeable Deck: Slide 0 = Designed Coupon | Slides 1..N = Property Video & Photos | Last Slide = Interactive Map
  const stageSlides = useMemo(() => {
    type StageSlide =
      | { kind: "coupon"; id: string }
      | { kind: "video"; id: string; videoUrl: string }
      | { kind: "photo"; id: string; url: string; photoIdx: number }
      | { kind: "map"; id: string };

    const deck: StageSlide[] = [{ kind: "coupon", id: `${pin.id}-coupon` }];
    if (pin.videoUrl) {
      deck.push({
        kind: "video",
        id: `${pin.id}-video`,
        videoUrl: pin.videoUrl,
      });
    }
    images.forEach((url, idx) => {
      deck.push({
        kind: "photo",
        id: `${pin.id}-photo-${idx}`,
        url,
        photoIdx: idx,
      });
    });
    deck.push({ kind: "map", id: `${pin.id}-map` });
    return deck;
  }, [pin.id, pin.videoUrl, images]);

  const totalSlides = stageSlides.length;
  const hasPlacePromo = Boolean(
    pin.promoHeadlineTh?.trim() ||
      pin.promoHeadlineEn?.trim() ||
      pin.activeCoupons.length > 0 ||
      pin.promoCode ||
      pin.promoDealPriceThb
  );
  const hasVideoSlide = Boolean(pin.videoUrl);
  const videoSlideIndex = hasVideoSlide ? 1 : -1;
  const firstPhotoSlideIndex = hasVideoSlide ? 2 : 1;
  const mapSlideIndex = totalSlides - 1;

  useEffect(() => {
    if (slideIndex >= totalSlides) {
      setSlideIndex(Math.max(0, totalSlides - 1));
    }
    if (slideIndex === mapSlideIndex) {
      setHasMountedMapSlide(true);
    }
  }, [slideIndex, totalSlides, mapSlideIndex]);

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
      const clamped = Math.max(0, Math.min(totalSlides - 1, resolved));
      if (clamped === mapSlideIndex) {
        setHasMountedMapSlide(true);
      }
      if (clamped !== prev && totalSlides > 1) {
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
          if (strip && activeThumb && strip.scrollWidth > strip.clientWidth) {
            const targetLeft = Math.max(
              0,
              Math.min(
                strip.scrollWidth - strip.clientWidth,
                activeThumb.offsetLeft +
                  activeThumb.offsetWidth / 2 -
                  strip.clientWidth / 2
              )
            );
            strip.scrollTo({ left: targetLeft, behavior: "smooth" });
          }
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
      if (
        (e.target as HTMLElement | null)?.closest(
          "button, a, [data-swipe-ignore='true']"
        )
      ) {
        return;
      }
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

      const { imagesCount } = gestureCallbacksRef.current;
      const isMultiPhoto = imagesCount > 1;

      // Prevent diagonal thumb arcs from scrolling the outer page vertically before horizontal lock commits
      if (
        state.locked === null &&
        isMultiPhoto &&
        Math.abs(dx) > 2 &&
        Math.abs(dx) >= Math.abs(dy) * 0.8
      ) {
        if (e.cancelable) e.preventDefault();
      }

      if (state.locked === null && (Math.abs(dx) > 5 || Math.abs(dy) > 6)) {
        if (dy > 0 && state.atTop && Math.abs(dy) > Math.abs(dx) * 1.15) {
          state.locked = "pull-down";
        } else if (isMultiPhoto && Math.abs(dx) >= Math.abs(dy) * 0.85) {
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
        if (dy >= 64) {
          setIsPullingDown(false);
          gestureCallbacksRef.current.handleStepBack();
          return;
        }
        setIsPullingDown(false);
        setPullDownOffset(0);
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
      const { imagesCount } = gestureCallbacksRef.current;
      const insideMultiPhotoHero =
        imagesCount > 1 &&
        Boolean(mediaStageRef.current?.contains(target));
      // Strict Left-Edge Back Swipe Guard (clientX <= 28px) so Part 2 horizontal slide rows NEVER collide!
      const isLeftEdgeStart = t.clientX <= 28;
      const ignore =
        !isLeftEdgeStart ||
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
          clearLastClickedPinOrigin();
          navFn("next");
        }, 260);
      } else if (commitPrev) {
        track.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        track.style.transform = "translate3d(100%, 0, 0)";
        swipeCommitTimerRef.current = window.setTimeout(() => {
          swipeCommitTimerRef.current = null;
          clearLastClickedPinOrigin();
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

  const {
    pinLikeOverrides,
    togglePinLikeInstant,
    claimedCouponIds,
    claimCouponToWallet,
    openAuthModal,
  } = useHotelApp();
  const isTh = language === "th";
  const title = isTh ? pin.titleTh : pin.titleEn;
  const description = isTh ? pin.descriptionTh : pin.descriptionEn;
  const captionText = (description || title || "").trim();
  const hotelName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel = isTh ? pin.provinceNameTh : pin.provinceNameEn;
  const isSaved = savedPinIds.has(pin.id);

  const activeCoupons = pin.activeCoupons ?? [];
  const hasUnclaimedCoupons = activeCoupons.some(
    (c) => !claimedCouponIds.has(c.id)
  );

  const commitCouponClaimInModal = async (
    deal: CouponDealDto
  ): Promise<boolean> => {
    setClaimingCouponId(deal.id);
    const res = await claimCouponToWallet({ couponId: deal.id });
    setClaimingCouponId(null);
    return res.success;
  };

  const handleClaimCouponInModal = async (
    deal: CouponDealDto
  ): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อเก็บคูปองส่วนลดเข้ากระเป๋า",
        reasonEn: "Log in to save this coupon to your wallet",
        onSuccess: async () => {
          await commitCouponClaimInModal(deal);
        },
      });
      return false;
    }
    return commitCouponClaimInModal(deal);
  };

  const likeOverride = pinLikeOverrides[pin.id];
  const effectiveIsLiked = likeOverride ? likeOverride.isLiked : pin.isLikedByMe;
  const effectiveLikesCount = likeOverride
    ? likeOverride.likesCount
    : pin.likesCount;

  const handleInstantLike = () => {
    const nextLiked = !effectiveIsLiked;
    const nextCount = Math.max(0, effectiveLikesCount + (nextLiked ? 1 : -1));
    if (currentUser) {
      syncPinLikeState(pin.id, nextLiked, nextCount);
    }
    togglePinLikeInstant({
      id: pin.id,
      isLikedByMe: pin.isLikedByMe,
      likesCount: pin.likesCount,
    });
    if (currentUser && !effectiveIsLiked) {
      trackPinInteraction("PIN_LIKE", pin);
    }
  };

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
    imagesCount: totalSlides,
    hasVideo: false,
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
    setIsShareModalOpen(true);
  };

  const handleOpenCommentsSheet = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
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

  const catMeta = getPlaceCategoryMeta(pin.placeCategory);
  const isDirectBooking =
    pin.merchantMode !== "PROFILE_ONLY" && pin.dealSourceType === "INTERNAL";
  const isExternalDeal = !isDirectBooking;
  const effectivePromoCode = pin.promoCode || pin.activeCoupon?.code || null;
  const dealDiscountHeadline = getDealDiscountHeadline(pin, language);
  const dealPrice = pin.promoDealPriceThb ?? pin.nightlyPriceThb;
  const dealOriginalPrice =
    pin.promoOriginalPriceThb &&
    dealPrice &&
    pin.promoOriginalPriceThb > dealPrice
      ? pin.promoOriginalPriceThb
      : null;
  const effectiveExpiresAt =
    pin.promoExpiresAt || pin.activeCoupon?.expiresAt || null;
  const dealTimeInfo = effectiveExpiresAt
    ? getCouponTimeInfo(effectiveExpiresAt, language)
    : null;
  const internalHotelHref = effectivePromoCode
    ? `/${pin.hotelSlug}?coupon=${encodeURIComponent(effectivePromoCode)}`
    : `/${pin.hotelSlug}`;
  const externalDealHref =
    pin.externalWebsiteUrl ||
    pin.externalDealUrl ||
    pin.hotelGoogleMapsUrl ||
    `/${pin.hotelSlug}`;
  const isOutboundExternalUrl = /^https?:\/\//i.test(externalDealHref);
  const primaryCtaLabel = isDirectBooking
    ? isTh
      ? "จองตรง 0% GP"
      : "Book direct 0% GP"
    : pin.primaryCtaLabelTh?.trim() ||
      (pin.externalSourceName
        ? isTh
          ? `ไปที่ ${pin.externalSourceName}`
          : `Open ${pin.externalSourceName}`
        : isTh
        ? catMeta.defaultCtaTh
        : catMeta.defaultCtaEn);

  const resolvedOwnerFeedPosts = useMemo(
    () =>
      ownerFeedPosts ??
      hotelPosts.filter((p) => p.postKind === "FEED_POST"),
    [ownerFeedPosts, hotelPosts]
  );
  const resolvedOwnerBlogs = useMemo(
    () =>
      ownerBlogs ??
      hotelPosts.filter((p) => p.postKind !== "FEED_POST"),
    [ownerBlogs, hotelPosts]
  );
  const resolvedNearbyPlaces = useMemo(
    () => (nearbyPlaces.length > 0 ? nearbyPlaces : relatedPins.slice(0, 8)),
    [nearbyPlaces, relatedPins]
  );

  const handleExternalDealClick = () => {
    fetch(`/api/pins/${encodeURIComponent(pin.id)}/click`, {
      method: "POST",
    }).catch(() => {});
  };

  const handleMediaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (slideIndex === mapSlideIndex) return;
    if (e.pointerType !== "mouse" || totalSlides <= 1) return;
    if (
      (e.target as HTMLElement | null)?.closest(
        "button, a, [data-swipe-ignore='true']"
      )
    ) {
      return;
    }
    mouseDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
  };

  const handleMediaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = mouseDragRef.current;
    if (!st || e.pointerType !== "mouse" || totalSlides <= 1) {
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
        (curr === 0 && dx > 0) || (curr === totalSlides - 1 && dx < 0);
      const effDx = atEdge ? dx * 0.28 : dx;
      carouselTrackRef.current.style.transition = "none";
      carouselTrackRef.current.style.transform = `translate3d(calc(${-curr * 100}% + ${effDx}px), 0, 0)`;
    }
  };

  const handleMediaPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = mouseDragRef.current;
    mouseDragRef.current = null;
    if (!st || e.pointerType !== "mouse" || totalSlides <= 1) {
      return;
    }
    if (!st.dragging) return;
    const dx = e.clientX - st.startX;
    const stageW = mediaStageRef.current?.clientWidth || 500;
    let targetIdx = slideIndex;
    if (dx < -Math.min(72, stageW * 0.16) && slideIndex < totalSlides - 1) {
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
              isSaved={savedPinIds.has(prevPinPreview.id)}
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
              isSaved={savedPinIds.has(nextPinPreview.id)}
            />
          </div>
        )}

      {/* DESKTOP DEPTH-1 BACK BAR (Shown prominently when viewing a Nearby Place hop!) */}
      {canStepBack && backTargetName && (
        <div className="hidden lg:flex items-center justify-between max-w-[1120px] mx-auto pb-3 mb-2 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleStepBack}
            className="h-9 px-3.5 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            <span className="truncate max-w-[420px]">
              {isTh ? `กลับไป ${backTargetName}` : `Back to ${backTargetName}`}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิดหน้าต่าง" : "Close"}
            className="h-9 w-9 rounded-[11px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* OPEN EDITORIAL SPLIT CLOSE-UP (Instagram-Clean Photo-First Layout) */}
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
        className="max-w-[1120px] mx-auto lg:pt-2 lg:pb-4 lg:flex lg:items-start lg:gap-6 xl:gap-8"
      >
        {/* Dedicated Desktop Left Gutter Back Button — Flat Borderless Squircle, Never Overlaps Hero Photo */}
        {!(canStepBack && backTargetName) && (
          <button
            type="button"
            onClick={handleStepBack}
            title={
              canStepBack
                ? isTh
                  ? "ย้อนกลับไปการ์ดก่อนหน้า"
                  : "Back to previous place"
                : isTh
                ? "กลับหน้าฟีด"
                : "Back to feed"
            }
            aria-label={isTh ? "ย้อนกลับ" : "Back"}
            className="hidden lg:inline-flex h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.1} />
          </button>
        )}

        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:h-[min(82vh,740px)] lg:min-h-[540px]">
        {/* =================================================================
            LEFT / HERO STAGE: UNIFIED SWIPEABLE DECK
            Slide 0: Designed Coupon -> Slide 1..N: Property Video & Photos -> Last Slide: Map
            Bottom-Right: Fast-Warp Icons (Coupon / Image / Map) + Mobile Save & More
        ================================================================== */}
        <div className="lg:col-span-6 min-h-0 px-1.5 sm:px-3 pt-1.5 sm:pt-2.5 lg:p-0 flex flex-col gap-2.5 sm:gap-3 lg:h-full">
          <div
            ref={mediaStageRef}
            data-pin-hero-stage="true"
            data-place-hero-stage={profileHeroMode ? "true" : undefined}
            onPointerDown={handleMediaPointerDown}
            onPointerMove={handleMediaPointerMove}
            onPointerUp={handleMediaPointerUp}
            onPointerCancel={handleMediaPointerUp}
            style={
              {
                "--pin-aspect": "3 / 4",
                touchAction: slideIndex === mapSlideIndex ? "none" : "pan-y",
                visibility: hideHeroStageForFlip ? "hidden" : "visible",
              } as React.CSSProperties
            }
            className="relative w-full min-h-0 max-lg:[aspect-ratio:var(--pin-aspect)] max-h-[76svh] lg:max-h-none lg:flex-1 rounded-[24px] sm:rounded-[26px] lg:rounded-[20px] bg-[var(--color-background-body)] flex items-center justify-center overflow-hidden"
          >
            {/* Mobile Secondary Top-Right Close Button (Hidden in profileHeroMode where page has its own Back Dock) */}
            {!profileHeroMode && (
              <button
                type="button"
                data-swipe-ignore="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label={isTh ? "ปิดหน้าต่าง" : "Close"}
                className="lg:hidden absolute top-3 right-3 z-30 h-9 w-9 rounded-[11px] bg-black/52 hover:bg-black/70 text-white backdrop-blur-md inline-flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" strokeWidth={2.3} />
              </button>
            )}

            {/* Vertical Airbnb Wishlist-Style Floating Icon Rail (Bottom-Right: Coupon > Video (if any) > Image > Map + Mobile Save & More) */}
            <div
              data-swipe-ignore="true"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute bottom-3.5 right-3 z-30 flex flex-col items-center gap-2"
            >
              {/* 1. Coupon */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateCarouselSlide(0);
                }}
                title={isTh ? "คูปองส่วนลด" : "Coupon"}
                aria-label={isTh ? "ไปที่การ์ดคูปอง" : "Jump to coupon"}
                className={`h-10 w-10 rounded-[12px] backdrop-blur-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                  slideIndex === 0
                    ? "bg-white text-[#222222] border-white shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
                    : "bg-black/45 hover:bg-black/62 text-white border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]"
                }`}
              >
                <TicketPercent className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>

              {/* 2. Video (Strictly hidden when card has no video!) */}
              {hasVideoSlide && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateCarouselSlide(videoSlideIndex);
                  }}
                  title={isTh ? "วิดีโอที่พัก" : "Property video"}
                  aria-label={isTh ? "ไปที่วิดีโอที่พัก" : "Jump to video"}
                  className={`h-10 w-10 rounded-[12px] backdrop-blur-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                    slideIndex === videoSlideIndex
                      ? "bg-white text-[#222222] border-white shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
                      : "bg-black/45 hover:bg-black/62 text-white border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]"
                  }`}
                >
                  <Play className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
              )}

              {/* 3. Image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateCarouselSlide(firstPhotoSlideIndex);
                }}
                title={isTh ? "รูปภาพที่พัก" : "Property photos"}
                aria-label={isTh ? "ไปที่รูปภาพที่พัก" : "Jump to photos"}
                className={`h-10 w-10 rounded-[12px] backdrop-blur-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                  slideIndex >= firstPhotoSlideIndex &&
                  slideIndex < mapSlideIndex
                    ? "bg-white text-[#222222] border-white shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
                    : "bg-black/45 hover:bg-black/62 text-white border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]"
                }`}
              >
                <Images className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>

              {/* 4. Map */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateCarouselSlide(mapSlideIndex);
                }}
                title={isTh ? "แผนที่ & สถานที่ใกล้เคียง" : "Map & nearby"}
                aria-label={isTh ? "ไปที่แผนที่" : "Jump to map"}
                className={`h-10 w-10 rounded-[12px] backdrop-blur-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                  slideIndex === mapSlideIndex
                    ? "bg-white text-[#222222] border-white shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
                    : "bg-black/45 hover:bg-black/62 text-white border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]"
                }`}
              >
                <MapPin className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>

              {/* Mobile Bookmark (Airbnb Wishlist Aesthetic) & More (...) stacked cleanly underneath */}
              <div className="flex lg:hidden flex-col items-center gap-2 pt-0.5">
                <span
                  aria-hidden="true"
                  className="w-4 h-px bg-white/35 rounded-full"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(pin.id);
                  }}
                  aria-label={
                    isSaved
                      ? isTh
                        ? "นำคูปองออกจากทริป"
                        : "Remove from board"
                      : isTh
                      ? "บันทึกคูปองเข้าทริป"
                      : "Save to trip"
                  }
                  className={`h-10 w-10 rounded-[12px] backdrop-blur-md border inline-flex items-center justify-center transition-colors cursor-pointer ${
                    isSaved
                      ? "bg-[#e60023] border-white/80 !text-white shadow-[0_4px_14px_rgba(230,0,35,0.35)]"
                      : "bg-black/45 hover:bg-black/62 text-white border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]"
                  }`}
                >
                  <Bookmark
                    className={`w-[19px] h-[19px] ${isSaved ? "fill-current" : ""}`}
                    strokeWidth={2}
                  />
                </button>

                <PinMoreOptionsControl
                  pin={pin}
                  language={language}
                  isSaved={isSaved}
                  onToggleSave={onToggleSave}
                  onSharePin={handleShareWithFeedback}
                  onHidePin={onHidePin}
                  iconClassName="w-[19px] h-[19px]"
                  triggerClassName="h-10 w-10 rounded-[12px] bg-black/45 hover:bg-black/62 text-white backdrop-blur-md border border-white/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)] inline-flex items-center justify-center transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Unified Horizontal Swipe Track: Coupon -> Photos/Video -> Map */}
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
              {stageSlides.map((slide) => {
                if (slide.kind === "coupon") {
                  return (
                    <div
                      key={slide.id}
                      className="relative w-full h-full shrink-0 overflow-hidden"
                    >
                      <DealHeroCouponSlide
                        pin={pin}
                        language={language}
                        hotelName={hotelName}
                        provinceLabel={provinceLabel}
                        discountHeadline={dealDiscountHeadline}
                        dealPrice={dealPrice}
                        dealOriginalPrice={dealOriginalPrice}
                        expiryLabel={dealTimeInfo?.label || null}
                        onOpenTerms={() => setIsTermsModalOpen(true)}
                      />
                    </div>
                  );
                }

                if (slide.kind === "video") {
                  return (
                    <div
                      key={slide.id}
                      className="relative w-full h-full shrink-0 bg-black flex items-center justify-center overflow-hidden"
                    >
                      <UniversalVideoPlayer
                        videoUrl={getOptimizedVideoUrl(slide.videoUrl, "hero")}
                        posterUrl={getOptimizedPinImageUrl(
                          pin.coverImageUrl,
                          "hero"
                        )}
                        posterSrcSet={getOptimizedPinImageSrcSet(
                          pin.coverImageUrl,
                          "hero"
                        )}
                        posterSizes={PIN_IMAGE_SIZES.hero}
                        title={title || hotelName}
                        aspectRatio={videoAspect}
                        fitMode={videoAspect === "16/9" ? "contain" : "cover"}
                        autoPlay={slideIndex === 1}
                        initialMuted={true}
                      />
                    </div>
                  );
                }

                if (slide.kind === "map") {
                  return (
                    <div
                      key={slide.id}
                      className="relative w-full h-full shrink-0 overflow-hidden"
                    >
                      {hasMountedMapSlide || slideIndex === mapSlideIndex ? (
                        <DealDetailInlineMap
                          hotelName={hotelName}
                          provinceId={pin.provinceId}
                          provinceLabel={provinceLabel}
                          districtTh={pin.hotelDistrictTh}
                          addressTh={pin.hotelAddressTh}
                          latitude={pin.hotelLatitude}
                          longitude={pin.hotelLongitude}
                          googleMapsUrl={pin.hotelGoogleMapsUrl}
                          nearbySpots={pin.hotelNearbySpots}
                          language={language}
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-secondary)] text-[13px]">
                          <MapPin className="w-5 h-5 mr-1.5" />
                          <span>{isTh ? "แผนที่ที่พัก" : "Property map"}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                const isHeroLoaded = loadedHeroUrls.has(slide.url);
                return (
                  <div
                    key={slide.id}
                    className="relative w-full h-full shrink-0 rounded-[24px] sm:rounded-[26px] lg:rounded-[20px] flex items-center justify-center overflow-hidden"
                  >
                    {!isHeroLoaded && (
                      <img
                        src={getOptimizedPinImageUrl(slide.url, "card")}
                        alt=""
                        aria-hidden="true"
                        loading={slide.photoIdx === 0 ? "eager" : "lazy"}
                        decoding="sync"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-cover select-none"
                      />
                    )}
                    <img
                      src={getOptimizedPinImageUrl(slide.url, "hero")}
                      srcSet={getOptimizedPinImageSrcSet(slide.url, "hero")}
                      sizes={PIN_IMAGE_SIZES.hero}
                      alt={
                        slide.photoIdx === 0
                          ? title || hotelName
                          : `${title || hotelName} (${slide.photoIdx + 1})`
                      }
                      loading={slide.photoIdx <= 1 ? "eager" : "lazy"}
                      decoding={slide.photoIdx === 0 ? "sync" : "async"}
                      draggable={false}
                      onLoad={() => handleMarkHeroLoaded(slide.url)}
                      onError={() => handleMarkMediaError(slide.url)}
                      className="relative z-[1] w-full h-full object-cover select-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unified Squircle Thumbnail Strip: Coupon | Photos/Video | Map */}
          <div
            data-swipe-ignore="true"
            className="shrink-0 flex items-center gap-2 px-1.5 sm:px-0.5 lg:px-0"
          >
            <div
              ref={thumbnailStripRef}
              className="flex-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-1.5 -mx-1.5"
            >
              {stageSlides.map((slide, idx) => {
                const isCurrent = idx === slideIndex;
                const activeRingClass = isCurrent
                  ? "ring-2 ring-[var(--color-text-primary)] ring-offset-2 ring-offset-[var(--color-background-body)] opacity-100"
                  : "opacity-65 hover:opacity-100";

                if (slide.kind === "coupon") {
                  return (
                    <button
                      key={`thumb-${slide.id}`}
                      type="button"
                      data-thumb-idx={idx}
                      onClick={() => navigateCarouselSlide(idx)}
                      aria-label={isTh ? "การ์ดคูปอง" : "Coupon card"}
                      className={`relative h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] rounded-[12px] overflow-hidden shrink-0 cursor-pointer transition-all bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] flex flex-col items-center justify-center gap-0.5 ${activeRingClass}`}
                    >
                      <TicketPercent className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span className="text-[10px] font-semibold leading-none">
                        {hasPlacePromo
                          ? isTh
                            ? "คูปอง"
                            : "Deal"
                          : isTh
                          ? "หน้าปก"
                          : "Cover"}
                      </span>
                    </button>
                  );
                }

                if (slide.kind === "video") {
                  return (
                    <button
                      key={`thumb-${slide.id}`}
                      type="button"
                      data-thumb-idx={idx}
                      onClick={() => navigateCarouselSlide(idx)}
                      aria-label={isTh ? "ดูวิดีโอ" : "Watch video"}
                      className={`relative h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] rounded-[12px] overflow-hidden shrink-0 cursor-pointer transition-all bg-[var(--color-background-muted)] ${activeRingClass}`}
                    >
                      <img
                        src={getOptimizedPinImageUrl(pin.coverImageUrl, "thumb")}
                        alt={hotelName}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-current" />
                      </span>
                    </button>
                  );
                }

                if (slide.kind === "map") {
                  return (
                    <button
                      key={`thumb-${slide.id}`}
                      type="button"
                      data-thumb-idx={idx}
                      onClick={() => navigateCarouselSlide(idx)}
                      aria-label={isTh ? "ดูแผนที่" : "View map"}
                      className={`relative h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] rounded-[12px] overflow-hidden shrink-0 cursor-pointer transition-all bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex flex-col items-center justify-center gap-0.5 border border-[var(--color-border)] ${activeRingClass}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" strokeWidth={2.1} />
                      <span className="text-[10px] font-semibold leading-none">
                        {isTh ? "แผนที่" : "Map"}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={`thumb-${slide.id}`}
                    type="button"
                    data-thumb-idx={idx}
                    onClick={() => navigateCarouselSlide(idx)}
                    aria-label={
                      isTh
                        ? `ดูภาพที่ ${slide.photoIdx + 1}`
                        : `View photo ${slide.photoIdx + 1}`
                    }
                    className={`relative h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] rounded-[12px] overflow-hidden shrink-0 cursor-pointer transition-all bg-[var(--color-background-muted)] ${activeRingClass}`}
                  >
                    <img
                      src={getOptimizedPinImageUrl(slide.url, "thumb")}
                      srcSet={getOptimizedPinImageSrcSet(slide.url, "thumb")}
                      sizes={PIN_IMAGE_SIZES.thumb}
                      alt={`${title || hotelName} ${slide.photoIdx + 1}`}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      onError={() => handleMarkMediaError(slide.url)}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                navigateCarouselSlide((prev) => (prev + 1) % totalSlides)
              }
              aria-label={isTh ? "สไลด์ถัดไป" : "Next slide"}
              className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center text-[var(--color-text-primary)] shrink-0 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.1} />
            </button>
          </div>
        </div>

        {/* =================================================================
            RIGHT / INSTAGRAM-CLEAN PANEL
            Desktop: Header (Host + Visit Stay + ...) -> Airy Caption & Comments -> Bottom Like/Comment/Share/Pin + Composer
            Mobile: Action Bar (Like/Comment/Share | Visit Stay + Pin) -> Likes -> Host + Optional Short Caption
        ================================================================== */}
        <div
          ref={detailsPanelRef}
          className="lg:col-span-6 min-h-0 flex flex-col justify-between lg:h-full lg:max-h-full bg-[var(--color-background-body)]"
        >
          {/* 1A. DESKTOP TOP HEADER (Instagram Image 5: Avatar + Hotel Name + Prominent Visit Stay + '...') */}
          <div className="hidden lg:flex items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)] shrink-0">
            <Link
              href={`/${pin.hotelSlug}`}
              prefetch={false}
              onClick={handleVisitHotelClick}
              className="inline-flex items-center gap-3 min-w-0 group/author"
            >
              {pin.hotelLogoUrl ? (
                <img
                  src={pin.hotelLogoUrl}
                  alt={hotelName}
                  className="h-9 w-9 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                />
              ) : (
                <span className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[13px] font-semibold shrink-0">
                  {hotelName[0] || "C"}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] group-hover/author:underline truncate flex items-center gap-1">
                  <span className="truncate">{hotelName}</span>
                  {pin.hotelVerificationStatus === "VERIFIED" && (
                    <BadgeCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                  )}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] truncate flex items-center gap-1.5">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{provinceLabel}</span>
                  {pin.nightlyPriceThb && pin.placeCategory === "STAY" ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {isTh
                          ? `เริ่มต้น ฿${pin.nightlyPriceThb.toLocaleString()}/คืน`
                          : `from ฿${pin.nightlyPriceThb.toLocaleString()}/night`}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              {profileHeroMode && onPrimaryProfileAction ? (
                <button
                  type="button"
                  onClick={onPrimaryProfileAction}
                  className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                >
                  <span>{primaryProfileActionLabel || primaryCtaLabel}</span>
                </button>
              ) : isExternalDeal && isOutboundExternalUrl ? (
                <a
                  href={externalDealHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleExternalDealClick}
                  className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shrink-0"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                </a>
              ) : (
                <Link
                  href={internalHotelHref}
                  prefetch={true}
                  onClick={handleVisitHotelClick}
                  aria-busy={isNavigatingToHotel}
                  className={`h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shrink-0 ${
                    isNavigatingToHotel ? "opacity-80 pointer-events-none" : ""
                  }`}
                >
                  <span>{primaryCtaLabel}</span>
                  {isNavigatingToHotel ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  )}
                </Link>
              )}

              <PinMoreOptionsControl
                pin={pin}
                language={language}
                isSaved={isSaved}
                onToggleSave={onToggleSave}
                onSharePin={handleShareWithFeedback}
                onHidePin={onHidePin}
                dropdownAlign="right"
                iconClassName="w-[19px] h-[19px]"
                triggerClassName="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
              />
            </div>
          </div>

          {/* 1B. MOBILE ACTION ROW & CLEAN CAPTION (< lg ONLY) */}
          <div className="lg:hidden px-3.5 sm:px-5 pt-3 pb-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5 -ml-1.5">
                <button
                  type="button"
                  onClick={handleInstantLike}
                  aria-label={isTh ? "ถูกใจ" : "Like"}
                  className="h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <Heart
                    className={`w-[22px] h-[22px] ${
                      effectiveIsLiked
                        ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                        : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleOpenCommentsSheet}
                  aria-label={isTh ? "ความคิดเห็น" : "Comments"}
                  className="h-10 px-2 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text-primary)] transition cursor-pointer tabular-nums"
                >
                  <MessageCircle className="w-[21px] h-[21px]" strokeWidth={2} />
                  {totalCommentsCount > 0 && <span>{totalCommentsCount}</span>}
                </button>

                <button
                  type="button"
                  onClick={handleShareWithFeedback}
                  aria-label={isTh ? "แชร์" : "Share"}
                  className="h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  {justCopied ? (
                    <Check className="w-[20px] h-[20px] text-[var(--color-success)]" />
                  ) : (
                    <Share className="w-[20px] h-[20px]" strokeWidth={2} />
                  )}
                </button>
              </div>

              {!profileHeroMode && (
                <div data-swipe-ignore="true" className="shrink-0">
                  <Link
                    href={`/${pin.hotelSlug}`}
                    target={mobileOverlayMode ? "_blank" : undefined}
                    rel={mobileOverlayMode ? "noopener noreferrer" : undefined}
                    className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors shrink-0"
                  >
                    <span>{isTh ? "ดูโปรไฟล์ร้าน" : "Full profile"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  </Link>
                </div>
              )}
            </div>

            {effectiveLikesCount > 0 && (
              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                {isTh
                  ? `ถูกใจ ${effectiveLikesCount.toLocaleString()} คน`
                  : `${effectiveLikesCount.toLocaleString()} ${
                      effectiveLikesCount === 1 ? "like" : "likes"
                    }`}
              </p>
            )}

            <Link
              href={`/${pin.hotelSlug}`}
              prefetch={false}
              onClick={handleVisitHotelClick}
              className="inline-flex items-center gap-2.5 min-w-0 pt-0.5"
            >
              {pin.hotelLogoUrl ? (
                <img
                  src={pin.hotelLogoUrl}
                  alt={hotelName}
                  className="h-7 w-7 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                />
              ) : (
                <PlaceCategoryCrest
                  category={pin.placeCategory}
                  language={language}
                  size="sm"
                />
              )}
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1">
                  <span className="truncate">{hotelName}</span>
                  {pin.hotelVerificationStatus === "VERIFIED" && (
                    <BadgeCheck className="w-3.5 h-3.5 text-[var(--color-text-primary)] shrink-0" />
                  )}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                  {isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn} · {provinceLabel}
                  {pin.nightlyPriceThb && pin.placeCategory === "STAY"
                    ? ` · ฿${pin.nightlyPriceThb.toLocaleString()}/${
                        isTh ? "คืน" : "night"
                      }`
                    : ""}
                </p>
              </div>
            </Link>

            {captionText && (
              <p className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                {captionText}
              </p>
            )}
          </div>

          {/* 2. DESKTOP MIDDLE SCROLLABLE AREA (Caption + Comments) */}
          <div
            ref={desktopCommentsSectionRef}
            className="hidden lg:flex flex-col flex-1 min-h-0 overflow-y-auto py-4 pr-1 space-y-4"
          >
            {/* Optional Instagram-Style Short Caption (No big title header, no hashtag clutter) */}
            {captionText && (
              <div className="flex items-start gap-3 select-text">
                {pin.hotelLogoUrl ? (
                  <img
                    src={pin.hotelLogoUrl}
                    alt={hotelName}
                    className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)] ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-semibold shrink-0 mt-0.5">
                    {hotelName[0] || "C"}
                  </span>
                )}
                <div className="flex-1 min-w-0 text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                  <Link
                    href={`/${pin.hotelSlug}`}
                    prefetch={false}
                    onClick={handleVisitHotelClick}
                    className="font-semibold hover:underline mr-1.5"
                  >
                    {hotelName}
                  </Link>
                  <span>{captionText}</span>
                </div>
              </div>
            )}

            {/* Airy Comments List OR Instagram Centered Empty State */}
            {comments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-1">
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ยังไม่มีความคิดเห็น" : "No comments yet."}
                </p>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "เริ่มพูดคุยหรือสอบถามที่พักได้เลย"
                    : "Start the conversation."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((cm) => {
                  const canRemove =
                    isOwnerOfPin || currentUser?.id === cm.userId;

                  return (
                    <div key={`desk-${cm.id}`} className="space-y-2.5 select-text">
                      <div className="flex items-start gap-3">
                        {cm.authorAvatar ? (
                          <img
                            src={cm.authorAvatar}
                            alt={cm.authorName}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]"
                          />
                        ) : (
                          <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[12px] font-semibold shrink-0 mt-0.5">
                            {(cm.authorName[0] || "G").toUpperCase()}
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] leading-relaxed break-words text-[var(--color-text-primary)]">
                            <strong className="font-semibold mr-1.5">
                              {cm.authorName}
                            </strong>
                            {cm.isHotelOwnerReply && (
                              <span className="inline-flex items-center rounded-[6px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-1.5 py-0.5 text-[10.5px] font-semibold mr-1.5 align-middle">
                                เจ้าของที่พัก
                              </span>
                            )}
                            <span>{cm.body}</span>
                          </div>

                          <div className="mt-1 flex items-center gap-3.5 text-[12px] text-[var(--color-text-secondary)]">
                            <span>
                              {formatRelativeCommentDate(
                                cm.createdAt,
                                language
                              )}
                            </span>
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
                              {isTh ? "ตอบกลับ" : "Reply"}
                            </button>

                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => onDeleteComment(cm.id)}
                                className="hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isTh ? "ลบ" : "Delete"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {cm.replies.length > 0 && (
                        <div className="pl-11 space-y-2.5">
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
                                  <div className="text-[13.5px] leading-relaxed break-words text-[var(--color-text-primary)]">
                                    <strong className="font-semibold mr-1.5">
                                      {rp.authorName}
                                    </strong>
                                    {rp.isHotelOwnerReply && (
                                      <span className="inline-flex items-center rounded-[6px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-1.5 py-0.5 text-[10.5px] font-semibold mr-1.5 align-middle">
                                        เจ้าของที่พัก
                                      </span>
                                    )}
                                    <span>{rp.body}</span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-[var(--color-text-secondary)]">
                                    <span>
                                      {formatRelativeCommentDate(
                                        rp.createdAt,
                                        language
                                      )}
                                    </span>
                                    {canRemoveReply && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteComment(rp.id)}
                                        className="hover:text-[var(--color-error)] inline-flex items-center gap-0.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>{isTh ? "ลบ" : "Delete"}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. DESKTOP BOTTOM INSTAGRAM ENGAGEMENT BAR + COMPOSER (>= lg ONLY — Image 5!) */}
          <div className="hidden lg:block shrink-0 pt-3.5 border-t border-[var(--color-border)] bg-[var(--color-background-body)] space-y-2.5">
            {/* Action Icons: Left (Like · Comment · Share) | Right (Pin Icon) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 -ml-1.5">
                <button
                  type="button"
                  onClick={handleInstantLike}
                  aria-label={isTh ? "ถูกใจ" : "Like"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <Heart
                    className={`w-[22px] h-[22px] ${
                      effectiveIsLiked
                        ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                        : ""
                    }`}
                    strokeWidth={1.9}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => desktopCommentInputRef.current?.focus()}
                  aria-label={isTh ? "แสดงความคิดเห็น" : "Comment"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <MessageCircle className="w-[21px] h-[21px]" strokeWidth={1.9} />
                </button>

                <button
                  type="button"
                  onClick={handleShareWithFeedback}
                  aria-label={isTh ? "แชร์" : "Share"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  {justCopied ? (
                    <Check className="w-[20px] h-[20px] text-[var(--color-success)]" />
                  ) : (
                    <Share className="w-[20px] h-[20px]" strokeWidth={1.9} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSave(pin.id)}
                  aria-label={
                    isSaved
                      ? isTh
                        ? "นำคูปองออกจากทริป"
                        : "Remove from board"
                      : isTh
                      ? "บันทึกคูปองเข้าทริป"
                      : "Save to trip"
                  }
                  title={
                    isSaved
                      ? isTh
                        ? "บันทึกโปรแล้ว"
                        : "Deal saved"
                      : isTh
                      ? "บันทึกโปรเข้าทริป"
                      : "Save deal"
                  }
                  className={`h-9 px-3 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSaved
                      ? "bg-[var(--color-promo)] !text-white"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Bookmark
                    className={`w-[16px] h-[16px] ${
                      isSaved ? "fill-current" : ""
                    }`}
                    strokeWidth={2}
                  />
                  <span>
                    {isSaved
                      ? isTh
                        ? "บันทึกแล้ว"
                        : "Saved"
                      : hasPlacePromo
                      ? isTh
                        ? "บันทึกโปร"
                        : "Save deal"
                      : isTh
                      ? "บันทึก"
                      : "Save"}
                  </span>
                </button>
              </div>
            </div>

            {/* Likes Count & Relative Timestamp */}
            <div className="space-y-0.5">
              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                {isTh
                  ? `ถูกใจ ${effectiveLikesCount.toLocaleString()} คน`
                  : `${effectiveLikesCount.toLocaleString()} ${
                      effectiveLikesCount === 1 ? "like" : "likes"
                    }`}
              </p>
              <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                {formatRelativeCommentDate(pin.createdAt, language)}
              </p>
            </div>

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

            <form
              onSubmit={handleSubmitComment}
              className="relative flex items-center gap-2 pt-0.5"
            >
              <InstagramEmojiPicker
                isOpen={showEmojiBar}
                onClose={() => setShowEmojiBar(false)}
                language={language}
                placement="popover-above"
                onSelect={(em) => {
                  setCommentText((prev) => `${prev}${em}`);
                  desktopCommentInputRef.current?.focus();
                }}
              />

              {currentUser && (
                <UserAvatarCircle user={currentUser} sizeClass="h-8 w-8" />
              )}

              <div className="flex-1 h-10 rounded-[12px] bg-[var(--color-background-muted)] border border-transparent focus-within:bg-[var(--color-background-body)] focus-within:border-[var(--color-text-primary)] pl-1.5 pr-1.5 flex items-center gap-1.5 transition-colors">
                <button
                  type="button"
                  data-emoji-trigger="true"
                  onClick={() => setShowEmojiBar((v) => !v)}
                  aria-label={isTh ? "เลือกอิโมจิ" : "Choose emoji"}
                  aria-expanded={showEmojiBar}
                  className={`h-7 w-7 rounded-[8px] inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                    showEmojiBar
                      ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                      : "hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Smile className="w-[18px] h-[18px]" strokeWidth={1.9} />
                </button>

                <input
                  ref={desktopCommentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    currentUser
                      ? isTh
                        ? "เพิ่มความคิดเห็น..."
                        : "Add a comment..."
                      : isTh
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
                    className="h-7 px-2.5 rounded-[8px] bg-[#222222] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] hover:opacity-90 text-[12px] font-semibold inline-flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isTh ? "โพสต์" : "Post"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        </div>
      </div>

      {/* UNIFIED LAYER 2 PLACE PROFILE HUB (Omitted in profileHeroMode because `/{slug}` renders the full adaptive profile directly below!) */}
      {!profileHeroMode && (
        <PlaceProfileHubSection
          pin={pin}
          ownerFeedPosts={resolvedOwnerFeedPosts}
          ownerBlogs={resolvedOwnerBlogs}
          nearbyPlaces={resolvedNearbyPlaces}
          savedPinIds={savedPinIds}
          language={language}
          isNearbyHop={isNearbyHop || canStepBack}
          isModalContext={mobileOverlayMode || detailFooterMode === "property-only"}
          onOpenPromoCoupon={() => {
            if (activeCoupons.length > 0) {
              setIsCouponPopoverOpen(true);
            } else {
              setIsTermsModalOpen(true);
            }
          }}
          onSelectNearbyPlace={(nextPlace) => onSelectPin?.(nextPlace)}
          onToggleSavePin={(id) => onToggleSave(id)}
        />
      )}
      </div>

      {/* =====================================================================
          MOBILE STICKY THUMB-ZONE BOTTOM DOCK (< lg ONLY, omitted in profileHeroMode!)
      ====================================================================== */}
      {!profileHeroMode &&
        isMobileViewport &&
        !isCommentsSheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-swipe-ignore="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="lg:hidden fixed inset-x-0 bottom-0 z-[92] bg-[var(--color-background-body)]/96 backdrop-blur-md border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] px-3.5 pt-2.5 pb-[max(12px,var(--cgr-safe-bottom))]"
          >
            <div className="flex items-center justify-between gap-2.5 max-w-[680px] mx-auto">
              {/* Left Thumb Zone: Back / Back to Origin Place */}
              <button
                type="button"
                onClick={handleStepBack}
                className="h-11 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 min-w-0 max-w-[46%] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                <span className="truncate">
                  {canStepBack && backTargetName
                    ? isTh
                      ? `กลับไป ${backTargetName}`
                      : `Back to ${backTargetName}`
                    : isTh
                    ? "กลับ"
                    : "Back"}
                </span>
              </button>

              {/* Right Thumb Zone: Primary CTA + Save/Pin */}
              <div className="flex items-center gap-2 shrink-0">
                {isExternalDeal && isOutboundExternalUrl ? (
                  <a
                    href={externalDealHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleExternalDealClick}
                    className="h-11 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                  >
                    <span className="max-w-[140px] truncate">{primaryCtaLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  </a>
                ) : (
                  <Link
                    href={internalHotelHref}
                    prefetch={true}
                    onClick={handleVisitHotelClick}
                    aria-busy={isNavigatingToHotel}
                    className={`h-11 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      isNavigatingToHotel ? "opacity-80 pointer-events-none" : ""
                    }`}
                  >
                    <span className="max-w-[140px] truncate">{primaryCtaLabel}</span>
                    {isNavigatingToHotel ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                    )}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => onToggleSave(pin.id)}
                  aria-label={isSaved ? (isTh ? "บันทึกแล้ว" : "Saved") : isTh ? "บันทึกลงทริป" : "Save to trip"}
                  className={`h-11 w-11 rounded-[12px] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    isSaved
                      ? "bg-[var(--color-promo)] !text-white"
                      : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Bookmark
                    className={`w-[19px] h-[19px] ${isSaved ? "fill-current" : ""}`}
                    strokeWidth={2.1}
                  />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MOBILE / TABLET SLIDE-UP COMMENTS BOTTOM SHEET MODAL (< lg ONLY!)
      ====================================================================== */}
      {isCommentsSheetOpen &&
        isMobileViewport &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={language === "th" ? "ความคิดเห็น" : "Comments"}
            data-swipe-ignore="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setIsCommentsSheetOpen(false)}
            className="lg:hidden fixed inset-0 z-[95] flex items-end justify-center bg-black/55 animate-fade-in-backdrop"
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

              <InstagramEmojiPicker
                isOpen={showEmojiBar}
                onClose={() => setShowEmojiBar(false)}
                language={language}
                placement="inline"
                onSelect={(em) => {
                  setCommentText((prev) => `${prev}${em}`);
                  commentInputRef.current?.focus();
                }}
              />

              <form
                onSubmit={handleSubmitComment}
                className="flex items-center gap-2"
              >
                {currentUser && (
                  <UserAvatarCircle user={currentUser} sizeClass="h-8 w-8" />
                )}

                <div className="flex-1 h-11 rounded-[14px] bg-[var(--color-background-muted)] border border-transparent focus-within:bg-[var(--color-background-card)] focus-within:border-[var(--color-text-primary)] pl-2 pr-1.5 flex items-center gap-1.5 transition-colors">
                  <button
                    type="button"
                    data-emoji-trigger="true"
                    onClick={() => setShowEmojiBar((v) => !v)}
                    aria-label={language === "th" ? "เลือกอิโมจิ" : "Choose emoji"}
                    aria-expanded={showEmojiBar}
                    className={`h-8 w-8 rounded-[9px] inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                      showEmojiBar
                        ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        : "hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <Smile className="w-[19px] h-[19px]" strokeWidth={1.9} />
                  </button>

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
        </div>,
        document.body
      )}

      {/* STAY COUPONS MODAL (Desktop Centered Dialog + Mobile Slide-Up Bottom Sheet — Multi-Coupon List!) */}
      {activeCoupons.length > 0 &&
        isCouponPopoverOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isTh ? "คูปองส่วนลดที่พัก" : "Stay Coupons"}
            data-swipe-ignore="true"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setIsCouponPopoverOpen(false)}
            className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 animate-fade-in-backdrop"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[460px] max-h-[82dvh] rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet sm:animate-none"
            >
              <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
                <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
              </div>

              <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] truncate">
                    {isTh ? "คูปองส่วนลดที่พัก" : "Stay Coupons"}
                  </h2>
                  <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
                    {hotelName} ·{" "}
                    {isTh
                      ? `${activeCoupons.length} รายการ (0% GP)`
                      : `${activeCoupons.length} available (0% GP)`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCouponPopoverOpen(false)}
                  aria-label={isTh ? "ปิด" : "Close"}
                  className="h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:pb-5 space-y-3">
                {activeCoupons.map((coupon) => {
                  const isClaimed = claimedCouponIds.has(coupon.id);
                  const dealDto = mapPinCouponToDealDto(
                    coupon,
                    pin,
                    isClaimed
                  );
                  return (
                    <HotelCouponTicketCard
                      key={coupon.id}
                      deal={dealDto}
                      language={language}
                      variant="compact"
                      notchBgClass="bg-[var(--color-background-popover)]"
                      isClaimed={isClaimed}
                      isClaiming={claimingCouponId === coupon.id}
                      onClaim={(d) => handleClaimCouponInModal(d)}
                      onNavigateHotel={() => setIsCouponPopoverOpen(false)}
                    />
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================
          PROMO TERMS MODAL (Desktop Centered / Mobile Slide-Up Sheet)
      ==================================================================== */}
      <DealTermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        pin={pin}
        language={language}
        hotelName={hotelName}
        provinceLabel={provinceLabel}
        discountHeadline={dealDiscountHeadline}
        dealPrice={dealPrice}
        dealOriginalPrice={dealOriginalPrice}
        expiryLabel={dealTimeInfo?.label || null}
        isSaved={isSaved}
        internalHotelHref={internalHotelHref}
        externalDealHref={externalDealHref}
        onToggleSave={onToggleSave}
        onVisitHotelClick={handleVisitHotelClick}
        onExternalDealClick={handleExternalDealClick}
      />

      {/* ===================================================================
          AIRBNB-STYLE SHARE MODAL (Desktop Centered / Mobile Slide-Up Sheet)
      ==================================================================== */}
      <ShareStayModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        language={language}
        shareUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/?stay=${encodeURIComponent(pin.id)}`
            : `/?stay=${encodeURIComponent(pin.id)}`
        }
        title={hotelName}
        subtitle={[
          provinceLabel,
          pin.hotelRatingAvg > 0 ? `★ ${pin.hotelRatingAvg.toFixed(1)}` : null,
          pin.nightlyPriceThb && pin.nightlyPriceThb > 0
            ? isTh
              ? `เริ่มต้น ฿${pin.nightlyPriceThb.toLocaleString()}/คืน`
              : `from ฿${pin.nightlyPriceThb.toLocaleString()}/night`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        imageUrl={getOptimizedPinImageUrl(pin.coverImageUrl, "card")}
        onCopied={() => {
          setJustCopied(true);
          window.setTimeout(() => setJustCopied(false), 1800);
        }}
      />
    </div>
  );
}
