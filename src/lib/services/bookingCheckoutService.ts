import { prisma } from "@/lib/prisma";
import {
  calculateStayPricing,
  formatDateStr,
  listDatesInRange,
} from "@/lib/bookingMath";
import type { BookingSummaryDto } from "@/types/cangaroom";

function generateBookingCode(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `CGR-${y}${m}${d}-${rand}`;
}

export function mapBookingRowToDto(b: {
  id: string;
  bookingCode: string;
  hotelId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  guests: number;
  unitsBooked: number;
  roomSubtotalThb: number;
  addonsTotalThb: number;
  discountThb: number;
  netTotalThb: number;
  addonsJson: unknown;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  guestLine: string | null;
  guestNote: string | null;
  slipImageUrl: string | null;
  slipQrPayload: string | null;
  holdExpiresAt: Date | null;
  status:
    | "HOLD_PENDING_PAYMENT"
    | "PENDING_VERIFICATION"
    | "CONFIRMED"
    | "CANCELLED"
    | "COMPLETED";
  createdAt: Date;
  hotel: {
    slug: string;
    nameTh: string;
    nameEn: string;
    logoUrl: string | null;
    promptPayId: string;
    promptPayAccountName: string;
  };
  room: {
    code: string;
    nameTh: string;
    nameEn: string;
  };
  coupon: {
    code: string;
  } | null;
}): BookingSummaryDto {
  const addonsArr = Array.isArray(b.addonsJson)
    ? (b.addonsJson as Array<{
        id: string;
        nameTh: string;
        qty: number;
        unitPriceThb: number;
      }>)
    : [];

  return {
    id: b.id,
    bookingCode: b.bookingCode,
    hotelId: b.hotelId,
    hotelSlug: b.hotel.slug,
    hotelNameTh: b.hotel.nameTh,
    hotelNameEn: b.hotel.nameEn || b.hotel.nameTh,
    hotelLogoUrl: b.hotel.logoUrl,
    promptPayId: b.hotel.promptPayId,
    promptPayAccountName: b.hotel.promptPayAccountName || b.hotel.nameTh,
    roomId: b.roomId,
    roomCode: b.room.code,
    roomNameTh: b.room.nameTh,
    roomNameEn: b.room.nameEn || b.room.nameTh,
    checkInDate: formatDateStr(b.checkInDate),
    checkOutDate: formatDateStr(b.checkOutDate),
    nights: b.nights,
    guests: b.guests,
    unitsBooked: b.unitsBooked,
    roomSubtotalThb: b.roomSubtotalThb,
    addonsTotalThb: b.addonsTotalThb,
    discountThb: b.discountThb,
    netTotalThb: b.netTotalThb,
    addons: addonsArr,
    couponCode: b.coupon?.code ?? null,
    guestName: b.guestName,
    guestPhone: b.guestPhone,
    guestEmail: b.guestEmail,
    guestLine: b.guestLine,
    guestNote: b.guestNote,
    slipImageUrl: b.slipImageUrl,
    slipQrPayload: b.slipQrPayload,
    holdExpiresAt: b.holdExpiresAt ? b.holdExpiresAt.toISOString() : null,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

export async function createBookingHold(params: {
  hotelSlug: string;
  roomId: string;
  userId?: string | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  unitsBooked?: number;
  addonQuantities?: Record<string, number>;
  couponCode?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestLine?: string | null;
  guestNote?: string | null;
}): Promise<BookingSummaryDto> {
  const {
    hotelSlug,
    roomId,
    userId = null,
    checkInDate,
    checkOutDate,
    guests,
    unitsBooked = 1,
    addonQuantities = {},
    couponCode,
    guestName,
    guestPhone,
    guestEmail = null,
    guestLine = null,
    guestNote = null,
  } = params;

  const stayDates = listDatesInRange(checkInDate, checkOutDate);
  if (stayDates.length === 0) {
    throw new Error("วันเช็กเอาต์ต้องอยู่หลังวันเช็กอินอย่างน้อย 1 คืน");
  }

  const startDateObj = new Date(`${checkInDate.slice(0, 10)}T00:00:00.000Z`);
  const endDateObj = new Date(`${checkOutDate.slice(0, 10)}T00:00:00.000Z`);
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const hotel = await tx.hotel.findUnique({
      where: { slug: hotelSlug.trim().toLowerCase() },
      include: {
        addons: { where: { isActive: true } },
      },
    });
    if (!hotel || hotel.verificationStatus === "SUSPENDED") {
      throw new Error("ไม่พบที่พักนี้หรือที่พักปิดให้บริการชั่วคราว");
    }

    const room = await tx.room.findFirst({
      where: { id: roomId, hotelId: hotel.id, isActive: true },
    });
    if (!room) {
      throw new Error("ไม่พบประเภทห้องพักที่เลือก");
    }

    if (guests > room.maxGuests * unitsBooked) {
      throw new Error(
        `ห้อง ${room.code} รองรับผู้เข้าพักได้สูงสุด ${
          room.maxGuests * unitsBooked
        } ท่าน`
      );
    }

    // Check real conflicting bookings & date overrides inside transaction
    const [overlappingBookings, dateOverrides] = await Promise.all([
      tx.booking.findMany({
        where: {
          roomId: room.id,
          checkInDate: { lt: endDateObj },
          checkOutDate: { gt: startDateObj },
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
          checkInDate: true,
          checkOutDate: true,
          unitsBooked: true,
        },
      }),
      tx.roomDateOverride.findMany({
        where: {
          roomId: room.id,
          date: { gte: startDateObj, lt: endDateObj },
        },
      }),
    ]);

    for (const dateStr of stayDates) {
      let used = 0;
      for (const ob of overlappingBookings) {
        const bIn = formatDateStr(ob.checkInDate);
        const bOut = formatDateStr(ob.checkOutDate);
        if (dateStr >= bIn && dateStr < bOut) {
          used += ob.unitsBooked;
        }
      }
      const override = dateOverrides.find(
        (o) => formatDateStr(o.date) === dateStr
      );
      const blocked = override?.blockedUnits ?? 0;
      const freeUnits = room.totalUnits - used - blocked;

      if (freeUnits < unitsBooked) {
        throw new Error(
          `ขออภัย ห้อง ${room.code} เต็มในคืนวันที่ ${dateStr} แล้ว กรุณาเลือกวันอื่น`
        );
      }
    }

    // Resolve optional coupon for THIS hotel
    let couponEntity = null;
    if (couponCode?.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();
      couponEntity = await tx.coupon.findUnique({
        where: {
          hotelId_code: { hotelId: hotel.id, code: normalizedCode },
        },
      });
      if (!couponEntity || !couponEntity.isActive) {
        throw new Error(`ไม่พบโค้ดส่วนลด "${normalizedCode}" สำหรับที่พักนี้`);
      }
      if (couponEntity.expiresAt.getTime() < now.getTime()) {
        throw new Error(`โค้ดส่วนลด "${normalizedCode}" หมดอายุแล้ว`);
      }
    }

    const pricing = calculateStayPricing({
      room: {
        ...room,
        availableUnits: room.totalUnits,
        heldUnits: 0,
      },
      checkInDate,
      checkOutDate,
      guests,
      unitsBooked,
      overrides: dateOverrides.map((o) => ({
        id: o.id,
        roomId: o.roomId,
        dateStr: formatDateStr(o.date),
        blockedUnits: o.blockedUnits,
        overridePriceThb: o.overridePriceThb,
        note: o.note,
      })),
      addons: hotel.addons,
      addonQuantities,
      coupon: couponEntity
        ? {
            ...couponEntity,
            hotelSlug: hotel.slug,
            hotelNameTh: hotel.nameTh,
            hotelNameEn: hotel.nameEn,
            hotelLogoUrl: hotel.logoUrl,
            hotelVerificationStatus: hotel.verificationStatus,
            provinceId: hotel.provinceId,
            provinceNameTh: "",
            provinceNameEn: "",
            stayStyles: hotel.stayStyles,
            startsAt: couponEntity.startsAt.toISOString(),
            expiresAt: couponEntity.expiresAt.toISOString(),
            isClaimedByMe: true,
            usedAt: null,
          }
        : null,
    });

    if (pricing.couponError) {
      throw new Error(pricing.couponError);
    }

    const addonsSnapshot = hotel.addons
      .filter((a) => (addonQuantities[a.id] ?? 0) > 0)
      .map((a) => ({
        id: a.id,
        nameTh: a.nameTh,
        qty: addonQuantities[a.id],
        unitPriceThb: a.priceThb,
      }));

    const created = await tx.booking.create({
      data: {
        bookingCode: generateBookingCode(),
        hotelId: hotel.id,
        roomId: room.id,
        userId,
        couponId: couponEntity?.id ?? null,
        checkInDate: startDateObj,
        checkOutDate: endDateObj,
        nights: pricing.nights,
        guests,
        unitsBooked,
        roomSubtotalThb: pricing.roomSubtotalThb,
        addonsTotalThb: pricing.addonsTotalThb,
        discountThb: pricing.discountThb,
        netTotalThb: pricing.netTotalThb,
        addonsJson: addonsSnapshot,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail?.trim() || null,
        guestLine: guestLine?.trim() || null,
        guestNote: guestNote?.trim() || null,
        holdExpiresAt,
        status: "HOLD_PENDING_PAYMENT",
      },
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
    });

    return mapBookingRowToDto(created);
  });
}

export async function submitBookingSlip(params: {
  bookingId: string;
  slipImageUrl: string;
  slipQrPayload: string;
}) {
  const { bookingId, slipImageUrl, slipQrPayload } = params;

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new Error("ไม่พบรายการจองนี้");
    }
    if (booking.status === "CANCELLED") {
      throw new Error("รายการจองนี้ถูกยกเลิกแล้ว");
    }

    if (slipQrPayload) {
      const duplicate = await tx.booking.findFirst({
        where: {
          slipQrPayload,
          id: { not: bookingId },
        },
        select: { bookingCode: true },
      });
      if (duplicate) {
        throw new Error(
          `สลิปนี้ถูกใช้ไปแล้วในใบจอง #${duplicate.bookingCode} กรุณาแนบสลิปการโอนใหม่`
        );
      }
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        slipImageUrl,
        slipQrPayload: slipQrPayload || null,
        holdExpiresAt: null,
        status: "PENDING_VERIFICATION",
      },
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
    });

    // Mark wallet coupon as used if this booking applied a coupon
    if (updated.couponId && updated.userId) {
      await tx.userCouponWallet.updateMany({
        where: {
          userId: updated.userId,
          couponId: updated.couponId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
          usedBookingId: updated.id,
        },
      });
      await tx.coupon.update({
        where: { id: updated.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return mapBookingRowToDto(updated);
  });
}

export async function listTravellerBookings(params: {
  userId?: string | null;
  lookupCode?: string | null;
  lookupPhone?: string | null;
}): Promise<BookingSummaryDto[]> {
  const { userId, lookupCode, lookupPhone } = params;

  const trimmedCode = lookupCode?.trim().toUpperCase();
  const trimmedPhone = lookupPhone?.trim();

  if (!userId && (!trimmedCode || !trimmedPhone)) {
    return [];
  }

  const rows = await prisma.booking.findMany({
    where:
      trimmedCode && trimmedPhone
        ? {
            bookingCode: trimmedCode,
            guestPhone: { contains: trimmedPhone },
          }
        : { userId: userId! },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  });

  return rows.map(mapBookingRowToDto);
}

