import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Database Migration: Table Rename to snake_case (H-01)", () => {
  const schemaPath = path.resolve(__dirname, "../src/prisma/schema.prisma");
  const migrationPath = path.resolve(
    __dirname,
    "../migrations/app/20261109T1030_rename_tables_to_snake_case.sql",
  );
  const rollbackPath = path.resolve(
    __dirname,
    "../migrations/app/20261109T1030_rename_tables_to_snake_case_down.sql",
  );

  it("should have migration and rollback SQL files present on disk", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(rollbackPath)).toBe(true);
  });

  it("should cover all 19 Prisma models mapped to snake_case in schema.prisma", () => {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const migrationContent = fs.readFileSync(migrationPath, "utf8");
    const rollbackContent = fs.readFileSync(rollbackPath, "utf8");

    // Extract all @@map("...") definitions
    const mapRegex = /@@map\("([^"]+)"\)/g;
    const mappedTables: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mapRegex.exec(schemaContent)) !== null) {
      mappedTables.push(match[1]);
    }

    // Exclude models introduced after the 20261109 rename migration
    const renamedTables = mappedTables.filter(
      (t) => t !== "application_note" && t !== "candidate_note",
    );
    expect(renamedTables.length).toBe(19);

    for (const table of renamedTables) {
      // Each snake_case table must be a target in the migration script
      expect(migrationContent).toContain(`'${table}'`);
      // Each snake_case table must be in the rollback script
      expect(rollbackContent).toContain(`'${table}'`);
    }
  });

  it("should include deduplication and unique constraint on organization_member (H-08)", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf8");
    expect(migrationContent).toContain("organization_member");
    expect(migrationContent).toContain(
      "organization_member_organizationId_userId_key",
    );
    expect(migrationContent).toContain('UNIQUE ("organizationId", "userId")');
    expect(migrationContent).toContain(
      'DELETE FROM "public"."organization_member"',
    );
  });
});
