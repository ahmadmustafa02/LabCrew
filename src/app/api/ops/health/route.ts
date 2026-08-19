import { NextResponse } from "next/server";
import { requireLabScope } from "@/server/tenancy/lab-scope";
import { probeOpsHealth } from "@/server/ops/health";

export const runtime = "nodejs";

/** Pipeline health: Redis (enqueue) vs worker heartbeat (consume). */
export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const health = await probeOpsHealth();
    return NextResponse.json({ ok: true, health });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed",
        health: {
          redisOk: false,
          workerOk: false,
          canEnqueue: false,
          processingDelayed: false,
          degraded: true,
          workerHeartbeatAt: null,
          checkedAt: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
