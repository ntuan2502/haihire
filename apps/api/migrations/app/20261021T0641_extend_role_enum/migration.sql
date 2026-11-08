-- Migration: extend_role_enum (20261021T0641_extend_role_enum)
-- Objective:
--   1. Add new enum values to Postgres enum type "Role": 'OWNER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'
--   2. Map existing users:
--      - Keep ADMIN as ADMIN
--      - Keep MEMBER as MEMBER
--      - Promote earliest created ADMIN user in each organization to OWNER (ensuring at least 1 OWNER per org)

-- Step 1: Add new values to enum "Role"
ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'RECRUITER';
ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'HIRING_MANAGER';
ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'INTERVIEWER';

-- Step 2: Data migration - Select earliest created ADMIN per organization and promote to OWNER
-- Logic explanation:
--   For each organization with at least one ADMIN user, the user with the earliest `createdAt`
--   timestamp is designated as the primary organization OWNER.
--   This guarantees that every active tenant organization has at least one designated OWNER.
WITH earliest_admin AS (
  SELECT DISTINCT ON ("organizationId") id, "organizationId"
  FROM "public"."User"
  WHERE role = 'ADMIN' AND "organizationId" IS NOT NULL
  ORDER BY "organizationId", "createdAt" ASC
)
UPDATE "public"."User"
SET role = 'OWNER'
WHERE id IN (SELECT id FROM earliest_admin);
