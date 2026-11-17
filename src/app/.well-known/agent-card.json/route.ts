import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    name: "Cangaroom Thailand Direct Stays Agent",
    description:
      "Visual stay discovery and 0% GP direct hotel booking platform across all 77 provinces in Thailand (mountain villas, pool villas, beachfront resorts, glamping, onsen & rooftop hotels).",
    version: "1.0.0",
    url: origin,
    supportedInterfaces: [
      {
        url: `${origin}/api/mcp`,
        protocolBinding: "MCP-JSON-RPC",
        protocolVersion: "2025-03-26",
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    skills: [
      {
        id: "search_thailand_stays",
        name: "Search Thailand Direct Stays",
        description:
          "Find verified Thailand accommodations filtered by province, stay style (mountain, pool-villa, sea, bars, bathtub, glamping), dates, guests, and budget.",
        tags: ["travel", "thailand", "hotels", "direct-booking", "0-gp"],
      },
      {
        id: "get_hotel_details",
        name: "Get Hotel Storefront & Room Availability",
        description:
          "Retrieve room rates, real-time availability, pet policies, active coupons, and verified guest reviews for any cangaroom/{hotelSlug} property.",
        tags: ["hotel", "availability", "rooms", "rates"],
      },
      {
        id: "list_active_coupons",
        name: "List Active Hotel Discount Coupons",
        description:
          "Discover active direct-booking discount vouchers across Thailand hotels.",
        tags: ["coupons", "deals", "discounts"],
      },
      {
        id: "create_direct_booking_link",
        name: "Create Direct Checkout Deep Link",
        description:
          "Calculates net price after coupon and returns a verified direct checkout URL so the traveler completes PromptPay payment safely.",
        tags: ["booking", "checkout", "human-in-the-loop"],
      },
    ],
  });
}

