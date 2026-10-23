import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsRolesService } from "./organizations-roles.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { PermissionResolverService } from "../../auth/permission-resolver.service";
import { Role, APP_ERROR_CODES, PERMISSION_LIST } from "@haihire/shared";
import { AppBadRequestException } from "../../common/app-exception";

describe("OrganizationsRolesService", () => {
  let service: OrganizationsRolesService;
  let mockResolver: { invalidateCache: ReturnType<typeof vi.fn> };
  let mockDbStore: Array<{
    id: string;
    organizationId: string;
    role: string;
    permission: string;
    granted: boolean;
  }>;

  beforeEach(() => {
    mockDbStore = [];
    mockResolver = {
      invalidateCache: vi.fn(),
    };

    const createChain = (filters: {
      organizationId?: string;
      role?: string;
      permission?: string;
      id?: string;
    }) => ({
      where: (
        predicateFn: (r: {
          organizationId: { eq: (val: string) => boolean };
          role: { eq: (val: string) => boolean };
          permission: { eq: (val: string) => boolean };
          id: { eq: (val: string) => boolean };
        }) => boolean,
      ) => {
        const nextFilters = { ...filters };
        const probe = {
          organizationId: {
            eq: (val: string) => {
              nextFilters.organizationId = val;
              return true;
            },
          },
          role: {
            eq: (val: string) => {
              nextFilters.role = val;
              return true;
            },
          },
          permission: {
            eq: (val: string) => {
              nextFilters.permission = val;
              return true;
            },
          },
          id: {
            eq: (val: string) => {
              nextFilters.id = val;
              return true;
            },
          },
        };
        try {
          predicateFn(probe);
        } catch {
          // ignore
        }
        return createChain(nextFilters);
      },
      first: async () => {
        const item = mockDbStore.find((r) => {
          if (
            filters.organizationId &&
            r.organizationId !== filters.organizationId
          )
            return false;
          if (filters.role && r.role !== filters.role) return false;
          if (filters.permission && r.permission !== filters.permission)
            return false;
          if (filters.id && r.id !== filters.id) return false;
          return true;
        });
        return item || null;
      },
      all: async () => {
        return mockDbStore.filter((r) => {
          if (
            filters.organizationId &&
            r.organizationId !== filters.organizationId
          )
            return false;
          if (filters.role && r.role !== filters.role) return false;
          if (filters.permission && r.permission !== filters.permission)
            return false;
          if (filters.id && r.id !== filters.id) return false;
          return true;
        });
      },
      update: async (data: { granted: boolean }) => {
        const item = mockDbStore.find((r) => r.id === filters.id);
        if (item) {
          item.granted = data.granted;
        }
        return item || null;
      },
    });

    const mockPrisma = {
      executeTx: async <T>(
        fn: (tx: {
          orm: {
            public: {
              OrganizationRolePermission: {
                where: ReturnType<typeof createChain>["where"];
                create: (data: {
                  id: string;
                  organizationId: string;
                  role: string;
                  permission: string;
                  granted: boolean;
                }) => Promise<unknown>;
              };
            };
          };
        }) => Promise<T>,
      ): Promise<T> => {
        const tx = {
          orm: {
            public: {
              OrganizationRolePermission: {
                where: createChain({}).where,
                create: async (data: {
                  id: string;
                  organizationId: string;
                  role: string;
                  permission: string;
                  granted: boolean;
                }) => {
                  mockDbStore.push({ ...data });
                  return data;
                },
              },
            },
          },
        };
        return fn(tx);
      },
      db: {
        orm: {
          public: {
            OrganizationRolePermission: {
              select: () => ({
                where: createChain({}).where,
              }),
            },
          },
        },
      },
    };

    service = new OrganizationsRolesService(
      mockPrisma as unknown as PrismaService,
      mockResolver as unknown as PermissionResolverService,
    );
  });

  describe("getRolePermissionsMatrix", () => {
    it("returns all 5 roles and default permissions when database is empty", async () => {
      const matrix = await service.getRolePermissionsMatrix("org-123");

      expect(matrix).toHaveProperty(Role.ADMIN);
      expect(matrix).toHaveProperty(Role.RECRUITER);
      expect(matrix).toHaveProperty(Role.HIRING_MANAGER);
      expect(matrix).toHaveProperty(Role.INTERVIEWER);
      expect(matrix).toHaveProperty(Role.MEMBER);

      // Default checks
      expect(matrix[Role.ADMIN]["org:delete"]).toBe(true);
      expect(matrix[Role.ADMIN]["org:manage_roles"]).toBe(true);
      expect(matrix[Role.RECRUITER]["org:delete"]).toBe(false);
      expect(matrix[Role.RECRUITER]["job:create"]).toBe(true);
      expect(matrix[Role.MEMBER]["job:create"]).toBe(false);
    });

    it("merges custom database overrides onto the matrix and keeps ADMIN immutable", async () => {
      mockDbStore.push({
        id: "override-1",
        organizationId: "org-123",
        role: Role.RECRUITER,
        permission: "org:delete",
        granted: true,
      });
      mockDbStore.push({
        id: "override-2",
        organizationId: "org-123",
        role: Role.ADMIN,
        permission: "job:create",
        granted: false,
      });

      const matrix = await service.getRolePermissionsMatrix("org-123");
      expect(matrix[Role.RECRUITER]["org:delete"]).toBe(true);
      // ADMIN role retains full permissions across all 42 permissions
      expect(matrix[Role.ADMIN]["job:create"]).toBe(true);
      for (const perm of PERMISSION_LIST) {
        expect(matrix[Role.ADMIN][perm]).toBe(true);
      }
    });
  });

  describe("updateRolePermissions", () => {
    it("updates permission override, triggers cache invalidation, and returns updated permissions for RECRUITER", async () => {
      const result = await service.updateRolePermissions(
        "org-123",
        Role.RECRUITER,
        [{ permission: "org:delete", granted: true }],
      );

      expect(mockResolver.invalidateCache).toHaveBeenCalledWith("org-123");
      expect(result.role).toBe(Role.RECRUITER);
      expect(result.permissions["org:delete"]).toBe(true);
    });

    it("rejects modifying ANY permissions for ADMIN role with ORG_ADMIN_PERMISSIONS_IMMUTABLE", async () => {
      await expect(
        service.updateRolePermissions("org-123", Role.ADMIN, [
          { permission: "org:manage_roles", granted: false },
        ]),
      ).rejects.toThrow(AppBadRequestException);

      try {
        await service.updateRolePermissions("org-123", Role.ADMIN, [
          { permission: "job:create", granted: false },
        ]);
      } catch (err: unknown) {
        expect((err as AppBadRequestException).code).toBe(
          APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
        );
      }
    });

    it("rejects updating an unsupported role like OWNER or GUEST", async () => {
      await expect(
        service.updateRolePermissions("org-123", "OWNER", [
          { permission: "org:view", granted: true },
        ]),
      ).rejects.toThrow(AppBadRequestException);
    });
  });
});
