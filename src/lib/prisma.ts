import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  __cangaroomPrisma?: PrismaClient;
  __cangaroomPgPool?: Pool;
};

function getOrCreatePrismaClient(): PrismaClient {
  const cachedPrisma = globalForPrisma.__cangaroomPrisma;
  if (cachedPrisma && "hotelPost" in cachedPrisma) {
    return cachedPrisma;
  }

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
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__cangaroomPrisma = client;
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
