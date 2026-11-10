-- ============================================================================
-- Migration: 20261109T1030_rename_tables_to_snake_case_down.sql
-- Description: Rollback snake_case tables back to legacy PascalCase names.
-- ============================================================================

CREATE OR REPLACE PROCEDURE rollback_table_rename(current_name text, legacy_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = current_name
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = legacy_name
  ) THEN
    EXECUTE format('ALTER TABLE "public".%I RENAME TO %I', current_name, legacy_name);
    RAISE NOTICE 'Rolled back table % to %', current_name, legacy_name;
  END IF;
END;
$$;

DO $$
BEGIN
  -- Drop unique constraint if rollback is needed
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_member_organizationId_userId_key'
  ) THEN
    ALTER TABLE "public"."organization_member"
    DROP CONSTRAINT "organization_member_organizationId_userId_key";
  END IF;

  CALL rollback_table_rename('platform_audit_log', 'PlatformAuditLog');
  CALL rollback_table_rename('organization_audit_log', 'OrganizationAuditLog');
  CALL rollback_table_rename('organization_webhook_setting', 'OrganizationWebhookSetting');
  CALL rollback_table_rename('tracking_click', 'TrackingClick');
  CALL rollback_table_rename('tracking_link', 'TrackingLink');
  CALL rollback_table_rename('candidate_document', 'CandidateDocument');
  CALL rollback_table_rename('activity_log', 'ActivityLog');
  CALL rollback_table_rename('email_log', 'EmailLog');
  CALL rollback_table_rename('email_setting', 'EmailSetting');
  CALL rollback_table_rename('email_template', 'EmailTemplate');
  CALL rollback_table_rename('interview', 'Interview');
  CALL rollback_table_rename('application', 'Application');
  CALL rollback_table_rename('candidate', 'Candidate');
  CALL rollback_table_rename('job', 'Job');
  CALL rollback_table_rename('invite_link', 'InviteLink');
  CALL rollback_table_rename('organization_role_permission', 'OrganizationRolePermission');
  CALL rollback_table_rename('organization_member', 'OrganizationMember');
  CALL rollback_table_rename('user', 'User');
  CALL rollback_table_rename('organization', 'Organization');
END $$;

DROP PROCEDURE IF EXISTS rollback_table_rename(text, text);
