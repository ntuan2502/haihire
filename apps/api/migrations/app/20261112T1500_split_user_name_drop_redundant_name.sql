-- Migration: Enable PostgreSQL unaccent extension, split user.name into firstName/lastName,
-- and remove redundant name columns from both user and candidate tables.
-- Timestamp: 2026-11-12T15:00:00Z

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "firstName" text NOT NULL DEFAULT '';

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "lastName" text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'user'
      AND column_name = 'name'
  ) THEN
    -- Upgrade legacy demo user names first
    UPDATE "user"
    SET "firstName" = 'Demo', "lastName" = 'Admin'
    WHERE "email" = 'admin@tun.io.vn'
      AND COALESCE("firstName", '') = ''
      AND COALESCE("lastName", '') = ''
      AND TRIM("name") IN ('Admin', 'Demo Admin');

    UPDATE "user"
    SET "firstName" = 'Demo', "lastName" = 'Member'
    WHERE "email" = 'member@tun.io.vn'
      AND COALESCE("firstName", '') = ''
      AND COALESCE("lastName", '') = ''
      AND TRIM("name") IN ('Member', 'Demo Member');

    UPDATE "user"
    SET "firstName" = 'Beta', "lastName" = 'Admin'
    WHERE "email" = 'admin@beta.test'
      AND COALESCE("firstName", '') = ''
      AND COALESCE("lastName", '') = ''
      AND TRIM("name") = 'Beta Admin';

    -- Split remaining user names cleanly (last token -> firstName, leading tokens -> lastName)
    UPDATE "user"
    SET
      "firstName" = CASE
        WHEN position(' ' IN regexp_replace(TRIM("name"), '\s+', ' ', 'g')) = 0
          THEN regexp_replace(TRIM("name"), '\s+', ' ', 'g')
        ELSE regexp_replace(regexp_replace(TRIM("name"), '\s+', ' ', 'g'), '^.*\s+', '')
      END,
      "lastName" = CASE
        WHEN position(' ' IN regexp_replace(TRIM("name"), '\s+', ' ', 'g')) = 0
          THEN ''
        ELSE regexp_replace(regexp_replace(TRIM("name"), '\s+', ' ', 'g'), '\s+\S+$', '')
      END
    WHERE COALESCE("firstName", '') = ''
      AND COALESCE("lastName", '') = ''
      AND COALESCE(TRIM("name"), '') <> '';

    ALTER TABLE "user" DROP COLUMN IF EXISTS "name";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'candidate'
      AND column_name = 'name'
  ) THEN
    -- Safety backfill any legacy candidate rows missing structured firstName/lastName
    UPDATE "candidate"
    SET
      "firstName" = CASE
        WHEN position(' ' IN regexp_replace(TRIM("name"), '\s+', ' ', 'g')) = 0
          THEN regexp_replace(TRIM("name"), '\s+', ' ', 'g')
        ELSE regexp_replace(regexp_replace(TRIM("name"), '\s+', ' ', 'g'), '^.*\s+', '')
      END,
      "lastName" = CASE
        WHEN position(' ' IN regexp_replace(TRIM("name"), '\s+', ' ', 'g')) = 0
          THEN ''
        ELSE regexp_replace(regexp_replace(TRIM("name"), '\s+', ' ', 'g'), '\s+\S+$', '')
      END
    WHERE COALESCE(TRIM("firstName"), '') = ''
      AND COALESCE(TRIM("lastName"), '') = ''
      AND COALESCE(TRIM("name"), '') <> '';

    ALTER TABLE "candidate" DROP COLUMN IF EXISTS "name";
  END IF;
END $$;
