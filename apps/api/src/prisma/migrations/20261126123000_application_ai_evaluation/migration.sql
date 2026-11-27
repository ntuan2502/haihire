-- CreateEnum
CREATE TYPE "AiScoreStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "organization_ai_setting"
ADD COLUMN "autoScoreApplications" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "application_ai_evaluation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "AiScoreStatus" NOT NULL DEFAULT 'PENDING',
    "overallScore" INTEGER,
    "breakdown" JSONB,
    "summary" TEXT,
    "strengths" JSONB,
    "gaps" JSONB,
    "suggestedQuestions" JSONB,
    "warningCode" TEXT,
    "cvExtractedChars" INTEGER,
    "provider" "AiProvider",
    "modelId" TEXT,
    "inputHash" TEXT,
    "errorMessage" TEXT,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_ai_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_ai_evaluation_applicationId_key" ON "application_ai_evaluation"("applicationId");

-- CreateIndex
CREATE INDEX "application_ai_evaluation_organizationId_status_idx" ON "application_ai_evaluation"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "application_ai_evaluation" ADD CONSTRAINT "application_ai_evaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_ai_evaluation" ADD CONSTRAINT "application_ai_evaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce Row-Level Security (tenant isolation)
ALTER TABLE "application_ai_evaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_ai_evaluation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "application_ai_evaluation"
    USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    )
    WITH CHECK (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    );
