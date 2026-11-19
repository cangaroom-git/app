import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { computeNightsBetween } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";
import { getRoomsAvailabilityForRange } from "@/lib/services/availabilityService";
import { mapBookingRowToDto } from "@/lib/services/bookingCheckoutService";

const BookingActionSchema = z.object({
  hotelSlug: z.string().optional(),
  bookingId: z.string().trim().min(1),
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]),
});

const ManualBookingCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  roomId: z.string().trim().min(1),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(30).default(2),
  unitsBooked: z.number().int().min(1).max(20).default(1),
  netTotalThb: z.number().int().min(0).max(5000000),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(6).max(40),
  guestLine: z.string().trim().max(80).optional().nullable(),
  guestNote: z.string().trim().max(400).optional().nullable(),
  sourceLabel: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ManualBookingCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลใบจองไม่ครบถ้วน" },
        { status: 422 }
      );
    }

    const d = parsed.data;
    if (d.checkInDate >= d.checkOutDate) {
      return NextResponse.json(
        { error: "วันเช็กเอาต์ต้องหลังวันเช็กอินอย่างน้อย 1 คืน" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(d.hotelSlug);
    const room = await prisma.room.findFirst({
      where: { id: d.roomId, hotelId: hotel.id },
      select: { id: true, code: true, totalUnits: true },
    });
    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้องพักนี้" }, { status: 404 });
    }

    const availMap = await getRoomsAvailabilityForRange({
      roomIds: [room.id],
      checkInDate: d.checkInDate,
      checkOutDate: d.checkOutDate,
    });
    const avail = availMap.get(room.id)?.availableUnits ?? 0;
    if (avail < d.unitsBooked) {
      return NextResponse.json(
        {
          error: `ห้อง ${room.code} เหลือว่างเพียง ${avail} ห้องในช่วงวันที่เลือก (ต้องการ ${d.unitsBooked} ห้อง)`,
        },
        { status: 409 }
      );
    }

    const nights = computeNightsBetween(d.checkInDate, d.checkOutDate);
    const bookingCode = `WLK-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const notePrefix = d.sourceLabel ? `[${d.sourceLabel}] ` : "[Walk-in/LINE] ";

    const created = await prisma.booking.create({
      data: {
        bookingCode,
        hotelId: hotel.id,
        roomId: room.id,
        checkInDate: new Date(`${d.checkInDate}T00:00:00.000Z`),
        checkOutDate: new Date(`${d.checkOutDate}T00:00:00.000Z`),
        nights,
        guests: d.guests,
        unitsBooked: d.unitsBooked,
        roomSubtotalThb: d.netTotalThb,
        addonsTotalThb: 0,
        discountThb: 0,
        netTotalThb: d.netTotalThb,
        guestName: d.guestName,
        guestPhone: d.guestPhone,
        guestLine: d.guestLine || null,
        guestNote: `${notePrefix}${d.guestNote || ""}`.trim(),
        status: "CONFIRMED",
      },
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
    });

    return NextResponse.json(
      { booking: mapBookingRowToDto(created) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/studio/bookings]", err);
    return NextResponse.json(
      { error: "บันทึกใบจองไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = BookingActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const booking = await prisma.booking.findFirst({
      where: { id: parsed.data.bookingId, hotelId: hotel.id },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบใบจองนี้" }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: parsed.data.status,
        holdExpiresAt: null,
      },
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
    });

    return NextResponse.json({ booking: mapBookingRowToDto(updated) });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: "อัปเดตสถานะการจองไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
