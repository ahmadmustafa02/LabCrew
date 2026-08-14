import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { getOpsQueue } from "@/server/queue/ops-queue";

/** Current weekday (0=Sun) and hour in an IANA timezone. */
export function localParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  let hour = Number(hourRaw);
  if (hour === 24) hour = 0;
  return { dayOfWeek: map[weekday] ?? 0, hourLocal: hour };
}

/**
 * For each enabled schedule matching local day+hour, enqueue one weekly ops
 * run if we have not already enqueued in the last ~6 days.
 */
export async function enqueueDueScheduledRuns(now = new Date()) {
  const prisma = getPrisma();
  const schedules = await prisma.programOpsSchedule.findMany({
    where: { enabled: true },
  });

  const enqueued: string[] = [];

  for (const schedule of schedules) {
    const { dayOfWeek, hourLocal } = localParts(now, schedule.timezone);
    if (dayOfWeek !== schedule.dayOfWeek) continue;
    if (hourLocal !== schedule.hourLocal) continue;

    if (schedule.lastEnqueuedAt) {
      const ageMs = now.getTime() - schedule.lastEnqueuedAt.getTime();
      if (ageMs < 6 * 24 * 60 * 60 * 1000) continue;
    }

    const run = await prisma.agentRun.create({
      data: {
        programId: schedule.programId,
        status: AgentRunStatus.QUEUED,
        trigger: "schedule",
      },
    });

    await getOpsQueue().add(
      "weekly-ops",
      {
        programId: schedule.programId,
        runId: run.id,
        trigger: "schedule",
      },
      { jobId: run.id },
    );

    await prisma.programOpsSchedule.update({
      where: { id: schedule.id },
      data: { lastEnqueuedAt: now },
    });

    enqueued.push(run.id);
    console.log(
      `[ops-schedule] enqueued run=${run.id} program=${schedule.programId}`,
    );
  }

  return { checked: schedules.length, enqueued: enqueued.length, runIds: enqueued };
}
