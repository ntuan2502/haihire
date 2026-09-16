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
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

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
    @Body() dto: CreateOrgDto,
  ) {
    return this.orgsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("join")
  @HttpCode(HttpStatus.OK)
  async join(
    @Request() req: { user: { id: string } },
    @Body() dto: JoinOrgDto,
  ) {
    return this.orgsService.join(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my")
  async getMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMyOrg(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/all")
  async getMyOrgs(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMyOrgs(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("switch")
  @HttpCode(HttpStatus.OK)
  async switchOrg(
    @Request() req: { user: { id: string } },
    @Body() body: { organizationId: string },
  ) {
    return this.orgsService.switchOrg(req.user.id, body.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/members")
  async getMembers(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMembers(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("my/members/:memberId/role")
  async updateMemberRole(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
    @Body() body: { role: "ADMIN" | "MEMBER" },
  ) {
    return this.orgsService.updateMemberRole(req.user.id, memberId, body.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("my/members/:memberId")
  async removeMember(
    @Request() req: { user: { id: string } },
    @Param("memberId") memberId: string,
  ) {
    return this.orgsService.removeMember(req.user.id, memberId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch("my")
  async updateMyOrg(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateOrgDto,
  ) {
    return this.orgsService.updateMyOrg(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete("my")
  async deleteMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.deleteMyOrg(req.user.id);
  }

  // ==========================================
  // INVITE LINKS ENDPOINTS
  // ==========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("my/invite-links")
  async createInviteLink(
    @Request() req: { user: { id: string } },
    @Body() dto: { role?: string; expiresIn?: string; maxUses?: string },
  ) {
    return this.orgsService.createInviteLink(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my/invite-links")
  async getInviteLinks(@Request() req: { user: { id: string } }) {
    return this.orgsService.getInviteLinks(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete("my/invite-links/:id")
  async revokeInviteLink(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orgsService.revokeInviteLink(req.user.id, id);
  }

  // Public endpoint to view invite link details (no auth needed)
  @Get("invite-links/public/:token")
  async getPublicInvite(@Param("token") token: string) {
    return this.orgsService.getPublicInvite(token);
  }

  // Auth endpoint to accept invite and join org
  @UseGuards(JwtAuthGuard)
  @Post("invite-links/join/:token")
  async joinByToken(
    @Request() req: { user: { id: string } },
    @Param("token") token: string,
  ) {
    return this.orgsService.joinByToken(req.user.id, token);
  }

  // Public endpoint to view organization profile by slug (no auth needed)
  @Get("public/:slug")
  async getPublicOrg(@Param("slug") slug: string) {
    return this.orgsService.getPublicOrg(slug);
  }
}
