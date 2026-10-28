"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  Check,
  Compass,
  Heart,
  Play,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  RESORT_SHORTS,
  SHORTS_CATEGORIES,
  ShortVideoCategory,
  ShortVideoComment,
} from "@/data/shortsData";
import { useHotelApp } from "@/components/HotelAppShell";
import { ShortVideoDrawer } from "@/components/drawers/ShortVideoDrawer";

export { RESORT_SHORTS };
export type { ShortVideoComment };

export default function ShortsPage() {
  const {
    rooms,
    lang: language,
    openRoomDrawer,
    savedCouponCodes,
    claimAndApplyCoupon,
    openCouponWallet,
    initialShortIndex,
  } = useHotelApp();

  const [selectedCategory, setSelectedCategory] =
    useState<ShortVideoCategory>("all");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [likedVideoById, setLikedVideoById] = useState<Record<string, boolean>>(
    {}
  );
  const [bookmarkedVideoById, setBookmarkedVideoById] = useState<
    Record<string, boolean>
  >({});
  const [userCommentsByVideoId, setUserCommentsByVideoId] = useState<
    Record<string, ShortVideoComment[]>
  >({});

  const filteredVideos =
    selectedCategory === "all"
      ? RESORT_SHORTS
      : RESORT_SHORTS.filter((video) => video.category === selectedCategory);

  useEffect(() => {
    if (
      initialShortIndex !== null &&
      initialShortIndex !== undefined &&
      initialShortIndex >= 0 &&
      initialShortIndex < RESORT_SHORTS.length
    ) {
      setSelectedVideoId(RESORT_SHORTS[initialShortIndex].id);
    } else {
      setSelectedVideoId(null);
    }
  }, [initialShortIndex]);

  const selectedVideoIndex = RESORT_SHORTS.findIndex(
    (video) => video.id === selectedVideoId
  );
  const activeVideo =
    selectedVideoIndex >= 0 ? RESORT_SHORTS[selectedVideoIndex] : null;
  const linkedRoom =
    activeVideo && rooms[activeVideo.roomIndex]
      ? rooms[activeVideo.roomIndex]
      : rooms[0] ?? null;

  const handleNavigateVideo = useCallback(
    (direction: "next" | "prev") => {
      if (RESORT_SHORTS.length === 0) return;
      const currentIndex = RESORT_SHORTS.findIndex(
        (video) => video.id === selectedVideoId
      );
      const nextIndex =
        direction === "next"
          ? (currentIndex + 1) % RESORT_SHORTS.length
          : (currentIndex - 1 + RESORT_SHORTS.length) % RESORT_SHORTS.length;
      setSelectedVideoId(RESORT_SHORTS[nextIndex].id);
    },
    [selectedVideoId]
  );

  const handleToggleLike = (videoId: string) => {
    setLikedVideoById((previous) => ({
      ...previous,
      [videoId]: !previous[videoId],
    }));
  };

  const handleToggleBookmark = (videoId: string) => {
    setBookmarkedVideoById((previous) => ({
      ...previous,
      [videoId]: !previous[videoId],
    }));
  };

  const handleAddComment = (videoId: string, commentText: string) => {
    const newComment: ShortVideoComment = {
      id: `cm-${Date.now()}`,
      user: "guest_sapan",
      text: commentText,
      time: language === "th" ? "เมื่อสักครู่" : "Just now",
      likes: 1,
      isLiked: true,
    };
    setUserCommentsByVideoId((previous) => ({
      ...previous,
      [videoId]: [...(previous[videoId] || []), newComment],
    }));
  };

  const activeVideoComments = activeVideo
    ? [
        ...activeVideo.comments,
        ...(userCommentsByVideoId[activeVideo.id] || []),
      ]
    : [];

  const isActiveVideoCouponSaved = activeVideo?.couponCode
    ? savedCouponCodes.some(
        (savedCode) =>
          savedCode.toUpperCase() === activeVideo.couponCode?.toUpperCase()
      )
    : false;

  return (
    <>
      {/* 1. Flat Sticky Shorts Header & Category Pill Bar (Open Canvas) */}
      <header className="sticky top-0 z-20 -mx-1 px-1 py-2.5 bg-[var(--color-background-body)]/92 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="ty-title flex items-center gap-2 truncate">
              <Compass className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {language === "th"
                  ? "สำรวจวิดีโอสั้นรีสอร์ท"
                  : "Explore Resort Shorts"}
              </span>
            </h1>
            <p className="ty-caption truncate mt-0.5">
              {language === "th"
                ? `บรรยากาศจริงจากสะปันอันซีน · ${filteredVideos.length} วิดีโอ`
                : `Real moments at Sapan Unseen · ${filteredVideos.length} videos`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openCouponWallet}
              className="inline-flex items-center gap-1.5 h-9 rounded-full bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] px-3.5 ty-caption font-bold cursor-pointer hover:opacity-85 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>
                {language === "th"
                  ? `กระเป๋าคูปอง (${savedCouponCodes.length})`
                  : `Bag (${savedCouponCodes.length})`}
              </span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-3 h-8 ty-caption font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>4K</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {SHORTS_CATEGORIES.map((categoryItem) => {
            const isSelected = selectedCategory === categoryItem.id;
            return (
              <button
                key={categoryItem.id}
                type="button"
                onClick={() => setSelectedCategory(categoryItem.id)}
                className={`h-9 px-4 rounded-full ty-body font-semibold whitespace-nowrap transition cursor-pointer inline-flex items-center ${
                  isSelected
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {language === "th"
                  ? categoryItem.labelTh
                  : categoryItem.labelEn}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Open 9:16 Short Videos Grid (Zero Outer Wrapper Card) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredVideos.map((video) => {
          const cardRoom = rooms[video.roomIndex] ?? rooms[0];
          const isLiked = Boolean(likedVideoById[video.id]);

          return (
            <article
              key={video.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedVideoId(video.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedVideoId(video.id);
                }
              }}
              className="group flex flex-col cursor-pointer select-none"
            >
              <div className="relative aspect-[9/16] w-full rounded-[16px] overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={video.posterUrl}
                  alt={language === "th" ? video.titleTh : video.titleEn}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
                  {video.isPinned ? (
                    <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-caption font-bold px-2.5 py-0.5">
                      PINNED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md text-white px-2.5 py-0.5 ty-caption font-semibold">
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>{cardRoom?.code || "Villa"}</span>
                    </span>
                  )}

                  {video.couponCode && (
                    <span className="badge-promo">
                      <Tag className="w-3 h-3" />
                      <span>{video.couponCode}</span>
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <span className="h-11 w-11 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </span>
                </div>

                <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md text-white px-2.5 py-1 ty-caption font-semibold">
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{video.views}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md text-white px-2.5 py-1 ty-caption font-semibold">
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked
                          ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                          : "fill-white text-white"
                      }`}
                    />
                    <span>{isLiked ? video.likes + 1 : video.likes}</span>
                  </span>
                </div>
              </div>

              <p className="pt-2 ty-body font-semibold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                {language === "th" ? video.titleTh : video.titleEn}
              </p>

              <div className="pt-0.5 flex items-center justify-between gap-2 ty-caption">
                <span className="inline-flex items-center gap-1 font-medium truncate">
                  <span className="truncate">sapanunseen</span>
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                </span>

                {cardRoom && (
                  <span className="font-bold text-[var(--color-accent)] shrink-0">
                    ฿{cardRoom.basePriceThb.toLocaleString()}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* 3. Unified Standard-Width Right Sidebar Video Player Drawer */}
      <ShortVideoDrawer
        activeVideo={activeVideo}
        videoIndex={Math.max(0, selectedVideoIndex)}
        totalVideosCount={RESORT_SHORTS.length}
        linkedRoom={linkedRoom}
        language={language}
        isLiked={Boolean(activeVideo && likedVideoById[activeVideo.id])}
        isBookmarked={Boolean(
          activeVideo && bookmarkedVideoById[activeVideo.id]
        )}
        isCouponSavedInBag={isActiveVideoCouponSaved}
        comments={activeVideoComments}
        onClose={() => setSelectedVideoId(null)}
        onNavigateVideo={handleNavigateVideo}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onClaimCouponToBag={(couponCode) => {
          claimAndApplyCoupon(couponCode);
        }}
        onAddComment={handleAddComment}
        onBookLinkedRoom={(room) => {
          setSelectedVideoId(null);
          openRoomDrawer(room, "calendar");
        }}
      />
    </>
  );
}
