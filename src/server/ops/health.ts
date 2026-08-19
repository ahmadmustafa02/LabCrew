import { getRedisConnection } from "@/server/queue/connection";

export const WORKER_HEARTBEAT_KEY = "labcrew:ops-worker:heartbeat";
/** Worker should refresh at least this often; health treats older as offline. */
export const WORKER_HEARTBEAT_STALE_MS = 90_000;

export type OpsHealth = {
  redisOk: boolean;
  workerOk: boolean;
  /** Redis reachable — enqueue is allowed */
  canEnqueue: boolean;
  /** Redis up but worker heartbeat stale — jobs will wait in queue */
  processingDelayed: boolean;
  /** Redis down — dispatch must be blocked */
  degraded: boolean;
  workerHeartbeatAt: string | null;
  checkedAt: string;
};

export async function touchWorkerHeartbeat() {
  const redis = getRedisConnection();
  const now = Date.now().toString();
  await redis.set(WORKER_HEARTBEAT_KEY, now, "EX", 300);
}

export async function probeOpsHealth(): Promise<OpsHealth> {
  const checkedAt = new Date().toISOString();
  let redisOk = false;
  let workerHeartbeatAt: string | null = null;
  let workerOk = false;

  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    redisOk = pong === "PONG";
    if (redisOk) {
      const raw = await redis.get(WORKER_HEARTBEAT_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Number.isFinite(ts)) {
          workerHeartbeatAt = new Date(ts).toISOString();
          workerOk = Date.now() - ts < WORKER_HEARTBEAT_STALE_MS;
        }
      }
    }
  } catch {
    redisOk = false;
    workerOk = false;
  }

  return {
    redisOk,
    workerOk,
    canEnqueue: redisOk,
    processingDelayed: redisOk && !workerOk,
    degraded: !redisOk,
    workerHeartbeatAt,
    checkedAt,
  };
}
