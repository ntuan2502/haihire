CREATE TABLE "notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3)
);
CREATE INDEX "notification_organizationId_userId_createdAt_idx" ON "notification" ("organizationId", "userId", "createdAt");
CREATE INDEX "notification_userId_idx" ON "notification" ("userId");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notification" TO "haihire_rls_user";
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notification"
  USING (current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), ''));
