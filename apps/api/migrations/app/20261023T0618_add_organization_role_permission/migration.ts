#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/25a95f3ac9c050ca351ac6c2c81b934f153bd2649a446d3e9e47454879a1073c/contract";
import endContract from "../../snapshots/25a95f3ac9c050ca351ac6c2c81b934f153bd2649a446d3e9e47454879a1073c/contract.json" with { type: "json" };
import type { Contract as Start } from "../../snapshots/27ad2c189786c40967bdd866c3208aa93a0abebc0df1f9bd968e0b406aea06c6/contract";
import startContract from "../../snapshots/27ad2c189786c40967bdd866c3208aa93a0abebc0df1f9bd968e0b406aea06c6/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: "public",
        table: "organizationRolePermission",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz@1" },
          }),
          col("granted", "boolean", {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: "pg/bool@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("organizationId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("permission", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("role", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            codecRef: { codecId: "pg/timestamptz@1" },
          }),
        ],
        constraints: [
          primaryKey(["id"]),
          checkExpression(
            "organizationRolePermission_role_check_24976965",
            "\"role\" IN ('ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'MEMBER')",
          ),
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "organizationRolePermission",
        constraint:
          "organizationRolePermission_organizationId_role_permission_key",
        columns: ["organizationId", "role", "permission"],
      }),
      this.createIndex({
        schema: "public",
        table: "organizationRolePermission",
        index: "organizationRolePermission_organizationId_idx_2e17ef41",
        columns: ["organizationId"],
      }),
      this.addForeignKey({
        schema: "public",
        table: "organizationRolePermission",
        foreignKey: {
          name: "organizationRolePermission_organizationId_fkey",
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
