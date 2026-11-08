#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b/contract";
import startContract from "../../snapshots/0c00d4d98853be4281cdce7a70e37e12c71222a52fa4b2f7d619506c74e4ed3b/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/27ad2c189786c40967bdd866c3208aa93a0abebc0df1f9bd968e0b406aea06c6/contract";
import endContract from "../../snapshots/27ad2c189786c40967bdd866c3208aa93a0abebc0df1f9bd968e0b406aea06c6/contract.json" with { type: "json" };
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: "public",
        table: "job",
        constraint: "job_organizationId_fkey",
        kind: "foreignKey",
      }),
      this.addForeignKey({
        schema: "public",
        table: "job",
        foreignKey: {
          name: "job_organizationId_fkey",
          columns: ["organizationId"],
          references: {
            schema: "public",
            table: "organization",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),
      this.dropConstraint({
        schema: "public",
        table: "candidate",
        constraint: "candidate_organizationId_fkey",
        kind: "foreignKey",
      }),
      this.addForeignKey({
        schema: "public",
        table: "candidate",
        foreignKey: {
          name: "candidate_organizationId_fkey",
          columns: ["organizationId"],
          references: {
            schema: "public",
            table: "organization",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
