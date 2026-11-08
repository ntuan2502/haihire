import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  SwitchOrgDto,
  UpdateMemberRoleDto,
  CreateInviteLinkDto,
} from "./org-actions.dto";

describe("Organizations Extended DTO Specs", () => {
  // -------------------------------------------------------------
  // 1. SwitchOrgDto Tests (5 cases)
  // -------------------------------------------------------------
  describe("SwitchOrgDto", () => {
    it("should pass for valid organizationId string", async () => {
      const dto = plainToInstance(SwitchOrgDto, {
        organizationId: "org-uuid-123",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail when organizationId is omitted", async () => {
      const dto = plainToInstance(SwitchOrgDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotEmpty).toBe(
        "Organization ID is required",
      );
    });

    it("should fail when organizationId is an empty string", async () => {
      const dto = plainToInstance(SwitchOrgDto, { organizationId: "" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotEmpty).toBe(
        "Organization ID is required",
      );
    });

    it("should fail when organizationId is a non-string type (number)", async () => {
      const dto = plainToInstance(SwitchOrgDto, { organizationId: 12345 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it("should fail when organizationId is a nested object", async () => {
      const dto = plainToInstance(SwitchOrgDto, {
        organizationId: { nested: "object" },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 2. UpdateMemberRoleDto Tests (6 cases)
  // -------------------------------------------------------------
  describe("UpdateMemberRoleDto", () => {
    it("should pass when role is ADMIN", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "ADMIN" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when role is MEMBER", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "MEMBER" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when role is RECRUITER", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "RECRUITER" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when role is HIRING_MANAGER", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, {
        role: "HIRING_MANAGER",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when role is INTERVIEWER", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "INTERVIEWER" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail when role is omitted", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotEmpty).toBe("Role is required");
    });

    it("should fail when role is an invalid string enum", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "SUPERUSER" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBe(
        "Role must be one of: ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, MEMBER",
      );
    });

    it("should fail when role is SUPERADMIN", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: "SUPERADMIN" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBe(
        "Role must be one of: ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, MEMBER",
      );
    });

    it("should fail when role contains injection script / special chars", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, {
        role: "<script>alert('xss')</script>",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBe(
        "Role must be one of: ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, MEMBER",
      );
    });

    it("should fail when role is a number", async () => {
      const dto = plainToInstance(UpdateMemberRoleDto, { role: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isIn).toBe(
        "Role must be one of: ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, MEMBER",
      );
    });
  });

  // -------------------------------------------------------------
  // 3. CreateInviteLinkDto Tests (6 cases)
  // -------------------------------------------------------------
  describe("CreateInviteLinkDto", () => {
    it("should pass with all optional fields valid strings", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, {
        role: "MEMBER",
        expiresIn: "7d",
        maxUses: "10",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when all optional fields are omitted (empty object)", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass with partial payload (only role specified)", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, { role: "ADMIN" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail when role is non-string (number)", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, { role: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it("should fail when expiresIn is non-string (boolean)", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, { expiresIn: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it("should fail when maxUses is an object", async () => {
      const dto = plainToInstance(CreateInviteLinkDto, { maxUses: { val: 5 } });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });
});
