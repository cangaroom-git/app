import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  normalizeHotelSlug,
  RESERVED_HOTEL_SLUGS,
} from "@/lib/bookingMath";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import {
  computeHaversineKm,
  getPlaceCategoryMeta,
  sanitizeOutboundHttpsUrl,
} from "@/lib/placeCategories";
import { prisma } from "@/lib/prisma";
import { ensureThailandPlacesAroundCoord } from "@/lib/geo/thailandPlacesDb";

const CATEGORY_DEFAULT_COVERS: Record<string, string> = {
  STAY: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85",
  CAFE: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85",
  RESTAURANT:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
  ATTRACTION:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
  WELLNESS:
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85",
};

const OpeningHourSchema = z.object({
  day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  open: z.string().trim().max(10),
  close: z.string().trim().max(10),
  closed: z.boolean(),
});

const OnboardingSchema = z.object({
  placeCategory: z
    .enum(["STAY", "CAFE", "RESTAURANT", "ATTRACTION", "WELLNESS"])
    .default("STAY"),
  merchantMode: z.enum(["DIRECT_BOOKING", "PROFILE_ONLY"]).optional(),
  propertyType: z
    .enum(["BOUTIQUE_HOTEL", "RESORT", "POOL_VILLA", "GLAMPING_HOMESTAY"])
    .optional(),
  nameTh: z.string().trim().min(2, "กรุณาระบุชื่อสถานที่").max(100),
  nameEn: z.string().trim().max(100).optional(),
  taglineTh: z.string().trim().max(240).optional(),
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
  googlePlaceId: z.string().trim().max(200).optional().nullable(),
  externalWebsiteUrl: z.string().trim().max(400).optional(),
  primaryCtaLabelTh: z.string().trim().max(60).optional(),
  openingHoursJson: z.array(OpeningHourSchema).max(7).optional(),
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
      profileUrl: `nondii.com/${slug}`,
      reason: existing ? "ชื่อลิงก์นี้มีสถานที่อื่นใช้งานแล้ว" : null,
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
        { error: "กรุณาเข้าสู่ระบบด้วย Google / Email ก่อนเปิดหน้าสถานที่" },
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

    const placeCategory = parsed.data.placeCategory;
    const resolvedMerchantMode =
      placeCategory === "STAY"
        ? parsed.data.merchantMode ?? "DIRECT_BOOKING"
        : "PROFILE_ONLY";
    const safeExternalUrl = parsed.data.externalWebsiteUrl
      ? sanitizeOutboundHttpsUrl(parsed.data.externalWebsiteUrl)
      : "";
    if (
      parsed.data.externalWebsiteUrl &&
      parsed.data.externalWebsiteUrl.trim().length > 0 &&
      !safeExternalUrl
    ) {
      return NextResponse.json(
        { error: "ลิงก์เว็บไซต์ภายนอกต้องขึ้นต้นด้วย https:// และเป็นโดเมนที่ถูกต้อง" },
        { status: 422 }
      );
    }

    // Anti-spam & duplicate checks
    const cleanGooglePlaceId = parsed.data.googlePlaceId?.trim() || null;
    if (cleanGooglePlaceId) {
      const dupGoogle = await prisma.hotel.findFirst({
        where: { googlePlaceId: cleanGooglePlaceId },
        select: { slug: true, nameTh: true },
      });
      if (dupGoogle) {
        return NextResponse.json(
          {
            error: `สถานที่นี้ถูกเปิดโปรไฟล์ไว้แล้ว (${dupGoogle.nameTh} · /${dupGoogle.slug})`,
          },
          { status: 409 }
        );
      }
    }

    const lat =
      typeof parsed.data.latitude === "number" &&
      Number.isFinite(parsed.data.latitude)
        ? parsed.data.latitude
        : null;
    const lng =
      typeof parsed.data.longitude === "number" &&
      Number.isFinite(parsed.data.longitude)
        ? parsed.data.longitude
        : null;

    if (lat !== null && lng !== null) {
      const nearbySameCat = await prisma.hotel.findMany({
        where: {
          placeCategory,
          latitude: { gte: lat - 0.002, lte: lat + 0.002 },
          longitude: { gte: lng - 0.002, lte: lng + 0.002 },
        },
        select: { slug: true, nameTh: true, latitude: true, longitude: true },
        take: 15,
      });
      const dupCoord = nearbySameCat.find(
        (h) =>
          typeof h.latitude === "number" &&
          typeof h.longitude === "number" &&
          computeHaversineKm(lat, lng, h.latitude, h.longitude) < 0.08
      );
      if (dupCoord) {
        return NextResponse.json(
          {
            error: `พบสถานที่ประเภทเดียวกันในรัศมี 80 ม. แล้ว (${dupCoord.nameTh} · /${dupCoord.slug})`,
          },
          { status: 409 }
        );
      }
    }

    if (
      resolvedMerchantMode === "PROFILE_ONLY" &&
      sessionUser.role !== "SUPER_ADMIN"
    ) {
      const pendingProfileOnlyCount = await prisma.hotel.count({
        where: {
          ownerId: sessionUser.id,
          merchantMode: "PROFILE_ONLY",
          verificationStatus: "PENDING_REVIEW",
        },
      });
      if (pendingProfileOnlyCount >= 3) {
        return NextResponse.json(
          {
            error:
              "บัญชีนี้สร้างสถานที่ที่รอยืนยันครบ 3 แห่งแล้ว กรุณารอทีมงานตรวจสอบก่อนเพิ่มสถานที่ใหม่",
          },
          { status: 429 }
        );
      }
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
      const catMeta = getPlaceCategoryMeta(placeCategory);

      const resolvedStyles =
        parsed.data.stayStyles && parsed.data.stayStyles.length > 0
          ? parsed.data.stayStyles
          : placeCategory === "STAY"
          ? parsed.data.propertyType === "POOL_VILLA"
            ? ["pool-villa"]
            : parsed.data.propertyType === "GLAMPING_HOMESTAY"
            ? ["glamping"]
            : ["mountain"]
          : [placeCategory.toLowerCase()];

      const uploadedGallery =
        parsed.data.firstRoom?.galleryUrls?.filter(Boolean) ?? [];
      const fallbackImg =
        parsed.data.coverImageUrl ||
        uploadedGallery[0] ||
        CATEGORY_DEFAULT_COVERS[placeCategory] ||
        CATEGORY_DEFAULT_COVERS.STAY;

      const resolvedTagline =
        parsed.data.taglineTh?.trim() ||
        (resolvedMerchantMode === "DIRECT_BOOKING"
          ? `จองตรงกับ ${parsed.data.nameTh} ไม่มีค่า GP`
          : `${catMeta.labelTh} · ${parsed.data.nameTh}`);

      const hotel = await tx.hotel.create({
        data: {
          slug,
          ownerId: sessionUser.id,
          placeCategory,
          merchantMode: resolvedMerchantMode,
          propertyType: parsed.data.propertyType ?? "BOUTIQUE_HOTEL",
          nameTh: parsed.data.nameTh,
          nameEn: parsed.data.nameEn || parsed.data.nameTh,
          taglineTh: resolvedTagline,
          provinceId: parsed.data.provinceId,
          districtTh: parsed.data.districtTh || "",
          addressTh: parsed.data.addressTh || "",
          latitude: lat,
          longitude: lng,
          googleMapsUrl: parsed.data.googleMapsUrl || null,
          googlePlaceId: cleanGooglePlaceId,
          externalWebsiteUrl: safeExternalUrl,
          primaryCtaLabelTh: parsed.data.primaryCtaLabelTh || "",
          openingHoursJson:
            parsed.data.openingHoursJson &&
            parsed.data.openingHoursJson.length > 0
              ? parsed.data.openingHoursJson
              : undefined,
          stayStyles: resolvedStyles,
          contactPhone: parsed.data.contactPhone || "",
          contactLine: parsed.data.contactLine || "",
          promptPayId:
            resolvedMerchantMode === "DIRECT_BOOKING"
              ? parsed.data.promptPayId || parsed.data.contactPhone || ""
              : "",
          promptPayAccountName:
            resolvedMerchantMode === "DIRECT_BOOKING"
              ? parsed.data.promptPayAccountName || parsed.data.nameTh
              : "",
          facebookPageUrl: parsed.data.facebookPageUrl || "",
          coverImageUrl: parsed.data.coverImageUrl || fallbackImg,
          logoUrl: parsed.data.coverImageUrl || fallbackImg,
          verificationStatus: "PENDING_REVIEW",
          isPublished:
            resolvedMerchantMode === "PROFILE_ONLY" ? true : !isQuickSetup,
        },
      });

      let starterRoomId: string | null = null;
      if (resolvedMerchantMode === "DIRECT_BOOKING" && !isQuickSetup) {
        const fr = parsed.data.firstRoom;
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
        starterRoomId = starterRoom.id;
      }

      const canonicalPin = await tx.pin.create({
        data: {
          hotelId: hotel.id,
          roomId: starterRoomId,
          category:
            placeCategory === "CAFE" || placeCategory === "RESTAURANT"
              ? "DINING"
              : placeCategory === "STAY"
              ? "ROOMS"
              : "VIEWS",
          titleTh: parsed.data.nameTh,
          descriptionTh: resolvedTagline,
          coverImageUrl: parsed.data.coverImageUrl || fallbackImg,
          mediaUrls:
            uploadedGallery.length > 0
              ? uploadedGallery
              : [parsed.data.coverImageUrl || fallbackImg],
          aspectRatio: "aspect-square",
          provinceId: parsed.data.provinceId,
          stayStyles: resolvedStyles,
          semanticTags: resolvedStyles,
          isCanonicalCard: true,
          publishStatus: "PUBLISHED",
        },
      });

      const updatedHotel = await tx.hotel.update({
        where: { id: hotel.id },
        data: { canonicalPinId: canonicalPin.id },
      });

      if (sessionUser.role === "TRAVELLER") {
        await tx.user.update({
          where: { id: sessionUser.id },
          data: { role: "HOTEL_OWNER" },
        });
      }

      return updatedHotel;
    });

    if (
      typeof created.latitude === "number" &&
      typeof created.longitude === "number"
    ) {
      void ensureThailandPlacesAroundCoord(
        created.latitude,
        created.longitude,
        created.provinceId
      );
    }

    revalidatePlaceCatalog({ slug: created.slug });
    return NextResponse.json({ hotel: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/studio/onboarding]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เปิดหน้าสถานที่ไมสำเร็จ" },
      { status: 400 }
    );
  }
}
