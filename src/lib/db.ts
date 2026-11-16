import { Pool } from "pg";
import { auth } from "@/lib/auth/server";
import { AppUserRole, resolveRoleFromEmail } from "@/lib/auth/client";

declare global {
  var __cangaroomPgPool: Pool | undefined;
  var __cangaroomSchemaReady: boolean | undefined;
}

export function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!global.__cangaroomPgPool) {
    global.__cangaroomPgPool = new Pool({
      connectionString,
      max: 6,
      connectionTimeoutMillis: 5000,
    });
  }
  return global.__cangaroomPgPool;
}

export type TenantStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED";

export interface PlatformTenantRecord {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  customDomain: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerLine: string;
  status: TenantStatus;
  planPriceThb: number;
  trialStartedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function ensurePlatformTables(): Promise<Pool | null> {
  const pool = getDbPool();
  if (!pool) return null;

  if (global.__cangaroomSchemaReady) {
    return pool;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.site_cms_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.platform_tenants (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name_th TEXT NOT NULL,
      name_en TEXT NOT NULL,
      custom_domain TEXT NOT NULL DEFAULT '',
      owner_email TEXT NOT NULL,
      owner_phone TEXT NOT NULL DEFAULT '',
      owner_line TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'TRIAL',
      plan_price_thb INTEGER NOT NULL DEFAULT 12000,
      trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_platform_tenants_owner_email
      ON public.platform_tenants (LOWER(owner_email));

    CREATE INDEX IF NOT EXISTS idx_platform_tenants_custom_domain
      ON public.platform_tenants (LOWER(custom_domain))
      WHERE custom_domain <> '';

    CREATE TABLE IF NOT EXISTS public.platform_user_roles (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'GUEST',
      tenant_slug TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed primary showcase property if platform_tenants is empty
  const countRes = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM public.platform_tenants`
  );
  if (Number(countRes.rows[0]?.cnt || 0) === 0) {
    await pool.query(
      `INSERT INTO public.platform_tenants (
        id, slug, name_th, name_en, custom_domain,
        owner_email, owner_phone, owner_line,
        status, plan_price_thb, trial_started_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, NOW(), NOW() + INTERVAL '365 days'
      ) ON CONFLICT (slug) DO NOTHING`,
      [
        "ten-sapanunseen",
        "sapanunseen",
        "สะปัน อันซีน น่าน",
        "Sapan Unseen Nan",
        "cangaroom.com",
        "cangaroomapp@gmail.com",
        "095-779-7971",
        "@sapanunseen",
        "ACTIVE",
        12000,
      ]
    );
  }

  global.__cangaroomSchemaReady = true;
  return pool;
}

export function mapTenantRow(row: Record<string, unknown>): PlatformTenantRecord {
  const expiresAtIso =
    row.expires_at instanceof Date
      ? row.expires_at.toISOString()
      : String(row.expires_at || new Date().toISOString());
  const rawStatus = String(row.status || "TRIAL") as TenantStatus;

  // Auto-mark expired trials on read
  const isPastExpiry =
    (rawStatus === "TRIAL" || rawStatus === "ACTIVE") &&
    new Date(expiresAtIso).getTime() < Date.now();

  return {
    id: String(row.id),
    slug: String(row.slug),
    nameTh: String(row.name_th || ""),
    nameEn: String(row.name_en || ""),
    customDomain: String(row.custom_domain || ""),
    ownerEmail: String(row.owner_email || ""),
    ownerPhone: String(row.owner_phone || ""),
    ownerLine: String(row.owner_line || ""),
    status: isPastExpiry ? "EXPIRED" : rawStatus,
    planPriceThb: Number(row.plan_price_thb ?? 12000),
    trialStartedAt:
      row.trial_started_at instanceof Date
        ? row.trial_started_at.toISOString()
        : String(row.trial_started_at || new Date().toISOString()),
    expiresAt: expiresAtIso,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at || new Date().toISOString()),
  };
}

export interface ServerSessionContext {
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: AppUserRole;
  tenantSlug: string | null;
}

export async function getAuthenticatedServerUser(): Promise<ServerSessionContext | null> {
  try {
    const sessionRes = await auth.getSession();
    const rawUser = sessionRes?.data?.user;
    if (!rawUser?.email) {
      return null;
    }

    const normalizedEmail = rawUser.email.trim().toLowerCase();
    let role: AppUserRole = resolveRoleFromEmail(normalizedEmail);
    let tenantSlug: string | null = null;

    const pool = await ensurePlatformTables();
    if (pool) {
      const roleOverrideRes = await pool.query<{
        role: string;
        tenant_slug: string;
      }>(
        `SELECT role, tenant_slug FROM public.platform_user_roles WHERE LOWER(email) = $1 LIMIT 1`,
        [normalizedEmail]
      );

      if (roleOverrideRes.rows[0]) {
        const dbRole = roleOverrideRes.rows[0].role as AppUserRole;
        if (
          dbRole === "SUPER_ADMIN" ||
          dbRole === "HOTEL_ADMIN" ||
          dbRole === "GUEST"
        ) {
          role =
            normalizedEmail === "cangaroomapp@gmail.com"
              ? "SUPER_ADMIN"
              : dbRole;
        }
        if (roleOverrideRes.rows[0].tenant_slug) {
          tenantSlug = roleOverrideRes.rows[0].tenant_slug;
        }
      }

      if (!tenantSlug) {
        const ownedTenantRes = await pool.query<{ slug: string }>(
          `SELECT slug FROM public.platform_tenants WHERE LOWER(owner_email) = $1 ORDER BY created_at DESC LIMIT 1`,
          [normalizedEmail]
        );
        if (ownedTenantRes.rows[0]?.slug) {
          tenantSlug = ownedTenantRes.rows[0].slug;
          if (role === "GUEST") {
            role = "HOTEL_ADMIN";
          }
        }
      }
    }

    return {
      userId: rawUser.id,
      email: normalizedEmail,
      name: rawUser.name || normalizedEmail.split("@")[0],
      image: rawUser.image || null,
      role,
      tenantSlug,
    };
  } catch {
    return null;
  }
}

export function extractTenantSlugFromHost(hostHeader?: string | null): string | null {
  if (!hostHeader) return null;
  const hostname = hostHeader.split(":")[0].trim().toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "cangaroom.com" ||
    hostname === "www.cangaroom.com" ||
    hostname.endsWith(".vercel.app")
  ) {
    return null;
  }

  // Matches <slug>.cangaroom.com (ignoring www.cangaroom.com above)
  if (hostname.endsWith(".cangaroom.com")) {
    const sub = hostname.slice(0, -".cangaroom.com".length);
    // Support both xxx.cangaroom.com and accidental www.xxx.cangaroom.com gracefully
    const cleaned = sub.startsWith("www.") ? sub.slice(4) : sub;
    if (cleaned && cleaned !== "www" && cleaned !== "app") {
      return cleaned;
    }
  }

  return null;
}
