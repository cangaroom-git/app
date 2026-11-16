import { NextResponse } from "next/server";
import { z } from "zod";
import { ensurePlatformTables, getAuthenticatedServerUser } from "@/lib/db";
import { AppUserRole, resolveRoleFromEmail } from "@/lib/auth/client";

async function requireSuperAdmin() {
  const user = await getAuthenticatedServerUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return null;
  }
  return user;
}

export interface ManagedPlatformUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: AppUserRole;
  banned: boolean;
  tenantSlug: string | null;
  tenantName: string | null;
  createdAt: string;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pool = await ensurePlatformTables();
  if (!pool) {
    return NextResponse.json({ users: [] });
  }

  const res = await pool.query<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    banned: boolean | null;
    created_at: Date | string;
    override_role: string | null;
    override_tenant: string | null;
    owned_slug: string | null;
    owned_name: string | null;
  }>(`
    SELECT
      u.id::text AS id,
      u.name,
      u.email,
      u.image,
      COALESCE(u.banned, false) AS banned,
      u."createdAt" AS created_at,
      r.role AS override_role,
      r.tenant_slug AS override_tenant,
      t.slug AS owned_slug,
      t.name_th AS owned_name
    FROM neon_auth."user" u
    LEFT JOIN public.platform_user_roles r
      ON LOWER(r.email) = LOWER(u.email)
    LEFT JOIN LATERAL (
      SELECT slug, name_th
      FROM public.platform_tenants pt
      WHERE LOWER(pt.owner_email) = LOWER(u.email)
         OR pt.slug = r.tenant_slug
      ORDER BY pt.created_at DESC
      LIMIT 1
    ) t ON TRUE
    ORDER BY u."createdAt" DESC
  `);

  const users: ManagedPlatformUser[] = res.rows.map((row) => {
    const emailLower = row.email.toLowerCase();
    let effectiveRole: AppUserRole = resolveRoleFromEmail(emailLower);

    if (
      row.override_role === "SUPER_ADMIN" ||
      row.override_role === "HOTEL_ADMIN" ||
      row.override_role === "GUEST"
    ) {
      effectiveRole =
        emailLower === "cangaroomapp@gmail.com"
          ? "SUPER_ADMIN"
          : (row.override_role as AppUserRole);
    } else if (row.owned_slug && effectiveRole === "GUEST") {
      effectiveRole = "HOTEL_ADMIN";
    }

    return {
      id: row.id,
      name: row.name || row.email.split("@")[0],
      email: row.email,
      image: row.image || null,
      role: effectiveRole,
      banned: Boolean(row.banned),
      tenantSlug: row.override_tenant || row.owned_slug || null,
      tenantName: row.owned_name || null,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  });

  return NextResponse.json({ users });
}

const PatchUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["SUPER_ADMIN", "HOTEL_ADMIN", "GUEST"]).optional(),
  tenantSlug: z.string().max(40).optional(),
  banned: z.boolean().optional(),
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
    const parsed = PatchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const emailLower = parsed.data.email.trim().toLowerCase();

    // Prevent locking out the primary platform owner
    if (emailLower === "cangaroomapp@gmail.com") {
      if (parsed.data.banned === true || parsed.data.role !== undefined && parsed.data.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "ไม่สามารถลดสิทธิ์หรือระงับบัญชีเจ้าของแพลตฟอร์มหลักได้" },
          { status: 400 }
        );
      }
    }

    if (parsed.data.role !== undefined || parsed.data.tenantSlug !== undefined) {
      await pool.query(
        `INSERT INTO public.platform_user_roles (email, role, tenant_slug, updated_at)
         VALUES ($1, COALESCE($2, 'GUEST'), COALESCE($3, ''), NOW())
         ON CONFLICT (email) DO UPDATE
         SET role = COALESCE($2, public.platform_user_roles.role),
             tenant_slug = COALESCE($3, public.platform_user_roles.tenant_slug),
             updated_at = NOW()`,
        [
          emailLower,
          parsed.data.role ?? null,
          parsed.data.tenantSlug ?? null,
        ]
      );
    }

    if (parsed.data.banned !== undefined) {
      await pool.query(
        `UPDATE neon_auth."user"
         SET banned = $2, "updatedAt" = NOW()
         WHERE id::text = $1`,
        [parsed.data.id, parsed.data.banned]
      );

      if (parsed.data.banned) {
        await pool
          .query(`DELETE FROM neon_auth."session" WHERE "userId"::text = $1`, [
            parsed.data.id,
          ])
          .catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตบัญชีผู้ใช้ได้" },
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
  const email = url.searchParams.get("email")?.toLowerCase();

  if (!id || email === "cangaroomapp@gmail.com") {
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชีเจ้าของแพลตฟอร์มหลักได้" },
      { status: 400 }
    );
  }

  await pool
    .query(`DELETE FROM neon_auth."session" WHERE "userId"::text = $1`, [id])
    .catch(() => {});
  await pool
    .query(`DELETE FROM neon_auth."account" WHERE "userId"::text = $1`, [id])
    .catch(() => {});
  await pool.query(`DELETE FROM neon_auth."user" WHERE id::text = $1`, [id]);

  if (email) {
    await pool
      .query(`DELETE FROM public.platform_user_roles WHERE LOWER(email) = $1`, [
        email,
      ])
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

