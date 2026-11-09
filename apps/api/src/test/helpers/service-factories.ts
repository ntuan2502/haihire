import type { Queue } from "bullmq";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MinioService } from "../../minio/minio.service";
import type { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { EncryptionService } from "../../common/encryption.service";
import { EventsService } from "../../events/events.service";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
import { OrganizationsService } from "../../organizations/organizations.service";
import {
  OrganizationsCoreService, OrganizationsMembersService,
  OrganizationsInvitesService, OrganizationsRolesService, OrganizationsAuditLogService,
} from "../../organizations/services";
import {
  EmailDispatchService, EmailTemplatesService, EmailSettingsService, EmailSystemService,
} from "../../email/services";
import { ApplicationsService } from "../../applications/applications.service";
import {
  ApplicationsQueryService, ApplicationsSagaService,
  ApplicationsStageService, ApplicationsDocumentsService,
} from "../../applications/services";

export function createTestApplicationsService(
  prisma: PrismaService,
  minio: MinioService,
  activities: ActivitiesService,
  email: EmailService,
  queue?: Queue,
): ApplicationsService {
  const query = new ApplicationsQueryService(prisma, activities);
  return new ApplicationsService(
    query,
    new ApplicationsSagaService(prisma, minio, activities, email, queue, query),
    new ApplicationsStageService(prisma, activities, email, query),
    new ApplicationsDocumentsService(prisma, minio, activities, query),
  );
}

export function createTestEmailService(
  prisma: PrismaService,
  activities: ActivitiesService,
  encryption: EncryptionService,
  queue?: Queue,
): EmailService {
  const settings = new EmailSettingsService(prisma, encryption);
  return new EmailService(
    new EmailDispatchService(prisma, activities, settings, queue),
    new EmailTemplatesService(prisma, settings),
    settings,
    new EmailSystemService(prisma, encryption, queue),
  );
}

export function createTestOrganizationsService(
  prisma: PrismaService,
  events = new EventsService(),
): OrganizationsService {
  const auditLog = new OrganizationsAuditLogService(prisma);
  return new OrganizationsService(
    new OrganizationsCoreService(prisma, auditLog),
    new OrganizationsMembersService(prisma, events, auditLog),
    new OrganizationsInvitesService(prisma),
    new OrganizationsRolesService(prisma, new PermissionResolverService(prisma), auditLog, events),
    auditLog,
  );
}
