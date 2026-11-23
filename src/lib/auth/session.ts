import { cache } from "react";
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

const USER_SESSION_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
} as const;

/**
 * Per-request memoized session lookup via React.cache().
 * Uses a fast read-only `findUnique` on the hot path and writes to Postgres
 * ONLY when creating a new user or syncing changed avatar/bootstrap-admin role.
 */
export const getServerSessionUser = cache(
  async (): Promise<ServerAuthUser | null> => {
    try {
      const sessionRes = await auth.getSession();
      const rawUser = sessionRes?.data?.user;
      if (!rawUser?.email) {
        return null;
      }

      const email = rawUser.email.trim().toLowerCase();
      const isBootstrapAdmin =
        SUPER_ADMIN_EMAILS.has(email) ||
        email.endsWith("@cangaroom.com") ||
        email.endsWith("@nondii.com");

      let dbUser = await prisma.user.findUnique({
        where: { email },
        select: USER_SESSION_SELECT,
      });

      if (!dbUser) {
        dbUser = await prisma.user.upsert({
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
          select: USER_SESSION_SELECT,
        });
      } else {
        const needsAvatarSync =
          Boolean(rawUser.image) && dbUser.avatarUrl !== rawUser.image;
        const needsRoleUpgrade =
          isBootstrapAdmin && dbUser.role !== "SUPER_ADMIN";

        if (needsAvatarSync || needsRoleUpgrade) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              ...(needsAvatarSync ? { avatarUrl: rawUser.image } : {}),
              ...(needsRoleUpgrade ? { role: "SUPER_ADMIN" } : {}),
            },
            select: USER_SESSION_SELECT,
          });
        }
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        name:
          dbUser.name || rawUser.name || email.split("@")[0] || "ผู้ใช้งาน",
        phone: dbUser.phone,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.role,
      };
    } catch (err) {
      console.error("[getServerSessionUser] failed:", err);
      return null;
    }
  }
);

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
        where: user.role === "SUPER_ADMIN" ? {} : { ownerId: user.id },
        orderBy: { createdAt: "asc" },
        take: 25,
        select: {
          id: true,
          slug: true,
          nameTh: true,
          nameEn: true,
          provinceId: true,
          placeCategory: true,
          merchantMode: true,
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
      placeCategory: h.placeCategory,
      merchantMode: h.merchantMode,
      verificationStatus: h.verificationStatus,
      pendingBookingsCount: h._count.bookings,
    })),
  };
}
