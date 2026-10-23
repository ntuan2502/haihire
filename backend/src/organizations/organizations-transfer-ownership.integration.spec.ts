import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import { DtoPipe } from "../common/dto-validation.pipe";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { OrganizationsCoreService } from "./services/organizations-core.service";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import {
  createMockTable,
  type MockTable,
} from "../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../prisma/prisma.service";
import { AppForbiddenException } from "../common/app-exception";

describe("Organizations Transfer Ownership Integration Specs", () => {
  const seedOwnerUserId = "00000000-0000-4000-8000-000000000001";
  const seedTargetUserId = "00000000-0000-4000-8000-000000000003";
  const legacyPseudoUuid = "00000000-0000-0000-0000-000000000003";
  const standardUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const orgId = "00000000-0000-4000-8000-000000000002";

  let pipe: ReturnType<typeof DtoPipe<TransferOwnershipDto>>;
  let userTable: MockTable<Record<string, unknown>>;
  let organizationTable: MockTable<Record<string, unknown>>;
  let organizationMemberTable: MockTable<Record<string, unknown>>;
  let mockPrisma: PrismaService;
  let coreService: OrganizationsCoreService;
  let orgService: OrganizationsService;
  let controller: OrganizationsController;

  beforeEach(() => {
    pipe = DtoPipe(TransferOwnershipDto);

    userTable = createMockTable([
      {
        id: seedOwnerUserId,
        email: "owner@haihire.local",
        name: "Demo Owner",
        role: "ADMIN",
        organizationId: orgId,
      },
      {
        id: seedTargetUserId,
        email: "recruiter@haihire.local",
        name: "Demo Recruiter",
        role: "MEMBER",
        organizationId: orgId,
      },
      {
        id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c99",
        email: "other@haihire.local",
        name: "Other User",
        role: "ADMIN",
        organizationId: orgId,
      },
    ]);

    organizationTable = createMockTable([
      {
        id: orgId,
        name: "HaiHire Demo Org",
        slug: "haihire-demo",
        ownerId: seedOwnerUserId,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Note: seedTargetUserId initially has NO row in organizationMemberTable to verify upsert logic
    organizationMemberTable = createMockTable([
      {
        id: "mem-owner",
        organizationId: orgId,
        userId: seedOwnerUserId,
        role: "ADMIN",
      },
    ]);

    const mockOrm = {
      public: {
        User: userTable,
        Organization: organizationTable,
        OrganizationMember: organizationMemberTable,
      },
    };

    const mockDb = {
      orm: mockOrm,
    };

    mockPrisma = {
      db: mockDb,
      executeTx: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
    } as unknown as PrismaService;

    coreService = new OrganizationsCoreService(mockPrisma);

    // Wire OrganizationsService with coreService
    orgService = new OrganizationsService(
      coreService,
      undefined,
      undefined,
      undefined,
      mockPrisma,
    );

    controller = new OrganizationsController(orgService);
  });

  describe("1. DtoPipe Validation Layer", () => {
    it("accepts seeded demo account ID format (00000000-0000-4000-8000-000000000003) without 400", async () => {
      const payload = { newOwnerUserId: seedTargetUserId };
      const transformed = await pipe.transform(payload, {
        type: "body",
        metatype: TransferOwnershipDto,
      });

      expect(transformed).toBeInstanceOf(TransferOwnershipDto);
      expect(transformed.newOwnerUserId).toBe(seedTargetUserId);
    });

    it("accepts standard RFC 4122 UUID v4 format without 400", async () => {
      const payload = { newOwnerUserId: standardUuid };
      const transformed = await pipe.transform(payload, {
        type: "body",
        metatype: TransferOwnershipDto,
      });

      expect(transformed).toBeInstanceOf(TransferOwnershipDto);
      expect(transformed.newOwnerUserId).toBe(standardUuid);
    });

    it("rejects legacy non-RFC 4122 pseudo-UUID (00000000-0000-0000-0000-000000000003) with 400 BadRequestException", async () => {
      const payload = { newOwnerUserId: legacyPseudoUuid };
      await expect(
        pipe.transform(payload, {
          type: "body",
          metatype: TransferOwnershipDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-string input (number) with 400 BadRequestException", async () => {
      const payload = { newOwnerUserId: 12345 };
      await expect(
        pipe.transform(payload as unknown as Record<string, unknown>, {
          type: "body",
          metatype: TransferOwnershipDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-string input (object) with 400 BadRequestException", async () => {
      const payload = { newOwnerUserId: { id: seedTargetUserId } };
      await expect(
        pipe.transform(payload as unknown as Record<string, unknown>, {
          type: "body",
          metatype: TransferOwnershipDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects missing newOwnerUserId field with 400 BadRequestException", async () => {
      const payload = {};
      await expect(
        pipe.transform(payload, {
          type: "body",
          metatype: TransferOwnershipDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects empty string newOwnerUserId with 400 BadRequestException", async () => {
      const payload = { newOwnerUserId: "" };
      await expect(
        pipe.transform(payload, {
          type: "body",
          metatype: TransferOwnershipDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("2. Service & Database Flow (Upsert & RBAC Promotion)", () => {
    it("executes transferOwnership successfully when target member has no existing membership entry", async () => {
      // Pre-condition: target member has no explicit OrganizationMember record
      const preMembership = organizationMemberTable.store.find(
        (m) => m.organizationId === orgId && m.userId === seedTargetUserId,
      );
      expect(preMembership).toBeUndefined();

      const result = await coreService.transferOwnership(
        seedOwnerUserId,
        seedTargetUserId,
      );

      expect(result.success).toBe(true);
      expect(result.newOwnerId).toBe(seedTargetUserId);

      // Verify Organization ownerId updated
      const org = organizationTable.store.find((o) => o.id === orgId);
      expect(org?.ownerId).toBe(seedTargetUserId);

      // Verify User table role updated to ADMIN
      const updatedUser = userTable.store.find(
        (u) => u.id === seedTargetUserId,
      );
      expect(updatedUser?.role).toBe("ADMIN");

      // Verify OrganizationMember table row was created / upserted with role ADMIN
      const postMembership = organizationMemberTable.store.find(
        (m) => m.organizationId === orgId && m.userId === seedTargetUserId,
      );
      expect(postMembership).toBeDefined();
      expect(postMembership?.role).toBe("ADMIN");
    });

    it("rejects transferOwnership with AppForbiddenException when called by non-owner", async () => {
      await expect(
        coreService.transferOwnership(
          "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c99",
          seedTargetUserId,
        ),
      ).rejects.toThrow(AppForbiddenException);

      try {
        await coreService.transferOwnership(
          "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c99",
          seedTargetUserId,
        );
      } catch (err) {
        expect(err).toBeInstanceOf(AppForbiddenException);
        expect((err as AppForbiddenException).code).toBe(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        );
      }
    });
  });

  describe("3. Controller End-to-End Pipeline with DtoPipe", () => {
    it("processes complete pipeline: DtoPipe transform -> Controller -> Service -> DB", async () => {
      const rawBody = { newOwnerUserId: seedTargetUserId };
      const validatedDto = await pipe.transform(rawBody, {
        type: "body",
        metatype: TransferOwnershipDto,
      });

      const req = { user: { id: seedOwnerUserId } };
      const response = await controller.transferOwnership(req, validatedDto);

      expect(response).toEqual({
        success: true,
        newOwnerId: seedTargetUserId,
      });

      const org = organizationTable.store.find((o) => o.id === orgId);
      expect(org?.ownerId).toBe(seedTargetUserId);
    });
  });
});
