import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";
import { mapBookingRowToDto } from "@/lib/services/bookingCheckoutService";

const BookingActionSchema = z.object({
  hotelSlug: z.string().optional(),
  bookingId: z.string().trim().min(1),
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]),
});

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

