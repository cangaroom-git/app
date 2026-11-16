"use client";

import React from "react";
import {
  ArrowRight,
  Bot,
  CloudSun,
  Images,
  MapPin,
  Maximize2,
  Play,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { CmsDynamicIcon } from "@/components/cms/CmsIconRegistry";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";
import { StandardButton } from "@/components/ui/standards";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    coupons,
    weather,
    lang: language,
    totalAvailableUnitsCount,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const homeCms = cms.home;

  const heroImageUrl =
    homeCms.heroImageUrl ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  const liveTempCelsius = weather?.currentTemp
    ? Math.round(weather.currentTemp)
    : 19;

  const highestCouponPercent = coupons
    .filter((coupon) => coupon.isActive && coupon.discountType === "PERCENT")
    .reduce(
      (maxPercent, coupon) => Math.max(maxPercent, coupon.discountValue),
      0
    );
  const highestRoomDiscountPercent = rooms.reduce(
    (maxPercent, room) => Math.max(maxPercent, room.discountPercent || 0),
    0
  );
  const maxDirectPromoPercent = Math.max(
    highestCouponPercent,
    highestRoomDiscountPercent,
    10
  );

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const sortedShorts = [...activeShorts].sort(
    (a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
  );
  const featuredShorts = sortedShorts.slice(0, 4);

  const visibleStories = homeCms.stories.filter(
    (story) => story.isVisible !== false
  );

  const hotelJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: `${propertyConfig.nameTh} (${propertyConfig.nameEn})`,
    description: propertyConfig.taglineTh,
    image: [heroImageUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: "บ้านสะปัน ตำบลดงพญา",
      addressLocality: "อำเภอบ่อเกลือ",
      addressRegion: "จังหวัดน่าน",
      postalCode: "55220",
      addressCountry: "TH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: propertyConfig.latitude,
      longitude: propertyConfig.longitude,
    },
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-10 sm:gap-14 lg:gap-16 pb-2 select-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLdSchema) }}
      />

      {/* =====================================================================
          SECTION 1: PURE FULL-BLEED ATMOSPHERIC HERO
      ====================================================================== */}
      <section aria-label="Resort Atmosphere">
        <div
          onClick={() => openGalleryModal(null)}
          className="relative -mt-4 -mx-4 w-[calc(100%+2rem)] rounded-none sm:mt-0 sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[16/9] max-h-[540px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/hero"
        >
          <img
            src={heroImageUrl}
            alt={pickLocalizedText(
              language,
              propertyConfig.nameTh,
              propertyConfig.nameEn
            )}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover object-center select-none transition-transform duration-700 lg:group-hover/hero:scale-[1.02]"
          />

          {canShowEditControls && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <EditSpotButton
                label="เปลี่ยนภาพปก & พิกัด"
                onClick={() => openCmsEditor({ type: "home-hero" })}
              />
            </div>
          )}

          {/* Subtle Bottom Bar Pills */}
          <div className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 flex items-center justify-between gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md text-white px-3.5 h-8 ty-caption font-semibold">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {pickLocalizedText(
                  language,
                  homeCms.heroLocationTh,
                  homeCms.heroLocationEn
                )}
              </span>
              <span className="opacity-60">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
                <CloudSun className="w-3.5 h-3.5" />
                {liveTempCelsius}°C
              </span>
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openGalleryModal(null);
              }}
              className="pointer-events-auto rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-3.5 h-8 inline-flex items-center gap-1.5 ty-caption font-semibold transition cursor-pointer shrink-0"
            >
              <Images className="w-3.5 h-3.5" />
              <span>{language === "th" ? "ดูภาพทั้งหมด" : "Gallery"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: SOUL OF SAPAN MANIFESTO & 4 ICON PILLARS (Open Canvas)
      ====================================================================== */}
      <section className="relative space-y-7 sm:space-y-9">
        {canShowEditControls && (
          <div className="flex justify-end">
            <EditSpotButton
              label="แก้ไขคำโปรย & 4 จุดเด่น"
              onClick={() => openCmsEditor({ type: "home-manifesto" })}
            />
          </div>
        )}

        <div className="max-w-2xl mx-auto sm:text-center space-y-3.5">
          <p className="inline-flex items-center gap-1.5 ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            <span>
              {pickLocalizedText(
                language,
                homeCms.ratingBadgeTh,
                homeCms.ratingBadgeEn
              )}
            </span>
          </p>

          <h1 className="ty-display text-[var(--color-text-primary)]">
            {pickLocalizedText(
              language,
              homeCms.manifestoTitleTh,
              homeCms.manifestoTitleEn
            )}
          </h1>

          <p className="ty-body-muted">
            {pickLocalizedText(
              language,
              homeCms.manifestoDescTh,
              homeCms.manifestoDescEn
            )}
          </p>

          <div className="pt-1.5 flex flex-wrap items-center sm:justify-center gap-2.5">
            <StandardButton
              variant="primary"
              size="lg"
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th"
                  ? totalAvailableUnitsCount > 0
                    ? `เช็กห้องว่าง (${totalAvailableUnitsCount} หลัง) →`
                    : "เช็กวันว่าง & ราคา →"
                  : "Check Availability →"}
              </span>
            </StandardButton>

            <button
              type="button"
              onClick={() => navigateToTab("chat")}
              className="btn-fw-secondary h-11 px-4 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {language === "th" ? "คุยกับ AI Agent" : "Ask AI Concierge"}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Open-Canvas Icon Pillars */}
        <div className="pt-6 border-t border-[var(--color-border)] grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {homeCms.pillars.map((pillar) => (
            <div key={pillar.id} className="flex items-start gap-3 min-w-0">
              <span className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                <CmsDynamicIcon iconKey={pillar.iconKey} className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                  {pickLocalizedText(language, pillar.titleTh, pillar.titleEn)}
                </h2>
                <p className="ty-caption mt-0.5 line-clamp-2">
                  {pickLocalizedText(
                    language,
                    pillar.captionTh,
                    pillar.captionEn
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: "OUR VILLAS" FRAMELESS HORIZONTAL SHOWCASE
      ====================================================================== */}
      <section className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
              {pickLocalizedText(
                language,
                homeCms.villasEyebrowTh,
                homeCms.villasEyebrowEn
              )}
            </span>
            <h2 className="ty-title mt-0.5">
              {pickLocalizedText(
                language,
                homeCms.villasTitleTh,
                homeCms.villasTitleEn
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <>
                <EditSpotButton
                  label="แก้หัวข้อ"
                  onClick={() => openCmsEditor({ type: "home-villas-header" })}
                />
                <EditSpotButton
                  icon="add"
                  label="เพิ่มห้องพัก"
                  onClick={() => openCmsEditor({ type: "room" })}
                />
              </>
            )}

            <button
              type="button"
              onClick={() => navigateToTab("book")}
              className="inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer shrink-0"
            >
              <span>
                {language === "th" ? "เช็กวันว่างทั้งหมด" : "All Villas"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="-mx-4 w-[calc(100%+2rem)] pl-4 scroll-pl-4 sm:-mx-5 sm:w-[calc(100%+2.5rem)] sm:pl-5 sm:scroll-pl-5 lg:mx-0 lg:w-full lg:pl-0 flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden lg:overflow-visible overscroll-x-contain touch-manipulation no-scrollbar snap-x snap-proximity lg:snap-none after:content-[''] after:shrink-0 after:w-px lg:after:hidden lg:grid lg:grid-cols-4">
          {rooms.map((room) => (
            <article
              key={room.id}
              onClick={() => openRoomDrawer(room, "details", 0)}
              className="group snap-start shrink-0 w-[260px] sm:w-[292px] lg:w-auto flex flex-col gap-3 cursor-pointer"
            >
              <div className="relative aspect-[4/5] w-full rounded-[16px] overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={room.images[0]?.url}
                  alt={pickLocalizedText(language, room.nameTh, room.nameEn)}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 lg:group-hover:scale-105"
                />

                <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md text-white px-2.5 py-0.5 ty-caption font-bold pointer-events-none">
                  {room.code}
                </span>

                {room.discountPercent > 0 && (
                  <span className="absolute top-3 right-3 badge-promo pointer-events-none">
                    -{room.discountPercent}%
                  </span>
                )}

                {canShowEditControls && (
                  <div className="absolute bottom-3 right-3 z-20">
                    <EditSpotButton
                      label="แก้ห้องนี้"
                      onClick={() =>
                        openCmsEditor({ type: "room", roomId: room.id })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <h3 className="ty-subtitle text-[var(--color-text-primary)] lg:group-hover:text-[var(--color-accent)] transition-colors truncate">
                  {pickLocalizedText(language, room.nameTh, room.nameEn)}
                </h3>

                <p className="ty-caption line-clamp-1">
                  {pickLocalizedText(
                    language,
                    room.highlightTh || room.shortDescTh,
                    room.highlightEn || room.shortDescEn
                  )}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 ty-caption">
                  <span className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.baseGuests}–{room.maxGuests}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
                    </span>
                  </span>

                  <span className="font-semibold text-[var(--color-accent)] inline-flex items-center gap-0.5 shrink-0">
                    <span>{language === "th" ? "สำรวจห้อง" : "Explore"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: ALTERNATING SPLIT EDITORIAL STORIES (50/50 Left-Right)
      ====================================================================== */}
      <section className="space-y-10 sm:space-y-14">
        {canShowEditControls && (
          <div className="flex justify-end">
            <EditSpotButton
              icon="add"
              label="เพิ่มบล็อกเรื่องราว"
              onClick={() => openCmsEditor({ type: "home-story" })}
            />
          </div>
        )}

        {visibleStories.map((story, storyIdx) => {
          const isEven = storyIdx % 2 === 0;
          return (
            <div
              key={story.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center"
            >
              <div
                className={`${
                  isEven ? "order-2 lg:order-1" : "order-2"
                } lg:col-span-5 space-y-3.5`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <CmsDynamicIcon
                      iconKey={story.iconKey}
                      className="w-3.5 h-3.5"
                    />
                    <span>
                      {pickLocalizedText(
                        language,
                        story.eyebrowTh,
                        story.eyebrowEn
                      )}
                    </span>
                  </span>

                  {canShowEditControls && (
                    <EditSpotButton
                      label="แก้ไขบล็อกนี้"
                      onClick={() =>
                        openCmsEditor({
                          type: "home-story",
                          storyId: story.id,
                        })
                      }
                    />
                  )}
                </div>

                <h2 className="ty-display text-[var(--color-text-primary)] leading-snug">
                  {pickLocalizedText(language, story.titleTh, story.titleEn)}
                </h2>

                <p className="ty-body-muted">
                  {pickLocalizedText(language, story.descTh, story.descEn)}
                </p>

                {story.pins.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
                    {story.pins.map((pin, pIdx) => (
                      <span
                        key={`${story.id}-pin-${pIdx}`}
                        className="inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                        <span>
                          {pickLocalizedText(language, pin.th, pin.en)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {story.ctaLabelTh && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => navigateToTab(story.ctaTargetTab)}
                      className="btn-fw-secondary cursor-pointer"
                    >
                      <span>
                        {pickLocalizedText(
                          language,
                          story.ctaLabelTh,
                          story.ctaLabelEn
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`${
                  isEven ? "order-1 lg:order-2" : "order-1"
                } lg:col-span-7`}
              >
                <div className="relative -mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[16/9] overflow-hidden bg-[var(--color-background-muted)]">
                  <img
                    src={story.imageUrl}
                    alt={pickLocalizedText(
                      language,
                      story.titleTh,
                      story.titleEn
                    )}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="w-full h-full object-cover select-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* =====================================================================
          SECTION 5: "LIVING STORIES" — 9:16 REELS & VERIFIED GUEST MOMENTS
      ====================================================================== */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
              {pickLocalizedText(
                language,
                homeCms.livingEyebrowTh,
                homeCms.livingEyebrowEn
              )}
            </span>
            <h2 className="ty-title mt-0.5 flex items-center gap-2">
              <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)] shrink-0" />
              <span>
                {pickLocalizedText(
                  language,
                  homeCms.livingTitleTh,
                  homeCms.livingTitleEn
                )}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <>
                <EditSpotButton
                  label="แก้หัวข้อ"
                  onClick={() => openCmsEditor({ type: "home-living-header" })}
                />
                <EditSpotButton
                  icon="add"
                  label="เพิ่มคลิปสั้น"
                  onClick={() => openCmsEditor({ type: "short-video" })}
                />
              </>
            )}

            <button
              type="button"
              onClick={() => navigateToTab("shorts")}
              className="inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer shrink-0"
            >
              <span>{language === "th" ? "ดูวิดีโอทั้งหมด" : "All Videos"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

                {canShowEditControls && (
                  <div className="absolute top-12 right-2.5 z-20">
                    <EditSpotButton
                      onClick={() =>
                        openCmsEditor({
                          type: "short-video",
                          videoId: shortVideo.id,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Open-Canvas Guest Voices Strip */}
        <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
          {canShowEditControls && (
            <div className="flex justify-end">
              <EditSpotButton
                label="แก้ไขคำรีวิวลูกค้า"
                onClick={() => openCmsEditor({ type: "home-quotes" })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {homeCms.guestQuotes.map((item) => (
              <div
                key={item.id}
                onClick={() => navigateToTab("review")}
                className="space-y-2 cursor-pointer group/quote"
              >
                <p className="ty-body text-[var(--color-text-primary)] group-hover/quote:text-[var(--color-accent)] transition-colors">
                  &ldquo;
                  {pickLocalizedText(language, item.quoteTh, item.quoteEn)}
                  &rdquo;
                </p>
                <div className="flex items-center justify-between gap-2 ty-caption">
                  <span className="font-semibold text-[var(--color-text-secondary)]">
                    {pickLocalizedText(language, item.authorTh, item.authorEn)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)]">
                    <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                    <span>{item.score}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: DIRECT BOOKING PRIVILEGES INVITE
      ====================================================================== */}
      <section className="relative -mx-4 px-4 py-8 sm:mx-0 sm:rounded-[20px] sm:p-8 bg-[var(--color-background-muted)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-promo">
              <Tag className="w-3 h-3" />
              <span>
                {language === "th"
                  ? `จองตรงลดสูงสุด ${maxDirectPromoPercent}%`
                  : `Direct Booking · Save up to ${maxDirectPromoPercent}%`}
              </span>
            </span>
            <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
              {pickLocalizedText(
                language,
                homeCms.inviteGuaranteeTh,
                homeCms.inviteGuaranteeEn
              )}
            </span>
          </div>

          <h2 className="ty-display text-[var(--color-text-primary)]">
            {pickLocalizedText(
              language,
              homeCms.inviteTitleTh,
              homeCms.inviteTitleEn
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
            {homeCms.invitePerks.map((perk) => (
              <span key={perk.id} className="inline-flex items-center gap-1.5">
                <CmsDynamicIcon
                  iconKey={perk.iconKey}
                  className="w-4 h-4 text-[var(--color-accent)]"
                />
                <span>
                  {pickLocalizedText(language, perk.labelTh, perk.labelEn)}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canShowEditControls && (
            <EditSpotButton
              label="แก้แบนเนอร์ท้ายหน้า"
              onClick={() => openCmsEditor({ type: "home-invite" })}
            />
          )}

          <StandardButton
            variant="primary"
            size="lg"
            onClick={() => navigateToTab("book")}
          >
            <span>
              {pickLocalizedText(
                language,
                homeCms.inviteCtaTh,
                homeCms.inviteCtaEn
              )}
            </span>
            <ArrowRight className="w-4 h-4" />
          </StandardButton>
        </div>
      </section>
    </div>
  );
}
