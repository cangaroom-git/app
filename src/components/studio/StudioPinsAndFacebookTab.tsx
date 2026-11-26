"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Heart,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { uploadMediaFile } from "@/lib/slipScanner";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
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
  { value: "aspect-[3/4]", label: "แนวตั้ง 3:4 (1080×1440 · แนะนำสูงสุด)" },
  { value: "aspect-[4/5]", label: "แนวตั้ง 4:5 (1080×1350 · มาตรฐาน IG/FB)" },
  { value: "aspect-[2/3]", label: "แนวตั้งยาว 2:3 (1000×1500)" },
  { value: "aspect-[9/16]", label: "วิดีโอแนวตั้ง 9:16 (Reels/Shorts)" },
];

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
      if (h >= w * 1.08) {
        resolve({ file, wasAutoCropped: false });
        return;
      }
      const targetRatio = 3 / 4;
      let cropW = w;
      let cropH = h;
      if (w / h > targetRatio) {
        cropW = Math.round(h * targetRatio);
      } else {
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
          resolve({
            file: new File([blob], file.name, { type: "image/jpeg" }),
            wasAutoCropped: true,
          });
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
  const [showAdvancedFb, setShowAdvancedFb] = useState(false);
  const [isSyncingFb, setIsSyncingFb] = useState(false);

  const [roomAssignmentByPinId, setRoomAssignmentByPinId] = useState<
    Record<string, string>
  >({});
  const [busyPinId, setBusyPinId] = useState<string | null>(null);
  const [showDiscarded, setShowDiscarded] = useState(false);

  // Manual Pin Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pinDesc, setPinDesc] = useState("");
  const [pinCategory, setPinCategory] = useState<PinCategoryDto>("VIEWS");
  const [pinRoomId, setPinRoomId] = useState("");
  const [pinAspectRatio, setPinAspectRatio] = useState("aspect-square");
  const [pinCoverUrl, setPinCoverUrl] = useState("");
  const [extraMediaUrls, setExtraMediaUrls] = useState<string[]>([]);
  const [pinVideoUrl, setPinVideoUrl] = useState("");
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
      const json = (await res.json()) as { syncedCount?: number; error?: string };
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
          ...(chosenRoomId !== undefined ? { roomId: chosenRoomId || null } : {}),
        }),
      });
      if (!res.ok) {
        onNotify("อัปเดตสถานะ Pin ไม่สำเร็จ");
        return;
      }
      onNotify(
        publishStatus === "PUBLISHED"
          ? "อนุมัติ Pin ขึ้นหน้าฟีด Nondii แล้ว"
          : "ซ่อน Pin เรียบร้อยแล้ว"
      );
      await onReload();
    } finally {
      setBusyPinId(null);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    setBusyPinId(pinId);
    try {
      const res = await fetch(
        `/api/studio/pins?id=${encodeURIComponent(pinId)}&hotel=${encodeURIComponent(
          data.hotel.slug
        )}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onNotify("ลบ Pin ออกจากระบบถาวรแล้ว");
        await onReload();
      }
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
          ? `อัปโหลดและครอปเป็นแนวตั้ง 3:4 แล้ว (${uploadedUrls.length} รูป)`
          : `อัปโหลดรูปภาพสำเร็จ (${uploadedUrls.length} รูป)`
      );
    } catch {
      onNotify("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCreateManualPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCoverUrl.trim()) {
      onNotify("กรุณาอัปโหลดรูปภาพหน้าปกก่อนเผยแพร่");
      return;
    }
    const normalizedCover = normalizeUrlToVerticalPortrait(pinCoverUrl);
    const normalizedGallery = Array.from(
      new Set([
        normalizedCover,
        ...extraMediaUrls.map(normalizeUrlToVerticalPortrait),
      ])
    );
    if (normalizedGallery.length < 5) {
      onNotify("กรุณาอัปโหลดรูปภาพอย่างน้อย 5 รูป เพื่อให้หน้าโปรไฟล์แสดง 5-Photo Mosaic ได้สมบูรณ์");
      return;
    }
    setIsCreatingPin(true);
    try {
      const res = await fetch("/api/studio/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          roomId: pinRoomId || null,
          category: pinCategory,
          titleTh: pinDesc.trim().slice(0, 120),
          descriptionTh: pinDesc.trim(),
          coverImageUrl: normalizedCover,
          mediaUrls: normalizedGallery,
          videoUrl: null,
          aspectRatio: pinAspectRatio,
        }),
      });
      if (!res.ok) {
        onNotify("สร้าง Pin ใหม่ไม่สำเร็จ");
        return;
      }
      setIsUploadModalOpen(false);
      setPinDesc("");
      setPinRoomId("");
      setPinCoverUrl("");
      setExtraMediaUrls([]);
      setPinVideoUrl("");
      onNotify("เผยแพร่ Pin แนวตั้งขึ้นหน้าฟีดทันทีแล้ว");
      await onReload();
    } finally {
      setIsCreatingPin(false);
    }
  };

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {/* 1. Header + Manual Upload CTA + Facebook Sync */}
      <section className="pb-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
              Pins หน้าฟีด & ซิงก์เพจ Facebook
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              อัปโหลดรูปบรรยากาศแนวตั้ง 3:4 หรือซิงก์จาก Facebook Page ด้วยระบบคัดกรอง AI 1-Click Approve
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="h-11 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            <span>อัปโหลด Pin ใหม่</span>
          </button>
        </div>

        {/* Clean Facebook Sync Form (Airbnb Grouped Inset-Label Standard) */}
        <form onSubmit={handleFacebookSync} className="pt-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                Facebook Page Auto-Sync
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                {existingFb?.lastSyncedAt
                  ? `ซิงก์ล่าสุดเมื่อ ${new Date(
                      existingFb.lastSyncedAt
                    ).toLocaleString("th-TH")}`
                  : "เชื่อมต่อเพจ Facebook เพื่อดึงรูปที่พักมาพักรอตรวจก่อนเผยแพร่"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedFb((v) => !v)}
              className="text-[13px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
            >
              {showAdvancedFb ? "ซ่อนตั้งค่าขั้นสูง" : "ตั้งค่า Token ขั้นสูง"}
            </button>
          </div>

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="Facebook Page ID *"
                placeholder="เช่น 104592837461"
                value={externalPageId}
                onChange={(e) => setExternalPageId(e.target.value)}
                required
              />
              <StandardInput
                grouped
                label="ชื่อเพจ Facebook *"
                placeholder="เช่น Sapan Unseen Resort"
                value={externalPageName}
                onChange={(e) => setExternalPageName(e.target.value)}
                required
              />
              <StandardInput
                grouped
                label="ลิงก์เพจ Facebook"
                placeholder="https://facebook.com/yourpage"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
              />
            </div>
            {showAdvancedFb && (
              <StandardInput
                grouped
                label="Page Access Token"
                optionalText="ไม่บังคับ"
                type="password"
                placeholder="วาง Graph API Token สำหรับดึงโพสต์จริง"
                value={graphAccessToken}
                onChange={(e) => setGraphAccessToken(e.target.value)}
              />
            )}
          </StandardFieldGroup>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSyncingFb}
              className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncingFb ? "animate-spin" : ""}`}
              />
              <span>
                {isSyncingFb
                  ? "กำลังซิงก์และคัดกรอง AI..."
                  : "ซิงก์โพสต์ล่าสุดจาก Facebook"}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. AI Smart Triage Queue */}
      {pendingPins.length > 0 && (
        <section className="py-8 space-y-4">
          <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>รายการรอยืนยัน 1-Click Approve ({pendingPins.length})</span>
          </h3>

          <div className="divide-y divide-[var(--color-border)]">
            {pendingPins.map((pin) => {
              const selectedRoomId =
                roomAssignmentByPinId[pin.id] ?? pin.roomId ?? "";
              return (
                <div
                  key={pin.id}
                  className="py-4 first:pt-0 flex flex-col sm:flex-row gap-4"
                >
                  <img
                    src={pin.coverImageUrl}
                    alt={pin.titleTh}
                    className="w-full sm:w-28 aspect-square rounded-[18px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-1">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {pin.titleTh || "โพสต์รูปบรรยากาศที่พัก"}
                      </p>
                      {pin.descriptionTh && (
                        <p className="text-[14px] text-[var(--color-text-secondary)] line-clamp-2">
                          {pin.descriptionTh}
                        </p>
                      )}
                      {pin.aiTriageNote && (
                        <p className="text-[13px] text-[var(--color-text-secondary)]">
                          AI Note: {pin.aiTriageNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="w-[220px]">
                        <ResponsiveSelect
                          value={selectedRoomId}
                          onChange={(val) =>
                            setRoomAssignmentByPinId((prev) => ({
                              ...prev,
                              [pin.id]: val,
                            }))
                          }
                          sheetTitle="ผูก Pin กับห้องพัก"
                          triggerClassName="w-full h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] text-[13px] font-medium text-[var(--color-text-primary)]"
                          options={[
                            { value: "", label: "ไม่ระบุห้องเฉพาะ" },
                            ...data.rooms.map((r) => ({
                              value: r.id,
                              label: `${r.code} · ${r.nameTh}`,
                            })),
                          ]}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={busyPinId === pin.id}
                        onClick={() => handleTriageAction(pin.id, "PUBLISHED")}
                        className="h-9 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>อนุมัติขึ้นเว็บ</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyPinId === pin.id}
                        onClick={() => handleTriageAction(pin.id, "DISCARDED")}
                        className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ไม่นำขึ้น</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Published Pins Grid (Clean Borderless Editorial Cards) */}
      <section className="py-8 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            Pin ที่เผยแพร่อยู่ ({publishedPins.length})
          </h3>
          {discardedPins.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDiscarded((v) => !v)}
              className="text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อนอยู่ ({discardedPins.length})</span>
              {showDiscarded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {showDiscarded && discardedPins.length > 0 && (
          <div className="rounded-[14px] bg-[var(--color-background-muted)] p-4 divide-y divide-[var(--color-border)]">
            {discardedPins.map((pin) => (
              <div
                key={pin.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={pin.coverImageUrl}
                    alt={pin.titleTh}
                    className="h-12 w-12 aspect-square rounded-[12px] object-cover shrink-0"
                  />
                  <p className="text-[14px] font-medium truncate">
                    {pin.titleTh || "Pin ที่ซ่อนอยู่"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTriageAction(pin.id, "PUBLISHED")}
                    className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] text-[13px] font-semibold cursor-pointer"
                  >
                    กู้คืน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePin(pin.id)}
                    aria-label="ลบถาวร"
                    className="h-8 w-8 rounded-[9px] hover:bg-[var(--color-background-subtle)] text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {publishedPins.length === 0 ? (
          <div className="rounded-[16px] bg-[var(--color-background-muted)] py-10 px-6 text-center text-[14px] text-[var(--color-text-secondary)]">
            ยังไม่มี Pin ที่เผยแพร่ — กดปุ่ม “อัปโหลด Pin ใหม่” ด้านบนได้เลยครับ
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {publishedPins.map((pin) => (
              <div key={pin.id} className="space-y-2">
                <div className="relative aspect-square rounded-[20px] overflow-hidden bg-[var(--color-background-muted)]">
                  <img
                    src={pin.coverImageUrl}
                    alt={pin.titleTh}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1 px-0.5">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)] line-clamp-1">
                    {pin.titleTh || pin.category}
                  </p>
                  <div className="flex items-center justify-between text-[12px] text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {pin.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3 text-[#e60023]" />
                        {pin.savesCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyPinId === pin.id}
                        onClick={() =>
                          handleTriageAction(pin.id, "DISCARDED", pin.roomId)
                        }
                        className="underline underline-offset-2 hover:text-[var(--color-text-primary)] cursor-pointer"
                      >
                        ซ่อน
                      </button>
                      <button
                        type="button"
                        disabled={busyPinId === pin.id}
                        onClick={() => handleDeletePin(pin.id)}
                        className="hover:text-[var(--color-error)] cursor-pointer"
                        aria-label="ลบ Pin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual Pin Upload Modal */}
      <StudioSheetModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="อัปโหลด Pin แนวตั้งใหม่"
        subtitle="รองรับภาพ 3:4 / 4:5 (ระบบช่วยครอปอัตโนมัติหากอัปโหลดภาพแนวนอน)"
        maxWidthClass="md:max-w-[620px]"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="studio-manual-pin-form"
              disabled={isCreatingPin || isUploadingCover}
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
            >
              {isCreatingPin ? "กำลังเผยแพร่..." : "เผยแพร่ Pin ขึ้นฟีด"}
            </button>
          </div>
        }
      >
        <form
          id="studio-manual-pin-form"
          onSubmit={handleCreateManualPin}
          className="space-y-4"
        >
          <div className="space-y-2">
            <span className="ty-body font-semibold block">
              อัปโหลดรูปภาพ (อย่างน้อย 5 รูป เพื่อแสดง 5-Photo Mosaic) *
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0">
                <Upload className="w-4 h-4" />
                <span>
                  {isUploadingCover ? "กำลังอัปโหลด..." : "เลือกไฟล์รูปภาพ"}
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
                placeholder="หรือวาง URL รูปภาพหลัก"
                value={pinCoverUrl}
                onChange={(e) => setPinCoverUrl(e.target.value)}
                className="flex-1 min-w-[180px] h-10 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] border border-transparent focus:border-[var(--color-text-primary)] focus:bg-[var(--color-background-card)] text-[14px] focus:outline-none"
              />
            </div>

            {pinCoverUrl && (
              <div className="flex items-start gap-3 pt-1">
                <img
                  src={pinCoverUrl}
                  alt="Preview"
                  className="w-24 aspect-square rounded-[18px] object-cover bg-[var(--color-background-muted)] shrink-0"
                />
                {extraMediaUrls.length > 0 && (
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    อัลบั้มทั้งหมด {extraMediaUrls.length + 1} รูป
                  </p>
                )}
              </div>
            )}
          </div>

          <StandardTextarea
            label="แคปชันสั้นๆ"
            optionalText="ไม่บังคับ"
            rows={3}
            value={pinDesc}
            onChange={(e) => setPinDesc(e.target.value)}
            placeholder="เช่น ตื่นมาชมทะเลหมอกหน้าห้อง..."
          />

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardSelectField
                grouped
                label="หมวดหมู่"
                value={pinCategory}
                onChange={(v) => setPinCategory(v as PinCategoryDto)}
                sheetTitle="เลือกหมวดหมู่ Pin"
                options={PIN_CATEGORY_OPTIONS}
              />
              <StandardSelectField
                grouped
                label="สัดส่วนภาพ"
                value={pinAspectRatio}
                onChange={setPinAspectRatio}
                sheetTitle="เลือกสัดส่วนภาพ"
                options={ASPECT_RATIO_OPTIONS}
              />
            </div>
            <StandardSelectField
              grouped
              label="เชื่อมกับห้องพัก"
              optionalText="ไม่บังคับ"
              value={pinRoomId}
              onChange={setPinRoomId}
              sheetTitle="เลือกห้องพักที่เชื่อมกับ Pin"
              options={[
                { value: "", label: "ไม่ระบุห้องเฉพาะ" },
                ...data.rooms.map((r) => ({
                  value: r.id,
                  label: `${r.code} · ${r.nameTh}`,
                })),
              ]}
            />
          </StandardFieldGroup>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            ระบบรองรับเฉพาะภาพนิ่งความคมชัดสูง (ไม่รองรับวิดีโอ) เพื่อความเร็วและสัดส่วนภาพที่สวยงามบนทุกอุปกรณ์
          </p>
        </form>
      </StudioSheetModal>
    </div>
  );
}
