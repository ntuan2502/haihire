import { randomUUID } from "node:crypto";
import type { PrismaService } from "../../prisma/prisma.service";
import type { JwtService } from "@nestjs/jwt";
import { Role, JobStatus, ApplicationStage } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function createTestUser(
  prisma: PrismaService,
  overrides: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    role?: Role;
    tokenVersion?: number;
    organizationId?: string | null;
  } = {},
) {
  const id = overrides.id || randomUUID();
  const email = overrides.email || `test-user-${id.slice(0, 8)}@haihire.local`;
  const hashedPassword = await bcrypt.hash(
    overrides.password || "dev-seed-password-2026",
    10,
  );

  return prisma.user.create({
    data: {
      id,
      email,
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "User",
      password: hashedPassword,
      tokenVersion: overrides.tokenVersion ?? 0,
    },
  });
}

export async function createTestOrg(
  prisma: PrismaService,
  ownerId: string,
  overrides: {
    id?: string;
    name?: string;
    slug?: string;
  } = {},
) {
  const id = overrides.id || randomUUID();
  const slug = overrides.slug || `org-${id.slice(0, 8)}`;
  const name = overrides.name || `Test Organization ${id.slice(0, 8)}`;

  const org = await prisma.organization.create({
    data: {
      id,
      name,
      slug,
      ownerId,
    },
  });

  // Ensure owner is added to organization_member
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: id,
        userId: ownerId,
      },
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      id: randomUUID(),
      organizationId: id,
      userId: ownerId,
      role: Role.ADMIN,
    },
  });

  return org;
}

export async function createTestMember(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  role: Role = Role.MEMBER,
) {
  return prisma.organizationMember.create({
    data: {
      id: randomUUID(),
      organizationId,
      userId,
      role,
    },
  });
}

export async function createTestJob(
  prisma: PrismaService,
  organizationId: string,
  creatorId: string,
  overrides: {
    id?: string;
    title?: string;
    department?: string;
    location?: string;
    status?: JobStatus;
  } = {},
) {
  const id = overrides.id || randomUUID();
  return prisma.job.create({
    data: {
      id,
      organizationId,
      createdById: creatorId,
      title: overrides.title || `Software Engineer ${id.slice(0, 6)}`,
      department: overrides.department || "Engineering",
      location: overrides.location || "Remote",
      description: "Test job description",
      status: overrides.status || JobStatus.PUBLISHED,
    },
  });
}

export async function createTestCandidate(
  prisma: PrismaService,
  organizationId: string,
  overrides: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } = {},
) {
  const id = overrides.id || randomUUID();
  return prisma.candidate.create({
    data: {
      id,
      organizationId,
      email: overrides.email || `candidate-${id.slice(0, 8)}@example.com`,
      firstName: overrides.firstName || "Candidate",
      lastName: overrides.lastName || "Fixture",
      phone: overrides.phone || "0912345678",
    },
  });
}

export async function createTestApplication(
  prisma: PrismaService,
  organizationId: string,
  jobId: string,
  candidateId: string,
  overrides: {
    id?: string;
    stage?: ApplicationStage;
  } = {},
) {
  const id = overrides.id || randomUUID();
  return prisma.application.create({
    data: {
      id,
      organizationId,
      jobId,
      candidateId,
      stage: overrides.stage || ApplicationStage.APPLIED,
    },
  });
}

export function generateTestAuthCookie(
  jwtService: JwtService,
  user: { id: string; email: string; role?: string; tokenVersion?: number },
  organizationId?: string,
): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || Role.ADMIN,
    tokenVersion: user.tokenVersion ?? 0,
    organizationId,
  };
  const token = jwtService.sign(payload);
  return `haihire_token=${token}`;
}
