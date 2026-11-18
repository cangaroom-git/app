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
      autoPosterUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
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
  maxDimension: number = folder === "hero" || folder === "rooms" ? 1920 : 1440
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
    quality: folder === "hero" || folder === "rooms" ? 0.86 : 0.82,
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

export type PinImageVariant = "thumb" | "card" | "gallery" | "hero" | "full";

interface VariantSpec {
  width: number;
  quality: number;
  cloudinaryQuality: "q_auto:good" | "q_auto:best";
  srcSetWidths: readonly number[];
  sizes: string;
}

const VARIANT_CONFIG: Record<PinImageVariant, VariantSpec> = {
  thumb: {
    width: 200,
    quality: 82,
    cloudinaryQuality: "q_auto:good",
    srcSetWidths: [160, 280],
    sizes: "64px",
  },
  card: {
    width: 600,
    quality: 82,
    cloudinaryQuality: "q_auto:good",
    srcSetWidths: [400, 640, 840],
    sizes: "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px",
  },
  gallery: {
    width: 800,
    quality: 85,
    cloudinaryQuality: "q_auto:good",
    srcSetWidths: [480, 800, 1120],
    sizes: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 320px",
  },
  hero: {
    width: 1280,
    quality: 86,
    cloudinaryQuality: "q_auto:best",
    srcSetWidths: [800, 1280, 1680],
    sizes: "(max-width: 1023px) 100vw, 560px",
  },
  full: {
    width: 1800,
    quality: 88,
    cloudinaryQuality: "q_auto:best",
    srcSetWidths: [1200, 1800, 2200],
    sizes: "95vw",
  },
};

export const PIN_IMAGE_SIZES: Record<PinImageVariant, string> = {
  thumb: VARIANT_CONFIG.thumb.sizes,
  card: VARIANT_CONFIG.card.sizes,
  gallery: VARIANT_CONFIG.gallery.sizes,
  hero: VARIANT_CONFIG.hero.sizes,
  full: VARIANT_CONFIG.full.sizes,
};

function rewriteImageUrlForWidth(
  rawUrl: string,
  targetW: number,
  quality: number,
  cloudinaryQuality: "q_auto:good" | "q_auto:best"
): { url: string; supportsResponsiveWidth: boolean } {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { url: rawUrl, supportsResponsiveWidth: false };
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname === "images.unsplash.com") {
      const origW = Number(parsed.searchParams.get("w")) || 0;
      const origH = Number(parsed.searchParams.get("h")) || 0;
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", parsed.searchParams.get("fit") || "crop");
      parsed.searchParams.set("w", String(targetW));
      if (origW > 0 && origH > 0) {
        parsed.searchParams.set(
          "h",
          String(Math.max(1, Math.round((origH / origW) * targetW)))
        );
      }
      parsed.searchParams.set("q", String(quality));
      return { url: parsed.toString(), supportsResponsiveWidth: true };
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
            parsed.pathname = `${prefix}f_auto,${cloudinaryQuality},w_${targetW}/${rest}`;
            return { url: parsed.toString(), supportsResponsiveWidth: true };
          }
          const wMatch = firstSeg.match(/w_(\d+)/);
          const hMatch = firstSeg.match(/h_(\d+)/);
          const origW = wMatch ? Number(wMatch[1]) : 0;
          const origH = hMatch ? Number(hMatch[1]) : 0;
          let updatedSeg = firstSeg;
          if (/f_[^,]+/.test(updatedSeg)) {
            updatedSeg = updatedSeg.replace(/f_[^,]+/, "f_auto");
          } else {
            updatedSeg = `${updatedSeg},f_auto`;
          }
          if (/q_[^,]+/.test(updatedSeg)) {
            updatedSeg = updatedSeg.replace(/q_[^,]+/, cloudinaryQuality);
          } else {
            updatedSeg = `${updatedSeg},${cloudinaryQuality}`;
          }
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
          return { url: parsed.toString(), supportsResponsiveWidth: true };
        }
      }
    }
  } catch {
    return { url: rawUrl, supportsResponsiveWidth: false };
  }

  return { url: rawUrl, supportsResponsiveWidth: false };
}

/**
 * Rewrites Unsplash / Cloudinary CDN URLs to an exact width/quality preset
 * while strictly preserving the original aspect ratio (prevents downloading
 * 1680px images on 175px mobile cards or 58px thumbnails!).
 */
export function getOptimizedPinImageUrl(
  rawUrl: string,
  variant: PinImageVariant
): string {
  const spec = VARIANT_CONFIG[variant];
  return rewriteImageUrlForWidth(
    rawUrl,
    spec.width,
    spec.quality,
    spec.cloudinaryQuality
  ).url;
}

/**
 * Builds a responsive `srcSet` string (`400w, 640w, ...`) for Unsplash and
 * Cloudinary URLs so 2x/3x Retina displays select sharp AVIF/WebP candidates.
 */
export function getOptimizedPinImageSrcSet(
  rawUrl: string,
  variant: PinImageVariant
): string | undefined {
  const spec = VARIANT_CONFIG[variant];
  const probe = rewriteImageUrlForWidth(
    rawUrl,
    spec.width,
    spec.quality,
    spec.cloudinaryQuality
  );
  if (!probe.supportsResponsiveWidth) {
    return undefined;
  }
  return spec.srcSetWidths
    .map((w) => {
      const entry = rewriteImageUrlForWidth(
        rawUrl,
        w,
        spec.quality,
        spec.cloudinaryQuality
      );
      return `${entry.url} ${w}w`;
    })
    .join(", ");
}

/**
 * Optimizes Cloudinary video URLs with automatic codec (`vc_auto`), format
 * (`f_auto`), perceptual quality (`q_auto:good` / `q_auto:best`), and width cap.
 */
export function getOptimizedVideoUrl(
  rawUrl: string,
  variant: "card" | "hero"
): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return rawUrl;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "res.cloudinary.com") {
      const marker = "/video/upload/";
      const markerIdx = parsed.pathname.indexOf(marker);
      if (markerIdx !== -1) {
        const prefix = parsed.pathname.slice(0, markerIdx + marker.length);
        const rest = parsed.pathname.slice(markerIdx + marker.length);
        const slashIdx = rest.indexOf("/");
        if (slashIdx > 0) {
          const firstSeg = rest.slice(0, slashIdx);
          if (/^v\d+$/.test(firstSeg)) {
            const transform =
              variant === "hero"
                ? "f_auto,vc_auto,q_auto:best,w_1280,c_limit"
                : "f_auto,vc_auto,q_auto:good,w_640,c_limit";
            parsed.pathname = `${prefix}${transform}/${rest}`;
            return parsed.toString();
          }
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
 * Warms Retina-appropriate hero image variants in the browser cache
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
  const heroUrl = getOptimizedPinImageUrl(cover, "hero");
  const heroSrcSet = getOptimizedPinImageSrcSet(cover, "hero");
  const cacheKey = `${heroUrl}|${heroSrcSet || ""}`;

  if (preloadedHeroUrls.has(cacheKey)) return;
  if (preloadedHeroUrls.size >= 120) {
    preloadedHeroUrls.clear();
  }
  preloadedHeroUrls.add(cacheKey);

  const img = new window.Image();
  img.decoding = "async";
  img.sizes = PIN_IMAGE_SIZES.hero;
  if (heroSrcSet) {
    img.srcset = heroSrcSet;
  }
  img.src = heroUrl;
}

