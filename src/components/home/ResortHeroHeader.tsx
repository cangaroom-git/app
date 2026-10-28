"use client";

import React, { useState } from "react";
import {
  BedDouble,
  Check,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Tag,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";

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
    navigateToTab,
    rooms,
    coupons,
  } = useHotelApp();
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);

  const highestCouponPercent = coupons
    .filter((coupon) => coupon.isActive && coupon.discountType === "PERCENT")
    .reduce((maxPercent, coupon) => Math.max(maxPercent, coupon.discountValue), 0);

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
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  const hotelJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: `${propertyConfig.nameTh} (${propertyConfig.nameEn})`,
    alternateName: "Sapan Unseen Nan Resort",
    description:
      "ที่พักพรีเมียมวิวหมอก 360 องศา บ้านสะปัน อำเภอบ่อเกลือ จังหวัดน่าน สถาปัตยกรรมโมเดิร์นกลมกลืนธรรมชาติ พร้อมจากุซซี่และอาหารเช้าวิวเขา",
    url: "https://sapanunseen.com",
    telephone: "+66-88-888-8888",
    priceRange: "฿2,500 - ฿6,500",
    image: [heroBannerImageUrl],
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
      latitude: 19.1925,
      longitude: 101.1989,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1280",
      bestRating: "5",
      worstRating: "1",
    },
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
    {
      id: "aframe",
      label: "A-Frame",
      isActive: activeCategoryFilter === "aframe",
    },
    {
      id: "panoramic",
      label: "Panoramic",
      isActive: activeCategoryFilter === "panoramic",
    },
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

      {/* 1. Clean Hero Photo (Single rounded media element — no dark overlay) */}
      <img
        src={heroBannerImageUrl}
        alt={`${propertyConfig.nameTh} (${propertyConfig.nameEn})`}
        loading="eager"
        decoding="async"
        className="w-full aspect-[16/8] sm:aspect-[21/9] min-h-[210px] max-h-[420px] rounded-[20px] object-cover object-center bg-[var(--color-background-muted)]"
      />

      {/* 2. Flat Open Property Header (Zero Wrapper Cards, Zero Nested Boxes) */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 ty-caption">
          <button
            type="button"
            onClick={() => navigateToTab("review")}
            className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            <span>4.9</span>
            <span className="font-normal text-[var(--color-text-secondary)] underline underline-offset-2">
              (1,280+ {language === "th" ? "รีวิว" : "reviews"})
            </span>
          </button>

          <span>·</span>

          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text-secondary)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>
              {language === "th"
                ? "บ้านสะปัน บ่อเกลือ น่าน"
                : "Ban Sapan, Bo Kluea, Nan"}
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
            {language === "th" ? propertyConfig.nameTh : propertyConfig.nameEn}
          </h1>

          <p className="mt-1 ty-body-muted max-w-3xl">
            {language === "th"
              ? propertyConfig.taglineTh ||
                "ที่พักพรีเมียมวิวหมอก 360 องศา ท่ามกลางขุนเขาและสายธารสะปัน พร้อมอาหารเช้าเสิร์ฟถึงระเบียง"
              : propertyConfig.taglineEn ||
                "360° misty mountain & stream luxury villas in Sapan, Nan with private terrace breakfast"}
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
