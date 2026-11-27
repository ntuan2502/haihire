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
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
  OrganizationsAuditLogService,
} from "../../organizations/services";
import {
  EmailDispatchService,
  EmailTemplatesService,
  EmailFlowsService,
  EmailSettingsService,
  EmailSystemService,
} from "../../email/services";
import { ApplicationsService } from "../../applications/applications.service";
import {
  ApplicationsQueryService,
  ApplicationsSagaService,
  ApplicationsStageService,
  ApplicationsDocumentsService,
  ApplicationsNotesService,
} from "../../applications/services";
import { CandidatesService } from "../../candidates/candidates.service";
import {
  CandidatesCrudService,
  CandidatesDocumentsService,
  CandidatesProfileService,
  CandidatesNotesService,
} from "../../candidates/services";

export function createTestCandidatesService(
  prisma: PrismaService,
  minio: MinioService,
  activities?: ActivitiesService,
  auditLog?: OrganizationsAuditLogService,
): CandidatesService {
  const profile = new CandidatesProfileService(prisma, activities);
  const docs = new CandidatesDocumentsService(
    prisma,
    minio,
    profile,
    activities,
  );
  const crud = new CandidatesCrudService(
    prisma,
    minio,
    profile,
    undefined,
    auditLog,
  );
  const notes = new CandidatesNotesService(prisma, activities);
  return new CandidatesService(crud, docs, profile, notes);
}

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
    new ApplicationsNotesService(prisma, activities),
  );
}

export function createTestEmailService(
  prisma: PrismaService,
  activities: ActivitiesService,
  encryption: EncryptionService,
  queue?: Queue,
): EmailService {
  const settings = new EmailSettingsService(prisma, encryption);
  const templates = new EmailTemplatesService(prisma, settings);
  const flows = new EmailFlowsService(prisma, settings, templates);
  return new EmailService(
    new EmailDispatchService(prisma, activities, settings, queue),
    templates,
    settings,
    new EmailSystemService(prisma, encryption, queue),
    flows,
  );
}

export function createTestOrganizationsService(
  prisma: PrismaService,
  events = new EventsService(),
): OrganizationsService {
  const auditLog = new OrganizationsAuditLogService(prisma);
  const permissionResolver = new PermissionResolverService(prisma);
  return new OrganizationsService(
    new OrganizationsCoreService(prisma, auditLog),
    new OrganizationsMembersService(prisma, events, auditLog),
    new OrganizationsInvitesService(prisma, permissionResolver),
    new OrganizationsRolesService(prisma, permissionResolver, auditLog, events),
    auditLog,
  );
}
