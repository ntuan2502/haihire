#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/25a95f3ac9c050ca351ac6c2c81b934f153bd2649a446d3e9e47454879a1073c/contract";
import startContract from "../../snapshots/25a95f3ac9c050ca351ac6c2c81b934f153bd2649a446d3e9e47454879a1073c/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/37268e47a5cca9b7b5f7c93112f32e754a7679247bfbf8f68c9d03f203587afb/contract";
import endContract from "../../snapshots/37268e47a5cca9b7b5f7c93112f32e754a7679247bfbf8f68c9d03f203587afb/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: "public",
        table: "organizationAuditLog",
        columns: [
          col("action", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("actorId", "text", {
            notNull: false,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("metadata", "text", {
            notNull: false,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("organizationId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("resource", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.createIndex({
        schema: "public",
        table: "organizationAuditLog",
        index: "organizationAuditLog_actorId_idx_a58f6b4b",
        columns: ["actorId"],
      }),
      this.createIndex({
        schema: "public",
        table: "organizationAuditLog",
        index: "organizationAuditLog_organizationId_action_idx_9ecdfcf3",
        columns: ["organizationId", "action"],
      }),
      this.createIndex({
        schema: "public",
        table: "organizationAuditLog",
        index: "organizationAuditLog_organizationId_createdAt_idx_c52d1cc3",
        columns: ["organizationId", "createdAt"],
      }),
      this.createIndex({
        schema: "public",
        table: "organizationAuditLog",
        index: "organizationAuditLog_organizationId_idx_2e17ef41",
        columns: ["organizationId"],
      }),
      this.addForeignKey({
        schema: "public",
        table: "organizationAuditLog",
        foreignKey: {
          name: "organizationAuditLog_organizationId_fkey",
          columns: ["organizationId"],
          references: {
            schema: "public",
            table: "organization",
            columns: ["id"],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "organizationAuditLog",
        foreignKey: {
          name: "organizationAuditLog_actorId_fkey",
          columns: ["actorId"],
          references: {
            schema: "public",
            table: "user",
            columns: ["id"],
          },
          onDelete: "setNull",
        },
      }),
      this.createTable({
        schema: "public",
        table: "platformAuditLog",
        columns: [
          col("action", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("actorId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("metadata", "text", {
            notNull: false,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("organizationId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("resource", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.createIndex({
        schema: "public",
        table: "platformAuditLog",
        index: "platformAuditLog_action_idx_cd0d2116",
        columns: ["action"],
      }),
      this.createIndex({
        schema: "public",
        table: "platformAuditLog",
        index: "platformAuditLog_createdAt_idx_9575dbd7",
        columns: ["createdAt"],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
