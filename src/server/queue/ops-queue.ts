import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

export const OPS_QUEUE_NAME = "labcrew-ops";

export type WeeklyOpsJob = {
  programId: string;
  runId: string;
  trigger?: "manual" | "schedule";
};

let opsQueue: Queue<WeeklyOpsJob> | null = null;

export function getOpsQueue() {
  if (!opsQueue) {
    opsQueue = new Queue<WeeklyOpsJob>(OPS_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }
  return opsQueue;
}
