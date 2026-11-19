import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";

const ReplySchema = z.object({
  hotelSlug: z.string().optional(),
  reviewId: z.string().trim().min(1),
  ownerReplyTh: z.string().trim().max(1000),
});

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ReplySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลคำตอบรีวิวไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const existing = await prisma.guestReview.findFirst({
      where: { id: parsed.data.reviewId, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรีวิวนี้" }, { status: 404 });
    }

    const cleanReply = parsed.data.ownerReplyTh.trim();
    const updated = await prisma.guestReview.update({
      where: { id: existing.id },
      data: {
        ownerReplyTh: cleanReply || null,
        ownerRepliedAt: cleanReply ? new Date() : null,
      },
    });

    return NextResponse.json({ review: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "บันทึกคำตอบรีวิวไม่สำเร็จ" }, { status: 400 });
  }
}
