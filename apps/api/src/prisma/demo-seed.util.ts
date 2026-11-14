import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  BCRYPT_SALT_ROUNDS,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from "../auth/constants";
import { toInstant } from "../common/date.util";

export interface DemoSeedClient {
  user: {
    upsert(args: unknown): Promise<{ id: string } & Record<string, unknown>>;
    update(args: unknown): Promise<unknown>;
  };
  organization: {
    findFirst?(args: unknown): Promise<{ id: string } | null>;
    findUnique?(args: unknown): Promise<{ id: string } | null>;
    upsert(args: unknown): Promise<{ id: string } & Record<string, unknown>>;
  };
  organizationMember?: {
    upsert?(args: unknown): Promise<unknown>;
  };
}

/**
 * Ensures default non-production demo accounts (ADMIN + MEMBER), the default
 * Admin organization, and the Admin's OrganizationMember record exist consistently.
 */
export async function ensureDefaultDemoAccounts(
  prisma: DemoSeedClient,
): Promise<{ adminOrgId: string; adminUserId: string }> {
  const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  const existingOrg = prisma.organization.findUnique
    ? await prisma.organization.findUnique({
        where: { slug: "admin" },
        select: { id: true },
      })
    : prisma.organization.findFirst
      ? await prisma.organization.findFirst({
          where: { slug: "admin" },
          select: { id: true },
        })
      : null;

  const adminUserId = crypto.randomUUID();
  const adminOrgId = existingOrg?.id || crypto.randomUUID();

  const adminUser = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.ADMIN.email },
    create: {
      id: adminUserId,
      email: DEMO_ACCOUNTS.ADMIN.email,
      firstName: DEMO_ACCOUNTS.ADMIN.firstName,
      lastName: DEMO_ACCOUNTS.ADMIN.lastName,
      password: hashedPassword,
      role: "ADMIN",
      organizationId: existingOrg ? existingOrg.id : null,
      updatedAt: toInstant(),
    },
    update: {
      email: DEMO_ACCOUNTS.ADMIN.email,
      firstName: DEMO_ACCOUNTS.ADMIN.firstName,
      lastName: DEMO_ACCOUNTS.ADMIN.lastName,
      password: hashedPassword,
      role: "ADMIN",
      ...(existingOrg ? { organizationId: existingOrg.id } : {}),
      updatedAt: toInstant(),
    },
    select: { id: true },
  });

  await prisma.organization.upsert({
    where: { slug: "admin" },
    create: {
      id: adminOrgId,
      name: "Admin",
      slug: "admin",
      ownerId: adminUser.id,
      updatedAt: toInstant(),
    },
    update: {
      name: "Admin",
      slug: "admin",
      ownerId: adminUser.id,
      updatedAt: toInstant(),
    },
  });

  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      organizationId: adminOrgId,
      updatedAt: toInstant(),
    },
  });

  if (typeof prisma.organizationMember?.upsert === "function") {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: adminOrgId,
          userId: adminUser.id,
        },
      },
      create: {
        id: crypto.randomUUID(),
        organizationId: adminOrgId,
        userId: adminUser.id,
        role: "ADMIN",
        updatedAt: toInstant(),
      },
      update: {
        role: "ADMIN",
        updatedAt: toInstant(),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.MEMBER.email },
    create: {
      id: crypto.randomUUID(),
      email: DEMO_ACCOUNTS.MEMBER.email,
      firstName: DEMO_ACCOUNTS.MEMBER.firstName,
      lastName: DEMO_ACCOUNTS.MEMBER.lastName,
      password: hashedPassword,
      role: "MEMBER",
      organizationId: null,
      updatedAt: toInstant(),
    },
    update: {
      email: DEMO_ACCOUNTS.MEMBER.email,
      firstName: DEMO_ACCOUNTS.MEMBER.firstName,
      lastName: DEMO_ACCOUNTS.MEMBER.lastName,
      password: hashedPassword,
      role: "MEMBER",
      organizationId: null,
      updatedAt: toInstant(),
    },
  });

  return { adminOrgId, adminUserId: adminUser.id };
}
