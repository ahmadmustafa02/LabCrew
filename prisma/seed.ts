import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
  DataValueType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { extractCatalogFields } from "../src/server/catalog/extract";

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

  await prisma.catalogField.deleteMany();
  await prisma.catalogRecord.deleteMany();
  await prisma.researchPlan.deleteMany();
  await prisma.approvalItem.deleteMany();
  await prisma.engagementScore.deleteMany();
  await prisma.storedFile.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.apiAccessToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.agentStep.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.submissionDataPoint.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.equipment.deleteMany();
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

  const basit = await prisma.user.create({
    data: {
      email: "basit.raza@faculty.comsats.lab",
      name: "Dr Basit Raza",
      passwordHash,
    },
  });
  await prisma.member.create({
    data: {
      organizationId: org.id,
      programId: program.id,
      userId: basit.id,
      role: MemberRole.MENTOR,
    },
  });

  const ahmad = await prisma.user.create({
    data: {
      email: "ahmad.mustafa@students.comsats.lab",
      name: "Ahmad Mustafa",
      passwordHash,
    },
  });
  await prisma.member.create({
    data: {
      organizationId: org.id,
      programId: program.id,
      userId: ahmad.id,
      role: MemberRole.STUDENT,
    },
  });

  const milestone = await prisma.milestone.create({
    data: {
      organizationId: org.id,
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

  const fieldLog = await prisma.milestone.create({
    data: {
      organizationId: org.id,
      programId: program.id,
      title: "Stream temperature log",
      description: "Record site, water temperature, and turbidity at each station.",
      instructions:
        "Use LabCrew Field (or the web form) to add one row per station. Numbers only for celsius and turbidity.",
      materials: [],
      dataSchema: {
        columns: [
          { name: "site", type: "text" },
          { name: "celsius", type: "number" },
          { name: "turbidity", type: "number" },
        ],
      },
      rubric: {
        requireEvidenceUrl: false,
        requireWriteup: false,
        acceptData: true,
        requireData: true,
        checklist: [],
      },
      status: MilestoneStatus.ACTIVE,
      sortOrder: 1,
      dueAt: new Date("2026-09-18T23:59:00.000Z"),
    },
  });

  await prisma.equipment.createMany({
    data: [
      {
        organizationId: org.id,
        programId: program.id,
        name: "pH meter #2",
        note: "Bench drawer A",
        status: "IN_LAB",
      },
      {
        organizationId: org.id,
        programId: program.id,
        name: "Turbidity tube",
        note: "Field kit",
        status: "IN_LAB",
      },
    ],
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
        organizationId: org.id,
        milestoneId: milestone.id,
        memberId: member.id,
        status,
        evidenceUrl,
        writeup,
        submittedAt,
      },
    });

    // Ayesha (index 0) leaves the field log empty so the phone app has work to do.
    if (index > 0) {
      const celsius = (11.8 + (index % 5) * 0.4).toFixed(1);
      const turbidity = (2.4 + (index % 4) * 0.3).toFixed(1);
      const field = await prisma.submission.create({
        data: {
          organizationId: org.id,
          milestoneId: fieldLog.id,
          memberId: member.id,
          status: SubmissionStatus.SUBMITTED,
          writeup: "Station readings from the north reach.",
          submittedAt: new Date(),
        },
      });
      await prisma.submissionDataPoint.createMany({
        data: [
          {
            organizationId: org.id,
            submissionId: field.id,
            rowIndex: 0,
            columnName: "site",
            value: `N${index}`,
            valueType: DataValueType.TEXT,
          },
          {
            organizationId: org.id,
            submissionId: field.id,
            rowIndex: 0,
            columnName: "celsius",
            value: celsius,
            valueType: DataValueType.NUMBER,
          },
          {
            organizationId: org.id,
            submissionId: field.id,
            rowIndex: 0,
            columnName: "turbidity",
            value: turbidity,
            valueType: DataValueType.NUMBER,
          },
        ],
      });
    }
  }

  const paper = `CREMA-D: Crowd-sourced Emotional Multimodal Actors Dataset
We collected 7,442 audiovisual clips of actors portraying emotions.
Clips were rated by humans using categorical emotion labels.
The dataset is released under a CC-BY-4.0 licence for research reuse.`;
  const extracted = await extractCatalogFields(paper);
  await prisma.catalogRecord.create({
    data: {
      organizationId: org.id,
      programId: program.id,
      title: "CREMA-D",
      sourceName: "seed-excerpt.txt",
      sourceText: paper,
      status: extracted.fields.some((f) => f.trust === "held")
        ? "pending_review"
        : "finalized",
      fields: {
        create: extracted.fields.map((f) => ({
          organizationId: org.id,
          key: f.key,
          label: f.label,
          value: f.value,
          quote: f.quote,
          confidence: f.confidence,
          trust: f.trust,
          verifierNote: f.verifierNote,
        })),
      },
    },
  });

  console.log("Seeded Northwater Lab demo cohort.");
  console.log(`Organization: ${org.slug}`);
  console.log(`Program: ${program.name}`);
  console.log(`Students: ${STUDENTS.length}`);
  console.log(`Login: director@northwater.lab / ${DEMO_PASSWORD}`);
  console.log(`Walkthrough director: basit.raza@faculty.comsats.lab / ${DEMO_PASSWORD}`);
  console.log(`Walkthrough student: ahmad.mustafa@students.comsats.lab / ${DEMO_PASSWORD}`);
  console.log(
    `Student: ayesha.rahman@students.northwater.lab / ${DEMO_PASSWORD}`,
  );
  console.log("Field assignment: Stream temperature log (Ayesha has no rows yet)");
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
