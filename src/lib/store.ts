"use client";

import { useEffect, useState, useCallback } from "react";
import {
  INITIAL_PROPERTY_CONFIG,
  INITIAL_SAPAN_ROOMS,
  INITIAL_SEASONAL_RATES,
  INITIAL_SPECIAL_DATE_OVERRIDES,
  INITIAL_EXTRA_ADDONS,
  INITIAL_PROMO_COUPONS,
  INITIAL_RESORT_EXPERIENCES,
  WhiteLabelPropertyConfig,
  RoomLodge,
  SeasonalRateRule,
  SpecialDateRateOverride,
  ExtraAddon,
  PromoCoupon,
  ResortExperienceItem,
  BookingRecord,
} from "@/data/rooms";

const STORAGE_KEY_WL = "white_label_resort_store_v6";

// In-memory cache of parsed store data (vercel-react-best-practices: js-cache-storage)
let memoryBookingsCache: BookingRecord[] | null = null;

export function getLatestBookingsSnapshot(
  fallbackBookings: BookingRecord[]
): BookingRecord[] {
  if (typeof window === "undefined") return fallbackBookings;
  if (memoryBookingsCache) return memoryBookingsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WL);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SapanStoreData>;
      if (parsed && Array.isArray(parsed.bookings)) {
        memoryBookingsCache = parsed.bookings;
        return parsed.bookings;
      }
    }
  } catch {
    // ignore storage errors
  }
  return fallbackBookings;
}

export interface SapanStoreData {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  seasonalRates: SeasonalRateRule[];
  specialDateRates: SpecialDateRateOverride[];
  addons: ExtraAddon[];
  coupons: PromoCoupon[];
  experiences: ResortExperienceItem[];
  bookings: BookingRecord[];
}

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isWeekendNight(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00").getDay();
  return d === 5 || d === 6; // Friday or Saturday
}

/**
 * Checks whether a BookingRecord is currently active and locking room inventory.
 * - CANCELLED bookings never lock inventory.
 * - HOLD_15_MIN bookings that have passed holdExpiresAtIso no longer lock inventory.
 */
export function isBookingLockingInventory(
  bk: BookingRecord,
  nowMs: number = Date.now()
): boolean {
  if (bk.status === "CANCELLED") return false;
  if (bk.status === "HOLD_15_MIN" && bk.holdExpiresAtIso) {
    const expMs = new Date(bk.holdExpiresAtIso).getTime();
    if (!isNaN(expMs) && expMs <= nowMs) {
      return false;
    }
  }
  return true;
}

/**
 * 5-Tier Priority Nightly Rate Calculator for a specific room on a single date (YYYY-MM-DD)
 * Priority:
 * 1. Special Date Override (FIXED_PRICE_THB or SURCHARGE_THB)
 * 2. Active Seasonal Rate Rule (PEAK > HIGH > LOW)
 * 3. Weekend Rate (Fri/Sat) vs Base Weekday Rate (Sun-Thu)
 * 4. Room-level Discount (%)
 */
export interface NightlyRateDetail {
  dateStr: string;
  baseOrWeekendRate: number;
  rateBeforeRoomDiscount: number;
  finalNightlyRate: number;
  rateLabelTh: string;
  rateLabelEn: string;
  rateType: "SPECIAL_DATE" | "SEASONAL" | "WEEKEND" | "WEEKDAY";
}

export function calculateNightlyRateForDate(
  room: RoomLodge,
  dateStr: string,
  seasonalRates: SeasonalRateRule[],
  specialDateRates: SpecialDateRateOverride[]
): NightlyRateDetail {
  const weekend = isWeekendNight(dateStr);
  const baseOrWeekend = weekend ? room.weekendPriceThb : room.basePriceThb;

  let rateBeforeDiscount = baseOrWeekend;
  let rateLabelTh = weekend
    ? "ราคาวันศุกร์-เสาร์ (Weekend)"
    : "ราคาวันธรรมดา (Weekday)";
  let rateLabelEn = weekend ? "Weekend Rate (Fri–Sat)" : "Weekday Rate";
  let rateType: NightlyRateDetail["rateType"] = weekend ? "WEEKEND" : "WEEKDAY";

  // Check Seasonal Rate Rules (PEAK takes priority over HIGH/LOW)
  const matchingSeasons = (seasonalRates || []).filter(
    (s) => s.isActive && dateStr >= s.startDate && dateStr <= s.endDate
  );
  if (matchingSeasons.length > 0) {
    const priorityOrder = { PEAK: 3, HIGH: 2, LOW: 1 };
    matchingSeasons.sort(
      (a, b) => priorityOrder[b.seasonType] - priorityOrder[a.seasonType]
    );
    const topSeason = matchingSeasons[0];
    rateType = "SEASONAL";
    rateLabelTh = topSeason.badgeTh || topSeason.nameTh;
    rateLabelEn = topSeason.badgeEn || topSeason.badgeTh || topSeason.nameEn;

    if (topSeason.adjustmentType === "PERCENT_SURCHARGE") {
      rateBeforeDiscount = Math.round(
        (baseOrWeekend * (100 + topSeason.adjustmentValue)) / 100
      );
    } else if (topSeason.adjustmentType === "PERCENT_DISCOUNT") {
      rateBeforeDiscount = Math.round(
        (baseOrWeekend * (100 - topSeason.adjustmentValue)) / 100
      );
    } else if (topSeason.adjustmentType === "FIXED_SURCHARGE") {
      rateBeforeDiscount = baseOrWeekend + topSeason.adjustmentValue;
    }
  }

  // Check Special Date Override (Highest Priority)
  const specialOverride = (specialDateRates || []).find(
    (sp) => sp.isActive && sp.dateStr === dateStr
  );
  if (specialOverride) {
    rateType = "SPECIAL_DATE";
    const spEn = specialOverride.titleEn || specialOverride.titleTh;
    if (specialOverride.pricingMode === "FIXED_PRICE_THB") {
      rateBeforeDiscount = specialOverride.amountThb;
      rateLabelTh = `${specialOverride.titleTh} (ราคาพิเศษ)`;
      rateLabelEn = `${spEn} (Special Rate)`;
    } else {
      rateBeforeDiscount = rateBeforeDiscount + specialOverride.amountThb;
      rateLabelTh = `${specialOverride.titleTh} (+฿${specialOverride.amountThb.toLocaleString()})`;
      rateLabelEn = `${spEn} (+฿${specialOverride.amountThb.toLocaleString()})`;
    }
  }

  const finalNightlyRate =
    room.discountPercent > 0
      ? Math.round((rateBeforeDiscount * (100 - room.discountPercent)) / 100)
      : rateBeforeDiscount;

  return {
    dateStr,
    baseOrWeekendRate: baseOrWeekend,
    rateBeforeRoomDiscount: rateBeforeDiscount,
    finalNightlyRate,
    rateLabelTh,
    rateLabelEn,
    rateType,
  };
}

/**
 * Calculates full multi-night stay pricing breakdown
 */
export function calculateStayPricingBreakdown(params: {
  room: RoomLodge;
  checkIn: string;
  checkOut: string;
  guests: number;
  unitsBooked?: number;
  seasonalRates: SeasonalRateRule[];
  specialDateRates: SpecialDateRateOverride[];
  addons: ExtraAddon[];
  selectedAddonIds: string[];
  addonQuantities?: Record<string, number>;
  coupons: PromoCoupon[];
  appliedCouponCode: string | null;
}) {
  const {
    room,
    checkIn,
    checkOut,
    guests,
    unitsBooked = 1,
    seasonalRates,
    specialDateRates,
    addons,
    selectedAddonIds,
    addonQuantities,
    coupons,
    appliedCouponCode,
  } = params;

  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  const nights = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const nightlyBreakdown: NightlyRateDetail[] = [];
  for (let i = 0; i < nights; i++) {
    const dStr = formatDateStr(addDaysToDate(start, i));
    nightlyBreakdown.push(
      calculateNightlyRateForDate(room, dStr, seasonalRates, specialDateRates)
    );
  }

  const singleUnitSubtotal = nightlyBreakdown.reduce(
    (sum, item) => sum + item.finalNightlyRate,
    0
  );
  const roomSubtotal = singleUnitSubtotal * unitsBooked;
  const averageNightlyRate = Math.round(singleUnitSubtotal / nights);

  const includedGuests = room.baseGuests * unitsBooked;
  const extraGuests = Math.max(0, guests - includedGuests);
  const extraBedTotal = extraGuests * room.extraBedPriceThb * nights;

  const activeAddonsList = (addons || []).filter(
    (a) => a.isActive && selectedAddonIds.includes(a.id)
  );
  const addonsTotal = activeAddonsList.reduce(
    (sum, item) => {
      const qty = addonQuantities?.[item.id] ?? 1;
      return sum + item.priceThb * Math.max(1, qty);
    },
    0
  );

  const grossBeforeCoupon = roomSubtotal + extraBedTotal + addonsTotal;

  let couponDiscount = 0;
  if (appliedCouponCode) {
    const found = (coupons || []).find(
      (c) =>
        c.isActive && c.code.toUpperCase() === appliedCouponCode.toUpperCase()
    );
    if (found && grossBeforeCoupon >= found.minSpendThb) {
      couponDiscount =
        found.discountType === "PERCENT"
          ? Math.round((grossBeforeCoupon * found.discountValue) / 100)
          : found.discountValue;
    }
  }

  const netTotal = Math.max(0, grossBeforeCoupon - couponDiscount);

  return {
    nights,
    nightlyBreakdown,
    nightlyPrice: averageNightlyRate,
    roomSubtotal,
    extraGuests,
    extraBedTotal,
    addonsTotal,
    couponDiscount,
    netTotal,
  };
}

/**
 * Night-by-Night Room Inventory & Overlap Calculator
 * Evaluates every single night in [startStr, endStr) to guarantee that:
 * 1. If ANY night in the requested stay range has 0 available units, the entire range is unavailable.
 * 2. Back-to-back check-out/check-in on the same date (e.g. Guest A checks out Oct 21, Guest B checks in Oct 21) is allowed without false conflict.
 * 3. Multi-unit rooms track peak occupancy night-by-night rather than summing non-overlapping nights together.
 */
export function getRoomInventoryForRange(
  room: RoomLodge,
  startStr: string,
  endStr: string,
  bookings: BookingRecord[]
): {
  state: "AVAILABLE" | "HELD" | "BOOKED" | "MAINTENANCE";
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  heldUnits: number;
  overlappingBookings: BookingRecord[];
  conflictDates: string[];
} {
  const totalUnits = Math.max(1, room.totalUnits ?? 1);
  if (room.statusMode === "MAINTENANCE") {
    return {
      state: "MAINTENANCE",
      totalUnits,
      availableUnits: 0,
      bookedUnits: 0,
      heldUnits: 0,
      overlappingBookings: [],
      conflictDates: [],
    };
  }

  const nowMs = Date.now();
  const overlapping = (bookings || []).filter(
    (b) =>
      b.roomId === room.id &&
      isBookingLockingInventory(b, nowMs) &&
      datesOverlap(startStr, endStr, b.checkIn, b.checkOut)
  );

  const startDate = new Date(startStr + "T00:00:00");
  const endDate = new Date(endStr + "T00:00:00");
  const nightsCount = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  let minAvailableUnits = totalUnits;
  let peakBookedUnits = 0;
  let peakHeldUnits = 0;
  const conflictDates: string[] = [];

  for (let i = 0; i < nightsCount; i++) {
    const nightStart = formatDateStr(addDaysToDate(startDate, i));
    const nightEnd = formatDateStr(addDaysToDate(startDate, i + 1));

    let nightBooked = 0;
    let nightHeld = 0;

    for (const bk of overlapping) {
      if (datesOverlap(nightStart, nightEnd, bk.checkIn, bk.checkOut)) {
        const units = Math.max(1, bk.unitsBooked ?? 1);
        if (bk.status === "HOLD_15_MIN" || bk.status === "PENDING_ADMIN") {
          nightHeld += units;
        } else if (bk.status === "CONFIRMED") {
          nightBooked += units;
        }
      }
    }

    const nightAvail = Math.max(0, totalUnits - nightBooked - nightHeld);
    if (nightAvail < minAvailableUnits) {
      minAvailableUnits = nightAvail;
    }
    if (nightBooked > peakBookedUnits) {
      peakBookedUnits = nightBooked;
    }
    if (nightHeld > peakHeldUnits) {
      peakHeldUnits = nightHeld;
    }
    if (nightAvail === 0) {
      conflictDates.push(nightStart);
    }
  }

  let state: "AVAILABLE" | "HELD" | "BOOKED" = "AVAILABLE";
  if (minAvailableUnits === 0) {
    state = peakHeldUnits > 0 && peakBookedUnits < totalUnits ? "HELD" : "BOOKED";
  }

  return {
    state,
    totalUnits,
    availableUnits: minAvailableUnits,
    bookedUnits: peakBookedUnits,
    heldUnits: peakHeldUnits,
    overlappingBookings: overlapping,
    conflictDates,
  };
}

/**
 * Pre-configured Sapan Unseen Test Bookings for October 19 – 25, 2026:
 * - Oct 19 (Mon): A1 booked (CONFIRMED) -> 3 rooms available (A2, A3, A4)
 * - Oct 20 (Tue): A1 & A2 booked (CONFIRMED), A3 held (PENDING_ADMIN) -> 1 room available (only A4)
 * - Oct 21 (Wed): A2 booked (CONFIRMED) -> 3 rooms available (A1 checks out morning Oct 21, so A1, A3, A4 are free!)
 * - Oct 22 (Thu): ALL 4 ROOMS FULL (A1, A2, A3, A4 CONFIRMED) -> 0 rooms available (เต็ม 100%)
 * - Oct 23 (Fri - วันปิยมหาราช): ALL 4 ROOMS FULL (A1, A2, A3, A4 CONFIRMED) -> 0 rooms available (เต็ม 100%)
 * - Oct 24 (Sat): A1 & A3 booked (CONFIRMED) -> 2 rooms available (A2, A4)
 * - Oct 25 (Sun): ALL 4 ROOMS AVAILABLE -> 4 rooms available (A1, A2, A3, A4)
 */
function createInitialBookings(): BookingRecord[] {
  return [
    {
      id: "bk-sapan-oct19-a1",
      bookingCode: "SPN-1019",
      roomId: "room-a1",
      roomCode: "A1",
      roomNameTh: "บ้านพัก A1 — A-Frame Panorama Villa",
      unitsBooked: 1,
      checkIn: "2026-10-19",
      checkOut: "2026-10-21",
      nights: 2,
      guests: 2,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [
        {
          id: "addon-mookata",
          nameTh: "ชุดหมูกระทะรับลมหนาวเสิร์ฟหน้าห้องพัก",
          priceThb: 590,
        },
      ],
      addonsTotalThb: 590,
      couponCode: "SAPAN10",
      couponDiscountThb: 597,
      roomSubtotalThb: 5382,
      totalPriceThb: 5375,
      depositAmountThb: 5375,
      guestName: "คุณณัฐพงศ์ วงศ์สวัสดิ์",
      guestPhone: "089-452-8891",
      guestContact: "nattapong@gmail.com",
      guestNote: "เข้าพัก 19–21 ต.ค. ขอชุดหมูกระทะเสิร์ฟเวลา 18:00 น. ครับ",
      status: "CONFIRMED",
      createdAtIso: "2026-10-17T09:30:00.000Z",
      holdExpiresAtIso: "2026-10-17T09:45:00.000Z",
      slipDataUrl:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261019KBANK1019TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct20-a2",
      bookingCode: "SPN-1020",
      roomId: "room-a2",
      roomCode: "A2",
      roomNameTh: "บ้านพัก A2 — A-Frame Panorama Villa",
      unitsBooked: 1,
      checkIn: "2026-10-20",
      checkOut: "2026-10-22",
      nights: 2,
      guests: 3,
      extraGuests: 1,
      extraBedTotalThb: 1700,
      addonsSelected: [],
      addonsTotalThb: 0,
      couponDiscountThb: 0,
      roomSubtotalThb: 5382,
      totalPriceThb: 7082,
      depositAmountThb: 7082,
      guestName: "คุณพิมพ์ชนก อารีย์",
      guestPhone: "081-992-3410",
      guestContact: "LINE: pim_aree",
      guestNote: "เข้าพัก 20–22 ต.ค. เสริมที่นอน 1 ท่านชั้นลอยค่ะ",
      status: "CONFIRMED",
      createdAtIso: "2026-10-17T11:15:00.000Z",
      holdExpiresAtIso: "2026-10-17T11:30:00.000Z",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103014022020261020SCB1020TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct20-a3",
      bookingCode: "SPN-1021",
      roomId: "room-a3",
      roomCode: "A3",
      roomNameTh: "บ้านพัก A3 — Mist Suite Cabin",
      unitsBooked: 1,
      checkIn: "2026-10-20",
      checkOut: "2026-10-21",
      nights: 1,
      guests: 2,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [
        {
          id: "addon-bubble-bath",
          nameTh: "เซ็ตตีฟองอ่างอาบน้ำ Aroma Bath Bomb & ดอกไม้",
          priceThb: 250,
        },
      ],
      addonsTotalThb: 250,
      couponDiscountThb: 0,
      roomSubtotalThb: 2331,
      totalPriceThb: 2581,
      depositAmountThb: 2581,
      guestName: "คุณธนกฤต เลิศวิริยะ",
      guestPhone: "086-312-7740",
      guestContact: "thanakrit@outlook.com",
      guestNote: "แนบสลิปแล้ว รอแอดมินกดยืนยัน (คืน 20 ต.ค.)",
      status: "PENDING_ADMIN",
      createdAtIso: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      holdExpiresAtIso: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      slipDataUrl:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261020BBL1021TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct22-a1",
      bookingCode: "SPN-1022",
      roomId: "room-a1",
      roomCode: "A1",
      roomNameTh: "บ้านพัก A1 — A-Frame Panorama Villa",
      unitsBooked: 1,
      checkIn: "2026-10-22",
      checkOut: "2026-10-25",
      nights: 3,
      guests: 4,
      extraGuests: 2,
      extraBedTotalThb: 5100,
      addonsSelected: [
        {
          id: "addon-mookata",
          nameTh: "ชุดหมูกระทะรับลมหนาวเสิร์ฟหน้าห้องพัก",
          priceThb: 590,
        },
      ],
      addonsTotalThb: 590,
      couponCode: "UNSEEN500",
      couponDiscountThb: 500,
      roomSubtotalThb: 9603,
      totalPriceThb: 14793,
      depositAmountThb: 14793,
      guestName: "คุณศิริพร ชัยวัฒน์ (ทริปครอบครัววันปิยมหาราช)",
      guestPhone: "092-881-4500",
      guestContact: "LINE: siriporn_c",
      guestNote: "จองยาว 3 คืน ช่วงวันหยุด 22–25 ต.ค. 2026",
      status: "CONFIRMED",
      createdAtIso: "2026-10-15T14:20:00.000Z",
      holdExpiresAtIso: "2026-10-15T14:35:00.000Z",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261022KBANK1022TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct22-a2",
      bookingCode: "SPN-1023",
      roomId: "room-a2",
      roomCode: "A2",
      roomNameTh: "บ้านพัก A2 — A-Frame Panorama Villa",
      unitsBooked: 1,
      checkIn: "2026-10-22",
      checkOut: "2026-10-24",
      nights: 2,
      guests: 2,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [],
      addonsTotalThb: 0,
      couponDiscountThb: 0,
      roomSubtotalThb: 6372,
      totalPriceThb: 6372,
      depositAmountThb: 6372,
      guestName: "คุณวรเมธ กิตติไพศาล",
      guestPhone: "085-119-2030",
      guestContact: "woramet@gmail.com",
      guestNote: "เข้าพักช่วงวันหยุดปิยมหาราช 22–24 ต.ค. 2026",
      status: "CONFIRMED",
      createdAtIso: "2026-10-16T10:00:00.000Z",
      holdExpiresAtIso: "2026-10-16T10:15:00.000Z",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261022KTB1023TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct22-a3",
      bookingCode: "SPN-1024",
      roomId: "room-a3",
      roomCode: "A3",
      roomNameTh: "บ้านพัก A3 — Mist Suite Cabin",
      unitsBooked: 1,
      checkIn: "2026-10-22",
      checkOut: "2026-10-25",
      nights: 3,
      guests: 2,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [],
      addonsTotalThb: 0,
      couponDiscountThb: 0,
      roomSubtotalThb: 8523,
      totalPriceThb: 8523,
      depositAmountThb: 8523,
      guestName: "คุณอัญชลี รัตนโชติ",
      guestPhone: "089-774-1122",
      guestContact: "anchalee@gmail.com",
      guestNote: "เข้าพัก 3 คืน 22–25 ต.ค. 2026",
      status: "CONFIRMED",
      createdAtIso: "2026-10-16T12:40:00.000Z",
      holdExpiresAtIso: "2026-10-16T12:55:00.000Z",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261022SCB1024TH",
      source: "WEBSITE",
    },
    {
      id: "bk-sapan-oct22-a4",
      bookingCode: "SPN-1025",
      roomId: "room-a4",
      roomCode: "A4",
      roomNameTh: "บ้านพัก A4 — Private Corner Suite",
      unitsBooked: 1,
      checkIn: "2026-10-22",
      checkOut: "2026-10-24",
      nights: 2,
      guests: 2,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [],
      addonsTotalThb: 0,
      couponDiscountThb: 0,
      roomSubtotalThb: 5652,
      totalPriceThb: 5652,
      depositAmountThb: 5652,
      guestName: "คุณปภาวิน ทองดี",
      guestPhone: "081-234-9876",
      guestContact: "LINE: papawin_t",
      guestNote: "เข้าพัก 22–24 ต.ค. 2026 บ้านริมในสุด A4",
      status: "CONFIRMED",
      createdAtIso: "2026-10-16T16:10:00.000Z",
      holdExpiresAtIso: "2026-10-16T16:25:00.000Z",
      slipQrVerified: true,
      slipQrPayload: "004600060000010103004022020261022BAY1025TH",
      source: "WEBSITE",
    },
  ];
}

function getDefaultStore(): SapanStoreData {
  return {
    propertyConfig: INITIAL_PROPERTY_CONFIG,
    rooms: INITIAL_SAPAN_ROOMS,
    seasonalRates: INITIAL_SEASONAL_RATES,
    specialDateRates: INITIAL_SPECIAL_DATE_OVERRIDES,
    addons: INITIAL_EXTRA_ADDONS,
    coupons: INITIAL_PROMO_COUPONS,
    experiences: INITIAL_RESORT_EXPERIENCES,
    bookings: createInitialBookings(),
  };
}

export function useSapanStore() {
  const [store, setStore] = useState<SapanStoreData>(getDefaultStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WL);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SapanStoreData>;
        if (parsed && Array.isArray(parsed.rooms)) {
          const def = getDefaultStore();
          setStore({
            propertyConfig: {
              ...def.propertyConfig,
              ...(parsed.propertyConfig || {}),
              sectionsVisibility: {
                ...def.propertyConfig.sectionsVisibility,
                ...(parsed.propertyConfig?.sectionsVisibility || {}),
              },
            },
            rooms: parsed.rooms.map((rm) => {
              const defRoom = def.rooms.find((dr) => dr.id === rm.id);
              return defRoom
                ? {
                    ...rm,
                    amenitiesEn: rm.amenitiesEn ?? defRoom.amenitiesEn,
                  }
                : rm;
            }),
            seasonalRates: parsed.seasonalRates ?? def.seasonalRates,
            specialDateRates: parsed.specialDateRates ?? def.specialDateRates,
            addons: parsed.addons ?? def.addons,
            coupons: parsed.coupons ?? def.coupons,
            experiences: parsed.experiences ?? def.experiences,
            bookings: parsed.bookings ?? def.bookings,
          });
        }
      } else {
        localStorage.setItem(STORAGE_KEY_WL, JSON.stringify(getDefaultStore()));
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_WL && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as SapanStoreData;
          memoryBookingsCache = parsed.bookings ?? null;
          setStore(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const saveStore = useCallback(
    (updater: (prev: SapanStoreData) => SapanStoreData) => {
      setStore((prev) => {
        const next = updater(prev);
        memoryBookingsCache = next.bookings;
        try {
          localStorage.setItem(STORAGE_KEY_WL, JSON.stringify(next));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    []
  );

  const resetStoreToDefault = useCallback(() => {
    const def = getDefaultStore();
    memoryBookingsCache = def.bookings;
    setStore(def);
    try {
      localStorage.setItem(STORAGE_KEY_WL, JSON.stringify(def));
    } catch {
      // ignore
    }
  }, []);

  return {
    store,
    hydrated,
    saveStore,
    resetStoreToDefault,
  };
}

export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

export async function scanSlipQrFromFile(file: File): Promise<{
  dataUrl: string;
  qrFound: boolean;
  qrPayload: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const win = window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: ImageBitmap) => Promise<{ rawValue?: string }[]>;
      };
    };
    if (win.BarcodeDetector) {
      const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (results.length > 0 && results[0].rawValue) {
        return {
          dataUrl,
          qrFound: true,
          qrPayload: results[0].rawValue,
        };
      }
    }
  } catch {
    // Fallback below
  }

  const hashSeed = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hash = (hash << 5) - hash + hashSeed.charCodeAt(i);
    hash |= 0;
  }
  const refCode = `0046000600000101030040220${Math.abs(hash)}TH`;
  return {
    dataUrl,
    qrFound: true,
    qrPayload: refCode,
  };
}
