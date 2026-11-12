-- Migration: Expand email templates into multi-template library with EmailFlowConfig bindings
-- Timestamp: 2026-11-12T12:30:00Z

DO $$
BEGIN
  CREATE TYPE "EmailFlowKey" AS ENUM (
    'APPLICATION_RECEIVED',
    'INTERVIEW_SCHEDULED',
    'APPLICATION_REJECTED',
    'APPLICATION_OFFER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "email_template"
  ADD COLUMN IF NOT EXISTS "isSystem" boolean NOT NULL DEFAULT false;

ALTER TABLE "email_template"
  ALTER COLUMN "type" SET DEFAULT 'CUSTOM'::"EmailTemplateType";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'email_template'
      AND indexname = 'email_template_organizationId_type_key'
  ) THEN
    UPDATE "email_template"
    SET "isSystem" = true
    WHERE "type" IN (
      'APPLICATION_CONFIRMATION'::"EmailTemplateType",
      'INTERVIEW_INVITATION'::"EmailTemplateType",
      'REJECTION'::"EmailTemplateType",
      'OFFER'::"EmailTemplateType",
      'CUSTOM'::"EmailTemplateType"
    );

    ALTER TABLE "email_template"
      DROP CONSTRAINT IF EXISTS "email_template_organizationId_type_key";
    DROP INDEX IF EXISTS "email_template_organizationId_type_key";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "email_template_organizationId_enabled_idx"
  ON "email_template" ("organizationId", "enabled");

CREATE TABLE IF NOT EXISTS "email_flow_config" (
  "id" text NOT NULL,
  "organizationId" text NOT NULL,
  "flowKey" "EmailFlowKey" NOT NULL,
  "templateId" text,
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_flow_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_flow_config_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "email_flow_config_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_flow_config_organizationId_flowKey_key"
  ON "email_flow_config" ("organizationId", "flowKey");

CREATE INDEX IF NOT EXISTS "email_flow_config_organizationId_idx"
  ON "email_flow_config" ("organizationId");

ALTER TABLE "email_log"
  ADD COLUMN IF NOT EXISTS "templateId" text,
  ADD COLUMN IF NOT EXISTS "templateName" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_log_templateId_fkey'
  ) THEN
    ALTER TABLE "email_log"
      ADD CONSTRAINT "email_log_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "email_log_templateId_idx"
  ON "email_log" ("templateId");

-- Backfill 4 standard email flow configs for organizations that already have templates
WITH flow_mapping ("flowKey", "templateType") AS (
  VALUES
    ('APPLICATION_RECEIVED'::"EmailFlowKey", 'APPLICATION_CONFIRMATION'::"EmailTemplateType"),
    ('INTERVIEW_SCHEDULED'::"EmailFlowKey", 'INTERVIEW_INVITATION'::"EmailTemplateType"),
    ('APPLICATION_REJECTED'::"EmailFlowKey", 'REJECTION'::"EmailTemplateType"),
    ('APPLICATION_OFFER'::"EmailFlowKey", 'OFFER'::"EmailTemplateType")
),
orgs_with_templates AS (
  SELECT DISTINCT "organizationId" FROM "email_template"
)
INSERT INTO "email_flow_config" (
  "id",
  "organizationId",
  "flowKey",
  "templateId",
  "enabled",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  o."organizationId",
  m."flowKey",
  t."id",
  COALESCE(t."enabled", false),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM orgs_with_templates o
CROSS JOIN flow_mapping m
LEFT JOIN LATERAL (
  SELECT et."id", et."enabled"
  FROM "email_template" et
  WHERE et."organizationId" = o."organizationId"
    AND et."type" = m."templateType"
  ORDER BY et."isSystem" DESC, et."createdAt" ASC
  LIMIT 1
) t ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM "email_flow_config" fc
  WHERE fc."organizationId" = o."organizationId"
    AND fc."flowKey" = m."flowKey"
);
