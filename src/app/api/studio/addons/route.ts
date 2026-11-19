import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const AddonCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  nameTh: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  descriptionTh: z.string().trim().max(300).optional(),
  priceThb: z.number().int().min(0),
  unitLabelTh: z.string().trim().max(30).optional(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
});

const AddonPatchSchema = AddonCreateSchema.partial().extend({
  id: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = AddonCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลบริการเสริมไม่ครบ" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const addon = await prisma.hotelAddon.create({
      data: {
        hotelId: hotel.id,
        nameTh: parsed.data.nameTh,
        nameEn: parsed.data.nameEn || parsed.data.nameTh,
        descriptionTh: parsed.data.descriptionTh || "",
        priceThb: parsed.data.priceThb,
        unitLabelTh: parsed.data.unitLabelTh || "ชุด",
        imageUrl: parsed.data.imageUrl || null,
      },
    });

    return NextResponse.json({ addon }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "เพิ่มบริการเสริมไม่สำเร็จ" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = AddonPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลบริการเสริมไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { id, hotelSlug: _ignored, ...updates } = parsed.data;
    void _ignored;

    const existing = await prisma.hotelAddon.findFirst({
      where: { id, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบริการเสริมนี้" }, { status: 404 });
    }

    const addon = await prisma.hotelAddon.update({
      where: { id: existing.id },
      data: updates,
    });

    return NextResponse.json({ addon });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดตบริการเสริมไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.hotelAddon.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบบริการเสริมไม่สำเร็จ" }, { status: 400 });
  }
}
