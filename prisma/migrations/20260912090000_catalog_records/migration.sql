-- CreateEnum
CREATE TYPE "CatalogRecordStatus" AS ENUM ('draft', 'pending_review', 'finalized');

-- CreateEnum
CREATE TYPE "CatalogFieldTrust" AS ENUM ('trusted', 'held', 'rejected');

-- CreateTable
CREATE TABLE "CatalogRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL DEFAULT 'd4ed',
    "title" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceText" TEXT NOT NULL,
    "status" "CatalogRecordStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "page" INTEGER,
    "confidence" TEXT NOT NULL,
    "trust" "CatalogFieldTrust" NOT NULL DEFAULT 'held',
    "verifierNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogRecord_organizationId_programId_idx" ON "CatalogRecord"("organizationId", "programId");

-- CreateIndex
CREATE INDEX "CatalogRecord_status_idx" ON "CatalogRecord"("status");

-- CreateIndex
CREATE INDEX "CatalogField_organizationId_idx" ON "CatalogField"("organizationId");

-- CreateIndex
CREATE INDEX "CatalogField_recordId_key_idx" ON "CatalogField"("recordId", "key");

-- AddForeignKey
ALTER TABLE "CatalogRecord" ADD CONSTRAINT "CatalogRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogRecord" ADD CONSTRAINT "CatalogRecord_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogField" ADD CONSTRAINT "CatalogField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogField" ADD CONSTRAINT "CatalogField_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CatalogRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
