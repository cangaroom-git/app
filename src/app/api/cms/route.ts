import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import { z } from "zod";

const LOCAL_STORE_FILE_PATH = path.resolve(
  process.cwd(),
  ".data",
  "cms-store.json"
);

// Loose top-level envelope validation (prevents arbitrary garbage payloads while allowing rich nested store arrays)
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

declare global {
  var __myHotelPgPool: Pool | undefined;
}

function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!global.__myHotelPgPool) {
    global.__myHotelPgPool = new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 3000,
    });
  }
  return global.__myHotelPgPool;
}

async function readStoreFromPostgres(): Promise<unknown | null> {
  const pool = getPgPool();
  if (!pool) return null;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_cms_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const res = await pool.query<{ payload: unknown }>(
      `SELECT payload FROM site_cms_state WHERE id = $1 LIMIT 1`,
      ["default"]
    );
    return res.rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

async function writeStoreToPostgres(payload: unknown): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_cms_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `INSERT INTO site_cms_state (id, payload, "updatedAt")
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload, "updatedAt" = NOW()`,
      ["default", JSON.stringify(payload)]
    );
    return true;
  } catch {
    return false;
  }
}

async function readStoreFromLocalFile(): Promise<unknown | null> {
  try {
    const raw = await readFile(LOCAL_STORE_FILE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeStoreToLocalFile(payload: unknown): Promise<void> {
  const dir = path.dirname(LOCAL_STORE_FILE_PATH);
  await mkdir(dir, { recursive: true });
  await writeFile(
    LOCAL_STORE_FILE_PATH,
    JSON.stringify(payload, null, 2),
    "utf8"
  );
}

export async function GET() {
  const dbData = await readStoreFromPostgres();
  if (dbData) {
    return NextResponse.json({ store: dbData, source: "postgres" });
  }

  const fileData = await readStoreFromLocalFile();
  if (fileData) {
    return NextResponse.json({ store: fileData, source: "file" });
  }

  return NextResponse.json({ store: null, source: "default" });
}

export async function PUT(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = StoreEnvelopeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 422 }
      );
    }

    const savedToDb = await writeStoreToPostgres(parsed.data);
    await writeStoreToLocalFile(parsed.data).catch(() => {
      // Non-fatal on read-only serverless filesystems when Postgres is primary
    });

    return NextResponse.json({
      ok: true,
      storage: savedToDb ? "postgres" : "file",
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกข้อมูลลงระบบได้" },
      { status: 500 }
    );
  }
}

