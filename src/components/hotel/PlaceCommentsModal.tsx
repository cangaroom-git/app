"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Share,
  Trash2,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type {
  AuthenticatedMeDto,
  PinCommentDto,
  PinFeedItemDto,
} from "@/types/cangaroom";

export interface PlaceCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: PinFeedItemDto;
  mediaUrls: string[];
  comments: PinCommentDto[];
  language: LanguageCode;
  currentUser: AuthenticatedMeDto | null;
  isLiked: boolean;
  likesCount: number;
  isSaved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  onAddComment: (text: string, parentId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

function CommentAvatar({
  src,
  name,
  sizeClass = "h-7 w-7 text-[11px]",
}: {
  src?: string | null;
  name: string;
  sizeClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]`}
      />
    );
  }
  return (
    <span
      className={`${sizeClass} rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] font-semibold inline-flex items-center justify-center shrink-0 mt-0.5`}
    >
      {(name || "U")[0]}
    </span>
  );
}

function formatShortRelativeTime(iso: string, lang: LanguageCode): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return lang === "th" ? "เมื่อสักครู่" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === "th" ? `${diffMin} นาที` : `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === "th" ? `${diffHr} ชม.` : `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return lang === "th" ? `${diffDay} วัน` : `${diffDay}d`;
  const diffMo = Math.floor(diffDay / 30);
  return lang === "th" ? `${diffMo} เดือน` : `${diffMo}mo`;
}

/**
 * Clean Instagram-Style Comment Modal:
 * - Desktop (`>= lg`): Crisp 2-column centered modal (Left: full-bleed place photo carousel | Right: clean white comments & composer)
 * - Mobile (`< lg`): Native Slide-Up Bottom Sheet with top drag handle & thumb-zone composer
 * - Uses `useModalPresence` for silky fade slide-in & fade slide-out + `useBodyScrollLock`!
 */
export function PlaceCommentsModal({
  isOpen,
  onClose,
  pin,
  mediaUrls,
  comments,
  language,
  currentUser,
  isLiked,
  likesCount,
  isSaved,
  onToggleLike,
  onToggleSave,
  onShare,
  onAddComment,
  onDeleteComment,
}: PlaceCommentsModalProps) {
  const isTh = language === "th";
  const { shouldRender, dataState } = useModalPresence(isOpen, 250);
  useBodyScrollLock(shouldRender);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const photos =
    mediaUrls.length > 0 ? mediaUrls : [pin.coverImageUrl].filter(Boolean);
  const safePhotoIdx = Math.min(photoIdx, Math.max(0, photos.length - 1));
  const placeName = isTh ? pin.hotelNameTh : pin.hotelNameEn;
  const catMeta = getPlaceCategoryMeta(pin.placeCategory);
  const caption = (isTh ? pin.descriptionTh : pin.descriptionEn)?.trim();

  useEffect(() => {
    if (!isOpen) return;
    setPhotoIdx(0);
    setReplyingTo(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment(clean, replyingTo?.id ?? null);
      setText("");
      setReplyingTo(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      await onDeleteComment(commentId);
    } finally {
      setDeletingId(null);
    }
  };

  if (!shouldRender || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? `ความคิดเห็นของ ${placeName}` : `Comments for ${placeName}`}
      data-state={dataState}
      onClick={onClose}
      className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/55 flex items-end lg:items-center justify-center p-0 lg:p-6"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="cgr-modal-surface-lg w-full h-[84dvh] lg:w-[92vw] lg:max-w-[980px] lg:h-[min(86vh,700px)] rounded-t-[24px] lg:rounded-[20px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] overflow-hidden flex flex-col lg:grid lg:grid-cols-12"
      >
        {/* Mobile Top Drag Handle (< lg) */}
        <div className="flex lg:hidden justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* LEFT COLUMN (Desktop >= lg ONLY): Clean Full-Bleed Instagram Media Stage */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-[#141414] items-center justify-center overflow-hidden select-none">
          {photos[safePhotoIdx] && (
            <img
              src={getOptimizedPinImageUrl(photos[safePhotoIdx], "hero")}
              alt={placeName}
              draggable={false}
              className="w-full h-full object-cover object-center"
            />
          )}

          {photos.length > 1 && (
            <>
              {safePhotoIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setPhotoIdx((p) => Math.max(0, p - 1))}
                  aria-label={isTh ? "ภาพก่อนหน้า" : "Previous photo"}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[11px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {safePhotoIdx < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIdx((p) => Math.min(photos.length - 1, p + 1))
                  }
                  aria-label={isTh ? "ภาพถัดไป" : "Next photo"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[11px] bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] bg-black/45 backdrop-blur-sm">
                {photos.slice(0, 7).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === safePhotoIdx
                        ? "w-3 bg-white"
                        : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN (Desktop) / FULL SHEET (Mobile): Ultra-Clean Instagram Comments & Composer */}
        <div className="flex-1 lg:col-span-6 min-h-0 flex flex-col bg-[var(--color-background-popover)] lg:border-l lg:border-[var(--color-border)]">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              {pin.hotelLogoUrl ? (
                <img
                  src={pin.hotelLogoUrl}
                  alt={placeName}
                  className="h-8 w-8 rounded-full object-cover shrink-0 bg-[var(--color-background-muted)]"
                />
              ) : (
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center justify-center shrink-0">
                  {placeName[0] || "N"}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1">
                  <span className="truncate">{placeName}</span>
                  {pin.hotelVerificationStatus === "VERIFIED" && (
                    <BadgeCheck className="w-3.5 h-3.5 text-[var(--color-text-primary)] shrink-0" />
                  )}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
                  {isTh ? catMeta.shortLabelTh : catMeta.shortLabelEn} ·{" "}
                  {isTh ? pin.provinceNameTh : pin.provinceNameEn}
                  {totalCount > 0 ? ` · ${totalCount} ${isTh ? "ความคิดเห็น" : "comments"}` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={isTh ? "ปิด" : "Close"}
              className="h-8 w-8 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Comments Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Place Caption */}
            {caption && (
              <div className="flex items-start gap-2.5 pb-3 border-b border-[var(--color-border)]">
                {pin.hotelLogoUrl ? (
                  <img
                    src={pin.hotelLogoUrl}
                    alt={placeName}
                    className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5 bg-[var(--color-background-muted)]"
                  />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] text-[11px] font-semibold inline-flex items-center justify-center shrink-0 mt-0.5">
                    {placeName[0] || "N"}
                  </span>
                )}
                <p className="text-[13.5px] leading-relaxed text-[var(--color-text-primary)] min-w-0">
                  <span className="font-semibold mr-1.5">{placeName}</span>
                  {caption}
                </p>
              </div>
            )}

            {comments.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ยังไม่มีความคิดเห็น" : "No comments yet"}
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  {isTh
                    ? "เริ่มพูดคุยหรือสอบถามเจ้าของสถานที่ได้เลย"
                    : "Start the conversation or ask the host a question"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const canDelete =
                    currentUser &&
                    (currentUser.id === comment.userId ||
                      currentUser.role === "SUPER_ADMIN");
                  return (
                    <div key={comment.id} className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <CommentAvatar
                          src={comment.authorAvatar}
                          name={comment.authorName}
                          sizeClass="h-7 w-7 text-[11px]"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-[13.5px] leading-relaxed text-[var(--color-text-primary)] break-words">
                            <span className="font-semibold mr-1.5">
                              {comment.authorName}
                            </span>
                            {comment.isHotelOwnerReply && (
                              <span className="inline-flex items-center px-1.5 py-0.5 mr-1.5 rounded-[6px] bg-[var(--color-background-muted)] text-[10.5px] font-semibold text-[var(--color-text-primary)]">
                                {isTh ? "เจ้าของสถานที่" : "Owner"}
                              </span>
                            )}
                            {comment.body}
                          </p>
                          <div className="flex items-center gap-3 text-[11.5px] text-[var(--color-text-secondary)]">
                            <span>
                              {formatShortRelativeTime(
                                comment.createdAt,
                                language
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({
                                  id: comment.id,
                                  authorName: comment.authorName,
                                });
                                inputRef.current?.focus();
                              }}
                              className="font-semibold hover:text-[var(--color-text-primary)] cursor-pointer"
                            >
                              {isTh ? "ตอบกลับ" : "Reply"}
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                disabled={deletingId === comment.id}
                                onClick={() => void handleDelete(comment.id)}
                                className="inline-flex items-center gap-1 hover:text-[var(--color-error)] cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isTh ? "ลบ" : "Delete"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-9 space-y-2.5">
                          {comment.replies.map((reply) => {
                            const canDeleteReply =
                              currentUser &&
                              (currentUser.id === reply.userId ||
                                currentUser.role === "SUPER_ADMIN");
                            return (
                              <div
                                key={reply.id}
                                className="flex items-start gap-2"
                              >
                                <CommentAvatar
                                  src={reply.authorAvatar}
                                  name={reply.authorName}
                                  sizeClass="h-6 w-6 text-[10px]"
                                />
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="text-[13px] leading-relaxed text-[var(--color-text-primary)] break-words">
                                    <span className="font-semibold mr-1.5">
                                      {reply.authorName}
                                    </span>
                                    {reply.isHotelOwnerReply && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 mr-1.5 rounded-[6px] bg-[var(--color-background-muted)] text-[10px] font-semibold text-[var(--color-text-primary)]">
                                        {isTh ? "เจ้าของสถานที่" : "Owner"}
                                      </span>
                                    )}
                                    {reply.body}
                                  </p>
                                  <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)]">
                                    <span>
                                      {formatShortRelativeTime(
                                        reply.createdAt,
                                        language
                                      )}
                                    </span>
                                    {canDeleteReply && (
                                      <button
                                        type="button"
                                        disabled={deletingId === reply.id}
                                        onClick={() =>
                                          void handleDelete(reply.id)
                                        }
                                        className="hover:text-[var(--color-error)] cursor-pointer"
                                      >
                                        {isTh ? "ลบ" : "Delete"}
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

          {/* Bottom Clean Instagram Action Bar + Composer */}
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 pt-3 pb-[max(14px,var(--cgr-safe-bottom))] lg:pb-3.5 space-y-2.5 bg-[var(--color-background-popover)]">
            {/* Desktop Action Icons Bar (Matching Instagram Reference!) */}
            <div className="hidden lg:flex items-center justify-between">
              <div className="flex items-center gap-1 -ml-1.5">
                <button
                  type="button"
                  onClick={onToggleLike}
                  aria-label={isTh ? "ถูกใจ" : "Like"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  <Heart
                    className={`w-[20px] h-[20px] ${
                      isLiked
                        ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                        : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  aria-label={isTh ? "แสดงความคิดเห็น" : "Comment"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  <MessageCircle className="w-[20px] h-[20px]" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  aria-label={isTh ? "แชร์" : "Share"}
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  <Share className="w-[19px] h-[19px]" strokeWidth={2} />
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleSave}
                aria-label={isSaved ? (isTh ? "บันทึกแล้ว" : "Saved") : isTh ? "บันทึก" : "Save"}
                className={`h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer transition-colors ${
                  isSaved
                    ? "text-[var(--color-promo)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <Bookmark
                  className={`w-[20px] h-[20px] ${isSaved ? "fill-current" : ""}`}
                  strokeWidth={2}
                />
              </button>
            </div>

            {likesCount > 0 && (
              <p className="hidden lg:block text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                {isTh
                  ? `ถูกใจ ${likesCount.toLocaleString()} คน`
                  : `${likesCount.toLocaleString()} ${
                      likesCount === 1 ? "like" : "likes"
                    }`}
              </p>
            )}

            {replyingTo && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[9px] bg-[var(--color-background-muted)] text-[12px] text-[var(--color-text-secondary)]">
                <span className="truncate">
                  {isTh ? "กำลังตอบกลับ" : "Replying to"}{" "}
                  <strong className="text-[var(--color-text-primary)]">
                    {replyingTo.authorName}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="font-semibold text-[var(--color-text-primary)] cursor-pointer shrink-0"
                >
                  {isTh ? "ยกเลิก" : "Cancel"}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  isTh ? "เพิ่มความคิดเห็น..." : "Add a comment..."
                }
                className="flex-1 min-w-0 h-10 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-primary)]"
              />
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                aria-label={isTh ? "โพสต์ความคิดเห็น" : "Post comment"}
                className="h-10 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTh ? "โพสต์" : "Post"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
