import "dotenv/config";
import { Worker } from "bullmq";
import { executeWeeklyOps } from "../agents/weekly-ops";
import { enqueueDueScheduledRuns } from "../ops/schedule-tick";
import { getRedisConnection } from "../queue/connection";
import {
  getOpsQueue,
  OPS_QUEUE_NAME,
  type WeeklyOpsJob,
} from "../queue/ops-queue";

const SCHEDULE_TICK = "schedule-tick";
const SCHEDULER_ID = "ops-schedule-tick";

type JobData = WeeklyOpsJob;

const worker = new Worker<JobData>(
  OPS_QUEUE_NAME,
  async (job) => {
    if (job.name === SCHEDULE_TICK || job.data.kind === "schedule-tick") {
      const result = await enqueueDueScheduledRuns();
      console.log(
        `[ops-worker] schedule-tick checked=${result.checked} enqueued=${result.enqueued}`,
      );
      return result;
    }

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

async function ensureScheduleTick() {
  const queue = getOpsQueue();
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { every: 60_000 },
    {
      name: SCHEDULE_TICK,
      data: {
        programId: "",
        runId: "",
        kind: "schedule-tick",
      },
    },
  );
  console.log("[ops-worker] schedule tick registered (every 60s)");
}

void ensureScheduleTick().catch((err) => {
  console.error("[ops-worker] failed to register schedule tick", err);
});

async function shutdown() {
  console.log("[ops-worker] shutting down");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
