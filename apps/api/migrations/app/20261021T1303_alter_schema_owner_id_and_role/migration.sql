-- Migration: alter_schema_owner_id_and_role (20261021T1303_alter_schema_owner_id_and_role)
-- Objective:
--   1. Drop check constraints allowing 'OWNER' role
--   2. Make organization.ownerId NOT NULL
--   3. Add new check constraints allowing only: 'ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER'
--   4. Add index on organization.ownerId
--   5. Add foreign key constraint from organization.ownerId to user.id with ON DELETE RESTRICT

BEGIN;

ALTER TABLE "public"."inviteLink" DROP CONSTRAINT IF EXISTS "inviteLink_role_check_d55e7365";
ALTER TABLE "public"."organizationMember" DROP CONSTRAINT IF EXISTS "organizationMember_role_check_d55e7365";
ALTER TABLE "public"."user" DROP CONSTRAINT IF EXISTS "user_role_check_d55e7365";

ALTER TABLE "public"."organization" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "public"."inviteLink" ADD CONSTRAINT "inviteLink_role_check_24976965" CHECK ("role" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER'));
ALTER TABLE "public"."organizationMember" ADD CONSTRAINT "organizationMember_role_check_24976965" CHECK ("role" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER'));
ALTER TABLE "public"."user" ADD CONSTRAINT "user_role_check_24976965" CHECK ("role" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER'));

CREATE INDEX IF NOT EXISTS "organization_ownerId_idx_e2d0c1ef" ON "public"."organization" ("ownerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_ownerId_fkey'
  ) THEN
    ALTER TABLE "public"."organization"
    ADD CONSTRAINT "organization_ownerId_fkey"
    FOREIGN KEY ("ownerId")
    REFERENCES "public"."user" ("id")
    ON DELETE RESTRICT;
  END IF;
END $$;

COMMIT;
