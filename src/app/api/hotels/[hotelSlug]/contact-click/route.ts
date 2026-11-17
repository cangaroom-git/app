import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const ContactClickSchema = z.object({
  channel: z.enum(["LINE", "FACEBOOK_MESSENGER", "PHONE"]),
  roomId: z.string().trim().optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ hotelSlug: string }> }
) {
  try {
    const { hotelSlug } = await context.params;
    const raw = await request.json();
    const parsed = ContactClickSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug.trim().toLowerCase() },
      select: { id: true },
    });
    if (!hotel) {
      return NextResponse.json({ error: "ไม่พบที่พัก" }, { status: 404 });
    }

    const sessionUser = await getServerSessionUser();

    await prisma.contactClickLog.create({
      data: {
        hotelId: hotel.id,
        roomId: parsed.data.roomId ?? null,
        userId: sessionUser?.id ?? null,
        channel: parsed.data.channel,
      },
    });

    return NextResponse.json({ logged: true });
  } catch (err) {
    console.error("[POST /api/hotels/[hotelSlug]/contact-click]", err);
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}

