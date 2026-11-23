import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PatchTripSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isPublic: z.boolean().optional(),
  orderedPinIds: z.array(z.string().trim().min(1)).max(200).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { boardId } = await context.params;
    const raw = await request.json();
    const parsed = PatchTripSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลสำหรับอัปเดตทริปไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const existing = await prisma.savedBoard.findFirst({
      where: { id: boardId, userId: sessionUser.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบทริปที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    const { name, isPublic, orderedPinIds } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (name) {
        await tx.savedBoard.update({
          where: { id: boardId },
          data: { name },
        });
      }

      if (typeof isPublic === "boolean") {
        await tx.$executeRaw`
          UPDATE "SavedBoard"
          SET "isPublic" = ${isPublic}
          WHERE "id" = ${boardId} AND "userId" = ${sessionUser.id}
        `;
      }

      if (orderedPinIds && orderedPinIds.length > 0) {
        const uniqueOrderedIds = Array.from(new Set(orderedPinIds));
        await Promise.all(
          uniqueOrderedIds.map((pinId, idx) =>
            tx.$executeRaw`
              UPDATE "SavedBoardPin"
              SET "sortOrder" = ${idx}
              WHERE "boardId" = ${boardId}
                AND "userId" = ${sessionUser.id}
                AND "pinId" = ${pinId}
            `
          )
        );
      }
    });

    return NextResponse.json({ updated: true, isPublic });
  } catch (err) {
    console.error("[PATCH /api/boards/[boardId]]", err);
    return NextResponse.json(
      { error: "อัปเดตทริปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

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
      { error: "ลบทริปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
