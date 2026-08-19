import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";
import { localParts } from "@/server/ops/schedule-tick";

export const runtime = "nodejs";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function GET() {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    let schedule = await prisma.programOpsSchedule.findUnique({
      where: { programId },
    });

    if (!schedule) {
      schedule = await prisma.programOpsSchedule.create({
        data: {
          organizationId: gate.session.membership.organizationId,
          programId,
        },
      });
    }

    const nowParts = localParts(new Date(), schedule.timezone);

    return NextResponse.json({
      ok: true,
      schedule: {
        enabled: schedule.enabled,
        dayOfWeek: schedule.dayOfWeek,
        dayLabel: DAYS[schedule.dayOfWeek] ?? "Sunday",
        hourLocal: schedule.hourLocal,
        timezone: schedule.timezone,
        lastEnqueuedAt: schedule.lastEnqueuedAt?.toISOString() ?? null,
        nowLocal: nowParts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load schedule",
      },
      { status: 503 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await req.json()) as {
      enabled?: boolean;
      dayOfWeek?: number;
      hourLocal?: number;
      timezone?: string;
    };

    const dayOfWeek = Number(body.dayOfWeek ?? 0);
    const hourLocal = Number(body.hourLocal ?? 20);
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { ok: false, error: "dayOfWeek must be 0–6" },
        { status: 400 },
      );
    }
    if (hourLocal < 0 || hourLocal > 23) {
      return NextResponse.json(
        { ok: false, error: "hourLocal must be 0–23" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    const schedule = await prisma.programOpsSchedule.upsert({
      where: { programId },
      create: {
        organizationId: gate.session.membership.organizationId,
        programId,
        enabled: Boolean(body.enabled),
        dayOfWeek,
        hourLocal,
        timezone: body.timezone?.trim() || "Asia/Karachi",
      },
      update: {
        enabled: Boolean(body.enabled),
        dayOfWeek,
        hourLocal,
        timezone: body.timezone?.trim() || "Asia/Karachi",
      },
    });

    return NextResponse.json({
      ok: true,
      schedule: {
        enabled: schedule.enabled,
        dayOfWeek: schedule.dayOfWeek,
        dayLabel: DAYS[schedule.dayOfWeek] ?? "Sunday",
        hourLocal: schedule.hourLocal,
        timezone: schedule.timezone,
        lastEnqueuedAt: schedule.lastEnqueuedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to save schedule",
      },
      { status: 503 },
    );
  }
}
