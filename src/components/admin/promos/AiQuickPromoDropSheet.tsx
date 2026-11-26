"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { AdminSlideSheet } from "@/components/admin/ui/AdminSlideSheet";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
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

export interface EditablePromoTarget {
  targetType: "PIN" | "INBOX";
  id: string;
  matchedHotelId?: string | null;
  hotelSlug?: string | null;
  brandNameTh: string;
  titleTh: string;
  promoHeadlineTh: string;
  descriptionTh: string;
  promoCode: string;
  promoCategoryCode: "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION";
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh: string;
  provinceId: string;
  originalPriceThb?: number | null;
  dealPriceThb?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  externalUrl: string;
  coverImageUrl: string;
  visualMode: "OFFICIAL_PHOTO" | "BRANDED_CARD";
  isPublished: boolean;
}

interface AiQuickPromoDropSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: PromoTargetHotelOption[];
  editingTarget?: EditablePromoTarget | null;
  onSaved: (message: string, switchToView?: "active" | "inbox") => void;
}

type SheetTab = "info" | "schedule" | "media";

const LOCATION_SCOPE_OPTIONS = [
  { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว / 1 สาขา (ปักหมุดแผนที่)" },
  { value: "MULTI_BRANCH", label: "เชนหลายสาขา (Multi-Branch)" },
  { value: "NATIONWIDE_ONLINE", label: "ทั่วประเทศ / ออนไลน์ / บัตรเครดิต" },
];

const PROMO_CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก & โรงแรม" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "ร้านอาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา & เวลเนส" },
  { value: "ATTRACTION", label: "กิจกรรม & ที่เที่ยว" },
];

function toDateInput(val?: string | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * 1:1 WeGlobal `ProductFormSheet` Click-Row Slide-Over Editor for Promotions
 * - Supports BOTH Edit (click any table row) AND Create (`+` button / AI Quick Drop)
 * - Header: 44×44 thumbnail, title, Ready/Incomplete tooltip, Travel-Blue `Save`, `Actions ⌄` Portal dropdown, `X`
 * - Supports `Cmd+S / Ctrl+S` save, Publish/Unpublish toggle, Duplicate, View Public Page, and Delete
 */
export function AiQuickPromoDropSheet({
  isOpen,
  onClose,
  hotels,
  editingTarget = null,
  onSaved,
}: AiQuickPromoDropSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const actionsBtnRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<SheetTab>("info");
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Active target state (null = creating new; set = editing existing)
  const [currentTarget, setCurrentTarget] =
    useState<EditablePromoTarget | null>(null);

  // AI Input
  const [rawText, setRawText] = useState("");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [posterBase64, setPosterBase64] = useState<string | null>(null);
  const [posterMime, setPosterMime] = useState<string>("image/jpeg");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNotice, setExtractNotice] = useState<{
    usedAi: boolean;
    matchedName: string | null;
  } | null>(null);

  // Form Fields
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
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [visualMode, setVisualMode] = useState<
    "OFFICIAL_PHOTO" | "BRANDED_CARD"
  >("BRANDED_CARD");
  const [isPublished, setIsPublished] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate form whenever sheet opens or editingTarget changes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("info");
    setIsActionsOpen(false);
    setErrorMsg(null);
    setExtractNotice(null);
    setRawText("");
    setPosterPreviewUrl(null);
    setPosterBase64(null);

    if (editingTarget) {
      setCurrentTarget(editingTarget);
      setMatchedHotelId(editingTarget.matchedHotelId || "");
      setBrandNameTh(editingTarget.brandNameTh);
      setBrandNameEn("");
      setLocationScope(editingTarget.locationScope);
      setBranchSummaryTh(editingTarget.branchSummaryTh || "");
      setProvinceId(editingTarget.provinceId || "bangkok");
      setPromoCategoryCode(editingTarget.promoCategoryCode);
      setTitleTh(editingTarget.titleTh || "");
      setPromoHeadlineTh(editingTarget.promoHeadlineTh || "");
      setDescriptionTh(editingTarget.descriptionTh || "");
      setPromoCode(editingTarget.promoCode || "");
      setOriginalPriceText(
        editingTarget.originalPriceThb
          ? String(editingTarget.originalPriceThb)
          : "",
      );
      setDealPriceText(
        editingTarget.dealPriceThb ? String(editingTarget.dealPriceThb) : "",
      );
      setStartsAt(toDateInput(editingTarget.startsAt));
      setExpiresAt(toDateInput(editingTarget.expiresAt));
      setExternalUrl(editingTarget.externalUrl || "");
      setCoverImageUrl(editingTarget.coverImageUrl || "");
      setVisualMode(editingTarget.visualMode);
      setIsPublished(editingTarget.isPublished);
    } else {
      setCurrentTarget(null);
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
      setStartsAt(new Date().toISOString().slice(0, 10));
      setExpiresAt(
        new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      );
      setExternalUrl("");
      setCoverImageUrl("");
      setVisualMode("BRANDED_CARD");
      setIsPublished(true);
    }
  }, [isOpen, editingTarget]);

  // Close Actions dropdown on outside click
  useEffect(() => {
    if (!isActionsOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        actionsBtnRef.current &&
        !actionsBtnRef.current.contains(t) &&
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(t)
      ) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isActionsOpen]);

  // Ctrl+S / Cmd+S shortcut (matches WeGlobal ProductFormSheet)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!isSubmitting) {
          void handleSave(currentTarget ? "UPDATE" : "PUBLISH_NOW");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    isSubmitting,
    currentTarget,
    brandNameTh,
    promoHeadlineTh,
    titleTh,
    descriptionTh,
    promoCode,
    originalPriceText,
    dealPriceText,
    startsAt,
    expiresAt,
    externalUrl,
    coverImageUrl,
    visualMode,
    locationScope,
    branchSummaryTh,
    provinceId,
    promoCategoryCode,
    isPublished,
  ]);

  const provinceOptions = useMemo(
    () => [
      { value: "nationwide", label: "ทั่วประเทศ / ออนไลน์" },
      ...THAILAND_77_PROVINCES.map((p) => ({
        value: p.id,
        label: p.nameTh.split("(")[0].trim(),
        sublabel: p.nameEn,
      })),
    ],
    [],
  );

  const hotelOptions = useMemo(
    () => [
      { value: "", label: "สร้างแบรนด์ / สถานที่ใหม่อัตโนมัติ" },
      ...hotels.map((h) => ({
        value: h.id,
        label: h.nameTh,
        sublabel: `/${h.slug} · ${getPlaceCategoryMeta(h.placeCategory).shortLabelTh}`,
      })),
    ],
    [hotels],
  );

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
      setErrorMsg(
        "กรุณาวางข้อความโปรโมชั่น หรืออัปโหลดรูปโปสเตอร์ก่อนกดให้ AI แกะ",
      );
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
        data.originalPriceThb ? String(data.originalPriceThb) : "",
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
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างแกะข้อมูล",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (
    mode: "UPDATE" | "INBOX" | "PUBLISH_NOW",
    overridePublishStatus?: "PUBLISHED" | "PENDING_APPROVAL",
  ) => {
    if (!brandNameTh.trim() || !promoHeadlineTh.trim()) {
      setActiveTab("info");
      setErrorMsg("กรุณากรอกชื่อแบรนด์/ร้าน และหัวข้อส่วนลด (Headline) ให้ครบ");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const origNum = Number(originalPriceText.replace(/,/g, ""));
      const dealNum = Number(dealPriceText.replace(/,/g, ""));
      const cleanOrig =
        Number.isFinite(origNum) && origNum > 0 ? Math.round(origNum) : null;
      const cleanDeal =
        Number.isFinite(dealNum) && dealNum > 0 ? Math.round(dealNum) : null;

      if (currentTarget && mode === "UPDATE") {
        const res = await fetch("/api/admin/promos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: currentTarget.targetType,
            id: currentTarget.id,
            brandNameTh: brandNameTh.trim(),
            titleTh: (titleTh || promoHeadlineTh).trim(),
            promoHeadlineTh: promoHeadlineTh.trim(),
            descriptionTh: descriptionTh.trim(),
            promoCode: promoCode.trim().toUpperCase(),
            promoCategoryCode,
            locationScope,
            branchSummaryTh: branchSummaryTh.trim(),
            provinceId:
              locationScope === "NATIONWIDE_ONLINE" ? "nationwide" : provinceId,
            originalPriceThb: cleanOrig,
            dealPriceThb: cleanDeal,
            startsAt: startsAt || null,
            expiresAt: expiresAt || null,
            externalUrl: externalUrl.trim(),
            coverImageUrl: coverImageUrl.trim(),
            visualMode,
            ...(overridePublishStatus
              ? { publishStatus: overridePublishStatus }
              : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "บันทึกการแก้ไขไม่สำเร็จ");

        onSaved(
          overridePublishStatus === "PENDING_APPROVAL"
            ? `ซ่อนโปร "${promoHeadlineTh.trim()}" ออกจากหน้าแรกแล้ว`
            : overridePublishStatus === "PUBLISHED"
              ? `เผยแพร่โปร "${promoHeadlineTh.trim()}" แล้ว`
              : `บันทึกการแก้ไข "${promoHeadlineTh.trim()}" เรียบร้อย`,
        );
        onClose();
        return;
      }

      // Create new promo (or publish from Inbox)
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "INBOX" ? "INBOX" : "PUBLISH_NOW",
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
          originalPriceThb: cleanOrig,
          dealPriceThb: cleanDeal,
          startsAt: startsAt || null,
          expiresAt: expiresAt || null,
          externalUrl: externalUrl.trim(),
          coverImageUrl: coverImageUrl.trim(),
          visualMode,
          rawText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกโปรโมชั่นไม่สำเร็จ");

      onSaved(
        mode === "INBOX"
          ? `บันทึก "${promoHeadlineTh.trim()}" เข้า Promo Inbox แล้ว`
          : `เผยแพร่โปร "${promoHeadlineTh.trim()}" ขึ้นหน้าแรกแล้ว`,
        mode === "INBOX" ? "inbox" : "active",
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกโปรโมชั่นไม่สำเร็จ",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateInSheet = () => {
    setIsActionsOpen(false);
    setCurrentTarget(null);
    setPromoHeadlineTh((prev) =>
      prev.startsWith("Copy · ") ? prev : `Copy · ${prev}`,
    );
    setIsPublished(false);
  };

  const handleDeleteCurrent = async () => {
    if (!currentTarget) return;
    setIsActionsOpen(false);
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const body =
        currentTarget.targetType === "INBOX"
          ? { inboxId: currentTarget.id, action: "DELETE" }
          : { pinId: currentTarget.id, action: "DELETE" };
      const res = await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลบรายการไม่สำเร็จ");
      onSaved(`ลบโปร "${promoHeadlineTh || currentTarget.brandNameTh}" แล้ว`);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "ลบรายการไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      "th",
    );
    const dateInfo = formatPromoDateRangeLabel(
      startsAt || null,
      expiresAt || null,
      "th",
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

  const missingFields = useMemo(() => {
    const list: string[] = [];
    if (!brandNameTh.trim()) list.push("Brand / Place Name");
    if (!promoHeadlineTh.trim()) list.push("Promo Headline");
    return list;
  }, [brandNameTh, promoHeadlineTh]);

  const missingInfoCount = missingFields.length;
  const missingMediaCount =
    visualMode === "OFFICIAL_PHOTO" && !coverImageUrl.trim() ? 1 : 0;
  const isReady = missingInfoCount === 0;

  return (
    <AdminSlideSheet
      isOpen={isOpen}
      onClose={onClose}
      thumbnailUrl={
        visualMode === "OFFICIAL_PHOTO" && coverImageUrl
          ? coverImageUrl
          : posterPreviewUrl || previewCardUrl
      }
      title={
        currentTarget
          ? promoHeadlineTh.trim() || brandNameTh.trim() || "Edit Promotion"
          : brandNameTh.trim() || "New Promotion"
      }
      subtitle={
        brandNameTh.trim()
          ? `${brandNameTh.trim()} · ${currentTarget ? "แก้ไขโปรโมชั่น" : "ลงโปรโมชั่นใหม่"}`
          : "AI Quick Promo Drop · แกะโปสเตอร์หรือข้อความอัตโนมัติ"
      }
      headerAction={
        <div className="hidden sm:flex items-center gap-1.5 group relative">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isReady
                ? "bg-[var(--color-accent-yellow)] text-[#182334]"
                : "bg-red-50 text-red-600"
            }`}
          >
            {isReady ? "Ready" : "Incomplete"}
          </span>
          {!isReady && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-popover)] p-3 ws-caption opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              <div className="font-semibold text-red-600 mb-1 ws-badge">
                ข้อมูลที่ยังไม่ได้กรอก
              </div>
              {missingFields.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-1.5 ws-caption"
                >
                  <span className="text-red-400">✕</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
      footerAction={
        <div className="flex items-center justify-between gap-3">
          {/* Left: Actions Dropdown (opens upward cleanly above sticky footer) */}
          <div ref={actionsBtnRef} className="relative z-20">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsActionsOpen((v) => !v)}
              className="h-10 px-4 flex items-center gap-1 ws-body-strong bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Actions</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${
                  isActionsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isActionsOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={actionsMenuRef}
                  className="fixed w-52 bg-white border border-gray-200 rounded-2xl shadow-[var(--shadow-popover)] py-1.5 z-[110]"
                  style={{
                    bottom: actionsBtnRef.current
                      ? Math.max(
                          12,
                          window.innerHeight -
                            actionsBtnRef.current.getBoundingClientRect().top +
                            8,
                        )
                      : 72,
                    left: actionsBtnRef.current
                      ? Math.max(
                          12,
                          actionsBtnRef.current.getBoundingClientRect().left,
                        )
                      : 16,
                  }}
                >
                  {!currentTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        void handleSave("INBOX");
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Save size={15} className="text-gray-400" />
                      <span>Save to Inbox</span>
                    </button>
                  )}

                  {currentTarget?.targetType === "PIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        void handleSave(
                          "UPDATE",
                          isPublished ? "PENDING_APPROVAL" : "PUBLISHED",
                        );
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm cursor-pointer ${
                        isPublished
                          ? "text-orange-600 hover:bg-orange-50"
                          : "text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]"
                      }`}
                    >
                      {isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>
                        {isPublished ? "Unpublish & Save" : "Publish & Save"}
                      </span>
                    </button>
                  )}

                  {currentTarget?.targetType === "INBOX" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        void handleSave("PUBLISH_NOW");
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] cursor-pointer"
                    >
                      <Eye size={15} />
                      <span>Approve &amp; Publish Now</span>
                    </button>
                  )}

                  {currentTarget && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        type="button"
                        onClick={handleDuplicateInSheet}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <Copy size={15} className="text-gray-400" />
                        <span>Duplicate</span>
                      </button>

                      {currentTarget.hotelSlug && (
                        <a
                          href={`/${encodeURIComponent(currentTarget.hotelSlug)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setIsActionsOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ExternalLink size={15} className="text-gray-400" />
                          <span>View Public Page</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={handleDeleteCurrent}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>,
                document.body,
              )}
          </div>

          {/* Right: Cancel + Primary Travel-Blue Save/Publish Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                handleSave(currentTarget ? "UPDATE" : "PUBLISH_NOW")
              }
              title="Save (Ctrl+S / Cmd+S)"
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : currentTarget
                    ? "บันทึก"
                    : "เผยแพร่"}
              </span>
            </button>
          </div>
        </div>
      }
    >
      {/* ═══ STICKY TRAVEL-BLUE TABS BAR (Exact WeGlobal Geometry) ═══ */}
      <div className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shrink-0">
        <div className="flex w-full">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 cursor-pointer text-sm font-medium py-2.5 text-center transition-colors border-b-4 ${
              activeTab === "info"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Basic Info
            {missingInfoCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4 ws-badge bg-red-500 text-white rounded-full px-1">
                {missingInfoCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 cursor-pointer text-sm font-medium py-2.5 text-center transition-colors border-b-4 ${
              activeTab === "schedule"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Pricing &amp; Dates
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex-1 cursor-pointer text-sm font-medium py-2.5 text-center transition-colors border-b-4 ${
              activeTab === "media"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Media
            {missingMediaCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4 ws-badge bg-red-500 text-white rounded-full px-1">
                {missingMediaCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ SCROLLABLE FORM BODY ═══ */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {activeTab === "info" && (
          <>
            {/* AI Quick Extract Section (Shown when creating OR optionally re-parsing) */}
            {!currentTarget && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="ws-subtitle">AI แกะโปรโมชั่นอัตโนมัติ</h3>
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleRunAiExtract}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#182334] bg-[var(--color-accent-yellow)] hover:brightness-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Wand2 size={13} />
                    )}
                    <span>{isExtracting ? "Extracting..." : "AI Write"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <StandardTextarea
                      rows={3}
                      label="วางข้อความโปรโมชั่น / ข่าวสาร / ลิงก์"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="วางข้อความโปรโมชั่น โพสต์ Facebook หรืออีเมลข่าวสาร แล้วกด AI Write..."
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Poster Image (Optional)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePosterFileChange}
                      className="hidden"
                    />
                    {posterPreviewUrl ? (
                      <div className="relative h-[86px] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={posterPreviewUrl}
                          alt="Poster preview"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPosterPreviewUrl(null);
                            setPosterBase64(null);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-gray-600 hover:text-red-500 inline-flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-[86px] rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-500 flex flex-col items-center justify-center gap-1 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <Upload size={16} />
                        <span>Upload Poster</span>
                      </button>
                    )}
                  </div>
                </div>

                {extractNotice && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-xs font-medium">
                    <CheckCircle2 size={13} />
                    <span>
                      {extractNotice.usedAi ? "Gemini Vision" : "Smart Parser"}
                      {extractNotice.matchedName
                        ? ` · Matched: ${extractNotice.matchedName}`
                        : " · Ready as new brand"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              className={`${!currentTarget ? "border-t border-gray-100 pt-5" : ""} space-y-4`}
            >
              <h3 className="ws-subtitle">ข้อมูลพื้นฐาน</h3>

              <StandardFieldGroup>
                <StandardInput
                  grouped
                  label="พาดหัวส่วนลดเด่น (Promo Headline) *"
                  value={promoHeadlineTh}
                  onChange={(e) => setPromoHeadlineTh(e.target.value)}
                  placeholder="เช่น ลด 30% ห้อง Sea View · ซื้อ 1 แถม 1"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="ชื่อแบรนด์ / สถานที่ (ไทย) *"
                    value={brandNameTh}
                    disabled={currentTarget?.targetType === "PIN"}
                    onChange={(e) => setBrandNameTh(e.target.value)}
                    placeholder="เช่น Café Amazon, KTC, Centara"
                  />

                  {!currentTarget ? (
                    <StandardSelectField
                      grouped
                      label="เชื่อมกับสถานที่ / แบรนด์ที่มีอยู่"
                      value={matchedHotelId}
                      onChange={handleSelectHotel}
                      options={hotelOptions}
                      sheetTitle="เลือกสถานที่ / แบรนด์"
                    />
                  ) : (
                    <StandardSelectField
                      grouped
                      label="หมวดหมู่ *"
                      value={promoCategoryCode}
                      onChange={(v) =>
                        setPromoCategoryCode(
                          v as
                            | "STAY"
                            | "CAFE"
                            | "RESTAURANT"
                            | "WELLNESS"
                            | "ATTRACTION",
                        )
                      }
                      options={PROMO_CATEGORY_OPTIONS}
                      sheetTitle="เลือกหมวดหมู่"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  {!currentTarget && (
                    <StandardSelectField
                      grouped
                      label="หมวดหมู่ *"
                      value={promoCategoryCode}
                      onChange={(v) =>
                        setPromoCategoryCode(
                          v as
                            | "STAY"
                            | "CAFE"
                            | "RESTAURANT"
                            | "WELLNESS"
                            | "ATTRACTION",
                        )
                      }
                      options={PROMO_CATEGORY_OPTIONS}
                      sheetTitle="เลือกหมวดหมู่"
                    />
                  )}

                  <StandardSelectField
                    grouped
                    label="ขอบเขตพื้นที่ให้บริการ"
                    value={locationScope}
                    onChange={(v) =>
                      setLocationScope(
                        v as
                          | "SINGLE_LOCATION"
                          | "MULTI_BRANCH"
                          | "NATIONWIDE_ONLINE",
                      )
                    }
                    options={LOCATION_SCOPE_OPTIONS}
                    sheetTitle="ขอบเขตพื้นที่ให้บริการ"
                  />

                  {currentTarget && locationScope !== "NATIONWIDE_ONLINE" && (
                    <StandardSelectField
                      grouped
                      label="จังหวัด"
                      value={provinceId}
                      onChange={setProvinceId}
                      options={provinceOptions}
                      sheetTitle="เลือกจังหวัด"
                    />
                  )}
                </div>

                {!currentTarget && locationScope !== "NATIONWIDE_ONLINE" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                    <StandardSelectField
                      grouped
                      label="จังหวัด"
                      value={provinceId}
                      onChange={setProvinceId}
                      options={provinceOptions}
                      sheetTitle="เลือกจังหวัด"
                    />
                    <StandardInput
                      grouped
                      label="สรุปจำนวนสาขา"
                      optionalText="ไม่บังคับ"
                      value={branchSummaryTh}
                      onChange={(e) => setBranchSummaryTh(e.target.value)}
                      placeholder="เช่น ทุกสาขาในไทย, เฉพาะกรุงเทพฯ"
                    />
                  </div>
                )}

                <StandardInput
                  grouped
                  label="ชื่อโปรโมชั่นแบบเต็ม"
                  optionalText="หากว่างจะใช้พาดหัวเด่น"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                  placeholder="ชื่อโปรโมชั่นแบบเต็ม"
                />
              </StandardFieldGroup>

              <StandardTextarea
                rows={4}
                label="รายละเอียดและเงื่อนไขโปรโมชั่น"
                value={descriptionTh}
                onChange={(e) => setDescriptionTh(e.target.value)}
                placeholder="เงื่อนไขโปรโมชั่น วิธีรับสิทธิ์ และรายละเอียดเพิ่มเติม..."
              />
            </div>
          </>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-5">
            <h3 className="ws-subtitle">ราคา โค้ด และระยะเวลา</h3>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                <StandardInput
                  grouped
                  label="โค้ดส่วนลด"
                  optionalText="ไม่บังคับ"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="NONDII25"
                  className="uppercase"
                />
                <StandardInput
                  grouped
                  type="number"
                  min={0}
                  label="ราคาปกติ (บาท)"
                  prefixText="฿"
                  value={originalPriceText}
                  onChange={(e) => setOriginalPriceText(e.target.value)}
                  placeholder="3500"
                />
                <StandardInput
                  grouped
                  type="number"
                  min={0}
                  label="ราคาโปรโมชั่น (บาท)"
                  prefixText="฿"
                  value={dealPriceText}
                  onChange={(e) => setDealPriceText(e.target.value)}
                  placeholder="2490"
                />
              </div>
              <StandardInput
                grouped
                type="url"
                label="ลิงก์ดีล / เว็บไซต์ภายนอก"
                optionalText="ไม่บังคับ"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </StandardFieldGroup>

            <div className="space-y-1.5">
              <span className="ws-caption-medium block">ระยะเวลาโปรโมชั่น</span>
              <StudioDateRangePicker
                startDate={startsAt}
                endDate={expiresAt}
                onChange={(nextStart, nextEnd) => {
                  setStartsAt(nextStart);
                  setExpiresAt(nextEnd);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "media" && (
          <div className="space-y-5">
            <h3 className="ws-subtitle">รูปแบบการ์ดโปรโมชั่น</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVisualMode("BRANDED_CARD")}
                className={`h-9 px-4 rounded-full ws-badge border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  visualMode === "BRANDED_CARD"
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                    : "bg-[var(--color-background-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-background-muted)]"
                }`}
              >
                <Sparkles size={14} />
                <span>การ์ดโปรอัตโนมัติ (1:1)</span>
              </button>

              <button
                type="button"
                onClick={() => setVisualMode("OFFICIAL_PHOTO")}
                className={`h-9 px-4 rounded-full ws-badge border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  visualMode === "OFFICIAL_PHOTO"
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                    : "bg-[var(--color-background-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-background-muted)]"
                }`}
              >
                <ImagePlus size={14} />
                <span>ใช้ลิงก์รูปภาพทางการ</span>
              </button>
            </div>

            {visualMode === "OFFICIAL_PHOTO" && (
              <StandardInput
                type="url"
                label="ลิงก์รูปภาพหน้าปก (Cover Image URL)"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">
                Live 1:1 Card Preview
              </p>
              <div className="w-[260px] aspect-square rounded-[20px] overflow-hidden bg-[var(--color-background-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    visualMode === "OFFICIAL_PHOTO" && coverImageUrl.trim()
                      ? coverImageUrl.trim()
                      : previewCardUrl
                  }
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSlideSheet>
  );
}
