import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { recordPinShare } from "@/lib/services/pinEngagementService";

const ShareSchema = z.object({
  channel: z
    .enum(["LINE", "FACEBOOK", "COPY_LINK", "WEB_SHARE", "OTHER"])
    .optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const { pinId } = await context.params;
    const sessionUser = await getServerSessionUser();
    const raw = await request.json().catch(() => ({}));
    const parsed = ShareSchema.safeParse(raw);

    const result = await recordPinShare({
      pinId,
      userId: sessionUser?.id ?? null,
      channel: parsed.success ? parsed.data.channel : "COPY_LINK",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/pins/[pinId]/share]", err);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการแชร์ได้" },
      { status: 500 }
    );
  }
}

