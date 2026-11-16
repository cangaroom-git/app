"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BedDouble,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Send,
  Share2,
  ShoppingBag,
  Tag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { RoomLodge } from "@/data/rooms";
import { ShortVideoComment, ShortVideoItem } from "@/data/shortsData";
import { LanguageCode } from "@/lib/dateFormatters";
import { parseVideoSource } from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { UniversalVideoPlayer } from "@/components/cms/UniversalVideoPlayer";
import { StandardButton } from "@/components/ui/standards";

export interface ShortVideoDrawerProps {
  activeVideo: ShortVideoItem | null;
  videoIndex: number;
  totalVideosCount: number;
  linkedRoom: RoomLodge | null;
  language: LanguageCode;
  channelHandle?: string;
  channelAvatarUrl?: string;
  canEdit?: boolean;
  onEditActiveVideo?: () => void;
  isLiked: boolean;
  isBookmarked: boolean;
  isCouponSavedInBag: boolean;
  comments: ShortVideoComment[];
  onClose: () => void;
  onNavigateVideo: (direction: "prev" | "next") => void;
  onToggleLike: (videoId: string) => void;
  onToggleBookmark: (videoId: string) => void;
  onClaimCouponToBag: (couponCode: string) => void;
  onAddComment: (videoId: string, commentText: string) => void;
  onBookLinkedRoom: (room: RoomLodge) => void;
}

function formatPlaybackSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function ShortVideoDrawer({
  activeVideo,
  videoIndex,
  totalVideosCount,
  linkedRoom,
  language,
  channelHandle = "sapanunseen",
  channelAvatarUrl = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=160&q=80",
  canEdit = false,
  onEditActiveVideo,
  isLiked,
  isBookmarked,
  isCouponSavedInBag,
  comments,
  onClose,
  onNavigateVideo,
  onToggleLike,
  onToggleBookmark,
  onClaimCouponToBag,
  onAddComment,
  onBookLinkedRoom,
}: ShortVideoDrawerProps) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState("0:00");
  const [durationLabel, setDurationLabel] = useState("0:15");
  const [hasCopiedShareLink, setHasCopiedShareLink] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  useBodyScrollLock(Boolean(activeVideo));

  const parsedSource = activeVideo
    ? parseVideoSource(activeVideo.videoUrl, {
        autoplay: true,
        muted: isMuted,
      })
    : null;
  const isExternalEmbed =
    parsedSource?.provider === "youtube" ||
    parsedSource?.provider === "facebook";

  useEffect(() => {
    if (!activeVideo || isExternalEmbed) {
      return;
    }
    setProgressPercent(0);
    setCurrentTimeLabel("0:00");
    setDurationLabel("0:15");
    setIsPlaying(true);

    const timerId = window.setTimeout(() => {
      const videoEl = videoElementRef.current;
      if (!videoEl) return;
      videoEl.currentTime = 0;
      videoEl
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => {});
        });
    }, 30);

    return () => window.clearTimeout(timerId);
  }, [activeVideo, isExternalEmbed]);

  useEffect(() => {
    if (!activeVideo) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement)?.tagName;
      if (targetTag === "INPUT" || targetTag === "TEXTAREA") return;
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onNavigateVideo("next");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onNavigateVideo("prev");
      } else if (event.key === " " && !isExternalEmbed) {
        event.preventDefault();
        handleTogglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo, isExternalEmbed, onClose, onNavigateVideo]);

  if (!activeVideo) {
    return null;
  }

  const handleTogglePlayPause = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !videoEl.duration) return;
    setProgressPercent((videoEl.currentTime / videoEl.duration) * 100);
    setCurrentTimeLabel(formatPlaybackSeconds(videoEl.currentTime));
    setDurationLabel(formatPlaybackSeconds(videoEl.duration));
  };

  const handleSeekProgress = (event: React.MouseEvent<HTMLDivElement>) => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !videoEl.duration) return;
    const barRect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (event.clientX - barRect.left) / barRect.width)
    );
    videoEl.currentTime = ratio * videoEl.duration;
    setProgressPercent(ratio * 100);
  };

  const handleShareShortLink = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/shorts?v=${activeVideo.id}`
        : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: activeVideo.titleTh,
          text: activeVideo.captionTh,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // Fallback to clipboard copy
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      setHasCopiedShareLink(true);
      window.setTimeout(() => setHasCopiedShareLink(false), 2000);
    }
  };

  const handleCommentFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedComment = commentInput.trim();
    if (!trimmedComment) return;
    onAddComment(activeVideo.id, trimmedComment);
    setCommentInput("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pickLocalizedText(
        language,
        activeVideo.titleTh,
        activeVideo.titleEn
      )}
      className="fixed inset-0 z-[70] flex justify-end"
    >
      <div
        onClick={onClose}
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
      />

      <div className="app-right-drawer z-10 animate-slide-in-right-drawer">
        {/* 1. Unified Drawer Header */}
        <header className="px-4 sm:px-5 py-3 bg-[var(--color-background-card)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[var(--color-background-muted)]">
              <img
                src={channelAvatarUrl}
                alt={channelHandle}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                  {channelHandle}
                </span>
                <Check className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
              </div>
              <p className="ty-caption truncate">
                {videoIndex + 1} / {totalVideosCount} ·{" "}
                {linkedRoom?.code || "Sapan Unseen"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && onEditActiveVideo && (
              <EditSpotButton label="แก้คลิป" onClick={onEditActiveVideo} />
            )}

            <button
              type="button"
              onClick={() => onNavigateVideo("prev")}
              aria-label={
                language === "th" ? "คลิปก่อนหน้า" : "Previous video"
              }
              title={language === "th" ? "คลิปก่อนหน้า" : "Previous"}
              className="btn-icon"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateVideo("next")}
              aria-label={language === "th" ? "คลิปถัดไป" : "Next video"}
              title={language === "th" ? "คลิปถัดไป" : "Next"}
              className="btn-icon"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {!isExternalEmbed && (
              <button
                type="button"
                onClick={() => setIsMuted((prevMuted) => !prevMuted)}
                aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                title={isMuted ? "Unmute" : "Mute"}
                className="btn-icon"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[var(--color-accent)]" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={language === "th" ? "ปิดวิดีโอ" : "Close"}
              className="btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. Scrollable Stream: Strict 9:16 Video Stage + Promo Claim + Social + Comments */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-background-card)]">
          <div className="w-full bg-black flex items-center justify-center p-3">
            <div className="relative w-full max-w-[264px] sm:max-w-[292px] aspect-[9/16] rounded-[16px] overflow-hidden bg-black flex items-center justify-center">
              {isExternalEmbed ? (
                <UniversalVideoPlayer
                  videoUrl={activeVideo.videoUrl}
                  posterUrl={activeVideo.posterUrl}
                  title={activeVideo.titleTh}
                  aspectRatio="9/16"
                  autoPlay={true}
                  initialMuted={isMuted}
                />
              ) : (
                <>
                  <video
                    ref={videoElementRef}
                    src={activeVideo.videoUrl}
                    poster={activeVideo.posterUrl}
                    autoPlay
                    playsInline
                    loop
                    muted={isMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={handleTogglePlayPause}
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={handleTogglePlayPause}
                      aria-label={
                        language === "th" ? "เล่นวิดีโอ" : "Play video"
                      }
                      className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md hover:scale-105 transition cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </button>
                  )}

                  <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 z-20">
                    <div
                      onClick={handleSeekProgress}
                      className="w-full h-1.5 bg-white/30 hover:h-2 rounded-full cursor-pointer relative transition-all"
                    >
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-white ty-caption">
                      <button
                        type="button"
                        onClick={handleTogglePlayPause}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        )}
                      </button>

                      <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white font-mono">
                        {currentTimeLabel} / {durationLabel}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Caption, #c53829 Coupon Bag Claim, Social Actions & Comments */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <h2 className="ty-subtitle text-[var(--color-text-primary)]">
                {pickLocalizedText(
                  language,
                  activeVideo.titleTh,
                  activeVideo.titleEn
                )}
              </h2>
              <p className="ty-body text-[var(--color-text-secondary)]">
                {pickLocalizedText(
                  language,
                  activeVideo.captionTh,
                  activeVideo.captionEn
                )}
              </p>
              <div className="flex items-center gap-1.5 ty-caption pt-0.5">
                <Music2 className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span className="truncate">{activeVideo.audioLabel}</span>
              </div>
            </div>

            {activeVideo.couponCode && (
              <div className="p-3.5 rounded-[16px] bg-[var(--color-promo-muted)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="ty-body font-bold text-[var(--color-promo-text)] truncate">
                      {language === "th"
                        ? `โค้ดส่วนลด: ${activeVideo.couponCode}`
                        : `Promo Code: ${activeVideo.couponCode}`}
                    </p>
                    <p className="ty-caption truncate">
                      {isCouponSavedInBag
                        ? language === "th"
                          ? "เก็บไว้ในกระเป๋าคูปองแล้ว"
                          : "Saved in your Coupon Bag"
                        : language === "th"
                        ? "กดเก็บเข้ากระเป๋าคูปองและใช้ลดทันที"
                        : "Save to Coupon Bag & apply instantly"}
                    </p>
                  </div>
                </div>

                <StandardButton
                  variant="promo"
                  size="sm"
                  onClick={() => onClaimCouponToBag(activeVideo.couponCode!)}
                  className="shrink-0"
                >
                  {isCouponSavedInBag ? (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        {language === "th" ? "อยู่ในกระเป๋า" : "In Bag"}
                      </span>
                    </>
                  ) : (
                    <span>{language === "th" ? "เก็บโค้ด" : "Save"}</span>
                  )}
                </StandardButton>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLike(activeVideo.id)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isLiked
                        ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                        : ""
                    }`}
                  />
                  <span>
                    {isLiked
                      ? (activeVideo.likes + 1).toLocaleString()
                      : activeVideo.likes.toLocaleString()}
                  </span>
                </button>

                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[var(--color-background-muted)] ty-body font-semibold text-[var(--color-text-primary)]">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length}</span>
                </span>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(activeVideo.id)}
                  aria-label={language === "th" ? "บันทึกคลิป" : "Bookmark"}
                  className="btn-icon"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isBookmarked
                        ? "fill-[var(--color-warning)] text-[var(--color-warning)]"
                        : ""
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareShortLink}
                className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-body font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                {hasCopiedShareLink ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--color-success)]" />
                    <span>
                      {language === "th" ? "คัดลอกแล้ว" : "Copied"}
                    </span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{language === "th" ? "แชร์" : "Share"}</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              <span className="ty-caption font-bold uppercase tracking-wide block">
                {language === "th"
                  ? `ความคิดเห็น (${comments.length})`
                  : `Comments (${comments.length})`}
              </span>

              {comments.map((commentItem) => (
                <div key={commentItem.id} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center ty-caption font-bold shrink-0">
                    {commentItem.user.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ty-caption font-bold text-[var(--color-text-primary)] truncate">
                        {commentItem.user}
                      </span>
                      <span className="ty-caption shrink-0">
                        {commentItem.time}
                      </span>
                    </div>
                    <p className="ty-body text-[var(--color-text-primary)] mt-0.5">
                      {commentItem.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Zone */}
        <div className="bg-[var(--color-background-card)] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,23,42,0.06)] shrink-0">
          <form
            onSubmit={handleCommentFormSubmit}
            className="px-4 sm:px-5 pt-2.5 pb-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              placeholder={
                language === "th" ? "เพิ่มความคิดเห็น..." : "Add a comment..."
              }
              className="flex-1 h-10 bg-[var(--color-background-muted)] rounded-full px-4 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              aria-label={language === "th" ? "ส่งความคิดเห็น" : "Send"}
              className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] disabled:opacity-40 flex items-center justify-center hover:opacity-90 transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {linkedRoom && (
            <footer className="px-4 sm:px-5 pb-3 pt-1 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                    {linkedRoom.code} ·{" "}
                    {pickLocalizedText(
                      language,
                      linkedRoom.nameTh,
                      linkedRoom.nameEn
                    )}
                  </span>
                  {linkedRoom.discountPercent > 0 && (
                    <span className="badge-promo shrink-0">
                      -{linkedRoom.discountPercent}%
                    </span>
                  )}
                </div>
                <p className="ty-caption">
                  <span className="font-bold text-[var(--color-accent)]">
                    ฿{linkedRoom.basePriceThb.toLocaleString()}
                  </span>{" "}
                  / {language === "th" ? "คืน" : "night"}
                </p>
              </div>

              <StandardButton
                variant="primary"
                size="md"
                onClick={() => onBookLinkedRoom(linkedRoom)}
                className="shrink-0"
              >
                <BedDouble className="w-4 h-4" />
                <span>
                  {language === "th"
                    ? `จองห้อง ${linkedRoom.code}`
                    : `Book ${linkedRoom.code}`}
                </span>
              </StandardButton>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
