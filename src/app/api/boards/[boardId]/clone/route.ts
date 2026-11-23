import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateTripShareSlug } from "@/lib/tripShareSlug";

/**
 * POST /api/boards/[boardId]/clone
 * Clones a public trip (or user's own trip) with all its stays & exact `sortOrder`
 * into a new editable trip owned by the signed-in user.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อคัดลอกทริป" },
        { status: 401 }
      );
    }

    const { boardId } = await context.params;
    const cleanKey = (boardId || "").trim();
    if (!cleanKey) {
      return NextResponse.json({ error: "ไม่พบทริป" }, { status: 404 });
    }

    const sourceRows = await prisma
      .$queryRaw<
        Array<{
          id: string;
          userId: string;
          name: string;
          isPublic: boolean | null;
        }>
      >`
        SELECT "id", "userId", "name", "isPublic"
        FROM "SavedBoard"
        WHERE "id" = ${cleanKey} OR "shareSlug" = ${cleanKey}
        LIMIT 1
      `
      .catch(() => []);

    const source = sourceRows[0];
    if (!source) {
      return NextResponse.json(
        { error: "ไม่พบทริปที่ต้องการคัดลอก" },
        { status: 404 }
      );
    }

    const isAllowed =
      (source.isPublic ?? true) || source.userId === sessionUser.id;
    if (!isAllowed) {
      return NextResponse.json(
        { error: "ทริปนี้ถูกตั้งค่าเป็นส่วนตัว" },
        { status: 403 }
      );
    }

    const sourcePins = await prisma
      .$queryRaw<
        Array<{
          pinId: string;
          sortOrder: number;
          savedPriceSnapshotThb: number | null;
        }>
      >`
        SELECT "pinId", COALESCE("sortOrder", 0) AS "sortOrder", "savedPriceSnapshotThb"
        FROM "SavedBoardPin"
        WHERE "boardId" = ${source.id}
        ORDER BY COALESCE("sortOrder", 0) ASC, "createdAt" ASC
      `
      .catch(() => []);

    const newShareSlug = generateTripShareSlug();
    const clonedName =
      source.userId === sessionUser.id
        ? `${source.name} (สำเนา)`.slice(0, 80)
        : source.name.slice(0, 80);

    const created = await prisma.$transaction(async (tx) => {
      const board = await tx.savedBoard.create({
        data: {
          userId: sessionUser.id,
          name: clonedName,
        },
      });

      await tx.$executeRaw`
        UPDATE "SavedBoard"
        SET "shareSlug" = ${newShareSlug}, "isPublic" = true
        WHERE "id" = ${board.id}
      `;

      for (let idx = 0; idx < sourcePins.length; idx++) {
        const sp = sourcePins[idx];
        const createdPin = await tx.savedBoardPin.create({
          data: {
            boardId: board.id,
            pinId: sp.pinId,
            userId: sessionUser.id,
            savedPriceSnapshotThb: sp.savedPriceSnapshotThb,
          },
        });
        await tx.$executeRaw`
          UPDATE "SavedBoardPin"
          SET "sortOrder" = ${idx}
          WHERE "id" = ${createdPin.id}
        `;
      }

      return board;
    });

    return NextResponse.json(
      {
        board: {
          id: created.id,
          name: created.name,
          shareSlug: newShareSlug,
          isPublic: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/boards/[boardId]/clone]", err);
    return NextResponse.json(
      { error: "คัดลอกทริปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
