"use client";

import React, { useState } from "react";
import {
  BedDouble,
  Check,
  Images,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Tag,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";

export interface ResortHeroHeaderProps {
  id?: string;
  onBookClick?: () => void;
  onChatClick?: () => void;
  onShareClick?: () => void;
  activeCategoryFilter?: string | null;
  onSelectCategoryFilter?: (categoryId: string | null) => void;
}

export function ResortHeroHeader({
  id,
  onBookClick,
  onChatClick,
  onShareClick,
  activeCategoryFilter,
  onSelectCategoryFilter,
}: ResortHeroHeaderProps) {
  const {
    propertyConfig,
    lang: language,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    rooms,
    coupons,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);

  const bookingCms = cms.bookingPage;

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

  const topPromoDiscountPercent = Math.max(
    highestCouponPercent,
    highestRoomDiscountPercent,
    10
  );

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
    bookingCms.heroBannerUrl ||
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  const hotelJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: `${propertyConfig.nameTh} (${propertyConfig.nameEn})`,
    description: propertyConfig.taglineTh,
    image: [heroBannerImageUrl],
  };

  const roomCategoryChips = [
    {
      id: "all",
      label:
        language === "th"
          ? `ทั้งหมด (${rooms.length})`
          : `All (${rooms.length})`,
      isActive: !activeCategoryFilter || activeCategoryFilter === "all",
    },
    ...bookingCms.categoryChips.map((chip) => ({
      id: chip.id,
      label: pickLocalizedText(language, chip.labelTh, chip.labelEn),
      isActive: activeCategoryFilter === chip.id,
    })),
    {
      id: "sapan-attractions",
      label: language === "th" ? "ที่เที่ยวสะปัน" : "Attractions",
      isActive: activeCategoryFilter === "sapan-attractions",
    },
  ];

  return (
    <header id={id} className="w-full space-y-4 select-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLdSchema) }}
      />

      {/* 1. Resort Hero Photo — Matches Home Page (/) Hero 16:9 & max-h-[540px] */}
      <div
        onClick={() => openGalleryModal(null)}
        className="relative -mt-4 -mx-4 w-[calc(100%+2rem)] rounded-none sm:mt-0 sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[16/9] max-h-[540px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/resorthereo"
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
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/resorthereo:scale-[1.015]"
        />

        {canShowEditControls && (
          <div className="absolute top-3 right-3 z-20">
            <EditSpotButton
              label="แก้ภาพปก & ข้อมูลที่พัก"
              onClick={() => openCmsEditor({ type: "booking-hero" })}
            />
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openGalleryModal(null);
          }}
          className="absolute bottom-3 right-3 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-md text-white px-3.5 h-8 inline-flex items-center gap-1.5 ty-caption font-semibold transition cursor-pointer"
        >
          <Images className="w-3.5 h-3.5" />
          <span>
            {language === "th" ? "ดูภาพที่พักทั้งหมด" : "All Resort Photos"}
          </span>
        </button>
      </div>

      {/* 2. Flat Open Property Header */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 ty-caption">
          <button
            type="button"
            onClick={() => navigateToTab("review")}
            className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            <span>{bookingCms.ratingScore}</span>
            <span className="font-normal text-[var(--color-text-secondary)] underline underline-offset-2">
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

          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text-secondary)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>
              {pickLocalizedText(
                language,
                bookingCms.locationLabelTh,
                bookingCms.locationLabelEn
              )}
            </span>
          </span>

          <button
            type="button"
            onClick={() => navigateToTab("deal")}
            className="badge-promo cursor-pointer hover:opacity-90 transition"
          >
            <Tag className="w-3 h-3" />
            <span>
              {language === "th"
                ? `ดีลลดสูงสุด ${topPromoDiscountPercent}%`
                : `Save up to ${topPromoDiscountPercent}%`}
            </span>
          </button>
        </div>

        <div>
          <h1 className="ty-display text-[var(--color-text-primary)]">
            {pickLocalizedText(
              language,
              propertyConfig.nameTh,
              propertyConfig.nameEn
            )}
          </h1>

          <p className="mt-1 ty-body-muted max-w-3xl">
            {pickLocalizedText(
              language,
              propertyConfig.taglineTh,
              propertyConfig.taglineEn
            )}
          </p>
        </div>

        <div className="pt-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={
                onBookClick ||
                (() => rooms[0] && openRoomDrawer(rooms[0], "calendar"))
              }
              className="btn-round-solid cursor-pointer"
            >
              <BedDouble className="w-4 h-4" />
              <span>{language === "th" ? "จองห้องพัก" : "Book Now"}</span>
            </button>

            <button
              type="button"
              onClick={onChatClick || (() => navigateToTab("chat"))}
              className="btn-fw-secondary cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
              <span>{language === "th" ? "ถาม AI" : "Ask AI"}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToTab("guide")}
              className="btn-fw-secondary cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
              <span>{language === "th" ? "คู่มือสะปัน" : "Guide"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareProperty}
              className="btn-icon btn-icon-lg cursor-pointer"
              title={language === "th" ? "แชร์ที่พัก" : "Share"}
              aria-label={language === "th" ? "แชร์ที่พัก" : "Share"}
            >
              {hasCopiedShareUrl ? (
                <Check className="w-4 h-4 text-[var(--color-success)] stroke-[2.5]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 shrink-0 no-scrollbar">
            {roomCategoryChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onSelectCategoryFilter?.(chip.id)}
                className={`h-8 px-3.5 rounded-full ty-caption font-semibold inline-flex items-center justify-center transition cursor-pointer whitespace-nowrap ${
                  chip.isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
