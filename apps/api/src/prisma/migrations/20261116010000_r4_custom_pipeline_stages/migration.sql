-- HaiHire R4 Custom Per-Job / Per-Organization Pipeline Stages Migration
-- Expand-and-Contract Step 1:
-- 1. Create "pipeline_stage" table with category mapping to ApplicationStage enum
-- 2. Add nullable "stageId" FK on "application" for backward-compatible dual-write
-- 3. Enable PostgreSQL RLS + grants on "pipeline_stage"
-- 4. Backfill 6 default stages per existing job and link existing applications

CREATE TABLE IF NOT EXISTS "pipeline_stage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT,
  "name" TEXT NOT NULL,
  "category" "ApplicationStage" NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "color" TEXT,
  "isTerminal" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pipeline_stage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pipeline_stage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pipeline_stage_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pipeline_stage_organizationId_jobId_orderIndex_idx"
  ON "pipeline_stage"("organizationId", "jobId", "orderIndex");

ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "stageId" TEXT;

DO $$ BEGIN
  ALTER TABLE "application"
    ADD CONSTRAINT "application_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "application_organizationId_stageId_idx"
  ON "application"("organizationId", "stageId");

-- Permissions and PostgreSQL Row-Level Security on pipeline_stage
GRANT SELECT, INSERT, UPDATE, DELETE ON "pipeline_stage" TO "haihire_rls_user";

ALTER TABLE "pipeline_stage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pipeline_stage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "pipeline_stage";
CREATE POLICY tenant_isolation_policy ON "pipeline_stage"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- Backfill 6 default stages for every existing job that does not yet have stages
WITH defaults("name", "category", "orderIndex", "isTerminal") AS (
  VALUES
    ('Applied',   'APPLIED'::"ApplicationStage",   0, false),
    ('Screening', 'SCREENING'::"ApplicationStage", 1, false),
    ('Interview', 'INTERVIEW'::"ApplicationStage", 2, false),
    ('Offer',     'OFFER'::"ApplicationStage",     3, false),
    ('Hired',     'HIRED'::"ApplicationStage",     4, true),
    ('Rejected',  'REJECTED'::"ApplicationStage",  5, true)
)
INSERT INTO "pipeline_stage" ("id", "organizationId", "jobId", "name", "category", "orderIndex", "isTerminal", "updatedAt")
SELECT
  gen_random_uuid()::text,
  j."organizationId",
  j."id",
  d."name",
  d."category",
  d."orderIndex",
  d."isTerminal",
  NOW()
FROM "job" j
CROSS JOIN defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stage" ps
  WHERE ps."jobId" = j."id" AND ps."category" = d."category"
);

-- Link existing applications to their matching job default stageId
UPDATE "application" a
SET "stageId" = ps."id"
FROM "pipeline_stage" ps
WHERE a."stageId" IS NULL
  AND ps."jobId" = a."jobId"
  AND ps."category" = a."stage";
