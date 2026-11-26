import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const PRISMA_SCHEMA_VERSION = "2026-11-25-admin-promo-hub-v6";

const REQUIRED_PRISMA_DELEGATES = [
  "hotelDiscountRule",
  "placeReport",
  "provinceConfig",
  "placeBranch",
  "placeCategoryConfig",
  "promoInboxItem",
  "systemConfig",
  "aiPrompt",
] as const;

function hasRequiredDelegates(client: PrismaClient): boolean {
  return REQUIRED_PRISMA_DELEGATES.every((key) => key in client);
}

function loadFreshPrismaClientCtor(): typeof PrismaClient {
  try {
    const req = createRequire(`${process.cwd()}/package.json`);
    for (const cacheKey of Object.keys(req.cache)) {
      if (
        cacheKey.includes("@prisma/client") ||
        cacheKey.includes(".prisma/client") ||
        cacheKey.includes("@prisma\\client") ||
        cacheKey.includes(".prisma\\client")
      ) {
        delete req.cache[cacheKey];
      }
    }
    const freshMod = req("@prisma/client") as {
      PrismaClient?: typeof PrismaClient;
    };
    if (freshMod?.PrismaClient) {
      return freshMod.PrismaClient;
    }
  } catch (err) {
    console.warn("[prisma] Could not hot-reload @prisma/client:", err);
  }
  return PrismaClient;
}

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
    hasRequiredDelegates(cachedPrisma)
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

  let pool =
    globalForPrisma.__cangaroomPgPool &&
    globalForPrisma.__cangaroomPgPoolSslNormalized
      ? globalForPrisma.__cangaroomPgPool
      : undefined;

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 20, // Supports parallel Promise.all RSC queries without pool starvation
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true,
    });

    // Prevent unexpected idle pg client disconnects from crashing serverless workers
    pool.on("error", (err) => {
      console.error("[pg.Pool] Unexpected error on idle pg client:", err);
    });

    // Cache unconditionally in BOTH dev and production so warm serverless workers reuse the pool
    globalForPrisma.__cangaroomPgPool = pool;
    globalForPrisma.__cangaroomPgPoolSslNormalized = true;
  }

  const adapter = new PrismaPg(pool);
  let client = new PrismaClient({ adapter });

  if (!hasRequiredDelegates(client) && process.env.NODE_ENV !== "production") {
    const FreshPrismaClient = loadFreshPrismaClientCtor();
    client = new FreshPrismaClient({ adapter });
  }

  // Cache unconditionally in BOTH dev and production (fixes production per-query pool leak)
  globalForPrisma.__cangaroomPrisma = client;
  globalForPrisma.__cangaroomPrismaSchemaVersion = PRISMA_SCHEMA_VERSION;

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = getOrCreatePrismaClient();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export default prisma;
