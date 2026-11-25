import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  MAX_ORG_LOGO_SIZE_BYTES,
  updateAuditRetentionSchema,
  type UpdateAuditRetentionSchema,
} from "@haihire/shared";
import { OrganizationsService } from "./organizations.service";
import { AuthService } from "../auth/auth.service";
import { setAuthCookies, setHasOrgCookie } from "../auth/auth-cookies";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import {
  SwitchOrgDto,
  UpdateMemberRoleDto,
  CreateInviteLinkDto,
  GetInviteLinksQueryDto,
} from "./dto/org-actions.dto";
import { UpdateRolePermissionsDto } from "./dto/role-permissions.dto";
import {
  AuditLogQueryDto,
  AuditLogExportQueryDto,
} from "./dto/audit-log-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { logoFileFilter } from "../common/upload-utils";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgsService: OrganizationsService,
    @Optional()
    @Inject(AuthService)
    private readonly authService?: AuthService,
  ) {}

  private async syncOrgCookies(
    res: Response | undefined,
    userId: string,
    orgId: string | null,
    sessionId?: string | null,
  ) {
    if (this.authService) {
      const tokens = sessionId
        ? await this.authService.issueOrgSessionTokens(userId, orgId, sessionId)
        : await this.authService.issueOrgSessionTokens(userId, orgId);
      setAuthCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.hasOrg,
      );
      return;
    }
    setHasOrgCookie(res, Boolean(orgId));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: { id: string; sessionId?: string | null } },
    @Body(DtoPipe(CreateOrgDto)) dto: CreateOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const org = await this.orgsService.create(req.user.id, dto);
    await this.syncOrgCookies(
      res,
      req.user.id,
      org.organization?.id ?? null,
      req.user.sessionId,
    );
    return org;
  }

  @UseGuards(JwtAuthGuard)
  @Post("join")
  @HttpCode(HttpStatus.OK)
  async join(
    @Request() req: { user: { id: string; sessionId?: string | null } },
    @Body(DtoPipe(JoinOrgDto)) dto: JoinOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.join(req.user.id, dto);
    await this.syncOrgCookies(
      res,
      req.user.id,
      result.organization?.id ?? null,
      req.user.sessionId,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard)
  @Get("my")
  getMyOrg(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.getMyOrg(req.user.id, req.user.organizationId);
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
    @Request() req: { user: { id: string; sessionId?: string | null } },
    @Body(DtoPipe(SwitchOrgDto)) body: SwitchOrgDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.switchOrg(
      req.user.id,
      body.organizationId,
    );
    await this.syncOrgCookies(
      res,
      req.user.id,
      result.organization?.id ?? null,
      req.user.sessionId,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Get("my/members")
  getMembers(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.getMembers(req.user.id, req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("interview:create")
  @Get("my/interviewers")
  getInterviewers(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.getInterviewers(
      req.user.id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Patch("my/members/:memberId/role")
  updateMemberRole(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("memberId", new ParseUUIDPipe()) memberId: string,
    @Body(DtoPipe(UpdateMemberRoleDto)) body: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(
      req.user.id,
      memberId,
      body.role,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/members/:memberId")
  removeMember(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("memberId", new ParseUUIDPipe()) memberId: string,
  ) {
    return this.orgsService.removeMember(
      req.user.id,
      memberId,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard)
  @Post("my/leave")
  @HttpCode(HttpStatus.OK)
  async leaveMyOrg(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.leaveOrganization(
      req.user.id,
      req.user.organizationId,
    );
    const remainingOrg = await this.orgsService.getMyOrg(req.user.id);
    await this.syncOrgCookies(res, req.user.id, remainingOrg?.id ?? null);
    return {
      ...result,
      nextOrganization: remainingOrg,
    };
  }

  // ==========================================
  // ROLES & PERMISSIONS MATRIX ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Get("my/roles/permissions")
  getRolePermissionsMatrix(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.getRolePermissionsMatrix(
      req.user.id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Patch("my/roles/:role/permissions")
  updateRolePermissions(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("role") role: string,
    @Body(DtoPipe(UpdateRolePermissionsDto)) dto: UpdateRolePermissionsDto,
  ) {
    return this.orgsService.updateRolePermissions(
      req.user.id,
      role,
      dto.permissions,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Post("my/roles/reset")
  @HttpCode(HttpStatus.OK)
  resetAllRolePermissions(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.resetRolePermissions(
      req.user.id,
      undefined,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_roles")
  @Post("my/roles/:role/reset")
  @HttpCode(HttpStatus.OK)
  resetSingleRolePermissions(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("role") role: string,
  ) {
    return this.orgsService.resetRolePermissions(
      req.user.id,
      role,
      req.user.organizationId,
    );
  }

  // ==========================================
  // AUDIT LOG ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:view_audit_log")
  @Get("my/audit-log")
  getAuditLogs(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Query(DtoPipe(AuditLogQueryDto)) query?: AuditLogQueryDto,
  ) {
    return this.orgsService.getAuditLogs(
      req.user.id,
      {
        action: query?.action,
        resource: query?.resource,
        ...(query?.actorId !== undefined ? { actorId: query.actorId } : {}),
        ...(query?.targetId !== undefined ? { targetId: query.targetId } : {}),
        ...(query?.search !== undefined ? { search: query.search } : {}),
        ...(query?.from !== undefined ? { from: query.from } : {}),
        ...(query?.to !== undefined ? { to: query.to } : {}),
        limit: query?.limit,
        offset: query?.offset,
      },
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:view_audit_log")
  @Get("my/audit-log/export")
  async exportAuditLogs(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Query(DtoPipe(AuditLogExportQueryDto))
    query: AuditLogExportQueryDto | undefined,
    @Res() res: Response,
  ) {
    const format = query?.format === "json" ? "json" : "csv";
    const exported = await this.orgsService.exportAuditLogs(
      req.user.id,
      {
        action: query?.action,
        resource: query?.resource,
        actorId: query?.actorId,
        targetId: query?.targetId,
        search: query?.search,
        from: query?.from,
        to: query?.to,
      },
      format,
      req.user.organizationId,
    );
    res.setHeader("Content-Type", exported.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exported.filename}"`,
    );
    res.send(exported.content);
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:view_audit_log")
  @Get("my/audit-log/stats")
  getAuditLogStats(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.getAuditLogStats(
      req.user.id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:update")
  @Patch("my/audit-log/retention")
  updateAuditLogRetention(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(updateAuditRetentionSchema)) dto: UpdateAuditRetentionSchema,
  ) {
    return this.orgsService.updateAuditLogRetention(
      req.user.id,
      dto.retentionDays,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:update")
  @Patch("my")
  updateMyOrg(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(UpdateOrgDto)) dto: UpdateOrgDto,
  ) {
    return this.orgsService.updateMyOrg(
      req.user.id,
      dto,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:update")
  @Post("my/logo")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_ORG_LOGO_SIZE_BYTES },
      fileFilter: logoFileFilter,
    }),
  )
  uploadMyOrgLogo(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.orgsService.uploadMyOrgLogo(
      req.user.id,
      file,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:update")
  @Delete("my/logo")
  deleteMyOrgLogo(
    @Request() req: { user: { id: string; organizationId?: string | null } },
  ) {
    return this.orgsService.deleteMyOrgLogo(
      req.user.id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:transfer_ownership")
  @Post("my/transfer-ownership")
  @HttpCode(HttpStatus.OK)
  transferOwnership(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(TransferOwnershipDto)) dto: TransferOwnershipDto,
  ) {
    return this.orgsService.transferOwnership(
      req.user.id,
      dto.newOwnerUserId,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:delete")
  @Delete("my")
  async deleteMyOrg(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.deleteMyOrg(
      req.user.id,
      req.user.organizationId,
    );
    const remainingOrg = await this.orgsService.getMyOrg(req.user.id);
    await this.syncOrgCookies(res, req.user.id, remainingOrg?.id ?? null);
    return result;
  }

  // ==========================================
  // INVITE LINKS ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Post("my/invite-links")
  createInviteLink(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(CreateInviteLinkDto)) dto: CreateInviteLinkDto,
  ) {
    return this.orgsService.createInviteLink(
      req.user.id,
      dto,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Get("my/invite-links")
  getInviteLinks(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Query(DtoPipe(GetInviteLinksQueryDto)) query?: GetInviteLinksQueryDto,
  ) {
    return this.orgsService.getInviteLinks(
      req.user.id,
      req.user.organizationId,
      Boolean(query?.includeRevoked),
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Post("my/invite-links/:id/resend")
  @HttpCode(HttpStatus.OK)
  resendInviteLink(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orgsService.resendInviteLink(
      req.user.id,
      id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Get("my/invite-links/:id/usages")
  getInviteLinkUsages(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orgsService.getInviteLinkUsages(
      req.user.id,
      id,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, ActiveTenantGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/invite-links/:id")
  revokeInviteLink(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orgsService.revokeInviteLink(
      req.user.id,
      id,
      req.user.organizationId,
    );
  }

  // Public endpoint to view invite link details (optional auth to detect email mismatch)
  @UseGuards(OptionalJwtAuthGuard)
  @Get("invite-links/public/:token")
  getPublicInvite(
    @Param("token") token: string,
    @Request() req?: { user?: { id?: string } | null },
  ) {
    return this.orgsService.getPublicInvite(token, req?.user?.id ?? null);
  }

  // Auth endpoint to accept invite and join org
  @UseGuards(JwtAuthGuard)
  @Post("invite-links/join/:token")
  async joinByToken(
    @Request() req: { user: { id: string; sessionId?: string | null } },
    @Param("token") token: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.orgsService.joinByToken(req.user.id, token);
    await this.syncOrgCookies(
      res,
      req.user.id,
      result.organization?.id ?? null,
      req.user.sessionId,
    );
    return result;
  }

  // Public endpoint to stream organization logo (no auth needed)
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  @Get("public/:id/logo")
  async getPublicOrgLogo(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
    @Query("v") version?: string,
  ) {
    const { stream, mimeType } =
      await this.orgsService.preparePublicOrgLogo(id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Cache-Control",
      version ? "public, max-age=31536000, immutable" : "public, max-age=300",
    );
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).end();
      }
    });
    stream.pipe(res);
  }

  // Public endpoint to view organization profile by slug (no auth needed)
  @Get("public/:slug")
  getPublicOrg(@Param("slug") slug: string) {
    return this.orgsService.getPublicOrg(slug);
  }
}
