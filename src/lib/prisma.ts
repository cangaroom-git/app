import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const PRISMA_SCHEMA_VERSION = "2026-11-23-place-profile-card-v4";

const globalForPrisma = globalThis as unknown as {
  __cangaroomPrisma?: PrismaClient;
  __cangaroomPrismaSchemaVersion?: string;
  __cangaroomPgPool?: Pool;
  __cangaroomPgPoolSslNormalized?: boolean;
};

function normalizePgConnectionString(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (
      sslmode === "require" ||
      sslmode === "prefer" ||
      sslmode === "verify-ca"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(
      /([?&])sslmode=(require|prefer|verify-ca)(?=&|$)/i,
      "$1sslmode=verify-full"
    );
  }
}

function getOrCreatePrismaClient(): PrismaClient {
  const cachedPrisma = globalForPrisma.__cangaroomPrisma;
  if (
    cachedPrisma &&
    globalForPrisma.__cangaroomPgPoolSslNormalized &&
    globalForPrisma.__cangaroomPrismaSchemaVersion === PRISMA_SCHEMA_VERSION &&
    "hotelDiscountRule" in cachedPrisma &&
    "placeReport" in cachedPrisma
  ) {
    return cachedPrisma;
  }

  const rawConnectionString =
    process.env.DATABASE_URL || process.env.DIRECT_URL || "";

  if (!rawConnectionString) {
    throw new Error(
      "Missing DATABASE_URL / DIRECT_URL environment variable for Prisma."
    );
  }

  const connectionString = normalizePgConnectionString(rawConnectionString);

  const pool =
    globalForPrisma.__cangaroomPgPool &&
    globalForPrisma.__cangaroomPgPoolSslNormalized
      ? globalForPrisma.__cangaroomPgPool
      : new Pool({
          connectionString,
          max: 8,
          connectionTimeoutMillis: 8000,
        });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__cangaroomPgPool = pool;
    globalForPrisma.__cangaroomPgPoolSslNormalized = true;
  }

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__cangaroomPrisma = client;
    globalForPrisma.__cangaroomPrismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = getOrCreatePrismaClient();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
