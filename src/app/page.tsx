"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  CloudSun,
  Grid,
  Images,
  MapPin,
  MessageCircle,
  Play,
  Share2,
  ShieldCheck,
  Star,
  TicketPercent,
  Users,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { CmsDynamicIcon } from "@/components/cms/CmsIconRegistry";
import { StandardButton } from "@/components/ui/standards";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    coupons,
    weather,
    lang: language,
    checkIn,
    checkOut,
    guests,
    nights: stayNights,
    totalAvailableUnitsCount,
    openCalendarDrawer,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    claimAndApplyCoupon,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [copiedShare, setCopiedShare] = useState(false);

  const homeCms = cms.home;
  const bookingCms = cms.bookingPage;

  const propertyShortName = pickLocalizedText(
    language,
    propertyConfig.nameTh.split("(")[0].trim(),
    propertyConfig.nameEn
  );

  const liveTempCelsius = weather?.currentTemp
    ? Math.round(weather.currentTemp)
    : 19;

  // Build 5-Photo Bento Mosaic (Hero + 4 distinct resort angles)
  const heroMainPhoto =
    homeCms.heroImageUrl ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=2000&q=85";

  const candidateSidePhotos = Array.from(
    new Set([
      rooms[0]?.images[1]?.url,
      rooms[1]?.images[0]?.url,
      rooms[2]?.images[0]?.url,
      rooms[3]?.images[0]?.url,
      ...homeCms.stories.map((s) => s.imageUrl),
      ...rooms.flatMap((r) => r.images.map((img) => img.url)),
    ])
  ).filter((url): url is string => Boolean(url) && url !== heroMainPhoto);

  const bentoSidePhotos = [0, 1, 2, 3].map(
    (idx) => candidateSidePhotos[idx] || heroMainPhoto
  );

  const activeShorts = cms.shortsPage.videos.filter(
    (v) => v.isActive !== false
  );
  const sortedShorts = [...activeShorts].sort(
    (a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
  );

  const activeCoupon = coupons.find((c) => c.isActive) || null;

  const lowestNightlyPrice = rooms.reduce(
    (minPrice, r) => Math.min(minPrice, r.basePriceThb),
    rooms[0]?.basePriceThb || 3900
  );

  const highestDiscountPercent = Math.max(
    rooms.reduce((m, r) => Math.max(m, r.discountPercent || 0), 0),
    coupons
      .filter((c) => c.isActive && c.discountType === "PERCENT")
      .reduce((m, c) => Math.max(m, c.discountValue), 0)
  );

  const featuredReviews = cms.reviews
    .filter((r) => r.isFeaturedOnBooking !== false)
    .slice(0, 3);

  const handleSharePage = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: propertyConfig.nameTh,
          text: propertyConfig.taglineTh,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-8 sm:gap-10 pb-4 select-none">
      {/* =====================================================================
          SECTION 1: AIRBNB-STYLE TITLE BAR + 5-PHOTO BENTO MOSAIC
      ====================================================================== */}
      <section className="space-y-3.5">
        {/* Title + Meta + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="ty-display truncate">{propertyShortName}</h1>
              <BadgeCheck className="w-5 h-5 fill-[var(--color-accent)] text-white shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ty-body text-[var(--color-text-secondary)]">
              <button
                type="button"
                onClick={() => navigateToTab("review")}
                className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer"
              >
                <Star className="w-4 h-4 fill-[var(--color-text-primary)] text-[var(--color-text-primary)]" />
                <span>{bookingCms.ratingScore}</span>
                <span className="underline underline-offset-2 font-medium">
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
              <button
                type="button"
                onClick={() => navigateToTab("guide")}
                className="inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>
                  {pickLocalizedText(
                    language,
                    homeCms.heroLocationTh,
                    homeCms.heroLocationEn
                  )}
                </span>
              </button>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <CloudSun className="w-4 h-4 text-[var(--color-accent)]" />
                <span>{liveTempCelsius}°C</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                label="เปลี่ยนรูปปก & พิกัด"
                onClick={() => openCmsEditor({ type: "home-hero" })}
              />
            )}

            <button
              type="button"
              onClick={() => navigateToTab("chat")}
              className="h-9 px-3 rounded-[8px] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1.5 ty-body font-semibold transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
              <span>{language === "th" ? "ถามที่พัก" : "Ask Host"}</span>
            </button>

            <button
              type="button"
              onClick={handleSharePage}
              className="h-9 px-3 rounded-[8px] hover:bg-[var(--color-background-muted)] inline-flex items-center gap-1.5 ty-body font-semibold transition cursor-pointer"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>
                {copiedShare
                  ? language === "th"
                    ? "คัดลอกแล้ว"
                    : "Copied"
                  : language === "th"
                  ? "แชร์"
                  : "Share"}
              </span>
            </button>
          </div>
        </div>

        {/* 5-Photo Bento Grid */}
        <div className="relative rounded-[16px] sm:rounded-[20px] overflow-hidden grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[260px] sm:h-[370px] lg:h-[430px] bg-[var(--color-background-muted)]">
          {/* Primary Hero Tile (Left 50%) */}
          <div
            onClick={() => openGalleryModal(null)}
            className="md:col-span-2 md:row-span-2 relative w-full h-full overflow-hidden cursor-pointer group"
          >
            <img
              src={heroMainPhoto}
              alt={propertyShortName}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover transition duration-300 group-hover:brightness-95"
            />
          </div>

          {/* 4 Right Mosaic Tiles */}
          {bentoSidePhotos.map((photoUrl, idx) => (
            <div
              key={`bento-tile-${idx}`}
              onClick={() => openGalleryModal(null)}
              className="hidden md:block relative w-full h-full overflow-hidden cursor-pointer group"
            >
              <img
                src={photoUrl}
                alt={`${propertyShortName} highlight ${idx + 1}`}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover transition duration-300 group-hover:brightness-95"
              />
            </div>
          ))}

          {/* Airbnb-Style Bottom-Right "Show All Photos" Button */}
          <button
            type="button"
            onClick={() => openGalleryModal(null)}
            className="absolute bottom-3.5 right-3.5 z-10 rounded-[8px] bg-white hover:bg-neutral-100 text-[#080809] border border-black/15 shadow-sm px-3.5 h-9 inline-flex items-center gap-2 ty-caption font-semibold transition cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>
              {language === "th" ? "แสดงรูปภาพทั้งหมด" : "Show all photos"}
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: INSTAGRAM STORY HIGHLIGHTS ROW (9:16 Video Stories + Promo)
      ====================================================================== */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
            {language === "th"
              ? "ไฮไลต์บรรยากาศจริง (กดดูคลิปสั้น)"
              : "Story Highlights"}
          </span>
          {canShowEditControls && (
            <EditSpotButton
              icon="add"
              label="เพิ่มคลิป Story"
              onClick={() => openCmsEditor({ type: "short-video" })}
            />
          )}
        </div>

        <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-1">
          {/* Promo Coupon Story Highlight */}
          {activeCoupon && (
            <button
              type="button"
              onClick={() => {
                claimAndApplyCoupon(activeCoupon.code);
                navigateToTab("deal");
              }}
              className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group cursor-pointer"
            >
              <span className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#c53829] via-[#ff5a5f] to-[#ffb400] transition-transform duration-200 group-hover:scale-105">
                <span className="h-[66px] w-[66px] rounded-full bg-[var(--color-background-card)] p-[2px] flex items-center justify-center">
                  <span className="h-full w-full rounded-full bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] flex flex-col items-center justify-center">
                    <TicketPercent className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-none mt-0.5">
                      {activeCoupon.discountType === "PERCENT"
                        ? `-${activeCoupon.discountValue}%`
                        : `฿${activeCoupon.discountValue}`}
                    </span>
                  </span>
                </span>
              </span>
              <span className="ty-caption font-medium text-[var(--color-text-primary)] truncate w-full text-center">
                {language === "th" ? "คูปองส่วนลด" : "Deals"}
              </span>
            </button>
          )}

          {/* Video Story Circles */}
          {sortedShorts.map((video, idx) => {
            const originalIdx = cms.shortsPage.videos.findIndex(
              (v) => v.id === video.id
            );
            const shortTitle = pickLocalizedText(
              language,
              video.titleTh,
              video.titleEn
            );

            return (
              <button
                key={video.id}
                type="button"
                onClick={() =>
                  openShortsAt(originalIdx >= 0 ? originalIdx : idx)
                }
                className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group cursor-pointer"
              >
                <span className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-[#0866ff] via-[#4599ff] to-[#00c6ff] transition-transform duration-200 group-hover:scale-105">
                  <span className="block h-[66px] w-[66px] rounded-full bg-[var(--color-background-card)] p-[2px] overflow-hidden">
                    <img
                      src={video.posterUrl}
                      alt={shortTitle}
                      loading="lazy"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </span>
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[var(--color-accent)] text-white ring-2 ring-[var(--color-background-body)] flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </span>
                </span>
                <span className="ty-caption font-medium text-[var(--color-text-primary)] truncate w-full text-center">
                  {shortTitle}
                </span>
              </button>
            );
          })}

          {/* All Gallery Story Circle */}
          <button
            type="button"
            onClick={() => openGalleryModal(null)}
            className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group cursor-pointer"
          >
            <span className="p-[2px] rounded-full border border-[var(--color-border-emphasized)] transition-transform duration-200 group-hover:scale-105">
              <span className="h-[66px] w-[66px] rounded-full bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)]">
                <Images className="w-6 h-6" />
              </span>
            </span>
            <span className="ty-caption font-medium text-[var(--color-text-primary)] truncate w-full text-center">
              {language === "th" ? "อัลบั้มรูป" : "Gallery"}
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: AIRBNB SPLIT OVERVIEW + STICKY DIRECT RESERVE WIDGET
      ====================================================================== */}
      <section className="pt-2 border-t border-[var(--color-border)] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Host Bio & Clean Highlights */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="ty-title">
                {pickLocalizedText(
                  language,
                  homeCms.manifestoTitleTh,
                  homeCms.manifestoTitleEn
                )}
              </h2>
              <p className="ty-body text-[var(--color-text-secondary)]">
                {language === "th"
                  ? `วิลล่าส่วนตัว ${rooms.length} หลัง · ฟรีอาหารเช้า · เช็กอิน ${propertyConfig.checkInTime}`
                  : `${rooms.length} private villas · Free breakfast · Check-in ${propertyConfig.checkInTime}`}
              </p>
            </div>

            {canShowEditControls && (
              <EditSpotButton
                label="แก้ไขคำแนะนำ"
                onClick={() => openCmsEditor({ type: "home-manifesto" })}
              />
            )}
          </div>

          {/* Clean Icon Highlights (Airbnb Listing Style — Zero Grey Boxes) */}
          <div className="border-y border-[var(--color-border)] py-5 space-y-4">
            {homeCms.pillars.map((pillar) => (
              <div key={pillar.id} className="flex items-start gap-4">
                <CmsDynamicIcon
                  iconKey={pillar.iconKey}
                  className="w-6 h-6 text-[var(--color-text-primary)] shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="ty-body font-semibold text-[var(--color-text-primary)]">
                    {pickLocalizedText(
                      language,
                      pillar.titleTh,
                      pillar.titleEn
                    )}
                  </h3>
                  <p className="ty-caption mt-0.5">
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

          {/* Concise Story Description */}
          <p className="ty-body text-[var(--color-text-primary)] leading-relaxed">
            {pickLocalizedText(
              language,
              homeCms.manifestoDescTh,
              homeCms.manifestoDescEn
            )}
          </p>
        </div>

        {/* Right: Sticky Direct Booking Summary Card */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-[16px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] p-5 sm:p-6 shadow-[0_6px_24px_rgba(0,0,0,0.07)] space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="ty-caption">
                  {language === "th" ? "เริ่มต้น" : "From"}
                </span>
                <span className="ty-display">
                  ฿{lowestNightlyPrice.toLocaleString()}
                </span>
                <span className="ty-body text-[var(--color-text-secondary)]">
                  / {language === "th" ? "คืน" : "night"}
                </span>
              </div>

              {highestDiscountPercent > 0 && (
                <span className="badge-promo">
                  {language === "th"
                    ? `ลดสูงสุด ${highestDiscountPercent}%`
                    : `Save ${highestDiscountPercent}%`}
                </span>
              )}
            </div>

            {/* Airbnb-Style Interactive Date & Guest Selector Box */}
            <button
              type="button"
              onClick={openCalendarDrawer}
              className="w-full rounded-[12px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] transition text-left overflow-hidden cursor-pointer"
            >
              <div className="grid grid-cols-2 border-b border-[var(--color-border)]">
                <div className="p-3 border-r border-[var(--color-border)]">
                  <span className="block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                    {language === "th" ? "เช็กอิน" : "Check-in"}
                  </span>
                  <span className="ty-body font-semibold">
                    {formatShortDate(checkIn, language)}
                  </span>
                </div>
                <div className="p-3">
                  <span className="block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                    {language === "th" ? "เช็กเอาท์" : "Check-out"}
                  </span>
                  <span className="ty-body font-semibold">
                    {formatShortDate(checkOut, language)}
                  </span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                    {language === "th" ? "ผู้เข้าพัก" : "Guests"}
                  </span>
                  <span className="ty-body font-semibold">
                    {guests} {language === "th" ? "ท่าน" : "guests"} ·{" "}
                    {stayNights} {language === "th" ? "คืน" : "nights"}
                  </span>
                </div>
                <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </div>
            </button>

            <StandardButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th"
                  ? totalAvailableUnitsCount > 0
                    ? `เช็กห้องว่าง (${totalAvailableUnitsCount} หลังพร้อมจอง)`
                    : "ดูตารางห้องว่าง & ราคา"
                  : "Check Room Availability"}
              </span>
            </StandardButton>

            <p className="ty-caption text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-success)] shrink-0" />
              <span>
                {language === "th"
                  ? "จองตรงกับที่พัก · ไม่บวกค่าธรรมเนียม OTA"
                  : "Official direct booking · Zero OTA fees"}
              </span>
            </p>
          </div>
        </aside>
      </section>

      {/* =====================================================================
          SECTION 4: CLEAN FRAMELESS VILLA SHOWCASE (Airbnb Card Grid)
      ====================================================================== */}
      <section className="pt-6 border-t border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="ty-title">
              {pickLocalizedText(
                language,
                homeCms.villasTitleTh,
                homeCms.villasTitleEn
              )}
            </h2>
            <p className="ty-caption">
              {language === "th"
                ? "คลิกที่บ้านพักเพื่อดูรูปมุมต่างๆ และรายละเอียดภายในห้อง"
                : "Tap any villa to explore photos and amenities"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                icon="add"
                label="เพิ่มห้องพัก"
                onClick={() => openCmsEditor({ type: "room" })}
              />
            )}
            <button
              type="button"
              onClick={() => navigateToTab("book")}
              className="inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              <span>
                {language === "th" ? "เปรียบเทียบ & จอง" : "Compare & Book"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {rooms.map((room) => (
            <article
              key={room.id}
              onClick={() => openRoomDrawer(room, "details", 0)}
              className="group flex flex-col gap-2.5 cursor-pointer"
            >
              <div className="relative aspect-[4/3] w-full rounded-[14px] overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={room.images[0]?.url}
                  alt={pickLocalizedText(language, room.nameTh, room.nameEn)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 text-[#080809] px-2.5 py-0.5 ty-caption font-bold shadow-xs">
                  {room.code}
                </span>

                {room.discountPercent > 0 && (
                  <span className="absolute top-2.5 right-2.5 badge-promo">
                    -{room.discountPercent}%
                  </span>
                )}

                {canShowEditControls && (
                  <div className="absolute bottom-2.5 right-2.5 z-20">
                    <EditSpotButton
                      label="แก้ห้องนี้"
                      onClick={() =>
                        openCmsEditor({ type: "room", roomId: room.id })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                    {pickLocalizedText(language, room.nameTh, room.nameEn)}
                  </h3>
                  <span className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-text-primary)] shrink-0">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>9.8</span>
                  </span>
                </div>

                <p className="ty-caption flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {room.baseGuests}–{room.maxGuests}{" "}
                    {language === "th" ? "ท่าน" : "guests"} · {room.sizeSqm}{" "}
                    {language === "th" ? "ตร.ม." : "m²"}
                  </span>
                </p>

                <p className="pt-0.5 ty-body">
                  <span className="font-bold">
                    ฿{room.basePriceThb.toLocaleString()}
                  </span>{" "}
                  <span className="text-[var(--color-text-secondary)]">
                    / {language === "th" ? "คืน" : "night"}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: VERIFIED GUEST REVIEWS (Clean Minimal Grid)
      ====================================================================== */}
      {featuredReviews.length > 0 && (
        <section className="pt-6 border-t border-[var(--color-border)] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-title flex items-center gap-2">
              <Star className="w-5 h-5 fill-[var(--color-text-primary)] text-[var(--color-text-primary)] shrink-0" />
              <span>
                {bookingCms.ratingScore} ·{" "}
                {pickLocalizedText(
                  language,
                  bookingCms.reviewCountTh,
                  bookingCms.reviewCountEn
                )}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => navigateToTab("review")}
              className="ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {language === "th" ? "ดูรีวิวทั้งหมด" : "Show all reviews"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredReviews.map((rev) => (
              <article
                key={rev.id}
                onClick={() => navigateToTab("review")}
                className="rounded-[14px] border border-[var(--color-border)] p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-[var(--color-border-emphasized)] transition"
              >
                <p className="ty-body line-clamp-3">
                  “{pickLocalizedText(language, rev.captionTh, rev.captionEn)}”
                </p>

                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center ty-caption font-bold shrink-0">
                    {rev.authorAvatar || rev.authorNameTh[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="ty-caption font-bold text-[var(--color-text-primary)] truncate">
                      {pickLocalizedText(
                        language,
                        rev.authorNameTh,
                        rev.authorNameEn
                      )}
                    </p>
                    <p className="ty-caption truncate">{rev.roomLabel}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
