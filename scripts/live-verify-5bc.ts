/**
 * Live Phase B+C walkthrough against running Next + Postgres.
 * Run: npx tsx scripts/live-verify-5bc.ts
 */
import "dotenv/config";
import {
  AgentRunStatus,
  ApprovalStatus,
  MemberRole,
} from "@prisma/client";
import { getPrisma } from "../src/lib/db";
import {
  issueApiAccessToken,
  revokeApiAccessToken,
} from "../src/server/auth/api-tokens";
import { executeWeeklyOps } from "../src/server/agents/weekly-ops";
import { weekStartUtc } from "../src/server/coach/engagement-score";
import { draftResourceSuggestionsForMilestone } from "../src/server/coach/resource-suggest";
import { parseResourceApprovalBody } from "../src/server/coach/resource-suggest";

const BASE = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";

function mergeCookies(...headerLists: string[][]) {
  const map = new Map<string, string>();
  for (const list of headerLists) {
    for (const raw of list) {
      const part = raw.split(";")[0];
      const eq = part.indexOf("=");
      if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login(email: string, password: string) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/app/approvals`,
    json: "true",
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: mergeCookies(csrfCookies),
    },
    body,
    redirect: "manual",
  });
  const authCookies = res.headers.getSetCookie?.() ?? [];
  return mergeCookies(csrfCookies, authCookies);
}

async function main() {
  const prisma = getPrisma();
  console.log("=== Live Phase B+C verification ===\n");

  const director = await prisma.member.findFirst({
    where: { role: { in: [MemberRole.ADMIN, MemberRole.MENTOR] } },
    include: { user: true, program: true },
    orderBy: { createdAt: "asc" },
  });
  if (!director) throw new Error("No director — seed first");

  const students = await prisma.member.findMany({
    where: { programId: director.programId, role: MemberRole.STUDENT },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  const ayesha =
    students.find((s) => /ayesha/i.test(s.user.name)) ?? students[0];
  const mei =
    students.find((s) => /mei/i.test(s.user.name)) ??
    students.find((s) => s.id !== ayesha.id) ??
    students[1];
  if (!ayesha || !mei) throw new Error("Need at least two students");

  console.log("Lab:", director.program.name);
  console.log("Declining student:", ayesha.user.name);
  console.log("Strong student:", mei.user.name);

  // --- Seed engagement trends ---
  const thisWeek = weekStartUtc();
  const lastWeek = new Date(thisWeek);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);

  for (const row of [
    { memberId: ayesha.id, weekStart: lastWeek, score: 72 },
    { memberId: ayesha.id, weekStart: thisWeek, score: 38 },
    { memberId: mei.id, weekStart: lastWeek, score: 90 },
    { memberId: mei.id, weekStart: thisWeek, score: 93 },
  ]) {
    await prisma.engagementScore.upsert({
      where: {
        memberId_weekStart: {
          memberId: row.memberId,
          weekStart: row.weekStart,
        },
      },
      create: {
        organizationId: director.organizationId,
        programId: director.programId,
        memberId: row.memberId,
        weekStart: row.weekStart,
        score: row.score,
        components: { seeded: true },
      },
      update: { score: row.score, components: { seeded: true } },
    });
  }
  console.log("Seeded engagement: Ayesha 72→38 (declining), Mei 90→93 (strong)\n");

  // Ensure Ayesha is an exception (missing turn-in) and Mei has a weak-ish submission
  // so Coach drafts both exception + reinforce paths if needed.
  const active = await prisma.milestone.findFirst({
    where: { programId: director.programId, status: "ACTIVE" },
  });
  if (active) {
    await prisma.submission.deleteMany({
      where: { milestoneId: active.id, memberId: ayesha.id },
    });
  }

  // --- Phase B: run weekly ops with local code (not stale docker worker) ---
  const run = await prisma.agentRun.create({
    data: {
      organizationId: director.organizationId,
      programId: director.programId,
      status: AgentRunStatus.QUEUED,
      trigger: "live-verify-5bc",
    },
  });
  console.log("Running executeWeeklyOps", run.id);
  await executeWeeklyOps(run.id);

  const nudges = await prisma.approvalItem.findMany({
    where: {
      programId: director.programId,
      kind: "nudge",
      status: ApprovalStatus.PENDING,
      OR: [
        { targetName: ayesha.user.name },
        { targetName: mei.user.name },
        { targetEmail: ayesha.user.email },
        { targetEmail: mei.user.email },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n--- Approvals nudge titles ---");
  for (const n of nudges) {
    console.log(`  [${n.title}]`);
    console.log(`    ${n.body.slice(0, 140)}…`);
  }

  const ayeshaNudge = nudges.find(
    (n) =>
      n.targetName === ayesha.user.name || n.targetEmail === ayesha.user.email,
  );
  const meiNudge = nudges.find(
    (n) => n.targetName === mei.user.name || n.targetEmail === mei.user.email,
  );

  if (!ayeshaNudge) throw new Error("No Approvals draft for Ayesha");
  if (!/warm|earlier/i.test(ayeshaNudge.title)) {
    throw new Error(`Ayesha title should be warm/earlier: ${ayeshaNudge.title}`);
  }
  // Mei may be reinforce-only (strong, no exception) or exception with encourage label
  if (meiNudge && !/encourage|reinforce|steady|warm|earlier|standard/i.test(meiNudge.title)) {
    throw new Error(`Mei title unexpected: ${meiNudge.title}`);
  }
  if (meiNudge && ayeshaNudge.title === meiNudge.title) {
    throw new Error("Expected different Approvals titles for the two students");
  }
  console.log("PASS Phase B: live Approvals titles differ by trend\n");

  // Delivery path confirm: approve one nudge → deliverNudge (smtp/console)
  const dirCookie = await login("director@northwater.lab", "labcrew");
  const approveNudge = await fetch(
    `${BASE}/api/ops/approvals/${ayeshaNudge.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: dirCookie,
      },
      body: JSON.stringify({ action: "approve" }),
    },
  );
  const approveNudgeJson = (await approveNudge.json()) as {
    ok?: boolean;
    delivery?: { status?: string; channel?: string | null; to?: string };
    error?: string;
  };
  console.log("Approve nudge delivery:", approveNudge.status, approveNudgeJson.delivery);
  if (!approveNudge.ok || !approveNudgeJson.ok) {
    throw new Error(`Nudge approve failed: ${approveNudgeJson.error}`);
  }
  if (
    !approveNudgeJson.delivery?.status ||
    !["sent", "console", "failed"].includes(approveNudgeJson.delivery.status)
  ) {
    throw new Error("Expected deliverNudge status sent|console|failed");
  }
  console.log(
    "PASS Phase B delivery path uses existing deliverNudge →",
    approveNudgeJson.delivery.status,
    approveNudgeJson.delivery.to ?? "",
  );

  // --- Phase C: create assignment via HTTP (browser-equivalent) ---
  const createRes = await fetch(`${BASE}/api/assignments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: dirCookie,
    },
    body: JSON.stringify({
      title: "CRISPR off-target detection methods",
      description: "Survey bacterial CRISPR immunity assays for the cohort",
      status: "UPCOMING",
    }),
  });
  const createJson = (await createRes.json()) as {
    ok?: boolean;
    assignment?: { id: string; title: string };
    resourceDraft?: { approvalId: string; status: string };
    error?: string;
  };
  console.log("\nCreate assignment:", createRes.status, createJson.resourceDraft);
  if (!createRes.ok || !createJson.ok || !createJson.assignment) {
    throw new Error(`Create failed: ${createJson.error}`);
  }

  const approvalsRes = await fetch(`${BASE}/api/ops/approvals`, {
    headers: { Cookie: dirCookie },
  });
  const approvalsJson = (await approvalsRes.json()) as {
    ok?: boolean;
    approvals?: Array<{
      id: string;
      kind?: string;
      title: string;
      body: string;
      status?: string;
    }>;
  };
  const resourceDraft = (approvalsJson.approvals ?? []).find(
    (a) =>
      a.kind === "resources" &&
      a.id === createJson.resourceDraft?.approvalId &&
      (!a.status || a.status === "PENDING"),
  );
  if (!resourceDraft) throw new Error("Resource draft not in Approvals API");

  const payload = parseResourceApprovalBody(resourceDraft.body);
  console.log("Resource Approvals title:", resourceDraft.title);
  console.log("Resource status:", payload?.status, "items:", payload?.items?.length);
  if (!payload || payload.status !== "found" || !payload.items?.length) {
    throw new Error("Expected found resource links for CRISPR assignment");
  }
  for (const item of payload.items) {
    if (!/^https?:\/\//i.test(item.url)) {
      throw new Error(`Bad resource url: ${item.url}`);
    }
    console.log("  •", item.title.slice(0, 80), "→", item.url);
  }
  console.log("PASS Phase C: live Approvals shows clickable search hits\n");

  // Approve resources → milestone.coachResources
  const approveRes = await fetch(
    `${BASE}/api/ops/approvals/${resourceDraft.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: dirCookie,
      },
      body: JSON.stringify({ action: "approve" }),
    },
  );
  const approveJson = (await approveRes.json()) as {
    ok?: boolean;
    delivery?: { status?: string };
  };
  console.log("Approve resources:", approveRes.status, approveJson.delivery);
  if (!approveRes.ok || approveJson.delivery?.status !== "applied") {
    throw new Error("Resource approve should apply to milestone");
  }

  const milestone = await prisma.milestone.findUniqueOrThrow({
    where: { id: createJson.assignment.id },
  });
  const stored = milestone.coachResources as { items?: unknown[] } | null;
  if (!stored || !Array.isArray(stored.items) || stored.items.length === 0) {
    throw new Error("coachResources not written to milestone");
  }
  console.log("PASS coachResources stored on milestone (", stored.items.length, "items)");

  // Student vs director visibility
  const student = await prisma.member.findFirst({
    where: { programId: director.programId, role: MemberRole.STUDENT },
    include: { user: true },
  });
  if (!student) throw new Error("No student");
  const stuTok = await issueApiAccessToken({
    userId: student.userId,
    organizationId: student.organizationId,
    programId: student.programId,
    memberId: student.id,
    name: "live-5bc-student",
    expiresAt: new Date(Date.now() + 3_600_000),
  });
  const dirTok = await issueApiAccessToken({
    userId: director.userId,
    organizationId: director.organizationId,
    programId: director.programId,
    memberId: director.id,
    name: "live-5bc-director",
    expiresAt: new Date(Date.now() + 3_600_000),
  });
  try {
    const stuGet = await fetch(
      `${BASE}/api/assignments/${createJson.assignment.id}`,
      { headers: { Authorization: `Bearer ${stuTok.token}` } },
    );
    const stuJson = (await stuGet.json()) as {
      assignment?: { coachResources: unknown };
    };
    const dirGet = await fetch(
      `${BASE}/api/assignments/${createJson.assignment.id}`,
      { headers: { Authorization: `Bearer ${dirTok.token}` } },
    );
    const dirJson = (await dirGet.json()) as {
      assignment?: { coachResources: unknown };
    };
    console.log("Student coachResources:", stuJson.assignment?.coachResources);
    console.log(
      "Director coachResources present:",
      Boolean(dirJson.assignment?.coachResources),
    );
    // Phase D: students see approved found lists; directors see raw JSON
    const stuRes = stuJson.assignment?.coachResources as
      | { status?: string; items?: unknown[] }
      | null;
    if (!stuRes || stuRes.status !== "found" || !stuRes.items?.length) {
      throw new Error("Phase D: students should see approved coachResources");
    }
    if (!dirJson.assignment?.coachResources) {
      throw new Error("Director should see coachResources after approve");
    }
    console.log("PASS students see approved reading list (Phase D)\n");
  } finally {
    await revokeApiAccessToken(stuTok.id, student.organizationId);
    await revokeApiAccessToken(dirTok.id, director.organizationId);
  }

  // Rate-limit / reuse: same query should not re-search
  const first = await draftResourceSuggestionsForMilestone({
    labId: director.organizationId,
    programId: director.programId,
    milestoneId: createJson.assignment.id,
    title: "CRISPR off-target detection methods",
    description: "Survey bacterial CRISPR immunity assays for the cohort",
  });
  const second = await draftResourceSuggestionsForMilestone({
    labId: director.organizationId,
    programId: director.programId,
    milestoneId: createJson.assignment.id,
    title: "CRISPR off-target detection methods",
    description: "Survey bacterial CRISPR immunity assays for the cohort",
  });
  console.log("Reuse pending same query:", {
    first: first.reusedPending,
    second: second.reusedPending,
    sameId: first.approvalId === second.approvalId,
  });
  if (!second.reusedPending || first.approvalId !== second.approvalId) {
    throw new Error("Expected second draft to reuse pending same-query approval");
  }
  console.log("PASS same-query edit reuses pending draft (no extra S2/arXiv hit)\n");

  console.log("LIVE VERIFY 5B+5C PASS");
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
