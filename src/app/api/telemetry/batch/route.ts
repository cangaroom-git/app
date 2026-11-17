import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/auth/session";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  PDPA_RETENTION_DAYS,
  TelemetryBatchPayloadSchema,
  type TelemetrySingleEventInput,
} from "@/lib/telemetry/tasteTypes";

function computeRetentionExpiry(): Date {
  return new Date(Date.now() + PDPA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function parseWeightRecord(val: Prisma.JsonValue | null): Record<string, number> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  return out;
}

function computeEventTasteWeight(ev: TelemetrySingleEventInput): number {
  switch (ev.eventType) {
    case "PIN_SAVE":
      return 6.0;
    case "COUPON_CLAIM":
      return 6.0;
    case "BOOKING_INITIATE":
      return 7.5;
    case "ROOM_CALENDAR_SELECT":
      return 5.5;
    case "HOTEL_PROFILE_VIEW":
      return 4.5;
    case "PIN_SHARE":
      return 4.5;
    case "PIN_LIKE":
      return 3.5;
    case "MEDIA_EXPAND":
      return 2.2;
    case "CAROUSEL_SWIPE":
      return Math.min(3.0, 1.0 + (ev.carouselDepth ?? 2) * 0.45);
    case "VIDEO_PROGRESS":
      return 2.0;
    case "PIN_DWELL": {
      const ms = ev.dwellMs ?? 0;
      if (ms < 1500) return -0.4; // Quick bounce / accidental tap
      if (ms < 4500) return 1.0;
      if (ms < 12000) return 2.8;
      return 4.5; // Deep 12s+ engagement
    }
    case "PIN_OPEN":
      return 0.8;
    default:
      return 0;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = TelemetryBatchPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "รูปแบบข้อมูล Telemetry ไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { sessionId, viewportBucket, lang, theme, events } = parsed.data;

    // 1. Anonymous aggregate view count increment on PIN_OPEN (non-personal, PDPA-exempt)
    const openedPinIds = Array.from(
      new Set(
        events
          .filter((e) => e.eventType === "PIN_OPEN" && e.pinId)
          .map((e) => e.pinId as string)
      )
    );
    if (openedPinIds.length > 0) {
      await prisma.pin
        .updateMany({
          where: { id: { in: openedPinIds } },
          data: { viewsCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    // 2. Strict PDPA Consent Gate: Only persist personal telemetry & taste profile if user consented to "analytics"
    const cookieStore = await cookies();
    const consent = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
    const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value;

    if (consent !== "analytics" || !visitorId || visitorId.length < 12) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        reason: "consent_not_granted",
      });
    }

    const sessionUser = await getServerSessionUser();
    const coarse = inferCoarseContextFromHeaders(request.headers);
    const now = new Date();
    const expiresAt = computeRetentionExpiry();

    // 3. Persist validated TelemetryEvent batch
    await prisma.telemetryEvent.createMany({
      data: events.map((ev) => ({
        visitorId,
        userId: sessionUser?.id ?? null,
        sessionId,
        eventType: ev.eventType,
        pinId: ev.pinId ?? null,
        hotelId: ev.hotelId ?? null,
        provinceId: ev.provinceId ?? null,
        originProvinceId: coarse.provinceId,
        deviceType: coarse.deviceType,
        dwellMs: ev.dwellMs ?? null,
        carouselDepth: ev.carouselDepth ?? null,
        metadataJson: {
          ...(ev.stayStyles ? { stayStyles: ev.stayStyles } : {}),
          ...(ev.priceThb ? { priceThb: ev.priceThb } : {}),
          ...(ev.guests ? { guests: ev.guests } : {}),
          ...(ev.styleTab ? { styleTab: ev.styleTab } : {}),
          ...(ev.referrerHost ? { referrerHost: ev.referrerHost } : {}),
        },
        expiresAt,
      })),
    });

    // 4. Update O(1) VisitorTasteProfile weights (with mild 0.985 decay to keep recent interests fresh)
    const existingProfile = await prisma.visitorTasteProfile.findFirst({
      where: sessionUser?.id
        ? {
            OR: [{ userId: sessionUser.id }, { visitorId }],
          }
        : { visitorId },
    });

    const styleWeights = parseWeightRecord(
      existingProfile?.styleWeightsJson ?? null
    );
    const provinceWeights = parseWeightRecord(
      existingProfile?.provinceWeightsJson ?? null
    );
    const tagWeights = parseWeightRecord(existingProfile?.tagWeightsJson ?? null);

    // Subtle exponential time decay so evolving travel intent adapts naturally
    for (const k of Object.keys(styleWeights)) styleWeights[k] *= 0.985;
    for (const k of Object.keys(provinceWeights)) provinceWeights[k] *= 0.985;
    for (const k of Object.keys(tagWeights)) tagWeights[k] *= 0.985;

    let priceSum = (existingProfile?.priceSumWeighted ?? 0) * 0.97;
    let priceWeight = (existingProfile?.priceWeightTotal ?? 0) * 0.97;
    let preferredGuests = existingProfile?.preferredGuests ?? 2;
    let addOpens = 0;
    let addDwellSec = 0;

    const viewedSet = new Set<string>(existingProfile?.recentViewedPinIds ?? []);
    const skippedSet = new Set<string>(
      existingProfile?.recentSkippedPinIds ?? []
    );
    const batchImpressionCounts: Record<string, number> = {};

    for (const ev of events) {
      if (ev.eventType === "PIN_IMPRESSION" && ev.pinId) {
        batchImpressionCounts[ev.pinId] =
          (batchImpressionCounts[ev.pinId] ?? 0) + 1;
      }

      if (ev.eventType === "PIN_OPEN" && ev.pinId) {
        addOpens += 1;
        viewedSet.delete(ev.pinId);
        viewedSet.add(ev.pinId);
        skippedSet.delete(ev.pinId);
      }

      if (ev.eventType === "PIN_DWELL") {
        const sec = Math.round((ev.dwellMs ?? 0) / 1000);
        if (sec > 0) addDwellSec += Math.min(300, sec);
        if ((ev.dwellMs ?? 0) > 0 && (ev.dwellMs ?? 0) < 1400 && ev.pinId) {
          skippedSet.add(ev.pinId);
        }
      }

      if (ev.guests && ev.guests >= 1) {
        preferredGuests = ev.guests;
      }

      const w = computeEventTasteWeight(ev);
      if (w !== 0) {
        if (ev.stayStyles) {
          for (const st of ev.stayStyles) {
            styleWeights[st] = Math.max(0, (styleWeights[st] ?? 0) + w);
          }
        }
        if (ev.provinceId) {
          provinceWeights[ev.provinceId] = Math.max(
            0,
            (provinceWeights[ev.provinceId] ?? 0) + w * 0.85
          );
        }
        if (ev.semanticTags) {
          for (const tag of ev.semanticTags) {
            tagWeights[tag] = Math.max(0, (tagWeights[tag] ?? 0) + w * 0.65);
          }
        }
        if (w > 0 && ev.priceThb && ev.priceThb > 0) {
          priceSum += ev.priceThb * w;
          priceWeight += w;
        }
      }
    }

    for (const [impPinId, cnt] of Object.entries(batchImpressionCounts)) {
      if (cnt >= 3 && !viewedSet.has(impPinId)) {
        skippedSet.add(impPinId);
      }
    }

    // Cap JSON maps & ring buffers so row size stays tiny & fast forever
    const capRecord = (rec: Record<string, number>, limit: number) =>
      Object.fromEntries(
        Object.entries(rec)
          .filter(([, v]) => v >= 0.15)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([k, v]) => [k, Math.round(v * 100) / 100])
      );

    const cappedViewed = Array.from(viewedSet).slice(-30);
    const cappedSkipped = Array.from(skippedSet)
      .filter((id) => !viewedSet.has(id))
      .slice(-30);

    const targetVid = existingProfile?.visitorId ?? visitorId;

    await prisma.visitorTasteProfile.upsert({
      where: { visitorId: targetVid },
      create: {
        visitorId: targetVid,
        userId: sessionUser?.id ?? null,
        consentLevel: "ANALYTICS",
        inferredProvinceId: coarse.provinceId,
        inferredRegion: coarse.region,
        deviceType: coarse.deviceType,
        osFamily: coarse.osFamily,
        viewportBucket: viewportBucket ?? "lg",
        preferredLang: lang ?? "th",
        preferredTheme: theme ?? "light",
        styleWeightsJson: capRecord(styleWeights, 12),
        provinceWeightsJson: capRecord(provinceWeights, 15),
        tagWeightsJson: capRecord(tagWeights, 25),
        priceSumWeighted: Math.round(priceSum),
        priceWeightTotal: Math.round(priceWeight * 100) / 100,
        preferredGuests,
        recentViewedPinIds: cappedViewed,
        recentSkippedPinIds: cappedSkipped,
        totalPinOpens: addOpens,
        totalDwellSec: addDwellSec,
        lastActiveAt: now,
        expiresAt,
      },
      update: {
        ...(sessionUser?.id && !existingProfile?.userId
          ? { userId: sessionUser.id }
          : {}),
        ...(coarse.provinceId ? { inferredProvinceId: coarse.provinceId } : {}),
        ...(coarse.region ? { inferredRegion: coarse.region } : {}),
        deviceType: coarse.deviceType,
        osFamily: coarse.osFamily,
        ...(viewportBucket ? { viewportBucket } : {}),
        ...(lang ? { preferredLang: lang } : {}),
        ...(theme ? { preferredTheme: theme } : {}),
        styleWeightsJson: capRecord(styleWeights, 12),
        provinceWeightsJson: capRecord(provinceWeights, 15),
        tagWeightsJson: capRecord(tagWeights, 25),
        priceSumWeighted: Math.round(priceSum),
        priceWeightTotal: Math.round(priceWeight * 100) / 100,
        preferredGuests,
        recentViewedPinIds: cappedViewed,
        recentSkippedPinIds: cappedSkipped,
        totalPinOpens: { increment: addOpens },
        totalDwellSec: { increment: addDwellSec },
        lastActiveAt: now,
        expiresAt,
      },
    });

    // 5. Opportunistic PDPA 180-day TTL purge (2% sampling, non-blocking)
    if (Math.random() < 0.02) {
      Promise.all([
        prisma.telemetryEvent.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.visitorTasteProfile.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
      ]).catch(() => {});
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.error("[POST /api/telemetry/batch]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

