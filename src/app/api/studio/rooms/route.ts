import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { normalizeHotelSlug } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";
import {
  MAX_PHOTOS_PER_ROOM,
  MAX_ROOM_AMENITIES,
  normalizeRoomPhotos,
  serializeRoomPhotos,
} from "@/lib/roomPhotoSpaces";

const RoomPhotoMetaSchema = z.object({
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
});

const RoomCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  code: z.string().trim().min(1).max(20),
  nameTh: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  categoryTh: z.string().trim().max(60).optional(),
  categoryEn: z.string().trim().max(60).optional(),
  shortDescTh: z.string().trim().max(800).optional(),
  shortDescEn: z.string().trim().max(800).optional(),
  totalUnits: z.number().int().min(1).max(100),
  weekdayPriceThb: z.number().int().min(100),
  weekendPriceThb: z.number().int().min(100),
  extraGuestPriceThb: z.number().int().min(0).optional(),
  sizeSqm: z.number().int().min(5).max(2000).optional(),
  standardGuests: z.number().int().min(1).max(20).optional(),
  maxGuests: z.number().int().min(1).max(30),
  bedrooms: z.number().int().min(0).max(20).optional(),
  beds: z.number().int().min(1).max(30).optional(),
  bathrooms: z.number().int().min(1).max(20).optional(),
  petsAllowed: z.boolean().optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(MAX_ROOM_AMENITIES).optional(),
  galleryUrls: z.array(z.string()).max(MAX_PHOTOS_PER_ROOM).optional(),
  galleryMetaJson: z.array(RoomPhotoMetaSchema).max(MAX_PHOTOS_PER_ROOM).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const RoomPatchSchema = RoomCreateSchema.partial().extend({
  id: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

const RoomReorderSchema = z.object({
  action: z.literal("reorder"),
  hotelSlug: z.string().optional(),
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = RoomCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลห้องพักไม่ครบ" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const cleanCode = parsed.data.code.toUpperCase();
    const slug = normalizeHotelSlug(`${cleanCode}-${parsed.data.nameEn || parsed.data.nameTh}`) || `room-${Date.now()}`;

    const normalizedPhotos = serializeRoomPhotos(
      normalizeRoomPhotos(
        parsed.data.galleryUrls,
        parsed.data.galleryMetaJson
      )
    );

    const currentRoomCount = await prisma.room.count({
      where: { hotelId: hotel.id },
    });

    const room = await prisma.room.create({
      data: {
        hotelId: hotel.id,
        code: cleanCode,
        slug: `${slug}-${Math.floor(Math.random() * 999)}`,
        nameTh: parsed.data.nameTh,
        nameEn: parsed.data.nameEn || parsed.data.nameTh,
        categoryTh: parsed.data.categoryTh || "ห้องพัก",
        categoryEn: parsed.data.categoryEn || parsed.data.categoryTh || "Room",
        shortDescTh: parsed.data.shortDescTh || "",
        shortDescEn: parsed.data.shortDescEn || "",
        totalUnits: parsed.data.totalUnits,
        weekdayPriceThb: parsed.data.weekdayPriceThb,
        weekendPriceThb: parsed.data.weekendPriceThb,
        extraGuestPriceThb: parsed.data.extraGuestPriceThb ?? 0,
        sizeSqm: parsed.data.sizeSqm ?? 35,
        standardGuests: parsed.data.standardGuests ?? 2,
        maxGuests: parsed.data.maxGuests,
        bedrooms: parsed.data.bedrooms ?? 1,
        beds: parsed.data.beds ?? 1,
        bathrooms: parsed.data.bathrooms ?? 1,
        petsAllowed: parsed.data.petsAllowed ?? false,
        amenities: parsed.data.amenities ?? [],
        galleryUrls: normalizedPhotos.galleryUrls,
        galleryMetaJson:
          normalizedPhotos.galleryMetaJson as unknown as Prisma.InputJsonValue,
        sortOrder: parsed.data.sortOrder ?? currentRoomCount,
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เพิ่มห้องพักไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();

    // Fast atomic drag-to-sort reorder branch
    if (raw && typeof raw === "object" && raw.action === "reorder") {
      const reorderParsed = RoomReorderSchema.safeParse(raw);
      if (!reorderParsed.success) {
        return NextResponse.json(
          { error: "ลำดับห้องพักไม่ถูกต้อง" },
          { status: 422 }
        );
      }
      const { hotel } = await requireHotelStudioAccess(
        reorderParsed.data.hotelSlug
      );
      const uniqueIds = Array.from(new Set(reorderParsed.data.orderedIds));
      await prisma.$transaction(
        uniqueIds.map((roomId, idx) =>
          prisma.room.updateMany({
            where: { id: roomId, hotelId: hotel.id },
            data: { sortOrder: idx },
          })
        )
      );
      return NextResponse.json({ reordered: true, orderedIds: uniqueIds });
    }

    const parsed = RoomPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { id, hotelSlug: _h, galleryMetaJson, galleryUrls, ...restUpdates } =
      parsed.data;
    void _h;

    const existing = await prisma.room.findFirst({
      where: { id, hotelId: hotel.id },
      select: { id: true, galleryUrls: true, galleryMetaJson: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบห้องพักนี้" }, { status: 404 });
    }

    const updateData: Prisma.RoomUpdateInput = { ...restUpdates };

    if (galleryMetaJson !== undefined) {
      const serialized = serializeRoomPhotos(
        normalizeRoomPhotos(
          galleryUrls ?? galleryMetaJson.map((m) => m.url),
          galleryMetaJson
        )
      );
      updateData.galleryUrls = serialized.galleryUrls;
      updateData.galleryMetaJson =
        serialized.galleryMetaJson as unknown as Prisma.InputJsonValue;
    } else if (galleryUrls !== undefined) {
      // Preserve existing space tags & SEO captions for URLs that remain in galleryUrls
      const serialized = serializeRoomPhotos(
        normalizeRoomPhotos(galleryUrls, existing.galleryMetaJson)
      );
      updateData.galleryUrls = serialized.galleryUrls;
      updateData.galleryMetaJson =
        serialized.galleryMetaJson as unknown as Prisma.InputJsonValue;
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ room });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดตห้องพักไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.room.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบห้องพักไม่สำเร็จ" }, { status: 400 });
  }
}

