import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { deletePinComment } from "@/lib/services/pinEngagementService";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { commentId } = await context.params;
    const result = await deletePinComment({
      userId: sessionUser.id,
      userRole: sessionUser.role,
      commentId,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[DELETE /api/comments/[commentId]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ลบความคิดเห็นไม่สำเร็จ" },
      { status: 403 }
    );
  }
}

