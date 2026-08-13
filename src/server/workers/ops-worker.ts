import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection } from "../queue/connection";
import { OPS_QUEUE_NAME, type WeeklyOpsJob } from "../queue/ops-queue";

/**
 * Phase 2 foundation: worker process that will run the agent crew.
 * Next slice: persist AgentRun/AgentStep and stream into Mission Control.
 */
async function processWeeklyOps(job: { id?: string; data: WeeklyOpsJob }) {
  const { programId, trigger = "manual" } = job.data;
  console.log(`[ops-worker] start job=${job.id} program=${programId} trigger=${trigger}`);

  // Placeholder pipeline — real Pulse→Referee→Coach→Clerk lands next.
  const agents = ["Dispatcher", "Pulse", "Referee", "Coach", "Clerk"] as const;
  for (const agent of agents) {
    console.log(`[ops-worker] ${agent}…`);
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`[ops-worker] complete job=${job.id}`);
  return { ok: true, programId };
}

const worker = new Worker<WeeklyOpsJob>(
  OPS_QUEUE_NAME,
  async (job) => processWeeklyOps(job),
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
