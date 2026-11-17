import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { boardId } = await context.params;
    await prisma.savedBoard.deleteMany({
      where: { id: boardId, userId: sessionUser.id },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/boards/[boardId]]", err);
    return NextResponse.json(
      { error: "ลบบอร์ดไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

