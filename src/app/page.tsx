"use client";

import React from "react";
import {
  Clock,
  CloudSun,
  Compass,
  Images,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Star,
  TicketPercent,
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
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    claimAndApplyCoupon,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const homeCms = cms.home;
  const bookingCms = cms.bookingPage;

  const liveTempCelsius = weather?.currentTemp
    ? Math.round(weather.currentTemp)
    : 19;

  const heroImageUrl =
    homeCms.heroImageUrl ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  // Build curated photo set for the signature 5-photo hospitality showcase
  const allShowcasePhotos = Array.from(
    new Set([
      heroImageUrl,
      ...rooms.flatMap((room) => room.images.map((img) => img.url)),
      ...homeCms.stories.map((story) => story.imageUrl),
    ])
  ).filter(Boolean);

  const secondaryMosaicPhotos = allShowcasePhotos.slice(1, 5);

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const featuredShorts = [...activeShorts]
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
    .slice(0, 4);

  const visibleStories = homeCms.stories.filter(
    (story) => story.isVisible !== false
  );

  const featuredReviews = cms.reviews
    .filter((reviewItem) => reviewItem.isFeaturedOnBooking !== false)
    .slice(0, 3);

  const activePromoCoupon = coupons.find((coupon) => coupon.isActive) || null;

  const hotelJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: `${propertyConfig.nameTh} (${propertyConfig.nameEn})`,
    description: propertyConfig.taglineTh,
    image: [heroImageUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: propertyConfig.locationTh,
      addressCountry: "TH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: propertyConfig.latitude,
      longitude: propertyConfig.longitude,
    },
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-4 sm:gap-5 select-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLdSchema) }}
      />

      {/* =====================================================================
          SECTION 1: SIGNATURE BOUTIQUE PHOTO SHOWCASE & RESORT OVERVIEW
          (Single-column hospitality identity — visual-first, airy, uncluttered)
      ====================================================================== */}
      <section className="app-card overflow-hidden">
        {/* 5-Photo Mosaic on Desktop / Crisp 16:9 + Thumbnail Strip on Mobile */}
        <div className="relative p-2 sm:p-3 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-[10px] overflow-hidden">
            {/* Primary 16:9 Hero Photo */}
            <div
              onClick={() => openGalleryModal(null)}
              className="md:col-span-7 relative aspect-[16/9] md:aspect-auto md:h-[348px] bg-[var(--color-background-muted)] overflow-hidden cursor-pointer group/mainphoto"
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
                className="w-full h-full object-cover transition-transform duration-500 group-hover/mainphoto:scale-[1.02]"
              />

              {canShowEditControls && (
                <div className="absolute top-3 left-3 z-20">
                  <EditSpotButton
                    label="เปลี่ยนภาพปกหลัก"
                    onClick={() => openCmsEditor({ type: "home-hero" })}
                  />
                </div>
              )}
            </div>

            {/* 2x2 Secondary Resort Atmosphere Photos (Desktop/Tablet) */}
            <div className="hidden md:grid md:col-span-5 grid-cols-2 grid-rows-2 gap-2 h-[348px]">
              {secondaryMosaicPhotos.map((photoUrl, idx) => (
                <div
                  key={`mosaic-${idx}`}
                  onClick={() => openGalleryModal(null)}
                  className="relative w-full h-full bg-[var(--color-background-muted)] overflow-hidden cursor-pointer group/subphoto"
                >
                  <img
                    src={photoUrl}
                    alt={`${propertyConfig.nameEn} ${idx + 2}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/subphoto:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Horizontal Photo Strip */}
          {secondaryMosaicPhotos.length > 0 && (
            <div className="md:hidden mt-2 grid grid-cols-4 gap-1.5">
              {secondaryMosaicPhotos.map((photoUrl, idx) => (
                <button
                  key={`mobile-thumb-${idx}`}
                  type="button"
                  onClick={() => openGalleryModal(null)}
                  className="aspect-[16/10] rounded-[6px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer"
                >
                  <img
                    src={photoUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => openGalleryModal(null)}
            className="absolute bottom-4 right-5 rounded-[8px] bg-black/70 hover:bg-black/85 text-white px-3.5 h-9 inline-flex items-center gap-1.5 ty-caption font-semibold transition cursor-pointer"
          >
            <Images className="w-4 h-4" />
            <span>
              {language === "th"
                ? `ดูรูปภาพทั้งหมด (${allShowcasePhotos.length}+)`
                : `All Photos (${allShowcasePhotos.length}+)`}
            </span>
          </button>
        </div>

        {/* Resort Identity & Story Overview */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ty-caption">
                <button
                  type="button"
                  onClick={() => navigateToTab("review")}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                  <span>{bookingCms.ratingScore}</span>
                  <span className="font-normal text-[var(--color-text-secondary)]">
                    (
                    {pickLocalizedText(
                      language,
                      bookingCms.reviewCountTh,
                      bookingCms.reviewCountEn
                    )}
                    )
                  </span>
                </button>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>
                    {pickLocalizedText(
                      language,
                      homeCms.heroLocationTh,
                      homeCms.heroLocationEn
                    )}
                  </span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <CloudSun className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>
                    {language === "th"
                      ? `อากาศวันนี้ ${liveTempCelsius}°C`
                      : `${liveTempCelsius}°C today`}
                  </span>
                </span>
              </div>

              <h1 className="ty-display">
                {pickLocalizedText(
                  language,
                  propertyConfig.nameTh,
                  propertyConfig.nameEn
                )}
              </h1>

              <p className="ty-body text-[var(--color-text-secondary)] max-w-3xl">
                {pickLocalizedText(
                  language,
                  homeCms.manifestoDescTh,
                  homeCms.manifestoDescEn
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canShowEditControls && (
                <EditSpotButton
                  label="แก้ไขคำแนะนำ & จุดเด่น"
                  onClick={() => openCmsEditor({ type: "home-manifesto" })}
                />
              )}

              <StandardButton
                variant="primary"
                size="lg"
                onClick={() => navigateToTab("book")}
              >
                <span>
                  {language === "th"
                    ? totalAvailableUnitsCount > 0
                      ? `เช็กวันว่าง & จองห้อง (${totalAvailableUnitsCount} หลัง)`
                      : "เช็กวันว่าง & ราคา"
                    : "Check Availability"}
                </span>
              </StandardButton>

              <StandardButton
                variant="secondary"
                size="lg"
                onClick={() => navigateToTab("chat")}
              >
                <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
                <span>
                  {language === "th" ? "สอบถามที่พัก" : "Ask Concierge"}
                </span>
              </StandardButton>
            </div>
          </div>

          {/* 4 Signature Resort Highlights */}
          {homeCms.pillars.length > 0 && (
            <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 lg:grid-cols-4 gap-3">
              {homeCms.pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  className="rounded-[10px] bg-[var(--color-background-muted)] p-3 flex items-start gap-3 min-w-0"
                >
                  <span className="h-9 w-9 rounded-full bg-[var(--color-background-card)] text-[var(--color-accent)] flex items-center justify-center shrink-0 shadow-xs">
                    <CmsDynamicIcon
                      iconKey={pillar.iconKey}
                      className="w-[18px] h-[18px]"
                    />
                  </span>
                  <div className="min-w-0">
                    <h2 className="ty-body font-semibold truncate">
                      {pickLocalizedText(
                        language,
                        pillar.titleTh,
                        pillar.titleEn
                      )}
                    </h2>
                    <p className="ty-caption line-clamp-1">
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
          )}

          {/* Essential Property Info Strip */}
          <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ty-caption">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th"
                    ? `เช็กอิน ${propertyConfig.checkInTime} · เช็กเอาท์ ${propertyConfig.checkOutTime}`
                    : `Check-in ${propertyConfig.checkInTime} · Check-out ${propertyConfig.checkOutTime}`}
                </span>
              </span>

              {propertyConfig.phones[0] && (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)]">
                  <Phone className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>{propertyConfig.phones.join(" , ")}</span>
                </span>
              )}

              {propertyConfig.lineId && (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)]">
                  <MessageCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>LINE: {propertyConfig.lineId}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateToTab("guide")}
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>
                {language === "th"
                  ? "ดูแผนที่ & สถานที่ท่องเที่ยวใกล้ที่พัก"
                  : "Map & Nearby Attractions"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: RESORT ATMOSPHERE & EXPERIENCE STORIES (Single-Column Cards)
      ====================================================================== */}
      {visibleStories.length > 0 && (
        <section className="space-y-4">
          {canShowEditControls && (
            <div className="app-card px-4 py-3 flex items-center justify-between">
              <span className="ty-subtitle font-bold">
                เรื่องราวและบรรยากาศที่พัก
              </span>
              <EditSpotButton
                icon="add"
                label="เพิ่มบล็อกแนะนำที่พัก"
                onClick={() => openCmsEditor({ type: "home-story" })}
              />
            </div>
          )}

          {visibleStories.map((story, idx) => {
            const imageFirstOnDesktop = idx % 2 === 0;
            return (
              <article
                key={story.id}
                className="app-card overflow-hidden grid grid-cols-1 md:grid-cols-12 items-center"
              >
                <div
                  className={`md:col-span-6 w-full aspect-[16/9] md:h-full bg-[var(--color-background-muted)] overflow-hidden ${
                    imageFirstOnDesktop ? "md:order-1" : "md:order-2"
                  }`}
                >
                  <img
                    src={story.imageUrl}
                    alt={pickLocalizedText(
                      language,
                      story.titleTh,
                      story.titleEn
                    )}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div
                  className={`md:col-span-6 p-5 sm:p-6 space-y-3 ${
                    imageFirstOnDesktop ? "md:order-2" : "md:order-1"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-3 py-1 ty-caption font-semibold">
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

                  <h2 className="ty-title">
                    {pickLocalizedText(language, story.titleTh, story.titleEn)}
                  </h2>

                  <p className="ty-body text-[var(--color-text-secondary)]">
                    {pickLocalizedText(language, story.descTh, story.descEn)}
                  </p>

                  {story.pins.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {story.pins.map((pin, pIdx) => (
                        <span
                          key={`${story.id}-pin-${pIdx}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] px-2.5 py-1 ty-caption font-medium text-[var(--color-text-primary)]"
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
                      <StandardButton
                        variant="secondary"
                        size="md"
                        onClick={() =>
                          navigateToTab(story.ctaTargetTab || "book")
                        }
                      >
                        <span>
                          {pickLocalizedText(
                            language,
                            story.ctaLabelTh.replace(/→/g, "").trim(),
                            story.ctaLabelEn.replace(/→/g, "").trim()
                          )}
                        </span>
                      </StandardButton>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =====================================================================
          SECTION 3: SHORT VIDEOS IN MOTION (Full-Width 4-Column Card)
      ====================================================================== */}
      {featuredShorts.length > 0 && (
        <section className="app-card p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="ty-title flex items-center gap-2">
                <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)] shrink-0" />
                <span>
                  {pickLocalizedText(
                    language,
                    homeCms.livingTitleTh,
                    homeCms.livingTitleEn
                  )}
                </span>
              </h2>
              <p className="ty-caption mt-0.5">
                {language === "th"
                  ? "ชมบรรยากาศจริงของวิลล่า ทะเลหมอกยามเช้า และมุมพักผ่อนรอบที่พัก"
                  : "Watch real clips of our mountain villas, morning mist, and private decks"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canShowEditControls && (
                <EditSpotButton
                  icon="add"
                  label="เพิ่มคลิปสั้น"
                  onClick={() => openCmsEditor({ type: "short-video" })}
                />
              )}
              <StandardButton
                variant="secondary"
                size="sm"
                onClick={() => navigateToTab("shorts")}
              >
                <span>
                  {language === "th" ? "ดูวิดีโอทั้งหมด" : "All Videos"}
                </span>
              </StandardButton>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <div className="absolute top-12 right-2 z-20">
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
        </section>
      )}

      {/* =====================================================================
          SECTION 4: GUEST IMPRESSIONS & DIRECT BOOKING PRIVILEGE
      ====================================================================== */}
      {featuredReviews.length > 0 && (
        <section className="app-card p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-title flex items-center gap-2">
              <Star className="w-5 h-5 fill-[var(--color-warning)] text-[var(--color-warning)] shrink-0" />
              <span>
                {language === "th"
                  ? "ความประทับใจจากผู้เข้าพักจริง"
                  : "Guest Experiences"}
              </span>
            </h2>

            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("review")}
            >
              <span>
                {language === "th" ? "อ่านรีวิวทั้งหมด" : "All Reviews"}
              </span>
            </StandardButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {featuredReviews.map((rev) => (
              <article
                key={rev.id}
                onClick={() => navigateToTab("review")}
                className="rounded-[10px] bg-[var(--color-background-muted)] overflow-hidden flex flex-col justify-between cursor-pointer hover:bg-[var(--color-background-subtle)]/65 transition"
              >
                {rev.photos[0] && (
                  <div className="aspect-[16/9] w-full bg-[var(--color-background-subtle)] overflow-hidden">
                    <img
                      src={rev.photos[0]}
                      alt={rev.roomLabel}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                  <p className="ty-body line-clamp-3">
                    “{pickLocalizedText(language, rev.captionTh, rev.captionEn)}”
                  </p>

                  <div className="flex items-center justify-between gap-2 ty-caption pt-1 border-t border-[var(--color-border)]">
                    <span className="font-semibold text-[var(--color-text-primary)] truncate">
                      {pickLocalizedText(
                        language,
                        rev.authorNameTh,
                        rev.authorNameEn
                      )}{" "}
                      · {rev.roomCode}
                    </span>
                    <span className="font-bold text-[var(--color-accent)] shrink-0">
                      ★ {rev.rating}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Direct Booking Promo Footer Strip */}
          {activePromoCoupon && (
            <div className="rounded-[10px] bg-[var(--color-promo-muted)] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] flex items-center justify-center shrink-0">
                  <TicketPercent className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                    {pickLocalizedText(
                      language,
                      activePromoCoupon.titleTh,
                      activePromoCoupon.titleEn || activePromoCoupon.titleTh
                    )}
                  </p>
                  <p className="ty-caption text-[var(--color-promo-text)] font-semibold">
                    {language === "th"
                      ? `จองตรงผ่านหน้าเว็บใช้โค้ด ${activePromoCoupon.code} รับส่วนลดทันที`
                      : `Use code ${activePromoCoupon.code} when booking direct`}
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
                className="shrink-0"
              >
                <span>
                  {language === "th"
                    ? "เก็บคูปอง & เช็กห้องว่าง"
                    : "Claim & Check Rooms"}
                </span>
              </StandardButton>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
