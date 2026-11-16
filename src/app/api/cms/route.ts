import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import {
  ensurePlatformTables,
  extractTenantSlugFromHost,
} from "@/lib/db";

const LOCAL_STORE_DIR = path.resolve(process.cwd(), ".data");

const StoreEnvelopeSchema = z
  .object({
    propertyConfig: z.record(z.string(), z.unknown()),
    rooms: z.array(z.record(z.string(), z.unknown())),
    seasonalRates: z.array(z.record(z.string(), z.unknown())).optional(),
    specialDateRates: z.array(z.record(z.string(), z.unknown())).optional(),
    addons: z.array(z.record(z.string(), z.unknown())).optional(),
    coupons: z.array(z.record(z.string(), z.unknown())).optional(),
    experiences: z.array(z.record(z.string(), z.unknown())).optional(),
    bookings: z.array(z.record(z.string(), z.unknown())).optional(),
    cms: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

async function resolveStoreRecordId(request: Request): Promise<string> {
  const url = new URL(request.url);
  const queryTenant = url.searchParams
    .get("tenant")
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  if (queryTenant && queryTenant !== "sapanunseen" && queryTenant !== "default") {
    return `tenant:${queryTenant}`;
  }

  const hostHeader =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const subdomainSlug = extractTenantSlugFromHost(hostHeader);

  if (subdomainSlug && subdomainSlug !== "sapanunseen") {
    return `tenant:${subdomainSlug}`;
  }

  // Also check custom_domain match in platform_tenants if host is an external custom domain
  if (hostHeader) {
    const cleanHost = hostHeader.split(":")[0].trim().toLowerCase();
    if (
      cleanHost &&
      cleanHost !== "localhost" &&
      cleanHost !== "127.0.0.1" &&
      cleanHost !== "cangaroom.com" &&
      cleanHost !== "www.cangaroom.com" &&
      !cleanHost.endsWith(".cangaroom.com") &&
      !cleanHost.endsWith(".vercel.app")
    ) {
      const pool = await ensurePlatformTables();
      if (pool) {
        const res = await pool
          .query<{ slug: string }>(
            `SELECT slug FROM public.platform_tenants
             WHERE LOWER(custom_domain) = $1 OR LOWER(custom_domain) = $2
             LIMIT 1`,
            [cleanHost, cleanHost.replace(/^www\./, "")]
          )
          .catch(() => null);
        const foundSlug = res?.rows[0]?.slug;
        if (foundSlug && foundSlug !== "sapanunseen") {
          return `tenant:${foundSlug}`;
        }
      }
    }
  }

  return "default";
}

async function readStoreFromPostgres(recordId: string): Promise<unknown | null> {
  const pool = await ensurePlatformTables();
  if (!pool) return null;
  try {
    const res = await pool.query<{ payload: unknown }>(
      `SELECT payload FROM public.site_cms_state WHERE id = $1 LIMIT 1`,
      [recordId]
    );
    return res.rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

async function writeStoreToPostgres(
  recordId: string,
  payload: unknown
): Promise<boolean> {
  const pool = await ensurePlatformTables();
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO public.site_cms_state (id, payload, "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload, "updatedAt" = NOW()`,
      [recordId, JSON.stringify(payload)]
    );
    return true;
  } catch {
    return false;
  }
}

function getLocalFilePath(recordId: string): string {
  const safeFile =
    recordId === "default"
      ? "cms-store.json"
      : `cms-store-${recordId.replace(/[^a-z0-9_-]/gi, "_")}.json`;
  return path.join(LOCAL_STORE_DIR, safeFile);
}

async function readStoreFromLocalFile(recordId: string): Promise<unknown | null> {
  try {
    const raw = await readFile(getLocalFilePath(recordId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeStoreToLocalFile(
  recordId: string,
  payload: unknown
): Promise<void> {
  await mkdir(LOCAL_STORE_DIR, { recursive: true });
  await writeFile(
    getLocalFilePath(recordId),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
}

export async function GET(request: Request) {
  const recordId = await resolveStoreRecordId(request);
  const dbData = await readStoreFromPostgres(recordId);
  if (dbData) {
    return NextResponse.json({
      store: dbData,
      source: "postgres",
      tenantKey: recordId,
    });
  }

  const fileData = await readStoreFromLocalFile(recordId);
  if (fileData) {
    return NextResponse.json({
      store: fileData,
      source: "file",
      tenantKey: recordId,
    });
  }

  return NextResponse.json({
    store: null,
    source: "default",
    tenantKey: recordId,
  });
}

export async function PUT(request: Request) {
  try {
    const recordId = await resolveStoreRecordId(request);
    const rawBody = await request.json();
    const parsed = StoreEnvelopeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const savedToDb = await writeStoreToPostgres(recordId, parsed.data);
    await writeStoreToLocalFile(recordId, parsed.data).catch(() => {});

    return NextResponse.json({
      ok: true,
      storage: savedToDb ? "postgres" : "file",
      tenantKey: recordId,
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกข้อมูลลงระบบได้" },
      { status: 500 }
    );
  }
}
