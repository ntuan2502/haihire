-- AlterTable
ALTER TABLE "organization_audit_log"
ADD COLUMN "targetId" TEXT,
ADD COLUMN "targetLabel" TEXT,
ADD COLUMN "actorNameSnapshot" TEXT,
ADD COLUMN "actorEmailSnapshot" TEXT,
ADD COLUMN "changes" JSONB,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "requestId" TEXT;

-- CreateIndex
CREATE INDEX "organization_audit_log_organizationId_targetId_createdAt_idx" ON "organization_audit_log"("organizationId", "targetId", "createdAt");
