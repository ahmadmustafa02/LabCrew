/**
 * Lab A / Lab B isolation suite — verbose PASS/FAIL with seeded IDs.
 *
 * Covers:
 * - Positive: A sees A's resources
 * - Negative: A cannot see B's resources (and symmetric)
 * - Bearer path: Lab A token attempting Lab B resource IDs (separate code path)
 * - Messages / invites / meetings (Phase 1b high-risk surfaces)
 *
 * CI gate: `npm run test:isolation` must pass on every PR.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  findAgentRunInLab,
  findApprovalInLab,
  findConversationInLab,
  findDataPointsForSubmissionInLab,
  findInviteByJoinToken,
  findInviteInLab,
  findMeetingInLab,
  findMessageInLab,
  findMilestoneInLab,
  findStoredFileInLab,
  findSubmissionInLab,
} from "../../src/server/tenancy/lab-repo";
import {
  issueApiAccessToken,
  resolveBearerToken,
  revokeApiAccessToken,
} from "../../src/server/auth/api-tokens";
import { resolveLabContext } from "../../src/server/tenancy/lab-scope";
import { seedIsolationLabs, type IsolationFixture, type LabSlice } from "./seed-labs";

let fixture: IsolationFixture;
let cleanup: (() => Promise<void>) | undefined;

function log(msg: string) {
  console.log(msg);
}

function printLab(label: string, lab: LabSlice) {
  log(`\n=== ${label} seeded IDs ===`);
  log(`  organizationId (labId): ${lab.organizationId}`);
  log(`  programId:              ${lab.programId}`);
  log(`  directorUserId:         ${lab.directorUserId}`);
  log(`  directorMemberId:       ${lab.directorMemberId}`);
  log(`  studentMemberId:        ${lab.studentMemberId}`);
  log(`  milestoneId:            ${lab.milestoneId}`);
  log(`  submissionId:           ${lab.submissionId}`);
  log(`  runId:                  ${lab.runId}`);
  log(`  approvalId:             ${lab.approvalId}`);
  log(`  fileName:               ${lab.fileName}`);
  log(`  conversationId:         ${lab.conversationId}`);
  log(`  messageId:              ${lab.messageId}`);
  log(`  meetingId:              ${lab.meetingId}`);
  log(`  inviteId:               ${lab.inviteId}`);
  log(`  inviteToken:            ${lab.inviteToken}`);
  log(`  dataPointId:            ${lab.dataPointId}`);
}

async function assertSees(
  label: string,
  got: unknown,
  expectedId: string,
) {
  assert.ok(got, `${label} expected a row, got null`);
  const id = (got as { id?: string; filename?: string }).id
    ?? (got as { filename?: string }).filename;
  assert.equal(id, expectedId, `${label} id mismatch`);
  log(`  PASS  + ${label} → saw ${expectedId}`);
}

async function assertBlocked(label: string, got: unknown) {
  assert.equal(got, null, `${label} must be null (cross-lab)`);
  log(`  PASS  - ${label} → blocked (null)`);
}

before(async () => {
  const seeded = await seedIsolationLabs();
  fixture = seeded.fixture;
  cleanup = seeded.cleanup;
  printLab("Lab A", fixture.labA);
  printLab("Lab B", fixture.labB);
});

after(async () => {
  if (cleanup) await cleanup();
});

describe("lab-repo: positive A→A and negative A↛B", () => {
  it("milestone", async () => {
    log("\n[milestone]");
    await assertSees(
      "A sees A milestone",
      await findMilestoneInLab(fixture.labA.organizationId, fixture.labA.milestoneId),
      fixture.labA.milestoneId,
    );
    await assertBlocked(
      "A cannot see B milestone",
      await findMilestoneInLab(fixture.labA.organizationId, fixture.labB.milestoneId),
    );
  });

  it("submission", async () => {
    log("\n[submission]");
    await assertSees(
      "A sees A submission",
      await findSubmissionInLab(fixture.labA.organizationId, fixture.labA.submissionId),
      fixture.labA.submissionId,
    );
    await assertBlocked(
      "A cannot see B submission",
      await findSubmissionInLab(fixture.labA.organizationId, fixture.labB.submissionId),
    );
  });

  it("submission data points (structured DATA)", async () => {
    log("\n[submissionDataPoint]");
    const own = await findDataPointsForSubmissionInLab(
      fixture.labA.organizationId,
      fixture.labA.submissionId,
    );
    assert.ok(own.length >= 1, "A should see own data points");
    assert.ok(
      own.some((c) => c.id === fixture.labA.dataPointId),
      "A should include seeded dataPointId",
    );
    assert.ok(
      own.every((c) => c.organizationId === fixture.labA.organizationId),
      "all cells must be lab A",
    );
    log(`  PASS  + A sees A data points → ${own.length} cell(s)`);

    const cross = await findDataPointsForSubmissionInLab(
      fixture.labA.organizationId,
      fixture.labB.submissionId,
    );
    assert.equal(cross.length, 0, "A must not see B data points via B submissionId");
    log(`  PASS  - A cannot see B data points → blocked (empty)`);

    const flipped = await findDataPointsForSubmissionInLab(
      fixture.labB.organizationId,
      fixture.labA.submissionId,
    );
    assert.equal(flipped.length, 0, "B must not see A data points via A submissionId");
    log(`  PASS  - B cannot see A data points → blocked (empty)`);
  });

  it("stored file", async () => {
    log("\n[storedFile]");
    const own = await findStoredFileInLab(
      fixture.labA.organizationId,
      fixture.labA.fileName,
    );
    assert.ok(own);
    assert.equal(own.filename, fixture.labA.fileName);
    log(`  PASS  + A sees A file → ${fixture.labA.fileName}`);
    await assertBlocked(
      "A cannot see B file",
      await findStoredFileInLab(fixture.labA.organizationId, fixture.labB.fileName),
    );
  });

  it("ops run + approval", async () => {
    log("\n[ops run / approval]");
    await assertSees(
      "A sees A run",
      await findAgentRunInLab(fixture.labA.organizationId, fixture.labA.runId),
      fixture.labA.runId,
    );
    await assertBlocked(
      "A cannot see B run",
      await findAgentRunInLab(fixture.labA.organizationId, fixture.labB.runId),
    );
    await assertSees(
      "A sees A approval",
      await findApprovalInLab(fixture.labA.organizationId, fixture.labA.approvalId),
      fixture.labA.approvalId,
    );
    await assertBlocked(
      "A cannot see B approval",
      await findApprovalInLab(fixture.labA.organizationId, fixture.labB.approvalId),
    );
  });

  it("messages + conversation", async () => {
    log("\n[messages]");
    await assertSees(
      "A sees A conversation",
      await findConversationInLab(
        fixture.labA.organizationId,
        fixture.labA.conversationId,
      ),
      fixture.labA.conversationId,
    );
    await assertBlocked(
      "A cannot see B conversation",
      await findConversationInLab(
        fixture.labA.organizationId,
        fixture.labB.conversationId,
      ),
    );
    await assertSees(
      "A sees A message",
      await findMessageInLab(fixture.labA.organizationId, fixture.labA.messageId),
      fixture.labA.messageId,
    );
    await assertBlocked(
      "A cannot see B message",
      await findMessageInLab(fixture.labA.organizationId, fixture.labB.messageId),
    );
  });

  it("meeting", async () => {
    log("\n[meeting]");
    await assertSees(
      "A sees A meeting",
      await findMeetingInLab(fixture.labA.organizationId, fixture.labA.meetingId),
      fixture.labA.meetingId,
    );
    await assertBlocked(
      "A cannot see B meeting",
      await findMeetingInLab(fixture.labA.organizationId, fixture.labB.meetingId),
    );
  });

  it("invite by id (director surface)", async () => {
    log("\n[invite by id]");
    await assertSees(
      "A sees A invite by id",
      await findInviteInLab(fixture.labA.organizationId, fixture.labA.inviteId),
      fixture.labA.inviteId,
    );
    await assertBlocked(
      "A cannot see B invite by id",
      await findInviteInLab(fixture.labA.organizationId, fixture.labB.inviteId),
    );
  });

  it("invite join token is capability-scoped (not lab-hopping by id)", async () => {
    log("\n[invite join token]");
    const a = await findInviteByJoinToken(fixture.labA.inviteToken);
    const b = await findInviteByJoinToken(fixture.labB.inviteToken);
    const garbage = await findInviteByJoinToken("inv_not_a_real_token_xxxxxx");
    assert.ok(a);
    assert.equal(a.organizationId, fixture.labA.organizationId);
    assert.ok(b);
    assert.equal(b.organizationId, fixture.labB.organizationId);
    assert.equal(garbage, null);
    log(`  PASS  + join token A resolves only to lab ${fixture.labA.organizationId}`);
    log(`  PASS  + join token B resolves only to lab ${fixture.labB.organizationId}`);
    log(`  PASS  - garbage token → null (same as expired)`);
  });

  it("Lab B symmetrically cannot read Lab A", async () => {
    log("\n[symmetric B↛A]");
    await assertBlocked(
      "B cannot see A milestone",
      await findMilestoneInLab(fixture.labB.organizationId, fixture.labA.milestoneId),
    );
    await assertBlocked(
      "B cannot see A conversation",
      await findConversationInLab(
        fixture.labB.organizationId,
        fixture.labA.conversationId,
      ),
    );
    await assertBlocked(
      "B cannot see A invite",
      await findInviteInLab(fixture.labB.organizationId, fixture.labA.inviteId),
    );
  });
});

describe("bearer token path (mobile auth) — cross-lab IDOR attempts", () => {
  it("Lab A bearer resolves to Lab A only; cannot load Lab B resources", async () => {
    log("\n[bearer A → cross-lab attempts]");
    const issued = await issueApiAccessToken({
      userId: fixture.labA.directorUserId,
      organizationId: fixture.labA.organizationId,
      programId: fixture.labA.programId,
      memberId: fixture.labA.directorMemberId,
      name: "isolation-bearer-a",
      expiresAt: null,
    });
    log(`  issued tokenId=${issued.id} expiresAt=${issued.expiresAt}`);

    const resolved = await resolveBearerToken(issued.token);
    assert.ok(resolved);
    assert.equal(resolved.organizationId, fixture.labA.organizationId);
    assert.notEqual(resolved.organizationId, fixture.labB.organizationId);
    log(`  PASS  + resolveBearer → labId=${resolved.organizationId}`);

    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: `Bearer ${issued.token}` },
    });
    const ctx = await resolveLabContext(req);
    assert.ok(ctx);
    assert.equal(ctx.authMethod, "bearer");
    assert.equal(ctx.labId, fixture.labA.organizationId);
    log(`  PASS  + requireLabScope/resolveLabContext authMethod=bearer labId=${ctx.labId}`);

    // Positive under bearer labId
    await assertSees(
      "bearer A sees A conversation",
      await findConversationInLab(ctx.labId, fixture.labA.conversationId),
      fixture.labA.conversationId,
    );
    await assertSees(
      "bearer A sees A invite",
      await findInviteInLab(ctx.labId, fixture.labA.inviteId),
      fixture.labA.inviteId,
    );

    // Negative: same bearer code path, Lab B ids
    await assertBlocked(
      "bearer A cannot see B milestone",
      await findMilestoneInLab(ctx.labId, fixture.labB.milestoneId),
    );
    await assertBlocked(
      "bearer A cannot see B conversation",
      await findConversationInLab(ctx.labId, fixture.labB.conversationId),
    );
    await assertBlocked(
      "bearer A cannot see B message",
      await findMessageInLab(ctx.labId, fixture.labB.messageId),
    );
    await assertBlocked(
      "bearer A cannot see B invite",
      await findInviteInLab(ctx.labId, fixture.labB.inviteId),
    );
    await assertBlocked(
      "bearer A cannot see B meeting",
      await findMeetingInLab(ctx.labId, fixture.labB.meetingId),
    );
    await assertBlocked(
      "bearer A cannot see B file",
      await findStoredFileInLab(ctx.labId, fixture.labB.fileName),
    );
    const bearerCrossData = await findDataPointsForSubmissionInLab(
      ctx.labId,
      fixture.labB.submissionId,
    );
    assert.equal(
      bearerCrossData.length,
      0,
      "bearer A must not see B data points",
    );
    log(`  PASS  - bearer A cannot see B data points → blocked (empty)`);
  });

  it("Lab B bearer cannot see Lab A; revoke stops resolution", async () => {
    log("\n[bearer B + revoke]");
    const issued = await issueApiAccessToken({
      userId: fixture.labB.directorUserId,
      organizationId: fixture.labB.organizationId,
      programId: fixture.labB.programId,
      memberId: fixture.labB.directorMemberId,
      name: "isolation-bearer-b",
      expiresAt: null,
    });

    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: `Bearer ${issued.token}` },
    });
    const ctx = await resolveLabContext(req);
    assert.ok(ctx);
    assert.equal(ctx.labId, fixture.labB.organizationId);
    await assertBlocked(
      "bearer B cannot see A conversation",
      await findConversationInLab(ctx.labId, fixture.labA.conversationId),
    );

    const revoked = await revokeApiAccessToken(issued.id, fixture.labB.organizationId);
    assert.ok(revoked?.revokedAt);
    const after = await resolveBearerToken(issued.token);
    assert.equal(after, null);
    log(`  PASS  - revoked tokenId=${issued.id} no longer resolves`);
  });
});
