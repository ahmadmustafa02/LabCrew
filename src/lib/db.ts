import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/** Bump when Prisma schema fields change so HMR drops a stale client. */
const PRISMA_SCHEMA_REV = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaSchemaRev: number | undefined;
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
  // without new model delegates. Force a fresh client when any are missing.
  const required = [
    "passwordResetToken",
    "invite",
    "storedFile",
    "meeting",
    "message",
    "conversation",
    "notification",
    "announcement",
    "announcementRecipient",
    "programOpsSchedule",
  ] as const;

  const stale =
    existing != null &&
    (globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV ||
      required.some((key) => typeof existing[key] === "undefined"));

  if (!existing || stale) {
    if (stale && existing) {
      void existing.$disconnect().catch(() => undefined);
      globalForPrisma.prisma = undefined;
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  }

  const client = globalForPrisma.prisma!;
  // Last-resort: if still missing (rare HMR race), rebuild once more.
  if (typeof (client as PrismaClient & Record<string, unknown>).announcement === "undefined") {
    void client.$disconnect().catch(() => undefined);
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
