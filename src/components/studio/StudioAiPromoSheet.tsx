"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
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
  StandardTextarea,
} from "@/components/ui/standards";
import { uploadMediaFile } from "@/lib/slipScanner";
import type { PinFeedItemDto } from "@/types/cangaroom";
import type { StudioHotelRecord } from "@/components/studio/studioTypes";
import type { StudioExtractedPromoPayload } from "@/app/api/studio/promos/extract/route";

interface StudioAiPromoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: StudioHotelRecord;
  editingPin?: PinFeedItemDto | null;
  onSaved: (message: string) => void;
}

type SheetTab = "info" | "schedule" | "media";

function toDateInput(val?: string | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Merchant-Scoped WeGlobal Slide-Over Promo FormSheet (`max-w-4xl`)
 * - Click any row in `/studio` or `/studio/promos` to edit, OR open fresh for AI Quick Poster Drop
 * - Strictly scoped to the merchant's own business (`hotel.slug`)
 */
export function StudioAiPromoSheet({
  isOpen,
  onClose,
  hotel,
  editingPin = null,
  onSaved,
}: StudioAiPromoSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverUploadRef = useRef<HTMLInputElement | null>(null);
  const actionsBtnRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<SheetTab>("info");
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // AI Poster Drop state
  const [rawText, setRawText] = useState("");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [posterBase64, setPosterBase64] = useState<string | null>(null);
  const [posterMime, setPosterMime] = useState("image/jpeg");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);

  // Form fields
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
  >("OFFICIAL_PHOTO");
  const [isPublished, setIsPublished] = useState(true);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("info");
    setIsActionsOpen(false);
    setErrorMsg(null);
    setExtractNotice(null);
    setRawText("");
    setPosterPreviewUrl(null);
    setPosterBase64(null);

    if (editingPin) {
      setTitleTh(editingPin.titleTh || "");
      setPromoHeadlineTh(editingPin.promoHeadlineTh || "");
      setDescriptionTh(editingPin.descriptionTh || "");
      setPromoCode(editingPin.promoCode || "");
      setOriginalPriceText(
        editingPin.promoOriginalPriceThb
          ? String(editingPin.promoOriginalPriceThb)
          : "",
      );
      setDealPriceText(
        editingPin.promoDealPriceThb
          ? String(editingPin.promoDealPriceThb)
          : "",
      );
      setStartsAt(toDateInput(editingPin.promoStartsAt));
      setExpiresAt(toDateInput(editingPin.promoExpiresAt));
      setExternalUrl(editingPin.externalDealUrl || "");
      setCoverImageUrl(editingPin.coverImageUrl || "");
      setVisualMode(
        editingPin.visualMode === "BRANDED_CARD"
          ? "BRANDED_CARD"
          : "OFFICIAL_PHOTO",
      );
      setIsPublished(editingPin.publishStatus === "PUBLISHED");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const next30 = new Date(Date.now() + 30 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      setTitleTh("");
      setPromoHeadlineTh("");
      setDescriptionTh("");
      setPromoCode("");
      setOriginalPriceText("");
      setDealPriceText("");
      setStartsAt(today);
      setExpiresAt(next30);
      setExternalUrl(hotel.externalWebsiteUrl || "");
      setCoverImageUrl(hotel.coverImageUrl || "");
      setVisualMode(hotel.coverImageUrl ? "OFFICIAL_PHOTO" : "BRANDED_CARD");
      setIsPublished(true);
    }
  }, [isOpen, editingPin, hotel.coverImageUrl, hotel.externalWebsiteUrl]);

  // Close actions dropdown on outside click
  useEffect(() => {
    if (!isActionsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        actionsBtnRef.current &&
        !actionsBtnRef.current.contains(target) &&
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(target)
      ) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isActionsOpen]);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!titleTh.trim()) missing.push("ชื่อโปรโมชั่น");
    if (!promoHeadlineTh.trim()) missing.push("พาดหัวส่วนลด");
    return missing;
  }, [titleTh, promoHeadlineTh]);

  const isReady = missingFields.length === 0;

  const brandedPreviewUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("headline", promoHeadlineTh.trim() || "โปรโมชั่นพิเศษ");
    qs.set("brand", hotel.nameTh);
    qs.set("category", hotel.placeCategory || "STAY");
    qs.set("scope", hotel.branchSummaryTh || hotel.provinceId);
    if (promoCode.trim()) qs.set("code", promoCode.trim().toUpperCase());
    return `/api/og/promo-card?${qs.toString()}`;
  }, [
    promoHeadlineTh,
    hotel.nameTh,
    hotel.placeCategory,
    hotel.branchSummaryTh,
    hotel.provinceId,
    promoCode,
  ]);

  const effectiveThumb =
    visualMode === "BRANDED_CARD"
      ? brandedPreviewUrl
      : coverImageUrl.trim() || posterPreviewUrl || hotel.coverImageUrl || "";

  const handlePosterPicked = (file: File) => {
    setPosterMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPosterPreviewUrl(result);
      setPosterBase64(result);
    };
    reader.readAsDataURL(file);

    // Also upload directly so merchant can use the poster as the cover photo
    setIsUploadingCover(true);
    uploadMediaFile(file, "pins")
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          setCoverImageUrl(uploadedUrl);
          setVisualMode("OFFICIAL_PHOTO");
        }
      })
      .catch(() => {
        // non-blocking
      })
      .finally(() => setIsUploadingCover(false));
  };

  const handleUploadCoverOnly = async (file: File) => {
    setIsUploadingCover(true);
    setErrorMsg(null);
    try {
      const url = await uploadMediaFile(file, "pins");
      if (url) {
        setCoverImageUrl(url);
        setVisualMode("OFFICIAL_PHOTO");
      }
    } catch {
      setErrorMsg("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRunAiExtract = async () => {
    if (!rawText.trim() && !posterBase64) {
      setErrorMsg("กรุณาอัปโหลดรูปโปสเตอร์หรือวางข้อความโปรโมชั่นก่อนให้ AI แกะข้อมูล");
      return;
    }
    setIsExtracting(true);
    setErrorMsg(null);
    setExtractNotice(null);
    try {
      const res = await fetch("/api/studio/promos/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          rawText,
          imageBase64: posterBase64,
          imageMimeType: posterMime,
        }),
      });
      const json = (await res.json()) as {
        extracted?: StudioExtractedPromoPayload;
        error?: string;
      };
      if (!res.ok || !json.extracted) {
        setErrorMsg(json.error || "แกะข้อมูลไม่สำเร็จ");
        return;
      }
      const ex = json.extracted;
      setTitleTh(ex.titleTh || titleTh);
      setPromoHeadlineTh(ex.promoHeadlineTh || promoHeadlineTh);
      setDescriptionTh(ex.descriptionTh || descriptionTh);
      setPromoCode(ex.promoCode || "");
      setOriginalPriceText(
        ex.originalPriceThb ? String(ex.originalPriceThb) : "",
      );
      setDealPriceText(ex.dealPriceThb ? String(ex.dealPriceThb) : "");
      if (ex.startsAt) setStartsAt(ex.startsAt);
      if (ex.expiresAt) setExpiresAt(ex.expiresAt);
      if (ex.externalUrl) setExternalUrl(ex.externalUrl);
      setExtractNotice(
        ex.usedAi
          ? "AI แกะข้อมูลโปสเตอร์เรียบร้อย — ตรวจสอบแล้วกด Save เพื่อเผยแพร่ทันที"
          : "ดึงข้อมูลเบื้องต้นแล้ว — ตรวจสอบรายละเอียดก่อนกด Save",
      );
    } catch {
      setErrorMsg("เชื่อมต่อระบบ AI ไม่สำเร็จ");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!isReady) {
      setErrorMsg(`กรุณากรอกข้อมูลให้ครบ: ${missingFields.join(", ")}`);
      setActiveTab("info");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const origNum = originalPriceText.trim()
        ? Math.round(Number(originalPriceText.replace(/,/g, "")))
        : null;
      const dealNum = dealPriceText.trim()
        ? Math.round(Number(dealPriceText.replace(/,/g, "")))
        : null;

      const payload = {
        hotelSlug: hotel.slug,
        ...(editingPin ? { id: editingPin.id } : {}),
        titleTh: titleTh.trim(),
        promoHeadlineTh: promoHeadlineTh.trim(),
        descriptionTh: descriptionTh.trim(),
        promoCode: promoCode.trim().toUpperCase(),
        promoCategoryCode: hotel.placeCategory,
        originalPriceThb:
          origNum && Number.isFinite(origNum) && origNum > 0 ? origNum : null,
        dealPriceThb:
          dealNum && Number.isFinite(dealNum) && dealNum > 0 ? dealNum : null,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
        externalUrl: externalUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
        visualMode,
        publishStatus: isPublished ? "PUBLISHED" : "PENDING_APPROVAL",
      };

      const res = await fetch("/api/studio/promos", {
        method: editingPin ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "บันทึกโปรโมชั่นไม่สำเร็จ");
        return;
      }

      onSaved(
        editingPin
          ? "บันทึกการแก้ไขโปรโมชั่นแล้ว"
          : "เผยแพร่โปรโมชั่นลงหน้าร้านและฟีด Nondii แล้ว",
      );
      onClose();
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึกโปรโมชั่น");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cmd+S / Ctrl+S shortcut
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleQuickAction = async (
    action: "PUBLISH" | "UNPUBLISH" | "DELETE",
  ) => {
    if (!editingPin) return;
    setIsActionsOpen(false);
    if (action === "DELETE" && !window.confirm("ต้องการลบโปรโมชั่นนี้ใช่หรือไม่?")) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/studio/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          pinId: editingPin.id,
          action,
        }),
      });
      if (!res.ok) {
        setErrorMsg("ดำเนินการไม่สำเร็จ");
        return;
      }
      onSaved(
        action === "DELETE"
          ? "ลบโปรโมชั่นเรียบร้อยแล้ว"
          : action === "PUBLISH"
            ? "เผยแพร่โปรโมชั่นแล้ว"
            : "ซ่อนโปรโมชั่นเป็นฉบับร่างแล้ว",
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionsPos = (() => {
    if (!isActionsOpen || !actionsBtnRef.current) return null;
    const rect = actionsBtnRef.current.getBoundingClientRect();
    return {
      bottom: Math.max(12, window.innerHeight - rect.top + 8),
      left: Math.max(12, rect.left),
    };
  })();

  const headerStatusPill = (
    <span
      className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full ws-badge ${
        isReady
          ? "bg-[#edf5fd] text-[var(--color-accent)]"
          : "bg-[var(--color-accent-yellow)] text-[#182334]"
      }`}
      title={isReady ? "พร้อมเผยแพร่" : `ยังขาด: ${missingFields.join(", ")}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>{isReady ? "พร้อมเผยแพร่" : "ยังกรอกไม่ครบ"}</span>
    </span>
  );

  const footerAction = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {editingPin && (
          <div ref={actionsBtnRef} className="relative">
            <button
              type="button"
              onClick={() => setIsActionsOpen((p) => !p)}
              className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>จัดการ</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isActionsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isActionsOpen &&
              actionsPos &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={actionsMenuRef}
                  style={{ bottom: actionsPos.bottom, left: actionsPos.left }}
                  className="fixed z-[120] w-48 rounded-2xl bg-white shadow-[var(--shadow-popover)] border border-gray-100 py-1.5 text-xs font-medium text-gray-800"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void handleQuickAction(
                        isPublished ? "UNPUBLISH" : "PUBLISH",
                      )
                    }
                    className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                        <span>ซ่อนเป็นฉบับร่าง</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>เผยแพร่ทันที</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/${hotel.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsActionsOpen(false)}
                    className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                    <span>ดูหน้าร้านสาธารณะ</span>
                  </a>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => void handleQuickAction("DELETE")}
                    className="w-full px-3.5 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบโปรโมชั่น</span>
                  </button>
                </div>,
                document.body,
              )}
          </div>
        )}
      </div>

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
          onClick={() => void handleSave()}
          className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isPublished ? "บันทึก" : "บันทึกฉบับร่าง"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <AdminSlideSheet
      isOpen={isOpen}
      onClose={onClose}
      thumbnailUrl={effectiveThumb}
      title={
        editingPin
          ? titleTh || editingPin.titleTh || "แก้ไขโปรโมชั่น"
          : "ลงโปรโมชั่นใหม่"
      }
      subtitle={`${hotel.nameTh} · /${hotel.slug}`}
      headerAction={headerStatusPill}
      footerAction={footerAction}
    >
      {/* Sticky Tabs */}
      <div className="flex items-center gap-6 px-5 border-b border-gray-100 bg-white shrink-0">
        {(
          [
            { id: "info", label: "AI Drop & ข้อมูลโปร" },
            { id: "schedule", label: "ราคา & วันหมดเขต" },
            { id: "media", label: "รูปภาพ & การ์ด" },
          ] as Array<{ id: SheetTab; label: string }>
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-xs sm:text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
                active
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-white">
        {errorMsg && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}
        {extractNotice && (
          <div className="rounded-xl bg-[#edf5fd] px-4 py-3 text-xs font-semibold text-[var(--color-accent)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{extractNotice}</span>
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-6">
            {/* AI Quick Poster Drop Card */}
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] inline-flex items-center justify-center shrink-0">
                    <Wand2 className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="ws-body-strong">
                      AI Quick Poster Drop — แกะโปรจากรูปหรือข้อความใน 10 วิ
                    </p>
                    <p className="ws-caption">
                      อัปโหลดภาพโปสเตอร์หรือวางแคปชั่นจาก LINE / Facebook แล้วให้ AI กรอกฟอร์มให้ทันที
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => void handleRunAiExtract()}
                  className="h-9 px-4 rounded-full bg-[var(--color-accent-yellow)] hover:brightness-95 text-[#182334] ws-badge inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isExtracting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isExtracting ? "กำลังแกะโปร..." : "AI แกะโปรอัตโนมัติ"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 rounded-xl bg-white border border-dashed border-gray-300 hover:border-[var(--color-accent)] flex flex-col items-center justify-center gap-1.5 text-xs text-gray-500 overflow-hidden cursor-pointer transition-colors"
                >
                  {posterPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterPreviewUrl}
                      alt="Poster preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[var(--color-accent)]" />
                      <span className="font-medium">อัปโหลดโปสเตอร์</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePosterPicked(f);
                  }}
                />

                <StandardTextarea
                  rows={3}
                  label="วางข้อความโปรโมชั่นจากเพจร้าน"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="เช่น 'ลด 20% เครื่องดื่มทุกเมนู เพียงแจ้งโค้ด SUMMER20 ถึง 31 พ.ค. นี้'..."
                />
              </div>
            </div>

            {/* Core Promo Fields */}
            <div className="space-y-4">
              <p className="ws-subtitle">ข้อมูลโปรโมชั่น</p>

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="พาดหัวส่วนลดสั้น (โชว์เด่นบนการ์ด) *"
                    value={promoHeadlineTh}
                    onChange={(e) => setPromoHeadlineTh(e.target.value)}
                    placeholder="เช่น ลด 25% รวมอาหารเช้า, 1 แถม 1"
                  />
                  <StandardInput
                    grouped
                    label="โค้ดส่วนลด"
                    optionalText="ไม่บังคับ"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="เช่น NONDII20"
                    className="uppercase"
                  />
                </div>
                <StandardInput
                  grouped
                  label="ชื่อโปรโมชั่นเต็ม *"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                  placeholder={`เช่น โปรพิเศษวันธรรมดา ที่ ${hotel.nameTh}`}
                />
                <StandardInput
                  grouped
                  type="url"
                  label="ลิงก์รับสิทธิ์ / เว็บไซต์ภายนอก"
                  optionalText="ไม่บังคับ"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                />
              </StandardFieldGroup>

              <StandardTextarea
                rows={4}
                label="รายละเอียดและเงื่อนไขการใช้สิทธิ์"
                value={descriptionTh}
                onChange={(e) => setDescriptionTh(e.target.value)}
                placeholder="ระบุเงื่อนไข เช่น ใช้ได้วันจันทร์–พฤหัสบดี, แจ้งสิทธิ์หน้าร้านหรือจองผ่าน Nondii..."
              />

              {/* Publish Status Toggle */}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5">
                <div>
                  <p className="ws-subtitle">
                    เผยแพร่โปรโมชั่นบนหน้าร้านและฟีด Nondii
                  </p>
                  <p className="ws-caption mt-0.5">
                    ปิดไว้หากต้องการเก็บเป็นฉบับร่างก่อนเปิดใช้งานจริง
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublished}
                  onClick={() => setIsPublished((p) => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    isPublished ? "bg-[var(--color-accent)]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                      isPublished ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-5">
            <p className="ws-subtitle">ราคาและระยะเวลาโปรโมชั่น</p>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                <StandardInput
                  grouped
                  type="number"
                  min={0}
                  label="ราคาปกติ (บาท)"
                  optionalText="ไม่บังคับ"
                  prefixText="฿"
                  value={originalPriceText}
                  onChange={(e) => setOriginalPriceText(e.target.value)}
                  placeholder="เช่น 2500"
                />
                <StandardInput
                  grouped
                  type="number"
                  min={0}
                  label="ราคาโปรโมชั่น (บาท)"
                  optionalText="ไม่บังคับ"
                  prefixText="฿"
                  value={dealPriceText}
                  onChange={(e) => setDealPriceText(e.target.value)}
                  placeholder="เช่น 1890"
                />
              </div>
            </StandardFieldGroup>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">
                ระยะเวลาโปรโมชั่น (เริ่ม – หมดเขต)
              </label>
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
            <p className="ws-subtitle">รูปภาพและรูปแบบการ์ด</p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVisualMode("OFFICIAL_PHOTO")}
                className={`h-9 px-4 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  visualMode === "OFFICIAL_PHOTO"
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200/70"
                }`}
              >
                ใช้รูปถ่าย / โปสเตอร์ร้าน
              </button>
              <button
                type="button"
                onClick={() => setVisualMode("BRANDED_CARD")}
                className={`h-9 px-4 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  visualMode === "BRANDED_CARD"
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200/70"
                }`}
              >
                สร้างการ์ดโปรโมชั่นอัตโนมัติ (Branded Card)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5 items-start">
              <div className="aspect-square w-full max-w-[220px] rounded-[20px] overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                {effectiveThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectiveThumb}
                    alt="Promo card preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-8 h-8 text-gray-300" />
                )}
              </div>

              <div className="space-y-4">
                {visualMode === "OFFICIAL_PHOTO" ? (
                  <>
                    <StandardInput
                      type="url"
                      label="ลิงก์รูปภาพโปรโมชั่น"
                      optionalText="หรือกดอัปโหลดด้านล่าง"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      disabled={isUploadingCover}
                      onClick={() => coverUploadRef.current?.click()}
                      className="h-9 px-4 rounded-full bg-gray-100 hover:bg-gray-200/80 text-gray-800 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingCover ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isUploadingCover ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพใหม่"}
                      </span>
                    </button>
                    <input
                      ref={coverUploadRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadCoverOnly(f);
                      }}
                    />
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-gray-600 rounded-xl bg-gray-100 p-4">
                    ระบบจะสร้างการ์ดโปรโมชั่นสี่เหลี่ยมจัตุรัส (1:1) สะอาดตาให้อัตโนมัติจากพาดหัวส่วนลด โค้ด และชื่อร้าน{" "}
                    <strong className="text-gray-900">{hotel.nameTh}</strong>{" "}
                    เหมาะสำหรับโปรโค้ดส่วนลดหรือโปรข้อความที่ยังไม่มีภาพถ่าย
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSlideSheet>
  );
}
