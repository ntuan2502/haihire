import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { ActivitiesService } from "../activities/activities.service";
import { EmailService } from "../email/email.service";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";
import {
  InterviewsQueryService,
  InterviewsScheduleService,
  InterviewsScorecardService,
} from "./services";
import type {
  ListPaginatedInterviewsOptions,
  InterviewType,
  InterviewFormat,
  InterviewUpdatePayload,
} from "./services";

export type {
  InterviewType,
  InterviewFormat,
  InterviewUpdatePayload,
  ListPaginatedInterviewsOptions,
};

@Injectable()
export class InterviewsService {
  private readonly queryService: InterviewsQueryService;
  private readonly scheduleService: InterviewsScheduleService;
  private readonly scorecardService: InterviewsScorecardService;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(InterviewsQueryService)
    queryService?: InterviewsQueryService,
    @Optional()
    @Inject(InterviewsScheduleService)
    scheduleService?: InterviewsScheduleService,
    @Optional()
    @Inject(InterviewsScorecardService)
    scorecardService?: InterviewsScorecardService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    auditLog?: OrganizationsAuditLogService,
  ) {
    this.queryService = queryService ?? new InterviewsQueryService(this.prisma);
    this.scorecardService =
      scorecardService ?? new InterviewsScorecardService();
    this.scheduleService =
      scheduleService ??
      new InterviewsScheduleService(
        this.prisma,
        this.activitiesService,
        this.emailService,
        this.queryService,
        this.scorecardService,
        undefined,
        undefined,
        auditLog,
      );
  }

  async listPaginated(options?: ListPaginatedInterviewsOptions) {
    return this.queryService.listPaginated(options);
  }

  async findOne(id: string, tenantOrgId?: string | null) {
    return this.queryService.findOne(id, tenantOrgId);
  }

  async create(
    dto: CreateInterviewDto,
    organizationId?: string | null,
    actorId?: string | null,
  ) {
    return this.scheduleService.create(dto, organizationId, actorId);
  }

  async update(
    id: string,
    dto: UpdateInterviewDto,
    tenantOrgId?: string | null,
    actor?: { id?: string; name?: string; role?: string },
  ) {
    return this.scheduleService.update(id, dto, tenantOrgId, actor);
  }

  async remove(
    id: string,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    return this.scheduleService.remove(id, tenantOrgId, actorId);
  }
}
