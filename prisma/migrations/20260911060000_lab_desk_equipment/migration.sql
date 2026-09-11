-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('IN_LAB', 'CHECKED_OUT', 'BROKEN');

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'IN_LAB',
    "holderMemberId" TEXT,
    "dueBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Equipment_organizationId_idx" ON "Equipment"("organizationId");

-- CreateIndex
CREATE INDEX "Equipment_programId_idx" ON "Equipment"("programId");

-- CreateIndex
CREATE INDEX "Equipment_holderMemberId_idx" ON "Equipment"("holderMemberId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_holderMemberId_fkey" FOREIGN KEY ("holderMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
