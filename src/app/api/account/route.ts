import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedMeProfile,
  getServerSessionUser,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface TravellerAccountPreferences {
  emergencyContactName: string;
  emergencyContactPhone: string;
  homeProvinceId: string;
  preferredRegions: string[];
  notifications: {
    wishlistExpiring: boolean;
    provincePromos: boolean;
    bookingUpdates: boolean;
    unsubscribeAllMarketing: boolean;
  };
  privacy: {
    showProvinceOnReviews: boolean;
    defaultPublicTrips: boolean;
    allowAnalyticsPersonalization: boolean;
  };
}

export const DEFAULT_ACCOUNT_PREFERENCES: TravellerAccountPreferences = {
  emergencyContactName: "",
  emergencyContactPhone: "",
  homeProvinceId: "bangkok",
  preferredRegions: [],
  notifications: {
    wishlistExpiring: true,
    provincePromos: true,
    bookingUpdates: true,
    unsubscribeAllMarketing: false,
  },
  privacy: {
    showProvinceOnReviews: true,
    defaultPublicTrips: true,
    allowAnalyticsPersonalization: true,
  },
};

const PatchAccountSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  emergencyContactName: z.string().trim().max(80).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  homeProvinceId: z.string().trim().max(60).optional(),
  preferredRegions: z.array(z.string().trim().max(40)).max(10).optional(),
  preferredLang: z.enum(["th", "en"]).optional(),
  preferredTheme: z.enum(["light", "dark"]).optional(),
  notifications: z
    .object({
      wishlistExpiring: z.boolean().optional(),
      provincePromos: z.boolean().optional(),
      bookingUpdates: z.boolean().optional(),
      unsubscribeAllMarketing: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      showProvinceOnReviews: z.boolean().optional(),
      defaultPublicTrips: z.boolean().optional(),
      allowAnalyticsPersonalization: z.boolean().optional(),
    })
    .optional(),
});

function prefKey(userId: string): string {
  return `user_account_prefs:${userId}`;
}

function mergePrefs(raw: unknown): TravellerAccountPreferences {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const notif =
    obj.notifications &&
    typeof obj.notifications === "object" &&
    !Array.isArray(obj.notifications)
      ? (obj.notifications as Record<string, unknown>)
      : {};
  const priv =
    obj.privacy &&
    typeof obj.privacy === "object" &&
    !Array.isArray(obj.privacy)
      ? (obj.privacy as Record<string, unknown>)
      : {};

  return {
    emergencyContactName:
      typeof obj.emergencyContactName === "string"
        ? obj.emergencyContactName
        : "",
    emergencyContactPhone:
      typeof obj.emergencyContactPhone === "string"
        ? obj.emergencyContactPhone
        : "",
    homeProvinceId:
      typeof obj.homeProvinceId === "string" && obj.homeProvinceId.trim()
        ? obj.homeProvinceId
        : "bangkok",
    preferredRegions: Array.isArray(obj.preferredRegions)
      ? obj.preferredRegions.filter((x): x is string => typeof x === "string")
      : [],
    notifications: {
      wishlistExpiring:
        typeof notif.wishlistExpiring === "boolean"
          ? notif.wishlistExpiring
          : true,
      provincePromos:
        typeof notif.provincePromos === "boolean" ? notif.provincePromos : true,
      bookingUpdates:
        typeof notif.bookingUpdates === "boolean" ? notif.bookingUpdates : true,
      unsubscribeAllMarketing:
        typeof notif.unsubscribeAllMarketing === "boolean"
          ? notif.unsubscribeAllMarketing
          : false,
    },
    privacy: {
      showProvinceOnReviews:
        typeof priv.showProvinceOnReviews === "boolean"
          ? priv.showProvinceOnReviews
          : true,
      defaultPublicTrips:
        typeof priv.defaultPublicTrips === "boolean"
          ? priv.defaultPublicTrips
          : true,
      allowAnalyticsPersonalization:
        typeof priv.allowAnalyticsPersonalization === "boolean"
          ? priv.allowAnalyticsPersonalization
          : true,
    },
  };
}

export async function GET() {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const [me, prefRow, totalBookingsCount, boardsCount, tasteProfile] =
      await Promise.all([
        getAuthenticatedMeProfile(),
        prisma.systemConfig
          .findUnique({ where: { key: prefKey(sessionUser.id) } })
          .catch(() => null),
        prisma.booking.count({ where: { userId: sessionUser.id } }),
        prisma.savedBoard.count({ where: { userId: sessionUser.id } }),
        prisma.visitorTasteProfile
          .findUnique({
            where: { userId: sessionUser.id },
            select: {
              consentLevel: true,
              inferredProvinceId: true,
              preferredLang: true,
              preferredTheme: true,
            },
          })
          .catch(() => null),
      ]);

    const preferences = mergePrefs(prefRow?.value);
    if (
      !prefRow &&
      tasteProfile?.inferredProvinceId &&
      preferences.homeProvinceId === "bangkok"
    ) {
      preferences.homeProvinceId = tasteProfile.inferredProvinceId;
    }

    return NextResponse.json({
      user: me,
      preferences,
      summary: {
        totalBookingsCount,
        pendingBookingsCount: me?.pendingBookingsCount ?? 0,
        savedCouponsCount: me?.savedCouponsCount ?? 0,
        savedPinsCount: me?.savedPinsCount ?? 0,
        boardsCount,
        ownedHotelsCount: me?.ownedHotels?.length ?? 0,
      },
      authProvider: "Google / Email (Neon Auth)",
    });
  } catch (err) {
    console.error("[GET /api/account]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลบัญชีได้" },
      { status: 500 },
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
    const parsed = PatchAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 422 },
      );
    }

    const d = parsed.data;

    // 1. Update core User fields (name / phone)
    if (d.name !== undefined || d.phone !== undefined) {
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
        },
      });
    }

    // 2. Merge & persist extended preferences in SystemConfig
    const existingRow = await prisma.systemConfig
      .findUnique({ where: { key: prefKey(sessionUser.id) } })
      .catch(() => null);
    const current = mergePrefs(existingRow?.value);

    const nextNotifications = {
      ...current.notifications,
      ...(d.notifications ?? {}),
    };
    if (d.notifications?.unsubscribeAllMarketing === true) {
      nextNotifications.wishlistExpiring = false;
      nextNotifications.provincePromos = false;
    }

    const nextPrefs: TravellerAccountPreferences = {
      emergencyContactName:
        d.emergencyContactName !== undefined
          ? d.emergencyContactName
          : current.emergencyContactName,
      emergencyContactPhone:
        d.emergencyContactPhone !== undefined
          ? d.emergencyContactPhone
          : current.emergencyContactPhone,
      homeProvinceId:
        d.homeProvinceId !== undefined
          ? d.homeProvinceId
          : current.homeProvinceId,
      preferredRegions:
        d.preferredRegions !== undefined
          ? d.preferredRegions
          : current.preferredRegions,
      notifications: nextNotifications,
      privacy: {
        ...current.privacy,
        ...(d.privacy ?? {}),
      },
    };

    await prisma.systemConfig.upsert({
      where: { key: prefKey(sessionUser.id) },
      create: {
        key: prefKey(sessionUser.id),
        value: nextPrefs as unknown as object,
        updatedBy: sessionUser.id,
      },
      update: {
        value: nextPrefs as unknown as object,
        updatedBy: sessionUser.id,
      },
    });

    // 3. Sync lightweight taste profile preferences when present
    if (
      d.homeProvinceId !== undefined ||
      d.preferredLang !== undefined ||
      d.preferredTheme !== undefined ||
      d.privacy?.allowAnalyticsPersonalization !== undefined
    ) {
      await prisma.visitorTasteProfile
        .updateMany({
          where: { userId: sessionUser.id },
          data: {
            ...(d.homeProvinceId !== undefined
              ? { inferredProvinceId: d.homeProvinceId }
              : {}),
            ...(d.preferredLang !== undefined
              ? { preferredLang: d.preferredLang }
              : {}),
            ...(d.preferredTheme !== undefined
              ? { preferredTheme: d.preferredTheme }
              : {}),
            ...(d.privacy?.allowAnalyticsPersonalization !== undefined
              ? {
                  consentLevel: d.privacy.allowAnalyticsPersonalization
                    ? "ANALYTICS"
                    : "ESSENTIAL",
                  consentUpdatedAt: new Date(),
                }
              : {}),
          },
        })
        .catch(() => undefined);
    }

    const updatedMe = await getAuthenticatedMeProfile();
    return NextResponse.json({
      user: updatedMe,
      preferences: nextPrefs,
    });
  } catch (err) {
    console.error("[PATCH /api/account]", err);
    return NextResponse.json(
      { error: "บันทึกการตั้งค่าบัญชีไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getServerSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirmText?: string;
    };
    if ((body.confirmText || "").trim().toUpperCase() !== "DELETE") {
      return NextResponse.json(
        { error: "กรุณาพิมพ์คำว่า DELETE เพื่อยืนยันการลบบัญชี" },
        { status: 400 },
      );
    }

    // Prevent accidental deletion of active business owners or super admins without transfer
    const ownedCount = await prisma.hotel.count({
      where: { ownerId: sessionUser.id },
    });
    if (sessionUser.role === "SUPER_ADMIN" || ownedCount > 0) {
      return NextResponse.json(
        {
          error:
            "บัญชีนี้มีสถานที่/ธุรกิจที่ดูแลอยู่ กรุณาโอนสิทธิ์หรือติดต่อทีม Nondii ก่อนลบบัญชี",
        },
        { status: 409 },
      );
    }

    await prisma.systemConfig
      .deleteMany({ where: { key: prefKey(sessionUser.id) } })
      .catch(() => undefined);
    await prisma.user.delete({ where: { id: sessionUser.id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/account]", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชีได้ในขณะนี้" },
      { status: 500 },
    );
  }
}
