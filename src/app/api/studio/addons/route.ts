import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const AddonSchema = z.object({
  hotelSlug: z.string().optional(),
  nameTh: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  descriptionTh: z.string().trim().max(300).optional(),
  priceThb: z.number().int().min(0),
  unitLabelTh: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = AddonSchema.safeParse(raw);
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
