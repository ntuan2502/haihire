#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/42054e8c4b0f71517a63230f595080753f3aae773134d3f454999ecac182f27c/contract";
import startContract from "../../snapshots/42054e8c4b0f71517a63230f595080753f3aae773134d3f454999ecac182f27c/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/88f0fe5b432f8410a86d2c8e8a17ebe1958115a96be6bd7124889b7fbfa9668b/contract";
import endContract from "../../snapshots/88f0fe5b432f8410a86d2c8e8a17ebe1958115a96be6bd7124889b7fbfa9668b/contract.json" with { type: "json" };
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";

/**
 * Migration: extend_role_enum (20261021T0641_extend_role_enum)
 *
 * Data migration & mapping logic:
 * - Existing ADMIN users remain ADMIN unless promoted.
 * - Existing MEMBER users remain MEMBER.
 * - For each organization, the ADMIN user with the earliest `createdAt` timestamp is promoted to OWNER.
 *   This guarantees that every active tenant organization has at least one designated OWNER.
 */
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addNativeEnumValue({
        schema: "public",
        typeName: "Role",
        value: "OWNER",
      }),
      this.addNativeEnumValue({
        schema: "public",
        typeName: "Role",
        value: "RECRUITER",
      }),
      this.addNativeEnumValue({
        schema: "public",
        typeName: "Role",
        value: "HIRING_MANAGER",
      }),
      this.addNativeEnumValue({
        schema: "public",
        typeName: "Role",
        value: "INTERVIEWER",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
