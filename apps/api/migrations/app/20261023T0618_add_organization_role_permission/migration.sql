CREATE TABLE "public"."organizationRolePermission" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "granted" boolean DEFAULT true NOT NULL,
  "id" text NOT NULL,
  "organizationId" text NOT NULL,
  "permission" text NOT NULL,
  "role" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "organizationRolePermission_role_check_24976965" CHECK ("role" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER'))
);

ALTER TABLE "public"."organizationRolePermission" ADD CONSTRAINT "organizationRolePermission_organizationId_role_permission_key" UNIQUE ("organizationId", "role", "permission");

CREATE INDEX "organizationRolePermission_organizationId_idx_2e17ef41" ON "public"."organizationRolePermission" ("organizationId");

ALTER TABLE "public"."organizationRolePermission"
ADD CONSTRAINT "organizationRolePermission_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "public"."organization" ("id")
ON DELETE CASCADE;
