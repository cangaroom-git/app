"use client";

import React from "react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
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
    openRoomDrawer,
    navigateToTab,
    openShortsAt,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const sortedShorts = [...activeShorts].sort(
    (a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
  );
  const featuredShorts = sortedShorts.slice(0, 4);

  const featuredReviews = cms.reviews
    .filter((reviewItem) => reviewItem.isFeaturedOnBooking !== false)
    .slice(0, 3);

  return (
    <div className="w-full min-w-0 flex flex-col gap-7 py-2 select-none">
      {/* 1. Minimal Property Header + Underline Tabs + 16:9 Cover */}
      <ResortHeroHeader
        cmsEditType="home-hero"
        onBookClick={() => navigateToTab("book")}
        onChatClick={() => navigateToTab("chat")}
      />

      {/* 2. GoDaddy-Style 3-Column Minimal Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="ty-subtitle font-semibold">
              {language === "th"
                ? "เช็คห้องว่างแบบเรียลไทม์"
                : "Real-Time Room Availability"}
            </h2>
            <p className="ty-caption">
              {language === "th"
                ? `ขณะนี้มีบ้านพักว่าง ${totalAvailableUnitsCount} หลัง จองตรงล็อกห้องทันที 15 นาทีพร้อมฟรีอาหารเช้า`
                : `${totalAvailableUnitsCount} units available for selected dates with complimentary breakfast.`}
            </p>
          </div>
          <div>
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th" ? "เลือกดูห้องพัก" : "Browse Rooms"}
              </span>
            </StandardButton>
          </div>
        </div>

        <div className="app-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="ty-subtitle font-semibold">
              {language === "th"
                ? "คูปองส่วนลดสำหรับจองตรง"
                : "Direct Booking Coupons"}
            </h2>
            <p className="ty-caption">
              {language === "th"
                ? `มีคูปองส่วนลดและสิทธิพิเศษพร้อมใช้ ${activeCouponsCount} รายการ เก็บเข้ากระเป๋าเพื่อใช้ลดราคาได้ทันที`
                : `${activeCouponsCount} promo codes ready to claim and apply at checkout.`}
            </p>
          </div>
          <div>
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("deal")}
            >
              <span>{language === "th" ? "ดูคูปองส่วนลด" : "View Coupons"}</span>
            </StandardButton>
          </div>
        </div>

        <div className="app-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="ty-subtitle font-semibold">
              {language === "th"
                ? "พิกัดและข้อมูลการเข้าพัก"
                : "Location & Stay Info"}
            </h2>
            <p className="ty-caption">
              {language === "th"
                ? `เช็คอิน ${propertyConfig.checkInTime} · เช็คเอาท์ ${propertyConfig.checkOutTime} · แผนที่เดินทางและจุดแวะเที่ยวใกล้ที่พัก`
                : `Check-in ${propertyConfig.checkInTime} · Check-out ${propertyConfig.checkOutTime} · Directions & local spots.`}
            </p>
          </div>
          <div>
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("guide")}
            >
              <span>{language === "th" ? "เปิดแผนที่" : "View Guide"}</span>
            </StandardButton>
          </div>
        </div>
      </section>

      {/* 3. Compact 4-Column Room Showcase (Distinct from /booking!) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="ty-title">
            {language === "th" ? "บ้านพักและวิลล่า" : "Accommodations"}
          </h2>

          <div className="flex items-center gap-2">
            {canShowEditControls && (
              <EditSpotButton
                icon="add"
                label="เพิ่มห้องพัก"
                onClick={() => openCmsEditor({ type: "room" })}
              />
            )}
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th"
                  ? "เช็ควันว่างและจอง"
                  : "Check Availability"}
              </span>
            </StandardButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <article
              key={room.id}
              onClick={() => openRoomDrawer(room, "details", 0)}
              className="app-card overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[var(--color-text-primary)] transition-colors"
            >
              <div className="relative aspect-[4/3] w-full bg-[var(--color-background-muted)] overflow-hidden">
                <img
                  src={room.images[0]?.url}
                  alt={pickLocalizedText(language, room.nameTh, room.nameEn)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                {room.discountPercent > 0 && (
                  <span className="absolute top-2.5 left-2.5 badge-promo">
                    -{room.discountPercent}%
                  </span>
                )}
                {canShowEditControls && (
                  <div className="absolute bottom-2 right-2 z-20">
                    <EditSpotButton
                      onClick={() =>
                        openCmsEditor({ type: "room", roomId: room.id })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 space-y-2">
                <div>
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {room.code} · {room.baseGuests}–{room.maxGuests}{" "}
                    {language === "th" ? "ท่าน" : "guests"} · {room.sizeSqm}{" "}
                    {language === "th" ? "ตร.ม." : "m²"}
                  </p>
                  <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate mt-0.5">
                    {pickLocalizedText(language, room.nameTh, room.nameEn)}
                  </h3>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)] flex items-baseline justify-between">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    {language === "th" ? "เริ่มต้น" : "From"}
                  </span>
                  <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                    ฿{room.basePriceThb.toLocaleString()}
                    <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
                      /{language === "th" ? "คืน" : "night"}
                    </span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Short Videos Strip */}
      {featuredShorts.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-title">
              {language === "th" ? "วิดีโอบรรยากาศจริง" : "Short Videos"}
            </h2>
            <div className="flex items-center gap-2">
              {canShowEditControls && (
                <EditSpotButton
                  icon="add"
                  label="เพิ่มคลิป"
                  onClick={() => openCmsEditor({ type: "short-video" })}
                />
              )}
              <StandardButton
                variant="secondary"
                size="sm"
                onClick={() => navigateToTab("shorts")}
              >
                <span>{language === "th" ? "ดูทั้งหมด" : "View All"}</span>
              </StandardButton>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
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

      {/* 5. Clean Guest Reviews Summary */}
      {featuredReviews.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-title">
              {language === "th" ? "เสียงจากผู้เข้าพัก" : "Guest Reviews"}
            </h2>
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => navigateToTab("review")}
            >
              <span>{language === "th" ? "อ่านรีวิวทั้งหมด" : "All Reviews"}</span>
            </StandardButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredReviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => navigateToTab("review")}
                className="app-card p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-[var(--color-text-primary)] transition-colors"
              >
                <p className="ty-body line-clamp-3">
                  “{pickLocalizedText(language, rev.captionTh, rev.captionEn)}”
                </p>
                <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[var(--color-text-primary)] truncate">
                    {pickLocalizedText(
                      language,
                      rev.authorNameTh,
                      rev.authorNameEn
                    )}
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)] shrink-0">
                    ★ {rev.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
