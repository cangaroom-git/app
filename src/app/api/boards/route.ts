import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserSavedBoards } from "@/lib/services/boardService";
import { generateTripShareSlug } from "@/lib/tripShareSlug";

const CreateBoardSchema = z.object({
  name: z.string().trim().min(1, "กรุณาตั้งชื่อทริป").max(80),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({
        authenticated: false,
        boards: [],
      });
    }

    const boards = await getUserSavedBoards(sessionUser.id);
    return NextResponse.json({
      authenticated: true,
      boards,
    });
  } catch (err) {
    console.error("[GET /api/boards]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดทริปที่บันทึกได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อสร้างทริป" },
        { status: 401 }
      );
    }

    const raw = await request.json();
    const parsed = CreateBoardSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ชื่อทริปไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const shareSlug = generateTripShareSlug();
    const isPublic = parsed.data.isPublic ?? true;

    const board = await prisma.savedBoard.create({
      data: {
        userId: sessionUser.id,
        name: parsed.data.name,
      },
    });

    await prisma
      .$executeRaw`
        UPDATE "SavedBoard"
        SET "shareSlug" = ${shareSlug}, "isPublic" = ${isPublic}
        WHERE "id" = ${board.id}
      `
      .catch(() => {});

    return NextResponse.json(
      { board: { ...board, shareSlug, isPublic } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/boards]", err);
    return NextResponse.json(
      { error: "สร้างทริปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
