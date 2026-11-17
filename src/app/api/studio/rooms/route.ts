import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { normalizeHotelSlug } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";

const RoomCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  code: z.string().trim().min(1).max(20),
  nameTh: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  shortDescTh: z.string().trim().max(500).optional(),
  totalUnits: z.number().int().min(1).max(100),
  weekdayPriceThb: z.number().int().min(100),
  weekendPriceThb: z.number().int().min(100),
  extraGuestPriceThb: z.number().int().min(0).optional(),
  sizeSqm: z.number().int().min(5).optional(),
  standardGuests: z.number().int().min(1).max(20).optional(),
  maxGuests: z.number().int().min(1).max(30),
  petsAllowed: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  galleryUrls: z.array(z.string()).optional(),
});

const RoomPatchSchema = RoomCreateSchema.partial().extend({
  id: z.string().trim().min(1),
  isActive: z.boolean().optional(),
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

    const room = await prisma.room.create({
      data: {
        hotelId: hotel.id,
        code: cleanCode,
        slug: `${slug}-${Math.floor(Math.random() * 999)}`,
        nameTh: parsed.data.nameTh,
        nameEn: parsed.data.nameEn || parsed.data.nameTh,
        shortDescTh: parsed.data.shortDescTh || "",
        totalUnits: parsed.data.totalUnits,
        weekdayPriceThb: parsed.data.weekdayPriceThb,
        weekendPriceThb: parsed.data.weekendPriceThb,
        extraGuestPriceThb: parsed.data.extraGuestPriceThb ?? 0,
        sizeSqm: parsed.data.sizeSqm ?? 35,
        standardGuests: parsed.data.standardGuests ?? 2,
        maxGuests: parsed.data.maxGuests,
        petsAllowed: parsed.data.petsAllowed ?? false,
        amenities: parsed.data.amenities ?? [],
        galleryUrls: parsed.data.galleryUrls ?? [],
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
    const parsed = RoomPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { id, hotelSlug: _h, ...updates } = parsed.data;

    const existing = await prisma.room.findFirst({
      where: { id, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบห้องพักนี้" }, { status: 404 });
    }

    const room = await prisma.room.update({
      where: { id },
      data: updates,
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

