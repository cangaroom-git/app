import {
  addDaysToDate,
  calculateNightlyRateForDate,
} from "@/lib/bookingMath";
import { MONTH_NAMES_EN, MONTH_NAMES_TH, type LanguageCode } from "@/lib/dateFormatters";
import type {
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export const SUNDAY_FIRST_WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const SUNDAY_FIRST_WEEKDAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

export interface CalendarMonthCell {
  dateStr: string;
  dayNumber: number;
}

export function buildSundayFirstMonthCells(
  year: number,
  monthIndex: number
): Array<CalendarMonthCell | null> {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay(); // 0 = Sun ... 6 = Sat
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: Array<CalendarMonthCell | null> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({
      dateStr: `${year}-${mm}-${dd}`,
      dayNumber: d,
    });
  }
  return cells;
}

export function formatCalendarMonthTitle(
  year: number,
  monthIndex: number,
  language: LanguageCode
): string {
  return language === "th"
    ? `${MONTH_NAMES_TH[monthIndex]} ${year + 543}`
    : `${MONTH_NAMES_EN[monthIndex]} ${year}`;
}

export function buildOverrideLookup(
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>
): Map<string, RoomDateOverrideDto> {
  const map = new Map<string, RoomDateOverrideDto>();
  for (const ov of dateOverrides) {
    map.set(`${ov.roomId}:${ov.dateStr}`, ov);
  }
  return map;
}

export function getRoomFreeUnitsOnDate(params: {
  room: RoomAvailabilityDto;
  dateStr: string;
  overrideMap: Map<string, RoomDateOverrideDto>;
  bookedUnitsByRoomDate: Record<string, number>;
}): number {
  const { room, dateStr, overrideMap, bookedUnitsByRoomDate } = params;
  const ov = overrideMap.get(`${room.id}:${dateStr}`);
  const blocked = ov?.blockedUnits ?? 0;
  const booked = bookedUnitsByRoomDate[`${room.id}:${dateStr}`] ?? 0;
  return Math.max(0, room.totalUnits - blocked - booked);
}

export function isPropertyNightSoldOut(params: {
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  guests: number;
  dateStr: string;
  overrideMap: Map<string, RoomDateOverrideDto>;
  bookedUnitsByRoomDate: Record<string, number>;
  specificRoomId?: string | null;
}): boolean {
  const {
    rooms,
    guests,
    dateStr,
    overrideMap,
    bookedUnitsByRoomDate,
    specificRoomId,
  } = params;
  if (rooms.length === 0) return false;

  if (specificRoomId) {
    const target = rooms.find((r) => r.id === specificRoomId);
    if (!target) return false;
    return (
      getRoomFreeUnitsOnDate({
        room: target,
        dateStr,
        overrideMap,
        bookedUnitsByRoomDate,
      }) <= 0
    );
  }

  const eligibleRooms = rooms.filter((r) => r.maxGuests >= guests);
  const pool = eligibleRooms.length > 0 ? eligibleRooms : rooms;
  return !pool.some(
    (room) =>
      getRoomFreeUnitsOnDate({
        room,
        dateStr,
        overrideMap,
        bookedUnitsByRoomDate,
      }) > 0
  );
}

export function getLowestAvailableNightlyPrice(params: {
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  guests: number;
  dateStr: string;
  overrideMap: Map<string, RoomDateOverrideDto>;
  dateOverrides: ReadonlyArray<RoomDateOverrideDto>;
  bookedUnitsByRoomDate: Record<string, number>;
}): number | null {
  const {
    rooms,
    guests,
    dateStr,
    overrideMap,
    dateOverrides,
    bookedUnitsByRoomDate,
  } = params;
  if (rooms.length === 0) return null;

  const eligibleRooms = rooms.filter((r) => r.maxGuests >= guests);
  const pool = eligibleRooms.length > 0 ? eligibleRooms : rooms;

  let minPrice: number | null = null;
  for (const room of pool) {
    const freeUnits = getRoomFreeUnitsOnDate({
      room,
      dateStr,
      overrideMap,
      bookedUnitsByRoomDate,
    });
    if (freeUnits <= 0) continue;

    const nightly = calculateNightlyRateForDate(room, dateStr, dateOverrides);
    const extraGuests = Math.max(0, guests - room.standardGuests);
    const totalForNight = nightly + extraGuests * room.extraGuestPriceThb;
    if (minPrice === null || totalForNight < minPrice) {
      minPrice = totalForNight;
    }
  }

  return minPrice;
}

export function findFirstSoldOutAfterCheckIn(params: {
  checkInDate: string;
  rooms: ReadonlyArray<RoomAvailabilityDto>;
  guests: number;
  overrideMap: Map<string, RoomDateOverrideDto>;
  bookedUnitsByRoomDate: Record<string, number>;
  specificRoomId?: string | null;
  maxScanDays?: number;
}): string | null {
  const {
    checkInDate,
    rooms,
    guests,
    overrideMap,
    bookedUnitsByRoomDate,
    specificRoomId,
    maxScanDays = 92,
  } = params;
  if (!checkInDate) return null;

  let cursor = checkInDate;
  for (let i = 0; i < maxScanDays; i++) {
    if (
      isPropertyNightSoldOut({
        rooms,
        guests,
        dateStr: cursor,
        overrideMap,
        bookedUnitsByRoomDate,
        specificRoomId,
      })
    ) {
      return cursor;
    }
    cursor = addDaysToDate(cursor, 1);
  }
  return null;
}
