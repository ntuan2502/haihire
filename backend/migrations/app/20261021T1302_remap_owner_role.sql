-- Migration 2: Remap role data (20261021T1302_remap_owner_role)
-- Objective:
--   Remap all legacy 'OWNER' role assignments to 'ADMIN' across user and organizationMember tables.
--   In ADR-003, 'OWNER' role is deprecated and ownership is resolved dynamically via Organization.ownerId.

BEGIN;

UPDATE "public"."user"
SET role = 'ADMIN'
WHERE role = 'OWNER';

UPDATE "public"."organizationMember"
SET role = 'ADMIN'
WHERE role = 'OWNER';

COMMIT;
