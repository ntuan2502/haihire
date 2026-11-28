-- Stage 4: Schema index cleanup, retention & hot-path indexes, notification metadata, and RLS hardening

-- 1. Drop redundant left-prefix indexes already covered by unique/composite indexes
DROP INDEX IF EXISTS "organization_member_userId_idx";
DROP INDEX IF EXISTS "organization_role_permission_organizationId_idx";
DROP INDEX IF EXISTS "email_flow_config_organizationId_idx";
DROP INDEX IF EXISTS "organization_webhook_setting_organizationId_idx";
DROP INDEX IF EXISTS "organization_ai_feature_route_organizationId_idx";

-- 2. Add Notification.metadata for durable display metadata across hard-deletes/transitions
ALTER TABLE "notification"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 3. Create missing hot-path & data retention indexes
CREATE INDEX IF NOT EXISTS "candidate_organizationId_deletedAt_email_idx"
  ON "candidate"("organizationId", "deletedAt", "email");

CREATE INDEX IF NOT EXISTS "tracking_link_token_idx"
  ON "tracking_link"("token");

CREATE INDEX IF NOT EXISTS "tracking_click_createdAt_idx"
  ON "tracking_click"("createdAt");

CREATE INDEX IF NOT EXISTS "user_session_expiresAt_idx"
  ON "user_session"("expiresAt");

CREATE INDEX IF NOT EXISTS "user_security_log_createdAt_idx"
  ON "user_security_log"("createdAt");

CREATE INDEX IF NOT EXISTS "notification_organizationId_userId_readAt_createdAt_idx"
  ON "notification"("organizationId", "userId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "notification_createdAt_idx"
  ON "notification"("createdAt");

-- Best-effort pg_trgm index for fast candidate email/name ILIKE substring search
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS "candidate_email_trgm_idx"
    ON "candidate" USING GIN ("email" gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Ensure haihire_rls_user grants and extend FORCE ROW LEVEL SECURITY to organization_member & platform_audit_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'haihire_rls_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "haihire_rls_user";
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "haihire_rls_user";
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
  stage4_rls_tables text[] := ARRAY['organization_member', 'platform_audit_log'];
BEGIN
  FOREACH tbl IN ARRAY stage4_rls_tables LOOP
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
