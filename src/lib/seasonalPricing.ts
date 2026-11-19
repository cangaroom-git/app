import { addDaysToDate, listDatesInRange } from "@/lib/bookingMath";

export interface SeasonalRuleRecord {
  id: string;
  presetKey?: string | null;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  daysOfWeek: number[]; // 0 (Sun) .. 6 (Sat)
  minNights: number;
  defaultPct?: number; // e.g. +30 or -15 for templates
  roomPrices: Record<string, number>; // roomId -> nightly override THB
  isActive: boolean;
  /** When true, this Month/Day window repeats every year from max(today, startDate) onward */
  repeatAnnually?: boolean;
}

export interface BuiltinSeasonTemplate {
  presetKey: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  defaultPct: number;
  minNights: number;
  badgeText: string;
}

export const BUILTIN_THAI_SEASON_TEMPLATES: readonly BuiltinSeasonTemplate[] = [
  {
    presetKey: "new-year",
    name: "เทศกาลปีใหม่",
    startMonth: 12,
    startDay: 20,
    endMonth: 1,
    endDay: 3,
    defaultPct: 30,
    minNights: 1,
    badgeText: "+30%",
  },
  {
    presetKey: "songkran",
    name: "เทศกาลสงกรานต์",
    startMonth: 4,
    startDay: 12,
    endMonth: 4,
    endDay: 16,
    defaultPct: 30,
    minNights: 1,
    badgeText: "+30%",
  },
  {
    presetKey: "high-season",
    name: "High Season ฤดูหนาว",
    startMonth: 11,
    startDay: 1,
    endMonth: 2,
    endDay: 28,
    defaultPct: 15,
    minNights: 1,
    badgeText: "+15%",
  },
  {
    presetKey: "green-season",
    name: "Green Season หน้าฝน",
    startMonth: 6,
    startDay: 1,
    endMonth: 9,
    endDay: 30,
    defaultPct: -15,
    minNights: 1,
    badgeText: "-15%",
  },
] as const;

export function getNextSeasonDateRange(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): { startDate: string; endDate: string } {
  const now = new Date();
  let startYear = now.getFullYear();
  const candidateEndYear =
    endMonth < startMonth || (endMonth === startMonth && endDay < startDay)
      ? startYear + 1
      : startYear;
  const candidateEnd = new Date(candidateEndYear, endMonth - 1, endDay);
  if (candidateEnd.getTime() < now.getTime() - 86400000) {
    startYear += 1;
  }
  const endYear =
    endMonth < startMonth || (endMonth === startMonth && endDay < startDay)
      ? startYear + 1
      : startYear;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${startYear}-${pad(startMonth)}-${pad(startDay)}`,
    endDate: `${endYear}-${pad(endMonth)}-${pad(endDay)}`,
  };
}

export function buildDefaultRoomPricesForPct(
  rooms: ReadonlyArray<{ id: string; weekdayPriceThb: number; weekendPriceThb: number }>,
  pct: number
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rooms) {
    const base = Math.max(r.weekdayPriceThb, r.weekendPriceThb);
    map[r.id] = Math.max(100, Math.round((base * (1 + pct / 100)) / 50) * 50);
  }
  return map;
}

export function countRuleDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  return listDatesInRange(startDate, addDaysToDate(endDate, 1)).length;
}

export function parseSeasonalRulesJson(raw: unknown): SeasonalRuleRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: SeasonalRuleRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const startDate =
      typeof rec.startDate === "string" ? rec.startDate.trim() : "";
    const endDate = typeof rec.endDate === "string" ? rec.endDate.trim() : "";
    if (!id || !name || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      continue;
    }
    const daysOfWeek = Array.isArray(rec.daysOfWeek)
      ? rec.daysOfWeek.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
      : [0, 1, 2, 3, 4, 5, 6];
    const roomPrices: Record<string, number> = {};
    if (rec.roomPrices && typeof rec.roomPrices === "object") {
      for (const [rid, val] of Object.entries(rec.roomPrices as Record<string, unknown>)) {
        const num = Number(val);
        if (Number.isFinite(num) && num >= 100) {
          roomPrices[rid] = Math.round(num);
        }
      }
    }
    out.push({
      id,
      presetKey: typeof rec.presetKey === "string" ? rec.presetKey : null,
      name,
      startDate,
      endDate,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
      minNights: Math.max(1, Math.min(30, Number(rec.minNights) || 1)),
      defaultPct: typeof rec.defaultPct === "number" ? rec.defaultPct : undefined,
      roomPrices,
      isActive: Boolean(rec.isActive),
      repeatAnnually: Boolean(rec.repeatAnnually),
    });
  }
  return out;
}

function clampMonthDayForYear(year: number, month: number, day: number): string {
  const maxDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(safeDay)}`;
}

/**
 * Deterministic 2-tier priority comparator (write earlier items first, later items win):
 * 1) Longer duration written first -> Shorter specific holiday wins (e.g. New Year overrides High Season)
 * 2) Equal duration -> Annual recurring written first -> Specific single-year override wins!
 */
export function compareSeasonalRulePriority(
  a: SeasonalRuleRecord,
  b: SeasonalRuleRecord
): number {
  const diffDays =
    countRuleDays(b.startDate, b.endDate) -
    countRuleDays(a.startDate, a.endDate);
  if (diffDays !== 0) return diffDays;
  const aRec = a.repeatAnnually ? 1 : 0;
  const bRec = b.repeatAnnually ? 1 : 0;
  return bRec - aRec;
}

/**
 * Projects a SeasonalRuleRecord (single-year or repeatAnnually) into concrete date spans
 * clipped inside [windowStartStr, windowEndStr] and never earlier than floorDateStr.
 */
export function expandRuleOccurrencesForWindow(
  rule: Pick<SeasonalRuleRecord, "startDate" | "endDate" | "repeatAnnually">,
  windowStartStr: string,
  windowEndStr: string,
  floorDateStr?: string
): Array<{ startDate: string; endDate: string }> {
  if (!rule.startDate || !rule.endDate || rule.endDate < rule.startDate) {
    return [];
  }
  const effectiveFloor =
    floorDateStr && floorDateStr > windowStartStr
      ? floorDateStr
      : windowStartStr;

  if (!rule.repeatAnnually) {
    const s = rule.startDate < effectiveFloor ? effectiveFloor : rule.startDate;
    const e = rule.endDate > windowEndStr ? windowEndStr : rule.endDate;
    return s <= e ? [{ startDate: s, endDate: e }] : [];
  }

  // Annual recurring projection: never apply before rule.startDate or floorDateStr
  const recurringFloor =
    rule.startDate > effectiveFloor ? rule.startDate : effectiveFloor;

  const startM = Number(rule.startDate.slice(5, 7));
  const startD = Number(rule.startDate.slice(8, 10));
  const endM = Number(rule.endDate.slice(5, 7));
  const endD = Number(rule.endDate.slice(8, 10));
  const crossesYear =
    endM < startM || (endM === startM && endD < startD);

  const minYear = Number(recurringFloor.slice(0, 4)) - (crossesYear ? 1 : 0);
  const maxYear = Number(windowEndStr.slice(0, 4));
  const spans: Array<{ startDate: string; endDate: string }> = [];

  for (let yr = minYear; yr <= maxYear; yr++) {
    const occStart = clampMonthDayForYear(yr, startM, startD);
    const occEnd = clampMonthDayForYear(
      crossesYear ? yr + 1 : yr,
      endM,
      endD
    );
    const s = occStart < recurringFloor ? recurringFloor : occStart;
    const e = occEnd > windowEndStr ? windowEndStr : occEnd;
    if (s <= e) {
      spans.push({ startDate: s, endDate: e });
    }
  }
  return spans;
}

/**
 * Finds active rules whose date ranges & rooms overlap with the candidate range.
 */
export function findOverlappingSeasonalRules(
  rules: ReadonlyArray<SeasonalRuleRecord>,
  candidate: {
    id?: string | null;
    startDate: string;
    endDate: string;
    roomIds: string[];
    repeatAnnually?: boolean;
  }
): Array<{ rule: SeasonalRuleRecord; overlapDays: number }> {
  if (!candidate.startDate || !candidate.endDate || candidate.endDate < candidate.startDate) {
    return [];
  }
  const roomSet = new Set(candidate.roomIds);
  const overlaps: Array<{ rule: SeasonalRuleRecord; overlapDays: number }> = [];

  // Compare across a 24-month rolling window from candidate.startDate so annual recurrences are detected cleanly
  const windowStart = candidate.startDate;
  const windowEnd = addDaysToDate(candidate.startDate, 730);
  const candidateSpans = expandRuleOccurrencesForWindow(
    {
      startDate: candidate.startDate,
      endDate: candidate.endDate,
      repeatAnnually: candidate.repeatAnnually,
    },
    windowStart,
    windowEnd,
    windowStart
  );

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (candidate.id && rule.id === candidate.id) continue;
    const sharedRoom = Object.keys(rule.roomPrices).some((rid) => roomSet.has(rid));
    if (!sharedRoom) continue;

    const ruleSpans = expandRuleOccurrencesForWindow(
      rule,
      windowStart,
      windowEnd,
      windowStart
    );
    let totalOverlap = 0;
    for (const cs of candidateSpans) {
      for (const rs of ruleSpans) {
        const maxStart = rs.startDate > cs.startDate ? rs.startDate : cs.startDate;
        const minEnd = rs.endDate < cs.endDate ? rs.endDate : cs.endDate;
        if (maxStart <= minEnd) {
          totalOverlap += countRuleDays(maxStart, minEnd);
        }
      }
    }
    if (totalOverlap > 0) {
      overlaps.push({
        rule,
        overlapDays: totalOverlap,
      });
    }
  }
  return overlaps;
}

export type DailyPriceTier = "promo" | "normal" | "high" | "peak";

export interface AnnualMonthSegment {
  startDay: number; // 1..31
  endDay: number; // 1..31
  daysCount: number;
  tier: DailyPriceTier;
  avgPriceThb: number;
  diffPct: number;
  label: string | null;
}

export interface AnnualMonthGaugeItem {
  monthIndex: number; // 0..11
  monthShortTh: string;
  monthFullTh: string;
  daysInMonth: number;
  baselineAvgThb: number;
  effectiveAvgThb: number;
  diffPct: number; // e.g. +24, 0, -15
  status: "peak" | "high" | "promo" | "normal";
  overrideDaysCount: number;
  activeLabels: string[];
  segments: AnnualMonthSegment[];
  tierDays: Record<DailyPriceTier, number>;
}

const TH_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const TH_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/**
 * Computes a 12-month annual pricing gauge for a given year & room scope
 * combining saved active SeasonalRuleRecords + live RoomDateOverrides.
 */
export function computeAnnualPricingGauge({
  year,
  rooms,
  selectedRoomId,
  rules,
  dateOverrides,
}: {
  year: number;
  rooms: ReadonlyArray<{
    id: string;
    weekdayPriceThb: number;
    weekendPriceThb: number;
  }>;
  selectedRoomId: string | "all";
  rules: ReadonlyArray<SeasonalRuleRecord>;
  dateOverrides: ReadonlyArray<{
    roomId: string;
    dateStr: string;
    overridePriceThb: number | null;
    note: string | null;
  }>;
}): AnnualMonthGaugeItem[] {
  const targetRooms =
    selectedRoomId === "all"
      ? rooms
      : rooms.filter((r) => r.id === selectedRoomId);

  if (targetRooms.length === 0) {
    return TH_MONTHS_SHORT.map((shortName, idx) => {
      const daysInMonth = new Date(year, idx + 1, 0).getDate();
      return {
        monthIndex: idx,
        monthShortTh: shortName,
        monthFullTh: TH_MONTHS_FULL[idx],
        daysInMonth,
        baselineAvgThb: 0,
        effectiveAvgThb: 0,
        diffPct: 0,
        status: "normal",
        overrideDaysCount: 0,
        activeLabels: [],
        segments: [
          {
            startDay: 1,
            endDay: daysInMonth,
            daysCount: daysInMonth,
            tier: "normal",
            avgPriceThb: 0,
            diffPct: 0,
            label: null,
          },
        ],
        tierDays: { promo: 0, normal: daysInMonth, high: 0, peak: 0 },
      };
    });
  }

  // Sort active rules via 2-tier priority (longest first -> shorter specific holiday wins; recurring first -> single-year override wins)
  const activeRules = [...rules]
    .filter((r) => r.isActive)
    .sort(compareSeasonalRulePriority);

  // Build override map from live DB overrides
  const overrideMap = new Map<string, { price: number; label: string | null }>();
  for (const ov of dateOverrides) {
    if (ov.overridePriceThb && ov.overridePriceThb > 0) {
      overrideMap.set(`${ov.roomId}:${ov.dateStr}`, {
        price: ov.overridePriceThb,
        label: ov.note?.trim() || null,
      });
    }
  }

  // Overlay active seasonal rules (including repeatAnnually projected cleanly onto future years!)
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  for (const rule of activeRules) {
    const spans = expandRuleOccurrencesForWindow(rule, yearStart, yearEnd);
    if (spans.length === 0) continue;
    const dowSet = new Set(rule.daysOfWeek);

    for (const span of spans) {
      for (const dateStr of listDatesInRange(
        span.startDate,
        addDaysToDate(span.endDate, 1)
      )) {
        const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
        if (!dowSet.has(dow)) continue;
        for (const [rid, price] of Object.entries(rule.roomPrices)) {
          if (price >= 100) {
            overrideMap.set(`${rid}:${dateStr}`, { price, label: rule.name });
          }
        }
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return TH_MONTHS_SHORT.map((shortName, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let baselineSum = 0;
    let effectiveSum = 0;
    let samples = 0;
    let overrideDaysCount = 0;
    const labelsSet = new Set<string>();
    const tierDays: Record<DailyPriceTier, number> = {
      promo: 0,
      normal: 0,
      high: 0,
      peak: 0,
    };

    const dailyRecords: Array<{
      day: number;
      tier: DailyPriceTier;
      baseAvg: number;
      effAvg: number;
      label: string | null;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(monthIndex + 1)}-${pad(d)}`;
      const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
      const isWeekend = dow === 5 || dow === 6;
      let dayHadOverride = false;
      let dayBaseSum = 0;
      let dayEffSum = 0;
      let dayLabel: string | null = null;

      for (const rm of targetRooms) {
        const base = isWeekend ? rm.weekendPriceThb : rm.weekdayPriceThb;
        const ov = overrideMap.get(`${rm.id}:${dateStr}`);
        const eff = ov ? ov.price : base;
        if (ov && eff !== base) {
          dayHadOverride = true;
          if (ov.label) {
            labelsSet.add(ov.label);
            if (!dayLabel) dayLabel = ov.label;
          }
        }
        dayBaseSum += base;
        dayEffSum += eff;
        baselineSum += base;
        effectiveSum += eff;
        samples += 1;
      }

      if (dayHadOverride) overrideDaysCount += 1;

      const dayBaseAvg = dayBaseSum / targetRooms.length;
      const dayEffAvg = dayEffSum / targetRooms.length;
      const dayDiffPct =
        dayBaseAvg > 0
          ? Math.round(((dayEffAvg - dayBaseAvg) / dayBaseAvg) * 100)
          : 0;

      const tier: DailyPriceTier =
        dayDiffPct <= -2
          ? "promo"
          : dayDiffPct >= 30
          ? "peak"
          : dayDiffPct >= 2
          ? "high"
          : "normal";

      tierDays[tier] += 1;
      dailyRecords.push({
        day: d,
        tier,
        baseAvg: dayBaseAvg,
        effAvg: dayEffAvg,
        label: tier === "normal" ? null : dayLabel,
      });
    }

    // Merge consecutive days with identical tier + label into proportional timeline segments
    const segments: AnnualMonthSegment[] = [];
    for (const rec of dailyRecords) {
      const prev = segments[segments.length - 1];
      if (prev && prev.tier === rec.tier && prev.label === rec.label) {
        const nextDays = prev.daysCount + 1;
        // Recompute running average cleanly via dailyRecords slice below
        prev.endDay = rec.day;
        prev.daysCount = nextDays;
      } else {
        segments.push({
          startDay: rec.day,
          endDay: rec.day,
          daysCount: 1,
          tier: rec.tier,
          avgPriceThb: Math.round(rec.effAvg),
          diffPct:
            rec.baseAvg > 0
              ? Math.round(((rec.effAvg - rec.baseAvg) / rec.baseAvg) * 100)
              : 0,
          label: rec.label,
        });
      }
    }

    // Exact segment averages
    for (const seg of segments) {
      let sBase = 0;
      let sEff = 0;
      for (let i = seg.startDay - 1; i < seg.endDay; i++) {
        sBase += dailyRecords[i].baseAvg;
        sEff += dailyRecords[i].effAvg;
      }
      seg.avgPriceThb = Math.round(sEff / seg.daysCount);
      seg.diffPct =
        sBase > 0 ? Math.round(((sEff - sBase) / sBase) * 100) : 0;
    }

    const baselineAvgThb = samples > 0 ? Math.round(baselineSum / samples) : 0;
    const effectiveAvgThb =
      samples > 0 ? Math.round(effectiveSum / samples) : 0;
    const diffPct =
      baselineAvgThb > 0
        ? Math.round(((effectiveAvgThb - baselineAvgThb) / baselineAvgThb) * 100)
        : 0;

    const status: "peak" | "high" | "promo" | "normal" =
      diffPct >= 30
        ? "peak"
        : diffPct >= 2
        ? "high"
        : diffPct <= -2
        ? "promo"
        : "normal";

    return {
      monthIndex,
      monthShortTh: shortName,
      monthFullTh: TH_MONTHS_FULL[monthIndex],
      daysInMonth,
      baselineAvgThb,
      effectiveAvgThb,
      diffPct,
      status,
      overrideDaysCount,
      activeLabels: Array.from(labelsSet),
      segments,
      tierDays,
    };
  });
}
