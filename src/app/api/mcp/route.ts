import { NextResponse } from "next/server";
import { computeCouponDiscount, computeNightsBetween } from "@/lib/bookingMath";
import { listMarketplaceDeals } from "@/lib/services/couponService";
import { getHotelStorefrontBySlug } from "@/lib/services/hotelStorefrontService";
import { searchDiscoveryPins } from "@/lib/services/stayDiscoveryService";

const MCP_TOOLS = [
  {
    name: "search_thailand_stays",
    description:
      "Search verified Thailand hotels and villas with real availability, province, stay style (mountain, pool-villa, sea, bars, bathtub, glamping), and price filtering.",
    inputSchema: {
      type: "object",
      properties: {
        provinceId: { type: "string", description: "Province ID slug e.g. nan, chiang-mai, phuket, krabi, bangkok" },
        style: { type: "string", description: "mountain | pool-villa | sea | bars | bathtub | glamping" },
        query: { type: "string", description: "Free-text search keyword" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "number" },
        maxPriceThb: { type: "number" },
      },
    },
  },
  {
    name: "get_hotel_details",
    description:
      "Fetch complete property profile, rooms, live unit availability, policies, reviews, and coupons for a Nondii hotelSlug.",
    inputSchema: {
      type: "object",
      required: ["hotelSlug"],
      properties: {
        hotelSlug: { type: "string" },
        checkIn: { type: "string" },
        checkOut: { type: "string" },
      },
    },
  },
  {
    name: "list_active_coupons",
    description: "List active direct-booking hotel discount coupons across Thailand.",
    inputSchema: {
      type: "object",
      properties: {
        provinceId: { type: "string" },
        hotelSlug: { type: "string" },
      },
    },
  },
  {
    name: "create_direct_booking_link",
    description:
      "Calculate stay total (with optional coupon) and return a direct checkout deep link for human payment confirmation.",
    inputSchema: {
      type: "object",
      required: ["hotelSlug", "roomId", "checkIn", "checkOut"],
      properties: {
        hotelSlug: { type: "string" },
        roomId: { type: "string" },
        checkIn: { type: "string" },
        checkOut: { type: "string" },
        guests: { type: "number" },
        couponCode: { type: "string" },
      },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    protocol: "model-context-protocol",
    server: "nondii-stays-mcp",
    version: "1.0.0",
    tools: MCP_TOOLS,
  });
}

export async function POST(request: Request) {
  let reqId: unknown = null;
  try {
    const origin = new URL(request.url).origin;
    const payload = (await request.json()) as {
      jsonrpc?: string;
      id?: unknown;
      method?: string;
      params?: Record<string, unknown>;
    };
    reqId = payload.id ?? null;

    if (payload.method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: reqId,
        result: {
          protocolVersion: "2025-03-26",
          serverInfo: { name: "nondii-stays-mcp", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      });
    }

    if (payload.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: reqId,
        result: { tools: MCP_TOOLS },
      });
    }

    if (payload.method === "tools/call") {
      const toolName = String(payload.params?.name || "");
      const args = (payload.params?.arguments || {}) as Record<string, unknown>;

      let data: unknown;
      if (toolName === "search_thailand_stays") {
        const pins = await searchDiscoveryPins({
          provinceId: args.provinceId ? String(args.provinceId) : null,
          style: args.style ? String(args.style) : null,
          q: args.query ? String(args.query) : null,
          checkIn: args.checkIn ? String(args.checkIn) : null,
          checkOut: args.checkOut ? String(args.checkOut) : null,
          guests: args.guests ? Number(args.guests) : null,
          maxPriceThb: args.maxPriceThb ? Number(args.maxPriceThb) : null,
          limit: 12,
        });
        data = pins.map((p) => ({
          hotelSlug: p.hotelSlug,
          hotelNameTh: p.hotelNameTh,
          hotelNameEn: p.hotelNameEn,
          verified: p.hotelVerificationStatus === "VERIFIED",
          isSponsored: p.isSponsored,
          province: p.provinceNameTh,
          title: p.titleTh,
          roomId: p.roomId,
          nightlyPriceThb: p.nightlyPriceThb,
          directUrl: `${origin}/${p.hotelSlug}`,
        }));
      } else if (toolName === "get_hotel_details") {
        const storefront = await getHotelStorefrontBySlug(
          String(args.hotelSlug || ""),
          {
            checkInDate: args.checkIn ? String(args.checkIn) : null,
            checkOutDate: args.checkOut ? String(args.checkOut) : null,
          }
        );
        if (!storefront) {
          throw new Error("Hotel not found");
        }
        data = {
          hotel: storefront.hotel,
          rooms: storefront.rooms,
          coupons: storefront.coupons,
          reviews: storefront.reviews.slice(0, 5),
          directUrl: `${origin}/${storefront.hotel.slug}`,
        };
      } else if (toolName === "list_active_coupons") {
        data = await listMarketplaceDeals({
          provinceId: args.provinceId ? String(args.provinceId) : null,
          hotelSlug: args.hotelSlug ? String(args.hotelSlug) : null,
          limit: 20,
        });
      } else if (toolName === "create_direct_booking_link") {
        const slug = String(args.hotelSlug || "");
        const roomId = String(args.roomId || "");
        const checkIn = String(args.checkIn || "");
        const checkOut = String(args.checkOut || "");
        const guests = Number(args.guests || 2);
        const couponCode = args.couponCode ? String(args.couponCode).toUpperCase() : null;

        const storefront = await getHotelStorefrontBySlug(slug, {
          checkInDate: checkIn,
          checkOutDate: checkOut,
        });
        if (!storefront) throw new Error("Hotel not found");
        const room = storefront.rooms.find((r) => r.id === roomId);
        if (!room) throw new Error("Room not found");

        const nights = computeNightsBetween(checkIn, checkOut);
        const subtotal = room.weekdayPriceThb * nights;
        const matchedCoupon = couponCode
          ? storefront.coupons.find((c) => c.code === couponCode) || null
          : null;
        const discount = matchedCoupon
          ? computeCouponDiscount(matchedCoupon, subtotal).discountThb
          : 0;

        const query = new URLSearchParams({
          room: room.id,
          checkIn,
          checkOut,
          guests: String(guests),
          ...(matchedCoupon ? { coupon: matchedCoupon.code } : {}),
        });

        data = {
          hotelSlug: slug,
          hotelNameTh: storefront.hotel.nameTh,
          roomNameTh: room.nameTh,
          availableUnits: room.availableUnits,
          nights,
          estimatedSubtotalThb: subtotal,
          discountThb: discount,
          estimatedNetTotalThb: Math.max(0, subtotal - discount),
          directCheckoutUrl: `${origin}/${slug}?${query.toString()}`,
        };
      } else {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: reqId,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id: reqId,
        result: {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        },
      });
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: reqId,
        error: { code: -32601, message: "Unsupported MCP method" },
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: reqId,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : "MCP error",
        },
      },
      { status: 500 }
    );
  }
}

