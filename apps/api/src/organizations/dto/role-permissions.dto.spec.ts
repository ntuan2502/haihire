import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  UpdateRolePermissionsDto,
  RolePermissionItemDto,
} from "./role-permissions.dto";

describe("UpdateRolePermissionsDto Validation", () => {
  it("should validate a valid array of permission items", async () => {
    const dto = plainToInstance(UpdateRolePermissionsDto, {
      permissions: [
        { permission: "job:create", granted: true },
        { permission: "org:delete", granted: false },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should reject when permissions is not an array", async () => {
    const dto = plainToInstance(UpdateRolePermissionsDto, {
      permissions: "invalid-string",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("permissions");
  });

  it("should reject when permissions array is empty", async () => {
    const dto = plainToInstance(UpdateRolePermissionsDto, {
      permissions: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.arrayNotEmpty).toBeDefined();
  });

  it("should reject an item with an invalid permission key", async () => {
    const item = plainToInstance(RolePermissionItemDto, {
      permission: "invalid:fake_permission",
      granted: true,
    });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toContain("Invalid permission key");
  });

  it("should reject an item with missing permission key", async () => {
    const item = plainToInstance(RolePermissionItemDto, {
      granted: true,
    });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should reject an item with non-boolean granted value", async () => {
    const item = plainToInstance(RolePermissionItemDto, {
      permission: "job:create",
      granted: "yes",
    });
    const errors = await validate(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isBoolean).toBeDefined();
  });
});
