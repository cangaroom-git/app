"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Heart,
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
import { parseVideoSource } from "@/lib/mediaUtils";
import type {
  AuthenticatedMeDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";
import { UniversalVideoPlayer } from "@/components/media/UniversalVideoPlayer";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";

export interface PinterestPinCardProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  isSaved: boolean;
  onSelectPin: (pin: PinFeedItemDto) => void;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinFeedItemDto) => void;
}

export function PinterestPinCard({
  pin,
  language,
  isSaved,
  onSelectPin,
  onToggleSave,
  onSharePin,
}: PinterestPinCardProps) {
  const title = language === "th" ? pin.titleTh : pin.titleEn;
  const provinceLabel =
    language === "th" ? pin.provinceNameTh : pin.provinceNameEn;

  const parsedVideo = pin.videoUrl
    ? parseVideoSource(pin.videoUrl, {
        autoplay: true,
        muted: true,
        forceVertical: true,
      })
    : null;
  const isInlineMp4Video = parsedVideo?.provider === "mp4";
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isInlineMp4Video) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = true;
    videoEl.defaultMuted = true;

    if (typeof IntersectionObserver === "undefined") {
      videoEl.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [isInlineMp4Video, parsedVideo?.embedUrl]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  return (
    <article className="w-full select-none">
      <div
        onClick={() => onSelectPin(pin)}
        className={`group relative w-full ${pin.aspectRatio} rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer`}
      >
        {isInlineMp4Video && parsedVideo ? (
          <video
            ref={videoRef}
            src={parsedVideo.embedUrl}
            poster={pin.coverImageUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover object-center pointer-events-none"
          />
        ) : (
          <img
            src={pin.coverImageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover object-center"
          />
        )}

        {/* Hover Dim Overlay — Strictly Zero Hover Scale */}
        <div className="pointer-events-none absolute inset-0 bg-black/28 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col justify-between p-3">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(pin.id);
              }}
              className={`pointer-events-auto h-10 px-4 rounded-[14px] text-[14px] font-bold transition-colors cursor-pointer ${
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
              onClick={(e) => e.stopPropagation()}
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

      {/* Minimal '...' Menu Only Underneath (Zero Clutter) */}
      <div className="pt-1.5 px-1 flex items-center justify-end relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More options"
          className="h-7 w-7 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-30 w-48 rounded-[14px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-1.5 space-y-0.5 text-[13px]">
            <Link
              href={`/${pin.hotelSlug}`}
              onClick={() => setMenuOpen(false)}
              className="w-full h-9 px-3 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)]"
            >
              <span className="truncate">ไปที่เพจที่พัก ({provinceLabel})</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
            <button
              type="button"
              onClick={() => {
                onToggleSave(pin.id);
                setMenuOpen(false);
              }}
              className="w-full h-9 px-3 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
            >
              <span>{isSaved ? "นำออกจากบอร์ด" : "บันทึกเข้าบอร์ด"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSharePin(pin);
                setMenuOpen(false);
              }}
              className="w-full h-9 px-3 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between font-medium text-[var(--color-text-primary)] cursor-pointer"
            >
              <span>คัดลอกลิงก์โพสต์</span>
            </button>
          </div>
        )}
      </div>
    </article>
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

export interface PinterestPinDetailProps {
  pin: PinFeedItemDto;
  language: LanguageCode;
  currentUser: AuthenticatedMeDto | null;
  comments: PinCommentDto[];
  savedPinIds: Set<string>;
  onClose: () => void;
  onSelectPin?: (pin: PinFeedItemDto) => void;
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
  onClose,
  onToggleLike,
  onToggleSave,
  onSharePin,
  onExpandMedia,
  onAddComment,
  onDeleteComment,
}: PinterestPinDetailProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [commentsMode, setCommentsMode] = useState<
    "preview" | "expanded" | "hidden"
  >("preview");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSlideIndex(0);
    setIsCaptionExpanded(false);
    setCommentsMode("preview");
    setReplyingTo(null);
  }, [pin.id]);

  const images =
    pin.mediaUrls.length > 0 ? pin.mediaUrls : [pin.coverImageUrl];
  const activeImageUrl = images[slideIndex] || pin.coverImageUrl;

  const title = language === "th" ? pin.titleTh : pin.titleEn;
  const description = language === "th" ? pin.descriptionTh : pin.descriptionEn;
  const captionText = description || title;
  const hotelName = language === "th" ? pin.hotelNameTh : pin.hotelNameEn;
  const provinceLabel =
    language === "th" ? pin.provinceNameTh : pin.provinceNameEn;

  const totalCommentsCount = useMemo(() => {
    const loadedCount = comments.reduce(
      (sum, c) => sum + 1 + c.replies.length,
      0
    );
    return Math.max(pin.commentsCount, loadedCount);
  }, [comments, pin.commentsCount]);

  const parsedVideo = pin.videoUrl
    ? parseVideoSource(pin.videoUrl, { autoplay: true, muted: false })
    : null;
  const videoAspect: "9/16" | "16/9" = pin.aspectRatio.includes("16/9") ||
    pin.aspectRatio.includes("4/3")
    ? "16/9"
    : "9/16";
  void parsedVideo;

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
      setCommentsMode("expanded");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareWithFeedback = () => {
    onSharePin(pin);
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1800);
  };

  const handleCommentIconClick = () => {
    setCommentsMode("expanded");
    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 30);
  };

  const handleToggleCommentsHeader = () => {
    if (commentsMode === "expanded") {
      setCommentsMode("hidden");
    } else {
      setCommentsMode("expanded");
    }
  };

  const isOwnerOfPin = Boolean(
    currentUser &&
      (currentUser.role === "SUPER_ADMIN" ||
        currentUser.ownedHotels.some((h) => h.id === pin.hotelId))
  );

  const visibleComments =
    commentsMode === "hidden"
      ? []
      : commentsMode === "preview"
      ? comments.slice(0, 1)
      : comments;

  const hiddenCommentsCount = Math.max(
    0,
    totalCommentsCount -
      (commentsMode === "preview" && comments.length > 0 ? 1 : 0)
  );

  return (
    <div key={pin.id} className="w-full pb-2 select-none animate-pin-stage-in">
      {/* TALL SPLIT PIN CLOSE-UP CARD (True Media Ratio Left | Clean Comments Right) */}
      <div className="max-w-[1120px] mx-auto rounded-[24px] bg-[var(--color-background-card)] border border-[var(--color-border)] grid grid-cols-1 lg:grid-cols-12 lg:h-[min(84vh,780px)] lg:min-h-[640px] overflow-hidden">
        {/* =================================================================
            LEFT STAGE: TRUE UNCROPPED ASPECT RATIO MEDIA (object-contain)
        ================================================================== */}
        <div className="lg:col-span-7 relative bg-[#f6f6f6] dark:bg-[#161616] min-h-[320px] lg:h-full flex items-center justify-center overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label={language === "th" ? "ย้อนกลับ" : "Back"}
            className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white text-[#111111] border border-black/10 inline-flex items-center justify-center transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
          </button>

          {pin.videoUrl ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <UniversalVideoPlayer
                videoUrl={pin.videoUrl}
                posterUrl={pin.coverImageUrl}
                title={title}
                aspectRatio={videoAspect}
                fitMode="contain"
                autoPlay={true}
                initialMuted={false}
              />
            </div>
          ) : (
            <>
              <img
                src={activeImageUrl}
                alt={title}
                className="w-full max-h-[78vh] lg:h-full lg:max-h-full object-contain select-none"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex(
                        (prev) => (prev - 1 + images.length) % images.length
                      )
                    }
                    aria-label="Previous image"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white text-[#111111] border border-black/10 inline-flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex((prev) => (prev + 1) % images.length)
                    }
                    aria-label="Next image"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white text-[#111111] border border-black/10 inline-flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        aria-label={`Photo ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === slideIndex
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => onExpandMedia(images, slideIndex)}
                aria-label="Expand image"
                className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white text-[#111111] border border-black/10 inline-flex items-center justify-center transition cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" strokeWidth={2.1} />
              </button>
            </>
          )}
        </div>

        {/* =================================================================
            RIGHT PANEL: CLEAN MINIMAL PINTEREST / FACEBOOK COMMENTS VIEW
        ================================================================== */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full max-h-[78vh] lg:max-h-full bg-[var(--color-background-card)] border-t lg:border-t-0 lg:border-l border-[var(--color-border)]">
          {/* 1. Clean Top Action Bar (♡ | 💬 | 📤  ...  [บันทึก] [✕]) */}
          <div className="px-5 py-3.5 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleLike(pin.id)}
                className="h-10 px-2.5 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <Heart
                  className={`w-[21px] h-[21px] ${
                    pin.isLikedByMe
                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                      : ""
                  }`}
                  strokeWidth={2.1}
                />
                <span>{pin.likesCount}</span>
              </button>

              <button
                type="button"
                onClick={handleCommentIconClick}
                aria-label="Show all comments"
                title={
                  language === "th"
                    ? "แสดงความคิดเห็นทั้งหมด"
                    : "Show all comments"
                }
                className={`h-10 px-2.5 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1.5 ty-body font-semibold transition cursor-pointer ${
                  commentsMode === "expanded"
                    ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <MessageCircle className="w-[20px] h-[20px]" strokeWidth={2.1} />
                {totalCommentsCount > 0 && <span>{totalCommentsCount}</span>}
              </button>

              <button
                type="button"
                onClick={handleShareWithFeedback}
                aria-label="Share"
                className="h-10 w-10 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
              >
                {justCopied ? (
                  <Check className="w-[20px] h-[20px] text-[var(--color-success)]" />
                ) : (
                  <Share className="w-[20px] h-[20px]" strokeWidth={2.1} />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleSave(pin.id)}
                className={`h-10 px-4 rounded-full ty-body font-semibold transition cursor-pointer ${
                  pin.isSavedByMe || savedPinIds.has(pin.id)
                    ? "bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111]"
                    : "bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] !text-white"
                }`}
              >
                {pin.isSavedByMe || savedPinIds.has(pin.id)
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
                aria-label={language === "th" ? "ปิด" : "Close"}
                className="h-9 w-9 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Clean Body: Compact Author + Optional Caption + Progressive Comments */}
          <div className="px-5 py-4 flex-1 overflow-y-auto space-y-4">
            {/* Compact Property Identity Row */}
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/${pin.hotelSlug}`}
                className="flex items-center gap-2.5 min-w-0 group/author"
              >
                {pin.hotelLogoUrl ? (
                  <img
                    src={pin.hotelLogoUrl}
                    alt={hotelName}
                    className="h-9 w-9 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)] border border-[var(--color-border)]"
                  />
                ) : (
                  <span className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center ty-caption font-bold shrink-0">
                    {hotelName[0] || "C"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[var(--color-text-primary)] group-hover/author:underline truncate flex items-center gap-1">
                    <span className="truncate">{hotelName}</span>
                    {pin.hotelVerificationStatus === "VERIFIED" && (
                      <BadgeCheck className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                    )}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                    {provinceLabel}
                  </p>
                </div>
              </Link>

              <Link
                href={`/${pin.hotelSlug}`}
                className="shrink-0 h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1 transition-colors"
              >
                <span>{language === "th" ? "ดูที่พัก" : "View stay"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Compact Collapsible Caption (Hidden by default past 1 line) */}
            {captionText && (
              <div className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                <p className={!isCaptionExpanded ? "line-clamp-1" : ""}>
                  {captionText}
                </p>
                {captionText.length > 56 && (
                  <button
                    type="button"
                    onClick={() => setIsCaptionExpanded((v) => !v)}
                    className="text-[12px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer mt-0.5"
                  >
                    {isCaptionExpanded
                      ? language === "th"
                        ? "ย่อข้อความ"
                        : "Show less"
                      : language === "th"
                      ? "อ่านเพิ่มเติม"
                      : "More"}
                  </button>
                )}
              </div>
            )}

            {/* Collapsible Comments Section (Preview 1 -> Click to Expand All) */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-3.5">
              <button
                type="button"
                onClick={handleToggleCommentsHeader}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                  {totalCommentsCount > 0
                    ? language === "th"
                      ? `${totalCommentsCount} ความคิดเห็น`
                      : `${totalCommentsCount} comments`
                    : language === "th"
                    ? "ความคิดเห็น"
                    : "Comments"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-transform duration-200 ${
                    commentsMode === "expanded" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {comments.length === 0 ? (
                <p className="text-[13px] text-[var(--color-text-secondary)] py-1">
                  {language === "th"
                    ? "ยังไม่มีความคิดเห็น ร่วมสอบถามที่พักหรือรีวิวเป็นคนแรกได้เลย"
                    : "No comments yet. Start the conversation below."}
                </p>
              ) : (
                <div className="space-y-3.5">
                  {visibleComments.map((cm) => {
                    const canRemove =
                      isOwnerOfPin || currentUser?.id === cm.userId;
                    const showReplies = commentsMode === "expanded";

                    return (
                      <div key={cm.id} className="space-y-2 select-text">
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
                            <p className="text-[14px] leading-snug break-words text-[var(--color-text-primary)]">
                              <strong className="font-bold mr-1.5">
                                {cm.authorName}
                              </strong>
                              {cm.isHotelOwnerReply && (
                                <span className="mr-1.5 inline-flex items-center rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[11px] font-semibold">
                                  เจ้าของที่พัก
                                </span>
                              )}
                              <span>{cm.body}</span>
                            </p>

                            <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                              <span>
                                {formatRelativeCommentDate(
                                  cm.createdAt,
                                  language
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setCommentsMode("expanded");
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

                        {/* Nested Replies (Shown when expanded) */}
                        {showReplies && cm.replies.length > 0 && (
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
                                    <p className="text-[14px] leading-snug break-words text-[var(--color-text-primary)]">
                                      <strong className="font-bold mr-1.5">
                                        {rp.authorName}
                                      </strong>
                                      {rp.isHotelOwnerReply && (
                                        <span className="mr-1.5 inline-flex items-center rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2 py-0.5 text-[11px] font-semibold">
                                          เจ้าของที่พัก
                                        </span>
                                      )}
                                      <span>{rp.body}</span>
                                    </p>
                                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
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
                                          <span>
                                            {language === "th"
                                              ? "ลบ"
                                              : "Delete"}
                                          </span>
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

                  {commentsMode !== "expanded" && hiddenCommentsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setCommentsMode("expanded")}
                      className="text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {language === "th"
                        ? `ดูความคิดเห็นที่ซ่อนอยู่อีก ${hiddenCommentsCount} รายการ`
                        : `View ${hiddenCommentsCount} more comments`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Sticky Bottom Pill Comment Input (Clean Pinterest Style) */}
          <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-card)] shrink-0 space-y-2">
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1 rounded-[8px] bg-[var(--color-background-muted)] text-[12px]">
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
              <div className="flex items-center gap-1 px-1">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      setCommentText((prev) => `${prev}${em}`);
                      commentInputRef.current?.focus();
                    }}
                    className="h-8 w-8 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[16px] cursor-pointer"
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
              {currentUser && (
                <UserAvatarCircle user={currentUser} sizeClass="h-8 w-8" />
              )}

              <div className="flex-1 h-11 rounded-full bg-[var(--color-background-muted)]/60 border border-[var(--color-border)] focus-within:bg-[var(--color-background-card)] focus-within:border-[var(--color-border-emphasized)] pl-4 pr-1.5 flex items-center gap-1.5 transition-colors">
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

                <button
                  type="button"
                  onClick={() => setShowEmojiBar((v) => !v)}
                  aria-label="Add emoji"
                  className="h-8 w-8 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer shrink-0"
                >
                  <Smile className="w-[18px] h-[18px]" />
                </button>

                {commentText.trim().length > 0 && (
                  <button
                    type="submit"
                    disabled={isSubmittingComment}
                    aria-label="Send comment"
                    className="h-8 w-8 rounded-full bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] hover:opacity-90 inline-flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
