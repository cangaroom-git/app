import type {
  CouponDealDto,
  HotelDiscountRuleDto,
  RoomAvailabilityDto,
  RoomDateOverrideDto,
} from "@/types/cangaroom";

export const RESERVED_HOTEL_SLUGS = new Set([
  "admin",
  "studio",
  "super-admin",
  "board",
  "deal",
  "deals",
  "trips",
  "setting",
  "settings",
  "login",
  "register-hotel",
  "partner",
  "api",
  "mcp",
  ".well-known",
  "about",
  "terms",
  "privacy",
  "search",
  "explore",
  "booking",
  "room",
  "shorts",
  "guide",
  "review",
  "chat",
  "auth",
  "cangaroom",
  "nondii",
  "default",
  "www",
  "app",
]);

export function normalizeHotelSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function formatDateStr(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(date: Date | string, days: number): string {
  const base =
    typeof date === "string"
      ? new Date(`${date.slice(0, 10)}T00:00:00`)
      : new Date(date.getTime());
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return formatDateStr(base);
}

export function listDatesInRange(checkInStr: string, checkOutStr: string): string[] {
  const dates: string[] = [];
  if (!checkInStr || !checkOutStr || checkInStr >= checkOutStr) {
    return dates;
  }
  let cursor = checkInStr.slice(0, 10);
  const limit = 90;
  let step = 0;
  while (cursor < checkOutStr.slice(0, 10) && step < limit) {
    dates.push(cursor);
    cursor = addDaysToDate(cursor, 1);
    step += 1;
  }
  return dates;
}

export function computeNightsBetween(checkInStr: string, checkOutStr: string): number {
  const inDate = new Date(`${checkInStr.slice(0, 10)}T00:00:00`);
  const outDate = new Date(`${checkOutStr.slice(0, 10)}T00:00:00`);
  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 1;
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
  return Math.max(1, diff);
}

export function isWeekendNight(dateStr: string): boolean {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  const day = d.getDay();
  return day === 5 || day === 6; // Friday or Saturday night
}

export function calculateNightlyRateForDate(
  room: Pick<RoomAvailabilityDto, "id" | "weekdayPriceThb" | "weekendPriceThb">,
  dateStr: string,
  overrides: ReadonlyArray<RoomDateOverrideDto> = []
): number {
  const matched = overrides.find(
    (o) => o.roomId === room.id && o.dateStr === dateStr
  );
  if (matched?.overridePriceThb && matched.overridePriceThb > 0) {
    return matched.overridePriceThb;
  }
  return isWeekendNight(dateStr) ? room.weekendPriceThb : room.weekdayPriceThb;
}

/**
 * Returns the maximum minNights restriction across all nights in [checkInDate, checkOutDate)
 * for a given room (matching server-side enforcement in bookingCheckoutService.ts).
 */
export function getRequiredMinNightsForStay(
  roomId: string,
  checkInDate: string,
  checkOutDate: string,
  overrides: ReadonlyArray<RoomDateOverrideDto> = []
): number {
  const stayDates = listDatesInRange(checkInDate, checkOutDate);
  if (stayDates.length === 0) return 1;
  const dateSet = new Set(stayDates);
  let required = 1;
  for (const ov of overrides) {
    if (ov.roomId === roomId && dateSet.has(ov.dateStr)) {
      if (ov.minNights && ov.minNights > required) {
        required = ov.minNights;
      }
    }
  }
  return required;
}

export interface StayPricingBreakdown {
  nights: number;
  unitsBooked: number;
  roomSubtotalThb: number;
  addonsTotalThb: number;
  extraGuestTotalThb: number;
  subtotalBeforeDiscountThb: number;
  discountThb: number;
  netTotalThb: number;
  appliedCouponCode: string | null;
  appliedAutoDiscountLabel?: string | null;
  couponError: string | null;
}

/**
 * Compute the highest eligible automatic stay discount (Airbnb "Only one best discount applies per stay" rule).
 */
export function computeBestAutomaticDiscount(params: {
  rules: ReadonlyArray<HotelDiscountRuleDto>;
  nights: number;
  checkInDate: string;
  subtotalThb: number;
  todayStr?: string;
}): { rule: HotelDiscountRuleDto; discountThb: number } | null {
  const { rules, nights, checkInDate, subtotalThb, todayStr } = params;
  if (!rules.length || subtotalThb <= 0) return null;

  const baseTodayStr = todayStr || formatDateStr(new Date());
  const todayMs = new Date(`${baseTodayStr.slice(0, 10)}T00:00:00`).getTime();
  const checkInMs = new Date(`${checkInDate.slice(0, 10)}T00:00:00`).getTime();
  const advanceDays =
    !isNaN(todayMs) && !isNaN(checkInMs)
      ? Math.max(0, Math.round((checkInMs - todayMs) / 86400000))
      : 0;

  let best: { rule: HotelDiscountRuleDto; discountThb: number } | null = null;

  for (const rule of rules) {
    if (!rule.isActive || rule.discountValue <= 0) continue;

    let eligible = false;
    if (rule.ruleType === "LENGTH_OF_STAY") {
      eligible = nights >= Math.max(2, rule.minNights ?? 2);
    } else if (rule.ruleType === "EARLY_BIRD") {
      eligible = advanceDays >= Math.max(1, rule.minAdvanceDays ?? 14);
    } else if (rule.ruleType === "LAST_MINUTE") {
      eligible = advanceDays <= Math.max(0, rule.maxAdvanceDays ?? 3);
    }

    if (!eligible) continue;

    const raw =
      rule.discountType === "PERCENT"
        ? Math.round((subtotalThb * rule.discountValue) / 100)
        : rule.discountValue;
    const clamped = Math.min(subtotalThb, Math.max(0, raw));

    if (clamped > 0 && (!best || clamped > best.discountThb)) {
      best = { rule, discountThb: clamped };
    }
  }

  return best;
}

export function computeCouponDiscount(
  coupon: Pick<
    CouponDealDto,
    "discountType" | "discountValue" | "minSpendThb" | "maxDiscountThb" | "isActive" | "expiresAt"
  >,
  subtotalThb: number
): { discountThb: number; error: string | null } {
  if (!coupon.isActive) {
    return { discountThb: 0, error: "คูปองนี้ปิดใช้งานแล้ว" };
  }
  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { discountThb: 0, error: "คูปองนี้หมดอายุแล้ว" };
  }
  if (subtotalThb < coupon.minSpendThb) {
    return {
      discountThb: 0,
      error: `ยอดจองขั้นต่ำ ฿${coupon.minSpendThb.toLocaleString()} จึงจะใช้โค้ดนี้ได้`,
    };
  }

  let rawDiscount =
    coupon.discountType === "PERCENT"
      ? Math.round((subtotalThb * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountThb && rawDiscount > coupon.maxDiscountThb) {
    rawDiscount = coupon.maxDiscountThb;
  }

  return {
    discountThb: Math.min(subtotalThb, Math.max(0, rawDiscount)),
    error: null,
  };
}

export function calculateStayPricing(params: {
  room: RoomAvailabilityDto;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  unitsBooked?: number;
  overrides?: ReadonlyArray<RoomDateOverrideDto>;
  addons?: ReadonlyArray<{ id: string; priceThb: number }>;
  addonQuantities?: Record<string, number>;
  coupon?: CouponDealDto | null;
  discountRules?: ReadonlyArray<HotelDiscountRuleDto>;
}): StayPricingBreakdown {
  const {
    room,
    checkInDate,
    checkOutDate,
    guests,
    unitsBooked = 1,
    overrides = [],
    addons = [],
    addonQuantities = {},
    coupon = null,
    discountRules = [],
  } = params;

  const stayDates = listDatesInRange(checkInDate, checkOutDate);
  const nights = Math.max(1, stayDates.length);

  let perUnitRoomTotal = 0;
  if (stayDates.length > 0) {
    for (const d of stayDates) {
      perUnitRoomTotal += calculateNightlyRateForDate(room, d, overrides);
    }
  } else {
    perUnitRoomTotal = room.weekdayPriceThb;
  }

  const extraGuests = Math.max(0, guests - room.standardGuests * unitsBooked);
  const extraGuestTotalThb = extraGuests * (room.extraGuestPriceThb || 0) * nights;
  const roomSubtotalThb = perUnitRoomTotal * unitsBooked + extraGuestTotalThb;

  let addonsTotalThb = 0;
  for (const addon of addons) {
    const qty = addonQuantities[addon.id] ?? 0;
    if (qty > 0) {
      addonsTotalThb += addon.priceThb * qty;
    }
  }

  const subtotalBeforeDiscountThb = roomSubtotalThb + addonsTotalThb;

  let couponDiscountThb = 0;
  let couponCodeCandidate: string | null = null;
  let couponError: string | null = null;

  if (coupon) {
    const res = computeCouponDiscount(coupon, subtotalBeforeDiscountThb);
    if (res.error) {
      couponError = res.error;
    } else {
      couponDiscountThb = res.discountThb;
      couponCodeCandidate = coupon.code;
    }
  }

  const bestAuto = computeBestAutomaticDiscount({
    rules: discountRules,
    nights,
    checkInDate,
    subtotalThb: roomSubtotalThb,
  });

  // Airbnb Best-Single-Discount rule: apply whichever saves the guest more (never stack)
  let discountThb = 0;
  let appliedCouponCode: string | null = null;
  let appliedAutoDiscountLabel: string | null = null;

  if (bestAuto && bestAuto.discountThb > couponDiscountThb) {
    discountThb = bestAuto.discountThb;
    appliedAutoDiscountLabel = bestAuto.rule.titleTh;
  } else if (couponDiscountThb > 0) {
    discountThb = couponDiscountThb;
    appliedCouponCode = couponCodeCandidate;
  }

  return {
    nights,
    unitsBooked,
    roomSubtotalThb,
    addonsTotalThb,
    extraGuestTotalThb,
    subtotalBeforeDiscountThb,
    discountThb,
    netTotalThb: Math.max(0, subtotalBeforeDiscountThb - discountThb),
    appliedCouponCode,
    appliedAutoDiscountLabel,
    couponError,
  };
}
