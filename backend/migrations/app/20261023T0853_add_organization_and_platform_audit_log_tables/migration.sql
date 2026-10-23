CREATE TABLE "public"."organizationAuditLog" (
  "action" text NOT NULL,
  "actorId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "metadata" text,
  "organizationId" text NOT NULL,
  "resource" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "organizationAuditLog_actorId_idx_a58f6b4b" ON "public"."organizationAuditLog" ("actorId");
CREATE INDEX "organizationAuditLog_organizationId_action_idx_9ecdfcf3" ON "public"."organizationAuditLog" ("organizationId", "action");
CREATE INDEX "organizationAuditLog_organizationId_createdAt_idx_c52d1cc3" ON "public"."organizationAuditLog" ("organizationId", "createdAt");
CREATE INDEX "organizationAuditLog_organizationId_idx_2e17ef41" ON "public"."organizationAuditLog" ("organizationId");

ALTER TABLE "public"."organizationAuditLog"
ADD CONSTRAINT "organizationAuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "public"."organization" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."organizationAuditLog"
ADD CONSTRAINT "organizationAuditLog_actorId_fkey"
FOREIGN KEY ("actorId")
REFERENCES "public"."user" ("id")
ON DELETE SET NULL;

CREATE TABLE "public"."platformAuditLog" (
  "action" text NOT NULL,
  "actorId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "metadata" text,
  "organizationId" text NOT NULL,
  "resource" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "platformAuditLog_action_idx_cd0d2116" ON "public"."platformAuditLog" ("action");
CREATE INDEX "platformAuditLog_createdAt_idx_9575dbd7" ON "public"."platformAuditLog" ("createdAt");
