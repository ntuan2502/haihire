#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b/contract";
import endContract from "../../snapshots/0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b/contract.json" with { type: "json" };
import type { Contract as Start } from "../../snapshots/88f0fe5b432f8410a86d2c8e8a17ebe1958115a96be6bd7124889b7fbfa9668b/contract";
import startContract from "../../snapshots/88f0fe5b432f8410a86d2c8e8a17ebe1958115a96be6bd7124889b7fbfa9668b/contract.json" with { type: "json" };
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: "public",
        table: "inviteLink",
        constraint: "inviteLink_role_check_d55e7365",
      }),
      this.dropCheckConstraint({
        schema: "public",
        table: "organizationMember",
        constraint: "organizationMember_role_check_d55e7365",
      }),
      this.dropCheckConstraint({
        schema: "public",
        table: "user",
        constraint: "user_role_check_d55e7365",
      }),
      this.setNotNull({
        schema: "public",
        table: "organization",
        column: "ownerId",
      }),
      this.addCheckConstraint({
        schema: "public",
        table: "inviteLink",
        constraint: "inviteLink_role_check_24976965",
        expression:
          "\"role\" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER')",
      }),
      this.addCheckConstraint({
        schema: "public",
        table: "organizationMember",
        constraint: "organizationMember_role_check_24976965",
        expression:
          "\"role\" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER')",
      }),
      this.addCheckConstraint({
        schema: "public",
        table: "user",
        constraint: "user_role_check_24976965",
        expression:
          "\"role\" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER')",
      }),
      this.createIndex({
        schema: "public",
        table: "organization",
        index: "organization_ownerId_idx_e2d0c1ef",
        columns: ["ownerId"],
      }),
      this.addForeignKey({
        schema: "public",
        table: "organization",
        foreignKey: {
          name: "organization_ownerId_fkey",
          columns: ["ownerId"],
          references: { schema: "public", table: "user", columns: ["id"] },
          onDelete: "restrict",
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
