import { NextResponse } from "next/server";
import {
  ensurePlatformTables,
  getAuthenticatedServerUser,
  mapTenantRow,
} from "@/lib/db";

export async function GET() {
  const sessionUser = await getAuthenticatedServerUser();
  if (!sessionUser) {
    return NextResponse.json({ user: null, tenant: null });
  }

  const pool = await ensurePlatformTables();
  let tenant = null;

  if (pool) {
    const res = sessionUser.tenantSlug
      ? await pool
          .query(
            `SELECT * FROM public.platform_tenants WHERE slug = $1 LIMIT 1`,
            [sessionUser.tenantSlug]
          )
          .catch(() => null)
      : await pool
          .query(
            `SELECT * FROM public.platform_tenants WHERE LOWER(owner_email) = $1 ORDER BY created_at DESC LIMIT 1`,
            [sessionUser.email]
          )
          .catch(() => null);

    if (res?.rows[0]) {
      tenant = mapTenantRow(res.rows[0]);
    }
  }

  return NextResponse.json({
    user: sessionUser,
    tenant,
  });
}

