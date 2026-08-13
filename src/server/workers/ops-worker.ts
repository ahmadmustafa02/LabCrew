import "dotenv/config";
import { Worker } from "bullmq";
import { executeWeeklyOps } from "../agents/weekly-ops";
import { getRedisConnection } from "../queue/connection";
import { OPS_QUEUE_NAME, type WeeklyOpsJob } from "../queue/ops-queue";

const worker = new Worker<WeeklyOpsJob>(
  OPS_QUEUE_NAME,
  async (job) => {
    const { programId, runId, trigger = "manual" } = job.data;
    console.log(
      `[ops-worker] start job=${job.id} run=${runId} program=${programId} trigger=${trigger}`,
    );
    const result = await executeWeeklyOps(runId);
    console.log(`[ops-worker] complete run=${runId}`);
    return result;
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  },
);

worker.on("ready", () => {
  console.log(`[ops-worker] listening on queue "${OPS_QUEUE_NAME}"`);
});

worker.on("failed", (job, error) => {
  console.error(`[ops-worker] failed job=${job?.id}`, error);
});

async function shutdown() {
  console.log("[ops-worker] shutting down");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
