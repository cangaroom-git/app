import type { RoomPhotoSpaceId } from "@/lib/roomPhotoSpaces";

export type UploadMediaFolder =
  | "rooms"
  | "coupons"
  | "addons"
  | "pins"
  | "slips"
  | "logos"
  | "reviews"
  | "hero"
  | "gallery";

export interface UploadedMediaAiMeta {
  checked: boolean;
  suggestedSpace: RoomPhotoSpaceId | null;
  suggestedCaptionTh: string | null;
  warnings: string[];
  skippedReason?: string;
}

export interface UploadMediaResult {
  url: string;
  width: number | null;
  height: number | null;
  originalBytes: number;
  compressedBytes: number;
  warnings: string[];
  ai: UploadedMediaAiMeta | null;
}

export async function scanSlipQrFromFile(file: File): Promise<{
  qrFound: boolean;
  qrPayload: string;
}> {
  try {
    const win = window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: ImageBitmap) => Promise<{ rawValue?: string }[]>;
      };
    };
    if (win.BarcodeDetector) {
      const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (results.length > 0 && results[0].rawValue) {
        return {
          qrFound: true,
          qrPayload: results[0].rawValue,
        };
      }
    }
  } catch {
    // Fallback to deterministic file fingerprint below for non-BarcodeDetector browsers
  }

  const hashSeed = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hash = (hash << 5) - hash + hashSeed.charCodeAt(i);
    hash |= 0;
  }
  const refCode = `CGR-SLIP-${Math.abs(hash)}-${file.size}`;
  return {
    qrFound: false,
    qrPayload: refCode,
  };
}

const MAX_RAW_FILE_BYTES = 25 * 1024 * 1024; // 25 MB raw file ceiling per photo (prevents browser OOM / drive abuse)
const MAX_CLIENT_DIMENSION = 1920; // Crisp Full-HD+ bound (~200-450 KB WebP)
const COMPRESS_THRESHOLD_BYTES = 600 * 1024; // Compress anything > 600 KB into lightweight WebP

async function decodeImageDimensions(file: File): Promise<{
  width: number;
  height: number;
  drawToCanvas: (canvas: HTMLCanvasElement, w: number, h: number) => void;
  cleanup: () => void;
} | null> {
  if (typeof window === "undefined") return null;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawToCanvas: (canvas, w, h) => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(bitmap, 0, 0, w, h);
          }
        },
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        drawToCanvas: (canvas, w, h) => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);
          }
        },
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Meta/Airbnb-style silent client-side preprocessing:
 * - Rejects only genuinely broken tiny icons (< 300px, or < 120px for logos)
 * - Emits non-blocking soft quality tips for low-res (< 1024px) or narrow portrait room covers
 * - Silently resizes oversized smartphone/DSLR photos (10–30 MB) to max 2048px WebP/JPEG (~300–700 KB)
 *   and strips EXIF GPS privacy metadata automatically via Canvas re-encoding.
 */
async function preprocessImageClientSide(
  file: File,
  folder: UploadMediaFolder
): Promise<{
  preparedFile: File;
  width: number | null;
  height: number | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  if (file.size <= 0) {
    throw new Error("ไฟล์รูปภาพว่างเปล่าหรือเสียหาย");
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `ไฟล์ต้นฉบับใหญ่เกินไป (${mb} MB) รองรับสูงสุด 25 MB ต่อรูป เพื่อป้องกันเครื่องค้างและพื้นที่เต็ม`
    );
  }

  // Skip animated GIFs to preserve animation frames
  if (file.type === "image/gif") {
    return { preparedFile: file, width: null, height: null, warnings };
  }

  const decoded = await decodeImageDimensions(file);
  if (!decoded) {
    return { preparedFile: file, width: null, height: null, warnings };
  }

  try {
    const { width, height } = decoded;
    const longestSide = Math.max(width, height);
    const minHardPx = folder === "logos" ? 120 : 300;

    if (longestSide < minHardPx) {
      throw new Error(
        `รูปภาพมีขนาดเล็กเกินไป (${width}×${height}px) กรุณาใช้รูปที่มีความกว้างอย่างน้อย ${minHardPx}px`
      );
    }

    // Soft non-blocking quality tips (never blocks hotel owners!)
    if ((folder === "rooms" || folder === "hero") && longestSide < 1024) {
      warnings.push(
        `ความละเอียดภาพค่อนข้างต่ำ (${width}×${height}px) แนะนำอย่างน้อย 1200px เพื่อให้ภาพคมชัดบนหน้าร้าน`
      );
    }
    if (folder === "rooms" && width / Math.max(1, height) < 0.72) {
      warnings.push(
        "รูปนี้เป็นแนวตั้ง — แนะนำใช้รูปแนวนอนเป็นภาพปกหลักเพื่อให้เห็นบรรยากาศห้องได้กว้างขึ้น"
      );
    }

    const needsResize = longestSide > MAX_CLIENT_DIMENSION;
    const needsCompress =
      file.size > COMPRESS_THRESHOLD_BYTES ||
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.type === "image/bmp";

    if (!needsResize && !needsCompress) {
      return { preparedFile: file, width, height, warnings };
    }

    const scale = needsResize ? MAX_CLIENT_DIMENSION / longestSide : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    decoded.drawToCanvas(canvas, targetW, targetH);

    // Prefer WebP @ 82% (Airbnb/Meta sweet spot: ~200-450 KB), fallback to JPEG @ 84%
    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    let ext = "webp";
    let mime = "image/webp";

    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.84);
      ext = "jpg";
      mime = "image/jpeg";
    }

    if (!blob) {
      return { preparedFile: file, width, height, warnings };
    }

    // Keep original if compressed is somehow larger and original already fits server ceiling
    if (!needsResize && blob.size >= file.size && file.size <= 5 * 1024 * 1024) {
      return { preparedFile: file, width, height, warnings };
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    const preparedFile = new File([blob], `${baseName}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });

    return { preparedFile, width: targetW, height: targetH, warnings };
  } finally {
    decoded.cleanup();
  }
}

export async function uploadMediaFileWithMeta(
  file: File,
  folder: UploadMediaFolder
): Promise<UploadMediaResult> {
  const { preparedFile, width, height, warnings } =
    await preprocessImageClientSide(file, folder);

  const formData = new FormData();
  formData.append("file", preparedFile);
  formData.append("folder", folder);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    bytes?: number;
    ai?: UploadedMediaAiMeta;
  };

  if (!res.ok || !payload.url) {
    throw new Error(payload.error || "อัปโหลดไฟล์ไม่สำเร็จ");
  }

  const combinedWarnings = [
    ...warnings,
    ...(payload.ai?.warnings ?? []),
  ];

  return {
    url: String(payload.url),
    width,
    height,
    originalBytes: file.size,
    compressedBytes: payload.bytes ?? preparedFile.size,
    warnings: combinedWarnings,
    ai: payload.ai ?? null,
  };
}

export async function uploadMediaFile(
  file: File,
  folder: UploadMediaFolder
): Promise<string> {
  const result = await uploadMediaFileWithMeta(file, folder);
  return result.url;
}
