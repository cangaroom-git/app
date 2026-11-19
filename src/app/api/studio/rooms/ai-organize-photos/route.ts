import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { analyzeImageWithGemini } from "@/lib/ai/geminiImageModeration";
import { prisma } from "@/lib/prisma";
import {
  MAX_PHOTOS_PER_ROOM,
  serializeRoomPhotos,
  type RoomPhotoMeta,
} from "@/lib/roomPhotoSpaces";

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
]);

const RequestSchema = z.object({
  hotelSlug: z.string().optional(),
  roomId: z.string().optional(),
  photos: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(1200),
        space: z
          .enum([
            "bedroom",
            "bathroom",
            "balcony",
            "pool",
            "living",
            "exterior",
            "additional",
          ])
          .optional(),
        captionTh: z.string().trim().max(300).optional(),
      })
    )
    .min(1)
    .max(MAX_PHOTOS_PER_ROOM),
  onlyMissing: z.boolean().optional(),
});

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function detectMimeFromBuffer(buffer: Buffer): string {
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45
  ) {
    return "image/webp";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return "image/png";
  }
  return "image/jpeg";
}

async function loadSafeImageBuffer(
  rawUrl: string
): Promise<{ buffer: Buffer; mimeType: string; isLocalOrExternal: boolean } | null> {
  // 1. Local allowlisted /uploads/... path
  if (rawUrl.startsWith("/uploads/")) {
    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const rel = rawUrl.replace(/^\/uploads\//, "");
    const targetPath = path.resolve(uploadsRoot, rel);
    if (!targetPath.startsWith(uploadsRoot + path.sep)) return null;
    try {
      const buffer = await readFile(targetPath);
      return {
        buffer,
        mimeType: detectMimeFromBuffer(buffer),
        isLocalOrExternal: true,
      };
    } catch {
      return null;
    }
  }

  // 2. Allowlisted HTTPS hosts only (strict SSRF protection)
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_REMOTE_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  try {
    const res = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength <= 0 || arrayBuf.byteLength > 15 * 1024 * 1024) {
      return null;
    }
    const buffer = Buffer.from(arrayBuf);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const alreadyOnOurCloudinaryWebp =
      Boolean(cloudName) &&
      parsed.hostname.toLowerCase() === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/`) &&
      rawUrl.toLowerCase().endsWith(".webp") &&
      buffer.length <= 750 * 1024;

    return {
      buffer,
      mimeType: detectMimeFromBuffer(buffer),
      isLocalOrExternal: !alreadyOnOurCloudinaryWebp,
    };
  } catch {
    return null;
  }
}

async function compressToCloudinaryWebp(buffer: Buffer): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  try {
    const uploaded = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "my-hotel/rooms",
            resource_type: "image",
            format: "webp",
            transformation: [
              { width: 1920, height: 1920, crop: "limit" },
              { quality: "auto:good" },
            ],
          },
          (err, result) => {
            if (err || !result?.secure_url) {
              reject(err || new Error("Cloudinary optimize failed"));
              return;
            }
            resolve({ secure_url: result.secure_url });
          }
        );
        stream.end(buffer);
      }
    );
    return uploaded.secure_url;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลรูปภาพไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const onlyMissing = parsed.data.onlyMissing ?? true;

    type ItemOutcome = {
      photo: RoomPhotoMeta | null;
      flagged?: { url: string; reason: string };
      processed: boolean;
      categorized: boolean;
      captioned: boolean;
      compressed: boolean;
    };

    const items = parsed.data.photos;
    const outcomes: ItemOutcome[] = new Array(items.length);

    // Process up to 3 photos concurrently (3x faster than sequential) while preserving exact order
    const CONCURRENCY = 3;
    let cursor = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const idx = cursor;
        cursor += 1;
        const item = items[idx];

        const currentSpace = item.space ?? "additional";
        const currentCaption = item.captionTh?.trim() || "";
        const needsAi =
          !onlyMissing ||
          currentSpace === "additional" ||
          currentCaption.length < 8;
        const needsCompressCheck =
          !onlyMissing ||
          item.url.startsWith("/uploads/") ||
          (item.url.includes("res.cloudinary.com/") &&
            !item.url.toLowerCase().includes(".webp"));

        // Fast-path: photo is already categorized, captioned, and optimized WebP -> skip in 0ms!
        if (!needsAi && !needsCompressCheck) {
          outcomes[idx] = {
            photo: {
              url: item.url,
              space: currentSpace,
              ...(currentCaption ? { captionTh: currentCaption } : {}),
            },
            processed: false,
            categorized: false,
            captioned: false,
            compressed: false,
          };
          continue;
        }

        const loaded = await loadSafeImageBuffer(item.url);
        if (!loaded) {
          outcomes[idx] = {
            photo: {
              url: item.url,
              space: currentSpace,
              ...(currentCaption ? { captionTh: currentCaption } : {}),
            },
            processed: false,
            categorized: false,
            captioned: false,
            compressed: false,
          };
          continue;
        }

        let finalUrl = item.url;
        let finalSpace = currentSpace;
        let finalCaption = currentCaption;
        let processed = false;
        let categorized = false;
        let captioned = false;
        let compressed = false;

        // 1. Re-compress oversized or local/non-WebP image into lightweight Cloudinary WebP
        if (loaded.isLocalOrExternal && isCloudinaryConfigured()) {
          const optimizedUrl = await compressToCloudinaryWebp(loaded.buffer);
          if (optimizedUrl) {
            finalUrl = optimizedUrl;
            compressed = true;
          }
        }

        // 2. Run Gemini Vision moderation + space categorization + Thai SEO caption ONLY when needed
        if (needsAi) {
          processed = true;
          const ai = await analyzeImageWithGemini(
            loaded.buffer,
            loaded.mimeType,
            "rooms"
          );
          if (ai.decision === "BLOCK") {
            outcomes[idx] = {
              photo: null,
              flagged: {
                url: finalUrl,
                reason:
                  ai.reasonTh ||
                  "ตรวจพบเนื้อหาที่ไม่เกี่ยวข้องกับที่พักหรือไม่เหมาะสม",
              },
              processed: true,
              categorized: false,
              captioned: false,
              compressed,
            };
            continue;
          }
          if (ai.checked) {
            if (
              ai.suggestedSpace &&
              (finalSpace === "additional" || !onlyMissing)
            ) {
              if (ai.suggestedSpace !== finalSpace) categorized = true;
              finalSpace = ai.suggestedSpace;
            }
            if (ai.suggestedCaptionTh && (finalCaption.length < 8 || !onlyMissing)) {
              finalCaption = ai.suggestedCaptionTh;
              captioned = true;
            }
          }
        }

        outcomes[idx] = {
          photo: {
            url: finalUrl,
            space: finalSpace,
            ...(finalCaption ? { captionTh: finalCaption } : {}),
          },
          processed,
          categorized,
          captioned,
          compressed,
        };
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())
    );

    const updatedPhotos: RoomPhotoMeta[] = [];
    const flagged: Array<{ url: string; reason: string }> = [];
    let processedCount = 0;
    let categorizedCount = 0;
    let captionedCount = 0;
    let compressedCount = 0;

    for (const out of outcomes) {
      if (!out) continue;
      if (out.processed) processedCount += 1;
      if (out.categorized) categorizedCount += 1;
      if (out.captioned) captionedCount += 1;
      if (out.compressed) compressedCount += 1;
      if (out.flagged) flagged.push(out.flagged);
      if (out.photo) updatedPhotos.push(out.photo);
    }

    const serialized = serializeRoomPhotos(updatedPhotos);

    // Persist directly to DB if editing an existing room owned by this hotel
    if (parsed.data.roomId) {
      const existing = await prisma.room.findFirst({
        where: { id: parsed.data.roomId, hotelId: hotel.id },
        select: { id: true },
      });
      if (existing) {
        await prisma.room.update({
          where: { id: existing.id },
          data: {
            galleryUrls: serialized.galleryUrls,
            galleryMetaJson:
              serialized.galleryMetaJson as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    return NextResponse.json({
      photos: serialized.galleryMetaJson,
      flagged,
      stats: {
        processedCount,
        categorizedCount,
        captionedCount,
        compressedCount,
        flaggedCount: flagged.length,
      },
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[POST /api/studio/rooms/ai-organize-photos]", err);
    return NextResponse.json(
      { error: "ไม่สามารถให้ AI จัดการรูปภาพได้ในขณะนี้" },
      { status: 500 }
    );
  }
}
