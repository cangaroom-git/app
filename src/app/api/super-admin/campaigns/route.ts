import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const TogglePinSponsorSchema = z.object({
  targetType: z.enum(["PIN", "COUPON", "CAMPAIGN"]),
  id: z.string().trim().min(1),
  isSponsored: z.boolean().optional(),
  sponsoredPriority: z.number().int().min(0).max(1000).optional(),
  isFeaturedDeal: z.boolean().optional(),
  campaignStatus: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
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

    const [pins, coupons, campaigns] = await Promise.all([
      prisma.pin.findMany({
        where: { publishStatus: "PUBLISHED" },
        orderBy: [{ isSponsored: "desc" }, { sponsoredPriority: "desc" }, { likesCount: "desc" }],
        take: 60,
        select: {
          id: true,
          titleTh: true,
          coverImageUrl: true,
          provinceId: true,
          isSponsored: true,
          sponsoredPriority: true,
          likesCount: true,
          savesCount: true,
          hotel: { select: { id: true, slug: true, nameTh: true } },
        },
      }),
      prisma.coupon.findMany({
        where: { isActive: true },
        orderBy: [{ isFeaturedDeal: "desc" }, { claimedCount: "desc" }],
        take: 40,
        select: {
          id: true,
          code: true,
          titleTh: true,
          discountType: true,
          discountValue: true,
          claimedCount: true,
          isFeaturedDeal: true,
          hotel: { select: { id: true, slug: true, nameTh: true } },
        },
      }),
      prisma.sponsoredCampaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          hotel: { select: { slug: true, nameTh: true } },
          pin: { select: { titleTh: true } },
          coupon: { select: { code: true } },
        },
      }),
    ]);

    return NextResponse.json({ pins, coupons, campaigns });
  } catch (err) {
    console.error("[GET /api/super-admin/campaigns]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลโฆษณาได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = TogglePinSponsorSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    if (parsed.data.targetType === "PIN") {
      const pin = await prisma.pin.update({
        where: { id: parsed.data.id },
        data: {
          isSponsored: parsed.data.isSponsored ?? false,
          sponsoredPriority: parsed.data.sponsoredPriority ?? 50,
        },
      });
      return NextResponse.json({ pin });
    }

    if (parsed.data.targetType === "COUPON") {
      const coupon = await prisma.coupon.update({
        where: { id: parsed.data.id },
        data: {
          isFeaturedDeal: parsed.data.isFeaturedDeal ?? false,
        },
      });
      return NextResponse.json({ coupon });
    }

    const campaign = await prisma.sponsoredCampaign.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.campaignStatus ?? "ACTIVE",
      },
    });
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("[PATCH /api/super-admin/campaigns]", err);
    return NextResponse.json(
      { error: "อัปเดตแคมเปญโฆษณาไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

