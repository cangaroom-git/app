import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getPinDetailById } from "@/lib/services/stayDiscoveryService";

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

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[GET /api/pins/[pinId]]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายละเอียด Pin ได้" },
      { status: 500 }
    );
  }
}

