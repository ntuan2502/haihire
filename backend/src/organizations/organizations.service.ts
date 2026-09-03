import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ORG-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(userId: string, dto: CreateOrgDto) {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    const existing = await this.prisma.db.orm.public.Organization.select(
      "id",
      "slug",
    )
      .where((o) => o.slug.eq(normalizedSlug))
      .first();

    if (existing) {
      throw new ConflictException(
        `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
      );
    }

    const inviteCode = this.generateInviteCode();

    await this.prisma.db.orm.public.Organization.upsert({
      create: {
        name: dto.name.trim(),
        slug: normalizedSlug,
        inviteCode,
      },
      update: {},
      conflictOn: { slug: normalizedSlug },
    });

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "inviteCode",
      "createdAt",
    )
      .where((o) => o.slug.eq(normalizedSlug))
      .first();

    if (!org) {
      throw new NotFoundException("Failed to retrieve created organization");
    }

    // Link current user to this organization
    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
    });

    return {
      organization: org,
      message: "Organization created successfully",
    };
  }

  async join(userId: string, dto: JoinOrgDto) {
    const rawInput = dto.inviteCodeOrSlug.trim();
    const normalized = rawInput.toLowerCase();

    // Find by invite code or slug
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "inviteCode",
      "createdAt",
    )
      .where((o) =>
        o.inviteCode.eq(rawInput.toUpperCase()) || o.slug.eq(normalized)
      )
      .first();

    if (!org) {
      throw new NotFoundException(
        `No organization found matching invite code or slug: "${rawInput}"`,
      );
    }

    // Link user to organization
    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
    });

    return {
      organization: org,
      message: `Successfully joined ${org.name}`,
    };
  }

  async search(query: string) {
    const trimmed = (query || "").trim().toLowerCase();
    const orgs = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "inviteCode",
      "createdAt",
    ).all();

    if (!trimmed) {
      return orgs.slice(0, 10);
    }

    return orgs
      .filter(
        (o) =>
          o.name.toLowerCase().includes(trimmed) ||
          o.slug.toLowerCase().includes(trimmed),
      )
      .slice(0, 10);
  }

  async getMyOrg(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      return null;
    }

    return this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "inviteCode",
      "createdAt",
    )
      .where((o) => o.id.eq(user.organizationId as string))
      .first();
  }

  async updateMyOrg(userId: string, dto: UpdateOrgDto) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    const orgId = user.organizationId as string;

    const currentOrg = await this.prisma.db.orm.public.Organization.select(
      "id",
      "slug",
    )
      .where((o) => o.id.eq(orgId))
      .first();

    if (!currentOrg) {
      throw new NotFoundException("Organization not found");
    }

    if (dto.slug) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      if (normalizedSlug !== currentOrg.slug) {
        const existing = await this.prisma.db.orm.public.Organization.select(
          "id",
        )
          .where((o) => o.slug.eq(normalizedSlug))
          .first();

        if (existing) {
          throw new ConflictException(
            `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
          );
        }
      }
    }

    const updateData: { name?: string; slug?: string } = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.slug) updateData.slug = dto.slug.toLowerCase().trim();

    if (Object.keys(updateData).length > 0) {
      await this.prisma.db.orm.public.Organization.where((o) =>
        o.id.eq(orgId),
      ).update(updateData);
    }

    return this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "inviteCode",
      "createdAt",
    )
      .where((o) => o.id.eq(orgId))
      .first();
  }

  async deleteMyOrg(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    const orgId = user.organizationId as string;

    // Unlink users from this org
    await this.prisma.db.orm.public.User.where((u) =>
      u.organizationId.eq(orgId),
    ).update({
      organizationId: null,
    });

    // Delete organization
    await this.prisma.db.orm.public.Organization.where((o) =>
      o.id.eq(orgId),
    ).delete();

    return { success: true, message: "Organization deleted successfully" };
  }
}
