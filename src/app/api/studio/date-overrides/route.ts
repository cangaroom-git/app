import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const DateOverrideSchema = z.object({
  hotelSlug: z.string().optional(),
  roomId: z.string().trim().min(1),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blockedUnits: z.number().int().min(0).max(50),
  overridePriceThb: z.number().int().min(100).optional().nullable(),
  note: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = DateOverrideSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลวันที่ไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const room = await prisma.room.findFirst({
      where: { id: parsed.data.roomId, hotelId: hotel.id },
      select: { id: true },
    });
    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้องพัก" }, { status: 404 });
    }

    const dateObj = new Date(`${parsed.data.dateStr}T00:00:00.000Z`);
    const override = await prisma.roomDateOverride.upsert({
      where: {
        roomId_date: { roomId: room.id, date: dateObj },
      },
      update: {
        blockedUnits: parsed.data.blockedUnits,
        overridePriceThb: parsed.data.overridePriceThb ?? null,
        note: parsed.data.note ?? null,
      },
      create: {
        roomId: room.id,
        date: dateObj,
        blockedUnits: parsed.data.blockedUnits,
        overridePriceThb: parsed.data.overridePriceThb ?? null,
        note: parsed.data.note ?? null,
      },
    });

    return NextResponse.json({ override });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "บันทึกวันที่ไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.roomDateOverride.deleteMany({
      where: { id, room: { hotelId: hotel.id } },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบรายการปิดห้องไม่สำเร็จ" }, { status: 400 });
  }
}

