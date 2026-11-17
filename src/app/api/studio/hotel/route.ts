import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { formatDateStr } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";
import { mapBookingRowToDto } from "@/lib/services/bookingCheckoutService";
import { mapHotelPostToDetailDto } from "@/lib/services/hotelPostService";
import { mapPinToDto } from "@/lib/services/pinMapper";

const UpdateHotelSchema = z.object({
  hotelSlug: z.string().optional(),
  nameTh: z.string().trim().min(2).max(120).optional(),
  nameEn: z.string().trim().max(120).optional(),
  taglineTh: z.string().trim().max(240).optional(),
  descriptionTh: z.string().trim().max(2000).optional(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  provinceId: z.string().trim().min(2).optional(),
  districtTh: z.string().trim().max(120).optional(),
  addressTh: z.string().trim().max(300).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  googleMapsUrl: z.string().trim().max(400).optional().nullable(),
  stayStyles: z.array(z.string()).optional(),
  checkInTime: z.string().trim().max(10).optional(),
  checkOutTime: z.string().trim().max(10).optional(),
  petsAllowed: z.boolean().optional(),
  petPolicyTh: z.string().trim().max(300).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactLine: z.string().trim().max(80).optional(),
  facebookPageUrl: z.string().trim().max(300).optional(),
  instagramUrl: z.string().trim().max(300).optional(),
  promptPayId: z.string().trim().max(30).optional(),
  promptPayAccountName: z.string().trim().max(120).optional(),
  bankName: z.string().trim().max(80).optional(),
  bankAccountNo: z.string().trim().max(40).optional(),
  nearbySpotsJson: z
    .array(z.object({ nameTh: z.string(), distTh: z.string() }))
    .optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedSlug = url.searchParams.get("hotel");
    const { hotel } = await requireHotelStudioAccess(requestedSlug);

    const [
      fullHotel,
      rooms,
      dateOverrides,
      addons,
      coupons,
      pins,
      bookings,
      socialConnections,
      campaigns,
      contactClicksCount,
      boardSavesAgg,
      posts,
    ] = await Promise.all([
      prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } }),
      prisma.room.findMany({
        where: { hotelId: hotel.id },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.roomDateOverride.findMany({
        where: {
          room: { hotelId: hotel.id },
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        orderBy: { date: "asc" },
        take: 100,
      }),
      prisma.hotelAddon.findMany({
        where: { hotelId: hotel.id },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.coupon.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pin.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              verificationStatus: true,
              ratingAvg: true,
              rooms: { select: { weekdayPriceThb: true } },
            },
          },
          room: {
            select: {
              code: true,
              nameTh: true,
              nameEn: true,
              weekdayPriceThb: true,
            },
          },
          coupon: { select: { code: true } },
        },
      }),
      prisma.booking.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        take: 80,
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              promptPayId: true,
              promptPayAccountName: true,
            },
          },
          room: { select: { code: true, nameTh: true, nameEn: true } },
          coupon: { select: { code: true } },
        },
      }),
      prisma.socialConnection.findMany({
        where: { hotelId: hotel.id },
      }),
      prisma.sponsoredCampaign.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactClickLog.groupBy({
        by: ["channel"],
        where: { hotelId: hotel.id },
        _count: { _all: true },
      }),
      prisma.savedBoardPin.count({
        where: { pin: { hotelId: hotel.id } },
      }),
      prisma.hotelPost.findMany({
        where: { hotelId: hotel.id },
        orderBy: { publishedAt: "desc" },
        include: {
          room: {
            select: { code: true, nameTh: true, weekdayPriceThb: true },
          },
        },
      }),
    ]);

    const confirmedRevenueThb = bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
      .reduce((acc, b) => acc + b.netTotalThb, 0);

    const clickStats = {
      LINE: 0,
      FACEBOOK_MESSENGER: 0,
      PHONE: 0,
    };
    for (const grp of contactClicksCount) {
      clickStats[grp.channel] = grp._count._all;
    }

    return NextResponse.json({
      hotel: fullHotel,
      stats: {
        boardSavesCount: boardSavesAgg,
        contactClicksTotal:
          clickStats.LINE + clickStats.FACEBOOK_MESSENGER + clickStats.PHONE,
        contactClicksByChannel: clickStats,
        confirmedRevenueThb,
        estimatedOtaGpSavedThb: Math.round(confirmedRevenueThb * 0.18),
        pendingBookingsCount: bookings.filter(
          (b) => b.status === "PENDING_VERIFICATION"
        ).length,
        pendingSyncPinsCount: pins.filter(
          (p) => p.publishStatus === "PENDING_APPROVAL"
        ).length,
      },
      rooms,
      dateOverrides: dateOverrides.map((o) => ({
        id: o.id,
        roomId: o.roomId,
        dateStr: formatDateStr(o.date),
        blockedUnits: o.blockedUnits,
        overridePriceThb: o.overridePriceThb,
        note: o.note,
      })),
      addons,
      coupons,
      pins: pins.map((p) => mapPinToDto(p)),
      bookings: bookings.map(mapBookingRowToDto),
      socialConnections,
      campaigns,
      posts: posts.map((post) => mapHotelPostToDetailDto(post, fullHotel)),
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[GET /api/studio/hotel]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลหลังบ้านได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = UpdateHotelSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { hotelSlug: _ignored, ...updateData } = parsed.data;

    const updated = await prisma.hotel.update({
      where: { id: hotel.id },
      data: updateData,
    });

    return NextResponse.json({ hotel: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[PATCH /api/studio/hotel]", err);
    return NextResponse.json(
      { error: "บันทึกข้อมูลที่พักไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

