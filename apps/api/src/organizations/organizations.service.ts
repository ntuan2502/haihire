import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import {
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
  OrganizationsAuditLogService,
  type InviteLinkRecord,
  type OrgAuditLogFilter,
} from "./services";
import { Role, APP_ERROR_CODES } from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import type { RolePermissionItemDto } from "./dto/role-permissions.dto";

export type { InviteLinkRecord };

@Injectable()
export class OrganizationsService implements OnModuleInit {
  constructor(
    @Inject(OrganizationsCoreService)
    private readonly core: OrganizationsCoreService,
    @Inject(OrganizationsMembersService)
    private readonly members: OrganizationsMembersService,
    @Inject(OrganizationsInvitesService)
    private readonly invites: OrganizationsInvitesService,
    @Inject(OrganizationsRolesService)
    private readonly roles: OrganizationsRolesService,
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog: OrganizationsAuditLogService,
  ) {}

  async onModuleInit() {
    await this.members.initializeMemberships();
  }

  // ==========================================
  // 1. ORGANIZATION CORE LIFECYCLE
  // ==========================================
  create(userId: string, dto: CreateOrgDto) {
    return this.core.create(userId, dto);
  }

  getMyOrg(userId: string, activeOrgId?: string | null) {
    return this.core.getMyOrg(userId, activeOrgId);
  }

  getMyOrgs(userId: string) {
    return this.core.getMyOrgs(userId);
  }

  switchOrg(userId: string, targetOrgId: string) {
    return this.core.switchOrg(userId, targetOrgId);
  }

  updateMyOrg(userId: string, dto: UpdateOrgDto, activeOrgId?: string | null) {
    return this.core.updateMyOrg(userId, dto, activeOrgId);
  }

  deleteMyOrg(userId: string, activeOrgId?: string | null) {
    return this.core.deleteMyOrg(userId, activeOrgId);
  }

  transferOwnership(
    userId: string,
    newOwnerUserId: string,
    activeOrgId?: string | null,
  ) {
    return this.core.transferOwnership(userId, newOwnerUserId, activeOrgId);
  }

  getPublicOrg(slug: string) {
    return this.core.getPublicOrg(slug);
  }

  // ==========================================
  // 2. MEMBERSHIP & RBAC MANAGEMENT
  // ==========================================
  getMembers(userId: string, activeOrgId?: string | null) {
    return this.members.getMembers(userId, activeOrgId);
  }

  getInterviewers(userId: string, activeOrgId?: string | null) {
    return this.members.getInterviewers(userId, activeOrgId);
  }

  updateMemberRole(
    userId: string,
    targetMemberId: string,
    newRole: Role | "ADMIN" | "MEMBER",
    activeOrgId?: string | null,
  ) {
    return this.members.updateMemberRole(
      userId,
      targetMemberId,
      newRole as Role,
      activeOrgId,
    );
  }

  removeMember(
    userId: string,
    targetMemberId: string,
    activeOrgId?: string | null,
  ) {
    return this.members.removeMember(userId, targetMemberId, activeOrgId);
  }

  // ==========================================
  // 3. INVITE LINKS MANAGEMENT
  // ==========================================
  createInviteLink(
    userId: string,
    dto: {
      role?: string;
      expiresIn?: string;
      maxUses?: string;
      email?: string;
    },
    activeOrgId?: string | null,
  ) {
    return this.invites.createInviteLink(userId, dto, activeOrgId);
  }

  getInviteLinks(
    userId: string,
    activeOrgId?: string | null,
  ): Promise<InviteLinkRecord[]> {
    return this.invites.getInviteLinks(userId, activeOrgId);
  }

  revokeInviteLink(
    userId: string,
    linkId: string,
    activeOrgId?: string | null,
  ) {
    return this.invites.revokeInviteLink(userId, linkId, activeOrgId);
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
  async getRolePermissionsMatrix(userId: string, activeOrgId?: string | null) {
    const org = await this.getMyOrg(userId, activeOrgId);
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
    activeOrgId?: string | null,
  ) {
    const org = await this.getMyOrg(userId, activeOrgId);
    if (!org) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User does not belong to an active organization",
      );
    }
    return this.roles.updateRolePermissions(org.id, role, updates, userId);
  }

  async resetRolePermissions(
    userId: string,
    role?: string,
    activeOrgId?: string | null,
  ) {
    const org = await this.getMyOrg(userId, activeOrgId);
    if (!org) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User does not belong to an active organization",
      );
    }
    return this.roles.resetRolePermissions(org.id, role, userId);
  }

  // ==========================================
  // 5. AUDIT LOGGING
  // ==========================================
  async getAuditLogs(
    userId: string,
    filter: OrgAuditLogFilter = {},
    activeOrgId?: string | null,
  ) {
    const org = await this.getMyOrg(userId, activeOrgId);
    if (!org) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User does not belong to an active organization",
      );
    }
    return this.auditLog.findAllOrg(org.id, filter);
  }
}
