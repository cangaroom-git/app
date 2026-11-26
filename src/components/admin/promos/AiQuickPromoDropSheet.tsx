"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  StandardButton,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
  StatusPill,
} from "@/components/ui/standards";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import type { ExtractedPromoPayload } from "@/app/api/admin/promos/extract/route";

export interface PromoTargetHotelOption {
  id: string;
  slug: string;
  nameTh: string;
  placeCategory: string;
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  provinceId: string;
  coverImageUrl: string | null;
}

interface AiQuickPromoDropSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: PromoTargetHotelOption[];
  onCreated: (message: string, publishedNow: boolean) => void;
}

const LOCATION_SCOPE_OPTIONS = [
  {
    value: "SINGLE_LOCATION",
    label: "ร้านเดี่ยว / 1 สาขา (ปักหมุดแผนที่)",
    sublabel: "ที่พัก คาเฟ่ ร้านอาหารที่มีพิกัดชัดเจน",
  },
  {
    value: "MULTI_BRANCH",
    label: "เชนหลายสาขา (Multi-Branch)",
    sublabel: "เช่น KFC, Café Amazon, Centara ใช้ได้หลายสาขา",
  },
  {
    value: "NATIONWIDE_ONLINE",
    label: "ทั่วประเทศ / ออนไลน์ / บัตรเครดิต",
    sublabel: "ไม่ผูกพิกัดแผนที่ เช่น KTC, SCB, Agoda Code",
  },
];

const PROMO_CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก & โรงแรม" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "ร้านอาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา & เวลเนส" },
  { value: "ATTRACTION", label: "กิจกรรม & ที่เที่ยว" },
];

export function AiQuickPromoDropSheet({
  isOpen,
  onClose,
  hotels,
  onCreated,
}: AiQuickPromoDropSheetProps) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 260);
  useBodyScrollLock(shouldRender);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: Raw Input for AI
  const [rawText, setRawText] = useState("");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [posterBase64, setPosterBase64] = useState<string | null>(null);
  const [posterMime, setPosterMime] = useState<string>("image/jpeg");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNotice, setExtractNotice] = useState<{
    usedAi: boolean;
    matchedName: string | null;
  } | null>(null);

  // Step 2: Structured Promo Form
  const [matchedHotelId, setMatchedHotelId] = useState<string>("");
  const [brandNameTh, setBrandNameTh] = useState("");
  const [brandNameEn, setBrandNameEn] = useState("");
  const [locationScope, setLocationScope] = useState<
    "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE"
  >("SINGLE_LOCATION");
  const [branchSummaryTh, setBranchSummaryTh] = useState("");
  const [provinceId, setProvinceId] = useState("bangkok");
  const [promoCategoryCode, setPromoCategoryCode] = useState<
    "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION"
  >("STAY");
  const [titleTh, setTitleTh] = useState("");
  const [promoHeadlineTh, setPromoHeadlineTh] = useState("");
  const [descriptionTh, setDescriptionTh] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [originalPriceText, setOriginalPriceText] = useState("");
  const [dealPriceText, setDealPriceText] = useState("");
  const [startsAt, setStartsAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [expiresAt, setExpiresAt] = useState(() =>
    new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [visualMode, setVisualMode] = useState<"OFFICIAL_PHOTO" | "BRANDED_CARD">(
    "BRANDED_CARD"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const provinceOptions = useMemo(() => {
    return [
      {
        value: "nationwide",
        label: "ทั่วประเทศ / ออนไลน์",
        sublabel: "ใช้ได้หลายจังหวัดหรือออนไลน์",
      },
      ...THAILAND_77_PROVINCES.map((p) => ({
        value: p.id,
        label: p.nameTh.split("(")[0].trim(),
        sublabel: p.nameEn,
      })),
    ];
  }, []);

  const hotelOptions = useMemo(() => {
    return [
      {
        value: "",
        label: "สร้างแบรนด์ / สถานที่ใหม่อัตโนมัติ",
        sublabel: "ระบบจะสร้างหน้าโปรไฟล์ /{slug} ให้ทันที",
      },
      ...hotels.map((h) => ({
        value: h.id,
        label: h.nameTh,
        sublabel: `/${h.slug} · ${getPlaceCategoryMeta(h.placeCategory).shortLabelTh}`,
      })),
    ];
  }, [hotels]);

  const handleSelectHotel = (nextId: string) => {
    setMatchedHotelId(nextId);
    const found = hotels.find((h) => h.id === nextId);
    if (found) {
      setBrandNameTh(found.nameTh);
      setLocationScope(found.locationScope);
      setProvinceId(found.provinceId || "bangkok");
      if (
        found.placeCategory === "STAY" ||
        found.placeCategory === "CAFE" ||
        found.placeCategory === "RESTAURANT" ||
        found.placeCategory === "WELLNESS" ||
        found.placeCategory === "ATTRACTION"
      ) {
        setPromoCategoryCode(found.placeCategory);
      }
      if (found.coverImageUrl && !coverImageUrl) {
        setCoverImageUrl(found.coverImageUrl);
        setVisualMode("OFFICIAL_PHOTO");
      }
    }
  };

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg("ไฟล์รูปภาพใหญ่เกิน 6MB กรุณาย่อขนาดก่อนอัปโหลด");
      return;
    }
    setErrorMsg(null);
    setPosterMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) {
        setPosterPreviewUrl(result);
        setPosterBase64(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiExtract = async () => {
    if (!rawText.trim() && !posterBase64) {
      setErrorMsg("กรุณาวางข้อความโปรโมชั่น หรืออัปโหลดรูปโปสเตอร์ก่อนกดให้ AI แกะ");
      return;
    }
    setIsExtracting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/promos/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          imageBase64: posterBase64,
          imageMimeType: posterMime,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.extracted) {
        throw new Error(json.error || "แกะข้อมูลไม่สำเร็จ");
      }

      const data = json.extracted as ExtractedPromoPayload;
      setBrandNameTh(data.brandNameTh || "");
      setBrandNameEn(data.brandNameEn || "");
      setLocationScope(data.locationScope);
      setBranchSummaryTh(data.branchSummaryTh || "");
      setProvinceId(data.provinceId || "bangkok");
      setPromoCategoryCode(data.promoCategoryCode);
      setTitleTh(data.titleTh || data.promoHeadlineTh || "");
      setPromoHeadlineTh(data.promoHeadlineTh || "");
      setDescriptionTh(data.descriptionTh || "");
      setPromoCode(data.promoCode || "");
      setOriginalPriceText(
        data.originalPriceThb ? String(data.originalPriceThb) : ""
      );
      setDealPriceText(data.dealPriceThb ? String(data.dealPriceThb) : "");
      if (data.startsAt) setStartsAt(data.startsAt);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      setExternalUrl(data.externalUrl || "");
      setVisualMode(data.suggestedVisualMode);

      if (data.matchedHotel) {
        setMatchedHotelId(data.matchedHotel.id);
        if (data.matchedHotel.coverImageUrl) {
          setCoverImageUrl(data.matchedHotel.coverImageUrl);
        }
      } else {
        setMatchedHotelId("");
      }

      setExtractNotice({
        usedAi: data.usedAi,
        matchedName: data.matchedHotel?.nameTh ?? null,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างแกะข้อมูล"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const resetForm = () => {
    setRawText("");
    setPosterPreviewUrl(null);
    setPosterBase64(null);
    setExtractNotice(null);
    setMatchedHotelId("");
    setBrandNameTh("");
    setBrandNameEn("");
    setLocationScope("SINGLE_LOCATION");
    setBranchSummaryTh("");
    setProvinceId("bangkok");
    setPromoCategoryCode("STAY");
    setTitleTh("");
    setPromoHeadlineTh("");
    setDescriptionTh("");
    setPromoCode("");
    setOriginalPriceText("");
    setDealPriceText("");
    setExternalUrl("");
    setCoverImageUrl("");
    setVisualMode("BRANDED_CARD");
    setErrorMsg(null);
  };

  const handleSubmit = async (mode: "INBOX" | "PUBLISH_NOW") => {
    if (!brandNameTh.trim() || !promoHeadlineTh.trim()) {
      setErrorMsg("กรุณากรอกชื่อแบรนด์/ร้าน และหัวข้อส่วนลด (Headline) ให้ครบ");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const origNum = Number(originalPriceText.replace(/,/g, ""));
      const dealNum = Number(dealPriceText.replace(/,/g, ""));

      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceType: "ADMIN_AI_DROP",
          matchedHotelId: matchedHotelId || null,
          brandNameTh: brandNameTh.trim(),
          brandNameEn: brandNameEn.trim(),
          locationScope,
          branchSummaryTh: branchSummaryTh.trim(),
          provinceId:
            locationScope === "NATIONWIDE_ONLINE" ? "nationwide" : provinceId,
          promoCategoryCode,
          titleTh: (titleTh || promoHeadlineTh).trim(),
          promoHeadlineTh: promoHeadlineTh.trim(),
          descriptionTh: descriptionTh.trim(),
          promoCode: promoCode.trim().toUpperCase(),
          originalPriceThb:
            Number.isFinite(origNum) && origNum > 0 ? Math.round(origNum) : null,
          dealPriceThb:
            Number.isFinite(dealNum) && dealNum > 0 ? Math.round(dealNum) : null,
          startsAt: startsAt || null,
          expiresAt: expiresAt || null,
          externalUrl: externalUrl.trim(),
          coverImageUrl: coverImageUrl.trim(),
          visualMode,
          rawText,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "บันทึกโปรโมชั่นไม่สำเร็จ");
      }

      resetForm();
      onCreated(
        mode === "PUBLISH_NOW"
          ? `เผยแพร่โปร "${promoHeadlineTh.trim()}" ขึ้นหน้าแรกแล้ว`
          : `บันทึกโปร "${promoHeadlineTh.trim()}" เข้า Promo Inbox แล้ว`,
        mode === "PUBLISH_NOW"
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกโปรโมชั่นไม่สำเร็จ"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live 1:1 Branded Card Preview URL
  const previewCardUrl = useMemo(() => {
    const prov = THAILAND_77_PROVINCES.find((p) => p.id === provinceId);
    const scopeLabel = formatPlaceLocationScopeLabel(
      {
        locationScope,
        branchSummaryTh,
        provinceId,
        provinceNameTh: prov ? prov.nameTh.split("(")[0].trim() : "ทั่วไทย",
        provinceNameEn: prov ? prov.nameEn : "Thailand",
      },
      "th"
    );
    const dateInfo = formatPromoDateRangeLabel(
      startsAt || null,
      expiresAt || null,
      "th"
    );
    const qs = new URLSearchParams();
    qs.set("headline", promoHeadlineTh.trim() || "ลด 25% โปรเที่ยวไทย");
    qs.set("brand", brandNameTh.trim() || "ชื่อแบรนด์ / ร้านพาร์ทเนอร์");
    qs.set("category", promoCategoryCode);
    qs.set("scope", scopeLabel);
    if (dateInfo?.label) qs.set("dates", dateInfo.label);
    if (promoCode.trim()) qs.set("code", promoCode.trim().toUpperCase());
    return `/api/og/promo-card?${qs.toString()}`;
  }, [
    brandNameTh,
    branchSummaryTh,
    expiresAt,
    locationScope,
    promoCategoryCode,
    promoCode,
    promoHeadlineTh,
    provinceId,
    startsAt,
  ]);

  const activeCategoryMeta = getPlaceCategoryMeta(promoCategoryCode);

  if (!shouldRender || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Quick Promo Drop"
      data-state={dataState}
      onClick={onClose}
      className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/45 backdrop-blur-[2px] flex items-end lg:items-center lg:justify-end"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="cgr-modal-surface-lg w-full lg:max-w-[920px] h-[92dvh] lg:h-[100dvh] rounded-t-[24px] lg:rounded-none lg:rounded-l-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
      >
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="lg:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
        />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-accent)] shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-[17px] sm:text-[18px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] truncate">
                AI Quick Promo Drop
              </h2>
            </div>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
              โยนรูปโปสเตอร์หรือข้อความโปร → AI แกะลงฟอร์มพร้อมสร้างการ์ด 1:1 ใน 5 วินาที
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3 flex items-center gap-2.5 text-[13.5px] text-[var(--color-text-primary)]">
              <span className="h-2 w-2 rounded-full bg-[#e60023] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Drop Poster / Paste Text -> AI Extract */}
          <section className="rounded-[22px] bg-[var(--color-background-muted)] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[14.5px] font-bold text-[var(--color-text-primary)]">
                  1. โยนวัตถุดิบโปรโมชั่น (รูปโปสเตอร์ หรือ ข้อความ / ลิงก์)
                </p>
                <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                  รองรับโปสเตอร์โปร Facebook, อีเมลบัตรเครดิต, หรือแคปชันโปรจากร้านค้า
                </p>
              </div>
              {extractNotice && (
                <StatusPill variant="success">
                  {extractNotice.usedAi ? "แกะด้วย Gemini Vision" : "แกะอัตโนมัติพร้อมตรวจ"}
                </StatusPill>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
              {/* Poster Upload Box */}
              <div className="sm:col-span-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePosterFileChange}
                  className="hidden"
                />
                {posterPreviewUrl ? (
                  <div className="relative aspect-square w-full max-w-[180px] sm:max-w-none rounded-[16px] overflow-hidden bg-[var(--color-background-card)]">
                    <img
                      src={posterPreviewUrl}
                      alt="Promo poster preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPosterPreviewUrl(null);
                        setPosterBase64(null);
                      }}
                      aria-label="ลบรูปโปสเตอร์"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/65 text-white inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full min-h-[126px] rounded-[16px] border border-dashed border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)]/40 flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer transition-colors"
                  >
                    <span className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)]">
                      <Upload className="w-4 h-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      อัปโหลดรูปโปสเตอร์
                    </span>
                    <span className="text-[11.5px] text-[var(--color-text-secondary)]">
                      PNG, JPG, WebP (สูงสุด 6MB)
                    </span>
                  </button>
                )}
              </div>

              {/* Raw Text Input + Extract CTA */}
              <div className="sm:col-span-8 flex flex-col justify-between gap-3">
                <StandardTextarea
                  label="วางข้อความโปรโมชั่น / แคปชัน / ลิงก์"
                  optionalText="วางแล้วกดแกะได้เลย"
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="เช่น บัตรเครดิต KTC ลด 15% เมื่อจองโรงแรมผ่าน Agoda กรอกโค้ด KTC15 ถึง 31 ธ.ค. 2569 หรือ แคปชันโปรคาเฟ่..."
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {extractNotice?.matchedName ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      จับคู่กับแบรนด์เดิมในระบบ:{" "}
                      <strong>{extractNotice.matchedName}</strong>
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      AI จะจับคู่กับร้านเดิมและแปลง พ.ศ. → ค.ศ. ให้โดยอัตโนมัติ
                    </span>
                  )}

                  <StandardButton
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={isExtracting}
                    onClick={handleRunAiExtract}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังแกะข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>ให้ AI แกะข้อมูล</span>
                      </>
                    )}
                  </StandardButton>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2: Structured Form + Live 1:1 Card Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Structured Fields */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[14.5px] font-bold text-[var(--color-text-primary)]">
                  2. ตรวจสอบและแก้ไขข้อมูลโปรโมชั่น
                </p>
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  รองรับ 3 LocationScope
                </span>
              </div>

              <StandardSelectField
                label="เชื่อมกับแบรนด์ / สถานที่ในระบบ"
                optionalText="หรือสร้างใหม่"
                value={matchedHotelId}
                onChange={handleSelectHotel}
                options={hotelOptions}
                searchPlaceholder="ค้นหาชื่อร้าน / แบรนด์..."
              />

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="ชื่อแบรนด์ / ร้าน (ภาษาไทย)"
                    value={brandNameTh}
                    onChange={(e) => setBrandNameTh(e.target.value)}
                    placeholder="เช่น KTC, Café Amazon, ศาลาเขาใหญ่"
                  />
                  <StandardInput
                    grouped
                    label="ชื่อภาษาอังกฤษ"
                    optionalText="ช่วยสร้าง slug"
                    value={brandNameEn}
                    onChange={(e) => setBrandNameEn(e.target.value)}
                    placeholder="เช่น KTC Travel, Cafe Amazon"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardSelectField
                    grouped
                    label="หมวดโปรโมชั่น"
                    value={promoCategoryCode}
                    onChange={(v) =>
                      setPromoCategoryCode(
                        v as "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION"
                      )
                    }
                    options={PROMO_CATEGORY_OPTIONS}
                  />
                  <StandardSelectField
                    grouped
                    label="ขอบเขตพื้นที่ (LocationScope)"
                    value={locationScope}
                    onChange={(v) => {
                      const next = v as
                        | "SINGLE_LOCATION"
                        | "MULTI_BRANCH"
                        | "NATIONWIDE_ONLINE";
                      setLocationScope(next);
                      if (next === "NATIONWIDE_ONLINE") {
                        setProvinceId("nationwide");
                      }
                    }}
                    options={LOCATION_SCOPE_OPTIONS}
                  />
                </div>
                {locationScope !== "NATIONWIDE_ONLINE" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardSelectField
                      grouped
                      label="จังหวัดหลัก"
                      value={provinceId}
                      onChange={setProvinceId}
                      options={provinceOptions}
                      searchPlaceholder="ค้นหา 77 จังหวัด..."
                    />
                    <StandardInput
                      grouped
                      label="สรุปสาขาที่ร่วมรายการ"
                      optionalText={
                        locationScope === "MULTI_BRANCH" ? "แนะนำ" : "ไม่บังคับ"
                      }
                      value={branchSummaryTh}
                      onChange={(e) => setBranchSummaryTh(e.target.value)}
                      placeholder="เช่น ทุกสาขาทั่วไทย (ยกเว้นสนามบิน)"
                    />
                  </div>
                )}
              </StandardFieldGroup>

              <StandardFieldGroup>
                <StandardInput
                  grouped
                  label="ข้อความส่วนลดเด่นบนการ์ด (Headline สั้นคม)"
                  optionalText="สูงสุด 60 ตัวอักษร"
                  value={promoHeadlineTh}
                  onChange={(e) => setPromoHeadlineTh(e.target.value)}
                  placeholder="เช่น ลด 25% รวมอาหารเช้า หรือ 1 แถม 1 เครื่องดื่ม"
                />
                <StandardInput
                  grouped
                  label="ชื่อแคมเปญเต็ม"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                  placeholder="เช่น โปรรับลมหนาว จองตรงลดเพิ่ม 25% พร้อมอาหารเช้า"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="โค้ดส่วนลด"
                    optionalText="ถ้ามี"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="เช่น KTC15"
                  />
                  <StandardInput
                    grouped
                    label="ราคาเต็ม (บาท)"
                    inputMode="numeric"
                    value={originalPriceText}
                    onChange={(e) => setOriginalPriceText(e.target.value)}
                    placeholder="เช่น 4500"
                  />
                  <StandardInput
                    grouped
                    label="ราคาโปร (บาท)"
                    inputMode="numeric"
                    value={dealPriceText}
                    onChange={(e) => setDealPriceText(e.target.value)}
                    placeholder="เช่น 2990"
                  />
                </div>
                <StudioDateRangePicker
                  grouped
                  startDate={startsAt}
                  endDate={expiresAt}
                  startLabel="วันเริ่มโปรโมชั่น"
                  endLabel="วันหมดอายุโปรโมชั่น"
                  onChange={(nextStart, nextEnd) => {
                    setStartsAt(nextStart);
                    setExpiresAt(nextEnd);
                  }}
                />
              </StandardFieldGroup>

              <StandardInput
                label="ลิงก์ไปรับโปร / Affiliate URL (HTTPS)"
                optionalText="ไม่บังคับ"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />

              <StandardTextarea
                label="เงื่อนไขและรายละเอียดโปรโมชั่น"
                rows={3}
                value={descriptionTh}
                onChange={(e) => setDescriptionTh(e.target.value)}
                placeholder="เงื่อนไขการใช้สิทธิ์ วันเวลาที่ร่วมรายการ หรือหมายเหตุเพิ่มเติม..."
              />
            </div>

            {/* Right 5 Cols: Visual Mode & Live 1:1 Card Preview */}
            <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-4">
              <div className="rounded-[22px] bg-[var(--color-background-muted)] p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-[var(--color-text-primary)]">
                    ตัวอย่างการ์ด 1:1 บนหน้าแรก
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: activeCategoryMeta.crestBgHex }}
                  >
                    {activeCategoryMeta.shortLabelTh}
                  </span>
                </div>

                {/* Visual Mode Switch Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-background-card)]">
                  <button
                    type="button"
                    onClick={() => setVisualMode("BRANDED_CARD")}
                    className={`flex-1 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                      visualMode === "BRANDED_CARD"
                        ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    การ์ดแบรนด์อัตโนมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualMode("OFFICIAL_PHOTO")}
                    className={`flex-1 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                      visualMode === "OFFICIAL_PHOTO"
                        ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    รูป Official / URL
                  </button>
                </div>

                {visualMode === "OFFICIAL_PHOTO" && (
                  <StandardInput
                    label="URL รูปภาพ Official ของร้าน/โปร"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                )}

                {/* 1:1 Live Preview Surface */}
                <div className="aspect-square w-full rounded-[22px] overflow-hidden bg-[var(--color-background-card)] relative">
                  {visualMode === "BRANDED_CARD" ? (
                    <img
                      src={previewCardUrl}
                      alt="Branded Promo Card Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : coverImageUrl.trim() ? (
                    <img
                      src={coverImageUrl.trim()}
                      alt="Official Promo Photo Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center text-[var(--color-text-secondary)]">
                      <ImagePlus className="w-8 h-8 opacity-60" />
                      <p className="text-[13px] font-medium">
                        วาง URL รูป Official หรือสลับใช้การ์ดแบรนด์อัตโนมัติ
                      </p>
                    </div>
                  )}
                </div>

                {/* Below-photo clean 2-line preview */}
                <div className="px-1 space-y-0.5">
                  <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                    {brandNameTh.trim() || "ชื่อแบรนด์ / สถานที่"}
                  </p>
                  <p className="text-[13px] font-semibold text-[var(--color-accent)] truncate">
                    {promoHeadlineTh.trim() || "ข้อความโปรโมชั่นเด่น"}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                    {formatPromoDateRangeLabel(startsAt || null, expiresAt || null, "th")
                      ?.label || "กำหนดช่วงวันที่โปรโมชั่น"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background-popover)] flex flex-wrap items-center justify-between gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={resetForm}
            className="text-[13.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
          >
            ล้างฟอร์ม
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <StandardButton
              type="button"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
              onClick={() => handleSubmit("INBOX")}
            >
              เก็บเข้า Promo Inbox
            </StandardButton>
            <StandardButton
              type="button"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              onClick={() => handleSubmit("PUBLISH_NOW")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>เผยแพร่ขึ้นหน้าแรกทันที</span>
              )}
            </StandardButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
