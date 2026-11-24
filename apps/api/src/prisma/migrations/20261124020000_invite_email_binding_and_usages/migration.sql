ALTER TABLE "invite_link"
  ADD COLUMN IF NOT EXISTS "invitedEmail" TEXT;

CREATE INDEX IF NOT EXISTS "invite_link_organizationId_invitedEmail_status_idx"
  ON "invite_link"("organizationId", "invitedEmail", "status");

CREATE TABLE IF NOT EXISTS "invite_link_usage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "inviteLinkId" TEXT NOT NULL REFERENCES "invite_link"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "userEmailSnapshot" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "invite_link_usage_inviteLinkId_usedAt_idx"
  ON "invite_link_usage"("inviteLinkId", "usedAt");

CREATE INDEX IF NOT EXISTS "invite_link_usage_organizationId_usedAt_idx"
  ON "invite_link_usage"("organizationId", "usedAt");

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invite_link_usage" TO "haihire_rls_user";

ALTER TABLE "invite_link_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invite_link_usage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "invite_link_usage";
CREATE POLICY tenant_isolation_policy ON "invite_link_usage"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
  );
