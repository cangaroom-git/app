import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const CreateRuleSchema = z.object({
  hotelSlug: z.string().optional(),
  ruleType: z.enum(["LENGTH_OF_STAY", "EARLY_BIRD", "LAST_MINUTE"]),
  titleTh: z.string().trim().min(2).max(120),
  discountType: z.enum(["PERCENT", "FIXED_THB"]).default("PERCENT"),
  discountValue: z.number().int().min(1).max(90000),
  minNights: z.number().int().min(2).max(90).optional().nullable(),
  minAdvanceDays: z.number().int().min(1).max(365).optional().nullable(),
  maxAdvanceDays: z.number().int().min(0).max(60).optional().nullable(),
  isActive: z.boolean().optional(),
});

const PatchRuleSchema = CreateRuleSchema.partial().extend({
  id: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = CreateRuleSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลกฎส่วนลดไม่ครบถ้วน" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const val =
      parsed.data.discountType === "PERCENT"
        ? Math.min(80, parsed.data.discountValue)
        : parsed.data.discountValue;

    const rule = await prisma.hotelDiscountRule.create({
      data: {
        hotelId: hotel.id,
        ruleType: parsed.data.ruleType,
        titleTh: parsed.data.titleTh,
        discountType: parsed.data.discountType,
        discountValue: val,
        minNights:
          parsed.data.ruleType === "LENGTH_OF_STAY"
            ? parsed.data.minNights ?? 2
            : null,
        minAdvanceDays:
          parsed.data.ruleType === "EARLY_BIRD"
            ? parsed.data.minAdvanceDays ?? 14
            : null,
        maxAdvanceDays:
          parsed.data.ruleType === "LAST_MINUTE"
            ? parsed.data.maxAdvanceDays ?? 3
            : null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "สร้างส่วนลดอัตโนมัติไม่สำเร็จ" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = PatchRuleSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลกฎส่วนลดไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { id, hotelSlug: _ignored, ...updates } = parsed.data;
    void _ignored;

    const existing = await prisma.hotelDiscountRule.findFirst({
      where: { id, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบกฎส่วนลดนี้" }, { status: 404 });
    }

    const rule = await prisma.hotelDiscountRule.update({
      where: { id: existing.id },
      data: updates,
    });

    return NextResponse.json({ rule });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดตกฎส่วนลดไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.hotelDiscountRule.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบกฎส่วนลดไม่สำเร็จ" }, { status: 400 });
  }
}
