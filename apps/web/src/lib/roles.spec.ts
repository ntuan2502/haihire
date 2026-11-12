import { describe, expect, it } from "vitest";
import { PERMISSIONS, Role, type Permission } from "@haihire/shared";
import { vi } from "@/i18n/locales/vi";
import { en } from "@/i18n/locales/en";
import { translateFromDictionary } from "@/i18n/optional";
import {
  getDocumentTypeLabel,
  getOrgRoleBadgeClass,
  getOrgRoleLabel,
  getOrgRoleOptions,
  getPermissionLabel,
} from "./roles";

describe("roles and document localization helpers", () => {
  const viT = (key: string) => translateFromDictionary("vi", key);
  const enT = (key: string) => translateFromDictionary("en", key);

  it("resolves all 6 organization roles in Vietnamese and English", () => {
    expect(getOrgRoleLabel("OWNER", viT)).toBe(vi.members.roleOwner);
    expect(getOrgRoleLabel(Role.ADMIN, viT)).toBe(vi.members.roleAdmin);
    expect(getOrgRoleLabel(Role.RECRUITER, viT)).toBe(vi.members.roleRecruiter);
    expect(getOrgRoleLabel(Role.HIRING_MANAGER, viT)).toBe(
      vi.members.roleHiringManager,
    );
    expect(getOrgRoleLabel(Role.INTERVIEWER, viT)).toBe(
      vi.members.roleInterviewer,
    );
    expect(getOrgRoleLabel(Role.MEMBER, viT)).toBe(vi.members.roleMember);

    expect(getOrgRoleLabel("hiring_manager", enT)).toBe(
      en.members.roleHiringManager,
    );
    expect(getOrgRoleLabel(null, viT)).toBe(vi.members.roleMember);
  });

  it("builds dropdown options excluding admin when requested", () => {
    const allOptions = getOrgRoleOptions(viT);
    expect(allOptions).toHaveLength(5);

    const nonAdminOptions = getOrgRoleOptions(viT, { excludeAdmin: true });
    expect(nonAdminOptions).toHaveLength(4);
    expect(nonAdminOptions.some((opt) => opt.value === Role.ADMIN)).toBe(false);
  });

  it("returns distinct badge classes for roles and safe default", () => {
    expect(getOrgRoleBadgeClass("OWNER")).toContain("amber");
    expect(getOrgRoleBadgeClass(Role.ADMIN)).toContain("rose");
    expect(getOrgRoleBadgeClass(Role.RECRUITER)).toContain("blue");
    expect(getOrgRoleBadgeClass(Role.HIRING_MANAGER)).toContain("emerald");
    expect(getOrgRoleBadgeClass(Role.INTERVIEWER)).toContain("amber");
    expect(getOrgRoleBadgeClass("UNKNOWN")).toContain("slate");
  });

  it("resolves localized labels for all 41 permissions without raw keys", () => {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];
    expect(allPermissions).toHaveLength(41);

    for (const permission of allPermissions) {
      const label = getPermissionLabel(permission, viT);
      expect(label).not.toBe(permission);
      expect(label.includes(":")).toBe(false);
      expect(label.startsWith("settings.")).toBe(false);
    }
  });

  it("resolves document type labels uniformly across enum and display variants", () => {
    expect(getDocumentTypeLabel(undefined, viT)).toBe(
      vi.common.docTypes.resume,
    );
    expect(getDocumentTypeLabel("Resume", viT)).toBe(vi.common.docTypes.resume);
    expect(getDocumentTypeLabel("RESUME", viT)).toBe(vi.common.docTypes.resume);
    expect(getDocumentTypeLabel("COVER_LETTER", viT)).toBe(
      vi.common.docTypes.coverLetter,
    );
    expect(getDocumentTypeLabel("Cover Letter", viT)).toBe(
      vi.common.docTypes.coverLetter,
    );
    expect(getDocumentTypeLabel("Other", viT)).toBe(vi.common.docTypes.other);
    expect(getDocumentTypeLabel("CustomDoc", viT)).toBe("CustomDoc");
  });
});
