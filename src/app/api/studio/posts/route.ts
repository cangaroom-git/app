import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import {
  mapHotelPostToDetailDto,
  normalizePostSlug,
} from "@/lib/services/hotelPostService";

const CreatePostSchema = z
  .object({
    hotelSlug: z.string().optional(),
    slug: z.string().trim().max(90).optional(),
    roomId: z.string().trim().optional().nullable(),
    postKind: z.enum(["FEED_POST", "BLOG"]).optional(),
    titleTh: z.string().trim().min(3, "กรุณาใส่หัวข้อโพสต์").max(180),
    excerptTh: z.string().trim().max(400).optional(),
    contentTh: z.string().trim().min(3, "กรุณาใส่เนื้อหาอย่างน้อย 3 ตัวอักษร").max(20000),
    coverImageUrl: z.string().trim().min(1, "กรุณาอัปโหลดหรือใส่รูปภาพหน้าปก"),
    galleryUrls: z.array(z.string().trim()).optional(),
    categoryTh: z.string().trim().max(60).optional(),
    tags: z.array(z.string().trim()).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .refine(
    (d) => d.postKind === "FEED_POST" || d.contentTh.length >= 20,
    {
      message: "เนื้อหาบทความต้องมีอย่างน้อย 20 ตัวอักษร",
      path: ["contentTh"],
    }
  );

const PatchPostSchema = z.object({
  hotelSlug: z.string().optional(),
  id: z.string().trim().min(1),
  roomId: z.string().trim().optional().nullable(),
  postKind: z.enum(["FEED_POST", "BLOG"]).optional(),
  titleTh: z.string().trim().min(3).max(180).optional(),
  excerptTh: z.string().trim().max(400).optional(),
  contentTh: z.string().trim().min(3).max(20000).optional(),
  coverImageUrl: z.string().trim().min(1).optional(),
  categoryTh: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

async function resolveUniquePostSlug(hotelId: string, baseSlug: string): Promise<string> {
  const existing = await prisma.hotelPost.findUnique({
    where: { hotelId_slug: { hotelId, slug: baseSlug } },
    select: { id: true },
  });
  if (!existing) return baseSlug;
  return `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = CreatePostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลบทความไม่ครบถ้วน" },
        { status: 422 }
      );
    }

    const { user, hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const fullHotel = await prisma.hotel.findUniqueOrThrow({
      where: { id: hotel.id },
      select: {
        slug: true,
        nameTh: true,
        logoUrl: true,
        verificationStatus: true,
        provinceId: true,
      },
    });

    const baseSlug = normalizePostSlug(parsed.data.slug, parsed.data.titleTh);
    const uniqueSlug = await resolveUniquePostSlug(hotel.id, baseSlug);

    const created = await prisma.hotelPost.create({
      data: {
        hotelId: hotel.id,
        authorId: user.id,
        roomId: parsed.data.roomId || null,
        slug: uniqueSlug,
        titleTh: parsed.data.titleTh,
        titleEn: parsed.data.titleTh,
        excerptTh: parsed.data.excerptTh || "",
        contentTh: parsed.data.contentTh,
        coverImageUrl: parsed.data.coverImageUrl,
        galleryUrls: parsed.data.galleryUrls || [],
        categoryTh: parsed.data.categoryTh || (parsed.data.postKind === "FEED_POST" ? "อัปเดตล่าสุด" : "คู่มือเที่ยว & ที่พัก"),
        postKind: parsed.data.postKind || "BLOG",
        tags: (parsed.data.tags || []).filter(Boolean).slice(0, 10),
        status: parsed.data.status || "PUBLISHED",
      },
      include: {
        room: {
          select: { code: true, nameTh: true, weekdayPriceThb: true },
        },
      },
    });

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json(
      { post: mapHotelPostToDetailDto(created, fullHotel) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/studio/posts]", err);
    return NextResponse.json({ error: "สร้างบทความไม่สำเร็จ" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = PatchPostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const existing = await prisma.hotelPost.findFirst({
      where: { id: parsed.data.id, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบทความนี้" }, { status: 404 });
    }

    const fullHotel = await prisma.hotel.findUniqueOrThrow({
      where: { id: hotel.id },
      select: {
        slug: true,
        nameTh: true,
        logoUrl: true,
        verificationStatus: true,
        provinceId: true,
      },
    });

    const { hotelSlug: _h, id: _id, ...updates } = parsed.data;
    const updated = await prisma.hotelPost.update({
      where: { id: existing.id },
      data: {
        ...updates,
        ...(updates.tags ? { tags: updates.tags.filter(Boolean).slice(0, 10) } : {}),
      },
      include: {
        room: {
          select: { code: true, nameTh: true, weekdayPriceThb: true },
        },
      },
    });

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json({
      post: mapHotelPostToDetailDto(updated, fullHotel),
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "อัปเดตบทความไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) {
      return NextResponse.json({ error: "ต้องระบุรหัสบทความ" }, { status: 400 });
    }

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.hotelPost.deleteMany({
      where: { id, hotelId: hotel.id },
    });

    revalidatePlaceCatalog({ slug: hotel.slug });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบบทความไม่สำเร็จ" }, { status: 400 });
  }
}

