# Phase 3 Branch 2 — Task 2 Report: Database Migration & Schema Update

> **Task ID:** P3-N2-TASK2  
> **Commit Subject:** `feat(db): migrate ownership to ownerid and deprecate owner role enum`  
> **Branch:** `refactor/p3-branch2-ownerid-first`  
> **Status:** PASSED (14/14 CI Gates)

---

## 1. What Changed

1. **3 Step Database Migrations in `backend/migrations/app/`:**
   - `20261021T1301_backfill_owner_id.sql`: Backfills `organization.ownerId` from earliest created `OWNER` user; fallbacks to earliest created `ADMIN` user; asserts no orphan organizations remain.
   - `20261021T1302_remap_owner_role.sql`: Remaps legacy `role = 'OWNER'` to `'ADMIN'` across `"user"` and `"organizationMember"` tables.
   - `20261021T1303_alter_schema_owner_id_and_role.sql`: Drops check constraints permitting `'OWNER'`, sets `organization.ownerId NOT NULL`, adds new check constraints for `Role` (`ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`), creates `organization_ownerId_idx_e2d0c1ef`, and adds foreign key constraint `organization_ownerId_fkey` (`ownerId` -> `user(id)` `ON DELETE RESTRICT`).
   - Prisma 8 migration package in `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role/` with self-emitted `ops.json` (9 operations), `migration.ts`, `migration.json` (hash `a44c619b...`), and `migration.sql`.

2. **Prisma Contract Update (`backend/src/prisma/contract.prisma`):**
   - Removed `OWNER` from `enum Role`.
   - Updated `Organization`: `ownerId String` (non-nullable), `owner User @relation("OrganizationOwner", ...)`, `users User[] @relation("OrganizationUsers")`, `@@index([ownerId])`.
   - Updated `User`: `organization Organization? @relation("OrganizationUsers", ...)`, `ownedOrganizations Organization[] @relation("OrganizationOwner")`.
   - Emitted updated contract artifacts (`contract.json`, `contract.d.ts`).

3. **Seeding Logic (`backend/src/prisma/seed.ts`):**
   - Updated cleanup to break mutual circular references (`User.organizationId` and `Organization.ownerId`) before deleting organizations and users.
   - Pre-creates `adminUserId` and `betaAdminUserId` before inserting organizations to satisfy the new `organization_ownerId_fkey` constraint.

---

## 2. Files Touched

- `backend/migrations/app/20261021T1301_backfill_owner_id.sql` (new)
- `backend/migrations/app/20261021T1302_remap_owner_role.sql` (new)
- `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role.sql` (new)
- `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role/migration.json` (new)
- `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role/migration.sql` (new)
- `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role/migration.ts` (new)
- `backend/migrations/app/20261021T1303_alter_schema_owner_id_and_role/ops.json` (new)
- `backend/migrations/app/refs/db.json` (updated ref to `0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b`)
- `backend/migrations/snapshots/0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b/` (new snapshot)
- `backend/src/prisma/contract.prisma`
- `backend/src/prisma/contract.json`
- `backend/src/prisma/contract.d.ts`
- `backend/src/prisma/seed.ts`
- `.gitignore` (unignore `!backend/migrations/**/*.sql`)

---

## 3. Database Schema Evidence

```text
Table "public.organization"
  Column   |           Type           | Collation | Nullable | Default
-----------+--------------------------+-----------+----------+---------
 createdAt | timestamp with time zone |           | not null | now()
 id        | text                     |           | not null |
 name      | text                     |           | not null |
 ownerId   | text                     |           | not null |
 slug      | text                     |           | not null |
 updatedAt | timestamp with time zone |           | not null |
Indexes:
    "organization_pkey" PRIMARY KEY, btree (id)
    "organization_ownerId_idx_e2d0c1ef" btree ("ownerId")
    "organization_slug_key" UNIQUE CONSTRAINT, btree (slug)
Foreign-key constraints:
    "organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"(id) ON DELETE RESTRICT

null_owner_count: 0
inviteLink_role_check_24976965: CHECK ((role = ANY (ARRAY['ADMIN'::text, 'RECRUITER'::text, 'HIRING_MANAGER'::text, 'INTERVIEWER'::text, 'MEMBER'::text])))
organizationMember_role_check_24976965: CHECK ((role = ANY (ARRAY['ADMIN'::text, 'RECRUITER'::text, 'HIRING_MANAGER'::text, 'INTERVIEWER'::text, 'MEMBER'::text])))
user_role_check_24976965: CHECK ((role = ANY (ARRAY['ADMIN'::text, 'RECRUITER'::text, 'HIRING_MANAGER'::text, 'INTERVIEWER'::text, 'MEMBER'::text])))
```

---

## 4. Test & Verification Evidence

- `pnpm --filter ./backend run db:verify`: `Database marker and schema match contract`
- `pnpm --filter ./backend run db:status`: `Up to date (targetContract: 0c00d4d98853...)`
- `pnpm --filter ./backend exec prisma migration check`: `All checks passed`
- `pnpm --filter ./backend run db:seed`: `Seed finished successfully!`
- `pnpm typecheck`: PASSED
- `pnpm test`: 976 tests passed (Backend: 549, Frontend: 427, 0 failed)
- `pnpm check:all`: 14/14 gates passed in 82.37s

---

## 5. Rollback Plan

Revert commit; execute schema revert SQL script to drop foreign key constraint `organization_ownerId_fkey`, drop index `organization_ownerId_idx_e2d0c1ef`, revert `ownerId` nullability, and restore role check constraints allowing `OWNER`.
