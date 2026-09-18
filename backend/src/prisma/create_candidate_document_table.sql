CREATE TABLE IF NOT EXISTS "candidateDocument" (
  "id" text PRIMARY KEY,
  "candidateId" text NOT NULL REFERENCES "candidate"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "size" integer,
  "mimeType" text DEFAULT 'application/pdf',
  "type" text DEFAULT 'Resume',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_candidate_doc_candidate" ON "candidateDocument"("candidateId");
CREATE INDEX IF NOT EXISTS "idx_candidate_doc_org" ON "candidateDocument"("organizationId");
