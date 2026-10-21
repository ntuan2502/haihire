import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import {
  SwitchOrgDto,
  UpdateMemberRoleDto,
  CreateInviteLinkDto,
} from "./dto/org-actions.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { DtoPipe } from "../common/dto-validation.pipe";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgsService: OrganizationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(CreateOrgDto)) dto: CreateOrgDto,
  ) {
    return this.orgsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("join")
  @HttpCode(HttpStatus.OK)
  join(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(JoinOrgDto)) dto: JoinOrgDto,
  ) {
    return this.orgsService.join(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
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
  switchOrg(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(SwitchOrgDto)) body: SwitchOrgDto,
  ) {
    return this.orgsService.switchOrg(req.user.id, body.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/members")
  getMembers(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMembers(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Patch("my/members/:memberId/role")
  updateMemberRole(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
    @Body(DtoPipe(UpdateMemberRoleDto)) body: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(req.user.id, memberId, body.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/members/:memberId")
  removeMember(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
  ) {
    return this.orgsService.removeMember(req.user.id, memberId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:update")
  @Patch("my")
  updateMyOrg(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(UpdateOrgDto)) dto: UpdateOrgDto,
  ) {
    return this.orgsService.updateMyOrg(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:delete")
  @Delete("my")
  deleteMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.deleteMyOrg(req.user.id);
  }

  // ==========================================
  // INVITE LINKS ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Post("my/invite-links")
  createInviteLink(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(CreateInviteLinkDto)) dto: CreateInviteLinkDto,
  ) {
    return this.orgsService.createInviteLink(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/invite-links")
  getInviteLinks(@Request() req: { user: { id: string } }) {
    return this.orgsService.getInviteLinks(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission("org:manage_members")
  @Delete("my/invite-links/:id")
  revokeInviteLink(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
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
  joinByToken(
    @Request() req: { user: { id: string } },
    @Param("token") token: string,
  ) {
    return this.orgsService.joinByToken(req.user.id, token);
  }

  // Public endpoint to view organization profile by slug (no auth needed)
  @Get("public/:slug")
  getPublicOrg(@Param("slug") slug: string) {
    return this.orgsService.getPublicOrg(slug);
  }
}
