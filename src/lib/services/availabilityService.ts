import { prisma } from "@/lib/prisma";
import { formatDateStr, listDatesInRange } from "@/lib/bookingMath";

export interface RoomRangeAvailability {
  roomId: string;
  totalUnits: number;
  availableUnits: number;
  heldUnits: number;
  bookedUnits: number;
  blockedUnits: number;
}

export async function getRoomsAvailabilityForRange(params: {
  roomIds: string[];
  checkInDate: string;
  checkOutDate: string;
}): Promise<Map<string, RoomRangeAvailability>> {
  const result = new Map<string, RoomRangeAvailability>();
  if (params.roomIds.length === 0) return result;

  const stayDates = listDatesInRange(params.checkInDate, params.checkOutDate);
  const startDateObj = new Date(`${params.checkInDate.slice(0, 10)}T00:00:00.000Z`);
  const endDateObj = new Date(`${params.checkOutDate.slice(0, 10)}T00:00:00.000Z`);
  const now = new Date();

  const [rooms, bookings, overrides] = await Promise.all([
    prisma.room.findMany({
      where: { id: { in: params.roomIds } },
      select: { id: true, totalUnits: true },
    }),
    stayDates.length > 0
      ? prisma.booking.findMany({
          where: {
            roomId: { in: params.roomIds },
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
            roomId: true,
            checkInDate: true,
            checkOutDate: true,
            unitsBooked: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    stayDates.length > 0
      ? prisma.roomDateOverride.findMany({
          where: {
            roomId: { in: params.roomIds },
            date: { gte: startDateObj, lt: endDateObj },
          },
          select: {
            roomId: true,
            date: true,
            blockedUnits: true,
          },
        })
      : Promise.resolve([]),
  ]);

  for (const room of rooms) {
    if (stayDates.length === 0) {
      result.set(room.id, {
        roomId: room.id,
        totalUnits: room.totalUnits,
        availableUnits: room.totalUnits,
        heldUnits: 0,
        bookedUnits: 0,
        blockedUnits: 0,
      });
      continue;
    }

    let minAvailableAcrossNights = room.totalUnits;
    let maxHeldAcrossNights = 0;
    let maxBookedAcrossNights = 0;
    let maxBlockedAcrossNights = 0;

    for (const dateStr of stayDates) {
      let nightBooked = 0;
      let nightHeld = 0;

      for (const b of bookings) {
        if (b.roomId !== room.id) continue;
        const bIn = formatDateStr(b.checkInDate);
        const bOut = formatDateStr(b.checkOutDate);
        if (dateStr >= bIn && dateStr < bOut) {
          if (b.status === "HOLD_PENDING_PAYMENT") {
            nightHeld += b.unitsBooked;
          } else {
            nightBooked += b.unitsBooked;
          }
        }
      }

      const overrideForNight = overrides.find(
        (o) => o.roomId === room.id && formatDateStr(o.date) === dateStr
      );
      const nightBlocked = overrideForNight?.blockedUnits ?? 0;

      const freeOnNight = Math.max(
        0,
        room.totalUnits - nightBooked - nightHeld - nightBlocked
      );

      if (freeOnNight < minAvailableAcrossNights) {
        minAvailableAcrossNights = freeOnNight;
      }
      if (nightHeld > maxHeldAcrossNights) maxHeldAcrossNights = nightHeld;
      if (nightBooked > maxBookedAcrossNights) maxBookedAcrossNights = nightBooked;
      if (nightBlocked > maxBlockedAcrossNights) {
        maxBlockedAcrossNights = nightBlocked;
      }
    }

    result.set(room.id, {
      roomId: room.id,
      totalUnits: room.totalUnits,
      availableUnits: minAvailableAcrossNights,
      heldUnits: maxHeldAcrossNights,
      bookedUnits: maxBookedAcrossNights,
      blockedUnits: maxBlockedAcrossNights,
    });
  }

  return result;
}

