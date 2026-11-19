"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  CheckSquare,
  FolderInput,
  Home,
  Image as ImageIcon,
  Images,
  Loader2,
  Mountain,
  Plus,
  Sofa,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import {
  doesRoomPhotoNeedOptimization,
  getRoomPhotoSpaceDef,
  MAX_PHOTOS_PER_ROOM,
  MAX_UPLOAD_BATCH_FILES,
  normalizeRoomPhotos,
  ROOM_PHOTO_SPACES,
  serializeRoomPhotos,
  type RoomPhotoMeta,
  type RoomPhotoSpaceId,
} from "@/lib/roomPhotoSpaces";
import { uploadMediaFileWithMeta } from "@/lib/slipScanner";
import {
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";

export type PhotoStudioLevel = "gallery" | "detail";
type ActiveSpaceFilter = "all" | RoomPhotoSpaceId;

export interface RoomPhotoStudioRoomSummary {
  id: string;
  code: string;
  nameTh: string;
  galleryUrls: string[];
  galleryMetaJson?: RoomPhotoMeta[] | null;
}

export interface RoomPhotoStudioHeaderState {
  level: PhotoStudioLevel;
  title: string;
  subtitle: string;
}

function getSpaceIcon(spaceId: ActiveSpaceFilter) {
  switch (spaceId) {
    case "all":
      return Images;
    case "bedroom":
      return BedDouble;
    case "bathroom":
      return Bath;
    case "balcony":
      return Mountain;
    case "pool":
      return Waves;
    case "living":
      return Sofa;
    case "exterior":
      return Home;
    case "additional":
    default:
      return Sparkles;
  }
}

export function RoomPhotoStudio({
  hotelSlug,
  room,
  embedded = false,
  controlledPhotos,
  onControlledPhotosChange,
  onHeaderStateChange,
  stepBackRef,
  onBack,
  onReload,
  onNotify,
}: {
  hotelSlug: string;
  room: RoomPhotoStudioRoomSummary;
  embedded?: boolean;
  controlledPhotos?: RoomPhotoMeta[];
  onControlledPhotosChange?: (next: RoomPhotoMeta[]) => void;
  onHeaderStateChange?: (state: RoomPhotoStudioHeaderState) => void;
  stepBackRef?: React.MutableRefObject<(() => boolean) | null>;
  onBack: () => void;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [internalPhotos, setInternalPhotos] = useState<RoomPhotoMeta[]>(() =>
    controlledPhotos
      ? controlledPhotos
      : normalizeRoomPhotos(room.galleryUrls, room.galleryMetaJson)
  );
  const photos = controlledPhotos ?? internalPhotos;

  const setPhotosSafe = (next: RoomPhotoMeta[]) => {
    setInternalPhotos(next);
    onControlledPhotosChange?.(next);
  };

  const [level, setLevel] = useState<PhotoStudioLevel>("gallery");
  const [activeSpace, setActiveSpace] = useState<ActiveSpaceFilter>("all");
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");

  // Caption draft for Single Photo Detail Editor
  const [captionDraft, setCaptionDraft] = useState("");
  const [isCaptionDirty, setIsCaptionDirty] = useState(false);

  // Upload & Save state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
    passed: number;
    skipped: number;
  } | null>(null);
  const cancelUploadRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiOrganizing, setIsAiOrganizing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    blocked: Array<{ fileName: string; reason: string }>;
    warnings: string[];
    aiAutoTaggedCount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetSpaceRef = useRef<RoomPhotoSpaceId>("additional");

  // Multi-select mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Drag-and-drop state: supports BOTH reordering photos AND dropping onto a Left Category to move across groups!
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);
  const [dragOverUrl, setDragOverUrl] = useState<string | null>(null);
  const [dragOverSpaceId, setDragOverSpaceId] =
    useState<RoomPhotoSpaceId | null>(null);

  // Sync if parent reloads room from DB (uncontrolled mode only)
  useEffect(() => {
    if (controlledPhotos) return;
    setInternalPhotos(
      normalizeRoomPhotos(room.galleryUrls, room.galleryMetaJson)
    );
  }, [controlledPhotos, room.id, room.galleryUrls, room.galleryMetaJson]);

  const activePhoto = useMemo(
    () => photos.find((p) => p.url === activePhotoUrl) ?? null,
    [photos, activePhotoUrl]
  );

  useEffect(() => {
    if (activePhoto) {
      setCaptionDraft(activePhoto.captionTh ?? "");
      setIsCaptionDirty(false);
    }
  }, [activePhoto?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category counts for the clean Left Icon + Label Rail
  const categoryItems = useMemo(() => {
    const counts = new Map<RoomPhotoSpaceId, number>();
    for (const def of ROOM_PHOTO_SPACES) counts.set(def.id, 0);
    for (const p of photos) {
      counts.set(p.space, (counts.get(p.space) ?? 0) + 1);
    }

    return [
      {
        id: "all" as ActiveSpaceFilter,
        labelTh: "รูปทั้งหมด",
        count: photos.length,
        isDroppable: false,
      },
      ...ROOM_PHOTO_SPACES.map((def) => ({
        id: def.id as ActiveSpaceFilter,
        labelTh: def.labelTh,
        count: counts.get(def.id) ?? 0,
        isDroppable: true,
      })),
    ];
  }, [photos]);

  const visiblePhotos = useMemo(() => {
    if (activeSpace === "all") return photos;
    return photos.filter((p) => p.space === activeSpace);
  }, [photos, activeSpace]);

  const activeSpaceMeta = useMemo(() => {
    if (activeSpace === "all") {
      return {
        labelTh: "รูปทั้งหมด",
        descriptionTh:
          "ลากสลับลำดับ หรือลากรูปไปวางที่หมวดด้านซ้ายเพื่อย้ายกลุ่ม · รูปแรกคือภาพปก",
      };
    }
    const def = getRoomPhotoSpaceDef(activeSpace);
    return {
      labelTh: def.labelTh,
      descriptionTh: `${def.descriptionTh} · ลากรูปไปวางที่หมวดด้านซ้ายเพื่อย้ายกลุ่มได้`,
    };
  }, [activeSpace]);

  const captionedCount = useMemo(
    () => photos.filter((p) => Boolean(p.captionTh?.trim())).length,
    [photos]
  );

  const pendingAiCount = useMemo(
    () => photos.filter(doesRoomPhotoNeedOptimization).length,
    [photos]
  );

  // Sync dynamic header title/subtitle to parent StudioSheetModal when embedded
  useEffect(() => {
    if (!onHeaderStateChange) return;
    const roomLabel = room.nameTh || room.code || "ห้องพัก";
    const title =
      level === "detail"
        ? "รายละเอียดรูปภาพ"
        : `รูปภาพห้องพัก · ${roomLabel}`;
    const subtitle = `${photos.length}/${MAX_PHOTOS_PER_ROOM} รูป${
      captionedCount > 0 ? ` · ${captionedCount} คำอธิบาย SEO` : ""
    }${isSaving ? " · กำลังบันทึก..." : ""}`;
    onHeaderStateChange({ level, title, subtitle });
  }, [
    onHeaderStateChange,
    level,
    room.nameTh,
    room.code,
    photos.length,
    captionedCount,
    isSaving,
  ]);

  // =========================================================================
  // PERSIST TO NEON POSTGRES (Live save for existing rooms; draft for new room)
  // =========================================================================
  const persistPhotos = async (
    nextPhotos: RoomPhotoMeta[],
    successMsg?: string
  ) => {
    const serialized = serializeRoomPhotos(nextPhotos);
    setPhotosSafe(serialized.galleryMetaJson);

    if (!room.id) {
      if (successMsg) onNotify(successMsg);
      return true;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/studio/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug,
          id: room.id,
          galleryUrls: serialized.galleryUrls,
          galleryMetaJson: serialized.galleryMetaJson,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        onNotify(json.error || "บันทึกรูปภาพไม่สำเร็จ");
        return false;
      }
      if (successMsg) onNotify(successMsg);
      void onReload();
      return true;
    } catch {
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // NAVIGATION (Clean 2-Level Flow: Split Gallery <-> Single Photo Detail)
  // =========================================================================
  const selectSpaceTab = (targetSpace: ActiveSpaceFilter) => {
    if (targetSpace === activeSpace) return;
    setIsSelectMode(false);
    setSelectedUrls(new Set());
    setSlideDir("forward");
    setActiveSpace(targetSpace);
  };

  const openPhotoDetail = (url: string) => {
    setSlideDir("forward");
    setActivePhotoUrl(url);
    setLevel("detail");
  };

  const backToGallery = () => {
    setSlideDir("back");
    setLevel("gallery");
  };

  useEffect(() => {
    if (!stepBackRef) return;
    stepBackRef.current = () => {
      if (level === "detail") {
        backToGallery();
        return true;
      }
      return false; // Already at Split Gallery -> parent returns cleanly to Room Form!
    };
    return () => {
      stepBackRef.current = null;
    };
  });

  const stepDetailPhoto = (direction: "prev" | "next") => {
    if (!activePhotoUrl || visiblePhotos.length <= 1) return;
    const idx = visiblePhotos.findIndex((p) => p.url === activePhotoUrl);
    if (idx === -1) return;
    const nextIdx =
      direction === "next"
        ? (idx + 1) % visiblePhotos.length
        : (idx - 1 + visiblePhotos.length) % visiblePhotos.length;
    const nextUrl = visiblePhotos[nextIdx]?.url;
    if (!nextUrl) return;
    setSlideDir(direction === "next" ? "forward" : "back");
    setActivePhotoUrl(nextUrl);
  };

  // =========================================================================
  // UPLOAD PHOTOS (Silent Auto-Resize/Compress + Gemini AI Safety & SEO Draft)
  // =========================================================================
  const triggerUpload = (targetSpace: RoomPhotoSpaceId) => {
    uploadTargetSpaceRef.current = targetSpace;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (rawFiles.length === 0) return;

    const remainingSlots = Math.max(0, MAX_PHOTOS_PER_ROOM - photos.length);
    if (remainingSlots <= 0) {
      onNotify(
        `ห้องนี้มีรูปครบสูงสุด ${MAX_PHOTOS_PER_ROOM} รูปแล้ว กรุณาลบรูปเก่าก่อนเพิ่มใหม่`
      );
      return;
    }

    const allowedCount = Math.min(remainingSlots, MAX_UPLOAD_BATCH_FILES);
    const files = rawFiles.slice(0, allowedCount);
    if (rawFiles.length > files.length) {
      onNotify(
        `จำกัดสูงสุดครั้งละ ${MAX_UPLOAD_BATCH_FILES} รูป และไม่เกิน ${MAX_PHOTOS_PER_ROOM} รูป/ห้อง — กำลังนำเข้า ${files.length} รูปแรก`
      );
    }

    const targetSpace = uploadTargetSpaceRef.current;
    const allowAiSpaceOverride =
      activeSpace === "all" || targetSpace === "additional";

    cancelUploadRef.current = false;
    setIsUploading(true);
    setUploadFeedback(null);
    setUploadProgress({
      done: 0,
      total: files.length,
      passed: 0,
      skipped: 0,
    });

    const uploaded: RoomPhotoMeta[] = [];
    const blocked: Array<{ fileName: string; reason: string }> = [];
    const collectedWarnings: string[] = [];
    let aiAutoTaggedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelUploadRef.current) break;
        const file = files[i];
        try {
          const result = await uploadMediaFileWithMeta(file, "rooms");
          const resolvedSpace: RoomPhotoSpaceId =
            allowAiSpaceOverride && result.ai?.suggestedSpace
              ? result.ai.suggestedSpace
              : targetSpace;

          if (
            result.ai?.checked &&
            (result.ai.suggestedSpace || result.ai.suggestedCaptionTh)
          ) {
            aiAutoTaggedCount += 1;
          }

          uploaded.push({
            url: result.url,
            space: resolvedSpace,
            ...(result.ai?.suggestedCaptionTh
              ? { captionTh: result.ai.suggestedCaptionTh }
              : {}),
          });

          for (const w of result.warnings) {
            if (!collectedWarnings.includes(w)) collectedWarnings.push(w);
          }
        } catch (err) {
          blocked.push({
            fileName: file.name,
            reason:
              err instanceof Error ? err.message : "อัปโหลดรูปนี้ไม่สำเร็จ",
          });
        }

        setUploadProgress({
          done: i + 1,
          total: files.length,
          passed: uploaded.length,
          skipped: blocked.length,
        });
      }

      if (blocked.length > 0 || collectedWarnings.length > 0) {
        setUploadFeedback({
          blocked,
          warnings: collectedWarnings.slice(0, 3),
          aiAutoTaggedCount,
        });
      }

      if (uploaded.length > 0) {
        const next = [...photos, ...uploaded].slice(0, MAX_PHOTOS_PER_ROOM);
        const aiSuffix =
          aiAutoTaggedCount > 0 ? " · AI จัดหมวด & ร่าง SEO ให้แล้ว" : "";
        await persistPhotos(
          next,
          `อัปโหลดแล้ว ${uploaded.length} รูป${aiSuffix}`
        );
      } else if (blocked.length > 0) {
        onNotify(blocked[0].reason);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      cancelUploadRef.current = false;
    }
  };

  // =========================================================================
  // COVER PHOTO, REORDER, CROSS-CATEGORY DRAG & DROP, DELETE, CAPTION
  // =========================================================================
  const handleSetCover = async (targetUrl: string) => {
    const idx = photos.findIndex((p) => p.url === targetUrl);
    if (idx <= 0) return;
    const target = photos[idx];
    const next = [target, ...photos.slice(0, idx), ...photos.slice(idx + 1)];
    await persistPhotos(next, "ตั้งเป็นภาพปกหลักของห้องแล้ว");
  };

  const handleReorderUrls = async (sourceUrl: string, targetUrl: string) => {
    if (sourceUrl === targetUrl) return;
    const fromIdx = photos.findIndex((p) => p.url === sourceUrl);
    const toIdx = photos.findIndex((p) => p.url === targetUrl);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...photos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await persistPhotos(next, "บันทึกลำดับรูปภาพแล้ว");
  };

  const handleDropPhotoOnSpace = async (
    sourceUrl: string,
    targetSpace: RoomPhotoSpaceId
  ) => {
    // If dragging one of multiple selected photos, move all selected photos together!
    const urlsToMove =
      isSelectMode && selectedUrls.has(sourceUrl) && selectedUrls.size > 1
        ? new Set(selectedUrls)
        : new Set([sourceUrl]);

    const movingAnyChanged = photos.some(
      (p) => urlsToMove.has(p.url) && p.space !== targetSpace
    );
    if (!movingAnyChanged) return;

    const next = photos.map((p) =>
      urlsToMove.has(p.url) ? { ...p, space: targetSpace } : p
    );

    if (urlsToMove.size > 1) {
      setIsSelectMode(false);
      setSelectedUrls(new Set());
    }

    const spaceLabel = getRoomPhotoSpaceDef(targetSpace).labelTh;
    await persistPhotos(
      next,
      urlsToMove.size > 1
        ? `ย้าย ${urlsToMove.size} รูปไปหมวด "${spaceLabel}" แล้ว`
        : `ย้ายรูปไปหมวด "${spaceLabel}" แล้ว`
    );
  };

  const handleNudgePhoto = async (url: string, dir: -1 | 1) => {
    const idx = visiblePhotos.findIndex((p) => p.url === url);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= visiblePhotos.length) return;
    const targetUrl = visiblePhotos[swapIdx]?.url;
    if (!targetUrl) return;
    await handleReorderUrls(url, targetUrl);
  };

  const handleDeletePhoto = async (targetUrl: string) => {
    const next = photos.filter((p) => p.url !== targetUrl);
    if (level === "detail") {
      const remainingInSpace =
        activeSpace === "all"
          ? next
          : next.filter((p) => p.space === activeSpace);
      setSlideDir("back");
      if (remainingInSpace.length > 0) {
        setActivePhotoUrl(remainingInSpace[0].url);
      } else {
        setActivePhotoUrl(null);
        setLevel("gallery");
      }
    }
    await persistPhotos(next, "ลบรูปภาพออกจากห้องแล้ว");
  };

  const handleChangePhotoSpace = async (
    targetUrl: string,
    newSpace: RoomPhotoSpaceId
  ) => {
    const next = photos.map((p) =>
      p.url === targetUrl ? { ...p, space: newSpace } : p
    );
    await persistPhotos(
      next,
      `ย้ายไปหมวด "${getRoomPhotoSpaceDef(newSpace).labelTh}" แล้ว`
    );
  };

  const handleSaveCaption = async () => {
    if (!activePhoto) return;
    const clean = captionDraft.trim().slice(0, 250);
    const next = photos.map((p) =>
      p.url === activePhoto.url
        ? { ...p, ...(clean ? { captionTh: clean } : { captionTh: undefined }) }
        : p
    );
    const ok = await persistPhotos(next, "บันทึกคำอธิบายรูปภาพ (SEO / AEO) แล้ว");
    if (ok) setIsCaptionDirty(false);
  };

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleBulkMove = async (targetSpace: RoomPhotoSpaceId) => {
    if (selectedUrls.size === 0) return;
    const count = selectedUrls.size;
    const next = photos.map((p) =>
      selectedUrls.has(p.url) ? { ...p, space: targetSpace } : p
    );
    setIsMoveModalOpen(false);
    setIsSelectMode(false);
    setSelectedUrls(new Set());
    await persistPhotos(
      next,
      `ย้าย ${count} รูปไปที่ "${getRoomPhotoSpaceDef(targetSpace).labelTh}" แล้ว`
    );
  };

  const handleBulkDelete = async () => {
    if (selectedUrls.size === 0) return;
    const count = selectedUrls.size;
    const next = photos.filter((p) => !selectedUrls.has(p.url));
    setIsSelectMode(false);
    setSelectedUrls(new Set());
    await persistPhotos(next, `ลบรูปภาพที่เลือกแล้ว ${count} รูป`);
  };

  const handleAiOrganizeAll = async () => {
    if (
      photos.length === 0 ||
      pendingAiCount === 0 ||
      isAiOrganizing ||
      isUploading
    ) {
      if (pendingAiCount === 0 && photos.length > 0) {
        onNotify("รูปภาพทั้งหมดมีหมวดหมู่ คำอธิบาย SEO และขนาดไฟล์ครบสมบูรณ์แล้ว");
      }
      return;
    }
    setIsAiOrganizing(true);
    setUploadFeedback(null);
    try {
      const res = await fetch("/api/studio/rooms/ai-organize-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug,
          roomId: room.id || undefined,
          photos,
          onlyMissing: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        photos?: RoomPhotoMeta[];
        flagged?: Array<{ url: string; reason: string }>;
        stats?: {
          processedCount: number;
          categorizedCount: number;
          captionedCount: number;
          compressedCount: number;
          flaggedCount: number;
        };
      };

      if (!res.ok || !Array.isArray(json.photos)) {
        onNotify(json.error || "ไม่สามารถให้ AI จัดการรูปภาพได้");
        return;
      }

      setPhotosSafe(json.photos);
      if (room.id) void onReload();

      if (json.flagged && json.flagged.length > 0) {
        setUploadFeedback({
          blocked: json.flagged.map((f, idx) => ({
            fileName: `รูปที่คัดออก #${idx + 1}`,
            reason: f.reason,
          })),
          warnings: [],
          aiAutoTaggedCount: json.stats?.categorizedCount ?? 0,
        });
      }

      const st = json.stats;
      const parts: string[] = [];
      if (st?.categorizedCount) parts.push(`จัดหมวด ${st.categorizedCount} รูป`);
      if (st?.captionedCount) parts.push(`SEO ${st.captionedCount} รูป`);
      if (st?.compressedCount) parts.push(`บีบไฟล์ ${st.compressedCount} รูป`);
      if (st?.flaggedCount) parts.push(`คัดออก ${st.flaggedCount} รูป`);

      onNotify(
        parts.length > 0
          ? `AI จัดระเบียบเรียบร้อย · ${parts.join(" · ")}`
          : "AI ตรวจสอบแล้ว รูปภาพทั้งหมดพร้อมใช้งานครบถ้วน"
      );
    } catch {
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsAiOrganizing(false);
    }
  };

  const currentUploadSpace: RoomPhotoSpaceId =
    activeSpace !== "all" ? activeSpace : "additional";

  const activePhotoGlobalIndex = activePhoto
    ? photos.findIndex((p) => p.url === activePhoto.url)
    : -1;
  const activePhotoVisibleIndex = activePhoto
    ? visiblePhotos.findIndex((p) => p.url === activePhoto.url)
    : -1;

  const paneAnimClass =
    slideDir === "back"
      ? "animate-studio-panel-back"
      : "animate-studio-panel-forward";

  const actionControls = (
    <div className="flex items-center gap-2 shrink-0">
      {level === "gallery" && photos.length > 0 && pendingAiCount > 0 && (
        <button
          type="button"
          disabled={isAiOrganizing || isUploading}
          onClick={() => void handleAiOrganizeAll()}
          aria-label={`AI จัดหมวด · SEO · บีบไฟล์ (${pendingAiCount} รูปที่ค้าง)`}
          title={`AI จัดการเฉพาะ ${pendingAiCount} รูปที่ยังไม่มีหมวดหมู่ / SEO / WebP`}
          className="h-9 w-9 sm:w-auto sm:px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
        >
          {isAiOrganizing ? (
            <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isAiOrganizing
              ? `AI กำลังจัด ${pendingAiCount} รูป...`
              : `AI จัดการ (${pendingAiCount})`}
          </span>
        </button>
      )}

      {level === "gallery" && photos.length > 0 && pendingAiCount === 0 && (
        <span
          title="รูปภาพทั้งหมดจัดหมวดหมู่ มีคำอธิบาย SEO และบีบอัด WebP ครบแล้ว"
          className="hidden sm:inline-flex h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)]/60 text-[12.5px] font-medium text-[var(--color-text-secondary)] items-center gap-1.5 shrink-0"
        >
          <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
          <span>AI ครบทุกภาพแล้ว</span>
        </span>
      )}

      {level === "gallery" && visiblePhotos.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsSelectMode((prev) => {
              if (prev) setSelectedUrls(new Set());
              return !prev;
            });
          }}
          aria-label={isSelectMode ? "เสร็จสิ้นการเลือกรูป" : "เลือกรูป"}
          title={isSelectMode ? "เสร็จสิ้น" : "เลือกรูป"}
          className={`h-9 w-9 sm:w-auto sm:px-3.5 rounded-[10px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            isSelectMode
              ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
          }`}
        >
          <CheckSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">
            {isSelectMode ? "เสร็จสิ้น" : "เลือกรูป"}
          </span>
        </button>
      )}

      {level !== "detail" && (
        <button
          type="button"
          disabled={
            isUploading || isAiOrganizing || photos.length >= MAX_PHOTOS_PER_ROOM
          }
          onClick={() => triggerUpload(currentUploadSpace)}
          aria-label={
            activeSpace !== "all"
              ? `เพิ่มรูป${activeSpaceMeta.labelTh}`
              : "เพิ่มรูปภาพ"
          }
          title={
            activeSpace !== "all"
              ? `เพิ่มรูป${activeSpaceMeta.labelTh}`
              : "เพิ่มรูปภาพ"
          }
          className="h-9 w-9 sm:w-auto sm:px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isUploading
              ? "กำลังอัปโหลด..."
              : photos.length >= MAX_PHOTOS_PER_ROOM
              ? `ครบ ${MAX_PHOTOS_PER_ROOM} รูป`
              : "เพิ่มรูปภาพ"}
          </span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Hidden Multi-File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* =====================================================================
          HEADER: Full bar when standalone; compact action strip when embedded in Modal
      ====================================================================== */}
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (level === "detail") backToGallery();
                else onBack();
              }}
              aria-label="ย้อนกลับ"
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[22px] sm:text-[25px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] truncate">
                  {level === "detail"
                    ? "รายละเอียดรูปภาพ"
                    : `รูปภาพห้องพัก · ${room.nameTh}`}
                </h2>
                <span className="px-2 py-0.5 rounded-[8px] bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  {room.code}
                </span>
              </div>
              <p className="text-[13.5px] text-[var(--color-text-secondary)] mt-0.5 flex flex-wrap items-center gap-2">
                <span>
                  {photos.length}/{MAX_PHOTOS_PER_ROOM} รูป
                  {captionedCount > 0
                    ? ` · ${captionedCount} คำอธิบาย SEO`
                    : ""}
                </span>
                {isSaving && (
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    กำลังบันทึก...
                  </span>
                )}
              </p>
            </div>
          </div>

          {actionControls}
        </div>
      ) : level !== "detail" ? (
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[var(--color-border)]">
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
            {activeSpaceMeta.labelTh}{" "}
            <span className="text-[13px] font-normal text-[var(--color-text-secondary)] tabular-nums">
              ({visiblePhotos.length})
            </span>
          </h3>
          {actionControls}
        </div>
      ) : null}

      {/* Live Upload Progress Bar */}
      {uploadProgress && (
        <div className="rounded-[14px] bg-[var(--color-background-muted)] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-[var(--color-text-primary)] tabular-nums">
              กำลังย่อไฟล์และให้ AI ตรวจภาพ {uploadProgress.done} /{" "}
              {uploadProgress.total} รูป
              {uploadProgress.passed > 0
                ? ` · ผ่าน ${uploadProgress.passed}`
                : ""}
              {uploadProgress.skipped > 0
                ? ` · ข้าม ${uploadProgress.skipped}`
                : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                cancelUploadRef.current = true;
              }}
              className="text-[12.5px] font-semibold text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] cursor-pointer shrink-0"
            >
              หยุดที่เหลือ
            </button>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--color-background-subtle)] overflow-hidden">
            <div
              className="h-full bg-[#222222] dark:bg-[#f5f5f5] transition-all duration-300"
              style={{
                width: `${Math.max(
                  8,
                  Math.round(
                    (uploadProgress.done / Math.max(1, uploadProgress.total)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Calm Upload Feedback Banner */}
      {uploadFeedback &&
        (uploadFeedback.blocked.length > 0 ||
          uploadFeedback.warnings.length > 0) && (
          <div className="rounded-[14px] bg-[var(--color-background-muted)] p-4 flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              {uploadFeedback.blocked.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[13.5px] font-semibold text-[var(--color-error)] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      ไม่สามารถอัปโหลดได้ {uploadFeedback.blocked.length} รูป
                    </span>
                  </p>
                  <ul className="space-y-1 text-[12.5px] text-[var(--color-text-secondary)]">
                    {uploadFeedback.blocked.map((item, i) => (
                      <li key={`${item.fileName}-${i}`}>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {item.fileName}:
                        </span>{" "}
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadFeedback.warnings.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    คำแนะนำคุณภาพรูปภาพ (อัปโหลดสำเร็จแล้ว)
                  </p>
                  {uploadFeedback.warnings.map((w, i) => (
                    <p
                      key={i}
                      className="text-[12.5px] text-[var(--color-text-secondary)]"
                    >
                      · {w}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setUploadFeedback(null)}
              aria-label="ปิดการแจ้งเตือน"
              className="h-7 w-7 rounded-[8px] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      {/* =====================================================================
          LEVEL 1: UNIFIED SPLIT GALLERY WORKSPACE
          Left: Clean Icon + Space Category List (Drag-and-Drop Cross-Group Targets!)
          Right: Draggable Photo Grid (Reorder + Click for SEO/Cover Detail)
      ====================================================================== */}
      {level === "gallery" && (
        <div className="flex flex-col md:flex-row gap-5 lg:gap-7 items-start">
          {/* Left Icon + Space Category Rail (Zero Redundant Photos · Cross-Group Drop Targets) */}
          <aside className="w-full md:w-[200px] shrink-0">
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible -mx-4 px-4 scroll-px-4 md:mx-0 md:px-0 pb-2 md:pb-0 no-scrollbar">
              {categoryItems.map((cat) => {
                const Icon = getSpaceIcon(cat.id);
                const isActive = activeSpace === cat.id;
                const isDropHover =
                  cat.isDroppable &&
                  draggingUrl !== null &&
                  dragOverSpaceId === cat.id;
                const isDroppableWhileDragging =
                  cat.isDroppable && draggingUrl !== null;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectSpaceTab(cat.id)}
                    onDragOver={(e) => {
                      if (!cat.isDroppable || !draggingUrl) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSpaceId !== cat.id) {
                        setDragOverSpaceId(cat.id as RoomPhotoSpaceId);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverSpaceId === cat.id) {
                        setDragOverSpaceId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (!cat.isDroppable) return;
                      e.preventDefault();
                      const src =
                        draggingUrl || e.dataTransfer.getData("text/plain");
                      setDraggingUrl(null);
                      setDragOverUrl(null);
                      setDragOverSpaceId(null);
                      if (src) {
                        void handleDropPhotoOnSpace(
                          src,
                          cat.id as RoomPhotoSpaceId
                        );
                      }
                    }}
                    className={`group shrink-0 md:w-full h-10 md:h-auto px-3 md:py-2.5 rounded-[11px] flex items-center justify-between gap-2.5 text-left cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
                      isDropHover
                        ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                        : isActive
                        ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] font-semibold"
                        : isDroppableWhileDragging
                        ? "bg-[var(--color-background-muted)]/55 text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)]/70 hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isDropHover
                            ? "stroke-[2.2]"
                            : isActive
                            ? "stroke-[2.1] text-[var(--color-text-primary)]"
                            : "stroke-[1.7]"
                        }`}
                      />
                      <span className="text-[13.5px] whitespace-nowrap md:truncate">
                        {cat.labelTh}
                      </span>
                    </span>

                    <span
                      className={`text-[12px] tabular-nums shrink-0 ${
                        isDropHover
                          ? "font-semibold"
                          : isActive
                          ? "font-semibold text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-tertiary)]"
                      }`}
                    >
                      {isDropHover ? "วางที่นี่" : cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {photos.length > 0 && (
              <p className="hidden md:block text-[11.5px] leading-relaxed text-[var(--color-text-tertiary)] px-3 pt-3">
                ลากรูปจากฝั่งขวามาวางบนหมวดหมู่ด้านซ้ายเพื่อย้ายกลุ่มได้ทันที
              </p>
            )}
          </aside>

          {/* Right Photo Grid Workspace */}
          <div
            key={`gallery-${activeSpace}`}
            className={`flex-1 min-w-0 w-full space-y-4 ${paneAnimClass}`}
          >
            {isSelectMode && (
              <div className="rounded-[14px] bg-[var(--color-background-muted)] p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                    เลือกแล้ว {selectedUrls.size} รูป
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUrls.size === visiblePhotos.length) {
                        setSelectedUrls(new Set());
                      } else {
                        setSelectedUrls(
                          new Set(visiblePhotos.map((p) => p.url))
                        );
                      }
                    }}
                    className="text-[12.5px] font-medium text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    {selectedUrls.size === visiblePhotos.length
                      ? "ยกเลิกทั้งหมด"
                      : "เลือกทั้งหมด"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedUrls.size === 0}
                    onClick={() => setIsMoveModalOpen(true)}
                    className="h-8.5 px-3 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>ย้ายหมวดหมู่</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedUrls.size === 0}
                    onClick={() => void handleBulkDelete()}
                    className="h-8.5 px-3 rounded-[10px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-semibold text-[var(--color-error)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            )}

            {visiblePhotos.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)]/60 py-12 px-5 text-center space-y-2.5">
                <ImageIcon className="w-7 h-7 mx-auto text-[var(--color-text-tertiary)] stroke-[1.5]" />
                <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                  ยังไม่มีรูปภาพในหมวด &ldquo;{activeSpaceMeta.labelTh}&rdquo;
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  อัปโหลดรูปเข้าหมวดนี้โดยตรง หรือลากรูปจาก &ldquo;รูปทั้งหมด&rdquo; มาวางที่หมวดด้านซ้ายได้เลย
                </p>
                <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={isUploading || photos.length >= MAX_PHOTOS_PER_ROOM}
                    onClick={() => triggerUpload(currentUploadSpace)}
                    className="h-9.5 px-4 rounded-[10px] bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>เพิ่มรูปเข้าหมวดนี้</span>
                  </button>
                  {photos.length > 0 && activeSpace !== "all" && (
                    <button
                      type="button"
                      onClick={() => selectSpaceTab("all")}
                      className="h-9.5 px-4 rounded-[10px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[13px] font-medium text-[var(--color-text-primary)] cursor-pointer"
                    >
                      ดูรูปทั้งหมด ({photos.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`grid gap-2 ${
                  embedded
                    ? "grid-cols-2 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                }`}
              >
                {visiblePhotos.map((photo, idx) => {
                  const globalIdx = photos.findIndex(
                    (p) => p.url === photo.url
                  );
                  const isCover = globalIdx === 0;
                  const isSelected = selectedUrls.has(photo.url);
                  const isDragging = draggingUrl === photo.url;
                  const isDragTarget =
                    dragOverUrl === photo.url && draggingUrl !== photo.url;

                  return (
                    <div
                      key={photo.url}
                      draggable
                      onDragStart={(e) => {
                        setDraggingUrl(photo.url);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", photo.url);
                      }}
                      onDragOver={(e) => {
                        if (!draggingUrl) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverUrl !== photo.url) {
                          setDragOverUrl(photo.url);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverUrl === photo.url) setDragOverUrl(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const src =
                          draggingUrl || e.dataTransfer.getData("text/plain");
                        setDraggingUrl(null);
                        setDragOverUrl(null);
                        setDragOverSpaceId(null);
                        if (src && src !== photo.url) {
                          void handleReorderUrls(src, photo.url);
                        }
                      }}
                      onDragEnd={() => {
                        setDraggingUrl(null);
                        setDragOverUrl(null);
                        setDragOverSpaceId(null);
                      }}
                      className={`group space-y-1.5 transition-opacity ${
                        isDragging ? "opacity-45" : "opacity-100"
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (isSelectMode) toggleSelectUrl(photo.url);
                          else openPhotoDetail(photo.url);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isSelectMode) toggleSelectUrl(photo.url);
                            else openPhotoDetail(photo.url);
                          }
                        }}
                        className={`relative aspect-[4/3] rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] cursor-grab active:cursor-grabbing transition ${
                          isSelected
                            ? "ring-2 ring-[#222222] dark:ring-[#f5f5f5] ring-offset-2 ring-offset-[var(--color-background-popover)]"
                            : isDragTarget
                            ? "ring-2 ring-[#222222] dark:ring-[#f5f5f5]"
                            : ""
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={
                            photo.captionTh ||
                            `${room.nameTh} — ${
                              getRoomPhotoSpaceDef(photo.space).labelTh
                            }`
                          }
                          className="w-full h-full object-cover group-hover:brightness-[0.94] transition"
                        />

                        {isSelectMode ? (
                          <span
                            className={`absolute top-2.5 left-2.5 h-6.5 w-6.5 rounded-[8px] inline-flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                                : "bg-white/90 text-[#222222]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </span>
                        ) : isCover ? (
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[7px] bg-white/94 dark:bg-[#222222]/92 backdrop-blur-sm text-[11px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            ภาพปก
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSetCover(photo.url);
                            }}
                            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[7px] bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                          >
                            ตั้งปก
                          </button>
                        )}

                        {!isSelectMode && visiblePhotos.length > 1 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() =>
                                void handleNudgePhoto(photo.url, -1)
                              }
                              aria-label="เลื่อนไปทางซ้าย"
                              className="h-6.5 w-6.5 rounded-[7px] bg-white/92 dark:bg-[#222222]/92 text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-35"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === visiblePhotos.length - 1}
                              onClick={() =>
                                void handleNudgePhoto(photo.url, 1)
                              }
                              aria-label="เลื่อนไปทางขวา"
                              className="h-6.5 w-6.5 rounded-[7px] bg-white/92 dark:bg-[#222222]/92 text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-35"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {activeSpace === "all" && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-[6px] bg-black/58 backdrop-blur-sm text-white text-[10.5px] font-medium">
                            {getRoomPhotoSpaceDef(photo.space).labelTh}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isSelectMode) toggleSelectUrl(photo.url);
                          else openPhotoDetail(photo.url);
                        }}
                        className="w-full text-left px-0.5 cursor-pointer"
                      >
                        {photo.captionTh ? (
                          <p className="text-[12.5px] text-[var(--color-text-primary)] line-clamp-1">
                            {photo.captionTh}
                          </p>
                        ) : (
                          <p className="text-[12px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                            เพิ่มคำอธิบายรูป (SEO)...
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          LEVEL 2: SINGLE PHOTO DETAIL EDITOR (Cover · Space · SEO/AEO Caption)
      ====================================================================== */}
      {level === "detail" && activePhoto && (
        <div
          key={`detail-${activePhoto.url}`}
          className={`grid grid-cols-1 gap-6 items-start ${
            embedded
              ? "md:grid-cols-[minmax(0,1fr)_300px]"
              : "lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
          } ${paneAnimClass}`}
        >
          {/* Left: Large Photo Preview + Prev/Next */}
          <div className="space-y-3.5">
            <div className="relative w-full aspect-[4/3] rounded-[16px] overflow-hidden bg-[var(--color-background-muted)]">
              <img
                src={activePhoto.url}
                alt={activePhoto.captionTh || room.nameTh}
                className="w-full h-full object-cover"
              />
              {activePhotoGlobalIndex === 0 && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-[8px] bg-white/94 dark:bg-[#222222]/92 backdrop-blur-sm text-[12px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  ภาพปกหลักของห้อง
                </span>
              )}
            </div>

            {visiblePhotos.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] text-[var(--color-text-secondary)] tabular-nums">
                  รูปที่ {Math.max(1, activePhotoVisibleIndex + 1)} จาก{" "}
                  {visiblePhotos.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepDetailPhoto("prev")}
                    className="h-8.5 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDetailPhoto("next")}
                    className="h-8.5 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>ถัดไป</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Cover · Space · SEO Caption */}
          <div className="divide-y divide-[var(--color-border)]">
            <div className="pb-5 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {activePhotoGlobalIndex === 0 ? (
                  <div className="h-9.5 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[var(--color-success)]" />
                    <span>เป็นภาพปกหลักอยู่แล้ว</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSetCover(activePhoto.url)}
                    className="h-9.5 px-3.5 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>ตั้งเป็นภาพปกหลัก</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleDeletePhoto(activePhoto.url)}
                  className="h-9.5 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-medium text-[var(--color-error)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูป</span>
                </button>
              </div>
            </div>

            <div className="py-5 space-y-2.5">
              <h4 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                หมวดหมู่พื้นที่
              </h4>
              <StandardSelectField
                label="พื้นที่ของรูปภาพนี้"
                value={activePhoto.space}
                onChange={(nextSpace) => {
                  void handleChangePhotoSpace(
                    activePhoto.url,
                    nextSpace as RoomPhotoSpaceId
                  );
                }}
                options={ROOM_PHOTO_SPACES.map((s) => ({
                  value: s.id,
                  label: s.labelTh,
                  description: s.descriptionTh,
                }))}
              />
            </div>

            <div className="pt-5 space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  คำอธิบายรูปภาพ (SEO / AEO)
                </h4>
                <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                  ใช้แสดงเป็น alt text, แคปชันบนหน้าร้าน และ Schema สำหรับ Google / AI
                </p>
              </div>

              <StandardTextarea
                label="คำอธิบายสั้นๆ ของรูปนี้"
                optionalText={`${captionDraft.length} / 250`}
                rows={4}
                maxLength={250}
                placeholder={
                  getRoomPhotoSpaceDef(activePhoto.space).placeholderCaptionTh
                }
                value={captionDraft}
                onChange={(e) => {
                  setCaptionDraft(e.target.value);
                  setIsCaptionDirty(true);
                }}
              />

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {isCaptionDirty
                    ? "ยังไม่บันทึก"
                    : activePhoto.captionTh
                    ? "บันทึกแล้ว"
                    : "ไม่บังคับ"}
                </span>

                <button
                  type="button"
                  disabled={isSaving || !isCaptionDirty}
                  onClick={() => void handleSaveCaption()}
                  className="h-9.5 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] !text-white dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกคำอธิบาย</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MOVE PHOTOS MODAL (Compact Thai 7-Space Picker for Multi-Select)
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title={`ย้าย ${selectedUrls.size} รูปไปหมวดหมู่พื้นที่`}
        subtitle="เลือกพื้นที่ปลายทางสำหรับรูปภาพที่เลือกไว้"
        maxWidthClass="max-w-[540px]"
      >
        <div className="divide-y divide-[var(--color-border)]">
          {ROOM_PHOTO_SPACES.map((space) => {
            const Icon = getSpaceIcon(space.id);
            const existingCount = photos.filter(
              (p) => p.space === space.id
            ).length;
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => void handleBulkMove(space.id)}
                className="w-full py-3.5 px-2 -mx-2 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 stroke-[1.7]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {space.labelTh}
                    </p>
                    <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
                      {space.descriptionTh}
                    </p>
                  </div>
                </div>
                <span className="text-[12.5px] text-[var(--color-text-tertiary)] shrink-0 tabular-nums">
                  {existingCount} รูป
                </span>
              </button>
            );
          })}
        </div>
        <div className="pt-4 mt-2 border-t border-[var(--color-border)] flex justify-end">
          <button
            type="button"
            onClick={() => setIsMoveModalOpen(false)}
            className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-medium text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>ยกเลิก</span>
          </button>
        </div>
      </StudioSheetModal>
    </div>
  );
}
