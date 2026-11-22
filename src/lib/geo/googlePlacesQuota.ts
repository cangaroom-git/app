import { prisma } from "@/lib/prisma";

/**
 * Dynamic Monthly Pacing Gate for Google Maps Platform SKUs.
 *
 * Keeps usage strictly within Google Maps Platform's monthly per-SKU free thresholds
 * (95% safety margin) using real-time dynamic daily pacing:
 *   todayBudget = ceil((monthlyCap - usedThisMonth) / daysLeftInMonth) * burstFactor
 *
 * When quiet early in the month (e.g. only 200 calls in days 1–10), remaining calls
 * automatically roll forward across the remaining days of the month, with 1.5x burst
 * headroom for weekends — while NEVER exceeding the monthly free cap!
 */

export type GoogleQuotaSku =
  | "PLACES_NEARBY_PRO"
  | "PLACES_TEXT_PRO"
  | "PLACES_DETAIL_PRO"
  | "PLACES_AUTOCOMPLETE"
  | "PLACES_PHOTO"
  | "MAPS_JS_LOAD";

interface SkuQuotaPolicy {
  monthlyCap: number;
  minDailyFloor: number;
  burstMultiplier: number;
}

export const GOOGLE_SKU_POLICIES: Record<GoogleQuotaSku, SkuQuotaPolicy> = {
  // Google free monthly thresholds: Nearby/Text/Detail Pro = 5,000, Autocomplete = 10,000, Photo = 1,000, Dynamic Maps = 10,000
  PLACES_NEARBY_PRO: {
    monthlyCap: 4700,
    minDailyFloor: 20,
    burstMultiplier: 1.5,
  },
  PLACES_TEXT_PRO: {
    monthlyCap: 4700,
    minDailyFloor: 20,
    burstMultiplier: 1.5,
  },
  PLACES_DETAIL_PRO: {
    monthlyCap: 4700,
    minDailyFloor: 20,
    burstMultiplier: 1.5,
  },
  PLACES_AUTOCOMPLETE: {
    monthlyCap: 9500,
    minDailyFloor: 40,
    burstMultiplier: 1.5,
  },
  PLACES_PHOTO: {
    monthlyCap: 950,
    minDailyFloor: 10,
    burstMultiplier: 1.4,
  },
  MAPS_JS_LOAD: {
    monthlyCap: 9500,
    minDailyFloor: 40,
    burstMultiplier: 1.5,
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  sku: GoogleQuotaSku;
  monthlyUsed: number;
  monthlyCap: number;
  monthlyRemaining: number;
  dailyUsed: number;
  todayAllowed: number;
  daysLeftInMonth: number;
}

function getBangkokDateParts(now = new Date()): {
  monthKey: string;
  dayKey: string;
  daysLeftInMonth: number;
} {
  // Format in Asia/Bangkok (UTC+7) so Thailand daily pacing matches local calendar days
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? now.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value ?? now.getUTCMonth() + 1);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? now.getUTCDate());

  const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysLeftInMonth = Math.max(1, totalDaysInMonth - day + 1);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    monthKey: `${year}-${mm}`,
    dayKey: `${year}-${mm}-${dd}`,
    daysLeftInMonth,
  };
}

function computePacingDecision(
  sku: GoogleQuotaSku,
  monthlyUsed: number,
  dailyUsed: number,
  daysLeftInMonth: number
): QuotaCheckResult {
  const policy = GOOGLE_SKU_POLICIES[sku];
  const monthlyRemaining = Math.max(0, policy.monthlyCap - monthlyUsed);

  if (monthlyRemaining <= 0) {
    return {
      allowed: false,
      sku,
      monthlyUsed,
      monthlyCap: policy.monthlyCap,
      monthlyRemaining: 0,
      dailyUsed,
      todayAllowed: 0,
      daysLeftInMonth,
    };
  }

  // Dynamic daily pacing: (remaining quota / remaining days in month) * burst headroom, strictly capped by monthlyRemaining
  const baseDailyPace = Math.ceil(monthlyRemaining / daysLeftInMonth);
  const todayAllowed = Math.min(
    monthlyRemaining,
    Math.max(
      policy.minDailyFloor,
      Math.ceil(baseDailyPace * policy.burstMultiplier)
    )
  );

  return {
    allowed: dailyUsed < todayAllowed,
    sku,
    monthlyUsed,
    monthlyCap: policy.monthlyCap,
    monthlyRemaining,
    dailyUsed,
    todayAllowed,
    daysLeftInMonth,
  };
}

/**
 * Read-only check of current quota status without consuming a call.
 */
export async function peekGoogleQuota(
  sku: GoogleQuotaSku
): Promise<QuotaCheckResult> {
  const { monthKey, dayKey, daysLeftInMonth } = getBangkokDateParts();
  try {
    const row = await prisma.apiQuotaUsage.findUnique({
      where: { sku_monthKey: { sku, monthKey } },
      select: { monthlyCount: true, dailyCount: true, dayKey: true },
    });
    const monthlyUsed = row?.monthlyCount ?? 0;
    const dailyUsed = row && row.dayKey === dayKey ? row.dailyCount : 0;
    return computePacingDecision(sku, monthlyUsed, dailyUsed, daysLeftInMonth);
  } catch (err) {
    console.warn("[peekGoogleQuota] DB unavailable, failing closed to fallback:", err);
    return computePacingDecision(
      sku,
      GOOGLE_SKU_POLICIES[sku].monthlyCap,
      GOOGLE_SKU_POLICIES[sku].monthlyCap,
      daysLeftInMonth
    );
  }
}

/**
 * Atomically checks dynamic monthly/daily pacing AND consumes `units` if allowed.
 * Fails closed (returns allowed: false -> automatic free fallback) if DB error occurs.
 */
export async function consumeGoogleQuota(
  sku: GoogleQuotaSku,
  units = 1
): Promise<QuotaCheckResult> {
  const safeUnits = Math.max(1, Math.min(10, Math.round(units)));
  const { monthKey, dayKey, daysLeftInMonth } = getBangkokDateParts();

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.apiQuotaUsage.findUnique({
        where: { sku_monthKey: { sku, monthKey } },
      });

      const monthlyUsed = existing?.monthlyCount ?? 0;
      const dailyUsed =
        existing && existing.dayKey === dayKey ? existing.dailyCount : 0;

      const decision = computePacingDecision(
        sku,
        monthlyUsed,
        dailyUsed,
        daysLeftInMonth
      );

      if (!decision.allowed || monthlyUsed + safeUnits > decision.monthlyCap) {
        return { ...decision, allowed: false };
      }

      const nextMonthly = monthlyUsed + safeUnits;
      const nextDaily = dailyUsed + safeUnits;

      if (existing) {
        await tx.apiQuotaUsage.update({
          where: { id: existing.id },
          data: {
            dayKey,
            monthlyCount: nextMonthly,
            dailyCount: nextDaily,
          },
        });
      } else {
        await tx.apiQuotaUsage.create({
          data: {
            sku,
            monthKey,
            dayKey,
            monthlyCount: nextMonthly,
            dailyCount: nextDaily,
          },
        });
      }

      return {
        ...decision,
        allowed: true,
        monthlyUsed: nextMonthly,
        monthlyRemaining: Math.max(0, decision.monthlyCap - nextMonthly),
        dailyUsed: nextDaily,
      };
    });
  } catch (err) {
    console.warn("[consumeGoogleQuota] DB error, failing closed to OSM fallback:", err);
    return computePacingDecision(
      sku,
      GOOGLE_SKU_POLICIES[sku].monthlyCap,
      GOOGLE_SKU_POLICIES[sku].monthlyCap,
      daysLeftInMonth
    );
  }
}
