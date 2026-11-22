import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getHotelStorefrontBySlug } from "@/lib/services/hotelStorefrontService";

export async function GET(
  request: Request,
  context: { params: Promise<{ hotelSlug: string }> }
) {
  try {
    const { hotelSlug } = await context.params;
    const url = new URL(request.url);
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");
    const sessionUser = await getServerSessionUser();

    const storefront = await getHotelStorefrontBySlug(hotelSlug, {
      checkInDate: checkIn,
      checkOutDate: checkOut,
      userId: sessionUser?.id ?? null,
    });

    if (!storefront) {
      return NextResponse.json(
        { error: `ไม่พบที่พัก "@${hotelSlug}" บนระบบ Nondii` },
        { status: 404 }
      );
    }

    return NextResponse.json(storefront);
  } catch (err) {
    console.error("[GET /api/hotels/[hotelSlug]]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลที่พักได้" },
      { status: 500 }
    );
  }
}

