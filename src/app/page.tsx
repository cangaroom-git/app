"use client";

import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Coffee,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Share2,
  Star,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    lang: language,
    totalAvailableUnitsCount,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});

  const homeCms = cms.home;
  const brandBadgeCode = (propertyConfig.brandCode || "SU").slice(0, 2);
  const propertyShortName = pickLocalizedText(
    language,
    propertyConfig.nameTh.split("(")[0].trim(),
    propertyConfig.nameEn
  );

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const featuredShorts = [...activeShorts]
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
    .slice(0, 3);

  const visibleStories = homeCms.stories.filter(
    (story) => story.isVisible !== false
  );

  const featuredReviews = cms.reviews
    .filter((reviewItem) => reviewItem.isFeaturedOnBooking !== false)
    .slice(0, 3);

  // Build 9-photo Facebook "Photos" grid from gallery + rooms
  const nineGridPhotos = useMemo(() => {
    const urls: string[] = [];
    for (const item of cms.gallery.photos) {
      if (item.url && !urls.includes(item.url)) urls.push(item.url);
      if (urls.length >= 9) break;
    }
    if (urls.length < 9) {
      for (const room of rooms) {
        for (const img of room.images) {
          if (img.url && !urls.includes(img.url)) urls.push(img.url);
          if (urls.length >= 9) break;
        }
        if (urls.length >= 9) break;
      }
    }
    return urls.slice(0, 9);
  }, [cms.gallery.photos, rooms]);

  const toggleLikePost = (postId: string) => {
    setLikedPostIds((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-4 select-none">
      {/* 1. FACEBOOK PAGE COVER & PROFILE HEADER */}
      <ResortHeroHeader
        cmsEditType="home-hero"
        onBookClick={() => navigateToTab("book")}
        onChatClick={() => navigateToTab("chat")}
      />

      {/* 2. AUTHENTIC FACEBOOK 2-COLUMN PAGE TIMELINE
             - Left Column: Sticky "แนะนำตัว (Intro)" + "รูปภาพ (3x3 Photos)"
             - Right Column: Reels + Resort Posts + Guest Check-in Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (Intro & Photos) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[72px]">
          {/* Intro Card */}
          <section className="app-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="ty-title">
                {language === "th" ? "แนะนำที่พัก" : "Intro"}
              </h2>
              {canShowEditControls && (
                <EditSpotButton
                  label="แก้ไขข้อมูลแนะนำ"
                  onClick={() => openCmsEditor({ type: "home-manifesto" })}
                />
              )}
            </div>

            <p className="ty-body text-[var(--color-text-primary)]">
              {pickLocalizedText(
                language,
                homeCms.manifestoDescTh,
                homeCms.manifestoDescEn
              )}
            </p>

            <div className="pt-2 border-t border-[var(--color-border)] space-y-2.5 ty-body">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0 mt-0.5" />
                <span>
                  {pickLocalizedText(
                    language,
                    propertyConfig.locationTh,
                    propertyConfig.locationEn
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                <span>
                  {language === "th"
                    ? `เช็กอิน ${propertyConfig.checkInTime} · เช็กเอาท์ ${propertyConfig.checkOutTime}`
                    : `Check-in ${propertyConfig.checkInTime} · Check-out ${propertyConfig.checkOutTime}`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                <span>
                  {language === "th"
                    ? `ฟรีอาหารเช้า (${propertyConfig.breakfastTime})`
                    : `Free Breakfast (${propertyConfig.breakfastTime})`}
                </span>
              </div>

              {propertyConfig.phones[0] && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                  <span>{propertyConfig.phones.join(" , ")}</span>
                </div>
              )}

              {propertyConfig.lineId && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                  <span>LINE: {propertyConfig.lineId}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateToTab("book")}
              className="w-full h-10 rounded-[8px] bg-[var(--color-accent-muted)] hover:brightness-95 text-[var(--color-accent)] ty-body font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === "th"
                  ? totalAvailableUnitsCount > 0
                    ? `เช็กห้องว่างวันนี้ (ว่าง ${totalAvailableUnitsCount} หลัง)`
                    : "เช็กตารางห้องว่างและราคา"
                  : "Check Room Availability & Rates"}
              </span>
            </button>
          </section>

          {/* 3x3 Facebook Photos Card */}
          {nineGridPhotos.length > 0 && (
            <section className="app-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="ty-title">
                  {language === "th" ? "รูปภาพ" : "Photos"}
                </h2>
                <button
                  type="button"
                  onClick={() => openGalleryModal(null)}
                  className="ty-body text-[var(--color-accent)] hover:underline cursor-pointer"
                >
                  {language === "th" ? "ดูรูปภาพทั้งหมด" : "See all photos"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-[8px] overflow-hidden">
                {nineGridPhotos.map((photoUrl, idx) => (
                  <button
                    key={`grid-photo-${idx}`}
                    type="button"
                    onClick={() => openGalleryModal(null)}
                    className="relative aspect-square bg-[var(--color-background-muted)] overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={photoUrl}
                      alt={`${propertyShortName} ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:brightness-95 transition"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (Reels + Resort Timeline Posts + Guest Reviews) */}
        <div className="lg:col-span-7 space-y-4 min-w-0">
          {/* Reels Card */}
          {featuredShorts.length > 0 && (
            <section className="app-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="ty-subtitle font-bold flex items-center gap-2">
                  <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)] shrink-0" />
                  <span>
                    {language === "th" ? "Reels และคลิปสั้น" : "Reels"}
                  </span>
                </h2>

                <div className="flex items-center gap-2">
                  {canShowEditControls && (
                    <EditSpotButton
                      icon="add"
                      label="เพิ่มคลิป"
                      onClick={() => openCmsEditor({ type: "short-video" })}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => navigateToTab("shorts")}
                    className="ty-body text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    {language === "th" ? "ดูทั้งหมด" : "See all"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {featuredShorts.map((shortVideo, videoIndex) => {
                  const linkedRoom =
                    rooms.find((r) => r.id === shortVideo.roomId) ??
                    rooms[shortVideo.roomIndex] ??
                    rooms[0];
                  const originalIdx = cms.shortsPage.videos.findIndex(
                    (v) => v.id === shortVideo.id
                  );

                  return (
                    <div key={shortVideo.id} className="relative">
                      <ShortVideoCard
                        id={shortVideo.id}
                        title={pickLocalizedText(
                          language,
                          shortVideo.titleTh,
                          shortVideo.titleEn
                        )}
                        roomCode={linkedRoom?.code}
                        posterUrl={shortVideo.posterUrl}
                        viewsCount={shortVideo.views}
                        priceThb={linkedRoom?.basePriceThb}
                        discountPercent={linkedRoom?.discountPercent}
                        isPinned={Boolean(shortVideo.isPinned || videoIndex === 0)}
                        onCardClick={() =>
                          openShortsAt(originalIdx >= 0 ? originalIdx : videoIndex)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Admin Add Story Bar */}
          {canShowEditControls && (
            <div className="app-card px-4 py-3 flex items-center justify-between gap-2">
              <span className="ty-body font-semibold">
                โพสต์เรื่องราวบนหน้าแรก ({visibleStories.length})
              </span>
              <EditSpotButton
                icon="add"
                label="เขียนโพสต์ใหม่"
                onClick={() => openCmsEditor({ type: "home-story" })}
              />
            </div>
          )}

          {/* Resort Story Posts (Facebook Timeline Post Format) */}
          {visibleStories.map((story) => {
            const isLiked = Boolean(likedPostIds[story.id]);
            return (
              <article key={story.id} className="app-card overflow-hidden">
                {/* Post Author Header */}
                <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body shrink-0">
                      {brandBadgeCode}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="ty-body font-bold truncate">
                          {propertyShortName}
                        </span>
                        <BadgeCheck className="w-4 h-4 fill-[var(--color-accent)] text-white shrink-0" />
                      </div>
                      <p className="ty-caption">
                        {language === "th" ? "โพสต์แนะนำ" : "Featured"} ·{" "}
                        {pickLocalizedText(
                          language,
                          homeCms.heroLocationTh,
                          homeCms.heroLocationEn
                        )}
                      </p>
                    </div>
                  </div>

                  {canShowEditControls && (
                    <EditSpotButton
                      label="แก้ไขโพสต์"
                      onClick={() =>
                        openCmsEditor({
                          type: "home-story",
                          storyId: story.id,
                        })
                      }
                    />
                  )}
                </div>

                {/* Post Text */}
                <div className="px-4 pb-3 space-y-1">
                  <h3 className="ty-subtitle font-bold">
                    {pickLocalizedText(language, story.titleTh, story.titleEn)}
                  </h3>
                  <p className="ty-body">
                    {pickLocalizedText(language, story.descTh, story.descEn)}
                  </p>
                </div>

                {/* Post 16:9 Photo */}
                <div className="relative w-full aspect-[16/9] bg-[var(--color-background-muted)] overflow-hidden">
                  <img
                    src={story.imageUrl}
                    alt={pickLocalizedText(
                      language,
                      story.titleTh,
                      story.titleEn
                    )}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Facebook Post Action Row */}
                <div className="px-2 py-1.5 border-t border-[var(--color-border)] grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => toggleLikePost(story.id)}
                    className={`h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold transition cursor-pointer ${
                      isLiked
                        ? "text-[var(--color-promo)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <Heart
                      className={`w-[18px] h-[18px] ${
                        isLiked ? "fill-current" : ""
                      }`}
                    />
                    <span>{language === "th" ? "ถูกใจ" : "Like"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToTab("chat")}
                    className="h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold text-[var(--color-text-secondary)] transition cursor-pointer"
                  >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span>{language === "th" ? "สอบถาม" : "Ask"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToTab(story.ctaTargetTab || "book")}
                    className="h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold text-[var(--color-accent)] transition cursor-pointer"
                  >
                    <Calendar className="w-[18px] h-[18px]" />
                    <span>
                      {language === "th" ? "เช็กห้องว่าง" : "Book Now"}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}

          {/* Guest Check-in Review Posts */}
          {featuredReviews.map((rev) => {
            const isLiked = Boolean(likedPostIds[rev.id]);
            return (
              <article key={rev.id} className="app-card overflow-hidden">
                <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={rev.authorAvatar}
                      alt={rev.authorNameTh}
                      loading="lazy"
                      className="h-10 w-10 rounded-full object-cover bg-[var(--color-background-muted)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="ty-body truncate">
                        <strong className="font-bold">
                          {pickLocalizedText(
                            language,
                            rev.authorNameTh,
                            rev.authorNameEn
                          )}
                        </strong>{" "}
                        <span className="text-[var(--color-text-secondary)]">
                          {language === "th" ? "ได้รีวิว" : "reviewed"}{" "}
                        </span>
                        <strong className="font-semibold">
                          {propertyShortName}
                        </strong>
                      </p>
                      <p className="ty-caption flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--color-warning)]">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {rev.rating}
                        </span>
                        <span>·</span>
                        <span>{rev.roomLabel}</span>
                        <span>·</span>
                        <span>
                          {pickLocalizedText(
                            language,
                            rev.postedAgoTh,
                            rev.postedAgoEn
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {canShowEditControls && (
                    <EditSpotButton
                      onClick={() =>
                        openCmsEditor({ type: "review", reviewId: rev.id })
                      }
                    />
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="ty-body">
                    {pickLocalizedText(language, rev.captionTh, rev.captionEn)}
                  </p>
                </div>

                {rev.photos[0] && (
                  <div
                    onClick={() => navigateToTab("review")}
                    className="relative w-full aspect-[16/9] bg-[var(--color-background-muted)] overflow-hidden cursor-pointer"
                  >
                    <img
                      src={rev.photos[0]}
                      alt={rev.roomLabel}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="px-2 py-1.5 border-t border-[var(--color-border)] grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => toggleLikePost(rev.id)}
                    className={`h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold transition cursor-pointer ${
                      isLiked
                        ? "text-[var(--color-promo)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <Heart
                      className={`w-[18px] h-[18px] ${
                        isLiked ? "fill-current" : ""
                      }`}
                    />
                    <span>
                      {language === "th" ? "ถูกใจ" : "Like"} (
                      {rev.likesCount + (isLiked ? 1 : 0)})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToTab("review")}
                    className="h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold text-[var(--color-text-secondary)] transition cursor-pointer"
                  >
                    <Share2 className="w-[18px] h-[18px]" />
                    <span>
                      {language === "th" ? "ดูรีวิวทั้งหมด" : "All Reviews"}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
