import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const CreatePinSchema = z.object({
  hotelSlug: z.string().optional(),
  roomId: z.string().trim().optional().nullable(),
  category: z.enum(["ROOMS", "VIEWS", "VIDEOS", "DINING", "REVIEWS"]),
  titleTh: z.string().trim().max(160).optional().default(""),
  descriptionTh: z.string().trim().max(800).optional().default(""),
  coverImageUrl: z.string().trim().min(1),
  mediaUrls: z.array(z.string().trim().min(1)).optional(),
  videoUrl: z.string().trim().optional().nullable(),
  aspectRatio: z.string().trim().optional(),
  stayStyles: z.array(z.string()).optional(),
});

const PatchPinSchema = z.object({
  hotelSlug: z.string().optional(),
  pinId: z.string().trim().min(1),
  publishStatus: z.enum(["PUBLISHED", "PENDING_APPROVAL", "DISCARDED"]).optional(),
  roomId: z.string().trim().optional().nullable(),
  titleTh: z.string().trim().max(160).optional(),
  descriptionTh: z.string().trim().max(800).optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = CreatePinSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูล Pin ไม่ครบ" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const styles =
      parsed.data.stayStyles && parsed.data.stayStyles.length > 0
        ? parsed.data.stayStyles
        : hotel.stayStyles;

    const allMediaUrls = Array.from(
      new Set([
        parsed.data.coverImageUrl,
        ...(parsed.data.mediaUrls ?? []),
      ])
    );

    const pin = await prisma.pin.create({
      data: {
        hotelId: hotel.id,
        roomId: parsed.data.roomId || null,
        mediaType: "PHOTO",
        category: parsed.data.category,
        titleTh: parsed.data.titleTh,
        descriptionTh: parsed.data.descriptionTh || "",
        coverImageUrl: parsed.data.coverImageUrl,
        mediaUrls: allMediaUrls,
        videoUrl: null,
        aspectRatio: parsed.data.aspectRatio || "aspect-[3/4]",
        provinceId: hotel.provinceId,
        stayStyles: styles,
        semanticTags: styles,
        publishStatus: "PUBLISHED",
      },
    });

    return NextResponse.json({ pin }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "สร้าง Pin ไม่สำเร็จ" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = PatchPinSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const existing = await prisma.pin.findFirst({
      where: { id: parsed.data.pinId, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบ Pin นี้" }, { status: 404 });
    }

    const updated = await prisma.pin.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.publishStatus !== undefined
          ? { publishStatus: parsed.data.publishStatus }
          : {}),
        ...(parsed.data.roomId !== undefined
          ? { roomId: parsed.data.roomId || null }
          : {}),
        ...(parsed.data.titleTh !== undefined
          ? { titleTh: parsed.data.titleTh }
          : {}),
        ...(parsed.data.descriptionTh !== undefined
          ? { descriptionTh: parsed.data.descriptionTh }
          : {}),
      },
    });

    return NextResponse.json({ pin: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดต Pin ไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.pin.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบ Pin ไม่สำเร็จ" }, { status: 400 });
  }
}

