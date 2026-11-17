import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  __cangaroomPrisma?: PrismaClient;
  __cangaroomPgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL || process.env.DIRECT_URL || "";

  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL / DIRECT_URL environment variable for Prisma."
    );
  }

  const pool =
    globalForPrisma.__cangaroomPgPool ??
    new Pool({
      connectionString,
      max: 8,
      connectionTimeoutMillis: 8000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__cangaroomPgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const cachedPrisma = globalForPrisma.__cangaroomPrisma;
const hasCurrentModels = Boolean(
  cachedPrisma && "hotelPost" in cachedPrisma
);

export const prisma = hasCurrentModels && cachedPrisma
  ? cachedPrisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__cangaroomPrisma = prisma;
}

