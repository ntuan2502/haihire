CREATE TABLE "notification_preference" (
  "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "applicationWebsite" BOOLEAN NOT NULL DEFAULT true,
  "interviewWebsite" BOOLEAN NOT NULL DEFAULT true,
  "applicationEmail" BOOLEAN NOT NULL DEFAULT false,
  "interviewEmail" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("organizationId", "userId")
);
CREATE INDEX "notification_preference_userId_idx" ON "notification_preference" ("userId");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notification_preference" TO "haihire_rls_user";
ALTER TABLE "notification_preference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preference" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notification_preference"
  USING (current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
