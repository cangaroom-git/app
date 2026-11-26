import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import { sanitizeOutboundHttpsUrl } from "@/lib/placeCategories";

const PatchHotelStatusSchema = z.object({
  hotelId: z.string().trim().min(1),
  verificationStatus: z
    .enum(["PENDING_REVIEW", "VERIFIED", "SUSPENDED"])
    .optional(),
  isPublished: z.boolean().optional(),
  locationScope: z
    .enum(["SINGLE_LOCATION", "MULTI_BRANCH", "NATIONWIDE_ONLINE"])
    .optional(),
  branchSummaryTh: z.string().trim().max(140).optional(),
  placeCategory: z
    .enum(["STAY", "CAFE", "RESTAURANT", "ATTRACTION", "WELLNESS"])
    .optional(),
});

const CreatePlaceOrBrandSchema = z.object({
  nameTh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(120).optional().default(""),
  slug: z.string().trim().min(2).max(60),
  placeCategory: z
    .enum(["STAY", "CAFE", "RESTAURANT", "ATTRACTION", "WELLNESS"])
    .default("CAFE"),
  locationScope: z
    .enum(["SINGLE_LOCATION", "MULTI_BRANCH", "NATIONWIDE_ONLINE"])
    .default("MULTI_BRANCH"),
  merchantMode: z
    .enum(["DIRECT_BOOKING", "PROFILE_ONLY"])
    .default("PROFILE_ONLY"),
  provinceId: z.string().trim().min(1).default("nationwide"),
  branchSummaryTh: z.string().trim().max(140).optional().default(""),
  taglineTh: z.string().trim().max(200).optional().default(""),
  externalWebsiteUrl: z.string().trim().max(500).optional().default(""),
  coverImageUrl: z.string().trim().max(1000).optional().default(""),
});

export async function GET() {
  try {
    const guard = await requireSuperAdminApi();
    if ("error" in guard) return guard.error;

    const hotels = await prisma.hotel.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        nameTh: true,
        nameEn: true,
        coverImageUrl: true,
        provinceId: true,
        placeCategory: true,
        merchantMode: true,
        locationScope: true,
        branchSummaryTh: true,
        verificationStatus: true,
        isPublished: true,
        ratingAvg: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        _count: {
          select: {
            rooms: true,
            pins: true,
            coupons: true,
            bookings: true,
            branches: true,
          },
        },
      },
    });

    return NextResponse.json({ hotels });
  } catch (err) {
    console.error("[GET /api/super-admin/hotels]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการสถานที่และแบรนด์ได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireSuperAdminApi();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = CreatePlaceOrBrandSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อและ slug ของแบรนด์หรือสถานที่ให้ถูกต้อง" },
        { status: 422 }
      );
    }

    const d = parsed.data;
    const cleanSlug = d.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (cleanSlug.length < 2) {
      return NextResponse.json({ error: "Slug ไม่ถูกต้อง" }, { status: 422 });
    }

    const dup = await prisma.hotel.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });
    const finalSlug = dup
      ? `${cleanSlug}-${crypto.randomBytes(2).toString("hex")}`
      : cleanSlug;

    const created = await prisma.hotel.create({
      data: {
        slug: finalSlug,
        ownerId: guard.user.id,
        nameTh: d.nameTh,
        nameEn: d.nameEn || d.nameTh,
        taglineTh: d.taglineTh,
        placeCategory: d.placeCategory,
        locationScope: d.locationScope,
        merchantMode:
          d.placeCategory === "STAY" && d.locationScope === "SINGLE_LOCATION"
            ? d.merchantMode
            : "PROFILE_ONLY",
        provinceId:
          d.locationScope === "NATIONWIDE_ONLINE" ? "nationwide" : d.provinceId,
        branchSummaryTh: d.branchSummaryTh,
        externalWebsiteUrl: sanitizeOutboundHttpsUrl(d.externalWebsiteUrl),
        coverImageUrl: d.coverImageUrl || null,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
    });

    revalidatePlaceCatalog({ slug: created.slug });
    return NextResponse.json({ success: true, hotel: created });
  } catch (err) {
    console.error("[POST /api/super-admin/hotels]", err);
    return NextResponse.json(
      { error: "สร้างแบรนด์/สถานที่ใหม่ไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdminApi();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = PatchHotelStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const updated = await prisma.hotel.update({
      where: { id: parsed.data.hotelId },
      data: {
        ...(parsed.data.verificationStatus
          ? { verificationStatus: parsed.data.verificationStatus }
          : {}),
        ...(parsed.data.isPublished !== undefined
          ? { isPublished: parsed.data.isPublished }
          : {}),
        ...(parsed.data.locationScope
          ? {
              locationScope: parsed.data.locationScope,
              ...(parsed.data.locationScope === "NATIONWIDE_ONLINE"
                ? { provinceId: "nationwide" }
                : {}),
            }
          : {}),
        ...(parsed.data.branchSummaryTh !== undefined
          ? { branchSummaryTh: parsed.data.branchSummaryTh }
          : {}),
        ...(parsed.data.placeCategory
          ? { placeCategory: parsed.data.placeCategory }
          : {}),
      },
    });

    revalidatePlaceCatalog({ slug: updated.slug });
    return NextResponse.json({ hotel: updated });
  } catch (err) {
    console.error("[PATCH /api/super-admin/hotels]", err);
    return NextResponse.json(
      { error: "อัปเดตสถานะไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
