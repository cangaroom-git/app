"use client";

import React, { useState } from "react";
import {
  BadgeCheck,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Pin,
  Play,
  Share2,
  Star,
  TicketPercent,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { CmsDynamicIcon } from "@/components/cms/CmsIconRegistry";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";
import { StandardButton } from "@/components/ui/standards";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    coupons,
    lang: language,
    totalAvailableUnitsCount,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    claimAndApplyCoupon,
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

  // Collect 6 preview photos for the Facebook Page "Photos" sidebar grid
  const galleryPreviewPhotos = Array.from(
    new Set([
      homeCms.heroImageUrl,
      ...rooms.flatMap((r) => r.images.slice(0, 2).map((img) => img.url)),
      ...homeCms.stories.map((s) => s.imageUrl),
    ])
  )
    .filter(Boolean)
    .slice(0, 6);

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const featuredShorts = [...activeShorts]
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
    .slice(0, 3);

  const activePromoCoupon = coupons.find((c) => c.isActive) || null;
  const visibleStories = homeCms.stories.filter((s) => s.isVisible !== false);
  const featuredReviews = cms.reviews
    .filter((r) => r.isFeaturedOnBooking !== false)
    .slice(0, 2);

  const togglePostLike = (postId: string) => {
    setLikedPostIds((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-3.5 sm:gap-4 select-none">
      {/* 1. FACEBOOK PAGE COVER & PROFILE HEADER */}
      <ResortHeroHeader
        cmsEditType="home-hero"
        onBookClick={() => navigateToTab("book")}
        onChatClick={() => navigateToTab("chat")}
      />

      {/* 2. AUTHENTIC 2-COLUMN FACEBOOK PAGE TIMELINE LAYOUT
             - Left Column: Intro Card + 3x2 Photos Grid
             - Right Column: Reels Strip + Pinned Promo Post + Story Posts + Guest Review Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
        {/* =================================================================
            LEFT COLUMN (Intro & Photos — Sticky on Desktop)
        ================================================================== */}
        <aside className="lg:col-span-5 space-y-3.5 sm:space-y-4 lg:sticky lg:top-18">
          {/* INTRO CARD */}
          <section className="app-card p-4 space-y-3.5">
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

            <div className="border-t border-[var(--color-border)] pt-3 space-y-2.5 ty-body">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
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

              {propertyConfig.phones[0] && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                  <span>{propertyConfig.phones.join(" , ")}</span>
                </div>
              )}

              {propertyConfig.lineId && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                  <span>LINE Official: {propertyConfig.lineId}</span>
                </div>
              )}
            </div>

            {homeCms.pillars.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-3 grid grid-cols-2 gap-2.5">
                {homeCms.pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="rounded-[8px] bg-[var(--color-background-muted)] px-2.5 py-2 flex items-center gap-2 min-w-0"
                  >
                    <CmsDynamicIcon
                      iconKey={pillar.iconKey}
                      className="w-4 h-4 text-[var(--color-accent)] shrink-0"
                    />
                    <span className="ty-caption font-semibold text-[var(--color-text-primary)] truncate">
                      {pickLocalizedText(
                        language,
                        pillar.titleTh,
                        pillar.titleEn
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <StandardButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th"
                  ? totalAvailableUnitsCount > 0
                    ? `เช็กวันว่าง & จองห้องพัก (ว่าง ${totalAvailableUnitsCount} หลัง)`
                    : "เช็กวันว่าง & จองห้องพัก"
                  : "Check Dates & Book"}
              </span>
            </StandardButton>
          </section>

          {/* PHOTOS GRID CARD (Facebook 3x2 Page Photos Box) */}
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

            <div className="grid grid-cols-3 gap-1.5 rounded-[8px] overflow-hidden">
              {galleryPreviewPhotos.map((photoUrl, idx) => (
                <button
                  key={`preview-photo-${idx}`}
                  type="button"
                  onClick={() => openGalleryModal(null)}
                  className="aspect-square bg-[var(--color-background-muted)] overflow-hidden cursor-pointer hover:opacity-90 transition"
                >
                  <img
                    src={photoUrl}
                    alt={`${propertyShortName} ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* =================================================================
            RIGHT COLUMN (Facebook Page Timeline Feed)
        ================================================================== */}
        <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
          {/* 1. REELS STRIP CARD */}
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
                        isPinned={Boolean(shortVideo.isPinned)}
                        onCardClick={() =>
                          openShortsAt(
                            originalIdx >= 0 ? originalIdx : videoIndex
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. PINNED PROMO POST */}
          {activePromoCoupon && (
            <article className="app-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body shrink-0">
                    {brandBadgeCode}
                  </span>
                  <div>
                    <p className="ty-body font-bold flex items-center gap-1">
                      <span>{propertyShortName}</span>
                      <BadgeCheck className="w-4 h-4 fill-[var(--color-accent)] text-white shrink-0" />
                    </p>
                    <p className="ty-caption flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      <span>
                        {language === "th" ? "โพสต์ปักหมุด · โปรโมชั่นจองตรง" : "Pinned offer"}
                      </span>
                    </p>
                  </div>
                </div>

                <span className="badge-promo">
                  {activePromoCoupon.discountType === "PERCENT"
                    ? `ลด ${activePromoCoupon.discountValue}%`
                    : `ลด ฿${activePromoCoupon.discountValue.toLocaleString()}`}
                </span>
              </div>

              <p className="ty-body">
                {pickLocalizedText(
                  language,
                  activePromoCoupon.titleTh,
                  activePromoCoupon.titleEn || activePromoCoupon.titleTh
                )}
                {activePromoCoupon.descTh
                  ? ` — ${activePromoCoupon.descTh}`
                  : ""}
              </p>

              <div className="rounded-[8px] bg-[var(--color-promo-muted)] p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TicketPercent className="w-5 h-5 text-[var(--color-promo-text)] shrink-0" />
                  <div>
                    <p className="ty-caption font-semibold text-[var(--color-promo-text)]">
                      {language === "th" ? "รหัสคูปองส่วนลด" : "Promo Code"}
                    </p>
                    <p className="ty-subtitle font-bold font-mono text-[var(--color-text-primary)]">
                      {activePromoCoupon.code}
                    </p>
                  </div>
                </div>

                <StandardButton
                  variant="promo"
                  size="md"
                  onClick={() => {
                    claimAndApplyCoupon(activePromoCoupon.code);
                    navigateToTab("book");
                  }}
                >
                  <span>
                    {language === "th"
                      ? "เก็บคูปอง & เลือกห้องพัก"
                      : "Claim & Book"}
                  </span>
                </StandardButton>
              </div>
            </article>
          )}

          {/* 3. FACEBOOK-STYLE STORY POSTS */}
          {canShowEditControls && (
            <div className="app-card px-4 py-3 flex items-center justify-between">
              <span className="ty-body font-semibold">โพสต์บนหน้าเพจ</span>
              <EditSpotButton
                icon="add"
                label="เพิ่มโพสต์เรื่องราวใหม่"
                onClick={() => openCmsEditor({ type: "home-story" })}
              />
            </div>
          )}

          {visibleStories.map((story) => {
            const isLiked = Boolean(likedPostIds[story.id]);
            return (
              <article key={story.id} className="app-card overflow-hidden">
                <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body shrink-0">
                      {brandBadgeCode}
                    </span>
                    <div className="min-w-0">
                      <p className="ty-body font-bold flex items-center gap-1 truncate">
                        <span className="truncate">{propertyShortName}</span>
                        <BadgeCheck className="w-4 h-4 fill-[var(--color-accent)] text-white shrink-0" />
                      </p>
                      <p className="ty-caption truncate">
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

                <div className="px-4 pb-3 space-y-1">
                  <h3 className="ty-subtitle font-bold">
                    {pickLocalizedText(language, story.titleTh, story.titleEn)}
                  </h3>
                  <p className="ty-body text-[var(--color-text-primary)]">
                    {pickLocalizedText(language, story.descTh, story.descEn)}
                  </p>
                </div>

                <div className="w-full aspect-[16/9] bg-[var(--color-background-muted)] overflow-hidden">
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

                {/* Facebook Post Action Bar */}
                <div className="px-2 py-1.5 border-t border-[var(--color-border)] grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => togglePostLike(story.id)}
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
                    onClick={() => navigateToTab("book")}
                    className="h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold text-[var(--color-accent)] transition cursor-pointer"
                  >
                    <span>
                      {language === "th" ? "ดูห้องว่าง" : "Check Rooms"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToTab(story.ctaTargetTab || "guide")}
                    className="h-9 rounded-[6px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center gap-2 ty-body font-semibold text-[var(--color-text-secondary)] transition cursor-pointer"
                  >
                    <Share2 className="w-[18px] h-[18px]" />
                    <span>{language === "th" ? "รายละเอียด" : "Explore"}</span>
                  </button>
                </div>
              </article>
            );
          })}

          {/* 4. VERIFIED GUEST CHECK-IN POSTS */}
          {featuredReviews.map((rev) => (
            <article key={rev.id} className="app-card overflow-hidden">
              <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-10 w-10 rounded-full bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center font-bold ty-body shrink-0">
                    {rev.authorAvatar || rev.authorNameTh[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="ty-body font-bold truncate">
                      {pickLocalizedText(
                        language,
                        rev.authorNameTh,
                        rev.authorNameEn
                      )}{" "}
                      <span className="font-normal text-[var(--color-text-secondary)]">
                        {language === "th" ? "ได้รีวิวที่พัก" : "reviewed"}
                      </span>
                    </p>
                    <p className="ty-caption flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {rev.rating}
                      </span>
                      <span>· {rev.roomLabel}</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="px-4 pb-3 ty-body">
                {pickLocalizedText(language, rev.captionTh, rev.captionEn)}
              </p>

              {rev.photos[0] && (
                <div
                  onClick={() => navigateToTab("review")}
                  className="w-full aspect-[16/9] bg-[var(--color-background-muted)] overflow-hidden cursor-pointer"
                >
                  <img
                    src={rev.photos[0]}
                    alt={rev.roomLabel}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
