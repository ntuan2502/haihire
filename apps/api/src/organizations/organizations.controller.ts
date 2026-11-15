import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { OrganizationsService } from "./organizations.service";
import { setHasOrgCookie } from "../auth/auth-cookies";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import {
  SwitchOrgDto,
  UpdateMemberRoleDto,
  CreateInviteLinkDto,
} from "./dto/org-actions.dto";
import { UpdateRolePermissionsDto } from "./dto/role-permissions.dto";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgsService: OrganizationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(CreateOrgDto)) dto: CreateOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const org = await this.orgsService.create(req.user.id, dto);
    setHasOrgCookie(res, true);
    return org;
  }

  @UseGuards(JwtAuthGuard)
  @Post("join")
  @HttpCode(HttpStatus.OK)
  async join(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(JoinOrgDto)) dto: JoinOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.join(req.user.id, dto);
    setHasOrgCookie(res, true);
    return result;
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard)
  @Get("my")
  getMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMyOrg(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/all")
  getMyOrgs(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMyOrgs(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("switch")
  @HttpCode(HttpStatus.OK)
  async switchOrg(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(SwitchOrgDto)) body: SwitchOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.switchOrg(
      req.user.id,
      body.organizationId,
    );
    setHasOrgCookie(res, true);
    return result;
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Get("my/members")
  getMembers(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMembers(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("interview:create")
  @Get("my/interviewers")
  getInterviewers(@Request() req: { user: { id: string } }) {
    return this.orgsService.getInterviewers(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Patch("my/members/:memberId/role")
  updateMemberRole(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
    @Body(DtoPipe(UpdateMemberRoleDto)) body: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(req.user.id, memberId, body.role);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/members/:memberId")
  removeMember(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
  ) {
    return this.orgsService.removeMember(req.user.id, memberId);
  }

  // ==========================================
  // ROLES & PERMISSIONS MATRIX ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Get("my/roles/permissions")
  getRolePermissionsMatrix(@Request() req: { user: { id: string } }) {
    return this.orgsService.getRolePermissionsMatrix(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Patch("my/roles/:role/permissions")
  updateRolePermissions(
    @Request() req: { user: { id: string } },
    @Param("role") role: string,
    @Body(DtoPipe(UpdateRolePermissionsDto)) dto: UpdateRolePermissionsDto,
  ) {
    return this.orgsService.updateRolePermissions(
      req.user.id,
      role,
      dto.permissions,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Post("my/roles/reset")
  @HttpCode(HttpStatus.OK)
  resetAllRolePermissions(@Request() req: { user: { id: string } }) {
    return this.orgsService.resetRolePermissions(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Post("my/roles/:role/reset")
  @HttpCode(HttpStatus.OK)
  resetSingleRolePermissions(
    @Request() req: { user: { id: string } },
    @Param("role") role: string,
  ) {
    return this.orgsService.resetRolePermissions(req.user.id, role);
  }

  // ==========================================
  // AUDIT LOG ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:view_audit_log")
  @Get("my/audit-log")
  getAuditLogs(
    @Request() req: { user: { id: string } },
    @Query(DtoPipe(AuditLogQueryDto)) query?: AuditLogQueryDto,
  ) {
    return this.orgsService.getAuditLogs(req.user.id, {
      action: query?.action,
      resource: query?.resource,
      limit: query?.limit,
      offset: query?.offset,
    });
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:update")
  @Patch("my")
  updateMyOrg(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(UpdateOrgDto)) dto: UpdateOrgDto,
  ) {
    return this.orgsService.updateMyOrg(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:transfer_ownership")
  @Post("my/transfer-ownership")
  @HttpCode(HttpStatus.OK)
  transferOwnership(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(TransferOwnershipDto)) dto: TransferOwnershipDto,
  ) {
    return this.orgsService.transferOwnership(req.user.id, dto.newOwnerUserId);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:delete")
  @Delete("my")
  async deleteMyOrg(
    @Request() req: { user: { id: string } },
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.deleteMyOrg(req.user.id);
    setHasOrgCookie(res, false);
    return result;
  }

  // ==========================================
  // INVITE LINKS ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Post("my/invite-links")
  createInviteLink(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(CreateInviteLinkDto)) dto: CreateInviteLinkDto,
  ) {
    return this.orgsService.createInviteLink(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Get("my/invite-links")
  getInviteLinks(@Request() req: { user: { id: string } }) {
    return this.orgsService.getInviteLinks(req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/invite-links/:id")
  revokeInviteLink(
    @Request() req: { user: { id: string } },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orgsService.revokeInviteLink(req.user.id, id);
  }

  // Public endpoint to view invite link details (no auth needed)
  @Get("invite-links/public/:token")
  getPublicInvite(@Param("token") token: string) {
    return this.orgsService.getPublicInvite(token);
  }

  // Auth endpoint to accept invite and join org
  @UseGuards(JwtAuthGuard)
  @Post("invite-links/join/:token")
  async joinByToken(
    @Request() req: { user: { id: string } },
    @Param("token") token: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.joinByToken(req.user.id, token);
    setHasOrgCookie(res, true);
    return result;
  }

  // Public endpoint to view organization profile by slug (no auth needed)
  @Get("public/:slug")
  getPublicOrg(@Param("slug") slug: string) {
    return this.orgsService.getPublicOrg(slug);
  }
}
