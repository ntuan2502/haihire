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
    return "FIRST_LAST";
  }
  try {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId },
      select: { nameDisplayOrder: true },
    });
    return org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";
  } catch {
    return "FIRST_LAST";
  }
}

export function buildCandidateDisplayName(
  candidate: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  },
  order: NameDisplayOrder = "FIRST_LAST",
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
  order: NameDisplayOrder = "FIRST_LAST",
): string {
  return formatUserDisplayName(user, order);
}
