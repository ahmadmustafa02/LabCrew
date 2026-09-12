-- CreateEnum
CREATE TYPE "MilestoneAudience" AS ENUM ('ALL', 'SELECTED');

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN "audience" "MilestoneAudience" NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "MilestoneAssignee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneAssignee_milestoneId_memberId_key" ON "MilestoneAssignee"("milestoneId", "memberId");

-- CreateIndex
CREATE INDEX "MilestoneAssignee_organizationId_idx" ON "MilestoneAssignee"("organizationId");

-- CreateIndex
CREATE INDEX "MilestoneAssignee_memberId_idx" ON "MilestoneAssignee"("memberId");

-- AddForeignKey
ALTER TABLE "MilestoneAssignee" ADD CONSTRAINT "MilestoneAssignee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAssignee" ADD CONSTRAINT "MilestoneAssignee_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAssignee" ADD CONSTRAINT "MilestoneAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
