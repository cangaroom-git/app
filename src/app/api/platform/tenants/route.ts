import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensurePlatformTables,
  getAuthenticatedServerUser,
  mapTenantRow,
} from "@/lib/db";

async function requireSuperAdmin() {
  const user = await getAuthenticatedServerUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return null;
  }
  return user;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ tenants: [] });
  }

  const res = await pool.query(
    `SELECT * FROM public.platform_tenants ORDER BY created_at DESC`
  );

  return NextResponse.json({
    tenants: res.rows.map(mapTenantRow),
  });
}

const CreateTenantSchema = z.object({
  nameTh: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(3).max(32),
  customDomain: z.string().trim().max(120).optional(),
  ownerEmail: z.string().trim().email().max(120),
  ownerPhone: z.string().trim().max(30).optional(),
  ownerLine: z.string().trim().max(50).optional(),
  status: z.enum(["TRIAL", "ACTIVE"]).optional(),
});

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = CreateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วนหรือรูปแบบอีเมลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const slug = parsed.data.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    const status = parsed.data.status || "TRIAL";
    const days = status === "ACTIVE" ? 365 : 30;
    const ownerEmail = parsed.data.ownerEmail.toLowerCase();

    const insertRes = await pool.query(
      `INSERT INTO public.platform_tenants (
        id, slug, name_th, name_en, custom_domain,
        owner_email, owner_phone, owner_line,
        status, plan_price_thb, trial_started_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, 12000, NOW(), NOW() + ($10 || ' days')::interval
      ) RETURNING *`,
      [
        `ten-${Date.now()}`,
        slug,
        parsed.data.nameTh,
        parsed.data.nameTh,
        parsed.data.customDomain?.trim() || "",
        ownerEmail,
        parsed.data.ownerPhone?.trim() || "",
        parsed.data.ownerLine?.trim() || `@${slug}`,
        status,
        String(days),
      ]
    );

    if (ownerEmail !== "cangaroomapp@gmail.com") {
      await pool.query(
        `INSERT INTO public.platform_user_roles (email, role, tenant_slug, updated_at)
         VALUES ($1, 'HOTEL_ADMIN', $2, NOW())
         ON CONFLICT (email) DO UPDATE
         SET role = CASE WHEN public.platform_user_roles.role = 'SUPER_ADMIN' THEN 'SUPER_ADMIN' ELSE 'HOTEL_ADMIN' END,
             tenant_slug = EXCLUDED.tenant_slug,
             updated_at = NOW()`,
        [ownerEmail, slug]
      );
    }

    return NextResponse.json({
      ok: true,
      tenant: mapTenantRow(insertRes.rows[0]),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถสร้างโรงแรมได้ (ซับโดเมนอาจซ้ำ)" },
      { status: 409 }
    );
  }
}

const PatchTenantSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    "EXTEND_TRIAL_30D",
    "ACTIVATE_1YR",
    "SUSPEND",
    "REACTIVATE",
    "UPDATE_DETAILS",
  ]),
  customDomain: z.string().trim().max(120).optional(),
  ownerEmail: z.string().trim().email().max(120).optional(),
  nameTh: z.string().trim().min(2).max(100).optional(),
  planPriceThb: z.number().int().min(0).max(1000000).optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = PatchTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { id, action } = parsed.data;
    let res;

    if (action === "EXTEND_TRIAL_30D") {
      res = await pool.query(
        `UPDATE public.platform_tenants
         SET status = 'TRIAL',
             expires_at = GREATEST(expires_at, NOW()) + INTERVAL '30 days',
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );
    } else if (action === "ACTIVATE_1YR") {
      res = await pool.query(
        `UPDATE public.platform_tenants
         SET status = 'ACTIVE',
             expires_at = GREATEST(expires_at, NOW()) + INTERVAL '365 days',
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );
    } else if (action === "SUSPEND") {
      res = await pool.query(
        `UPDATE public.platform_tenants
         SET status = 'SUSPENDED', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );
    } else if (action === "REACTIVATE") {
      res = await pool.query(
        `UPDATE public.platform_tenants
         SET status = 'ACTIVE',
             expires_at = GREATEST(expires_at, NOW() + INTERVAL '30 days'),
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );
    } else {
      res = await pool.query(
        `UPDATE public.platform_tenants
         SET name_th = COALESCE($2, name_th),
             custom_domain = COALESCE($3, custom_domain),
             owner_email = COALESCE($4, owner_email),
             plan_price_thb = COALESCE($5, plan_price_thb),
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          id,
          parsed.data.nameTh ?? null,
          parsed.data.customDomain ?? null,
          parsed.data.ownerEmail?.toLowerCase() ?? null,
          parsed.data.planPriceThb ?? null,
        ]
      );
    }

    if (!res.rows[0]) {
      return NextResponse.json({ error: "ไม่พบข้อมูลโรงแรม" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      tenant: mapTenantRow(res.rows[0]),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || id === "ten-sapanunseen") {
    return NextResponse.json(
      { error: "ไม่สามารถลบโรงแรมหลักของแพลตฟอร์มได้" },
      { status: 400 }
    );
  }

  const deleted = await pool.query<{ slug: string }>(
    `DELETE FROM public.platform_tenants WHERE id = $1 RETURNING slug`,
    [id]
  );

  if (deleted.rows[0]?.slug) {
    await pool
      .query(`DELETE FROM public.site_cms_state WHERE id = $1`, [
        `tenant:${deleted.rows[0].slug}`,
      ])
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

