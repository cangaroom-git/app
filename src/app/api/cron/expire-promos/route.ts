import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";

async function runAutoExpire() {
  const now = new Date();

  const [expiredInbox, expiredCoupons, expiredCampaignPins] = await prisma.$transaction([
    prisma.promoInboxItem.updateMany({
      where: {
        status: "PENDING_REVIEW",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    }),
    prisma.coupon.updateMany({
      where: {
        isActive: true,
        expiresAt: { lte: now },
      },
      data: { isActive: false },
    }),
    // Multi-campaign brand/credit-card promo pins (non-canonical) are unpublished when expired
    prisma.pin.updateMany({
      where: {
        publishStatus: "PUBLISHED",
        isCanonicalCard: false,
        promoExpiresAt: { lte: now },
      },
      data: { publishStatus: "DISCARDED" },
    }),
  ]);

  revalidatePlaceCatalog();

  return {
    expiredInboxCount: expiredInbox.count,
    expiredCouponsCount: expiredCoupons.count,
    archivedCampaignPinsCount: expiredCampaignPins.count,
    ranAt: now.toISOString(),
  };
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization") || "";
  const isCronAuthorized =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuthorized) {
    const guard = await requireSuperAdminApi();
    if ("error" in guard) return guard.error;
  }

  try {
    const result = await runAutoExpire();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[POST /api/cron/expire-promos]", err);
    return NextResponse.json(
      { error: "รัน Auto-Expire ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
