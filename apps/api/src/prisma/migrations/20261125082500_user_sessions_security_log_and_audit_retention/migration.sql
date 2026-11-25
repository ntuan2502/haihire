-- AlterTable: add per-organization audit log retention setting (null = keep forever)
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "auditLogRetentionDays" INTEGER;

-- CreateTable: per-device user login sessions (identified by JWT sid claim)
CREATE TABLE IF NOT EXISTS "user_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: personal user security activity logs (isolated per userId)
CREATE TABLE IF NOT EXISTS "user_security_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_session_userId_revokedAt_expiresAt_idx" ON "user_session"("userId", "revokedAt", "expiresAt");
CREATE INDEX IF NOT EXISTS "user_security_log_userId_createdAt_idx" ON "user_security_log"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "user_security_log_userId_action_idx" ON "user_security_log"("userId", "action");

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_security_log" ADD CONSTRAINT "user_security_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
