import { NextResponse } from "next/server";
import {
  ApprovalStatus,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";
import { briefToMarkdown } from "@/server/ops/brief-export";
import { serializeAgentRun } from "@/server/ops/serialize-run";

export const runtime = "nodejs";

async function loadBrief(programId: string) {
  const prisma = getPrisma();
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      milestones: {
        where: { status: MilestoneStatus.ACTIVE },
        take: 1,
      },
    },
  });
  if (!program) return null;

  const activeMilestone = program.milestones[0] ?? null;
  const students = await prisma.member.count({
    where: { programId: program.id, role: MemberRole.STUDENT },
  });
  const turnedIn = activeMilestone
    ? await prisma.submission.count({
        where: {
          milestoneId: activeMilestone.id,
          status: {
            in: [SubmissionStatus.SUBMITTED, SubmissionStatus.SCORED],
          },
        },
      })
    : 0;

  const pendingApprovals = await prisma.approvalItem.findMany({
    where: { programId: program.id, status: ApprovalStatus.PENDING },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, title: true, body: true, targetName: true },
  });

  const latestRun = await prisma.agentRun.findFirst({
    where: { programId: program.id },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      approvals: {
        where: { status: ApprovalStatus.PENDING },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const serialized = latestRun ? serializeAgentRun(latestRun) : null;

  return {
    programName: program.name,
    milestone: activeMilestone?.title ?? null,
    students,
    turnedIn,
    submissionRate:
      students === 0 ? 0 : Math.round((turnedIn / students) * 100),
    briefing: serialized?.briefing ?? null,
    agenda: serialized?.agenda ?? [],
    dataSummary: serialized?.dataSummary ?? null,
    stats: serialized?.stats ?? null,
    exceptions: (serialized?.exceptions ?? []).slice(0, 8),
    pendingApprovals,
    runFinishedAt:
      (latestRun?.finishedAt ?? latestRun?.createdAt)?.toISOString() ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const format = new URL(req.url).searchParams.get("format") ?? "md";
    const brief = await loadBrief(gate.session.membership.programId);
    if (!brief) {
      return NextResponse.json(
        { ok: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const md = briefToMarkdown(brief);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `labcrew-monday-brief-${stamp}.md`;

    if (format === "json") {
      return NextResponse.json({ ok: true, markdown: md, brief });
    }

    if (format === "html") {
      const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Monday Brief — ${escapeHtml(brief.programName)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1d1d1f;line-height:1.5}
  h1,h2,h3{letter-spacing:-0.02em} pre{white-space:pre-wrap;font-family:inherit}
  @media print{body{margin:0}}
</style></head>
<body>
<pre>${escapeHtml(md)}</pre>
<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
</body></html>`;
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 503 },
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
