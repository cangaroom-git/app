import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const [user, prefs, boards, bookings, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.systemConfig
        .findUnique({
          where: { key: `user_account_prefs:${sessionUser.id}` },
          select: { value: true, updatedAt: true },
        })
        .catch(() => null),
      prisma.savedBoard.findMany({
        where: { userId: sessionUser.id },
        select: {
          id: true,
          name: true,
          isPublic: true,
          createdAt: true,
          _count: { select: { pins: true } },
        },
      }),
      prisma.booking.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          bookingCode: true,
          checkInDate: true,
          checkOutDate: true,
          nights: true,
          guests: true,
          netTotalThb: true,
          status: true,
          createdAt: true,
          hotel: { select: { nameTh: true, slug: true } },
        },
      }),
      prisma.userCouponWallet.findMany({
        where: { userId: sessionUser.id },
        select: {
          claimedAt: true,
          usedAt: true,
          coupon: { select: { code: true, titleTh: true, expiresAt: true } },
        },
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      service: "Nondii Thailand Travel",
      pdpaNotice: "Personal data export under Thailand PDPA",
      account: user,
      preferences: prefs?.value ?? null,
      tripsAndWishlists: boards,
      bookings,
      couponWallet: wallet,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="nondii-my-data-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/account/export]", err);
    return NextResponse.json(
      { error: "ไม่สามารถส่งออกข้อมูลได้" },
      { status: 500 },
    );
  }
}
