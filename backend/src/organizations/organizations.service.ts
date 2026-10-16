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
  type InviteLinkRecord,
} from "./services";

export type { InviteLinkRecord };

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly core: OrganizationsCoreService;
  private readonly members: OrganizationsMembersService;
  private readonly invites: OrganizationsInvitesService;

  constructor(
    @Optional() @Inject(OrganizationsCoreService) coreOrPrisma?: OrganizationsCoreService | PrismaService,
    @Optional() @Inject(OrganizationsMembersService) membersOrEvents?: OrganizationsMembersService | EventsService,
    @Optional() @Inject(OrganizationsInvitesService) invitesService?: OrganizationsInvitesService,
  ) {
    if (coreOrPrisma instanceof OrganizationsCoreService) {
      this.core = coreOrPrisma;
      this.members = membersOrEvents as OrganizationsMembersService;
      this.invites = invitesService as OrganizationsInvitesService;
    } else if (coreOrPrisma) {
      // Direct instantiation support for existing tests (e.g. new OrganizationsService(mockPrisma))
      const prisma = coreOrPrisma as PrismaService;
      const events = membersOrEvents instanceof EventsService ? membersOrEvents : undefined;
      this.core = new OrganizationsCoreService(prisma);
      this.members = new OrganizationsMembersService(prisma, events);
      this.invites = new OrganizationsInvitesService(prisma);
    } else {
      throw new Error("OrganizationsService requires dependencies to be injected");
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

  getPublicOrg(slug: string) {
    return this.core.getPublicOrg(slug);
  }

  // ==========================================
  // 2. MEMBERSHIP & RBAC MANAGEMENT
  // ==========================================
  getMembers(userId: string) {
    return this.members.getMembers(userId);
  }

  updateMemberRole(callerId: string, targetMemberId: string, newRole: "ADMIN" | "MEMBER") {
    return this.members.updateMemberRole(callerId, targetMemberId, newRole);
  }

  removeMember(callerId: string, targetMemberId: string) {
    return this.members.removeMember(callerId, targetMemberId);
  }

  // ==========================================
  // 3. INVITE LINKS & TOKEN ENGINE
  // ==========================================
  createInviteLink(
    userId: string,
    dto: { role?: string; expiresIn?: string; maxUses?: string },
  ): Promise<InviteLinkRecord> {
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
}
