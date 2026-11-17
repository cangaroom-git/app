import { NextResponse } from "next/server";
import { listPublishedHotelPostsBySlug } from "@/lib/services/hotelPostService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hotelSlug: string }> }
) {
  try {
    const { hotelSlug } = await context.params;
    const data = await listPublishedHotelPostsBySlug(hotelSlug);
    if (!data) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลบทความของที่พักนี้" },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/hotels/[hotelSlug]/posts]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดบทความของที่พักได้" },
      { status: 500 }
    );
  }
}

