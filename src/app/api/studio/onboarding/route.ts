import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  normalizeHotelSlug,
  RESERVED_HOTEL_SLUGS,
} from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";

const OnboardingSchema = z.object({
  nameTh: z.string().trim().min(2, "กรุณาระบุชื่อที่พัก").max(100),
  nameEn: z.string().trim().max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(3, "ชื่อลิงก์ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(40),
  provinceId: z.string().trim().min(2),
  districtTh: z.string().trim().max(100).optional(),
  stayStyles: z.array(z.string()).min(1, "เลือกสไตล์ที่พักอย่างน้อย 1 หมวด"),
  contactPhone: z.string().trim().max(30).optional(),
  contactLine: z.string().trim().max(60).optional(),
  promptPayId: z.string().trim().max(30).optional(),
  facebookPageUrl: z.string().trim().max(240).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawSlug = url.searchParams.get("slug") || "";
    const slug = normalizeHotelSlug(rawSlug);

    if (!slug || slug.length < 3) {
      return NextResponse.json({
        available: false,
        slug,
        reason: "ต้องมีอย่างน้อย 3 ตัวอักษร (a-z, 0-9, -)",
      });
    }

    if (RESERVED_HOTEL_SLUGS.has(slug)) {
      return NextResponse.json({
        available: false,
        slug,
        reason: "ชื่อนี้ถูกสงวนไว้สำหรับระบบ",
      });
    }

    const existing = await prisma.hotel.findUnique({
      where: { slug },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existing,
      slug,
      profileUrl: `cangaroom.com/${slug}`,
      reason: existing ? "ชื่อลิงก์นี้มีที่พักอื่นใช้งานแล้ว" : null,
    });
  } catch (err) {
    console.error("[GET /api/studio/onboarding]", err);
    return NextResponse.json(
      { available: false, reason: "ตรวจสอบไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบด้วย Google / Email ก่อนเปิดเพจที่พัก" },
        { status: 401 }
      );
    }

    const raw = await request.json();
    const parsed = OnboardingSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ครบถ้วน" },
        { status: 422 }
      );
    }

    const slug = normalizeHotelSlug(parsed.data.slug);
    if (slug.length < 3 || RESERVED_HOTEL_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: "ชื่อลิงก์นี้ไม่สามารถใช้งานได้ กรุณาเลือกชื่ออื่น" },
        { status: 422 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const exists = await tx.hotel.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (exists) {
        throw new Error("ชื่อลิงก์นี้มีผู้ใช้งานแล้ว");
      }

      const defaultCover =
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85";

      const hotel = await tx.hotel.create({
        data: {
          slug,
          ownerId: sessionUser.id,
          nameTh: parsed.data.nameTh,
          nameEn: parsed.data.nameEn || parsed.data.nameTh,
          taglineTh: `จองตรงกับ ${parsed.data.nameTh} ไม่มีค่า GP`,
          provinceId: parsed.data.provinceId,
          districtTh: parsed.data.districtTh || "",
          stayStyles: parsed.data.stayStyles,
          contactPhone: parsed.data.contactPhone || "",
          contactLine: parsed.data.contactLine || "",
          promptPayId:
            parsed.data.promptPayId || parsed.data.contactPhone || "",
          promptPayAccountName: parsed.data.nameTh,
          facebookPageUrl: parsed.data.facebookPageUrl || "",
          coverImageUrl: defaultCover,
          logoUrl: defaultCover,
          verificationStatus: "PENDING_REVIEW",
          isPublished: true,
        },
      });

      // Create starter room so the new storefront is immediately bookable
      const starterRoom = await tx.room.create({
        data: {
          hotelId: hotel.id,
          code: "R1",
          slug: "standard-villa",
          nameTh: "ห้องพักมาตรฐาน (Standard Villa)",
          nameEn: "Standard Villa",
          shortDescTh: "ห้องพักบรรยากาศดีพร้อมอาหารเช้าและสิ่งอำนวยความสะดวกครบครัน",
          totalUnits: 2,
          weekdayPriceThb: 2500,
          weekendPriceThb: 2900,
          maxGuests: 2,
          galleryUrls: [defaultCover],
        },
      });

      await tx.pin.create({
        data: {
          hotelId: hotel.id,
          roomId: starterRoom.id,
          category: "ROOMS",
          titleTh: parsed.data.nameTh,
          descriptionTh: `จองตรง ${parsed.data.nameTh} ฟรีค่า GP ผ่าน Cangaroom`,
          coverImageUrl: defaultCover,
          mediaUrls: [defaultCover],
          aspectRatio: "aspect-[4/5]",
          provinceId: parsed.data.provinceId,
          stayStyles: parsed.data.stayStyles,
          semanticTags: parsed.data.stayStyles,
          publishStatus: "PUBLISHED",
        },
      });

      if (sessionUser.role === "TRAVELLER") {
        await tx.user.update({
          where: { id: sessionUser.id },
          data: { role: "HOTEL_OWNER" },
        });
      }

      return hotel;
    });

    return NextResponse.json({ hotel: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/studio/onboarding]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เปิดเพจที่พักไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

