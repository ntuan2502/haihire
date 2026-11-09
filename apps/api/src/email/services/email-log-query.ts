import { EmailDeliveryStatus, type Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type { GetLogsOptions } from "./email-system.service";

export async function queryEmailLogs(
  prisma: PrismaService,
  scope: Prisma.EmailLogWhereInput,
  opts: GetLogsOptions = {},
) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
  const search = opts.search?.trim();
  const where: Prisma.EmailLogWhereInput = {
    ...scope,
    ...(opts.candidateId ? { candidateId: opts.candidateId } : {}),
    ...(opts.status && opts.status !== "ALL" ? { status: { in: Object.values(EmailDeliveryStatus).filter((status) => status === opts.status) } } : {}),
    ...(search ? { OR: [
      { recipientName: { contains: search, mode: "insensitive" } },
      { recipientEmail: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ] } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.emailLog.findMany({ where, orderBy: [{ sentAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.emailLog.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}
