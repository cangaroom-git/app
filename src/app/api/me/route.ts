import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedMeProfile,
  getServerSessionUser,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const UpdateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});

export async function GET() {
  try {
    const profile = await getAuthenticatedMeProfile();
    return NextResponse.json({ user: profile });
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateMeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined
          ? { phone: parsed.data.phone || null }
          : {}),
      },
    });

    const updated = await getAuthenticatedMeProfile();
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[PATCH /api/me]", err);
    return NextResponse.json(
      { error: "บันทึกข้อมูลไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

