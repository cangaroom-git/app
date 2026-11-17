"use client";

import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share,
  Smile,
  Trash2,
} from "lucide-react";
import { PinCommentItem } from "@/data/cmsDefaults";
import { LanguageCode } from "@/lib/dateFormatters";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { UniversalVideoPlayer } from "@/components/cms/UniversalVideoPlayer";
import {
  AuthenticatedProfileUser,
  UserAvatarCircle,
} from "@/components/navigation/UserProfileDropdown";

export type PinCategoryId =
  | "all"
  | "rooms"
  | "videos"
  | "views"
  | "dining"
  | "reviews"
  | "deals";

export interface PinterestPinItem {
  id: string;
  category: Exclude<PinCategoryId, "all">;
  aspectClass: string;
  imageUrl: string;
  galleryUrls: string[];
  videoUrl?: string;
  videoDuration?: string;
  title: string;
  description: string;
  boardLabel: string;
  authorName: string;
  authorSubtitle: string;
  authorAvatar?: string;
  footerCaption?: string;
  footerSubcaption?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  baseLikes: number;
  onEdit?: () => void;
}

export interface PinterestPinCardProps {
  pin: PinterestPinItem;
  language: LanguageCode;
  isSaved: boolean;
  canEdit?: boolean;
  onSelectPin: (pin: PinterestPinItem) => void;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinterestPinItem) => void;
}

export function PinterestPinCard({
  pin,
  language,
  isSaved,
  canEdit = false,
  onSelectPin,
  onToggleSave,
  onSharePin,
}: PinterestPinCardProps) {
  return (
    <article className="break-inside-avoid mb-4 select-none">
      <div
        onClick={() => onSelectPin(pin)}
        className={`group relative w-full ${pin.aspectClass} rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer`}
      >
        <img
          src={pin.imageUrl}
          alt={pin.title}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover object-center"
        />

        {/* Video Duration Pill at Top-Left (Exact Pinterest Video Pin Badge) */}
        {pin.videoDuration && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-black/65 text-white px-2 py-0.5 text-[11px] font-semibold tabular-nums pointer-events-none group-hover:opacity-0 transition-opacity">
            {pin.videoDuration}
          </span>
        )}

        {/* Desktop Hover Overlay (ZERO Hover Scale — Subtle Veil + Save Pill + Quick Actions) */}
        <div className="hidden sm:flex absolute inset-0 bg-black/28 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-3 flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-white ty-caption !text-white font-semibold truncate max-w-[55%]">
              <span className="truncate">{pin.boardLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(pin.id);
              }}
              className={`h-9 px-4 rounded-full ty-body font-semibold transition cursor-pointer shrink-0 ${
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
            {pin.ctaLabel && pin.onCtaClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pin.onCtaClick?.();
                }}
                className="h-8 px-3 rounded-full bg-white/90 hover:bg-white text-[#111111] ty-caption !text-[#111111] font-semibold inline-flex items-center gap-1 truncate max-w-[75%] cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{pin.ctaLabel}</span>
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSharePin(pin);
              }}
              aria-label="Share"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-[#111111] inline-flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Live Edit Button */}
        {canEdit && pin.onEdit && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 left-2.5 z-20"
          >
            <EditSpotButton onClick={pin.onEdit} />
          </div>
        )}
      </div>

      {/* Subtle Pinterest Footer Caption (Shown cleanly under featured/room/review pins) */}
      {pin.footerCaption && (
        <div className="pt-1.5 px-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate leading-snug">
              {pin.footerCaption}
            </p>
            {pin.footerSubcaption && (
              <p className="text-[12px] text-[var(--color-text-secondary)] truncate leading-tight">
                {pin.footerSubcaption}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelectPin(pin)}
            aria-label="More details"
            className="h-6 w-6 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] shrink-0 cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}
    </article>
  );
}

const QUICK_EMOJIS = ["❤️", "😍", "✨", "🌿", "🔥", "👏"];

function formatRelativeCommentDate(iso: string, lang: LanguageCode): string {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 60) return lang === "th" ? "เมื่อสักครู่" : "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return lang === "th" ? `${mins} นาที` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "th" ? `${hrs} ชม.` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return lang === "th" ? `${days} วัน` : `${days}d`;
}

export interface PinterestPinDetailProps {
  pin: PinterestPinItem;
  relatedPins: PinterestPinItem[];
  language: LanguageCode;
  currentUser: AuthenticatedProfileUser | null;
  canEdit?: boolean;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  savedPinsMap: Record<string, boolean>;
  comments: PinCommentItem[];
  onClose: () => void;
  onSelectPin: (nextPin: PinterestPinItem) => void;
  onToggleLike: () => void;
  onToggleSave: (pinId: string) => void;
  onSharePin: (pin: PinterestPinItem) => void;
  onExpandMedia: (urls: string[], index: number) => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function PinterestPinDetail({
  pin,
  relatedPins,
  language,
  currentUser,
  canEdit = false,
  isLiked,
  likeCount,
  isSaved,
  savedPinsMap,
  comments,
  onClose,
  onSelectPin,
  onToggleLike,
  onToggleSave,
  onSharePin,
  onExpandMedia,
  onAddComment,
  onDeleteComment,
}: PinterestPinDetailProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<
    Record<string, boolean>
  >({});
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const images =
    pin.galleryUrls.length > 0 ? pin.galleryUrls : [pin.imageUrl];
  const activeImageUrl = images[slideIndex] || pin.imageUrl;

  const sideRelatedPins = relatedPins.slice(0, 6);
  const bottomRelatedPins = relatedPins.slice(6);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText("");
    setShowEmojiBar(false);
  };

  const handleShareWithFeedback = () => {
    onSharePin(pin);
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1800);
  };

  const isLongDesc = pin.description.length > 150;

  return (
    <div className="space-y-8 select-none">
      {/* TOP SECTION: Main Split 2-Column Pin Card (xl:col-span-8) + Side 2-Column Related Masonry (xl:col-span-4) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* MAIN PINTEREST SPLIT 2-COLUMN PIN CLOSE-UP CARD */}
        <div className="xl:col-span-8 rounded-[28px] bg-[var(--color-background-card)] border border-[var(--color-border)] shadow-[var(--shadow-card)] grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          {/* LEFT COLUMN: MEDIA STAGE */}
          <div className="relative bg-[var(--color-background-muted)] flex items-center justify-center min-h-[340px] md:min-h-[540px] overflow-hidden">
            {/* Top-Left Back Arrow Button (Exact Match to Pinterest Image 2) */}
            <button
              type="button"
              onClick={onClose}
              aria-label={language === "th" ? "ย้อนกลับ" : "Back"}
              title={language === "th" ? "กลับหน้าตารางพิน" : "Back to feed"}
              className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-white/92 hover:bg-white text-[#111111] shadow-sm inline-flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {pin.videoUrl ? (
              <div className="w-full h-full min-h-[460px] bg-black flex items-center justify-center">
                <UniversalVideoPlayer
                  videoUrl={pin.videoUrl}
                  posterUrl={pin.imageUrl}
                  title={pin.title}
                  aspectRatio="9/16"
                  autoPlay={true}
                  initialMuted={false}
                />
              </div>
            ) : (
              <>
                <img
                  src={activeImageUrl}
                  alt={pin.title}
                  className="w-full h-full max-h-[680px] object-cover"
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-sm inline-flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((prev) => (prev + 1) % images.length)
                      }
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-sm inline-flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1">
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

                {/* Bottom-Right Expand Zoom Icon (Exact Match to Pinterest Image 2) */}
                <button
                  type="button"
                  onClick={() => onExpandMedia(images, slideIndex)}
                  aria-label="Expand image"
                  title={language === "th" ? "ขยายรูปเต็มจอ" : "View full size"}
                  className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-white/92 hover:bg-white text-[#111111] shadow-sm inline-flex items-center justify-center transition cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: ACTIONS, INFO & LIVE COMMENTS */}
          <div className="flex flex-col justify-between min-h-[480px] md:max-h-[680px] bg-[var(--color-background-card)]">
            {/* 1. Sticky Top Action Bar (♡ Like, 💬 Comment, ↑ Share, Board + Red บันทึก Pill) */}
            <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleLike}
                  className="h-10 px-2.5 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <Heart
                    className={`w-[21px] h-[21px] ${
                      isLiked
                        ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                        : ""
                    }`}
                  />
                  <span>{likeCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => commentInputRef.current?.focus()}
                  aria-label="Comment"
                  className="h-10 w-10 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <MessageCircle className="w-[21px] h-[21px]" />
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
                    <Share className="w-[20px] h-[20px]" />
                  )}
                </button>

                {canEdit && pin.onEdit && (
                  <EditSpotButton label="แก้ไข" onClick={pin.onEdit} />
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]">
                  <span className="truncate">{pin.boardLabel}</span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </span>

                <button
                  type="button"
                  onClick={() => onToggleSave(pin.id)}
                  className={`h-11 px-5 rounded-full ty-body font-semibold transition cursor-pointer ${
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
            </div>

            {/* 2. Scrollable Author, Title, CTA Pill, Description & Comments List */}
            <div className="px-5 sm:px-6 py-2 flex-1 overflow-y-auto space-y-4">
              {/* Author Row */}
              <div className="flex items-center gap-2.5">
                {pin.authorAvatar ? (
                  <img
                    src={pin.authorAvatar}
                    alt={pin.authorName}
                    className="h-8 w-8 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)]"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-[var(--color-promo)] text-white inline-flex items-center justify-center ty-caption !text-white font-bold shrink-0">
                    {pin.authorName[0] || "S"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="ty-caption font-semibold text-[var(--color-text-primary)] leading-snug">
                    {pin.authorName} · {pin.authorSubtitle}
                  </p>
                </div>
              </div>

              {/* Pin Title */}
              <h1 className="ty-title leading-snug">{pin.title}</h1>

              {/* Gray Full-Width Pill Button (Matches Pinterest's "เยี่ยมชมเว็บไซต์" Button) */}
              {pin.ctaLabel && pin.onCtaClick && (
                <button
                  type="button"
                  onClick={pin.onCtaClick}
                  className="w-full h-11 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ty-body font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{pin.ctaLabel}</span>
                </button>
              )}

              {/* Description Section ("คำอธิบาย") */}
              <div className="space-y-1.5">
                <h2 className="ty-body font-bold">
                  {language === "th" ? "คำอธิบาย" : "Description"}
                </h2>
                <p
                  className={`ty-body text-[var(--color-text-primary)] ${
                    !isDescExpanded && isLongDesc ? "line-clamp-3" : ""
                  }`}
                >
                  {pin.description}
                </p>
                {isLongDesc && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded((v) => !v)}
                    className="ty-body font-bold text-[var(--color-text-primary)] hover:underline block ml-auto cursor-pointer"
                  >
                    {isDescExpanded
                      ? language === "th"
                        ? "ย่อข้อความ"
                        : "Show less"
                      : language === "th"
                      ? "ดูเพิ่มเติม"
                      : "More"}
                  </button>
                )}
              </div>

              {/* Comments List ("ความคิดเห็น") */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-3.5">
                <h3 className="ty-body font-bold flex items-center gap-1.5">
                  <span>
                    {language === "th" ? "ความคิดเห็น" : "Comments"}
                  </span>
                  {comments.length > 0 && (
                    <span className="ty-caption font-semibold">
                      ({comments.length})
                    </span>
                  )}
                </h3>

                {comments.length === 0 ? (
                  <p className="ty-caption py-2">
                    {language === "th"
                      ? "ยังไม่มีความคิดเห็น ร่วมแบ่งปันความประทับใจคนแรกได้เลยครับ"
                      : "No comments yet! Add one to start the conversation."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((cm) => {
                      const canRemove =
                        canEdit ||
                        currentUser?.role === "SUPER_ADMIN" ||
                        currentUser?.role === "HOTEL_ADMIN" ||
                        (Boolean(currentUser?.email) &&
                          currentUser?.email === cm.authorEmail);
                      const cmLiked = Boolean(likedCommentIds[cm.id]);

                      return (
                        <div
                          key={cm.id}
                          className="flex items-start gap-2.5 select-text"
                        >
                          {cm.authorAvatar ? (
                            <img
                              src={cm.authorAvatar}
                              alt={cm.authorName}
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center ty-caption font-bold shrink-0 mt-0.5">
                              {(cm.authorName[0] || "G").toUpperCase()}
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="ty-body leading-snug break-words">
                              <strong className="font-bold mr-1.5">
                                {cm.authorName}
                              </strong>
                              <span>{cm.text}</span>
                            </p>

                            <div className="mt-1 flex items-center gap-3 ty-caption">
                              <span>
                                {formatRelativeCommentDate(
                                  cm.createdAtIso,
                                  language
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setLikedCommentIds((prev) => ({
                                    ...prev,
                                    [cm.id]: !prev[cm.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] cursor-pointer"
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 ${
                                    cmLiked
                                      ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                                      : ""
                                  }`}
                                />
                                {cm.likes + (cmLiked ? 1 : 0) > 0 && (
                                  <span>{cm.likes + (cmLiked ? 1 : 0)}</span>
                                )}
                              </button>

                              {canRemove && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteComment(cm.id)}
                                  aria-label="Delete comment"
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Sticky Bottom Rounded Comment Input Pill (Exact Match to Pinterest Image 2) */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-background-card)] shrink-0 space-y-2">
              {showEmojiBar && (
                <div className="flex items-center gap-1.5 px-1">
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
                className="flex items-center gap-2.5"
              >
                {currentUser && (
                  <UserAvatarCircle user={currentUser} sizeClass="h-9 w-9" />
                )}

                <div className="flex-1 h-12 rounded-full border border-[var(--color-border-emphasized)] focus-within:border-[var(--color-text-primary)] px-4 flex items-center gap-2 bg-[var(--color-background-card)]">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      language === "th"
                        ? "เพิ่มความคิดเห็นเพื่อแชร์ความเห็นของคุณ"
                        : "Add a comment to share your thoughts"
                    }
                    className="flex-1 min-w-0 bg-transparent ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowEmojiBar((v) => !v)}
                    aria-label="Add emoji"
                    className="h-8 w-8 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer shrink-0"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {commentText.trim().length > 0 && (
                    <button
                      type="submit"
                      aria-label="Send comment"
                      className="h-8 w-8 rounded-full bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-white inline-flex items-center justify-center transition cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT 2-COLUMN RELATED PINS SIDEBAR ON WIDE DESKTOP (Matches Pinterest Image 2!) */}
        {sideRelatedPins.length > 0 && (
          <div className="hidden xl:block xl:col-span-4 columns-2 gap-4">
            {sideRelatedPins.map((relPin) => (
              <PinterestPinCard
                key={`side-${relPin.id}`}
                pin={relPin}
                language={language}
                isSaved={Boolean(savedPinsMap[relPin.id])}
                canEdit={canEdit}
                onSelectPin={onSelectPin}
                onToggleSave={onToggleSave}
                onSharePin={onSharePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM FULL-WIDTH RELATED MASONRY GRID */}
      {bottomRelatedPins.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="ty-title text-center">
            {language === "th" ? "สำรวจเพิ่มเติมที่คล้ายกัน" : "More to explore"}
          </h2>

          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 2xl:columns-6 gap-4">
            {bottomRelatedPins.map((relPin) => (
              <PinterestPinCard
                key={`bot-${relPin.id}`}
                pin={relPin}
                language={language}
                isSaved={Boolean(savedPinsMap[relPin.id])}
                canEdit={canEdit}
                onSelectPin={onSelectPin}
                onToggleSave={onToggleSave}
                onSharePin={onSharePin}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
