import {
  Inject,
  Injectable,
  Optional,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import {
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
  type InviteLinkRecord,
} from "./services";
import { Role, APP_ERROR_CODES } from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import type { RolePermissionItemDto } from "./dto/role-permissions.dto";

export type { InviteLinkRecord };

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly core: OrganizationsCoreService;
  private readonly members: OrganizationsMembersService;
  private readonly invites: OrganizationsInvitesService;
  private readonly roles: OrganizationsRolesService;

  constructor(
    @Optional()
    @Inject(OrganizationsCoreService)
    coreOrPrisma?: OrganizationsCoreService | PrismaService,
    @Optional()
    @Inject(OrganizationsMembersService)
    membersOrEvents?: OrganizationsMembersService | EventsService,
    @Optional()
    @Inject(OrganizationsInvitesService)
    invitesService?: OrganizationsInvitesService,
    @Optional()
    @Inject(OrganizationsRolesService)
    rolesService?: OrganizationsRolesService,
    @Optional()
    @Inject(PrismaService)
    prismaService?: PrismaService,
  ) {
    if (coreOrPrisma instanceof OrganizationsCoreService) {
      this.core = coreOrPrisma;
      this.members = membersOrEvents as OrganizationsMembersService;
      this.invites = invitesService as OrganizationsInvitesService;
      this.roles =
        rolesService ||
        new OrganizationsRolesService(
          prismaService ||
            (this.core as unknown as { prisma: PrismaService }).prisma,
        );
    } else if (coreOrPrisma) {
      // Direct instantiation support for existing tests (e.g. new OrganizationsService(mockPrisma))
      const prisma = coreOrPrisma as PrismaService;
      const events =
        membersOrEvents instanceof EventsService ? membersOrEvents : undefined;
      this.core = new OrganizationsCoreService(prisma);
      this.members = new OrganizationsMembersService(prisma, events);
      this.invites = new OrganizationsInvitesService(prisma);
      this.roles = new OrganizationsRolesService(prisma);
    } else {
      throw new Error(
        "OrganizationsService requires dependencies to be injected",
      );
    }
  }

  async onModuleInit() {
    await this.members.onModuleInit();
  }

  // ==========================================
  // 1. ORGANIZATION CORE LIFECYCLE
  // ==========================================
  create(userId: string, dto: CreateOrgDto) {
    return this.core.create(userId, dto);
  }

  getMyOrg(userId: string) {
    return this.core.getMyOrg(userId);
  }

  getMyOrgs(userId: string) {
    return this.core.getMyOrgs(userId);
  }

  switchOrg(userId: string, targetOrgId: string) {
    return this.core.switchOrg(userId, targetOrgId);
  }

  updateMyOrg(userId: string, dto: UpdateOrgDto) {
    return this.core.updateMyOrg(userId, dto);
  }

  deleteMyOrg(userId: string) {
    return this.core.deleteMyOrg(userId);
  }

  transferOwnership(userId: string, newOwnerUserId: string) {
    return this.core.transferOwnership(userId, newOwnerUserId);
  }

  getPublicOrg(slug: string) {
    return this.core.getPublicOrg(slug);
  }

  // ==========================================
  // 2. MEMBERSHIP & RBAC MANAGEMENT
  // ==========================================
  getMembers(userId: string) {
    return this.members.getMembers(userId);
  }

  updateMemberRole(
    userId: string,
    targetMemberId: string,
    newRole: Role | "ADMIN" | "MEMBER",
  ) {
    return this.members.updateMemberRole(
      userId,
      targetMemberId,
      newRole as Role,
    );
  }

  removeMember(userId: string, targetMemberId: string) {
    return this.members.removeMember(userId, targetMemberId);
  }

  // ==========================================
  // 3. INVITE LINKS MANAGEMENT
  // ==========================================
  createInviteLink(
    userId: string,
    dto: { role?: string; expiresIn?: string; maxUses?: string },
  ) {
    return this.invites.createInviteLink(userId, dto);
  }

  getInviteLinks(userId: string): Promise<InviteLinkRecord[]> {
    return this.invites.getInviteLinks(userId);
  }

  revokeInviteLink(userId: string, linkId: string) {
    return this.invites.revokeInviteLink(userId, linkId);
  }

  getPublicInvite(token: string) {
    return this.invites.getPublicInvite(token);
  }

  joinByToken(userId: string, token: string) {
    return this.invites.joinByToken(userId, token);
  }

  join(userId: string, dto: JoinOrgDto) {
    return this.invites.join(userId, dto);
  }

  // ==========================================
  // 4. ROLES & PERMISSIONS MATRIX MANAGEMENT
  // ==========================================
  async getRolePermissionsMatrix(userId: string) {
    const org = await this.getMyOrg(userId);
    if (!org) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User does not belong to an active organization",
      );
    }
    return this.roles.getRolePermissionsMatrix(org.id);
  }

  async updateRolePermissions(
    userId: string,
    role: string,
    updates: RolePermissionItemDto[],
  ) {
    const org = await this.getMyOrg(userId);
    if (!org) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User does not belong to an active organization",
      );
    }
    return this.roles.updateRolePermissions(org.id, role, updates);
  }
}
