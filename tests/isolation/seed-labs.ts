/**
 * Isolation test seed — two labs, overlapping resource shapes.
 * Cleans users by email so re-runs don't leave orphans (User is not org-cascaded).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AgentRunStatus,
  DataValueType,
  MemberRole,
  MilestoneStatus,
  PrismaClient,
  SubmissionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

export type LabSlice = {
  organizationId: string;
  programId: string;
  directorUserId: string;
  directorMemberId: string;
  studentUserId: string;
  studentMemberId: string;
  peerStudentMemberId: string;
  peerSubmissionId: string;
  peerDataPointId: string;
  peerSecretValue: string;
  milestoneId: string;
  submissionId: string;
  runId: string;
  approvalId: string;
  fileName: string;
  conversationId: string;
  messageId: string;
  meetingId: string;
  inviteId: string;
  inviteToken: string;
  dataPointId: string;
  engagementScoreId: string;
};

export type IsolationFixture = {
  labA: LabSlice;
  labB: LabSlice;
};

const SLUGS = ["iso-lab-a", "iso-lab-b"] as const;

function client() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, pool };
}

async function wipeIsolation(prisma: PrismaClient) {
  await prisma.organization.deleteMany({
    where: { slug: { in: [...SLUGS] } },
  });
  // Users are not cascaded from Organization — wipe by isolation email pattern
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@iso-lab-a.test" } },
        { email: { endsWith: "@iso-lab-b.test" } },
      ],
    },
  });
}

export async function seedIsolationLabs(): Promise<{
  fixture: IsolationFixture;
  cleanup: () => Promise<void>;
}> {
  const { prisma, pool } = client();
  const passwordHash = await bcrypt.hash("labcrew", 10);
  await wipeIsolation(prisma);

  async function seedLab(slug: (typeof SLUGS)[number], name: string): Promise<LabSlice> {
    const org = await prisma.organization.create({
      data: { name, slug },
    });
    const program = await prisma.program.create({
      data: {
        organizationId: org.id,
        name: `${name} Cohort`,
        termLabel: "Isolation",
      },
    });
    const director = await prisma.user.create({
      data: {
        email: `director@${slug}.test`,
        name: `${name} Director`,
        passwordHash,
      },
    });
    const directorMember = await prisma.member.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        userId: director.id,
        role: MemberRole.MENTOR,
      },
    });
    const student = await prisma.user.create({
      data: {
        email: `student@${slug}.test`,
        name: `${name} Student`,
        passwordHash,
      },
    });
    const studentMember = await prisma.member.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        userId: student.id,
        role: MemberRole.STUDENT,
      },
    });
    const milestone = await prisma.milestone.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        title: `${name} milestone`,
        status: MilestoneStatus.ACTIVE,
        sortOrder: 1,
      },
    });
    const submission = await prisma.submission.create({
      data: {
        organizationId: org.id,
        milestoneId: milestone.id,
        memberId: studentMember.id,
        status: SubmissionStatus.SUBMITTED,
        writeup: `Secret writeup for ${slug}`,
        submittedAt: new Date(),
      },
    });
    const dataPoint = await prisma.submissionDataPoint.create({
      data: {
        organizationId: org.id,
        submissionId: submission.id,
        rowIndex: 0,
        columnName: "secret_metric",
        value: `lab-secret-${slug}`,
        valueType: DataValueType.TEXT,
      },
    });

    // Second student in the same lab — peer raw rows must never reach student A APIs
    const peer = await prisma.user.create({
      data: {
        email: `peer@${slug}.test`,
        name: `${name} Peer`,
        passwordHash,
      },
    });
    const peerMember = await prisma.member.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        userId: peer.id,
        role: MemberRole.STUDENT,
      },
    });
    const peerSubmission = await prisma.submission.create({
      data: {
        organizationId: org.id,
        milestoneId: milestone.id,
        memberId: peerMember.id,
        status: SubmissionStatus.SUBMITTED,
        writeup: `Peer writeup for ${slug}`,
        submittedAt: new Date(),
      },
    });
    const peerSecretValue = `peer-raw-secret-${slug}`;
    const peerDataPoint = await prisma.submissionDataPoint.create({
      data: {
        organizationId: org.id,
        submissionId: peerSubmission.id,
        rowIndex: 0,
        columnName: "secret_metric",
        value: peerSecretValue,
        valueType: DataValueType.TEXT,
      },
    });

    const run = await prisma.agentRun.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        status: AgentRunStatus.SUCCEEDED,
        trigger: "manual",
      },
    });
    const approval = await prisma.approvalItem.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        runId: run.id,
        kind: "nudge",
        title: `Secret nudge ${slug}`,
        body: `Do not leak ${slug}`,
        targetName: student.name,
      },
    });
    const fileName = `iso-${slug}-${Date.now()}.txt`;
    await prisma.storedFile.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        filename: fileName,
        originalName: "secret.txt",
        contentType: "text/plain",
        size: 12,
        data: Buffer.from(`secret-${slug}`),
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        studentMemberId: studentMember.id,
      },
    });
    const message = await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conversation.id,
        senderMemberId: studentMember.id,
        body: `Private message for ${slug} only`,
      },
    });

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        createdById: directorMember.id,
        title: `${name} standup`,
        startsAt: new Date(Date.now() + 86400000),
        invites: {
          create: [
            {
              organizationId: org.id,
              memberId: studentMember.id,
              notifiedAt: new Date(),
            },
          ],
        },
      },
    });

    const inviteToken = `inv_${slug}_${Date.now().toString(36)}`;
    const invite = await prisma.invite.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        email: `newbie@${slug}.test`,
        role: MemberRole.STUDENT,
        token: inviteToken,
        invitedById: director.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    const day = (weekStart.getUTCDay() + 6) % 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - day);

    const engagementScore = await prisma.engagementScore.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        memberId: studentMember.id,
        weekStart,
        score: slug === "iso-lab-a" ? 42 : 88,
        components: {
          note: `secret-engagement-${slug}`,
          timeliness: { weight: 30, score: 0.5, detail: "seed" },
        },
        runId: run.id,
      },
    });

    return {
      organizationId: org.id,
      programId: program.id,
      directorUserId: director.id,
      directorMemberId: directorMember.id,
      studentUserId: student.id,
      studentMemberId: studentMember.id,
      peerStudentMemberId: peerMember.id,
      peerSubmissionId: peerSubmission.id,
      peerDataPointId: peerDataPoint.id,
      peerSecretValue,
      milestoneId: milestone.id,
      submissionId: submission.id,
      runId: run.id,
      approvalId: approval.id,
      fileName,
      conversationId: conversation.id,
      messageId: message.id,
      meetingId: meeting.id,
      inviteId: invite.id,
      inviteToken: invite.token,
      dataPointId: dataPoint.id,
      engagementScoreId: engagementScore.id,
    };
  }

  const labA = await seedLab("iso-lab-a", "Isolation Lab A");
  const labB = await seedLab("iso-lab-b", "Isolation Lab B");

  return {
    fixture: { labA, labB },
    cleanup: async () => {
      await wipeIsolation(prisma);
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
