import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Database Schema: Prisma snake_case Table Mapping & Tenant Constraints (H-01 / H-08)", () => {
  const schemaPath = path.resolve(__dirname, "../src/prisma/schema.prisma");
  const legacyMigrationsDir = path.resolve(__dirname, "../migrations");

  it("should have Prisma schema present on disk and legacy Drizzle migrations directory retired", () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    expect(fs.existsSync(legacyMigrationsDir)).toBe(false);
  });

  it("should map all 22 Prisma models to snake_case table names in schema.prisma", () => {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    const modelRegex = /^model\s+([A-Za-z0-9_]+)\s+\{/gm;
    const models: string[] = [];
    let modelMatch: RegExpExecArray | null;
    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      models.push(modelMatch[1]);
    }

    const mapRegex = /@@map\("([^"]+)"\)/g;
    const mappedTables: string[] = [];
    let mapMatch: RegExpExecArray | null;
    while ((mapMatch = mapRegex.exec(schemaContent)) !== null) {
      mappedTables.push(mapMatch[1]);
    }

    expect(models.length).toBe(22);
    expect(mappedTables.length).toBe(22);

    for (const table of mappedTables) {
      expect(table).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("should enforce unique constraint on organization_member and direct organizationId on child models", () => {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    expect(schemaContent).toContain('@@map("organization_member")');
    expect(schemaContent).toContain("@@unique([organizationId, userId])");
    expect(schemaContent).toContain("@@index([organizationId, stage])");
    expect(schemaContent).toContain("@@index([organizationId, scheduledAt])");
    expect(schemaContent).toContain("@@index([organizationId, createdAt])");
  });
});
