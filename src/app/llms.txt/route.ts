import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const hotels = await prisma.hotel
    .findMany({
      where: { isPublished: true, verificationStatus: { not: "SUSPENDED" } },
      take: 30,
      orderBy: { ratingAvg: "desc" },
      select: {
        slug: true,
        nameTh: true,
        nameEn: true,
        provinceId: true,
        stayStyles: true,
      },
    })
    .catch(() => []);

  const hotelLines = hotels
    .map(
      (h) =>
        `- ${h.nameTh} (${h.nameEn || h.slug}) [${h.provinceId}] -> ${origin}/${h.slug} (styles: ${h.stayStyles.join(", ")})`
    )
    .join("\n");

  const body = `# Nondii — Thailand Visual Stay Discovery & 0% GP Direct Booking

> Nondii connects travelers directly with verified Thai hotels, pool villas, mountain cabins, beachfront stays, and glamping properties with zero OTA commission (0% GP).

## Agentic Endpoints
- A2A Agent Card: ${origin}/.well-known/agent-card.json
- Model Context Protocol (MCP): ${origin}/api/mcp

## Key Human URLs
- Discovery Feed: ${origin}/
- Saved Stay Trips: ${origin}/trip
- Explore Map: ${origin}/explore
- My Bookings & Coupon Wallet: ${origin}/bookings
- Thailand Hotel Coupons Hub: ${origin}/deal
- Hotel Storefronts: ${origin}/{hotelSlug}

## Published Verified Properties
${hotelLines || "- Browse live directory via /api/pins"}
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

