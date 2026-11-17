import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PatchUserRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["TRAVELLER", "HOTEL_OWNER", "SUPER_ADMIN"]),
});

async function requireSuperAdmin() {
  const user = await getServerSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  }
  if (user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            ownedHotels: true,
            bookings: true,
            boards: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[GET /api/super-admin/users]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายชื่อผู้ใช้งานได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = PatchUserRoleSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { email: true },
    });
    if (target?.email === "cangaroomapp@gmail.com") {
      return NextResponse.json(
        { error: "ไม่สามารถลดสิทธิ์บัญชีผู้ก่อตั้งแพลตฟอร์มได้" },
        { status: 403 }
      );
    }

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[PATCH /api/super-admin/users]", err);
    return NextResponse.json(
      { error: "อัปเดตสิทธิ์ผู้ใช้ไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

