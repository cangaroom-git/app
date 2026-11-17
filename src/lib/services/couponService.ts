import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProvinceById } from "@/data/thailandProvinces";
import type { CouponDealDto } from "@/types/cangaroom";

function mapCouponToDto(
  c: {
    id: string;
    hotelId: string;
    code: string;
    titleTh: string;
    titleEn: string;
    descriptionTh: string;
    descriptionEn: string;
    coverImageUrl: string | null;
    discountType: "PERCENT" | "FIXED_THB";
    discountValue: number;
    minSpendThb: number;
    maxDiscountThb: number | null;
    totalQuota: number | null;
    claimedCount: number;
    usedCount: number;
    startsAt: Date;
    expiresAt: Date;
    isFeaturedDeal: boolean;
    isActive: boolean;
    hotel: {
      slug: string;
      nameTh: string;
      nameEn: string;
      logoUrl: string | null;
      verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
      provinceId: string;
      stayStyles: string[];
    };
  },
  claimedMap?: ReadonlyMap<string, Date | null>
): CouponDealDto {
  const province = getProvinceById(c.hotel.provinceId);
  const usedAtDate = claimedMap?.get(c.id);

  return {
    id: c.id,
    hotelId: c.hotelId,
    hotelSlug: c.hotel.slug,
    hotelNameTh: c.hotel.nameTh,
    hotelNameEn: c.hotel.nameEn || c.hotel.nameTh,
    hotelLogoUrl: c.hotel.logoUrl,
    hotelVerificationStatus: c.hotel.verificationStatus,
    provinceId: c.hotel.provinceId,
    provinceNameTh: province
      ? province.nameTh.split("(")[0].trim()
      : c.hotel.provinceId,
    provinceNameEn: province ? province.nameEn : c.hotel.provinceId,
    stayStyles: c.hotel.stayStyles,
    code: c.code,
    titleTh: c.titleTh,
    titleEn: c.titleEn || c.titleTh,
    descriptionTh: c.descriptionTh,
    descriptionEn: c.descriptionEn || c.descriptionTh,
    coverImageUrl: c.coverImageUrl,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minSpendThb: c.minSpendThb,
    maxDiscountThb: c.maxDiscountThb,
    totalQuota: c.totalQuota,
    claimedCount: c.claimedCount,
    usedCount: c.usedCount,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
    isFeaturedDeal: c.isFeaturedDeal,
    isActive: c.isActive,
    isClaimedByMe: claimedMap ? claimedMap.has(c.id) : false,
    usedAt: usedAtDate ? usedAtDate.toISOString() : null,
  };
}

export async function listMarketplaceDeals(params: {
  provinceId?: string | null;
  style?: string | null;
  hotelSlug?: string | null;
  q?: string | null;
  userId?: string | null;
  limit?: number;
}): Promise<CouponDealDto[]> {
  const { provinceId, style, hotelSlug, q, userId, limit = 50 } = params;
  const now = new Date();

  const hotelWhere: Prisma.HotelWhereInput = {
    isPublished: true,
    verificationStatus: { not: "SUSPENDED" },
  };
  if (provinceId) hotelWhere.provinceId = provinceId;
  if (style && style !== "all") hotelWhere.stayStyles = { has: style };
  if (hotelSlug) hotelWhere.slug = hotelSlug;

  const where: Prisma.CouponWhereInput = {
    isActive: true,
    expiresAt: { gt: now },
    hotel: hotelWhere,
  };

  const trimmed = q?.trim();
  if (trimmed) {
    where.OR = [
      { code: { contains: trimmed, mode: "insensitive" } },
      { titleTh: { contains: trimmed, mode: "insensitive" } },
      { descriptionTh: { contains: trimmed, mode: "insensitive" } },
      { hotel: { nameTh: { contains: trimmed, mode: "insensitive" } } },
    ];
  }

  const [coupons, walletEntries] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: [
        { isFeaturedDeal: "desc" },
        { discountValue: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      include: {
        hotel: {
          select: {
            slug: true,
            nameTh: true,
            nameEn: true,
            logoUrl: true,
            verificationStatus: true,
            provinceId: true,
            stayStyles: true,
          },
        },
      },
    }),
    userId
      ? prisma.userCouponWallet.findMany({
          where: { userId },
          select: { couponId: true, usedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const claimedMap = new Map<string, Date | null>(
    walletEntries.map((w) => [w.couponId, w.usedAt])
  );

  return coupons.map((c) => mapCouponToDto(c, claimedMap));
}

export async function listUserWalletCoupons(
  userId: string
): Promise<CouponDealDto[]> {
  const walletRows = await prisma.userCouponWallet.findMany({
    where: { userId },
    orderBy: { claimedAt: "desc" },
    include: {
      coupon: {
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              verificationStatus: true,
              provinceId: true,
              stayStyles: true,
            },
          },
        },
      },
    },
  });

  const claimedMap = new Map<string, Date | null>(
    walletRows.map((w) => [w.couponId, w.usedAt])
  );

  return walletRows.map((w) => mapCouponToDto(w.coupon, claimedMap));
}

export async function claimCouponToWallet(params: {
  userId: string;
  couponId?: string;
  code?: string;
  hotelId?: string;
}) {
  const { userId, couponId, code, hotelId } = params;

  return prisma.$transaction(async (tx) => {
    const coupon = couponId
      ? await tx.coupon.findUnique({ where: { id: couponId } })
      : code
      ? await tx.coupon.findFirst({
          where: {
            code: code.trim().toUpperCase(),
            ...(hotelId ? { hotelId } : {}),
            isActive: true,
          },
        })
      : null;

    if (!coupon || !coupon.isActive) {
      throw new Error("ไม่พบคูปองนี้หรือคูปองปิดใช้งานแล้ว");
    }

    if (coupon.expiresAt.getTime() < Date.now()) {
      throw new Error("คูปองนี้หมดอายุแล้ว");
    }

    if (coupon.totalQuota !== null && coupon.claimedCount >= coupon.totalQuota) {
      throw new Error("คูปองนี้ถูกเก็บครบสิทธิ์แล้ว");
    }

    const existing = await tx.userCouponWallet.findUnique({
      where: {
        userId_couponId: { userId, couponId: coupon.id },
      },
    });

    if (existing) {
      return {
        alreadyClaimed: true,
        couponCode: coupon.code,
        couponId: coupon.id,
      };
    }

    await tx.userCouponWallet.create({
      data: { userId, couponId: coupon.id },
    });

    await tx.coupon.update({
      where: { id: coupon.id },
      data: { claimedCount: { increment: 1 } },
    });

    return {
      alreadyClaimed: false,
      couponCode: coupon.code,
      couponId: coupon.id,
    };
  });
}

export async function removeCouponFromWallet(userId: string, couponId: string) {
  await prisma.userCouponWallet.deleteMany({
    where: { userId, couponId, usedAt: null },
  });
  return { removed: true };
}

