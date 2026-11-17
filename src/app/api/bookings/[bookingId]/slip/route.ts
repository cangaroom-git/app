import { NextResponse } from "next/server";
import { z } from "zod";
import { submitBookingSlip } from "@/lib/services/bookingCheckoutService";

const SubmitSlipSchema = z.object({
  slipImageUrl: z.string().trim().min(1),
  slipQrPayload: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;
    const raw = await request.json();
    const parsed = SubmitSlipSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาแนบรูปสลิปโอนเงินให้ครบถ้วน" },
        { status: 422 }
      );
    }

    const booking = await submitBookingSlip({
      bookingId,
      slipImageUrl: parsed.data.slipImageUrl,
      slipQrPayload: parsed.data.slipQrPayload,
    });

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("[POST /api/bookings/[bookingId]/slip]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "แนบสลิปไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

