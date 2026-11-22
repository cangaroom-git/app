import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  try {
    const { pinId } = await context.params;
    const updated = await prisma.pin.update({
      where: { id: pinId },
      data: { externalClickCount: { increment: 1 } },
      select: { id: true, externalClickCount: true },
    });
    return NextResponse.json({
      id: updated.id,
      externalClickCount: updated.externalClickCount,
    });
  } catch (err) {
    console.error("[POST /api/pins/[pinId]/click]", err);
    return NextResponse.json(
      { error: "Unable to record outbound click" },
      { status: 400 }
    );
  }
}
