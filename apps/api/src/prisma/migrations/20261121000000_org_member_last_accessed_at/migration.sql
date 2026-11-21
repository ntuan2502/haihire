-- AlterTable
ALTER TABLE "organization_member" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "organization_member_userId_lastAccessedAt_idx" ON "organization_member"("userId", "lastAccessedAt");
