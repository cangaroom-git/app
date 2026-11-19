import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { toggleSavePinToBoard } from "@/lib/services/pinEngagementService";

const TogglePinSchema = z.object({
  pinId: z.string().trim().min(1),
  boardId: z.string().trim().optional().nullable(),
  action: z.enum(["toggle", "save", "unsave", "move"]).optional(),
  fromBoardId: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อบันทึกที่พักเข้าบอร์ด" },
        { status: 401 }
      );
    }

    const raw = await request.json();
    const parsed = TogglePinSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const result = await toggleSavePinToBoard({
      userId: sessionUser.id,
      pinId: parsed.data.pinId,
      boardId: parsed.data.boardId ?? null,
      action: parsed.data.action ?? "toggle",
      fromBoardId: parsed.data.fromBoardId ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/boards/toggle-pin]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "บันทึก Pin ไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

