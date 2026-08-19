import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";

/**
 * Lab-scoped finders — the only approved way to load tenant rows by id.
 * Every query includes organizationId (= labId). No Prisma middleware.
 */

export async function findMilestoneInLab(labId: string, milestoneId: string) {
  return getPrisma().milestone.findFirst({
    where: { id: milestoneId, ...inLab(labId) },
  });
}

export async function findMilestoneDetailInLab(
  labId: string,
  milestoneId: string,
) {
  return getPrisma().milestone.findFirst({
    where: { id: milestoneId, ...inLab(labId) },
    include: {
      submissions: {
        include: {
          member: { include: { user: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      program: {
        include: {
          members: {
            where: { role: MemberRole.STUDENT },
            select: { id: true },
          },
        },
      },
    },
  });
}

export async function findSubmissionInLab(
  labId: string,
  submissionId: string,
) {
  return getPrisma().submission.findFirst({
    where: { id: submissionId, ...inLab(labId) },
  });
}

export async function findStoredFileInLab(labId: string, filename: string) {
  return getPrisma().storedFile.findFirst({
    where: { filename, ...inLab(labId) },
  });
}

export async function findAgentRunInLab(labId: string, runId: string) {
  return getPrisma().agentRun.findFirst({
    where: { id: runId, ...inLab(labId) },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      approvals: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function findApprovalInLab(labId: string, approvalId: string) {
  return getPrisma().approvalItem.findFirst({
    where: { id: approvalId, ...inLab(labId) },
  });
}

export async function findConversationInLab(
  labId: string,
  conversationId: string,
) {
  return getPrisma().conversation.findFirst({
    where: { id: conversationId, ...inLab(labId) },
  });
}

export async function findMeetingInLab(labId: string, meetingId: string) {
  return getPrisma().meeting.findFirst({
    where: { id: meetingId, ...inLab(labId) },
  });
}

/** Director-facing invite by id — never by guessing across labs. */
export async function findInviteInLab(labId: string, inviteId: string) {
  return getPrisma().invite.findFirst({
    where: { id: inviteId, ...inLab(labId) },
  });
}

/**
 * Public join lookup by high-entropy token only.
 * Returns null for unknown/expired/accepted — same shape to avoid probing leaks.
 */
export async function findInviteByJoinToken(token: string) {
  if (!token || token.length < 16) return null;
  const invite = await getPrisma().invite.findUnique({
    where: { token },
    include: {
      program: { include: { organization: true } },
    },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return null;
  }
  return invite;
}

export async function findMessageInLab(labId: string, messageId: string) {
  return getPrisma().message.findFirst({
    where: { id: messageId, ...inLab(labId) },
  });
}

export async function findDataPointsForSubmissionInLab(
  labId: string,
  submissionId: string,
) {
  return getPrisma().submissionDataPoint.findMany({
    where: { submissionId, ...inLab(labId) },
    orderBy: [{ rowIndex: "asc" }, { columnName: "asc" }],
  });
}

/** All structured cells for an assignment within one lab (cohort analytics). */
export async function findDataPointsForMilestoneInLab(
  labId: string,
  milestoneId: string,
) {
  return getPrisma().submissionDataPoint.findMany({
    where: {
      ...inLab(labId),
      submission: { milestoneId, organizationId: labId },
    },
    orderBy: [{ submissionId: "asc" }, { rowIndex: "asc" }, { columnName: "asc" }],
    include: {
      submission: {
        select: {
          id: true,
          memberId: true,
          member: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
}
