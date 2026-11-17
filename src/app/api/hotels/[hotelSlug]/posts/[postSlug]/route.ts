import { NextResponse } from "next/server";
import { getPublishedHotelPostDetail } from "@/lib/services/hotelPostService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hotelSlug: string; postSlug: string }> }
) {
  try {
    const { hotelSlug, postSlug } = await context.params;
    const detail = await getPublishedHotelPostDetail(hotelSlug, postSlug);
    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบบทความนี้หรือบทความยังไม่ได้เผยแพร่" },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[GET /api/hotels/[hotelSlug]/posts/[postSlug]]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดเนื้อหาบทความได้" },
      { status: 500 }
    );
  }
}

