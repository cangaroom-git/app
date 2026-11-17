"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Facebook,
  Heart,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardButton,
  StandardInput,
  StatusPill,
} from "@/components/ui/standards";
import type { PinCategoryDto, PinPublishStatusDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

const PIN_CATEGORY_OPTIONS: Array<{ value: PinCategoryDto; label: string }> = [
  { value: "ROOMS", label: "ห้องพัก & วิลล่า (Rooms)" },
  { value: "VIEWS", label: "วิว & บรรยากาศ (Views)" },
  { value: "VIDEOS", label: "คลิปสั้นแนะนำ (Videos)" },
  { value: "DINING", label: "อาหาร & คาเฟ่ (Dining)" },
  { value: "REVIEWS", label: "รีวิวจริง (Reviews)" },
];

const ASPECT_RATIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "aspect-[3/4]", label: "แนวตั้ง 3:4 (1080×1440 · แนะนำสูงสุดแบบ Pinterest)" },
  { value: "aspect-[4/5]", label: "แนวตั้ง 4:5 (1080×1350 · มาตรฐาน IG/FB)" },
  { value: "aspect-[2/3]", label: "แนวตั้งยาว 2:3 (1000×1500 · เต็มจอมือถือ)" },
  { value: "aspect-[9/16]", label: "วิดีโอแนวตั้ง 9:16 (1080×1920 · Reels/Shorts)" },
];

/**
 * Normalize external URL (Unsplash / Cloudinary) into 3:4 Vertical Portrait (1080x1440)
 */
function normalizeUrlToVerticalPortrait(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("images.unsplash.com/")) {
    try {
      const u = new URL(trimmed);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", "1080");
      u.searchParams.set("h", "1440");
      u.searchParams.set("q", "85");
      return u.toString();
    } catch {
      return trimmed;
    }
  }
  if (
    trimmed.includes("res.cloudinary.com/") &&
    trimmed.includes("/upload/") &&
    !trimmed.includes("c_fill")
  ) {
    return trimmed.replace(
      "/upload/",
      "/upload/c_fill,g_auto,w_1080,h_1440,q_auto,f_auto/"
    );
  }
  return trimmed;
}

/**
 * If a user selects a horizontal image file from their device, center-crop it to 3:4 Vertical Portrait (1080x1440)
 */
async function ensureVerticalImageFile(file: File): Promise<{
  file: File;
  wasAutoCropped: boolean;
}> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return { file, wasAutoCropped: false };
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Already vertical portrait (height > width * 1.08)
      if (h >= w * 1.08) {
        resolve({ file, wasAutoCropped: false });
        return;
      }
      // Horizontal or square -> center-crop to 3:4 vertical portrait
      const targetRatio = 3 / 4;
      let cropW = w;
      let cropH = h;
      if (w / h > targetRatio) {
        cropW = Math.round(h * targetRatio);
        cropH = h;
      } else {
        cropW = w;
        cropH = Math.round(w / targetRatio);
      }
      const startX = Math.max(0, Math.round((w - cropW) / 2));
      const startY = Math.max(0, Math.round((h - cropH) / 2));

      const outW = Math.min(1080, cropW);
      const outH = Math.round(outW / targetRatio);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ file, wasAutoCropped: false });
        return;
      }
      ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, wasAutoCropped: false });
            return;
          }
          const croppedFile = new File([blob], file.name, {
            type: "image/jpeg",
          });
          resolve({ file: croppedFile, wasAutoCropped: true });
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file, wasAutoCropped: false });
    };
    img.src = objectUrl;
  });
}

export function StudioPinsAndFacebookTab({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const existingFb = data.socialConnections.find(
    (c) => c.platform === "FACEBOOK"
  );

  // Facebook Auto-Sync state
  const [externalPageId, setExternalPageId] = useState(
    existingFb?.externalPageId || ""
  );
  const [externalPageName, setExternalPageName] = useState(
    existingFb?.externalPageName || data.hotel.nameTh
  );
  const [pageUrl, setPageUrl] = useState(
    existingFb?.pageUrl || data.hotel.facebookPageUrl || ""
  );
  const [graphAccessToken, setGraphAccessToken] = useState("");
  const [isSyncingFb, setIsSyncingFb] = useState(false);

  // Triage per-pin room assignment & busy tracking
  const [roomAssignmentByPinId, setRoomAssignmentByPinId] = useState<
    Record<string, string>
  >({});
  const [busyPinId, setBusyPinId] = useState<string | null>(null);
  const [showDiscarded, setShowDiscarded] = useState(false);

  // Manual Pin Upload state
  const [pinTitle, setPinTitle] = useState("");
  const [pinDesc, setPinDesc] = useState("");
  const [pinCategory, setPinCategory] = useState<PinCategoryDto>("VIEWS");
  const [pinRoomId, setPinRoomId] = useState("");
  const [pinAspectRatio, setPinAspectRatio] = useState("aspect-[3/4]");
  const [pinCoverUrl, setPinCoverUrl] = useState("");
  const [extraMediaUrls, setExtraMediaUrls] = useState<string[]>([]);
  const [newExtraUrlInput, setNewExtraUrlInput] = useState("");
  const [pinVideoUrl, setPinVideoUrl] = useState("");
  const [coverDimensions, setCoverDimensions] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCreatingPin, setIsCreatingPin] = useState(false);

  const pendingPins = data.pins.filter(
    (p) => p.publishStatus === "PENDING_APPROVAL"
  );
  const discardedPins = data.pins.filter(
    (p) => p.publishStatus === "DISCARDED"
  );
  const publishedPins = data.pins.filter(
    (p) => p.publishStatus === "PUBLISHED"
  );

  const handleFacebookSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalPageId.trim() || !externalPageName.trim()) {
      onNotify("กรุณาระบุ Page ID และชื่อเพจ Facebook ก่อนซิงก์");
      return;
    }

    setIsSyncingFb(true);
    try {
      const res = await fetch("/api/studio/facebook-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          externalPageId: externalPageId.trim(),
          externalPageName: externalPageName.trim(),
          pageUrl: pageUrl.trim() || undefined,
          graphAccessToken: graphAccessToken.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        syncedCount?: number;
        error?: string;
      };
      if (!res.ok) {
        onNotify(json.error || "ซิงก์โพสต์จาก Facebook ไม่สำเร็จ");
        return;
      }
      onNotify(
        `ซิงก์และคัดกรอง AI Smart Triage สำเร็จ ${json.syncedCount ?? 0} โพสต์`
      );
      await onReload();
    } finally {
      setIsSyncingFb(false);
    }
  };

  const handleTriageAction = async (
    pinId: string,
    publishStatus: PinPublishStatusDto,
    explicitRoomId?: string | null
  ) => {
    setBusyPinId(pinId);
    try {
      const chosenRoomId =
        explicitRoomId !== undefined
          ? explicitRoomId
          : roomAssignmentByPinId[pinId];

      const res = await fetch("/api/studio/pins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          pinId,
          publishStatus,
          ...(chosenRoomId !== undefined
            ? { roomId: chosenRoomId || null }
            : {}),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "อัปเดตสถานะ Pin ไม่สำเร็จ");
        return;
      }
      onNotify(
        publishStatus === "PUBLISHED"
          ? "อนุมัติ Pin ขึ้นหน้าฟีด Cangaroom แล้ว"
          : "ย้ายโพสต์ไปเก็บในรายการคัดออกแล้ว"
      );
      await onReload();
    } finally {
      setBusyPinId(null);
    }
  };

  const handleUploadPinCover = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setIsUploadingCover(true);
    try {
      const uploadedUrls: string[] = [];
      let autoCroppedCount = 0;
      for (const rawFile of files) {
        const { file, wasAutoCropped } = await ensureVerticalImageFile(rawFile);
        if (wasAutoCropped) autoCroppedCount += 1;
        const url = await uploadMediaFile(file, "pins");
        uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        if (!pinCoverUrl) {
          setPinCoverUrl(uploadedUrls[0]);
          if (uploadedUrls.length > 1) {
            setExtraMediaUrls((prev) => [...prev, ...uploadedUrls.slice(1)]);
          }
        } else {
          setExtraMediaUrls((prev) => [...prev, ...uploadedUrls]);
        }
      }
      onNotify(
        autoCroppedCount > 0
          ? `อัปโหลดและครอปเป็นภาพแนวตั้ง 3:4 อัตโนมัติสำเร็จ (${uploadedUrls.length} รูป)`
          : `อัปโหลดรูปภาพแนวตั้งสำหรับ Pin สำเร็จ (${uploadedUrls.length} รูป)`
      );
    } catch {
      onNotify("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCreateManualPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTitle.trim() || !pinCoverUrl.trim()) {
      onNotify("กรุณากรอกชื่อ Pin และอัปโหลดรูปภาพหน้าปกก่อนเผยแพร่");
      return;
    }

    const normalizedCover = normalizeUrlToVerticalPortrait(pinCoverUrl);
    const normalizedGallery = [
      normalizedCover,
      ...extraMediaUrls.map(normalizeUrlToVerticalPortrait),
    ];

    setIsCreatingPin(true);
    try {
      const res = await fetch("/api/studio/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          roomId: pinRoomId || null,
          category: pinCategory,
          titleTh: pinTitle.trim(),
          descriptionTh: pinDesc.trim(),
          coverImageUrl: normalizedCover,
          mediaUrls: normalizedGallery,
          videoUrl: pinVideoUrl.trim() || null,
          aspectRatio: pinAspectRatio,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "สร้าง Pin ใหม่ไม่สำเร็จ");
        return;
      }
      setPinTitle("");
      setPinDesc("");
      setPinRoomId("");
      setPinCoverUrl("");
      setExtraMediaUrls([]);
      setNewExtraUrlInput("");
      setPinVideoUrl("");
      setCoverDimensions(null);
      onNotify("เผยแพร่ Pin แนวตั้งขึ้นหน้าฟีดทันทีแล้ว");
      await onReload();
    } finally {
      setIsCreatingPin(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Facebook Page Auto-Sync Connection & Trigger */}
      <section className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="ty-title flex items-center gap-2">
              <Facebook className="w-5 h-5 text-[#1877f2]" />
              <span>Facebook Page Auto-Sync + AI 3-Tier Smart Triage</span>
            </h2>
            <p className="ty-caption">
              ดึงโพสต์รูปและวิดีโอล่าสุดจากเพจ Facebook ของคุณมาคัดกรองอัตโนมัติ:
              AI จะคัดข่าว/มุกตลกทิ้งทันที (Tier 3) และพักรูปที่พักสวยๆ ไว้รอคุณกดยืนยัน 1 คลิก
            </p>
          </div>
          {existingFb ? (
            <StatusPill variant="accent">
              ซิงก์ล่าสุด:{" "}
              {existingFb.lastSyncedAt
                ? new Date(existingFb.lastSyncedAt).toLocaleString("th-TH")
                : "เชื่อมต่อแล้ว"}
            </StatusPill>
          ) : (
            <StatusPill variant="neutral">ยังไม่เคยซิงก์</StatusPill>
          )}
        </div>

        <form onSubmit={handleFacebookSync} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StandardInput
              label="Facebook Page ID *"
              placeholder="เช่น 104592837461"
              value={externalPageId}
              onChange={(e) => setExternalPageId(e.target.value)}
              required
            />
            <StandardInput
              label="ชื่อเพจ Facebook *"
              placeholder="เช่น Sapan Unseen Resort"
              value={externalPageName}
              onChange={(e) => setExternalPageName(e.target.value)}
              required
            />
            <StandardInput
              label="ลิงก์เพจ Facebook"
              placeholder="https://facebook.com/yourpage"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
            />
            <StandardInput
              label="Page Access Token"
              optionalText="ไม่บังคับ"
              type="password"
              placeholder="วาง Token หรือเว้นว่างเพื่อซิงก์ตัวอย่าง"
              value={graphAccessToken}
              onChange={(e) => setGraphAccessToken(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="ty-caption">
              โหมดความปลอดภัย:{" "}
              <span className="font-semibold">1-Click Approve</span> —
              ไม่มีโพสต์ไร้สาระหลุดขึ้นหน้าเว็บอัตโนมัติแน่นอน
            </p>
            <StandardButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSyncingFb}
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncingFb ? "animate-spin" : ""}`}
              />
              <span>
                {isSyncingFb
                  ? "กำลังซิงก์และคัดกรอง AI..."
                  : "ซิงก์โพสต์ล่าสุดจากเพจ Facebook"}
              </span>
            </StandardButton>
          </div>
        </form>
      </section>

      {/* 2. AI Smart Triage 1-Click Approval Queue */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="ty-title flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            <span>รายการรอยืนยัน 1-Click Approve ({pendingPins.length})</span>
          </h2>
          {pendingPins.length > 0 && (
            <StatusPill variant="promo">รอเจ้าของตรวจสอบ</StatusPill>
          )}
        </div>

        {pendingPins.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-6 text-center ty-body">
            ไม่มีโพสต์รอตรวจสอบในคิว — กดซิงก์โพสต์ล่าสุดจากเพจ Facebook เพื่อดึงรูปใหม่เข้าระบบได้เลย
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPins.map((pin) => {
              const selectedRoomId =
                roomAssignmentByPinId[pin.id] ?? pin.roomId ?? "";
              const scorePct =
                pin.aiConfidenceScore !== null
                  ? Math.round(
                      pin.aiConfidenceScore <= 1
                        ? pin.aiConfidenceScore * 100
                        : pin.aiConfidenceScore
                    )
                  : null;

              return (
                <div
                  key={pin.id}
                  className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row gap-4"
                >
                  <img
                    src={pin.coverImageUrl}
                    alt={pin.titleTh}
                    className="w-full sm:w-32 h-40 sm:h-auto rounded-[14px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill variant="accent">
                          {pin.sourcePlatform}
                        </StatusPill>
                        {scorePct !== null && (
                          <StatusPill variant="success">
                            AI มั่นใจ {scorePct}%
                          </StatusPill>
                        )}
                      </div>
                      <h3 className="ty-body font-bold line-clamp-2">
                        {pin.titleTh}
                      </h3>
                      {pin.descriptionTh && (
                        <p className="ty-caption line-clamp-3">
                          {pin.descriptionTh}
                        </p>
                      )}
                      {pin.aiTriageNote && (
                        <p className="ty-caption rounded-[10px] bg-[var(--color-background-muted)] px-2.5 py-1.5">
                          <span className="font-semibold">AI Note: </span>
                          {pin.aiTriageNote}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="ty-caption font-semibold block mb-1">
                          ผูกเข้ากับห้องพัก (ลิงก์จองตรงจาก Pin นี้):
                        </label>
                        <select
                          className="fw-input w-full text-sm"
                          value={selectedRoomId}
                          onChange={(e) =>
                            setRoomAssignmentByPinId((prev) => ({
                              ...prev,
                              [pin.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">ไม่ระบุห้อง (ภาพบรรยากาศรวม)</option>
                          {data.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nameTh} ({r.code}) — ฿
                              {r.weekdayPriceThb.toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StandardButton
                          variant="primary"
                          size="sm"
                          disabled={busyPinId === pin.id}
                          onClick={() =>
                            handleTriageAction(pin.id, "PUBLISHED")
                          }
                        >
                          <Check className="w-4 h-4" />
                          <span>อนุมัติขึ้นเว็บ</span>
                        </StandardButton>
                        <StandardButton
                          variant="secondary"
                          size="sm"
                          disabled={busyPinId === pin.id}
                          onClick={() =>
                            handleTriageAction(pin.id, "DISCARDED")
                          }
                        >
                          <X className="w-4 h-4" />
                          <span>ไม่นำขึ้น</span>
                        </StandardButton>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Tier-3 AI-Auto-Discarded Posts */}
        {discardedPins.length > 0 && (
          <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-background-card)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDiscarded((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--color-background-muted)] transition-colors"
            >
              <span className="ty-body font-semibold flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                  โพสต์ที่ AI คัดออกอัตโนมัติ (Tier 3) หรือซ่อนไว้ (
                  {discardedPins.length})
                </span>
              </span>
              {showDiscarded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDiscarded && (
              <div className="border-t border-[var(--color-border)] p-4 space-y-2.5">
                {discardedPins.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] bg-[var(--color-background-muted)] p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={pin.coverImageUrl}
                        alt={pin.titleTh}
                        className="w-14 h-14 rounded-[10px] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="ty-body font-semibold truncate">
                          {pin.titleTh}
                        </p>
                        <p className="ty-caption truncate">
                          {pin.aiTriageNote || "ถูกคัดออกโดย AI / เจ้าของที่พัก"}
                        </p>
                      </div>
                    </div>
                    <StandardButton
                      variant="secondary"
                      size="sm"
                      disabled={busyPinId === pin.id}
                      onClick={() => handleTriageAction(pin.id, "PUBLISHED")}
                    >
                      <Check className="w-4 h-4" />
                      <span>กู้คืนขึ้นเว็บ</span>
                    </StandardButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Manual Pin Upload Card */}
      <form
        onSubmit={handleCreateManualPin}
        className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4"
      >
        <h2 className="ty-title flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-[var(--color-promo)]" />
          <span>อัปโหลด Pin ใหม่ด้วยตัวเอง (เผยแพร่ทันที)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <StandardInput
              label="หัวข้อ Pin *"
              placeholder="เช่น สระน้ำริมหน้าผายามพระอาทิตย์ตก"
              value={pinTitle}
              onChange={(e) => setPinTitle(e.target.value)}
              required
            />

            <div>
              <label className="ty-caption font-semibold block mb-1">
                คำบรรยายสำหรับนักเดินทาง & AI Search
              </label>
              <textarea
                rows={3}
                className="fw-input w-full"
                placeholder="เล่ารายละเอียดมุมถ่ายรูป ไฮไลต์ห้องพัก หรือช่วงเวลาที่สวยที่สุด..."
                value={pinDesc}
                onChange={(e) => setPinDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ty-caption font-semibold block mb-1">
                  หมวดหมู่ Pin
                </label>
                <select
                  className="fw-input w-full"
                  value={pinCategory}
                  onChange={(e) =>
                    setPinCategory(e.target.value as PinCategoryDto)
                  }
                >
                  {PIN_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ty-caption font-semibold block mb-1">
                  สัดส่วนภาพบน Grid
                </label>
                <select
                  className="fw-input w-full"
                  value={pinAspectRatio}
                  onChange={(e) => setPinAspectRatio(e.target.value)}
                >
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="ty-caption font-semibold block mb-1">
                เชื่อมกับห้องพัก (ถ้ามี)
              </label>
              <select
                className="fw-input w-full"
                value={pinRoomId}
                onChange={(e) => setPinRoomId(e.target.value)}
              >
                <option value="">ไม่ระบุห้องเฉพาะ</option>
                {data.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameTh} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {/* Vertical Media Standard Banner */}
            <div className="rounded-[14px] bg-[var(--color-background-muted)] p-3 space-y-1">
              <p className="text-[13px] font-bold text-[var(--color-text-primary)]">
                มาตรฐานภาพแนวตั้ง Cangaroom (3:4 หรือ 4:5 แบบ Pinterest)
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                แนะนำใช้ภาพหรือวิดีโอแนวตั้ง (เช่น <strong>1080×1440 px</strong>) เพื่อให้แสดงผลเต็มกรอบแบบไม่มีขอบว่าง หากอัปโหลดไฟล์ภาพแนวนอน ระบบจะช่วยครอปเป็นแนวตั้ง 3:4 ให้อัตโนมัติครับ
              </p>
            </div>

            <div>
              <span className="ty-body font-semibold block mb-1.5">
                รูปภาพหน้าปก & อัลบั้มแนวตั้ง (เลือกได้หลายรูป) *
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-fw-secondary cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploadingCover
                      ? "กำลังอัปโหลด & ปรับแนวตั้ง..."
                      : "เลือกไฟล์รูป (1 หรือหลายรูป)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleUploadPinCover}
                  />
                </label>
                <input
                  type="url"
                  className="fw-input flex-1 min-w-[180px]"
                  placeholder="หรือวาง URL รูปภาพหลัก"
                  value={pinCoverUrl}
                  onChange={(e) => {
                    setPinCoverUrl(e.target.value);
                    setCoverDimensions(null);
                  }}
                />
              </div>
            </div>

            {/* Additional Album Photos Input */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                className="fw-input flex-1"
                placeholder="เพิ่ม URL รูปที่ 2, 3, 4 ในอัลบั้มเดียวกัน..."
                value={newExtraUrlInput}
                onChange={(e) => setNewExtraUrlInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const norm = normalizeUrlToVerticalPortrait(newExtraUrlInput);
                  if (!norm) return;
                  if (!pinCoverUrl) {
                    setPinCoverUrl(norm);
                  } else {
                    setExtraMediaUrls((prev) => [...prev, norm]);
                  }
                  setNewExtraUrlInput("");
                }}
                className="h-10 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] shrink-0 cursor-pointer"
              >
                + เพิ่มรูปในชุด
              </button>
            </div>

            {pinCoverUrl && (
              <div className="flex flex-wrap items-start gap-3 pt-1">
                {/* Live Vertical 3:4 Pinterest Frame Preview */}
                <div className="w-36 aspect-[3/4] rounded-[14px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-background-muted)] shrink-0 relative">
                  <img
                    src={pinCoverUrl}
                    alt="ตัวอย่างภาพ Pin แนวตั้ง"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setCoverDimensions({
                          w: img.naturalWidth,
                          h: img.naturalHeight,
                        });
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-[6px] bg-black/65 text-white text-[10px] font-bold">
                    Preview 3:4
                  </span>
                </div>

                <div className="flex-1 min-w-[180px] space-y-2">
                  {coverDimensions &&
                    coverDimensions.w >= coverDimensions.h && (
                      <div className="rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] p-2.5 space-y-1.5">
                        <p className="text-[12px] font-bold text-[var(--color-text-primary)]">
                          ตรวจพบภาพแนวนอน ({coverDimensions.w}×{coverDimensions.h} px)
                        </p>
                        <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                          แนะนำให้แปลงเป็นสัดส่วนแนวตั้ง 3:4 เพื่อแสดงเต็มหน้าจอแบบ Pinterest
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPinCoverUrl((prev) =>
                              normalizeUrlToVerticalPortrait(prev)
                            );
                            setCoverDimensions({ w: 1080, h: 1440 });
                          }}
                          className="h-8 px-3 rounded-[9px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[12px] font-semibold cursor-pointer"
                        >
                          ปรับเป็นแนวตั้ง 3:4 อัตโนมัติ
                        </button>
                      </div>
                    )}

                  {extraMediaUrls.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                        รูปในอัลบั้ม ({extraMediaUrls.length + 1} รูป):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {extraMediaUrls.map((u, idx) => (
                          <div
                            key={`${u}-${idx}`}
                            className="relative h-12 w-12 rounded-[10px] overflow-hidden border border-[var(--color-border)]"
                          >
                            <img
                              src={u}
                              alt={`Slide ${idx + 2}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExtraMediaUrls((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="absolute top-0.5 right-0.5 h-4 w-4 rounded-[4px] bg-black/70 text-white flex items-center justify-center text-[10px] cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <StandardInput
              label="ลิงก์วิดีโอแนวตั้ง MP4 / Short (9:16 หรือ 3:4)"
              optionalText="ไม่บังคับ"
              placeholder="https://.../tour.mp4"
              value={pinVideoUrl}
              onChange={(e) => setPinVideoUrl(e.target.value)}
            />

            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="ty-caption inline-flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                <span>ถ้าใส่ URL วิดีโอ ระบบจะแสดงเป็น Video Pin แนวตั้ง</span>
              </span>
              <StandardButton
                type="submit"
                variant="promo"
                size="md"
                disabled={isCreatingPin || isUploadingCover}
              >
                <ImagePlus className="w-4 h-4" />
                <span>
                  {isCreatingPin ? "กำลังเผยแพร่..." : "เผยแพร่ Pin ขึ้นฟีด"}
                </span>
              </StandardButton>
            </div>
          </div>
        </div>
      </form>

      {/* 4. Live Published Pins Overview */}
      <section className="space-y-3">
        <h2 className="ty-title">
          Pin ที่เผยแพร่อยู่บนหน้าฟีด ({publishedPins.length})
        </h2>

        {publishedPins.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-6 text-center ty-body">
            ยังไม่มี Pin ที่เผยแพร่ — อัปโหลดรูปใหม่ด้านบน หรืออนุมัติจาก Facebook Sync ได้เลย
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedPins.map((pin) => (
              <div
                key={pin.id}
                className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col"
              >
                <div className="relative h-48 bg-[var(--color-background-muted)]">
                  <img
                    src={pin.coverImageUrl}
                    alt={pin.titleTh}
                    className="w-full h-full object-cover"
                  />
                  {pin.isSponsored && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[var(--color-promo)] text-white text-[11px] font-bold">
                      Sponsored Pin
                    </span>
                  )}
                </div>
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill variant="neutral">{pin.category}</StatusPill>
                      {pin.roomNameTh && (
                        <span className="ty-caption truncate">
                          ห้อง: {pin.roomNameTh}
                        </span>
                      )}
                    </div>
                    <h3 className="ty-body font-bold line-clamp-2">
                      {pin.titleTh}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] ty-caption">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-[var(--color-promo)]" />
                        {pin.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        {pin.savesCount}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busyPinId === pin.id}
                      onClick={() =>
                        handleTriageAction(pin.id, "DISCARDED", pin.roomId)
                      }
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] font-medium transition-colors"
                    >
                      ซ่อน Pin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
