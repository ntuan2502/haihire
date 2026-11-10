-- ============================================================================
-- Migration: 20261109T1030_rename_tables_to_snake_case.sql
-- Description: Safely migrate legacy PascalCase and camelCase tables to snake_case
--              using ALTER TABLE ... RENAME TO to guarantee zero data loss.
--              Also deduplicates duplicate organization memberships and adds
--              the unique constraint on (organizationId, userId).
-- ============================================================================

CREATE OR REPLACE PROCEDURE rename_table_if_exists(legacy_name text, target_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = legacy_name
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = target_name
  ) THEN
    EXECUTE format('ALTER TABLE "public".%I RENAME TO %I', legacy_name, target_name);
    RAISE NOTICE 'Renamed table % to %', legacy_name, target_name;
  END IF;
END;
$$;

DO $$
BEGIN
  -- 1. Core models
  CALL rename_table_if_exists('Organization', 'organization');
  CALL rename_table_if_exists('User', 'user');

  -- 2. Organization members and permissions
  CALL rename_table_if_exists('OrganizationMember', 'organization_member');
  CALL rename_table_if_exists('organizationMember', 'organization_member');
  CALL rename_table_if_exists('OrganizationRolePermission', 'organization_role_permission');
  CALL rename_table_if_exists('organizationRolePermission', 'organization_role_permission');

  -- 3. Invite links
  CALL rename_table_if_exists('InviteLink', 'invite_link');
  CALL rename_table_if_exists('OrganizationInviteLink', 'invite_link');
  CALL rename_table_if_exists('organizationInviteLink', 'invite_link');

  -- 4. Recruitment models
  CALL rename_table_if_exists('Job', 'job');
  CALL rename_table_if_exists('Candidate', 'candidate');
  CALL rename_table_if_exists('Application', 'application');
  CALL rename_table_if_exists('Interview', 'interview');

  -- 5. Email models
  CALL rename_table_if_exists('EmailTemplate', 'email_template');
  CALL rename_table_if_exists('emailTemplate', 'email_template');
  CALL rename_table_if_exists('EmailSetting', 'email_setting');
  CALL rename_table_if_exists('emailSetting', 'email_setting');
  CALL rename_table_if_exists('EmailLog', 'email_log');
  CALL rename_table_if_exists('emailLog', 'email_log');

  -- 6. Activities & candidate documents
  CALL rename_table_if_exists('ActivityLog', 'activity_log');
  CALL rename_table_if_exists('activityLog', 'activity_log');
  CALL rename_table_if_exists('CandidateDocument', 'candidate_document');
  CALL rename_table_if_exists('candidateDocument', 'candidate_document');

  -- 7. Sourcing / tracking links & clicks
  CALL rename_table_if_exists('TrackingLink', 'tracking_link');
  CALL rename_table_if_exists('trackingLink', 'tracking_link');
  CALL rename_table_if_exists('TrackingClick', 'tracking_click');
  CALL rename_table_if_exists('trackingClick', 'tracking_click');

  -- 8. Webhook settings & audit logs
  CALL rename_table_if_exists('OrganizationWebhookSetting', 'organization_webhook_setting');
  CALL rename_table_if_exists('organizationWebhookSetting', 'organization_webhook_setting');
  CALL rename_table_if_exists('OrganizationAuditLog', 'organization_audit_log');
  CALL rename_table_if_exists('organizationAuditLog', 'organization_audit_log');
  CALL rename_table_if_exists('PlatformAuditLog', 'platform_audit_log');
  CALL rename_table_if_exists('platformAuditLog', 'platform_audit_log');
END $$;

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS rename_table_if_exists(text, text);

-- 9. Deduplicate organization memberships and apply unique constraint (H-08)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organization_member'
  ) THEN
    -- Delete older duplicate memberships, keeping the latest one
    DELETE FROM "public"."organization_member" a
    USING "public"."organization_member" b
    WHERE a."organizationId" = b."organizationId"
      AND a."userId" = b."userId"
      AND a."createdAt" < b."createdAt";

    -- Create unique constraint if it does not exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'organization_member_organizationId_userId_key'
    ) THEN
      ALTER TABLE "public"."organization_member"
      ADD CONSTRAINT "organization_member_organizationId_userId_key"
      UNIQUE ("organizationId", "userId");
    END IF;
  END IF;
END $$;
