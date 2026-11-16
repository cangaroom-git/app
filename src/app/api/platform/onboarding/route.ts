import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensurePlatformTables,
  getAuthenticatedServerUser,
  mapTenantRow,
} from "@/lib/db";
import {
  INITIAL_EXTRA_ADDONS,
  INITIAL_PROMO_COUPONS,
  INITIAL_PROPERTY_CONFIG,
  INITIAL_RESORT_EXPERIENCES,
  INITIAL_SAPAN_ROOMS,
  INITIAL_SEASONAL_RATES,
  INITIAL_SPECIAL_DATE_OVERRIDES,
} from "@/data/rooms";
import { INITIAL_SITE_CMS_CONTENT } from "@/data/cmsDefaults";

const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "super-admin",
  "login",
  "register-hotel",
  "booking",
  "shorts",
  "deal",
  "review",
  "guide",
  "mail",
  "ftp",
  "cdn",
  "auth",
  "cangaroom",
  "default",
]);

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

const OnboardingSchema = z.object({
  nameTh: z.string().trim().min(2, "กรุณาระบุชื่อที่พัก").max(100),
  nameEn: z.string().trim().max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(3, "ชื่อซับโดเมนต้องมีอย่างน้อย 3 ตัวอักษร (a-z, 0-9)")
    .max(32),
  ownerPhone: z.string().trim().max(30).optional(),
  ownerLine: z.string().trim().max(50).optional(),
  locationTh: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawSlug = url.searchParams.get("slug") || "";
  const slug = normalizeSlug(rawSlug);

  if (!slug || slug.length < 3) {
    return NextResponse.json({
      available: false,
      slug,
      reason: "ต้องมีความยาวอย่างน้อย 3 ตัวอักษรภาษาอังกฤษหรือตัวเลข",
    });
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({
      available: false,
      slug,
      reason: "ชื่อนี้ถูกสงวนไว้สำหรับระบบ",
    });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ available: true, slug });
  }

  const existing = await pool.query(
    `SELECT 1 FROM public.platform_tenants WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  return NextResponse.json({
    available: existing.rowCount === 0,
    slug,
    subdomain: `${slug}.cangaroom.com`,
    reason:
      existing.rowCount === 0 ? null : "ซับโดเมนนี้มีที่พักอื่นใช้งานแล้ว",
  });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedServerUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบด้วย Gmail ก่อนสร้างเว็บไซต์ที่พัก" },
        { status: 401 }
      );
    }

    const pool = await ensurePlatformTables();
    if (!pool) {
      return NextResponse.json(
        { error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้" },
        { status: 503 }
      );
    }

    const rawBody = await request.json();
    const parsed = OnboardingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "กรุณากรอกข้อมูลให้ครบถ้วน",
        },
        { status: 422 }
      );
    }

    const slug = normalizeSlug(parsed.data.slug);
    if (slug.length < 3 || RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: "ชื่อซับโดเมนนี้ไม่สามารถใช้งานได้ กรุณาเลือกชื่ออื่น" },
        { status: 422 }
      );
    }

    const duplicate = await pool.query(
      `SELECT 1 FROM public.platform_tenants WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `${slug}.cangaroom.com มีผู้ใช้งานแล้ว กรุณาเลือกชื่ออื่น` },
        { status: 409 }
      );
    }

    const nameTh = parsed.data.nameTh;
    const nameEn = parsed.data.nameEn?.trim() || nameTh;
    const ownerPhone = parsed.data.ownerPhone?.trim() || "";
    const ownerLine = parsed.data.ownerLine?.trim() || `@${slug}`;
    const locationTh =
      parsed.data.locationTh?.trim() || "ประเทศไทย";
    const brandCode = slug.slice(0, 2).toUpperCase();
    const tenantId = `ten-${Date.now()}`;

    const insertRes = await pool.query(
      `INSERT INTO public.platform_tenants (
        id, slug, name_th, name_en, custom_domain,
        owner_email, owner_phone, owner_line,
        status, plan_price_thb, trial_started_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, '',
        $5, $6, $7,
        'TRIAL', 12000, NOW(), NOW() + INTERVAL '30 days'
      ) RETURNING *`,
      [
        tenantId,
        slug,
        nameTh,
        nameEn,
        sessionUser.email,
        ownerPhone,
        ownerLine,
      ]
    );

    // Grant HOTEL_ADMIN role (unless user is already SUPER_ADMIN)
    const nextRole =
      sessionUser.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "HOTEL_ADMIN";

    await pool.query(
      `INSERT INTO public.platform_user_roles (email, role, tenant_slug, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE
       SET role = EXCLUDED.role,
           tenant_slug = EXCLUDED.tenant_slug,
           updated_at = NOW()`,
      [sessionUser.email, nextRole, slug]
    );

    // Seed isolated CMS store for this new trial hotel
    const starterStore = {
      propertyConfig: {
        ...INITIAL_PROPERTY_CONFIG,
        brandCode,
        nameTh,
        nameEn,
        locationTh,
        locationEn: locationTh,
        phones: ownerPhone ? [ownerPhone] : INITIAL_PROPERTY_CONFIG.phones,
        lineId: ownerLine,
        email: sessionUser.email,
        subdomainSlug: slug,
        customDomain: "",
      },
      rooms: INITIAL_SAPAN_ROOMS.slice(0, 2),
      seasonalRates: INITIAL_SEASONAL_RATES,
      specialDateRates: INITIAL_SPECIAL_DATE_OVERRIDES,
      addons: INITIAL_EXTRA_ADDONS,
      coupons: INITIAL_PROMO_COUPONS,
      experiences: INITIAL_RESORT_EXPERIENCES,
      bookings: [],
      cms: {
        ...INITIAL_SITE_CMS_CONTENT,
        home: {
          ...INITIAL_SITE_CMS_CONTENT.home,
          heroLocationTh: locationTh,
          heroLocationEn: locationTh,
          manifestoTitleTh: `ยินดีต้อนรับสู่ ${nameTh}`,
          manifestoTitleEn: `Welcome to ${nameEn}`,
        },
        bookingPage: {
          ...INITIAL_SITE_CMS_CONTENT.bookingPage,
          locationLabelTh: locationTh,
          locationLabelEn: locationTh,
        },
      },
    };

    await pool.query(
      `INSERT INTO public.site_cms_state (id, payload, "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [`tenant:${slug}`, JSON.stringify(starterStore)]
    );

    return NextResponse.json({
      ok: true,
      tenant: mapTenantRow(insertRes.rows[0]),
    });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างที่พัก กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

