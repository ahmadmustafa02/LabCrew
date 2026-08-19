import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  computeAndStoreEngagementScores,
  weekStartUtc,
} from "@/server/coach/engagement-score";
import { inLab, requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

/**
 * Director-only engagement scores for the current ISO week (lab-scoped).
 * Students / peers must never call this successfully.
 */
export async function GET(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const labId = gate.ctx.labId;
    const programId = gate.ctx.membership.programId;
    const url = new URL(request.url);
    const weekParam = url.searchParams.get("weekStart");
    const weekStart = weekParam
      ? weekStartUtc(new Date(weekParam))
      : weekStartUtc();

    const prisma = getPrisma();
    const rows = await prisma.engagementScore.findMany({
      where: {
        programId,
        weekStart,
        ...inLab(labId),
      },
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { score: "asc" },
    });

    return NextResponse.json({
      ok: true,
      weekStart: weekStart.toISOString(),
      scores: rows.map((row) => ({
        id: row.id,
        memberId: row.memberId,
        name: row.member.user.name,
        email: row.member.user.email,
        score: row.score,
        components: row.components,
        computedAt: row.computedAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Engagement unavailable",
      },
      { status: 503 },
    );
  }
}

/** Recompute scores for the current week (director). */
export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const result = await computeAndStoreEngagementScores({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
    });

    return NextResponse.json({
      ok: true,
      weekStart: result.weekStart.toISOString(),
      scored: result.scored.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Engagement recompute failed",
      },
      { status: 503 },
    );
  }
}
