import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { addDaysToDate, formatDateStr, listDatesInRange } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";
import {
  compareSeasonalRulePriority,
  countRuleDays,
  expandRuleOccurrencesForWindow,
  parseSeasonalRulesJson,
  type SeasonalRuleRecord,
} from "@/lib/seasonalPricing";

const SeasonalRuleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  presetKey: z.string().trim().max(40).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  minNights: z.number().int().min(1).max(30),
  defaultPct: z.number().min(-90).max(500).optional(),
  roomPrices: z.record(z.string(), z.number().int().min(100).max(1000000)),
  isActive: z.boolean(),
  repeatAnnually: z.boolean().optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upsert"),
    hotelSlug: z.string().optional(),
    rule: SeasonalRuleSchema,
  }),
  z.object({
    action: z.literal("toggle"),
    hotelSlug: z.string().optional(),
    ruleId: z.string().trim().min(1),
    isActive: z.boolean(),
    fallbackRule: SeasonalRuleSchema.optional(),
  }),
  z.object({
    action: z.literal("delete"),
    hotelSlug: z.string().optional(),
    ruleId: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("reorder"),
    hotelSlug: z.string().optional(),
    orderedRules: z.array(SeasonalRuleSchema).min(1).max(100),
  }),
]);

// Sync recurring rules across a safe 24-month rolling horizon from today (never altering past dates!)
const ROLLING_HORIZON_DAYS = 730;

function expandRuleDates(
  rule: SeasonalRuleRecord,
  todayStr: string,
  horizonEndStr: string
): string[] {
  if (rule.endDate < rule.startDate) return [];
  if (countRuleDays(rule.startDate, rule.endDate) > 366) {
    throw new Error("ช่วงฤดูกาลต้องไม่เกิน 366 วัน");
  }
  const spans = expandRuleOccurrencesForWindow(
    rule,
    todayStr,
    horizonEndStr,
    todayStr
  );
  if (spans.length === 0) return [];
  const dowSet = new Set(rule.daysOfWeek);
  const out = new Set<string>();
  for (const span of spans) {
    for (const ds of listDatesInRange(
      span.startDate,
      addDaysToDate(span.endDate, 1)
    )) {
      const dow = new Date(`${ds}T00:00:00.000Z`).getUTCDay();
      if (dowSet.has(dow)) out.add(ds);
    }
  }
  return Array.from(out);
}

async function syncSeasonalOverrides({
  hotelId,
  previousRules,
  nextRules,
}: {
  hotelId: string;
  previousRules: SeasonalRuleRecord[];
  nextRules: SeasonalRuleRecord[];
}) {
  const todayStr = formatDateStr(new Date());
  const horizonEndStr = addDaysToDate(todayStr, ROLLING_HORIZON_DAYS);

  const rooms = await prisma.room.findMany({
    where: { hotelId },
    select: { id: true },
  });
  const validRoomIds = new Set(rooms.map((r) => r.id));

  // 1. Collect all future (roomId, dateStr) pairs touched by previous active rules
  const touchedKeys = new Set<string>();
  for (const r of previousRules) {
    if (!r.isActive) continue;
    const dates = expandRuleDates(r, todayStr, horizonEndStr);
    for (const rid of Object.keys(r.roomPrices)) {
      if (!validRoomIds.has(rid)) continue;
      for (const ds of dates) touchedKeys.add(`${rid}|${ds}`);
    }
  }

  // 2. Compute desired final override state from ALL next active rules
  // 2-tier priority:
  //   a) Longest period first -> Shorter specific holiday wins (New Year > High Season)
  //   b) Equal span -> Annual recurring first -> Single-year exception wins!
  const sortedActive = [...nextRules]
    .filter((r) => r.isActive)
    .sort(compareSeasonalRulePriority);

  const desiredMap = new Map<
    string,
    { roomId: string; dateStr: string; price: number; minNights: number; note: string }
  >();

  for (const rule of sortedActive) {
    const dates = expandRuleDates(rule, todayStr, horizonEndStr);
    for (const [rid, price] of Object.entries(rule.roomPrices)) {
      if (!validRoomIds.has(rid) || price < 100) continue;
      for (const ds of dates) {
        const key = `${rid}|${ds}`;
        touchedKeys.add(key);
        desiredMap.set(key, {
          roomId: rid,
          dateStr: ds,
          price,
          minNights: rule.minNights,
          note: rule.name,
        });
      }
    }
  }

  // 3. Build atomic batched Prisma operations (never wiping blockedUnits!)
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const key of touchedKeys) {
    const desired = desiredMap.get(key);
    if (desired) {
      const dateObj = new Date(`${desired.dateStr}T00:00:00.000Z`);
      ops.push(
        prisma.roomDateOverride.upsert({
          where: {
            roomId_date: { roomId: desired.roomId, date: dateObj },
          },
          update: {
            overridePriceThb: desired.price,
            minNights: desired.minNights,
            note: desired.note,
          },
          create: {
            roomId: desired.roomId,
            date: dateObj,
            blockedUnits: 0,
            overridePriceThb: desired.price,
            minNights: desired.minNights,
            note: desired.note,
          },
        })
      );
    } else {
      // Clear seasonal price/note on deactivated dates while preserving any manual blockedUnits
      const [roomId, dateStr] = key.split("|");
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
      ops.push(
        prisma.roomDateOverride.updateMany({
          where: { roomId, date: dateObj },
          data: {
            overridePriceThb: null,
            minNights: 1,
            note: null,
          },
        })
      );
    }
  }

  const CHUNK_SIZE = 100;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    await prisma.$transaction(ops.slice(i, i + CHUNK_SIZE));
  }
}

async function readHotelSeasonalRulesJson(hotelId: string): Promise<unknown> {
  try {
    const row = await prisma.hotel.findUniqueOrThrow({
      where: { id: hotelId },
      select: { id: true, seasonalRulesJson: true },
    });
    return row.seasonalRulesJson;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("seasonalRulesJson")) throw err;
    const rows = await prisma.$queryRaw<Array<{ seasonalRulesJson: unknown }>>`
      SELECT "seasonalRulesJson" FROM "Hotel" WHERE "id" = ${hotelId} LIMIT 1
    `;
    return rows[0]?.seasonalRulesJson ?? null;
  }
}

async function writeHotelSeasonalRulesJson(
  hotelId: string,
  nextRules: SeasonalRuleRecord[]
): Promise<void> {
  try {
    await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        seasonalRulesJson: nextRules as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("seasonalRulesJson")) throw err;
    const jsonText = JSON.stringify(nextRules);
    await prisma.$executeRaw`
      UPDATE "Hotel"
      SET "seasonalRulesJson" = ${jsonText}::jsonb, "updatedAt" = NOW()
      WHERE "id" = ${hotelId}
    `;
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลช่วงฤดูกาลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const storedJson = await readHotelSeasonalRulesJson(hotel.id);

    const previousRules = parseSeasonalRulesJson(storedJson);
    let nextRules: SeasonalRuleRecord[] = [...previousRules];

    if (parsed.data.action === "upsert") {
      const rule = parsed.data.rule;
      if (rule.endDate < rule.startDate) {
        return NextResponse.json(
          { error: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น" },
          { status: 422 }
        );
      }
      if (countRuleDays(rule.startDate, rule.endDate) > 366) {
        return NextResponse.json(
          { error: "ช่วงฤดูกาลต้องไม่เกิน 366 วัน" },
          { status: 422 }
        );
      }
      const existingIdx = nextRules.findIndex((r) => r.id === rule.id);
      if (existingIdx >= 0) {
        nextRules[existingIdx] = rule;
      } else {
        nextRules.push(rule);
      }
    } else if (parsed.data.action === "toggle") {
      const { ruleId, isActive, fallbackRule } = parsed.data;
      const existingIdx = nextRules.findIndex((r) => r.id === ruleId);
      if (existingIdx >= 0) {
        nextRules[existingIdx] = { ...nextRules[existingIdx], isActive };
      } else if (fallbackRule) {
        nextRules.push({ ...fallbackRule, isActive });
      } else {
        return NextResponse.json(
          { error: "ไม่พบช่วงราคาฤดูกาลนี้" },
          { status: 404 }
        );
      }
    } else if (parsed.data.action === "delete") {
      const targetRuleId = parsed.data.ruleId;
      nextRules = nextRules.filter((r) => r.id !== targetRuleId);
    } else if (parsed.data.action === "reorder") {
      // Pure visual reordering — preserve authoritative server fields when rule exists, save exact new order
      const prevById = new Map(previousRules.map((r) => [r.id, r]));
      const seen = new Set<string>();
      const reordered: SeasonalRuleRecord[] = [];
      for (const incoming of parsed.data.orderedRules) {
        if (seen.has(incoming.id)) continue;
        seen.add(incoming.id);
        reordered.push(prevById.get(incoming.id) ?? incoming);
      }
      for (const existing of previousRules) {
        if (!seen.has(existing.id)) {
          reordered.push(existing);
        }
      }
      await writeHotelSeasonalRulesJson(hotel.id, reordered);
      return NextResponse.json({
        rules: reordered,
        reordered: true,
      });
    }

    await writeHotelSeasonalRulesJson(hotel.id, nextRules);

    await syncSeasonalOverrides({
      hotelId: hotel.id,
      previousRules,
      nextRules,
    });

    return NextResponse.json({
      rules: nextRules,
      synced: true,
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[POST /api/studio/seasonal-rules]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "ไม่สามารถบันทึกช่วงราคาตามฤดูกาลได้",
      },
      { status: 400 }
    );
  }
}
