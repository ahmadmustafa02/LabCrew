-- Adaptive Coach Phase A: per-student per-week engagement scores (lab-scoped)

CREATE TABLE "EngagementScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "components" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementScore_memberId_weekStart_key" ON "EngagementScore"("memberId", "weekStart");
CREATE INDEX "EngagementScore_organizationId_idx" ON "EngagementScore"("organizationId");
CREATE INDEX "EngagementScore_programId_weekStart_idx" ON "EngagementScore"("programId", "weekStart");
CREATE INDEX "EngagementScore_organizationId_weekStart_idx" ON "EngagementScore"("organizationId", "weekStart");

ALTER TABLE "EngagementScore" ADD CONSTRAINT "EngagementScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementScore" ADD CONSTRAINT "EngagementScore_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementScore" ADD CONSTRAINT "EngagementScore_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementScore" ADD CONSTRAINT "EngagementScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
