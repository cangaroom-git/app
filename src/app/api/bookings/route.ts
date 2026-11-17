import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  createBookingHold,
  listTravellerBookings,
} from "@/lib/services/bookingCheckoutService";

const CreateBookingSchema = z.object({
  hotelSlug: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(30),
  unitsBooked: z.number().int().min(1).max(10).optional(),
  addonQuantities: z.record(z.string(), z.number().int().min(0)).optional(),
  couponCode: z.string().trim().optional().nullable(),
  guestName: z.string().trim().min(2, "กรุณาระบุชื่อผู้เข้าพัก").max(100),
  guestPhone: z.string().trim().min(6, "กรุณาระบุเบอร์โทรศัพท์").max(30),
  guestEmail: z.string().trim().optional().nullable(),
  guestLine: z.string().trim().optional().nullable(),
  guestNote: z.string().trim().max(400).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const phone = url.searchParams.get("phone");
    const sessionUser = await getServerSessionUser();

    const bookings = await listTravellerBookings({
      userId: sessionUser?.id ?? null,
      lookupCode: code,
      lookupPhone: phone,
    });

    return NextResponse.json({
      authenticated: Boolean(sessionUser),
      bookings,
    });
  } catch (err) {
    console.error("[GET /api/bookings]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติการจองได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = CreateBookingSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลการจองไม่ครบถ้วน" },
        { status: 422 }
      );
    }

    const sessionUser = await getServerSessionUser();
    const booking = await createBookingHold({
      ...parsed.data,
      userId: sessionUser?.id ?? null,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "สร้างรายการจองไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

