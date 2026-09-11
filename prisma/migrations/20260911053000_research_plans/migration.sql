-- CreateTable
CREATE TABLE "ResearchPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL DEFAULT 6,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchPlan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN "researchPlanId" TEXT;

-- CreateIndex
CREATE INDEX "ResearchPlan_organizationId_idx" ON "ResearchPlan"("organizationId");

-- CreateIndex
CREATE INDEX "ResearchPlan_programId_idx" ON "ResearchPlan"("programId");

-- CreateIndex
CREATE INDEX "Milestone_researchPlanId_idx" ON "Milestone"("researchPlanId");

-- AddForeignKey
ALTER TABLE "ResearchPlan" ADD CONSTRAINT "ResearchPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPlan" ADD CONSTRAINT "ResearchPlan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_researchPlanId_fkey" FOREIGN KEY ("researchPlanId") REFERENCES "ResearchPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
