import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  normalizeHotelSlug,
  RESERVED_HOTEL_SLUGS,
} from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";

const OnboardingSchema = z.object({
  propertyType: z
    .enum(["BOUTIQUE_HOTEL", "RESORT", "POOL_VILLA", "GLAMPING_HOMESTAY"])
    .optional(),
  nameTh: z.string().trim().min(2, "กรุณาระบุชื่อที่พัก").max(100),
  nameEn: z.string().trim().max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(3, "ชื่อลิงก์ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(40),
  provinceId: z.string().trim().min(2),
  districtTh: z.string().trim().max(100).optional(),
  addressTh: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  googleMapsUrl: z.string().trim().max(400).optional().nullable(),
  stayStyles: z.array(z.string()).optional(),
  quickSetup: z.boolean().optional(),
  contactPhone: z.string().trim().max(30).optional(),
  contactLine: z.string().trim().max(60).optional(),
  promptPayId: z.string().trim().max(30).optional(),
  promptPayAccountName: z.string().trim().max(120).optional(),
  facebookPageUrl: z.string().trim().max(240).optional(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  firstRoom: z
    .object({
      code: z.string().trim().min(1).max(20).optional(),
      nameTh: z.string().trim().min(2).max(120),
      totalUnits: z.number().int().min(1).max(100).default(1),
      weekdayPriceThb: z.number().int().min(100).default(2500),
      weekendPriceThb: z.number().int().min(100).default(2900),
      maxGuests: z.number().int().min(1).max(30).default(2),
      bedrooms: z.number().int().min(0).max(20).default(1),
      beds: z.number().int().min(1).max(30).default(1),
      bathrooms: z.number().int().min(1).max(20).default(1),
      sizeSqm: z.number().int().min(8).max(2000).default(36),
      amenities: z.array(z.string()).optional(),
      galleryUrls: z.array(z.string()).optional(),
    })
    .optional(),
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

      const isQuickSetup = Boolean(parsed.data.quickSetup);
      const resolvedStyles =
        parsed.data.stayStyles && parsed.data.stayStyles.length > 0
          ? parsed.data.stayStyles
          : parsed.data.propertyType === "POOL_VILLA"
          ? ["pool-villa"]
          : parsed.data.propertyType === "GLAMPING_HOMESTAY"
          ? ["glamping"]
          : ["mountain"];

      const uploadedGallery =
        parsed.data.firstRoom?.galleryUrls?.filter(Boolean) ?? [];
      const resolvedCover =
        parsed.data.coverImageUrl || uploadedGallery[0] || null;

      const hotel = await tx.hotel.create({
        data: {
          slug,
          ownerId: sessionUser.id,
          propertyType: parsed.data.propertyType ?? "BOUTIQUE_HOTEL",
          nameTh: parsed.data.nameTh,
          nameEn: parsed.data.nameEn || parsed.data.nameTh,
          taglineTh: `จองตรงกับ ${parsed.data.nameTh} ไม่มีค่า GP`,
          provinceId: parsed.data.provinceId,
          districtTh: parsed.data.districtTh || "",
          addressTh: parsed.data.addressTh || "",
          latitude:
            typeof parsed.data.latitude === "number"
              ? parsed.data.latitude
              : null,
          longitude:
            typeof parsed.data.longitude === "number"
              ? parsed.data.longitude
              : null,
          googleMapsUrl: parsed.data.googleMapsUrl || null,
          stayStyles: resolvedStyles,
          contactPhone: parsed.data.contactPhone || "",
          contactLine: parsed.data.contactLine || "",
          promptPayId:
            parsed.data.promptPayId || parsed.data.contactPhone || "",
          promptPayAccountName:
            parsed.data.promptPayAccountName || parsed.data.nameTh,
          facebookPageUrl: parsed.data.facebookPageUrl || "",
          coverImageUrl: resolvedCover,
          logoUrl: resolvedCover,
          verificationStatus: "PENDING_REVIEW",
          isPublished: !isQuickSetup,
        },
      });

      if (!isQuickSetup) {
        const fr = parsed.data.firstRoom;
        const fallbackImg =
          resolvedCover ||
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85";
        const starterGallery =
          uploadedGallery.length > 0 ? uploadedGallery : [fallbackImg];
        const starterCode = (fr?.code || "R1").toUpperCase();
        const starterNameTh = fr?.nameTh || "ห้องพักมาตรฐาน (Standard Room)";

        const starterRoom = await tx.room.create({
          data: {
            hotelId: hotel.id,
            code: starterCode,
            slug:
              normalizeHotelSlug(`${starterCode}-${starterNameTh}`) || "room-1",
            nameTh: starterNameTh,
            nameEn: starterNameTh,
            shortDescTh:
              "ห้องพักจองตรง 0% GP พร้อมสิ่งอำนวยความสะดวกครบครัน",
            totalUnits: fr?.totalUnits ?? 1,
            weekdayPriceThb: fr?.weekdayPriceThb ?? 2500,
            weekendPriceThb: fr?.weekendPriceThb ?? 2900,
            standardGuests: Math.min(2, fr?.maxGuests ?? 2),
            maxGuests: fr?.maxGuests ?? 2,
            bedrooms: fr?.bedrooms ?? 1,
            beds: fr?.beds ?? 1,
            bathrooms: fr?.bathrooms ?? 1,
            sizeSqm: fr?.sizeSqm ?? 36,
            amenities: fr?.amenities ?? [
              "Wi-Fi ความเร็วสูง",
              "เครื่องปรับอากาศ",
              "ที่จอดรถส่วนตัว",
            ],
            galleryUrls: starterGallery,
          },
        });

        await tx.pin.create({
          data: {
            hotelId: hotel.id,
            roomId: starterRoom.id,
            category: "ROOMS",
            titleTh: parsed.data.nameTh,
            descriptionTh: `จองตรง ${parsed.data.nameTh} ฟรีค่า GP ผ่าน Cangaroom`,
            coverImageUrl: fallbackImg,
            mediaUrls: starterGallery,
            aspectRatio: "aspect-[4/5]",
            provinceId: parsed.data.provinceId,
            stayStyles: resolvedStyles,
            semanticTags: resolvedStyles,
            publishStatus: "PUBLISHED",
          },
        });
      }

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

