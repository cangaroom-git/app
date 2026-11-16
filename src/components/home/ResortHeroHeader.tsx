"use client";

import React, { useState } from "react";
import {
  Check,
  CloudSun,
  Images,
  MapPin,
  Share2,
  Star,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { StandardButton } from "@/components/ui/standards";
import { HotelNavTabId } from "@/components/navigation/NavigationIcons";

export interface ResortHeroHeaderProps {
  id?: string;
  onBookClick?: () => void;
  onChatClick?: () => void;
  onShareClick?: () => void;
  cmsEditType?: "home-hero" | "booking-hero";
}

export function ResortHeroHeader({
  id,
  onBookClick,
  onChatClick,
  onShareClick,
  cmsEditType = "home-hero",
}: ResortHeroHeaderProps) {
  const {
    propertyConfig,
    lang: language,
    weather,
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

  const quickTabs: Array<{ id: HotelNavTabId; th: string; en: string }> = [
    { id: "home", th: "ภาพรวม", en: "Overview" },
    {
      id: "book",
      th: `ห้องพัก (${rooms.length})`,
      en: `Rooms (${rooms.length})`,
    },
    { id: "shorts", th: "วิดีโอสั้น", en: "Videos" },
    { id: "deal", th: "คูปองส่วนลด", en: "Deals" },
    { id: "review", th: "รีวิว", en: "Reviews" },
    { id: "guide", th: "แผนที่ & ที่เที่ยว", en: "Location" },
  ];

  return (
    <header id={id} className="space-y-5 select-none">
      {/* 1. Minimal Clean Header Row (Like GoDaddy Portfolio Top Title + Black Action Button) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="ty-display tracking-tight">
            {pickLocalizedText(
              language,
              propertyConfig.nameTh.split("(")[0].trim(),
              propertyConfig.nameEn
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ty-caption">
            <button
              type="button"
              onClick={() => navigateToTab("review")}
              className="inline-flex items-center gap-1 font-medium text-[var(--color-text-primary)] hover:underline cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{bookingCms.ratingScore}</span>
              <span className="text-[var(--color-text-secondary)] font-normal">
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

        <div className="flex items-center gap-2 shrink-0">
          <StandardButton
            variant="secondary"
            size="md"
            onClick={onChatClick || (() => navigateToTab("chat"))}
          >
            <span>{language === "th" ? "สอบถามที่พัก" : "Contact"}</span>
          </StandardButton>

          <button
            type="button"
            onClick={handleShareProperty}
            className="btn-fw-secondary !px-2.5"
            title={language === "th" ? "แชร์ลิงก์" : "Share"}
            aria-label="Share"
          >
            {hasCopiedShareUrl ? (
              <Check className="w-4 h-4 text-[var(--color-success)]" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          <StandardButton
            variant="primary"
            size="md"
            onClick={onBookClick || (() => navigateToTab("book"))}
          >
            <span>{language === "th" ? "จองห้องพัก" : "Book Stay"}</span>
          </StandardButton>
        </div>
      </div>

      {/* 2. GoDaddy-Style Horizontal Underline Navigation Tabs */}
      <div className="border-b border-[var(--color-border)] flex items-center gap-5 overflow-x-auto no-scrollbar">
        {quickTabs.map((t) => {
          const isCurrent = t.id === "home";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigateToTab(t.id)}
              className={`pb-2.5 text-[14px] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                isCurrent
                  ? "border-[var(--color-text-primary)] font-semibold text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {language === "th" ? t.th : t.en}
            </button>
          );
        })}
      </div>

      {/* 3. Clean 16:9 Cover Image Card (1px Border, Zero Heavy Overlays) */}
      <div
        onClick={() => openGalleryModal(null)}
        className="relative w-full aspect-[16/9] max-h-[420px] rounded-[8px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer"
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
          className="absolute bottom-3 right-3 rounded-[6px] bg-white/95 text-[#111111] border border-[#e5e7eb] px-3 h-8 inline-flex items-center gap-1.5 text-[13px] font-medium hover:bg-white transition cursor-pointer"
        >
          <Images className="w-3.5 h-3.5" />
          <span>{language === "th" ? "ดูรูปภาพทั้งหมด" : "All Photos"}</span>
        </button>
      </div>
    </header>
  );
}
