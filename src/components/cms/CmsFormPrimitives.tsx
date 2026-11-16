"use client";

import React, { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  ImagePlus,
  Link2,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import {
  formatKilobytes,
  parseVideoSource,
  UploadMediaFolder,
  uploadOptimizedImage,
} from "@/lib/mediaUtils";

export const CMS_INPUT_CLASS =
  "h-10 w-full rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition";

export const CMS_TEXTAREA_CLASS =
  "w-full rounded-[12px] bg-[var(--color-background-muted)] p-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition";

/**
 * Thai-first single-line input with collapsible optional English field.
 */
export function ThaiFirstInput({
  label,
  valueTh,
  valueEn = "",
  onChangeTh,
  onChangeEn,
  placeholderTh,
  placeholderEn,
  required = false,
}: {
  label: string;
  valueTh: string;
  valueEn?: string;
  onChangeTh: (val: string) => void;
  onChangeEn?: (val: string) => void;
  placeholderTh?: string;
  placeholderEn?: string;
  required?: boolean;
}) {
  const [showEn, setShowEn] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="ty-body font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
        {onChangeEn && (
          <button
            type="button"
            onClick={() => setShowEn((prev) => !prev)}
            className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{showEn ? "ซ่อน EN" : "แปล EN (เสริม)"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showEn ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      <input
        type="text"
        required={required}
        value={valueTh}
        onChange={(event) => onChangeTh(event.target.value)}
        placeholder={placeholderTh}
        className={CMS_INPUT_CLASS}
      />

      {showEn && onChangeEn && (
        <input
          type="text"
          value={valueEn}
          onChange={(event) => onChangeEn(event.target.value)}
          placeholder={
            placeholderEn || "คำแปลภาษาอังกฤษ (เว้นว่างจะใช้ภาษาไทยแทนอัตโนมัติ)"
          }
          className={CMS_INPUT_CLASS}
        />
      )}
    </div>
  );
}

/**
 * Thai-first multi-line textarea with collapsible optional English field.
 */
export function ThaiFirstTextarea({
  label,
  valueTh,
  valueEn = "",
  onChangeTh,
  onChangeEn,
  rows = 3,
  placeholderTh,
  placeholderEn,
}: {
  label: string;
  valueTh: string;
  valueEn?: string;
  onChangeTh: (val: string) => void;
  onChangeEn?: (val: string) => void;
  rows?: number;
  placeholderTh?: string;
  placeholderEn?: string;
}) {
  const [showEn, setShowEn] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="ty-body font-semibold text-[var(--color-text-primary)]">
          {label}
        </label>
        {onChangeEn && (
          <button
            type="button"
            onClick={() => setShowEn((prev) => !prev)}
            className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{showEn ? "ซ่อน EN" : "แปล EN (เสริม)"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showEn ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      <textarea
        rows={rows}
        value={valueTh}
        onChange={(event) => onChangeTh(event.target.value)}
        placeholder={placeholderTh}
        className={CMS_TEXTAREA_CLASS}
      />

      {showEn && onChangeEn && (
        <textarea
          rows={rows}
          value={valueEn}
          onChange={(event) => onChangeEn(event.target.value)}
          placeholder={
            placeholderEn || "คำแปลภาษาอังกฤษ (เว้นว่างจะใช้ภาษาไทยแทนอัตโนมัติ)"
          }
          className={CMS_TEXTAREA_CLASS}
        />
      )}
    </div>
  );
}

/**
 * Compresses image to WebP (~150-250KB) in browser & uploads to Cloudinary
 * (with automatic local fallback on localhost), plus optional direct URL input.
 */
export function SmartImageUploader({
  label,
  imageUrl,
  onChangeUrl,
  folder,
  aspectClassName = "aspect-[16/9]",
  maxDimension = 1440,
}: {
  label: string;
  imageUrl: string;
  onChangeUrl: (nextUrl: string) => void;
  folder: UploadMediaFolder;
  aspectClassName?: string;
  maxDimension?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleSelectFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setErrorFeedback(null);
    setStatusFeedback(null);
    try {
      const result = await uploadOptimizedImage(file, folder, maxDimension);
      onChangeUrl(result.url);
      const sizeText = formatKilobytes(result.bytes);
      setStatusFeedback(
        `บีบอัด WebP สำเร็จ${sizeText ? ` (${sizeText})` : ""}`
      );
    } catch (err) {
      setErrorFeedback(
        err instanceof Error ? err.message : "อัปโหลดรูปภาพไม่สำเร็จ"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="ty-body font-semibold text-[var(--color-text-primary)]">
          {label}
        </span>

        <button
          type="button"
          onClick={() => setShowUrlField((prev) => !prev)}
          className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>{showUrlField ? "ซ่อนช่อง URL" : "วางลิงก์รูปแทน"}</span>
        </button>
      </div>

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative ${
          aspectClassName.includes("9/16")
            ? "w-[196px] sm:w-[220px] aspect-[9/16] mx-auto"
            : `w-full ${aspectClassName} max-h-[240px]`
        } rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[var(--color-text-secondary)]">
            <ImagePlus className="w-6 h-6 text-[var(--color-accent)]" />
            <span className="ty-caption font-semibold">
              แตะเพื่อเลือกรูปจากเครื่อง
            </span>
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md !text-white px-3.5 h-8 ty-caption font-semibold">
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบีบอัด WebP & อัปโหลด...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{imageUrl ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}</span>
              </>
            )}
          </span>

          {statusFeedback && !isUploading && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)] !text-[var(--color-on-success)] px-3 h-8 ty-caption font-bold shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{statusFeedback}</span>
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectFile}
          className="hidden"
        />
      </div>

      {errorFeedback && (
        <p className="ty-caption font-semibold text-[var(--color-error)]">
          {errorFeedback}
        </p>
      )}

      {showUrlField && (
        <input
          type="url"
          value={imageUrl}
          onChange={(event) => onChangeUrl(event.target.value)}
          placeholder="https://..."
          className={CMS_INPUT_CLASS}
        />
      )}
    </div>
  );
}

/**
 * Video link input supporting YouTube, YouTube Shorts, Facebook Reels/Video, or .mp4
 * with automatic YouTube cover thumbnail extraction.
 */
export function SmartVideoLinkInput({
  label,
  videoUrl,
  posterUrl,
  onChangeVideoUrl,
  onChangePosterUrl,
  posterFolder = "shorts",
  aspectRatio = "9/16",
}: {
  label: string;
  videoUrl: string;
  posterUrl: string;
  onChangeVideoUrl: (nextUrl: string) => void;
  onChangePosterUrl: (nextPosterUrl: string) => void;
  posterFolder?: UploadMediaFolder;
  aspectRatio?: "9/16" | "16/9";
}) {
  const parsed = parseVideoSource(videoUrl, { autoplay: false, muted: true });

  const handleVideoUrlChange = (rawNextUrl: string) => {
    onChangeVideoUrl(rawNextUrl);
    const nextParsed = parseVideoSource(rawNextUrl);
    if (nextParsed.autoPosterUrl) {
      onChangePosterUrl(nextParsed.autoPosterUrl);
    }
  };

  const providerLabel =
    parsed.provider === "youtube"
      ? parsed.isVerticalHint
        ? "YouTube Shorts (ดึงปกอัตโนมัติ)"
        : "YouTube Video (ดึงปกอัตโนมัติ)"
      : parsed.provider === "facebook"
      ? "Facebook Video / Reel"
      : videoUrl.trim()
      ? "ลิงก์ไฟล์วิดีโอ (.mp4)"
      : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="ty-body font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Video className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{label}</span>
          </label>
          {providerLabel && (
            <span className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-accent)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{providerLabel}</span>
            </span>
          )}
        </div>

        <input
          type="url"
          value={videoUrl}
          onChange={(event) => handleVideoUrlChange(event.target.value)}
          placeholder="วางลิงก์ YouTube Shorts, YouTube, Facebook Reel หรือ .mp4"
          className={CMS_INPUT_CLASS}
        />
        <p className="ty-caption">
          ฟรีพื้นที่ไม่จำกัด: วางลิงก์จาก YouTube Shorts หรือ Facebook ได้ทันที (ถ้าเป็น YouTube ระบบดึงรูปปกให้เองอัตโนมัติ)
        </p>
      </div>

      <SmartImageUploader
        label="รูปหน้าปกวิดีโอ (แสดงบนการ์ดก่อนกดเล่น)"
        imageUrl={posterUrl}
        onChangeUrl={onChangePosterUrl}
        folder={posterFolder}
        aspectClassName={
          aspectRatio === "9/16" ? "aspect-[9/16]" : "aspect-[16/9]"
        }
        maxDimension={1280}
      />
    </div>
  );
}

