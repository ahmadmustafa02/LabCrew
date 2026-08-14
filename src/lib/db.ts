import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
    });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  return client;
}

/** Lazy accessor — safe for scripts/workers; avoids import-time crashes in edge cases. */
export function getPrisma() {
  const existing = globalForPrisma.prisma as
    | (PrismaClient & Record<string, unknown>)
    | undefined;

  // After `prisma generate` / schema changes, Next HMR can keep a stale client
  // without new model delegates (invite, passwordResetToken, storedFile, …).
  const stale =
    existing != null &&
    (typeof existing.passwordResetToken === "undefined" ||
      typeof existing.invite === "undefined" ||
      typeof existing.storedFile === "undefined");

  if (!existing || stale) {
    if (stale) {
      void existing.$disconnect().catch(() => undefined);
    }
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma!;
}

/** @deprecated prefer getPrisma() */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
