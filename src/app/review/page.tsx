"use client";

import React, { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Heart,
  Send,
  Star,
} from "lucide-react";
import { ManagedGuestReview, pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { StatusPill } from "@/components/ui/standards";

export default function ReviewPage() {
  const {
    propertyConfig,
    rooms,
    roomStatusMap,
    lang,
    openRoomDrawer,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [slideIndexMap, setSlideIndexMap] = useState<Record<string, number>>(
    {}
  );
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const photoStripRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const reviewPosts = cms.reviews;
  const filteredPosts =
    selectedFilter === "all"
      ? reviewPosts
      : reviewPosts.filter((p) => p.roomCode === selectedFilter);

  const scrollPostPhoto = (postId: string, targetIdx: number) => {
    const el = photoStripRefs.current[postId];
    setSlideIndexMap((prev) => ({ ...prev, [postId]: targetIdx }));
    if (el && el.clientWidth > 0) {
      el.scrollTo({
        left: targetIdx * el.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleSharePost = async (post: ManagedGuestReview) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/review#${post.id}`
        : post.socialUrl;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${post.authorNameTh} — ${propertyConfig.nameTh}`,
          text: post.captionTh,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setSharedPostId(post.id);
    setTimeout(() => setSharedPostId(null), 1800);
  };

  return (
    <>
      {/* 1. Flat Social Reviews Header & Filter Bar */}
      <header className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ty-title flex items-center gap-2 truncate">
                <Star className="w-5 h-5 fill-[var(--color-warning)] text-[var(--color-warning)] shrink-0" />
                <span className="truncate">
                  {pickLocalizedText(
                    lang,
                    cms.guidePage.reviewPageTitleTh,
                    cms.guidePage.reviewPageTitleEn
                  )}
                </span>
              </h1>
              <StatusPill variant="success">
                {pickLocalizedText(
                  lang,
                  cms.guidePage.reviewScorePillTh,
                  cms.guidePage.reviewScorePillEn
                )}
              </StatusPill>
            </div>
            <p className="ty-caption mt-0.5">
              {lang === "th"
                ? `โพสต์สาธารณะจากผู้เข้าพักจริงที่เช็คอิน ${propertyConfig.nameTh}`
                : `Public check-in posts from verified guests at ${propertyConfig.nameEn}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {canShowEditControls && (
              <EditSpotButton
                icon="add"
                label="เพิ่มรีวิวใหม่"
                onClick={() => openCmsEditor({ type: "review" })}
              />
            )}

            <a
              href={cms.guidePage.facebookPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-fw-secondary"
            >
              <span>
                {lang === "th" ? "เพจ Facebook ที่พัก" : "Official Facebook Page"}
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`shrink-0 h-8 rounded-full px-3.5 ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer ${
              selectedFilter === "all"
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {lang === "th" ? "โพสต์ทั้งหมด" : "All Reviews"}
          </button>

          {rooms.map((rm) => {
            const active = selectedFilter === rm.code;
            return (
              <button
                key={rm.id}
                type="button"
                onClick={() => setSelectedFilter(rm.code)}
                className={`shrink-0 h-8 rounded-full px-3.5 ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer ${
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {rm.code} · {pickLocalizedText(lang, rm.nameTh, rm.nameEn)}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Flat 1-Layer Social Review Posts */}
      <section className="space-y-5">
        {filteredPosts.map((post) => {
          const linkedRoom =
            rooms.find(
              (r) => r.id === post.roomId || r.code === post.roomCode
            ) || rooms[0];
          const st = linkedRoom ? roomStatusMap[linkedRoom.id] : undefined;
          const nightlyRate =
            st?.effectiveNightlyPrice ?? linkedRoom?.basePriceThb ?? 2990;
          const currentSlide = slideIndexMap[post.id] ?? 0;
          const totalSlides = post.photos.length;
          const isLiked = Boolean(likedPosts[post.id]);
          const likeCount = isLiked ? post.likesCount + 1 : post.likesCount;

          return (
            <article
              key={post.id}
              id={post.id}
              className="app-card overflow-hidden"
            >
              <div className="p-4 sm:p-5 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={post.authorAvatar}
                    alt={post.authorNameTh}
                    className="h-10 w-10 rounded-full object-cover shrink-0 bg-[var(--color-background-subtle)]"
                  />
                  <div className="min-w-0">
                    <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                      {pickLocalizedText(
                        lang,
                        post.authorNameTh,
                        post.authorNameEn
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 ty-caption">
                      <span>
                        {pickLocalizedText(
                          lang,
                          post.postedAgoTh,
                          post.postedAgoEn
                        )}
                      </span>
                      <span>·</span>
                      <Globe className="w-3 h-3" />
                      <span>Facebook</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canShowEditControls && (
                    <EditSpotButton
                      label="แก้ไขรีวิว"
                      onClick={() =>
                        openCmsEditor({ type: "review", reviewId: post.id })
                      }
                    />
                  )}
                  <span className="inline-flex items-center gap-1 ty-body font-bold text-[var(--color-text-primary)]">
                    <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                    <span>{post.rating}</span>
                  </span>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-3.5 space-y-1.5">
                <p className="ty-body whitespace-pre-line">
                  {pickLocalizedText(lang, post.captionTh, post.captionEn)}
                </p>
                <p className="flex flex-wrap gap-2 ty-caption font-semibold text-[var(--color-accent)]">
                  {post.hashtags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
              </div>

              {post.photos.length > 0 && (
                <div
                  onDoubleClick={() =>
                    setLikedPosts((prev) => ({
                      ...prev,
                      [post.id]: !prev[post.id],
                    }))
                  }
                  className="relative w-full aspect-[4/5] sm:h-[480px] overflow-hidden bg-black group/fbphoto"
                >
                  <div
                    ref={(el) => {
                      photoStripRefs.current[post.id] = el;
                    }}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      if (!el.clientWidth) return;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (idx !== currentSlide) {
                        setSlideIndexMap((prev) => ({
                          ...prev,
                          [post.id]: idx,
                        }));
                      }
                    }}
                    className="flex h-full w-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar scroll-smooth touch-manipulation"
                  >
                    {post.photos.map((photoUrl, idx) => (
                      <img
                        key={idx}
                        src={photoUrl}
                        alt={`${post.authorNameTh} review photo ${idx + 1}`}
                        draggable={false}
                        onClick={() =>
                          linkedRoom && openRoomDrawer(linkedRoom, "details")
                        }
                        className="h-full w-full shrink-0 snap-center object-cover object-center select-none cursor-pointer"
                      />
                    ))}
                  </div>

                  {totalSlides > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          scrollPostPhoto(
                            post.id,
                            (currentSlide - 1 + totalSlides) % totalSlides
                          )
                        }
                        aria-label="Previous photo"
                        className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white items-center justify-center opacity-0 group-hover/fbphoto:opacity-100 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          scrollPostPhoto(
                            post.id,
                            (currentSlide + 1) % totalSlides
                          )
                        }
                        aria-label="Next photo"
                        className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white items-center justify-center opacity-0 group-hover/fbphoto:opacity-100 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 pointer-events-none">
                        {post.photos.map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className={`h-1.5 rounded-full transition-all ${
                              dotIdx === currentSlide
                                ? "w-4 bg-white"
                                : "w-1.5 bg-white/55"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setLikedPosts((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    aria-label="Like review"
                    className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <span className="h-9 w-9 rounded-full hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center transition">
                      <Heart
                        className={`w-4 h-4 transition-transform active:scale-125 ${
                          isLiked
                            ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                            : ""
                        }`}
                      />
                    </span>
                    <span className="ty-body font-semibold">
                      {likeCount.toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSharePost(post)}
                    aria-label="Share review"
                    className="h-9 w-9 rounded-full hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center transition cursor-pointer"
                  >
                    {sharedPostId === post.id ? (
                      <Check className="w-4 h-4 text-[var(--color-success)]" />
                    ) : (
                      <Send className="w-4 h-4 -rotate-12" />
                    )}
                  </button>

                  <a
                    href={post.socialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ty-caption font-semibold hover:text-[var(--color-accent)] transition"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {linkedRoom && (
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="sm:text-right min-w-0">
                      <p className="ty-body font-bold truncate">
                        {linkedRoom.code} ·{" "}
                        {pickLocalizedText(
                          lang,
                          linkedRoom.nameTh,
                          linkedRoom.nameEn
                        )}
                      </p>
                      <p className="ty-caption">
                        <strong className="text-[var(--color-accent)]">
                          ฿{nightlyRate.toLocaleString()}
                        </strong>{" "}
                        {lang === "th" ? "/ คืน" : "/ night"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRoomDrawer(linkedRoom, "calendar")}
                      className="btn-round-solid shrink-0 cursor-pointer"
                    >
                      <span>{lang === "th" ? "จองห้องนี้" : "Book"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
