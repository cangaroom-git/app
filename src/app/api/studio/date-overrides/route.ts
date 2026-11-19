import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { addDaysToDate } from "@/lib/bookingMath";
import { prisma } from "@/lib/prisma";

const SingleOverrideSchema = z.object({
  hotelSlug: z.string().optional(),
  roomId: z.string().trim().min(1),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  blockedUnits: z.number().int().min(0).max(999).optional(),
  overridePriceThb: z.number().int().min(100).max(1000000).optional().nullable(),
  minNights: z.number().int().min(1).max(30).optional().nullable(),
  note: z.string().trim().max(120).optional().nullable(),
});

const BulkOverrideSchema = z.object({
  hotelSlug: z.string().optional(),
  roomIds: z.array(z.string().trim().min(1)).min(1).max(30),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  blockedUnits: z.number().int().min(0).max(999).optional(),
  overridePriceThb: z.number().int().min(100).max(1000000).optional().nullable(),
  roomPrices: z
    .record(z.string(), z.number().int().min(100).max(1000000).nullable())
    .optional(),
  clearPriceOverride: z.boolean().optional(),
  minNights: z.number().int().min(1).max(30).optional().nullable(),
  note: z.string().trim().max(120).optional().nullable(),
  resetAll: z.boolean().optional(),
});

function buildInclusiveDateRange(
  startDate: string,
  endDate: string,
  daysOfWeek?: number[]
): string[] {
  const result: string[] = [];
  if (startDate > endDate) return result;
  const dayFilter =
    daysOfWeek && daysOfWeek.length > 0 ? new Set(daysOfWeek) : null;
  let cursor = startDate;
  for (let i = 0; i < 366; i++) {
    if (cursor > endDate) break;
    if (!dayFilter) {
      result.push(cursor);
    } else {
      const dow = new Date(`${cursor}T00:00:00`).getDay();
      if (dayFilter.has(dow)) result.push(cursor);
    }
    cursor = addDaysToDate(cursor, 1);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();

    // Mode 1: Bulk Date-Range Upsert (Occasional / Seasonal Pricing & Bulk Allotment)
    if (Array.isArray(raw?.roomIds) && raw?.startDate && raw?.endDate) {
      const parsed = BulkOverrideSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "ข้อมูลช่วงวันที่ไม่ถูกต้อง" },
          { status: 422 }
        );
      }

      const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
      const validRooms = await prisma.room.findMany({
        where: { id: { in: parsed.data.roomIds }, hotelId: hotel.id },
        select: { id: true, totalUnits: true },
      });
      if (validRooms.length === 0) {
        return NextResponse.json({ error: "ไม่พบห้องพักที่เลือก" }, { status: 404 });
      }

      const targetDates = buildInclusiveDateRange(
        parsed.data.startDate,
        parsed.data.endDate,
        parsed.data.daysOfWeek
      );
      if (targetDates.length === 0) {
        return NextResponse.json(
          { error: "ไม่พบวันที่ตรงตามเงื่อนไขในช่วงที่เลือก" },
          { status: 422 }
        );
      }

      const dateObjs = targetDates.map((d) => new Date(`${d}T00:00:00.000Z`));

      if (parsed.data.resetAll) {
        const del = await prisma.roomDateOverride.deleteMany({
          where: {
            roomId: { in: validRooms.map((r) => r.id) },
            date: { in: dateObjs },
          },
        });
        return NextResponse.json({ updatedCount: del.count, reset: true });
      }

      const ops: Array<ReturnType<typeof prisma.roomDateOverride.upsert>> = [];
      for (const rm of validRooms) {
        const clampedBlocked =
          parsed.data.blockedUnits !== undefined
            ? Math.min(rm.totalUnits, Math.max(0, parsed.data.blockedUnits))
            : undefined;
        const perRoomPrice =
          parsed.data.roomPrices && rm.id in parsed.data.roomPrices
            ? parsed.data.roomPrices[rm.id]
            : undefined;
        const resolvedPrice =
          perRoomPrice !== undefined
            ? perRoomPrice
            : parsed.data.overridePriceThb;

        for (const dateObj of dateObjs) {
          const updateFields: Record<string, unknown> = {};
          if (clampedBlocked !== undefined) {
            updateFields.blockedUnits = clampedBlocked;
          }
          if (parsed.data.clearPriceOverride) {
            updateFields.overridePriceThb = null;
          } else if (resolvedPrice !== undefined) {
            updateFields.overridePriceThb = resolvedPrice;
          }
          if (parsed.data.minNights !== undefined) {
            updateFields.minNights = parsed.data.minNights ?? 1;
          }
          if (parsed.data.note !== undefined) {
            updateFields.note = parsed.data.note;
          }

          ops.push(
            prisma.roomDateOverride.upsert({
              where: { roomId_date: { roomId: rm.id, date: dateObj } },
              update: updateFields,
              create: {
                roomId: rm.id,
                date: dateObj,
                blockedUnits: clampedBlocked ?? 0,
                overridePriceThb: parsed.data.clearPriceOverride
                  ? null
                  : resolvedPrice ?? null,
                minNights: parsed.data.minNights ?? 1,
                note: parsed.data.note ?? null,
              },
            })
          );
        }
      }

      // Execute in chunks of 100 to stay fast and safe on large seasonal spans
      for (let i = 0; i < ops.length; i += 100) {
        await prisma.$transaction(ops.slice(i, i + 100));
      }
      return NextResponse.json({ updatedCount: ops.length });
    }

    // Mode 2: Single-Date Upsert (backward-compatible)
    const parsed = SingleOverrideSchema.safeParse(raw);
    const resolvedDateStr = parsed.success
      ? parsed.data.dateStr || parsed.data.date
      : null;
    if (!parsed.success || !resolvedDateStr) {
      return NextResponse.json({ error: "ข้อมูลวันที่ไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const room = await prisma.room.findFirst({
      where: { id: parsed.data.roomId, hotelId: hotel.id },
      select: { id: true, totalUnits: true },
    });
    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้องพัก" }, { status: 404 });
    }

    const dateObj = new Date(`${resolvedDateStr}T00:00:00.000Z`);
    const clampedBlocked =
      parsed.data.blockedUnits !== undefined
        ? Math.min(room.totalUnits, Math.max(0, parsed.data.blockedUnits))
        : undefined;

    const override = await prisma.roomDateOverride.upsert({
      where: {
        roomId_date: { roomId: room.id, date: dateObj },
      },
      update: {
        ...(clampedBlocked !== undefined ? { blockedUnits: clampedBlocked } : {}),
        ...(parsed.data.overridePriceThb !== undefined
          ? { overridePriceThb: parsed.data.overridePriceThb }
          : {}),
        ...(parsed.data.minNights !== undefined
          ? { minNights: parsed.data.minNights ?? 1 }
          : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      },
      create: {
        roomId: room.id,
        date: dateObj,
        blockedUnits: clampedBlocked ?? 0,
        overridePriceThb: parsed.data.overridePriceThb ?? null,
        minNights: parsed.data.minNights ?? 1,
        note: parsed.data.note ?? null,
      },
    });

    return NextResponse.json({ override });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/studio/date-overrides]", err);
    return NextResponse.json({ error: "บันทึกวันที่ไม่สำเร็จ" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const hotelSlug = url.searchParams.get("hotel");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { hotel } = await requireHotelStudioAccess(hotelSlug);
    await prisma.roomDateOverride.deleteMany({
      where: { id, room: { hotelId: hotel.id } },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "ลบรายการไม่สำเร็จ" }, { status: 400 });
  }
}
