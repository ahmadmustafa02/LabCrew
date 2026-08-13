import IORedis from "ioredis";

/**
 * BullMQ requires a non-maxed Redis connection per Queue/Worker.
 * Lazily create so Next.js build does not open sockets at import time.
 */
let connection: IORedis | null = null;

export function getRedisConnection() {
  if (connection) return connection;

  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
  });

  return connection;
}
