import type { ImageLoaderProps } from "next/image";
import { rewriteImageUrlForWidth } from "./mediaUtils";

/**
 * Custom Next.js Image loader that delegates resizing & format negotiation
 * directly to Cloudinary / Unsplash CDNs instead of Vercel Image Optimization
 * (`/_next/image`), keeping image delivery fast and free of Vercel image quotas.
 */
export default function cangaroomImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const safeQuality = quality ?? 80;
  const cloudinaryQuality = safeQuality >= 85 ? "q_auto:best" : "q_auto:good";

  return rewriteImageUrlForWidth(src, width, safeQuality, cloudinaryQuality)
    .url;
}
