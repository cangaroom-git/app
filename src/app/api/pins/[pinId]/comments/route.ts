import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { addPinComment } from "@/lib/services/pinEngagementService";
import { getPinDetailById } from "@/lib/services/stayDiscoveryService";

const CreateCommentSchema = z.object({
  body: z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(1000),
  parentId: z.string().trim().optional().nullable(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const { pinId } = await context.params;
    const sessionUser = await getServerSessionUser();
    const detail = await getPinDetailById(pinId, sessionUser?.id ?? null);
    if (!detail) {
      return NextResponse.json({ error: "ไม่พบ Pin นี้" }, { status: 404 });
    }
    return NextResponse.json({ comments: detail.comments });
  } catch (err) {
    console.error("[GET /api/pins/[pinId]/comments]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดความคิดเห็นได้" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น" },
        { status: 401 }
      );
    }

    const { pinId } = await context.params;
    const raw = await request.json();
    const parsed = CreateCommentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อความไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const comment = await addPinComment({
      userId: sessionUser.id,
      pinId,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/pins/[pinId]/comments]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "ส่งความคิดเห็นไม่สำเร็จ",
      },
      { status: 400 }
    );
  }
}

