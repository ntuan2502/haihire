-- HaiHire R2 Database Redesign Migration
-- Baseline + Redesign Migration:
-- 1. Decouples User from single-tenant state (drops User.organizationId and User.role)
-- 2. Enforces NOT NULL organizationId on child models (Application, Interview, TrackingClick)
-- 3. Implements partial unique indexes for soft-deleted models (Candidate, TrackingLink)
-- 4. Converts string JSON columns to native JsonB (Interview.scorecard, EmailTemplate.variables, metadata)
-- 5. Adds Optimistic Concurrency Control (version Int @default(1)) to Job, Candidate, Application, Interview
-- 6. Adds missing composite indexes for high-throughput queries
-- 7. Restricts cascading deletes on audit logs (EmailLog, ActivityLog, OrganizationAuditLog)

-- Extensions
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InterviewType" AS ENUM ('HR_SCREENING', 'TECHNICAL', 'CULTURE_FIT', 'FINAL_ROUND', 'ASSESSMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InterviewFormat" AS ENUM ('MEET', 'ZOOM', 'TEAMS', 'OFFICE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkplaceType" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR_LEVEL', 'LEAD', 'EXECUTIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailTemplateType" AS ENUM ('APPLICATION_CONFIRMATION', 'INTERVIEW_INVITATION', 'REJECTION', 'OFFER', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailFlowKey" AS ENUM ('APPLICATION_RECEIVED', 'INTERVIEW_SCHEDULED', 'APPLICATION_REJECTED', 'APPLICATION_OFFER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'SIMULATED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailScope" AS ENUM ('SYSTEM', 'ORGANIZATION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SourcingChannel" AS ENUM ('LINKEDIN', 'INDEED', 'GOOGLE_JOBS', 'CAREER_SITE', 'REFERRAL', 'DIRECT', 'HANDSHAKE', 'EMAIL', 'WE_WORK_REMOTELY', 'STACK_OVERFLOW', 'TWITTER_X', 'REDDIT', 'GLASSDOOR', 'AGENCY', 'FACEBOOK', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('APPLIED', 'STAGE_CHANGED', 'EMAIL_SENT', 'INTERVIEW_SCHEDULED', 'INTERVIEW_UPDATED', 'SCORECARD_SUBMITTED', 'NOTE_ADDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebhookEventType" AS ENUM ('DLQ_ALERT', 'ORPHAN_SPIKE', 'JOB_POSTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebhookProviderType" AS ENUM ('TELEGRAM', 'DISCORD', 'GENERIC');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. Base Tables Creation (if not existing)
CREATE TABLE IF NOT EXISTS "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'vi',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '24H',
    "nameDisplayOrder" TEXT NOT NULL DEFAULT 'FIRST_LAST',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "password" TEXT,
    "avatarUrl" TEXT,
    "preferredLanguage" TEXT,
    "preferredTimezone" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_role_permission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_role_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invite_link" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "status" "InviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invite_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "postalCode" TEXT,
    "experienceLevel" "ExperienceLevel",
    "workplace" "WorkplaceType",
    "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "salaryRange" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "candidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeFileSize" INTEGER,
    "resumeMimeType" TEXT DEFAULT 'application/pdf',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "application" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "matchScore" INTEGER,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeFileSize" INTEGER,
    "resumeMimeType" TEXT DEFAULT 'application/pdf',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "trackingLinkId" TEXT,
    "sourceChannel" "SourcingChannel" NOT NULL DEFAULT 'DIRECT',
    "sourceDetails" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "interview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" "InterviewType" NOT NULL DEFAULT 'TECHNICAL',
    "format" "InterviewFormat" NOT NULL DEFAULT 'MEET',
    "linkOrLocation" TEXT NOT NULL,
    "interviewer" TEXT NOT NULL,
    "interviewerId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "scorecard" JSONB,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL DEFAULT 'CUSTOM',
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_flow_config" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flowKey" "EmailFlowKey" NOT NULL,
    "templateId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_flow_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SIMULATED',
    "fromName" TEXT NOT NULL DEFAULT 'Recruitment Team',
    "fromEmail" TEXT NOT NULL DEFAULT 'careers@workspace.com',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "resendApiKey" TEXT,
    "sendgridApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_log" (
    "id" TEXT NOT NULL,
    "scope" "EmailScope" NOT NULL DEFAULT 'ORGANIZATION',
    "organizationId" TEXT,
    "candidateId" TEXT,
    "applicationId" TEXT,
    "templateId" TEXT,
    "templateName" TEXT,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "templateType" "EmailTemplateType" NOT NULL DEFAULT 'CUSTOM',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "candidate_document" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT DEFAULT 'application/pdf',
    "type" TEXT DEFAULT 'Resume',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tracking_link" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "source" "SourcingChannel" NOT NULL DEFAULT 'OTHER',
    "customSource" TEXT,
    "jobId" TEXT,
    "campaign" TEXT,
    "medium" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tracking_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tracking_click" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trackingLinkId" TEXT NOT NULL,
    "referrer" TEXT,
    "referrerDomain" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_click_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_webhook_setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" "WebhookEventType" NOT NULL,
    "provider" "WebhookProviderType" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "secretToken" TEXT,
    "chatId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "organization_webhook_setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "application_note" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "candidate_note" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_note_pkey" PRIMARY KEY ("id")
);

-- 2. Drop Foreign Key & Columns from user
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_organizationId_fkey";
DROP INDEX IF EXISTS "user_organizationId_idx";
ALTER TABLE "user" DROP COLUMN IF EXISTS "organizationId";
ALTER TABLE "user" DROP COLUMN IF EXISTS "role";

-- 3. Backfill NULL organizationId & Enforce NOT NULL on Child Models
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'application' AND column_name = 'jobId') THEN
    UPDATE "application" a
    SET "organizationId" = j."organizationId"
    FROM "job" j
    WHERE a."jobId" = j."id" AND a."organizationId" IS NULL;
  END IF;
END $$;
ALTER TABLE "application" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview' AND column_name = 'applicationId') THEN
    UPDATE "interview" i
    SET "organizationId" = a."organizationId"
    FROM "application" a
    WHERE i."applicationId" = a."id" AND i."organizationId" IS NULL;
  END IF;
END $$;
ALTER TABLE "interview" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracking_click' AND column_name = 'trackingLinkId') THEN
    UPDATE "tracking_click" tc
    SET "organizationId" = tl."organizationId"
    FROM "tracking_link" tl
    WHERE tc."trackingLinkId" = tl."id" AND tc."organizationId" IS NULL;
  END IF;
END $$;
ALTER TABLE "tracking_click" ALTER COLUMN "organizationId" SET NOT NULL;

-- 4. Convert String JSON Columns to native JSONB
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview' AND column_name = 'scorecard' AND data_type = 'text'
  ) THEN
    ALTER TABLE "interview"
      ALTER COLUMN "scorecard" TYPE JSONB 
      USING (CASE WHEN "scorecard" IS NULL OR "scorecard" = '' THEN NULL ELSE "scorecard"::JSONB END);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_template' AND column_name = 'variables' AND data_type = 'text'
  ) THEN
    ALTER TABLE "email_template"
      ALTER COLUMN "variables" TYPE JSONB 
      USING (CASE WHEN "variables" IS NULL OR "variables" = '' THEN NULL ELSE "variables"::JSONB END);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_log' AND column_name = 'metadata' AND data_type = 'text'
  ) THEN
    ALTER TABLE "activity_log"
      ALTER COLUMN "metadata" TYPE JSONB 
      USING (CASE WHEN "metadata" IS NULL OR "metadata" = '' THEN NULL ELSE "metadata"::JSONB END);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_audit_log' AND column_name = 'metadata' AND data_type = 'text'
  ) THEN
    ALTER TABLE "organization_audit_log"
      ALTER COLUMN "metadata" TYPE JSONB 
      USING (CASE WHEN "metadata" IS NULL OR "metadata" = '' THEN NULL ELSE "metadata"::JSONB END);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_audit_log' AND column_name = 'metadata' AND data_type = 'text'
  ) THEN
    ALTER TABLE "platform_audit_log"
      ALTER COLUMN "metadata" TYPE JSONB 
      USING (CASE WHEN "metadata" IS NULL OR "metadata" = '' THEN NULL ELSE "metadata"::JSONB END);
  END IF;
END $$;

-- 5. Add OCC Versioning
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "candidate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "interview" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- 6. Partial Unique Indexes for Soft-Delete Models
ALTER TABLE "candidate" DROP CONSTRAINT IF EXISTS "candidate_organizationId_email_key";
DROP INDEX IF EXISTS "candidate_organizationId_email_key";

ALTER TABLE "tracking_link" DROP CONSTRAINT IF EXISTS "tracking_link_token_key";
DROP INDEX IF EXISTS "tracking_link_token_key";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_candidate_org_email_active"
ON "candidate" ("organizationId", LOWER("email"))
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tracking_link_token_active"
ON "tracking_link" ("token")
WHERE "deletedAt" IS NULL;

-- 7. Standard & Composite Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_key" ON "organization"("slug");
CREATE INDEX IF NOT EXISTS "organization_ownerId_idx" ON "organization"("ownerId");

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_member_organizationId_userId_key" ON "organization_member"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "organization_member_userId_idx" ON "organization_member"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_role_permission_organizationId_role_permission_key" ON "organization_role_permission"("organizationId", "role", "permission");
CREATE INDEX IF NOT EXISTS "organization_role_permission_organizationId_idx" ON "organization_role_permission"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "invite_link_token_key" ON "invite_link"("token");
CREATE INDEX IF NOT EXISTS "invite_link_organizationId_status_idx" ON "invite_link"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "job_organizationId_deletedAt_status_createdAt_idx" ON "job"("organizationId", "deletedAt", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "candidate_organizationId_deletedAt_createdAt_idx" ON "candidate"("organizationId", "deletedAt", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "application_candidateId_jobId_key" ON "application"("candidateId", "jobId");
CREATE INDEX IF NOT EXISTS "application_organizationId_jobId_idx" ON "application"("organizationId", "jobId");
CREATE INDEX IF NOT EXISTS "application_organizationId_candidateId_idx" ON "application"("organizationId", "candidateId");
CREATE INDEX IF NOT EXISTS "application_organizationId_stage_idx" ON "application"("organizationId", "stage");
CREATE INDEX IF NOT EXISTS "application_organizationId_createdAt_idx" ON "application"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "application_organizationId_sourceChannel_idx" ON "application"("organizationId", "sourceChannel");
CREATE INDEX IF NOT EXISTS "application_organizationId_trackingLinkId_idx" ON "application"("organizationId", "trackingLinkId");
CREATE INDEX IF NOT EXISTS "application_jobId_stage_idx" ON "application"("jobId", "stage");
CREATE INDEX IF NOT EXISTS "application_candidateId_idx" ON "application"("candidateId");
CREATE INDEX IF NOT EXISTS "application_trackingLinkId_idx" ON "application"("trackingLinkId");

CREATE INDEX IF NOT EXISTS "interview_applicationId_idx" ON "interview"("applicationId");
CREATE INDEX IF NOT EXISTS "interview_organizationId_scheduledAt_idx" ON "interview"("organizationId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "interview_interviewerId_idx" ON "interview"("interviewerId");

CREATE INDEX IF NOT EXISTS "email_template_organizationId_enabled_idx" ON "email_template"("organizationId", "enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "email_flow_config_organizationId_flowKey_key" ON "email_flow_config"("organizationId", "flowKey");
CREATE INDEX IF NOT EXISTS "email_flow_config_organizationId_idx" ON "email_flow_config"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "email_setting_organizationId_key" ON "email_setting"("organizationId");

CREATE INDEX IF NOT EXISTS "email_log_organizationId_sentAt_idx" ON "email_log"("organizationId", "sentAt");
CREATE INDEX IF NOT EXISTS "email_log_candidateId_sentAt_idx" ON "email_log"("candidateId", "sentAt");
CREATE INDEX IF NOT EXISTS "email_log_applicationId_idx" ON "email_log"("applicationId");
CREATE INDEX IF NOT EXISTS "email_log_organizationId_status_idx" ON "email_log"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "email_log_organizationId_createdAt_idx" ON "email_log"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "email_log_scope_createdAt_idx" ON "email_log"("scope", "createdAt");
CREATE INDEX IF NOT EXISTS "email_log_templateId_idx" ON "email_log"("templateId");

CREATE INDEX IF NOT EXISTS "activity_log_applicationId_createdAt_idx" ON "activity_log"("applicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "activity_log_organizationId_candidateId_createdAt_idx" ON "activity_log"("organizationId", "candidateId", "createdAt");
CREATE INDEX IF NOT EXISTS "activity_log_organizationId_createdAt_idx" ON "activity_log"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "activity_log_candidateId_idx" ON "activity_log"("candidateId");

CREATE INDEX IF NOT EXISTS "candidate_document_candidateId_idx" ON "candidate_document"("candidateId");
CREATE INDEX IF NOT EXISTS "candidate_document_organizationId_idx" ON "candidate_document"("organizationId");

CREATE INDEX IF NOT EXISTS "tracking_link_organizationId_deletedAt_isActive_idx" ON "tracking_link"("organizationId", "deletedAt", "isActive");
CREATE INDEX IF NOT EXISTS "tracking_link_jobId_idx" ON "tracking_link"("jobId");
CREATE INDEX IF NOT EXISTS "tracking_link_createdById_idx" ON "tracking_link"("createdById");
CREATE INDEX IF NOT EXISTS "tracking_link_organizationId_isActive_idx" ON "tracking_link"("organizationId", "isActive");

CREATE INDEX IF NOT EXISTS "tracking_click_organizationId_createdAt_idx" ON "tracking_click"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "tracking_click_trackingLinkId_createdAt_idx" ON "tracking_click"("trackingLinkId", "createdAt");
CREATE INDEX IF NOT EXISTS "tracking_click_referrerDomain_idx" ON "tracking_click"("referrerDomain");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_webhook_setting_organizationId_eventType_provider_key" ON "organization_webhook_setting"("organizationId", "eventType", "provider");
CREATE INDEX IF NOT EXISTS "organization_webhook_setting_organizationId_idx" ON "organization_webhook_setting"("organizationId");

CREATE INDEX IF NOT EXISTS "organization_audit_log_organizationId_resource_idx" ON "organization_audit_log"("organizationId", "resource");
CREATE INDEX IF NOT EXISTS "organization_audit_log_organizationId_createdAt_idx" ON "organization_audit_log"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "organization_audit_log_organizationId_action_idx" ON "organization_audit_log"("organizationId", "action");

CREATE INDEX IF NOT EXISTS "platform_audit_log_createdAt_idx" ON "platform_audit_log"("createdAt");
CREATE INDEX IF NOT EXISTS "platform_audit_log_action_idx" ON "platform_audit_log"("action");

CREATE INDEX IF NOT EXISTS "application_note_organizationId_createdAt_idx" ON "application_note"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "application_note_applicationId_createdAt_idx" ON "application_note"("applicationId", "createdAt");

CREATE INDEX IF NOT EXISTS "candidate_note_organizationId_createdAt_idx" ON "candidate_note"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "candidate_note_candidateId_createdAt_idx" ON "candidate_note"("candidateId", "createdAt");

-- 8. Foreign Key Constraints & Audit Retention
ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "organization_ownerId_fkey";
ALTER TABLE "organization" ADD CONSTRAINT "organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_member" DROP CONSTRAINT IF EXISTS "organization_member_organizationId_fkey";
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_member" DROP CONSTRAINT IF EXISTS "organization_member_userId_fkey";
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_role_permission" DROP CONSTRAINT IF EXISTS "organization_role_permission_organizationId_fkey";
ALTER TABLE "organization_role_permission" ADD CONSTRAINT "organization_role_permission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite_link" DROP CONSTRAINT IF EXISTS "invite_link_organizationId_fkey";
ALTER TABLE "invite_link" ADD CONSTRAINT "invite_link_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite_link" DROP CONSTRAINT IF EXISTS "invite_link_createdById_fkey";
ALTER TABLE "invite_link" ADD CONSTRAINT "invite_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job" DROP CONSTRAINT IF EXISTS "job_createdById_fkey";
ALTER TABLE "job" ADD CONSTRAINT "job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job" DROP CONSTRAINT IF EXISTS "job_organizationId_fkey";
ALTER TABLE "job" ADD CONSTRAINT "job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate" DROP CONSTRAINT IF EXISTS "candidate_organizationId_fkey";
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "application_organizationId_fkey";
ALTER TABLE "application" ADD CONSTRAINT "application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "application_candidateId_fkey";
ALTER TABLE "application" ADD CONSTRAINT "application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "application_jobId_fkey";
ALTER TABLE "application" ADD CONSTRAINT "application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "application_trackingLinkId_fkey";
ALTER TABLE "application" ADD CONSTRAINT "application_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "tracking_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "interview" DROP CONSTRAINT IF EXISTS "interview_organizationId_fkey";
ALTER TABLE "interview" ADD CONSTRAINT "interview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interview" DROP CONSTRAINT IF EXISTS "interview_applicationId_fkey";
ALTER TABLE "interview" ADD CONSTRAINT "interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interview" DROP CONSTRAINT IF EXISTS "interview_interviewerId_fkey";
ALTER TABLE "interview" ADD CONSTRAINT "interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_template" DROP CONSTRAINT IF EXISTS "email_template_organizationId_fkey";
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_flow_config" DROP CONSTRAINT IF EXISTS "email_flow_config_organizationId_fkey";
ALTER TABLE "email_flow_config" ADD CONSTRAINT "email_flow_config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_flow_config" DROP CONSTRAINT IF EXISTS "email_flow_config_templateId_fkey";
ALTER TABLE "email_flow_config" ADD CONSTRAINT "email_flow_config_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_setting" DROP CONSTRAINT IF EXISTS "email_setting_organizationId_fkey";
ALTER TABLE "email_setting" ADD CONSTRAINT "email_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Compliance Audit Retention: RESTRICT on organization deletion
ALTER TABLE "email_log" DROP CONSTRAINT IF EXISTS "email_log_organizationId_fkey";
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_log" DROP CONSTRAINT IF EXISTS "email_log_candidateId_fkey";
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_log" DROP CONSTRAINT IF EXISTS "email_log_applicationId_fkey";
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_log" DROP CONSTRAINT IF EXISTS "email_log_templateId_fkey";
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_organizationId_fkey";
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_candidateId_fkey";
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_log" DROP CONSTRAINT IF EXISTS "activity_log_applicationId_fkey";
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "candidate_document" DROP CONSTRAINT IF EXISTS "candidate_document_candidateId_fkey";
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_document" DROP CONSTRAINT IF EXISTS "candidate_document_organizationId_fkey";
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_link" DROP CONSTRAINT IF EXISTS "tracking_link_organizationId_fkey";
ALTER TABLE "tracking_link" ADD CONSTRAINT "tracking_link_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_link" DROP CONSTRAINT IF EXISTS "tracking_link_jobId_fkey";
ALTER TABLE "tracking_link" ADD CONSTRAINT "tracking_link_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tracking_link" DROP CONSTRAINT IF EXISTS "tracking_link_createdById_fkey";
ALTER TABLE "tracking_link" ADD CONSTRAINT "tracking_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tracking_click" DROP CONSTRAINT IF EXISTS "tracking_click_organizationId_fkey";
ALTER TABLE "tracking_click" ADD CONSTRAINT "tracking_click_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_click" DROP CONSTRAINT IF EXISTS "tracking_click_trackingLinkId_fkey";
ALTER TABLE "tracking_click" ADD CONSTRAINT "tracking_click_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "tracking_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_webhook_setting" DROP CONSTRAINT IF EXISTS "organization_webhook_setting_organizationId_fkey";
ALTER TABLE "organization_webhook_setting" ADD CONSTRAINT "organization_webhook_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_audit_log" DROP CONSTRAINT IF EXISTS "organization_audit_log_organizationId_fkey";
ALTER TABLE "organization_audit_log" ADD CONSTRAINT "organization_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_audit_log" DROP CONSTRAINT IF EXISTS "organization_audit_log_actorId_fkey";
ALTER TABLE "organization_audit_log" ADD CONSTRAINT "organization_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "application_note" DROP CONSTRAINT IF EXISTS "application_note_organizationId_fkey";
ALTER TABLE "application_note" ADD CONSTRAINT "application_note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_note" DROP CONSTRAINT IF EXISTS "application_note_applicationId_fkey";
ALTER TABLE "application_note" ADD CONSTRAINT "application_note_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_note" DROP CONSTRAINT IF EXISTS "candidate_note_organizationId_fkey";
ALTER TABLE "candidate_note" ADD CONSTRAINT "candidate_note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_note" DROP CONSTRAINT IF EXISTS "candidate_note_candidateId_fkey";
ALTER TABLE "candidate_note" ADD CONSTRAINT "candidate_note_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
