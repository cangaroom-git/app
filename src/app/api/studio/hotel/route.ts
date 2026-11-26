import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { addDaysToDate, formatDateStr, listDatesInRange } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { ensureThailandPlacesAroundCoord } from "@/lib/geo/thailandPlacesDb";
import { mapBookingRowToDto } from "@/lib/services/bookingCheckoutService";
import { mapHotelPostToDetailDto } from "@/lib/services/hotelPostService";
import {
  sanitizeOutboundHttpsUrl,
} from "@/lib/placeCategories";
import { mapPinToDto, PIN_COUPON_SELECT } from "@/lib/services/pinMapper";

const UpdateHotelSchema = z.object({
  hotelSlug: z.string().optional(),
  nameTh: z.string().trim().min(2).max(120).optional(),
  nameEn: z.string().trim().max(120).optional(),
  taglineTh: z.string().trim().max(240).optional(),
  taglineEn: z.string().trim().max(240).optional(),
  descriptionTh: z.string().trim().max(3000).optional(),
  descriptionEn: z.string().trim().max(3000).optional(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  provinceId: z.string().trim().min(2).optional(),
  districtTh: z.string().trim().max(120).optional(),
  addressTh: z.string().trim().max(300).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  googleMapsUrl: z.string().trim().max(400).optional().nullable(),
  stayStyles: z.array(z.string()).optional(),
  propertyType: z
    .enum(["BOUTIQUE_HOTEL", "RESORT", "POOL_VILLA", "GLAMPING_HOMESTAY"])
    .optional(),
  placeCategory: z
    .enum(["STAY", "CAFE", "RESTAURANT", "ATTRACTION", "WELLNESS"])
    .optional(),
  merchantMode: z.enum(["DIRECT_BOOKING", "PROFILE_ONLY"]).optional(),
  locationScope: z
    .enum(["SINGLE_LOCATION", "MULTI_BRANCH", "NATIONWIDE_ONLINE"])
    .optional(),
  branchSummaryTh: z.string().trim().max(140).optional(),
  externalWebsiteUrl: z.string().trim().max(400).optional(),
  primaryCtaLabelTh: z.string().trim().max(60).optional(),
  featuredCouponId: z.string().trim().max(80).optional().nullable(),
  openingHoursJson: z
    .array(
      z.object({
        day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
        open: z.string().trim().max(10),
        close: z.string().trim().max(10),
        closed: z.boolean(),
      })
    )
    .max(7)
    .optional(),
  checkInTime: z.string().trim().max(10).optional(),
  checkOutTime: z.string().trim().max(10).optional(),
  petsAllowed: z.boolean().optional(),
  petPolicyTh: z.string().trim().max(300).optional(),
  highlightsJson: z
    .array(
      z.object({
        titleTh: z.string().trim().min(1).max(120),
        descTh: z.string().trim().max(300),
      })
    )
    .max(6)
    .optional(),
  nearbySpotsJson: z
    .array(
      z.object({
        nameTh: z.string().trim().min(1).max(120),
        distTh: z.string().trim().max(80),
      })
    )
    .max(12)
    .optional(),
  faqJson: z
    .array(
      z.object({
        qTh: z.string().trim().min(1).max(200),
        aTh: z.string().trim().min(1).max(800),
      })
    )
    .max(20)
    .optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactLine: z.string().trim().max(80).optional(),
  facebookPageUrl: z.string().trim().max(300).optional(),
  instagramUrl: z.string().trim().max(300).optional(),
  promptPayId: z.string().trim().max(30).optional(),
  promptPayAccountName: z.string().trim().max(120).optional(),
  bankName: z.string().trim().max(80).optional(),
  bankAccountNo: z.string().trim().max(40).optional(),
  isPublished: z.boolean().optional(),
  merchantSettings: z
    .object({
      taxInvoiceEnabled: z.boolean().optional(),
      taxLegalName: z.string().trim().max(160).optional(),
      taxId: z.string().trim().max(30).optional(),
      taxBranchCode: z.string().trim().max(30).optional(),
      taxAddress: z.string().trim().max(400).optional(),
      allowSearchIndexing: z.boolean().optional(),
      seoMetaTitle: z.string().trim().max(140).optional(),
      seoMetaDescription: z.string().trim().max(320).optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedSlug = url.searchParams.get("hotel");
    const { hotel } = await requireHotelStudioAccess(requestedSlug);

    const todayStr = formatDateStr(new Date());
    const now = new Date();
    const rangeStart = new Date(`${todayStr}T00:00:00.000Z`);
    const rangeEndStr = addDaysToDate(todayStr, 365);
    const rangeEnd = new Date(`${rangeEndStr}T00:00:00.000Z`);

    const [
      fullHotel,
      rooms,
      dateOverrides,
      addons,
      coupons,
      discountRules,
      pins,
      bookings,
      activeBookingsInRange,
      reviews,
      socialConnections,
      campaigns,
      contactClicksCount,
      boardSavesAgg,
      posts,
      branches,
      merchantSettingsRow,
    ] = await Promise.all([
      prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } }),
      prisma.room.findMany({
        where: { hotelId: hotel.id },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.roomDateOverride.findMany({
        where: {
          room: { hotelId: hotel.id },
          date: { gte: rangeStart, lte: rangeEnd },
        },
        orderBy: { date: "asc" },
      }),
      prisma.hotelAddon.findMany({
        where: { hotelId: hotel.id },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.coupon
        .findMany({
          where: { hotelId: hotel.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        })
        .catch(async () => {
          const [rows, orderRows] = await Promise.all([
            prisma.coupon.findMany({
              where: { hotelId: hotel.id },
              orderBy: { createdAt: "desc" },
            }),
            prisma.$queryRaw<Array<{ id: string; sortOrder: number }>>`
              SELECT "id", "sortOrder" FROM "Coupon" WHERE "hotelId" = ${hotel.id}
            `.catch(() => []),
          ]);
          const orderMap = new Map(orderRows.map((r) => [r.id, r.sortOrder]));
          return [...rows].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
          );
        }),
      prisma.hotelDiscountRule
        .findMany({
          where: { hotelId: hotel.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        })
        .catch(async () => {
          const [rows, orderRows] = await Promise.all([
            prisma.hotelDiscountRule.findMany({
              where: { hotelId: hotel.id },
              orderBy: { createdAt: "desc" },
            }),
            prisma.$queryRaw<Array<{ id: string; sortOrder: number }>>`
              SELECT "id", "sortOrder" FROM "HotelDiscountRule" WHERE "hotelId" = ${hotel.id}
            `.catch(() => []),
          ]);
          const orderMap = new Map(orderRows.map((r) => [r.id, r.sortOrder]));
          return [...rows].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
          );
        }),
      prisma.pin.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              verificationStatus: true,
              ratingAvg: true,
              placeCategory: true,
              merchantMode: true,
              externalWebsiteUrl: true,
              primaryCtaLabelTh: true,
              featuredCouponId: true,
              rooms: { select: { weekdayPriceThb: true } },
              coupons: {
                where: { isActive: true, expiresAt: { gt: new Date() } },
                orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
                take: 6,
                select: PIN_COUPON_SELECT,
              },
            },
          },
          room: {
            select: {
              code: true,
              nameTh: true,
              nameEn: true,
              weekdayPriceThb: true,
            },
          },
          coupon: { select: PIN_COUPON_SELECT },
        },
      }),
      prisma.booking.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        take: 150,
        include: {
          hotel: {
            select: {
              slug: true,
              nameTh: true,
              nameEn: true,
              logoUrl: true,
              promptPayId: true,
              promptPayAccountName: true,
            },
          },
          room: { select: { code: true, nameTh: true, nameEn: true } },
          coupon: { select: { code: true } },
        },
      }),
      prisma.booking.findMany({
        where: {
          hotelId: hotel.id,
          checkInDate: { lt: rangeEnd },
          checkOutDate: { gt: rangeStart },
          OR: [
            {
              status: {
                in: ["CONFIRMED", "PENDING_VERIFICATION", "COMPLETED"],
              },
            },
            {
              status: "HOLD_PENDING_PAYMENT",
              holdExpiresAt: { gt: now },
            },
          ],
        },
        select: {
          roomId: true,
          checkInDate: true,
          checkOutDate: true,
          unitsBooked: true,
        },
      }),
      prisma.guestReview.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.socialConnection.findMany({
        where: { hotelId: hotel.id },
      }),
      prisma.sponsoredCampaign.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactClickLog.groupBy({
        by: ["channel"],
        where: { hotelId: hotel.id },
        _count: { _all: true },
      }),
      prisma.savedBoardPin.count({
        where: { pin: { hotelId: hotel.id } },
      }),
      prisma.hotelPost.findMany({
        where: { hotelId: hotel.id },
        orderBy: { publishedAt: "desc" },
        include: {
          room: {
            select: { code: true, nameTh: true, weekdayPriceThb: true },
          },
        },
      }),
      prisma.placeBranch.findMany({
        where: { hotelId: hotel.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.systemConfig
        .findUnique({ where: { key: `hotel_studio_settings:${hotel.id}` } })
        .catch(() => null),
    ]);

    const bookedUnitsByRoomDate: Record<string, number> = {};
    for (const bk of activeBookingsInRange) {
      const inStr = formatDateStr(bk.checkInDate);
      const outStr = formatDateStr(bk.checkOutDate);
      for (const dateStr of listDatesInRange(inStr, outStr)) {
        if (dateStr < todayStr || dateStr > rangeEndStr) continue;
        const key = `${bk.roomId}:${dateStr}`;
        bookedUnitsByRoomDate[key] =
          (bookedUnitsByRoomDate[key] ?? 0) + Math.max(1, bk.unitsBooked);
      }
    }

    const confirmedRevenueThb = bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED")
      .reduce((acc, b) => acc + b.netTotalThb, 0);

    const clickStats = {
      LINE: 0,
      FACEBOOK_MESSENGER: 0,
      PHONE: 0,
    };
    for (const grp of contactClicksCount) {
      clickStats[grp.channel] = grp._count._all;
    }

    let hotelResponse: Record<string, unknown> = fullHotel as unknown as Record<
      string,
      unknown
    >;
    if (!("seasonalRulesJson" in fullHotel)) {
      const rows = await prisma.$queryRaw<
        Array<{ seasonalRulesJson: unknown }>
      >`
        SELECT "seasonalRulesJson" FROM "Hotel" WHERE "id" = ${hotel.id} LIMIT 1
      `;
      hotelResponse = {
        ...hotelResponse,
        seasonalRulesJson: rows[0]?.seasonalRulesJson ?? null,
      };
    }

    const totalPinViews = pins.reduce((acc, p) => acc + (p.viewsCount ?? 0), 0);
    const totalExternalClicks = pins.reduce(
      (acc, p) => acc + (p.externalClickCount ?? 0),
      0,
    );
    const activePromosCount =
      pins.filter(
        (p) =>
          p.publishStatus === "PUBLISHED" &&
          Boolean(p.promoHeadlineTh) &&
          (!p.promoExpiresAt || p.promoExpiresAt > now),
      ).length +
      coupons.filter((c) => c.isActive && c.expiresAt > now).length;

    const rawExtras =
      merchantSettingsRow?.value &&
      typeof merchantSettingsRow.value === "object" &&
      !Array.isArray(merchantSettingsRow.value)
        ? (merchantSettingsRow.value as Record<string, unknown>)
        : {};
    const merchantSettings = {
      taxInvoiceEnabled: Boolean(rawExtras.taxInvoiceEnabled),
      taxLegalName:
        typeof rawExtras.taxLegalName === "string"
          ? rawExtras.taxLegalName
          : "",
      taxId: typeof rawExtras.taxId === "string" ? rawExtras.taxId : "",
      taxBranchCode:
        typeof rawExtras.taxBranchCode === "string"
          ? rawExtras.taxBranchCode
          : "00000",
      taxAddress:
        typeof rawExtras.taxAddress === "string" ? rawExtras.taxAddress : "",
      allowSearchIndexing:
        typeof rawExtras.allowSearchIndexing === "boolean"
          ? rawExtras.allowSearchIndexing
          : true,
      seoMetaTitle:
        typeof rawExtras.seoMetaTitle === "string"
          ? rawExtras.seoMetaTitle
          : "",
      seoMetaDescription:
        typeof rawExtras.seoMetaDescription === "string"
          ? rawExtras.seoMetaDescription
          : "",
    };

    return NextResponse.json({
      hotel: hotelResponse,
      stats: {
        boardSavesCount: boardSavesAgg,
        contactClicksTotal:
          clickStats.LINE + clickStats.FACEBOOK_MESSENGER + clickStats.PHONE,
        contactClicksByChannel: clickStats,
        confirmedRevenueThb,
        estimatedOtaGpSavedThb: Math.round(confirmedRevenueThb * 0.18),
        pendingBookingsCount: bookings.filter(
          (b) => b.status === "PENDING_VERIFICATION"
        ).length,
        pendingSyncPinsCount: pins.filter(
          (p) => p.publishStatus === "PENDING_APPROVAL"
        ).length,
        totalPinViews,
        totalExternalClicks,
        activePromosCount,
      },
      branches,
      merchantSettings,
      rooms,
      dateOverrides: dateOverrides.map((o) => ({
        id: o.id,
        roomId: o.roomId,
        dateStr: formatDateStr(o.date),
        blockedUnits: o.blockedUnits,
        overridePriceThb: o.overridePriceThb,
        minNights: o.minNights,
        note: o.note,
      })),
      bookedUnitsByRoomDate,
      addons,
      coupons,
      discountRules,
      pins: pins.map((p) => ({ ...mapPinToDto(p), viewsCount: p.viewsCount })),
      bookings: bookings.map(mapBookingRowToDto),
      reviews: reviews.map((rv) => ({
        id: rv.id,
        hotelId: rv.hotelId,
        roomCode: rv.roomCode,
        authorName: rv.authorName,
        authorAvatar: rv.authorAvatar,
        rating: rv.rating,
        commentTh: rv.commentTh,
        commentEn: rv.commentEn || rv.commentTh,
        photoUrls: rv.photoUrls,
        isVerifiedStay: rv.isVerifiedStay,
        ownerReplyTh: rv.ownerReplyTh,
        ownerRepliedAt: rv.ownerRepliedAt
          ? rv.ownerRepliedAt.toISOString()
          : null,
        createdAt: rv.createdAt.toISOString(),
      })),
      socialConnections,
      campaigns,
      posts: posts.map((post) => mapHotelPostToDetailDto(post, fullHotel)),
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[GET /api/studio/hotel]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลหลังบ้านได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = UpdateHotelSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const {
      hotelSlug: _ignored,
      merchantSettings: incomingExtras,
      ...rawUpdateData
    } = parsed.data;
    void _ignored;

    const updateData = { ...rawUpdateData };
    if (updateData.externalWebsiteUrl !== undefined) {
      const trimmed = updateData.externalWebsiteUrl.trim();
      if (trimmed.length > 0) {
        const safe = sanitizeOutboundHttpsUrl(trimmed);
        if (!safe) {
          return NextResponse.json(
            { error: "ลิงก์เว็บไซต์ต้องขึ้นต้นด้วย https:// และถูกต้อง" },
            { status: 422 }
          );
        }
        updateData.externalWebsiteUrl = safe;
      } else {
        updateData.externalWebsiteUrl = "";
      }
    }

    const updated =
      Object.keys(updateData).length > 0
        ? await prisma.hotel.update({
            where: { id: hotel.id },
            data: updateData,
          })
        : await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } });

    if (incomingExtras) {
      const key = `hotel_studio_settings:${hotel.id}`;
      const prevRow = await prisma.systemConfig
        .findUnique({ where: { key } })
        .catch(() => null);
      const prevObj =
        prevRow?.value &&
        typeof prevRow.value === "object" &&
        !Array.isArray(prevRow.value)
          ? (prevRow.value as Record<string, unknown>)
          : {};
      const mergedExtras = { ...prevObj, ...incomingExtras };
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: mergedExtras },
        update: { value: mergedExtras },
      });
    }

    // Keep canonical Place Card synchronized when core identity fields change
    if (
      updated.canonicalPinId &&
      (updateData.nameTh !== undefined ||
        updateData.coverImageUrl !== undefined ||
        updateData.provinceId !== undefined ||
        updateData.taglineTh !== undefined)
    ) {
      await prisma.pin
        .update({
          where: { id: updated.canonicalPinId },
          data: {
            ...(updateData.nameTh !== undefined ? { titleTh: updated.nameTh } : {}),
            ...(updateData.taglineTh !== undefined
              ? { descriptionTh: updated.taglineTh }
              : {}),
            ...(typeof updated.coverImageUrl === "string" &&
            updated.coverImageUrl
              ? { coverImageUrl: updated.coverImageUrl }
              : {}),
            ...(updateData.provinceId !== undefined
              ? { provinceId: updated.provinceId }
              : {}),
          },
        })
        .catch(() => undefined);
    }

    if (
      typeof updated.latitude === "number" &&
      typeof updated.longitude === "number"
    ) {
      void ensureThailandPlacesAroundCoord(
        updated.latitude,
        updated.longitude,
        updated.provinceId
      );
    }

    revalidatePlaceCatalog({ slug: updated.slug, previousSlug: hotel.slug });
    return NextResponse.json({ hotel: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[PATCH /api/studio/hotel]", err);
    return NextResponse.json(
      { error: "อัปเดตข้อมูลที่พักไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
