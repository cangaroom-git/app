"use client";

import React, { useEffect } from "react";
import { Pencil, X } from "lucide-react";
import { SapanStoreData } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CmsEditorTarget } from "@/components/cms/AdminEditOverlay";
import {
  BookingHeroEditor,
  GalleryPhotosEditor,
  GalleryVideoEditor,
  HomeHeroEditor,
  HomeLivingAndQuotesEditor,
  HomeManifestoEditor,
  HomeStoryEditor,
  HomeVillasHeaderEditor,
} from "@/components/cms/editors/HomeAndBookingEditors";
import { RoomEditorSection } from "@/components/cms/editors/RoomEditorSection";
import {
  AddonEditor,
  CouponEditor,
  DealAddonsHeaderEditor,
  DealPrivilegeEditor,
  GuestReviewEditor,
  GuideFaqsEditor,
  GuideLocationEditor,
  SeasonalRatesEditor,
  ShortsHeaderEditor,
  ShortVideoEditor,
} from "@/components/cms/editors/ShortsAndDealEditors";

export interface CmsEditorDrawerProps {
  target: CmsEditorTarget | null;
  store: SapanStoreData;
  saveStore: (updater: (prev: SapanStoreData) => SapanStoreData) => void;
  onClose: () => void;
  onToast?: (message: string) => void;
}

function getDrawerTitle(target: CmsEditorTarget): string {
  switch (target.type) {
    case "home-hero":
      return "แก้ไขภาพปก & พิกัดหน้าแรก";
    case "home-manifesto":
      return "แก้ไขคำโปรยหลัก & 4 จุดเด่น";
    case "home-villas-header":
      return "แก้ไขหัวข้อโซนบ้านพัก";
    case "home-story":
      return target.storyId ? "แก้ไขบล็อกเรื่องราว" : "เพิ่มบล็อกเรื่องราวใหม่";
    case "home-living-header":
      return "แก้ไขหัวข้อโซนวิดีโอหน้าแรก";
    case "home-quotes":
      return "แก้ไขคำรีวิวไฮไลท์หน้าแรก";
    case "home-invite":
      return "แก้ไขแบนเนอร์ชวนจองท้ายหน้า";
    case "booking-hero":
      return "แก้ไขภาพปก & ข้อมูลหน้าจอง";
    case "room":
      return target.roomId ? "แก้ไขห้องพัก & รูปภาพ" : "เพิ่มห้องพัก / วิลล่าใหม่";
    case "gallery-video":
      return "จัดการวิดีโอทัวร์ที่พัก (16:9)";
    case "gallery-photos":
      return "จัดการรูปแกลเลอรีที่พัก";
    case "shorts-header":
      return "ตั้งค่าหน้า Shorts & หมวดหมู่";
    case "short-video":
      return target.videoId
        ? "แก้ไขคลิปวิดีโอสั้น (9:16)"
        : "เพิ่มคลิปวิดีโอสั้น (YouTube / FB)";
    case "coupon":
      return target.couponId ? "แก้ไขคูปองส่วนลด" : "สร้างคูปองส่วนลดใหม่";
    case "deal-addons-header":
      return "แก้ไขหัวข้อหน้าคูปอง & ดีล";
    case "addon":
      return target.addonId
        ? "แก้ไขแพ็กเกจบริการเสริม"
        : "เพิ่มแพ็กเกจหมูกระทะ / สปา";
    case "deal-privilege":
      return "แก้ไขการ์ดสิทธิพิเศษจองตรง";
    case "seasonal-rates":
      return "จัดการเรทราคาฤดูกาล & วันหยุด";
    case "review":
      return target.reviewId ? "แก้ไขรีวิวผู้เข้าพัก" : "เพิ่มรีวิวผู้เข้าพักใหม่";
    case "guide-location":
      return "แก้ไขแผนที่ & สถานที่รอบที่พัก";
    case "guide-faqs":
      return "แก้ไขคำถามที่พบบ่อย (FAQs)";
  }
}

export function CmsEditorDrawer({
  target,
  store,
  saveStore,
  onClose,
  onToast,
}: CmsEditorDrawerProps) {
  useBodyScrollLock(Boolean(target));

  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [target, onClose]);

  if (!target) {
    return null;
  }

  const handleSaved = (message?: string) => {
    if (message && onToast) {
      onToast(message);
    }
    onClose();
  };

  const commonProps = {
    store,
    saveStore,
    onSaved: handleSaved,
  };

  const isPromoTarget =
    target.type === "coupon" || target.type === "addon";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={getDrawerTitle(target)}
      className="fixed inset-0 z-[80] overflow-hidden"
    >
      <div
        onClick={onClose}
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
      />

      <div className="app-right-drawer z-10 animate-slide-in-right-drawer">
        {/* Sticky Drawer Header */}
        <header className="px-4 sm:px-5 py-3.5 bg-[var(--color-background-card)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                isPromoTarget
                  ? "bg-[var(--color-promo-muted)] text-[var(--color-promo-text)]"
                  : "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
              }`}
            >
              <Pencil className="w-4 h-4" />
            </span>
            <h2 className="ty-subtitle truncate">{getDrawerTitle(target)}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแก้ไข"
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Form Canvas (1-Layer Architecture) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-10">
          {target.type === "home-hero" && <HomeHeroEditor {...commonProps} />}
          {target.type === "home-manifesto" && (
            <HomeManifestoEditor {...commonProps} />
          )}
          {target.type === "home-villas-header" && (
            <HomeVillasHeaderEditor {...commonProps} />
          )}
          {target.type === "home-story" && (
            <HomeStoryEditor {...commonProps} storyId={target.storyId} />
          )}
          {target.type === "home-living-header" && (
            <HomeLivingAndQuotesEditor {...commonProps} mode="header" />
          )}
          {target.type === "home-quotes" && (
            <HomeLivingAndQuotesEditor {...commonProps} mode="quotes" />
          )}
          {target.type === "home-invite" && (
            <HomeLivingAndQuotesEditor {...commonProps} mode="invite" />
          )}
          {target.type === "booking-hero" && (
            <BookingHeroEditor {...commonProps} />
          )}
          {target.type === "room" && (
            <RoomEditorSection {...commonProps} roomId={target.roomId} />
          )}
          {target.type === "gallery-video" && (
            <GalleryVideoEditor {...commonProps} />
          )}
          {target.type === "gallery-photos" && (
            <GalleryPhotosEditor
              {...commonProps}
              initialCategory={target.category}
            />
          )}
          {target.type === "shorts-header" && (
            <ShortsHeaderEditor {...commonProps} />
          )}
          {target.type === "short-video" && (
            <ShortVideoEditor {...commonProps} videoId={target.videoId} />
          )}
          {target.type === "coupon" && (
            <CouponEditor {...commonProps} couponId={target.couponId} />
          )}
          {target.type === "deal-addons-header" && (
            <DealAddonsHeaderEditor {...commonProps} />
          )}
          {target.type === "addon" && (
            <AddonEditor {...commonProps} addonId={target.addonId} />
          )}
          {target.type === "deal-privilege" && (
            <DealPrivilegeEditor
              {...commonProps}
              privilegeId={target.privilegeId}
            />
          )}
          {target.type === "seasonal-rates" && (
            <SeasonalRatesEditor {...commonProps} />
          )}
          {target.type === "review" && (
            <GuestReviewEditor {...commonProps} reviewId={target.reviewId} />
          )}
          {target.type === "guide-location" && (
            <GuideLocationEditor {...commonProps} />
          )}
          {target.type === "guide-faqs" && <GuideFaqsEditor {...commonProps} />}
        </div>
      </div>
    </div>
  );
}

