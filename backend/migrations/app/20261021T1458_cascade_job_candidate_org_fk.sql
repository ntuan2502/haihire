-- Migration: cascade_job_candidate_org_fk (20261021T1458_cascade_job_candidate_org_fk)
-- Objective:
--   1. Drop NO ACTION foreign key constraint job_organizationId_fkey on table job
--   2. Re-create foreign key constraint job_organizationId_fkey with ON DELETE CASCADE
--   3. Drop NO ACTION foreign key constraint candidate_organizationId_fkey on table candidate
--   4. Re-create foreign key constraint candidate_organizationId_fkey with ON DELETE CASCADE

BEGIN;

-- Step 1 & 2: Update Job foreign key
ALTER TABLE "public"."job" DROP CONSTRAINT IF EXISTS "job_organizationId_fkey";
ALTER TABLE "public"."job"
  ADD CONSTRAINT "job_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "public"."organization" ("id")
  ON DELETE CASCADE;

-- Step 3 & 4: Update Candidate foreign key
ALTER TABLE "public"."candidate" DROP CONSTRAINT IF EXISTS "candidate_organizationId_fkey";
ALTER TABLE "public"."candidate"
  ADD CONSTRAINT "candidate_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "public"."organization" ("id")
  ON DELETE CASCADE;

COMMIT;
