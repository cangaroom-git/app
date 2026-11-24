"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Save, Upload, X } from "lucide-react";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import type { CouponDealDto, HotelStorefrontDto } from "@/types/cangaroom";

export interface OwnerQuickProfileModalProps {
  isOpen: boolean;
  hotel: HotelStorefrontDto["hotel"];
  coupons: CouponDealDto[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function OwnerQuickProfileModal({
  isOpen,
  hotel,
  coupons,
  onClose,
  onSaved,
}: OwnerQuickProfileModalProps) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 250);
  useBodyScrollLock(shouldRender);

  const [nameTh, setNameTh] = useState(hotel.nameTh);
  const [taglineTh, setTaglineTh] = useState(hotel.taglineTh);
  const [descriptionTh, setDescriptionTh] = useState(hotel.descriptionTh);
  const [coverImageUrl, setCoverImageUrl] = useState(hotel.coverImageUrl || "");
  const [contactPhone, setContactPhone] = useState(hotel.contactPhone);
  const [contactLine, setContactLine] = useState(hotel.contactLine);
  const [externalWebsiteUrl, setExternalWebsiteUrl] = useState(
    hotel.externalWebsiteUrl || ""
  );
  const [primaryCtaLabelTh, setPrimaryCtaLabelTh] = useState(
    hotel.primaryCtaLabelTh || ""
  );
  const [featuredCouponId, setFeaturedCouponId] = useState(
    hotel.featuredCouponId || ""
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNameTh(hotel.nameTh);
    setTaglineTh(hotel.taglineTh);
    setDescriptionTh(hotel.descriptionTh);
    setCoverImageUrl(hotel.coverImageUrl || "");
    setContactPhone(hotel.contactPhone);
    setContactLine(hotel.contactLine);
    setExternalWebsiteUrl(hotel.externalWebsiteUrl || "");
    setPrimaryCtaLabelTh(hotel.primaryCtaLabelTh || "");
    setFeaturedCouponId(hotel.featuredCouponId || "");
    setErrorMsg(null);
  }, [isOpen, hotel]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!shouldRender || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (nameTh.trim().length < 2) {
      setErrorMsg("กรุณาระบุชื่อสถานที่อย่างน้อย 2 ตัวอักษร");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/studio/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          nameTh: nameTh.trim(),
          taglineTh: taglineTh.trim(),
          descriptionTh: descriptionTh.trim(),
          coverImageUrl: coverImageUrl.trim() || null,
          contactPhone: contactPhone.trim(),
          contactLine: contactLine.trim(),
          externalWebsiteUrl: externalWebsiteUrl.trim(),
          primaryCtaLabelTh: primaryCtaLabelTh.trim(),
          featuredCouponId: featuredCouponId || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="แก้ไขโปรไฟล์ด่วน"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-5"
    >
      <div
        data-state={dataState}
        onClick={onClose}
        className="cgr-modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div
        data-state={dataState}
        className="cgr-modal-surface-md relative z-10 w-full sm:max-w-[580px] max-h-[90dvh] flex flex-col rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] overflow-hidden"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] truncate">
              แก้ไขโปรไฟล์ด่วน
            </h2>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
              /{hotel.slug} · อัปเดตทันทีเหมือนหน้าเพจโซเชียล
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="h-9 w-9 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5 pb-[max(20px,env(safe-area-inset-bottom))]"
        >
          {/* Cover Square Preview */}
          <div className="flex items-center gap-4">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={nameTh}
                className="h-20 w-20 rounded-[18px] object-cover bg-[var(--color-background-muted)] shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-[18px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                <Upload className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-1.5 min-w-0">
              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                ภาพปกหลักหน้าการ์ด (1:1)
              </p>
              <label className="h-9 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? "กำลังอัปโหลด..." : "เปลี่ยนภาพปก"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    try {
                      const url = await uploadMediaFile(file, "logos");
                      setCoverImageUrl(url);
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <StandardFieldGroup>
            <StandardInput
              grouped
              label="ชื่อสถานที่ (ภาษาไทย) *"
              required
              value={nameTh}
              onChange={(e) => setNameTh(e.target.value)}
            />
            <StandardInput
              grouped
              label="คำโปรยสั้นๆ (Tagline)"
              placeholder="เช่น คาเฟ่สโลว์บาร์กลางหุบเขา"
              value={taglineTh}
              onChange={(e) => setTaglineTh(e.target.value)}
            />
          </StandardFieldGroup>

          <StandardTextarea
            label="เรื่องราวและรายละเอียดสถานที่"
            rows={4}
            value={descriptionTh}
            onChange={(e) => setDescriptionTh(e.target.value)}
          />

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="เบอร์โทรศัพท์"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <StandardInput
                grouped
                label="LINE ID / @LINE OA"
                value={contactLine}
                onChange={(e) => setContactLine(e.target.value)}
              />
            </div>
            {hotel.merchantMode === "PROFILE_ONLY" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="ลิงก์เว็บไซต์ / จองภายนอก"
                  placeholder="https://..."
                  value={externalWebsiteUrl}
                  onChange={(e) => setExternalWebsiteUrl(e.target.value)}
                />
                <StandardInput
                  grouped
                  label="ข้อความปุ่มหลัก"
                  placeholder="เช่น ดูเมนู & จองโต๊ะ"
                  value={primaryCtaLabelTh}
                  onChange={(e) => setPrimaryCtaLabelTh(e.target.value)}
                />
              </div>
            )}
          </StandardFieldGroup>

          {coupons.length > 0 && (
            <StandardSelectField
              label="โปรโมชั่นที่ปักหมุดหน้าการ์ด"
              value={featuredCouponId}
              onChange={setFeaturedCouponId}
              sheetTitle="เลือกโปรโมชั่นหลักบนการ์ด"
              options={[
                { value: "", label: "อัตโนมัติ (โปรโมชั่นล่าสุด)" },
                ...coupons.map((c) => ({
                  value: c.id,
                  label: c.titleTh,
                  sublabel: c.code || undefined,
                })),
              ]}
            />
          )}

          {errorMsg && (
            <div className="rounded-[12px] bg-[var(--color-background-muted)] px-4 py-3 text-[13px] font-semibold text-[var(--color-error)]">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
