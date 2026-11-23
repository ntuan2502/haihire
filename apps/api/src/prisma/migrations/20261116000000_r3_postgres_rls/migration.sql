-- HaiHire R3 PostgreSQL Row-Level Security (RLS) Migration
-- 1. Provision non-superuser application role (NOSUPERUSER NOBYPASSRLS) so FORCE ROW LEVEL SECURITY applies
-- 2. Enforce tenant isolation policies driven by transaction-local GUC settings:
--    app.current_tenant_id and app.bypass_rls

DO $$ BEGIN
  CREATE ROLE "haihire_rls_user" NOLOGIN NOSUPERUSER NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT USAGE ON SCHEMA public TO "haihire_rls_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "haihire_rls_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "haihire_rls_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "haihire_rls_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "haihire_rls_user";

-- Enable & force RLS across all 17 tenant-owned tables (organizationId NOT NULL) + email_log
DO $$
DECLARE
  tbl text;
  rls_tables text[] := ARRAY[
    'job',
    'candidate',
    'application',
    'interview',
    'candidate_document',
    'application_note',
    'candidate_note',
    'activity_log',
    'tracking_link',
    'tracking_click',
    'email_template',
    'email_flow_config',
    'email_setting',
    'email_log',
    'organization_role_permission',
    'organization_webhook_setting',
    'organization_audit_log',
    'invite_link'
  ];
BEGIN
  FOREACH tbl IN ARRAY rls_tables LOOP
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
