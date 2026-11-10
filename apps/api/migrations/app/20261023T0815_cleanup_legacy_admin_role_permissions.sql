-- Migration: Cleanup Legacy Admin Role Permission Overrides (20261023T0815_cleanup_legacy_admin_role_permissions)
-- Objective:
--   Ensure zero override records exist for role = 'ADMIN' in organizationRolePermission.
--   In accordance with the immutable ADMIN role security policy, all permissions for ADMIN
--   are unconditionally granted in code and must never have custom DB overrides.

DELETE FROM "public"."organizationRolePermission"
WHERE "role" = 'ADMIN';
