-- Composite performance indexes for ATS platform

-- 1. Job search and listing by organization and status
CREATE INDEX IF NOT EXISTS "idx_job_org_status" 
ON "job" ("organizationId", "status");

-- 2. Kanban Board application query by job and stage (Critical for pipeline performance)
CREATE INDEX IF NOT EXISTS "idx_application_job_stage" 
ON "application" ("jobId", "stage");

-- 3. Composite member lookup by organization and user
CREATE INDEX IF NOT EXISTS "idx_org_member_org_user" 
ON "organizationMember" ("organizationId", "userId");

-- 4. ActivityLog timeline query by organization and createdAt descending
CREATE INDEX IF NOT EXISTS "idx_activity_log_org_created" 
ON "activityLog" ("organizationId", "createdAt" DESC);

-- 5. EmailLog history query by organization and createdAt descending
CREATE INDEX IF NOT EXISTS "idx_email_log_org_created" 
ON "emailLog" ("organizationId", "createdAt" DESC);
