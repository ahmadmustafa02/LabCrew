import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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
  await prisma.approvalItem.deleteMany();
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
      name: "Summer Research Cohort ’26",
      termLabel: "Summer 2026",
    },
  });

  const director = await prisma.user.create({
    data: {
      email: "director@northwater.lab",
      name: "Director Reed",
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
      title: "Week 4 — Working demo + short report",
      description: "Ship a working demo link and a short methods/results writeup.",
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

    const isException = index < 3;
    await prisma.submission.create({
      data: {
        milestoneId: milestone.id,
        memberId: member.id,
        status: isException ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
        evidenceUrl: isException
          ? null
          : `https://demo.northwater.lab/${slug}`,
        writeup: isException
          ? index === 1
            ? "Demo works. Still polishing notes."
            : null
          : "Methods, results, and next steps documented for Week 4.",
        submittedAt: isException ? null : new Date(),
      },
    });
  }

  console.log("Seeded Northwater Lab demo cohort.");
  console.log(`Organization: ${org.slug}`);
  console.log(`Program: ${program.name}`);
  console.log(`Students: ${STUDENTS.length}`);
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
