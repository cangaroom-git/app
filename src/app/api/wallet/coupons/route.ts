import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  claimCouponToWallet,
  listUserWalletCoupons,
  removeCouponFromWallet,
} from "@/lib/services/couponService";

const ClaimSchema = z.object({
  couponId: z.string().trim().optional(),
  code: z.string().trim().optional(),
  hotelId: z.string().trim().optional(),
});

export async function GET() {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, coupons: [] });
    }
    const coupons = await listUserWalletCoupons(sessionUser.id);
    return NextResponse.json({ authenticated: true, coupons });
  } catch (err) {
    console.error("[GET /api/wallet/coupons]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดกระเป๋าคูปองได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อเก็บคูปองเข้ากระเป๋า" },
        { status: 401 }
      );
    }

    const raw = await request.json();
    const parsed = ClaimSchema.safeParse(raw);
    if (!parsed.success || (!parsed.data.couponId && !parsed.data.code)) {
      return NextResponse.json(
        { error: "กรุณาระบุโค้ดคูปองที่ต้องการเก็บ" },
        { status: 422 }
      );
    }

    const result = await claimCouponToWallet({
      userId: sessionUser.id,
      couponId: parsed.data.couponId,
      code: parsed.data.code,
      hotelId: parsed.data.hotelId,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/wallet/coupons]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เก็บคูปองไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }
    const url = new URL(request.url);
    const couponId = url.searchParams.get("couponId");
    if (!couponId) {
      return NextResponse.json({ error: "Missing couponId" }, { status: 400 });
    }
    const res = await removeCouponFromWallet(sessionUser.id, couponId);
    return NextResponse.json(res);
  } catch (err) {
    console.error("[DELETE /api/wallet/coupons]", err);
    return NextResponse.json(
      { error: "ลบคูปองไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

