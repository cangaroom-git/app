export type VideoProviderType = "youtube" | "facebook" | "mp4";

export interface ParsedVideoSource {
  provider: VideoProviderType;
  originalUrl: string;
  embedUrl: string;
  youtubeId?: string;
  autoPosterUrl?: string;
  isVerticalHint?: boolean;
}

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a safe 11-character YouTube video ID from standard watch URLs,
 * youtu.be short links, embed URLs, or YouTube Shorts URLs.
 */
export function extractYouTubeId(rawUrl: string): {
  videoId: string | null;
  isShortsUrl: boolean;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { videoId: null, isShortsUrl: false };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return {
        videoId: YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null,
        isShortsUrl: false,
      };
    }

    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "music.youtube.com"
    ) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "shorts" && segments[1]) {
        return {
          videoId: YOUTUBE_ID_PATTERN.test(segments[1]) ? segments[1] : null,
          isShortsUrl: true,
        };
      }
      if (
        (segments[0] === "embed" || segments[0] === "live") &&
        segments[1]
      ) {
        return {
          videoId: YOUTUBE_ID_PATTERN.test(segments[1]) ? segments[1] : null,
          isShortsUrl: false,
        };
      }
      const queryVideoId = parsed.searchParams.get("v") || "";
      if (YOUTUBE_ID_PATTERN.test(queryVideoId)) {
        return { videoId: queryVideoId, isShortsUrl: false };
      }
    }
  } catch {
    // Ignore malformed URLs
  }

  return { videoId: null, isShortsUrl: false };
}

/**
 * Checks whether a URL belongs to Facebook Video / Facebook Reels.
 */
export function isFacebookVideoUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "fb.watch") {
      return true;
    }
    if (host === "facebook.com" || host === "web.facebook.com") {
      return (
        parsed.pathname.includes("/reel/") ||
        parsed.pathname.includes("/reels/") ||
        parsed.pathname.includes("/videos/") ||
        parsed.pathname.includes("/watch") ||
        parsed.pathname.includes("/share/r/") ||
        parsed.pathname.includes("/share/v/")
      );
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Parses YouTube, YouTube Shorts, Facebook Video/Reel, or direct MP4 URLs
 * into a unified playback & thumbnail descriptor.
 */
export function parseVideoSource(
  rawUrl: string,
  options?: { autoplay?: boolean; muted?: boolean; forceVertical?: boolean }
): ParsedVideoSource {
  const cleanUrl = rawUrl.trim();
  const autoplay = options?.autoplay ?? true;
  const muted = options?.muted ?? false;
  const forceVertical = options?.forceVertical ?? false;

  const { videoId, isShortsUrl } = extractYouTubeId(cleanUrl);
  if (videoId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: muted ? "1" : "0",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      loop: "1",
      playlist: videoId,
    });
    return {
      provider: "youtube",
      originalUrl: cleanUrl,
      youtubeId: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`,
      autoPosterUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      isVerticalHint: isShortsUrl,
    };
  }

  if (isFacebookVideoUrl(cleanUrl)) {
    const isReel =
      forceVertical ||
      cleanUrl.includes("/reel/") ||
      cleanUrl.includes("/reels/") ||
      cleanUrl.includes("/share/r/");
    const params = new URLSearchParams({
      href: cleanUrl,
      show_text: "false",
      autoplay: autoplay ? "true" : "false",
      mute: muted ? "1" : "0",
      ...(isReel ? { width: "360", height: "640" } : {}),
    });
    return {
      provider: "facebook",
      originalUrl: cleanUrl,
      embedUrl: `https://www.facebook.com/plugins/video.php?${params.toString()}`,
      isVerticalHint: isReel,
    };
  }

  return {
    provider: "mp4",
    originalUrl: cleanUrl,
    embedUrl: cleanUrl,
  };
}

export type UploadMediaFolder =
  | "hero"
  | "rooms"
  | "coupons"
  | "addons"
  | "gallery"
  | "shorts"
  | "reviews"
  | "stories";

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image File in the browser into a lightweight WebP (~120-260 KB)
 * before uploading to Cloudinary so the 25-credit free tier lasts 15-20x longer.
 */
export async function compressImageToWebP(
  file: File,
  options?: CompressImageOptions
): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  const maxWidth = options?.maxWidth ?? 1440;
  const maxHeight = options?.maxHeight ?? 1440;
  const quality = options?.quality ?? 0.82;

  return new Promise<File>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const scale = Math.min(
          maxWidth / targetWidth,
          maxHeight / targetHeight
        );
        targetWidth = Math.max(1, Math.round(targetWidth * scale));
        targetHeight = Math.max(1, Math.round(targetHeight * scale));
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพนี้ได้ กรุณาใช้ไฟล์ JPG, PNG หรือ WebP"));
    };

    img.src = objectUrl;
  });
}

export interface UploadedImageResult {
  url: string;
  provider: "cloudinary" | "local";
  bytes: number;
}

/**
 * Compresses an image client-side to WebP and uploads it via `/api/media/upload`
 * (Cloudinary primary + automatic local `public/uploads` fallback in dev).
 */
export async function uploadOptimizedImage(
  rawFile: File,
  folder: UploadMediaFolder,
  maxDimension: number = 1440
): Promise<UploadedImageResult> {
  if (!rawFile.type.startsWith("image/")) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP, GIF, AVIF)");
  }
  if (rawFile.size > 18 * 1024 * 1024) {
    throw new Error("ไฟล์รูปภาพต้นฉบับต้องมีขนาดไม่เกิน 18 MB");
  }

  const webpFile = await compressImageToWebP(rawFile, {
    maxWidth: maxDimension,
    maxHeight: maxDimension,
    quality: 0.82,
  });

  const formData = new FormData();
  formData.append("file", webpFile);
  formData.append("folder", folder);

  const response = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | (UploadedImageResult & { error?: string })
    | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
  }

  return {
    url: payload.url,
    provider: payload.provider,
    bytes: payload.bytes ?? webpFile.size,
  };
}

export function formatKilobytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type PinImageVariant = "thumb" | "card" | "hero";

const VARIANT_CONFIG: Record<
  PinImageVariant,
  { width: number; quality: number }
> = {
  thumb: { width: 160, quality: 72 },
  card: { width: 480, quality: 75 },
  hero: { width: 1080, quality: 82 },
};

/**
 * Rewrites Unsplash / Cloudinary CDN URLs to an exact width/quality preset
 * while strictly preserving the original aspect ratio (prevents downloading
 * 1080px+ images on 175px mobile cards or 58px thumbnails!).
 */
export function getOptimizedPinImageUrl(
  rawUrl: string,
  variant: PinImageVariant
): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return rawUrl;

  const { width: targetW, quality } = VARIANT_CONFIG[variant];

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname === "images.unsplash.com") {
      const origW = Number(parsed.searchParams.get("w")) || 0;
      const origH = Number(parsed.searchParams.get("h")) || 0;
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("w", String(targetW));
      if (origW > 0 && origH > 0) {
        parsed.searchParams.set(
          "h",
          String(Math.max(1, Math.round((origH / origW) * targetW)))
        );
      }
      parsed.searchParams.set("q", String(quality));
      return parsed.toString();
    }

    if (parsed.hostname === "res.cloudinary.com") {
      const marker = "/image/upload/";
      const markerIdx = parsed.pathname.indexOf(marker);
      if (markerIdx !== -1) {
        const prefix = parsed.pathname.slice(0, markerIdx + marker.length);
        const rest = parsed.pathname.slice(markerIdx + marker.length);
        const slashIdx = rest.indexOf("/");
        if (slashIdx > 0) {
          const firstSeg = rest.slice(0, slashIdx);
          if (/^v\d+$/.test(firstSeg)) {
            parsed.pathname = `${prefix}f_auto,q_auto,w_${targetW}/${rest}`;
            return parsed.toString();
          }
          const wMatch = firstSeg.match(/w_(\d+)/);
          const hMatch = firstSeg.match(/h_(\d+)/);
          const origW = wMatch ? Number(wMatch[1]) : 0;
          const origH = hMatch ? Number(hMatch[1]) : 0;
          let updatedSeg = firstSeg;
          if (wMatch) {
            updatedSeg = updatedSeg.replace(/w_\d+/, `w_${targetW}`);
          } else {
            updatedSeg = `${updatedSeg},w_${targetW}`;
          }
          if (hMatch && origW > 0 && origH > 0) {
            const nextH = Math.max(1, Math.round((origH / origW) * targetW));
            updatedSeg = updatedSeg.replace(/h_\d+/, `h_${nextH}`);
          }
          parsed.pathname = `${prefix}${updatedSeg}${rest.slice(slashIdx)}`;
          return parsed.toString();
        }
      }
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

/**
 * Converts a Tailwind aspectRatio class (`aspect-[3/4]`, `aspect-[4/5]`, etc.)
 * into a standard CSS `aspect-ratio` value so inline stages match card shapes
 * identically on frame 0 without layout jumps or post-load resizing.
 */
export function resolveAspectRatioCss(aspectClass?: string | null): string {
  const s = aspectClass || "";
  if (s.includes("16/9")) return "16 / 9";
  if (s.includes("4/3")) return "4 / 3";
  if (s.includes("1/1")) return "1 / 1";
  if (s.includes("5/6")) return "5 / 6";
  if (s.includes("4/5")) return "4 / 5";
  if (s.includes("3/4")) return "3 / 4";
  if (s.includes("2/3")) return "2 / 3";
  if (s.includes("3/5")) return "3 / 5";
  if (s.includes("9/16")) return "9 / 16";
  return "3 / 4";
}

const preloadedHeroUrls = new Set<string>();

/**
 * Warms both card (480w) and hero (1080w) image variants in the browser cache
 * before a user taps or swipes into an adjacent Pin detail page.
 */
export function preloadPinHeroImages(
  pin:
    | { coverImageUrl: string; mediaUrls?: string[] }
    | null
    | undefined
): void {
  if (typeof window === "undefined" || !pin?.coverImageUrl) return;
  const cover = pin.mediaUrls?.[0] || pin.coverImageUrl;
  const urls = [
    getOptimizedPinImageUrl(cover, "card"),
    getOptimizedPinImageUrl(cover, "hero"),
  ];
  for (const url of urls) {
    if (!url || preloadedHeroUrls.has(url)) continue;
    if (preloadedHeroUrls.size >= 120) {
      preloadedHeroUrls.clear();
    }
    preloadedHeroUrls.add(url);
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}

