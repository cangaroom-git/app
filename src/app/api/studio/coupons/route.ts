import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";

const CouponCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  code: z.string().trim().min(3).max(24),
  titleTh: z.string().trim().min(2).max(140),
  descriptionTh: z.string().trim().max(400).optional(),
  discountType: z.enum(["PERCENT", "FIXED_THB"]),
  discountValue: z.number().int().min(1),
  minSpendThb: z.number().int().min(0).optional(),
  maxDiscountThb: z.number().int().min(1).optional().nullable(),
  totalQuota: z.number().int().min(1).optional().nullable(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const CouponReorderSchema = z.object({
  action: z.literal("reorder"),
  hotelSlug: z.string().optional(),
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(200),
});

const CouponPatchSchema = z.object({
  hotelSlug: z.string().optional(),
  id: z.string().trim().min(1),
  titleTh: z.string().trim().min(2).max(140).optional(),
  descriptionTh: z.string().trim().max(400).optional(),
  discountType: z.enum(["PERCENT", "FIXED_THB"]).optional(),
  discountValue: z.number().int().min(1).optional(),
  minSpendThb: z.number().int().min(0).optional(),
  maxDiscountThb: z.number().int().min(1).optional().nullable(),
  totalQuota: z.number().int().min(1).optional().nullable(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = CouponCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลคูปองไม่ครบ" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const startDate = parsed.data.startsAt
      ? new Date(parsed.data.startsAt)
      : new Date();
    const expDate = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : new Date(Date.now() + 90 * 86400000);
    const currentCount = await prisma.coupon.count({
      where: { hotelId: hotel.id },
    });

    const coupon = await prisma.coupon.create({
      data: {
        hotelId: hotel.id,
        code: parsed.data.code.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
        titleTh: parsed.data.titleTh,
        titleEn: parsed.data.titleTh,
        descriptionTh: parsed.data.descriptionTh || "",
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        minSpendThb: parsed.data.minSpendThb ?? 0,
        maxDiscountThb: parsed.data.maxDiscountThb ?? null,
        totalQuota: parsed.data.totalQuota ?? null,
        startsAt: startDate,
        expiresAt: expDate,
        isActive: true,
      },
    });
    await prisma.$executeRaw`
      UPDATE "Coupon" SET "sortOrder" = ${currentCount}
      WHERE "id" = ${coupon.id} AND "hotelId" = ${hotel.id}
    `;

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "สร้างคูปองไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();

    if (raw && typeof raw === "object" && raw.action === "reorder") {
      const reorderParsed = CouponReorderSchema.safeParse(raw);
      if (!reorderParsed.success) {
        return NextResponse.json(
          { error: "ลำดับคูปองไม่ถูกต้อง" },
          { status: 422 }
        );
      }
      const { hotel } = await requireHotelStudioAccess(
        reorderParsed.data.hotelSlug
      );
      const uniqueIds = Array.from(new Set(reorderParsed.data.orderedIds));
      await prisma.$transaction(
        uniqueIds.map(
          (couponId, idx) =>
            prisma.$executeRaw`
              UPDATE "Coupon" SET "sortOrder" = ${idx}
              WHERE "id" = ${couponId} AND "hotelId" = ${hotel.id}
            `
        )
      );
      revalidatePlaceCatalog({ slug: hotel.slug });
      return NextResponse.json({ reordered: true, orderedIds: uniqueIds });
    }

    const parsed = CouponPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลคูปองไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { id, hotelSlug: _ignored, startsAt, expiresAt, ...rest } = parsed.data;
    void _ignored;

    const existing = await prisma.coupon.findFirst({
      where: { id, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคูปองนี้" }, { status: 404 });
    }

    const coupon = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(rest.titleTh ? { titleEn: rest.titleTh } : {}),
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      },
    });

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json({ coupon });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดตคูปองไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.coupon.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบคูปองไม่สำเร็จ" }, { status: 400 });
  }
}
