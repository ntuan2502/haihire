CREATE TABLE IF NOT EXISTS "emailTemplate" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "enabled" boolean DEFAULT true,
  "variables" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  UNIQUE ("organizationId", "type")
);

CREATE TABLE IF NOT EXISTS "emailSetting" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL UNIQUE REFERENCES "organization"("id") ON DELETE CASCADE,
  "provider" text DEFAULT 'SIMULATED',
  "fromName" text DEFAULT 'Recruitment Team',
  "fromEmail" text DEFAULT 'careers@workspace.com',
  "smtpHost" text,
  "smtpPort" integer,
  "smtpUser" text,
  "smtpPass" text,
  "smtpSecure" boolean DEFAULT true,
  "resendApiKey" text,
  "sendgridApiKey" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "emailLog" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "candidateId" text REFERENCES "candidate"("id") ON DELETE SET NULL,
  "applicationId" text REFERENCES "application"("id") ON DELETE SET NULL,
  "senderId" text,
  "senderName" text NOT NULL,
  "senderEmail" text NOT NULL,
  "recipientEmail" text NOT NULL,
  "recipientName" text NOT NULL,
  "templateType" text DEFAULT 'CUSTOM',
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'SENT',
  "errorMessage" text,
  "sentAt" timestamptz DEFAULT now(),
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "activityLog" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "candidateId" text NOT NULL REFERENCES "candidate"("id") ON DELETE CASCADE,
  "applicationId" text REFERENCES "application"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "actorId" text,
  "actorName" text NOT NULL,
  "actorRole" text,
  "metadata" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_log_org" ON "emailLog"("organizationId");
CREATE INDEX IF NOT EXISTS "idx_email_log_candidate" ON "emailLog"("candidateId");
CREATE INDEX IF NOT EXISTS "idx_activity_log_candidate" ON "activityLog"("candidateId");
CREATE INDEX IF NOT EXISTS "idx_activity_log_org" ON "activityLog"("organizationId");
