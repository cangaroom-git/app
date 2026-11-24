import { NextResponse } from "next/server";
import { getPublicCommunityTrips } from "@/lib/services/boardService";

export async function GET() {
  try {
    const trips = await getPublicCommunityTrips(12);
    return NextResponse.json(
      { trips },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load public community trips:", error);
    return NextResponse.json(
      { error: "Unable to load community trips" },
      { status: 500 }
    );
  }
}
