import {
  formatCandidateDisplayName,
  formatUserDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import type { PrismaService } from "../prisma/prisma.service";

type OrgLookupPrisma =
  | Pick<PrismaService, "organization">
  | { organization?: Partial<PrismaService["organization"]> }
  | null
  | undefined;

export async function resolveOrgNameDisplayOrder(
  prisma: OrgLookupPrisma,
  organizationId?: string | null,
): Promise<NameDisplayOrder> {
  if (!organizationId || !prisma?.organization?.findFirst) {
    return "LAST_FIRST";
  }
  try {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId },
      select: { nameDisplayOrder: true },
    });
    return org?.nameDisplayOrder === "FIRST_LAST" ? "FIRST_LAST" : "LAST_FIRST";
  } catch {
    return "LAST_FIRST";
  }
}

export function buildCandidateDisplayName(
  candidate: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  },
  order: NameDisplayOrder = "LAST_FIRST",
): string {
  return formatCandidateDisplayName(candidate, order);
}

export function resolveUserDisplayName(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        displayName?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  order: NameDisplayOrder = "LAST_FIRST",
): string {
  return formatUserDisplayName(user, order);
}
