import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSessionUser } from "@/lib/auth/session";
import { inferCoarseContextFromHeaders } from "@/lib/telemetry/geoHeaders";
import {
  CGR_CONSENT_COOKIE,
  CGR_VISITOR_COOKIE,
  ConsentRequestSchema,
  PDPA_COOKIE_MAX_AGE_SEC,
  PDPA_RETENTION_DAYS,
} from "@/lib/telemetry/tasteTypes";

function computeRetentionExpiry(): Date {
  return new Date(Date.now() + PDPA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consentCookie = cookieStore.get(CGR_CONSENT_COOKIE)?.value;
    const visitorId = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const sessionUser = await getServerSessionUser();

    const status: "analytics" | "essential" | "unset" =
      consentCookie === "analytics" || consentCookie === "essential"
        ? consentCookie
        : "unset";

    let summary: {
      hasProfile: boolean;
      inferredProvinceId: string | null;
      topStyles: string[];
      totalPinOpens: number;
    } = {
      hasProfile: false,
      inferredProvinceId: null,
      topStyles: [],
      totalPinOpens: 0,
    };

    if (status === "analytics" && (visitorId || sessionUser?.id)) {
      const profile = await prisma.visitorTasteProfile.findFirst({
        where: sessionUser?.id
          ? {
              OR: [
                { userId: sessionUser.id },
                ...(visitorId ? [{ visitorId }] : []),
              ],
            }
          : { visitorId: visitorId! },
      });

      if (profile) {
        const styleMap =
          profile.styleWeightsJson &&
          typeof profile.styleWeightsJson === "object" &&
          !Array.isArray(profile.styleWeightsJson)
            ? (profile.styleWeightsJson as Record<string, number>)
            : {};
        const topStyles = Object.entries(styleMap)
          .filter(([, v]) => typeof v === "number" && v > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k);

        summary = {
          hasProfile: true,
          inferredProvinceId: profile.inferredProvinceId,
          topStyles,
          totalPinOpens: profile.totalPinOpens,
        };
      }
    }

    return NextResponse.json({ status, summary });
  } catch (err) {
    console.error("[GET /api/telemetry/consent]", err);
    return NextResponse.json({ status: "unset", summary: null });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = ConsentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "รูปแบบข้อมูลการตั้งค่าคุกกี้ไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const { consent, preferredLang, preferredTheme, viewportBucket } =
      parsed.data;
    const cookieStore = await cookies();
    const existingVid = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const sessionUser = await getServerSessionUser();
    const isProd = process.env.NODE_ENV === "production";

    if (consent === "essential") {
      if (existingVid || sessionUser?.id) {
        const orFilters = [
          ...(existingVid ? [{ visitorId: existingVid }] : []),
          ...(sessionUser?.id ? [{ userId: sessionUser.id }] : []),
        ];
        await Promise.all([
          prisma.telemetryEvent.deleteMany({ where: { OR: orFilters } }),
          prisma.visitorTasteProfile.deleteMany({ where: { OR: orFilters } }),
        ]);
      }

      const res = NextResponse.json({ ok: true, consent: "essential" });
      res.cookies.set(CGR_CONSENT_COOKIE, "essential", {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: PDPA_COOKIE_MAX_AGE_SEC,
      });
      res.cookies.set(CGR_VISITOR_COOKIE, "", {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const visitorId =
      existingVid && existingVid.length >= 12
        ? existingVid
        : crypto.randomUUID();
    const coarse = inferCoarseContextFromHeaders(request.headers);
    const expiresAt = computeRetentionExpiry();

    const existingUserProfile = sessionUser?.id
      ? await prisma.visitorTasteProfile.findUnique({
          where: { userId: sessionUser.id },
        })
      : null;

    const effectiveVisitorId = existingUserProfile
      ? existingUserProfile.visitorId
      : visitorId;

    await prisma.visitorTasteProfile.upsert({
      where: { visitorId: effectiveVisitorId },
      create: {
        visitorId: effectiveVisitorId,
        userId: sessionUser?.id ?? null,
        consentLevel: "ANALYTICS",
        consentUpdatedAt: new Date(),
        inferredProvinceId: coarse.provinceId,
        inferredRegion: coarse.region,
        deviceType: coarse.deviceType,
        osFamily: coarse.osFamily,
        viewportBucket: viewportBucket ?? "lg",
        preferredLang: preferredLang ?? "th",
        preferredTheme: preferredTheme ?? "light",
        expiresAt,
      },
      update: {
        ...(sessionUser?.id && !existingUserProfile
          ? { userId: sessionUser.id }
          : {}),
        consentLevel: "ANALYTICS",
        consentUpdatedAt: new Date(),
        ...(coarse.provinceId ? { inferredProvinceId: coarse.provinceId } : {}),
        ...(coarse.region ? { inferredRegion: coarse.region } : {}),
        deviceType: coarse.deviceType,
        osFamily: coarse.osFamily,
        ...(viewportBucket ? { viewportBucket } : {}),
        ...(preferredLang ? { preferredLang } : {}),
        ...(preferredTheme ? { preferredTheme } : {}),
        lastActiveAt: new Date(),
        expiresAt,
      },
    });

    const res = NextResponse.json({ ok: true, consent: "analytics" });
    res.cookies.set(CGR_CONSENT_COOKIE, "analytics", {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: PDPA_COOKIE_MAX_AGE_SEC,
    });
    res.cookies.set(CGR_VISITOR_COOKIE, effectiveVisitorId, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: PDPA_COOKIE_MAX_AGE_SEC,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/telemetry/consent]", err);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการตั้งค่าความเป็นส่วนตัวได้" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const existingVid = cookieStore.get(CGR_VISITOR_COOKIE)?.value ?? null;
    const sessionUser = await getServerSessionUser();
    const isProd = process.env.NODE_ENV === "production";

    if (existingVid || sessionUser?.id) {
      const orFilters = [
        ...(existingVid ? [{ visitorId: existingVid }] : []),
        ...(sessionUser?.id ? [{ userId: sessionUser.id }] : []),
      ];
      await Promise.all([
        prisma.telemetryEvent.deleteMany({ where: { OR: orFilters } }),
        prisma.visitorTasteProfile.deleteMany({ where: { OR: orFilters } }),
      ]);
    }

    const res = NextResponse.json({ erased: true });
    res.cookies.set(CGR_VISITOR_COOKIE, "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("[DELETE /api/telemetry/consent]", err);
    return NextResponse.json(
      { error: "ไม่สามารถล้างข้อมูลความสนใจได้" },
      { status: 500 }
    );
  }
}

