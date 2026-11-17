import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import type { AppRole, AuthenticatedMeDto } from "@/types/cangaroom";

const SUPER_ADMIN_EMAILS = new Set([
  "cangaroomapp@gmail.com",
  "super@cangaroom.com",
  "saas@cangaroom.com",
]);

export interface ServerAuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: AppRole;
}

export async function getServerSessionUser(): Promise<ServerAuthUser | null> {
  try {
    const sessionRes = await auth.getSession();
    const rawUser = sessionRes?.data?.user;
    if (!rawUser?.email) {
      return null;
    }

    const email = rawUser.email.trim().toLowerCase();
    const isBootstrapAdmin =
      SUPER_ADMIN_EMAILS.has(email) || email.endsWith("@cangaroom.com");

    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        ...(rawUser.image ? { avatarUrl: rawUser.image } : {}),
        ...(isBootstrapAdmin ? { role: "SUPER_ADMIN" } : {}),
      },
      create: {
        email,
        name: rawUser.name?.trim() || email.split("@")[0] || "ผู้ใช้งาน",
        avatarUrl: rawUser.image || null,
        role: isBootstrapAdmin ? "SUPER_ADMIN" : "TRAVELLER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || rawUser.name || email.split("@")[0] || "ผู้ใช้งาน",
      phone: dbUser.phone,
      avatarUrl: dbUser.avatarUrl,
      role: dbUser.role,
    };
  } catch (err) {
    console.error("[getServerSessionUser] failed:", err);
    return null;
  }
}

export async function getAuthenticatedMeProfile(): Promise<AuthenticatedMeDto | null> {
  const user = await getServerSessionUser();
  if (!user) return null;

  const [savedPinsCount, savedCouponsCount, pendingBookingsCount, ownedHotels] =
    await Promise.all([
      prisma.savedBoardPin.count({ where: { userId: user.id } }),
      prisma.userCouponWallet.count({
        where: { userId: user.id, usedAt: null },
      }),
      prisma.booking.count({
        where: {
          userId: user.id,
          status: { in: ["HOLD_PENDING_PAYMENT", "PENDING_VERIFICATION"] },
        },
      }),
      prisma.hotel.findMany({
        where:
          user.role === "SUPER_ADMIN"
            ? {}
            : { ownerId: user.id },
        orderBy: { createdAt: "asc" },
        take: 25,
        select: {
          id: true,
          slug: true,
          nameTh: true,
          nameEn: true,
          provinceId: true,
          verificationStatus: true,
          _count: {
            select: {
              bookings: {
                where: { status: "PENDING_VERIFICATION" },
              },
            },
          },
        },
      }),
    ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    savedPinsCount,
    savedCouponsCount,
    pendingBookingsCount,
    ownedHotels: ownedHotels.map((h) => ({
      id: h.id,
      slug: h.slug,
      nameTh: h.nameTh,
      nameEn: h.nameEn,
      provinceId: h.provinceId,
      verificationStatus: h.verificationStatus,
      pendingBookingsCount: h._count.bookings,
    })),
  };
}

