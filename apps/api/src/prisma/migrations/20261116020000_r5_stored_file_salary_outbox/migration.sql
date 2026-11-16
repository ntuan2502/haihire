-- HaiHire R5 Deep Schema Normalization Migration
-- 1. Structured Job salary fields (salaryMin, salaryMax, salaryCurrency)
-- 2. StoredFile normalized storage registry (linked by Candidate, Application, CandidateDocument)
-- 3. OutboxEvent transactional outbox table for reliable async event delivery
-- 4. RLS policies on stored_file and outbox_event

ALTER TABLE "job"
  ADD COLUMN IF NOT EXISTS "salaryMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "salaryMax" INTEGER,
  ADD COLUMN IF NOT EXISTS "salaryCurrency" VARCHAR(10);

CREATE TABLE IF NOT EXISTS "stored_file" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "bucket" TEXT NOT NULL DEFAULT 'haihire-resumes',
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stored_file_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stored_file_objectKey_key" ON "stored_file"("objectKey");
CREATE INDEX IF NOT EXISTS "stored_file_organizationId_createdAt_idx" ON "stored_file"("organizationId", "createdAt");

CREATE TABLE IF NOT EXISTS "outbox_event" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "outbox_event_status_nextAttemptAt_idx" ON "outbox_event"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "outbox_event_organizationId_createdAt_idx" ON "outbox_event"("organizationId", "createdAt");

ALTER TABLE "candidate" ADD COLUMN IF NOT EXISTS "resumeFileId" TEXT;
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "resumeFileId" TEXT;
ALTER TABLE "candidate_document" ADD COLUMN IF NOT EXISTS "storedFileId" TEXT;

DO $$ BEGIN
  ALTER TABLE "candidate"
    ADD CONSTRAINT "candidate_resumeFileId_fkey"
    FOREIGN KEY ("resumeFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "application"
    ADD CONSTRAINT "application_resumeFileId_fkey"
    FOREIGN KEY ("resumeFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "candidate_document"
    ADD CONSTRAINT "candidate_document_storedFileId_fkey"
    FOREIGN KEY ("storedFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "stored_file", "outbox_event" TO "haihire_rls_user";

DO $$
DECLARE
  tbl text;
  r5_tables text[] := ARRAY['stored_file', 'outbox_event'];
BEGIN
  FOREACH tbl IN ARRAY r5_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       USING (
         current_setting(''app.bypass_rls'', true) = ''on''
         OR "organizationId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')
       )
       WITH CHECK (
         current_setting(''app.bypass_rls'', true) = ''on''
         OR "organizationId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')
       );',
      tbl
    );
  END LOOP;
END $$;
