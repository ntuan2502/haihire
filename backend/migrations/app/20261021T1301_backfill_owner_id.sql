-- Migration 1: Backfill ownerId (20261021T1301_backfill_owner_id)
-- Objective:
--   1. For each organization with ownerId IS NULL, backfill ownerId from earliest created OWNER user.
--   2. Fallback: if no OWNER user exists, backfill from earliest created ADMIN user.
--   3. Fail-safe: if any organization has no users (orphan organization), abort with exception.

DO $$
DECLARE
  v_orphan_count INT;
  v_orphan_slugs TEXT;
BEGIN
  -- Step 1: Backfill from user with role = 'OWNER'
  UPDATE "public"."organization" o
  SET "ownerId" = (
    SELECT u.id
    FROM "public"."user" u
    WHERE u."organizationId" = o.id AND u.role = 'OWNER'
    ORDER BY u."createdAt" ASC
    LIMIT 1
  )
  WHERE o."ownerId" IS NULL;

  -- Step 2: Fallback to earliest created ADMIN user if ownerId is still NULL
  UPDATE "public"."organization" o
  SET "ownerId" = (
    SELECT u.id
    FROM "public"."user" u
    WHERE u."organizationId" = o.id AND u.role = 'ADMIN'
    ORDER BY u."createdAt" ASC
    LIMIT 1
  )
  WHERE o."ownerId" IS NULL;

  -- Step 3: Check for orphan organizations (organizations with 0 users where ownerId is still NULL)
  SELECT COUNT(*), string_agg(slug, ', ')
  INTO v_orphan_count, v_orphan_slugs
  FROM "public"."organization"
  WHERE "ownerId" IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Cannot complete backfill: Found % orphan organization(s) with no eligible owner user: %', v_orphan_count, v_orphan_slugs;
  END IF;
END $$;
