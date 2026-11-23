import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";

const PatchHotelStatusSchema = z.object({
  hotelId: z.string().trim().min(1),
  verificationStatus: z
    .enum(["PENDING_REVIEW", "VERIFIED", "SUSPENDED"])
    .optional(),
  isPublished: z.boolean().optional(),
});

async function requireSuperAdmin() {
  const user = await getServerSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  }
  if (user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export async function GET() {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const hotels = await prisma.hotel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true } },
        _count: {
          select: {
            rooms: true,
            pins: true,
            coupons: true,
            bookings: true,
          },
        },
      },
    });

    return NextResponse.json({ hotels });
  } catch (err) {
    console.error("[GET /api/super-admin/hotels]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการที่พักได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = PatchHotelStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const updated = await prisma.hotel.update({
      where: { id: parsed.data.hotelId },
      data: {
        ...(parsed.data.verificationStatus
          ? { verificationStatus: parsed.data.verificationStatus }
          : {}),
        ...(parsed.data.isPublished !== undefined
          ? { isPublished: parsed.data.isPublished }
          : {}),
      },
    });

    revalidatePlaceCatalog({ slug: updated.slug });
    return NextResponse.json({ hotel: updated });
  } catch (err) {
    console.error("[PATCH /api/super-admin/hotels]", err);
    return NextResponse.json(
      { error: "อัปเดตสถานะที่พักไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

