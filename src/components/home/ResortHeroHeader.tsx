"use client";

import React, { useState } from "react";
import {
  BadgeCheck,
  Check,
  CloudSun,
  Images,
  MapPin,
  MessageCircle,
  Share2,
  Star,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { StandardButton } from "@/components/ui/standards";

export interface ResortHeroHeaderProps {
  id?: string;
  onBookClick?: () => void;
  onChatClick?: () => void;
  onShareClick?: () => void;
  activeCategoryFilter?: string | null;
  onSelectCategoryFilter?: (categoryId: string | null) => void;
  cmsEditType?: "home-hero" | "booking-hero";
}

export function ResortHeroHeader({
  id,
  onBookClick,
  onChatClick,
  onShareClick,
  activeCategoryFilter,
  onSelectCategoryFilter,
  cmsEditType = "booking-hero",
}: ResortHeroHeaderProps) {
  const {
    propertyConfig,
    lang: language,
    weather,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    rooms,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);

  const bookingCms = cms.bookingPage;
  const homeCms = cms.home;

  const liveTempCelsius = weather?.currentTemp
    ? Math.round(weather.currentTemp)
    : 19;

  const handleShareProperty = async () => {
    if (onShareClick) {
      onShareClick();
      return;
    }
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
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setHasCopiedShareUrl(true);
      setTimeout(() => setHasCopiedShareUrl(false), 2000);
    }
  };

  const heroBannerImageUrl =
    (cmsEditType === "home-hero"
      ? homeCms.heroImageUrl
      : bookingCms.heroBannerUrl) ||
    propertyConfig.heroImageUrl ||
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  const brandBadgeCode = (propertyConfig.brandCode || "SU").slice(0, 2);

  const roomCategoryChips = onSelectCategoryFilter
    ? [
        {
          id: "all",
          label:
            language === "th"
              ? `ห้องพักทั้งหมด (${rooms.length})`
              : `All Rooms (${rooms.length})`,
          isActive: !activeCategoryFilter || activeCategoryFilter === "all",
        },
        ...bookingCms.categoryChips.map((chip) => ({
          id: chip.id,
          label: pickLocalizedText(language, chip.labelTh, chip.labelEn),
          isActive: activeCategoryFilter === chip.id,
        })),
      ]
    : [];

  return (
    <header id={id} className="app-card overflow-hidden select-none">
      {/* 1. FACEBOOK COVER PHOTO (16:9) */}
      <div
        onClick={() => openGalleryModal(null)}
        className="relative w-full aspect-[16/9] max-h-[360px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/cover"
      >
        <img
          src={heroBannerImageUrl}
          alt={pickLocalizedText(
            language,
            propertyConfig.nameTh,
            propertyConfig.nameEn
          )}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center"
        />

        {canShowEditControls && (
          <div className="absolute top-3 right-3 z-20">
            <EditSpotButton
              label="เปลี่ยนรูปปก"
              onClick={() => openCmsEditor({ type: cmsEditType })}
            />
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openGalleryModal(null);
          }}
          className="absolute bottom-3 right-3 rounded-[8px] bg-black/65 hover:bg-black/80 text-white px-3 h-8 inline-flex items-center gap-1.5 ty-caption font-semibold transition cursor-pointer"
        >
          <Images className="w-3.5 h-3.5" />
          <span>{language === "th" ? "ดูรูปทั้งหมด" : "All Photos"}</span>
        </button>
      </div>

      {/* 2. FACEBOOK PAGE PROFILE BAR */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-7 sm:-mt-8 relative z-10">
          <div className="flex items-end gap-3.5 min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ring-4 ring-[var(--color-background-card)] flex items-center justify-center text-[20px] sm:text-[24px] font-bold shrink-0 shadow-sm">
              {brandBadgeCode}
            </div>

            <div className="pt-8 sm:pt-9 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="ty-display truncate">
                  {pickLocalizedText(
                    language,
                    propertyConfig.nameTh.split("(")[0].trim(),
                    propertyConfig.nameEn
                  )}
                </h1>
                <BadgeCheck className="w-5 h-5 fill-[var(--color-accent)] text-white shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 ty-caption mt-0.5">
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
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {pickLocalizedText(
                      language,
                      bookingCms.locationLabelTh,
                      bookingCms.locationLabelEn
                    )}
                  </span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>{liveTempCelsius}°C</span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Page Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <StandardButton
              variant="primary"
              size="md"
              onClick={
                onBookClick ||
                (() => rooms[0] && openRoomDrawer(rooms[0], "calendar"))
              }
            >
              <span>
                {language === "th" ? "เช็กห้องว่าง" : "Check Rooms"}
              </span>
            </StandardButton>

            <StandardButton
              variant="secondary"
              size="md"
              onClick={onChatClick || (() => navigateToTab("chat"))}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{language === "th" ? "ทักแชท" : "Message"}</span>
            </StandardButton>

            <button
              type="button"
              onClick={handleShareProperty}
              className="h-9 px-3 rounded-[8px] bg-[var(--color-background-subtle)] hover:brightness-95 inline-flex items-center justify-center transition cursor-pointer"
              title={language === "th" ? "แชร์เพจที่พัก" : "Share"}
              aria-label={language === "th" ? "แชร์เพจที่พัก" : "Share"}
            >
              {hasCopiedShareUrl ? (
                <Check className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <Share2 className="w-4 h-4 text-[var(--color-text-primary)]" />
              )}
            </button>
          </div>
        </div>

        <p className="mt-3 ty-body text-[var(--color-text-secondary)] line-clamp-2">
          {pickLocalizedText(
            language,
            propertyConfig.taglineTh,
            propertyConfig.taglineEn
          )}
        </p>

        {/* Optional Category Filter Chips */}
        {roomCategoryChips.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {roomCategoryChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onSelectCategoryFilter?.(chip.id)}
                className={`h-8 px-3.5 rounded-full ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap ${
                  chip.isActive
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
