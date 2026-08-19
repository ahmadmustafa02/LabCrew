/**
 * Live Phase D check: student portal coach strip + assignment reading list.
 * Run: npx tsx scripts/live-verify-5d.ts
 */
import "dotenv/config";
import { ApprovalStatus, MemberRole } from "@prisma/client";
import { getPrisma } from "../src/lib/db";
import {
  issueApiAccessToken,
  revokeApiAccessToken,
} from "../src/server/auth/api-tokens";

const BASE = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";

async function main() {
  const prisma = getPrisma();
  console.log("=== Live Phase D verification ===\n");

  const student = await prisma.member.findFirst({
    where: { role: MemberRole.STUDENT },
    include: { user: true, program: true },
    orderBy: { createdAt: "asc" },
  });
  if (!student) throw new Error("No student — seed first");

  // Ensure an approved nudge exists for this student
  let nudge = await prisma.approvalItem.findFirst({
    where: {
      programId: student.programId,
      kind: "nudge",
      status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.EDITED] },
      OR: [
        { targetEmail: { equals: student.user.email, mode: "insensitive" } },
        { targetName: student.user.name },
      ],
    },
    orderBy: { decidedAt: "desc" },
  });
  if (!nudge) {
    nudge = await prisma.approvalItem.create({
      data: {
        organizationId: student.organizationId,
        programId: student.programId,
        kind: "nudge",
        title: `Nudge (warm · send earlier) - ${student.user.name}`,
        body: `Hi ${student.user.name.split(" ")[0]} — a short status note today is enough to unblock review.`,
        targetName: student.user.name,
        targetEmail: student.user.email,
        status: ApprovalStatus.APPROVED,
        decidedAt: new Date(),
        deliveryStatus: "console",
        deliveryChannel: "console",
        deliveredAt: new Date(),
      },
    });
    console.log("Seeded approved nudge", nudge.id);
  }

  // Ensure a milestone with approved coachResources
  let milestone = await prisma.milestone.findFirst({
    where: {
      programId: student.programId,
      coachResources: { not: null as never },
    },
  });
  if (!milestone) {
    milestone = await prisma.milestone.create({
      data: {
        organizationId: student.organizationId,
        programId: student.programId,
        title: "Phase D reading check",
        status: "ACTIVE",
        sortOrder: 99,
        coachResources: {
          status: "found",
          query: "CRISPR",
          note: "seed",
          approvedAt: new Date().toISOString(),
          items: [
            {
              title: "Guide-Guard: Off-Target Predicting in CRISPR Applications",
              url: "https://arxiv.org/abs/2602.16327v1",
              year: 2026,
              venue: "arXiv",
              source: "arxiv",
              paperId: "2602.16327v1",
              rationale: "Seeded approved hit",
            },
          ],
        },
      },
    });
    console.log("Seeded milestone with coachResources", milestone.id);
  }

  const tok = await issueApiAccessToken({
    userId: student.userId,
    organizationId: student.organizationId,
    programId: student.programId,
    memberId: student.id,
    name: "live-5d",
    expiresAt: new Date(Date.now() + 3_600_000),
  });

  try {
    const homeRes = await fetch(`${BASE}/api/portal/home`, {
      headers: { Authorization: `Bearer ${tok.token}` },
    });
    const homeJson = (await homeRes.json()) as {
      ok?: boolean;
      home?: {
        coach?: {
          progress?: { headline?: string; streak?: number };
          nudge?: { body?: string } | null;
        };
      };
      error?: string;
    };
    console.log("GET /api/portal/home", homeRes.status);
    console.log("progress:", homeJson.home?.coach?.progress?.headline);
    console.log(
      "nudge:",
      homeJson.home?.coach?.nudge?.body?.slice(0, 80) ?? null,
    );
    if (!homeRes.ok || !homeJson.ok || !homeJson.home?.coach?.progress) {
      throw new Error(`Portal coach missing: ${homeJson.error}`);
    }
    if (!homeJson.home.coach.nudge?.body) {
      throw new Error("Expected approved nudge on student home");
    }
    console.log("PASS Motivation + Trigger on portal home\n");

    const asgRes = await fetch(`${BASE}/api/assignments/${milestone.id}`, {
      headers: { Authorization: `Bearer ${tok.token}` },
    });
    const asgJson = (await asgRes.json()) as {
      ok?: boolean;
      assignment?: {
        coachResources?: { status?: string; items?: Array<{ url: string }> };
      };
    };
    console.log("GET assignment coachResources", asgRes.status, asgJson.assignment?.coachResources?.status);
    const items = asgJson.assignment?.coachResources?.items ?? [];
    if (!asgRes.ok || !items.length || !/^https?:\/\//i.test(items[0].url)) {
      throw new Error("Expected Ability reading list on assignment");
    }
    console.log("  •", items[0].url);
    console.log("PASS Ability resources on assignment detail\n");
    console.log("LIVE VERIFY 5D PASS");
  } finally {
    await revokeApiAccessToken(tok.id, student.organizationId);
  }
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
