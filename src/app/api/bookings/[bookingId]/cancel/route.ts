import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { mapBookingRowToDto } from "@/lib/services/bookingCheckoutService";

export async function POST(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;
    const sessionUser = await getServerSessionUser();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: { select: { ownerId: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    // Allow cancellation if it's still an unconfirmed hold by guest or authorized user/owner
    const canCancel =
      booking.status === "HOLD_PENDING_PAYMENT" ||
      (sessionUser &&
        (sessionUser.role === "SUPER_ADMIN" ||
          booking.userId === sessionUser.id ||
          booking.hotel.ownerId === sessionUser.id));

    if (!canCancel) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ยกเลิกรายการจองนี้" },
        { status: 403 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", holdExpiresAt: null },
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
    console.error("[POST /api/bookings/[bookingId]/cancel]", err);
    return NextResponse.json(
      { error: "ยกเลิกใบจองไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

