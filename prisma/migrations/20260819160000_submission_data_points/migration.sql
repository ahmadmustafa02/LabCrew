-- Phase A: structured DATA submissions (generic key-value cells)

ALTER TABLE "Milestone" ADD COLUMN "dataSchema" JSONB;

CREATE TYPE "DataValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN');

CREATE TABLE "SubmissionDataPoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "columnName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" "DataValueType" NOT NULL DEFAULT 'TEXT',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionDataPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionDataPoint_organizationId_idx" ON "SubmissionDataPoint"("organizationId");
CREATE INDEX "SubmissionDataPoint_submissionId_rowIndex_idx" ON "SubmissionDataPoint"("submissionId", "rowIndex");
CREATE INDEX "SubmissionDataPoint_organizationId_submissionId_idx" ON "SubmissionDataPoint"("organizationId", "submissionId");

ALTER TABLE "SubmissionDataPoint" ADD CONSTRAINT "SubmissionDataPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionDataPoint" ADD CONSTRAINT "SubmissionDataPoint_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
