import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { MemberRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PASSWORD = "labcrew";

async function upsertMember(input: {
  email: string;
  name: string;
  role: MemberRole;
  orgId: string;
  programId: string;
  passwordHash: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
    },
    update: {
      name: input.name,
      passwordHash: input.passwordHash,
    },
  });

  const existing = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: input.orgId,
      programId: input.programId,
    },
  });
  if (!existing) {
    await prisma.member.create({
      data: {
        organizationId: input.orgId,
        programId: input.programId,
        userId: user.id,
        role: input.role,
      },
    });
  } else if (existing.role !== input.role) {
    await prisma.member.update({
      where: { id: existing.id },
      data: { role: input.role },
    });
  }
}

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: "northwater" },
    include: { programs: { take: 1 } },
  });
  if (!org || !org.programs[0]) {
    throw new Error("Northwater lab missing — run npm run db:seed first");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await upsertMember({
    email: "basit.raza@faculty.comsats.lab",
    name: "Dr Basit Raza",
    role: MemberRole.MENTOR,
    orgId: org.id,
    programId: org.programs[0].id,
    passwordHash,
  });
  await upsertMember({
    email: "ahmad.mustafa@students.comsats.lab",
    name: "Ahmad Mustafa",
    role: MemberRole.STUDENT,
    orgId: org.id,
    programId: org.programs[0].id,
    passwordHash,
  });

  console.log("Walkthrough accounts ready (password: labcrew)");
  console.log("  director: basit.raza@faculty.comsats.lab");
  console.log("  student:  ahmad.mustafa@students.comsats.lab");
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
