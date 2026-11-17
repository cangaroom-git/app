import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { listMarketplaceDeals } from "@/lib/services/couponService";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provinceId = url.searchParams.get("provinceId");
    const style = url.searchParams.get("style");
    const hotelSlug = url.searchParams.get("hotelSlug");
    const q = url.searchParams.get("q");

    const sessionUser = await getServerSessionUser();
    const deals = await listMarketplaceDeals({
      provinceId,
      style,
      hotelSlug,
      q,
      userId: sessionUser?.id ?? null,
    });

    return NextResponse.json({ deals });
  } catch (err) {
    console.error("[GET /api/deals]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดคูปองส่วนลดได้" },
      { status: 500 }
    );
  }
}

