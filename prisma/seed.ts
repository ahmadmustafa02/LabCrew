import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = "labcrew";

const STUDENTS = [
  "Ayesha Rahman",
  "Daniel Okonkwo",
  "Mei Chen",
  "Omar Haddad",
  "Sofia Alvarez",
  "Noah Berger",
  "Priya Nair",
  "Lucas Moreau",
  "Hana Suzuki",
  "Ethan Blake",
  "Fatima Zahra",
  "Jonas Keller",
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.approvalItem.deleteMany();
  await prisma.storedFile.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.agentStep.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.member.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "Northwater Lab",
      slug: "northwater",
    },
  });

  const program = await prisma.program.create({
    data: {
      organizationId: org.id,
      name: "Summer Research Cohort '26",
      termLabel: "Summer 2026",
    },
  });

  const director = await prisma.user.create({
    data: {
      email: "director@northwater.lab",
      name: "Director Reed",
      passwordHash,
    },
  });

  await prisma.member.create({
    data: {
      organizationId: org.id,
      programId: program.id,
      userId: director.id,
      role: MemberRole.MENTOR,
    },
  });

  const milestone = await prisma.milestone.create({
    data: {
      programId: program.id,
      title: "Week 4 - Working demo + short report",
      description: "Ship a working demo link and a short methods/results writeup.",
      instructions:
        "Submit a public demo URL and a short writeup covering methods, results, and next steps. Optional: link your GitHub repo.",
      materials: [
        {
          id: "mat-starter",
          title: "Starter repo (example)",
          kind: "link",
          url: "https://github.com/example/labcrew-starter",
        },
        {
          id: "mat-rubric",
          title: "Week 4 expectations",
          kind: "link",
          url: "https://example.com/week4-rubric",
        },
      ],
      rubric: {
        requireEvidenceUrl: true,
        requireWriteup: true,
        requireRepoUrl: false,
        minWriteupLength: 40,
        checklist: [
          "Demo runs locally or is publicly reachable",
          "Short methods + results writeup",
        ],
      },
      status: MilestoneStatus.ACTIVE,
      sortOrder: 4,
      dueAt: new Date("2026-08-20T23:59:00.000Z"),
    },
  });

  for (const [index, name] of STUDENTS.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, ".");
    const user = await prisma.user.create({
      data: {
        email: `${slug}@students.northwater.lab`,
        name,
        passwordHash,
      },
    });

    const member = await prisma.member.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        userId: user.id,
        role: MemberRole.STUDENT,
      },
    });

    let status: SubmissionStatus = SubmissionStatus.SUBMITTED;
    let evidenceUrl: string | null = `https://demo.northwater.lab/${slug}`;
    let writeup: string | null =
      "Methods, results, and next steps documented for Week 4.";
    let submittedAt: Date | null = new Date();

    if (index === 0) {
      status = SubmissionStatus.DRAFT;
      evidenceUrl = null;
      writeup = null;
      submittedAt = null;
    } else if (index === 1) {
      writeup = "Demo works. Still polishing notes.";
    } else if (index === 2) {
      evidenceUrl = null;
      writeup = "Wrote up methods but forgot to attach the demo URL.";
    }

    await prisma.submission.create({
      data: {
        milestoneId: milestone.id,
        memberId: member.id,
        status,
        evidenceUrl,
        writeup,
        submittedAt,
      },
    });
  }

  console.log("Seeded Northwater Lab demo cohort.");
  console.log(`Organization: ${org.slug}`);
  console.log(`Program: ${program.name}`);
  console.log(`Students: ${STUDENTS.length}`);
  console.log(`Login: director@northwater.lab / ${DEMO_PASSWORD}`);
  console.log(
    `Student: ayesha.rahman@students.northwater.lab / ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
