import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";

const ALLOWED_FOLDERS = z.enum([
  "hero",
  "rooms",
  "coupons",
  "addons",
  "gallery",
  "pins",
  "slips",
  "logos",
  "reviews",
]);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB post-compression ceiling

type DetectedImageFormat = "webp" | "jpg" | "png" | "gif" | "avif";

/**
 * Verifies image magic bytes directly from the binary buffer (OWASP file-upload safety).
 */
function detectSafeImageFormat(buffer: Buffer): DetectedImageFormat | null {
  if (buffer.length < 12) return null;

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // GIF: "GIF8"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "gif";
  }

  // AVIF: .... "ftypavif" or "ftypavis"
  const ftypSlice = buffer.subarray(4, 12).toString("ascii");
  if (ftypSlice === "ftypavif" || ftypSlice === "ftypavis") {
    return "avif";
  }

  return null;
}

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawFile = formData.get("file");
    const rawFolder = formData.get("folder");

    const parsedFolder = ALLOWED_FOLDERS.safeParse(
      typeof rawFolder === "string" ? rawFolder : "rooms"
    );
    if (!parsedFolder.success) {
      return NextResponse.json(
        { error: "หมวดหมู่ไฟล์ไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    if (!(rawFile instanceof File)) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์รูปภาพที่อัปโหลด" },
        { status: 422 }
      );
    }

    if (rawFile.size <= 0 || rawFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB" },
        { status: 422 }
      );
    }

    const arrayBuffer = await rawFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedFormat = detectSafeImageFormat(buffer);

    if (!detectedFormat) {
      return NextResponse.json(
        { error: "รูปแบบไฟล์รูปภาพไม่ถูกต้อง กรุณาใช้ JPG, PNG หรือ WebP" },
        { status: 422 }
      );
    }

    const folder = parsedFolder.data;

    // 1. Primary: Upload compressed WebP directly to Cloudinary when keys are configured
    if (isCloudinaryConfigured()) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });

      const uploaded = await new Promise<{
        secure_url: string;
        bytes: number;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `my-hotel/${folder}`,
            resource_type: "image",
            format: "webp",
            transformation: [{ quality: "auto:good" }],
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              reject(error || new Error("Cloudinary upload failed"));
              return;
            }
            resolve({
              secure_url: result.secure_url,
              bytes: result.bytes ?? buffer.length,
            });
          }
        );
        uploadStream.end(buffer);
      });

      return NextResponse.json({
        url: uploaded.secure_url,
        provider: "cloudinary",
        bytes: uploaded.bytes,
      });
    }

    // 2. Automatic Local Development Fallback: Write into allowlisted public/uploads/<folder>/<uuid>.<ext>
    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const targetDir = path.resolve(uploadsRoot, folder);
    if (!targetDir.startsWith(uploadsRoot + path.sep)) {
      return NextResponse.json(
        { error: "ไม่อนุญาตให้บันทึกนอกโฟลเดอร์ที่กำหนด" },
        { status: 403 }
      );
    }

    await mkdir(targetDir, { recursive: true });
    const fileName = `${randomUUID()}.${detectedFormat}`;
    const targetFilePath = path.join(targetDir, fileName);
    await writeFile(targetFilePath, buffer);

    return NextResponse.json({
      url: `/uploads/${folder}/${fileName}`,
      provider: "local",
      bytes: buffer.length,
    });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

