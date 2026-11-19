import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { togglePinLike } from "@/lib/services/pinEngagementService";

export async function POST(
  request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อกดถูกใจ" },
        { status: 401 }
      );
    }

    const { pinId } = await context.params;
    let desiredLiked: boolean | undefined;
    try {
      const body = (await request.json()) as { desiredLiked?: unknown };
      if (typeof body?.desiredLiked === "boolean") {
        desiredLiked = body.desiredLiked;
      }
    } catch {
      // empty body -> fallback toggle
    }

    const result = await togglePinLike(sessionUser.id, pinId, desiredLiked);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/pins/[pinId]/like]", err);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการถูกใจได้" },
      { status: 500 }
    );
  }
}

