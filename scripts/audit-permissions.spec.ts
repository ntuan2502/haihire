import { describe, it, expect } from "vitest";
import {
  parseControllerContent,
  runPermissionAudit,
} from "./audit-permissions.ts";

describe("audit-permissions: class-level inheritance & AST extraction", () => {
  it("extracts class-level @RequirePermission when method does not declare one", () => {
    const mockControllerCode = `
import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequirePermission } from "../auth/decorators/permissions.decorator";

@Controller("test-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermission("test:manage")
export class TestSettingsController {
  @Get()
  async getSettings() {
    return [];
  }

  @Post()
  @RequirePermission("test:create")
  async createSetting() {
    return {};
  }
}
`;

    const { endpoints, violations } = parseControllerContent(
      mockControllerCode,
      "test-settings.controller.ts",
    );

    expect(violations).toHaveLength(0);
    expect(endpoints).toHaveLength(2);

    const getEndpoint = endpoints.find((e) => e.httpMethod === "GET");
    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.permission).toBe("test:manage");
    expect(getEndpoint?.permissionSource).toBe("class");
    expect(getEndpoint?.hasJwtGuard).toBe(true);
    expect(getEndpoint?.hasRolesGuard).toBe(true);

    const postEndpoint = endpoints.find((e) => e.httpMethod === "POST");
    expect(postEndpoint).toBeDefined();
    expect(postEndpoint?.permission).toBe("test:create");
    expect(postEndpoint?.permissionSource).toBe("method");
  });

  it("detects violations when class has @RequirePermission but lacks RolesGuard", () => {
    const mockCode = `
@Controller("missing-roles")
@UseGuards(JwtAuthGuard)
@RequirePermission("test:manage")
export class MissingRolesController {
  @Get()
  async getSettings() {
    return [];
  }
}
`;

    const { violations } = parseControllerContent(
      mockCode,
      "missing-roles.controller.ts",
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain("[MISSING ROLES_GUARD]");
  });

  it("detects violations when class has @RequirePermission but lacks JwtAuthGuard", () => {
    const mockCode = `
@Controller("missing-jwt")
@UseGuards(RolesGuard)
@RequirePermission("test:manage")
export class MissingJwtController {
  @Get()
  async getSettings() {
    return [];
  }
}
`;

    const { violations } = parseControllerContent(
      mockCode,
      "missing-jwt.controller.ts",
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain("[MISSING JWT_GUARD]");
  });

  it("confirms production endpoints: zero routes rely solely on class-level permission, all 49 use explicit method decorators", () => {
    const result = runPermissionAudit();

    expect(result.violations).toHaveLength(0);
    expect(result.controllersScanned).toBe(12);
    expect(result.endpoints.length).toBe(90);
    expect(result.permissionProtectedCount).toBe(49);
    expect(result.methodExplicitCount).toBe(49);
    expect(result.classInheritedCount).toBe(0);
  });
});
